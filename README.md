<h3 align="center">Instagram Tracker (MVP)</h3>

<p align="center">
  Extension Chrome MV3 qui notifie les <strong>unfollows</strong> et enregistre des <strong>interactions récentes</strong> (proxy pour visites de profil) sur Instagram.
  <br />
</p>

[![Licence](https://img.shields.io/badge/License-CC%20BY--NC%204.0-lightgrey.svg)](https://creativecommons.org/licenses/by-nc/4.0/)

<!-- CAPTURES D'ÉCRAN -->
## Captures d'écran

<!-- Ajoutez vos captures d'écran ici -->
<img width="422" height="448" alt="image" src="https://github.com/user-attachments/assets/c7a23e18-aa2d-4dcb-bb80-a7b8f9d21965" />
<img width="1058" height="263" alt="image" src="https://github.com/user-attachments/assets/0814bdff-5e85-4dc2-b620-6b5bf4dc415f" />
<img width="975" height="654" alt="image" src="https://github.com/user-attachments/assets/e481cccb-e3ff-44a1-b2ec-2b851a12c07b" />



<!-- Exemple : ![Capture d'écran du projet](./images/screenshot.png) -->

<!-- TABLE OF CONTENTS -->
<details>
  <summary>Table des matières</summary>
  <ol>
    <li>
      <a href="#à-propos-du-projet">À propos du projet</a>
      <ul>
        <li><a href="#construit-avec">Construit avec</a></li>
      </ul>
    </li>
    <li>
      <a href="#pour-commencer">Pour commencer</a>
      <ul>
        <li><a href="#prérequis">Prérequis</a></li>
        <li><a href="#installation">Installation</a></li>
      </ul>
    </li>
    <li><a href="#utilisation">Utilisation</a></li>
    <li><a href="#permissions">Permissions</a></li>
    <li><a href="#limitations--risques">Limitations & Risques</a></li>
    <li><a href="#feuille-de-route">Feuille de route</a></li>
    <li><a href="#licence">Licence</a></li>
    <li><a href="#contact">Contact</a></li>
  </ol>
</details>

<!-- ABOUT THE PROJECT -->
## À propos du projet

Extension Chrome MV3 qui notifie les **unfollows** et enregistre des **interactions récentes** (proxy pour visites de profil) sur Instagram.

L'extension permet de suivre qui vous a unfollow et d'enregistrer les profils qui ont liké ou commenté récemment vos publications comme indicateur d'activité.

### Développer avec

* [![HTML5](https://img.shields.io/badge/HTML5-E34F26?style=for-the-badge&logo=html5&logoColor=white)](https://developer.mozilla.org/en-US/docs/Web/HTML)
* [![CSS3](https://img.shields.io/badge/CSS3-1572B6?style=for-the-badge&logo=css3&logoColor=white)](https://developer.mozilla.org/en-US/docs/Web/CSS)
* [![JavaScript](https://img.shields.io/badge/JavaScript-F7DF1E?style=for-the-badge&logo=javascript&logoColor=black)](https://developer.mozilla.org/en-US/docs/Web/JavaScript)
* [![Chrome Extension](https://img.shields.io/badge/Chrome-Extension-4285F4?style=for-the-badge&logo=googlechrome&logoColor=white)](https://developer.chrome.com/docs/extensions/)

<!-- GETTING STARTED -->
## Pour commencer

Pour installer l'extension Chrome en local, suis ces étapes.

### Prérequis

* Google Chrome (ou navigateur Chromium)
* Un compte Instagram connecté

### Installation

1. Clone le dépôt
   ```sh
   git clone https://github.com/Igrekop/Instagram-Tracker.git
   ```

2. Ouvrir `chrome://extensions` dans Chrome

3. Activer le **Mode développeur**

4. Cliquer **Charger l'extension non empaquetée** et sélectionner le dossier du projet

5. Ouvrir Instagram dans un onglet connecté

<!-- USAGE -->
## Utilisation

### Scanner les abonnés

- Dans l'onglet de votre **profil** Instagram, ouvrir le popup et cliquer "Scanner mes abonnés"
- L'extension ouvrira la modale d'abonnés, scrollera pour tout charger, puis sauvegardera l'instantané et notifiera les unfollows détectés

### Interactions récentes (expérimental)

- Sur la page `/accounts/activity/`, cliquer "Interactions récentes (expérimental)" pour enregistrer les profils qui ont liké/commenté récemment comme proxy

<!-- PERMISSIONS -->
## Permissions

L'extension nécessite les permissions suivantes :

- `storage` - Pour sauvegarder les données des scans
- `notifications` - Pour notifier les unfollows détectés
- `alarms` - Pour planifier les scans périodiques
- `activeTab` - Pour interagir avec l'onglet Instagram actif
- `scripting` - Pour injecter les scripts nécessaires
- `host_permissions`: `https://www.instagram.com/*` - Pour accéder aux pages Instagram

<!-- LIMITATIONS & RISKS -->
## Limitations & Risques

- Instagram ne fournit pas les visiteurs de profil via API officielle
- Le scraping du DOM peut casser si Instagram change son HTML
- Le scan nécessite un onglet `www.instagram.com` ouvert et connecté

<!-- ROADMAP -->
## Feuille de route

- [x] Extension Chrome MV3 fonctionnelle
- [x] Détection et notification des unfollows
- [x] Enregistrement des interactions récentes
- [x] Exécuter des scans périodiques fiables (onglets background / heuristiques)
- [ ] Dashboard de statistiques
- [ ] Dark mode
- [ ] Notifications email/mobile

<!-- LICENSE -->
## Licence

Distribué sous la licence [CC BY-NC 4.0](https://creativecommons.org/licenses/by-nc/4.0/). Voir `LICENSE.txt` pour plus d'informations.

<!-- CONTACT -->
## Contact
Email - [yvann.du.soub@gmail.com](mailto:yvann.du.soub@gmail.com) <br>

Project Link: [https://github.com/Igrekop/instagram-tracker](https://github.com/Igrekop/instagram-tracker)
