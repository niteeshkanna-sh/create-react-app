import { Link } from 'react-router-dom';
import { home } from '../content';
import { Reveal } from './Reveal';

/**
 * The three services worth putting in front of someone on the home page.
 *
 * Set on navy rather than the page's sand, so the band reads as a distinct
 * offer block rather than more body copy -- these are the high-value bookings
 * and should not be skimmed past.
 */
export function Highlights() {
  const { items } = home.highlights;

  return (
    <section className="bg-navy py-20">
      <div className="mx-auto max-w-6xl space-y-10 px-5">
        {items.map((h, i) => (
          <Reveal key={h.to} delay={i * 90}>
            <article className="grid gap-8 rounded-[14px] border border-white/10 bg-white/[0.03] p-7 sm:p-9 lg:grid-cols-[1.15fr_1fr] lg:items-center">
              <div>
                <div className="flex items-start gap-4">
                  <span
                    aria-hidden="true"
                    className="grid size-12 shrink-0 place-items-center rounded-xl bg-gold/20 text-2xl"
                  >
                    {h.icon}
                  </span>
                  <div>
                    <h3 className="text-2xl leading-tight font-bold tracking-tight text-white sm:text-3xl">
                      {h.title}
                    </h3>
                    <p className="mt-1.5 text-sm font-bold tracking-wide text-gold uppercase">
                      {h.eyebrow}
                    </p>
                  </div>
                </div>
                <p className="mt-5 leading-relaxed text-white/65">{h.body}</p>
              </div>

              <div className="rounded-[14px] border border-white/10 bg-navy/60 p-6">
                <h4 className="font-bold text-white">{h.panelTitle}</h4>
                <ul className="mt-4 space-y-3">
                  {h.points.map((p) => (
                    <li key={p} className="flex items-start gap-2.5 text-sm text-white/75">
                      <span
                        aria-hidden="true"
                        className="mt-0.5 grid size-5 shrink-0 place-items-center rounded-full bg-gold text-[11px] font-bold text-navy"
                      >
                        ✓
                      </span>
                      {p}
                    </li>
                  ))}
                </ul>
                <Link
                  to={h.to}
                  className="mt-6 flex w-full items-center justify-center gap-2 rounded-xl bg-gold px-5 py-3 font-semibold text-navy transition hover:bg-gold/90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
                >
                  {h.cta}
                  <span aria-hidden="true">→</span>
                </Link>
              </div>
            </article>
          </Reveal>
        ))}
      </div>
    </section>
  );
}
