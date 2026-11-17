/**
 * A wheel turning, for the moments the site is fetching something.
 *
 * There are only two of those, and neither is the first paint: the pages are
 * prerendered, so the words and the pictures are in the HTML before any
 * script runs, and a spinner over that would be a spinner over a finished
 * page. What it covers is a page being opened from another one -- each route
 * is its own chunk, and the gap while that downloads used to be a blank navy
 * block -- and a form waiting on the server.
 *
 * Drawn rather than a borrowed spinner: a tyre is the one shape this
 * business could not be mistaken for anything else with, and it is the same
 * palette and the same weight of line as every other drawing on the site.
 *
 * Announced politely rather than silently. A screen reader is told the page
 * is loading once, and told nothing more when it arrives -- the page itself
 * is the announcement.
 */
export function Loader({
  label = 'Loading',
  size = 54,
  className,
}: {
  label?: string;
  size?: number;
  className?: string;
}) {
  return (
    <span role="status" aria-live="polite" className={`loader ${className ?? ''}`}>
      <svg
        width={size}
        height={size}
        viewBox="0 0 64 64"
        fill="none"
        aria-hidden="true"
        focusable="false"
        className="loader-wheel"
      >
        {/* The tyre. */}
        <circle cx="32" cy="32" r="28" fill="#0a0e20" />
        <circle cx="32" cy="32" r="28" stroke="currentColor" strokeOpacity="0.25" strokeWidth="2" />
        {/* Tread, as blocks around the wall rather than a dashed ring: a dash
            array on a circle starts and ends at three o'clock, and the seam
            is visible the whole way round once it turns. */}
        <g stroke="currentColor" strokeOpacity="0.55" strokeWidth="3" strokeLinecap="round">
          {Array.from({ length: 12 }, (_, i) => {
            const a = (i / 12) * Math.PI * 2;
            const inner = 23.5;
            const outer = 27.5;
            return (
              <path
                key={i}
                d={`M${32 + Math.cos(a) * inner} ${32 + Math.sin(a) * inner}L${32 + Math.cos(a) * outer} ${32 + Math.sin(a) * outer}`}
              />
            );
          })}
        </g>
        {/* The rim and its spokes. */}
        <circle cx="32" cy="32" r="18" fill="none" stroke="currentColor" strokeWidth="3" />
        <g stroke="currentColor" strokeWidth="3.5" strokeLinecap="round">
          {Array.from({ length: 5 }, (_, i) => {
            const a = (i / 5) * Math.PI * 2 - Math.PI / 2;
            return (
              <path
                key={i}
                d={`M32 32L${32 + Math.cos(a) * 16} ${32 + Math.sin(a) * 16}`}
              />
            );
          })}
        </g>
        <circle cx="32" cy="32" r="5" fill="currentColor" />
        {/* One bright block, so the turn is visible. A wheel with five equal
            spokes looks still at any speed that is a multiple of a fifth. */}
        <path d="M32 32L32 16" stroke="#fff3cf" strokeWidth="4" strokeLinecap="round" />
      </svg>

      {/* The road going past under it. */}
      <span aria-hidden="true" className="loader-road" />

      <span className="sr-only">{label}</span>
    </span>
  );
}

/**
 * The same wheel, small enough to sit inside a button that is waiting.
 *
 * Takes the button's own colour, so it is navy on the gold button and white
 * on the navy one without either of them saying so.
 */
export function LoaderDot({ label = 'Sending' }: { label?: string }) {
  return (
    <span role="status" aria-live="polite" className="loader-dot">
      <svg width="16" height="16" viewBox="0 0 64 64" fill="none" aria-hidden="true" className="loader-wheel">
        <circle cx="32" cy="32" r="27" fill="none" stroke="currentColor" strokeOpacity="0.35" strokeWidth="7" />
        <circle cx="32" cy="32" r="13" fill="none" stroke="currentColor" strokeWidth="5" />
        <path d="M32 32L32 19" stroke="currentColor" strokeWidth="6" strokeLinecap="round" />
      </svg>
      <span className="sr-only">{label}</span>
    </span>
  );
}
