# Runbook production — stockage S3 et validation 1TASK

## 1. Situation actuelle et cible

La version actuelle écrit les fichiers dans `var/ticket-attachments/<ticketId>/<uuid>` et conserve dans `Attachment.storageKey` la clé logique du fichier. Ce fonctionnement est acceptable en développement local, mais un système de fichiers local n’est pas un stockage persistant adapté à une application serverless. La cible de production est un bucket S3 privé ; la base PostgreSQL reste la source de vérité pour les métadonnées, la visibilité et le périmètre d’accès.

La recommandation est de ne jamais rendre le bucket public. Les routes 1TASK continuent à vérifier la session Entra ID et `canViewTicket` avant de lire ou de générer un accès au fichier. AWS recommande de maintenir les quatre contrôles S3 Block Public Access activés et les URLs présignées sont des jetons porteurs à durée limitée qui doivent être protégés [1] [2].

## 2. Configuration S3 recommandée

Créer un bucket dédié par environnement, par exemple `1task-prod-attachments-123456789012-eu-west-3` et `1task-staging-attachments-123456789012-eu-west-3`. Le nom réel doit être globalement unique. Choisir une région proche de la base et du runtime de production ; l’exemple utilise `eu-west-3` uniquement comme valeur illustrative.

| Paramètre | Production recommandée |
|---|---|
| Bucket | Un bucket dédié aux pièces jointes 1TASK, séparé du staging. |
| Région | Même zone géographique que la base ou la région d’exécution principale. |
| Accès public | Bloquer les quatre options Block Public Access. |
| Object Ownership | `Bucket owner enforced`, ACL désactivées. |
| Chiffrement | SSE-KMS avec une clé KMS dédiée ; SSE-S3 peut servir de minimum si KMS n’est pas disponible. |
| Versioning | Activé pour permettre la récupération après écrasement ou suppression accidentelle. |
| Clé logique | `tickets/<ticketId>/<uuid>` ou `1task/attachments/<ticketId>/<uuid>`. |
| Listing | Aucun listing S3 depuis le navigateur ; la liste vient de la table `Attachment`. |
| Cache public | Aucun cache public ; les téléchargements passent par la route authentifiée ou une URL GET présignée courte. |
| Suppression | Ne pas accorder `s3:DeleteObject` tant qu’aucune suppression métier n’est prévue. |

La politique de bucket doit au minimum refuser les requêtes non chiffrées en transit et ne doit contenir aucune autorisation anonyme. Exemple à adapter avec l’ARN réel du bucket :

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "DenyInsecureTransport",
      "Effect": "Deny",
      "Principal": "*",
      "Action": "s3:*",
      "Resource": [
        "arn:aws:s3:::1task-prod-attachments-123456789012-eu-west-3",
        "arn:aws:s3:::1task-prod-attachments-123456789012-eu-west-3/*"
      ],
      "Condition": { "Bool": { "aws:SecureTransport": "false" } }
    }
  ]
}
```

Activer également le versioning et le chiffrement par défaut. Avec SSE-KMS, la clé KMS doit autoriser le rôle ou le principal utilisé par l’application à chiffrer lors de l’upload et à déchiffrer lors du téléchargement. Les appels `PutObject` nécessitent `s3:PutObject`; les appels `GetObject` nécessitent `s3:GetObject` [3] [4].

## 3. Politique IAM minimale

Créer un principal d’exécution dédié à 1TASK. Ne pas réutiliser un administrateur AWS et ne jamais placer de clé AWS dans le navigateur ou dans une variable `NEXT_PUBLIC_*`.

Pour une intégration serveur directe, la politique IAM minimale est :

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "TicketAttachmentObjects",
      "Effect": "Allow",
      "Action": ["s3:PutObject", "s3:GetObject"],
      "Resource": "arn:aws:s3:::1task-prod-attachments-123456789012-eu-west-3/1task/attachments/*"
    },
    {
      "Sid": "KmsForTicketAttachments",
      "Effect": "Allow",
      "Action": ["kms:Encrypt", "kms:Decrypt", "kms:GenerateDataKey"],
      "Resource": "arn:aws:kms:eu-west-3:123456789012:key/<kms-key-id>"
    }
  ]
}
```

