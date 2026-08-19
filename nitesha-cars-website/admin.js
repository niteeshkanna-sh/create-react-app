// Demo-only admin auth: a hardcoded client-side password. This keeps casual
// visitors out of the dashboard link but is NOT real security — anyone who
// views this file's source has the password. Do not treat this as
// production auth; wire up real server-side auth before going live.
const ADMIN_PASSWORD = 'nitesha2026';
const SESSION_KEY = 'nitesha_admin_session';

const loginScreen = document.getElementById('loginScreen');
const dashboard = document.getElementById('dashboard');
const loginForm = document.getElementById('loginForm');
const loginError = document.getElementById('loginError');

function showDashboard() {
  loginScreen.hidden = true;
  dashboard.hidden = false;
  renderOverview();
  renderCarAdminGrid();
  renderInquiries();
  renderFinance();
}

function showLogin() {
  loginScreen.hidden = false;
  dashboard.hidden = true;
}

if (sessionStorage.getItem(SESSION_KEY) === 'true') {
  showDashboard();
}

loginForm.addEventListener('submit', (e) => {
  e.preventDefault();
  const value = document.getElementById('loginPassword').value;
  if (value === ADMIN_PASSWORD) {
    sessionStorage.setItem(SESSION_KEY, 'true');
    loginError.textContent = '';
    loginForm.reset();
    showDashboard();
  } else {
    loginError.textContent = 'Incorrect password. Try again.';
  }
});

document.getElementById('logoutBtn').addEventListener('click', () => {
  sessionStorage.removeItem(SESSION_KEY);
  showLogin();
});

