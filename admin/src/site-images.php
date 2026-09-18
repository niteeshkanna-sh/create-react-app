<?php
declare(strict_types=1);

require_once __DIR__ . '/db.php';
require_once __DIR__ . '/vehicle-photos.php';

/**
 * The site's own images: the logo badge, and the mark beside it.
 *
 * Same arrangement as vehicle photographs, and for the same reason -- the file
 * is written above the document root so a deploy cannot erase it, and read
 * back through a small PHP script because Apache cannot reach it there.
 * vehicle_photo_check() does the validating, so there is one answer to "is
 * this an image" rather than two that can disagree.
 *
 * The slots are fixed. Each one is a specific place in the page, and a name
 * that matches none of them would be a file nobody ever displays.
 */

const SITE_IMAGE_SLOTS = [
    // The brand marks.
    'logo'          => 'Logo badge',
    'snake'         => 'Mark beside the logo',

    // The wide photograph across the top of each page. The names match what
    // the site asks for, so adding one here and adding one there is the same
    // decision rather than two that can disagree.
    'cars-hero'     => 'Cars page banner',
    'bikes-hero'    => 'Bikes page banner',
    'wedding-hero'  => 'Wedding cars banner',
    'tourist-hero'  => 'Tourist vehicles banner',
    'monthly-hero'  => 'Monthly rental banner',
    'nri-hero'      => 'NRI page banner',
    'tariff-hero'   => 'Tariff page banner',
    'about-hero'    => 'About page banner',
    'contact-hero'  => 'Contact page banner',
    'blog-hero'     => 'Blog page banner',
    'places-hero'   => 'Places to visit banner',
    'services-hero' => 'What we hire banner',

    // The home page, top to bottom.
    'home-hero'     => 'Home page background',
    'why-us-1'      => 'Why hire from us — large photo',
    'why-us-2'      => 'Why hire from us — small photo',
    'open-road'     => 'Open road band',

    // The panel on the home page listing the towns served.
    'coast'         => 'Areas we serve panel',

    // The six cards under "What we hire", on the home page and on /services.
    // Named after the page each one links to, which is what the site asks for.
    'cars'             => 'Card: self drive cars',
    'bikes'            => 'Card: bike rental',
    'wedding-cars'     => 'Card: wedding cars',
    'tourist-vehicles' => 'Card: tourist vehicles',
    'monthly'          => 'Card: monthly rental',
    'nri'              => 'Card: for NRI visitors',

    // The three "How it works" steps.
    'step-1'        => 'How it works: step 1',
    'step-2'        => 'How it works: step 2',
    'step-3'        => 'How it works: step 3',
];

/**
 * The shape each slot is cropped to, and the size it is saved at.
 *
 * One crop for everything would be wrong in both directions: a logo squeezed
 * into a banner's letterbox loses its top and bottom, and a banner squared off
 * loses its sides. The panel frames each upload to the shape the site actually
 * lays it out in, so what is chosen here is what appears there.
 *
 * Anything not named falls back to the card shape, which is the commonest.
 */
const SITE_IMAGE_SHAPES = [
    // The marks sit in a square plate.
    'logo'  => [1, 1, 512, 512],
    'snake' => [1, 1, 512, 512],

    // The wide band across the top of a page.
    'cars-hero'     => [16, 5, 1600, 500],
    'bikes-hero'    => [16, 5, 1600, 500],
    'wedding-hero'  => [16, 5, 1600, 500],
    'tourist-hero'  => [16, 5, 1600, 500],
    'monthly-hero'  => [16, 5, 1600, 500],
    'nri-hero'      => [16, 5, 1600, 500],
    'tariff-hero'   => [16, 5, 1600, 500],
    'about-hero'    => [16, 5, 1600, 500],
    'contact-hero'  => [16, 5, 1600, 500],
    'blog-hero'     => [16, 5, 1600, 500],
    'places-hero'   => [16, 5, 1600, 500],
    'services-hero' => [16, 5, 1600, 500],

    // Full-bleed sections, which are seen at whatever the window is.
    'home-hero' => [16, 9, 1600, 900],
    'open-road' => [16, 9, 1600, 900],

    // The photographs beside "Why hire from us" are laid out 4:3.
    'why-us-1' => [4, 3, 1200, 900],
    'why-us-2' => [4, 3, 1200, 900],
];

