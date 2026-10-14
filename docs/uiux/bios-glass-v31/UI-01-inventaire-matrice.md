# UI-01 — Inventaire des vues, composants et écarts BIOS Glass Corporate v3.1

**Date de référence :** 14/10/2026. **Branche auditée :** `main`, commit `1504e72cc97a1ddb7346124bf21309af73709889`.
**Statut :** audit statique et comparaison documentaire ; **aucune correction graphique livrée, aucune certification visuelle**.
**Références :** fichier utilisateur `BIOS Design Guide - Glass Corporate(2).html` (source première pour esthétique, structure et composants), `01_BIOS_UIUX_References_Chat.md`, `03_UIUX_Pro_Max_SKILL_et_checklists (1).md` (références de bonnes pratiques), décisions approuvées de 1TASK et `docs/uiux/bios-glass-v31/README.md`. La dernière décision explicite en dépôt (**12/10/2026**) adopte **au plus près** la palette, les polices et les rayons du HTML pour la variante BIOS : elle prime sur la référence documentaire générique conseillant de garder les anciennes valeurs.

## 1. Résultat exécutable vs conformité

- **44 fichiers `app/**/page.tsx`**, dont pages authentifiées V1, redirections/alias, pages conditionnées au profil Full, écrans de connexion et d'affectation. Le nombre de routes **n'est pas** le nombre d'écrans indépendants nécessitant une maquette.
- **15 feuilles `styles/*.css`** importées par `app/globals.css` : ancien thème + pont + système de conception + finitions V1 + **4 couches visuelles BIOS**. La coexistence historique signifie qu'une règle BIOS présente dans le code **ne prouve pas** son résultat calculé dans le navigateur.
- `app/layout.tsx` active `data-visual-profile="bios-glass-v31"` en Production **si** `VERCEL_ENV=production` et `BIOS_GLASS_ENABLED != false` ; une Preview conserve un interrupteur de session. **Ne pas confondre** "code configuré pour la production" et "profil effectivement observé sur un appareil ou déploiement précis".
- **Pas de navigation authentifiée ni de calcul des styles de chaque écran réalisés dans UI-01.** Les appréciations suivantes sont : **C** = conforme *dans le code vérifié*, **P** = partiel/écart concret du code, **NV** = non vérifiable sans captures/inspecteur/accessibilité. Une règle CSS existante ne vaut pas un test WCAG.

## 2. Contrat du guide HTML et situation du dépôt

