# UI-06 — Corrections ciblées et résultats de validation

Date : 14 octobre 2026. Base : archive `1TASK-dev-main-refonte-uiux.zip` fournie,
incluant déjà la livraison Claude. Le patch de cette correction est incrémental
par rapport à cette archive, pas par rapport à une branche distante non examinée.

**Verdict : corrections de présentation vérifiées sur les composants testés et
la connexion ; certification de l’ensemble des écrans V1 non terminée.**
Aucune session Entra ni base de recette n’était disponible. Aucun résultat de
composant isolé n’est présenté comme un parcours authentifié réussi.

## Corrections

- Le profil BIOS utilise Schibsted Grotesk pour le corps, les contrôles et les
  titres. IBM Plex Mono reste réservé aux références et indicateurs numériques.
  Les polices sont déjà hébergées localement par Fontsource. Le token historique
  IBM Plex Sans reste disponible hors profil BIOS.
- Les 26 déclarations explicites de famille dans `legacy.css`, ainsi que son
  token `--control-font`, utilisent désormais les tokens communs. Cela retire
  les exceptions Inter/Arial Narrow/monospace générique à leur source.
- `StatusBadge` et `PriorityBadge` portent respectivement `kit-badge-status` et
  `kit-badge-priority`. Aucun libellé, enum ou mapping de niveau n’a changé.
  La priorité est transparente avec contour ; le statut garde son fond et sa
  pastille. Le sélecteur de voisinage dépendant de `:has(...) + ...` est supprimé.
- Le dimensionnement et la variante de badge sont regroupés dans la feuille
  BIOS de composants. Aucune nouvelle feuille CSS ni import n’est ajouté.
- `uupm-refonte.css` passe de **148 à 55 déclarations `!important`** : 89 retraits
  dans les règles dont la spécificité et l’ordre suffisent, et 4 retirés avec les
  règles de badges déplacées. Les règles concernent onglets, création de ticket,
  graphiques, compteurs Inbox, rail et éléments de dashboard. Les 55 restants
  sont conservés prudemment pour les conflits historiques et règles globales
  d’accessibilité ; leur nécessité n’est pas certifiée sur les pages privées.
- `MASTER.md` est corrigé : il ne prétend plus que le corps utilise IBM Plex Sans,
  que toute la livraison est exclusivement CSS, ni que tous les seuils sont vérifiés.

Dans ce lot UI-06, le seul composant applicatif TSX modifié est `components/status-badge.tsx`
(deux classes de présentation ajoutées). API, services, Prisma, authentification,
permissions, routage, handlers, navbar et contrats métier restent hors du diff.

## Résultats exécutés

| Contrôle | Résultat observé |
|---|---|
| Vitest, `PRODUCT_PROFILE=v1` | 775 réussis, 11 ignorés ; 149 fichiers réussis et 3 ignorés |
| Vitest, `PRODUCT_PROFILE=full` | 775 réussis, 11 ignorés ; mêmes comptes |
| Tests ignorés | 10 tests PostgreSQL sans base de recette et 1 test du collecteur UI-05 sans navigateur à son emplacement attendu ; recette Chromium UI-06 exécutée séparément |
| ESLint | Réussi |
| `tsc --noEmit` | Réussi |
| Build Next.js 16.3.8 | Compilation, TypeScript et génération des 22 pages statiques réussis ; routes dynamiques compilées, pas exécutées avec une vraie base |
| Chromium, composants réels isolés | 14 mesures : 7 largeurs × 2 thèmes |
| Chromium, véritable `/signin` local | 14 mesures : 7 largeurs × 2 thèmes ; erreur `AccessDenied` affichée |
| Profil BIOS | Attribut `data-visual-profile="bios-glass-v31"` constaté dans chaque mesure ; sur `/signin`, opt-in Preview du produit activé |
| Typographie | Famille calculée Schibsted dans le corps et les titres ; police chargée ; IBM Plex Mono dans les références ; retour IBM Plex Sans constaté hors profil BIOS |
| Débordement horizontal | Aucun débordement de document aux 7 largeurs dans ces deux supports testés |
| Badges | 4 niveaux × 4 positions × 14 mesures : 224 styles relevés ; 56 groupes incohérents avant, 0 après |
| Styles conservés | Fond, bordure, couleur, rayon et taille des onglets actif/inactif et du résumé identiques avant/après aux 14 mesures ; famille de police corrigée |
| Clavier et confirmation | Entrée développe la première ligne ; `aria-expanded=true` et cellule de 7 colonnes ; confirmation Claim ouverte, Échap ferme, focus rendu au bouton ; aucune prise en charge envoyée |
| Réduction du mouvement | Durée de transition de l’onglet sous `prefers-reduced-motion: reduce` conforme au test (< 1 ms) |

Largeurs : **320, 375, 390, 768, 1024, 1280 et 1440 px**, hauteur de viewport
960 px. Les captures sont à 375 et 1440 px, en clair et sombre. La fixture utilise
les vrais `AgentTicketTable`, `PriorityBadge`, `StatusBadge`, `DashboardViewTabs`,
`TicketStepper`, `TicketSummary` et la confirmation de prise en charge. Elle ne
reconstitue pas la totalité de l’Inbox ni les droits d’un utilisateur réel.

Le wrapper `npm run build` rencontre une restriction d’IPC Unix du lanceur `tsx`
dans cet environnement (`EPERM`). Les mêmes étapes ont été exécutées avec
`node --import tsx config/validate-env.ts`, nettoyage de `.next`, génération Prisma
puis `node node_modules/next/dist/bin/next build`. Aucun script projet ni contrôle
d’environnement n’a été désactivé. Build local en configuration Preview, avec URL
PostgreSQL fictive locale ; ce résultat ne valide pas une configuration de production.