Ne pas ajouter `s3:ListAllMyBuckets`, `s3:*` ou `s3:ListBucket` sans besoin explicite. 1TASK liste les pièces jointes via PostgreSQL ; il n’a donc pas besoin d’énumérer le bucket. Ajouter `s3:AbortMultipartUpload` et les permissions multipart uniquement si le mode multipart est effectivement implémenté.

Sur Vercel, stocker les secrets dans les variables chiffrées du projet, séparées pour `Production`, `Preview` et `Development`. Utiliser de préférence des identifiants temporaires ou une fédération AWS adaptée à l’infrastructure ; à défaut, une paire IAM dédiée et limitée au bucket reste préférable à une clé d’administrateur.

## 4. Variables d’environnement

Ajouter les variables suivantes côté serveur uniquement :

```dotenv
ATTACHMENTS_STORAGE=s3
S3_BUCKET=1task-prod-attachments-123456789012-eu-west-3
S3_REGION=eu-west-3
S3_PREFIX=1task/attachments
S3_KMS_KEY_ID=arn:aws:kms:eu-west-3:123456789012:key/<kms-key-id>
AWS_ACCESS_KEY_ID=<identifiant-iam-dedie>
AWS_SECRET_ACCESS_KEY=<secret-iam-dedie>
```

Avec un runtime AWS disposant d’un rôle IAM, ne pas définir nécessairement `AWS_ACCESS_KEY_ID` et `AWS_SECRET_ACCESS_KEY` : le SDK peut utiliser la chaîne de fournisseurs de credentials du runtime. Dans tous les cas, ne jamais committer `.env`, `.env.local` ou une valeur secrète dans Git.

## 5. Intégration dans le code 1TASK

Installer le client AWS dans le projet :

```bash
npm install @aws-sdk/client-s3
```

Créer un module serveur, par exemple `lib/object-storage.ts`, qui encapsule `PutObjectCommand` et `GetObjectCommand` :

```ts
import { GetObjectCommand, PutObjectCommand, S3Client } from "@aws-sdk/client-s3";

const bucket = process.env.S3_BUCKET;
const region = process.env.S3_REGION;
const prefix = process.env.S3_PREFIX ?? "1task/attachments";
const kmsKeyId = process.env.S3_KMS_KEY_ID;

if (!bucket || !region) {
  throw new Error("S3_BUCKET et S3_REGION sont obligatoires lorsque ATTACHMENTS_STORAGE=s3.");
}

const client = new S3Client({ region });

export function attachmentKey(ticketId: string, uuid: string) {
  return `${prefix}/${ticketId}/${uuid}`;
}

export async function putAttachment(input: {
  key: string;
  body: Uint8Array;
  contentType: string;
  contentLength: number;
}) {
  await client.send(new PutObjectCommand({
    Bucket: bucket,
    Key: input.key,
    Body: input.body,
    ContentType: input.contentType,
    ContentLength: input.contentLength,
    ServerSideEncryption: kmsKeyId ? "aws:kms" : "AES256",
    ...(kmsKeyId ? { SSEKMSKeyId: kmsKeyId, BucketKeyEnabled: true } : {}),
  }));
}

export async function getAttachment(key: string) {
  const result = await client.send(new GetObjectCommand({ Bucket: bucket, Key: key }));
  if (!result.Body) throw new Error("Objet S3 vide ou introuvable.");
  return {
    body: Buffer.from(await result.Body.transformToByteArray()),
    contentType: result.ContentType ?? "application/octet-stream",
    contentLength: result.ContentLength ?? undefined,
  };
}
```

Dans `uploadTicketAttachment`, conserver l’ordre suivant : contrôler la session et la visibilité du ticket, valider taille/type/nom, générer une clé aléatoire, envoyer vers S3, créer la ligne `Attachment` avec la même clé logique, puis écrire l’audit. En cas d’échec après l’upload S3, supprimer l’objet orphelin avec un appel compensatoire contrôlé. Dans `getTicketAttachmentForViewer`, conserver les contrôles de visibilité actuels avant `GetObject`.

Pour un premier déploiement Vercel, l’intégration serveur directe est la plus simple et ne nécessite pas de CORS. Si les fichiers deviennent plus volumineux ou si les limites de requête du runtime sont atteintes, passer ensuite à un flux présigné : le serveur crée une URL `PUT` limitée à une clé, un type et une durée courte, le navigateur envoie directement à S3, puis le serveur confirme l’objet et crée la ligne `Attachment`. AWS documente les URLs présignées pour `GET` et `PUT` et recommande de les traiter comme des bearer tokens [1].

