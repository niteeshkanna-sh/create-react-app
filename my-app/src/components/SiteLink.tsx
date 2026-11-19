import { Link as RouterLink, NavLink as RouterNavLink } from 'react-router-dom';
import type { ComponentProps } from 'react';

/**
 * react-router's Link, with the trailing slash the host actually serves.
 *
 * Apache adds a slash to a directory and 301s to it, and every page on this
 * site is a directory with an index.html in it. So a link written as
 * "/tariff" is a redirect and "/tariff/" is the page. Visitors never felt it
 * -- the router intercepts the click and no request is made -- but a crawler
 * follows the href, so every internal link on the site cost Googlebot a
 * redirect hop, on a site whose whole point is being found.
 *
 * Done here rather than by editing the hrefs because most of them are not
 * written down: the navigation comes from a data file, the blog and town
 * links are built from slugs, and the banner's buttons are whatever the owner
 * typed into the panel. One wrapper covers all of them, including the ones
 * added after this was written.
 *
 * The router matches either spelling -- verified against the live site, where
 * /tariff/ hydrates to the Tariff page and a client-side push to /about/
 * renders About -- so this changes what a crawler reads, not what the app does.
 */

/** Adds the slash the host would redirect to, and leaves everything else be. */
export function withTrailingSlash(to: string): string {
  // Only site-absolute paths. External URLs, tel:, mailto:, a bare #hash and
  // anything relative are somebody else's business.
  if (!to.startsWith('/')) return to;

  const m = to.match(/^([^?#]*)([?#].*)?$/);
  if (!m) return to;
  const path = m[1];
  const rest = m[2] ?? '';

  if (path === '' || path === '/' || path.endsWith('/')) return to;

  // A file, not a page: /photos/car.webp is served by Apache as itself, and
  // adding a slash to it would be a 404. The last segment having a dot in it
  // is what separates the two -- site routes here never do.
  if (path.slice(path.lastIndexOf('/') + 1).includes('.')) return to;

  return path + '/' + rest;
}

export function Link({ to, ...rest }: ComponentProps<typeof RouterLink>) {
  return <RouterLink to={typeof to === 'string' ? withTrailingSlash(to) : to} {...rest} />;
}

/**
 * The same for the navigation, which is NavLink rather than Link because it
 * marks the page you are on. Everything else -- `end`, the className that
 * takes an isActive argument -- rides through untouched; the router decides
 * "am I on this page" with the same matcher either spelling goes through, so
 * the highlight is unaffected.
 */
export function NavLink({ to, ...rest }: ComponentProps<typeof RouterNavLink>) {
  return <RouterNavLink to={typeof to === 'string' ? withTrailingSlash(to) : to} {...rest} />;
}
