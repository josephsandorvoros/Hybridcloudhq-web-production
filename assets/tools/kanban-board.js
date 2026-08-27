(() => {
  // Kanban Board — self-contained. No shared tool code.
  // Board structure lives in localStorage; attachment blobs live in IndexedDB.
  const STORAGE_KEY = "hchq-kanban-board";
  const MEDIA_DB_NAME = "hchq-kanban-media";
  const EXPORT_VERSION = 2;

  const boardEl = document.getElementById("kanbanBoard");
  const statusEl = document.getElementById("kanbanStatus");
  const addColumnBtn = document.getElementById("kanbanAddColumn");
  const teamBtn = document.getElementById("kanbanTeam");
  const fieldsBtn = document.getElementById("kanbanFields");
  const exportBtn = document.getElementById("kanbanExport");
  const importBtn = document.getElementById("kanbanImport");
  const importFile = document.getElementById("kanbanImportFile");
  const clearBtn = document.getElementById("kanbanClear");

  if (!boardEl) return;

  // ---------- Small utilities ----------

  function uid() {
    return "id-" + Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
  }

  function el(tag, className, text) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined) node.textContent = text;
    return node;
  }

  function todayStr() {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  }

  function formatBytes(n) {
    if (!Number.isFinite(n) || n < 0) return "";
    if (n < 1024) return n + " B";
    if (n < 1024 * 1024) return (n / 1024).toFixed(1) + " KB";
    return (n / (1024 * 1024)).toFixed(1) + " MB";
  }

  function avatarColor(name) {
    const palette = ["#7c3aed", "#ff6bb5", "#06b6d4", "#22c55e", "#f59e0b", "#ef4444", "#3b82f6", "#a855f7"];
    let hash = 0;
    for (let i = 0; i < name.length; i++) hash = (hash * 31 + name.charCodeAt(i)) >>> 0;
    return palette[hash % palette.length];
  }

  function initials(name) {
    return (
      name
        .split(/\s+/)
        .filter(Boolean)
        .slice(0, 2)
        .map((w) => w[0].toUpperCase())
        .join("") || "?"
    );
  }

  function flash(message, isError) {
    statusEl.textContent = message;
    statusEl.classList.toggle("is-error", Boolean(isError));
    if (message) {
      clearTimeout(flash._t);
      flash._t = setTimeout(() => {
        statusEl.textContent = "";
        statusEl.classList.remove("is-error");
      }, 4000);
    }
  }

  // ---------- IndexedDB media store (attachment blobs) ----------

  const mediaStore = {
    db: null,
    open() {
      return new Promise((resolve, reject) => {
        if (!("indexedDB" in window)) {
          reject(new Error("IndexedDB unavailable"));
          return;
        }
        const req = indexedDB.open(MEDIA_DB_NAME, 1);
        req.onupgradeneeded = () => {
          const db = req.result;
          if (!db.objectStoreNames.contains("files")) db.createObjectStore("files");
        };
        req.onsuccess = () => {
          this.db = req.result;
          resolve(this.db);
        };
        req.onerror = () => reject(req.error);
      });
    },
    put(id, blob) {
      return this.open().then(
        (db) =>
          new Promise((resolve, reject) => {
            const tx = db.transaction("files", "readwrite");
            tx.objectStore("files").put(blob, id);
            tx.oncomplete = () => resolve();
            tx.onerror = () => reject(tx.error);
          })
      );
    },
    get(id) {
      return this.open().then(
        (db) =>
          new Promise((resolve, reject) => {
            const req = db.transaction("files").objectStore("files").get(id);
            req.onsuccess = () => resolve(req.result || null);
            req.onerror = () => reject(req.error);
          })
      );
    },
    remove(id) {
      return this.open().then(
        (db) =>
          new Promise((resolve, reject) => {
            const tx = db.transaction("files", "readwrite");
            tx.objectStore("files").delete(id);
            tx.oncomplete = () => resolve();
            tx.onerror = () => reject(tx.error);
          })
      );
    },
    clear() {
      return this.open().then(
        (db) =>
          new Promise((resolve, reject) => {
            const tx = db.transaction("files", "readwrite");
            tx.objectStore("files").clear();
            tx.oncomplete = () => resolve();
            tx.onerror = () => reject(tx.error);
          })
      );
    }
  };

  function blobToDataUrl(blob) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = () => reject(reader.error);
      reader.readAsDataURL(blob);
    });
  }

  function dataUrlToBlob(dataUrl) {
    const comma = dataUrl.indexOf(",");
    const head = dataUrl.slice(0, comma);
    const b64 = dataUrl.slice(comma + 1);
    const mime = /data:(.*?)(;|$)/.exec(head);
    const bin = atob(b64);
    const bytes = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
    return new Blob([bytes], { type: mime ? mime[1] : "application/octet-stream" });
  }

  // ---------- Board state ----------

  function defaultBoard() {
    return {
      columns: [
        { id: uid(), title: "To Do", cards: [] },
        { id: uid(), title: "In Progress", cards: [] },
        { id: uid(), title: "Done", cards: [] }
      ],
      team: [],
      fields: []
    };
  }

  function normalizeCard(c) {
    return {
      id: typeof c.id === "string" ? c.id : uid(),
      title: typeof c.title === "string" ? c.title : "",
      description: typeof c.description === "string" ? c.description : "",
      assignees: Array.isArray(c.assignees) ? c.assignees.filter((x) => typeof x === "string") : [],
      tags: Array.isArray(c.tags) ? c.tags.filter((x) => typeof x === "string") : [],
      startDate: typeof c.startDate === "string" ? c.startDate : "",
      dueDate: typeof c.dueDate === "string" ? c.dueDate : "",
      attachments: Array.isArray(c.attachments)
        ? c.attachments.filter((a) => a && typeof a.id === "string")
        : [],
      links: Array.isArray(c.links) ? c.links.filter((x) => typeof x === "string") : [],
      custom: c.custom && typeof c.custom === "object" ? c.custom : {}
    };
  }

  function loadBoard() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return defaultBoard();
      const parsed = JSON.parse(raw);
      if (!parsed || !Array.isArray(parsed.columns)) return defaultBoard();
      // Shape repair so older exports (v1) and partial files still load.
      return {
        columns: parsed.columns.map((col) => ({
          id: typeof col.id === "string" ? col.id : uid(),
          title: typeof col.title === "string" ? col.title : "Untitled",
          cards: Array.isArray(col.cards) ? col.cards.map(normalizeCard) : []
        })),
        team: Array.isArray(parsed.team) ? parsed.team.filter((x) => typeof x === "string") : [],
        fields: Array.isArray(parsed.fields)
          ? parsed.fields.filter((f) => f && typeof f.name === "string")
          : []
      };
    } catch {
      return defaultBoard();
    }
  }

  function saveBoard() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(board));
      flash("Saved to this browser.");
    } catch {
      flash("Could not save — browser storage may be full or blocked.", true);
    }
  }

  let board = loadBoard();
  let dragCardId = null;

  // ---------- Lookups ----------

  function findCard(cardId) {
    for (const col of board.columns) {
      const card = col.cards.find((c) => c.id === cardId);
      if (card) return { card, column: col };
    }
    return null;
  }

  function lastColumnId() {
    return board.columns.length ? board.columns[board.columns.length - 1].id : null;
  }

  function isCardDone(cardId) {
    const found = findCard(cardId);
    return Boolean(found && found.column.id === lastColumnId());
  }

  // Linked tasks that are not in the final column = potential bottlenecks.
  function openLinksFor(card) {
    return (card.links || []).filter((id) => id !== card.id && !isCardDone(id));
  }

  // ---------- Rendering ----------

  function render() {
    boardEl.innerHTML = "";
    // Inner row is centered and sized to its columns (see CSS), so the board
    // grows outward from the center as columns are added.
    const inner = el("div", "kanban-board-inner");
    for (const column of board.columns) {
      inner.appendChild(renderColumn(column));
    }
    boardEl.appendChild(inner);
  }

  function renderColumn(column) {
    const colEl = el("section", "kanban-column");
    colEl.dataset.columnId = column.id;

    // Header: editable title, card count, delete column.
    const header = el("div", "kanban-column-header");

    const titleInput = el("input", "kanban-column-title");
    titleInput.type = "text";
    titleInput.value = column.title;
    titleInput.setAttribute("aria-label", "Column name");
    titleInput.addEventListener("change", () => {
      column.title = titleInput.value.trim() || "Untitled";
      saveBoard();
      render();
    });

    const count = el("span", "kanban-column-count", String(column.cards.length));

    const deleteCol = el("button", "kanban-column-delete", "×");
    deleteCol.type = "button";
    deleteCol.title = "Delete column and its cards";
    deleteCol.setAttribute("aria-label", "Delete column " + column.title);
    deleteCol.addEventListener("click", () => {
      if (!confirm(`Delete column "${column.title}" and its ${column.cards.length} card(s)?`)) return;
      board.columns = board.columns.filter((c) => c.id !== column.id);
      saveBoard();
      render();
    });

    header.append(titleInput, count, deleteCol);

    // Card list (drop target).
    const listEl = el("div", "kanban-cards");
    listEl.dataset.columnId = column.id;

    if (column.cards.length === 0) {
      listEl.appendChild(el("p", "kanban-empty", "No cards yet"));
    }

    for (const card of column.cards) {
      listEl.appendChild(renderCard(column, card));
    }

    attachDropHandlers(listEl, column);

    // Collapsible add-card form.
    const addWrap = el("div", "kanban-add-card");
    const addToggle = el("button", "kanban-add-toggle", "+ Add card");
    addToggle.type = "button";

    const addForm = el("div", "kanban-add-form");
    const titleField = el("input");
    titleField.type = "text";
    titleField.placeholder = "Card title";
    titleField.setAttribute("aria-label", "New card title in " + column.title);
    const addRow = el("div", "kanban-add-row");
    const addBtn = el("button", "btn primary", "Add card");
    addBtn.type = "button";
    const cancelBtn = el("button", "btn ghost", "Cancel");
    cancelBtn.type = "button";
    addRow.append(addBtn, cancelBtn);
    addForm.append(titleField, addRow);
    addWrap.append(addToggle, addForm);

    addToggle.addEventListener("click", () => {
      addWrap.classList.add("is-open");
      titleField.focus();
    });
    cancelBtn.addEventListener("click", () => {
      addWrap.classList.remove("is-open");
      titleField.value = "";
    });

    const submitCard = () => {
      const title = titleField.value.trim();
      if (!title) {
        titleField.focus();
        return;
      }
      column.cards.push(normalizeCard({ id: uid(), title }));
      saveBoard();
      render();
    };

    addBtn.addEventListener("click", submitCard);
    titleField.addEventListener("keydown", (e) => {
      if (e.key === "Enter") {
        e.preventDefault();
        submitCard();
      }
    });

    colEl.append(header, listEl, addWrap);
    return colEl;
  }

  function renderCard(column, card) {
    const cardEl = el("article", "kanban-card");
    cardEl.draggable = true;
    cardEl.dataset.cardId = card.id;
    cardEl.tabIndex = 0;
    cardEl.setAttribute("role", "button");
    cardEl.setAttribute("aria-label", "Open card " + card.title);

    const title = el("h3", "kanban-card-title", card.title);
    cardEl.appendChild(title);

    // Description preview (first line).
    if (card.description) {
      const firstLine = card.description.split("\n").find((l) => l.trim()) || "";
      cardEl.appendChild(el("p", "kanban-card-note", firstLine));
    }

    // Meta row: bottleneck badge, dates, tags, assignees.
    const meta = el("div", "kanban-card-meta");
    const openLinks = openLinksFor(card);
    if (openLinks.length) {
      const badge = el("span", "kanban-badge kanban-badge-warn", "⚠ " + openLinks.length + " open link" + (openLinks.length > 1 ? "s" : ""));
      badge.title = "Linked task(s) not in the final column: " + openLinks.map((id) => (findCard(id) || {}).card?.title || "?").join(", ");
      meta.appendChild(badge);
    }
    if (card.dueDate) {
      const overdue = card.dueDate < todayStr() && !isCardDone(card.id);
      const dateBadge = el("span", "kanban-badge" + (overdue ? " kanban-badge-overdue" : ""), "📅 " + card.dueDate);
      dateBadge.title = overdue ? "Overdue" : "Due date";
      meta.appendChild(dateBadge);
    }
    for (const tag of card.tags.slice(0, 3)) {
      meta.appendChild(el("span", "kanban-tag", tag));
    }
    if (card.tags.length > 3) {
      meta.appendChild(el("span", "kanban-tag kanban-tag-more", "+" + (card.tags.length - 3)));
    }
    if (card.attachments.length) {
      meta.appendChild(el("span", "kanban-badge", "📎 " + card.attachments.length));
    }
    if (card.assignees.length) {
      const avatars = el("span", "kanban-avatars");
      for (const name of card.assignees.slice(0, 4)) {
        const av = el("span", "kanban-avatar", initials(name));
        av.style.background = avatarColor(name);
        av.title = name;
        avatars.appendChild(av);
      }
      if (card.assignees.length > 4) {
        avatars.appendChild(el("span", "kanban-avatar kanban-avatar-more", "+" + (card.assignees.length - 4)));
      }
      meta.appendChild(avatars);
    }
    if (meta.childNodes.length) cardEl.appendChild(meta);

    // Actions: move buttons + delete. Clicking the card body opens the detail view.
    const actions = el("div", "kanban-card-actions");
    const prevCol = board.columns[board.columns.indexOf(column) - 1];
    const nextCol = board.columns[board.columns.indexOf(column) + 1];
    if (prevCol) {
      actions.appendChild(moveButton("← " + shortName(prevCol.title), () => moveCard(card.id, column.id, prevCol.id)));
    }
    if (nextCol) {
      actions.appendChild(moveButton(shortName(nextCol.title) + " →", () => moveCard(card.id, column.id, nextCol.id)));
    }
    const deleteBtn = moveButton("Delete", () => {
      if (!confirm(`Delete card "${card.title}"?`)) return;
      column.cards = column.cards.filter((c) => c.id !== card.id);
      saveBoard();
      render();
    });
    deleteBtn.classList.add("kanban-card-delete");
    actions.appendChild(deleteBtn);
    cardEl.appendChild(actions);

    // Open detail view on click (but not when using the action buttons).
    cardEl.addEventListener("click", (e) => {
      if (e.target.closest(".kanban-card-actions")) return;
      openCardDialog(card.id);
    });
    cardEl.addEventListener("keydown", (e) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        openCardDialog(card.id);
      }
    });

    // Drag events.
    cardEl.addEventListener("dragstart", (e) => {
      dragCardId = card.id;
      cardEl.classList.add("is-dragging");
      e.dataTransfer.effectAllowed = "move";
      e.dataTransfer.setData("text/plain", card.id);
    });
    cardEl.addEventListener("dragend", () => {
      dragCardId = null;
      cardEl.classList.remove("is-dragging");
      clearDropTargets();
    });

    return cardEl;
  }

  function moveButton(label, onClick) {
    const btn = el("button", null, label);
    btn.type = "button";
    btn.addEventListener("click", (e) => {
      e.stopPropagation();
      onClick();
    });
    return btn;
  }

  function shortName(name) {
    return name.length > 12 ? name.slice(0, 11) + "…" : name;
  }

  // ---------- Card detail dialog ----------

  function openCardDialog(cardId) {
    const found = findCard(cardId);
    if (!found) return;
    const { card } = found;

    const dialog = el("dialog", "kanban-dialog");
    const panel = el("div", "kanban-dialog-panel");

    // Header: title input + column select + delete.
    const head = el("div", "kanban-dialog-head");
    const titleInput = el("input", "kanban-dialog-title");
    titleInput.type = "text";
    titleInput.value = card.title;
    titleInput.setAttribute("aria-label", "Card title");
    const colSelect = el("select", "kanban-dialog-col");
    colSelect.setAttribute("aria-label", "Column");
    for (const col of board.columns) {
      const opt = el("option", null, col.title);
      opt.value = col.id;
      if (col.id === found.column.id) opt.selected = true;
      colSelect.appendChild(opt);
    }
    const deleteBtn = el("button", "btn ghost kanban-danger", "Delete card");
    deleteBtn.type = "button";
    head.append(titleInput, colSelect, deleteBtn);

    // Description.
    const descLabel = el("label", "kanban-field-label", "Description");
    const descArea = el("textarea", "kanban-dialog-desc");
    descArea.rows = 5;
    descArea.placeholder = "Add a detailed description…";
    descArea.value = card.description;

    // Dates.
    const datesRow = el("div", "kanban-dates-row");
    const startWrap = el("label", "kanban-field-label");
    startWrap.append(el("span", null, "Start date"));
    const startInput = el("input");
    startInput.type = "date";
    startInput.value = card.startDate;
    startWrap.appendChild(startInput);
    const dueWrap = el("label", "kanban-field-label");
    dueWrap.append(el("span", null, "Due date"));
    const dueInput = el("input");
    dueInput.type = "date";
    dueInput.value = card.dueDate;
    dueWrap.appendChild(dueInput);
    datesRow.append(startWrap, dueWrap);

    // Assignees (multi-select from team).
    const assignLabel = el("label", "kanban-field-label", "Assignees");
    const assignSelect = el("select", "kanban-dialog-assignees");
    assignSelect.multiple = true;
    assignSelect.size = Math.min(4, Math.max(2, board.team.length));
    if (!board.team.length) {
      assignSelect.appendChild(el("option", null, "(no team members — add some with the Team button)"));
    }
    for (const name of board.team) {
      const opt = el("option", null, name);
      opt.value = name;
      if (card.assignees.includes(name)) opt.selected = true;
      assignSelect.appendChild(opt);
    }

    // Tags (comma separated).
    const tagLabel = el("label", "kanban-field-label", "Tags (comma separated)");
    const tagInput = el("input");
    tagInput.type = "text";
    tagInput.value = card.tags.join(", ");
    tagInput.placeholder = "e.g. networking, urgent";

    // Custom fields.
    const customWrap = el("div", "kanban-custom-fields");
    for (const field of board.fields) {
      const row = el("label", "kanban-field-label");
      row.append(el("span", null, field.name));
      const input = el("input");
      input.type = "text";
      input.value = card.custom[field.name] || "";
      input.dataset.fieldName = field.name;
      row.appendChild(input);
      customWrap.appendChild(row);
    }
    if (!board.fields.length) {
      customWrap.appendChild(el("p", "kanban-muted", "No custom fields yet — define some with the Fields button."));
    }

    // Linked tasks.
    const linkLabel = el("label", "kanban-field-label", "Linked tasks");
    const linkSelect = el("select", "kanban-dialog-links");
    linkSelect.multiple = true;
    linkSelect.size = Math.min(5, Math.max(2, board.columns.reduce((n, c) => n + c.cards.length, 0)));
    for (const col of board.columns) {
      for (const other of col.cards) {
        if (other.id === card.id) continue;
        const opt = el("option", null, `[${col.title}] ${other.title}`);
        opt.value = other.id;
        if (card.links.includes(other.id)) opt.selected = true;
        linkSelect.appendChild(opt);
      }
    }

    // Attachments.
    const attachLabel = el("label", "kanban-field-label", "Attachments");
    const attachList = el("div", "kanban-attach-list");
    const attachInput = el("input");
    attachInput.type = "file";
    attachInput.multiple = true;
    attachInput.hidden = true;
    const attachBtn = el("button", "btn ghost", "+ Add files");
    attachBtn.type = "button";
    attachBtn.addEventListener("click", () => attachInput.click());
    attachInput.addEventListener("change", async () => {
      for (const file of Array.from(attachInput.files || [])) {
        const id = uid();
        try {
          await mediaStore.put(id, file);
          card.attachments.push({ id, name: file.name, type: file.type || "application/octet-stream", size: file.size });
        } catch {
          flash("Could not store attachment (browser storage blocked?).", true);
        }
      }
      attachInput.value = "";
      saveBoard();
      renderAttachList();
      render();
    });

    function renderAttachList() {
      attachList.innerHTML = "";
      if (!card.attachments.length) {
        attachList.appendChild(el("p", "kanban-muted", "No attachments."));
      }
      for (const att of card.attachments) {
        const row = el("div", "kanban-attach-row");
        const icon = att.type.startsWith("image/") ? "🖼" : att.type.startsWith("video/") ? "🎬" : "📄";
        const nameSpan = el("span", "kanban-attach-name", `${icon} ${att.name}`);
        nameSpan.title = formatBytes(att.size);
        const openBtn = el("button", "btn ghost kanban-btn-small", "Open");
        openBtn.type = "button";
        openBtn.addEventListener("click", async () => {
          try {
            const blob = await mediaStore.get(att.id);
            if (!blob) {
              flash("Attachment data not found in this browser.", true);
              return;
            }
            const url = URL.createObjectURL(blob);
            window.open(url, "_blank");
            setTimeout(() => URL.revokeObjectURL(url), 60000);
          } catch {
            flash("Could not open attachment.", true);
          }
        });
        const rmBtn = el("button", "btn ghost kanban-btn-small kanban-danger", "Remove");
        rmBtn.type = "button";
        rmBtn.addEventListener("click", () => {
          card.attachments = card.attachments.filter((a) => a.id !== att.id);
          mediaStore.remove(att.id).catch(() => {});
          saveBoard();
          renderAttachList();
          render();
        });
        row.append(nameSpan, openBtn, rmBtn);
        attachList.appendChild(row);
      }
    }
    renderAttachList();

    // Footer: save / cancel.
    const footer = el("div", "kanban-dialog-footer");
    const saveBtn = el("button", "btn primary", "Save card");
    saveBtn.type = "button";
    const cancelBtn = el("button", "btn ghost", "Cancel");
    cancelBtn.type = "button";
    footer.append(saveBtn, cancelBtn);

    panel.append(
      head,
      descLabel,
      descArea,
      datesRow,
      assignLabel,
      assignSelect,
      tagLabel,
      tagInput,
      customWrap,
      linkLabel,
      linkSelect,
      attachLabel,
      attachBtn,
      attachList,
      footer
    );
    dialog.appendChild(panel);
    document.body.appendChild(dialog);
    dialog.showModal();

    const closeDialog = () => dialog.close();
    dialog.addEventListener("close", () => dialog.remove());
    cancelBtn.addEventListener("click", closeDialog);

    titleInput.addEventListener("change", () => {
      card.title = titleInput.value.trim() || card.title;
    });
    colSelect.addEventListener("change", () => {
      moveCard(card.id, found.column.id, colSelect.value);
      closeDialog();
    });
    deleteBtn.addEventListener("click", () => {
      if (!confirm(`Delete card "${card.title}"?`)) return;
      found.column.cards = found.column.cards.filter((c) => c.id !== card.id);
      saveBoard();
      render();
      closeDialog();
    });

    saveBtn.addEventListener("click", () => {
      card.title = titleInput.value.trim() || card.title;
      card.description = descArea.value;
      card.startDate = startInput.value;
      card.dueDate = dueInput.value;
      card.assignees = Array.from(assignSelect.selectedOptions).map((o) => o.value);
      card.tags = tagInput.value.split(",").map((t) => t.trim()).filter(Boolean);
      card.custom = {};
      customWrap.querySelectorAll("input[data-field-name]").forEach((input) => {
        const value = input.value.trim();
        if (value) card.custom[input.dataset.fieldName] = value;
      });
      card.links = Array.from(linkSelect.selectedOptions).map((o) => o.value);
      saveBoard();
      render();
      closeDialog();
    });
  }

  // ---------- Team & custom fields dialogs ----------

  function openListDialog({ title, itemNoun, items, onAdd, onRemove, placeholder }) {
    const dialog = el("dialog", "kanban-dialog");
    const panel = el("div", "kanban-dialog-panel");
    panel.appendChild(el("h2", "kanban-dialog-h2", title));

    const list = el("ul", "kanban-list");
    function renderList() {
      list.innerHTML = "";
      if (!items.length) list.appendChild(el("li", "kanban-muted", `No ${itemNoun} yet.`));
      for (const item of items) {
        const li = el("li", "kanban-list-item");
        li.appendChild(el("span", null, item));
        const rm = el("button", "btn ghost kanban-btn-small kanban-danger", "Remove");
        rm.type = "button";
        rm.addEventListener("click", () => {
          onRemove(item);
          renderList();
        });
        li.appendChild(rm);
        list.appendChild(li);
      }
    }
    renderList();

    const addRow = el("div", "kanban-add-row");
    const input = el("input");
    input.type = "text";
    input.placeholder = placeholder;
    const addBtn = el("button", "btn primary", "Add");
    addBtn.type = "button";
    const closeBtn = el("button", "btn ghost", "Done");
    closeBtn.type = "button";
    addRow.append(input, addBtn, closeBtn);

    const doAdd = () => {
      const value = input.value.trim();
      if (!value) return;
      if (onAdd(value)) input.value = "";
      renderList();
    };
    addBtn.addEventListener("click", doAdd);
    input.addEventListener("keydown", (e) => {
      if (e.key === "Enter") {
        e.preventDefault();
        doAdd();
      }
    });
    closeBtn.addEventListener("click", () => dialog.close());
    dialog.addEventListener("close", () => dialog.remove());

    panel.append(list, addRow);
    dialog.appendChild(panel);
    document.body.appendChild(dialog);
    dialog.showModal();
    input.focus();
  }

  function openTeamDialog() {
    openListDialog({
      title: "Team members",
      itemNoun: "team members",
      items: board.team,
      placeholder: "e.g. Joseph V.",
      onAdd: (name) => {
        if (board.team.includes(name)) {
          flash("That team member already exists.", true);
          return false;
        }
        board.team.push(name);
        saveBoard();
        return true;
      },
      onRemove: (name) => {
        board.team = board.team.filter((n) => n !== name);
        // Also drop them from any cards.
        for (const col of board.columns) {
          for (const card of col.cards) {
            card.assignees = card.assignees.filter((n) => n !== name);
          }
        }
        saveBoard();
        render();
      }
    });
  }

  function openFieldsDialog() {
    openListDialog({
      title: "Custom fields",
      itemNoun: "fields",
      items: board.fields.map((f) => f.name),
      placeholder: "e.g. Priority, Cost, Ticket #",
      onAdd: (name) => {
        if (board.fields.some((f) => f.name.toLowerCase() === name.toLowerCase())) {
          flash("That field already exists.", true);
          return false;
        }
        board.fields.push({ name });
        saveBoard();
        return true;
      },
      onRemove: (name) => {
        board.fields = board.fields.filter((f) => f.name !== name);
        for (const col of board.columns) {
          for (const card of col.cards) {
            delete card.custom[name];
          }
        }
        saveBoard();
        render();
      }
    });
  }

  // ---------- Card operations ----------

  function moveCard(cardId, fromColumnId, toColumnId) {
    if (fromColumnId === toColumnId) return;
    const from = board.columns.find((c) => c.id === fromColumnId);
    const to = board.columns.find((c) => c.id === toColumnId);
    if (!from || !to) return;
    const idx = from.cards.findIndex((c) => c.id === cardId);
    if (idx === -1) return;
    const [card] = from.cards.splice(idx, 1);
    to.cards.push(card);
    saveBoard();
    render();
  }

  // ---------- Drag & drop ----------

  function attachDropHandlers(listEl, column) {
    listEl.addEventListener("dragover", (e) => {
      if (!dragCardId) return;
      e.preventDefault();
      e.dataTransfer.dropEffect = "move";
      listEl.classList.add("is-drop-target");
    });
    listEl.addEventListener("dragleave", (e) => {
      if (!listEl.contains(e.relatedTarget)) {
        listEl.classList.remove("is-drop-target");
      }
    });
    listEl.addEventListener("drop", (e) => {
      e.preventDefault();
      listEl.classList.remove("is-drop-target");
      const cardId = dragCardId || e.dataTransfer.getData("text/plain");
      if (cardId) moveCard(cardId, findColumnOfCard(cardId), column.id);
    });
  }

  function findColumnOfCard(cardId) {
    const col = board.columns.find((c) => c.cards.some((card) => card.id === cardId));
    return col ? col.id : null;
  }

  function clearDropTargets() {
    boardEl.querySelectorAll(".is-drop-target").forEach((el) => el.classList.remove("is-drop-target"));
  }

  // ---------- Toolbar actions ----------

  addColumnBtn.addEventListener("click", () => {
    const dialog = el("dialog", "kanban-dialog");
    const panel = el("div", "kanban-dialog-panel");
    panel.appendChild(el("h2", "kanban-dialog-h2", "Add a column"));

    const input = el("input");
    input.type = "text";
    input.placeholder = "e.g. Review, Blocked";
    input.setAttribute("aria-label", "Column name");

    const row = el("div", "kanban-add-row");
    const addBtn = el("button", "btn primary", "Add column");
    addBtn.type = "button";
    const doneBtn = el("button", "btn ghost", "Done");
    doneBtn.type = "button";
    row.append(addBtn, doneBtn);

    const doAdd = () => {
      const name = input.value.trim();
      if (!name) {
        input.focus();
        return;
      }
      board.columns.push({ id: uid(), title: name, cards: [] });
      saveBoard();
      render();
      flash("Column added.");
      input.value = "";
      input.focus();
    };
    addBtn.addEventListener("click", doAdd);
    input.addEventListener("keydown", (e) => {
      if (e.key === "Enter") {
        e.preventDefault();
        doAdd();
      }
    });
    doneBtn.addEventListener("click", () => dialog.close());
    dialog.addEventListener("close", () => dialog.remove());

    panel.append(input, row);
    dialog.appendChild(panel);
    document.body.appendChild(dialog);
    dialog.showModal();
    input.focus();
  });

  teamBtn.addEventListener("click", openTeamDialog);
  fieldsBtn.addEventListener("click", openFieldsDialog);

  clearBtn.addEventListener("click", () => {
    if (!confirm("Clear the entire board? This cannot be undone (export a backup first).")) return;
    board = defaultBoard();
    saveBoard();
    mediaStore.clear().catch(() => {});
    render();
  });

  exportBtn.addEventListener("click", async () => {
    flash("Preparing export…");
    try {
      // Bundle attachment blobs as data URLs so the JSON file is portable.
      const exportBoard = JSON.parse(JSON.stringify(board));
      for (const col of exportBoard.columns) {
        for (const card of col.cards) {
          for (const att of card.attachments) {
            const blob = await mediaStore.get(att.id);
            if (blob) att.dataUrl = await blobToDataUrl(blob);
          }
        }
      }
      const payload = {
        app: "hchq-kanban-board",
        version: EXPORT_VERSION,
        exportedAt: new Date().toISOString(),
        board: exportBoard
      };
      const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = `kanban-board-${new Date().toISOString().slice(0, 10)}.json`;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      URL.revokeObjectURL(url);
      flash("Board exported as JSON (attachments included).");
    } catch {
      flash("Export failed — could not read attachment data.", true);
    }
  });

  importBtn.addEventListener("click", () => {
    importFile.value = "";
    importFile.click();
  });

  importFile.addEventListener("change", async (e) => {
    const file = e.target.files && e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async () => {
      try {
        const parsed = JSON.parse(String(reader.result || ""));
        const incoming = parsed && parsed.board ? parsed.board : parsed;
        if (!incoming || !Array.isArray(incoming.columns)) {
          throw new Error("bad shape");
        }
        const next = {
          columns: incoming.columns.map((col) => ({
            id: typeof col.id === "string" ? col.id : uid(),
            title: typeof col.title === "string" ? col.title : "Untitled",
            cards: Array.isArray(col.cards) ? col.cards.map(normalizeCard) : []
          })),
          team: Array.isArray(incoming.team) ? incoming.team.filter((x) => typeof x === "string") : [],
          fields: Array.isArray(incoming.fields)
            ? incoming.fields.filter((f) => f && typeof f.name === "string")
            : []
        };

        // Replace stored media with the imported attachments.
        await mediaStore.clear();
        for (const col of next.columns) {
          for (const card of col.cards) {
            for (const att of card.attachments) {
              if (typeof att.dataUrl === "string" && att.dataUrl.startsWith("data:")) {
                await mediaStore.put(att.id, dataUrlToBlob(att.dataUrl));
              }
              delete att.dataUrl;
            }
          }
        }

        board = next;
        saveBoard();
        render();
        flash("Board imported.");
      } catch {
        flash("That file is not a valid Kanban board JSON export.", true);
      }
    };
    reader.readAsText(file);
  });

  // ---------- Init ----------
  render();
})();
