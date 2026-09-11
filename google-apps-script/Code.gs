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
 *  - Une newsletter : Yena écrit son texte dans l'onglet "Newsletter
 *    Campagnes" du Sheet, passe la colonne Statut à "Envoyer maintenant", et
 *    le déclencheur quotidien l'envoie automatiquement à tous les anciens
 *    clients (récupérés depuis le tableau de réservations) et aux personnes
 *    inscrites via le formulaire du site — avec lien de désinscription.
 *  - Une fois les photos déposées par Yena et le statut passé à "Prêt" dans
 *    le tableau, les clients peuvent retrouver leurs photos depuis le site
 *    en indiquant leur référence de réservation + leur email.
 *  - Rappel automatique 7 jours avant un évènement CONFIRMÉ (colonne
 *    "Statut réservation" = "Confirmé"), pour le client.
 *  - Vérification de disponibilité en direct sur le formulaire du site : une
 *    date déjà occupée par une réservation confirmée est signalée au client.
 *  - Galerie publique du site alimentée depuis l'onglet "Galerie" du Sheet
 *    (gérable directement depuis la page admin, distincte des dossiers
 *    photos privés des clients).
 *  - Une page d'administration (admin.html) permet à Yena de faire tout ça
 *    (voir les réservations, changer leur statut de suivi, marquer des
 *    photos prêtes, gérer la galerie, écrire et envoyer une newsletter,
 *    exporter les réservations en CSV) directement depuis le site, sans
 *    toucher au Sheet. Protégée par un mot de passe (ADMIN_KEY) qui doit
 *    être configuré dans les propriétés du script — voir ÉTAPE ADMIN
 *    ci-dessous. Ce mot de passe ne doit JAMAIS être écrit dans ce fichier
 *    ni commité sur GitHub (le dépôt est public) : il vit uniquement dans
 *    les propriétés du script.
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
 *  4. **Étape à faire une seule fois (ou à refaire après cette mise à jour)** :
 *     dans l'éditeur, en haut, sélectionnez la fonction `initialiser` dans le
 *     menu déroulant (à côté du bouton ▶️ Exécuter), puis cliquez ▶️ Exécuter.
 *     Google peut redemander une autorisation (normal si c'est une nouvelle
 *     permission) — Autoriser l'accès, choisissez yena.event7@gmail.com,
 *     "Paramètres avancés" > "Accéder à [nom du projet]" si besoin. Cette
 *     étape (ré)installe le déclencheur automatique quotidien (10h).
 *  5. **Recommandé, une seule fois** : sélectionnez la fonction
 *     `envoyerNewsletter` dans le même menu déroulant et cliquez ▶️ Exécuter.
 *     Comme aucune campagne n'est encore à "Envoyer maintenant", ça n'envoie
 *     aucun email, mais ça crée immédiatement les onglets "Newsletter
 *     Abonnés" et "Newsletter Campagnes" dans le Sheet, et remplit la liste
 *     des abonnés avec tous vos anciens clients.
 *  6. **ÉTAPE ADMIN, une seule fois** : dans l'éditeur, cliquez sur l'icône
 *     ⚙️ "Paramètres du projet" (menu de gauche) > section "Propriétés du
 *     script" > "Ajouter une propriété de script" :
 *       - Propriété : ADMIN_KEY
 *       - Valeur : un mot de passe fort de votre choix (gardez-le secret,
 *         c'est lui qui protège l'accès à la page d'administration)
 *     Cliquez "Enregistrer les propriétés du script". C'est ce mot de passe
 *     que vous saisirez sur la page /admin.html du site.
 *
 * Cette autorisation ponctuelle est une exigence de sécurité de Google (un
 * script qui va envoyer des emails tout seul, sans supervision, doit être
 * validé une fois par un humain) — ce n'est pas contournable, mais c'est la
 * seule action manuelle : tout le reste tourne ensuite sans intervention.
 */

const OWNER_EMAIL = 'yena.event7@gmail.com';
const SITE_URL = 'https://omoi7.github.io/yena-Event/';
const GOOGLE_REVIEW_LINK = 'https://maps.app.goo.gl/5UB9AKGLjTxDrgbWA';

// Avis Google réels affichés sur le site (section "Avis") : deux façons de
// les récupérer, au choix (la première est gratuite). Tant qu'aucune des
// deux n'est configurée, le site utilise des avis d'exemple à la place
// (aucune erreur, dégradation silencieuse).
//
// OPTION 1 — SerpApi (RECOMMANDÉE, gratuite, sans carte bancaire) :
//   - Une seule propriété du script à ajouter : SERPAPI_KEY.
//   - Étapes : créer un compte gratuit sur https://serpapi.com/users/sign_up
//     (email suffit, pas de carte bancaire — plan gratuit : 250 recherches/
//     mois). Une fois connecté, copier la clé API sur
//     https://serpapi.com/manage-api-key.
//   - Dans l'éditeur Apps Script : ⚙️ Paramètres du projet > Propriétés du
//     script > "Ajouter une propriété de script" > Propriété : SERPAPI_KEY,
//     Valeur : la clé copiée. Enregistrer.
//   - Rien d'autre à faire : le script retrouve lui-même la fiche "Yena
//     Event" (voir SERPAPI_BUSINESS_QUERY ci-dessous) et met les résultats
//     en cache (24h pour les avis, 30 jours pour l'identifiant de la fiche)
//     pour rester très largement sous le quota gratuit mensuel.
//
// OPTION 2 — API Google Places (payante depuis 2025, pas de vrai palier
// gratuit) : nécessite un compte de facturation Google Cloud avec carte
// bancaire enregistrée. À réserver au cas où SerpApi ne conviendrait pas.
//   - GOOGLE_PLACES_API_KEY : clé API Google Cloud (API "Places API" activée)
//   - GOOGLE_PLACE_ID       : identifiant de la fiche Google Yena Event
//   Étapes : console.cloud.google.com > activer la facturation puis "API et
//   services" > "Bibliothèque" > "Places API" > Activer ; "Identifiants" >
//   "Créer des identifiants" > "Clé API" (la restreindre à "Places API") ;
//   trouver le Place ID via
//   https://developers.google.com/maps/documentation/places/web-service/place-id ;
//   ajouter les deux propriétés dans les propriétés du script comme pour
//   l'option 1.
//
// Si les deux sont configurées, SerpApi est utilisée en priorité.
const SERPAPI_BUSINESS_QUERY = 'Yena Event, Île-de-France, France';

// Paiement de l'acompte en ligne (Stripe Checkout) : une seule propriété du
// script à ajouter, en plus de celles déjà listées ci-dessus :
//   - STRIPE_SECRET_KEY : clé secrète Stripe (commence par sk_test_... en
//     mode test, sk_live_... en mode réel — JAMAIS la clé publique pk_...,
//     et jamais écrite ici ni commitée : uniquement dans les propriétés du
//     script, comme ADMIN_KEY).
// Tant qu'elle n'est pas configurée, l'onglet "Acompte" du site indique
// simplement que le paiement en ligne n'est pas encore disponible.
//
// Fonctionnement : Yena saisit le montant total du devis pour une
// réservation confirmée depuis l'admin (colonne "Montant devis (€)"), le
// site calcule l'acompte automatiquement (voir DEPOSIT_PERCENT ci-dessous)
// et le client peut le régler par carte via une page de paiement Stripe
// sécurisée (le site ne manipule jamais de numéro de carte). La
// confirmation se fait automatiquement au retour du paiement ; un bouton
// "Marquer l'acompte payé" existe aussi dans l'admin en secours, au cas où
// le client fermerait son onglet juste après avoir payé.
//
// Compte Stripe à créer sur https://dashboard.stripe.com/register (gratuit,
// aucun frais tant qu'aucun paiement n'est encaissé ; commissions Stripe
// standard ensuite, ~1,5 % + 0,25 € par paiement par carte française). La
// clé secrète se trouve sur https://dashboard.stripe.com/test/apikeys en
// mode test, puis https://dashboard.stripe.com/apikeys une fois prêt à
// passer en conditions réelles.
const STRIPE_API_BASE = 'https://api.stripe.com/v1';

// Pourcentage du montant du devis demandé en acompte. Modifiable librement.
const DEPOSIT_PERCENT = 0.30;

// Nombre de jours après la date de l'évènement avant l'envoi de la demande d'avis.
const DELAI_AVIS_JOURS = 2;

// Nombre de jours avant la date de l'évènement pour l'envoi du rappel.
const DELAI_RAPPEL_JOURS = 7;

// Statuts possibles pour le suivi d'une réservation (colonne "Statut réservation").
const STATUTS_RESERVATION = ['Nouvelle demande', 'Devis envoyé', 'Confirmé', 'Terminé'];

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
  'Avis demandé', 'Statut réservation', 'Rappel envoyé',
  'Montant devis (€)', 'Acompte payé', 'Stripe Session ID',
];

