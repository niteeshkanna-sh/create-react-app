// The server decides who is signed in; by the time this page renders, the
// session has already been checked. Signing out is a form post to logout.php.

function showDashboard() {
  renderOverview();
  renderCarAdminGrid();
  renderInquiries();
  renderFinance();
  renderBookingList();
  renderReport();
}

/**
 * Shows an error where the user is looking, rather than in the console.
 * Validation failures carry per-field messages, which are worth surfacing
 * in full so the user can fix everything in one pass.
 */
function showError(err) {
  const fields = err && err.fields ? Object.values(err.fields) : [];
  const detail = fields.length ? '\n\n' + fields.join('\n') : '';
  alert((err && err.message ? err.message : 'Something went wrong.') + detail);
}

// Vehicles come from the database now. Everything below reads them through
// loadCars(), so they are fetched once here and cached for the page.
async function boot() {
  try {
    await refreshVehicles();
  } catch (err) {
    showError(err);
    return;
  }
  showDashboard();
}

document.addEventListener('DOMContentLoaded', boot);

// ---- Tabs ----
const TAB_PANELS = ['dashboard', 'bookings', 'cars', 'inquiries', 'finance', 'reports'];
document.querySelectorAll('.admin-tab').forEach((tab) => {
  tab.addEventListener('click', () => {
    document.querySelectorAll('.admin-tab').forEach((t) => t.classList.remove('is-on'));
    tab.classList.add('is-on');
    const target = tab.dataset.tab;
    TAB_PANELS.forEach((name) => {
      document.getElementById(`panel-${name}`).hidden = target !== name;
    });
    if (target === 'dashboard') renderOverview();
    if (target === 'finance') renderFinance();
    if (target === 'bookings') renderBookingList();
    if (target === 'reports') renderReport();
  });
});

// ---- Car admin grid ----
function renderCarAdminGrid() {
  const wrap = document.getElementById('carAdminGrid');
  const cars = loadCars();

  if (!cars.length) {
    wrap.innerHTML = '<div class="empty-state">No cars yet. Click "+ Add Car" to list your first one.</div>';
    return;
  }

  wrap.innerHTML = cars.map((car) => `
    <div class="car-admin-card" data-id="${car.id}">
      <div class="admin-car-thumb">${car.photo
        ? `<img src="${car.photo}" alt="" loading="lazy">`
        : carIllustrationSVG(car.bodyType, car.color)}</div>
      <div class="row1">
        <span class="name">${car.name}</span>
        <span class="status-badge status-badge-${car.status.replace(' ', '')}">${car.status}</span>
      </div>
      <div class="meta">
        <span>${car.brand}</span>
        <span>${car.bodyType}</span>
        <span>${car.regNumber || 'No reg. no.'}</span>
        <span>${car.fuel}</span>
        <span>${car.transmission}</span>
        <span>${car.seats} Seats</span>
        <span>${car.year}</span>
      </div>
      <div class="meta">
        <span>KM limit: ${car.kmLimitPerDay}/day</span>
        <span>Extra KM: ₹${car.extraKmRate}</span>
        <span>Deposit: ₹${car.securityDeposit.toLocaleString('en-IN')}</span>
        <span>Odometer: ${car.currentKm.toLocaleString('en-IN')} km</span>
      </div>
      <div class="price">₹${car.price.toLocaleString('en-IN')}/day</div>
      <div class="actions">
        <button class="btn btn-outline btn-sm edit-car-btn">Edit</button>
        <button class="btn btn-danger btn-sm delete-car-btn">Delete</button>
      </div>
    </div>
  `).join('');

  wrap.querySelectorAll('.edit-car-btn').forEach((btn) => {
    btn.addEventListener('click', (e) => {
      const id = Number(e.target.closest('.car-admin-card').dataset.id);
      openCarModal(loadCars().find((c) => c.id === id));
    });
  });
  wrap.querySelectorAll('.delete-car-btn').forEach((btn) => {
    btn.addEventListener('click', async (e) => {
      const id = Number(e.target.closest('.car-admin-card').dataset.id);
      const car = loadCars().find((c) => c.id === id);
      // Retired rather than deleted: bookings, expenses and KM records point
      // at this vehicle, and removing it would orphan that history.
      if (!confirm(`Retire "${car.name}"? It stops appearing in the fleet, but its booking history is kept.`)) return;
      const reason = prompt('Reason (optional):') || '';
      btn.disabled = true;
      try {
        await retireVehicle(id, reason);
        renderCarAdminGrid();
        renderOverview();
      } catch (err) {
        showError(err);
      } finally {
        btn.disabled = false;
      }
    });
  });
}

// ---- Car modal (add/edit) ----
const carModalOverlay = document.getElementById('carModalOverlay');
const carForm = document.getElementById('carForm');
const carModalTitle = document.getElementById('carModalTitle');

function openCarModal(car) {
  carForm.reset();
  document.getElementById('carId').value = car ? car.id : '';
  carModalTitle.textContent = car ? 'Edit Vehicle' : 'Add Vehicle';
  document.getElementById('carBrand').value = car ? car.brand : '';
  document.getElementById('carBodyType').value = car ? car.bodyType : 'Hatchback';
  document.getElementById('carName').value = car ? car.name : '';
  document.getElementById('carRegNumber').value = car ? car.regNumber : '';
  document.getElementById('carColor').value = car ? car.color : '#5B6472';
  document.getElementById('carFuel').value = car ? car.fuel : 'Petrol';
  document.getElementById('carTransmission').value = car ? car.transmission : 'Manual';
  document.getElementById('carSeats').value = car ? car.seats : 5;
  document.getElementById('carYear').value = car ? car.year : new Date().getFullYear();
  document.getElementById('carStatus').value = car ? car.status : 'Available';
  document.getElementById('carPrice').value = car ? car.price : '';
  document.getElementById('carPrice7').value = car ? car.price7 : '';
  document.getElementById('carPrice15').value = car ? car.price15 : '';
  document.getElementById('carPrice30').value = car ? car.price30 : '';
  document.getElementById('carKmLimit').value = car ? car.kmLimitPerDay : 200;
  document.getElementById('carExtraKmRate').value = car ? car.extraKmRate : '';
  document.getElementById('carSecurityDeposit').value = car ? car.securityDeposit : '';
  document.getElementById('carCurrentKm').value = car ? car.currentKm : 0;

  // Reset by hand: form.reset() clears the file input but not the preview, and
  // a preview left from the last vehicle edited would be a picture of the
  // wrong car sitting above the right one's details.
  photoRemoved = false;
  document.getElementById('carPhoto').value = '';
  document.getElementById('carCropBox').hidden = true;
  showCarPhoto(car && car.photo ? car.photo : null);

  carModalOverlay.hidden = false;
}

// Set when Remove is pressed, so Save knows to clear the photograph even
// though nothing was chosen to replace it.
let photoRemoved = false;

function showCarPhoto(url) {
  const preview = document.getElementById('carPhotoPreview');
  const img = document.getElementById('carPhotoPreviewImg');
  if (url) {
    img.src = url;
    preview.hidden = false;
  } else {
    img.removeAttribute('src');
    preview.hidden = true;
  }
}

document.getElementById('carPhotoRemove').addEventListener('click', () => {
  // Nothing is deleted until Save. Pressing Remove and then Cancel should
  // leave the vehicle exactly as it was.
  photoRemoved = true;
  document.getElementById('carPhoto').value = '';
  document.getElementById('carCropBox').hidden = true;
  showCarPhoto(null);
});

// ---- Framing a photograph ----
//
// Every car is saved at one size, 1200x750, which is the shape the website's
// cards use. That is what stops the fleet looking ragged: the page is not
// cropping pictures of different proportions and hoping, it is laying out
// identical rectangles. It also means a 4 MB phone photograph arrives as
// something around 150 KB, which the fleet page fetches once per car.
//
// Written by hand rather than with a cropping library because the panel has no
// build step -- every script here is a plain file the browser loads, and
// adding a dependency would mean adding one.
const CROP_W = 1200;
const CROP_H = 750;

const cropBox = document.getElementById('carCropBox');
const cropWindow = document.getElementById('carCropWindow');
const cropImg = document.getElementById('carCropImg');
const cropZoom = document.getElementById('carCropZoom');

// Position and scale of the image inside the window, in window pixels.
let crop = { x: 0, y: 0, scale: 1, base: 1, natW: 0, natH: 0 };

function cropApply() {
  cropImg.style.transform =
    `translate(${crop.x}px, ${crop.y}px) scale(${crop.base * crop.scale})`;
}

/** Keeps the image covering the window, so no empty corner can be framed. */
function cropClamp() {
  const w = cropWindow.clientWidth;
  const h = cropWindow.clientHeight;
  const drawnW = crop.natW * crop.base * crop.scale;
  const drawnH = crop.natH * crop.base * crop.scale;
  crop.x = Math.min(0, Math.max(w - drawnW, crop.x));
  crop.y = Math.min(0, Math.max(h - drawnH, crop.y));
}

function cropStart(file) {
  const url = URL.createObjectURL(file);
  const probe = new Image();
  probe.onload = () => {
    crop.natW = probe.naturalWidth;
    crop.natH = probe.naturalHeight;
    // Start at the smallest scale that still fills the window, so the opening
    // view is always valid and usually the whole car.
    const w = cropWindow.clientWidth || 360;
    const h = cropWindow.clientHeight || 225;
    crop.base = Math.max(w / crop.natW, h / crop.natH);
    crop.scale = 1;
    cropZoom.value = '100';
    cropImg.src = url;
    cropImg.style.width = `${crop.natW}px`;
    cropImg.style.height = `${crop.natH}px`;
    // Centre it.
    crop.x = (w - crop.natW * crop.base) / 2;
    crop.y = (h - crop.natH * crop.base) / 2;
    cropClamp();
    cropApply();
    cropBox.hidden = false;
  };
  probe.onerror = () => {
    showError(new Error('That image could not be opened.'));
  };
  probe.src = url;
}

// Pointer events rather than mouse events, so dragging works with a finger on
// a phone as well as a mouse -- the panel is used on both.
let dragging = null;
cropWindow.addEventListener('pointerdown', (e) => {
  if (cropBox.hidden) return;
  dragging = { px: e.clientX, py: e.clientY, x: crop.x, y: crop.y };
  cropWindow.setPointerCapture(e.pointerId);
});
cropWindow.addEventListener('pointermove', (e) => {
  if (!dragging) return;
  crop.x = dragging.x + (e.clientX - dragging.px);
  crop.y = dragging.y + (e.clientY - dragging.py);
  cropClamp();
  cropApply();
});
for (const done of ['pointerup', 'pointercancel']) {
  cropWindow.addEventListener(done, () => { dragging = null; });
}

cropZoom.addEventListener('input', () => {
  const w = cropWindow.clientWidth;
  const h = cropWindow.clientHeight;
  // Zoom about the middle of the window, which is where the eye is, rather
  // than the top-left corner, which sends the subject off the edge.
  const cx = (w / 2 - crop.x) / crop.scale;
  const cy = (h / 2 - crop.y) / crop.scale;
  crop.scale = Number(cropZoom.value) / 100;
  crop.x = w / 2 - cx * crop.scale;
  crop.y = h / 2 - cy * crop.scale;
  cropClamp();
  cropApply();
});

