// data-loader.js
import * as state from './config.js';

/**
 * Loads cardDatabase.txt and keywords.txt from the SAME folder as this JS file.
 * This avoids hardcoding repo names (New-beta vs New-Beta) and works in /beta and /public.
 */
export async function loadGameData() {
  const searchResults = document.getElementById('searchResults');

  try {
    if (searchResults) {
      searchResults.innerHTML = '<p>Loading card data...</p>';
    }

    // Always resolve assets relative to this module’s location (works on GitHub Pages subpaths)
    const cardDbUrl = new URL('./cardDatabase.txt', import.meta.url);
    const keywordsUrl = new URL('./keywords.txt', import.meta.url);

    // Cache-busting for rapid testing on GitHub Pages + mobile
    cardDbUrl.searchParams.set('v', String(Date.now()));
    keywordsUrl.searchParams.set('v', String(Date.now()));

    const [cardResponse, keywordResponse] = await Promise.all([
      fetch(cardDbUrl.toString()),
      fetch(keywordsUrl.toString()),
    ]);

    if (!cardResponse.ok) {
      throw new Error(`Could not load cardDatabase.txt (Status: ${cardResponse.status})`);
    }
    if (!keywordResponse.ok) {
      throw new Error(`Could not load keywords.txt (Status: ${keywordResponse.status})`);
    }

    // --- Parse Card Database (TSV) ---
    const cardText = await cardResponse.text();

    // Keep non-empty lines (prevents blank first line/BOM weirdness from killing headers)
    const lines = cardText
      .split(/\r?\n/)
      .map(l => l.replace(/^\uFEFF/, '')) // strip UTF-8 BOM if present
      .filter(l => l.trim() !== '');

    if (lines.length < 2) {
      throw new Error('cardDatabase.txt appears to be empty or missing headers.');
    }

    const headers = lines[0].split('\t').map(h => h.trim());

    const parsedCards = lines.slice(1).map(line => {
      const cols = line.split('\t');
      const card = {};

      headers.forEach((header, index) => {
        const valueRaw = (cols[index] ?? '').toString().trim();
        const value = (valueRaw === '' || valueRaw.toLowerCase() === 'null') ? null : valueRaw;

        // Map the known fields your UI expects
        if (header === 'Card Name') {
          card.title = value ?? '';
        } else if (header === 'Type') {
          card.card_type = value ?? '';
        } else if (header === 'Cost') {
          // Keep "N/A" as null
          if (!value || value.toUpperCase() === 'N/A' || value.toLowerCase() === 'n/a') card.cost = null;
          else card.cost = Number(value);
        } else if (header === 'Damage') {
          if (!value || value.toUpperCase() === 'N/A' || value.toLowerCase() === 'n/a') card.damage = null;
          else card.damage = value; // some of yours are formulas like 10* so keep as string
        } else if (header === 'Momentum') {
          if (!value || value.toUpperCase() === 'N/A' || value.toLowerCase() === 'n/a') card.momentum = null;
          else card.momentum = Number(value);
        } else if (header === 'Card Raw Game Text') {
          card.text_box = {
            raw_text: value ?? '',
            keywords: [],
            traits: [],
          };
        } else if (header === 'Keywords') {
          const kw = (value ?? '')
            .split(',')
            .map(s => s.trim())
            .filter(Boolean)
            .map(name => ({ name }));
          if (!card.text_box) card.text_box = { raw_text: '', keywords: [], traits: [] };
          card.text_box.keywords = kw;
        } else if (header === 'Traits') {
          const traits = (value ?? '')
            .split(',')
            .map(s => s.trim())
            .filter(Boolean)
            .map(traitStr => {
              const [name, ...rest] = traitStr.split(':');
              const v = rest.join(':').trim();
              return { name: name.trim(), value: v ? v : undefined };
            })
            .filter(t => t.name);
          if (!card.text_box) card.text_box = { raw_text: '', keywords: [], traits: [] };
          card.text_box.traits = traits;
        } else {
          // Store everything else in a predictable snake_case key
          const key = header.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '');
          card[key] = value;
        }
      });

      return card;
    }).filter(c => c && c.title && c.card_type);

    state.setCardDatabase(parsedCards);

    // --- Parse Keywords ---
    const keywordText = await keywordResponse.text();
    const parsedKeywords = {};

    keywordText
      .split(/\r?\n/)
      .map(l => l.replace(/^\uFEFF/, '').trim())
      .filter(Boolean)
      .forEach(line => {
        const parts = line.split(':');
        if (parts.length < 2) return;
        const key = parts[0].trim();
        const value = parts.slice(1).join(':').trim();
        if (key) parsedKeywords[key] = value;
      });

    state.setKeywordDatabase(parsedKeywords);

    // Caches used by deck logic/search (your code expects this)
    state.buildCardTitleCache();

    console.log(`Successfully loaded ${state.cardDatabase.length} cards.`);
    if (searchResults) {
      searchResults.innerHTML = `<p>Loaded ${state.cardDatabase.length} cards.</p>`;
    }

    // ✅ THIS is the missing piece in your current file
    return true;

  } catch (error) {
    console.error('Fatal Error during data load:', error);

    if (searchResults) {
      searchResults.innerHTML = `
        <div style="color: red; padding: 16px; text-align: center;">
          <strong>DATA LOAD ERROR:</strong><br>
          ${error.message}<br><br>
          <button onclick="location.reload()" style="padding: 10px 14px;">Retry</button>
        </div>
      `;
    }
    return false;
  }
}
