// exporter.js
import * as state from './config.js';
import { generatePlaytestCardHTML } from './card-renderer.js';
import { toPascalCase } from './config.js';

export function generatePlainTextDeck() {
    const activePersonaTitles = [];
    if (state.selectedWrestler) activePersonaTitles.push(state.selectedWrestler.title);
    if (state.selectedManager) activePersonaTitles.push(state.selectedManager.title);
    const kitCards = state.cardDatabase.filter(card => state.isKitCard(card) && activePersonaTitles.includes(card['Signature For'])).sort((a, b) => a.title.localeCompare(b.title));
    
    // Build the basic deck export
    let text = `Wrestler: ${state.selectedWrestler ? state.selectedWrestler.title : 'None'}\n`;
    text += `Manager: ${state.selectedManager ? state.selectedManager.title : 'None'}\n`;
    kitCards.forEach((card, index) => { text += `Kit${index + 1}: ${card.title}\n`; });
    text += `\n--- Starting Deck (${state.startingDeck.length}/24) ---\n`;
    const startingCounts = state.startingDeck.reduce((acc, cardTitle) => { acc[cardTitle] = (acc[cardTitle] || 0) + 1; return acc; }, {});
    Object.entries(startingCounts).sort((a, b) => a[0].localeCompare(b[0])).forEach(([cardTitle, count]) => { text += `${count}x ${cardTitle}\n`; });
    text += `\n--- Purchase Deck (${state.purchaseDeck.length}/36+) ---\n`;
    const purchaseCounts = state.purchaseDeck.reduce((acc, cardTitle) => { acc[cardTitle] = (acc[cardTitle] || 0) + 1; return acc; }, {});
    Object.entries(purchaseCounts).sort((a, b) => a[0].localeCompare(b[0])).forEach(([cardTitle, count]) => { text += `${count}x ${cardTitle}\n`; });
    
    // Add analysis section
    text += generateDeckAnalysis();
    
    return text;
}

