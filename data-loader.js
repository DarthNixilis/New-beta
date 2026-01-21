// data-loader.js
import * as state from './config.js';

export async function loadGameData() {
  const searchResults = document.getElementById('searchResults');

  try {
    if (searchResults) searchResults.innerHTML = '<p>Loading card data...</p>';

    // Option B: root files, relative to the current page (repo name never appears)
    const cacheBust = `v=${Date.now()}`;
    const cardDbUrl = `./cardDatabase.txt?${cacheBust}`;
    const keywordsUrl = `./keywords.txt?${cacheBust}`;

    const [cardResponse, keywordResponse] = await Promise.all([
      fetch(cardDbUrl),
      fetch(keywordsUrl)
    ]);

    if (!cardResponse.ok) {
      throw new Error(`Could not load cardDatabase.txt (Status: ${cardResponse.status})`);
    }
    if (!keywordResponse.ok) {
      throw new Error(`Could not load keywords.txt (Status: ${keywordResponse.status})`);
    }

    // ---- Parse cards TSV ----
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

      card.title = card['Card Name'];
      card.card_type = card['Type'];
      card.cost = card['Cost'] === 'N/a' ? null : card['Cost'];
      card.damage = card['Damage'] === 'N/a' ? null : card['Damage'];
      card.momentum = card['Momentum'] === 'N/a' ? null : card['Momentum'];

      card.text_box = { raw_text: card['Card Raw Game Text'] };

      if (card.Keywords) {
        card.text_box.keywords = card.Keywords
          .split(',')
          .map(name => ({ name: name.trim() }))
          .filter(k => k.name);
      } else {
        card.text_box.keywords = [];
      }

      if (card.Traits) {
        card.text_box.traits = card.Traits
          .split(',')
          .map(traitStr => {
            const [name, value] = traitStr.split(':');
            return { name: name.trim(), value: value ? value.trim() : undefined };
          })
          .filter(t => t.name);
      } else {
        card.text_box.traits = [];
      }

      return card;
    }).filter(card => card.title);

    state.setCardDatabase(parsedCards);

    // ---- Parse keywords file ----
    const keywordText = await keywordResponse.text();
    const parsedKeywords = {};
    keywordText.trim().split(/\r?\n/).forEach(line => {
      if (!line.trim()) return;
      const parts = line.split(':');
      if (parts.length >= 2) {
        const key = parts[0].trim();
        const value = parts.slice(1).join(':').trim();
        parsedKeywords[key] = value;
      }
    });

    state.setKeywordDatabase(parsedKeywords);
    state.buildCardTitleCache();

    return true;
  } catch (error) {
    console.error("Fatal Error during data load:", error);
    if (searchResults) {
      searchResults.innerHTML =
        `<div style="color: red; padding: 20px; text-align: center;">
           <strong>FATAL ERROR:</strong> ${error.message}<br><br>
           <button onclick="location.reload()">Retry</button>
         </div>`;
    }
    return false;
  }
}
