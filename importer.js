[file name]: importer.js
[file content begin]
// importer.js
import * as state from './config.js';
import { renderDecks, renderPersonaDisplay } from './ui.js';

export function parseAndLoadDeck(text) {
    const importStatus = document.getElementById('importStatus');
    const importModal = document.getElementById('importModal');
    const wrestlerSelect = document.getElementById('wrestlerSelect');
    const managerSelect = document.getElementById('managerSelect');
    const callNameSelect = document.getElementById('callNameSelect');
    const factionSelect = document.getElementById('factionSelect');
    
    try {
        console.log("=== PARSING DECK ===");
        
        const lines = text.trim().split(/\r?\n/);
        let currentSection = 'startingDeck'; // Start with starting deck
        const result = {
            wrestler: null,
            manager: null,
            callName: null,
            faction: null,
            startingDeck: [],
            purchaseDeck: []
        };
        
        for (const line of lines) {
            const trimmedLine = line.trim();
            if (!trimmedLine) continue;
            
            console.log(`Line: "${trimmedLine}"`);
            
            // Check for section headers
            if (trimmedLine.toLowerCase() === 'purchase_deck:' || trimmedLine.toLowerCase() === 'purchase deck:') {
                currentSection = 'purchaseDeck';
                console.log("Switched to purchase deck section");
                continue;
            }
            
            if (trimmedLine.toLowerCase() === 'starting:') {
                currentSection = 'personas';
                console.log("Switched to personas section");
                continue;
            }
            
            if (trimmedLine.toLowerCase() === 'tokens:') {
                currentSection = 'tokens';
                console.log("Switched to tokens section (ignoring)");
                continue;
            }
            
            // Parse card lines (format: "1 Card Name" or "2 Card Name")
            const cardMatch = trimmedLine.match(/^(\d+)\s+(.+)$/);
            if (cardMatch) {
                const count = parseInt(cardMatch[1], 10);
                let cardName = cardMatch[2].trim();
                
                console.log(`Found card: ${count}x "${cardName}"`);
                
                // Remove kit persona in brackets if present
                const bracketIndex = cardName.lastIndexOf('[');
                if (bracketIndex !== -1) {
                    cardName = cardName.substring(0, bracketIndex).trim();
                }
                
                // Try to find the card
                let card = state.cardTitleCache[cardName];
                
                if (!card) {
                    console.log(`Card not found: "${cardName}", trying to clean...`);
                    // Try cleaning the name
                    const cleanName = cardName.replace(/\s*\(.*?\)\s*/g, '').trim();
                    card = state.cardTitleCache[cleanName];
                }
                
                if (card) {
                    console.log(`✓ Card found: "${card.title}" (${card.card_type})`);
                    
                    if (currentSection === 'personas') {
                        // Handle persona cards
                        console.log(`Processing as persona: ${card.card_type}`);
                        switch(card.card_type) {
                            case 'Wrestler':
                                result.wrestler = card;
                                console.log(`Set wrestler to: ${card.title}`);
                                break;
                            case 'Manager':
                                result.manager = card;
                                console.log(`Set manager to: ${card.title}`);
                                break;
                            case 'Call Name':
                                result.callName = card;
                                console.log(`Set call name to: ${card.title}`);
                                break;
                            case 'Faction':
                                result.faction = card;
                                console.log(`Set faction to: ${card.title}`);
                                break;
                            default:
                                console.log(`Warning: ${card.title} is not a persona card type (${card.card_type})`);
                        }
                    } else {
                        // Handle deck cards
                        for (let i = 0; i < count; i++) {
                            if (currentSection === 'startingDeck') {
                                result.startingDeck.push(card.title);
                            } else if (currentSection === 'purchaseDeck') {
                                result.purchaseDeck.push(card.title);
                            }
                        }
                    }
                } else {
                    console.warn(`✗ Card not found in database: "${cardName}"`);
                }
            } else {
                console.log(`Skipping line (not a card): "${trimmedLine}"`);
            }
        }
        
        console.log("=== PARSING COMPLETE ===");
        console.log("Result:", {
            wrestler: result.wrestler?.title || "None",
            manager: result.manager?.title || "None",
            callName: result.callName?.title || "None",
            faction: result.faction?.title || "None",
            startingDeckCount: result.startingDeck.length,
            purchaseDeckCount: result.purchaseDeck.length
        });
        
        // Check if we got anything
        if (result.startingDeck.length === 0 && result.purchaseDeck.length === 0) {
            throw new Error('No cards were imported. Check the deck format.');
        }
        
        // IMPORTANT: Reset filters first
        state.setActiveFilters([{}, {}, {}]);
        
        // Set decks
        state.setStartingDeck(result.startingDeck);
        state.setPurchaseDeck(result.purchaseDeck);
        
        // Set personas
        state.setSelectedWrestler(result.wrestler);
        state.setSelectedManager(result.manager);
        state.setSelectedCallName(result.callName);
        state.setSelectedFaction(result.faction);
        
        // Update dropdowns
        wrestlerSelect.value = result.wrestler ? result.wrestler.title : "";
        managerSelect.value = result.manager ? result.manager.title : "";
        if (callNameSelect) callNameSelect.value = result.callName ? result.callName.title : "";
        if (factionSelect) factionSelect.value = result.faction ? result.faction.title : "";
        
        // Save state
        state.saveStateToCache();
        
        // Update UI
        renderDecks();
        renderPersonaDisplay();
        
        // Force a refresh of the card pool
        setTimeout(() => {
            document.dispatchEvent(new Event('filtersChanged'));
            
            importStatus.textContent = `Deck imported! Starting: ${result.startingDeck.length}, Purchase: ${result.purchaseDeck.length}`;
            importStatus.style.color = 'green';
            
            setTimeout(() => {
                importModal.style.display = 'none';
                // Focus back on search input
                document.getElementById('searchInput').focus();
            }, 1500);
        }, 100);
        
    } catch (error) {
        console.error('Error parsing decklist:', error);
        importStatus.textContent = `Error: ${error.message}`;
        importStatus.style.color = 'red';
    }
}
[file content end]
