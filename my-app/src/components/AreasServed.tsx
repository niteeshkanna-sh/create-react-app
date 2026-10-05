import { Link } from 'react-router-dom';
import pickupData from '../data/pickups.json';
import townData from '../data/towns.json';
import { useHome } from '../content';
import { Reveal } from './Reveal';
import { SectionArt } from './art/SectionArt';

/**
 * Where a vehicle can be handed over, named on the page.
 *
 * Local search leans on what a page actually says, not only on its meta tags
 * and structured data. Someone searching "self drive car Nagercoil railway
 * station" is best served by a page that says exactly that.
 *
 * Grouped by town rather than listed flat, because four of these are in
 * Nagercoil and two are in Kanyakumari: a flat row of ten reads as ten places
 * and overstates how far apart they are. Under a heading each, the three
 * Nagercoil spots read as what they are -- three doors into the same town.
 *
 * Drawn as stops on a route, and the route draws itself downward as the
 * section is scrolled to. A list of places is a list; a line through them is
 * what a delivery actually is, and it gives the eye an order to read ten
 * names in rather than ten things arriving at once. The motion is all in
 * index.css under "the route", including the part that turns it off for
 * anybody who has asked their system for less of it.
 *
 * Each one links to the town page it sits in. A name in plain text is a weaker
 * claim to a place than a page saying what hiring there involves, and these
 * are the only links the home page has into them.
 *
 * Two lists, and the second is not decoration. The pickup points are the ones
 * people ask for; towns.json is the service area, it feeds every town page and
 * the sitemap, and dropping its towns off the home page would quietly cut the
 * internal link each of those pages has. So they stay, smaller, underneath.
 */

/* One glyph per kind of place, drawn rather than fetched -- three small shapes
   are a few hundred bytes of markup here, and an icon font is a request and a
   fallback. pathLength="1" for the same reason the rest of the site uses it:
   one dash rule can then draw any of them. */
const GLYPHS: Record<string, React.ReactNode> = {
  // A pin.
  town: (
    <>
      <path pathLength="1" d="M12 21s6-5.3 6-10a6 6 0 1 0-12 0c0 4.7 6 10 6 10z" />
      <circle pathLength="1" cx="12" cy="11" r="2.1" />
    </>
  ),
  // A train, head on.
  rail: (
    <>
      <rect pathLength="1" x="6" y="3.5" width="12" height="13" rx="3" />
      <path pathLength="1" d="M6.8 10.5h10.4" />
      <path pathLength="1" d="M9.5 13.8h.01M14.5 13.8h.01" />
      <path pathLength="1" d="M8.5 16.5L6.5 20.5M15.5 16.5l2 4" />
    </>
  ),
  // A bus, from the side.
  bus: (
    <>
      <rect pathLength="1" x="3.5" y="5" width="17" height="10.5" rx="2.5" />
      <path pathLength="1" d="M3.5 10h17" />
      <path pathLength="1" d="M7.5 15.5v2M16.5 15.5v2" />
      <path pathLength="1" d="M7 12.8h.01M17 12.8h.01" />
    </>
  ),
};

function PlaceIcon({ kind }: { kind: string }) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      className="route-ico"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {GLYPHS[kind] ?? GLYPHS.town}
    </svg>
  );
}

/** The towns with a page of their own that the pickup list does not already name. */
function remainingTowns(named: Set<string>) {
  return townData.towns.filter((town) => !named.has(town.name.toLowerCase()));
}

export function AreasServed() {
  const home = useHome();
  const { heading, intro, footnoteLead, footnoteLinkLabel, footnoteTail } =
    home.areasServed;

  const named = new Set(
    pickupData.groups.flatMap((group) =>
      group.points.map((point) => point.name.toLowerCase()),
    ),
  );
  const rest = remainingTowns(named);

  return (
    <section className="bg-white py-16">
      <div className="mx-auto grid max-w-[86rem] gap-10 px-5 sm:px-8 lg:px-12 lg:grid-cols-[1fr_0.85fr] lg:items-center lg:gap-14">
        <div>
          <Reveal>
            <p className="section-eyebrow">Where we deliver</p>
            <h2 className="mt-2 text-2xl font-bold tracking-tight text-navy sm:text-3xl">
              {heading}
            </h2>
            <p className="mt-3 max-w-2xl leading-relaxed text-ink-dim">{intro}</p>
          </Reveal>

          <div className="mt-8">
            {pickupData.groups.map((group, g) => (
              <Reveal key={group.town} delay={g * 150} className="route-stop">
                <span aria-hidden="true" className="route-dot" />

                <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                  <h3 className="route-town">{group.town}</h3>
                  {group.note ? <span className="route-note">{group.note}</span> : null}
                </div>

                <ul className="route-chips">
                  {group.points.map((point, i) => {
                    // The point's own town page, the group's, or the list of
                    // every town. Never a dead chip: a place worth naming is
                    // worth somewhere to read about.
                    const slug =
                      ('slug' in point ? (point.slug as string) : undefined) ??
                      ('slug' in group ? (group.slug as string) : undefined);

                    return (
                      <li
                        key={point.name}
                        style={{ '--chip-delay': `${i * 80}ms` } as React.CSSProperties}
                      >
                        <Link
                          to={slug ? `/car-rental/${slug}` : '/car-rental'}
                          className="route-chip tap-target"
                        >
                          <PlaceIcon kind={point.kind} />
                          {point.name}
                          {'tag' in point && point.tag ? (
                            <span className="route-tag">{point.tag as string}</span>
                          ) : null}
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              </Reveal>
            ))}
          </div>

          {rest.length > 0 ? (
            <Reveal delay={200}>
              <p className="mt-6 text-sm leading-relaxed text-ink-faint">
                We also deliver to{' '}
                {rest.map((town, i) => (
                  <span key={town.slug}>
                    <Link
                      to={`/car-rental/${town.slug}`}
                      className="font-semibold text-ink-dim underline-offset-2 hover:text-navy hover:underline"
                    >
                      {town.name}
                    </Link>
                    {i < rest.length - 2 ? ', ' : i === rest.length - 2 ? ' and ' : ''}
                  </span>
                ))}
                .
              </p>
            </Reveal>
          ) : null}

          <Reveal delay={240}>
            <p className="mt-5 text-ink-dim">
              {footnoteLead}{' '}
              <Link to="/contact" className="font-semibold text-navy hover:text-gold-deep">
                {footnoteLinkLabel}
              </Link>{' '}
              {footnoteTail}{' '}
              <Link to="/car-rental" className="font-semibold text-navy hover:text-gold-deep">
                See every town we deliver to
              </Link>
              .
            </p>
          </Reveal>
        </div>

        {/* The cape, drawn rather than mapped. A real map would invite someone
            to read boundaries off it, and the service area is the list beside
            this, not whatever a picture implies. */}
        <Reveal delay={80}>
          <SectionArt
            name="coast"
            alt={heading}
            className="rounded-[14px] shadow-[0_10px_30px_rgba(16,24,40,0.12)]"
          />
        </Reveal>
      </div>
    </section>
  );
}
