const CONFIG = {
    totalDistanceMeters: 2494483.2,
    strideRange: { min: 0.5, max: 1.2, default: 0.76 },
    refreshIntervalMs: 60000,
    mapCandidates: [
        "assets/middle-earth-map.webp",
        "assets/middle-earth-map.png",
        "assets/middle-earth-map.jpg",
        "assets/middle-earth-map.jpeg"
    ],
    dataPaths: {
        poi: "data/poi.json",
        route: "data/path.json"
    }
};

const FALLBACK_WAYPOINTS = [
    { id: "Hobbiton", name: "Hobbiton", distance: 0, x: 335.0, y: 165.0, icon: "1", blurb: "Hobbiton is a Hobbit village in the central regions of the Shire, within the borders of the Westfarthing. It is the home of Bilbo and Frodo Baggins, and the starting point of the Fellowship's journey to destroy the One Ring in the fires of Mount Doom." },
    { id: "bree", name: "Bree", distance: 154.2, x: 385.0, y: 170.0, icon: "2", blurb: "Bree is a village of Men and hobbits, located east of the Shire and south of Fornost in Eriador. It is the only settlement in Eriador" },
    { id: "rivendell", name: "Rivendell", distance: 482.7, x: 490.0, y: 150.0, icon: "3", blurb: "Rivendell, or Imladris, is an Elven outpost established by Elrond in the Misty Mountains on the eastern edge of Eriador. It is a place of refuge and healing, and serves as the home of Elrond and his people. It is also the location where the Fellowship of the Ring is formed and where the Council of Elrond takes place." },
    { id: "khazad-dum", name: "Bridge of Khazad-dum", distance: 677.0, x: 470.0, y: 210.0, icon: "4", blurb: "Khazad-dum, commonly known as Moria, is the underground kingdom of the Dwarves of Durin's Folk, and the most famed of all Dwarven realms. The Bridge of Khazad-dum is a narrow stone bridge that spans a chasm within the mines of Moria. It is the site of a pivotal battle in the Fellowship's journey, where Gandalf confronts the Balrog and ultimately sacrifices himself to allow the rest of the Fellowship to escape." },
    { id: "lothlorien", name: "Lothlorien", distance: 863.4, x: 525.0, y: 235.0, icon: "5", blurb: "Lothlorien is the fairest and most enchanted Elven realm remaining in Middle-earth during the Third Age. Located east of the Misty Mountains along the Great River Anduin, it is ruled by the Lady Galadriel and Lord Celeborn. The Fellowship finds refuge in Lothlorien after their harrowing escape from Moria, and it is here that they receive gifts and counsel from the Elves before continuing their journey towards Mordor." },
    { id: "edoras", name: "Caras Galadhon", distance: 906.8, x: 535.0, y: 245.0, icon: "6", blurb: "Caras Galadhon is the city and fortress of the Galadhrim of Lothlorien, built by Celeborn and his wife Galadriel. It is located in the heart of Lothlorien, and serves as the residence of the Lady Galadriel and Lord Celeborn. The city is built among the trees, with platforms and walkways connecting the various structures. It is a place of great beauty and tranquility, and serves as a sanctuary for the Fellowship during their time in Lothlorien." },
    { id: "Argonath", name: "Argonath", distance: 1195.6, x: 575.0, y: 330.0, icon: "7", blurb: "The Argonath, also known as the Pillars of the Kings, or the Gate of Kings is a landmark on the northern edge of Gondor. It consists of two enormous statues carved in the likenesses of Isildur and Anarion, the sons of Elendil, who were the first High Kings of Gondor. The statues stand on either side of the River Anduin, marking the northern boundary of Gondor and serving as a warning to those who would enter the land without permission." },
    { id: "the-black-gate", name: "The Black Gate", distance: 1343.3, x: 615.0, y: 355.0, icon: "8", blurb: "The Black Gate, built by Sauron, is the main entrance into the land of Mordor. It is heavily fortified and guarded, serving as a formidable barrier to any who would attempt to enter or leave Mordor without Sauron's permission." },
    { id: "osgiliath", name: "Osgiliath", distance: 1411.9, x: 605.0, y: 375.0, icon: "9", blurb: "Osgiliath is the old capital city of Gondor. The city straddles the Anduin River at a point approximately half way between the cities of Minas Anor to the south-west and Minas Ithil to the north-east, and north of the nearby Emyn Arnen." },
    { id: "minas-morgul", name: "Minas Morgul", distance: 1460.4, x: 620.0, y: 370.0, icon: "10", blurb: "Minas Morgul was the twin city of Minas Tirith before its fall to the forces of Sauron in the Third Age. It was located in the Ephel Duath mountains, on the western border of Mordor, and was originally known as Minas Ithil, or the Tower of the Moon." },
    { id: "escape-from-the-orcs", name: "Escape from the Orcs", distance: 1515.7, x: 635.0, y: 360.0, icon: "11", blurb: "Frodo and Sam make a daring escape from the Orcs, continuing their journey towards Mount Doom. This is a pivotal moment in the story, as it marks the point where the two hobbits are on their own, without the support of the rest of the Fellowship, and must rely on their own courage and resourcefulness to continue their quest to destroy the One Ring." },
    { id: "mount-doom", name: "Mount Doom", distance: 1550.0, x: 645.0, y: 365.0, icon: "12", blurb: "The end of the quest, where the full distance of the Fellowship route is complete. Mount Doom, also known as Orodruin, is a volcanic mountain located in the land of Mordor. It is the place where the One Ring was forged by Sauron, and it is the only place where the Ring can be destroyed. The mountain is a symbol of evil and darkness, and serves as the final destination for Frodo and Sam on their quest to destroy the One Ring and save Middle-earth from Sauron's tyranny." }
];

const FALLBACK_ROUTE = [
    [335.0, 165.0], [360.0, 168.0], [385.0, 170.0], [420.0, 160.0], [455.0, 155.0], [490.0, 150.0],
    [480.0, 175.0], [470.0, 210.0], [495.0, 225.0], [525.0, 235.0], [535.0, 245.0], [550.0, 280.0],
    [565.0, 305.0], [575.0, 330.0], [590.0, 345.0], [615.0, 355.0], [605.0, 375.0], [620.0, 370.0],
    [635.0, 360.0], [645.0, 365.0]
];

