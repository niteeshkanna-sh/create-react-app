import { useHome } from '../content';
import { ContentLink } from './ContentLink';

export function Hero() {
  const home = useHome();
  const h = home.hero;

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
        className="absolute inset-0 bg-gradient-to-br from-navy-deep via-navy/95 to-navy/75"
      />

      <div className="relative mx-auto max-w-6xl px-5 py-20 sm:py-28">
        <p data-hero-item="" style={{ ["--hero-delay" as string]: "40ms" }} className="eyebrow-gold mb-4 inline-flex items-center gap-2 rounded-full border border-gold/35 bg-gold/10 px-3.5 py-1.5 text-[11px]">
          {h.eyebrow}
        </p>

        <h1 data-hero-item="" style={{ ["--hero-delay" as string]: "120ms" }} className="max-w-3xl text-4xl leading-tight font-bold tracking-tight sm:text-5xl lg:text-6xl">
          {h.headingLead}
          <span className="block text-gold">{h.headingAccent}</span>
        </h1>

        <p data-hero-item="" style={{ ["--hero-delay" as string]: "200ms" }} className="mt-4 text-lg font-medium text-white/75">
          {h.tagline}
        </p>

        <p data-hero-item="" style={{ ["--hero-delay" as string]: "260ms" }} className="mt-5 max-w-xl text-base leading-relaxed text-white/70 sm:text-lg">
          {h.intro}
        </p>

        <div data-hero-item="" style={{ ["--hero-delay" as string]: "340ms" }} className="mt-8 flex flex-wrap gap-3">
          <ContentLink
            to={h.primaryHref}
            className="rounded-xl bg-gold px-6 py-3 text-center font-semibold text-navy transition hover:bg-gold-light focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
          >
            {h.primaryLabel}
          </ContentLink>
          <ContentLink
            to={h.secondaryHref}
            className="rounded-xl border border-gold/40 px-6 py-3 text-center font-semibold text-gold-light transition hover:bg-gold/10 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold"
          >
            {h.secondaryLabel}
          </ContentLink>
        </div>

        <ul data-hero-item="" style={{ ["--hero-delay" as string]: "420ms" }} className="mt-12 grid gap-3 sm:grid-cols-3">
          {h.points.map((p) => (
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
