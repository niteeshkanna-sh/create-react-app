const points = [
  'Unlimited-choice pickup across the city',
  'Clear KM limits and deposits, stated upfront',
  'Daily, weekly and monthly rates',
];

export function Hero() {
  return (
    <section id="top" className="relative overflow-hidden bg-gold text-navy">
      <img
        src="/hero-car.webp"
        alt=""
        aria-hidden="true"
        className="absolute inset-0 h-full w-full object-cover opacity-15 mix-blend-luminosity"
      />
      <div
        aria-hidden="true"
        className="absolute inset-0 bg-gradient-to-br from-gold-light via-gold to-gold/85"
      />

      <div className="relative mx-auto max-w-6xl px-5 py-20 sm:py-28">
        <p data-hero-item="" style={{ ["--hero-delay" as string]: "40ms" }} className="mb-4 inline-flex items-center gap-2 rounded-full border border-navy/20 bg-navy/8 px-3 py-1 text-xs font-semibold tracking-wide text-navy uppercase">
          Nagercoil &amp; Kanyakumari district
        </p>

        <h1 data-hero-item="" style={{ ["--hero-delay" as string]: "120ms" }} className="max-w-3xl text-4xl leading-tight font-bold tracking-tight sm:text-5xl lg:text-6xl">
          Self drive car &amp; bike rental in Nagercoil
          <span className="block text-navy/70">and across Kanyakumari district</span>
        </h1>

        <p data-hero-item="" style={{ ["--hero-delay" as string]: "200ms" }} className="mt-4 text-lg font-medium text-navy/75">
          Take the wheel. We'll handle the rest.
        </p>

        <p data-hero-item="" style={{ ["--hero-delay" as string]: "260ms" }} className="mt-5 max-w-xl text-base leading-relaxed text-navy/75 sm:text-lg">
          Self drive cars, bike rental, wedding cars and tourist vehicles with
          a driver — across Nagercoil, Marthandam, Colachel and the whole of
          Kanyakumari district. Transparent rates and a deposit you get back.
        </p>

        <div data-hero-item="" style={{ ["--hero-delay" as string]: "340ms" }} className="mt-8 flex flex-wrap gap-3">
          <a
            href="#fleet"
            className="rounded-xl bg-navy px-6 py-3 font-semibold text-white transition hover:bg-navy/90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-navy"
          >
            Browse the fleet
          </a>
          <a
            href="#enquire"
            className="rounded-xl border border-navy/25 bg-white/50 px-6 py-3 font-semibold text-navy transition hover:bg-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-navy"
          >
            Check availability
          </a>
        </div>

        <ul data-hero-item="" style={{ ["--hero-delay" as string]: "420ms" }} className="mt-12 grid gap-3 sm:grid-cols-3">
          {points.map((p) => (
            <li key={p} className="flex items-start gap-2.5 text-sm text-navy/75">
              <span aria-hidden="true" className="mt-0.5 text-navy">
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
