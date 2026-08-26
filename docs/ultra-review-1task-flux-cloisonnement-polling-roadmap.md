# Ultra-review 1TASK — tickets inter-départements, cloisonnement, portefeuille et polling

**Statut : revue préalable, aucune nouvelle modification de code demandée dans ce document.**

## 1. Conclusion exécutive

Le modèle métier actuel est cohérent sur son principe : un utilisateur actif crée un ticket depuis son département source, le ticket est routé vers une file du département cible, puis seuls les acteurs disposant du bon périmètre de file et d’équipe peuvent le traiter. Le demandeur conserve l’accès à son propre ticket, tandis que l’agent ne peut traiter que les tickets de son équipe active et de sa file autorisée. Cette séparation est implémentée à la fois dans le service ticket et dans les prédicats d’accès, et ne doit pas être remplacée par un simple filtrage d’interface [1] [2].

La création inter-départementale est donc **fonctionnellement possible**, mais la formulation « chaque utilisateur » doit être précisée. Dans l’état actuel, ce droit concerne les utilisateurs actifs qui possèdent `ticket:create`. Le rôle `REQUESTER` possède également `ticket:create:cross-department`, comme `AGENT` et `QUEUE_MANAGER`. Les rôles `TECHNICAL_ADMIN` et `REPORTING_READER` ne possèdent pas automatiquement le droit de créer un ticket ; il serait dangereux de leur accorder ce droit sans décision métier explicite [3].

Deux écarts prioritaires subsistent. Premièrement, les Actifs sont actuellement visibles à toute personne disposant de `asset:read`, et cette permission est attribuée aux agents et responsables de file ; ils ne sont donc pas encore réservés au seul administrateur fonctionnel [3] [4]. Deuxièmement, le polling à 15 secondes est protégé contre certaines requêtes concurrentes, mais il relance des `router.refresh()` complets sur plusieurs écrans et effectue des chargements périodiques séparés pour les notifications. Ce mécanisme peut devenir coûteux avec plusieurs onglets et plusieurs dizaines ou centaines d’utilisateurs, surtout lorsque Neon est froid ou lent [5].

> **Décision recommandée :** ne pas réécrire tout le système. Stabiliser d’abord les invariants métier, réserver les Actifs à `FUNCTIONAL_ADMIN`, rendre la création de ticket idempotente, puis remplacer progressivement le polling global par un rafraîchissement ciblé et observable.

## 2. Parcours réel d’un ticket inter-départemental

Le flux cible IT vers ADM est le suivant :

```text
Utilisateur actif IT
        ↓
Création avec ticket:create
        ↓
Département cible ADM + besoin libre
        ↓
Vérification de ticket:create:cross-department
        ↓
Résolution serveur du service TRIAGE-ADM
        ↓
File ADM + SLA actif + statut TO_QUALIFY
        ↓
Notification au responsable et aux membres actifs de la file
        ↓
Boîte agent ADM
        ↓
Qualification
        ↓
Claim ou affectation par un responsable habilité
        ↓
ASSIGNED → IN_PROGRESS
        ↓
BLOCKED éventuel ou RESOLUTION_PENDING
        ↓
Confirmation par le demandeur
        ↓
CLOSED
```

La création ne doit jamais accepter du navigateur un `queueId`, un `slaId`, un `agentId` ou un `scopeId` sans vérification serveur. Le service actuel détermine le département cible, recherche le service `TRIAGE-{CODE}`, vérifie que la file et le département sont actifs, applique le SLA du service et crée l’événement de création dans la même transaction [1]. Cette architecture est la bonne base.

Le traitement reste volontairement cloisonné après la création. Un agent n’obtient pas le droit de traiter un ticket uniquement parce qu’il appartient au même département : il doit également être membre actif d’une équipe active rattachée à la file du ticket. Un agent ne peut pas affecter librement un ticket à un autre agent ; cette capacité revient au `QUEUE_MANAGER` ou à l’administrateur fonctionnel selon le périmètre. Le claim impose lui aussi une appartenance active à une équipe de la file [1] [2].

## 3. Matrice des rôles et des permissions

