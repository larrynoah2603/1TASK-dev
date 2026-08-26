# Livraison 1TASK — version sans polling et tests réels Neon

## Contenu de cette version

Cette archive conserve le workflow saisie libre + triage, l’administration, la fiche ticket, les permissions, le routage et le cloisonnement. Elle retire le rafraîchissement automatique des pages et remplace le rafraîchissement périodique des notifications par une action manuelle « Actualiser ».

Aucune modification n’est apportée à Microsoft Entra ID, aux rôles, aux permissions, au SLA, aux tables d’audit ou aux tickets historiques.

## Fichiers liés à la suppression du polling

Les composants suivants ne sont pas inclus ou ne montent plus d’intervalle automatique :

```text
components/auto-refresh.tsx
app/(app)/inbox/page.tsx
app/(app)/tickets/[id]/page.tsx
app/(app)/dashboard/responsible/page.tsx
app/(app)/missions/page.tsx
components/notification-center.tsx
components/notification-list.tsx
```

La navigation et les mutations continuent à rafraîchir l’écran lorsque l’utilisateur effectue une action. L’utilisateur peut recharger une page avec le navigateur et actualiser manuellement la liste complète des notifications.

## Préparer une seconde base Neon

Ne réutilisez pas les identifiants de la première base. Dans la seconde machine, configurez les variables dans PowerShell uniquement pour la session courante :

```powershell
$env:DATABASE_URL="URL_POOLER_DE_LA_SECONDE_BASE_NEON"
$env:DIRECT_URL="URL_DIRECTE_DE_LA_SECONDE_BASE_NEON"
```

Ne commitez jamais ces valeurs dans `.env`, GitHub ou l’archive.

Appliquer le schéma et les migrations :

```powershell
cd C:\1task
npx prisma generate
npx prisma migrate deploy
```

La migration saisie libre attendue est :

```text
20260821130000_add_requested_service
```

## Préparer l’organisation sans utiliser un faux compte

Les utilisateurs de test doivent être créés par une vraie connexion Microsoft Entra ID. Ne créez pas de faux utilisateurs avec un mot de passe SQL.

1. Connecter le premier compte réel avec Microsoft Entra ID.
2. Se connecter avec le compte administrateur fonctionnel.
3. Affecter au demandeur un département source, par exemple IT, et le rôle `REQUESTER`.
4. Connecter le deuxième compte réel avec Microsoft Entra ID.
5. Affecter l’agent au département cible ADM, au rôle `AGENT`, à une file ADM et à une équipe ADM active.
6. Vérifier que le `TeamMember` de l’agent est actif.
7. Vérifier que les files `TRIAGE-*` et leurs services existent dans la base.

Le fichier `docs/sql/real-test-neon-checklist.sql` contient uniquement des contrôles et des requêtes de vérification. Il ne crée pas de données et ne supprime rien. Le fichier `docs/sql/seed-triage-services-neon.sql` est séparé : il sert uniquement à préparer les files et services TRIAGE si la seconde base Neon ne les possède pas encore. Ne l’exécutez qu’après avoir vérifié leur absence.

## Test réel demandeur vers agent

Utiliser un titre unique, par exemple :

```text
REAL-TEST-IT-ADM-20260824-001
```

Dans l’application :

```text
Nouveau ticket
Besoin demandé : Création d’un compte client
Département cible : ADM
Nature : Demande de service
Créer
```

Le résultat attendu est :

```text
requestedService : Création d’un compte client
queueCode        : TRIAGE-ADM
status           : NEW ou TO_QUALIFY selon la transition affichée
```

Ouvrir ensuite la boîte agent du compte ADM et réinitialiser les filtres. L’agent doit voir le ticket dans son périmètre.

## Test de cloisonnement

Avec un agent IT qui n’est pas membre de l’équipe ADM :

```text
Le ticket TRIAGE-ADM ne doit pas apparaître dans /inbox.
L’ouverture directe de la fiche doit être refusée.
```

Avec le demandeur réel :

```text
Le ticket qu’il a créé doit rester visible dans ses tickets.
Les commentaires internes ne doivent pas être visibles.
```

## Vérification après le test

Dans Neon SQL Editor, exécuter le contenu de :

```text
docs/sql/real-test-neon-checklist.sql
```

La requête 10 vérifie les tickets créés dans les deux dernières heures. La requête 11 vérifie une référence précise. Les requêtes 12 et 13 vérifient l’historique et les notifications. La requête 14 vérifie le périmètre de l’agent.

## Publication GitHub

Après validation locale :

```powershell
npm run typecheck
npm test
npm run lint
npm run build

git status --short
git add -- .
git diff --cached --stat
git commit -m "Remove polling and add real Neon test checklist"
git pull --rebase origin main
git push origin main
```

Avant `git add -- .`, vérifier que `.env`, `.env.local`, `node_modules`, `.next` et les fichiers secrets sont ignorés. Si le dépôt contient des changements d’une autre fonctionnalité, utiliser une liste de fichiers explicite.

## Publication Vercel

Après le push, attendre le déploiement lié au dernier commit et vérifier l’état `Ready`. Effectuer ensuite une nouvelle connexion et utiliser le rechargement manuel du navigateur. Il n’y a plus d’actualisation automatique toutes les 5 ou 15 secondes.
