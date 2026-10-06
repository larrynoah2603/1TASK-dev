# Scheduler QStash — 1TASK V1

La V1 utilise **Upstash QStash** comme scheduler externe pour le moniteur SLA.
Aucun secret QStash ni `CRON_SECRET` réel ne doit être stocké dans GitHub.

## Contrat du job

Destination :

```text
POST https://<domaine-1task>/api/jobs/sla-monitor
```

Fréquence recommandée :

```text
*/5 * * * *
```

Le job exécute la surveillance SLA et les clôtures automatiques déjà implémentées
dans `runSlaMonitor()`.

## Authentification

1TASK attend :

```text
Authorization: Bearer <CRON_SECRET>
```

Dans QStash, configurer le header transféré :

```text
Upstash-Forward | Authorization | Bearer <CRON_SECRET>
```

La valeur doit être identique à la variable d’environnement `CRON_SECRET`
du déploiement Vercel ciblé. Ne jamais copier cette valeur dans un commit,
une PR, un ticket ou une capture partagée.

Pour limiter l’exposition dans le tableau de bord QStash, activer la redaction
du header d’autorisation si disponible.

## Validation staging

Après création du schedule :

1. vérifier qu’un appel sans header reçoit `401` ;
2. vérifier qu’un mauvais bearer reçoit `403` ;
3. vérifier qu’un appel QStash correctement authentifié apparaît `DELIVERED` ;
4. vérifier une réponse `2xx` contenant `success: true` ;
5. laisser passer au moins un déclenchement automatique à cinq minutes ;
6. vérifier l’idempotence : un nouveau passage ne doit pas dupliquer audit,
   notification ou clôture.

Les anciens logs `RETRY` / `FAILED` issus de tests de configuration ne
constituent pas une anomalie après correction, mais doivent être distingués
des exécutions de staging validées.

## Exploitation

En cas d’erreurs répétées, mettre le schedule en pause avant de modifier le
secret ou le job. Une rotation de `CRON_SECRET` exige de mettre à jour la
valeur dans Vercel et dans QStash, puis de redéployer 1TASK avant de réactiver
le schedule.
