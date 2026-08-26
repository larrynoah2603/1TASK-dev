# Livraison UI portefeuille — Clients, Dossiers clients et Missions

## Périmètre

Cette itération étend la direction noire de 1TASK aux listes et détails des modules Clients, Dossiers clients et Missions. Elle ne modifie pas les Actifs, la Base de connaissances, le Pilotage SLA, le Reporting, les Notifications, l’Administration ou le Profil.

## Direction visuelle

Les pages portefeuille utilisent la console noire déjà appliquée au shell, à la boîte agent et au détail ticket. Les surfaces principales sont noires et graphite, les textes sont ivoire et les accents sont limités au champagne, à la menthe, à l’ambre et au corail. Les liens legacy bleu/indigo présents dans les classes JSX sont neutralisés par une couche de portée portefeuille ; ils apparaissent champagne dans le thème sombre.

La liste de chaque module conserve sa densité métier, sa recherche, ses filtres, sa pagination ou son mode de vue existant. Les détails conservent les relations client–dossier–mission–ticket et utilisent des surfaces plus lisibles, des séparateurs fins et des rails contextuels réutilisables.

## Fichiers modifiés

| Fichier | Rôle de la modification | API ou logique métier modifiée |
|---|---|---|
| `app/globals.css` | Tokens et couche visuelle ciblée portefeuille | Non |
| `app/(app)/clients/page.tsx` | Classe de portée visuelle | Non |
| `app/(app)/clients/[id]/page.tsx` | Classe de portée détail Client | Non |
| `components/client-list-client.tsx` | Rendu couvert par les styles portefeuille existants | Non |
| `app/(app)/dossiers/page.tsx` | Classe de portée visuelle | Non |
| `app/(app)/dossiers/[id]/page.tsx` | Classe de portée détail Dossier | Non |
| `components/dossier-list-client.tsx` | Rendu couvert par les styles portefeuille existants | Non |
| `app/(app)/missions/page.tsx` | Classe de portée visuelle | Non |
| `app/(app)/missions/[id]/page.tsx` | Classe de portée détail Mission | Non |
| `components/mission-list-client.tsx` | Rendu couvert par les styles portefeuille existants | Non |
| `components/dashboard-visuals.tsx` | Couleurs de priorité cohérentes avec la palette noire | Non |
| `docs/ui-refactor-portfolio-2026-08-26.md` | Rapport de livraison | Non |

## Comportements conservés

Les contrôles `portfolio:read` et `portfolio:manage`, le cloisonnement par département et périmètre, les accès aux clients, dossiers, missions et tickets liés, les appels API de création et de clôture, les worklogs, les relations Prisma, l’authentification Microsoft Entra ID, NextAuth, le SLA, les audits et Neon restent inchangés.

Aucune migration, aucun seed, aucun endpoint et aucune structure Prisma ne sont requis pour cette itération. La transformation est CSS-first, avec des classes de portée sur les pages afin de ne pas appliquer la palette portefeuille par erreur aux autres domaines.

## Validation locale

La validation a été exécutée avec une `DATABASE_URL` factice de sandbox :

```text
npm run typecheck : réussi
npm test : 104 tests réussis, 3 tests d’intégration ignorés
npm run lint : 0 erreur, 3 warnings historiques no-img-element
npm run build : réussi
```

Les trois warnings ESLint concernent les images de profil existantes dans `profile/page.tsx`, `components/app-shell.tsx` et `components/profile-menu.tsx`. Ils ne sont pas introduits par cette itération.

## Procédure d’intégration

Copier les fichiers de l’archive dans le dépôt réel `C:\1task`, sans copier `.env.local`, `node_modules` ou `.next`. Exécuter les validations localement, contrôler `git diff --check` et faire un commit séparé avant de pousser vers GitHub. Ne pas modifier `prisma/schema.prisma`, les migrations, les variables Vercel/Neon ou `vercel.json`.

Après déploiement, vérifier visuellement :

```text
/clients
/clients/[id]
/dossiers
/dossiers/[id]
/missions
/missions/[id]
```

La mesure de latence doit être réalisée séparément dans les logs Vercel ; la refonte visuelle ne constitue pas à elle seule une preuve de performance serveur.
