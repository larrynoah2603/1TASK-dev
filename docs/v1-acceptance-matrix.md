# P11 — matrice d’acceptation V1 (25 contrôles)

Date de revue du dépôt : 4 octobre 2026. **Automatisé** signifie qu’un test du dépôt couvre le
comportement ; cela ne remplace pas un contrôle navigateur ou Entra. **À exécuter en staging**
est une porte de release, pas un succès implicite. Les commandes réellement exécutées pour
cette revue sont consignées dans le compte-rendu de PR.

| # | Contrôle | Preuve dans le dépôt | Statut P11 |
|---:|---|---|---|
| 1 | Entra mappé crée un REQUESTER actif, de façon idempotente | `tests/entra-provisioning.integration.test.ts` | Automatisé PostgreSQL ; staging Entra requis |
| 2 | Création V1 limitée à objet, description et service facultatif | `tests/v1-ticket-creation.test.ts`, `tests/validation.test.ts` | Automatisé |
| 3 | Service éligible route vers sa file ; sinon triage global déterministe | `tests/routing.test.ts`, `tests/triage-configuration.test.ts` | Automatisé |
| 4 | Claim concurrent, traitement, résolution et confirmation demandeur | `tests/claim.test.ts`, `tests/ticket-business-journeys.test.ts` | Automatisé par services ; parcours UI staging requis |
| 5 | Département Entra inconnu reste en attente sans droit élevé | `tests/entra-provisioning.integration.test.ts`, `tests/identity.test.ts` | Automatisé PostgreSQL |
| 6 | Ajout explicite du mapping active au prochain sync valide | `tests/entra-provisioning.integration.test.ts` | Automatisé PostgreSQL ; Entra réel requis |
| 7 | Qualification transverse vers un service éligible | `tests/routing.test.ts`, `tests/ticket-department-routing-contract.test.ts` | Automatisé |
| 8 | Personnel origine/destination non autorisé ne peut pas lire | `tests/visibility.test.ts`, `tests/access-control.test.ts` | Automatisé |
| 9 | Responsable de file sans rôle AGENT claim et traite seulement sa portée | `tests/claim.test.ts`, `tests/ticket-action-options.test.ts` | Automatisé |
| 10 | Annulation précoce exige un motif et résiste aux états périmés | `tests/ticket-cancellation.test.ts` | Automatisé |
| 11 | CANCELLED est exclu du travail actif et des métriques SLA | `tests/ticket-cancellation.test.ts`, `tests/reporting-service.test.ts` | Automatisé |
| 12 | Résolution calcule une échéance en jours ouvrés | `tests/automatic-closure.test.ts`, `tests/sla.test.ts` | Automatisé |
| 13 | Réouverture invalide l’ancienne échéance | `tests/automatic-closure.test.ts` | Automatisé |
| 14 | Jobs superposés ne dupliquent audit ni notification | `tests/automatic-closure.test.ts` | Automatisé par transaction ; scheduler staging requis |
| 15 | URLs/modules masqués sont aussi refusés côté serveur | `tests/v1-navigation-policy.test.ts`, `tests/route-authorization-contract.test.ts` | Automatisé |
| 16 | `/api/v1` et workflows déclaratifs sont refusés en V1 | `tests/v1-dormant-features.test.ts`, `tests/workflow-security.test.ts` | Automatisé |
| 17 | Intégrations facultatives absentes/partielles n’empêchent pas le cœur V1 | `tests/env.test.ts`, `tests/v1-dormant-features.test.ts` | Automatisé hors login réel |
| 18 | Notification IN_APP sans appel fournisseur ni nouvel outbox externe | `tests/outbox-notification-routing.test.ts` | Automatisé avec fournisseurs sentinelles |
| 19 | My Assets et demande d’actif restent accessibles | `tests/assets-refonte-lot6-contract.test.ts`, `tests/asset-requests.test.ts` | Automatisé par service/contrat ; UI staging requise |
| 20 | Approbation/refus d’actif renvoie le demandeur vers `/my-assets` | `tests/asset-requests.test.ts`, `tests/assets-refonte-lot6-contract.test.ts` | Automatisé |
| 21 | Lecture confidentielle historique respecte grants et délégations expirées | `tests/confidential-ticket-feature.test.ts` | Automatisé |
| 22 | Pièce jointe interne/historique reste protégée et l’indisponibilité est contrôlée | `tests/ticket-attachment-service-contract.test.ts`, `tests/api-security.test.ts` | Automatisé par contrat ; stockage staging requis |
| 23 | Navigation desktop/mobile et formulaire trois champs | `tests/shell-industrial-contract.test.ts`, `tests/v1-navigation-policy.test.ts` | Contrat automatisé ; revue visuelle staging requise |
| 24 | Feedback, chargement, vide, refus et erreur | `tests/action-feedback.test.ts`, `tests/frontend-robustness.test.ts` | Contrat automatisé ; revue navigateur staging requise |
| 25 | Base fraîche et fixture d’upgrade passent migrations, réparations et parcours | `.github/workflows/ci.yml`, runbook P11 | **Bloquant : à exécuter sur deux bases PostgreSQL isolées** |

## Décision de release

Le dépôt est **prêt pour validation de staging**, pas déclaré prêt pour production. Le GO exige
le contrôle 25, les contrôles Entra/navigateur signalés ci-dessus, et l’archivage des sorties
expurgées. Un échec laisse le profil partagé inchangé et conduit à un forward-fix ; il ne faut
ni réinitialiser la base, ni supprimer un ticket, un grant, une délégation ou une ligne outbox.
