// exporter.js - UPDATED generatePlainTextDeck() function
export function generatePlainTextDeck() {
    const activePersonaTitles = [];
    if (state.selectedWrestler) activePersonaTitles.push(state.selectedWrestler.title);
    if (state.selectedManager) activePersonaTitles.push(state.selectedManager.title);
    if (state.selectedCallName) activePersonaTitles.push(state.selectedCallName.title);
    if (state.selectedFaction) activePersonaTitles.push(state.selectedFaction.title);
    
    // Get kit cards for ALL personas (not just wrestler/manager)
    // Kit cards are non-persona cards that have a persona in their Starting/Signature For field
    const kitCards = state.cardDatabase.filter(card => 
        state.isKitCard(card) && 
        !['Wrestler', 'Manager', 'Call Name', 'Faction'].includes(card.card_type) &&
        activePersonaTitles.includes(card['Signature For'])
    ).sort((a, b) => a.title.localeCompare(b.title));
    
    // Build the basic deck export
    let text = `Wrestler: ${state.selectedWrestler ? state.getKitPersona(state.selectedWrestler) : 'None'}\n`;
    text += `Manager: ${state.selectedManager ? state.getKitPersona(state.selectedManager) : 'None'}\n`;
    text += `Call Name: ${state.selectedCallName ? state.selectedCallName.title : 'None'}\n`;
    text += `Faction: ${state.selectedFaction ? state.selectedFaction.title : 'None'}\n`;
    
    // List all kit cards with their persona
    kitCards.forEach((card, index) => { 
        const personaName = state.getKitPersona(card) || card['Signature For'] || 'Unknown';
        text += `Kit${index + 1}: ${card.title} (${personaName})\n`; 
    });
    
    text += `\n--- Starting Deck (${state.startingDeck.length}/24) ---\n`;
    const startingCounts = state.startingDeck.reduce((acc, cardTitle) => { 
        const card = state.cardTitleCache[cardTitle];
        let cardLine = cardTitle;
        if (card) {
            const kitPersona = state.getKitPersona(card);
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
            const kitPersona = state.getKitPersona(card);
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
