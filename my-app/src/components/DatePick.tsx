import { useMemo, useState } from 'react';

/**
 * A date box with the taken days marked and refused.
 *
 * <input type="date"> cannot do this. It takes min, max and step and nothing
 * else — there is no way to say "these particular days are gone", and no way
 * to colour one. So the days are drawn here.
 *
 * The text box stays alongside the grid rather than being replaced by it.
 * Someone who knows their dates types them, which is faster than paging a
 * calendar, and it keeps the field usable with a screen reader or a keyboard
 * without a roving-tabindex grid to get right. Picking a taken day by typing
 * is caught on the way out, with the reason said rather than the box just
 * clearing itself.
 */
const DAY_NAMES = ['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su'];

const iso = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

export function DatePick({
  id,
  name,
  value,
  onChange,
  busy,
  min,
  labelledBy,
}: {
  id: string;
  name: string;
  value: string;
  onChange: (next: string) => void;
  /** ISO days that cannot be chosen. */
  busy: Set<string>;
  /** Nothing before this day. Defaults to today. */
  min?: string;
  labelledBy?: string;
}) {
  const today = iso(new Date());
  const floor = min ?? today;

  const [month, setMonth] = useState(() => {
    const seed = value && !Number.isNaN(Date.parse(value)) ? new Date(`${value}T00:00:00`) : new Date();
    return new Date(seed.getFullYear(), seed.getMonth(), 1);
  });

  const cells = useMemo(() => {
    const first = new Date(month.getFullYear(), month.getMonth(), 1);
    const days = new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate();
    // Monday-first, which is how a week is written here.
    const lead = (first.getDay() + 6) % 7;
    return [
      ...Array.from({ length: lead }, () => null),
      ...Array.from({ length: days }, (_, i) => new Date(month.getFullYear(), month.getMonth(), i + 1)),
    ];
  }, [month]);

  const taken = value !== '' && busy.has(value);

  const monthLabel = month.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' });

  return (
    <div>
      <input
        id={id}
        name={name}
        type="date"
        value={value}
        min={floor}
        aria-labelledby={labelledBy}
        aria-invalid={taken || undefined}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-xl border border-line bg-white px-3.5 py-2.5 text-ink outline-none transition placeholder:text-ink-faint focus:border-navy focus:ring-2 focus:ring-navy/15"
      />

      {taken ? (
        <p className="mt-1 text-sm text-danger">
          Every vehicle is out that day. Pick one that is not marked.
        </p>
      ) : null}

      <div className="mt-2 rounded-xl border border-line bg-white p-3">
        <div className="flex items-center justify-between">
          <button
            type="button"
            onClick={() => setMonth(new Date(month.getFullYear(), month.getMonth() - 1, 1))}
            aria-label="Previous month"
            className="grid size-9 place-items-center rounded-lg text-ink-dim transition hover:bg-cream hover:text-navy"
          >
            &#8249;
          </button>
          <span aria-live="polite" className="text-sm font-semibold text-navy">
            {monthLabel}
          </span>
          <button
            type="button"
            onClick={() => setMonth(new Date(month.getFullYear(), month.getMonth() + 1, 1))}
            aria-label="Next month"
            className="grid size-9 place-items-center rounded-lg text-ink-dim transition hover:bg-cream hover:text-navy"
          >
            &#8250;
          </button>
        </div>

        <div aria-hidden="true" className="mt-2 grid grid-cols-7 gap-1 text-center text-[11px] font-semibold text-ink-faint">
          {DAY_NAMES.map((d) => (
            <span key={d}>{d}</span>
          ))}
        </div>

        <div className="mt-1 grid grid-cols-7 gap-1">
          {cells.map((day, i) => {
            if (!day) return <span key={`pad-${i}`} />;
            const key = iso(day);
            const isBusy = busy.has(key);
            const isPast = key < floor;
            const isOn = key === value;

            return (
              <button
                key={key}
                type="button"
                // Disabled rather than merely styled: a day that cannot be
                // taken should not be reachable by keyboard either.
                disabled={isBusy || isPast}
                aria-pressed={isOn}
                aria-label={
                  isBusy
                    ? `${day.toLocaleDateString('en-IN', { day: 'numeric', month: 'long' })} — fully booked`
                    : day.toLocaleDateString('en-IN', { day: 'numeric', month: 'long' })
                }
                onClick={() => onChange(key)}
                className={`grid h-9 place-items-center rounded-lg text-sm transition ${
                  isOn
                    ? 'bg-navy font-bold text-white'
                    : isBusy
                      ? // Gold, and struck through: colour alone is not a
                        // message to someone who cannot see this one.
                        'cursor-not-allowed bg-gold/85 font-semibold text-navy line-through'
                      : isPast
                        ? 'cursor-not-allowed text-ink-faint/50'
                        : 'text-ink-dim hover:bg-cream hover:text-navy'
                }`}
              >
                {day.getDate()}
              </button>
            );
          })}
        </div>

        <p className="mt-2 flex items-center gap-1.5 text-[11px] text-ink-faint">
          <span aria-hidden="true" className="inline-block size-3 rounded bg-gold/85" />
          Already booked
        </p>
      </div>
    </div>
  );
}
