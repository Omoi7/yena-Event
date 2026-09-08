'use strict';

document.getElementById('year').textContent = new Date().getFullYear();

/* ====== Toast ====== */
function showToast(msg, duration = 3200) {
  const toast = document.getElementById('toast');
  toast.textContent = msg;
  toast.classList.add('show');
  clearTimeout(showToast._t);
  showToast._t = setTimeout(() => toast.classList.remove('show'), duration);
}

/* ====== Header scroll + mobile nav ====== */
const header = document.getElementById('siteHeader');
const burger = document.getElementById('burger');
const mainNav = document.getElementById('mainNav');

const scrollProgress = document.getElementById('scrollProgress');
window.addEventListener('scroll', () => {
  header.classList.toggle('scrolled', window.scrollY > 12);
  document.getElementById('backToTop').classList.toggle('show', window.scrollY > 600);
  const docHeight = document.documentElement.scrollHeight - window.innerHeight;
  const pct = docHeight > 0 ? (window.scrollY / docHeight) * 100 : 0;
  scrollProgress.style.width = pct + '%';
}, { passive: true });

burger.addEventListener('click', () => {
  const open = mainNav.classList.toggle('open');
  burger.classList.toggle('open', open);
  burger.setAttribute('aria-expanded', String(open));
});

mainNav.querySelectorAll('a').forEach(a => a.addEventListener('click', () => {
  mainNav.classList.remove('open');
  burger.classList.remove('open');
  burger.setAttribute('aria-expanded', 'false');
}));

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
  document.getElementById('reservation').scrollIntoView({ behavior: 'smooth' });
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
const GALLERY = [
  { label: 'Mariage au domaine des Roses', tall: true },
  { label: 'Anniversaire thème doré' },
  { label: 'Séminaire corporate' },
  { label: 'Gala de charité', tall: true },
  { label: 'Baptême champêtre' },
  { label: 'Lancement de produit' },
  { label: 'Décoration florale' },
  { label: 'Soirée VIP' },
];
const palette = ['var(--brown)', 'var(--brown-light)', 'var(--gold)', 'var(--brown-950)'];
const galleryGrid = document.getElementById('galleryGrid');
GALLERY.forEach((g, i) => {
  const div = document.createElement('div');
  div.className = 'gallery-item' + (g.tall ? ' tall' : '');
  div.style.background = `linear-gradient(160deg, ${palette[i % palette.length]}, var(--beige))`;
  div.innerHTML = `<span>${g.label}</span>`;
  galleryGrid.appendChild(div);
});

/* ====== Testimonials ====== */
const TESTIMONIALS = [
  { text: "Yena Event a organisé notre mariage de A à Z. Tout était parfait, nous n'avons eu qu'à profiter de la journée.", author: "Camille & Antoine", role: "Mariage, 120 invités" },
  { text: "Un professionnalisme remarquable pour notre séminaire d'entreprise. Logistique impeccable et équipe très réactive.", author: "Sophie Marchand", role: "Directrice RH, Nova Corp" },
  { text: "Le baptême de notre fille était magnifique, chaque détail avait été pensé. Merci à toute l'équipe !", author: "Julien Petit", role: "Baptême" },
  { text: "Notre gala caritatif a été un franc succès grâce à leur créativité et leur sens de l'organisation.", author: "Fondation Lumière", role: "Gala annuel" },
];
const track = document.getElementById('testimonialTrack');
const dotsWrap = document.getElementById('testimonialDots');
TESTIMONIALS.forEach((t, i) => {
  const card = document.createElement('div');
  card.className = 'testimonial-card';
  card.innerHTML = `
    <div class="stars">★★★★★</div>
    <p>"${t.text}"</p>
    <strong>${t.author}</strong>
    <span>${t.role}</span>
  `;
  track.appendChild(card);
  const dot = document.createElement('button');
  if (i === 0) dot.classList.add('active');
  dot.addEventListener('click', () => goToSlide(i));
  dotsWrap.appendChild(dot);
});
let slideIndex = 0;
function goToSlide(i) {
  slideIndex = (i + TESTIMONIALS.length) % TESTIMONIALS.length;
  track.style.transform = `translateX(-${slideIndex * 100}%)`;
  dotsWrap.querySelectorAll('button').forEach((d, idx) => d.classList.toggle('active', idx === slideIndex));
}
setInterval(() => goToSlide(slideIndex + 1), 6000);

