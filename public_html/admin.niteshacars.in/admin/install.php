<?php
declare(strict_types=1);

/**
 * First-run installer.
 *
 * Open this in a browser once the files are on the server. It checks the
 * hosting can run the panel, creates the tables, writes config.php and makes
 * the first Super Admin account.
 *
 * It refuses to do any of that once an account exists, so leaving the file on
 * the server does not hand the next visitor a way to take the panel over.
 * Deleting it afterwards is still the tidier ending, and the last screen says
 * so.
 */

require_once __DIR__ . '/src/db.php';

const CONFIG_PATH    = __DIR__ . '/config.php';
const MIN_PHP        = '8.1';
const MIN_PASSWORD   = 10;

session_start();
if (empty($_SESSION['install_token'])) {
    $_SESSION['install_token'] = bin2hex(random_bytes(32));
}

header('X-Frame-Options: DENY');
header('X-Content-Type-Options: nosniff');
header('X-Robots-Tag: noindex, nofollow');

$errors = [];
$done   = false;

// ---------------------------------------------------------------------------
// Already installed?
//
// The presence of config.php is not enough — a half-finished attempt leaves
// one behind. What settles it is whether anyone can sign in.
// ---------------------------------------------------------------------------
if (is_file(CONFIG_PATH)) {
    try {
        $existing = require CONFIG_PATH;
        config_set(is_array($existing) ? $existing : []);
        $n = (int) (fetch_one('SELECT COUNT(*) AS n FROM users')['n'] ?? 0);
        if ($n > 0) {
            render_installed();
            exit;
        }
    } catch (Throwable $e) {
        // No usable database yet; carry on and let the form fix it.
    }
}

$form = [
    'db_host'     => $_POST['db_host']     ?? 'localhost',
    'db_name'     => $_POST['db_name']     ?? '',
    'db_user'     => $_POST['db_user']     ?? '',
    'db_pass'     => $_POST['db_pass']     ?? '',
    'site_origin' => $_POST['site_origin'] ?? 'https://niteshacars.in',
    'admin_name'  => $_POST['admin_name']  ?? '',
    'admin_email' => $_POST['admin_email'] ?? '',
];

$checks = environment_checks();
$canRun = !in_array(false, array_column($checks, 'ok'), true);

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    if (!hash_equals($_SESSION['install_token'], (string) ($_POST['token'] ?? ''))) {
        $errors[] = 'That form had expired. Please try again.';
    } elseif (!$canRun) {
        $errors[] = 'The hosting does not meet the requirements above.';
    } else {
        $errors = install($form);
        $done   = $errors === [];
    }
}

/**
 * Runs the whole installation, or returns what stopped it. Nothing is written
 * until the database details are known to work, so a wrong password costs a
 * correction rather than a half-configured site.
 */
function install(array $form): array
{
    $errors = [];

    foreach (['db_name' => 'Database name', 'db_user' => 'Database user',
              'admin_name' => 'Your name', 'admin_email' => 'Your email'] as $field => $label) {
        if (trim((string) $form[$field]) === '') {
            $errors[] = "$label is required.";
        }
    }
    if (!filter_var($form['admin_email'], FILTER_VALIDATE_EMAIL)) {
        $errors[] = 'That email address does not look right.';
    }

    $password = (string) ($_POST['admin_password'] ?? '');
    if (strlen($password) < MIN_PASSWORD) {
        $errors[] = 'The password must be at least ' . MIN_PASSWORD . ' characters.';
    }
    if ($password !== (string) ($_POST['admin_password2'] ?? '')) {
        $errors[] = 'The two passwords do not match.';
    }
    if ($errors !== []) {
        return $errors;
    }

    $config = build_config($form);
    config_set($config);

    try {
        // Connected directly rather than through db(), which reports a failure
        // to the browser as a bare 500 — right for the panel, useless here.
        db_set(db_connect($config['db']));
    } catch (Throwable $e) {
        error_log('installer could not connect: ' . $e->getMessage());
        return ['Could not connect to the database. Check the name, user and '
              . 'password, and that the user is attached to that database.'];
    }

    try {
        $applied = migrate();
    } catch (Throwable $e) {
        return ['Setting up the tables failed: ' . $e->getMessage()];
    }

    try {
        require_once __DIR__ . '/src/audit.php';
        require_once __DIR__ . '/src/auth.php';
        create_user($form['admin_name'], $form['admin_email'], $password, 'super_admin');
    } catch (Throwable $e) {
        return ['Creating your account failed: ' . $e->getMessage()];
    }

    if (!write_config($config)) {
        return ['Everything else worked, but config.php could not be written. '
              . 'Create it by hand from config.sample.php, using the details above.'];
    }

    $GLOBALS['__applied'] = $applied;
    return [];
}

/**
 * Applies the files in sql/ in order, once each. Which have run is recorded in
 * the database rather than assumed, so re-running the installer on a database
 * that is already half set up does not fail on tables that exist.
 */
