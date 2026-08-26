# Fellowship Steps — Improvement Plan

A fresh-eyes review of the app, its interactions, flow, and style. Findings below were
verified by running the app (`python3 -m http.server 4173`) and inspecting the live DOM,
not just reading the code.

**Stack:** single-page vanilla JS (`script.js`, ~1280 lines), one `index.html`, one
`styles.css`, two JSON data files, one 19 MB map image. No build step, no framework,
state in `localStorage`.

---

## TL;DR — the three things that matter most

1. **The map is the soul of the app, and it's currently broken.** The route line doesn't
   track progress, the overlay is misaligned with the geography, and the image is
   stretched. Fixing the map is the single highest-leverage change.
2. **The core loop (add steps → watch the journey advance) is underwhelming.** There's
   no milestone moment, no history, no quick-add, and the "achievements" feature that's
   described in code is never rendered.
3. **A lot of dead/misleading code and docs** (calibration mode, POI editor, `path.json`)
   create a gap between what the README promises and what the app actually does.

---

## P0 — Fix what's broken (do these first)

### 1. The route-progress line doesn't track progress
**File:** `styles.css` (`.route-progress`), `script.js` (`renderMap`)

The progress line uses a hardcoded `stroke-dasharray: 1200`, but the real route path is
only **~529 units** long (measured via `getTotalLength()`). Because the dash (1200) is
far longer than the path (529), the line is **fully drawn by ~44% progress and never
changes again** for the rest of the journey. The last 56% of the quest shows no movement
on the map line.

**Fix:** compute the real path length in JS after the route is built and set both
`stroke-dasharray` and the offset base to that value (or use `pathLength="100"` on the
`<path>` so the dash math is always 0–100). This makes the gold line grow in lockstep
with the traveler marker.

### 2. The map image is stretched (aspect mismatch)
**File:** `index.html` (`#mapImageSvg`), `script.js` (`initMapAsset`)

The SVG `viewBox` is `1000 × 420` (aspect **2.38**) but the map image is
`10000 × 5455` (aspect **1.83**). With `preserveAspectRatio="none"` the image is
stretched to fill, so the map looks squashed/distorted.

**Fix:** either (a) change the `viewBox` to match the image aspect (e.g. `0 0 1000 545.5`)
and re-project the waypoint coordinates, or (b) use `preserveAspectRatio="xMidYMid slice"`
and accept letterboxing. Option (a) is the correct one and pairs with #3.

### 3. The overlay doesn't line up with the geography
**File:** `data/poi.json`, `data/path.json`, `script.js`

The waypoint pins (x 317–658, y 112–303) only cover the left-center of the map and do not
sit on the real places (e.g. the "Rivendell" pin is not over Rivendell on the map). The
route is a straight-line polyline snapped between pins, not the actual road.

