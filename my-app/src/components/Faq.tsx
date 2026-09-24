import { useRef } from 'react';
import type { SyntheticEvent } from 'react';
import { useHome, useSiteImage } from '../content';
import { useReveal } from '../lib/useReveal';
import { Reveal } from './Reveal';

/**
 * The questions people ask before they book.
 *
 * Here because they are asked on the phone every day, and because a page that
 * answers a question in the words somebody typed is the page that gets found.
 * "Do I need a deposit for a self drive car in Nagercoil" is a search; a
 * tariff table is not an answer to it.
 *
 * <details> rather than a pile of JavaScript: it opens and closes with no
 * script at all, it is keyboard-operable and announced correctly without any
 * work, and -- the part that matters here -- the answers are in the HTML
 * whether they are open or shut, so a crawler reads every one of them.
 *
 * The same questions are turned into FAQPage structured data at build time by
 * scripts/prerender-seo.mjs, from this same content. Google asks that such
 * data match what the page shows, and one copy of the text is how that stays
 * true.
 */

/** Shared by every card in the list, which is what makes them exclusive. */
const GROUP = 'faq';

function Item({
  question,
  answer,
  delay,
  onToggle,
}: {
  question: string;
  answer: string;
  delay: number;
  onToggle: (event: SyntheticEvent<HTMLDetailsElement>) => void;
}) {
  const ref = useReveal<HTMLDetailsElement>();

  return (
    <details
      ref={ref}
      data-reveal=""
      style={{ ['--reveal-delay' as string]: `${delay}ms` }}
      // Browsers that know this attribute close the open one themselves, with
      // no script at all. The handler below is for the ones that do not.
      name={GROUP}
      onToggle={onToggle}
      className="faq-card group rounded-[14px] bg-cream/95 px-5 py-4 text-left shadow-[0_12px_30px_rgba(6,12,28,0.28)] sm:px-6"
    >
      <summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-[15px] leading-snug font-semibold text-navy marker:content-none sm:text-base">
        {question}
        <span
          aria-hidden="true"
          className="faq-plus grid size-8 shrink-0 place-items-center rounded-full bg-gold/20 text-gold-deep"
        >
          <svg width="15" height="15" viewBox="0 0 16 16" fill="none">
            <path d="M8 3v10M3 8h10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          </svg>
        </span>
      </summary>
      <p className="faq-answer mt-3 border-t border-line pt-3 text-[14.5px] leading-relaxed text-ink-dim">
        {answer}
      </p>
    </details>
  );
}

export function Faq() {
  const { faq } = useHome();
  const items = faq?.items ?? [];
  const list = useRef<HTMLDivElement>(null);

  // The banner photograph again, almost entirely behind navy. The section was
  // a white list on cream and read as small print at the foot of the page;
  // what it actually is is the page answering the ten things people phone up
  // to ask, which is worth a band of its own.
  const photo = useSiteImage('home-hero')
    ?? '/mountain-road-at-sunrise-self-drive-car-rental.webp';

  if (items.length === 0) return null;

  // One open at a time, which is what the shared name does in Chrome 120,
  // Safari 17.2 and Firefox 130 and later. Older browsers ignore the
  // attribute and would leave every answer someone had opened on the screen,
  // so the same rule is applied here by hand. In a browser that already did
  // it, this finds nothing to close.
  const closeTheRest = (event: SyntheticEvent<HTMLDetailsElement>) => {
    const opened = event.currentTarget;
    if (!opened.open) return;

    for (const other of list.current?.querySelectorAll('details[open]') ?? []) {
      if (other !== opened) (other as HTMLDetailsElement).open = false;
    }
  };

  return (
    <section className="relative isolate overflow-hidden bg-navy py-16 text-white sm:py-20">
      <img
        src={photo}
        alt=""
        aria-hidden="true"
        loading="lazy"
        decoding="async"
        className="faq-photo absolute inset-0 -z-10 h-full w-full object-cover object-center"
      />
      <div aria-hidden="true" className="faq-wash absolute inset-0 -z-10" />

      <div className="mx-auto max-w-[86rem] px-5 sm:px-8 lg:px-12">
        <Reveal className="mx-auto max-w-2xl text-center">
          <h2 className="text-[1.6rem] font-bold tracking-tight sm:text-[2.1rem]">
            {faq.heading}
          </h2>
          {faq.intro ? (
            <p className="mx-auto mt-4 max-w-xl text-[15px] leading-relaxed text-white/75">
              {faq.intro}
            </p>
          ) : null}
        </Reveal>

        {/* Two columns from the tablet up. Ten questions in one column is a
            list long enough that the last of them is a scroll away from the
            heading; in two it is one glance.

            Two stacks rather than a two-column grid, which matters the moment
            an answer opens: in a grid the row grows to the taller of the pair
            and the card beside it is left sitting over a hole the size of the
            answer. Each stack closes up on its own.

            Split in half rather than by odd and even, because on a phone the
            two stacks become one and its order is the order of the markup.
            Halves keep the questions in the order the panel lists them --
            deposit, documents, kilometres -- which is the order they are
            asked in. */}
        <div
          ref={list}
          className="mx-auto mt-10 grid max-w-5xl gap-3 sm:mt-12 sm:grid-cols-2 sm:gap-4"
        >
          {[
            items.slice(0, Math.ceil(items.length / 2)),
            items.slice(Math.ceil(items.length / 2)),
          ].map((column, side) => (
            <div key={side} className="flex flex-col gap-3 sm:gap-4">
              {column.map((item, i) => (
                <Item
                  key={item.question}
                  question={item.question}
                  answer={item.answer}
                  delay={Math.min(i, 5) * 60}
                  onToggle={closeTheRest}
                />
              ))}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
