<?php
declare(strict_types=1);

/**
 * Fills the test site with a fleet, staff, customers and a few months of
 * trading, so every screen has something real to show.
 *
 *   NITESHA_CONFIG=tools/.test-site/config.php \
 *     php tools/seed-test-data.php <admin-email> <admin-password>
 *
 * Run through tools/test-site.sh rather than by hand. It refuses to touch a
 * database that already has users in it, which is what keeps it from ever
 * being pointed at the live one by accident.
 *
 * Dates are relative to today, so the schedule always has something upcoming,
 * something on rent and something overdue, however long after seeding you
 * open it.
 */

require_once __DIR__ . '/../src/db.php';
require_once __DIR__ . '/../src/money.php';
require_once __DIR__ . '/../src/audit.php';
require_once __DIR__ . '/../src/auth.php';
require_once __DIR__ . '/../src/booking.php';

$adminEmail = $argv[1] ?? 'admin@niteshacars.test';
$adminPass  = $argv[2] ?? 'TestAdmin2026!';

if (getenv('NITESHA_CONFIG') === false) {
    fwrite(STDERR, "Refusing to run without NITESHA_CONFIG set — that is the only\n"
                 . "thing keeping this away from the live database.\n");
    exit(1);
}

$existing = (int) (fetch_one('SELECT COUNT(*) AS n FROM users')['n'] ?? 0);
if ($existing > 0) {
    fwrite(STDERR, "There are already $existing users here. Run "
                 . "'bash tools/test-site.sh reset' to start over.\n");
    exit(1);
}

/** A date N days from today, at the given time. */
function day(int $offset, string $time = '10:00:00'): string
{
    return date('Y-m-d', strtotime("$offset days")) . ' ' . $time;
}
function dateOnly(int $offset): string
{
    return date('Y-m-d', strtotime("$offset days"));
}

function insert(string $table, array $row): int
{
    $columns = array_keys($row);
    query(
        sprintf('INSERT INTO %s (%s) VALUES (%s)', $table,
            implode(', ', $columns),
            implode(', ', array_fill(0, count($columns), '?'))),
        array_values($row)
    );
    return last_insert_id();
}

function note(string $line): void { echo "  $line\n"; }

// ------------------------------------------------------------------ staff --
//
// One of every role, so permission behaviour can be checked by signing in as
// each rather than reasoning about it.

$users = [];
$users['super_admin'] = create_user('Nitesh (Super Admin)', $adminEmail, $adminPass, 'super_admin');

foreach ([
    ['admin',    'Anita Rao',     'manager@niteshacars.test',  'TestManager2026!'],
    ['accounts', 'Farhan Sheikh', 'accounts@niteshacars.test', 'TestAccounts2026!'],
    ['auditor',  'Meera Iyer',    'auditor@niteshacars.test',  'TestAuditor2026!'],
    ['staff',    'Ravi Kumar',    'staff@niteshacars.test',    'TestStaff2026!'],
] as [$role, $name, $email, $password]) {
    // Skips the one whose address the Super Admin was given, rather than
    // failing on the unique index — the email is configurable.
    if (strcasecmp($email, $adminEmail) === 0) {
        $users[$role] = $users['super_admin'];
        continue;
    }
    $users[$role] = create_user($name, $email, $password, $role);
}

$admin = $users['super_admin'];
note(count(array_unique($users)) . ' users — one per role');

// ---------------------------------------------------------------- vehicles --

