// data-loader.js
// Loads cardDatabase.txt + keywords.txt from the SAME FOLDER as index.html
// This is "Option B" and is the cleanest way to go beta -> public smoothly.

import * as state from './config.js';

export async function loadGameData() {
  const searchResults = document.getElementById('searchResults');

  try {
    if (searchResults) searchResults.innerHTML = '<p>Loading card data...</p>';

    // RELATIVE PATHS (works in /New-beta/, /public/, local server, etc.)
    const cacheBust = `v=${Date.now()}`;
    const cardDbUrl = `./cardDatabase.txt?${cacheBust}`;
    const keywordsUrl = `./keywords.txt?${cacheBust}`;

    const [cardResponse, keywordResponse] = await Promise.all([
      fetch(cardDbUrl),
      fetch(keywordsUrl),
    ]);

    if (!cardResponse.ok) throw new Error(`Could not load cardDatabase.txt (Status: ${cardResponse.status})`);
    if (!keywordResponse.ok) throw new Error(`Could not load keywords.txt (Status: ${keywordResponse.status})`);

    // -------------------------
    // Parse card TSV
    // -------------------------
    const tsvData = await cardResponse.text();
    const cardLines = tsvData.trim().split(/\r?\n/);
    if (cardLines.length < 2) throw new Error('cardDatabase.txt looks empty or malformed.');

    const cardHeaders = cardLines.shift().trim().split('\t').map(h => h.trim());

    const parsedCards = cardLines
      .map(line => {
        const values = line.split('\t');
        const row = {};
        cardHeaders.forEach((header, index) => {
          const value = (values[index] ?? '').toString().trim();
          if (value === '' || value.toLowerCase() === 'null') row[header] = null;
          else if (!isNaN(value) && value !== '') row[header] = Number(value);
          else row[header] = value;
        });

        // Map your TSV columns to the in-app model
        const card = {};
        card.title = row['Card Name'] ?? null;
        card.card_type = row['Type'] ?? null;

        // Normalize stats (keep null when N/a)
        const cost = row['Cost'];
        const damage = row['Damage'];
        const momentum = row['Momentum'];

        card.cost = (cost === 'N/a' || cost === 'N/A') ? null : cost;
        card.damage = (damage === 'N/a' || damage === 'N/A') ? null : damage;
        card.momentum = (momentum === 'N/a' || momentum === 'N/A') ? null : momentum;

        // Raw text
        card.text_box = { raw_text: row['Card Raw Game Text'] ?? '' };

        // Keywords
        if (row['Keywords']) {
          card.text_box.keywords = row['Keywords']
            .split(',')
            .map(name => ({ name: name.trim() }))
            .filter(k => k.name);
        } else {
          card.text_box.keywords = [];
        }

        // Traits
        if (row['Traits']) {
          card.text_box.traits = row['Traits']
            .split(',')
            .map(traitStr => {
              const parts = traitStr.split(':');
              return {
                name: (parts[0] ?? '').trim(),
                value: parts.length > 1 ? parts.slice(1).join(':').trim() : undefined,
              };
            })
            .filter(t => t.name);
        } else {
          card.text_box.traits = [];
        }

        // Pass through any other columns you care about later
        // Example: Signature For, Wrestler Kit, etc.
        Object.keys(row).forEach(k => {
          if (!(k in card)) card[k] = row[k];
        });

        return card;
      })
      .filter(card => card.title && card.card_type);

    state.setCardDatabase(parsedCards);

    // -------------------------
    // Parse keywords.txt (Key: Definition)
    // -------------------------
    const keywordText = await keywordResponse.text();
    const parsedKeywords = {};
    keywordText
      .trim()
      .split(/\r?\n/)
      .forEach(line => {
        const clean = line.trim();
        if (!clean) return;
        const parts = clean.split(':');
        if (parts.length < 2) return;
        const key = parts[0].trim();
        const value = parts.slice(1).join(':').trim();
        if (key) parsedKeywords[key] = value;
      });

    state.setKeywordDatabase(parsedKeywords);

    // Build title caches for fast lookups (exporter/importer/deck logic depends on this)
    state.buildCardTitleCache();

    console.log(`Loaded ${state.cardDatabase.length} cards. Keywords: ${Object.keys(state.keywordDatabase).length}`);
    return true;
  } catch (error) {
    console.error('Fatal Error during data load:', error);

    if (searchResults) {
      searchResults.innerHTML = `
        <div style="color: red; padding: 20px; text-align: center;">
          <strong>FATAL ERROR:</strong> ${error.message}<br><br>
          <button onclick="location.reload()">Retry</button>
        </div>
      `;
    }

    return false;
  }
}
