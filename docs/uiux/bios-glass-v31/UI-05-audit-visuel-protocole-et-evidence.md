# UI-05 — Audit visuel et accessibilité : protocole mesurable, résultats et limites

**Date :** 14/10/2026. **Références prioritaires :** `01_BIOS_UIUX_References_Chat.md`, guide original `BIOS Design Guide - Glass Corporate(2).html`, `03_UIUX_Pro_Max_SKILL_et_checklists (1).md`, UI-01 à UI-04 (règles confirmées du dépôt 1TASK).

> **Statut de certification : NON VALIDÉ pour les vues authentifiées.** Cette PR crée les outils et vérifications de recette ; elle ne prétend ni avoir navigué dans les écrans privés ni avoir mesuré les pixels du déploiement réel. Les suites V1/Full prouvent la non-régression du code, pas la conformité WCAG ou la comparaison photographique de chaque vue.

## 1. Audit concret / constats sur `main`

- UI-02 a harmonisé les tables et la palette des rapports admin ; UI-03 a rendu la largeur du Kanban, les KPI et le rail de traitement dépendants de leur conteneur ; UI-04 a harmonisé administration, actifs, notifications, profil et écrans Entra.
- Le dernier état du dépôt possède les feuilles BIOS `styles/bios-glass-v31-*.css` et des tests de contrat statiques. Il ne possédait **pas** de collecteur de preuves de **rendu navigateur** réalisant mesures répétées de viewport, débordements et contraste sur les pages visitées.
- Ces tests statiques ne peuvent pas révéler automatiquement les chevauchements d'une sidebar ouverte avec un rail SLA, le contraste sur du verre flouté devant un halo ou une modale hors écran.
- Le guide HTML donne `#E8702A` et du texte clair sur certaines surfaces, mais 1TASK a approuvé `--kit-on-primary: #14201D` (5,41:1 sur orange) et `--kit-primary-text: #A6450A` (5,27:1 sur Canvas) pour respecter les seuils AA. **Les tokens réellement appliqués dans le dépôt priment sur les choix décoratifs non accessibles du guide.**

## 2. Collecteur ajouté (sans dépendance npm)

`scripts/ui05-browser-audit.mjs` est un outil **Node 22 + Chrome/Chromium** par CDP. Il lance un Chrome éphémère ou utilise une session de test autorisée accessible **sur localhost uniquement**.

Il parcourt : `320, 375, 390, 768, 1024, 1280, 1440` pixels, en thèmes **clair et sombre** (14 mesures par page). Chaque résultat donne : largeur CSS effective, `scrollWidth`, débordement horizontal et premiers éléments suspects, nombre de contrôles petits / sans libellé, présence d'un H1 et échantillons de contrastes calculés.

**Limitations** : le calcul de contraste superpose les fonds solides connus mais marque comme `glassApproximation: true` les gradients, superpositions semi-transparentes et `backdrop-filter`. Le rendu exact sur halo/Glass, le zoom 200 %, l'ordre de tabulation, les lecteurs d'écran, le tactile et les états interactifs requièrent une inspection humaine et des captures. L'outil ne réalise aucune mutation serveur et n'essaie jamais de contourner Entra.

### Exécution sur une page publique

```bash
node scripts/ui05-browser-audit.mjs \
  --url=https://1-task-dev.vercel.app/signin \
  --output=../ui05-private/signin.json
```

### Exécution sur une vue privée — **session de test, pas de vrai compte sensible**

Lancer Chrome/Chromium avec **un profil de test séparé** et port de débogage limité à l'ordinateur local ; se connecter normalement via Entra **en tant qu'utilisateur de test** :

```bash
# Exemple Linux (adapter CHROME_BIN) ; ne jamais exposer 9222 sur Internet.
google-chrome --user-data-dir=/tmp/1task-ui05-test \
  --remote-debugging-address=127.0.0.1 --remote-debugging-port=9222
```

Puis dans un autre terminal :

```bash
node scripts/ui05-browser-audit.mjs \
  --cdp=http://127.0.0.1:9222 \
  --url=https://1-task-dev.vercel.app/inbox \
  --output=../ui05-private/inbox.json
```

Répéter pour `/dashboard`, `/tickets`, `/tickets/[id]` (ticket fictif), `/queues`, `/reporting`, `/notifications`, `/my-assets`, `/admin`, `/admin/users`, `/admin/queues`, `/admin/reporting`, `/admin/assets`, `/admin/asset-requests`, `/profile` et `/pending-assignment` avec **les permissions appropriées**. Les URLs de tickets doivent rester **privées**. Si l'application redirige vers `/signin` ou vers un accès refusé, la mesure est marquée `NOT_AUTHENTICATED_OR_REDIRECTED` et le script retourne un code d'erreur, jamais un faux PASS.

Les captures sont **désactivées par défaut**. Pour une recette autorisée **avec données synthétiques exclusivement**, ajouter `--screenshots=../ui05-private/captures`. Laisser cette destination hors dépôt et ne jamais publier photos réelles, contenu d'un ticket confidentiel, noms, e-mails, cookies, jetons ou journaux DevTools.

