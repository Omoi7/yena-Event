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
 */
window.YENA_CONFIG = {
  APPS_SCRIPT_URL: '',
};
