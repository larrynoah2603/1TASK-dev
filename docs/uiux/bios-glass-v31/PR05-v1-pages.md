# BIOS Glass Corporate v3.1 — PR 05 : généralisation des pages V1

> **Prévisualisation uniquement**. CSS activée seulement sous `html[data-visual-profile="bios-glass-v31"]` (contrôle réservé à Vercel Preview / développement par PR02). Sans activation, 1TASK en production garde son ancien rendu. **Aucun** composant TSX, API, schéma, politique de rôle ou navigation modifié.

Références : [guide et décision de migration](./README.md) · [PR02](./PR02-preview.md) · [PR03](./PR03-components.md) · [PR04](./PR04-shell-v1.md) · [référence HTML autonome](./reference.html).

## Important : état des PR précédentes et base de cette PR

- La PR #95 a été fusionnée dans `main` **le 13/10/2026 à 07:00 UTC**.
- La PR #96 a été fusionnée à **07:17 UTC dans l'ancienne branche de #95**, *après* fusion de #95 dans `main`. Bien que GitHub affiche #96 « merged », `styles/bios-glass-v31-shell-v1.css` n'est donc **pas encore dans `main`**.
- **PR #97, brouillon** : rattrapage séparé PR04 vers `main`.
- Cette PR05 est empilée sur **`uiux/bios-glass-v31-pr04-shell-dashboard-inbox-ticket-20261013`** ; elle doit rester distincte de #97. L'ordre de fusion requis est **#97 → PR05**, puis contrôle CI `main`.
- Les tests CI ne remplacent pas la recette visuelle sur une session V1 authentifiée.

## Diagnostic du code V1

| Vue actuelle | Source vérifiée | Écart par rapport au guide BIOS | Solution PR05 |
|---|---|---|---|
| Détail ticket | `app/(app)/tickets/[id]/page.tsx` : `kit-ticket`, `kit-panel`, `ticket-treatment-rail` | Mélange de panneaux opaques et cartes / titres hétérogènes | Cartes de lecture Glass 62 % ; rail inchangé ; titre Schibsted et référence IBM Plex Mono |
| Responsable de file | `app/(app)/queues/page.tsx`, `queues-industrial` | Cartes KPI et sous-compteurs encore opaques | Surface Glass, chiffres monospace, sous-compteurs opaques contrastés |
| Administration | `app/admin/page.tsx`, `styles/admin-workspace.css` | Fonds `!important` sur plusieurs cartes, rayons différents | Glass ciblé sur cartes ; formulaires et confirmations quasi opaques |
| Actifs | `components/asset-list-client.tsx`, `styles/asset-workspace.css` | Inventaire et fiches mélangent styles, mobile déjà travaillé | Cartes BIOS ; conserver `data-label`, scroll clavier, format mobile et approbation |
| Reporting | `app/(app)/reporting/page.tsx`, `styles/reporting-notifications.css` | Fonds, filtres et résultats peu harmonisés | Surface Glass pour lecture ; sélecteur serveur inchangé |
| Notifications | `components/notifications/notifications-page.tsx` | En-tête/liste opaque | Carte Glass ; différenciation « non lue » maintenue ; push/pagination inchangés |
| Profil | `app/(app)/profile/page.tsx` | Carte identité opaque, variantes de rayon | Carte et titre BIOS ; champs longs et rôles cumulables non rognés |

Les composants possèdent **déjà** des tokens CSS `--kit-*`. Nous réutilisons `--bios-glass-*` de la PR03 et ne modifions aucun comportement React.

## Hiérarchie d'information cible

- **Détail ticket** : référence + titre → état et SLA → traitement (actions existantes et rail) → demande/conversation/historique ; aucune information supprimée.
- **Files** : titre et contexte de supervision → cartes de file → indicateurs discrets → ouverture de la file existante ; aucun KPI inventé.
- **Administration** : contexte et droits → indicateurs opérationnels → gestion et paramètres ; confirmations non translucides.
- **Actifs** : synthèse compacte → barre de filtres unique → inventaire → création/détails autorisés ; aucun bouton ajouté.
- **Reporting** : période sélectionnée + actions autorisées → KPI → courbes et détails ; période/ACL et CSV inchangés.
- **Notifications** : en-tête et actions → filtres → groupes → items/pagination ; statuts non lus visibles en plus de leur couleur.
- **Profil** : identité → affectations, équipes et rôles multiples → informations en lecture seule.

