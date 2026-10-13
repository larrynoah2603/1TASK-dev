# S3 — revue de sécurité approfondie, matrice d'accès et analyse continue

## Inventaire du 13 octobre 2026 (code de `main` après S2)

- 83 routes API, 44 pages et 143 fichiers de tests présents avant ce lot ; un seul workflow CI initial.
- Pile contrôlée dans le dépôt : Next.js 16.3.8, NextAuth 4.24.15, React 19.2.8, Prisma 6.19.3, PostgreSQL, Microsoft Entra ID, Vercel, Web Push.
- Authentification : `lib/auth-policy.ts` refuse explicitement `administrativelyDisabled` au **sign-in**, mais `lib/server-auth.ts` vérifiait uniquement `status` pour une session existante, et l'accès au bootstrap administrateur ne revérifiait pas non plus ce drapeau. Ceci est le correctif de sécurité réel de S3.
- Les policies `canViewTicket`, `hasScopedRole`, `canReadReporting` et `delegationAllowsAction` sont testées **sans les mocker**, pour demandeur, agent, responsable de file, administrateur technique, lecteur reporting, administrateur fonctionnel et combinaisons de rôles.
- Les audits de dépendances et les contrôles de secrets étaient absents du pipeline d'intégration précédent.

## Correctifs S3 livrés dans cette branche

1. `lib/server-auth.ts` : empêcher un compte `administrativelyDisabled` d'utiliser une session active pour les routes/tickets, et refuser toute forme d'administration, y compris le bootstrap en attente. La désactivation est effective sans attendre une nouvelle connexion ; les comptes actifs conservent leurs accès.
2. `tests/security-s3-revoked-session.test.ts` : session suspendue, rôles encore attachés, administrateur global, compte en attente, compte actif, absence de session.
3. `tests/security-s3-access-matrix.test.ts` : règles réelles sur tickets ordinaires/confidentiels, rôle/reporting, files/équipes, rôles cumulés, actions de délégation.
4. `scripts/security-secret-scan.mjs` : scanner léger de **motifs de secrets à forte confiance**, uniquement dans les fichiers texte suivis par Git ; en cas de détection, n'écrit jamais la valeur, seulement le chemin, la ligne et la catégorie. Les grands fichiers et extensions binaires sont ignorés et signalés. Tests synthétiques `tests/security-s3-secret-scan.test.ts`.
5. `.github/workflows/security-s3.yml` : audit automatique des vulnérabilités du lockfile via `npm audit`, priorité élevée/critique pour les dépendances de production et critique pour les outils de développement, plus scan des secrets à chaque PR, push `main` et lancement manuel. Ces contrôles sont **supplémentaires**, sans désactiver la CI V1/Full existante.

## Limites, accès nécessaires et prochaines actions

- **Le scanner local ne parcourt pas l'historique Git, les secrets Vercel, les logs, l'historique des PR ni les identifiants Microsoft**. Activer **GitHub Secret Scanning avec push protection** et vérifier son activation dans les paramètres du dépôt ; le connecteur GitHub actuel ne donne pas accès aux alertes privées Dependabot, code scanning et secret scanning. Ne pas supposer qu'elles sont vides.
- **`npm audit` est une analyse basée sur les avis publiés** ; elle ne prouve pas l'absence de vulnérabilité inconnue et ne remplace pas SAST, revue de logique ni pentest. Les dépendances exposées par le lockfile sont celles du jour du scan. Les avis de sécurité élevés devront être résolus ou acceptés explicitement avant la fusion.
- La **protection WAF/rate limiting distribué** de S2 reste à configurer dans Vercel Firewall ou une infrastructure partagée ; pas de compteur mémoire artificiellement « sécurisé ».
- La **CSP stricte par nonce** et **scan antivirus des fichiers Full** restent en dehors du lot S3 tant qu'une validation Entra/Next.js et l'infrastructure antimalware n'ont pas été choisies.
- **Recette authentifiée requise avant fusion** : administrativement suspendre un agent et un admin ayant une session active, tenter lecture/mutation de ticket, export, Push/photo et console ; réactiver le compte ; vérifier multi-rôles et délégation confidentielle. Vérifier aussi les différents navigateurs mobiles.
- **Contrôle réel des environnements** : examiner avec un administrateur GitHub/Vercel/Entra la 2FA, moindre privilège des environnements de déploiement, rotation des secrets, droits des service principals, audit et rétention, domaine autorisé et journaux. Aucun accès à ces consoles n'a été utilisé ici.
- Les scans automatiques et tests ne remplacent pas un **pentest autorisé** : tests IDOR, CSRF, abus de rate limit, SSRF, sessions expirées, injection, Graph permissions, contrôle HTTP de 401/403/404, sécurisation des backups et incidents.

## Conditions de validation

- CI V1 et Full vertes avec builds/TypeScript/Prisma.
- Nouveau workflow S3 vert (ou audit de dépendances suivi de remédiations documentées).
- Tests de révocation sur Preview avec compte de test, sans aucun secret réel ajouté au dépôt.
- PR relue et approuvée ; **pas de fusion automatique**.
