<?php
declare(strict_types=1);

require_once __DIR__ . '/src/site-images.php';

/**
 * Streams one of the site's own images.
 *
 * Public, like the car photographs: these are the logo and the mark on every
 * page of the website. What is checked is that the name is one this code
 * generates, matching the exact shape and nothing else -- a request for
 * ../../nitesha-config/config.php has to come back a 404.
 */

$name = (string) ($_GET['f'] ?? '');

if (!preg_match('/^b[a-z][a-z-]*-[0-9a-f]{16}\.(jpg|png|webp|avif)$/', $name, $m)) {
    http_response_code(404);
    header('Content-Type: text/plain; charset=utf-8');
    exit("Not found\n");
}

$path = site_image_dir() . '/' . $name;
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
