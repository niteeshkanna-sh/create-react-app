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
  void renderAlerts();
}

document.addEventListener('DOMContentLoaded', boot);

/**
 * The bin, for every delete in the panel.
 *
 * One drawing rather than the word "Delete" in some places, an "x" in others
 * and "Void" in a third: a row of buttons is scanned by shape long before it is
 * read. Every use pairs it with a title and an aria-label, because an icon on
 * its own is a button a screen reader announces as nothing at all.
 */
const BIN_ICON =
  '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor"' +
  ' stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' +
  '<path d="M4 7h16"/><path d="M10 11v6"/><path d="M14 11v6"/>' +
  '<path d="M6 7l1 13a1 1 0 0 0 1 1h8a1 1 0 0 0 1-1l1-13"/>' +
  '<path d="M9 7V5a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/></svg>';

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
      ${car.ownership === 'partner' ? `
        <div class="meta">
          <span class="owner-badge">${car.isTemporary ? 'Temporary' : "Someone else's"}</span>
          <span>${car.ownerName ? escapeHTML(car.ownerName) : 'Owner not named'}</span>
          ${car.ownerPhone ? `<span>${escapeHTML(car.ownerPhone)}</span>` : ''}
        </div>` : ''}
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
        <button class="btn btn-ghost btn-sm service-car-btn">Service</button>
        <button class="btn btn-danger btn-sm btn-icon delete-car-btn" title="Retire this vehicle" aria-label="Retire this vehicle">${BIN_ICON}</button>
      </div>
    </div>
  `).join('');

  wrap.querySelectorAll('.service-car-btn').forEach((btn) => {
    btn.addEventListener('click', (e) => {
      const id = Number(e.target.closest('.car-admin-card').dataset.id);
      openServiceModal(loadCars().find((c) => c.id === id));
    });
  });
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
  document.getElementById('carOwnership').value = car ? (car.ownership || 'own') : 'own';
  document.getElementById('carOwnerName').value = car ? (car.ownerName || '') : '';
  document.getElementById('carOwnerPhone').value = car ? (car.ownerPhone || '') : '';
  document.getElementById('carTemporary').checked = Boolean(car && car.isTemporary);
  for (const [id, key] of UPKEEP_FIELDS) {
    document.getElementById(id).value = car ? (car[key] ?? '') : '';
  }
  syncOwnerFields();
  document.getElementById('carPrice').value = car ? car.price : '';
  document.getElementById('carPriceMax').value = car ? car.priceMax : '';
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

/**
 * The owner fields belong to a partner car and nothing else.
 *
 * Left on screen for our own cars they are three boxes that do nothing, and a
 * box that does nothing is one somebody eventually fills in.
 */
// The papers, the service markers and the tracker. One list, because these are
// nine plain fields that all travel the same way and nine hand-written lines
// each way is eighteen chances to forget one.
const UPKEEP_FIELDS = [
  ['carPurchaseDate', 'purchase_date'],
  ['carInsuranceExpiry', 'insurance_expiry'],
  ['carPollutionExpiry', 'pollution_expiry'],
  ['carFitnessExpiry', 'fitness_expiry'],
  ['carServiceDueKm', 'service_due_km'],
  ['carServiceDueOn', 'service_due_on'],
  ['carGpsProvider', 'gps_provider'],
  ['carGpsDeviceId', 'gps_device_id'],
  ['carGpsUrl', 'gps_url'],
];

function syncOwnerFields() {
  const partner = document.getElementById('carOwnership').value === 'partner';
  for (const el of document.querySelectorAll('[data-partner-only]')) el.hidden = !partner;
  if (!partner) {
    document.getElementById('carOwnerName').value = '';
    document.getElementById('carOwnerPhone').value = '';
    document.getElementById('carTemporary').checked = false;
  }
}
document.getElementById('carOwnership').addEventListener('change', syncOwnerFields);

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
    ownership: document.getElementById('carOwnership').value,
    ownerName: document.getElementById('carOwnerName').value.trim(),
    ownerPhone: document.getElementById('carOwnerPhone').value.trim(),
    isTemporary: document.getElementById('carTemporary').checked,
    ...Object.fromEntries(UPKEEP_FIELDS.map(([id, key]) => [key, document.getElementById(id).value])),
    price: Number(document.getElementById('carPrice').value),
    priceMax: document.getElementById('carPriceMax').value.trim() === ''
      ? ''
      : Number(document.getElementById('carPriceMax').value),
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
          <button class="btn btn-danger btn-sm btn-icon" id="enqDelete" title="Delete this enquiry" aria-label="Delete this enquiry">${BIN_ICON}</button>
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

  document.getElementById('enqDelete')?.addEventListener('click', async () => {
    // Named in the question. "Delete this?" with the thing off-screen is how
    // the wrong row gets deleted.
    if (!confirm(`Delete enquiry ${e.enquiry_number} from ${e.name}? This cannot be undone.`)) return;
    try {
      await api.enquiries.remove(e.id);
      enquiryModalOverlay.hidden = true;
      currentEnquiry = null;
      await renderInquiries();
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

/**
 * A balance, which can be owed to us or back to the customer.
 *
 * "₹-3,458" is arithmetic, not an answer. The minus sign is easy to miss on a
 * phone, and someone reading it quickly sees a number the customer still owes
 * when in fact they are owed it back. Said in words instead, in the direction
 * the money actually has to travel.
 */
function formatBalance(amount) {
  const value = Number(amount) || 0;
  if (value < 0) return `${formatINR(-value)} to return`;
  if (value === 0) return `${formatINR(0)} — settled`;
  return `${formatINR(value)} due`;
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
          <span class="amount">${formatBalance(b.balance)}</span>
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
  historyFor = '';
  document.getElementById('customerHistory')?.remove();
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
    document.getElementById('bkWhatsapp').value = booking.whatsapp || '';
    document.getElementById('bkLicenceExpiry').value = booking.licence_expiry || '';
    document.getElementById('bkIdNumber').value = booking.id_number || '';
    document.getElementById('bkCustomerType').value = booking.customer_type || 'New';
    document.getElementById('bkEstimatedKm').value = booking.estimated_km ?? '';
    document.getElementById('bkStartDate').value = sd;
    document.getElementById('bkStartTime').value = st;
    document.getElementById('bkReturnDate').value = rd;
    document.getElementById('bkReturnTime').value = rt;
    document.getElementById('bkRentalAmount').value = booking.charges ? booking.charges.base_rental : '';
    document.getElementById('bkKmLimit').value = booking.charges ? booking.charges.km_limit_per_day : 200;
    document.getElementById('bkExtraKmRate').value = booking.charges ? booking.charges.extra_km_rate : 0;
    document.getElementById('bkNotes').value = booking.notes || '';
    document.getElementById('bkVehicleReg').value = booking.vehicle_reg || '';
    document.getElementById('bkCommission').value =
      booking.charges && booking.charges.commission ? booking.charges.commission : '';
    document.getElementById('bkDiscount').value =
      booking.charges && booking.charges.discount ? booking.charges.discount : '';
    document.getElementById('bkOtherCharges').value =
      booking.charges && booking.charges.other_charges ? booking.charges.other_charges : '';
    document.getElementById('bkReferral').value = booking.referral_source || '';
    document.getElementById('bkBalanceDue').value = booking.balance_due_on || '';
  } else {
    document.getElementById('bkStartTime').value = '10:00';
    document.getElementById('bkReturnTime').value = '10:00';
    bookingVehicleSelect.dispatchEvent(new Event('change'));
  }

  updateBookingDurationPreview();
  syncCommissionField();
  updateFinalPrice();
  bookingModalOverlay.hidden = false;
}

/**
 * The commission box belongs to somebody else's car and nothing else.
 *
 * On our own cars the whole rental is ours, so there is nothing to split and
 * an empty box inviting a number would put one there -- and a commission on
 * our own car would quietly shrink the revenue this booking reports.
 */
/**
 * The rate card amount, less the discount, plus anything else.
 *
 * Shown while the form is open rather than only after saving, because a
 * discount typed into a box with no visible effect is a discount somebody
 * enters twice.
 */
function updateFinalPrice() {
  const n = (id) => Number(document.getElementById(id).value) || 0;
  const final = n('bkRentalAmount') + n('bkOtherCharges') - n('bkDiscount');
  const el = document.getElementById('bkFinalPrice');
  if (el) el.textContent = formatINR(Math.max(0, final));
}

for (const id of ['bkRentalAmount', 'bkDiscount', 'bkOtherCharges']) {
  document.getElementById(id)?.addEventListener('input', updateFinalPrice);
}

function syncCommissionField() {
  const car = loadCars().find((c) => c.id === Number(bookingVehicleSelect.value));
  const partner = Boolean(car && car.ownership === 'partner');
  const row = document.getElementById('bkCommissionRow');
  row.hidden = !partner;
  if (!partner) {
    document.getElementById('bkCommission').value = '';
    return;
  }
  document.getElementById('bkCommissionHint').textContent = car.ownerName
    ? `The rest of the rental goes to ${car.ownerName}.`
    : "The rest of the rental goes to the car's owner.";
}
bookingVehicleSelect.addEventListener('change', syncCommissionField);

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
    whatsapp: document.getElementById('bkWhatsapp').value.trim(),
    licence_expiry: document.getElementById('bkLicenceExpiry').value,
    id_number: document.getElementById('bkIdNumber').value.trim(),
    customer_type: document.getElementById('bkCustomerType').value,
    estimated_km: document.getElementById('bkEstimatedKm').value,
    vehicle_id: Number(bookingVehicleSelect.value),
    start_at: startAt,
    return_at: returnAt,
    base_rental: document.getElementById('bkRentalAmount').value,
    km_limit_per_day: document.getElementById('bkKmLimit').value,
    extra_km_rate: document.getElementById('bkExtraKmRate').value,
    // Empty on our own cars, which the endpoint reads as no commission.
    commission: document.getElementById('bkCommissionRow').hidden
      ? '' : document.getElementById('bkCommission').value,
    discount: document.getElementById('bkDiscount').value || '0',
    other_charges: document.getElementById('bkOtherCharges').value || '0',
    referral_source: document.getElementById('bkReferral').value,
    balance_due_on: document.getElementById('bkBalanceDue').value,
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
          ${booking.status === 'Cancelled' ? '<button class="btn btn-danger btn-sm" id="detailDeleteBtn">Delete Booking</button>' : ''}
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
        <div class="detail-field"><span class="k">Agreed Rental</span><span class="v">${formatINR(charges.base_rental || 0)}</span></div>
        <div class="detail-field"><span class="k">KM Limit</span><span class="v">${charges.km_limit_per_day || 0}/day</span></div>
        <div class="detail-field"><span class="k">Extra KM Rate</span><span class="v">₹${charges.extra_km_rate || 0}/km</span></div>
      </div>
      ${booking.notes ? `<p class="field-hint" style="margin-top:10px">Notes: ${booking.notes}</p>` : ''}
      ${booking.cancelled_reason ? `<p class="field-hint" style="margin-top:10px">
        Cancelled${booking.cancelled_at ? ' ' + formatDateTime(booking.cancelled_at) : ''}${
          booking.cancelled_by ? ` · ${booking.cancelled_by === 'customer' ? "the customer's decision" : 'our decision'}` : ''
        } — ${escapeHTML(booking.cancelled_reason)}</p>` : ''}
      ${booking.referral_source ? `<p class="field-hint" style="margin-top:6px">Found us through: ${escapeHTML(booking.referral_source.replace(/_/g, ' '))}</p>` : ''}
    </div>

    <div class="detail-section">
      <div class="detail-section-title">
        <span>Payments</span>
        ${open ? '<button class="btn btn-outline btn-sm" id="detailAddPaymentBtn">+ Add Payment</button>' : ''}
      </div>
      ${paymentRows}
      <div class="detail-grid" style="margin-top:12px">
        <div class="detail-field"><span class="k">Rental Amount</span><span class="v">${formatINR(charges.base_rental || 0)}</span></div>
        ${Number(booking.extra_km_charge) ? `
          <div class="detail-field"><span class="k">Extra KM (${Number(booking.extra_km || 0).toLocaleString('en-IN')} km)</span><span class="v">+ ${formatINR(booking.extra_km_charge)}</span></div>` : ''}
        ${Number(charges.other_charges) ? `
          <div class="detail-field"><span class="k">Other Charges</span><span class="v">+ ${formatINR(charges.other_charges)}</span></div>` : ''}
        ${(booking.extras || []).map((x) => `
          <div class="detail-field"><span class="k">${escapeHTML(x.label)}${x.note ? ' — ' + escapeHTML(x.note) : ''}</span><span class="v">+ ${formatINR(x.amount)}</span></div>`).join('')}
        ${Number(charges.discount) ? `
          <div class="detail-field"><span class="k">Discount</span><span class="v">- ${formatINR(charges.discount)}</span></div>` : ''}
        <div class="detail-field"><span class="k">Rental Amount Due</span><span class="v">${formatINR(booking.total)}</span></div>
        <div class="detail-field"><span class="k">Total Paid</span><span class="v">${formatINR(booking.paid)}</span></div>
        <div class="detail-field"><span class="k">Balance</span><span class="v">${formatBalance(booking.balance)}</span></div>
        <div class="detail-field"><span class="k">Status</span><span class="v">${booking.payment_status}</span></div>
        ${booking.balance_due_on && booking.balance > 0 ? `
          <div class="detail-field"><span class="k">Balance Due By</span><span class="v">${formatDate(booking.balance_due_on)}</span></div>` : ''}
      </div>
      ${attachmentsHTML(booking.files, 'payment', 'Payment screenshots')}
    </div>

    ${booking.ownership === 'partner' ? `
    <div class="detail-section">
      <div class="detail-section-title"><span>Commission</span></div>
      <p class="detail-empty" style="margin-bottom:10px">
        ${booking.owner_name ? escapeHTML(booking.owner_name) + "'s car" : "Somebody else's car"},
        hired out through us.
      </p>
      <div class="detail-grid">
        <div class="detail-field"><span class="k">Customer Pays</span><span class="v">${formatINR(booking.total)}</span></div>
        <div class="detail-field"><span class="k">Your Commission</span><span class="v">${formatINR(booking.commission)}</span></div>
        <div class="detail-field"><span class="k">Payable to Owner</span><span class="v">${formatINR(booking.owner_payout)}</span></div>
      </div>
    </div>` : ''}

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
      ${attachmentsHTML(booking.files, 'deposit', 'Deposit proof')}
      ${attachmentsHTML(booking.files, 'refund', 'Refund proof')}
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
        ${checklistHTML(booking.pickup.checklist)}
        ${open ? `<button class="btn btn-ghost btn-sm correct-km" data-id="${booking.pickup.id}" data-current="${booking.pickup.odometer_km}">Correct reading</button>` : ''}
      ` : '<p class="detail-empty">Not recorded yet.</p>'}
      ${attachmentsHTML(booking.files, 'pickup', 'Pickup photos')}
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
        ${checklistHTML(booking.return.checklist)}
        ${open ? `<button class="btn btn-ghost btn-sm correct-km" data-id="${booking.return.id}" data-current="${booking.return.odometer_km}">Correct reading</button>` : ''}
      ` : `<p class="detail-empty">${booking.pickup ? 'Not recorded yet.' : 'Record pickup first.'}</p>`}
      ${attachmentsHTML(booking.files, 'return', 'Return photos')}
    </div>

    <div class="detail-section">
      <div class="detail-section-title">
        <span>Customer Documents</span>
        <button class="btn btn-outline btn-sm" id="detailAddDocBtn">+ Add Document</button>
      </div>
      ${documentsHTML(booking.documents)}
    </div>

    ${(booking.damages || []).length ? `
    <div class="detail-section">
      <div class="detail-section-title"><span>Damage</span></div>
      ${booking.damages.map((d) => `
        <div class="payment-row">
          <span class="payment-meta">${escapeHTML(d.description)}
            <span class="payment-note">noticed at ${d.noticed_at}${d.note ? ' · ' + escapeHTML(d.note) : ''}</span>
          </span>
          <span class="amount">${formatINR(d.estimated_cost)}</span>
          ${open ? `<button class="btn btn-ghost btn-sm void-damage" data-id="${d.id}">Remove</button>` : ''}
        </div>`).join('')}
      ${attachmentsHTML(booking.files, 'damage', 'Damage photos')}
    </div>` : ''}

    <div class="detail-section">
      <div class="detail-section-title"><span>Booking Timeline</span></div>
      ${timelineHTML(booking.timeline)}
    </div>
  `;

  wireDetailActions(booking);
}

