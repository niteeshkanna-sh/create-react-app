<?php
declare(strict_types=1);

/**
 * Writing a car loan's instalments into the expenses.
 *
 * The loan is described once on the vehicle -- what it costs, which day it
 * falls, when it started, how many there are -- and this turns that into one
 * expense per instalment, as each one comes due.
 *
 * Three rules, and they are the whole of it:
 *
 *   Never ahead of today. An instalment due next month has not been paid, and
 *   an expense dated in the future makes this month's outgoings wrong.
 *
 *   Never past the last one. A loan of 36 instalments writes 36 and stops. A
 *   loan that runs out and keeps writing is worse than one that never started.
 *
 *   Never twice. The unique key on (loan_id, loan_seq) means this is the
 *   database's promise rather than this file's -- two people opening the
 *   dashboard in the same second cannot produce two rows for one instalment.
 */

require_once __DIR__ . '/db.php';

/**
 * The day an instalment falls, clamped into the month it falls in.
 *
 * A loan due on the 31st has no 31st in February. Banks take it on the last
 * day of the month, and so does this: the alternative, rolling into the 1st of
 * March, moves the cost into the wrong month, which is the one thing the
 * expense date is for.
 */
function loan_due_date(string $firstDueOn, int $dueDay, int $seq): ?string
{
    $start = date_create_immutable($firstDueOn);
    if ($start === false) {
        return null;
    }

    // The first instalment is the date it is recorded as, whatever day of the
    // month that was. Every one after it is dueDay of a later month.
    if ($seq <= 1) {
        return $start->format('Y-m-d');
    }

    $month = $start->modify('first day of this month +' . ($seq - 1) . ' month');
    if ($month === false) {
        return null;
    }

    $lastDay = (int) $month->format('t');
    $day = min(max($dueDay, 1), $lastDay);

    return $month->setDate((int) $month->format('Y'), (int) $month->format('n'), $day)->format('Y-m-d');
}

/**
 * Every instalment of this loan that is due on or before `$upTo` — as
 * [sequence number, date] — and not one more.
 *
 * Bounded by the instalment count as well as by the date, so a loan entered
 * with a first due date years ago produces its own length and stops rather
 * than counting forward forever.
 */
function loan_due_instalments(array $loan, string $upTo): array
{
    $total = max(0, (int) $loan['instalments']);
    $endedOn = $loan['ended_on'] ?? null;

    // A closed loan still owes whatever fell before it closed. Nothing after.
    $limit = $endedOn !== null && $endedOn < $upTo ? $endedOn : $upTo;

    $out = [];
    for ($seq = 1; $seq <= $total; $seq++) {
        $due = loan_due_date((string) $loan['first_due_on'], (int) $loan['due_day'], $seq);
        if ($due === null) {
            break;
        }
        if ($due > $limit) {
            break;
        }
        $out[] = [$seq, $due];
    }

    return $out;
}

/**
 * Writes the expenses that are due and not yet written, for every loan.
 *
 * Returns how many rows it created, which is almost always zero -- this runs
 * on a dashboard load and most days there is nothing to post.
 *
 * Each row is inserted on its own rather than in one transaction over the lot:
 * a single duplicate (another request got there first) should cost that one
 * instalment, not the other eleven that were about to be written beside it.
 */
function loans_post_due(?string $today = null): int
{
    $today ??= date('Y-m-d');

    if (!table_exists('vehicle_loans')) {
        return 0;
    }

    $loans = fetch_all(
        'SELECT l.*, v.name AS vehicle_name
           FROM vehicle_loans l
           JOIN vehicles v ON v.id = l.vehicle_id
          WHERE l.ended_on IS NULL OR l.ended_on >= l.first_due_on'
    );

    $written = 0;
    foreach ($loans as $loan) {
        // What is already there, asked once per loan rather than once per
        // instalment -- a 60-month loan should not be 60 queries.
        $have = array_column(
            fetch_all('SELECT loan_seq FROM expenses WHERE loan_id = ?', [$loan['id']]),
            'loan_seq'
        );
        $have = array_map('intval', $have);

        foreach (loan_due_instalments($loan, $today) as [$seq, $due]) {
            if (in_array($seq, $have, true)) {
                continue;
            }

            try {
                $number = next_number('EXP');
                query(
                    'INSERT INTO expenses
                       (expense_number, spent_on, category, description, amount,
                        vehicle_id, loan_id, loan_seq, vendor, method)
                     VALUES (?,?,?,?,?,?,?,?,?,?)',
                    [
                        $number,
                        $due,
                        'EMI',
                        sprintf(
                            'EMI %d of %d — %s',
                            $seq,
                            (int) $loan['instalments'],
                            (string) $loan['vehicle_name']
                        ),
                        $loan['amount'],
                        $loan['vehicle_id'],
                        $loan['id'],
                        $seq,
                        $loan['lender'],
                        $loan['method'],
                    ]
                );
                $written++;
            } catch (Throwable $e) {
                // The unique key doing its job, almost certainly: another
                // request posted this instalment between the read above and
                // this insert. Nothing to repair and nothing to say -- the row
                // exists, which is what was wanted.
                error_log('loans_post_due: instalment ' . $seq . ' of loan ' . $loan['id']
                    . ' not written: ' . $e->getMessage());
            }
        }
    }

    return $written;
}

