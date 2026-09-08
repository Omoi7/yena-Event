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
- Formulaire de contact et newsletter
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
index.html        Page principale
css/style.css      Styles (design system, responsive)
js/script.js       Interactivité (menu, formulaire de réservation, animations)
```

## Aller plus loin

Le formulaire de réservation fonctionne actuellement côté client (stockage local + email pré-rempli). Pour recevoir réellement les demandes par email ou les enregistrer en base, il faudra brancher un service d'envoi (ex. Formspree, EmailJS) ou un petit backend.
