import { home } from '../content';
import { Reveal } from './Reveal';

export function HowItWorks() {
  const { heading, steps, noteLead, noteBody } = home.howItWorks;

  return (
    <section id="how" className="bg-white py-20">
      <div className="mx-auto max-w-6xl px-5">
        <Reveal>
          <h2 className="text-3xl font-bold tracking-tight text-navy sm:text-4xl">
            {heading}
          </h2>
        </Reveal>

        <ol className="mt-10 grid gap-8 sm:grid-cols-3">
          {steps.map((s, i) => (
            <Reveal key={s.n} delay={i * 90} as="li">
              <p className="text-sm font-bold tracking-widest text-gold">{s.n}</p>
              <h3 className="mt-2 text-lg font-semibold text-navy">{s.title}</h3>
              <p className="mt-1.5 leading-relaxed text-ink-dim">{s.body}</p>
            </Reveal>
          ))}
        </ol>

        <p className="mt-12 rounded-[14px] border border-line bg-cream p-5 text-sm leading-relaxed text-ink-dim">
          <strong className="font-semibold text-navy">{noteLead}</strong>{' '}
          {noteBody}
        </p>
      </div>
    </section>
  );
}
