'use strict';

document.getElementById('year').textContent = new Date().getFullYear();

/** Échappe une valeur avant de l'insérer dans du HTML (innerHTML). */
function escapeHtml_(value) {
  return String(value == null ? '' : value).replace(/[&<>"']/g, (c) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  }[c]));
}

/* ====== Toast ====== */
function showToast(msg, duration = 3200) {
  const toast = document.getElementById('toast');
  toast.textContent = msg;
  toast.classList.add('show');
  clearTimeout(showToast._t);
  showToast._t = setTimeout(() => toast.classList.remove('show'), duration);
}

/* ====== Header scroll ====== */
const header = document.getElementById('siteHeader');

const scrollProgress = document.getElementById('scrollProgress');
window.addEventListener('scroll', () => {
  header.classList.toggle('scrolled', window.scrollY > 12);
  document.getElementById('backToTop').classList.toggle('show', window.scrollY > 600);
  const docHeight = document.documentElement.scrollHeight - window.innerHeight;
  const pct = docHeight > 0 ? (window.scrollY / docHeight) * 100 : 0;
  scrollProgress.style.width = pct + '%';
}, { passive: true });

document.getElementById('backToTop').addEventListener('click', () => {
  window.scrollTo({ top: 0, behavior: 'smooth' });
});

/* ====== Reveal on scroll ====== */
const revealObserver = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      entry.target.classList.add('in-view');
      revealObserver.unobserve(entry.target);
    }
  });
}, { threshold: 0.15 });
document.querySelectorAll('.reveal').forEach(el => revealObserver.observe(el));

/* ====== Navigation par onglets (sections) ====== */
const TAB_IDS = ['accueil', 'apropos', 'prestations', 'process', 'catalogue', 'galerie', 'avis', 'reservation', 'suivi', 'acompte', 'photos', 'faq', 'contact'];
const tabBar = document.getElementById('tabBar');

function activateTab_(id, opts = {}) {
  if (!TAB_IDS.includes(id)) id = 'accueil';
  TAB_IDS.forEach(tid => {
    const section = document.getElementById(tid);
    const isActive = tid === id;
    if (section) section.hidden = !isActive;
    const btn = tabBar.querySelector(`.tab-btn[data-tab="${tid}"]`);
    if (btn) {
      btn.classList.toggle('active', isActive);
      btn.setAttribute('aria-selected', String(isActive));
    }
  });
  // Les éléments "reveal" de l'onglet qui vient d'apparaître sont affichés
  // immédiatement (pas de fondu à l'apparition : ce n'est pas un défilement).
  const activeSection = document.getElementById(id);
  if (activeSection) activeSection.querySelectorAll('.reveal').forEach(el => el.classList.add('in-view'));

  const activeBtn = tabBar.querySelector(`.tab-btn[data-tab="${id}"]`);
  if (activeBtn) activeBtn.scrollIntoView({ block: 'nearest', inline: 'center', behavior: opts.instant ? 'auto' : 'smooth' });

  if (!opts.skipScrollTop) window.scrollTo({ top: 0, behavior: opts.instant ? 'auto' : 'smooth' });
  if (!opts.skipHistory) history.replaceState(null, '', '#' + id);
}

tabBar.addEventListener('click', (e) => {
  const btn = e.target.closest('.tab-btn');
  if (!btn) return;
  activateTab_(btn.dataset.tab);
});

// Intercepte tout lien interne "#section" (nav, boutons d'appel à l'action,
// liens du footer…) pour basculer d'onglet au lieu de défiler la page.
document.addEventListener('click', (e) => {
  const a = e.target.closest('a[href^="#"]');
  if (!a) return;
  const id = a.getAttribute('href').slice(1);
  if (!TAB_IDS.includes(id)) return;
  e.preventDefault();
  activateTab_(id);
});

// Au chargement : respecte l'onglet indiqué dans l'URL (lien partagé), sinon Accueil.
const initialTab = TAB_IDS.includes(location.hash.slice(1)) ? location.hash.slice(1) : 'accueil';
activateTab_(initialTab, { instant: true, skipScrollTop: true, skipHistory: true });

/* ====== Hero stat counters ====== */
const statObserver = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (!entry.isIntersecting) return;
    entry.target.querySelectorAll('.stat-num').forEach(el => {
      const target = parseInt(el.dataset.target, 10);
      const duration = 1400;
      const start = performance.now();
      function tick(now) {
        const progress = Math.min((now - start) / duration, 1);
        const eased = 1 - Math.pow(1 - progress, 3);
        el.textContent = Math.round(eased * target);
        if (progress < 1) requestAnimationFrame(tick);
      }
      requestAnimationFrame(tick);
    });
    statObserver.unobserve(entry.target);
  });
}, { threshold: 0.4 });
statObserver.observe(document.getElementById('heroStats'));

/* ====== Data: services ====== */
const SERVICES = [
  { id: 'mariage', icon: '💍', title: 'Mariages', desc: "Cérémonie, réception, décoration : votre mariage sur mesure, du premier rendez-vous au dernier morceau de gâteau." },
  { id: 'anniversaire', icon: '🎂', title: 'Anniversaires', desc: "Des anniversaires mémorables pour petits et grands, avec thème, animation et décoration personnalisés." },
  { id: 'bapteme', icon: '👶', title: 'Baptêmes', desc: "Une célébration douce et élégante pour marquer ce moment unique en famille." },
  { id: 'seminaire', icon: '💼', title: 'Séminaires d\'entreprise', desc: "Organisation complète de vos séminaires, journées d'équipe et évènements corporate." },
  { id: 'gala', icon: '🥂', title: 'Galas & Soirées', desc: "Soirées de prestige, galas caritatifs ou évènements VIP à la scénographie soignée." },
  { id: 'lancement', icon: '🚀', title: 'Lancements de produit', desc: "Mettez en lumière votre marque avec un évènement percutant et sur mesure." },
];

