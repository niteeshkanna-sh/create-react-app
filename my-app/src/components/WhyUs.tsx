import { useState } from 'react';
import { Link } from 'react-router-dom';
import seo from '../data/seo.json';
import { Reveal } from './Reveal';
import { CircleBadge } from './CircleBadge';

const items = [
  {
    title: 'The price you agree is the price you pay',
    body: 'Every vehicle carries three numbers before you take it: the daily rate, the kilometres included each day, and what anything beyond that costs. The deposit is stated too, and it comes back when the car does. Nothing is discovered at the end.',
  },
  {
    title: 'Anywhere in the district',
    body: `We work across the whole of ${seo.site.district} district — Nagercoil, Marthandam, Colachel, Thuckalay and the towns between. Tell us where you are and we will sort out getting the vehicle to you, including the airport if you are flying in.`,
  },
  {
    title: 'One place for the whole trip',
    body: 'A self drive car for the week, a bike for running about, a decorated car for the wedding, and a driver for the day everyone goes sightseeing. Booked together, with one person to call rather than four.',
  },
];

/**
 * Two columns: stacked photographs on one side, an accordion on the other.
 *
 * The accordion is buttons with aria-expanded rather than details/summary,
 * because only one panel should be open at a time and native details has no
 * notion of a group.
 */
export function WhyUs() {
  const [open, setOpen] = useState(0);

  return (
    <section className="bg-cream py-20">
      <div className="mx-auto grid max-w-6xl gap-12 px-5 lg:grid-cols-2 lg:items-center lg:gap-16">
        {/* Photographs */}
        <Reveal>
          <div className="relative pb-16 sm:pb-20 lg:pb-24">
            <img
              src="/hero-car.webp"
              alt="A car on the road in Kanyakumari district"
              loading="lazy"
              className="aspect-4/3 w-[78%] rounded-[14px] object-cover shadow-[0_10px_30px_rgba(16,24,40,0.12)]"
            />
            <img
              src="/car-brezza.avif"
              alt="One of our vehicles"
              loading="lazy"
              className="absolute right-0 bottom-0 aspect-4/3 w-[62%] rounded-[14px] border-4 border-cream object-cover shadow-[0_10px_30px_rgba(16,24,40,0.16)]"
            />
            <div className="absolute bottom-4 left-[6%] sm:bottom-6">
              <CircleBadge />
            </div>
          </div>
        </Reveal>

        {/* Copy and accordion */}
        <div>
          <Reveal>
            <p className="inline-flex items-center gap-2 rounded-full bg-white px-4 py-2 text-sm font-bold tracking-wide text-navy uppercase shadow-[0_10px_30px_rgba(16,24,40,0.06)]">
              <span aria-hidden="true" className="size-1.5 rounded-full bg-gold" />
              Why hire from us
            </p>

            <h2 className="mt-6 text-3xl leading-tight font-bold tracking-tight text-navy sm:text-4xl">
              Straight answers, and a vehicle that turns up
            </h2>

            <p className="mt-5 leading-relaxed text-ink-dim">
              Hiring a vehicle should not be the complicated part of a trip. We
              tell you the rate, the limits and the deposit before you take the
              car, and we bring it to you wherever you are in the district.
            </p>
          </Reveal>

          <Reveal delay={80}>
            <div className="mt-8 divide-y divide-line border-y border-line">
              {items.map((item, i) => {
                const isOpen = i === open;
                return (
                  <div key={item.title}>
                    <h3>
                      <button
                        type="button"
                        onClick={() => setOpen(isOpen ? -1 : i)}
                        aria-expanded={isOpen}
                        aria-controls={`why-panel-${i}`}
                        className="flex w-full items-center justify-between gap-4 py-5 text-left"
                      >
                        <span className="text-lg font-semibold text-navy">
                          {i + 1}. {item.title}
                        </span>
                        <svg
                          width="20"
                          height="20"
                          viewBox="0 0 20 20"
                          aria-hidden="true"
                          fill="none"
                          className={`shrink-0 text-gold transition-transform duration-300 ${
                            isOpen ? 'rotate-180' : ''
                          }`}
                        >
                          <path d="M5 7.5L10 12.5L15 7.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                        </svg>
                      </button>
                    </h3>
                    <div
                      id={`why-panel-${i}`}
                      hidden={!isOpen}
                      className="pb-5 leading-relaxed text-ink-dim"
                    >
                      {item.body}
                    </div>
                  </div>
                );
              })}
            </div>
          </Reveal>

          <Reveal delay={120}>
            <Link
              to="/about"
              className="mt-8 inline-flex items-center gap-1.5 font-semibold text-navy transition hover:text-gold-deep"
            >
              More about us
              <span aria-hidden="true">→</span>
            </Link>
          </Reveal>
        </div>
      </div>
    </section>
  );
}
