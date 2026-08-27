/*
 * Storage Sizing Calculator
 * -------------------------
 * Self-contained tool (no shared bundles). Estimates usable, compressed,
 * raw, and purchased storage capacity across multiple data line items,
 * with GFS retention, RAID/factor redundancy, growth projection, cost
 * estimation (on-prem + cloud), drive counts, sanity warnings, presets,
 * URL sharing, and JSON/CSV/text export.
 *
 * Persistence: localStorage key "hchq-storage-sizing".
 */
(function () {
  "use strict";

  const STORAGE_KEY = "hchq-storage-sizing";
  const EXPORT_VERSION = 2;
  const EXPORT_APP = "hchq-storage-sizing";

  /* ------------------------------------------------------------------ *
   * Defaults & presets
   * ------------------------------------------------------------------ */

  function uid() {
    return "i" + Math.random().toString(36).slice(2, 9);
  }

  function defaultItem(overrides) {
    return Object.assign(
      {
        id: uid(),
        name: "New line item",
        dailyGb: 100,
        retentionMode: "flat",
        retentionDays: 30,
        gfsDaily: 7,
        gfsMonthly: 12,
        gfsYearly: 7,
        compressionRatio: 1.5,
      },
      overrides || {}
    );
  }

  function defaultState() {
    return {
      items: [defaultItem({ name: "Primary backups", dailyGb: 120 })],
      redundancyMode: "factor",
      replicaFactor: 2,
      raidLevel: "raid10",
      driveSizeTb: 16,
      growthPct: 25,
      growthYears: 3,
      unit: "binary",
      costPerTb: 150,
      cloudEnabled: false,
      hotRate: 0.018,
      coolRate: 0.008,
      archiveRate: 0.003,
      hotPct: 40,
      coolPct: 40,
      archivePct: 20,
    };
  }

  const PRESETS = {
    small: {
      label: "Small office",
      items: [defaultItem({ name: "Office backups", dailyGb: 50, retentionDays: 30, compressionRatio: 1.5 })],
      redundancyMode: "factor",
      replicaFactor: 2,
      driveSizeTb: 8,
      growthPct: 15,
      growthYears: 3,
      costPerTb: 150,
    },
    mid: {
      label: "Mid-size",
      items: [
        defaultItem({ name: "VM backups", dailyGb: 200, retentionDays: 30, compressionRatio: 1.6 }),
        defaultItem({ name: "File shares", dailyGb: 80, retentionDays: 60, compressionRatio: 1.4 }),
      ],
      redundancyMode: "raid",
      raidLevel: "raid6",
      driveSizeTb: 16,
      growthPct: 20,
      growthYears: 3,
      costPerTb: 140,
    },
    enterprise: {
      label: "Enterprise",
      items: [
        defaultItem({ name: "SQL logs", dailyGb: 400, retentionMode: "gfs", gfsDaily: 14, gfsMonthly: 12, gfsYearly: 7, compressionRatio: 2.0 }),
        defaultItem({ name: "VM backups", dailyGb: 600, retentionDays: 30, compressionRatio: 1.8 }),
        defaultItem({ name: "Archive", dailyGb: 150, retentionMode: "gfs", gfsDaily: 7, gfsMonthly: 24, gfsYearly: 12, compressionRatio: 2.5 }),
      ],
      redundancyMode: "raid",
      raidLevel: "raid10",
      driveSizeTb: 16,
      growthPct: 25,
      growthYears: 5,
      costPerTb: 130,
    },
  };

  /* ------------------------------------------------------------------ *
   * State load / save
   * ------------------------------------------------------------------ */

  function sanitizeState(s) {
    const base = defaultState();
    const out = Object.assign(base, s || {});
    if (!Array.isArray(out.items) || !out.items.length) out.items = [defaultItem()];
    out.items = out.items.map((it) => Object.assign(defaultItem(), it, { id: it.id || uid() }));
    const numFields = ["replicaFactor", "driveSizeTb", "growthPct", "growthYears", "costPerTb", "hotRate", "coolRate", "archiveRate", "hotPct", "coolPct", "archivePct"];
    numFields.forEach((f) => {
      out[f] = Number.isFinite(Number(out[f])) ? Number(out[f]) : base[f];
    });
    out.items.forEach((it) => {
      ["dailyGb", "retentionDays", "gfsDaily", "gfsMonthly", "gfsYearly", "compressionRatio"].forEach((f) => {
        it[f] = Number.isFinite(Number(it[f])) ? Number(it[f]) : defaultItem()[f];
      });
    });
    return out;
  }

  function loadState() {
    const fromUrl = readUrlState();
    if (fromUrl) return fromUrl;
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed && Array.isArray(parsed.items) && parsed.items.length) {
          return sanitizeState(parsed);
        }
      }
    } catch (e) {
      /* ignore corrupt storage */
    }
    return defaultState();
  }

  function saveState() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch (e) {
      /* storage full or unavailable */
    }
  }

  /* ------------------------------------------------------------------ *
   * URL sharing (compact base64url of state)
   * ------------------------------------------------------------------ */

  function b64urlEncode(str) {
    return btoa(unescape(encodeURIComponent(str)))
      .replace(/\+/g, "-")
      .replace(/\//g, "_")
      .replace(/=+$/, "");
  }

  function b64urlDecode(str) {
    str = str.replace(/-/g, "+").replace(/_/g, "/");
    while (str.length % 4) str += "=";
    return decodeURIComponent(escape(atob(str)));
  }

  function readUrlState() {
    try {
      const params = new URLSearchParams(window.location.search);
      const s = params.get("s");
      if (!s) return null;
      const parsed = JSON.parse(b64urlDecode(s));
      if (!parsed || !Array.isArray(parsed.items)) return null;
      return sanitizeState(parsed);
    } catch (e) {
      return null;
    }
  }

  function buildShareUrl() {
    const url = new URL(window.location.href);
    url.search = "";
    url.searchParams.set("s", b64urlEncode(JSON.stringify(state)));
    return url.toString();
  }

  /* ------------------------------------------------------------------ *
   * Math
   * ------------------------------------------------------------------ */

  function effectiveDays(item) {
    if (item.retentionMode === "gfs") {
      return item.gfsDaily * 1 + item.gfsMonthly * 30 + item.gfsYearly * 365;
    }
    return item.retentionDays;
  }

  function itemUsableGb(item) {
    return item.dailyGb * effectiveDays(item);
  }

  function itemCompressedGb(item) {
    const comp = Math.max(1, item.compressionRatio);
    return itemUsableGb(item) / comp;
  }

  // RAID level metadata: usable fraction of total raw capacity, minimum drives,
  // and any drive-count constraint (even for mirrored layouts).
  const RAID_LEVELS = {
    raid0:  { label: "RAID 0",  usable: 1,    min: 2, even: false, note: "striped, no redundancy" },
    raid1:  { label: "RAID 1",  usable: 0.5,  min: 2, even: true,  note: "mirrored" },
    raid10: { label: "RAID 10", usable: 0.5,  min: 4, even: true,  note: "striped mirrors" },
    raid5:  { label: "RAID 5",  usable: null, min: 3, even: false, note: "single parity" }, // (n-1)/n
    raid50: { label: "RAID 50", usable: 0.5,  min: 6, even: true,  note: "striped RAID 5" },
    raid6:  { label: "RAID 6",  usable: null, min: 4, even: false, note: "double parity" }, // (n-2)/n
    raid60: { label: "RAID 60", usable: 0.5,  min: 8, even: true,  note: "striped RAID 6" },
  };

  // Returns { drives, rawGb } for a RAID level given required usable GB.
  function raidSizing(requiredGb, level, driveSizeGb) {
    const meta = RAID_LEVELS[level] || RAID_LEVELS.raid10;
    if (driveSizeGb <= 0) return { drives: 0, rawGb: 0 };
    let n = meta.min;
    // Grow drive count until usable capacity meets the requirement.
    for (; ; n += 1) {
      const usable = meta.usable !== null
        ? n * driveSizeGb * meta.usable
        : (n - (meta.label === "RAID 6" ? 2 : 1)) * driveSizeGb;
      if (usable >= requiredGb) break;
      if (n > 10000) break; // safety valve
    }
    if (meta.even && n % 2) n += 1; // mirrored layouts need even drive counts
    return { drives: n, rawGb: n * driveSizeGb };
  }

  function compute() {
    const warnings = [];
    const itemRows = state.items.map((it) => {
      const usable = itemUsableGb(it);
      const compressed = itemCompressedGb(it);
      return { item: it, usable, compressed, days: effectiveDays(it) };
    });

    const totalUsable = itemRows.reduce((s, r) => s + r.usable, 0);
    const totalCompressed = itemRows.reduce((s, r) => s + r.compressed, 0);

    // Sanity warnings
    state.items.forEach((it) => {
      if (it.compressionRatio > 3) warnings.push(`"${it.name}": compression ratio ${it.compressionRatio}× is unusually high — verify against real data.`);
      if (it.compressionRatio < 1) warnings.push(`"${it.name}": compression ratio below 1× means data grows; check the value.`);
      if (it.dailyGb <= 0) warnings.push(`"${it.name}": daily data is 0 — this item contributes nothing.`);
      if (it.retentionMode === "gfs" && it.gfsDaily + it.gfsMonthly + it.gfsYearly === 0) warnings.push(`"${it.name}": GFS retention is all zeros.`);
    });
    if (state.redundancyMode === "factor" && state.replicaFactor > 4) warnings.push(`Replica factor ${state.replicaFactor}× is high — confirm the redundancy requirement.`);
    if (state.redundancyMode === "raid" && state.driveSizeTb <= 0) warnings.push("Drive size must be greater than 0 for RAID sizing.");

    // Raw capacity
    let rawGb;
    let drives = 0;
    if (state.redundancyMode === "raid") {
      const sized = raidSizing(totalCompressed, state.raidLevel, state.driveSizeTb * 1024);
      rawGb = sized.rawGb;
      drives = sized.drives;
    } else {
      rawGb = totalCompressed * Math.max(1, state.replicaFactor);
      if (state.driveSizeTb > 0) drives = Math.ceil(rawGb / (state.driveSizeTb * 1024));
    }

    // Purchased capacity (growth buffer applied once)
    const purchaseGb = rawGb * (1 + state.growthPct / 100);

    // Growth projection (compound annual)
    const growthRows = [];
    for (let y = 0; y <= Math.max(0, Math.floor(state.growthYears)); y++) {
      growthRows.push({ year: y, gb: purchaseGb * Math.pow(1 + state.growthPct / 100, y) });
    }

    // Cost
    const purchaseTb = toTb(purchaseGb);
    const hardwareCost = purchaseTb * state.costPerTb;

    // Cloud monthly cost (based on compressed stored data + tier split)
    let cloudMonthly = 0;
    if (state.cloudEnabled) {
      const totalPct = state.hotPct + state.coolPct + state.archivePct;
      const norm = totalPct > 0 ? totalPct : 1;
      const hotGb = (totalCompressed * state.hotPct) / norm;
      const coolGb = (totalCompressed * state.coolPct) / norm;
      const archiveGb = (totalCompressed * state.archivePct) / norm;
      cloudMonthly = hotGb * state.hotRate + coolGb * state.coolRate + archiveGb * state.archiveRate;
    }

    return { itemRows, totalUsable, totalCompressed, rawGb, purchaseGb, drives, growthRows, hardwareCost, cloudMonthly, warnings };
  }

  /* ------------------------------------------------------------------ *
   * Formatting
   * ------------------------------------------------------------------ */

  function toTb(gb) {
    const divisor = state.unit === "decimal" ? 1000 : 1024;
    return gb / divisor;
  }

  function fmtCap(gb) {
    const tb = toTb(gb);
    if (tb >= 1024) return (tb / 1024).toFixed(2) + " PB";
    if (tb >= 1) return tb.toFixed(2) + " TB";
    return Math.round(gb).toLocaleString() + " GB";
  }

  function fmtMoney(n) {
    return "$" + Math.round(n).toLocaleString();
  }

  /* ------------------------------------------------------------------ *
   * DOM references
   * ------------------------------------------------------------------ */

  const form = document.querySelector('form[data-tool="storage-sizing"]');
  if (!form) return;

  const itemsEl = form.querySelector("#ssItems");
  const resultsEl = document.querySelector("[data-tool-results]");
  const statusEl = document.querySelector("#ssStatus");

  // base + flash status pattern (consistent with other tools)
  let baseStatus = { msg: "", isError: false };
  let flashActive = false;
  let flashTimer = null;

  function applyStatus() {
    if (!statusEl || flashActive) return;
    statusEl.textContent = baseStatus.msg;
    statusEl.classList.toggle("is-error", baseStatus.isError);
  }
  function setBaseStatus(msg, isError) {
    baseStatus = { msg, isError: !!isError };
    applyStatus();
  }
  function flash(msg, isError) {
    if (!statusEl) return;
    flashActive = true;
    statusEl.textContent = msg;
    statusEl.classList.toggle("is-error", !!isError);
    clearTimeout(flashTimer);
    flashTimer = setTimeout(() => {
      flashActive = false;
      applyStatus();
    }, isError ? 8000 : 5000);
  }

  /* ------------------------------------------------------------------ *
   * Line item rendering
   * ------------------------------------------------------------------ */

  function renderItems() {
    itemsEl.innerHTML = "";
    state.items.forEach((it) => {
      const row = document.createElement("div");
      row.className = "ss-item";
      row.dataset.id = it.id;

      row.innerHTML = `
        <div class="ss-item-head">
          <input class="ss-item-name" type="text" value="${escapeAttr(it.name)}" placeholder="Line item name" aria-label="Line item name">
          <button type="button" class="ss-item-remove btn ghost" title="Remove line item" aria-label="Remove line item">✕</button>
        </div>
        <div class="ss-item-grid">
          <label>Daily (GB/day)
            <input class="ss-item-daily" type="number" min="0" step="0.1" value="${it.dailyGb}">
          </label>
          <label>Retention
            <select class="ss-item-retmode">
              <option value="flat" ${it.retentionMode === "flat" ? "selected" : ""}>Flat (days)</option>
              <option value="gfs" ${it.retentionMode === "gfs" ? "selected" : ""}>GFS tiers</option>
            </select>
          </label>
          <label class="ss-flat-wrap">Retention (days)
            <input class="ss-item-days" type="number" min="0" step="1" value="${it.retentionDays}">
          </label>
          <label class="ss-gfs-wrap">Daily snaps
            <input class="ss-item-gfsd" type="number" min="0" step="1" value="${it.gfsDaily}">
          </label>
          <label class="ss-gfs-wrap">Monthly snaps
            <input class="ss-item-gfsm" type="number" min="0" step="1" value="${it.gfsMonthly}">
          </label>
          <label class="ss-gfs-wrap">Yearly snaps
            <input class="ss-item-gfsy" type="number" min="0" step="1" value="${it.gfsYearly}">
          </label>
          <label>Compression (×)
            <input class="ss-item-comp" type="number" min="0" step="0.1" value="${it.compressionRatio}">
          </label>
        </div>
      `;

      const nameInput = row.querySelector(".ss-item-name");
      const dailyInput = row.querySelector(".ss-item-daily");
      const retMode = row.querySelector(".ss-item-retmode");
      const daysInput = row.querySelector(".ss-item-days");
      const gfsd = row.querySelector(".ss-item-gfsd");
      const gfsm = row.querySelector(".ss-item-gfsm");
      const gfsy = row.querySelector(".ss-item-gfsy");
      const comp = row.querySelector(".ss-item-comp");

      nameInput.addEventListener("input", () => { it.name = nameInput.value; onInput(); });
      dailyInput.addEventListener("input", () => { it.dailyGb = num(dailyInput.value); onInput(); });
      retMode.addEventListener("change", () => { it.retentionMode = retMode.value; toggleGfs(row, it.retentionMode === "gfs"); onInput(); });
      daysInput.addEventListener("input", () => { it.retentionDays = num(daysInput.value); onInput(); });
      gfsd.addEventListener("input", () => { it.gfsDaily = num(gfsd.value); onInput(); });
      gfsm.addEventListener("input", () => { it.gfsMonthly = num(gfsm.value); onInput(); });
      gfsy.addEventListener("input", () => { it.gfsYearly = num(gfsy.value); onInput(); });
      comp.addEventListener("input", () => { it.compressionRatio = num(comp.value); onInput(); });

      row.querySelector(".ss-item-remove").addEventListener("click", () => {
        state.items = state.items.filter((x) => x.id !== it.id);
        if (!state.items.length) state.items = [defaultItem()];
        renderItems();
        onInput();
      });

      toggleGfs(row, it.retentionMode === "gfs");
      itemsEl.appendChild(row);
    });
  }

  function toggleGfs(row, isGfs) {
    row.querySelector(".ss-flat-wrap").style.display = isGfs ? "none" : "";
    row.querySelectorAll(".ss-gfs-wrap").forEach((el) => (el.style.display = isGfs ? "" : "none"));
  }

  function num(v) {
    const n = parseFloat(v);
    return Number.isFinite(n) ? n : 0;
  }

  function escapeAttr(s) {
    return String(s).replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;");
  }

  /* ------------------------------------------------------------------ *
   * Global settings binding
   * ------------------------------------------------------------------ */

  const $ = (id) => form.querySelector("#" + id);

  function bindGlobal() {
    $("ssRedundancyMode").addEventListener("change", (e) => {
      state.redundancyMode = e.target.value;
      toggleRedundancy();
      onInput();
    });
    $("ssReplicaFactor").addEventListener("input", (e) => { state.replicaFactor = num(e.target.value); onInput(); });
    $("ssRaidLevel").addEventListener("change", (e) => { state.raidLevel = e.target.value; onInput(); });
    $("ssDriveSize").addEventListener("input", (e) => { state.driveSizeTb = num(e.target.value); onInput(); });
    $("ssGrowthPct").addEventListener("input", (e) => { state.growthPct = num(e.target.value); onInput(); });
    $("ssGrowthYears").addEventListener("input", (e) => { state.growthYears = num(e.target.value); onInput(); });
    $("ssUnit").addEventListener("change", (e) => { state.unit = e.target.value; onInput(); });
    $("ssCostPerTb").addEventListener("input", (e) => { state.costPerTb = num(e.target.value); onInput(); });
    $("ssCloudEnabled").addEventListener("change", (e) => { state.cloudEnabled = e.target.checked; toggleCloud(); onInput(); });
    $("ssHotRate").addEventListener("input", (e) => { state.hotRate = num(e.target.value); onInput(); });
    $("ssCoolRate").addEventListener("input", (e) => { state.coolRate = num(e.target.value); onInput(); });
    $("ssArchiveRate").addEventListener("input", (e) => { state.archiveRate = num(e.target.value); onInput(); });
    $("ssHotPct").addEventListener("input", (e) => { state.hotPct = num(e.target.value); onInput(); });
    $("ssCoolPct").addEventListener("input", (e) => { state.coolPct = num(e.target.value); onInput(); });
    $("ssArchivePct").addEventListener("input", (e) => { state.archivePct = num(e.target.value); onInput(); });
  }

  function toggleRedundancy() {
    const isRaid = state.redundancyMode === "raid";
    $("ssFactorWrap").style.display = isRaid ? "none" : "";
    $("ssRaidWrap").style.display = isRaid ? "" : "none";
  }

  function toggleCloud() {
    $("ssCloudWrap").style.display = state.cloudEnabled ? "" : "none";
  }

  function syncControls() {
    $("ssRedundancyMode").value = state.redundancyMode;
    $("ssReplicaFactor").value = state.replicaFactor;
    $("ssRaidLevel").value = state.raidLevel;
    $("ssDriveSize").value = state.driveSizeTb;
    $("ssGrowthPct").value = state.growthPct;
    $("ssGrowthYears").value = state.growthYears;
    $("ssUnit").value = state.unit;
    $("ssCostPerTb").value = state.costPerTb;
    $("ssCloudEnabled").checked = state.cloudEnabled;
    $("ssHotRate").value = state.hotRate;
    $("ssCoolRate").value = state.coolRate;
    $("ssArchiveRate").value = state.archiveRate;
    $("ssHotPct").value = state.hotPct;
    $("ssCoolPct").value = state.coolPct;
    $("ssArchivePct").value = state.archivePct;
    toggleRedundancy();
    toggleCloud();
  }

  /* ------------------------------------------------------------------ *
   * Results rendering
   * ------------------------------------------------------------------ */

  function renderResults(res) {
    set("ssUsable", fmtCap(res.totalUsable));
    set("ssCompressed", fmtCap(res.totalCompressed));
    set("ssRaw", fmtCap(res.rawGb));
    set("ssPurchase", fmtCap(res.purchaseGb));
    set("ssDrives", res.drives ? String(res.drives) : "—");
    const drivesNote = resultsEl.querySelector("#ssDrivesNote");
    if (drivesNote) {
      drivesNote.textContent = state.redundancyMode === "raid"
        ? (RAID_LEVELS[state.raidLevel] ? RAID_LEVELS[state.raidLevel].label + " — " + RAID_LEVELS[state.raidLevel].note : "At selected drive size")
        : "At selected drive size";
    }
    set("ssHardware", state.costPerTb > 0 ? fmtMoney(res.hardwareCost) : "—");
    set("ssCloud", state.cloudEnabled ? fmtMoney(res.cloudMonthly) + "/mo" : "—");

    // warnings
    const warnEl = resultsEl.querySelector("#ssWarnings");
    warnEl.innerHTML = "";
    if (res.warnings.length) {
      const ul = document.createElement("ul");
      res.warnings.forEach((w) => {
        const li = document.createElement("li");
        li.textContent = "⚠ " + w;
        ul.appendChild(li);
      });
      warnEl.appendChild(ul);
    }

    // per-item table
    const itemBody = resultsEl.querySelector("#ssItemBody");
    itemBody.innerHTML = "";
    res.itemRows.forEach((r) => {
      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td>${escapeAttr(r.item.name)}</td>
        <td>${r.item.dailyGb.toLocaleString()}</td>
        <td>${r.days.toLocaleString()}</td>
        <td>${fmtCap(r.usable)}</td>
        <td>${r.item.compressionRatio}×</td>
        <td>${fmtCap(r.compressed)}</td>
      `;
      itemBody.appendChild(tr);
    });

    // growth table
    const growthBody = resultsEl.querySelector("#ssGrowthBody");
    growthBody.innerHTML = "";
    res.growthRows.forEach((g) => {
      const tr = document.createElement("tr");
      tr.innerHTML = `<td>Year ${g.year}</td><td>${fmtCap(g.gb)}</td>`;
      growthBody.appendChild(tr);
    });
  }

  function set(id, text) {
    const el = resultsEl.querySelector("#" + id);
    if (el) el.textContent = text;
  }

  /* ------------------------------------------------------------------ *
   * Actions
   * ------------------------------------------------------------------ */

  function onInput() {
    saveState();
    const res = compute();
    renderResults(res);
    setBaseStatus(res.warnings.length ? res.warnings.length + " warning(s) — see results." : "Estimate updated.", res.warnings.length > 0);
    flash("Saved to this browser.");
  }

  function addItem() {
    state.items.push(defaultItem());
    renderItems();
    onInput();
  }

  function applyPreset(key) {
    const p = PRESETS[key];
    if (!p) return;
    state = sanitizeState(Object.assign(defaultState(), p, { items: p.items.map((it) => defaultItem(it)) }));
    renderItems();
    syncControls();
    onInput();
    flash("Preset applied: " + p.label);
  }

  function resetAll() {
    state = defaultState();
    renderItems();
    syncControls();
    onInput();
    flash("Reset to defaults.");
  }

  function copySummary() {
    const res = compute();
    const lines = [
      "Storage Sizing Estimate — Hybridcloudhq",
      "=======================================",
      "",
      "Line items:",
    ];
    res.itemRows.forEach((r) => {
      lines.push(`  • ${r.item.name}: ${r.item.dailyGb} GB/day × ${r.days} days = ${fmtCap(r.usable)} usable, ${fmtCap(r.compressed)} compressed (${r.item.compressionRatio}×)`);
    });
    lines.push(
      "",
      `Total usable:      ${fmtCap(res.totalUsable)}`,
      `Total compressed:  ${fmtCap(res.totalCompressed)}`,
      `Raw capacity:      ${fmtCap(res.rawGb)}`,
      `Purchased (+${state.growthPct}%): ${fmtCap(res.purchaseGb)}`,
      `Drives needed:     ${res.drives || "—"}`,
      `Hardware cost:     ${state.costPerTb > 0 ? fmtMoney(res.hardwareCost) : "—"}`,
      `Cloud (monthly):   ${state.cloudEnabled ? fmtMoney(res.cloudMonthly) : "—"}`,
      `Units:             ${state.unit}`
    );
    if (res.warnings.length) {
      lines.push("", "Warnings:");
      res.warnings.forEach((w) => lines.push("  ⚠ " + w));
    }
    copyText(lines.join("\n"), "Summary copied to clipboard.");
  }

  function downloadCsv() {
    const res = compute();
    const rows = [["name", "daily_gb", "retention_days", "usable_gb", "compression", "compressed_gb"]];
    res.itemRows.forEach((r) => rows.push([r.item.name, r.item.dailyGb, r.days, Math.round(r.usable), r.item.compressionRatio, Math.round(r.compressed)]));
    rows.push([]);
    rows.push(["total", "", "", Math.round(res.totalUsable), "", Math.round(res.totalCompressed)]);
    rows.push(["raw_capacity_gb", "", "", Math.round(res.rawGb)]);
    rows.push(["purchased_gb", "", "", Math.round(res.purchaseGb)]);
    const csv = rows.map((r) => r.map(csvCell).join(",")).join("\n");
    downloadBlob(new Blob([csv], { type: "text/csv" }), "storage-sizing.csv");
    flash("CSV downloaded.");
  }

  function csvCell(v) {
    const s = String(v);
    return /[",\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
  }

  function shareLink() {
    copyText(buildShareUrl(), "Share link copied to clipboard.");
  }

  function exportJson() {
    const payload = { app: EXPORT_APP, version: EXPORT_VERSION, exportedAt: new Date().toISOString(), state };
    downloadBlob(new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" }), "storage-sizing.json");
    flash("Exported JSON.");
  }

  function importJson(file) {
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const parsed = JSON.parse(reader.result);
        const s = parsed && parsed.state ? parsed.state : parsed;
        if (!s || !Array.isArray(s.items)) throw new Error("No items found");
        state = sanitizeState(s);
        renderItems();
        syncControls();
        onInput();
        flash("Imported scenario.");
      } catch (e) {
        flash("Import failed: not a valid storage sizing file.", true);
      }
    };
    reader.readAsText(file);
  }

  function copyText(text, okMsg) {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(
        () => flash(okMsg),
        () => flash("Copy failed — select and copy manually.", true)
      );
    } else {
      flash("Clipboard not available in this browser.", true);
    }
  }

  function downloadBlob(blob, filename) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  /* ------------------------------------------------------------------ *
   * Init
   * ------------------------------------------------------------------ */

  let state = loadState();

  function init() {
    renderItems();
    syncControls();
    bindGlobal();

    form.querySelector("#ssAddItem").addEventListener("click", addItem);
    form.querySelector("#ssPreset").addEventListener("change", (e) => {
      if (e.target.value) {
        applyPreset(e.target.value);
        e.target.value = "";
      }
    });
    form.querySelector("#ssCopy").addEventListener("click", copySummary);
    form.querySelector("#ssCsv").addEventListener("click", downloadCsv);
    form.querySelector("#ssShare").addEventListener("click", shareLink);
    form.querySelector("#ssExport").addEventListener("click", exportJson);
    form.querySelector("#ssImport").addEventListener("click", () => form.querySelector("#ssImportFile").click());
    form.querySelector("#ssImportFile").addEventListener("change", (e) => {
      if (e.target.files && e.target.files[0]) importJson(e.target.files[0]);
      e.target.value = "";
    });
    form.querySelector("#ssReset").addEventListener("click", resetAll);
    form.addEventListener("submit", (e) => {
      e.preventDefault();
      onInput();
      flash("Calculated.");
    });

    const res = compute();
    renderResults(res);
    setBaseStatus(res.warnings.length ? res.warnings.length + " warning(s) — see results." : "Ready.", res.warnings.length > 0);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
