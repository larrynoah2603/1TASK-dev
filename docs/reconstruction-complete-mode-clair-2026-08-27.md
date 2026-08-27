# 1TASK — Reconstruction complète du mode clair

**Date :** 27 août 2026

**Objet :** remplacement intégral de la cascade de thème clair qui produisait des contrastes insuffisants, des fonds sombres résiduels et des couleurs incohérentes dans les huit lots de refonte. La version finale est alignée sur la palette Color Hunt demandée.[1]

## Ce qui est remplacé

La première approche de mode clair consistait à corriger plusieurs blocs issus du mode sombre. Cette méthode a laissé des règles de fond et de texte contradictoires dans certaines surfaces. Elle est remplacée par une couche finale unique qui redéfinit les tokens, les backgrounds, les textes, les bordures, les états et les interactions pour chaque espace de l’application.

> Cette archive v2 remplace la précédente archive ciblée `1task-correction-densite-lightmode-2026-08-27.zip`. Si vous l’avez déjà appliquée, le nouveau `app/globals.css` l’écrase proprement et devient la source finale du mode clair.

## Direction graphique retenue

Le mode clair n’essaie pas de reproduire un écran blanc générique. Il utilise désormais la palette demandée : gris graphite, or, ivoire et gris clair. Cette palette garde une identité industrielle nette : navigation graphite, panneaux ivoire, fond gris clair et actions or. Les états opérationnels restent lisibles sans introduire de bleu, violet ou rouge décoratif.[1]

| Token | Valeur | Usage |
| --- | --- | --- |
| Fond d’application | `#CACACA` | Gris clair stable, qui sépare les panneaux sans éblouir. |
| Panneau principal | `#FCFAF1` | Ivoire pour cartes, fiches, modales et surfaces de lecture. |
| Surface secondaire | `#CACACA` | Filtres, entêtes de tableau, champs et états lus/non lus. |
| Texte principal | `#343434` | Graphite pour titres, données et actions importantes. |
| Texte secondaire | `rgba(52, 52, 52, 0.72)` | Graphite atténué pour descriptions, libellés et placeholders. |
| Action et focus | `#E6B31E` | Or pour action primaire, repère actif, survol et focus clavier. |
| Sidebar | `#343434` | Navigation stable graphite afin de garder une orientation claire. |

## Couverture des interfaces

Le correctif est appliqué après toutes les couches précédentes et couvre les surfaces partagées, puis les zones spécifiques des huit lots.

| Domaine | Surfaces couvertes en mode clair |
| --- | --- |
| Shell | Fond, sidebar, topbar, navigation active, recherche globale, profil et popovers. |
| Tickets | Boîte agent, filtres, tableau, création, statut, commentaires, panels latéraux et combobox. |
| Portefeuille | Clients, dossiers, missions, filtres, tables, métriques, détails et liens. |
| Identité | Notifications, profil, menu profil et accès en attente. |
| Connaissances | Recherche, bibliothèque, cartes article, lecteur, création et workflow. |
| Actifs | Inventaire, détails, statuts, mouvements et tickets liés. |
| SLA et reporting | KPI, répartition, états d’accès, calendriers, escalades, tables et exports. |
| Administration | Console, navigation, notices, champs, formulaires, modales, tableaux et états. |

## Fichiers inclus

| Fichier | Rôle |
| --- | --- |
| `app/globals.css` | Nouvelle couche finale `Mode clair industriel unifié`. Elle remplace les conflits de thème mais ne modifie aucune logique. |
| `tests/light-mode-reconstruction-contract.test.ts` | Test de présence des tokens Color Hunt, de couverture des surfaces et de parsing CSS avec PostCSS. |
| `tests/industrial-density-theme-contract.test.ts` | Test de la densité, du défilement utile et de la compatibilité avec les nouveaux tokens clairs. |
| `docs/reconstruction-complete-mode-clair-2026-08-27.md` | Rapport, instructions d’application et tests visuels. |
| `todo.md` | Suivi de la correction. |

## Validation réalisée

