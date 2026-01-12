// config.js
export let cardDatabase = [];
export let keywordDatabase = {};

// NOTE: cardTitleCache[title] can collide if multiple cards share the same title.
// We keep it for backwards compatibility, but DO NOT use it for persona lookups.
export let cardTitleCache = {};
export let cardTitleTypeCache = {}; // NEW: cardTitleTypeCache[title][type] = card

export let startingDeck = [];
export let purchaseDeck = [];

export let selectedWrestler = null;
export let selectedManager = null;
export let selectedCallName = null;  // NEW
export let selectedFaction = null;   // NEW

export let activeFilters = [{}, {}, {}];
export let currentViewMode = 'grid';
export let currentSort = 'alpha-asc';
export let showZeroCost = true;
export let showNonZeroCost = true;
export let numGridColumns = 2;
export let lastFocusedElement;

export const CACHE_KEY = 'aewDeckBuilderCache';

export function setCardDatabase(db) { cardDatabase = db; }
export function setKeywordDatabase(db) { keywordDatabase = db; }

export function setStartingDeck(deck) { startingDeck = deck; }
export function setPurchaseDeck(deck) { purchaseDeck = deck; }

export function setSelectedWrestler(wrestler) { selectedWrestler = wrestler; }
export function setSelectedManager(manager) { selectedManager = manager; }
export function setSelectedCallName(callName) { selectedCallName = callName; } // NEW
export function setSelectedFaction(faction) { selectedFaction = faction; }     // NEW

export function setActiveFilters(filters) { activeFilters = filters; }
export function setCurrentViewMode(mode) { currentViewMode = mode; }
export function setCurrentSort(sort) { currentSort = sort; }
export function setShowZeroCost(value) { showZeroCost = value; }
export function setShowNonZeroCost(value) { showNonZeroCost = value; }
export function setNumGridColumns(num) { numGridColumns = num; }
export function setLastFocusedElement(el) { lastFocusedElement = el; }

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

export function saveStateToCache() {
    const s = {
        wrestler: selectedWrestler ? selectedWrestler.title : null,
        manager: selectedManager ? selectedManager.title : null,
        callName: selectedCallName ? selectedCallName.title : null, // NEW
        faction: selectedFaction ? selectedFaction.title : null,     // NEW
        startingDeck,
        purchaseDeck
    };
    localStorage.setItem(CACHE_KEY, JSON.stringify(s));
}

export function buildCardTitleCache() {
    cardTitleCache = {};
    cardTitleTypeCache = {};

    cardDatabase.forEach(card => {
        if (!card || !card.title) return;

        // Simple cache: first one wins (keeps older behavior)
        if (!cardTitleCache[card.title]) {
            cardTitleCache[card.title] = card;
        }

        // Type-aware cache: NO collisions
        if (!cardTitleTypeCache[card.title]) cardTitleTypeCache[card.title] = {};
        cardTitleTypeCache[card.title][card.card_type] = card;
    });
}

// NEW: Safe lookup for duplicates
export function getCardByTitleAndType(title, type) {
    if (!title || !type) return null;
    const byTitle = cardTitleTypeCache[title];
    if (byTitle && byTitle[type]) return byTitle[type];

    // Fallback: scan db (should be rare)
    return cardDatabase.find(c => c && c.title === title && c.card_type === type) || null;
}

export function isKitCard(card) {
    return card && typeof card['Wrestler Kit'] === 'string' && card['Wrestler Kit'].toUpperCase() === 'TRUE';
}
