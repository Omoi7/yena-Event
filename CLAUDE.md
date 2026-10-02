# CLAUDE.md

Guidance for Claude Code when working in this repository.

## Projet

Site vitrine pour **Yena Event**, agence évènementielle française (mariages,
anniversaires, séminaires, galas, photobooth...). Déployé sur **GitHub
Pages** à `https://omoi7.github.io/yena-Event/`, branche
`claude/event-company-website-b1xtvo`. Le détail fonctionnel complet (toutes
les features, l'automatisation Calendar/Drive/emails, la page admin...) est
dans `README.md` — le lire avant toute modification non triviale, il est à
jour et exhaustif. Ce fichier-ci documente plutôt le *comment travailler ici*.

## Stack et contraintes

- HTML / CSS / JavaScript **vanilla**, aucune dépendance, aucun build. Ne pas
  introduire de framework, bundler ou gestionnaire de paquets sans qu'on le
  demande explicitement — c'est un choix assumé du projet (site simple à
  maintenir par quelqu'un sans compétences dev).
- Backend séparé : `google-apps-script/Code.gs`, un unique fichier Apps
  Script déployé comme Web App, qui gère Calendar, Drive, Sheets, emails,
  Stripe, SerpApi. Toute modification de `Code.gs` doit être recollée
  manuellement dans l'éditeur Apps Script par l'utilisateur (voir la
  procédure dans le README, section « Mettre à jour le backend ») — ce n'est
  **pas** redéployé automatiquement par un push Git.
- Le site public (`index.html`) et la page admin (`admin.html`) sont deux
  SPA à onglets séparées, chacune avec son propre CSS/JS (`style.css`/
  `script.js` et `admin.css`/`admin.js`).
- Dégradation silencieuse par convention : toute fonctionnalité dépendant
  d'une config absente (`APPS_SCRIPT_URL`, `GA_MEASUREMENT_ID`,
  `STRIPE_SECRET_KEY`, `SERPAPI_DATA_ID`...) doit se désactiver proprement
  sans erreur visible, jamais planter le reste du site. Suivre ce même
  patron pour toute nouvelle intégration optionnelle.

## Structure

```
index.html                    Page principale (SPA à onglets)
admin.html                    Admin protégée par mot de passe (ADMIN_KEY côté Apps Script)
404.html                      Page d'erreur personnalisée, sans header/footer
cgu.html, confidentialite.html  Pages légales statiques (pas de script.js complet)
robots.txt, sitemap.xml       SEO technique, à la racine (servis tels quels par GitHub Pages)
css/style.css                 Design system + responsive (site public)
css/admin.css                 Styles admin
js/config.js                  Config (APPS_SCRIPT_URL, GA_MEASUREMENT_ID) — jamais de secret ici, c'est public
js/script.js                  Logique du site public (réservation, Mes photos, animations...)
js/admin.js                   Logique de la page admin
js/cookie-consent.js          Bandeau cookies RGPD + chargement conditionnel de GA4
google-apps-script/Code.gs    Backend (Calendar, Drive, Sheets, emails, Stripe, SerpApi)
assets/                       Logos, favicons, image de partage (og-image.png)
```

## Design system

Tokens CSS dans `:root` de `css/style.css` — toujours les réutiliser plutôt
que des couleurs/tailles en dur :

```
--brown-950:#2c1a0f   --brown:#52311b       --gold:#b9884f
--beige:#e6d6bc       --beige-light:#f7f0e2 --cream:#fbf7ef
--text:#2e1c10        --text-soft:#5c4a3a   --error:#b03a2e
--font-display:"Cormorant Garamond"         --font-body:"Poppins"
--radius-sm/md/lg     --container:1180px    --header-h:76px
```

Tous les couples de couleurs ci-dessus ont été vérifiés conformes WCAG AA
(≥4.5:1 texte normal) — recalculer si une nouvelle combinaison est ajoutée.

## Conventions de contenu

- **Tout le contenu visible (UI, commits, docs utilisateur) est en
  français.** Les commentaires de code peuvent rester en français aussi,
  comme le reste du projet.
- Messages de commit : impératif présent, résumant le *pourquoi/quoi* en une
  ligne, en français (voir `git log` pour le ton — ex. « Corrige la
  superposition des libellés d'étapes du formulaire sur mobile »).
- Pas de prix affichés sur le site public (catalogue sans tarifs, devis
  personnalisé systématique) — c'est un choix produit délibéré, ne pas
  ajouter de prix sans qu'on le demande.
- Un seul CTA marketing principal par contexte (« Demander un devis ») —
  éviter de réintroduire des CTA concurrents formulés différemment pour la
  même action.

## Tester en local

```bash
python3 -m http.server 8080 --directory /home/user/yena-Event
```

Playwright est dispo (`/opt/pw-browsers/chromium`) pour des vérifications
visuelles/fonctionnelles — mocker `**/macros/s/**` (l'URL Apps Script) avec
`page.route(...)` plutôt que de taper le vrai backend en test. Toujours
vérifier au moins un viewport mobile (~390px) en plus du desktop : le site
est utilisé majoritairement sur téléphone par les visiteurs.

Pas de suite de tests automatisée (pas de build, pas de CI) — la validation
passe par des vérifications manuelles/Playwright ciblées sur ce qui a
changé.

## Pédagogie avec l'utilisateur

L'utilisateur n'a pas de connaissances techniques préalables. Dans toute
réponse en chat (pas dans le code ni les commits, qui restent sobres) :

- Expliquer comme à quelqu'un qui découvre totalement le sujet, sans
  présupposer de vocabulaire technique connu. Définir un terme (ex. « API »,
  « backend », « déploiement », « cache ») dès qu'il apparaît, en une
  phrase simple et concrète, idéalement avec une image ou une comparaison
  du quotidien.
- Ne pas se contenter de dire *ce qui a été fait* : expliquer aussi
  *pourquoi* ce choix-là et *comment ça marche*, pour que l'utilisateur
  comprenne le raisonnement et puisse progressivement le réutiliser
  lui-même.
- Avancer étape par étape plutôt que de tout déverser d'un coup — surtout
  pour les manipulations que l'utilisateur doit faire lui-même (ex. Apps
  Script, Stripe, Google Analytics) : les décomposer en étapes numérotées,
  très concrètes (quoi cliquer, où, à quoi s'attendre).
- Rester bienveillant : aucune question n'est « trop basique », et il vaut
  mieux reformuler différemment une explication que de supposer qu'elle est
  acquise.
- Le but est que l'utilisateur monte en compétences au fil du projet, pas
  seulement qu'il obtienne un résultat qui marche.

## Déploiement

Le site public se déploie tout seul via GitHub Pages dès qu'un commit est
poussé sur la branche — **aucune étape de build/redéploiement côté front**.
Seul `google-apps-script/Code.gs` nécessite une action manuelle de
l'utilisateur après modification (voir README). Ne jamais committer de
secret (clé API, mot de passe) dans ce dépôt, qui est public — toute clé
sensible vit dans les propriétés du script Apps Script (`ADMIN_KEY`,
`STRIPE_SECRET_KEY`, `SERPAPI_API_KEY`...), jamais dans `js/config.js` ni
ailleurs dans le code front.
