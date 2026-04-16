# Assets

Le front ne peut pas scanner automatiquement les dossiers en hébergement statique pur.

Pour ajouter des ressources :

1. Dépose les fichiers dans les dossiers adaptés :
   - `assets/backgrounds/`
   - `assets/stickers/`
   - `assets/frames/`
   - `assets/watermarks/`
   - `assets/fonts/`
2. Déclare-les dans `scripts/data/asset-manifest.js`.

Les polices personnalisées peuvent ensuite être chargées via `assets/fonts/` et la section `fonts` du manifest.
