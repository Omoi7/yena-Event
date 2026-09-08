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

⚠️ N'utilisez **pas** le menu *Extensions > Apps Script* depuis le Google
Sheet : sur un navigateur avec plusieurs comptes Google connectés, ce menu
ouvre souvent le mauvais compte et affiche une erreur *« Page introuvable »*
ou *« Impossible d'ouvrir le fichier »*. Passez directement par script.new,
qui évite ce problème :

1. Allez sur **https://script.new**. Vérifiez en haut à droite que le
   compte actif est bien **yena.event7@gmail.com** (cliquez sur l'avatar
   pour changer de compte si besoin).
2. Supprimez le contenu par défaut (`function myFunction() {...}`) et
   collez-y tout le contenu de [`google-apps-script/Code.gs`](google-apps-script/Code.gs).
3. Renommez le projet (ex. *« Yena Event Backend »*, en haut à gauche), puis
   **Ctrl+S**.
4. **Déployer > Nouveau déploiement** (cliquez l'icône ⚙️ à côté de *« Sélectionner le type »*
   si le choix n'apparaît pas encore) :
   - Type : *Application Web*
   - Exécuter en tant que : *Moi (yena.event7@gmail.com)*
   - Qui a accès : *Tout le monde*
   - **Déployer**
5. Un écran d'autorisation apparaît : *Autoriser l'accès* → choisissez
   yena.event7@gmail.com. Si Google affiche *« Cette application n'est pas
   validée »*, cliquez *Paramètres avancés* puis *Accéder à [nom du projet]
   (non sécurisé)* — c'est normal pour un script que vous avez créé
   vous-même, personne d'autre n'y a accès.
6. Copiez l'URL de l'application Web fournie (elle se termine par `/exec`)
   et collez-la dans `js/config.js` :
   ```js
   window.YENA_CONFIG = { APPS_SCRIPT_URL: 'https://script.google.com/macros/s/…/exec' };
   ```
7. Dans le Google Sheet **« Yena Event – Réservations (site web) »** (dans
   Drive, dossier *Administratif*), passez la colonne **« Statut photos »**
   d'une ligne à `Prêt` une fois les photos déposées dans le dossier Drive
   correspondant, pour que le client puisse les voir depuis le site.

Le script est autonome : il ouvre le Google Sheet par son identifiant à
chaque appel (pas besoin d'être lancé depuis le Sheet lui-même), ce qui
évite justement le problème de compte décrit ci-dessus.

Tant que `APPS_SCRIPT_URL` est vide, le site reste pleinement fonctionnel
(réservation, récapitulatif par email, ajout au calendrier du client) mais
sans synchronisation automatique côté Yena, et la section « Mes photos »
affiche un message indiquant que le service arrive bientôt.

> Remarque : le compte Google connecté à cette session (`yena.event7@gmail.com`)
> dispose déjà d'un dossier « Événements » organisé exactement selon cette
> convention — le script s'y branche directement, aucune réorganisation
> n'est nécessaire.
