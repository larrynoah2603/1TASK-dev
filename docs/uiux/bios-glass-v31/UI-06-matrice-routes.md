# UI-06 — Matrice exhaustive des points d’entrée

Date : 14 octobre 2026. Inventaire de tous les fichiers `app/**/page.tsx` de la livraison.
Les API ne sont pas des écrans. Les modales, menus, chargements et variantes par rôle
sont recensés par famille dans le rapport UI-06. La présence dans ce tableau ne signifie
pas qu’un écran authentifié a été ouvert. Les dispositions V1 viennent de
`lib/product-policy.ts` et des gardes observées dans les pages et layouts.

| Route | Disposition observée dans le code | Résultat réel | Source |
|---|---|---|---|
| `/asset-requests` | Redirection V1 → /admin/asset-requests | Contrôle du code de redirection ; navigation non certifiée | `app/(app)/asset-requests/page.tsx` |
| `/assets/[id]` | Redirection V1 → /admin/assets/[id] | Contrôle du code de redirection ; navigation non certifiée | `app/(app)/assets/[id]/page.tsx` |
| `/assets` | Redirection V1 → /admin/assets | Contrôle du code de redirection ; navigation non certifiée | `app/(app)/assets/page.tsx` |
| `/audit` | Redirection V1 → /admin/audit | Contrôle du code de redirection ; navigation non certifiée | `app/(app)/audit/page.tsx` |
| `/clients/[id]` | Fonction désactivée en V1 | Garde de capacité présente dans le code ; rendu hors périmètre V1 | `app/(app)/clients/[id]/page.tsx` |
| `/clients` | Fonction désactivée en V1 | Garde de capacité présente dans le code ; rendu hors périmètre V1 | `app/(app)/clients/page.tsx` |
| `/dashboard/operations` | Redirection V1 → /inbox | Contrôle du code de redirection ; navigation non certifiée | `app/(app)/dashboard/operations/page.tsx` |
| `/dashboard` | V1 — authentification et droits requis | Rendu non testé : session de recette absente | `app/(app)/dashboard/page.tsx` |
| `/dashboard/responsible` | Redirection V1 → /reporting selon rôle et paramètres | Contrôle du code de redirection ; navigation non certifiée | `app/(app)/dashboard/responsible/page.tsx` |
| `/dossiers/[id]` | Fonction désactivée en V1 | Garde de capacité présente dans le code ; rendu hors périmètre V1 | `app/(app)/dossiers/[id]/page.tsx` |
| `/dossiers` | Fonction désactivée en V1 | Garde de capacité présente dans le code ; rendu hors périmètre V1 | `app/(app)/dossiers/page.tsx` |
| `/inbox` | V1 — authentification et droits requis | Rendu non testé : session de recette absente | `app/(app)/inbox/page.tsx` |
| `/knowledge` | Fonction désactivée en V1 | Garde de capacité présente dans le code ; rendu hors périmètre V1 | `app/(app)/knowledge/page.tsx` |
| `/missions/[id]` | Fonction désactivée en V1 | Garde de capacité présente dans le code ; rendu hors périmètre V1 | `app/(app)/missions/[id]/page.tsx` |
| `/missions` | Fonction désactivée en V1 | Garde de capacité présente dans le code ; rendu hors périmètre V1 | `app/(app)/missions/page.tsx` |
| `/my-assets` | V1 — authentification et droits requis | Rendu non testé : session de recette absente | `app/(app)/my-assets/page.tsx` |
| `/notifications` | V1 — authentification et droits requis | Rendu non testé : session de recette absente | `app/(app)/notifications/page.tsx` |
| `/profile` | V1 — authentification et droits requis | Rendu non testé : session de recette absente | `app/(app)/profile/page.tsx` |
| `/queues` | V1 — authentification et droits requis | Rendu non testé : session de recette absente | `app/(app)/queues/page.tsx` |
| `/reporting` | V1 — authentification et droits requis | Rendu non testé : session de recette absente | `app/(app)/reporting/page.tsx` |
| `/tickets/[id]` | V1 — authentification et droits requis | Rendu non testé : session de recette absente | `app/(app)/tickets/[id]/page.tsx` |
| `/tickets/new` | V1 — authentification et droits requis | Rendu non testé : session de recette absente | `app/(app)/tickets/new/page.tsx` |
| `/tickets` | V1 — authentification et droits requis | Rendu non testé : session de recette absente | `app/(app)/tickets/page.tsx` |
| `/admin/asset-requests` | V1 — authentification et droits requis | Rendu non testé : session de recette absente | `app/admin/asset-requests/page.tsx` |
| `/admin/assets/[id]` | V1 — authentification et droits requis | Rendu non testé : session de recette absente | `app/admin/assets/[id]/page.tsx` |
| `/admin/assets` | V1 — authentification et droits requis | Rendu non testé : session de recette absente | `app/admin/assets/page.tsx` |
| `/admin/audit` | V1 — authentification et droits requis | Rendu non testé : session de recette absente | `app/admin/audit/page.tsx` |
| `/admin/catalog` | V1 — authentification et droits requis | Rendu non testé : session de recette absente | `app/admin/catalog/page.tsx` |
| `/admin/departments` | V1 — authentification et droits requis | Rendu non testé : session de recette absente | `app/admin/departments/page.tsx` |
| `/admin/dependencies/[entityType]/[entityId]` | V1 — authentification et droits requis | Rendu non testé : session de recette absente | `app/admin/dependencies/[entityType]/[entityId]/page.tsx` |
| `/admin/notifications` | Redirection V1 → /admin | Contrôle du code de redirection ; navigation non certifiée | `app/admin/notifications/page.tsx` |
| `/admin` | V1 — authentification et droits requis | Rendu non testé : session de recette absente | `app/admin/page.tsx` |
| `/admin/queues` | V1 — authentification et droits requis | Rendu non testé : session de recette absente | `app/admin/queues/page.tsx` |
| `/admin/reporting` | Redirection V1 → /reporting | Contrôle du code de redirection ; navigation non certifiée | `app/admin/reporting/page.tsx` |
| `/admin/roles` | Redirection V1 → /admin/users | Contrôle du code de redirection ; navigation non certifiée | `app/admin/roles/page.tsx` |
| `/admin/sla` | V1 — authentification et droits requis | Rendu non testé : session de recette absente | `app/admin/sla/page.tsx` |
| `/admin/teams` | Redirection V1 → /admin/queues | Contrôle du code de redirection ; navigation non certifiée | `app/admin/teams/page.tsx` |
| `/admin/technical` | Redirection V1 → /admin | Contrôle du code de redirection ; navigation non certifiée | `app/admin/technical/page.tsx` |
| `/admin/tickets` | Redirection V1 → /tickets | Contrôle du code de redirection ; navigation non certifiée | `app/admin/tickets/page.tsx` |
| `/admin/users` | V1 — authentification et droits requis | Rendu non testé : session de recette absente | `app/admin/users/page.tsx` |
| `/` | Redirection V1 → /dashboard | Contrôle du code de redirection ; navigation non certifiée | `app/page.tsx` |
| `/pending-assignment` | V1 — authentification et droits requis | Rendu non testé : session de recette absente | `app/pending-assignment/page.tsx` |
| `/preview` | Prévisualisation publique, hors parcours métier | Inventoriée ; rendu non testé | `app/preview/page.tsx` |
| `/signin` | V1 — public | Rendu vérifié : 14 combinaisons thème/largeur + AccessDenied | `app/signin/page.tsx` |
