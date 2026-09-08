'use strict';

const ADMIN_KEY_STORAGE = 'yena_admin_key';

function showToast(msg, duration = 3200) {
  const toast = document.getElementById('toast');
  toast.textContent = msg;
  toast.classList.add('show');
  clearTimeout(showToast._t);
  showToast._t = setTimeout(() => toast.classList.remove('show'), duration);
}

function getApiUrl_() {
  return window.YENA_CONFIG && window.YENA_CONFIG.APPS_SCRIPT_URL;
}

async function callApi_(payload) {
  const url = getApiUrl_();
  if (!url) return { ok: false, error: 'not_configured' };
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify(payload),
    });
    return await res.json();
  } catch (err) {
    return { ok: false, error: 'network_error' };
  }
}

const loginView = document.getElementById('loginView');
const dashboardView = document.getElementById('dashboardView');
const logoutBtn = document.getElementById('logoutBtn');
const loginForm = document.getElementById('loginForm');
const loginBtn = document.getElementById('loginBtn');
const loginError = document.getElementById('loginError');

let adminKey = null;
let latestBookings = [];

function showLogin_(message) {
  adminKey = null;
  try { localStorage.removeItem(ADMIN_KEY_STORAGE); } catch (err) { /* ignore */ }
  loginView.hidden = false;
  dashboardView.hidden = true;
  logoutBtn.hidden = true;
  if (message) loginError.textContent = message;
}

function showDashboard_() {
  loginView.hidden = true;
  dashboardView.hidden = false;
  logoutBtn.hidden = false;
  loadBookings_();
}

async function tryLogin_(key) {
  const result = await callApi_({ type: 'adminAuth', adminKey: key });
  if (result.error === 'not_configured') {
    loginError.textContent = "Le site n'est pas encore relié au backend (APPS_SCRIPT_URL vide dans js/config.js).";
    return false;
  }
  if (result.error === 'network_error') {
    loginError.textContent = 'Impossible de contacter le serveur, réessayez.';
    return false;
  }
  if (!result.ok) {
    loginError.textContent = 'Mot de passe incorrect.';
    return false;
  }
  adminKey = key;
  try { localStorage.setItem(ADMIN_KEY_STORAGE, key); } catch (err) { /* ignore */ }
  loginError.textContent = '';
  return true;
}

loginForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  const key = document.getElementById('adminKeyInput').value;
  loginBtn.disabled = true;
  loginBtn.innerHTML = '<span class="spinner"></span>Connexion…';
  const ok = await tryLogin_(key);
  loginBtn.disabled = false;
  loginBtn.textContent = 'Se connecter';
  if (ok) showDashboard_();
});

logoutBtn.addEventListener('click', () => showLogin_());

/* ====== Bookings table ====== */
const bookingsBody = document.getElementById('bookingsBody');
const refreshBtn = document.getElementById('refreshBtn');

function formatDateFr_(iso) {
  if (!iso) return '—';
  const d = new Date(iso + 'T00:00:00');
  if (isNaN(d)) return iso;
  return d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' });
}

function renderBookings_() {
  if (!latestBookings.length) {
    bookingsBody.innerHTML = '<tr><td colspan="7" class="admin-empty">Aucune réservation pour le moment.</td></tr>';
    return;
  }
  bookingsBody.innerHTML = latestBookings.map(b => {
    const ready = b.statutPhotos === 'Prêt';
    const driveLink = b.driveFolderUrl
      ? `<a href="${b.driveFolderUrl}" target="_blank" rel="noopener" class="mini-link">Dossier Drive</a>`
      : '—';
    const actionCell = ready
      ? '<span class="status-pill ready">✓ Prêt</span>'
      : `<button type="button" class="btn-tiny" data-ref="${b.ref}">Marquer prêtes</button>`;
    return `
      <tr>
        <td>${b.ref}</td>
        <td>${b.fullName || '—'}</td>
        <td>${b.service || '—'}</td>
        <td>${formatDateFr_(b.eventDate)}</td>
        <td>${b.email || ''}<br><span style="color:var(--text-soft)">${b.phone || ''}</span></td>
        <td><span class="status-pill ${ready ? 'ready' : 'pending'}">${b.statutPhotos}</span><br>${driveLink}</td>
        <td>${actionCell}</td>
      </tr>
    `;
  }).join('');
}

async function loadBookings_() {
  bookingsBody.innerHTML = '<tr><td colspan="7" class="admin-empty">Chargement…</td></tr>';
  const result = await callApi_({ type: 'adminList', adminKey });

  if (!result.ok) {
    if (result.error === 'unauthorized') { showLogin_('Session expirée, reconnectez-vous.'); return; }
    bookingsBody.innerHTML = '<tr><td colspan="7" class="admin-empty">Erreur de chargement. Réessayez.</td></tr>';
    return;
  }

  latestBookings = result.bookings || [];
  document.getElementById('statBookings').textContent = latestBookings.length;
  document.getElementById('statPending').textContent = latestBookings.filter(b => b.statutPhotos !== 'Prêt').length;
  document.getElementById('statSubscribers').textContent = result.abonnesCount || 0;
  document.getElementById('nlRecipientCount').textContent = result.abonnesCount || 0;
  renderBookings_();
}

refreshBtn.addEventListener('click', loadBookings_);

bookingsBody.addEventListener('click', async (e) => {
  const btn = e.target.closest('button[data-ref]');
  if (!btn) return;
  const ref = btn.dataset.ref;
  btn.disabled = true;
  btn.textContent = '…';

  const result = await callApi_({ type: 'adminMarkPhotosReady', adminKey, ref });
  if (result.error === 'unauthorized') { showLogin_('Session expirée, reconnectez-vous.'); return; }
  if (!result.ok) {
    showToast("Erreur, réessayez.");
    btn.disabled = false;
    btn.textContent = 'Marquer prêtes';
    return;
  }
  showToast(`Photos marquées prêtes pour ${ref}.`);
  const booking = latestBookings.find(b => b.ref === ref);
  if (booking) booking.statutPhotos = 'Prêt';
  renderBookings_();
  document.getElementById('statPending').textContent = latestBookings.filter(b => b.statutPhotos !== 'Prêt').length;
});

/* ====== Newsletter ====== */
document.getElementById('newsletterAdminForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const sujet = document.getElementById('nlSujet').value.trim();
  const contenu = document.getElementById('nlContenu').value.trim();
  const count = document.getElementById('nlRecipientCount').textContent;
  if (!sujet || !contenu) return;

  if (!confirm(`Envoyer cette newsletter à ${count} abonné(e)s maintenant ? Cette action est irréversible.`)) return;

  const btn = document.getElementById('nlSendBtn');
  btn.disabled = true;
  btn.innerHTML = '<span class="spinner"></span>Envoi en cours…';

  const result = await callApi_({ type: 'adminSendNewsletter', adminKey, sujet, contenu });

  btn.disabled = false;
  btn.textContent = 'Envoyer maintenant';

  if (result.error === 'unauthorized') { showLogin_('Session expirée, reconnectez-vous.'); return; }
  if (!result.ok) {
    showToast("Erreur lors de l'envoi, réessayez.");
    return;
  }
  showToast(`Newsletter envoyée à ${result.count} destinataire(s) !`);
  e.target.reset();
});

/* ====== Boot ====== */
(async () => {
  let saved = null;
  try { saved = localStorage.getItem(ADMIN_KEY_STORAGE); } catch (err) { /* ignore */ }
  if (saved) {
    const ok = await tryLogin_(saved);
    if (ok) { showDashboard_(); return; }
  }
  showLogin_();
})();
