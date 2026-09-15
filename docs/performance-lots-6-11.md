# Livraison des lots de performance backend 6 à 11

**Date :** 15 septembre 2026  
**Base :** `perf/backend-optimization`  
**Migration Prisma/PostgreSQL :** aucune. Aucun index ni aucune relation Prisma n'est modifié.

Ces optimisations sont structurelles. Aucun gain de temps PostgreSQL ni usage d'index n'est affirmé en l'absence d'un jeu de données représentatif et d'un `EXPLAIN (ANALYZE, BUFFERS)`.

## Lot 6 — résumé du portefeuille missions

- **Objectif :** remplacer les compteurs total/actif séparés par un `Mission.groupBy` par statut ; le retard, le budget et les worklogs gardent leurs prédicats et agrégations propres.
- **Fichiers applicatifs :** `lib/production-service.ts`.
- **Commit :** `perf: aggregate mission portfolio counters`.
- **Avant / après :** deux `count` pour total/actif deviennent un groupement et une réduction en mémoire de quelques groupes de statut.
- **Gain structurel :** un aller-retour Prisma en moins, sans annoncer de gain SQL mesuré.
- **Garanties / risque :** permission, périmètre départemental, définition du retard et réponse inchangés ; risque faible lié à la reconstruction des deux valeurs.
- **Rollback :** rétablir les deux `mission.count`.

## Lot 7 — pagination des worklogs de mission

- **Objectif :** curseur `id`, ordre stable `startedAt desc, id desc`, fenêtre de 50 par défaut/100 maximum et lecture de la ligne supplémentaire sans `COUNT(*)`.
- **Fichiers applicatifs :** `lib/production-service.ts`, `app/api/production/missions/[id]/worklogs/route.ts`.
- **Commit :** `perf: paginate mission worklogs`.
- **Garanties / risque :** authentification, permission, existence et département restent contrôlés. Le corps demeure `{ worklogs: [...] }`; la navigation est exposée uniquement par `X-Has-More` et `X-Next-Cursor`. Le wrapper historique reste disponible.
- **Rollback :** restaurer le `findMany` historique et retirer les en-têtes.

## Lot 8 — projections client et dossier

- **Objectif :** sélectionner seulement les champs rendus par les deux pages, tout en gardant les missions/dossiers complets en nombre, les 50 tickets et les agrégats worklogs.
- **Fichiers applicatifs :** `lib/production-service.ts`.
- **Commit :** `perf: narrow portfolio detail projections`.
- **Garanties / risque :** `portfolio:read`, administration globale, périmètre départemental, confidentialité, `visibleTicketWhere`, tris et structure des pages sont inchangés. Risque principal : omission d'un champ, couvert par TypeScript/build et le contrat de projection.
- **Rollback :** rétablir les `include` précédents.

## Lot 9 — projection du moniteur SLA

- **Objectif :** projection Ticket explicite et usage direct de `assignedToId`, sans charger la relation `assignedTo`.
- **Fichiers applicatifs :** `lib/sla-monitor.ts`.
- **Commit :** `perf: narrow sla monitor ticket projection`.
- **Garanties / risque :** candidats, pauses, calcul, seuils, escalades, destinataires, idempotence, transaction Serializable, retry P2034 et batch restent identiques.
- **Rollback :** restaurer l'`include` Ticket et la relation `assignedTo`.

## Lot 10 — contexte d'autorisation

- **Objectif :** projections imbriquées explicites pour département, hiérarchie, équipe/file, rôles, permissions et scopes.
- **Fichiers applicatifs :** `lib/server-auth.ts`.
- **Commit :** `perf: narrow authorization context projections`.
- **Garanties / risque :** tous les identifiants et attributs de décision sont conservés ; aucun cache inter-utilisateur, aucune modification de `requireCurrentActor`, `roleScopeMatches`, du rôle administrateur ou des règles confidentielles.
- **Rollback :** restaurer les relations larges du `userContextInclude`.

## Lot 11 — p50, p95 et p99 locaux

- **Objectif :** agréger par label `count`, erreurs et au plus 200 durées, puis calculer les percentiles uniquement au snapshot.
- **Fichiers applicatifs :** `lib/performance.ts`.
- **Commit :** `perf: aggregate server latency percentiles`.
- **Garanties / risque :** aucune donnée métier, SQL ou erreur n'est stockée ; les erreurs sont propagées et les logs lents restent identiques. Les métriques sont **locales à chaque instance Node** et ne constituent pas un agrégat distribué.
- **Rollback :** retirer l'agrégateur et son appel dans le `finally`.

## Validation

```bash
DATABASE_URL='postgresql://postgres:postgres@127.0.0.1:5432/onetask?schema=public' npx prisma validate
DATABASE_URL='postgresql://postgres:postgres@127.0.0.1:5432/onetask?schema=public' npm run typecheck
DATABASE_URL='postgresql://postgres:postgres@127.0.0.1:5432/onetask?schema=public' npm test
DATABASE_URL='postgresql://postgres:postgres@127.0.0.1:5432/onetask?schema=public' npm run build
git diff --check
git status --short --branch
```

## Vérifications après un squash GitHub

```bash
git grep 'mission.groupBy' -- lib/production-service.ts
git grep 'listMissionWorklogsPage' -- lib/production-service.ts app/api/production/missions/'[id]'/worklogs/route.ts
git grep 'getDossierForViewer\|getClientForViewer' -- lib/production-service.ts
git grep 'assignedToId: ticket.assignedToId' -- lib/sla-monitor.ts
git grep 'const userContextInclude' -- lib/server-auth.ts
git grep 'getServerOperationMetrics\|MAX_OPERATION_SAMPLES' -- lib/performance.ts
```
