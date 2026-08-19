// Shared car-listing store used by both index.html (public site) and admin.html.
// Persists to localStorage so admin edits show up on the public grid in this
// same browser. NOTE: this is client-side only — a real deployment needs a
// backend (PHP/MySQL on Hostinger, or similar) for edits to be visible to
// other visitors. See README for details.

const CAR_STORE_KEY = 'nitesha_cars_v1';
const INQUIRY_STORE_KEY = 'nitesha_inquiries_v1';

// Vehicle statuses used across admin (Vehicles tab, Bookings, Reports).
const VEHICLE_STATUSES = ['Available', 'Booked', 'On Rental', 'Maintenance', 'Inactive'];

const DEFAULT_CARS = [
  { id: 1, brand: 'Suzuki', name: 'Fronx — Brand New 2026', fuel: 'Petrol', transmission: 'Manual', seats: 5, year: 2026, price: 3500, icon: '🚗',
    regNumber: 'KA05AB1234', price7: 22000, price15: 42000, price30: 78000, kmLimitPerDay: 200, extraKmRate: 10, securityDeposit: 5000, currentKm: 4200, status: 'Available' },
  { id: 2, brand: 'Kia', name: 'Carens — 7 Seater', fuel: 'Diesel', transmission: 'Manual', seats: 7, year: 2026, price: 4500, icon: '🚙',
    regNumber: 'KA05AB2345', price7: 28000, price15: 54000, price30: 100000, kmLimitPerDay: 200, extraKmRate: 12, securityDeposit: 7000, currentKm: 3100, status: 'Available' },
  { id: 3, brand: 'Suzuki', name: 'Swift — Automatic', fuel: 'Petrol', transmission: 'Automatic', seats: 5, year: 2025, price: 3000, icon: '🚕',
    regNumber: 'KA05AB3456', price7: 19000, price15: 36000, price30: 66000, kmLimitPerDay: 200, extraKmRate: 10, securityDeposit: 5000, currentKm: 8900, status: 'Available' },
  { id: 4, brand: 'Suzuki', name: 'Wagon R — AT 2025', fuel: 'Petrol', transmission: 'Automatic', seats: 5, year: 2025, price: 2500, icon: '🚗',
    regNumber: 'KA05AB4567', price7: 16000, price15: 30000, price30: 55000, kmLimitPerDay: 200, extraKmRate: 8, securityDeposit: 4000, currentKm: 12400, status: 'Available' },
  { id: 5, brand: 'Kia', name: 'Seltos — GT Line', fuel: 'Petrol', transmission: 'Automatic', seats: 5, year: 2021, price: 4000, icon: '🚙',
    regNumber: 'KA05AB5678', price7: 25000, price15: 48000, price30: 88000, kmLimitPerDay: 200, extraKmRate: 12, securityDeposit: 6000, currentKm: 31200, status: 'Available' },
  { id: 6, brand: 'Suzuki', name: 'Alto K10 — 2025', fuel: 'Petrol', transmission: 'Manual', seats: 5, year: 2025, price: 2000, icon: '🚗',
    regNumber: 'KA05AB6789', price7: 13000, price15: 24000, price30: 44000, kmLimitPerDay: 200, extraKmRate: 8, securityDeposit: 3000, currentKm: 6700, status: 'Available' },
];

// Fills in defaults for vehicle fields added after a browser's localStorage
// data was first created, so older saved records don't break new UI/calcs.
function normalizeCar(car) {
  return {
    regNumber: '',
    price7: 0,
    price15: 0,
    price30: 0,
    kmLimitPerDay: 200,
    extraKmRate: 0,
    securityDeposit: 0,
    currentKm: 0,
    status: 'Available',
    ...car,
  };
}

function loadCars() {
  try {
    const raw = localStorage.getItem(CAR_STORE_KEY);
    if (!raw) return DEFAULT_CARS.slice();
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) && parsed.length ? parsed.map(normalizeCar) : DEFAULT_CARS.slice();
  } catch {
    return DEFAULT_CARS.slice();
  }
}

function saveCars(cars) {
  localStorage.setItem(CAR_STORE_KEY, JSON.stringify(cars));
}

function nextCarId(cars) {
  return cars.reduce((max, c) => Math.max(max, c.id), 0) + 1;
}

function loadInquiries() {
  try {
    const raw = localStorage.getItem(INQUIRY_STORE_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function saveInquiry(inquiry) {
  const inquiries = loadInquiries();
  inquiries.unshift({ ...inquiry, id: Date.now(), receivedAt: new Date().toISOString() });
  localStorage.setItem(INQUIRY_STORE_KEY, JSON.stringify(inquiries));
}

// ---- Public-site rendering ----
function carCardHTML(car) {
  return `
    <article class="car-card" data-car-id="${car.id}">
      <div class="car-img-box">
        <span class="badge badge-brand">${car.brand}</span>
        <span class="badge badge-fuel">${car.fuel}</span>
        <div class="car-illustration">${car.icon}</div>
      </div>
      <div class="car-body">
        <h3 class="car-name">${car.name}</h3>
        <div class="car-meta">
          <span>⚙ ${car.transmission}</span>
          <span>👤 ${car.seats} Seats</span>
          <span>📅 ${car.year}</span>
        </div>
        <div class="car-footer">
          <div><span class="price">₹${car.price.toLocaleString('en-IN')}</span><span class="per">/day</span></div>
          <a href="#contact" class="btn btn-primary btn-sm">Book Now</a>
        </div>
      </div>
    </article>`;
}

function renderCarGrid() {
  const grid = document.getElementById('carGrid');
  if (!grid) return;
  const cars = loadCars().filter((c) => c.status === 'Available');
  grid.innerHTML = cars.length
    ? cars.map(carCardHTML).join('')
    : '<p style="color:#98a2b3">No cars currently available — check back soon.</p>';
}
