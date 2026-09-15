<?php
declare(strict_types=1);

require_once __DIR__ . '/src/csrf.php';
require_once __DIR__ . '/src/content.php';
require_once __DIR__ . '/src/migrate.php';
require_once __DIR__ . '/src/audit.php';

/**
 * Editing the words on the public site.
 *
 * A page of its own rather than another tab in dashboard.php, which is driven
 * by admin.js and would need real surgery to take a form this shape. Plain
 * form posts, no JavaScript: a repeater row is rendered server-side with one
 * blank row on the end, which is enough to add items without shipping an
 * editor.
 *
 * Saving writes an override. Resetting deletes it, and the section goes back
 * to the copy shipped with the site.
 */

$me = require_login();

header('X-Frame-Options: DENY');
header('X-Content-Type-Options: nosniff');
header('Referrer-Policy: same-origin');

$schema = content_schema();
$page   = $_GET['page'] ?? 'home';
if (!isset($schema[$page])) {
    $page = array_key_first($schema);
}

$notice = null;
$error  = null;

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    require_csrf();

    $action  = (string) ($_POST['action'] ?? '');
    $section = (string) ($_POST['section'] ?? '');

    if ($action === 'migrate') {
        try {
            $applied = migrate();
            $notice  = $applied === []
                ? 'Storage was already set up.'
                : 'Set up content storage (' . implode(', ', $applied) . ').';
        } catch (Throwable $e) {
            $error = 'Could not set up storage: ' . $e->getMessage();
        }
    } elseif (!isset($schema[$page]['sections'][$section])) {
        $error = 'That section does not exist.';
    } elseif ($action === 'reset') {
        content_reset($page, $section);
        audit_log('content_reset', 'content', 'section', null, null,
            ['page' => $page, 'section' => $section], null, (int) $me['id'], (string) $me['name']);
        $notice = 'Put back the wording the site ships with.';
    } elseif ($action === 'save') {
        $fields = $schema[$page]['sections'][$section]['fields'];
        $data   = content_from_input($fields, (array) ($_POST['f'] ?? []));
        try {
            content_save($page, $section, $data, (int) $me['id']);
            audit_log('content_saved', 'content', 'section', null, null,
                ['page' => $page, 'section' => $section], null, (int) $me['id'], (string) $me['name']);
            $notice = 'Saved. It appears on the site after the next publish.';
        } catch (Throwable $e) {
            $error = 'Could not save: ' . $e->getMessage();
        }
    }
}

$ready = content_storage_ready();

