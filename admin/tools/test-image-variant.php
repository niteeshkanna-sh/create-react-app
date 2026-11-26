<?php
declare(strict_types=1);

/**
 * Serving a picture at the size the page draws it. No database needed.
 *
 * The rule that matters most here is the one about doing nothing. This code
 * sits in front of every photograph on the website, so a mistake in it is not
 * a smaller picture -- it is a broken one, on every page, for everybody. Each
 * way it can fail has to end in the original file being sent exactly as it was
 * before any of this existed: no GD on the host, a file GD cannot decode, a
 * picture already small enough, a re-encode that came out bigger.
 *
 * Needs the gd extension to test anything. Without it there is nothing to
 * check except that nothing happens, which it checks and then stops.
 *
 *     php admin/tools/test-image-variant.php
 */

// Stands in for config.php, so this runs without a database or a panel.
$GLOBALS['test_storage'] = sys_get_temp_dir() . '/nitesha-variant-test-' . getmypid();

function config(?string $key = null): mixed
{
    return $key === 'storage_path' ? $GLOBALS['test_storage'] : null;
}

/** Records what would have been sent, instead of sending it. */
function image_stream(string $path, string $mime): void
{
    $GLOBALS['streamed'] = ['path' => $path, 'mime' => $mime];
}

require_once __DIR__ . '/../src/image-variant.php';

$pass = 0;
$fail = 0;

function ok(string $label, bool $condition, string $detail = ''): void
{
    global $pass, $fail;
    if ($condition) {
        $pass++;
        echo "  ok    {$label}\n";
    } else {
        $fail++;
        echo "  FAIL  {$label}" . ($detail === '' ? '' : " — {$detail}") . "\n";
    }
}

if (!extension_loaded('gd') || !function_exists('imagewebp')) {
    echo "\ngd with WebP is not available here, so there is nothing to shrink.\n";
    echo "Checking only that every picture is passed through untouched.\n\n";
    $file = tempnam(sys_get_temp_dir(), 'img');
    ok('no variant without gd', image_variant($file, 'image/jpeg', 800) === null);
    unlink($file);
    echo "\n{$pass} passed, {$fail} failed\n";
    exit($fail === 0 ? 0 : 1);
}

$work = $GLOBALS['test_storage'];
@mkdir($work, 0750, true);

/**
 * Something that compresses like a photograph.
 *
 * The first version of this drew flat 4x4 blocks, which PNG stores almost for
 * free -- so the "is the copy actually smaller" guard correctly refused to
 * replace it, and three tests failed against code that was working. A real
 * photograph is per-pixel noise over a smooth gradient, and that is what
 * decides whether WebP beats PNG. Seeded, so a failure is reproducible.
 */
function a_photograph(string $path, int $width, int $height, string $as): void
{
    mt_srand(20251126);
    $im = imagecreatetruecolor($width, $height);
    for ($y = 0; $y < $height; $y++) {
        for ($x = 0; $x < $width; $x++) {
            $r = (int) max(0, min(255, ($x / $width) * 200 + mt_rand(-40, 40)));
            $g = (int) max(0, min(255, ($y / $height) * 200 + mt_rand(-40, 40)));
            $b = (int) max(0, min(255, 120 + mt_rand(-60, 60)));
            imagesetpixel($im, $x, $y, imagecolorallocate($im, $r, $g, $b));
        }
    }
    $as === 'png' ? imagepng($im, $path) : imagejpeg($im, $path, 92);
    imagedestroy($im);
}

$MODERN = 'image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8';
$OLD    = 'image/png,image/svg+xml,image/*;q=0.8,*/*;q=0.5';

$big = $work . '/big.jpg';
a_photograph($big, 1600, 1000, 'jpg');

echo "\n-- a browser that reads WebP --\n";
$_SERVER['HTTP_ACCEPT'] = $MODERN;
$v = image_variant($big, 'image/jpeg', 800);
ok('a variant is made', $v !== null);
ok('sent as WebP', $v['mime'] === 'image/webp', (string) $v['mime']);
ok('capped to the width asked for', getimagesize($v['path'])[0] === 800,
    (string) getimagesize($v['path'])[0]);
