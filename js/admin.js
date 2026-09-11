'use strict';

const ADMIN_KEY_STORAGE = 'yena_admin_key';

/**
 * Échappe une valeur avant de l'insérer dans du HTML (innerHTML). Les
 * réservations affichées ici proviennent d'un formulaire public non
 * authentifié : sans cet échappement, un nom/lieu/message piégé pourrait
 * exécuter du code dans le navigateur de l'admin (vol de la clé admin,
 * actions arbitraires sur le tableau de bord).
 */
function escapeHtml_(value) {
  return String(value == null ? '' : value).replace(/[&<>"']/g, (c) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  }[c]));
}

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
let statutsReservation = ['Nouvelle demande', 'Devis envoyé', 'Confirmé', 'Terminé'];

/* ====== Onglets du tableau de bord ====== */
const ADMIN_TABS = ['reservations', 'newsletter', 'galerie'];
document.getElementById('adminTabBar').addEventListener('click', (e) => {
  const btn = e.target.closest('.admin-tab-btn');
  if (!btn) return;
  const tab = btn.dataset.adminTab;
  ADMIN_TABS.forEach(t => {
    document.getElementById('adminPanel-' + t).hidden = t !== tab;
    const b = document.querySelector(`.admin-tab-btn[data-admin-tab="${t}"]`);
    b.classList.toggle('active', t === tab);
    b.setAttribute('aria-selected', String(t === tab));
  });
});

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
  loadGalleryAdmin_();
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
    bookingsBody.innerHTML = '<tr><td colspan="8" class="admin-empty">Aucune réservation pour le moment.</td></tr>';
    return;
  }
  bookingsBody.innerHTML = latestBookings.map(b => {
    const ready = b.statutPhotos === 'Prêt';
    const ref = escapeHtml_(b.ref);
    const driveLink = b.driveFolderUrl
      ? `<a href="${escapeHtml_(b.driveFolderUrl)}" target="_blank" rel="noopener" class="mini-link">Dossier Drive</a>`
      : '—';
    const actionCell = ready
      ? '<span class="status-pill ready">✓ Prêt</span>'
      : `<button type="button" class="btn-tiny" data-ref="${ref}">Marquer prêtes</button>`;
    const statutActuel = b.statutReservation || 'Nouvelle demande';
    const options = statutsReservation.map(s => `<option value="${escapeHtml_(s)}" ${s === statutActuel ? 'selected' : ''}>${escapeHtml_(s)}</option>`).join('');
    return `
      <tr>
        <td>${ref}</td>
        <td>${escapeHtml_(b.fullName) || '—'}</td>
        <td>${escapeHtml_(b.service) || '—'}</td>
        <td>${formatDateFr_(b.eventDate)}</td>
        <td>${escapeHtml_(b.email)}<br><span style="color:var(--text-soft)">${escapeHtml_(b.phone)}</span></td>
        <td><select class="status-select" data-ref="${ref}">${options}</select></td>
        <td><span class="status-pill ${ready ? 'ready' : 'pending'}">${escapeHtml_(b.statutPhotos)}</span><br>${driveLink}</td>
        <td>${actionCell}</td>
      </tr>
    `;
  }).join('');
}

