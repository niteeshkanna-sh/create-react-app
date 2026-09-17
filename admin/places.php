<?php
declare(strict_types=1);

require_once __DIR__ . '/src/csrf.php';
require_once __DIR__ . '/src/assets.php';
require_once __DIR__ . '/src/migrate.php';
require_once __DIR__ . '/src/places.php';

/**
 * Places worth driving to.
 *
 * A page rather than a tab on the dashboard, for the same reason Website
 * content is one: it is edited occasionally and at length, not glanced at
 * while running the day. The dashboard is for today's bookings.
 */

$me = require_login();

$migrationError = migrate_if_needed();

header('X-Frame-Options: DENY');
header('X-Content-Type-Options: nosniff');
header('Referrer-Policy: same-origin');

$notice = null;
$error  = $migrationError === null ? null
    : 'The database could not be brought up to date: ' . $migrationError;

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    require_csrf();

    $action = (string) ($_POST['action'] ?? '');

    if ($action === 'delete') {
        place_delete((int) ($_POST['id'] ?? 0), (int) $me['id']);
        $notice = 'Removed.';
    } elseif ($action === 'save') {
        $problem = place_save($_POST, $_FILES['photo'] ?? null, (int) $me['id']);
        if ($problem !== null) {
            $error = $problem;
        } else {
            $notice = 'Saved. It appears on the site within a minute.';
        }
    }
}

$places = places_all(true);
$editing = null;
if (isset($_GET['edit'])) {
    foreach ($places as $row) {
        if ((int) $row['id'] === (int) $_GET['edit']) {
            $editing = $row;
        }
    }
}
?>
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Places to visit — NiteSha Cars Admin</title>
  <meta name="robots" content="noindex, nofollow">
  <link rel="stylesheet" href="<?= asset('admin.css') ?>">
</head>
<body>
<div class="c-wrap">

  <div class="c-top">
    <div>
      <h1 style="margin:0;font-size:1.3rem">Places to visit</h1>
      <p class="c-note" style="margin:.3rem 0 0">
        Shown on the home page and on <strong>niteshacars.in/places</strong>. These are
        what people search for before they book a car, so it is worth keeping current.
      </p>
    </div>
    <a class="btn btn-ghost btn-sm" href="dashboard.php">Back to dashboard</a>
  </div>

  <?php if ($notice !== null): ?><div class="c-msg c-ok"><?= e($notice) ?></div><?php endif; ?>
  <?php if ($error !== null): ?><div class="c-msg c-bad"><?= e($error) ?></div><?php endif; ?>

  <form class="c-sec" method="post" enctype="multipart/form-data">
    <?= csrf_field() ?>
    <input type="hidden" name="action" value="save">
    <input type="hidden" name="id" value="<?= e((string) ($editing['id'] ?? '')) ?>">

    <h2><?= $editing === null ? 'Add a place' : 'Edit ' . e((string) $editing['name']) ?></h2>

    <div class="modal-row">
      <div class="field-group">
        <label for="placeName">Name</label>
        <input type="text" id="placeName" name="name" required maxlength="120"
               value="<?= e((string) ($editing['name'] ?? '')) ?>"
               placeholder="e.g. Vattakottai Fort">
      </div>
      <div class="field-group">
        <label for="placeCategory">Group</label>
        <input type="text" id="placeCategory" name="category" maxlength="60"
               value="<?= e((string) ($editing['category'] ?? '')) ?>"
               placeholder="e.g. Temples &amp; heritage">
      </div>
    </div>

    <div class="field-group">
      <label for="placeBlurb">One or two sentences</label>
      <textarea id="placeBlurb" name="blurb" rows="2" maxlength="400"
                placeholder="What someone would want to know before driving there."><?= e((string) ($editing['blurb'] ?? '')) ?></textarea>
    </div>

    <div class="field-group">
      <label for="placeMap">Map link</label>
      <input type="url" id="placeMap" name="map_url" maxlength="500"
             value="<?= e((string) ($editing['map_url'] ?? '')) ?>"
             placeholder="https://www.google.com/maps/...">
      <p class="field-note">Open the place in Google Maps, press Share, and paste the link.
      Visitors get a Directions button that opens it on their phone.</p>
    </div>

    <div class="modal-row">
      <div class="field-group">
        <label for="placeOrder">Order</label>
        <input type="number" id="placeOrder" name="sort_order" min="0" max="9999"
               value="<?= e((string) ($editing['sort_order'] ?? 0)) ?>">
        <p class="field-note">Lowest first.</p>
      </div>
      <div class="field-group">
        <label for="placePublished">Shown on the site</label>
        <label class="finance-toggle">
          <input type="checkbox" id="placePublished" name="published"
                 <?= ($editing === null || (int) $editing['published'] === 1) ? 'checked' : '' ?>>
          Yes
        </label>
      </div>
    </div>

    <div class="field-group">
      <label for="placePhoto">Photograph</label>
      <?php if (!empty($editing['photo_file'])): ?>
        <div class="photo-preview">
          <img src="<?= e((string) place_photo_url((string) $editing['photo_file'])) ?>" alt="">
        </div>
      <?php endif; ?>
      <input type="file" id="placePhoto" name="photo"
             accept="image/jpeg,image/png,image/webp,image/avif">
      <p class="field-note">Landscape works best &mdash; it is shown in a wide card. Leave empty
      to keep the picture already there. Up to 6&nbsp;MB.</p>
    </div>

    <div class="modal-actions">
      <?php if ($editing !== null): ?>
        <a class="btn btn-ghost" href="places.php">Cancel</a>
      <?php endif; ?>
      <button class="btn btn-primary" type="submit">
        <?= $editing === null ? 'Add place' : 'Save changes' ?>
      </button>
    </div>
  </form>

  <div class="c-sec">
    <h2><?= count($places) ?> place<?= count($places) === 1 ? '' : 's' ?></h2>

    <?php if ($places === []): ?>
      <div class="empty-state">Nothing yet. Add the first one above.</div>
    <?php else: ?>
      <div class="place-list">
        <?php foreach ($places as $row): ?>
          <div class="place-row">
            <div class="place-thumb">
              <?php if (!empty($row['photo_file'])): ?>
                <img src="<?= e((string) place_photo_url((string) $row['photo_file'])) ?>" alt="" loading="lazy">
              <?php else: ?>
                <span class="brand-slot-empty">No photo</span>
              <?php endif; ?>
            </div>
            <div class="place-body">
              <strong><?= e((string) $row['name']) ?></strong>
              <?php if ((int) $row['published'] !== 1): ?>
                <span class="c-flag">hidden</span>
              <?php endif; ?>
              <p class="c-note" style="margin:.2rem 0 0"><?= e((string) $row['blurb']) ?></p>
              <p class="c-note" style="margin:.2rem 0 0">
                <?= e((string) $row['category']) ?> &middot; order <?= (int) $row['sort_order'] ?>
                <?= $row['map_url'] !== '' ? ' &middot; has a map link' : ' &middot; no map link' ?>
              </p>
            </div>
            <div class="place-actions">
              <a class="btn btn-outline btn-sm" href="places.php?edit=<?= (int) $row['id'] ?>">Edit</a>
              <form method="post" onsubmit="return confirm('Remove this place?')">
                <?= csrf_field() ?>
                <input type="hidden" name="action" value="delete">
                <input type="hidden" name="id" value="<?= (int) $row['id'] ?>">
                <button class="btn btn-danger btn-sm" type="submit">Delete</button>
              </form>
            </div>
          </div>
        <?php endforeach; ?>
      </div>
    <?php endif; ?>
  </div>

</div>
</body>
</html>