const STORAGE_KEY = "fellowship-steps-web";
const ENABLE_POI_EDITING = false;
const POI_DISTANCES_IN_MILES = true;
const MAP_DIMENSIONS = {
    width: 1000,
    height: 545.5,
    maxZoom: 8,
    zoomStep: 1.18
};

const journey = {
    waypoints: [...FALLBACK_WAYPOINTS],
    route: [...FALLBACK_ROUTE]
};

const mapView = {
    x: 0,
    y: 0,
    width: MAP_DIMENSIONS.width,
    height: MAP_DIMENSIONS.height,
    isDragging: false,
    lastClientX: 0,
    lastClientY: 0,
    dragMoved: false
};

const defaultState = {
    steps: 0,
    strideMeters: CONFIG.strideRange.default,
    units: "km",
    theme: "dark",
    lastSyncAt: "",
    completedIds: [],
    onboardingSeen: false,
    activeMapAsset: "",
    poiOverrides: {},
    currentPoiOverrideId: "",
    journeyHistory: {}
};

const state = loadState();

const elements = {
    body: document.body,
    progressFill: document.getElementById("progressFill"),
    progressPercent: document.getElementById("progressPercent"),
    stepCount: document.getElementById("stepCount"),
    distancePrimary: document.getElementById("distancePrimary"),
    distanceRemaining: document.getElementById("distanceRemaining"),
    lastSync: document.getElementById("lastSync"),
    currentPoiName: document.getElementById("currentPoiName"),
    currentSegment: document.getElementById("currentSegment"),
    trackingStatus: document.getElementById("trackingStatus"),
    mapSvg: document.getElementById("mapSvg"),
    mapStage: document.querySelector(".map-stage"),
    waypointLayer: document.getElementById("waypointLayer"),
    travelerMarker: document.getElementById("travelerMarker"),
    travelerPulse: document.getElementById("travelerPulse"),
    mapImageSvg: document.getElementById("mapImageSvg"),
    routeShadow: document.getElementById("routeShadow"),
    routeBase: document.getElementById("routeBase"),
    routeProgress: document.getElementById("routeProgress"),
    mapAssetHint: document.getElementById("mapAssetHint"),
    mapPopover: document.getElementById("mapPopover"),
    popoverTitle: document.getElementById("popoverTitle"),
    popoverBody: document.getElementById("popoverBody"),
    poiList: document.getElementById("poiList"),
    modeNote: document.getElementById("modeNote"),
    stepDeltaInput: document.getElementById("stepDeltaInput"),
    addStepsBtn: document.getElementById("addStepsBtn"),
    subtractStepsBtn: document.getElementById("subtractStepsBtn"),
    resetJourneyBtn: document.getElementById("resetJourneyBtn"),
    saveProgressBtn: document.getElementById("saveProgressBtn"),
    loadProgressBtn: document.getElementById("loadProgressBtn"),
    progressImportInput: document.getElementById("progressImportInput"),
    openSettingsBtn: document.getElementById("openSettingsBtn"),
    openOnboardingBtn: document.getElementById("openOnboardingBtn"),
    zoomInBtn: document.getElementById("zoomInBtn"),
    zoomOutBtn: document.getElementById("zoomOutBtn"),
    zoomResetBtn: document.getElementById("zoomResetBtn"),
    zoomLevelLabel: document.getElementById("zoomLevelLabel"),
    poiEditorSelect: document.getElementById("poiEditorSelect"),
    poiEditorName: document.getElementById("poiEditorName"),
    poiEditorIcon: document.getElementById("poiEditorIcon"),
    poiEditorX: document.getElementById("poiEditorX"),
    poiEditorY: document.getElementById("poiEditorY"),
    poiEditorDistance: document.getElementById("poiEditorDistance"),
    poiAddNewBtn: document.getElementById("poiAddNewBtn"),
    poiSaveBtn: document.getElementById("poiSaveBtn"),
    poiSetCurrentBtn: document.getElementById("poiSetCurrentBtn"),
    poiClearCurrentBtn: document.getElementById("poiClearCurrentBtn"),
    poiDeleteBtn: document.getElementById("poiDeleteBtn"),
    poiExportBtn: document.getElementById("poiExportBtn"),
    poiEditorPanel: document.getElementById("poiEditorPanel"),
    exportDialog: document.getElementById("exportDialog"),
    exportOutput: document.getElementById("exportOutput"),
    exportCopyBtn: document.getElementById("exportCopyBtn"),
    onboardingDialog: document.getElementById("onboardingDialog"),
    settingsDialog: document.getElementById("settingsDialog"),
    strideInput: document.getElementById("strideInput"),
    strideOutput: document.getElementById("strideOutput"),
    unitSelect: document.getElementById("unitSelect"),
    themeSelect: document.getElementById("themeSelect"),
    themeToggleBtn: document.getElementById("themeToggleBtn"),
    themeColorMeta: document.getElementById("themeColorMeta"),
    toast: document.getElementById("toast"),
    streakCurrent: document.getElementById("streakCurrent"),
    streakBest: document.getElementById("streakBest"),
    totalStepsAll: document.getElementById("totalStepsAll"),
    activeDays: document.getElementById("activeDays"),
    streakChart: document.getElementById("streakChart")
};

function loadState() {
    try {
        const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || "null");
        const merged = { ...defaultState, ...saved };
        if (!merged.poiOverrides || typeof merged.poiOverrides !== "object") {
            merged.poiOverrides = {};
        }
        if (typeof merged.currentPoiOverrideId !== "string") {
            merged.currentPoiOverrideId = "";
        }
        return merged;
    } catch {
        return { ...defaultState };
    }
}

function persistState() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function applyPoiOverrides() {
    if (!ENABLE_POI_EDITING) {
        return;
    }

    if (!state.poiOverrides || typeof state.poiOverrides !== "object") {
        return;
    }

    journey.waypoints = journey.waypoints.map((point) => {
        const override = state.poiOverrides[point.id];
        if (!override) {
            return point;
        }

        return {
            ...point,
            name: override.name || point.name,
            icon: override.icon || point.icon,
            x: Number.isFinite(Number(override.x)) ? Number(override.x) : point.x,
            y: Number.isFinite(Number(override.y)) ? Number(override.y) : point.y,
            distance: Number.isFinite(Number(override.distance)) ? Number(override.distance) : point.distance
        };
    });
}

