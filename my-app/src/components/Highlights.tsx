import { Link } from 'react-router-dom';
import { useHome } from '../content';
import { Reveal } from './Reveal';

/**
 * One drawn mark per service, rather than an emoji typed into the panel.
 *
 * The three were 🗓 ✈ 💍, and a browser draws the first two as flat black
 * glyphs and the third in full colour, so the row read as two missing icons
 * and a ring. These are the same weight as each other and take the gold.
 */
const MARKS: Record<string, React.ReactNode> = {
  '/monthly': (
    <>
      <rect x="3" y="5" width="18" height="16" rx="3" />
      <path d="M8 3v4M16 3v4M3 10h18" />
      <path d="M8 14h3" />
    </>
  ),
  '/nri': (
    <>
      <path d="M2.5 13.2 21 5l-4.2 8.6-2.3 6.9-2.6-4.6-4.6-2.6z" />
      <path d="M9.3 14.7 21 5" />
    </>
  ),
  // Two rings, and nothing else. A diamond on top of them as well was three
  // shapes inside 22 pixels, which reads as a smudge rather than as rings.
  '/wedding-cars': (
    <>
      <circle cx="9" cy="14" r="5.4" />
      <circle cx="15" cy="14" r="5.4" />
    </>
  ),
};

const DEFAULT_MARK = (
  <>
    <path d="M12 3v4M12 17v4M3 12h4M17 12h4" />
    <circle cx="12" cy="12" r="3.2" />
  </>
);

function Mark({ to }: { to: string }) {
  return (
    <svg
      width="22"
      height="22"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {MARKS[to] ?? DEFAULT_MARK}
    </svg>
  );
}

/**
 * The three bookings worth asking for, on one dark band.
 *
 * It was three cards, each with an eyebrow, a paragraph, a bordered panel
 * with a heading and four bullets, and a full-width gold button. Three of
 * those side by side is a wall: about a hundred and forty words and twelve
 * bullets in a row of boxes, at the point in the page where somebody is still
 * deciding whether to keep scrolling. Nobody reads a wall.
 *
 * So there is one sentence each, and the boxes are gone. Three columns
 * divided by hairlines read as one band rather than three objects, which is
 * what they are -- and what is left says just enough to earn the click to the
 * page where the detail actually lives.
 */
export function Highlights() {
  const home = useHome();
  const { items } = home.highlights;

  return (
    <section className="bg-navy py-14 sm:py-16">
      <div
        className="mx-auto grid max-w-[86rem] gap-px overflow-hidden px-5 sm:px-8 lg:grid-cols-3 lg:px-12"
      >
        {items.map((h, i) => (
          <Reveal key={h.to} delay={i * 90} className="h-full">
            {/* The hairline between columns, and between rows once they
                stack. Drawn with a border rather than divide-* so the first
                one in each direction can be left off without a second rule
                fighting it. */}
            <div
              className={[
                'flex h-full flex-col px-0 py-7 sm:py-8',
                i > 0 ? 'border-t border-white/10 lg:border-t-0 lg:border-l lg:pl-10' : '',
                i < items.length - 1 ? 'lg:pr-10' : '',
              ].join(' ')}
            >
              <span className="grid size-11 shrink-0 place-items-center rounded-full border border-gold/30 text-gold">
                <Mark to={h.to} />
              </span>

              <h3 className="mt-4 text-lg font-bold tracking-tight text-white sm:text-xl">
                {h.title}
              </h3>

              <p className="mt-2 max-w-sm text-sm leading-relaxed text-white/60">{h.body}</p>

              {/* mt-auto, so the three links sit on one line however the
                  sentences above them wrap. */}
              <div className="mt-auto pt-5">
                <Link
                  to={h.to}
                  className="group inline-flex items-center gap-2 text-sm font-semibold text-gold transition hover:text-gold-light focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-gold"
                >
                  {h.cta}
                  <span
                    aria-hidden="true"
                    className="transition-transform group-hover:translate-x-0.5"
                  >
                    →
                  </span>
                </Link>
              </div>
            </div>
          </Reveal>
        ))}
      </div>
    </section>
  );
}
