# UI-02 — Composants partagés et couleurs sémantiques BIOS Glass

**Date :** 14/10/2026.
**Références :** `BIOS Design Guide - Glass Corporate(2).html` fourni, `01_BIOS_UIUX_References_Chat.md`, directives UI/UX Pro Max, `docs/uiux/bios-glass-v31/UI-01-inventaire-matrice.md` dans la PR #105.

## Diagnostic de départ

- Le design BIOS est déjà opt-in par `html[data-visual-profile="bios-glass-v31"]`, activé en Vercel Production sauf `BIOS_GLASS_ENABLED=false`, avec palette `#E8702A` / Ink `#14201D` et mode sombre.
- `styles/bios-glass-v31-components.css` uniformisait `.kit-table-wrap`, `.ds-data-table-shell`, `.kit-table`, mais pas les `.ui-data-table` ni les `.table-shell` des vues héritées. Les classes historiques `styles/legacy-bridge.css` et `styles/design-system.css` coexistent toujours. **La suppression de tout `legacy.css` serait une régression probable**.
- `app/admin/reporting/page.tsx` utilisait `text-slate-900`, `text-slate-600`, `text-slate-700` et `bg-slate-100` alors que les CSS du thème visent `--kit-text`, `--kit-text-2`, `--kit-surface-muted`. Les remplacements sont strictement décoratifs : `summary.byStatus`, les filtres et l'export CSV restent inchangés.
- Guide : cartes radius 10 px, contrôles 6 px, Glass 62 % sur surfaces de lecture, menus 82 %, lignes de tableau d'environ 44 px, nombres tabulaires, une action principale. La version sombre est adaptée par 1TASK : le guide HTML ne la fournit pas entièrement.

## Hiérarchie / architecture retenues

1. Conserver le shell existant : sidebar et topbar, unique `NewTicketLauncher`, navigation mobile et toutes permissions existantes.
2. Présenter une seule barre de commandes par page (pas de nouveau filtre), puis les données métier dans des cartes et tableaux lisibles.
3. Réutiliser `--kit-*` et `--bios-glass-*` déjà approuvés, ne pas réintroduire d'hex par composant.
4. Tables : un cadre commun, scroll horizontal **local**, en-têtes discrets, lignes et focus cohérents. L'alignement numérique et les colonnes existantes restent inchangés.
5. Surfaces opaques lorsque l'utilisateur réduit la transparence ou que le flou n'est pas pris en charge.

## Modifications de UI-02

| Fichier | Modification | Risque |
|---|---|---|
| `styles/bios-glass-v31-components.css` | Ajout de règles **scopées BIOS** pour `.ui-data-table`, `.table-shell`, leurs cellules, scroll local et focus ; fallbacks opaques | Faible à moyen : hauteur des lignes et spécificité des vieux CSS |
| `app/admin/reporting/page.tsx` | Remplacement des quatre classes de couleur fixes par les tokens sémantiques existants | Faible : apparence seulement |
| `tests/uiux-bios-glass-ui02-shared-components.test.ts` | Contrat des sélecteurs, tokens, couleurs critiques, fallback et garde-fous V1 | Aucun impact utilisateur |
| Ce document | Diagnostic, variante desktop/mobile, risques, recette | Aucun |

**Aucune modification** des handlers React, requêtes, routes, Prisma, permissions, tickets confidentiels, SLA, push, API, scripts ou navigation.

## Variantes responsive et accessibilité

- **Bureau ≥ 1024 px :** tableaux pleine largeur dans leur carte, lecture horizontale naturelle ; contour et contraste identiques sur les variantes BIOS.
- **Tablette 768–1023 px :** scroll de table dans le cadre lorsqu'il existe davantage de colonnes que d'espace ; pas de scroll horizontal du document causé par cette règle.
- **Mobile 320–767 px :** les conteneurs gardent `max-width:100%`, `overflow-x:auto`, les colonnes ne sont pas retirées. La refonte des états Kanban et du rail SLA appartient à **UI-03**, pas UI-02.
- **Clair/sombre :** contenus et en-têtes partagent les tokens `--kit-text` / `--kit-text-2` ; les tableaux avec transparence réduite utilisent `--kit-card`.
- **Clavier :** `:focus-visible` sur tableaux focusables, tri, pagination, boutons secondaires. Ne pas ajouter `tabIndex` artificiel à des conteneurs non interactifs.
- Les ratios de contraste inscrits dans les tests concernent les **tokens sur fonds opaques**. Ils ne certifient pas les vrais pixels des cartes Glass, graphiques ou états superposés.

## Plan de vérification

- [ ] CI V1/Full : tests, lint, typecheck, Prisma et compilation réussis.
- [ ] Security S3 : audit habituel inchangé.
- [ ] Recette sur navigateur authentifié à 320, 375, 390, 768, 1024, 1280, 1440 px, clair/sombre.
- [ ] Dérouler tables `/tickets`, `/inbox` mode liste, `/admin/audit`, `/admin/users`, reporting, actifs ; vérifier scroll local, colonnes, focus et 200 % de zoom.
- [ ] Vérifier contrastes calculés sur carte Glass et superposition réelle : ≥4,5:1 texte normal, ≥3:1 texte large, ≥3:1 visuels d'UI importants.
- [ ] Lancement d'un ticket, Claim, inline preview `colSpan={7}`, droits utilisateurs et filtres : non régressés.
- [ ] Captures avant/après comparées au guide HTML et à l'état précédent.
- [ ] Validation propriétaire avant fusion. **Ne pas qualifier UI-02 de certification UI finale : UI-03 à UI-06 restent nécessaires.**

## Dépendances documentaires et arbitrages

UI-01 est dans la PR #105, **distincte** de la présente PR tant qu'elle n'est pas fusionnée. Le dépôt confirme une décision spécifique acceptant la palette/font BIOS en mode Production : elle prime sur la recommandation générique du guide ChatGPT de ne pas substituer la marque historique par défaut. En revanche, ne pas inventer de sélection de langue/densité ni de sélecteur multi-app seulement pour recopier la démo.
