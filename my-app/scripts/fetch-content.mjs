import { readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

/**
 * Bakes the site's editable copy into the build.
 *
 * The admin panel stores edits; this pulls them in before Vite runs so the
 * words end up in the prerendered HTML. Fetching them in the browser instead
 * would put every paragraph behind JavaScript, which is the opposite of what
 * a site competing on local search wants -- and would take the public site
 * down with the admin server.
 *
 * Never fails the build. If the panel is unreachable, or returns something
 * unexpected, the copy committed in defaults.json is used and the build says
 * so. A site that will not deploy because a shared host had a bad minute is
 * worse than one that deploys last week's wording.
 */

const here = dirname(fileURLToPath(import.meta.url));
const app = dirname(here);

const DEFAULTS = join(app, 'src/content/defaults.json');
const LIVE = join(app, 'src/content/live.json');
const ADMIN_COPY = join(
  app,
  '../admin/content-defaults.json',
);

// The panel used to live on its own subdomain, and this still pointed there
// long after the move. admin.niteshacars.in has no certificate, so every build
// silently failed this fetch and shipped the defaults -- meaning nothing typed
// into "Website content" in the panel ever reached the site, and nothing said
// so louder than one line in a build log. The panel is part of the site now,
// so the address comes from the same place the canonical URLs do.
const { site } = JSON.parse(
  await readFile(join(app, 'src/data/seo.json'), 'utf8'),
);

const API =
  process.env.CONTENT_API ?? `${site.origin}/admin/api/public-content.php`;

const TIMEOUT_MS = 10_000;

const defaults = JSON.parse(await readFile(DEFAULTS, 'utf8'));

// The admin server never receives this repository, so it carries its own copy
// of the defaults to prefill the edit form. If the two drift, the form shows
// one thing and the site ships another -- so treat a mismatch as a build
// error rather than a curiosity.
try {
  const adminCopy = await readFile(ADMIN_COPY, 'utf8');
  const mine = await readFile(DEFAULTS, 'utf8');
  if (adminCopy !== mine) {
    console.error(
      'fetch-content: defaults.json and the admin panel\'s copy differ.\n' +
        '  ' + DEFAULTS + '\n' +
        '  ' + ADMIN_COPY + '\n' +
        'Copy one over the other so the edit form and the site agree.',
    );
    process.exit(1);
  }
} catch (err) {
  if (err?.code !== 'ENOENT') throw err;
  // The admin tree is not always checked out beside the app; that is fine.
}

/**
 * Only sections the site knows about, and only when the shape still matches.
 *
 * An override is written by a form, but it arrives here over the network from
 * a server that could be mid-deploy or mid-migration. Anything that does not
 * look like the default it replaces is dropped in favour of that default, so
 * one malformed row cannot empty a section of the live site.
 */
function merge(base, incoming) {
  if (!incoming || typeof incoming !== 'object') return base;

  const out = structuredClone(base);
  for (const [page, sections] of Object.entries(base)) {
    for (const section of Object.keys(sections)) {
      const candidate = incoming?.[page]?.[section];
      if (!candidate || typeof candidate !== 'object' || Array.isArray(candidate)) {
        continue;
      }
      const expected = Object.keys(sections[section]);
      const got = Object.keys(candidate);
      const missing = expected.filter((k) => !got.includes(k));
      if (missing.length > 0) {
        console.warn(
          `fetch-content: ${page}.${section} is missing ${missing.join(', ')} — keeping the shipped copy`,
        );
        continue;
      }
      out[page][section] = candidate;
    }
  }
  return out;
}

let content = defaults;
let source = 'defaults (no fetch attempted)';

if (process.env.CONTENT_API !== 'off') {
  try {
    const res = await fetch(API, {
      headers: { accept: 'application/json' },
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);

    const body = await res.json();
    if (!body?.ok) throw new Error('unexpected response shape');

    // The panel sends only what has been edited; the defaults are already
    // here. It used to send both, which is the only thing that made the
    // endpoint depend on files a hand-updated panel does not have.
    content = merge(defaults, body.overrides ?? {});

    if (body.ready === false) {
      console.warn(
        'fetch-content: the panel has no content table yet, so nothing can be edited.\n' +
          '  Open Website content in the admin and press "Set up content storage".',
      );
    }
    const edited = Object.entries(content).flatMap(([page, sections]) =>
      Object.keys(sections).filter(
        (s) => JSON.stringify(sections[s]) !== JSON.stringify(defaults[page][s]),
      ),
    );
    source = edited.length
      ? `admin panel (${edited.length} section(s) edited: ${edited.join(', ')})`
      : 'admin panel (nothing edited yet)';
  } catch (err) {
    source = `defaults — could not reach the panel (${err.message})`;
  }
}

await writeFile(LIVE, JSON.stringify(content, null, 2) + '\n');
console.log(`fetch-content: ${source}`);
