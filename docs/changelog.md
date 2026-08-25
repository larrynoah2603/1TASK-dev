# Changelog 1TASK

## [0.9.1] — Sécurité des Actifs — 2026-08-25

### Ajouté

- Ajout de `lib/asset-access.ts` comme point central de décision pour les Actifs.
- Ajout de tests positifs et négatifs pour les rôles global, scoped, opérationnel et technique.
- Ajout du plan d’impact `docs/implementation-impact-v0.9.1.md`.

### Modifié

- Les opérations serveur de lecture, création, détail, cible de mouvement et déplacement d’un Actif exigent désormais un `FUNCTIONAL_ADMIN` global.
- La page `/assets` et la fiche `/assets/[id]` refusent l’accès aux profils non fonctionnels.
- La sidebar ne montre plus Actifs aux agents, responsables de file, administrateurs techniques ou rôles fonctionnels scoped.
- Les permissions `asset:read` et `asset:manage` ont été retirées du catalogue runtime des rôles `AGENT`, `QUEUE_MANAGER` et `TECHNICAL_ADMIN`.

### Sécurité

- Le contrôle est effectué côté serveur avant tout accès Prisma ; masquer le bouton ne constitue pas la protection principale.
- Aucun changement n’a été effectué sur Microsoft Entra ID, NextAuth, le schéma Prisma, les tickets historiques, les SLA ou l’audit append-only.

### Validation

- Vitest : **92 tests passés, 3 tests d’intégration ignorés**.
- TypeScript : **OK**.
- ESLint : **0 erreur, 3 warnings historiques `<img>`**.
- Migration Prisma : **non nécessaire** pour cette phase.

## Historique récent

### [0.9.0] — Workflow et fiabilité de base

- Interface de fiche ticket compacte et panneaux repliables.
- Saisie libre et routage vers les files `TRIAGE-{Department.code}`.
- Administration utilisateurs avec filtrage département → manager/équipe/file.
- Polling protégé à 15 secondes, avec pause onglet invisible et garde anti-chevauchement.

## [0.9.2] — Fiabilité de création et cloisonnement — 2026-08-25

### Ajouté

La création de ticket accepte désormais un token idempotent validé côté serveur et indexé par créateur. Le formulaire conserve le même token pendant toute la soumission et ses retries. Lorsqu’une transaction concurrente a déjà créé le ticket, le service retourne le ticket existant au lieu d’en créer un second.

Les destinataires de file sont maintenant filtrés par statut actif, absence de désactivation administrative, appartenance active à une équipe active et compatibilité avec la file autorisée. Les managers de file sont soumis à la même vérification de statut, rôle et file.

### Modifié

Les Worklogs sont limités à l’agent affecté, au responsable habilité de la file ou à l’administrateur fonctionnel global. Le lien Worklog ↔ Ticket ↔ Mission reste contrôlé par le périmètre existant.

La version traitée conserve le modèle sans polling RSC périodique lourd. Les notifications sont chargées à l’ouverture ou via le bouton `Actualiser`, avec un timeout client de 8 secondes. Les mutations continuent de rafraîchir l’écran uniquement après une action explicite.

### Base de données

La migration additive `20260825090000_add_ticket_creation_idempotency` ajoute `Ticket.creationIdempotencyToken` et une contrainte composite `createdById + creationIdempotencyToken`. Les tickets historiques restent valides car le nouveau champ est nullable.

### Validation intermédiaire

- Vitest : **96 tests passés, 3 tests d’intégration ignorés**.
- TypeScript : **OK**.
- Prisma schema : **valide avec une URL de validation non connectée**.
