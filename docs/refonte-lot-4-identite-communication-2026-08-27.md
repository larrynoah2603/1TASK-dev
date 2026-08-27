# 1TASK — Rapport de livraison du lot 4 : identité et communication

**Date :** 27 août 2026

**Périmètre :** centre de notifications, menu de notifications de la barre supérieure, profil utilisateur, menu profil et accès en attente d’affectation.

**Nature :** refonte visuelle scoped, sans modification de Microsoft Entra ID, NextAuth, de session, de préférences, des API de notifications, des permissions ou des redirections.

## Résultat livré

Le lot 4 transforme les interfaces d’identité en surfaces cohérentes avec la console industrielle : graphites opaques, typographie dense, références champagne et ligne rouge utilisée comme signal structurel. Les notifications deviennent une liste chronologique lisible ; le profil est présenté comme une fiche d’identité en lecture seule ; l’accès en attente reçoit une page sobre qui exprime clairement que la validation administrative est requise.

| Écran ou surface | Refonte appliquée |
| --- | --- |
| `/notifications` | En-tête avec règle rouge, historique chronologique, repères de lecture carrés, actions « Actualiser » et « Tout marquer lu » cohérentes. |
| Centre de notifications topbar | Popover graphite, compteur rouge, lignes de notification avec état lu/non lu et navigation vers les tickets. |
| `/profile` | Fiche d’identité Microsoft Entra en lecture seule, avatar carré, notice de gouvernance et rôles structurés. |
| Menu profil topbar | Déclencheur compact, popover graphité, accès conditionnel à l’administration et déconnexion préservés. |
| `/pending-assignment` | Écran hors shell, état d’attente lisible, bloc d’identité, signal ambre et déconnexion disponible. |

## Invariants protégés

> Le lot 4 ne contient aucune migration Prisma, aucune requête SQL, aucune modification de route API, aucun changement de callback Microsoft Entra ID/NextAuth et aucun secret.

La page notifications continue de charger les 100 notifications visibles de l’utilisateur authentifié. Le menu topbar continue de charger les 8 dernières notifications avec délai maximal et protection contre les requêtes concurrentes. Les actions de lecture unitaire et globale utilisent strictement les routes existantes. Le profil reste en lecture seule et Microsoft Entra ID demeure la source d’identité. L’écran d’attente conserve les redirections vers `/signin` ou `/dashboard` selon la session et le statut.

| Domaine sensible | Comportement conservé |
| --- | --- |
| Authentification | `requireAuthenticatedUser`, `getSessionUserContext`, les redirections et le lien NextAuth de déconnexion restent inchangés. |
| Notifications | Chargement contrôlé, compteur non lu, lecture unitaire, lecture globale, Escape, clic extérieur et liens tickets sont inchangés. |
| Profil | Nom, e-mail, département, manager, équipe, file et rôles restent uniquement des données serveur affichées en lecture seule. |
| Administration | Le lien vers `/admin` du menu profil reste conditionné par la prop `admin`. |

## Fichiers modifiés

| Fichier | Rôle |
| --- | --- |
| `app/globals.css` | Surcouche finale des classes `.identity-industrial`, `.notification-industrial`, `.profile-industrial` et `.pending-industrial`. |
| `app/(app)/notifications/page.tsx` | Portée visuelle du centre de notifications. |
| `components/notification-list.tsx` | Crochets visuels de l’historique et de l’état lu/non lu, sans changement des fetch. |
| `components/notification-center.tsx` | Crochet du popover de topbar, sans changement du compteur, du délai ou de l’accessibilité. |
| `app/(app)/profile/page.tsx` | Portée visuelle de la fiche profil en lecture seule. |
| `components/profile-menu.tsx` | Crochet visuel du menu profil, sans changement de lien admin ou de déconnexion. |
| `app/pending-assignment/page.tsx` | Portée visuelle de l’attente d’affectation. |
| `tests/identity-refonte-lot4-contract.test.ts` | Nouveau test des invariants de session, notifications, profil, navigation et attente d’accès. |
| `todo.md` | Suivi actualisé. |

