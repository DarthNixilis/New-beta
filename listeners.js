// listeners.js
import * as state from './config.js';
import * as ui from './ui.js';
import * as deck from './deck.js';
import { parseAndLoadDeck } from './importer.js';
import { generatePlainTextDeck, exportDeckAsImage, generateLackeyCCGDeck } from './exporter.js';
import { exportAllCardsAsImages, exportAllCardsAsImagesFallback } from './master-export.js';

export function initializeAllEventListeners(refreshCardPool) {
    // POOL LISTENERS
    const searchInput = document.getElementById('searchInput');
    const sortSelect = document.getElementById('sortSelect');
    const showZeroCostCheckbox = document.getElementById('showZeroCost');
    const showNonZeroCostCheckbox = document.getElementById('showNonZeroCost');
    const gridSizeControls = document.getElementById('gridSizeControls');
    const viewModeToggle = document.getElementById('viewModeToggle');
    const searchResults = document.getElementById('searchResults');

    document.addEventListener('filtersChanged', refreshCardPool);
    searchInput.addEventListener('input', state.debounce(refreshCardPool, 300));
    sortSelect.addEventListener('change', (e) => { state.setCurrentSort(e.target.value); refreshCardPool(); });
    showZeroCostCheckbox.addEventListener('change', (e) => { state.setShowZeroCost(e.target.checked); refreshCardPool(); });
    showNonZeroCostCheckbox.addEventListener('change', (e) => { state.setShowNonZeroCost(e.target.checked); refreshCardPool(); });
    gridSizeControls.addEventListener('click', (e) => {
        if (e.target.tagName === 'BUTTON') {
            state.setNumGridColumns(e.target.dataset.columns);
            gridSizeControls.querySelectorAll('button').forEach(btn => btn.classList.remove('active'));
            e.target.classList.add('active');
            refreshCardPool();
        }
    });
    viewModeToggle.addEventListener('click', () => {
        const newMode = state.currentViewMode === 'list' ? 'grid' : 'list';
        state.setCurrentViewMode(newMode);
        viewModeToggle.textContent = newMode === 'list' ? 'Switch to Grid View' : 'Switch to List View';
        refreshCardPool();
    });
    searchResults.addEventListener('click', (e) => {
        const target = e.target;
        const cardTitle = target.dataset.title || target.closest('[data-title]')?.dataset.title;
        if (!cardTitle) return;
        if (target.tagName === 'BUTTON') { deck.addCardToDeck(cardTitle, target.dataset.deckTarget); } 
        else { ui.showCardModal(cardTitle); }
    });

    // DECK LISTENERS
    const wrestlerSelect = document.getElementById('wrestlerSelect');
    const managerSelect = document.getElementById('managerSelect');
    const callNameSelect = document.getElementById('callNameSelect');
    const factionSelect = document.getElementById('factionSelect');
    const startingDeckList = document.getElementById('startingDeckList');
    const purchaseDeckList = document.getElementById('purchaseDeckList');
    const personaDisplay = document.getElementById('personaDisplay');
    const clearDeckBtn = document.getElementById('clearDeck');
    const exportDeckBtn = document.getElementById('exportDeck');
    const exportAsImageBtn = document.getElementById('exportAsImageBtn');
    const exportAllCardsBtn = document.getElementById('exportAllCards');
    
    // Create or get the LackeyCCG export button
    const exportLackeyBtn = document.getElementById('exportLackeyBtn') || createLackeyExportButton();
    
    // NEW: Create or get the TSV export button
    const exportTSVBtn = document.getElementById('exportTSVBtn') || createTSVExportButton();

    wrestlerSelect.addEventListener('change', (e) => {
        const newWrestler = state.cardTitleCache[e.target.value] || null;
        state.setSelectedWrestler(newWrestler);
        ui.renderPersonaDisplay();
        refreshCardPool();
        state.saveStateToCache();
    });
    managerSelect.addEventListener('change', (e) => {
        const newManager = state.cardTitleCache[e.target.value] || null;
        state.setSelectedManager(newManager);
        ui.renderPersonaDisplay();
        refreshCardPool();
        state.saveStateToCache();
    });
    callNameSelect.addEventListener('change', (e) => {
        const newCallName = state.cardTitleCache[e.target.value] || null;
        state.setSelectedCallName(newCallName);
        ui.renderPersonaDisplay();
        refreshCardPool();
        state.saveStateToCache();
    });
    factionSelect.addEventListener('change', (e) => {
        const newFaction = state.cardTitleCache[e.target.value] || null;
        state.setSelectedFaction(newFaction);
        ui.renderPersonaDisplay();
        refreshCardPool();
        state.saveStateToCache();
    });
    [startingDeckList, purchaseDeckList, personaDisplay].forEach(container => {
        container.addEventListener('click', (e) => {
            const target = e.target;
            const cardTitle = target.dataset.title || target.closest('[data-title]')?.dataset.title;
            if (!cardTitle) return;
            if (target.tagName === 'BUTTON' && target.dataset.deck) { deck.removeCardFromDeck(cardTitle, target.dataset.deck); } 
            else { ui.showCardModal(cardTitle); }
        });
    });
    clearDeckBtn.addEventListener('click', () => {
        if (confirm('Are you sure you want to clear the entire deck?')) {
            state.setStartingDeck([]);
            state.setPurchaseDeck([]);
            state.setSelectedWrestler(null);
            state.setSelectedManager(null);
            state.setSelectedCallName(null);
            state.setSelectedFaction(null);
            
            // Reset dropdowns
            wrestlerSelect.value = "";
            managerSelect.value = "";
            callNameSelect.value = "";
            factionSelect.value = "";
            
            ui.renderDecks();
            ui.renderPersonaDisplay();
            refreshCardPool();
        }
    });
    exportDeckBtn.addEventListener('click', () => {
        const text = generatePlainTextDeck();
        const blob = new Blob([text], { type: 'text/plain' });
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        const wrestlerName = state.selectedWrestler ? state.toPascalCase(state.selectedWrestler.title) : "Deck";
        a.download = `${wrestlerName}.txt`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(a.href);
    });
    
    // LackeyCCG Export
    exportLackeyBtn.addEventListener('click', () => {
        const text = generateLackeyCCGDeck();
        const blob = new Blob([text], { type: 'text/plain' });
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        const wrestlerName = state.selectedWrestler ? state.toPascalCase(state.selectedWrestler.title) : "Deck";
        a.download = `${wrestlerName}-Lackey.txt`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(a.href);
    });

    exportAsImageBtn.addEventListener('click', exportDeckAsImage);
    
    // Export All Cards button with fallback
    if (exportAllCardsBtn) {
        exportAllCardsBtn.addEventListener('click', async () => {
            try {
                await exportAllCardsAsImages();
            } catch (error) {
                console.error("Export failed:", error);
                if (confirm("ZIP export failed. Would you like to try downloading images individually instead?")) {
                    await exportAllCardsAsImagesFallback();
                }
            }
        });
    }
    
    // NEW: TSV Database Export
    if (exportTSVBtn) {
        exportTSVBtn.addEventListener('click', async () => {
            try {
                // Import the TSV export function
                const { exportAllCardsAsTSV } = await import('./master-export.js');
                await exportAllCardsAsTSV();
            } catch (error) {
                console.error("TSV export failed:", error);
                alert(`TSV export failed: ${error.message}`);
            }
        });
    }

    // MODAL LISTENERS
    const importDeckBtn = document.getElementById('importDeck');
    const importModal = document.getElementById('importModal');
    const importModalCloseBtn = importModal.querySelector('.modal-close-button');
    const deckFileInput = document.getElementById('deckFileInput');
    const deckTextInput = document.getElementById('deckTextInput');
    const processImportBtn = document.getElementById('processImportBtn');
    const cardModal = document.getElementById('cardModal');
    const modalCloseButton = cardModal.querySelector('.modal-close-button');

    importDeckBtn.addEventListener('click', () => {
        importModal.style.display = 'flex';
        document.getElementById('importStatus').textContent = '';
        deckTextInput.value = '';
        deckFileInput.value = '';
    });
    importModalCloseBtn.addEventListener('click', () => importModal.style.display = 'none');
    processImportBtn.addEventListener('click', () => { 
        if (deckTextInput.value.trim()) { 
            parseAndLoadDeck(deckTextInput.value); 
        } else {
            document.getElementById('importStatus').textContent = 'Please paste decklist or select a file.';
            document.getElementById('importStatus').style.color = 'red';
        }
    });
    deckFileInput.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (event) => { 
                parseAndLoadDeck(event.target.result); 
            };
            reader.readAsText(file);
        }
    });
    modalCloseButton.addEventListener('click', () => cardModal.style.display = 'none');
    cardModal.addEventListener('click', (e) => { if (e.target === cardModal) cardModal.style.display = 'none'; });
    importModal.addEventListener('click', (e) => { if (e.target === importModal) importModal.style.display = 'none'; });
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            cardModal.style.display = 'none';
            importModal.style.display = 'none';
            if (state.lastFocusedElement) { state.lastFocusedElement.focus(); }
        }
    });
}