function wireDetailActions(booking) {
  const on = (id, handler) => document.getElementById(id)?.addEventListener('click', handler);

  // Removing an attachment. Delegated from the panel rather than bound per
  // thumbnail, because the list is re-rendered after every change and
  // per-element listeners would be re-bound each time or left behind.
  document.querySelectorAll('.proof-remove').forEach((btn) => {
    btn.addEventListener('click', async () => {
      if (!confirm('Remove this file? It cannot be brought back.')) return;
      try {
        await api.bookingFiles.remove(Number(btn.dataset.fileId));
        await refreshAfterBookingChange();
      } catch (err) { showError(err); }
    });
  });

  on('detailEditBtn', () => { closeBookingDetail(); openBookingModal(booking); });

  on('detailCancelBtn', async () => {
    const reason = prompt('Why is this booking being cancelled?');
    if (reason === null) return;
    if (!reason.trim()) { alert('A reason is required to cancel a booking.'); return; }

    // Whose decision it was decides whether a fee is fair, and it is the one
    // thing nobody remembers a month later.
    const by = confirm(
      'Was this the customer\u2019s decision?\n\nOK — the customer cancelled.\nCancel — we cancelled it.',
    ) ? 'customer' : 'admin';

    const fee = prompt('Cancellation fee to keep, if any (₹). Leave blank for none.', '') || '';
    if (fee !== '' && !(Number(fee) >= 0)) { alert('That is not an amount.'); return; }

    try {
      const result = await api.bookings.cancel(booking.id, reason.trim(), by, fee);
      if (result.warning) alert(result.warning);
      await refreshAfterBookingChange();
    } catch (err) { showError(err); }
  });

  // Adding a document. A hidden input rather than a modal: one file, one
  // kind, and a dialog around that is more clicks than the job needs.
  on('detailAddDocBtn', () => {
    if (!booking.customer_id) { alert('This booking has no customer record yet.'); return; }
    const kind = prompt(
      'Which document?\n\n' + DOCUMENT_KINDS.map(([k, l]) => `${k} — ${l}`).join('\n'),
      'licence',
    );
    if (kind === null) return;
    if (!DOCUMENT_KINDS.some(([k]) => k === kind.trim())) {
      alert('That is not one of the documents this keeps.');
      return;
    }

    const expiry = kind.trim() === 'licence'
      ? (prompt('Licence expiry date (YYYY-MM-DD). Leave blank if you do not have it.', '') || '')
      : '';

    const picker = document.createElement('input');
    picker.type = 'file';
    picker.accept = 'image/jpeg,image/png,image/webp,image/avif,application/pdf';
    picker.addEventListener('change', async () => {
      if (!picker.files || picker.files.length === 0) return;
      try {
        await api.customerFiles.add(booking.customer_id, kind.trim(), picker.files[0], expiry.trim());
        await renderBookingDetail(booking.id);
      } catch (err) { showError(err); }
    });
    picker.click();
  });

  document.querySelectorAll('.remove-doc').forEach((btn) => {
    btn.addEventListener('click', async () => {
      if (!confirm('Remove this document? It cannot be brought back.')) return;
      try {
        await api.customerFiles.remove(Number(btn.dataset.id));
        await renderBookingDetail(booking.id);
      } catch (err) { showError(err); }
    });
  });

  document.querySelectorAll('.void-damage').forEach((btn) => {
    btn.addEventListener('click', async () => {
      if (!confirm('Remove this damage record? Any charge raised for it stays — void that separately.')) return;
      try {
        await api.extras.voidDamage(Number(btn.dataset.id));
        await refreshAfterBookingChange();
      } catch (err) { showError(err); }
    });
  });

  on('detailDeleteBtn', async () => {
    if (!confirm(
      `Delete ${booking.booking_number} for good?\n\n` +
      'Cancelling already keeps the record and the reason. This removes the booking, '
      + 'its charges, its readings and its attachments, and cannot be undone. '
      + 'The audit trail keeps a note that it existed and who removed it.'
    )) return;
    try {
      await api.bookings.remove(booking.id);
      closeBookingDetail();
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

// ---- Customer documents ----
//
// A licence is commonly a PDF, which has no thumbnail to show, so these are a
// list of rows rather than the strip of pictures the booking attachments use.
// The row says what it is, whether it has expired, and gives a link that
// opens it.
const DOCUMENT_KINDS = [
  ['licence', 'Driving licence'],
  ['id', 'Aadhaar / ID'],
  ['passport', 'Passport'],
  ['other', 'Other document'],
];

function documentsHTML(documents) {
  const held = documents || [];
  if (held.length === 0) {
    return '<p class="detail-empty">No documents on file for this customer yet.</p>';
  }

  const today = todayStr();
  return `
    <div class="doc-list">
      ${held.map((d) => {
        const expired = d.expires_on && d.expires_on < today;
        return `
        <div class="doc-row">
          <span class="doc-kind">${escapeHTML(d.label)}</span>
          <span class="doc-meta">${d.is_pdf ? 'PDF' : 'Image'}${d.caption ? ' · ' + escapeHTML(d.caption) : ''}</span>
          ${d.expires_on ? `<span class="doc-meta ${expired ? 'doc-expired' : ''}">
              ${expired ? 'Expired' : 'Expires'} ${formatDate(d.expires_on)}</span>` : ''}
          <span class="doc-actions">
            <a class="btn btn-ghost btn-sm" href="${d.url}" target="_blank" rel="noopener">Open</a>
            <button class="btn btn-ghost btn-sm remove-doc" data-id="${d.id}">Remove</button>
          </span>
        </div>`;
      }).join('')}
    </div>`;
}

// ---- The handover checklist ----
//
// Read out of the boxes rather than kept in a variable, so what is sent is
// exactly what is on screen. Unticked is sent as false rather than omitted:
// "not checked" and "checked and wrong" are different things, and only the
// first is what a blank means here.
function readChecklist(prefix) {
  const out = {};
  for (const box of document.querySelectorAll(`#${prefix}Checklist [data-check]`)) {
    out[box.dataset.check] = box.checked;
  }
  return out;
}

function clearChecklist(prefix) {
  for (const box of document.querySelectorAll(`#${prefix}Checklist [data-check]`)) {
    box.checked = false;
  }
}

/** The checklist as it was recorded, for the booking detail. */
function checklistHTML(checklist) {
  if (!checklist || typeof checklist !== 'object') return '';
  const items = Object.entries(checklist);
  if (items.length === 0) return '';

  const label = (key) => {
    const box = document.querySelector(`[data-check="${key}"]`);
    return box ? box.parentElement.textContent.trim() : key;
  };
  const checked = items.filter(([, v]) => v);

  return `
    <p class="modal-section-label">Checked at handover (${checked.length} of ${items.length})</p>
    <div class="check-grid">
      ${items.map(([key, value]) => `
        <span class="check-item" style="cursor:default">
          <span aria-hidden="true">${value ? '\u2713' : '\u2014'}</span>
          ${escapeHTML(label(key))}
        </span>`).join('')}
    </div>`;
}

// ---- One box that finds anything ----
//
// Debounced, because a search per keystroke over four tables is four queries
// a letter. 250ms is long enough that a whole word is usually one request and
// short enough that nobody notices waiting.
const SEARCH_KINDS = { booking: 'Booking', vehicle: 'Vehicle', customer: 'Customer' };
let searchTimer = null;

function closeSearch() {
  const box = document.getElementById('searchResults');
  if (box) { box.hidden = true; box.innerHTML = ''; }
}

async function runSearch(query) {
  const box = document.getElementById('searchResults');
  if (!box) return;

  if (query.trim().length < 3) { closeSearch(); return; }

  let hits = [];
  try {
    hits = (await api.search(query)).results || [];
  } catch { closeSearch(); return; }

  box.hidden = false;
  if (hits.length === 0) {
    box.innerHTML = `<p class="search-empty">Nothing matches &ldquo;${escapeHTML(query)}&rdquo;.</p>`;
    return;
  }

  box.innerHTML = hits.map((h) => `
    <button type="button" class="search-hit" data-kind="${h.kind}" data-id="${h.id}">
      <span class="search-kind">${SEARCH_KINDS[h.kind] || h.kind}</span>
      <span class="search-title">${escapeHTML(h.title)}</span>
      <span class="search-sub">${escapeHTML(h.subtitle)}${h.note ? ' · ' + escapeHTML(h.note) : ''}</span>
    </button>`).join('');

  box.querySelectorAll('.search-hit').forEach((btn) => {
    btn.addEventListener('click', () => {
      const id = Number(btn.dataset.id);
      closeSearch();
      document.getElementById('globalSearch').value = '';
      if (btn.dataset.kind === 'booking') {
        openBookingDetail(id);
      } else if (btn.dataset.kind === 'vehicle') {
        const car = loadCars().find((c) => c.id === id);
        if (car) openCarModal(car);
      } else {
        // A customer has no page of its own, so the useful thing is a new
        // booking with their details already looked up -- which is what
        // somebody searching a phone number is almost always about to do.
        openBookingModal(null);
        document.getElementById('bkPhone').value = btn.querySelector('.search-sub').textContent.split(' · ')[0];
        void lookupCustomer();
      }
    });
  });
}

document.getElementById('globalSearch')?.addEventListener('input', (e) => {
  clearTimeout(searchTimer);
  const q = e.target.value;
  searchTimer = setTimeout(() => void runSearch(q), 250);
});
document.getElementById('globalSearch')?.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') { e.target.value = ''; closeSearch(); }
});
// Clicking anywhere else puts the list away. Without this it sits over the
// dashboard until something else happens to close it.
document.addEventListener('click', (e) => {
  if (!e.target.closest('.search-wrap')) closeSearch();
});

// ---- The six things started most often ----
document.querySelectorAll('[data-quick]').forEach((btn) => {
  btn.addEventListener('click', () => {
    switch (btn.dataset.quick) {
      case 'booking':   openBookingModal(null); break;
      case 'vehicle':   openCarModal(null); break;
      case 'expense':   document.getElementById('addExpenseBtn')?.click(); break;
      default:          location.hash = '#' + btn.dataset.quick;
    }
  });
});

// ---- What needs doing today ----
//
// Worked out on the server, because knowing it means looking at every
// booking's money and every vehicle's papers, and doing that in the browser
// would be one request per booking.
//
// The panel hides itself when there is nothing. An empty "Needs attention"
// heading every morning is how people stop reading the one that is not empty.
const ALERT_FLAGS = { overdue: 'Overdue', soon: 'Soon', new: 'New' };

/** The shape of the day: how many go out, how many come back, what is owed. */
function renderTodayOps(today) {
  const panel = document.getElementById('todayOps');
  if (!panel || !today) return;
  panel.hidden = false;

  const set = (id, value) => {
    const el = document.getElementById(id);
    if (el) el.textContent = value;
  };
  set('opsPickups', today.pickups);
  set('opsReturns', today.returns);
  set('opsPayments', today.payments_label ?? '₹0');
  set('opsDeposits', today.deposits_label ?? '₹0');
  set('opsServicing', today.servicing);
  set('opsEnquiries', today.enquiries);
}

async function renderAlerts() {
  const panel = document.getElementById('alertsPanel');
  const list = document.getElementById('alertList');
  if (!panel || !list) return;

  let alerts = [];
  try {
    const answer = await api.alerts.today();
    alerts = answer.alerts || [];
    renderTodayOps(answer.today);
  } catch {
    // Silent on purpose. This is a helper beside the figures, and a red error
    // where the to-do list goes would read as something being broken.
    panel.hidden = true;
    return;
  }

  panel.hidden = alerts.length === 0;
  list.innerHTML = alerts.map((a) => `
    <li class="alert-row is-${a.level}">
      <span class="alert-flag">${ALERT_FLAGS[a.level] || ''}</span>
      <span class="alert-subject">${escapeHTML(a.subject)}</span>
      <span class="alert-message">${escapeHTML(a.message)}</span>
      ${a.booking_id ? `<button class="btn btn-ghost btn-sm alert-go" data-booking="${a.booking_id}">Open</button>` : ''}
      ${a.vehicle_id ? `<button class="btn btn-ghost btn-sm alert-go" data-vehicle="${a.vehicle_id}">Open</button>` : ''}
    </li>`).join('');

  list.querySelectorAll('.alert-go').forEach((btn) => {
    btn.addEventListener('click', () => {
      if (btn.dataset.booking) {
        openBookingDetail(Number(btn.dataset.booking));
      } else if (btn.dataset.vehicle) {
        const car = loadCars().find((c) => c.id === Number(btn.dataset.vehicle));
        if (car) openCarModal(car);
      }
    });
  });
}

// ---- Who this phone number belongs to ----
//
// Asked when the number is finished rather than when the booking is saved.
// Matching on save was already happening, silently and too late: whoever was
// typing had re-keyed the address and the licence, and a different spelling
// quietly kept whichever came first.
let historyFor = '';

async function lookupCustomer() {
  const phoneField = document.getElementById('bkPhone');
  const phone = phoneField.value.replace(/\s+/g, '');
  const note = document.getElementById('customerHistory');

  if (phone === historyFor) return;
  historyFor = phone;

  if (note) note.remove();
  if (phone.length < 6) return;

  let found;
  try {
    found = await api.customers.lookup(phone);
  } catch { return; }
  if (!found.customer) return;

  // Only fills what is empty. Overwriting a name somebody has just corrected
  // would make the lookup something to fight rather than something that helps.
  const fill = (id, value) => {
    const el = document.getElementById(id);
    if (el && !el.value && value) el.value = value;
  };
  const c = found.customer;
  fill('bkCustomerName', c.name);
  fill('bkAddress', c.address);
  fill('bkLicence', c.licence_number);
  fill('bkWhatsapp', c.whatsapp);
  fill('bkLicenceExpiry', c.licence_expiry);
  fill('bkIdNumber', c.id_number);
  if (document.getElementById('bkCustomerType').value === 'New') {
    document.getElementById('bkCustomerType').value =
      c.customer_type === 'Corporate' ? 'Corporate' : 'Returning';
  }

  const panel = document.createElement('div');
  panel.className = 'history-note';
  panel.id = 'customerHistory';
  panel.innerHTML = `
    <strong>${escapeHTML(c.name)}</strong> has hired before
    ${c.documents.length ? ` · ${c.documents.length} document${c.documents.length === 1 ? '' : 's'} on file` : ' · no documents on file'}
    ${found.bookings.length ? `
      <table>
        <tr><th>Booking</th><th>Vehicle</th><th>Days</th><th>Amount</th><th>Status</th></tr>
        ${found.bookings.map((b) => `
          <tr>
            <td>${escapeHTML(b.booking_number)}</td>
            <td>${escapeHTML(b.vehicle_name)}</td>
            <td>${b.duration_days}</td>
            <td>${formatINR(b.total)}</td>
            <td>${escapeHTML(b.status)}${b.balance > 0 ? ` · ${formatINR(b.balance)} due` : ''}</td>
          </tr>`).join('')}
      </table>` : ''}`;
  phoneField.closest('.field-group').appendChild(panel);
}

document.getElementById('bkPhone')?.addEventListener('blur', lookupCustomer);

// ---- Booking attachments ----
//
// The five file boxes -- payment screenshot, deposit proof, refund proof,
// pickup photos, return photos -- have been in these forms since the booking
// screens were built and were wired to nothing at all. Choosing a file and
// pressing Save recorded the payment and threw the file away, with no error,
// which is indistinguishable from the upload having worked.
//
// Three things were missing and all three are here: a preview so you can see
// what you picked, the upload itself, and somewhere on the booking for them to
// appear afterwards.
const ATTACHMENT_BOXES = [
  { input: 'paymentProof', preview: 'paymentProofPreview', kind: 'payment' },
  { input: 'depositProof', preview: 'depositProofPreview', kind: 'deposit' },
  { input: 'refundProof', preview: 'refundProofPreview', kind: 'refund' },
  { input: 'pickupPhotos', preview: 'pickupPhotosPreview', kind: 'pickup' },
  { input: 'returnPhotos', preview: 'returnPhotosPreview', kind: 'return' },
];

// Object URLs held so they can be revoked. A page that creates one per chosen
// file and never releases them keeps every image alive in memory for as long
// as the tab is open, which on a phone is a panel that gets slower all day.
const attachmentPreviewUrls = new Map();

function clearAttachmentPreview(box) {
  const held = attachmentPreviewUrls.get(box.preview) || [];
  for (const url of held) URL.revokeObjectURL(url);
  attachmentPreviewUrls.set(box.preview, []);
  const node = document.getElementById(box.preview);
  if (node) node.innerHTML = '';
}

function resetAttachmentBox(kindOrInput) {
  const box = ATTACHMENT_BOXES.find((b) => b.kind === kindOrInput || b.input === kindOrInput);
  if (!box) return;
  clearAttachmentPreview(box);
  const input = document.getElementById(box.input);
  if (input) input.value = '';
}

for (const box of ATTACHMENT_BOXES) {
  const input = document.getElementById(box.input);
  const preview = document.getElementById(box.preview);
  if (!input || !preview) continue;

  input.addEventListener('change', () => {
    clearAttachmentPreview(box);
    const urls = [];
    for (const file of input.files) {
      const url = URL.createObjectURL(file);
      urls.push(url);
      const img = document.createElement('img');
      img.src = url;
      img.alt = file.name;
      img.title = file.name;
      preview.appendChild(img);
    }
    attachmentPreviewUrls.set(box.preview, urls);
  });
}

/**
 * Sends whatever is in one of those boxes, once the record it belongs to
 * exists.
 *
 * Deliberately after the save rather than with it: a booking_files row points
 * at a booking, and the payment or reading has to be there first. It also
 * means a refused image never costs someone the payment they just entered --
 * the record is already in, and this reports the file problem on its own.
 */
async function uploadAttachments(kind, bookingId, refId = null) {
  const box = ATTACHMENT_BOXES.find((b) => b.kind === kind);
  const input = box ? document.getElementById(box.input) : null;
  if (!input || !input.files || input.files.length === 0) return;

  try {
    const result = await api.bookingFiles.add(bookingId, kind, input.files, refId);
    if (result.warning) alert(result.warning);
  } catch (err) {
    // Said out loud, and said as being about the file only. The thing the
    // person came to do has already been saved.
    alert(`The ${box.kind} record was saved, but the file was not: ${err.message}`);
  } finally {
    resetAttachmentBox(kind);
  }
}

/** The thumbnails for one kind, inside the booking detail screen. */
function attachmentsHTML(files, kind, label) {
  const list = (files && files[kind]) || [];
  if (list.length === 0) return '';

  return `
    <p class="modal-section-label">${label}</p>
    <div class="proof-preview">
      ${list.map((f) => `
        <span class="proof-item">
          <a href="${f.url}" target="_blank" rel="noopener">
            <img src="${f.url}" alt="${escapeHTML(f.caption || label)}" title="${escapeHTML(f.caption || label)}">
          </a>
          <button type="button" class="proof-remove" data-file-id="${f.id}"
                  aria-label="Remove this file" title="Remove">&times;</button>
        </span>
      `).join('')}
    </div>
  `;
}

// ---- Payment modal ----
const paymentModalOverlay = document.getElementById('paymentModalOverlay');

function openPaymentModal(bookingId) {
  resetAttachmentBox('payment');
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
    const bookingId = Number(document.getElementById('paymentBookingId').value);
    const saved = await api.payments.add({
      booking_id: bookingId,
      kind: document.getElementById('paymentType').value,
      amount: document.getElementById('paymentAmount').value,
      paid_on: document.getElementById('paymentDate').value,
      method: document.getElementById('paymentMethod').value,
      reference: document.getElementById('paymentReference').value.trim(),
      notes: document.getElementById('paymentNotes').value.trim(),
    });
    // Tied to the payment it proves rather than to the booking in general, so
    // a booking with four payments does not end up with four screenshots in a
    // heap nobody can match up.
    await uploadAttachments('payment', bookingId, saved.payment_id ?? null);
    paymentModalOverlay.hidden = true;
    await refreshAfterBookingChange();
  } catch (err) { showError(err); } finally { btn.disabled = false; }
});

