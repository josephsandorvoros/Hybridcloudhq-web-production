const CONFIG = {
    totalDistanceMeters: 4023000,
    strideRange: { min: 0.5, max: 1.2, default: 0.76 },
    refreshIntervalMs: 60000,
    mapCandidates: [
        "assets/middle-earth-map.jpeg",
        "assets/middle-earth-map.webp",
        "assets/middle-earth-map.png",
        "assets/middle-earth-map.jpg"
    ],
    dataPaths: {
        poi: "data/poi.json",
        route: "data/path.json"
    }
};

const FALLBACK_WAYPOINTS = [
    { id: "rivendell", name: "Rivendell", distance: 0, x: 68, y: 274.1, icon: "R", blurb: "The Elven refuge where the Fellowship gathers and the quest begins." },
    { id: "khazad-dum", name: "Bridge of Khazad-dum", distance: 760000, x: 292, y: 186, icon: "K", blurb: "A perilous crossing beneath the mountains, represented here as the first major trial." },
    { id: "lothlorien", name: "Lothlorien", distance: 1180000, x: 434, y: 218, icon: "L", blurb: "A place of rest and renewal where the company regroups beneath the golden trees." },
    { id: "edoras", name: "Edoras", distance: 2225000, x: 605.9, y: 204.1, icon: "E", blurb: "The hill city of Rohan, marking the long middle stretch of the journey." },
    { id: "minas-tirith", name: "Minas Tirith", distance: 3115000, x: 779.8, y: 176.5, icon: "M", blurb: "The White City stands as the last great bastion before the land of shadow." },
    { id: "mount-doom", name: "Mount Doom", distance: 4023000, x: 930, y: 214.1, icon: "D", blurb: "The end of the quest, where the full distance of the Fellowship route is complete." }
];

const FALLBACK_ROUTE = [
    [68, 274.1], [96, 264], [126, 254], [158, 242], [192, 229], [228, 214], [262, 198], [292, 186],
    [326, 194], [362, 203], [398, 212], [434, 218], [470, 216], [508, 212], [548, 208], [586, 205],
    [605.9, 204.1], [642, 201], [678, 196], [715, 190], [748, 183], [779.8, 176.5], [812, 181],
    [848, 192], [886, 205], [930, 214.1]
];

const STORAGE_KEY = "fellowship-steps-web";
const ENABLE_POI_EDITING = false;
const POI_DISTANCES_IN_MILES = true;
const MAP_DIMENSIONS = {
    width: 1000,
    height: 420,
    maxZoom: 8,
    zoomStep: 1.18
};

const journey = {
    waypoints: [...FALLBACK_WAYPOINTS],
    route: [...FALLBACK_ROUTE]
};

const calibration = {
    enabled: false,
    points: [],
    lastPoint: null
};

