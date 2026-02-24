// config.js

// ✅ EXPORT STATE BINDINGS
export let cardDatabase = [];
export let cardTitleCache = {};
export let keywordDatabase = {};

export let selectedWrestler = null;
export let selectedManager = null;
export let selectedCallName = null;
export let selectedFaction = null;

export let startingDeck = [];
export let purchaseDeck = [];

export let currentViewMode = 'list';
export let currentSort = 'alpha-asc';
export let numGridColumns = 3;

export let showZeroCost = true;
export let showNonZeroCost = true;

export let activeFilters = [{}, {}, {}];
export let lastFocusedElement = null;

// ✅ NEW: Deck panel view settings
export let deckViewMode = 'list';      // 'list' | 'grid'
export let deckGridColumns = 2;        // 1..4 recommended

// ✅ Available sets
export let availableSets = [];
export function setAvailableSets(sets) {
  availableSets = Array.isArray(sets) ? sets : [];
}

// --------------------
// CONSTANTS
// --------------------
export const CACHE_KEY = 'aewDeckBuilderCache';

// --------------------
// UTILITY FUNCTIONS
// --------------------
export function debounce(func, wait) {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}

export function toPascalCase(str) {
  if (!str) return '';
  return str
    .replace(/\w\S*/g, txt => txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase())
    .replace(/\s+/g, '');
}

// --------------------
// CARD HELPERS
// --------------------
export function getKitPersona(card) {
  if (!card) return '';
  if (card['Starting'] && card['Starting'].trim() !== '') return card['Starting'].trim();
  if (card.card_type === 'Wrestler' || card.card_type === 'Manager') {
    const title = card.title || '';
    return title.replace(' Wrestler', '').replace(' Manager', '').trim();
  }
  return '';
}

export function isKitCard(card) {
  if (!card) return false;
  if (card['Starting'] && card['Starting'].trim() !== '') return true;
  if (card['Wrestler Kit'] === 'TRUE' || card['Wrestler Kit'] === true) return true;
  if (card['Signature For'] && card['Signature For'].trim() !== '') return true;
  return false;
}

export function isSignatureFor(card) {
  if (!card) return false;
  if (isKitCard(card) && card['Starting'] && card['Starting'].trim() !== '') {
    const personaTitle = card['Starting'].trim();
    return cardDatabase.some(personaCard =>
      personaCard.title === personaTitle &&
      ['Wrestler', 'Manager'].includes(personaCard.card_type)
    );
  }
  return false;
}

export function getCardTarget(card) {
  if (!card) return '';
  if (card['Target'] && card['Target'].trim() !== '') return card['Target'].trim();

  if (card.text_box?.traits) {
    const targetTrait = card.text_box.traits.find(
      t => t.name && t.name.trim().toLowerCase() === 'target'
    );
    if (targetTrait && targetTrait.value) return targetTrait.value.trim();
  }
  return '';
}

// --------------------
// INTERNAL NOTIFY HELPERS
// --------------------
function notifyDeckCountsChanged() {
  try {
    if (typeof window !== 'undefined' && typeof window.updateDeckCountColors === 'function') {
      window.updateDeckCountColors();
    }
  } catch (e) {
    console.warn('updateDeckCountColors failed:', e);
  }
}

function notifyDeckViewChanged() {
  try {
    if (typeof window !== 'undefined' && typeof window.applyDeckViewSettings === 'function') {
      window.applyDeckViewSettings();
    }
  } catch (e) {
    console.warn('applyDeckViewSettings failed:', e);
  }
}

// --------------------
// SETTERS
// --------------------
export function setCardDatabase(db) { cardDatabase = db; }
export function setCardTitleCache(cache) { cardTitleCache = cache; }
export function setKeywordDatabase(keywords) { keywordDatabase = keywords; }

export function setSelectedWrestler(wrestler) { selectedWrestler = wrestler; }
export function setSelectedManager(manager) { selectedManager = manager; }
export function setSelectedCallName(callName) { selectedCallName = callName; }
export function setSelectedFaction(faction) { selectedFaction = faction; }

