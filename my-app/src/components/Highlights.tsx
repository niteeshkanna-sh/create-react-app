import { Link } from 'react-router-dom';
import { useHome } from '../content';
import { Reveal } from './Reveal';

/**
 * The three services worth putting in front of someone on the home page.
 *
 * Set on navy rather than the page's sand, so the band reads as a distinct
 * offer block rather than more body copy -- these are the high-value bookings
 * and should not be skimmed past.
 *
 * Three across rather than three stacked. Each one used to be a full-width
 * row split into a description and a bulleted panel, which meant the three of
 * them ran to about two and a half screens and every row left a column of
 * empty navy beside whichever side had less to say. Side by side they are one
 * screen, they can be compared at a glance -- which is the point of putting
 * three offers next to each other -- and no card has to fill a width it does
 * not need.
 *
 * The inner panel goes with it. A bordered box inside a bordered box was what
 * made the gap look deliberate; the points now sit under a gold hairline in
 * the same card, and the button is pushed to the bottom with mt-auto so all
 * three line up however long the copy above them runs.
 */
export function Highlights() {
  const home = useHome();
  const { items } = home.highlights;

  return (
    <section className="bg-navy py-16 sm:py-20">
      <div className="mx-auto grid max-w-[86rem] gap-6 px-5 sm:grid-cols-2 sm:px-8 lg:grid-cols-3 lg:px-12">
        {items.map((h, i) => (
          <Reveal key={h.to} delay={i * 110} className="h-full">
            <article className="card-lift on-navy relative flex h-full flex-col rounded-[14px] border border-white/10 bg-white/[0.04] p-6 sm:p-7">
              <span
                aria-hidden="true"
                className="grid size-12 shrink-0 place-items-center rounded-xl bg-gold/20 text-2xl"
              >
                {h.icon}
              </span>

              <h3 className="mt-4 text-xl leading-tight font-bold tracking-tight text-white sm:text-2xl">
                {h.title}
              </h3>
              <p className="mt-1.5 text-[0.7rem] font-bold tracking-wide text-gold uppercase">
                {h.eyebrow}
              </p>

              <p className="mt-3 text-sm leading-relaxed text-white/65">{h.body}</p>

              <hr className="gold-hair mt-5 border-0" />

              <h4 className="mt-5 text-sm font-bold text-white">{h.panelTitle}</h4>
              <ul className="mt-3 space-y-2.5">
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

              {/* mt-auto on the wrapper, so the three buttons sit on one line
                  whatever the copy above them does. Without it a shorter
                  card's button floats up the tile and the row reads as three
                  different sizes. The padding is on the wrapper rather than
                  the button because auto margins and a margin cannot both
                  apply to one edge. */}
              <div className="mt-auto pt-6">
                <Link
                  to={h.to}
                  className="flex w-full items-center justify-center gap-2 rounded-xl bg-gold px-5 py-3 font-semibold text-navy transition hover:bg-gold-light focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
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