// ---- Security deposit modal ----
const depositModalOverlay = document.getElementById('depositModalOverlay');

function openDepositModal(bookingId, booking) {
  resetAttachmentBox('deposit');
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
    await uploadAttachments('deposit', Number(document.getElementById('depositBookingId').value));
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
  resetAttachmentBox('refund');
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
    await uploadAttachments('refund', Number(document.getElementById('refundBookingId').value));
    refundModalOverlay.hidden = true;
    alert(`Refunded ${formatINR(result.refund_amount)}.`);
    await refreshAfterBookingChange();
  } catch (err) { showError(err); } finally { btn.disabled = false; }
});

// ---- Vehicle service ----
const serviceModalOverlay = document.getElementById('serviceModalOverlay');

async function openServiceModal(car) {
  document.getElementById('serviceForm').reset();
  document.getElementById('serviceVehicleId').value = car.id;
  document.getElementById('serviceModalTitle').textContent = `Service — ${car.name}`;
  document.getElementById('serviceDate').value = todayStr();
  // Prefilled from what the car has actually done, because that is the number
  // being recorded and retyping it is where a digit goes missing.
  document.getElementById('serviceOdometer').value = car.currentKm || '';
  document.getElementById('serviceHistory').innerHTML = '';
  serviceModalOverlay.hidden = false;

  try {
    const { services } = await api.services.list(car.id);
    document.getElementById('serviceHistory').innerHTML = services.length === 0
      ? '<p class="detail-empty">No services recorded for this car yet.</p>'
      : `<p class="modal-section-label">Previous services</p>
         <div class="doc-list">
           ${services.map((v) => `
             <div class="doc-row">
               <span class="doc-kind">${escapeHTML(v.service_type)}</span>
               <span class="doc-meta">${formatDate(v.serviced_on)}
                 · ${Number(v.odometer_km).toLocaleString('en-IN')} km
                 ${v.garage ? '· ' + escapeHTML(v.garage) : ''}</span>
               <span class="doc-actions">
                 <span class="doc-meta">${formatINR(v.amount)}</span>
                 <button class="btn btn-ghost btn-sm void-service" data-id="${v.id}">Remove</button>
               </span>
             </div>`).join('')}
         </div>`;

    document.querySelectorAll('.void-service').forEach((btn) => {
      btn.addEventListener('click', async () => {
        if (!confirm('Remove this service record?')) return;
        try {
          await api.services.void(Number(btn.dataset.id));
          await openServiceModal(car);
        } catch (err) { showError(err); }
      });
    });
  } catch (err) { showError(err); }
}

