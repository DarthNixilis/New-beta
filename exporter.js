// exporter.js
import * as state from './config.js';
import { generatePlaytestCardHTML } from './card-renderer.js';
import html2canvas from 'https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js';

export function generatePlainTextDeck() {
    let output = "";
    
    // Persona headers
    if (state.selectedWrestler) {
        output += `Wrestler: ${state.selectedWrestler.title}\n`;
    }
    if (state.selectedManager) {
        output += `Manager: ${state.selectedManager.title}\n`;
    }
    if (state.selectedCallName) {
        output += `Call Name: ${state.selectedCallName.title}\n`;
    }
    if (state.selectedFaction) {
        output += `Faction: ${state.selectedFaction.title}\n`;
    }
    
    output += "\n";
    
    // Starting Deck
    const startingCounts = {};
    state.startingDeck.forEach(title => {
        startingCounts[title] = (startingCounts[title] || 0) + 1;
    });
    
    output += "--- Starting Deck ---\n";
    Object.entries(startingCounts).sort(([a], [b]) => a.localeCompare(b)).forEach(([title, count]) => {
        output += `${count}x ${title}\n`;
    });
    
    output += "\n";
    
    // Purchase Deck
    const purchaseCounts = {};
    state.purchaseDeck.forEach(title => {
        purchaseCounts[title] = (purchaseCounts[title] || 0) + 1;
    });
    
    output += "--- Purchase Deck ---\n";
    Object.entries(purchaseCounts).sort(([a], [b]) => a.localeCompare(b)).forEach(([title, count]) => {
        output += `${count}x ${title}\n`;
    });
    
    return output;
}

export function generateLackeyCCGDeck() {
    let output = "#AEW TCG Deck\n";
    
    // Persona headers as comments
    if (state.selectedWrestler) {
        output += `#Wrestler: ${state.selectedWrestler.title}\n`;
    }
    if (state.selectedManager) {
        output += `#Manager: ${state.selectedManager.title}\n`;
    }
    if (state.selectedCallName) {
        output += `#Call Name: ${state.selectedCallName.title}\n`;
    }
    if (state.selectedFaction) {
        output += `#Faction: ${state.selectedFaction.title}\n`;
    }
    
    output += "\n";
    
    // Starting Deck
    const startingCounts = {};
    state.startingDeck.forEach(title => {
        startingCounts[title] = (startingCounts[title] || 0) + 1;
    });
    
    output += "#Starting Deck\n";
    Object.entries(startingCounts).sort(([a], [b]) => a.localeCompare(b)).forEach(([title, count]) => {
        output += `${count} ${title}\n`;
    });
    
    output += "\n";
    
    // Purchase Deck
    const purchaseCounts = {};
    state.purchaseDeck.forEach(title => {
        purchaseCounts[title] = (purchaseCounts[title] || 0) + 1;
    });
    
    output += "#Purchase Deck\n";
    Object.entries(purchaseCounts).sort(([a], [b]) => a.localeCompare(b)).forEach(([title, count]) => {
        output += `${count} ${title}\n`;
    });
    
    return output;
}