/** The framed area, as a file ready to upload. */
function croppedBlob() {
  return new Promise((resolve, reject) => {
    const w = cropWindow.clientWidth;
    const h = cropWindow.clientHeight;
    const drawn = crop.base * crop.scale;

    // What the window shows, in the source image's own pixels.
    const sx = -crop.x / drawn;
    const sy = -crop.y / drawn;
    const sw = w / drawn;
    const sh = h / drawn;

    const canvas = document.createElement('canvas');
    canvas.width = CROP_W;
    canvas.height = CROP_H;
    const ctx = canvas.getContext('2d');
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(cropImg, sx, sy, sw, sh, 0, 0, CROP_W, CROP_H);

    canvas.toBlob(
      (blob) => {
        if (blob) resolve(new File([blob], 'photo.webp', { type: 'image/webp' }));
        else reject(new Error('The framed image could not be prepared.'));
      },
      'image/webp',
      0.85,
    );
  });
}

// Show the chosen file straight away rather than after saving, so a wrong
// picture is obvious before it is committed to anything.
document.getElementById('carPhoto').addEventListener('change', (e) => {
  const file = e.target.files && e.target.files[0];
  if (!file) return;
  photoRemoved = false;
  document.getElementById('carPhotoPreview').hidden = true;
  cropStart(file);
});

function closeCarModal() {
  carModalOverlay.hidden = true;
}

document.getElementById('addCarBtn').addEventListener('click', () => openCarModal(null));
document.getElementById('carModalCancel').addEventListener('click', closeCarModal);
carModalOverlay.addEventListener('click', (e) => {
  if (e.target === carModalOverlay) closeCarModal();
});

carForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  const idValue = document.getElementById('carId').value;

  const carData = {
    brand: document.getElementById('carBrand').value.trim(),
    bodyType: document.getElementById('carBodyType').value,
    name: document.getElementById('carName').value.trim(),
    regNumber: document.getElementById('carRegNumber').value.trim().toUpperCase(),
    color: document.getElementById('carColor').value,
    fuel: document.getElementById('carFuel').value,
    transmission: document.getElementById('carTransmission').value,
    seats: Number(document.getElementById('carSeats').value),
    year: Number(document.getElementById('carYear').value),
    status: document.getElementById('carStatus').value,
    price: Number(document.getElementById('carPrice').value),
    price7: Number(document.getElementById('carPrice7').value) || 0,
    price15: Number(document.getElementById('carPrice15').value) || 0,
    price30: Number(document.getElementById('carPrice30').value) || 0,
    kmLimitPerDay: Number(document.getElementById('carKmLimit').value),
    extraKmRate: Number(document.getElementById('carExtraKmRate').value),
    securityDeposit: Number(document.getElementById('carSecurityDeposit').value),
    currentKm: Number(document.getElementById('carCurrentKm').value),
  };

  if (idValue) {
    carData.id = Number(idValue);
  }

  const submitBtn = carForm.querySelector('button[type="submit"]');
  submitBtn.disabled = true;
  try {
    // The server validates and stores; the panel re-reads rather than
    // guessing what was saved, so what is shown is what is recorded.
    const saved = await saveVehicle(carData);

    // Second, and only now: a photograph is stored against a vehicle id, and a
    // vehicle being created has none until the save above returns one.
    const chosen = document.getElementById('carPhoto').files[0] || null;
    const vehicleId = saved && saved.id ? saved.id : carData.id;
    if (vehicleId && (chosen || photoRemoved)) {
      // The framed version, at a fixed size, rather than whatever came off the
      // phone. Uploading the original would put the cropping back on the
      // website, where it has no idea which part of the picture matters.
      const image = chosen ? await croppedBlob() : null;
      await saveVehiclePhoto(vehicleId, image);
    }

    closeCarModal();
    renderCarAdminGrid();
    renderOverview();
  } catch (err) {
    showError(err);
  } finally {
    submitBtn.disabled = false;
  }
});

// ---- Inquiries ----
let enquiryStatusFilter = '';
let enquirySearch = '';

document.querySelectorAll('[data-enquiry-status]').forEach((chip) => {
  chip.addEventListener('click', async () => {
    document.querySelectorAll('[data-enquiry-status]').forEach((c) => c.classList.remove('active'));
    chip.classList.add('active');
    enquiryStatusFilter = chip.dataset.enquiryStatus;
    await renderInquiries();
  });
});

// Typing filters as you go, but only once you stop — a request per keystroke
// would be a lot of queries for no benefit.
let enquirySearchTimer = null;
document.getElementById('enquirySearch')?.addEventListener('input', (e) => {
  clearTimeout(enquirySearchTimer);
  enquirySearchTimer = setTimeout(async () => {
    enquirySearch = e.target.value.trim();
    await renderInquiries();
  }, 300);
});

async function renderInquiries() {
  const wrap = document.getElementById('inquiriesWrap');
  const countBadge = document.getElementById('inquiryCount');
  if (!wrap) return;

  let enquiries;
  try {
    enquiries = (await api.enquiries.list(enquiryStatusFilter, enquirySearch)).enquiries;
  } catch (err) {
    wrap.innerHTML = '<div class="empty-state">Could not load enquiries.</div>';
    showError(err);
    return;
  }

  // The badge counts what still needs attention, not everything ever received.
  const outstanding = enquiries.filter((e) => ['New', 'Contacted', 'Pending'].includes(e.status)).length;
  if (countBadge) countBadge.textContent = outstanding || '';

  if (!enquiries.length) {
    wrap.innerHTML = enquirySearch || enquiryStatusFilter
      ? '<div class="empty-state">No enquiries match that.</div>'
      : '<div class="empty-state">No enquiries yet. Submissions from the booking form on niteshacars.in appear here.</div>';
    return;
  }

  wrap.innerHTML = enquiries.map((e) => `
    <div class="enquiry-card" data-id="${e.id}">
      <div class="row">
        <span class="num">${e.enquiry_number}</span>
        <span class="enquiry-name">${escapeHTML(e.name)}</span>
        <span class="meta">
          ${escapeHTML(e.phone)}
          ${e.vehicle_name ? ` · ${escapeHTML(e.vehicle_name)}` : ''}
          ${e.start_date ? ` · ${formatDate(e.start_date)}${e.return_date ? ` → ${formatDate(e.return_date)}` : ''}` : ''}
        </span>
      </div>
      <div class="right">
        ${e.booking_number ? `<span class="meta">${e.booking_number}</span>` : ''}
        <span class="status-badge status-badge-${e.status}">${e.status}</span>
        <span class="inquiry-time">${formatDate(e.created_at)}</span>
      </div>
    </div>`).join('');

  wrap.querySelectorAll('.enquiry-card').forEach((card) => {
    card.addEventListener('click', () => openEnquiry(Number(card.dataset.id)));
  });
}

/**
 * Enquiry text is written by strangers on a public form, so it is escaped
 * everywhere it is shown rather than trusted into innerHTML.
 */
function escapeHTML(value) {
  return String(value ?? '').replace(/[&<>"']/g, (c) => (
    { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]
  ));
}

// ---- Enquiry detail ----
const enquiryModalOverlay = document.getElementById('enquiryModalOverlay');
let currentEnquiry = null;

document.getElementById('enquiryModalClose').addEventListener('click', () => {
  enquiryModalOverlay.hidden = true;
  currentEnquiry = null;
});
enquiryModalOverlay.addEventListener('click', (e) => {
  if (e.target === enquiryModalOverlay) { enquiryModalOverlay.hidden = true; currentEnquiry = null; }
});

async function openEnquiry(id) {
  enquiryModalOverlay.hidden = false;
  document.getElementById('enquiryModalBody').innerHTML = '<p class="detail-empty">Loading…</p>';
  await renderEnquiry(id);
}

async function renderEnquiry(id) {
  const body = document.getElementById('enquiryModalBody');
  let e;
  try {
    e = (await api.enquiries.get(id)).enquiry;
  } catch (err) {
    body.innerHTML = '<p class="detail-empty">Could not load this enquiry.</p>';
    showError(err);
    return;
  }
  currentEnquiry = e;

  const open = !['Converted', 'Rejected', 'Cancelled'].includes(e.status);

  document.getElementById('enquiryModalTitle').innerHTML =
    `${e.enquiry_number} <span class="status-badge status-badge-${e.status}">${e.status}</span>`;

  body.innerHTML = `
    <div class="detail-section">
      <div class="detail-section-title"><span>Customer</span></div>
      <div class="detail-grid">
        <div class="detail-field"><span class="k">Name</span><span class="v">${escapeHTML(e.name)}</span></div>
        <div class="detail-field"><span class="k">Phone</span><span class="v">
          <a href="tel:${escapeHTML(e.phone)}">${escapeHTML(e.phone)}</a></span></div>
        <div class="detail-field"><span class="k">Email</span><span class="v">${escapeHTML(e.email) || '—'}</span></div>
        <div class="detail-field"><span class="k">Received</span><span class="v">${formatDateTime(e.created_at)}</span></div>
      </div>
    </div>

    <div class="detail-section">
      <div class="detail-section-title"><span>What they asked for</span></div>
      <div class="detail-grid">
        <div class="detail-field"><span class="k">Vehicle</span><span class="v">${escapeHTML(e.vehicle_name) || 'Not specified'}</span></div>
        <div class="detail-field"><span class="k">Dates</span><span class="v">
          ${e.start_date ? formatDate(e.start_date) : '—'}${e.return_date ? ` → ${formatDate(e.return_date)}` : ''}</span></div>
        <div class="detail-field"><span class="k">Pickup</span><span class="v">${escapeHTML(e.pickup_location) || '—'}</span></div>
      </div>
      ${e.message ? `<p class="field-hint" style="margin-top:10px">“${escapeHTML(e.message)}”</p>` : ''}
      ${e.requirements ? `<p class="field-hint">${escapeHTML(e.requirements)}</p>` : ''}
    </div>

    <div class="detail-section">
      <div class="detail-section-title"><span>Notes</span></div>
      ${e.admin_notes
        ? `<div class="enquiry-notes">${escapeHTML(e.admin_notes)}</div>`
        : '<p class="detail-empty">No notes yet.</p>'}
      ${open ? '<div class="enquiry-actions"><button class="btn btn-ghost btn-sm" id="enqAddNote">Add note</button></div>' : ''}
    </div>

    ${e.booking_number ? `
      <div class="detail-section">
        <div class="detail-section-title"><span>Became a booking</span></div>
        <p class="field-hint">This enquiry was accepted and became <strong>${e.booking_number}</strong>.</p>
      </div>` : ''}

    ${open ? `
      <div class="detail-section">
        <div class="detail-section-title"><span>Handle</span></div>
        <div class="enquiry-actions">
          <button class="btn btn-ghost btn-sm" data-enq-status="Contacted">Mark Contacted</button>
          <button class="btn btn-ghost btn-sm" data-enq-status="Pending">Mark Pending</button>
          <button class="btn btn-ghost btn-sm" data-enq-status="Rejected">Reject</button>
          <button class="btn btn-primary btn-sm" id="enqConvert">Accept &amp; Create Booking</button>
        </div>
      </div>` : ''}
  `;

  document.getElementById('enqAddNote')?.addEventListener('click', async () => {
    const note = prompt('Add a note to this enquiry:');
    if (note === null || !note.trim()) return;
    try {
      await api.enquiries.note(e.id, note.trim());
      await renderEnquiry(e.id);
    } catch (err) { showError(err); }
  });

  body.querySelectorAll('[data-enq-status]').forEach((btn) => {
    btn.addEventListener('click', async () => {
      const status = btn.dataset.enqStatus;
      // Turning someone away needs a reason; the server insists, and asking
      // here means the user is not bounced back by an error.
      const needsReason = status === 'Rejected';
      const note = prompt(needsReason ? 'Why is this being rejected?' : 'Add a note (optional):');
      if (note === null) return;
      if (needsReason && !note.trim()) { alert('A reason is required to reject an enquiry.'); return; }
      try {
        await api.enquiries.status(e.id, status, note.trim());
        await renderEnquiry(e.id);
        await renderInquiries();
      } catch (err) { showError(err); }
    });
  });

  document.getElementById('enqConvert')?.addEventListener('click', () => openConvertModal(e));
}