/* ====== FAQ ====== */
const FAQ = [
  { q: "Combien de temps à l'avance dois-je réserver ?", a: "Nous recommandons de nous contacter 3 à 12 mois avant votre évènement selon sa taille, mais nous étudions aussi les demandes plus urgentes." },
  { q: "Le devis est-il gratuit et sans engagement ?", a: "Oui. Après votre demande, vous recevez un devis détaillé sous 48h. Vous êtes libre de l'accepter ou non avant toute validation définitive." },
  { q: "Comment se déroule la validation d'une prestation ?", a: "Une fois le devis accepté, vous validez la prestation en ligne ou par signature, un acompte est demandé pour bloquer la date, puis nous démarrons l'organisation." },
  { q: "Travaillez-vous partout en France ?", a: "Nous intervenons principalement en Île-de-France et pouvons nous déplacer partout en France pour les évènements de plus grande envergure." },
  { q: "Puis-je modifier ma demande après l'avoir envoyée ?", a: "Bien sûr, notre équipe vous recontacte pour affiner chaque détail avant la validation finale du devis." },
];
const accordion = document.getElementById('accordion');
FAQ.forEach(item => {
  const el = document.createElement('div');
  el.className = 'accordion-item';
  el.innerHTML = `
    <button type="button" class="accordion-btn">${item.q}<span class="plus">+</span></button>
    <div class="accordion-panel"><p>${item.a}</p></div>
  `;
  accordion.appendChild(el);
  const btn = el.querySelector('.accordion-btn');
  const panel = el.querySelector('.accordion-panel');
  btn.addEventListener('click', () => {
    const isOpen = el.classList.contains('open');
    accordion.querySelectorAll('.accordion-item').forEach(other => {
      other.classList.remove('open');
      other.querySelector('.accordion-panel').style.maxHeight = null;
    });
    if (!isOpen) {
      el.classList.add('open');
      panel.style.maxHeight = panel.scrollHeight + 'px';
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
  const dateFmt = date ? new Date(date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' }) : '—';

  document.getElementById('summaryBox').innerHTML = `
    <dl>
      <dt>Prestation</dt><dd>${service ? service.icon + ' ' + service.title : '—'}</dd>
      <dt>Date</dt><dd>${dateFmt}</dd>
      <dt>Invités</dt><dd>${guests || '—'}</dd>
      <dt>Lieu</dt><dd>${location}</dd>
      <dt>Budget</dt><dd>${budget}</dd>
      <dt>Contact</dt><dd>${name} · ${email} · ${phone}</dd>
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
    createdAt: new Date().toISOString(),
  };
  lastBooking = booking;

  submitBtn.disabled = true;
  const originalLabel = submitBtn.innerHTML;
  submitBtn.innerHTML = '<span class="spinner"></span>Envoi en cours…';

  try {
    const existing = JSON.parse(localStorage.getItem('yena_bookings') || '[]');
    existing.push(booking);
    localStorage.setItem('yena_bookings', JSON.stringify(existing));
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
  const result = await sendToBackend_({ type: 'newsletter', email });

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
    } else if (data.status === 'ready') {
      showPhotosResult_(
        `<h4>📸 Vos photos sont prêtes !</h4><p>${data.service || ''} — ${data.fullName || ''}</p>` +
        `<a href="${data.driveFolderUrl}" target="_blank" rel="noopener" class="btn btn-primary">Ouvrir mon dossier photos</a>`,
        'ready'
      );
    } else {
      showPhotosResult_(
        `<h4>Vos photos arrivent bientôt</h4><p>Votre réservation (${data.service || ''}) est bien enregistrée. Yena Event dépose vos photos après l'évènement : revenez ensuite avec la même référence pour les consulter.</p>`,
        'pending'
      );
    }
  } catch (err) {
    showPhotosResult_(`<h4>Erreur de connexion</h4><p>Impossible de contacter le service pour le moment, réessayez plus tard.</p>`, 'error');
  } finally {
    photosSubmitBtn.disabled = false;
    photosSubmitBtn.textContent = originalLabel;
  }
});
