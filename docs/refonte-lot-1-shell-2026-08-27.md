# 1TASK — Rapport de livraison du lot 1 : shell industriel

**Date :** 27 août 2026

**Périmètre :** tokens, shell global, navigation, recherche et barre supérieure.
**Nature :** refonte visuelle ciblée, sans modification des règles métier, des routes, de Prisma, de Neon ou de l’authentification Microsoft Entra ID.

## Résultat livré

Le lot 1 remplace l’apparence hétérogène du chrome applicatif par une console interne noire et graphite, dense, contrastée et structurée. La nouvelle couche est volontairement limitée au shell afin que les écrans métier — boîte agent, tickets, portefeuille, administration et reporting — puissent être refondus séparément dans les lots suivants.

| Élément | Mise en œuvre |
| --- | --- |
| Palette | Ajout de tokens `--industrial-*` : noir `#080808`, graphite, ivoire, champagne et rouge structurel. Aucun nouveau bleu, cyan, indigo ou violet n’est introduit dans les composants du lot. |
| Sidebar | Fond graphite opaque, marque compacte, séparateurs de sections, avatars carrés et liens de navigation aux repères latéraux. |
| Navigation active | Le lien actif utilise un liseré champagne à gauche et un repère rouge à droite. L’attribut `aria-current="page"` existant est conservé. |
| Topbar | Barre noire mate, règle rouge horizontale, contexte typographique éditorial et actions alignées sans effet verre ni halo. |
| Recherche globale | Champ et résultats rendus en surfaces graphite carrées, avec référence champagne, focus visible et état survol rouge. Le raccourci et l’API existants restent inchangés. |
| Thème | Le thème sombre est déterminé avant l’hydratation, tout en respectant le choix local du mode clair lorsqu’il existe. |

## Fichiers inclus dans cette livraison

| Fichier | Rôle de la modification |
| --- | --- |
| `app/globals.css` | Ajout d’une surcouche finale, isolée sous `.shell-industrial`, sans réécriture destructive des styles de pages existants. |
| `app/layout.tsx` | Application précoce du thème sombre ou du choix local avant l’hydratation. |
| `components/collapsible-shell.tsx` | Crochets visuels du shell et règle rouge ; le drawer mobile, Escape et le comportement de repli restent intacts. |
| `components/app-shell.tsx` | Classes de présentation de la topbar et du bloc utilisateur ; filtrage des liens, permissions et compteur de notifications préservés. |
| `components/shell-nav-link.tsx` | Classes industrielles uniquement ; calcul du lien actif inchangé. |
| `components/global-search.tsx` | Présentation des résultats de recherche uniquement ; debounce, `AbortController`, raccourci et contrat `/api/search` inchangés. |
| `components/topbar-context.tsx` | Crochet visuel pour le fil contextuel et le bouton de sidebar. |
| `tests/shell-industrial-contract.test.ts` | Nouveau contrôle source du périmètre visuel et des invariants d’accès. |
| `tests/prompt8-final-validation.test.ts` | Le contrôle de sécurité ignore désormais `.env.example` lorsqu’il n’est pas inclus dans une archive de travail, sans retirer aucune assertion de fournisseur d’identité. |

## Invariants protégés

> Ce lot ne contient ni migration Prisma, ni requête SQL, ni modification d’API, ni changement de callback Microsoft Entra ID/NextAuth.

Les contrôles conservent explicitement la permission de création de ticket, la condition `isFunctionalAssetAdministrator(user)` pour les Actifs, le filtrage administrateur et les attributs d’accessibilité de navigation. Les URLs, handlers, décompte de notifications non lues, raccourci `Ctrl`/`Cmd+K`, annulation de recherche et comportement mobile n’ont pas été modifiés.

## Validation effectuée

| Contrôle | Résultat |
| --- | --- |
| `npm run typecheck` avec URL de base factice locale | Réussi. |
| `npm test` | **108 tests passants**, **3 tests d’intégration ignorés** volontairement. |
| `npm run lint` | **0 erreur** ; 3 avertissements historiques `no-img-element` dans le profil, le shell et le menu profil. |
| `NODE_ENV=production npm run build` | Réussi ; toutes les routes Next.js sont compilées. |
| Vérification visuelle disponible sans session | La page de connexion compile et s’affiche. La vérification interactive de l’espace authentifié doit être faite avec un compte Entra réel sur la copie locale ou sur l’aperçu Vercel. |

## Procédure Windows d’application

L’archive livrée contient exclusivement les fichiers modifiés par ce lot, sans `.env`, dépendances, cache Next.js, `.git` ni données de base. Elle ne supprime aucun fichier du projet lors de la copie.

```powershell
cd C:\1task

$zip = Join-Path $HOME "Downloads\1task-refonte-lot1-shell-2026-08-27.zip"
$stage = Join-Path $env:TEMP "1task-refonte-lot1-shell-2026-08-27"

Remove-Item -Recurse -Force $stage -ErrorAction SilentlyContinue
Expand-Archive -LiteralPath $zip -DestinationPath $stage -Force
Copy-Item -Path "$stage\1task-refonte-lot1-shell\*" -Destination "C:\1task" -Recurse -Force

git status --short
git diff --stat
```

Exécutez ensuite les validations locales. Aucune commande Prisma de migration ou de synchronisation n’est nécessaire pour ce lot UI.

```powershell
cd C:\1task

npm run typecheck
npm test
npm run lint
$env:NODE_ENV = "production"
npm run build
Remove-Item Env:NODE_ENV -ErrorAction SilentlyContinue
```

Après contrôle du rendu et seulement si ces commandes sont satisfaisantes, préparez un commit avec une liste explicite de fichiers. N’utilisez pas `git add .`.

```powershell
cd C:\1task

git add -- `
  "app/globals.css" `
  "app/layout.tsx" `
  "components/app-shell.tsx" `
  "components/collapsible-shell.tsx" `
  "components/global-search.tsx" `
  "components/shell-nav-link.tsx" `
  "components/topbar-context.tsx" `
  "tests/prompt8-final-validation.test.ts" `
  "tests/shell-industrial-contract.test.ts" `
  "docs/refonte-lot-1-shell-2026-08-27.md" `
  "todo.md"

git diff --cached --stat
git diff --cached --check
git commit -m "Refine industrial application shell"
git pull --rebase origin main
git push origin main
git status
```

Si `git pull --rebase` annonce un conflit, ne faites pas de `push --force`. Arrêtez-vous après la commande de diagnostic et conservez le message Git : le conflit doit être résolu fichier par fichier avant tout envoi.

## Contrôle fonctionnel à réaliser avec un compte autorisé

1. Vérifier la sidebar ouverte et repliée sur ordinateur, puis le drawer mobile avec backdrop et touche `Escape`.
2. Vérifier le lien actif, la navigation clavier et les contours de focus sur les liens, la recherche et les actions de barre supérieure.
3. Ouvrir la recherche avec `Ctrl+K` ou `Cmd+K`, lancer une requête, ouvrir un résultat puis vérifier que la navigation conserve le contexte attendu.
4. Vérifier le compteur de notifications, le menu profil, le bouton Nouveau ticket et la bascule sombre/clair, sans modifier les droits visibles.

La prochaine étape est le **lot 2** : la boîte agent, la création de ticket et le détail ticket. Elle ne doit commencer qu’après validation visuelle explicite de ce lot 1.