/**
 * Accepting reuses the booking form, pre-filled from the enquiry. The
 * conversion goes through its own endpoint so the booking keeps a link back
 * to where it came from.
 */
let convertingEnquiry = null;

function openConvertModal(enquiry) {
  convertingEnquiry = enquiry;
  enquiryModalOverlay.hidden = true;

  openBookingModal(null);
  document.getElementById('bookingModalTitle').textContent = `Book ${enquiry.enquiry_number}`;
  document.getElementById('bookingNumberPreview').textContent =
    `Creating a booking from ${enquiry.enquiry_number} for ${enquiry.name}.`;
  document.getElementById('bkCustomerName').value = enquiry.name || '';
  document.getElementById('bkPhone').value = enquiry.phone || '';
  document.getElementById('bkAddress').value = '';
  if (enquiry.vehicle_id) {
    document.getElementById('bkVehicle').value = enquiry.vehicle_id;
    document.getElementById('bkVehicle').dispatchEvent(new Event('change'));
  }
  if (enquiry.start_date) document.getElementById('bkStartDate').value = enquiry.start_date;
  if (enquiry.return_date) document.getElementById('bkReturnDate').value = enquiry.return_date;
  updateBookingDurationPreview();
}

// ---- Finance ----
//
// Income is not entered here. It is summed from the payments already recorded
// against bookings, so this tab can never disagree with the bookings it
// summarises. What is entered here is what the business spent.

let FINANCE_SUMMARY = null;

function formatINR(amount) {
  // Coerced rather than trusted: money arrives from the API as a number, but
  // a string slipping through would format as 2000.00 instead of ₹2,000.
  const value = Number(amount) || 0;
  return `₹${value.toLocaleString('en-IN')}`;
}

/** The range the Finance tab is showing, defaulting to the current month. */
function financeRange() {
  const from = document.getElementById('finFrom');
  const to = document.getElementById('finTo');
  if (from && !from.value) {
    const now = new Date();
    from.value = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10);
    to.value = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().slice(0, 10);
  }
  return { from: from ? from.value : '', to: to ? to.value : '' };
}

function setFinanceRange(from, to) {
  document.getElementById('finFrom').value = from.toISOString().slice(0, 10);
  document.getElementById('finTo').value = to.toISOString().slice(0, 10);
  renderFinance();
}

/** A bar per row, sized against the largest, so the shape reads at a glance. */
function breakdownHTML(rows, labelOf, emptyText) {
  if (!rows.length) return `<div class="empty-state">${emptyText}</div>`;
  const top = Math.max(...rows.map((r) => Math.abs(Number(r.total) || 0)), 1);
  return rows.map((row) => {
    const value = Number(row.total) || 0;
    return `
      <div class="breakdown-row">
        <span class="breakdown-label">${escapeHTML(labelOf(row))}</span>
        <span class="breakdown-bar"><i style="width:${Math.round((Math.abs(value) / top) * 100)}%"></i></span>
        <span class="breakdown-value">${formatINR(value)}</span>
      </div>`;
  }).join('');
}

const PAYMENT_KIND_LABELS = {
  advance: 'Advance', balance: 'Balance', additional: 'Additional', extra_km: 'Extra KM',
};

/**
 * The dashboard shows these too, but without the buttons: its handlers live
 * with the Finance tab, so controls rendered there would look live and do
 * nothing.
 */
function expenseCardHTML(expense, { actions = true } = {}) {
  const voided = expense.status !== 'active';
  const where = [
    expense.vehicle_name ? `${expense.vehicle_name}${expense.reg_number ? ` (${expense.reg_number})` : ''}` : null,
    expense.vendor,
    expense.booking_number,
  ].filter(Boolean).map(escapeHTML).join(' · ');

  return `
    <div class="expense-card${voided ? ' is-voided' : ''}" data-id="${expense.id}">
      <div class="row">
        <span class="num">${escapeHTML(expense.expense_number)}</span>
        <span class="expense-what">${escapeHTML(expense.description || expense.category)}</span>
        <span class="meta">
          ${escapeHTML(expense.category)} · ${escapeHTML(expense.method)}${where ? ` · ${where}` : ''}
        </span>
        ${expense.corrects_number
          ? `<span class="meta corrects">Corrects ${escapeHTML(expense.corrects_number)}</span>` : ''}
        ${expense.status_reason
          ? `<span class="meta reason">${escapeHTML(expense.status_reason)}</span>` : ''}
      </div>
      <div class="right">
        ${expense.approval_state === 'pending' && !voided
          ? '<span class="status-badge status-badge-Pending">Awaiting approval</span>' : ''}
        ${expense.approval_state === 'rejected'
          ? '<span class="status-badge status-badge-Rejected">Rejected</span>' : ''}
        ${voided ? `<span class="status-badge status-badge-Cancelled">${escapeHTML(expense.status)}</span>` : ''}
        <span class="expense-amount">${formatINR(expense.amount)}</span>
        <span class="meta">${formatDate(expense.spent_on)}</span>
        ${voided || !actions ? '' : `
          <span class="expense-actions">
            ${expense.approval_state === 'pending'
              ? '<button class="link-btn approve-expense">Approve</button>' : ''}
            <button class="link-btn correct-expense">Correct</button>
            <button class="link-btn danger void-expense">Void</button>
          </span>`}
      </div>
    </div>`;
}

async function renderFinance() {
  const wrap = document.getElementById('expensesWrap');
  if (!wrap) return;

  const range = financeRange();
  const showVoided = document.getElementById('finShowVoided')?.checked === true;

  let summary;
  let expenses;
  try {
    [summary, expenses] = await Promise.all([
      api.expenses.summary(range),
      api.expenses.list({ ...range, includeVoided: showVoided }),
    ]);
  } catch (err) {
    wrap.innerHTML = `<div class="empty-state">Could not load finance: ${escapeHTML(err.message)}</div>`;
    return;
  }
  FINANCE_SUMMARY = summary;

  document.getElementById('financeIncome').textContent = formatINR(summary.income.total);
  document.getElementById('financeExpense').textContent = formatINR(summary.expenses.total);
  document.getElementById('financeBalance').textContent = formatINR(summary.net);

  document.getElementById('financeIncomeFoot').textContent =
    summary.income.by_kind.map((k) => `${PAYMENT_KIND_LABELS[k.kind] || k.kind} ${formatINR(k.total)}`).join(' · ');

  const pending = summary.expenses.pending_approval;
  document.getElementById('financeExpenseFoot').textContent =
    pending.count ? `${pending.count} awaiting approval (${formatINR(pending.total)})` : '';
  document.getElementById('financeBalanceFoot').textContent =
    Number(summary.net) < 0 ? 'Spent more than was taken in' : '';

  // Said plainly rather than folded into the figures: a deposit is the
  // customer's money being held, and counting it as income would overstate
  // what the business actually earned.
  const deposits = summary.deposits;
  document.getElementById('financeDepositNote').textContent =
    (Number(deposits.received) || Number(deposits.refunded))
      ? `Deposits are not income: ${formatINR(deposits.received)} taken and `
        + `${formatINR(deposits.refunded)} returned in this period.`
      : '';

  document.getElementById('financeByMethod').innerHTML =
    breakdownHTML(summary.income.by_method, (r) => `${r.method} (${r.count})`, 'No payments in this period.');
  document.getElementById('financeByCategory').innerHTML =
    breakdownHTML(summary.expenses.by_category, (r) => `${r.category} (${r.count})`, 'No expenses in this period.');
  document.getElementById('financeByVehicle').innerHTML =
    breakdownHTML(summary.expenses.by_vehicle, (r) => `${r.name} (${r.reg_number})`, 'No vehicle costs in this period.');

  wrap.innerHTML = expenses.expenses.length
    ? expenses.expenses.map(expenseCardHTML).join('')
    : '<div class="empty-state">No expenses recorded in this period.</div>';

  wrap.querySelectorAll('.void-expense').forEach((btn) => {
    btn.addEventListener('click', async (e) => {
      const id = Number(e.target.closest('.expense-card').dataset.id);
      const reason = prompt('Why is this expense being voided?');
      if (!reason) return;
      await guardedCall(() => api.expenses.void(id, reason));
    });
  });

  wrap.querySelectorAll('.correct-expense').forEach((btn) => {
    btn.addEventListener('click', async (e) => {
      const id = Number(e.target.closest('.expense-card').dataset.id);
      const amount = prompt('Adjustment — positive if too little was recorded, '
        + 'negative if too much. The original entry stays on file.');
      if (amount === null || amount.trim() === '') return;
      const reason = prompt('Why is it being corrected?');
      if (!reason) return;
      await guardedCall(() => api.expenses.correct({ corrects_id: id, amount, reason }));
    });
  });

  wrap.querySelectorAll('.approve-expense').forEach((btn) => {
    btn.addEventListener('click', async (e) => {
      const id = Number(e.target.closest('.expense-card').dataset.id);
      if (!confirm('Approve this expense?')) return;
      await guardedCall(() => api.expenses.approve(id, 'approved', ''));
    });
  });
}

/** Runs a write, reports what went wrong in words, and repaints on success. */
async function guardedCall(fn) {
  try {
    await fn();
    await renderFinance();
    await renderOverview();
  } catch (err) {
    alert(err.message);
  }
}

function openExpenseModal() {
  const form = document.getElementById('expenseForm');
  form.reset();
  document.getElementById('expenseFormError').textContent = '';
  document.getElementById('expDate').value = new Date().toISOString().slice(0, 10);

  const select = document.getElementById('expVehicle');
  select.innerHTML = '<option value="">Not vehicle-specific</option>'
    + loadCars().map((c) => `<option value="${c.id}">${escapeHTML(c.name)}</option>`).join('');

  document.getElementById('expenseModalOverlay').hidden = false;
}

function closeExpenseModal() {
  document.getElementById('expenseModalOverlay').hidden = true;
}

