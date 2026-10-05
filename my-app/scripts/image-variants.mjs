// AVIF siblings for the committed pictures.
//
// Two images in public/ are fetched above the fold by every visitor: the
// banner on the home page -- which is the home page's largest contentful
// paint, so it is literally what Google times the page by -- and the logo
// lockup in the header of every page. Both already have hand-made -800w.webp
// style copies beside them at the widths the markup asks for. This writes an
// .avif next to each of those, at the same widths.
//
// AVIF only. The WebP copies are the owner's own encodes and are left exactly
// as they are: re-encoding a lossy file into a lossy file loses a generation
// for nothing, and the gain here is the format, not the quality setting. Every
// byte this saves is saved without touching what already works.
//
//     node scripts/image-variants.mjs
//
// It runs first in `npm run build`, and everything it writes lands in public/
// and is committed -- because Hostinger clones this repository into the
// document root and runs no build, so a file that exists only in a build is a
// file the website does not have.
//
// Alongside WebP rather than instead of it. Safari has read AVIF since 16.4
// and Chrome since 85, which is nearly everybody, but <picture> costs nothing
// for the ones it is not: a browser that cannot read the AVIF source skips it
// and takes the WebP underneath, which is the file it gets today.
//
// Like fetch-content.mjs, this never fails the build. sharp is a native
// dependency, and a machine that cannot install it should still be able to
// publish the site from what is committed -- it just publishes the pictures
// that are already there, and says so.

import { createRequire } from 'node:module';
import { readFile, stat, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const publicDir = join(here, '..', 'public');

/**
 * What to make, and how wide.
 *
 * The widths are the ones the components ask for in their srcSet, and the two
 * lists have to agree: a width here the markup never names is a file nobody
 * downloads, and a width in the markup missing here is a 404 at exactly the
 * screen size that asks for it.
 *
 * quality is per picture because they are different kinds of image. The
 * photograph carries noise and gradients and hides a lower number; the logo is
 * flat colour and hard edges, where the same number shows as mush around the
 * lettering.
 */
const PICTURES = [
  {
    file: 'mountain-road-at-sunrise-self-drive-car-rental.webp',
    widths: [800, 1280],
    quality: 52,
  },
  {
    file: 'nitesha-cars-and-bikes-logo-nagercoil-v2.webp',
    widths: [240, 400, 800],
    quality: 60,
  },
];

let sharp;
try {
  sharp = createRequire(import.meta.url)('sharp');
} catch {
  console.log(
    'image-variants: sharp is not installed, so the committed pictures are left as they are.',
  );
  process.exit(0);
}

const written = [];
const kept = [];

for (const picture of PICTURES) {
  const source = join(publicDir, picture.file);

  let original;
  try {
    original = await readFile(source);
  } catch {
    console.log(`image-variants: ${picture.file} is not in public/, skipping it.`);
    continue;
  }

  const full = original.byteLength;
  const stem = picture.file.replace(/\.webp$/, '');

  // The full-size AVIF as well as the narrow ones: it is the last entry in
  // every srcSet, and a desktop at two times density really does ask for it.
  const jobs = [
    { name: `${stem}.avif`, width: null },
    ...picture.widths.map((w) => ({ name: `${stem}-${w}w.avif`, width: w })),
  ];

  for (const job of jobs) {
    const target = join(publicDir, job.name);

    // Only when the source is newer, so a publish that changes nothing
    // rewrites nothing -- an encoder is not required to be byte-for-byte
    // repeatable, and a file that changes on every run is a file that shows up
    // in every commit.
    const sourceTime = (await stat(source)).mtimeMs;
    const targetTime = await stat(target).then((s) => s.mtimeMs).catch(() => 0);
    if (targetTime > sourceTime) {
      kept.push(job.name);
      continue;
    }

    let pipeline = sharp(original);
    if (job.width) pipeline = pipeline.resize({ width: job.width, withoutEnlargement: true });

    const out = await pipeline.avif({ quality: picture.quality, effort: 6 }).toBuffer();
    await writeFile(target, out);
    written.push({ name: job.name, bytes: out.byteLength, of: full });
  }
}

if (written.length === 0) {
  console.log(`image-variants: ${kept.length} copies already current, nothing to write.`);
} else {
  for (const w of written) {
    console.log(
      `image-variants: ${w.name} — ${(w.bytes / 1024).toFixed(1)} KB` +
        ` (${Math.round((w.bytes / w.of) * 100)}% of the original)`,
    );
  }
  console.log(
    `image-variants: wrote ${written.length}, left ${kept.length} already current.` +
      ' Commit what changed -- the server runs no build.',
  );
}
