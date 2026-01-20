// exporter.js
import * as state from './config.js';

/* ============================================================================
   HELPERS
   ============================================================================ */

function download(filename, content) {
  const blob = new Blob([content], { type: 'text/plain' });
  const url = URL.createObjectURL(blob);

  const a = document.createElement('a');
  a.href = url;
  a.download = filename;

  // Some mobile browsers are picky unless it’s in the DOM
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);

  URL.revokeObjectURL(url);
}

function normalizeTokenName(raw) {
  if (!raw) return null;
  let s = String(raw).trim();

  // Strip leading token cost like "4C" or "(4C)"
  s = s.replace(/^\(?\s*\d+\s*C\s*\)?\s+/i, '').trim();

  // Strip targeting pronouns
  s = s.replace(/\s+(opponent|them|him|her)$/i, '').trim();

  return s || null;
}

/* ============================================================================
   TEXT EXPORT
   ============================================================================ */

export function exportDeckAsText() {
  let text = '';

  state.startingDeck.forEach(card => {
    text += `1\t${card}\n`;
  });

  text += '\n';

  state.purchaseDeck.forEach(card => {
    text += `1\t${card}\n`;
  });

  download('deck.txt', text);
}

/* ============================================================================
   IMAGE EXPORTS (STUBS – SAFE)
   ============================================================================ */

// These exist so imports never fail.
// You can flesh them out later without breaking the app.

export function exportDeckAsImages() {
  alert('Deck image export not implemented yet.');
}

export function exportAllCardsAsImages() {
  alert('All-cards image export not implemented yet.');
}

/* ============================================================================
   LACKEY TEXT EXPORT
   ============================================================================ */

export function exportDeckAsLackeyText() {
  let text = '';

  // PURCHASE DECK
  text += 'Purchase_Deck:\n';
  state.purchaseDeck.forEach(card => {
    text += `1\t${card}\n`;
  });

  text += '\nStarting:\n';

  // Persona (INLINE labels, no sections)
  if (state.selectedWrestler) {
    text += `1\t${state.selectedWrestler.title} Wrestler\n`;
  }
  if (state.selectedManager) {
    text += `1\t${state.selectedManager.title} Manager\n`;
  }
  if (state.selectedCallName) {
    text += `1\t${state.selectedCallName.title} Call Name\n`;
  }
  if (state.selectedFaction) {
    text += `1\t${state.selectedFaction.title} Faction\n`;
  }

  // Kits (Wrestler only)
  if (state.selectedWrestler) {
    const wrestlerTitle = state.selectedWrestler.title;
    const kits = state.cardDatabase.filter(c =>
      state.isKitCard(c) && c['Signature For'] === wrestlerTitle
    );
    kits.forEach(c => {
      text += `1\t${c.title}\n`;
    });
  }

  // TOKENS
  const tokens = new Set();

  const allCards = [
    ...state.startingDeck,
    ...state.purchaseDeck
  ]
    .map(title => state.cardTitleCache[title])
    .filter(Boolean);

  allCards.forEach(card => {
    const raw = card.text_box?.raw_text || '';

    // Attempt to X
    raw.match(/Attempt to ([^.,\n]+)/gi)?.forEach(m => {
      const name = normalizeTokenName(m.replace(/Attempt to/i, ''));
      if (name) tokens.add(name);
    });

    // Create a X token
    raw.match(/create (?:a|an) ([^.,\n]+?) token/gi)?.forEach(m => {
      const name = normalizeTokenName(
        m.replace(/create (?:a|an)/i, '').replace(/token/i, '')
      );
      if (name) tokens.add(name);
    });
  });

  if (tokens.size) {
    text += '\nTokens:\n';
    tokens.forEach(t => {
      text += `1\t${t}\n`;
    });
  }

  download('deck.txt', text);
}

/* ============================================================================
   COMPAT + GLOBAL EXPORTS (Fixes "buttons do nothing" in module scope)
   ============================================================================ */

/**
 * Many UIs call simple names like exportDeck()/exportAll().
 * Your module exports were exportDeckAsLackeyText/exportDeckAsText.
 * These wrappers keep BOTH styles working.
 */
export function exportDeck() {
  // Default export format for your builder: Lackey text (most useful)
  return exportDeckAsLackeyText();
}

export function exportAll() {
  // Default: stubbed image export of all cards (safe)
  // Change later if you implement a real "export all as text" etc.
  return exportAllCardsAsImages();
}

// Expose to window so inline onclick or dynamic listeners can call them
// even when running under ES modules.
window.AEW = window.AEW || {};
window.AEW.exportDeckAsText = exportDeckAsText;
window.AEW.exportDeckAsImages = exportDeckAsImages;
window.AEW.exportAllCardsAsImages = exportAllCardsAsImages;
window.AEW.exportDeckAsLackeyText = exportDeckAsLackeyText;
window.AEW.exportDeck = exportDeck;
window.AEW.exportAll = exportAll;

// Back-compat if HTML uses onclick="exportDeck()" etc.
window.exportDeckAsText = exportDeckAsText;
window.exportDeckAsImages = exportDeckAsImages;
window.exportAllCardsAsImages = exportAllCardsAsImages;
window.exportDeckAsLackeyText = exportDeckAsLackeyText;
window.exportDeck = exportDeck;
window.exportAll = exportAll;
