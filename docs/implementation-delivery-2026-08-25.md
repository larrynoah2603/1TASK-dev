# Livraison professionnelle 1TASK — 2026-08-25

## Résumé

La demande du prompt validé a été implémentée progressivement dans le workspace 1TASK. Les changements protègent les Actifs, rendent la création de ticket résistante aux retries, renforcent la cohérence des notifications de file, contrôlent les Worklogs et maintiennent une stratégie sans polling RSC périodique lourd.

Le workspace traité est la version locale sans polling global. Aucun accès Microsoft Entra ID, callback NextAuth, secret ou donnée Neon n’a été modifié. La migration Prisma est préparée mais n’a pas été appliquée à Neon depuis ce sandbox, car aucune `DATABASE_URL` de production n’est présente ici.

## Fonctionnalités implémentées

| Domaine | Résultat |
|---|---|
| Actifs | Seul `FUNCTIONAL_ADMIN` global peut lister, ouvrir, créer et déplacer un Actif. |
| Permissions runtime | `asset:read` et `asset:manage` retirées de `AGENT`, `QUEUE_MANAGER` et `TECHNICAL_ADMIN`. |
| Navigation | Le lien Actifs est visible uniquement à l’administrateur fonctionnel global. |
| Accès direct | `/assets/[id]` redirige les profils non autorisés ; les services backend renvoient une autorisation refusée. |
| Création ticket | Token idempotent validé, conservé par le formulaire et persisté par créateur. |
| Timeout | Un retry utilisant le même token retourne le même ticket au lieu d’en créer un second. |
| Notification file | Destinataires limités aux comptes actifs, non désactivés, compatibles avec la file et possédant le rôle approprié. |
| Worklog | Imputation limitée à l’agent affecté, au responsable habilité de la file ou à l’administrateur fonctionnel global. |
| Notifications UI | Chargement ponctuel à l’ouverture et actualisation manuelle bornée à 8 secondes. |
| Polling | Aucun `setInterval` ni `router.refresh()` périodique global dans le workspace livré. |
| Audit | Les audits existants des tickets, mouvements d’Actifs et Worklogs sont conservés. |

## Fichiers principaux modifiés

| Fichier | Rôle |
|---|---|
| `lib/asset-access.ts` | Nouveau helper central `isFunctionalAssetAdministrator` / `assertFunctionalAssetAdministrator`. |
| `lib/identity.ts` | Matrice runtime des permissions corrigée et exportée pour test. |
| `lib/production-service.ts` | Garde Actifs et contrôle Worklogs renforcés. |
| `app/(app)/assets/page.tsx` | Accès liste réservé au global functional admin. |
| `app/(app)/assets/[id]/page.tsx` | Accès fiche directe réservé au global functional admin. |
| `components/app-shell.tsx` | Sidebar Actifs alignée sur la règle globale. |
| `prisma/schema.prisma` | Ajout nullable de `Ticket.creationIdempotencyToken` et contrainte composite. |
| `prisma/migrations/20260825090000_add_ticket_creation_idempotency/migration.sql` | Migration additive de la clé de retry. |
| `lib/validation.ts` | Validation stricte du token idempotent. |
| `lib/ticket-service.ts` | Détection du ticket existant et récupération après conflit Prisma P2002. |
| `components/new-ticket-form.tsx` | Token stable par formulaire et message de retry explicite. |
| `lib/client-http.ts` | Helper client de requête bornée par timeout. |
| `components/notification-center.tsx` | Chargement ponctuel avec timeout 8 secondes. |
| `components/notification-list.tsx` | Bouton Actualiser avec timeout 8 secondes. |
| `tests/assets-security.test.ts` | Tests fonctionnels global/scoped/opérationnels/techniques. |
| `tests/validation.test.ts` | Tests du token idempotent. |
| `tests/prompt8-final-validation.test.ts` | Contrats de routage, notification, Worklog et absence de polling. |
| `docs/changelog.md` | Versions 0.9.1 et 0.9.2. |
| `docs/implementation-impact-v0.9.1.md` | Plan d’impact et critères d’acceptation. |

## Validation exécutée

