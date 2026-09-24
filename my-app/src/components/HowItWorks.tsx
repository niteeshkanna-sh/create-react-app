import { useHome } from '../content';
import { Reveal } from './Reveal';
import { SectionArt } from './art/SectionArt';

const SCENES = ['step-1', 'step-2', 'step-3'] as const;

export function HowItWorks() {
  const home = useHome();
  const { heading, steps, noteLead, noteBody } = home.howItWorks;

  return (
    <section id="how" className="bg-white py-20">
      <div className="mx-auto max-w-[86rem] px-5 sm:px-8 lg:px-12">
        <Reveal>
          <p className="section-eyebrow">
            Booking, start to finish
          </p>
          <h2 className="mt-2 text-3xl font-bold tracking-tight text-navy sm:text-4xl">
            {heading}
          </h2>
        </Reveal>

        {/* An ordered list, because the order is the point. The rail and
            the numbered node say the same thing to anyone who can see it,
            and the <ol> says it to anyone who cannot. */}
        <ol className="mt-12 grid gap-10 sm:grid-cols-3 sm:gap-8">
          {steps.map((s, i) => (
            <Reveal key={s.n} delay={i * 140} as="li" className="step h-full">
              <div className="step-rail">
                <span aria-hidden="true" className="step-node">
                  {s.n}
                </span>
                {/* Nothing to point at after the last one. Hidden while the
                    three are stacked, where a line running right is a line
                    running nowhere. */}
                {i < steps.length - 1 ? (
                  <span aria-hidden="true" className="step-line hidden sm:block" />
                ) : null}
              </div>

              {/* The scene list is indexed rather than keyed off s.n, so a
                  renamed step number in the content file cannot silently
                  drop the illustration. */}
              <SectionArt
                name={SCENES[i % SCENES.length]}
                alt={s.title}
                className="step-photo mt-6 rounded-[14px]"
              />

              <h3 className="mt-5 text-lg font-bold tracking-tight text-navy sm:text-xl">
                {s.title}
              </h3>
              <p className="mt-2 leading-relaxed text-ink-dim">{s.body}</p>
            </Reveal>
          ))}
        </ol>

        <Reveal delay={120}>
          <p className="mt-12 rounded-[14px] border border-line bg-cream p-5 text-sm leading-relaxed text-ink-dim">
            <strong className="font-semibold text-navy">{noteLead}</strong> {noteBody}
          </p>
        </Reveal>
      </div>
    </section>
  );
}
