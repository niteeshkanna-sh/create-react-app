import { Link } from 'react-router-dom';
import seo from '../data/seo.json';
import { useHome } from '../content';
import { readablePhone } from '../lib/phone';
import { SocialLinks, hasSocialLinks, WHATSAPP_PATHS } from './SocialLinks';

/**
 * The foot of every page: who we are, where to go, how to reach us.
 *
 * Five columns rather than four, and the services list is one link now. It
 * used to name five of them and then offer "View all services" underneath,
 * which is six ways of saying the same thing in a column six inches from the
 * bottom of the page -- and since /services now carries every service in
 * full, one link is the whole answer.
 *
 * The ways to reach us are a column of their own with a mark against each,
 * because that is what somebody is looking for when they scroll this far: a
 * number to ring, a number to message, an address, an email.
 */

/** A gold-on-navy circle for the contact rows. */
function Badge({ tone, children }: { tone: 'gold' | 'green' | 'plain'; children: React.ReactNode }) {
  const skin =
    tone === 'gold'
      ? 'bg-gold text-navy'
      : tone === 'green'
        ? 'bg-[#25d366] text-white'
        : 'bg-white/10 text-gold-light';

  return (
    <span aria-hidden="true" className={`grid size-9 shrink-0 place-items-center rounded-full ${skin}`}>
      {children}
    </span>
  );
}

function ColumnHeading({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="text-sm font-semibold tracking-wide text-white uppercase">{children}</h2>
  );
}

const quickLinks = [
  { to: '/', label: 'Home' },
  // One heading for the lot. Everything we hire is on that page now.
  { to: '/services', label: 'Services' },
  { to: '/cars', label: 'Our cars' },
  { to: '/tariff', label: 'Tariff' },
  { to: '/blog', label: 'Blog' },
];

const company = [
  { to: '/about', label: 'About us' },
  { to: '/contact', label: 'Contact' },
  // On every page, which is the point: the town pages are only linked from
  // the home page otherwise, and a set of pages reachable from one page is a
  // set a crawler may not finish.
  { to: '/car-rental', label: 'Where we deliver' },
  { to: '/places', label: 'Places to visit' },
];

