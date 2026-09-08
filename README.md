# Yena Event — Site vitrine

Site vitrine interactif pour l'agence évènementielle Yena Event (mariages, anniversaires, baptêmes, séminaires, galas...).

## Fonctionnalités

- Page unique responsive (mobile / tablette / desktop)
- Navigation fluide avec menu mobile
- Animations au scroll et compteurs statistiques animés
- Grille de prestations avec sélection rapide
- Carrousel de témoignages clients
- FAQ en accordéon
- **Formulaire de réservation en 4 étapes** permettant à un client de choisir une prestation, renseigner les détails de son évènement, ses coordonnées, puis **valider sa prestation en ligne** avec génération d'une référence de demande
- **Ajout au calendrier en un clic** (Google Calendar + fichier .ics) dès la validation de la demande
- **Espace « Mes photos »** : chaque client retrouve les photos de son évènement (référence + email) dans le dossier Google Drive dédié créé automatiquement pour son évènement
- Formulaire de contact et newsletter
- Barre de progression de lecture, copie de référence en un clic, focus clavier accessible
- Palette de marque : marron `#52311b` / beige `#e6d6bc`

## Stack

HTML / CSS / JavaScript vanilla, sans dépendance ni build (Google Fonts uniquement).

## Lancer le site en local

Ouvrez simplement `index.html` dans un navigateur, ou servez le dossier :

```bash
python3 -m http.server 8080
```

puis rendez-vous sur `http://localhost:8080`.

## Structure

```
index.html                    Page principale
css/style.css                 Styles (design system, responsive)
js/config.js                  Configuration (URL du backend Google Apps Script)
js/script.js                  Interactivité (menu, réservation, Mes photos, animations)
google-apps-script/Code.gs    Backend Calendar + Drive (voir ci-dessous)
```

## Connexion à Google Calendar et Google Drive (Mes photos)

Le site reproduit le fonctionnement déjà utilisé par Yena Event : un dossier
Drive par évènement (`AAAA-MM-JJ_Prénom_Prestation`, rangé dans le dossier
« Événements ») dans lequel les photos sont déposées puis partagées au
client. Le fichier [`google-apps-script/Code.gs`](google-apps-script/Code.gs)
automatise ces deux étapes :

- **À la validation d'une réservation** : création automatique d'un évènement
  dans l'agenda Google de Yena, et création automatique du dossier Drive du
  client (dans le dossier « Événements » existant), enregistrés dans un
  Google Sheet qui sert de tableau de suivi des réservations.
- **Espace « Mes photos »** : le client saisit sa référence + son email ; le
  site interroge le même backend et affiche le lien vers son dossier Drive
  dès que Yena a déposé les photos et marqué le statut « Prêt » dans le
  tableau.

### Installation (5 minutes, une seule fois)

1. Ouvrez le Google Sheet **« Yena Event – Réservations (site web) »** (déjà
   créé dans Drive, dans le dossier *Administratif*).
2. Menu **Extensions > Apps Script**.
3. Remplacez le contenu par celui de `google-apps-script/Code.gs`.
4. **Déployer > Nouveau déploiement** :
   - Type : *Application Web*
   - Exécuter en tant que : *Moi (yena.event7@gmail.com)*
   - Qui a accès : *Tout le monde*
5. Copiez l'URL fournie et collez-la dans `js/config.js` :
   ```js
   window.YENA_CONFIG = { APPS_SCRIPT_URL: 'https://script.google.com/macros/s/…/exec' };
   ```
6. Dans le Google Sheet, passez la colonne **« Statut photos »** d'une ligne
   à `Prêt` une fois les photos déposées dans le dossier Drive correspondant
   pour que le client puisse les voir depuis le site.

Tant que `APPS_SCRIPT_URL` est vide, le site reste pleinement fonctionnel
(réservation, récapitulatif par email, ajout au calendrier du client) mais
sans synchronisation automatique côté Yena, et la section « Mes photos »
affiche un message indiquant que le service arrive bientôt.

> Remarque : le compte Google connecté à cette session (`yena.event7@gmail.com`)
> dispose déjà d'un dossier « Événements » organisé exactement selon cette
> convention — le script s'y branche directement, aucune réorganisation
> n'est nécessaire.
