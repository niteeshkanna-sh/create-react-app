<?php
declare(strict_types=1);

require_once __DIR__ . '/../src/db.php';
require_once __DIR__ . '/../src/http.php';
require_once __DIR__ . '/../src/content.php';

/**
 * Page content, for the public website's build.
 *
 * Read by my-app's build rather than by a visitor's browser, and that is the
 * whole point. Content fetched at page load would sit behind JavaScript, and
 * the site's ranking rests on the prerendered HTML actually containing the
 * words. Baking it in at build time keeps the copy in the HTML, keeps the
 * site fast, and keeps it up when this server is not.
 *
 * Returns defaults with any admin edits laid over them, so the caller gets a
 * complete document either way and never has to merge anything itself.
 *
 * Nothing here is secret -- it is the text of a public web page -- but it is
 * still read-only, GET-only and behind the same origin allowlist as the other
 * public endpoints.
 */

// ---- CORS: the same allowlist the other public endpoints use ----
$allowed = config('public_site_origin') ?? '';
$allowed = array_values(array_filter(array_map('strval', is_array($allowed) ? $allowed : [$allowed])));
$origin  = $_SERVER['HTTP_ORIGIN'] ?? '';

if ($origin !== '' && in_array($origin, $allowed, true)) {
    header('Access-Control-Allow-Origin: ' . $origin);
    header('Vary: Origin');
    header('Access-Control-Allow-Headers: Content-Type');
    header('Access-Control-Allow-Methods: GET, OPTIONS');
    header('Access-Control-Max-Age: 86400');
}

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(204);
    exit;
}

if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    json_error('Only GET is supported here.', 405);
}

// Shorter than the fleet's cache. A build runs rarely, and when someone has
// just pressed Publish they should not be served a stale copy of their own
// edit.
header('Cache-Control: public, max-age=60');

json_out(['ok' => true, 'content' => content_all()]);
