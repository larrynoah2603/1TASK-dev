# 1TASK — Rapport de livraison du lot 5 : base de connaissances

**Date :** 27 août 2026

**Périmètre :** liste de connaissances, recherche, cartes d’article, lecture, création et transitions de statut.

**Nature :** refonte visuelle scoped, sans changement de workflow DRAFT → REVIEW → PUBLISHED → REVIEW/ARCHIVED, de droits, d’API, de données, de publication ou de contrôle de département.

## Résultat livré

La base de connaissances est désormais conçue comme une bibliothèque opérationnelle : lecture rapide, repères de département, statut de publication et tags visibles sans faire basculer l’interface vers une grille de cartes génériques. Les articles restent dans une présentation dense et éditoriale, avec une hiérarchie claire entre contenu, propriétaire, statut et actions autorisées.

| Surface | Refonte appliquée |
| --- | --- |
| `/knowledge` | En-tête industriel, règle rouge structurelle, KPI, recherche et bouton de création cohérents avec le shell. |
| Bibliothèque d’articles | Cartes éditoriales contrastées, repère de département, aperçu de contenu, tags champagne et bloc d’auteur/dernière mise à jour. |
| Workflow de publication | États Brouillon, À relire, Publié et Archivé distingués visuellement sans modifier leurs transitions existantes. |
| Lecteur d’article | Fenêtre de lecture graphite, contenu respirant et tags structurés. |
| Création d’article | Fenêtre industrielle, champs structurés, département, revue, tags et statut initial inchangés fonctionnellement. |

## Invariants protégés

> Ce lot ne contient aucune migration Prisma, commande SQL, modification API, changement de permission, modification du workflow ou secret.

La page continue de vérifier les permissions `knowledge:read` et `knowledge:manage`. La liste reste obtenue par `listKnowledgeArticles(user)` ; la liste des départements reste limitée au département de l’utilisateur sauf pour un administrateur fonctionnel global. Les transitions et la création continuent d’utiliser exactement les routes `/api/knowledge/[id]` et `/api/knowledge`.

| Point sensible | Comportement conservé |
| --- | --- |
| Consultation | Les articles visibles continuent d’être déterminés côté serveur selon le périmètre de l’utilisateur. |
| Création | Les champs, tags, date de revue, département, statut initial et contrôle `knowledge:manage` sont inchangés. |
| Workflow | Les transitions DRAFT, REVIEW, PUBLISHED et ARCHIVED restent strictement celles déjà définies dans le composant. |
| Gouvernance | La restriction des départements et l’identification de l’administrateur fonctionnel global ne changent pas. |

## Fichiers modifiés

| Fichier | Rôle |
| --- | --- |
| `app/globals.css` | Surcouche finale `.knowledge-industrial` strictement limitée à la base de connaissances. |
| `app/(app)/knowledge/page.tsx` | Crochet de portée visuelle de la page. |
| `components/knowledge-list-client.tsx` | Crochets pour KPI, recherche, bibliothèque d’articles et cartes éditoriales. Les fetch, mutations et états restent intacts. |
| `tests/knowledge-refonte-lot5-contract.test.ts` | Nouveau test des permissions, du workflow, des routes et de la palette scoped. |
| `todo.md` | Suivi actualisé du lot. |

## Validation effectuée

| Contrôle | Résultat |
| --- | --- |
| `npm run typecheck` avec URL de base locale factice | Réussi. |
| `npm test` | **123 tests passants**, **3 tests d’intégration ignorés** volontairement. |
| `npm run lint` | **0 erreur**. Trois avertissements historiques `no-img-element` subsistent dans le profil, le shell et le menu profil. |
| `NODE_ENV=production npm run build` | Réussi avec Next.js 16.3.0. |
| Contrôle de palette scoped | Réussi : aucun bleu, cyan, indigo ou violet dans la surcouche du lot 5. |
| Contrôle d’espaces finaux | Réussi pour les fichiers TypeScript concernés. |

La copie de travail est extraite sans dossier `.git`. Exécutez `git diff --check` dans votre dépôt Windows après application de l’archive.

## Tests fonctionnels avec un compte Entra autorisé

1. Avec `knowledge:read`, ouvrez `/knowledge`, recherchez un article et ouvrez le lecteur. Vérifiez que seuls les articles de votre périmètre sont visibles.
2. Avec `knowledge:manage`, créez un article de test puis vérifiez le département proposé. Un administrateur fonctionnel global peut choisir parmi les départements actifs ; un autre utilisateur reste limité à son département.
3. Sur un article de test, vérifiez les transitions autorisées : Brouillon vers À relire, À relire vers Publié, Publié vers À relire ou Archivé, puis Archivé vers Brouillon.
4. Avec un compte sans permission de connaissance, vérifiez la redirection vers `/dashboard`.

## Procédure Windows d’application

Le ZIP contient exclusivement le lot 5, sans `.env`, `.git`, `node_modules`, `.next` ni données. Appliquez-le après les lots 1 à 4 pour bénéficier des tokens industriels communs.

```powershell
cd C:\1task

$zip = Join-Path $HOME "Downloads\1task-refonte-lot5-base-connaissances-2026-08-27.zip"
$stage = Join-Path $env:TEMP "1task-refonte-lot5-base-connaissances-2026-08-27"

Remove-Item -Recurse -Force $stage -ErrorAction SilentlyContinue
Expand-Archive -LiteralPath $zip -DestinationPath $stage -Force
Copy-Item -Path "$stage\1task-refonte-lot5-base-connaissances\*" -Destination "C:\1task" -Recurse -Force

git status --short
git diff --stat
git diff --check
```

Ce lot UI n’exige ni SQL, ni migration Prisma, ni paramètre Vercel/Neon. Lancez ensuite les validations locales.

```powershell
cd C:\1task

npm run typecheck
npm test
npm run lint
$env:NODE_ENV = "production"
npm run build
Remove-Item Env:NODE_ENV -ErrorAction SilentlyContinue
```

Après validation visuelle, créez le commit avec une liste explicite. N’utilisez pas `git add .`.

```powershell
cd C:\1task

git add -- `
  "app/globals.css" `
  "app/(app)/knowledge/page.tsx" `
  "components/knowledge-list-client.tsx" `
  "tests/knowledge-refonte-lot5-contract.test.ts" `
  "docs/refonte-lot-5-base-connaissances-2026-08-27.md" `
  "todo.md"

git diff --cached --stat
git diff --cached --check
git commit -m "Refine industrial knowledge workspace"
git pull --rebase origin main
git push origin main
git status
```

En cas de conflit pendant `git pull --rebase`, ne faites pas de `push --force`. Conservez le message Git et résolvez seulement les fichiers indiqués avant de poursuivre.

> Le prochain périmètre est le lot 6 : Actifs. Il ne démarrera qu’après votre validation visuelle de la base de connaissances.
