import { Link } from 'react-router-dom';
import seo from '../data/seo.json';
import { useSiteImage } from '../content';
import { Monogram } from './Monogram';

/**
 * The lockup in the header: PREMIUM RENTALS in tracked gold caps above the
 * business name, with the uploaded logo beside it.
 *
 * Until then, the initials in a gold ring. The name on its own reads as a
 * page whose logo failed to load rather than as a deliberate wordmark, which
 * is what the header looked like once the coiled snake beside it was removed.
 *
 * A monogram is not the placeholder the old drawn badge was. That one was a
 * picture of something, competing with whatever real artwork would arrive; a
 * business's initials set in its own two colours is what a business uses while
 * it does not have a logo, and it is honest about being exactly that.
 *
 * Upload one under Website content and it takes the monogram's place. Never
 * both -- two marks side by side is the problem the drawn badge had.
 */
export function Logo({ onClick }: { onClick?: () => void }) {
  const logo = useSiteImage('logo');

  return (
    <Link to="/" onClick={onClick} className="flex min-w-0 items-center gap-2.5 sm:gap-3">
      {!logo ? <Monogram className="size-11 shrink-0 sm:size-12" /> : null}

      {logo ? (
        // The white plate and its padding are what make the logo visible: one
        // with its own dark background would otherwise be a dark mark on a
        // dark header with nothing separating them.
        <span className="inline-flex h-12 shrink-0 items-center justify-center rounded-xl bg-white px-1.5 shadow-[0_2px_10px_rgba(0,0,0,0.25)]">
          {/* max-h rather than h-full: inside a grid a percentage height
              resolves against a row the image itself sizes, so h-full came
              back as the image's own height and overflowed the plate.
          
              The name is written out beside this, so the badge repeating it
              would have a screen reader say the business twice. */}
          <img
            src={logo}
            alt=""
            aria-hidden="true"
            className="max-h-9 w-auto max-w-[116px] object-contain"
          />
        </span>
      ) : null}

      {/* whitespace-nowrap because "NiteSha Cars & Bikes" was breaking after
          "Cars", which reads as two businesses. */}
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
