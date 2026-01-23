// data-loader.js
import * as state from './config.js';

/**
 * Loads cardDatabase.txt and keywords.txt from the SAME folder as this JS file.
 */
export async function loadGameData() {
    const searchResults = document.getElementById('searchResults');

    try {
        if (searchResults) {
            searchResults.innerHTML = '<p>Loading card data...</p>';
        }

        const cardDbUrl = new URL('./cardDatabase.txt', import.meta.url);
        const keywordsUrl = new URL('./keywords.txt', import.meta.url);

        // Cache-busting for rapid testing
        cardDbUrl.searchParams.set('v', String(Date.now()));
        keywordsUrl.searchParams.set('v', String(Date.now()));

        const [cardResponse, keywordResponse] = await Promise.all([
            fetch(cardDbUrl.toString()),
            fetch(keywordsUrl.toString()),
        ]);

        if (!cardResponse.ok) throw new Error(`Could not load cardDatabase.txt (Status: ${cardResponse.status})`);
        if (!keywordResponse.ok) throw new Error(`Could not load keywords.txt (Status: ${keywordResponse.status})`);

        // --- Parse Card Database (TSV) ---
        const cardText = await cardResponse.text();
        const lines = cardText.split(/\r?\n/).filter(line => line.trim() !== "");
        
        if (lines.length < 2) throw new Error("cardDatabase.txt appears to be empty or missing headers.");

        const headers = lines[0].split('\t').map(h => h.trim());

        const parsedCards = lines.slice(1).map(line => {
            const cols = line.split('\t');
            const card = {};

            headers.forEach((header, index) => {
                const value = cols[index] ? cols[index].trim() : "";
                
                // MAPPING: Google Sheets Header -> Internal JS Property
                if (header === "Card Name") {
                    card.title = value;
                } else if (header === "Type") {
                    card.card_type = value;
                } else if (header === "Cost") {
                    // Convert "N/A" or empty to 0 for logic/sorting
                    card.cost = (value === "N/A" || value === "") ? 0 : parseInt(value, 10) || 0;
                } else if (header === "Damage") {
                    card.damage = value;
                } else if (header === "Momentum") {
                    card.momentum = value;
                } else if (header === "Card Raw Game Text") {
                    // This creates the nested structure card-renderer.js expects
                    card.text_box = {
                        raw_text: value,
                        traits: [] // Initialized for later parsing if needed
                    };
                } else {
                    // Dynamic mapping for everything else (Set, Target, Traits, etc.)
                    const key = header.toLowerCase().replace(/ /g, '_');
                    card[key] = value;
                }
            });

            return card;
        }).filter(c => c && c.title); // Ensure we don't import broken rows

        state.setCardDatabase(parsedCards);

        // --- Parse Keywords ---
        const keywordText = await keywordResponse.text();
        const parsedKeywords = {};

        keywordText.trim().split(/\r?\n/).forEach(line => {
            const clean = line.trim();
            if (!clean) return;
            const parts = clean.split(':');
            if (parts.length < 2) return;
            const key = parts[0].trim();
            const value = parts.slice(1).join(':').trim();
            if (key) parsedKeywords[key] = value;
        });

        state.setKeywordDatabase(parsedKeywords);

        // Build title caches (essential for deck building logic)
        state.buildCardTitleCache();

        console.log(`Successfully loaded ${state.cardDatabase.length} cards.`);
        return true;

    } catch (error) {
        console.error('Fatal Error during data load:', error);
        if (searchResults) {
            searchResults.innerHTML = `
                <div style="color: red; padding: 20px; text-align: center;">
                    <strong>FATAL ERROR:</strong> ${error.message}
                </div>
            `;
        }
        return false;
    }
}
