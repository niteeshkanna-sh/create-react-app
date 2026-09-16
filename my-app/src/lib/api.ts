/**
 * Where the admin panel's public endpoints live.
 *
 * The site and the panel now sit on one host: the website at niteshacars.in
 * and the panel at niteshacars.in/admin. That makes these requests same-origin,
 * which removes a whole class of problem rather than configuring around it --
 * no CORS preflight, no allowlist to keep in step with the domain, and no
 * second certificate. The missing certificate on admin.niteshacars.in is
 * exactly what silently emptied the fleet: a browser refuses to read across
 * origins from a host it does not trust, and it fails without a word.
 *
 * VITE_API_BASE overrides it, for running the site locally against a panel
 * that is somewhere else. Unset, it is a relative path, which is what
 * production wants.
 */
const base = import.meta.env.VITE_API_BASE ?? '/admin';

export function apiUrl(endpoint: string): string {
  return `${base.replace(/\/+$/, '')}/api/${endpoint.replace(/^\/+/, '')}`;
}
