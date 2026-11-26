<?php
declare(strict_types=1);

require_once __DIR__ . '/db.php';
require_once __DIR__ . '/image-names.php';
require_once __DIR__ . '/image-variant.php';
require_once __DIR__ . '/vehicle-photos.php';

/**
 * The site's own images: the logo, and the banners across the pages.
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
    'logo'          => 'Logo',

    // The wide photograph across the top of each page. The names match what
    // the site asks for, so adding one here and adding one there is the same
    // decision rather than two that can disagree -- and five of these went
    // when the service pages did. A slot for a page that no longer exists is
    // a door that opens on nothing: five photographs were uploaded to those
    // and none of them was ever displayed anywhere.
    'cars-hero'     => 'Areas page banner',
    'tariff-hero'   => 'Tariff page banner',
    'about-hero'    => 'About page banner',
    'contact-hero'  => 'Contact page banner',
    'blog-hero'     => 'Blog page banner',
    'places-hero'   => 'Places to visit banner',
    'services-hero' => 'What we hire banner',

    // The home page, top to bottom.
    'home-hero'     => 'Home page background',

    // The four tiles in the "What are you looking for?" card in the banner,
    // in the order they are listed under Website content. A tile with no
    // picture keeps its drawing, so these can be filled in one at a time.
    'chooser-1'     => 'Banner tile 1 — picture',
    'chooser-2'     => 'Banner tile 2 — picture',
    'chooser-3'     => 'Banner tile 3 — picture',
    'chooser-4'     => 'Banner tile 4 — picture',

    // The offer cards, in the order they are listed under Website content.
    // An offer with no picture is the words on the brand colours, which is a
    // finished card -- so these can be filled in one at a time or not at all.
    'offer-1'       => 'Offer 1 — picture',
    'offer-2'       => 'Offer 2 — picture',
    'offer-3'       => 'Offer 3 — picture',
    'offer-4'       => 'Offer 4 — picture',

    // The collage beside "why hire from us". However many are uploaded is
    // how many the collage shows, so this grows one photograph at a time
    // rather than needing all six before any of them appear.
    'why-us-1'      => 'Why hire from us — photo 1',
    'why-us-2'      => 'Why hire from us — photo 2',
    'why-us-3'      => 'Why hire from us — photo 3',
    'why-us-4'      => 'Why hire from us — photo 4',
    'why-us-5'      => 'Why hire from us — photo 5',
    'why-us-6'      => 'Why hire from us — photo 6',

    // Behind the questions band, which stands on the home page and on the
    // tariff page. It had no slot and quietly borrowed the home page's
    // background, so there was no way to set it here and the tariff page's
    // questions sat over the home page's photograph.
    'faq'           => 'Questions panel background',

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

    // "How it works" is one picture now, standing between the steps, so it
    // is one slot rather than three. It keeps the key the middle step used,
    // so a photograph already uploaded there is the one that shows -- the
    // site only ever sees a slot this list names, and renaming the key would
    // have quietly hidden it.
    'step-2'        => 'How it works: the picture between the steps',
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
    // A logo is artwork with its own margins, so it is not cropped at all:
    // the whole image is kept and only scaled to fit inside this box. A ratio
    // of 0 says so.
    //
    // It used to be framed square, from when the header showed a small badge
    // beside the business name in type. The header now shows the lockup and
    // nothing else, and a square frame around a wide lockup cuts the words off
    // it -- which is exactly what happened to the first one uploaded here.
    'logo'  => [0, 0, 1280, 800],

    // The wide band across the top of a page.
    'cars-hero'     => [16, 5, 1600, 500],
    'tariff-hero'   => [16, 5, 1600, 500],
    'about-hero'    => [16, 5, 1600, 500],
    'contact-hero'  => [16, 5, 1600, 500],
    'blog-hero'     => [16, 5, 1600, 500],
    'places-hero'   => [16, 5, 1600, 500],
    'services-hero' => [16, 5, 1600, 500],

    // Full-bleed sections, which are seen at whatever the window is.
    'home-hero' => [16, 9, 1600, 900],
    // The questions band is shorter than the home page's, and almost entirely
    // behind navy -- so it is cropped wider and saved smaller. Nothing in it
    // is ever read; it is there to stop the band being a flat colour.
    'faq'       => [16, 7, 1400, 613],

    // The banner tiles show their picture in the right-hand half, faded out
    // towards the words. Small, because that is all any of them is ever
    // drawn at -- a tile is about 200 points wide on a laptop.
    'chooser-1' => [4, 3, 600, 450],
    'chooser-2' => [4, 3, 600, 450],
    'chooser-3' => [4, 3, 600, 450],
    'chooser-4' => [4, 3, 600, 450],

    // An offer card is a wide landscape tile, read at about 380 points.
    'offer-1' => [16, 10, 800, 500],
    'offer-2' => [16, 10, 800, 500],
    'offer-3' => [16, 10, 800, 500],
    'offer-4' => [16, 10, 800, 500],

    // The collage frames stand taller than they are wide, and each one is
    // drawn at about 200 points, so they are saved small: six photographs
    // at banner size on one page is most of a megabyte for a column of
    // thumbnails.
    'why-us-1' => [4, 5, 700, 875],
    'why-us-2' => [4, 5, 700, 875],
    'why-us-3' => [4, 5, 700, 875],
    'why-us-4' => [4, 5, 700, 875],
    'why-us-5' => [4, 5, 700, 875],
    'why-us-6' => [4, 5, 700, 875],

    // The one between the steps stands taller than it is wide. 4:5 rather
    // than anything narrower: the photographs already uploaded here are
    // landscape, and a tall crop of a landscape photograph takes the heads
    // off it.
    'step-2' => [4, 5, 1000, 1250],
];

/**
 * The words each slot's file is named with, and therefore its address.
 *
 * Not the slot name and not the label beside it in the panel. "Cars page
 * banner" describes where the picture goes, which is of no use to anyone
 * searching; "self drive car rental Nagercoil" describes what is in it, in the
 * words this business wants to be found for. Google reads the file name as one
 * of the handful of signals it has about a picture, so this is the one place
 * the phrase can be stated once and ride on every upload.
 *
 * A slot with no entry falls back to its own name plus the district, which is
 * always better than a random one and is a reminder to add a real phrase here
 * when a slot is added.
 */
