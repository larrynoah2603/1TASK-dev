# Plan d’impact d’implémentation 1TASK — v0.9.1

**Statut : baseline terminé, implémentation autorisée par la demande utilisateur.**

## Baseline vérifié

| Contrôle | Résultat |
|---|---|
| Vitest | 88 tests passés, 3 tests d’intégration ignorés volontairement |
| TypeScript | OK avec `npm run typecheck` |
| ESLint | 0 erreur, 3 warnings historiques liés à `<img>` |
| Prisma Client | Génération OK avec Prisma 6.19.3 |
| Migration | Aucune migration nécessaire pour la restriction Actifs-only-admin |
| Auth Microsoft Entra ID | Aucun changement prévu |

## Décisions d’architecture

La restriction des Actifs sera imposée par une fonction serveur centrale exigeant le rôle global `FUNCTIONAL_ADMIN`. Le contrôle ne sera pas fondé uniquement sur `asset:read` ou `asset:manage`, car ces permissions existent encore dans les rôles opérationnels et techniques. Les routes REST resteront fines et délégueront la décision au service de production.

La navigation et les pages seront alignées sur cette règle : aucun lien `/assets`, aucune fiche `/assets/[id]` et aucune action de mouvement ou de création ne sera disponible pour un utilisateur non `FUNCTIONAL_ADMIN`. L’accès direct par URL sera refusé côté serveur.

## Fichiers impactés — Phase 1

| Fichier | Modification prévue |
|---|---|
| `lib/identity.ts` | Retirer `asset:read` et `asset:manage` des rôles `AGENT`, `QUEUE_MANAGER` et `TECHNICAL_ADMIN`; conserver tous les droits pour `FUNCTIONAL_ADMIN`. |
| `lib/production-service.ts` | Ajouter une garde globale Actifs-only-admin utilisée par lecture, création et mouvement. |
| `app/(app)/assets/page.tsx` | Autoriser l’entrée uniquement à `FUNCTIONAL_ADMIN`. |
| `app/(app)/assets/[id]/page.tsx` | Refuser la fiche directe aux autres profils. |
| `components/app-shell.tsx` | Afficher le lien Actifs uniquement pour `FUNCTIONAL_ADMIN`. |
| `tests/identity.test.ts` | Vérifier les droits Actifs par rôle. |
| `tests/api-security.test.ts` ou nouveau test dédié | Vérifier que le service refuse l’accès non fonctionnel et autorise l’administrateur global. |
| `docs/changelog.md` | Ajouter l’entrée versionnée de la phase. |

## Invariants à préserver

1. Microsoft Entra ID, NextAuth, les callbacks et la session ne sont pas modifiés.
2. Aucun `db push`, `migrate reset` ou suppression de données n’est utilisé.
3. Aucun ticket, audit, notification, relation portefeuille ou SLA historique n’est modifié par cette phase.
4. La protection backend reste la source de vérité ; le frontend ne fait que refléter la décision.
5. `FUNCTIONAL_ADMIN` doit être global, et non seulement un rôle scoped à un département.
6. Les Actifs restent audités par les mécanismes existants lors d’une création ou d’un mouvement.

## Tests d’acceptation de la Phase 1

| Scénario | Résultat attendu |
|---|---|
| `FUNCTIONAL_ADMIN` ouvre `/assets` | La liste est affichée. |
| `FUNCTIONAL_ADMIN` ouvre `/assets/:id` | La fiche et les actions autorisées sont affichées. |
| `FUNCTIONAL_ADMIN` crée un Actif | Création réussie et audit `ASSET_CREATED`. |
| `FUNCTIONAL_ADMIN` déplace un Actif | Mouvement réussi et audit `ASSET_MOVED`. |
| `AGENT` ouvre `/assets` | Redirection ou refus serveur. |
| `QUEUE_MANAGER` appelle directement la liste Actifs | `AuthorizationError` / HTTP 403. |
| `TECHNICAL_ADMIN` appelle directement création ou mouvement | Refus HTTP 403. |
| Rôle scoped `FUNCTIONAL_ADMIN` non global | Refus, sauf si le modèle confirme explicitement un rôle global. |
| Sidebar d’un profil non fonctionnel | Aucun lien Actifs. |

## Phases suivantes déjà planifiées

La Phase 2 ajoutera l’idempotence de création ticket et une clé de requête stable. La Phase 3 testera notification, file, équipe active et visibilité. La Phase 4 stabilisera le polling sans introduire de système temps réel disproportionné. Les phases suivantes ne doivent pas être mélangées à la Phase 1 afin de conserver des commits et des retours arrière lisibles.
