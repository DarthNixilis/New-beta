// card-renderer.js
import * as state from './config.js';
import { toPascalCase } from './config.js';

export function generateCardVisualHTML(card) {
    try {
        if (!card || !card.title) {
            return '<div class="placeholder-card"><div class="placeholder-header"><span>Error: Invalid Card</span></div></div>';
        }
        
        const imageName = toPascalCase(card.title);
        const imagePath = `./card-images/${imageName}.png`;
        const typeClass = card.card_type ? `type-${card.card_type.toLowerCase()}` : 'type-unknown';
        
        // Get target from traits
        const target = state.getCardTarget(card);
        
        // Get kit persona name
        const kitPersona = state.getKitPersona(card);
        
        // Only show kit info for non-persona cards that go in decks
        const isPersonaCard = ['Wrestler', 'Manager', 'Call Name', 'Faction'].includes(card.card_type);
        const showKitInfo = kitPersona && !isPersonaCard;
        
        const placeholderHTML = `
            <div class="placeholder-card">
                <div class="placeholder-header">
                    <span>${card.title}</span>
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
        
        return `<img src="${imagePath}" alt="${card.title}" onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';"><div style="display: none;">${placeholderHTML}</div>`;
    } catch (error) {
        console.error("Error generating card visual:", error, card);
        return '<div class="placeholder-card"><div class="placeholder-header"><span>Error Loading Card</span></div></div>';
    }
}

