<?php
declare(strict_types=1);

require_once __DIR__ . '/../src/http.php';
require_once __DIR__ . '/../src/booking.php';
require_once __DIR__ . '/../src/fleet-upkeep.php';

/**
 * What needs attention today.
 *
 * The dashboard had ten figures and no answer to "what do I do this morning".
 * A number tells you where the business stands; this tells you what is about
 * to go wrong. They are different questions and only one of them has a
 * deadline.
 *
 * Every line is a thing somebody has to act on, sorted so the overdue ones are
 * first. Nothing is here because it is interesting.
 */

api_guard('booking.view');

/**
 * ₹1,32,224 -- Indian grouping, which number_format cannot do.
 *
 * The last three digits, then pairs. A total shown as ₹132,224 reads as a
 * different number to everyone who will see this panel.
 */
function rupees(string|float $amount): string
{
    $n    = (string) (int) round((float) $amount);
    $sign = str_starts_with($n, '-') ? '-' : '';
    $n    = ltrim($n, '-');

    if (strlen($n) <= 3) {
        return '₹' . $sign . $n;
    }

    $last  = substr($n, -3);
    $rest  = substr($n, 0, -3);
    $rest  = preg_replace('/\\B(?=(\\d{2})+$)/', ',', $rest) ?? $rest;

    return '₹' . $sign . $rest . ',' . $last;
}

$today  = date('Y-m-d');
$alerts = fleet_alerts();

// --------------------------------------------------------- returns today --
//
// The one with a time on it: a car due back at ten and not back by four is
// either late or has been extended, and nobody finds that out from a total.
try {
    $due = fetch_all(
        "SELECT b.id, b.booking_number, b.return_at, c.name AS customer_name, v.name AS vehicle_name
           FROM bookings b
           JOIN customers c ON c.id = b.customer_id
           JOIN vehicles  v ON v.id = b.vehicle_id
          WHERE b.status = 'Active' AND DATE(b.return_at) <= ?
       ORDER BY b.return_at",
        [$today]
    );
    foreach ($due as $row) {
        $late = substr((string) $row['return_at'], 0, 10) < $today;
        $alerts[] = [
            'kind'       => 'return_due',
            'level'      => $late ? 'overdue' : 'soon',
            'booking_id' => (int) $row['id'],
            'subject'    => $row['booking_number'] . ' · ' . $row['vehicle_name'],
            'message'    => $late
                ? 'Was due back ' . date('d M', strtotime((string) $row['return_at']))
                : 'Due back today at ' . date('g:i a', strtotime((string) $row['return_at'])),
            'days'       => $late ? -1 : 0,
        ];
    }
} catch (Throwable $e) {
    error_log('alerts: returns failed: ' . $e->getMessage());
}

// -------------------------------------------------------- money still out --
//
// Only where a date was agreed or the car is already back. A balance on a
// booking that has not started is not late, and listing it would make the
// list something to scroll past.
try {
    $open = fetch_all(
        "SELECT b.id, b.booking_number, b.status, b.return_at, c.name AS customer_name"
        . (table_has_column('bookings', 'balance_due_on') ? ', b.balance_due_on' : '') . "
           FROM bookings b
           JOIN customers c ON c.id = b.customer_id
          WHERE b.status IN ('Active','Returned','Completed')"
    );
    foreach ($open as $row) {
        $money = booking_money((int) $row['id']);
        if (money_cmp($money['balance'], '0.00') <= 0) {
            continue;
        }

        $dueOn    = $row['balance_due_on'] ?? null;
        $returned = in_array($row['status'], ['Returned', 'Completed'], true);

        if ($dueOn === null && !$returned) {
            continue;
        }

        $late = ($dueOn !== null && $dueOn < $today) || $returned;
        $alerts[] = [
            'kind'       => 'payment_due',
            'level'      => $late ? 'overdue' : 'soon',
            'booking_id' => (int) $row['id'],
            'subject'    => $row['booking_number'] . ' · ' . $row['customer_name'],
            'message'    => rupees($money['balance']) . ' still to collect'
                . ($dueOn !== null ? ', due ' . date('d M', strtotime((string) $dueOn)) : ''),
            'days'       => $late ? -1 : 1,
        ];
    }
} catch (Throwable $e) {
    error_log('alerts: balances failed: ' . $e->getMessage());
}

// ---------------------------------------------------- deposits still held --
//
// A deposit on a finished booking is the customer's money sitting in the
// business. Nobody chases it, which is exactly why it belongs on this list.
try {
    $finished = fetch_all(
        "SELECT b.id, b.booking_number, c.name AS customer_name
           FROM bookings b
           JOIN customers c ON c.id = b.customer_id
          WHERE b.status IN ('Returned','Completed')"
    );
    foreach ($finished as $row) {
        $money = booking_money((int) $row['id']);
        if (money_cmp($money['deposit_held'], '0.00') <= 0) {
            continue;
        }
        $alerts[] = [
            'kind'       => 'deposit_due',
            'level'      => 'soon',
            'booking_id' => (int) $row['id'],
            'subject'    => $row['booking_number'] . ' · ' . $row['customer_name'],
            'message'    => rupees($money['deposit_held']) . ' deposit still to refund',
            'days'       => 1,
        ];
    }
} catch (Throwable $e) {
    error_log('alerts: deposits failed: ' . $e->getMessage());
}

// ----------------------------------------------------------- new enquiries --
try {
    $fresh = fetch_all(
        "SELECT id, enquiry_number, name, created_at FROM enquiries
          WHERE status = 'New' ORDER BY id DESC LIMIT 10"
    );
    foreach ($fresh as $row) {
        $alerts[] = [
            'kind'        => 'enquiry',
            'level'       => 'new',
            'enquiry_id'  => (int) $row['id'],
            'subject'     => $row['name'],
            'message'     => 'New enquiry, ' . date('d M', strtotime((string) $row['created_at'])),
            'days'        => 2,
        ];
    }
} catch (Throwable $e) {
    error_log('alerts: enquiries failed: ' . $e->getMessage());
}

// Overdue first, then what is coming, then the merely new. Within a level the
// most overdue leads, because that is the order somebody would work them in.
usort($alerts, static function (array $a, array $b): int {
    $rank = ['overdue' => 0, 'soon' => 1, 'new' => 2];
    return [$rank[$a['level']] ?? 3, $a['days']] <=> [$rank[$b['level']] ?? 3, $b['days']];
});

json_out([
    'ok'      => true,
    'alerts'  => $alerts,
    'overdue' => count(array_filter($alerts, static fn(array $a): bool => $a['level'] === 'overdue')),
]);