function normalizePoiDistance(value) {
    const numeric = Number(value);
    if (!Number.isFinite(numeric)) {
        return 0;
    }
    return POI_DISTANCES_IN_MILES ? numeric * 1609.344 : numeric;
}

function buildRouteFromWaypoints(waypoints) {
    if (!Array.isArray(waypoints) || waypoints.length < 2) {
        return [...FALLBACK_ROUTE];
    }

    const ordered = [...waypoints].sort((a, b) => Number(a.distance) - Number(b.distance));
    const route = [];

    for (let i = 0; i < ordered.length - 1; i += 1) {
        const start = ordered[i];
        const end = ordered[i + 1];
        const dx = Number(end.x) - Number(start.x);
        const dy = Number(end.y) - Number(start.y);
        const segmentLength = Math.hypot(dx, dy);
        const steps = Math.max(2, Math.ceil(segmentLength / 24));

        for (let step = 0; step <= steps; step += 1) {
            if (i > 0 && step === 0) {
                continue;
            }

            const t = step / steps;
            const x = Number((Number(start.x) + dx * t).toFixed(1));
            const y = Number((Number(start.y) + dy * t).toFixed(1));
            route.push([x, y]);
        }
    }

    return route;
}

async function loadJourneyData() {
    try {
        const poiResponse = await fetch(CONFIG.dataPaths.poi);

        if (!poiResponse.ok) {
            throw new Error("data load failed");
        }

        const poiData = await poiResponse.json();

        const validWaypoints = Array.isArray(poiData.waypoints) && poiData.waypoints.length >= 2;

        if (validWaypoints) {
            journey.waypoints = poiData.waypoints.map((point) => ({
                ...point,
                x: Number(point.x),
                y: Number(point.y),
                distance: normalizePoiDistance(point.distance)
            }));
        }

        try {
            const routeResponse = await fetch(CONFIG.dataPaths.route);
            if (!routeResponse.ok) {
                throw new Error("route data unavailable");
            }

            const routeData = await routeResponse.json();
            const validRoute = Array.isArray(routeData.route) && routeData.route.length >= 2;
            journey.route = validRoute
                ? routeData.route.map((pair) => [Number(pair[0]), Number(pair[1])])
                : buildRouteFromWaypoints(journey.waypoints);
        } catch {
            journey.route = buildRouteFromWaypoints(journey.waypoints);
        }

        const rawTotal = Number(poiData.totalDistanceMeters);
        if (Number.isFinite(rawTotal) && rawTotal > 0) {
            CONFIG.totalDistanceMeters = POI_DISTANCES_IN_MILES && rawTotal < 100000
                ? rawTotal * 1609.344
                : rawTotal;
        } else if (journey.waypoints.length) {
            CONFIG.totalDistanceMeters = Math.max(...journey.waypoints.map((point) => Number(point.distance) || 0));
        }
    } catch {
        journey.waypoints = FALLBACK_WAYPOINTS.map((point) => ({
            ...point,
            distance: normalizePoiDistance(point.distance)
        }));
        journey.route = [...FALLBACK_ROUTE];
    }
}

function totalDistance() {
    return Math.min(state.steps * state.strideMeters, CONFIG.totalDistanceMeters);
}

function progressPercent() {
    return (totalDistance() / CONFIG.totalDistanceMeters) * 100;
}

function currentWaypointIndex() {
    if (ENABLE_POI_EDITING && state.currentPoiOverrideId) {
        const forcedIndex = journey.waypoints.findIndex((point) => point.id === state.currentPoiOverrideId);
        if (forcedIndex >= 0) {
            return forcedIndex;
        }
    }

    const distance = totalDistance();
    let index = 0;

    for (let i = 0; i < journey.waypoints.length; i += 1) {
        if (distance >= journey.waypoints[i].distance) {
            index = i;
        }
    }

    return index;
}

function currentWaypoint() {
    return journey.waypoints[currentWaypointIndex()];
}

function nextWaypoint() {
    return journey.waypoints[Math.min(currentWaypointIndex() + 1, journey.waypoints.length - 1)];
}

function segmentSummary() {
    const current = currentWaypoint();
    const next = nextWaypoint();

    if (!current || !next) {
        return "Journey data unavailable.";
    }

    if (current.id === next.id) {
        if (ENABLE_POI_EDITING && state.currentPoiOverrideId) {
            return `${current.name} is manually set as the current POI.`;
        }
        return "The Ring is at the fire. Quest complete.";
    }

    const remaining = Math.max(0, next.distance - totalDistance());
    const summary = `${current.name} -> ${next.name} • ${formatDistance(remaining, state.units)} to the next point of interest.`;
    if (ENABLE_POI_EDITING && state.currentPoiOverrideId) {
        return `${summary} (Current POI manually overridden.)`;
    }
    return summary;
}

function completionIds() {
    return journey.waypoints.filter((point) => totalDistance() >= point.distance).map((point) => point.id);
}

function formatDistance(distanceMeters, unit = state.units) {
    if (unit === "mi") {
        return `${(distanceMeters / 1609.344).toFixed(1)} mi`;
    }

    if (unit === "m") {
        return `${Math.round(distanceMeters).toLocaleString()} m`;
    }

    return `${(distanceMeters / 1000).toFixed(1)} km`;
}

function formatTimestamp(value) {
    if (!value) {
        return "Never";
    }

    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
        return "Never";
    }

    return date.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
}

function setLastSync(reason) {
    state.lastSyncAt = new Date().toISOString();
    persistState();
    render(reason);
}

function todayKey(date = new Date()) {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, "0");
    const d = String(date.getDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
}

function recordJourneySteps(delta) {
    if (!delta || delta <= 0) {
        return;
    }
    if (!state.journeyHistory || typeof state.journeyHistory !== "object") {
        state.journeyHistory = {};
    }
    const key = todayKey();
    state.journeyHistory[key] = (Number(state.journeyHistory[key]) || 0) + delta;
}

