<?php
declare(strict_types=1);

/**
 * A smaller copy of a stored photograph, made once and kept.
 *
 * Nothing here has ever resized anything. An upload is written to disk exactly
 * as it arrived and streamed back at full size, which is how the home page came
 * to carry four megabytes of photographs. Measured on the live page: every
 * single image was between four and six times wider than the box it is drawn
 * into -- place photographs stored at 1280x720 and shown at about 210x160, a
 * 714KB PNG of a beach drawn 211 points across, car photographs at 1200x750
 * shown at 229.
 *
 * The site cannot fix that from the markup. There is one file per photograph
 * and no smaller one to ask for, so the browser downloads the big one whatever
 * srcset says. The fix belongs here, on the way out -- and here it also fixes
 * the photographs already uploaded, which re-encoding on upload would not.
 *
 * Deliberately not driven by a query parameter. One variant per file per cap
 * per format means the cache cannot be made to grow by asking for a thousand
 * widths.
 */

/** Where the resized copies live: beside the originals, above the document root. */
function image_cache_dir(): string
{
    $base = (string) (config('storage_path') ?? (dirname(__DIR__, 3) . '/nitesha-storage'));
    $dir  = rtrim($base, '/') . '/cache';

    if (!is_dir($dir)) {
        @mkdir($dir, 0750, true);
    }
    return $dir;
}

/**
 * The widest each kind of picture is ever drawn, doubled for a dense screen.
 *
 * Measured, not guessed -- and the measurement corrected two guesses worth
 * recording, because both would have made the site worse:
 *
 *   The page banners are stored at 1600 and drawn at 1440 on a desktop
 *   window. They are already narrower than a dense screen wants, so there is
 *   nothing to reclaim there and a cap below 1600 would soften the biggest
 *   picture on the page.
 *
 *   A place photograph looks small on the home page -- about 210 points --
 *   but the same file is drawn 409 across on /places/, which wants 818 on a
 *   two-times screen. Capping these at 600, as the home page alone suggested,
 *   would have blurred the gallery that shows them off.
 *
 * So each number below is twice the widest that kind of picture is drawn
 * anywhere on the site, rounded up a little:
 *
 *   car card      382 wide  ->  800
 *   place card    409 wide  ->  900
 *   page banner  1440 wide  -> 1600
 *
 * The site images are not one kind and do not share a number: a collage frame
 * is drawn 300 and a banner 1440 on the same page. Those come from the slot
 * each one fills, through site_image_cap().
 */
const IMAGE_CAP_CAR    = 800;
const IMAGE_CAP_PLACE  = 900;
const IMAGE_CAP_BANNER = 1600;

/** The fallback, wide enough that an unrecognised picture is never softened. */
const IMAGE_CAP_DEFAULT = IMAGE_CAP_BANNER;

/**
 * The widths a page may ask for, and nothing else.
 *
 * The caps above are the most a picture is ever drawn at anywhere on the
 * site, which is the right default but is wrong for the page in front of you:
 * the six service cards are drawn 612 across on /cars/ and 300 on the home
 * page, from the same file, so one number has to be the larger and the home
 * page carries four times the pixels it shows. A page that knows better says
 * so with ?w=, and the srcset in the markup lets the browser pick by its own
 * screen as well.
 *
 * A fixed list rather than any number, because the answer is written to disk:
 * an open parameter is an invitation to fill it one width at a time. Six
 * entries, roughly a stop apart, which is as fine as srcset can usefully pick
 * between anyway.
 */
const IMAGE_WIDTHS = [240, 400, 600, 800, 1200, 1600];

/** The width this request asked for, if it asked for one we offer. */
function image_requested_width(): ?int
{
    $raw = $_GET['w'] ?? null;
    if ($raw === null || is_array($raw)) {
        return null;
    }

    $asked = filter_var($raw, FILTER_VALIDATE_INT);

    return ($asked !== false && in_array($asked, IMAGE_WIDTHS, true)) ? $asked : null;
}

