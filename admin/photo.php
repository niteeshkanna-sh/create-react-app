<?php
declare(strict_types=1);

require_once __DIR__ . '/src/vehicle-photos.php';

/**
 * Streams a vehicle photograph.
 *
 * The files sit above the document root so a deploy cannot erase them, which
 * also means Apache cannot serve them directly. This reads one and sends it.
 *
 * No session and no permission check: these are pictures of cars for hire,
 * shown on the public website. What it does check is that the name it was
 * given is one of ours and names a file in exactly one directory -- a request
 * for ../../nitesha-config/config.php has to come back as a 404 and nothing
 * else.
 */

$name = (string) ($_GET['f'] ?? '');

// The only shape this ever generates: v<id>-<16 hex>.<ext>. Anything else is
// someone trying something, and matching the known shape is a far better rule
// than trying to spot the ways a path can escape a directory.
if (!preg_match('/^v\d+-[0-9a-f]{16}\.(jpg|png|webp|avif)$/', $name, $m)) {
    http_response_code(404);
    header('Content-Type: text/plain; charset=utf-8');
    exit("Not found\n");
}

$path = vehicle_photo_dir() . '/' . $name;

if (!is_file($path)) {
    http_response_code(404);
    header('Content-Type: text/plain; charset=utf-8');
    exit("Not found\n");
}

// The name contains random bytes chosen when the photograph was uploaded, so a
// different picture is always a different URL. That makes it safe to cache for
// a long time, which matters: this path costs a PHP process per image, and the
// fleet page asks for one per car.
header('Content-Type: ' . VEHICLE_PHOTO_MIME[$m[1]]);
header('Content-Length: ' . (string) filesize($path));
header('Cache-Control: public, max-age=31536000, immutable');
header('X-Content-Type-Options: nosniff');

// Nothing here is HTML, and a browser that decides otherwise about a file
// someone uploaded is the whole problem with serving uploads.
header('Content-Disposition: inline');

readfile($path);