| Domaine | Guide HTML (source) | Dépôt 1TASK / preuve | Niveau |
|---|---|---|---|
| Couleurs identité BIOS | Orange `#E8702A`, Ink `#14201D`, Canvas `#EEF0EC`, ligne `#E2E5E2` | `styles/bios-glass-v31-preview.css`, uniquement sous `data-visual-profile` | C code / NV rendu |
| Texte secondaire, statuts | `#3A4744`, `#5E6B67`, succès `#1F7A55`, erreur `#B42323`, attention `#93590A`, info `#1F5FAE` | Variables sémantiques sous profil BIOS ; styles hérités restent présents | P |
| Typographie | Schibsted Grotesk 700 titres, IBM Plex Mono chiffres, titres 24 px, sections 16 px, corps 14 px, méta 13 px | Polices auto-hébergées dans `app/layout.tsx`; application aux classes et titres ciblés dans BIOS CSS | P : vérifier classes non ciblées et valeurs numériques |
| Rayons | 6 px contrôles, 10 px cartes, 12 px tuiles | Profil BIOS dans `styles/bios-glass-v31-components.css` ; cartes/contrôles hérités hétérogènes | P |
| Verre / surfaces | Cartes blanc 62 %, blur 20 px, trait intérieur ; menus blanc 82 % | `--bios-glass-*`, `backdrop-filter` et fallbacks ; plusieurs variantes de `.panel`, `.table-shell`, `.kit-card` | P / NV contrastes rendus |
| Densité | Page 32 px, carte 22 px, gap 18 px, contrôles 40/36 px | Les composants BIOS utilisent plusieurs tokens ; classes utilitaires `p-5`, `p-6`, `gap-4`, `space-y-6` subsistent | P |
| Shell | Sidebar 240 px, repli 64 px, topbar 56 px, contenu 1360 px max | `styles/bios-glass-v31-shell-v1.css` définit ces valeurs ; `components/app-shell.tsx` et `components/admin-shell.tsx` partagent shell | C code / NV rendu |
| Navigation active | Fond Ink foncé, texte lisible, repère orange | `.kit-nav-item[aria-current="page"]` sous profil BIOS ; menus et état clavier doivent être vérifiés | C code / NV |
| Action primaire | Un CTA dominant par vue | `NewTicketLauncher` appelé une fois par `components/app-shell.tsx` et une fois par `components/admin-shell.tsx` (shells distincts), pas deux sur le même shell | C code |
| Barre de filtres | Une seule zone de commande cohérente | `components/inbox/inbox-workbench.tsx` : un `inbox-filter-form`, sélecteur Liste/Kanban, panneau de filtres ; recherche globale du topbar de portée différente | C structure / NV affordance |
| Tableaux | Lignes 44 px, en-tête discret, valeurs numériques alignées, « — » pour absence | `.kit-table` reçoit règles BIOS, autres tableaux utilisent `.table-shell`, Tailwind et structures héritées | P |
| Menu utilisateur | Avatar, thème, langue, densité, déconnexion | `components/profile-menu.tsx` : avatar, profil, admin, déconnexion ; `ThemeToggle` seulement dans une rangée `kit-mobile-only` ; pas de langue/densité | P ; ne pas inventer des fonctionnalités pour satisfaire une maquette |
| Iconographie | Lucide cohérent, 16 px controls / 20 px empty states | `components/ui/icons`, icônes SVG et icônes locales ; homogénéité visuelle à contrôler | NV |
| Accessibilité | Contraste AA, focus, claviers, badges texte + couleur | Plusieurs règles `:focus-visible` et `prefers-reduced-motion` ; tests de contrat existants, pas de calcul de contraste par élément rendu | P / NV |
| Modes | Clair et sombre, fallback transparence | `data-theme`, thème sombre BIOS **prototype local** (le HTML ne fournit pas de spécification sombre complète), fallback `prefers-reduced-transparency` | C code / NV |
| Responsive | Tablette/mobile sans chevauchement | CSS `@container agent-inbox` existant ; Kanban BIOS reste basé sur `@media max-width:1199px` malgré sidebar/rails variables | P |
| Sélecteur multi-app BIOS | Tuile/switcher entre plusieurs apps du groupe | 1TASK est une seule application ; choix **non applicable** tant qu'il n'existe pas d'autres apps à basculer | Décision projet |
| États de notification/chargement | Messages et erreurs visibles, cohérents | Primitives `ToastProvider`, loaders et panneaux existants ; recette clavier/status requise | NV |

### 2.1 Mesures calculées sur les tokens (pas sur les surfaces réelles)

| Couleurs comparées | Rapport calculé | Lecture |
|---|---:|---|
| Ink `#14201D` sur orange `#E8702A` | **5,41:1** | AA texte normal |
| Ink `#14201D` sur Canvas `#EEF0EC` | **14,60:1** | AA |
| Orange de texte corrigé `#A6450A` sur Canvas | **5,27:1** | AA |
| Orange de texte brut du guide `#B8520F` sur Canvas | **4,31:1** | **Insuffisant** pour texte normal |
| Blanc sur orange `#E8702A` | **3,10:1** | **Insuffisant** pour texte normal |
| Texte dark `#F2F7F3` sur surface `#192B23` | **13,73:1** | AA |
| Secondaire dark `#B8C8C0` sur surface `#192B23` | **8,55:1** | AA |

**Arbitrage :** ne pas imposer le `#B8520F` textuel du guide là où il échoue WCAG ; 1TASK emploie `#A6450A` comme variante accessible. Réévaluer sur surfaces Glass/halos réelles et états disabled/hover.

## 3. Carte de l'application — 44 routes du dépôt

**Lecture :** V1 = écran/parcours actif sous droits existants ; RED = redirection/alias ; FULL = fonctionnalité conditionnelle non activée V1 ; AUTH = connexion/onboarding ; ADM = contrôle administration existant selon rôle ou capability. N'inventorier **aucun** écran Full comme activé en V1.