/** Renders one field, or a group of them for a repeater row. */
function field_input(string $name, array $spec, mixed $value): void
{
    $id = 'f_' . preg_replace('/[^a-z0-9]+/i', '_', $name);

    echo '<label class="c-label" for="' . e($id) . '">' . e($spec['label']) . '</label>';

    if ($spec['type'] === 'textarea') {
        echo '<textarea class="c-input" id="' . e($id) . '" name="' . e($name) . '" rows="3">'
           . e((string) $value) . '</textarea>';
        return;
    }

    if ($spec['type'] === 'list') {
        $lines = is_array($value) ? implode("\n", $value) : (string) $value;
        echo '<textarea class="c-input" id="' . e($id) . '" name="' . e($name) . '" rows="4"'
           . ' placeholder="One per line">' . e($lines) . '</textarea>';
        echo '<p class="c-hint">One per line.</p>';
        return;
    }

    echo '<input class="c-input" type="text" id="' . e($id) . '" name="' . e($name) . '"'
       . ' value="' . e((string) $value) . '">';
}
?>
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Website content — NiteSha Cars</title>
  <meta name="robots" content="noindex, nofollow" />
  <link rel="icon" href="data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 100 100%22><text y=%22.9em%22 font-size=%2290%22>🔐</text></svg>" />
  <link rel="stylesheet" href="admin.css" />
  <style>
    .c-wrap { max-width: 56rem; margin: 0 auto; padding: 1.5rem 1rem 4rem; }
    .c-top { display: flex; flex-wrap: wrap; gap: 1rem; align-items: baseline; justify-content: space-between; margin-bottom: 1.25rem; }
    .c-sec { border: 1px solid #dfe3ec; border-radius: 12px; background: #fff; padding: 1.25rem; margin-bottom: 1.25rem; }
    .c-sec h2 { margin: 0 0 .25rem; font-size: 1.05rem; }
    .c-note { color: #5a6072; font-size: .87rem; margin: 0 0 1rem; }
    .c-label { display: block; margin: .9rem 0 .3rem; font-weight: 600; font-size: .85rem; }
    .c-input { width: 100%; padding: .5rem .6rem; border: 1px solid #c9cbd6; border-radius: 7px; font: inherit; font-size: .92rem; }
    .c-hint { color: #5a6072; font-size: .8rem; margin: .3rem 0 0; }
    .c-row { border-left: 3px solid #e6e8f0; padding-left: .9rem; margin: 1rem 0; }
    .c-row-n { font-size: .78rem; font-weight: 700; letter-spacing: .08em; text-transform: uppercase; color: #8a8fa3; }
    .c-actions { display: flex; flex-wrap: wrap; gap: .6rem; margin-top: 1.1rem; }
    .c-flag { display: inline-block; font-size: .72rem; font-weight: 700; text-transform: uppercase; letter-spacing: .06em; padding: .15rem .5rem; border-radius: 99px; background: #eef1f8; color: #5a6072; }
    .c-msg { padding: .7rem .9rem; border-radius: 8px; margin-bottom: 1rem; }
    .c-ok { background: #eaf7ee; border-left: 3px solid #1e8e3e; }
    .c-bad { background: #fdeaea; border-left: 3px solid #c0392b; }
  </style>
</head>
<body>
<div class="c-wrap">

  <div class="c-top">
    <div>
      <h1 style="margin:0;font-size:1.3rem">Website content</h1>
      <p class="c-note" style="margin:.3rem 0 0">
        The words on <strong><?= e($schema[$page]['label']) ?></strong>.
        Edits are saved here and appear on the live site at the next publish.
      </p>
    </div>
    <a class="btn btn-ghost btn-sm" href="dashboard.php">Back to dashboard</a>
  </div>

  <?php if ($notice !== null): ?>
    <div class="c-msg c-ok"><?= e($notice) ?></div>
  <?php endif; ?>
  <?php if ($error !== null): ?>
    <div class="c-msg c-bad"><?= e($error) ?></div>
  <?php endif; ?>

  <?php if (!$ready): ?>
    <div class="c-msg c-bad">
      <p style="margin:0 0 .6rem"><strong>Content storage is not set up yet.</strong></p>
      <p style="margin:0 0 .8rem">
        The table that holds your edits has not been created. The installer makes it,
        but it refuses to run once an account exists — so it has to be done from here.
        Until then the site shows the wording it ships with, and the form below is
        read-only.
      </p>
      <form method="post">
        <?= csrf_field() ?>
        <input type="hidden" name="action" value="migrate">
        <button class="btn btn-primary btn-sm" type="submit">Set up content storage</button>
      </form>
    </div>
  <?php endif; ?>

  <?php foreach ($schema[$page]['sections'] as $key => $spec):
        $data       = content_section($page, $key);
        $overridden = $ready && content_is_overridden($page, $key); ?>

    <form class="c-sec" method="post">
      <?= csrf_field() ?>
      <input type="hidden" name="section" value="<?= e($key) ?>">

      <h2>
        <?= e($spec['label']) ?>
        <?php if ($overridden): ?><span class="c-flag">edited</span><?php endif; ?>
      </h2>
      <?php if (isset($spec['note'])): ?>
        <p class="c-note"><?= e($spec['note']) ?></p>
      <?php endif; ?>

      <?php foreach ($spec['fields'] as $fkey => $fspec): ?>
        <?php if ($fspec['type'] === 'repeater'):
              $rows = $data[$fkey] ?? [];
              // One blank row on the end is how something gets added without
              // any JavaScript. It is dropped on save if left untouched.
              $rows[] = []; ?>
          <p class="c-label" style="margin-top:1.4rem"><?= e($fspec['label']) ?></p>
          <?php foreach ($rows as $i => $row): ?>
            <div class="c-row">
              <p class="c-row-n"><?= $i + 1 === count($rows) ? 'Add another' : 'Item ' . ($i + 1) ?></p>
              <?php foreach ($fspec['fields'] as $rkey => $rspec): ?>
                <?php field_input("f[{$fkey}][{$i}][{$rkey}]", $rspec, $row[$rkey] ?? ''); ?>
              <?php endforeach; ?>
              <?php if ($i + 1 !== count($rows)): ?>
                <p class="c-hint">Clear every box in an item to remove it.</p>
              <?php endif; ?>
            </div>
          <?php endforeach; ?>
        <?php else: ?>
          <?php field_input("f[{$fkey}]", $fspec, $data[$fkey] ?? ''); ?>
        <?php endif; ?>
      <?php endforeach; ?>

      <div class="c-actions">
        <button class="btn btn-primary btn-sm" type="submit" name="action" value="save"
          <?= $ready ? '' : 'disabled' ?>>Save this section</button>
        <?php if ($overridden): ?>
          <button class="btn btn-ghost btn-sm" type="submit" name="action" value="reset"
            onclick="return confirm('Put back the wording the site ships with? Your edits to this section are lost.')">
            Reset to original
          </button>
        <?php endif; ?>
      </div>
    </form>

  <?php endforeach; ?>
</div>
</body>
</html>
