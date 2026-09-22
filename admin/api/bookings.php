<?php
declare(strict_types=1);

require_once __DIR__ . '/../src/booking.php';
require_once __DIR__ . '/../src/booking-files.php';

/**
 * Bookings.
 *
 * A booking freezes its own commercial terms at creation. It copies the rate,
 * KM allowance, extra-KM rate and deposit from the vehicle's rate card into
 * booking_charges and never reads the live rate again — so changing a price
 * next month leaves every past booking exactly as it was agreed.
 *
 * The double-booking check runs on the server inside the same transaction as
 * the insert. A check in the browser only stops the careless case; two
 * requests arriving together would both pass it.
 */

$action = $_GET['action'] ?? ($_SERVER['REQUEST_METHOD'] === 'POST' ? 'save' : 'list');

switch ($action) {

    // ---------------------------------------------------------------- list --
    case 'list': {
        api_guard('booking.view');

        $status = $_GET['status'] ?? '';
        $params = [];
        $where  = '1=1';

        if ($status !== '' && in_array($status, BOOKING_STATUSES, true)) {
            $where = 'b.status = ?';
            $params[] = $status;
        }

        $rows = fetch_all(
            "SELECT b.*, c.name AS customer_name, c.phone AS customer_phone,
                    v.name AS vehicle_name
               FROM bookings b
               JOIN customers c ON c.id = b.customer_id
               JOIN vehicles  v ON v.id = b.vehicle_id
              WHERE {$where}
           ORDER BY b.start_at DESC, b.id DESC",
            $params
        );

        json_out(['bookings' => array_map(
            static fn(array $r): array => present_booking($r, false),
            $rows
        )]);
    }

    // ----------------------------------------------------------------- get --
    case 'get': {
        api_guard('booking.view');
        $id = (int) ($_GET['id'] ?? 0);

        $row = fetch_one(
            "SELECT b.*, c.name AS customer_name, c.phone AS customer_phone,
                    c.address AS customer_address, c.licence_number,
                    v.name AS vehicle_name
               FROM bookings b
               JOIN customers c ON c.id = b.customer_id
               JOIN vehicles  v ON v.id = b.vehicle_id
              WHERE b.id = ?",
            [$id]
        );
        if ($row === null) {
            json_error('That booking no longer exists.', 404);
        }

        json_out(['booking' => present_booking($row, true)]);
    }

    // ---------------------------------------------------------------- save --
    case 'save': {
        $user  = api_guard('booking.create', true);
        $input = json_input();
        $id    = isset($input['id']) && $input['id'] !== '' ? (int) $input['id'] : null;

        $data = (new Validator($input))
            ->required('customer_name', 'Customer name')
            ->required('phone', 'Phone number')
            ->required('licence_number', 'Driving licence number')
            ->optional('address', 255)
            ->optional('pickup_location', 190)
            ->optional('return_location', 190)
            ->optional('notes', 2000)
            ->integer('vehicle_id', 'Vehicle', 1)
            ->required('start_at', 'Start date and time')
            ->required('return_at', 'Return date and time')
            ->money('base_rental', 'Rental amount')
            ->integer('km_limit_per_day', 'KM limit', 0, 5000)
            ->money('extra_km_rate', 'Extra KM rate')
            ->orFail();

        $startAt  = normalise_datetime($data['start_at']);
        $returnAt = normalise_datetime($data['return_at']);
        if ($startAt === null || $returnAt === null) {
            json_error('Please correct the highlighted fields.', 422,
                ['fields' => ['start_at' => 'Dates and times must be valid.']]);
        }
        if (strtotime($returnAt) <= strtotime($startAt)) {
            json_error('Please correct the highlighted fields.', 422,
                ['fields' => ['return_at' => 'The return must be after the start.']]);
        }

        $vehicle = fetch_one('SELECT * FROM vehicles WHERE id = ?', [(int) $data['vehicle_id']]);
        if ($vehicle === null) {
            json_error('That vehicle no longer exists.', 404);
        }

        $days = rental_days($startAt, $returnAt);

        $result = transaction(function () use ($id, $data, $startAt, $returnAt, $days, $vehicle, $user) {
            $vehicleId = (int) $data['vehicle_id'];

            $clash = vehicle_double_booked($vehicleId, $startAt, $returnAt, $id);
            if ($clash !== null) {
                json_error(
                    "{$vehicle['name']} is already booked for those dates ({$clash['booking_number']}: "
                    . date('d M, H:i', strtotime((string) $clash['start_at'])) . ' → '
                    . date('d M, H:i', strtotime((string) $clash['return_at'])) . ').',
                    409
                );
            }

            $customerId = find_or_create_customer([
                'name'           => $data['customer_name'],
                'phone'          => $data['phone'],
                'address'        => $data['address'],
                'licence_number' => $data['licence_number'],
            ], (int) $user['id']);

            if ($id === null) {
                $number = next_number('NSC');
                query(
                    'INSERT INTO bookings
                       (booking_number, customer_id, vehicle_id, vehicle_reg_number,
                        start_at, return_at, duration_days, pickup_location,
                        return_location, status, notes, created_by)
                     VALUES (?,?,?,?,?,?,?,?,?,?,?,?)',
                    [$number, $customerId, $vehicleId, $vehicle['reg_number'],
                     $startAt, $returnAt, $days, $data['pickup_location'],
                     $data['return_location'], 'Confirmed', $data['notes'], $user['id']]
                );
                $bookingId = last_insert_id();

                audit_log('booking_created', 'bookings', 'booking', $bookingId, null,
                    ['booking_number' => $number, 'vehicle' => $vehicle['name'],
                     'start_at' => $startAt, 'return_at' => $returnAt],
                    null, (int) $user['id'], $user['name'], $bookingId, $customerId, $vehicleId);
            } else {
                $before = fetch_one('SELECT * FROM bookings WHERE id = ?', [$id]);
                if ($before === null) {
                    json_error('That booking no longer exists.', 404);
                }
                if (in_array($before['status'], ['Completed', 'Cancelled'], true)) {
                    json_error('A ' . strtolower((string) $before['status']) . ' booking cannot be edited.', 409);
                }

                $bookingId = $id;
                query(
                    'UPDATE bookings SET customer_id = ?, vehicle_id = ?, vehicle_reg_number = ?,
                            start_at = ?, return_at = ?, duration_days = ?, pickup_location = ?,
                            return_location = ?, notes = ?
                      WHERE id = ?',
                    [$customerId, $vehicleId, $vehicle['reg_number'], $startAt, $returnAt,
                     $days, $data['pickup_location'], $data['return_location'], $data['notes'], $bookingId]
                );
                $after = fetch_one('SELECT * FROM bookings WHERE id = ?', [$bookingId]);
                [$prev, $curr] = diff_changes($before, $after ?? []);
                if ($curr !== []) {
                    audit_log('booking_updated', 'bookings', 'booking', $bookingId, $prev, $curr,
                        null, (int) $user['id'], $user['name'], $bookingId, $customerId, $vehicleId);
                }
            }

            // The commercial terms, frozen. Taken from the rate card where the
            // form did not override them, so a booking always carries its own
            // copy rather than pointing at a rate that can move.
            $rate = current_rate($vehicleId);
            $existing = booking_charges($bookingId);

            $baseRental = $data['base_rental'];
            $kmLimit    = (int) $data['km_limit_per_day'];
            $extraRate  = $data['extra_km_rate'];
            $deposit    = $existing['deposit_required'] ?? ($rate['security_deposit'] ?? '0.00');
            $rateDaily  = $existing['rate_daily'] ?? ($rate['rate_daily'] ?? '0.00');

            $total = money_add($baseRental,
                $existing['other_charges'] ?? '0.00');
            $total = money_sub($total, $existing['discount'] ?? '0.00');

            $changed = $existing === null
                || money_cmp($existing['base_rental'], $baseRental) !== 0
                || (int) $existing['km_limit_per_day'] !== $kmLimit
                || money_cmp($existing['extra_km_rate'], $extraRate) !== 0;

            if ($changed) {
                query(
                    'INSERT INTO booking_charges
                       (booking_id, supersedes_id, rate_daily, km_limit_per_day, extra_km_rate,
                        deposit_required, base_rental, other_charges, discount, total, reason, created_by)
                     VALUES (?,?,?,?,?,?,?,?,?,?,?,?)',
                    [$bookingId, $existing['id'] ?? null, $rateDaily, $kmLimit, $extraRate,
                     $deposit, $baseRental, $existing['other_charges'] ?? '0.00',
                     $existing['discount'] ?? '0.00', $total,
                     $existing === null ? 'Booking created' : 'Charges revised', $user['id']]
                );
                if ($existing !== null) {
                    audit_log('booking_charges_revised', 'bookings', 'booking', $bookingId,
                        ['base_rental' => $existing['base_rental'], 'km_limit_per_day' => $existing['km_limit_per_day'],
                         'extra_km_rate' => $existing['extra_km_rate']],
                        ['base_rental' => $baseRental, 'km_limit_per_day' => $kmLimit,
                         'extra_km_rate' => $extraRate],
                        null, (int) $user['id'], $user['name'], $bookingId, $customerId, $vehicleId);
                }
            }

            return $bookingId;
        });

        $row = fetch_one(
            "SELECT b.*, c.name AS customer_name, c.phone AS customer_phone,
                    c.address AS customer_address, c.licence_number, v.name AS vehicle_name
               FROM bookings b JOIN customers c ON c.id = b.customer_id
               JOIN vehicles v ON v.id = b.vehicle_id WHERE b.id = ?",
            [$result]
        );
        json_out(['booking' => present_booking($row ?? [], true)]);
    }

    // -------------------------------------------------------------- cancel --
    case 'cancel': {
        $user  = api_guard('booking.cancel', true);
        $input = json_input();
        $id    = (int) ($input['id'] ?? 0);
        $reason = trim((string) ($input['reason'] ?? ''));

        $booking = fetch_one('SELECT * FROM bookings WHERE id = ?', [$id]);
        if ($booking === null) {
            json_error('That booking no longer exists.', 404);
        }
        if ($booking['status'] === 'Cancelled') {
            json_error('That booking is already cancelled.', 409);
        }
        if ($booking['status'] === 'Completed') {
            json_error('A completed booking cannot be cancelled.', 409);
        }
        if ($reason === '') {
            json_error('Please correct the highlighted fields.', 422,
                ['fields' => ['reason' => 'A reason is required when cancelling.']]);
        }

        // Money already taken does not disappear because a booking was
        // cancelled — it has to be refunded deliberately, and the record of it
        // stays either way.
        $money = booking_money($id);

        query("UPDATE bookings SET status = 'Cancelled', cancelled_reason = ? WHERE id = ?", [$reason, $id]);
        audit_log('booking_cancelled', 'bookings', 'booking', $id,
            ['status' => $booking['status']], ['status' => 'Cancelled'], $reason,
            (int) $user['id'], $user['name'], $id,
            (int) $booking['customer_id'], (int) $booking['vehicle_id']);

        json_out([
            'ok' => true,
            'warning' => money_is_zero($money['paid']) && money_is_zero($money['deposit_held'])
                ? null
                : 'This booking still holds ' . money_add($money['paid'], $money['deposit_held'])
                  . ' in payments and deposits. Refund it separately.',
        ]);
    }

    // ------------------------------------------------------------ complete --
    case 'complete': {
        $user  = api_guard('booking.complete', true);
        $input = json_input();
        $id    = (int) ($input['id'] ?? 0);

        $booking = fetch_one('SELECT * FROM bookings WHERE id = ?', [$id]);
        if ($booking === null) {
            json_error('That booking no longer exists.', 404);
        }
        if ($booking['status'] === 'Completed') {
            json_error('That booking is already completed.', 409);
        }
        if ($booking['status'] === 'Cancelled') {
            json_error('A cancelled booking cannot be completed.', 409);
        }

        // Completing without a return reading would leave the extra-KM charge
        // uncalculated forever, and the booking's total wrong.
        if (km_reading($id, 'return') === null) {
            json_error('Record the vehicle return first — the extra-KM charge depends on the closing odometer reading.', 409);
        }

        query("UPDATE bookings SET status = 'Completed' WHERE id = ?", [$id]);
        audit_log('booking_completed', 'bookings', 'booking', $id,
            ['status' => $booking['status']], ['status' => 'Completed'], null,
            (int) $user['id'], $user['name'], $id,
            (int) $booking['customer_id'], (int) $booking['vehicle_id']);

        $money = booking_money($id);
        json_out([
            'ok' => true,
            'warning' => money_is_zero($money['balance']) ? null
                : 'Outstanding balance of ' . $money['balance'] . ' on this booking.',
        ]);
    }

    default:
        json_error('Unknown action', 404);
}

