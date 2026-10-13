# BIOS Glass Corporate v3.1 — PR 04 : Shell, Dashboard, Inbox et formulaire V1

> **Statut : prévisualisation uniquement**, dans la variante `html[data-visual-profile="bios-glass-v31"]` introduite par PR 02. Cette PR est **empilée sur la PR #95** (PR 03) non encore fusionnée lors de sa création. **Ne pas fusionner dans `main` avant #95** et avant la recette visuelle des deux PR.

Références : [référence HTML autonome](./reference.html) · [conflits et contrat V1](./README.md) · [PR 02 palette et polices](./PR02-preview.md) · [PR 03 composants partagés](./PR03-components.md).

## Diagnostic constaté dans le dépôt

1. **Navigation** : `styles/design-system.css` possède déjà un shell opérationnel, le sidebar collapsible, les filtres d'accès, la recherche et le lanceur de ticket. Les remanier en JSX présente un risque de régression V1 élevé ; la PR ne modifie **aucun composant TSX**.
2. **Dashboard** : `styles/legacy-bridge.css` force `.dashboard-kpi-card` et `.dashboard-widget` en fonds opaques avec `!important`. Même avec la PR 03 active, les cartes peuvent paraître inchangées ; **exceptions ciblées** dans la variante BIOS pour rendre le Glass réellement visible.
3. **Inbox** : `app/(app)/inbox/page.tsx` rend un seul `InboxWorkbench`, la liste, ses filtres unifiés, les KPI et le rail SLA. Les selectors visuels `.inbox-workbench`, `.inbox-command-surface` et `.inbox-filter-panel` existent déjà. Aucune colonne ou zone fonctionnelle ajoutée.
4. **Création** : `components/new-ticket-form.tsx` gère validation, étapes, routage, idempotence, confidentialité et redirection. `legacy-bridge.css` applique une présentation forcée aux panneaux ; la PR adapte **uniquement les surfaces et focus**. Le lancement global reste unique.
5. **Cible** : sidebar 240/64 px, topbar 56 px, contenu 1360 px, page 32 px, espaces 18 px, halo léger, navigation active couleur Ink, cartographie Glass 62 % avec blur 20 px, Schibsted Grotesk sur les titres et IBM Plex Mono sur les KPI. Le CSS de PR 03 reste la source pour les rayons des composants.

## Périmètre de code

| Fichier | Impact |
|---|---|
| `styles/bios-glass-v31-shell-v1.css` | Nouvelle couche *opt-in* ciblant `kit-app`, `kit-sidebar`, `kit-topbar`, `dashboard-*`, `inbox-*` et `ticket-composer` |
| `app/globals.css` | Charge cette couche **après PR 02 et 03** ; inactive en dehors du profil visuel BIOS |
| `tests/uiux-bios-glass-pr04-shell-v1.test.ts` | Assertions CSS scoping, dimensions, lisibilité, focus, fallback et invariants du code métier |
| Ce document | Diagnostic, hiérarchie, responsive, risques et recette |

**Aucun** changement de routes, permissions, APIs, base de données, notification push/outbox, création, prise en charge, statut, tableaux ou filtre n'est autorisé dans cette PR.

## Nouvelle hiérarchie / variantes

**Desktop (1024–1440 px)**

- Shell identique en fonctionnalité : sidebar 240 px ouverte ou 64 px repliée, topbar 56 px avec ses actions et son menu. État actif Ink, iconographie contrastée.
- Dashboard : contexte/titre → KPI actuels, compactés visuellement par le langage Glass → tableaux et activité. Aucun compteur additionnel ni KPI global artificiel.
- Inbox : titre et KPI existants → **une** zone de filtres contrôlée → tickets → rail de surveillance SLA existant, sans nouvelle zone latérale. Les détails rapides restent dans la ligne développée `colSpan={7}`.
- Création : étape et message d'aide → champs et panneaux opaques 96 % → actions V1 existantes, y compris vérification avant soumission.

**Tablette (768–1023 px)**

- Le comportement off-canvas du menu reste celui de V1, sans nouvelle navigation ; padding ramené à 24 px.
- Vérifier que le centre Inbox reste la zone prioritaire et que le rail SLA et les filtres ne se superposent pas.

**Mobile (320, 375, 390 px)**

- Padding latéral 16 px avec aire pour la bottom navigation existante et `safe-area-inset-bottom`.
- Aucun nouveau CTA ni barre de filtre ; focus et champs restent accessibles, labels visibles, largeur des panneaux bornée.

**Mode sombre :** menu et cartes reposent sur les tokens et `--bios-glass-*` sombres de PR 02/03. Contraste actif : texte `#101B18` sur `#F2F7F3`, à vérifier visuellement sur tous les états.

## Gestion des risques

- Les sélecteurs `html[data-theme] ... !important` du legacy bridge imposaient certains fonds : la PR introduit des **`!important` ciblés sur les seules cartes Dashboard identifiées**, pas un nettoyage massif ni un remplacement de toutes les pages.
- Le flou 20 px est coûteux en scroll : vérifier la fluidité mobile et la lisibilité sur halo coloré ; fallback opaque sans `backdrop-filter` ou avec `prefers-reduced-transparency`.
- Les formulaires et les panneaux de prévisualisation restent quasi opaques afin que leurs valeurs/erreurs ne disparaissent pas.
- Certains éléments Dashboard et Inbox proviennent encore du legacy : **un test source seul ne valide pas leur CSS calculé** ; comparer la préversion en utilisant l'opt-in.

## Vérification avant fusion

1. CI V1 et Full : tests Vitest dont PR 01–04, lint, TypeScript, Prisma, build. Aucune diminution du nombre de tests métier.
2. En **Vercel Preview** avec compte de test habilité, cliquer sur `Tester BIOS Glass v3.1`, photographier la version active **et** la version originale, en clair/sombre.
3. Sur **320/375/390/768/1024/1280/1440 px**, avec sidebar ouverte/repliée : contrôler chevauchement, scroll des tableaux, rail SLA, topbar, filtres uniques, bouton Nouveau unique, modale de création.
4. Vérifier : Tab/Maj+Tab/Entrée/Échap ; focus visible, contrastes réellement calculés ≥4,5:1 texte normal et ≥3:1 grands textes/icônes critiques ; navigation et notifications.
5. Parcours réels : ouvrir/créer ticket, confidentialité et routage selon habilitation, double création/idempotence, aperçu et Claim, clôture, notifications push. Utiliser des comptes de test, sans manipuler les données réelles.
6. Comparer à `reference.html` sans supposer que le HTML fictif est une capture de production.

**Rollback :** désactiver le bouton de prévisualisation BIOS ; cela retire `data-visual-profile` et restaure immédiatement les styles V1. Ne pas déployer de force ce thème en production.

**Dépendance : PR #95 (composants Glass) doit être fusionnée avant cette PR.** PR 05 et lot 07 Full restent en attente.
