# UI-03 — Dashboard, Inbox et détail tickets : corrections de largeur utile

**Date :** 14 octobre 2026 · Référence : Guide `BIOS Design Guide - Glass Corporate(2).html`, `01_BIOS_UIUX_References_Chat.md`, UI/UX Pro Max, UI-01 et UI-02 approuvés.

## Diagnostic concret

1. **Inbox Kanban** : `styles/bios-glass-v31-shell-v1.css` utilisait `@media (max-width:1199px)` pour décider de passer les cinq colonnes en bande défilante. Mais `styles/design-system.css` ne montre le rail SLA à droite qu'à partir de **1351 px de largeur du conteneur agent** ; sur écran desktop 1365 px (et sidebar ouverte), la fenêtre et la zone centrale peuvent avoir des largeurs très différentes. Résultat possible : cinq colonnes trop étroites, métadonnées compactées ou scroll incompréhensible. La V1 prévoit `overflow-x:auto` et cinq colonnes de 15rem dans `legacy-bridge.css` ; les deux approches coexistaient.
2. **Dashboard** : `styles/legacy.css` définit plusieurs fois `.dashboard-kpi-grid`, parfois jusqu'à **une colonne sous 480 px**, avec cartes à hauteur minimale élevée. Quatre KPI alignés de cette manière repoussent les tickets récents et le SLA. Les indicateurs doivent rester présents et exacts.
3. **Ticket détail** : `styles/design-system.css` passe en deux colonnes dès **1100 px de viewport**, sans déduire sidebar ni padding du contenu. Le rail de traitement de 320–380 px peut comprimer l'échange sur écran portable. La version V1 prévoit déjà le rail en premier sur compact : il faut conserver ce workflow, pas déplacer ou supprimer ses boutons.

## Nouvelle hiérarchie d'information

- **Dashboard** : accueil/contexte → quatre indicateurs compacts avec chiffres monospace et libellés → tickets récents + activité → SLA personnel (données existantes, pas de KPI supprimé).
- **Inbox** : navigation V1 inchangée → titre et trois compteurs textuels compacts → signal priorité → unique recherche et panneaux de filtres → liste (défaut) ou Kanban consultatif → pagination ; SLA et activité restent secondaires et suivent le contenu lorsque la largeur centrale ne permet pas le rail à droite.
- **Ticket** : référence, titre, statut/SLA → actions de traitement et informations du demandeur **au-dessus des échanges sur compact** ; échanges et historique pleine largeur ; sur grande largeur utile, échange principal à gauche + rail compact à droite.

## Composants / CSS touchés

| Emplacement | Intervention | Contraintes |
|---|---|---|
| `styles/bios-glass-v31-shell-v1.css` | Nouvelles queries `agent-workbench` basées sur la **largeur de la colonne Inbox** et non sur `window.innerWidth`. Cinq lanes côte à côte sur un conteneur ≥1250 px ; bande défilante avec lanes 228–280 px en dessous. | Le profil BIOS seul ; ne pas changer `legacy-bridge.css` ni les états du workflow |
| Même CSS | `bios-dashboard` : 2 KPI/ligne sur petites surfaces, 4/ligne dès 760 px utiles ; cartes ~92 px min ; grille des sections en une colonne sous 900 px utiles | Quatre valeurs intactes, mêmes libellés et filtres |
| Même CSS | `bios-ticket-detail` : rail empilé en premier sous 1020 px utiles ; deux colonnes au-delà, avec sticky uniquement quand le conteneur l'autorise | Pas d'action déplacée hors de la vue, pas de permission altérée |
| `components/inbox/agent-ticket-kanban.tsx` | Ajout d'un **scroll region focusable** et d'un indice discret de défilement sur conteneur étroit | Kanban lecture seule, liens directs et data-attributes conservés |
| `tests/uiux-bios-glass-ui03-operations.test.ts` | Tests de contrat postcss + responsive + invariants V1 | Pas de mock des règles métier ni désactivation de test |

**Aucune modification** à : `app/(app)/inbox/page.tsx`, `app/(app)/dashboard/page.tsx`, `app/(app)/tickets/[id]/page.tsx`, schéma Prisma, permissions, routage confidentiel, web push, SLA, requêtes ou service worker.

## Variantes à tester

- **Desktop large** : fenêtre 1440+ et sidebar repliée/ouverte ; le rail SLA apparaît uniquement selon le breakpoint du conteneur `agent-inbox`. Kanban de 5 lanes si l'espace utile le permet, sinon scroll local accessible.
- **Desktop compact / tablette** : 1024–1365 px de fenêtre, sidebar ouverte ; la largeur du workbench déclenche des colonnes Kanban défilables et le rail ticket s'empile quand nécessaire. Aucun overlap.
- **Mobile** : 320/375/390 px ; 2 KPI/ligne sans perte de libellé (tolère wrapping), Kanban scroll-snap et focus, détail du ticket pleine largeur, topbar/mobile nav existantes intactes.
- **Clair/sombre et sans transparence** : tous les nouveaux styles réutilisent les couleurs déjà approuvées `--kit-*`. Ne pas imposer un fond translucide aux champs ; la surface opaque de fallback reste définie dans UI-02.
- **Réduction du mouvement** : défilement automatique désactivé si préférence de réduction du mouvement.

## Risques et vérification

| Risque | Gravité | Vérification |
|---|---|---|
| Ancien `@media max-width:1199px` appliqué sur desktop avec sidebar | Haute | Contrôler computed style de `.agent-kanban-board` aux largeurs réelles, vérifier @container gagnant |
| La 6e colonne « Autres » (statut non mappé) masquée | Haute | Simuler un ticket non mappé ; le scroll doit inclure « Autres », aucune suppression |
| Rail de traitement masquant Claim ou actions | Haute | Contrôler boutons disponibles avec agent/responsable/demandeur, 200 % zoom |
| Scroll horizontal de page ou focus perdu | Haute | Touche Tab sur zone Kanban, flèches clavier, zoom mobile |
| Variation CSS hors profil BIOS | Moyenne | Vérifier scoping de chaque règle ; jamais remplacer `styles/legacy.css` globalement |
| KPI trop petits à 320 px | Moyenne | Tester en clair/sombre, avec chiffres longs et 200 % zoom |
| Contraste des textes sur verre réel | Moyenne | Mesurer pixels effectifs ; ≥4,5:1 normal et ≥3:1 grand texte |

### Conditions avant fusion

- [ ] CI V1 + Full : Vitest, lint, TypeScript, Prisma, build Next.js.
- [ ] Security S3 : aucune régression.
- [ ] Session Preview/Production de test : sept largeurs `320,375,390,768,1024,1280,1440`, sidebar ouverte/fermée ; souris, tactile, clavier.
- [ ] Liste Inbox par défaut, **unique** recherche/filtre, **un seul** Nouveau dans la barre du haut, `ClaimTicketButton` et preview `colSpan={7}` présents.
- [ ] Push, tickets confidentiels, rôles cumulés et règles de routage inchangés.
- [ ] Contrastes mesurés sur vraies surfaces (non certifiés par des tests PostCSS).
- [ ] Accord explicite du propriétaire avant fusion : PR laissée Draft.

**UI-03 ne constitue pas encore la certification globale BIOS Glass** : UI-04 (autres pages), UI-05 (recette responsive) et UI-06 (acceptation finale) restent séparées.
