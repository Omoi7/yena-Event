# Yena Event — Site vitrine

Site vitrine interactif pour l'agence évènementielle Yena Event (mariages, anniversaires, baptêmes, séminaires, galas...).

## Fonctionnalités

- Navigation par onglets responsive (mobile / tablette / desktop), pas de long défilement : chaque section (Accueil, Prestations, Catalogue, Galerie, Avis, Réservation, Acompte, Mes photos, FAQ, Contact...) s'affiche à la demande, liens partageables (`#section`)
- Animations au scroll et compteurs statistiques animés
- Grille de prestations avec sélection rapide
- **Carrousel des vrais avis Google** de Yena Event (via SerpApi, gratuit), repli automatique sur des avis d'exemple tant que ce n'est pas configuré
- FAQ en accordéon
- **Formulaire de réservation en 4 étapes** permettant à un client de choisir une prestation, renseigner les détails de son évènement, ses coordonnées, puis **valider sa prestation en ligne** avec génération d'une référence de demande
- **Vérification de disponibilité en direct** : la date choisie est comparée aux évènements déjà confirmés, avec message immédiat si elle est prise
- **Ajout au calendrier en un clic** (Google Calendar + fichier .ics) dès la validation de la demande
- **Paiement de l'acompte en ligne** (Stripe Checkout) une fois la réservation confirmée et le devis chiffré par Yena
- **Espace « Mes photos »** : chaque client retrouve le statut de son dossier et les photos de son évènement (référence + email) dans le dossier Google Drive dédié créé automatiquement
- **Emails automatiques** : confirmation au client et notification à Yena à chaque réservation, message de contact envoyé directement par email, **rappel au client 7 jours avant son évènement confirmé**, et **demande d'avis Google automatique** 2 jours après
- **Newsletter** : Yena écrit son texte (depuis le Sheet ou la page admin), elle part automatiquement à tous les anciens clients et aux inscrits du site (lien de désinscription inclus)
- **Catalogue de formules** (sans prix affichés, devis personnalisé systématique — contenu exemple à personnaliser)
- **Galerie publique gérable depuis l'admin**, distincte des dossiers photos privés des clients
- **Page d'administration** (`admin.html`, protégée par mot de passe, elle aussi en onglets) : réservations avec suivi de statut et gestion de l'acompte, activation de l'accès aux photos, gestion de la galerie, envoi de newsletter, export CSV — sans jamais ouvrir le Google Sheet
- Bouton WhatsApp flottant, formulaire de contact (envoyé par email à Yena) et inscription newsletter
- Protection anti-spam (piège invisible + limite de fréquence) et anti-force-brute sur l'admin
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
admin.html                    Page d'administration (voir ci-dessous)
css/style.css                 Styles (design system, responsive)
css/admin.css                 Styles spécifiques à l'administration
js/config.js                  Configuration (URL du backend Google Apps Script)
js/script.js                  Interactivité (menu, réservation, Mes photos, animations)
js/admin.js                   Interactivité de la page d'administration
google-apps-script/Code.gs    Backend Calendar + Drive + emails + admin (voir ci-dessous)
```

## Automatisation : Calendar, Drive, emails et avis Google

Le site est relié à un backend Google Apps Script
([`google-apps-script/Code.gs`](google-apps-script/Code.gs)), déjà déployé
et connecté (`js/config.js`). Voici tout ce qui se passe **sans aucune
action manuelle** :

| Évènement | Ce qui se passe automatiquement |
|---|---|
| Un client valide une réservation | Évènement créé dans l'agenda Google de Yena · Dossier Drive client créé dans « Événements » (même convention `AAAA-MM-JJ_Prénom_Prestation` que Yena utilise déjà) · Ligne ajoutée au Google Sheet de suivi · **Email de confirmation envoyé au client** · **Email de notification envoyé à Yena** |
| Un visiteur envoie le formulaire de contact | **Email envoyé directement à Yena**, avec réponse possible en direct au client (reply-to) |
| 2 jours après la date d'un évènement | **Email automatique envoyé au client** pour lui demander de laisser un avis Google (lien vers [la fiche Yena Event](https://maps.app.goo.gl/5UB9AKGLjTxDrgbWA)) — envoyé une seule fois par réservation |
| Yena écrit une newsletter et passe son Statut à `Envoyer maintenant` | **Envoyée automatiquement** à tous les anciens clients et abonnés du site, le lendemain matin au plus tard |
| 7 jours avant un évènement dont le « Statut réservation » est `Confirmé` | **Email de rappel automatique envoyé au client**, une seule fois |
| Un visiteur choisit une date sur le formulaire | Le site interroge le Sheet en direct et signale si la date est déjà prise par une réservation `Confirmé` |
| Yena dépose les photos et passe une ligne à `Prêt` (colonne « Statut photos » du Sheet) | Le client peut voir/ouvrir son dossier photo depuis l'espace « Mes photos » du site |

Concrètement, une fois cette automatisation en place, il n'y a plus que deux
choses à faire manuellement : déposer les photos dans le bon dossier Drive
après l'évènement, et écrire le texte d'une newsletter quand on veut en
envoyer une — tout le reste (agenda, dossier, emails de confirmation,
notification, demande d'avis, envoi de la newsletter) tourne tout seul. Ces
deux gestes peuvent se faire **directement depuis le site**, sans ouvrir le
Google Sheet — voir la section Administration ci-dessous.

### Page d'administration (`admin.html`)

Une page dédiée, protégée par mot de passe, permet à Yena de piloter le site
sans jamais ouvrir le Google Sheet :

- **Tableau des réservations** : toutes les demandes, avec :
  - un menu déroulant **Suivi** pour faire avancer le statut de la
    réservation (`Nouvelle demande` → `Devis envoyé` → `Confirmé` →
    `Terminé`) — c'est ce statut `Confirmé` qui déclenche la vérification
    de disponibilité et le rappel J-7 côté site ;
  - un bouton **« Marquer prêtes »** pour activer l'accès aux photos d'un
    client en un clic (équivalent à passer la colonne « Statut photos » à
    `Prêt`) ;
  - un bouton **« Exporter CSV »** pour télécharger toutes les réservations
    (utilisable dans Excel/Google Sheets, ou pour une sauvegarde).
- **Galerie du site** : ajoutez un lien de partage Drive (accès « Tous les
  utilisateurs disposant du lien ») + un titre, l'image apparaît aussitôt
  dans la section Galerie du site public. Bouton de suppression par image.
  À utiliser uniquement pour des photos dont Yena a les droits de diffusion
  publique — jamais les dossiers photos privés remis aux clients.
- **Newsletter** : un champ Sujet + un champ Contenu, et un bouton
  **« Envoyer maintenant »** qui l'envoie immédiatement à tous les abonnés
  (avec confirmation avant l'envoi, puisque c'est irréversible).
- Compteurs : nombre de réservations, de photos en attente, d'abonnés.

**Accès :** ouvrir `admin.html` (ex. `https://omoi7.github.io/yena-Event/admin.html`)
— cette page n'est volontairement liée nulle part ailleurs sur le site
public. Elle n'est pas indexée par les moteurs de recherche.

