// listeners.js
import * as state from './config.js';
import * as ui from './ui.js';
import * as deck from './deck.js';
import { parseAndLoadDeck } from './importer.js';
import {
  generatePlainTextDeck,
  exportDeckAsImage,
  generateLackeyCCGDeck,
  generateFullSpoilerFormat
} from './exporter.js';

export function initializeAllEventListeners(refreshCardPool) {
  // POOL LISTENERS
  const searchInput = document.getElementById('searchInput');
  const sortSelect = document.getElementById('sortSelect');
  const showZeroCostCheckbox = document.getElementById('showZeroCost');
  const showNonZeroCostCheckbox = document.getElementById('showNonZeroCost');
  const gridSizeControls = document.getElementById('gridSizeControls');
  const viewModeToggle = document.getElementById('viewModeToggle');
  const searchResults = document.getElementById('searchResults');

  document.addEventListener('filtersChanged', refreshCardPool);
  searchInput.addEventListener('input', state.debounce(refreshCardPool, 300));
  sortSelect.addEventListener('change', (e) => { state.setCurrentSort(e.target.value); refreshCardPool(); });
  showZeroCostCheckbox.addEventListener('change', (e) => { state.setShowZeroCost(e.target.checked); refreshCardPool(); });
  showNonZeroCostCheckbox.addEventListener('change', (e) => { state.setShowNonZeroCost(e.target.checked); refreshCardPool(); });

  gridSizeControls.addEventListener('click', (e) => {
    if (e.target.tagName === 'BUTTON') {
      state.setNumGridColumns(e.target.dataset.columns);
      gridSizeControls.querySelectorAll('button').forEach(btn => btn.classList.remove('active'));
      e.target.classList.add('active');
      refreshCardPool();
    }
  });

  viewModeToggle.addEventListener('click', () => {
    const newMode = state.currentViewMode === 'list' ? 'grid' : 'list';
    state.setCurrentViewMode(newMode);
    viewModeToggle.textContent = newMode === 'list' ? 'Switch to Grid View' : 'Switch to List View';
    refreshCardPool();
  });

  searchResults.addEventListener('click', (e) => {
    const target = e.target;
    const cardTitle = target.dataset.title || target.closest('[data-title]')?.dataset.title;
    if (!cardTitle) return;
    if (target.tagName === 'BUTTON') {
      deck.addCardToDeck(cardTitle, target.dataset.deckTarget);
    } else {
      ui.showCardModal(cardTitle);
    }
  });

  // DECK LISTENERS
  const wrestlerSelect = document.getElementById('wrestlerSelect');
  const managerSelect = document.getElementById('managerSelect');
  const callNameSelect = document.getElementById('callNameSelect');
  const factionSelect = document.getElementById('factionSelect');
  const startingDeckList = document.getElementById('startingDeckList');
  const purchaseDeckList = document.getElementById('purchaseDeckList');
  const personaDisplay = document.getElementById('personaDisplay');
  const clearDeckBtn = document.getElementById('clearDeck');
  const exportDeckBtn = document.getElementById('exportDeck');
  const exportAsImageBtn = document.getElementById('exportAsImageBtn');
  const exportAllCardsBtn = document.getElementById('exportAllCards');

  // ✅ NEW: deck view controls (created dynamically in app-init.js)
  const deckViewModeToggle = document.getElementById('deckViewModeToggle');
  const deckGridSizeControls = document.getElementById('deckGridSizeControls');

  if (deckViewModeToggle) {
    deckViewModeToggle.addEventListener('click', () => {
      const newMode = (state.deckViewMode === 'grid') ? 'list' : 'grid';
      state.setDeckViewMode(newMode);
      state.saveStateToCache();
    });
  }

  if (deckGridSizeControls) {
    deckGridSizeControls.addEventListener('click', (e) => {
      const btn = e.target;
      if (btn.tagName !== 'BUTTON') return;
      const cols = btn.dataset.columns;
      if (!cols) return;
      state.setDeckGridColumns(cols);
      state.saveStateToCache();
    });
  }

  // Create or get the LackeyCCG export button
  const exportLackeyBtn = document.getElementById('exportLackeyBtn') || createLackeyExportButton();

  // Create or get the TSV export button
  const exportTSVBtn = document.getElementById('exportTSVBtn') || createTSVExportButton();

  // Create or get Spoiler export button
  const exportSpoilerBtn = document.getElementById('exportSpoilerBtn') || createSpoilerExportButton();

  wrestlerSelect.addEventListener('change', (e) => {
    const newWrestler = state.cardTitleCache[e.target.value] || null;
    state.setSelectedWrestler(newWrestler);
    ui.renderPersonaDisplay();
    refreshCardPool();
    state.saveStateToCache();
  });

  managerSelect.addEventListener('change', (e) => {
    const newManager = state.cardTitleCache[e.target.value] || null;
    state.setSelectedManager(newManager);
    ui.renderPersonaDisplay();
    refreshCardPool();
    state.saveStateToCache();
  });

  if (callNameSelect) {
    callNameSelect.addEventListener('change', (e) => {
      const newCallName = state.cardTitleCache[e.target.value] || null;
      state.setSelectedCallName(newCallName);
      ui.renderPersonaDisplay();
      refreshCardPool();
      state.saveStateToCache();
    });
  }

  if (factionSelect) {
    factionSelect.addEventListener('change', (e) => {
      const newFaction = state.cardTitleCache[e.target.value] || null;
      state.setSelectedFaction(newFaction);
      ui.renderPersonaDisplay();
      refreshCardPool();
      state.saveStateToCache();
    });
  }

  [startingDeckList, purchaseDeckList, personaDisplay].forEach(container => {
    container.addEventListener('click', (e) => {
      const target = e.target;
      const cardTitle = target.dataset.title || target.closest('[data-title]')?.dataset.title;
      if (!cardTitle) return;
      if (target.tagName === 'BUTTON' && target.dataset.deck) {
        deck.removeCardFromDeck(cardTitle, target.dataset.deck);
      } else {
        ui.showCardModal(cardTitle);
      }
    });
  });

  clearDeckBtn.addEventListener('click', () => {
    if (confirm('Are you sure you want to clear the entire deck?')) {
      state.setStartingDeck([]);
      state.setPurchaseDeck([]);
      state.setSelectedWrestler(null);
      state.setSelectedManager(null);
      state.setSelectedCallName(null);
      state.setSelectedFaction(null);

      wrestlerSelect.value = "";
      managerSelect.value = "";
      if (callNameSelect) callNameSelect.value = "";
      if (factionSelect) factionSelect.value = "";

      ui.renderDecks();
      ui.renderPersonaDisplay();
      refreshCardPool();
      state.saveStateToCache();
    }
  });

  exportDeckBtn.addEventListener('click', () => {
    const text = generatePlainTextDeck();
    const blob = new Blob([text], { type: 'text/plain' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    const wrestlerName = state.selectedWrestler ? state.toPascalCase(state.selectedWrestler.title) : "Deck";
    a.download = `${wrestlerName}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(a.href);
  });

  exportLackeyBtn.addEventListener('click', () => {
    const text = generateLackeyCCGDeck();
    const blob = new Blob([text], { type: 'text/plain' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    const wrestlerName = state.selectedWrestler ? state.toPascalCase(state.selectedWrestler.title) : "Deck";
    a.download = `${wrestlerName}-Lackey.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(a.href);
  });

  exportAsImageBtn.addEventListener('click', exportDeckAsImage);

  if (exportAllCardsBtn) {
    exportAllCardsBtn.addEventListener('click', async () => {
      try {
        const { showExportModal } = await import('./master-export.js');
        await showExportModal();
      } catch (error) {
        console.error("Failed to show export modal:", error);
        alert('Failed to load export options. ' + error.message);
      }
    });
  }

  if (exportTSVBtn) {
    exportTSVBtn.addEventListener('click', async () => {
      try {
        const { exportAllCardsAsTSV } = await import('./master-export.js');
        await exportAllCardsAsTSV();
      } catch (error) {
        console.error("TSV export failed:", error);
        alert(`TSV export failed: ${error.message}`);
      }
    });
  }

  if (exportSpoilerBtn) {
    exportSpoilerBtn.addEventListener('click', () => {
      try {
        const text = generateFullSpoilerFormat();
        const blob = new Blob([text], { type: 'text/plain' });
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        const date = new Date().toISOString().slice(0, 10);
        a.download = `AEW-Full-Database-Spoiler-${date}.txt`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(a.href);
      } catch (error) {
        console.error("Spoiler export failed:", error);
        alert(`Spoiler export failed: ${error.message}`);
      }
    });
  }

  // MODAL LISTENERS
  const importDeckBtn = document.getElementById('importDeck');
  const importModal = document.getElementById('importModal');
  const importModalCloseBtn = importModal.querySelector('.modal-close-button');
  const deckFileInput = document.getElementById('deckFileInput');
  const deckTextInput = document.getElementById('deckTextInput');
  const processImportBtn = document.getElementById('processImportBtn');
  const cardModal = document.getElementById('cardModal');
  const modalCloseButton = cardModal.querySelector('.modal-close-button');

  const exportModal = document.getElementById('exportModal');
  const exportModalCloseBtn = exportModal?.querySelector('.modal-close-button');
  const cancelExportBtn = document.getElementById('cancelExport');

  importDeckBtn.addEventListener('click', () => {
    importModal.style.display = 'flex';
    document.getElementById('importStatus').textContent = '';
    deckTextInput.value = '';
    deckFileInput.value = '';
  });

  importModalCloseBtn.addEventListener('click', () => importModal.style.display = 'none');

  processImportBtn.addEventListener('click', () => {
    if (deckTextInput.value.trim()) {
      parseAndLoadDeck(deckTextInput.value);
    } else {
      document.getElementById('importStatus').textContent = 'Please paste decklist or select a file.';
      document.getElementById('importStatus').style.color = 'red';
    }
  });

  deckFileInput.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => parseAndLoadDeck(event.target.result);
      reader.readAsText(file);
    }
  });

  if (exportModal && exportModalCloseBtn) {
    exportModalCloseBtn.addEventListener('click', () => exportModal.style.display = 'none');
    exportModal.addEventListener('click', (e) => { if (e.target === exportModal) exportModal.style.display = 'none'; });
  }
  if (cancelExportBtn && exportModal) {
    cancelExportBtn.addEventListener('click', () => exportModal.style.display = 'none');
  }

  modalCloseButton.addEventListener('click', () => cardModal.style.display = 'none');
  cardModal.addEventListener('click', (e) => { if (e.target === cardModal) cardModal.style.display = 'none'; });
  importModal.addEventListener('click', (e) => { if (e.target === importModal) importModal.style.display = 'none'; });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      cardModal.style.display = 'none';
      importModal.style.display = 'none';
      if (exportModal) exportModal.style.display = 'none';
      if (state.lastFocusedElement) state.lastFocusedElement.focus();
    }
  });
}

