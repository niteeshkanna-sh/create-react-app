import { Link } from 'react-router-dom';
import { home } from '../content';
import { Reveal } from './Reveal';

/**
 * Full-bleed photograph band on the home page, sitting between "how it works"
 * and the areas we cover: you have just read how to book, so this is the
 * payoff -- the road itself -- before the page goes back to detail.
 *
 * The picture is set as a CSS background rather than an <img> on purpose. If
 * the file is missing the section falls back to the navy beneath it and still
 * looks deliberate, where an <img> would leave a broken-image icon on a live
 * page. It is decorative either way: every word here is in the markup.
 *
 * The image is a stylised car on a mountain road, not a photograph of the
 * fleet, and it is used here precisely because this band is scene-setting
 * rather than evidence. It would be wrong on a service card, where a picture
 * is read as "this is the vehicle you would get".
 */
export function OpenRoad() {
  const c = home.openRoad;

  return (
    <section className="relative isolate overflow-hidden bg-navy text-white">
      <div
        aria-hidden="true"
        className="absolute inset-0 bg-[url('/open-road.webp')] bg-cover bg-center"
      />
      <div aria-hidden="true" className="road-scrim absolute inset-0" />

      <div className="relative mx-auto max-w-6xl px-5 py-20 sm:py-28">
        <Reveal className="max-w-xl">
          <p className="eyebrow-gold mb-4 text-[11px]">{c.eyebrow}</p>

          <h2 className="text-3xl leading-tight font-bold tracking-tight sm:text-4xl lg:text-5xl">
            {c.headingLead}
            <span className="block text-gold">{c.headingAccent}</span>
          </h2>

          <p className="mt-5 text-base leading-relaxed text-white/75 sm:text-lg">
            {c.body}
          </p>

          <div className="mt-8 flex flex-wrap gap-3">
            <Link
              to={c.primaryHref}
              data-lift=""
              className="rounded-xl bg-gold px-6 py-3 font-semibold text-navy transition hover:bg-gold-light focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
            >
              {c.primaryLabel}
            </Link>
            <Link
              to={c.secondaryHref}
              data-lift=""
              className="rounded-xl border border-gold/40 px-6 py-3 font-semibold text-gold-light transition hover:bg-gold/10 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold"
            >
              {c.secondaryLabel}
            </Link>
          </div>
        </Reveal>
      </div>

      <div aria-hidden="true" className="gold-rule relative" />
    </section>
  );
}
