// listeners.js
// Provides the named export that app-init.js imports:
//   import { initializeAllEventListeners } from './listeners.js';
//
// This file does NOT auto-run. app-init.js calls it.

export function initializeAllEventListeners(refreshCardPool) {
  const safeRefresh = () => {
    try {
      if (typeof refreshCardPool === 'function') refreshCardPool();
    } catch (e) {
      console.error('[listeners] refreshCardPool crashed:', e);
    }
  };

  // ---------- Basic helpers ----------
  const qs = (id) => document.getElementById(id);

  // ---------- Grid columns buttons ----------
  const gridSizeControls = qs('gridSizeControls');
  if (gridSizeControls) {
    gridSizeControls.addEventListener('click', (e) => {
      const btn = e.target.closest('button');
      if (!btn) return;

      const cols = btn.getAttribute('data-columns');
      if (!cols) return;

      // Update CSS variable if your CSS uses it, otherwise harmless
      const n = parseInt(cols, 10);
      if (!Number.isFinite(n)) return;

      const results = qs('searchResults');
      if (results) {
        results.style.setProperty('--grid-columns', String(n));
        results.setAttribute('data-grid-columns', String(n));
      }

      // Some builds store this state elsewhere; we also trigger re-render
      document.dispatchEvent(new Event('filtersChanged'));
      safeRefresh();
    });
  }

  // ---------- List/Grid view toggle ----------
  const viewModeToggle = qs('viewModeToggle');
  if (viewModeToggle) {
    viewModeToggle.addEventListener('click', () => {
      const results = qs('searchResults');

      const currentlyList =
        (results && results.classList.contains('list-view')) ||
        viewModeToggle.textContent.toLowerCase().includes('grid view');

      const nextIsList = !currentlyList;

      if (results) {
        results.classList.toggle('list-view', nextIsList);
        results.classList.toggle('grid-view', !nextIsList);
      }

      viewModeToggle.textContent = nextIsList
        ? 'Switch to Grid View'
        : 'Switch to List View';

      document.dispatchEvent(new Event('filtersChanged'));
      safeRefresh();
    });
  }

  // ---------- Search ----------
  const searchInput = qs('searchInput');
  if (searchInput) {
    searchInput.addEventListener('input', () => {
      document.dispatchEvent(new Event('filtersChanged'));
      safeRefresh();
    });
  }

  // ---------- Sort ----------
  const sortSelect = qs('sortSelect');
  if (sortSelect) {
    sortSelect.addEventListener('change', () => {
      document.dispatchEvent(new Event('filtersChanged'));
      safeRefresh();
    });
  }

  // ---------- Cost checkboxes ----------
  const showZeroCost = qs('showZeroCost');
  if (showZeroCost) {
    showZeroCost.addEventListener('change', () => {
      document.dispatchEvent(new Event('filtersChanged'));
      safeRefresh();
    });
  }

  const showNonZeroCost = qs('showNonZeroCost');
  if (showNonZeroCost) {
    showNonZeroCost.addEventListener('change', () => {
      document.dispatchEvent(new Event('filtersChanged'));
      safeRefresh();
    });
  }

  // ---------- Deck action buttons (hook to globals exposed by importer/exporter) ----------
  const importDeckBtn = qs('importDeck');
  if (importDeckBtn) {
    importDeckBtn.addEventListener('click', () => {
      if (typeof window.importDeck === 'function') window.importDeck();
      else console.error('[listeners] importDeck() not found on window');
    });
  }

  const exportDeckBtn = qs('exportDeck');
  if (exportDeckBtn) {
    exportDeckBtn.addEventListener('click', () => {
      if (typeof window.exportDeckAsText === 'function') window.exportDeckAsText();
      else if (window.AEW && typeof window.AEW.exportDeckAsText === 'function') window.AEW.exportDeckAsText();
      else console.error('[listeners] exportDeckAsText() not found');
    });
  }

  const exportLackeyBtn = qs('exportLackeyBtn');
  if (exportLackeyBtn) {
    exportLackeyBtn.addEventListener('click', () => {
      if (typeof window.exportDeckAsLackeyText === 'function') window.exportDeckAsLackeyText();
      else if (window.AEW && typeof window.AEW.exportDeckAsLackeyText === 'function') window.AEW.exportDeckAsLackeyText();
      else console.error('[listeners] exportDeckAsLackeyText() not found');
    });
  }

  const exportAsImageBtn = qs('exportAsImageBtn');
  if (exportAsImageBtn) {
    exportAsImageBtn.addEventListener('click', () => {
      if (typeof window.exportDeckAsImages === 'function') window.exportDeckAsImages();
      else if (window.AEW && typeof window.AEW.exportDeckAsImages === 'function') window.AEW.exportDeckAsImages();
      else console.error('[listeners] exportDeckAsImages() not found');
    });
  }

  const exportAllCardsBtn = qs('exportAllCards');
  if (exportAllCardsBtn) {
    exportAllCardsBtn.addEventListener('click', async () => {
      try {
        const mod = await import('./master-export.js');
        if (typeof mod.exportAllCardsAsImages === 'function') {
          await mod.exportAllCardsAsImages();
        } else {
          alert('master-export.js loaded but exportAllCardsAsImages() was not found.');
        }
      } catch (e) {
        console.error('[listeners] exportAllCardsAsImages failed:', e);
        alert('Export all cards failed. Check console for details.');
      }
    });
  }

  const clearDeckBtn = qs('clearDeck');
  if (clearDeckBtn) {
    clearDeckBtn.addEventListener('click', () => {
      // app-init/ui/deck modules handle actual deck state; this just forces a refresh
      document.dispatchEvent(new Event('filtersChanged'));
      safeRefresh();
    });
  }

  console.log('[listeners] initializeAllEventListeners: wired');
}
