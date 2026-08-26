# Procédure de livraison — stabilisation de latence 1TASK

## Principe

Cette livraison réduit les lectures serveur inutiles et améliore la réactivité perçue. Elle ne prouve pas encore que chaque ouverture sera inférieure à 10 secondes sur Vercel : la preuve doit venir des logs Vercel, du navigateur et de Neon après déploiement.

L’archive ne contient ni `.env`, ni `.env.local`, ni secrets, ni `node_modules`, ni `.next`. **Ne jamais partager** une chaîne `DATABASE_URL`, un secret Microsoft Entra, un code OAuth, un paramètre `state` ou une URL de callback contenant des paramètres sensibles.

## 1. Sauvegarder le dépôt Windows sans toucher à la base

Dans PowerShell :

```powershell
cd C:\1task
git status --short
git branch --show-current
git log --oneline -5
git branch backup-before-latency-2026-08-26
git diff > "$env:USERPROFILE\Desktop\1task-before-latency.patch"
git ls-files --others --exclude-standard > "$env:USERPROFILE\Desktop\1task-untracked-before-latency.txt"
```

Si `git status --short` affiche des fichiers locaux utiles, ne pas les supprimer automatiquement. La branche de sauvegarde conserve le commit courant ; le patch conserve les modifications non commitéees.

## 2. Intégrer les fichiers de l’archive

Télécharger puis extraire l’archive dans un dossier temporaire, par exemple `C:\1task-latency-2026-08-26`. Copier ensuite uniquement les fichiers versionnés du correctif vers `C:\1task`. Ne pas copier les éventuels fichiers `.env*`, `node_modules`, `.next`, `tsconfig.tsbuildinfo` ou les fichiers de la machine sandbox.

Les fichiers principaux à intégrer sont les suivants :

| Zone | Fichiers |
|---|---|
| Session et observabilité | `lib/server-auth.ts`, `lib/performance.ts` |
| Console admin | `lib/admin-service.ts`, les pages `app/admin/*/page.tsx`, `app/admin/loading.tsx` |
| Tickets | `lib/ticket-service.ts`, `app/(app)/inbox/page.tsx` |
| Production | `lib/production-service.ts`, `app/(app)/dashboard/responsible/page.tsx` |
| Affichage | `components/dashboard-visuals.tsx`, `app/(app)/loading.tsx`, `app/globals.css` |
| Contrat et documentation | `tests/latency-contract.test.ts`, `docs/latency-delivery-2026-08-26.md`, ce fichier et `docs/changelog.md` |

Les fichiers `prisma/schema.prisma`, les migrations et `lib/auth.ts` ne doivent pas être remplacés pour cette phase de latence. La livraison ne demande aucune migration Neon.

## 3. Installer et valider localement

Conserver le fichier `.env.local` existant. Ne pas le mettre dans Git. Dans PowerShell :

```powershell
cd C:\1task
npm ci --no-audit --no-fund
npm run typecheck
npm test
npm run lint
npm run build
```

Le résultat attendu est : TypeScript OK, tous les tests applicables passés, ESLint sans erreur et build Next.js réussi. Trois warnings `<img>` historiques peuvent rester ; ils ne doivent pas être transformés en erreur silencieuse.

## 4. Vérifier précisément le diff

```powershell
cd C:\1task
git status --short
git diff --stat
git diff -- lib/server-auth.ts lib/admin-service.ts lib/ticket-service.ts lib/production-service.ts
```

Avant d’ajouter les fichiers, vérifier que le diff ne contient pas de modification de `lib/auth.ts`, de callback Entra, de rôle non prévu, de suppression d’audit ou de migration inattendue.

## 5. Commit et push sélectifs

```powershell
cd C:\1task
git add -- `
  "lib/server-auth.ts" `
  "lib/performance.ts" `
  "lib/admin-service.ts" `
  "lib/ticket-service.ts" `
  "lib/production-service.ts" `
  "app/(app)/inbox/page.tsx" `
  "app/(app)/dashboard/responsible/page.tsx" `
  "app/(app)/loading.tsx" `
  "app/admin/loading.tsx" `
  "components/dashboard-visuals.tsx" `
  "app/globals.css" `
  "tests/latency-contract.test.ts" `
  "docs/latency-delivery-2026-08-26.md" `
  "docs/latency-delivery-powershell-2026-08-26.md" `
  "docs/changelog.md"

git diff --cached --stat
git diff --cached --name-only
git commit -m "Stabilize server page loading latency"
git pull --rebase origin main
git push origin main
git status
```

Si `git pull --rebase` indique des modifications non indexées, arrêter et traiter ces modifications avant de pousser. Ne pas utiliser `git add .` si des fichiers non liés sont présents.

## 6. Neon et migrations

Cette optimisation n’ajoute pas de migration. **Ne pas exécuter `prisma db push` ni `prisma migrate reset`.** Ne lancer `npx prisma migrate deploy` que si le commit contient explicitement une migration à appliquer et après contrôle de l’ordre des migrations. Pour v0.10.0, les migrations additives restent à appliquer dans leur ordre, notamment `20260825090000_add_ticket_creation_idempotency` puis `20260826100000_add_organization_sla_calendars`.

Pour cette phase seule, le contrôle recommandé est :

```powershell
cd C:\1task
npx prisma migrate status
```

Si la connexion Neon échoue avec `P1001`, il s’agit d’un problème de connexion/réveil/URL réseau, pas d’une raison pour ignorer une migration au hasard. Ne pas modifier les variables ni partager leur valeur ; vérifier leur présence dans l’environnement local ou Vercel.

## 7. Mesurer Vercel après le déploiement Ready

Après que Vercel affiche le nouveau commit en état **Ready**, effectuer une navigation séparée vers `/admin/sla`, `/inbox`, `/tickets/<id>` et `/dashboard/responsible`. Dans les logs Runtime, filtrer :

```text
[perf]
admin.configuration
tickets.list
tickets.detail
```

Dans le navigateur, ouvrir DevTools → Network, activer Disable cache uniquement pour le test, puis relever sans aucune valeur sensible : le temps de la requête Document, le statut HTTP, la durée des appels RSC et la présence d’une réponse 5xx. Une capture doit masquer les domaines privés, les cookies, les tokens et les paramètres OAuth.

Interprétation :

| Observation | Hypothèse à confirmer |
|---|---|
| Premier appel lent puis suivants rapides | cold start Vercel ou réveil Neon |
| Toutes les requêtes Prisma lentes | connexion Neon, région ou plan/configuration DB |
| `admin.configuration` seul lent | section encore trop large ou relation lourde |
| `tickets.list` ou `tickets.detail` lent | visibilité, relations ticket ou index à examiner |
| Runtime rapide mais écran lent | rendu client, bundle ou navigation RSC |

## 8. Étape suivante seulement après les mesures

Ne pas ajouter SSE ou un polling agressif immédiatement. Selon les chiffres, la prochaine évolution doit être un endpoint delta (`updatedSince`, curseur ou ETag) pour tickets et notifications, avec tests de cloisonnement et idempotence. L’actualisation doit rester bornée par un timeout client et empêcher les requêtes concurrentes. Les audits, l’authentification Entra et les permissions serveur restent inchangés.

## Résultat attendu

La livraison doit réduire le volume de données initialement chargé et afficher rapidement un état de chargement explicite. Elle doit aussi rendre la cause résiduelle observable. Elle ne doit pas être présentée comme une garantie absolue « zéro latence » avant les mesures de production.
