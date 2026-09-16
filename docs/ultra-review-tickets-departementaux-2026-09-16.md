# Ultra-review — tickets départementaux et inter-départements

**Date de revue : 16 septembre 2026**  
**Périmètre :** création, routage, visibilité, traitement et sécurité des tickets.

## 1. Verdict exécutif

Les deux objectifs existent désormais dans le projet :

1. **Ticket départemental : conforme.** Un utilisateur actif ayant `ticket:create` peut cibler son propre département. La demande libre est résolue côté serveur vers le service technique `TRIAGE-{CODE}` et la file liée à ce département.
2. **Ticket inter-départements : conforme sous permission.** La destination peut être différente du département source uniquement si l'utilisateur possède `ticket:create:cross-department`. Le contrôle porte sur le département réel de la file, y compris lorsque l'appel API fournit directement un service du catalogue.

La revue a néanmoins trouvé deux défauts fonctionnels importants et les a corrigés :

- une demande libre annonçait `TO_QUALIFY` dans son événement, mais la ligne Ticket conservait la valeur par défaut `NEW` ; le statut initial calculé est maintenant persisté ;
- le chemin « service catalogue » ne comparait pas systématiquement le département de la file avec celui de l'auteur ; le contrôle inter-département est maintenant commun aux deux modes de création.

L'API des départements a aussi été alignée avec l'autorisation : sans permission transverse, l'interface ne reçoit que le département de l'utilisateur au lieu de proposer des destinations qui seraient ensuite refusées.

## 2. Actions disponibles et déroulement réel

### 2.1 Créer dans son propre département

1. L'utilisateur ouvre la création de ticket.
2. `GET /api/departments` vérifie `ticket:create` et retourne les départements autorisés.
3. L'utilisateur décrit le besoin, choisit son département, renseigne l'objet, la description, l'impact et l'urgence, puis prévisualise.
4. `POST /api/tickets` revalide strictement le corps et l'identité courante.
5. Le serveur recherche un département actif, puis le service actif `TRIAGE-{CODE}` rattaché à une file active du même département.
6. Le SLA et son calendrier doivent être actifs. La priorité est calculée à partir d'impact × urgence.
7. La transaction crée le ticket en `TO_QUALIFY`, son événement `CREATED` et son audit.
8. Après validation de la transaction, le demandeur et les membres habilités de la file sont notifiés.

### 2.2 Créer vers un autre département

Le parcours est identique, avec une barrière supplémentaire : `ticket:create:cross-department` est exigée lorsque `queue.departmentId !== actor.departmentId`. L'autorisation est contrôlée sur le serveur ; modifier le HTML ou appeler directement l'API ne permet pas de la contourner.

Le département d'origine est conservé dans `sourceDepartmentId`, tandis que le département cible est déduit de la file. Le ticket ne duplique donc pas un champ cible susceptible de diverger : la file constitue la source de vérité opérationnelle.

### 2.3 Recevoir et traiter le ticket

- Le demandeur conserve l'accès à son propre ticket, même lorsqu'il est envoyé ailleurs.
- Un simple collègue du même département ne voit pas automatiquement les tickets des autres.
- Un agent doit disposer d'un rôle `AGENT`, d'une permission de traitement et d'une appartenance active à une équipe active de la file.
- Un agent peut prendre en charge un ticket non affecté admissible ; l'affectation manuelle et le transfert restent réservés aux responsables habilités et aux administrateurs fonctionnels dans leur scope.
- Un ticket confidentiel n'est pas ouvert implicitement par un rôle large : hors demandeur et assigné, un accès nominatif est requis.
- Les commentaires internes restent séparés des messages visibles par le demandeur.

Cette séparation est essentielle : **pouvoir envoyer à un département ne donne jamais le droit de traiter les tickets de ce département**.

## 3. Matrice d'acceptation

| Scénario | Résultat attendu | État |
|---|---|---|
| Auteur actif + `ticket:create`, cible identique | Création vers `TRIAGE-{département}`, statut `TO_QUALIFY` | Conforme |
| Auteur actif + permissions create et cross, cible différente | Création inter-département acceptée | Conforme |
| Auteur sans permission cross, cible différente en saisie libre | Refus 403 | Conforme |
| Auteur sans permission cross, service catalogue d'une autre direction | Refus 403 | Corrigé par cette revue |
| Auteur sans permission cross ouvre le sélecteur | Seul son département est proposé | Corrigé par cette revue |
| Auteur sans département actif | Refus avant routage | Conforme |
| Département, file, SLA ou calendrier inactif | Refus 422 | Conforme |
| Double clic ou retry avec le même token | Un seul ticket par auteur et token | Conforme |
| Agent hors équipe/file cible | Ticket absent de sa liste et accès direct refusé | Conforme dans les prédicats ; E2E réel conseillé |
| Demande libre créée | Ticket et événement portent tous deux `TO_QUALIFY` | Corrigé par cette revue |

## 4. Défauts et risques résiduels

### P1 — Tests d'intégration base réelle manquants pour le parcours complet

Les tests couvrent largement les prédicats et les contrats de code, mais la preuve la plus forte reste un scénario multi-comptes sur une base de test : REQUESTER du département A, AGENT de la file du département B et utilisateur extérieur C. Ce scénario doit vérifier création, notification, liste, accès direct, claim, résolution et confirmation.

**Application suggérée :** ajouter une suite Playwright ou un test d'intégration Prisma isolé, alimenté par des fixtures minimales. Ne jamais exécuter ce test destructif contre la production.

