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
import { pathToFileURL } from 'node:url';
import { allTownRoutes, TOWN_BASE } from '../src/data/town-routes.mjs';

const root = join(import.meta.dirname, '..');

/**
 * The app, rendered to HTML here rather than in the visitor's browser.
 *
 * Every route was served the same empty <div id="root">, so nothing was on
 * screen until 300 KB of JavaScript had been fetched, parsed and run -- three
 * seconds on a mid-range phone on a rural connection, which is most of the
 * traffic this site gets. Everything a page is scored on happens inside that
 * window.
 *
 * Built by `vite build --ssr` into dist-ssr immediately before this runs. If
 * it is not there the pages are still written, just empty the way they were:
 * the metadata and the sitemap are the job this script existed for, and losing
 * them because the extra build step failed would be the worse trade.
 */
let renderRoute = null;
try {
  ({ render: renderRoute } = await import(
    pathToFileURL(join(root, 'dist-ssr/entry-server.js')).href
  ));
} catch (error) {
  console.warn(
    `prerender-seo: no server build to render with (${error.message}) -- ` +
      'writing the pages without their markup',
  );
}
const dist = join(root, 'dist');
const seo = JSON.parse(readFileSync(join(root, 'src/data/seo.json'), 'utf8'));

// One route per town, derived from towns.json by the same module the app uses,
// so a town added there gets its page, its tags and its line in the sitemap
// without a second list being edited.
const towns = JSON.parse(readFileSync(join(root, 'src/data/towns.json'), 'utf8'));
const routes = [...seo.routes, ...allTownRoutes(towns.towns, seo.site)];
const template = readFileSync(join(dist, 'index.html'), 'utf8');
// Which photographs actually exist, for the sitemap and the structured data.
const photos = JSON.parse(readFileSync(join(root, 'src/data/photos.json'), 'utf8'));

/**
 * The business's own details, as the owner has them in the panel.
 *
 * The address, the opening hours and the social links are all editable under
 * Website content, and they are also three of the things Google reads out of a
 * page's structured data to build the panel that appears beside a local search
 * result. Typing them twice -- once for visitors and once for a crawler -- is
 * how they end up disagreeing, and a business whose hours differ between its
 * own page and its structured data is one Google trusts less, not more.
 *
 * So there is one copy. live.json is written by fetch-content.mjs just before
 * this runs, from the panel.
 */
const live = JSON.parse(readFileSync(join(root, 'src/content/live.json'), 'utf8'));
const footer = live?.home?.footer ?? {};
const social = live?.home?.social ?? {};

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
    // The business name, from seo.json rather than from whatever the template
    // happens to say. It said "Nitesha Cars" while seo.json said "NiteSha Cars
    // & Bikes", and one business with two names is a weaker signal in local
    // search than either name would be on its own. Driven from one place now,
    // so the two cannot disagree again.
    .replace(
      /(<meta\s+property="og:site_name"\s+content=")[^"]*(")/,
      `$1${escape(seo.site.name)}$2`,
    )
    ;

  return enrichJsonLd(out);
}

const escape = (s) =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

/**
 * Corrects the business name and adds the site's photographs to the structured
 * data already in the template.
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
function enrichJsonLd(html) {
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
  const banners = routes
    .map((r) => pictureFor(r.imageSlot))
    .filter((url) => typeof url === 'string');

  // Same reasoning as og:site_name above: one name, from one place.
  data.name = seo.site.name;

  // A stable identifier for the business, so every page's block describes one
  // thing rather than thirteen businesses that happen to share a name.
  data['@id'] = seo.site.origin + '#business';

  // The postal address, from the panel. Google will not put a business in the
  // local results on a locality alone, and this is the only place the real
  // address is written down.
  const address = { ...(data.address ?? {}), '@type': 'PostalAddress' };
  const lines = Array.isArray(footer.address) ? footer.address.map((l) => String(l).trim()) : [];
  const postcode = lines.join(' ').match(/\b[1-9]\d{5}\b/);
  if (postcode) address.postalCode = postcode[0];

  // Whatever is left once the lines that only repeat the town, the district,
  // the state or the postcode are removed. With nothing specific in the panel
  // that is empty, and an empty streetAddress is better than one that says
  // "Nagercoil" a second time.
  const generic = new Set(
    [seo.site.city, seo.site.district, `${seo.site.district} district`, seo.site.region]
      .map((v) => String(v).toLowerCase()),
  );
  const street = lines
    .map((line) => line.replace(/\b[1-9]\d{5}\b/, '').trim().replace(/,$/, '').trim())
    .filter((line) => line !== '' && !generic.has(line.toLowerCase()));
  if (street.length > 0) address.streetAddress = street.join(', ');

  data.address = address;

  // Opening hours, if the owner has given any. Written the way schema.org
  // wants them; the panel says what that looks like.
  const hours = String(footer.hours ?? '').trim();
  if (hours !== '') data.openingHours = hours;

  // The map link the footer already builds, which is how Google is told which
  // pin on the map this is.
  const mapQuery = String(footer.mapQuery ?? '').trim();
  if (mapQuery !== '') {
    data.hasMap = 'https://www.google.com/maps?q=' + encodeURIComponent(mapQuery);
  }

  // The profiles that belong to this business. sameAs is how a page claims a
  // social account rather than merely linking to one, and it is what ties the
  // reviews and posts on those accounts to this business.
  const profiles = [social.facebook, social.instagram, social.youtube, social.linkedin]
    .map((v) => String(v ?? '').trim())
    .filter((v) => /^https?:\/\//.test(v));
  if (profiles.length > 0) data.sameAs = profiles;

  // Every town served, not just the district. Someone searching "self drive
  // car Marthandam" is searching for a town, and a district named on its own
  // does not say the town is covered.
  if (Array.isArray(seo.site.areas) && seo.site.areas.length > 0) {
    // serviceArea said "Kanyakumari district" and nothing else. Superseded
    // rather than kept alongside: two properties describing the same thing
    // with different precision is a thing to keep in step for no gain.
    delete data.serviceArea;
    data.areaServed = seo.site.areas.map((name) => ({
      '@type': 'City',
      name,
      containedInPlace: { '@type': 'AdministrativeArea', name: `${seo.site.district} district` },
    }));
  }

  // The phone number in the form a phone can dial and a crawler can parse.
  data.telephone = seo.site.phone;

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

/** The town a route is about, or null for the pages that are not about one. */
function townFor(route) {
  if (!route.path.startsWith(TOWN_BASE + '/')) return null;
  const slug = route.path.slice(TOWN_BASE.length + 1);
  return towns.towns.find((t) => t.slug === slug) ?? null;
}

