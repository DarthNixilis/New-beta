// data-loader.js
import * as state from './config.js';

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

function escapeRegex(str) {
    return String(str).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function buildKeywordMatchers(keywordNames) {
    return keywordNames
        .filter(Boolean)
        .map(name => {
            const escaped = escapeRegex(name.trim());
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

        const [cardResponse, keywordResponse] = await Promise.all([
            fetch(cardDbUrl),
            fetch(keywordsUrl)
        ]);

        if (!cardResponse.ok) throw new Error(`Could not load cardDatabase.txt`);
        if (!keywordResponse.ok) throw new Error(`Could not load keywords.txt`);

        /* ---------------- KEYWORDS ---------------- */

        const keywordText = await keywordResponse.text();
        const parsedKeywords = {};
        keywordText.trim().split(/\r?\n/).forEach(line => {
            if (!line.trim()) return;
            const parts = line.split(':');
            if (parts.length >= 2) {
                parsedKeywords[parts[0].trim()] = parts.slice(1).join(':').trim();
            }
        });

        state.setKeywordDatabase(parsedKeywords);
        const keywordMatchers = buildKeywordMatchers(Object.keys(parsedKeywords));

        /* ---------------- CARD DATABASE ---------------- */

        const tsvData = await cardResponse.text();
        const lines = tsvData.trim().split(/\r?\n/);
        const headers = lines.shift().split('\t').map(h => h.trim());

        const cards = lines.map(line => {
            const values = line.split('\t');
            const card = {};

            headers.forEach((header, i) => {
                const value = (values[i] || '').trim();
                if (value === '' || value === 'null') card[header] = null;
                else if (!isNaN(value)) card[header] = Number(value);
                else card[header] = value;
            });

            /* ---- Normalize core fields ---- */
            card.title = card['Card Name'];
            card.card_type = card['Type'];
            card.cost = card['Cost'] === 'N/a' ? null : card['Cost'];
            card.damage = card['Damage'] === 'N/a' ? null : card['Damage'];
            card.momentum = card['Momentum'] === 'N/a' ? null : card['Momentum'];

            const rawText = card['Card Raw Game Text'] || '';
            card.text_box = {
                raw_text: rawText,
                keywords: [],
                traits: []
            };

            /* ---- KEYWORDS ---- */
            if (typeof card.Keywords === 'string' && card.Keywords.trim()) {
                card.text_box.keywords = card.Keywords
                    .split(',')
                    .map(k => ({ name: k.trim() }))
                    .filter(k => k.name);
            } else {
                card.text_box.keywords = deriveKeywordsFromText(rawText, keywordMatchers);
            }

            /* ---- TRAITS ---- */
            if (typeof card.Traits === 'string' && card.Traits.trim()) {
                card.Traits.split(',').forEach(traitStr => {
                    const [name, value] = traitStr.split(':');
                    if (name) {
                        card.text_box.traits.push({
                            name: name.trim(),
                            value: value ? value.trim() : undefined
                        });
                    }
                });
            }

            /* ---- TARGET (THE FIX) ---- */
            if (card.Target) {
                card.text_box.traits.push({
                    name: 'Target',
                    value: String(card.Target).trim()
                });
            }

            return card;
        }).filter(c => c.title);

        state.setCardDatabase(cards);
        state.buildCardTitleCache();

        return true;
    } catch (err) {
        console.error(err);
        searchResults.innerHTML =
            `<div style="color:red;padding:20px"><strong>Fatal Error:</strong> ${err.message}</div>`;
        return false;
    }
} 
