import { useCallback, useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { useHome } from '../content';
import { Reveal } from './Reveal';
import { SectionArt } from './art/SectionArt';
import { hasScene } from './art/scenes';

/**
 * What we hire, as a rail rather than a grid.
 *
 * Six cards in a three-wide grid is two rows, and the second row is under the
 * fold on a laptop and a long way down on a phone -- so half of what the
 * business does was only seen by somebody who kept scrolling. In a rail they
 * are all in the same gesture: four visible, the rest a flick or a button
 * away, and the card half off the right edge is what says there is more.
 *
 * Native scrolling rather than a slider library. The browser already does
 * momentum, touch, trackpads, shift-wheel, keyboard arrows and the scrollbar;
 * a library would reimplement all six and get one of them wrong. The buttons
 * are scrollBy() with smooth behaviour on top of it, which is the one thing
 * native scrolling has no affordance for on a desktop.
 *
 * `showHeading` is off where a page banner has just said the same words: a
 * heading repeating the title directly above it reads as a rendering fault
 * rather than as a section.
 */
export function Services({ showHeading = true }: { showHeading?: boolean }) {
  const home = useHome();
  const { eyebrow, heading, items } = home.services;

  // On the home page these cards sit under a section heading, so they are the
  // level below it. Without one -- the page title is the h1 and these are its
  // sections -- leaving them at h3 skips a level, which is what a screen
  // reader's outline is built from.
  const CardHeading = showHeading ? 'h3' : 'h2';

  const rail = useRef<HTMLDivElement>(null);
  const [atStart, setAtStart] = useState(true);
  const [atEnd, setAtEnd] = useState(false);

  // Which arrows are worth offering. A button that scrolls nowhere is worse
  // than no button: it says the rail is broken rather than finished.
  const measure = useCallback(() => {
    const el = rail.current;
    if (!el) return;
    const max = el.scrollWidth - el.clientWidth;
    setAtStart(el.scrollLeft <= 2);
    setAtEnd(el.scrollLeft >= max - 2);
  }, []);

  useEffect(() => {
    measure();
    window.addEventListener('resize', measure);
    return () => window.removeEventListener('resize', measure);
  }, [measure, items.length]);

  const page = (direction: 1 | -1) => {
    const el = rail.current;
    if (!el) return;

    // One card and its gap, so a press lands on a card edge rather than
    // halfway through one. Falling back to most of the viewport if the rail
    // is empty, which it never is by the time a button can be pressed.
    const card = el.querySelector('[data-rail-card]');
    const step = card ? card.getBoundingClientRect().width + 20 : el.clientWidth * 0.8;

    el.scrollBy({
      left: direction * step,
      behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches
        ? 'auto'
        : 'smooth',
    });
  };

  return (
    <section className="py-20">
      <div className="mx-auto max-w-[86rem] px-5 sm:px-8 lg:px-12">
        <div className="flex items-end justify-between gap-6">
          {showHeading ? (
            <Reveal>
              <p className="section-eyebrow">{eyebrow}</p>
              <h2 className="mt-2 text-3xl font-bold tracking-tight text-navy sm:text-4xl">
                {heading}
              </h2>
            </Reveal>
          ) : (
            <span />
          )}

          {/* Hidden where there is nothing to scroll to, and from a phone,
              where the gesture is the affordance. */}
          <div className="hidden shrink-0 gap-2 sm:flex">
            <button
              type="button"
              onClick={() => page(-1)}
              disabled={atStart}
              aria-label="Previous services"
              className="rail-btn"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M15 5l-7 7 7 7" />
              </svg>
            </button>
            <button
              type="button"
              onClick={() => page(1)}
              disabled={atEnd}
              aria-label="More services"
              className="rail-btn"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </div>
        </div>
      </div>

      {/* Full-bleed, with the page's own padding as the rail's first and last
          gap: a rail that stops at the text column looks like a grid that
          overflowed, and the card running off the edge is the thing that says
          it scrolls. */}
      <div
        ref={rail}
        onScroll={measure}
        tabIndex={0}
        role="region"
        aria-label={heading}
        className="rail mt-10 flex snap-x snap-mandatory gap-5 overflow-x-auto px-5 pb-4 sm:px-8 lg:px-12"
      >
        {items.map((s, i) => (
          <Reveal key={s.to} delay={Math.min(i, 3) * 70} className="rail-item">
            <Link
              data-rail-card=""
              to={s.to}
              className="card-lift group flex h-full snap-start flex-col overflow-hidden rounded-[16px] border border-line bg-white shadow-[0_10px_30px_rgba(16,24,40,0.08)]"
            >
              {/* Falls back to a plain navy panel rather than breaking if a
                  service is added to the content file before it has a scene.

                  Described when it is a photograph, decorative when it is the
                  drawing. SectionArt makes that call; what it needs from here
                  is the sentence. An uploaded picture of a wedding car with
                  alt="" is a picture Google cannot read, on a site whose
                  traffic comes from searching for exactly that. */}
              {hasScene(s.to) ? (
                <SectionArt name={s.to} alt={s.title} />
              ) : (
                <div className="art-frame" />
              )}

              <div className="flex flex-1 flex-col p-5">
                <CardHeading className="text-lg font-semibold text-navy">{s.title}</CardHeading>
                <p className="mt-2 text-sm leading-relaxed text-ink-dim">{s.body}</p>
                <span className="mt-4 inline-flex items-center gap-1 text-sm font-semibold text-gold-deep">
                  See details
                  <span aria-hidden="true" className="transition group-hover:translate-x-1">
                    →
                  </span>
                </span>
              </div>
            </Link>
          </Reveal>
        ))}
      </div>
    </section>
  );
}
