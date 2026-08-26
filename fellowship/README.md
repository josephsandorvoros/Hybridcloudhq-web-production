# Fellowship Steps

Fellowship Steps is a browser-based walking tracker that maps your real-world step totals onto the Fellowship's journey from Hobbiton to Mount Doom.

## Files

- `index.html` contains the app shell, UI structure, and the onboarding / settings / export dialogs.
- `styles.css` contains the visual system, layout, and map styling, including responsive breakpoints for desktop, portrait, and mobile.
- `script.js` contains the journey logic, manual step tracking, local storage, streak tracking, milestone celebrations, and optional map asset detection.
- `data/poi.json` stores waypoint metadata and total journey distance.
- `data/path.json` stores dense route coordinates used by the overlay path.
- `assets/` is where custom map images and future static resources belong.

## Run locally

From this folder:

```bash
python3 -m http.server 4173
```

Then open `http://127.0.0.1:4173/` in a browser.

## Features

- **Manual step tracking** — add or subtract steps; a quick-add row (+500 / +1k / +5k / +10k) makes logging fast.
- **Adjustable stride length** — set your stride in meters (default 0.76 m) to convert steps to distance.
- **Distance display** — kilometers, miles, or meters.
- **Journey progress** — a progress ring and bar show how far you are from Mount Doom (1,550 mi / 2,494 km).
- **Quest progress log** — a compact list of all 12 waypoints with reached / current / upcoming status, plus a "next up" progress bar between your current and next waypoint.
- **Waypoint popovers** — click or focus any map pin (or quest-log entry) to see its lore and target distance. Popovers clamp to the map edges and flip to stay in view.
- **Milestone celebrations** — a burst and toast fire when you pass a waypoint, with a special message at Mount Doom.
- **Walking streak** — a "Walking streak" card tracks your current streak, best streak, total steps, and active days, with a 14-day bar chart.
- **Dark / parchment themes** — toggle from the header; the theme-color meta follows the active theme.
- **Onboarding & settings** — a "How it works" dialog introduces the tracker, and a Settings dialog adjusts stride length, display units, and theme.
- **Optimized map** — the bundled map loads as a small WebP (with a high-res JPEG fallback) and is framed to sit inside the UI.
- **Responsive layout** — the dashboard reflows from a two-column grid on desktop to a single column on portrait and mobile, with the map, tracker, quest log, and streak all stacking cleanly.
- **Keyboard & screen-reader support** — map pins and quest-log entries are focusable and activatable with Enter/Space; Escape closes popovers.

## Map asset support

If you have a high-resolution Middle-earth map, put it in `assets/` using one of these names:

- `middle-earth-map.webp` (preferred — smallest)
- `middle-earth-map.png`
- `middle-earth-map.jpg`
- `middle-earth-map.jpeg`

The app detects the best available format automatically (WebP first) and renders it beneath the Fellowship route overlay.

## State storage

Progress, streak history, theme, and settings are stored locally in the browser under `fellowship-steps-web`.
