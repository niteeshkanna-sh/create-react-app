import { useHome, useSiteImage } from '../content';
import { ContentLink } from './ContentLink';
import { HeroEnquiry } from './HeroEnquiry';

export function Hero() {
  const home = useHome();
  const h = home.hero;

  // Only a real one. There is no committed fallback any more: the stock
  // portrait that used to sit here was somebody else's car on somebody else's
  // street, and a banner is better with nothing behind it than with a picture
  // that says the business is not what it says it is. Upload one under
  // Website content and it appears; until then the banner draws itself.
  const background = useSiteImage('home-hero');

  return (
    <section id="top" className="relative isolate overflow-hidden bg-navy text-white">
      {/* Drawn, not photographed. Two gold glows on deep navy -- one behind
          the card so it has something to lift off, one low on the left under
          the heading -- and a hairline of gold along the bottom edge where the
          banner meets the page. It costs nothing to download and it is the
          brand's own colours rather than a stock photograph's.

          With no image, the largest thing above the fold is the heading, which
          the browser already has by the time it has the stylesheet. The banner
          is no longer waiting on a file to finish painting. */}
      <div aria-hidden="true" className="hero-backdrop absolute inset-0 -z-10" />

      {/* A photograph appears here only when one has been uploaded. Kept
          eager and high priority because in that case it is the largest thing
          above the fold again, and described because the sitemap lists it as
          the picture representing this page -- a page cannot tell a crawler
          "this is the photograph of the business" and a screen reader "there
          is nothing here". */}
      {background ? (
        <>
          <img
            src={background}
            alt={h.imageAlt ?? `${h.headingLead} ${h.headingAccent}`}
            loading="eager"
            fetchPriority="high"
            decoding="async"
            className="absolute inset-0 -z-10 h-full w-full object-cover object-[70%_top]"
          />
          <div aria-hidden="true" className="hero-scrim absolute inset-0 -z-10" />
        </>
      ) : null}

      <div className="relative mx-auto max-w-[86rem] px-5 pt-10 pb-12 sm:px-8 sm:pt-14 sm:pb-16 lg:px-12">
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
