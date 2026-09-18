# Observabilité de production

## Corrélation des requêtes

Les routes instrumentées acceptent `X-Request-Id` lorsqu’il contient uniquement des caractères sûrs, ou reprennent l’identifiant de trace W3C fourni par `traceparent`. À défaut, le serveur génère un UUID. Le même identifiant est :

- disponible dans le contexte asynchrone du traitement ;
- renvoyé dans l’en-tête `X-Request-Id` ;
- inclus dans les enveloppes d’erreur API ;
- inclus dans les journaux structurés.

Commencer une analyse d’incident par le `traceId` communiqué par l’utilisateur, puis rechercher cette valeur dans les logs Vercel ou dans le log drain configuré.

## Journaux

Les événements sont émis sous forme de JSON sur une seule ligne avec au minimum `timestamp`, `level`, `event`, `service` et, lorsqu’il existe, `traceId`. Les clés sensibles (`password`, `token`, `secret`, `authorization`, `cookie`, `session`) sont expurgées. Les objets, tableaux et chaînes sont bornés afin d’éviter l’envoi accidentel de contenus métier volumineux.

Les erreurs inattendues ne journalisent ni message interne ni stack trace. Les événements `unhandled_api_error` donnent la classification de l’erreur ; les événements `server_operation` donnent la route, la durée, le nombre de requêtes Prisma et le statut.

## Performances et métriques

Chaque route instrumentée produit une opération `http.<méthode> <route>`. Les agrégats locaux exposent : nombre d’appels, taux d’erreur serveur, échantillon et percentiles p50/p95/p99. L’en-tête `Server-Timing` expose la durée applicative pour le diagnostic client.

Les agrégats en mémoire sont volontairement bornés et locaux à chaque instance serverless. Ils servent au diagnostic et aux tests, mais ne remplacent pas un backend de métriques distribué. En production, les événements JSON doivent être exportés au moyen d’un log drain pour construire les tableaux de bord et alertes persistants.

Alertes minimales recommandées :

- taux de réponses 5xx et événements `unhandled_api_error` ;
- p95 des opérations HTTP et opérations dépassant `PERFORMANCE_SLOW_OPERATION_MS` ;
- volume anormal d’erreurs d’authentification ou d’autorisation ;
- échecs des jobs outbox et SLA.
