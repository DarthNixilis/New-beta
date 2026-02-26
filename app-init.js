// app-init.js
import * as state from './config.js';
import * as ui from './ui.js';
import * as filters from './filters.js';
import { initializeAllEventListeners } from './listeners.js';

// Minimums (edit here if they change)
const MIN_STARTING_DECK = 24;
const MIN_PURCHASE_DECK = 36;

export function initializeApp() {
  window.updateDeckCountColors = updateDeckCountColors;
  window.applyDeckViewSettings = applyDeckViewSettings;

  injectDeckGridCSS();
  ensureDeckViewControlsExist();

  populatePersonaSelectors();

  state.loadStateFromCache?.();

  setupInitialUI();
  addDeckSearchFunctionality();
  filters.renderCascadingFilters();

  ui.renderDecks();
  ui.renderPersonaDisplay();

  initializeAllEventListeners(refreshCardPool);
  refreshCardPool();

  updateDeckCountColors();
  applyDeckViewSettings();
}

function updateDeckCountColors() {
  const startingCountEl = document.getElementById('startingDeckCount');
  const purchaseCountEl = document.getElementById('purchaseDeckCount');

  if (startingCountEl) {
    const n = Array.isArray(state.startingDeck) ? state.startingDeck.length : 0;
    startingCountEl.style.color = getMinColor(n, MIN_STARTING_DECK);
  }

  if (purchaseCountEl) {
    const n = Array.isArray(state.purchaseDeck) ? state.purchaseDeck.length : 0;
    purchaseCountEl.style.color = getMinColor(n, MIN_PURCHASE_DECK);
  }
}

function getMinColor(count, min) {
  if (count < min) return 'red';
  if (count === min) return 'green';
  return 'gold';
}

// --------------------
// Deck panel grid view
// --------------------
function injectDeckGridCSS() {
  if (document.getElementById('deckGridInjectedCSS')) return;

  const style = document.createElement('style');
  style.id = 'deckGridInjectedCSS';
  style.textContent = `
    .deck-view-controls {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 10px;
      margin: 10px 0 12px 0;
      padding: 8px 10px;
      border: 1px solid #ddd;
      border-radius: 8px;
      background: rgba(0,0,0,0.03);
    }

    .deck-view-controls .deck-grid-size-controls button {
      margin-left: 6px;
      padding: 6px 10px;
      border-radius: 6px;
      border: 1px solid #bbb;
      cursor: pointer;
    }

    .deck-view-controls .deck-grid-size-controls button.active {
      outline: 2px solid rgba(0,0,0,0.25);
      font-weight: 700;
    }

    .deck-view-controls button {
      padding: 8px 12px;
      border-radius: 6px;
      border: 1px solid #bbb;
      cursor: pointer;
    }

    /* Deck list grid mode */
    .deck-list-small.deck-grid {
      display: grid !important;
      grid-template-columns: repeat(var(--deck-cols, 2), minmax(0, 1fr));
      gap: 10px;
      align-content: start;

      /* ✅ critical: remove the 120px cap so full text can exist */
      height: auto !important;
      max-height: 65vh;         /* still scrolls */
      overflow-y: auto !important;
    }

    /* Tile wrapper (the element we render in ui.js) */
    .deck-card-tile {
      border: 1px solid rgba(0,0,0,0.12);
      border-radius: 10px;
      padding: 10px 10px;
      background: rgba(255,255,255,0.9);
      min-width: 0;
      display: flex;
      flex-direction: column;
      gap: 6px;
    }

    .deck-tile-title {
      font-weight: 700;
      cursor: pointer;
      line-height: 1.2;
    }

    .deck-tile-stats {
      font-size: 12px;
      font-weight: 700;
      opacity: 0.85;
    }

    .deck-tile-kit {
      font-size: 11px;
      color: #666;
      font-style: italic;
    }

    .deck-tile-rules {
      font-size: 12px;
      line-height: 1.25;
      white-space: pre-wrap;
      overflow-wrap: anywhere;
      word-break: break-word;
      border-top: 1px solid rgba(0,0,0,0.08);
      padding-top: 6px;
    }

    .deck-tile-rules-empty {
      opacity: 0.6;
      font-style: italic;
    }

    .deck-tile-remove {
      margin-top: 6px;
      width: 100%;
      padding: 8px;
      border-radius: 6px;
      cursor: pointer;
      background: #dc3545;
      color: #fff;
      border: none;
      white-space: nowrap;
    }

    /* In list mode, keep your original height behavior */
    .deck-list-small:not(.deck-grid) {
      height: 120px;
      overflow-y: auto;
    }
  `;
  document.head.appendChild(style);
}

