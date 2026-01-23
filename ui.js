import * as state from './config.js';
import { generateCardVisualHTML } from './card-renderer.js';

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

// --------------------
// Persona Display
// --------------------
export function renderPersonaDisplay() {
    const { personaDisplay } = getDOM();
    if (!personaDisplay) return;

    const activePersona = [];

    if (state.selectedWrestler) activePersona.push(state.selectedWrestler);
    if (state.selectedManager) activePersona.push(state.selectedManager);
    if (state.selectedCallName) activePersona.push(state.selectedCallName);
    if (state.selectedFaction) activePersona.push(state.selectedFaction);

    if (activePersona.length === 0) {
        personaDisplay.style.display = 'none';
        return;
    }

    personaDisplay.style.display = 'block';
    personaDisplay.innerHTML = '<h3>Persona & Kit</h3><div class="persona-card-list"></div>';

    const list = personaDisplay.querySelector('.persona-card-list');

    const cardsToShow = new Set(activePersona);
    const activeTitles = activePersona.map(p => p.title);

    const kitCards = state.cardDatabase.filter(card =>
        state.isKitCard(card) && activeTitles.includes(card['Signature For'])
    );

    kitCards.forEach(card => cardsToShow.add(card));

    const personaOrder = ['Wrestler', 'Manager', 'Call Name', 'Faction'];

    Array.from(cardsToShow)
        .sort((a, b) => {
            const ai = personaOrder.indexOf(a.card_type);
            const bi = personaOrder.indexOf(b.card_type);
            return (ai === -1 ? 99 : ai) - (bi === -1 ? 99 : bi) || a.title.localeCompare(b.title);
        })
        .forEach(card => {
            const item = document.createElement('div');
            item.className = 'persona-card-item';
            item.textContent = card.title;
            item.dataset.title = card.title;
            list.appendChild(item);
        });
}