ok('the shape is kept', getimagesize($v['path'])[1] === 500,
    (string) getimagesize($v['path'])[1]);
ok('smaller than the original', filesize($v['path']) < filesize($big));
// The format was chosen from the request, so a cache in the middle has to be
// told that -- otherwise one visitor's WebP is handed to a browser that
// cannot read it.
ok('marked as negotiated', $v['negotiated'] === true);

echo "\n-- a browser that does not --\n";
$_SERVER['HTTP_ACCEPT'] = $OLD;
$j = image_variant($big, 'image/jpeg', 800);
ok('never sent WebP', $j['mime'] === 'image/jpeg', (string) $j['mime']);
ok('still resized', getimagesize($j['path'])[0] === 800);
ok('not marked as negotiated', $j['negotiated'] === false);
ok('kept apart from the WebP copy', $j['path'] !== $v['path']);

echo "\n-- made once, then reused --\n";
$_SERVER['HTTP_ACCEPT'] = $MODERN;
$was = filemtime($v['path']);
clearstatcache();
$again = image_variant($big, 'image/jpeg', 800);
ok('the same file comes back', $again['path'] === $v['path']);
ok('it was not written a second time', filemtime($again['path']) === $was);

echo "\n-- nothing to gain --\n";
$small = $work . '/small.jpg';
a_photograph($small, 400, 250, 'jpg');
// Narrow enough already, and the browser cannot read anything lighter, so
// there is no reason to touch it.
$_SERVER['HTTP_ACCEPT'] = $OLD;
ok('a narrow JPEG is left alone for a browser with no WebP',
    image_variant($small, 'image/jpeg', 800) === null);
$_SERVER['HTTP_ACCEPT'] = $MODERN;
$exact = $work . '/exact.webp';
$im = imagecreatefromjpeg($big);
imagewebp($im, $exact, 80);
imagedestroy($im);
ok('a WebP already at its cap is left alone',
    image_variant($exact, 'image/webp', 1600) === null);

echo "\n-- a picture stored as PNG --\n";
// A photograph saved as PNG is several times the size of the same thing as
// WebP at any width, so this one is worth converting even when it does not
// need resizing.
$png = $work . '/photo.png';
a_photograph($png, 500, 400, 'png');
$_SERVER['HTTP_ACCEPT'] = $MODERN;
$p = image_variant($png, 'image/png', 900);
ok('converted even though it is narrow enough', $p !== null && $p['mime'] === 'image/webp');
ok('and is actually smaller', $p !== null && filesize($p['path']) < filesize($png));
$_SERVER['HTTP_ACCEPT'] = $OLD;
$pOld = image_variant($png, 'image/png', 900);
ok('left as PNG for a browser that cannot read WebP',
    $pOld === null || $pOld['mime'] === 'image/png');

echo "\n-- replacing a picture --\n";
$_SERVER['HTTP_ACCEPT'] = $MODERN;
$slot = $work . '/slot.jpg';
a_photograph($slot, 1400, 900, 'jpg');
$first = image_variant($slot, 'image/jpeg', 700);
ok('a variant exists', $first !== null && is_file($first['path']));
sleep(1);
a_photograph($slot, 1400, 900, 'png');   // different bytes, same name
touch($slot, time());
clearstatcache();
$second = image_variant($slot, 'image/jpeg', 700);
ok('the new version gets its own file', $second['path'] !== $first['path']);
// Without this the cache keeps a copy of every picture ever uploaded.
ok('the copy of the old version is swept up', !is_file($first['path']));

