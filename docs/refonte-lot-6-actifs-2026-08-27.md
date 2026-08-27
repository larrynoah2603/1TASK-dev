# 1TASK — Rapport de livraison du lot 6 : actifs

**Date :** 27 août 2026

**Périmètre :** inventaire des actifs, détail d’actif, création et mouvement.

**Nature :** refonte visuelle scoped, sans changement de modèle Prisma, données Neon, API REST, mouvements, historique, tickets liés ou règle d’accès réservée au FUNCTIONAL_ADMIN global.

## Résultat livré

Le module Actifs adopte une présentation de registre industriel : repères d’inventaire, états visibles, tableaux denses et historique des mouvements lisible. Les accents de couleur restent fonctionnels : menthe pour un actif opérationnel, ambre pour une réparation, neutre pour un actif retiré ou perdu, et rouge uniquement pour la structure et les signaux prioritaires.

| Écran | Refonte appliquée |
| --- | --- |
| `/assets` | En-tête de référentiel, KPI, filtres Type/État, inventaire dense et fenêtre de création harmonisés. |
| `/assets/[id]` | Fiche d’actif, statut, affectation, échéance, historique de mouvements, tickets liés et informations de référentiel structurés. |
| Création | Fenêtre de création d’actif intégrée à la même grammaire graphite, sans changement de champs, validation ou redirection. |
| Mouvement | Fenêtre d’affectation ou déplacement adaptée au style industriel, sans changement de route, cibles, motif ni audit. |

## Invariant de sécurité central

> La gestion des actifs reste réservée à l’**administrateur fonctionnel global**. Un `FUNCTIONAL_ADMIN` limité à un département ne peut pas accéder au module.

Les deux pages Actifs continuent d’appeler `isFunctionalAssetAdministrator(user)` et redirigent vers `/dashboard` en dehors de ce cas. Le service d’accès `lib/asset-access.ts` n’a pas été modifié. Les services de création, de consultation, de mouvement et d’audit restent inchangés.

| Domaine sensible | Comportement conservé |
| --- | --- |
| Accès inventaire | Accès autorisé uniquement lorsqu’un rôle `FUNCTIONAL_ADMIN` global est établi côté serveur. |
| Consultation | `listAssetsForViewer` et `getAssetForViewer` restent les sources de données sécurisées. |
| Création | La route `/api/production/assets`, les champs et la redirection vers le détail restent inchangés. |
| Mouvement | La route `/api/production/assets/[id]/move`, le motif obligatoire, la transaction et l’audit append-only restent inchangés. |
| Relations | L’historique et les tickets rattachés restent affichés avec leurs données métier existantes. |

## Fichiers modifiés

| Fichier | Rôle |
| --- | --- |
| `app/globals.css` | Surcouche finale `.assets-industrial`, isolée des autres modules. |
| `app/(app)/assets/page.tsx` | Crochet de portée visuelle de la liste/inventaire. |
| `app/(app)/assets/[id]/page.tsx` | Crochet de portée visuelle de la fiche d’actif. |
| `tests/assets-refonte-lot6-contract.test.ts` | Nouveau contrôle des accès globaux, des routes d’inventaire/création/mouvement et de la palette scoped. |
| `todo.md` | Suivi actualisé du lot. |

Les composants `asset-list-client.tsx` et `asset-detail-actions.tsx` sont volontairement restés inchangés : la surcouche scoped applique le nouveau rendu à leurs formulaires, listes, modales et boutons, sans modifier leurs mutations ou leur logique de gestion.

## Validation effectuée

| Contrôle | Résultat |
| --- | --- |
| `npm run typecheck` avec URL de base locale factice | Réussi. |
| `npm test` | **126 tests passants**, **3 tests d’intégration ignorés** volontairement. |
| `npm run lint` | **0 erreur**. Trois avertissements historiques `no-img-element` subsistent dans le profil, le shell et le menu profil. |
| `NODE_ENV=production npm run build` | Réussi avec Next.js 16.3.0. |
| Contrôle de palette scoped | Réussi : aucun bleu, cyan, indigo ou violet dans la surcouche du lot 6. |
| Contrôle d’espaces finaux | Réussi pour les fichiers TypeScript concernés. |

La copie de travail est extraite sans dossier `.git`. Exécutez `git diff --check` dans le dépôt Windows après application de l’archive.

## Tests fonctionnels avec comptes Entra autorisés

1. Avec un administrateur fonctionnel global, ouvrez `/assets`, utilisez les filtres et ouvrez plusieurs fiches d’actifs.
2. Avec un administrateur fonctionnel limité à un département ou tout autre rôle, ouvrez `/assets` et vérifiez la redirection vers `/dashboard`.
3. Avec le compte global, créez un actif de test, choisissez éventuellement un département et un utilisateur compatible, puis vérifiez la redirection vers son détail.
4. Enregistrez un mouvement de test avec un motif de plus de dix caractères. Vérifiez la nouvelle affectation, l’historique, le créateur et les tickets liés.
5. Vérifiez sur mobile la table défilable horizontalement, les fenêtres de création et de mouvement, ainsi que les contours de focus clavier.

## Procédure Windows d’application

Le ZIP ne contient que les fichiers du lot 6, sans `.env`, `.git`, `node_modules`, `.next` ou données. Appliquez-le après les lots 1 à 5 pour bénéficier du shell et des tokens industriels communs.

```powershell
cd C:\1task

$zip = Join-Path $HOME "Downloads\1task-refonte-lot6-actifs-2026-08-27.zip"
$stage = Join-Path $env:TEMP "1task-refonte-lot6-actifs-2026-08-27"

Remove-Item -Recurse -Force $stage -ErrorAction SilentlyContinue
Expand-Archive -LiteralPath $zip -DestinationPath $stage -Force
Copy-Item -Path "$stage\1task-refonte-lot6-actifs\*" -Destination "C:\1task" -Recurse -Force

git status --short
git diff --stat
git diff --check
```

Ce lot visuel ne nécessite aucune commande SQL, migration Prisma ou modification Vercel/Neon. Exécutez ensuite les validations locales.

```powershell
cd C:\1task

npm run typecheck
npm test
npm run lint
$env:NODE_ENV = "production"
npm run build
Remove-Item Env:NODE_ENV -ErrorAction SilentlyContinue
```

Après la validation visuelle, créez le commit avec une liste explicite. N’utilisez pas `git add .`.

```powershell
cd C:\1task

git add -- `
  "app/globals.css" `
  "app/(app)/assets/page.tsx" `
  "app/(app)/assets/[id]/page.tsx" `
  "tests/assets-refonte-lot6-contract.test.ts" `
  "docs/refonte-lot-6-actifs-2026-08-27.md" `
  "todo.md"

git diff --cached --stat
git diff --cached --check
git commit -m "Refine industrial assets workspace"
git pull --rebase origin main
git push origin main
git status
```

En cas de conflit pendant `git pull --rebase`, ne faites pas de `push --force`. Conservez le message Git et résolvez seulement les fichiers explicitement signalés avant de poursuivre.

> Le prochain périmètre proposé est le lot 7 : Pilotage SLA et Reporting. Il ne démarrera qu’après validation visuelle du module Actifs.