function computeStreaks() {
    const history = state.journeyHistory || {};
    const activeDays = new Set(Object.keys(history).filter((key) => (Number(history[key]) || 0) > 0));

    let current = 0;
    const cursor = new Date();
    if (!activeDays.has(todayKey(cursor))) {
        cursor.setDate(cursor.getDate() - 1);
    }
    while (activeDays.has(todayKey(cursor))) {
        current += 1;
        cursor.setDate(cursor.getDate() - 1);
    }

    const sorted = [...activeDays].sort();
    let best = 0;
    let run = 0;
    let prev = null;
    for (const day of sorted) {
        if (prev) {
            const prevDate = new Date(`${prev}T00:00:00`);
            prevDate.setDate(prevDate.getDate() + 1);
            run = todayKey(prevDate) === day ? run + 1 : 1;
        } else {
            run = 1;
        }
        if (run > best) {
            best = run;
        }
        prev = day;
    }

    return { current, best, activeDays: activeDays.size };
}

function renderJourneyStats() {
    if (!elements.streakCurrent) {
        return;
    }
    const { current, best, activeDays } = computeStreaks();
    const history = state.journeyHistory || {};
    const totalSteps = Object.values(history).reduce((sum, value) => sum + (Number(value) || 0), 0);

    elements.streakCurrent.textContent = `${current} ${current === 1 ? "day" : "days"}`;
    elements.streakBest.textContent = `${best} ${best === 1 ? "day" : "days"}`;
    elements.totalStepsAll.textContent = totalSteps.toLocaleString();
    elements.activeDays.textContent = String(activeDays);

    const days = [];
    const cursor = new Date();
    for (let i = 13; i >= 0; i -= 1) {
        const day = new Date(cursor);
        day.setDate(cursor.getDate() - i);
        const key = todayKey(day);
        days.push({ key, label: day.toLocaleDateString([], { weekday: "narrow" }), steps: Number(history[key]) || 0 });
    }
    const max = Math.max(1, ...days.map((day) => day.steps));
    elements.streakChart.innerHTML = days.map((day) => {
        const height = day.steps > 0 ? Math.max(10, Math.round((day.steps / max) * 100)) : 0;
        const cls = day.steps > 0 ? "streak-bar is-active" : "streak-bar";
        return `<div class="streak-bar-slot" title="${day.key}: ${day.steps.toLocaleString()} steps"><div class="${cls}" style="height:${height}%"></div><span class="streak-bar-label">${day.label}</span></div>`;
    }).join("");
}

function showToast(message) {
    if (!elements.toast) {
        return;
    }

    elements.toast.textContent = message;
    elements.toast.hidden = false;
    clearTimeout(showToast.timeoutId);
    showToast.timeoutId = window.setTimeout(() => {
        elements.toast.hidden = true;
    }, 2600);
}

function showMapHint(message, autoHide = false) {
    elements.mapAssetHint.hidden = false;
    elements.mapAssetHint.textContent = message;
    clearTimeout(showMapHint.timeoutId);

    if (autoHide) {
        showMapHint.timeoutId = window.setTimeout(() => {
            elements.mapAssetHint.hidden = true;
        }, 2600);
    }
}

function probeImage(source) {
    return new Promise((resolve) => {
        const image = new Image();
        image.onload = () => resolve(source);
        image.onerror = () => resolve("");
        image.src = source;
    });
}

async function initMapAsset() {
    const sources = CONFIG.mapCandidates;

    for (const source of sources) {
        const match = await probeImage(source);
        if (match) {
            state.activeMapAsset = match;
            elements.mapImageSvg.setAttribute("href", match);
            elements.mapImageSvg.setAttribute("visibility", "visible");
            showMapHint(`Map asset loaded from ${match}.`, true);
            persistState();
            return;
        }
    }

    state.activeMapAsset = "";
    elements.mapImageSvg.removeAttribute("href");
    elements.mapImageSvg.setAttribute("visibility", "hidden");
    showMapHint("Drop a map into assets as middle-earth-map.webp, .png, .jpg, or .jpeg.");
    persistState();
}

function buildRoutePath(points) {
    if (!points.length) {
        return "";
    }

    const normalized = points.map((pair) => ({ x: Number(pair[0]), y: Number(pair[1]) }));
    const commands = [`M${normalized[0].x} ${normalized[0].y}`];

    for (let i = 1; i < normalized.length; i += 1) {
        commands.push(`L${normalized[i].x} ${normalized[i].y}`);
    }

    return commands.join(" ");
}

function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
}

function applyMapView() {
    elements.mapSvg.setAttribute(
        "viewBox",
        `${mapView.x.toFixed(2)} ${mapView.y.toFixed(2)} ${mapView.width.toFixed(2)} ${mapView.height.toFixed(2)}`
    );

    const zoom = MAP_DIMENSIONS.width / mapView.width;
    elements.zoomLevelLabel.textContent = `${Math.round(zoom * 100)}%`;
    elements.zoomOutBtn.disabled = zoom <= 1.01;
    elements.zoomInBtn.disabled = zoom >= MAP_DIMENSIONS.maxZoom - 0.01;
}

function zoomMap(factor, anchor) {
    const currentZoom = MAP_DIMENSIONS.width / mapView.width;
    const nextZoom = clamp(currentZoom * factor, 1, MAP_DIMENSIONS.maxZoom);
    const nextWidth = MAP_DIMENSIONS.width / nextZoom;
    const nextHeight = MAP_DIMENSIONS.height / nextZoom;
    const safeAnchor = anchor || {
        x: mapView.x + mapView.width / 2,
        y: mapView.y + mapView.height / 2
    };

    const ratioX = (safeAnchor.x - mapView.x) / mapView.width;
    const ratioY = (safeAnchor.y - mapView.y) / mapView.height;

    const nextX = safeAnchor.x - ratioX * nextWidth;
    const nextY = safeAnchor.y - ratioY * nextHeight;

    mapView.width = nextWidth;
    mapView.height = nextHeight;
    mapView.x = clamp(nextX, 0, MAP_DIMENSIONS.width - nextWidth);
    mapView.y = clamp(nextY, 0, MAP_DIMENSIONS.height - nextHeight);
    applyMapView();
}

