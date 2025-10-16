// scripts/ui.js
// Entry UI file: preserves your app logic and adds responsive nav (burger) behavior.
// Note: this file expects modules like state.js, search.js, validators.js, storage.js to exist
import { State } from "./state.js";
import { compileRegex, highlightMatches, escapeHtml } from "./search.js";
import { validateRecord, normalizeText } from "./validators.js";
import { loadSeed } from "./storage.js";

const el = (sel) => document.querySelector(sel);

export function initUI() {
  // Nav toggle logic (added)
  const navToggle = el("#nav-toggle");
  const mainNav = el("#main-nav");

  function openNav() {
    if (!mainNav) return;
    mainNav.removeAttribute("hidden");
    navToggle?.setAttribute("aria-expanded", "true");
    navToggle?.setAttribute("aria-label", "Close main navigation");
    // trap focus on nav for small screens (basic)
    // put focus on first nav button
    const firstBtn = mainNav.querySelector("button");
    if (firstBtn) firstBtn.focus();
    document.body.style.overflow = "hidden"; // prevent background scroll (small screens)
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
      if (expanded) closeNav(); else openNav();
    });

    // close nav on Escape
    document.addEventListener("keydown", (ev) => {
      if (ev.key === "Escape") {
        const expanded = navToggle.getAttribute("aria-expanded") === "true";
        if (expanded) closeNav();
      }
    });

    // close nav when clicking a nav item (and scroll)
    mainNav.addEventListener("click", (ev) => {
      const btn = ev.target.closest("button");
      if (!btn) return;
      const sel = btn.dataset.nav;
      if (sel) {
        const tgt = document.querySelector(sel);
        if (tgt) {
          tgt.scrollIntoView({ behavior: "smooth", block: "start" });
        }
      }
      // For small screens close menu after navigation
      const isSmall = window.matchMedia("(max-width: 47.99rem)").matches;
      if (isSmall) closeNav();
    });

    // If user resizes to desktop, ensure nav visible and attributes reset
    window.addEventListener("resize", () => {
      if (window.matchMedia("(min-width: 48rem)").matches) {
        mainNav.removeAttribute("hidden");
        navToggle?.setAttribute("aria-expanded", "false");
      } else {
        // on smaller screens, hide nav by default
        mainNav.setAttribute("hidden", "");
      }
    });

    // initialize nav visibility depending on screen size
    if (window.matchMedia("(min-width: 48rem)").matches) {
      mainNav.removeAttribute("hidden");
      navToggle?.setAttribute("aria-expanded", "false");
    } else {
      mainNav.setAttribute("hidden", "");
      navToggle?.setAttribute("aria-expanded", "false");
    }
  }

  // --- existing UI code (preserved) ---
  // DOM refs
  const totalBooks = el("#total-books");
  const totalPages = el("#total-pages");
  const topTags = el("#top-tags");
  const readingGoal = el("#reading-goal");
  const capMsg = el("#cap-message");
  const recordsBody = el("#records-body");
  const searchInput = el("#regex-search");
  const caseIns = el("#case-ins");
  const sortBy = el("#sort-by");
  const status = el("#status");

  // Form refs
  const form = el("#record-form");
  const idField = el("#record-id");
  const titleF = el("#title");
  const authorF = el("#author");
  const pagesF = el("#pages");
  const tagF = el("#tag");
  const statusF = el("#status");
  const dateF = el("#dateAdded");

  const formErrors = el("#form-errors");

  // Settings refs
  const goalInput = el("#goal");
  const unitSelect = el("#unit");
  const exportBtn = el("#export-btn");
  const importBtn = el("#import-btn");
  const importFile = el("#import-file");
  const seedBtn = el("#seed-btn");
  const clearBtn = el("#clear-btn");

  // helpers
  function announce(msg, polite = true){
    if(!status) return;
    status.textContent = msg;
    status.setAttribute("aria-live", polite ? "polite" : "assertive");
  }

  // render functions
  function renderDashboard() {
    const pages = State.totalPages();                 // total pages across all records
    const goal = Number(State.settings.goal) || 0;    // reading goal

    // Update total book & page stats
    totalBooks.textContent = State.records.length;
    totalPages.textContent = pages;

    // Update top tags
    const tags = State.topTags();
    topTags.innerHTML = tags.length
      ? tags.map(t => `<li>${escapeHtml(t.tag)} (${t.count})</li>`).join("")
      : "<li>—</li>";

    // === NEW: Calculate pages read (only for books with status 'done') ===
    const pagesRead = State.records.reduce((acc, rec) => {
      const p = Number(rec.pages) || 0;
      return rec.status === "done" ? acc + p : acc;
    }, 0);

    // === Update reading goal text ===
    readingGoal.textContent = goal > 0
      ? `${pagesRead} / ${goal} pages`
      : `${pagesRead} pages read`;

    // === Goal comparison message (based on pages read, not total pages) ===
    if (goal > 0) {
      const diff = pagesRead - goal;
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
    }

    // === Optional: Progress bar update if present ===
    const progressEl = document.getElementById("reading-progress");
    if (progressEl && goal > 0) {
      const pct = Math.min(100, Math.round((pagesRead / goal) * 100));
      progressEl.style.width = `${pct}%`;
    } else if (progressEl) {
      progressEl.style.width = "0%";
    }
  }

  function getSortedFilteredRecords(){
    let out = State.records.slice();
    const q = searchInput.value.trim();
    const re = q ? compileRegex(q, caseIns.checked ? "i" : "") : null;

    if (q && !re) {
      announce("Invalid regular expression — search ignored.", true);
    } else if (re){
      out = out.filter(r => re.test(`${r.title} ${r.author} ${r.tag}`));
    }

    const sorts = {
      date_desc: (a,b) => new Date(b.dateAdded) - new Date(a.dateAdded),
      date_asc: (a,b) => new Date(a.dateAdded) - new Date(b.dateAdded),
      title_asc: (a,b) => a.title.localeCompare(b.title),
      title_desc: (a,b) => b.title.localeCompare(a.title),
      pages_asc: (a,b) => (Number(a.pages)||0) - (Number(b.pages)||0),
      pages_desc: (a,b) => (Number(b.pages)||0) - (Number(a.pages)||0)
    };

    const sortFn = sorts[sortBy.value] || sorts.date_desc;
    out.sort(sortFn);
    return { out, re };
  }

  function renderRecords(){
    const { out, re } = getSortedFilteredRecords();

    if (!out.length){
      recordsBody.innerHTML = `<tr><td colspan="7" class="empty">No records found.</td></tr>`;
      return;
    }

    recordsBody.innerHTML = out.map(r => {
      const highlight = (text) => re ? highlightMatches(text || "", re) : escapeHtml(text || "");
      return `<tr data-id="${r.id}">
        <td>${highlight(r.title)}</td>
        <td>${highlight(r.author)}</td>
        <td>${escapeHtml(String(r.pages||0))}</td>
        <td>${highlight(r.tag)}</td>
        <td><span class="status-${r.status}">${escapeHtml(r.status || 'unread')}</span></td>
        <td>${escapeHtml(r.dateAdded)}</td>
        <td>
          <button class="edit" data-id="${r.id}">Edit</button>
          <button class="del" data-id="${r.id}">Delete</button>
        </td>
      </tr>`;
    }).join("");

    // Delegate click events for edit/delete
    recordsBody.addEventListener("click", (e) => {
      const btn = e.target;
      const id = btn.dataset.id;
      if (!id) return;

      if (btn.classList.contains("del")) {
        if (confirm("Delete this record?")) {
          State.remove(id);
          announce("Record deleted.", true);
        }
      } else if (btn.classList.contains("edit")) {
        const rec = State.records.find(r => r.id === id);
        if (rec) {
          fillForm(rec);
          idField.value = rec.id;
          titleF.focus();
        }
      }
    });
  }

  function fillForm(rec){
    idField.value = rec.id || "";
    titleF.value = rec.title || "";
    authorF.value = rec.author || "";
    pagesF.value = rec.pages || "";
    tagF.value = rec.tag || "";
    statusF.value = rec.status || "unread";
    dateF.value = rec.dateAdded || new Date().toISOString().slice(0,10);
    formErrors.textContent = "";
  }

  const resetForm = () => {
    idField.value = "";
    formErrors.textContent = "";
    dateF.value = new Date().toISOString().slice(0,10);
  };

  form.addEventListener("reset", resetForm);

  form.addEventListener("submit", (ev) => {
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
    if (errs.length){
      formErrors.textContent = errs.join(" • ");
      formErrors.focus();
      return;
    }

    payload.pages = Number(payload.pages);

    if (id) {
      State.update(id, payload);
      announce("Record updated.");
    } else {
      State.add(payload);
      announce("Record added.");
    }

    form.reset();
    resetForm();
  });

  goalInput.value = State.settings.goal || "";
  unitSelect.value = State.settings.unit || "pages";

  const saveSettings = () => announce("Settings saved.");

  goalInput.addEventListener("change", () => {
    State.setSettings({ goal: Number(goalInput.value) || 0 });
    saveSettings();
  });
  unitSelect.addEventListener("change", () => {
    State.setSettings({ unit: unitSelect.value });
    saveSettings();
  });

  [searchInput, caseIns, sortBy].forEach(el =>
    el.addEventListener(el === searchInput ? "input" : "change", renderRecords)
  );

  // export/import
  exportBtn.addEventListener("click", () => {
    const data = State.exportJSON();
    const blob = new Blob([data], {type:"application/json"});
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = "book-notes-vault.json"; a.click();
    URL.revokeObjectURL(url);
    announce("Export started.");
  });

  importBtn.addEventListener("click", () => importFile.click());
  importFile.addEventListener("change", (ev) => {
    const f = ev.target.files[0];
    if(!f) return;
    const r = new FileReader();
    r.onload = () => {
      const ok = State.importJSON(r.result);
      if(ok){ announce("Import successful."); } else { announce("Import failed — invalid file.", false); }
    };
    r.readAsText(f);
    importFile.value = "";
  });

  seedBtn.addEventListener("click", async () => {
    const seed = await loadSeed();
    if(Array.isArray(seed) && seed.length){
      // ensure seeded items have required fields
      const now = new Date().toISOString();
      const normalized = seed.map(s => Object.assign({}, s, { id: s.id || undefined, createdAt: s.createdAt || now, updatedAt: s.updatedAt || now }));
      State.setRecords(normalized);
      announce("Seed loaded.");
    } else {
      announce("Seed load failed.", false);
    }
  });

  clearBtn.addEventListener("click", () => {
    if(!confirm("Clear all app data (records & settings)?")) return;
    State.clearAll();
    announce("All data cleared.");
  });

  // react to state changes
  State.subscribe(() => {
    renderDashboard();
    renderRecords();
  });

  dateF.value = dateF.value || new Date().toISOString().slice(0,10);
  renderDashboard();
  renderRecords();

  // keyboard accessibility: allow Enter to activate nav buttons (kept)
  document.querySelectorAll(".main-nav button").forEach(btn => {
    btn.addEventListener("click", () => {
      const sel = btn.dataset.nav;
      const tgt = document.querySelector(sel);
      if(tgt) tgt.scrollIntoView({behavior:"smooth", block:"start"});
    });
  });
}

// Automatically initialize if this module is the entrypoint
if (document.readyState === "complete" || document.readyState === "interactive") {
  // Delay slightly to ensure the other modules (State) attach; safe-guard if State not yet defined
  setTimeout(() => {
    if (typeof State !== "undefined") {
      initUI();
    } else {
      // if State is not defined yet, try again shortly
      const tries = 6;
      let i = 0;
      const t = setInterval(() => {
        i++;
        if (typeof State !== "undefined") {
          clearInterval(t);
          initUI();
        } else if (i >= tries) {
          clearInterval(t);
          // no-op: State module missing — developer should ensure state.js is present
          console.warn("initUI: State module not available after retries.");
        }
      }, 120);
    }
  }, 8);
} else {
  window.addEventListener("DOMContentLoaded", () => initUI());
}

export default { initUI };
