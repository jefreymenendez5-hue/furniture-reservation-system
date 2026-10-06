const API_URL = 'http://localhost:3000';
const state = {
  token: localStorage.getItem('token') || '',
  user: JSON.parse(localStorage.getItem('user') || 'null'),
};

const els = {
  userName: document.getElementById('userName'),
  userRole: document.getElementById('userRole'),
  loginPanel: document.getElementById('loginPanel'),
  emailInput: document.getElementById('emailInput'),
  passwordInput: document.getElementById('passwordInput'),
  loginButton: document.getElementById('loginButton'),
  kpis: document.getElementById('kpis'),
  resourceList: document.getElementById('resourceList'),
  reservationList: document.getElementById('reservationList'),
  loanList: document.getElementById('loanList'),
  historyList: document.getElementById('historyList'),
  reservationResource: document.getElementById('reservationResource'),
  loanResource: document.getElementById('loanResource'),
  resourceForm: document.getElementById('resourceForm'),
  reservationForm: document.getElementById('reservationForm'),
  loanForm: document.getElementById('loanForm'),
  refreshResourcesBtn: document.getElementById('refreshResourcesBtn'),
  navButtons: document.querySelectorAll('.nav'),
  panels: document.querySelectorAll('.panel'),
};

function setAuthUI() {
  document.body.classList.toggle('role-admin', state.user?.role === 'admin');
  document.body.classList.toggle('role-user', state.user?.role === 'user');

  if (state.user) {
    els.userName.textContent = state.user.name;
    els.userRole.textContent = state.user.role;
    els.loginPanel.style.display = 'none';
  } else {
    els.userName.textContent = 'No iniciado';
    els.userRole.textContent = 'Invitado';
    els.loginPanel.style.display = 'block';
  }
}

function getHeaders() {
  return {
    'Content-Type': 'application/json',
    ...(state.token ? { Authorization: `Bearer ${state.token}` } : {}),
  };
}

async function apiRequest(path, options = {}) {
  const response = await fetch(`${API_URL}${path}`, {
    headers: getHeaders(),
    ...options,
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.error || 'Error en la solicitud');
  }

  return data;
}

function renderKpis(data) {
  const items = [
    { label: 'Mesas totales', value: data.tables.total },
    { label: 'Mesas disponibles', value: data.tables.available },
    { label: 'Mesas reservadas', value: data.tables.reserved },
    { label: 'Mesas prestadas', value: data.tables.borrowed },
    { label: 'Sillas totales', value: data.chairs.total },
    { label: 'Sillas disponibles', value: data.chairs.available },
    { label: 'Sillas reservadas', value: data.chairs.reserved },
    { label: 'Sillas prestadas', value: data.chairs.borrowed },
    { label: 'Reservas pendientes', value: data.reservations.pending },
    { label: 'Préstamos activos', value: data.loans.active },
    { label: 'Préstamos vencidos', value: data.loans.overdue },
    { label: 'Devoluciones pendientes', value: data.loans.pendingReturns },
  ];

  els.kpis.innerHTML = items.map((item) => `
    <div class="kpi">
      <span class="label">${item.label}</span>
      <span class="value">${item.value}</span>
    </div>
  `).join('');
}

function renderResources(resources) {
  els.resourceList.innerHTML = resources.map((resource) => `
    <div class="card">
      <h3>${resource.name}</h3>
      <p>Tipo: ${resource.type}</p>
      <p>Total: ${resource.total}</p>
      <p>Disponible: ${resource.available}</p>
      <p>Reservadas: ${resource.reserved}</p>
      <p>Prestadas: ${resource.borrowed}</p>
      <p>Estado: ${resource.status}</p>
    </div>
  `).join('');
}

function renderReservations(reservations) {
  els.reservationList.innerHTML = reservations.map((reservation) => `
    <div class="card">
      <h3>${reservation.resourceName}</h3>
      <p>Usuario: ${reservation.user}</p>
      <p>Cantidad: ${reservation.quantity}</p>
      <p>Fecha: ${reservation.date}</p>
      <p>Estado: ${reservation.status}</p>
    </div>
  `).join('');
}

function renderLoans(loans) {
  els.loanList.innerHTML = loans.map((loan) => `
    <div class="card">
      <h3>${loan.resourceName}</h3>
      <p>Responsable: ${loan.user}</p>
      <p>Cantidad: ${loan.quantity}</p>
      <p>Estado: ${loan.status}</p>
      <p>Devolución esperada: ${loan.expectedReturnDate}</p>
    </div>
  `).join('');
}

