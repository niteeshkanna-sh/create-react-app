<?php
declare(strict_types=1);

require_once __DIR__ . '/src/csrf.php';
require_once __DIR__ . '/src/assets.php';
require_once __DIR__ . '/src/site-images.php';
require_once __DIR__ . '/src/content.php';
require_once __DIR__ . '/src/migrate.php';
require_once __DIR__ . '/src/audit.php';
require_once __DIR__ . '/src/shell.php';

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

    if ($action === 'brand-upload' || $action === 'brand-clear') {
        // Handled before the section check below, which would otherwise reject
        // these for not naming a section -- they do not have one.
        $slot = (string) ($_POST['slot'] ?? '');

        if (!isset(SITE_IMAGE_SLOTS[$slot])) {
            $error = 'That is not one of the site images.';
        } elseif ($action === 'brand-clear') {
            site_image_clear($slot);
            audit_log('site_image_cleared', 'content', 'site_image', null, null,
                ['slot' => $slot], null, (int) $me['id'], (string) $me['name']);
            $notice = SITE_IMAGE_SLOTS[$slot] . ' removed.';
        } else {
            $problem = site_image_save($slot, $_FILES['image'] ?? [], (int) $me['id']);
            if ($problem !== null) {
                $error = $problem;
            } else {
                audit_log('site_image_changed', 'content', 'site_image', null, null,
                    ['slot' => $slot], null, (int) $me['id'], (string) $me['name']);
                $notice = SITE_IMAGE_SLOTS[$slot] . ' updated. It appears on the site within a minute.';
            }
        }
    } elseif ($action === 'migrate') {
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

admin_shell_open($me, 'content.php', 'Website content');
?>

  <div class="c-top">
    <div>
      <p class="c-note">
        The words on <strong><?= e($schema[$page]['label']) ?></strong>.
        Edits are saved here and appear on the live site at the next publish.
      </p>
    </div>
    <a class="btn btn-outline btn-sm" href="/" target="_blank" rel="noopener">See the site &rarr;</a>
  </div>

  <?php if ($notice !== null): ?>
    <div class="c-msg c-ok"><?= e($notice) ?></div>
  <?php endif; ?>
  <?php if ($error !== null): ?>
    <div class="c-msg c-bad"><?= e($error) ?></div>
  <?php endif; ?>

  <?php if (!$ready): ?>
    <div class="c-msg c-bad">
      <p class="c-msg-lead"><strong>Content storage is not set up yet.</strong></p>
      <p class="c-msg-body">
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

  <?php $brand = site_images(); ?>
  <details class="c-sec c-fold">
    <summary class="c-sum">
      <span class="c-sum-name">Logo, mark and page banners</span>
      <span class="c-flag"><?= count($brand) ?> of <?= count(SITE_IMAGE_SLOTS) ?> uploaded</span>
      <svg class="c-sum-chev" width="16" height="16" viewBox="0 0 24 24" fill="none"
           stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"
           aria-hidden="true"><path d="M6 9l6 6 6-6"/></svg>
    </summary>
    <div class="c-fold-body">
    <p class="c-note">
      The badge in the header, and the mark beside it. Nothing is drawn in their
      place any more, so the header shows the name alone until one is uploaded.
      PNG with a transparent background looks best for the badge; the mark sits
      on the dark header, so light artwork reads better than dark. Up to
      6&nbsp;MB.
    </p>

    <div class="brand-slots">
      <?php foreach (SITE_IMAGE_SLOTS as $slot => $label): ?>
        <div class="brand-slot">
          <span class="brand-slot-label"><?= e($label) ?></span>
          <div class="brand-slot-preview">
            <?php if (isset($brand[$slot])): ?>
              <img src="<?= e((string) site_image_url($brand[$slot])) ?>" alt="">
            <?php else: ?>
              <span class="brand-slot-empty">Drawn</span>
            <?php endif; ?>
          </div>
          <form method="post" enctype="multipart/form-data">
            <?= csrf_field() ?>
            <input type="hidden" name="action" value="brand-upload">
            <input type="hidden" name="slot" value="<?= e($slot) ?>">
            <input type="file" name="image" accept="image/jpeg,image/png,image/webp,image/avif" required>
            <button class="btn btn-primary btn-sm" type="submit">Upload</button>
          </form>
          <?php if (isset($brand[$slot])): ?>
            <form method="post">
              <?= csrf_field() ?>
              <input type="hidden" name="action" value="brand-clear">
              <input type="hidden" name="slot" value="<?= e($slot) ?>">
              <button class="btn btn-ghost btn-sm" type="submit">Remove</button>
            </form>
          <?php endif; ?>
        </div>
      <?php endforeach; ?>
    </div>
    </div>
  </details>

  <?php foreach ($schema[$page]['sections'] as $key => $spec):
        $data       = content_section($page, $key);
        $overridden = $ready && content_is_overridden($page, $key); ?>

    <form method="post">
      <?= csrf_field() ?>
      <input type="hidden" name="section" value="<?= e($key) ?>">

      <!-- Folded shut by default. Open, this page was a single scroll roughly
           fifteen thousand pixels long, and finding one heading in it meant
           dragging past every other. -->
      <details class="c-sec c-fold">
        <summary class="c-sum">
          <span class="c-sum-name"><?= e($spec['label']) ?></span>
          <?php if ($overridden): ?><span class="c-flag">edited</span><?php endif; ?>
          <svg class="c-sum-chev" width="16" height="16" viewBox="0 0 24 24" fill="none"
               stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"
               aria-hidden="true"><path d="M6 9l6 6 6-6"/></svg>
        </summary>

        <div class="c-fold-body">
      <?php if (isset($spec['note'])): ?>
        <p class="c-note"><?= e($spec['note']) ?></p>
      <?php endif; ?>

      <?php foreach ($spec['fields'] as $fkey => $fspec): ?>
        <?php if ($fspec['type'] === 'repeater'):
              $rows = $data[$fkey] ?? [];
              // One blank row on the end is how something gets added without
              // any JavaScript. It is dropped on save if left untouched.
              $rows[] = []; ?>
          <p class="c-label c-label-group"><?= e($fspec['label']) ?></p>
          <?php foreach ($rows as $i => $row): ?>
            <div class="c-row">
              <div class="c-row-top">
                <p class="c-row-n"><?= $i + 1 === count($rows) ? 'Add another' : 'Item ' . ($i + 1) ?></p>
                <?php if ($i + 1 !== count($rows)): ?>
                  <!-- Empties the boxes rather than posting a delete of its own.
                       A section is saved whole and an item with nothing in it is
                       dropped, so clearing IS the delete -- this is the button
                       for what the hint used to ask people to do by hand. -->
                  <button type="button" class="btn btn-danger btn-sm btn-icon c-row-del"
                          title="Remove this item" aria-label="Remove item <?= $i + 1 ?>">
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                         stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                      <path d="M4 7h16"/><path d="M10 11v6"/><path d="M14 11v6"/>
                      <path d="M6 7l1 13a1 1 0 0 0 1 1h8a1 1 0 0 0 1-1l1-13"/>
                      <path d="M9 7V5a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/>
                    </svg>
                  </button>
                <?php endif; ?>
              </div>
              <?php foreach ($fspec['fields'] as $rkey => $rspec): ?>
                <?php field_input("f[{$fkey}][{$i}][{$rkey}]", $rspec, $row[$rkey] ?? ''); ?>
              <?php endforeach; ?>
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
        </div>
      </details>
    </form>

  <?php endforeach; ?>
<script src="<?= asset('content.js') ?>"></script>
<?php admin_shell_close(); ?>
</body>
</html>