const mapView = {
    x: 0,
    y: 0,
    width: MAP_DIMENSIONS.width,
    height: MAP_DIMENSIONS.height,
    isDragging: false,
    lastClientX: 0,
    lastClientY: 0,
    dragMoved: false,
    suppressClick: false
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
    currentPoiOverrideId: ""
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
    achievementsGrid: document.getElementById("achievementsGrid"),
    poiList: document.getElementById("poiList"),
    modeNote: document.getElementById("modeNote"),
    stepDeltaInput: document.getElementById("stepDeltaInput"),
    addStepsBtn: document.getElementById("addStepsBtn"),
    subtractStepsBtn: document.getElementById("subtractStepsBtn"),
    minuteRefreshBtn: document.getElementById("minuteRefreshBtn"),
    resetJourneyBtn: document.getElementById("resetJourneyBtn"),
    saveProgressBtn: document.getElementById("saveProgressBtn"),
    loadProgressBtn: document.getElementById("loadProgressBtn"),
    progressImportInput: document.getElementById("progressImportInput"),
    openSettingsBtn: document.getElementById("openSettingsBtn"),
    openOnboardingBtn: document.getElementById("openOnboardingBtn"),
    focusCurrentPoiBtn: document.getElementById("focusCurrentPoiBtn"),
    calibrationToggleBtn: document.getElementById("calibrationToggleBtn"),
    zoomInBtn: document.getElementById("zoomInBtn"),
    zoomOutBtn: document.getElementById("zoomOutBtn"),
    zoomResetBtn: document.getElementById("zoomResetBtn"),
    zoomLevelLabel: document.getElementById("zoomLevelLabel"),
    calibrationPanel: document.getElementById("calibrationPanel"),
    calibrationOutput: document.getElementById("calibrationOutput"),
    calibrationCopyBtn: document.getElementById("calibrationCopyBtn"),
    calibrationUndoBtn: document.getElementById("calibrationUndoBtn"),
    calibrationClearBtn: document.getElementById("calibrationClearBtn"),
    poiEditorSelect: document.getElementById("poiEditorSelect"),
    poiEditorName: document.getElementById("poiEditorName"),
    poiEditorIcon: document.getElementById("poiEditorIcon"),
    poiEditorX: document.getElementById("poiEditorX"),
    poiEditorY: document.getElementById("poiEditorY"),
    poiEditorDistance: document.getElementById("poiEditorDistance"),
    poiAddNewBtn: document.getElementById("poiAddNewBtn"),
    poiUseLastPointBtn: document.getElementById("poiUseLastPointBtn"),
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
    toast: document.getElementById("toast")
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
        journey.waypoints = [...FALLBACK_WAYPOINTS];
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

function renderWaypointLayer() {
    const active = currentWaypoint();
    const activeId = active ? active.id : "";
    const completed = new Set(completionIds());

    elements.waypointLayer.innerHTML = journey.waypoints.map((point) => {
        const pinClasses = ["waypoint-pin"];

        if (completed.has(point.id)) {
            pinClasses.push("is-complete");
        }

        if (activeId === point.id) {
            pinClasses.push("is-active");
        }

        return `
            <g class="waypoint" data-waypoint-id="${point.id}" transform="translate(${point.x}, ${point.y})">
                <rect class="waypoint-diamond" x="-8" y="-30" width="16" height="16" rx="2" transform="rotate(45)"></rect>
                <circle class="${pinClasses.join(" ")}" r="11"></circle>
                <text class="waypoint-label" y="34">${point.name}</text>
                <text class="waypoint-label" y="5">${point.icon}</text>
            </g>
        `;
    }).join("");

    Array.from(elements.waypointLayer.querySelectorAll(".waypoint")).forEach((node) => {
        node.addEventListener("click", () => openWaypointPopover(node.dataset.waypointId));
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

    elements.mapPopover.style.left = `${Math.max(16, x - 90)}px`;
    elements.mapPopover.style.top = `${Math.max(16, y - 110)}px`;
}

function closeWaypointPopover() {
    elements.mapPopover.hidden = true;
}

function currentPositionOnPath() {
    if (ENABLE_POI_EDITING && state.currentPoiOverrideId) {
        const forced = currentWaypoint();
        if (forced) {
            return { x: forced.x, y: forced.y };
        }
    }

    const activeIndex = currentWaypointIndex();
    const start = journey.waypoints[activeIndex];
    const end = journey.waypoints[Math.min(activeIndex + 1, journey.waypoints.length - 1)];

    if (!start || !end) {
        return { x: 0, y: 0 };
    }

    if (start.id === end.id) {
        return { x: start.x, y: start.y };
    }

    const segmentDistance = end.distance - start.distance;
    const withinSegment = totalDistance() - start.distance;
    const ratio = segmentDistance === 0 ? 0 : withinSegment / segmentDistance;

    return {
        x: start.x + (end.x - start.x) * ratio,
        y: start.y + (end.y - start.y) * ratio
    };
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

function renderAchievements() {
    if (!elements.achievementsGrid) {
        return;
    }

    const completed = new Set(completionIds());
    const active = currentWaypoint();
    const activeId = active ? active.id : "";

    elements.achievementsGrid.innerHTML = journey.waypoints.map((point) => {
        const classes = ["achievement-card"];
        if (completed.has(point.id)) {
            classes.push("is-unlocked");
        }
        if (activeId === point.id) {
            classes.push("is-current");
        }

        return `
            <article class="${classes.join(" ")}">
                <div class="achievement-top">
                    <div>
                        <h3>${point.name}</h3>
                        <p>${point.blurb}</p>
                    </div>
                    <div class="achievement-icon">${point.icon}</div>
                </div>
                <p class="distance-chip">${formatDistance(point.distance, state.units)}</p>
            </article>
        `;
    }).join("");
}

function renderPoiList() {
    if (!elements.poiList) {
        return;
    }

    const completed = new Set(completionIds());
    const active = currentWaypoint();
    const activeId = active ? active.id : "";

    elements.poiList.innerHTML = journey.waypoints.map((point) => {
        const classes = ["poi-item"];
        if (activeId === point.id) {
            classes.push("is-active");
        }

        return `
            <article class="${classes.join(" ")}" data-poi-id="${point.id}">
                <div class="poi-top">
                    <div>
                        <h3>${point.name}</h3>
                        <p>${point.blurb}</p>
                    </div>
                    <div class="poi-icon">${completed.has(point.id) ? "*" : point.icon}</div>
                </div>
                <p class="distance-chip">${formatDistance(point.distance, state.units)}</p>
            </article>
        `;
    }).join("");

    Array.from(elements.poiList.querySelectorAll(".poi-item")).forEach((node) => {
        node.addEventListener("click", () => openWaypointPopover(node.dataset.poiId));
    });
}

function formatCalibrationOutput() {
    if (!calibration.points.length) {
        return "No points captured yet.";
    }

    const routeLines = calibration.points.map((point) => `  [${point.x}, ${point.y}],`).join("\n");
    const last = calibration.points[calibration.points.length - 1];

    return [
        `Last point: x=${last.x}, y=${last.y}`,
        "",
        "Route snippet:",
        "[",
        routeLines,
        "]",
        "",
        "POI snippet:",
        "{",
        '  "id": "new-poi",',
        '  "name": "New POI",',
        '  "distance": 0,',
        `  "x": ${last.x},`,
        `  "y": ${last.y},`,
        '  "icon": "N",',
        '  "blurb": "Describe this waypoint."',
        "}"
    ].join("\n");
}

function renderCalibrationOutput() {
    elements.calibrationOutput.textContent = formatCalibrationOutput();
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

function useLastCalibrationPointForPoi() {
    if (!calibration.lastPoint) {
        showToast("No calibration point yet. Click on the map first.");
        return;
    }

    elements.poiEditorX.value = String(calibration.lastPoint.x);
    elements.poiEditorY.value = String(calibration.lastPoint.y);
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

function setCurrentPoiOverride() {
    const point = selectedPoi();
    if (!point) {
        return;
    }

    state.currentPoiOverrideId = point.id;
    render("Current POI overridden");
    showToast(`Current POI set to ${point.name}.`);
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

function toggleCalibrationMode() {
    calibration.enabled = !calibration.enabled;
    elements.calibrationPanel.hidden = !calibration.enabled;
    elements.mapStage.classList.toggle("is-calibrating", calibration.enabled);
    elements.calibrationToggleBtn.textContent = calibration.enabled ? "Exit calibration" : "Calibration mode";
    closeWaypointPopover();

    if (calibration.enabled) {
        renderCalibrationOutput();
        showToast("Calibration enabled. Click map to collect coordinates.");
    }
}

function onMapClick(event) {
    if (!calibration.enabled) {
        return;
    }

    if (mapView.suppressClick) {
        mapView.suppressClick = false;
        return;
    }

    const point = mapEventToSvgPoint(event);
    calibration.lastPoint = point;
    calibration.points.push(point);
    renderCalibrationOutput();
    event.preventDefault();
    event.stopPropagation();
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

    const canPan = !calibration.enabled || event.shiftKey || event.button === 1;
    if (!canPan) {
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
    mapView.suppressClick = mapView.dragMoved;
    mapView.dragMoved = false;
    elements.mapStage.classList.remove("is-panning");
}

function copyCalibrationOutput() {
    const text = elements.calibrationOutput.textContent || "";
    navigator.clipboard.writeText(text)
        .then(() => showToast("Calibration output copied."))
        .catch(() => showToast("Copy failed. Select text manually."));
}

function undoCalibrationPoint() {
    if (!calibration.points.length) {
        return;
    }

    calibration.points.pop();
    calibration.lastPoint = calibration.points[calibration.points.length - 1] || null;
    renderCalibrationOutput();
}

function clearCalibrationPoints() {
    calibration.points = [];
    calibration.lastPoint = null;
    renderCalibrationOutput();
}

function render(reason = "") {
    const percent = progressPercent();
    const distance = totalDistance();
    const remaining = Math.max(0, CONFIG.totalDistanceMeters - distance);
    const waypoint = currentWaypoint();

    state.completedIds = completionIds();
    elements.body.dataset.theme = state.theme;
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
    elements.modeNote.textContent = "Manual tracker with data-driven map calibration support.";

    renderMap();
    renderPoiList();
    if (ENABLE_POI_EDITING) {
        populatePoiEditor();
    }
    persistState();
}

function updateSteps(delta) {
    state.steps = Math.max(0, state.steps + delta);
    setLastSync(delta >= 0 ? "Journey updated" : "Progress adjusted");
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

    elements.minuteRefreshBtn.addEventListener("click", refreshProgress);
    elements.resetJourneyBtn.addEventListener("click", resetJourney);
    elements.saveProgressBtn.addEventListener("click", saveProgressToFile);
    elements.loadProgressBtn.addEventListener("click", triggerProgressImport);
    elements.progressImportInput.addEventListener("change", importProgressFromFile);
    elements.openSettingsBtn.addEventListener("click", openSettings);
    elements.openOnboardingBtn.addEventListener("click", openOnboarding);
    elements.focusCurrentPoiBtn.addEventListener("click", () => {
        const waypoint = currentWaypoint();
        if (waypoint) {
            openWaypointPopover(waypoint.id);
        }
    });
    elements.zoomInBtn.addEventListener("click", () => zoomMap(MAP_DIMENSIONS.zoomStep));
    elements.zoomOutBtn.addEventListener("click", () => zoomMap(1 / MAP_DIMENSIONS.zoomStep));
    elements.zoomResetBtn.addEventListener("click", resetMapView);
    elements.strideInput.addEventListener("input", (event) => applyStride(event.target.value));
    elements.unitSelect.addEventListener("change", (event) => applyUnits(event.target.value));
    elements.themeSelect.addEventListener("change", (event) => applyTheme(event.target.value));
    elements.calibrationToggleBtn.addEventListener("click", toggleCalibrationMode);
    elements.calibrationCopyBtn.addEventListener("click", copyCalibrationOutput);
    elements.calibrationUndoBtn.addEventListener("click", undoCalibrationPoint);
    elements.calibrationClearBtn.addEventListener("click", clearCalibrationPoints);
    if (ENABLE_POI_EDITING) {
        elements.poiEditorSelect.addEventListener("change", syncPoiEditorInputs);
        elements.poiAddNewBtn.addEventListener("click", addNewPoi);
        elements.poiUseLastPointBtn.addEventListener("click", useLastCalibrationPointForPoi);
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
    elements.mapSvg.addEventListener("click", onMapClick, true);

    document.addEventListener("click", (event) => {
        if (calibration.enabled) {
            return;
        }

        if (!event.target.closest(".waypoint") && !event.target.closest(".poi-item") && !event.target.closest(".map-popover")) {
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
        journey.route = buildRouteFromWaypoints(journey.waypoints);
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