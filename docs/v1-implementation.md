# 1TASK V1 — état d’implémentation

> Relevé P00/P01, mis à jour jusqu’à P11 le 4 octobre 2026. Les éléments **vérifiés** décrivent ce dépôt ; les
> éléments **proposés** restent à réaliser. Aucun réglage de production n’est déduit du code.

## Référence vérifiée

- Branche observée : `work`, commit initial `0accc5917440f9e73e615f6c79105d3bd87984d6`, arbre propre avant travaux.
- Point de départ observé pour P09 : `0e209c8`; aucun travail local non lié n’était présent.
- Référence d’analyse fournie : `60de73123835386444bed330ffc30e7f6f077323`.
  Les trois commits supplémentaires ne modifiaient que `vercel.json` : les deux jobs cron
  Vercel ont été retirés pour le staging Hobby. Les routes des jobs restent présentes.
- Remote observé : `origin`, fetch/push vers `https://github.com/larrynoah2603/1TASK-dev`.
- Dépendances verrouillées installées par `npm ci`; Prisma Client 6.19.3 généré.
- CI réelle : PostgreSQL 16 isolé, `prisma migrate deploy`, `RUN_DB_TESTS=1`, puis
  `npm run validate`. Aucun service PostgreSQL jetable n’était disponible localement lors
  du relevé : les migrations et tests DB n’ont donc pas été lancés contre une base partagée.
- Le profil par défaut reste `full`. `PRODUCT_PROFILE=v1` doit être choisi explicitement
  en test/staging et ne doit pas être activé sur un environnement partagé avant les phases
  qui câblent ses restrictions.

## Capacités et écarts déjà présents

Le dépôt contient déjà la synchronisation Entra et le rôle demandeur, les profils gérés,
le routage catalogue/triage, la création idempotente, la prise en charge concurrente,
les contrôles de portée, les tickets confidentiels et délégations, les commentaires
internes, l’audit append-only, les SLA/calendriers, les notifications, les actifs et les
demandes d’actifs. Les tests correspondants sont notamment `identity.test.ts`,
`managed-user-profile.test.ts`, `routing.test.ts`, `claim.test.ts`,
`ticket-business-journeys.test.ts`, `confidential-ticket-feature.test.ts`,
`sla-monitor-performance.test.ts`, `notification-service.test.ts` et
`asset-requests.test.ts`.

Les phases P01–P10 ont ajouté le profil V1, la synchronisation Entra avec validation
administrative manuelle, le triage déterministe, la création simplifiée, `CANCELLED`,
la clôture automatique en jours ouvrés,
la désactivation de l’auto-affectation, le claim borné des responsables et la navigation
simplifiée, puis les gardes des fonctionnalités dormantes. Les modules dormants, tables et
routes historiques sont conservés. P11 ne change pas le modèle métier : il audite la livraison,
consigne les preuves reproductibles et fixe les conditions de passage en staging.

## Frontières actuelles

1. Authentification : [`lib/auth.ts`](../lib/auth.ts) et
   [`lib/auth-policy.ts`](../lib/auth-policy.ts).
2. Synchronisation Entra : [`lib/identity.ts`](../lib/identity.ts), puis contexte et
   autorisations dans [`lib/server-auth.ts`](../lib/server-auth.ts).
3. Schémas de création : [`lib/validation.ts`](../lib/validation.ts).
4. Routage catalogue/triage : [`lib/routing.ts`](../lib/routing.ts).
5. Création, affectation, claim et messages : [`lib/ticket-service.ts`](../lib/ticket-service.ts).
6. Transitions et qualification :
   [`lib/ticket-workflow-service.ts`](../lib/ticket-workflow-service.ts).
7. Lecture/reporting : [`lib/ticket-query-service.ts`](../lib/ticket-query-service.ts) et
   [`lib/reporting-service.ts`](../lib/reporting-service.ts).
8. Tâches de fond : [`lib/sla-monitor.ts`](../lib/sla-monitor.ts),
   [`lib/outbox.ts`](../lib/outbox.ts) et `app/api/jobs/`.

## Séquence P00–P11