const COL = HEADERS.reduce((acc, name, i) => { acc[name] = i; return acc; }, {});

const ABONNES_TAB = 'Newsletter Abonnés';
const ABONNES_HEADERS = ['Email', 'Nom', "Date d'ajout", 'Source', 'Désabonné'];
const ACOL = ABONNES_HEADERS.reduce((acc, name, i) => { acc[name] = i; return acc; }, {});

const CAMPAGNES_TAB = 'Newsletter Campagnes';
const CAMPAGNES_HEADERS = ['Sujet', 'Contenu', 'Statut', "Date d'envoi", 'Destinataires'];
const CCOL = CAMPAGNES_HEADERS.reduce((acc, name, i) => { acc[name] = i; return acc; }, {});

const GALERIE_TAB = 'Galerie';
const GALERIE_HEADERS = ['Titre', 'URL image', 'Ordre', 'Visible'];
const GCOL = GALERIE_HEADERS.reduce((acc, name, i) => { acc[name] = i; return acc; }, {});

// Nom de l'onglet des réservations, utilisé pour le retrouver de façon fiable
// (voir getSheet_ ci-dessous) même si Yena réordonne les onglets du classeur.
const RESERVATIONS_TAB = 'Réservations (site web)';

function getSheet_() {
  const ss = SpreadsheetApp.openById(SHEET_ID);
  // On cible l'onglet par son nom plutôt que par sa position (fiable même si
  // Yena réordonne les onglets). Si l'onglet n'a pas encore ce nom (classeur
  // existant, ou tout premier appel après cette mise à jour), on reprend le
  // comportement historique (1er onglet) puis on le renomme pour que les
  // appels suivants le retrouvent directement par son nom.
  let sheet = ss.getSheetByName(RESERVATIONS_TAB);
  if (!sheet) {
    sheet = ss.getSheets()[0];
    try { sheet.setName(RESERVATIONS_TAB); } catch (renameErr) { /* nom déjà pris ailleurs : on continue sans renommer */ }
  }
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

function getAbonnesSheet_() {
  const ss = SpreadsheetApp.openById(SHEET_ID);
  let sheet = ss.getSheetByName(ABONNES_TAB);
  if (!sheet) {
    sheet = ss.insertSheet(ABONNES_TAB);
    sheet.appendRow(ABONNES_HEADERS);
  }
  return sheet;
}

function getCampagnesSheet_() {
  const ss = SpreadsheetApp.openById(SHEET_ID);
  let sheet = ss.getSheetByName(CAMPAGNES_TAB);
  if (!sheet) {
    sheet = ss.insertSheet(CAMPAGNES_TAB);
    sheet.appendRow(CAMPAGNES_HEADERS);
    sheet.appendRow([
      'Exemple : Nos disponibilités pour les fêtes de fin d\'année',
      "Bonjour,\n\nL'équipe Yena Event espère que vous allez bien ! Nous en profitons pour vous partager quelques nouveautés...\n\n(Remplacez ce texte par le contenu de votre newsletter, puis passez le Statut à \"Envoyer maintenant\".)",
      'Brouillon', '', '',
    ]);
  }
  return sheet;
}

function getGalerieSheet_() {
  const ss = SpreadsheetApp.openById(SHEET_ID);
  let sheet = ss.getSheetByName(GALERIE_TAB);
  if (!sheet) {
    sheet = ss.insertSheet(GALERIE_TAB);
    sheet.appendRow(GALERIE_HEADERS);
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

/* ====== Anti-abus : validation, honeypot, limite de fréquence, verrou ====== */

function isValidEmail_(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(email || '').trim());
}

/** Vérifie qu'une chaîne est bien une date au format AAAA-MM-JJ valide. */
function isValidIsoDate_(s) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(s || ''))) return false;
  const d = new Date(s + 'T00:00:00');
  return !isNaN(d.getTime());
}

