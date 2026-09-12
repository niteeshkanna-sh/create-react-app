import { useState } from 'react';
import { NavLink, Link } from 'react-router-dom';

const links = [
  { to: '/', label: 'Home' },
  { to: '/about', label: 'About Us' },
  { to: '/cars', label: 'Our Cars' },
  { to: '/tariff', label: 'Tariff' },
  { to: '/blog', label: 'Blog' },
  { to: '/contact', label: 'Contact' },
];

export function Header() {
  const [open, setOpen] = useState(false);

  // The active page gets a gold dot above it, matching the old site's nav.
  const linkClass = ({ isActive }: { isActive: boolean }) =>
    [
      'relative py-1 text-sm font-semibold transition',
      isActive ? 'text-navy' : 'text-ink-dim hover:text-navy',
      isActive
        ? "before:absolute before:-top-1.5 before:left-1/2 before:size-1.5 before:-translate-x-1/2 before:rounded-full before:bg-gold before:content-['']"
        : '',
    ].join(' ');

  return (
    <header className="sticky top-0 z-50 border-b border-line/70 bg-sand/85 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-5 py-4">
        <Link to="/" className="flex items-center gap-2.5">
          <span
            aria-hidden="true"
            className="grid h-9 w-9 place-items-center rounded-xl bg-navy text-base font-bold text-gold"
          >
            N
          </span>
          <span className="text-lg font-semibold tracking-tight text-navy">
            Nitesha Cars
          </span>
        </Link>

        <nav className="hidden items-center gap-7 lg:flex" aria-label="Main">
          {links.map((l) => (
            <NavLink key={l.to} to={l.to} end={l.to === '/'} className={linkClass}>
              {l.label}
            </NavLink>
          ))}
        </nav>

        <div className="flex items-center gap-2">
          <a
            href="tel:+916374942976"
            className="hidden rounded-xl bg-navy px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-navy/90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold sm:block"
          >
            Call us
          </a>

          <button
            type="button"
            onClick={() => setOpen((o) => !o)}
            aria-expanded={open}
            aria-controls="mobile-nav"
            className="rounded-xl border border-line p-2.5 text-navy transition hover:border-navy/40 lg:hidden"
          >
            <span className="sr-only">{open ? 'Close menu' : 'Open menu'}</span>
            <svg width="20" height="20" viewBox="0 0 20 20" aria-hidden="true" fill="none">
              {open ? (
                <path d="M5 5l10 10M15 5L5 15" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
              ) : (
                <path d="M3 6h14M3 10h14M3 14h14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
              )}
            </svg>
          </button>
        </div>
      </div>

      {open ? (
        <nav
          id="mobile-nav"
          aria-label="Main"
          className="border-t border-line/70 bg-sand px-5 pb-4 lg:hidden"
        >
          <ul className="grid gap-1 pt-2">
            {links.map((l) => (
              <li key={l.to}>
                <NavLink
                  to={l.to}
                  end={l.to === '/'}
                  onClick={() => setOpen(false)}
                  className={({ isActive }) =>
                    `block rounded-xl px-3 py-2.5 font-medium transition ${
                      isActive ? 'bg-navy text-white' : 'text-ink-dim hover:bg-white'
                    }`
                  }
                >
                  {l.label}
                </NavLink>
              </li>
            ))}
            <li>
              <a
                href="tel:+916374942976"
                className="mt-1 block rounded-xl bg-gold px-3 py-2.5 text-center font-semibold text-navy sm:hidden"
              >
                Call +91 63749 42976
              </a>
            </li>
          </ul>
        </nav>
      ) : null}
    </header>
  );
}