function panMap(deltaX, deltaY) {
    const mapRect = elements.mapSvg.getBoundingClientRect();
    if (!mapRect.width || !mapRect.height) {
        return;
    }

    const unitsPerPixelX = mapView.width / mapRect.width;
    const unitsPerPixelY = mapView.height / mapRect.height;

    mapView.x = clamp(
        mapView.x - deltaX * unitsPerPixelX,
        0,
        MAP_DIMENSIONS.width - mapView.width
    );
    mapView.y = clamp(
        mapView.y - deltaY * unitsPerPixelY,
        0,
        MAP_DIMENSIONS.height - mapView.height
    );

    applyMapView();
}

function resetMapView() {
    mapView.x = 0;
    mapView.y = 0;
    mapView.width = MAP_DIMENSIONS.width;
    mapView.height = MAP_DIMENSIONS.height;
    applyMapView();
}

function routeTotalLength() {
    try {
        return elements.routeBase.getTotalLength();
    } catch {
        return 0;
    }
}

function routePointAt(fraction) {
    const length = routeTotalLength();
    if (!length) {
        return { x: 0, y: 0 };
    }

    const point = elements.routeBase.getPointAtLength(clamp(fraction, 0, 1) * length);
    return { x: point.x, y: point.y };
}

function waypointFraction(point) {
    const total = CONFIG.totalDistanceMeters;
    if (!total) {
        return 0;
    }

    return clamp(Number(point.distance) / total, 0, 1);
}

function renderWaypointLayer() {
    const active = currentWaypoint();
    const activeId = active ? active.id : "";
    const completed = new Set(completionIds());

    elements.waypointLayer.innerHTML = journey.waypoints.map((point) => {
        const pos = routePointAt(waypointFraction(point));
        const pinClasses = ["waypoint-pin"];

        if (completed.has(point.id)) {
            pinClasses.push("is-complete");
        }

        if (activeId === point.id) {
            pinClasses.push("is-active");
        }

        return `
            <g class="waypoint" data-waypoint-id="${point.id}" transform="translate(${pos.x.toFixed(1)}, ${pos.y.toFixed(1)})" tabindex="0" role="button" aria-label="${point.name}, ${formatDistance(point.distance, state.units)}">
                <rect class="waypoint-diamond" x="-8" y="-30" width="16" height="16" rx="2" transform="rotate(45)"></rect>
                <circle class="${pinClasses.join(" ")}" r="11"></circle>
                <text class="waypoint-label" y="34">${point.name}</text>
                <text class="waypoint-label" y="5">${point.icon}</text>
            </g>
        `;
    }).join("");

    Array.from(elements.waypointLayer.querySelectorAll(".waypoint")).forEach((node) => {
        node.addEventListener("click", () => openWaypointPopover(node.dataset.waypointId));
        node.addEventListener("keydown", (event) => {
            if (event.key === "Enter" || event.key === " ") {
                event.preventDefault();
                openWaypointPopover(node.dataset.waypointId);
            }
        });
    });
}

function openWaypointPopover(waypointId) {
    const point = journey.waypoints.find((entry) => entry.id === waypointId);
    if (!point) {
        return;
    }

    elements.popoverTitle.textContent = point.name;
    elements.popoverBody.textContent = `${point.blurb} Target distance: ${formatDistance(point.distance, state.units)}.`;
    elements.mapPopover.hidden = false;

    const node = elements.waypointLayer.querySelector(`[data-waypoint-id="${waypointId}"]`);
    const mapBox = elements.mapStage.getBoundingClientRect();

    let x = (point.x / MAP_DIMENSIONS.width) * mapBox.width;
    let y = (point.y / MAP_DIMENSIONS.height) * mapBox.height;

    if (node) {
        const nodeBox = node.getBoundingClientRect();
        x = nodeBox.left + nodeBox.width / 2 - mapBox.left;
        y = nodeBox.top + nodeBox.height / 2 - mapBox.top;
    }

    // Measure the popover so it can be clamped fully inside the map stage.
    const popBox = elements.mapPopover.getBoundingClientRect();
    const popW = popBox.width;
    const popH = popBox.height;
    const margin = 12;

    // Prefer to the right of the pin; flip to the left if it would overflow.
    let left = x + 16;
    if (left + popW > mapBox.width - margin) {
        left = x - 16 - popW;
    }
    left = Math.min(Math.max(margin, left), Math.max(margin, mapBox.width - popW - margin));

    // Prefer above the pin; flip below if it would overflow the top edge.
    let top = y - popH - 16;
    if (top < margin) {
        top = y + 16;
    }
    top = Math.min(Math.max(margin, top), Math.max(margin, mapBox.height - popH - margin));

    elements.mapPopover.style.left = `${left}px`;
    elements.mapPopover.style.top = `${top}px`;
}

function closeWaypointPopover() {
    elements.mapPopover.hidden = true;
}

function currentPositionOnPath() {
    if (ENABLE_POI_EDITING && state.currentPoiOverrideId) {
        const forced = currentWaypoint();
        if (forced) {
            return routePointAt(waypointFraction(forced));
        }
    }

    const total = CONFIG.totalDistanceMeters;
    if (!total) {
        return { x: 0, y: 0 };
    }

    return routePointAt(totalDistance() / total);
}

function renderMap() {
    const routeD = buildRoutePath(journey.route);
    elements.routeShadow.setAttribute("d", routeD);
    elements.routeBase.setAttribute("d", routeD);
    elements.routeProgress.setAttribute("d", routeD);

    renderWaypointLayer();

    const position = currentPositionOnPath();
    elements.travelerMarker.setAttribute("cx", position.x.toFixed(2));
    elements.travelerMarker.setAttribute("cy", position.y.toFixed(2));
    elements.travelerPulse.setAttribute("cx", position.x.toFixed(2));
    elements.travelerPulse.setAttribute("cy", position.y.toFixed(2));
}