function renderHistory(history) {
  els.historyList.innerHTML = history.slice(0, 20).map((item) => `
    <div class="card">
      <h3>${item.action}</h3>
      <p>Recurso: ${item.resourceId}</p>
      <p>Usuario: ${item.user}</p>
      <p>Cantidad: ${item.quantity}</p>
      <p>Fecha: ${new Date(item.createdAt).toLocaleString()}</p>
    </div>
  `).join('');
}

function populateSelect(select, options) {
  select.innerHTML = options.map((option) => `<option value="${option.id}">${option.name || option.resourceName}</option>`).join('');
}

els.navButtons.forEach((button) => {
  button.addEventListener('click', () => {
    els.navButtons.forEach((btn) => btn.classList.toggle('active', btn === button));
    els.panels.forEach((panel) => panel.classList.toggle('active', panel.id === button.dataset.target));
  });
});

async function loadDashboard() {
  const data = await apiRequest('/api/dashboard');
  renderKpis(data);
}

async function loadResources() {
  const resources = await apiRequest('/api/resources');
  renderResources(resources);
  populateSelect(els.reservationResource, resources);
  populateSelect(els.loanResource, resources);
}

async function loadReservations() {
  const reservations = await apiRequest('/api/reservations');
  renderReservations(reservations);
}

async function loadLoans() {
  const loans = await apiRequest('/api/loans');
  renderLoans(loans);
}

async function loadHistory() {
  const history = await apiRequest('/api/history');
  renderHistory(history);
}

async function refreshAll() {
  if (!state.token) {
    renderKpis({
      tables: { total: 0, available: 0, reserved: 0, borrowed: 0 },
      chairs: { total: 0, available: 0, reserved: 0, borrowed: 0 },
      reservations: { pending: 0 },
      loans: { active: 0, overdue: 0, pendingReturns: 0 },
    });
    els.resourceList.innerHTML = '<div class="card"><p>Inicia sesión para cargar el inventario.</p></div>';
    els.reservationList.innerHTML = '';
    els.loanList.innerHTML = '';
    els.historyList.innerHTML = '';
    return;
  }

  try {
    await Promise.all([loadDashboard(), loadResources(), loadReservations(), loadLoans(), loadHistory()]);
  } catch (error) {
    alert(error.message);
  }
}

els.loginButton.addEventListener('click', async () => {
  const email = els.emailInput.value.trim();
  const password = els.passwordInput.value.trim();

  try {
    const result = await apiRequest('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });

    state.user = result.user;
    state.token = result.token;
    localStorage.setItem('token', result.token);
    localStorage.setItem('user', JSON.stringify(result.user));
    setAuthUI();
    await refreshAll();
  } catch (error) {
    alert(error.message);
  }
});

els.resourceForm.addEventListener('submit', async (event) => {
  event.preventDefault();

  try {
    await apiRequest('/api/resources', {
      method: 'POST',
      body: JSON.stringify({
        type: document.getElementById('resourceType').value.trim(),
        name: document.getElementById('resourceName').value.trim(),
        total: Number(document.getElementById('resourceTotal').value),
      }),
    });

    event.target.reset();
    await refreshAll();
  } catch (error) {
    alert(error.message);
  }
});

els.reservationForm.addEventListener('submit', async (event) => {
  event.preventDefault();

  try {
    await apiRequest('/api/reservations', {
      method: 'POST',
      body: JSON.stringify({
        resourceId: Number(els.reservationResource.value),
        quantity: Number(document.getElementById('reservationQuantity').value),
        date: document.getElementById('reservationDate').value,
        startTime: document.getElementById('reservationStart').value || null,
        endTime: document.getElementById('reservationEnd').value || null,
      }),
    });

    event.target.reset();
    await refreshAll();
  } catch (error) {
    alert(error.message);
  }
});

els.loanForm.addEventListener('submit', async (event) => {
  event.preventDefault();

  try {
    await apiRequest('/api/loans', {
      method: 'POST',
      body: JSON.stringify({
        resourceId: Number(els.loanResource.value),
        quantity: Number(document.getElementById('loanQuantity').value),
        expectedReturnDate: document.getElementById('loanExpectedDate').value,
        notes: document.getElementById('loanNotes').value || '',
      }),
    });

    event.target.reset();
    await refreshAll();
  } catch (error) {
    alert(error.message);
  }
});

els.refreshResourcesBtn.addEventListener('click', refreshAll);
setAuthUI();
refreshAll();
