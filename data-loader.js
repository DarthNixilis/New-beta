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

        const parsedCards = lines.slice(1).map((line, lineIdx) => {
            const cols = line.split('\t');
            const card = {};

            headers.forEach((header, index) => {
                const value = cols[index] ? cols[index].trim() : "";
                
                // CRITICAL MAPPING: Maps your Google Sheet Headers to your Code Logic
                if (header === "Card Name") {
                    card.title = value; 
                } else if (header === "Type") {
                    card.card_type = value; // Required for app-init.js filters
                } else if (header === "Cost") {
                    card.cost = (value === "N/A" || value === "") ? 0 : parseInt(value, 10) || 0;
                } else if (header === "Damage") {
                    card.damage = value;
                } else if (header === "Momentum") {
                    card.momentum = value;
                } else if (header === "Card Raw Game Text") {
                    // card-renderer.js expects card.text_box.raw_text
                    card.text_box = {
                        raw_text: value,
                        traits: [] 
                    };
                } else {
                    // Handle other columns like Set, Target, Traits, etc.
                    const key = header.toLowerCase().replace(/ /g, '_');
                    card[key] = value;
                }
            });

            // If a line doesn't have a name, skip it
            if (!card.title) return null;
            return card;
        }).filter(c => c !== null);

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