// Helper to create the Lackey export button if it doesn't exist
function createLackeyExportButton() {
    const deckActions = document.querySelector('.deck-actions');
    if (!deckActions) return null;
    
    const lackeyBtn = document.createElement('button');
    lackeyBtn.id = 'exportLackeyBtn';
    lackeyBtn.textContent = 'Export for LackeyCCG';
    lackeyBtn.style.backgroundColor = '#17a2b8';
    lackeyBtn.style.color = 'white';
    lackeyBtn.style.border = 'none';
    lackeyBtn.style.borderRadius = '4px';
    lackeyBtn.style.cursor = 'pointer';
    lackeyBtn.style.padding = '10px 15px';
    lackeyBtn.style.marginLeft = '10px';
    lackeyBtn.style.marginBottom = '5px';
    
    // Insert after exportDeckBtn or before exportAsImageBtn
    const exportDeckBtn = document.getElementById('exportDeck');
    const exportAsImageBtn = document.getElementById('exportAsImageBtn');
    
    if (exportDeckBtn && exportAsImageBtn) {
        deckActions.insertBefore(lackeyBtn, exportAsImageBtn);
    } else if (exportDeckBtn) {
        deckActions.insertBefore(lackeyBtn, exportDeckBtn.nextSibling);
    } else {
        deckActions.appendChild(lackeyBtn);
    }
    
    return lackeyBtn;
}

