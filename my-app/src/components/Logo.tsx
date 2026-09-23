import { Link } from 'react-router-dom';
import seo from '../data/seo.json';
import { useSiteImage } from '../content';
import { Monogram } from './Monogram';
import { LOGO_FALLBACK } from './BrandPanel';

/**
 * The mark in the header, and nothing beside it.
 *
 * It used to be the mark plus PREMIUM RENTALS over the business name in live
 * text. That made sense while there was no logo: the words were the logo. It
 * stopped making sense the moment a real one arrived, because this one has the
 * name drawn into it -- so the header was saying "NiteSha Cars & Bikes" twice,
 * once as artwork and once as type, in two faces at two sizes.
 *
 * The full lockup rather than the emblem, precisely because the text is gone:
 * with no words beside it, the mark has to carry the name itself. It is set
 * large enough that it does, which makes the header taller than a wordmark
 * would -- the cost of a logo with its name drawn in.
 *
 * Alt text rather than aria-hidden, for the same reason. There is no longer a
 * written name for a screen reader to find, so the picture has to supply it.
 *
 * The monogram and the old wordmark stay as the fallback for a site with no
 * logo at all, which is what this was before the owner sent one.
 */
export function Logo({ onClick }: { onClick?: () => void }) {
  // An upload replaces it; until then, the file the owner supplied.
  const logo = useSiteImage('logo') ?? LOGO_FALLBACK;

  if (logo) {
    return (
      <Link
        to="/"
        onClick={onClick}
        className="flex shrink-0 items-center focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-gold"
      >
        <img
          src={logo}
          alt={seo.site.name}
          // The one picture above the fold on every page, so it is not left to
          // be discovered late.
          fetchPriority="high"
          decoding="async"
          className="h-12 w-auto object-contain sm:h-16"
        />
      </Link>
    );
  }

  return (
    <Link to="/" onClick={onClick} className="flex min-w-0 items-center gap-2.5 sm:gap-3">
      <Monogram className="size-11 shrink-0 sm:size-12" />
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
