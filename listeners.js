// listeners.js
// Robust button wiring for mobile + desktop.
// - Waits for DOMContentLoaded
// - Never hard-crashes if an element is missing
// - Supports either:
//    A) buttons with IDs (exportDeckBtn/importDeckBtn/etc)
//    B) buttons with data-action="exportDeck" style attributes
// - Supports handlers living on window or window.AEW

(function () {
  function getHandler(name) {
    // Prefer namespaced handlers to avoid polluting global scope
    if (window.AEW && typeof window.AEW[name] === "function") return window.AEW[name];
    if (typeof window[name] === "function") return window[name];
    return null;
  }

  function wireById(id, handlerName) {
    const el = document.getElementById(id);
    if (!el) {
      console.warn(`[listeners] Missing element id="${id}" (ok if you renamed it)`);
      return;
    }

    const fn = getHandler(handlerName);
    if (!fn) {
      console.error(`[listeners] Handler "${handlerName}" not found on window or window.AEW`);
      return;
    }

    el.addEventListener("click", (e) => {
      try {
        fn(e);
      } catch (err) {
        console.error(`[listeners] Error running "${handlerName}"`, err);
      }
    });

    console.log(`[listeners] Wired #${id} -> ${handlerName}()`);
  }

  function wireByDataAction() {
    const nodes = document.querySelectorAll("[data-action]");
    if (!nodes.length) {
      console.warn("[listeners] No [data-action] buttons found (that is fine)");
      return;
    }

    nodes.forEach((el) => {
      const action = el.getAttribute("data-action");
      const fn = getHandler(action);

      if (!fn) {
        console.error(`[listeners] data-action="${action}" but handler not found`);
        return;
      }

      el.addEventListener("click", (e) => {
        try {
          fn(e);
        } catch (err) {
          console.error(`[listeners] Error running "${action}"`, err);
        }
      });

      console.log(`[listeners] Wired [data-action="${action}"] -> ${action}()`);
    });
  }

  document.addEventListener("DOMContentLoaded", () => {
    console.log("[listeners] DOMContentLoaded, wiring buttons...");

    // If you have specific IDs, wire them here.
    // These are common guesses. If your IDs differ, either:
    // - add your real IDs here, OR
    // - add data-action="exportDeck" etc in the HTML and it will auto-wire.
    wireById("exportDeckBtn", "exportDeck");
    wireById("exportAllBtn", "exportAll");
    wireById("importDeckBtn", "importDeck");

    // Auto-wire anything using data-action
    wireByDataAction();

    console.log("[listeners] Wiring complete.");
  });
})();