async function loadBookings_() {
  bookingsBody.innerHTML = '<tr><td colspan="8" class="admin-empty">Chargement…</td></tr>';
  const result = await callApi_({ type: 'adminList', adminKey });

  if (!result.ok) {
    if (result.error === 'unauthorized') { showLogin_('Session expirée, reconnectez-vous.'); return; }
    bookingsBody.innerHTML = '<tr><td colspan="8" class="admin-empty">Erreur de chargement. Réessayez.</td></tr>';
    return;
  }

  latestBookings = result.bookings || [];
  if (result.statutsReservation && result.statutsReservation.length) statutsReservation = result.statutsReservation;
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

bookingsBody.addEventListener('change', async (e) => {
  const select = e.target.closest('select[data-ref]');
  if (!select) return;
  const ref = select.dataset.ref;
  const statut = select.value;
  select.disabled = true;

  const result = await callApi_({ type: 'adminUpdateBookingStatus', adminKey, ref, statut });
  select.disabled = false;
  if (result.error === 'unauthorized') { showLogin_('Session expirée, reconnectez-vous.'); return; }
  if (!result.ok) { showToast('Erreur, réessayez.'); return; }

  const booking = latestBookings.find(b => b.ref === ref);
  if (booking) booking.statutReservation = statut;
  showToast(`Statut mis à jour pour ${ref}.`);
});

/* ====== Export CSV ====== */
document.getElementById('exportCsvBtn').addEventListener('click', () => {
  if (!latestBookings.length) { showToast('Aucune réservation à exporter.'); return; }
  const cols = ['ref', 'fullName', 'email', 'phone', 'service', 'eventDate', 'guests', 'location', 'statutReservation', 'statutPhotos'];
  const headerRow = ['Référence', 'Nom', 'Email', 'Téléphone', 'Prestation', 'Date évènement', 'Invités', 'Lieu', 'Statut réservation', 'Statut photos'];
  const escapeCsv = (v) => `"${String(v == null ? '' : v).replace(/"/g, '""')}"`;
  const rows = [headerRow, ...latestBookings.map(b => cols.map(c => escapeCsv(b[c])))];
  const csv = '﻿' + rows.map(r => r.join(';')).join('\r\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `yena-event-reservations-${new Date().toISOString().slice(0, 10)}.csv`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
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

/* ====== Galerie ====== */
const galleryGridAdmin = document.getElementById('galleryGridAdmin');

async function loadGalleryAdmin_() {
  galleryGridAdmin.innerHTML = '<p class="admin-empty">Chargement…</p>';
  const url = getApiUrl_();
  if (!url) { galleryGridAdmin.innerHTML = ''; return; }
  try {
    const res = await fetch(`${url}?action=gallery`);
    const data = await res.json();
    if (!data.ok || !data.images.length) {
      galleryGridAdmin.innerHTML = '<p class="admin-empty">Aucune image pour le moment.</p>';
      return;
    }
    galleryGridAdmin.innerHTML = data.images.map(img => `
      <div class="admin-gallery-item">
        <img src="${escapeHtml_(img.url)}" alt="${escapeHtml_(img.titre)}" loading="lazy">
        <span class="gal-caption">${escapeHtml_(img.titre)}</span>
        <button type="button" class="gal-delete" data-row="${img.rowIndex}" title="Supprimer">✕</button>
      </div>
    `).join('');
  } catch (err) {
    galleryGridAdmin.innerHTML = '<p class="admin-empty">Erreur de chargement.</p>';
  }
}

document.getElementById('galleryAddForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const titre = document.getElementById('galTitre').value.trim();
  const lien = document.getElementById('galLien').value.trim();
  if (!titre || !lien) return;

  const btn = document.getElementById('galAddBtn');
  btn.disabled = true;
  btn.innerHTML = '<span class="spinner"></span>Ajout…';

  const result = await callApi_({ type: 'adminAddGalleryImage', adminKey, titre, lien });

  btn.disabled = false;
  btn.textContent = 'Ajouter à la galerie';

  if (result.error === 'unauthorized') { showLogin_('Session expirée, reconnectez-vous.'); return; }
  if (!result.ok) { showToast("Erreur lors de l'ajout, vérifiez le lien."); return; }

  showToast('Image ajoutée à la galerie !');
  e.target.reset();
  loadGalleryAdmin_();
});

galleryGridAdmin.addEventListener('click', async (e) => {
  const btn = e.target.closest('button[data-row]');
  if (!btn) return;
  if (!confirm('Supprimer cette image de la galerie ?')) return;
  btn.disabled = true;

  const result = await callApi_({ type: 'adminDeleteGalleryImage', adminKey, rowIndex: Number(btn.dataset.row) });
  if (result.error === 'unauthorized') { showLogin_('Session expirée, reconnectez-vous.'); return; }
  if (!result.ok) { showToast('Erreur, réessayez.'); btn.disabled = false; return; }

  showToast('Image supprimée.');
  loadGalleryAdmin_();
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
