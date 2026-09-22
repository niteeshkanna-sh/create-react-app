import { useHome, useSiteImage } from '../content';
import { ContentLink } from './ContentLink';

export function Hero() {
  const home = useHome();
  const h = home.hero;

  // Uploadable, like every other picture on the site. It was a hardcoded path,
  // so the one image a visitor sees first was the only one the owner could not
  // change without a deploy.
  const background = useSiteImage('home-hero') ?? '/hero-car.webp';

  return (
    <section id="top" className="relative overflow-hidden bg-navy text-white">
      {/* Two things used to sit on this photograph: the image at 25% opacity
          and a navy gradient over it that reached 95% in the middle. Together
          they left about one part in fifty of the picture showing, which is
          why an uploaded home page background looked like it had not saved.
          The scrim alone carries the legibility now -- the same weighted one
          the page banners use, which is measured against a white photograph
          rather than guessed at. */}
      {/* The largest thing above the fold, and therefore what Google measures
          the page's loading speed by. Told to fetch first and not lazily: left
          to its own devices the browser treats a background image as ordinary
          work and the page paints twice. */}
      <img
        src={background}
        alt=""
        aria-hidden="true"
        loading="eager"
        fetchPriority="high"
        decoding="async"
        className="absolute inset-0 h-full w-full object-cover"
      />
      <div aria-hidden="true" className="hero-scrim absolute inset-0" />

      {/* Tight to the header, roomy below it. The old padding was even top and
          bottom, which put a band of empty navy between the menu and the first
          word -- on a screen where the whole point of the top of the page is
          to be read without scrolling. */}
      <div className="relative mx-auto max-w-[86rem] px-5 sm:px-8 lg:px-12 pt-10 pb-20 sm:pt-14 sm:pb-28">
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
              <span aria-hidden="true" className="bullet-dot" />
              {p}
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