| Routes source `app/**/page.tsx` | Écran/famille | Nature et éléments à confronter au guide |
|---|---|---|
| `app/page.tsx` | entrée | RED vers accueil |
| `app/signin/page.tsx` | connexion | AUTH ; bannière, carte, CTA Entra, responsive |
| `app/pending-assignment/page.tsx` | affectation en attente | AUTH ; état vide, message, contrastes |
| `app/preview/page.tsx` | prévisualisation | Vue spéciale ; vérifier périmètre d'exposition et charte hors usage normal |
| `app/(app)/dashboard/page.tsx` | tableau de bord | V1 ; KPI compacts, entête, cartes, activité |
| `app/(app)/dashboard/operations/page.tsx` | opérations | RED vers boîte agent |
| `app/(app)/dashboard/responsible/page.tsx` | responsable | V1/FULL conditionnel ; dans V1 redirection vers reporting |
| `app/(app)/inbox/page.tsx` | boîte agent | V1 ; liste, filtres, Kanban consultatif, rail SLA, Claim |
| `app/(app)/tickets/page.tsx` | mes tickets | V1 ; liste, recherche et états |
| `app/(app)/tickets/new/page.tsx` | création | V1 ; wizard, champs, validation, navigation ticket |
| `app/(app)/tickets/[id]/page.tsx` | ticket détaillé | V1 ; informations, conversation, actions et aperçu |
| `app/(app)/queues/page.tsx` | files | V1 selon droits ; grilles, métriques, navigation |
| `app/(app)/reporting/page.tsx` | reporting | V1 ; chiffres et graphiques, filtres |
| `app/(app)/my-assets/page.tsx` | mes actifs | V1 ; cartes et détail |
| `app/(app)/assets/page.tsx` | inventaire | RED en V1 vers admin/assets ; FULL autrement |
| `app/(app)/assets/[id]/page.tsx` | détail inventaire | RED en V1 ; FULL autrement |
| `app/(app)/asset-requests/page.tsx` | demandes d'actifs | RED en V1 vers admin/asset-requests ; FULL autrement |
| `app/(app)/notifications/page.tsx` | notifications | V1 ; liste, filtres, activation Push |
| `app/(app)/profile/page.tsx` | profil | V1 ; image, rôles, préférences |
| `app/(app)/audit/page.tsx` | audit historique | RED vers admin/audit |
| `app/(app)/knowledge/page.tsx` | base de connaissances | FULL conditionnel |
| `app/(app)/missions/page.tsx` | missions | FULL conditionnel |
| `app/(app)/missions/[id]/page.tsx` | détail mission | FULL conditionnel |
| `app/(app)/clients/page.tsx` | clients | FULL conditionnel |
| `app/(app)/clients/[id]/page.tsx` | détail client | FULL conditionnel |
| `app/(app)/dossiers/page.tsx` | dossiers | FULL conditionnel |
| `app/(app)/dossiers/[id]/page.tsx` | détail dossier | FULL conditionnel |
| `app/admin/page.tsx` | tableau de bord admin | ADM ; densité KPI, liens de gestion |
| `app/admin/users/page.tsx` | utilisateurs | ADM ; recherche, filtres, tableaux, avatars |
| `app/admin/roles/page.tsx` | rôles | ADM ; matrice, cartes et états (vérifier gating V1) |
| `app/admin/departments/page.tsx` | départements | ADM ; configuration partagée |
| `app/admin/queues/page.tsx` | files admin | ADM ; configuration partagée |
| `app/admin/teams/page.tsx` | équipes | ADM ; configuration partagée (vérifier gating V1) |
| `app/admin/catalog/page.tsx` | catalogue | ADM ; configuration, formulaires |
| `app/admin/sla/page.tsx` | SLA admin | ADM ; configuration SLA, listes |
| `app/admin/notifications/page.tsx` | règles notifications | ADM ; capability/gating V1 |
| `app/admin/tickets/page.tsx` | tickets admin | ADM ; capability/gating V1 |
| `app/admin/reporting/page.tsx` | reporting admin | ADM ; graphiques et lignes de statuts |
| `app/admin/audit/page.tsx` | audit admin | ADM ; tableau long, filtres |
| `app/admin/technical/page.tsx` | administration technique | ADM ; accès restreint |
| `app/admin/assets/page.tsx` | inventaire admin | ADM ; réutilise composant de `app/(app)/assets/page.tsx` |
| `app/admin/assets/[id]/page.tsx` | détail d'actif admin | ADM ; détail et actions |
| `app/admin/asset-requests/page.tsx` | demandes d'actifs admin | ADM ; réutilise composant de `app/(app)/asset-requests/page.tsx` |
| `app/admin/dependencies/[entityType]/[entityId]/page.tsx` | impacts de suppression | ADM ; page dépendances et actions |

