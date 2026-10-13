# PR06 — BIOS Glass v3.1 : finition ciblée, fallbacks et accès au contrôle visuel

> **Actualisation 13/10/2026 :** PR06 (#99) a été fusionnée dans `main`. La production peut maintenant utiliser la variante BIOS, sur décision explicite du propriétaire, grâce à `data-visual-profile` dans `app/layout.tsx`. Retour arrière par `BIOS_GLASS_ENABLED=false` et redéploiement. Ce document conserve l'historique de PR06 ; voir [README](./README.md) pour l'état courant.


**Statut : proposition pour review ; opt-in Preview/dev uniquement.** PR06 vient **après** PR01 à PR05, toutes intégrées dans `main` grâce à la fusion de PR #97 pour les lots PR04/PR05. **Aucune activation de BIOS Glass par défaut en production.** Référence : [README](./README.md) · [PR04](./PR04-shell-v1.md) · [PR05](./PR05-v1-pages.md).

## Diagnostic vérifié dans le code

1. **Inbox — panneau Filtres :** la PR04 appliquait la même surface `--bios-glass-card` translucide aux cartes et au panneau déroulant `.inbox-filter-panel`. Or ce dernier contient des champs actifs ; lisibilité instable sur les contenus en arrière-plan, notamment en mode sombre.
2. **Rail SLA — transparence réduite :** la règle Glass ciblait `.inbox-operations-industrial .agent-workspace-rail > section` mais ne l'incluait pas dans les deux fallbacks opaques du shell.
3. **Notifications :** le fallback `@supports not` de PR05 ne ciblait pas l'en-tête `.notification-history-header`. La règle `prefers-reduced-transparency` ne pouvait pas systématiquement prendre le dessus sur les anciennes déclarations `background: ... !important`.
4. **Dialogues et combobox :** PR05 demandait un flou de 20 px sur des surfaces à 96–97 % opaques, opération inutile pour des écrans moins puissants.
5. **Responsive déjà existant :** `styles/design-system.css` définit une Inbox avec `@container agent-inbox`, un rail SLA replié et des filtres unifiés. **Ne pas remplacer cette grille, ne pas créer un deuxième filtre ou une deuxième action Nouveau.**

## Changements précis PR06

| Composant / CSS | Correctif | Risque |
|---|---|---|
| `styles/bios-glass-v31-shell-v1.css` | Retirer le panneau de filtres des cartes Glass ; lui attribuer `--bios-glass-raised`, une ombre de popup, un défilement vertical borné à la hauteur du viewport | Faible, CSS opt-in seulement |
| `styles/bios-glass-v31-shell-v1.css` | Couvrir le rail SLA avec les fallbacks opaque et transparence réduite | Faible |
| `styles/bios-glass-v31-v1-pages.css` | Fallback pour en-tête + liste de notifications, prioritaire sur `!important` existants | Faible |
| `styles/bios-glass-v31-v1-pages.css` | Désactiver le blur sur les modales quasi opaques, sans modifier leur dimension ni leur contenu | Faible |
| `tests/uiux-bios-glass-pr06-finition.test.ts` | Parsing PostCSS, scoping opt-in et contrats de navigation/filtres/ticket | Aucun changement fonctionnel |

**Aucun TSX/API/schéma/permission/notification/modèle de données ou token de production modifié.** Aucun renommage global de classe, aucun effacement de `legacy.css` ; chaque adaptation cible un défaut confirmé. Les polices locales (Fontsource PR97) et le profil BIOS restent inchangés.

## Hiérarchie et variantes

- **Dashboard :** contexte → indicateurs compacts → activité ; aucune nouvelle carte KPI ou action.
- **Inbox :** barre unique de recherche/filtres → liste et aperçu/Claim → rail SLA selon la largeur du conteneur. Le popup peut défiler sans déborder en hauteur. Kanban reste consultatif.
- **Ticket :** titre, statut et SLA → demande → prise en charge / conversation. Flux V1 inchangés.
- **Desktop (1280/1440) :** conserver le rail existant lorsque le conteneur est assez large ; éviter les surfaces transparentes pour l'édition.
- **Tablette (768/1024) :** respecter les règles `@container` existantes. Panneaux lisibles, pas de chevauchement.
- **Mobile (320/375/390) :** garder filtres accessibles au clavier/toucher, scroll interne du panneau, zone principale prioritaire ; aucune navigation secondaire ajoutée.
- **Clair/sombre :** surfaces éditables quasi opaques et cartes Glass ; `prefers-reduced-transparency` et absence de blur = cartes opaques avec tokens sémantiques.

## Tests et critères d'acceptation

Les tests automatiques vérifient le scoping `html[data-visual-profile="bios-glass-v31"]`, les fallbacks CSS, la présence d'une barre de filtres unique, le bouton global Nouveau unique et les invariants V1. CI à exécuter **en `PRODUCT_PROFILE=v1` et `full`** : Vitest, ESLint, TypeScript, Prisma, build. Ne pas marquer comme « validé visuellement » sur la seule base de cette CI.

Après ce lot, réaliser la **revue complète de toutes les vues authentifiées**, pas seulement Dashboard/Inbox : routes accessibles aux demandeurs, agents, responsables de file et administrateurs, détails tickets, actifs, reporting, notifications, profil et formulaires. Comparer le rendu 1TASK et le profil BIOS en **clair/sombre** et **320, 375, 390, 768, 1024, 1280, 1440 px**. Mesurer les contrastes réels (texte ≥4,5:1, grand texte ≥3:1), navigation clavier/Tab/Entrée/Échap, cibles tactiles, focus, menus, overlays, tables et performance du flou. Vérifier les scénarios métier : création/routage/confidentialité, notifications avec onglet en arrière-plan, Claim, SLA, multi-rôles et approbation d'actifs.

**Gates avant fusion :** CI V1 et Full vertes, diff limité au CSS opt-in + test + documentation, revue de code, recette Preview authentifiée, accord explicite du propriétaire. **Ne pas activer automatiquement la palette BIOS en production.** Rollback Preview : « BIOS Glass · Actif — Revenir à 1TASK ».
