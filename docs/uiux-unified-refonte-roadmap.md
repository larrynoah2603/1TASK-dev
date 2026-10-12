# 1TASK — Plan de refonte UI/UX unifiée (V1 / Full)

## Périmètre

La refonte couvre l'ensemble de l'application, et non seulement la Boîte agent :
shell/navigation, tableau de bord, création et détail ticket, Mes tickets, files,
administration et identités, SLA, actifs et demandes, reporting, notifications,
profil et modules Full (clients, dossiers, missions, connaissances).

Sources visuelles : référentiel BIOS / 1TASK et UI/UX Pro Max. Les choix confirmés
dans le dépôt priment sur le guide BIOS lorsqu'ils divergent.

## Contrats à préserver

- Navigation principale existante et unique action globale « Nouveau ticket ».
- Tokens couleurs `--kit-*` et police IBM Plex Sans ; pas de recoloration générale.
- Rôles cumulables, ACL et séparation administrateurs fonctionnels/techniques.
- V1 : routage, saisie simplifiée, idempotence, création et redirection, notifications,
  demandes d'actifs, fonctionnalités dormantes.
- Full : confidentialité, habilitations, production, routage, délégation, SLA.
- Tests et routes existants : pas de suppression de composant sans vérification des imports.

## Ordre de réalisation

1. Fondations : inventaire des composants actifs, tokens, focus/clavier et modales.
2. Harmonisation du shell et des primitives sans modification des liens de navigation.
3. Ticketing complet : dashboard, Mes tickets, création, détail, Boîte agent et files.
4. Console Admin : utilisateurs, rôles, équipes, départements, catalogue, SLA, audit.
5. Actifs : inventaire, demandes, validations et historique.
6. Reporting et notifications : filtres réellement fonctionnels, périmètres et états.
7. Modules Full : clients, dossiers, missions et connaissances, sans activation en V1.
8. Consolidation CSS/legacy par références vérifiées puis revue visuelle intégrale.

## Contrôles systématiques par PR

- 320, 375, 390, 768, 1024, 1280 et 1440 px ; sidebar ouverte/repliée.
- Modes clair et sombre ; contraste texte ≥ 4,5:1, grand texte/éléments graphiques ≥ 3:1.
- Tabulation, Entrée, Espace, Échap, piège de focus, focus visible et restauration.
- Formulaires : messages d'erreur et de succès, états chargés, confirmation explicite.
- Aucun doublon de recherche, de filtre ni de bouton « Nouveau ticket ».
- Parcours demandeur, agent, responsable file, admin fonctionnel et admin technique.
- Données confidentielles, notifications, droits et workflows de création/traitement.
- CI : lint, typecheck, tests, build dans les profils `v1` et `full`.

## PR 1 — Socle accessible

- Corriger `--kit-space-8`, auparavant référencé sans définition.
- Ajouter un comportement clavier partagé aux modales courantes, sans toucher
  aux formulaires, API, règles métier, styles de navigation ou aux données.
- Garder cette PR isolée ; migrer les autres modales seulement après validation.