### Contrôle du collecteur hors-ligne

```bash
node scripts/ui05-browser-audit.mjs \
  --fixture=tests/fixtures/ui05-visual-audit.html \
  --widths=390 --themes=light
```

Le fichier d'essai a **intentionnellement** une ligne trop large et un texte de contraste insuffisant. Le test Vitest exécute le vrai navigateur lorsque Chrome est installé pour vérifier ces deux détections. Cela **ne constitue pas** une mesure de production.

## 3. Matrice de recette par famille d'écrans

| Série | Vue / profil / état | Mesure et preuve attendues | Verdict |
|---|---|---|---|
| A | Dashboard demandeur, agent, responsable | 4 KPI lisibles et compacts, cartes sans surcharge, sidebar ouverte/fermée | **EN ATTENTE** |
| B | Inbox Liste, agent et responsable | **1 barre de filtres**, bouton Claim et aperçu `colSpan={7}` visibles selon droits | **EN ATTENTE** |
| C | Inbox Kanban et rail SLA | 5 colonnes métier + cas « Autres », scroll local, accès clavier, aucun chevauchement | **EN ATTENTE** |
| D | Tickets (nouveau, détails, conversation) | un seul bouton Nouveau **dans la navbar** ; formulaire, pièces, actions, confidentialité inchangés | **EN ATTENTE** |
| E | Files, Reporting, Notifications | tableaux/graphes lisibles, légende statuts, non-lu identifiable autrement que par la couleur | **EN ATTENTE** |
| F | Mes actifs et demandes d'actifs | cellules `data-label` mobiles, actions valider/refuser inchangées, modales dans le viewport | **EN ATTENTE** |
| G | Administration (rôles, utilisateurs, départements, files, catalogue, SLA, audit, reporting) | droits testés, focus, affichage long, hauteur des lignes, aucune action perdue | **EN ATTENTE** |
| H | Connexion, en attente, profil | Entra, erreurs, avatar, rôles cumulés, contrastes clair/sombre, responsive | **EN ATTENTE** |
| I | Shell applicatif et admin | sidebar/topbar intactes, bouton Nouveau unique, navigation mobile, menus | **EN ATTENTE** |
| J | États transversaux | erreur, chargement, succès, toast, modal, scrollbar, zoom 200 %, réduction de mouvement/transparence | **EN ATTENTE** |

## 4. Seuils / preuve de contraste

- **Texte normal : 4,5:1** ; **texte large : 3:1** ; **information non textuelle importante : 3:1**, plus inspection du focus.
- Mesures arithmétiques **des tokens du dépôt, fonds opaques uniquement** (contrôles source, pas photographie) : Ink `#14201D` / orange `#E8702A` **5,41:1** ; Ink / Canvas **14,60:1** ; `#3A4744` / `#F6F7F3` **9,02:1** ; dark `#F2F7F3` / `#192B23` **13,73:1** ; secondaire dark `#B8C8C0` / `#192B23` **8,55:1**.
- Ces réussites arithmétiques **ne garantissent rien** pour une surface transparente, image, overlay, hover, disabled ou chart. Tout résultat de contraste `glassApproximation` est **à revoir sur capture/DevTools** avant certificat.

Pour chaque écart : route (sans identifiant privé), rôle, thème, viewport et largeur de conteneur, capture expurgée, cible CSS, contraste calculé, état clavier, correction proposée, test de régression.

## 5. Contrôles de régression et risques

- **Métier intact** : le collecteur est en lecture seule, aucun fichier de composants, CSS, routes, autorisations, Entra, Prisma, ticket, assets ou notifications n'est modifié.
- **Données sensibles** : aucun screenshot par défaut, pas de texte de ticket ni d'identifiant de route dans les rapports, éviter les captures authentifiées publiques. Port CDP accessible seulement en localhost.
- **Desktop/tablette/mobile** : les anomalies signalées ne doivent pas déclencher de `overflow-x:hidden` global ; conserver scroll local intentionnel.
- **Évaluation WCAG** : une donnée de contraste calculée est un indice, pas une certification automatisée ; un auditeur doit trancher après inspection sur vraie surface et sur états réels.
- **Tests V1 et Full + Security S3** requis sur la PR. Si le runner GitHub n'a pas Chrome, le test Vitest de navigation est sauté avec signal explicite ; le collecteur restera exécutable sur le poste de test.

## 6. Conditions pour UI-06 et certification

UI-05 ne peut être clôturé **comme audit visuel authentifié** qu'après remplissage et validation des dix séries A–J, dans chaque thème, aux sept largeurs, zoom 200 % et sur les différents rôles. UI-06 devra traiter les écarts confirmés, produire les captures avant/après, redéployer et décider de la conformité finale.

**Interdiction de conclure « 100 % conforme » sur la base d'une CI verte seule.**
