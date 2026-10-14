# UI-07 — conformité de la typographie BIOS Glass v3.1

**Date :** 14/10/2026. **Base :** `main` au commit `f293fa2a8747c0e37963ae74a3cf6bfa02883a7a`.

## Diagnostic documenté

Le guide choisi exige **Schibsted Grotesk pour les textes et les titres**, et **IBM Plex Mono pour les données numériques**. Le dépôt charge déjà les trois familles nécessaires localement dans `app/layout.tsx`, mais `styles/bios-glass-v31-preview.css` attribue Schibsted uniquement aux titres et laisse `--kit-font` (corps et contrôles) sur IBM Plex Sans, ancienne règle du projet.

La demande du 14/10/2026 autorise expressément la migration visuelle : cet arbitrage actualise uniquement le **profil BIOS**. Il ne change pas les valeurs du profil de repli, les composants React, les routes ni le backend.

## Hiérarchie et changements

| Cible | Avant | Après | Vérification |
|---|---|---|---|
| Corps et contrôles V1 en BIOS | `--kit-font` hérité IBM Plex Sans | `--kit-font` → Schibsted Grotesk | Styles calculés sur `body`, composants et champs |
| Titres BIOS | Schibsted Grotesk | Inchangé | H1, H2, H3, navigation |
| Références, KPI et chiffres | IBM Plex Mono | Inchangé | Tableaux, compteurs, badges numériques |
| Profil hors BIOS | IBM Plex Sans | Inchangé | Désactiver `data-visual-profile` en Preview |
| Modes clair/sombre | Polices identiques entre modes | Inchangé | Préférences utilisateur |

**Fichiers impactés :** `styles/bios-glass-v31-preview.css`, `tests/uiux-bios-glass-pr02-palette-fonts.test.ts`, documentation PR02 et cette note.

## Variantes responsive et risques

Cette migration peut modifier les longueurs de lignes, retours à la ligne et dimensions perçues sans toucher aux données ni à la logique. Vérifier les vues et états suivants à `320, 375, 390, 768, 1024, 1280, 1440` px, avec sidebar et rail ouverts : Inbox, Dashboard, création et détail ticket, administration, actifs, notifications, profil et connexion. Répéter en clair/sombre, zoom 200 %, clavier et contenus longs.

Aucun écran métier Full n'est activé. Aucun second bouton Nouveau, aucun filtre ajouté, aucun changement de permission, de routage, de SLA ou de notification.

## Validation requise

Lancer tests V1/Full, ESLint, TypeScript et build (CI). Le test de contrat contrôle le nouveau token sans supprimer la vérification du token IBM Plex Sans du fallback. Le CSS se limite au profil `bios-glass-v31` et la palette reste identique.

**Statut :** branche/proposition, **non certifié visuellement**. Aucun navigateur authentifié ni comparatif photographique mesuré ici. Fusion uniquement après validation des tests et débordements ; aucune modification de Production ni déploiement manuel effectué.