## 4. Matrice des composants effectivement partagés et écrans prioritaires

| Zone | Points d'ancrage du dépôt | Écart/risque UI-01 | Priorité prochaine phase |
|---|---|---|---|
| Shell app/admin | `components/app-shell.tsx`, `components/admin-shell.tsx`, `components/layout/app-sidebar.tsx`, `top-header.tsx`, `mobile-navigation.tsx` | Deux shells partagent le design mais pas exactement les enfants; ne pas dupliquer les liens ni `NewTicketLauncher` | P1 UI-02/03 |
| Menu profil | `components/profile-menu.tsx`, `components/theme-toggle.tsx` | Thème accessible uniquement dans le menu mobile; langue/densité non implémentées; vérifier si fonctionnalités justifiées | P2, arbitrage fonctionnel |
| Bases CSS | `styles/legacy.css`, `tokens.css`, `legacy-bridge.css`, `design-system.css`, `unified-components.css` | Anciennes valeurs, forte spécificité et styles doublons; toute suppression doit relever les sélecteurs encore utilisés | P1 UI-02 |
| Variantes BIOS | `styles/bios-glass-v31-preview.css`, `components.css`, `shell-v1.css`, `v1-pages.css` | Override par attribut; plusieurs correctifs `!important`; moderniser de façon incrémentale | P1 UI-02 |
| Dashboard | `components/dashboard/dashboard-page.tsx`, `components/dashboard-visuals` | Cartes et KPI à densifier selon information, pas via suppression de données | P2 UI-03 |
| Inbox | `components/inbox/inbox-workbench.tsx`, `agent-ticket-table.tsx`, `agent-ticket-kanban.tsx`, `sla-monitor-panel.tsx` | 5 colonnes, défilement, rail et filtres : tester surtout la largeur du **conteneur réel**, pas seulement `window.innerWidth` | P1 UI-03 |
| Création | `components/tickets/ticket-wizard`, `ticket-workspace`, nouveau formulaire | Hiérarchie et label, modal, erreurs, redirection ; préserver idempotence | P1 UI-03 |
| Détail | `components/tickets/detail/*`, `ticket-comment-thread.tsx`, `ticket-actions.tsx` | Textes longs, conversation, panneau actions, arrière-plans | P1 UI-03 |
| Admin | `components/admin-configuration-panel.tsx`, `admin-primitives`, `admin/users-table`, `admin/permission-matrix` | Plusieurs formulaires/tables hérités; `app/admin/reporting/page.tsx` contient `text-slate-900` et `text-slate-600` fixes | P1 UI-04 |
| Actifs | `components/asset-list-client`, `asset-request-review-table`, `asset-request-dialog` | Cartes, tableaux et confirmations ; les routes V1 utilisent les alias admin | P2 UI-04 |
| Reporting | `components/reporting/reporting-dashboard`, `reporting-filter.client` | Contrastes des graphiques, valeurs mono et indicateurs sans surdensité | P2 UI-04 |
| Notifications | `components/notifications/notifications-page`, alertes et push | Harmoniser listes/états, ne pas modifier fonctionnement Web Push | P2 UI-04 |
| Authentification | `app/signin/page.tsx`, `app/pending-assignment/page.tsx` | Classes Tailwind couleur/bg héritées malgré surcharges BIOS, surtout sombre | P1 UI-04 |

### Confirmations explicites à préserver pendant les refontes

- **Un seul bouton « Nouveau ticket » par shell** : `app-shell.tsx` et `admin-shell.tsx` sont des coquilles différentes ; ne pas en créer un second dans Inbox.
- **Un seul formulaire `inbox-filter-form`** dans `inbox-workbench.tsx`, avec mode Liste par défaut (`useState<InboxLayout>("list")`). Recherche globale topbar ≠ doublon métier des filtres Inbox.
- `agent-ticket-table.tsx` : aperçu accessible avec `aria-expanded`, `toggleTicket`, **`colSpan={7}`**, `ClaimTicketButton` visible selon droits.
- Les rôles cumulés, le ticket confidentiel, les ACL, la notification et le routage V1 ne sont **jamais** des variables d'ajustement graphique.
- Ne pas ajouter un sélecteur d'applications, un réglage langue/densité ou des boutons duplicatifs simplement parce qu'ils figurent dans la démo générique.

