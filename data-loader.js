// data-loader.js
import * as state from './config.js';
import { initializeApp } from './app-init.js';

// --- DYNAMIC PATH DETECTION ---
function getBasePath() {
    const path = window.location.pathname;
    const secondSlashIndex = path.indexOf('/', 1); 
    if (secondSlashIndex !== -1) {
        return path.substring(0, secondSlashIndex + 1);
    }
    return '/';
}
// --- END DYNAMIC PATH DETECTION ---

// Helper function to parse card data from TSV format
function parseCardTSV(tsvData, set) {
    const lines = tsvData.trim().split(/\r?\n/);
    const headers = lines.shift().trim().split('\t').map(h => h.trim());
    
    return lines.map(line => {
        const values = line.split('\t');
        const card = {};
        headers.forEach((header, index) => {
            const value = (values[index] || '').trim();
            if (value === 'null' || value === '') card[header] = null;
            else if (!isNaN(value) && value !== '') card[header] = Number(value);
            else card[header] = value;
        });
        
        // Map to the expected card format using NEW column names
        card.title = (card['Name'] || '').trim();
        card.card_type = card['Type'] || '';
        card.cost = card['Cost'] === 'N/a' || card['Cost'] === 'N/A' || card['Cost'] === '' ? null : card['Cost'];
        card.damage = card['Damage'] === 'N/a' || card['Damage'] === 'N/A' || card['Damage'] === '' ? null : card['Damage'];
        card.momentum = card['Momentum'] === 'N/a' || card['Momentum'] === 'N/A' || card['Momentum'] === '' ? null : card['Momentum'];
        card.set = set;
        
        // Ensure card_type is properly set for Call Name and Faction
        if (card.card_type === 'Call Name' || card.card_type === 'Faction') {
            // These are valid card types for the dropdown
        }
        
        // Text box parsing
        card.text_box = { raw_text: card['Game Text'] || '' };
        
        // Parse keywords (if any)
        const keywordsMatch = card['Game Text']?.match(/Keywords?:?\s*([^\.]+)/i);
        if (keywordsMatch) {
            card.text_box.keywords = keywordsMatch[1].split(',').map(name => ({ name: name.trim() })).filter(k => k.name);
        } else {
            card.text_box.keywords = [];
        }
        
        // Parse traits (if any)
        if (card['Traits']) {
            card.text_box.traits = card['Traits'].split(',').map(traitStr => {
                const [name, value] = traitStr.split(':');
                return { name: (name || '').trim(), value: value ? value.trim() : undefined };
            }).filter(t => t.name);
        } else {
            card.text_box.traits = [];
        }
        
        // Kit card detection
        if (card['Starting'] && card['Starting'].trim() !== '') {
            card['Wrestler Kit'] = 'TRUE';
            card['Signature For'] = card['Starting'].trim();
        }
        
        return card;
    }).filter(card => card.title);
}

export async function loadGameData() {
    const searchResults = document.getElementById('searchResults');
    try {
        searchResults.innerHTML = '<p>Loading card data...</p>';

        const basePath = getBasePath();
        
        // Load both Core and Advanced sets
        const coreUrl = `${basePath}Core.txt?v=${new Date().getTime()}`;
        const advancedUrl = `${basePath}Advanced.txt?v=${new Date().getTime()}`;
        const keywordsUrl = `${basePath}keywords.txt?v=${new Date().getTime()}`;

        console.log(`Loading data from: ${basePath}`);

        const [coreResponse, advancedResponse, keywordResponse] = await Promise.all([
            fetch(coreUrl),
            fetch(advancedUrl),
            fetch(keywordsUrl)
        ]);

        if (!coreResponse.ok) throw new Error(`Could not load Core.txt (Status: ${coreResponse.status})`);
        if (!advancedResponse.ok) throw new Error(`Could not load Advanced.txt (Status: ${advancedResponse.status})`);
        if (!keywordResponse.ok) throw new Error(`Could not load keywords.txt (Status: ${keywordResponse.status})`);
        
        // Parse both sets
        const coreData = await coreResponse.text();
        const advancedData = await advancedResponse.text();
        
        const coreCards = parseCardTSV(coreData, 'Core');
        const advancedCards = parseCardTSV(advancedData, 'Advanced');
        
        // Combine all cards
        const allCards = [...coreCards, ...advancedCards];
        state.setCardDatabase(allCards);

        // Load keywords
        const keywordText = await keywordResponse.text();
        const parsedKeywords = {};
        const keywordLines = keywordText.trim().split(/\r?\n/);
        keywordLines.forEach(line => {
            if (line.trim() === '') return;
            const parts = line.split(':');
            if (parts.length >= 2) {
                const key = parts[0].trim();
                const value = parts.slice(1).join(':').trim();
                parsedKeywords[key] = value;
            }
        });
        state.setKeywordDatabase(parsedKeywords);
        
        state.buildCardTitleCache();
        return true; // Signal success

    } catch (error) {
        console.error("Fatal Error during data load:", error);
        searchResults.innerHTML = `<div style="color: red; padding: 20px; text-align: center;"><strong>FATAL ERROR:</strong> ${error.message}<br><br><button onclick="location.reload()">Retry</button></div>`;
        return false; // Signal failure
    }
}
