# 1TASK — Service desk interne

Application indépendante de gestion des incidents et demandes internes. La marque visible du prototype est **1TASK** ; le nom technique du package reste `ticketing-interne` pour préserver la compatibilité du projet.

## Stack

- Next.js 16 avec App Router et TypeScript strict ;
- PostgreSQL et Prisma ORM 6 ;
- Microsoft Entra ID via NextAuth comme unique fournisseur d’identité ;
- Tailwind CSS 4 ;
- Zod pour les entrées API ;
- Vitest pour les tests du domaine et du cloisonnement.

MongoDB, Firebase et une authentification locale ne sont pas utilisés.

## Fonctionnalités livrées

- Synchronisation Entra ID de l’identifiant Microsoft, du nom d’identité, de l’e-mail et du manager hiérarchique source ;
- profil applicatif administré depuis `/admin/users` avec nom affiché, département, manager applicatif, rôle, équipe, file autorisée et statut ;
- conservation séparée de `entraDisplayName` (lecture seule) et `managedDisplayName` (nom affiché), avec état initial `PENDING_ASSIGNMENT` ;
- organisation Département → File → Équipe → Responsable → Agent ;
- catalogue de services imposant la file, la nature, la catégorie, la priorité, le SLA et l’escalade ;
- routage démontré pour « Problème de connexion Wi-Fi » vers `DSI / Support réseau` ;
- neuf statuts, transitions contrôlées côté serveur, résolution avec cause/action/solution et réouverture motivée ;
- commentaires demandeur séparés des commentaires internes ;
- affectation à un membre actif de l’équipe avec historique et notification ;
- calendrier ouvré, jours fériés, trois modes de calcul SLA et seuils 50/80/100 % ;
- moniteur SLA exécutable par Vercel Cron ;
- accès confidentiel nominatif, cloisonnement des listes/recherches/reportings et audit append-only ;
- validation administrée des correspondances entre les valeurs de département Entra ID et les départements internes ;
- deux espaces clairement séparés : espace normal demandeur/agent/responsable et console `/admin` réservée aux administrateurs ;
- console `/admin` avec utilisateurs, départements/Entra, files, équipes, catalogue, SLA, notifications, supervision, audit et reporting ;
- désactivation applicative persistante, distincte de l’état officiel Entra, avec notification et audit avant/après ;
- écrans de dashboard, tickets, boîte de réception, files et reporting, avec filtres serveur de périmètre, équipe, affectation et SLA.

## Prérequis

- Node.js `>=20.9` ;
- PostgreSQL 14 ou supérieur ;
- une application Microsoft Entra ID configurée pour l’authentification web.

## Installation locale

```bash
npm install
cp .env.example .env.local
```

Renseigner ensuite les variables de `.env.local`. Générer un secret long pour `NEXTAUTH_SECRET` ; aucune valeur réelle ne doit être commitée.

Initialiser la base PostgreSQL :

```bash
npx prisma generate
npx prisma migrate dev
```

`npm run db:seed` est maintenant facultatif : il ajoute uniquement des
données de démonstration (départements, files, catalogue et comptes fictifs).
Il n’est pas nécessaire pour créer le véritable administrateur Entra ID.

Démarrer l’application :

```bash
npm run dev
```

Puis ouvrir `http://localhost:3000`.

## Microsoft Entra ID

1. Dans le portail Microsoft Entra, créer une **App registration** de type Web.
2. Ajouter comme URI de redirection locale : `http://localhost:3000/api/auth/callback/microsoft-entra-id`.
3. Ajouter l’URI équivalente de production : `https://votre-domaine.example/api/auth/callback/microsoft-entra-id`.
4. Créer un secret client et le conserver uniquement dans l’environnement de déploiement.
5. Ajouter les permissions déléguées Microsoft Graph `User.Read`. Pour synchroniser le manager et obtenir les profils organisationnels, demander les permissions Graph appropriées à la politique de votre tenant, par exemple `User.ReadBasic.All` ou `User.Read.All`, puis accorder le consentement administrateur.
6. Renseigner `MICROSOFT_ENTRA_ID_CLIENT_ID`, `MICROSOFT_ENTRA_ID_CLIENT_SECRET`, `MICROSOFT_ENTRA_ID_TENANT_ID`, `NEXTAUTH_URL` et `NEXTAUTH_SECRET`.

Le callback récupère le jeton Microsoft puis appelle Microsoft Graph. Il
conserve l’identifiant unique, l’adresse e-mail, le nom d’identité et les
valeurs organisationnelles brutes dans `User`. Toute nouvelle identité
ordinaire est créée avec le statut `PENDING_ASSIGNMENT`; elle ne peut ni
ouvrir le tableau de bord ni créer ou traiter un ticket avant validation.