## Validation effectuée

| Contrôle | Résultat |
| --- | --- |
| `npm run typecheck` avec URL de base locale factice | Réussi. |
| `npm test` | **120 tests passants**, **3 tests d’intégration ignorés** volontairement. |
| `npm run lint` | **0 erreur**. Trois avertissements historiques `no-img-element` subsistent dans le profil, le shell et le menu profil. |
| `NODE_ENV=production npm run build` | Réussi avec Next.js 16.3.0. |
| Contrôle de palette scoped | Réussi : aucun bleu, cyan, indigo ou violet dans la surcouche du lot 4. |
| Contrôle d’espaces finaux | Réussi pour les fichiers TypeScript concernés. |

La copie de travail est une extraction sans dossier `.git`. Exécutez `git diff --check` dans votre dépôt Windows après application de l’archive.

## Tests fonctionnels avec un compte Entra autorisé

1. Ouvrez la cloche de la topbar, vérifiez le compteur non lu, puis ouvrez et fermez le popover par clic extérieur et touche `Escape`.
2. Ouvrez une notification liée à un ticket et vérifiez qu’elle est marquée lue. Utilisez ensuite « Tout marquer lu » et contrôlez que le compteur devient zéro.
3. Ouvrez `/notifications`, testez « Actualiser », les lignes lues/non lues et les liens de ticket.
4. Ouvrez `/profile`, vérifiez les données Entra en lecture seule, les rôles et l’absence de modification directe. Contrôlez le menu profil et, si autorisé, le lien administration.
5. Avec un utilisateur non affecté, ouvrez `/pending-assignment` et vérifiez le message, les données d’identité, puis la déconnexion. Avec un utilisateur actif, vérifiez la redirection vers `/dashboard`.

## Procédure Windows d’application

Le ZIP ne contient que les fichiers du lot 4. Il ne contient ni `.env`, ni `.git`, ni dépendances, ni cache Next.js, ni donnée. Appliquez-le après les lots 1, 2 et 3 pour bénéficier du shell et des tokens industriels communs.

```powershell
cd C:\1task

$zip = Join-Path $HOME "Downloads\1task-refonte-lot4-identite-communication-2026-08-27.zip"
$stage = Join-Path $env:TEMP "1task-refonte-lot4-identite-communication-2026-08-27"

Remove-Item -Recurse -Force $stage -ErrorAction SilentlyContinue
Expand-Archive -LiteralPath $zip -DestinationPath $stage -Force
Copy-Item -Path "$stage\1task-refonte-lot4-identite-communication\*" -Destination "C:\1task" -Recurse -Force

git status --short
git diff --stat
git diff --check
```

Il ne faut exécuter ni SQL, ni migration Prisma, ni modification Vercel/Neon pour ce lot visuel. Exécutez ensuite les validations locales.

```powershell
cd C:\1task

npm run typecheck
npm test
npm run lint
$env:NODE_ENV = "production"
npm run build
Remove-Item Env:NODE_ENV -ErrorAction SilentlyContinue
```

Après le contrôle visuel, créez le commit avec une liste explicite de fichiers. N’utilisez pas `git add .`.

```powershell
cd C:\1task

git add -- `
  "app/globals.css" `
  "app/(app)/notifications/page.tsx" `
  "app/(app)/profile/page.tsx" `
  "app/pending-assignment/page.tsx" `
  "components/notification-list.tsx" `
  "components/notification-center.tsx" `
  "components/profile-menu.tsx" `
  "tests/identity-refonte-lot4-contract.test.ts" `
  "docs/refonte-lot-4-identite-communication-2026-08-27.md" `
  "todo.md"

git diff --cached --stat
git diff --cached --check
git commit -m "Refine industrial identity and notifications"
git pull --rebase origin main
git push origin main
git status
```

En cas de conflit pendant `git pull --rebase`, ne faites pas de `push --force`. Conservez le message Git et résolvez uniquement les fichiers indiqués avant de poursuivre.

> Le prochain périmètre proposé est le lot 5 : Base de connaissances. Il démarrera seulement après validation visuelle du lot 4.
