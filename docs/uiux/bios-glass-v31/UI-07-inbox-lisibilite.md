# UI-07 — Lisibilité de la liste des tickets

Livraison finalisée le 15 octobre 2026 ; contrôles exécutés le 14 octobre.
Ce lot complète la correction UI-06, sur l’archive fournie. Aucun déploiement.

## Changements de présentation

- Références au format réel `TCK-YYYYMMDD-XXXXXXXX` sur une seule ligne, en 12 px
  et police mono du profil. La colonne dédiée réserve 12 rem ; une valeur
  exceptionnellement longue est protégée par une ellipse et un attribut `title`.
- Largeurs explicites pour priorité, statut, demandeur, SLA et activité ;
  le sujet reçoit la largeur restante dans le tableau à sept colonnes.
- Sujet limité à deux lignes dans les tableaux. Le titre intégral est affiché
  dans les détails rapides et reste entier sur les cartes mobiles.
- Dans le tableau condensé, statut et priorité partagent une ligne quand ils
  tiennent ; ils reviennent à la ligne lorsque le conteneur rétrécit.
- La ligne développée porte un repère orange persistant. Les actions existantes,
  notamment « Prendre en charge », sont conservées avec les mêmes conditions.
- Date compacte conservée, avec élément `time`, date ISO, libellé complet pour
  l’accessibilité et au survol. La date complète est aussi visible dans les
  détails rapides, accessibles au clavier.

## Conflit responsive corrigé

Les règles V1 faisaient apparaître les cellules condensées avec un sélecteur
plus spécifique que celui censé les masquer à partir de 1450 px de conteneur.
Le navigateur affichait alors **11 colonnes au lieu de 7**. Le sélecteur de
masquage cible maintenant explicitement les `th` et `td`, à la même spécificité.
Les seuils existants sont conservés : cartes sous 700 px, quatre colonnes à partir
de 700 px, sept à partir de 1450 px dans `.inbox-v2`. Le mode générique à sept
colonnes à partir de 1100 px reste également vérifié.

Aucune nouvelle feuille CSS, aucun nouvel `!important` et aucun panneau
supplémentaire dans l’application. Les règles sont corrigées dans
`styles/design-system.css`. `uupm-refonte.css` reste à 55 `!important`.

## Vérifications réellement exécutées

| Contrôle | Résultat |
|---|---|
| Vitest V1 | 775 réussis, 11 ignorés ; 149 fichiers réussis, 3 ignorés |
| Lint | Réussi |
| TypeScript | Réussi via `npm run typecheck` après nettoyage des types générés |
| Compilation Next.js | Réussie, TypeScript compris ; 22 pages statiques générées |
| Chromium, clair et sombre | 34 configurations vérifiées après correction |
| Viewports | 320, 375, 390, 768, 1024, 1280, 1440, 1920 px |
| Conteneurs indépendants du viewport | 640, 699, 700, 900, 1100, 1449, 1450, 1520 px dans un viewport de 1700 px |
| Mode générique | Conteneur de 1100 px dans un viewport de 1440 px |
| Références | Les trois références au format réel restent entières et sur une ligne dans toutes les configurations |
| Titres | Maximum deux lignes dans le tableau ; texte long intégral disponible dans les détails |
| Débordements | Aucun débordement horizontal de document ni de cellule dans les configurations testées |
| Adaptation | Nombre de colonnes visible conforme au mode attendu : 0 (cartes), 4 ou 7 |
| Clavier | Développement par Entrée, `colSpan` 4/7, titre et date complets accessibles |
| Prise en charge | Confirmation ouverte, fermeture par Échap et retour du focus ; mutation serveur non exécutée |

Les 11 tests ignorés correspondent aux 10 tests PostgreSQL sans base et au test
navigateur du collecteur historique UI-05 ; les contrôles Chromium UI-07 sont
exécutés séparément. Le build suit les étapes du projet avec le validateur lancé
par `node --import tsx`, pour éviter la restriction IPC du lanceur `tsx` dans cet
environnement. Configuration Preview, V1, URL PostgreSQL fictive locale.

## Preuves et limites

Le paquet contient `preuves/inbox/avant` et `preuves/inbox/apres`, chacun avec
`results.json`. Les 14 captures de ce lot montrent le **vrai composant de liste**
avec des données fictives, sous profil BIOS actif : mobile et desktop, clair et
sombre, ainsi que les détails développés. Elles sont cadrées sur le composant
et ne contiennent pas le panneau de comparaison des badges du lot UI-06.

Le fichier de test n’est importé par aucune route applicative. Ces images ne
représentent pas une session authentifiée ni une capture de l’Inbox complète.
La navbar, les filtres, les rôles, les permissions, le backend et les fonctions
V1/Full n’ont pas été changés. La validation authentifiée A–J du rapport UI-06
reste à faire sur une instance de recette autorisée.

Reproduction depuis le projet, avec les dépendances installées et Prisma généré :

```bash
CHROME_BIN=/chemin/chromium PLAYWRIGHT_MODULE=/chemin/playwright/index.mjs \
  node scripts/uiux-inbox-columns-browser.mjs --output=/chemin/preuves
```

Pour comparer avec UI-06, ajouter `--baseline` et
`--baseline-dir=/chemin/ancien-paquet/projet`. En mode baseline, les écarts sont
relevés sans exiger les critères de la correction ; seul le rapport **après**
constitue le contrôle des critères UI-07.