const servicesGrid = document.getElementById('servicesGrid');
SERVICES.forEach(s => {
  const card = document.createElement('div');
  card.className = 'service-card reveal';
  card.innerHTML = `
    <div class="service-icon">${s.icon}</div>
    <h3>${s.title}</h3>
    <p>${s.desc}</p>
    <button type="button" class="service-pick" data-service="${s.id}">Choisir cette prestation →</button>
  `;
  servicesGrid.appendChild(card);
  revealObserver.observe(card);
});

servicesGrid.addEventListener('click', (e) => {
  const btn = e.target.closest('.service-pick');
  if (!btn) return;
  selectService(btn.dataset.service);
  activateTab_('reservation');
});

/* ====== Booking form: build option cards from SERVICES ====== */
const serviceOptions = document.getElementById('serviceOptions');
SERVICES.forEach(s => {
  const opt = document.createElement('div');
  opt.className = 'option-card';
  opt.dataset.service = s.id;
  opt.innerHTML = `<span class="oi">${s.icon}</span><span class="ot">${s.title}</span>`;
  serviceOptions.appendChild(opt);
});

let selectedService = null;
function selectService(id) {
  selectedService = id;
  serviceOptions.querySelectorAll('.option-card').forEach(el => {
    el.classList.toggle('selected', el.dataset.service === id);
  });
  document.getElementById('err-service').textContent = '';
}
serviceOptions.addEventListener('click', (e) => {
  const card = e.target.closest('.option-card');
  if (!card) return;
  selectService(card.dataset.service);
});

/* ====== Gallery ====== */
// Contenu de repli tant qu'aucune photo n'a été ajoutée depuis la page admin.
const GALLERY_PLACEHOLDER = [
  { label: 'Mariage au domaine des Roses', tall: true },
  { label: 'Anniversaire thème doré' },
  { label: 'Séminaire corporate' },
  { label: 'Gala de charité', tall: true },
  { label: 'Baptême champêtre' },
  { label: 'Lancement de produit' },
  { label: 'Décoration florale' },
  { label: 'Soirée VIP' },
];
const galleryPalette = ['var(--brown)', 'var(--brown-light)', 'var(--gold)', 'var(--brown-950)'];
const galleryGrid = document.getElementById('galleryGrid');

function renderGalleryPlaceholder_() {
  galleryGrid.innerHTML = '';
  GALLERY_PLACEHOLDER.forEach((g, i) => {
    const div = document.createElement('div');
    div.className = 'gallery-item' + (g.tall ? ' tall' : '');
    div.style.background = `linear-gradient(160deg, ${galleryPalette[i % galleryPalette.length]}, var(--beige))`;
    div.innerHTML = `<span>${g.label}</span>`;
    galleryGrid.appendChild(div);
  });
}

async function loadGallery_() {
  const url = window.YENA_CONFIG && window.YENA_CONFIG.APPS_SCRIPT_URL;
  if (!url) { renderGalleryPlaceholder_(); return; }
  try {
    const res = await fetch(`${url}?action=gallery`);
    const data = await res.json();
    if (!data.ok || !data.images.length) { renderGalleryPlaceholder_(); return; }
    galleryGrid.innerHTML = '';
    data.images.forEach((img, i) => {
      const div = document.createElement('div');
      div.className = 'gallery-item' + (i % 5 === 0 ? ' tall' : '');
      div.innerHTML = `<img src="${escapeHtml_(img.url)}" alt="${escapeHtml_(img.titre)}" loading="lazy"><span>${escapeHtml_(img.titre)}</span>`;
      galleryGrid.appendChild(div);
    });
  } catch (err) {
    renderGalleryPlaceholder_();
  }
}

loadGallery_();

/* ====== Testimonials ====== */
// Avis d'exemple utilisés tant que les avis Google réels ne sont pas
// configurés côté backend (voir GOOGLE_PLACES_API_KEY / GOOGLE_PLACE_ID
// dans google-apps-script/Code.gs) — aucune erreur visible en attendant.
const TESTIMONIALS_PLACEHOLDER = [
  { text: "Yena Event a organisé notre mariage de A à Z. Tout était parfait, nous n'avons eu qu'à profiter de la journée.", author: "Camille & Antoine", role: "Mariage, 120 invités", rating: 5 },
  { text: "Un professionnalisme remarquable pour notre séminaire d'entreprise. Logistique impeccable et équipe très réactive.", author: "Sophie Marchand", role: "Directrice RH, Nova Corp", rating: 5 },
  { text: "Le baptême de notre fille était magnifique, chaque détail avait été pensé. Merci à toute l'équipe !", author: "Julien Petit", role: "Baptême", rating: 5 },
  { text: "Notre gala caritatif a été un franc succès grâce à leur créativité et leur sens de l'organisation.", author: "Fondation Lumière", role: "Gala annuel", rating: 5 },
];

const testimonialSlider = document.querySelector('.testimonial-slider');
const track = document.getElementById('testimonialTrack');
const dotsWrap = document.getElementById('testimonialDots');
const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

let slideIndex = 0;
let testimonialsCount = 0;
let testimonialTimer = null;

function starsHtml_(rating) {
  const n = Math.max(0, Math.min(5, Math.round(Number(rating) || 5)));
  return '★★★★★'.slice(0, n) + '☆☆☆☆☆'.slice(0, 5 - n);
}

