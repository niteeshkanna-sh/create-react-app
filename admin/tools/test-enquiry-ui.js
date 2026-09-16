/**
 * Drives an enquiry through the panel: it arrives from the public form, gets
 * contacted, noted, and accepted into a real booking.
 *
 *   node tools/test-enquiry-ui.js http://127.0.0.1:8210 admin@example.com password
 */

const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const { execFileSync } = require('child_process');

const BASE = process.argv[2] || 'http://127.0.0.1:8210';
const EMAIL = process.argv[3];
const PASSWORD = process.argv[4];
const SHOT_DIR = process.env.SHOT_DIR || '/tmp';

let pass = 0, fail = 0;
const ok = (l) => { pass++; console.log(`  ok    ${l}`); };
const bad = (l, d) => { fail++; console.log(`  FAIL  ${l}${d ? ' — ' + d : ''}`); };
const has = (l, text, needle) =>
  (String(text).toLowerCase().includes(String(needle).toLowerCase())
    ? ok(l) : bad(l, `"${needle}" not in view`));

(async () => {
  const br = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', args: ['--no-sandbox'] });
  const p = await (await br.newContext({ viewport: { width: 1400, height: 1100 } })).newPage();

  const errs = [];
  p.on('pageerror', e => errs.push(String(e)));
  p.on('console', m => {
    const t = m.text();
    if (m.type() === 'error' && !t.includes('ERR_CONNECTION_RESET') && !t.includes('favicon')
        && !/status of (409|422|429)/.test(t)) errs.push('console: ' + t);
  });

  let dialogAnswers = [];
  p.on('dialog', async (d) => {
    const next = dialogAnswers.shift();
    if (next === undefined) return d.dismiss();
    return next === true ? d.accept() : d.accept(String(next));
  });

  // Local suites all post from 127.0.0.1 and share one rate-limit window; an
  // earlier run would otherwise throttle this one.
  execFileSync('php', [__dirname + '/clear-enquiry-throttle.php'], { stdio: 'ignore' });

  const stamp = Date.now().toString().slice(-6);
  const customer = `Meena R ${stamp}`;

  // An enquiry arrives from the public site, exactly as the form would send it.
  // The fetch runs from a page on the same origin, as a visitor's browser would.
  await p.goto(`${BASE}/index.php`, { waitUntil: 'networkidle' });
  const submitted = await p.evaluate(async ({ base, name }) => {
    const r = await fetch(`${base}/api/enquiry-submit.php`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name, phone: '9876500' + Math.floor(Math.random() * 900 + 100),
        email: 'meena@example.com',
        message: 'Need a car for three days in December',
        pickup_location: 'Nagercoil',
        start_date: '2026-12-10', return_date: '2026-12-13',
      }),
    });
    return { status: r.status, body: await r.json() };
  }, { base: BASE, name: customer });

  submitted.status === 201 ? ok('public form accepted the enquiry') : bad('public form accepted', submitted.status);
  submitted.body.enquiry_number ? ok(`reference issued (${submitted.body.enquiry_number})`) : bad('reference issued');

  await p.goto(`${BASE}/index.php`, { waitUntil: 'networkidle' });
  await p.fill('#email', EMAIL);
  await p.fill('#password', PASSWORD);
  await Promise.all([p.waitForNavigation({ waitUntil: 'networkidle' }), p.click('button[type="submit"]')]);
  ok('signed in');

  console.log('\n-- it shows up in the panel --');
  await p.click('.admin-tab[data-tab="inquiries"]');
  await p.waitForTimeout(900);
  let listText = await p.locator('#inquiriesWrap').innerText();
  has('the enquiry is listed', listText, customer);
  has('with its reference', listText, 'ENQ-');
  has('marked New', listText, 'New');

  console.log('\n-- search and filter --');
  await p.fill('#enquirySearch', stamp);
  await p.waitForTimeout(800);
  has('search narrows the list', await p.locator('#inquiriesWrap').innerText(), customer);
  await p.fill('#enquirySearch', '');
  await p.waitForTimeout(800);
  await p.click('[data-enquiry-status="Converted"]');
  await p.waitForTimeout(800);
  const converted = await p.locator('#inquiriesWrap').innerText();
  converted.includes(customer)
    ? bad('filtering to Converted hides a New enquiry')
    : ok('filtering to Converted hides a New enquiry');
  await p.click('[data-enquiry-status=""]');
  await p.waitForTimeout(800);

  console.log('\n-- open it --');
  await p.locator('.enquiry-card').filter({ hasText: customer }).first().click();
  await p.waitForTimeout(900);
  let detail = await p.locator('#enquiryModalBody').innerText();
  has('shows what they asked for', detail, 'three days in December');
  has('shows the pickup location', detail, 'Nagercoil');
  has('shows the dates', detail, 'Dec 2026');

  console.log('\n-- handling --');
  dialogAnswers = ['Called back, wants an automatic'];
  await p.locator('[data-enq-status="Contacted"]').click();
  await p.waitForTimeout(1100);
  detail = await p.locator('#enquiryModalBody').innerText();
  has('the note is kept', detail, 'wants an automatic');
  has('now marked Contacted', await p.locator('#enquiryModalTitle').innerText(), 'Contacted');

  dialogAnswers = ['Confirmed budget'];
  await p.locator('#enqAddNote').click();
  await p.waitForTimeout(1000);
  detail = await p.locator('#enquiryModalBody').innerText();
  has('notes are appended, not replaced', detail, 'wants an automatic');
  has('and the new one is there too', detail, 'Confirmed budget');

  await p.screenshot({ path: `${SHOT_DIR}/enquiry_detail.png` });

  console.log('\n-- accept it into a booking --');
  // A vehicle to book it against.
  const reg = 'EU' + stamp;
  await p.click('#enquiryModalClose');
  await p.click('.admin-tab[data-tab="cars"]');
  await p.waitForTimeout(600);
  await p.click('#addCarBtn');
  await p.waitForTimeout(250);
  for (const [sel, val] of [['#carBrand', 'Toyota'], ['#carName', 'Glanza — enquiry test'],
                            ['#carRegNumber', reg], ['#carSeats', '5'], ['#carYear', '2024'],
                            ['#carPrice', '2400'], ['#carKmLimit', '180'], ['#carExtraKmRate', '7'],
                            ['#carSecurityDeposit', '4000'], ['#carCurrentKm', '30000']]) {
    await p.fill(sel, val);
  }
  await p.click('#carForm button[type="submit"]');
  await p.waitForTimeout(1000);

  await p.click('.admin-tab[data-tab="inquiries"]');
  await p.waitForTimeout(900);
  await p.locator('.enquiry-card').filter({ hasText: customer }).first().click();
  await p.waitForTimeout(900);
  await p.click('#enqConvert');
  await p.waitForTimeout(600);

  const prefilledName = await p.locator('#bkCustomerName').inputValue();
  prefilledName === customer ? ok('booking form pre-filled from the enquiry') : bad('booking form pre-filled', prefilledName);
  const prefilledStart = await p.locator('#bkStartDate').inputValue();
  prefilledStart === '2026-12-10' ? ok('requested dates carried across') : bad('dates carried across', prefilledStart);

  await p.selectOption('#bkVehicle', { label: `Glanza — enquiry test (${reg})` });
  await p.fill('#bkStartTime', '10:00');
  await p.fill('#bkReturnTime', '10:00');
  await p.fill('#bkLicence', 'TN0120230077777');
  await p.fill('#bkRentalAmount', '7200');
  dialogAnswers = [true];
  await p.click('#bookingForm button[type="submit"]');
  await p.waitForTimeout(1600);

  console.log('\n-- the link both ways --');
  await p.click('.admin-tab[data-tab="inquiries"]');
  await p.waitForTimeout(900);
  listText = await p.locator('#inquiriesWrap').innerText();
  has('the enquiry is now Converted', listText, 'Converted');
  has('and shows its booking number', listText, 'NSC-');

  await p.click('.admin-tab[data-tab="bookings"]');
  await p.waitForTimeout(900);
  has('the booking exists under the customer', await p.locator('#bookingListWrap').innerText(), customer);

  console.log('\n-- other tabs still render --');
  for (const tab of ['dashboard', 'cars', 'finance', 'reports']) {
    await p.click(`.admin-tab[data-tab="${tab}"]`);
    await p.waitForTimeout(600);
    (await p.locator(`#panel-${tab}`).isVisible()) ? ok(`${tab} renders`) : bad(`${tab} renders`);
  }

  console.log('\nJS errors: ' + (errs.length ? errs.join(' | ') : 'NONE'));
  if (errs.length) fail++;
  console.log(`\n${pass} passed, ${fail} failed`);
  await br.close();
  process.exit(fail === 0 ? 0 : 1);
})().catch(e => { console.error('CRASH', e.message); process.exit(1); });