$fleet = [
    // name, brand, reg, body, fuel, gearbox, seats, year, colour, odometer,
    // daily, 7-day, 15-day, 30-day, km/day, extra km, deposit, status
    ['Swift VXi',     'Maruti Suzuki', 'KA 01 MJ 4412', 'Hatchback', 'Petrol',   'Manual',    5, 2022, '#C62828',  48210, '1800.00', '11500.00', '22000.00', '40000.00', 200, '8.00',  '3000.00', 'Available'],
    ['Baleno Zeta',   'Maruti Suzuki', 'KA 05 MK 9087', 'Hatchback', 'Petrol',   'Automatic', 5, 2023, '#1565C0',  29640, '2200.00', '14000.00', '26500.00', '48000.00', 200, '9.00',  '4000.00', 'On Rental'],
    ['Brezza ZXi',    'Maruti Suzuki', 'KA 03 NP 1276', 'SUV',       'Petrol',   'Manual',    5, 2023, '#2E7D32',  36885, '2600.00', '16500.00', '31000.00', '56000.00', 250, '10.00', '5000.00', 'Available'],
    ['Creta SX',      'Hyundai',       'KA 02 PB 3311', 'SUV',       'Diesel',   'Automatic', 5, 2024, '#37474F',  18320, '3400.00', '21500.00', '41000.00', '74000.00', 250, '12.00', '7000.00', 'On Rental'],
    ['Innova Crysta', 'Toyota',        'KA 41 QC 7755', 'MUV',       'Diesel',   'Manual',    7, 2021, '#5D4037',  92470, '3900.00', '25000.00', '47000.00', '86000.00', 300, '14.00', '8000.00', 'Booked'],
    ['Fronx Delta',   'Maruti Suzuki', 'KA 51 RD 2048', 'SUV',       'Petrol',   'Manual',    5, 2024, '#EF6C00',  11095, '2400.00', '15000.00', '28500.00', '52000.00', 250, '9.00',  '4500.00', 'Available'],
    ['Tiago EV',      'Tata',          'KA 04 SE 6620', 'Hatchback', 'Electric', 'Automatic', 5, 2024, '#00838F',   7430, '2000.00', '12500.00', '24000.00', '44000.00', 150, '7.00',  '4000.00', 'Maintenance'],
];

$vehicles = [];
$rates    = [];
foreach ($fleet as $v) {
    [$name, $brand, $reg, $body, $fuel, $gearbox, $seats, $year, $colour, $km,
     $daily, $r7, $r15, $r30, $kmLimit, $extraKm, $deposit, $status] = $v;

    $id = insert('vehicles', [
        'name' => $name, 'brand' => $brand, 'reg_number' => $reg,
        'body_type' => $body, 'fuel' => $fuel, 'transmission' => $gearbox,
        'seats' => $seats, 'model_year' => $year, 'colour' => $colour,
        'status' => $status, 'current_km' => $km, 'created_by' => $admin,
    ]);

    insert('vehicle_rates', [
        'vehicle_id' => $id, 'effective_from' => dateOnly(-365),
        'rate_daily' => $daily, 'rate_7day' => $r7, 'rate_15day' => $r15,
        'rate_30day' => $r30, 'km_limit_per_day' => $kmLimit,
        'extra_km_rate' => $extraKm, 'security_deposit' => $deposit,
        'created_by' => $admin,
    ]);

    $vehicles[$name] = $id;
    $rates[$name]    = ['daily' => $daily, 'km' => $kmLimit, 'extra' => $extraKm, 'deposit' => $deposit, 'reg' => $reg, 'odo' => $km];
}

// A second, dearer rate on the Creta from last month. Nothing already booked
// should move: that is the price freezing the README describes, and it is only
// visible if there is more than one rate in the table.
insert('vehicle_rates', [
    'vehicle_id' => $vehicles['Creta SX'], 'effective_from' => dateOnly(-30),
    'rate_daily' => '3600.00', 'rate_7day' => '22500.00', 'rate_15day' => '43000.00',
    'rate_30day' => '78000.00', 'km_limit_per_day' => 250, 'extra_km_rate' => '12.00',
    'security_deposit' => '7000.00', 'created_by' => $admin,
]);
note(count($vehicles) . ' vehicles, ' . (count($vehicles) + 1) . ' rate rows (the Creta was re-priced last month)');

// --------------------------------------------------------------- customers --

