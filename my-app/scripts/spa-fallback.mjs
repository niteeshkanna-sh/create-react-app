/**
 * GitHub Pages serves static files and knows nothing about client-side routes,
 * so a direct visit to /about or a refresh on /cars returns its 404 page and
 * the app never boots. Pages does, however, serve 404.html for any path it
 * cannot match -- so an exact copy of index.html there loads the app, and the
 * router resolves the URL as usual.
 *
 * Copied rather than symlinked: the Pages artifact upload does not follow
 * symlinks. Written in Node rather than `cp` so the build works on Windows.
 */
import { copyFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const dist = join(import.meta.dirname, '..', 'dist');
const index = join(dist, 'index.html');
const fallback = join(dist, '404.html');

if (!existsSync(index)) {
  console.error('spa-fallback: dist/index.html is missing; run the build first.');
  process.exit(1);
}

copyFileSync(index, fallback);
console.log('spa-fallback: wrote dist/404.html');
