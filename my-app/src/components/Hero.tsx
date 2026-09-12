const points = [
  'Unlimited-choice pickup across the city',
  'Clear KM limits and deposits, stated upfront',
  'Daily, weekly and monthly rates',
];

export function Hero() {
  return (
    <section id="top" className="relative overflow-hidden bg-navy text-white">
      <img
        src="/hero-car.webp"
        alt=""
        aria-hidden="true"
        className="absolute inset-0 h-full w-full object-cover opacity-25"
      />
      <div
        aria-hidden="true"
        className="absolute inset-0 bg-gradient-to-br from-navy via-navy/95 to-navy/70"
      />

      <div className="relative mx-auto max-w-6xl px-5 py-20 sm:py-28">
        <p className="mb-4 inline-flex items-center gap-2 rounded-full border border-gold/30 bg-gold/10 px-3 py-1 text-xs font-semibold tracking-wide text-gold uppercase">
          Self-drive car rental · Kanyakumari district
        </p>

        <h1 className="max-w-3xl text-4xl leading-tight font-bold tracking-tight sm:text-5xl lg:text-6xl">
          Take the wheel.
          <span className="block text-gold">We'll handle the rest.</span>
        </h1>

        <p className="mt-5 max-w-xl text-base leading-relaxed text-white/70 sm:text-lg">
          Hatchbacks, sedans and SUVs by the day, week or month, across
          Kanyakumari district — Nagercoil, Marthandam, Colachel and Thuckalay.
          Transparent pricing, no hidden charges, and a deposit you get back.
        </p>

        <div className="mt-8 flex flex-wrap gap-3">
          <a
            href="#fleet"
            className="rounded-xl bg-gold px-6 py-3 font-semibold text-navy transition hover:bg-gold/90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
          >
            Browse the fleet
          </a>
          <a
            href="#enquire"
            className="rounded-xl border border-white/25 px-6 py-3 font-semibold text-white transition hover:bg-white/10 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold"
          >
            Check availability
          </a>
        </div>

        <ul className="mt-12 grid gap-3 sm:grid-cols-3">
          {points.map((p) => (
            <li key={p} className="flex items-start gap-2.5 text-sm text-white/75">
              <span aria-hidden="true" className="mt-0.5 text-gold">
                ✓
              </span>
              {p}
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
