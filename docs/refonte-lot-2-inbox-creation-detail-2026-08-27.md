# 1TASK — Rapport de livraison du lot 2 : boîte agent et flux ticket

**Date :** 27 août 2026

**Périmètre :** boîte agent, création de ticket et détail ticket.

**Nature :** refonte visuelle strictement ciblée, sans modification des règles métier, de Prisma, de Neon, des API REST, des permissions, du workflow SLA ou de Microsoft Entra ID/NextAuth.

## Résultat livré

Le lot 2 applique la même direction noir industriel que le shell du lot 1 au flux de travail le plus fréquent. La boîte agent devient un poste de tri dense où la priorité, le SLA et la prise en charge restent lisibles. La création de ticket suit une séquence plus explicite, tandis que le détail conserve les commentaires au centre et les décisions opérationnelles dans un panneau latéral compact.

| Écran | Refonte appliquée |
| --- | --- |
| `/inbox` | Vue de poste de commande avec onglets éditoriaux, bandeau de priorité, KPI plats, tableau de file dense, filtres graphite et panneau SLA à surveiller. |
| `/tickets/new` | Fiche de demande séquentielle, repères d’étapes, sections de routage lisibles, prévisualisation et actions cohérentes avec la palette industrielle. |
| `/tickets/[id]` | Bandeau de statut rouge, suivi SLA champagne/menthe/ambre/corail, commentaires visibles dans la zone principale, panneaux latéraux carrés et actions opérationnelles contenues. |

## Décisions de conception

Les surfaces du lot sont limitées aux classes `inbox-operations-industrial`, `ticket-create-industrial` et `ticket-detail-industrial`. Cette isolation empêche le lot 2 d’altérer les écrans portefeuille, base de connaissances, actifs, reporting ou administration, qui seront traités dans des étapes indépendantes.

La palette nouvelle utilise le noir, les graphites, l’ivoire et des accents décisionnels : champagne pour les références et la progression, menthe pour les états favorables, ambre pour l’attention et corail pour les risques. La ligne rouge est réservée à la structure, au statut actif et aux alertes les plus importantes. Aucun nouvel accent bleu, cyan, indigo ou violet n’est introduit dans cette surcouche.

| Composant protégé | Invariant conservé |
| --- | --- |
| Boîte agent | Les rôles opérationnels, les requêtes de visibilité, les scopes, les compteurs, les conditions de claim et la pagination restent inchangés. |
| Création | `creationIdempotencyToken`, délai contrôlé, appels vers `/api/departments`, `/api/production/*` et `/api/tickets`, validation client et redirection finale restent inchangés. |
| Détail | `getTicketForViewer`, `getTicketActionContext`, actions disponibles, commentaires public/interne, qualification, SLA, relations et pièces jointes restent inchangés. |
| Modèle et routes | Aucune migration, aucune requête SQL, aucun fichier Prisma et aucune route API n’ont été modifiés. |

## Fichiers inclus

| Fichier | Rôle |
| --- | --- |
| `app/globals.css` | Surcouche finale scoped du lot 2. Elle remplace la présentation du flux ticket sans supprimer les styles des autres domaines. |
| `app/(app)/inbox/page.tsx` | Crochet de portée visuelle de la boîte agent. |
| `app/(app)/tickets/new/page.tsx` | Nouvelle structure visuelle du bandeau de création. |
| `components/new-ticket-form.tsx` | Crochets de présentation de la fiche de demande. Les handlers et fetch ne changent pas. |
| `app/(app)/tickets/[id]/page.tsx` | Crochet de portée visuelle du détail ticket. |
| `components/dashboard-visuals.tsx` | Noms d’avatars sémantiques pour demandeur, agent et surveillance. Les données affichées ne changent pas. |
| `tests/ticket-refonte-lot2-contract.test.ts` | Nouveau test de contrat qui vérifie les invariants de visibilité, idempotence et récupération sécurisée du détail. |
| `todo.md` | Historique de suivi du lot 2. |

## Validation effectuée