⚠️ **Sécurité : le mot de passe ne doit jamais être écrit dans le code du
dépôt** (qui est public sur GitHub). Il vit uniquement dans les propriétés
du script Apps Script, jamais commité nulle part :

1. Dans l'éditeur Apps Script (script.google.com), cliquez l'icône ⚙️
   **« Paramètres du projet »** (menu de gauche).
2. Section **« Propriétés du script »** > **« Ajouter une propriété de
   script »**.
3. Propriété : `ADMIN_KEY` — Valeur : un mot de passe fort (gardez-le dans
   un gestionnaire de mots de passe, il donne accès aux coordonnées de tous
   les clients et à l'envoi de la newsletter).
4. **« Enregistrer les propriétés du script »**.

C'est ce mot de passe qu'il faut saisir sur `admin.html`. Tant qu'aucune
valeur `ADMIN_KEY` n'est configurée, la page refuse toute connexion.

### Newsletter aux anciens clients

Deux nouveaux onglets apparaissent automatiquement dans le Google Sheet
**« Yena Event – Réservations (site web) »** :

- **« Newsletter Abonnés »** : la liste des destinataires. Remplie
  automatiquement avec l'email de tous les anciens clients (déduits du
  tableau de réservations) + les personnes inscrites via le formulaire du
  site (bas de page). Une colonne « Désabonné » exclut automatiquement
  quelqu'un qui a cliqué sur le lien de désinscription présent dans chaque
  newsletter.
