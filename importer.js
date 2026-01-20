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

/**
 * Optional import entrypoint.
 * If your Import button calls importDeck(), this will work on Android too.
 * It looks for an existing <input type="file" id="importFileInput"> first,
 * otherwise it creates one on the fly.
 */
export function importDeck() {
  let input = document.getElementById('importFileInput');

  if (!input) {
    input = document.createElement('input');
    input.type = 'file';
    input.accept = '.txt,.dek,.xml,text/plain,application/xml';
    input.id = 'importFileInput';
    input.style.display = 'none';
    document.body.appendChild(input);
  }

  input.value = '';
  input.onchange = async () => {
    const file = input.files?.[0];
    if (!file) return;
    const text = await file.text();
    parseAndLoadDeck(text);
  };

  input.click();
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
      for (let i =
