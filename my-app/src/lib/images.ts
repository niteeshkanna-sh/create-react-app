/**
 * Asking the panel for a picture at the size this page draws it.
 *
 * Every photograph on the site is stored once and streamed back by the panel,
 * which now sends it no wider than that kind of picture is drawn anywhere.
 * "Anywhere" is the problem this file solves: the six service cards are drawn
 * 612 across on /cars/ and 286 on the home page, from one file, so the cap has
 * to be the larger of the two and the home page carries four times the pixels
 * it shows. A phone is worse again -- a page banner is 390 points wide there
 * and 1600 in the file.
 *
 * The page knows better than the file can, so it says so. Each srcset below
 * is built from widths measured in a browser at seven viewport widths, not
 * guessed, and the sizes attribute beside it describes the same measurements
 * so the browser can pick for its own screen and pixel density.
 *
 * src stays the plain address. It is what the sitemap and the structured data
 * name, so it is the one a crawler fetches and the one that answers if srcset
 * is ignored; the variants hang off it rather than replacing it.
 */

/**
 * The widths the panel will answer for -- it ignores anything else, so this
 * list and the one in admin/src/image-variant.php have to say the same thing.
 * Roughly a stop apart, which is as finely as srcset can usefully choose.
 */
const LADDER = [240, 400, 600, 800, 1200, 1600];

/** Only the panel's own readers take a width; public/ files are static. */
const PANEL_IMAGE = /\/(site-images|place-photos|car-photos)\//;

function withWidth(url: string, width: number): string {
  return url + (url.includes('?') ? '&' : '?') + 'w=' + width;
}

/**
 * A srcset for a panel photograph, or undefined to leave the markup alone.
 *
 * `widest` is twice the widest this picture is ever drawn at this call site,
 * so a dense screen is still served a sharp image and nothing above that is
 * offered -- the panel would only clamp it back down, and a candidate that
 * does not deliver the width it claims makes the browser choose badly.
 */
export function imageSrcSet(url: string | undefined, widest: number): string | undefined {
  if (!url || !PANEL_IMAGE.test(url)) return undefined;

  const widths = LADDER.filter((w) => w <= widest);

  // One candidate is not a choice, and the browser already has that file.
  return widths.length > 1 ? widths.map((w) => `${withWidth(url, w)} ${w}w`).join(', ') : undefined;
}
