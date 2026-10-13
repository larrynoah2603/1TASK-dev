# Lot S1 — contrôle d'accès aux notifications et neutralisation CSV

## Contexte audité

Le système 1TASK V1 possède déjà un contrôle central de lecture `canViewTicket()`, mais `notificationMayBeDelivered()` acceptait auparavant **tous les tickets non confidentiels**, sans revérifier l'appartenance de file, l'équipe active et les rôles du destinataire. Ceci pouvait divulguer une référence ou un nom de demandeur dans un push différé, et rendre une photo consultable via `/api/notifications/push-photo/[id]` pour un ancien destinataire.

Par ailleurs, l'export des tickets et du reporting encadrait ses cellules entre guillemets (RFC 4180) sans neutraliser les préfixes de formule interprétables par un tableur.

## Correctifs et limites

- `notificationMayBeDelivered` conserve le contrôle initial de statut du destinataire. Pour les notifications liées à un ticket, il **relit le contexte actuel** depuis `getUserContext` et le ticket avec `ticketAccessInclude`, puis appelle la **même règle** `canViewTicket(toAccessSubject(user), accessTarget(ticket, now))` que le détail du ticket.
- Les notifications sans ticket restent soumises au statut actif de leur destinataire mais conservent leur comportement existant. Les tickets ordinaires ne deviennent pas des accès publics. Les tickets confidentiels exigent toujours une autorisation nominative, y compris pour les délégations non révoquées et non expirées.
- L'endpoint existant des photos push fait déjà appel à cette fonction après contrôle de la session et de la propriété de la notification. Il bénéficie du nouveau contrôle sans modification du payload, de l'icône, du système d'envoi, de l'outbox, du stockage ni du service worker.
- `csvCell` dans `lib/csv-export.ts` encode et double les guillemets, remplace les caractères de contrôle/séparateurs Unicode/invisibles par des espaces et **préfixe d'une apostrophe** les chaînes dont le premier caractère significatif (après normalisation pour détection) est `=`, `+`, `-` ou `@`. Les nombres natifs restent des nombres. L'encodeur est partagé par les exports tickets et reporting.
- Les valeurs réellement destinées à être interprétées comme des formules Excel ne font pas partie du contrat des exports V1. **Attention** : la sécurité des CSV demeure dépendante des logiciels et scénarios de réenregistrement ; tester aussi l'ouverture, le sauvetage et la réouverture dans les tableurs supportés.

## Non-régression

- Aucun changement de navigation, de palette, de CSS, de rôles, de schéma Prisma, de routage, de template push, ni de permissions V1.
- Scénarios requis : création d'une notification puis retrait de la file, retrait de l'équipe, suppression du rôle, désactivation du compte, accès nominatif confidentiel, expiration/révocation de délégation, ticket supprimé et notification non liée à un ticket. Conserver le droit de lecture du demandeur et de l'agent toujours habilité.
- CSV : `=HYPERLINK`, `+SUM`, `-SUM`, `@SUM`, espaces/tabulations/retours ligne/BOM/zero-width, noms du demandeur et agent, colonnes de tickets et reporting, exclusion confidentiel, champs habituels.
- CI GitHub Actions : matrices `PRODUCT_PROFILE=v1` et `full` complètes (Vitest, lint, TypeScript, Prisma, Next build).
- **Recette réelle avant fusion** : essai sur environnement non productif avec deux comptes de rôles différents, retirer le rôle/équipe avant envoi d'un push en attente ; contrôler aussi le refus de récupération d'avatar par un ancien destinataire.

**Cette PR n'est pas un pentest complet ni une certification de sécurité.** Les limites de session, les règles de WAF, les permissions Vercel/Entra et la revue des 83 routes API relèvent des lots suivants.
