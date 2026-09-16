const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const OUT = '/tmp/claude-0/-home-user-create-react-app/2bef9a0e-33a4-54b1-b399-5284c26b2d0b/scratchpad';
const BASE = 'http://127.0.0.1:8210';
const EMAIL = 'admin@niteshacars.in';
const PASSWORD = 'secret-passphrase-1';

let pass = 0, fail = 0;
const ok  = (l) => { pass++; console.log(`  ok    ${l}`); };
const bad = (l, d) => { fail++; console.log(`  FAIL  ${l}${d ? ' — ' + d : ''}`); };
const is  = (l, a, b) => (String(a) === String(b) ? ok(l) : bad(l, `expected ${b}, got ${a}`));

(async () => {
  const br = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', args: ['--no-sandbox'] });
  const ctx = await br.newContext({ viewport: { width: 1400, height: 1000 } });
  const p = await ctx.newPage();
  const errs = [];
  p.on('pageerror', e => errs.push(String(e)));
  // Two benign categories are filtered: Google Fonts is blocked by this
  // container's network policy, and the 422 is the duplicate-registration
  // rejection that one of the assertions below deliberately provokes.
  const benign = t => t.includes('favicon')
    || t.includes('ERR_CONNECTION_RESET')
    || t.includes('status of 422');
  p.on('console', m => { if (m.type() === 'error' && !benign(m.text())) errs.push('console: ' + m.text()); });

  console.log('\n-- access control --');
  await p.goto(`${BASE}/dashboard.php`, { waitUntil: 'networkidle' });
  is('dashboard redirects to sign in when signed out', new URL(p.url()).pathname, '/index.php');

  console.log('\n-- sign in --');
  await p.fill('#email', EMAIL);
  await p.fill('#password', PASSWORD);
  await Promise.all([p.waitForNavigation({ waitUntil: 'networkidle' }), p.click('button[type="submit"]')]);
  is('lands on the dashboard', new URL(p.url()).pathname, '/dashboard.php');
  const who = await p.locator('.who').innerText().catch(() => '');
  who.includes('Test Admin') ? ok('signed-in name shown') : bad('signed-in name shown', who);
  who.toLowerCase().includes('super') ? ok('role shown') : bad('role shown', who);

  console.log('\n-- fleet loads from the database --');
  await p.click('.admin-tab[data-tab="cars"]');
  await p.waitForTimeout(600);
  const before = await p.locator('.car-admin-card').count();
  console.log(`       vehicles currently listed: ${before}`);

  console.log('\n-- add a vehicle through the form --');
  const reg = 'UI' + Date.now().toString().slice(-8);
  await p.click('#addCarBtn');
  await p.waitForTimeout(300);
  await p.fill('#carBrand', 'Toyota');
  await p.fill('#carName', 'Glanza — G');
  await p.fill('#carRegNumber', reg);
  await p.selectOption('#carBodyType', 'Hatchback');
  await p.fill('#carSeats', '5');
  await p.fill('#carYear', '2024');
  await p.fill('#carPrice', '2600');
  await p.fill('#carPrice7', '17000');
  await p.fill('#carPrice15', '32000');
  await p.fill('#carPrice30', '58000');
  await p.fill('#carKmLimit', '200');
  await p.fill('#carExtraKmRate', '9');
  await p.fill('#carSecurityDeposit', '5000');
  await p.fill('#carCurrentKm', '15000');
  await p.click('#carForm button[type="submit"]');
  await p.waitForTimeout(1200);

  const after = await p.locator('.car-admin-card').count();
  is('vehicle count increased by one', after, before + 1);
  const text = await p.locator('#carAdminGrid').innerText();
  text.includes(reg) ? ok('new vehicle shows its registration') : bad('new vehicle shows its registration');
  text.includes('₹2,600') ? ok('daily rate rendered') : bad('daily rate rendered');

  console.log('\n-- it really persisted (reload from the server) --');
  await p.reload({ waitUntil: 'networkidle' });
  await p.click('.admin-tab[data-tab="cars"]');
  await p.waitForTimeout(700);
  const afterReload = await p.locator('#carAdminGrid').innerText();
  afterReload.includes(reg) ? ok('vehicle survives a reload') : bad('vehicle survives a reload');

  console.log('\n-- server-side validation surfaces in the UI --');
  await p.click('#addCarBtn');
  await p.waitForTimeout(300);
  await p.fill('#carBrand', 'Dup');
  await p.fill('#carName', 'Duplicate test');
  await p.fill('#carRegNumber', reg);          // same registration
  await p.fill('#carSeats', '5');
  await p.fill('#carYear', '2024');
  await p.fill('#carPrice', '1000');
  await p.fill('#carKmLimit', '200');
  await p.fill('#carExtraKmRate', '5');
  await p.fill('#carSecurityDeposit', '1000');
  await p.fill('#carCurrentKm', '0');
  let alertText = '';
  p.once('dialog', async d => { alertText = d.message(); await d.dismiss(); });
  await p.click('#carForm button[type="submit"]');
  await p.waitForTimeout(1000);
  alertText.toLowerCase().includes('registration')
    ? ok('duplicate registration reported to the user')
    : bad('duplicate registration reported to the user', alertText || '(no dialog)');

  await p.screenshot({ path: `${OUT}/p1_vehicles.png` });

  console.log('\n-- sign out --');
  await p.locator('#carModalCancel').click().catch(() => {});
  await p.waitForTimeout(200);
  await Promise.all([
    p.waitForNavigation({ waitUntil: 'networkidle' }),
    p.click('.logout-form button[type="submit"]'),
  ]);
  is('signing out returns to the sign-in page', new URL(p.url()).pathname, '/index.php');
  await p.goto(`${BASE}/dashboard.php`, { waitUntil: 'networkidle' });
  is('dashboard no longer reachable after signing out', new URL(p.url()).pathname, '/index.php');

  console.log('\nJS errors: ' + (errs.length ? errs.join(' | ') : 'NONE'));
  if (errs.length) fail++;
  console.log(`\n${pass} passed, ${fail} failed`);
  await br.close();
  process.exit(fail === 0 ? 0 : 1);
})().catch(e => { console.error('CRASH', e.message); process.exit(1); });