document.getElementById('serviceModalCancel').addEventListener('click', () => { serviceModalOverlay.hidden = true; });
serviceModalOverlay.addEventListener('click', (e) => { if (e.target === serviceModalOverlay) serviceModalOverlay.hidden = true; });

document.getElementById('serviceForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const btn = e.target.querySelector('button[type="submit"]');
  btn.disabled = true;
  try {
    await api.services.add({
      vehicle_id: Number(document.getElementById('serviceVehicleId').value),
      serviced_on: document.getElementById('serviceDate').value,
      odometer_km: document.getElementById('serviceOdometer').value || '0',
      service_type: document.getElementById('serviceType').value.trim(),
      amount: document.getElementById('serviceAmount').value || '0',
      garage: document.getElementById('serviceGarage').value.trim(),
      next_service_km: document.getElementById('serviceNextKm').value || '',
      next_service_on: document.getElementById('serviceNextOn').value,
      note: document.getElementById('serviceNote').value.trim(),
    });
    serviceModalOverlay.hidden = true;
    await refreshVehicles();
    renderCarAdminGrid();
    await renderAlerts();
  } catch (err) { showError(err); } finally { btn.disabled = false; }
});

// ---- Pickup modal ----
const pickupModalOverlay = document.getElementById('pickupModalOverlay');