### P1 — Permissions de création des rôles à clarifier

Dans le catalogue par défaut, `REQUESTER` possède `ticket:create` et la permission transverse. `AGENT` et `QUEUE_MANAGER` possèdent la permission transverse mais pas automatiquement `ticket:create`. Cela fonctionne si ces utilisateurs cumulent aussi le rôle REQUESTER, mais cette hypothèse doit être rendue explicite dans la politique d'attribution des rôles.

**Application suggérée :** choisir une règle métier parmi les deux suivantes, puis la tester :

- rôles cumulatifs obligatoires : tout agent/responsable qui crée doit aussi avoir REQUESTER ;
- rôles autonomes : ajouter explicitement `ticket:create` à AGENT et QUEUE_MANAGER.

Ne pas modifier cette matrice silencieusement : elle affecte tous les comptes existants.

### P1 — Notification non transactionnelle

Les notifications sont diffusées après la transaction. C'est favorable au temps de réponse et une panne de notification ne perd pas le ticket, mais aucune relance durable n'est garantie dans ce chemin. L'utilisateur peut donc créer correctement un ticket sans que la file reçoive immédiatement son alerte.

**Application suggérée :** écrire un événement d'outbox dans la même transaction que le ticket, puis laisser le job outbox effectuer les notifications avec retries et idempotence.

### P2 — Disponibilité structurelle de `TRIAGE-{CODE}`

La saisie libre dépend d'une convention de code. Un département actif sans service de triage, file active, SLA actif et calendrier actif apparaît comme destination pour un utilisateur autorisé, mais la création échoue ensuite en 422.

**Application suggérée :** soit filtrer l'API des destinations sur une chaîne de triage entièrement opérationnelle, soit interdire l'activation d'un département tant que cette chaîne n'est pas configurée. Ajouter un contrôle de santé dans l'administration.

### P2 — Cohérence du token idempotent

Le token empêche bien un doublon concurrent, mais une réutilisation accidentelle du même token avec un contenu différent retourne le premier ticket. C'est sûr du point de vue duplication, mais ambigu pour un client API.

**Application suggérée :** stocker une empreinte canonique de la requête et retourner `409 Conflict` si le token existe avec une empreinte différente.

## 5. Améliorations strictement nécessaires

1. **Avant production multi-départements :** exécuter un test E2E multi-comptes démontrant les refus autant que les succès.
2. **Avant généralisation aux agents :** formaliser si les rôles sont cumulatifs ou autonomes pour `ticket:create`.
3. **Pour garantir la réception :** basculer la diffusion de création vers l'outbox transactionnelle déjà présente dans le projet.
4. **Pour éviter les destinations mortes :** contrôler automatiquement la présence de la chaîne Département → TRIage → File → SLA → Calendrier.

Les autres améliorations (temps réel, optimisation d'affichage, enrichissement du catalogue) sont utiles mais ne doivent pas précéder ces garanties métier et de sécurité.

## 6. Déploiement Vercel et branche `main`

Une pull request **ne modifie pas directement la production**. Elle produit normalement un déploiement Preview isolé. Les corrections deviennent actives sur le projet Vercel de production seulement lorsque toutes les conditions suivantes sont réunies :

1. la pull request est fusionnée dans la branche configurée comme **Production Branch** dans Vercel — généralement `main` ;
2. le dépôt GitHub connecté à Vercel reçoit effectivement ce commit ;
3. le déploiement Vercel correspondant termine avec le statut **Ready** ;
4. les variables d'environnement et migrations requises sont disponibles en production ;
5. le domaine public pointe bien vers ce déploiement.

Le correctif présenté ici ne contient aucune migration Prisma. Après fusion, il faut néanmoins vérifier dans Vercel que le SHA déployé correspond au commit fusionné, puis réaliser un test départemental et un test inter-départements avec des comptes Entra de test.

La branche de travail locale n'est pas `main` et ne dispose pas, dans cet environnement, d'un remote Git permettant de constater un push ou une fusion. Il serait donc incorrect d'affirmer que la capture de production contient déjà ces changements.

### Comportement après un timeout de 30 secondes

Le navigateur interrompt volontairement la requête initiale après 30 secondes. Cela ne prouve pas que la transaction serveur a échoué : elle peut avoir été validée juste avant ou après l'interruption réseau. L'interface interroge maintenant un endpoint de réconciliation avec le token idempotent du créateur. Si le ticket existe, elle ouvre automatiquement sa fiche ; sinon elle conserve le même token pour qu'un nouvel essai ne crée pas de doublon.

## 7. Checklist de validation manuelle

1. Créer deux départements actifs A et B, chacun avec son service `TRIAGE-*`, sa file, un SLA et un calendrier actifs.
2. Connecter un demandeur A ayant `ticket:create` mais pas la permission transverse : vérifier que seul A est proposé et qu'un POST forgé vers B retourne 403.
3. Accorder la permission transverse au demandeur A : vérifier que B apparaît et que la création aboutit en `TO_QUALIFY`.
4. Vérifier en base que `sourceDepartmentId = A` et que `ticket.queue.departmentId = B`.
5. Connecter un agent B membre actif de l'équipe de triage : vérifier notification, présence dans la boîte et claim.
6. Connecter un agent A ou C hors file : vérifier l'absence dans la liste et le refus de l'URL directe.
7. Rejouer exactement la création avec le même token : vérifier qu'aucune seconde ligne n'est créée.
8. Désactiver successivement département, file, SLA et calendrier sur une base de test : vérifier un refus contrôlé, jamais un ticket partiellement créé.
