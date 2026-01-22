// listeners.js
// Centralized event wiring for the AEW TCG Deck Constructor.
// Exports initializeAllEventListeners(refreshCardPool) which app-init.js expects.
//
// This version:
// - Fixes the missing named export
// - Wires ALL buttons in index.html by their current IDs
// - Wires view toggle + grid columns
// - Wires import modal open/close + file/text import
// - Uses event delegation for card pool + deck list clicks
// - Never hard-crashes if an element is missing

import * as state from './config.js';
import * as ui from './ui.js';
import * as filters from './filters.js';
import { addCardToDeck, removeCardFromDeck } from './deck.js';
import { exportDeckAsText, exportDeckAsLackeyText, exportDeckAsImages } from './exporter.js';
import { exportAllCardsAsImages } from './master-export.js';
import { parseAndLoadDeck } from './importer.js';

function byId(id) {
  return document.getElementById(id);
}

function safeOn(el, event, handler) {
  if (!el) return;
  el.addEventListener(event, handler);
}

function closeModal(modalId) {
  const modal = byId(modalId);
  if (modal) modal.style.display = 'none';
}

function openModal(modalId) {
  const modal = byId(modalId);
  if (modal) modal.style.display = 'flex';
}

function setActiveGridButton(columns) {
  const wrap = byId('gridSizeControls');
  if (!wrap) return;
  const buttons = wrap.querySelectorAll('button[data-columns]');
  buttons.forEach(btn => {
    const val = Number(btn.getAttribute('data-columns'));
    if (val === columns) btn.classList.add('active');
    else btn.classList.remove('active');
  });
}

function updateViewToggleText() {
  const btn = byId('viewModeToggle');
  if (!btn) return;
  btn.textContent = state.currentViewMode === 'grid' ? 'Switch to List View' : 'Switch to Grid View';
}

function applyViewModeToListContainer() {
  const searchResults = byId('searchResults');
  if (!searchResults) return;

  if (state.currentViewMode === 'grid') {
    searchResults.classList.remove('list-view');
    searchResults.classList.add('grid-view');
    searchResults.setAttribute('data-columns', String(state.numGridColumns || 2));
  } else {
    searchResults.classList.remove('grid-view');
    searchResults.classList.add('list-view');
    searchResults.removeAttribute('data-columns');
  }

  updateViewToggleText();
  setActiveGridButton(state.numGridColumns || 2);
}

function wireCardPoolClicks() {
  const searchResults = byId('searchResults');
  if (!searchResults) return;

  // Expect UI renderer to put card title in data-title on either:
  // - a wrapper element
  // - the clicked button itself
  searchResults.addEventListener('click', (e) => {
    const target = e.target;

    // Add buttons (list view / grid view)
    const addBtn = target.closest('button[data-deck-target]');
    if (addBtn) {
      const deckTarget = addBtn.getAttribute('data-deck-target');
      const holder = addBtn.closest('[data-title]');
      const title = holder ? holder.getAttribute('data-title') : null;
      if (title && deckTarget) {
        addCardToDeck(title, deckTarget);
        state.saveStateToCache();
        return;
      }
    }

    // Purchase add buttons may use .btn-purchase
    const purchaseBtn = target.closest('button.btn-purchase');
    if (purchaseBtn) {
      const holder = purchaseBtn.closest('[data-title]');
      const title = holder ? holder.getAttribute('data-title') : null;
      if (title) {
        addCardToDeck(title, 'purchase');
        state.saveStateToCache();
        return;
      }
    }

    // Clicking a card visual/title should open modal
    const clickable = target.closest('[data-open-modal="true"], [data-title]');
    if (clickable) {
      const title = clickable.getAttribute('data-title');
      if (title) ui.openCardModalByTitle(title);
    }
  });
}

function wireDeckListClicks() {
  const startingDeckList = byId('startingDeckList');
  const purchaseDeckList = byId('purchaseDeckList');

  const handler = (deckName) => (e) => {
    const target = e.target;

    // Remove button
    const removeBtn = target.closest('button[data-remove-card="true"]');
    if (removeBtn) {
      const title = removeBtn.getAttribute('data-title');
      if (title) {
        removeCardFromDeck(title, deckName);
        state.saveStateToCache();
      }
      return;
    }

    // Click card title to open modal
    const titleEl = target.closest('[data-title]');
    if (titleEl) {
      const title = titleEl.getAttribute('data-title');
      if (title) ui.openCardModalByTitle(title);
    }
  };

  safeOn(startingDeckList, 'click', handler('starting'));
  safeOn(purchaseDeckList, 'click', handler('purchase'));
}

function wireModalCloseButtons() {
  // Card modal
  const cardModal = byId('cardModal');
  if (cardModal) {
    const closeBtn = cardModal.querySelector('.modal-close-button');
    safeOn(closeBtn, 'click', () => closeModal('cardModal'));
    safeOn(cardModal, 'click', (e) => {
      if (e.target === cardModal) closeModal('cardModal');
    });
  }

  // Import modal
  const importModal = byId('importModal');
  if (importModal) {
    const closeBtn = importModal.querySelector('.modal-close-button');
    safeOn(closeBtn, 'click', () => closeModal('importModal'));
    safeOn(importModal, 'click', (e) => {
      if (e.target === importModal) closeModal('importModal');
    });
  }
}

