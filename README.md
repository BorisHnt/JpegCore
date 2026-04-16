# JpegCore

JpegCore est une V1 front-end only d'editeur d'images kitsch inspire des montages Skyblog / MSN / vieux forums.

## Lancer localement

Les modules ES sont plus fiables via un petit serveur statique que via `file://`.

```bash
cd "/run/media/bhanicot/PHILIPS32GB/Websites Projects/JpegCore"
python3 -m http.server 8123
```

Puis ouvrir `http://127.0.0.1:8123`.

## Structure

- `index.html` : shell principal.
- `styles/main.css` : direction artistique retro 2000s.
- `scripts/main.js` : orchestration de l'app.
- `scripts/state/` : etat global et historique undo/redo.
- `scripts/core/` : rendu de scene et interactions.
- `scripts/features/` : export PNG, clavier, sabotage visuel, chargement d'assets.
- `scripts/data/asset-manifest.js` : manifest simple a maintenir.
- `assets/` : fonds, stickers, cadres, watermarks, polices.

## Ajouter des ressources

1. Deposer les fichiers dans les bons dossiers de `assets/`.
2. Les declarer dans `scripts/data/asset-manifest.js`.

## V1 inclut

- fond unique + import local
- watermarks images ou texte, repetables
- stickers illimites
- textes illimites avec contour / ombre / glow
- cadre au-dessus de la composition
- liste simple de calques
- selection, deplacement, resize, rotation
- undo / redo
- `Rendre pire` et `Re-rendre pire`
- export PNG
