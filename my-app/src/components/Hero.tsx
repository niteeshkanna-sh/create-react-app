import { useHome, useSiteImage } from '../content';
import { ContentLink } from './ContentLink';
import { HeroEnquiry } from './HeroEnquiry';

export function Hero() {
  const home = useHome();
  const h = home.hero;

  // Uploadable, like every other picture on the site. It was a hardcoded path,
  // so the one image a visitor sees first was the only one the owner could not
  // change without a deploy.
  const background = useSiteImage('home-hero') ?? '/self-drive-car-rental-nitesha-cars-and-bikes.webp';

  return (
    <section id="top" className="relative isolate overflow-hidden bg-navy text-white">
      {/* The photograph, and a great deal less of it than before.
          It used to be stretched across the whole banner, which on a tall
          portrait meant a person's jacket filling the right half at four times
          its own size, cropped at the neck. It is anchored to the top-right
          now and the card sits over it, so what shows is a band of it rather
          than a blow-up of the middle.

          The largest thing above the fold, so it is what Google measures the
          page's loading speed by: fetched first, never lazily. */}
      {/* Described rather than hidden. The sitemap lists this picture as the
          one representing the home page, and alt text is most of what image
          search has besides the file name -- a page cannot tell a crawler
          "this is the photograph of the business" and a screen reader "there
          is nothing here". The words are editable beside the heading. */}
      <img
        src={background}
        alt={h.imageAlt ?? `${h.headingLead} ${h.headingAccent}`}
        loading="eager"
        fetchPriority="high"
        decoding="async"
        className="absolute inset-0 -z-10 h-full w-full object-cover object-[70%_top]"
      />
      <div aria-hidden="true" className="hero-scrim absolute inset-0 -z-10" />

      <div className="relative mx-auto max-w-[86rem] px-5 pt-10 pb-14 sm:px-8 sm:pt-14 sm:pb-20 lg:px-12">
        {/* Words and the form side by side from lg up, stacked below it.
            Twelve columns rather than a half each: the form needs about 380px
            to stop its two date boxes wrapping, and the headline needs the
            rest -- an even split gave the words a column so narrow the heading
            broke over four lines. */}
        {/* Three blocks, placed rather than stacked: the words, the card, and
            the points. On a phone they run in that order, which puts the form
            a screen-height higher than it sat when it simply followed
            everything in the left column -- on the device most likely to want
            it. On a desktop the points return to under the words, where the
            card has room beside both. */}
        <div className="grid items-start gap-8 lg:grid-cols-12 lg:gap-x-12 lg:gap-y-9">
          <div className="lg:col-span-7 lg:col-start-1 lg:row-start-1">
            <p data-hero-item="" style={{ ['--hero-delay' as string]: '40ms' }} className="eyebrow-gold mb-4 inline-flex items-center gap-2 rounded-full border border-gold/35 bg-gold/10 px-3.5 py-1.5 text-[11px]">
              {h.eyebrow}
            </p>

            {/* Two lines on a desktop, three on a phone. It was four of
                sixty-pixel type, which pushed everything that matters -- the
                buttons, the form -- under the fold on a laptop. */}
            <h1 data-hero-item="" style={{ ['--hero-delay' as string]: '120ms' }} className="text-[1.85rem] leading-[1.14] font-bold tracking-tight sm:text-[2.4rem] lg:text-[2.85rem]">
              {h.headingLead}
              <span className="block text-gold">{h.headingAccent}</span>
            </h1>

            <p data-hero-item="" style={{ ['--hero-delay' as string]: '200ms' }} className="mt-4 text-base font-medium text-white/80 sm:text-lg">
              {h.tagline}
            </p>

            <p data-hero-item="" style={{ ['--hero-delay' as string]: '260ms' }} className="mt-4 max-w-xl text-[15px] leading-relaxed text-white/70">
              {h.intro}
            </p>

            <div data-hero-item="" style={{ ['--hero-delay' as string]: '340ms' }} className="mt-7 grid grid-cols-1 gap-3 min-[380px]:grid-cols-2 sm:flex sm:flex-wrap">
              <ContentLink
                to={h.primaryHref}
                className="rounded-xl bg-gold px-3 py-3 text-center text-[14px] font-semibold text-navy transition hover:bg-gold-light focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white sm:px-6 sm:text-base"
              >
                {h.primaryLabel}
              </ContentLink>
              <ContentLink
                to={h.secondaryHref}
                className="rounded-xl border border-gold/40 px-3 py-3 text-center text-[14px] font-semibold text-gold-light transition hover:bg-gold/10 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold sm:px-6 sm:text-base"
              >
                {h.secondaryLabel}
              </ContentLink>
            </div>

          </div>

          {/* Second on a phone, beside the words on a desktop. It spans both
              rows there so the points can sit under the heading without
              leaving a hole next to them. */}
          <div data-hero-item="" style={{ ['--hero-delay' as string]: '300ms' }} className="lg:col-span-5 lg:col-start-8 lg:row-span-2 lg:row-start-1">
            <HeroEnquiry
              title={h.formTitle ?? 'Check a date'}
              note={h.formNote ?? 'Tell us when you need it and we will call you back.'}
            />
          </div>

          <ul data-hero-item="" style={{ ['--hero-delay' as string]: '420ms' }} className="grid gap-2.5 sm:grid-cols-3 lg:col-span-7 lg:col-start-1 lg:row-start-2 lg:gap-3">
            {h.points.map((p) => (
              <li key={p} className="flex items-start gap-2.5 text-sm text-white/75">
                <span aria-hidden="true" className="bullet-dot" />
                {p}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}
