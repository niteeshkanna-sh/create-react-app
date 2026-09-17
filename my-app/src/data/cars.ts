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
  /** Daily rate in rupees. What a booking is charged at. */
  rateDaily: number;
  /**
   * Top of the advertised daily band, when the price is a range rather than
   * one figure. Display only -- rateDaily is still what is charged.
   */
  rateDailyMax?: number;
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
  // Empty on purpose. The site previously shipped invented vehicles, which
  // meant customers could enquire about cars that do not exist.
  //
  // Add the real fleet here and it appears immediately -- the listing, the
  // body-type filters and the enquiry form's car picker all read from this
  // array, and all of them handle an empty fleet on their own. Every push to
  // main redeploys.
  //
  // Shape one like this:
  //
  // {
  //   id: 'swift-01',
  //   brand: 'Maruti Suzuki',
  //   name: 'Swift',
  //   bodyType: 'Hatchback',
  //   fuel: 'Petrol',
  //   transmission: 'Manual',
  //   seats: 5,
  //   year: 2021,
  //   rateDaily: 1600,
  //   rateWeekly: 1400,      // optional, per day
  //   rateMonthly: 1200,     // optional, per day
  //   kmLimitPerDay: 200,
  //   extraKmRate: 9,
  //   deposit: 3000,
  //   image: '/swift.webp',  // optional, put the file in my-app/public/
  //   available: true,
  // },
];

/** Rupee formatting, Indian digit grouping, no decimals. */
export const inr = (n: number) =>
  new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(n);

/**
 * What a card prints as the daily price.
 *
 * A band when the panel carries an upper rate, one figure otherwise. An upper
 * rate equal to or below the daily rate is treated as no band at all: printing
 * "₹1,600 – ₹1,600" would look like a fault, and "₹1,800 – ₹1,600" like a
 * different one.
 */
export const dailyRate = (car: Pick<Car, 'rateDaily' | 'rateDailyMax'>) =>
  car.rateDailyMax !== undefined && car.rateDailyMax > car.rateDaily
    ? `${inr(car.rateDaily)} – ${inr(car.rateDailyMax)}`
    : inr(car.rateDaily);
