# 1TASK — Rapport de livraison du lot 7 : pilotage SLA et reporting

**Date :** 27 août 2026

**Périmètre :** reporting opérationnel, reporting administrateur, administration SLA, calendriers, jours fériés et escalades.

**Nature :** refonte visuelle scoped, sans modification des calculs SLA, calendriers d’organisation, escalades, permissions, export CSV, API REST, modèles Prisma ou données agrégées.

## Résultat livré

Le pilotage SLA et les rapports passent à une présentation de poste de contrôle industriel. Les surfaces hiérarchisent les délais, dépassements et indicateurs sans transformer les données en décoration : la règle rouge signale la structure, le champagne les repères de pilotage, la menthe les résultats favorables, l’ambre l’attention et le corail les dépassements.

| Écran | Refonte appliquée |
| --- | --- |
| `/reporting` | En-tête industriel, statut d’accès autorisé, KPI, répartition par statut et barres de progression structurées. L’état « Accès limité » est aussi couvert. |
| `/admin/reporting` | KPI administratifs, état vide et répartition des tickets dans la même grammaire graphique. |
| `/admin/sla` | En-tête, notice, formulaires, calendriers, jours fériés, seuils d’escalade, tableaux et actions du panneau de configuration adaptés au style industriel. |
| Indicateurs SLA | Les styles du composant partagé sont rendus cohérents dans le périmètre SLA/reporting, sans changer ses calculs ni ses libellés. |

## Invariants protégés

> Aucun calcul de délai, seuil, échéance, pause, calendrier, jour férié, escalade, export ou permission n’a été modifié par le lot 7.

Le reporting utilisateur continue d’exiger `reporting:read` et agrège les données avec `getReportingSummary(user)`. Le reporting administrateur et l’administration SLA restent protégés par `requireAdminAccess("FUNCTIONAL")`. La configuration SLA continue d’être demandée uniquement pour la section `sla`. L’export CSV conserve `requireSessionUserContext`, `exportReportingSummary(actor)`, le nom de fichier et les entêtes de téléchargement existants.

| Domaine sensible | Comportement conservé |
| --- | --- |
| SLA | États Dans les temps, À surveiller, Dépassement, En pause et SLA non configuré, ainsi que la formule de progression et le compte à rebours. |
| Calendriers | Organisation, horaires, fuseau, jours travaillés et jours fériés restent gérés par les API et modèles existants. |
| Escalades | Seuils d’escalade et leurs données restent gérés par le même panneau et les mêmes endpoints. |
| Reporting | Agrégats, périmètre non confidentiel, taux de clôture et répartition par statut restent calculés côté serveur. |
| Export | Fichier CSV, authentification, cache `no-store` et gestion d’erreur restent inchangés. |

## Fichiers modifiés

| Fichier | Rôle |
| --- | --- |
| `app/globals.css` | Surcouche finale `.sla-reporting-industrial`, `.reporting-industrial`, `.admin-sla-industrial` et `.admin-reporting-industrial`. |
| `app/(app)/reporting/page.tsx` | Portée industrielle de reporting, de l’état d’accès limité, des KPI et des barres de statut. |
| `app/admin/reporting/page.tsx` | Portée industrielle du reporting fonctionnel. |
| `app/admin/sla/page.tsx` | Portée industrielle du pilotage SLA. |
| `tests/sla-reporting-refonte-lot7-contract.test.ts` | Nouveau contrôle des accès, configuration SLA, calcul partagé, export et palette scoped. |
| `todo.md` | Suivi actualisé. |

Les services de calcul et de reporting, les API d’administration SLA et le composant `sla-indicator.tsx` restent inchangés. La surcouche CSS applique leur rendu industriel uniquement lorsque les nouvelles classes de portée sont présentes.

## Validation effectuée

| Contrôle | Résultat |
| --- | --- |
| `npm run typecheck` avec URL de base locale factice | Réussi. |
| `npm test` | **130 tests passants**, **3 tests d’intégration ignorés** volontairement. |
| `npm run lint` | **0 erreur**. Trois avertissements historiques `no-img-element` subsistent dans le profil, le shell et le menu profil. |
| `NODE_ENV=production npm run build` | Réussi avec Next.js 16.3.0. |
| Contrôle de palette scoped | Réussi : aucun bleu, cyan, indigo ou violet dans la surcouche du lot 7. |
| Contrôle d’espaces finaux | Réussi pour les fichiers TypeScript concernés. |

La copie de travail est extraite sans dossier `.git`. Exécutez `git diff --check` dans votre dépôt Windows après application de l’archive.

## Tests fonctionnels avec comptes Entra autorisés

1. Avec `reporting:read`, ouvrez `/reporting`, vérifiez les KPI, les barres par statut et l’exclusion des tickets confidentiels hors périmètre.
2. Avec un compte sans `reporting:read`, ouvrez `/reporting` et vérifiez le message d’accès limité.
3. Avec un administrateur fonctionnel, ouvrez `/admin/reporting` puis `/admin/sla`. Vérifiez les KPI, calendriers, horaires, jours fériés et escalades sans modifier une valeur de production.
4. Depuis le reporting autorisé, déclenchez l’export CSV et vérifiez que le téléchargement reste identique.
5. Vérifiez les indicateurs SLA sur un ticket de test dans les états OK, À surveiller, Dépassement et En pause ; les échéances ne doivent pas changer à cause de la refonte.

## Procédure Windows d’application

Le ZIP ne contient que les fichiers du lot 7, sans `.env`, `.git`, `node_modules`, `.next` ou données. Appliquez-le après les lots 1 à 6 pour bénéficier du shell et des tokens communs.

```powershell
cd C:\1task

$zip = Join-Path $HOME "Downloads\1task-refonte-lot7-sla-reporting-2026-08-27.zip"
$stage = Join-Path $env:TEMP "1task-refonte-lot7-sla-reporting-2026-08-27"

Remove-Item -Recurse -Force $stage -ErrorAction SilentlyContinue
Expand-Archive -LiteralPath $zip -DestinationPath $stage -Force
Copy-Item -Path "$stage\1task-refonte-lot7-sla-reporting\*" -Destination "C:\1task" -Recurse -Force

git status --short
git diff --stat
git diff --check
```

Ce lot de présentation ne nécessite aucune commande SQL, migration Prisma ou modification Vercel/Neon. Lancez ensuite les validations locales.

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
  "app/(app)/reporting/page.tsx" `
  "app/admin/reporting/page.tsx" `
  "app/admin/sla/page.tsx" `
  "tests/sla-reporting-refonte-lot7-contract.test.ts" `
  "docs/refonte-lot-7-sla-reporting-2026-08-27.md" `
  "todo.md"

git diff --cached --stat
git diff --cached --check
git commit -m "Refine industrial SLA and reporting workspaces"
git pull --rebase origin main
git push origin main
git status
```

En cas de conflit pendant `git pull --rebase`, ne faites pas de `push --force`. Conservez le message Git et résolvez seulement les fichiers explicitement signalés avant de poursuivre.

> Le dernier périmètre de la refonte est le lot 8 : Administration. Il ne démarrera qu’après validation visuelle du lot 7.
