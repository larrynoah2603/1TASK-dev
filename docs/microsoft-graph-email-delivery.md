# Livraison des notifications par Microsoft Graph

Les e-mails 1TASK sont créés dans la même transaction que l'événement métier, puis livrés **après le commit** par le worker de l'outbox. Le worker utilise Microsoft Graph avec une identité applicative dédiée ; il ne réutilise ni le jeton ni les permissions de l'utilisateur connecté.

## Configuration Microsoft 365 à réaliser par un administrateur

1. Créer une inscription d'application Entra dédiée, par exemple **1TASK Notification Service**. Conserver l'application **1TASK Authentication** existante pour la connexion et sa permission déléguée `User.Read`.
2. Sur l'application de notification, ajouter Microsoft Graph **Application permission** `Mail.Send` (et non une permission déléguée).
3. Accorder le consentement administrateur du tenant.
4. Créer ou choisir une boîte Exchange Online dédiée à l'expédition des notifications.
5. Restreindre l'application à cette boîte au moyen du mécanisme d'autorisation applicative Exchange Online actuellement pris en charge (Application RBAC). Cette restriction est une mesure de moindre privilège à appliquer côté Microsoft 365.
6. Définir exclusivement côté serveur :
   - `MICROSOFT_MAIL_TENANT_ID`
   - `MICROSOFT_MAIL_CLIENT_ID`
   - `MICROSOFT_MAIL_CLIENT_SECRET`
   - `MICROSOFT_MAIL_SENDER`

`MICROSOFT_MAIL_SENDER` doit être l'adresse d'une vraie boîte aux lettres autorisée pour cette application. Ne placez jamais ces secrets dans une variable `NEXT_PUBLIC_*`, dans Git, dans les journaux ou dans une base de données.

Le service demande un jeton au point de terminaison OAuth 2.0 propre au tenant avec le flux `client_credentials` et le scope `https://graph.microsoft.com/.default`, puis appelle `POST /users/{sender}/sendMail`. Les réponses `202` sont marquées envoyées. Les erreurs et limitations restent dans le mécanisme de retry exponentiel de l'outbox ; `Retry-After` est honoré lorsqu'il est fourni.

Microsoft Graph accepte un unique corps (`HTML` ou texte) dans `sendMail`, et non un MIME alternatif automatique. 1TASK génère les deux représentations de manière sûre, utilise le HTML échappé pour Graph et conserve une représentation texte appropriée dans le constructeur de contenu. Les liens d'action ne sont inclus que s'ils pointent vers l'origine `NEXTAUTH_URL`.