// ---------------------------------------------------------------- helpers --

/** Accepts "2026-01-05 10:00" or separate date and time already joined. */
function normalise_datetime(string $value): ?string
{
    $value = trim(str_replace('T', ' ', $value));
    $time  = strtotime($value);
    return $time === false ? null : date('Y-m-d H:i:s', $time);
}

function present_booking(array $row, bool $detailed): array
{
    if ($row === []) {
        return [];
    }
    $id      = (int) $row['id'];
    $money   = booking_money($id);
    $charges = booking_charges($id);

    $out = [
        'id'              => $id,
        'booking_number'  => $row['booking_number'],
        'status'          => $row['status'],
        'customer_name'   => $row['customer_name'],
        'customer_phone'  => $row['customer_phone'],
        'vehicle_id'      => (int) $row['vehicle_id'],
        'vehicle_name'    => $row['vehicle_name'],
        'vehicle_reg'     => $row['vehicle_reg_number'],
        'start_at'        => $row['start_at'],
        'return_at'       => $row['return_at'],
        'duration_days'   => (int) $row['duration_days'],
        'total'           => (float) $money['total'],
        'paid'            => (float) $money['paid'],
        'balance'         => (float) $money['balance'],
        'payment_status'  => payment_status($money),
        'deposit_held'    => (float) $money['deposit_held'],
    ];

    // KM travels with the summary as well as the detail: the reports work
    // from the list, and re-fetching every booking to total a column would
    // turn one query into hundreds.
    $km = extra_km_position($id);
    $out['total_km']        = $km['total_km'];
    $out['allowed_km']      = $km['allowed_km'];
    $out['extra_km']        = $km['extra_km'];
    $out['extra_km_charge'] = (float) $km['extra_km_charge'];
    $out['deposit_received'] = (float) $money['deposit_received'];
    $out['deposit_refunded'] = (float) $money['deposit_refunded'];

    if (!$detailed) {
        return $out;
    }

    return $out + [
        'customer_address' => $row['customer_address'] ?? null,
        'licence_number'   => $row['licence_number'] ?? null,
        'pickup_location'  => $row['pickup_location'],
        'return_location'  => $row['return_location'],
        'notes'            => $row['notes'],
        'cancelled_reason' => $row['cancelled_reason'],
        'charges' => $charges === null ? null : [
            'rate_daily'       => (float) $charges['rate_daily'],
            'km_limit_per_day' => (int) $charges['km_limit_per_day'],
            'extra_km_rate'    => (float) $charges['extra_km_rate'],
            'deposit_required' => (float) $charges['deposit_required'],
            'base_rental'      => (float) $charges['base_rental'],
            'other_charges'    => (float) $charges['other_charges'],
            'discount'         => (float) $charges['discount'],
        ],
        'km' => [
            'total_km'        => (int) $km['total_km'],
            'allowed_km'      => (int) $km['allowed_km'],
            'extra_km'        => (int) $km['extra_km'],
            // Cast for the browser: left as a string it formats as 2000.00
            // rather than ₹2,000.
            'extra_km_charge' => (float) $km['extra_km_charge'],
            'complete'        => (bool) $km['complete'],
        ],
        'deposit_received' => (float) $money['deposit_received'],
        'deposit_refunded' => (float) $money['deposit_refunded'],
        'deposit_deducted' => (float) ($money['deposit_deducted'] ?? 0),
        'payments' => array_map(static fn(array $p): array => [
            'id'         => (int) $p['id'],
            'number'     => $p['payment_number'],
            'kind'       => $p['kind'],
            'amount'     => (float) $p['amount'],
            'paid_on'    => $p['paid_on'],
            'method'     => $p['method'],
            'reference'  => $p['reference'],
            'notes'      => $p['notes'],
            'status'     => $p['status'],
            'corrects_id'=> $p['corrects_id'] === null ? null : (int) $p['corrects_id'],
        ], fetch_all('SELECT * FROM payments WHERE booking_id = ? ORDER BY id', [$id])),
        'deposits' => array_map(static fn(array $d): array => [
            'id'          => (int) $d['id'],
            'amount'      => (float) $d['amount'],
            'received_on' => $d['received_on'],
            'method'      => $d['method'],
            'reference'   => $d['reference'],
            'status'      => $d['status'],
        ], fetch_all('SELECT * FROM deposits WHERE booking_id = ? ORDER BY id', [$id])),
        'refunds' => array_map(static fn(array $r): array => [
            'id'            => (int) $r['id'],
            'deduction'     => (float) $r['deduction'],
            'reason'        => $r['deduction_reason'],
            'refund_amount' => (float) $r['refund_amount'],
            'refunded_on'   => $r['refunded_on'],
            'method'        => $r['method'],
        ], fetch_all('SELECT * FROM refunds WHERE booking_id = ? ORDER BY id', [$id])),
        'pickup' => km_reading($id, 'pickup'),
        'return' => km_reading($id, 'return'),
        // Grouped by kind, so each section of the detail screen shows its own
        // attachments and nothing else.
        'files' => booking_files($id),
        'timeline' => fetch_all(
            'SELECT action, reason, created_at, user_label FROM audit_logs
              WHERE booking_id = ? ORDER BY id', [$id]
        ),
    ];
}
