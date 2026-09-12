import { Link } from 'react-router-dom';
import { Reveal } from './Reveal';

interface Highlight {
  to: string;
  eyebrow: string;
  title: string;
  body: string;
  icon: string;
  panelTitle: string;
  points: string[];
  cta: string;
}

const highlights: Highlight[] = [
  {
    to: '/monthly',
    icon: '🗓',
    title: 'Monthly self drive car rental',
    eyebrow: 'Need a car for weeks, not days?',
    body: 'Monthly hire across Kanyakumari district for NRI families, work postings and anyone between vehicles. Hatchbacks, sedans, SUVs and 7 seaters, with the daily rate falling the longer you keep it.',
    panelTitle: 'What decides your monthly rate',
    points: [
      'Vehicle type and transmission',
      'How long you need it',
      'Season — festival and wedding periods',
      'Where in the district we deliver',
    ],
    cta: 'Ask about monthly rates',
  },
  {
    to: '/nri',
    icon: '✈',
    title: 'Coming home from abroad?',
    eyebrow: 'Sort the car out before you land',
    body: 'For families flying in from the Gulf, Singapore and Malaysia. Tell us your dates on WhatsApp, and the vehicle is ready when you arrive — no hunting for one after a night flight.',
    panelTitle: 'How it works for visitors',
    points: [
      'Book from abroad, pay when you arrive',
      'Met at Trivandrum airport',
      'Long-stay rates for weeks or months',
      'Licence and document check in advance',
    ],
    cta: 'Read the visitor guide',
  },
  {
    to: '/wedding-cars',
    icon: '💍',
    title: 'Wedding car rental',
    eyebrow: 'Book the date before it goes',
    body: 'Decorated cars for the couple and vehicles for relatives arriving from out of town, across Nagercoil, Marthandam and Colachel. Muhurtham dates fill months ahead.',
    panelTitle: 'What we arrange',
    points: [
      'Decoration in your colours',
      'Vehicle held for your date',
      'Extra cars for the family',
      'Booked together from abroad',
    ],
    cta: 'See wedding cars',
  },
];

/**
 * The three services worth putting in front of someone on the home page.
 *
 * Set on navy rather than the page's sand, so the band reads as a distinct
 * offer block rather than more body copy -- these are the high-value bookings
 * and should not be skimmed past.
 */
export function Highlights() {
  return (
    <section className="bg-navy py-20">
      <div className="mx-auto max-w-6xl space-y-10 px-5">
        {highlights.map((h, i) => (
          <Reveal key={h.to} delay={i * 90}>
            <article className="grid gap-8 rounded-[14px] border border-white/10 bg-white/[0.03] p-7 sm:p-9 lg:grid-cols-[1.15fr_1fr] lg:items-center">
              <div>
                <div className="flex items-start gap-4">
                  <span
                    aria-hidden="true"
                    className="grid size-12 shrink-0 place-items-center rounded-xl bg-gold/20 text-2xl"
                  >
                    {h.icon}
                  </span>
                  <div>
                    <h3 className="text-2xl leading-tight font-bold tracking-tight text-white sm:text-3xl">
                      {h.title}
                    </h3>
                    <p className="mt-1.5 text-sm font-bold tracking-wide text-gold uppercase">
                      {h.eyebrow}
                    </p>
                  </div>
                </div>
                <p className="mt-5 leading-relaxed text-white/65">{h.body}</p>
              </div>

              <div className="rounded-[14px] border border-white/10 bg-navy/60 p-6">
                <h4 className="font-bold text-white">{h.panelTitle}</h4>
                <ul className="mt-4 space-y-3">
                  {h.points.map((p) => (
                    <li key={p} className="flex items-start gap-2.5 text-sm text-white/75">
                      <span
                        aria-hidden="true"
                        className="mt-0.5 grid size-5 shrink-0 place-items-center rounded-full bg-gold text-[11px] font-bold text-navy"
                      >
                        ✓
                      </span>
                      {p}
                    </li>
                  ))}
                </ul>
                <Link
                  to={h.to}
                  className="mt-6 flex w-full items-center justify-center gap-2 rounded-xl bg-gold px-5 py-3 font-semibold text-navy transition hover:bg-gold/90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
                >
                  {h.cta}
                  <span aria-hidden="true">→</span>
                </Link>
              </div>
            </article>
          </Reveal>
        ))}
      </div>
    </section>
  );
}
