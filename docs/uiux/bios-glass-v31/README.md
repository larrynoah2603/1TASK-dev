# 1TASK — BIOS Glass Corporate v3.1 | PR 01 — Référence et garde-fous

> **Statut : spécification préparatoire uniquement.** Le fichier [reference.html](./reference.html) est une maquette HTML autonome et fictive : **pas** une route de 1TASK, pas une capture de production, pas un écran fonctionnel. Les données de démonstration ne sont pas issues du système.
>
> Références : `01_BIOS_UIUX_References_Chat.md`, `03_UIUX_Pro_Max_SKILL_et_checklists (1).md` et **BIOS Design Guide — Glass Corporate v3.1 (octobre 2026)** fournis au projet. Le ZIP Claude est documentaire, pas une compétence exécutée.
>
> **Décision explicite du 12/10/2026 :** adoption du HTML BIOS **au plus près**, y compris palette, Schibsted Grotesk, IBM Plex Mono, rayons et glassmorphism. Elle **supplante les anciennes décisions visuelles** `#EA7C29` / IBM Plex Sans *pour la cible future*, sans autoriser une modification brutale de l'application ni des workflows V1.

## 1. Périmètre exact de cette PR

- Figer la **cible visuelle**, les conflits avec les tokens et les composants existants.
- Ajouter trois écrans témoins (Dashboard, Inbox, Nouveau ticket), en clair et en sombre, dans un HTML autonome qui fonctionne **sans authentification, base de données, serveur ni API**.
- Ajouter des tests de contrat **métier et de référence** sans réécrire les tests des anciennes couleurs.
- Définir une **stratégie de prévisualisation isolée et de retour arrière** pour les PR suivantes.

**Hors périmètre :** aucun import du HTML dans `app/globals.css`, aucune modification de `styles/tokens.css`, `styles/legacy.css`, `app/layout.tsx`, `components/app-shell.tsx`, `components/admin-shell.tsx`, API, permissions, données ou boutons existants. Le thème en production reste inchangé après fusion de cette seule PR.

## 2. Contrats de style tirés du guide

| Domaine | BIOS v3.1 | Contraintes pour la migration |
|---|---|---|
| Action principale | Orange `#E8702A`, variante `#D4601D` | Une seule action dominante par vue ; **texte Ink** `#14201D` sur l'orange 500 (5,41:1), jamais du blanc 14 px (3,10:1). |
| Surfaces | Canvas `#EEF0EC`, Ink `#14201D`, Ink 2 `#3A4744`, Muted `#5E6B67` | Vérifier aussi les mélanges sur halos en arrière-plan. |
| Séparateurs | `#E2E5E2` | Bordures discrètes, visibles en clair/sombre. |
| Sémantique | Succès `#1F7A55`, erreur `#B42323`, attention `#93590A`, info `#1F5FAE` | Couleur **et libellé**, contraste WCAG AA. |
| Typo | Schibsted Grotesk 700 titres, IBM Plex Mono chiffres | Corps lisible en 14 px, méta 13 px, overline 11 px, titres 24 px, section 16 px, display 32 px. IBM Plex Sans peut servir de corps **jusqu'à arbitrage vérifié du guide**. |
| Cartes | Blanc 62 %, flou 20 px, bordure intérieure claire | Rayon 10 px, fallback opaque, `prefers-reduced-motion`, contrôle des performances. |
| Menus | Blanc 82 % | Vérifier styles calculés et contraste en dark. |
| Contrôles | Rayon 6 px, hauteur 40 px ou 36 px compact | Focus visible orange ; cibles tactiles autour de 44 px si le contexte l'exige. |
| Structure | Sidebar 240 px / 64 px, topbar 56 px, contenu 1360 px | Conserver la **navigation et les routes existantes** : le changement 68→64 px est purement dimensionnel et doit passer la recette. |
| Espacement | Grille 4 px, page 32, cartes 22, gap 18 | Adapter le padding mobile sans chevauchement ni scroll horizontal inutile. |

**Contraste à traiter :** blanc sur Orange 500 = **3,10:1** (insuffisant normal), Ink sur Orange 500 = **5,41:1** ; orange textuel `#B8520F` sur canvas = **4,31:1** (ne suffit pas pour du texte normal). Le guide n'est pas une dispense de WCAG. La déclinaison sombre du témoin est un **prototype technique**, pas une palette sombre officielle fournie par le guide.

## 3. État réel 1TASK — conflits à migrer volontairement

