import { useHome } from '../content';

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
export function Faq() {
  const { faq } = useHome();
  const items = faq?.items ?? [];
  if (items.length === 0) return null;

  return (
    <section className="mx-auto max-w-[86rem] px-5 sm:px-8 lg:px-12 py-16 sm:py-20">
      <div className="mx-auto max-w-3xl">
        <h2 className="text-2xl font-bold tracking-tight text-navy sm:text-3xl">
          {faq.heading}
        </h2>
        {faq.intro ? <p className="mt-3 text-ink-dim">{faq.intro}</p> : null}

        <div className="mt-8 divide-y divide-line rounded-[14px] border border-line bg-white">
          {items.map((item) => (
            <details key={item.question} className="group px-5 py-4 sm:px-6">
              <summary className="flex cursor-pointer list-none items-start justify-between gap-4 font-semibold text-navy marker:content-none">
                {item.question}
                <span
                  aria-hidden="true"
                  className="mt-1 shrink-0 text-gold-deep transition group-open:rotate-45"
                >
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                    <path
                      d="M8 3v10M3 8h10"
                      stroke="currentColor"
                      strokeWidth="1.8"
                      strokeLinecap="round"
                    />
                  </svg>
                </span>
              </summary>
              <p className="mt-3 text-[15px] leading-relaxed text-ink-dim">{item.answer}</p>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}
