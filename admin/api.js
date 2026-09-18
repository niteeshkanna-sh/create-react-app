// Thin wrapper over fetch for the admin panel.
//
// Every state-changing request carries the CSRF token the server put in the
// page, and every response is checked before the caller sees it — so a
// failure surfaces as a thrown error with the server's message rather than
// silently leaving the screen showing stale data.

const CSRF_TOKEN = document.querySelector('meta[name="csrf-token"]')?.content || '';

class ApiError extends Error {
  constructor(message, status, fields) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.fields = fields || {};
  }
}

async function apiRequest(url, { method = 'GET', body = null } = {}) {
  const options = {
    method,
    headers: { 'Accept': 'application/json' },
    credentials: 'same-origin',
  };

  if (body !== null) {
    options.headers['Content-Type'] = 'application/json';
    options.headers['X-CSRF-Token'] = CSRF_TOKEN;
    options.body = JSON.stringify(body);
  }

  let response;
  try {
    response = await fetch(url, options);
  } catch {
    throw new ApiError('Could not reach the server. Check your connection.', 0);
  }

  // The session ending mid-use is common enough to handle specifically:
  // send the user back to sign in rather than showing a confusing error.
  if (response.status === 401) {
    window.location.href = 'index.php';
    throw new ApiError('Signed out', 401);
  }

  let payload = {};
  try {
    payload = await response.json();
  } catch {
    throw new ApiError('The server returned an unreadable response.', response.status);
  }

  if (!response.ok) {
    throw new ApiError(payload.error || 'Something went wrong.', response.status, payload.fields);
  }
  return payload;
}

/**
 * The same handling as apiRequest, for a request carrying a file.
 *
 * apiRequest sets Content-Type and JSON-encodes the body, and both are wrong
 * for an upload: the browser has to set the multipart boundary itself, so the
 * header must be left alone entirely.
 */
async function apiUpload(url, formData) {
  formData.append('csrf_token', CSRF_TOKEN);

  let response;
  try {
    response = await fetch(url, {
      method: 'POST',
      headers: { 'Accept': 'application/json', 'X-CSRF-Token': CSRF_TOKEN },
      credentials: 'same-origin',
      body: formData,
    });
  } catch {
    throw new ApiError('Could not reach the server. Check your connection.', 0);
  }

  if (response.status === 401) {
    window.location.href = 'index.php';
    throw new ApiError('Signed out', 401);
  }

  let payload = {};
  try {
    payload = await response.json();
  } catch {
    // An upload larger than the server accepts is often refused before PHP
    // runs, so the reply is the host's HTML error page rather than our JSON.
    throw new ApiError(
      response.status === 413
        ? 'That image is larger than the server will accept. Try one under about 5 MB.'
        : 'The server returned an unreadable response.',
      response.status,
    );
  }

  if (!response.ok) {
    throw new ApiError(payload.error || 'Something went wrong.', response.status, payload.fields);
  }
  return payload;
}

const api = {
  vehicles: {
    list: (includeInactive = false) =>
      apiRequest(`api/vehicles.php?action=list${includeInactive ? '&include_inactive=1' : ''}`),
    save: (vehicle) =>
      apiRequest('api/vehicles.php?action=save', { method: 'POST', body: vehicle }),
    retire: (id, reason) =>
      apiRequest('api/vehicles.php?action=retire', { method: 'POST', body: { id, reason } }),
    photo: (id, file) => {
      const form = new FormData();
      form.append('vehicle_id', String(id));
      if (file) {
        form.append('photo', file);
      } else {
        form.append('remove', '1');
      }
      return apiUpload('api/vehicle-photo.php', form);
    },
  },

  bookings: {
    list: (status = '') =>
      apiRequest(`api/bookings.php?action=list${status ? '&status=' + encodeURIComponent(status) : ''}`),
    get: (id) => apiRequest(`api/bookings.php?action=get&id=${id}`),
    save: (booking) =>
      apiRequest('api/bookings.php?action=save', { method: 'POST', body: booking }),
    cancel: (id, reason) =>
      apiRequest('api/bookings.php?action=cancel', { method: 'POST', body: { id, reason } }),
    complete: (id) =>
      apiRequest('api/bookings.php?action=complete', { method: 'POST', body: { id } }),
  },

  payments: {
    add: (payment) =>
      apiRequest('api/payments.php?action=add', { method: 'POST', body: payment }),
    void: (id, reason) =>
      apiRequest('api/payments.php?action=void', { method: 'POST', body: { id, reason } }),
    correct: (correction) =>
      apiRequest('api/payments.php?action=correct', { method: 'POST', body: correction }),
    deposit: (deposit) =>
      apiRequest('api/payments.php?action=deposit', { method: 'POST', body: deposit }),
    refund: (refund) =>
      apiRequest('api/payments.php?action=refund', { method: 'POST', body: refund }),
  },

  enquiries: {
    list: (status = '', q = '') => {
      const params = new URLSearchParams({ action: 'list' });
      if (status) params.set('status', status);
      if (q) params.set('q', q);
      return apiRequest(`api/enquiries.php?${params}`);
    },
    get: (id) => apiRequest(`api/enquiries.php?action=get&id=${id}`),
    status: (id, status, note) =>
      apiRequest('api/enquiries.php?action=status', { method: 'POST', body: { id, status, note } }),
    note: (id, note) =>
      apiRequest('api/enquiries.php?action=note', { method: 'POST', body: { id, note } }),
    remove: (id) =>
      apiRequest('api/enquiries.php?action=delete', { method: 'POST', body: { id } }),
    convert: (payload) =>
      apiRequest('api/enquiries.php?action=convert', { method: 'POST', body: payload }),
  },

  expenses: {
    list: ({ from, to, category, vehicleId, includeVoided } = {}) => {
      const params = new URLSearchParams({ action: 'list' });
      if (from) params.set('from', from);
      if (to) params.set('to', to);
      if (category) params.set('category', category);
      if (vehicleId) params.set('vehicle_id', vehicleId);
      if (includeVoided) params.set('include_voided', '1');
      return apiRequest(`api/expenses.php?${params}`);
    },
    summary: ({ from, to } = {}) => {
      const params = new URLSearchParams({ action: 'summary' });
      if (from) params.set('from', from);
      if (to) params.set('to', to);
      return apiRequest(`api/expenses.php?${params}`);
    },
    save: (expense) => apiRequest('api/expenses.php?action=save', { method: 'POST', body: expense }),
    void: (id, reason) =>
      apiRequest('api/expenses.php?action=void', { method: 'POST', body: { id, reason } }),
    correct: (correction) =>
      apiRequest('api/expenses.php?action=correct', { method: 'POST', body: correction }),
    approve: (id, state, reason) =>
      apiRequest('api/expenses.php?action=approve', { method: 'POST', body: { id, state, reason } }),
  },

  km: {
    pickup: (record) => apiRequest('api/km.php?action=pickup', { method: 'POST', body: record }),
    return: (record) => apiRequest('api/km.php?action=return', { method: 'POST', body: record }),
    correct: (correction) =>
      apiRequest('api/km.php?action=correct', { method: 'POST', body: correction }),
  },
};
