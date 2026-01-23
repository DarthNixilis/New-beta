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
    if (searchInput) searchInput.addEventListener('input', state.debounce(refreshCardPool, 300));
    if (sortSelect) sortSelect.addEventListener('change', (e) => { state.setCurrentSort(e.target.value); refreshCardPool(); });
    if (showZeroCostCheckbox) showZeroCostCheckbox.addEventListener('change', (e) => { state.setShowZeroCost(e.target.checked); refreshCardPool(); });
    if (showNonZeroCostCheckbox) showNonZeroCostCheckbox.addEventListener('change', (e) => { state.setShowNonZeroCost(e.target.checked); refreshCardPool(); });

    if (gridSizeControls) {
        gridSizeControls.addEventListener('click', (e) => {
            if (e.target.tagName === 'BUTTON') {
                state.setNumGridColumns(e.target.dataset.columns);
                gridSizeControls.querySelectorAll('button').forEach(btn => btn.classList.remove('active'));
                e.target.classList.add('active');
                refreshCardPool();
            }
        });
    }

    if (viewModeToggle) {
        viewModeToggle.addEventListener('click', () => {
            const newMode = state.currentViewMode === 'list' ? 'grid' : 'list';
            state.setCurrentViewMode(newMode);
            viewModeToggle.textContent = newMode === 'list' ? 'Switch to Grid View' : 'Switch to List View';
            refreshCardPool();
        });
    }

    if (searchResults) {
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
    }

    // -------------------------
    // DECK + PERSONA LISTENERS
    // -------------------------
    const wrestlerSelect = document.getElementById('wrestlerSelect');
    const managerSelect = document.getElementById('managerSelect');

    // NEW: call name + faction selects (create if missing)
    const callNameSelect = ensurePersonaSelectExists({
        id: 'callNameSelect',
        labelText: 'Call Name',
        insertAfterEl: managerSelect || wrestlerSelect
    });

    const factionSelect = ensurePersonaSelectExists({
        id: 'factionSelect',
        labelText: 'Faction',
        insertAfterEl: callNameSelect || managerSelect || wrestlerSelect
    });

    // Populate all persona dropdowns
    populatePersonaSelect(wrestlerSelect, 'Wrestler', state.selectedWrestler?.title ?? '');
    populatePersonaSelect(managerSelect, 'Manager', state.selectedManager?.title ?? '');
    populatePersonaSelect(callNameSelect, 'Call Name', state.selectedCallName?.title ?? '');
    populatePersonaSelect(factionSelect, 'Faction', state.selectedFaction?.title ?? '');

    const startingDeckList = document.getElementById('startingDeckList');
    const purchaseDeckList = document.getElementById('purchaseDeckList');
    const personaDisplay = document.getElementById('personaDisplay');
    const clearDeckBtn = document.getElementById('clearDeck');
    const exportDeckBtn = document.getElementById('exportDeck');
    const exportAsImageBtn = document.getElementById('exportAsImageBtn');
    const exportAllCardsBtn = document.getElementById('exportAllCards');

    // Create or get the LackeyCCG export button
    const exportLackeyBtn = document.getElementById('exportLackeyBtn') || createLackeyExportButton();

    if (wrestlerSelect) {
        wrestlerSelect.addEventListener('change', (e) => {
            const newWrestler = state.cardTitleCache[e.target.value] || null;
            state.setSelectedWrestler(newWrestler);
            ui.renderPersonaDisplay();
            refreshCardPool();
            state.saveStateToCache();
        });
    }

    if (managerSelect) {
        managerSelect.addEventListener('change', (e) => {
            const newManager = state.cardTitleCache[e.target.value] || null;
            state.setSelectedManager(newManager);
            ui.renderPersonaDisplay();
            refreshCardPool();
            state.saveStateToCache();
        });
    }

    if (callNameSelect) {
        callNameSelect.addEventListener('change', (e) => {
            const newCallName = state.cardTitleCache[e.target.value] || null;
            state.setSelectedCallName(newCallName);
            ui.renderPersonaDisplay();
            refreshCardPool();
            state.saveStateToCache();
        });
    }

    if (factionSelect) {
        factionSelect.addEventListener('change', (e) => {
            const newFaction = state.cardTitleCache[e.target.value] || null;
            state.setSelectedFaction(newFaction);
            ui.renderPersonaDisplay();
            refreshCardPool();
            state.saveStateToCache();
        });
    }

    [startingDeckList, purchaseDeckList, personaDisplay].forEach(container => {
        if (!container) return;
        container.addEventListener('click', (e) => {
            const target = e.target;
            const cardTitle = target.dataset.title || target.closest('[data-title]')?.dataset.title;
            if (!cardTitle) return;
            if (target.tagName === 'BUTTON' && target.dataset.deck) {
                deck.removeCardFromDeck(cardTitle, target.dataset.deck);
            } else {
                ui.showCardModal(cardTitle);
            }
        });
    });

    if (clearDeckBtn) {
        clearDeckBtn.addEventListener('click', () => {
            if (confirm('Are you sure you want to clear the entire deck?')) {
                state.setStartingDeck([]);
                state.setPurchaseDeck([]);
                ui.renderDecks();
            }
        });
    }

    if (exportDeckBtn) {
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
    }

    // NEW: LackeyCCG Export
    if (exportLackeyBtn) {
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
    }

    if (exportAsImageBtn) exportAsImageBtn.addEventListener('click', exportDeckAsImage);

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

    // -------------------------
    // MODAL LISTENERS
    // -------------------------
    const importDeckBtn = document.getElementById('importDeck');
    const importModal = document.getElementById('importModal');
    const deckFileInput = document.getElementById('deckFileInput');
    const deckTextInput = document.getElementById('deckTextInput');
    const processImportBtn = document.getElementById('processImportBtn');
    const cardModal = document.getElementById('cardModal');

    const importModalCloseBtn = importModal ? importModal.querySelector('.modal-close-button') : null;
    const modalCloseButton = cardModal ? cardModal.querySelector('.modal-close-button') : null;

    if (importDeckBtn && importModal) {
        importDeckBtn.addEventListener('click', () => {
            importModal.style.display = 'flex';
            const importStatus = document.getElementById('importStatus');
            if (importStatus) importStatus.textContent = '';
            if (deckTextInput) deckTextInput.value = '';
            if (deckFileInput) deckFileInput.value = '';
        });
    }

    if (importModalCloseBtn && importModal) importModalCloseBtn.addEventListener('click', () => importModal.style.display = 'none');

    if (processImportBtn && deckTextInput) {
        processImportBtn.addEventListener('click', () => {
            if (deckTextInput.value) parseAndLoadDeck(deckTextInput.value);
        });
    }

    if (deckFileInput) {
        deckFileInput.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (!file) return;
            const reader = new FileReader();
            reader.onload = (event) => { parseAndLoadDeck(event.target.result); };
            reader.readAsText(file);
        });
    }

    if (modalCloseButton && cardModal) modalCloseButton.addEventListener('click', () => cardModal.style.display = 'none');

    if (cardModal) {
        cardModal.addEventListener('click', (e) => {
            if (e.target === cardModal) cardModal.style.display = 'none';
        });
    }

    if (importModal) {
        importModal.addEventListener('click', (e) => {
            if (e.target === importModal) importModal.style.display = 'none';
        });
    }

    document.addEventListener('keydown', (e) => {
        if (e.key !== 'Escape') return;
        if (cardModal) cardModal.style.display = 'none';
        if (importModal) importModal.style.display = 'none';
        if (state.lastFocusedElement) state.lastFocusedElement.focus();
    });
}