function goToSlide(i) {
  if (!testimonialsCount) return;
  slideIndex = (i + testimonialsCount) % testimonialsCount;
  track.style.transform = `translateX(-${slideIndex * 100}%)`;
  dotsWrap.querySelectorAll('button').forEach((d, idx) => d.classList.toggle('active', idx === slideIndex));
}

function startTestimonialAutoplay_() {
  clearInterval(testimonialTimer);
  // On respecte le réglage "réduire les animations" du visiteur, et on ne
  // fait tourner un carrousel que s'il y a effectivement plusieurs avis.
  if (prefersReducedMotion || testimonialsCount < 2) return;
  testimonialTimer = setInterval(() => goToSlide(slideIndex + 1), 6000);
}
function stopTestimonialAutoplay_() {
  clearInterval(testimonialTimer);
}
if (testimonialSlider) {
  // Pause au survol et au focus clavier, pour laisser le temps de lire.
  testimonialSlider.addEventListener('mouseenter', stopTestimonialAutoplay_);
  testimonialSlider.addEventListener('mouseleave', startTestimonialAutoplay_);
  testimonialSlider.addEventListener('focusin', stopTestimonialAutoplay_);
  testimonialSlider.addEventListener('focusout', startTestimonialAutoplay_);
}

function renderTestimonials_(items, meta) {
  track.innerHTML = '';
  dotsWrap.innerHTML = '';
  document.getElementById('testimonialsSummary')?.remove();

  if (meta && meta.rating && testimonialSlider) {
    const summary = document.createElement('p');
    summary.className = 'testimonial-summary';
    summary.id = 'testimonialsSummary';
    summary.innerHTML = `<strong>${escapeHtml_(meta.rating)}</strong> ★ sur ${escapeHtml_(meta.totalReviews || 0)} avis Google` +
      (meta.reviewLink ? ` · <a href="${escapeHtml_(meta.reviewLink)}" target="_blank" rel="noopener">Voir tous les avis</a>` : '');
    testimonialSlider.parentNode.insertBefore(summary, testimonialSlider);
  }

  testimonialsCount = items.length;
  items.forEach((t, i) => {
    const card = document.createElement('div');
    card.className = 'testimonial-card';
    card.innerHTML = `
      <div class="stars">${starsHtml_(t.rating)}</div>
      <p>"${escapeHtml_(t.text)}"</p>
      <strong>${escapeHtml_(t.author)}</strong>
      <span>${escapeHtml_(t.role)}</span>
    `;
    track.appendChild(card);
    const dot = document.createElement('button');
    dot.type = 'button';
    dot.setAttribute('aria-label', `Avis ${i + 1} sur ${items.length}`);
    if (i === 0) dot.classList.add('active');
    dot.addEventListener('click', () => { goToSlide(i); startTestimonialAutoplay_(); });
    dotsWrap.appendChild(dot);
  });

  goToSlide(0);
  startTestimonialAutoplay_();
}

async function loadTestimonials_() {
  const url = window.YENA_CONFIG && window.YENA_CONFIG.APPS_SCRIPT_URL;
  if (url) {
    try {
      const res = await fetch(`${url}?action=googleReviews`);
      const data = await res.json();
      if (data.ok && data.reviews && data.reviews.length) {
        renderTestimonials_(
          data.reviews.map(r => ({ text: r.text, author: r.author, role: r.relativeTime || 'Avis Google', rating: r.rating })),
          { rating: data.rating, totalReviews: data.totalReviews, reviewLink: data.reviewLink }
        );
        return;
      }
    } catch (err) { /* on retombe sur les avis d'exemple */ }
  }
  renderTestimonials_(TESTIMONIALS_PLACEHOLDER);
}
loadTestimonials_();

/* ====== FAQ ====== */
const FAQ = [
  { q: "Combien de temps à l'avance dois-je réserver ?", a: "Nous recommandons de nous contacter 3 à 12 mois avant votre évènement selon sa taille, mais nous étudions aussi les demandes plus urgentes." },
  { q: "Le devis est-il gratuit et sans engagement ?", a: "Oui. Après votre demande, vous recevez un devis détaillé sous 48h. Vous êtes libre de l'accepter ou non avant toute validation définitive." },
  { q: "Comment se déroule la validation d'une prestation ?", a: "Une fois le devis accepté, vous validez la prestation en ligne ou par signature, un acompte est demandé pour bloquer la date, puis nous démarrons l'organisation." },
  { q: "Travaillez-vous partout en France ?", a: "Nous intervenons principalement en Île-de-France et pouvons nous déplacer partout en France pour les évènements de plus grande envergure." },
  { q: "Puis-je modifier ma demande après l'avoir envoyée ?", a: "Bien sûr, notre équipe vous recontacte pour affiner chaque détail avant la validation finale du devis." },
];
const accordion = document.getElementById('accordion');
FAQ.forEach((item, i) => {
  const el = document.createElement('div');
  el.className = 'accordion-item';
  el.innerHTML = `
    <button type="button" class="accordion-btn" id="faqBtn${i}" aria-expanded="false" aria-controls="faqPanel${i}">${item.q}<span class="plus">+</span></button>
    <div class="accordion-panel" id="faqPanel${i}" role="region" aria-labelledby="faqBtn${i}"><p>${item.a}</p></div>
  `;
  accordion.appendChild(el);
  const btn = el.querySelector('.accordion-btn');
  const panel = el.querySelector('.accordion-panel');
  btn.addEventListener('click', () => {
    const isOpen = el.classList.contains('open');
    accordion.querySelectorAll('.accordion-item').forEach(other => {
      other.classList.remove('open');
      other.querySelector('.accordion-panel').style.maxHeight = null;
      other.querySelector('.accordion-btn').setAttribute('aria-expanded', 'false');
    });
    if (!isOpen) {
      el.classList.add('open');
      panel.style.maxHeight = panel.scrollHeight + 'px';
      btn.setAttribute('aria-expanded', 'true');
    }
  });
});

