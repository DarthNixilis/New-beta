// importer.js
import * as state from './config.js';
import { renderDecks, renderPersonaDisplay } from './ui.js';

/**
 * Supported imports:
 * 1) AEW Lackey .dek (XML) with <superzone name="Deck|Purchase_Deck|Starting|Tokens">...
 * 2) Lackey-style text decks with sections like:
 *      Starting:
 *      Purchase_Deck:
 *      Tokens:
 *    And lines like: "3\tCard Name" or "3x Card Name" or "Card Name Wrestler"
 * 3) Legacy export with headers like:
 *      --- Starting Deck ---
 *      --- Purchase Deck ---
 *    And lines like: "3x Card Name"
 */
export function parseAndLoadDeck(text) {
  const importStatus = document.getElementById('importStatus');
  const importModal = document.getElementById('importModal');
  const wrestlerSelect = document.getElementById('wrestlerSelect');
  const managerSelect = document.getElementById('managerSelect');

  try {
    const raw = (text ?? '').toString().replace(/^\uFEFF/, '').trim();
    if (!raw) throw new Error('No deck text found.');

    // Decide format
    const looksLikeXml = raw.startsWith('<') && /<\s*deck\b|<\s*cockatrice_deck\b|<\s*superzone\b/i.test(raw);
    const looksLikeLackeyText = /(^|\n)\s*(Starting|Purchase_Deck|Purchase Deck|Tokens)\s*:/i.test(raw);
    const looksLikeLegacy = /---\s*Starting Deck\s*---|---\s*Purchase Deck\s*---/i.test(raw);

    const result = looksLikeXml
      ? parseDekXml(raw)
      : looksLikeLackeyText
        ? parseLackeyText(raw)
        : looksLikeLegacy
          ? parseLegacyText(raw)
          : parseFallbackList(raw);

    // Apply
    state.setSelectedWrestler(result.wrestler);
    state.setSelectedManager(result.manager);

    wrestlerSelect.value = result.wrestler ? result.wrestler.title : '';
    managerSelect.value = result.manager ? result.manager.title : '';

    state.setStartingDeck(result.startingDeck);
    state.setPurchaseDeck(result.purchaseDeck);

    renderDecks();
    renderPersonaDisplay();
    document.dispatchEvent(new Event('filtersChanged'));

    importStatus.textContent = 'Deck imported successfully!';
    importStatus.style.color = 'green';
    setTimeout(() => { importModal.style.display = 'none'; }, 1200);
  } catch (error) {
    console.error('Error parsing decklist:', error);
    importStatus.textContent = `Import failed: ${error.message}`;
    importStatus.style.color = 'red';
  }
}

function parseDekXml(xmlText) {
  const parser = new DOMParser();
  const xml = parser.parseFromString(xmlText, 'application/xml');
  const parserError = xml.getElementsByTagName('parsererror')[0];
  if (parserError) {
    throw new Error('This .dek file is not valid XML (parser error).');
  }

  /** @type {string[]} */
  const startingDeck = [];
  /** @type {string[]} */
  const purchaseDeck = [];
  let wrestler = null;
  let manager = null;

  const superzones = Array.from(xml.getElementsByTagName('superzone'));
  for (const sz of superzones) {
    const zoneName = (sz.getAttribute('name') || '').trim();

    // Each <card> can be either:
    // - Cockatrice style: <card number="2" name="Foo" />
    // - Your AEW style: <card><name>Foo</name>...</card>
    const cards = Array.from(sz.getElementsByTagName('card'));

    const pushCopies = (name, copies, targetArr) => {
      if (!name) return;
      for (let i = 0; i < copies; i++) targetArr.push(name);
    };

    for (const c of cards) {
      let name = '';
      let copies = 1;

      // Cockatrice-style attrs
      if (c.getAttribute) {
        const attrName = (c.getAttribute('name') || '').trim();
        const attrNumber = c.getAttribute('number');
        if (attrName) name = attrName;
        if (attrNumber && /^\d+$/.test(attrNumber)) copies = parseInt(attrNumber, 10);
      }

      // AEW-style <name> node
      if (!name) {
        const nameNode = c.getElementsByTagName('name')[0];
        if (nameNode && nameNode.textContent) name = nameNode.textContent.trim();
      }

      if (!name) continue;

      // Decide where it goes
      if (/^Starting$/i.test(zoneName)) {
        const card = state.cardTitleCache[name];
        if (card?.card_type === 'Wrestler') wrestler = card;
        else if (card?.card_type === 'Manager') manager = card;
        else {
          // In case someone stores Finisher / other Starting-only cards here
          pushCopies(name, copies, startingDeck);
        }
        continue;
      }

      if (/^Deck$/i.test(zoneName)) {
        pushCopies(name, copies, startingDeck);
        continue;
      }

      if (/^Purchase_Deck$/i.test(zoneName) || /^Purchase Deck$/i.test(zoneName)) {
        pushCopies(name, copies, purchaseDeck);
        continue;
      }

      // Tokens or other zones are informational for builder; ignore safely.
    }
  }

  return { wrestler, manager, startingDeck, purchaseDeck };
}

