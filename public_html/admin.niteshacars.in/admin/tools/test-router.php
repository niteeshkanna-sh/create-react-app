<?php
declare(strict_types=1);

/**
 * Router for the test site's PHP built-in server.
 *
 * On the server, Apache denies config.php, src/, sql/ and tools/ over the web.
 * The built-in server has no .htaccess, and would happily hand out the
 * database password to anyone who asked for /config.php. Testing against a
 * copy that is more permissive than production is how a hole gets missed, so
 * the same paths are refused here.
 *
 * Used by tools/test-site.sh; not part of what is deployed.
 */

$path = parse_url($_SERVER['REQUEST_URI'] ?? '/', PHP_URL_PATH) ?: '/';
$path = '/' . ltrim((string) $path, '/');

// The enquiry form is a test fixture that has to be fetchable even though it
// lives in tools/, because the point of it is a browser posting from a page.
$allowed = ['/tools/test-enquiry-form.html'];

$denied = $path === '/config.php'
    || str_starts_with($path, '/src/')
    || str_starts_with($path, '/sql/')
    || (str_starts_with($path, '/tools/') && !in_array($path, $allowed, true));

if ($denied) {
    http_response_code(403);
    header('Content-Type: text/plain');
    echo "Forbidden — the live server denies this path too.\n";
    return true;
}

// Anything else: let the built-in server serve the file, or fall through to
// the directory's index.php.
return false;
