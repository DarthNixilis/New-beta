// data-loader.js
import * as state from './config.js';

/**
 * Loads cardDatabase.txt and keywords.txt from the SAME folder.
 * Maps Google Sheets TSV headers to internal code properties.
 */
export async function loadGameData() {
    const searchResults = document.getElementById('searchResults');

    try {
        if (searchResults) {
            searchResults.innerHTML = '<p>Loading card data...</p>';
        }

        const cardDbUrl = new URL('./cardDatabase.txt', import.meta.url);
        const keywordsUrl = new URL('./keywords.txt', import.meta.url);

        // Cache-busting
        cardDbUrl.searchParams.set('v', String(Date.now()));
        keywordsUrl.searchParams.set('v', String(Date.now()));

        const [cardResponse, keywordResponse] = await Promise.all([
            fetch(cardDbUrl.toString()),
            fetch(keywordsUrl.toString()),
        ]);

        if (!cardResponse.ok) throw new Error(`Could not load cardDatabase.txt (Status: ${cardResponse.status})`);

        const cardText = await cardResponse.text();
        // Use regex to handle different line endings from different OS exports
        const lines = cardText.split(/\r?\n/).filter(line => line.trim() !== "");
        
        if (lines.length < 2) throw new Error("cardDatabase.txt is empty or missing headers.");

        // Identify headers (Tab-separated)
        const headers = lines[0].split('\t').map(h => h.trim());
        console.log('Headers found:', headers);

        const parsedCards = lines.slice(1).map((line, lineIdx) => {
            const cols = line.split('\t');
            const card = {};

            headers.forEach((header, index) => {
                let value = cols[index] ? cols[index].trim() : "";
                
                // CRITICAL MAPPING: Maps your Google Sheet Headers to your Code Logic
                if (header === "Card Name") {
                    card.title = value; 
                } else if (header === "Type") {
                    card.card_type = value;
                } else if (header === "Cost") {
                    // Handle special values like "N/A", "N/A", or "1(Sloth)"
                    if (value === "N/A" || value === "N/a" || value === "") {
                        card.cost = 0;
                    } else {
                        // Extract numeric value (handles cases like "1(Sloth)" -> 1)
                        const numMatch = value.match(/[\d.]+/);
                        card.cost = numMatch ? parseInt(numMatch[0], 10) : 0;
                    }
                } else if (header === "Damage") {
                    card.damage = value;
                } else if (header === "Momentum") {
                    card.momentum = value;
                } else if (header === "Target") {
                    // Store target in text_box.traits as expected by card-renderer.js
                    if (value && value !== "") {
                        if (!card.text_box) card.text_box = {};
                        if (!card.text_box.traits) card.text_box.traits = [];
                        card.text_box.traits.push({ name: "Target", value: value });
                    }
                } else if (header === "Traits") {
                    if (value && value !== "") {
                        if (!card.text_box) card.text_box = {};
                        if (!card.text_box.traits) card.text_box.traits = [];
                        // Handle multiple traits separated by commas
                        const traits = value.split(',').map(t => t.trim()).filter(t => t);
                        traits.forEach(traitName => {
                            // Skip if it's already a Target trait
                            if (traitName !== "Target") {
                                card.text_box.traits.push({ name: traitName, value: null });
                            }
                        });
                    }
                } else if (header === "Card Raw Game Text") {
                    // Initialize text_box object
                    if (!card.text_box) card.text_box = {};
                    card.text_box.raw_text = value;
                    
                    // Extract keywords from raw text
                    const keywords = ["Finisher", "Permanent", "Ongoing", "Power Attack", "Focus Attack", 
                                    "Follow-Up", "Cycling", "Resilient", "Stun", "Relentless", 
                                    "Sudden", "Enters", "Flip", "Hidden", "Turned", "Special"];
                    const foundKeywords = [];
                    keywords.forEach(keyword => {
                        if (value.includes(keyword)) {
                            foundKeywords.push({ name: keyword, value: null });
                        }
                    });
                    
                    if (foundKeywords.length > 0) {
                        card.text_box.keywords = foundKeywords;
                    }
                } else if (header === "Wrestler Kit") {
                    card['Wrestler Kit'] = value;
                } else if (header === "Signature For") {
                    card['Signature For'] = value;
                } else if (header === "Set") {
                    card.set = value;
                } else {
                    // Handle other columns
                    const key = header.toLowerCase().replace(/ /g, '_');
                    card[key] = value;
                }
            });

            // If a line doesn't have a name, skip it
            if (!card.title || card.title === "") return null;
            
            // Ensure text_box exists
            if (!card.text_box) {
                card.text_box = {
                    raw_text: "",
                    traits: [],
                    keywords: []
                };
            }
            
            return card;
        }).filter(c => c !== null);

        console.log(`Parsed ${parsedCards.length} cards`);
        console.log('Sample card:', parsedCards[0]);

        state.setCardDatabase(parsedCards);

        // --- Keywords handling (optional but prevents crash) ---
        if (keywordResponse.ok) {
            const keywordText = await keywordResponse.text();
            const parsedKeywords = {};
            keywordText.trim().split(/\r?\n/).forEach(line => {
                const parts = line.split(':');
                if (parts.length >= 2) {
                    parsedKeywords[parts[0].trim()] = parts.slice(1).join(':').trim();
                }
            });
            state.setKeywordDatabase(parsedKeywords);
        }

        // Build the caches needed for the search and deck logic
        state.buildCardTitleCache();

        console.log(`Successfully loaded ${state.cardDatabase.length} cards.`);
        return true;

    } catch (error) {
        console.error('Data Loader Error:', error);
        if (searchResults) {
            searchResults.innerHTML = `<div style="color:red; padding:20px;">Error: ${error.message}</div>`;
        }
        return false;
    }
}
