// config.js
export let cardDatabase = [];
export let keywordDatabase = {};
export let cardTitleCache = {};
export let startingDeck = [];
export let purchaseDeck = [];
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

export function setCardDatabase(db) { cardDatabase = db; }
export function setKeywordDatabase(db) { keywordDatabase = db; }
export function setStartingDeck(deck) { startingDeck = deck; }
export function setPurchaseDeck(deck) { purchaseDeck = deck; }
export function setSelectedWrestler(wrestler) { selectedWrestler = wrestler; }
export function setSelectedManager(manager) { selectedManager = manager; }
export function setSelectedCallName(callName) { selectedCallName = callName; }
export function setSelectedFaction(faction) { selectedFaction = faction; }
export function setActiveFilters(filters) { activeFilters = filters; }
export function setCurrentViewMode(mode) { currentViewMode = mode; }
export function setCurrentSort(sort) { currentSort = sort; }
export function setShowZeroCost(value) { showZeroCost = value; }
export function setShowNonZeroCost(value) { showNonZeroCost = value; }
export function setNumGridColumns(num) { numGridColumns = num; }
export function setLastFocusedElement(el) { lastFocusedElement = el; }

export function toPascalCase(str) {
    if (!str) return '';
    return str.replace(/[^a-zA-Z0-9\s]+/g, '').split(/\s+/).map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()).join('');
}

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
    const stateToSave = {
        wrestler: selectedWrestler ? selectedWrestler.title : null,
        manager: selectedManager ? selectedManager.title : null,
        callName: selectedCallName ? selectedCallName.title : null,
        faction: selectedFaction ? selectedFaction.title : null,
        startingDeck: startingDeck,
        purchaseDeck: purchaseDeck
    };
    localStorage.setItem(CACHE_KEY, JSON.stringify(stateToSave));
}

export function buildCardTitleCache() {
    cardTitleCache = {};
    cardDatabase.forEach(card => {
        if (card && card.title) {
            cardTitleCache[card.title] = card;
        }
    });
}

export function isKitCard(card) {
    // Check if Starting column has a value (persona name)
    return card && card['Starting'] && card['Starting'].trim() !== '';
}

export function isSignatureFor(card) {
    if (!card || !card['Starting']) return false;
    const personaName = card['Starting'].trim();
    if (!personaName) return false;
    
    const activePersonaTitles = [];
    if (selectedWrestler) activePersonaTitles.push(selectedWrestler.title);
    if (selectedManager) activePersonaTitles.push(selectedManager.title);
    if (selectedCallName) activePersonaTitles.push(selectedCallName.title);
    if (selectedFaction) activePersonaTitles.push(selectedFaction.title);
    
    return activePersonaTitles.includes(personaName);
}

// Get card target for maneuvers - SAFE VERSION
export function getCardTarget(card) {
    try {
        if (!card || !card.text_box || !card.text_box.traits) return null;
        const targetTrait = card.text_box.traits.find(t => t && t.name && t.name.trim() === 'Target');
        return targetTrait && targetTrait.value ? targetTrait.value : null;
    } catch (e) {
        console.error("Error getting card target:", e, card);
        return null;
    }
}

// Get kit persona name (without "Wrestler") - SAFE VERSION
export function getKitPersona(card) {
    try {
        if (!card) return null;
        
        // First try Starting column
        if (card['Starting'] && card['Starting'].trim() !== '') {
            const personaName = card['Starting'].trim();
            // Remove "Wrestler" suffix if present
            return personaName.replace(/\s*Wrestler$/, '');
        }
        
        // Fallback to Signature For if Starting doesn't exist
        if (card['Signature For'] && card['Signature For'].trim() !== '') {
            const personaName = card['Signature For'].trim();
            return personaName.replace(/\s*Wrestler$/, '');
        }
        
        return null;
    } catch (e) {
        console.error("Error getting kit persona:", e, card);
        return null;
    }
}