## 6. Migration du stockage local vers S3

Arrêter les écritures pendant la migration ou utiliser une fenêtre de migration contrôlée. Pour chaque ligne `Attachment`, lire `var/ticket-attachments/<storageKey>`, envoyer le contenu vers la clé S3 correspondante, vérifier la taille et le type, puis marquer la migration dans un journal externe. Comme `storageKey` peut rester identique si le préfixe S3 est défini de manière compatible, aucune migration Prisma n’est obligatoire.

Exemple de contrôle avant suppression du local :

```bash
aws s3api head-object \
  --bucket "$S3_BUCKET" \
  --key "1task/attachments/<ticketId>/<uuid>"
```

Ne supprimer le fichier local qu’après vérification de l’existence S3, de la taille, du type MIME et d’un checksum. Conserver une sauvegarde jusqu’à la fin de la période de validation.

## 7. Vérifications AWS avant mise en production

```bash
aws sts get-caller-identity
aws s3api head-bucket --bucket "$S3_BUCKET"
aws s3api get-public-access-block --bucket "$S3_BUCKET"
aws s3api get-bucket-versioning --bucket "$S3_BUCKET"
aws s3api get-bucket-encryption --bucket "$S3_BUCKET"
```

Vérifier que les quatre indicateurs Block Public Access sont `true`, que le versioning est activé et qu’aucune policy anonyme n’existe. Tester l’absence d’accès public avec une URL objet sans signature ; le résultat attendu est un refus. Vérifier aussi dans IAM Access Analyzer qu’aucun accès public ou cross-account inattendu n’est signalé [2].

## 8. Tests automatisés

Depuis la racine du projet :

```bash
cd /chemin/vers/1task-work
npm ci
npx prisma generate
npm run lint
npm run typecheck
npm test
npm run build
```

Le projet possède également une commande groupée :

```bash
npm run validate
```

La sortie attendue de la baseline actuelle est **85 tests réussis et 3 tests d’intégration ignorés**. Les tests ignorés utilisent une base d’intégration réelle et ne doivent pas être déclarés réussis tant que cette base et ses variables ne sont pas disponibles.

Avant de lancer les tests avec S3, vérifier que le client S3 est mocké dans les tests unitaires ou que l’environnement de test pointe vers un bucket de staging séparé. Ne jamais exécuter les tests destructifs contre le bucket de production.

## 9. Préparation des tests manuels

Préparer deux départements actifs, deux files, deux équipes et les données A/B correspondantes. Créer six comptes Entra de test : `REQUESTER`, `AGENT`, `QUEUE_MANAGER`, `FUNCTIONAL_ADMIN`, `TECHNICAL_ADMIN` et `REPORTING_READER`. Pour chaque compte, relever le statut, `departmentId`, `primaryRoleCode`, `primaryTeamId`, `authorizedQueueId`, `UserRole.scopeId` et le type du `PermissionScope`.

Une attribution globale doit avoir `scopeId = NULL`. Un utilisateur ordinaire doit être `ACTIVE` avec un département et une attribution cohérente avant le test. Ne pas modifier les identifiants Entra dans la base ; corriger les champs applicatifs depuis `/admin/users`.

Démarrer l’application :

```bash
npm run dev
```

Puis se connecter avec chaque compte via Microsoft Entra ID. Pour chaque compte, tester d’abord le menu et les routes principales, puis les actions ticket. Exécuter chaque test en desktop `1440×900` et mobile `390×844`.

## 10. Séquence de validation manuelle

### Étape A — vérification de session et de profil

Avec chaque compte, vérifier `/profile`, le statut `ACTIVE`, le département, l’équipe, la file et le rôle affiché. Un compte `PENDING_ASSIGNMENT` doit être redirigé vers `/pending-assignment` et ne doit pas être utilisé comme compte de validation fonctionnelle.

### Étape B — demandeur

Créer un ticket via `/tickets/new`, vérifier le routage et le SLA en prévisualisation, puis ajouter un commentaire public. Confirmer une résolution et rouvrir le ticket avec une justification. Vérifier l’absence des actions de commentaire interne, qualification, affectation, transfert et dérogation SLA.

