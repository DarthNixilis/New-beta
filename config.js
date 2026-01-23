// config.js

export let cardDatabase = [];
export let keywordDatabase = {};
export let cardTitleCache = {};

export let startingDeck = [];
export let purchaseDeck = [];

// Persona slots
export let selectedWrestler = null;
export let selectedManager = null;
export let selectedCallName = null;
export let selectedFaction = null;

export let activeFilters = [{}, {}, {}];
export let currentViewMode = 'grid';
export let currentSort = 'alpha-asc';
export let showZeroCost = true;
export let showNonZeroCost = true;
export let numGridColumns = 2;

export let lastFocusedElement;

export const CACHE_KEY = 'aewDeckBuilderCache';

// --------------------
// Setters
// --------------------
export function setCardDatabase(db) { cardDatabase = db; }
export function setKeywordDatabase(db) { keywordDatabase = db; }
export function setStartingDeck(deck) { startingDeck = deck; }
export function setPurchaseDeck(deck) { purchaseDeck = deck; }

export function setSelectedWrestler(w) { selectedWrestler = w; }
export function setSelectedManager(m) { selectedManager = m; }
export function setSelectedCallName(c) { selectedCallName = c; }
export function setSelectedFaction(f) { selectedFaction = f; }

export function setActiveFilters(filters) { activeFilters = filters; }
export function setCurrentViewMode(mode) { currentViewMode = mode; }
export function setCurrentSort(sort) { currentSort = sort; }
export function setShowZeroCost(value) { showZeroCost = value; }
export function setShowNonZeroCost(value) { showNonZeroCost = value; }
export function setNumGridColumns(num) { numGridColumns = num; }
export function setLastFocusedElement(el) { lastFocusedElement = el; }

// --------------------
// Utilities
// --------------------
export function toPascalCase(str) {
    if (!str) return '';
    return str
        .replace(/[^a-zA-Z0-9\s]+/g, '')
        .split(/\s+/)
        .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
        .join('');
}

export function debounce(func, wait) {
    let timeout;
    return function (...args) {
        clearTimeout(timeout);
        timeout = setTimeout(() => func(...args), wait);
    };
}

// --------------------
// Cache
// --------------------
export function saveStateToCache() {
    const state = {
        wrestler: selectedWrestler?.title ?? null,
        manager: selectedManager?.title ?? null,
        callName: selectedCallName?.title ?? null,
        faction: selectedFaction?.title ?? null,
        startingDeck,
        purchaseDeck
    };
    localStorage.setItem(CACHE_KEY, JSON.stringify(state));
}

// --------------------
// Card helpers
// --------------------
export function buildCardTitleCache() {
    cardTitleCache = {};
    cardDatabase.forEach(card => {
        if (card?.title) cardTitleCache[card.title] = card;
    });
}

export function isKitCard(card) {
    return (
        card &&
        typeof card['Wrestler Kit'] === 'string' &&
        card['Wrestler Kit'].toUpperCase() === 'TRUE'
    );
}

export function isSignatureFor(card) {
    if (!card || !card['Signature For']) return false;

    const activePersonaTitles = [];

    if (selectedWrestler) activePersonaTitles.push(selectedWrestler.title);
    if (selectedManager) activePersonaTitles.push(selectedManager.title);
    if (selectedCallName) activePersonaTitles.push(selectedCallName.title);
    if (selectedFaction) activePersonaTitles.push(selectedFaction.title);

    return activePersonaTitles.includes(card['Signature For']);
}