// ---- Finance wiring ----
document.getElementById('addExpenseBtn')?.addEventListener('click', openExpenseModal);
document.getElementById('expenseModalCancel')?.addEventListener('click', closeExpenseModal);
document.getElementById('expenseModalClose')?.addEventListener('click', closeExpenseModal);
document.getElementById('finShowVoided')?.addEventListener('change', renderFinance);
document.getElementById('finFrom')?.addEventListener('change', renderFinance);
document.getElementById('finTo')?.addEventListener('change', renderFinance);

document.getElementById('finThisMonth')?.addEventListener('click', () => {
  const now = new Date();
  setFinanceRange(new Date(now.getFullYear(), now.getMonth(), 1),
                  new Date(now.getFullYear(), now.getMonth() + 1, 0));
});
document.getElementById('finLastMonth')?.addEventListener('click', () => {
  const now = new Date();
  setFinanceRange(new Date(now.getFullYear(), now.getMonth() - 1, 1),
                  new Date(now.getFullYear(), now.getMonth(), 0));
});
document.getElementById('finThisYear')?.addEventListener('click', () => {
  const now = new Date();
  setFinanceRange(new Date(now.getFullYear(), 0, 1), new Date(now.getFullYear(), 11, 31));
});

document.getElementById('expenseForm')?.addEventListener('submit', async (e) => {
  e.preventDefault();
  const error = document.getElementById('expenseFormError');
  error.textContent = '';

  const vehicleId = document.getElementById('expVehicle').value;
  try {
    await api.expenses.save({
      amount: document.getElementById('expAmount').value,
      spent_on: document.getElementById('expDate').value,
      category: document.getElementById('expCategory').value,
      method: document.getElementById('expMethod').value,
      description: document.getElementById('expDescription').value.trim(),
      vendor: document.getElementById('expVendor').value.trim(),
      vehicle_id: vehicleId ? Number(vehicleId) : null,
    });
  } catch (err) {
    // Field-level messages belong beside the form, not in a dialog that
    // disappears the moment it is dismissed.
    error.textContent = err.fields
      ? Object.values(err.fields).join(' ')
      : err.message;
    return;
  }

  closeExpenseModal();
  await renderFinance();
  await renderOverview();
});

// ---- Dashboard overview ----
async function renderOverview() {
  const carCountEl = document.getElementById('statCarCount');
  if (!carCountEl) return;

  const cars = loadCars();

  // The dashboard shows the current month, which is the figure someone means
  // when they ask how the business is doing.
  let money = { income: { total: 0 }, expenses: { total: 0, pending_approval: { count: 0 } }, net: 0 };
  try {
    money = await api.expenses.summary({});
    FINANCE_SUMMARY = money;
  } catch {
    // The rest of the dashboard should still paint if this one call fails.
  }

  // Enquiries still needing attention, rather than every one ever received —
  // a count that only ever grows tells you nothing.
  let inquiries = [];
  try {
    inquiries = (await api.enquiries.list()).enquiries
      .filter((e) => ['New', 'Contacted', 'Pending'].includes(e.status));
  } catch {
    // The dashboard should still render its other figures if this one fails.
  }

  carCountEl.textContent = cars.length;
  document.getElementById('statInquiryCount').textContent = inquiries.length;
  document.getElementById('statIncome').textContent = formatINR(money.income.total);
  document.getElementById('statExpense').textContent = formatINR(money.expenses.total);
  document.getElementById('statBalance').textContent = formatINR(money.net);

  const recentInquiries = document.getElementById('recentInquiries');
  recentInquiries.innerHTML = inquiries.length
    ? inquiries.slice(0, 5).map((inq) => `
      <div class="inquiry-card">
        <div class="inquiry-info">
          <span class="inquiry-name">${escapeHTML(inq.name)}</span>
          <span class="inquiry-detail">${escapeHTML(inq.phone)}${inq.vehicle_name ? ` · ${escapeHTML(inq.vehicle_name)}` : ''}</span>
        </div>
        <span class="inquiry-time">${formatDate(inq.created_at)}</span>
      </div>`).join('')
    : '<div class="empty-state">No inquiries yet.</div>';

  const recentTransactions = document.getElementById('recentTransactions');
  let recent = [];
  try {
    recent = (await api.expenses.list({})).expenses.slice(0, 5);
  } catch {
    // Same again: a failure here should not take the whole dashboard down.
  }
  recentTransactions.innerHTML = recent.length
    ? recent.map((e) => expenseCardHTML(e, { actions: false })).join('')
    : '<div class="empty-state">No expenses this month.</div>';

  renderRentalOverview();
}

// ==========================================================================
// Bookings / Rental Management
// ==========================================================================

// Bookings come from the server. They are cached per page load so the
// dashboard and reports can read them synchronously, and refreshed whenever
// anything changes.
let BOOKING_CACHE = [];

async function refreshBookings(status = '') {
  const data = await api.bookings.list(status);
  BOOKING_CACHE = data.bookings;
  return BOOKING_CACHE;
}

/** Synchronous read of the cached bookings, for the render code. */
function loadBookings() {
  return BOOKING_CACHE.slice();
}

function formatDate(value) {
  if (!value) return '—';
  return new Date(value).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

function formatDateTime(value) {
  if (!value) return '—';
  return new Date(value).toLocaleString('en-IN', {
    day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
  });
}

function vehicleLabel(vehicleId) {
  const car = loadCars().find((c) => c.id === vehicleId);
  return car ? car.name : '(vehicle removed)';
}

function populateVehicleSelect(selectEl, selectedId) {
  const cars = loadCars();
  selectEl.innerHTML = cars
    .map((c) => `<option value="${c.id}">${c.name} (${c.regNumber || 'no reg. no.'})</option>`)
    .join('');
  if (selectedId) selectEl.value = selectedId;
}

/** Splits a MySQL datetime into the date and time a form field expects. */
function splitDateTime(value) {
  if (!value) return ['', ''];
  const [date, time = ''] = String(value).replace('T', ' ').split(' ');
  return [date, time.slice(0, 5)];
}

// ---- Booking list ----
let bookingStatusFilter = 'all';

document.querySelectorAll('.filter-chip').forEach((chip) => {
  chip.addEventListener('click', async () => {
    document.querySelectorAll('.filter-chip').forEach((c) => c.classList.remove('active'));
    chip.classList.add('active');
    bookingStatusFilter = chip.dataset.status;
    await renderBookingList();
  });
});

async function renderBookingList() {
  const wrap = document.getElementById('bookingListWrap');
  const countBadge = document.getElementById('bookingCount');
  if (!wrap) return;

  try {
    await refreshBookings(bookingStatusFilter === 'all' ? '' : bookingStatusFilter);
  } catch (err) {
    wrap.innerHTML = '<div class="empty-state">Could not load bookings.</div>';
    showError(err);
    return;
  }

  const bookings = loadBookings();
  countBadge.textContent = bookings.length || '';

  if (!bookings.length) {
    wrap.innerHTML = '<div class="empty-state">No bookings yet. Click "+ New Booking" to create one.</div>';
    return;
  }

  wrap.innerHTML = bookings.map((b) => `
    <div class="booking-card" data-id="${b.id}">
      <div class="booking-card-main">
        <span class="booking-card-number">${b.booking_number}</span>
        <span class="booking-card-customer">${b.customer_name}</span>
        <span class="booking-card-meta">${b.vehicle_name} · ${formatDate(b.start_at)} → ${formatDate(b.return_at)} · ${b.duration_days} day(s)</span>
      </div>
      <div class="booking-card-right">
        <span class="status-stack">
          <span class="status-badge status-badge-${b.status}">${b.status}</span>
          ${scheduleChipHTML(b)}
        </span>
        <div class="booking-card-balance">
          <span class="label">Balance</span>
          <span class="amount">${formatINR(b.balance)}</span>
        </div>
      </div>
    </div>`).join('');

  wrap.querySelectorAll('.booking-card').forEach((card) => {
    card.addEventListener('click', () => openBookingDetail(Number(card.dataset.id)));
  });
}

// ---- Booking create/edit modal ----
const bookingModalOverlay = document.getElementById('bookingModalOverlay');
const bookingForm = document.getElementById('bookingForm');
const bookingVehicleSelect = document.getElementById('bkVehicle');

function bookingFormDateTimes() {
  const startDate = document.getElementById('bkStartDate').value;
  const startTime = document.getElementById('bkStartTime').value || '10:00';
  const returnDate = document.getElementById('bkReturnDate').value;
  const returnTime = document.getElementById('bkReturnTime').value || '10:00';
  return [`${startDate} ${startTime}`, `${returnDate} ${returnTime}`];
}

function updateBookingDurationPreview() {
  const [startAt, returnAt] = bookingFormDateTimes();
  const start = new Date(startAt.replace(' ', 'T'));
  const end = new Date(returnAt.replace(' ', 'T'));
  let days = 1;
  if (!Number.isNaN(start) && !Number.isNaN(end) && end > start) {
    days = Math.max(1, Math.ceil((end - start) / 86400000));
  }
  document.getElementById('bkDurationPreview').textContent = `${days} day${days === 1 ? '' : 's'}`;
  return days;
}

['bkStartDate', 'bkStartTime', 'bkReturnDate', 'bkReturnTime'].forEach((id) => {
  document.getElementById(id).addEventListener('change', updateBookingDurationPreview);
});

bookingVehicleSelect.addEventListener('change', () => {
  const car = loadCars().find((c) => c.id === Number(bookingVehicleSelect.value));
  if (!car) return;
  document.getElementById('bkVehicleReg').value = car.regNumber || '';
  document.getElementById('bkKmLimit').value = car.kmLimitPerDay;
  document.getElementById('bkExtraKmRate').value = car.extraKmRate;
});

function openBookingModal(booking) {
  bookingForm.reset();
  populateVehicleSelect(bookingVehicleSelect, booking ? booking.vehicle_id : null);
  document.getElementById('bookingId').value = booking ? booking.id : '';
  document.getElementById('bookingModalTitle').textContent = booking ? 'Edit Booking' : 'New Booking';
  document.getElementById('bookingNumberPreview').textContent = booking
    ? `Booking Number: ${booking.booking_number}`
    : 'Booking number is allocated when the booking is saved.';
  document.getElementById('bookingConflictError').textContent = '';

  if (booking) {
    const [sd, st] = splitDateTime(booking.start_at);
    const [rd, rt] = splitDateTime(booking.return_at);
    document.getElementById('bkCustomerName').value = booking.customer_name || '';
    document.getElementById('bkPhone').value = booking.customer_phone || '';
    document.getElementById('bkAddress').value = booking.customer_address || '';
    document.getElementById('bkLicence').value = booking.licence_number || '';
    document.getElementById('bkStartDate').value = sd;
    document.getElementById('bkStartTime').value = st;
    document.getElementById('bkReturnDate').value = rd;
    document.getElementById('bkReturnTime').value = rt;
    document.getElementById('bkRentalAmount').value = booking.charges ? booking.charges.base_rental : '';
    document.getElementById('bkKmLimit').value = booking.charges ? booking.charges.km_limit_per_day : 200;
    document.getElementById('bkExtraKmRate').value = booking.charges ? booking.charges.extra_km_rate : 0;
    document.getElementById('bkNotes').value = booking.notes || '';
    document.getElementById('bkVehicleReg').value = booking.vehicle_reg || '';
  } else {
    document.getElementById('bkStartTime').value = '10:00';
    document.getElementById('bkReturnTime').value = '10:00';
    bookingVehicleSelect.dispatchEvent(new Event('change'));
  }

  updateBookingDurationPreview();
  bookingModalOverlay.hidden = false;
}

function closeBookingModal() {
  bookingModalOverlay.hidden = true;
  convertingEnquiry = null;
}

document.getElementById('addBookingBtn').addEventListener('click', () => openBookingModal(null));
document.getElementById('bookingModalCancel').addEventListener('click', closeBookingModal);
bookingModalOverlay.addEventListener('click', (e) => {
  if (e.target === bookingModalOverlay) closeBookingModal();
});

bookingForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  const idValue = document.getElementById('bookingId').value;
  const [startAt, returnAt] = bookingFormDateTimes();
  const conflictEl = document.getElementById('bookingConflictError');
  conflictEl.textContent = '';

  const payload = {
    customer_name: document.getElementById('bkCustomerName').value.trim(),
    phone: document.getElementById('bkPhone').value.trim(),
    address: document.getElementById('bkAddress').value.trim(),
    licence_number: document.getElementById('bkLicence').value.trim(),
    vehicle_id: Number(bookingVehicleSelect.value),
    start_at: startAt,
    return_at: returnAt,
    base_rental: document.getElementById('bkRentalAmount').value,
    km_limit_per_day: document.getElementById('bkKmLimit').value,
    extra_km_rate: document.getElementById('bkExtraKmRate').value,
    notes: document.getElementById('bkNotes').value.trim(),
  };
  if (idValue) payload.id = Number(idValue);

  const submitBtn = bookingForm.querySelector('button[type="submit"]');
  submitBtn.disabled = true;
  try {
    if (convertingEnquiry) {
      // Goes through the enquiry endpoint so the booking keeps a link back to
      // the enquiry it came from, and the enquiry is marked Converted.
      const result = await api.enquiries.convert({
        id: convertingEnquiry.id,
        vehicle_id: payload.vehicle_id,
        start_at: payload.start_at,
        return_at: payload.return_at,
        base_rental: payload.base_rental,
        licence_number: payload.licence_number,
        address: payload.address,
      });
      convertingEnquiry = null;
      closeBookingModal();
      alert(`${result.enquiry_number} is now booking ${result.booking_number}.`);
      await renderInquiries();
      await renderBookingList();
      await renderOverview();
      return;
    }

    await api.bookings.save(payload);
    closeBookingModal();
    await renderBookingList();
    await renderOverview();
  } catch (err) {
    // A double booking is the expected failure here, so it belongs beside the
    // dates rather than in a dialog the user has to dismiss.
    if (err.status === 409) {
      conflictEl.textContent = err.message;
    } else {
      showError(err);
    }
  } finally {
    submitBtn.disabled = false;
  }
});

