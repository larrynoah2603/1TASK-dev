# Captures de recette du module actifs

Les images PNG ne sont volontairement **pas versionnées** : l’interface Codex utilisée pour créer la pull request ne prend pas
en charge les fichiers binaires. Elles peuvent être régénérées localement à viewport constant après avoir démarré la version de
référence sur le port `3001` et la version modifiée sur le port `3002`.

```bash
google-chrome \
  --headless \
  --no-sandbox \
  --disable-gpu \
  --hide-scrollbars \
  --window-size=1440,1600 \
  --screenshot=/tmp/1task-avant-dashboard.png \
  http://127.0.0.1:3001/preview

google-chrome \
  --headless \
  --no-sandbox \
  --disable-gpu \
  --hide-scrollbars \
  --window-size=1440,1600 \
  --screenshot=/tmp/1task-apres-libre-service-actifs.png \
  http://127.0.0.1:3002/preview
```

## Points de contrôle après modification

- Le bloc **Nouveau libre-service / Mes actifs** est visible sous le tableau de bord de démonstration.
- Les cartes utilisent la même surface, le même rayon, la même bordure et la même ombre.
- Le bouton **Demander un actif** est l’action primaire de la section.
- Les numéros d’inventaire, numéros de série, dates d’attribution et badges d’état restent lisibles.
- À largeur mobile, l’en-tête et les cartes passent sur une colonne sans débordement horizontal.
