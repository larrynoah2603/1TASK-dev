# Audit UI/UX et module actifs — 29 septembre 2026

## Méthode et périmètre avant modification

L’audit statique a couvert le shell App Router, les tableaux de bord, tickets, vues d’administration et utilisateurs,
formulaires/modales, pages de détail, tables et paramètres. La logique de ticketing et l’authentification n’ont pas été
modifiées. Les composants existants ont été conservés ; le nouveau parcours réutilise leurs classes et les tokens du design
system (`--kit-*`).

| Fichier / interface | Problème observé | Correction proposée / appliquée |
|---|---|---|
| `components/app-shell.tsx` | L’inventaire était réservé à l’admin et aucun accès personnel n’existait. | Séparer « Mes actifs », « Inventaire » et « Demandes d’actifs », avec visibilité liée au rôle. |
| `app/(app)/dashboard/page.tsx` | L’action de demande d’équipement était absente du parcours quotidien. | Ajouter un appel à l’action visible qui ouvre le formulaire sans quitter le dashboard. |
| `components/asset-list-client.tsx` | Formulaire de création dense, champs techniques présentés dans un seul bloc. | Conserver la logique existante et appliquer progressivement les sections « informations / affectation / actions ». |
| `components/asset-detail-actions.tsx` | Modal compacte mais labels, aide et regroupement perfectibles. | Aligner à terme sur `form-section`, `field-help` et `form-actions` introduits par le module. |
| `components/new-ticket-form.tsx` | Formulaire riche et long ; charge cognitive élevée sur mobile. | Conserver le workflow métier, renforcer les sections, descriptions et erreurs contextualisées. |
| `components/admin-configuration-panel.tsx` | Plusieurs formulaires administratifs cohabitent sur une page dense. | Regrouper par entité, maintenir un pied d’actions stable et harmoniser le rythme vertical. |
| `components/admin-user-actions.tsx` | Actions sensibles nombreuses et hiérarchie visuelle variable. | Employer les variantes Primary / Secondary / Danger / Success et isoler les actions destructives. |
| `app/admin/users/page.tsx` | Table orientée desktop et actions difficiles à parcourir. | Conserver la table, renforcer le conteneur responsive, les badges et le regroupement des actions. |
| `app/(app)/tickets/page.tsx` | Filtres, vue et actions rivalisent dans l’en-tête. | Préserver les composants existants, ordonner recherche → filtres → changement de vue → action principale. |
| `app/(app)/tickets/[id]/page.tsx` | Page très riche, risque de densité et de scroll important. | Maintenir la colonne d’actions et les panneaux repliables existants ; ne pas toucher au workflow. |
| `app/(app)/profile/page.tsx` | Paramètres lisibles mais sans langage commun explicite pour les sections. | Appliquer le même patron titre, aide courte, contenu et actions. |
| `styles/design-system.css` | Les écrans historiques utilisent encore plusieurs familles de cartes et tables. | Introduire un patron SaaS unifié : rayon, padding, ombre, header de table, hover, badges et actions. |

## Design appliqué

- Cartes : surface, bordure, rayon et ombre issus des tokens communs.
- Formulaires : deux sections sémantiques, aides courtes, erreurs visibles et pied d’actions hiérarchisé.
- Boutons : primaire (soumission), secondaire (annulation), succès (approbation), danger (refus).
- Tables : en-tête contrasté, survol de ligne, badges de statut et actions groupées ; défilement horizontal maîtrisé.
- Responsive : grilles ramenées à une colonne, actions pleine largeur et modale limitée à la hauteur du viewport.

## Architecture et sécurité du module

`AssetRequest` relie le demandeur, l’actif éventuellement attribué et le validateur. Les services constituent l’unique accès
Prisma. « Mes actifs » filtre toujours avec l’identifiant issu de la session, jamais avec un paramètre client. Les listes et
décisions globales appellent le garde d’administrateur fonctionnel global. L’approbation vérifie à nouveau, dans une transaction,
que l’actif est actif, libre et du bon type, puis enregistre affectation, mouvement, décision, audit et notification. Le refus
exige un motif et notifie également l’utilisateur.

## Captures

Les captures ont été retirées du commit car l’interface de création de pull request Codex ne prend pas en charge les fichiers
binaires. Le protocole reproductible et les noms de sortie attendus sont documentés dans `docs/screenshots/README.md`. Cela
conserve la recette visuelle sans bloquer la revue du diff ni ajouter de binaires au dépôt.
