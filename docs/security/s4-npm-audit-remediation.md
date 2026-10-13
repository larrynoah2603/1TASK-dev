# Lot S4 — Stabilisation du job Security S3 et remédiation des dépendances

## Diagnostic exact (job #115342014694)

Le job `Security — dependencies and tracked secrets` exécute `npm audit --package-lock-only --omit=dev --audit-level=high --no-fund` dans `.github/workflows/security-s3.yml`. `npm audit` retourne **exit 1** si au moins une vulnérabilité HIGH subsiste, même lorsque les tests applicatifs sont verts.

Versions dans `package-lock.json` au 13 octobre 2026 :

- `deepmerge-ts@7.1.5` — GHSA-ggr8-5vv4-36mx, corrigé en 8.0.0, dépendance déclarée de `@prisma/config@6.19.3` utilisé par `prisma@6.19.3`.
- `source-map-js@1.2.1` — GHSA-68fv-2mgg-jv7q, corrigé en 1.2.2, chaîne PostCSS.
- `npm audit` compte 4 entrées HIGH dans sa vue `--omit=dev`, notamment les packages parents Prisma concernés. Le scan de secrets séparé réussit : **aucun secret probable détecté parmi les 715 chemins suivis du dépôt** dans cette exécution.

La commande `npm audit fix --force` proposait un changement incompatible de version Prisma ; **ne pas la lancer** sans tests Prisma/NextAuth/CI, migrations et parcours de tickets.

## Correction temporaire de la CI (strictement limitée)

`scripts/security-audit-gate.mjs` analyse le JSON réel de `npm audit` et n'accepte que les résultats HIGH suivants **s'ils correspondent exactement à ces versions du lockfile** :
- `deepmerge-ts@7.1.5` → GHSA-ggr8-5vv4-36mx ;
- `@prisma/config@6.19.3` → uniquement dépendance vulnérable `deepmerge-ts` ;
- `prisma@6.19.3` → uniquement dépendance vulnérable `@prisma/config` ;
- `source-map-js@1.2.1` → GHSA-68fv-2mgg-jv7q.

Une **nouvelle vulnérabilité HIGH**, une **CRITICAL**, une modification des versions, une réponse `npm audit` illisible, un problème réseau ou une exception expirée restent bloquants. `continue-on-error` n'est pas utilisé. La dérogation **expire automatiquement le 28 octobre 2026 à 00:00 UTC**. Elle ne corrige **aucune** vulnérabilité. L'audit global CRITICAL et la recherche de secrets restent actifs.

Cette correction remet la CI en état de surveiller les *nouvelles* alertes pendant la remédiation ; elle **ne signifie pas « sécurité validée »**. La dette de vulnérabilités est visible dans la sortie de build, les annotations et le résumé GitHub Actions.

## Correction définitive demandée (PR distincte avant échéance)

Dans une branche dédiée, **ne modifier que** `package.json` et `package-lock.json` au départ :

```bash
npm ci
npm explain deepmerge-ts
npm explain source-map-js
npm pkg set 'overrides.source-map-js=1.2.2'
# Vérifier d'abord la compatibilité de deepmerge-ts 8 avec @prisma/config 6.19.3,
# puis appliquer une surcharge ciblée ou une version Prisma compatible.
npm install --package-lock-only --ignore-scripts
npm ci
npm audit --package-lock-only --omit=dev --audit-level=high --no-fund
npm audit --package-lock-only --audit-level=critical --no-fund
npm run validate
```

Pour `deepmerge-ts`, le saut de version 7→8 est majeur. Ne pas le masquer par une exception permanente ni rétrograder Prisma à l'aveugle. Faire une proposition de version/surcharge testée sur la génération Prisma, les migrations, les CI V1 et Full et les cas Entra. Un `npm install --package-lock-only` avec accès npm Registry fiable est nécessaire pour obtenir les `integrity` et URLs du lockfile. **Ne pas fabriquer manuellement ces informations.**

Supprimer `scripts/security-audit-gate.mjs`, les dérogations et le test associé après suppression des alertes HIGH. Revenir au workflow S3 strict d'origine.

## Recette avant fusion
- PR S4 : pipeline Security S3 vert **avec avertissements connus affichés** et CI V1/Full vertes.
- Test de la politique qui bloque toute nouvelle HIGH, toute CRITICAL, toute variation de GHSA/version et tout rapport erroné.
- Pas de régression des flux V1, du Web Push, des permissions, de la confidentialité, de la création de tickets et de la base.
- Validation propriétaire avant fusion. Ne pas confondre statut de CI temporairement stabilisée et vulnérabilités éliminées.