/** Coupe une chaîne à une longueur maximale (évite les messages-fleuves envoyés par des scripts). */
function clampStr_(s, maxLen) {
  return String(s || '').trim().slice(0, maxLen);
}

/**
 * Vrai si un champ piège invisible (honeypot) du formulaire est resté vide,
 * comme rempli par un humain. Les scripts/bots qui remplissent tous les
 * champs d'un formulaire le remplissent aussi, ce qui les trahit. On répond
 * alors un faux succès (sans rien enregistrer ni envoyer) pour ne pas leur
 * donner d'indice.
 */
function isHoneypotTriggered_(data) {
  return !!String(data.hp || '').trim();
}

/**
 * Limite de fréquence simple par fenêtre de temps fixe, sans dépendre de
 * l'IP de l'appelant (non disponible dans Apps Script) : compte les appels
 * par "seau" (bucket) sur une fenêtre glissante grossière. Suffisant pour
 * bloquer un script qui spammerait le formulaire, sans jamais gêner un
 * usage humain normal du site.
 */
function rateLimitOk_(bucket, max, windowSeconds) {
  const cache = CacheService.getScriptCache();
  const key = 'rl_' + bucket + '_' + Math.floor(Date.now() / (windowSeconds * 1000));
  const current = Number(cache.get(key) || 0);
  if (current >= max) return false;
  cache.put(key, String(current + 1), windowSeconds + 5);
  return true;
}

/**
 * Exécute `fn` sous un verrou global au script, pour éviter que deux
 * requêtes simultanées (double clic, deux onglets admin ouverts en même
 * temps…) ne se marchent dessus en lisant/modifiant le Sheet en parallèle.
 */
function withLock_(fn) {
  const lock = LockService.getScriptLock();
  try {
    lock.waitLock(10000);
  } catch (err) {
    return jsonOut_({ ok: false, error: 'busy' });
  }
  try {
    return fn();
  } finally {
    lock.releaseLock();
  }
}

function doPost(e) {
  try {
    const data = JSON.parse(e.postData.contents);
    if (data.type === 'contact') return handleContact_(data);
    if (data.type === 'newsletter') return handleNewsletterSignup_(data);
    if (data.type === 'checkAvailability') return handleCheckAvailability_(data);
    if (data.type === 'adminAuth') return handleAdminAuth_(data);
    if (data.type === 'adminList') return handleAdminList_(data);
    if (data.type === 'adminMarkPhotosReady') return handleAdminMarkPhotosReady_(data);
    if (data.type === 'adminUpdateBookingStatus') return handleAdminUpdateBookingStatus_(data);
    if (data.type === 'adminSendNewsletter') return handleAdminSendNewsletter_(data);
    if (data.type === 'adminAddGalleryImage') return handleAdminAddGalleryImage_(data);
    if (data.type === 'adminDeleteGalleryImage') return handleAdminDeleteGalleryImage_(data);
    if (data.type === 'adminSetQuoteAmount') return handleAdminSetQuoteAmount_(data);
    if (data.type === 'adminMarkDepositPaid') return handleAdminMarkDepositPaid_(data);
    if (data.type === 'depositStatus') return handleDepositStatus_(data);
    if (data.type === 'createDepositCheckout') return handleCreateDepositCheckout_(data);
    if (data.type === 'confirmDepositPayment') return handleConfirmDepositPayment_(data);
    return handleBooking_(data);
  } catch (err) {
    return jsonOut_({ ok: false, error: 'server_error', message: String(err) });
  }
}

/** Indique si une date d'évènement est déjà prise par une réservation confirmée. */
function handleCheckAvailability_(data) {
  const date = String(data.date || '').trim();
  if (!date) return jsonOut_({ ok: false, error: 'missing_field' });
  if (!rateLimitOk_('availability', 60, 60)) return jsonOut_({ ok: false, error: 'rate_limited' });

  const values = getSheet_().getDataRange().getValues();
  const taken = values.slice(1).some(r => {
    const raw = r[COL['Date évènement']];
    const d = raw instanceof Date ? Utilities.formatDate(raw, Session.getScriptTimeZone(), 'yyyy-MM-dd') : String(raw);
    return d === date && String(r[COL['Statut réservation']]).trim() === 'Confirmé';
  });
  return jsonOut_({ ok: true, date, taken });
}

/* ====== Administration (page admin.html du site) ====== */

function isAdminAuthorized_(data) {
  const key = PropertiesService.getScriptProperties().getProperty('ADMIN_KEY');
  return !!key && String(data.adminKey || '') === key;
}

function handleAdminAuth_(data) {
  // Limite le nombre de tentatives de connexion (essai du mot de passe) sur
  // une fenêtre de temps, pour rendre une attaque par force brute
  // impraticable, sans jamais gêner un usage normal (une poignée de
  // connexions par jour au maximum).
  if (!rateLimitOk_('adminAuthAttempt', 8, 300)) return jsonOut_({ ok: false, error: 'rate_limited' });
  if (!isAdminAuthorized_(data)) return jsonOut_({ ok: false, error: 'unauthorized' });
  return jsonOut_({ ok: true });
}

/** Liste des réservations + statistiques pour le tableau de bord admin. */
function handleAdminList_(data) {
  if (!isAdminAuthorized_(data)) return jsonOut_({ ok: false, error: 'unauthorized' });

  const values = getSheet_().getDataRange().getValues();
  const bookings = values.slice(1)
    .filter(r => r[COL['Référence']])
    .map(r => ({
      ref: r[COL['Référence']],
      service: r[COL['Prestation']],
      eventDate: formatDateForJson_(r[COL['Date évènement']]),
      guests: r[COL['Invités']],
      location: r[COL['Lieu']],
      fullName: r[COL['Nom']],
      email: r[COL['Email']],
      phone: r[COL['Téléphone']],
      statutPhotos: r[COL['Statut photos']] || 'En attente',
      statutReservation: r[COL['Statut réservation']] || 'Nouvelle demande',
      driveFolderUrl: r[COL['Lien dossier Drive']],
      montantDevis: r[COL['Montant devis (€)']] || '',
      acomptePaye: String(r[COL['Acompte payé']]).trim().toLowerCase() === 'oui',
    }))
    .reverse();

  const abonnesCount = Math.max(getAbonnesSheet_().getLastRow() - 1, 0);
  return jsonOut_({ ok: true, bookings, abonnesCount, statutsReservation: STATUTS_RESERVATION, depositPercent: DEPOSIT_PERCENT });
}

