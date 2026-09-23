import { Link } from 'react-router-dom';
import { useHome } from '../content';
import { Reveal } from './Reveal';
import { SectionArt } from './art/SectionArt';
import { hasScene } from './art/scenes';

/**
 * `showHeading` is off on /services, where the page banner has just said the
 * same words -- a heading repeating the title directly above it reads as a
 * rendering fault rather than a section.
 */
export function Services({ showHeading = true }: { showHeading?: boolean }) {
  const home = useHome();
  const { heading, items } = home.services;

  // On the home page these cards sit under a section heading, so they are the
  // level below it. On /services there is no section heading -- the page title
  // is the h1 and these are its sections -- and leaving them at h3 skipped a
  // level, which is what a screen reader's outline is built from.
  const CardHeading = showHeading ? 'h3' : 'h2';

  return (
    <section className="mx-auto max-w-[86rem] px-5 sm:px-8 lg:px-12 py-20">
      {showHeading ? (
        <Reveal>
          <p className="text-sm font-bold tracking-widest text-gold-deep uppercase">
            What we rent
          </p>
          <h2 className="mt-2 text-3xl font-bold tracking-tight text-navy sm:text-4xl">
            {heading}
          </h2>
        </Reveal>
      ) : null}

      <div className={`grid gap-6 sm:grid-cols-2 lg:grid-cols-3 ${showHeading ? 'mt-10' : ''}`}>
        {items.map((s, i) => (
          <Reveal key={s.to} delay={i * 80} className="h-full">
            <Link
              to={s.to}
              className="card-lift group flex h-full flex-col overflow-hidden rounded-[14px] border border-line bg-white shadow-[0_10px_30px_rgba(16,24,40,0.08)]"
            >
              {/* Falls back to a plain navy panel rather than breaking if a
                  service is added to the content file before it has a scene. */}
              {/* Described when it is a photograph, decorative when it is
                  the drawing. SectionArt makes that call; what it needs from
                  here is the sentence. An uploaded picture of a wedding car
                  with alt="" is a picture Google cannot read, on a site whose
                  traffic comes from searching for exactly that. */}
              {hasScene(s.to) ? (
                <SectionArt name={s.to} alt={s.title} />
              ) : (
                <div className="art-frame" />
              )}

              <div className="flex flex-1 flex-col p-6">
                <CardHeading className="text-lg font-semibold text-navy">{s.title}</CardHeading>
                <p className="mt-2 text-sm leading-relaxed text-ink-dim">{s.body}</p>
                <span className="mt-4 inline-flex items-center gap-1 text-sm font-semibold text-gold-deep">
                  See details
                  <span aria-hidden="true" className="transition group-hover:translate-x-1">
                    →
                  </span>
                </span>
              </div>
            </Link>
          </Reveal>
        ))}
      </div>
    </section>
  );
}
