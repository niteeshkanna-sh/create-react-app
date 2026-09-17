import { useEffect, useState } from 'react';
import { loadPlaces, type Place } from './places';

/** Loads the places list once per mount, aborting if the page unmounts first. */
export function usePlaces(): Place[] {
  const [places, setPlaces] = useState<Place[]>([]);

  useEffect(() => {
    const controller = new AbortController();
    let active = true;

    loadPlaces(controller.signal).then((next) => {
      if (active) setPlaces(next);
    });

    return () => {
      active = false;
      controller.abort();
    };
  }, []);

  return places;
}