// ---- Booking detail ----
const bookingDetailOverlay = document.getElementById('bookingDetailOverlay');
let currentDetailBookingId = null;
let currentDetail = null;

async function openBookingDetail(id) {
  currentDetailBookingId = id;
  bookingDetailOverlay.hidden = false;
  document.getElementById('bookingDetailBody').innerHTML = '<p class="detail-empty">Loading…</p>';
  await renderBookingDetail(id);
}

function closeBookingDetail() {
  bookingDetailOverlay.hidden = true;
  currentDetailBookingId = null;
  currentDetail = null;
}

document.getElementById('bookingDetailClose').addEventListener('click', closeBookingDetail);
bookingDetailOverlay.addEventListener('click', (e) => {
  if (e.target === bookingDetailOverlay) closeBookingDetail();
});

async function refreshAfterBookingChange() {
  await renderBookingList();
  await renderOverview();
  await renderCarAdminGrid();
  if (currentDetailBookingId) await renderBookingDetail(currentDetailBookingId);
}

function timelineHTML(entries) {
  if (!entries || !entries.length) return '<p class="detail-empty">No activity yet.</p>';
  const label = (action) => action.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
  return `<ul class="timeline-list">${entries.map((t) => `
    <li>
      <span class="t-event">${label(t.action)}${t.reason ? ` — ${t.reason}` : ''}</span>
      <span class="t-time">${formatDateTime(t.created_at)}${t.user_label ? ` · ${t.user_label}` : ''}</span>
    </li>`).join('')}</ul>`;
}

async function renderBookingDetail(id) {
  const body = document.getElementById('bookingDetailBody');

  let booking;
  try {
    booking = (await api.bookings.get(id)).booking;
  } catch (err) {
    body.innerHTML = '<p class="detail-empty">Could not load this booking.</p>';
    showError(err);
    return;
  }
  currentDetail = booking;

  const charges = booking.charges || {};
  const km = booking.km || {};
  const open = booking.status !== 'Completed' && booking.status !== 'Cancelled';

  document.getElementById('bookingDetailTitle').innerHTML =
    `${booking.booking_number} <span class="status-badge status-badge-${booking.status}">${booking.status}</span> ${scheduleChipHTML(booking)}`;

  // Payments that have been voided stay listed, struck through: the record of
  // what was entered is part of the trail, not something to hide.
  const paymentRows = booking.payments.length
    ? booking.payments.map((p) => `
        <div class="payment-row ${p.status !== 'active' ? 'payment-void' : ''}">
          <span>
            ${PAYMENT_TYPE_LABELS[p.kind] || p.kind} · ${p.method}
            ${p.reference ? `(${p.reference})` : ''} · ${formatDate(p.paid_on)}
            ${p.corrects_id ? '<em>correction</em>' : ''}
            ${p.status !== 'active' ? `<em>${p.status}</em>` : ''}
          </span>
          <span class="amount">${formatINR(p.amount)}</span>
          ${p.status === 'active' ? `<button class="btn btn-ghost btn-sm void-payment" data-id="${p.id}">Void</button>` : ''}
        </div>`).join('')
    : '<p class="detail-empty">No payments recorded yet.</p>';

  body.innerHTML = `
    <div class="detail-section">
      <div class="detail-section-title">
        <span>Customer &amp; Rental Details</span>
        <div>
          ${open ? '<button class="btn btn-outline btn-sm" id="detailEditBtn">Edit</button>' : ''}
          ${open ? '<button class="btn btn-ghost btn-sm" id="detailCancelBtn">Cancel Booking</button>' : ''}
          ${open ? '<button class="btn btn-primary btn-sm" id="detailCompleteBtn">Mark Completed</button>' : ''}
        </div>
      </div>
      <div class="detail-grid">
        <div class="detail-field"><span class="k">Customer</span><span class="v">${booking.customer_name}</span></div>
        <div class="detail-field"><span class="k">Phone</span><span class="v">${booking.customer_phone}</span></div>
        <div class="detail-field"><span class="k">Address</span><span class="v">${booking.customer_address || '—'}</span></div>
        <div class="detail-field"><span class="k">Licence No.</span><span class="v">${booking.licence_number || '—'}</span></div>
        <div class="detail-field"><span class="k">Vehicle</span><span class="v">${booking.vehicle_name}</span></div>
        <div class="detail-field"><span class="k">Reg. Number</span><span class="v">${booking.vehicle_reg || '—'}</span></div>
        <div class="detail-field"><span class="k">Start</span><span class="v">${formatDateTime(booking.start_at)}</span></div>
        <div class="detail-field"><span class="k">Return</span><span class="v">${formatDateTime(booking.return_at)}</span></div>
        <div class="detail-field"><span class="k">Duration</span><span class="v">${booking.duration_days} day(s)</span></div>
        <div class="detail-field"><span class="k">Rental Amount</span><span class="v">${formatINR(charges.base_rental || 0)}</span></div>
        <div class="detail-field"><span class="k">KM Limit</span><span class="v">${charges.km_limit_per_day || 0}/day</span></div>
        <div class="detail-field"><span class="k">Extra KM Rate</span><span class="v">₹${charges.extra_km_rate || 0}/km</span></div>
      </div>
      ${booking.notes ? `<p class="field-hint" style="margin-top:10px">Notes: ${booking.notes}</p>` : ''}
      ${booking.cancelled_reason ? `<p class="field-hint" style="margin-top:10px">Cancelled: ${booking.cancelled_reason}</p>` : ''}
    </div>

    <div class="detail-section">
      <div class="detail-section-title">
        <span>Payments</span>
        ${open ? '<button class="btn btn-outline btn-sm" id="detailAddPaymentBtn">+ Add Payment</button>' : ''}
      </div>
      ${paymentRows}
      <div class="detail-grid" style="margin-top:12px">
        <div class="detail-field"><span class="k">Rental Amount Due</span><span class="v">${formatINR(booking.total)}</span></div>
        <div class="detail-field"><span class="k">Total Paid</span><span class="v">${formatINR(booking.paid)}</span></div>
        <div class="detail-field"><span class="k">Balance</span><span class="v">${formatINR(booking.balance)}</span></div>
        <div class="detail-field"><span class="k">Status</span><span class="v">${booking.payment_status}</span></div>
      </div>
    </div>

    <div class="detail-section">
      <div class="detail-section-title">
        <span>Security Deposit</span>
        ${open && !booking.deposit_received ? '<button class="btn btn-outline btn-sm" id="detailAddDepositBtn">+ Add Deposit</button>' : ''}
      </div>
      ${booking.deposit_received ? `
        <div class="detail-grid">
          <div class="detail-field"><span class="k">Received</span><span class="v">${formatINR(booking.deposit_received)}</span></div>
          <div class="detail-field"><span class="k">Deducted</span><span class="v">${formatINR(booking.deposit_deducted || 0)}</span></div>
          <div class="detail-field"><span class="k">Refunded</span><span class="v">${formatINR(booking.deposit_refunded)}</span></div>
          <div class="detail-field"><span class="k">Still Held</span><span class="v">${formatINR(booking.deposit_held)}</span></div>
        </div>
        <p class="field-hint">Tracked separately — never counted as rental revenue.</p>
        ${booking.deposit_held > 0 ? '<button class="btn btn-outline btn-sm" id="detailRefundBtn">Refund Deposit</button>' : ''}
      ` : '<p class="detail-empty">No security deposit recorded yet.</p>'}
      ${booking.refunds.length ? `
        <p class="modal-section-label">Refunds</p>
        ${booking.refunds.map((r) => `
          <div class="payment-row">
            <span>${formatDate(r.refunded_on)} · ${r.method}${r.reason ? ` · ${r.reason}` : ''}
              ${r.deduction > 0 ? `· deduction ${formatINR(r.deduction)}` : ''}</span>
            <span class="amount">${formatINR(r.refund_amount)}</span>
          </div>`).join('')}
      ` : ''}
    </div>

    <div class="detail-section">
      <div class="detail-section-title">
        <span>Vehicle Pickup</span>
        ${open && !booking.pickup ? '<button class="btn btn-outline btn-sm" id="detailPickupBtn">Record Pickup</button>' : ''}
      </div>
      ${booking.pickup ? `
        <div class="detail-grid">
          <div class="detail-field"><span class="k">Date &amp; Time</span><span class="v">${formatDateTime(booking.pickup.recorded_at)}</span></div>
          <div class="detail-field"><span class="k">Starting KM</span><span class="v">${Number(booking.pickup.odometer_km).toLocaleString('en-IN')}</span></div>
          <div class="detail-field"><span class="k">Fuel Level</span><span class="v">${booking.pickup.fuel_level || '—'}</span></div>
          <div class="detail-field"><span class="k">Condition</span><span class="v">${booking.pickup.condition_note || '—'}</span></div>
        </div>
        ${open ? `<button class="btn btn-ghost btn-sm correct-km" data-id="${booking.pickup.id}" data-current="${booking.pickup.odometer_km}">Correct reading</button>` : ''}
      ` : '<p class="detail-empty">Not recorded yet.</p>'}
    </div>

    <div class="detail-section">
      <div class="detail-section-title">
        <span>Vehicle Return</span>
        ${open && booking.pickup && !booking.return ? '<button class="btn btn-outline btn-sm" id="detailReturnBtn">Record Return</button>' : ''}
      </div>
      ${booking.return ? `
        <div class="detail-grid">
          <div class="detail-field"><span class="k">Date &amp; Time</span><span class="v">${formatDateTime(booking.return.recorded_at)}</span></div>
          <div class="detail-field"><span class="k">Ending KM</span><span class="v">${Number(booking.return.odometer_km).toLocaleString('en-IN')}</span></div>
          <div class="detail-field"><span class="k">Fuel Level</span><span class="v">${booking.return.fuel_level || '—'}</span></div>
          <div class="detail-field"><span class="k">Condition</span><span class="v">${booking.return.condition_note || '—'}</span></div>
        </div>
        <p class="modal-section-label">Extra KM</p>
        <div class="detail-grid">
          <div class="detail-field"><span class="k">Total KM</span><span class="v">${Number(km.total_km || 0).toLocaleString('en-IN')}</span></div>
          <div class="detail-field"><span class="k">Allowed KM</span><span class="v">${Number(km.allowed_km || 0).toLocaleString('en-IN')}</span></div>
          <div class="detail-field"><span class="k">Extra KM</span><span class="v">${Number(km.extra_km || 0).toLocaleString('en-IN')}</span></div>
          <div class="detail-field"><span class="k">Extra KM Charge</span><span class="v">${formatINR(km.extra_km_charge || 0)}</span></div>
        </div>
        ${open ? `<button class="btn btn-ghost btn-sm correct-km" data-id="${booking.return.id}" data-current="${booking.return.odometer_km}">Correct reading</button>` : ''}
      ` : `<p class="detail-empty">${booking.pickup ? 'Not recorded yet.' : 'Record pickup first.'}</p>`}
    </div>

    <div class="detail-section">
      <div class="detail-section-title"><span>Booking Timeline</span></div>
      ${timelineHTML(booking.timeline)}
    </div>
  `;

  wireDetailActions(booking);
}