$people = [
    ['Arjun Menon',     '9845012233', 'arjun.menon@example.com',  'Indiranagar, Bengaluru',  'KA0120180004521'],
    ['Priya Nair',      '9880144556', 'priya.nair@example.com',   'Koramangala, Bengaluru',  'KA0320190011234'],
    ['Sandeep Reddy',   '9740177889', null,                       'Whitefield, Bengaluru',   'KA5120170007788'],
    ['Fatima Hussain',  '9900122334', 'fatima.h@example.com',     'Jayanagar, Bengaluru',    'KA0220200003344'],
    ['Vikram Shetty',   '9535166778', 'vikram.shetty@example.com','Hebbal, Bengaluru',       'KA0420160009911'],
    ['Ananya Krishnan', '9611133445', 'ananya.k@example.com',     'HSR Layout, Bengaluru',   'KA0520210005566'],
    ['Joseph Mathew',   '9448199001', null,                       'Malleshwaram, Bengaluru', 'KA0120150002211'],
];

$customers = [];
foreach ($people as [$name, $phone, $email, $address, $licence]) {
    $customers[$name] = insert('customers', [
        'name' => $name, 'phone' => $phone, 'email' => $email,
        'address' => $address, 'licence_number' => $licence,
        'created_by' => $admin,
    ]);
}
note(count($customers) . ' customers');

// ---------------------------------------------------------------- bookings --

/**
 * Creates a booking and freezes its price, the way api/bookings.php does.
 * Returns the new booking's id.
 */
function make_booking(array $a): int
{
    global $admin;

    $days   = rental_days($a['start_at'], $a['return_at']);
    $base   = money_times($a['rate_daily'], $days);
    $total  = money_sub(money_add($base, $a['other_charges'] ?? '0.00'), $a['discount'] ?? '0.00');

    $id = insert('bookings', [
        'booking_number'     => next_number('NSC'),
        'enquiry_id'         => $a['enquiry_id'] ?? null,
        'customer_id'        => $a['customer_id'],
        'vehicle_id'         => $a['vehicle_id'],
        'vehicle_reg_number' => $a['reg'],
        'start_at'           => $a['start_at'],
        'return_at'          => $a['return_at'],
        'duration_days'      => $days,
        'pickup_location'    => $a['pickup'] ?? 'NiteSha Cars, Indiranagar',
        'return_location'    => $a['dropoff'] ?? 'NiteSha Cars, Indiranagar',
        'status'             => $a['status'],
        'notes'              => $a['notes'] ?? null,
        'cancelled_reason'   => $a['cancelled_reason'] ?? null,
        'created_by'         => $admin,
        'created_at'         => $a['created_at'] ?? $a['start_at'],
    ]);

    insert('booking_charges', [
        'booking_id'         => $id,
        'rate_daily'         => $a['rate_daily'],
        'km_limit_per_day'   => $a['km_limit'],
        'extra_km_rate'      => $a['extra_km_rate'],
        'deposit_required'   => $a['deposit'],
        'base_rental'        => $base,
        // Left at zero on purpose: the panel derives the extra-KM charge from
        // the odometer readings, so writing a figure here could only ever
        // disagree with them.
        'extra_km_charge'    => '0.00',
        'other_charges'      => $a['other_charges'] ?? '0.00',
        'other_charges_note' => $a['other_charges_note'] ?? null,
        'discount'           => $a['discount'] ?? '0.00',
        'discount_reason'    => $a['discount_reason'] ?? null,
        'total'              => $total,
        'created_by'         => $admin,
    ]);

    return $id;
}

function pay(int $bookingId, string $kind, string $amount, int $daysAgo, string $method, array $extra = []): int
{
    global $admin;
    return insert('payments', array_merge([
        'payment_number' => next_number('PMT'),
        'booking_id'     => $bookingId,
        'kind'           => $kind,
        'amount'         => $amount,
        'paid_on'        => dateOnly(-$daysAgo),
        'method'         => $method,
        'created_by'     => $admin,
    ], $extra));
}