| Profil | Créer un ticket | Envoyer vers un autre département | Voir ses tickets | Voir une file | Traiter | Affecter/transférer | Administrer les Actifs après correction |
|---|---:|---:|---:|---:|---:|---:|---:|
| `REQUESTER` actif | Oui | Oui | Oui | Non, sauf accès personnel | Non | Non | Non |
| `AGENT` actif | Oui si autorisé | Oui | Oui | Oui, uniquement via équipe/file active | Oui sur ticket affecté ou claimable | Non | Non |
| `QUEUE_MANAGER` actif | Oui si autorisé | Oui | Oui | Oui sur file gérée/scopée | Oui | Oui dans son périmètre | Non |
| `FUNCTIONAL_ADMIN` global | Oui | Oui | Oui | Oui selon administration | Oui avec override audité | Oui | Oui |
| `TECHNICAL_ADMIN` | Pas automatiquement | Pas automatiquement | Pas automatiquement | Pas automatiquement | Non métier par défaut | Non métier par défaut | **À retirer** selon l’exigence actuelle |
| `REPORTING_READER` | Non | Non | Non opérationnel | Reporting autorisé seulement | Non | Non | Non |

Cette matrice doit être testée à deux niveaux : dans l’interface et dans les routes serveur. Masquer un bouton ne constitue jamais une protection suffisante.

## 4. Cloisonnement : ce qui est solide et ce qui doit être surveillé

Le cloisonnement actuel combine plusieurs frontières : département de la file, file autorisée, équipe active, rôle scoped, affectation et liste d’accès nominative pour les tickets confidentiels. Pour un agent, le filtre de visibilité limite les tickets aux membres actifs de ses équipes et aux files correspondantes ; les tickets non affectés de ces files peuvent être claimés, mais un agent d’une autre équipe ne doit pas les voir [1] [2].

La notification et la visibilité sont deux opérations distinctes. Une notification peut être produite pour un responsable ou un membre de file, alors que la liste de tickets peut encore exclure l’utilisateur si son `authorizedQueueId`, son équipe ou son `TeamMember` ne correspond pas. Il faut donc ajouter un test d’invariant : **tout destinataire de notification de file doit être soit responsable de cette file, soit membre actif d’une équipe active de cette file**, et la même condition doit être vérifiable dans la boîte agent.

## 5. Relations entre les modules et le ticket

| Module | Relation métier avec le ticket | Qui l’utilise | Règle de périmètre |
|---|---|---|---|
| Boîte agent | Vue opérationnelle des tickets d’une file et d’une équipe | `AGENT`, `QUEUE_MANAGER`, `FUNCTIONAL_ADMIN` | File, équipe active, rôle et scope |
| Clients | Référentiel parent des dossiers | Utilisateurs ayant `portfolio:read` | À préciser selon confidentialité du portefeuille |
| Dossiers clients | Regroupent client, missions et tickets liés | Portfolio autorisé | Mission/département, demandeur, source ou file selon la vue |
| Missions | Travail rattaché à un dossier, avec échéance, budget et worklogs | Portfolio autorisé | Département de la mission et permission portfolio |
| Actifs | Équipements, licences, affectations, mouvements et tickets liés | **À réserver à `FUNCTIONAL_ADMIN`** | Aucun accès opérationnel après correction |

Un ticket peut être rattaché à un dossier et/ou une mission. Le service vérifie que la mission existe, qu’elle appartient au dossier sélectionné et que le demandeur possède la permission `portfolio:read`; hors administrateur global, le département de la mission doit correspondre au département de l’acteur [1] [6].

La chaîne est donc :

```text
Client
  └── Dossier client
        └── Mission
              ├── Tickets liés
              ├── Worklogs de mission
              └── Échéance / budget
```

Le ticket reste l’objet opérationnel qui traverse les files. Le dossier et la mission fournissent le contexte de production ; ils ne doivent jamais élargir la visibilité d’un ticket au-delà des règles ticket. Une page Client ou Dossier doit appeler le même prédicat de visibilité ticket que la Boîte agent, ce qui est déjà le principe de `visibleTicketWhere` [1] [6].

### Point de vigilance sur les Clients

La liste des clients actifs est actuellement protégée par `portfolio:read`, mais elle n’applique pas une restriction départementale aussi étroite que les missions et les dossiers. Cela peut être acceptable si le référentiel client est volontairement transverse ; sinon, il faudra introduire une règle de confidentialité explicite. Cette décision doit être prise avant de modifier le code.

## 6. Actifs : écart confirmé par rapport à l’exigence

L’exigence demandée est :

```text
Seul FUNCTIONAL_ADMIN peut voir, créer, modifier et déplacer les Actifs.
```

L’état actuel n’est pas aligné. La page Actifs autorise l’accès avec `asset:read`, puis active les actions avec `asset:manage` [4]. Or le catalogue de rôles attribue actuellement `asset:read` à `AGENT` et `QUEUE_MANAGER`, et `asset:read` + `asset:manage` à `TECHNICAL_ADMIN` [3]. Le service de production protège le département, mais pas le caractère exclusivement administrateur fonctionnel de la fonctionnalité [6].

