# Stabilisation de la latence — 1TASK

## Constat

Une ouverture d’interface supérieure à 10 secondes ne provenait pas principalement d’un polling périodique dans le workspace traité. Les écrans sont des Server Components dynamiques : la durée perçue dépend donc de l’authentification, du démarrage de fonction Vercel, de la connexion Neon et du volume de données chargé avant le rendu.

## Causes principales identifiées

### 1. Mega-fetch de la console admin

`getAdminConfiguration()` chargeait douze ensembles de données à chaque page admin : organisations, départements, files, équipes et membres, utilisateurs et relations, catalogue, SLA, calendriers et jours fériés, règles d’escalade, rôles, correspondances Entra et utilisateurs en attente. Ainsi, `/admin/sla` et `/admin/departments` chargeaient des données dont ils n’avaient pas besoin.

Correction : `getAdminConfiguration(actor, sections?)` charge uniquement la section demandée et ses dépendances minimales. Le comportement complet reste disponible pour les appels qui ne précisent pas de section.

### 2. Résolution d’identité répétée

Le layout protégé et les pages pouvaient résoudre plusieurs fois la session et le contexte utilisateur dans le même rendu. `getSessionUserContext` est maintenant dédupliqué par requête avec `react/cache`.

### 3. Double chargement de l’inbox

L’inbox chargeait une page paginée puis jusqu’à 100 tickets supplémentaires uniquement pour calculer les KPI et le panneau SLA. La page utilise maintenant `getOperationalTicketSummary()` pour les compteurs et une petite liste limitée pour les alertes visibles.

### 4. Fiche client trop large

`getClientForViewer()` chargeait tous les dossiers autorisés puis filtrait en mémoire le client demandé. La requête est maintenant ciblée directement sur `clientId`, avec le même contrôle de périmètre.

### 5. Dashboard responsable

Les KPI du dashboard responsable dépendaient d’une liste de 100 tickets. Les KPI utilisent maintenant les agrégats du reporting et la liste de tickets est limitée aux escalades SLA à afficher.

## Réactivité perçue

Des boundaries `loading.tsx` existent pour l’espace applicatif et la console admin. Elles donnent un retour immédiat à l’utilisateur pendant que le serveur attend Neon ou construit le rendu RSC. Elles ne masquent pas une erreur serveur et ne remplacent pas la mesure de performance.

## Observabilité

`lib/performance.ts` journalise les opérations serveur dépassant 750 ms, sans journaliser de secret ni de contenu métier sensible. Les labels actuels sont notamment :

- `[perf] admin.configuration ...ms`
- `[perf] tickets.list ...ms`
- `[perf] tickets.detail ...ms`

Après déploiement, filtrer les logs Vercel sur `[perf]`. Une mesure réelle doit distinguer la durée de fonction Vercel, le temps Prisma/Neon et le temps de rendu.

## Validation locale

- TypeScript : OK.
- Vitest : 100 tests passés, 3 tests d’intégration ignorés.
- ESLint : 0 erreur, 3 warnings historiques liés à `<img>`.
- Build Next.js : OK.
- Prisma : génération et validation effectuées avec une URL factice non connectée.

## Ce qui n’est pas encore déployé depuis ce workspace

Les corrections présentes ici doivent encore être copiées dans le dépôt Windows, validées avec le vrai Neon, commitéees dans GitHub puis déployées par Vercel. Aucune mesure réelle de production ne doit être inventée à partir de la validation locale.

## Procédure de validation production

1. Déployer le commit contenant ces corrections.
2. Ouvrir séparément `/admin`, `/admin/sla`, `/admin/users`, `/inbox`, `/clients/[id]` et `/dashboard/responsible`.
3. Relever les logs `[perf]` et le temps de réponse de chaque route.
4. Vérifier les métriques Vercel Function Duration et les erreurs.
5. Vérifier les temps de requêtes Neon et les connexions actives.
6. Comparer les valeurs KPI avec les tickets visibles avant de poursuivre vers les endpoints delta.

## Étapes suivantes hors P0

Après stabilisation :

1. Ajouter des endpoints `updatedSince`, curseur ou ETag pour éviter les refresh complets.
2. Ajouter les alertes SLA 80/100 % avec idempotence et audit.
3. Ajouter les parcours Playwright par rôle et les tests de cloisonnement.
4. Corriger les trois usages `<img>` avec `next/image` après vérification de la source Graph.
5. Envisager SSE ou un fournisseur realtime géré uniquement après mesures de charge.
6. Finaliser le multi-fuseau avec des tests explicites autour du fuseau du calendrier.

## Invariants protégés

Microsoft Entra ID, les rôles, le cloisonnement file/équipe/département, les contrôles serveur, les audits append-only, l’idempotence ticket, les échéances SLA et les migrations existantes ne sont pas supprimés par cette optimisation.
