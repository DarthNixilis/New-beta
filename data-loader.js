// data-loader.js
import * as state from './config.js';

// --- DYNAMIC PATH DETECTION ---
function getBasePath() {
    const path = window.location.pathname;
    // This handles project pages like /RepoName/
    const secondSlashIndex = path.indexOf('/', 1);
    if (secondSlashIndex !== -1) {
        return path.substring(0, secondSlashIndex + 1);
    }
    return '/';
}
// --- END DYNAMIC PATH DETECTION ---

function escapeRegex(str) {
    return String(str).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function buildKeywordMatchers(keywordNames) {
    // We match whole keyword phrases, case-insensitive.
    // For multi-word keywords, \b at ends still works well in practice.
    return keywordNames
        .filter(Boolean)
        .map(name => {
            const escaped = escapeRegex(name.trim());
            // Guard against empty strings
            if (!escaped) return null;
            const pattern = `\\b${escaped}\\b`;
            return { name: name.trim(), re: new RegExp(pattern, 'i') };
        })
        .filter(Boolean);
}

function deriveKeywordsFromText(rawText, keywordMatchers) {
    const text = String(rawText || '');
    const found = [];
    for (const { name, re } of keywordMatchers) {
        if (re.test(text)) found.push({ name });
    }
    return found;
}

export async function loadGameData() {
    const searchResults = document.getElementById('searchResults');
    try {
        searchResults.innerHTML = '<p>Loading card data...</p>';

        const basePath = getBasePath();
        const cardDbUrl = `${basePath}cardDatabase.txt?v=${new Date().getTime()}`;
        const keywordsUrl = `${basePath}keywords.txt?v=${new Date().getTime()}`;

        console.log(`Attempting to load data from: ${basePath}`);

        const [cardResponse, keywordResponse] = await Promise.all([
            fetch(cardDbUrl),
            fetch(keywordsUrl)
        ]);

        if (!cardResponse.ok) throw new Error(`Could not load cardDatabase.txt (Status: ${cardResponse.status})`);
        if (!keywordResponse.ok) throw new Error(`Could not load keywords.txt (Status: ${keywordResponse.status})`);

        // 1) Load keyword definitions FIRST so we can derive per-card keywords from rules text
        const keywordText = await keywordResponse.text();
        const parsedKeywords = {};
        const keywordLines = keywordText.trim().split(/\r?\n/);
        keywordLines.forEach(line => {
            if (line.trim() === '') return;
            const parts = line.split(':');
            if (parts.length >= 2) {
                const key = parts[0].trim();
                const value = parts.slice(1).join(':').trim();
                if (key) parsedKeywords[key] = value;
            }
        });
        state.setKeywordDatabase(parsedKeywords);

        const keywordNames = Object.keys(parsedKeywords);
        const keywordMatchers = buildKeywordMatchers(keywordNames);

        // 2) Load and parse the card database TSV
        const tsvData = await cardResponse.text();
        const cardLines = tsvData.trim().split(/\r?\n/);
        const cardHeaders = cardLines.shift().trim().split('\t').map(h => h.trim());

        const parsedCards = cardLines.map(line => {
            const values = line.split('\t');
            const card = {};
            cardHeaders.forEach((header, index) => {
                const value = (values[index] || '').trim();
                if (value === 'null' || value === '') card[header] = null;
                else if (!isNaN(value) && value !== '') card[header] = Number(value);
                else card[header] = value;
            });

            // Normalize fields your app expects
            card.title = card['Card Name'];
            card.card_type = card['Type'];
            card.cost = card['Cost'] === 'N/a' ? null : card['Cost'];
            card.damage = card['Damage'] === 'N/a' ? null : card['Damage'];
            card.momentum = card['Momentum'] === 'N/a' ? null : card['Momentum'];

            const rawText = card['Card Raw Game Text'] || '';
            card.text_box = { raw_text: rawText };

            // KEYWORDS (FIXED):
            // If there is a Keywords/Keyword column, use it.
            // Otherwise derive from keywords.txt by scanning the raw rules text.
            const keywordField =
                (typeof card['Keywords'] === 'string' && card['Keywords'].trim() !== '') ? card['Keywords'] :
                (typeof card['Keyword'] === 'string' && card['Keyword'].trim() !== '') ? card['Keyword'] :
                null;

            if (keywordField) {
                card.text_box.keywords = keywordField
                    .split(',')
                    .map(name => ({ name: name.trim() }))
                    .filter(k => k.name);
            } else {
                card.text_box.keywords = deriveKeywordsFromText(rawText, keywordMatchers);
            }

            // Traits: keep existing behavior (column-based)
            if (card.Traits) {
                card.text_box.traits = card.Traits.split(',').map(traitStr => {
                    const [name, value] = traitStr.split(':');
                    return { name: name.trim(), value: value ? value.trim() : undefined };
                }).filter(t => t.name);
            } else {
                card.text_box.traits = [];
            }

            return card;
        }).filter(card => card.title);

        state.setCardDatabase(parsedCards);
        state.buildCardTitleCache();

        return true;
    } catch (error) {
        console.error("Fatal Error during data load:", error);
        searchResults.innerHTML = `<div style="color: red; padding: 20px; text-align: center;"><strong>FATAL ERROR:</strong> ${error.message}<br><br><button onclick="location.reload()">Retry</button></div>`;
        return false;
    }
}