L’administrateur fonctionnel complète la fiche depuis `/admin/users`. Le nom
affiché, le département interne, le manager applicatif, le rôle, l’équipe, la
file autorisée et le statut sont alors enregistrés, historisés dans
`UserProfileChange` et ajoutés à `AuditLog`. `entraDisplayName`, `entraObjectId`
et l’adresse e-mail restent en lecture seule. Le manager applicatif (`managerId`)
est distinct du manager hiérarchique Entra (`entraManagerId`) et du responsable
de file (`Queue.managerId`). `EntraDepartmentMapping` est conservé pour les
valeurs Entra brutes et la compatibilité de l’organisation, mais n’écrase plus
le département interne d’un profil ni ne l’active automatiquement.

`ADMIN_EMAILS` est une liste d’adresses Entra séparées par des virgules ou des
points-virgules. Chaque adresse doit correspondre à une vraie adresse
Microsoft Entra ID autorisée. Après sa première connexion, l’application crée
ou met à jour la ligne `User` réelle, lui attribue `FUNCTIONAL_ADMIN`, lui
attribue ses permissions et la passe à `ACTIVE`. Aucun administrateur n’est
créé par `prisma/seed.ts` et aucune connexion locale parallèle n’est ajoutée.

Pour la production, renseigner explicitement les vraies adresses dans
`.env`/Vercel, par exemple :

```env
ADMIN_EMAILS="votre.adresse@bios-expertise.com"
```

Le catalogue des rôles et permissions est installé par les migrations Prisma,
donc cette procédure fonctionne même si `npm run db:seed` n’est jamais lancé.

L’administrateur réel peut ensuite ouvrir `/admin/users` et compléter les
informations internes qui le concernent. Les autres utilisateurs Entra restent
en attente jusqu’à leur validation administrative.

## Dépannage PostgreSQL sous Windows

L’erreur `Can't reach database server at localhost:5432` signifie que le
problème se situe avant Microsoft Entra ID : PostgreSQL n’est pas démarré, le
port est différent, ou `DATABASE_URL` ne correspond pas à la base locale.

Dans PowerShell :

```powershell
Get-Service *postgres*
Start-Service -Name "NOM_DU_SERVICE_POSTGRESQL"
Get-NetTCPConnection -LocalPort 5432 -ErrorAction SilentlyContinue
```

Vérifier ensuite que `.env` pointe vers la base réellement créée, par exemple :

```env
DATABASE_URL="postgresql://ticketing:mot-de-passe@localhost:5432/ticket_db?schema=public"
```

Depuis le dossier du projet, appliquer les migrations puis relancer le serveur :

```powershell
npm run db:deploy
npm run dev
```

`db:deploy` et `dev` régénèrent automatiquement le client Prisma. Cette étape
est importante après une mise à jour du schéma : sinon Next.js peut conserver
dans `node_modules/.prisma` un ancien client qui ne connaît pas, par exemple,
`entraManagerId` ou `managedDisplayName`.

Si le serveur était déjà lancé au moment de la mise à jour, arrêter le serveur
avec `Ctrl+C`, supprimer uniquement son cache Next.js, puis relancer :

```powershell
cd C:\1task
Remove-Item -Recurse -Force .next -ErrorAction SilentlyContinue
npm run db:deploy
npm run dev
```

Si Prisma signale une migration échouée, ne réinitialisez pas la base. Vérifiez
d'abord son état :

```powershell
npx prisma migrate status
```

Pour la première tentative de la migration du profil, la récupération sûre est
la suivante, uniquement si `migrate status` indique qu'elle est échouée :

```powershell
npx prisma migrate resolve --rolled-back "20260812090000_managed_user_profiles"
npm run db:deploy
```

Cette procédure conserve les utilisateurs, tickets, historiques et journaux.

### Récupération de la migration de recherche plein texte

Si `migrate deploy` a échoué sur
`20260914100000_add_ticket_full_text_search` avec le code PostgreSQL `25001`
(`CREATE INDEX CONCURRENTLY` exécuté dans une transaction), récupérez d'abord la
version corrigée du dépôt. Marquez ensuite **uniquement cette migration** comme
annulée, puis relancez le déploiement :

```powershell
npx prisma migrate resolve --rolled-back "20260914100000_add_ticket_full_text_search"
npx prisma migrate deploy
npx prisma migrate status
```

N'utilisez pas `--applied` dans ce cas : la migration n'a pas terminé et les
migrations suivantes n'ont pas encore été exécutées. Les instructions SQL de la
migration corrigée sont idempotentes, ce qui permet à Prisma de la rejouer après
la résolution de l'état échoué.

Après avoir ajouté l’adresse réelle dans `ADMIN_EMAILS`, redémarrer
l’application, se connecter avec cette adresse Microsoft Entra ID, puis ouvrir
`/admin/users`. Le compte réel doit apparaître avec le rôle
« Administrateur fonctionnel » et le statut `ACTIVE`. Les utilisateurs
ordinaires restent en attente jusqu’à leur validation explicite. Une
justification d’au moins 10 caractères est demandée pour chaque enregistrement
administratif.

## Variables d’environnement

- ALLOWED_EMAIL_DOMAIN : domaine professionnel autorisé par Microsoft Entra ID ;
- ADMIN_EMAILS : liste facultative des e-mails Entra bootstrapés comme administrateurs fonctionnels ;

