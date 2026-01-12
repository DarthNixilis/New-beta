// data-loader.js
import * as state from './config.js';

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

async function fetchWithTimeout(url, ms = 15000) {
    const controller = new AbortController();
    const id = setTimeout(() => controller.abort(), ms);
    try {
        return await fetch(url, { signal: controller.signal });
    } finally {
        clearTimeout(id);
    }
}

function buildAssetUrl(filename) {
    // Rock-solid on GitHub Pages because it anchors to the module location
    const url = new URL(filename, import.meta.url);
    // Cache-bust so GH Pages / mobile caches don’t lie to us
    url.searchParams.set('v', String(Date.now()));
    return url.toString();
}

export async function loadGameData() {
    const searchResults = document.getElementById('searchResults');

    try {
        if (searchResults) searchResults.innerHTML = '<p>Loading card data...</p>';

        const cardDbUrl = buildAssetUrl('cardDatabase.txt');
        const keywordsUrl = buildAssetUrl('keywords.txt');

        console.log('Loading:', { cardDbUrl, keywordsUrl });

        const [cardResponse, keywordResponse] = await Promise.all([
            fetchWithTimeout(cardDbUrl, 20000),
            fetchWithTimeout(keywordsUrl, 20000)
        ]);

        if (!cardResponse.ok) throw new Error(`Could not load cardDatabase.txt (Status: ${cardResponse.status})`);
        if (!keywordResponse.ok) throw new Error(`Could not load keywords.txt (Status: ${keywordResponse.status})`);

        /* ---------------- KEYWORDS ---------------- */

        const keywordText = await keywordResponse.text();
        const parsedKeywords = {};
        keywordText.trim().split(/\r?\n/).forEach(line => {
            if (!line.trim()) return;
            const parts = line.split(':');
            if (parts.length >= 2) {
                const key = parts[0].trim();
                const value = parts.slice(1).join(':').trim();
                if (key) parsedKeywords[key] = value;
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

            // Normalize core fields your app expects
            card.title = card['Card Name'];
            card.card_type = card['Type'];
            card.cost = card['Cost'] === 'N/a' ? null : card['Cost'];
            card.damage = card['Damage'] === 'N/a' ? null : card['Damage'];
            card.momentum = card['Momentum'] === 'N/a' ? null : card['Momentum'];

            const rawText = card['Card Raw Game Text'] || '';
            card.text_box = { raw_text: rawText, keywords: [], traits: [] };

            // Keywords:
            // If there is a Keywords column, use it; otherwise derive from keywords.txt names
            if (typeof card.Keywords === 'string' && card.Keywords.trim()) {
                card.text_box.keywords = card.Keywords
                    .split(',')
                    .map(k => ({ name: k.trim() }))
                    .filter(k => k.name);
            } else {
                card.text_box.keywords = deriveKeywordsFromText(rawText, keywordMatchers);
            }

            // Traits (column-based)
            if (typeof card.Traits === 'string' && card.Traits.trim()) {
                card.Traits.split(',').forEach(traitStr => {
                    const [name, value] = traitStr.split(':');
                    if (!name) return;
                    card.text_box.traits.push({
                        name: name.trim(),
                        value: value ? value.trim() : undefined
                    });
                });
            }

            // TARGET (so renderer + filters can find it)
            if (card.Target) {
                card.text_box.traits.push({ name: 'Target', value: String(card.Target).trim() });
            }

            return card;
        }).filter(c => c.title);

        state.setCardDatabase(cards);
        state.buildCardTitleCache();

        console.log(`Loaded ${cards.length} cards. Keywords: ${Object.keys(parsedKeywords).length}`);
        return true;
    } catch (err) {
        console.error('Fatal Error during data load:', err);

        if (searchResults) {
            searchResults.innerHTML = `
                <div style="color:red;padding:16px;text-align:center;">
                    <strong>FATAL ERROR:</strong> ${err.name === 'AbortError'
                        ? 'Loading timed out (check connection or file path).'
                        : err.message}
                    <br><br>
                    <button onclick="location.reload()">Retry</button>
                </div>
            `;
        }

        return false;
    }
}
