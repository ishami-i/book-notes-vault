// scripts/ui.js
import { State } from "./state.js";
import { compileRegex, highlightMatches, escapeHtml } from "./search.js";
import { validateRecord, normalizeText } from "./validators.js";
import { loadSeed } from "./storage.js";

const el = (sel) => document.querySelector(sel);

export function initUI() {
  // --- NAVIGATION ---
  const navToggle = el("#nav-toggle");
  const mainNav = el("#main-nav");

  function openNav() {
    if (!mainNav) return;
    mainNav.removeAttribute("hidden");
    navToggle?.setAttribute("aria-expanded", "true");
    navToggle?.setAttribute("aria-label", "Close main navigation");
    const firstBtn = mainNav.querySelector("button");
    if (firstBtn) firstBtn.focus();
    document.body.style.overflow = "hidden";
  }

  function closeNav() {
    if (!mainNav) return;
    mainNav.setAttribute("hidden", "");
    navToggle?.setAttribute("aria-expanded", "false");
    navToggle?.setAttribute("aria-label", "Open main navigation");
    document.body.style.overflow = "";
    navToggle?.focus();
  }

  if (navToggle && mainNav) {
    navToggle.addEventListener("click", () => {
      const expanded = navToggle.getAttribute("aria-expanded") === "true";
      expanded ? closeNav() : openNav();
    });

    document.addEventListener("keydown", (ev) => {
      if (ev.key === "Escape" && navToggle.getAttribute("aria-expanded") === "true") closeNav();
    });

    mainNav.addEventListener("click", (ev) => {
      const btn = ev.target.closest("button");
      if (!btn) return;
      const sel = btn.dataset.nav;
      if (sel) {
        const tgt = document.querySelector(sel);
        if (tgt) tgt.scrollIntoView({ behavior: "smooth", block: "start" });
      }
      if (window.matchMedia("(max-width: 47.99rem)").matches) closeNav();
    });

    window.addEventListener("resize", () => {
      if (window.matchMedia("(min-width: 48rem)").matches) mainNav.removeAttribute("hidden");
      else mainNav.setAttribute("hidden", "");
    });

    if (window.matchMedia("(min-width: 48rem)").matches) mainNav.removeAttribute("hidden");
    else mainNav.setAttribute("hidden", "");
  }

  // --- DOM ELEMENTS ---
  const totalBooks = el("#total-books");
  const totalPages = el("#total-pages");
  const topTags = el("#top-tags");
  const readingGoal = el("#reading-goal");
  const capMsg = el("#cap-message");
  const recordsBody = el("#records-body");
  const searchInput = el("#regex-search");
  const caseIns = el("#case-ins");
  const sortBy = el("#sort-by");

  const form = el("#record-form");
  const idField = el("#record-id");
  const titleF = el("#title");
  const authorF = el("#author");
  const pagesF = el("#pages");
  const tagF = el("#tag");
  const statusF = el("#status");
  const dateF = el("#dateAdded");
  const formErrors = el("#form-errors");

  // Settings elements
  const goalInput = el("#goal");
  const unitSelect = el("#unit");
  const exportBtn = el("#export-btn");
  const importBtn = el("#import-btn");
  const importFile = el("#import-file");
  const seedBtn = el("#seed-btn");
  const clearBtn = el("#clear-btn");
  const statusEl = el("#status"); // aria status element for announcements

  // --- HELPERS ---
  const announce = (msg, polite = true) => {
    if (!statusEl) return;
    statusEl.textContent = msg;
    statusEl.setAttribute("aria-live", polite ? "polite" : "assertive");
  };

  // --- DASHBOARD ---
  function renderDashboard() {
    const pages = State.totalPages();
    const goal = Number(State.settings.goal) || 0;
    totalBooks.textContent = State.records.length;
    totalPages.textContent = pages;

    const tags = State.topTags();
    topTags.innerHTML = tags.length
      ? tags.map(t => `<li>${escapeHtml(t.tag)} (${t.count})</li>`).join("")
      : "<li>—</li>";

    const pagesRead = State.records.reduce((acc, rec) => rec.status === "done" ? acc + Number(rec.pages || 0) : acc, 0);
    readingGoal.textContent = goal > 0 ? `${pagesRead} / ${goal} pages` : `${pagesRead} pages read`;

    if (goal > 0) {
      const diff = pagesRead - goal;
      const progressEl = document.getElementById("reading-progress");
      const percent = Math.min(100, Math.round((pagesRead / goal) * 100));
      if (progressEl) progressEl.style.width = `${percent}%`;

      if (diff < 0) {
        capMsg.textContent = `Under goal — ${-diff} pages remaining.`;
        capMsg.style.color = "#065f46";
        capMsg.setAttribute("role", "status");
      } else if (diff === 0) {
        capMsg.textContent = `Goal achieved! 🎉`;
        capMsg.style.color = "#1e40af";
        capMsg.setAttribute("role", "status");
      } else {
        capMsg.textContent = `Goal exceeded by ${diff} pages.`;
        capMsg.style.color = "#991b1b";
        capMsg.setAttribute("role", "alert");
      }
    } else {
      capMsg.textContent = "";
      const progressEl = document.getElementById("reading-progress");
      if (progressEl) progressEl.style.width = "0%";
    }
  }

  // --- RECORDS ---
  function getSortedFilteredRecords() {
    let out = [...State.records];
    const q = searchInput.value.trim();
    const re = q ? compileRegex(q, caseIns.checked ? "i" : "") : null;

    if (q && !re) announce("Invalid regex — search ignored.", false);
    else if (re) out = out.filter(r => re.test(`${r.title} ${r.author} ${r.tag}`));

    const sorts = {
      date_desc: (a, b) => new Date(b.dateAdded) - new Date(a.dateAdded),
      date_asc: (a, b) => new Date(a.dateAdded) - new Date(b.dateAdded),
      title_asc: (a, b) => a.title.localeCompare(b.title),
      title_desc: (a, b) => b.title.localeCompare(a.title),
      pages_asc: (a, b) => (Number(a.pages) || 0) - (Number(b.pages) || 0),
      pages_desc: (a, b) => (Number(b.pages) || 0) - (Number(a.pages) || 0)
    };

    out.sort(sorts[sortBy.value] || sorts.date_desc);
    return { out, re };
  }

  function renderRecords() {
    const { out, re } = getSortedFilteredRecords();
    if (!out.length) {
      recordsBody.innerHTML = `<tr><td colspan="7" class="empty">No records found.</td></tr>`;
      return;
    }

    recordsBody.innerHTML = out.map(r => {
      const highlight = (txt) => re ? highlightMatches(txt || "", re) : escapeHtml(txt || "");
      return `<tr data-id="${escapeHtml(r.id)}">
        <td>${highlight(r.title)}</td>
        <td>${highlight(r.author)}</td>
        <td>${escapeHtml(String(r.pages || 0))}</td>
        <td>${highlight(r.tag)}</td>
        <td><span class="status-${escapeHtml(r.status || 'unread')}">${escapeHtml(r.status || 'unread')}</span></td>
        <td>${escapeHtml(r.dateAdded)}</td>
        <td>
          <button class="edit" data-id="${escapeHtml(r.id)}">Edit</button>
          <button class="del" data-id="${escapeHtml(r.id)}">Delete</button>
        </td>
      </tr>`;
    }).join("");

    recordsBody.onclick = (e) => {
      const btn = e.target.closest("button");
      if (!btn) return;
      const id = btn.dataset.id;
      if (!id) return;

      if (btn.classList.contains("del")) {
        if (confirm("Delete this record?")) {
          State.remove(id);
          announce("Record deleted.");
        }
      } else if (btn.classList.contains("edit")) {
        const rec = State.records.find(r => r.id === id);
        if (rec) fillForm(rec);
      }
    };
  }

  function fillForm(rec) {
    idField.value = rec.id || "";
    titleF.value = rec.title || "";
    authorF.value = rec.author || "";
    pagesF.value = rec.pages || "";
    tagF.value = rec.tag || "";
    statusF.value = rec.status || "unread";
    dateF.value = rec.dateAdded || new Date().toISOString().slice(0, 10);
    formErrors.textContent = "";
    titleF.focus();
  }

  const resetForm = () => {
    idField.value = "";
    formErrors.textContent = "";
    dateF.value = new Date().toISOString().slice(0, 10);
  };
  form.addEventListener("reset", (ev) => {
    ev.preventDefault(); // keep controlled reset to ensure defaults
    form.reset();
    resetForm();
  });

  form.addEventListener("submit", ev => {
    ev.preventDefault();
    const id = idField.value || null;
    const payload = {
      title: normalizeText(titleF.value),
      author: normalizeText(authorF.value),
      pages: normalizeText(pagesF.value),
      tag: normalizeText(tagF.value),
      status: statusF.value || "unread",
      dateAdded: dateF.value
    };
    const errs = validateRecord(payload);
    if (errs.length) { formErrors.textContent = errs.join(" • "); formErrors.focus(); return; }
    payload.pages = Number(payload.pages);
    if (id) State.update(id, payload);
    else State.add(payload);
    form.reset();
    resetForm();
    announce(id ? "Record updated." : "Record added.");
  });

  // --- SETTINGS ---
  function updateSettingsUI() {
    goalInput.value = State.settings.goal || "";
    unitSelect.value = State.settings.unit || "pages";
  }

  goalInput.addEventListener("change", () => {
    State.setSettings({ goal: Number(goalInput.value) || 0 });
    updateSettingsUI();
    announce("Settings saved.");
  });

  unitSelect.addEventListener("change", () => {
    State.setSettings({ unit: unitSelect.value });
    updateSettingsUI();
    announce("Settings saved.");
  });

  // --- SEARCH & SORT ---
  [searchInput, caseIns, sortBy].forEach(elm =>
    elm.addEventListener(elm === searchInput ? "input" : "change", renderRecords)
  );

  // --- EXPORT / IMPORT ---
  exportBtn.addEventListener("click", () => {
    const blob = new Blob([State.exportJSON()], { type: "application/json" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "book-notes-vault.json";
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(a.href);
    announce("Export started.");
  });

  importBtn.addEventListener("click", () => importFile.click());
  importFile.addEventListener("change", (ev) => {
    const f = ev.target.files[0];
    if (!f) return;
    const r = new FileReader();
    r.onload = () => {
      if (State.importJSON(r.result)) announce("Import successful.");
      else announce("Import failed — invalid file.", false);
    };
    r.readAsText(f);
    importFile.value = "";
  });

  seedBtn.addEventListener("click", async () => {
    const seed = await loadSeed();
    if (Array.isArray(seed) && seed.length) {
      const now = new Date().toISOString();
      const normalized = seed.map(s => ({ ...s, id: s.id || undefined, createdAt: s.createdAt || now, updatedAt: s.updatedAt || now }));
      State.setRecords(normalized);
      announce("Seed loaded.");
    } else announce("Seed load failed.", false);
  });

  clearBtn.addEventListener("click", () => {
    if (!confirm("Clear all app data (records & settings)?")) return;
    State.clearAll();
    updateSettingsUI();
    announce("All data cleared.");
  });

  // --- REACT TO STATE ---
  State.subscribe(() => {
    renderDashboard();
    renderRecords();
    updateSettingsUI();
  });

  // initial values
  dateF.value = dateF.value || new Date().toISOString().slice(0, 10);
  renderDashboard();
  renderRecords();
  updateSettingsUI();
}

// Do NOT auto-init here. main.js handles initialization.
export default { initUI };