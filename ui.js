// ui.js

import * as state from './config.js';
import { generateCardVisualHTML } from './card-renderer.js';

// --- DOM REFERENCES ---
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
const modalCloseButton = cardModal.querySelector('.modal-close-button');

// --- RENDERING FUNCTIONS ---

export function renderCardPool(cards) {
    try {
        searchResults.innerHTML = '';
        searchResults.className = `card-list ${state.currentViewMode}-view`;
        if (state.currentViewMode === 'grid') searchResults.setAttribute('data-columns', state.numGridColumns);
        else searchResults.removeAttribute('data-columns');
        
        if (!cards || cards.length === 0) {
            searchResults.innerHTML = '<p>No cards match the current filters.</p>';
            return;
        }
        
        cards.forEach(card => {
            if (!card || !card.title) return;
            
            const cardElement = document.createElement('div');
            cardElement.className = state.currentViewMode === 'list' ? 'card-item' : 'grid-card-item';
            
            try {
                if (state.isSignatureFor(card)) {
                    cardElement.classList.add('signature-highlight');
                }
            } catch (e) {
                console.error("Error checking signature:", e);
            }
            
            cardElement.dataset.title = card.title;
            
            // Get target for maneuvers
            const target = state.getCardTarget(card);
            const isManeuver = ['Strike', 'Grapple', 'Submission'].includes(card.card_type);
            
            // Get kit persona name
            const kitPersona = state.getKitPersona(card);
            
            // Only show kit info for non-persona cards that go in decks
            const isPersonaCard = ['Wrestler', 'Manager', 'Call Name', 'Faction'].includes(card.card_type);
            const showKitInfo = kitPersona && !isPersonaCard;
            
            if (state.currentViewMode === 'list') {
                // Build the display string with target if applicable
                let displayText = `${card.title} (C:${card.cost ?? 'N/A'}`;
                
                if (isManeuver && card.damage !== null) {
                    displayText += `, D:${card.damage}`;
                    if (target) displayText += ` [T:${target}]`;
                } else if (card.damage !== null) {
                    displayText += `, D:${card.damage}`;
                }
                
                displayText += `, M:${card.momentum ?? 'N/A'})`;
                
                cardElement.innerHTML = `<span data-title="${card.title}">${displayText}</span>`;
                
                const buttonsDiv = document.createElement('div');
                buttonsDiv.className = 'card-buttons';
                
                // Add kit info if applicable
                if (showKitInfo) {
                    const kitSpan = document.createElement('span');
                    kitSpan.className = 'kit-persona';
                    kitSpan.textContent = kitPersona;
                    kitSpan.title = `${kitPersona}'s Kit`;
                    kitSpan.style.cssText = `
                        font-size: 11px;
                        color: #666;
                        display: block;
                        margin-top: 2px;
                    `;
                    cardElement.appendChild(kitSpan);
                }
                
                if (card.cost === 0) {
                    buttonsDiv.innerHTML = `
                        <button data-title="${card.title}" data-deck-target="starting">Starting</button>
                        <button class="btn-purchase" data-title="${card.title}" data-deck-target="purchase">Purchase</button>
                    `;
                } else {
                    buttonsDiv.innerHTML = `<button class="btn-purchase" data-title="${card.title}" data-deck-target="purchase">Purchase</button>`;
                }
                cardElement.appendChild(buttonsDiv);
            } else {
                // Grid view
                const visualHTML = generateCardVisualHTML(card);
                cardElement.innerHTML = `<div class="card-visual" data-title="${card.title}">${visualHTML}</div>`;
                
                // Add kit info below the visual in grid view (stacked)
                if (showKitInfo) {
                    const kitDiv = document.createElement('div');
                    kitDiv.className = 'grid-kit-info';
                    kitDiv.style.cssText = `
                        font-size: 11px;
                        color: #666;
                        text-align: center;
                        margin-top: 5px;
                        line-height: 1.2;
                    `;
                    
                    // Stack persona names (one word per line if multiple)
                    const personaWords = kitPersona.split(' ');
                    personaWords.forEach(word => {
                        const wordDiv = document.createElement('div');
                        wordDiv.textContent = word;
                        kitDiv.appendChild(wordDiv);
                    });
                    
                    kitDiv.title = `${kitPersona}'s Kit`;
                    cardElement.appendChild(kitDiv);
                }
                
                const buttonsDiv = document.createElement('div');
                buttonsDiv.className = 'card-buttons';
                buttonsDiv.style.marginTop = '8px';
                
                if (card.cost === 0) {
                    buttonsDiv.innerHTML = `
                        <button data-title="${card.title}" data-deck-target="starting" style="margin-bottom: 4px;">Starting</button>
                        <button class="btn-purchase" data-title="${card.title}" data-deck-target="purchase">Purchase</button>
                    `;
                } else {
                    buttonsDiv.innerHTML = `<button class="btn-purchase" data-title="${card.title}" data-deck-target="purchase">Purchase</button>`;
                }
                cardElement.appendChild(buttonsDiv);
            }
            
            searchResults.appendChild(cardElement);
        });
    } catch (error) {
        console.error("Error rendering card pool:", error);
        searchResults.innerHTML = `<p style="color: red;">Error rendering cards: ${error.message}</p>`;
    }
}

