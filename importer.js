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
        
        // Check for parsing errors
        if (xmlDoc.getElementsByTagName('parsererror').length > 0) {
            return null; // Not valid XML
        }
        
        const deckZone = xmlDoc.querySelector('superzone[name="Deck"]');
        const purchaseZone = xmlDoc.querySelector('superzone[name="Purchase_Deck"]');
        const startingZone = xmlDoc.querySelector('superzone[name="Starting"]');
        
        if (!deckZone && !purchaseZone && !startingZone) {
            return null; // Not a Lackey deck file
        }
        
        const result = {
            wrestler: null,
            manager: null,
            callName: null,
            faction: null,
            startingDeck: [],
            purchaseDeck: []
        };
        
        // Parse personas from Starting zone
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
        
        // Parse deck cards
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
        
        // Starting deck comes from "Deck" zone in Lackey format
        if (deckZone) {
            result.startingDeck = parseZoneCards(deckZone);
        }
        
        // Purchase deck
        if (purchaseZone) {
            result.purchaseDeck = parseZoneCards(purchaseZone);
        }
        
        // Also check for starting deck in "Starting" zone (non-persona cards)
        if (startingZone) {
            const startingCards = parseZoneCards(startingZone);
            // Filter out persona cards
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

// Helper function to parse plain text format - FIXED VERSION
function parsePlainTextFormat(text) {
    const lines = text.trim().split(/\r?\n/);
    let newWrestler = null, newManager = null, newCallName = null, newFaction = null;
    let newStartingDeck = [], newPurchaseDeck = [], currentSection = '';
    
    lines.forEach(line => {
        const trimmedLine = line.trim();
        if (!trimmedLine || trimmedLine.toLowerCase().startsWith('kit')) return;
        
        // Parse persona headers - FIXED: Match both with and without spaces
        if (trimmedLine.toLowerCase().startsWith('wrestler:')) {
            const wrestlerName = trimmedLine.substring(9).trim();
            if (wrestlerName.toLowerCase() !== 'none') {
                const wrestler = state.cardTitleCache[wrestlerName];
                if (wrestler && wrestler.card_type === 'Wrestler') newWrestler = wrestler;
            }
        } 
        else if (trimmedLine.toLowerCase().startsWith('manager:')) {
            const managerName = trimmedLine.substring(8).trim();
            if (managerName.toLowerCase() !== 'none') {
                const manager = state.cardTitleCache[managerName];
                if (manager && manager.card_type === 'Manager') newManager = manager;
            }
        }
        else if (trimmedLine.toLowerCase().startsWith('call name:')) {
            const callNameName = trimmedLine.substring(10).trim();
            if (callNameName.toLowerCase() !== 'none') {
                const callName = state.cardTitleCache[callNameName];
                if (callName && callName.card_type === 'Call Name') newCallName = callName;
            }
        }
        else if (trimmedLine.toLowerCase().startsWith('callname:')) {
            const callNameName = trimmedLine.substring(9).trim();
            if (callNameName.toLowerCase() !== 'none') {
                const callName = state.cardTitleCache[callNameName];
                if (callName && callName.card_type === 'Call Name') newCallName = callName;
            }
        }
        else if (trimmedLine.toLowerCase().startsWith('faction:')) {
            const factionName = trimmedLine.substring(8).trim();
            if (factionName.toLowerCase() !== 'none') {
                const faction = state.cardTitleCache[factionName];
                if (faction && faction.card_type === 'Faction') newFaction = faction;
            }
        }
        // Parse deck sections
        else if (trimmedLine.startsWith('--- Starting Deck') || trimmedLine.toLowerCase().includes('starting deck')) { 
            currentSection = 'starting'; 
        }
        else if (trimmedLine.startsWith('--- Purchase Deck') || trimmedLine.toLowerCase().includes('purchase deck')) { 
            currentSection = 'purchase'; 
        }
        // Parse card lines - FIXED: Handle kit persona in brackets
        else {
            const match = trimmedLine.match(/^(\d+)x\s+(.+)/);
            if (match) {
                const count = parseInt(match[1], 10);
                const fullCardText = match[2].trim();
                
                // Extract card name (remove kit persona in brackets if present)
                let cardName = fullCardText;
                const bracketIndex = fullCardText.lastIndexOf('[');
                if (bracketIndex !== -1) {
                    // Remove everything from the last '[' including the bracket
                    cardName = fullCardText.substring(0, bracketIndex).trim();
                }
                
                // Try to find the card
                let card = state.cardTitleCache[cardName];
                
                // If not found, try without any special characters or additional text
                if (!card) {
                    // Remove any parenthetical text or extra descriptors
                    const cleanName = cardName.replace(/\s*\(.*?\)\s*/g, '').trim();
                    card = state.cardTitleCache[cleanName];
                }
                
                if (card) {
                    for (let i = 0; i < count; i++) {
                        if (currentSection === 'starting') newStartingDeck.push(card.title);
                        else if (currentSection === 'purchase') newPurchaseDeck.push(card.title);
                    }
                } else {
                    console.warn(`Card not found: "${cardName}" (from line: "${fullCardText}")`);
                }
            }
            // Also support format without "x" (just number and card name)
            else {
                const simpleMatch = trimmedLine.match(/^(\d+)\s+(.+)/);
                if (simpleMatch) {
                    const count = parseInt(simpleMatch[1], 10);
                    const fullCardText = simpleMatch[2].trim();
                    
                    // Extract card name (remove kit persona in brackets if present)
                    let cardName = fullCardText;
                    const bracketIndex = fullCardText.lastIndexOf('[');
                    if (bracketIndex !== -1) {
                        // Remove everything from the last '[' including the bracket
                        cardName = fullCardText.substring(0, bracketIndex).trim();
                    }
                    
                    // Try to find the card
                    let card = state.cardTitleCache[cardName];
                    
                    // If not found, try without any special characters or additional text
                    if (!card) {
                        // Remove any parenthetical text or extra descriptors
                        const cleanName = cardName.replace(/\s*\(.*?\)\s*/g, '').trim();
                        card = state.cardTitleCache[cleanName];
                    }
                    
                    if (card) {
                        for (let i = 0; i < count; i++) {
                            if (currentSection === 'starting') newStartingDeck.push(card.title);
                            else if (currentSection === 'purchase') newPurchaseDeck.push(card.title);
                        }
                    } else {
                        console.warn(`Card not found: "${cardName}" (from line: "${fullCardText}")`);
                    }
                }
            }
        }
    });
    
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
        let parsedDeck;
        
        // Try to parse as LackeyCCG .dek format first
        parsedDeck = parseLackeyDekFormat(text);
        
        // If not Lackey format, try plain text format
        if (!parsedDeck) {
            parsedDeck = parsePlainTextFormat(text);
        }
        
        if (!parsedDeck) {
            throw new Error('Could not parse deck file. Please check the format.');
        }
        
        console.log("Parsed deck:", parsedDeck);
        
        // Set all personas
        state.setSelectedWrestler(parsedDeck.wrestler);
        state.setSelectedManager(parsedDeck.manager);
        state.setSelectedCallName(parsedDeck.callName);
        state.setSelectedFaction(parsedDeck.faction);
        
        // Update dropdown values
        wrestlerSelect.value = parsedDeck.wrestler ? parsedDeck.wrestler.title : "";
        managerSelect.value = parsedDeck.manager ? parsedDeck.manager.title : "";
        if (callNameSelect) callNameSelect.value = parsedDeck.callName ? parsedDeck.callName.title : "";
        if (factionSelect) factionSelect.value = parsedDeck.faction ? parsedDeck.faction.title : "";
        
        // Set decks
        state.setStartingDeck(parsedDeck.startingDeck);
        state.setPurchaseDeck(parsedDeck.purchaseDeck);
        
        // Update UI
        renderDecks();
        renderPersonaDisplay();
        document.dispatchEvent(new Event('filtersChanged'));
        importStatus.textContent = `Deck imported successfully! Starting: ${parsedDeck.startingDeck.length}, Purchase: ${parsedDeck.purchaseDeck.length}`;
        importStatus.style.color = 'green';
        
        // Show debug info
        console.log("Starting deck imported:", parsedDeck.startingDeck);
        console.log("Purchase deck imported:", parsedDeck.purchaseDeck);
        
        setTimeout(() => { 
            importModal.style.display = 'none'; 
        }, 2000);
    } catch (error) {
        console.error('Error parsing decklist:', error);
        importStatus.textContent = `Error: ${error.message}`;
        importStatus.style.color = 'red';
    }
}
[file content end]
