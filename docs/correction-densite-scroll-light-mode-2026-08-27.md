# 1TASK — Correctif de densité, défilement et mode clair

**Date :** 27 août 2026

**Pré-requis :** ce correctif s’applique sur le projet ayant déjà reçu le commit `fb3d3aa` de la refonte industrielle consolidée.

## Origine de la correction

Les captures de production montrent que la passe globale de densité compacte rendait certains écrans trop tassés : titres proches des séparateurs, panneaux de filtres proches des tableaux, cellules de table peu aérées et onglets présentant une scrollbar interne visible. Le mode clair héritait aussi de plusieurs couches anciennes, produisant un contraste inégal et des surfaces trop blanches.

Ce correctif est exclusivement CSS, accompagné d’un test de contrat de styles. Aucun composant métier, route, permission, API, calcul SLA, workflow, transaction Prisma ou donnée Neon ne change.

## Corrections appliquées

| Sujet | Correction |
| --- | --- |
| Espacement général | Les piles `space-y-*` et grilles `gap-*` de l’espace applicatif gagnent de l’air sur ordinateur, tout en gardant une densité adaptée sur mobile. |
| Dashboard et boîte agent | Espaces renforcés entre hero, KPI, panneaux, filtres, séparateurs et tableau d’opérations. Les cellules du tableau gagnent en hauteur. |
| Tableaux et files | Les lignes de tableaux disposent de davantage de padding vertical ; les séparateurs ne sont plus collés aux zones de filtres. |
| Onglets | La scrollbar horizontale des onglets est masquée sans supprimer le défilement tactile sur petit écran. Sur ordinateur, les onglets n’imposent plus de scroll horizontal. |
| Commentaires ticket | La liste des commentaires ne possède plus de mini-scroll interne : la page assure naturellement le défilement, sans modifier l’envoi de commentaire. |
| Recherche globale | Le panneau de résultats peut occuper une hauteur plus utile, limitée au viewport, ce qui évite une petite zone scrollable prématurée. |
| Mode clair | Nouvelle palette papier chaud / encre anthracite : fond `#e9e5dc`, panneaux `#fffdf7`, surface élevée `#f4f0e7`, texte `#25221d`, lignes chaudes et sidebar sombre cohérente. |
| Contraste | Les filtres, tables, popovers, panels, champs et états hover reçoivent des fonds neutres contrastés, sans bleu, cyan, indigo ou violet. |

> Les tableaux restent volontairement défilables horizontalement lorsqu’un écran étroit ne peut pas afficher toutes les colonnes. Seules les scrollbars décoratives ou internes inutilement petites sont supprimées.

## Fichiers inclus

| Fichier | Rôle |
| --- | --- |
| `app/globals.css` | Correctif cumulatif d’espacement, défilement et variables de mode clair. |
| `tests/industrial-density-theme-contract.test.ts` | Contrôle que les règles de scroll mobile, commentaires et thème clair existent dans la feuille de styles. |
| `docs/correction-densite-scroll-light-mode-2026-08-27.md` | Présent rapport et procédure de validation. |
| `todo.md` | Suivi de correction mis à jour. |

## Validation effectuée

| Contrôle | Résultat |
| --- | --- |
| Test ciblé du correctif | **2 tests passants**. |
| `npm run typecheck` | Réussi. |
| `npm test` | **136 tests passants**, **3 tests d’intégration ignorés** volontairement. |
| `npm run lint` | **0 erreur** ; 3 avertissements historiques `no-img-element` dans le profil, le shell et le menu profil. |
| `NODE_ENV=production npm run build` | Réussi. |

## Application dans le projet original

Téléchargez le ZIP dans le dossier Téléchargements puis exécutez ces commandes. Le ZIP ne contient aucun `.env`, aucune donnée, aucun dossier `.git`, aucune dépendance et aucun cache Next.js.

```powershell
cd C:\1task

$zip = Join-Path $HOME "Downloads\1task-correction-densite-lightmode-2026-08-27.zip"
$stage = Join-Path $env:TEMP "1task-correction-densite-lightmode-2026-08-27"

Remove-Item -Recurse -Force $stage -ErrorAction SilentlyContinue
Expand-Archive -LiteralPath $zip -DestinationPath $stage -Force
Copy-Item -Path "$stage\1task-correction-densite-lightmode\*" -Destination "C:\1task" -Recurse -Force

git status --short
git diff --stat
git diff --check
```

La correction ne demande ni SQL, ni migration Prisma, ni `prisma db push`, ni modification de configuration Vercel. Vérifiez ensuite localement :

```powershell
cd C:\1task

npm run typecheck
npm test
npm run lint
$env:NODE_ENV = "production"
npm run build
Remove-Item Env:NODE_ENV -ErrorAction SilentlyContinue
```

## Vérification visuelle recommandée

Sur ordinateur, vérifiez `/dashboard/responsible`, `/inbox`, une table portefeuille, un détail ticket et un écran administration. Les titres doivent désormais être séparés des lignes, les filtres ne doivent plus toucher le tableau, et les onglets ne doivent plus afficher de petite scrollbar visible.

Basculez ensuite le thème depuis la topbar. En mode clair, le fond doit être beige-gris doux, les cartes et formulaires doivent rester en blanc cassé, les textes doivent être anthracite et la sidebar doit rester sombre. Répétez le contrôle sur mobile : les tableaux peuvent défiler horizontalement au doigt, sans scrollbar interne décorative.

## Commit et push

Après validation, ajoutez uniquement les quatre fichiers suivants. N’utilisez pas `git add .`.

```powershell
cd C:\1task

git add -- `
  "app/globals.css" `
  "tests/industrial-density-theme-contract.test.ts" `
  "docs/correction-densite-scroll-light-mode-2026-08-27.md" `
  "todo.md"

git diff --cached --stat
git diff --cached --check
git commit -m "Improve industrial spacing and light mode"
git pull --rebase origin main
git push origin main
git status
```

Si `git pull --rebase origin main` signale un conflit, ne faites pas de `push --force`. Conservez le message Git et résolvez uniquement les fichiers signalés avant de poursuivre.

Après un push réussi, ouvrez le déploiement associé dans **`1task-bios-mada`**, attendez `Ready` puis contrôlez à nouveau les écrans concernés sur le domaine de production.