export function renderPersonaDisplay() {
    try {
        if (!state.selectedWrestler && !state.selectedManager && !state.selectedCallName && !state.selectedFaction) { 
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
        if (state.selectedCallName) activePersona.push(state.selectedCallName);
        if (state.selectedFaction) activePersona.push(state.selectedFaction);
        
        activePersona.forEach(p => cardsToShow.add(p));
        const activePersonaTitles = activePersona.map(p => p.title);
        const kitCards = state.cardDatabase.filter(card => {
            try {
                return state.isKitCard(card) && activePersonaTitles.includes(card['Signature For']);
            } catch (e) {
                return false;
            }
        });
        kitCards.forEach(card => cardsToShow.add(card));
        const sortedCards = Array.from(cardsToShow).sort((a, b) => {
            const typeOrder = ['Wrestler', 'Manager', 'Call Name', 'Faction', 'Action', 'Response', 'Strike', 'Grapple', 'Submission'];
            const aIndex = typeOrder.indexOf(a.card_type);
            const bIndex = typeOrder.indexOf(b.card_type);
            
            if (aIndex !== -1 && bIndex !== -1) {
                return aIndex - bIndex;
            }
            
            return a.title.localeCompare(b.title);
        });
        sortedCards.forEach(card => {
            const item = document.createElement('div');
            item.className = 'persona-card-item';
            item.textContent = card.title;
            item.dataset.title = card.title;
            list.appendChild(item);
        });
    } catch (error) {
        console.error("Error rendering persona display:", error);
        personaDisplay.innerHTML = `<p style="color: red;">Error loading persona: ${error.message}</p>`;
    }
}

export function showCardModal(cardTitle) {
    try {
        state.setLastFocusedElement(document.activeElement);
        const card = state.cardDatabase.find(c => c && c.title === cardTitle);
        if (!card) {
            console.error("Card not found:", cardTitle);
            return;
        }
        
        // Get target and kit info for the modal
        const target = state.getCardTarget(card);
        const kitPersona = state.getKitPersona(card);
        const isPersonaCard = ['Wrestler', 'Manager', 'Call Name', 'Faction'].includes(card.card_type);
        const showKitInfo = kitPersona && !isPersonaCard;
        
        // Generate custom placeholder with kit info
        const typeClass = `type-${card.card_type ? card.card_type.toLowerCase() : 'unknown'}`;
        const placeholderHTML = `
            <div class="placeholder-card">
                <div class="placeholder-header">
                    <span>${card.title || 'Unknown Card'}</span>
                </div>
                <div class="placeholder-stats-line">
                    <div class="stats-left">
                        ${card.damage !== null && card.damage !== undefined ? `<span>D:${card.damage}</span>` : ''}
                        <span>M:${card.momentum ?? 'N/A'}</span>
                        ${target ? `<span class="target-display">T:${target}</span>` : ''}
                    </div>
                    <div class="cost-right">
                        <span>C:${card.cost ?? 'N/A'}</span>
                        ${showKitInfo ? `<div class="kit-persona-display">${kitPersona}</div>` : ''}
                    </div>
                </div>
                <div class="placeholder-art-area"><span>Art Missing</span></div>
                <div class="placeholder-type-line ${typeClass}"><span>${card.card_type || 'Unknown'}</span></div>
                <div class="placeholder-text-box">
                    <p>${card.text_box?.raw_text || ''}</p>
                </div>
            </div>`;
        
        modalCardContent.innerHTML = placeholderHTML;
        cardModal.style.display = 'flex';
        cardModal.setAttribute('role', 'dialog');
        cardModal.setAttribute('aria-modal', 'true');
        modalCloseButton.focus();
    } catch (error) {
        console.error("Error showing card modal:", error);
        modalCardContent.innerHTML = `<p style="color: red; padding: 20px;">Error loading card: ${error.message}</p>`;
        cardModal.style.display = 'flex';
    }
}

export function renderDecks() {
    try {
        renderDeckList(startingDeckList, state.startingDeck);
        renderDeckList(purchaseDeckList, state.purchaseDeck);
        updateDeckCounts();
        state.saveStateToCache();
    } catch (error) {
        console.error("Error rendering decks:", error);
    }
}

function renderDeckList(element, deck) {
    try {
        element.innerHTML = '';
        if (!deck || !Array.isArray(deck)) return;
        
        const cardCounts = deck.reduce((acc, cardTitle) => { 
            acc[cardTitle] = (acc[cardTitle] || 0) + 1; 
            return acc; 
        }, {});
        
        Object.entries(cardCounts).forEach(([cardTitle, count]) => {
            const card = state.cardDatabase.find(c => c && c.title === cardTitle);
            if (!card) return;
            
            const cardElement = document.createElement('div');
            cardElement.className = 'card-item';
            const deckName = element === startingDeckList ? 'starting' : 'purchase';
            
            // Get kit info for deck list
            const kitPersona = state.getKitPersona(card);
            const isPersonaCard = ['Wrestler', 'Manager', 'Call Name', 'Faction'].includes(card.card_type);
            const showKitInfo = kitPersona && !isPersonaCard;
            
            let cardHTML = `<span data-title="${card.title}">${count}x ${card.title}</span>`;
            
            if (showKitInfo) {
                cardHTML += `<span class="kit-persona" style="font-size: 10px; color: #888; display: block; margin-top: 2px;">${kitPersona}</span>`;
            }
            
            cardHTML += `<button data-title="${card.title}" data-deck="${deckName}">Remove</button>`;
            
            cardElement.innerHTML = cardHTML;
            element.appendChild(cardElement);
        });
    } catch (error) {
        console.error("Error rendering deck list:", error);
        element.innerHTML = `<p style="color: red;">Error loading deck: ${error.message}</p>`;
    }
}

function updateDeckCounts() {
    try {
        startingDeckCount.textContent = state.startingDeck ? state.startingDeck.length : 0;
        purchaseDeckCount.textContent = state.purchaseDeck ? state.purchaseDeck.length : 0;
        startingDeckCount.parentElement.style.color = state.startingDeck && state.startingDeck.length === 24 ? 'green' : 'red';
        startingDeckHeader.style.color = state.startingDeck && state.startingDeck.length === 24 ? 'green' : 'inherit';
        purchaseDeckCount.parentElement.style.color = state.purchaseDeck && state.purchaseDeck.length >= 36 ? 'green' : 'red';
        purchaseDeckHeader.style.color = state.purchaseDeck && state.purchaseDeck.length >= 36 ? 'green' : 'inherit';
    } catch (error) {
        console.error("Error updating deck counts:", error);
    }
}

export function filterDeckList(deckListElement, query) {
    try {
        const items = deckListElement.querySelectorAll('.card-item');
        items.forEach(item => {
            const text = item.textContent.toLowerCase();
            item.style.display = text.includes(query.toLowerCase()) ? '' : 'none';
        });
    } catch (error) {
        console.error("Error filtering deck list:", error);
    }
}
