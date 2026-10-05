import { useEffect, useRef } from 'react';

/**
 * A rail of cards that moves on its own.
 *
 * Written once and used by every rail on the site. It was the inside of
 * Services.tsx until the places on the home page wanted the same behaviour,
 * and a hundred lines of scroll arithmetic copied into a second file is a
 * hundred lines that will be fixed in one of them.
 *
 * The caller renders its list twice and the crawl wraps at the halfway mark,
 * which is what makes the loop seamless: at the wrap, the copy under the
 * frame is pixel for pixel what was there a moment before, so there is
 * nothing to see. The second copy belongs out of the tab order and out of the
 * accessibility tree -- one set of links is the page's content, the other is
 * scenery.
 *
 * Native scrolling underneath, so a flick, a trackpad, shift-wheel, the
 * arrows and the keyboard all work while it moves. The crawl gets out of the
 * way the moment anybody touches it and stays out for a couple of seconds
 * after; it also stops on hover, on focus, when the tab is in the background,
 * and entirely when the system asks for less motion.
 *
 * It does not run until the rail is on screen, and stops again when it
 * leaves. Both rails on the home page are below the fold, so without this
 * they spend the whole of the first load animating something nobody can see
 * -- on the one thread that is also parsing the page -- and then carry on
 * animating it for as long as the tab is open. A thing that moves where it
 * cannot be seen is all cost.
 */

/** Pixels a second. Slow enough to read a card as it goes past. */
const SPEED = 26;

/** How long the crawl keeps out of the way after somebody scrolls it. */
const IDLE_MS = 2500;

export function useRailCrawl(itemCount: number) {
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
      if (
        still.matches ||
        hold.current ||
        now < idleUntil.current ||
        document.visibilityState !== 'visible'
      ) {
        at = el.scrollLeft;
        return;
      }

      const half = el.scrollWidth / 2;
      if (half <= 0) return;

      at += (SPEED * elapsed) / 1000;
      if (at >= half) at -= half;
      el.scrollLeft = at;
    };

    // Only while it is on screen. The margin starts it a little before the
    // rail arrives, so it is already moving when it comes into view rather
    // than visibly starting as somebody looks at it.
    const watch = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          if (!frame) {
            last = performance.now();
            frame = requestAnimationFrame(tick);
          }
        } else if (frame) {
          cancelAnimationFrame(frame);
          frame = 0;
        }
      },
      { rootMargin: '200px 0px' },
    );
    watch.observe(el);

    // Hover and focus stop it; a touch or a wheel stands it down for a while,
    // because someone mid-scroll should not be fighting it back.
    const stop = () => {
      hold.current = true;
    };
    const start = () => {
      hold.current = false;
      last = performance.now();
    };
    const stand = () => {
      idleUntil.current = performance.now() + IDLE_MS;
    };

    el.addEventListener('pointerenter', stop);
    el.addEventListener('pointerleave', start);
    el.addEventListener('focusin', stop);
    el.addEventListener('focusout', start);
    el.addEventListener('wheel', stand, { passive: true });
    el.addEventListener('touchstart', stand, { passive: true });
    el.addEventListener('touchmove', stand, { passive: true });

    return () => {
      watch.disconnect();
      cancelAnimationFrame(frame);
      el.removeEventListener('pointerenter', stop);
      el.removeEventListener('pointerleave', start);
      el.removeEventListener('focusin', stop);
      el.removeEventListener('focusout', start);
      el.removeEventListener('wheel', stand);
      el.removeEventListener('touchstart', stand);
      el.removeEventListener('touchmove', stand);
    };
  }, [itemCount]);

  /** One card and its gap, so a press lands on a card edge rather than halfway through one. */
  const page = (direction: 1 | -1) => {
    const el = rail.current;
    if (!el) return;

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

  return { rail, page };
}
