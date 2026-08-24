# Saisie libre et file de triage dans 1TASK

## Objectif

Remplacer le choix obligatoire d’un service catalogue dans le formulaire utilisateur par une saisie libre, sans supprimer le catalogue existant, sans casser les tickets historiques et sans contourner le routage ni le cloisonnement.

## Parcours cible

```text
Utilisateur décrit son besoin
        ↓
Utilisateur choisit le département cible
        ↓
Backend sélectionne la file de triage du département
        ↓
Ticket créé avec le statut TO_QUALIFY
        ↓
Agent ou Queue Manager qualifie le ticket
        ↓
Rattachement à un service catalogue existant
ou proposition à l’administrateur fonctionnel
        ↓
Traitement normal du ticket
```

## Choix recommandé

Conserver un service technique de triage par département, par exemple `TRIAGE-ADM`, plutôt que de rendre immédiatement `serviceCatalogItemId` nullable. L’utilisateur voit une saisie libre, mais le backend conserve toujours un service interne valide pour calculer le routage et le SLA initial.

## Services techniques à créer

```text
TRIAGE-EXP
TRIAGE-SOCIAL
TRIAGE-JUR
TRIAGE-AUDIT
TRIAGE-IT
TRIAGE-RH
TRIAGE-ADM
TRIAGE-ACCUEIL
TRIAGE-DIR
```

Chaque service doit être relié à une file active du même département, à un SLA de qualification et à une équipe de triage.

## Modifications UI

Fichier principal : `components/new-ticket-form.tsx`.

Remplacer le Combobox obligatoire `Service demandé` par :

```text
Besoin demandé — champ texte ou textarea obligatoire
Département cible — Combobox personnalisé obligatoire
Nature — Combobox personnalisé obligatoire
```

Le formulaire ne doit pas afficher la file, l’agent, le SLA définitif ou la configuration interne. Il doit expliquer :

```text
Votre demande sera envoyée à la file de qualification du département choisi.
L’équipe habilitée déterminera ensuite le service, la priorité et le traitement appropriés.
```

La prévisualisation doit afficher `Triage ADM` et `À qualifier`, pas un service catalogue choisi par l’utilisateur.

## Modifications backend

Fichiers concernés :

```text
lib/validation.ts
lib/ticket-service.ts
app/api/tickets/route.ts
lib/routing.ts ou lib/domain.ts selon le helper de routage
```

La route doit valider :

```text
requestedService ou besoin demandé : longueur minimale et maximale
targetDepartmentId : département actif
type : nature autorisée
```

Le backend doit déterminer lui-même :

```text
queueId de triage
service technique de triage
SLA de triage
scope et règles d’accès
```

Le frontend ne doit pas pouvoir imposer `queueId`, `agentId`, `slaId` ou `scopeId`.

## Permissions

Le demandeur conserve :

```text
ticket:create
ticket:create:cross-department si le département cible est différent
```

Il ne reçoit pas :

```text
catalog:propose
catalog:manage
workflow:manage
```

L’agent peut :

```text
voir la file de triage de son périmètre
qualifier le besoin
rattacher un catalogue existant
proposer un nouveau catalogue si catalog:propose est autorisée
```

Le Queue Manager peut en plus affecter ou transférer selon son scope. Le Functional Admin valide et publie le catalogue.

## SLA et statut

Le ticket reçoit un SLA court de qualification tant qu’il est en triage :

```text
NEW → TO_QUALIFY
```

Après qualification :

```text
TO_ASSIGN → ASSIGNED → IN_PROGRESS → RESOLUTION_PENDING → CLOSED
```

Le SLA initial de triage ne doit pas être confondu avec le SLA définitif du service catalogue. La règle de remplacement ou de conservation du SLA doit être explicitement définie avant l’implémentation.

## Base de données

### Option recommandée, impact minimal

Aucune modification du modèle `Ticket` n’est nécessaire si le service technique de triage est utilisé comme service catalogue interne. Il faut seulement ajouter les files, équipes, services et SLA de triage dans le seed ou dans un script de données idempotent.

Fichiers :

```text
prisma/seed.ts
docs/sql/seed-triage-queues.sql
```

### Option de remplacement complet, impact élevé

Si le ticket doit réellement exister sans catalogue, il faudra rendre `serviceCatalogItemId` nullable et ajouter un champ tel que :

```prisma
requestedService String?
```

Cette option nécessite une nouvelle migration Prisma et une revue de toutes les requêtes qui supposent la présence de `serviceCatalogItem`.

## Tests à ajouter

```text
Un REQUESTER saisit un besoin libre vers ADM.
Le backend route vers Triage ADM.
Le ticket reçoit TO_QUALIFY et le SLA de triage.
Un agent ADM voit le ticket dans sa boîte.
Un agent IT sans scope ADM ne voit pas le ticket.
Un agent qualifie et rattache un service existant.
Un agent autorisé peut proposer un nouveau service.
Un REQUESTER ne peut pas créer ni publier un catalogue.
Les tickets catalogue existants continuent de fonctionner.
```

## Conclusion

La première livraison doit appliquer la version recommandée : **saisie libre dans l’interface, service technique de triage dans le backend**. Elle fournit l’expérience demandée avec un risque limité et conserve le routage, le SLA, l’historique et le cloisonnement existants.
