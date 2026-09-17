/**
 * Per-route HTML and a sitemap, written after the Vite build.
 *
 * The app renders in the browser, so every route would otherwise be served the
 * same index.html carrying the home page's title and description. Google
 * executes JavaScript and would eventually see the right ones, but WhatsApp,
 * Facebook, X and most other link unfurlers do not run it at all -- they read
 * the HTML as served and stop. Sharing niteshacars.in/tariff would preview as
 * the home page.
 *
 * So each route gets its own directory with its own index.html: same bundle,
 * same markup, but title, description, canonical and og: tags rewritten. Pages
 * serves /tariff/ from /tariff/index.html, and a request for /tariff without
 * the slash is redirected to it.
 *
 * dist/404.html stays a copy of the root page: it is what Pages serves for
 * anything unmatched, and the router resolves the URL once the app boots.
 */
import { readFileSync, writeFileSync, mkdirSync, copyFileSync } from 'node:fs';
import { join } from 'node:path';

const root = join(import.meta.dirname, '..');
const dist = join(root, 'dist');
const seo = JSON.parse(readFileSync(join(root, 'src/data/seo.json'), 'utf8'));
const template = readFileSync(join(dist, 'index.html'), 'utf8');
// Which photographs actually exist, for the sitemap and the structured data.
const photos = JSON.parse(readFileSync(join(root, 'src/data/photos.json'), 'utf8'));

// Images uploaded in the panel, written by fetch-content.mjs just before this
// runs. Merged over the committed ones because that is the order the site
// itself resolves them in -- an upload wins over a file in the repository, so
// the sitemap must say the same thing the page shows.
let uploaded = {};
try {
  uploaded = JSON.parse(readFileSync(join(root, 'src/data/brand.json'), 'utf8'));
} catch {
  // Not written yet, which is the normal state of a fresh checkout.
}

/** Where a slot's picture actually is, or nothing. */
function pictureFor(slot) {
  if (!slot) return undefined;
  // Uploaded URLs are already absolute; committed ones are site-relative.
  if (typeof uploaded[slot] === 'string') return uploaded[slot];
  return typeof photos[slot] === 'string' ? seo.site.origin + photos[slot] : undefined;
}

/** Replace the content of a meta/title/canonical tag, leaving the rest alone. */
function rewrite(html, { title, description, url }) {
  const out = html
    .replace(/<title>[\s\S]*?<\/title>/, `<title>${title}</title>`)
    .replace(
      /(<meta\s+name="description"\s+content=")[\s\S]*?(")/,
      `$1${description}$2`,
    )
    .replace(
      /(<link\s+rel="canonical"\s+href=")[^"]*(")/,
      `$1${url}$2`,
    )
    .replace(
      /(<meta\s+property="og:title"\s+content=")[\s\S]*?(")/,
      `$1${title}$2`,
    )
    .replace(
      /(<meta\s+property="og:description"\s+content=")[\s\S]*?(")/,
      `$1${description}$2`,
    )
    .replace(
      /(<meta\s+property="og:url"\s+content=")[^"]*(")/,
      `$1${url}$2`,
    )
    ;

  return withImages(out);
}

const escape = (s) =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

/**
 * Adds the site's photographs to the structured data already in the template.
 *
 * index.html has carried an AutoRental block for a while. I missed it -- the
 * grep that went looking covered src/ and scripts/ and not the template -- and
 * added a second one, which put two AutoRental entities with different names on
 * every page. That is worse than having none: it asks Google to decide which of
 * two businesses this is.
 *
 * So this edits the block that exists rather than writing another. What it adds
 * is the part worth adding for image search: every banner photograph that
 * actually exists, and the logo, as absolute URLs.
 */
function withImages(html) {
  const pattern = /<script type="application\/ld\+json">([\s\S]*?)<\/script>/;
  const match = html.match(pattern);
  if (!match) return html;

  let data;
  try {
    data = JSON.parse(match[1]);
  } catch {
    // Hand-edited into invalid JSON at some point. Leaving it exactly as found
    // is right: rewriting it would hide the mistake rather than fix it.
    console.warn('prerender-seo: the structured data is not valid JSON, leaving it alone');
    return html;
  }

  // Only pictures that exist. A schema image pointing at a 404 is a defect
  // Search Console reports, and there is nothing to gain by claiming one.
  const banners = seo.routes
    .map((r) => pictureFor(r.imageSlot))
    .filter((url) => typeof url === 'string');

  const existing = data.image === undefined ? [] : [data.image].flat();
  const images = [...new Set([...existing, ...banners])];

  if (images.length > 0) data.image = images.length === 1 ? images[0] : images;
  const logo = pictureFor('logo');
  if (logo) data.logo = logo;

  return html.replace(
    pattern,
    `<script type="application/ld+json">${JSON.stringify(data)}</script>`,
  );
}

let written = 0;for (const route of seo.routes) {
  const url = seo.site.origin + route.path;
  const html = rewrite(template, {
    title: escape(route.title),
    description: escape(route.description),
    url,
  });

  if (route.path === '/') {
    writeFileSync(join(dist, 'index.html'), html);
  } else {
    const dir = join(dist, route.path.replace(/^\//, ''));
    mkdirSync(dir, { recursive: true });
    writeFileSync(join(dir, 'index.html'), html);
  }
  written++;
}

// The SPA fallback must carry the root page's tags, not the last route's.
copyFileSync(join(dist, 'index.html'), join(dist, '404.html'));

// Which photograph belongs to which route, so the sitemap can name it.
//
// Google will find an <img> by crawling the page, but an image sitemap is how
// a picture gets into image search promptly and with a caption attached -- and
// image search is worth having for a rental business, where people search for
// what a car looks like as often as for its price.
//
// Read from the manifest rather than assumed: a slot with no file is a URL
// that would 404, and a sitemap full of 404s is worse than a short one.

function imagesFor(route) {
  const url = pictureFor(route.imageSlot);
  if (!url) return '';
  return (
    `\n    <image:image>\n` +
    `      <image:loc>${url}</image:loc>\n` +
    `      <image:title>${escape(route.imageAlt ?? route.title)}</image:title>\n` +
    `    </image:image>`
  );
}

const today = new Date().toISOString().slice(0, 10);
const sitemap =
  '<?xml version="1.0" encoding="UTF-8"?>\n' +
  '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"\n' +
  '        xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">\n' +
  seo.routes
    .map(
      (r) =>
        `  <url>\n    <loc>${seo.site.origin}${r.path}</loc>\n` +
        `    <lastmod>${today}</lastmod>\n` +
        `    <priority>${r.priority}</priority>` +
        imagesFor(r) +
        `\n  </url>`,
    )
    .join('\n') +
  '\n</urlset>\n';

writeFileSync(join(dist, 'sitemap.xml'), sitemap);

console.log(
  `prerender-seo: ${written} routes, plus sitemap.xml and the 404 fallback`,
);