// NEW: Generate deck analysis
function generateDeckAnalysis() {
    let analysis = '\n\n=== DECK ANALYSIS ===\n\n';
    
    // Combine all cards from both decks
    const allCards = [...state.startingDeck, ...state.purchaseDeck].map(title => state.cardTitleCache[title]);
    
    // 1. COST ANALYSIS
    analysis += 'COST DISTRIBUTION:\n';
    const costDistribution = {};
    const momentumDistribution = {};
    const damageDistribution = {};
    
    allCards.forEach(card => {
        if (!card) return;
        
        // Cost analysis
        const cost = card.cost !== null && card.cost !== undefined ? card.cost : 'N/A';
        costDistribution[cost] = (costDistribution[cost] || 0) + 1;
        
        // Momentum analysis (for non-persona cards)
        if (card.momentum !== null && card.momentum !== undefined && card.card_type !== 'Wrestler' && card.card_type !== 'Manager') {
            const momentum = card.momentum;
            momentumDistribution[momentum] = (momentumDistribution[momentum] || 0) + 1;
        }
        
        // Damage analysis (for maneuvers)
        if (card.damage !== null && card.damage !== undefined && 
            ['Strike', 'Grapple', 'Submission'].includes(card.card_type)) {
            const damage = card.damage;
            damageDistribution[damage] = (damageDistribution[damage] || 0) + 1;
        }
    });
    
    // Sort and display cost distribution
    const sortedCosts = Object.entries(costDistribution).sort((a, b) => {
        if (a[0] === 'N/A') return 1;
        if (b[0] === 'N/A') return -1;
        return parseInt(a[0]) - parseInt(b[0]);
    });
    
    sortedCosts.forEach(([cost, count]) => {
        const percentage = ((count / allCards.length) * 100).toFixed(1);
        analysis += `  Cost ${cost}: ${count} cards (${percentage}%)\n`;
    });
    
    // 2. CARD TYPE ANALYSIS
    analysis += '\nCARD TYPE DISTRIBUTION:\n';
    const typeDistribution = {};
    
    allCards.forEach(card => {
        if (!card) return;
        const type = card.card_type || 'Unknown';
        typeDistribution[type] = (typeDistribution[type] || 0) + 1;
    });
    
    // Sort types by count
    Object.entries(typeDistribution)
        .sort((a, b) => b[1] - a[1])
        .forEach(([type, count]) => {
            const percentage = ((count / allCards.length) * 100).toFixed(1);
            analysis += `  ${type}: ${count} cards (${percentage}%)\n`;
        });
    
    // 3. MOMENTUM ANALYSIS
    analysis += '\nMOMENTUM DISTRIBUTION (non-persona cards):\n';
    const sortedMomentum = Object.entries(momentumDistribution)
        .sort((a, b) => parseInt(a[0]) - parseInt(b[0]));
    
    if (sortedMomentum.length > 0) {
        sortedMomentum.forEach(([momentum, count]) => {
            analysis += `  Momentum ${momentum}: ${count} cards\n`;
        });
        
        // Calculate average momentum
        const totalMomentum = sortedMomentum.reduce((sum, [momentum, count]) => 
            sum + (parseInt(momentum) * count), 0);
        const totalCardsWithMomentum = sortedMomentum.reduce((sum, [, count]) => sum + count, 0);
        const avgMomentum = totalCardsWithMomentum > 0 ? (totalMomentum / totalCardsWithMomentum).toFixed(2) : 0;
        analysis += `  Average Momentum: ${avgMomentum}\n`;
    } else {
        analysis += '  No cards with momentum values\n';
    }
    
    // 4. DAMAGE ANALYSIS
    analysis += '\nDAMAGE DISTRIBUTION (maneuvers only):\n';
    const sortedDamage = Object.entries(damageDistribution)
        .sort((a, b) => parseInt(a[0]) - parseInt(b[0]));
    
    if (sortedDamage.length > 0) {
        sortedDamage.forEach(([damage, count]) => {
            analysis += `  Damage ${damage}: ${count} cards\n`;
        });
        
        // Calculate average damage
        const totalDamage = sortedDamage.reduce((sum, [damage, count]) => 
            sum + (parseInt(damage) * count), 0);
        const totalCardsWithDamage = sortedDamage.reduce((sum, [, count]) => sum + count, 0);
        const avgDamage = totalCardsWithDamage > 0 ? (totalDamage / totalCardsWithDamage).toFixed(2) : 0;
        analysis += `  Average Damage: ${avgDamage}\n`;
        
        // Find damage ranges
        const damageValues = sortedDamage.map(([damage]) => parseInt(damage));
        const minDamage = Math.min(...damageValues);
        const maxDamage = Math.max(...damageValues);
        analysis += `  Damage Range: ${minDamage} - ${maxDamage}\n`;
    } else {
        analysis += '  No maneuver cards with damage values\n';
    }
    
    // 5. KEYWORD ANALYSIS
    analysis += '\nKEYWORD DISTRIBUTION:\n';
    const keywordDistribution = {};
    
    allCards.forEach(card => {
        if (!card || !card.text_box || !card.text_box.keywords) return;
        
        card.text_box.keywords.forEach(keyword => {
            if (keyword && keyword.name) {
                const kw = keyword.name.trim();
                keywordDistribution[kw] = (keywordDistribution[kw] || 0) + 1;
            }
        });
    });
    
    const sortedKeywords = Object.entries(keywordDistribution)
        .sort((a, b) => b[1] - a[1]);
    
    if (sortedKeywords.length > 0) {
        sortedKeywords.forEach(([keyword, count]) => {
            analysis += `  ${keyword}: ${count} cards\n`;
        });
    } else {
        analysis += '  No keywords found\n';
    }
    
    // 6. TRAIT ANALYSIS
    analysis += '\nTRAIT DISTRIBUTION:\n';
    const traitDistribution = {};
    
    allCards.forEach(card => {
        if (!card || !card.text_box || !card.text_box.traits) return;
        
        card.text_box.traits.forEach(trait => {
            if (trait && trait.name) {
                const t = trait.name.trim();
                traitDistribution[t] = (traitDistribution[t] || 0) + 1;
            }
        });
    });
    
    const sortedTraits = Object.entries(traitDistribution)
        .sort((a, b) => b[1] - a[1]);
    
    if (sortedTraits.length > 0) {
        sortedTraits.forEach(([trait, count]) => {
            analysis += `  ${trait}: ${count} cards\n`;
        });
    } else {
        analysis += '  No traits found\n';
    }
    
    // 7. DECK STATISTICS
    analysis += '\nDECK STATISTICS:\n';
    analysis += `  Total Cards: ${allCards.length}\n`;
    analysis += `  Starting Deck: ${state.startingDeck.length}/24 cards\n`;
    analysis += `  Purchase Deck: ${state.purchaseDeck.length} cards\n`;
    
    // Count unique cards
    const uniqueCards = new Set(allCards.map(card => card ? card.title : '').filter(Boolean));
    analysis += `  Unique Cards: ${uniqueCards.size}\n`;
    
    // Count duplicates
    const cardCounts = {};
    allCards.forEach(card => {
        if (!card) return;
        cardCounts[card.title] = (cardCounts[card.title] || 0) + 1;
    });
    
    const duplicates = Object.entries(cardCounts).filter(([, count]) => count > 1);
    analysis += `  Cards with duplicates: ${duplicates.length}\n`;
    
    // Show most duplicated cards
    if (duplicates.length > 0) {
        const topDuplicates = duplicates
            .sort((a, b) => b[1] - a[1])
            .slice(0, 5);
        
        analysis += '  Most duplicated cards:\n';
        topDuplicates.forEach(([name, count]) => {
            analysis += `    ${name}: ${count} copies\n`;
        });
    }
    
    // 8. PERSONA SYNERGY ANALYSIS
    analysis += '\nPERSONA SYNERGY:\n';
    if (state.selectedWrestler || state.selectedManager) {
        analysis += '  Active Persona:\n';
        if (state.selectedWrestler) {
            analysis += `    Wrestler: ${state.selectedWrestler.title}\n`;
            
            // Count wrestler-specific cards
            const wrestlerCards = allCards.filter(card => 
                card && card['Signature For'] === state.selectedWrestler.title);
            analysis += `    Wrestler-specific cards in deck: ${wrestlerCards.length}\n`;
        }
        if (state.selectedManager) {
            analysis += `    Manager: ${state.selectedManager.title}\n`;
            
            // Count manager-specific cards
            const managerCards = allCards.filter(card => 
                card && card['Signature For'] === state.selectedManager.title);
            analysis += `    Manager-specific cards in deck: ${managerCards.length}\n`;
        }
    } else {
        analysis += '  No persona selected\n';
    }
    
    // 9. MANEUVER TYPE BREAKDOWN
    analysis += '\nMANEUVER TYPE BREAKDOWN:\n';
    const maneuverTypes = {
        'Strike': 0,
        'Grapple': 0,
        'Submission': 0,
        'Action': 0,
        'Response': 0
    };
    
    allCards.forEach(card => {
        if (!card) return;
        if (maneuverTypes.hasOwnProperty(card.card_type)) {
            maneuverTypes[card.card_type] += 1;
        }
    });
    
    Object.entries(maneuverTypes).forEach(([type, count]) => {
        if (count > 0) {
            const percentage = ((count / allCards.length) * 100).toFixed(1);
            analysis += `  ${type}: ${count} cards (${percentage}%)\n`;
        }
    });
    
    // Calculate maneuver ratio
    const totalManeuvers = maneuverTypes.Strike + maneuverTypes.Grapple + maneuverTypes.Submission;
    const totalNonManeuvers = allCards.length - totalManeuvers;
    const maneuverRatio = totalManeuvers > 0 ? (totalNonManeuvers / totalManeuvers).toFixed(2) : 'N/A';
    analysis += `  Maneuver to Non-Maneuver Ratio: ${maneuverRatio}\n`;
    
    return analysis;
}