function renderPoiList() {
    if (!elements.poiList) {
        return;
    }

    const completed = new Set(completionIds());
    const active = currentWaypoint();
    const activeId = active ? active.id : "";
    const distance = totalDistance();
    const next = nextWaypoint();

    let progressLabel;
    let progressPct = 100;
    if (active && next && active.id !== next.id) {
        const span = Math.max(1, next.distance - active.distance);
        progressPct = Math.min(100, Math.max(0, ((distance - active.distance) / span) * 100));
        progressLabel = `Next up: ${next.name} • ${formatDistance(Math.max(0, next.distance - distance), state.units)} to go`;
    } else {
        progressLabel = "The Ring is at the fire. Quest complete.";
    }

    const items = journey.waypoints.map((point) => {
        const status = activeId === point.id ? "current" : (completed.has(point.id) ? "reached" : "upcoming");
        return `
            <li class="quest-item is-${status}" data-poi-id="${point.id}" tabindex="0" role="button" aria-label="${point.name}, ${status}, ${formatDistance(point.distance, state.units)}">
                <span class="quest-status" aria-hidden="true"></span>
                <span class="quest-name">${point.name}</span>
                <span class="quest-distance">${formatDistance(point.distance, state.units)}</span>
            </li>
        `;
    }).join("");

    elements.poiList.innerHTML = `
        <div class="quest-progress">
            <p class="quest-progress-label">${progressLabel}</p>
            <div class="quest-progress-track" role="progressbar" aria-label="Progress to next waypoint" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${Math.round(progressPct)}">
                <div class="quest-progress-bar" style="width:${progressPct.toFixed(1)}%"></div>
            </div>
        </div>
        <ul class="quest-items">${items}</ul>
    `;

    Array.from(elements.poiList.querySelectorAll(".quest-item")).forEach((node) => {
        node.addEventListener("click", () => openWaypointPopover(node.dataset.poiId));
        node.addEventListener("keydown", (event) => {
            if (event.key === "Enter" || event.key === " ") {
                event.preventDefault();
                openWaypointPopover(node.dataset.poiId);
            }
        });
    });
}

function populatePoiEditor() {
    if (!ENABLE_POI_EDITING) {
        return;
    }

    if (!elements.poiEditorSelect) {
        return;
    }

    const currentId = elements.poiEditorSelect.value;
    elements.poiEditorSelect.innerHTML = journey.waypoints.map((point) => {
        const isCurrent = point.id === state.currentPoiOverrideId;
        return `<option value="${point.id}">${point.name}${isCurrent ? " (current override)" : ""}</option>`;
    }).join("");

    const selectedId = journey.waypoints.some((point) => point.id === currentId)
        ? currentId
        : (journey.waypoints[0] ? journey.waypoints[0].id : "");

    elements.poiEditorSelect.value = selectedId;
    syncPoiEditorInputs();
}

function selectedPoi() {
    const id = elements.poiEditorSelect.value;
    return journey.waypoints.find((point) => point.id === id) || null;
}

function syncPoiEditorInputs() {
    const point = selectedPoi();
    if (!point) {
        return;
    }

    elements.poiEditorName.value = String(point.name);
    elements.poiEditorIcon.value = String(point.icon);
    elements.poiEditorX.value = String(point.x);
    elements.poiEditorY.value = String(point.y);
    elements.poiEditorDistance.value = String(point.distance);
}

function saveSelectedPoiEdits() {
    const point = selectedPoi();
    if (!point) {
        return;
    }

    const nextName = String(elements.poiEditorName.value).trim() || "New POI";
    const nextIcon = String(elements.poiEditorIcon.value).trim() || "?";
    const nextX = Number(elements.poiEditorX.value);
    const nextY = Number(elements.poiEditorY.value);
    const nextDistance = Number(elements.poiEditorDistance.value);

    if (!Number.isFinite(nextX) || !Number.isFinite(nextY) || !Number.isFinite(nextDistance)) {
        showToast("POI values must be valid numbers.");
        return;
    }

    point.name = nextName;
    point.icon = nextIcon.charAt(0);
    point.x = Number(nextX.toFixed(1));
    point.y = Number(nextY.toFixed(1));
    point.distance = Math.max(0, Math.round(nextDistance));

    state.poiOverrides[point.id] = {
        x: point.x,
        y: point.y,
        distance: point.distance,
        name: point.name,
        icon: point.icon
    };

    render("POI updated");
    showToast(`${point.name} updated.`);
}

function setCurrentPoiOverride() {
    const point = selectedPoi();
    if (!point) {
        return;
    }

    state.currentPoiOverrideId = point.id;
    render("Current POI overridden");
    showToast(`Current POI set to ${point.name}.`);
}

function clearCurrentPoiOverride() {
    state.currentPoiOverrideId = "";
    render("Current POI override cleared");
    showToast("Current POI override cleared.");
}

function addNewPoi() {
    const customCounter = journey.waypoints.filter((p) => p.id.startsWith("custom-poi-")).length + 1;
    const newId = `custom-poi-${customCounter}`;
    const newPoi = {
        id: newId,
        name: "New POI",
        distance: 2000000,
        x: 500,
        y: 200,
        icon: "+",
        blurb: "Describe this waypoint."
    };

    journey.waypoints.push(newPoi);
    state.poiOverrides[newId] = {
        x: newPoi.x,
        y: newPoi.y,
        distance: newPoi.distance,
        name: newPoi.name,
        icon: newPoi.icon
    };

    render("New POI added");
    elements.poiEditorSelect.value = newId;
    syncPoiEditorInputs();
    showToast(`New POI created: ${newId}`);
}

function deleteSelectedPoi() {
    const point = selectedPoi();
    if (!point) {
        return;
    }

    if (!confirm(`Delete POI "${point.name}" permanently?`)) {
        return;
    }

    journey.waypoints = journey.waypoints.filter((p) => p.id !== point.id);
    delete state.poiOverrides[point.id];

    if (state.currentPoiOverrideId === point.id) {
        state.currentPoiOverrideId = "";
    }

    render("POI deleted");
    showToast(`${point.name} deleted.`);
}

function buildExportJson() {
    const data = {
        totalDistanceMeters: CONFIG.totalDistanceMeters,
        waypoints: journey.waypoints.map((point) => ({
            id: point.id,
            name: point.name,
            distance: point.distance,
            x: point.x,
            y: point.y,
            icon: point.icon,
            blurb: point.blurb
        }))
    };
    return JSON.stringify(data, null, 2);
}

function openExportDialog() {
    elements.exportOutput.textContent = buildExportJson();
    elements.exportDialog.showModal();
}

function copyExportOutput() {
    const text = elements.exportOutput.textContent || "";
    navigator.clipboard.writeText(text)
        .then(() => showToast("POI JSON copied to clipboard."))
        .catch(() => showToast("Copy failed. Select text manually."));
}

