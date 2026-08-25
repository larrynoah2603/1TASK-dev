# Livraison — saisie libre, triage et polling optimisé

## Fonction livrée

Le formulaire de nouveau ticket ne dépend plus du choix d’un service catalogue par le demandeur. L’utilisateur saisit son besoin, choisit un département cible et une nature. Le backend route ensuite la demande vers le service technique `TRIAGE-{CODE}` et la file de triage correspondante.

Le catalogue métier reste utilisé pour les tickets historiques et pour le rattachement réalisé après qualification par l’agent. Le demandeur ne reçoit pas `catalog:propose` et ne peut pas créer ou publier un catalogue.

## Fichiers modifiés

```text
components/new-ticket-form.tsx
lib/validation.ts
lib/ticket-service.ts
prisma/schema.prisma
prisma/migrations/20260821130000_add_requested_service/migration.sql
prisma/seed.ts
app/api/departments/route.ts
components/auto-refresh.tsx
components/notification-center.tsx
components/notification-list.tsx
app/(app)/inbox/page.tsx
app/(app)/tickets/[id]/page.tsx
app/globals.css

tests/prompt8-final-validation.test.ts
```

## Avant le premier test

Créer ou vérifier les files et services de triage. Sur une base de développement, utiliser :

```powershell
npx prisma migrate deploy
npm run db:seed
```

Le seed crée les services `TRIAGE-EXP`, `TRIAGE-SOCIAL`, `TRIAGE-JUR`, `TRIAGE-AUDIT`, `TRIAGE-IT`, `TRIAGE-RH`, `TRIAGE-ADM`, `TRIAGE-ACCUEIL` et `TRIAGE-DIR`, avec leur file et leur équipe.

Sur la base Neon existante, ne pas lancer un seed de démonstration sans vérifier son contenu. Appliquer d’abord la migration :

```powershell
$env:DATABASE_URL="URL_NEON_POOLER"
$env:DIRECT_URL="URL_NEON_DIRECTE"
npx prisma migrate deploy
```

Ensuite, exécuter le seed uniquement si les données de démonstration peuvent être ajoutées ou mises à jour. Vérifier que chaque département cible possède une file `TRIAGE-{CODE}`, une équipe active et au moins un membre actif pour que les notifications et `/inbox` correspondent.

## Test manuel

1. Connecter un utilisateur `REQUESTER` actif.
2. Ouvrir **Nouveau ticket**.
3. Saisir un besoin, par exemple `Création d’un compte client`.
4. Choisir le département cible `ADM` avec le Combobox personnalisé.
5. Choisir la nature `Demande de service`.
6. Compléter l’objet et la description.
7. Prévisualiser puis confirmer.
8. Vérifier que le ticket affiche `À qualifier`, `Triage ADM` et une notification de file.
9. Se connecter avec un agent ADM membre actif de l’équipe `Équipe triage ADM`.
10. Ouvrir `/inbox`, choisir `Tous les tickets visibles` ou `Non affectés`, puis qualifier le ticket.
11. Vérifier qu’un agent IT sans scope ADM ne voit pas le ticket ADM.

## Polling

La version livrée dans ce workspace n’utilise plus de polling RSC périodique global. Elle est adaptée à Vercel sans connexion persistante : les mutations appellent `router.refresh()` seulement après une action réussie, et l’écran Notifications propose une actualisation manuelle bornée à 8 secondes.

```text
mutation réussie       refresh ciblé de l’écran courant
notifications ouvertes chargement ponctuel borné à 8 secondes
centre Notifications   pas de setInterval
Boîte agent            pas de router.refresh() périodique
Fiche ticket           pas de router.refresh() périodique
```

Cette stratégie évite qu’un polling de plusieurs pages consomme inutilement Neon et Vercel. Une évolution ultérieure pourra ajouter un endpoint delta `updatedSince` ou un canal SSE/WebSocket managé après mesure des durées réelles et validation de la charge. Il ne faut pas réintroduire un rafraîchissement complet fréquent des Server Components sans métriques.

## Validation locale

```powershell
cd C:\1task
npx prisma generate
npm run typecheck
npm test
npm run lint
npm run build
```

Le lint peut conserver les trois avertissements existants liés aux balises `<img>` dans le profil et l’app-shell. Ils ne bloquent pas le build.

## Publication GitHub

```powershell
cd C:\1task
git status --short
git add components/new-ticket-form.tsx lib/validation.ts lib/ticket-service.ts prisma/schema.prisma prisma/migrations/20260821130000_add_requested_service/migration.sql prisma/seed.ts app/api/departments/route.ts components/auto-refresh.tsx components/notification-center.tsx components/notification-list.tsx "app/(app)/inbox/page.tsx" "app/(app)/tickets/[id]/page.tsx" app/globals.css tests/prompt8-final-validation.test.ts docs

git diff --cached --stat
git commit -m "Add free text ticket triage and optimize polling"
git pull --rebase origin main
git push origin main
```

Ne pas utiliser `git reset --hard` ni `git push --force`. Si le pull signale des modifications non indexées, examiner `git status --short` avant toute décision.
