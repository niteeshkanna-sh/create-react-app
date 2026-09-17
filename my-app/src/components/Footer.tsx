import { Link } from 'react-router-dom';
import seo from '../data/seo.json';
import { useHome, useSiteImage } from '../content';
import { SocialLinks } from './SocialLinks';

/** The footer names five and sends the rest to /services. */
const SHOWN = 5;

/**
 * +916374942976 -> +91 63749 42976.
 *
 * seo.json holds the dialling form, which is what tel: needs and what nobody
 * wants to read. Derived rather than written out a second time, so the two can
 * never end up being different numbers.
 */
function readablePhone(raw: string): string {
  const digits = raw.replace(/[^0-9]/g, '');
  return digits.length === 12 && digits.startsWith('91')
    ? `+91 ${digits.slice(2, 7)} ${digits.slice(7)}`
    : raw;
}

export function Footer() {
  // The same list the home page and /services read, so adding a service in the
  // panel puts it in all three rather than in two that then disagree.
  const services = useHome().services.items;
  // The footer showed a letter N while an uploaded logo sat in the header.
  const logo = useSiteImage('logo');

  return (
    <footer className="bg-navy text-white/70">
      <div className="mx-auto grid max-w-6xl gap-8 px-5 py-14 sm:grid-cols-2 lg:grid-cols-4">
        <div>
          <div className="flex items-center gap-2.5">
            {/* No drawn stand-in here either -- the letter N was a placeholder
                for a logo that can now be uploaded. */}
            {logo ? (
              <span className="inline-flex h-10 shrink-0 items-center justify-center rounded-xl bg-white px-1.5">
                <img src={logo} alt="" aria-hidden="true" className="max-h-7 w-auto max-w-[96px] object-contain" />
              </span>
            ) : null}
            <span className="text-lg font-semibold text-white">{seo.site.name}</span>
          </div>
          <p className="mt-3 text-sm leading-relaxed">
            Self drive cars, bike rental, wedding cars and tourist vehicles
            across Kanyakumari district.
          </p>
        </div>

        <div>
          <h2 className="text-sm font-semibold tracking-wide text-white uppercase">
            Get in touch
          </h2>
          <ul className="tap-list mt-3 space-y-2 text-sm">
            <li>
              <a href={`tel:${seo.site.phone}`} className="transition hover:text-gold">
                {readablePhone(seo.site.phone)}
              </a>
            </li>
            <li>
              <a href={`mailto:${seo.site.email}`} className="transition hover:text-gold">
                {seo.site.email}
              </a>
            </li>
            <li>
              <Link to="/places" className="transition hover:text-gold">
                Places to visit
              </Link>
            </li>
            <li>
              <Link to="/contact" className="transition hover:text-gold">
                Enquire
              </Link>
            </li>
          </ul>
        </div>

        <div>
          <h2 className="text-sm font-semibold tracking-wide text-white uppercase">
            Services
          </h2>
          <ul className="tap-list mt-3 space-y-2 text-sm">
            {services.slice(0, SHOWN).map((s) => (
              <li key={s.to}>
                <Link to={s.to} className="transition hover:text-gold">
                  {s.title}
                </Link>
              </li>
            ))}
          </ul>
          {services.length > SHOWN ? (
            <Link
              to="/services"
              className="mt-4 inline-flex min-h-11 items-center gap-1.5 rounded-xl border border-gold/40 px-4 text-sm font-semibold text-gold-light transition hover:bg-gold/10 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold"
            >
              View all services
              <span aria-hidden="true">&rarr;</span>
            </Link>
          ) : null}
        </div>

        <SocialLinks />
      </div>

      <div className="border-t border-white/10">
        <p className="mx-auto max-w-6xl px-5 py-5 text-sm">
          &copy; {new Date().getFullYear()} {seo.site.name}. All rights reserved.
        </p>
      </div>
    </footer>
  );
}
