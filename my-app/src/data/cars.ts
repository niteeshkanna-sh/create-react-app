/**
 * The fleet shown on the site.
 *
 * These are PLACEHOLDERS. The live vehicle list lives in the admin database,
 * but api/vehicles.php calls api_guard('vehicle.view'), so it cannot be read
 * without signing in — a public site has no way to fetch it. Edit this file to
 * match the real fleet; every push to main redeploys the site.
 *
 * Fields mirror the vehicles and vehicle_rates tables so the two stay
 * comparable: rates are rupees, kmLimitPerDay and extraKmRate come from the
 * current rate card, and deposit is security_deposit.
 */

export type BodyType = 'Hatchback' | 'Sedan' | 'SUV' | 'MUV';
export type Fuel = 'Petrol' | 'Diesel' | 'Electric' | 'CNG';
export type Transmission = 'Manual' | 'Automatic';

export interface Car {
  id: string;
  brand: string;
  name: string;
  bodyType: BodyType;
  fuel: Fuel;
  transmission: Transmission;
  seats: number;
  year: number;
  /** Daily rate in rupees. */
  rateDaily: number;
  /** Per-day rate when hired for a week or more. Omit if not offered. */
  rateWeekly?: number;
  /** Per-day rate for a month or more. Omit if not offered. */
  rateMonthly?: number;
  kmLimitPerDay: number;
  extraKmRate: number;
  deposit: number;
  image?: string;
  available: boolean;
}

export const cars: Car[] = [
  {
    id: 'brezza',
    brand: 'Maruti Suzuki',
    name: 'Vitara Brezza',
    bodyType: 'SUV',
    fuel: 'Petrol',
    transmission: 'Manual',
    seats: 5,
    year: 2022,
    rateDaily: 2400,
    rateWeekly: 2100,
    rateMonthly: 1800,
    kmLimitPerDay: 200,
    extraKmRate: 12,
    deposit: 5000,
    image: '/car-brezza.avif',
    available: true,
  },
  {
    id: 'swift',
    brand: 'Maruti Suzuki',
    name: 'Swift',
    bodyType: 'Hatchback',
    fuel: 'Petrol',
    transmission: 'Manual',
    seats: 5,
    year: 2021,
    rateDaily: 1600,
    rateWeekly: 1400,
    rateMonthly: 1200,
    kmLimitPerDay: 200,
    extraKmRate: 9,
    deposit: 3000,
    available: true,
  },
  {
    id: 'city',
    brand: 'Honda',
    name: 'City',
    bodyType: 'Sedan',
    fuel: 'Petrol',
    transmission: 'Automatic',
    seats: 5,
    year: 2023,
    rateDaily: 2800,
    rateWeekly: 2500,
    rateMonthly: 2200,
    kmLimitPerDay: 250,
    extraKmRate: 14,
    deposit: 6000,
    available: true,
  },
  {
    id: 'innova',
    brand: 'Toyota',
    name: 'Innova Crysta',
    bodyType: 'MUV',
    fuel: 'Diesel',
    transmission: 'Manual',
    seats: 7,
    year: 2022,
    rateDaily: 3800,
    rateWeekly: 3400,
    rateMonthly: 3000,
    kmLimitPerDay: 250,
    extraKmRate: 16,
    deposit: 8000,
    available: true,
  },
  {
    id: 'baleno',
    brand: 'Maruti Suzuki',
    name: 'Baleno',
    bodyType: 'Hatchback',
    fuel: 'Petrol',
    transmission: 'Automatic',
    seats: 5,
    year: 2023,
    rateDaily: 1900,
    rateWeekly: 1700,
    rateMonthly: 1500,
    kmLimitPerDay: 200,
    extraKmRate: 10,
    deposit: 4000,
    available: false,
  },
  {
    id: 'nexon-ev',
    brand: 'Tata',
    name: 'Nexon EV',
    bodyType: 'SUV',
    fuel: 'Electric',
    transmission: 'Automatic',
    seats: 5,
    year: 2024,
    rateDaily: 3200,
    rateWeekly: 2900,
    rateMonthly: 2600,
    kmLimitPerDay: 180,
    extraKmRate: 13,
    deposit: 7000,
    available: true,
  },
];

/** Rupee formatting, Indian digit grouping, no decimals. */
export const inr = (n: number) =>
  new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(n);
