import { Link } from 'react-router-dom';
import { Reveal } from './Reveal';

const services = [
  {
    to: '/cars',
    title: 'Self drive cars',
    body: 'Hatchbacks, sedans and SUVs by the day, week or month. You drive.',
  },
  {
    to: '/bikes',
    title: 'Bike rental',
    body: 'Scooters and motorcycles by the hour, day or week. Helmets included.',
  },
  {
    to: '/wedding-cars',
    title: 'Wedding cars',
    body: 'Decorated cars reserved for your date, and vehicles for the family.',
  },
  {
    to: '/tourist-vehicles',
    title: 'Tourist vehicles',
    body: 'Cars and vans with a driver who knows the district and its roads.',
  },
  {
    to: '/nri',
    title: 'Coming from abroad?',
    body: 'Book before you land. Airport pickup and long-stay rates for visiting families.',
  },
];

export function Services() {
  return (
    <section className="mx-auto max-w-6xl px-5 py-20">
      <Reveal>
        <h2 className="text-3xl font-bold tracking-tight text-navy sm:text-4xl">
          What we hire
        </h2>
      </Reveal>

      <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
        {services.map((s, i) => (
          <Reveal key={s.to} delay={i * 80}>
          <Link
            to={s.to}
            data-lift=""
            className="group flex h-full flex-col rounded-[14px] border border-line bg-white p-6 shadow-[0_10px_30px_rgba(16,24,40,0.08)] transition hover:border-navy/40"
          >
            <h3 className="text-lg font-semibold text-navy">{s.title}</h3>
            <p className="mt-2 text-sm leading-relaxed text-ink-dim">{s.body}</p>
            <span className="mt-4 inline-flex items-center gap-1 text-sm font-semibold text-gold-deep">
              See details
              <span aria-hidden="true" className="transition group-hover:translate-x-0.5">
                →
              </span>
            </span>
          </Link>
          </Reveal>
        ))}
      </div>
    </section>
  );
}
