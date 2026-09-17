<?php
declare(strict_types=1);

require_once __DIR__ . '/assets.php';
require_once __DIR__ . '/csrf.php';

/**
 * The frame every admin page sits in.
 *
 * It used to be copied into each page, which is how places.php ended up with
 * no header at all and its own idea of what a card looks like. One function
 * means the panel is one product: the same navigation, the same bar, the same
 * widths, whichever page is open.
 *
 * The navigation is a column on a desktop and a drawer on a phone -- the same
 * markup either way, decided in CSS. The row of pills it replaces could only
 * ever show two of its six destinations on a phone; the rest were reachable
 * by dragging a strip most people never realised could be dragged.
 */

/**
 * Every destination in the panel, in the order they are shown.
 *
 * `tab` names a panel inside dashboard.php, switched in JavaScript. `page` is
 * an ordinary link. Grouping them here rather than in each page's markup is
 * what lets content.php show the same six operational destinations the
 * dashboard does, as links back to it.
 */
function admin_nav_groups(): array
{
    return [
        'Running the day' => [
            ['tab' => 'dashboard', 'label' => 'Dashboard', 'icon' => 'chart'],
            ['tab' => 'bookings',  'label' => 'Bookings',  'icon' => 'clipboard', 'count' => 'bookingCount'],
            ['tab' => 'cars',      'label' => 'Vehicles',  'icon' => 'car'],
            ['tab' => 'inquiries', 'label' => 'Inquiries', 'icon' => 'inbox',     'count' => 'inquiryCount'],
        ],
        'Money' => [
            ['tab' => 'finance', 'label' => 'Finance', 'icon' => 'card'],
            ['tab' => 'reports', 'label' => 'Reports', 'icon' => 'trend'],
        ],
        'The website' => [
            ['page' => 'content.php', 'label' => 'Website content', 'icon' => 'pencil'],
            ['page' => 'places.php',  'label' => 'Places to visit',  'icon' => 'pin'],
        ],
    ];
}

/** One of the small line drawings beside a navigation entry. */
function admin_nav_icon(string $name): string
{
    $paths = [
        'chart'     => '<rect x="3" y="12" width="4" height="8" rx="1" fill="currentColor" stroke="none"/><rect x="10" y="4" width="4" height="16" rx="1" fill="currentColor" stroke="none"/><rect x="17" y="9" width="4" height="11" rx="1" fill="currentColor" stroke="none"/>',
        'clipboard' => '<rect x="5" y="4" width="14" height="17" rx="2"/><rect x="8.5" y="2" width="7" height="4" rx="1"/><line x1="8" y1="11" x2="16" y2="11"/><line x1="8" y1="15" x2="16" y2="15"/>',
        'car'       => '<path d="M3 13l1.4-4.2A2 2 0 0 1 6.3 7.5h11.4a2 2 0 0 1 1.9 1.3L21 13"/><rect x="2.5" y="13" width="19" height="5" rx="1.5"/><circle cx="7" cy="18.5" r="1.4"/><circle cx="17" cy="18.5" r="1.4"/>',
        'inbox'     => '<path d="M3 12h5l1.5 3h5L16 12h5"/><path d="M5.5 5h13l2.5 7v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-7l2.5-7z"/>',
        'card'      => '<rect x="3" y="6" width="18" height="13" rx="2"/><path d="M3 10h18"/><circle cx="16.5" cy="14.5" r="1"/>',
        'trend'     => '<path d="M3 17l6-6 4 4 8-8"/><path d="M15 7h6v6"/>',
        'pencil'    => '<path d="M4 20h4l10-10a2.8 2.8 0 0 0-4-4L4 16v4z"/><line x1="13.5" y1="6.5" x2="17.5" y2="10.5"/>',
        'pin'       => '<path d="M12 21s7-6.2 7-11a7 7 0 1 0-14 0c0 4.8 7 11 7 11z"/><circle cx="12" cy="10" r="2.5"/>',
    ];

    return '<svg class="ns-ico" width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor"'
        . ' stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">'
        . ($paths[$name] ?? '') . '</svg>';
}

/**
 * Opens the page: everything from <!DOCTYPE> down to the start of the content.
 *
 * $current is the key of the entry to mark as where you are -- a tab name on
 * the dashboard, or a filename on any other page.
 *
 * $onDashboard decides whether the six operational entries are buttons that
 * switch a panel, or links that go to the dashboard and open it there. The
 * dashboard's own JavaScript binds to .admin-tab, so the class is kept on the
 * buttons and deliberately left off the links.
 */
