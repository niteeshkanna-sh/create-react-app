<?php
declare(strict_types=1);

require_once __DIR__ . '/src/csrf.php';
require_once __DIR__ . '/src/assets.php';
require_once __DIR__ . '/src/vocab.php';
require_once __DIR__ . '/src/migrate.php';
require_once __DIR__ . '/src/shell.php';

// Anyone reaching this page must already be signed in; require_login sends
// them to the sign-in form otherwise.
$me = require_login();

// Apply any migration that has not run yet.
//
// api_guard does this too, so by the time anything is saved the schema is
// current whatever route was taken. Here as well because this is the page that
// can show a failure, rather than turning it into a failed API call.
$migrationError = migrate_if_needed();

header('X-Frame-Options: DENY');
header('X-Content-Type-Options: nosniff');
header('Referrer-Policy: same-origin');

admin_shell_open($me, 'dashboard', 'Dashboard', true, $migrationError);
?>

      <!-- Dashboard tab -->
      <section class="admin-panel" id="panel-dashboard">
        <div class="panel-header">
          <div>
            <h2>Overview</h2>
            <p>A snapshot of your fleet, inquiries, and finances.</p>
          </div>
        </div>

        <div class="stat-grid">
          <div class="stat-card">
            <span class="stat-label">Cars Listed</span>
            <span class="stat-value" id="statCarCount">0</span>
          </div>
          <div class="stat-card">
            <span class="stat-label">Booking Inquiries</span>
            <span class="stat-value" id="statInquiryCount">0</span>
          </div>
          <div class="stat-card stat-card-income">
            <span class="stat-label">Total Income</span>
            <span class="stat-value" id="statIncome">₹0</span>
          </div>
          <div class="stat-card stat-card-expense">
            <span class="stat-label">Total Expenses</span>
            <span class="stat-value" id="statExpense">₹0</span>
          </div>
          <div class="stat-card stat-card-balance">
            <span class="stat-label">Net Balance</span>
            <span class="stat-value" id="statBalance">₹0</span>
          </div>
        </div>

        <div class="dashboard-cols">
          <div class="dashboard-col">
            <h3>Recent Inquiries</h3>
            <div id="recentInquiries"></div>
          </div>
          <div class="dashboard-col">
            <h3>Recent Transactions</h3>
            <div id="recentTransactions"></div>
          </div>
        </div>

        <h3 class="dashboard-subheading">Rental Overview</h3>
        <div class="stat-grid stat-grid-4" id="rentalStatGrid">
          <div class="stat-card"><span class="stat-label">Today's Bookings</span><span class="stat-value" id="statTodayBookings">0</span></div>
          <div class="stat-card"><span class="stat-label">Active Rentals</span><span class="stat-value" id="statActiveRentals">0</span></div>
          <div class="stat-card"><span class="stat-label">Upcoming Bookings</span><span class="stat-value" id="statUpcomingBookings">0</span></div>
          <div class="stat-card stat-card-income"><span class="stat-label">Total Rental Revenue</span><span class="stat-value" id="statRentalRevenue">₹0</span></div>
          <div class="stat-card stat-card-income"><span class="stat-label">Advance Received</span><span class="stat-value" id="statAdvanceReceived">₹0</span></div>
          <div class="stat-card stat-card-expense"><span class="stat-label">Pending Balance</span><span class="stat-value" id="statPendingBalance">₹0</span></div>
          <div class="stat-card stat-card-deposit"><span class="stat-label">Security Deposit Held</span><span class="stat-value" id="statDepositHeld">₹0</span></div>
          <div class="stat-card stat-card-deposit"><span class="stat-label">Security Deposit Refunded</span><span class="stat-value" id="statDepositRefunded">₹0</span></div>
          <div class="stat-card stat-card-income"><span class="stat-label">Extra KM Revenue</span><span class="stat-value" id="statExtraKmRevenue">₹0</span></div>
          <div class="stat-card"><span class="stat-label">Total KM Driven</span><span class="stat-value" id="statTotalKm">0</span></div>
          <div class="stat-card stat-card-expense"><span class="stat-label">Total Expenses</span><span class="stat-value" id="statTotalExpenses">₹0</span></div>
          <div class="stat-card stat-card-balance"><span class="stat-label">Net Revenue</span><span class="stat-value" id="statNetRevenue">₹0</span></div>
        </div>

        <div class="dashboard-col">
          <h3>Active &amp; Upcoming Rentals</h3>
          <div id="activeUpcomingBookings"></div>
        </div>
      </section>

      <!-- Bookings tab -->
      <section class="admin-panel" id="panel-bookings" hidden>
        <div class="panel-header">
          <div>
            <h2>Bookings / Rental Management</h2>
            <p>Create and manage rental bookings, payments, deposits, and vehicle pickup/return.</p>
          </div>
          <button class="btn btn-primary" id="addBookingBtn">+ New Booking</button>
        </div>

        <div class="booking-filters">
          <button class="filter-chip active" data-status="all">All</button>
          <button class="filter-chip" data-status="Confirmed">Confirmed</button>
          <button class="filter-chip" data-status="Active">Active</button>
          <button class="filter-chip" data-status="Completed">Completed</button>
          <button class="filter-chip" data-status="Cancelled">Cancelled</button>
        </div>

        <div id="bookingListWrap"></div>
      </section>

      <!-- Vehicles tab -->
      <section class="admin-panel" id="panel-cars" hidden>
        <div class="panel-header">
          <div>
            <h2>Vehicle Management</h2>
            <p>Fleet, rates, KM limits, and status. Available cars also show in "Popular Rentals" on the public site.</p>
          </div>
          <!-- A car added here only reaches the website when its status is
               Available and it has a rate card. When one does not appear, this
               says which of those it is, rather than leaving the panel and the
               site each looking correct on their own. -->
          <a class="panel-header-link" href="/fleet-check.html" target="_blank" rel="noopener">Why is a car not on the site?</a>
          <button class="btn btn-primary" id="addCarBtn">+ Add Vehicle</button>
        </div>

        <div class="car-admin-grid" id="carAdminGrid"></div>
      </section>

      <!-- Inquiries tab -->
      <section class="admin-panel" id="panel-inquiries" hidden>
        <div class="panel-header">
          <div>
            <h2>Booking Inquiries</h2>
            <p>Enquiries submitted from niteshacars.in. Accepting one creates a booking.</p>
          </div>
        </div>

        <div class="enquiry-toolbar">
          <input type="search" id="enquirySearch" placeholder="Search name, phone or ENQ number" />
          <div class="enquiry-filters">
            <button class="filter-chip active" data-enquiry-status="">All</button>
            <button class="filter-chip" data-enquiry-status="New">New</button>
            <button class="filter-chip" data-enquiry-status="Contacted">Contacted</button>
            <button class="filter-chip" data-enquiry-status="Pending">Pending</button>
            <button class="filter-chip" data-enquiry-status="Accepted">Accepted</button>
            <button class="filter-chip" data-enquiry-status="Converted">Converted</button>
            <button class="filter-chip" data-enquiry-status="Rejected">Rejected</button>
          </div>
        </div>

        <div id="inquiriesWrap"></div>
      </section>

      <!-- Finance tab -->
      <section class="admin-panel" id="panel-finance" hidden>
        <div class="panel-header">
          <div>
            <h2>Finance &amp; Accounts</h2>
            <p>Income is taken from the payments recorded against bookings. Expenses are recorded here.</p>
          </div>
          <button class="btn btn-primary" id="addExpenseBtn">Record Expense</button>
        </div>

        <div class="finance-range">
          <label for="finFrom">From</label>
          <input type="date" id="finFrom">
          <label for="finTo">To</label>
          <input type="date" id="finTo">
          <button class="btn btn-ghost" id="finThisMonth">This month</button>
          <button class="btn btn-ghost" id="finLastMonth">Last month</button>
          <button class="btn btn-ghost" id="finThisYear">This year</button>
        </div>

        <div class="stat-grid stat-grid-3">
          <div class="stat-card stat-card-income">
            <span class="stat-label">Income received</span>
            <span class="stat-value" id="financeIncome">₹0</span>
            <span class="stat-foot" id="financeIncomeFoot"></span>
          </div>
          <div class="stat-card stat-card-expense">
            <span class="stat-label">Expenses</span>
            <span class="stat-value" id="financeExpense">₹0</span>
            <span class="stat-foot" id="financeExpenseFoot"></span>
          </div>
          <div class="stat-card stat-card-balance">
            <span class="stat-label">Net</span>
            <span class="stat-value" id="financeBalance">₹0</span>
            <span class="stat-foot" id="financeBalanceFoot"></span>
          </div>
        </div>

        <p class="finance-deposit-note" id="financeDepositNote"></p>

        <div class="finance-breakdowns">
          <div class="finance-panel">
            <h3>Where the money came from</h3>
            <div id="financeByMethod"></div>
          </div>
          <div class="finance-panel">
            <h3>What it went on</h3>
            <div id="financeByCategory"></div>
          </div>
          <div class="finance-panel">
            <h3>Spend per vehicle</h3>
            <div id="financeByVehicle"></div>
          </div>
        </div>

        <div class="panel-header panel-header-sub">
          <h3>Expenses</h3>
          <label class="finance-toggle">
            <input type="checkbox" id="finShowVoided"> Show voided
          </label>
        </div>
        <div id="expensesWrap"></div>
      </section>

      <!-- Record an expense -->
      <div class="modal-overlay" id="expenseModalOverlay" hidden>
        <div class="modal">
          <h3 id="expenseModalTitle">Record Expense</h3>
          <form id="expenseForm">
            <div class="modal-row">
              <div class="field-group">
                <label for="expAmount">Amount (₹)</label>
                <input type="number" id="expAmount" required min="1" step="0.01" placeholder="1500" />
              </div>
              <div class="field-group">
                <label for="expDate">Date</label>
                <input type="date" id="expDate" required />
              </div>
            </div>
            <div class="modal-row">
              <div class="field-group">
                <label for="expCategory">Category</label>
                <select id="expCategory" required>
                  <option>Fuel</option>
                  <option>Maintenance</option>
                  <option>Repairs</option>
                  <option>Cleaning</option>
                  <option>Insurance</option>
                  <option>Service</option>
                  <option>Advertising</option>
                  <option>Office</option>
                  <option>Other</option>
                </select>
              </div>
              <div class="field-group">
                <label for="expMethod">Paid by</label>
                <select id="expMethod" required>
                  <option>Cash</option>
                  <option>UPI</option>
                  <option>Card</option>
                  <option>Bank Transfer</option>
                  <option>Other</option>
                </select>
              </div>
            </div>
            <div class="modal-row">
              <div class="field-group">
                <label for="expVehicle">Vehicle (optional)</label>
                <select id="expVehicle"><option value="">Not vehicle-specific</option></select>
              </div>
              <div class="field-group">
                <label for="expVendor">Paid to (optional)</label>
                <input type="text" id="expVendor" maxlength="120" placeholder="e.g. Indian Oil, Nagercoil" />
              </div>
            </div>
            <div class="field-group">
              <label for="expDescription">What it was for</label>
              <input type="text" id="expDescription" maxlength="255" placeholder="e.g. Full tank before handover" />
            </div>
            <p class="booking-conflict-error" id="expenseFormError"></p>
            <div class="modal-actions">
              <button type="button" class="btn btn-ghost" id="expenseModalCancel">Cancel</button>
              <button type="submit" class="btn btn-primary">Record Expense</button>
            </div>
          </form>
        </div>
      </div>

      <!-- Reports tab -->
      <section class="admin-panel" id="panel-reports" hidden>
        <div class="panel-header">
          <div>
            <h2>Reports</h2>
            <p>Booking, revenue, vehicle, KM, deposit, and payment reports — all computed from your booking records.</p>
          </div>
        </div>

        <nav class="report-tabs">
          <button class="report-tab active" data-report="booking">Booking Report</button>
          <button class="report-tab" data-report="revenue">Revenue Report</button>
          <button class="report-tab" data-report="vehicle">Vehicle Report</button>
          <button class="report-tab" data-report="km">KM Report</button>
          <button class="report-tab" data-report="deposit">Deposit Report</button>
          <button class="report-tab" data-report="payment">Payment Report</button>
        </nav>

        <div class="report-filters" id="reportFilters"></div>

        <div class="report-export-row">
          <button class="btn btn-outline btn-sm" id="exportCsvBtn"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3v12"/><path d="M7 10l5 5 5-5"/><path d="M5 21h14"/></svg> CSV</button>
          <button class="btn btn-outline btn-sm" id="exportExcelBtn"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3v12"/><path d="M7 10l5 5 5-5"/><path d="M5 21h14"/></svg> Excel</button>
          <button class="btn btn-outline btn-sm" id="exportPdfBtn"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 9V3h12v6"/><rect x="4" y="9" width="16" height="8" rx="1"/><path d="M6 17v4h12v-4"/></svg> Print / PDF</button>
        </div>

        <div class="report-results" id="reportResults"></div>
      </section>
