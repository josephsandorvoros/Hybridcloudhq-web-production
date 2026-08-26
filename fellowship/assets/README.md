# Assets

Put custom static files for Fellowship Steps in this folder.

## Map image

The app ships with an optimized default map:

- `middle-earth-map.webp` — ~1800px wide, ~440 KB. Loaded first.
- `middle-earth-map.jpeg` — full 10000×5455 resolution (~19 MB). Used only if the WebP is missing.

To use your own map without changing code, add your image with one of these filenames:

- `middle-earth-map.webp`
- `middle-earth-map.png`
- `middle-earth-map.jpg`
- `middle-earth-map.jpeg`

The app checks these names automatically on load and uses the first one it finds (WebP first).

## Notes

- A wide horizontal image works best.
- Higher resolution is fine; the app scales it to fit the map area.
- Keep the route landmarks roughly aligned with the current overlay if you want the pins to match visually.
