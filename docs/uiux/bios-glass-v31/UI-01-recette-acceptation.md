# UI-01 — Protocole de recette visuelle BIOS Glass (préparation, pas certification)

**Source :** `BIOS Design Guide - Glass Corporate(2).html` fourni au projet ; référentiel UI/UX Pro Max documentaire et règles approuvées de 1TASK. Voir [matrice UI-01](./UI-01-inventaire-matrice.md).

## Périmètre et prérequis

UI-01 a audité **le code** et la référence HTML ; **aucune session authentifiée, capture nouvelle ou mesure DevTools n'a été collectée dans ce lot**. Ne jamais affirmer « 100 % conforme » sur la seule base des tests unitaires ou des tokens.

- Tester sur un **déploiement Preview** avec le profil BIOS activé par le toggle de session ; vérifier indépendamment le profil Production et `BIOS_GLASS_ENABLED` dans `app/layout.tsx`.
- Jeu de données de test **fictif uniquement**, sans identifiants, photos, pièces jointes ou tickets réels exposés dans les captures publiques.
- Profils à vérifier : demandeur, agent, responsable de file, administrateur fonctionnel, administrateur technique, combinaison admin fonctionnel + responsable de file ; profil Full **uniquement** dans une recette séparée.
- Navigateur : Chrome/Edge d'abord, second navigateur et Android/iOS si réellement utilisés ; zoom 100 % et 200 %, clavier seul, contraste réduit ou transparence réduite selon support.
- Mode clair + sombre à chaque largeur `320, 375, 390, 768, 1024, 1280, 1440` px ; ajouter **hauteur réduite** (par exemple 720 px) pour mesurer les superpositions.
- Disposer d'une capture **du guide HTML** des écrans témoins ET de la même zone dans 1TASK avec l'utilisateur de test et le même viewport.

## Jeu de parcours visuels par famille

| Série | Pages / état | Critères observables |
|---|---|---|
| A | Tableau de bord demandeur | titre 24, densité KPI, cartes 10 px, chiffres monospace, une action primaire, pas de CTA fantôme |
| B | `/inbox` liste (défaut) | recherche/filtre uniques, une zone de commande, résultats lisibles, aperçu inline, Claim visible si autorisé |
| C | `/inbox` Kanban | cinq statuts conservés ; scroll intentionnel, indice de défilement sur compact, colonnes accessibles clavier, pas de masquage de cartes |
| D | `/tickets`, `/tickets/new`, `/tickets/[id]` | détails longs, messages, conversation, formulaire, validation, bouton Créer, statut, confidentialités sans affichage non autorisé |
| E | `/queues`, `/reporting`, `/notifications` | tableaux 44 px et données vides, KPI contextualisés, graphiques colorés + libellés, filtres non dupliqués, notifications lisibles |
| F | `/my-assets`, `/admin/assets`, `/admin/asset-requests` | cartes, inventaire scrollable, modales sans débordement et actions intactes |
| G | `/admin`, `/admin/users`, `/admin/departments`, `/admin/queues`, `/admin/catalog`, `/admin/sla`, `/admin/audit`, `/admin/reporting` | entêtes cohérents, filtres/formulaires, lignes longues, icônes delete, états et erreurs |
| H | `/profile`, `/signin`, `/pending-assignment` | photo lisible, rôles multiples, menu utilisateur, cartes et messages, bouton Entra, dark et scroll mobile |
| I | Shell app et admin | identité, sidebar 240/repli 64, topbar 56, focus, menu clavier, **un Nouveau**; bottom nav mobile existante |
| J | Etats transversaux | loading, vide, erreur, succès, pending, désactivé, popover, modale, toast, menu, clavier, zoom, push |

## Contrastes et états à relever (mesures requises)

Pour chaque composant, collecter : page, thème, viewport, sélecteur, `getComputedStyle().color`, `background-color`, compositing réel Glass/halos, ratio contrastes texte, AA oui/non, capture et piste de correction. **Seuils : 4,5:1 texte normal, 3:1 texte grand, 3:1 composants non textuels significatifs.** Les variables individuelles ne suffisent pas pour les surfaces transparentes.

Matrice minimale : titre/corps/meta, lien normal/hover, bouton primaire normal/hover/disabled, label/input/help, badge success/danger/warning/info, cellule de tableau, numéros KPI, navigation active, menu, toast, erreur formulaire, modal, focus.

### Exemple de fiche d'écart (à remplir, pas une mesure réalisée)

```
ID: G02
Vue: /inbox
Profil: Agent
Viewport + container: 1024px / 720px central (mesurer)
Thème: dark
État: Kanban / rail SLA visible
Attendu: tableau complet ou scroll local identifiable, zéro chevauchement
Observé: [à renseigner après capture]
Élément CSS / capture: [à renseigner]
Contraste AA (ratio calculé): [à mesurer]
Décision: correction ciblée PR UI-03 / aucune régression Claim/filtre
```

## Critères d'acceptation blocants

- [ ] Navigation principale inchangée, 1 bouton Nouveau par shell, aucun filtre en double dans Inbox.
- [ ] `colSpan={7}`, `aria-expanded`, `toggleTicket`, Claim, Liste/Kanban consultatif intacts.
- [ ] Tickets confidentiels non diffusés, permissions multi-rôles et routage V1 intacts.
- [ ] Sous tous les viewports : aucun chevauchement, scroll horizontal **uniquement local et intentionnel** sur les tableaux/colonnes nécessitant scroll.
- [ ] Données longues, nom d'utilisateur, référence, colonnes, filtrage et CTA présents et lisibles.
- [ ] Contrastes AA mesurés (normal 4,5:1, grand et visuels importants 3:1).
- [ ] Modes clair/sombre, `prefers-reduced-motion`, fallback réduit de transparence, focus clavier et cibles tactiles.
- [ ] Contrat de style BIOS : fonds, typo, densité, rayons, espacement, surfaces et menus cohérents, avec arbitrages documentés.
- [ ] CI V1 et Full complètes (tests + builds) vertes après chaque PR de correction.
- [ ] Captures authentifiées avant/après pour les séries A–J, comparées au **HTML guide réellement fourni**.
- [ ] Conflits de référence arbitrés sans imposer une fonctionnalité (langue/densité/switch multi-app) non approuvée dans V1.

## Suite de travaux

1. **UI-02 :** couches de design et composants partagés ; corriger G01/G03/G06 avant les écrans complexes, sans CSS global aveugle.
2. **UI-03 :** Inbox, Dashboard, tickets et contexte de largeur de conteneur (G02), puis retester les parcours.
3. **UI-04 :** administration, actifs, reporting, authentification et notifications (G04/G05).
4. **UI-05 :** passer tous les scénarios A–J et effectuer les captures, les mesures de contrastes et la navigation clavier.
5. **UI-06 :** corrections restantes, vérification régression V1/Full et décision d'acceptation fondée sur les preuves.

**Risque fondamental :** une refonte CSS peut modifier les hit targets, overlays, z-index et le contenu affiché. On évite donc suppression massive de `styles/legacy.css`, multiplication des CTA et substitution globale des tokens.
