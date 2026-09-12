import { useState } from 'react';
import { cars, inr, type BodyType } from '../data/cars';

type Filter = 'All' | BodyType;
const filters: Filter[] = ['All', 'Hatchback', 'Sedan', 'SUV', 'MUV'];

interface FleetProps {
  onEnquire: (carLabel: string) => void;
}

export function Fleet({ onEnquire }: FleetProps) {
  const [filter, setFilter] = useState<Filter>('All');
  const shown = filter === 'All' ? cars : cars.filter((c) => c.bodyType === filter);

  return (
    <section id="fleet" className="mx-auto max-w-6xl px-5 py-20">
      <div className="flex flex-wrap items-end justify-between gap-6">
        <div>
          <h2 className="text-3xl font-bold tracking-tight text-navy sm:text-4xl">
            Our fleet
          </h2>
          <p className="mt-2 max-w-lg text-ink-dim">
            Rates shown are per day. Longer hires bring the daily rate down.
          </p>
        </div>

        <div className="flex flex-wrap gap-2" role="group" aria-label="Filter by body type">
          {filters.map((f) => {
            const active = f === filter;
            return (
              <button
                key={f}
                type="button"
                onClick={() => setFilter(f)}
                aria-pressed={active}
                className={`rounded-full border px-4 py-1.5 text-sm font-medium transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold ${
                  active
                    ? 'border-navy bg-navy text-white'
                    : 'border-line bg-white text-ink-dim hover:border-navy/40 hover:text-navy'
                }`}
              >
                {f}
              </button>
            );
          })}
        </div>
      </div>

      <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {shown.map((car) => {
          const label = `${car.brand} ${car.name}`;
          return (
            <article
              key={car.id}
              className="flex flex-col overflow-hidden rounded-[14px] border border-line bg-white shadow-[0_10px_30px_rgba(16,24,40,0.08)]"
            >
              <div className="relative aspect-[16/10] bg-sand">
                {car.image ? (
                  <img
                    src={car.image}
                    alt={label}
                    loading="lazy"
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div
                    aria-hidden="true"
                    className="grid h-full w-full place-items-center text-5xl font-bold text-line"
                  >
                    {car.brand.charAt(0)}
                  </div>
                )}
                <span
                  className={`absolute top-3 right-3 rounded-full px-2.5 py-1 text-xs font-semibold ${
                    car.available
                      ? 'bg-ok-soft text-ok'
                      : 'bg-line text-ink-faint'
                  }`}
                >
                  {car.available ? 'Available' : 'On rental'}
                </span>
              </div>

              <div className="flex flex-1 flex-col p-5">
                <p className="text-xs font-medium tracking-wide text-ink-faint uppercase">
                  {car.brand}
                </p>
                <h3 className="mt-0.5 text-lg font-semibold text-navy">{car.name}</h3>

                <dl className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-sm text-ink-dim">
                  <div className="flex gap-1.5">
                    <dt className="sr-only">Body type</dt>
                    <dd>{car.bodyType}</dd>
                  </div>
                  <div className="flex gap-1.5">
                    <dt className="sr-only">Fuel</dt>
                    <dd>{car.fuel}</dd>
                  </div>
                  <div className="flex gap-1.5">
                    <dt className="sr-only">Transmission</dt>
                    <dd>{car.transmission}</dd>
                  </div>
                  <div className="flex gap-1.5">
                    <dt className="sr-only">Seats</dt>
                    <dd>{car.seats} seats</dd>
                  </div>
                </dl>

                <div className="mt-4 border-t border-line pt-4">
                  <p className="flex items-baseline gap-1.5">
                    <span className="text-2xl font-bold text-navy">
                      {inr(car.rateDaily)}
                    </span>
                    <span className="text-sm text-ink-faint">/ day</span>
                  </p>
                  {car.rateMonthly ? (
                    <p className="mt-1 text-sm text-gold-deep">
                      {inr(car.rateMonthly)} / day on monthly hire
                    </p>
                  ) : null}
                  <p className="mt-2 text-xs text-ink-faint">
                    {car.kmLimitPerDay} km/day included &middot; {inr(car.extraKmRate)}/km
                    after &middot; {inr(car.deposit)} deposit
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => onEnquire(label)}
                  className="mt-5 w-full rounded-xl bg-navy px-4 py-2.5 font-semibold text-white transition hover:bg-navy/90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold"
                >
                  Enquire about this car
                </button>
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}