/**
 * The open loan on a vehicle, or null.
 *
 * One at a time. The form describes what a car's finance is, not a history of
 * it, and a car with two live loans is not a thing this business has.
 */
function vehicle_open_loan(int $vehicleId): ?array
{
    if (!table_exists('vehicle_loans')) {
        return null;
    }
    return fetch_one(
        'SELECT * FROM vehicle_loans WHERE vehicle_id = ? ORDER BY ended_on IS NULL DESC, id DESC LIMIT 1',
        [$vehicleId]
    );
}

/**
 * Writes the loan the vehicle form described, or removes it.
 *
 * An empty amount means "no loan on this car". That deletes the row rather
 * than keeping a zero one -- but only when no instalment has been written from
 * it, because an expense that points at a loan needs the loan to still be
 * there to explain it. A loan that has already paid out is closed instead,
 * which is the honest record of it either way.
 */
function save_vehicle_loan(int $vehicleId, array $in, int $userId): void
{
    $existing = vehicle_open_loan($vehicleId);

    $amount = trim((string) ($in['amount'] ?? ''));
    $first  = trim((string) ($in['first_due_on'] ?? ''));
    $day    = (int) ($in['due_day'] ?? 0);
    $count  = (int) ($in['instalments'] ?? 0);
    $ended  = trim((string) ($in['ended_on'] ?? ''));
    $lender = trim((string) ($in['lender'] ?? ''));

    // Not a loan unless it says what, when and how many. A half-filled one
    // would post instalments on dates nobody chose.
    $described = $amount !== '' && (float) $amount > 0 && $first !== '' && $count > 0;

    if (!$described) {
        if ($existing === null) {
            return;
        }
        $posted = fetch_one('SELECT COUNT(*) AS n FROM expenses WHERE loan_id = ?', [$existing['id']]);
        if ((int) ($posted['n'] ?? 0) > 0) {
            if ($existing['ended_on'] === null) {
                query('UPDATE vehicle_loans SET ended_on = CURDATE() WHERE id = ?', [$existing['id']]);
            }
            return;
        }
        query('DELETE FROM vehicle_loans WHERE id = ?', [$existing['id']]);
        return;
    }

    // A day outside the month is a typo, not an instruction. 31 is kept as
    // written -- it means the end of the month, and loan_due_date clamps it.
    $day = $day >= 1 && $day <= 31 ? $day : (int) date('j', (int) strtotime($first));

    $fields = [
        'lender'       => $lender === '' ? null : $lender,
        'amount'       => $amount,
        'due_day'      => $day,
        'first_due_on' => $first,
        'instalments'  => min($count, 600),
        'ended_on'     => $ended === '' ? null : $ended,
    ];

    if ($existing === null) {
        query(
            'INSERT INTO vehicle_loans
               (vehicle_id, lender, amount, due_day, first_due_on, instalments, ended_on, created_by)
             VALUES (?,?,?,?,?,?,?,?)',
            [$vehicleId, $fields['lender'], $fields['amount'], $fields['due_day'],
             $fields['first_due_on'], $fields['instalments'], $fields['ended_on'], $userId]
        );
        return;
    }

    query(
        'UPDATE vehicle_loans
            SET lender = ?, amount = ?, due_day = ?, first_due_on = ?, instalments = ?, ended_on = ?
          WHERE id = ?',
        [$fields['lender'], $fields['amount'], $fields['due_day'], $fields['first_due_on'],
         $fields['instalments'], $fields['ended_on'], $existing['id']]
    );
}

/**
 * Posts what is due, at most once a day per session.
 *
 * Called from the dashboard rather than from a cron, because this host runs no
 * cron the business controls. A dashboard that is opened every working day
 * posts every instalment on the day it falls; one opened after a fortnight
 * away posts the fortnight's worth at once, correctly dated. Nothing is lost
 * by not looking, which is the property that matters.
 */
function loans_post_due_once(): void
{
    $today = date('Y-m-d');
    if (($_SESSION['emi_posted_on'] ?? null) === $today) {
        return;
    }

    try {
        loans_post_due($today);
        $_SESSION['emi_posted_on'] = $today;
    } catch (Throwable $e) {
        // Left unmarked, so the next page load tries again rather than
        // remembering the failure for the rest of the day.
        error_log('loans_post_due_once failed: ' . $e->getMessage());
    }
}
