// exporter.js
import * as state from './config.js';
import { generatePlaytestCardHTML } from './card-renderer.js';
import { toPascalCase } from './config.js';

export function generatePlainTextDeck() {
    const activePersonaTitles = [];
    if (state.selectedWrestler) activePersonaTitles.push(state.selectedWrestler.title);
    if (state.selectedManager) activePersonaTitles.push(state.selectedManager.title);
    if (state.selectedCallName) activePersonaTitles.push(state.selectedCallName.title);
    if (state.selectedFaction) activePersonaTitles.push(state.selectedFaction.title);
    
    const kitCards = state.cardDatabase.filter(card => {
        if (!card || !card['Starting']) return false;
        const personaName = card['Starting'].trim();
        return personaName && activePersonaTitles.includes(personaName);
    }).sort((a, b) => a.title.localeCompare(b.title));
    
    // Get kit persona name helper
    const getKitPersonaName = (card) => {
        if (!card || !card['Starting']) return '';
        const personaName = card['Starting'].trim();
        return personaName.replace(/\s*Wrestler$/, '');
    };
    
    // Build the basic deck export
    let text = `Wrestler: ${state.selectedWrestler ? getKitPersonaName(state.selectedWrestler) : 'None'}\n`;
    text += `Manager: ${state.selectedManager ? state.selectedManager.title : 'None'}\n`;
    text += `Call Name: ${state.selectedCallName ? state.selectedCallName.title : 'None'}\n`;
    text += `Faction: ${state.selectedFaction ? state.selectedFaction.title : 'None'}\n`;
    
    kitCards.forEach((card, index) => { 
        const personaName = getKitPersonaName(card);
        text += `Kit${index + 1}: ${card.title} (${personaName})\n`; 
    });
    
    text += `\n--- Starting Deck (${state.startingDeck.length}/24) ---\n`;
    const startingCounts = state.startingDeck.reduce((acc, cardTitle) => { 
        const card = state.cardTitleCache[cardTitle];
        let cardLine = cardTitle;
        if (card) {
            const kitPersona = getKitPersonaName(card);
            if (kitPersona && !['Wrestler', 'Manager', 'Call Name', 'Faction'].includes(card.card_type)) {
                cardLine += ` [${kitPersona}]`;
            }
        }
        acc[cardLine] = (acc[cardLine] || 0) + 1; 
        return acc; 
    }, {});
    Object.entries(startingCounts).sort((a, b) => a[0].localeCompare(b[0])).forEach(([cardLine, count]) => { text += `${count}x ${cardLine}\n`; });
    
    text += `\n--- Purchase Deck (${state.purchaseDeck.length}/36+) ---\n`;
    const purchaseCounts = state.purchaseDeck.reduce((acc, cardTitle) => { 
        const card = state.cardTitleCache[cardTitle];
        let cardLine = cardTitle;
        if (card) {
            const kitPersona = getKitPersonaName(card);
            if (kitPersona && !['Wrestler', 'Manager', 'Call Name', 'Faction'].includes(card.card_type)) {
                cardLine += ` [${kitPersona}]`;
            }
        }
        acc[cardLine] = (acc[cardLine] || 0) + 1; 
        return acc; 
    }, {});
    Object.entries(purchaseCounts).sort((a, b) => a[0].localeCompare(b[0])).forEach(([cardLine, count]) => { text += `${count}x ${cardLine}\n`; });
    
    // Add analysis section
    text += generateDeckAnalysis();
    
    return text;
}

// ... rest of exporter.js stays the same, just make sure to update the getKitPersonaName calls ...
