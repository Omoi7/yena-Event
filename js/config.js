'use strict';

/**
 * Configuration du site Yena Event.
 *
 * APPS_SCRIPT_URL : URL de l'application Web Google Apps Script qui relie
 * le site à Google Calendar (création automatique des évènements) et
 * Google Drive (dossier photos par client). Voir google-apps-script/Code.gs
 * pour le code à déployer et les instructions d'installation.
 *
 * Tant que ce champ est vide, le site fonctionne normalement (réservation,
 * récapitulatif, email) mais sans création automatique dans Calendar/Drive,
 * et la section "Mes photos" indique que le service n'est pas encore actif.
 *
 * GA_MEASUREMENT_ID : identifiant de mesure Google Analytics 4 (format
 * "G-XXXXXXXXXX"), disponible dans Google Analytics > Administration >
 * Flux de données. Tant que ce champ est vide, aucun script de mesure
 * d'audience n'est chargé, même si l'utilisateur accepte les cookies
 * (voir js/cookie-consent.js).
 */
window.YENA_CONFIG = {
  APPS_SCRIPT_URL: 'https://script.google.com/macros/s/AKfycbx2xVXKJiU-ncqvKN-J1fogxQq-7_RwrrS1oBF_E1AfLCvwC4i_4ezwAhO6GhkqR6zsgA/exec',
  GA_MEASUREMENT_ID: '',
};
