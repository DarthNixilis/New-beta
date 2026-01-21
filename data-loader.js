// data-loader.js
import * as state from './config.js';

export async function loadGameData() {
  const searchResults = document.getElementById('searchResults');

  try {
    if (searchResults) {
      searchResults.innerHTML = '<p>Loading card data...</p>';
    }

    // Option B: everything in repo root, relative to the current page.
    // This works across New-beta, New-public, or any renamed repo.
    const cacheBuster = Date.now();
    const cardDbUrl = `./cardDatabase.txt?v=${cacheBuster}`;
    const keywordsUrl = `./keywords.txt?v=${cacheBuster}`;

    const [cardResponse, keywordResponse] = await Promise.all([
      fetch(cardDbUrl),
      fetch(keywordsUrl),
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

    const parsedCards = cardLines
      .map(line => {
        const values = line.split('\t');
        const card = {};

        cardHeaders.forEach((header, index) => {
          const value = (values[index] || '').trim();

          if (value === '' || value.toLowerCase() === 'null') {
            card[header] = null;
          } else if (!isNaN(value) && value !== '') {
            card[header] = Number(value);
          } else {
            card[header] = value;
          }
        });

        // Normalize to your internal model
        card.title = card['Card Name'];
        card.card_type = card['Type'];
        card.cost = card['Cost'] === 'N/a' ? null : card['Cost'];
        card.damage = card['Damage'] === 'N/a' ? null : card['Damage'];
        card.momentum = card['Momentum'] === 'N/a' ? null : card['Momentum'];

        card.text_box = { raw_text: card['Card Raw Game Text'] };

        // Keywords array
        if (card.Keywords) {
          card.text_box.keywords = card.Keywords
            .split(',')
            .map(name => ({ name: name.trim() }))
            .filter(k => k.name);
        } else {
          card.text_box.keywords = [];
        }

        // Traits array
        if (card.Traits) {
          card.text_box.traits = card.Traits
            .split(',')
            .map(traitStr => {
              const [name, value] = traitStr.split(':');
              return {
                name: (name || '').trim(),
                value: value ? value.trim() : undefined,
              };
            })
            .filter(t => t.name);
        } else {
          card.text_box.traits = [];
        }

        return card;
      })
      .filter(card => card && card.title);

    state.setCardDatabase(parsedCards);

    // ---- Parse keywords file ----
    const keywordText = await keywordResponse.text();
    const parsedKeywords = {};
    keywordText
      .trim()
      .split(/\r?\n/)
      .forEach(line => {
        const l = line.trim();
        if (!l) return;

        const parts = l.split(':');
        if (parts.length < 2) return;

        const key = parts[0].trim();
        const value = parts.slice(1).join(':').trim();
        if (!key) return;

        parsedKeywords[key] = value;
      });

    state.setKeywordDatabase(parsedKeywords);
    state.buildCardTitleCache();

    console.log(`Loaded ${parsedCards.length} cards. Keywords: ${Object.keys(parsedKeywords).length}`);

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
