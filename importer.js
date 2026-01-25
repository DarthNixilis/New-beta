[file name]: importer.js
[file content begin]
// importer.js
import * as state from './config.js';
import { renderDecks, renderPersonaDisplay } from './ui.js';

// Helper function to parse LackeyCCG .dek format
function parseLackeyDekFormat(text) {
    try {
        const parser = new DOMParser();
        const xmlDoc = parser.parseFromString(text, 'text/xml');
        
        if (xmlDoc.getElementsByTagName('parsererror').length > 0) {
            return null;
        }
        
        const deckZone = xmlDoc.querySelector('superzone[name="Deck"]');
        const purchaseZone = xmlDoc.querySelector('superzone[name="Purchase_Deck"]');
        const startingZone = xmlDoc.querySelector('superzone[name="Starting"]');
        
        if (!deckZone && !purchaseZone && !startingZone) {
            return null;
        }
        
        const result = {
            wrestler: null,
            manager: null,
            callName: null,
            faction: null,
            startingDeck: [],
            purchaseDeck: []
        };
        
        if (startingZone) {
            const personaCards = startingZone.querySelectorAll('card name');
            personaCards.forEach(nameElement => {
                const cardName = nameElement.textContent.trim();
                const card = state.cardTitleCache[cardName];
                if (card) {
                    switch(card.card_type) {
                        case 'Wrestler': result.wrestler = card; break;
                        case 'Manager': result.manager = card; break;
                        case 'Call Name': result.callName = card; break;
                        case 'Faction': result.faction = card; break;
                    }
                }
            });
        }
        
        const parseZoneCards = (zone) => {
            const cards = [];
            if (zone) {
                const cardElements = zone.querySelectorAll('card');
                cardElements.forEach(cardElement => {
                    const nameElement = cardElement.querySelector('name');
                    if (nameElement) {
                        const cardName = nameElement.textContent.trim();
                        cards.push(cardName);
                    }
                });
            }
            return cards;
        };
        
        if (deckZone) {
            result.startingDeck = parseZoneCards(deckZone);
        }
        
        if (purchaseZone) {
            result.purchaseDeck = parseZoneCards(purchaseZone);
        }
        
        if (startingZone) {
            const startingCards = parseZoneCards(startingZone);
            startingCards.forEach(cardName => {
                const card = state.cardTitleCache[cardName];
                if (card && !['Wrestler', 'Manager', 'Call Name', 'Faction'].includes(card.card_type)) {
                    result.startingDeck.push(cardName);
                }
            });
        }
        
        return result;
    } catch (error) {
        console.error('Error parsing Lackey deck:', error);
        return null;
    }
}