- **« Newsletter Campagnes »** : c'est ici que Yena écrit sa newsletter.

**Pour envoyer une newsletter :**
1. Ouvrir l'onglet « Newsletter Campagnes » du Sheet.
2. Sur une nouvelle ligne (ou celle d'exemple déjà présente), remplir
   **Sujet** et **Contenu** (texte brut, pas de mise en forme).
3. Passer la colonne **Statut** à `Envoyer maintenant`.
4. C'est tout : l'envoi part automatiquement au prochain passage du
   déclencheur quotidien (10h, donc au plus tard le lendemain matin). La
   ligne passe ensuite à `Envoyé` avec la date et le nombre de destinataires.

Pour un envoi immédiat sans attendre le lendemain : ouvrir l'éditeur Apps
Script, sélectionner la fonction `envoyerNewsletter` dans le menu déroulant,
cliquer ▶️ Exécuter.

### Paiement de l'acompte en ligne (Stripe)

Une fois une réservation **confirmée**, Yena saisit le montant total du
devis depuis l'onglet « Réservations » de l'admin (colonne « Devis &
acompte »). Le site calcule alors automatiquement l'acompte (30 % du devis
par défaut — modifiable via la constante `DEPOSIT_PERCENT` en tête de
`Code.gs`) et le client peut le régler par carte depuis l'onglet
« Acompte » du site, via une page de paiement Stripe sécurisée (le site ne
manipule jamais de numéro de carte). La confirmation se fait automatiquement
au retour du paiement ; un bouton **« Marquer payé »** existe aussi dans
l'admin en secours (à utiliser après vérification dans le tableau de bord
Stripe), au cas où le client fermerait son onglet juste après avoir payé.

**Mise en place (comme `ADMIN_KEY`, une seule propriété du script) :**

1. Créer un compte sur **https://dashboard.stripe.com/register** (gratuit,
   aucun frais tant qu'aucun paiement n'est encaissé ; commission standard
   Stripe ensuite, environ 1,5 % + 0,25 € par paiement par carte française).
2. Récupérer la clé secrète de **test** sur
   **https://dashboard.stripe.com/test/apikeys** (commence par `sk_test_...`
   — jamais la clé publique `pk_...`, qui ne sert à rien ici).
3. Dans l'éditeur Apps Script : ⚙️ **Paramètres du projet** > **Propriétés
   du script** > ajouter `STRIPE_SECRET_KEY` avec cette valeur.
4. Tester avec une carte de test Stripe (ex. `4242 4242 4242 4242`, toute
   date future, tout CVC) sur une réservation confirmée avec un devis saisi.
5. **Pour passer en paiements réels** (une fois les tests concluants) :
   remplacer la valeur de `STRIPE_SECRET_KEY` par la clé secrète de
   **production**, trouvable sur **https://dashboard.stripe.com/apikeys**
   après avoir activé le compte (informations légales et bancaires de Yena
   Event à renseigner sur le tableau de bord Stripe). Aucune autre
   modification nécessaire.