La correction recommandée est double :

1. Ajouter une garde serveur centrale exigeant un rôle fonctionnel global pour `listAssetsForViewer`, `getAssetForViewer`, `createAsset`, `moveAsset` et les routes associées.
2. Retirer `asset:read` et `asset:manage` des rôles opérationnels et techniques si la décision métier est réellement « fonctionnel uniquement ».

La garde d’interface doit être ajoutée en complément, jamais à la place de la garde backend. Un test négatif doit vérifier qu’un agent ne peut ni ouvrir `/assets`, ni appeler directement une route Actifs, ni modifier un mouvement.

## 7. Ultra-review du polling et du timeout

La version avec polling monte un composant `AutoRefresh` sur la Boîte agent, la fiche ticket, le dashboard responsable et les Missions. Les intervalles observés sont de 15 secondes pour les écrans opérationnels et de 30 secondes pour les Missions. Le composant déclenche `router.refresh()`, attend au minimum quatre secondes entre deux rafraîchissements, réagit au retour de focus et s’arrête lorsque l’onglet n’est plus visible [5].

Cette protection est utile mais insuffisante pour un déploiement à grande échelle. `router.refresh()` déclenche un nouveau rendu serveur de la route ; il ne s’agit pas d’une petite requête delta. Le verrou local est remis à zéro après un délai fixe de 1,5 seconde et ne connaît pas la fin réelle du rendu RSC. Plusieurs onglets peuvent donc effectuer chacun leur propre rafraîchissement. En parallèle, le centre de notifications et la page complète des notifications lancent leurs propres requêtes périodiques de 15 secondes [5].

Le risque n’est pas seulement le nombre de secondes. La Boîte agent reconstruit une visibilité complexe, récupère les tickets paginés et effectue aussi un `count` total ; la fiche ticket recharge son historique, ses affectations, ses événements et ses agrégations de worklogs. Avec beaucoup d’agents, le polling peut donc augmenter la charge Neon et la fréquence des cold starts Vercel.

Le timeout de création doit être traité séparément. Le service effectue plusieurs lectures avant transaction, puis une transaction configurée à `maxWait: 10_000` et `timeout: 15_000`. Les notifications sont envoyées via `after()` et ne doivent pas bloquer la réponse principale, ce qui est correct [1]. Toutefois, si la création dépasse le délai côté client, l’utilisateur peut cliquer à nouveau et créer un doublon si la première transaction a finalement abouti.

### Solution recommandée en trois niveaux

| Niveau | Solution | Objectif |
|---|---|---|
| Immédiat | Désactiver les refresh RSC périodiques sur les pages lourdes ; rafraîchir après mutation et proposer une actualisation manuelle | Éliminer les blocages et stabiliser Vercel |
| Intermédiaire | Créer des endpoints delta `updatedSince` pour tickets et notifications, avec curseur et pagination ; ne plus recalculer toute la liste | Réduire fortement les lectures Neon |
| Évolutif | Ajouter SSE ou un service temps réel managé pour les événements de file | Approcher le temps réel sans polling global |

Avant le niveau évolutif, il faut instrumenter les durées : temps d’attente connexion Neon, durée de la transaction, durée de la requête de liste, nombre de tickets retournés, nombre de notifications diffusées et taux de timeout.

## 8. Priorités de correction avant toute nouvelle fonctionnalité

| Priorité | Correction | Pourquoi |
|---|---|---|
| P0 | Réserver Actifs à `FUNCTIONAL_ADMIN` dans backend et UI | Écart direct avec l’exigence métier |
| P0 | Ajouter idempotency key à la création ticket | Évite les doublons après timeout ou double clic |
| P0 | Ajouter tests réels de visibilité notification ↔ boîte agent | Évite le symptôme « notification reçue mais ticket absent » |
| P1 | Remplacer `router.refresh()` périodique par refresh ciblé ou manuel | Réduit les blocages Vercel/Neon |
| P1 | Ajouter observabilité des durées et erreurs | Permet de distinguer Neon froid, transaction lente et bug métier |
| P1 | Ajouter pagination cursor/delta | Réduit les `count` et relectures complètes |
| P2 | Décider la confidentialité du référentiel Clients | Évite une fuite fonctionnelle de portefeuille |
| P2 | Ajouter tests Playwright multi-comptes Entra | Valide le parcours réel création/réception/clôture |

## 9. Prompt professionnel à utiliser avant l’implémentation

