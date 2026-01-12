// listeners.js
import * as state from './config.js';
import * as ui from './ui.js';
import * as filters from './filters.js';
import * as deck from './deck.js';

export function initializeAllEventListeners(refreshCardPool) {
  const searchInput = document.getElementById('searchInput');
  const sortSelect = document.getElementById('sortSelect');
  const showZeroCost = document.getElementById('showZeroCost');
  const showNonZeroCost = document.getElementById('showNonZeroCost');

  const searchResults = document.getElementById('searchResults');
  const startingDeckList = document.getElementById('startingDeckList');
  const purchaseDeckList = document.getElementById('purchaseDeckList');

  const cardModal = document.getElementById('cardModal');
  const modalCloseBtn = cardModal ? cardModal.querySelector('.modal-close-button') : null;

  // --- Refresh triggers ---
  document.addEventListener('filtersChanged', () => refreshCardPool());

  if (searchInput) {
    searchInput.addEventListener('input', state.debounce(() => refreshCardPool(), 150));
  }

  if (sortSelect) {
    sortSelect.addEventListener('change', (e) => {
      state.setCurrentSort(e.target.value);
      refreshCardPool();
    });
  }

  if (showZeroCost) {
    showZeroCost.addEventListener('change', (e) => {
      state.setShowZeroCost(!!e.target.checked);
      refreshCardPool();
    });
  }

  if (showNonZeroCost) {
    showNonZeroCost.addEventListener('change', (e) => {
      state.setShowNonZeroCost(!!e.target.checked);
      refreshCardPool();
    });
  }

  // --- Card pool interactions ---
  if (searchResults) {
    searchResults.addEventListener('click', (e) => {
      const btn = e.target.closest('button');
      if (btn && btn.dataset.title && btn.dataset.deckTarget) {
        deck.addCardToDeck(btn.dataset.title, btn.dataset.deckTarget);
        return;
      }

      const el = e.target.closest('[data-title]');
      if (el && el.dataset.title) {
        ui.openCardModal(el.dataset.title);
      }
    });
  }

  // --- Deck remove ---
  if (startingDeckList) {
    startingDeckList.addEventListener('click', (e) => {
      const btn = e.target.closest('button');
      if (!btn) return;
      const title = btn.dataset.title;
      const deckName = btn.dataset.deck;
      if (title && deckName) deck.removeCardFromDeck(title, deckName);
    });
  }

  if (purchaseDeckList) {
    purchaseDeckList.addEventListener('click', (e) => {
      const btn = e.target.closest('button');
      if (!btn) return;
      const title = btn.dataset.title;
      const deckName = btn.dataset.deck;
      if (title && deckName) deck.removeCardFromDeck(title, deckName);
    });
  }

  // --- Persona modal open (type-aware) ---
  const personaDisplay = document.getElementById('personaDisplay');
  if (personaDisplay) {
    personaDisplay.addEventListener('click', (e) => {
      const el = e.target.closest('[data-title]');
      if (!el) return;
      ui.openCardModal(el.dataset.title, el.dataset.type || null);
    });
  }

  // --- Modal close fixes ---
  if (modalCloseBtn) {
    modalCloseBtn.addEventListener('click', () => ui.closeCardModal());
  }

  // Tap outside modal content closes it
  if (cardModal) {
    cardModal.addEventListener('click', (e) => {
      if (e.target === cardModal) ui.closeCardModal();
    });
  }

  // ESC closes it
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') ui.closeCardModal();
  });
}