const SITE_IMAGE_KEYWORDS = [
    'logo'  => 'NiteSha Cars and Bikes logo Nagercoil',

    'cars-hero'     => 'self drive car rental Nagercoil',
    'tariff-hero'   => 'self drive car rental tariff Kanyakumari',
    'about-hero'    => 'about NiteSha Cars and Bikes Nagercoil',
    'contact-hero'  => 'contact self drive car rental Nagercoil',
    'blog-hero'     => 'car rental travel blog Kanyakumari',
    'places-hero'   => 'places to visit in Kanyakumari district',
    'services-hero' => 'vehicle hire services Kanyakumari district',

    'home-hero' => 'self drive car and bike rental Kanyakumari district',

    'chooser-1' => 'daily self drive car rental Nagercoil',
    'chooser-2' => 'weekly self drive car hire Kanyakumari',
    'chooser-3' => 'monthly car rental Nagercoil',
    'chooser-4' => 'scooter and bike rental Kanyakumari',

    'offer-1'   => 'self drive car rental offer Nagercoil',
    'offer-2'   => 'self drive car rental offer Kanyakumari',
    'offer-3'   => 'car and bike hire discount Nagercoil',
    'offer-4'   => 'car and bike hire discount Kanyakumari',

    'why-us-1'  => 'why hire from NiteSha Cars Nagercoil',
    'why-us-2'  => 'self drive car handover Nagercoil',
    'why-us-3'  => 'self drive rental fleet Kanyakumari district',
    'why-us-4'  => 'NiteSha Cars and Bikes team Nagercoil',
    'why-us-5'  => 'self drive car delivered Kanyakumari',
    'why-us-6'  => 'rental car on the road Kanyakumari district',
    'coast'     => 'car rental delivery areas Kanyakumari district',
    'faq'       => 'self drive car rental questions Kanyakumari',

    'cars'             => 'self drive cars for rent Nagercoil',
    'bikes'            => 'two wheeler rental Kanyakumari',
    'wedding-cars'     => 'decorated wedding cars Nagercoil',
    'tourist-vehicles' => 'tempo traveller and tourist vehicle hire Kanyakumari',
    'monthly'          => 'monthly self drive car hire Nagercoil',
    'nri'              => 'airport car hire for NRI families Kanyakumari',

    'step-2' => 'booking a self drive car Nagercoil',
];

/** The words a slot's uploaded file is named with. */
function site_image_keywords(string $slot): string
{
    return SITE_IMAGE_KEYWORDS[$slot] ?? ($slot . ' NiteSha Cars Kanyakumari');
}

