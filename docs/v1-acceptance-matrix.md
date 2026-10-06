# P11 — matrice d’acceptation V1 (25 contrôles)

Date de revue du dépôt : 4 octobre 2026. **Automatisé** signifie qu’un test du dépôt couvre le
comportement ; cela ne remplace pas un contrôle navigateur ou Entra. **À exécuter en staging**
est une porte de release, pas un succès implicite. Les commandes réellement exécutées pour
cette revue sont consignées dans le compte-rendu de PR.

| # | Contrôle | Preuve dans le dépôt | Statut P11 |
|---:|---|---|---|
| 1 | Le premier login Entra crée/synchronise un compte en attente sans activer automatiquement son profil métier | `tests/entra-provisioning.integration.test.ts`, `tests/identity.test.ts` | Automatisé PostgreSQL ; staging Entra requis |
| 2 | Création V1 limitée à objet, description et service facultatif | `tests/v1-ticket-creation.test.ts`, `tests/validation.test.ts` | Automatisé |
| 3 | Service métier éligible route vers sa file ; le triage global reste caché/réservé au fallback automatique | `tests/routing.test.ts`, `tests/triage-configuration.test.ts`, `tests/v1-ticket-creation.test.ts` | Automatisé ; catalogue navigateur staging requis |
| 4 | Claim V1 démarre le traitement, actions agent simplifiées, résolution puis confirmation/réouverture demandeur | `tests/claim.test.ts`, `tests/ticket-business-journeys.test.ts`, `tests/v1-workflow-simplification.test.ts` | Automatisé par services/contrat ; parcours UI staging requis |
| 5 | Tout utilisateur Entra ordinaire reste en attente tant qu’un administrateur fonctionnel n’a pas validé son profil | `tests/entra-provisioning.integration.test.ts`, `tests/identity.test.ts`, `tests/managed-user-profile.test.ts` | Automatisé PostgreSQL ; validation admin staging requise |
| 6 | Une correspondance Entra ne contourne pas la validation manuelle ; département, rôle, équipe, file et statut sont administrés explicitement | `tests/entra-provisioning.integration.test.ts`, `tests/managed-user-profile.test.ts` | Automatisé PostgreSQL ; parcours admin staging requis |
| 7 | Qualification transverse vers un service éligible | `tests/routing.test.ts`, `tests/ticket-department-routing-contract.test.ts` | Automatisé |
| 8 | Personnel hors file/équipe autorisée ne peut pas lire ; le demandeur garde son propre ticket | `tests/visibility.test.ts`, `tests/access-control.test.ts` | Automatisé ; cloisonnement multi-files staging requis |
| 9 | Responsable de file sans rôle AGENT claim et traite seulement sa portée | `tests/claim.test.ts`, `tests/ticket-action-options.test.ts` | Automatisé |
| 10 | En V1, seul le demandeur peut annuler sa demande avant traitement avec motif ; l’annulation reste terminale | `tests/ticket-cancellation.test.ts`, `tests/domain.test.ts`, `tests/v1-workflow-simplification.test.ts` | Automatisé ; contrôle navigateur staging requis |
| 11 | CANCELLED est exclu du travail actif et des métriques SLA | `tests/ticket-cancellation.test.ts`, `tests/reporting-service.test.ts` | Automatisé |
| 12 | Résolution calcule une échéance en jours ouvrés | `tests/automatic-closure.test.ts`, `tests/sla.test.ts` | Automatisé |
| 13 | Réouverture invalide l’ancienne échéance | `tests/automatic-closure.test.ts` | Automatisé |
| 14 | Jobs superposés ne dupliquent audit ni notification ; le scheduler QStash appelle le moniteur SLA toutes les cinq minutes | `tests/automatic-closure.test.ts`, `tests/qstash-scheduler-contract.test.ts`, `docs/v1-qstash-scheduler.md` | Automatisé par transaction/contrat ; exécution QStash staging requise |
| 15 | URLs/modules masqués sont aussi refusés côté serveur | `tests/v1-navigation-policy.test.ts`, `tests/route-authorization-contract.test.ts` | Automatisé |
| 16 | `/api/v1` et workflows déclaratifs sont refusés en V1 | `tests/v1-dormant-features.test.ts`, `tests/workflow-security.test.ts` | Automatisé |
| 17 | Intégrations facultatives absentes/partielles n’empêchent pas le cœur V1 | `tests/env.test.ts`, `tests/v1-dormant-features.test.ts` | Automatisé hors login réel |
| 18 | Notification IN_APP sans appel fournisseur ni nouvel outbox externe | `tests/outbox-notification-routing.test.ts` | Automatisé avec fournisseurs sentinelles |
| 19 | Mes actifs n’affiche que le matériel réellement attribué au compte ; la demande affiche uniquement des volumes d’inventaire agrégés | `tests/assets-refonte-lot6-contract.test.ts`, `tests/asset-requests.test.ts`, `tests/v1-asset-request-workflow.test.ts` | Automatisé par service/contrat ; UI staging requise |
| 20 | Chaque demande d’actif est validée par le FUNCTIONAL_ADMIN global ; elle peut être approuvée sans stock puis attribuée plus tard depuis l’inventaire, avec mouvement, audit et notification | `tests/asset-requests.test.ts`, `tests/assets-refonte-lot6-contract.test.ts`, `tests/v1-asset-request-workflow.test.ts` | Automatisé par contrat ; scénario staging inventaire requis |
| 21 | Lecture confidentielle historique respecte grants et délégations expirées | `tests/confidential-ticket-feature.test.ts` | Automatisé |
| 22 | Pièce jointe interne/historique reste protégée et l’indisponibilité est contrôlée | `tests/ticket-attachment-service-contract.test.ts`, `tests/api-security.test.ts` | Automatisé par contrat ; stockage staging requis |
| 23 | Navigation desktop/mobile, formulaire trois champs et workflow public V1 en quatre étapes | `tests/shell-industrial-contract.test.ts`, `tests/v1-navigation-policy.test.ts`, `tests/v1-workflow-simplification.test.ts` | Contrat automatisé ; revue visuelle staging requise |
| 24 | Feedback, chargement, vide, refus et erreur | `tests/action-feedback.test.ts`, `tests/frontend-robustness.test.ts` | Contrat automatisé ; revue navigateur staging requise |
| 25 | Le lancement sur base fraîche passe migrations, réparations et parcours ; la fixture d’upgrade legacy n’est requise que si une migration d’ancienne base est planifiée | `.github/workflows/ci.yml`, runbook P11 | **Bloquant : état des migrations de la base candidate + validation base fraîche ; fixture legacy N/A pour le lancement actuel** |

## Décision de release

Le dépôt est **prêt pour validation de staging**, pas déclaré prêt pour production. Le GO exige
le contrôle 25 adapté au lancement sur base fraîche, les contrôles Entra/navigateur signalés
ci-dessus, et l’archivage des sorties expurgées. La validation Entra doit confirmer qu’un nouvel
utilisateur ordinaire reste en attente jusqu’à l’action explicite de l’administrateur fonctionnel.
Un échec conduit à un forward-fix ; il ne faut ni réinitialiser la base, ni supprimer un ticket,
un grant, une délégation ou une ligne outbox.
