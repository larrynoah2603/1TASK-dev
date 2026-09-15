# Audit performance backend — gate avant implémentation

**Date :** 15 septembre 2026  
**Périmètre :** dépôt courant, avec priorité à `ticket-service`, SLA, reporting, production et notifications  
**Décision :** classement validé ; implémentation progressive par lots atomiques

## Réponse courte : les phases demandées sont-elles présentes ?

| Phase | État actuel | Preuve / manque principal |
|---|---|---|
| Analyse statique Prisma | **Présente** | audit des appels, projections, pagination et fan-out déjà documenté |
| Coût et plans d'exécution réels | **Absente** | aucun export `EXPLAIN (ANALYZE, BUFFERS)`, aucune volumétrie représentative et aucun snapshot `pg_stat_statements` dans le dépôt |
| Optimisation SQL/Prisma | **Partielle** | pagination ticket, FTS, projections de listes, batch SLA et quelques agrégations sont présents ; plusieurs agrégats et listes restent coûteux |
| Indexation PostgreSQL | **Partielle** | index B-tree/composites et GIN FTS présents ; leur usage et leur amplification d'écriture ne sont pas mesurés en production |
| Cache multi-niveaux | **Partielle** | cache-aside Redis REST sur catalogue/reporting, TTL et single-flight local ; pas de matrice complète navigateur/CDN/application |
| Invalidation | **Partielle** | invalidation explicite du catalogue ; reporting dépend du TTL ; pas d'invalidation de groupe/version généralisée |
| SLA / notifications / outbox | **Présente, à mesurer** | batch SLA, `createMany`, clé idempotente, outbox avec lease/retry/DLQ logique |
| Monitoring performance | **Insuffisante** | durée et nombre de requêtes des opérations lentes seulement ; pas de p50/p95/p99, hit-rate cache, pool DB ou dashboard |
| Rapport final avant/après | **Absent** | impossible sans environnement et données de référence |

## Méthode et limites

L'analyse couvre les appels Prisma du dépôt, les sélections imbriquées, les agrégations, les tris, les limites, les migrations et les chemins de rendu Server Components. Elle qualifie un **risque statique**, pas un temps SQL observé.

La variable `DATABASE_URL` de production, un jeu de données représentatif, `pg_stat_statements` et les plans PostgreSQL ne sont pas disponibles. Par conséquent :

- aucun temps « avant/après », nombre de lignes scannées ou index utilisé n'est inventé ;
- aucun nouvel index n'est proposé comme acquis avant mesure ;
- les requêtes candidates devront être capturées avec les paramètres réels puis exécutées sur une copie anonymisée de production ;
- `EXPLAIN ANALYZE` ne doit pas être lancé directement sur une écriture de production.

## Les 20 candidats les plus coûteux