/** Met à jour le statut de suivi (Nouvelle demande / Devis envoyé / Confirmé / Terminé) d'une réservation. */
function handleAdminUpdateBookingStatus_(data) {
  if (!isAdminAuthorized_(data)) return jsonOut_({ ok: false, error: 'unauthorized' });
  if (!STATUTS_RESERVATION.includes(data.statut)) return jsonOut_({ ok: false, error: 'invalid_status' });

  return withLock_(() => {
    const sheet = getSheet_();
    const values = sheet.getDataRange().getValues();
    for (let i = 1; i < values.length; i++) {
      if (String(values[i][COL['Référence']]).trim() === String(data.ref).trim()) {
        sheet.getRange(i + 1, COL['Statut réservation'] + 1).setValue(data.statut);
        return jsonOut_({ ok: true });
      }
    }
    return jsonOut_({ ok: false, error: 'not_found' });
  });
}

/** Renseigne le montant total du devis d'une réservation (base de calcul de l'acompte). */
function handleAdminSetQuoteAmount_(data) {
  if (!isAdminAuthorized_(data)) return jsonOut_({ ok: false, error: 'unauthorized' });
  const montant = Number(data.montant);
  if (!Number.isFinite(montant) || montant < 0) return jsonOut_({ ok: false, error: 'invalid_amount' });

  return withLock_(() => {
    const sheet = getSheet_();
    const values = sheet.getDataRange().getValues();
    for (let i = 1; i < values.length; i++) {
      if (String(values[i][COL['Référence']]).trim() === String(data.ref).trim()) {
        sheet.getRange(i + 1, COL['Montant devis (€)'] + 1).setValue(montant);
        return jsonOut_({ ok: true });
      }
    }
    return jsonOut_({ ok: false, error: 'not_found' });
  });
}

/**
 * Marque manuellement l'acompte d'une réservation comme payé, en secours du
 * flux automatique (ex. client ayant fermé son onglet juste après avoir payé
 * sur Stripe, avant le retour sur le site). À utiliser après avoir vérifié
 * le paiement dans le tableau de bord Stripe.
 */
function handleAdminMarkDepositPaid_(data) {
  if (!isAdminAuthorized_(data)) return jsonOut_({ ok: false, error: 'unauthorized' });

  return withLock_(() => {
    const sheet = getSheet_();
    const values = sheet.getDataRange().getValues();
    for (let i = 1; i < values.length; i++) {
      if (String(values[i][COL['Référence']]).trim() === String(data.ref).trim()) {
        sheet.getRange(i + 1, COL['Acompte payé'] + 1).setValue('Oui');
        return jsonOut_({ ok: true });
      }
    }
    return jsonOut_({ ok: false, error: 'not_found' });
  });
}

/** Extrait un ID de fichier Drive plausible depuis un lien de partage ou un ID brut collé par Yena. */
function driveImageUrlFromInput_(input) {
  const s = String(input || '').trim();
  const match = s.match(/[-\w]{20,}/);
  const id = match ? match[0] : s;
  return `https://drive.google.com/thumbnail?id=${id}&sz=w1000`;
}

/** Ajoute une image à la galerie publique du site (photo dont Yena a les droits de diffusion, distincte des dossiers photos privés clients). */
function handleAdminAddGalleryImage_(data) {
  if (!isAdminAuthorized_(data)) return jsonOut_({ ok: false, error: 'unauthorized' });

  const titre = clampStr_(data.titre, 200);
  const lien = String(data.lien || '').trim();
  if (!titre || !lien) return jsonOut_({ ok: false, error: 'missing_field' });

  return withLock_(() => {
    const sheet = getGalerieSheet_();
    const ordre = sheet.getLastRow();
    sheet.appendRow([titre, driveImageUrlFromInput_(lien), ordre, 'Oui']);
    return jsonOut_({ ok: true });
  });
}

function handleAdminDeleteGalleryImage_(data) {
  if (!isAdminAuthorized_(data)) return jsonOut_({ ok: false, error: 'unauthorized' });

  return withLock_(() => {
    const rowIndex = Number(data.rowIndex);
    const sheet = getGalerieSheet_();
    if (!rowIndex || rowIndex < 2 || rowIndex > sheet.getLastRow()) return jsonOut_({ ok: false, error: 'not_found' });
    sheet.deleteRow(rowIndex);
    return jsonOut_({ ok: true });
  });
}

/** Liste publique des images de la galerie (pas d'authentification requise, contenu non sensible). */
function handleGalleryPublic_() {
  const values = getGalerieSheet_().getDataRange().getValues();
  const images = values.slice(1)
    .map((r, idx) => ({
      rowIndex: idx + 2,
      titre: r[GCOL['Titre']],
      url: r[GCOL['URL image']],
      ordre: Number(r[GCOL['Ordre']]) || 0,
      visible: String(r[GCOL['Visible']]).trim().toLowerCase() !== 'non',
    }))
    .filter(img => img.visible && img.url)
    .sort((a, b) => a.ordre - b.ordre);
  return jsonOut_({ ok: true, images });
}

/**
 * Avis Google réels de la fiche Yena Event, via SerpApi (gratuit, priorité)
 * ou l'API Google Places (payante, repli) selon ce qui est configuré dans
 * les propriétés du script — voir le commentaire en tête de fichier. Le
 * résultat final (même forme quelle que soit la source) est mis en cache
 * 12h pour limiter le nombre d'appels. Renvoie { ok: false } si rien n'est
 * configuré — le site bascule alors silencieusement sur des avis d'exemple.
 */
function handleGoogleReviewsPublic_() {
  const cache = CacheService.getScriptCache();
  const cacheKey = 'googleReviews';
  const cached = cache.get(cacheKey);
  if (cached) return jsonOut_(JSON.parse(cached));

  const props = PropertiesService.getScriptProperties();
  const serpApiKey = props.getProperty('SERPAPI_KEY');
  const placesApiKey = props.getProperty('GOOGLE_PLACES_API_KEY');
  const placeId = props.getProperty('GOOGLE_PLACE_ID');

  let result;
  if (serpApiKey) {
    result = fetchReviewsFromSerpApi_(serpApiKey);
  } else if (placesApiKey && placeId) {
    result = fetchReviewsFromGooglePlaces_(placesApiKey, placeId);
  } else {
    return jsonOut_({ ok: false, error: 'not_configured' });
  }

  if (result.ok) cache.put(cacheKey, JSON.stringify(result), 43200); // 12h
  return jsonOut_(result);
}