| Sujet | État `main` au départ de PR 01 | Prochain lot |
|---|---|---|
| Tokens | `styles/tokens.css` : `#EA7C29`, `#C4510D`, `#F8F9FB`, Ink `#202124` | PR 02, uniquement sous variante opt-in d'abord |
| Police | `app/layout.tsx` charge IBM Plex Sans, `--kit-font-mono` système | PR 02, chargement maîtrisé des nouvelles familles |
| Rayons | `--kit-radius-lg: 16px`, contrôles 8/12 px | PR 03, composants partagés et états |
| Surfaces | `.kit-card` opaque, glass principalement en topbar | PR 03, vérifier blur 20 px et fallback |
| Shell | Topbar 56, sidebar 240/68, contenu 1440 | PR 04, CSS seulement, **ne pas remanier les liens** |
| Héritage | `styles/legacy.css` ~383 Ko et nombreuses règles `!important`, plus `legacy-bridge.css` | PR 06, nettoyage prouvé sélecteur par sélecteur |
| Tests historiques | Palette initiale exigée par `tests/bios-theme-palette.test.ts`, `tests/uiux-bios-1task-finish.test.ts` et `tests/uiux-semantic-contrast.test.ts` | PR 02 : migrer **explicitement** les tests de couleurs vers les nouvelles variables, sans affaiblir les tests fonctionnels |

Ne pas renommer massivement les variables `--kit-*` : elles sont une API CSS consommée par le legacy bridge, les primitives et les composants. Changer les **valeurs derrière les tokens**, une fois la variante approuvée, évite de casser les appels.

## 4. Hiérarchie des trois témoins

**Dashboard :** contexte/titre → trois indicateurs compacts à périmètre explicitement illustratif → zone de tickets récents. Aucun « KPI global » inventé dans l'application.

**Inbox :** titre/contexte → **un groupe** recherche + filtres → tickets → aperçu/prise en charge existants (la maquette n'imite pas ces actions réelles). Desktop = liste prioritaire ; mobile = densité adaptée au conteneur, rails secondaires escamotables.

**Nouveau ticket :** titre/aide → département/service → objet/description → confirmation et sortie. **Un seul Nouveau ticket global dans le shell** ; sur la vue formulaire du témoin, il est masqué visuellement pour laisser l'action « Créer le ticket » comme action dominante. La V1 doit conserver routage, idempotence, confidentialité selon permissions et redirection.

## 5. Contrat de prévisualisation / retour arrière

La PR 01 **ne déploie aucun sélecteur de thème dans l'application**. La prévisualisation HTML n'impacte aucun utilisateur. Pour PR 02–04 :

1. Implémenter un opt-in **désactivé par défaut** dans une préversion de déploiement, par exemple `data-visual-profile="bios-glass-v31"` sur la racine ; ne pas se servir de `data-theme` pour mélanger choix esthétique et clair/sombre.
2. Conserver les tokens et le rendu actuels comme **fallback stable** tant que les captures et les parcours n'ont pas été approuvés.
3. Tester clair/sombre et le changement de largeur **avec la variante activée** ; désactiver le flag ou revenir au commit stable pour le retour arrière.
4. Migrer, après validation, les valeurs communes `--kit-*` avec une PR séparée et tests mis à jour. Aucune nouvelle préférence compte ou API ne doit être déployée uniquement pour ce témoin.

**Arrêt / rollback :** blocage CI V1, régression création/traitement, altération permissions/confidentialité, contraste insuffisant, focus piégé, filtre dupliqué ou overlap sur 320/375/390 px. Si une de ces conditions apparaît, *ne pas fusionner* ; en préversion désactiver la variante, en production revenir à la dernière révision stable.

## 6. Preuves et recette manuelle (non automatisées par cette PR)

Le fichier `reference.html` peut être ouvert dans un navigateur ou servi par un serveur statique. Le contrôle de vue (Dashboard, Inbox, Création) et clair/sombre concerne **uniquement cette maquette**.

Une **capture d'application réelle V1** exige une session de test authentifiée et reste à obtenir. Ne jamais étiqueter des images du témoin comme captures de production.

Matrice obligatoire à renseigner sur la PR 02–04 :

| Vue | Largeurs | Clair | Sombre | Clavier | Contraste calculé | Parcours V1 |
|---|---|---|---|---|---|---|
| Dashboard | 320, 375, 390, 768, 1024, 1280, 1440 | À vérifier | À vérifier | À vérifier | À mesurer | À vérifier |
| Inbox | mêmes largeurs + sidebar ouverte/repliée | À vérifier | À vérifier | À vérifier | À mesurer | À vérifier |
| Nouveau ticket | mêmes largeurs + états erreur/chargement | À vérifier | À vérifier | À vérifier | À mesurer | À vérifier |

Captures attendues par écran / thème : **production actuelle**, **référence autonome**, **préversion opt-in**. Comparer structure, largeurs calculées, couleurs, halo, relief, texte, pagination, focus et effet de flou. Aucun résultat de contraste ne peut être inféré d'un test de présence d'une classe CSS.

## 7. Conditions de fusion de la PR 01

- Seuls des fichiers `docs/uiux/bios-glass-v31/*` et un test `tests/uiux-bios-glass-pr01-reference.test.ts` sont changés.
- `npm run validate` réussit en V1 **et** Full, sans désactivation d'aucun test existant.
- Le HTML isolé montre ses trois témoins et ses deux thèmes sans appel API ni navigation de production.
- Aucun changement de comportement, de police ou de couleur **visible en production**.

Le lot 07 des fonctionnalités Full reste suspendu. PR 02 n'est autorisée qu'après revue de la référence et de ce périmètre.
