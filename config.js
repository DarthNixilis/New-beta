// config.js

// STATE MANAGEMENT
let cardDatabase = [];
let cardTitleCache = {};
let keywordDatabase = {};
let selectedWrestler = null;
let selectedManager = null;
let selectedCallName = null;
let selectedFaction = null;
let startingDeck = [];
let purchaseDeck = [];
let currentViewMode = 'list';
let currentSort = 'alpha-asc';
let numGridColumns = 3;
let showZeroCost = true;
let showNonZeroCost = true;
let activeFilters = [{}, {}, {}];
let lastFocusedElement = null;

// UTILITY FUNCTIONS
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
    return str.replace(/\w\S*/g, txt => txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase()).replace(/\s+/g, '');
}

// Helper to get kit persona name
export function getKitPersona(card) {
    if (!card) return '';
    
    // Check if it's a kit card by looking for Starting field
    if (card['Starting'] && card['Starting'].trim() !== '') {
        // Return the persona name from Starting
        return card['Starting'].trim();
    }
    
    // Check if it's a persona card itself
    if (card.card_type === 'Wrestler' || card.card_type === 'Manager') {
        // Extract persona name from title
        const title = card.title || '';
        return title.replace(' Wrestler', '').replace(' Manager', '').trim();
    }
    
    return '';
}

// Check if a card is a kit/signature card
export function isKitCard(card) {
    if (!card) return false;
    
    // Check for Starting field
    if (card['Starting'] && card['Starting'].trim() !== '') {
        return true;
    }
    
    // Check for Wrestler Kit field
    if (card['Wrestler Kit'] === 'TRUE' || card['Wrestler Kit'] === true) {
        return true;
    }
    
    // Check for Signature For field
    if (card['Signature For'] && card['Signature For'].trim() !== '') {
        return true;
    }
    
    return false;
}

// Get the persona this card is a signature for
export function isSignatureFor(card) {
    if (!card) return false;
    
    // Check if this card is a signature for a persona
    if (isKitCard(card) && card['Starting'] && card['Starting'].trim() !== '') {
        // Find if there's a persona with this name
        const personaTitle = card['Starting'].trim();
        return cardDatabase.some(personaCard => 
            personaCard.title === personaTitle && 
            ['Wrestler', 'Manager'].includes(personaCard.card_type)
        );
    }
    
    return false;
}

// Get card target for maneuvers
export function getCardTarget(card) {
    if (!card) return '';
    
    // First check the Target field from TSV
    if (card['Target'] && card['Target'].trim() !== '') {
        return card['Target'].trim();
    }
    
    // Then check text_box.traits for Target trait
    if (card.text_box?.traits) {
        const targetTrait = card.text_box.traits.find(t => 
            t.name && t.name.trim().toLowerCase() === 'target'
        );
        if (targetTrait && targetTrait.value) {
            return targetTrait.value.trim();
        }
    }
    
    return '';
}

// SETTERS
export function setCardDatabase(db) { cardDatabase = db; }
export function setCardTitleCache(cache) { cardTitleCache = cache; }
export function setKeywordDatabase(keywords) { keywordDatabase = keywords; }
export function setSelectedWrestler(wrestler) { selectedWrestler = wrestler; }
export function setSelectedManager(manager) { selectedManager = manager; }
export function setSelectedCallName(callName) { selectedCallName = callName; }
export function setSelectedFaction(faction) { selectedFaction = faction; }
export function setStartingDeck(deck) { startingDeck = deck; }
export function setPurchaseDeck(deck) { purchaseDeck = deck; }
export function setCurrentViewMode(mode) { currentViewMode = mode; }
export function setCurrentSort(sort) { currentSort = sort; }
export function setNumGridColumns(cols) { numGridColumns = cols; }
export function setShowZeroCost(show) { showZeroCost = show; }
export function setShowNonZeroCost(show) { showNonZeroCost = show; }
export function setActiveFilters(filters) { activeFilters = filters; }
export function setLastFocusedElement(element) { lastFocusedElement = element; }