Le fichier `.env.example` ne contient aucun secret réel :

- `DATABASE_URL` : URL PostgreSQL ;
- `NEXTAUTH_URL` et `NEXTAUTH_SECRET` : session NextAuth ;
- `MICROSOFT_ENTRA_ID_CLIENT_ID`, `MICROSOFT_ENTRA_ID_CLIENT_SECRET`, `MICROSOFT_ENTRA_ID_TENANT_ID` : Microsoft Entra ID ;
- `CRON_SECRET` : protection de l’endpoint de surveillance SLA en production.
- `PERFORMANCE_SLOW_OPERATION_MS` : seuil de journalisation des opérations lentes ;
- `SLA_MONITOR_BATCH_SIZE` et `OUTBOX_BATCH_SIZE` : tailles bornées des lots de traitements asynchrones ;
- `TICKET_FTS_ENABLED` : activation de la recherche PostgreSQL plein texte ;
- `CACHE_ENABLED`, `REDIS_REST_URL` et `REDIS_REST_TOKEN` : cache distribué facultatif, l’URL et le token Redis devant être fournis ensemble ;
- `OUTBOX_DELIVERY_URL` et `OUTBOX_DELIVERY_TOKEN` : destination facultative des événements d’outbox ;
- `PRIVATE_STORAGE_URL` et `PRIVATE_STORAGE_TOKEN` : passerelle durable privée obligatoire en production pour les pièces jointes ;
- `RUN_DB_TESTS` : activation explicite des tests d’intégration PostgreSQL.

Les paramètres opérationnels sont analysés et bornés par `lib/env.ts`. Une
configuration Redis incomplète, une URL invalide ou une taille de lot hors des
limites acceptées provoque une erreur explicite plutôt qu’un comportement
implicite différent selon le module.

La politique confidentielle, les méthodes/cadences des jobs, la supervision et
la migration du stockage local sont détaillées dans
[`docs/confidential-ticket-operations.md`](docs/confidential-ticket-operations.md).

## Tests et qualité

Le script `npm test` génère automatiquement le client Prisma avant de lancer
Vitest. Pour éviter d’utiliser un client Prisma obsolète lors d’un contrôle de
types isolé, utilisez également la commande `typecheck` plutôt que d’exécuter
`tsc` directement :

```bash
npm run db:generate
npm test
npm run lint
npm run typecheck
npx prisma validate
npm run build
```

Les commandes `npm test` et `npm run typecheck` régénèrent automatiquement le
client Prisma. La commande `npm run validate` enchaîne l’ensemble de la
validation locale dans le bon ordre.

Les tests couvrent les transitions, le routage Wi-Fi, l’auto-attribution, les SLA et le cloisonnement confidentiel. Le test d’intégration PostgreSQL est activé dans la CI avec `RUN_DB_TESTS=1 npm run test` après application des migrations sur une base de test dédiée.

Le workflow `.github/workflows/ci.yml` exécute la validation complète sur chaque
pull request et chaque push vers `main`. Il démarre une base PostgreSQL dédiée,
applique les migrations puis vérifie les tests d’intégration, ESLint, TypeScript,
le schéma Prisma et le build de production. Les valeurs de secrets utilisées par
ce workflow sont exclusivement des valeurs de test, définies dans le job CI.

## Déploiement Vercel

1. Créer une base PostgreSQL managée.
2. Importer le projet dans Vercel.
3. Définir les variables d’environnement de production.
4. Déployer les migrations avant le premier démarrage :

```bash
npx prisma migrate deploy
npx prisma generate
```

5. Configurer l’URI de redirection Entra ID de production.
6. `vercel.json` exécute `/api/jobs/sla-monitor` toutes les quinze minutes. Vercel doit fournir `CRON_SECRET`.

Les notifications e-mail sont modélisées dans la table `Notification` avec le canal `EMAIL`; un worker ou un fournisseur transactionnel peut consommer les entrées `PENDING` sans changer le domaine ticketing.

## Principes de sécurité

- Les API vérifient la session, le statut actif, le rôle et le périmètre côté serveur.
- Les tickets utilisent `requesterId`, `createdById` et `assignedToId`, jamais une adresse e-mail comme clé de droit.
- Un administrateur technique ne voit pas automatiquement les dossiers sensibles.
- Les dossiers confidentiels sont accessibles au demandeur, à l’agent habilité ou à une liste nominative ; un accès exceptionnel est notifié et journalisé.
- La migration crée un trigger PostgreSQL qui interdit la modification et la suppression de `AuditLog`.
- Les fichiers `.env.local`, les secrets, les mots de passe et `node_modules` sont exclus du dépôt.

Voir [docs/architecture.md](docs/architecture.md) pour l’architecture, la matrice des rôles, le workflow et le modèle de données.

Voir [docs/auth-review.md](docs/auth-review.md) pour la revue détaillée de l’erreur d’authentification, la procédure de migration et le diagnostic des erreurs OAuth.
