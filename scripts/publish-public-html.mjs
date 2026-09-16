// Rebuilds public_html/ from the site build.
//
// Hostinger's Git deployment is what puts this site online, and it does exactly
// one thing: clone the repository and publish the folder named in its "Root
// directory" setting, which is public_html. It runs no build -- the deployment
// that proved this took seven seconds -- so whatever is committed in
// public_html IS the website, verbatim.
//
// For months that folder held five leftover images and no index.html, so Apache
// had nothing to serve at the root and answered 403 Forbidden. The site was
// never wiped; it was never published in the first place.
//
// Committing build output is not something to do lightly. It is the right
// answer here because the host cannot build, so the repository has to carry the
// built thing. This makes that a command rather than a memory exercise:
//
//     npm run publish
//
// then commit what it changed. The folder is generated -- editing a file inside
// public_html by hand is always wrong, because the next run overwrites it.

import { cp, mkdir, rm, stat, readdir } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const dist = join(root, 'my-app', 'dist');
const target = join(root, 'public_html');

try {
  await stat(join(dist, 'index.html'));
} catch {
  console.error(
    `publish: no build at ${dist}\n` +
      '  Run the build first:  npm run build',
  );
  process.exit(1);
}

// Rebuilt from empty rather than copied over. A page deleted from the site has
// to disappear from the server too, and copying on top would leave it there
// permanently -- which is how a dead page outlives three redesigns.
await rm(target, { recursive: true, force: true });
await mkdir(target, { recursive: true });
await cp(dist, target, { recursive: true });

// The three files whose absence takes the whole site down. Checked here rather
// than discovered in a browser: a missing index.html is a 403 on the domain
// root, and a missing admin/index.php is the panel gone.
const required = ['index.html', '.htaccess', join('admin', 'index.php')];
const missing = [];
for (const file of required) {
  try {
    await stat(join(target, file));
  } catch {
    missing.push(file);
  }
}

if (missing.length > 0) {
  console.error(
    `publish: the build produced no ${missing.join(', ')} — refusing to publish a broken site.`,
  );
  process.exit(1);
}

async function count(dir) {
  let n = 0;
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    n += entry.isDirectory() ? await count(join(dir, entry.name)) : 1;
  }
  return n;
}

console.log(
  `publish: ${await count(target)} files into public_html — commit them, and the ` +
    'next push is the deploy',
);