/**
 * Whether the whole image is kept rather than framed to a shape.
 *
 * True for the logo, and for anything else given a ratio of zero.
 */
function site_image_whole(string $slot): bool
{
    [$rw, $rh] = site_image_shape($slot);
    return $rw <= 0 || $rh <= 0;
}

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

/**
 * How wide this file is ever drawn, from the slot it fills.
 *
 * The site images are not one kind of picture. On the home page a collage
 * frame is drawn 300 points across and a page banner 1440, from the same
 * directory, through the same reader -- so one number for all of them either
 * softens the banner or leaves the collage six times larger than it needs to
 * be.
 *
 * The slot already knows. SITE_IMAGE_SHAPES is the size each slot is saved
 * at, and site_image_warning() already calls it "the space it fills" when it
 * tells the owner a picture is too small for its slot. The same number read
 * the other way says when one is too big.
 *
 * Found by looking the filename back up, because a file's name no longer says
 * which slot it belongs to -- it says what is in the picture, for Google's
 * benefit, so `cars-hero` is stored as self-drive-car-rental-nagercoil-<hex>.
 * Guessing from the name would cap a banner as though it were a card.
 *
 * A name this does not recognise is left alone rather than guessed at: the
 * fallback is the widest any slot is, so an unknown file is never softened.
 */
function site_image_cap(string $name): int
{
    static $caps = null;

    if ($caps === null) {
        $caps = site_image_caps_remembered();
    }

    // A name that is not in the map is how a new upload announces itself:
    // every stored file ends in sixteen random characters chosen when it was
    // saved, so a replaced picture is never a name we have already seen.
    if (!isset($caps[$name])) {
        $caps = site_image_caps_rebuild();
    }

    return $caps[$name] ?? IMAGE_CAP_DEFAULT;
}

/** Where the map of filename to drawn width is kept between requests. */
function site_image_caps_file(): string
{
    return image_cache_dir() . '/site-image-caps.json';
}

/**
 * The map as it was last written, or a fresh one.
 *
 * Read from a file rather than the database because this runs on the public
 * side, once per picture on the page. brand.php never opened a database
 * connection before this, and making every photograph on the site wait for
 * one in order to find out how wide to send it would cost more than the
 * bytes it saves.
 */
function site_image_caps_remembered(): array
{
    $file = site_image_caps_file();
    $raw  = @file_get_contents($file);

    if ($raw === false) {
        return site_image_caps_rebuild();
    }

    $map = json_decode($raw, true);
    return is_array($map) ? $map : site_image_caps_rebuild();
}

/** Drops the remembered map, so the next request builds a fresh one. */
function site_image_caps_forget(): void
{
    @unlink(site_image_caps_file());
}

/**
 * Reads the slots from the database and writes the map out.
 *
 * Rate limited by the file's own age, because the one case that would
 * otherwise rebuild on every single request is a file sitting in the brand
 * directory with no row pointing at it -- an upload to a slot that was later
 * removed, of which there are several here.
 */
function site_image_caps_rebuild(): array
{
    $file = site_image_caps_file();

    $age = @filemtime($file);
    if ($age !== false && (time() - $age) < 60) {
        $map = json_decode((string) @file_get_contents($file), true);
        if (is_array($map)) {
            return $map;
        }
    }

    $caps = [];
    foreach (site_images() as $slot => $stored) {
        if ($stored === '') {
            continue;
        }
        [, , $wide] = site_image_shape($slot);
        $caps[$stored] = max(1, (int) $wide);
    }

    $tmp = $file . '.' . getmypid() . '.tmp';
    if (@file_put_contents($tmp, json_encode($caps)) !== false && !@rename($tmp, $file)) {
        @unlink($tmp);
    }

    return $caps;
}

/** The public URL for a stored site image, or null. */
function site_image_url(?string $name): ?string
{
    if ($name === null || $name === '') {
        return null;
    }
    // /site-images/, from the site root, for the same reason as the car
    // photographs: an address that reads as a file reads as a picture, to a
    // person scanning a search result and to the crawler that put it there,
    // and "admin" in the path says nothing and risks a great deal. Both the
    // old address and ?f= still answer, so nothing that stored one breaks.
    //
    // The name carries random bytes chosen at upload, so a new image is a new
    // URL and the response can be cached hard.
    return '/site-images/' . rawurlencode($name);
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
    //
    // Named for what the picture shows rather than for the slot it fills. It
    // was b + the slot name + random bytes, which is unique and tells a reader
    // -- or a search engine -- nothing at all. See SITE_IMAGE_KEYWORDS.
    $name = image_name(site_image_keywords($slot), $extension, 'nitesha-cars-' . $slot);

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

    // So the new picture is sent at its slot's width from the first request
    // rather than at the cautious default for the next minute.
    site_image_caps_forget();

    return null;
}