// NEW: Helper to create the TSV export button
function createTSVExportButton() {
    const deckActions = document.querySelector('.deck-actions');
    if (!deckActions) return null;
    
    const tsvBtn = document.createElement('button');
    tsvBtn.id = 'exportTSVBtn';
    tsvBtn.textContent = 'Export TSV Database';
    tsvBtn.style.backgroundColor = '#28a745';
    tsvBtn.style.color = 'white';
    tsvBtn.style.border = 'none';
    tsvBtn.style.borderRadius = '4px';
    tsvBtn.style.cursor = 'pointer';
    tsvBtn.style.padding = '10px 15px';
    tsvBtn.style.marginLeft = '10px';
    tsvBtn.style.marginBottom = '5px';
    tsvBtn.title = 'Export all cards in LackeyCCG database format (TSV)';
    
    // Insert after exportAllCardsBtn if it exists
    const exportAllCardsBtn = document.getElementById('exportAllCards');
    if (exportAllCardsBtn) {
        deckActions.insertBefore(tsvBtn, exportAllCardsBtn.nextSibling);
    } else {
        // Otherwise insert after the last button
        const lastButton = deckActions.querySelector('button:last-child');
        if (lastButton) {
            deckActions.insertBefore(tsvBtn, lastButton.nextSibling);
        } else {
            deckActions.appendChild(tsvBtn);
        }
    }
    
    return tsvBtn;
}