/* ====== Booking form: multi-step logic ====== */
const bookingForm = document.getElementById('bookingForm');
const steps = Array.from(document.querySelectorAll('.form-step'));
const progressSteps = Array.from(document.querySelectorAll('#progressSteps li'));
const progressFill = document.getElementById('progressFill');
const prevBtn = document.getElementById('prevBtn');
const nextBtn = document.getElementById('nextBtn');
const submitBtn = document.getElementById('submitBtn');
let currentStep = 1;
const totalSteps = steps.length;

function setError(id, msg) {
  const el = document.getElementById('err-' + id);
  if (el) el.textContent = msg || '';
}

function validateStep(step) {
  let valid = true;
  if (step === 1) {
    if (!selectedService) { setError('service', 'Merci de sélectionner une prestation.'); valid = false; }
    else setError('service', '');
  }
  if (step === 2) {
    const date = document.getElementById('eventDate');
    const guests = document.getElementById('guests');
    if (!date.value) { setError('eventDate', 'Merci d\'indiquer une date.'); valid = false; }
    else {
      const chosen = new Date(date.value);
      const today = new Date(); today.setHours(0,0,0,0);
      if (chosen < today) { setError('eventDate', 'La date doit être future.'); valid = false; }
      else setError('eventDate', '');
    }
    if (!guests.value || parseInt(guests.value, 10) < 1) { setError('guests', 'Merci d\'indiquer le nombre d\'invités.'); valid = false; }
    else setError('guests', '');
  }
  if (step === 3) {
    const name = document.getElementById('fullName');
    const email = document.getElementById('email');
    const phone = document.getElementById('phone');
    if (!name.value.trim()) { setError('fullName', 'Merci d\'indiquer votre nom.'); valid = false; }
    else setError('fullName', '');
    const emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRe.test(email.value.trim())) { setError('email', 'Adresse email invalide.'); valid = false; }
    else setError('email', '');
    const phoneRe = /^[\d\s+().-]{8,}$/;
    if (!phoneRe.test(phone.value.trim())) { setError('phone', 'Numéro de téléphone invalide.'); valid = false; }
    else setError('phone', '');
  }
  if (step === 4) {
    const consent = document.getElementById('consent');
    if (!consent.checked) { setError('consent', 'Merci d\'accepter d\'être recontacté(e).'); valid = false; }
    else setError('consent', '');
  }
  return valid;
}

function renderStep() {
  steps.forEach(s => s.classList.toggle('active', parseInt(s.dataset.step, 10) === currentStep));
  progressSteps.forEach(li => {
    const n = parseInt(li.dataset.step, 10);
    li.classList.toggle('active', n === currentStep);
    li.classList.toggle('done', n < currentStep);
  });
  progressFill.style.width = (currentStep / totalSteps * 100) + '%';
  prevBtn.disabled = currentStep === 1;
  nextBtn.hidden = currentStep === totalSteps;
  submitBtn.hidden = currentStep !== totalSteps;
  if (currentStep === totalSteps) renderSummary();
}

function renderSummary() {
  const service = SERVICES.find(s => s.id === selectedService);
  const date = document.getElementById('eventDate').value;
  const guests = document.getElementById('guests').value;
  const location = document.getElementById('location').value || '—';
  const budget = document.getElementById('budget').value || '—';
  const name = document.getElementById('fullName').value;
  const email = document.getElementById('email').value;
  const phone = document.getElementById('phone').value;
  const typeClient = document.getElementById('typeClient').value;
  const referralRef = document.getElementById('referralRef').value.trim();
  const dateFmt = date ? new Date(date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' }) : '—';

  document.getElementById('summaryBox').innerHTML = `
    <dl>
      <dt>Prestation</dt><dd>${service ? service.icon + ' ' + escapeHtml_(service.title) : '—'}</dd>
      <dt>Date</dt><dd>${dateFmt}</dd>
      <dt>Invités</dt><dd>${escapeHtml_(guests) || '—'}</dd>
      <dt>Lieu</dt><dd>${escapeHtml_(location)}</dd>
      <dt>Budget</dt><dd>${escapeHtml_(budget)}</dd>
      <dt>Contact</dt><dd>${escapeHtml_(name)} · ${escapeHtml_(email)} · ${escapeHtml_(phone)}</dd>
      ${typeClient ? `<dt>Profil</dt><dd>${escapeHtml_(typeClient)}</dd>` : ''}
      ${referralRef ? `<dt>Parrainage</dt><dd>${escapeHtml_(referralRef)}</dd>` : ''}
    </dl>
  `;
}

nextBtn.addEventListener('click', () => {
  if (!validateStep(currentStep)) return;
  if (currentStep < totalSteps) { currentStep++; renderStep(); }
});
prevBtn.addEventListener('click', () => {
  if (currentStep > 1) { currentStep--; renderStep(); }
});

let lastBooking = null;

function pad2_(n) { return String(n).padStart(2, '0'); }

function buildGoogleCalendarUrl_(booking) {
  const d = new Date(booking.eventDate + 'T00:00:00');
  const end = new Date(d.getTime() + 86400000);
  const fmt = (dt) => `${dt.getFullYear()}${pad2_(dt.getMonth() + 1)}${pad2_(dt.getDate())}`;
  const params = new URLSearchParams({
    action: 'TEMPLATE',
    text: `${booking.service} — Yena Event`,
    dates: `${fmt(d)}/${fmt(end)}`,
    details: `Référence : ${booking.ref}\nInvités : ${booking.guests}\nLieu : ${booking.location || 'à confirmer'}\nOrganisé par Yena Event.`,
    location: booking.location || '',
  });
  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}

function buildIcsContent_(booking) {
  const d = booking.eventDate.replace(/-/g, '');
  const end = new Date(new Date(booking.eventDate + 'T00:00:00').getTime() + 86400000);
  const endStr = `${end.getFullYear()}${pad2_(end.getMonth() + 1)}${pad2_(end.getDate())}`;
  const stamp = new Date().toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
  const esc = (s) => String(s || '').replace(/[\\;,]/g, m => '\\' + m).replace(/\n/g, '\\n');
  return [
    'BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Yena Event//Reservation//FR', 'BEGIN:VEVENT',
    `UID:${booking.ref}@yena-event.fr`,
    `DTSTAMP:${stamp}`,
    `DTSTART;VALUE=DATE:${d}`,
    `DTEND;VALUE=DATE:${endStr}`,
    `SUMMARY:${esc(booking.service + ' — Yena Event')}`,
    `DESCRIPTION:${esc(`Référence : ${booking.ref}\nInvités : ${booking.guests}`)}`,
    `LOCATION:${esc(booking.location)}`,
    'END:VEVENT', 'END:VCALENDAR',
  ].join('\r\n');
}

async function sendToBackend_(booking) {
  const url = window.YENA_CONFIG && window.YENA_CONFIG.APPS_SCRIPT_URL;
  if (!url) return { ok: false, error: 'not_configured' };
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify(booking),
    });
    return await res.json();
  } catch (err) {
    return { ok: false, error: 'network_error' };
  }
}

bookingForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  if (!validateStep(4)) return;

  const service = SERVICES.find(s => s.id === selectedService);
  const ref = 'YE-' + Date.now().toString(36).toUpperCase();
  const booking = {
    ref,
    service: service ? service.title : '',
    eventDate: document.getElementById('eventDate').value,
    guests: document.getElementById('guests').value,
    location: document.getElementById('location').value,
    budget: document.getElementById('budget').value,
    fullName: document.getElementById('fullName').value,
    email: document.getElementById('email').value,
    phone: document.getElementById('phone').value,
    message: document.getElementById('message').value,
    typeClient: document.getElementById('typeClient').value,
    referralRef: document.getElementById('referralRef').value.trim(),
    typePrestation: document.getElementById('typePrestation').value,
    createdAt: new Date().toISOString(),
    hp: document.getElementById('hpBooking').value,
  };
  lastBooking = booking;

  submitBtn.disabled = true;
  const originalLabel = submitBtn.innerHTML;
  submitBtn.innerHTML = '<span class="spinner"></span>Envoi en cours…';

  try {
    const existing = JSON.parse(localStorage.getItem('yena_bookings') || '[]');
    existing.push(booking);
    // On ne garde que les 20 dernières demandes de cet appareil, pour éviter
    // une accumulation indéfinie de données personnelles dans le navigateur.
    localStorage.setItem('yena_bookings', JSON.stringify(existing.slice(-20)));
  } catch (err) { /* localStorage indisponible : on continue sans bloquer */ }

  const backendResult = await sendToBackend_(booking);

  submitBtn.disabled = false;
  submitBtn.innerHTML = originalLabel;

  document.getElementById('refNumber').textContent = ref;
  bookingForm.hidden = true;
  document.querySelector('.booking-progress').hidden = true;
  document.getElementById('bookingSuccess').hidden = false;

  const backendOk = backendResult && backendResult.ok;
  document.getElementById('mailtoRecap').hidden = backendOk;
  document.getElementById('emailNote').hidden = !backendOk;

  if (!backendOk) {
    const subject = encodeURIComponent(`Récapitulatif demande ${ref} — Yena Event`);
    const body = encodeURIComponent(
      `Bonjour,\n\nVoici le récapitulatif de votre demande :\n\n` +
      `Référence : ${ref}\nPrestation : ${booking.service}\nDate : ${booking.eventDate}\n` +
      `Invités : ${booking.guests}\nLieu : ${booking.location || '—'}\nBudget : ${booking.budget || '—'}\n` +
      `Contact : ${booking.fullName} — ${booking.email} — ${booking.phone}\n\n` +
      `Vous pourrez retrouver vos photos après l'évènement dans la section "Mes photos" du site, avec cette référence et votre email.\n\n` +
      `Merci de votre confiance,\nYena Event`
    );
    document.getElementById('mailtoRecap').href = `mailto:${booking.email}?subject=${subject}&body=${body}`;
  }

  showToast('Votre demande a été envoyée avec succès !');
});

document.getElementById('copyRefBtn').addEventListener('click', async (e) => {
  if (!lastBooking) return;
  try {
    await navigator.clipboard.writeText(lastBooking.ref);
    e.target.classList.add('copied');
    e.target.textContent = '✓';
    showToast('Référence copiée !');
    setTimeout(() => { e.target.classList.remove('copied'); e.target.textContent = '📋'; }, 1800);
  } catch (err) { showToast('Impossible de copier automatiquement, sélectionnez le texte.'); }
});

document.getElementById('addGoogleCalBtn').addEventListener('click', () => {
  if (!lastBooking) return;
  window.open(buildGoogleCalendarUrl_(lastBooking), '_blank', 'noopener');
});

