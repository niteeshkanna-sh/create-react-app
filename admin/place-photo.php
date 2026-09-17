<?php
declare(strict_types=1);

require_once __DIR__ . '/src/places.php';

/**
 * Streams a place's photograph. Public, like the car photographs.
 *
 * Only names of the shape this code generates are answered, which is a better
 * rule than trying to enumerate the ways a path can escape a directory.
 */

$name = (string) ($_GET['f'] ?? '');

if (!preg_match('/^p\d+-[0-9a-f]{16}\.(jpg|png|webp|avif)$/', $name, $m)) {
    http_response_code(404);
    header('Content-Type: text/plain; charset=utf-8');
    exit("Not found\n");
}

$path = place_photo_dir() . '/' . $name;
if (!is_file($path)) {
    http_response_code(404);
    header('Content-Type: text/plain; charset=utf-8');
    exit("Not found\n");
}

header('Content-Type: ' . VEHICLE_PHOTO_MIME[$m[1]]);
header('Content-Length: ' . (string) filesize($path));
header('Cache-Control: public, max-age=31536000, immutable');
header('X-Content-Type-Options: nosniff');
header('Content-Disposition: inline');

readfile($path);
