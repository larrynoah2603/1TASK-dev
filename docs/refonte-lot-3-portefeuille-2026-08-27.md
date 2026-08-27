# 1TASK — Rapport de livraison du lot 3 : portefeuille de production

**Date :** 27 août 2026

**Périmètre :** clients, dossiers clients et missions, en liste et en détail.

**Nature :** refonte visuelle scoped, sans changement de modèles Prisma, données Neon, API REST, permissions, confidentialité, relations ticket ou action de clôture de mission.

## Résultat livré

Le portefeuille de production est désormais présenté comme un espace de pilotage industriel, cohérent avec le shell, la boîte agent et le détail ticket des lots précédents. Les écrans utilisent des surfaces graphite, une règle rouge de structure, des références champagne et des états de décision menthe, ambre ou corail. Les listes restent denses et exploitables, sans les murs de cartes ou les effets décoratifs d’un template SaaS générique.

| Écran | Refonte appliquée |
| --- | --- |
| `/clients` | En-tête de référentiel, KPI structurés, recherche, table dense et fenêtre de création harmonisés. |
| `/clients/[id]` | Fiche client avec contexte, indicateurs dossiers/missions/tickets/temps et tables liées. |
| `/dossiers` | Liste filtrable, indicateurs de portefeuille, tableau de dossiers et création de dossier conservant le statut confidentiel. |
| `/dossiers/[id]` | Détail contextualisé, visibilité de la confidentialité, missions, tickets et référentiel. |
| `/missions` | Tableau/grille, filtres, charge, budget et états d’échéance dans une même grammaire visuelle. |
| `/missions/[id]` | Suivi de mission : budget, tickets, worklogs et fermeture conditionnelle conservés. |

## Invariants protégés

> Aucune migration, commande SQL, route API, requête Prisma, règle de confidentialité ni permission n’a été modifiée dans ce lot.

Les pages listes continuent de vérifier la permission `portfolio:read`. Les créations client et dossier conservent leurs routes `/api/production/clients` et `/api/production/dossiers` ainsi que leurs contrôles `portfolio:manage`. Les détails restent chargés exclusivement via `getClientForViewer`, `getDossierForViewer` et `getMissionForViewer`, ce qui préserve le cloisonnement et les règles de confidentialité côté serveur.

| Domaine sensible | Comportement inchangé |
| --- | --- |
| Clients | Filtrage local, création, redirection et actualisation à l’identique. |
| Dossiers | Sélection client, champ `confidential`, affichage limité au périmètre autorisé et liens métiers conservés. |
| Missions | Filtres, jauge budget/temps, détection des échéances, bascule tableau/grille et liens vers dossiers et tickets conservés. |
| Détail | Tickets, worklogs, statut, budget et action de clôture ne changent pas de contrat ni de permission. |

## Fichiers modifiés

| Fichier | Rôle |
| --- | --- |
| `app/globals.css` | Surcouche finale `.portfolio-industrial`, isolée du reste de l’application. |
| `app/(app)/clients/page.tsx` et `app/(app)/clients/[id]/page.tsx` | Portée industrielle pour la liste et le détail client. |
| `app/(app)/dossiers/page.tsx` et `app/(app)/dossiers/[id]/page.tsx` | Portée industrielle pour la liste et le détail dossier. |
| `app/(app)/missions/page.tsx` et `app/(app)/missions/[id]/page.tsx` | Portée industrielle pour la liste et le détail mission. |
| `components/client-list-client.tsx` | Crochets sémantiques pour KPI et recherche client. |
| `components/dossier-list-client.tsx` | Crochets sémantiques pour KPI, recherche et tableau dossier. |
| `components/mission-list-client.tsx` | Crochets sémantiques pour KPI et filtres mission. |
| `tests/portfolio-refonte-lot3-contract.test.ts` | Nouveau test des règles d’accès, des relations portefeuille et des contrats de création. |
| `todo.md` | Suivi actualisé de la livraison. |

## Validation effectuée

