import { useState, useRef, useEffect } from 'react';
import { NavLink, Link, useLocation } from 'react-router-dom';
import seo from '../data/seo.json';

const services = [
  { to: '/cars', label: 'Self-drive cars' },
  { to: '/bikes', label: 'Bike rental' },
  { to: '/wedding-cars', label: 'Wedding cars' },
  { to: '/tourist-vehicles', label: 'Tourist vehicles' },
  { to: '/monthly', label: 'Monthly rental' },
  { to: '/nri', label: 'For NRI visitors' },
];

const links = [
  { to: '/', label: 'Home' },
  { to: '/about', label: 'About Us' },
  { to: '/tariff', label: 'Tariff' },
  { to: '/blog', label: 'Blog' },
  { to: '/contact', label: 'Contact' },
];

/** Gold dot over the current page, as on the old site. */
const activeDot =
  "before:absolute before:-top-1.5 before:left-1/2 before:size-1.5 before:-translate-x-1/2 before:rounded-full before:bg-gold before:content-['']";

export function Header() {
  const [open, setOpen] = useState(false);
  const [servicesOpen, setServicesOpen] = useState(false);
  const { pathname } = useLocation();
  const servicesRef = useRef<HTMLDivElement>(null);

  // Closing on navigation belongs to the click that navigates, not to an
  // effect watching the path: an effect would set state during render and
  // cascade an extra one.
  const closeMenus = () => {
    setOpen(false);
    setServicesOpen(false);
  };

  // Nine nav items do not fit a desktop row, so the four services live behind
  // one trigger. Each still has its own route and page -- they are separate
  // searches, and a page can only rank for what it is about.
  const onServicePage = services.some((s) => s.to === pathname);

  useEffect(() => {
    if (!servicesOpen) return;

    const onPointerDown = (e: PointerEvent) => {
      if (!servicesRef.current?.contains(e.target as Node)) setServicesOpen(false);
    };
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setServicesOpen(false);
    };

    document.addEventListener('pointerdown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('pointerdown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [servicesOpen]);

  const linkClass = ({ isActive }: { isActive: boolean }) =>
    [
      'relative py-1 text-sm font-semibold transition',
      isActive ? `text-navy ${activeDot}` : 'text-ink-dim hover:text-navy',
    ].join(' ');

  return (
    <header className="sticky top-0 z-50 border-b border-line bg-cream/90 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-5 py-4">
        <Link to="/" onClick={closeMenus} className="flex items-center gap-2.5">
          <span
            aria-hidden="true"
            className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-gold text-base font-bold text-navy"
          >
            N
          </span>
          <span className="text-base leading-tight font-semibold tracking-tight text-navy sm:text-lg">
            {seo.site.name}
          </span>
        </Link>

        <nav className="hidden items-center gap-6 lg:flex" aria-label="Main">
          <NavLink to="/" end onClick={closeMenus} className={linkClass}>
            Home
          </NavLink>
          <NavLink to="/about" onClick={closeMenus} className={linkClass}>
            About Us
          </NavLink>

          <div className="relative" ref={servicesRef}>
            <button
              type="button"
              onClick={() => setServicesOpen((s) => !s)}
              aria-expanded={servicesOpen}
              className={`relative flex items-center gap-1 py-1 text-sm font-semibold transition ${
                onServicePage ? `text-navy ${activeDot}` : 'text-ink-dim hover:text-navy'
              }`}
            >
              Services
              <svg width="12" height="12" viewBox="0 0 12 12" aria-hidden="true" fill="none">
                <path d="M3 4.5L6 7.5L9 4.5" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" />
              </svg>
            </button>

            {servicesOpen ? (
              <ul data-menu="" className="absolute top-full left-0 mt-2 w-52 overflow-hidden rounded-[14px] border border-line bg-white py-1.5 shadow-[0_10px_30px_rgba(16,24,40,0.08)]">
                {services.map((s) => (
                  <li key={s.to}>
                    <NavLink
                      to={s.to}
                      onClick={closeMenus}
                      className={({ isActive }) =>
                        `block px-4 py-2 text-sm font-medium transition ${
                          isActive ? 'bg-navy text-white' : 'text-ink-dim hover:bg-cream hover:text-navy'
                        }`
                      }
                    >
                      {s.label}
                    </NavLink>
                  </li>
                ))}
              </ul>
            ) : null}
          </div>

          {links.slice(2).map((l) => (
            <NavLink key={l.to} to={l.to} onClick={closeMenus} className={linkClass}>
              {l.label}
            </NavLink>
          ))}
        </nav>

        <div className="flex items-center gap-2">
          <a
            href={`tel:${seo.site.phone}`}
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
          data-menu=""
          className="border-t border-line bg-cream px-5 pb-4 lg:hidden"
        >
          <ul className="grid gap-1 pt-2">
            {[links[0], links[1], ...services, ...links.slice(2)].map((l) => (
              <li key={l.to}>
                <NavLink
                  to={l.to}
                  end={l.to === '/'}
                  onClick={closeMenus}
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
                href={`tel:${seo.site.phone}`}
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