/** Pixels GD will agree to decode. Four bytes each, so this is about 160MB. */
const IMAGE_DECODE_MAX_PIXELS = 40000000;

/** Whether this request came from something that reads WebP. */
function image_accepts_webp(): bool
{
    return str_contains((string) ($_SERVER['HTTP_ACCEPT'] ?? ''), 'image/webp');
}

/**
 * Whether this request wants the picture exactly as it was stored.
 *
 * The panel's crop tool re-frames a picture that is already uploaded, and it
 * has to work from the pixels that were stored rather than from a copy sized
 * for the page the picture appears on. Re-framing the collage -- stored at
 * 1200 across, drawn at 300, so sent at 700 -- and zooming in would otherwise
 * stretch 700 pixels to fill the 700 it saves, and each pass would lose a
 * little more.
 *
 * Only ever honoured for someone signed in to the panel; see brand.php.
 */
function image_requested_full(): bool
{
    return ($_GET['full'] ?? '') === '1';
}

/**
 * A cached copy of $path no wider than $cap, or null to send the original.
 *
 * Null is not an error the caller has to handle: it means "stream what is on
 * disk", which is exactly what happened before this file existed. A host
 * without GD, an image GD cannot decode, a picture already small enough, a
 * re-encode that came out bigger and a disk that will not take the write all
 * end in the behaviour this panel has always had.
 *
 * Returns ['path' =>, 'mime' =>, 'negotiated' => bool]. negotiated is true
 * when the format was chosen from the request's Accept header, which is the
 * caller's cue to send Vary.
 */
function image_variant(string $path, string $mime, int $cap = IMAGE_CAP_DEFAULT): ?array
{
    if (!function_exists('imagecreatetruecolor') || !function_exists('imagecopyresampled')) {
        return null;
    }

    $size = @getimagesize($path);
    if ($size === false) {
        return null;
    }

    [$width, $height] = $size;
    if ($width <= 0 || $height <= 0 || $width * $height > IMAGE_DECODE_MAX_PIXELS) {
        return null;
    }

    $webp = function_exists('imagewebp');

    // What to write. A WebP source stays WebP: the browser that asked for it
    // already reads the format, so there is nothing to negotiate. A JPEG or
    // PNG becomes WebP only for a client that says it reads WebP, and
    // otherwise keeps its own format -- so resizing never costs anyone a
    // picture they cannot display.
    $negotiated = false;
    if ($mime === 'image/webp') {
        $out = $webp ? 'webp' : null;
    } elseif ($webp && image_accepts_webp()) {
        $out = 'webp';
        $negotiated = true;
    } elseif ($mime === 'image/jpeg' && function_exists('imagejpeg')) {
        $out = 'jpeg';
    } elseif ($mime === 'image/png' && function_exists('imagepng')) {
        $out = 'png';
    } else {
        $out = null;
    }

    if ($out === null) {
        return null;
    }

    $target = min($width, $cap);

    // Two reasons to do the work: the picture is wider than the page draws
    // it, or it is stored in a heavier format than the browser can read. So a
    // picture already narrow enough is still worth converting if it is a JPEG
    // or a PNG and the browser reads WebP -- a photograph stored as PNG is
    // several times the size of the same thing as WebP at any width.
    //
    // What is left is the case with nothing in it either way: already narrow
    // enough, and already in the format we would write. Re-encoding that
    // spends a lossy generation to save nothing.
    if ($target === $width && ($out !== 'webp' || $mime === 'image/webp')) {
        return null;
    }

    // Keyed in two parts: which file, then which version of it. A re-upload
    // under the same name changes the second part, so a stale copy is never
    // served -- and because the first part is unchanged, the copies made from
    // the version it replaced can be found and swept up. Without that the
    // cache would keep every variant of every picture ever uploaded.
    $whose = substr(hash('sha256', $path), 0, 24);
    $which = substr(hash('sha256', (string) @filemtime($path) . '|' . (string) @filesize($path)), 0, 12);
    $dir   = image_cache_dir();
    $file  = $dir . '/' . $whose . '-' . $which . '-' . $cap . '.' . $out;
    $type  = $out === 'jpeg' ? 'image/jpeg' : ($out === 'png' ? 'image/png' : 'image/webp');

    if (is_file($file) && filesize($file) > 0) {
        return ['path' => $file, 'mime' => $type, 'negotiated' => $negotiated];
    }

    $bytes = @file_get_contents($path);
    if ($bytes === false) {
        return null;
    }
    $src = @imagecreatefromstring($bytes);
    if ($src === false) {
        return null;
    }

    $rows = max(1, (int) round($height * ($target / $width)));
    $dst  = @imagecreatetruecolor($target, $rows);
    if ($dst === false) {
        imagedestroy($src);
        return null;
    }

    // Keep transparency. A cut-out or a logo arrives as PNG with an alpha
    // channel, and flattening it onto black is worse than not resizing at all.
    if ($out !== 'jpeg') {
        imagealphablending($dst, false);
        imagesavealpha($dst, true);
    }
    imagecopyresampled($dst, $src, 0, 0, 0, 0, $target, $rows, $width, $height);

    // Written under a temporary name and moved into place, so a request that
    // arrives mid-write never reads half a file.
    $tmp = $file . '.' . getmypid() . '.tmp';
    if ($out === 'webp') {
        $ok = @imagewebp($dst, $tmp, 82);
    } elseif ($out === 'jpeg') {
        $ok = @imagejpeg($dst, $tmp, 82);
    } else {
        $ok = @imagepng($dst, $tmp, 8);
    }

    imagedestroy($dst);
    imagedestroy($src);

    if (!$ok || !is_file($tmp)) {
        @unlink($tmp);
        return null;
    }

    // If the copy is not actually smaller, keep the original. That happens
    // with a picture that is already flat colour, or already well encoded.
    if (filesize($tmp) >= filesize($path)) {
        @unlink($tmp);
        return null;
    }

    if (!@rename($tmp, $file)) {
        @unlink($tmp);
        return null;
    }

    image_cache_sweep($dir, $whose, $which);

    return ['path' => $file, 'mime' => $type, 'negotiated' => $negotiated];
}