export function generatePlaytestCardHTML(card, tempContainer, width = 750, height = 1050) {
    // SIMPLE FONTS that work everywhere
    const CARD_FONT = 'Arial, Helvetica, sans-serif';
    const CARD_TITLE_FONT = 'Arial Black, Arial, sans-serif';
    
    const isPersona = card.card_type === 'Wrestler' || card.card_type === 'Manager';
    const keywords = card.text_box?.keywords || [];
    const traits = card.text_box?.traits || [];
    
    // Calculate scale factor
    const scale = width / 750;
    
    // Scale all dimensions proportionally
    const titleFontSize = 64 * scale;
    const statFontSize = 50 * scale;
    const artHeight = 200 * scale;
    const typeLineFontSize = 52 * scale;
    const textBoxFontSizeBase = 42 * scale;
    const reminderFontSize = 38 * scale;
    const borderRadius = 35 * scale;
    const padding = 30 * scale;
    const borderWidth = 15 * scale;
    const innerPadding = 25 * scale;

    let keywordsText = keywords.map(kw => {
        const definition = state.keywordDatabase[kw.name.trim()] || 'Definition not found.';
        return `<strong style="font-family: ${CARD_FONT};">${kw.name.trim()}:</strong> <span style="font-size: ${reminderFontSize}px; font-style: italic; font-family: ${CARD_FONT};">${definition}</span>`;
    }).join('<br><br>');

    let traitsText = traits.map(tr => `<strong style="font-family: ${CARD_FONT};">${tr.name.trim()}</strong>`).join(', ');
    if (traitsText) {
        traitsText = `<p style="margin-bottom: ${25 * scale}px; font-family: ${CARD_FONT};"><span style="font-size: ${reminderFontSize}px; font-style: italic;">${traitsText}</span></p>`;
    }

    const reminderBlock = traitsText + keywordsText;
    const targetTrait = traits.find(t => t.name.trim() === 'Target');
    const targetValue = targetTrait ? targetTrait.value : null;
    const typeColors = { 
        'Action': '#9c5a9c', 
        'Response': '#c84c4c', 
        'Submission': '#5aa05a', 
        'Strike': '#4c82c8', 
        'Grapple': '#e68a00',
        'Wrestler': '#333333',
        'Manager': '#666666'
    };
    const typeColor = typeColors[card.card_type] || '#6c757d';

    let rawText = card.text_box?.raw_text || '';
    const abilityKeywords = ['Ongoing', 'Enters', 'Finisher', 'Tie-Up Action', 'Recovery Action', 'Tie-Up Enters', 'Ready Enters'];
    const personaExceptions = ['Chris Jericho']; 
    const delimiter = '|||';
    let tempText = rawText;
    abilityKeywords.forEach(kw => {
        const regex = new RegExp(`(^|\\s)(${kw})`, 'g');
        tempText = tempText.replace(regex, `$1${delimiter}$2`);
    });
    let lines = tempText.split(delimiter).map(line => line.trim()).filter(line => line);
    const finalLines = [];
    if (lines.length > 0) {
        finalLines.push(lines[0]);
        for (let i = 1; i < lines.length; i++) {
            const previousLine = finalLines[finalLines.length - 1];
            const currentLine = lines[i];
            const endsWithPersona = personaExceptions.some(persona => previousLine.endsWith(persona));
            const isGainQuote = previousLine.includes("gains '");
            if (endsWithPersona || isGainQuote) {
                finalLines[finalLines.length - 1] += ` ${currentLine}`;
            } else {
                finalLines.push(currentLine);
            }
        }
    }
    
    // Format text with simple fonts
    const formattedText = finalLines.map(line => {
        // Make keywords bold
        abilityKeywords.forEach(kw => {
            const regex = new RegExp(`\\b${kw}\\b`, 'g');
            line = line.replace(regex, `<strong style="font-family: ${CARD_FONT};">${kw}</strong>`);
        });
        // Make card names italic
        const cardNameRegex = /'([^']+)'/g;
        line = line.replace(cardNameRegex, `<em style="font-family: ${CARD_FONT};">'$1'</em>`);
        return `<p style="margin: 0 0 ${8 * scale}px 0; font-family: ${CARD_FONT};">${line}</p>`;
    }).join('');

    const fullText = formattedText + reminderBlock;
    let textBoxFontSize = textBoxFontSizeBase;
    if (fullText.length > 250) { 
        textBoxFontSize = 34 * scale;
    } else if (fullText.length > 180) { 
        textBoxFontSize = 38 * scale;
    }

    // Simple title fitting
    const title = card.title;
    let fittedTitleFontSize = titleFontSize;
    if (title.length > 25) fittedTitleFontSize = titleFontSize * 0.8;
    if (title.length > 35) fittedTitleFontSize = titleFontSize * 0.7;
    if (title.length > 45) fittedTitleFontSize = titleFontSize * 0.6;

    const costBoxSize = 60 * scale;
    const costPadding = 15 * scale;
    const costHTML = !isPersona ? `<div style="font-size: ${costBoxSize}px; font-weight: bold; font-family: ${CARD_TITLE_FONT}; border: ${3 * scale}px solid black; padding: ${costPadding}px ${35 * scale}px; border-radius: ${15 * scale}px; flex-shrink: 0;">${card.cost ?? '–'}</div>` : `<div style="width: ${120 * scale}px; flex-shrink: 0;"></div>`;
    
    const typeLineHTML = !isPersona ? `<div style="padding: ${15 * scale}px; text-align: center; font-size: ${typeLineFontSize}px; font-weight: bold; font-family: ${CARD_TITLE_FONT}; border-radius: ${15 * scale}px; margin-bottom: ${15 * scale}px; color: white; background-color: ${typeColor};">${card.card_type}</div>` : `<div style="text-align: center; font-size: ${typeLineFontSize}px; font-weight: bold; font-family: ${CARD_TITLE_FONT}; color: #6c757d; margin-bottom: ${15 * scale}px;">${card.card_type}</div>`;

    // Build HTML with SIMPLE fonts
    const html = `
        <div style="position: relative; background-color: white; border: ${borderWidth}px solid black; border-radius: ${borderRadius}px; box-sizing: border-box; width: ${width}px; height: ${height}px; padding: ${padding}px; display: flex; flex-direction: column; color: black; overflow: hidden; font-family: ${CARD_FONT};">
            <!-- Header with stats, title, and cost -->
            <div style="display: flex; justify-content: space-between; align-items: flex-start; border-bottom: ${3 * scale}px solid black; padding-bottom: ${15 * scale}px; margin-bottom: ${15 * scale}px; gap: ${15 * scale}px;">
                <!-- Left: Damage, Momentum, Target -->
                <div style="font-size: ${statFontSize}px; font-weight: bold; font-family: ${CARD_TITLE_FONT}; line-height: 1.2; flex-shrink: 0; min-width: ${120 * scale}px;">
                    ${!isPersona ? `<div>D: ${card.damage ?? '–'}</div>` : ''}
                    <div>M: ${card.momentum ?? '–'}</div>
                    ${targetValue ? `<div>T: ${targetValue}</div>` : ''}
                </div>
                
                <!-- Center: Title -->
                <div style="flex-grow: 1; text-align: center; display: flex; align-items: center; justify-content: center; min-height: ${statFontSize * 1.5}px;">
                    <div style="font-size: ${fittedTitleFontSize}px; font-weight: 900; font-family: ${CARD_TITLE_FONT}; line-height: 1.1; max-width: 100%;">${title}</div>
                </div>
                
                <!-- Right: Cost -->
                ${costHTML}
            </div>
            
            <!-- Art Area -->
            <div style="height: ${artHeight}px; border: ${3 * scale}px solid #ccc; border-radius: ${20 * scale}px; margin-bottom: ${15 * scale}px; display: flex; align-items: center; justify-content: center; font-style: italic; font-size: ${40 * scale}px; color: #888; background-color: #f0f0f0; font-family: ${CARD_FONT};">
                Art Area
            </div>
            
            <!-- Type Line -->
            ${typeLineHTML}
            
            <!-- Text Box -->
            <div style="background-color: #f8f9fa; border: ${2 * scale}px solid #ccc; border-radius: ${20 * scale}px; padding: ${innerPadding}px; font-size: ${textBoxFontSize}px; line-height: 1.3; text-align: center; white-space: pre-wrap; flex-grow: 1; overflow-y: auto; font-family: ${CARD_FONT};">
                ${formattedText}
                ${reminderBlock ? `<hr style="border-top: ${2 * scale}px solid #ccc; margin: ${25 * scale}px 0;"><div style="margin-bottom: 0; font-family: ${CARD_FONT};">${reminderBlock}</div>` : ''}
            </div>
        </div>
    `;
    
    return html;
}
