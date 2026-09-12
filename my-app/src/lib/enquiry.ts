/**
 * Enquiry submission.
 *
 * Posts to the admin panel's public endpoint. That endpoint needs no sign-in
 * and allowlists this origin for CORS (config 'public_site_origin' lists
 * https://niteshacars.in and the www form), so the browser is allowed to read
 * the reply.
 *
 * vehicle_id is deliberately NOT sent: the endpoint checks it against the
 * vehicles table, and the ids in src/data/cars.ts are placeholders that do not
 * exist there, so sending one would be rejected. The chosen car travels in
 * `requirements` instead, which is free text.
 */

const ENDPOINT =
  'https://admin.niteshacars.in/admin/api/enquiry-submit.php';

export interface EnquiryInput {
  name: string;
  phone: string;
  email?: string;
  pickupLocation?: string;
  startDate?: string;
  returnDate?: string;
  car?: string;
  message?: string;
  /** Hidden field. Real people leave it empty; bots fill it in. */
  website?: string;
}

export type EnquiryResult =
  | { ok: true; enquiryNumber: string | null }
  | { ok: false; error: string; fields?: Record<string, string> };

export async function submitEnquiry(
  input: EnquiryInput,
): Promise<EnquiryResult> {
  const payload: Record<string, string> = {
    name: input.name,
    phone: input.phone,
    website: input.website ?? '',
  };

  if (input.email) payload.email = input.email;
  if (input.pickupLocation) payload.pickup_location = input.pickupLocation;
  if (input.startDate) payload.start_date = input.startDate;
  if (input.returnDate) payload.return_date = input.returnDate;
  if (input.car) payload.requirements = `Vehicle of interest: ${input.car}`;
  if (input.message) payload.message = input.message;

  let response: Response;
  try {
    response = await fetch(ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
  } catch {
    // Network failure, DNS, or a CORS rejection — the browser gives us no
    // detail, so say something a caller can act on rather than guessing.
    return {
      ok: false,
      error:
        'Could not reach the booking service. Please check your connection, or call us directly.',
    };
  }

  let body: {
    ok?: boolean;
    enquiry_number?: string | null;
    error?: string;
    fields?: Record<string, string>;
  };
  try {
    body = await response.json();
  } catch {
    return { ok: false, error: 'The booking service returned an unexpected reply.' };
  }

  if (response.ok && body.ok) {
    return { ok: true, enquiryNumber: body.enquiry_number ?? null };
  }

  return {
    ok: false,
    error: body.error ?? 'Something went wrong. Please try again.',
    fields: body.fields,
  };
}