/** [width ratio, height ratio, saved width, saved height] for one slot. */
function site_image_shape(string $slot): array
{
    // 16:10 is the card shape -- the six services, the three steps and the
    // areas panel all use it, which is most of the list.
    return SITE_IMAGE_SHAPES[$slot] ?? [16, 10, 1200, 750];
}

function site_image_dir(): string
{
    $base = (string) (config('storage_path') ?? (dirname(__DIR__, 3) . '/nitesha-storage'));
    $dir  = rtrim($base, '/') . '/brand';

    if (!is_dir($dir)) {
        @mkdir($dir, 0750, true);
    }
    return $dir;
}

/** The stored filename for each slot that has one. */
function site_images(): array
{
    if (!table_has_column('site_images', 'file')) {
        return [];
    }
    try {
        $out = [];
        foreach (fetch_all('SELECT slot, file FROM site_images') as $row) {
            if (isset(SITE_IMAGE_SLOTS[$row['slot']])) {
                $out[(string) $row['slot']] = (string) $row['file'];
            }
        }
        return $out;
    } catch (Throwable $e) {
        error_log('site_images read failed: ' . $e->getMessage());
        return [];
    }
}

/** The public URL for a stored site image, or null. */
function site_image_url(?string $name): ?string
{
    if ($name === null || $name === '') {
        return null;
    }
    // The name carries random bytes chosen at upload, so a new image is a new
    // URL and the response can be cached hard.
    return 'brand.php?f=' . rawurlencode($name);
}

/**
 * Stores an upload against a slot, replacing whatever was there.
 *
 * Returns null on success, or a sentence explaining the refusal.
 */
function site_image_save(string $slot, array $file, int $userId): ?string
{
    if (!isset(SITE_IMAGE_SLOTS[$slot])) {
        return 'That is not one of the site images.';
    }

    [$extension, $problem] = vehicle_photo_check($file);
    if ($problem !== null) {
        return $problem;
    }

    $previous = site_images()[$slot] ?? null;

    // Our name, never the uploader's: a filename from a browser can contain
    // path separators, and writing outside this directory is the one thing
    // that must not be possible.
    // Hyphens and digits kept: stripping hyphens turned cars-hero into
    // carshero, and stripping digits turned step-1, step-2 and step-3 into
    // three files all called step-. Still unique, and it tells a reader
    // nothing. brand.php's pattern allows both.
    $name = sprintf('b%s-%s.%s', preg_replace('/[^a-z0-9-]/', '', $slot),
        bin2hex(random_bytes(8)), $extension);

    if (!move_uploaded_file((string) $file['tmp_name'], site_image_dir() . '/' . $name)) {
        return 'The image could not be saved on the server.';
    }
    @chmod(site_image_dir() . '/' . $name, 0640);

    query(
        'INSERT INTO site_images (slot, file, updated_by) VALUES (?,?,?)
         ON DUPLICATE KEY UPDATE file = VALUES(file), updated_by = VALUES(updated_by)',
        [$slot, $name, $userId]
    );

    // Only once the row points at the new file, so a failed write never leaves
    // the site pointing at something that has just been deleted.
    site_image_delete_file($previous);

    return null;
}

/** Clears a slot and removes its file. */
function site_image_clear(string $slot): void
{
    if (!isset(SITE_IMAGE_SLOTS[$slot])) {
        return;
    }
    $previous = site_images()[$slot] ?? null;
    query('DELETE FROM site_images WHERE slot = ?', [$slot]);
    site_image_delete_file($previous);
}

function site_image_delete_file(?string $name): void
{
    if ($name === null || $name === '' || str_contains($name, '/') || str_contains($name, '\\')) {
        return;
    }
    @unlink(site_image_dir() . '/' . $name);
}
