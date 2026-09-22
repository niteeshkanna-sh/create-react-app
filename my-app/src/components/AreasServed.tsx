import { Link } from 'react-router-dom';
import townData from '../data/towns.json';
import { useHome } from '../content';
import { Reveal } from './Reveal';
import { SectionArt } from './art/SectionArt';

/**
 * Visible text naming the towns we cover.
 *
 * Local search leans on what a page actually says, not only on its meta tags
 * and structured data. Someone searching "car rental Marthandam" is best
 * served by a page that says Marthandam on it.
 *
 * The wording is editable; the town list is not. It comes from towns.json,
 * which also feeds each town's own page, its tags and its line in the sitemap
 * -- editing the two apart would tell Google one service area and the reader
 * another.
 *
 * Each name is a link to that town's page rather than a chip that does
 * nothing. Twelve towns named in plain text is a weaker claim to any of them
 * than twelve pages that each say what hiring there involves, and this is the
 * only place on the home page that leads to them.
 */
export function AreasServed() {
  const home = useHome();
  const { heading, intro, footnoteLead, footnoteLinkLabel, footnoteTail } =
    home.areasServed;

  return (
    <section className="bg-white py-16">
      <div className="mx-auto grid max-w-[86rem] gap-10 px-5 sm:px-8 lg:px-12 lg:grid-cols-[1fr_0.85fr] lg:items-center lg:gap-14">
        <div>
          <Reveal>
            <p className="text-sm font-bold tracking-widest text-gold-deep uppercase">
              Where we deliver
            </p>
            <h2 className="mt-2 text-2xl font-bold tracking-tight text-navy sm:text-3xl">
              {heading}
            </h2>
            <p className="mt-3 max-w-2xl leading-relaxed text-ink-dim">{intro}</p>
          </Reveal>

          <ul className="mt-7 flex flex-wrap gap-2.5">
            {townData.towns.map((town, i) => (
              <Reveal key={town.slug} as="li" delay={i * 35}>
                <Link
                  to={`/car-rental/${town.slug}`}
                  className="tap-target inline-flex items-center gap-2 rounded-full border border-line bg-cream px-4 py-1.5 text-sm font-medium text-ink-dim transition hover:border-gold hover:text-navy"
                >
                  <span aria-hidden="true" className="size-1.5 rounded-full bg-gold" />
                  {town.name}
                </Link>
              </Reveal>
            ))}
          </ul>

          <Reveal delay={120}>
            <p className="mt-7 text-ink-dim">
              {footnoteLead}{' '}
              <Link to="/contact" className="font-medium text-navy hover:text-gold-deep">
                {footnoteLinkLabel}
              </Link>{' '}
              {footnoteTail}{' '}
              <Link to="/car-rental" className="font-medium text-navy hover:text-gold-deep">
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
