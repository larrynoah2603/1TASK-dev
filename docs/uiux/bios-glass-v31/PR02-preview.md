# BIOS Glass Corporate v3.1 — PR 02 : Palette et typographies en prévisualisation isolée

> **Non activé en production.** PR 02 présente la véritable palette BIOS et les polices Schibsted Grotesk / IBM Plex Mono **uniquement après activation volontaire sur un déploiement Vercel Preview ou en développement**. La V1 en production continue à utiliser les tokens initiaux de `styles/tokens.css`.

Références : [PR 01 — spécification, conflits et recette](./README.md) · [référence HTML autonome](./reference.html).

## Activation de la prévisualisation

1. Ouvrir un déploiement **Vercel Preview** de cette branche (ou démarrer le serveur local en développement).
2. Se connecter avec un **compte de test habilité** et ouvrir le Dashboard, l'Inbox ou « Créer un ticket ».
3. Cliquer sur le bouton fixé en bas à droite **« Tester BIOS Glass v3.1 »** pour activer les couleurs et fontes BIOS sur les interfaces réelles.
4. Utiliser le bouton **« BIOS Glass · Actif — Revenir à 1TASK »** pour restaurer immédiatement l'identité précédente, sans rechargement.
5. La préférence n'est mémorisée que dans `sessionStorage` de cet onglet de préversion (pas en base ni dans la production), et est conservée lors de la navigation et du rechargement.
6. Répéter les comparaisons avec le bouton `ThemeToggle` existant pour **clair et sombre**, sans créer une deuxième commande de thème dans l'application.

Le contrôle est monté depuis `app/layout.tsx` seulement si `VERCEL_ENV === "preview"` ou `NODE_ENV === "development"`. **Le code de production ne rend pas le toggle et aucun `data-visual-profile` n'y est posé par 1TASK**. Le CSS est inerte sans `html[data-visual-profile="bios-glass-v31"]`.

**Attention :** la variante concerne les valeurs de palette/typographie, pas encore tous les rayons, cartes translucides ou la sidebar (PR 03–04). Certains styles hérités utilisent encore des couleurs codées en dur : comparer les **styles calculés** plutôt que déclarer une conformité générale d'après les seules variables CSS.

## Tokens en préversion

| Rôle | Palette active de production (inchangée) | Variante BIOS Glass PR 02 |
|---|---|---|
| Marque / action | `#EA7C29` / `#C4510D` | `#E8702A` / `#E8702A` |
| Survol orange | Action sombre historique | `#D86620` (plus clair que le `#D4601D` du guide pour garantir 4,5:1 avec Ink) |
| Liens et petit texte orange | `#C4510D` | `#A6450A` (accessible sur blanc/Canvas ; `#B8520F` du guide n'atteint que 4,31:1 sur Canvas) |
| Texte d'action sur orange | Blanc (ancienne action contrastée) | Ink `#14201D` (blanc sur orange BIOS n'atteint que 3,10:1) |
| Canvas / cartes / lignes | `#F8F9FB` / blanc / `#E2E5E9` | `#EEF0EC` / blanc / `#E2E5E2` |
| Titres / texte secondaire | `#202124` / `#646567` | `#14201D` / `#3A4744` / muted `#5E6B67` |
| Succès / avertissement / erreur / info | Tokens 1TASK initiaux | `#1F7A55` / `#93590A` / `#B42323` / `#1F5FAE` |
| Titres | IBM Plex Sans | **Schibsted Grotesk** 600/700 |
| Références, chiffres | Monospace système | **IBM Plex Mono** 400/600/700 |
| Corps et contrôles | IBM Plex Sans | IBM Plex Sans conservée (jusqu'à décision sur le corps) |
| Dark | Fond actuel `#141517` | Fond témoin BIOS `#101B18` (prototype, à valider visuellement) |

La palette BIOS 600 `#D4601D` reste la couleur du guide mais **n'est pas utilisée directement pour un bouton Ink de texte normal** car son contraste ne serait que 4,38:1. Les exceptions d'accessibilité sont explicites, non des changements de marque arbitraires.

Le CSS réutilise **les mêmes noms `--kit-*`** afin que les composants et le pont CSS historiques continuent à fonctionner ; les valeurs initiales dans `styles/tokens.css` restent intactes.

**Mise à jour PR #97 (stabilisation CI) :** les trois familles sont désormais fournies en local par Fontsource `5.3.0`, avec intégrité SHA-512 dans le lockfile. Les variantes variables IBM Plex Sans et Schibsted Grotesk couvrent les poids précédemment définis ; IBM Plex Mono conserve 400/600/700. Le chargement utilise `font-display: swap`, les tokens `--kit-*` et le toggle BIOS sont inchangés. Aucun téléchargement distant de police n'est nécessaire durant `next build` (incident Next.js `vercel/next.js#99114`).

## Fichiers impactés

- `styles/bios-glass-v31-preview.css` : palette light/dark et typographie uniquement dans le scope `data-visual-profile`.
- `components/uiux/bios-glass-preview-toggle.tsx` : opt-in, état `aria-pressed`, restauration immédiate et stockage temporaire.
- `app/layout.tsx` : variables de polices et garde de montage **hors production** ; aucune navigation modifiée.
- `app/globals.css` : import final de la variante inactive par défaut.
- `tests/uiux-bios-glass-pr02-palette-fonts.test.ts` : scope, garde de production, contrastes sémantiques, polices et invariants V1.
- Le présent document de recette.

## Recette indispensable avant PR 03

| Vue | Clair à 320/390/768/1024/1440 | Sombre à 320/390/768/1024/1440 | Actions & clavier | Résultat |
|---|---|---|---|---|
| Dashboard | À comparer | À comparer | Tab, titres, KPI | À réaliser |
| Inbox | À comparer | À comparer | Filtres uniques, aperçu inline, Claim | À réaliser |
| Nouveau ticket | À comparer | À comparer | Champs, confidentialité, erreur, idempotence, redirection | À réaliser |
| Administration, Actifs | À comparer | À comparer | Permissions, confirmations, tableaux | À réaliser |

Vérifier les **contrastes réellement calculés** sur surfaces opaques et translucides (texte 4,5:1, grandes valeurs 3:1), le focus, les boutons orange et leur état survolé, les textes des statuts, les notifications push et les états mobile. Vérifier le changement de police et l'absence de débordements à 320 px.

Tests CI V1/Full et tests de contrastes du nouveau CSS sont nécessaires mais ne remplacent pas ces vérifications navigateur. **Aucune capture de la V1 authentifiée n'a été réalisée dans cette PR.**

## Retour arrière immédiat

- En Preview : cliquer à nouveau sur le bouton de prévisualisation pour enlever `data-visual-profile`.
- Après rechargement : le switch est mémorisé seulement pour la session de l'onglet ; désactiver directement ou fermer l'onglet.
- En production : la variante n'est jamais activée par l'interface, ni écrite en cookies, base de données ou préférences de compte.
- Si une CI V1/Full échoue, si une police casse le build, si un contraste calculé est insuffisant, ou si un workflow de ticket/notification régresse : **ne pas fusionner** ; corriger la PR. Aucun remplacement global des anciennes couleurs ne doit être effectué dans cette étape.

**Étape suivante (après recette) : PR 03 — composants partagés, rayons, cartes Glass et fallback opaque.** La PR 07 Full reste suspendue.