**Fix:** re-calibrate the 12 waypoint coordinates against the real map, and replace the
straight-line route with a hand-traced path that follows the road on the map. This is the
work that makes the fantasy premise actually land. (This is exactly what the "calibration
mode" in the README was supposed to help with — see #7.)

### 4. `data/path.json` is dead — the dense route is never used
**File:** `script.js` (`init`)

`init()` unconditionally calls `buildRouteFromWaypoints()` when `ENABLE_POI_EDITING` is
false (which it always is), **overwriting** whatever was loaded from `path.json`. So the
carefully-authored 26-point route in `path.json` is silently discarded and the app always
draws straight lines.

**Fix:** decide the source of truth. If `path.json` is the real route, stop overwriting it.
If the straight-line route is intended, delete `path.json` and the fetch so the code and
the data agree.

### 5. Dead code and a duplicate function
**File:** `script.js`

- `renderAchievements()` targets `#achievementsGrid`, which **does not exist** in the
  HTML — it returns early and never runs.
- `renderCalibrationOutput()` / `copyCalibrationOutput()` / `undoCalibrationPoint()` /
  `clearCalibrationPoints()` target `#calibrationOutput`, which **does not exist**.
- `toggleCalibrationMode()` just sets `calibration.enabled = false` (a no-op) and no
  button is wired to it.
- `setCurrentPoiOverride()` is **declared twice** (the second definition wins).

**Fix:** delete the dead calibration + achievements code, or build the features it was
meant to support (see P1 #6 and P2). Remove the duplicate.

### 6. The 19 MB map image is a performance problem
**File:** `assets/middle-earth-map.jpeg` (19,497,651 bytes, 10000×5455)

A 19 MB JPEG is slow to fetch and decode, and it's displayed in a ~700 px box. The
"drop a map into assets" hint also lingers for several seconds while the image is probed.

**Fix:** ship a web-optimized version (e.g. a ~1600–2000 px wide WebP, a few hundred KB)
as the default, keep the HD file optional. Show a proper loading state on the map while
the image decodes instead of the "drop a map" hint.

---

## P1 — Improve the core flow and interactions

### 1. Make "add steps" a one-tap, satisfying loop
**File:** `index.html` (controls card), `script.js`

Right now you must type a number into "Steps per action" then click Add. Add quick-add
presets as big tappable buttons: **+500 / +1,000 / +5,000 / +10,000**, plus a "log today's
walk" affordance. Keep the custom input for precision. This is the action the user takes
every day — it should be the fastest, most rewarding thing on the page.

### 2. Celebrate milestones (the "achievement" that's missing)
**File:** `script.js` (`render`, `updateSteps`), `index.html`

When a step crosses a waypoint distance, there's no moment — the numbers just tick. Add a
celebration: a toast/banner ("You've reached Rivendell!"), a brief pulse on the map pin,
and unlock the waypoint in the list. The `completionIds()` logic already exists; surface it.
This is the emotional payoff of the whole app and it's currently absent.

### 3. Add a journey history / log
**File:** `script.js` (state), `index.html`

Steps are a single cumulative counter with no history. Add a lightweight log of entries
(`{date, delta, note}`) so the user can see daily/weekly totals, a streak, and a small
sparkline or bar chart of the last 14 days. This turns a counter into a habit tracker and
gives "Last update" real context.

### 4. De-duplicate the waypoint list and the map
**File:** `index.html`, `script.js`

The "Journey log / Waypoints" card and the map both render all 12 waypoints with the same
blurbs. Pick a role for each: the **map** is for spatial progress (pins + route), the
**list** is for the narrative (blurbs, distance, locked/unlocked). Make the list a
vertical "quest log" with clear current/next/upcoming states and a progress tick per
segment, rather than a second copy of the map.

### 5. Fix popover positioning and make it robust
**File:** `script.js` (`openWaypointPopover`)

The popover is positioned with absolute pixel math that can overflow the map edges and
misaligns when zoomed/panned. Anchor it to the waypoint's screen position with clamping to
the map bounds, and close it on Escape / outside click (partially present). Consider a
single shared detail panel instead of a floating popover.

### 6. Decide the fate of calibration / POI editing
**File:** `script.js`, `index.html`, `README.md`

The README documents a "Calibration workflow" and a POI editor, but `ENABLE_POI_EDITING`
is `false`, the panel is hidden, and the calibration UI doesn't exist. Either (a) build a
real, minimal calibration tool (click map → capture SVG coords → write `poi.json`), or
(b) remove the feature and its docs. Right now it's a promise the app doesn't keep.

### 7. Make the map keyboard- and screen-reader-accessible
**File:** `index.html`, `script.js`

Waypoints are clickable but not focusable; the map has no keyboard path. Make each
waypoint focusable (`tabindex`, `role="button"`, Enter/Space to open), add an `aria-live`
region for progress announcements, and ensure the zoom/pan controls are reachable.

---

## P2 — Style and polish

### 1. Reconcile the map's light parchment with the dark UI
**File:** `styles.css`

The map stage is a bright parchment rectangle floating in a dark, gold-accented UI. It
reads as a separate widget, not part of the world. Frame it (aged border, subtle inner
shadow, corner ornaments) so it feels like a map *in* the app, and let the parchment tone
shift with the dark/parchment theme.

### 2. Fix waypoint label legibility on the map
**File:** `styles.css` (`.waypoint-label`), `script.js`

Labels are tiny, gold-on-map, and overlap at default zoom. Add a subtle text halo/backing,
hide labels below a zoom threshold (show on hover/zoom), and offset colliding labels.

### 3. Add a favicon, theme-color, and a real loading state
**File:** `index.html`

No favicon or `<meta name="theme-color">`. Add a ring/footprint favicon, a theme-color
meta that follows the active theme, and a skeleton/loading state for the map and data.

### 4. Promote the theme toggle
**File:** `index.html`, `script.js`

Dark vs. parchment is buried in Settings. A small toggle in the header makes the
parchment mode (which is thematically perfect) discoverable.

### 5. Tighten the hero
**File:** `index.html`

The hero summary is long and the two buttons ("How it works", "Settings") are low-value
at the top. Consider leading with the live journey state (current location + % + next
stop) so the first thing you see is *your* progress, not marketing copy.

---

## P3 — Stretch / nice-to-have

- **PWA / offline:** add a manifest + service worker so it installs and works offline
  (it's a local `http.server` app today; a PWA makes it a real daily companion).
- **Step-count import:** paste or import from a wearable/CSV instead of only manual entry.
- **Companion characters:** show which Fellowship members are "with you" per segment
  (Gandalf leaves at the Bridge of Khazad-dûm, etc.) for narrative flavor.
- **Shareable progress card:** render a small image of current progress to share.
- **Multiple journeys / reset-with-keep-settings:** the reset flow already preserves
  settings; add "start a new quest" that archives the old one.
- **Tests:** the distance/progress/waypoint math is pure and worth a small unit-test pass
  (it currently has no tests and the dash/length math in P0 #1 shows why).

---

## Suggested order of attack

| Step | Item | Why |
|------|------|-----|
| 1 | P0 #1, #2, #3, #4 | Make the map actually work — the core of the app |
| 2 | P0 #6 | Ship a small map image so the app loads fast |
| 3 | P1 #1, #2 | Make the daily loop fast and rewarding |
| 4 | P0 #5, P1 #6 | Delete dead code / reconcile docs with reality |
| 5 | P1 #3, #4, #5, #7 | History, de-dup, popover, a11y |
| 6 | P2 | Visual polish |
| 7 | P3 | Stretch goals |

Each P0 item is small and independently shippable; the map fixes (#1–#4) can land as one
cohesive change.