function openPickupModal(bookingId, booking) {
  resetAttachmentBox('pickup');
  clearChecklist('pickup');
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
      checklist: readChecklist('pickup'),
    });
    await uploadAttachments('pickup', Number(document.getElementById('pickupBookingId').value));
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
  resetAttachmentBox('return');
  clearChecklist('return');
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
      checklist: readChecklist('return'),
    });

    // After the reading, not with it: the charges hang off a booking that has
    // been returned, and a refused charge must not cost someone the reading
    // they just took.
    await raiseReturnCharges(Number(document.getElementById('returnBookingId').value));
    await uploadAttachments('return', Number(document.getElementById('returnBookingId').value));
    returnModalOverlay.hidden = true;
    await refreshAfterBookingChange();
  } catch (err) { showError(err); } finally { btn.disabled = false; }
});

/**
 * Turns the boxes on the return form into charges and a damage record.
 *
 * Each on its own line rather than one lump, because a customer does not
 * accept "other charges" and nobody can explain one a month later.
 *
 * Every failure is reported and none of them stops the rest: a rejected
 * cleaning charge should not take the fuel charge down with it, and the return
 * itself is already saved by the time this runs.
 */
async function raiseReturnCharges(bookingId) {
  const lines = [
    ['cleaning', 'returnCleaning', 'Cleaning on return'],
    ['fuel', 'returnFuel', 'Fuel on return'],
    ['late', 'returnLate', 'Late return'],
    ['other', 'returnOther', document.getElementById('returnOtherNote').value.trim()],
  ];

  const problems = [];

  for (const [kind, field, note] of lines) {
    const amount = Number(document.getElementById(field).value) || 0;
    if (amount <= 0) continue;
    if (kind === 'other' && note === '') {
      problems.push('The other charge needs a line saying what it is for, so it was not added.');
      continue;
    }
    try {
      await api.extras.add({ booking_id: bookingId, kind, amount, note });
    } catch (err) { problems.push(`${kind}: ${err.message}`); }
  }

  const damage = document.getElementById('returnDamage').value.trim();
  if (damage !== '') {
    try {
      await api.extras.addDamage({
        booking_id: bookingId,
        description: damage,
        estimated_cost: document.getElementById('returnDamageCost').value || '0',
        noticed_at: 'return',
        // Recording damage and billing for it are separate decisions. Some
        // comes off the deposit, some is absorbed, and assuming the first
        // would make the other two wrong.
        charge_customer: document.getElementById('returnDamageCharge').checked,
      });
    } catch (err) { problems.push(`damage: ${err.message}`); }
  }

  if (problems.length) {
    alert('The return was saved. These did not go through:\n\n' + problems.join('\n'));
  }
}

