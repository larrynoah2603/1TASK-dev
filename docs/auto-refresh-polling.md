# Actualisation automatique 1TASK

## Configuration retenue

1TASK utilise un polling côté navigateur, sans service externe. Les données restent filtrées par les contrôles serveur habituels ; le polling ne donne aucun accès supplémentaire à un utilisateur.

| Écran | Intervalle | Mécanisme |
|---|---:|---|
| `/inbox` | 15 secondes | `router.refresh()` des Server Components, uniquement quand l’onglet est visible. |
| `/tickets/[id]` | 15 secondes | `router.refresh()` de la fiche, timeline, SLA et actions visibles, avec garde anti-chevauchement. |
| Centre de notifications | 15 secondes | `GET /api/notifications?take=8`, compteur non lu et liste locale. |
| `/notifications` | 15 secondes | Relecture ciblée de la liste via l’API notifications, sans requête concurrente. |
| `/dashboard/responsible` | 15 secondes | `router.refresh()` des indicateurs et du portefeuille. |
| `/missions` | 30 secondes | `router.refresh()` de la liste, avec conservation de la vue et des filtres locaux. |

Le composant `components/auto-refresh.tsx` n’actualise que les onglets visibles, ignore les requêtes concurrentes, temporise les retours de focus et utilise quinze secondes comme intervalle par défaut. Il n’effectue pas de rechargement complet du document : Next.js rafraîchit les Server Components dans la navigation courante.

## Effet après la création d’un ticket

Après le `POST /api/tickets`, le demandeur est redirigé vers sa fiche. Un agent qui garde `/inbox` ouvert voit le nouveau ticket au prochain cycle de quinze secondes si le ticket appartient à son périmètre autorisé. Les mutations appellent toujours `router.refresh()` immédiatement ; le polling est seulement un filet de sécurité.

## Limites et protection contre la surcharge

Le polling est limité aux onglets visibles, les retours de focus sont débouncés et les requêtes concurrentes sont ignorées. Les permissions sont recalculées côté serveur à chaque requête. Il ne faut pas utiliser quinze secondes pour des listes volumineuses sans pagination. Si le nombre d’utilisateurs augmente fortement, passer à un endpoint léger `updatedSince` ou à une solution SSE/WebSocket managée.

Le compteur des notifications est calculé côté serveur par l’API, au lieu d’être déduit uniquement des huit éléments affichés dans le popover. Le serveur reste donc la source de vérité.

## Validation

Les contrôles exécutés après l’intégration sont :

```bash
npm run lint
npm run typecheck
npm test
npm run build
```

Résultat attendu : 86 tests réussis, 3 tests d’intégration ignorés comme dans la baseline, lint réussi, typage réussi et build réussi.