function admin_shell_open(
    array $me,
    string $current,
    string $title,
    bool $onDashboard = false,
    ?string $migrationError = null,
    string $headExtra = '',
): void {
    $tabHref = static fn (string $tab): string => 'dashboard.php#' . $tab;
    ?>
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title><?= e($title) ?> — NiteSha Cars &amp; Bikes Admin</title>
  <meta name="robots" content="noindex, nofollow">
  <link rel="icon" href="data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 100 100%22><text y=%22.9em%22 font-size=%2290%22>🔐</text></svg>">
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600;700;800&display=swap" rel="stylesheet">
  <meta name="csrf-token" content="<?= e(csrf_token()) ?>">
  <link rel="stylesheet" href="<?= asset('admin.css') ?>">
<?= $headExtra ?>
</head>
<body class="ns-body">
<a class="ns-skip" href="#nsMain">Skip to the page</a>

<div class="ns">
  <!-- The drawer's backdrop on a phone. Nothing on a wide screen. -->
  <div class="ns-scrim" id="nsScrim" hidden></div>

  <aside class="ns-side" id="nsSide">
    <div class="ns-brand">
      <span class="logo-mark" aria-hidden="true">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 12.5l1.4-4.2A2 2 0 0 1 6.3 7h11.4a2 2 0 0 1 1.9 1.3L21 12.5"/><rect x="2.5" y="12.5" width="19" height="5" rx="1.5"/><circle cx="7" cy="18" r="1.4" fill="#fff" stroke="none"/><circle cx="17" cy="18" r="1.4" fill="#fff" stroke="none"/></svg>
      </span>
      <span class="ns-brand-text">NiteSha <span>Cars &amp; Bikes</span></span>
      <button class="ns-close" id="nsClose" type="button" aria-label="Close the menu">&times;</button>
    </div>

    <nav class="ns-nav" aria-label="Admin sections">
      <?php foreach (admin_nav_groups() as $heading => $items): ?>
        <p class="ns-group"><?= e($heading) ?></p>
        <?php foreach ($items as $item): ?>
          <?php
          $key    = $item['tab'] ?? $item['page'];
          $active = $key === $current ? ' is-on' : '';
          $inner  = admin_nav_icon($item['icon'])
              . '<span class="ns-item-label">' . e($item['label']) . '</span>'
              . (isset($item['count'])
                  ? '<span class="tab-count" id="' . e($item['count']) . '"></span>'
                  : '');
          ?>
          <?php if (isset($item['tab']) && $onDashboard): ?>
            <button class="ns-item admin-tab<?= $active ?>" type="button" data-tab="<?= e($item['tab']) ?>"><?= $inner ?></button>
          <?php else: ?>
            <a class="ns-item<?= $active ?>" href="<?= e($item['page'] ?? $tabHref($item['tab'])) ?>"><?= $inner ?></a>
          <?php endif; ?>
        <?php endforeach; ?>
      <?php endforeach; ?>
    </nav>

    <div class="ns-side-foot">
      <span class="ns-who">
        <span class="ns-who-name"><?= e((string) $me['name']) ?></span>
        <span class="who-role"><?= e((string) ($me['role_name'] ?? $me['role'] ?? '')) ?></span>
      </span>
      <form method="post" action="logout.php" class="logout-form">
        <?= csrf_field() ?>
        <button type="submit" class="btn btn-ghost btn-sm btn-block">Log out</button>
      </form>
    </div>
  </aside>

  <div class="ns-main">
    <header class="ns-bar">
      <button class="ns-burger" id="nsBurger" type="button" aria-label="Open the menu" aria-expanded="false" aria-controls="nsSide">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><line x1="4" y1="7" x2="20" y2="7"/><line x1="4" y1="12" x2="20" y2="12"/><line x1="4" y1="17" x2="20" y2="17"/></svg>
      </button>
      <h1 class="ns-bar-title"><?= e($title) ?></h1>
      <span class="admin-tag">Admin</span>
    </header>

<?php if ($migrationError !== null): ?>
    <div class="migration-warning">
      <strong>The database is not fully up to date.</strong>
      Some newer features may fail until this is resolved.
      <span><?= e($migrationError) ?></span>
    </div>
<?php endif; ?>

    <main class="ns-content" id="nsMain">
<?php
}

/** Closes what admin_shell_open opened, and loads the drawer's script. */
function admin_shell_close(): void
{
    ?>
    </main>
  </div>
</div>
<script src="<?= asset('shell.js') ?>"></script>
<?php
}