function createLackeyExportButton() {
  const deckActions = document.querySelector('.deck-actions');
  if (!deckActions) return null;

  const lackeyBtn = document.createElement('button');
  lackeyBtn.id = 'exportLackeyBtn';
  lackeyBtn.textContent = 'Export for LackeyCCG';
  lackeyBtn.style.backgroundColor = '#17a2b8';
  lackeyBtn.style.color = 'white';
  lackeyBtn.style.border = 'none';
  lackeyBtn.style.borderRadius = '4px';
  lackeyBtn.style.cursor = 'pointer';
  lackeyBtn.style.padding = '10px 15px';
  lackeyBtn.style.marginLeft = '10px';
  lackeyBtn.style.marginBottom = '5px';

  const exportDeckBtn = document.getElementById('exportDeck');
  const exportAsImageBtn = document.getElementById('exportAsImageBtn');

  if (exportDeckBtn && exportAsImageBtn) deckActions.insertBefore(lackeyBtn, exportAsImageBtn);
  else deckActions.appendChild(lackeyBtn);

  return lackeyBtn;
}

function createTSVExportButton() {
  const deckActions = document.querySelector('.deck-actions');
  if (!deckActions) return null;

  const tsvBtn = document.createElement('button');
  tsvBtn.id = 'exportTSVBtn';
  tsvBtn.textContent = 'Export TSV Database';
  tsvBtn.style.backgroundColor = '#28a745';
  tsvBtn.style.color = 'white';
  tsvBtn.style.border = 'none';
  tsvBtn.style.borderRadius = '4px';
  tsvBtn.style.cursor = 'pointer';
  tsvBtn.style.padding = '10px 15px';
  tsvBtn.style.marginLeft = '10px';
  tsvBtn.style.marginBottom = '5px';
  tsvBtn.title = 'Export all cards in LackeyCCG database format (TSV)';

  const exportAllCardsBtn = document.getElementById('exportAllCards');
  if (exportAllCardsBtn) deckActions.insertBefore(tsvBtn, exportAllCardsBtn.nextSibling);
  else deckActions.appendChild(tsvBtn);

  return tsvBtn;
}

