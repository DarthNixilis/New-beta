// data-loader.js
import * as state from './config.js';
import { initializeApp } from './app-init.js';

// Simple path detection
function getBasePath() {
    const path = window.location.pathname;
    const secondSlashIndex = path.indexOf('/', 1);
    if (secondSlashIndex !== -1) {
        return path.substring(0, secondSlashIndex + 1);
    }
    return '/';
}

export async function loadGameData() {
    const searchResults = document.getElementById('searchResults');
    
    try {
        searchResults.innerHTML = '<p>Loading card data...</p>';
        
        const basePath = getBasePath();
        const cardDbUrl = basePath + 'cardDatabase.txt?v=' + new Date().getTime();
        const keywordsUrl = basePath + 'keywords.txt?v=' + new Date().getTime();
        
        console.log('Loading from:', basePath);
        
        // Fetch both files
        const [cardResponse, keywordResponse] = await Promise.all([
            fetch(cardDbUrl),
            fetch(keywordsUrl)
        ]);
        
        if (!cardResponse.ok) {
            throw new Error('Failed to load card database: ' + cardResponse.status);
        }
        if (!keywordResponse.ok) {
            throw new Error('Failed to load keywords: ' + keywordResponse.status);
        }
        
        // Parse card data
        const tsvData = await cardResponse.text();
        const lines = tsvData.trim().split(/\r?\n/);
        const headers = lines[0].trim().split('\t').map(h => h.trim());
        
        const cards = [];
        for (let i = 1; i < lines.length; i++) {
            const line = lines[i];
            if (!line.trim()) continue;
            
            const values = line.split('\t');
            const card = {};
            
            for (let j = 0; j < headers.length; j++) {
                const header = headers[j];
                let value = values[j] || '';
                value = value.trim();
                
                if (value === '' || value === 'null') {
                    card[header] = null;
                } else if (!isNaN(value) && value !== '') {
                    card[header] = Number(value);
                } else {
                    card[header] = value;
                }
            }
            
            // Normalize card structure
            card.title = card['Card Name'] || '';
            card.card_type = card['Type'] || '';
            card.cost = (card['Cost'] === 'N/a' || card['Cost'] === 'N/A') ? null : card['Cost'];
            card.damage = (card['Damage'] === 'N/a' || card['Damage'] === 'N/A') ? null : card['Damage'];
            card.momentum = (card['Momentum'] === 'N/a' || card['Momentum'] === 'N/A') ? null : card['Momentum'];
            
            // Parse text box
            card.text_box = {
                raw_text: card['Card Raw Game Text'] || ''
            };
            
            // Parse keywords
            if (card.Keywords) {
                card.text_box.keywords = card.Keywords.split(',')
                    .map(k => ({ name: k.trim() }))
                    .filter(k => k.name);
            } else {
                card.text_box.keywords = [];
            }
            
            // Parse traits
            if (card.Traits) {
                card.text_box.traits = card.Traits.split(',')
                    .map(t => {
                        const parts = t.split(':');
                        return {
                            name: parts[0].trim(),
                            value: parts[1] ? parts[1].trim() : undefined
                        };
                    })
                    .filter(t => t.name);
            } else {
                card.text_box.traits = [];
            }
            
            if (card.title) {
                cards.push(card);
            }
        }
        
        state.setCardDatabase(cards);
        
        // Parse keywords
        const keywordText = await keywordResponse.text();
        const keywordLines = keywordText.trim().split(/\r?\n/);
        const keywords = {};
        
        for (const line of keywordLines) {
            if (!line.trim()) continue;
            const colonIndex = line.indexOf(':');
            if (colonIndex > 0) {
                const key = line.substring(0, colonIndex).trim();
                const value = line.substring(colonIndex + 1).trim();
                keywords[key] = value;
            }
        }
        
        state.setKeywordDatabase(keywords);
        state.buildCardTitleCache();
        
        console.log('Successfully loaded', cards.length, 'cards');
        return true;
        
    } catch (error) {
        console.error('Fatal error loading game data:', error);
        searchResults.innerHTML = '<div style="color: red; padding: 20px; text-align: center;">' +
            '<strong>FATAL ERROR:</strong> ' + error.message + '<br><br>' +
            '<button onclick="location.reload()">Retry</button>' +
            '</div>';
        return false;
    }
}
