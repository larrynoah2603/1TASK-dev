# 1TASK V1 — état d’implémentation

> Relevé P00/P01, mis à jour par P02 le 2 octobre 2026. Les éléments **vérifiés** décrivent ce dépôt ; les
> éléments **proposés** restent à réaliser. Aucun réglage de production n’est déduit du code.

## Référence vérifiée

- Branche observée : `work`, commit initial `0accc5917440f9e73e615f6c79105d3bd87984d6`, arbre propre avant travaux.
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

P02 active désormais un nouvel utilisateur Entra ordinaire comme demandeur lorsque son
département Graph normalisé possède une correspondance active vers un département actif.
Sans correspondance, il reste en `PENDING_ASSIGNMENT`. Les autres écarts matériels avec la
cible V1 sont : l’auto-affectation est active ; le
portfolio de production, la connaissance, les workflows déclaratifs, `/api/v1`, le push,
Redis et l’outbox externe existent ; la création confidentielle et les nouveaux uploads
sont possibles ; `TicketStatus` ne contient pas encore `CANCELLED` et aucune fermeture
automatique en jours ouvrés n’a été trouvée. Ces constats ne demandent ni suppression de
données ni suppression des modèles dormants.

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
| P02 | Terminé | Synchroniser un Entra reconnu et mappé en demandeur actif sans seed ni nom codé en dur. |
| P03 | Terminé (infrastructure) | Persister une destination globale déterministe et provisionner atomiquement les ressources TRIAGE départementales ; la simplification du formulaire reste bornée à la phase dédiée. |
| P04 | Terminé | Création V1 objet/description/service facultatif, matching conservateur, repli global et qualification transverse bornée. |
| P05 | Terminé | Ajouter l’annulation terminale bornée aux demandes précoces, auditée et exclue du travail actif. |
| P06 | Proposé | Ajouter l’annulation précoce bornée au state machine et auditée. |
| P07 | Proposé | Résolution, confirmation demandeur et fermeture automatique en jours ouvrés. |
| P08 | Proposé | Rendre portfolio/connaissance dormants et déplacer inventaire/revue dans l’admin. |
| P09 | Proposé | Bloquer les nouvelles créations confidentielles/uploads tout en gardant les lectures protégées. |
| P10 | Proposé | Désactiver côté serveur workflows, `/api/v1`, push, Redis, outbox et email externes. |
| P11 | Proposé | Réparation additive/idempotente, parcours d’intégration complet et préparation du déploiement. |

P01 définit les capacités destinées aux phases aval dans
[`lib/product-policy.ts`](../lib/product-policy.ts). P03/P09 câblent
`confidentialTicketCreation` et `attachmentUploads`; P04 `autoAssignment`; P05
`manualAssignment`/`claim`; P08 `productionPortfolio`, `knowledge`, `myAssets` et
`assetAdministration`; P10 `workflowDefinitions`, `publicApiV1`, `pushNotifications`,
`redisCache`, `externalOutboxDelivery` et `externalEmailDelivery`. Les lectures historiques
confidentielles et de pièces jointes restent soumises à leurs autorisations, jamais à un
repli de stockage public.

## Résultats et limites

- `npm ci` : réussi (634 paquets, génération Prisma réussie).
- Tests ciblés P00/P01 : 11 fichiers, 60 tests réussis.
- `DATABASE_URL=postgresql://localhost/test npm run validate` pendant P04 : réussi ; 87 fichiers et
  388 tests réussis, 3 fichiers et 10 tests DB ignorés faute de `RUN_DB_TESTS=1`; ESLint
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

### P04 — création et qualification

Le profil V1 accepte uniquement l’objet, la description, un service facultatif et le jeton
d’idempotence technique. Les champs avancés sont rejetés par un schéma strict. Sans service,
le serveur tente le matching conservateur sur l’objet et la description, puis utilise la
destination globale P03 avec le statut `TO_QUALIFY`. La migration additive
`20261002170000_add_global_triage_qualification_permission` attribue la capacité de routage
depuis cette file aux rôles de traitement existants ; elle n’accorde aucune visibilité globale
sur les tickets des files de destination.


### P05 — annulation terminale

`CANCELLED` est un état terminal distinct de la clôture réussie. Seuls les agents, responsables
de file et administrateurs fonctionnels disposant de `ticket:cancel` peuvent annuler depuis
`NEW`, `TO_QUALIFY` ou `TO_ASSIGN`, avec un motif d’au moins dix caractères. La mutation
conditionne son écriture au statut et à l’affectation relus : une prise en charge concurrente
et une annulation ne peuvent donc pas réussir ensemble. Les tickets annulés restent dans les
recherches, historiques et exports, mais sont exclus des files actives, charges agents et
calculs SLA. Le taux de clôture utilise explicitement `total - cancelled` comme dénominateur
et expose les annulations séparément. La migration additive
`20261003100000_add_cancelled_ticket_status` conserve toutes les données existantes.
