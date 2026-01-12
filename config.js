// config.js

/* ============================================================================
   GLOBAL STATE
   ============================================================================ */

export let cardDatabase = [];
export let keywordDatabase = {};

// NOTE:
// cardTitleCache is legacy and COLLIDES if multiple cards share a title.
// We keep it for backwards compatibility, but DO NOT use it for persona logic.
export let cardTitleCache = {};

// NEW: type-aware cache to prevent Wrestler/Manager collisions
// cardTitleTypeCache[title][card_type] = card
export let cardTitleTypeCache = {};

export let startingDeck = [];
export let purchaseDeck = [];

/* ============================================================================
   PERSONA SELECTION
   ============================================================================ */

export let selectedWrestler = null;
export let selectedManager = null;
export let selectedCallName = null;
export let selectedFaction = null;

/* ============================================================================
   UI / FILTER STATE
   ============================================================================ */

export let activeFilters = [{}, {}, {}];
export let currentViewMode = 'grid';
export let currentSort = 'alpha-asc';
export let showZeroCost = true;
export let showNonZeroCost = true;
export let numGridColumns = 2;
export let lastFocusedElement = null;

/* ============================================================================
   CONSTANTS
   ============================================================================ */

export const CACHE_KEY = 'aewDeckBuilderCache';

/* ============================================================================
   BASIC SETTERS
   ============================================================================ */

export function setCardDatabase(db) {
    cardDatabase = db;
}

export function setKeywordDatabase(db) {
    keywordDatabase = db;
}

export function setStartingDeck(deck) {
    startingDeck = deck;
}

export function setPurchaseDeck(deck) {
    purchaseDeck = deck;
}

export function setSelectedWrestler(card) {
    selectedWrestler = card;
}

export function setSelectedManager(card) {
    selectedManager = card;
}

export function setSelectedCallName(card) {
    selectedCallName = card;
}

export function setSelectedFaction(card) {
    selectedFaction = card;
}

export function setActiveFilters(filters) {
    activeFilters = filters;
}

export function setCurrentViewMode(mode) {
    currentViewMode = mode;
}

export function setCurrentSort(sort) {
    currentSort = sort;
}

export function setShowZeroCost(value) {
    showZeroCost = value;
}

export function setShowNonZeroCost(value) {
    showNonZeroCost = value;
}

export function setNumGridColumns(num) {
    numGridColumns = num;
}

export function setLastFocusedElement(el) {
    lastFocusedElement = el;
}

/* ============================================================================
   UTILITIES
   ============================================================================ */

// REQUIRED by card-renderer.js
export function toPascalCase(str) {
    if (!str) return '';
    return String(str)
        .replace(/[_-]+/g, ' ')
        .replace(/\s+/g, ' ')
        .trim()
        .split(' ')
        .map(w => w.charAt(0).toUpperCase() + w.slice(1))
        .join(' ');
}

export function debounce(func, wait) {
    let timeout;
    return function (...args) {
        clearTimeout(timeout);
        timeout = setTimeout(() => func.apply(this, args), wait);
    };
}

/* ============================================================================
   CARD LOOKUP / CACHE
   ============================================================================ */

export function buildCardTitleCache() {
    cardTitleCache = {};
    cardTitleTypeCache = {};

    cardDatabase.forEach(card => {
        if (!card || !card.title) return;

        // Legacy cache (first one wins)
        if (!cardTitleCache[card.title]) {
            cardTitleCache[card.title] = card;
        }

        // Type-aware cache (NO collisions)
        if (!cardTitleTypeCache[card.title]) {
            cardTitleTypeCache[card.title] = {};
        }
        cardTitleTypeCache[card.title][card.card_type] = card;
    });
}

// SAFE lookup when titles collide (Ogogo fix)
export function getCardByTitleAndType(title, type) {
    if (!title || !type) return null;

    const byTitle = cardTitleTypeCache[title];
    if (byTitle && byTitle[type]) return byTitle[type];

    // Fallback: brute force (should be rare)
    return cardDatabase.find(
        c => c && c.title === title && c.card_type === type
    ) || null;
}

/* ============================================================================
   KIT HELPERS
   ============================================================================ */

export function isKitCard(card) {
    return (
        card &&
        typeof card['Wrestler Kit'] === 'string' &&
        card['Wrestler Kit'].toUpperCase() === 'TRUE'
    );
}

/* ============================================================================
   CACHE PERSISTENCE
   ============================================================================ */

export function saveStateToCache() {
    const payload = {
        wrestler: selectedWrestler ? selectedWrestler.title : null,
        manager: selectedManager ? selectedManager.title : null,
        callName: selectedCallName ? selectedCallName.title : null,
        faction: selectedFaction ? selectedFaction.title : null,
        startingDeck,
        purchaseDeck
    };

    try {
        localStorage.setItem(CACHE_KEY, JSON.stringify(payload));
    } catch (e) {
        console.warn('Failed to save state:', e);
    }
}
