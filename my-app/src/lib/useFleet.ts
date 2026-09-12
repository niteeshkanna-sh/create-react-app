import { useEffect, useState } from 'react';
import { loadFleet, type FleetState } from './vehicles';

/** Loads the fleet once per mount, aborting if the page unmounts first. */
export function useFleet(): FleetState {
  const [state, setState] = useState<FleetState>({ status: 'loading' });

  useEffect(() => {
    const controller = new AbortController();
    let active = true;

    loadFleet(controller.signal).then((next) => {
      if (active) setState(next);
    });

    return () => {
      active = false;
      controller.abort();
    };
  }, []);

  return state;
}
