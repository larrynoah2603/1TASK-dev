# Matrice de validation manuelle — tickets avancés et cloisonnement 1TASK

## Objectif

Cette matrice valide les panneaux de qualification, liens typés, dérogation SLA et pièces jointes, puis vérifie que les contrôles de visibilité sont appliqués par l’interface et par les routes serveur.

## Préparation des données

Créer ou identifier deux départements actifs, deux files et deux équipes cohérentes : `DEPT-A / QUEUE-A / TEAM-A` et `DEPT-B / QUEUE-B / TEAM-B`. Préparer un ticket normal et un ticket confidentiel dans chaque département, ainsi qu’un client, un dossier, une mission, un actif et un article de connaissance par département.

Créer six comptes actifs de test : `REQUESTER`, `AGENT`, `QUEUE_MANAGER`, `FUNCTIONAL_ADMIN`, `TECHNICAL_ADMIN` et `REPORTING_READER`. Documenter pour chaque compte l’attribution `UserRole`, le `scopeId`, le département, l’équipe et la file. Une attribution globale doit avoir `scopeId = NULL` ; une attribution limitée doit pointer vers un `PermissionScope` explicite.

## Tests UI avancés de la fiche ticket

| ID | Profil | Parcours | Résultat attendu | Statut |
|---|---|---|---|---|
| ADV-01 | Agent ou responsable autorisé | Ouvrir un ticket non clôturé, modifier impact et urgence, saisir une justification d’au moins 10 caractères, enregistrer. | La priorité affichée revient de la réponse serveur ; un toast apparaît ; l’événement de qualification apparaît dans la timeline. | [ ] |
| ADV-02 | Demandeur | Ouvrir la fiche de son ticket. | Le panneau de qualification n’offre aucune action de modification ; l’API refuserait également une requête directe. | [ ] |
| ADV-03 | Responsable de file | Rechercher un ticket par référence, choisir un type de lien et créer la relation. | Le ticket courant n’est pas sélectionnable ; le lien est visible avec le type, le ticket cible et le motif. | [ ] |
| ADV-04 | Utilisateur hors périmètre | Rechercher la référence d’un ticket du département B depuis un compte du département A. | Le ticket ne remonte pas dans les résultats et une URL directe ne révèle pas son contenu. | [ ] |
| ADV-05 | Responsable autorisé | Accorder une dérogation SLA avec minutes et motif. | Les échéances sont prolongées, l’action est confirmée, historisée et visible dans la timeline. | [ ] |
| ADV-06 | Agent autorisé | Ajouter un PDF ou une image de moins de 10 Mo. | Le fichier est ajouté à la liste et téléchargeable uniquement par les utilisateurs autorisés. | [ ] |
| ADV-07 | Utilisateur non autorisé | Tenter un fichier de type non autorisé ou supérieur à 10 Mo. | L’upload est refusé, aucune ligne `Attachment` n’est créée et un message explicite est affiché. | [ ] |
| ADV-08 | Agent avec accès interne | Vérifier la visibilité des fichiers associés à un échange interne. | Le fichier interne est visible uniquement aux utilisateurs autorisés à lire les commentaires internes. | [ ] |

## Matrice par rôle