| Phase | Statut | Décision / responsabilité |
|---|---|---|
| P00 | Terminé | Référence, frontières, tests et contraintes d’environnement consignés ici. |
| P01 | Terminé | Profil `full\|v1`, politique unique, garde stable et navigation V1 ; `full` inchangé. |
| P02 | Terminé | Synchroniser l’identité Entra sans activer automatiquement le profil métier ; l’administrateur valide ensuite département, rôle et périmètre. |
| P03 | Terminé (infrastructure) | Persister une destination globale déterministe et provisionner atomiquement les ressources TRIAGE départementales ; la simplification du formulaire reste bornée à la phase dédiée. |
| P04 | Terminé | Création V1 objet/description/service facultatif, matching conservateur, repli global et qualification transverse bornée. |
| P05 | Terminé | Ajouter l’annulation terminale bornée aux demandes précoces, auditée et exclue du travail actif. |
| P06 | Terminé | Calculer et surveiller la clôture automatique après cinq durées de jour ouvré configurées. |
| P07 | Terminé | Désactiver toute auto-affectation en V1 sans effacer la configuration avancée du profil full. |
| P08 | Terminé | Rendre les responsables de file opérationnels pour le claim et le traitement dans leur périmètre explicite. |
| P09 | Terminé | Simplifier la navigation, regrouper le pilotage SLA dans Reporting et déplacer la gestion des actifs sous Administration. |
| P10 | Terminé | Désactiver côté serveur workflows, `/api/v1`, push, Redis, outbox et email externes. |
| P11 | Terminé (préparation, GO conditionnel) | Matrice d’acceptation auditée et runbook de release ; les contrôles Entra, navigateur et fixtures PostgreSQL restent des portes de staging tant qu’ils ne sont pas exécutés. |

P01 définit les capacités destinées aux phases aval dans
[`lib/product-policy.ts`](../lib/product-policy.ts). P09 câble `productionPortfolio`,
`knowledge`, `myAssets` et
`assetAdministration`; P10 `workflowDefinitions`, `publicApiV1`, `pushNotifications`,
`redisCache`, `externalOutboxDelivery` et `externalEmailDelivery`. Les lectures historiques
confidentielles et de pièces jointes restent soumises à leurs autorisations, jamais à un
repli de stockage public.

## Résultats et limites

- `npm ci` : réussi (634 paquets, génération Prisma réussie).
- Tests ciblés P00/P01 : 11 fichiers, 60 tests réussis.
- `DATABASE_URL=postgresql://localhost/test npm run validate` pendant P09 : réussi ; 90 fichiers et
  408 tests réussis, 3 fichiers et 10 tests DB ignorés faute de `RUN_DB_TESTS=1`; ESLint
  conserve un avertissement préexistant `@next/next/no-img-element` dans
  `app/(app)/loading.tsx`; typecheck, validation Prisma et build Next.js réussis.
- `git diff --check` : réussi.

Les tests sans base permettent de distinguer une régression de politique des vérifications
dépendantes de PostgreSQL. Pour reproduire CI, il faut fournir une instance PostgreSQL 16
jetable accessible par `DATABASE_URL`, y appliquer `npx prisma migrate deploy`, puis lancer
`RUN_DB_TESTS=1 npm run validate`. La validation Entra réelle exige en plus un tenant et des
identifiants dédiés ; elle n’est pas simulée par ce relevé. Retour arrière : repasser
explicitement à `PRODUCT_PROFILE=full` arrête le provisioning automatique futur, puis révoquer
le commit. Les profils déjà provisionnés restent intacts conformément à la règle de
préservation des données et peuvent être corrigés par le parcours administrateur exceptionnel.

### P03 — données et exploitation

La migration additive `20261002150000_add_v1_triage_configuration` ajoute le singleton
`V1Configuration` et les relations stables des ressources TRIAGE générées. Après déploiement,
configurer d’abord un SLA/calendrier actif dans l’administration SLA, puis exécuter
`npm run repair:v1-triage` en lecture seule. Vérifier les conflits éventuels avant
`npm run repair:v1-triage -- --apply`, exclusivement sur l’environnement visé. Sélectionner
ensuite un service métier opérationnel comme destination globale. Tant que cette référence
n’est pas valide, le routage V1 échoue explicitement au lieu de choisir un département par
convention. Le retour arrière applicatif conserve les colonnes et ressources ajoutées ; il
ne supprime ni tickets, ni affectations, ni identifiants historiques.

### Règle opérationnelle — département, file, équipe et catalogue

La V1 considère la **file** comme frontière opérationnelle principale. Un service métier du
catalogue route vers une file active ; les équipes et leurs agents sont rattachés à cette file.
Lorsqu'un périmètre doit être isolé d'un autre, il doit utiliser une file dédiée plutôt que deux
équipes partageant la même file. Exemple recommandé :

