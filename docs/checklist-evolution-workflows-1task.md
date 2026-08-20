# 1TASK — Checklist de livraison des workflows et roadmap d’évolution

## Périmètre de la livraison

Cette livraison conserve l’authentification Microsoft Entra ID, les permissions existantes, le cloisonnement des tickets et l’architecture Next.js/Prisma. Elle ajoute une permission de création inter-départementale contrôlée et un cycle de vie explicite pour les articles de la base de connaissances.

## Fonctionnalités livrées

| Domaine | État | Vérification |
|---|---|---|
| Tickets inter-départements | Implémenté | `ticket:create:cross-department` autorise la création vers une autre file ; la lecture et le traitement restent limités par queue/team/scope. |
| Source et destination du ticket | Conservé | `sourceDepartmentId` vient du profil du demandeur ; `queueId` et le département destinataire viennent du catalogue. |
| Base de connaissances | Implémenté | Statuts `DRAFT`, `REVIEW`, `PUBLISHED`, `ARCHIVED`, tags, owner, revue et transitions auditées. |
| Opérations | Existant et conservé | Qualification, assignation, claim, blocage, résolution, réouverture et historique d’événements. |
| Boîte agent | Existant et conservé | Visibilité par file/équipe/scope, affectation, messages, pièces jointes et résolution. |
| Clients | Existant et conservé | Référentiel client et accès contrôlé. |
| Dossiers clients | Existant et conservé | Dossiers confidentiels, missions et rattachement aux tickets. |
| Missions | Existant et conservé | Cycle de mission, échéances, budget et worklogs. |
| Actifs | Existant et conservé | Inventaire, affectation, statut et `AssetMovement`. |
| Pilotage SLA | Existant et conservé | Échéances, alertes, breaches, escalades et exceptions SLA. |
| Reporting | Existant et conservé | Lecture selon scope, exports contrôlés et indicateurs de charge. |
| Administration | Existant et étendu | Rôles, permissions, utilisateurs, départements, queues, équipes, catalogue, SLA, notifications, workflows et audit. |

## Migrations et déploiement

1. Vérifier une sauvegarde de la branche Neon de test.
2. Exécuter `npx prisma migrate deploy` avec `DATABASE_URL` et `DIRECT_URL` configurées.
3. Vérifier la migration `20260819120000_knowledge_article_status`.
4. Exécuter le script SQL d’appoint `docs/sql/add-cross-department-permission.sql` si les rôles et permissions ont été créés avant cette livraison.
5. Vérifier la présence de la permission `ticket:create:cross-department` sur les rôles concernés.
6. Redéployer Vercel depuis la branche validée.
7. Tester avec un utilisateur REQUESTER, un agent de la file cible et un administrateur fonctionnel global.

## Matrice de tests fonctionnels

| Scénario | Résultat attendu |
|---|---|
| Un REQUESTER crée vers sa file | Création autorisée. |
| Un REQUESTER crée vers une autre file avec la nouvelle permission | Création autorisée ; la visibilité reste limitée. |
| Un utilisateur sans `ticket:create:cross-department` crée vers une autre file | Refus HTTP 403. |
| Un agent de la file cible ouvre le ticket | Lecture autorisée. |
| Un agent d’une autre file ouvre le ticket | Lecture refusée sauf accès nominatif ou demandeur. |
| Le demandeur répond au ticket | Message public visible par la file de traitement. |
| Une file transfère le ticket | Événement, audit et historique de file conservés. |
| Article créé en DRAFT | Non visible aux lecteurs ordinaires. |
| Article DRAFT → REVIEW | Transition autorisée pour le gestionnaire knowledge. |
| Article REVIEW → PUBLISHED | Visible dans la base publiée du périmètre. |
| Article PUBLISHED → ARCHIVED | Retiré de la base publiée, conservé pour audit. |
| Article d’un autre département | Refusé pour un gestionnaire non global. |
| Actif affecté à un utilisateur | Mouvement et audit enregistrés. |
| SLA à 80 % puis 100 % | Notification et escalade selon les règles actives. |
| Reporting d’un scope différent | Données non visibles. |

## Contrôles techniques réalisés

```text
Prisma Client généré : OK
Prisma schema validate : OK avec une URL de validation locale
TypeScript : OK
Tests : 86 réussis, 3 ignorés
Build Next.js : OK
Authentification Entra ID : non modifiée
```

## Roadmap recommandée

### P0 — Mise en production contrôlée

Appliquer les migrations, déployer sur Vercel, exécuter les tests inter-départements et confirmer que le ticket est visible uniquement dans la file cible.

### P1 — Catalogue collaboratif

Ajouter une entité de proposition de service permettant à un utilisateur de suggérer un nouveau service sans modifier directement le catalogue. Le gestionnaire fonctionnel valide ensuite la proposition, choisit la file, le SLA, la nature et la catégorie.

### P1 — SLA temps réel

Ajouter une vue de file avec compte à rebours, indicateurs de breach, filtres par seuil et historique d’escalade. Le calcul doit rester côté serveur.

### P1 — Affectation intelligente

Ajouter des règles de capacité, compétences, disponibilité, charge courante et rotation équitable, avec possibilité de surcharge manuelle justifiée.

### P2 — Knowledge avancée

Ajouter versioning, approbation à deux niveaux, expiration automatique, recherche plein texte et liens entre articles et solutions de tickets.

### P2 — Reporting avancé

Ajouter séries temporelles, export CSV/XLSX, charge par équipe, temps imputé par mission, respect SLA et analyse des transferts.

### P2 — Événements temps réel

Remplacer progressivement le polling par un canal temps réel pour les nouvelles affectations, messages, notifications et changements SLA.

## Règles de sécurité à préserver

L’autorisation de créer vers une autre file ne donne jamais automatiquement le droit de lire ou de traiter les tickets de cette file. Les tickets confidentiels restent soumis aux accès nominatifs. Les modifications de fiche utilisateur, rôles, scopes, catalogue, SLA et workflows restent auditées.
