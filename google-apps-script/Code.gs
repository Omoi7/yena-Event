/**
 * Yena Event — Backend Google Apps Script
 * =========================================
 * Relie le site web à Google Calendar, Google Drive et Gmail :
 *  - Chaque réservation validée sur le site crée un évènement dans l'agenda
 *    Google de Yena ET un dossier dans Drive (dans le dossier "Événements"),
 *    exactement comme le fait Yena manuellement aujourd'hui.
 *  - Un email de confirmation est envoyé automatiquement au client, et un
 *    email de notification est envoyé à Yena pour chaque nouvelle demande.
 *  - Le formulaire de contact du site envoie aussi un email automatique à
 *    Yena (plus besoin de vérifier le site à la main).
 *  - Deux jours après la date de l'évènement, un email est envoyé
 *    automatiquement au client pour lui demander de laisser un avis Google.
 *  - Une fois les photos déposées par Yena et le statut passé à "Prêt" dans
 *    le tableau, les clients peuvent retrouver leurs photos depuis le site
 *    en indiquant leur référence de réservation + leur email.
 *
 * INSTALLATION / MISE À JOUR (connecté à yena.event7@gmail.com) :
 *  1. Allez sur https://script.google.com/home, ouvrez le projet
 *     "Yena Event Backend" déjà créé (ou https://script.new pour un premier
 *     déploiement — voir le README du dépôt pour le détail des étapes).
 *  2. Remplacez tout le contenu par celui de ce fichier. Ctrl+S.
 *  3. Déployer > Gérer les déploiements > ✏️ (crayon) sur le déploiement
 *     existant > Version : "Nouvelle version" > Déployer.
 *     (Pas besoin de recréer un nouveau déploiement : l'URL reste la même,
 *     donc pas besoin de retoucher js/config.js.)
 *  4. **Étape à faire une seule fois, obligatoire pour les emails d'avis** :
 *     dans l'éditeur, en haut, sélectionnez la fonction `initialiser` dans le
 *     menu déroulant (à côté du bouton ▶️ Exécuter), puis cliquez ▶️ Exécuter.
 *     Google va redemander une autorisation (normal, c'est une nouvelle
 *     permission : envoyer des emails en votre nom) — Autoriser l'accès,
 *     choisissez yena.event7@gmail.com, "Paramètres avancés" > "Accéder à
 *     [nom du projet]" si besoin. Cette étape installe un déclencheur
 *     automatique qui tourne tous les jours à 10h, sans plus jamais rien
 *     demander ensuite.
 *
 * Cette autorisation ponctuelle est une exigence de sécurité de Google (un
 * script qui va envoyer des emails tout seul, sans supervision, doit être
 * validé une fois par un humain) — ce n'est pas contournable, mais c'est la
 * seule action manuelle : tout le reste tourne ensuite sans intervention.
 */

const OWNER_EMAIL = 'yena.event7@gmail.com';
const SITE_URL = 'https://omoi7.github.io/yena-Event/';
const GOOGLE_REVIEW_LINK = 'https://maps.app.goo.gl/5UB9AKGLjTxDrgbWA';

// Nombre de jours après la date de l'évènement avant l'envoi de la demande d'avis.
const DELAI_AVIS_JOURS = 2;

// ID du dossier Drive "Événements" où sont déjà rangés tous les dossiers clients.
const EVENTS_FOLDER_ID = '1TE3TYCJag1w4jG2-uyGnAdXBEhA3fAOd';

// ID du Google Sheet "Yena Event – Réservations (site web)" qui sert de base
// de données. Le script est autonome (pas besoin d'être ouvert depuis le
// Sheet) : il ouvre ce classeur par son ID à chaque appel.
const SHEET_ID = '1ejDBSsaLYz62OhlqiZL4FLA9ji1IfJoh7a9ujHm8j6k';

const HEADERS = [
  'Référence', 'Date de la demande', 'Prestation', 'Date évènement', 'Invités',
  'Lieu', 'Budget', 'Nom', 'Email', 'Téléphone', 'Message', 'Statut photos',
  'ID dossier Drive', 'Lien dossier Drive', 'ID évènement Calendar', 'Lien évènement Calendar',
  'Avis demandé',
];

const COL = HEADERS.reduce((acc, name, i) => { acc[name] = i; return acc; }, {});

function getSheet_() {
  const ss = SpreadsheetApp.openById(SHEET_ID);
  const sheet = ss.getSheets()[0];
  // Écrit ou complète la ligne d'en-têtes (ajoute les nouvelles colonnes sans
  // toucher aux lignes de données existantes) — permet de mettre à jour le
  // script sans jamais avoir à retoucher le Sheet à la main.
  const currentHeaders = sheet.getLastRow() > 0 ? sheet.getRange(1, 1, 1, Math.max(sheet.getLastColumn(), 1)).getValues()[0] : [];
  const needsUpdate = HEADERS.some((h, i) => currentHeaders[i] !== h);
  if (needsUpdate) {
    sheet.getRange(1, 1, 1, HEADERS.length).setValues([HEADERS]);
  }
  return sheet;
}