function hold_deposit(int $bookingId, string $amount, int $daysAgo, string $method = 'UPI'): int
{
    global $admin;
    return insert('deposits', [
        'booking_id' => $bookingId, 'amount' => $amount,
        'received_on' => dateOnly(-$daysAgo), 'method' => $method,
        'created_by' => $admin,
    ]);
}

function km(int $bookingId, string $leg, int $odometer, string $recordedAt, string $fuel, array $extra = []): int
{
    global $admin;
    return insert('km_records', array_merge([
        'booking_id' => $bookingId, 'leg' => $leg, 'odometer_km' => $odometer,
        'recorded_at' => $recordedAt, 'fuel_level' => $fuel,
        'created_by' => $admin,
    ], $extra));
}

$bookings = [];

// 1. Finished cleanly a few weeks ago, inside its KM allowance, deposit
//    returned in full. The ordinary case everything else is a variation on.
$b = make_booking([
    'customer_id' => $customers['Arjun Menon'], 'vehicle_id' => $vehicles['Swift VXi'],
    'reg' => $rates['Swift VXi']['reg'], 'start_at' => day(-24, '09:00:00'),
    'return_at' => day(-21, '09:00:00'), 'status' => 'Completed',
    'rate_daily' => $rates['Swift VXi']['daily'], 'km_limit' => $rates['Swift VXi']['km'],
    'extra_km_rate' => $rates['Swift VXi']['extra'], 'deposit' => $rates['Swift VXi']['deposit'],
    'created_at' => day(-28),
]);
pay($b, 'advance', '2000.00', 28, 'UPI', ['reference' => 'UPI/4471023388']);
pay($b, 'balance', '3400.00', 21, 'Cash');
$d = hold_deposit($b, '3000.00', 24);
km($b, 'pickup', 47730, day(-24, '09:12:00'), 'Full');
km($b, 'return', 48210, day(-21, '08:48:00'), 'Full');
insert('refunds', [
    'deposit_id' => $d, 'booking_id' => $b, 'deduction' => '0.00',
    'refund_amount' => '3000.00', 'refunded_on' => dateOnly(-21), 'method' => 'UPI',
    'reference' => 'UPI/4471119002', 'approved_by' => $admin, 'approved_at' => day(-21, '09:30:00'),
    'created_by' => $admin,
]);
$bookings['completed'] = $b;

// 2. Went over its KM allowance. The extra is charged at the rate frozen at
//    booking, paid separately, and part of the deposit was kept for a scratch.
$b = make_booking([
    'customer_id' => $customers['Priya Nair'], 'vehicle_id' => $vehicles['Brezza ZXi'],
    'reg' => $rates['Brezza ZXi']['reg'], 'start_at' => day(-15, '08:00:00'),
    'return_at' => day(-10, '08:00:00'), 'status' => 'Completed',
    'rate_daily' => $rates['Brezza ZXi']['daily'], 'km_limit' => $rates['Brezza ZXi']['km'],
    'extra_km_rate' => $rates['Brezza ZXi']['extra'], 'deposit' => $rates['Brezza ZXi']['deposit'],
    'created_at' => day(-20), 'notes' => 'Coorg trip — long run expected.',
]);
pay($b, 'advance', '5000.00', 20, 'Bank Transfer', ['reference' => 'NEFT/8823001']);
pay($b, 'balance', '8000.00', 10, 'UPI');
pay($b, 'extra_km', '3200.00', 10, 'UPI', ['notes' => '320 km over the 1,250 km allowance at ₹10/km']);
$d = hold_deposit($b, '5000.00', 15, 'Bank Transfer');
km($b, 'pickup', 35315, day(-15, '08:05:00'), 'Full');
km($b, 'return', 37135, day(-10, '07:40:00'), '3/4');
insert('refunds', [
    'deposit_id' => $d, 'booking_id' => $b, 'deduction' => '1500.00',
    'deduction_reason' => 'Kerb scrape on the front left alloy',
    'refund_amount' => '3500.00', 'refunded_on' => dateOnly(-9), 'method' => 'Bank Transfer',
    'approved_by' => $admin, 'approved_at' => day(-9, '11:00:00'), 'created_by' => $admin,
]);
$bookings['extra_km'] = $b;

