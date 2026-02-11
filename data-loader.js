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

// Function to find all set files with *Set.txt pattern
async function findSetFiles(basePath) {
    const sets = [];
    
    // List of potential set files (with and without "Set" suffix for compatibility)
    const potentialSets = [
        // Core sets
        'Core', 'Advanced', 'Promo',
        // Possible future sets
        'Expansion1', 'Expansion2', 'Expansion3',
        'Wave1', 'Wave2', 'Wave3',
        'Set1', 'Set2', 'Set3'
    ];
    
    // Try to load each potential set with *Set.txt pattern
    for (const setName of potentialSets) {
        try {
            // First try with Set.txt pattern
            const response = await fetch(`${basePath}${setName}Set.txt`);
            if (response.ok) {
                // Extract set name (remove "Set" from filename)
                const displayName = setName; // Core, Advanced, etc.
                sets.push(displayName);
                console.log(`Found set file: ${setName}Set.txt -> ${displayName}`);
                continue; // Skip to next set
            }
        } catch (error) {
            // Silently skip - file doesn't exist
        }
        
        // Fallback: Try without Set.txt pattern (for backward compatibility)
        try {
            const response = await fetch(`${basePath}${setName}.txt`);
            if (response.ok) {
                sets.push(setName);
                console.log(`Found set file: ${setName}.txt -> ${setName}`);
            }
        } catch (error) {
            // Silently skip - file doesn't exist
        }
    }
    
    // Also try to load from a manifest file if it exists
    try {
        const manifestResponse = await fetch(`${basePath}manifest.json`);
        if (manifestResponse.ok) {
            const manifest = await manifestResponse.json();
            if (manifest.sets && Array.isArray(manifest.sets)) {
                // Use manifest sets instead
                return manifest.sets.map(s => s.name || s);
            }
        }
    } catch (error) {
        // No manifest file, continue with discovered sets
    }
    
    return sets;
}

export async function loadGameData() {
    const searchResults = document.getElementById('searchResults');
    try {
        searchResults.innerHTML = '<p>Loading card data...</p>';

        const basePath = getBasePath();
        
        // Find available sets
        const availableSets = await findSetFiles(basePath);
        
        if (availableSets.length === 0) {
            // Fallback to checking for specific files
            console.log('No sets found, trying specific files...');
            
            // Try CoreSet.txt and AdvancedSet.txt directly
            const coreResponse = await fetch(`${basePath}CoreSet.txt`);
            const advancedResponse = await fetch(`${basePath}AdvancedSet.txt`);
            
            if (coreResponse.ok) {
                availableSets.push('Core');
                console.log('Found CoreSet.txt');
            }
            if (advancedResponse.ok) {
                availableSets.push('Advanced');
                console.log('Found AdvancedSet.txt');
            }
            
            // If still no sets, try without Set suffix (backward compatibility)
            if (availableSets.length === 0) {
                const coreResponse2 = await fetch(`${basePath}Core.txt`);
                const advancedResponse2 = await fetch(`${basePath}Advanced.txt`);
                
                if (coreResponse2.ok) {
                    availableSets.push('Core');
                    console.log('Found Core.txt (backward compatibility)');
                }
                if (advancedResponse2.ok) {
                    availableSets.push('Advanced');
                    console.log('Found Advanced.txt (backward compatibility)');
                }
            }
        }
        
        if (availableSets.length === 0) {
            throw new Error("No set files found. Please make sure CoreSet.txt and/or AdvancedSet.txt exist in the data folder.");
        }
        
        console.log(`Loading sets: ${availableSets.join(', ')}`);
        
        // Load keywords
        const keywordsUrl = `${basePath}keywords.txt?v=${new Date().getTime()}`;
        const keywordResponse = await fetch(keywordsUrl);
        
        if (!keywordResponse.ok) {
            console.warn(`Could not load keywords.txt (Status: ${keywordResponse.status}) - continuing without keywords`);
            state.setKeywordDatabase({});
        } else {
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
        }
        
        // Load all set files
        const allCards = [];
        const setPromises = availableSets.map(async (setName) => {
            try {
                // First try with Set.txt pattern
                let setUrl = `${basePath}${setName}Set.txt?v=${new Date().getTime()}`;
                console.log(`Trying to load set from: ${setUrl}`);
                let response = await fetch(setUrl);
                
                if (!response.ok) {
                    // Fallback to without Set.txt pattern
                    setUrl = `${basePath}${setName}.txt?v=${new Date().getTime()}`;
                    console.log(`Trying fallback: ${setUrl}`);
                    response = await fetch(setUrl);
                    
                    if (!response.ok) {
                        console.warn(`Could not load set ${setName}: Status ${response.status}`);
                        return [];
                    }
                }
                
                const setData = await response.text();
                const cards = parseCardTSV(setData, setName);
                console.log(`Loaded ${setName} set: ${cards.length} cards`);
                return cards;
            } catch (error) {
                console.warn(`Error loading set ${setName}:`, error.message);
                return [];
            }
        });
        
        const allSetCards = await Promise.all(setPromises);
        allSetCards.forEach(setCards => allCards.push(...setCards));
        
        if (allCards.length === 0) {
            throw new Error("No card data could be loaded. Please check your set files.");
        }
        
        // Store the cards and available sets
        state.setCardDatabase(allCards);
        state.setAvailableSets(availableSets);
        state.buildCardTitleCache();
        
        console.log(`Total cards loaded: ${allCards.length}`);
        console.log(`Available sets: ${availableSets.join(', ')}`);
        
        return true; // Signal success

    } catch (error) {
        console.error("Fatal Error during data load:", error);
        searchResults.innerHTML = `<div style="color: red; padding: 20px; text-align: center;"><strong>FATAL ERROR:</strong> ${error.message}<br><br><button onclick="location.reload()">Retry</button></div>`;
        return false; // Signal failure
    }
}