```text
Département Informatique
├── File Support réseau
│   ├── Équipe Admin & Réseau
│   └── Services Wi-Fi / Internet / VPN
├── File Support applicatif
│   ├── Équipe Applications
│   └── Services accès / logiciel
└── TRIAGE Informatique (ressources internes provisionnées)
```

Le demandeur conserve l'accès à son propre ticket. Les agents travaillent dans les files atteintes
par leurs équipes actives ; un responsable de file explicitement borné peut superviser, claim et
affecter dans sa file. Le rôle REQUESTER conserve `ticket:create:cross-department` : un salarié
peut donc sélectionner un service d'un autre département ou d'une autre file du même département,
sans acquérir pour autant de droit de lecture ou de traitement sur la destination.

Le service configuré comme **triage global** est une destination technique de secours. En V1 il
n'est ni affiché dans le catalogue du demandeur ni accepté comme sélection explicite par l'API.
Il reste utilisable par le serveur lorsque le demandeur laisse le service en détection automatique
et qu'aucune correspondance métier fiable n'est trouvée. Les ressources TRIAGE départementales
provisionnées restent également internes et ne figurent pas dans le catalogue demandeur.

### P04 — création et qualification

Le profil V1 accepte uniquement l’objet, la description, un service facultatif et le jeton
d’idempotence technique. Les champs avancés sont rejetés par un schéma strict. Sans service,
le serveur tente le matching conservateur sur l’objet et la description, puis utilise la
destination globale P03 avec le statut `TO_QUALIFY`. La migration additive
`20261002170000_add_global_triage_qualification_permission` attribue la capacité de routage
depuis cette file aux rôles de traitement existants ; elle n’accorde aucune visibilité globale
sur les tickets des files de destination.


### P05 — annulation terminale

`CANCELLED` est un état terminal distinct de la clôture réussie. En V1, seul le
demandeur peut annuler sa propre demande depuis `NEW`, `TO_QUALIFY` ou `TO_ASSIGN`,
avec un motif d’au moins dix caractères. Dès qu’un traitement opérationnel a commencé,
l’annulation demandeur n’est plus proposée. Les agents, responsables et administrateurs
ne disposent pas de cette action sur la demande d’un autre utilisateur. La mutation
conditionne son écriture au statut relu : une prise en charge concurrente et une
annulation ne peuvent donc pas réussir ensemble. Les tickets annulés restent dans les
recherches, historiques et exports, mais sont exclus des files actives, charges agents et
calculs SLA. Le taux de clôture utilise explicitement `total - cancelled` comme dénominateur
et expose les annulations séparément. La migration additive
`20261003100000_add_cancelled_ticket_status` conserve toutes les données existantes.


### P06 — confirmation et clôture automatique

À chaque entrée dans `RESOLUTION_PENDING`, le serveur conserve `resolvedAt` comme date de
soumission et persiste `autoClosureDueAt`. L’échéance correspond à cinq fois la durée configurée
d’une journée (`workdayEndMinute - workdayStartMinute`), consommée par le moteur de calendrier
existant avec jours ouvrés, jours fériés et fuseau. Une réouverture efface cette échéance ; une
nouvelle résolution la recalcule. Les SLA techniques de résolution et l’attente de confirmation
restent deux indicateurs distincts.

Le moniteur SLA authentifié exécute également un lot borné de clôtures dues. La mise à jour
conditionnelle sur le statut et l’échéance rend les jobs superposés et la course avec une
confirmation/réouverture idempotents. L’événement, l’audit système sans faux utilisateur et la
notification in-app sont créés dans la même transaction ; aucune livraison externe n’est émise.
Le déploiement V1 utilise Upstash QStash comme scheduler externe : il appelle POST
`/api/jobs/sla-monitor` toutes les cinq minutes avec le même `CRON_SECRET` que Vercel.
Le retard maximal attendu est donc la fréquence choisie plus la durée d’un lot. GitHub
Actions reste réservé à la CI et Vercel héberge l’application.

Après migration, exécuter `npm run backfill:auto-closure` en dry-run. `--apply` ne renseigne que
les tickets dont `resolvedAt`, le SLA et le calendrier sont fiables et dont l’échéance calculée
est encore future. Les enregistrements incomplets ou déjà échus sont signalés pour revue, sans
horodatage inventé ni clôture immédiate.


### P07 — auto-affectation désactivée en V1

