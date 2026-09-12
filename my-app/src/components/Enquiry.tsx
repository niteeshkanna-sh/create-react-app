import { useState, type FormEvent } from 'react';
import { useSearchParams } from 'react-router-dom';
import { submitEnquiry } from '../lib/enquiry';
import { useFleet } from '../lib/useFleet';

type Status =
  | { kind: 'idle' }
  | { kind: 'sending' }
  | { kind: 'sent'; enquiryNumber: string | null }
  | { kind: 'error'; message: string; fields?: Record<string, string> };

const field =
  'w-full rounded-xl border border-line bg-white px-3.5 py-2.5 text-ink outline-none transition placeholder:text-ink-faint focus:border-navy focus:ring-2 focus:ring-navy/15';
const label = 'block text-sm font-medium text-ink-dim';

export function Enquiry() {
  const [status, setStatus] = useState<Status>({ kind: 'idle' });

  // A car chosen on the fleet page arrives as ?car=..., so the choice
  // survives the navigation here.
  const fleet = useFleet();
  const cars = fleet.status === 'ready' ? fleet.cars : [];

  const [searchParams] = useSearchParams();
  const [selectedCar, setSelectedCar] = useState(searchParams.get('car') ?? '');

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatus({ kind: 'sending' });

    const data = new FormData(event.currentTarget);
    const get = (k: string) => String(data.get(k) ?? '').trim();

    const result = await submitEnquiry({
      name: get('name'),
      phone: get('phone'),
      email: get('email'),
      pickupLocation: get('pickup'),
      startDate: get('start'),
      returnDate: get('return'),
      car: get('car'),
      message: get('message'),
      website: get('website'),
    });

    if (result.ok) {
      setStatus({ kind: 'sent', enquiryNumber: result.enquiryNumber });
    } else {
      setStatus({ kind: 'error', message: result.error, fields: result.fields });
    }
  }

  if (status.kind === 'sent') {
    return (
      <section id="enquire" className="mx-auto max-w-2xl px-5 py-20">
        <div className="rounded-[14px] border border-line bg-white p-8 text-center shadow-[0_10px_30px_rgba(16,24,40,0.08)]">
          <p aria-hidden="true" className="text-4xl">
            ✓
          </p>
          <h2 className="mt-3 text-2xl font-bold text-navy">Enquiry received</h2>
          <p className="mt-2 text-ink-dim">
            Thanks — we'll call you back shortly to confirm availability.
          </p>
          {status.enquiryNumber ? (
            <p className="mt-4 text-sm text-ink-faint">
              Your reference:{' '}
              <span className="font-semibold text-navy">{status.enquiryNumber}</span>
            </p>
          ) : null}
          <button
            type="button"
            onClick={() => setStatus({ kind: 'idle' })}
            className="mt-6 rounded-xl border border-line px-5 py-2.5 font-medium text-ink-dim transition hover:border-navy/40 hover:text-navy"
          >
            Send another enquiry
          </button>
        </div>
      </section>
    );
  }

  const fieldError = (name: string) =>
    status.kind === 'error' ? status.fields?.[name] : undefined;
  const sending = status.kind === 'sending';

  return (
    <section id="enquire" className="bg-white py-20">
      <div className="mx-auto max-w-2xl px-5">
        <h2 className="text-3xl font-bold tracking-tight text-navy sm:text-4xl">
          Check availability
        </h2>
        <p className="mt-2 text-ink-dim">
          Tell us when you need the car and we'll call you back to confirm.
          Only your name and phone number are required.
        </p>

        <form onSubmit={handleSubmit} noValidate className="mt-8 grid gap-5">
          {/* Honeypot: hidden from people, tempting to bots. */}
          <div aria-hidden="true" className="absolute h-0 w-0 overflow-hidden">
            <label htmlFor="website">Leave this empty</label>
            <input id="website" name="website" type="text" tabIndex={-1} autoComplete="off" />
          </div>

          <div className="grid gap-5 sm:grid-cols-2">
            <div>
              <label className={label} htmlFor="name">
                Your name <span className="text-danger">*</span>
              </label>
              <input id="name" name="name" required className={`mt-1.5 ${field}`} />
              {fieldError('name') ? (
                <p className="mt-1 text-sm text-danger">{fieldError('name')}</p>
              ) : null}
            </div>

            <div>
              <label className={label} htmlFor="phone">
                Phone number <span className="text-danger">*</span>
              </label>
              <input
                id="phone"
                name="phone"
                type="tel"
                inputMode="tel"
                required
                className={`mt-1.5 ${field}`}
              />
              {fieldError('phone') ? (
                <p className="mt-1 text-sm text-danger">{fieldError('phone')}</p>
              ) : null}
            </div>
          </div>

          <div>
            <label className={label} htmlFor="email">
              Email <span className="text-ink-faint">(optional)</span>
            </label>
            <input id="email" name="email" type="email" className={`mt-1.5 ${field}`} />
            {fieldError('email') ? (
              <p className="mt-1 text-sm text-danger">{fieldError('email')}</p>
            ) : null}
          </div>

          {cars.length === 0 ? null : (
          <div>
            <label className={label} htmlFor="car">
              Car you're interested in
            </label>
            <select
              id="car"
              name="car"
              value={selectedCar}
              onChange={(e) => setSelectedCar(e.target.value)}
              className={`mt-1.5 ${field}`}
            >
              <option value="">No preference</option>
              {cars.map((c) => (
                <option key={c.id} value={`${c.brand} ${c.name}`}>
                  {c.brand} {c.name}
                </option>
              ))}
            </select>
          </div>
          )}

          <div className="grid gap-5 sm:grid-cols-2">
            <div>
              <label className={label} htmlFor="start">
                Pickup date
              </label>
              <input id="start" name="start" type="date" className={`mt-1.5 ${field}`} />
            </div>
            <div>
              <label className={label} htmlFor="return">
                Return date
              </label>
              <input id="return" name="return" type="date" className={`mt-1.5 ${field}`} />
              {fieldError('return_date') ? (
                <p className="mt-1 text-sm text-danger">{fieldError('return_date')}</p>
              ) : null}
            </div>
          </div>

          <div>
            <label className={label} htmlFor="pickup">
              Pickup location
            </label>
            <input id="pickup" name="pickup" className={`mt-1.5 ${field}`} />
          </div>

          <div>
            <label className={label} htmlFor="message">
              {cars.length === 0
                ? 'What kind of car do you need?'
                : 'Anything else?'}
            </label>
            <textarea id="message" name="message" rows={3} className={`mt-1.5 ${field}`} />
          </div>

          {status.kind === 'error' ? (
            <p role="alert" className="rounded-xl bg-danger/8 px-4 py-3 text-sm text-danger">
              {status.message}
            </p>
          ) : null}

          <button
            type="submit"
            disabled={sending}
            className="rounded-xl bg-gold px-6 py-3 font-semibold text-navy transition hover:bg-gold/90 disabled:cursor-not-allowed disabled:opacity-60 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-navy"
          >
            {sending ? 'Sending…' : 'Send enquiry'}
          </button>
        </form>
      </div>
    </section>
  );
}
