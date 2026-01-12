// ui.js
import * as state from './config.js';
import { generateCardVisualHTML } from './card-renderer.js';

// DOM
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

function countByTitle(list) {
  const map = new Map();
  for (const t of list) map.set(t, (map.get(t) || 0) + 1);
  return map;
}

export function renderCardPool(cards) {
  if (!searchResults) return;

  searchResults.innerHTML = '';

  if (!cards || cards.length === 0) {
    searchResults.innerHTML = `<p>No cards match the current filters.</p>`;
    return;
  }

  // Basic layout: honor your grid/list CSS if present
  searchResults.className = `card-list ${state.currentViewMode || 'grid'}-view`;
  if ((state.currentViewMode || 'grid') === 'grid') {
    searchResults.setAttribute('data-columns', String(state.numGridColumns || 2));
  } else {
    searchResults.removeAttribute('data-columns');
  }

  for (const card of cards) {
    const wrapper = document.createElement('div');
    wrapper.className = (state.currentViewMode === 'list') ? 'card-item' : 'grid-card-item';
    wrapper.dataset.title = card.title;

    if (state.currentViewMode === 'list') {
      const line = document.createElement('span');
      line.dataset.title = card.title;
      line.textContent = `${card.title}  (C:${card.cost ?? 'N/A'} D:${card.damage ?? 'N/A'} M:${card.momentum ?? 'N/A'})`;
      wrapper.appendChild(line);
    } else {
      const visual = document.createElement('div');
      visual.className = 'card-visual';
      visual.dataset.title = card.title;
      visual.innerHTML = generateCardVisualHTML(card);
      wrapper.appendChild(visual);
    }

    const btns = document.createElement('div');
    btns.className = 'card-buttons';

    if (card.cost === 0) {
      btns.innerHTML = `
        <button data-title="${card.title}" data-deck-target="starting">Starting</button>
        <button class="btn-purchase" data-title="${card.title}" data-deck-target="purchase">Purchase</button>
      `;
    } else {
      btns.innerHTML = `
        <button class="btn-purchase" data-title="${card.title}" data-deck-target="purchase">Purchase</button>
      `;
    }

    wrapper.appendChild(btns);
    searchResults.appendChild(wrapper);
  }
}

export function renderDecks() {
  renderDeckList(startingDeckList, state.startingDeck, 'starting');
  renderDeckList(purchaseDeckList, state.purchaseDeck, 'purchase');

  if (startingDeckCount) startingDeckCount.textContent = String(state.startingDeck.length);
  if (purchaseDeckCount) purchaseDeckCount.textContent = String(state.purchaseDeck.length);

  // Your color rules
  if (startingDeckHeader && startingDeckCount) {
    const ok = state.startingDeck.length === 24;
    startingDeckHeader.style.color = ok ? 'green' : '';
    startingDeckCount.parentElement.style.color = ok ? 'green' : 'red';
  }
  if (purchaseDeckHeader && purchaseDeckCount) {
    const ok = state.purchaseDeck.length >= 36;
    purchaseDeckHeader.style.color = ok ? 'green' : '';
    purchaseDeckCount.parentElement.style.color = ok ? 'green' : 'red';
  }

  state.saveStateToCache();
}

function renderDeckList(el, list, deckName) {
  if (!el) return;
  el.innerHTML = '';

  const counts = countByTitle(list);
  for (const [title, qty] of counts.entries()) {
    const row = document.createElement('div');
    row.className = 'card-item';
    row.innerHTML = `
      <span data-title="${title}">${qty}x ${title}</span>
      <button data-title="${title}" data-deck="${deckName}">Remove</button>
    `;
    el.appendChild(row);
  }
}

export function renderPersonaDisplay() {
  if (!personaDisplay) return;

  // Show persona panel even if only partial selection
  const items = [];

  if (state.selectedWrestler) items.push(state.selectedWrestler);
  if (state.selectedManager) items.push(state.selectedManager);
  if (state.selectedCallName) items.push(state.selectedCallName);
  if (state.selectedFaction) items.push(state.selectedFaction);

  // Kits derived ONLY from Wrestler
  if (state.selectedWrestler) {
    const wrestlerTitle = state.selectedWrestler.title;
    const kits = (state.cardDatabase || []).filter(c =>
      state.isKitCard(c) && c['Signature For'] === wrestlerTitle
    );
    items.push(...kits);
  }

  personaDisplay.style.display = items.length ? 'block' : 'none';
  if (!items.length) return;

  personaDisplay.innerHTML = `<h3>Persona & Kit</h3><div class="persona-card-list"></div>`;
  const list = personaDisplay.querySelector('.persona-card-list');

  const order = { 'Wrestler': 0, 'Manager': 1, 'Call Name': 2, 'Faction': 3 };
  items.sort((a, b) => {
    const ao = order[a.card_type] ?? 99;
    const bo = order[b.card_type] ?? 99;
    if (ao !== bo) return ao - bo;
    return a.title.localeCompare(b.title);
  });

  for (const card of items) {
    const div = document.createElement('div');
    div.className = 'persona-card-item';
    div.textContent = card.title;
    div.dataset.title = card.title;
    div.dataset.type = card.card_type; // important for duplicates
    list.appendChild(div);
  }
}

// Modal helpers
export function openCardModal(cardTitle, cardType = null) {
  if (!cardModal || !modalCardContent) return;

  let card = null;

  if (cardType && typeof state.getCardByTitleAndType === 'function') {
    card = state.getCardByTitleAndType(cardTitle, cardType);
  }

  if (!card) {
    card = (state.cardDatabase || []).find(c => c && c.title === cardTitle) || null;
  }
  if (!card) return;

  modalCardContent.innerHTML = generateCardVisualHTML(card);
  cardModal.style.display = 'flex';
}

export function closeCardModal() {
  if (!cardModal) return;
  cardModal.style.display = 'none';
  if (modalCardContent) modalCardContent.innerHTML = '';
}