function jsonOut_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}

function slugify_(text) {
  return String(text || '')
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/[^a-zA-Z0-9]+/g, '')
    .trim() || 'Client';
}

function doPost(e) {
  try {
    const data = JSON.parse(e.postData.contents);
    if (data.type === 'contact') return handleContact_(data);
    return handleBooking_(data);
  } catch (err) {
    return jsonOut_({ ok: false, error: 'server_error', message: String(err) });
  }
}

/** Message envoyé depuis le formulaire de contact du site. */
function handleContact_(data) {
  if (!data.name || !data.email || !data.message) {
    return jsonOut_({ ok: false, error: 'missing_field' });
  }
  GmailApp.sendEmail(OWNER_EMAIL, `Nouveau message via le site — ${data.name}`, [
    `Nom : ${data.name}`,
    `Email : ${data.email}`,
    '',
    'Message :',
    data.message,
  ].join('\n'), { replyTo: data.email, name: 'Site Yena Event' });

  return jsonOut_({ ok: true });
}

/** Réception d'une nouvelle réservation depuis le site. */
function handleBooking_(data) {
  const required = ['ref', 'service', 'eventDate', 'guests', 'fullName', 'email', 'phone'];
  for (const key of required) {
    if (!data[key]) return jsonOut_({ ok: false, error: 'missing_field', field: key });
  }

  const sheet = getSheet_();

  // Idempotence : si la référence existe déjà, on renvoie les infos existantes
  // sans rien recréer ni renvoyer d'email en double.
  const existing = findRowByRef_(sheet, data.ref);
  if (existing) {
    return jsonOut_({
      ok: true,
      ref: data.ref,
      calendarEventUrl: existing[COL['Lien évènement Calendar']],
      driveFolderUrl: existing[COL['Lien dossier Drive']],
    });
  }

  // --- Google Calendar : création de l'évènement (journée entière) ---
  const eventDate = new Date(data.eventDate + 'T00:00:00');
  const title = `${data.service} — ${data.fullName}`;
  const description = [
    `Référence : ${data.ref}`,
    `Invités : ${data.guests}`,
    `Lieu : ${data.location || 'non précisé'}`,
    `Budget : ${data.budget || 'non précisé'}`,
    `Téléphone : ${data.phone}`,
    `Email : ${data.email}`,
    data.message ? `Message : ${data.message}` : '',
  ].filter(Boolean).join('\n');

  const calendar = CalendarApp.getDefaultCalendar();
  const calEvent = calendar.createAllDayEvent(title, eventDate, {
    description,
    location: data.location || '',
  });

  // --- Google Drive : création du dossier client dans "Événements" ---
  const folderName = `${data.eventDate}_${slugify_(data.fullName.split(' ')[0])}_${slugify_(data.service)}`;
  const parentFolder = DriveApp.getFolderById(EVENTS_FOLDER_ID);
  const clientFolder = parentFolder.createFolder(folderName);
  try {
    clientFolder.addViewer(data.email);
  } catch (shareErr) {
    // L'email peut être invalide ou déjà propriétaire : on ignore sans bloquer la réservation.
  }

  const calendarEventUrl = buildCalendarEventUrl_(calEvent.getId(), calendar.getId());
  const driveFolderUrl = clientFolder.getUrl();

  // --- Enregistrement dans le tableau ---
  sheet.appendRow([
    data.ref, new Date(), data.service, data.eventDate, data.guests,
    data.location || '', data.budget || '', data.fullName, data.email, data.phone,
    data.message || '', 'En attente', clientFolder.getId(), driveFolderUrl,
    calEvent.getId(), calendarEventUrl, '',
  ]);

  sendBookingEmails_(data, calendarEventUrl, driveFolderUrl);

  return jsonOut_({ ok: true, ref: data.ref, calendarEventUrl, driveFolderUrl });
}

/** Email de confirmation au client + notification à Yena pour chaque nouvelle demande. */
function sendBookingEmails_(data, calendarEventUrl, driveFolderUrl) {
  const clientBody = [
    `Bonjour ${data.fullName},`,
    '',
    `Nous avons bien reçu votre demande de réservation pour : ${data.service}.`,
    '',
    `Référence : ${data.ref}`,
    `Date souhaitée : ${data.eventDate}`,
    `Invités : ${data.guests}`,
    `Lieu : ${data.location || 'à confirmer'}`,
    `Budget : ${data.budget || 'à confirmer'}`,
    '',
    "Notre équipe revient vers vous sous 48h pour finaliser votre devis et confirmer la prestation.",
    `Conservez votre référence : elle vous permettra de retrouver vos photos après l'évènement sur ${SITE_URL}#photos.`,
    '',
    'Merci de votre confiance,',
    'Yena Event',
  ].join('\n');
  GmailApp.sendEmail(data.email, `Confirmation de votre demande — ${data.ref}`, clientBody, { name: 'Yena Event' });

  const ownerBody = [
    'Nouvelle demande de réservation reçue sur le site :',
    '',
    `Référence : ${data.ref}`,
    `Prestation : ${data.service}`,
    `Date : ${data.eventDate}`,
    `Invités : ${data.guests}`,
    `Lieu : ${data.location || '—'}`,
    `Budget : ${data.budget || '—'}`,
    `Client : ${data.fullName} — ${data.email} — ${data.phone}`,
    `Message : ${data.message || '—'}`,
    '',
    `Évènement Calendar : ${calendarEventUrl}`,
    `Dossier Drive : ${driveFolderUrl}`,
    `Tableau de suivi : https://docs.google.com/spreadsheets/d/${SHEET_ID}/edit`,
  ].join('\n');
  GmailApp.sendEmail(OWNER_EMAIL, `Nouvelle demande — ${data.service} (${data.ref})`, ownerBody, { name: 'Site Yena Event' });
}