La capacité centrale `autoAssignment` protège désormais les deux appels existants : création
catalogue et qualification. En V1, une file conserve sa valeur `Queue.autoAssignment`, mais
aucun agent n’est choisi : une création catalogue reste non affectée dans son état initial et
une qualification aboutit à `TO_ASSIGN`. Le claim, l’affectation manuelle, leurs contrôles de
périmètre, l’historique, l’audit et les notifications restent inchangés.

L’administration des files affiche l’auto-affectation comme inactive en V1. L’API refuse avec
la réponse stable `FEATURE_DISABLED` toute tentative de l’activer et préserve la valeur déjà
stockée lors des autres modifications ; le retour au profil `full` retrouve donc le comportement
historique. Aucune migration ou réparation de données n’est requise.

Une réactivation future devra séparer les compétences obligatoires des mots-clés de routage,
ou introduire une rotation concurrente explicitement testée. Aucun nouvel algorithme de rotation
n’est ajouté dans cette phase.


### Workflow V1 simplifié — présentation et actions

La V1 conserve les statuts internes historiques pour la compatibilité, l'audit, les SLA et les
jobs, mais n'expose plus leur granularité complète au demandeur. La progression publique est :

```text
Reçue → En traitement → Résolution proposée → Fermée
```

`BLOCKED` est présenté comme **En attente** et `CANCELLED` comme **Annulée**. Les statuts
`NEW`, `TO_QUALIFY` et `TO_ASSIGN` sont regroupés sous **Reçue** ; `ASSIGNED`,
`IN_PROGRESS` et `REOPENED` sous **En traitement**.

En V1, un acteur qui est aussi le demandeur du ticket est traité comme demandeur sur sa propre
fiche, même s'il possède par ailleurs un rôle d'administration ou de traitement. Il ne voit donc
pas les actions opérationnelles de qualification, affectation, transfert ou workflow sur son
propre ticket. Lorsqu'une résolution est soumise, il peut uniquement la confirmer ou signaler
que le problème persiste.

Pour les agents et responsables, le sélecteur générique de statuts est remplacé par des actions
contextuelles : **Prendre en charge**, **Démarrer/Reprendre le traitement**, **Mettre en attente**
et **Résoudre le ticket**. Un claim V1 sur un ticket métier affecte l'acteur et passe directement
le ticket en `IN_PROGRESS`, évitant l'étape intermédiaire `ASSIGNED → IN_PROGRESS`. Un ticket
encore en `TO_QUALIFY` conserve cet état lors du claim afin que la qualification ne puisse pas
être contournée. Une affectation manuelle par un responsable conserve `ASSIGNED` jusqu'au
démarrage explicite par l'agent.

### P08 — responsables de file opérationnels

Les rôles `QUEUE_MANAGER` reçoivent `ticket:claim` et `ticket:process` dans le catalogue runtime
et par la migration additive `20261004100000_queue_manager_operational_permissions`. Aucun rôle
global n’est ajouté aux utilisateurs. Un responsable sans rôle AGENT ni appartenance `TeamMember`
peut prendre un ticket seulement si la file est explicitement gérée, si `authorizedQueueId` la
borne, ou si une portée non globale correspond. Un rôle responsable seul et non borné ne suffit
pas au claim.

Le prédicat utilisé pour le bouton est le même que celui du service. Dans la transaction, identité,
permission, file active, département actif, portée, accès confidentiel/délégation, absence
d’affectation et statut claimable sont relus avant l’update conditionnel. Cette condition atomique
ne laisse qu’un gagnant entre agents et responsables concurrents. Après claim, les permissions
`ticket:process` et `ticket:resolve` permettent le parcours ordinaire vers traitement puis résolution.
Aucune donnée métier existante n’est modifiée par la migration.

### Workflow V1 — demandes d’actifs et inventaire

La V1 conserve un libre-service simple : **Mes actifs** ne liste que les lignes
`Asset` dont `assignedToId` correspond à l’utilisateur authentifié. Le demandeur
ne choisit jamais un numéro d’inventaire précis. Il choisit uniquement une famille
(ordinateur, téléphone, accessoire ou autre), un motif et une priorité.

Le formulaire expose uniquement le **nombre agrégé d’actifs actifs et non attribués**
pour chaque famille. Un stock nul ne bloque pas la demande : l’administrateur
fonctionnel global peut approuver le besoin sans matériel disponible. Dans ce cas,
la demande reste `APPROVED` sans `assetId` et est présentée comme
**« Approuvée · attente de stock »**.