| Contrôle | Résultat |
| --- | --- |
| `npm run typecheck` avec URL de base locale factice | Réussi. |
| `npm test` | **116 tests passants**, **3 tests d’intégration ignorés** volontairement. |
| `npm run lint` | **0 erreur**. Trois avertissements historiques `no-img-element` subsistent dans le profil, le shell et le menu profil. |
| `NODE_ENV=production npm run build` | Réussi avec Next.js 16.3.0. |
| Contrôle de palette scoped | Réussi : aucun bleu, cyan, indigo ou violet dans la surcouche du lot 3. |
| Contrôle d’espaces finaux | Réussi pour les fichiers TypeScript concernés. |

La copie de travail est une extraction sans dossier `.git`. Le contrôle `git diff --check` doit donc être exécuté dans votre dépôt Windows après application de l’archive.

## Tests fonctionnels avec comptes Entra autorisés

1. Avec un utilisateur doté de `portfolio:read`, ouvrez `/clients`, `/dossiers` puis `/missions`. Vérifiez les listes, les filtres locaux et les liens vers les détails.
2. Avec `portfolio:manage`, créez un client, puis un dossier associé. Vérifiez que le dossier confidentiel reste visible uniquement aux utilisateurs autorisés par le serveur.
3. Ouvrez un client, un dossier et une mission qui possèdent des tickets liés. Vérifiez que les liens vers tickets, dossiers et missions fonctionnent comme avant.
4. Sur une mission active, vérifiez les indicateurs de budget, temps imputé, échéance et la bascule Tableau/Grille. Utilisez l’action de clôture seulement sur une mission de test autorisée.
5. Avec un compte dépourvu de `portfolio:read`, vérifiez la redirection vers `/dashboard`. Avec un compte hors périmètre, vérifiez que les détails restent non accessibles.

## Procédure Windows d’application

Le ZIP contient exclusivement les fichiers du lot 3, sans `.env`, `.git`, `node_modules`, `.next` ni données. Il doit être appliqué après les lots 1 et 2, car il réutilise leur shell industriel et leurs tokens.

```powershell
cd C:\1task

$zip = Join-Path $HOME "Downloads\1task-refonte-lot3-portefeuille-2026-08-27.zip"
$stage = Join-Path $env:TEMP "1task-refonte-lot3-portefeuille-2026-08-27"

Remove-Item -Recurse -Force $stage -ErrorAction SilentlyContinue
Expand-Archive -LiteralPath $zip -DestinationPath $stage -Force
Copy-Item -Path "$stage\1task-refonte-lot3-portefeuille\*" -Destination "C:\1task" -Recurse -Force

git status --short
git diff --stat
git diff --check
```

Il ne faut exécuter ni SQL, ni `prisma migrate`, ni commande Vercel pour ce lot de présentation. Validez ensuite localement.

```powershell
cd C:\1task

npm run typecheck
npm test
npm run lint
$env:NODE_ENV = "production"
npm run build
Remove-Item Env:NODE_ENV -ErrorAction SilentlyContinue
```

Après validation visuelle, préparez le commit avec une liste explicite. N’utilisez pas `git add .`.

```powershell
cd C:\1task

git add -- `
  "app/globals.css" `
  "app/(app)/clients/page.tsx" `
  "app/(app)/clients/[id]/page.tsx" `
  "app/(app)/dossiers/page.tsx" `
  "app/(app)/dossiers/[id]/page.tsx" `
  "app/(app)/missions/page.tsx" `
  "app/(app)/missions/[id]/page.tsx" `
  "components/client-list-client.tsx" `
  "components/dossier-list-client.tsx" `
  "components/mission-list-client.tsx" `
  "tests/portfolio-refonte-lot3-contract.test.ts" `
  "docs/refonte-lot-3-portefeuille-2026-08-27.md" `
  "todo.md"

git diff --cached --stat
git diff --cached --check
git commit -m "Refine industrial portfolio workspaces"
git pull --rebase origin main
git push origin main
git status
```

En cas de conflit durant `git pull --rebase`, ne faites pas de `push --force`. Conservez le message Git et résolvez seulement les fichiers explicitement indiqués avant de poursuivre.

> Le lot suivant proposé est le lot 4 : Notifications, Profil et Accès en attente. Il ne commencera qu’après votre validation visuelle du portefeuille.
