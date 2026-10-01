# Tickets confidentiels — politique et exploitation

## Politique d'autorisation

Un ticket confidentiel n'est visible que par son demandeur ou par un compte
nommément présent dans `TicketAccess`. L'affectation, le département, la file,
l'équipe et les rôles d'administration ne donnent aucun droit implicite. Une
autorisation permanente conserve les capacités intrinsèques du rôle du compte,
mais traverse la frontière organisationnelle uniquement pour le ticket nommé.

Une autorisation issue d'un remplacement n'est valable que si la délégation a
commencé, n'est pas terminée et n'est pas révoquée. Chaque action est évaluée
pour le remplaçant concerné : `VIEW`, `COMMENT`, `REPLY`, `PROCESS`, `STATUS`,
`ATTACHMENT`, `ASSIGN`, `TRANSFER` ou `CLOSE`. L'action déléguée et la permission
intrinsèque correspondante sont toutes deux nécessaires. La confirmation de
clôture reste une décision du demandeur. Une affectation résiduelle après la fin
du remplacement ne maintient donc pas l'accès.

Un destinataire principal ou remplaçant doit être actif, non désactivé par
l'administration et posséder les capacités de mise à jour, résolution et
commentaire interne. `ticket:update` seul ne suffit pas. La configuration du
catalogue reste désactivée par défaut et le ticket n'est jamais rétrogradé en
ticket standard si cette configuration devient invalide.

Les listes, recherches et relations dossier/actif appliquent le prédicat SQL de
visibilité avant sélection. Les comptes de tickets dans le détail d'un dossier
sont filtrés de la même manière. Les exports/reportings génériques continuent à
exclure les tickets confidentiels.

## Cycle standard et confidentiel

Le flux standard conserve le routage catalogue/triage, l'anti-doublon,
l'affectation et le claim par équipe, les transferts, statuts, SLA, résolution,
confirmation et réouverture existants. Le flux confidentiel conserve la file et
le département de destination mais remplace la visibilité collective par un
accès nommé. Le destinataire effectif est recalculé et la version de
configuration prévisualisée est contrôlée à la création.

Pendant un remplacement actif, les nouveaux tickets reçoivent une autorisation
liée à la délégation. Les dates et révocations sont vérifiées à chaque requête ;
un worker retardé n'étend jamais l'accès. Les autorisations indépendantes ne
sont pas supprimées. Les activations se chevauchant sont refusées par le service
d'administration et les créations transactionnelles/idempotentes existantes
sont conservées.

## Jobs Vercel

`vercel.json` déclare :

* `GET /api/jobs/outbox` toutes les cinq minutes ;
* `GET /api/jobs/sla-monitor` toutes les quinze minutes.

`POST` reste accepté pour les appelants existants. Les deux méthodes exigent
`Authorization: Bearer $CRON_SECRET` et renvoient une erreur explicite si le
secret manque. Vercel Cron ajoute cet en-tête lorsque `CRON_SECRET` est configuré
sur le projet. La cadence effectivement disponible dépend du plan Vercel : elle
doit être vérifiée dans le tableau de bord au déploiement, qui reste une étape
externe au dépôt.

Vérification manuelle : consulter les exécutions Cron et logs, puis contrôler
les compteurs JSON. Les travaux en attente/échec se trouvent dans `OutboxEvent`
(`PENDING`, `PROCESSING`, `DEAD`, `attempts`, `lastError`). Le worker utilise des
lots bornés, `FOR UPDATE SKIP LOCKED`, un bail de cinq minutes, un backoff et une
clé idempotente. Les appels fournisseurs ont lieu hors transaction.

## Stockage privé

En production, définir obligatoirement `PRIVATE_STORAGE_URL` et
`PRIVATE_STORAGE_TOKEN`. La passerelle privée doit accepter `PUT`, `GET` et
`DELETE` sur `/<clé encodée>` avec un Bearer token, stocker durablement les
octets et ne jamais rendre les objets publics. Le téléchargement passe toujours
par 1TASK et revérifie l'accès au ticket, à la délégation et au message interne ;
aucune URL signée longue durée n'est retournée.

En développement/test seulement, l'adaptateur local conserve la compatibilité
avec `var/ticket-attachments`. Pour migrer les fichiers historiques, copier
chaque objet en conservant exactement son `Attachment.storageKey`, vérifier sa
taille, puis seulement après validation retirer la copie locale. Ne modifier ni
les lignes `Attachment`, ni leurs clés. La production échoue explicitement si
le stockage durable est absent au lieu d'écrire sur le système éphémère.

## Notifications et contrôle d'acceptation

Les alertes SLA confidentielles sont limitées aux accès nommés actifs. Avant
l'envoi différé email/push, le compte et l'accès au ticket sont revérifiés ; une
délégation expirée/révoquée ou un compte désactivé annule la livraison. Le
contenu SLA ne comporte que la référence et l'état du délai.

Checklist manuelle : créer un service confidentiel, vérifier la prévisualisation
du destinataire, créer un ticket, tester demandeur/destinataire/utilisateur hors
périmètre, activer un remplaçant d'un autre département, tester chaque action,
révoquer sans lancer de worker, retester détail et pièce jointe, puis observer
les deux jobs et une notification différée. Les fournisseurs Entra, Graph,
Web Push, stockage et le scheduler Vercel doivent être validés dans
l'environnement cible ; les tests locaux ne prouvent pas leur configuration.

## Validation de cette livraison (2026-10-01)

La suite locale a exécuté 351 tests : 348 réussis et 3 tests PostgreSQL ignorés
car `RUN_DB_TESTS=0`. Le build Next.js 16.3.8 a compilé en 25,7 s et sa passe
TypeScript en 25,0 s sur le conteneur de validation. Ce sont des temps de build,
pas des latences de production ; aucune base PostgreSQL représentative ni aucun
fournisseur externe n'était disponible pour mesurer honnêtement les requêtes et
parcours applicatifs.

`npm audit` est passé de 10 avis (dont 1 critique et 6 élevés) à 8 (aucun
critique, 5 élevés, 2 modérés et 1 faible) après la mise à jour ciblée de Next.js
et `eslint-config-next` de 16.3.0 à 16.3.8. Restent les chaînes de développement
Prisma (`deepmerge-ts`), Vitest, `brace-expansion`, `js-yaml` et `esbuild`.
L'outil ne propose pour Prisma qu'un changement incohérent/rétrograde déclaré
majeur ; Vitest 4.1.11 déclenche actuellement une erreur interne npm
`edgesOut` dans cet environnement. Aucun `npm audit fix --force` n'a donc été
appliqué. Ces dépendances ne sont pas des entrées HTTP de l'application déployée,
mais doivent être réévaluées dès qu'une résolution compatible est publiée ou
que l'anomalie npm est corrigée.
