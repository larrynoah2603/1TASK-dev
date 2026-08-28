# Correctif ciblé — boîte agent et résolution Prisma

## Objet

Ce correctif traite deux défauts indépendants dans 1TASK. Il ne modifie ni le schéma Prisma, ni les migrations, ni les données Neon, ni les droits, rôles, scopes, règles de visibilité, SLA ou règles de workflow.

La table de la **Boîte agent** est recomposée, sur ordinateur, en quatre colonnes de lecture : ticket, suivi, traitement et action. La référence, l’objet, le service ou la file et le demandeur sont regroupés dans la première colonne ; priorité, statut et SLA sont regroupés dans la deuxième. Le lien de détail, les badges et l’action **Prendre/Ouvrir** sont conservés. Sous 767 px, le défilement horizontal tactile reste possible afin de ne pas masquer des informations.

| Élément | Correction |
| --- | --- |
| Table desktop | Retrait de la largeur minimale de 880 px uniquement pour la table de boîte agent ; largeur fixe répartie sur quatre colonnes. |
| Ticket | Référence, objet, service/file et demandeur visibles dans une même cellule, sans troncature forcée du contexte. |
| Suivi | Priorité, statut et badge SLA regroupés et repliables. |
| Mobile | Défilement horizontal seulement sous 767 px, avec une largeur minimale de 640 px. |

## Diagnostic de l’erreur Prisma

L’erreur observée référence `notificationPreference.findUnique` et une transaction Prisma inactive. Elle survient pendant une transition de ticket parce que la transaction interactive effectuait, en plus de la mise à jour du ticket, de l’événement et de l’audit, des lectures de préférences puis des créations de notifications. Si la transaction est expirée ou fermée avant l’une de ces lectures, Prisma refuse l’opération.

La correction garde **atomiques** dans la transaction : la transition de statut, l’événement `TicketEvent`, l’audit append-only, l’affectation éventuelle et les champs SLA. Les notifications sont maintenant préparées dans la transaction, puis envoyées via `after()` après le commit avec le client Prisma normal. La transaction reçoit aussi explicitement `maxWait: 10_000` et `timeout: 15_000`, conformément au standard du projet.

> Si l’envoi post-commit d’une notification échoue, le ticket reste correctement passé à l’état demandé, avec son événement et son audit. L’erreur est journalisée côté serveur ; elle ne remet pas en cause la résolution validée.

## Fichiers contenus dans l’archive

| Chemin | Rôle |
| --- | --- |
| `components/dashboard-visuals.tsx` | Table compacte de la Boîte agent. |
| `app/globals.css` | Règles scoped pour l’affichage desktop et le repli mobile. |
| `lib/ticket-service.ts` | Transaction de transition limitée aux écritures atomiques ; notifications différées. |
| `tests/inbox-resolution-regression.test.ts` | Contrat de non-régression de la table et de la transition. |
| `todo.md` | Suivi des tâches effectuées et validation locale à faire. |

## Application locale sur Windows

Avant de copier les fichiers, ouvrez PowerShell dans le dépôt d’origine et exécutez **uniquement** cette première commande :

```powershell
cd C:\1task
git status --short
```

Si la commande n’affiche aucun fichier modifié, décompressez l’archive dans un dossier temporaire, puis copiez les fichiers en conservant les chemins. Ne copiez jamais de fichier `.env` : l’archive n’en contient pas.

Exécutez ensuite, dans cet ordre, les validations suivantes :

```powershell
npm run typecheck
npm test
npm run lint
$env:NODE_ENV = "production"
npm run build
Remove-Item Env:NODE_ENV -ErrorAction SilentlyContinue
git diff --check
```

L’archive de travail utilisée pour préparer ce correctif était incomplète par rapport au dépôt Windows : son typecheck global échoue sur des exports et props préexistants (`getOperationalTicketSummary`, `getAdminUserSummary`, configuration SLA et propriété `createdAt`). Les tests ciblés, les tests de workflow et le lint ciblé du correctif sont passants. La batterie complète doit donc être exécutée dans `C:\1task`, qui reste la source de vérité.

## Commit Git après validation complète

N’exécutez ces commandes qu’après des validations locales réussies et après relecture de `git status --short` :

```powershell
git add -- "app/globals.css" "components/dashboard-visuals.tsx" "lib/ticket-service.ts" "tests/inbox-resolution-regression.test.ts" "todo.md" "docs/guide-correctif-inbox-resolution-2026-08-27.md"
git diff --cached --stat
git diff --cached --check
git commit -m "Fix inbox layout and resolution notification transaction"
git pull --rebase origin main
git push origin main
git status
```

Le déploiement Vercel doit provenir du projet officiel **`1task-bios-mada`**. Ne créez pas de `vercel.json`, de cron Hobby, de migration ou de modification de configuration Vercel pour ce correctif.
