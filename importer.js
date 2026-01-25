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
    
    console.log("Parsing import text...");
    
    lines.forEach((line, index) => {
        const trimmedLine = line.trim();
        if (!trimmedLine || trimmedLine.toLowerCase().startsWith('kit')) return;
        
        console.log(`Line ${index}: "${trimmedLine}"`);
        
        // Parse persona headers - SIMPLIFIED
        if (trimmedLine.toLowerCase().startsWith('wrestler:')) {
            const wrestlerName = trimmedLine.substring(9).trim();
            console.log(`Found wrestler: "${wrestlerName}"`);
            if (wrestlerName.toLowerCase() !== 'none' && wrestlerName !== '') {
                const wrestler = state.cardTitleCache[wrestlerName];
                if (wrestler) {
                    console.log(`Wrestler found in cache: ${wrestler.title}`);
                    newWrestler = wrestler;
                } else {
                    console.log(`Wrestler NOT found in cache: "${wrestlerName}"`);
                }
            }
        } 
        else if (trimmedLine.toLowerCase().startsWith('manager:')) {
            const managerName = trimmedLine.substring(8).trim();
            console.log(`Found manager: "${managerName}"`);
            if (managerName.toLowerCase() !== 'none' && managerName !== '') {
                const manager = state.cardTitleCache[managerName];
                if (manager) {
                    console.log(`Manager found in cache: ${manager.title}`);
                    newManager = manager;
                }
            }
        }
        else if (trimmedLine.toLowerCase().startsWith('call name:') || trimmedLine.toLowerCase().startsWith('callname:')) {
            const prefix = trimmedLine.toLowerCase().startsWith('call name:') ? 'call name:' : 'callname:';
            const callNameName = trimmedLine.substring(prefix.length).trim();
            console.log(`Found call name: "${callNameName}"`);
            if (callNameName.toLowerCase() !== 'none' && callNameName !== '') {
                const callName = state.cardTitleCache[callNameName];
                if (callName) {
                    console.log(`Call name found in cache: ${callName.title}`);
                    newCallName = callName;
                }
            }
        }
        else if (trimmedLine.toLowerCase().startsWith('faction:')) {
            const factionName = trimmedLine.substring(8).trim();
            console.log(`Found faction: "${factionName}"`);
            if (factionName.toLowerCase() !== 'none' && factionName !== '') {
                const faction = state.cardTitleCache[factionName];
                if (faction) {
                    console.log(`Faction found in cache: ${faction.title}`);
                    newFaction = faction;
                }
            }
        }
        // Parse deck sections
        else if (trimmedLine.startsWith('--- Starting Deck') || trimmedLine.toLowerCase().includes('starting deck')) { 
            currentSection = 'starting'; 
            console.log(`Switched to ${currentSection} section`);
        }
        else if (trimmedLine.startsWith('--- Purchase Deck') || trimmedLine.toLowerCase().includes('purchase deck')) { 
            currentSection = 'purchase'; 
            console.log(`Switched to ${currentSection} section`);
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
                
                console.log(`Card line: "${fullCardText}" -> Extracted: "${cardName}"`);
                
                // Try to find the card
                let card = state.cardTitleCache[cardName];
                
                // If not found, try without any special characters or additional text
                if (!card) {
                    // Remove any parenthetical text or extra descriptors
                    const cleanName = cardName.replace(/\s*\(.*?\)\s*/g, '').trim();
                    console.log(`Trying clean name: "${cleanName}"`);
                    card = state.cardTitleCache[cleanName];
                }
                
                if (card) {
                    console.log(`✓ Card found: "${card.title}" (${card.card_type})`);
                    for (let i = 0; i < count; i++) {
                        if (currentSection === 'starting') newStartingDeck.push(card.title);
                        else if (currentSection === 'purchase') newPurchaseDeck.push(card.title);
                    }
                } else {
                    console.warn(`✗ Card not found: "${cardName}" (from line: "${fullCardText}")`);
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
                    
                    console.log(`Card line (no x): "${fullCardText}" -> Extracted: "${cardName}"`);
                    
                    // Try to find the card
                    let card = state.cardTitleCache[cardName];
                    
                    // If not found, try without any special characters or additional text
                    if (!card) {
                        // Remove any parenthetical text or extra descriptors
                        const cleanName = cardName.replace(/\s*\(.*?\)\s*/g, '').trim();
                        console.log(`Trying clean name: "${cleanName}"`);
                        card = state.cardTitleCache[cleanName];
                    }
                    
                    if (card) {
                        console.log(`✓ Card found: "${card.title}" (${card.card_type})`);
                        for (let i = 0; i < count; i++) {
                            if (currentSection === 'starting') newStartingDeck.push(card.title);
                            else if (currentSection === 'purchase') newPurchaseDeck.push(card.title);
                        }
                    } else {
                        console.warn(`✗ Card not found: "${cardName}" (from line: "${fullCardText}")`);
                    }
                }
            }
        }
    });
    
    console.log("Parsed results:", {
        wrestler: newWrestler?.title || 'None',
        manager: newManager?.title || 'None', 
        callName: newCallName?.title || 'None',
        faction: newFaction?.title || 'None',
        startingDeck: newStartingDeck,
        purchaseDeck: newPurchaseDeck
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
        console.log("=== IMPORT STARTING ===");
        console.log("Input text preview:", text.substring(0, 200) + "...");
        
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
        
        console.log("=== PARSED DECK DATA ===");
        console.log("Wrestler:", parsedDeck.wrestler?.title || "None");
        console.log("Manager:", parsedDeck.manager?.title || "None");
        console.log("Call Name:", parsedDeck.callName?.title || "None");
        console.log("Faction:", parsedDeck.faction?.title || "None");
        console.log("Starting deck cards:", parsedDeck.startingDeck.length);
        console.log("Purchase deck cards:", parsedDeck.purchaseDeck.length);
        
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
        
        console.log("State updated, calling UI render functions...");
        
        // Update UI
        renderDecks();
        renderPersonaDisplay();
        document.dispatchEvent(new Event('filtersChanged'));
        importStatus.textContent = `Deck imported successfully! Starting: ${parsedDeck.startingDeck.length}, Purchase: ${parsedDeck.purchaseDeck.length}`;
        importStatus.style.color = 'green';
        
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
