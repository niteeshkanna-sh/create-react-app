const links = [
  { href: '#fleet', label: 'Our fleet' },
  { href: '#how', label: 'How it works' },
  { href: '#enquire', label: 'Enquire' },
];

export function Header() {
  return (
    <header className="sticky top-0 z-50 border-b border-line/70 bg-sand/85 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-5 py-4">
        <a href="#top" className="flex items-center gap-2.5">
          <span
            aria-hidden="true"
            className="grid h-9 w-9 place-items-center rounded-xl bg-navy text-base font-bold text-gold"
          >
            N
          </span>
          <span className="text-lg font-semibold tracking-tight text-navy">
            Nitesha Cars
          </span>
        </a>

        <nav className="hidden items-center gap-7 sm:flex">
          {links.map((l) => (
            <a
              key={l.href}
              href={l.href}
              className="text-sm font-medium text-ink-dim transition hover:text-navy"
            >
              {l.label}
            </a>
          ))}
        </nav>

        <a
          href="tel:+919000000000"
          className="rounded-xl bg-navy px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-navy/90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold"
        >
          Call us
        </a>
      </div>
    </header>
  );
}
