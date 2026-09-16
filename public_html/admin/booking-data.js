// Booking vocabulary and the schedule state shown beside a booking's status.
//
// Bookings themselves live on the server; nothing here reads or writes
// storage. What remains is the shared vocabulary the panel renders with, and
// one derivation the server has no reason to compute: where a booking stands
// against the clock right now.

const BOOKING_STATUSES = ['Enquiry', 'Confirmed', 'Ready', 'Active', 'Returned', 'Completed', 'Cancelled'];

const PAYMENT_TYPES = ['advance', 'balance', 'additional', 'extra_km'];
const PAYMENT_TYPE_LABELS = {
  advance: 'Advance',
  balance: 'Balance',
  additional: 'Additional Payment',
  extra_km: 'Extra KM',
};

const SCHEDULE_TONES = { neutral: 'neutral', due: 'due', live: 'live', late: 'late' };

function isSameDay(a, b) {
  return a.getFullYear() === b.getFullYear()
    && a.getMonth() === b.getMonth()
    && a.getDate() === b.getDate();
}

/**
 * Where a booking stands against its dates, derived from the recorded status
 * and the clock.
 *
 * This is deliberately separate from booking.status. Status records what has
 * actually happened — a booking only becomes Active when someone records a
 * pickup with an odometer reading. Letting the clock flip that would invent a
 * rental that never started and leave the extra-KM charge computing from a
 * missing starting reading.
 */
function bookingScheduleState(booking, now = new Date()) {
  if (booking.status === 'Cancelled' || booking.status === 'Completed') return null;

  const start = new Date(String(booking.start_at).replace(' ', 'T'));
  const end = new Date(String(booking.return_at).replace(' ', 'T'));
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return null;

  // Back on the lot, waiting for final charges and completion.
  if (booking.status === 'Returned') {
    return { key: 'awaiting-completion', label: 'Awaiting Completion', tone: SCHEDULE_TONES.due };
  }

  // Out with the customer.
  if (booking.status === 'Active') {
    if (now > end) return { key: 'overdue-return', label: 'Overdue Return', tone: SCHEDULE_TONES.late };
    if (isSameDay(now, end)) return { key: 'due-back', label: 'Due Back Today', tone: SCHEDULE_TONES.due };
    return { key: 'on-rent', label: 'On Rent', tone: SCHEDULE_TONES.live };
  }

  // Booked but not yet collected.
  if (now > end) return { key: 'not-collected', label: 'Not Collected', tone: SCHEDULE_TONES.late };
  if (now >= start) return { key: 'overdue-pickup', label: 'Awaiting Pickup', tone: SCHEDULE_TONES.late };
  if (isSameDay(now, start)) return { key: 'starts-today', label: 'Starts Today', tone: SCHEDULE_TONES.due };
  return { key: 'upcoming', label: 'Upcoming', tone: SCHEDULE_TONES.neutral };
}

/**
 * The chip markup, kept next to the state it renders so the two cannot drift.
 * Returns an empty string when there is nothing useful to say — a completed
 * or cancelled booking has no live schedule position.
 */
function scheduleChipHTML(booking) {
  const state = bookingScheduleState(booking);
  return state
    ? `<span class="sched-chip sched-${state.tone}" title="Derived from the booking dates">${state.label}</span>`
    : '';
}