<?php admin_shell_close(); ?>

  <!-- ===== Car edit/add modal ===== -->
  <div class="modal-overlay" id="carModalOverlay" hidden>
    <div class="modal modal-wide">
      <h3 id="carModalTitle">Add Car</h3>
      <form id="carForm">
        <input type="hidden" id="carId" />
        <div class="modal-row">
          <div class="field-group">
            <label for="carBrand">Brand</label>
            <input type="text" id="carBrand" required placeholder="e.g. Suzuki" />
          </div>
          <div class="field-group">
            <label for="carBodyType">Body Type</label>
            <select id="carBodyType" required><?= options_for(BODY_TYPES) ?></select>
          </div>
        </div>
        <div class="modal-row modal-row-3">
          <div class="field-group">
            <label for="carName">Listing Name</label>
            <input type="text" id="carName" required placeholder="e.g. Fronx — Brand New 2026" />
          </div>
          <div class="field-group">
            <label for="carRegNumber">Registration Number</label>
            <input type="text" id="carRegNumber" required placeholder="e.g. KA05AB1234" style="text-transform:uppercase" />
          </div>
          <div class="field-group">
            <label for="carColor">Colour</label>
            <input type="color" id="carColor" required value="#5B6472" class="color-input" />
          </div>
        </div>
        <div class="modal-row">
          <div class="field-group">
            <label for="carFuel">Fuel</label>
            <select id="carFuel" required><?= options_for(FUEL_TYPES) ?></select>
          </div>
          <div class="field-group">
            <label for="carTransmission">Transmission</label>
            <select id="carTransmission" required><?= options_for(TRANSMISSIONS) ?></select>
          </div>
        </div>
        <div class="modal-row modal-row-3">
          <div class="field-group">
            <label for="carSeats">Seats</label>
            <input type="number" id="carSeats" required min="2" max="9" placeholder="5" />
          </div>
          <div class="field-group">
            <label for="carYear">Year</label>
            <input type="number" id="carYear" required min="2000" max="2030" placeholder="2025" />
          </div>
          <div class="field-group">
            <label for="carStatus">Status</label>
            <select id="carStatus" required><?= options_for(VEHICLE_STATUSES) ?></select>
          </div>
        </div>

        <p class="modal-section-label">Rate Card (₹)</p>
        <div class="modal-row modal-row-4">
          <div class="field-group">
            <label for="carPrice">Daily</label>
            <input type="number" id="carPrice" required min="0" placeholder="3000" />
          </div>
          <div class="field-group">
            <label for="carPrice7">7-Day</label>
            <input type="number" id="carPrice7" min="0" placeholder="19000" />
          </div>
          <div class="field-group">
            <label for="carPrice15">15-Day</label>
            <input type="number" id="carPrice15" min="0" placeholder="36000" />
          </div>
          <div class="field-group">
            <label for="carPrice30">30-Day</label>
            <input type="number" id="carPrice30" min="0" placeholder="66000" />
          </div>
        </div>

        <p class="modal-section-label">KM &amp; Deposit</p>
        <div class="modal-row modal-row-3">
          <div class="field-group">
            <label for="carKmLimit">KM Limit / day</label>
            <input type="number" id="carKmLimit" required min="0" placeholder="200" />
          </div>
          <div class="field-group">
            <label for="carExtraKmRate">Extra KM Rate (₹)</label>
            <input type="number" id="carExtraKmRate" required min="0" placeholder="10" />
          </div>
          <div class="field-group">
            <label for="carSecurityDeposit">Security Deposit (₹)</label>
            <input type="number" id="carSecurityDeposit" required min="0" placeholder="5000" />
          </div>
        </div>
        <div class="field-group">
          <label for="carCurrentKm">Current Odometer (KM)</label>
          <input type="number" id="carCurrentKm" required min="0" placeholder="4200" />
        </div>

        <!-- The photograph is uploaded after the vehicle is saved, because it
             is stored against a vehicle id and a new vehicle has none yet. The
             form hides that: pick a file, press Save, and both happen. -->
        <div class="field-group">
          <label for="carPhoto">Photograph</label>
          <div class="photo-field">
            <div class="photo-preview" id="carPhotoPreview" hidden>
              <img alt="" id="carPhotoPreviewImg" />
              <button type="button" class="btn btn-danger btn-sm" id="carPhotoRemove">Remove</button>
            </div>

            <!-- Shown only while a newly chosen photograph is being framed.
                 The window is the exact shape the website's cards use, so what
                 is inside it is what a customer sees -- no guessing at how it
                 will be cut. -->
            <div class="photo-crop" id="carCropBox" hidden>
              <div class="crop-window" id="carCropWindow">
                <img id="carCropImg" alt="" draggable="false" />
              </div>
              <label class="crop-zoom">
                Zoom
                <input type="range" id="carCropZoom" min="100" max="300" value="100" />
              </label>
              <p class="field-note">Drag the photo to choose what shows. Every car is saved at
              the same size, so the cards line up.</p>
            </div>

            <input type="file" id="carPhoto" accept="image/jpeg,image/png,image/webp,image/avif" />
            <p class="field-note">Shown on the website's fleet cards. JPG, PNG, WebP or AVIF,
            up to 6&nbsp;MB. A landscape photo of the whole car works best.</p>
          </div>
        </div>

        <div class="modal-actions">
          <button type="button" class="btn btn-ghost" id="carModalCancel">Cancel</button>
          <button type="submit" class="btn btn-primary">Save Vehicle</button>
        </div>
      </form>
    </div>
  </div>

  <!-- ===== Booking create/edit modal ===== -->
  <div class="modal-overlay" id="bookingModalOverlay" hidden>
    <div class="modal modal-wide">
      <h3 id="bookingModalTitle">New Booking</h3>
      <p class="booking-number-preview" id="bookingNumberPreview"></p>
      <form id="bookingForm">
        <input type="hidden" id="bookingId" />

        <p class="modal-section-label">Customer Details</p>
        <div class="modal-row">
          <div class="field-group"><label for="bkCustomerName">Customer Name</label><input type="text" id="bkCustomerName" required placeholder="e.g. Ravi Kumar" /></div>
          <div class="field-group"><label for="bkPhone">Phone Number</label><input type="tel" id="bkPhone" required placeholder="e.g. 9876543210" /></div>
        </div>
        <div class="modal-row">
          <div class="field-group"><label for="bkAddress">Address</label><input type="text" id="bkAddress" placeholder="e.g. HSR Layout, Bengaluru" /></div>
          <div class="field-group"><label for="bkLicence">Driving Licence Number</label><input type="text" id="bkLicence" required placeholder="e.g. KA0120230012345" /></div>
        </div>

        <p class="modal-section-label">Vehicle &amp; Rental Period</p>
        <div class="modal-row">
          <div class="field-group"><label for="bkVehicle">Vehicle</label><select id="bkVehicle" required></select></div>
          <div class="field-group"><label for="bkVehicleReg">Vehicle Registration Number</label><input type="text" id="bkVehicleReg" readonly /></div>
        </div>
        <div class="modal-row modal-row-4">
          <div class="field-group"><label for="bkStartDate">Start Date</label><input type="date" id="bkStartDate" required /></div>
          <div class="field-group"><label for="bkStartTime">Start Time</label><input type="time" id="bkStartTime" required value="10:00" /></div>
          <div class="field-group"><label for="bkReturnDate">Return Date</label><input type="date" id="bkReturnDate" required /></div>
          <div class="field-group"><label for="bkReturnTime">Return Time</label><input type="time" id="bkReturnTime" required value="10:00" /></div>
        </div>
        <p class="field-hint">Rental Duration: <strong id="bkDurationPreview">1 day</strong></p>
        <p class="booking-conflict-error" id="bookingConflictError"></p>

        <p class="modal-section-label">Charges</p>
        <div class="modal-row modal-row-3">
          <div class="field-group"><label for="bkRentalAmount">Rental Amount (₹)</label><input type="number" id="bkRentalAmount" required min="0" placeholder="9000" /></div>
          <div class="field-group"><label for="bkKmLimit">KM Limit / day</label><input type="number" id="bkKmLimit" required min="0" placeholder="200" /></div>
          <div class="field-group"><label for="bkExtraKmRate">Extra KM Rate (₹)</label><input type="number" id="bkExtraKmRate" required min="0" placeholder="10" /></div>
        </div>
        <div class="field-group"><label for="bkNotes">Notes</label><input type="text" id="bkNotes" placeholder="Optional notes about this booking" /></div>

        <div class="modal-actions">
          <button type="button" class="btn btn-ghost" id="bookingModalCancel">Cancel</button>
          <button type="submit" class="btn btn-primary">Save Booking</button>
        </div>
      </form>
    </div>
  </div>

  <!-- ===== Booking detail modal (populated dynamically) ===== -->
  <div class="modal-overlay" id="bookingDetailOverlay" hidden>
    <div class="modal modal-wide modal-tall">
      <div class="booking-detail-header">
        <h3 id="bookingDetailTitle">Booking</h3>
        <button type="button" class="btn btn-ghost btn-sm" id="bookingDetailClose">✕ Close</button>
      </div>
      <div id="bookingDetailBody"></div>
    </div>
  </div>

  <!-- ===== Enquiry detail modal ===== -->
  <div class="modal-overlay" id="enquiryModalOverlay" hidden>
    <div class="modal modal-wide modal-tall">
      <div class="booking-detail-header">
        <h3 id="enquiryModalTitle">Enquiry</h3>
        <button type="button" class="btn btn-ghost btn-sm" id="enquiryModalClose">✕ Close</button>
      </div>
      <div id="enquiryModalBody"></div>
    </div>
  </div>

  <!-- ===== Payment modal ===== -->
  <div class="modal-overlay" id="paymentModalOverlay" hidden>
    <div class="modal">
      <h3>Add Payment</h3>
      <form id="paymentForm">
        <input type="hidden" id="paymentBookingId" />
        <div class="field-group">
          <label for="paymentType">Payment Type</label>
          <select id="paymentType" required>
            <option value="advance">Advance</option>
            <option value="balance">Balance</option>
            <option value="additional">Additional Payment</option>
            <option value="extra_km">Extra KM</option>
          </select>
        </div>
        <div class="modal-row">
          <div class="field-group"><label for="paymentAmount">Amount (₹)</label><input type="number" id="paymentAmount" required min="0" placeholder="10000" /></div>
          <div class="field-group"><label for="paymentDate">Payment Date</label><input type="date" id="paymentDate" required /></div>
        </div>
        <div class="modal-row">
          <div class="field-group">
            <label for="paymentMethod">Payment Method</label>
            <select id="paymentMethod" required>
              <option>Cash</option>
              <option>UPI</option>
              <option>Card</option>
              <option>Bank Transfer</option>
              <option>Other</option>
            </select>
          </div>
          <div class="field-group"><label for="paymentReference">Transaction / Reference No.</label><input type="text" id="paymentReference" placeholder="e.g. UPI Ref / UTR" /></div>
        </div>
        <div class="field-group"><label for="paymentNotes">Notes</label><input type="text" id="paymentNotes" placeholder="Optional" /></div>
        <div class="field-group">
          <label for="paymentProof">Payment Screenshot / Receipt</label>
          <input type="file" id="paymentProof" accept="image/*" />
          <div class="proof-preview" id="paymentProofPreview"></div>
        </div>
        <div class="modal-actions">
          <button type="button" class="btn btn-ghost" id="paymentModalCancel">Cancel</button>
          <button type="submit" class="btn btn-primary">Save Payment</button>
        </div>
      </form>
    </div>
  </div>

  <!-- ===== Security deposit modal ===== -->
  <div class="modal-overlay" id="depositModalOverlay" hidden>
    <div class="modal">
      <h3>Security Deposit</h3>
      <form id="depositForm">
        <input type="hidden" id="depositBookingId" />
        <div class="modal-row">
          <div class="field-group"><label for="depositAmount">Deposit Amount (₹)</label><input type="number" id="depositAmount" required min="0" placeholder="5000" /></div>
          <div class="field-group"><label for="depositDate">Deposit Date</label><input type="date" id="depositDate" required /></div>
        </div>
        <div class="modal-row">
          <div class="field-group">
            <label for="depositMethod">Payment Method</label>
            <select id="depositMethod" required>
              <option>Cash</option>
              <option>UPI</option>
              <option>Card</option>
              <option>Bank Transfer</option>
              <option>Other</option>
            </select>
          </div>
          <div class="field-group"><label for="depositReference">Reference Number</label><input type="text" id="depositReference" placeholder="Optional" /></div>
        </div>
        <div class="field-group"><label for="depositNotes">Notes</label><input type="text" id="depositNotes" placeholder="Optional" /></div>
        <div class="field-group">
          <label for="depositProof">Deposit Proof</label>
          <input type="file" id="depositProof" accept="image/*" />
          <div class="proof-preview" id="depositProofPreview"></div>
        </div>
        <p class="field-hint">This is tracked separately and is <strong>not</strong> counted as rental revenue.</p>
        <div class="modal-actions">
          <button type="button" class="btn btn-ghost" id="depositModalCancel">Cancel</button>
          <button type="submit" class="btn btn-primary">Save Deposit</button>
        </div>
      </form>
    </div>
  </div>

  <!-- ===== Deposit refund modal ===== -->
  <div class="modal-overlay" id="refundModalOverlay" hidden>
    <div class="modal">
      <h3>Refund Security Deposit</h3>
      <p class="field-hint">Original Deposit: <strong id="refundOriginalDeposit">₹0</strong></p>
      <form id="refundForm">
        <input type="hidden" id="refundBookingId" />
        <div class="modal-row">
          <div class="field-group"><label for="refundDeduction">Deduction Amount (₹)</label><input type="number" id="refundDeduction" required min="0" value="0" /></div>
          <div class="field-group"><label for="refundReason">Deduction Reason</label><input type="text" id="refundReason" placeholder="e.g. Minor scratch" /></div>
        </div>
        <p class="field-hint">Refund Amount: <strong id="refundAmountPreview">₹0</strong></p>
        <div class="modal-row">
          <div class="field-group"><label for="refundDate">Refund Date</label><input type="date" id="refundDate" required /></div>
          <div class="field-group">
            <label for="refundMethod">Refund Method</label>
            <select id="refundMethod" required>
              <option>Cash</option>
              <option>UPI</option>
              <option>Card</option>
              <option>Bank Transfer</option>
              <option>Other</option>
            </select>
          </div>
        </div>
        <div class="field-group"><label for="refundReference">Refund Reference</label><input type="text" id="refundReference" placeholder="Optional" /></div>
        <div class="field-group"><label for="refundNotes">Notes</label><input type="text" id="refundNotes" placeholder="Optional" /></div>
        <div class="field-group">
          <label for="refundProof">Refund Proof</label>
          <input type="file" id="refundProof" accept="image/*" />
          <div class="proof-preview" id="refundProofPreview"></div>
        </div>
        <div class="modal-actions">
          <button type="button" class="btn btn-ghost" id="refundModalCancel">Cancel</button>
          <button type="submit" class="btn btn-primary">Save Refund</button>
        </div>
      </form>
    </div>
  </div>

  <!-- ===== Vehicle pickup modal ===== -->
  <div class="modal-overlay" id="pickupModalOverlay" hidden>
    <div class="modal">
      <h3>Vehicle Pickup</h3>
      <form id="pickupForm">
        <input type="hidden" id="pickupBookingId" />
        <div class="modal-row">
          <div class="field-group"><label for="pickupDateField">Pickup Date</label><input type="date" id="pickupDateField" required /></div>
          <div class="field-group"><label for="pickupTimeField">Pickup Time</label><input type="time" id="pickupTimeField" required /></div>
        </div>
        <div class="modal-row">
          <div class="field-group"><label for="pickupStartKm">Starting KM</label><input type="number" id="pickupStartKm" required min="0" placeholder="4200" /></div>
          <div class="field-group">
            <label for="pickupFuelLevel">Starting Fuel Level</label>
            <select id="pickupFuelLevel" required>
              <option>Full</option>
              <option>3/4</option>
              <option>1/2</option>
              <option>1/4</option>
              <option>Empty</option>
            </select>
          </div>
        </div>
        <div class="field-group"><label for="pickupCondition">Vehicle Condition</label><input type="text" id="pickupCondition" placeholder="e.g. Clean, no visible damage" /></div>
        <div class="field-group"><label for="pickupNotes">Pickup Notes</label><input type="text" id="pickupNotes" placeholder="Optional" /></div>
        <div class="field-group">
          <label for="pickupPhotos">Pickup Photos</label>
          <input type="file" id="pickupPhotos" accept="image/*" multiple />
          <div class="proof-preview" id="pickupPhotosPreview"></div>
        </div>
        <div class="modal-actions">
          <button type="button" class="btn btn-ghost" id="pickupModalCancel">Cancel</button>
          <button type="submit" class="btn btn-primary">Save Pickup</button>
        </div>
      </form>
    </div>
  </div>

  <!-- ===== Vehicle return modal ===== -->
  <div class="modal-overlay" id="returnModalOverlay" hidden>
    <div class="modal">
      <h3>Vehicle Return</h3>
      <form id="returnForm">
        <input type="hidden" id="returnBookingId" />
        <div class="modal-row">
          <div class="field-group"><label for="returnDateField">Return Date</label><input type="date" id="returnDateField" required /></div>
          <div class="field-group"><label for="returnTimeField">Return Time</label><input type="time" id="returnTimeField" required /></div>
        </div>
        <div class="modal-row">
          <div class="field-group"><label for="returnEndKm">Ending KM</label><input type="number" id="returnEndKm" required min="0" placeholder="5800" /></div>
          <div class="field-group">
            <label for="returnFuelLevel">Ending Fuel Level</label>
            <select id="returnFuelLevel" required>
              <option>Full</option>
              <option>3/4</option>
              <option>1/2</option>
              <option>1/4</option>
              <option>Empty</option>
            </select>
          </div>
        </div>
        <div class="field-group"><label for="returnCondition">Return Condition</label><input type="text" id="returnCondition" placeholder="e.g. Minor scratch on rear bumper" /></div>
        <div class="field-group"><label for="returnNotes">Return Notes</label><input type="text" id="returnNotes" placeholder="Optional" /></div>
        <div class="field-group">
          <label for="returnPhotos">Return Photos</label>
          <input type="file" id="returnPhotos" accept="image/*" multiple />
          <div class="proof-preview" id="returnPhotosPreview"></div>
        </div>
        <p class="field-hint" id="returnKmPreview"></p>
        <div class="modal-actions">
          <button type="button" class="btn btn-ghost" id="returnModalCancel">Cancel</button>
          <button type="submit" class="btn btn-primary">Save Return</button>
        </div>
      </form>
    </div>
  </div>

  <script src="<?= asset('api.js') ?>"></script>
  <script src="<?= asset('car-data.js') ?>"></script>
  <script src="<?= asset('booking-data.js') ?>"></script>
  <script src="<?= asset('admin.js') ?>"></script>
</body>
</html>