// ---- Dashboard: Rental Overview (point 9) ----
function renderRentalOverview() {
  const grid = document.getElementById('rentalStatGrid');
  if (!grid) return;

  const bookings = loadBookings().filter((b) => b.status !== 'Cancelled');
  const today = todayStr();

  const todaysBookings = bookings.filter((b) => b.start_at === today).length;
  const activeRentals = bookings.filter((b) => b.status === 'Active').length;
  const upcomingBookings = bookings.filter((b) => b.status === 'Confirmed' && b.start_at >= today).length;

  // Rental Revenue and Extra KM Revenue are kept separate, and until now they
  // were not: b.total already includes the extra-KM charge, and Net Revenue
  // then added extraKmRevenue on top of it. Every booking that ran over its
  // allowance was counted twice for the overage.
  //
  // Two things changed here. The extra KM comes out of the rental figure so
  // the two cards add up rather than overlap. And the sum works from what the
  // business earns rather than what the customer pays: on somebody else's car
  // most of the rental is the owner's, and only the commission is ours.
  const earnedOf = (b) => (typeof b.earned === 'number' ? b.earned : b.total);
  const commissionOf = (b) => (b.ownership === 'partner' ? (b.commission || 0) : 0);
  const extraKmOf = (b) => (b.ownership === 'partner' ? 0 : (b.extra_km_charge || 0));

  const commissionEarned = bookings.reduce((sum, b) => sum + commissionOf(b), 0);
  const ownerPayable = bookings.reduce((sum, b) => sum + (b.owner_payout || 0), 0);
  const rentalRevenue = bookings.reduce((sum, b) => sum + earnedOf(b) - extraKmOf(b), 0);
  const advanceReceived = bookings.reduce((sum, b) => sum + (b.paid || 0), 0);
  const pendingBalance = bookings.reduce((sum, b) => sum + Math.max(0, b.balance), 0);
  const depositHeld = bookings.reduce((sum, b) => sum + (b.deposit_held || 0), 0);
  const depositRefunded = bookings.reduce((sum, b) => sum + (b.deposit_refunded || 0), 0);
  const returnedBookings = bookings.filter((b) => b.total_km > 0);
  const extraKmRevenue = returnedBookings.reduce((sum, b) => sum + extraKmOf(b), 0);
  const totalKm = returnedBookings.reduce((sum, b) => sum + b.total_km, 0);
  const totalExpenses = Number(FINANCE_SUMMARY?.expenses.total) || 0;
  const netRevenue = rentalRevenue + extraKmRevenue - totalExpenses;

  document.getElementById('statTodayBookings').textContent = todaysBookings;
  document.getElementById('statActiveRentals').textContent = activeRentals;
  document.getElementById('statUpcomingBookings').textContent = upcomingBookings;
  document.getElementById('statRentalRevenue').textContent = formatINR(rentalRevenue);
  document.getElementById('statAdvanceReceived').textContent = formatINR(advanceReceived);
  document.getElementById('statPendingBalance').textContent = formatINR(pendingBalance);
  document.getElementById('statCommission').textContent = formatINR(commissionEarned);
  document.getElementById('statOwnerPayable').textContent = formatINR(ownerPayable);
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
  // Same two corrections as the dashboard: the extra KM is already inside
  // b.total, and a brokered hire earns the commission rather than the rental.
  const earnedOf = (b) => (typeof b.earned === 'number' ? b.earned : b.total);
  const extraKmOf = (b) => (b.ownership === 'partner' ? 0 : (b.extra_km_charge || 0));

  const rentalRevenue = bookings.reduce((sum, b) => sum + earnedOf(b) - extraKmOf(b), 0);
  const extraKmRevenue = bookings.filter((b) => b.total_km > 0).reduce((sum, b) => sum + extraKmOf(b), 0);
  const commissionEarned = bookings.reduce(
    (sum, b) => sum + (b.ownership === 'partner' ? (b.commission || 0) : 0), 0);
  const ownerPayable = bookings.reduce((sum, b) => sum + (b.owner_payout || 0), 0);
  const expenses = Number(REPORT_SUMMARY?.expenses.total) || 0;
  const netRevenue = rentalRevenue + extraKmRevenue - expenses;

  return {
    title: 'Revenue Report',
    headers: ['Metric', 'Amount (₹)'],
    rows: [
      ['Rental Revenue', rentalRevenue],
      ['Extra KM Revenue', extraKmRevenue],
      ['of which commission on other owners\u2019 cars', commissionEarned],
      ['Payable to car owners', ownerPayable],
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