```text
Tu es un ingénieur senior Next.js, Prisma et PostgreSQL chargé de stabiliser et faire évoluer 1TASK, un service desk interne multi-départements.

OBJECTIF
Réaliser une revue puis une implémentation progressive des invariants suivants :
1. Tout utilisateur actif possédant ticket:create peut créer un ticket ; REQUESTER, AGENT et QUEUE_MANAGER doivent pouvoir envoyer un ticket vers un autre département lorsqu’ils possèdent ticket:create:cross-department.
2. La création inter-départementale ne donne aucun droit de traitement dans le département cible. Le ticket est routé côté serveur vers TRIAGE-{DEPARTMENT_CODE}, avec SLA actif, statut TO_QUALIFY et audit complet.
3. Le traitement reste limité à la file, à l’équipe active, au TeamMember actif, au rôle et au scope autorisé. Un AGENT peut claim un ticket disponible, mais seul un QUEUE_MANAGER ou FUNCTIONAL_ADMIN peut affecter/transférer selon son périmètre.
4. Le demandeur voit son ticket et les commentaires publics ; les commentaires internes restent réservés aux acteurs autorisés.
5. Le cycle de traitement doit rester NEW → TO_QUALIFY → TO_ASSIGN → ASSIGNED → IN_PROGRESS → BLOCKED éventuel → RESOLUTION_PENDING → CLOSED, avec REOPENED si le demandeur refuse la résolution.
6. Les Actifs doivent être visibles, créés, modifiés et déplacés uniquement par FUNCTIONAL_ADMIN global. Cette règle doit être imposée dans les services et routes backend, puis reflétée dans l’interface. Ne jamais se contenter de masquer un bouton.
7. Clients, Dossiers et Missions doivent conserver leurs relations avec les tickets sans élargir la visibilité ticket. Les pages de portefeuille doivent réutiliser le même prédicat de visibilité que la Boîte agent.
8. Le polling ne doit jamais bloquer la création ou le traitement d’un ticket. Ne pas utiliser router.refresh() périodiquement sur toutes les pages lourdes comme mécanisme temps réel principal.

CONTRAINTES ABSOLUES
- Ne pas modifier Microsoft Entra ID, NextAuth, les callbacks, les permissions d’authentification ni les données historiques sans justification.
- Ne pas utiliser db push ni migrate reset.
- Toute modification Prisma doit être additive, produire une migration nommée et être validée avec prisma migrate deploy.
- Ne jamais accepter depuis le navigateur queueId, slaId, agentId ou scopeId sans revalidation serveur.
- Conserver les triggers append-only et l’audit des tickets, affectations, transitions et mouvements d’actifs.
- Ne pas remplacer la logique par un simple contrôle frontend.
- Ne pas coder immédiatement : commencer par produire un plan d’impact, les invariants, les risques et les tests d’acceptation.

PLAN D’EXÉCUTION OBLIGATOIRE
Phase 0 — Baseline : lire le schéma, identity.ts, access-control.ts, ticket-service.ts, production-service.ts, routes API, pages Actifs, Boîte agent, Clients, Dossiers et Missions. Produire une matrice des rôles et des périmètres.
Phase 1 — Actifs : implémenter la garde FUNCTIONAL_ADMIN globale côté service, routes et page ; retirer les permissions Actifs des rôles non autorisés si la décision métier est confirmée ; ajouter tests positifs/négatifs.
Phase 2 — Création robuste : ajouter une idempotency key ou un mécanisme équivalent, désactiver le double clic, retourner une référence déterministe après transaction et documenter les erreurs timeout sans créer de doublon.
Phase 3 — Visibilité : tester que le destinataire de notification de file peut voir le ticket dans /inbox, que l’agent d’un autre département ne le voit pas et que l’accès direct est refusé.
Phase 4 — Temps réel maîtrisé : remplacer le polling RSC complet par un rafraîchissement après mutation et, si nécessaire, des endpoints delta/cursor pour tickets et notifications. Ajouter abort, timeout, backoff et métriques ; ne jamais laisser une requête bloquée sans limite.
Phase 5 — Portefeuille : tester ticket ↔ dossier ↔ mission ↔ client, worklog et permissions sans élargissement de visibilité.
Phase 6 — Validation : npm run typecheck, npm test, npm run lint, npm run build, tests Playwright multi-comptes et vérification SQL read-only sur une base Neon de test.

LIVRABLES
- Rapport d’impact avant code.
- Changements minimaux par phase.
- Migrations Prisma additives si nécessaires.
- Tests unitaires de permissions et tests E2E de cloisonnement.
- Changelog versionné.
- Guide de déploiement Windows/GitHub/Vercel/Neon.
- Aucun secret dans les archives ou commits.

CRITÈRES D’ACCEPTATION
- Un REQUESTER IT crée un ticket vers ADM et reçoit une référence.
- Le ticket possède requestedService, queue TRIAGE-ADM, SLA et statut TO_QUALIFY.
- Un AGENT ADM membre actif de Triage ADM le voit dans /inbox et peut le claim.
- Un AGENT IT hors périmètre ne le voit pas et reçoit 403 ou 404 sur accès direct.
- Le ticket peut être qualifié, affecté, traité, résolu et confirmé sans perte d’historique.
- Un timeout ou double clic ne crée pas deux tickets.
- Un utilisateur non FUNCTIONAL_ADMIN ne peut ni lister ni créer ni modifier un Actif.
- Les changements de statut, affectations, notifications et mouvements d’actifs sont audités.
```

