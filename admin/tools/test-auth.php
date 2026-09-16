<?php
declare(strict_types=1);

/**
 * Exercises the auth and audit layer against a real MySQL/MariaDB database.
 *
 * Usage: php tools/test-auth.php "mysql:unix_socket=/tmp/mysql.sock;dbname=nitesha_test" root ""
 *
 * Creates and removes its own test users; it does not touch anything else.
 */

$dsn  = $argv[1] ?? null;
$user = $argv[2] ?? 'root';
$pass = $argv[3] ?? '';

if ($dsn === null) {
    fwrite(STDERR, "Usage: php tools/test-auth.php <dsn> [user] [password]\n");
    exit(2);
}

require_once __DIR__ . '/../src/db.php';
config_set(['https_only' => false, 'session_idle_minutes' => 120]);
db_set(new PDO($dsn, $user, $pass, [
    PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION,
    PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
    PDO::ATTR_EMULATE_PREPARES   => false,
]));

require_once __DIR__ . '/../src/audit.php';
require_once __DIR__ . '/../src/auth.php';

$pass_count = 0;
$fail_count = 0;

function check(string $label, bool $ok, string $detail = ''): void
{
    global $pass_count, $fail_count;
    if ($ok) {
        $pass_count++;
        echo "  ok    {$label}\n";
    } else {
        $fail_count++;
        echo "  FAIL  {$label}" . ($detail !== '' ? " — {$detail}" : '') . "\n";
    }
}

// Clean slate for the accounts this script owns.
query("DELETE FROM audit_logs WHERE user_label LIKE 'authtest%' OR user_id IN (SELECT id FROM users WHERE email LIKE 'authtest%')");
query("DELETE FROM users WHERE email LIKE 'authtest%'");

echo "\n-- password storage --\n";
$id = create_user('Auth Test', 'authtest@example.com', 'correct-horse-battery', 'admin');
$row = fetch_one('SELECT password_hash FROM users WHERE id = ?', [$id]);
check('password is not stored in plaintext', !str_contains((string) $row['password_hash'], 'correct-horse-battery'));
check('hash verifies', password_verify('correct-horse-battery', (string) $row['password_hash']));
check('hash uses a real algorithm', str_starts_with((string) $row['password_hash'], '$2y$')
    || str_starts_with((string) $row['password_hash'], '$argon'));

try {
    create_user('Weak', 'authtest-weak@example.com', 'short', 'admin');
    check('short password rejected', false, 'it was accepted');
} catch (InvalidArgumentException) {
    check('short password rejected', true);
}

echo "\n-- login --\n";
$r = attempt_login('authtest@example.com', 'wrong-password');
check('wrong password refused', $r['ok'] === false);
check('error message does not reveal whether the account exists',
    ($r['error'] ?? '') === 'Incorrect email or password.');

$r = attempt_login('nobody-here@example.com', 'whatever');
check('unknown account gives the identical message',
    $r['ok'] === false && ($r['error'] ?? '') === 'Incorrect email or password.');

query('UPDATE users SET failed_logins = 0, locked_until = NULL WHERE id = ?', [$id]);
$r = attempt_login('authtest@example.com', 'correct-horse-battery');
check('correct password accepted', $r['ok'] === true);
check('password hash never returned to the caller', !isset($r['user']['password_hash']));

echo "\n-- lockout --\n";
query('UPDATE users SET failed_logins = 0, locked_until = NULL WHERE id = ?', [$id]);
for ($i = 0; $i < LOGIN_MAX_ATTEMPTS; $i++) {
    attempt_login('authtest@example.com', 'nope');
}
$locked = fetch_one('SELECT failed_logins, locked_until FROM users WHERE id = ?', [$id]);
check('account locks after ' . LOGIN_MAX_ATTEMPTS . ' failures', $locked['locked_until'] !== null);

$r = attempt_login('authtest@example.com', 'correct-horse-battery');
check('correct password refused while locked', $r['ok'] === false,
    'lockout can be bypassed by finally guessing right');
check('lockout message explains the wait', str_contains($r['error'] ?? '', 'Try again in'));

query('UPDATE users SET failed_logins = 0, locked_until = NULL WHERE id = ?', [$id]);

echo "\n-- disabled accounts --\n";
query('UPDATE users SET is_active = 0 WHERE id = ?', [$id]);
$r = attempt_login('authtest@example.com', 'correct-horse-battery');
check('disabled account cannot log in', $r['ok'] === false);
query('UPDATE users SET is_active = 1 WHERE id = ?', [$id]);

echo "\n-- roles --\n";
check('super admin can do anything',            role_can('super_admin', 'payment.delete'));
check('auditor may view payments',              role_can('auditor', 'payment.view'));
check('auditor may NOT create payments',       !role_can('auditor', 'payment.create'));
check('auditor may NOT void payments',         !role_can('auditor', 'payment.void'));
check('auditor may read the audit log',         role_can('auditor', 'audit.view'));
check('accounts may create payments',           role_can('accounts', 'payment.create'));
check('accounts may NOT edit vehicles',        !role_can('accounts', 'vehicle.edit'));
check('admin may create bookings',              role_can('admin', 'booking.create'));
check('admin may NOT create payments',         !role_can('admin', 'payment.create'));
check('staff may view bookings',                role_can('staff', 'booking.view'));
check('staff may NOT view payments',           !role_can('staff', 'payment.view'));
check('staff may NOT read the audit log',      !role_can('staff', 'audit.view'));
check('unknown role gets nothing',             !role_can('nonsense', 'booking.view'));

echo "\n-- audit trail --\n";
$logs = fetch_all(
    "SELECT action, module FROM audit_logs
      WHERE user_id = ? ORDER BY id DESC LIMIT 20", [$id]
);
$actions = array_column($logs, 'action');
check('successful logins are recorded',  in_array('login', $actions, true));
check('failed logins are recorded',      in_array('login_failed', $actions, true));

audit_log('test_redaction', 'test', 'user', $id,
    ['password' => 'hunter2', 'name' => 'Before'],
    ['password' => 'hunter3', 'name' => 'After'], null, $id, 'authtest');
$entry = fetch_one("SELECT previous_value, new_value FROM audit_logs
                     WHERE action = 'test_redaction' ORDER BY id DESC LIMIT 1");
check('passwords are redacted in the audit trail',
    !str_contains((string) $entry['previous_value'], 'hunter2')
    && !str_contains((string) $entry['new_value'], 'hunter3'));
check('non-sensitive fields are still recorded',
    str_contains((string) $entry['new_value'], 'After'));

[$prev, $curr] = diff_changes(['a' => 1, 'b' => 2], ['a' => 1, 'b' => 3]);
check('diff records only what changed', $prev === ['b' => 2] && $curr === ['b' => 3]);

echo "\n-- document numbering --\n";
query('DELETE FROM number_sequences WHERE prefix = ?', ['TST']);
$first  = next_number('TST', 2026);
$second = next_number('TST', 2026);
check('numbers are sequential and zero-padded', $first === 'TST-2026-0001' && $second === 'TST-2026-0002',
    "{$first} then {$second}");
$newYear = next_number('TST', 2027);
check('numbering restarts each year', $newYear === 'TST-2027-0001', $newYear);

// Tidy up.
query("DELETE FROM audit_logs WHERE user_id = ? OR user_label = 'authtest'", [$id]);
query('DELETE FROM users WHERE email LIKE ?', ['authtest%']);
query('DELETE FROM number_sequences WHERE prefix = ?', ['TST']);

echo "\n{$pass_count} passed, {$fail_count} failed\n";
exit($fail_count === 0 ? 0 : 1);
