import { Link } from 'react-router-dom';
import seo from '../data/seo.json';
import { useSiteImage } from '../content';
import { Monogram } from './Monogram';
import { EMBLEM_FALLBACK } from './BrandPanel';

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
  // The owner's own mark, with an upload still able to replace it. The
  // committed one is the emblem alone; an uploaded logo is used as supplied,
  // because somebody uploading a logo means the one they uploaded.
  const logo = useSiteImage('logo') ?? EMBLEM_FALLBACK;

  return (
    <Link to="/" onClick={onClick} className="flex min-w-0 items-center gap-2.5 sm:gap-3">
      {logo ? (
        // Straight onto the navy, with no plate behind it. The plate used to
        // be white, which was right for a mark that might arrive with a dark
        // background of its own -- and wrong for this one, where "CARS &
        // BIKES" is set in white and would have vanished into it.
        //
        // The name is written out beside this, so a screen reader reading the
        // mark as well would say the business twice.
        <img
          src={logo}
          alt=""
          aria-hidden="true"
          className="h-10 w-auto shrink-0 object-contain sm:h-12"
        />
      ) : (
        <Monogram className="size-11 shrink-0 sm:size-12" />
      )}

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