// GETTERS
export function getCardDatabase() { return cardDatabase; }
export function getCardTitleCache() { return cardTitleCache; }
export function getKeywordDatabase() { return keywordDatabase; }
export function getSelectedWrestler() { return selectedWrestler; }
export function getSelectedManager() { return selectedManager; }
export function getSelectedCallName() { return selectedCallName; }
export function getSelectedFaction() { return selectedFaction; }
export function getStartingDeck() { return startingDeck; }
export function getPurchaseDeck() { return purchaseDeck; }
export function getCurrentViewMode() { return currentViewMode; }
export function getCurrentSort() { return currentSort; }
export function getNumGridColumns() { return numGridColumns; }
export function getShowZeroCost() { return showZeroCost; }
export function getShowNonZeroCost() { return showNonZeroCost; }
export function getActiveFilters() { return activeFilters; }
export function getLastFocusedElement() { return lastFocusedElement; }

// Build cache of card titles for quick lookup
export function buildCardTitleCache() {
    cardTitleCache = {};
    cardDatabase.forEach(card => {
        if (card && card.title) {
            cardTitleCache[card.title] = card;
        }
    });
}

// Save state to localStorage for persistence
export function saveStateToCache() {
    try {
        const state = {
            selectedWrestlerTitle: selectedWrestler ? selectedWrestler.title : null,
            selectedManagerTitle: selectedManager ? selectedManager.title : null,
            selectedCallNameTitle: selectedCallName ? selectedCallName.title : null,
            selectedFactionTitle: selectedFaction ? selectedFaction.title : null,
            startingDeck: startingDeck,
            purchaseDeck: purchaseDeck,
            currentSort: currentSort,
            numGridColumns: numGridColumns,
            showZeroCost: showZeroCost,
            showNonZeroCost: showNonZeroCost,
            activeFilters: activeFilters
        };
        localStorage.setItem('aewDeckState', JSON.stringify(state));
    } catch (e) {
        console.error("Failed to save state:", e);
    }
}

// Load state from localStorage
export function loadStateFromCache() {
    try {
        const saved = localStorage.getItem('aewDeckState');
        if (saved) {
            const state = JSON.parse(saved);
            
            // Restore simple values
            currentSort = state.currentSort || 'alpha-asc';
            numGridColumns = state.numGridColumns || 3;
            showZeroCost = state.showZeroCost !== undefined ? state.showZeroCost : true;
            showNonZeroCost = state.showNonZeroCost !== undefined ? state.showNonZeroCost : true;
            activeFilters = state.activeFilters || [{}, {}, {}];
            
            // Restore decks
            startingDeck = state.startingDeck || [];
            purchaseDeck = state.purchaseDeck || [];
            
            // Return the persona titles to be restored after card database loads
            return {
                wrestlerTitle: state.selectedWrestlerTitle,
                managerTitle: state.selectedManagerTitle,
                callNameTitle: state.selectedCallNameTitle,
                factionTitle: state.selectedFactionTitle
            };
        }
    } catch (e) {
        console.error("Failed to load state:", e);
    }
    return null;
}

// Restore selected personas after card database loads
export function restoreSelectedPersonas(wrestlerTitle, managerTitle, callNameTitle, factionTitle) {
    if (wrestlerTitle && cardTitleCache[wrestlerTitle]) {
        selectedWrestler = cardTitleCache[wrestlerTitle];
    }
    if (managerTitle && cardTitleCache[managerTitle]) {
        selectedManager = cardTitleCache[managerTitle];
    }
    if (callNameTitle && cardTitleCache[callNameTitle]) {
        selectedCallName = cardTitleCache[callNameTitle];
    }
    if (factionTitle && cardTitleCache[factionTitle]) {
        selectedFaction = cardTitleCache[factionTitle];
    }
}
