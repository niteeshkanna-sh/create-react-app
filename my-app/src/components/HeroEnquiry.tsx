import { useState, type FormEvent } from 'react';
import { submitEnquiry } from '../lib/enquiry';

/**
 * The short enquiry card in the home page banner.
 *
 * Deliberately not the full form from the contact page. Four boxes is what
 * somebody will fill in on a banner before they have decided anything; asking
 * for an email, a pickup point and a vehicle at this moment is asking them to
 * make choices they have not made yet, and the usual answer to that is to
 * close the tab. Name, number and the two dates are enough to call them back,
 * which is the only thing this has to achieve.
 *
 * The rest of the detail is gathered on the phone, or on /contact by whoever
 * would rather type it. Both land in the same place.
 *
 * No calendar widget here on purpose. The contact page draws its own grid so
 * it can grey out days a vehicle is already out on; that is a real feature and
 * a lot of markup, and this card sits in the part of the page the browser
 * measures for loading speed. A native date box is a few bytes, and on a phone
 * it opens the same picker the person already knows.
 */
const box =
  'w-full rounded-xl border border-line bg-white px-3.5 py-2.5 text-[15px] text-ink outline-none transition ' +
  'placeholder:text-ink-faint focus:border-navy focus:ring-2 focus:ring-navy/15';
const cap = 'block text-[13px] font-semibold text-ink-dim mb-1.5';

const today = () => new Date().toLocaleDateString('en-CA');

type Status =
  | { kind: 'idle' }
  | { kind: 'sending' }
  | { kind: 'sent'; ref: string | null }
  | { kind: 'error'; message: string };

export function HeroEnquiry({ title, note }: { title: string; note: string }) {
  const [status, setStatus] = useState<Status>({ kind: 'idle' });
  const [start, setStart] = useState('');

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatus({ kind: 'sending' });

    const data = new FormData(event.currentTarget);
    const get = (k: string) => String(data.get(k) ?? '').trim();

    const result = await submitEnquiry({
      name: get('name'),
      phone: get('phone'),
      startDate: get('start'),
      returnDate: get('return'),
      message: 'Sent from the home page banner.',
      website: get('website'),
    });

    if (result.ok) {
      setStatus({ kind: 'sent', ref: result.enquiryNumber });
      return;
    }

    // The server's 422 is "Please correct the highlighted fields", and this
    // card highlights nothing -- four boxes do not need it. What is useful is
    // the per-field reason underneath, so that is what gets shown.
    const reasons = Object.values(result.fields ?? {});
    setStatus({
      kind: 'error',
      message: reasons.length ? reasons.join(' ') : result.error,
    });
  }

  if (status.kind === 'sent') {
    return (
      <div className="hero-card rounded-2xl bg-white p-6 text-center sm:p-7">
        <p aria-hidden="true" className="text-3xl text-ok">✓</p>
        <h2 className="mt-2 text-xl font-bold text-navy">We have it</h2>
        <p className="mt-2 text-sm leading-relaxed text-ink-dim">
          We will call you back shortly to confirm what is free on those dates.
        </p>
        {status.ref ? (
          <p className="mt-3 text-[13px] text-ink-faint">
            Your reference <span className="font-semibold text-navy">{status.ref}</span>
          </p>
        ) : null}
        <button
          type="button"
          onClick={() => setStatus({ kind: 'idle' })}
          className="mt-5 rounded-xl border border-line px-4 py-2 text-sm font-medium text-ink-dim transition hover:border-navy/40 hover:text-navy"
        >
          Send another
        </button>
      </div>
    );
  }

  const sending = status.kind === 'sending';

  return (
    <div className="hero-card rounded-2xl bg-white p-5 sm:p-6">
      <h2 className="text-lg font-bold text-navy sm:text-xl">{title}</h2>
      <p className="mt-1 text-[13px] leading-relaxed text-ink-dim">{note}</p>

      <form onSubmit={handleSubmit} className="mt-5 space-y-3.5" noValidate={false}>
        <div>
          <label className={cap} htmlFor="heroName">Your name</label>
          <input id="heroName" name="name" required autoComplete="name"
                 placeholder="Name" className={box} />
        </div>

        <div>
          <label className={cap} htmlFor="heroPhone">Phone number</label>
          <input id="heroPhone" name="phone" required type="tel" inputMode="tel"
                 autoComplete="tel" placeholder="10-digit mobile number" className={box} />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className={cap} htmlFor="heroStart">Pick up</label>
            <input id="heroStart" name="start" type="date" min={today()}
                   value={start} onChange={(e) => setStart(e.target.value)}
                   className={box} />
          </div>
          <div>
            <label className={cap} htmlFor="heroReturn">Return</label>
            {/* Never before the pickup. The box itself refuses it, so a wrong
                pair cannot be sent and then argued about on the phone. */}
            <input id="heroReturn" name="return" type="date" min={start || today()}
                   className={box} />
          </div>
        </div>

        {/* Bots fill this in; people never see it. */}
        <input type="text" name="website" tabIndex={-1} autoComplete="off"
               aria-hidden="true" className="hidden" />

        {status.kind === 'error' ? (
          <p role="alert" className="rounded-lg bg-danger/10 px-3 py-2 text-[13px] text-danger">
            {status.message}
          </p>
        ) : null}

        <button
          type="submit"
          disabled={sending}
          className="w-full rounded-xl bg-navy px-5 py-3 text-[15px] font-semibold text-white transition hover:bg-navy-deep focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-navy disabled:opacity-60"
        >
          {sending ? 'Sending…' : 'Check availability'}
        </button>

        <p className="text-center text-[12px] leading-relaxed text-ink-faint">
          No payment now. We call you back to confirm.
        </p>
      </form>
    </div>
  );
}
