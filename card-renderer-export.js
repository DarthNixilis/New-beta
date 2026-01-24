// card-renderer-export.js
import * as state from './config.js';

// Special renderer for exported cards with larger text
export function generateCardVisualHTMLForExport(card, options = {}) {
    const isLackeySize = options.size === 'lackey' || options.width === 214;
    
    // SCALE FACTORS - EVEN BIGGER FOR LACKEY!
    const titleScale = isLackeySize ? 1.8 : 1.0;
    const costScale = isLackeySize ? 3.0 : 1.0; // INCREASED from 2.5 to 3.0
    const momentumScale = isLackeySize ? 3.0 : 1.0; // INCREASED from 2.5 to 3.0
    const damageScale = isLackeySize ? 1.8 : 1.0; // INCREASED from 1.5 to 1.8
    const textScale = isLackeySize ? 1.6 : 1.0; // INCREASED from 1.4 to 1.6
    const typeScale = isLackeySize ? 1.4 : 1.0; // INCREASED from 1.3 to 1.4
    
    // Calculate actual font sizes
    const titleFontSize = isLackeySize ? Math.round(16 * titleScale) : 20;
    const costLabelFontSize = isLackeySize ? Math.round(12 * costScale) : 14;
    const costNumberFontSize = isLackeySize ? Math.round(40 * costScale) : 36; // HUGE: 40 * 3.0 = 120px!
    const momentumLabelFontSize = isLackeySize ? Math.round(12 * momentumScale) : 14;
    const momentumNumberFontSize = isLackeySize ? Math.round(40 * momentumScale) : 36; // HUGE: 120px!
    const damageNumberFontSize = isLackeySize ? Math.round(28 * damageScale) : 28; // 28 * 1.8 = ~50px
    const textFontSize = isLackeySize ? Math.round(12 * textScale) : 14; // 12 * 1.6 = ~19px
    
    const getCardColor = (type) => {
        switch(type) {
            case 'Action': return '#FFD700'; // Gold
            case 'Strike': return '#FF6B6B'; // Red
            case 'Grapple': return '#4ECDC4'; // Teal
            case 'Submission': return '#A8E6CF'; // Mint
            case 'Response': return '#FFD3B6'; // Peach
            case 'Manager': return '#DDA0DD'; // Plum
            case 'Wrestler': return '#87CEEB'; // Sky Blue
            case 'Call Name': return '#98FB98'; // Pale Green
            case 'Faction': return '#D2B48C'; // Tan
            case 'Boon': return '#E6E6FA'; // Lavender
            case 'Injury': return '#A9A9A9'; // Dark Gray
            default: return '#FFFFFF'; // White
        }
    };
    
    const formatText = (text) => {
        if (!text) return '';
        
        // Replace keywords with bold formatting
        let formatted = text
            .replace(/\b(Enters|Ongoing|Trigger|Follow-Up|Finisher|Sudden|Permanent|Resilient|Relentless|Power Attack|Focus Attack|Cunning Attack|Combo Attack|Hidden|Set-up|Stealth Attack|High Risk|Sturdy|Agressive|Risky|Illegal|Retaliate|Tie-Up|Ready|Recovery|Response|Reverse|Special|Cycling|Rope Break|Capitalize|Turned|Knockout|Pin|Submit|Passout)\b/gi, '<strong>$1</strong>')
            .replace(/\b(Scout|Attempt|Tuck|Cycle|Market|Commit|Uncommit|Stun|Discard|Draw|Gain|Lose|Pay|Play|Purchase|Reveal|Shuffle|Search|Look|Choose|Create|Put)\b/gi, '<strong>$1</strong>');
        
        // Add line breaks for bullet points
        formatted = formatted.replace(/\.\s+(\w)/g, '.<br>$1');
        
        return formatted;
    };
    
    const html = `
        <div class="card" style="
            width: ${options.width || 400}px;
            height: ${options.height || 600}px;
            background: ${getCardColor(card.card_type)};
            border: ${isLackeySize ? '4px' : '5px'} solid #000;
            border-radius: ${isLackeySize ? '10px' : '15px'};
            position: relative;
            box-shadow: 0 ${isLackeySize ? '3px' : '4px'} ${isLackeySize ? '6px' : '8px'} rgba(0,0,0,0.3);
            font-family: 'Arial Black', Arial, sans-serif;
            overflow: hidden;
        ">
            <!-- Title Bar -->
            <div style="
                background: #2c3e50;
                color: white;
                padding: ${isLackeySize ? '8px' : '10px'};
                text-align: center;
                border-bottom: 3px solid #000;
            ">
                <div style="
                    font-size: ${titleFontSize}px;
                    font-weight: 900;
                    line-height: 1.1;
                    text-transform: uppercase;
                    letter-spacing: ${isLackeySize ? '1px' : '1px'};
                    text-shadow: 1px 1px 2px rgba(0,0,0,0.5);
                ">${card.title}</div>
                <div style="
                    font-size: ${isLackeySize ? Math.round(12 * typeScale) : 14}px;
                    font-weight: bold;
                    opacity: 0.9;
                    margin-top: ${isLackeySize ? '3px' : '4px'};
                ">${card.card_type}</div>
            </div>
            
            <!-- Cost and Momentum (MASSIVE for Lackey) -->
            <div style="
                position: absolute;
                top: ${isLackeySize ? '60px' : '80px'};
                left: 0;
                right: 0;
                display: flex;
                justify-content: space-around;
                align-items: center;
                padding: ${isLackeySize ? '8px' : '10px'};
                background: rgba(255, 255, 255, 0.95);
                border: ${isLackeySize ? '3px' : '3px'} solid #000;
                margin: ${isLackeySize ? '0 8px' : '0 20px'};
                border-radius: ${isLackeySize ? '10px' : '12px'};
                box-shadow: 0 2px 4px rgba(0,0,0,0.2);
            ">
                <!-- Cost - HUGE -->
                <div style="text-align: center;">
                    <div style="
                        font-size: ${costLabelFontSize}px;
                        font-weight: 900;
                        color: #2c3e50;
                        margin-bottom: ${isLackeySize ? '4px' : '4px'};
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
                            font-size: ${isLackeySize ? Math.round(12 * damageScale) : 14}px;
                            font-weight: 900;
                            color: #2c3e50;
                            margin-bottom: ${isLackeySize ? '4px' : '4px'};
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
                
                <!-- Momentum - SUPER HUGE (most important!) -->
                <div style="text-align: center;">
                    <div style="
                        font-size: ${momentumLabelFontSize}px;
                        font-weight: 900;
                        color: #2c3e50;
                        margin-bottom: ${isLackeySize ? '4px' : '4px'};
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
            <div style="
                position: absolute;
                top: ${isLackeySize ? '130px' : '180px'};
                bottom: ${isLackeySize ? '30px' : '50px'};
                left: ${isLackeySize ? '10px' : '20px'};
                right: ${isLackeySize ? '10px' : '20px'};
                background: white;
                border: ${isLackeySize ? '2px' : '3px'} solid #000;
                border-radius: ${isLackeySize ? '8px' : '10px'};
                padding: ${isLackeySize ? '10px' : '15px'};
                overflow-y: auto;
                font-size: ${textFontSize}px;
                line-height: 1.5;
                font-weight: bold;
            ">
                ${card.text_box.raw_text ? formatText(card.text_box.raw_text) : 'No text'}
                
                <!-- Traits -->
                ${card.text_box.traits && card.text_box.traits.length > 0 ? `
                    <div style="margin-top: ${isLackeySize ? '10px' : '12px'}; padding-top: ${isLackeySize ? '6px' : '8px'}; border-top: 2px solid #ddd;">
                        <div style="font-weight: 900; font-size: ${isLackeySize ? Math.round(11 * textScale) : 12}px; color: #2c3e50; margin-bottom: ${isLackeySize ? '4px' : '4px'}; text-transform: uppercase;">Traits:</div>
                        <div style="font-size: ${isLackeySize ? Math.round(11 * textScale) : 12}px; font-weight: bold;">
                            ${card.text_box.traits.map(t => 
                                `<span style="background: #e0e0e0; padding: ${isLackeySize ? '2px 6px' : '2px 6px'}; margin: 0 ${isLackeySize ? '3px' : '4px'} ${isLackeySize ? '3px' : '4px'} 0; border-radius: 4px; display: inline-block; border: 1px solid #aaa;">
                                    ${t.name}${t.value ? ': ' + t.value : ''}
                                </span>`
                            ).join('')}
                        </div>
                    </div>
                ` : ''}
                
                <!-- Keywords -->
                ${card.text_box.keywords && card.text_box.keywords.length > 0 ? `
                    <div style="margin-top: ${isLackeySize ? '10px' : '12px'}; padding-top: ${isLackeySize ? '6px' : '8px'}; border-top: 2px solid #ddd;">
                        <div style="font-weight: 900; font-size: ${isLackeySize ? Math.round(11 * textScale) : 12}px; color: #2c3e50; margin-bottom: ${isLackeySize ? '4px' : '4px'}; text-transform: uppercase;">Keywords:</div>
                        <div style="font-size: ${isLackeySize ? Math.round(11 * textScale) : 12}px; font-weight: bold;">
                            ${card.text_box.keywords.map(k => 
                                `<span style="background: #d4edda; padding: ${isLackeySize ? '2px 6px' : '2px 6px'}; margin: 0 ${isLackeySize ? '3px' : '4px'} ${isLackeySize ? '3px' : '4px'} 0; border-radius: 4px; display: inline-block; border: 1px solid #28a745;">
                                    ${k.name}
                                </span>`
                            ).join('')}
                        </div>
                    </div>
                ` : ''}
            </div>
            
            <!-- Target Icon (if applicable) -->
            ${card.Target && card.Target !== '-' && card.Target !== 'null' ? `
                <div style="
                    position: absolute;
                    bottom: ${isLackeySize ? '10px' : '15px'};
                    right: ${isLackeySize ? '10px' : '15px'};
                    width: ${isLackeySize ? '30px' : '40px'};
                    height: ${isLackeySize ? '30px' : '40px'};
                    background: #f0f0f0;
                    border: 2px solid #000;
                    border-radius: 50%;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    font-weight: 900;
                    font-size: ${isLackeySize ? '16px' : '20px'};
                    box-shadow: 1px 1px 3px rgba(0,0,0,0.3);
                ">
                    ${card.Target}
                </div>
            ` : ''}
            
            <!-- Set Indicator -->
            <div style="
                position: absolute;
                bottom: ${isLackeySize ? '10px' : '15px'};
                left: ${isLackeySize ? '10px' : '15px'};
                font-size: ${isLackeySize ? '10px' : '12px'};
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
                    top: ${isLackeySize ? '6px' : '8px'};
                    right: ${isLackeySize ? '6px' : '8px'};
                    background: #e74c3c;
                    color: white;
                    padding: ${isLackeySize ? '3px 8px' : '4px 8px'};
                    border-radius: ${isLackeySize ? '6px' : '6px'};
                    font-size: ${isLackeySize ? '10px' : '10px'};
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
