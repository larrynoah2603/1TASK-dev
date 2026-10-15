# 1TASK — Design system MASTER (refonte UI/UX Pro Max)

Source de vérité visuelle pour toutes les pages. Une page peut être précisée par
`design-system/1task/pages/<page>.md` ; dans ce cas, le fichier de page prévaut.

Implémentation : tokens dans `styles/bios-glass-v31-preview.css`, badges dans
`styles/bios-glass-v31-components.css`, polices historiques raccordées aux tokens
à leur source dans `styles/legacy.css`. `styles/uupm-refonte.css` reste importé
en dernier ; aucune nouvelle feuille de surcharge n’est ajoutée.
`components/status-badge.tsx` expose maintenant des variantes de présentation
explicites. Aucun changement d’API, de schéma, de permission ou de workflow.

## 1. Analyse

| Élément | Valeur |
|---|---|
| Produit | Service desk interne (tickets, SLA, actifs, reporting, administration) |
| Utilisateurs | Demandeurs ponctuels + agents / responsables de file qui y passent la journée |
| Contexte | Poste de travail (1280–1440 px) en priorité, consultation mobile (375–390 px) |
| Stack | Next.js 16 (App Router), React 19, Tailwind CSS 4, Recharts, lucide-react |
| Identité | Charte BIOS « Glass Corporate v3.1 » déjà adoptée (profil `bios-glass-v31`) |

Réglages (« dials ») retenus : **variance 3** (sobre, centré sur la donnée),
**mouvement 3** (micro-interactions seulement), **densité 6** (outil de travail
quotidien, échelle 8–32 px).

## 2. Décisions

1. **Structure** : sidebar + topbar inchangées ; contenu = en-tête de page →
   indicateurs → zone de travail. Une seule action primaire par vue (« Nouveau ticket »).
2. **Style** : BIOS Glass discipliné. Le verre (translucide + flou) est réservé aux
   surfaces de structure ; **tout ce qui s'édite ou se lit en continu (tableaux,
   formulaires, panneaux d'aide) est opaque**. Pas de cadre dans un cadre.
3. **Couleurs** (tokens `--kit-*` existants, valeurs BIOS) :
   - action `--kit-primary` #E8702A avec texte Ink (jamais de blanc sur l'orange) ;
   - texte orange = `--kit-primary-text` (#A6450A clair / #FFB57D sombre), jamais l'orange 500 ;
   - statut ≠ priorité : statut = pastille pleine, priorité = pastille contour ;
   - graphiques : `--chart-1…5` (étaient indéfinis → barres noires).
4. **Typographie** : Schibsted Grotesk (corps et contrôles ; titres en 700),
   IBM Plex Mono réservé aux **références et chiffres**. Échelle 12 / 13 / 14 / 16 / 18 / 24 / 32.
   **Aucun texte sous 12 px.**
5. **Espacement / effets** : grille 4 px ; rayons 6 (contrôles) / 10 (cartes) / 999 (pastilles) ;
   une seule échelle d'ombre (`--kit-shadow-sm/md/lg`).
6. **Mouvement** : 120 ms (feedback) / 180 ms (états) / ease `cubic-bezier(.2,0,0,1)` ;
   transform + opacity uniquement ; `prefers-reduced-motion` coupe tout.
7. **À éviter** : texte clair sur fond clair en mode sombre (couleurs codées en dur
   dans `legacy.css`), pastilles étirées sur toute la colonne, empilement
   carte → carte → carte, glyphes Unicode comme icônes, focus invisible, cibles < 24 px.

## 3. Objectifs d’accessibilité et état de validation

- Contraste texte ≥ 4,5:1 (≥ 3:1 au-delà de 24 px ou 18,7 px gras), en clair **et** en sombre.
- Focus visible : anneau 2 px `--kit-primary` + décalage 2 px sur tout élément interactif.
- Cibles : ≥ 24×24 px partout (WCAG 2.2 AA), ≥ 44 px pour les actions principales mobiles.
- Pas de défilement horizontal de page à 375/390 px.

Ces seuils sont des objectifs, pas une certification de toutes les pages.
La recette du 14/10/2026 couvre le rendu de `/signin` et des composants réels
isolés avec des données fictives, sous profil BIOS actif. Voir
`docs/uiux/bios-glass-v31/UI-06-corrections-validation.md` pour les mesures,
captures et limites. Les parcours authentifiés restent à vérifier.

## 4. Retour arrière

La couche ne s'applique que sous `html[data-visual-profile="bios-glass-v31"]`
(sauf les tokens `--chart-*`, qui corrigent un bug commun aux deux profils).
En production, `BIOS_GLASS_ENABLED=false` désactive le profil BIOS ; en
préversion, désactiver également son opt-in dans l’interface. Retirer seulement
l’import `uupm-refonte.css` ne retire ni les tokens BIOS ni les variantes de badges.
Pour annuler cette correction ciblée, inverser son patch incrémental sur la même
base, après vérification de son applicabilité et des changements locaux.

## 5. Complément UI-07 — lisibilité de la liste agent

La liste conserve ses modes cartes / quatre colonnes / sept colonnes selon la
largeur de son conteneur. Les références au format réel restent sur une ligne,
le sujet est limité à deux lignes dans le tableau et reste complet dans les
détails rapides. Les métadonnées ont des largeurs réservées ; le sujet utilise
l’espace restant. Les badges se regroupent lorsque la largeur le permet.
`components/inbox/agent-ticket-table.tsx` et `styles/design-system.css` portent
ces changements de présentation. Voir `docs/uiux/bios-glass-v31/UI-07-inbox-lisibilite.md`
pour les preuves et la limite de recette authentifiée.
