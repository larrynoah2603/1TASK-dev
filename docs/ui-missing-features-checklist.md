# Checklist de livraison — compléments UX/UI 1TASK

## Fonctionnalités ajoutées

- [x] Sidebar réellement repliable avec bouton desktop et tiroir mobile.
- [x] Recherche globale dans la barre supérieure, avec raccourci `Ctrl/Cmd + K`.
- [x] Centre de notifications utilisateur : compteur non lu, lecture unitaire/totale et écran dédié.
- [x] Bouton d’aide avec raccourcis et liens d’assistance.
- [x] Menu profil dans la barre supérieure, avec accès au profil, à l’administration et à la déconnexion.
- [x] Fil d’Ariane automatique sur les pages profondes.
- [x] Mode sombre persistant, avec respect de la préférence système au premier chargement.
- [x] Indicateurs dashboard séparés : ouverts, en cours, bloqués, en confirmation et clôturés.
- [x] Tri utilisateur des tickets : mise à jour, plus récents, plus anciens ou statut.
- [x] Pagination serveur réelle sur les tickets, la boîte de réception et les écrans d’administration concernés.
- [x] Prévisualisation complète du ticket avant validation, incluant routage, SLA et confidentialité.
- [x] Fenêtres de confirmation avant les actions sensibles : transitions, affectations, prise en charge et modifications d’administration.
- [x] Indicateurs détaillés par file : urgents, bloqués et tickets à risque SLA.
- [x] Recherche et pagination ajoutées aux écrans d’administration utilisateurs, tickets et audit.
- [x] Toasts généralisés sur les créations, actions ticket, notifications et opérations d’administration.

## Contrôles automatisés exécutés

- [x] `npm run lint`
- [x] `npm run typecheck`
- [x] `npm test` — 84 tests réussis, 3 ignorés.
- [x] `npm run build`
- [x] Authentification conservée sur Microsoft Entra ID uniquement.
- [x] Rôles, permissions serveur, workflow ticket, SLA et routage catalogue conservés.
- [x] Aucune migration Prisma ni donnée métier ajoutée pour ces compléments d’interface.

## Test manuel par rôle et viewport

À exécuter avec une base de démonstration active et des comptes Entra correspondant aux six rôles. Le contrôle doit être réalisé au minimum en desktop `1440×900` et mobile `390×844`.

| Rôle | Desktop | Mobile | Contrôles principaux |
|---|---:|---:|---|
| DEMANDEUR / REQUESTER | [ ] | [ ] | Dashboard, recherche, notifications, création + prévisualisation, suivi de ses tickets |
| AGENT | [ ] | [ ] | Inbox, prise en charge, transitions, commentaires, confirmations, SLA |
| RESPONSABLE_DE_FILE / QUEUE_MANAGER | [ ] | [ ] | Files, indicateurs urgents/bloqués/SLA, affectation et transfert |
| ADMINISTRATEUR_FONCTIONNEL / FUNCTIONAL_ADMIN | [ ] | [ ] | Utilisateurs, règles de notification, configuration fonctionnelle, pagination |
| ADMINISTRATEUR_TECHNIQUE / TECHNICAL_ADMIN | [ ] | [ ] | Configuration technique, audit, recherche/pagination, actions sensibles |
| LECTEUR_REPORTING / REPORTING_READER | [ ] | [ ] | Lecture dashboard/files/tickets, absence d’actions interdites |

### Scénario transversal à répéter

1. Replier puis déplier la sidebar ; ouvrir puis fermer le tiroir mobile après sélection d’un lien.
2. Rechercher un ticket depuis la barre supérieure et ouvrir un résultat.
3. Ouvrir l’aide, le profil, les notifications et basculer clair/sombre.
4. Vérifier le fil d’Ariane sur un ticket et revenir à chaque niveau.
5. Vérifier le tri et les boutons précédent/suivant sur une liste de tickets.
6. Vérifier les confirmations avant chaque action sensible et le toast après succès/échec.
7. Pour le demandeur, aller jusqu’à la prévisualisation puis modifier avant validation.
8. Vérifier l’absence de débordement horizontal et l’accessibilité clavier sur mobile et desktop.

## Correctifs de la vidéo de contrôle

- [x] Contraste renforcé des titres, textes secondaires, badges, alertes et popovers en mode sombre.
- [x] Largeur de la sidebar et décalage du contenu unifiés par le shell global pour éviter tout texte masqué.
- [x] Drawer mobile/tablette fixé hors du flux de la page, avec fermeture par fond ou clic sur un lien.
- [x] Responsive du topbar corrigé : la recherche passe sous les actions lorsque l’espace horizontal est insuffisant.
- [x] Breakpoint tablette traité comme navigation drawer jusqu’à 1023 px ; sidebar fixe/repliable à partir de 1024 px.

## Compléments ticket avancés appliqués

- [x] Panneau UI de qualification impact/urgence, échéance légale, priorité et justification d’audit.
- [x] Panneau UI de liens typés entre tickets avec recherche de tickets visibles.
- [x] Panneau UI de dérogation SLA avec minutes ajoutées, motif et confirmation.
- [x] Upload sécurisé de pièces jointes avec limite de 10 Mo et types autorisés.
- [x] Liste et téléchargement contrôlé des pièces jointes selon la visibilité du ticket et des messages internes.
- [x] Contrôles serveur conservés pour les quatre fonctionnalités avancées.
- [x] Matrice de validation manuelle créée dans `docs/manual-validation-matrix.md`.

## Validation manuelle restante

Les scénarios de la matrice `ADV-*`, `SEC-*` et par rôle doivent être exécutés avec des comptes Entra de test, deux départements, deux files et deux équipes. Les cases ne sont pas cochées automatiquement : elles nécessitent une exécution réelle avec les données de démonstration et la conservation des preuves.
