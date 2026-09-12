import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import seo from '../data/seo.json';

/**
 * Keeps the document title, description and canonical in step with the route.
 *
 * The build prerenders correct tags into each route's HTML, which is what
 * crawlers and link previews read. This handles the other half: once the app
 * has booted, navigation is client-side and never re-requests HTML, so without
 * this the title would stay on whichever page was loaded first -- wrong in the
 * tab, in bookmarks, and in browser history.
 */
export function useSeo() {
  const { pathname } = useLocation();

  useEffect(() => {
    const route =
      seo.routes.find((r) => r.path === pathname) ??
      ({
        title: `Page not found — ${seo.site.name}`,
        description: '',
      } as (typeof seo.routes)[number]);

    document.title = route.title;

    const setMeta = (selector: string, attr: string, value: string) => {
      const el = document.head.querySelector<HTMLMetaElement>(selector);
      if (el) el.setAttribute(attr, value);
    };

    setMeta('meta[name="description"]', 'content', route.description);
    setMeta('meta[property="og:title"]', 'content', route.title);
    setMeta('meta[property="og:description"]', 'content', route.description);
    setMeta('meta[property="og:url"]', 'content', seo.site.origin + pathname);

    const canonical = document.head.querySelector<HTMLLinkElement>(
      'link[rel="canonical"]',
    );
    if (canonical) canonical.href = seo.site.origin + pathname;
  }, [pathname]);
}
