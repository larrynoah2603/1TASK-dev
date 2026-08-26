# Livraison 1TASK — Refonte UX/UI et calendrier SLA organisationnel

Date : 26 août 2026  
Base de travail : commit `36fe02e` — retour à l’interface antérieure à la refonte précédente.

## Périmètre livré

Cette évolution modernise la couche d’interface visible sans modifier Microsoft Entra ID, les contrôles de visibilité, le workflow ticket, les règles d’audit append-only, les permissions Actifs ou l’idempotence de création des tickets.

Le nouveau système visuel utilise une palette bleu ardoise, des surfaces sobres, une hiérarchie typographique orientée décision, des états clair/sombre cohérents, des tableaux mieux structurés et des adaptations responsives. Les classes existantes sont conservées afin d’éviter une réécriture fonctionnelle page par page.

La fiche et les listes de tickets disposent d’un indicateur SLA commun. Il distingue `Dans les temps`, `À surveiller`, `Dépassement`, `En pause` et `SLA non configuré`. Lorsque les dates sont disponibles, il montre aussi le compte à rebours, la date d’échéance et une progression estimée. Les données de visibilité et les mutations du ticket ne sont pas modifiées.

La configuration SLA dispose désormais d’un périmètre `Organization`. Un calendrier ouvré est rattaché à une organisation active et permet de configurer le fuseau, les jours travaillés, l’heure d’ouverture, l’heure de fermeture et les jours fériés. Les créations et modifications sont réservées à l’administrateur fonctionnel et auditées. Les jours fériés peuvent être ajoutés et modifiés ; aucune suppression définitive de ticket ou d’historique n’est introduite.

## Fichiers principaux

| Domaine | Fichiers |
|---|---|
| Indicateur SLA | `components/sla-indicator.tsx`, `components/sla-badge.tsx` |
| Fiche ticket | `components/ticket-status-strip.tsx`, `app/(app)/tickets/[id]/page.tsx` |
| Listes | `components/ticket-table.tsx` |
| Design system | `app/globals.css` |
| Administration calendrier | `components/admin-calendar-configuration.tsx`, `components/admin-configuration-panel.tsx` |
| API organisation | `app/api/admin/organizations/route.ts` |
| API calendrier | `app/api/admin/calendars/route.ts`, `app/api/admin/calendars/[id]/route.ts` |
| API jours fériés | `app/api/admin/calendars/[id]/holidays/route.ts`, `app/api/admin/calendar-holidays/[id]/route.ts` |
| Sécurité métier | `lib/admin-service.ts`, `lib/validation.ts` |
| Base de données | `prisma/schema.prisma`, `prisma/migrations/20260826100000_add_organization_sla_calendars/migration.sql`, `prisma/seed.ts` |
| Tests et documentation | `tests/validation.test.ts`, `docs/architecture.md`, `docs/changelog.md` |

## Migration

La migration `20260826100000_add_organization_sla_calendars` est additive. Elle crée `Organization`, ajoute `BusinessCalendar.organizationId`, crée l’organisation par défaut, rattache les calendriers existants à cette organisation puis ajoute l’index et la clé étrangère. Elle ne réinitialise pas Neon et ne supprime pas les tickets, utilisateurs, SLA, calendriers, événements ou audits historiques.

La migration doit être appliquée uniquement avec `npx prisma migrate deploy` sur la base Neon cible. Ne pas utiliser `db push` ni `migrate reset`.

## Validations réalisées

| Contrôle | Résultat |
|---|---:|
| Prisma schema validation | OK avec une URL PostgreSQL factice non connectée |
| TypeScript | OK |
| Vitest | 100 tests passés, 3 tests d’intégration ignorés |
| ESLint | 0 erreur, 3 avertissements historiques liés à `<img>` |
| Next.js production build | OK |
| Route API calendrier | Générée et compilée |
| Route API organisation | Générée et compilée |
| Route API jours fériés | Générée et compilée |

## Procédure Neon

Après vérification de la variable `DATABASE_URL` vers la base correcte :

```powershell
npx prisma migrate status
npx prisma migrate deploy
```

Puis vérifier que l’organisation par défaut et les calendriers sont présents dans `/admin/sla`. Les données de production doivent être sauvegardées selon la procédure habituelle avant migration.

## Procédure Vercel

Après commit et push sur `main`, vérifier dans Vercel que le deployment correspond au nouveau commit et que son statut est `Ready`. La variable `NEXTAUTH_URL` doit rester l’URL de production et Microsoft Entra ID ne doit pas être modifié par cette livraison.

## Tests manuels recommandés

Un administrateur fonctionnel ouvre `/admin/sla`, crée une organisation, crée un calendrier rattaché, choisit lundi à vendredi, configure `08:00–17:00`, puis ajoute un jour férié avec un motif d’au moins dix caractères. Il modifie ensuite le calendrier et confirme que l’historique d’audit est présent.

Un utilisateur non fonctionnel tente d’ouvrir `/admin/sla` et les endpoints de configuration : l’accès doit rester refusé par le contrôle serveur. Un agent ouvre `/tickets` et `/inbox` : les indicateurs SLA doivent apparaître sans exposer de ticket hors périmètre. Un administrateur fonctionnel vérifie les modes clair et sombre et l’affichage mobile.