// 3. Out on rent right now — picked up, not yet back, balance still owed.
$b = make_booking([
    'customer_id' => $customers['Sandeep Reddy'], 'vehicle_id' => $vehicles['Creta SX'],
    'reg' => $rates['Creta SX']['reg'], 'start_at' => day(-2, '07:30:00'),
    'return_at' => day(3, '19:00:00'), 'status' => 'Active',
    // The old rate, from before last month's increase — this booking was made
    // before it and must not move.
    'rate_daily' => '3400.00', 'km_limit' => 250,
    'extra_km_rate' => '12.00', 'deposit' => '7000.00',
    'created_at' => day(-9),
]);
pay($b, 'advance', '8000.00', 9, 'UPI', ['reference' => 'UPI/5590114477']);
hold_deposit($b, '7000.00', 2, 'Card');
km($b, 'pickup', 18320, day(-2, '07:35:00'), 'Full');
$bookings['active'] = $b;

// 4. Should have come back yesterday and has not. Shows as Overdue Return
//    against a recorded status that is still Active, which is the distinction
//    the README draws.
$b = make_booking([
    'customer_id' => $customers['Vikram Shetty'], 'vehicle_id' => $vehicles['Baleno Zeta'],
    'reg' => $rates['Baleno Zeta']['reg'], 'start_at' => day(-8, '10:00:00'),
    'return_at' => day(-1, '10:00:00'), 'status' => 'Active',
    'rate_daily' => $rates['Baleno Zeta']['daily'], 'km_limit' => $rates['Baleno Zeta']['km'],
    'extra_km_rate' => $rates['Baleno Zeta']['extra'], 'deposit' => $rates['Baleno Zeta']['deposit'],
    'created_at' => day(-12), 'notes' => 'Customer asked about extending — not confirmed.',
]);
pay($b, 'advance', '6000.00', 12, 'Cash');
hold_deposit($b, '4000.00', 8, 'Cash');
km($b, 'pickup', 28990, day(-8, '10:10:00'), 'Full');
$bookings['overdue'] = $b;

// 5. Going out today: keys ready, nothing on the odometer yet.
$b = make_booking([
    'customer_id' => $customers['Fatima Hussain'], 'vehicle_id' => $vehicles['Innova Crysta'],
    'reg' => $rates['Innova Crysta']['reg'], 'start_at' => day(0, '16:00:00'),
    'return_at' => day(4, '16:00:00'), 'status' => 'Ready',
    'rate_daily' => $rates['Innova Crysta']['daily'], 'km_limit' => $rates['Innova Crysta']['km'],
    'extra_km_rate' => $rates['Innova Crysta']['extra'], 'deposit' => $rates['Innova Crysta']['deposit'],
    'created_at' => day(-5), 'pickup' => 'Kempegowda Airport, Terminal 1',
    'other_charges' => '1500.00', 'other_charges_note' => 'Airport delivery and collection',
]);
pay($b, 'advance', '7000.00', 5, 'Card', ['reference' => 'CARD/**** 4419']);
$bookings['ready'] = $b;

// 6. Next week's, from an enquiry the site sent in. Only the advance so far.
$b = make_booking([
    'customer_id' => $customers['Ananya Krishnan'], 'vehicle_id' => $vehicles['Fronx Delta'],
    'reg' => $rates['Fronx Delta']['reg'], 'start_at' => day(6, '09:00:00'),
    'return_at' => day(9, '18:00:00'), 'status' => 'Confirmed',
    'rate_daily' => $rates['Fronx Delta']['daily'], 'km_limit' => $rates['Fronx Delta']['km'],
    'extra_km_rate' => $rates['Fronx Delta']['extra'], 'deposit' => $rates['Fronx Delta']['deposit'],
    'created_at' => day(-3), 'discount' => '600.00',
    'discount_reason' => 'Returning customer — third booking',
]);
pay($b, 'advance', '3000.00', 3, 'UPI');
$bookings['upcoming'] = $b;

