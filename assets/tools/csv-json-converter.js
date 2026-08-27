/* CSV ↔ JSON Converter — self-contained tool.
   Real CSV parsing (quoted fields, escaped quotes), type detection,
   both directions. No shared bundles. */
(function () {
  "use strict";

  const STORAGE_KEY = "hchq-csv-json";
  const EXPORT_VERSION = 1;
  const EXPORT_APP = "hchq-csv-json";

  const input = document.getElementById("cjInput");
  const output = document.getElementById("cjOutput");
  const statusEl = document.getElementById("cjStatus");
  const summaryEl = document.getElementById("cjSummary");
  const inputMeta = document.getElementById("cjInputMeta");
  const outputMeta = document.getElementById("cjOutputMeta");
  const importFile = document.getElementById("cjImportFile");
  const dirCsv = document.getElementById("cjDirCsv");
  const dirJson = document.getElementById("cjDirJson");
  const headerRow = document.getElementById("cjHeaderRow");
  const detectTypes = document.getElementById("cjDetectTypes");
  const delimiter = document.getElementById("cjDelimiter");
  const optHeader = document.getElementById("cjOptHeader");
  const optDetect = document.getElementById("cjOptDetect");

  const SAMPLE_CSV = [
    "name,role,active,joined",
    'Ada Lovelace,"Engineer, first of its kind",true,1843',
    'Alan Turing,Computer scientist,true,1936',
    'Grace Hopper,"Compiler pioneer",false,1949'
  ].join("\n");

  const SAMPLE_JSON = JSON.stringify(
    [
      { name: "Ada Lovelace", role: "Engineer, first of its kind", active: true, joined: 1843 },
      { name: "Alan Turing", role: "Computer scientist", active: true, joined: 1936 },
      { name: "Grace Hopper", role: "Compiler pioneer", active: false, joined: 1949 }
    ],
    null,
    2
  );

  // ---------- State & persistence ----------

  let direction = "csv"; // "csv" (CSV→JSON) | "json" (JSON→CSV)

  function loadState() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw === null) {
        return {
          direction: "csv",
          input: SAMPLE_CSV,
          headerRow: true,
          detectTypes: true,
          delimiter: ","
        };
      }
      const parsed = JSON.parse(raw);
      return {
        direction: parsed.direction === "json" ? "json" : "csv",
        input: typeof parsed.input === "string" ? parsed.input : "",
        headerRow: parsed.headerRow !== false,
        detectTypes: parsed.detectTypes !== false,
        delimiter: [",", ";", "\t"].includes(parsed.delimiter) ? parsed.delimiter : ","
      };
    } catch {
      return {
        direction: "csv",
        input: SAMPLE_CSV,
        headerRow: true,
        detectTypes: true,
        delimiter: ","
      };
    }
  }

  let saveTimer = null;
  function scheduleSave() {
    clearTimeout(saveTimer);
    saveTimer = setTimeout(() => {
      try {
        localStorage.setItem(
          STORAGE_KEY,
          JSON.stringify({
            direction,
            input: input.value,
            headerRow: headerRow.checked,
            detectTypes: detectTypes.checked,
            delimiter: delimiter.value
          })
        );
      } catch {
        /* storage blocked — ignore */
      }
    }, 400);
  }

  // ---------- Status line ----------
  // Persistent base (conversion result) + transient flashes (file actions).

  let baseStatus = { msg: "", isError: false };
  let flashActive = false;
  let flashTimer = null;

  function applyStatus() {
    if (flashActive) return;
    statusEl.textContent = baseStatus.msg;
    statusEl.classList.toggle("is-error", baseStatus.isError);
  }

  function setBaseStatus(msg, isError) {
    baseStatus = { msg, isError };
    applyStatus();
  }

  function flash(msg, isError) {
    flashActive = true;
    statusEl.textContent = msg;
    statusEl.classList.toggle("is-error", !!isError);
    clearTimeout(flashTimer);
    flashTimer = setTimeout(() => {
      flashActive = false;
      applyStatus();
    }, isError ? 8000 : 5000);
  }

  // ---------- CSV parsing ----------
  // RFC-4180-ish: quoted fields, embedded delimiters/newlines, "" escapes.

  function parseCsv(text, delim) {
    const rows = [];
    let row = [];
    let field = "";
    let inQuotes = false;
    let i = 0;
    const n = text.length;
    while (i < n) {
      const ch = text[i];
      if (inQuotes) {
        if (ch === '"') {
          if (text[i + 1] === '"') {
            field += '"';
            i += 2;
            continue;
          }
          inQuotes = false;
          i++;
          continue;
        }
        field += ch;
        i++;
        continue;
      }
      if (ch === '"') {
        inQuotes = true;
        i++;
        continue;
      }
      if (ch === delim) {
        row.push(field);
        field = "";
        i++;
        continue;
      }
      if (ch === "\r") {
        if (text[i + 1] === "\n") i++;
        row.push(field);
        rows.push(row);
        row = [];
        field = "";
        i++;
        continue;
      }
      if (ch === "\n") {
        row.push(field);
        rows.push(row);
        row = [];
        field = "";
        i++;
        continue;
      }
      field += ch;
      i++;
    }
    // Flush the final field/row (file may not end with a newline).
    if (field !== "" || row.length > 0) {
      row.push(field);
      rows.push(row);
    }
    // Drop fully-empty trailing rows (e.g. a trailing newline).
    while (rows.length > 0 && rows[rows.length - 1].length === 1 && rows[rows.length - 1][0] === "") {
      rows.pop();
    }
    return rows;
  }

  // ---------- Type detection ----------

  function coerceValue(s) {
    if (typeof s !== "string") return s;
    const t = s.trim();
    if (t === "") return "";
    if (t === "true") return true;
    if (t === "false") return false;
    if (/^-?\d+$/.test(t)) {
      const v = parseInt(t, 10);
      if (Number.isSafeInteger(v)) return v;
      return s;
    }
    if (/^-?\d*\.\d+$/.test(t) || /^-?\d+\.\d*$/.test(t)) {
      const v = parseFloat(t);
      if (Number.isFinite(v)) return v;
    }
    return s;
  }

  // ---------- CSV → JSON ----------

  function csvToJson(text, delim, hasHeader, detect) {
    const rows = parseCsv(text, delim);
    if (rows.length === 0) return { records: [], error: "No rows found in the CSV." };
    const maxCols = Math.max(...rows.map((r) => r.length));
    const warnings = [];

    let headers;
    let dataRows;
    if (hasHeader) {
      headers = rows[0].map((h, idx) => {
        const name = h.trim();
        return name === "" ? "column_" + (idx + 1) : name;
      });
      // De-duplicate empty/blank headers already handled above; flag dupes.
      const seen = new Set();
      headers = headers.map((h) => {
        if (seen.has(h)) {
          warnings.push('Duplicate header "' + h + '" — later columns are renamed.');
          let k = 2;
          let renamed = h + "_" + k;
          while (seen.has(renamed)) {
            k++;
            renamed = h + "_" + k;
          }
          seen.add(renamed);
          return renamed;
        }
        seen.add(h);
        return h;
      });
      dataRows = rows.slice(1);
    } else {
      headers = Array.from({ length: maxCols }, (_, i) => "column_" + (i + 1));
      dataRows = rows;
    }

    const records = dataRows.map((r) => {
      const obj = {};
      headers.forEach((h, idx) => {
        obj[h] = detect ? coerceValue(r[idx] !== undefined ? r[idx] : "") : r[idx] !== undefined ? r[idx] : "";
      });
      return obj;
    });

    const ragged = dataRows.filter((r) => r.length !== maxCols).length;
    if (ragged > 0) {
      warnings.push(ragged + " row" + (ragged === 1 ? " has" : "s have") + " a different column count — missing cells are empty strings.");
    }

    return { records, error: null, warnings };
  }

  // ---------- JSON → CSV ----------

  function jsonToCsv(text, delim) {
    let parsed;
    try {
      parsed = JSON.parse(text);
    } catch (e) {
      return { csv: "", error: "Invalid JSON: " + e.message };
    }

    // Normalize to an array of flat objects.
    let records;
    if (Array.isArray(parsed)) {
      if (parsed.length === 0) return { csv: "", error: "The JSON array is empty — nothing to convert." };
      if (parsed.every((v) => Array.isArray(v))) {
        // Array of arrays → positional columns.
        const maxCols = Math.max(...parsed.map((r) => r.length));
        records = parsed.map((r) => {
          const obj = {};
          for (let i = 0; i < maxCols; i++) obj["column_" + (i + 1)] = r[i] !== undefined ? r[i] : "";
          return obj;
        });
      } else if (parsed.every((v) => v && typeof v === "object" && !Array.isArray(v))) {
        records = parsed;
      } else if (parsed.every((v) => v === null || typeof v === "string" || typeof v === "number" || typeof v === "boolean")) {
        // Flat list of scalars → single column.
        records = parsed.map((v) => ({ value: v }));
      } else {
        return { csv: "", error: "Mixed array contents — use an array of objects, an array of arrays, or a flat list." };
      }
    } else if (parsed && typeof parsed === "object") {
      records = [parsed];
    } else {
      return { csv: "", error: "Top-level JSON must be an object or an array." };
    }

    // Collect headers in first-seen order.
    const headers = [];
    const seen = new Set();
    for (const rec of records) {
      for (const key of Object.keys(rec)) {
        if (!seen.has(key)) {
          seen.add(key);
          headers.push(key);
        }
      }
    }

    const lines = [headers.map(escapeCsv).join(delim)];
    for (const rec of records) {
      lines.push(headers.map((h) => escapeCsv(csvCell(rec[h]))).join(delim));
    }
    return { csv: lines.join("\n"), error: null, rowCount: records.length, colCount: headers.length };
  }

  function csvCell(v) {
    if (v === null || v === undefined) return "";
    if (typeof v === "boolean") return v ? "true" : "false";
    if (typeof v === "object") return JSON.stringify(v);
    return String(v);
  }

  function escapeCsv(s) {
    const str = String(s);
    if (str === "") return '""';
    const needsQuote =
      str.includes('"') || str.includes(",") || str.includes("\n") || str.includes("\r") ||
      (delimiter.value === ";" && str.includes(";")) ||
      (delimiter.value === "\t" && str.includes("\t"));
    if (!needsQuote) return str;
    return '"' + str.replace(/"/g, '""') + '"';
  }

  // ---------- Rendering ----------

  function meta(el, text) {
    if (!text) {
      el.textContent = "";
      return;
    }
    const lines = text.split("\n").length;
    el.textContent = text.length + " chars · " + lines + " lines";
  }

  function render() {
    meta(inputMeta, input.value);
    const text = input.value;

    if (!text.trim()) {
      output.value = "";
      meta(outputMeta, "");
      summaryEl.textContent = "";
      setBaseStatus("Paste some data to convert.", false);
      return;
    }

    if (direction === "csv") {
      const delim = delimiter.value;
      const res = csvToJson(text, delim, headerRow.checked, detectTypes.checked);
      if (res.error) {
        output.value = "";
        meta(outputMeta, "");
        summaryEl.textContent = "";
        setBaseStatus(res.error, true);
        return;
      }
      output.value = JSON.stringify(res.records, null, 2);
      meta(outputMeta, output.value);
      summaryEl.textContent =
        res.records.length + " record" + (res.records.length === 1 ? "" : "s") +
        " · " + Object.keys(res.records[0] || {}).length + " field" +
        (Object.keys(res.records[0] || {}).length === 1 ? "" : "s");
      setBaseStatus(
        res.warnings && res.warnings.length
          ? res.warnings.join(" ")
          : "Converted " + res.records.length + " record" + (res.records.length === 1 ? "" : "s") + " to JSON.",
        false
      );
    } else {
      const res = jsonToCsv(text, delimiter.value);
      if (res.error) {
        output.value = "";
        meta(outputMeta, "");
        summaryEl.textContent = "";
        setBaseStatus(res.error, true);
        return;
      }
      output.value = res.csv;
      meta(outputMeta, output.value);
      summaryEl.textContent = res.rowCount + " row" + (res.rowCount === 1 ? "" : "s") + " · " + res.colCount + " column" + (res.colCount === 1 ? "" : "s");
      setBaseStatus("Converted " + res.rowCount + " row" + (res.rowCount === 1 ? "" : "s") + " to CSV.", false);
    }
  }

  let renderTimer = null;
  function scheduleRender() {
    clearTimeout(renderTimer);
    renderTimer = setTimeout(render, 250);
  }

  // ---------- Actions ----------

  function setDirection(d) {
    direction = d;
    dirCsv.classList.toggle("is-active", d === "csv");
    dirJson.classList.toggle("is-active", d === "json");
    syncOptions();
    render();
    scheduleSave();
  }

  function syncOptions() {
    // Header-row and type-detection only apply to CSV → JSON.
    const csvMode = direction === "csv";
    optHeader.style.display = csvMode ? "" : "none";
    optDetect.style.display = csvMode ? "" : "none";
  }

  dirCsv.addEventListener("click", () => setDirection("csv"));
  dirJson.addEventListener("click", () => setDirection("json"));

  document.getElementById("cjSample").addEventListener("click", () => {
    input.value = direction === "csv" ? SAMPLE_CSV : SAMPLE_JSON;
    render();
    scheduleSave();
    flash("Loaded a sample " + (direction === "csv" ? "CSV" : "JSON") + ".");
  });

  document.getElementById("cjCopy").addEventListener("click", async () => {
    if (!output.value) {
      flash("Nothing to copy yet.", true);
      return;
    }
    try {
      await navigator.clipboard.writeText(output.value);
      flash("Copied " + (direction === "csv" ? "JSON" : "CSV") + " to clipboard.");
    } catch {
      flash("Copy failed — select the output and copy manually.", true);
    }
  });

  document.getElementById("cjDownload").addEventListener("click", () => {
    if (!output.value) {
      flash("Nothing to download yet.", true);
      return;
    }
    const isJson = direction === "csv";
    const blob = new Blob([output.value], { type: isJson ? "application/json" : "text/csv" });
    const url = URL.createObjectURL(blob);
    const aEl = document.createElement("a");
    aEl.href = url;
    aEl.download = isJson ? "converted.json" : "converted.csv";
    document.body.appendChild(aEl);
    aEl.click();
    aEl.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    flash("Downloaded " + aEl.download);
  });

  document.getElementById("cjExport").addEventListener("click", () => {
    const payload = {
      app: EXPORT_APP,
      version: EXPORT_VERSION,
      exportedAt: new Date().toISOString(),
      direction,
      input: input.value,
      headerRow: headerRow.checked,
      detectTypes: detectTypes.checked,
      delimiter: delimiter.value
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const aEl = document.createElement("a");
    aEl.href = url;
    aEl.download = "csv-json-converter-export.json";
    document.body.appendChild(aEl);
    aEl.click();
    aEl.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    flash("Exported as JSON.");
  });

  document.getElementById("cjImport").addEventListener("click", () => importFile.click());

  importFile.addEventListener("change", () => {
    const file = importFile.files && importFile.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const text = String(reader.result || "");
      try {
        const parsed = JSON.parse(text);
        if (parsed && typeof parsed === "object" && parsed.app === EXPORT_APP) {
          if (parsed.direction === "json" || parsed.direction === "csv") direction = parsed.direction;
          input.value = typeof parsed.input === "string" ? parsed.input : "";
          headerRow.checked = parsed.headerRow !== false;
          detectTypes.checked = parsed.detectTypes !== false;
          if ([",", ";", "\t"].includes(parsed.delimiter)) delimiter.value = parsed.delimiter;
          dirCsv.classList.toggle("is-active", direction === "csv");
          dirJson.classList.toggle("is-active", direction === "json");
          syncOptions();
          render();
          scheduleSave();
          flash("Imported converter state.");
        } else {
          flash("That file isn't a CSV/JSON converter export.", true);
          importFile.value = "";
          return;
        }
      } catch {
        flash("That file isn't valid JSON.", true);
        importFile.value = "";
        return;
      }
      importFile.value = "";
    };
    reader.onerror = () => flash("Could not read that file.", true);
    reader.readAsText(file);
  });

  document.getElementById("cjClear").addEventListener("click", () => {
    if (!input.value) {
      flash("Already empty.");
      return;
    }
    if (!window.confirm("Clear the input? This can't be undone.")) return;
    input.value = "";
    render();
    scheduleSave();
    flash("Cleared.");
  });

  // ---------- Wiring ----------

  input.addEventListener("input", () => {
    scheduleRender();
    scheduleSave();
  });
  headerRow.addEventListener("change", () => {
    render();
    scheduleSave();
  });
  detectTypes.addEventListener("change", () => {
    render();
    scheduleSave();
  });
  delimiter.addEventListener("change", () => {
    render();
    scheduleSave();
  });

  // ---------- Init ----------

  const state = loadState();
  direction = state.direction;
  input.value = state.input;
  headerRow.checked = state.headerRow;
  detectTypes.checked = state.detectTypes;
  delimiter.value = state.delimiter;
  dirCsv.classList.toggle("is-active", direction === "csv");
  dirJson.classList.toggle("is-active", direction === "json");
  syncOptions();
  render();
})();