/** Consultation "Mes photos" : ?ref=...&email=... */
function doGet(e) {
  try {
    const ref = (e.parameter.ref || '').trim();
    const email = (e.parameter.email || '').trim().toLowerCase();
    if (!ref || !email) return jsonOut_({ ok: false, error: 'missing_params' });

    const sheet = getSheet_();
    const row = findRowByRef_(sheet, ref);
    if (!row || String(row[COL['Email']]).trim().toLowerCase() !== email) {
      return jsonOut_({ ok: false, error: 'not_found' });
    }

    const status = row[COL['Statut photos']];
    const base = {
      ok: true,
      ref,
      service: row[COL['Prestation']],
      eventDate: row[COL['Date évènement']],
      fullName: row[COL['Nom']],
    };

    if (status === 'Prêt' && row[COL['Lien dossier Drive']]) {
      return jsonOut_(Object.assign(base, {
        status: 'ready',
        driveFolderUrl: row[COL['Lien dossier Drive']],
      }));
    }
    return jsonOut_(Object.assign(base, { status: 'pending' }));
  } catch (err) {
    return jsonOut_({ ok: false, error: 'server_error', message: String(err) });
  }
}

/**
 * Envoie une demande d'avis Google aux clients dont l'évènement a eu lieu il
 * y a `DELAI_AVIS_JOURS` jours ou plus, et qui n'en ont pas encore reçu une.
 * Appelée automatiquement tous les jours par le déclencheur installé via
 * `initialiser()` — aucune action manuelle nécessaire une fois ce dernier lancé.
 */
function envoyerDemandesAvis() {
  const sheet = getSheet_();
  const values = sheet.getDataRange().getValues();
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  for (let i = 1; i < values.length; i++) {
    const row = values[i];
    const rawDate = row[COL['Date évènement']];
    const dejaEnvoye = row[COL['Avis demandé']];
    const email = row[COL['Email']];
    if (!rawDate || dejaEnvoye === 'Oui' || !email) continue;

    const eventDate = rawDate instanceof Date ? rawDate : new Date(rawDate + 'T00:00:00');
    eventDate.setHours(0, 0, 0, 0);
    const joursEcoules = Math.floor((today - eventDate) / 86400000);
    if (joursEcoules < DELAI_AVIS_JOURS) continue;

    const fullName = row[COL['Nom']];
    const service = row[COL['Prestation']];
    const body = [
      `Bonjour ${fullName},`,
      '',
      `Merci d'avoir fait confiance à Yena Event pour votre évènement (${service}) !`,
      "Nous espérons que ce moment vous a plu autant qu'à nous de l'avoir organisé.",
      '',
      "Votre avis compte beaucoup pour nous et aide d'autres futurs mariés, familles et entreprises à nous découvrir.",
      `Laisser un avis Google (2 minutes) : ${GOOGLE_REVIEW_LINK}`,
      '',
      'Merci encore et à bientôt,',
      'Yena Event',
    ].join('\n');

    GmailApp.sendEmail(email, "Votre avis compte pour nous — Yena Event", body, { name: 'Yena Event' });
    sheet.getRange(i + 1, COL['Avis demandé'] + 1).setValue('Oui');
  }
}

/**
 * À exécuter UNE SEULE FOIS depuis l'éditeur Apps Script (bouton ▶️ Exécuter,
 * fonction "initialiser") après chaque déploiement initial. Installe le
 * déclencheur quotidien pour les demandes d'avis automatiques. Peut être
 * relancée sans risque : elle ne crée jamais de doublon.
 */
function initialiser() {
  ScriptApp.getProjectTriggers().forEach(t => {
    if (t.getHandlerFunction() === 'envoyerDemandesAvis') ScriptApp.deleteTrigger(t);
  });
  ScriptApp.newTrigger('envoyerDemandesAvis').timeBased().everyDays(1).atHour(10).create();
}

function buildCalendarEventUrl_(eventId, calendarId) {
  const raw = `${eventId} ${calendarId}`;
  const encoded = Utilities.base64Encode(raw).replace(/=+$/, '');
  return `https://calendar.google.com/calendar/event?eid=${encoded}`;
}

function findRowByRef_(sheet, ref) {
  const values = sheet.getDataRange().getValues();
  for (let i = 1; i < values.length; i++) {
    if (String(values[i][COL['Référence']]).trim() === String(ref).trim()) return values[i];
  }
  return null;
}
