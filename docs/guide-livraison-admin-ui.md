# Livraison — interface Administration et navbar 1TASK

## Périmètre de la livraison

Cette livraison réorganise la console d’administration et la navbar sans modifier l’authentification Microsoft Entra ID, les permissions, le routage métier, le cloisonnement, le schéma Prisma ou les données existantes.

Les changements principaux sont les suivants :

- les liens de la console admin utilisent des icônes SVG sémantiques au lieu de repères numériques ;
- le menu admin est regroupé par fonctions : vue d’ensemble, organisation, catalogue/SLA, supervision et technique ;
- la sélection d’un département dans une fiche utilisateur filtre automatiquement les managers, équipes et files compatibles ;
- un changement de département réinitialise les attributions dépendantes ;
- la palette admin sombre reprend les surfaces ardoise/noir de la sidebar ;
- les accents violets sont remplacés par des accents bleu ardoise, ambre et vert pour les états ;
- le bouton « Nouveau ticket » possède une icône plus claire et un contraste adapté aux thèmes clair et sombre.

## Fichiers principaux

```text
components/admin-shell.tsx
components/admin-user-actions.tsx
components/admin-configuration-panel.tsx
components/new-ticket-launcher.tsx
app/globals.css
```

## Validation locale

Depuis le répertoire du projet :

```powershell
npm run typecheck
npm test
npm run lint
npm run build
```

Les warnings éventuels de la règle `@next/next/no-img-element` ne sont pas bloquants s’ils apparaissent sans erreur ESLint.

## Installation dans Windows

Avant de remplacer les fichiers, créer une sauvegarde :

```powershell
Copy-Item C:\1task C:\1task-backup-before-admin-ui -Recurse -Force
```

Décompresser l’archive dans un dossier temporaire, puis copier son contenu dans `C:\1task`. Ne pas copier `node_modules`, `.next`, `.env` ou `.env.local` depuis une archive externe.

Après la copie :

```powershell
cd C:\1task
npx prisma generate
npm run typecheck
npm test
npm run lint
npm run build
```

## Publication GitHub

Vérifier d’abord la liste des changements :

```powershell
git status --short
```

Ajouter uniquement les fichiers de cette livraison :

```powershell
git add -- `
  "components/admin-shell.tsx" `
  "components/admin-user-actions.tsx" `
  "components/admin-configuration-panel.tsx" `
  "components/new-ticket-launcher.tsx" `
  "app/globals.css" `
  "docs/guide-livraison-admin-ui.md"
```

Vérifier le contenu indexé :

```powershell
git diff --cached --stat
git diff --cached --name-only
```

Créer le commit et publier :

```powershell
git commit -m "Refresh admin console and ticket launcher UI"
git pull --rebase origin main
git push origin main
```

Ne jamais utiliser `git push --force`.

## Publication Vercel

Après le push, Vercel doit lancer un déploiement automatique depuis `main`. Attendre l’état `Ready`, puis ouvrir l’application et effectuer un rechargement complet :

```text
Ctrl + F5
```

Si l’ancien écran reste affiché, vérifier que le déploiement correspond bien au dernier commit et effectuer un redeploy sans cache si nécessaire.

## Vérifications fonctionnelles

Dans `Administration → Utilisateurs`, ouvrir une fiche et vérifier :

1. Le choix d’un département affiche uniquement les équipes actives de ce département.
2. Le choix d’un département affiche uniquement les files actives de ce département.
3. Le choix d’un département affiche uniquement les managers actifs de ce département.
4. Le changement de département réinitialise manager, équipe et file.
5. Le backend refuse toujours une combinaison incohérente, même si elle est fabriquée côté navigateur.

Dans la navbar, vérifier :

```text
icône + visible sur Nouveau ticket
contraste lisible en mode clair
contraste lisible en mode sombre
modal Nouveau ticket fonctionnelle
bouton de fermeture fonctionnel
```

Dans la sidebar admin, vérifier :

```text
icônes visibles
aucun repère numérique utilisé comme icône
labels lisibles
état actif identifiable
palette cohérente avec la sidebar sombre
navigation responsive sur mobile
```

## Données et sécurité

Cette livraison ne demande aucune migration Prisma et aucune requête SQL Neon. Elle ne supprime ni utilisateur, ni département, ni file, ni équipe, ni ticket. Les contrôles backend de `lib/admin-service.ts` restent la source de sécurité pour vérifier que le manager, l’équipe et la file appartiennent au département choisi.
