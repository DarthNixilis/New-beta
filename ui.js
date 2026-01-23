// ui.js - FIXED VERSION (lazy DOM lookups to avoid null refs on module load)

import * as state from './config.js';
import { generateCardVisualHTML } from './card-renderer.js';

// --- LAZY DOM REFERENCES ---
// Because ES modules execute before the DOM is guaranteed ready,
// we must NOT cache DOM nodes at top-level.
function getDOM() {
    const cardModal = document.getElementById('cardModal');

    return {
        searchResults: document.getElementById('searchResults'),
        startingDeckList: document.getElementById('startingDeckList'),
        purchaseDeckList: document.getElementById('purchaseDeckList'),
        startingDeckCount: document.getElementById('startingDeckCount'),
        purchaseDeckCount: document.getElementById('purchaseDeckCount'),
        startingDeckHeader: document.getElementById('startingDeckHeader'),
        purchaseDeckHeader: document.getElementById('purchaseDeckHeader'),
        personaDisplay: document.getElementById('personaDisplay'),
        cardModal,
        modalCardContent: document.getElementById('modalCardContent'),
        modalCloseButton: cardModal ? cardModal.querySelector('.modal-close-button') : null
    };
}

// --- RENDERING FUNCTIONS ---

export function renderCardPool(cards) {
    const { searchResults } = getDOM();
    if (!searchResults) return;

    searchResults.innerHTML = '';
    searchResults.className = `card-list ${state.currentViewMode}-view`;

    if (state.currentViewMode === 'grid') {
        searchResults.setAttribute('data-columns', state.numGridColumns);
    } else {
        searchResults.removeAttribute('data-columns');
    }

    if (!cards || cards.length === 0) {
        searchResults.innerHTML = '<p>No cards match the current filters.</p>';
        return;
    }

    cards.forEach(card => {
        const cardElement = document.createElement('div');
        cardElement.className = state.currentViewMode === 'list' ? 'card-item' : 'grid-card-item';

        if (state.isSignatureFor(card)) cardElement.classList.add('signature-highlight');

        cardElement.dataset.title = card.title;

        if (state.currentViewMode === 'list') {
            cardElement.innerHTML = `
                <span data-title="${card.title}">
                    ${card.title} (C:${card.cost ?? 'N/A'}, D:${card.damage ?? 'N/A'}, M:${card.momentum ?? 'N/A'})
                </span>
            `;

            const buttonsDiv = document.createElement('div');
            buttonsDiv.className = 'card-buttons';

            if (card.cost === 0) {
                buttonsDiv.innerHTML = `
                    <button data-title="${card.title}" data-deck-target="starting">Starting</button>
                    <button class="btn-purchase" data-title="${card.title}" data-deck-target="purchase">Purchase</button>
                `;
            } else {
                buttonsDiv.innerHTML = `
                    <button class="btn-purchase" data-title="${card.title}" data-deck-target="purchase">Purchase</button>
                `;
            }

            cardElement.appendChild(buttonsDiv);
        } else {
            const visualHTML = generateCardVisualHTML(card);
            cardElement.innerHTML = `<div class="card-visual" data-title="${card.title}">${visualHTML}</div>`;

            const buttonsDiv = document.createElement('div');
            buttonsDiv.className = 'card-buttons';

            if (card.cost === 0) {
                buttonsDiv.innerHTML = `
                    <button data-title="${card.title}" data-deck-target="starting">Starting</button>
                    <button class="btn-purchase" data-title="${card.title}" data-deck-target="purchase">Purchase</button>
                `;
            } else {
                buttonsDiv.innerHTML = `
                    <button class="btn-purchase" data-title="${card.title}" data-deck-target="purchase">Purchase</button>
                `;
            }

            cardElement.appendChild(buttonsDiv);
        }

        searchResults.appendChild(cardElement);
    });
}