/**
 * SerpApi (https://serpapi.com) : recherche la fiche Yena Event par son nom
 * (pas besoin de connaître un Place ID à l'avance), puis récupère ses avis.
 * L'identifiant de fiche trouvé est mis en cache 30 jours (il ne change
 * quasiment jamais) pour économiser une recherche à chaque rafraîchissement
 * des avis, et rester très largement sous le quota gratuit de 250/mois.
 */
function fetchReviewsFromSerpApi_(apiKey) {
  try {
    const cache = CacheService.getScriptCache();
    let dataId = cache.get('serpapiDataId');

    if (!dataId) {
      const searchUrl = 'https://serpapi.com/search.json'
        + '?engine=google_maps'
        + `&q=${encodeURIComponent(SERPAPI_BUSINESS_QUERY)}`
        + '&type=search'
        + `&api_key=${encodeURIComponent(apiKey)}`;
      const searchRes = UrlFetchApp.fetch(searchUrl, { muteHttpExceptions: true });
      const searchJson = JSON.parse(searchRes.getContentText());
      const firstResult = (searchJson.local_results && searchJson.local_results[0])
        || searchJson.place_results;
      if (!firstResult || !firstResult.data_id) {
        return { ok: false, error: 'serpapi_place_not_found', message: searchJson.error || '' };
      }
      dataId = firstResult.data_id;
      cache.put('serpapiDataId', dataId, 2592000); // 30 jours
    }

    const reviewsUrl = 'https://serpapi.com/search.json'
      + '?engine=google_maps_reviews'
      + `&data_id=${encodeURIComponent(dataId)}`
      + '&hl=fr'
      + `&api_key=${encodeURIComponent(apiKey)}`;
    const reviewsRes = UrlFetchApp.fetch(reviewsUrl, { muteHttpExceptions: true });
    const reviewsJson = JSON.parse(reviewsRes.getContentText());
    if (reviewsJson.error) {
      // L'identifiant en cache n'est peut-être plus valide : on l'oublie
      // pour forcer une nouvelle recherche au prochain appel.
      CacheService.getScriptCache().remove('serpapiDataId');
      return { ok: false, error: 'serpapi_error', message: reviewsJson.error };
    }

    const placeInfo = reviewsJson.place_info || {};
    const reviews = (reviewsJson.reviews || [])
      .filter(r => r.snippet)
      .map(r => ({
        author: (r.user && r.user.name) || '',
        rating: r.rating || 5,
        text: r.snippet || '',
        relativeTime: r.date || '',
      }));

    return {
      ok: true,
      rating: placeInfo.rating || null,
      totalReviews: placeInfo.reviews || null,
      reviewLink: GOOGLE_REVIEW_LINK,
      reviews,
    };
  } catch (err) {
    return { ok: false, error: 'server_error', message: String(err) };
  }
}

/** API Google Places (payante) : voir le commentaire en tête de fichier. */
function fetchReviewsFromGooglePlaces_(apiKey, placeId) {
  try {
    const url = 'https://maps.googleapis.com/maps/api/place/details/json'
      + `?place_id=${encodeURIComponent(placeId)}`
      + '&fields=rating,user_ratings_total,reviews'
      + '&language=fr'
      + `&key=${encodeURIComponent(apiKey)}`;
    const res = UrlFetchApp.fetch(url, { muteHttpExceptions: true });
    const json = JSON.parse(res.getContentText());
    if (json.status !== 'OK' || !json.result) {
      return { ok: false, error: 'places_error', message: json.status };
    }
    return {
      ok: true,
      rating: json.result.rating || null,
      totalReviews: json.result.user_ratings_total || null,
      reviewLink: GOOGLE_REVIEW_LINK,
      reviews: (json.result.reviews || []).map(r => ({
        author: r.author_name || '',
        rating: r.rating || 5,
        text: r.text || '',
        relativeTime: r.relative_time_description || '',
      })),
    };
  } catch (err) {
    return { ok: false, error: 'server_error', message: String(err) };
  }
}

function formatDateForJson_(v) {
  if (v instanceof Date) return Utilities.formatDate(v, Session.getScriptTimeZone(), 'yyyy-MM-dd');
  return v || '';
}

/** Marque les photos d'une réservation comme prêtes (visible dans "Mes photos"). */
function handleAdminMarkPhotosReady_(data) {
  if (!isAdminAuthorized_(data)) return jsonOut_({ ok: false, error: 'unauthorized' });

  return withLock_(() => {
    const sheet = getSheet_();
    const values = sheet.getDataRange().getValues();
    for (let i = 1; i < values.length; i++) {
      if (String(values[i][COL['Référence']]).trim() === String(data.ref).trim()) {
        sheet.getRange(i + 1, COL['Statut photos'] + 1).setValue('Prêt');
        return jsonOut_({ ok: true });
      }
    }
    return jsonOut_({ ok: false, error: 'not_found' });
  });
}

/** Envoi immédiat d'une newsletter depuis la page admin (sans attendre le déclencheur quotidien). */
function handleAdminSendNewsletter_(data) {
  if (!isAdminAuthorized_(data)) return jsonOut_({ ok: false, error: 'unauthorized' });

  const sujet = String(data.sujet || '').trim();
  const contenu = String(data.contenu || '').trim();
  if (!sujet || !contenu) return jsonOut_({ ok: false, error: 'missing_field' });

  const envoyes = sendNewsletterToRecipients_(sujet, contenu);
  getCampagnesSheet_().appendRow([sujet, contenu, 'Envoyé', new Date(), envoyes]);
  return jsonOut_({ ok: true, count: envoyes });
}

/** Inscription à la newsletter depuis le formulaire du site. */
function handleNewsletterSignup_(data) {
  if (isHoneypotTriggered_(data)) return jsonOut_({ ok: true }); // piège anti-bot : faux succès

  const email = String(data.email || '').trim().toLowerCase();
  if (!email) return jsonOut_({ ok: false, error: 'missing_field', field: 'email' });
  if (!isValidEmail_(email)) return jsonOut_({ ok: false, error: 'invalid_email' });
  if (!rateLimitOk_('newsletter', 10, 60)) return jsonOut_({ ok: false, error: 'rate_limited' });

  return withLock_(() => {
    const sheet = getAbonnesSheet_();
    const values = sheet.getDataRange().getValues();
    for (let i = 1; i < values.length; i++) {
      if (String(values[i][ACOL['Email']]).trim().toLowerCase() === email) {
        sheet.getRange(i + 1, ACOL['Désabonné'] + 1).setValue(''); // ré-inscrit si désabonné
        return jsonOut_({ ok: true, alreadySubscribed: true });
      }
    }
    sheet.appendRow([email, '', new Date(), 'Site (newsletter)', '']);
    return jsonOut_({ ok: true });
  });
}