| Priorité | Fichier / service | Problème ou coût probable | Gain attendu | Risque de correction |
|---|---|---|---|---|
| P0 | `app/(app)/inbox/page.tsx` | une navigation attend liste paginée, total exact, six KPI, surveillance SLA et trois référentiels ; le temps est celui du plus lent des appels parallèles | très élevé sur les clics Opérations | moyen : préserver tous les compteurs et scopes |
| P0 | `lib/ticket-service.ts` — `getOperationalTicketSummary` | six `count` sur le même périmètre de visibilité | élevé, moins de parcours et moins de pression pool | élevé : SQL conditionnel doit reproduire l'ACL Prisma exactement |
| P0 | `lib/ticket-service.ts` — `listVisibleTicketsPageInternal` | `findMany` plus `count` exact à chaque filtre/clic ; offset encore utilisé sans curseur | élevé sur tables volumineuses/pages profondes | moyen : contrat UI dépend de `totalPages` |
| P0 | `lib/server-auth.ts` — contexte utilisateur | graphe rôles/permissions/scopes/équipes riche sur chaque nouvelle requête HTTP | élevé sur chaque clic | élevé : permissions temps réel, aucun cache inter-utilisateur |
| P0 | `lib/sla-monitor.ts` — balayage | tous les tickets SLA éligibles sont parcourus par lots même si leur prochaine échéance est lointaine | élevé pour le job et la DB | moyen : conserver seuils/calendriers/idempotence |
| P0 | `lib/reporting-service.ts` | trois `count` SLA plus un `groupBy`, avec prédicats de visibilité répétés | élevé sur reporting | élevé : conservation stricte du cloisonnement |
| P1 | `lib/ticket-service.ts` — recherche | fallback en trois `contains` si FTS désactivé/indisponible | élevé pour recherche texte | moyen : disponibilité de la migration FTS |
| P1 | `lib/ticket-service.ts` — détail ticket | trois lectures du ticket pour autorisation/cohérence, plus deux agrégats Worklog | moyen à élevé par ouverture | élevé : ne pas introduire une fuite lors d'une révocation concurrente |
| P1 | `lib/ticket-service.ts` — `listVisibleQueues` | lecture des files puis recherche des files personnelles puis deux agrégations statistiques | moyen à élevé sur dashboard | moyen : statistiques et confidentialité |
| P1 | `lib/production-service.ts` — résumé missions | trois `count` et deux `aggregate` pour une seule synthèse | élevé sur portefeuille | moyen : SQL conditionnel et relation Worklog |
| P1 | `lib/production-service.ts` — missions | requête relationnelle puis `groupBy` Worklog séparé | moyen | faible à moyen : conserver les minutes calculées |
| P1 | `lib/production-service.ts` — détail client | dossiers avec toutes les missions, tickets et agrégat Worklog | élevé pour gros clients | moyen : pagination des sous-collections visible dans l'UI |
| P1 | `lib/production-service.ts` — détail dossier | toutes les missions imbriquées et leurs compteurs, puis agrégat Worklog | élevé pour dossiers historiques | moyen |
| P1 | `lib/production-service.ts` — actifs | recherches `contains` et liste jusqu'à 100 avec relations | moyen | faible à moyen |
| P1 | `lib/admin-service.ts` — configuration | jusqu'à douze requêtes parallèles et graphes équipes/utilisateurs/catalogue selon section | élevé et forte pression sur le pool | moyen : formulaires attendent les référentiels |
| P1 | `lib/audit-service.ts` | offset, total exact et six branches `contains` | élevé quand AuditLog grandit | moyen : FTS/trigram et pagination curseur |
| P1 | `lib/knowledge-service.ts` | recherche `contains` sur corps texte et chargement de 100 articles | élevé selon taille des corps | moyen : FTS et extrait plutôt que corps complet |
| P2 | `lib/notification-service.ts` | liste bornée mais sans curseur stable ; compteur non lu en même temps | moyen | faible |
| P2 | `lib/distributed-cache.ts` | chaque panne Redis peut ajouter jusqu'à 500 ms avant fallback ; pas de circuit breaker ni métriques hit/miss | élevé pendant incident Redis | faible à moyen |
| P2 | `lib/outbox.ts` | livraison et mise à jour restent séquentielles après acquisition du lot | moyen sur backlog | moyen : concurrence, ordre et rate limiting |

## Requêtes à mesurer en premier

| Requête logique | Coût actuel | Lignes scannées | Plan actuel | Problème à confirmer | Optimisation candidate | Réduction attendue |
|---|---:|---:|---|---|---|---|
| KPI de `/inbox` | **à mesurer** | **à mesurer** | absent | six parcours du même scope | agrégation conditionnelle unique ou snapshot court | 6 requêtes vers 1, sous réserve d'ACL équivalente |
| liste ticket + total | **à mesurer** | **à mesurer** | absent | offset et `count` exact | curseur complet + total différé/optionnel | forte sur pages profondes |
| reporting SLA/statuts | **à mesurer** | **à mesurer** | absent | quatre agrégats concurrents | agrégation conditionnelle | 4 requêtes vers 1 |
| recherche ticket | **à mesurer** | **à mesurer** | absent | fallback `%terme%` | vérifier index GIN `search_vector` | éviter le scan texte si le GIN est choisi |
| scan SLA | **à mesurer** | **à mesurer** | absent | prédicat `OR` et parcours récurrent | prochaine échéance matérialisée ou deux branches indexables, après plan | moins de tickets candidats |
| audit texte | **à mesurer** | **à mesurer** | absent | six `ILIKE` et offset | FTS/trigram mesuré + curseur | forte à haute cardinalité |

Commandes de mesure proposées sur une copie représentative :