/**
 * Whether a picture is smaller than the space it is drawn in.
 *
 * The panel took whatever was handed to it and said nothing. The tariff
 * banner is 390 by 280 and is drawn 1600 wide, so it has been stretched to
 * four times its size on that page since the day it went up -- visibly soft,
 * and nothing anywhere said why. A picture cannot be made bigger than it
 * was taken, so the only moment this can be caught is the moment it is
 * uploaded, and the only person who can fix it is the one standing there.
 *
 * Kept apart from the slot and the file so it can be tested without a
 * database: give it a path and a target and it measures.
 *
 * Returns [width, height] when the picture is short, and null when it is
 * fine, unreadable, or a format this PHP cannot measure -- saying nothing is
 * the right answer for all three.
 */
function image_is_short(string $path, int $wantW, int $wantH): ?array
{
    if ($wantW < 1 || $wantH < 1 || !is_file($path)) {
        return null;
    }

    $size = @getimagesize($path);
    if (!is_array($size) || ($size[0] ?? 0) < 1) {
        return null;
    }

    [$w, $h] = $size;

    // A tenth short is not visible, and a slot whose crop is a hair off its
    // nominal size would otherwise warn on every upload for ever.
    if ($w >= $wantW * 0.9 && $h >= $wantH * 0.9) {
        return null;
    }

    return [$w, $h];
}

/**
 * The note to show under a slot whose picture is too small, or nothing.
 *
 * Says the two numbers and what follows from them, because "low resolution"
 * is a judgement and "390 by 280, drawn 1600 wide" is a fact somebody can
 * act on.
 */
function site_image_warning(string $slot, string $file): ?string
{
    if (!isset(SITE_IMAGE_SLOTS[$slot]) || $file === '' || str_contains($file, '/')) {
        return null;
    }

    [, , $wantW, $wantH] = site_image_shape($slot);
    $short = image_is_short(site_image_dir() . '/' . $file, $wantW, $wantH);
    if ($short === null) {
        return null;
    }

    return sprintf(
        'This picture is %d×%d and the space it fills is %d×%d, so it is being stretched and will look soft. Replace it with a larger one when you have it.',
        $short[0],
        $short[1],
        $wantW,
        $wantH
    );
}

/**
 * Pictures stored against a slot this list no longer names.
 *
 * Removing a slot does not remove what was uploaded to it: the row stays in
 * the table and the file stays on the disk, and site_images() filters both
 * out, so they become invisible rather than gone. Five banners for the
 * removed service pages are in exactly that state.
 *
 * Surfaced rather than deleted on sight. A slot can disappear for a release
 * and come back, and a page load is not a decision -- the panel lists these
 * with a button beside each one and the owner presses it.
 */
function site_images_orphaned(): array
{
    if (!table_has_column('site_images', 'file')) {
        return [];
    }
    try {
        $out = [];
        foreach (fetch_all('SELECT slot, file FROM site_images') as $row) {
            if (!isset(SITE_IMAGE_SLOTS[$row['slot']])) {
                $out[(string) $row['slot']] = (string) $row['file'];
            }
        }
        return $out;
    } catch (Throwable $e) {
        error_log('site_images orphan read failed: ' . $e->getMessage());
        return [];
    }
}

/**
 * Forgets a picture stored against a slot that no longer exists.
 *
 * The mirror of site_image_clear, and guarded the opposite way round on
 * purpose: that one refuses anything but a live slot, this one refuses
 * anything but a dead one. Neither can be handed the other's argument and
 * do something surprising with it.
 */
function site_image_forget(string $slot): void
{
    if ($slot === '' || isset(SITE_IMAGE_SLOTS[$slot])) {
        return;
    }
    $file = site_images_orphaned()[$slot] ?? null;
    query('DELETE FROM site_images WHERE slot = ?', [$slot]);
    site_image_delete_file($file);
    site_image_caps_forget();
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
    site_image_caps_forget();
}

function site_image_delete_file(?string $name): void
{
    if ($name === null || $name === '' || str_contains($name, '/') || str_contains($name, '\\')) {
        return;
    }
    @unlink(site_image_dir() . '/' . $name);
}