/** Message envoyé depuis le formulaire de contact du site. */
function handleContact_(data) {
  if (isHoneypotTriggered_(data)) return jsonOut_({ ok: true }); // piège anti-bot : faux succès

  if (!data.name || !data.email || !data.message) {
    return jsonOut_({ ok: false, error: 'missing_field' });
  }
  if (!isValidEmail_(data.email)) return jsonOut_({ ok: false, error: 'invalid_email' });
  if (!rateLimitOk_('contact', 10, 60)) return jsonOut_({ ok: false, error: 'rate_limited' });

  const name = clampStr_(data.name, 200);
  const message = clampStr_(data.message, 3000);

  GmailApp.sendEmail(OWNER_EMAIL, `Nouveau message via le site — ${name}`, [
    `Nom : ${name}`,
    `Email : ${data.email}`,
    '',
    'Message :',
    message,
  ].join('\n'), { replyTo: data.email, name: 'Site Yena Event' });

  return jsonOut_({ ok: true });
}

/** Réception d'une nouvelle réservation depuis le site. */
function handleBooking_(data) {
  const required = ['ref', 'service', 'eventDate', 'guests', 'fullName', 'email', 'phone'];
  for (const key of required) {
    if (!data[key]) return jsonOut_({ ok: false, error: 'missing_field', field: key });
  }
  if (isHoneypotTriggered_(data)) {
    // Piège anti-bot déclenché : faux succès, rien n'est créé ni envoyé.
    return jsonOut_({ ok: true, ref: data.ref, calendarEventUrl: '', driveFolderUrl: '' });
  }
  if (!isValidEmail_(data.email)) return jsonOut_({ ok: false, error: 'invalid_email' });
  if (!isValidIsoDate_(data.eventDate)) return jsonOut_({ ok: false, error: 'invalid_date' });
  const guestsNum = parseInt(data.guests, 10);
  if (!Number.isFinite(guestsNum) || guestsNum < 1 || guestsNum > 5000) {
    return jsonOut_({ ok: false, error: 'invalid_guests' });
  }
  if (!rateLimitOk_('booking', 20, 60)) return jsonOut_({ ok: false, error: 'rate_limited' });

  // Textes libres bornés en longueur, pour éviter qu'un script n'enregistre
  // des messages-fleuves dans le Sheet et les emails.
  data = Object.assign({}, data, {
    guests: guestsNum,
    fullName: clampStr_(data.fullName, 200),
    service: clampStr_(data.service, 200),
    location: clampStr_(data.location, 300),
    budget: clampStr_(data.budget, 100),
    message: clampStr_(data.message, 3000),
    phone: clampStr_(data.phone, 40),
  });

  return withLock_(() => {
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
      calEvent.getId(), calendarEventUrl, '', 'Nouvelle demande', '',
    ]);

    sendBookingEmails_(data, calendarEventUrl, driveFolderUrl);

    return jsonOut_({ ok: true, ref: data.ref, calendarEventUrl, driveFolderUrl });
  });
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

/* ====== Acompte en ligne (Stripe) ====== */

/** Convertit un objet en corps de requête "application/x-www-form-urlencoded" (format attendu par l'API Stripe). */
function toFormUrlEncoded_(obj, prefix) {
  const parts = [];
  Object.keys(obj).forEach(key => {
    const value = obj[key];
    const fullKey = prefix ? `${prefix}[${key}]` : key;
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      parts.push(toFormUrlEncoded_(value, fullKey));
    } else {
      parts.push(`${encodeURIComponent(fullKey)}=${encodeURIComponent(value)}`);
    }
  });
  return parts.join('&');
}

/** Appelle l'API Stripe (clé secrète en Bearer token). `method` : 'get' ou 'post'. */
function stripeApiCall_(path, method, payload) {
  const secretKey = PropertiesService.getScriptProperties().getProperty('STRIPE_SECRET_KEY');
  if (!secretKey) return { ok: false, error: 'stripe_not_configured' };

  const options = {
    method,
    headers: { Authorization: 'Bearer ' + secretKey },
    muteHttpExceptions: true,
  };
  if (method === 'post' && payload) {
    options.contentType = 'application/x-www-form-urlencoded';
    options.payload = toFormUrlEncoded_(payload);
  }
  const res = UrlFetchApp.fetch(STRIPE_API_BASE + path, options);
  const json = JSON.parse(res.getContentText());
  if (json.error) return { ok: false, error: 'stripe_error', message: json.error.message };
  return { ok: true, data: json };
}

/** Trouve une réservation par référence + email, insensible à la casse pour l'email. */
function findBookingByRefAndEmail_(ref, email) {
  const sheet = getSheet_();
  const row = findRowByRef_(sheet, ref);
  if (!row || String(row[COL['Email']]).trim().toLowerCase() !== String(email).trim().toLowerCase()) return null;
  return { sheet, row };
}

/** Statut de l'acompte pour une réservation (montant dû, payé ou non), consulté depuis l'onglet "Acompte" du site. */
function handleDepositStatus_(data) {
  const ref = String(data.ref || '').trim();
  const email = String(data.email || '').trim();
  if (!ref || !email) return jsonOut_({ ok: false, error: 'missing_field' });
  if (!rateLimitOk_('depositStatus', 30, 60)) return jsonOut_({ ok: false, error: 'rate_limited' });

  const found = findBookingByRefAndEmail_(ref, email);
  if (!found) return jsonOut_({ ok: false, error: 'not_found' });

  const row = found.row;
  const statutReservation = row[COL['Statut réservation']] || 'Nouvelle demande';
  const montantDevis = Number(row[COL['Montant devis (€)']]) || 0;
  const acomptePaye = String(row[COL['Acompte payé']]).trim().toLowerCase() === 'oui';
  const stripeConfigured = !!PropertiesService.getScriptProperties().getProperty('STRIPE_SECRET_KEY');

  return jsonOut_({
    ok: true,
    statutReservation,
    montantDevis,
    montantAcompte: montantDevis > 0 ? Math.round(montantDevis * DEPOSIT_PERCENT * 100) / 100 : 0,
    acomptePaye,
    depositPercent: DEPOSIT_PERCENT,
    stripeConfigured,
  });
}