/**
 * The trail from the home page to this one, as Google shows it.
 *
 * A search result used to print the bare URL under the title. With this it
 * prints "niteshacars.in > Wedding car rental", which says what the page is
 * before anyone has clicked, and it is one of the few pieces of structured
 * data that still changes what a result looks like.
 *
 * The home page gets none: a breadcrumb trail of one item is noise.
 */
function breadcrumbFor(route) {
  if (route.path === '/') return null;

  // The route's own title, cut at the business name or the place, whichever
  // comes first. A breadcrumb is read at a glance under a search result, and
  // "Wedding Car Rental in Nagercoil & Kanyakumari — NiteSha Cars & Bikes" is
  // not a trail anyone reads; "Wedding Car Rental" is. The town is already in
  // the title above it and in the description below.
  //
  // Except on a town page, where the town IS the leaf. Cutting at " in " there
  // threw away the only word that distinguishes one of these pages from the
  // other eleven, and left twelve trails all ending "Self Drive Car Rental".
  const town = townFor(route);
  const leaf = town
    ? town.name
    : route.path === TOWN_BASE
      ? 'Where we deliver'
      : route.title.split(/\s—\s|\sin\s/)[0].trim();

  const trail = [
    { '@type': 'ListItem', position: 1, name: 'Home', item: seo.site.origin + '/' },
  ];

  // A town page sits under the hub, and saying so is the point of a trail
  // rather than a pair: "niteshacars.in > Where we deliver > Marthandam" tells
  // someone reading a result that this is one town of several, which is true
  // and is what stops the page looking like a site of its own.
  if (route.path.startsWith(TOWN_BASE + '/')) {
    trail.push({
      '@type': 'ListItem',
      position: 2,
      name: 'Where we deliver',
      item: seo.site.origin + TOWN_BASE,
    });
  }

  trail.push({
    '@type': 'ListItem',
    position: trail.length + 1,
    name: leaf,
    item: seo.site.origin + route.path,
  });

  return { '@context': 'https://schema.org', '@type': 'BreadcrumbList', itemListElement: trail };
}

/**
 * What is offered, and where -- for a town page only.
 *
 * The business block on every page says the whole district. This says one
 * town, on the page about that town, which is the specific claim a search for
 * "self drive car Marthandam" is trying to match. provider points at the
 * business's @id rather than repeating it, so there is still one business.
 */
function townServiceFor(route) {
  const town = townFor(route);
  if (!town) return null;

  return {
    '@context': 'https://schema.org',
    '@type': 'Service',
    name: `Self drive car and bike rental in ${town.name}`,
    serviceType: 'Self drive vehicle rental',
    provider: { '@id': seo.site.origin + '#business' },
    areaServed: {
      '@type': 'City',
      name: town.name,
      containedInPlace: {
        '@type': 'AdministrativeArea',
        name: `${seo.site.district} district`,
      },
    },
    url: seo.site.origin + route.path,
  };
}

let written = 0;for (const route of routes) {
  const url = seo.site.origin + route.path;
  let html = rewrite(template, {
    title: escape(route.title),
    description: escape(route.description),
    url,
  });

  // Immediately before </head>, which is the last point the parser reaches
  // before the body.
  //
  // The banner photograph does not need one here. React emits a preload for an
  // image marked fetchPriority="high" as it renders, with the exact URL the
  // <img> ends up using -- and a second preload written by hand with the
  // absolute form of the same URL is a second download of the same file, which
  // is what the first version of this did.
  const extra = [breadcrumbFor(route), townServiceFor(route)]
    .filter(Boolean)
    .map((node) => `\n    <script type="application/ld+json">${JSON.stringify(node)}</script>`)
    .join('');

  if (extra !== '') {
    html = html.replace('</head>', () => `${extra}\n  </head>`);
  }

  if (renderRoute) {
    const body = await renderRoute(route.path);
    // A function replacement, not a string: markup is full of $ sequences and
    // "$&" in a replacement string means "the whole match", which would splice
    // the div back into the middle of the page.
    html = html.replace('<div id="root"></div>', () => `<div id="root">${body}</div>`);
  }

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
  routes
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