function migrate(): array
{
    query('CREATE TABLE IF NOT EXISTS schema_migrations (
             filename   VARCHAR(190) NOT NULL PRIMARY KEY,
             applied_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
           ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4');

    $already = array_column(fetch_all('SELECT filename FROM schema_migrations'), 'filename');

    $files = glob(__DIR__ . '/sql/*.sql') ?: [];
    sort($files);

    $applied = [];
    foreach ($files as $file) {
        $name = basename($file);
        if (in_array($name, $already, true)) {
            continue;
        }
        foreach (sql_statements((string) file_get_contents($file)) as $statement) {
            db_handle()->exec($statement);
        }
        query('INSERT INTO schema_migrations (filename) VALUES (?)', [$name]);
        $applied[] = $name;
    }
    return $applied;
}

/**
 * Splits a file into statements on semicolons that are not inside a string or
 * a comment. Naive splitting on ";" would cut a statement in half the first
 * time one appears inside quoted text.
 */
function sql_statements(string $sql): array
{
    $statements = [];
    $current    = '';
    $quote      = null;
    $length     = strlen($sql);

    for ($i = 0; $i < $length; $i++) {
        $char = $sql[$i];
        $next = $sql[$i + 1] ?? '';

        if ($quote === null && $char === '-' && $next === '-') {
            $end = strpos($sql, "\n", $i);
            $i   = $end === false ? $length : $end;
            continue;
        }
        if ($quote === null && $char === '/' && $next === '*') {
            $end = strpos($sql, '*/', $i);
            $i   = $end === false ? $length : $end + 1;
            continue;
        }
        if ($quote !== null && $char === '\\') {
            $current .= $char . $next;
            $i++;
            continue;
        }
        if ($quote === null && ($char === "'" || $char === '"' || $char === '`')) {
            $quote = $char;
        } elseif ($quote === $char) {
            $quote = null;
        }
        if ($quote === null && $char === ';') {
            if (trim($current) !== '') {
                $statements[] = trim($current);
            }
            $current = '';
            continue;
        }
        $current .= $char;
    }
    if (trim($current) !== '') {
        $statements[] = trim($current);
    }
    return $statements;
}

function build_config(array $form): array
{
    $origins = array_values(array_filter(array_map(
        'trim',
        preg_split('/[\s,]+/', (string) $form['site_origin']) ?: []
    )));

    return [
        'db' => [
            'host' => trim((string) $form['db_host']) ?: 'localhost',
            'name' => trim((string) $form['db_name']),
            'user' => trim((string) $form['db_user']),
            'password' => (string) $form['db_pass'],
            'charset'  => 'utf8mb4',
        ],
        'storage_path'       => dirname(__DIR__) . '/nitesha-storage',
        'public_site_origin' => $origins,
        // Hostinger serves these domains over HTTPS, and the session cookie
        // carries the sign-in, so it should never travel in the clear.
        'https_only'         => (($_SERVER['HTTPS'] ?? '') !== '' && $_SERVER['HTTPS'] !== 'off'),
        'session_minutes'    => 120,
    ];
}

function write_config(array $config): bool
{
    $php = "<?php\n\n// Written by install.php. Holds the database password —\n"
         . "// keep it out of version control and off any public URL.\n\n"
         . 'return ' . var_export($config, true) . ";\n";

    if (@file_put_contents(CONFIG_PATH, $php) === false) {
        return false;
    }
    @chmod(CONFIG_PATH, 0640);
    return true;
}

function environment_checks(): array
{
    $writable = is_writable(__DIR__);
    return [
        ['label' => 'PHP ' . MIN_PHP . ' or newer',
         'ok'    => version_compare(PHP_VERSION, MIN_PHP, '>='),
         'note'  => 'Running PHP ' . PHP_VERSION],
        ['label' => 'MySQL support (pdo_mysql)',
         'ok'    => extension_loaded('pdo_mysql'),
         'note'  => extension_loaded('pdo_mysql') ? 'Available' : 'Enable it in hPanel → PHP Configuration'],
        ['label' => 'JSON support',
         'ok'    => extension_loaded('json'), 'note' => ''],
        ['label' => 'This folder is writable',
         'ok'    => $writable,
         'note'  => $writable ? 'config.php can be written for you'
                              : 'You will need to create config.php by hand'],
        ['label' => 'sql/ files present',
         'ok'    => (glob(__DIR__ . '/sql/*.sql') ?: []) !== [],
         'note'  => 'The table definitions'],
    ];
}

function h(?string $v): string
{
    return htmlspecialchars((string) $v, ENT_QUOTES, 'UTF-8');
}

function render_installed(): void
{
    page('Already set up', '
      <p class="install-note">This panel is already installed and has at least one
      account, so the installer will not run again.</p>
      <p class="install-note">If you are locked out, create another account over SSH
      with <code>php tools/create-user.php</code>.</p>
      <p style="margin-top:18px"><a class="btn btn-primary btn-block" href="index.php">Go to sign in</a></p>
      <p class="install-note" style="margin-top:18px">You can safely delete
      <code>install.php</code> from the server.</p>');
}

function page(string $title, string $body): void
{
    echo '<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8">'
       . '<meta name="viewport" content="width=device-width, initial-scale=1.0">'
       . '<title>' . h($title) . ' — NiteSha Cars Admin</title>'
       . '<meta name="robots" content="noindex, nofollow">'
       . '<link rel="preconnect" href="https://fonts.googleapis.com">'
       . '<link href="https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600;700;800&display=swap" rel="stylesheet">'
       . '<link rel="stylesheet" href="admin.css"></head><body>'
       . '<div class="login-screen"><div class="login-card install-card">'
       . '<div class="login-logo"><span class="logo-mark">'
       . '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#F5A500" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 12.5l1.4-4.2A2 2 0 0 1 6.3 7h11.4a2 2 0 0 1 1.9 1.3L21 12.5"/><rect x="2.5" y="12.5" width="19" height="5" rx="1.5"/><circle cx="7" cy="18" r="1.4" fill="#F5A500" stroke="none"/><circle cx="17" cy="18" r="1.4" fill="#F5A500" stroke="none"/></svg>'
       . '</span>NiteSha Cars</div><h1>' . h($title) . '</h1>'
       . $body
       . '</div></div></body></html>';
}

// ---------------------------------------------------------------------------
// Screens
// ---------------------------------------------------------------------------
if ($done) {
    $applied = $GLOBALS['__applied'] ?? [];
    page('Ready', '
      <p class="install-note">The panel is set up. Sign in with the account you
      just made.</p>
      <ul class="install-checks">'
      . ($applied === [] ? '' : '<li class="ok">Tables created (' . h(implode(', ', $applied)) . ')</li>')
      . '<li class="ok">Your Super Admin account was created</li>
         <li class="ok">config.php was written</li>
      </ul>
      <p style="margin-top:18px"><a class="btn btn-primary btn-block" href="index.php">Sign in</a></p>
      <p class="install-note" style="margin-top:18px"><strong>One last step:</strong>
      delete <code>install.php</code> from the server. It will not run again while an
      account exists, but there is no reason to leave it there.</p>');
    exit;
}

ob_start();
?>
<p class="install-note">This sets up the admin panel: it creates the tables and
your first account. It runs once.</p>

<ul class="install-checks">
  <?php foreach ($checks as $check): ?>
    <li class="<?= $check['ok'] ? 'ok' : 'no' ?>">
      <?= h($check['label']) ?>
      <?php if ($check['note'] !== ''): ?><span><?= h($check['note']) ?></span><?php endif; ?>
    </li>
  <?php endforeach; ?>
</ul>

<?php if ($errors !== []): ?>
  <div class="install-errors">
    <?php foreach ($errors as $error): ?><p><?= h($error) ?></p><?php endforeach; ?>
  </div>
<?php endif; ?>

<form method="post" autocomplete="off">
  <input type="hidden" name="token" value="<?= h($_SESSION['install_token']) ?>">

  <h2 class="install-heading">Database</h2>
  <p class="install-note">Create a database and user in hPanel first, then put
  the same details here.</p>

  <label for="db_host">Host</label>
  <input type="text" id="db_host" name="db_host" value="<?= h($form['db_host']) ?>" required>

  <label for="db_name">Database name</label>
  <input type="text" id="db_name" name="db_name" value="<?= h($form['db_name']) ?>" required>

  <label for="db_user">Database user</label>
  <input type="text" id="db_user" name="db_user" value="<?= h($form['db_user']) ?>" required>

  <label for="db_pass">Database password</label>
  <input type="password" id="db_pass" name="db_pass" value="<?= h($form['db_pass']) ?>">

  <h2 class="install-heading">Your website</h2>
  <p class="install-note">The address the enquiry form posts from. Separate more
  than one with a space.</p>

  <label for="site_origin">Website address</label>
  <input type="text" id="site_origin" name="site_origin" value="<?= h($form['site_origin']) ?>">

  <h2 class="install-heading">Your account</h2>
  <p class="install-note">This is the Super Admin — the account that can create
  the others.</p>

  <label for="admin_name">Your name</label>
  <input type="text" id="admin_name" name="admin_name" value="<?= h($form['admin_name']) ?>" required>

  <label for="admin_email">Email</label>
  <input type="email" id="admin_email" name="admin_email" value="<?= h($form['admin_email']) ?>" required>

  <label for="admin_password">Password</label>
  <input type="password" id="admin_password" name="admin_password" required
         minlength="<?= MIN_PASSWORD ?>" autocomplete="new-password">

  <label for="admin_password2">Password again</label>
  <input type="password" id="admin_password2" name="admin_password2" required
         autocomplete="new-password">

  <button type="submit" class="btn btn-primary btn-block" style="margin-top:18px">Set up the panel</button>
</form>
<?php
page('Set up', (string) ob_get_clean());
