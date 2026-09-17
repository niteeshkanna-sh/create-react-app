import { Link } from 'react-router-dom';
import seo from '../data/seo.json';
import { PageHeader } from './PageHeader';
import { AreasServed } from '../components/AreasServed';
import { Reveal } from '../components/Reveal';
import type { SceneName } from '../components/art/scenes';

export interface ServiceSection {
  heading: string;
  body: string;
}

interface ServicePageProps {
  title: string;
  intro: string;
  sections: ServiceSection[];
  /** Shown as a bulleted list under the prose. */
  points?: string[];
  /** Text on the primary call to action. */
  cta?: string;
  /** Photo slot for the banner -- a filename in public/photos, no extension. */
  photo?: string;
  /** What that photograph shows, for image search and screen readers. */
  imageAlt?: string;
  /** Drawn behind the title until that photograph exists. */
  scene?: SceneName;
}

/**
 * The shared layout behind the bike, wedding and tourist pages.
 *
 * Each is a separate route rather than a section on one page because they are
 * separate searches: someone looking for a wedding car is not the person
 * looking to hire a scooter, and a page can only rank for what it is about.
 */
export function ServicePage({ title, intro, sections, points, cta, photo, scene, imageAlt }: ServicePageProps) {
  return (
    <>
      <PageHeader title={title} intro={intro} photo={photo} scene={scene} imageAlt={imageAlt} />

      <section className="mx-auto max-w-3xl px-5 py-16">
        <div className="space-y-8">
          {sections.map((s, i) => (
            <Reveal key={s.heading} delay={i * 70}>
              <h2 className="text-xl font-semibold text-navy">{s.heading}</h2>
              <p className="mt-2 leading-relaxed text-ink-dim">{s.body}</p>
            </Reveal>
          ))}
        </div>

        {points?.length ? (
          <ul className="mt-8 space-y-2.5">
            {points.map((p) => (
              <li key={p} className="flex gap-2.5 text-ink-dim">
                <span aria-hidden="true" className="mt-1 text-gold">
                  ✓
                </span>
                {p}
              </li>
            ))}
          </ul>
        ) : null}

        <Reveal className="mt-10 block rounded-[14px] border border-line bg-white p-6 text-center shadow-[0_10px_30px_rgba(16,24,40,0.08)]">
          <p className="text-lg font-semibold text-navy">{cta ?? 'Ask us for a quote'}</p>
          <p className="mx-auto mt-2 max-w-md text-ink-dim">
            Tell us your dates and where you are in {seo.site.district} district,
            and we will come back with availability and the rate.
          </p>
          <div className="mt-6 flex flex-wrap justify-center gap-3">
            <Link
              to="/contact"
              className="rounded-xl bg-navy px-5 py-2.5 font-semibold text-white transition hover:bg-navy/90"
            >
              Send an enquiry
            </Link>
            <a
              href={`tel:${seo.site.phone}`}
              className="rounded-xl border border-line px-5 py-2.5 font-semibold text-ink-dim transition hover:border-navy/40 hover:text-navy"
            >
              Call +91 63749 42976
            </a>
          </div>
        </Reveal>
      </section>

      <AreasServed />
    </>
  );
}