/** Crée une session de paiement Stripe Checkout pour l'acompte d'une réservation et renvoie son URL. */
function handleCreateDepositCheckout_(data) {
  const ref = String(data.ref || '').trim();
  const email = String(data.email || '').trim();
  if (!ref || !email) return jsonOut_({ ok: false, error: 'missing_field' });
  if (!rateLimitOk_('createDepositCheckout', 10, 60)) return jsonOut_({ ok: false, error: 'rate_limited' });

  return withLock_(() => {
    const found = findBookingByRefAndEmail_(ref, email);
    if (!found) return jsonOut_({ ok: false, error: 'not_found' });
    const { sheet, row } = found;

    if (String(row[COL['Acompte payé']]).trim().toLowerCase() === 'oui') {
      return jsonOut_({ ok: false, error: 'already_paid' });
    }
    const montantDevis = Number(row[COL['Montant devis (€)']]) || 0;
    if (montantDevis <= 0) return jsonOut_({ ok: false, error: 'no_quote' });

    const montantAcompte = Math.round(montantDevis * DEPOSIT_PERCENT * 100) / 100;
    const amountCents = Math.round(montantAcompte * 100);
    const rowIndex = sheet.getDataRange().getValues().findIndex(r => String(r[COL['Référence']]).trim() === ref) + 1;

    const result = stripeApiCall_('/checkout/sessions', 'post', {
      mode: 'payment',
      'payment_method_types[0]': 'card',
      'line_items[0][price_data][currency]': 'eur',
      'line_items[0][price_data][unit_amount]': amountCents,
      'line_items[0][price_data][product_data][name]': `Acompte réservation ${ref} — ${row[COL['Prestation']]}`,
      'line_items[0][quantity]': 1,
      customer_email: row[COL['Email']],
      success_url: `${SITE_URL}?session_id={CHECKOUT_SESSION_ID}&ref=${encodeURIComponent(ref)}#acompte`,
      cancel_url: `${SITE_URL}?ref=${encodeURIComponent(ref)}#acompte`,
      'metadata[ref]': ref,
    });
    if (!result.ok) return jsonOut_(result);

    sheet.getRange(rowIndex, COL['Stripe Session ID'] + 1).setValue(result.data.id);
    return jsonOut_({ ok: true, url: result.data.url });
  });
}

/**
 * Confirme le paiement d'un acompte au retour du client depuis Stripe
 * Checkout : on va relire l'état réel de la session directement auprès de
 * Stripe (avec la clé secrète) plutôt que de faire confiance à l'URL de
 * retour seule, pour éviter qu'elle ne soit falsifiée.
 */
function handleConfirmDepositPayment_(data) {
  const ref = String(data.ref || '').trim();
  const sessionId = String(data.sessionId || '').trim();
  if (!ref || !sessionId) return jsonOut_({ ok: false, error: 'missing_field' });

  return withLock_(() => {
    const sheet = getSheet_();
    const values = sheet.getDataRange().getValues();
    const rowIndex = values.findIndex(r => String(r[COL['Référence']]).trim() === ref);
    if (rowIndex < 1) return jsonOut_({ ok: false, error: 'not_found' });
    const row = values[rowIndex];

    // Le Session ID doit correspondre à celui enregistré pour cette
    // réservation lors de la création du paiement (empêche de valider un
    // acompte avec l'ID de session d'une autre réservation).
    if (String(row[COL['Stripe Session ID']]).trim() !== sessionId) {
      return jsonOut_({ ok: false, error: 'session_mismatch' });
    }
    if (String(row[COL['Acompte payé']]).trim().toLowerCase() === 'oui') {
      return jsonOut_({ ok: true, alreadyConfirmed: true });
    }

    const result = stripeApiCall_(`/checkout/sessions/${encodeURIComponent(sessionId)}`, 'get');
    if (!result.ok) return jsonOut_(result);
    if (result.data.payment_status !== 'paid' || result.data.metadata.ref !== ref) {
      return jsonOut_({ ok: false, error: 'not_paid' });
    }

    sheet.getRange(rowIndex + 1, COL['Acompte payé'] + 1).setValue('Oui');
    return jsonOut_({ ok: true });
  });
}