// NEW: Export as LackeyCCG format
export function generateLackeyCCGDeck() {
    const activePersonaTitles = [];
    if (state.selectedWrestler) activePersonaTitles.push(state.selectedWrestler.title);
    if (state.selectedManager) activePersonaTitles.push(state.selectedManager.title);
    const kitCards = state.cardDatabase.filter(card => state.isKitCard(card) && activePersonaTitles.includes(card['Signature For']));
    
    let text = '';
    
    // Group cards by count
    const startingCounts = state.startingDeck.reduce((acc, cardTitle) => { 
        acc[cardTitle] = (acc[cardTitle] || 0) + 1; 
        return acc; 
    }, {});
    
    const purchaseCounts = state.purchaseDeck.reduce((acc, cardTitle) => { 
        acc[cardTitle] = (acc[cardTitle] || 0) + 1; 
        return acc; 
    }, {});
    
    // Add persona cards to starting counts
    if (state.selectedWrestler) {
        startingCounts[state.selectedWrestler.title] = (startingCounts[state.selectedWrestler.title] || 0) + 1;
    }
    if (state.selectedManager) {
        startingCounts[state.selectedManager.title] = (startingCounts[state.selectedManager.title] || 0) + 1;
    }
    kitCards.forEach(card => {
        startingCounts[card.title] = (startingCounts[card.title] || 0) + 1;
    });
    
    // Convert to arrays and sort
    const allCards = [];
    Object.entries(startingCounts).forEach(([cardTitle, count]) => {
        allCards.push({ title: cardTitle, count, type: 'starting' });
    });
    Object.entries(purchaseCounts).forEach(([cardTitle, count]) => {
        allCards.push({ title: cardTitle, count, type: 'purchase' });
    });
    
    // Sort by count descending, then by title
    allCards.sort((a, b) => {
        if (a.count !== b.count) return b.count - a.count;
        return a.title.localeCompare(b.title);
    });
    
    // Build the LackeyCCG format
    // First, add all non-persona starting cards (except kit cards which are already included)
    const nonPersonaStarting = allCards.filter(card => 
        card.type === 'starting' && 
        !state.isSignatureFor(state.cardTitleCache[card.title])
    );
    
    const nonPersonaPurchase = allCards.filter(card => card.type === 'purchase');
    
    // Add starting deck
    nonPersonaStarting.forEach(card => {
        text += `${card.count}\t${card.title}\n`;
    });
    
    // Add purchase deck marker
    text += `Purchase_Deck:\n`;
    
    // Add purchase deck
    nonPersonaPurchase.forEach(card => {
        text += `${card.count}\t${card.title}\n`;
    });
    
    // Add persona marker and persona cards
    text += `Starting:\n`;
    
    // Add wrestler
    if (state.selectedWrestler) {
        text += `1\t${state.selectedWrestler.title}\n`;
    }
    
    // Add manager
    if (state.selectedManager) {
        text += `1\t${state.selectedManager.title}\n`;
    }
    
    // Add kit cards
    kitCards.forEach(card => {
        text += `1\t${card.title}\n`;
    });
    
    return text;
}