export function renderPersonaDisplay() {
    const { personaDisplay } = getDOM();
    if (!personaDisplay) return;

    if (!state.selectedWrestler) {
        personaDisplay.style.display = 'none';
        return;
    }

    personaDisplay.style.display = 'block';
    personaDisplay.innerHTML = '<h3>Persona & Kit</h3><div class="persona-card-list"></div>';

    const list = personaDisplay.querySelector('.persona-card-list');
    list.innerHTML = '';

    const cardsToShow = new Set();
    const activePersona = [];

    if (state.selectedWrestler) activePersona.push(state.selectedWrestler);
    if (state.selectedManager) activePersona.push(state.selectedManager);

    activePersona.forEach(p => cardsToShow.add(p));

    const activePersonaTitles = activePersona.map(p => p.title);
    const kitCards = state.cardDatabase.filter(card =>
        state.isKitCard(card) && activePersonaTitles.includes(card['Signature For'])
    );

    kitCards.forEach(card => cardsToShow.add(card));

    const sortedCards = Array.from(cardsToShow).sort((a, b) => {
        if (a.card_type === 'Wrestler') return -1;
        if (b.card_type === 'Wrestler') return 1;
        if (a.card_type === 'Manager') return -1;
        if (b.card_type === 'Manager') return 1;
        return a.title.localeCompare(b.title);
    });

    sortedCards.forEach(card => {
        const item = document.createElement('div');
        item.className = 'persona-card-item';
        item.textContent = card.title;
        item.dataset.title = card.title;
        list.appendChild(item);
    });
}

export function showCardModal(cardTitle) {
    const { cardModal, modalCardContent, modalCloseButton } = getDOM();
    if (!cardModal || !modalCardContent) return;

    state.setLastFocusedElement(document.activeElement);

    const card = state.cardDatabase.find(c => c.title === cardTitle);
    if (!card) return;

    modalCardContent.innerHTML = generateCardVisualHTML(card);

    cardModal.style.display = 'flex';
    cardModal.setAttribute('role', 'dialog');
    cardModal.setAttribute('aria-modal', 'true');

    if (modalCloseButton) modalCloseButton.focus();
}

export function renderDecks() {
    const {
        startingDeckList,
        purchaseDeckList
    } = getDOM();

    if (!startingDeckList || !purchaseDeckList) return;

    renderDeckList(startingDeckList, state.startingDeck);
    renderDeckList(purchaseDeckList, state.purchaseDeck);

    updateDeckCounts();
    state.saveStateToCache();
}

function renderDeckList(element, deck) {
    element.innerHTML = '';

    const cardCounts = deck.reduce((acc, cardTitle) => {
        acc[cardTitle] = (acc[cardTitle] || 0) + 1;
        return acc;
    }, {});

    Object.entries(cardCounts).forEach(([cardTitle, count]) => {
        const card = state.cardDatabase.find(c => c.title === cardTitle);
        if (!card) return;

        const cardElement = document.createElement('div');
        cardElement.className = 'card-item';

        const deckName = element.id === 'startingDeckList' ? 'starting' : 'purchase';

        cardElement.innerHTML = `
            <span data-title="${card.title}">${count}x ${card.title}</span>
            <button data-title="${card.title}" data-deck="${deckName}">Remove</button>
        `;

        element.appendChild(cardElement);
    });
}

function updateDeckCounts() {
    const {
        startingDeckCount,
        purchaseDeckCount,
        startingDeckHeader,
        purchaseDeckHeader
    } = getDOM();

    if (!startingDeckCount || !purchaseDeckCount || !startingDeckHeader || !purchaseDeckHeader) return;

    startingDeckCount.textContent = state.startingDeck.length;
    purchaseDeckCount.textContent = state.purchaseDeck.length;

    // Color logic
    startingDeckCount.parentElement.style.color = state.startingDeck.length === 24 ? 'green' : 'red';
    startingDeckHeader.style.color = state.startingDeck.length === 24 ? 'green' : 'inherit';

    purchaseDeckCount.parentElement.style.color = state.purchaseDeck.length >= 36 ? 'green' : 'red';
    purchaseDeckHeader.style.color = state.purchaseDeck.length >= 36 ? 'green' : 'inherit';
}

export function filterDeckList(deckListElement, query) {
    if (!deckListElement) return;

    const items = deckListElement.querySelectorAll('.card-item');
    const q = (query || '').toLowerCase();

    items.forEach(item => {
        const text = item.textContent.toLowerCase();
        item.style.display = text.includes(q) ? '' : 'none';
    });
}