/** Consultation "Mes photos" (?ref=...&email=...) ou désinscription newsletter (?action=unsubscribe&email=...). */
function doGet(e) {
  try {
    if (e.parameter.action === 'unsubscribe') return handleUnsubscribe_(e);
    if (e.parameter.action === 'gallery') return handleGalleryPublic_();
    if (e.parameter.action === 'googleReviews') return handleGoogleReviewsPublic_();

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
      statutReservation: row[COL['Statut réservation']] || 'Nouvelle demande',
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
 * Envoie un rappel aux clients dont l'évènement CONFIRMÉ a lieu dans
 * `DELAI_RAPPEL_JOURS` jours ou moins (et qui n'en ont pas encore reçu un).
 * Ne concerne que les réservations dont le "Statut réservation" est
 * "Confirmé" — pas de rappel pour une simple demande jamais confirmée.
 */
function envoyerRappelsAvantEvenement() {
  const sheet = getSheet_();
  const values = sheet.getDataRange().getValues();
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  for (let i = 1; i < values.length; i++) {
    const row = values[i];
    const rawDate = row[COL['Date évènement']];
    const dejaEnvoye = row[COL['Rappel envoyé']];
    const email = row[COL['Email']];
    const statut = row[COL['Statut réservation']];
    if (!rawDate || dejaEnvoye === 'Oui' || !email || statut !== 'Confirmé') continue;

    const eventDate = rawDate instanceof Date ? rawDate : new Date(rawDate + 'T00:00:00');
    eventDate.setHours(0, 0, 0, 0);
    const joursRestants = Math.floor((eventDate - today) / 86400000);
    if (joursRestants < 0 || joursRestants > DELAI_RAPPEL_JOURS) continue;

    const fullName = row[COL['Nom']];
    const service = row[COL['Prestation']];
    const lieu = row[COL['Lieu']];
    const dansCombien = joursRestants === 0 ? "aujourd'hui" : `dans ${joursRestants} jour${joursRestants > 1 ? 's' : ''}`;
    const body = [
      `Bonjour ${fullName},`,
      '',
      `Petit rappel : votre évènement (${service}) approche, c'est ${dansCombien} !`,
      `Lieu : ${lieu || 'à confirmer avec notre équipe'}`,
      '',
      "Si vous avez la moindre question ou un dernier ajustement à faire, n'hésitez pas à nous contacter dès maintenant.",
      '',
      'Nous avons hâte d\'y être avec vous,',
      'Yena Event',
    ].join('\n');

    GmailApp.sendEmail(email, 'Votre évènement approche — Yena Event', body, { name: 'Yena Event' });
    sheet.getRange(i + 1, COL['Rappel envoyé'] + 1).setValue('Oui');
  }
}

function handleUnsubscribe_(e) {
  const email = String(e.parameter.email || '').trim().toLowerCase();
  if (email) {
    const sheet = getAbonnesSheet_();
    const values = sheet.getDataRange().getValues();
    for (let i = 1; i < values.length; i++) {
      if (String(values[i][ACOL['Email']]).trim().toLowerCase() === email) {
        sheet.getRange(i + 1, ACOL['Désabonné'] + 1).setValue('Oui');
      }
    }
  }
  return HtmlService.createHtmlOutput(
    '<!DOCTYPE html><html><body style="font-family:sans-serif;text-align:center;padding:60px 20px;">' +
    '<h2>Vous avez bien été désinscrit(e)</h2>' +
    '<p>Vous ne recevrez plus la newsletter de Yena Event. Vous continuerez à recevoir les emails liés à vos réservations en cours.</p>' +
    '</body></html>'
  );
}

/** Ajoute à la liste des abonnés les clients (issus des réservations) qui n'y figurent pas encore. */
function syncAbonnesFromReservations_() {
  const resValues = getSheet_().getDataRange().getValues();
  const abSheet = getAbonnesSheet_();
  const abValues = abSheet.getDataRange().getValues();
  const existing = new Set(abValues.slice(1).map(r => String(r[ACOL['Email']]).trim().toLowerCase()));

  const seen = new Set();
  const toAdd = [];
  for (let i = 1; i < resValues.length; i++) {
    const email = String(resValues[i][COL['Email']] || '').trim().toLowerCase();
    if (!email || existing.has(email) || seen.has(email)) continue;
    seen.add(email);
    toAdd.push([email, resValues[i][COL['Nom']] || '', new Date(), 'Cliente/client (réservation)', '']);
  }
  if (toAdd.length) {
    abSheet.getRange(abSheet.getLastRow() + 1, 1, toAdd.length, ABONNES_HEADERS.length).setValues(toAdd);
  }
}

/**
 * Envoie un email (sujet + contenu) à tous les abonnés non désinscrits
 * (anciens clients synchronisés automatiquement + inscrits via le site),
 * avec un lien de désinscription individuel. Renvoie le nombre d'envois.
 * Utilisée à la fois par le traitement quotidien des campagnes du Sheet et
 * par l'envoi immédiat depuis la page admin.
 */
function sendNewsletterToRecipients_(sujet, contenu) {
  syncAbonnesFromReservations_();

  const abValues = getAbonnesSheet_().getDataRange().getValues();
  const destinataires = [...new Map(
    abValues.slice(1)
      .filter(r => r[ACOL['Email']] && String(r[ACOL['Désabonné']]).trim().toLowerCase() !== 'oui')
      .map(r => [String(r[ACOL['Email']]).trim().toLowerCase(), String(r[ACOL['Email']]).trim()])
  ).values()];

  const webAppUrl = ScriptApp.getService().getUrl();
  let envoyes = 0;
  for (const email of destinataires) {
    if (MailApp.getRemainingDailyQuota() < 1) break;
    const unsubUrl = `${webAppUrl}?action=unsubscribe&email=${encodeURIComponent(email)}`;
    const body = `${contenu}\n\n---\nVous recevez cet email en tant que client(e) de Yena Event ou abonné(e) à la newsletter.\nSe désinscrire : ${unsubUrl}`;
    GmailApp.sendEmail(email, sujet, body, { name: 'Yena Event' });
    envoyes++;
  }
  return envoyes;
}

/**
 * Envoie chaque campagne de l'onglet "Newsletter Campagnes" dont le Statut
 * est "Envoyer maintenant". Appelée automatiquement chaque jour — Yena n'a
 * qu'à écrire son texte dans le Sheet et passer le Statut à "Envoyer
 * maintenant" pour que l'envoi parte tout seul le lendemain matin (ou tout
 * de suite en exécutant cette fonction manuellement depuis l'éditeur, ou en
 * l'envoyant directement depuis la page admin du site).
 */
function envoyerNewsletter() {
  const campSheet = getCampagnesSheet_();
  const campValues = campSheet.getDataRange().getValues();

  for (let i = 1; i < campValues.length; i++) {
    const statut = String(campValues[i][CCOL['Statut']]).trim();
    if (statut !== 'Envoyer maintenant') continue;

    const sujet = campValues[i][CCOL['Sujet']];
    const contenu = campValues[i][CCOL['Contenu']];
    if (!sujet || !contenu) continue;

    const envoyes = sendNewsletterToRecipients_(sujet, contenu);
    campSheet.getRange(i + 1, CCOL['Statut'] + 1).setValue('Envoyé');
    campSheet.getRange(i + 1, CCOL["Date d'envoi"] + 1).setValue(new Date());
    campSheet.getRange(i + 1, CCOL['Destinataires'] + 1).setValue(envoyes);
  }
}

/** Regroupe les tâches quotidiennes automatiques (avis + rappels + newsletters en attente). */
function tachesQuotidiennes() {
  envoyerDemandesAvis();
  envoyerRappelsAvantEvenement();
  envoyerNewsletter();
}

/**
 * À exécuter depuis l'éditeur Apps Script (bouton ▶️ Exécuter, fonction
 * "initialiser") après chaque déploiement, ou après cette mise à jour du
 * code. Installe le déclencheur quotidien qui envoie les demandes d'avis et
 * les newsletters en attente. Peut être relancée sans risque : elle ne crée
 * jamais de doublon.
 */
function initialiser() {
  ScriptApp.getProjectTriggers().forEach(t => {
    const fn = t.getHandlerFunction();
    if (fn === 'envoyerDemandesAvis' || fn === 'tachesQuotidiennes') ScriptApp.deleteTrigger(t);
  });
  ScriptApp.newTrigger('tachesQuotidiennes').timeBased().everyDays(1).atHour(10).create();
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