// 7. Cancelled, with the reason on the record rather than the row deleted.
$b = make_booking([
    'customer_id' => $customers['Joseph Mathew'], 'vehicle_id' => $vehicles['Swift VXi'],
    'reg' => $rates['Swift VXi']['reg'], 'start_at' => day(3, '11:00:00'),
    'return_at' => day(5, '11:00:00'), 'status' => 'Cancelled',
    'rate_daily' => $rates['Swift VXi']['daily'], 'km_limit' => $rates['Swift VXi']['km'],
    'extra_km_rate' => $rates['Swift VXi']['extra'], 'deposit' => $rates['Swift VXi']['deposit'],
    'created_at' => day(-4), 'cancelled_reason' => 'Customer’s travel plans changed',
]);
// Paid, then given back. Neither row is removed — the correction is the second
// row citing the first, which is what an append-only ledger looks like.
$first = pay($b, 'advance', '2000.00', 4, 'UPI');
query("UPDATE payments SET status = 'reversed', status_reason = 'Booking cancelled — advance returned' WHERE id = ?", [$first]);
pay($b, 'advance', '-2000.00', 4, 'UPI', [
    'corrects_id' => $first,
    'notes'       => 'Reverses the advance on the cancelled booking',
]);
$bookings['cancelled'] = $b;

note(count($bookings) . ' bookings — completed, over-KM, on rent, overdue, going out today, upcoming and cancelled');

// --------------------------------------------------------------- enquiries --

$enquiries = [
    ['Deepak Suresh',  '9886100200', 'deepak.s@example.com', 'Creta SX',      2,  5, 'Indiranagar',            'Need an automatic SUV for a family trip to Ooty.', 'New',       null],
    ['Shruti Bhat',    '9739155411', null,                   'Innova Crysta', 9, 13, 'Kempegowda Airport',     'Seven seats, airport pickup at 6am.',              'New',       null],
    ['Imran Qureshi',  '9845166322', 'imran.q@example.com',  'Swift VXi',     1,  4, 'Koramangala',            'Weekend in town, cheapest option please.',         'Contacted', null],
    ['Ananya Krishnan','9611133445', 'ananya.k@example.com', 'Fronx Delta',   6,  9, 'HSR Layout',             'Same as last time if it is free.',                 'Converted', 'upcoming'],
    ['Rahul Deshpande','9900177533', null,                   'Tiago EV',      1,  3, 'Whitefield',             'Is the EV available midweek?',                     'Rejected',  null],
];

$made = 0;
foreach ($enquiries as [$name, $phone, $email, $vehicle, $from, $to, $pickup, $message, $status, $linked]) {
    $row = [
        'enquiry_number'  => next_number('ENQ'),
        'name'            => $name,
        'phone'           => $phone,
        'email'           => $email,
        'vehicle_id'      => $vehicles[$vehicle],
        'start_date'      => dateOnly($from),
        'return_date'     => dateOnly($to),
        'pickup_location' => $pickup,
        'message'         => $message,
        'source'          => 'website',
        'status'          => $status,
        'created_at'      => day(-($made + 1), '14:20:00'),
    ];
    if ($status !== 'New') {
        $row['handled_by'] = $users['admin'];
        $row['handled_at'] = day(-$made, '09:15:00');
    }
    if ($status === 'Rejected') {
        $row['admin_notes'] = 'Tiago is in for a service that week.';
    }
    if ($linked !== null) {
        $row['customer_id'] = $customers[$name];
        $row['booking_id']  = $bookings[$linked];
    }
    $id = insert('enquiries', $row);
    if ($linked !== null) {
        query('UPDATE bookings SET enquiry_id = ? WHERE id = ?', [$id, $bookings[$linked]]);
    }
    $made++;
}
note("$made enquiries — new, contacted, converted and turned down");

// ---------------------------------------------------------------- expenses --

