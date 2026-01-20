// listeners.js
(function () {
  // ---------- On-screen debug banner ----------
  function ensureBanner() {
    let b = document.getElementById("debugBanner");
    if (b) return b;

    b = document.createElement("div");
    b.id = "debugBanner";
    b.style.position = "fixed";
    b.style.top = "0";
    b.style.left = "0";
    b.style.right = "0";
    b.style.zIndex = "999999";
    b.style.fontFamily = "monospace";
    b.style.fontSize = "12px";
    b.style.padding = "6px 8px";
    b.style.background = "rgba(0,0,0,0.85)";
    b.style.color = "#fff";
    b.style.whiteSpace = "pre-wrap";
    b.style.maxHeight = "35vh";
    b.style.overflow = "auto";
    b.textContent = "[listeners] loaded";
    document.body.appendChild(b);
    return b;
  }

  function banner(msg) {
    try {
      const b = ensureBanner();
      b.textContent = msg;
    } catch (_) {
      // If body isn't ready yet, ignore.
    }
  }

  window.addEventListener("error", (e) => {
    banner(`[ERROR]\n${e.message}\n${e.filename || ""}:${e.lineno || ""}`);
  });

  window.addEventListener("unhandledrejection", (e) => {
    const r = e.reason;
    const msg = r && r.message ? r.message : String(r);
    banner(`[PROMISE ERROR]\n${msg}`);
  });

  // ---------- Helpers ----------
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
      banner(`[CALL ERROR]\n${name}()\n${e.message || e}`);
      console.error(e);
      return false;
    }
  }

  function qsAll(sel) {
    return Array.from(document.querySelectorAll(sel));
  }

  function wireButtonByText(textIncludes, onClick) {
    const btn = qsAll("button").find(b =>
      (b.textContent || "").toLowerCase().includes(textIncludes.toLowerCase())
    );
    if (!btn) return null;
    btn.addEventListener("click", (e) => {
      e.preventDefault();
      onClick(btn, e);
    });
    return btn;
  }

  // ---------- Wiring ----------
  document.addEventListener("DOMContentLoaded", () => {
    ensureBanner();
    banner("[listeners] DOMContentLoaded: wiring...");

    // Grid columns: buttons with text "2" "3" "4"
    qsAll("button").forEach((btn) => {
      const t = (btn.textContent || "").trim();
      if (t !== "2" && t !== "3" && t !== "4") return;

      btn.addEventListener("click", (e) => {
        e.preventDefault();
        const n = parseInt(t, 10);

        // Try app handler first, fallback to CSS
        if (!safeCall("setGridColumns", n)) {
          const container =
            document.getElementById("cardPool") ||
            document.getElementById("cardPoolGrid") ||
            document.querySelector(".card-pool") ||
            document.querySelector(".card-grid");
          if (container) {
            container.style.display = "grid";
            container.style.gridTemplateColumns = `repeat(${n}, minmax(0, 1fr))`;
          }
        }
      });
    });

    // Switch view button
    const viewBtn = wireButtonByText("switch to", (btn) => {
      const txt = (btn.textContent || "").toLowerCase();
      const goingList = txt.includes("list");

      // Try app handler first, fallback to body class
      if (!safeCall("toggleListView", goingList)) {
        document.body.classList.toggle("list-view", goingList);
      }

      // Always update label so you can see it worked
      btn.textContent = goingList ? "Switch to Grid View" : "Switch to List View";
    });

    // Export (try several names)
    wireButtonByText("export", () => {
      if (
        !safeCall("exportDeck") &&
        !safeCall("exportDeckAsLackeyText") &&
        !safeCall("exportDeckAsText")
      ) {
        banner("[listeners] No export function found on window/window.AEW");
      }
    });

    // Import
    wireButtonByText("import", () => {
      if (!safeCall("importDeck")) {
        banner("[listeners] importDeck() not found on window/window.AEW");
      }
    });

    banner("[listeners] wiring complete");
  });
})();
