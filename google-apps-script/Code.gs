/**
 * Yena Event — Backend Google Apps Script
 * =========================================
 * Relie le site web à Google Calendar et Google Drive :
 *  - Chaque réservation validée sur le site crée un évènement dans l'agenda
 *    Google de Yena ET un dossier dans Drive (dans le dossier "Événements"),
 *    exactement comme le fait Yena manuellement aujourd'hui.
 *  - Une fois les photos déposées par Yena et le statut passé à "Prêt" dans
 *    le tableau, les clients peuvent retrouver leurs photos depuis le site
 *    en indiquant leur référence de réservation + leur email.
 *
 * INSTALLATION (5 minutes, une seule fois) :
 *  1. Ouvrez le Google Sheet "Yena Event – Réservations (site web)" dans Drive.
 *  2. Menu Extensions > Apps Script.
 *  3. Supprimez le contenu par défaut et collez tout le contenu de ce fichier.
 *  4. Cliquez sur "Déployer" > "Nouveau déploiement".
 *     - Type : "Application Web"
 *     - Exécuter en tant que : Moi (yena.event7@gmail.com)
 *     - Qui a accès : Tout le monde
 *  5. Copiez l'URL de l'application Web fournie.
 *  6. Collez cette URL dans js/config.js du site, dans APPS_SCRIPT_URL.
 *  7. Ré-autorisez le script si Google le demande (c'est votre propre script).
 */

// ID du dossier Drive "Événements" où sont déjà rangés tous les dossiers clients.
const EVENTS_FOLDER_ID = '1TE3TYCJag1w4jG2-uyGnAdXBEhA3fAOd';

const HEADERS = [
  'Référence', 'Date de la demande', 'Prestation', 'Date évènement', 'Invités',
  'Lieu', 'Budget', 'Nom', 'Email', 'Téléphone', 'Message', 'Statut photos',
  'ID dossier Drive', 'Lien dossier Drive', 'ID évènement Calendar', 'Lien évènement Calendar',
];

const COL = HEADERS.reduce((acc, name, i) => { acc[name] = i; return acc; }, {});

function getSheet_() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheets()[0];
  if (sheet.getLastRow() === 0) {
    sheet.appendRow(HEADERS);
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

/** Réception d'une nouvelle réservation depuis le site. */
function doPost(e) {
  try {
    const data = JSON.parse(e.postData.contents);
    const required = ['ref', 'service', 'eventDate', 'guests', 'fullName', 'email', 'phone'];
    for (const key of required) {
      if (!data[key]) return jsonOut_({ ok: false, error: 'missing_field', field: key });
    }

    const sheet = getSheet_();

    // Idempotence : si la référence existe déjà, on renvoie les infos existantes.
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

    // --- Enregistrement dans le tableau ---
    sheet.appendRow([
      data.ref,
      new Date(),
      data.service,
      data.eventDate,
      data.guests,
      data.location || '',
      data.budget || '',
      data.fullName,
      data.email,
      data.phone,
      data.message || '',
      'En attente',
      clientFolder.getId(),
      clientFolder.getUrl(),
      calEvent.getId(),
      calendarEventUrl,
    ]);

    return jsonOut_({
      ok: true,
      ref: data.ref,
      calendarEventUrl,
      driveFolderUrl: clientFolder.getUrl(),
    });
  } catch (err) {
    return jsonOut_({ ok: false, error: 'server_error', message: String(err) });
  }
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
