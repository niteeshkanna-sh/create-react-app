import { Link } from 'react-router-dom';
import { usePlaces } from '../lib/usePlaces';
import { PlaceCard } from './PlaceCard';
import { Reveal } from './Reveal';

/**
 * A short list of places on the home page, with a way through to all of them.
 *
 * Three, because the row is three across on a desktop and a ragged fourth
 * card looks like a mistake. The full list is its own page: it is the thing
 * someone planning a trip actually wants, and it is worth being a URL that can
 * be shared and found.
 *
 * Renders nothing at all when the list is empty, rather than an empty heading.
 * A section that says "places to visit" above white space is worse than no
 * section.
 */
export function PlacesTeaser() {
  const places = usePlaces();
  if (places.length === 0) return null;

  return (
    <section className="bg-cream/60">
      <div className="mx-auto max-w-6xl px-5 py-20">
        <div className="flex flex-wrap items-end justify-between gap-6">
          <div>
            <h2 className="text-3xl font-bold tracking-tight text-navy sm:text-4xl">
              Where people go
            </h2>
            <p className="mt-2 max-w-lg text-ink-dim">
              The coast, the temples and the waterfalls are all an easy drive from
              Nagercoil. Take the car and go at your own pace.
            </p>
          </div>

          <Link
            to="/places"
            className="rounded-xl border border-line bg-white px-5 py-2.5 font-semibold text-navy transition hover:border-navy/40 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold"
          >
            View all {places.length} places
          </Link>
        </div>

        <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {places.slice(0, 3).map((place, i) => (
            <Reveal key={place.id} delay={i * 70}>
              <PlaceCard place={place} />
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
