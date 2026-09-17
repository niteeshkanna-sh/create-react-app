import { useId } from 'react';
import { photoFor } from '../lib/photos';
import { useBrand } from '../content';

/**
 * The coiled snake in the header, turning slowly on its own centre.
 *
 * Drawn rather than a stock image, for the same reason the logo badge is: it
 * sits on the navy header at around 48px, and a photograph of a snake that
 * small is a brown smudge. The gold is the site's own, so it reads as part of
 * the mark rather than a sticker on top of it.
 *
 * A coil is the one snake shape rotation flatters -- a straight snake spinning
 * would read as a stick on a spindle. The body tapers, which a stroked arc
 * cannot do (stroke-width is one number for the whole path), so it is a filled
 * outline instead: down the outer edge, round the tail, back along the inner.
 *
 * The proportions are set for the size it is actually displayed at, not for
 * the size it was drawn at. A finer body and a tighter coil look better at
 * 120px and turn into a loading spinner at 48 -- which was the first attempt.
 *
 * Upload one in the panel, under Website content, and it replaces the drawing.
 * A file named `snake` in public/photos does the same for anyone working in the
 * repository; the uploaded one wins, because it is the one that can be changed
 * without a deploy.
 */
export function SnakeMark({ className }: { className?: string }) {
  // Unique per instance: two copies on one page would both define
  // `#snake-gold` and the browser would paint both with whichever it saw last.
  const uid = useId().replace(/:/g, '');
  const photo = useBrand().snake ?? photoFor('snake');

  if (photo) {
    return (
      <img
        src={photo}
        alt=""
        aria-hidden="true"
        className={`snake-mark ${className ?? ''}`}
      />
    );
  }

  return (
    <svg
      viewBox="0 0 100 100"
      aria-hidden="true"
      focusable="false"
      className={`snake-mark ${className ?? ''}`}
    >
      <defs>
        <linearGradient id={`snake-gold-${uid}`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#F0D060" />
          <stop offset="45%" stopColor="#D4AF37" />
          <stop offset="100%" stopColor="#B8860B" />
        </linearGradient>
      </defs>

      <path d="M 46.4 8.7 L 49.8 8.7 L 53.3 9.0 L 56.7 9.7 L 60.0 10.6 L 63.1 11.7 L 66.2 13.2 L 69.1 14.9 L 71.9 16.8 L 74.4 18.9 L 76.8 21.2 L 78.9 23.7 L 80.8 26.4 L 82.5 29.1 L 83.9 32.0 L 85.1 35.0 L 86.0 38.1 L 86.6 41.2 L 86.9 44.3 L 87.0 47.4 L 86.9 50.5 L 86.4 53.6 L 85.8 56.6 L 84.8 59.5 L 83.7 62.3 L 82.3 64.9 L 80.7 67.4 L 78.9 69.8 L 77.0 72.0 L 74.9 74.0 L 72.6 75.8 L 70.2 77.3 L 67.7 78.7 L 65.1 79.8 L 62.5 80.7 L 59.8 81.4 L 57.1 81.8 L 54.3 82.0 L 51.6 82.0 L 49.0 81.8 L 46.3 81.3 L 43.8 80.6 L 41.3 79.7 L 39.0 78.6 L 36.8 77.3 L 34.7 75.9 L 32.7 74.3 L 31.0 72.5 L 29.4 70.6 L 27.9 68.7 L 26.7 66.6 L 25.6 64.4 L 24.8 62.2 L 24.1 59.9 L 23.7 57.7 L 23.4 55.4 L 23.4 53.1 L 23.5 50.9 L 23.8 48.7 L 24.4 46.5 L 25.0 44.5 L 25.9 42.5 L 26.9 40.6 L 28.0 38.9 L 29.3 37.2 L 30.7 35.7 L 32.2 34.4 L 33.8 33.2 L 35.4 32.1 L 37.2 31.2 L 38.9 30.5 L 40.7 29.9 L 42.5 29.5 A 2.8 2.8 0 0 1 44.5 34.8 L 43.2 35.2 L 41.9 35.8 L 40.7 36.5 L 39.6 37.2 L 38.5 38.1 L 37.5 39.0 L 36.6 40.1 L 35.7 41.2 L 35.0 42.4 L 34.3 43.6 L 33.8 44.9 L 33.3 46.3 L 33.0 47.7 L 32.8 49.1 L 32.7 50.6 L 32.7 52.0 L 32.8 53.5 L 33.1 54.9 L 33.5 56.4 L 34.0 57.7 L 34.6 59.1 L 35.4 60.4 L 36.2 61.7 L 37.2 62.8 L 38.2 63.9 L 39.4 64.9 L 40.6 65.9 L 41.9 66.7 L 43.3 67.4 L 44.8 68.0 L 46.3 68.5 L 47.8 68.8 L 49.4 69.0 L 51.0 69.1 L 52.6 69.1 L 54.2 68.9 L 55.8 68.6 L 57.4 68.2 L 58.9 67.6 L 60.4 66.9 L 61.9 66.0 L 63.2 65.1 L 64.5 64.0 L 65.7 62.8 L 66.9 61.5 L 67.9 60.2 L 68.8 58.7 L 69.6 57.1 L 70.2 55.5 L 70.7 53.8 L 71.1 52.1 L 71.3 50.3 L 71.4 48.5 L 71.4 46.7 L 71.2 44.9 L 70.8 43.1 L 70.3 41.3 L 69.6 39.6 L 68.8 37.9 L 67.8 36.3 L 66.7 34.8 L 65.5 33.3 L 64.2 31.9 L 62.7 30.7 L 61.1 29.6 L 59.4 28.5 L 57.7 27.7 L 55.8 26.9 L 53.9 26.4 L 51.9 25.9 L 49.9 25.7 L 47.9 25.6 Z" fill={`url(#snake-gold-${uid})`} />

      {/* The head is rotated onto the body's tangent where it ends, not set at
          a fixed angle: a head glued on straight is what makes a drawn snake
          look wrong without anyone being able to say why. */}
      <g transform="translate(47.1 17.1) rotate(-185)">
        <ellipse cx="0" cy="0" rx="11.1" ry="8.6" fill={`url(#snake-gold-${uid})`} />
        <circle cx="5.0" cy="-3.3" r="1.9" fill="#0B1220" />
        <path
          d="M10.5 1.9 L18.8 4.4 M15.5 3.3 L19.7 1.5 M15.5 3.3 L19.7 6.6"
          stroke="#C0392B"
          strokeWidth="1.44"
          strokeLinecap="round"
          fill="none"
        />
      </g>
    </svg>
  );
}