| Rôle | Actions attendues | Refus à vérifier | Desktop | Mobile |
|---|---|---|---:|---:|
| REQUESTER | Créer un ticket, commenter publiquement, confirmer une résolution, rouvrir avec motif, consulter ses pièces jointes. | Pas de commentaire interne, qualification, lien, affectation, transfert ou dérogation SLA. | [ ] | [ ] |
| AGENT | Ouvrir Inbox, prendre un ticket de sa file, commenter public/interne, qualifier, bloquer, résoudre, joindre un fichier. | Pas de ticket d’une autre file/département ; pas de transfert ou dérogation hors habilitation. | [ ] | [ ] |
| QUEUE_MANAGER | Affecter, réaffecter, transférer, qualifier, consulter SLA, accorder une dérogation, joindre un fichier. | Pas d’accès aux tickets confidentiels hors périmètre ou aux données d’un portefeuille non attribué. | [ ] | [ ] |
| FUNCTIONAL_ADMIN global | Administrer utilisateurs, départements, files, équipes, catalogue, SLA, workflows, portefeuille, actifs et connaissance ; exercer les actions ticket autorisées. | Aucun contournement des contrôles Entra ; les champs d’identité Entra restent en lecture seule. | [ ] | [ ] |
| TECHNICAL_ADMIN | Consulter et gérer la configuration technique explicitement autorisée, consulter les actifs autorisés. | Pas d’accès implicite à l’administration fonctionnelle ni aux tickets confidentiels. | [ ] | [ ] |
| REPORTING_READER | Lire les tableaux de bord, reporting et agrégats autorisés ; exporter si permission présente. | Pas de commentaire, transition, affectation, configuration, qualification ou upload. | [ ] | [ ] |

## Cloisonnement par département, file et équipe

| ID | Contrôle | Résultat attendu | Observé |
|---|---|---|---|
| SEC-01 | `agent.a` recherche `TICKET-B` dans `/inbox`. | Aucun résultat dans la liste, les compteurs ou les suggestions. | [ ] |
| SEC-02 | `agent.a` ouvre directement `/tickets/<id-B>`. | Refus serveur ou absence de contenu ; aucune donnée partielle ne doit être rendue. | [ ] |
| SEC-03 | `agent.a` appelle `GET /api/tickets/<id-B>`. | Réponse `403` ou erreur de visibilité équivalente. | [ ] |
| SEC-04 | `agent.a` tente `POST /api/tickets/<id-B>/claim` et `POST /api/tickets/<id-B>/transition`. | Réponse `403` ; aucune mutation ni notification ne doit être créée. | [ ] |
| SEC-05 | Un utilisateur limité au portefeuille A ouvre les listes clients, dossiers, missions, actifs et connaissance. | Les objets B sont absents des listes, filtres, recherches, KPI et exports. | [ ] |
| SEC-06 | Un utilisateur A ouvre directement les fiches détaillées B. | La page refuse l’accès ou retourne une absence de ressource sans fuite de données. | [ ] |
| SEC-07 | Un ticket confidentiel A est ouvert par un utilisateur non demandeur, non assigné et non inscrit dans `TicketAccess`. | Le ticket et ses pièces jointes sont inaccessibles. | [ ] |
| SEC-08 | Le même utilisateur est ajouté explicitement à `TicketAccess`. | L’accès devient possible et l’octroi est visible dans l’audit. | [ ] |
| SEC-09 | Recherche globale, reporting et exports avec des références B. | Aucun ticket ou agrégat B ne fuit dans les résultats. | [ ] |

## Contrôle responsive et accessibilité

Répéter les scénarios principaux sur `1440×900` et `390×844`. Vérifier l’absence de débordement horizontal, la fermeture des panneaux, l’ordre de tabulation, le libellé des boutons, l’état de chargement, le message d’erreur et la confirmation des actions sensibles.

## Preuves à conserver

Pour chaque test, conserver le profil utilisé, le périmètre du rôle, la route, l’action, le résultat attendu, le résultat observé, le statut HTTP, une capture d’écran et, pour les mutations, la référence de l’événement ou de l’audit créé.

## Validation automatisée

```bash
npm run lint
npm run typecheck
npm test
npm run build
```

La validation est considérée réussie lorsque les quatre commandes passent, que les scénarios `ADV-*` sont validés et qu’aucun scénario `SEC-*` ne révèle une donnée hors périmètre.

## Références internes

[1]: `docs/architecture.md` — rôles, routage, workflow, SLA, périmètres et cloisonnement.

[2]: `components/ticket-advanced-panels.tsx` — interface des quatre fonctionnalités avancées.

[3]: `app/api/tickets/[id]/attachments/route.ts` — upload et lecture des métadonnées des pièces jointes.

[4]: `app/api/tickets/[id]/attachments/[attachmentId]/route.ts` — téléchargement contrôlé.
