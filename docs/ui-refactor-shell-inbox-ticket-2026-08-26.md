# Livraison UI ciblée — Shell, boîte agent et détail ticket

## Périmètre

Cette itération refond uniquement trois zones visibles de 1TASK : le shell global et sa navigation, la boîte agent `/inbox`, ainsi que le détail ticket `/tickets/[id]`. Les écrans Clients, Dossiers clients, Missions, Actifs, Base de connaissances, Reporting et Administration n’ont pas été reconstruits dans cette étape.

## Direction visuelle

La couche visuelle introduit une console d’opérations sombre à dominante noire et graphite. Les surfaces utilisent `#080808`, `#0b0b0a`, `#111110`, `#171716` et `#1e1e1c`. Les accents sont limités au champagne pour l’action et la navigation active, à la menthe pour les états conformes, à l’ambre pour l’attention et au corail pour les risques. Aucun bleu, cyan, indigo, violet ou lavande n’est utilisé dans le rendu sombre ciblé.

Le shell conserve la navigation fixe, la recherche globale, les notifications, le profil, le bouton de création et la réduction responsive de la barre latérale. Les liens actifs sont signalés par une règle champagne et non par une surface colorée excessive. La densité a été réduite pour rapprocher l’interface d’une console éditoriale professionnelle plutôt que d’un template SaaS.

## Modifications techniques

| Fichier | Modification | Logique métier modifiée |
|---|---|---|
| `app/globals.css` | Ajout d’une couche finale de tokens et d’overrides ciblés pour shell, inbox et ticket detail | Non |
| `components/theme-toggle.tsx` | Mode sombre par défaut ; le basculement clair/sombre reste disponible | Non |
| `components/status-badge.tsx` | Badges sémantiques indépendants des classes bleu/indigo/cyan | Non |
| `components/app-shell.tsx` | Compteur de notifications rendu avec une classe sémantique neutre | Non |
| `components/dashboard-visuals.tsx` | Couleurs de priorité réorientées vers menthe/champagne/ambre/corail ; suppression d’une constante inutilisée | Non |
| `app/(app)/inbox/page.tsx` | Aucun changement fonctionnel dans cette itération | Non |
| `app/(app)/tickets/[id]/page.tsx` | Aucun changement fonctionnel dans cette itération | Non |
| `components/ticket-actions.tsx` | Aucun changement de comportement ; les anciennes surfaces sont neutralisées par l’override ciblé | Non |
| `components/ticket-advanced-panels.tsx` | Aucun changement de comportement ; les anciennes surfaces sont neutralisées par l’override ciblé | Non |

## Garanties conservées

Les permissions, le cloisonnement par département, file, équipe et périmètre, le routage inter-départements, le triage, les transitions de ticket, l’historique append-only, les calculs SLA, les appels API, Microsoft Entra ID, NextAuth, Prisma, Neon et le système de notifications ne sont pas modifiés.

La refonte est CSS-first afin de limiter le risque fonctionnel. Les composants d’actions du détail ticket conservent leurs POST vers `/claim`, `/transition`, `/assign`, `/queue`, `/qualification`, `/sla-exception`, `/links` et `/attachments`. Les panneaux restent repliables et accessibles au clavier.

## Validation locale

Validation effectuée avec une `DATABASE_URL` factice de sandbox :

```text
npm run typecheck : réussi
npm test : 104 tests réussis, 3 tests d’intégration ignorés
npm run lint : 0 erreur, 3 warnings historiques no-img-element
npm run build : réussi
```

Les warnings ESLint concernent uniquement les images de profil existantes dans `profile/page.tsx`, `app-shell.tsx` et `profile-menu.tsx`. Ils ne proviennent pas de la refonte ciblée.

## Déploiement prudent

Cette livraison ne nécessite aucune migration Prisma, aucune commande Neon et aucun changement de variable d’environnement. Dans le dépôt réel, intégrer les fichiers ciblés, lancer les quatre validations, puis effectuer un commit séparé. Après déploiement Vercel, vérifier que le commit final est `Ready` avant de comparer les temps d’ouverture de `/inbox` et `/tickets/[id]` avec l’ancienne version.

La mesure de performance doit être faite après authentification réelle, en comparant le document request et les logs Runtime `[perf]`. Une amélioration visuelle ne doit pas être considérée comme une preuve de réduction de latence serveur sans mesure Vercel/Neon.