function wireDetailActions(booking) {
  const on = (id, handler) => document.getElementById(id)?.addEventListener('click', handler);

  on('detailEditBtn', () => { closeBookingDetail(); openBookingModal(booking); });

  on('detailCancelBtn', async () => {
    const reason = prompt('Why is this booking being cancelled?');
    if (reason === null) return;
    if (!reason.trim()) { alert('A reason is required to cancel a booking.'); return; }
    try {
      const result = await api.bookings.cancel(booking.id, reason.trim());
      if (result.warning) alert(result.warning);
      await refreshAfterBookingChange();
    } catch (err) { showError(err); }
  });

  on('detailCompleteBtn', async () => {
    if (!confirm('Mark this booking as completed?')) return;
    try {
      const result = await api.bookings.complete(booking.id);
      if (result.warning) alert(result.warning);
      await refreshAfterBookingChange();
    } catch (err) { showError(err); }
  });

  on('detailAddPaymentBtn', () => openPaymentModal(booking.id));
  on('detailAddDepositBtn', () => openDepositModal(booking.id, booking));
  on('detailRefundBtn',    () => openRefundModal(booking.id, booking));
  on('detailPickupBtn',    () => openPickupModal(booking.id, booking));
  on('detailReturnBtn',    () => openReturnModal(booking.id, booking));

  document.querySelectorAll('.void-payment').forEach((btn) => {
    btn.addEventListener('click', async () => {
      const reason = prompt('Why is this payment being voided?');
      if (reason === null) return;
      if (!reason.trim()) { alert('A reason is required to void a payment.'); return; }
      try {
        await api.payments.void(Number(btn.dataset.id), reason.trim());
        await refreshAfterBookingChange();
      } catch (err) { showError(err); }
    });
  });

  document.querySelectorAll('.correct-km').forEach((btn) => {
    btn.addEventListener('click', async () => {
      const current = btn.dataset.current;
      const corrected = prompt(`Corrected odometer reading (currently ${current}):`, current);
      if (corrected === null) return;
      const reason = prompt('Why is this reading being corrected?');
      if (reason === null) return;
      if (!reason.trim()) { alert('A reason is required to correct a reading.'); return; }
      try {
        const result = await api.km.correct({
          id: Number(btn.dataset.id),
          odometer_km: Number(corrected),
          reason: reason.trim(),
        });
        alert(`Reading corrected by ${result.difference} km. The original reading is kept on the record.`);
        await refreshAfterBookingChange();
      } catch (err) { showError(err); }
    });
  });
}

function todayStr() {
  return new Date().toISOString().split('T')[0];
}

function nowTimeStr() {
  return new Date().toTimeString().slice(0, 5);
}

// ---- Payment modal ----
const paymentModalOverlay = document.getElementById('paymentModalOverlay');

function openPaymentModal(bookingId) {
  document.getElementById('paymentForm').reset();
  document.getElementById('paymentBookingId').value = bookingId;
  document.getElementById('paymentDate').value = todayStr();
  paymentModalOverlay.hidden = false;
}
document.getElementById('paymentModalCancel').addEventListener('click', () => { paymentModalOverlay.hidden = true; });
paymentModalOverlay.addEventListener('click', (e) => { if (e.target === paymentModalOverlay) paymentModalOverlay.hidden = true; });

document.getElementById('paymentForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const btn = e.target.querySelector('button[type="submit"]');
  btn.disabled = true;
  try {
    await api.payments.add({
      booking_id: Number(document.getElementById('paymentBookingId').value),
      kind: document.getElementById('paymentType').value,
      amount: document.getElementById('paymentAmount').value,
      paid_on: document.getElementById('paymentDate').value,
      method: document.getElementById('paymentMethod').value,
      reference: document.getElementById('paymentReference').value.trim(),
      notes: document.getElementById('paymentNotes').value.trim(),
    });
    paymentModalOverlay.hidden = true;
    await refreshAfterBookingChange();
  } catch (err) { showError(err); } finally { btn.disabled = false; }
});

// ---- Security deposit modal ----
const depositModalOverlay = document.getElementById('depositModalOverlay');

function openDepositModal(bookingId, booking) {
  document.getElementById('depositForm').reset();
  document.getElementById('depositBookingId').value = bookingId;
  document.getElementById('depositDate').value = todayStr();
  // Pre-fill with the deposit this booking agreed, not today's rate card.
  if (booking && booking.charges) {
    document.getElementById('depositAmount').value = booking.charges.deposit_required || '';
  }
  depositModalOverlay.hidden = false;
}
document.getElementById('depositModalCancel').addEventListener('click', () => { depositModalOverlay.hidden = true; });
depositModalOverlay.addEventListener('click', (e) => { if (e.target === depositModalOverlay) depositModalOverlay.hidden = true; });

document.getElementById('depositForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const btn = e.target.querySelector('button[type="submit"]');
  btn.disabled = true;
  try {
    await api.payments.deposit({
      booking_id: Number(document.getElementById('depositBookingId').value),
      amount: document.getElementById('depositAmount').value,
      received_on: document.getElementById('depositDate').value,
      method: document.getElementById('depositMethod').value,
      reference: document.getElementById('depositReference').value.trim(),
      notes: document.getElementById('depositNotes').value.trim(),
    });
    depositModalOverlay.hidden = true;
    await refreshAfterBookingChange();
  } catch (err) { showError(err); } finally { btn.disabled = false; }
});

// ---- Deposit refund modal ----
const refundModalOverlay = document.getElementById('refundModalOverlay');
let refundHeldAmount = 0;

function updateRefundPreview() {
  const deduction = Number(document.getElementById('refundDeduction').value) || 0;
  document.getElementById('refundAmountPreview').textContent =
    formatINR(Math.max(0, refundHeldAmount - deduction));
}

function openRefundModal(bookingId, booking) {
  document.getElementById('refundForm').reset();
  document.getElementById('refundBookingId').value = bookingId;
  document.getElementById('refundDate').value = todayStr();
  document.getElementById('refundDeduction').value = 0;
  refundHeldAmount = booking ? Number(booking.deposit_held) : 0;
  document.getElementById('refundOriginalDeposit').textContent = formatINR(refundHeldAmount);
  updateRefundPreview();
  refundModalOverlay.hidden = false;
}
document.getElementById('refundModalCancel').addEventListener('click', () => { refundModalOverlay.hidden = true; });
refundModalOverlay.addEventListener('click', (e) => { if (e.target === refundModalOverlay) refundModalOverlay.hidden = true; });
document.getElementById('refundDeduction').addEventListener('input', updateRefundPreview);

document.getElementById('refundForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const btn = e.target.querySelector('button[type="submit"]');
  btn.disabled = true;
  try {
    const result = await api.payments.refund({
      booking_id: Number(document.getElementById('refundBookingId').value),
      deduction: document.getElementById('refundDeduction').value || '0',
      deduction_reason: document.getElementById('refundReason').value.trim(),
      refunded_on: document.getElementById('refundDate').value,
      method: document.getElementById('refundMethod').value,
      reference: document.getElementById('refundReference').value.trim(),
      notes: document.getElementById('refundNotes').value.trim(),
    });
    refundModalOverlay.hidden = true;
    alert(`Refunded ${formatINR(result.refund_amount)}.`);
    await refreshAfterBookingChange();
  } catch (err) { showError(err); } finally { btn.disabled = false; }
});

// ---- Pickup modal ----
const pickupModalOverlay = document.getElementById('pickupModalOverlay');

function openPickupModal(bookingId, booking) {
  document.getElementById('pickupForm').reset();
  document.getElementById('pickupBookingId').value = bookingId;
  document.getElementById('pickupDateField').value = todayStr();
  document.getElementById('pickupTimeField').value = nowTimeStr();
  const car = booking ? loadCars().find((c) => c.id === booking.vehicle_id) : null;
  if (car) document.getElementById('pickupStartKm').value = car.currentKm;
  pickupModalOverlay.hidden = false;
}
document.getElementById('pickupModalCancel').addEventListener('click', () => { pickupModalOverlay.hidden = true; });
pickupModalOverlay.addEventListener('click', (e) => { if (e.target === pickupModalOverlay) pickupModalOverlay.hidden = true; });

