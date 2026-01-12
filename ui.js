// ui.js
import * as state from './config.js';
import { generateCardVisualHTML } from './card-renderer.js';

const searchResults = document.getElementById('searchResults');
const startingDeckList = document.getElementById('startingDeckList');
const purchaseDeckList = document.getElementById('purchaseDeckList');
const startingDeckCount = document.getElementById('startingDeckCount');
const purchaseDeckCount = document.getElementById('purchaseDeckCount');
const startingDeckHeader = document.getElementById('startingDeckHeader');
const purchaseDeckHeader = document.getElementById('purchaseDeckHeader');
const personaDisplay = document.getElementById('personaDisplay');

const cardModal = document.getElementById('cardModal');
const modalCardContent = document.getElementById('modalCardContent');
const modalCloseButton = cardModal?.querySelector('.modal-close-button');

export function renderCardPool(cards) {
    searchResults.innerHTML = '';
    searchResults.className = `card-list ${state.currentViewMode}-view`;
    if (state.currentViewMode === 'grid') searchResults.setAttribute('data-columns', state.numGridColumns);
    else searchResults.removeAttribute('data-columns');

    if (!cards.length) {
        searchResults.innerHTML = '<p>No cards match the current filters.</p>';
        return;
    }

    cards.forEach(card => {
        const cardElement = document.createElement('div');
        cardElement.className = state.currentViewMode === 'list' ? 'card-item' : 'grid-card-item';
        cardElement.dataset.title = card.title;

        if (state.currentViewMode === 'list') {
            cardElement.innerHTML = `<span data-title="${card.title}">${card.title} (C:${card.cost ?? 'N/A'}, D:${card.damage ?? 'N/A'}, M:${card.momentum ?? 'N/A'})</span>`;
        } else {
            const visualHTML = generateCardVisualHTML(card);
            cardElement.innerHTML = `<div class="card-visual" data-title="${card.title}">${visualHTML}</div>`;
        }

        const buttonsDiv = document.createElement('div');
        buttonsDiv.className = 'card-buttons';

        if (card.cost === 0) {
            buttonsDiv.innerHTML = `<button data-title="${card.title}" data-deck-target="starting">Starting</button><button class="btn-purchase" data-title="${card.title}" data-deck-target="purchase">Purchase</button>`;
        } else {
            buttonsDiv.innerHTML = `<button class="btn-purchase" data-title="${card.title}" data-deck-target="purchase">Purchase</button>`;
        }

        cardElement.appendChild(buttonsDiv);
        searchResults.appendChild(cardElement);
    });
}

export function renderPersonaDisplay() {
    // You need a Wrestler selected for kits to make sense,
    // but the other persona slots can still exist.
    if (!state.selectedWrestler) {
        personaDisplay.style.display = 'none';
        return;
    }

    personaDisplay.style.display = 'block';
    personaDisplay.innerHTML = '<h3>Persona</h3><div class="persona-card-list"></div>';
    const list = personaDisplay.querySelector('.persona-card-list');
    list.innerHTML = '';

    const cardsToShow = [];

    if (state.selectedWrestler) cardsToShow.push(state.selectedWrestler);
    if (state.selectedManager) cardsToShow.push(state.selectedManager);
    if (state.selectedCallName) cardsToShow.push(state.selectedCallName);
    if (state.selectedFaction) cardsToShow.push(state.selectedFaction);

    // Kits derived ONLY from Wrestler
    const wrestlerTitle = state.selectedWrestler.title;
    const kitCards = state.cardDatabase.filter(c =>
        state.isKitCard(c) && c['Signature For'] === wrestlerTitle
    );
    kitCards.forEach(c => cardsToShow.push(c));

    // Sort: persona first, then kit
    const typeOrder = { 'Wrestler': 0, 'Manager': 1, 'Call Name': 2, 'Faction': 3 };
    cardsToShow.sort((a, b) => {
        const ao = typeOrder[a.card_type] ?? 99;
        const bo = typeOrder[b.card_type] ?? 99;
        if (ao !== bo) return ao - bo;
        return a.title.localeCompare(b.title);
    });

    cardsToShow.forEach(card => {
        const item = document.createElement('div');
        item.className = 'persona-card-item';
        item.textContent = card.title;
        item.dataset.title = card.title;
        item.dataset.type = card.card_type; // critical for duplicate-title modals
        list.appendChild(item);
    });
}

// UPDATED: accepts optional cardType to resolve duplicate titles correctly
export function showCardModal(cardTitle, cardType = null) {
    if (!cardTitle) return;

    state.setLastFocusedElement(document.activeElement);

    let card = null;
    if (cardType) {
        card = state.getCardByTitleAndType(cardTitle, cardType);
    }
    if (!card) {
        // fallback (non-persona are usually unique titles)
        card = state.cardDatabase.find(c => c && c.title === cardTitle) || null;
    }
    if (!card) return;

    modalCardContent.innerHTML = generateCardVisualHTML(card);
    cardModal.style.display = 'flex';
    modalCloseButton?.focus();
}

export function renderDecks() {
    renderDeckList(startingDeckList, state.startingDeck, 'starting');
    renderDeckList(purchaseDeckList, state.purchaseDeck, 'purchase');
    updateDeckCounts();
    state.saveStateToCache();
}

function renderDeckList(element, deckArr, deckName) {
    element.innerHTML = '';
    const counts = deckArr.reduce((acc, t) => { acc[t] = (acc[t] || 0) + 1; return acc; }, {});
    Object.entries(counts).forEach(([title, count]) => {
        const row = document.createElement('div');
        row.className = 'card-item';
        row.innerHTML = `<span data-title="${title}">${count}x ${title}</span><button data-title="${title}" data-deck="${deckName}">Remove</button>`;
        element.appendChild(row);
    });
}

function updateDeckCounts() {
    startingDeckCount.textContent = state.startingDeck.length;
    purchaseDeckCount.textContent = state.purchaseDeck.length;

    startingDeckCount.parentElement.style.color = state.startingDeck.length === 24 ? 'green' : 'red';
    startingDeckHeader.style.color = state.startingDeck.length === 24 ? 'green' : 'inherit';

    purchaseDeckCount.parentElement.style.color = state.purchaseDeck.length >= 36 ? 'green' : 'red';
    purchaseDeckHeader.style.color = state.purchaseDeck.length >= 36 ? 'green' : 'inherit';
}
