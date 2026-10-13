# Lot S2 — défense en profondeur HTTP / Push / pièces jointes

> Portée : V1 inchangée sur le plan métier, Full dormant. Les changements doivent rester isolés dans une PR, avec validation CI V1 et Full et recette authentifiée avant fusion.

## Résultats de l'inspection du code existant

1. `next.config.ts` ne déclarait pas de protection explicite de framing/CSP ni de politique d'ensemble de cache pour les API.
2. `/api/notifications/push-subscriptions` acceptait une URL externe contrôlée par un utilisateur authentifié, sans vérification du fournisseur Web Push ni taille maximale du JSON ; les secrets de souscription étaient retournés à la UI en réponse au POST.
3. Les pièces jointes **Full** avaient une limite de 10 Mo et une liste MIME déclarative, mais leurs octets n'étaient pas comparés à la signature du format. Le stockage privé et les contrôles d'accès sont déjà présents.
4. La télémétrie supprimait les secrets de clé mais ne supprimait pas systématiquement les e-mails et noms de fichier dans des contextes techniques.

## Correctifs intégrés

- **En-têtes navigateur** : `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`, `Referrer-Policy: same-origin`, `Permissions-Policy` restreinte et CSP **ciblée** (`base-uri 'self'; object-src 'none'; frame-ancestors 'none'`). HSTS activé uniquement si `VERCEL_ENV=production`. Ces directives ne touchent pas `script-src`, `style-src` et `connect-src` : l'activation d'une CSP stricte sans nonce pourrait bloquer Next.js, Microsoft Entra ou le service worker.
- **Caches** : toutes les réponses `/api/:path*` et les principales pages authentifiées déclarent `Cache-Control: private, no-store, max-age=0`, sans modifier la politique des ressources statiques `/_next`. Les routes privées de photo/attachement conservent leur vérification d'accès.
- **Inscriptions Push** : validation HTTPS et fournisseurs connus (FCM/Firefox/Safari/Windows), JSON borné à 4 Ko, clés vérifiées, refus des requêtes cross-origin et réponse ne contenant plus les clés P-256. La synchronisation et suppression des abonnements par appareil restent opérationnelles. Cela réduit la surface SSRF : tout nouveau fournisseur doit être ajouté après vérification.
- **Fichiers Full** : vérification des signatures PDF/JPEG/PNG/WebP/ZIP/OOXML avant stockage, rejet NUL pour texte et CSV ; téléchargement en `Content-Disposition: attachment` avec `nosniff` et CSP `sandbox`. Pas de décompression ZIP ni de modification des permissions. **Une signature conforme ne garantit pas l'absence de malware**.
- **Logs** : rédaction des champs courants d'identité, de nom de fichier, de photo et de contenu, tout en préservant les identifiants de trace et les noms d'opérations nécessaires à la supervision.

## Limites assumées et exigences externes

1. **Rate limiting distribué** : le dépôt n'a pas d'outil de limitation résistant à la montée en charge en mode V1 ; `REDIS_REST_URL` est dormant dans ce profil. Il serait incorrect d'affirmer qu'un compteur en mémoire limite un déploiement Vercel multiprocessus. Configurer les règles Vercel Firewall/WAF ou adopter un compteur partagé avec tests de concurrence dans une PR de déploiement dédiée, après consultation des capacités réellement disponibles. Les limites de taille et restrictions Push ci-dessus restent utiles mais **ne constituent pas** un rate limiter complet.
2. **CSP stricte avec nonce** : effectuer un déploiement Preview authentifié et une phase `Content-Security-Policy-Report-Only` adaptée aux scripts et styles actuels. Tester NextAuth/Microsoft Entra, service worker, notifications, graphiques et les deux thèmes avant de durcir.
3. **Fichiers Full** : scan antimalware côté stockage/traitement, plafonds de volume et bombes ZIP, protections contre le téléchargement abusif et contraintes de signature de formats imbriqués ne sont pas couverts. Les pièces jointes ne sont pas activées en V1.
4. **Vérification d'en-têtes réels** : contrôler la réponse effective de Vercel et non seulement `next.config.ts`. Contrôler les images privées et les réponses `401`, `403`, `404`, `429`.
5. **Services Push** : tester les inscriptions et le push réel sur Chrome/Edge/Firefox/Safari utilisés par l'équipe, car les domaines varient et les navigateurs peuvent étendre leurs opérateurs.
6. **Recette de non-régression** : single sign-on Entra, création/prise en charge de tickets, notifications en arrière-plan, abonnements appareil multiples, action unique Nouveau, accès confidentiel, rôles combinés, et UI BIOS clair/sombre.

**Aucun modèle de données ni workflow V1 n'est volontairement modifié.** N'effectuer aucune fusion tant que CI, analyse et accord du propriétaire ne sont pas réunis.
