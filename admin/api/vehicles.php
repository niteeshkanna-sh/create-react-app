<?php
declare(strict_types=1);

require_once __DIR__ . '/../src/http.php';
require_once __DIR__ . '/../src/vehicle-photos.php';

/**
 * Vehicles.
 *
 * A vehicle's rates live in vehicle_rates, dated, rather than as columns on
 * the vehicle itself. Changing a price writes a new dated row, so a booking
 * taken last month can still be explained by the rate card that was live then.
 *
 * Vehicles are never hard-deleted: bookings, expenses and KM records point at
 * them, and deleting one would either fail or orphan history. Retiring sets
 * the status to Inactive instead.
 */

const BODY_TYPES    = ['Hatchback', 'Sedan', 'SUV', 'MUV', 'Other'];
const FUEL_TYPES    = ['Petrol', 'Diesel', 'Electric', 'CNG'];
const TRANSMISSIONS = ['Manual', 'Automatic'];
const VEHICLE_STATUSES = ['Available', 'Booked', 'On Rental', 'Maintenance', 'Inactive'];

$action = $_GET['action'] ?? ($_SERVER['REQUEST_METHOD'] === 'POST' ? 'save' : 'list');

switch ($action) {

    // ---------------------------------------------------------------- list --
    case 'list': {
        api_guard('vehicle.view');

        $includeInactive = ($_GET['include_inactive'] ?? '0') === '1';

        // The current rate is the newest row not dated in the future, so a
        // price scheduled for next month does not leak into today's figures.
        $rows = fetch_all(
            "SELECT v.*,
                    r.rate_daily, r.rate_7day, r.rate_15day, r.rate_30day,
                    r.km_limit_per_day, r.extra_km_rate, r.security_deposit,
                    r.effective_from AS rate_effective_from
               FROM vehicles v
               LEFT JOIN vehicle_rates r
                 ON r.id = (
                      SELECT id FROM vehicle_rates
                       WHERE vehicle_id = v.id AND effective_from <= CURDATE()
                    ORDER BY effective_from DESC, id DESC LIMIT 1
                    )
              WHERE (:all = 1 OR v.status <> 'Inactive')
           ORDER BY v.name",
            ['all' => $includeInactive ? 1 : 0]
        );

        json_out(['vehicles' => array_map('present_vehicle', $rows)]);
    }

    // ---------------------------------------------------------------- save --
    case 'save': {
        $user = api_guard('vehicle.edit', true);
        $input = json_input();

        $id = isset($input['id']) && $input['id'] !== '' ? (int) $input['id'] : null;

        $data = (new Validator($input))
            ->required('name', 'Listing name')
            ->required('brand', 'Brand')
            ->required('reg_number', 'Registration number')
            ->inList('body_type', 'Body type', BODY_TYPES)
            ->inList('fuel', 'Fuel', FUEL_TYPES)
            ->inList('transmission', 'Transmission', TRANSMISSIONS)
            ->inList('status', 'Status', VEHICLE_STATUSES)
            ->integer('seats', 'Seats', 1, 25)
            ->integer('model_year', 'Year', 1980, (int) date('Y') + 2)
            ->integer('current_km', 'Odometer', 0, 9999999)
            ->hexColour('colour', 'Colour')
            ->money('rate_daily', 'Daily rate')
            ->money('rate_7day', '7-day rate', false)
            ->money('rate_15day', '15-day rate', false)
            ->money('rate_30day', 'Monthly rate', false)
            ->integer('km_limit_per_day', 'KM limit', 0, 5000)
            ->money('extra_km_rate', 'Extra KM rate')
            ->money('security_deposit', 'Security deposit')
            ->orFail();

        $reg = strtoupper(preg_replace('/\s+/', '', $data['reg_number']));

        // Registration numbers identify a specific car; two rows sharing one
        // would make every report ambiguous.
        $clash = fetch_one(
            'SELECT id FROM vehicles WHERE reg_number = ? AND (? IS NULL OR id <> ?)',
            [$reg, $id, $id]
        );
        if ($clash !== null) {
            json_error('Please correct the highlighted fields.', 422,
                ['fields' => ['reg_number' => 'Another vehicle already uses this registration number.']]);
        }

        $before = $id !== null ? fetch_one('SELECT * FROM vehicles WHERE id = ?', [$id]) : null;
        if ($id !== null && $before === null) {
            json_error('That vehicle no longer exists.', 404);
        }

        $savedId = transaction(function () use ($id, $data, $reg, $before, $user) {
            if ($id === null) {
                query(
                    'INSERT INTO vehicles
                       (name, brand, reg_number, body_type, fuel, transmission,
                        seats, model_year, colour, status, current_km, created_by)
                     VALUES (?,?,?,?,?,?,?,?,?,?,?,?)',
                    [$data['name'], $data['brand'], $reg, $data['body_type'], $data['fuel'],
                     $data['transmission'], $data['seats'], $data['model_year'], $data['colour'],
                     $data['status'], $data['current_km'], $user['id']]
                );
                $vehicleId = last_insert_id();
                audit_log('vehicle_created', 'vehicles', 'vehicle', $vehicleId, null,
                    ['name' => $data['name'], 'reg_number' => $reg], null,
                    (int) $user['id'], $user['name'], null, null, $vehicleId);
            } else {
                $vehicleId = $id;
                query(
                    'UPDATE vehicles SET name = ?, brand = ?, reg_number = ?, body_type = ?,
                            fuel = ?, transmission = ?, seats = ?, model_year = ?, colour = ?,
                            status = ?, current_km = ?
                      WHERE id = ?',
                    [$data['name'], $data['brand'], $reg, $data['body_type'], $data['fuel'],
                     $data['transmission'], $data['seats'], $data['model_year'], $data['colour'],
                     $data['status'], $data['current_km'], $vehicleId]
                );
                $after = fetch_one('SELECT * FROM vehicles WHERE id = ?', [$vehicleId]);
                [$prev, $curr] = diff_changes($before ?? [], $after ?? []);
                if ($curr !== []) {
                    audit_log('vehicle_updated', 'vehicles', 'vehicle', $vehicleId,
                        $prev, $curr, null, (int) $user['id'], $user['name'], null, null, $vehicleId);
                }
            }

            // Only write a rate row when something about the pricing actually
            // changed — otherwise every incidental edit would clutter the
            // rate history and make it useless for explaining old bookings.
            $currentRate = fetch_one(
                'SELECT * FROM vehicle_rates WHERE vehicle_id = ?
                  ORDER BY effective_from DESC, id DESC LIMIT 1',
                [$vehicleId]
            );

            $incoming = [
                'rate_daily'       => $data['rate_daily'],
                'rate_7day'        => $data['rate_7day'],
                'rate_15day'       => $data['rate_15day'],
                'rate_30day'       => $data['rate_30day'],
                'km_limit_per_day' => (string) $data['km_limit_per_day'],
                'extra_km_rate'    => $data['extra_km_rate'],
                'security_deposit' => $data['security_deposit'],
            ];

            $changed = $currentRate === null;
            if (!$changed) {
                foreach ($incoming as $key => $value) {
                    if (rtrim(rtrim((string) $currentRate[$key], '0'), '.')
                        !== rtrim(rtrim((string) $value, '0'), '.')) {
                        $changed = true;
                        break;
                    }
                }
            }

            if ($changed) {
                query(
                    'INSERT INTO vehicle_rates
                       (vehicle_id, effective_from, rate_daily, rate_7day, rate_15day,
                        rate_30day, km_limit_per_day, extra_km_rate, security_deposit, created_by)
                     VALUES (?, CURDATE(), ?,?,?,?,?,?,?,?)
                     ON DUPLICATE KEY UPDATE
                        rate_daily = VALUES(rate_daily), rate_7day = VALUES(rate_7day),
                        rate_15day = VALUES(rate_15day), rate_30day = VALUES(rate_30day),
                        km_limit_per_day = VALUES(km_limit_per_day),
                        extra_km_rate = VALUES(extra_km_rate),
                        security_deposit = VALUES(security_deposit)',
                    [$vehicleId, $data['rate_daily'], $data['rate_7day'], $data['rate_15day'],
                     $data['rate_30day'], $data['km_limit_per_day'], $data['extra_km_rate'],
                     $data['security_deposit'], $user['id']]
                );
                audit_log('vehicle_rate_changed', 'vehicles', 'vehicle', $vehicleId,
                    $currentRate === null ? null : array_intersect_key($currentRate, $incoming),
                    $incoming, null, (int) $user['id'], $user['name'], null, null, $vehicleId);
            }

            return $vehicleId;
        });

        $row = fetch_one(
            "SELECT v.*, r.rate_daily, r.rate_7day, r.rate_15day, r.rate_30day,
                    r.km_limit_per_day, r.extra_km_rate, r.security_deposit,
                    r.effective_from AS rate_effective_from
               FROM vehicles v
               LEFT JOIN vehicle_rates r ON r.id = (
                    SELECT id FROM vehicle_rates WHERE vehicle_id = v.id
                     ORDER BY effective_from DESC, id DESC LIMIT 1)
              WHERE v.id = ?",
            [$savedId]
        );

        json_out(['vehicle' => present_vehicle($row ?? [])]);
    }

    // ------------------------------------------------------------- retire --
    case 'retire': {
        $user  = api_guard('vehicle.delete', true);
        $input = json_input();
        $id    = (int) ($input['id'] ?? 0);
        $reason = trim((string) ($input['reason'] ?? ''));

        $vehicle = fetch_one('SELECT * FROM vehicles WHERE id = ?', [$id]);
        if ($vehicle === null) {
            json_error('That vehicle no longer exists.', 404);
        }

        // A car that is out on hire cannot be retired — the booking still has
        // to be returned, its KM read and its charges settled.
        $live = fetch_one(
            "SELECT COUNT(*) AS n FROM bookings
              WHERE vehicle_id = ? AND status IN ('Confirmed','Ready','Active')",
            [$id]
        );
        if ((int) ($live['n'] ?? 0) > 0) {
            json_error('This vehicle has active or upcoming bookings. Complete or cancel those first.', 409);
        }

        query("UPDATE vehicles SET status = 'Inactive' WHERE id = ?", [$id]);
        audit_log('vehicle_retired', 'vehicles', 'vehicle', $id,
            ['status' => $vehicle['status']], ['status' => 'Inactive'],
            $reason !== '' ? $reason : null,
            (int) $user['id'], $user['name'], null, null, $id);

        json_out(['ok' => true]);
    }

    default:
        json_error('Unknown action', 404);
}

