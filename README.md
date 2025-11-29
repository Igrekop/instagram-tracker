# Instagram Tracker (MVP)
[![Licence](https://img.shields.io/badge/License-CC%20BY--NC%204.0-lightgrey.svg)](https://creativecommons.org/licenses/by-nc/4.0/)

Extension Chrome MV3 qui notifie les **unfollows** et enregistre des **interactions récentes** (proxy pour visites de profil) sur Instagram.

## Installation en local

1. Ouvrir `chrome://extensions` dans Chrome.
2. Activer le **Mode développeur**.
3. Cliquer **Charger l’extension non empaquetée** et sélectionner le dossier du projet.
4. Ouvrir Instagram dans un onglet connecté.

## Utilisation

- Dans l’onglet de votre **profil** Instagram, ouvrir le popup et cliquer
  "Scanner mes abonnés". L’extension ouvrira la modale d’abonnés, scrollera
  pour tout charger, puis sauvegardera l’instantané et notifiera les unfollows
  détectés.
- Sur la page `/accounts/activity/`, cliquer "Interactions récentes (expérimental)"
  pour enregistrer les profils qui ont liké/commenté récemment comme proxy.

## Permissions

- `storage`, `notifications`, `alarms`, `activeTab`, `scripting`
- `host_permissions`: `https://www.instagram.com/*`

## Limitations & Risques

- Instagram ne fournit pas les visiteurs de profil via API officielle.
- Le scraping du DOM peut casser si Instagram change son HTML.
- Le scan nécessite un onglet `www.instagram.com` ouvert et connecté.

## Roadmap (idées)

- Exécuter des scans périodiques fiables (onglets background / heuristiques).
- Dashboard de statistiques, dark mode, notifications email/mobile.
