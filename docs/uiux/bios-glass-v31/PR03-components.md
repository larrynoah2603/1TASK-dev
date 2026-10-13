# BIOS Glass Corporate v3.1 — PR 03 : Composants partagés Glass

> **Prévisualisation seulement.** Cette PR ne remplace pas les composants React et n'active aucun style BIOS dans la V1 de production. Le changement se voit **uniquement sur une préversion Vercel ou en développement, après clic sur « Tester BIOS Glass v3.1 »** (activation PR 02).

Référence : [PR 01 — cible et protection V1](./README.md) · [PR 02 — couleurs et polices](./PR02-preview.md) · [référence HTML autonome](./reference.html).

## Diagnostic vérifié du dépôt

- `styles/design-system.css` réutilise déjà `--kit-radius-*` pour `.kit-btn`, `.kit-card`, `.kit-input`, `.kit-table-wrap` et `.kit-modal`. Les modifier globalement casserait les invariants visuels historiques.
- `components/ui/primitives.tsx`, `components/ui/button.tsx` et `components/ui/card.tsx` exposent les composants partagés. Il n'est pas nécessaire de réécrire leur comportement.
- `styles/unified-components.css` fournit déjà les classes `.ds-kpi-card`, `.ds-stat-card`, les panneaux et les filtres ; les règles de finition utilisent une **portée explicite opt-in** afin de passer après les règles `html[data-theme]`.
- `styles/legacy.css` contient de nombreux styles historiques et `!important` : les pages hors composants partagés peuvent rester opaques. Leur migration visuelle progressive est prévue en PR 04/05/06, pas par un sélecteur global `div` ou `.panel`.

## Hiérarchie visuelle et adaptations BIOS

| Élément | Avant (prod) | Variante PR 03 opt-in |
|---|---|---|
| Carte partagée `.kit-card` | Fond opaque `--kit-card`, rayon 16 px | Blanc **62 %**, flou **20 px**, ligne fine + reflet, rayon **10 px** |
| KPI `.ds-kpi-card`, `.ds-stat-card` | Carte actuelle | Même surface Glass, données et libellés inchangés |
| Carte sombre | Fond opaque sombre | `rgb(25 43 35 / 85%)` et flou 20 px, contraste calculé |
| Bouton / champ | Rayon 12 px | Rayon **6 px**, hauteur usuelle 40 px, état focus visible |
| Bouton compact | Gabarit existant | Minimum 36 px, sans modifier les actions |
| Tableau partagé | Fond opaque | Conteneur Glass 10 px ; en-têtes et lignes lisibles, séparateurs fins |
| Badge | Composant commun existant | Tons sémantiques inchangés, texte obligatoire ; pilule conservée |
| Modale `.kit-modal` | Fond opaque, rayon 20 px | Rayon **12 px** ; fond **96 %** pour garantir lisibilité du formulaire |
| Tuile application | À traiter en PR 04 | Rayon **12 px** déjà prêt dans `--kit-radius-xl` |

La liste des composants est délibérément bornée. **Pas de modification de la sidebar, du topbar, de la navigation, des filtres, ni du bouton « Nouveau ticket »**.

## Contrastes et accessibilité

Le guide préconise une carte blanche 62 % sur un Canvas `#EEF0EC`. Mélanges opaques de référence :

- Ink `#14201D` et Ink 2 `#3A4744` sur cartes claires : contraste supérieur à **9:1** sur Canvas/halo testés.
- Texte sombre `#F2F7F3` et secondaire `#CEDBD3` sur cartes sombres : contraste supérieur à **10:1** dans l'échantillon calculé.
- Les boutons primaires conservent Ink sur orange BIOS via les tokens PR 02 ; les statuts gardent leurs libellés, la couleur n'est jamais leur unique signal.
- Si le navigateur ne prend pas en charge `backdrop-filter`, les cartes redeviennent **opaques**. `prefers-reduced-transparency: reduce` force également la carte opaque ; `prefers-reduced-motion` désactive les transitions concernées.
- Champs et modales utilisent **96–97 % d'opacité**, plutôt que 62 %, pour limiter l'effet de halos derrière des aides ou erreurs.

**Limite :** les tests de contraste automatique comparent des mélanges de référence, pas les styles calculés de toutes les pages sur tous les fonds. Une revue authentifiée reste indispensable.

## Variantes et recette

**Desktop 1280–1440 px :** Dashboard puis Inbox, vérifier relief léger des cartes, KPI non surdimensionnés, une seule barre de filtres, tableau sans perte d'informations et modales centrées.

**Tablette 768–1024 px :** Sidebar ouverte/repliée, rail agent sans chevauchement ; tableaux scrollables au clavier et boutons accessibles.

**Mobile 320/375/390 px :** focus visible, champs sans débordement, formulaires en une colonne, modal utilisable au clavier, aucune duplication du bouton `Nouveau`.

**Clair/sombre :** activer BIOS via le bouton Preview et utiliser le ThemeToggle existant. Tester les statuts avertissement, danger, succès et info et leurs badges, notamment en fond Glass sur halo coloré.

**Contrôles V1 à préserver :** créer ticket, confidentialité, idempotence, routage, aperçu inline `colSpan={7}`, bouton Claim, clôture, notifications push, habilitations admin et actifs.

## Risques et retour arrière

1. Certains `!important` de legacy CSS peuvent empêcher une surface spécifique de passer en Glass : **noter et corriger ciblé en PR 04/05**, ne pas surcharger l'application avec `!important` global.
2. Flou 20 px peut coûter cher sur petits terminaux / scroll : limiter les surfaces affichées et garder fallback opaque.
3. La transparence sur des fonds très colorés peut compromettre la lecture : ne pas utiliser 62 % sur formulaires ou modales ; tester contraste calculé.
4. Des rayons plus petits peuvent modifier les dimensions perçues de certains éléments : vérifier à 320 px, tablette et desktop.
5. **Rollback instantané en Preview :** bouton « BIOS Glass · Actif — Revenir à 1TASK » désactive `data-visual-profile`, revenant aux valeurs stables ; aucun réglage de production, base ni cookie n'est modifié.

**Condition de fusion PR 03 :** GitHub Actions V1 et Full, lint, TypeScript et build sans échec. La revue visuelle interactive dans Vercel Preview reste **à réaliser** ; ne pas prétendre la compléter par les tests de présence de CSS.

Note infrastructure : la Preview de PR 02 a présenté une limite de builds Vercel. Si cela persiste, la recette visuelle de la PR 03 est bloquée indépendamment du code. **Ne pas déclarer une conformité UI à 100 %** sans la prévisualisation opérationnelle.

## Étape suivante
PR 04 — Shell et premières pages V1 (Dashboard, Inbox, formulaire ticket), après approbation visuelle des composants PR 03. Le lot 07 Full reste suspendu.