$spend = [
    [-26, 'Fuel',        'Diesel, full tank before handover',        '4200.00', 'Creta SX',      'Indian Oil, 100ft Road',  'UPI',   'approved'],
    [-22, 'Cleaning',    'Interior deep clean after return',          '900.00', 'Swift VXi',     'Speed Car Spa',           'Cash',  'approved'],
    [-19, 'Maintenance', '40,000 km service',                       '11800.00', 'Innova Crysta', 'Toyota Service, Hebbal',  'Card',  'approved'],
    [-16, 'Insurance',   'Annual comprehensive renewal',            '18400.00', 'Brezza ZXi',    'ICICI Lombard',           'Bank Transfer', 'approved'],
    [-12, 'Repairs',     'Front left alloy refinish',                '2600.00', 'Brezza ZXi',    'Wheel Works, Jayanagar',  'Cash',  'approved'],
    [-8,  'Fuel',        'Top-up at handover',                       '2500.00', 'Baleno Zeta',   'HP, Old Airport Road',    'UPI',   'approved'],
    [-5,  'Advertising', 'Instagram promotion, one week',            '3000.00', null,            'Meta Platforms',          'Card',  'approved'],
    [-3,  'Service',     'Battery health check and coolant',         '4900.00', 'Tiago EV',      'Tata Motors, Yeshwanthpur','UPI',  'pending'],
    [-1,  'Office',      'Printer paper, booking forms',              '750.00', null,            'Sri Stationers',          'Cash',  'pending'],
];

$made = 0;
foreach ($spend as [$when, $category, $description, $amount, $vehicle, $vendor, $method, $state]) {
    $row = [
        'expense_number' => next_number('EXP'),
        'spent_on'       => dateOnly($when),
        'category'       => $category,
        'description'    => $description,
        'amount'         => $amount,
        'vehicle_id'     => $vehicle === null ? null : $vehicles[$vehicle],
        'vendor'         => $vendor,
        'method'         => $method,
        'approval_state' => $state,
        'created_by'     => $users['accounts'],
    ];
    if ($state === 'approved') {
        $row['approved_by'] = $admin;
        $row['approved_at'] = day($when + 1, '10:00:00');
    }
    $ids[] = insert('expenses', $row);
    $made++;
}

// One typed in wrong, then corrected. Both rows stay: the Finance tab should
// count the second and not the first.
$wrong = insert('expenses', [
    'expense_number' => next_number('EXP'),
    'spent_on'       => dateOnly(-7),
    'category'       => 'Fuel',
    'description'    => 'Diesel — amount entered wrong',
    'amount'         => '42000.00',
    'vehicle_id'     => $vehicles['Creta SX'],
    'vendor'         => 'Indian Oil, 100ft Road',
    'method'         => 'UPI',
    'status'         => 'voided',
    'status_reason'  => 'Decimal point in the wrong place — corrected below',
    'approval_state' => 'approved',
    'approved_by'    => $admin,
    'approved_at'    => day(-6, '10:00:00'),
    'created_by'     => $users['accounts'],
]);
insert('expenses', [
    'expense_number' => next_number('EXP'),
    'spent_on'       => dateOnly(-7),
    'category'       => 'Fuel',
    'description'    => 'Diesel — corrects the entry above',
    'amount'         => '4200.00',
    'vehicle_id'     => $vehicles['Creta SX'],
    'vendor'         => 'Indian Oil, 100ft Road',
    'method'         => 'UPI',
    'corrects_id'    => $wrong,
    'approval_state' => 'approved',
    'approved_by'    => $admin,
    'approved_at'    => day(-6, '10:05:00'),
    'created_by'     => $users['accounts'],
]);
note(($made + 2) . ' expenses — including one voided and corrected, and two awaiting approval');

// ------------------------------------------------------------------- audit --

audit_log('seed', 'system', 'database', null, null,
    ['note' => 'Test site seeded'], 'tools/seed-test-data.php', $admin, 'Seed script');

echo "\n  Done. Sign in as $adminEmail\n";
