# Livraison UI — Notifications, Profil et Accès en attente

## Périmètre

Cette itération applique la direction sombre de 1TASK aux écrans Notifications, Profil et Accès en attente. Les modules Base de connaissances, Actifs, Pilotage SLA, Reporting et Administration ne sont pas modifiés.

## Résultat visuel

Les écrans utilisent la console noire existante : fond quasi noir, surfaces graphite, séparateurs fins, texte ivoire, actions champagne, états conformes menthe, attention ambre et risque corail. Les accents bleu, cyan, indigo, violet et lavande sont neutralisés dans les zones ciblées.

La page Notifications conserve son fil chronologique, son actualisation manuelle, le marquage individuel et le marquage global comme lu. Elle reçoit une hiérarchie plus éditoriale : élément non lu mis en évidence par un point champagne, élément lu atténué, titre et cible ticket lisibles, et boutons d’action sobres.

La page Profil reste en lecture seule. Elle conserve l’identité fournie par Microsoft Entra ID, les informations de département, manager, équipe, file et rôles. Seule sa présentation est modifiée : avatar neutre champagne, panneau de lecture organisé et surfaces graphite.

L’écran Accès en attente reste une page de validation administrative. Il conserve la redirection vers `/signin`, la redirection vers `/dashboard` pour les comptes actifs et le bouton de déconnexion. Son apparence est simplement harmonisée avec la console noire.

## Fichiers modifiés

| Fichier | Modification | Logique métier modifiée |
|---|---|---|
| `app/globals.css` | Tokens et styles ciblés Notifications, Profil et Accès en attente | Non |
| `app/(app)/notifications/page.tsx` | Ajout d’une classe de portée pour la page | Non |
| `app/(app)/profile/page.tsx` | Ajout d’une classe de portée pour le thème visuel | Non |
| `app/pending-assignment/page.tsx` | Ajout d’une classe de portée pour l’état administratif | Non |
| `docs/ui-refactor-notifications-profile-pending-2026-08-26.md` | Rapport de livraison | Non |

Les composants `notification-list.tsx`, `notification-center.tsx`, `profile-menu.tsx` et le service de notifications conservent leurs interactions existantes. La refonte s’appuie sur leurs classes déjà présentes et n’ajoute aucune route ni aucun appel réseau.

## Garanties conservées

Microsoft Entra ID, NextAuth, les callbacks, les sessions, les permissions, le statut pending, le cloisonnement, le système de notifications et les API `/api/notifications/*` ne sont pas modifiés. Aucun schéma Prisma, aucune migration, aucun seed, aucune variable Neon ou Vercel ne sont nécessaires.

Le polling lourd, le SSE et le cron Vercel fréquent ne sont pas introduits. Le fichier `vercel.json` ne doit pas être recréé sur le plan Hobby.

## Validation locale

La validation a été exécutée avec une `DATABASE_URL` factice de sandbox :

```text
npm run typecheck : réussi
npm test : 104 tests réussis, 3 tests d’intégration ignorés
npm run lint : 0 erreur, 3 warnings historiques no-img-element
npm run build : réussi
```

Les trois avertissements ESLint concernent les images de profil existantes dans `profile/page.tsx`, `components/app-shell.tsx` et `components/profile-menu.tsx`. Ils ne sont pas introduits par les changements fonctionnels de cette itération.

## Vérifications après intégration

Après copie dans `C:\1task`, vérifier les routes suivantes avec un compte actif et un compte en attente :

```text
/notifications
/profile
/pending-assignment
```

Vérifier ensuite le menu profil dans la barre supérieure, l’ouverture d’une notification liée à un ticket, le marquage individuel, le marquage global et la déconnexion. Pour le compte en attente, vérifier qu’aucun accès au tableau de bord n’est ajouté par erreur.

La prochaine étape de refonte reste la Base de connaissances. Elle devra être livrée dans un commit distinct après validation de ce groupe.
