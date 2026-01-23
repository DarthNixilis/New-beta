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
        const lines = text.trim().split(/\r?\n/);
        let newWrestler = null, newManager = null, newCallName = null, newFaction = null;
        let newStartingDeck = [], newPurchaseDeck = [], currentSection = '';
        
        lines.forEach(line => {
            const trimmedLine = line.trim();
            if (!trimmedLine || trimmedLine.toLowerCase().startsWith('kit')) return;
            
            // Parse persona headers
            if (trimmedLine.toLowerCase().startsWith('wrestler:')) {
                const wrestlerName = trimmedLine.substring(9).trim();
                const wrestler = state.cardTitleCache[wrestlerName];
                if (wrestler && wrestler.card_type === 'Wrestler') newWrestler = wrestler;
            } 
            else if (trimmedLine.toLowerCase().startsWith('manager:')) {
                const managerName = trimmedLine.substring(8).trim();
                if (managerName.toLowerCase() !== 'none') {
                    const manager = state.cardTitleCache[managerName];
                    if (manager && manager.card_type === 'Manager') newManager = manager;
                }
            }
            else if (trimmedLine.toLowerCase().startsWith('call name:') || trimmedLine.toLowerCase().startsWith('callname:')) {
                const callNameStr = trimmedLine.toLowerCase();
                const callNameStart = callNameStr.includes('call name:') ? 'call name:' : 'callname:';
                const callNameName = trimmedLine.substring(callNameStart.length).trim();
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
            else if (trimmedLine.startsWith('--- Starting Deck')) { 
                currentSection = 'starting'; 
            }
            else if (trimmedLine.startsWith('--- Purchase Deck')) { 
                currentSection = 'purchase'; 
            }
            // Parse card lines
            else {
                const match = trimmedLine.match(/^(\d+)x\s+(.+)/);
                if (match) {
                    const count = parseInt(match[1], 10);
                    const cardName = match[2].trim();
                    if (state.cardTitleCache[cardName]) {
                        for (let i = 0; i < count; i++) {
                            if (currentSection === 'starting') newStartingDeck.push(cardName);
                            else if (currentSection === 'purchase') newPurchaseDeck.push(cardName);
                        }
                    }
                }
            }
        });
        
        // Set all personas
        state.setSelectedWrestler(newWrestler);
        state.setSelectedManager(newManager);
        state.setSelectedCallName(newCallName);
        state.setSelectedFaction(newFaction);
        
        // Update dropdown values
        wrestlerSelect.value = newWrestler ? newWrestler.title : "";
        managerSelect.value = newManager ? newManager.title : "";
        if (callNameSelect) callNameSelect.value = newCallName ? newCallName.title : "";
        if (factionSelect) factionSelect.value = newFaction ? newFaction.title : "";
        
        // Set decks
        state.setStartingDeck(newStartingDeck);
        state.setPurchaseDeck(newPurchaseDeck);
        
        // Update UI
        renderDecks();
        renderPersonaDisplay();
        document.dispatchEvent(new Event('filtersChanged'));
        importStatus.textContent = 'Deck imported successfully!';
        importStatus.style.color = 'green';
        setTimeout(() => { importModal.style.display = 'none'; }, 1500);
    } catch (error) {
        console.error('Error parsing decklist:', error);
        importStatus.textContent = `An unexpected error occurred: ${error.message}`;
        importStatus.style.color = 'red';
    }
}
