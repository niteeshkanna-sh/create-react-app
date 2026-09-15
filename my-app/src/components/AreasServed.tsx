import { Link } from 'react-router-dom';
import seo from '../data/seo.json';
import { home } from '../content';
import { Reveal } from './Reveal';
import { SectionArt } from './art/SectionArt';

/**
 * Visible text naming the towns we cover.
 *
 * Local search leans on what a page actually says, not only on its meta tags
 * and structured data. Someone searching "car rental Marthandam" is best
 * served by a page that says Marthandam on it.
 *
 * The wording is editable; the town list is not. It comes from seo.json, which
 * also feeds the structured data -- editing the two apart would tell Google
 * one service area and the reader another.
 */
export function AreasServed() {
  const { heading, intro, footnoteLead, footnoteLinkLabel, footnoteTail } =
    home.areasServed;

  return (
    <section className="bg-white py-16">
      <div className="mx-auto grid max-w-6xl gap-10 px-5 lg:grid-cols-[1fr_0.85fr] lg:items-center lg:gap-14">
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
            {seo.site.areas.map((area, i) => (
              <Reveal key={area} as="li" delay={i * 35}>
                <span className="inline-flex items-center gap-2 rounded-full border border-line bg-cream px-4 py-1.5 text-sm font-medium text-ink-dim transition hover:border-gold hover:text-navy">
                  <span aria-hidden="true" className="size-1.5 rounded-full bg-gold" />
                  {area}
                </span>
              </Reveal>
            ))}
          </ul>

          <Reveal delay={120}>
            <p className="mt-7 text-ink-dim">
              {footnoteLead}{' '}
              <Link to="/contact" className="font-medium text-navy hover:text-gold-deep">
                {footnoteLinkLabel}
              </Link>{' '}
              {footnoteTail}
            </p>
          </Reveal>
        </div>

        {/* The cape, drawn rather than mapped. A real map would invite someone
            to read boundaries off it, and the service area is the list beside
            this, not whatever a picture implies. */}
        <Reveal delay={80}>
          <SectionArt
            name="coast"
            className="rounded-[14px] shadow-[0_10px_30px_rgba(16,24,40,0.12)]"
          />
        </Reveal>
      </div>
    </section>
  );
}
