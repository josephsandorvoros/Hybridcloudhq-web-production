/* JSON Formatter & Validator — self-contained tool.
   Live validation with exact line/column errors, pretty-print, minify,
   key sorting, syntax-highlighted output. No shared bundles. */
(function () {
  "use strict";

  const STORAGE_KEY = "hchq-json-formatter";
  const EXPORT_VERSION = 1;

  const input = document.getElementById("jfInput");
  const output = document.getElementById("jfOutput");
  const statusEl = document.getElementById("jfStatus");
  const statsEl = document.getElementById("jfStats");
  const inputMeta = document.getElementById("jfInputMeta");
  const outputMeta = document.getElementById("jfOutputMeta");
  const indentSel = document.getElementById("jfIndent");
  const sortChk = document.getElementById("jfSortKeys");
  const importFile = document.getElementById("jfImportFile");

  const SAMPLE = [
    "{",
    "  \"name\": \"Hybridcloudhq\",",
    "  \"version\": 1,",
    "  \"tools\": [\"kanban\", \"markdown\", \"html-editor\", \"json\"],",
    "  \"settings\": {",
    "    \"theme\": \"dark\",",
    "    \"autosave\": true,",
    "    \"indent\": 2",
    "  }",
    "}"
  ].join("\n");

  // ---------- State & persistence ----------

  let mode = "format"; // "format" | "minify"

  function getOptions() {
    return {
      indent: indentSel.value,
      sortKeys: sortChk.checked
    };
  }

  function loadState() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw === null) return { input: SAMPLE, options: { indent: "2", sortKeys: false } };
      const parsed = JSON.parse(raw);
      return {
        input: typeof parsed.input === "string" ? parsed.input : SAMPLE,
        options: {
          indent: parsed.options && parsed.options.indent ? parsed.options.indent : "2",
          sortKeys: !!(parsed.options && parsed.options.sortKeys)
        }
      };
    } catch {
      return { input: SAMPLE, options: { indent: "2", sortKeys: false } };
    }
  }

  let saveTimer = null;
  function scheduleSave() {
    clearTimeout(saveTimer);
    saveTimer = setTimeout(() => {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify({ input: input.value, options: getOptions() }));
      } catch {
        /* storage blocked — ignore */
      }
    }, 400);
  }

  // ---------- Status line ----------
  // The status line has a persistent "base" (the live validation state) and
  // transient flashes (import/export/clear). A flash temporarily overrides
  // the base, then the base is restored when the flash times out.

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

  // ---------- Strict JSON parser with line/column errors ----------
  // A small hand-rolled parser so error positions are consistent across
  // browsers (native JSON.parse messages vary and often omit positions).

  function parseJsonWithPosition(text) {
    let i = 0;
    const n = text.length;

    function lineCol(idx) {
      let line = 1;
      let col = 1;
      for (let k = 0; k < idx; k++) {
        if (text[k] === "\n") {
          line++;
          col = 1;
        } else {
          col++;
        }
      }
      return { line, col };
    }

    function fail(msg) {
      const p = lineCol(i);
      throw new Error(msg + " (line " + p.line + ", column " + p.col + ")");
    }

    function skipWs() {
      while (i < n && (text[i] === " " || text[i] === "\t" || text[i] === "\n" || text[i] === "\r")) i++;
    }

    function parseValue() {
      skipWs();
      if (i >= n) fail("Unexpected end of input");
      const c = text[i];
      if (c === "{") return parseObject();
      if (c === "[") return parseArray();
      if (c === '"') return parseString();
      if (c === "-" || (c >= "0" && c <= "9")) return parseNumber();
      if (text.startsWith("true", i)) {
        i += 4;
        return true;
      }
      if (text.startsWith("false", i)) {
        i += 5;
        return false;
      }
      if (text.startsWith("null", i)) {
        i += 4;
        return null;
      }
      fail('Unexpected character "' + c + '"');
    }

    function parseObject() {
      i++; // {
      const obj = {};
      skipWs();
      if (text[i] === "}") {
        i++;
        return obj;
      }
      for (;;) {
        skipWs();
        if (text[i] !== '"') fail("Expected a property name in object");
        const key = parseString();
        skipWs();
        if (text[i] !== ":") fail('Expected ":" after property name');
        i++;
        obj[key] = parseValue();
        skipWs();
        if (text[i] === ",") {
          i++;
          continue;
        }
        if (text[i] === "}") {
          i++;
          return obj;
        }
        fail('Expected "," or "}" in object');
      }
    }

    function parseArray() {
      i++; // [
      const arr = [];
      skipWs();
      if (text[i] === "]") {
        i++;
        return arr;
      }
      for (;;) {
        arr.push(parseValue());
        skipWs();
        if (text[i] === ",") {
          i++;
          continue;
        }
        if (text[i] === "]") {
          i++;
          return arr;
        }
        fail('Expected "," or "]" in array');
      }
    }

    function parseString() {
      i++; // opening quote
      let out = "";
      for (;;) {
        if (i >= n) fail("Unterminated string");
        const c = text[i];
        if (c === '"') {
          i++;
          return out;
        }
        if (c === "\\") {
          i++;
          if (i >= n) fail("Unterminated escape sequence");
          const e = text[i];
          if (e === '"') out += '"';
          else if (e === "\\") out += "\\";
          else if (e === "/") out += "/";
          else if (e === "b") out += "\b";
          else if (e === "f") out += "\f";
          else if (e === "n") out += "\n";
          else if (e === "r") out += "\r";
          else if (e === "t") out += "\t";
          else if (e === "u") {
            const hex = text.slice(i + 1, i + 5);
            if (!/^[0-9a-fA-F]{4}$/.test(hex)) fail("Invalid unicode escape");
            out += String.fromCharCode(parseInt(hex, 16));
            i += 4;
          } else fail('Invalid escape character "' + e + '"');
          i++;
        } else if (c === "\n") {
          fail("Unescaped newline inside string");
        } else {
          out += c;
        }
        i++;
      }
    }

    function parseNumber() {
      const start = i;
      if (text[i] === "-") i++;
      if (!(text[i] >= "0" && text[i] <= "9")) fail("Invalid number");
      while (i < n && text[i] >= "0" && text[i] <= "9") i++;
      if (text[i] === ".") {
        i++;
        if (!(text[i] >= "0" && text[i] <= "9")) fail("Invalid number: expected a digit after the decimal point");
        while (i < n && text[i] >= "0" && text[i] <= "9") i++;
      }
      if (text[i] === "e" || text[i] === "E") {
        i++;
        if (text[i] === "+" || text[i] === "-") i++;
        if (!(text[i] >= "0" && text[i] <= "9")) fail("Invalid number: expected a digit in the exponent");
        while (i < n && text[i] >= "0" && text[i] <= "9") i++;
      }
      return Number(text.slice(start, i));
    }

    const value = parseValue();
    skipWs();
    if (i < n) fail("Unexpected content after the JSON value");
    return value;
  }

  // ---------- Formatting ----------

  function indentValue() {
    const v = indentSel.value;
    return v === "tab" ? "\t" : parseInt(v, 10);
  }

  function sortedReplacer() {
    return function (key, value) {
      if (value && typeof value === "object" && !Array.isArray(value)) {
        const sorted = {};
        for (const k of Object.keys(value).sort()) sorted[k] = value[k];
        return sorted;
      }
      return value;
    };
  }

  function formatText(text) {
    const value = parseJsonWithPosition(text);
    const replacer = getOptions().sortKeys ? sortedReplacer() : undefined;
    if (mode === "minify") return JSON.stringify(value, replacer);
    return JSON.stringify(value, replacer, indentValue());
  }

  // ---------- Stats ----------

  function countKeys(v) {
    let n = 0;
    if (v && typeof v === "object") {
      if (Array.isArray(v)) {
        v.forEach((x) => (n += countKeys(x)));
      } else {
        for (const k of Object.keys(v)) {
          n++;
          n += countKeys(v[k]);
        }
      }
    }
    return n;
  }

  function maxDepth(v, d) {
    if (v && typeof v === "object") {
      let m = d;
      const kids = Array.isArray(v) ? v : Object.values(v);
      kids.forEach((x) => (m = Math.max(m, maxDepth(x, d + 1))));
      return m;
    }
    return d;
  }

  function byteSize(text) {
    return new TextEncoder().encode(text).length;
  }

  function updateStats(value, text) {
    const parts = [
      byteSize(text) + " bytes",
      countKeys(value) + " keys",
      "depth " + maxDepth(value, 1)
    ];
    statsEl.textContent = parts.join("  ·  ");
  }

  // ---------- Syntax highlighting ----------

  function escapeHtml(s) {
    return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  }

  function highlight(json) {
    const s = escapeHtml(json);
    return s.replace(
      /("(?:\\u[0-9a-fA-F]{4}|\\[^u]|[^\\"])*"(?:\s*:)?|\b(?:true|false)\b|\bnull\b|-?\d+(?:\.\d+)?(?:[eE][+-]?\d+)?)/g,
      (m) => {
        let cls = "jf-num";
        if (m.startsWith('"')) cls = /:\s*$/.test(m) ? "jf-key" : "jf-str";
        else if (m === "true" || m === "false") cls = "jf-bool";
        else if (m === "null") cls = "jf-null";
        return '<span class="' + cls + '">' + m + "</span>";
      }
    );
  }

  // ---------- Render ----------

  function renderInputMeta() {
    const text = input.value;
    if (!text.trim()) {
      inputMeta.textContent = "";
      return;
    }
    const lines = text.split("\n").length;
    inputMeta.textContent = text.length + " chars · " + lines + " lines";
  }

  function render() {
    renderInputMeta();
    const text = input.value;
    if (!text.trim()) {
      output.innerHTML = "<code></code>";
      outputMeta.textContent = "";
      statsEl.textContent = "";
      setBaseStatus("", false);
      return;
    }
    try {
      const value = parseJsonWithPosition(text);
      const out = formatText(text);
      output.innerHTML = "<code>" + highlight(out) + "</code>";
      outputMeta.textContent = byteSize(out) + " bytes";
      updateStats(value, out);
      setBaseStatus("Valid JSON ✓", false);
    } catch (err) {
      output.innerHTML = '<code class="jf-error-text">' + escapeHtml(err.message) + "</code>";
      outputMeta.textContent = "";
      statsEl.textContent = "";
      setBaseStatus("Invalid JSON: " + err.message, true);
    }
  }

  let renderTimer = null;
  function scheduleRender() {
    clearTimeout(renderTimer);
    renderTimer = setTimeout(render, 250);
  }

  // ---------- Actions ----------

  document.getElementById("jfFormat").addEventListener("click", () => {
    mode = "format";
    render();
    flash("Formatted.");
  });

  document.getElementById("jfMinify").addEventListener("click", () => {
    mode = "minify";
    render();
    flash("Minified.");
  });

  document.getElementById("jfCopy").addEventListener("click", async () => {
    const code = output.querySelector("code");
    const text = code ? code.textContent : "";
    if (!text || (code && code.classList.contains("jf-error-text"))) {
      flash("Nothing valid to copy yet.", true);
      return;
    }
    try {
      await navigator.clipboard.writeText(text);
      flash("Copied to clipboard.");
    } catch {
      flash("Copy failed — select the output and copy manually.", true);
    }
  });

  document.getElementById("jfDownload").addEventListener("click", () => {
    const code = output.querySelector("code");
    const text = code ? code.textContent : "";
    if (!text || code.classList.contains("jf-error-text")) {
      flash("Nothing valid to download yet.", true);
      return;
    }
    const blob = new Blob([text], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "formatted.json";
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    flash("Downloaded formatted.json");
  });

  document.getElementById("jfExport").addEventListener("click", () => {
    const payload = {
      app: "hchq-json-formatter",
      version: EXPORT_VERSION,
      exportedAt: new Date().toISOString(),
      input: input.value,
      options: getOptions()
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "json-formatter-export.json";
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    flash("Exported as JSON.");
  });

  document.getElementById("jfImport").addEventListener("click", () => importFile.click());

  importFile.addEventListener("change", () => {
    const file = importFile.files && importFile.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const text = String(reader.result || "");
      try {
        const parsed = JSON.parse(text);
        if (parsed && typeof parsed === "object" && parsed.app === "hchq-json-formatter") {
          input.value = typeof parsed.input === "string" ? parsed.input : "";
          if (parsed.options) {
            if (parsed.options.indent) indentSel.value = parsed.options.indent;
            sortChk.checked = !!parsed.options.sortKeys;
          }
          flash("Imported saved document.");
        } else {
          // A plain JSON document — use it as the input.
          input.value = text;
          flash("Imported JSON document.");
        }
      } catch {
        flash("That file isn't valid JSON.", true);
        importFile.value = "";
        return;
      }
      render();
      scheduleSave();
      importFile.value = "";
    };
    reader.onerror = () => flash("Could not read that file.", true);
    reader.readAsText(file);
  });

  document.getElementById("jfClear").addEventListener("click", () => {
    if (!input.value.trim()) {
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

  indentSel.addEventListener("change", () => {
    render();
    scheduleSave();
  });

  sortChk.addEventListener("change", () => {
    render();
    scheduleSave();
  });

  // ---------- Init ----------

  const state = loadState();
  input.value = state.input;
  if (state.options.indent) indentSel.value = state.options.indent;
  sortChk.checked = state.options.sortKeys;
  render();
})();
