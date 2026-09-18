import { Link } from 'react-router-dom';
import { dailyRate, inr } from '../data/cars';
import { useFleet } from '../lib/useFleet';
import { PageHeader } from './PageHeader';

export function Tariff() {
  const fleet = useFleet();
  const cars = fleet.status === 'ready' ? fleet.cars : [];
  const loading = fleet.status === 'loading';
  const empty = !loading && cars.length === 0;

  return (
    <>
      <PageHeader
        photo="tariff-hero"
        imageAlt="Self-drive car rental rates in Nagercoil and Kanyakumari district"
        scene="/cars"
        title="Tariff"
        intro="Rates are per day. Longer hires bring the daily rate down. Every figure below is what you pay — there is no separate booking fee."
      />

      <section className="mx-auto max-w-[86rem] px-5 sm:px-8 lg:px-12 py-16">
        {loading ? (
          <p className="text-center text-ink-faint">Loading the rate card…</p>
        ) : empty ? (
          <div className="rounded-[14px] border border-line bg-white p-10 text-center shadow-[0_10px_30px_rgba(16,24,40,0.08)]">
            <p className="text-lg font-semibold text-navy">Ask us for a quote</p>
            <p className="mx-auto mt-2 max-w-md text-ink-dim">
              Our rate card is not published here yet. Tell us the car you want
              and your dates, and we will give you the figure.
            </p>
            <div className="mt-6 flex flex-wrap justify-center gap-3">
              <Link
                to="/contact"
                className="rounded-xl bg-navy px-5 py-2.5 font-semibold text-white transition hover:bg-navy/90"
              >
                Ask for a quote
              </Link>
              <a
                href="tel:+916374942976"
                className="rounded-xl border border-line px-5 py-2.5 font-semibold text-ink-dim transition hover:border-navy/40 hover:text-navy"
              >
                Call +91 63749 42976
              </a>
            </div>
          </div>
        ) : (
          <div className="overflow-x-auto rounded-[14px] border border-line bg-white shadow-[0_10px_30px_rgba(16,24,40,0.08)]">
            <table className="w-full min-w-[44rem] border-collapse text-left text-sm">
              <thead>
                <tr className="border-b border-line bg-cream/60 text-xs tracking-wide text-ink-faint uppercase">
                  <th scope="col" className="px-5 py-3 font-semibold">Car</th>
                  <th scope="col" className="px-5 py-3 font-semibold">Per day</th>
                  <th scope="col" className="px-5 py-3 font-semibold">Weekly</th>
                  <th scope="col" className="px-5 py-3 font-semibold">Monthly</th>
                  <th scope="col" className="px-5 py-3 font-semibold">KM/day</th>
                  <th scope="col" className="px-5 py-3 font-semibold">Extra KM</th>
                  <th scope="col" className="px-5 py-3 font-semibold">Deposit</th>
                </tr>
              </thead>
              <tbody>
                {cars.map((car) => (
                  <tr key={car.id} className="border-b border-line/70 last:border-0">
                    <th scope="row" className="px-5 py-4 font-semibold text-navy">
                      {car.brand} {car.name}
                      <span className="block text-xs font-normal text-ink-faint">
                        {car.bodyType} · {car.fuel} · {car.transmission}
                      </span>
                    </th>
                    <td className="px-5 py-4 font-semibold text-navy">{dailyRate(car)}</td>
                    <td className="px-5 py-4 text-ink-dim">
                      {car.rateWeekly ? inr(car.rateWeekly) : '—'}
                    </td>
                    <td className="px-5 py-4 text-ink-dim">
                      {car.rateMonthly ? inr(car.rateMonthly) : '—'}
                    </td>
                    <td className="px-5 py-4 text-ink-dim">{car.kmLimitPerDay} km</td>
                    <td className="px-5 py-4 text-ink-dim">{inr(car.extraKmRate)}</td>
                    <td className="px-5 py-4 text-ink-dim">{inr(car.deposit)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <p className="mt-6 text-sm leading-relaxed text-ink-faint">
          Weekly and monthly columns show the <strong>per-day</strong> rate for
          those hire lengths. The deposit is refundable and returned after the
          car comes back, less any extra-KM charges or damage.
        </p>
      </section>
    </>
  );
}
