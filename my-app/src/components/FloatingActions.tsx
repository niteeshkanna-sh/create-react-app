import { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import seo from '../data/seo.json';

/**
 * The two buttons that follow you down the page: WhatsApp, and back to the top.
 *
 * Fixed to the bottom-right and stacked, clear of the WhatsApp button's own
 * habit of being the thing people reach for. Back-to-top only appears once
 * there is something to go back to — a button that scrolls to where you
 * already are is a button that teaches people to ignore it.
 *
 * WhatsApp is left off the home page. The enquiry card in the banner carries
 * its own, full width and labelled in words, and two of the same offer on one
 * screen is one of them being ignored -- on a phone they were within a
 * thumb's width of each other.
 *
 * Back-to-top stays there. It is the longest page on the site and it is the
 * one control the banner does not duplicate.
 */
export function FloatingActions() {
  const [scrolled, setScrolled] = useState(false);
  const { pathname } = useLocation();
  // Both spellings of the same route, because a trailing slash is what a link
  // from outside often carries and a missing button is not something anybody
  // would connect back to it.
  const onHome = pathname === '/' || pathname === '';

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 600);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const number = seo.site.phone.replace(/[^0-9]/g, '');
  const message = encodeURIComponent('Hello, I would like to enquire about a vehicle.');

  return (
    <div className="fixed right-4 bottom-4 z-40 flex flex-col items-end gap-3 print:hidden">
      <button
        type="button"
        onClick={() =>
          window.scrollTo({
            top: 0,
            // Respected here rather than assumed: someone who has asked their
            // system for less motion should not be thrown up the page.
            behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches
              ? 'auto'
              : 'smooth',
          })
        }
        aria-label="Back to the top of the page"
        // Kept in the DOM and faded out rather than unmounted, so it does not
        // appear under a thumb that is already on its way down.
        className={`grid size-12 place-items-center rounded-full border border-gold/40 bg-navy text-gold-light shadow-lg transition hover:bg-navy-deep focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold ${
          scrolled ? 'opacity-100' : 'pointer-events-none translate-y-2 opacity-0'
        }`}
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M12 19V5" />
          <path d="M5 12l7-7 7 7" />
        </svg>
      </button>

      {onHome ? null : (
      <a
        href={`https://wa.me/${number}?text=${message}`}
        target="_blank"
        rel="noopener noreferrer"
        aria-label="Message us on WhatsApp"
        className="grid size-14 place-items-center rounded-full bg-[#25D366] text-[#04310f] shadow-lg transition hover:bg-[#1eb855] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-navy"
      >
        <svg width="28" height="28" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
          <path d="M12.04 2C6.58 2 2.13 6.45 2.13 11.91c0 1.75.46 3.45 1.32 4.95L2 22l5.25-1.38a9.9 9.9 0 0 0 4.79 1.22c5.46 0 9.9-4.45 9.9-9.91 0-2.65-1.03-5.14-2.9-7.01A9.82 9.82 0 0 0 12.04 2zm0 18.13a8.2 8.2 0 0 1-4.2-1.15l-.3-.18-3.12.82.83-3.04-.2-.31a8.2 8.2 0 0 1-1.26-4.36c0-4.54 3.7-8.23 8.25-8.23a8.2 8.2 0 0 1 8.24 8.24c0 4.54-3.7 8.21-8.24 8.21z" />
          <path d="M17.47 14.38c-.3-.15-1.75-.86-2.02-.96-.27-.1-.47-.15-.67.15-.2.3-.77.96-.94 1.16-.17.2-.35.22-.64.07-.3-.15-1.25-.46-2.38-1.47-.88-.79-1.48-1.76-1.65-2.05-.17-.3-.02-.46.13-.6.14-.14.3-.35.45-.53.15-.18.2-.3.3-.5.1-.2.05-.38-.02-.53-.08-.15-.67-1.6-.92-2.2-.24-.58-.49-.5-.67-.51h-.57c-.2 0-.52.07-.8.38-.27.3-1.04 1.02-1.04 2.48s1.07 2.88 1.22 3.08c.15.2 2.1 3.2 5.08 4.49.71.3 1.26.49 1.7.63.71.23 1.36.2 1.87.12.57-.09 1.75-.72 2-1.41.25-.7.25-1.29.17-1.42-.07-.13-.27-.2-.57-.35z" />
        </svg>
      </a>
      )}
    </div>
  );
}
