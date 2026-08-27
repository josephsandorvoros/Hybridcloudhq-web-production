/* Markdown Live Preview — self-contained tool.
   No shared bundles: its own storage, renderer, and helpers. */
(function () {
  "use strict";

  const STORAGE_KEY = "hchq-markdown-preview";
  const EXPORT_VERSION = 1;

  const editor = document.getElementById("mdpEditor");
  const preview = document.getElementById("mdpPreview");
  const workspace = document.getElementById("mdpWorkspace");
  const statusEl = document.getElementById("mdpStatus");
  const statsEl = document.getElementById("mdpStats");
  const importFile = document.getElementById("mdpImportFile");

  const DEFAULT_DOC = [
    "# Welcome to Markdown Live Preview",
    "",
    "Type on the left, see the result on the right. Everything is saved in your browser automatically.",
    "",
    "## Formatting",
    "",
    "You can write **bold**, *italic*, ~~strikethrough~~, and `inline code`.",
    "",
    "> Blockquotes work too — great for callouts.",
    "",
    "## Lists",
    "",
    "- Bullet one",
    "- Bullet two",
    "",
    "1. Numbered one",
    "2. Numbered two",
    "",
    "- [x] Task lists render as checkboxes",
    "- [ ] Unfinished tasks stay unchecked",
    "",
    "## Code",
    "",
    "```js",
    "function hello(name) {",
    "  console.log(`Hello, ${name}!`);",
    "}",
    "```",
    "",
    "## Tables",
    "",
    "| Column A | Column B |",
    "| -------- | -------- |",
    "| Cell 1   | Cell 2   |",
    "| Cell 3   | Cell 4   |",
    "",
    "## Links & images",
    "",
    "[Links open in a new tab](https://example.com) and images scale to fit.",
    "",
    "---",
    "",
    "Use the toolbar above, or just type raw Markdown. Export your work as JSON, `.md`, or a standalone `.html` file."
  ].join("\n");

  // ---------- Persistence ----------

  function loadDoc() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw === null) return DEFAULT_DOC;
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed.content === "string") return parsed.content;
      return raw;
    } catch {
      return DEFAULT_DOC;
    }
  }

  let saveTimer = null;
  function saveDoc() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ content: editor.value }));
      flash("Saved to this browser.");
    } catch {
      flash("Could not save — browser storage is blocked.", true);
    }
  }

  function scheduleSave() {
    clearTimeout(saveTimer);
    saveTimer = setTimeout(saveDoc, 400);
  }

  // ---------- Tiny Markdown renderer ----------
  // Supports: headings, bold/italic/strike, inline code, code fences,
  // links, images, blockquotes, ul/ol/task lists, tables, hr, paragraphs.

  function escapeHtml(s) {
    return s
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  function inline(text) {
    const codes = [];
    let s = escapeHtml(text);
    // Protect inline code spans first.
    s = s.replace(/`([^`]+)`/g, (m, c) => {
      codes.push(c);
      return "\u0000" + (codes.length - 1) + "\u0000";
    });
    s = s.replace(/!\[([^\]]*)\]\(([^)\s]+)\)/g, '<img src="$2" alt="$1" loading="lazy">');
    s = s.replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, '<a href="$2" target="_blank" rel="noopener">$1</a>');
    s = s.replace(/\*\*\*([^*]+)\*\*\*/g, "<strong><em>$1</em></strong>");
    s = s.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");
    s = s.replace(/\*([^*]+)\*/g, "<em>$1</em>");
    s = s.replace(/___([^_]+)___/g, "<strong><em>$1</em></strong>");
    s = s.replace(/__([^_]+)__/g, "<strong>$1</strong>");
    s = s.replace(/(^|\W)_([^_]+)_(?=\W|$)/g, "$1<em>$2</em>");
    s = s.replace(/~~([^~]+)~~/g, "<del>$1</del>");
    s = s.replace(/\u0000(\d+)\u0000/g, (m, n) => "<code>" + codes[+n] + "</code>");
    return s;
  }

  function isTableSeparator(line) {
    return /^\s*\|?[\s:|-]+\|?\s*$/.test(line) && line.includes("-") && line.includes("|");
  }

  function splitRow(line) {
    let s = line.trim();
    if (s.startsWith("|")) s = s.slice(1);
    if (s.endsWith("|")) s = s.slice(0, -1);
    return s.split("|").map((c) => c.trim());
  }

  function renderMarkdown(src) {
    const lines = String(src).replace(/\r\n?/g, "\n").split("\n");
    let html = "";
    let i = 0;

    while (i < lines.length) {
      const line = lines[i];

      // Fenced code block.
      if (/^```/.test(line)) {
        const lang = line.slice(3).trim();
        const buf = [];
        i++;
        while (i < lines.length && !/^```/.test(lines[i])) {
          buf.push(lines[i]);
          i++;
        }
        i++; // skip closing fence (or run past end)
        html +=
          "<pre><code" +
          (lang ? ' class="language-' + escapeHtml(lang) + '"' : "") +
          ">" +
          escapeHtml(buf.join("\n")) +
          "</code></pre>";
        continue;
      }

      // Heading.
      const h = line.match(/^(#{1,6})\s+(.*)$/);
      if (h) {
        const level = h[1].length;
        html += "<h" + level + ">" + inline(h[2]) + "</h" + level + ">";
        i++;
        continue;
      }

      // Horizontal rule.
      if (/^\s*(---+|\*\*\*+|___+)\s*$/.test(line)) {
        html += "<hr>";
        i++;
        continue;
      }

      // Blockquote (collect consecutive quote lines).
      if (/^>\s?/.test(line)) {
        const buf = [];
        while (i < lines.length && /^>\s?/.test(lines[i])) {
          buf.push(lines[i].replace(/^>\s?/, ""));
          i++;
        }
        html += "<blockquote>" + renderMarkdown(buf.join("\n")) + "</blockquote>";
        continue;
      }

      // Table: header row + separator row.
      if (line.includes("|") && i + 1 < lines.length && isTableSeparator(lines[i + 1])) {
        const headers = splitRow(line);
        i += 2;
        const rows = [];
        while (i < lines.length && lines[i].includes("|") && lines[i].trim() !== "") {
          rows.push(splitRow(lines[i]));
          i++;
        }
        let t = "<table><thead><tr>";
        for (const cell of headers) t += "<th>" + inline(cell) + "</th>";
        t += "</tr></thead><tbody>";
        for (const row of rows) {
          t += "<tr>";
          for (let c = 0; c < headers.length; c++) {
            t += "<td>" + inline(row[c] || "") + "</td>";
          }
          t += "</tr>";
        }
        t += "</tbody></table>";
        html += t;
        continue;
      }

      // Lists (bullet, numbered, task).
      if (/^\s*([-*+]|\d+\.)\s+/.test(line)) {
        const ordered = /^\s*\d+\./.test(line);
        const tag = ordered ? "ol" : "ul";
        const items = [];
        while (i < lines.length && /^\s*([-*+]|\d+\.)\s+/.test(lines[i])) {
          let item = lines[i].replace(/^\s*([-*+]|\d+\.)\s+/, "");
          const task = item.match(/^\[([ xX])\]\s+(.*)$/);
          if (task) {
            const checked = task[1].toLowerCase() === "x";
            items.push(
              '<li class="mdp-task"><input type="checkbox" disabled' +
                (checked ? " checked" : "") +
                "> " +
                inline(task[2]) +
                "</li>"
            );
          } else {
            items.push("<li>" + inline(item) + "</li>");
          }
          i++;
        }
        html += "<" + tag + ">" + items.join("") + "</" + tag + ">";
        continue;
      }

      // Blank line.
      if (line.trim() === "") {
        i++;
        continue;
      }

      // Paragraph: gather consecutive plain lines.
      const buf = [line];
      i++;
      while (
        i < lines.length &&
        lines[i].trim() !== "" &&
        !/^(#{1,6})\s+/.test(lines[i]) &&
        !/^```/.test(lines[i]) &&
        !/^>\s?/.test(lines[i]) &&
        !/^\s*([-*+]|\d+\.)\s+/.test(lines[i]) &&
        !/^\s*(---+|\*\*\*+|___+)\s*$/.test(lines[i])
      ) {
        buf.push(lines[i]);
        i++;
      }
      html += "<p>" + buf.map(inline).join("<br>") + "</p>";
    }

    return html;
  }

  // ---------- Rendering & stats ----------

  function render() {
    preview.innerHTML = renderMarkdown(editor.value);
    updateStats();
  }

  function updateStats() {
    const text = editor.value;
    const words = text.trim() ? text.trim().split(/\s+/).length : 0;
    const chars = text.length;
    const lines = text ? text.split("\n").length : 0;
    const minutes = Math.max(1, Math.ceil(words / 200));
    statsEl.textContent =
      words + " words · " + chars + " characters · " + lines + " lines · ~" + minutes + " min read";
  }

  // ---------- Status line ----------

  let flashTimer = null;
  function flash(msg, isError) {
    statusEl.textContent = msg;
    statusEl.classList.toggle("is-error", !!isError);
    clearTimeout(flashTimer);
    flashTimer = setTimeout(() => {
      statusEl.textContent = "";
      statusEl.classList.remove("is-error");
    }, 4000);
  }

  // ---------- View modes ----------

  const viewButtons = {
    split: document.getElementById("mdpViewSplit"),
    editor: document.getElementById("mdpViewEditor"),
    preview: document.getElementById("mdpViewPreview")
  };

  function setView(mode) {
    workspace.className = "mdp-workspace mdp-view-" + mode;
    for (const key of Object.keys(viewButtons)) {
      viewButtons[key].classList.toggle("is-active", key === mode);
    }
  }
  viewButtons.split.addEventListener("click", () => setView("split"));
  viewButtons.editor.addEventListener("click", () => setView("editor"));
  viewButtons.preview.addEventListener("click", () => setView("preview"));

  // ---------- Formatting toolbar ----------

  function wrapSelection(before, after, placeholder) {
    const start = editor.selectionStart;
    const end = editor.selectionEnd;
    const selected = editor.value.slice(start, end) || placeholder;
    editor.setRangeText(before + selected + after, start, end, "select");
    editor.selectionStart = start + before.length;
    editor.selectionEnd = start + before.length + selected.length;
    editor.focus();
    render();
    scheduleSave();
  }

  function prefixLines(prefix) {
    const start = editor.selectionStart;
    const end = editor.selectionEnd;
    const value = editor.value;
    const lineStart = value.lastIndexOf("\n", start - 1) + 1;
    let lineEnd = value.indexOf("\n", end);
    if (lineEnd === -1) lineEnd = value.length;
    const block = value.slice(lineStart, lineEnd);
    const prefixed = block
      .split("\n")
      .map((l) => (l.startsWith(prefix) ? l : prefix + l))
      .join("\n");
    editor.setRangeText(prefixed, lineStart, lineEnd, "select");
    editor.focus();
    render();
    scheduleSave();
  }

  function insertBlock(text) {
    const start = editor.selectionStart;
    const end = editor.selectionEnd;
    editor.setRangeText(text, start, end, "end");
    editor.focus();
    render();
    scheduleSave();
  }

  const actions = {
    h2: () => prefixLines("## "),
    bold: () => wrapSelection("**", "**", "bold text"),
    italic: () => wrapSelection("*", "*", "italic text"),
    strike: () => wrapSelection("~~", "~~", "struck text"),
    code: () => wrapSelection("`", "`", "code"),
    codeblock: () => wrapSelection("```\n", "\n```", "code here"),
    link: () => wrapSelection("[", "](https://example.com)", "link text"),
    ul: () => prefixLines("- "),
    ol: () => prefixLines("1. "),
    task: () => prefixLines("- [ ] "),
    quote: () => prefixLines("> "),
    table: () =>
      insertBlock(
        "\n| Column A | Column B | Column C |\n| -------- | -------- | -------- |\n| Cell     | Cell     | Cell     |\n| Cell     | Cell     | Cell     |\n"
      )
  };

  document.querySelectorAll("[data-mdp-action]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const action = actions[btn.dataset.mdpAction];
      if (action) action();
    });
  });

  // Keyboard shortcuts: Ctrl/Cmd+B bold, Ctrl/Cmd+I italic.
  editor.addEventListener("keydown", (e) => {
    if ((e.ctrlKey || e.metaKey) && !e.shiftKey) {
      if (e.key.toLowerCase() === "b") {
        e.preventDefault();
        actions.bold();
      } else if (e.key.toLowerCase() === "i") {
        e.preventDefault();
        actions.italic();
      }
    }
  });

  // ---------- Editor events ----------

  editor.addEventListener("input", () => {
    render();
    scheduleSave();
  });

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

  function standaloneHtml() {
    return (
      "<!doctype html>\n<html lang=\"en\">\n<head>\n<meta charset=\"utf-8\">\n" +
      "<meta name=\"viewport\" content=\"width=device-width, initial-scale=1\">\n" +
      "<title>Markdown document</title>\n<style>\n" +
      "body{font-family:system-ui,-apple-system,Segoe UI,Roboto,sans-serif;max-width:760px;margin:2rem auto;padding:0 1rem;line-height:1.6;color:#1f2328}\n" +
      "pre{background:#f6f8fa;padding:.8rem;border-radius:6px;overflow-x:auto}\n" +
      "code{background:#f6f8fa;padding:.1rem .3rem;border-radius:4px}\npre code{background:none;padding:0}\n" +
      "table{border-collapse:collapse;width:100%}\nth,td{border:1px solid #d0d7de;padding:.4rem .6rem;text-align:left}\n" +
      "blockquote{border-left:4px solid #d0d7de;margin:0;padding:.2rem 1rem;color:#57606a}\n" +
      "img{max-width:100%}\nhr{border:none;border-top:1px solid #d0d7de}\n" +
      "</style>\n</head>\n<body>\n" + preview.innerHTML + "\n</body>\n</html>\n"
    );
  }

  document.getElementById("mdpCopyHtml").addEventListener("click", async () => {
    try {
      await navigator.clipboard.writeText(preview.innerHTML);
      flash("Rendered HTML copied to clipboard.");
    } catch {
      flash("Could not copy — clipboard access was blocked.", true);
    }
  });

  document.getElementById("mdpDownloadMd").addEventListener("click", () => {
    downloadBlob(
      new Blob([editor.value], { type: "text/markdown" }),
      "document-" + new Date().toISOString().slice(0, 10) + ".md"
    );
    flash("Markdown file downloaded.");
  });

  document.getElementById("mdpDownloadHtml").addEventListener("click", () => {
    downloadBlob(
      new Blob([standaloneHtml()], { type: "text/html" }),
      "document-" + new Date().toISOString().slice(0, 10) + ".html"
    );
    flash("Standalone HTML file downloaded.");
  });

  document.getElementById("mdpExport").addEventListener("click", () => {
    const payload = {
      app: "hchq-markdown-preview",
      version: EXPORT_VERSION,
      exportedAt: new Date().toISOString(),
      content: editor.value
    };
    downloadBlob(
      new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" }),
      "markdown-doc-" + new Date().toISOString().slice(0, 10) + ".json"
    );
    flash("Document exported as JSON.");
  });

  document.getElementById("mdpImport").addEventListener("click", () => {
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
        let content;
        try {
          const parsed = JSON.parse(text);
          if (parsed && typeof parsed.content === "string") {
            content = parsed.content;
          } else if (typeof parsed === "string") {
            content = parsed;
          } else {
            throw new Error("bad shape");
          }
        } catch {
          // Not JSON — treat the whole file as raw Markdown.
          content = text;
        }
        editor.value = content;
        render();
        saveDoc();
        flash("Document imported.");
      } catch {
        flash("That file is not a valid Markdown export.", true);
      }
    };
    reader.readAsText(file);
  });

  document.getElementById("mdpClear").addEventListener("click", () => {
    if (!confirm("Clear the editor? This cannot be undone (export a backup first).")) return;
    editor.value = "";
    render();
    saveDoc();
  });

  // ---------- Init ----------
  editor.value = loadDoc();
  render();
})();