document.getElementById('downloadIcsBtn').addEventListener('click', () => {
  if (!lastBooking) return;
  const blob = new Blob([buildIcsContent_(lastBooking)], { type: 'text/calendar;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `yena-event-${lastBooking.ref}.ics`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
});

document.getElementById('newRequestBtn').addEventListener('click', () => {
  bookingForm.reset();
  selectedService = null;
  serviceOptions.querySelectorAll('.option-card').forEach(el => el.classList.remove('selected'));
  currentStep = 1;
  bookingForm.hidden = false;
  document.querySelector('.booking-progress').hidden = false;
  document.getElementById('bookingSuccess').hidden = true;
  renderStep();
});

renderStep();

/* ====== Vérification de disponibilité ====== */
const availabilityHint = document.getElementById('availabilityHint');
let availabilityCheckToken = 0;

document.getElementById('eventDate').addEventListener('change', async (e) => {
  const date = e.target.value;
  const url = window.YENA_CONFIG && window.YENA_CONFIG.APPS_SCRIPT_URL;
  if (!date || !url) { availabilityHint.hidden = true; return; }

  const token = ++availabilityCheckToken;
  availabilityHint.hidden = false;
  availabilityHint.className = 'field-hint';
  availabilityHint.textContent = 'Vérification de la disponibilité…';

  const result = await sendToBackend_({ type: 'checkAvailability', date });
  if (token !== availabilityCheckToken) return; // une saisie plus récente a pris le dessus

  if (!result.ok) { availabilityHint.hidden = true; return; }
  if (result.taken) {
    availabilityHint.className = 'field-hint taken';
    availabilityHint.textContent = '⚠️ Cette date est déjà réservée — contactez-nous pour vérifier d\'autres créneaux.';
  } else {
    availabilityHint.className = 'field-hint free';
    availabilityHint.textContent = '✓ Cette date est disponible.';
  }
});

/* ====== Contact form ====== */
document.getElementById('contactForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const submitBtnContact = e.target.querySelector('button[type="submit"]');
  const originalLabel = submitBtnContact.innerHTML;
  submitBtnContact.disabled = true;
  submitBtnContact.innerHTML = '<span class="spinner"></span>Envoi…';

  const payload = {
    type: 'contact',
    name: document.getElementById('cName').value,
    email: document.getElementById('cEmail').value,
    message: document.getElementById('cMsg').value,
    hp: document.getElementById('hpContact').value,
  };
  const result = await sendToBackend_(payload);

  submitBtnContact.disabled = false;
  submitBtnContact.innerHTML = originalLabel;

  if (result.ok) {
    showToast('Merci ! Votre message a bien été envoyé.');
    e.target.reset();
  } else if (result.error === 'not_configured') {
    showToast('Merci ! Votre message a bien été envoyé.');
    e.target.reset();
  } else {
    showToast("Une erreur est survenue, réessayez ou appelez-nous directement.");
  }
});

/* ====== Newsletter ====== */
document.getElementById('newsletterForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const btn = e.target.querySelector('button[type="submit"]');
  const originalLabel = btn.textContent;
  btn.disabled = true;
  btn.textContent = '…';

  const email = document.getElementById('newsletterEmail').value;
  const hp = document.getElementById('hpNewsletter').value;
  const result = await sendToBackend_({ type: 'newsletter', email, hp });

  btn.disabled = false;
  btn.textContent = originalLabel;

  if (result.ok || result.error === 'not_configured') {
    showToast('Merci pour votre inscription à la newsletter !');
    e.target.reset();
  } else {
    showToast('Une erreur est survenue, réessayez plus tard.');
  }
});

/* ====== Mes Photos ====== */
const photosForm = document.getElementById('photosForm');
const photosResult = document.getElementById('photosResult');
const photosSubmitBtn = document.getElementById('photosSubmitBtn');

function showPhotosResult_(html, state) {
  photosResult.className = 'photos-result state-' + state;
  photosResult.innerHTML = html;
  photosResult.hidden = false;
}

photosForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  const ref = document.getElementById('photosRef').value.trim();
  const email = document.getElementById('photosEmail').value.trim();
  if (!ref || !email) return;

  const url = window.YENA_CONFIG && window.YENA_CONFIG.APPS_SCRIPT_URL;
  if (!url) {
    showPhotosResult_(
      `<h4>Service bientôt disponible</h4><p>La consultation des photos en ligne est en cours de mise en place. En attendant, Yena Event vous envoie le lien de votre dossier photos par email dès qu'il est prêt.</p>`,
      'pending'
    );
    return;
  }

  const originalLabel = photosSubmitBtn.textContent;
  photosSubmitBtn.disabled = true;
  photosSubmitBtn.innerHTML = '<span class="spinner"></span>Recherche…';

  try {
    const params = new URLSearchParams({ ref, email });
    const res = await fetch(`${url}?${params.toString()}`);
    const data = await res.json();

    if (!data.ok) {
      showPhotosResult_(
        `<h4>Aucune réservation trouvée</h4><p>Vérifiez votre référence et l'email utilisé lors de la réservation, ou contactez-nous directement.</p>`,
        'error'
      );
    } else {
      const statutBadge = `<p class="booking-status-badge">Statut de votre dossier : <strong>${escapeHtml_(data.statutReservation) || 'Nouvelle demande'}</strong></p>`;
      if (data.status === 'ready') {
        showPhotosResult_(
          statutBadge +
          `<h4>📸 Vos photos sont prêtes !</h4><p>${escapeHtml_(data.service)} — ${escapeHtml_(data.fullName)}</p>` +
          `<a href="${encodeURI(data.driveFolderUrl || '')}" target="_blank" rel="noopener" class="btn btn-primary">Ouvrir mon dossier photos</a>`,
          'ready'
        );
      } else {
        showPhotosResult_(
          statutBadge +
          `<h4>Vos photos arrivent bientôt</h4><p>Votre réservation (${escapeHtml_(data.service)}) est bien enregistrée. Yena Event dépose vos photos après l'évènement : revenez ensuite avec la même référence pour les consulter.</p>`,
          'pending'
        );
      }
    }
  } catch (err) {
    showPhotosResult_(`<h4>Erreur de connexion</h4><p>Impossible de contacter le service pour le moment, réessayez plus tard.</p>`, 'error');
  } finally {
    photosSubmitBtn.disabled = false;
    photosSubmitBtn.textContent = originalLabel;
  }
});

