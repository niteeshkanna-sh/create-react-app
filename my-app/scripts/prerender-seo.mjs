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

/** Replace the content of a meta/title/canonical tag, leaving the rest alone. */
function rewrite(html, { title, description, url }) {
  return html
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
    );
}

const escape = (s) =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

let written = 0;
for (const route of seo.routes) {
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

const today = new Date().toISOString().slice(0, 10);
const sitemap =
  '<?xml version="1.0" encoding="UTF-8"?>\n' +
  '<urlset xmlns="http://www.sitemap.org/schemas/sitemap/0.9">\n'.replace(
    'www.sitemap.org',
    'www.sitemaps.org',
  ) +
  seo.routes
    .map(
      (r) =>
        `  <url>\n    <loc>${seo.site.origin}${r.path}</loc>\n` +
        `    <lastmod>${today}</lastmod>\n` +
        `    <priority>${r.priority}</priority>\n  </url>`,
    )
    .join('\n') +
  '\n</urlset>\n';

writeFileSync(join(dist, 'sitemap.xml'), sitemap);

console.log(
  `prerender-seo: ${written} routes, plus sitemap.xml and the 404 fallback`,
);
