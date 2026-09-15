/**
 * Fleet loading.
 *
 * Vehicles live in the admin panel's database, which is the single place they
 * are managed. The public endpoint returns only cars whose status is Available
 * and only public-safe columns, so adding a car in the panel puts it on the
 * site and setting one to Maintenance takes it off.
 *
 * cars.ts remains as a fallback: if the API is unreachable the site shows
 * whatever is in that file rather than an error. It is empty by default, which
 * degrades to the "ask us what's available" state.
 */
import { cars as fallbackCars, type Car } from '../data/cars';

const ENDPOINT =
  'https://admin.niteshacars.in/api/public-vehicles.php';

interface ApiVehicle {
  id: string;
  brand: string;
  name: string;
  bodyType: string;
  fuel: string;
  transmission: string;
  seats: number;
  year: number;
  rateDaily: number;
  rateWeekly: number | null;
  rateFortnight: number | null;
  rateMonthly: number | null;
  kmLimitPerDay: number;
  extraKmRate: number;
  deposit: number;
}

const BODY_TYPES = ['Hatchback', 'Sedan', 'SUV', 'MUV'] as const;
const FUELS = ['Petrol', 'Diesel', 'Electric', 'CNG'] as const;
const TRANSMISSIONS = ['Manual', 'Automatic'] as const;

/**
 * The database allows body types and fuels the site does not render (MUV is
 * shared, but 'Other' exists server-side). Anything unrecognised falls back to
 * a sane value rather than breaking the filters.
 */
function toCar(v: ApiVehicle): Car {
  const bodyType = (BODY_TYPES as readonly string[]).includes(v.bodyType)
    ? (v.bodyType as Car['bodyType'])
    : 'Hatchback';
  const fuel = (FUELS as readonly string[]).includes(v.fuel)
    ? (v.fuel as Car['fuel'])
    : 'Petrol';
  const transmission = (TRANSMISSIONS as readonly string[]).includes(v.transmission)
    ? (v.transmission as Car['transmission'])
    : 'Manual';

  return {
    id: v.id,
    brand: v.brand,
    name: v.name,
    bodyType,
    fuel,
    transmission,
    seats: v.seats,
    year: v.year,
    rateDaily: v.rateDaily,
    rateWeekly: v.rateWeekly ?? undefined,
    rateMonthly: v.rateMonthly ?? undefined,
    kmLimitPerDay: v.kmLimitPerDay,
    extraKmRate: v.extraKmRate,
    deposit: v.deposit,
    available: true, // the endpoint only returns Available vehicles
  };
}

export type FleetState =
  | { status: 'loading' }
  | { status: 'ready'; cars: Car[]; live: boolean };

export async function loadFleet(signal?: AbortSignal): Promise<FleetState> {
  try {
    const response = await fetch(ENDPOINT, { signal });
    if (!response.ok) throw new Error(String(response.status));

    const body: { ok?: boolean; vehicles?: ApiVehicle[] } = await response.json();
    if (!body.ok || !Array.isArray(body.vehicles)) throw new Error('bad shape');

    return { status: 'ready', cars: body.vehicles.map(toCar), live: true };
  } catch {
    // Offline, CORS, a 500, or the endpoint not uploaded yet. Falling back
    // keeps the page coherent; it never shows a broken listing.
    return { status: 'ready', cars: fallbackCars, live: false };
  }
}
