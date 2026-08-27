# 1TASK — Validation consolidée et vigilance production des huit lots

**Date :** 27 août 2026

**Objet :** inventaire consolidé, séquence de validation et points de vigilance avant mise en production de la refonte noir industriel.

## Décision de déploiement

Les huit lots ont été validés dans la copie de travail avec TypeScript, Vitest, ESLint et build Next.js de production. Ils restent toutefois une **refonte de présentation** : la validation avec les comptes Microsoft Entra réels, les droits réels et les données Neon réelles doit être achevée avant publication.

> N’appliquez pas les lots dans le désordre. Le fichier `app/globals.css` de chaque archive est cumulatif ; l’archive consolidée est donc l’option recommandée lorsqu’aucun lot n’a encore été appliqué.

| Point | État consolidé |
| --- | --- |
| Lots visuels | 8 lots préparés : shell, tickets, portefeuille, identité, connaissance, actifs, SLA/reporting et administration. |
| Modèle Prisma | Aucune modification de schéma ni migration dans ces lots. |
| Base Neon | Aucune instruction SQL ou écriture de données n’est requise. |
| Microsoft Entra ID / NextAuth | Callbacks, provider, session, secrets et redirections métier non modifiés. |
| API et workflows | Routes REST, permissions, SLA, audit, idempotence et mutations préservés par contrat source. |
| Validation locale finale | 134 tests passants, 3 tests d’intégration ignorés volontairement, lint sans erreur et build de production réussi. |

## Inventaire exact par lot

Les fichiers ci-dessous sont ceux inclus dans les archives de chaque lot. Les fichiers de rapport et `todo.md` sont aussi inclus afin de conserver la traçabilité de livraison.

### Lot 1 — shell, navigation, recherche et topbar

| Type | Fichiers |
| --- | --- |
| Application | `app/globals.css`, `app/layout.tsx` |
| Composants | `components/app-shell.tsx`, `components/collapsible-shell.tsx`, `components/global-search.tsx`, `components/shell-nav-link.tsx`, `components/topbar-context.tsx` |
| Tests | `tests/prompt8-final-validation.test.ts`, `tests/shell-industrial-contract.test.ts` |
| Documentation | `docs/refonte-lot-1-shell-2026-08-27.md` |

### Lot 2 — boîte agent, création et détail ticket

| Type | Fichiers |
| --- | --- |
| Application | `app/globals.css`, `app/(app)/inbox/page.tsx`, `app/(app)/tickets/new/page.tsx`, `app/(app)/tickets/[id]/page.tsx` |
| Composants | `components/dashboard-visuals.tsx`, `components/new-ticket-form.tsx` |
| Tests | `tests/ticket-refonte-lot2-contract.test.ts` |
| Documentation | `docs/refonte-lot-2-inbox-creation-detail-2026-08-27.md` |

### Lot 3 — clients, dossiers et missions

| Type | Fichiers |
| --- | --- |
| Application | `app/globals.css`, `app/(app)/clients/page.tsx`, `app/(app)/clients/[id]/page.tsx`, `app/(app)/dossiers/page.tsx`, `app/(app)/dossiers/[id]/page.tsx`, `app/(app)/missions/page.tsx`, `app/(app)/missions/[id]/page.tsx` |
| Composants | `components/client-list-client.tsx`, `components/dossier-list-client.tsx`, `components/mission-list-client.tsx` |
| Tests | `tests/portfolio-refonte-lot3-contract.test.ts` |
| Documentation | `docs/refonte-lot-3-portefeuille-2026-08-27.md` |

### Lot 4 — notifications, profil et accès en attente

| Type | Fichiers |
| --- | --- |
| Application | `app/globals.css`, `app/(app)/notifications/page.tsx`, `app/(app)/profile/page.tsx`, `app/pending-assignment/page.tsx` |
| Composants | `components/notification-list.tsx`, `components/notification-center.tsx`, `components/profile-menu.tsx` |
| Tests | `tests/identity-refonte-lot4-contract.test.ts` |
| Documentation | `docs/refonte-lot-4-identite-communication-2026-08-27.md` |

### Lot 5 — base de connaissances

| Type | Fichiers |
| --- | --- |
| Application | `app/globals.css`, `app/(app)/knowledge/page.tsx` |
| Composants | `components/knowledge-list-client.tsx` |
| Tests | `tests/knowledge-refonte-lot5-contract.test.ts` |
| Documentation | `docs/refonte-lot-5-base-connaissances-2026-08-27.md` |

### Lot 6 — actifs

| Type | Fichiers |
| --- | --- |
| Application | `app/globals.css`, `app/(app)/assets/page.tsx`, `app/(app)/assets/[id]/page.tsx` |
| Composants | Aucun composant métier modifié ; `asset-list-client.tsx` et `asset-detail-actions.tsx` héritent de la surcouche scoped. |
| Tests | `tests/assets-refonte-lot6-contract.test.ts` |
| Documentation | `docs/refonte-lot-6-actifs-2026-08-27.md` |