| Contrôle | Résultat |
| --- | --- |
| Parsing PostCSS | Réussi : la feuille CSS complète est syntaxiquement valide. |
| Contrats de thème clair et de densité | **5 tests passants** : socle, palette, surfaces, parsing et défilement. |
| ESLint | **0 erreur** ; 3 avertissements historiques `no-img-element` restent inchangés. |
| Tests/build de la copie de récupération | Non représentatifs du dépôt actuel : l’archive complète de récupération est antérieure aux derniers services et ne contient pas `components/sla-indicator.tsx`. La seule erreur de test observée provient de ce fichier absent de l’archive, pas du CSS. |

Le dépôt original dans `C:\1task` est la référence de validation. Il doit donc exécuter à nouveau `npm run typecheck`, `npm test`, `npm run lint` et `npm run build` après application de ce correctif CSS. Aucune ligne TypeScript métier n’est modifiée par cette archive.

## Application dans le projet original

Téléchargez le ZIP ci-joint dans **Téléchargements**. Le projet doit déjà être au commit `fb3d3aa` ou contenir la refonte consolidée. La copie ne supprime aucun autre fichier, mais remplace `app/globals.css` par la version du thème clair reconstruite.

```powershell
cd C:\1task

$zip = Join-Path $HOME "Downloads\1task-reconstruction-mode-clair-colorhunt-2026-08-27.zip"
$stage = Join-Path $env:TEMP "1task-reconstruction-mode-clair-colorhunt-2026-08-27"

Remove-Item -Recurse -Force $stage -ErrorAction SilentlyContinue
Expand-Archive -LiteralPath $zip -DestinationPath $stage -Force
Copy-Item -Path "$stage\1task-reconstruction-mode-clair\*" -Destination "C:\1task" -Recurse -Force

git status --short
git diff --stat
git diff --check
```

Cette correction est uniquement visuelle. N’exécutez ni SQL, ni migration Prisma, ni `prisma db push`, ni changement de secret ou d’environnement Vercel.

## Validation locale et visuelle

```powershell
cd C:\1task

npm run typecheck
npm test
npm run lint
$env:NODE_ENV = "production"
npm run build
Remove-Item Env:NODE_ENV -ErrorAction SilentlyContinue
```

Après démarrage local ou déploiement Vercel, basculez le thème dans la topbar et vérifiez au moins `/dashboard/responsible`, `/inbox`, `/tickets/[id]`, `/clients`, `/knowledge`, `/assets`, `/reporting` et `/admin`.

| Vérification visuelle | Résultat attendu |
| --- | --- |
| Fond et panneaux | Fond beige-gris chaud ; panneaux blanc cassé distincts et non éblouissants. |
| Textes | Titres anthracite francs ; descriptions et placeholders gris chaud lisibles. |
| Navigation | Sidebar sombre ; lien actif contrasté, lisible et repéré par le rouge. |
| Filtres et tables | Entêtes, champs et lignes séparés par une surface secondaire chaude. |
| États | Vert = favorable, ambre = attention, corail = risque ; tous lisibles sur fond clair. |
| Menus/modales | Fonds clairs opaques, bordures chaudes et texte foncé, sans résidu noir. |
| Focus clavier | Contour rouge visible autour des contrôles activés. |

## Commit et push

Après votre contrôle visuel, ajoutez uniquement les quatre fichiers suivants. N’utilisez pas `git add .`.

```powershell
cd C:\1task

git add -- `
  "app/globals.css" `
  "tests/light-mode-reconstruction-contract.test.ts" `
  "tests/industrial-density-theme-contract.test.ts" `
  "docs/reconstruction-complete-mode-clair-2026-08-27.md" `
  "todo.md"

git diff --cached --stat
git diff --cached --check
git commit -m "Align light theme with requested Color Hunt palette"
git pull --rebase origin main
git push origin main
git status
```

Si Git indique un conflit pendant `git pull --rebase origin main`, ne faites pas de `push --force`. Conservez le message d’erreur et résolvez seulement les fichiers indiqués avant de poursuivre.

Après le push, vérifiez le déploiement correspondant dans le projet Vercel **`1task-bios-mada`**. Lorsque le statut est `Ready` puis `Production`, forcez le rechargement du navigateur avec `Ctrl+F5` afin d’écarter une ancienne feuille de styles en cache.

## Références

[1]: https://colorhunt.co/palette/343434e6b31efcfaf1cacaca "Palette #343434, #E6B31E, #FCFAF1, #CACACA — Color Hunt"
