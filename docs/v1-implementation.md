# 1TASK V1 — état d’implémentation

> Relevé P00/P01 du 2 octobre 2026. Les éléments **vérifiés** décrivent ce dépôt ; les
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

Écarts matériels avec la cible V1 : un nouvel utilisateur Entra ordinaire arrive encore
en `PENDING_ASSIGNMENT` plutôt qu’en demandeur actif ; l’auto-affectation est active ; le
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
| P02 | Proposé | Synchroniser un Entra reconnu en demandeur actif sans seed ni nom codé en dur. |
| P03 | Proposé | Simplifier la création à titre, description, service optionnel et conserver l’idempotence. |
| P04 | Proposé | Router vers le service choisi ou une unique file globale de triage, sans auto-affectation. |
| P05 | Proposé | Conserver claim concurrent et affectation manuelle avec portées et conflits d’état. |
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
- `DATABASE_URL=postgresql://localhost/test npm run validate` : réussi ; 83 fichiers et
  352 tests réussis, 1 fichier et 3 tests DB ignorés faute de `RUN_DB_TESTS=1`; ESLint
  conserve un avertissement préexistant `@next/next/no-img-element` dans
  `app/(app)/loading.tsx`; typecheck, validation Prisma et build Next.js réussis.
- `git diff --check` : réussi.

Les tests sans base permettent de distinguer une régression de politique des vérifications
dépendantes de PostgreSQL. Pour reproduire CI, il faut fournir une instance PostgreSQL 16
jetable accessible par `DATABASE_URL`, y appliquer `npx prisma migrate deploy`, puis lancer
`RUN_DB_TESTS=1 npm run validate`. La validation Entra réelle exige en plus un tenant et des
identifiants dédiés ; elle n’est pas simulée par ce relevé. Retour arrière P01 : repasser
explicitement à `PRODUCT_PROFILE=full`, puis révoquer le commit ; aucune migration ni donnée
n’est à annuler.
