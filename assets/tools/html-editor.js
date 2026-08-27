/* HTML Editor — self-contained tool.
   Three panes (HTML/CSS/JS) with a sandboxed live preview.
   No shared bundles: its own storage, preview builder, and helpers. */
(function () {
  "use strict";

  const STORAGE_KEY = "hchq-html-editor";
  const EXPORT_VERSION = 1;

  const editor = document.getElementById("heEditor");
  const lineNumbers = document.getElementById("heLineNumbers");
  const preview = document.getElementById("hePreview");
  const statusEl = document.getElementById("heStatus");
  const importFile = document.getElementById("heImportFile");

  const tabs = {
    html: document.getElementById("heTabHtml"),
    css: document.getElementById("heTabCss"),
    js: document.getElementById("heTabJs")
  };

  const STARTER = {
    html: [
      "<!-- Edit the HTML, CSS, and JS panes — the preview updates live. -->",
      "<main class=\"card\">",
      "  <h1>Hello, world!</h1>",
      "  <p>Change the code on the left and watch this preview rebuild.</p>",
      "  <button id=\"btn\">Click me</button>",
      "  <p id=\"count\">Clicked 0 times</p>",
      "</main>"
    ].join("\n"),
    css: [
      "body {",
      "  font-family: system-ui, sans-serif;",
      "  background: #f4f5f7;",
      "  display: grid;",
      "  place-items: center;",
      "  min-height: 100vh;",
      "  margin: 0;",
      "}",
      "",
      ".card {",
      "  background: #fff;",
      "  border-radius: 12px;",
      "  padding: 2rem;",
      "  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.12);",
      "  text-align: center;",
      "}",
      "",
      "button {",
      "  background: #7c3aed;",
      "  color: #fff;",
      "  border: none;",
      "  border-radius: 8px;",
      "  padding: 0.5rem 1rem;",
      "  font-size: 1rem;",
      "  cursor: pointer;",
      "}",
      "",
      "button:hover {",
      "  background: #6d28d9;",
      "}"
    ].join("\n"),
    js: [
      "let clicks = 0;",
      "const btn = document.getElementById('btn');",
      "const count = document.getElementById('count');",
      "",
      "btn.addEventListener('click', () => {",
      "  clicks += 1;",
      "  count.textContent = 'Clicked ' + clicks + ' time' + (clicks === 1 ? '' : 's');",
      "});"
    ].join("\n")
  };

  // ---------- State & persistence ----------

  let code = { html: "", css: "", js: "" };
  let activePane = "html";

  function loadProject() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw === null) return { ...STARTER };
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === "object") {
        return {
          html: typeof parsed.html === "string" ? parsed.html : STARTER.html,
          css: typeof parsed.css === "string" ? parsed.css : STARTER.css,
          js: typeof parsed.js === "string" ? parsed.js : STARTER.js
        };
      }
      return { ...STARTER };
    } catch {
      return { ...STARTER };
    }
  }

  let saveTimer = null;
  function saveProject() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(code));
      flash("Saved to this browser.");
    } catch {
      flash("Could not save — browser storage is blocked.", true);
    }
  }

  function scheduleSave() {
    clearTimeout(saveTimer);
    saveTimer = setTimeout(saveProject, 400);
  }

  // ---------- Status line ----------

  let flashTimer = null;
  function flash(msg, isError) {
    // An active error message is never overwritten by a routine message
    // (e.g. "Saved to this browser.") — it stays until it times out.
    if (!isError && statusEl.classList.contains("is-error")) return;
    statusEl.textContent = msg;
    statusEl.classList.toggle("is-error", !!isError);
    clearTimeout(flashTimer);
    flashTimer = setTimeout(() => {
      statusEl.textContent = "";
      statusEl.classList.remove("is-error");
    }, isError ? 8000 : 5000);
  }

  // ---------- Preview ----------
  // The preview document is rebuilt into a sandboxed iframe (allow-scripts
  // only, no same-origin), so user code cannot touch this site. A small
  // injected script forwards console errors back via postMessage.

  const BRIDGE_SCRIPT =
    "<script>(function(){" +
    "function send(t,p){try{parent.postMessage({source:'he-preview',type:t,payload:p},'*');}catch(e){}}" +
    "window.addEventListener('error',function(e){send('error',e.message+' (line '+(e.lineno||'?')+')');});" +
    "window.addEventListener('unhandledrejection',function(e){send('error','Unhandled promise: '+((e.reason&&e.reason.message)||e.reason));});" +
    "var oe=console.error;console.error=function(){send('error',Array.prototype.slice.call(arguments).join(' '));oe.apply(console,arguments);};" +
    "})();</" + "script>";

  function buildDocument() {
    return (
      "<!doctype html>\n<html>\n<head>\n<meta charset=\"utf-8\">\n" +
      "<meta name=\"viewport\" content=\"width=device-width, initial-scale=1\">\n" +
      "<style>" +
      code.css +
      "</style>\n</head>\n<body>\n" +
      code.html +
      "\n" +
      BRIDGE_SCRIPT +
      "\n<script>\n" +
      code.js +
      "\n</" + "script>\n</body>\n</html>\n"
    );
  }

  let previewTimer = null;
  function schedulePreview() {
    clearTimeout(previewTimer);
    previewTimer = setTimeout(updatePreview, 250);
  }

  function updatePreview() {
    preview.srcdoc = buildDocument();
  }

  window.addEventListener("message", (e) => {
    const data = e.data;
    if (!data || data.source !== "he-preview") return;
    if (data.type === "error") {
      flash("Preview error: " + data.payload, true);
    }
  });

  // ---------- Editor panes ----------

  function showPane(pane) {
    activePane = pane;
    for (const key of Object.keys(tabs)) {
      tabs[key].classList.toggle("is-active", key === pane);
    }
    editor.value = code[pane];
    updateLineNumbers();
    editor.focus();
  }

  tabs.html.addEventListener("click", () => showPane("html"));
  tabs.css.addEventListener("click", () => showPane("css"));
  tabs.js.addEventListener("click", () => showPane("js"));

  editor.addEventListener("input", () => {
    code[activePane] = editor.value;
    updateLineNumbers();
    schedulePreview();
    scheduleSave();
  });

  // Tab key inserts two spaces instead of moving focus.
  editor.addEventListener("keydown", (e) => {
    if (e.key === "Tab") {
      e.preventDefault();
      const start = editor.selectionStart;
      const end = editor.selectionEnd;
      editor.setRangeText("  ", start, end, "end");
      code[activePane] = editor.value;
      updateLineNumbers();
      schedulePreview();
      scheduleSave();
    }
  });

  // ---------- Line numbers ----------

  function updateLineNumbers() {
    const lines = editor.value.split("\n").length;
    let out = "";
    for (let i = 1; i <= lines; i++) out += i + "\n";
    lineNumbers.textContent = out;
    syncScroll();
  }

  function syncScroll() {
    lineNumbers.scrollTop = editor.scrollTop;
  }

  editor.addEventListener("scroll", syncScroll);

  // ---------- Export / import / download ----------

  function downloadBlob(blob, filename) {
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = filename;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    URL.revokeObjectURL(url);
  }

  document.getElementById("heCopyHtml").addEventListener("click", async () => {
    try {
      await navigator.clipboard.writeText(code.html);
      flash("HTML copied to clipboard.");
    } catch {
      flash("Could not copy — clipboard access was blocked.", true);
    }
  });

  document.getElementById("heDownload").addEventListener("click", () => {
    downloadBlob(
      new Blob([buildDocument()], { type: "text/html" }),
      "page-" + new Date().toISOString().slice(0, 10) + ".html"
    );
    flash("Standalone HTML file downloaded.");
  });

  document.getElementById("heExport").addEventListener("click", () => {
    const payload = {
      app: "hchq-html-editor",
      version: EXPORT_VERSION,
      exportedAt: new Date().toISOString(),
      html: code.html,
      css: code.css,
      js: code.js
    };
    downloadBlob(
      new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" }),
      "html-project-" + new Date().toISOString().slice(0, 10) + ".json"
    );
    flash("Project exported as JSON.");
  });

  document.getElementById("heImport").addEventListener("click", () => {
    importFile.value = "";
    importFile.click();
  });

  importFile.addEventListener("change", (e) => {
    const file = e.target.files && e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const text = String(reader.result || "");
        let parsed = null;
        try {
          parsed = JSON.parse(text);
        } catch {
          parsed = null;
        }
        if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
          code = {
            html: typeof parsed.html === "string" ? parsed.html : "",
            css: typeof parsed.css === "string" ? parsed.css : "",
            js: typeof parsed.js === "string" ? parsed.js : ""
          };
        } else if (typeof parsed === "string") {
          code = { html: parsed, css: "", js: "" };
        } else {
          // Not JSON — treat the whole file as an HTML document.
          code = { html: text, css: "", js: "" };
        }
        showPane("html");
        updatePreview();
        saveProject();
        flash("Project imported.");
      } catch {
        flash("That file is not a valid HTML project export.", true);
      }
    };
    reader.readAsText(file);
  });

  document.getElementById("heReset").addEventListener("click", () => {
    if (!confirm("Reset the editor to the starter template? This cannot be undone (export a backup first).")) return;
    code = { ...STARTER };
    showPane("html");
    updatePreview();
    saveProject();
  });

  // ---------- Init ----------
  code = loadProject();
  showPane("html");
  updatePreview();
})();
