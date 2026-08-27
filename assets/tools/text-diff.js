/* Text Diff Checker — self-contained tool.
   LCS line diff with side-by-side and inline views. No shared bundles. */
(function () {
  "use strict";

  const STORAGE_KEY = "hchq-text-diff";
  const EXPORT_VERSION = 1;
  const MAX_CELLS = 4000000; // diff DP budget (lines-left × lines-right)

  const left = document.getElementById("tdLeft");
  const right = document.getElementById("tdRight");
  const diffEl = document.getElementById("tdDiff");
  const statusEl = document.getElementById("tdStatus");
  const summaryEl = document.getElementById("tdSummary");
  const leftMeta = document.getElementById("tdLeftMeta");
  const rightMeta = document.getElementById("tdRightMeta");
  const importFile = document.getElementById("tdImportFile");
  const viewSide = document.getElementById("tdViewSide");
  const viewInline = document.getElementById("tdViewInline");

  const SAMPLE_LEFT = [
    "const config = {",
    '  theme: "dark",',
    "  autosave: true,",
    "  indent: 2,",
    '  tools: ["kanban", "markdown"],',
    "};"
  ].join("\n");

  const SAMPLE_RIGHT = [
    "const config = {",
    '  theme: "light",',
    "  autosave: true,",
    "  indent: 4,",
    '  tools: ["kanban", "markdown", "html-editor"],',
    "  wrap: false,",
    "};"
  ].join("\n");

  // ---------- State & persistence ----------

  let view = "side"; // "side" | "inline"

  function loadState() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw === null) return { left: SAMPLE_LEFT, right: SAMPLE_RIGHT, view: "side" };
      const parsed = JSON.parse(raw);
      return {
        left: typeof parsed.left === "string" ? parsed.left : SAMPLE_LEFT,
        right: typeof parsed.right === "string" ? parsed.right : SAMPLE_RIGHT,
        view: parsed.view === "inline" ? "inline" : "side"
      };
    } catch {
      return { left: SAMPLE_LEFT, right: SAMPLE_RIGHT, view: "side" };
    }
  }

  let saveTimer = null;
  function scheduleSave() {
    clearTimeout(saveTimer);
    saveTimer = setTimeout(() => {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify({ left: left.value, right: right.value, view }));
      } catch {
        /* storage blocked — ignore */
      }
    }, 400);
  }

  // ---------- Status line ----------
  // Persistent base (diff result) + transient flashes (file actions).

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

  // ---------- Diff (LCS over lines) ----------

  function splitLines(text) {
    return text.split("\n");
  }

  function diffLines(a, b) {
    const n = a.length;
    const m = b.length;
    const w = m + 1;
    const dp = new Uint32Array((n + 1) * w);
    for (let i = n - 1; i >= 0; i--) {
      for (let j = m - 1; j >= 0; j--) {
        dp[i * w + j] =
          a[i] === b[j]
            ? dp[(i + 1) * w + j + 1] + 1
            : Math.max(dp[(i + 1) * w + j], dp[i * w + j + 1]);
      }
    }
    const ops = [];
    let i = 0;
    let j = 0;
    while (i < n && j < m) {
      if (a[i] === b[j]) {
        ops.push({ type: "same", line: a[i] });
        i++;
        j++;
      } else if (dp[(i + 1) * w + j] >= dp[i * w + j + 1]) {
        ops.push({ type: "del", line: a[i] });
        i++;
      } else {
        ops.push({ type: "add", line: b[j] });
        j++;
      }
    }
    while (i < n) ops.push({ type: "del", line: a[i++] });
    while (j < m) ops.push({ type: "add", line: b[j++] });
    return ops;
  }

  // Merge a run of dels immediately followed by adds (or vice versa) into
  // "change" blocks so edits read as one unit.
  function toBlocks(ops) {
    const blocks = [];
    let i = 0;
    while (i < ops.length) {
      const op = ops[i];
      if (op.type === "same") {
        blocks.push({ type: "same", left: [op.line], right: [op.line] });
        i++;
      } else {
        // Capture a whole run of dels/adds in whatever order the LCS walk
        // emitted them, then merge into one block.
        const dels = [];
        const adds = [];
        while (i < ops.length && (ops[i].type === "del" || ops[i].type === "add")) {
          if (ops[i].type === "del") dels.push(ops[i].line);
          else adds.push(ops[i].line);
          i++;
        }
        if (dels.length === 0) {
          blocks.push({ type: "add", left: [], right: adds });
        } else if (adds.length === 0) {
          blocks.push({ type: "del", left: dels, right: [] });
        } else {
          blocks.push({ type: "change", left: dels, right: adds });
        }
      }
    }
    return blocks;
  }

  // ---------- Rendering ----------

  function escapeHtml(s) {
    return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  }

  function lineMeta(el) {
    const text = el.value;
    if (!text) {
      el === left ? (leftMeta.textContent = "") : (rightMeta.textContent = "");
      return;
    }
    const lines = text.split("\n").length;
    (el === left ? leftMeta : rightMeta).textContent = text.length + " chars · " + lines + " lines";
  }

  function renderSide(blocks) {
    let html = '<table class="td-table"><tbody>';
    let ln = 1;
    let rn = 1;
    for (const b of blocks) {
      if (b.type === "same") {
        html +=
          '<tr class="td-ctx"><td class="td-ln">' + ln++ + '</td><td class="td-cell">' +
          escapeHtml(b.left[0]) + "</td>" +
          '<td class="td-ln">' + rn++ + '</td><td class="td-cell">' +
          escapeHtml(b.right[0]) + "</td></tr>";
      } else {
        const rows = Math.max(b.left.length, b.right.length);
        for (let k = 0; k < rows; k++) {
          const hasL = k < b.left.length;
          const hasR = k < b.right.length;
          const cls = b.type === "change" ? "td-chg" : b.type === "del" ? "td-del" : "td-add";
          html += '<tr class="' + cls + '">';
          html += '<td class="td-ln">' + (hasL ? ln++ : "") + "</td>";
          html += '<td class="td-cell">' + (hasL ? escapeHtml(b.left[k]) : "") + "</td>";
          html += '<td class="td-ln">' + (hasR ? rn++ : "") + "</td>";
          html += '<td class="td-cell">' + (hasR ? escapeHtml(b.right[k]) : "") + "</td>";
          html += "</tr>";
        }
      }
    }
    html += "</tbody></table>";
    diffEl.innerHTML = html;
  }

  function renderInline(blocks) {
    let html = '<div class="td-inline">';
    for (const b of blocks) {
      if (b.type === "same") {
        html += '<div class="td-ctx"><span class="td-mark"> </span><span class="td-cell">' + escapeHtml(b.left[0]) + "</span></div>";
      } else {
        for (const line of b.left) {
          html += '<div class="td-del"><span class="td-mark">-</span><span class="td-cell">' + escapeHtml(line) + "</span></div>";
        }
        for (const line of b.right) {
          html += '<div class="td-add"><span class="td-mark">+</span><span class="td-cell">' + escapeHtml(line) + "</span></div>";
        }
      }
    }
    html += "</div>";
    diffEl.innerHTML = html;
  }

  function unifiedText(blocks) {
    const lines = ["--- original", "+++ changed"];
    for (const b of blocks) {
      if (b.type === "same") lines.push(" " + b.left[0]);
      else {
        b.left.forEach((l) => lines.push("-" + l));
        b.right.forEach((l) => lines.push("+" + l));
      }
    }
    return lines.join("\n");
  }

  function render() {
    lineMeta(left);
    lineMeta(right);
    const a = splitLines(left.value);
    const b = splitLines(right.value);

    if (a.length * b.length > MAX_CELLS) {
      diffEl.innerHTML = '<p class="td-too-large">These texts are too large to diff in the browser (over ' +
        Math.round(MAX_CELLS / 1000000) + 'M line-pairs). Try shorter inputs.</p>';
      summaryEl.textContent = "";
      setBaseStatus("Input too large to diff.", true);
      return;
    }

    const blocks = toBlocks(diffLines(a, b));
    if (view === "side") renderSide(blocks);
    else renderInline(blocks);

    let added = 0;
    let removed = 0;
    let changed = 0;
    for (const b of blocks) {
      if (b.type === "add") added += b.right.length;
      else if (b.type === "del") removed += b.left.length;
      else if (b.type === "change") {
        changed += Math.min(b.left.length, b.right.length);
        added += Math.max(0, b.right.length - b.left.length);
        removed += Math.max(0, b.left.length - b.right.length);
      }
    }
    const total = added + removed + changed;
    summaryEl.textContent =
      total === 0
        ? "No differences — both texts are identical."
        : added + " added · " + removed + " removed · " + changed + " changed";
    setBaseStatus(
      total === 0 ? "No differences found." : total + " difference" + (total === 1 ? "" : "s") + " found.",
      false
    );
  }

  let renderTimer = null;
  function scheduleRender() {
    clearTimeout(renderTimer);
    renderTimer = setTimeout(render, 250);
  }

  // ---------- Actions ----------

  function setView(v) {
    view = v;
    viewSide.classList.toggle("is-active", v === "side");
    viewInline.classList.toggle("is-active", v === "inline");
    render();
    scheduleSave();
  }

  viewSide.addEventListener("click", () => setView("side"));
  viewInline.addEventListener("click", () => setView("inline"));

  document.getElementById("tdSwap").addEventListener("click", () => {
    const t = left.value;
    left.value = right.value;
    right.value = t;
    render();
    scheduleSave();
    flash("Swapped sides.");
  });

  document.getElementById("tdCopyDiff").addEventListener("click", async () => {
    const a = splitLines(left.value);
    const b = splitLines(right.value);
    if (a.length * b.length > MAX_CELLS) {
      flash("Input too large to diff.", true);
      return;
    }
    const text = unifiedText(toBlocks(diffLines(a, b)));
    try {
      await navigator.clipboard.writeText(text);
      flash("Copied unified diff to clipboard.");
    } catch {
      flash("Copy failed — select the diff and copy manually.", true);
    }
  });

  document.getElementById("tdDownload").addEventListener("click", () => {
    const a = splitLines(left.value);
    const b = splitLines(right.value);
    if (a.length * b.length > MAX_CELLS) {
      flash("Input too large to diff.", true);
      return;
    }
    const text = unifiedText(toBlocks(diffLines(a, b)));
    const blob = new Blob([text], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const aEl = document.createElement("a");
    aEl.href = url;
    aEl.download = "diff.txt";
    document.body.appendChild(aEl);
    aEl.click();
    aEl.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    flash("Downloaded diff.txt");
  });

  document.getElementById("tdExport").addEventListener("click", () => {
    const payload = {
      app: "hchq-text-diff",
      version: EXPORT_VERSION,
      exportedAt: new Date().toISOString(),
      left: left.value,
      right: right.value,
      view
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const aEl = document.createElement("a");
    aEl.href = url;
    aEl.download = "text-diff-export.json";
    document.body.appendChild(aEl);
    aEl.click();
    aEl.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    flash("Exported as JSON.");
  });

  document.getElementById("tdImport").addEventListener("click", () => importFile.click());

  importFile.addEventListener("change", () => {
    const file = importFile.files && importFile.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const text = String(reader.result || "");
      try {
        const parsed = JSON.parse(text);
        if (parsed && typeof parsed === "object" && parsed.app === "hchq-text-diff") {
          left.value = typeof parsed.left === "string" ? parsed.left : "";
          right.value = typeof parsed.right === "string" ? parsed.right : "";
          if (parsed.view === "inline" || parsed.view === "side") view = parsed.view;
          viewSide.classList.toggle("is-active", view === "side");
          viewInline.classList.toggle("is-active", view === "inline");
          flash("Imported comparison.");
        } else {
          flash("That file isn't a text-diff export.", true);
          importFile.value = "";
          return;
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

  document.getElementById("tdClear").addEventListener("click", () => {
    if (!left.value && !right.value) {
      flash("Already empty.");
      return;
    }
    if (!window.confirm("Clear both sides? This can't be undone.")) return;
    left.value = "";
    right.value = "";
    render();
    scheduleSave();
    flash("Cleared.");
  });

  // ---------- Wiring ----------

  left.addEventListener("input", () => {
    scheduleRender();
    scheduleSave();
  });
  right.addEventListener("input", () => {
    scheduleRender();
    scheduleSave();
  });

  // ---------- Init ----------

  const state = loadState();
  left.value = state.left;
  right.value = state.right;
  view = state.view;
  viewSide.classList.toggle("is-active", view === "side");
  viewInline.classList.toggle("is-active", view === "inline");
  render();
})();