## 5. Priorités des écarts et décision de travail

| ID | Constat avec preuve de code | Classification | Action autorisable après UI-01 |
|---|---|---|---|
| **G01** | Styles hérités multiples + surcharges BIOS + `!important` ; risque de cascade | Confirmé | Construire une carte sélecteur → composant, corriger seulement les conflits constatés |
| **G02** | `@media max-width:1199px` pour `.agent-kanban-board` et sidebar/rail variables | Confirmé | Passage progressif au breakpoint du **conteneur**, conserver 5 statuts et scroll explicite |
| **G03** | Couleurs Tailwind `text-slate-900`, `text-slate-600`, `bg-slate-100` dans reporting admin | Confirmé | Remplacer localement par tokens sémantiques sans changer le graphique |
| **G04** | `app/pending-assignment/page.tsx` contient `bg-slate-950`, `bg-white`, `text-slate-900` | Confirmé | Aligner sur les couleurs/surfaces BI​OS avec validation dark |
| **G05** | `components/profile-menu.tsx` n'affiche la bascule de thème que dans `kit-mobile-only` | Confirmé | Décider si l'accès desktop au thème est déjà offert ailleurs ; sinon proposer une entrée sans nouvelle préférence métier |
| **G06** | `.kit-table` est stylée, mais les tables ne partagent pas toutes cette classe | Confirmé | Normaliser tailles de lignes, focus et vides de manière ciblée |
| **G07** | Affichage Glass avec halos, widgets dynamiques, modales sur fonds variés | Non mesuré | Captures et contrastes **calculés** en production/Preview |
| **G08** | Contraste de chaque étiquette, badge, graphique, texte sur cartes dark | Non mesuré | Matrice WCAG AA par état visuel et rôle |
| **G09** | Largeurs mobile/tablette/desktop, clavier, fenêtres, états de chargement et notifications | Non mesuré | Recette du document UI-01 avant certification |
| **G10** | README contient des étapes historiques « Preview only » sous la mise à jour de production | Confirmé, documentation | Distinguer l'index courant des notes historiques sans altérer les décisions |
| **G11** | Certaines routes Full dormant et alias V1 figurent parmi les 44 routes | Confirmé | Tester V1 réel séparément des fonctionnalités Full |

**Ordre proposé :** UI-02 (G01/G03/G06 et tokens), UI-03 (G02 et parcours Inbox/tickets), UI-04 (G04/G05/actifs/reporting), UI-05 (G07–G09), UI-06 (contrastes et recette). Les modifications doivent être des PR séparées si elles affectent des composants à risque.

## 6. Hiérarchie d'information ciblée

1. **Shell inchangé** : sidebar existante, topbar et unique Nouveau.
2. **Contexte** : titre, description courte, statut pertinent et au plus une action principale.
3. **Contrôles locaux** : une zone de recherche/filtres, Liste/Kanban consultatif lorsque applicable.
4. **Données métier** : tickets/tableaux/cartes lisibles, lignes compactes, numéros mono, états textuels.
5. **Secondaire progressif** : rail SLA, activités, détails facultatifs sans monopoliser les écrans étroits.
6. **Feedback** : toasts, erreurs inline, chargement, focus clavier, confirmations et notifications identiques en clair/sombre.

## 7. Risques de régression et responsabilités

- **Critique** : changement involontaire d'état de formulaire, Claim, confidentialité, routage, fusion de rôles, liens push, navigation.
- **Élevé** : débordements central/rail et largeur du Kanban, tableaux admin, modales coupées, notifications invisibles, sélection d'un ticket au clavier.
- **Modéré** : scintillement au passage sombre, cascade `!important`, flou coûteux sur appareils modestes, tooltip inaccessible, tables mobiles sans indice de défilement.
- **Documentaire** : divergence entre guide HTML multi-apps, marque V1 historique, préférences d'utilisateur non construites et README ancien.

**UI-01 ne modifie aucun composant, style ni workflow.** Les décisions de refonte et l'acceptation visuelle restent à confirmer dans un navigateur authentifié.
