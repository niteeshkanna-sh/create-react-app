import { Link } from 'react-router-dom';
import { useHome } from '../content';
import { Reveal } from './Reveal';

/**
 * The three bookings worth asking for.
 *
 * It was three identical cards on a navy band, each with an eyebrow, a
 * paragraph, a bordered panel of four bullets and a full-width button --
 * about two hundred and fifty words in a row of boxes, at the point in the
 * page where somebody is still deciding whether to keep scrolling.
 *
 * Now: one sentence each, on the page's own cream, in two kinds of card. The
 * first is the one worth the most, so it is the big one -- gold, tall, with
 * a solid button. The others are quiet white rows beside it, the icon on the
 * left where a list's marker would be.
 *
 * Three shapes rather than three of the same shape, because a row of equal
 * cards says these are equal choices, and they are not: one is a month of
 * hire, one is a booking made from another country, one is a wedding.
 *
 * Deliberately not the card the Services grid above uses -- picture on top,
 * title, line, link. Two sections of the same card on one page reads as one
 * long list that lost its heading.
 */

/** One drawn mark per service, rather than an emoji typed into the panel. */
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

function Mark({ to, size = 22 }: { to: string; size?: number }) {
  return (
    <svg
      width={size}
      height={size}
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

export function Highlights() {
  const home = useHome();
  const { eyebrow, heading, items } = home.highlights;
  if (items.length === 0) return null;

  const [feature, ...rest] = items;

  return (
    <section className="bg-cream py-16 sm:py-20">
      <div className="mx-auto max-w-[86rem] px-5 sm:px-8 lg:px-12">
        <Reveal>
          <p className="text-sm font-bold tracking-widest text-gold-deep uppercase">{eyebrow}</p>
          <h2 className="mt-2 max-w-3xl text-3xl font-bold tracking-tight text-navy sm:text-4xl">
            {heading}
          </h2>
        </Reveal>

        <div className="mt-9 grid gap-5 lg:grid-cols-2">
          {/* The big one. Gold rather than white, so the eye lands here
              first and the two beside it read as the alternatives. */}
          <Reveal className="h-full">
            <Link
              to={feature.to}
              className="card-lift group flex h-full flex-col justify-between overflow-hidden rounded-[18px] bg-gradient-to-br from-[#FFF4DC] via-[#FFE6B8] to-[#F6CE86] p-8 sm:p-10"
            >
              <div>
                <span className="grid size-12 place-items-center rounded-2xl bg-navy text-gold">
                  <Mark to={feature.to} size={24} />
                </span>
                <h3 className="mt-6 text-2xl font-bold tracking-tight text-navy sm:text-3xl">
                  {feature.title}
                </h3>
                <p className="mt-3 max-w-md leading-relaxed text-navy/70">{feature.body}</p>
              </div>

              <span className="mt-8 inline-flex w-fit items-center gap-2 rounded-xl bg-navy px-5 py-3 text-sm font-semibold text-white transition group-hover:bg-navy-deep">
                {feature.cta}
                <span aria-hidden="true" className="transition group-hover:translate-x-1">
                  →
                </span>
              </span>
            </Link>
          </Reveal>

          {/* The other two, stacked beside it: a row each, the mark on the
              left where a list's marker would be. */}
          <div className="grid gap-5">
            {rest.map((h, i) => (
              <Reveal key={h.to} delay={(i + 1) * 90} className="h-full">
                <Link
                  to={h.to}
                  className="card-lift group flex h-full items-start gap-5 rounded-[18px] border border-line bg-white p-6 sm:p-7"
                >
                  <span className="mt-0.5 grid size-11 shrink-0 place-items-center rounded-full border border-gold/45 bg-gold/10 text-gold-deep">
                    <Mark to={h.to} />
                  </span>

                  <span className="min-w-0">
                    <h3 className="text-lg font-bold tracking-tight text-navy sm:text-xl">
                      {h.title}
                    </h3>
                    <span className="mt-1.5 block text-sm leading-relaxed text-ink-dim">
                      {h.body}
                    </span>
                    <span className="mt-3 inline-flex items-center gap-1.5 text-sm font-semibold text-gold-deep">
                      {h.cta}
                      <span aria-hidden="true" className="transition group-hover:translate-x-1">
                        →
                      </span>
                    </span>
                  </span>
                </Link>
              </Reveal>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
