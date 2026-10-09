# Scheduler QStash — 1TASK V1

La V1 utilise **Upstash QStash** comme scheduler externe pour le moniteur SLA
et la livraison asynchrone des notifications Web Push.
Aucun secret QStash, `CRON_SECRET` ou clé VAPID réelle ne doit être stocké dans GitHub.

## Jobs à programmer

### 1. Surveillance SLA

Destination :

```text
POST https://<domaine-1task>/api/jobs/sla-monitor
```

Fréquence recommandée :

```text
*/5 * * * *
```

Ce job exécute la surveillance SLA et les clôtures automatiques déjà implémentées
dans `runSlaMonitor()`.

### 2. Livraison Web Push

Destination :

```text
POST https://<domaine-1task>/api/jobs/outbox
```

Fréquence recommandée :

```text
* * * * *
```

Le job traite les événements `NOTIFICATION_PUSH_REQUESTED` créés par 1TASK.
Dans le profil V1, il ne réactive ni Microsoft Graph Mail, ni Redis, ni la
livraison HTTP externe du profil `full`.

Une fréquence d’une minute donne un comportement proche d’une notification
temps réel sans coupler les transactions métier au réseau Push. Les événements
restent persistés dans l’outbox et bénéficient du retry existant.

## Authentification

1TASK attend sur les deux routes :

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

## Configuration Web Push

Générer une paire VAPID avec :

```bash
npm run push:keys
```

Puis renseigner uniquement dans les variables secrètes du déploiement :

```text
WEB_PUSH_PUBLIC_KEY=<clé publique>
WEB_PUSH_PRIVATE_KEY=<clé privée>
WEB_PUSH_SUBJECT=mailto:notifications@votre-domaine.tld
```

La clé publique peut être envoyée au navigateur. La clé privée ne doit jamais
être exposée côté client, stockée dans GitHub ou copiée dans une documentation.

## Validation staging

Après création des schedules :

1. vérifier qu’un appel sans header reçoit `401` ;
2. vérifier qu’un mauvais bearer reçoit `403` ;
3. vérifier qu’un appel QStash correctement authentifié apparaît `DELIVERED` ;
4. vérifier une réponse `2xx` contenant `success: true` ;
5. activer les notifications système sur un navigateur de test ;
6. déclencher une affectation de ticket ou une autre notification importante ;
7. vérifier qu’un événement Push passe de l’outbox au traitement sans doublon ;
8. passer sur un autre onglet ou une autre application et vérifier l’apparition
   de la notification système ;
9. cliquer la notification et vérifier que 1TASK ouvre ou réutilise une fenêtre
   existante sur la page concernée ;
10. vérifier l’idempotence : un nouveau passage ne doit pas dupliquer audit,
    notification ou clôture.

Les anciens logs `RETRY` / `FAILED` issus de tests de configuration ne
constituent pas une anomalie après correction, mais doivent être distingués
des exécutions de staging validées.

## Exploitation

En cas d’erreurs répétées, mettre le schedule concerné en pause avant de modifier
un secret ou le job. Une rotation de `CRON_SECRET` exige de mettre à jour la
valeur dans Vercel et dans QStash, puis de redéployer 1TASK avant de réactiver
les schedules.

Une rotation VAPID invalide les abonnements navigateur existants : elle doit donc
être planifiée et suivie d’une nouvelle activation des notifications système sur
les appareils concernés.

Le traitement normal de l’outbox peut être planifié. En revanche, ne jamais
rejouer globalement les événements historiques `DEAD` ou anciens sans revue
explicite des destinataires et des autorisations courantes.
