import { useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { useHome } from '../content';
import { Reveal } from './Reveal';
import { SectionArt } from './art/SectionArt';
import { hasScene } from './art/scenes';

/**
 * What we hire, as a rail that moves on its own.
 *
 * Six cards in a three-wide grid is two rows, and the second row is under the
 * fold on a laptop and a long way down on a phone -- so half of what the
 * business does was seen only by somebody who kept scrolling. In a rail they
 * all go past on their own, and a card leaving the frame is what says there
 * is more of it.
 *
 * The list is rendered twice and the crawl wraps at the halfway mark, which
 * is what makes the loop seamless: at the wrap, the copy under the frame is
 * pixel for pixel what was there a moment before, so there is nothing to see.
 * The second copy is hidden from screen readers and from the tab order --
 * one set of six links is the page's content, the other is scenery.
 *
 * Native scrolling underneath, so a flick, a trackpad, shift-wheel, the
 * arrows and the keyboard all work while it moves. The crawl gets out of the
 * way the moment anybody touches it, and stays out for a couple of seconds
 * after; it also stops on hover, on focus, when the tab is in the background,
 * and entirely when the system asks for less motion.
 *
 * `showHeading` is off where a page banner has just said the same words: a
 * heading repeating the title directly above it reads as a rendering fault
 * rather than as a section.
 */

/** Pixels a second. Slow enough to read a card as it goes past. */
const SPEED = 26;

/** How long the crawl keeps out of the way after somebody scrolls it. */
const IDLE_MS = 2500;

export function Services({ showHeading = true }: { showHeading?: boolean }) {
  const home = useHome();
  const { eyebrow, heading, items } = home.services;

  // On the home page these cards sit under a section heading, so they are the
  // level below it. Without one -- the page title is the h1 and these are its
  // sections -- leaving them at h3 skips a level, which is what a screen
  // reader's outline is built from.
  const CardHeading = showHeading ? 'h3' : 'h2';

  const rail = useRef<HTMLDivElement>(null);
  const hold = useRef(false);
  const idleUntil = useRef(0);

  useEffect(() => {
    const el = rail.current;
    if (!el) return;

    const still = window.matchMedia('(prefers-reduced-motion: reduce)');
    let frame = 0;
    let last = performance.now();

    // The position is kept here rather than read back from the element each
    // frame. A browser stores the scroll offset in whole device pixels, so
    // scrollLeft += 0.4 is read back as the same number it was: the rail
    // would sit still at any speed under about 30 pixels a second, which is
    // most of the speeds worth using.
    let at = el.scrollLeft;

    const tick = (now: number) => {
      frame = requestAnimationFrame(tick);

      // Capped, because a tab that has been in the background for a minute
      // comes back with a minute's worth of elapsed time in one frame.
      const elapsed = Math.min(now - last, 50);
      last = now;

      // Standing down: follow wherever the reader has left it, so the crawl
      // carries on from there rather than snapping back.
      if (still.matches || hold.current || now < idleUntil.current || document.visibilityState !== 'visible') {
        at = el.scrollLeft;
        return;
      }

      const half = el.scrollWidth / 2;
      if (half <= 0) return;

      at += (SPEED * elapsed) / 1000;
      if (at >= half) at -= half;
      el.scrollLeft = at;
    };

    frame = requestAnimationFrame(tick);

    // Hover and focus stop it; a touch or a wheel stands it down for a while,
    // because someone mid-scroll should not be fighting it back.
    const stop = () => { hold.current = true; };
    const start = () => { hold.current = false; last = performance.now(); };
    const stand = () => { idleUntil.current = performance.now() + IDLE_MS; };

    el.addEventListener('pointerenter', stop);
    el.addEventListener('pointerleave', start);
    el.addEventListener('focusin', stop);
    el.addEventListener('focusout', start);
    el.addEventListener('wheel', stand, { passive: true });
    el.addEventListener('touchstart', stand, { passive: true });
    el.addEventListener('touchmove', stand, { passive: true });

    return () => {
      cancelAnimationFrame(frame);
      el.removeEventListener('pointerenter', stop);
      el.removeEventListener('pointerleave', start);
      el.removeEventListener('focusin', stop);
      el.removeEventListener('focusout', start);
      el.removeEventListener('wheel', stand);
      el.removeEventListener('touchstart', stand);
      el.removeEventListener('touchmove', stand);
    };
  }, [items.length]);

  const page = (direction: 1 | -1) => {
    const el = rail.current;
    if (!el) return;

    // One card and its gap, so a press lands on a card edge rather than
    // halfway through one.
    const card = el.querySelector('[data-rail-card]');
    const step = card ? card.getBoundingClientRect().width + 20 : el.clientWidth * 0.8;

    idleUntil.current = performance.now() + IDLE_MS;
    el.scrollBy({
      left: direction * step,
      behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches
        ? 'auto'
        : 'smooth',
    });
  };

  const card = (s: (typeof items)[number], copy: boolean) => (
    <div key={`${copy ? 'again-' : ''}${s.to}`} className="rail-item">
      <Link
        data-rail-card=""
        to={s.to}
        // The second set is scenery: the same six links again would be six
        // more stops for a keyboard and six more announcements for a screen
        // reader, saying nothing new either time.
        {...(copy ? { tabIndex: -1, 'aria-hidden': true } : {})}
        className="card-lift group flex h-full flex-col overflow-hidden rounded-[16px] border border-line bg-white shadow-[0_10px_30px_rgba(16,24,40,0.08)]"
      >
        {/* Falls back to a plain navy panel rather than breaking if a service
            is added to the content file before it has a scene.

            Described when it is a photograph, decorative when it is the
            drawing. SectionArt makes that call; what it needs from here is
            the sentence. An uploaded picture of a wedding car with alt="" is
            a picture Google cannot read, on a site whose traffic comes from
            searching for exactly that. */}
        {hasScene(s.to) ? (
          <SectionArt name={s.to} alt={copy ? '' : s.title} />
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
    </div>
  );

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

          {/* Hidden from a phone, where the gesture is the affordance. */}
          <div className="hidden shrink-0 gap-2 sm:flex">
            <button
              type="button"
              onClick={() => page(-1)}
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
              aria-label="More services"
              className="rail-btn"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </div>
        </div>

        {/* Inside the page's own column, not running to the window edge, with
            the cards fading out at both ends rather than being cut off. */}
        <div className="rail-mask mt-10">
          <div
            ref={rail}
            tabIndex={0}
            role="region"
            aria-label={heading}
            className="rail flex gap-5 overflow-x-auto pb-4"
          >
            {items.map((s) => card(s, false))}
            {items.map((s) => card(s, true))}
          </div>
        </div>
      </div>
    </section>
  );
}
