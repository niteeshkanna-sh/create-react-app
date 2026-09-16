<?php
declare(strict_types=1);

require_once __DIR__ . '/src/csrf.php';

// Already signed in — go straight through.
if (current_user() !== null) {
    header('Location: dashboard.php');
    exit;
}

$error = null;

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    require_csrf();

    $result = attempt_login(
        (string) ($_POST['email'] ?? ''),
        (string) ($_POST['password'] ?? '')
    );

    if ($result['ok']) {
        header('Location: dashboard.php');
        exit;
    }
    $error = $result['error'] ?? 'Sign in failed.';
}

// A fresh install has no accounts yet; say so rather than letting someone
// guess at credentials that do not exist.
$hasUsers = (int) (fetch_one('SELECT COUNT(*) AS n FROM users')['n'] ?? 0) > 0;

// Clickjacking and MIME-sniffing protections for the login page itself.
header('X-Frame-Options: DENY');
header('X-Content-Type-Options: nosniff');
header('Referrer-Policy: same-origin');
?>
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Sign in — NiteSha Cars Admin</title>
  <meta name="robots" content="noindex, nofollow">
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link href="https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600;700;800&display=swap" rel="stylesheet">
  <link rel="stylesheet" href="admin.css">
</head>
<body>

<div class="login-screen">
  <div class="login-card">
    <div class="login-logo">
      <span class="logo-mark">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#F5A500" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 12.5l1.4-4.2A2 2 0 0 1 6.3 7h11.4a2 2 0 0 1 1.9 1.3L21 12.5"/><rect x="2.5" y="12.5" width="19" height="5" rx="1.5"/><circle cx="7" cy="18" r="1.4" fill="#F5A500" stroke="none"/><circle cx="17" cy="18" r="1.4" fill="#F5A500" stroke="none"/></svg>
      </span>
      NiteSha Cars
    </div>

    <h1>Admin Sign In</h1>

    <?php if (!$hasUsers): ?>
      <p class="login-note">
        No accounts exist yet. On the server, run<br>
        <code>php tools/create-user.php</code><br>
        to create the first Super Admin.
      </p>
    <?php else: ?>
      <p class="login-note">Signed-in sessions end after a period of inactivity.</p>
    <?php endif; ?>

    <form method="post" autocomplete="on">
      <?= csrf_field() ?>

      <label for="email">Email</label>
      <input type="email" id="email" name="email" required autocomplete="username"
             value="<?= e($_POST['email'] ?? '') ?>" autofocus>

      <label for="password">Password</label>
      <input type="password" id="password" name="password" required autocomplete="current-password">

      <p class="login-error"><?= e($error) ?></p>

      <button type="submit" class="btn btn-primary btn-block">Sign In</button>
    </form>
  </div>
</div>

</body>
</html>