function ensureDeckViewControlsExist() {
  const deckPanel = document.querySelector('.deck-panel');
  if (!deckPanel) return;

  if (document.getElementById('deckViewModeToggle')) return;

  const personaDisplay = document.getElementById('personaDisplay');

  const controls = document.createElement('div');
  controls.className = 'deck-view-controls';

  const left = document.createElement('div');
  left.style.display = 'flex';
  left.style.alignItems = 'center';
  left.style.gap = '10px';

  const toggleBtn = document.createElement('button');
  toggleBtn.id = 'deckViewModeToggle';
  toggleBtn.textContent = 'Deck: Switch to Grid View';
  left.appendChild(toggleBtn);

  const right = document.createElement('div');
  right.className = 'deck-grid-size-controls';
  right.id = 'deckGridSizeControls';

  const label = document.createElement('span');
  label.textContent = 'Deck Columns:';
  right.appendChild(label);

  [1, 2, 3, 4].forEach(n => {
    const b = document.createElement('button');
    b.type = 'button';
    b.dataset.columns = String(n);
    b.textContent = String(n);
    right.appendChild(b);
  });

  controls.appendChild(left);
  controls.appendChild(right);

  if (personaDisplay && personaDisplay.parentNode === deckPanel) {
    deckPanel.insertBefore(controls, personaDisplay.nextSibling);
  } else {
    deckPanel.insertBefore(controls, deckPanel.firstChild);
  }
}

function applyDeckViewSettings() {
  const startingDeckList = document.getElementById('startingDeckList');
  const purchaseDeckList = document.getElementById('purchaseDeckList');
  const toggleBtn = document.getElementById('deckViewModeToggle');
  const gridSizeControls = document.getElementById('deckGridSizeControls');

  const mode = state.deckViewMode || 'list';
  const cols = Number(state.deckGridColumns || 2);

  [startingDeckList, purchaseDeckList].forEach(listEl => {
    if (!listEl) return;
    listEl.style.setProperty('--deck-cols', String(cols));
    if (mode === 'grid') listEl.classList.add('deck-grid');
    else listEl.classList.remove('deck-grid');
  });

  if (toggleBtn) {
    toggleBtn.textContent = (mode === 'grid') ? 'Deck: Switch to List View' : 'Deck: Switch to Grid View';
  }

  if (gridSizeControls) {
    gridSizeControls.querySelectorAll('button[data-columns]').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.columns === String(cols));
    });
  }
}

// --------------------
// Existing functions
// --------------------
function populatePersonaSelectors() {
  const wrestlerSelect = document.getElementById('wrestlerSelect');
  const managerSelect = document.getElementById('managerSelect');
  const callNameSelect = document.getElementById('callNameSelect');
  const factionSelect = document.getElementById('factionSelect');

  wrestlerSelect.length = 1;
  managerSelect.length = 1;
  if (callNameSelect) callNameSelect.length = 1;
  if (factionSelect) factionSelect.length = 1;

  const wrestlers = state.cardDatabase
    .filter(c => c && c.card_type === 'Wrestler')
    .sort((a, b) => a.title.localeCompare(b.title));
  const managers = state.cardDatabase
    .filter(c => c && c.card_type === 'Manager')
    .sort((a, b) => a.title.localeCompare(b.title));
  const callNames = state.cardDatabase
    .filter(c => c && c.card_type === 'Call Name')
    .sort((a, b) => a.title.localeCompare(b.title));
  const factions = state.cardDatabase
    .filter(c => c && c.card_type === 'Faction')
    .sort((a, b) => a.title.localeCompare(b.title));

  wrestlers.forEach(w => wrestlerSelect.add(new Option(w.title, w.title)));
  managers.forEach(m => managerSelect.add(new Option(m.title, m.title)));
  if (callNameSelect) callNames.forEach(cn => callNameSelect.add(new Option(cn.title, cn.title)));
  if (factionSelect) factions.forEach(f => factionSelect.add(new Option(f.title, f.title)));
}

function setupInitialUI() {
  const viewModeToggle = document.getElementById('viewModeToggle');
  const gridSizeControls = document.getElementById('gridSizeControls');

  viewModeToggle.textContent = state.currentViewMode === 'list' ? 'Switch to Grid View' : 'Switch to List View';
  const activeGridButton = gridSizeControls.querySelector(`[data-columns="${state.numGridColumns}"]`);
  if (activeGridButton) activeGridButton.classList.add('active');
}

function addDeckSearchFunctionality() {
  const startingDeckList = document.getElementById('startingDeckList');
  const purchaseDeckList = document.getElementById('purchaseDeckList');

  if (!startingDeckList || !purchaseDeckList) return;
  if (startingDeckList.previousElementSibling?.classList?.contains('deck-search-input')) return;

  const startingDeckSearch = document.createElement('input');
  startingDeckSearch.type = 'text';
  startingDeckSearch.placeholder = 'Search starting deck...';
  startingDeckSearch.className = 'deck-search-input';
  startingDeckSearch.addEventListener(
    'input',
    state.debounce(() => ui.filterDeckList(startingDeckList, startingDeckSearch.value), 300)
  );

  const purchaseDeckSearch = document.createElement('input');
  purchaseDeckSearch.type = 'text';
  purchaseDeckSearch.placeholder = 'Search purchase deck...';
  purchaseDeckSearch.className = 'deck-search-input';
  purchaseDeckSearch.addEventListener(
    'input',
    state.debounce(() => ui.filterDeckList(purchaseDeckList, purchaseDeckSearch.value), 300)
  );

  startingDeckList.parentNode.insertBefore(startingDeckSearch, startingDeckList);
  purchaseDeckList.parentNode.insertBefore(purchaseDeckSearch, purchaseDeckList);
}

export function refreshCardPool() {
  const finalCards = filters.getFilteredAndSortedCardPool();
  ui.renderCardPool(finalCards);
}
