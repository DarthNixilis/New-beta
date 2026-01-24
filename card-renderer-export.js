import * as state from './config.js';

// Special renderer for exported cards (includes Lackey 214x308 template + auto-fit hooks)
export function generateCardVisualHTMLForExport(card, options = {}) {
    const isLackeySize = options.size === 'lackey' || options.width === 214;

    const getCardColor = (type) => {
        switch(type) {
            case 'Action': return '#7D4AA6'; // purple-ish like your sample
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

    const formatTextPlainish = (text) => {
        if (!text) return '';
        // Keep it simple for tiny Lackey size: preserve periods into line breaks.
        let formatted = String(text).trim();

        // Bold keywords (kept, but not too aggressive)
        formatted = formatted
            .replace(/\b(Enters|Ongoing|Trigger|Follow-Up|Finisher|Sudden|Permanent|Resilient|Relentless|Power Attack|Focus Attack|Cunning Attack|Combo Attack|Hidden|Set-up|Stealth Attack|High Risk|Sturdy|Aggressive|Risky|Illegal|Retaliate|Tie-Up|Ready|Recovery|Response|Reverse|Special|Cycling|Rope Break|Capitalize|Turned|Knockout|Pin|Submit|Passout)\b/gi, '<strong>$1</strong>')
            .replace(/\b(Scout|Attempt|Tuck|Cycle|Market|Commit|Uncommit|Stun|Discard|Draw|Gain|Lose|Pay|Play|Purchase|Reveal|Shuffle|Search|Look|Choose|Create|Put)\b/gi, '<strong>$1</strong>');

        // sentence breaks
        formatted = formatted.replace(/\.\s+/g, '.<br>');

        return formatted;
    };

    // ---------------------------
    // LACKEY 214x308 TEMPLATE
    // Matches your screenshot layout:
    // - Title top-left
    // - Cost in a small top-right box
    // - D/M on left under title
    // - Type bar across (purple)
    // - Text box at bottom (auto-fit will shrink font)
    // ---------------------------
    if (isLackeySize) {
        const typeBarColor = getCardColor(card.card_type);
        const costDisplay = (card.cost !== null && card.cost !== undefined) ? card.cost : '';
        const damageDisplay = (card.damage !== null && card.damage !== undefined) ? card.damage : '0';
        const momentumDisplay = (card.momentum !== null && card.momentum !== undefined) ? card.momentum : '0';

        const gameText = card.text_box?.raw_text ? formatTextPlainish(card.text_box.raw_text) : '';

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
                <!-- Title (top-left) -->
                <div class="aew-lackey-title" style="
                    position: absolute;
                    left: 6px;
                    top: 6px;
                    right: 44px;
                    font-weight: 900;
                    font-size: 18px;
                    line-height: 1.05;
                    white-space: nowrap;
                    overflow: hidden;
                    text-overflow: ellipsis;
                ">${card.title || ''}</div>

                <!-- Cost box (top-right) -->
                <div class="aew-lackey-costbox" style="
                    position: absolute;
                    top: 6px;
                    right: 6px;
                    width: 34px;
                    height: 28px;
                    border: 2px solid #000;
                    background: #fff;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    font-weight: 900;
                    font-size: 18px;
                    box-sizing: border-box;
                ">${costDisplay}</div>

                <!-- Stats left: D / M -->
                <div class="aew-lackey-stats" style="
                    position: absolute;
                    left: 8px;
                    top: 34px;
                    font-weight: 900;
                    font-size: 22px;
                    line-height: 1.05;
                ">
                    <div>D: ${damageDisplay}</div>
                    <div>M: ${momentumDisplay}</div>
                </div>

                <!-- Type bar -->
                <div class="aew-lackey-typebar" style="
                    position: absolute;
                    left: 0;
                    right: 0;
                    top: 124px;
                    height: 36px;
                    background: ${typeBarColor};
                    border-top: 2px solid #000;
                    border-bottom: 2px solid #000;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    font-weight: 900;
                    font-size: 16px;
                    letter-spacing: 1px;
                    color: #fff;
                    text-transform: uppercase;
                    box-sizing: border-box;
                ">${card.card_type || ''}</div>

                <!-- Text box -->
                <div class="aew-lackey-textbox aew-export-textbox" style="
                    position: absolute;
                    left: 10px;
                    right: 10px;
                    top: 172px;
                    bottom: 10px;
                    background: #fff;
                    border: 2px solid #000;
                    box-sizing: border-box;
                    padding: 8px;
                    font-weight: 700;
                    font-size: 14px; /* auto-fit will reduce this if needed */
                    line-height: 1.15;
                    overflow: hidden; /* IMPORTANT: no scrolling, we shrink instead */
                ">
                    ${gameText}
                </div>
            </div>
        `;
    }

    // ---------------------------
    // ORIGINAL (STANDARD) EXPORT TEMPLATE (kept)
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

    const html = `
        <div class="card" style="
            width: ${options.width || 400}px;
            height: ${options.height || 600}px;
            background: ${getCardColor(card.card_type)};
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
                        ">${card.damage}</div>
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
                ${card.text_box.raw_text ? formatText(card.text_box.raw_text) : 'No text'}
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
            ${state.isKitCard(card) ? `
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
