import * as state from './config.js';

// Special renderer for exported cards (includes Lackey 214x308 template + auto-fit hooks)
export function generateCardVisualHTMLForExport(card, options = {}) {
    const isLackeySize = options.size === 'lackey' || options.width === 214;

    // Colors tuned to match your screenshots
    const getCardColor = (type) => {
        switch (type) {
            case 'Action':      return '#9B59B6'; // purple
            case 'Wrestler':    return '#3E3E3E'; // dark gray
            case 'Manager':     return '#3E3E3E'; // (not shown, but matches persona vibe)
            case 'Response':    return '#C05050'; // red
            case 'Submission':  return '#63A85C'; // green
            case 'Grapple':     return '#D79A1E'; // orange
            case 'Strike':      return '#4D82C6'; // blue
            case 'Boon':        return '#18A7B5'; // teal
            case 'Faction':     return '#28C2A1'; // mint/teal-green
            case 'Injury':      return '#FF7900'; // gray
            case 'Call Name':   return '#2E86C1'; // fallback (not in your shots)
            default:            return '#777777'; // safe fallback
        }
    };

    const formatTextPlainish = (text) => {
        if (!text) return '';
        let formatted = String(text).trim();

        formatted = formatted
            .replace(/\b(Enters|Ongoing|Trigger|Follow-Up|Finisher|Sudden|Permanent|Resilient|Relentless|Power Attack|Focus Attack|Cunning Attack|Combo Attack|Hidden|Set-up|Stealth Attack|High Risk|Sturdy|Aggressive|Risky|Illegal|Retaliate|Tie-Up|Ready|Recovery|Response|Reverse|Special|Cycling|Rope Break|Capitalize|Turned|Knockout|Pin|Submit|Passout)\b/gi, '<strong>$1</strong>')
            .replace(/\b(Scout|Attempt|Tuck|Cycle|Market|Commit|Uncommit|Stun|Discard|Draw|Gain|Lose|Pay|Play|Purchase|Reveal|Shuffle|Search|Look|Choose|Create|Put)\b/gi, '<strong>$1</strong>');

        // sentence breaks
        formatted = formatted.replace(/\.\s+/g, '.<br>');

        return formatted;
    };

    // ---------------------------
    // LACKEY 214x308 TEMPLATE
    // Changes in this version:
    // - More room for game text by shrinking and lifting the Type band
    // - Text box pulled upward accordingly
    // - Auto-size text to fit (existing behavior retained)
    // ---------------------------
    if (isLackeySize) {
        const typeBarColor = getCardColor(card.card_type);
        const costDisplay = (card.cost !== null && card.cost !== undefined) ? card.cost : '';
        const damageDisplay = (card.damage !== null && card.damage !== undefined) ? card.damage : '0';
        const momentumDisplay = (card.momentum !== null && card.momentum !== undefined) ? card.momentum : '0';
        let gameText = card.text_box?.raw_text ? formatTextPlainish(card.text_box.raw_text) : '';
        
        // Get target and kit info
        let target = '';
        if (card.text_box && card.text_box.traits) {
            const targetTrait = card.text_box.traits.find(t => t && t.name && t.name.trim() === 'Target');
            if (targetTrait && targetTrait.value) {
                target = targetTrait.value;
            }
        }
        
        let kitPersona = '';
        if (card && card['Starting'] && card['Starting'].trim() !== '') {
            const personaName = card['Starting'].trim();
            kitPersona = personaName.replace(/\s*Wrestler$/, '');
        } else if (card && card['Signature For'] && card['Signature For'].trim() !== '') {
            const personaName = card['Signature For'].trim();
            kitPersona = personaName.replace(/\s*Wrestler$/, '');
        }
        
        // Add target to damage display for maneuvers
        const isManeuver = ['Strike', 'Grapple', 'Submission'].includes(card.card_type);
        const finalDamageDisplay = isManeuver && target ? `${damageDisplay} [T:${target}]` : damageDisplay;
        
        // Add kit info to game text if applicable
        const isPersonaCard = ['Wrestler', 'Manager', 'Call Name', 'Faction'].includes(card.card_type);
        const showKitInfo = kitPersona && !isPersonaCard;
        if (showKitInfo) {
            gameText = `<div style="font-size: 14px; color: #666; margin-bottom: 8px; border-bottom: 1px dashed #ddd; padding-bottom: 5px;">${kitPersona}</div>${gameText}`;
        }

        // Layout constants for clarity
        const titleTop = 6;
        const titleLeft = 6;
        const titleRight = 6;

        // Reserve a fixed title "band" so stats + cost start below it
        const titleBandHeight = 46;

        const statsTop = titleTop + titleBandHeight;   // below title
        const costTop = titleTop + titleBandHeight;    // same row as stats
        const costRight = 6;

        // Pre-calculate font size based on text length - MORE AGGRESSIVE SIZING
        let estimatedFontSize = 20;
        let estimatedLineHeight = 1.05;
        
        if (gameText) {
            const textOnly = gameText.replace(/<[^>]*>/g, ''); // Remove HTML tags
            const textLength = textOnly.length;
            const lineCount = (gameText.match(/<br>/g) || []).length + 1;
            
            // MUCH MORE AGGRESSIVE SIZING for Lackey cards
            if (textLength > 400 || lineCount > 8) {
                estimatedFontSize = 10;
                estimatedLineHeight = 0.9;
            } else if (textLength > 300 || lineCount > 6) {
                estimatedFontSize = 12;
                estimatedLineHeight = 0.95;
            } else if (textLength > 200 || lineCount > 4) {
                estimatedFontSize = 14;
                estimatedLineHeight = 1.0;
            } else if (textLength > 100 || lineCount > 3) {
                estimatedFontSize = 16;
                estimatedLineHeight = 1.0;
            }
            
            console.log(`Card "${card.title}": ${textLength} chars, ${lineCount} lines -> font-size: ${estimatedFontSize}px`);
        }

        return `
            <div class="aew-lackey-card" style="
                width: ${options.width || 214}px;
                height: ${options.height || 308}px;
                background: #ffffff;
                border: 2px solid #000;
                border-radius: 0px;
                position: relative;
                overflow: hidden;
                font-family: Arial, sans-serif;
                box-sizing: border-box;
            ">
                <!-- Title (top, can wrap to 2 lines) -->
                <div class="aew-lackey-title" style="
                    position: absolute;
                    left: ${titleLeft}px;
                    right: ${titleRight}px;
                    top: ${titleTop}px;
                    font-weight: 900;
                    font-size: 20px;
                    line-height: 1.0;
                    max-height: ${titleBandHeight}px;
                    overflow: hidden;
                    white-space: normal;
                ">${card.title || ''}</div>

                <!-- Stats left: D / M (starts below title band) -->
                <div class="aew-lackey-stats" style="
                    position: absolute;
                    left: 8px;
                    top: ${statsTop}px;
                    font-weight: 900;
                    font-size: 42px;
                    line-height: 0.95;
                ">
                    <div style="font-size: 42px;">D: ${finalDamageDisplay}</div>
                    <div style="font-size: 42px; margin-top: 6px;">M: ${momentumDisplay}</div>
                </div>

                <!-- Cost box (moved below title band so it can't cut off title) -->
                <div class="aew-lackey-costbox" style="
                    position: absolute;
                    top: ${costTop}px;
                    right: ${costRight}px;
                    width: 56px;
                    height: 56px;
                    border: 2px solid #000;
                    background: #fff;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    font-weight: 900;
                    font-size: 46px;
                    box-sizing: border-box;
                ">${costDisplay}</div>

                <!-- Type bar (reduced height + font, tighter, gives more text space) -->
                <div class="aew-lackey-typebar" style="
                    position: absolute;
                    left: 10px;
                    right: 10px;
                    top: 132px;
                    height: 24px;
                    background: ${typeBarColor};
                    border: 2px solid #000;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    font-weight: 900;
                    font-size: 18px;
                    letter-spacing: 0.8px;
                    color: #fff;
                    text-transform: uppercase;
                    box-sizing: border-box;
                ">${card.card_type || ''}</div>

                <!-- Text box with auto-sizing (pulled up for more room) -->
                <div class="aew-lackey-textbox aew-export-textbox" style="
                    position: absolute;
                    left: 10px;
                    right: 10px;
                    top: 164px;
                    bottom: 10px;
                    background: #fff;
                    border: 2px solid #DDD;
                    box-sizing: border-box;
                    padding: 10px;
                    font-weight: 800;
                    font-size: ${estimatedFontSize}px; /* Dynamic starting size */
                    line-height: ${estimatedLineHeight};
                    overflow: hidden;
                    text-align: center;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                ">
                    <div class="text-content" style="
                        width: 100%;
                        height: 100%;
                        overflow: hidden;
                        display: flex;
                        align-items: center;
                        justify-content: center;
                    ">
                        <div style="
                            max-width: 100%;
                            max-height: 100%;
                            overflow: hidden;
                            font-size: inherit;
                            line-height: inherit;
                            word-wrap: break-word;
                            word-break: break-word;
                            hyphens: auto;
                        ">${gameText}</div>
                    </div>
                </div>
            </div>
        `;
    }

    // ---------------------------
    // ORIGINAL (STANDARD) EXPORT TEMPLATE
    // ---------------------------

    const titleFontSize = 20;
    const costLabelFontSize = 14;
    const costNumberFontSize = 36;
    const momentumLabelFontSize = 14;
    const momentumNumberFontSize = 36;
    const damageNumberFontSize = 28;
    const textFontSize = 14;

    const formatText = (text) => {
        if (!text) return '';

        let formatted = text
            .replace(/\b(Enters|Ongoing|Trigger|Follow-Up|Finisher|Sudden|Permanent|Resilient|Relentless|Power Attack|Focus Attack|Cunning Attack|Combo Attack|Hidden|Set-up|Stealth Attack|High Risk|Sturdy|Agressive|Risky|Illegal|Retaliate|Tie-Up|Ready|Recovery|Response|Reverse|Special|Cycling|Rope Break|Capitalize|Turned|Knockout|Pin|Submit|Passout)\b/gi, '<strong>$1</strong>')
            .replace(/\b(Scout|Attempt|Tuck|Cycle|Market|Commit|Uncommit|Stun|Discard|Draw|Gain|Lose|Pay|Play|Purchase|Reveal|Shuffle|Search|Look|Choose|Create|Put)\b/gi, '<strong>$1</strong>');

        formatted = formatted.replace(/\.\s+(\w)/g, '.<br>$1');

        return formatted;
    };

    const getCardColorStandard = (type) => {
        // keep existing standard mapping behavior as before
        switch (type) {
            case 'Action': return '#7D4AA6';
            case 'Strike': return '#FF6B6B';
            case 'Grapple': return '#4ECDC4';
            case 'Submission': return '#A8E6CF';
            case 'Response': return '#FFD3B6';
            case 'Manager': return '#DDA0DD';
            case 'Wrestler': return '#87CEEB';
            case 'Call Name': return '#98FB98';
            case 'Faction': return '#D2B48C';
            case 'Boon': return '#E6E6FA';
            case 'Injury': return '#A9A9A9';
            default: return '#FFFFFF';
        }
    };

    // Get target and kit info
    let target = '';
    if (card.text_box && card.text_box.traits) {
        const targetTrait = card.text_box.traits.find(t => t && t.name && t.name.trim() === 'Target');
        if (targetTrait && targetTrait.value) {
            target = targetTrait.value;
        }
    }
    
    let kitPersona = '';
    if (card && card['Starting'] && card['Starting'].trim() !== '') {
        const personaName = card['Starting'].trim();
        kitPersona = personaName.replace(/\s*Wrestler$/, '');
    }
    
    // Add target to damage display
    const isManeuver = ['Strike', 'Grapple', 'Submission'].includes(card.card_type);
    const finalDamageDisplay = isManeuver && target ? `${card.damage ?? '0'} [T:${target}]` : (card.damage ?? '0');
    
    // Add kit info to game text if applicable
    const isPersonaCard = ['Wrestler', 'Manager', 'Call Name', 'Faction'].includes(card.card_type);
    const showKitInfo = kitPersona && !isPersonaCard;
    let gameText = card.text_box?.raw_text ? formatText(card.text_box.raw_text) : 'No text';
    if (showKitInfo) {
        gameText = `<div style="font-size: 12px; color: #666; margin-bottom: 8px; border-bottom: 1px dashed #ddd; padding-bottom: 5px;">${kitPersona}</div>${gameText}`;
    }

    const html = `
        <div class="card" style="
            width: ${options.width || 400}px;
            height: ${options.height || 600}px;
            background: ${getCardColorStandard(card.card_type)};
            border: 5px solid #000;
            border-radius: 15px;
            position: relative;
            box-shadow: 0 4px 8px rgba(0,0,0,0.3);
            font-family: 'Arial Black', Arial, sans-serif;
            overflow: hidden;
        ">
            <!-- Title Bar -->
            <div style="
                background: #2c3e50;
                color: white;
                padding: 10px;
                text-align: center;
                border-bottom: 3px solid #000;
            ">
                <div style="
                    font-size: ${titleFontSize}px;
                    font-weight: 900;
                    line-height: 1.1;
                    text-transform: uppercase;
                    letter-spacing: 1px;
                    text-shadow: 1px 1px 2px rgba(0,0,0,0.5);
                ">${card.title}</div>
                <div style="
                    font-size: 14px;
                    font-weight: bold;
                    opacity: 0.9;
                    margin-top: 4px;
                ">${card.card_type}</div>
            </div>

            <!-- Cost and Momentum -->
            <div style="
                position: absolute;
                top: 80px;
                left: 0;
                right: 0;
                display: flex;
                justify-content: space-around;
                align-items: center;
                padding: 10px;
                background: rgba(255, 255, 255, 0.95);
                border: 3px solid #000;
                margin: 0 20px;
                border-radius: 12px;
                box-shadow: 0 2px 4px rgba(0,0,0,0.2);
            ">
                <!-- Cost -->
                <div style="text-align: center;">
                    <div style="
                        font-size: ${costLabelFontSize}px;
                        font-weight: 900;
                        color: #2c3e50;
                        margin-bottom: 4px;
                        text-transform: uppercase;
                        letter-spacing: 1px;
                    ">COST</div>
                    <div style="
                        font-size: ${costNumberFontSize}px;
                        font-weight: 900;
                        color: #2c3e50;
                        line-height: 0.8;
                        text-shadow: 2px 2px 3px rgba(0,0,0,0.3);
                    ">${card.cost !== null ? card.cost : 'N/A'}</div>
                </div>

                <!-- Damage (if applicable) -->
                ${card.damage !== null ? `
                    <div style="text-align: center;">
                        <div style="
                            font-size: 14px;
                            font-weight: 900;
                            color: #2c3e50;
                            margin-bottom: 4px;
                            text-transform: uppercase;
                            letter-spacing: 1px;
                        ">DAMAGE</div>
                        <div style="
                            font-size: ${damageNumberFontSize}px;
                            font-weight: 900;
                            color: #e74c3c;
                            line-height: 0.8;
                            text-shadow: 2px 2px 3px rgba(0,0,0,0.3);
                        ">${finalDamageDisplay}</div>
                    </div>
                ` : ''}

                <!-- Momentum -->
                <div style="text-align: center;">
                    <div style="
                        font-size: ${momentumLabelFontSize}px;
                        font-weight: 900;
                        color: #2c3e50;
                        margin-bottom: 4px;
                        text-transform: uppercase;
                        letter-spacing: 1px;
                    ">MOMENTUM</div>
                    <div style="
                        font-size: ${momentumNumberFontSize}px;
                        font-weight: 900;
                        color: #27ae60;
                        line-height: 0.8;
                        text-shadow: 2px 2px 3px rgba(0,0,0,0.3);
                    ">${card.momentum !== null ? card.momentum : '0'}</div>
                </div>
            </div>

            <!-- Game Text Box -->
            <div class="aew-export-textbox" style="
                position: absolute;
                top: 180px;
                bottom: 50px;
                left: 20px;
                right: 20px;
                background: white;
                border: 3px solid #000;
                border-radius: 10px;
                padding: 15px;
                overflow-y: auto;
                font-size: ${textFontSize}px;
                line-height: 1.5;
                font-weight: bold;
            ">
                ${gameText}
            </div>

            <!-- Set Indicator -->
            <div style="
                position: absolute;
                bottom: 15px;
                left: 15px;
                font-size: 12px;
                color: #2c3e50;
                font-weight: 900;
                text-transform: uppercase;
                letter-spacing: 1px;
            ">
                ${card.set || 'AEW'}
            </div>

            <!-- Kit Card Indicator -->
            ${state.isKitCard && state.isKitCard(card) ? `
                <div style="
                    position: absolute;
                    top: 8px;
                    right: 8px;
                    background: #e74c3c;
                    color: white;
                    padding: 4px 8px;
                    border-radius: 6px;
                    font-size: 10px;
                    font-weight: 900;
                    text-transform: uppercase;
                    letter-spacing: 1px;
                    border: 2px solid #000;
                    box-shadow: 1px 1px 3px rgba(0,0,0,0.3);
                ">
                    KIT
                </div>
            ` : ''}
        </div>
    `;

    return html;
}