export async function exportDeckAsImage() {
    if (!state.selectedWrestler && !state.selectedManager && !state.selectedCallName && !state.selectedFaction) {
        alert('Please select at least one persona before exporting as an image.');
        return;
    }
    
    // Create a temporary container for all cards
    const tempContainer = document.createElement('div');
    tempContainer.style.cssText = `
        position: fixed;
        top: -10000px;
        left: -10000px;
        width: 800px;
        background: white;
        padding: 20px;
        display: flex;
        flex-direction: column;
        gap: 20px;
        z-index: 10000;
    `;
    document.body.appendChild(tempContainer);
    
    try {
        // Add header with personas
        const headerDiv = document.createElement('div');
        headerDiv.style.cssText = `
            text-align: center;
            font-family: Arial, sans-serif;
            margin-bottom: 20px;
            border-bottom: 2px solid #333;
            padding-bottom: 10px;
        `;
        
        let headerText = 'AEW TCG Deck - ';
        const personas = [];
        if (state.selectedWrestler) personas.push(`Wrestler: ${state.selectedWrestler.title}`);
        if (state.selectedManager) personas.push(`Manager: ${state.selectedManager.title}`);
        if (state.selectedCallName) personas.push(`Call Name: ${state.selectedCallName.title}`);
        if (state.selectedFaction) personas.push(`Faction: ${state.selectedFaction.title}`);
        
        headerText += personas.join(' | ');
        headerDiv.innerHTML = `<h2 style="margin: 0 0 10px 0;">${headerText}</h2>`;
        
        const deckInfo = document.createElement('div');
        deckInfo.style.cssText = 'font-size: 14px; color: #666;';
        deckInfo.textContent = `Starting: ${state.startingDeck.length}/24 | Purchase: ${state.purchaseDeck.length}/36+`;
        headerDiv.appendChild(deckInfo);
        
        tempContainer.appendChild(headerDiv);
        
        // Add personas and kit cards
        const personaCards = [];
        if (state.selectedWrestler) personaCards.push(state.selectedWrestler);
        if (state.selectedManager) personaCards.push(state.selectedManager);
        if (state.selectedCallName) personaCards.push(state.selectedCallName);
        if (state.selectedFaction) personaCards.push(state.selectedFaction);
        
        // Get kit cards for all selected personas
        const activePersonaTitles = personaCards.map(p => p.title);
        const kitCards = state.cardDatabase.filter(card => 
            state.isKitCard(card) && activePersonaTitles.includes(card['Signature For'])
        );
        
        // Add all persona and kit cards
        [...personaCards, ...kitCards].forEach(card => {
            const cardDiv = document.createElement('div');
            cardDiv.innerHTML = generatePlaytestCardHTML(card, tempContainer, 750, 1050);
            tempContainer.appendChild(cardDiv);
        });
        
        // Add starting deck section header
        if (state.startingDeck.length > 0) {
            const startingHeader = document.createElement('div');
            startingHeader.style.cssText = `
                text-align: center;
                font-family: Arial, sans-serif;
                font-size: 18px;
                font-weight: bold;
                margin: 20px 0 10px 0;
                padding: 10px;
                background-color: #f0f0f0;
                border-radius: 5px;
            `;
            startingHeader.textContent = 'Starting Deck';
            tempContainer.appendChild(startingHeader);
            
            // Group starting deck cards
            const startingCounts = {};
            state.startingDeck.forEach(title => {
                startingCounts[title] = (startingCounts[title] || 0) + 1;
            });
            
            Object.entries(startingCounts).sort(([a], [b]) => a.localeCompare(b)).forEach(([title, count]) => {
                const card = state.cardDatabase.find(c => c.title === title);
                if (card) {
                    const cardDiv = document.createElement('div');
                    cardDiv.innerHTML = generatePlaytestCardHTML(card, tempContainer, 750, 1050);
                    tempContainer.appendChild(cardDiv);
                }
            });
        }
        
        // Add purchase deck section header
        if (state.purchaseDeck.length > 0) {
            const purchaseHeader = document.createElement('div');
            purchaseHeader.style.cssText = `
                text-align: center;
                font-family: Arial, sans-serif;
                font-size: 18px;
                font-weight: bold;
                margin: 20px 0 10px 0;
                padding: 10px;
                background-color: #f0f0f0;
                border-radius: 5px;
            `;
            purchaseHeader.textContent = 'Purchase Deck';
            tempContainer.appendChild(purchaseHeader);
            
            // Group purchase deck cards
            const purchaseCounts = {};
            state.purchaseDeck.forEach(title => {
                purchaseCounts[title] = (purchaseCounts[title] || 0) + 1;
            });
            
            Object.entries(purchaseCounts).sort(([a], [b]) => a.localeCompare(b)).forEach(([title, count]) => {
                const card = state.cardDatabase.find(c => c.title === title);
                if (card) {
                    const cardDiv = document.createElement('div');
                    cardDiv.innerHTML = generatePlaytestCardHTML(card, tempContainer, 750, 1050);
                    tempContainer.appendChild(cardDiv);
                }
            });
        }
        
        // Use html2canvas to capture the entire container
        const canvas = await html2canvas(tempContainer, {
            scale: 2,
            useCORS: true,
            allowTaint: true,
            backgroundColor: '#ffffff'
        });
        
        // Convert canvas to image and download
        const image = canvas.toDataURL('image/png', 1.0);
        const link = document.createElement('a');
        link.href = image;
        
        // Create filename with personas
        let filename = 'AEW-Deck';
        if (state.selectedWrestler) {
            filename += `-${state.toPascalCase(state.selectedWrestler.title)}`;
        }
        filename += '.png';
        
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
    } catch (error) {
        console.error('Error exporting deck as image:', error);
        alert('Failed to export deck as image. Please try again.');
    } finally {
        // Clean up
        document.body.removeChild(tempContainer);
    }
}
