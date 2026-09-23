/**
 * Drives a whole booking through the panel in a real browser: create it, take
 * a deposit and payments, hand the vehicle over and back, correct a misread
 * meter, refund the deposit and complete the booking.
 *
 *   node tools/test-booking-ui.js http://127.0.0.1:8210 admin@example.com password
 */

const { chromium } = require('/opt/node22/lib/node_modules/playwright');

const BASE = process.argv[2] || 'http://127.0.0.1:8210';
const EMAIL = process.argv[3];
const PASSWORD = process.argv[4];
const SHOT_DIR = process.env.SHOT_DIR || '/tmp';

let pass = 0, fail = 0;
const ok = (l) => { pass++; console.log(`  ok    ${l}`); };
const bad = (l, d) => { fail++; console.log(`  FAIL  ${l}${d ? ' — ' + d : ''}`); };
// Status badges are uppercased by CSS, and innerText reflects that, so the
// comparison ignores case rather than asserting on presentation.
const has = (l, text, needle) =>
  (String(text).toLowerCase().includes(String(needle).toLowerCase())
    ? ok(l) : bad(l, `"${needle}" not in view`));

(async () => {
  const br = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', args: ['--no-sandbox'] });
  const p = await (await br.newContext({ viewport: { width: 1400, height: 1100 } })).newPage();

  const errs = [];
  p.on('pageerror', e => errs.push(String(e)));
  // Google Fonts is blocked in this container; nothing to do with the app.
  p.on('console', m => {
    const t = m.text();
    // ERR_CERT_AUTHORITY_INVALID is the web font: fetched from Google, and
    // refused by any sandbox that proxies HTTPS with its own certificate.
    if (m.type() === 'error' && !t.includes('ERR_CONNECTION_RESET') && !t.includes('favicon')
        && !t.includes('ERR_CERT_AUTHORITY_INVALID')
        && !/status of (409|422)/.test(t)) errs.push('console: ' + t);
  });

  // Dialogs are used for prompts and confirmations; answer them as scripted.
  let dialogAnswers = [];
  p.on('dialog', async (d) => {
    const next = dialogAnswers.shift();
    if (next === undefined) return d.dismiss();
    return next === true ? d.accept() : d.accept(String(next));
  });

  const signIn = async () => {
    await p.goto(`${BASE}/index.php`, { waitUntil: 'networkidle' });
    await p.fill('#email', EMAIL);
    await p.fill('#password', PASSWORD);
    await Promise.all([p.waitForNavigation({ waitUntil: 'networkidle' }), p.click('button[type="submit"]')]);
  };

  const detailText = () => p.locator('#bookingDetailBody').innerText();

  await signIn();
  ok('signed in');

  // A vehicle to book: 2,500/day, 200 km/day, 8 per extra km, 5,000 deposit.
  const reg = 'UI' + Date.now().toString().slice(-8);
  // Named per run, so this test always finds its own booking among whatever
  // else the other suites have left in the list.
  const customer = 'Ravi Kumar ' + Date.now().toString().slice(-6);
  await p.click('.admin-tab[data-tab="cars"]');
  await p.waitForTimeout(500);
  await p.click('#addCarBtn');
  await p.waitForTimeout(250);
  for (const [sel, val] of [['#carBrand', 'Maruti'], ['#carName', 'Swift — UI test'], ['#carRegNumber', reg],
                            ['#carSeats', '5'], ['#carYear', '2024'], ['#carPrice', '2500'],
                            ['#carKmLimit', '200'], ['#carExtraKmRate', '8'],
                            ['#carSecurityDeposit', '5000'], ['#carCurrentKm', '60000']]) {
    await p.fill(sel, val);
  }
  await p.click('#carForm button[type="submit"]');
  await p.waitForTimeout(1000);
  ok('vehicle created for the test');

  console.log('\n-- create a booking --');
  await p.click('.admin-tab[data-tab="bookings"]');
  await p.waitForTimeout(700);
  await p.click('#addBookingBtn');
  await p.waitForTimeout(300);
  await p.fill('#bkCustomerName', customer);
  await p.fill('#bkPhone', '9' + Date.now().toString().slice(-9));
  await p.fill('#bkLicence', 'TN0120230012345');
  await p.fill('#bkAddress', 'Nagercoil');
  await p.selectOption('#bkVehicle', { label: `Swift — UI test (${reg})` });
  await p.fill('#bkStartDate', '2026-11-01');
  await p.fill('#bkStartTime', '10:00');
  await p.fill('#bkReturnDate', '2026-11-04');
  await p.fill('#bkReturnTime', '10:00');
  await p.fill('#bkRentalAmount', '7500');
  await p.waitForTimeout(200);
  const duration = await p.locator('#bkDurationPreview').innerText();
  duration.includes('3') ? ok('duration preview shows 3 days') : bad('duration preview', duration);
  await p.click('#bookingForm button[type="submit"]');
  await p.waitForTimeout(1200);

  const listText = await p.locator('#bookingListWrap').innerText();
  has('booking appears in the list', listText, customer);
  has('booking number allocated', listText, 'NSC-');
  has('balance shows the full amount', listText, '₹7,500');

  console.log('\n-- double booking is refused in the form --');
  await p.click('#addBookingBtn');
  await p.waitForTimeout(300);
  await p.fill('#bkCustomerName', 'Someone Else');
  await p.fill('#bkPhone', '9000000009');
  await p.fill('#bkLicence', 'TN99');
  await p.selectOption('#bkVehicle', { label: `Swift — UI test (${reg})` });
  await p.fill('#bkStartDate', '2026-11-02');
  await p.fill('#bkStartTime', '10:00');
  await p.fill('#bkReturnDate', '2026-11-06');
  await p.fill('#bkReturnTime', '10:00');
  await p.fill('#bkRentalAmount', '9000');
  await p.click('#bookingForm button[type="submit"]');
  await p.waitForTimeout(1000);
  const conflict = await p.locator('#bookingConflictError').innerText();
  conflict.includes('already booked')
    ? ok('clash shown beside the dates, not in a dialog')
    : bad('clash shown beside the dates', conflict || '(empty)');
  await p.click('#bookingModalCancel');
  await p.waitForTimeout(300);

  console.log('\n-- open the booking --');
  await p.locator('#bookingListWrap .booking-card').filter({ hasText: customer }).first().click();
  await p.waitForTimeout(900);
  has('detail shows the customer', await detailText(), customer);
  has('detail shows Unpaid', await detailText(), 'Unpaid');

  console.log('\n-- deposit --');
  await p.click('#detailAddDepositBtn');
  await p.waitForTimeout(300);
  const prefilled = await p.locator('#depositAmount').inputValue();
  prefilled === '5000' ? ok('deposit pre-filled from the booking terms') : bad('deposit pre-filled', prefilled);
  await p.click('#depositForm button[type="submit"]');
  await p.waitForTimeout(1000);
  let text = await detailText();
  has('deposit recorded as held', text, '₹5,000');
  has('total owed unchanged by the deposit', text, '₹7,500');

  console.log('\n-- payments --');
  await p.click('#detailAddPaymentBtn');
  await p.waitForTimeout(300);
  await p.selectOption('#paymentType', 'advance');
  await p.fill('#paymentAmount', '3000');
  await p.selectOption('#paymentMethod', 'UPI');
  await p.fill('#paymentReference', 'UPI-1234');
  await p.click('#paymentForm button[type="submit"]');
  await p.waitForTimeout(1000);
  text = await detailText();
  has('advance listed', text, 'Advance');
  has('balance falls to 4,500', text, '₹4,500');
  has('status is Partially Paid', text, 'Partially Paid');

  console.log('\n-- void a payment, keeping the record --');
  await p.click('#detailAddPaymentBtn');
  await p.waitForTimeout(300);
  await p.selectOption('#paymentType', 'additional');
  await p.fill('#paymentAmount', '200');
  await p.click('#paymentForm button[type="submit"]');
  await p.waitForTimeout(900);
  dialogAnswers = ['Entered against the wrong booking'];
  await p.locator('.void-payment').last().click();
  await p.waitForTimeout(1000);
  text = await detailText();
  has('voided payment still listed', text, 'voided');
  has('balance back to 4,500', text, '₹4,500');

  console.log('\n-- pickup --');
  await p.click('#detailPickupBtn');
  await p.waitForTimeout(300);
  const startKm = await p.locator('#pickupStartKm').inputValue();
  startKm === '60000' ? ok('starting KM pre-filled from the vehicle') : bad('starting KM pre-filled', startKm);
  await p.selectOption('#pickupFuelLevel', 'Full');
  await p.fill('#pickupCondition', 'Clean, no damage');
  await p.click('#pickupForm button[type="submit"]');
  await p.waitForTimeout(1100);
  text = await detailText();
  has('pickup recorded', text, '60,000');
  has('booking is now Active', await p.locator('#bookingDetailTitle').innerText(), 'Active');

  console.log('\n-- return, with extra km --');
  await p.click('#detailReturnBtn');
  await p.waitForTimeout(300);
  await p.fill('#returnEndKm', '60850');
  await p.waitForTimeout(300);
  const preview = await p.locator('#returnKmPreview').innerText();
  preview.includes('850') && preview.includes('250')
    ? ok('return preview computes 850 driven, 250 over')
    : bad('return preview', preview);
  await p.selectOption('#returnFuelLevel', '1/2');
  await p.click('#returnForm button[type="submit"]');
  await p.waitForTimeout(1200);
  text = await detailText();
  has('850 km total', text, '850');
  has('250 km extra', text, '250');
  has('extra charge of 2,000', text, '₹2,000');
  has('total rises to 9,500', text, '₹9,500');

  console.log('\n-- correct a misread meter --');
  dialogAnswers = ['60800', 'Misread the meter', true];
  await p.locator('.correct-km').last().click();
  await p.waitForTimeout(1300);
  text = await detailText();
  has('800 km after correction', text, '800');
  has('extra charge falls to 1,600', text, '₹1,600');

  console.log('\n-- refund the deposit --');
  await p.click('#detailRefundBtn');
  await p.waitForTimeout(300);
  await p.fill('#refundDeduction', '750');
  await p.fill('#refundReason', 'Scratch on rear bumper');
  await p.waitForTimeout(200);
  const refundPreview = await p.locator('#refundAmountPreview').innerText();
  refundPreview.includes('4,250') ? ok('refund preview shows 4,250') : bad('refund preview', refundPreview);
  dialogAnswers = [true];
  await p.click('#refundForm button[type="submit"]');
  await p.waitForTimeout(1300);
  text = await detailText();
  has('deduction recorded', text, '₹750');
  has('refund recorded', text, '₹4,250');

  console.log('\n-- complete --');
  dialogAnswers = [true, true];
  await p.click('#detailCompleteBtn');
  await p.waitForTimeout(1300);
  has('booking is Completed', await p.locator('#bookingDetailTitle').innerText(), 'Completed');

  await p.screenshot({ path: `${SHOT_DIR}/booking_detail.png`, fullPage: false });

  console.log('\n-- it all persisted --');
  await p.reload({ waitUntil: 'networkidle' });
  await p.click('.admin-tab[data-tab="bookings"]');
  await p.waitForTimeout(900);
  const afterReload = await p.locator('#bookingListWrap').innerText();
  has('booking survives a reload', afterReload, customer);
  has('still shows as Completed', afterReload, 'Completed');

  console.log('\n-- other tabs still render --');
  for (const tab of ['dashboard', 'cars', 'inquiries', 'finance', 'reports']) {
    await p.click(`.admin-tab[data-tab="${tab}"]`);
    await p.waitForTimeout(600);
    const visible = await p.locator(`#panel-${tab}`).isVisible();
    visible ? ok(`${tab} tab renders`) : bad(`${tab} tab renders`);
  }

  console.log('\nJS errors: ' + (errs.length ? errs.join(' | ') : 'NONE'));
  if (errs.length) fail++;
  console.log(`\n${pass} passed, ${fail} failed`);
  await br.close();
  process.exit(fail === 0 ? 0 : 1);
})().catch(e => { console.error('CRASH', e.message); process.exit(1); });
