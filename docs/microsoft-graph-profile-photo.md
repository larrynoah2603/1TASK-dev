# Photo de profil Microsoft Graph dans 1TASK

## Fonctionnement

Lors de la synchronisation Entra côté serveur, 1TASK appelle `GET https://graph.microsoft.com/v1.0/me/photos/96x96/$value`. Microsoft Graph renvoie les données binaires de la photo ; l’application les convertit en data URI et les conserve dans le champ utilisateur `User.image`, déjà présent dans le schéma Prisma. Aucune migration Prisma n’est nécessaire.

Le serveur limite les images à 128 Ko et accepte uniquement `image/jpeg`, `image/png`, `image/gif` et `image/webp`. Une réponse `404` signifie que l’utilisateur n’a pas de photo : l’interface affiche alors ses initiales. Une réponse `403` ou une erreur temporaire conserve la dernière photo connue et n’empêche pas la connexion.

La photo n’est jamais récupérée directement depuis le navigateur avec un jeton Graph. Elle est lue pendant la synchronisation serveur et affichée dans la sidebar, le menu profil et `/profile`.

## Configuration Microsoft Entra

L’application utilise actuellement le scope délégué `User.Read`, déjà présent dans `lib/microsoft-entra-id-provider.ts` et `lib/auth.ts`. Microsoft Graph documente `GET /me/photo/$value` et les tailles HD, notamment `96x96` [1]. Pour les comptes professionnels, `ProfilePhoto.Read.All` est la permission la moins privilégiée documentée pour la lecture des photos utilisateur ; `User.Read` est aussi listé comme permission déléguée de niveau supérieur [1].

Si Graph renvoie `403`, ouvrir **Microsoft Entra admin center → App registrations → 1TASK → API permissions → Microsoft Graph → Delegated permissions**, ajouter `ProfilePhoto.Read.All`, puis demander le consentement administrateur si le tenant l’exige. Le code conserve alors le fallback sur les initiales tant que le consentement n’est pas accordé.

Ne pas ajouter de permission d’écriture comme `ProfilePhoto.ReadWrite.All` : 1TASK ne modifie pas les photos.

## Après déploiement

Après avoir mis à jour les permissions Entra, redémarrer l’application, se déconnecter puis se reconnecter avec Microsoft Entra ID. La synchronisation est exécutée par l’événement `signIn`. Une nouvelle connexion récupère donc la photo et met à jour `User.image`.

Pour vérifier le résultat :

1. Ouvrir `/profile` et vérifier la photo affichée dans l’en-tête.
2. Vérifier l’avatar de la sidebar et du menu en haut à droite.
3. Ouvrir les outils réseau du navigateur et confirmer qu’aucun jeton Graph n’est envoyé au client.
4. Vérifier que l’absence de photo affiche les initiales sans erreur.
5. Tester un utilisateur hors tenant ou sans consentement : la connexion doit continuer avec les initiales.

## Sécurité et limites

Le champ `User.image` contient une data URI encodée. Cette approche évite un nouveau stockage externe et convient à une photo de petite taille, mais elle augmente la taille de la ligne utilisateur. Si le nombre d’utilisateurs devient important, remplacer ce stockage par un objet privé S3 ou Blob et conserver uniquement une clé dans PostgreSQL. Microsoft recommande de demander le minimum de permissions nécessaire [2].

## Références

[1]: https://learn.microsoft.com/en-us/graph/api/profilephoto-get?view=graph-rest-1.0 — Microsoft Learn, « Get profilePhoto ».

[2]: https://learn.microsoft.com/en-us/graph/permissions-reference — Microsoft Learn, « Microsoft Graph permissions reference ».
