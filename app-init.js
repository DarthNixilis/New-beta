// app-init.js
import * as state from './config.js';
import * as ui from './ui.js';
import * as filters from './filters.js';
import { initializeAllEventListeners } from './listeners.js';

export function initializeApp() {
    populatePersonaSelectors();
    loadStateFromCache();
    setupInitialUI();
    addDeckSearchFunctionality();
    filters.renderCascadingFilters();
    ui.renderDecks();
    ui.renderPersonaDisplay();
    initializeAllEventListeners(refreshCardPool);
    refreshCardPool();
}

function populatePersonaSelectors() {
    const wrestlerSelect = document.getElementById('wrestlerSelect');
    const managerSelect = document.getElementById('managerSelect');
    const callNameSelect = document.getElementById('callNameSelect'); // NEW
    const factionSelect = document.getElementById('factionSelect');   // NEW

    // keep the first placeholder option, clear rest
    wrestlerSelect.length = 1;
    managerSelect.length = 1;
    callNameSelect.length = 1;
    factionSelect.length = 1;

    const byType = (type) =>
        state.cardDatabase
            .filter(c => c && c.card_type === type)
            .sort((a, b) => a.title.localeCompare(b.title));

    byType('Wrestler').forEach(c => wrestlerSelect.add(new Option(c.title, c.title)));
    byType('Manager').forEach(c => managerSelect.add(new Option(c.title, c.title)));
    byType('Call Name').forEach(c => callNameSelect.add(new Option(c.title, c.title))); // NEW
    byType('Faction').forEach(c => factionSelect.add(new Option(c.title, c.title)));   // NEW
}

function loadStateFromCache() {
    const cachedState = localStorage.getItem(state.CACHE_KEY);
    if (!cachedState) return;

    try {
        const parsed = JSON.parse(cachedState);

        state.setStartingDeck(parsed.startingDeck || []);
        state.setPurchaseDeck(parsed.purchaseDeck || []);

        const wrestlerSelect = document.getElementById('wrestlerSelect');
        const managerSelect = document.getElementById('managerSelect');
        const callNameSelect = document.getElementById('callNameSelect'); // NEW
        const factionSelect = document.getElementById('factionSelect');   // NEW

        if (parsed.wrestler) {
            wrestlerSelect.value = parsed.wrestler;
            state.setSelectedWrestler(state.getCardByTitleAndType(parsed.wrestler, 'Wrestler'));
        }
        if (parsed.manager) {
            managerSelect.value = parsed.manager;
            state.setSelectedManager(state.getCardByTitleAndType(parsed.manager, 'Manager'));
        }
        if (parsed.callName) { // NEW
            callNameSelect.value = parsed.callName;
            state.setSelectedCallName(state.getCardByTitleAndType(parsed.callName, 'Call Name'));
        }
        if (parsed.faction) { // NEW
            factionSelect.value = parsed.faction;
            state.setSelectedFaction(state.getCardByTitleAndType(parsed.faction, 'Faction'));
        }
    } catch (e) {
        console.error("Failed to load from cache:", e);
        localStorage.removeItem(state.CACHE_KEY);
    }
}

function setupInitialUI() {
    // keep your existing implementation if present in your repo
}

function addDeckSearchFunctionality() {
    // keep your existing implementation if present in your repo
}

function refreshCardPool() {
    // listeners.js passes in the real function; this is just to satisfy imports
}
