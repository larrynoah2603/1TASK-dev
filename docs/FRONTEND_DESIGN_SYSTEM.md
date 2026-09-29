# 1TASK — Refonte du design system (rapport)

Périmètre : **interface uniquement**. Aucun fichier de `app/api/`, `prisma/`, `lib/`, ni aucune règle d'authentification,
d'autorisation, de SLA ou de workflow n'a été modifié (37 fichiers modifiés, 11 créés — tous des composants React
de présentation, des pages et du CSS).

## 1. Architecture CSS

`app/globals.css` n'est plus qu'un assembleur de couches (l'ordre = la priorité) :

| Couche | Fichier | Rôle |
|---|---|---|
| 1 | `styles/legacy.css` | L'ancien `globals.css`, **conservé tel quel** (5 952 lignes) le temps de la migration |
| 2 | `styles/tokens.css` | **Source unique** : couleurs clair/sombre, espacements, rayons, ombres, typographie |
| 3 | `styles/legacy-bridge.css` | Redirige les 102 variables héritées (`--ledger-*`, `--industrial-*`, `--ds-*`…) vers les tokens |
| 4 | `styles/design-system.css` | Composants du nouveau design system (préfixe `kit-`), 0 couleur en dur |

### Tokens (valeurs exactes du cahier des charges)
Clair : fond `#F8FAFC`, surface/carte `#FFFFFF`, primaire `#4F46E5`, secondaire `#64748B`, succès `#16A34A`, alerte `#F59E0B`,
danger `#DC2626`, texte `#0F172A` / `#475569`.
Sombre : fond `#020617`, surface `#0F172A`, carte `#111827`, primaire `#818CF8`, secondaire `#94A3B8`, succès `#22C55E`,
alerte `#FBBF24`, danger `#F87171`, texte `#F8FAFC` / `#CBD5E1`.

Dérivés (documentés dans `tokens.css`, jamais en dur ailleurs) : bordures slate (`#E2E8F0`/`#1E293B`), teintes douces calculées
par `color-mix()` à partir des tokens, et textes sémantiques assombris en mode clair pour garder un contraste ≥ 4,5:1
(le `#F59E0B` brut en texte sur fond clair ne l'atteint pas).
Espacement : 4 · 8 · 12 · 16 · 24 · 32 · 48 px. Rayons : 8 / 12 / **16** (cartes) / 20 (modales). Ombres douces à 4 niveaux.

## 2. Composants (`components/ui/`)
Existants réécrits (mêmes exports, aucun import à modifier) : `Button` (+ `size`), `Card`, `Badge`, `Progress`/`ProgressBar`,
`Table`, `Modal`, `EmptyState`, `ErrorState`, `Skeleton*`, `Timeline`, `StatusBadge`.
Nouveaux : `Avatar` (+ `initials`), `Input`/`Textarea`/`Field`, `Dropdown` + hook `useDismissable` (remplace la logique
« clic extérieur / Échap » dupliquée dans 3 menus), `Icon` (jeu d'icônes unique, remplace 2 dictionnaires SVG dupliqués),
`index.ts` (point d'entrée). `components/status-badge.tsx` (statuts/priorités Prisma) passe par des tons `success/warning/danger/info/neutral`.

## 3. Navigation
**Sidebar** : hauteur = viewport (`100dvh`), défilement interne uniquement si nécessaire (vérifié : aucun défilement
avec les 11 entrées + administration à 900 px de haut), état actif marqué (fond teinté + barre d'accent), mode replié 68 px,
tiroir sur tablette/mobile, profil en bas. Sections : *Espace de travail* (Tableau de bord, Tickets, Boîte agent, Missions,
**Files**, Clients, Dossiers, Connaissances, Reporting, Pilotage SLA, Actifs) et *Administration* / *Compte* (Administration, Paramètres).
Les règles d'affichage (permission, rôle, admin, actifs) sont **recopiées à l'identique**.
**Barre du haut** : hauteur fixe 56 px, fil d'Ariane + titre de page (dérivés de l'URL, `components/layout/route-meta.ts`),
recherche globale (⌘K), « Nouveau ticket », notifications, aide, thème, menu utilisateur. Sur mobile : la recherche se replie
en icône, le thème passe dans le menu utilisateur, barre de navigation basse à 5 entrées.

## 4. Centre de notifications
Logique inchangée (chargement, « marquer lu », « tout marquer lu »). Nouveautés : regroupement *Aujourd'hui / Plus tôt*,
icône et couleur par type (affectation, alerte SLA, dépassement SLA, neutre), point « non lu », compteur, état vide et erreur.
> L'API `/api/notifications` ne renvoie pas le champ `type` (interdit d'y toucher). Le composant lit `type` s'il apparaît un
> jour, sinon **déduit** l'icône du titre/texte (mots-clés français). Si vous autorisez un jour l'ajout de `type` à la réponse
> GET, l'icône deviendra exacte sans changer le composant.

## 5. Détail du ticket
Colonne gauche : description, conversation, chronologie moderne (icônes/tons par événement), pièces jointes.
Colonne droite : actions (en tête, comme dans la version précédente), demandeur, équipe en charge (agent, département, file,
responsable), détails/échéances, contexte de production, qualification/SLA/relations.
En-tête : référence, nature, titre, route, statut, priorité, SLA, progression du workflow en 7 étapes.
Sur tablette/mobile : une colonne, les actions remontent avant les échanges. `TicketAdvancedPanels` reçoit un prop d'affichage
`only` (pas de changement d'état, d'appel API ni de règle).

## 6. Couleurs en dur
0 dans les `.ts/.tsx` (26 remplacées : tokens dans l'application ; palette Tailwind stable pour les pages autonomes de connexion
et d'attente, dont le fond bleu est volontairement indépendant du thème). `styles/legacy.css` en contient encore 1 251 (534 distinctes).

## 7. Reste à faire (dette connue)
1. **Valider localement** : `npm run lint`, `npx tsc --noEmit`, `npm run build` (impossibles dans l'environnement de travail : pas de `node_modules`, réseau désactivé).
2. Recette visuelle des écrans hors ticket/shell (Dashboard, Admin, Reporting, Missions, Clients…) : ils héritent des tokens via le pont mais gardent leur balisage historique.
3. Retirer `legacy.css` et `legacy-bridge.css` écran par écran (chercher les classes `*-industrial`, `ledger-*`, `ds-*`).
4. Fusionner les deux familles de composants dashboard (`components/dashboard/` vs `components/modules/dashboard/`) et les doublons `components/ticket-*.tsx` / `components/tickets/*` après vérification des imports.
5. Optionnel : exposer `type` dans `/api/notifications` (voir §4).