// Helper function to parse plain text format - SIMPLIFIED AND WORKING
function parsePlainTextFormat(text) {
    const lines = text.trim().split(/\r?\n/);
    let newWrestler = null, newManager = null, newCallName = null, newFaction = null;
    let newStartingDeck = [], newPurchaseDeck = [], currentSection = '';
    
    // First pass: get personas
    for (const line of lines) {
        const trimmedLine = line.trim();
        if (!trimmedLine) continue;
        
        if (trimmedLine.toLowerCase().startsWith('wrestler:')) {
            const name = trimmedLine.substring(9).trim();
            if (name.toLowerCase() !== 'none') {
                newWrestler = state.cardTitleCache[name];
            }
        } else if (trimmedLine.toLowerCase().startsWith('manager:')) {
            const name = trimmedLine.substring(8).trim();
            if (name.toLowerCase() !== 'none') {
                newManager = state.cardTitleCache[name];
            }
        } else if (trimmedLine.toLowerCase().startsWith('call name:')) {
            const name = trimmedLine.substring(10).trim();
            if (name.toLowerCase() !== 'none') {
                newCallName = state.cardTitleCache[name];
            }
        } else if (trimmedLine.toLowerCase().startsWith('faction:')) {
            const name = trimmedLine.substring(8).trim();
            if (name.toLowerCase() !== 'none') {
                newFaction = state.cardTitleCache[name];
            }
        }
    }
    
    // Second pass: get deck cards
    for (const line of lines) {
        const trimmedLine = line.trim();
        if (!trimmedLine) continue;
        
        // Skip persona lines
        if (trimmedLine.toLowerCase().startsWith('wrestler:') ||
            trimmedLine.toLowerCase().startsWith('manager:') ||
            trimmedLine.toLowerCase().startsWith('call name:') ||
            trimmedLine.toLowerCase().startsWith('faction:') ||
            trimmedLine.toLowerCase().startsWith('kit')) {
            continue;
        }
        
        // Section headers
        if (trimmedLine.includes('Starting Deck') || trimmedLine.includes('starting deck')) {
            currentSection = 'starting';
            continue;
        }
        if (trimmedLine.includes('Purchase Deck') || trimmedLine.includes('purchase deck')) {
            currentSection = 'purchase';
            continue;
        }
        
        // Card lines
        const cardMatch = trimmedLine.match(/^(\d+)x?\s+(.+)/);
        if (cardMatch) {
            const count = parseInt(cardMatch[1], 10);
            let cardName = cardMatch[2].trim();
            
            // Remove kit persona in brackets if present
            const bracketIndex = cardName.lastIndexOf('[');
            if (bracketIndex !== -1) {
                cardName = cardName.substring(0, bracketIndex).trim();
            }
            
            // Try to find the card
            let card = state.cardTitleCache[cardName];
            
            // If not found, try cleaning the name
            if (!card) {
                const cleanName = cardName.replace(/\s*\(.*?\)\s*/g, '').trim();
                card = state.cardTitleCache[cleanName];
            }
            
            if (card) {
                for (let i = 0; i < count; i++) {
                    if (currentSection === 'starting') {
                        newStartingDeck.push(card.title);
                    } else if (currentSection === 'purchase') {
                        newPurchaseDeck.push(card.title);
                    }
                }
            }
        }
    }
    
    return {
        wrestler: newWrestler,
        manager: newManager,
        callName: newCallName,
        faction: newFaction,
        startingDeck: newStartingDeck,
        purchaseDeck: newPurchaseDeck
    };
}

export function parseAndLoadDeck(text) {
    const importStatus = document.getElementById('importStatus');
    const importModal = document.getElementById('importModal');
    const wrestlerSelect = document.getElementById('wrestlerSelect');
    const managerSelect = document.getElementById('managerSelect');
    const callNameSelect = document.getElementById('callNameSelect');
    const factionSelect = document.getElementById('factionSelect');
    
    try {
        let parsedDeck = parseLackeyDekFormat(text);
        if (!parsedDeck) {
            parsedDeck = parsePlainTextFormat(text);
        }
        
        if (!parsedDeck) {
            throw new Error('Could not parse deck file.');
        }
        
        // IMPORTANT: Set decks BEFORE personas to avoid any race conditions
        state.setStartingDeck(parsedDeck.startingDeck);
        state.setPurchaseDeck(parsedDeck.purchaseDeck);
        
        // Then set personas
        state.setSelectedWrestler(parsedDeck.wrestler);
        state.setSelectedManager(parsedDeck.manager);
        state.setSelectedCallName(parsedDeck.callName);
        state.setSelectedFaction(parsedDeck.faction);
        
        // Update dropdowns
        wrestlerSelect.value = parsedDeck.wrestler ? parsedDeck.wrestler.title : "";
        managerSelect.value = parsedDeck.manager ? parsedDeck.manager.title : "";
        if (callNameSelect) callNameSelect.value = parsedDeck.callName ? parsedDeck.callName.title : "";
        if (factionSelect) factionSelect.value = parsedDeck.faction ? parsedDeck.faction.title : "";
        
        // Update UI
        renderDecks();
        renderPersonaDisplay();
        
        // IMPORTANT: Use setTimeout to ensure UI updates before refreshing card pool
        setTimeout(() => {
            document.dispatchEvent(new Event('filtersChanged'));
            importStatus.textContent = `Deck imported! Starting: ${parsedDeck.startingDeck.length}, Purchase: ${parsedDeck.purchaseDeck.length}`;
            importStatus.style.color = 'green';
            
            setTimeout(() => {
                importModal.style.display = 'none';
            }, 1500);
        }, 100);
        
    } catch (error) {
        console.error('Error parsing decklist:', error);
        importStatus.textContent = `Error: ${error.message}`;
        importStatus.style.color = 'red';
    }
}
[file content end]