export function setStartingDeck(deck) {
  startingDeck = deck;
  notifyDeckCountsChanged();
}
export function setPurchaseDeck(deck) {
  purchaseDeck = deck;
  notifyDeckCountsChanged();
}

export function setCurrentViewMode(mode) { currentViewMode = mode; }
export function setCurrentSort(sort) { currentSort = sort; }
export function setNumGridColumns(cols) { numGridColumns = Number(cols); }

export function setShowZeroCost(show) { showZeroCost = !!show; }
export function setShowNonZeroCost(show) { showNonZeroCost = !!show; }

export function setActiveFilters(filters) { activeFilters = filters; }
export function setLastFocusedElement(element) { lastFocusedElement = element; }

// ✅ NEW: deck panel view setters
export function setDeckViewMode(mode) {
  deckViewMode = (mode === 'grid') ? 'grid' : 'list';
  notifyDeckViewChanged();
}
export function setDeckGridColumns(cols) {
  const n = Math.max(1, Math.min(6, Number(cols) || 2));
  deckGridColumns = n;
  notifyDeckViewChanged();
}

// --------------------
// BUILD CACHE
// --------------------
export function buildCardTitleCache() {
  cardTitleCache = {};
  cardDatabase.forEach(card => {
    if (card && card.title) cardTitleCache[card.title] = card;
  });
}

// --------------------
// CACHING / RESTORE
// --------------------
export function saveStateToCache() {
  try {
    const stateObj = {
      selectedWrestlerTitle: selectedWrestler ? selectedWrestler.title : null,
      selectedManagerTitle: selectedManager ? selectedManager.title : null,
      selectedCallNameTitle: selectedCallName ? selectedCallName.title : null,
      selectedFactionTitle: selectedFaction ? selectedFaction.title : null,
      startingDeck,
      purchaseDeck,
      currentSort,
      numGridColumns,
      showZeroCost,
      showNonZeroCost,
      activeFilters,

      // ✅ NEW
      deckViewMode,
      deckGridColumns
    };
    localStorage.setItem(CACHE_KEY, JSON.stringify(stateObj));
  } catch (e) {
    console.error("Failed to save state:", e);
  }
}

export function loadStateFromCache() {
  try {
    const saved = localStorage.getItem(CACHE_KEY);
    if (!saved) return null;

    const stateObj = JSON.parse(saved);

    currentSort = stateObj.currentSort || 'alpha-asc';
    numGridColumns = stateObj.numGridColumns || 3;

    showZeroCost = stateObj.showZeroCost !== undefined ? stateObj.showZeroCost : true;
    showNonZeroCost = stateObj.showNonZeroCost !== undefined ? stateObj.showNonZeroCost : true;
    activeFilters = stateObj.activeFilters || [{}, {}, {}];

    startingDeck = stateObj.startingDeck || [];
    purchaseDeck = stateObj.purchaseDeck || [];

    // ✅ NEW restore
    deckViewMode = (stateObj.deckViewMode === 'grid') ? 'grid' : 'list';
    deckGridColumns = Number.isFinite(stateObj.deckGridColumns) ? stateObj.deckGridColumns : 2;

    notifyDeckCountsChanged();
    notifyDeckViewChanged();

    return {
      wrestlerTitle: stateObj.selectedWrestlerTitle,
      managerTitle: stateObj.selectedManagerTitle,
      callNameTitle: stateObj.selectedCallNameTitle,
      factionTitle: stateObj.selectedFactionTitle
    };
  } catch (e) {
    console.error("Failed to load state:", e);
    return null;
  }
}

export function restoreSelectedPersonas(wrestlerTitle, managerTitle, callNameTitle, factionTitle) {
  if (wrestlerTitle && cardTitleCache[wrestlerTitle]) selectedWrestler = cardTitleCache[wrestlerTitle];
  if (managerTitle && cardTitleCache[managerTitle]) selectedManager = cardTitleCache[managerTitle];
  if (callNameTitle && cardTitleCache[callNameTitle]) selectedCallName = cardTitleCache[callNameTitle];
  if (factionTitle && cardTitleCache[factionTitle]) selectedFaction = cardTitleCache[factionTitle];
}