function parseLackeyText(text) {
  const startingDeck = [];
  const purchaseDeck = [];
  let wrestler = null;
  let manager = null;

  let section = '';

  const lines = text.split(/\r?\n/);
  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line) continue;

    // section headers
    const header = line.replace(/\s+/g, ' ').toLowerCase();
    if (header === 'starting:' || header === 'starting') { section = 'starting'; continue; }
    if (header === 'purchase_deck:' || header === 'purchase_deck' || header === 'purchase deck:' || header === 'purchase deck') { section = 'purchase'; continue; }
    if (header === 'tokens:' || header === 'tokens') { section = 'tokens'; continue; }

    // ignore token section for builder
    if (section === 'tokens') continue;

    // Wrestler/Manager can appear as explicit lines inside Starting:
    //  - "Kenny Omega Wrestler"
    //  - "Luther Manager"
    //  - optionally with counts: "1\tKenny Omega Wrestler" or "1x Kenny Omega Wrestler"
    const persona = parseMaybePersonaLine(line);
    if (persona) {
      if (persona.card_type === 'Wrestler') wrestler = persona;
      else if (persona.card_type === 'Manager') manager = persona;
      continue;
    }

    // Count formats:
    // - "3\tCard Name"
    // - "3x Card Name"
    // - "Card Name" (assume 1)
    const parsed = parseCountedLine(line);
    if (!parsed) continue;

    const { count, name } = parsed;

    if (!state.cardTitleCache[name]) {
      // If someone pasted "Name Wrestler" without us recognizing it as persona:
      const maybeStripped = name.replace(/\s+(Wrestler|Manager)$/i, '').trim();
      if (state.cardTitleCache[maybeStripped]) {
        for (let i = 0; i < count; i++) {
          if (section === 'purchase') purchaseDeck.push(maybeStripped);
          else startingDeck.push(maybeStripped);
        }
      }
      continue;
    }

    for (let i = 0; i < count; i++) {
      if (section === 'purchase') purchaseDeck.push(name);
      else startingDeck.push(name);
    }
  }

  return { wrestler, manager, startingDeck, purchaseDeck };
}

function parseLegacyText(text) {
  const startingDeck = [];
  const purchaseDeck = [];
  let wrestler = null;
  let manager = null;

  let section = '';

  const lines = text.split(/\r?\n/);
  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line) continue;
    if (line.toLowerCase().startsWith('wrestler:')) {
      const name = line.substring(9).trim();
      const card = state.cardTitleCache[name];
      if (card?.card_type === 'Wrestler') wrestler = card;
      continue;
    }
    if (line.toLowerCase().startsWith('manager:')) {
      const name = line.substring(8).trim();
      const card = state.cardTitleCache[name];
      if (card?.card_type === 'Manager') manager = card;
      continue;
    }

    if (/^---\s*Starting Deck/i.test(line)) { section = 'starting'; continue; }
    if (/^---\s*Purchase Deck/i.test(line)) { section = 'purchase'; continue; }

    const parsed = parseCountedLine(line);
    if (!parsed) continue;

    const { count, name } = parsed;
    if (!state.cardTitleCache[name]) continue;

    for (let i = 0; i < count; i++) {
      if (section === 'purchase') purchaseDeck.push(name);
      else if (section === 'starting') startingDeck.push(name);
    }
  }

  return { wrestler, manager, startingDeck, purchaseDeck };
}

function parseFallbackList(text) {
  // If someone pastes just a list, treat it as Starting deck by default.
  const startingDeck = [];
  const purchaseDeck = [];
  let wrestler = null;
  let manager = null;

  const lines = text.split(/\r?\n/);
  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line) continue;

    const persona = parseMaybePersonaLine(line);
    if (persona) {
      if (persona.card_type === 'Wrestler') wrestler = persona;
      else if (persona.card_type === 'Manager') manager = persona;
      continue;
    }

    const parsed = parseCountedLine(line) || { count: 1, name: line };
    const { count, name } = parsed;

    if (!state.cardTitleCache[name]) continue;
    for (let i = 0; i < count; i++) startingDeck.push(name);
  }

  return { wrestler, manager, startingDeck, purchaseDeck };
}

function parseCountedLine(line) {
  // "3\tName" or "3x Name" or "3 x Name"
  let m = line.match(/^(\d+)\s*\t\s*(.+)$/);
  if (m) return { count: parseInt(m[1], 10), name: m[2].trim() };

  m = line.match(/^(\d+)\s*x\s+(.+)$/i);
  if (m) return { count: parseInt(m[1], 10), name: m[2].trim() };

  // "Name" only is valid too
  if (line && !/^\d+/.test(line)) return { count: 1, name: line.trim() };

  return null;
}

function parseMaybePersonaLine(line) {
  // Strip an optional leading count (tab or "x")
  const parsed = parseCountedLine(line);
  const candidate = (parsed?.name ?? line).trim();

  const stripped = candidate.replace(/\s+(Wrestler|Manager)$/i, '').trim();
  const card = state.cardTitleCache[stripped];
  if (!card) return null;

  // If it's a Wrestler/Manager, treat as persona even if suffix isn't present.
  if (card.card_type === 'Wrestler' || card.card_type === 'Manager') return card;

  // If suffix exists, that overrides and allows matching even if card_type is wrong (but still needs to exist)
  const hasSuffix = /\s+(Wrestler|Manager)$/i.test(candidate);
  if (hasSuffix) return card;

  return null;
}
