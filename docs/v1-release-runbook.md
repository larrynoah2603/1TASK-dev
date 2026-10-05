# Runbook de release 1TASK V1

Ce runbook prépare une activation **staging**. Il ne constitue ni une autorisation de production,
ni une procédure de déploiement automatique. Utiliser deux bases PostgreSQL 16 jetables et des
identifiants Entra de test ; ne jamais exécuter ces étapes sur une base partagée par inadvertance.

## 1. Prérequis et configuration minimale

- Artefact applicatif contenant P00–P11 et capable de comprendre `CANCELLED`,
  `Ticket.autoClosureDueAt`, `V1Configuration` et les relations TRIAGE.
- PostgreSQL 16 sauvegardé, URL vérifiée par deux opérateurs, accès migration distinct si prévu.
- `DATABASE_URL`, secrets NextAuth/session, identifiants Microsoft Entra, domaine autorisé,
  `CRON_SECRET` robuste et `PRODUCT_PROFILE=v1` dans **staging seulement**.
- Redis, push, mail Graph, livraison outbox et upload privé restent inactifs en V1. Une lecture
  de pièce jointe historique requiert toutefois un stockage privé durable correctement configuré.
- Un calendrier ouvré actif, un SLA TRIAGE actif et un service global TRIAGE choisi explicitement.

Avant toute commande, afficher uniquement hôte, port et nom logique de base (jamais mot de passe),
puis confirmer que la cible porte le marqueur jetable attendu.

## 2. Validation sur base fraîche (fixture A)

Créer une base vide dédiée, sans `prisma/seed.ts`, puis exécuter séquentiellement :

```bash
npx prisma migrate deploy
RUN_DB_TESTS=1 PRODUCT_PROFILE=v1 npm run validate
npm run repair:v1-triage
npm run backfill:auto-closure
```

Depuis l’administration minimale, créer organisation, calendrier, SLA, départements, mappings
Entra et destination globale. Le dry-run TRIAGE doit énumérer les ressources à créer sans écrire.
Appliquer ensuite `npm run repair:v1-triage:apply`, refaire le dry-run (zéro modification),
puis configurer `V1Configuration.globalTriageServiceId`. Ne pas utiliser le seed de démonstration.

## 3. Validation d’upgrade (fixture B)

Restaurer dans une seconde base jetable une copie **synthétique et expurgée** comportant : utilisateurs
actifs/en attente, départements sans TRIAGE, anciens tickets, grants/délégations confidentiels actifs
et expirés, résolutions en attente, métadonnées de pièces jointes et outbox externe en attente.

1. Sauvegarder et relever les volumes par statut, tickets, audits, pièces jointes, grants,
   délégations et outbox.
2. Exécuter `npx prisma migrate status`, puis `npx prisma migrate deploy`. L’ordre est celui des
   répertoires `prisma/migrations`; les ajouts V1 finissent par TRIAGE, permission de qualification,
   `CANCELLED`, échéance de clôture puis permissions des responsables.
3. Exécuter `npm run repair:v1-triage` en dry-run. Examiner les conflits de codes réservés et les
   départements incomplets. Appliquer seulement après revue, puis relancer le dry-run pour prouver
   l’idempotence.
4. Exécuter `npm run backfill:auto-closure` en dry-run. Les résolutions sans `resolvedAt`, SLA ou
   calendrier fiable et les échéances déjà dépassées restent incomplètes pour revue manuelle ; ne
   pas inventer une date ni fermer immédiatement. Appliquer, puis relancer le dry-run.
5. Comparer les volumes : aucune disparition de ticket, audit, affectation, pièce jointe, grant,
   délégation ou outbox. Les lignes outbox en attente ne doivent être ni acquises ni livrées.
6. Exécuter `RUN_DB_TESTS=1 PRODUCT_PROFILE=v1 npm run validate`, puis les 25 contrôles de la matrice.

## 4. Configuration explicite avant activation

- Affecter le SLA/calendrier par défaut et vérifier fuseau, horaires, jours fériés et durée du jour.
- Vérifier chaque file/service TRIAGE provisionné et choisir une unique destination globale active.
- Synchroniser les rôles/permissions **additivement** via les migrations : ne retirer aucun rôle
  historique. Vérifier notamment qualification globale, `ticket:cancel`, claim/process des
  responsables bornés et absence de rôle global accidentel.
- Tester un routage catalogue, un repli global et une qualification transverse avec trois
  départements afin de prouver les refus origine/destination hors portée.

## 5. Activation staging et jobs authentifiés

Définir `PRODUCT_PROFILE=v1`, redéployer l’artefact validé et vérifier login Entra, création,
notification IN_APP et My Assets. Appeler GET et POST `/api/jobs/sla-monitor` avec le secret du
scheduler, puis sans/mauvais secret (refus attendu). Vérifier de même `/api/jobs/outbox` : authentifié,
il retourne un lot vide sans changer les lignes ; non authentifié, il est refusé. Programmer le SLA
toutes les cinq minutes. Ne pas programmer de rejeu outbox.

Effectuer la revue desktop/mobile : navigation, formulaire trois champs, feedback succès/conflit,
chargement, liste vide, accès refusé et erreur contrôlée. Archiver captures et journaux expurgés.

## 6. Surveillance et critères d’arrêt

Suivre au minimum : échecs de création/idempotence, tickets TRIAGE non affectés et leur âge,
confirmations en retard, lots de clôture (traités/ignorés/échoués), erreurs scheduler, refus
d’autorisation anormaux, croissance outbox et indisponibilités de pièces jointes. Alerter sans
mettre dans les logs descriptions, destinataires, jetons ou secrets.

Arrêter la montée en charge si les frontières de département/confidentialité échouent, si un job
duplique audit/notification, si un fournisseur dormant est appelé, ou si les rapprochements de
volumes divergent.

## 7. Rollback et forward-fix

- Un rollback applicatif doit être une version qui sait lire `CANCELLED` et tous les champs V1.
  Une version antérieure incompatible est interdite.
- Repasser à `PRODUCT_PROFILE=full` ne défait aucune migration, ressource TRIAGE, échéance, permission
  ou donnée créée. Cela réactive aussi des capacités : examiner l’outbox historique avant ce choix.
- Ne jamais retirer une valeur d’enum, supprimer une colonne/table, effacer les tickets historiques,
  grants, délégations, pièces jointes ou affectations comme rollback.
- Préférer un forward-fix additive. En cas d’arrêt, couper le trafic ou le scheduler concerné,
  conserver la base et les preuves, corriger, remigrer si nécessaire et refaire les deux fixtures.
- Toute réactivation de livraison externe exige une revue ligne par ligne des destinataires,
  autorisations actuelles, ancienneté et impact ; aucun rejeu global automatique.

## 8. Fiche de preuve à compléter

Pour chaque fixture : identifiant non sensible, commit, versions Node/PostgreSQL, heures de début/fin,
sortie des migrations, deux dry-runs avant/après, résultat `npm run validate`, rapprochements de
volumes et anomalies. Pour Entra/navigateur/scheduler : compte de test, rôle/périmètre, scénario,
résultat et lien vers artefact expurgé. Une case non exécutée reste « à exécuter », jamais verte.
