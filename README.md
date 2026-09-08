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
- **Emails automatiques** : confirmation au client et notification à Yena à chaque réservation, message de contact envoyé directement par email, et **demande d'avis Google automatique** envoyée au client 2 jours après son évènement
- Formulaire de contact (envoyé par email à Yena) et newsletter
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
| Yena dépose les photos et passe une ligne à `Prêt` (colonne « Statut photos » du Sheet) | Le client peut voir/ouvrir son dossier photo depuis l'espace « Mes photos » du site |

Concrètement, une fois cette automatisation en place, il n'y a plus qu'**une
seule chose à faire manuellement** : déposer les photos dans le bon dossier
Drive après l'évènement et passer son statut à `Prêt` dans le tableau — tout
le reste (agenda, dossier, emails de confirmation, notification, demande
d'avis) tourne tout seul.

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
