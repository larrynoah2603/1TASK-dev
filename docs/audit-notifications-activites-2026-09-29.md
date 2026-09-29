# Audit — icônes de notifications et activités

## Surfaces inspectées

| Surface | Source du type | Représentation retenue |
|---|---|---|
| Centre de notifications et popover navbar | `Notification.type` renvoyé par `/api/notifications` | `ActivityIcon` |
| Activité récente du dashboard | statut réel du ticket (`CLOSED` ou modification) | `Timeline` + `ActivityIcon` |
| Dernières actions de la boîte agent | état SLA réel ou modification du ticket | `Timeline` + `ActivityIcon` |
| Chronologie du détail ticket | `TicketEvent.eventType`, affectation et message persistés | `Timeline` + `ActivityIcon` |
| Demandes d’actifs personnelles | `AssetRequest.status` | `ActivityIcon` |

Les autres listes d’actifs exposent des mouvements datés, mais aucun enum de type de mouvement n’existe dans le modèle. Aucun
type artificiel n’a donc été créé pour ces lignes.

## Types backend détectés

- Notifications : `TICKET_CREATED`, `QUEUE_NEW_TICKET`, `TICKET_ASSIGNED`, `INFORMATION_REQUESTED`, `TICKET_RESOLVED`,
  `TICKET_REOPENED`, `SLA_ALERT`, `SLA_BREACH`, `CONFIDENTIAL_ACCESS`, `ADMINISTRATIVE_ACTION`.
- Événements ticket : `CREATED`, `STATUS_CHANGED`, `ASSIGNED`, `QUEUE_CHANGED`, `MESSAGE_ADDED`,
  `RESOLUTION_SUBMITTED`, `REOPENED`, `CLOSED`, `SLA_ALERT`, `SLA_BREACH`, `CONFIDENTIAL_ACCESS_GRANTED`,
  `CONFIDENTIAL_ACCESS_REVOKED`, `QUALIFIED`, `LINK_CREATED`, `SLA_EXCEPTION_CREATED`.
- Demandes d’actifs : `PENDING`, `APPROVED`, `REJECTED`.

## Mapping central

Le mapping unique se trouve dans `components/activity-icon.tsx`. Les types de création utilisent `FilePlus2`, les affectations
`UserCheck`, les modifications `Pencil`, les messages `MessageSquare`, les événements SLA `Clock`, les résolutions
`CircleCheck`, les clôtures `CheckCircle2`, les demandes d’actifs `PackagePlus`, les refus `CircleX`, les actions
administratives ou confidentielles `ShieldCheck`, et les types inconnus retombent sur `Bell`.

## Palette

La palette visuelle active reste celle des imports historiques `legacy.css`, `tokens.css`, `legacy-bridge.css` et
`design-system.css`. Le catalogue ajouté précédemment à `app/globals.css` pour les contrats CI est placé sous `@media not all`
afin qu’il reste vérifiable statiquement sans modifier les couleurs rendues dans l’application.