## 10. Roadmap professionnelle et changelog proposé

La livraison doit être découpée en petits commits vérifiables. Chaque commit doit avoir un objectif unique, un test associé et un résultat de déploiement identifiable.

| Version proposée | Contenu | Tests obligatoires |
|---|---|---|
| `v0.9.0-baseline` | État actuel documenté, métriques et tests de non-régression | Typecheck, tests existants, build |
| `v0.9.1-assets-admin-only` | Actifs réservés à l’administrateur fonctionnel | Agent refusé, technical admin refusé, admin autorisé |
| `v0.9.2-ticket-idempotency` | Protection double clic et retry après timeout | Deux requêtes même clé = un seul ticket |
| `v0.9.3-queue-visibility` | Invariants notification/file/équipe | Réceptionnaire visible, outsider refusé |
| `v0.9.4-refresh-safe` | Refresh post-mutation, delta/cursor, timeout/backoff | Aucun refresh RSC périodique lourd |
| `v0.9.5-portfolio-integrity` | Client/dossier/mission/worklog | Aucun élargissement de périmètre |
| `v1.0.0-operational` | Parcours E2E réel multi-départements | Création, réception, traitement, résolution, clôture |

Format de changelog à conserver :

```markdown
## [0.9.1] — 2026-08-XX — Actifs réservés à l’administrateur fonctionnel

### Ajouté
- Garde backend globale FUNCTIONAL_ADMIN pour lecture et gestion des actifs.
- Tests négatifs AGENT, QUEUE_MANAGER et TECHNICAL_ADMIN.

### Modifié
- Navigation Actifs masquée pour les profils non autorisés.

### Sécurité
- L’accès direct aux routes Actifs est refusé même si le bouton est contourné.

### Validation
- typecheck: OK
- tests: OK
- lint: OK
- build: OK
```

## 11. Verdict final

Le ticket inter-départemental est **logiquement viable et déjà largement implémenté** : création autorisée par permission, routage serveur, traitement dans la file cible, claim limité à l’équipe active et clôture contrôlée. Il ne faut pas confondre « pouvoir envoyer » et « pouvoir traiter ».

La relation Boîte agent ↔ ticket est correcte dans son principe et doit être renforcée par un invariant notification/visibilité. Les relations Client ↔ Dossier ↔ Mission ↔ Ticket sont présentes et encadrées par `portfolio:read`, mais la politique de confidentialité du référentiel Client doit être explicitement décidée.

L’exigence Actifs-only-Functional-Admin n’est **pas encore satisfaite** et constitue la correction métier prioritaire. Enfin, le polling actuel est une solution de transition pratique, mais pas une architecture temps réel durable pour une charge élevée : il faut passer progressivement au rafraîchissement post-mutation, aux deltas/cursors, puis éventuellement à un canal temps réel managé.

### Références

[1]: https://github.com/larrynoah2603/1TASK/blob/main/lib/ticket-service.ts "1TASK — service de tickets"
[2]: https://github.com/larrynoah2603/1TASK/blob/main/lib/access-control.ts "1TASK — contrôle d’accès"
[3]: https://github.com/larrynoah2603/1TASK/blob/main/lib/identity.ts "1TASK — rôles et permissions"
[4]: https://github.com/larrynoah2603/1TASK/blob/main/app/(app)/assets/page.tsx "1TASK — page Actifs"
[5]: https://github.com/larrynoah2603/1TASK/blob/main/components/auto-refresh.tsx "1TASK — composant AutoRefresh"
[6]: https://github.com/larrynoah2603/1TASK/blob/main/lib/production-service.ts "1TASK — Clients, Dossiers, Missions et Actifs"