Le workflow V1 est :

```text
Demandeur crée une demande
→ FUNCTIONAL_ADMIN global valide
→ soit refus motivé
→ soit approbation sans stock
→ soit approbation + attribution immédiate
→ si approbation sans stock : attribution ultérieure depuis l’inventaire
→ création d’un AssetMovement
→ notification du demandeur
→ apparition du matériel dans Mes actifs
```

Chaque nouvelle demande notifie également les administrateurs fonctionnels globaux.
L’attribution revalide dans la transaction que l’actif est `ACTIVE`, libre et du
même type que la demande. Une concurrence entre deux attributions ne peut donc
pas attribuer le même actif deux fois. Aucun nouveau statut Prisma n’est nécessaire
pour la V1 : `APPROVED` + `assetId = null` signifie « besoin approuvé, attribution
en attente » ; `APPROVED` + `assetId != null` signifie « attribuée ».

### P09 — navigation, administration et reporting

En V1, la navigation principale est réduite à Tableau de bord, Tickets, Boîte agent, Files,
Mes actifs et Reporting, toujours filtrés par les rôles et permissions existants. Clients,
Dossiers, Missions et Connaissances sont masqués et leurs pages/API refusent le profil V1 ;
les sources et données historiques restent intactes. Les API d’actifs sous `/api/production/assets`
restent actives et conservent leurs contrôles fonctionnels.

Le pilotage SLA est rendu dans `/reporting` avec les mêmes requêtes bornées et sans données de
missions. L’ancienne URL `/dashboard/responsible` redirige après le contrôle `reporting:read` et
conserve ses paramètres. L’inventaire et la revue des demandes sont disponibles sous
`/admin/assets` et `/admin/asset-requests` depuis des cartes secondaires. Les notifications
adressées au demandeur pointent vers `/my-assets`, jamais vers la revue administrateur.
# Politique des fonctionnalités dormantes (P10)

Le déploiement V1 doit définir `PRODUCT_PROFILE=v1`. La base PostgreSQL,
NextAuth, Microsoft Entra ID, le domaine autorisé et `CRON_SECRET` restent
obligatoires en production. Redis, Web Push, Microsoft Graph Mail et la
livraison outbox externe sont inactifs : leurs variables peuvent être absentes
ou contenir une ancienne configuration partielle sans empêcher le démarrage.
Le profil `full` conserve la validation stricte de chaque ensemble de variables.

En V1, l’API `/api/v1`, les définitions de workflow déclaratives, les nouveaux
uploads, les nouveaux tickets confidentiels et l’activation de délégations
confidentielles sont refusés côté serveur. Le moteur d’état des tickets, les
SLA, les notifications dans l’application, les lectures autorisées de pièces
jointes historiques et la révocation des délégations existantes restent actifs.
Les jobs SLA/fermeture automatique restent planifiés. Le job outbox exige
toujours son secret mais répond par un résultat vide sans acquérir de lignes ni
initialiser de fournisseur.

Les lignes outbox historiques en attente sont conservées telles quelles. Avant
toute réactivation ou tout passage au profil `full`, un opérateur doit examiner
explicitement destinataires, autorisations courantes, ancienneté et impact de
chaque ligne ; aucun rejeu global automatique ne doit être effectué.

## P11 — acceptation intégrée et préparation de release

La matrice de 25 contrôles et le statut exact de leurs preuves se trouvent dans
[`v1-acceptance-matrix.md`](./v1-acceptance-matrix.md). Le runbook opératoire, y compris
l’ordre des migrations, les deux dry-runs, l’activation staging, la surveillance et les
frontières de rollback, se trouve dans [`v1-release-runbook.md`](./v1-release-runbook.md).

La revue P11 n’autorise pas un déploiement à elle seule. Pour le lancement actuel sur base
fraîche, la validation PostgreSQL de la base fraîche/candidate, une session Entra de test et
la revue desktop/mobile doivent encore produire leurs artefacts dans l’environnement de staging.
La fixture d’upgrade synthétique n’est requise que pour une future release qui migrerait une
ancienne base 1TASK.
Un test unitaire ou contractuel est indiqué comme tel dans la matrice et n’est jamais présenté
comme une preuve navigateur ou infrastructure. Aucun seed, migration ou script de réparation
n’a été exécuté sur une base partagée pendant cette phase.
