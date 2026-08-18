# Revue de l’authentification Microsoft Entra ID

Date de la revue : 11 août 2026

## Décision d’architecture

L’application accepte exclusivement Microsoft Entra ID avec le provider exact
`microsoft-entra-id`. Il n’existe aucun mot de passe local, provider Google,
Firebase ou MongoDB dans le parcours d’authentification.

Le callback synchronise depuis Microsoft Graph l’identifiant Entra, le nom,
l’e-mail, le département, le manager hiérarchique et le statut actif/désactivé.
Le département est issu du profil Entra ID et n’est jamais choisi ou modifié
par l’utilisateur.

## Correction du callback Prisma

Microsoft Entra peut retourner des champs OAuth spécifiques tels que
`ext_expires_in`. L’adaptateur localise les champs persistés à ceux du modèle
Prisma `Account`, afin que le callback ne transmette pas un champ inattendu à
Prisma. Les migrations historiques restent conservées pour les bases déjà
déployées.

## Réglages Microsoft Entra

URI locale exacte :

    http://localhost:3000/api/auth/callback/microsoft-entra-id

Variables à renseigner dans `.env.local` ou dans l’environnement de production :

    NEXTAUTH_URL="http://localhost:3000"
    NEXTAUTH_SECRET="une-valeur-longue-et-aleatoire"
    MICROSOFT_ENTRA_ID_CLIENT_ID="identifiant-de-l-application"
    MICROSOFT_ENTRA_ID_CLIENT_SECRET="Value-du-secret"
    MICROSOFT_ENTRA_ID_TENANT_ID="identifiant-reel-du-tenant"
    ALLOWED_EMAIL_DOMAIN="bios-expertise.com"

Pour une application interne à un seul tenant, utiliser l’identifiant GUID réel
du tenant. `common` ne doit être conservé que pour un scénario multi-tenant
explicitement voulu.

Permission minimale : Microsoft Graph délégué `User.Read`. Les permissions
organisationnelles nécessaires à la lecture du manager doivent être accordées
selon la politique du tenant.

## Procédure de vérification

    npm install
    npx prisma generate
    npx prisma migrate dev
    npm run lint
    npm test
    npx tsc --noEmit
    npm run build

Ne jamais copier `.env`, `.env.local`, les journaux OAuth, les secrets, les
mots de passe PostgreSQL ou `node_modules` dans une archive ou un dépôt.

## Diagnostic

| Code ou log | Cause probable | Action |
|---|---|---|
| AADSTS50011 | URI Entra non enregistrée ou différente | Vérifier l’URI exacte `microsoft-entra-id` |
| Unknown argument ext_expires_in | Adaptateur Prisma non filtré ou client non régénéré | Exécuter `npx prisma generate` et conserver l’adaptateur fourni |
| OAUTH_CALLBACK_HANDLER_ERROR | Erreur pendant le callback | Lire le détail serveur sans partager de jeton |
| Microsoft Graph 403 | Permission Graph insuffisante | Vérifier `User.Read` et les consentements du tenant |
| AccessDenied | Domaine non autorisé, compte désactivé ou profil incomplet | Vérifier le domaine et le profil Entra |
| Configuration | Client ID ou secret absent | Vérifier les variables d’environnement puis redémarrer Next.js |
