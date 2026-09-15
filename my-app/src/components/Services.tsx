import { Link } from 'react-router-dom';
import { home } from '../content';
import { Reveal } from './Reveal';
import { SectionArt } from './art/SectionArt';
import { hasScene } from './art/scenes';

export function Services() {
  const { heading, items } = home.services;

  return (
    <section className="mx-auto max-w-6xl px-5 py-20">
      <Reveal>
        <p className="text-sm font-bold tracking-widest text-gold-deep uppercase">
          What we rent
        </p>
        <h2 className="mt-2 text-3xl font-bold tracking-tight text-navy sm:text-4xl">
          {heading}
        </h2>
      </Reveal>

      <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {items.map((s, i) => (
          <Reveal key={s.to} delay={i * 80} className="h-full">
            <Link
              to={s.to}
              className="card-lift group flex h-full flex-col overflow-hidden rounded-[14px] border border-line bg-white shadow-[0_10px_30px_rgba(16,24,40,0.08)]"
            >
              {/* Falls back to a plain navy panel rather than breaking if a
                  service is added to the content file before it has a scene. */}
              {hasScene(s.to) ? (
                <SectionArt name={s.to} />
              ) : (
                <div className="art-frame" />
              )}

              <div className="flex flex-1 flex-col p-6">
                <h3 className="text-lg font-semibold text-navy">{s.title}</h3>
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
