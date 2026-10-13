# Photo du demandeur dans les notifications Web Push (V1)

## Objectif
Afficher la photo Microsoft Entra du demandeur pour les tickets **non confidentiels** ; conserver le texte court, la référence, le nom et le clic direct vers `/tickets/[id]`. Si la photo est absente, inaccessible, refusée ou non prise en charge par le navigateur, afficher l'icône locale 1TASK.

## Implémentation
- `User.image` est déjà renseigné par la synchronisation Microsoft Graph 96×96, sous forme d'une data URI (JPEG/PNG/GIF/WebP, maximum 128 Ko). Aucun changement de schéma ni nouvelle permission Graph.
- `lib/push-notification-service.ts` transmet uniquement `requesterPhotoUrl`, une URL relative pointant vers la notification de l'utilisateur. **Jamais** l'image encodée ni une URL Graph tierce dans le payload VAPID ; éviter les limites de taille des push.
- `GET /api/notifications/push-photo/[id]` vérifie successivement : session active, notification appartenant à l'utilisateur connecté et de canal PUSH, accès au ticket toujours valide, ticket **non confidentiel**, puis type/poids de l'image. Réponse `Cache-Control: private, no-store` et `X-Content-Type-Options: nosniff`, `404` dans les cas de refus.
- `public/push-sw.js` accepte exclusivement le chemin local protégé, vérifie la réponse et utilise son URL pour `showNotification({ icon })` ; `/push-icon.svg` sert de fallback et de badge. Le clic et le lien direct restent inchangés.
- L'affichage des photos via `Notification.icon` dépend du navigateur et de l'OS ; certaines plateformes n'affichent que le badge de l'application. Si la session n'est plus active lors du chargement de l'icône, le fallback demeure attendu.

## Invariants
- **Confidentialité :** aucun nom, numéro, photo ni description du demandeur dans un push de ticket confidentiel. Même une URL d'avatar déjà envoyée est revérifiée lors de l'accès.
- Pas de changement du texte in-app, des canaux de notification, préférences PUSH, VAPID, outbox, scheduler, dédoublonnage, permissions métier ou listes de destinataires.
- L'avatar est une présentation non essentielle : l'impossibilité de charger la photo ne doit **jamais** empêcher la notification ni son clic.

## Plan de vérification
1. CI GitHub Actions : `PRODUCT_PROFILE=v1` et `full` (tests, lint, TypeScript, migrations, build).
2. Test navigateur avec photo Entra valide (session ouverte puis navigateur en arrière-plan) : icône du demandeur et clic vers le ticket.
3. Demandeur sans photo / session expirée : logo 1TASK, clic conservé.
4. Destinataire non autorisé / notification d'un autre utilisateur / accès délégué révoqué : route avatar refuse avec 404.
5. Ticket confidentiel : aucun nom, photo ou référence dans le payload et réponse image 404.
6. Vérifier Chrome/Edge et mobile si utilisé : `Notification.icon` reste une possibilité d'affichage, jamais une garantie uniforme sur tous les OS.

**Pas de fusion de la PR avant validation CI et accord du propriétaire.** La vérification visuelle sur appareil demeure distincte des tests automatisés.
