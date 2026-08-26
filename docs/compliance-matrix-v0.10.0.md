# Matrice de conformité 1TASK — Version 0.10.0

Date : 26 août 2026  
Base : `36fe02e` — retour arrière de la précédente refonte UI.

> Cette matrice remplace la lecture de `pasted_content_20.txt`, qui s’arrêtait à la version 0.9.2.

| Élément précédemment marqué « Non » | État v0.10.0 | Preuve principale |
|---|---|---|
| Refonte globale du design system et des surfaces UI | **Livré** | `app/globals.css` : tokens clair/sombre, surfaces, boutons, formulaires, tables, focus et responsive |
| Modernisation du shell, sidebar, tableaux, formulaires et modes clair/sombre | **Livré** | Couche visuelle globale appliquée aux classes partagées du shell et aux surfaces applicatives |
| `components/sla-indicator.tsx` | **Livré** | Composant commun `SlaIndicator` |
| Nouvelle progression visuelle du workflow dans `ticket-status-strip.tsx` | **Livré** | Étapes numérotées, étape active, étapes terminées et action attendue |
| Indicateurs `Dans les temps`, `À surveiller`, `Dépassement`, `En pause` | **Livré** | États `OK`, `AT_RISK`, `BREACHED`, `PAUSED` et `NONE` avec signaux distincts |
| Compte à rebours, échéance et progression SLA dans les tickets | **Livré** | `SlaIndicator` calcule le temps restant, affiche l’échéance et la progression estimée |
| Indicateur SLA partagé dans `ticket-table.tsx` et les dashboards | **Livré** | `SlaBadge` conserve le contrat existant et délègue à `SlaIndicator` |
| Modèle Prisma `Organization` | **Livré** | Nouveau modèle relationnel avec code, nom, activation et index |
| Champ `BusinessCalendar.organizationId` | **Livré** | Relation obligatoire vers une organisation active |
| Migration `20260826100000_add_organization_sla_calendars` | **Livré** | Migration additive avec rétro-rattachement des calendriers existants |
| Création d’une organisation depuis `/admin/sla` | **Livré** | `AdminCalendarConfiguration` et `POST /api/admin/organizations` |
| Configuration des horaires, jours travaillés et fuseau | **Livré** | Formulaire calendrier avec `Indian/Antananarivo`, jours 1–7 et plages en minutes |
| Ajout de jours fériés avec motif d’audit | **Livré** | `POST /api/admin/calendars/[id]/holidays` avec validation et audit |
| API `/api/admin/organizations` | **Livré** | Accès réservé à `requireAdminAccess("FUNCTIONAL")` |
| API `/api/admin/calendars/[id]/holidays` | **Livré** | Création de jour férié, date unique par calendrier et audit |
| Validation `organizationAdminSchema`, `calendarAdminSchema`, `holidayAdminSchema` | **Livré** | Validations Zod avec motifs, dates, CUID, jours et plage cohérente |
| Seed de l’organisation par défaut | **Livré** | `prisma/seed.ts` crée/réutilise `DEFAULT` et rattache le calendrier standard |
| Tests organisation/calendrier/jours fériés | **Livré** | `tests/validation.test.ts` couvre les cas valides et invalides |
| Build Next.js final | **Validé** | Build production Next.js réussi |

## Garanties conservées

La livraison ne modifie pas Microsoft Entra ID, NextAuth, les contrôles de cloisonnement, la règle `FUNCTIONAL_ADMIN` pour les Actifs, l’idempotence de création des tickets, les workflows existants, les événements append-only ni les données de tickets historiques.

La migration n’est pas destructive. Elle doit être appliquée à la base cible avec `npx prisma migrate deploy` après sauvegarde et vérification de la variable `DATABASE_URL`.

## Résultats automatisés

| Contrôle | Résultat |
|---|---:|
| Vitest | **100 tests passés, 3 tests d’intégration ignorés** |
| TypeScript | **OK** |
| ESLint | **0 erreur, 3 avertissements historiques `<img>`** |
| Prisma validation | **OK avec URL factice non connectée** |
| Next.js build | **OK** |