// -------------------------
// Persona Select Helpers
// -------------------------

function populatePersonaSelect(selectEl, personaType, selectedValue) {
    if (!selectEl) return;

    // Keep current selection if present
    const prev = selectedValue || '';

    // Build options from cardDatabase by card_type match
    const options = state.cardDatabase
        .filter(c => c && c.card_type === personaType && c.title)
        .map(c => c.title)
        .sort((a, b) => a.localeCompare(b));

    // Clear existing
    selectEl.innerHTML = '';

    // Blank option
    const blank = document.createElement('option');
    blank.value = '';
    blank.textContent = `-- Select ${personaType} --`;
    selectEl.appendChild(blank);

    // Options
    for (const title of options) {
        const opt = document.createElement('option');
        opt.value = title;
        opt.textContent = title;
        selectEl.appendChild(opt);
    }

    // Restore selection if possible
    selectEl.value = prev;
}

function ensurePersonaSelectExists({ id, labelText, insertAfterEl }) {
    // If it already exists in HTML, use it
    let select = document.getElementById(id);
    if (select) return select;

    // If we don’t have an anchor point, we can’t safely place it
    if (!insertAfterEl || !insertAfterEl.parentElement) return null;

    // Create a wrapper to match typical form layouts
    const wrapper = document.createElement('div');
    wrapper.className = 'persona-select-wrapper';
    wrapper.style.display = 'flex';
    wrapper.style.flexDirection = 'column';
    wrapper.style.gap = '6px';
    wrapper.style.marginTop = '8px';

    const label = document.createElement('label');
    label.htmlFor = id;
    label.textContent = labelText;

    select = document.createElement('select');
    select.id = id;

    wrapper.appendChild(label);
    wrapper.appendChild(select);

    // Insert directly after the anchor element’s container if possible
    const parent = insertAfterEl.parentElement;
    if (insertAfterEl.nextSibling) parent.insertBefore(wrapper, insertAfterEl.nextSibling);
    else parent.appendChild(wrapper);

    return select;
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
