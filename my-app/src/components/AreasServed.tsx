import { Link } from 'react-router-dom';
import seo from '../data/seo.json';
import { Reveal } from './Reveal';

/**
 * Visible text naming the towns we cover.
 *
 * Local search leans on what a page actually says, not only on its meta tags
 * and structured data. Someone searching "car rental Marthandam" is best
 * served by a page that says Marthandam on it.
 */
export function AreasServed() {
  return (
    <section className="bg-white py-16">
      <div className="mx-auto max-w-6xl px-5">
        <Reveal>
          <h2 className="text-2xl font-bold tracking-tight text-navy sm:text-3xl">
            Where we hire across {seo.site.district} district
          </h2>
          <p className="mt-3 max-w-2xl leading-relaxed text-ink-dim">
            We serve the whole of {seo.site.district} district in{' '}
            {seo.site.region}. Tell us where you are and we will sort out
            pickup.
          </p>
        </Reveal>

        <ul className="mt-7 flex flex-wrap gap-2.5">
          {seo.site.areas.map((area, i) => (
            <Reveal key={area} as="li" delay={i * 35}>
              <span className="inline-block rounded-full border border-line bg-cream px-4 py-1.5 text-sm font-medium text-ink-dim">
                {area}
              </span>
            </Reveal>
          ))}
        </ul>

        <Reveal delay={120}>
          <p className="mt-7 text-ink-dim">
            Somewhere not listed?{' '}
            <Link to="/contact" className="font-medium text-navy hover:text-gold-deep">
              Ask us
            </Link>{' '}
            — if it is in the district, we can usually help.
          </p>
        </Reveal>
      </div>
    </section>
  );
}