// ---- Tabs ----
const TAB_PANELS = ['dashboard', 'cars', 'inquiries', 'finance'];
document.querySelectorAll('.admin-tab').forEach((tab) => {
  tab.addEventListener('click', () => {
    document.querySelectorAll('.admin-tab').forEach((t) => t.classList.remove('active'));
    tab.classList.add('active');
    const target = tab.dataset.tab;
    TAB_PANELS.forEach((name) => {
      document.getElementById(`panel-${name}`).hidden = target !== name;
    });
    if (target === 'dashboard') renderOverview();
    if (target === 'finance') renderFinance();
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
      <div class="row1">
        <span class="icon">${car.icon}</span>
        <span class="name">${car.name}</span>
      </div>
      <div class="meta">
        <span>${car.brand}</span>
        <span>${car.fuel}</span>
        <span>${car.transmission}</span>
        <span>${car.seats} Seats</span>
        <span>${car.year}</span>
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
    btn.addEventListener('click', (e) => {
      const id = Number(e.target.closest('.car-admin-card').dataset.id);
      const car = loadCars().find((c) => c.id === id);
      if (!confirm(`Delete "${car.name}"? This can't be undone.`)) return;
      saveCars(loadCars().filter((c) => c.id !== id));
      renderCarAdminGrid();
      renderOverview();
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
  carModalTitle.textContent = car ? 'Edit Car' : 'Add Car';
  document.getElementById('carBrand').value = car ? car.brand : '';
  document.getElementById('carIcon').value = car ? car.icon : '🚗';
  document.getElementById('carName').value = car ? car.name : '';
  document.getElementById('carFuel').value = car ? car.fuel : 'Petrol';
  document.getElementById('carTransmission').value = car ? car.transmission : 'Manual';
  document.getElementById('carSeats').value = car ? car.seats : 5;
  document.getElementById('carYear').value = car ? car.year : new Date().getFullYear();
  document.getElementById('carPrice').value = car ? car.price : '';
  carModalOverlay.hidden = false;
}

function closeCarModal() {
  carModalOverlay.hidden = true;
}

document.getElementById('addCarBtn').addEventListener('click', () => openCarModal(null));
document.getElementById('carModalCancel').addEventListener('click', closeCarModal);
carModalOverlay.addEventListener('click', (e) => {
  if (e.target === carModalOverlay) closeCarModal();
});

carForm.addEventListener('submit', (e) => {
  e.preventDefault();
  const cars = loadCars();
  const idValue = document.getElementById('carId').value;

  const carData = {
    brand: document.getElementById('carBrand').value.trim(),
    icon: document.getElementById('carIcon').value.trim() || '🚗',
    name: document.getElementById('carName').value.trim(),
    fuel: document.getElementById('carFuel').value,
    transmission: document.getElementById('carTransmission').value,
    seats: Number(document.getElementById('carSeats').value),
    year: Number(document.getElementById('carYear').value),
    price: Number(document.getElementById('carPrice').value),
  };

  if (idValue) {
    const id = Number(idValue);
    const idx = cars.findIndex((c) => c.id === id);
    if (idx !== -1) cars[idx] = { ...cars[idx], ...carData };
  } else {
    cars.push({ id: nextCarId(cars), ...carData });
  }

  saveCars(cars);
  closeCarModal();
  renderCarAdminGrid();
  renderOverview();
});

// ---- Inquiries ----
function renderInquiries() {
  const wrap = document.getElementById('inquiriesWrap');
  const countBadge = document.getElementById('inquiryCount');
  const inquiries = loadInquiries();

  countBadge.textContent = inquiries.length || '';

  if (!inquiries.length) {
    wrap.innerHTML = '<div class="empty-state">No booking inquiries yet. Submissions from the public site\'s contact form will show up here.</div>';
    return;
  }

  wrap.innerHTML = inquiries.map((inq) => `
    <div class="inquiry-card">
      <div class="inquiry-info">
        <span class="inquiry-name">${inq.name || '(no name)'}</span>
        <span class="inquiry-detail">${inq.phone || '—'} · ${inq.city || '—'}</span>
      </div>
      <span class="inquiry-time">${new Date(inq.receivedAt).toLocaleString()}</span>
    </div>
  `).join('');
}

document.getElementById('clearInquiriesBtn').addEventListener('click', () => {
  if (!confirm('Clear all booking inquiries? This can\'t be undone.')) return;
  localStorage.removeItem(INQUIRY_STORE_KEY);
  renderInquiries();
  renderOverview();
});

// ---- Finance ----
const FINANCE_STORE_KEY = 'nitesha_finance_v1';

function loadTransactions() {
  try {
    const raw = localStorage.getItem(FINANCE_STORE_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function saveTransaction(txn) {
  const transactions = loadTransactions();
  transactions.unshift({ ...txn, id: Date.now(), recordedAt: new Date().toISOString() });
  localStorage.setItem(FINANCE_STORE_KEY, JSON.stringify(transactions));
}

function deleteTransaction(id) {
  localStorage.setItem(FINANCE_STORE_KEY, JSON.stringify(loadTransactions().filter((t) => t.id !== id)));
}

function financeTotals() {
  const transactions = loadTransactions();
  const income = transactions.filter((t) => t.type === 'income').reduce((sum, t) => sum + t.amount, 0);
  const expense = transactions.filter((t) => t.type === 'expense').reduce((sum, t) => sum + t.amount, 0);
  return { income, expense, balance: income - expense };
}

function formatINR(amount) {
  return `₹${amount.toLocaleString('en-IN')}`;
}

function transactionCardHTML(txn) {
  const sign = txn.type === 'income' ? '+' : '−';
  return `
    <div class="transaction-card" data-id="${txn.id}">
      <div class="transaction-info">
        <span class="transaction-category">${txn.category}</span>
        <span class="transaction-note">${txn.note || 'No note'}</span>
        <span class="transaction-time">${new Date(txn.recordedAt).toLocaleString()}</span>
      </div>
      <div class="transaction-right">
        <span class="transaction-amount ${txn.type}">${sign} ${formatINR(txn.amount)}</span>
        <button class="transaction-delete" aria-label="Delete entry" title="Delete entry">✕</button>
      </div>
    </div>`;
}

function renderFinance() {
  const wrap = document.getElementById('transactionsWrap');
  if (!wrap) return;
  const transactions = loadTransactions();
  const { income, expense, balance } = financeTotals();

  document.getElementById('financeIncome').textContent = formatINR(income);
  document.getElementById('financeExpense').textContent = formatINR(expense);
  document.getElementById('financeBalance').textContent = formatINR(balance);

  if (!transactions.length) {
    wrap.innerHTML = '<div class="empty-state">No entries yet. Log a booking payment or an expense above.</div>';
    return;
  }

  wrap.innerHTML = transactions.map(transactionCardHTML).join('');
  wrap.querySelectorAll('.transaction-delete').forEach((btn) => {
    btn.addEventListener('click', (e) => {
      const id = Number(e.target.closest('.transaction-card').dataset.id);
      deleteTransaction(id);
      renderFinance();
      renderOverview();
    });
  });
}

document.getElementById('financeForm').addEventListener('submit', (e) => {
  e.preventDefault();
  saveTransaction({
    type: document.getElementById('txnType').value,
    category: document.getElementById('txnCategory').value,
    amount: Number(document.getElementById('txnAmount').value),
    note: document.getElementById('txnNote').value.trim(),
  });
  e.target.reset();
  renderFinance();
  renderOverview();
});

// ---- Dashboard overview ----
function renderOverview() {
  const carCountEl = document.getElementById('statCarCount');
  if (!carCountEl) return;

  const cars = loadCars();
  const inquiries = loadInquiries();
  const { income, expense, balance } = financeTotals();

  carCountEl.textContent = cars.length;
  document.getElementById('statInquiryCount').textContent = inquiries.length;
  document.getElementById('statIncome').textContent = formatINR(income);
  document.getElementById('statExpense').textContent = formatINR(expense);
  document.getElementById('statBalance').textContent = formatINR(balance);

  const recentInquiries = document.getElementById('recentInquiries');
  recentInquiries.innerHTML = inquiries.length
    ? inquiries.slice(0, 5).map((inq) => `
      <div class="inquiry-card">
        <div class="inquiry-info">
          <span class="inquiry-name">${inq.name || '(no name)'}</span>
          <span class="inquiry-detail">${inq.phone || '—'} · ${inq.city || '—'}</span>
        </div>
        <span class="inquiry-time">${new Date(inq.receivedAt).toLocaleString()}</span>
      </div>`).join('')
    : '<div class="empty-state">No inquiries yet.</div>';

  const recentTransactions = document.getElementById('recentTransactions');
  const transactions = loadTransactions();
  recentTransactions.innerHTML = transactions.length
    ? transactions.slice(0, 5).map(transactionCardHTML).join('')
    : '<div class="empty-state">No transactions yet.</div>';
  recentTransactions.querySelectorAll('.transaction-delete').forEach((btn) => {
    btn.addEventListener('click', (e) => {
      const id = Number(e.target.closest('.transaction-card').dataset.id);
      deleteTransaction(id);
      renderOverview();
      renderFinance();
    });
  });
}