/* ====== Mon suivi (statut, calendrier, historique) ====== */
const suiviForm = document.getElementById('suiviForm');
const suiviResult = document.getElementById('suiviResult');
const suiviSubmitBtn = document.getElementById('suiviSubmitBtn');

function showSuiviResult_(html, state) {
  suiviResult.className = 'photos-result state-' + state;
  suiviResult.innerHTML = html;
  suiviResult.hidden = false;
}

async function checkBookingStatus_(ref, email) {
  const originalLabel = suiviSubmitBtn.textContent;
  suiviSubmitBtn.disabled = true;
  suiviSubmitBtn.innerHTML = '<span class="spinner"></span>Recherche…';

  const data = await sendToBackend_({ type: 'getBookingStatus', ref, email });

  suiviSubmitBtn.disabled = false;
  suiviSubmitBtn.textContent = originalLabel;

  if (!data.ok) {
    showSuiviResult_(`<h4>Aucune réservation trouvée</h4><p>Vérifiez votre référence et l'email utilisé lors de la réservation, ou contactez-nous directement.</p>`, 'error');
    return;
  }

  const parts = [];
  parts.push(`<p class="booking-status-badge">Statut : <strong>${escapeHtml_(data.statutReservation)}</strong></p>`);
  parts.push(`<h4>${escapeHtml_(data.service)}</h4>`);
  parts.push(`<p>Évènement du ${escapeHtml_(data.eventDate)}${data.location ? ' — ' + escapeHtml_(data.location) : ''}</p>`);

  if (data.statutReservation === 'Confirmé' && data.calendarAddUrl) {
    parts.push(`<a href="${encodeURI(data.calendarAddUrl)}" target="_blank" rel="noopener" class="btn btn-outline">📅 Ajouter à mon calendrier</a>`);
  }

  if (data.montantDevis) {
    parts.push(`<p>Devis : <strong>${escapeHtml_(data.montantDevis)} €</strong> — Acompte (${Math.round((data.depositPercent || 0.3) * 100)}%) : <strong>${escapeHtml_(data.montantAcompte)} €</strong> ${data.acomptePaye ? '— ✓ réglé' : '— en attente'}</p>`);
    if (!data.acomptePaye) {
      parts.push(`<a href="#acompte" class="btn btn-primary suivi-goto-tab">Régler mon acompte</a>`);
    }
  }

  if (data.statutPhotos === 'Prêt') {
    parts.push(`<a href="#photos" class="btn btn-outline suivi-goto-tab">📸 Voir mes photos</a>`);
  }

  if (data.history && data.history.length > 1) {
    const items = data.history.map(h =>
      `<li>${escapeHtml_(h.eventDate)} — ${escapeHtml_(h.service)} (${escapeHtml_(h.statutReservation)})</li>`
    ).join('');
    parts.push(`<p class="suivi-history-title">Vos réservations avec Yena Event :</p><ul class="suivi-history-list">${items}</ul>`);
  }

  showSuiviResult_(parts.join(''), 'ready');

  suiviResult.querySelectorAll('.suivi-goto-tab').forEach(link => {
    link.addEventListener('click', (e) => {
      e.preventDefault();
      activateTab_(link.getAttribute('href').slice(1));
      if (link.getAttribute('href') === '#acompte') {
        document.getElementById('depositRef').value = ref;
        document.getElementById('depositEmail').value = email;
      } else {
        document.getElementById('photosRef').value = ref;
        document.getElementById('photosEmail').value = email;
      }
    });
  });

  if (data.typePrestation === 'Photobooth') {
    currentSuiviRef_ = ref;
    currentSuiviEmail_ = email;
    document.getElementById('contourDescription').value = data.contourDescription || '';
    document.getElementById('err-contour').textContent = '';
    contourBlock.hidden = false;
  } else {
    contourBlock.hidden = true;
  }
}

suiviForm.addEventListener('submit', (e) => {
  e.preventDefault();
  const ref = document.getElementById('suiviRef').value.trim();
  const email = document.getElementById('suiviEmail').value.trim();
  if (!ref || !email) return;
  checkBookingStatus_(ref, email);
});

/* ====== Exemples de contour (photobooth) ====== */
const contourBlock = document.getElementById('contourBlock');
const contourForm = document.getElementById('contourForm');
const contourSubmitBtn = document.getElementById('contourSubmitBtn');
const CONTOUR_MAX_IMAGES = 3;
const CONTOUR_MAX_IMAGE_BYTES = 5 * 1024 * 1024;
let currentSuiviRef_ = null;
let currentSuiviEmail_ = null;

function fileToBase64_(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result).split(',')[1] || '');
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

contourForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  const errEl = document.getElementById('err-contour');
  errEl.textContent = '';
  if (!currentSuiviRef_ || !currentSuiviEmail_) return;

  const description = document.getElementById('contourDescription').value.trim();
  const files = Array.from(document.getElementById('contourImages').files || []);

  if (!description && !files.length) {
    errEl.textContent = 'Ajoutez une description ou au moins une image.';
    return;
  }
  if (files.length > CONTOUR_MAX_IMAGES) {
    errEl.textContent = `${CONTOUR_MAX_IMAGES} images maximum.`;
    return;
  }
  const tooLarge = files.find(f => f.size > CONTOUR_MAX_IMAGE_BYTES);
  if (tooLarge) {
    errEl.textContent = `"${tooLarge.name}" dépasse 5 Mo, choisissez une image plus légère.`;
    return;
  }

  const originalLabel = contourSubmitBtn.textContent;
  contourSubmitBtn.disabled = true;
  contourSubmitBtn.innerHTML = '<span class="spinner"></span>Envoi en cours…';

  try {
    const images = await Promise.all(files.map(async f => ({
      name: f.name,
      mimeType: f.type || 'image/jpeg',
      data: await fileToBase64_(f),
    })));

    const result = await sendToBackend_({
      type: 'submitContourPreferences',
      ref: currentSuiviRef_,
      email: currentSuiviEmail_,
      description,
      images,
    });

    if (result.ok) {
      showToast('Merci, vos préférences de contour ont bien été envoyées à Yena Event !');
      document.getElementById('contourImages').value = '';
    } else {
      errEl.textContent = "Impossible d'envoyer votre demande, réessayez ou contactez-nous.";
    }
  } catch (err) {
    errEl.textContent = 'Erreur lors de la lecture des images, réessayez.';
  } finally {
    contourSubmitBtn.disabled = false;
    contourSubmitBtn.textContent = originalLabel;
  }
});

/* ====== Acompte (paiement en ligne) ====== */
const depositForm = document.getElementById('depositForm');
const depositResult = document.getElementById('depositResult');
const depositSubmitBtn = document.getElementById('depositSubmitBtn');

function showDepositResult_(html, state) {
  depositResult.className = 'photos-result state-' + state;
  depositResult.innerHTML = html;
  depositResult.hidden = false;
}

async function checkDepositStatus_(ref, email) {
  const originalLabel = depositSubmitBtn.textContent;
  depositSubmitBtn.disabled = true;
  depositSubmitBtn.innerHTML = '<span class="spinner"></span>Recherche…';

  const data = await sendToBackend_({ type: 'depositStatus', ref, email, hp: document.getElementById('hpDeposit').value });

  depositSubmitBtn.disabled = false;
  depositSubmitBtn.textContent = originalLabel;

  if (!data.ok) {
    showDepositResult_(`<h4>Aucune réservation trouvée</h4><p>Vérifiez votre référence et l'email utilisé lors de la réservation, ou contactez-nous directement.</p>`, 'error');
    return;
  }
  if (data.statutReservation !== 'Confirmé') {
    showDepositResult_(`<h4>Réservation pas encore confirmée</h4><p>L'acompte sera disponible une fois votre devis validé et votre réservation confirmée par notre équipe.</p>`, 'pending');
    return;
  }
  if (!data.stripeConfigured) {
    showDepositResult_(`<h4>Paiement en ligne bientôt disponible</h4><p>Cette fonctionnalité est en cours de mise en place. Contactez-nous pour régler votre acompte autrement en attendant.</p>`, 'pending');
    return;
  }
  if (!data.montantDevis) {
    showDepositResult_(`<h4>Devis en cours</h4><p>Le montant de votre devis n'a pas encore été renseigné par notre équipe. Revenez bientôt.</p>`, 'pending');
    return;
  }
  if (data.acomptePaye) {
    showDepositResult_(`<h4>✓ Acompte réglé</h4><p>Merci, votre acompte de ${escapeHtml_(data.montantAcompte)} € a bien été reçu.</p>`, 'ready');
    return;
  }

  const percent = Math.round((data.depositPercent || 0.3) * 100);
  showDepositResult_(
    `<h4>Acompte à régler</h4><p>Montant de votre acompte (${percent}% du devis de ${escapeHtml_(data.montantDevis)} €) : <strong>${escapeHtml_(data.montantAcompte)} €</strong></p>` +
    `<button type="button" class="btn btn-primary" id="payDepositBtn">Payer ${escapeHtml_(data.montantAcompte)} € maintenant</button>`,
    'pending'
  );
  document.getElementById('payDepositBtn').addEventListener('click', async (e) => {
    const btn = e.currentTarget;
    const original = btn.textContent;
    btn.disabled = true;
    btn.innerHTML = '<span class="spinner"></span>Redirection vers le paiement…';
    const result = await sendToBackend_({ type: 'createDepositCheckout', ref, email });
    if (result.ok && result.url) {
      window.location.href = result.url;
    } else {
      btn.disabled = false;
      btn.textContent = original;
      showToast("Impossible de démarrer le paiement, réessayez ou contactez-nous.");
    }
  });
}

depositForm.addEventListener('submit', (e) => {
  e.preventDefault();
  const ref = document.getElementById('depositRef').value.trim();
  const email = document.getElementById('depositEmail').value.trim();
  if (!ref || !email) return;
  checkDepositStatus_(ref, email);
});

// Retour depuis Stripe Checkout (?ref=...&session_id=...), ou lien direct
// envoyé par email dès qu'un devis est prêt (?ref=...&email=...#acompte).
(function handleDepositLinkReturn_() {
  const params = new URLSearchParams(location.search);
  const ref = params.get('ref');
  const email = params.get('email');
  const sessionId = params.get('session_id');
  if (!ref) return;

  document.getElementById('depositRef').value = ref;
  if (email) document.getElementById('depositEmail').value = email;
  // Nettoie l'URL (ces paramètres n'ont plus lieu d'être une fois lus) sans
  // recharger la page ni perdre l'onglet actif.
  history.replaceState(null, '', location.pathname + location.hash);

  if (sessionId) {
    sendToBackend_({ type: 'confirmDepositPayment', ref, sessionId }).then(result => {
      showToast(result.ok
        ? 'Paiement confirmé, merci !'
        : "Paiement reçu par Stripe, confirmation en cours — vérifiez dans quelques instants ou contactez-nous.");
    });
  } else if (email) {
    checkDepositStatus_(ref, email);
  }
})();
