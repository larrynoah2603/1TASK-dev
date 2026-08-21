# Livraison de la fiche ticket compacte

Cette évolution modifie uniquement l’interface de la fiche ticket. Elle ajoute un bandeau d’état compact, des panneaux latéraux repliables et un fil de commentaires visible dans la colonne principale.

## Fichiers principaux modifiés

```text
app/(app)/tickets/[id]/page.tsx
components/ticket-actions.tsx
components/ticket-advanced-panels.tsx
app/globals.css
```

## Nouveaux composants

```text
components/ticket-side-panel.tsx
components/ticket-status-strip.tsx
components/ticket-comment-thread.tsx
```

L’authentification Microsoft Entra ID, le schéma Prisma, les migrations, les permissions, le routage, les SLA et le cloisonnement ne sont pas modifiés par cette évolution UI.

## Installation sur Windows

Décompresser l’archive dans `C:\1task` en remplaçant les fichiers existants. Ne pas supprimer `node_modules` si `npm ci` a déjà réussi.

```powershell
cd C:\1task
npx prisma generate
npm run typecheck
npm test
npm run lint
npm run build
```

Le lint peut afficher les avertissements existants sur les balises `<img>`. Ils ne sont pas introduits par cette fiche ticket et ne bloquent pas le build.

## Publication GitHub

```powershell
cd C:\1task
git status --short
git add "app/(app)/tickets/[id]/page.tsx" components/ticket-actions.tsx components/ticket-advanced-panels.tsx components/ticket-side-panel.tsx components/ticket-status-strip.tsx components/ticket-comment-thread.tsx app/globals.css docs/guide-livraison-ticket-ui-compact.md
git diff --cached --stat
git commit -m "Compact ticket detail workspace with collapsible panels"
git pull --rebase origin main
git push origin main
```

Si `git pull --rebase` indique des modifications non indexées, exécuter d’abord `git status --short` et traiter chaque fichier volontairement. Ne jamais utiliser `git reset --hard` ou `git push --force` sans sauvegarde.

## Résultat visuel attendu

```text
Bandeau statut permanent
    ↓
Description + commentaires visibles
    ↓
Panneaux latéraux repliables :
Description, Timeline, Récapitulatif, Qualification, SLA,
Relations, Fichiers et Workflow
```
