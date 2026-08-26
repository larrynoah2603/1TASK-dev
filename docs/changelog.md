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


## [0.10.0] — Refonte UX/UI et calendriers SLA organisationnels — 2026-08-26

### Refonte interface

Une couche visuelle cohérente modernise les écrans visibles sans modifier les règles métier. Le shell, la navigation, les surfaces, les formulaires, les tableaux, les états de focus, les modes clair/sombre et les vues responsives partagent désormais une palette bleu ardoise, des contrastes explicites et une hiérarchie orientée décision.

### Vue ticket et SLA

Les tickets affichent maintenant simultanément l’état du workflow, la priorité, le risque SLA, le compte à rebours et une barre de progression lorsque la date de création est disponible. Les états `Dans les temps`, `À surveiller`, `Dépassement`, `En pause` et `SLA non configuré` utilisent des signaux distincts et restent lisibles dans les listes comme dans la fiche détaillée.

### Calendriers organisationnels

Le modèle `Organization` permet de rattacher un `BusinessCalendar` à une organisation active. L’administration fonctionnelle peut créer ou modifier un calendrier, sélectionner le fuseau horaire, les jours travaillés, les horaires d’ouverture et de fermeture, puis ajouter des jours fériés avec un motif audité. Les SLA continuent de référencer un calendrier et les tickets existants conservent leurs échéances enregistrées.

### Sécurité et audit

Les mutations de configuration restent réservées à l’administrateur fonctionnel et passent par les validations serveur existantes. Les créations d’organisation, de calendrier et de jour férié sont journalisées. Aucun endpoint de suppression définitive des tickets n’a été introduit.

### Base de données

La migration additive `20260826100000_add_organization_sla_calendars` crée `Organization`, rattache les calendriers existants à une organisation par défaut et ajoute l’index et la clé étrangère correspondants. Elle ne supprime aucune donnée historique.

### Validation

La suite de tests couvre la validation des organisations, des plages horaires, des jours fériés et des signaux SLA. La validation finale doit inclure Vitest, TypeScript, ESLint, Prisma et le build Next.js avant publication.
