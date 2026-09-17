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

    // The panel on the home page listing the towns served.
    'coast'         => 'Areas we serve panel',
];

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
    // Hyphens kept: stripping them turned cars-hero into carshero, which is
    // still unique but tells a reader nothing. brand.php's pattern allows them.
    $name = sprintf('b%s-%s.%s', preg_replace('/[^a-z-]/', '', $slot),
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