document.getElementById('pickupForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const btn = e.target.querySelector('button[type="submit"]');
  btn.disabled = true;
  try {
    await api.km.pickup({
      booking_id: Number(document.getElementById('pickupBookingId').value),
      odometer_km: document.getElementById('pickupStartKm').value,
      recorded_at: `${document.getElementById('pickupDateField').value} ${document.getElementById('pickupTimeField').value}`,
      fuel_level: document.getElementById('pickupFuelLevel').value,
      condition_note: document.getElementById('pickupCondition').value.trim(),
      notes: document.getElementById('pickupNotes').value.trim(),
    });
    pickupModalOverlay.hidden = true;
    await refreshAfterBookingChange();
  } catch (err) { showError(err); } finally { btn.disabled = false; }
});

// ---- Return modal ----
const returnModalOverlay = document.getElementById('returnModalOverlay');
let returnPickupKm = 0;
let returnKmLimit = 0;
let returnExtraRate = 0;
let returnDays = 1;

function updateReturnKmPreview() {
  const endKm = Number(document.getElementById('returnEndKm').value) || 0;
  const totalKm = Math.max(0, endKm - returnPickupKm);
  const allowed = returnKmLimit * returnDays;
  const extra = Math.max(0, totalKm - allowed);
  document.getElementById('returnKmPreview').textContent =
    `Total KM: ${totalKm.toLocaleString('en-IN')} · Allowed: ${allowed.toLocaleString('en-IN')} · `
    + `Extra: ${extra.toLocaleString('en-IN')} km (${formatINR(extra * returnExtraRate)})`;
}

function openReturnModal(bookingId, booking) {
  document.getElementById('returnForm').reset();
  document.getElementById('returnBookingId').value = bookingId;
  document.getElementById('returnDateField').value = todayStr();
  document.getElementById('returnTimeField').value = nowTimeStr();
  document.getElementById('returnKmPreview').textContent = '';
  returnPickupKm = booking && booking.pickup ? Number(booking.pickup.odometer_km) : 0;
  returnKmLimit = booking && booking.charges ? Number(booking.charges.km_limit_per_day) : 0;
  returnExtraRate = booking && booking.charges ? Number(booking.charges.extra_km_rate) : 0;
  returnDays = booking ? Number(booking.duration_days) : 1;
  returnModalOverlay.hidden = false;
}
document.getElementById('returnModalCancel').addEventListener('click', () => { returnModalOverlay.hidden = true; });
returnModalOverlay.addEventListener('click', (e) => { if (e.target === returnModalOverlay) returnModalOverlay.hidden = true; });
document.getElementById('returnEndKm').addEventListener('input', updateReturnKmPreview);

document.getElementById('returnForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const btn = e.target.querySelector('button[type="submit"]');
  btn.disabled = true;
  try {
    await api.km.return({
      booking_id: Number(document.getElementById('returnBookingId').value),
      odometer_km: document.getElementById('returnEndKm').value,
      recorded_at: `${document.getElementById('returnDateField').value} ${document.getElementById('returnTimeField').value}`,
      fuel_level: document.getElementById('returnFuelLevel').value,
      condition_note: document.getElementById('returnCondition').value.trim(),
      notes: document.getElementById('returnNotes').value.trim(),
    });
    returnModalOverlay.hidden = true;
    await refreshAfterBookingChange();
  } catch (err) { showError(err); } finally { btn.disabled = false; }
});

// ---- Dashboard: Rental Overview (point 9) ----
function renderRentalOverview() {
  const grid = document.getElementById('rentalStatGrid');
  if (!grid) return;

  const bookings = loadBookings().filter((b) => b.status !== 'Cancelled');
  const today = todayStr();

  const todaysBookings = bookings.filter((b) => b.start_at === today).length;
  const activeRentals = bookings.filter((b) => b.status === 'Active').length;
  const upcomingBookings = bookings.filter((b) => b.status === 'Confirmed' && b.start_at >= today).length;

  // Rental Revenue and Extra KM Revenue are kept separate (rule 15) —
  // neither is summed twice, and Net Revenue derives from these plus expenses.
  const rentalRevenue = bookings.reduce((sum, b) => sum + b.total, 0);
  const advanceReceived = bookings.reduce((sum, b) => sum + (b.paid || 0), 0);
  const pendingBalance = bookings.reduce((sum, b) => sum + Math.max(0, b.balance), 0);
  const depositHeld = bookings.reduce((sum, b) => sum + (b.deposit_held || 0), 0);
  const depositRefunded = bookings.reduce((sum, b) => sum + (b.deposit_refunded || 0), 0);
  const returnedBookings = bookings.filter((b) => b.total_km > 0);
  const extraKmRevenue = returnedBookings.reduce((sum, b) => sum + b.extra_km_charge, 0);
  const totalKm = returnedBookings.reduce((sum, b) => sum + b.total_km, 0);
  const totalExpenses = Number(FINANCE_SUMMARY?.expenses.total) || 0;
  const netRevenue = rentalRevenue + extraKmRevenue - totalExpenses;

  document.getElementById('statTodayBookings').textContent = todaysBookings;
  document.getElementById('statActiveRentals').textContent = activeRentals;
  document.getElementById('statUpcomingBookings').textContent = upcomingBookings;
  document.getElementById('statRentalRevenue').textContent = formatINR(rentalRevenue);
  document.getElementById('statAdvanceReceived').textContent = formatINR(advanceReceived);
  document.getElementById('statPendingBalance').textContent = formatINR(pendingBalance);
  document.getElementById('statDepositHeld').textContent = formatINR(depositHeld);
  document.getElementById('statDepositRefunded').textContent = formatINR(depositRefunded);
  document.getElementById('statExtraKmRevenue').textContent = formatINR(extraKmRevenue);
  document.getElementById('statTotalKm').textContent = totalKm.toLocaleString('en-IN');
  document.getElementById('statTotalExpenses').textContent = formatINR(totalExpenses);
  document.getElementById('statNetRevenue').textContent = formatINR(netRevenue);

  const activeUpcoming = bookings
    .filter((b) => b.status === 'Active' || (b.status === 'Confirmed' && b.start_at >= today))
    .sort((a, b) => a.start_at.localeCompare(b.start_at))
    .slice(0, 8);

  const wrap = document.getElementById('activeUpcomingBookings');
  wrap.innerHTML = activeUpcoming.length
    ? activeUpcoming.map((b) => `
      <div class="booking-card" data-id="${b.id}">
        <div class="booking-card-main">
          <span class="booking-card-number">${b.booking_number}</span>
          <span class="booking-card-customer">${b.customer_name}</span>
          <span class="booking-card-meta">${vehicleLabel(b.vehicle_id)} · ${formatDate(b.start_at)} → ${formatDate(b.return_at)}</span>
        </div>
        <span class="status-stack">
          <span class="status-badge status-badge-${b.status}">${b.status}</span>
          ${scheduleChipHTML(b)}
        </span>
      </div>`).join('')
    : '<div class="empty-state">No active or upcoming rentals.</div>';
  wrap.querySelectorAll('.booking-card').forEach((card) => {
    card.addEventListener('click', () => openBookingDetail(Number(card.dataset.id)));
  });
}

// ==========================================================================
// Reports
// ==========================================================================

let currentReportType = 'booking';
let currentReportData = { title: 'Booking Report', headers: [], rows: [] };

