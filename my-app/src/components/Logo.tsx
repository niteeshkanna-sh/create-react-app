import { Link } from 'react-router-dom';
import seo from '../data/seo.json';
import { useSiteImage } from '../content';

/**
 * The lockup from the logo bar: a round badge, then PREMIUM RENTALS in tracked
 * gold caps above the name in white.
 *
 * The badge is drawn, and stays drawn only until real artwork exists. Drop a
 * file named `logo` into public/photos -- logo.png, logo.svg, logo.webp -- and
 * it takes over the badge on the next build, with nothing here to edit. That
 * is the same rule the car photographs and the page banners follow, so there
 * is one thing to remember rather than three.
 */
export function Logo({ onClick }: { onClick?: () => void }) {
  // Uploaded in the panel first, then a file dropped into public/photos, then
  // the drawn badge. The panel wins because it is the one an owner can change
  // without touching the repository.
  const logo = useSiteImage('logo');

  return (
    <Link to="/" onClick={onClick} className="flex min-w-0 items-center gap-2.5 sm:gap-3">
      <span className="grid size-11 shrink-0 place-items-center overflow-hidden rounded-full bg-white shadow-[0_2px_10px_rgba(0,0,0,0.25)]">
        {logo ? (
          // The name is written out beside this, so the badge repeating it
          // would have a screen reader say the business twice.
          <img src={logo} alt="" aria-hidden="true" className="size-full object-cover" />
        ) : (
        <svg viewBox="0 0 40 40" className="size-9" aria-hidden="true">
          <defs>
            <linearGradient id="ns-gold" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="#F0D060" />
              <stop offset="45%" stopColor="#D4AF37" />
              <stop offset="100%" stopColor="#B8860B" />
            </linearGradient>
          </defs>
          <text
            x="20"
            y="21"
            textAnchor="middle"
            fontSize="15"
            fontWeight="700"
            fill="url(#ns-gold)"
            fontFamily="Poppins, sans-serif"
          >
            NS
          </text>
          <text
            x="20"
            y="31"
            textAnchor="middle"
            fontSize="6"
            fontWeight="600"
            letterSpacing="1.4"
            fill="url(#ns-gold)"
            fontFamily="Poppins, sans-serif"
          >
            CARS
          </text>
        </svg>
        )}
      </span>

      {/* whitespace-nowrap because "NiteSha Cars & Bikes" was breaking after
          "Cars", which reads as two businesses. It is sized to fit the
          narrowest phone beside the badge and the menu button rather than
          being allowed to wrap. */}
      <span className="min-w-0 leading-tight">
        <span className="eyebrow-gold block text-[9px] sm:text-[11px]">
          Premium Rentals
        </span>
        <span className="block text-[15px] font-bold tracking-tight whitespace-nowrap text-white sm:text-lg">
          {seo.site.name}
        </span>
      </span>
    </Link>
  );
}