function mapEventToSvgPoint(event) {
    const svgPoint = elements.mapSvg.createSVGPoint();
    svgPoint.x = event.clientX;
    svgPoint.y = event.clientY;
    const transformed = svgPoint.matrixTransform(elements.mapSvg.getScreenCTM().inverse());

    return {
        x: Number(transformed.x.toFixed(1)),
        y: Number(transformed.y.toFixed(1))
    };
}

function onMapWheel(event) {
    event.preventDefault();
    const anchor = mapEventToSvgPoint(event);
    const factor = event.deltaY < 0 ? MAP_DIMENSIONS.zoomStep : 1 / MAP_DIMENSIONS.zoomStep;
    zoomMap(factor, anchor);
}

function onMapPointerDown(event) {
    if (event.button !== 0 && event.button !== 1) {
        return;
    }

    mapView.isDragging = true;
    mapView.dragMoved = false;
    mapView.lastClientX = event.clientX;
    mapView.lastClientY = event.clientY;
    elements.mapStage.classList.add("is-panning");
    event.preventDefault();
    event.stopPropagation();
}

function onMapPointerMove(event) {
    if (!mapView.isDragging) {
        return;
    }

    const deltaX = event.clientX - mapView.lastClientX;
    const deltaY = event.clientY - mapView.lastClientY;

    if (Math.abs(deltaX) > 1 || Math.abs(deltaY) > 1) {
        mapView.dragMoved = true;
    }

    mapView.lastClientX = event.clientX;
    mapView.lastClientY = event.clientY;
    panMap(deltaX, deltaY);
    event.preventDefault();
}

function onMapPointerUp() {
    if (!mapView.isDragging) {
        return;
    }

    mapView.isDragging = false;
    mapView.dragMoved = false;
    elements.mapStage.classList.remove("is-panning");
}

function render(reason = "") {
    const percent = progressPercent();
    const distance = totalDistance();
    const remaining = Math.max(0, CONFIG.totalDistanceMeters - distance);
    const waypoint = currentWaypoint();

    state.completedIds = completionIds();
    elements.body.dataset.theme = state.theme;
    syncThemeChrome();
    document.documentElement.style.setProperty("--route-progress", percent.toFixed(2));
    elements.progressFill.style.width = `${percent.toFixed(2)}%`;
    elements.progressPercent.textContent = `${percent.toFixed(1)}%`;
    elements.stepCount.textContent = state.steps.toLocaleString();
    elements.distancePrimary.textContent = formatDistance(distance, state.units);
    elements.distanceRemaining.textContent = formatDistance(remaining, state.units);
    elements.lastSync.textContent = formatTimestamp(state.lastSyncAt);
    elements.currentPoiName.textContent = waypoint ? waypoint.name : "Unknown";
    elements.currentSegment.textContent = segmentSummary();
    elements.strideInput.value = state.strideMeters.toFixed(2);
    elements.strideOutput.textContent = `${state.strideMeters.toFixed(2)} m`;
    elements.unitSelect.value = state.units;
    elements.themeSelect.value = state.theme;
    elements.trackingStatus.textContent = reason || "Manual tracker ready";
    elements.modeNote.textContent = "Manual tracker with data-driven waypoint map.";

    renderMap();
    renderPoiList();
    renderJourneyStats();
    if (ENABLE_POI_EDITING) {
        populatePoiEditor();
    }
    persistState();
}

function celebrateWaypoint(point) {
    if (!point) {
        return;
    }

    const position = currentPositionOnPath();
    const layer = document.getElementById("travelerLayer");
    if (!layer) {
        return;
    }

    const ring = document.createElementNS("http://www.w3.org/2000/svg", "circle");
    ring.setAttribute("class", "waypoint-burst");
    ring.setAttribute("cx", position.x.toFixed(2));
    ring.setAttribute("cy", position.y.toFixed(2));
    ring.setAttribute("r", "12");
    layer.appendChild(ring);
    window.setTimeout(() => ring.remove(), 900);

    const isFinal = point.id === "mount-doom";
    showToast(isFinal ? "Mount Doom reached — the quest is complete!" : `Waypoint reached: ${point.name}`);
}

function updateSteps(delta) {
    const before = new Set(completionIds());
    state.steps = Math.max(0, state.steps + delta);
    if (delta > 0) {
        recordJourneySteps(delta);
    }
    const after = completionIds();
    setLastSync(delta >= 0 ? "Journey updated" : "Progress adjusted");

    if (delta > 0) {
        const newlyPassed = journey.waypoints.filter((point) => after.includes(point.id) && !before.has(point.id));
        if (newlyPassed.length) {
            celebrateWaypoint(newlyPassed[newlyPassed.length - 1]);
        }
    }
}

function resetJourney() {
    if (!window.confirm("Reset all local journey progress?")) {
        return;
    }

    Object.assign(state, {
        ...defaultState,
        strideMeters: state.strideMeters,
        units: state.units,
        theme: state.theme,
        onboardingSeen: true,
        activeMapAsset: state.activeMapAsset
    });
    render("Journey reset");
    showToast("Journey progress cleared.");
}

function applyStride(value) {
    const next = Math.max(CONFIG.strideRange.min, Math.min(CONFIG.strideRange.max, Number(value)));
    state.strideMeters = Number.isFinite(next) ? next : CONFIG.strideRange.default;
    setLastSync("Stride updated");
}

function applyUnits(value) {
    state.units = ["km", "mi", "m"].includes(value) ? value : "km";
    render("Display updated");
}

function applyTheme(value) {
    state.theme = value === "parchment" ? "parchment" : "dark";
    render("Theme updated");
}

function syncThemeChrome() {
    const isParchment = state.theme === "parchment";
    if (elements.themeColorMeta) {
        elements.themeColorMeta.setAttribute("content", isParchment ? "#efe0bb" : "#15120e");
    }
    if (elements.themeToggleBtn) {
        elements.themeToggleBtn.setAttribute("aria-pressed", String(isParchment));
        elements.themeToggleBtn.title = isParchment ? "Switch to dark theme" : "Switch to parchment theme";
        const icon = elements.themeToggleBtn.querySelector(".theme-toggle-icon");
        const text = elements.themeToggleBtn.querySelector(".theme-toggle-text");
        if (icon) {
            icon.textContent = isParchment ? "☾" : "☀";
        }
        if (text) {
            text.textContent = isParchment ? "Dark" : "Parchment";
        }
    }
}