### Étape C — agent

Avec `agent.a`, ouvrir `/inbox`, rechercher un ticket de `QUEUE-A`, le prendre en charge, ajouter un commentaire public puis interne, qualifier impact/urgence, bloquer avec motif et soumettre une résolution. Tenter ensuite les mêmes accès sur `TICKET-B`; aucun ticket B ne doit être visible ou modifiable.

### Étape D — responsable de file

Avec `manager.a`, affecter et réaffecter un ticket de `QUEUE-A`, le transférer si la file cible est autorisée, puis accorder une dérogation SLA. Vérifier la confirmation, la timeline, l’audit et les nouvelles échéances. Une action sur `QUEUE-B` doit être refusée côté serveur même si l’URL est saisie directement.

### Étape E — administrateur fonctionnel

Avec un administrateur fonctionnel global, ouvrir `/admin/users`, corriger un profil de test, puis vérifier `/clients`, `/dossiers`, `/missions`, `/assets` et `/knowledge`. Vérifier que les identifiants Entra sont en lecture seule et que les changements produisent un historique et un audit.

### Étape F — administrateur technique et lecteur reporting

Avec `TECHNICAL_ADMIN`, vérifier l’accès à la configuration technique et aux actifs autorisés, puis confirmer l’absence d’accès implicite à l’administration fonctionnelle ou aux tickets confidentiels. Avec `REPORTING_READER`, vérifier les tableaux et exports autorisés et confirmer l’absence de boutons de mutation.

### Étape G — cloisonnement direct API

Pour un utilisateur A, essayer de lire ou modifier une ressource B directement :

```bash
curl -i http://localhost:3000/api/tickets/<id-ticket-B>
curl -i http://localhost:3000/api/production/clients/<id-client-B>
curl -i http://localhost:3000/api/production/missions/<id-mission-B>
curl -i -X POST http://localhost:3000/api/tickets/<id-ticket-B>/claim
```

Les appels doivent échouer sans session, et être refusés pour un utilisateur authentifié hors périmètre. Une liste peut répondre `200` sans l’objet B ; une fiche ou mutation hors périmètre doit produire une absence contrôlée ou un `403`, sans données partielles.

### Étape H — fonctionnalités avancées

Dans la fiche ticket, exécuter les scénarios `ADV-01` à `ADV-08` et `SEC-01` à `SEC-09` du fichier `docs/manual-validation-matrix.md`. Conserver une capture, l’utilisateur, la route, le résultat attendu, le résultat obtenu, le statut HTTP et l’identifiant de l’audit ou de l’événement produit.

## 11. Critères de réussite

| Domaine | Critère |
|---|---|
| S3 | Bucket privé, Block Public Access complet, chiffrement, versioning et IAM limité. |
| Application | Aucun secret exposé au navigateur ; la visibilité ticket est contrôlée avant chaque lecture ou upload. |
| Migration | Chaque fichier local attendu existe dans S3 avec taille et type vérifiés. |
| Automatisation | Lint, typage, tests et build passent ; les tests d’intégration ignorés sont explicitement identifiés. |
| Rôles | Les six profils voient uniquement les menus, actions et données autorisés. |
| Cloisonnement | Aucun objet A/B ne fuit par URL, recherche, compteur, filtre, export ou pièce jointe. |
| Responsive | Les parcours sont utilisables à `1440×900` et `390×844`, sans débordement horizontal. |
| Audit | Qualification, liens, dérogation, upload et changements d’habilitation produisent les traces attendues. |

## Références

[1]: https://docs.aws.amazon.com/AmazonS3/latest/userguide/using-presigned-url.html — AWS, « Download and upload objects with presigned URLs ».

[2]: https://docs.aws.amazon.com/AmazonS3/latest/userguide/access-control-block-public-access.html — AWS, « Blocking public access to your Amazon S3 storage ».

[3]: https://docs.aws.amazon.com/goto/SdkForJavaScriptV3/s3-2006-03-01/PutObject — AWS SDK for JavaScript v3, `PutObjectCommand`.

[4]: https://docs.aws.amazon.com/goto/SdkForJavaScriptV3/s3-2006-03-01/GetObject — AWS SDK for JavaScript v3, `GetObjectCommand`.
