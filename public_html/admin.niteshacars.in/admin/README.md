# NiteSha Cars — Admin Panel

Rental management for NiteSha Cars & Bikes: vehicles, bookings, payments,
security deposits, KM tracking, enquiries and reports.

The public website lives separately at **niteshacars.in**. This is the admin
panel it links to, and the endpoint its enquiry form posts to.

Plain PHP and MySQL. No framework, no Composer, no build step — deploying is
uploading the files.

## Putting it on the server

1. **Create a database.** In hPanel → Databases → MySQL, create a database and
   a user, and note the name, user and password.

2. **Upload the files** into the folder the subdomain serves, e.g.
   `admin.niteshacars.in`. Upload everything except `config.php`, which does
   not exist yet and is created for you.

3. **Open `install.php`** in a browser — `https://admin.niteshacars.in/install.php`.
   It checks the hosting, creates the tables, writes `config.php` and makes your
   Super Admin account.

4. **Delete `install.php`.** It refuses to run once an account exists, so it is
   not a way in, but there is no reason to leave it there.

5. **Sign in** at `https://admin.niteshacars.in/`.

To connect the enquiry form on the public site, post to
`https://admin.niteshacars.in/api/enquiry-submit.php` with `name` and `phone`
(and optionally `email`, `message`, `pickup_location`, `start_date`,
`return_date`, `vehicle_id`). Include a field named `website`, hidden with CSS —
it is a honeypot, and real visitors never fill it in. The address you post from
must be listed in `public_site_origin` in `config.php`.

## What it does

- **Dashboard** — fleet and finance figures, active and upcoming rentals
- **Bookings** — create, take payments, record deposits and refunds, log
  pickup and return, and track KM with automatic extra-KM charges
- **Vehicles** — fleet, rate card, KM policy, deposit, odometer, status
- **Enquiries** — what the public form sends, tracked until it becomes a
  booking or is turned down with a reason
- **Finance** — expenses by category and vehicle, against income taken
  straight from the payments recorded on bookings
- **Reports** — booking, revenue, vehicle, KM, deposit and payment reports

## How it is built

**Money is never a float.** Amounts are handled in whole paise
(`src/money.php`), because `0.10 × 100` is not exactly `10.00` in floating
point and a rental business cannot afford figures that drift.

**Financial records are added, never edited.** Payments, deposits, refunds,
expenses and KM readings are only ever inserted. A mistake is corrected by a
new row that cites the one it corrects, and cancelling is a status change with
a reason. Nothing is deleted, so the trail an auditor follows is the trail of
what actually happened.

**Income is never typed in.** The Finance tab sums the payments already
recorded against bookings, so it cannot disagree with the bookings it
summarises, and the same money cannot be entered twice. Deposits are reported
beside the figures but never inside them: a deposit is the customer's money
being held, not the business's money earned.

**Prices are frozen at booking.** A booking copies the rate, KM allowance,
extra-KM rate and deposit into `booking_charges` when it is created. Changing
the rate card afterwards never alters what an existing customer owes.

**Recorded status is separate from the calendar.** A booking's status moves
only on a real pickup or return, so it is never marked Active without the
odometer reading its extra-KM charge depends on. Alongside it, a schedule chip
derived from the clock reads Upcoming, Awaiting Pickup, On Rent, Overdue
Return and so on.

## Security

Passwords are hashed; five failed attempts lock an account for fifteen
minutes; wrong-password and unknown-account give the same answer, so the form
cannot be used to discover who has an account. Sessions regenerate on sign-in
and the cookie is HttpOnly. Every write carries a CSRF token, every query is a
prepared statement, and permissions are checked on the server for each request
rather than by hiding buttons.

`config.php` holds the database password: it is git-ignored, and `.htaccess`
denies it — along with `src/`, `sql/` and `tools/` — over the web.

The only unauthenticated endpoint is `api/enquiry-submit.php`. It can create an
enquiry and nothing else, and is guarded by an origin allowlist, a honeypot,
and a per-address hourly limit.

## A test site on your own machine

The panel needs PHP and MySQL to do anything at all, so there is a script that
puts a complete copy in front of you:

```bash
bash tools/test-site.sh
```

It starts MariaDB, makes a `niteshacars_test` database, loads the schema, fills
it with a fleet and a few months of trading, and serves the panel at
<http://127.0.0.1:8080>. Sign in as `admin@niteshacars.test` with
`TestAdmin2026!`. There is an account for every role — `manager@`, `accounts@`,
`auditor@` and `staff@` at the same domain — so what each one is allowed to do
can be checked by signing in as them rather than reasoning about it.

| | |
|---|---|
| `bash tools/test-site.sh` | set it up if needed, then serve it |
| `bash tools/test-site.sh test` | reseed and run every suite against it |
| `bash tools/test-site.sh reset` | throw the data away and seed it again |
| `bash tools/test-site.sh stop` | stop the server |
| `bash tools/test-site.sh status` | is it running, and on what |

`TEST_PORT`, `TEST_DB`, `TEST_ADMIN_EMAIL` and `TEST_ADMIN_PASSWORD` override
the defaults. On a machine without MariaDB, install it first —
`sudo apt-get install -y mariadb-server`, or `brew install mariadb`.

**It cannot reach the live database.** The test instance keeps its settings in
`tools/.test-site/config.php` and is handed them through `NITESHA_CONFIG`; the
server reads `config.php` and never has that variable set. Nothing under
`tools/.test-site/` is committed.

The seed is written to give every screen something to show, and the dates move
with the calendar, so there is always a booking on rent, one overdue, one
going out today and one next week. It also includes the awkward cases worth
looking at: a rental that went over its KM allowance, a deposit partly kept for
damage, a cancelled booking whose advance was reversed rather than deleted, an
expense typed in wrong and corrected, and a vehicle re-priced after a booking
was already taken on the old rate.

`tools/test-enquiry-form.html` stands in for the booking form on the public
site, so the one unauthenticated endpoint can be exercised from a browser the
way a visitor reaches it.

## Tests

`bash tools/test-site.sh test` runs all of the below against a freshly seeded
database, which is what they assume. To run one on its own, export
`NITESHA_CONFIG` first — several shell out to the PHP tools beside them, which
would otherwise read `config.php`:

```bash
export NITESHA_CONFIG="$PWD/tools/.test-site/config.php"

php tools/test-money.php                       # money arithmetic
php tools/test-auth.php <dsn> <user> <pass>    # sign-in, roles, numbering
bash tools/test-api.sh       <url> <email> <password>
bash tools/test-bookings.sh  <url> <email> <password>
bash tools/test-ledger.sh    <url> <email> <password>
bash tools/test-enquiries.sh <url> <email> <password>
bash tools/test-expenses.sh  <url> <email> <password>
node tools/test-ui.js         <url> <email> <password>
node tools/test-booking-ui.js <url> <email> <password>
node tools/test-enquiry-ui.js <url> <email> <password>
node tools/test-finance-ui.js <url> <email> <password>
node tools/test-install-ui.js <url> <db-name> <db-user>   # on a spare database
```

350 checks, covering the money arithmetic, the append-only ledger, price
freezing, double-booking, the KM audit trail, the enquiry defences, expense
corrections and voiding, and the booking, enquiry and finance flows driven
through a real browser.

The browser-driven ones need Playwright (`npm install -D playwright &&
npx playwright install chromium`). Without it they report themselves skipped
rather than failing, since a missing tool is not a broken panel.

## Brand

| Token | Value |
|---|---|
| Navy | `#0A0E20` |
| Gold | `#F5A500` |
| Deep gold (text on white) | `#B36B00` |

Typeface is Poppins.