## Matrice de conformité par famille

| Série | Famille V1 | Résultat réel et reste à valider |
|---|---|---|
| A | Dashboards demandeur/agent/responsable | Partiel : onglets réels rendus. KPI, graphiques, filtres et droits des pages authentifiées non vérifiés visuellement. |
| B | Inbox Liste | Partiel : table/cartes réelles, badges, détails rapides, clavier et confirmation Claim vérifiés avec données fictives. Filtres, scopes et mutation métier non exécutés. |
| C | Kanban et rail SLA | Rendu non testé ; couverture statique existante passée. Contrôles de conteneur, colonnes et interactions à faire en session. |
| D | Nouveau ticket, détails, conversation | Partiel : étapes et résumé rendus. Formulaire complet, erreurs serveur, conversation et actions non testés en session. |
| E | Files, Reporting, Notifications | Points d’entrée inventoriés, contrats existants testés ; rendu et états authentifiés non testés. |
| F | Mes actifs, inventaire, demandes | Points d’entrée V1 et redirections relevés ; rendu, confirmations et décisions non testés. |
| G | Administration | Points d’entrée, restrictions et redirections V1 relevés ; droits cumulés, formulaires, SLA, audit et modales non testés visuellement. |
| H | Connexion, attente, profil | Connexion et AccessDenied vérifiés. Connexion Entra elle-même, attente d’affectation et profil non testés. |
| I | Shell application/admin | Fichiers inchangés ; contrats d’unicité du bouton Nouveau passés. Navigation mobile et menus en session non testés. |
| J | États transversaux | Partiel : focus, Échap, confirmation, mouvement réduit et erreur de connexion vérifiés. Chargements, toast, zoom 200 %, transparence réduite et lecteur d’écran non certifiés. |

L’inventaire complet des **44 points d’entrée**, avec leur disposition V1 et leur
résultat individuel, est dans [UI-06-matrice-routes.md](UI-06-matrice-routes.md).
Cela inclut les redirections et fonctions désactivées en V1, sans les compter
artificiellement comme des écrans métier validés.

## Adaptations justifiées au guide

Les couleurs adaptées sont déjà présentes dans la base ; cette correction les
conserve. Calcul de luminance relative sRGB sur couleurs opaques :

| Usage | Texte / fond | Ratio |
|---|---|---:|
| Bouton orange, texte Ink retenu | `#14201D` / `#E8702A` | 5,41:1 |
| Survol du même bouton | `#14201D` / `#D86620` | 4,66:1 |
| Texte blanc sur orange, non retenu | `#FFFFFF` / `#E8702A` | 3,10:1 |
| Orange de texte adapté sur Canvas | `#A6450A` / `#EEF0EC` | 5,27:1 |
| Orange de texte du guide sur Canvas | `#B8520F` / `#EEF0EC` | 4,31:1 |
| Texte principal sombre | `#F2F7F3` / `#192B23` | 13,73:1 |
| Texte secondaire sombre | `#CEDBD3` / `#192B23` | 10,42:1 |
| Accent texte sombre | `#FFB57D` / `#192B23` | 8,62:1 |

Le seuil visé pour le texte courant est 4,5:1 : le blanc sur l’orange et l’orange
du guide sur Canvas ne le satisfont pas. Le guide ne définissant pas une palette
sombre complète, les tokens sombres du dépôt constituent une adaptation explicite.

Les tableaux et surfaces de lecture/édition opaques stabilisent le contraste
malgré les halos et le contenu derrière le verre. Le Glass demeure sur les
surfaces de structure. Cette répartition évite que la lisibilité de données
denses dépende du décor ; elle n’est pas une reproduction littérale de chaque
effet du guide. Les 8 ratios sont des calculs sur tokens, **pas des mesures de
tous les pixels**, survols, overlays ou surfaces translucides de l’application.

## Preuves et reproduction

Le paquet livré contient `preuves/avant`, `preuves/apres`, les résultats JSON,
les captures PNG, les journaux de tests et `preuves/contrast-tokens.json`.
Les images de composants mentionnent leurs données fictives ; celles de connexion
montrent le bouton « BIOS Glass · Actif ». Ce sont des captures Chromium, pas des
maquettes générées. Le rendu logiciel SwiftShader a été utilisé pour le Glass.

Après installation des dépendances verrouillées et génération Prisma, fournir
un navigateur Chromium et Playwright disponibles localement, puis depuis le projet :

```bash
CHROME_BIN=/chemin/chromium PLAYWRIGHT_MODULE=/chemin/playwright/index.mjs \
  node scripts/uiux-correction-browser.mjs --output=/chemin/preuves
```

Pour comparer l’archive d’origine extraite : ajouter `--baseline` et
`--baseline-dir=/chemin/archive-originale`. Sans ce dernier paramètre, le mode
baseline lit `git HEAD`, qui doit donc correspondre exactement à la livraison
Claude. Aucun package de test navigateur n’a été ajouté au manifeste applicatif.

## Condition restante pour clôturer V1

Utiliser une instance de recette avec données fictives et une session Entra
autorisée pour les rôles demandeur, agent, responsable et administration. Exécuter
les parcours A–J manquants, aux mêmes thèmes/largeurs et au zoom 200 %, puis joindre
leurs preuves. Tant que cette étape n’a pas eu lieu, ne pas annoncer une
« validation de tous les écrans » ou une conformité WCAG complète.

Le complément de lisibilité de l’Inbox est documenté séparément dans [UI-07](UI-07-inbox-lisibilite.md).
