<?php
declare(strict_types=1);

require_once __DIR__ . '/../src/booking.php';

/**
 * Payments, security deposits and deposit refunds.
 *
 * Nothing here is ever updated or deleted. A payment entered wrongly is not
 * edited — it is either voided with a reason, or corrected by a new row that
 * cites the one it corrects. Both the wrong figure and the fix survive, which
 * is what lets the books be reconstructed for any past date and what an
 * auditor needs in order to trust them.
 *
 * Deposits are kept apart from payments throughout. A deposit is the
 * customer's money being held, not the business's earnings; summing the two
 * would overstate revenue and hide what is owed back.
 */

$action = $_GET['action'] ?? '';

switch ($action) {

    // ------------------------------------------------------- add a payment --
    case 'add': {
        $user  = api_guard('payment.create', true);
        $input = json_input();

        $data = (new Validator($input))
            ->integer('booking_id', 'Booking', 1)
            ->inList('kind', 'Payment type', PAYMENT_KINDS)
            ->money('amount', 'Amount')
            ->required('paid_on', 'Payment date')
            ->inList('method', 'Payment method', PAYMENT_METHODS)
            ->optional('reference', 120)
            ->optional('notes', 255)
            ->orFail();

        if (money_cmp($data['amount'], '0.00') <= 0) {
            json_error('Please correct the highlighted fields.', 422,
                ['fields' => ['amount' => 'A payment must be more than zero.']]);
        }

        $booking = booking_or_404((int) $data['booking_id']);
        if ($booking['status'] === 'Cancelled') {
            json_error('This booking is cancelled. Record a refund rather than a payment.', 409);
        }

        $paymentId = transaction(function () use ($data, $booking, $user) {
            $number = next_number('PMT');
            query(
                'INSERT INTO payments
                   (payment_number, booking_id, kind, amount, paid_on, method,
                    reference, notes, created_by)
                 VALUES (?,?,?,?,?,?,?,?,?)',
                [$number, $booking['id'], $data['kind'], $data['amount'], $data['paid_on'],
                 $data['method'], $data['reference'], $data['notes'], $user['id']]
            );
            $id = last_insert_id();

            audit_log('payment_recorded', 'payments', 'payment', $id, null,
                ['number' => $number, 'kind' => $data['kind'], 'amount' => $data['amount'],
                 'method' => $data['method']],
                null, (int) $user['id'], $user['name'],
                (int) $booking['id'], (int) $booking['customer_id'], (int) $booking['vehicle_id']);

            return $id;
        });

        json_out(['payment_id' => $paymentId, 'money' => money_view((int) $booking['id'])]);
    }

    // ------------------------------------------------------ void a payment --
    case 'void': {
        $user  = api_guard('payment.void', true);
        $input = json_input();
        $id     = (int) ($input['id'] ?? 0);
        $reason = trim((string) ($input['reason'] ?? ''));

        if ($reason === '') {
            json_error('Please correct the highlighted fields.', 422,
                ['fields' => ['reason' => 'A reason is required to void a payment.']]);
        }

        $payment = fetch_one('SELECT * FROM payments WHERE id = ?', [$id]);
        if ($payment === null) {
            json_error('That payment no longer exists.', 404);
        }
        if ($payment['status'] !== 'active') {
            json_error('That payment has already been ' . $payment['status'] . '.', 409);
        }

        $booking = booking_or_404((int) $payment['booking_id']);

        // The row stays; only its standing changes, and the original amount
        // remains readable forever.
        query("UPDATE payments SET status = 'voided', status_reason = ? WHERE id = ?", [$reason, $id]);
        audit_log('payment_voided', 'payments', 'payment', $id,
            ['status' => 'active', 'amount' => $payment['amount']],
            ['status' => 'voided'], $reason,
            (int) $user['id'], $user['name'],
            (int) $booking['id'], (int) $booking['customer_id'], (int) $booking['vehicle_id']);

        json_out(['ok' => true, 'money' => money_view((int) $booking['id'])]);
    }

    // --------------------------------------------------- correct a payment --
    case 'correct': {
        $user  = api_guard('payment.correct', true);
        $input = json_input();

        $data = (new Validator($input))
            ->integer('corrects_id', 'Payment being corrected', 1)
            ->money('amount', 'Adjustment')
            ->required('reason', 'Reason')
            ->required('paid_on', 'Date')
            ->inList('method', 'Payment method', PAYMENT_METHODS)
            ->optional('reference', 120)
            ->orFail();

        $original = fetch_one('SELECT * FROM payments WHERE id = ?', [(int) $data['corrects_id']]);
        if ($original === null) {
            json_error('That payment no longer exists.', 404);
        }
        if ($original['status'] !== 'active') {
            json_error('A ' . $original['status'] . ' payment cannot be corrected. Record a fresh payment instead.', 409);
        }
        if (money_is_zero($data['amount'])) {
            json_error('Please correct the highlighted fields.', 422,
                ['fields' => ['amount' => 'A correction of zero changes nothing.']]);
        }

        $booking = booking_or_404((int) $original['booking_id']);

        $correctionId = transaction(function () use ($data, $original, $booking, $user) {
            $number = next_number('PMT');
            // The adjustment is its own row: positive to add, negative to take
            // back. The original figure is never touched.
            query(
                'INSERT INTO payments
                   (payment_number, booking_id, kind, amount, paid_on, method,
                    reference, notes, corrects_id, status_reason, created_by)
                 VALUES (?,?,?,?,?,?,?,?,?,?,?)',
                [$number, $booking['id'], $original['kind'], $data['amount'], $data['paid_on'],
                 $data['method'], $data['reference'], 'Correction to ' . $original['payment_number'],
                 $original['id'], $data['reason'], $user['id']]
            );
            $id = last_insert_id();

            audit_log('payment_corrected', 'payments', 'payment', $id,
                ['original' => $original['payment_number'], 'original_amount' => $original['amount']],
                ['adjustment' => $data['amount'],
                 'effective_total' => money_add($original['amount'], $data['amount'])],
                $data['reason'], (int) $user['id'], $user['name'],
                (int) $booking['id'], (int) $booking['customer_id'], (int) $booking['vehicle_id']);

            return $id;
        });

        json_out(['payment_id' => $correctionId, 'money' => money_view((int) $booking['id'])]);
    }

    // ------------------------------------------------------- take a deposit --
    case 'deposit': {
        $user  = api_guard('deposit.create', true);
        $input = json_input();

        $data = (new Validator($input))
            ->integer('booking_id', 'Booking', 1)
            ->money('amount', 'Deposit amount')
            ->required('received_on', 'Deposit date')
            ->inList('method', 'Payment method', PAYMENT_METHODS)
            ->optional('reference', 120)
            ->optional('notes', 255)
            ->orFail();

        if (money_cmp($data['amount'], '0.00') <= 0) {
            json_error('Please correct the highlighted fields.', 422,
                ['fields' => ['amount' => 'A deposit must be more than zero.']]);
        }

        $booking = booking_or_404((int) $data['booking_id']);

        query(
            'INSERT INTO deposits (booking_id, amount, received_on, method, reference, notes, created_by)
             VALUES (?,?,?,?,?,?,?)',
            [$booking['id'], $data['amount'], $data['received_on'], $data['method'],
             $data['reference'], $data['notes'], $user['id']]
        );
        $id = last_insert_id();

        audit_log('deposit_received', 'deposits', 'deposit', $id, null,
            ['amount' => $data['amount'], 'method' => $data['method']], null,
            (int) $user['id'], $user['name'],
            (int) $booking['id'], (int) $booking['customer_id'], (int) $booking['vehicle_id']);

        json_out(['deposit_id' => $id, 'money' => money_view((int) $booking['id'])]);
    }

    // ----------------------------------------------------- refund a deposit --
    case 'refund': {
        $user  = api_guard('refund.create', true);
        $input = json_input();

        $data = (new Validator($input))
            ->integer('booking_id', 'Booking', 1)
            ->money('deduction', 'Deduction', false)
            ->optional('deduction_reason', 255)
            ->required('refunded_on', 'Refund date')
            ->inList('method', 'Refund method', PAYMENT_METHODS)
            ->optional('reference', 120)
            ->optional('notes', 255)
            ->orFail();

        $booking   = booking_or_404((int) $data['booking_id']);
        $deduction = $data['deduction'] ?? '0.00';

        $deposit = fetch_one(
            "SELECT * FROM deposits WHERE booking_id = ? AND status = 'active' ORDER BY id DESC LIMIT 1",
            [$booking['id']]
        );
        if ($deposit === null) {
            json_error('No deposit has been recorded for this booking.', 409);
        }

        $money = booking_money((int) $booking['id']);
        $held  = $money['deposit_held'];

        if (money_cmp($held, '0.00') <= 0) {
            json_error('This deposit has already been refunded.', 409);
        }
        if (money_cmp($deduction, $held) > 0) {
            json_error('Please correct the highlighted fields.', 422,
                ['fields' => ['deduction' => "The deduction cannot exceed the {$held} still held."]]);
        }
        // Money kept back from a customer must always be explained.
        if (money_cmp($deduction, '0.00') > 0 && ($data['deduction_reason'] ?? '') === '') {
            json_error('Please correct the highlighted fields.', 422,
                ['fields' => ['deduction_reason' => 'A reason is required when deducting from a deposit.']]);
        }

        $refundAmount = money_sub($held, $deduction);

        query(
            'INSERT INTO refunds
               (deposit_id, booking_id, deduction, deduction_reason, refund_amount,
                refunded_on, method, reference, notes, created_by)
             VALUES (?,?,?,?,?,?,?,?,?,?)',
            [$deposit['id'], $booking['id'], $deduction, $data['deduction_reason'],
             $refundAmount, $data['refunded_on'], $data['method'],
             $data['reference'], $data['notes'], $user['id']]
        );
        $id = last_insert_id();

        audit_log('deposit_refunded', 'refunds', 'refund', $id,
            ['deposit_held' => $held],
            ['deduction' => $deduction, 'refund_amount' => $refundAmount],
            $data['deduction_reason'], (int) $user['id'], $user['name'],
            (int) $booking['id'], (int) $booking['customer_id'], (int) $booking['vehicle_id']);

        json_out(['refund_id' => $id, 'refund_amount' => (float) $refundAmount,
                  'money' => money_view((int) $booking['id'])]);
    }

    default:
        json_error('Unknown action', 404);
}

// ---------------------------------------------------------------- helpers --

function booking_or_404(int $id): array
{
    $booking = fetch_one('SELECT * FROM bookings WHERE id = ?', [$id]);
    if ($booking === null) {
        json_error('That booking no longer exists.', 404);
    }
    return $booking;
}

/** The money position, shaped for the browser. */
function money_view(int $bookingId): array
{
    $money = booking_money($bookingId);
    return [
        'total'            => (float) $money['total'],
        'paid'             => (float) $money['paid'],
        'balance'          => (float) $money['balance'],
        'extra_km_charge'  => (float) ($money['extra_km_charge'] ?? 0),
        'deposit_received' => (float) $money['deposit_received'],
        'deposit_refunded' => (float) $money['deposit_refunded'],
        'deposit_deducted' => (float) ($money['deposit_deducted'] ?? 0),
        'deposit_held'     => (float) $money['deposit_held'],
        'payment_status'   => payment_status($money),
    ];
}