function createSpoilerExportButton() {
  const deckActions = document.querySelector('.deck-actions');
  if (!deckActions) return null;

  const spoilerBtn = document.createElement('button');
  spoilerBtn.id = 'exportSpoilerBtn';
  spoilerBtn.textContent = 'Export Spoiler (Full DB)';
  spoilerBtn.style.backgroundColor = '#6f42c1';
  spoilerBtn.style.color = 'white';
  spoilerBtn.style.border = 'none';
  spoilerBtn.style.borderRadius = '4px';
  spoilerBtn.style.cursor = 'pointer';
  spoilerBtn.style.padding = '10px 15px';
  spoilerBtn.style.marginLeft = '10px';
  spoilerBtn.style.marginBottom = '5px';
  spoilerBtn.title = 'Export full database in “spoiler” text format';

  const exportTSVBtn = document.getElementById('exportTSVBtn');
  const exportAllCardsBtn = document.getElementById('exportAllCards');

  if (exportTSVBtn) deckActions.insertBefore(spoilerBtn, exportTSVBtn.nextSibling);
  else if (exportAllCardsBtn) deckActions.insertBefore(spoilerBtn, exportAllCardsBtn.nextSibling);
  else deckActions.appendChild(spoilerBtn);

  return spoilerBtn;
}
