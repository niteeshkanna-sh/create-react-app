import { useHome } from '../content';
import { Reveal } from './Reveal';
import { SectionArt } from './art/SectionArt';

const SCENES = ['step-1', 'step-2', 'step-3'] as const;

export function HowItWorks() {
  const home = useHome();
  const { heading, steps, noteLead, noteBody } = home.howItWorks;

  return (
    <section id="how" className="bg-white py-20">
      <div className="mx-auto max-w-6xl px-5">
        <Reveal>
          <p className="text-sm font-bold tracking-widest text-gold-deep uppercase">
            Booking, start to finish
          </p>
          <h2 className="mt-2 text-3xl font-bold tracking-tight text-navy sm:text-4xl">
            {heading}
          </h2>
        </Reveal>

        <ol className="mt-10 grid gap-6 sm:grid-cols-3">
          {steps.map((s, i) => (
            <Reveal key={s.n} delay={i * 110} as="li" className="h-full">
              <div className="card-lift flex h-full flex-col overflow-hidden rounded-[14px] border border-line bg-white shadow-[0_10px_30px_rgba(16,24,40,0.06)]">
                {/* The scene list is indexed rather than keyed off s.n, so a
                    renamed step number in the content file cannot silently
                    drop the illustration. */}
                <SectionArt name={SCENES[i % SCENES.length]} />

                <div className="flex flex-1 flex-col p-6">
                  <p className="text-sm font-bold tracking-widest text-gold-deep">
                    {s.n}
                  </p>
                  <h3 className="mt-2 text-lg font-semibold text-navy">{s.title}</h3>
                  <p className="mt-1.5 leading-relaxed text-ink-dim">{s.body}</p>
                </div>
              </div>
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
