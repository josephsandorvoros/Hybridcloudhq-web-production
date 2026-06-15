# Fellowship Steps

Fellowship Steps is a browser-based walking tracker that maps your real-world step totals onto the Fellowship's journey from Rivendell to Mount Doom.

## Files

- `index.html` contains the app shell and UI structure.
- `styles.css` contains the visual system, layout, and map styling.
- `script.js` contains the journey logic, manual step tracking, local storage, optional map asset detection, and calibration tooling.
- `data/poi.json` stores waypoint metadata and total journey distance.
- `data/path.json` stores dense route coordinates used by the overlay path.
- `assets/` is where custom map images and future static resources belong.

## Run locally

From this folder:

```bash
python3 -m http.server 4173
```

Then open `http://127.0.0.1:4173/` in a browser.

## Map asset support

If you have a high-resolution Middle-earth map, put it in `assets/` using one of these names:

- `middle-earth-map.webp`
- `middle-earth-map.png`
- `middle-earth-map.jpg`
- `middle-earth-map.jpeg`

The app will detect it automatically and render it beneath the Fellowship route overlay.

## State storage

Progress is stored locally in the browser under `fellowship-steps-web`.

## Current behavior

- Manual step tracking only
- Adjustable stride length
- Distance display in kilometers, miles, or meters
- Journey progress ring and bar
- Waypoint popovers and achievement cards
- Optional custom map background from `assets/`
- Calibration mode to capture SVG coordinates by clicking the map and copy JSON snippets

## Calibration workflow

1. Click `Calibration mode` in the map header.
2. Click points on the map to collect coordinates in SVG space.
3. Use `Copy` in the calibration panel.
4. Paste route arrays into `data/path.json` and POI objects into `data/poi.json`.