export function Footer() {
  const home = useHome();
  const f = home.footer;
  const social = home.social;

  // Built here from a place name rather than taking a URL from the panel.
  //
  // An <iframe src> is the one field where a pasted address is genuinely
  // dangerous: whatever it points at renders inside our page. Encoding a
  // search term into a URL we construct means the panel can only ever move the
  // pin, never change what is embedded.
  const mapSrc =
    f.mapQuery.trim() === ''
      ? null
      : `https://www.google.com/maps?q=${encodeURIComponent(f.mapQuery)}&output=embed`;
  const directions =
    f.mapQuery.trim() === ''
      ? null
      : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(f.mapQuery)}`;

  // The panel's WhatsApp address if it has one, and the site's own number
  // otherwise -- the box is still the one place that link is set.
  const digits = seo.site.phone.replace(/[^0-9]/g, '');
  const whatsapp =
    typeof social?.whatsapp === 'string' && social.whatsapp.trim() !== ''
      ? social.whatsapp
      : `https://wa.me/${digits}`;

  return (
    <footer className="relative isolate overflow-hidden bg-navy text-white/70">
      {/* The same gold glow the banner and the panels use, so the page ends
          in the brand rather than in a flat block of navy. */}
      <div aria-hidden="true" className="footer-glow absolute inset-0 -z-10" />

      <div className="mx-auto grid max-w-[86rem] gap-10 px-5 py-14 sm:grid-cols-2 sm:px-8 sm:py-16 lg:grid-cols-12 lg:gap-8 lg:px-12">
        {/* Who */}
        <div className="lg:col-span-3">
          {/* The name set in type, not the lockup: the header already carries
              the artwork, and words stay crisp at any size. */}
          <p className="text-lg font-bold tracking-tight text-white">{seo.site.name}</p>
          <p className="eyebrow-gold mt-1 text-[11px]">Premium Rentals</p>
          <p className="mt-4 text-sm leading-relaxed">{f.blurb}</p>
        </div>

        {/* Where to go */}
        <nav aria-label="Quick links" className="lg:col-span-2">
          <ColumnHeading>Quick links</ColumnHeading>
          <ul className="tap-list mt-4 space-y-2.5 text-sm">
            {quickLinks.map((l) => (
              <li key={l.to}>
                <Link to={l.to} className="transition hover:text-gold">
                  {l.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        <nav aria-label="Company" className="lg:col-span-2">
          <ColumnHeading>Company</ColumnHeading>
          <ul className="tap-list mt-4 space-y-2.5 text-sm">
            {company.map((l) => (
              <li key={l.to}>
                <Link to={l.to} className="transition hover:text-gold">
                  {l.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        {/* How to reach us */}
        <div className="lg:col-span-3">
          <ColumnHeading>Contact us</ColumnHeading>

          <ul className="tap-list mt-4 space-y-3 text-sm">
            <li>
              <a href={`tel:${seo.site.phone}`} className="flex items-center gap-3 transition hover:text-gold">
                <Badge tone="gold">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M6.6 10.8a15.1 15.1 0 0 0 6.6 6.6l2.2-2.2c.3-.3.7-.4 1-.2 1.2.4 2.4.6 3.6.6.6 0 1 .4 1 1V20c0 .6-.4 1-1 1A17 17 0 0 1 3 4c0-.6.4-1 1-1h3.5c.6 0 1 .4 1 1 0 1.3.2 2.5.6 3.6.1.4 0 .8-.2 1l-2.3 2.2z" />
                  </svg>
                </Badge>
                {readablePhone(seo.site.phone)}
              </a>
            </li>

            <li>
              <a
                href={whatsapp}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-3 transition hover:text-gold"
              >
                <Badge tone="green">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                    {WHATSAPP_PATHS.map((d) => (
                      <path key={d} d={d} />
                    ))}
                  </svg>
                </Badge>
                WhatsApp us
              </a>
            </li>

            <li>
              <a href={`mailto:${seo.site.email}`} className="flex items-center gap-3 transition hover:text-gold">
                <Badge tone="plain">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9">
                    <rect x="3" y="5" width="18" height="14" rx="2" />
                    <path d="M3.5 7l8.5 6 8.5-6" />
                  </svg>
                </Badge>
                {seo.site.email}
              </a>
            </li>
          </ul>

          <div className="mt-4 flex gap-3">
            <Badge tone="plain">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9">
                <path d="M12 21s7-5.5 7-11a7 7 0 1 0-14 0c0 5.5 7 11 7 11z" />
                <circle cx="12" cy="10" r="2.6" />
              </svg>
            </Badge>
            <address className="text-sm not-italic leading-relaxed">
              {f.address.map((line) => (
                <span key={line} className="block">
                  {line}
                </span>
              ))}
            </address>
          </div>

          {/* Shown only when the panel has them. Opening hours are one of the
              first things someone checks before setting off to collect a car,
              and they are also what Google reads out of this page's structured
              data -- written once here rather than once for people and once
              for a crawler, which is how the two end up disagreeing. */}
          {f.hours.trim() !== '' ? (
            <p className="mt-3 text-sm leading-relaxed text-white/75">
              <span className="font-semibold text-white">Open</span> {f.hours}
            </p>
          ) : null}
        </div>

        {/* Who to follow, and the map under it: both are "where to find us"
            by another route, and the column has the room a map needs. */}
        <div className="lg:col-span-2">
          {/* Only when there is something to follow. A heading with nothing
              under it is what this column had while the panel's social boxes
              were empty. */}
          {hasSocialLinks(social) ? (
            <>
              <ColumnHeading>{social?.heading || 'Follow us on'}</ColumnHeading>
              <div className="mt-4">
                <SocialLinks />
              </div>
            </>
          ) : null}

          {mapSrc ? (
            <div className={hasSocialLinks(social) ? 'mt-7' : ''}>
              <ColumnHeading>{f.locationHeading}</ColumnHeading>
              <div className="mt-4">
                <div className="overflow-hidden rounded-xl border border-white/15">
                  <iframe
                    // Lazy, and only as tall as it needs to be: a footer map
                    // is the last thing on the page and should not cost
                    // anything before someone scrolls to it.
                    src={mapSrc}
                    title={`Map of ${f.mapQuery}`}
                    loading="lazy"
                    referrerPolicy="no-referrer-when-downgrade"
                    className="block h-28 w-full border-0"
                  />
                </div>
                <a
                  href={directions ?? undefined}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="tap-target mt-2 inline-flex items-center gap-1.5 text-sm font-semibold text-gold-light transition hover:text-gold"
                >
                  {f.directionsLabel}
                  <span aria-hidden="true">&rarr;</span>
                </a>
              </div>
            </div>
          ) : null}
        </div>
      </div>

      {/* The line and the row under it: the copyright on one side, the two
          things somebody down here still might want on the other. */}
      <div className="border-t border-white/10">
        <div className="mx-auto flex max-w-[86rem] flex-col gap-2 px-5 py-5 text-sm sm:flex-row sm:items-center sm:justify-between sm:px-8 lg:px-12">
          <p>
            &copy; {new Date().getFullYear()} {seo.site.name}. All rights reserved.
          </p>
          <p className="flex items-center gap-3">
            <Link to="/tariff" className="transition hover:text-gold">
              Tariff
            </Link>
            <span aria-hidden="true" className="text-white/25">
              &bull;
            </span>
            <Link to="/contact#enquire" className="transition hover:text-gold">
              Enquire
            </Link>
          </p>
        </div>
      </div>
    </footer>
  );
}