/**
 * Removes copies made from an older version of the same picture.
 *
 * Only ever runs just after a variant was written, which is the one moment we
 * know a new version exists -- so this costs a directory listing per new
 * picture rather than per request. It cannot touch another picture's copies:
 * everything it deletes starts with this source's own hash, and the copies of
 * the current version are the ones it keeps.
 */
function image_cache_sweep(string $dir, string $whose, string $which): void
{
    $found = @glob($dir . '/' . $whose . '-*');
    if ($found === false) {
        return;
    }

    foreach ($found as $old) {
        if (!str_starts_with(basename($old), $whose . '-' . $which . '-')) {
            @unlink($old);
        }
    }
}

/**
 * Sends a stored picture at the size the site actually draws it.
 *
 * What the three public readers call instead of image_stream. The caching,
 * the ETag and the 304 are unchanged and still come from image_stream -- they
 * are computed from whichever file is really being sent, so a variant gets its
 * own validator rather than the original's.
 */
function image_serve(string $path, string $mime, int $cap = IMAGE_CAP_DEFAULT): void
{
    // A page may ask for less than the cap, never more. The cap is what this
    // kind of picture is drawn at somewhere on the site, so letting a query
    // raise it would serve a bigger file than anything displays -- and would
    // let anyone fill the cache with widths no page will ever request.
    $asked = image_requested_width();
    if ($asked !== null && $asked < $cap) {
        $cap = $asked;
    }

    $variant = image_variant($path, $mime, $cap);

    if ($variant === null) {
        image_stream($path, $mime);
        return;
    }

    if ($variant['negotiated']) {
        // The answer depended on the request's Accept header, so anything
        // keeping a copy has to key on it too.
        header('Vary: Accept');
    }

    image_stream($variant['path'], $variant['mime']);
}