function wireImportFlow() {
  const importBtn = byId('importDeck');
  const processBtn = byId('processImportBtn');
  const fileInput = byId('deckFileInput');
  const textInput = byId('deckTextInput');
  const status = byId('importStatus');

  safeOn(importBtn, 'click', () => {
    if (status) status.textContent = '';
    if (textInput) textInput.value = '';
    if (fileInput) fileInput.value = '';
    openModal('importModal');
  });

  safeOn(processBtn, 'click', async () => {
    try {
      if (status) {
        status.textContent = 'Importing...';
        status.style.color = '#333';
      }

      let text = '';
      if (fileInput && fileInput.files && fileInput.files[0]) {
        text = await fileInput.files[0].text();
      } else if (textInput) {
        text = textInput.value || '';
      }

      parseAndLoadDeck(text);

      // parseAndLoadDeck already updates UI; we just close after success message
      if (status) {
        status.textContent = 'Deck imported successfully!';
        status.style.color = 'green';
      }
      setTimeout(() => closeModal('importModal'), 800);
    } catch (err) {
      console.error(err);
      if (status) {
        status.textContent = `Import failed: ${err.message}`;
        status.style.color = 'red';
      }
    }
  });
}

function wireExportsAndClear() {
  const exportDeckBtn = byId('exportDeck');
  const exportLackeyBtn = byId('exportLackeyBtn');
  const exportAsImageBtn = byId('exportAsImageBtn');
  const exportAllBtn = byId('exportAllCards');
  const clearBtn = byId('clearDeck');

  safeOn(exportDeckBtn, 'click', () => exportDeckAsText());
  safeOn(exportLackeyBtn, 'click', () => exportDeckAsLackeyText());
  safeOn(exportAsImageBtn, 'click', () => exportDeckAsImages());
  safeOn(exportAllBtn, 'click', () => exportAllCardsAsImages());

  safeOn(clearBtn, 'click', () => {
    state.setStartingDeck([]);
    state.setPurchaseDeck([]);
    state.setSelectedWrestler(null);
    state.setSelectedManager(null);
    state.setSelectedCallName(null);
    state.setSelectedFaction(null);

    state.saveStateToCache();

    // Reset selects if present
    const wrestlerSelect = byId('wrestlerSelect');
    const managerSelect = byId('managerSelect');
    const callNameSelect = byId('callNameSelect');
    const factionSelect = byId('factionSelect');
    if (wrestlerSelect) wrestlerSelect.value = '';
    if (managerSelect) managerSelect.value = '';
    if (callNameSelect) callNameSelect.value = '';
    if (factionSelect) factionSelect.value = '';

    ui.renderDecks();
    ui.renderPersonaDisplay();
    document.dispatchEvent(new Event('filtersChanged'));
  });
}

function wireViewControls(refreshCardPool) {
  const viewToggle = byId('viewModeToggle');
  const gridWrap = byId('gridSizeControls');

  safeOn(viewToggle, 'click', () => {
    state.setCurrentViewMode(state.currentViewMode === 'grid' ? 'list' : 'grid');
    applyViewModeToListContainer();
    refreshCardPool();
    state.saveStateToCache();
  });

  if (gridWrap) {
    gridWrap.addEventListener('click', (e) => {
      const btn = e.target.closest('button[data-columns]');
      if (!btn) return;
      const cols = Number(btn.getAttribute('data-columns'));
      if (!cols) return;

      state.setNumGridColumns(cols);
      applyViewModeToListContainer();
      refreshCardPool();
      state.saveStateToCache();
    });
  }
}

function wireFilterControls(refreshCardPool) {
  const searchInput = byId('searchInput');
  const sortSelect = byId('sortSelect');
  const showZero = byId('showZeroCost');
  const showNonZero = byId('showNonZeroCost');

  // Search typing
  safeOn(searchInput, 'input', state.debounce(() => refreshCardPool(), 120));

  // Sort dropdown
  safeOn(sortSelect, 'change', (e) => {
    state.setCurrentSort(e.target.value);
    refreshCardPool();
    state.saveStateToCache();
  });

  // Cost checkboxes
  safeOn(showZero, 'change', (e) => {
    state.setShowZeroCost(!!e.target.checked);
    refreshCardPool();
    state.saveStateToCache();
  });

  safeOn(showNonZero, 'change', (e) => {
    state.setShowNonZeroCost(!!e.target.checked);
    refreshCardPool();
    state.saveStateToCache();
  });

  // Cascading filters already dispatch filtersChanged, but we also listen globally:
  document.addEventListener('filtersChanged', () => refreshCardPool());
}

export function initializeAllEventListeners(refreshCardPool) {
  // Make sure the card list container matches current view state
  applyViewModeToListContainer();

  wireModalCloseButtons();
  wireImportFlow();
  wireExportsAndClear();

  wireViewControls(refreshCardPool);
  wireFilterControls(refreshCardPool);

  wireCardPoolClicks();
  wireDeckListClicks();

  // Ensure grid buttons reflect saved state
  setActiveGridButton(state.numGridColumns || 2);
  updateViewToggleText();
}
