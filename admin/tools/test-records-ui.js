/**
 * The two record screens: the list, and one record opened from it.
 *
 * Bookings and Inquiries share their shape -- counts above filters above a
 * sortable table, and a record that opens in place of the list with its
 * sections behind tabs -- so they are checked together, against the same
 * behaviour.
 *
 *   node tools/test-records-ui.js http://127.0.0.1:8210 admin@example.com password
 */

const { chromium } = require('/opt/node22/lib/node_modules/playwright');

const BASE = process.argv[2] || 'http://127.0.0.1:8210';
const EMAIL = process.argv[3];
const PASSWORD = process.argv[4];

let pass = 0, fail = 0;
const ok = (l, d) => { pass++; console.log(`  ok    ${l.padEnd(46)}${d || ''}`); };
const bad = (l, d) => { fail++; console.log(`  FAIL  ${l}${d ? ' — ' + d : ''}`); };
const is = (l, got, want) => (String(got) === String(want) ? ok(l, got) : bad(l, `expected ${want}, got ${got}`));
const has = (l, text, needle) => (String(text).toLowerCase().includes(String(needle).toLowerCase())
  ? ok(l) : bad(l, `"${needle}" not in view`));

(async () => {
  const br = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', args: ['--no-sandbox'] });
  const p = await (await br.newContext({ viewport: { width: 1500, height: 1100 } })).newPage();

  const errs = [];
  p.on('pageerror', e => errs.push(String(e)));
  p.on('console', m => {
    const t = m.text();
    if (m.type() === 'error' && !t.includes('favicon') && !t.includes('ERR_CONNECTION_RESET')
        && !t.includes('ERR_CERT_AUTHORITY_INVALID')) errs.push('console: ' + t);
  });
  p.on('dialog', d => d.accept().catch(() => {}));

  await p.goto(`${BASE}/index.php`, { waitUntil: 'networkidle' });
  await p.fill('#email', EMAIL);
  await p.fill('#password', PASSWORD);
  await Promise.all([p.waitForNavigation({ waitUntil: 'networkidle' }), p.click('button[type="submit"]')]);
  await p.waitForTimeout(900);
  ok('signed in');

  const stamp = Date.now().toString().slice(-6);

  // Enough bookings that the table has a second page to turn to. Made through
  // the API rather than the form: this is a test of the list, not of typing.
  console.log('\n-- something to list --');
  const made = await p.evaluate(async ({ stamp }) => {
    const token = document.querySelector('meta[name="csrf-token"]').content;
    const vehicles = await (await fetch('api/vehicles.php?action=list')).json();
    const id = vehicles.vehicles[0].id;
    let count = 0;
    for (let i = 0; i < 12; i++) {
      const day = String(3 + i * 2).padStart(2, '0');
      const r = await fetch('api/bookings.php?action=save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-CSRF-Token': token },
        body: JSON.stringify({
          customer_name: `List Test ${stamp}-${i}`, phone: '90000' + String(10000 + i),
          licence_number: 'TN75LIST' + i, vehicle_id: id,
          start_at: `2027-03-${day}T10:00`, return_at: `2027-03-${day}T18:00`,
          base_rental: String(1000 + i * 100), km_limit_per_day: '200', extra_km_rate: '5',
        }),
      });
      if (r.ok) count++;
    }
    return count;
  }, { stamp });
  is('twelve bookings to work with', made, 12);

  await p.click('.admin-tab[data-tab="bookings"]');
  await p.waitForTimeout(1200);

  console.log('\n-- the counts above the list --');
  const stats = await p.locator('#bookingStats').innerText();
  has('a total', stats, 'Total');
  has('what is coming', stats, 'Upcoming');
  has('what is owed', stats, 'Payment due');
  const statTotal = Number((await p.locator('#bookingStats .rec-stat-n').first().innerText()).trim());
  const rowsAll = await p.locator('#bookingListWrap tbody tr').count();
  const pagerTotal = Number((await p.locator('#bookingPager').innerText()).match(/Total (\d+)/)[1]);
  is('the total counts every booking, not the page', statTotal, pagerTotal);
  (rowsAll <= 30) ? ok('the page holds at most a page', `${rowsAll} rows`) : bad('page size', rowsAll);

  console.log('\n-- the chips filter, and say how many --');
  const chipText = await p.locator('#bookingChips [data-chip="Confirmed"]').innerText();
  await p.click('#bookingChips [data-chip="Confirmed"]');
  await p.waitForTimeout(500);
  const confirmedRows = await p.locator('#bookingListWrap tbody tr').count();
  const chipCount = Number(chipText.match(/(\d+)\s*$/)[1]);
  is('the chip count matches the rows it shows', Math.min(confirmedRows, 30), Math.min(chipCount, 30));
  const statuses = await p.locator('#bookingListWrap tbody tr .status-badge').allInnerTexts();
  // Uppercased by the stylesheet, so compare on the lowercase of it.
  statuses.every(t => /confirmed|upcoming|today|starts/.test(t.toLowerCase()))
    ? ok('and nothing else is left in the table')
    : bad('and nothing else is left', statuses.join(','));
  await p.click('#bookingChips [data-chip="all"]');
  await p.waitForTimeout(500);

  console.log('\n-- search --');
  await p.fill('#bookingSearch', `List Test ${stamp}-7`);
  await p.waitForTimeout(600);
  is('search narrows to the one', await p.locator('#bookingListWrap tbody tr').count(), 1);
  await p.click('#bookingReset');
  await p.waitForTimeout(600);
  (await p.locator('#bookingListWrap tbody tr').count()) > 1
    ? ok('and the reset puts them all back') : bad('reset puts them back');
  is('the search box is emptied too', await p.locator('#bookingSearch').inputValue(), '');

  console.log('\n-- sorting --');
  const firstBy = async () => (await p.locator('#bookingListWrap tbody tr .rec-id').first().innerText()).trim();
  await p.click('#bookingListWrap th[data-sort="booking_number"]');
  await p.waitForTimeout(400);
  const ascFirst = await firstBy();
  await p.click('#bookingListWrap th[data-sort="booking_number"]');
  await p.waitForTimeout(400);
  const descFirst = await firstBy();
  ascFirst !== descFirst && ascFirst < descFirst
    ? ok('clicking a column sorts it, and again turns it round', `${ascFirst} / ${descFirst}`)
    : bad('sorting turns round', `${ascFirst} then ${descFirst}`);

  console.log('\n-- paging --');
  await p.selectOption('#bookingPager [data-per-page]', '10');
  await p.waitForTimeout(500);
  is('ten to a page', await p.locator('#bookingListWrap tbody tr').count(), 10);
  has('and it says which page', await p.locator('#bookingPager').innerText(), 'Page 1 of');
  const firstOnPageOne = await firstBy();
  await p.click('#bookingPager [data-page="next"]');
  await p.waitForTimeout(500);
  (await firstBy()) !== firstOnPageOne ? ok('Next turns the page') : bad('Next turns the page');
  has('and says so', await p.locator('#bookingPager').innerText(), 'Page 2 of');
  await p.click('#bookingPager [data-page="prev"]');
  await p.waitForTimeout(500);
  is('Back comes home', await firstBy(), firstOnPageOne);
  is('the row numbers start again at 1',
    (await p.locator('#bookingListWrap tbody tr .rec-sno').first().innerText()).trim(), '1');

  console.log('\n-- opening one --');
  await p.locator('#bookingListWrap tbody tr').first().click();
  await p.waitForTimeout(1200);
  (await p.locator('#bookingListView').isVisible()) === false
    ? ok('the list gives way to the record') : bad('the list gives way');
  const hero = await p.locator('#bookingDetailView .rec-hero').innerText();
  has('the record leads with its number', hero, 'NSC-');
  has('and what is owed', hero, 'Balance');
  for (const pane of ['payments', 'deposit', 'handover', 'documents', 'timeline']) {
    await p.locator(`.rec-tab[data-pane="${pane}"]`).click();
    await p.waitForTimeout(200);
    (await p.locator(`.rec-pane[data-pane="${pane}"]`).isVisible())
      ? ok(`the ${pane} tab opens`) : bad(`the ${pane} tab opens`);
  }
  await p.click('#bookingDetailBack');
  await p.waitForTimeout(800);
  (await p.locator('#bookingListView').isVisible())
    ? ok('and Back returns to the list') : bad('Back returns to the list');

  console.log('\n-- the action buttons --');
  await p.locator('#bookingListWrap tbody tr [data-act="edit"]').first().click();
  await p.waitForTimeout(600);
  (await p.locator('#bookingModalOverlay').isVisible())
    ? ok('the pencil opens the booking for editing') : bad('the pencil opens the form');
  await p.click('#bookingModalCancel');
  await p.waitForTimeout(400);
  await p.locator('#bookingListWrap tbody tr [data-act="open"]').first().click();
  await p.waitForTimeout(1000);
  (await p.locator('#bookingDetailView .rec-hero').isVisible())
    ? ok('and the eye opens the record') : bad('the eye opens the record');
  await p.click('#bookingDetailBack');
  await p.waitForTimeout(700);

  console.log('\n-- the same shape on inquiries --');
  await p.click('.admin-tab[data-tab="inquiries"]');
  await p.waitForTimeout(1200);
  has('counts above the list', await p.locator('#enquiryStats').innerText(), 'Total');
  (await p.locator('#enquiryChips .rec-chip').count()) >= 6
    ? ok('a chip for every status') : bad('a chip for every status');
  const unreadBefore = await p.locator('#inquiriesWrap tbody tr.rec-unread').count();
  if (unreadBefore === 0) {
    ok('nothing unread to open', '(skipped)');
  } else {
    await p.locator('#inquiriesWrap tbody tr.rec-unread').first().click();
    await p.waitForTimeout(1200);
    has('the inquiry opens on its own page', await p.locator('#enquiryDetailView .rec-hero').innerText(), 'ENQ-');
    await p.click('#enquiryDetailBack');
    await p.waitForTimeout(900);
    (await p.locator('#inquiriesWrap tbody tr.rec-unread').count()) < unreadBefore
      ? ok('and opening it clears the unread mark') : bad('opening clears the unread mark');
  }

  console.log('\nJS errors: ' + (errs.length ? errs.join(' | ') : 'NONE'));
  if (errs.length) fail++;
  console.log(`\n${pass} passed, ${fail} failed`);
  await br.close();
  process.exit(fail === 0 ? 0 : 1);
})().catch(e => { console.error('CRASH', e.message); process.exit(1); });