export async function exportDeckAsImage() {
    const uniquePersonaAndKit = [];
    const activePersonaTitles = [];
    if (state.selectedWrestler) {
        uniquePersonaAndKit.push(state.selectedWrestler);
        activePersonaTitles.push(state.selectedWrestler.title);
    }
    if (state.selectedManager) {
        uniquePersonaAndKit.push(state.selectedManager);
        activePersonaTitles.push(state.selectedManager.title);
    }
    const kitCards = state.cardDatabase.filter(card => state.isKitCard(card) && activePersonaTitles.includes(card['Signature For']));
    uniquePersonaAndKit.push(...kitCards);
    const finalUniquePersonaAndKit = [...new Map(uniquePersonaAndKit.map(card => [card.title, card])).values()];
    const mainDeckCards = [...state.startingDeck, ...state.purchaseDeck].map(title => state.cardTitleCache[title]);
    const allCardsToPrint = [...finalUniquePersonaAndKit, ...mainDeckCards].filter(card => card !== undefined);

    if (allCardsToPrint.length === 0) {
        alert("There are no cards in the deck to export.");
        return;
    }

    const CARDS_PER_PAGE = 9;
    const numPages = Math.ceil(allCardsToPrint.length / CARDS_PER_PAGE);
    if (!confirm(`This will generate ${numPages} print sheet(s) for ${allCardsToPrint.length} total cards. Continue?`)) {
        return;
    }

    const DPI = 300;
    const CARD_RENDER_WIDTH_PX = 2.5 * DPI;
    const CARD_RENDER_HEIGHT_PX = 3.5 * DPI;
    const tempContainer = document.createElement('div');
    tempContainer.style.position = 'absolute';
    tempContainer.style.left = '-9999px';
    document.body.appendChild(tempContainer);

    for (let page = 0; page < numPages; page++) {
        const canvas = document.createElement('canvas');
        canvas.width = 8.5 * DPI;
        canvas.height = 11 * DPI;
        const ctx = canvas.getContext('2d');
        ctx.fillStyle = 'white';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        const startIndex = page * CARDS_PER_PAGE;
        const endIndex = startIndex + CARDS_PER_PAGE;
        const cardsOnThisPage = allCardsToPrint.slice(startIndex, endIndex);

        for (let i = 0; i < cardsOnThisPage.length; i++) {
            const card = cardsOnThisPage[i];
            const row = Math.floor(i / 3), col = i % 3;
            const x = (0.5 * DPI) + (col * CARD_RENDER_WIDTH_PX), y = (0.5 * DPI) + (row * CARD_RENDER_HEIGHT_PX);
            
            const playtestHTML = await generatePlaytestCardHTML(card, tempContainer);
            tempContainer.innerHTML = playtestHTML;
            const playtestElement = tempContainer.firstElementChild;

            try {
                const cardCanvas = await html2canvas(playtestElement, { width: CARD_RENDER_WIDTH_PX, height: CARD_RENDER_HEIGHT_PX, scale: 1, logging: false });
                ctx.drawImage(cardCanvas, x, y);
            } catch (error) {
                console.error(`Failed to render card "${card.title}" to canvas:`, error);
            }
        }

        const dataUrl = canvas.toDataURL('image/png');
        const a = document.createElement('a');
        a.href = dataUrl;
        const wrestlerName = state.selectedWrestler ? toPascalCase(state.selectedWrestler.title) : "Deck";
        a.download = `${wrestlerName}-Page-${page + 1}.png`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        await new Promise(resolve => setTimeout(resolve, 500));
    }

    document.body.removeChild(tempContainer);
    alert('All print sheets have been generated and downloaded!');
}
