# UI-06 — finition des menus partagés et navigation clavier

**Date :** 14 octobre 2026. **Point de départ :** `main` au commit `f293fa2a8747c0e37963ae74a3cf6bfa02883a7a` (PR #109 déjà fusionnée).

## Diagnostic à partir du code vérifié

- `components/ui/dropdown.tsx` est partagé par `ProfileMenu` (`role="menu"`) et `HelpMenu` (`role="dialog"`). Le déclencheur expose déjà `aria-expanded`, et `useDismissable` sait fermer sur clic extérieur et Échap.
- Le gestionnaire générique Échap désactive le panneau sans replacer explicitement le focus. Le clavier peut ainsi perdre son point de reprise lorsque l'élément focalisé disparaît.
- `.kit-popover-menu` a une largeur définie dans `styles/design-system.css` mais aucune hauteur maximale dédiée. Un nom, plusieurs rôles ou un écran bas peuvent faire dépasser le panneau.
- Les étapes UI-01 à UI-05, les styles BIOS et les tests métiers sont déjà dans `main`; ne pas créer un deuxième système graphique ou un deuxième bouton Nouveau.

## Hiérarchie, modifications et couverture

| Zone | Écart confirmé | Correction | Risque | Contrôle |
|---|---|---|---|---|
| Menu utilisateur | Focus non restauré sur Échap | Échap dans le panneau : fermer puis focaliser le déclencheur | Faible, clavier seulement | Échap depuis un lien du menu, puis Entrée |
| Panneau Aide | Même composant générique, rôle dialogue | Même restauration sur Échap, sans toucher aux onglets et à la recherche | Faible | Échap depuis le champ de recherche, réouverture |
| Menus ouverts | Ouverture persistant après Tab hors du composant | Fermer à la sortie du focus, sans forcer un retour de focus | Faible/modéré : ordre des événements à tester | Tab vers le contrôle suivant |
| Bouton/panneau | Pas de relation explicite | Identifiant React stable et `aria-controls` lorsque ouvert | Nul attendu | Lecteur d'écran |
| Menu BIOS long | Pas de limite de hauteur propre | `max-height` selon la hauteur du viewport, scroll vertical local et retours à la ligne | Faible/modéré : mobiles très courts | 320/375/768 px, zoom 200 % |

**Fichiers touchés :** `components/ui/dropdown.tsx`, `styles/bios-glass-v31-components.css`, `tests/uiux-bios-glass-ui06-popover-a11y.test.ts` et cette note.

La règle CSS nouvelle est bornée au seul profil `html[data-visual-profile="bios-glass-v31"][data-theme]`. Les interactions clavier communes aux deux profils sont corrigées, car elles étaient problématiques indépendamment de la palette.

## Responsive et thème

- **Desktop :** menu ancré au déclencheur actuel, hauteur bornée, défilement intérieur si le contenu s'allonge.
- **Tablette/mobile :** le `position: fixed` mobile existant reste inchangé ; le panneau conserve ses marges horizontales et ne dépasse pas intentionnellement sous la barre supérieure.
- **Clair/sombre :** surface opaque `--bios-glass-raised`, tokens de texte et bordure existants inchangés.
- **Clavier :** le déclencheur reçoit de nouveau le focus sur Échap ; Tab vers l'extérieur referme le panneau sans déplacer le focus de destination.

## Invariants protégés

Aucun changement des routes, navbar, boutons Nouveau, filtres Inbox, Kanban, rail SLA, tickets confidentiels, rôles cumulés, permissions, API, Server Actions, notifications Push, base de données ou traitements programmés. Les appels métiers des menus sont inchangés.

## Recette avant fusion

1. Exécuter `npm test -- tests/uiux-bios-glass-ui06-popover-a11y.test.ts`, puis les suites V1/Full, lint, typecheck et build selon la configuration du dépôt.
2. En navigateur authentifié, tester utilisateur et Aide ouverts aux largeurs `320, 375, 390, 768, 1024, 1280, 1440`, en clair/sombre.
3. Vérifier Tab, Maj+Tab, Échap, la restitution du focus, le changement de thème, le menu long et le zoom 200 %.
4. Vérifier les surfaces et les contrastes calculés, y compris les halos sous le verre dépoli.
5. Réutiliser `scripts/ui05-browser-audit.mjs` avec un compte de test et conserver les preuves hors dépôt.

**Statut :** correctif du code fourni. Les tests du dépôt, CI et la recette authentifiée restent à constater dans leur environnement ; cette note ne prétend pas à une certification complète de la V1.