function refreshProgress() {
    setLastSync("Progress refreshed");
    showToast("Progress refreshed.");
}

function buildProgressSnapshot() {
    return {
        version: 1,
        savedAt: new Date().toISOString(),
        state: {
            steps: state.steps,
            strideMeters: state.strideMeters,
            units: state.units,
            theme: state.theme,
            lastSyncAt: state.lastSyncAt,
            onboardingSeen: state.onboardingSeen,
            activeMapAsset: state.activeMapAsset
        }
    };
}

function saveProgressToFile() {
    const payload = JSON.stringify(buildProgressSnapshot(), null, 2);
    const blob = new Blob([payload], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `fellowship-progress-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    URL.revokeObjectURL(url);
    showToast("Progress file saved.");
}

function triggerProgressImport() {
    if (!elements.progressImportInput) {
        return;
    }

    elements.progressImportInput.value = "";
    elements.progressImportInput.click();
}

function importProgressFromFile(event) {
    const file = event.target.files && event.target.files[0];
    if (!file) {
        return;
    }

    const reader = new FileReader();
    reader.onload = () => {
        try {
            const parsed = JSON.parse(String(reader.result || ""));
            const next = parsed && parsed.state ? parsed.state : parsed;

            if (typeof next !== "object" || next === null) {
                throw new Error("invalid payload");
            }

            if (Number.isFinite(Number(next.steps))) {
                state.steps = Math.max(0, Math.round(Number(next.steps)));
            }

            if (Number.isFinite(Number(next.strideMeters))) {
                state.strideMeters = Math.max(CONFIG.strideRange.min, Math.min(CONFIG.strideRange.max, Number(next.strideMeters)));
            }

            if (["km", "mi", "m"].includes(next.units)) {
                state.units = next.units;
            }

            state.theme = next.theme === "parchment" ? "parchment" : "dark";
            state.lastSyncAt = next.lastSyncAt || new Date().toISOString();
            state.onboardingSeen = true;
            render("Progress loaded");
            showToast("Progress loaded from file.");
        } catch {
            showToast("Invalid progress file.");
        }
    };
    reader.readAsText(file);
}

function openOnboarding() {
    elements.onboardingDialog.showModal();
}

function openSettings() {
    elements.settingsDialog.showModal();
}

function bindEvents() {
    elements.addStepsBtn.addEventListener("click", () => {
        const delta = Math.max(1, Number(elements.stepDeltaInput.value) || 500);
        updateSteps(delta);
    });

    elements.subtractStepsBtn.addEventListener("click", () => {
        const delta = Math.max(1, Number(elements.stepDeltaInput.value) || 500);
        updateSteps(-delta);
    });

    document.querySelectorAll(".quick-add-btn").forEach((btn) => {
        btn.addEventListener("click", () => {
            const delta = Math.max(1, Number(btn.dataset.steps) || 500);
            updateSteps(delta);
        });
    });

    elements.resetJourneyBtn.addEventListener("click", resetJourney);
    elements.saveProgressBtn.addEventListener("click", saveProgressToFile);
    elements.loadProgressBtn.addEventListener("click", triggerProgressImport);
    elements.progressImportInput.addEventListener("change", importProgressFromFile);
    elements.openSettingsBtn.addEventListener("click", openSettings);
    elements.openOnboardingBtn.addEventListener("click", openOnboarding);
    elements.zoomInBtn.addEventListener("click", () => zoomMap(MAP_DIMENSIONS.zoomStep));
    elements.zoomOutBtn.addEventListener("click", () => zoomMap(1 / MAP_DIMENSIONS.zoomStep));
    elements.zoomResetBtn.addEventListener("click", resetMapView);
    elements.strideInput.addEventListener("input", (event) => applyStride(event.target.value));
    elements.unitSelect.addEventListener("change", (event) => applyUnits(event.target.value));
    elements.themeSelect.addEventListener("change", (event) => applyTheme(event.target.value));
    if (elements.themeToggleBtn) {
        elements.themeToggleBtn.addEventListener("click", () => {
            applyTheme(state.theme === "parchment" ? "dark" : "parchment");
        });
    }
    if (ENABLE_POI_EDITING) {
        elements.poiEditorSelect.addEventListener("change", syncPoiEditorInputs);
        elements.poiAddNewBtn.addEventListener("click", addNewPoi);
        elements.poiSaveBtn.addEventListener("click", saveSelectedPoiEdits);
        elements.poiSetCurrentBtn.addEventListener("click", setCurrentPoiOverride);
        elements.poiClearCurrentBtn.addEventListener("click", clearCurrentPoiOverride);
        elements.poiDeleteBtn.addEventListener("click", deleteSelectedPoi);
        elements.poiExportBtn.addEventListener("click", openExportDialog);
        elements.exportCopyBtn.addEventListener("click", copyExportOutput);
    }
    elements.mapStage.addEventListener("wheel", onMapWheel, { passive: false });
    elements.mapSvg.addEventListener("mousedown", onMapPointerDown);
    window.addEventListener("mousemove", onMapPointerMove);
    window.addEventListener("mouseup", onMapPointerUp);

    document.addEventListener("click", (event) => {
        if (!event.target.closest(".waypoint") && !event.target.closest(".quest-item") && !event.target.closest(".map-popover")) {
            closeWaypointPopover();
        }
    });

    document.addEventListener("keydown", (event) => {
        if (event.key === "Escape") {
            closeWaypointPopover();
        }
    });

    elements.onboardingDialog.addEventListener("close", () => {
        state.onboardingSeen = true;
        persistState();
    });
}

function initTimers() {
    window.setInterval(() => {
        setLastSync("Minute refresh");
    }, CONFIG.refreshIntervalMs);
}

async function init() {
    await loadJourneyData();

    if (!ENABLE_POI_EDITING) {
        state.poiOverrides = {};
        state.currentPoiOverrideId = "";
        if (elements.poiEditorPanel) {
            elements.poiEditorPanel.hidden = true;
        }
    }

    applyPoiOverrides();
    bindEvents();
    applyMapView();
    render("Manual tracker ready");
    await initMapAsset();

    if (!state.onboardingSeen) {
        openOnboarding();
    }

    initTimers();
}

document.addEventListener("DOMContentLoaded", init);