/** Shapes a database row for the browser, with numbers as numbers. */
function present_vehicle(array $row): array
{
    if ($row === []) {
        return [];
    }
    return [
        'id'               => (int) $row['id'],
        'name'             => $row['name'],
        'brand'            => $row['brand'],
        'reg_number'       => $row['reg_number'],
        'body_type'        => $row['body_type'],
        'fuel'             => $row['fuel'],
        'transmission'     => $row['transmission'],
        'seats'            => (int) $row['seats'],
        'model_year'       => (int) $row['model_year'],
        'colour'           => $row['colour'],
        'photo'            => vehicle_photo_url($row['photo_file'] ?? null),
        'status'           => $row['status'],
        'current_km'       => (int) $row['current_km'],
        'rate_daily'       => isset($row['rate_daily']) ? (float) $row['rate_daily'] : 0.0,
        'rate_7day'        => isset($row['rate_7day'])  ? (float) $row['rate_7day']  : null,
        'rate_15day'       => isset($row['rate_15day']) ? (float) $row['rate_15day'] : null,
        'rate_30day'       => isset($row['rate_30day']) ? (float) $row['rate_30day'] : null,
        'km_limit_per_day' => (int) ($row['km_limit_per_day'] ?? 0),
        'extra_km_rate'    => (float) ($row['extra_km_rate'] ?? 0),
        'security_deposit' => (float) ($row['security_deposit'] ?? 0),
        'rate_effective_from' => $row['rate_effective_from'] ?? null,
    ];
}
