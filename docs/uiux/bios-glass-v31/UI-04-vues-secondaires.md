# UI-04 — Conformité des vues secondaires BIOS Glass Corporate v3.1

**Date :** 14 octobre 2026. Références : `01_BIOS_UIUX_References_Chat.md`, `03_UIUX_Pro_Max_SKILL_et_checklists (1).md`, `BIOS Design Guide - Glass Corporate(2).html`, UI-01 à UI-03 et les tokens réellement validés dans le dépôt 1TASK.

## Diagnostic concret du dépôt `main`

- **Administration** : les primitives `.admin-industrial` et `.admin-console-page` existent, mais la page d'accueil admin comporte `.admin-dashboard-industrial` et les cartes `.admin-stat` / `.metric-card`. Les styles BIOS n'assurent pas toujours une présentation numérique identique ou une largeur de carte résiliente à chaque famille.
- **Reporting** : `app/admin/reporting/page.tsx` possède déjà les tokens sémantiques du lot UI-02 et le filtrage serveur existant. La distribution par statut utilise une ligne flex avec libellé fixe `w-48`, barre flex et nombre `w-10` : sous 640 px, cette structure peut comprimer la barre.
- **Actifs** : `styles/asset-workspace.css` réalise **déjà** l'essentiel du responsive par conteneur et préserve les libellés `data-label`. Il ne faut pas supprimer/dupliquer ces règles. UI-04 ajoute uniquement des contraintes de largeur et de lisibilité des compteurs/boutons.
- **Notifications** : groupes, curseur de pagination et état non-lu existent déjà. Le style spécifique conserve un fond sélectionné ; UI-04 renforce le repère non-lu sans dépendre de la seule couleur et protège les contenus longs des débordements.
- **Profil** : l'identité, la photo et les rôles multiples sont affichés en lecture seule, déjà liés aux tokens. Les longues adresses e-mail et l'en-tête avec avatar nécessitent un retour à la ligne et un flex wrap sur très petits écrans.
- **Connexion / affectation Entra** : `app/signin/page.tsx` et `app/pending-assignment/page.tsx` contiennent toujours `text-slate-950`, `text-slate-600`, `bg-slate-950`, `bg-slate-50`, `bg-amber-50`, `bg-rose-50` et assimilés. Ces couleurs Tailwind fixes contredisent le thème sémantique sombre déjà exposé par BIOS. Elles sont remplacées par `--kit-text`, `--kit-text-2`, `--kit-bg`, `--kit-warning-soft`, `--kit-danger-soft` **sans changer la fonction de connexion ni les redirections**.

## Nouvelle hiérarchie d'information

1. **Administration** : titre + périmètre du rôle, données essentielles, commandes de gestion existantes, listes/tableaux et informations secondaires. Les nombres restent lisibles en monospace.
2. **Actifs** : résumé compact → filtre existant unique → inventaire ou demandes d'approbation → actions existantes. Aucun double bouton Nouveau.
3. **Reporting** : titre / filtre existant → trois KPI → lignes de répartition lisibles sur mobile (texte et nombre d'abord, barre sur la ligne suivante si nécessaire).
4. **Notifications** : titre et contrôles de lecture → filtres existants → groupes par date → élément non lu lisible et identifiable → pagination.
5. **Profil / Entra** : identité et message d'accès → données et rôles → action existante, sans ajout de paramètre ni de rôles automatiques.

## Changements circonscrits

| Fichier | Effet visuel | Risque métier |
|---|---|---|
| `app/signin/page.tsx` | Texte, explication, erreur Entra et aide adaptatifs clair/sombre via tokens existants | Nul attendu : `signIn()` et callback inchangés |
| `app/pending-assignment/page.tsx` | Fond, carte, avertissement, texte et détails d'identité adaptés clair/sombre | Nul attendu : contrôle de statut et redirections inchangés |
| `styles/bios-glass-v31-v1-pages.css` | Finition **scopée** BIOS : cartes admin, compteurs, répartition reporting compacte, actifs, notifications, profil, focus et mobile | Faible à modéré : cascade CSS et disposition responsive à recetter |
| `tests/uiux-bios-glass-ui04-pages.test.ts` | Tests des tokens, validité des sélecteurs, parcours et composants inchangés | Aucun |
| Ce document | Diagnostic, variants, régression et recette | Aucun |

**Aucune modification** des pages métier admin, contrôles de permission, API, routage confidential, tests V1 précédents, données Prisma, paramètres Microsoft, navigation, notifications Push, SLA, actifs ou traitements.

## Variantes et vérification

| Format | Attendu |
|---|---|
| **PC ≥1280px** | Administration et reporting en cartes alignées, espaces utiles préservés, titres 24px, notification lisible sans sur-accentuation |
| **Portable/tablette 768–1279px** | Tableaux/actifs continuent à utiliser leurs containers responsive et scroll locaux. Filtre unique et actions restent identifiables |
| **Mobile 320–767px** | Carte Entra pleine largeur, titres et détails en retour à la ligne, en-tête profil/avatar flex wrap, histogrammes horizontaux du reporting réagencés, notifications sans dépassement |
| **Clair/sombre** | Pas de texte Slate fixe dans les écrans Entra ; réemploi des tokens 1TASK + profil BIOS, messages d'erreur/aide contrastés |
| **Clavier** | Focus visible sur entrées, liens et boutons ; composants de filtrage et d'approbation restent utilisables |
| **Transparence réduite** | Le fallback de la CSS PR05 existante garde les surfaces opaques, sans retirer les confirmations ou actions |

**Tests de recette à effectuer sur un navigateur authentifié :** captures à 320, 375, 390, 768, 1024, 1280, 1440 px, contrastes 4,5:1 pour texte normal et 3:1 pour grands textes et contrôles importants ; zoom 200 %, clavier Tab/Entrée, modes clair/sombre, modal actif, notification non lue, ancien navigateur ou sans blur. Vérifier utilisateurs à rôles cumulés, attente Entra, accessibilité, demandes d'actifs, CSV et paginations.

## Risques de régression / garde-fous

- Les composants mobiles d'actifs sont déjà documentés et basés sur `data-label` ; aucune transformation de tableau ni action d'approbation n'a été tentée.
- Le message d'attente Entra reste purement informatif et ne modifie pas les règles d'approbation.
- Le retrait des couleurs Tailwind fixes peut modifier l'apparence **hors BIOS**, puisqu'elles utilisent désormais les tokens 1TASK : recette clair/sombre nécessaire **dans les deux profils**. Les changements restent décoratifs.
- Un CSS sémantique ne garantit pas à lui seul le contraste des surfaces Glass translucides ; UI-05/UI-06 doivent encore mesurer le rendu réel.
- Les éléments métier, boutons et filtres ne sont ni déplacés ni dupliqués. La navigation et les notifications sont inchangées.
- Les tests CI sont des contrôles de non-régression ; ils ne prouvent pas la conformité visuelle de l'ensemble des vues.

**UI-04 reste une PR séparée, non fusionnée avant approbation.** UI-05 et UI-06 suivront pour les captures, contrastes et clôture de conformité.
