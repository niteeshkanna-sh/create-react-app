<?php
declare(strict_types=1);

require_once __DIR__ . '/../src/http.php';
require_once __DIR__ . '/../src/audit.php';
require_once __DIR__ . '/../src/booking.php';
require_once __DIR__ . '/../src/booking-extras.php';

/**
 * Charges raised after a booking was priced, and the damage behind them.
 *
 * Voided rather than deleted, like every other money row here: a charge that
 * was raised and then dropped is part of what happened, and a customer who
 * queries a bill is owed that history rather than a total that quietly moved.
 */

$action = $_GET['action'] ?? '';

switch ($action) {
    // ------------------------------------------------------- add a charge --
    case 'add-extra': {
        $user  = api_guard('payment.create', true);
        $input = json_input();

        $data = (new Validator($input))
            ->integer('booking_id', 'Booking', 1)
            ->inList('kind', 'Charge type', array_keys(EXTRA_KINDS))
            ->money('amount', 'Amount')
            ->optional('note', 255)
            ->orFail();

        if (money_cmp($data['amount'], '0.00') <= 0) {
            json_error('Please correct the highlighted fields.', 422,
                ['fields' => ['amount' => 'A charge has to be more than nothing.']]);
        }
        if (!booking_extras_ready()) {
            json_error('The charges table is still missing from the database.', 500);
        }

        $booking = fetch_one('SELECT * FROM bookings WHERE id = ?', [$data['booking_id']]);
        if ($booking === null) {
            json_error('That booking no longer exists.', 404);
        }
        if ($booking['status'] === 'Cancelled') {
            json_error('A cancelled booking cannot take new charges.', 409);
        }

        query('INSERT INTO booking_extras (booking_id, kind, amount, note, created_by)
               VALUES (?,?,?,?,?)',
            [$data['booking_id'], $data['kind'], $data['amount'], $data['note'], $user['id']]);

        audit_log('booking_extra_added', 'bookings', 'booking', (int) $data['booking_id'], null,
            ['kind' => $data['kind'], 'amount' => $data['amount'], 'note' => $data['note']],
            null, (int) $user['id'], $user['name'], (int) $data['booking_id']);

        json_out(['ok' => true, 'money' => booking_money((int) $data['booking_id'])]);
    }

    // ------------------------------------------------------ void a charge --
    case 'void-extra': {
        $user  = api_guard('payment.void', true);
        $input = json_input();
        $id     = (int) ($input['id'] ?? 0);
        $reason = trim((string) ($input['reason'] ?? ''));

        $row = fetch_one('SELECT * FROM booking_extras WHERE id = ?', [$id]);
        if ($row === null) {
            json_error('That charge no longer exists.', 404);
        }
        if ($row['status'] !== 'active') {
            json_error('That charge has already been voided.', 409);
        }
        if ($reason === '') {
            json_error('Please correct the highlighted fields.', 422,
                ['fields' => ['reason' => 'A reason is required when voiding a charge.']]);
        }

        query("UPDATE booking_extras SET status = 'voided' WHERE id = ?", [$id]);
        audit_log('booking_extra_voided', 'bookings', 'booking', (int) $row['booking_id'],
            ['amount' => $row['amount'], 'kind' => $row['kind']], null, $reason,
            (int) $user['id'], $user['name'], (int) $row['booking_id']);

        json_out(['ok' => true, 'money' => booking_money((int) $row['booking_id'])]);
    }

    // ------------------------------------------------------- record damage --
    case 'add-damage': {
        $user  = api_guard('booking.create', true);
        $input = json_input();

        $data = (new Validator($input))
            ->integer('booking_id', 'Booking', 1)
            ->required('description', 'What is damaged')
            ->money('estimated_cost', 'Estimated cost', false)
            ->inList('noticed_at', 'Noticed at', ['pickup', 'return'])
            ->optional('note', 2000)
            ->orFail();

        if (!booking_damages_ready()) {
            json_error('The damage table is still missing from the database.', 500);
        }

        query('INSERT INTO booking_damages
                 (booking_id, description, estimated_cost, noticed_at, note, created_by)
               VALUES (?,?,?,?,?,?)',
            [$data['booking_id'], $data['description'], $data['estimated_cost'] ?? '0.00',
             $data['noticed_at'], $data['note'], $user['id']]);

        $damageId = last_insert_id();

        // Charging for it is a separate decision, and a separate row. Some
        // damage is charged, some comes off the deposit, some is absorbed --
        // and a record that assumed the first would make the other two wrong.
        if (!empty($input['charge_customer']) && booking_extras_ready()
            && money_cmp((string) ($data['estimated_cost'] ?? '0.00'), '0.00') > 0) {
            query('INSERT INTO booking_extras (booking_id, kind, amount, note, created_by)
                   VALUES (?,?,?,?,?)',
                [$data['booking_id'], 'damage', $data['estimated_cost'],
                 'Damage: ' . $data['description'], $user['id']]);
        }

        audit_log('booking_damage_recorded', 'bookings', 'booking', (int) $data['booking_id'], null,
            ['description' => $data['description'], 'estimated_cost' => $data['estimated_cost'] ?? '0.00'],
            null, (int) $user['id'], $user['name'], (int) $data['booking_id']);

        json_out(['ok' => true, 'damage_id' => $damageId,
                  'money' => booking_money((int) $data['booking_id'])]);
    }

    // ------------------------------------------------------- void a damage --
    case 'void-damage': {
        $user  = api_guard('booking.create', true);
        $input = json_input();
        $id    = (int) ($input['id'] ?? 0);

        $row = fetch_one('SELECT * FROM booking_damages WHERE id = ?', [$id]);
        if ($row === null) {
            json_error('That damage record no longer exists.', 404);
        }

        query("UPDATE booking_damages SET status = 'voided' WHERE id = ?", [$id]);
        audit_log('booking_damage_removed', 'bookings', 'booking', (int) $row['booking_id'],
            ['description' => $row['description']], null, null,
            (int) $user['id'], $user['name'], (int) $row['booking_id']);

        json_out(['ok' => true, 'money' => booking_money((int) $row['booking_id'])]);
    }

    default:
        json_error('Unknown action.', 404);
}
