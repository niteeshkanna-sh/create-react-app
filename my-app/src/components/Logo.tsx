import { Link } from 'react-router-dom';
import seo from '../data/seo.json';

/**
 * The lockup from the logo bar: a round badge, then PREMIUM RENTALS in tracked
 * gold caps above the name in white.
 *
 * The badge is drawn rather than an image file, because the artwork has not
 * been supplied yet. Replace the svg with an <img> once it has -- the layout
 * around it will not need to change.
 */
export function Logo({ onClick }: { onClick?: () => void }) {
  return (
    <Link to="/" onClick={onClick} className="flex items-center gap-3">
      <span className="grid size-11 shrink-0 place-items-center rounded-full bg-white shadow-[0_2px_10px_rgba(0,0,0,0.25)]">
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
      </span>

      <span className="leading-tight">
        <span className="eyebrow-gold block text-[10px] sm:text-[11px]">
          Premium Rentals
        </span>
        <span className="block text-base font-bold tracking-tight text-white sm:text-lg">
          {seo.site.name}
        </span>
      </span>
    </Link>
  );
}
