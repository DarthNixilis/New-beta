// card-renderer-export.js
import * as state from './config.js';

// Special renderer for exported cards with larger text
export function generateCardVisualHTMLForExport(card, options = {}) {
    const isLackeySize = options.size === 'lackey' || options.width === 214;
    
    // Scale factors for Lackey size vs standard size
    const titleScale = isLackeySize ? 1.8 : 1.0;
    const costScale = isLackeySize ? 2.5 : 1.0;
    const momentumScale = isLackeySize ? 2.5 : 1.0;
    const damageScale = isLackeySize ? 1.5 : 1.0;
    const textScale = isLackeySize ? 1.4 : 1.0;
    const typeScale = isLackeySize ? 1.3 : 1.0;
    
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
            border: ${isLackeySize ? '3px' : '5px'} solid #000;
            border-radius: ${isLackeySize ? '8px' : '15px'};
            position: relative;
            box-shadow: 0 ${isLackeySize ? '2px' : '4px'} ${isLackeySize ? '4px' : '8px'} rgba(0,0,0,0.3);
            font-family: Arial, sans-serif;
            overflow: hidden;
        ">
            <!-- Title Bar -->
            <div style="
                background: #2c3e50;
                color: white;
                padding: ${isLackeySize ? '6px' : '10px'};
                text-align: center;
                border-bottom: 2px solid #000;
            ">
                <div style="
                    font-size: ${isLackeySize ? Math.round(16 * titleScale) : 20}px;
                    font-weight: bold;
                    line-height: 1.2;
                    text-transform: uppercase;
                    letter-spacing: ${isLackeySize ? '0.5px' : '1px'};
                ">${card.title}</div>
                <div style="
                    font-size: ${isLackeySize ? Math.round(12 * typeScale) : 14}px;
                    opacity: 0.9;
                    margin-top: ${isLackeySize ? '2px' : '4px'};
                ">${card.card_type}</div>
            </div>
            
            <!-- Cost and Momentum (HUGE for Lackey) -->
            <div style="
                position: absolute;
                top: ${isLackeySize ? '50px' : '80px'};
                left: 0;
                right: 0;
                display: flex;
                justify-content: space-around;
                align-items: center;
                padding: ${isLackeySize ? '5px' : '10px'};
                background: rgba(255, 255, 255, 0.9);
                border: ${isLackeySize ? '2px' : '3px'} solid #000;
                margin: ${isLackeySize ? '0 10px' : '0 20px'};
                border-radius: ${isLackeySize ? '8px' : '12px'};
            ">
                <!-- Cost -->
                <div style="text-align: center;">
                    <div style="
                        font-size: ${isLackeySize ? Math.round(10 * costScale) : 14}px;
                        font-weight: bold;
                        color: #666;
                        margin-bottom: ${isLackeySize ? '2px' : '4px'};
                    ">COST</div>
                    <div style="
                        font-size: ${isLackeySize ? Math.round(32 * costScale) : 36}px;
                        font-weight: bold;
                        color: #2c3e50;
                        line-height: 1;
                    ">${card.cost !== null ? card.cost : 'N/A'}</div>
                </div>
                
                <!-- Damage (if applicable) -->
                ${card.damage !== null ? `
                    <div style="text-align: center;">
                        <div style="
                            font-size: ${isLackeySize ? Math.round(10 * damageScale) : 14}px;
                            font-weight: bold;
                            color: #666;
                            margin-bottom: ${isLackeySize ? '2px' : '4px'};
                        ">DAMAGE</div>
                        <div style="
                            font-size: ${isLackeySize ? Math.round(24 * damageScale) : 28}px;
                            font-weight: bold;
                            color: #e74c3c;
                            line-height: 1;
                        ">${card.damage}</div>
                    </div>
                ` : ''}
                
                <!-- Momentum (HUGE - most important!) -->
                <div style="text-align: center;">
                    <div style="
                        font-size: ${isLackeySize ? Math.round(10 * momentumScale) : 14}px;
                        font-weight: bold;
                        color: #666;
                        margin-bottom: ${isLackeySize ? '2px' : '4px'};
                    ">MOMENTUM</div>
                    <div style="
                        font-size: ${isLackeySize ? Math.round(32 * momentumScale) : 36}px;
                        font-weight: bold;
                        color: #27ae60;
                        line-height: 1;
                    ">${card.momentum !== null ? card.momentum : '0'}</div>
                </div>
            </div>
            
            <!-- Game Text Box -->
            <div style="
                position: absolute;
                top: ${isLackeySize ? '110px' : '180px'};
                bottom: ${isLackeySize ? '30px' : '50px'};
                left: ${isLackeySize ? '10px' : '20px'};
                right: ${isLackeySize ? '10px' : '20px'};
                background: white;
                border: ${isLackeySize ? '2px' : '3px'} solid #000;
                border-radius: ${isLackeySize ? '6px' : '10px'};
                padding: ${isLackeySize ? '8px' : '15px'};
                overflow-y: auto;
                font-size: ${isLackeySize ? Math.round(11 * textScale) : 14}px;
                line-height: 1.4;
            ">
                ${card.text_box.raw_text ? formatText(card.text_box.raw_text) : 'No text'}
                
                <!-- Traits -->
                ${card.text_box.traits && card.text_box.traits.length > 0 ? `
                    <div style="margin-top: ${isLackeySize ? '8px' : '12px'}; padding-top: ${isLackeySize ? '4px' : '8px'}; border-top: 1px solid #ddd;">
                        <div style="font-weight: bold; font-size: ${isLackeySize ? Math.round(10 * textScale) : 12}px; color: #666; margin-bottom: ${isLackeySize ? '2px' : '4px'};">Traits:</div>
                        <div style="font-size: ${isLackeySize ? Math.round(10 * textScale) : 12}px;">
                            ${card.text_box.traits.map(t => 
                                `<span style="background: #e0e0e0; padding: ${isLackeySize ? '1px 4px' : '2px 6px'}; margin: 0 ${isLackeySize ? '2px' : '4px'} ${isLackeySize ? '2px' : '4px'} 0; border-radius: 3px; display: inline-block;">
                                    ${t.name}${t.value ? ': ' + t.value : ''}
                                </span>`
                            ).join('')}
                        </div>
                    </div>
                ` : ''}
                
                <!-- Keywords -->
                ${card.text_box.keywords && card.text_box.keywords.length > 0 ? `
                    <div style="margin-top: ${isLackeySize ? '8px' : '12px'}; padding-top: ${isLackeySize ? '4px' : '8px'}; border-top: 1px solid #ddd;">
                        <div style="font-weight: bold; font-size: ${isLackeySize ? Math.round(10 * textScale) : 12}px; color: #666; margin-bottom: ${isLackeySize ? '2px' : '4px'};">Keywords:</div>
                        <div style="font-size: ${isLackeySize ? Math.round(10 * textScale) : 12}px;">
                            ${card.text_box.keywords.map(k => 
                                `<span style="background: #d4edda; padding: ${isLackeySize ? '1px 4px' : '2px 6px'}; margin: 0 ${isLackeySize ? '2px' : '4px'} ${isLackeySize ? '2px' : '4px'} 0; border-radius: 3px; display: inline-block;">
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
                    bottom: ${isLackeySize ? '8px' : '15px'};
                    right: ${isLackeySize ? '8px' : '15px'};
                    width: ${isLackeySize ? '24px' : '40px'};
                    height: ${isLackeySize ? '24px' : '40px'};
                    background: #f0f0f0;
                    border: 2px solid #000;
                    border-radius: 50%;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    font-weight: bold;
                    font-size: ${isLackeySize ? '14px' : '20px'};
                ">
                    ${card.Target}
                </div>
            ` : ''}
            
            <!-- Set Indicator -->
            <div style="
                position: absolute;
                bottom: ${isLackeySize ? '8px' : '15px'};
                left: ${isLackeySize ? '8px' : '15px'};
                font-size: ${isLackeySize ? '8px' : '12px'};
                color: #666;
                font-weight: bold;
            ">
                ${card.set || 'AEW'}
            </div>
            
            <!-- Kit Card Indicator -->
            ${state.isKitCard(card) ? `
                <div style="
                    position: absolute;
                    top: ${isLackeySize ? '4px' : '8px'};
                    right: ${isLackeySize ? '4px' : '8px'};
                    background: #e74c3c;
                    color: white;
                    padding: ${isLackeySize ? '2px 6px' : '4px 8px'};
                    border-radius: ${isLackeySize ? '4px' : '6px'};
                    font-size: ${isLackeySize ? '8px' : '10px'};
                    font-weight: bold;
                ">
                    KIT
                </div>
            ` : ''}
        </div>
    `;
    
    return html;
}