| Commande | Résultat |
|---|---|
| `npm test` | **98 tests passés, 3 tests d’intégration ignorés** au dernier contrôle complet. |
| `npm run typecheck` | **OK**. |
| `npm run lint` | **0 erreur, 3 warnings historiques** liés à `<img>` dans profile/app-shell/profile-menu. |
| `DATABASE_URL=... npx prisma validate` | **Schéma Prisma valide** avec URL de validation locale non connectée. |
| `npm run build` | **Build Next.js de production OK**, routes générées sans erreur. |

Les tests d’intégration Neon restent ignorés par défaut (`RUN_DB_TESTS`), car ils nécessitent une vraie base et de vrais comptes configurés.

## Migration Neon à appliquer

La seule migration nouvelle est :

```text
prisma/migrations/20260825090000_add_ticket_creation_idempotency/migration.sql
```

Elle ajoute une colonne nullable et un index unique composite :

```sql
ALTER TABLE "Ticket" ADD COLUMN "creationIdempotencyToken" TEXT;

CREATE UNIQUE INDEX "Ticket_createdById_creationIdempotencyToken_key"
  ON "Ticket"("createdById", "creationIdempotencyToken");
```

Ne pas utiliser `prisma db push` et ne pas utiliser `prisma migrate reset`.

## Procédure Windows recommandée

Depuis le dossier réel du projet :

```powershell
cd C:\1task

# 1. Sauvegarder l’état actuel
Copy-Item -Recurse -Force . C:\1task-backup-before-v0.9.1

# 2. Copier le contenu de l’archive en conservant .env.local et les secrets existants
#    Ne pas remplacer les fichiers .env.local avec une archive publique.

# 3. Installer les dépendances
npm ci --no-audit --no-fund

# 4. Générer le client Prisma
npx prisma generate

# 5. Vérifier les migrations sans modifier les données
npx prisma migrate status

# 6. Appliquer les migrations sur la base Neon configurée
npx prisma migrate deploy

# 7. Validation locale complète
npm run validate
```

Avant `migrate deploy`, vérifier que `DATABASE_URL` pointe vers la bonne branche Neon et que `DIRECT_URL` est disponible si le projet l’utilise pour les migrations. Ne pas copier un secret dans GitHub, une archive publique ou un fichier de documentation.

## Vérifications manuelles minimales

| Profil | Test | Résultat attendu |
|---|---|---|
| `FUNCTIONAL_ADMIN` | Ouvrir `/assets` | Liste visible. |
| `FUNCTIONAL_ADMIN` | Créer puis déplacer un Actif | Succès, mouvements et audit visibles. |
| `AGENT` | Ouvrir `/assets` directement | Redirection ou 403, aucun actif chargé. |
| `QUEUE_MANAGER` | Appeler `/api/production/assets` | 403. |
| `TECHNICAL_ADMIN` | Créer ou déplacer un Actif | 403. |
| REQUESTER IT | Créer un ticket vers ADM avec saisie libre | Ticket routé vers `TRIAGE-ADM`, statut `TO_QUALIFY`. |
| Agent ADM actif | Ouvrir la Boîte agent | Ticket visible seulement si membre actif de la file. |
| Agent IT hors périmètre | Ouvrir la référence du ticket ADM | 403 ou 404. |
| Créateur ticket | Double-cliquer ou réessayer après timeout | Une seule référence ticket. |
| Agent affecté | Créer un Worklog | Succès. |
| Agent non affecté | Créer un Worklog sur le même ticket | Refus. |
| Notifications | Ouvrir le centre puis Actualiser | Requête bornée ; aucun rafraîchissement périodique lourd. |

## Limites transparentes

La détection d’idempotence est active pour les nouvelles soumissions qui transmettent un token. Les anciens clients ou formulaires qui n’envoient pas de token restent compatibles, mais ne bénéficient pas de la protection contre un double retry. Le formulaire livré transmet automatiquement le token.

La migration n’est pas appliquée à Neon dans le sandbox. Elle doit être déployée depuis la machine du projet après vérification de la branche Neon et avant un test réel de timeout/double-clic.

Le workspace livré ne contient pas le composant `AutoRefresh` périodique. Il ne faut pas recopier ensuite l’ancienne version de polling par-dessus les fichiers corrigés sans décision spécifique et tests de charge.

## Changelog

- `v0.9.1` : Actifs réservés à `FUNCTIONAL_ADMIN` global.
- `v0.9.2` : idempotence de création, filtrage notification/file, Worklog borné, notifications sans polling périodique lourd.
