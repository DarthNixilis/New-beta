// listeners.js
// Full UI wiring for mobile + desktop.
//
// Goals:
// - Nothing should "silently do nothing" on mobile.
// - Work even if some elements are missing or renamed.
// - Prefer calling existing app handlers if they exist.
// - Otherwise, apply safe DOM fallbacks (grid cols + list view).
//
// NOTE: This file intentionally does NOT import other modules.
// It just wires DOM events to existing globals/events.

(function () {
  const log = (...a) => console.log("[listeners]", ...a);
  const warn = (...a) => console.warn("[listeners]", ...a);
  const err = (...a) => console.error("[listeners]", ...a);

  function $(sel) {
    return document.querySelector(sel);
  }
  function $all(sel) {
    return Array.from(document.querySelectorAll(sel));
  }

  function dispatchFiltersChanged() {
    document.dispatchEvent(new Event("filtersChanged"));
  }

  // Try to locate the card pool grid container (for layout fallback)
  function getCardPoolContainer() {
    return (
      document.getElementById("cardPool") ||
      document.getElementById("cardPoolContainer") ||
      document.getElementById("cardPoolGrid") ||
      document.querySelector(".card-pool") ||
      document.querySelector(".cardPool") ||
      document.querySelector(".card-grid") ||
      document.querySelector(".grid") ||
      null
    );
  }

  // Fallback: set CSS grid columns directly on the pool container
  function applyGridColumns(n) {
    const container = getCardPoolContainer();
    if (!container) {
      warn("Could not find card pool container to apply grid columns.");
      return;
    }

    // Try common patterns
    container.style.display = "grid";
    container.style.gridTemplateColumns = `repeat(${n}, minmax(0, 1fr))`;
    container.dataset.columns = String(n);

    log(`Applied grid columns fallback: ${n}`);
  }

  // Fallback: toggle list view using a class on <body>
  function applyListView(isList) {
    const body = document.body;
    body.classList.toggle("list-view", !!isList);

    const container = getCardPoolContainer();
    if (container) {
      container.classList.toggle("list-view", !!isList);
      container.classList.toggle("grid-view", !isList);

      // If list view, remove grid columns styling so items can stack
      if (isList) {
        container.style.gridTemplateColumns = "";
      }
    }

    log(`Applied list view fallback: ${isList ? "LIST" : "GRID"}`);
  }

  // Find handler from window or window.AEW (for module-safe calls)
  function getHandler(name) {
    if (window.AEW && typeof window.AEW[name] === "function") return window.AEW[name];
    if (typeof window[name] === "function") return window[name];
    return null;
  }

  function safeCall(name, ...args) {
    const fn = getHandler(name);
    if (!fn) return false;
    try {
      fn(...args);
      return true;
    } catch (e) {
      err(`Error calling ${name}()`, e);
      return false;
    }
  }

  // Wire a button by id to a handler name (if present)
  function wireById(id, handlerName) {
    const el = document.getElementById(id);
    if (!el) return false;

    el.addEventListener("click", (e) => {
      e.preventDefault();
      e.stopPropagation();
      const ok = safeCall(handlerName, e);
      if (!ok) err(`Handler "${handlerName}" not found for #${id}`);
    });

    log(`Wired #${id} -> ${handlerName}()`);
    return true;
  }

  // Wire any element with data-action="someFunction"
  function wireByDataAction() {
    const nodes = $all("[data-action]");
    if (!nodes.length) return 0;

    let count = 0;
    nodes.forEach((el) => {
      const action = el.getAttribute("data-action");
      if (!action) return;

      el.addEventListener("click", (e) => {
        e.preventDefault();
        e.stopPropagation();
        const ok = safeCall(action, e);
        if (!ok) err(`data-action="${action}" but handler not found`);
      });

      count++;
      log(`Wired [data-action="${action}"] -> ${action}()`);
    });

    return count;
  }

  // Wire grid columns controls:
  // Looks for buttons with text 2 / 3 / 4 near "Grid Columns:" OR any buttons with data-columns.
  function wireGridColumns() {
    let wired = 0;

    // Prefer data-columns attribute if you have it
    $all("button[data-columns]").forEach((btn) => {
      const n = parseInt(btn.getAttribute("data-columns"), 10);
      if (!Number.isFinite(n)) return;

      btn.addEventListener("click", (e) => {
        e.preventDefault();
        applyGridColumns(n);
        // If your app has a handler, call it too
        safeCall("setGridColumns", n);
        dispatchFiltersChanged();
      });

      wired++;
    });

    // Fallback: find buttons whose text is exactly 2/3/4 (like your screenshot)
    const numericBtns = $all("button").filter((b) => {
      const t = (b.textContent || "").trim();
      return t === "2" || t === "3" || t === "4";
    });

    numericBtns.forEach((btn) => {
      // Avoid double-wiring if it already has data-columns
      if (btn.getAttribute("data-columns")) return;

      const n = parseInt(btn.textContent.trim(), 10);
      if (!Number.isFinite(n)) return;

      btn.addEventListener("click", (e) => {
        e.preventDefault();
        applyGridColumns(n);
        safeCall("setGridColumns", n);
        dispatchFiltersChanged();
      });

      wired++;
    });

    if (wired) log(`Grid column buttons wired: ${wired}`);
    else warn("No grid column buttons found to wire.");
  }

  // Wire list/grid view toggle button by text or common ids
  function wireViewToggle() {
    // Try common IDs first
    const ids = ["toggleViewBtn", "viewToggleBtn", "switchViewBtn", "listViewBtn"];
    for (const id of ids) {
      const el = document.getElementById(id);
      if (!el) continue;

      el.addEventListener("click", (e) => {
        e.preventDefault();
        const isCurrentlyList =
          document.body.classList.contains("list-view") ||
          el.textContent.toLowerCase().includes("grid view");

        const nextIsList = !isCurrentlyList;

        // Prefer app handler if you have one
        const ok = safeCall("toggleListView", nextIsList);
        if (!ok) applyListView(nextIsList);

        // Update label to match your screenshot wording
        el.textContent = nextIsList ? "Switch to Grid View" : "Switch to List View";
        dispatchFiltersChanged();
      });

      log(`Wired view toggle by id: #${id}`);
      return;
    }

    // Fallback: match the button text "Switch to List View" / "Switch to Grid View"
    const btn = $all("button").find((b) => {
      const t = (b.textContent || "").toLowerCase();
      return t.includes("switch to list view") || t.includes("switch to grid view");
    });

    if (!btn) {
      warn("No view toggle button found to wire.");
      return;
    }

    btn.addEventListener("click", (e) => {
      e.preventDefault();
      const t = (btn.textContent || "").toLowerCase();
      const nextIsList = t.includes("switch to list");

      const ok = safeCall("toggleListView", nextIsList);
      if (!ok) applyListView(nextIsList);

      btn.textContent = nextIsList ? "Switch to Grid View" : "Switch to List View";
      dispatchFiltersChanged();
    });

    log("Wired view toggle by button text.");
  }

  // Wire search + sort + checkboxes (dispatches filtersChanged)
  function wireFilters() {
    // Search input (your placeholder matches screenshot)
    const search =
      document.getElementById("searchInput") ||
      document.getElementById("search") ||
      $all("input").find((i) =>
        (i.getAttribute("placeholder") || "").toLowerCase().includes("search card name or text")
      );

    if (search) {
      search.addEventListener("input", () => dispatchFiltersChanged());
      log("Wired search input.");
    } else {
      warn("Search input not found to wire.");
    }

    // Sort dropdown: label says "Sort by:"
    const sort =
      document.getElementById("sortSelect") ||
      document.getElementById("sort") ||
      document.getElementById("sortDropdown") ||
      $("select");

    if (sort) {
      sort.addEventListener("change", () => dispatchFiltersChanged());
      log("Wired sort dropdown.");
    } else {
      warn("Sort dropdown not found to wire.");
    }

    // Checkboxes: "Show 0-Cost" and "Show Non-0-Cost"
    const checkboxes = $all('input[type="checkbox"]');
    if (checkboxes.length) {
      checkboxes.forEach((cb) => cb.addEventListener("change", () => dispatchFiltersChanged()));
      log(`Wired ${checkboxes.length} checkbox filter(s).`);
    } else {
      warn("No checkbox filters found to wire.");
    }
  }

  // Wire export/import buttons robustly, by id OR by button text
  function wireExportImport() {
    // If you have IDs, wire them:
    wireById("exportDeckBtn", "exportDeck") ||
      wireById("exportDeckBtn", "exportDeckAsLackeyText") ||
      wireById("exportDeckBtn", "exportDeckAsText");

    wireById("exportAllBtn", "exportAll") ||
      wireById("exportAllBtn", "exportAllCardsAsImages");

    wireById("importDeckBtn", "importDeck") ||
      wireById("importDeckBtn", "openImportModal");

    // Fallback by button text (case-insensitive)
    $all("button").forEach((btn) => {
      const t = (btn.textContent || "").trim().toLowerCase();
      if (!t) return;

      if (t === "export" || t.includes("export deck")) {
        btn.addEventListener("click", (e) => {
          e.preventDefault();
          if (
            !safeCall("exportDeck") &&
            !safeCall("exportDeckAsLackeyText") &&
            !safeCall("exportDeckAsText")
          ) {
            err("No export handler found (exportDeck / exportDeckAsLackeyText / exportDeckAsText).");
          }
        });
      }

      if (t.includes("import")) {
        btn.addEventListener("click", (e) => {
          e.preventDefault();
          if (!safeCall("importDeck")) {
            err("No import handler found (importDeck).");
          }
        });
      }
    });

    log("Export/Import wiring attempted.");
  }

  document.addEventListener("DOMContentLoaded", () => {
    log("DOMContentLoaded, wiring UI...");

    // This helps if other code listens for filtersChanged,
    // but also ensures your UI doesn't "freeze" even if it doesn't.
    wireFilters();
    wireGridColumns();
    wireViewToggle();

    // Export/import wiring
    wireExportImport();

    // data-action hooks (optional)
    const n = wireByDataAction();
    if (n) log(`data-action elements wired: ${n}`);

    log("Wiring complete.");
  });
})();