echo "\n-- the widths a page may ask for --\n";
$_SERVER['HTTP_ACCEPT'] = $MODERN;
// Read by image_serve, not image_variant: the width is a fact about the
// request, and image_variant is handed a number and makes that size. Asking
// image_variant to read the query as well would give two places that decide
// how wide a picture is.
$_GET['w'] = '400';
ok('the width is recognised', image_requested_width() === 400);
$GLOBALS['streamed'] = null;
image_serve($big, 'image/jpeg', 800);
ok('?w= narrows the picture', getimagesize($GLOBALS['streamed']['path'])[0] === 400,
    (string) getimagesize($GLOBALS['streamed']['path'])[0]);

// A query must never raise the cap: that would serve a file bigger than
// anything on the site displays, and would let anyone fill the cache.
$_GET['w'] = '1600';
$GLOBALS['streamed'] = null;
image_serve($big, 'image/jpeg', 800);
ok('?w= cannot ask for more than the cap',
    getimagesize($GLOBALS['streamed']['path'])[0] === 800,
    (string) getimagesize($GLOBALS['streamed']['path'])[0]);

foreach (['401', '0', '-400', 'big', '400.5', '1e3', ''] as $junk) {
    $_GET['w'] = $junk;
    ok("a width of '{$junk}' is ignored", image_requested_width() === null);
}
$_GET['w'] = ['400'];
ok('an array is ignored', image_requested_width() === null);
unset($_GET['w']);
ok('no width at all is ignored', image_requested_width() === null);

echo "\n-- asking for the picture as it was stored --\n";
// Honoured only for a signed-in panel session, which brand.php checks; this
// is just the reading of the request. Anything but exactly "1" is a no, so a
// stray ?full= on a public URL cannot bypass the sizing.
unset($_GET['w']);
foreach (['1' => true, '0' => false, 'yes' => false, 'true' => false, '' => false, '11' => false] as $value => $want) {
    $_GET['full'] = (string) $value;
    ok("full='{$value}' reads as " . ($want ? 'yes' : 'no'), image_requested_full() === $want);
}
unset($_GET['full']);
ok('no full at all reads as no', image_requested_full() === false);

echo "\n-- the site and the panel agree on the widths --\n";
// The srcset in the markup names widths this file has to answer for. A width
// in one list and not the other is either a file nobody downloads or a 404 at
// exactly the screen size that asks for it, and nothing else would catch it.
$helper = __DIR__ . '/../../my-app/src/lib/images.ts';
if (is_file($helper)) {
    preg_match('/const LADDER = \[([^\]]*)\]/', (string) file_get_contents($helper), $m);
    $siteWidths = array_map('intval', array_filter(array_map('trim', explode(',', $m[1] ?? ''))));
    ok('the site asks for widths the panel offers',
        $siteWidths !== [] && $siteWidths === IMAGE_WIDTHS,
        'site: [' . implode(', ', $siteWidths) . '] panel: [' . implode(', ', IMAGE_WIDTHS) . ']');
} else {
    echo "  --    the site is not beside this panel, so the widths cannot be compared\n";
}

echo "\n-- when it cannot work --\n";
$junk = $work . '/junk.jpg';
file_put_contents($junk, 'this is not an image');
ok('a file GD cannot read makes no variant', image_variant($junk, 'image/jpeg', 800) === null);
$GLOBALS['streamed'] = null;
image_serve($junk, 'image/jpeg', 800);
ok('and is still sent, exactly as before',
    $GLOBALS['streamed'] === ['path' => $junk, 'mime' => 'image/jpeg']);

$GLOBALS['streamed'] = null;
$_SERVER['HTTP_ACCEPT'] = $OLD;
image_serve($small, 'image/jpeg', 800);
ok('a picture with nothing to gain is sent exactly as stored',
    $GLOBALS['streamed'] === ['path' => $small, 'mime' => 'image/jpeg']);

// Clean up: everything this wrote lives under one directory.
foreach (glob($work . '/cache/*') ?: [] as $f) {
    unlink($f);
}
@rmdir($work . '/cache');
foreach (glob($work . '/*') ?: [] as $f) {
    unlink($f);
}
@rmdir($work);

echo "\n{$pass} passed, {$fail} failed\n";
exit($fail === 0 ? 0 : 1);
