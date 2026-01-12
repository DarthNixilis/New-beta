// listeners.js
import * as state from './config.js';
import * as ui from './ui.js';
import * as deck from './deck.js';
import { getFilteredAndSortedCardPool } from './filters.js';
import { exportDeckAsText, exportDeckAsImages, exportAllCardsAsImages, exportDeckAsLackeyText } from './exporter.js';

export function initializeAllEventListeners(refreshCardPool) {
    const wrestlerSelect = document.getElementById('wrestlerSelect');
    const managerSelect = document.getElementById('managerSelect');
    const callNameSelect = document.getElementById('callNameSelect'); // NEW
    const factionSelect = document.getElementById('factionSelect');   // NEW

    const searchResults = document.getElementById('searchResults');
    const startingDeckList = document.getElementById('startingDeckList');
    const purchaseDeckList = document.getElementById('purchaseDeckList');
    const personaDisplay = document.getElementById('personaDisplay');

    const clearDeckBtn = document.getElementById('clearDeck');
    const exportDeckBtn = document.getElementById('exportDeck');
    const exportAsImageBtn = document.getElementById('exportAsImageBtn');
    const exportAllCardsBtn = document.getElementById('exportAllCards');
    const exportLackeyBtn = document.getElementById('exportLackeyBtn');

    // Persona selection (FIXED: type-aware lookup)
    wrestlerSelect.addEventListener('change', (e) => {
        const title = e.target.value;
        state.setSelectedWrestler(title ? state.getCardByTitleAndType(title, 'Wrestler') : null);
        ui.renderPersonaDisplay();
        refreshCardPool();
        state.saveStateToCache();
    });

    managerSelect.addEventListener('change', (e) => {
        const title = e.target.value;
        state.setSelectedManager(title ? state.getCardByTitleAndType(title, 'Manager') : null);
        ui.renderPersonaDisplay();
        refreshCardPool();
        state.saveStateToCache();
    });

    callNameSelect.addEventListener('change', (e) => { // NEW
        const title = e.target.value;
        state.setSelectedCallName(title ? state.getCardByTitleAndType(title, 'Call Name') : null);
        ui.renderPersonaDisplay();
        refreshCardPool();
        state.saveStateToCache();
    });

    factionSelect.addEventListener('change', (e) => { // NEW
        const title = e.target.value;
        state.setSelectedFaction(title ? state.getCardByTitleAndType(title, 'Faction') : null);
        ui.renderPersonaDisplay();
        refreshCardPool();
        state.saveStateToCache();
    });

    // Card pool click handling
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

    // Deck list click handling
    startingDeckList.addEventListener('click', (e) => {
        const btn = e.target.closest('button');
        if (!btn) return;
        const title = btn.dataset.title;
        if (title) deck.removeCardFromDeck(title, 'starting');
        ui.renderDecks();
        refreshCardPool();
    });

    purchaseDeckList.addEventListener('click', (e) => {
        const btn = e.target.closest('button');
        if (!btn) return;
        const title = btn.dataset.title;
        if (title) deck.removeCardFromDeck(title, 'purchase');
        ui.renderDecks();
        refreshCardPool();
    });

    // Exports
    clearDeckBtn?.addEventListener('click', () => {
        deck.clearDecks();
        ui.renderDecks();
        ui.renderPersonaDisplay();
        refreshCardPool();
        state.saveStateToCache();
    });

    exportDeckBtn?.addEventListener('click', exportDeckAsText);
    exportAsImageBtn?.addEventListener('click', exportDeckAsImages);
    exportAllCardsBtn?.addEventListener('click', exportAllCardsAsImages);
    exportLackeyBtn?.addEventListener('click', exportDeckAsLackeyText);

    // Persona display click -> modal (FIXED: include card type so duplicates open correctly)
    personaDisplay?.addEventListener('click', (e) => {
        const el = e.target.closest('[data-title]');
        if (!el) return;
        const title = el.dataset.title;
        const type = el.dataset.type || null;
        if (title) ui.showCardModal(title, type);
    });
}

export function refreshCardPoolUI() {
    const pool = getFilteredAndSortedCardPool();
    ui.renderCardPool(pool);
}
