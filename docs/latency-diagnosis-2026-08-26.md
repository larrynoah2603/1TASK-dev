# Diagnostic de latence — 2026-08-26

## Symptôme
Les navigations vers certaines interfaces 1TASK peuvent dépasser 10 secondes sur Vercel/Neon, surtout lorsque la base est froide ou lorsque les pages chargent plusieurs collections relationnelles.

## Causes identifiées

1. `getSessionUserContext()` était appelé dans le layout protégé puis dans chaque page. Une déduplication par rendu a été ajoutée avec `react/cache`.
2. `getAdminConfiguration()` chargeait en parallèle 12 collections, dont utilisateurs avec relations, équipes avec membres, services avec SLA et calendriers avec jours fériés, même pour `/admin/sla`, `/admin/departments`, `/admin/queues`, etc. Le chargement est maintenant ciblé par section.
3. Le dashboard admin chargeait le snapshot administratif complet alors qu’il n’avait besoin que d’un nombre total/actif d’utilisateurs. Un résumé par statut est maintenant utilisé.
4. L’inbox chargeait une page de tickets puis une seconde collection jusqu’à 100 tickets pour produire les KPI et le panneau SLA. Un résumé serveur et une liste limitée d’alertes remplacent le second chargement complet.
5. `getClientForViewer()` chargeait tous les dossiers visibles puis filtrait le client côté application. La fiche client interroge maintenant directement les dossiers du client avec la même borne de périmètre.

## Corrections appliquées

- `getAdminConfiguration(actor, sections?)` avec dépendances minimales par section.
- `getAdminUserSummary(actor)` par agrégation de statuts.
- `getOperationalTicketSummary(actor)` pour les KPI inbox.
- `getSessionUserContext` dédupliqué par requête Server Components.
- `getClientForViewer` sans liste globale préalable.

## Ce qui reste à mesurer

La vérification finale doit être réalisée sur le Neon et le deployment Vercel réels avec des mesures de durée de requête. Les pages portefeuille et le dashboard responsable restent candidates à une pagination/agrégation ciblée. Il ne faut pas conclure à une cause unique sans consulter les logs Vercel et les métriques Neon.

## Invariants

Microsoft Entra ID, permissions, cloisonnement, audit append-only, idempotence ticket, calcul SLA et schéma métier existant doivent rester inchangés hors des changements explicitement documentés.