function firstDayOfMonthStr() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`;
}

function currentMonthStr() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

document.querySelectorAll('.report-tab').forEach((tab) => {
  tab.addEventListener('click', () => {
    document.querySelectorAll('.report-tab').forEach((t) => t.classList.remove('is-on'));
    tab.classList.add('is-on');
    currentReportType = tab.dataset.report;
    renderReportFilters();
    renderReport();
  });
});

function vehicleOptionsHTML(includeAll) {
  const cars = loadCars();
  const all = includeAll ? '<option value="">All Vehicles</option>' : '';
  return all + cars.map((c) => `<option value="${c.id}">${c.name}</option>`).join('');
}

function renderReportFilters() {
  const el = document.getElementById('reportFilters');
  if (currentReportType === 'booking') {
    el.innerHTML = `
      <div class="field-group"><label for="rfFrom">From</label><input type="date" id="rfFrom" value="${firstDayOfMonthStr()}" /></div>
      <div class="field-group"><label for="rfTo">To</label><input type="date" id="rfTo" value="${todayStr()}" /></div>
      <div class="field-group"><label for="rfVehicle">Vehicle</label><select id="rfVehicle">${vehicleOptionsHTML(true)}</select></div>
      <div class="field-group"><label for="rfStatus">Status</label>
        <select id="rfStatus"><option value="">All Statuses</option>${BOOKING_STATUSES.map((s) => `<option>${s}</option>`).join('')}</select>
      </div>`;
  } else if (currentReportType === 'revenue') {
    el.innerHTML = `
      <div class="field-group"><label for="rfFrom">From</label><input type="date" id="rfFrom" value="${firstDayOfMonthStr()}" /></div>
      <div class="field-group"><label for="rfTo">To</label><input type="date" id="rfTo" value="${todayStr()}" /></div>`;
  } else if (currentReportType === 'vehicle') {
    el.innerHTML = `
      <div class="field-group"><label for="rfMonth">Month</label><input type="month" id="rfMonth" value="${currentMonthStr()}" /></div>
      <div class="field-group"><label for="rfVehicle">Vehicle</label><select id="rfVehicle">${vehicleOptionsHTML(false)}</select></div>`;
  } else if (currentReportType === 'km') {
    el.innerHTML = `
      <div class="field-group"><label for="rfFrom">From</label><input type="date" id="rfFrom" value="${firstDayOfMonthStr()}" /></div>
      <div class="field-group"><label for="rfTo">To</label><input type="date" id="rfTo" value="${todayStr()}" /></div>
      <div class="field-group"><label for="rfVehicle">Vehicle</label><select id="rfVehicle">${vehicleOptionsHTML(true)}</select></div>`;
  } else if (currentReportType === 'deposit') {
    el.innerHTML = `
      <div class="field-group"><label for="rfFrom">From</label><input type="date" id="rfFrom" value="${firstDayOfMonthStr()}" /></div>
      <div class="field-group"><label for="rfTo">To</label><input type="date" id="rfTo" value="${todayStr()}" /></div>`;
  } else if (currentReportType === 'payment') {
    el.innerHTML = `
      <div class="field-group"><label for="rfFrom">From</label><input type="date" id="rfFrom" value="${firstDayOfMonthStr()}" /></div>
      <div class="field-group"><label for="rfTo">To</label><input type="date" id="rfTo" value="${todayStr()}" /></div>
      <div class="field-group"><label for="rfType">Payment Type</label>
        <select id="rfType"><option value="">All Types</option>${PAYMENT_TYPES.map((t) => `<option value="${t}">${PAYMENT_TYPE_LABELS[t]}</option>`).join('')}</select>
      </div>`;
  }
  el.querySelectorAll('input, select').forEach((input) => input.addEventListener('change', renderReport));
}

function computeBookingReport() {
  const from = document.getElementById('rfFrom')?.value || '';
  const to = document.getElementById('rfTo')?.value || '';
  const vehicleId = document.getElementById('rfVehicle')?.value || '';
  const status = document.getElementById('rfStatus')?.value || '';

  const rows = loadBookings()
    .filter((b) => (!from || b.start_at >= from) && (!to || b.start_at <= to))
    .filter((b) => !vehicleId || b.vehicle_id === Number(vehicleId))
    .filter((b) => !status || b.status === status)
    .map((b) => [
      b.booking_number, b.customer_name, vehicleLabel(b.vehicle_id), formatDate(b.start_at),
      formatDate(b.return_at), b.duration_days, b.status, b.total, b.balance,
    ]);

  return {
    title: 'Booking Report',
    headers: ['Booking #', 'Customer', 'Vehicle', 'Start', 'Return', 'Days', 'Status', 'Rental Amount (₹)', 'Balance (₹)'],
    rows,
  };
}

function computeRevenueReport() {
  const from = document.getElementById('rfFrom')?.value || '';
  const to = document.getElementById('rfTo')?.value || '';

  const bookings = loadBookings().filter((b) => b.status !== 'Cancelled' && (!from || b.start_at >= from) && (!to || b.start_at <= to));
  const rentalRevenue = bookings.reduce((sum, b) => sum + b.total, 0);
  const extraKmRevenue = bookings.filter((b) => b.total_km > 0).reduce((sum, b) => sum + b.extra_km_charge, 0);
  const expenses = Number(REPORT_SUMMARY?.expenses.total) || 0;
  const netRevenue = rentalRevenue + extraKmRevenue - expenses;

  return {
    title: 'Revenue Report',
    headers: ['Metric', 'Amount (₹)'],
    rows: [
      ['Rental Revenue', rentalRevenue],
      ['Extra KM Revenue', extraKmRevenue],
      ['Expenses', expenses],
      ['Net Revenue', netRevenue],
    ],
  };
}

function computeVehicleReport() {
  const month = document.getElementById('rfMonth')?.value || currentMonthStr();
  const vehicleId = Number(document.getElementById('rfVehicle')?.value);
  if (!vehicleId) return { title: 'Vehicle Report', headers: ['Metric', 'Value'], rows: [] };

  const bookings = loadBookings().filter((b) => b.vehicle_id === vehicleId && b.start_at.startsWith(month));
  const nonCancelled = bookings.filter((b) => b.status !== 'Cancelled');
  const completed = bookings.filter((b) => b.status === 'Completed');
  const returned = nonCancelled.filter((b) => b.total_km > 0);

  const totalDays = nonCancelled.reduce((sum, b) => sum + b.duration_days, 0);
  const rentalRevenue = nonCancelled.reduce((sum, b) => sum + b.total, 0);
  const advanceReceived = nonCancelled.reduce((sum, b) => sum + (b.paid || 0), 0);
  const balanceReceived = 0;
  const totalKm = returned.reduce((sum, b) => sum + b.total_km, 0);
  const allowedKm = returned.reduce((sum, b) => sum + b.allowed_km, 0);
  const extraKm = returned.reduce((sum, b) => sum + b.extra_km, 0);
  const extraKmRevenue = returned.reduce((sum, b) => sum + b.extra_km_charge, 0);
  const depositsReceived = nonCancelled.reduce((sum, b) => sum + (b.deposit_received || 0), 0);
  const depositsRefunded = nonCancelled.reduce((sum, b) => sum + (b.deposit_refunded || 0), 0);
  const expenses = Number(
    (REPORT_SUMMARY?.expenses.by_vehicle || []).find((v) => v.vehicle_id === vehicleId)?.total
  ) || 0;
  const netRevenue = rentalRevenue + extraKmRevenue - expenses;

  return {
    title: `Vehicle Report — ${vehicleLabel(vehicleId)} — ${month}`,
    headers: ['Metric', 'Value'],
    rows: [
      ['Total Bookings', nonCancelled.length],
      ['Completed Bookings', completed.length],
      ['Total Rental Days', totalDays],
      ['Rental Revenue (₹)', rentalRevenue],
      ['Advance Received (₹)', advanceReceived],
      ['Balance Received (₹)', balanceReceived],
      ['Total KM', totalKm],
      ['Allowed KM', allowedKm],
      ['Extra KM', extraKm],
      ['Extra KM Revenue (₹)', extraKmRevenue],
      ['Security Deposits Received (₹)', depositsReceived],
      ['Security Deposits Refunded (₹)', depositsRefunded],
      ['Expenses (₹)', expenses],
      ['Net Revenue (₹)', netRevenue],
    ],
  };
}

function computeKmReport() {
  const from = document.getElementById('rfFrom')?.value || '';
  const to = document.getElementById('rfTo')?.value || '';
  const vehicleId = document.getElementById('rfVehicle')?.value || '';

  const rows = loadBookings()
    .filter((b) => b.total_km > 0)
    .filter((b) => (!from || b.return.date >= from) && (!to || b.return.date <= to))
    .filter((b) => !vehicleId || b.vehicle_id === Number(vehicleId))
    .map((b) => {
      const { totalKm, allowedKm, extraKm, extraKmCharge } = computeExtraKmForBooking(b);
      return [b.booking_number, vehicleLabel(b.vehicle_id), formatDate(b.return.date), totalKm, allowedKm, extraKm, extraKmCharge];
    });

  return {
    title: 'KM Report',
    headers: ['Booking #', 'Vehicle', 'Return Date', 'Total KM', 'Allowed KM', 'Extra KM', 'Extra KM Charge (₹)'],
    rows,
  };
}

function computeDepositReport() {
  const from = document.getElementById('rfFrom')?.value || '';
  const to = document.getElementById('rfTo')?.value || '';

  const bookings = loadBookings().filter((b) => b.status !== 'Cancelled' && (!from || b.start_at >= from) && (!to || b.start_at <= to));
  const received = bookings.reduce((sum, b) => sum + (b.securityDeposit ? b.securityDeposit.amount : 0), 0);
  const refunded = bookings.reduce((sum, b) => sum + (b.deposit_refunded || 0), 0);
  const held = bookings.reduce((sum, b) => sum + (b.deposit_held || 0), 0);
  const pending = bookings
    .filter((b) => !b.securityDeposit && (b.status === 'Confirmed' || b.status === 'Active'))
    .reduce((sum, b) => sum + (loadCars().find((c) => c.id === b.vehicle_id)?.securityDeposit || 0), 0);

  return {
    title: 'Deposit Report',
    headers: ['Metric', 'Amount (₹)'],
    rows: [
      ['Deposit Received', received],
      ['Deposit Held', held],
      ['Deposit Refunded', refunded],
      ['Pending Deposit (not yet collected)', pending],
    ],
  };
}

function computePaymentReport() {
  const from = document.getElementById('rfFrom')?.value || '';
  const to = document.getElementById('rfTo')?.value || '';
  const type = document.getElementById('rfType')?.value || '';

  const rows = [];
  loadBookings().forEach((b) => {
    (b.payments || [])
      .filter((p) => (!from || p.date >= from) && (!to || p.date <= to))
      .filter((p) => !type || p.type === type)
      .forEach((p) => {
        rows.push([b.booking_number, b.customer_name, PAYMENT_TYPE_LABELS[p.type], p.amount, formatDate(p.date), p.method, p.reference || '—']);
      });
  });
  rows.sort((a, b) => (a[4] < b[4] ? 1 : -1));

  return {
    title: 'Payment Report',
    headers: ['Booking #', 'Customer', 'Type', 'Amount (₹)', 'Date', 'Method', 'Reference'],
    rows,
  };
}

/**
 * Expense totals for the range the current report covers. Taken from the
 * summary endpoint, which sums in SQL, rather than by adding up fetched rows —
 * a list can be capped, and a financial report that quietly leaves rows out is
 * worse than one that fails.
 */
let REPORT_SUMMARY = null;

function reportRange() {
  if (currentReportType === 'vehicle') {
    const month = document.getElementById('rfMonth')?.value || currentMonthStr();
    const [y, m] = month.split('-').map(Number);
    return { from: `${month}-01`, to: new Date(y, m, 0).toISOString().slice(0, 10) };
  }
  // An unfiltered report means everything, so the range has to be stated —
  // left empty, the server would answer for this month alone.
  return {
    from: document.getElementById('rfFrom')?.value || '2000-01-01',
    to: document.getElementById('rfTo')?.value || '2100-12-31',
  };
}

async function renderReport() {
  try {
    REPORT_SUMMARY = await api.expenses.summary(reportRange());
  } catch {
    REPORT_SUMMARY = null;
  }

  const computers = {
    booking: computeBookingReport,
    revenue: computeRevenueReport,
    vehicle: computeVehicleReport,
    km: computeKmReport,
    deposit: computeDepositReport,
    payment: computePaymentReport,
  };
  const compute = computers[currentReportType];
  if (!compute) return;
  currentReportData = compute();

  const resultsEl = document.getElementById('reportResults');
  if (!resultsEl) return;

  if (!currentReportData.rows.length) {
    resultsEl.innerHTML = '<div class="empty-state">No data for the selected filters.</div>';
    return;
  }

  const isNumericCol = (colIndex) => currentReportData.rows.every((r) => typeof r[colIndex] === 'number');
  const numericCols = currentReportData.headers.map((_, i) => isNumericCol(i));
  const totals = currentReportData.headers.map((_, i) =>
    numericCols[i] ? currentReportData.rows.reduce((sum, r) => sum + r[i], 0) : (i === 0 ? 'Total' : '')
  );
  const showTotals = currentReportData.headers.length > 2 && numericCols.some(Boolean);

  resultsEl.innerHTML = `
    <table class="report-table">
      <thead><tr>${currentReportData.headers.map((h) => `<th>${h}</th>`).join('')}</tr></thead>
      <tbody>${currentReportData.rows.map((r) => `<tr>${r.map((c, i) => `<td>${numericCols[i] && typeof c === 'number' ? formatINR(c).replace('₹', '') : c}</td>`).join('')}</tr>`).join('')}</tbody>
      ${showTotals ? `<tfoot><tr>${totals.map((t) => `<td>${typeof t === 'number' ? formatINR(t).replace('₹', '') : t}</td>`).join('')}</tr></tfoot>` : ''}
    </table>`;
}

// ---- Export ----
function exportCsv() {
  const { headers, rows, title } = currentReportData;
  if (!rows.length) return;
  const escape = (v) => `"${String(v).replace(/"/g, '""')}"`;
  const csv = [headers.map(escape).join(','), ...rows.map((r) => r.map(escape).join(','))].join('\r\n');
  downloadBlob(csv, `${title.replace(/[^a-z0-9]+/gi, '-')}.csv`, 'text/csv;charset=utf-8;');
}

// Excel opens an HTML table saved with an .xls extension directly — no
// external library needed.
function exportExcel() {
  const { headers, rows, title } = currentReportData;
  if (!rows.length) return;
  const html = `<table><tr>${headers.map((h) => `<th>${h}</th>`).join('')}</tr>${rows.map((r) => `<tr>${r.map((c) => `<td>${c}</td>`).join('')}</tr>`).join('')}</table>`;
  downloadBlob(html, `${title.replace(/[^a-z0-9]+/gi, '-')}.xls`, 'application/vnd.ms-excel');
}

function downloadBlob(content, filename, mime) {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

document.getElementById('exportCsvBtn').addEventListener('click', exportCsv);
document.getElementById('exportExcelBtn').addEventListener('click', exportExcel);
document.getElementById('exportPdfBtn').addEventListener('click', () => window.print());

renderReportFilters();
