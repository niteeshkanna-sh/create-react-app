import { photoFor } from '../lib/photos';
import { SectionArt } from '../components/art/SectionArt';
import type { SceneName } from '../components/art/scenes';

interface PageHeaderProps {
  title: string;
  intro?: string;
  /**
   * Photo slot for this page's banner -- a filename in public/photos without
   * its extension, e.g. `cars-hero`.
   */
  photo?: string;
  /** Drawn behind the title until that photograph exists. */
  scene?: SceneName;
}

/**
 * The navy band every inner page opens with.
 *
 * With a photograph it becomes a banner; with neither a photograph nor a
 * scene it stays the flat navy band it has always been. That ordering is
 * deliberate -- a page that gains a photograph should not need a code change,
 * and a page that never gets one should not look unfinished.
 *
 * The scrim is not optional. These titles are white on whatever the picture
 * happens to be doing underneath, and a bright sky behind white type is
 * unreadable. The alphas below hold the text above 4.5:1 even against a
 * pure-white photograph, so legibility never depends on the crop.
 */
export function PageHeader({ title, intro, photo, scene }: PageHeaderProps) {
  const src = photo ? photoFor(photo) : undefined;

  return (
    <section className="relative isolate overflow-hidden bg-navy text-white">
      {/* A photograph fills the band; a drawing does not.

          The two need different treatment rather than one shared one. A photo
          can be any brightness, so it gets the full-bleed crop and the heavy
          scrim that keeps white type legible over a white sky. A drawing is
          already dark navy and already on-palette, so the same scrim reduced
          it to a smudge -- and a banner is about 5:1 while the scenes are 2:1,
          so filling the width cropped the subject in half. Inset on the right
          and faded into the navy, it reads as an illustrated band instead. */}
      {src ? (
        <>
          <img
            src={src}
            alt=""
            aria-hidden="true"
            // The biggest thing above the fold, so it is fetched at high
            // priority rather than lazily: a lazy banner paints the page twice.
            fetchPriority="high"
            decoding="async"
            className="absolute inset-0 h-full w-full object-cover"
          />
          <div aria-hidden="true" className="page-scrim absolute inset-0" />
        </>
      ) : scene ? (
        // Hidden below lg, where the text column spans the full width and the
        // illustration would sit behind the words rather than beside them.
        <div
          aria-hidden="true"
          className="banner-art absolute inset-y-0 right-0 hidden w-1/2 lg:block"
        >
          <SectionArt name={scene} className="h-full" />
        </div>
      ) : null}

      <div className="relative mx-auto max-w-6xl px-5 py-14 sm:py-20">
        <h1 className="text-3xl font-bold tracking-tight sm:text-5xl">{title}</h1>
        {intro ? (
          <p className="mt-4 max-w-2xl leading-relaxed text-white/80">{intro}</p>
        ) : null}
      </div>

      <div className="gold-rule relative" />
    </section>
  );
}
