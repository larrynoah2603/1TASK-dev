# Actualisation automatique 1TASK

## Configuration retenue

1TASK utilise un polling côté navigateur, sans service externe. Les données restent filtrées par les contrôles serveur habituels ; le polling ne donne aucun accès supplémentaire à un utilisateur.

| Écran | Intervalle | Mécanisme |
|---|---:|---|
| `/inbox` | 5 secondes | `router.refresh()` des Server Components. |
| `/tickets/[id]` | 5 secondes | `router.refresh()` de la fiche, timeline, SLA et actions visibles. |
| Centre de notifications | 5 secondes | `GET /api/notifications?take=8`, compteur non lu et liste locale. |
| `/notifications` | 5 secondes | Relecture ciblée de la liste via l’API notifications. |
| `/dashboard/responsible` | 15 secondes | `router.refresh()` des indicateurs et du portefeuille. |
| `/missions` | 30 secondes | `router.refresh()` de la liste, avec conservation de la vue et des filtres locaux. |

Le composant `components/auto-refresh.tsx` arrête les requêtes lorsque l’onglet n’est pas visible et relance une lecture lors du retour sur l’onglet ou du focus de la fenêtre. Il n’effectue pas de rechargement complet du document : Next.js rafraîchit les Server Components dans la navigation courante.

## Effet après la création d’un ticket

Après le `POST /api/tickets`, le demandeur est redirigé vers sa fiche. Un agent qui garde `/inbox` ouvert voit le nouveau ticket au prochain cycle de cinq secondes si le ticket appartient à son périmètre autorisé. Une modification faite par un autre agent sur une fiche ouverte apparaît également au cycle suivant.

## Limites et protection contre la surcharge

Le polling est limité aux onglets visibles, et les permissions sont recalculées côté serveur à chaque requête. Il ne faut pas utiliser cinq secondes pour des listes volumineuses sans pagination. Si le nombre d’utilisateurs augmente fortement, passer à un endpoint léger `updatedSince` ou à une solution SSE/WebSocket managée.

Le compteur des notifications est calculé côté serveur par l’API, au lieu d’être déduit uniquement des huit éléments affichés dans le popover. Le serveur reste donc la source de vérité.

## Validation

Les contrôles exécutés après l’intégration sont :

```bash
npm run lint
npm run typecheck
npm test
npm run build
```

Résultat attendu : 85 tests réussis, 3 tests d’intégration ignorés comme dans la baseline, lint réussi, typage réussi et build réussi.
