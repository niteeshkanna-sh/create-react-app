import { Link } from 'react-router-dom';
import seo from '../data/seo.json';
import { useSiteImage } from '../content';

/**
 * The lockup in the header: PREMIUM RENTALS in tracked gold caps above the
 * business name, with the uploaded logo beside it.
 *
 * There is no drawn badge any more. One was shipped so the header never looked
 * unfinished before real artwork existed, but a placeholder that looks like a
 * logo is worse than none once there is a real one to upload -- it is a second
 * mark competing with the first. Upload one under Website content and it
 * appears here; until then the name carries the header on its own.
 */
export function Logo({ onClick }: { onClick?: () => void }) {
  const logo = useSiteImage('logo');

  return (
    <Link to="/" onClick={onClick} className="flex min-w-0 items-center gap-2.5 sm:gap-3">
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