### Lot 7 — pilotage SLA et reporting

| Type | Fichiers |
| --- | --- |
| Application | `app/globals.css`, `app/(app)/reporting/page.tsx`, `app/admin/sla/page.tsx`, `app/admin/reporting/page.tsx` |
| Composants | Aucun composant de calcul modifié ; `sla-indicator.tsx` garde sa logique et est seulement restylé dans les surfaces scoped. |
| Tests | `tests/sla-reporting-refonte-lot7-contract.test.ts` |
| Documentation | `docs/refonte-lot-7-sla-reporting-2026-08-27.md` |

### Lot 8 — administration

| Type | Fichiers |
| --- | --- |
| Application | `app/globals.css`, `app/admin/page.tsx` |
| Composants | `components/admin-shell.tsx` |
| Tests | `tests/admin-refonte-lot8-contract.test.ts` |
| Documentation | `docs/refonte-lot-8-administration-2026-08-27.md` |

### Fichiers transverses

| Type | Fichiers |
| --- | --- |
| Styles | `app/globals.css` contient la surcouche cumulative complète des lots 1 à 8. Il ne doit être copié qu’une fois, à partir de l’archive consolidée. |
| Suivi | `todo.md` |
| Validation consolidée | `docs/validation-production-huit-lots-2026-08-27.md` |

## Points de vigilance majeurs avant production

| Priorité | Point de vigilance | Contrôle concret | Décision attendue |
| --- | --- | --- | --- |
| Critique | Ordre d’application | Utiliser l’archive consolidée unique, ou appliquer strictement les lots 1 à 8. | Aucun écrasement accidentel de `app/globals.css`. |
| Critique | Secret et identité | Ne copiez ni `.env`, ni callback Entra, ni secret NextAuth. Testez la connexion via le flux normal. | Authentification et retour applicatif inchangés. |
| Critique | Autorisations | Tester les comptes sans droit, REQUESTER, AGENT, QUEUE_MANAGER, FUNCTIONAL_ADMIN scoped/global, TECHNICAL_ADMIN et REPORTING_READER. | Aucun menu, bouton ni donnée sensible supplémentaire. |
| Critique | Actifs | Tester spécifiquement qu’un FUNCTIONAL_ADMIN scoped département est redirigé et qu’un FUNCTIONAL_ADMIN global seul accède à `/assets`. | Règle d’accès stricte confirmée. |
| Critique | Ticketing | Créer un ticket de test, vérifier idempotence, routage, boîte agent, claim, commentaire interne/public, SLA et clôture selon les droits. | Aucun changement de workflow ou de visibilité. |
| Élevée | Confidentialité | Vérifier un ticket et un dossier confidentiels avec un compte hors périmètre. | La page reste inaccessible ou filtrée selon le comportement existant. |
| Élevée | SLA | Vérifier un ticket dans chaque état : OK, À surveiller, Dépassement et En pause. Ouvrir les calendriers, jours fériés et escalades. | Les échéances et compteurs restent identiques avant/après style. |
| Élevée | Administration | Tester la console avec un FUNCTIONAL_ADMIN et un TECHNICAL_ADMIN global. | Navigation filtrée selon rôle et permission, sans accès fonctionnel pour le technique. |
| Élevée | Export | Télécharger l’export reporting autorisé et vérifier le CSV. | Fichier, colonnes et périmètre ne changent pas. |
| Élevée | Git | Vérifier `git diff --check`, puis n’ajouter que les fichiers de la liste explicite. | Pas de `.env`, `vercel.json` imprévu, cache ou fichier local dans le commit. |
| Élevée | Vercel Hobby | Vérifier qu’aucun `vercel.json` avec cron `*/15 * * * *` n’est créé ou réintroduit. | Build Vercel compatible Hobby. |
| Moyenne | Déploiement | Vérifier le commit dans l’onglet Deployments de **`1task-bios-mada`**, jamais dans le doublon `1-task`. | Le bon projet doit passer à Ready/Production. |
| Moyenne | Performance | Après publication, lire les logs `[perf]` et le réseau de `/inbox`, `/admin/sla` et `/tickets/[id]`. | Mesures réelles avant toute conclusion sur la latence. |
| Moyenne | Responsive et clavier | Tester sidebar ouverte/repliée, drawer mobile, Escape, focus, recherche `Ctrl/Cmd+K`, tableaux scrollables et modales. | Absence de blocage d’interface ou de contenu inaccessible. |

## Séquence recommandée dans `C:\1task`

Cette procédure applique le ZIP consolidé. Elle ne supprime aucun fichier préexistant, mais écrase les fichiers de la refonte avec les versions consolidées finales.