## Desktop, tablette, mobile et accessibilité

- **1280–1440 px** : conserver les grilles/rails métiers existants ; cartes à rayon 10 px et 62 % de blanc, chiffres IBM Plex Mono, titres Schibsted Grotesk. Textes opaques et lisibles.
- **768–1024 px** : ne pas modifier la structure des grilles ; vérifier panneaux de détail, tableaux et barre latérale repliée, particulièrement les rails de ticket.
- **320 / 375 / 390 px** : conserver les tableaux d'actifs en cartes via `data-label` et les débordements de tables uniquement quand nécessaire. Aucune commande cachée, aucune nouvelle colonne.
- **Thèmes clair/sombre** : palette de PR02, surfaces Glass de PR03, opacity sombre 85 % ; états success/attention/danger/info toujours textuels. Veiller aux informations colorées sur arrière-plans variables.
- **Accessibilité** : contraste texte normal ≥4,5:1, grands textes / iconographie significative ≥3:1, focus visible, support `prefers-reduced-motion` et `prefers-reduced-transparency`, fallback opaque en absence de backdrop-filter.
- Les formulaires, confirmations, listes déroulantes et régions modales gardent `--bios-glass-raised` **96–97 % opaques**.
- Performance : limiter flou 20 px aux cartes/surfaces pertinentes ; mesurer la fluidité sur smartphone.

## Risques de régression et contournements

1. **CSS historique** : `legacy-bridge.css` utilise `!important` pour les fonds `.panel`, `.metric-card` et certaines surfaces ; nos sélecteurs opt-in ajoutent `!important` **seulement sur les composants ciblés** et respectent leurs dimensions. Ne pas supprimer massivement `legacy.css`.
2. **Visibilité des actions** : conserver `getTicketForViewer`, sécurité confidentielle, prise en charge, notifications et gestion d'actifs ; aucun JSX métier n'est modifié. Tester la visibilité des boutons par rôle.
3. **Contrastes sur halos Glass** : le CSS source ne valide pas les couleurs calculées réelles ; mesurer sur un élément de chaque groupe en clair et sombre.
4. **Tableaux** : les vues mobiles `asset-inventory-table` et `asset-review-table` ont des règles responsive spécifiques. Ne pas écraser `display`, `grid-template-columns`, `overflow-x` ou les libellés.
5. **Filtres** : la PR ne crée aucune barre ou contrôle, et ne modifie aucun paramètre de requête.
6. **Dépendance de branches** : #97 doit être revue et fusionnée **avant** cette PR pour éviter une perte silencieuse des styles PR04.

## Plan de vérification

| Scénario | CI de contrat | Vérification navigateur / compte test |
|---|---|---|
| Création/routage/confidentialité/idempotence | Anciens tests + nouveau contrat | Soumettre ticket autorisé, prendre en charge et clôturer |
| Détail ticket | Contrat de présence composants | Actions, timeline, conversation, rail sticky et petits écrans |
| Admin multi-rôle | Tests existants | Admin fonctionnel + responsable de file, habilitations |
| Actifs | Tests existants | Inventaire desktop/mobile, création, demande, approbation |
| Reporting | Tests serveur existants | Comparer 7/30j et export CSV autorisé |
| Notifications & push | Tests outbox/push existants | Notification délivrée avec onglet en arrière-plan |
| Visuel BIOS | Parsing PostCSS + sélecteurs opt-in | Captures avant/après à 320,375,390,768,1024,1280,1440 px ; light/dark |
| A11y | Présence focus/fallback | Naviguer au clavier, vérifier contrastes calculés et réduction transparence |
| Production | CI V1/Full | Vérifier absence de nouveau rendu sans activation opt-in |

**Rollback :** sur Vercel Preview, cliquer sur « BIOS Glass · Actif — Revenir à 1TASK ». Ne fusionner aucune migration fonctionnelle ; le style habituel reste défaut production. PR06 traitera le nettoyage ciblé des règles historiques *après* preuve visuelle, et non la suppression aveugle du CSS.

**Lot 07 Full toujours suspendu.**