```sql
CREATE EXTENSION IF NOT EXISTS pg_stat_statements;

SELECT queryid, calls, total_exec_time, mean_exec_time, rows, shared_blks_hit,
       shared_blks_read, temp_blks_written
FROM pg_stat_statements
WHERE query ILIKE '%"Ticket"%'
ORDER BY total_exec_time DESC
LIMIT 20;

EXPLAIN (ANALYZE, BUFFERS, WAL, SETTINGS, FORMAT JSON)
-- requête capturée, paramètres représentatifs substitués ici
SELECT ...;
```

## Gate de validation demandé

Avant tout nouveau code, valider l'ordre proposé :

1. instrumenter `/inbox` par sous-opération et capturer ses requêtes lentes ;
2. obtenir les plans des KPI, de la liste et de la recherche avec volumes représentatifs ;
3. optimiser d'abord `getOperationalTicketSummary` si les six comptes dominent ;
4. sinon traiter le `count` exact/pagination ou le chargement du contexte utilisateur selon les mesures ;
5. seulement ensuite évaluer un index additionnel ou un cache.

## Correction 2 — résumé opérationnel

**Fichier :** `lib/ticket-service.ts`
**Avant :** six requêtes `count` distinctes pour total, actifs, non affectés, personnels, SLA à surveiller et SLA dépassés.
**Après :** une agrégation bornée par statut, une agrégation bornée aux deux valeurs d'affectation utiles et deux compteurs SLA.

**Pourquoi plus rapide :** PostgreSQL calcule total/actifs pendant un même groupement et non affectés/personnels pendant un second groupement. Le nombre d'allers-retours Prisma passe de six à quatre, sans transférer les lignes Ticket.
**Index :** aucun nouvel index. Les prédicats conservent les index Ticket existants ; l'index réellement choisi doit être confirmé par `EXPLAIN (ANALYZE, BUFFERS)`.
**Impact attendu :** deux requêtes en moins par rendu de `/inbox`, moins de concurrence sur le pool.
**Risque :** faible à moyen ; le prédicat de visibilité et les définitions SLA sont inchangés.
**Migration nécessaire :** non.
**Rollback :** rétablir les six `count` du commit précédent.

Tests :

- [x] Prisma validate
- [x] Typecheck
- [x] Tests
- [x] Build

Le prochain lot reste piloté par les mesures `inbox.*` ajoutées au lot précédent.

## Correction 3 — listes sans total exact

**Fichier :** `lib/ticket-service.ts`
**Avant :** `listVisibleTickets` réutilisait la fonction paginée et lançait donc un `count` exact, même lorsque l'appelant ne consommait que le tableau de tickets.
**Après :** le chemin paginé conserve son total exact ; le chemin liste appelle le même moteur avec `includeTotal=false` et évite le compteur.

**Pourquoi plus rapide :** le panneau SLA de `/inbox` et les autres aperçus bornés économisent un parcours complet du prédicat de visibilité.
**Index :** aucun nouvel index ; les index de liste existants restent applicables au `findMany`.
**Impact attendu :** une requête de moins pour chaque appel `listVisibleTickets`, notamment une requête de moins à chaque rendu Opérations.
**Risque :** faible ; les API paginées gardent `total`, `totalPages` et leur comportement historique.
**Migration nécessaire :** non.
**Rollback :** faire repasser `listVisibleTickets` par `listVisibleTicketsPage`.

Tests :

- [x] Prisma validate
- [x] Typecheck
- [x] Tests
- [x] Build

## Lots suivants proposés

1. **Lot 4 — reporting :** réduire les quatre agrégations de `getReportingSummary`, après comparaison des logs et plans.
2. **Lot 5 — pagination profonde :** rendre le curseur complet prioritaire et différer le total exact lorsque l'interface n'en a pas besoin.
3. **Lot 6 — contexte d'autorisation :** mesurer le graphe `UserContext` et créer des projections lecture/mutation sans cache de permissions inter-utilisateur.
4. **Lot 7 — SLA monitor :** réduire le jeu de tickets candidats par échéance et valider le plan des deux branches SLA.
5. **Lot 8 — production :** agréger le résumé missions et paginer les sous-collections client/dossier.
6. **Lot 9 — audit et connaissance :** remplacer les recherches `contains` coûteuses par une stratégie FTS/trigram mesurée.
7. **Lot 10 — résilience Redis :** circuit breaker, métriques hit/miss et invalidation versionnée.
8. **Lot 11 — observabilité :** exporter p50/p95/p99, pool PostgreSQL, requêtes lentes, cache et outbox vers un dashboard.