// Add this function to handle auto-sizing in master-export.js
export function applyLackeyTextAutoSizing(cardContainer) {
    if (!cardContainer) return;
    
    const textBox = cardContainer.querySelector('.aew-lackey-textbox');
    const textContent = textBox?.querySelector('.text-content > div');
    
    if (!textBox || !textContent) return;
    
    // Get the actual text without HTML tags
    const textOnly = textContent.textContent || textContent.innerText;
    const textLength = textOnly.length;
    
    // Get text box dimensions
    const textBoxWidth = textBox.offsetWidth - 20; // Account for padding
    const textBoxHeight = textBox.offsetHeight - 20;
    
    // More aggressive auto-sizing for Lackey cards
    let fontSize = 20;
    let lineHeight = 1.05;
    
    // Start with a much smaller font size for long text
    if (textLength > 400) {
        fontSize = 10;
        lineHeight = 0.9;
    } else if (textLength > 300) {
        fontSize = 12;
        lineHeight = 0.95;
    } else if (textLength > 200) {
        fontSize = 14;
        lineHeight = 1.0;
    } else if (textLength > 100) {
        fontSize = 16;
        lineHeight = 1.0;
    }
    
    // Apply initial sizing
    textContent.style.fontSize = fontSize + 'px';
    textContent.style.lineHeight = lineHeight;
    
    // Check if it fits
    let attempts = 0;
    while ((textContent.scrollHeight > textBoxHeight || textContent.scrollWidth > textBoxWidth) && 
           fontSize > 8 && attempts < 20) {
        fontSize -= 0.5;
        lineHeight = Math.max(0.8, lineHeight - 0.01);
        textContent.style.fontSize = fontSize + 'px';
        textContent.style.lineHeight = lineHeight;
        attempts++;
    }
    
    // If still doesn't fit, allow scrolling
    if (textContent.scrollHeight > textBoxHeight || textContent.scrollWidth > textBoxWidth) {
        textBox.style.overflowY = 'auto';
        textBox.style.alignItems = 'flex-start';
        textBox.style.justifyContent = 'flex-start';
    }
    
    console.log(`Auto-sized "${textOnly.substring(0, 30)}...": ${fontSize}px font, ${lineHeight} line-height`);
}