| Contrôle | Résultat |
| --- | --- |
| `npm run typecheck` avec URL de base factice locale | Réussi. |
| `npm test` | **112 tests passants**, **3 tests d’intégration ignorés** volontairement. |
| `npm run lint` | **0 erreur**. Trois avertissements historiques `no-img-element` subsistent dans le profil, le shell et le menu profil. |
| `NODE_ENV=production npm run build` | Réussi avec Next.js 16.3.0. |
| Contrôle de palette du lot | Réussi : aucun bleu, cyan, indigo ou violet dans la surcouche du lot 2. |
| Contrôle d’espaces finaux | Réussi pour les fichiers TypeScript concernés. |

La copie de travail a été extraite d’une archive et ne contient pas le dossier `.git`. Le contrôle équivalent à `git diff --check` devra donc être exécuté dans votre dépôt Windows après application du ZIP.

## Tests fonctionnels à réaliser avec comptes Entra autorisés

1. Ouvrez `/inbox` avec un rôle AGENT, QUEUE_MANAGER ou FUNCTIONAL_ADMIN. Vérifiez les vues « Tous », « Non affectés », « Mes tickets » et « Équipe », puis la pagination et les filtres URL.
2. Sur un ticket non affecté dans une file autorisée, utilisez « Prendre en charge », confirmez l’action et vérifiez l’actualisation de la ligne et de la timeline.
3. Ouvrez `/tickets/new`, choisissez un département cible, remplissez les champs requis, prévisualisez, puis créez un ticket. Vérifiez que le routage et la redirection vers le détail sont identiques au comportement actuel.
4. Sur `/tickets/[id]`, vérifiez le statut, la progression SLA, un commentaire public, un commentaire interne avec un agent habilité, ainsi que l’ouverture/fermeture des panneaux latéraux.
5. Avec un utilisateur non opérationnel, vérifiez qu’il ne voit pas les actions réservées. Avec un utilisateur sans périmètre, vérifiez que le ticket reste invisible ou renvoie vers la page introuvable comme avant.

## Procédure Windows d’application

L’archive contient uniquement les fichiers du lot 2, le rapport et le suivi. Elle ne contient aucun secret, aucun cache `.next`, aucune dépendance `node_modules`, aucun `.git` et aucune donnée de base.

```powershell
cd C:\1task

$zip = Join-Path $HOME "Downloads\1task-refonte-lot2-inbox-ticket-2026-08-27.zip"
$stage = Join-Path $env:TEMP "1task-refonte-lot2-inbox-ticket-2026-08-27"

Remove-Item -Recurse -Force $stage -ErrorAction SilentlyContinue
Expand-Archive -LiteralPath $zip -DestinationPath $stage -Force
Copy-Item -Path "$stage\1task-refonte-lot2-inbox-ticket\*" -Destination "C:\1task" -Recurse -Force

git status --short
git diff --stat
git diff --check
```

Ce lot UI ne nécessite aucune commande SQL, aucune migration Prisma et aucune configuration Vercel/Neon. Exécutez ensuite les validations locales.

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
  "app/(app)/inbox/page.tsx" `
  "app/(app)/tickets/new/page.tsx" `
  "app/(app)/tickets/[id]/page.tsx" `
  "components/dashboard-visuals.tsx" `
  "components/new-ticket-form.tsx" `
  "tests/ticket-refonte-lot2-contract.test.ts" `
  "docs/refonte-lot-2-inbox-creation-detail-2026-08-27.md" `
  "todo.md"

git diff --cached --stat
git diff --cached --check
git commit -m "Refine industrial ticket workspaces"
git pull --rebase origin main
git push origin main
git status
```

En cas de conflit au `git pull --rebase`, ne faites pas de `push --force`. Conservez le message Git et résolvez les fichiers explicitement indiqués avant d’envoyer quoi que ce soit.

> La suite proposée est le lot 3, consacré aux vues portefeuille : clients, dossiers clients et missions. Il devra démarrer uniquement après votre validation visuelle de ce lot 2.