```powershell
cd C:\1task

$zip = Join-Path $HOME "Downloads\1task-refonte-huit-lots-consolide-2026-08-27.zip"
$stage = Join-Path $env:TEMP "1task-refonte-huit-lots-consolide-2026-08-27"

Remove-Item -Recurse -Force $stage -ErrorAction SilentlyContinue
Expand-Archive -LiteralPath $zip -DestinationPath $stage -Force
Copy-Item -Path "$stage\1task-refonte-huit-lots-consolide\*" -Destination "C:\1task" -Recurse -Force

git status --short
git diff --stat
git diff --check
```

La refonte ne demande **ni SQL, ni migration Prisma, ni `prisma db push`, ni `prisma migrate reset`**. Lancez les validations locales avant de créer le commit.

```powershell
cd C:\1task

npm run typecheck
npm test
npm run lint
$env:NODE_ENV = "production"
npm run build
Remove-Item Env:NODE_ENV -ErrorAction SilentlyContinue
```

Le staging doit être explicite. N’utilisez pas `git add .`.

```powershell
cd C:\1task

git add -- `
  "app/globals.css" `
  "app/layout.tsx" `
  "app/(app)/inbox/page.tsx" `
  "app/(app)/tickets/new/page.tsx" `
  "app/(app)/tickets/[id]/page.tsx" `
  "app/(app)/clients/page.tsx" `
  "app/(app)/clients/[id]/page.tsx" `
  "app/(app)/dossiers/page.tsx" `
  "app/(app)/dossiers/[id]/page.tsx" `
  "app/(app)/missions/page.tsx" `
  "app/(app)/missions/[id]/page.tsx" `
  "app/(app)/notifications/page.tsx" `
  "app/(app)/profile/page.tsx" `
  "app/(app)/knowledge/page.tsx" `
  "app/(app)/assets/page.tsx" `
  "app/(app)/assets/[id]/page.tsx" `
  "app/(app)/reporting/page.tsx" `
  "app/pending-assignment/page.tsx" `
  "app/admin/page.tsx" `
  "app/admin/reporting/page.tsx" `
  "app/admin/sla/page.tsx" `
  "components/app-shell.tsx" `
  "components/collapsible-shell.tsx" `
  "components/global-search.tsx" `
  "components/shell-nav-link.tsx" `
  "components/topbar-context.tsx" `
  "components/dashboard-visuals.tsx" `
  "components/new-ticket-form.tsx" `
  "components/client-list-client.tsx" `
  "components/dossier-list-client.tsx" `
  "components/mission-list-client.tsx" `
  "components/notification-list.tsx" `
  "components/notification-center.tsx" `
  "components/profile-menu.tsx" `
  "components/knowledge-list-client.tsx" `
  "components/admin-shell.tsx" `
  "tests/prompt8-final-validation.test.ts" `
  "tests/shell-industrial-contract.test.ts" `
  "tests/ticket-refonte-lot2-contract.test.ts" `
  "tests/portfolio-refonte-lot3-contract.test.ts" `
  "tests/identity-refonte-lot4-contract.test.ts" `
  "tests/knowledge-refonte-lot5-contract.test.ts" `
  "tests/assets-refonte-lot6-contract.test.ts" `
  "tests/sla-reporting-refonte-lot7-contract.test.ts" `
  "tests/admin-refonte-lot8-contract.test.ts" `
  "docs/refonte-lot-1-shell-2026-08-27.md" `
  "docs/refonte-lot-2-inbox-creation-detail-2026-08-27.md" `
  "docs/refonte-lot-3-portefeuille-2026-08-27.md" `
  "docs/refonte-lot-4-identite-communication-2026-08-27.md" `
  "docs/refonte-lot-5-base-connaissances-2026-08-27.md" `
  "docs/refonte-lot-6-actifs-2026-08-27.md" `
  "docs/refonte-lot-7-sla-reporting-2026-08-27.md" `
  "docs/refonte-lot-8-administration-2026-08-27.md" `
  "docs/validation-production-huit-lots-2026-08-27.md" `
  "todo.md"

git diff --cached --stat
git diff --cached --check
git commit -m "Complete industrial UI refactor across application modules"
git pull --rebase origin main
git push origin main
git status
```

Si `git pull --rebase origin main` signale un conflit, ne faites jamais de `push --force`. Conservez le message Git, résolvez uniquement les fichiers indiqués, puis contrôlez à nouveau le diff avant de pousser.

## Contrôle après publication

1. Dans Vercel, ouvrez le projet **`1task-bios-mada`** et vérifiez que le commit envoyé est `Ready` puis `Production`.
2. Connectez-vous avec un compte Entra et exécutez la checklist fonctionnelle ci-dessus.
3. Consultez les logs Vercel, puis recherchez les mesures `[perf]` sur `/inbox`, `/admin/sla` et `/tickets/[id]`.
4. Si l’interface est lente, relevez les temps réseau et les lignes `[perf]` avant toute nouvelle modification. N’ajoutez pas de polling intensif, SSE ou cron Hobby pour résoudre une lenteur non mesurée.