Tant que `STRIPE_SECRET_KEY` n'est pas configurée, l'onglet « Acompte » du
site indique simplement que le paiement en ligne n'est pas encore
disponible — aucune erreur, aucun risque de casse.

### Pourquoi une étape reste manuelle (et pourquoi ce n'est pas contournable)

Un script qui envoie des emails ou modifie un agenda **sans supervision**
doit être explicitement autorisé une fois par un humain — c'est une mesure
de sécurité de Google contre les scripts malveillants, pas une limite de cet
outil. Concrètement : après chaque mise à jour du code, il faut redéployer
(1 clic) et, **la toute première fois qu'une nouvelle permission est
ajoutée** (ex. l'envoi d'emails automatiques), ré-autoriser le script une
fois (1 clic). Ensuite, plus rien à faire.

### Mettre à jour le backend après une modification de `Code.gs`

1. Ouvrez le projet Apps Script (**script.google.com/home**, connecté à
   `yena.event7@gmail.com`).
2. Collez le nouveau contenu de `google-apps-script/Code.gs`, **Ctrl+S**.
3. **Déployer > Gérer les déploiements** > icône crayon ✏️ sur le
   déploiement actif > **Version : Nouvelle version** > **Déployer**.
   (L'URL ne change pas, pas besoin de retoucher `js/config.js`.)
4. **Uniquement si une nouvelle permission est nécessaire** (message
   d'autorisation à l'écran) : sélectionnez la fonction `initialiser` dans
   le menu déroulant en haut de l'éditeur (à côté de ▶️ Exécuter), cliquez
   ▶️ **Exécuter**, puis autorisez l'accès. Cette fonction installe (ou
   réinstalle sans doublon) le déclencheur quotidien des demandes d'avis.

### Premier déploiement (si le backend n'est pas encore en ligne)

⚠️ N'utilisez **pas** le menu *Extensions > Apps Script* depuis le Google
Sheet : sur un navigateur avec plusieurs comptes Google connectés, ce menu
ouvre souvent le mauvais compte et affiche une erreur *« Page introuvable »*.
Passez directement par script.new :

1. Allez sur **https://script.new**, compte actif `yena.event7@gmail.com`.
2. Collez le contenu de `google-apps-script/Code.gs`, nommez le projet, **Ctrl+S**.
3. **Déployer > Nouveau déploiement** : Type *Application Web*, Exécuter en
   tant que *Moi*, Accès *Tout le monde* > **Déployer** > autorisez l'accès.
4. Copiez l'URL (`.../exec`) dans `js/config.js` → `APPS_SCRIPT_URL`.
5. Sélectionnez puis exécutez la fonction `initialiser` (voir ci-dessus) pour
   activer les demandes d'avis automatiques.

Tant que `APPS_SCRIPT_URL` est vide, le site reste fonctionnel en mode
dégradé (réservation en local, lien mailto manuel, pas de Calendar/Drive/emails
automatiques, contact form silencieux côté Yena).

## Contenus à personnaliser avant mise en ligne définitive

- **Catalogue** (`index.html`, section `#catalogue`) : les 3 formules et
  leurs inclusions sont des exemples, à adapter aux vraies prestations.
- **Bouton WhatsApp** (`index.html`, tout en bas) : numéro placeholder
  `+33 6 00 00 00 00`, à remplacer par le vrai numéro WhatsApp.
- Plus généralement, le téléphone et l'email affichés en plusieurs
  endroits du site (`+33 6 00 00 00 00`, `contact@yena-event.fr`) sont
  encore des exemples d'origine — seule l'adresse `yena.event7@gmail.com`
  utilisée par le backend est réelle. La zone géographique affichée en
  contact (« Île-de-France ») est en revanche réelle.

## Pistes envisagées mais non implémentées

- **Multi-langue (FR/EN) et SEO local avancé** : pistes identifiées, non
  prioritaires pour l'instant.
