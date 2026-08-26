# Livraison UI — modules restants 1TASK

## Périmètre

Cette itération applique la direction noire/graphite aux cinq modules suivants : Base de connaissances, Actifs, Pilotage SLA, Reporting et Administration. Les écrans shell, boîte agent, détail ticket, Clients, Dossiers, Missions, Notifications, Profil et Accès en attente sont conservés dans leur refonte précédente.

## Modifications visuelles

La Base de connaissances adopte une présentation éditoriale sombre : recherche, cartes d’article, tags, statuts du cycle `DRAFT → REVIEW → PUBLISHED → ARCHIVED`, modales de lecture et de création. Les transitions et les appels `/api/knowledge/*` restent inchangés.

Actifs utilise une présentation d’inventaire noir/graphite : métriques, recherche, filtres par type et état, tableau des identifiants, affectations, départements, licences et détail des mouvements. La restriction d’accès reste strictement réservée à `FUNCTIONAL_ADMIN` global.

Reporting reçoit une hiérarchie analytique sobre : indicateurs en tête, répartition par statut et barre de progression champagne au lieu de l’accent bleu historique. Le calcul et le périmètre cloisonné de `getReportingSummary` ne sont pas modifiés.

Administration reçoit des surfaces graphite cohérentes pour les sections départements, files, équipes, catalogue, calendriers SLA, escalades, rôles et gestion des utilisateurs. Les fiches d’affectation utilisateur et leur historique audité utilisent les mêmes champs, séparateurs et états sémantiques que le reste de la console.

## Fichiers modifiés

| Fichier | Nature du changement | Logique métier modifiée |
|---|---|---|
| `app/globals.css` | Styles ciblés Knowledge, Assets, Reporting et Administration | Non |
| `app/(app)/knowledge/page.tsx` | Classe de portée `knowledge-page-shell` | Non |
| `app/(app)/assets/page.tsx` | Classe de portée `assets-page-shell` | Non |
| `app/(app)/assets/[id]/page.tsx` | Classe de portée du détail Actif | Non |
| `app/(app)/reporting/page.tsx` | Classe de portée `reporting-page-shell` | Non |
| `components/admin-user-actions.tsx` | Classe de portée des fiches utilisateurs | Non |
| `docs/ui-refactor-remaining-modules-2026-08-26.md` | Rapport de livraison | Non |

Les composants interactifs `knowledge-list-client.tsx`, `asset-list-client.tsx`, `admin-configuration-panel.tsx`, `admin-calendar-configuration.tsx` et les services serveur restent fonctionnellement inchangés. Les styles sont appliqués par classes existantes et par portée CSS.

## Garanties conservées

Aucune modification n’a été faite à Microsoft Entra ID, NextAuth, aux permissions, au cloisonnement département/file/équipe, au contrôle `FUNCTIONAL_ADMIN` des Actifs, aux calculs SLA, à l’audit append-only, aux routes API, à Prisma, aux migrations ou à Neon.

Le polling lourd, le SSE et le cron Vercel fréquent ne sont pas introduits. Le fichier `vercel.json` ne doit pas être recréé sur le plan Hobby.

## Validation locale

Validation exécutée dans le workspace sandbox avec une `DATABASE_URL` factice :

```text
npm run typecheck : réussi
npm test : 104 tests réussis, 3 tests d’intégration ignorés
npm run lint : 0 erreur, 3 warnings historiques no-img-element
npm run build : réussi
```

Les trois avertissements ESLint concernent les images existantes de profil dans `profile/page.tsx`, `components/app-shell.tsx` et `components/profile-menu.tsx`.

## Vérification après intégration

Tester les routes suivantes avec les rôles réels appropriés :

```text
/knowledge
/assets
/assets/[id]
/reporting
/admin
/admin/departments
/admin/queues
/admin/teams
/admin/catalog
/admin/sla
/admin/users
```

Vérifier en particulier que l’utilisateur non `FUNCTIONAL_ADMIN` ne voit toujours pas Actifs, que les formulaires Administration continuent d’exiger leurs motifs et confirmations, que les transitions Knowledge fonctionnent et que Reporting demeure en lecture seule.

Après cette livraison, la refonte visuelle des modules principaux est couverte. Les prochaines améliorations doivent être fonctionnelles et mesurées séparément, notamment pagination, observabilité Vercel/Neon et tests E2E multi-rôles.
