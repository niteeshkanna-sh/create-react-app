import live from './live.json';

/**
 * The site's editable copy, as it stood when this build ran.
 *
 * live.json is written by scripts/fetch-content.mjs before Vite starts: the
 * admin panel's version if it answered, the committed defaults if it did not.
 * It is generated and git-ignored, so this import is the only place the rest
 * of the app needs to know any of that happened.
 */
export const content = live;
export const home = live.home;
