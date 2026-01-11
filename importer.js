// importer.js
import * as state from './config.js';
import { renderDecks, renderPersonaDisplay } from './ui.js';

/* ============================================================================
   Format detection
   ============================================================================ */

function isLikelyXmlDek(text) {
    const t = String(text || '').trim();
    return t.startsWith('<deck') || (t.includes('<superzone') && t.includes('Purchase_Deck'));
}

function isLikelyLackeyText(lines) {
    // Lackey text export includes markers like Purchase_Deck:, Starting:, Tokens:
    // and commonly uses tab-separated qty lines "3\tCard Name"
    return lines.some(l =>
        /purchase_deck\s*:/i.test(l) ||
        /^starting\s*:/i.test(l) ||
        /^tokens\s*:/i.test(l) ||
        /^\s*\d+\s*\t/.test(l)
    );
}

/* ============================================================================
   Shared helpers
   ============================================================================ */

function addCopies(arr, title, count) {
    for (let i = 0; i < count; i++) arr.push(title);
}

function parseCountAndTitle(line) {
    const trimmed = String(line || '').trim();
    if (!trimmed) return null;

    // Lackey typical: "3\tCard Name"
    let m = trimmed.match(/^(\d+)\s*\t\s*(.+)$/);
    if (m) return { count: parseInt(m[1], 10), title: m[2].trim() };

    // Fallback: "3 Card Name"
    m = trimmed.match(/^(\d+)\s+(.+)$/);
    if (m) return { count: parseInt(m[1], 10), title: m[2].trim() };

    return null;
}

function stripPersonaSuffix(title) {
    // Your Lackey export uses:
    // "Adam Copeland Wrestler"
    // "Luthor Manager"
    const t = String(title || '').trim();
    const lower = t.toLowerCase();

    if (lower.endsWith(' wrestler')) {
        return { baseTitle: t.slice(0, -(' wrestler'.length)).trim(), role: 'Wrestler' };
    }
    if (lower.endsWith(' manager')) {
        return { baseTitle: t.slice(0, -(' manager'.length)).trim(), role: 'Manager' };
    }
    return { baseTitle: t, role: null };
}

/* ============================================================================
   Plain text parser (legacy format)
   ============================================================================ */

function parsePlainTextDeck(lines) {
    let newWrestler = null;
    let newManager = null;
    let newStartingDeck = [];
    let newPurchaseDeck = [];
    let currentSection = '';

    lines.forEach(line => {
        const trimmedLine = line.trim();
        if (!trimmedLine || trimmedLine.toLowerCase().startsWith('kit')) return;

        if (trimmedLine.toLowerCase().startsWith('wrestler:')) {
            const wrestlerName = trimmedLine.substring(9).trim();
            const wrestler = state.cardTitleCache[wrestlerName];
            if (wrestler && wrestler.card_type === 'Wrestler') newWrestler = wrestler;
            return;
        }

        if (trimmedLine.toLowerCase().startsWith('manager:')) {
            const managerName = trimmedLine.substring(8).trim();
            if (managerName.toLowerCase() !== 'none') {
                const manager = state.cardTitleCache[managerName];
                if (manager && manager.card_type === 'Manager') newManager = manager;
            }
            return;
        }

        if (trimmedLine.startsWith('--- Starting Deck')) { currentSection = 'starting'; return; }
        if (trimmedLine.startsWith('--- Purchase Deck')) { currentSection = 'purchase'; return; }

        const match = trimmedLine.match(/^(\d+)x\s+(.+)/);
        if (!match) return;

        const count = parseInt(match[1], 10);
        const cardName = match[2].trim();
        if (!state.cardTitleCache[cardName]) return;

        if (currentSection === 'starting') addCopies(newStartingDeck, cardName, count);
        else if (currentSection === 'purchase') addCopies(newPurchaseDeck, cardName, count);
    });

    return { newWrestler, newManager, newStartingDeck, newPurchaseDeck };
}

/* ============================================================================
   Lackey text (.txt) parser
   ============================================================================ */

function parseLackeyTextDeck(lines) {
    // Expected layout:
    // 1) main list BEFORE "Purchase_Deck:"  -> starting deck (non-persona)
    // 2) After "Purchase_Deck:"            -> purchase deck
    // 3) After "Starting:"                 -> persona + kit cards (kit ignored), then "Tokens:"
    // 4) After "Tokens:"                   -> tokens list (ignored)
    let section = 'main';

    let newWrestler = null;
    let newManager = null;
    let newStartingDeck = [];
    let newPurchaseDeck = [];

    for (const raw of lines) {
        const line = String(raw || '').trim();
        if (!line) continue;

        // Skip comments
        if (line.startsWith('#') || line.startsWith('//')) continue;

        // Section markers
        if (/^purchase_deck\s*:/i.test(line)) { section = 'purchase'; continue; }
        if (/^starting\s*:/i.test(line)) { section = 'starting'; continue; }
        if (/^tokens\s*:/i.test(line)) { section = 'tokens'; continue; }

        // Tokens section is informational only
        if (section === 'tokens') continue;

        // Under Starting: we also accept "Adam Copeland Wrestler" WITHOUT a leading count,
        // because Lackey users sometimes hand-edit these lines.
        let count = 1;
        let title = line;

        const parsed = parseCountAndTitle(line);
        if (parsed) {
            count = parsed.count;
            title = parsed.title;
        } else {
            // If we're not in the Starting section and there's no count, it's not a deck line.
            if (section !== 'starting') continue;
        }

        if (section === 'starting') {
            const { baseTitle, role } = stripPersonaSuffix(title);
            title = baseTitle;

            const card = state.cardTitleCache[title];
            if (!card) continue;

            // Ignore kit cards on import (app derives them from persona)
            if (typeof state.isKitCard === 'function' && state.isKitCard(card)) continue;

            // Prefer explicit suffix; else fallback to card_type
            if (role === 'Wrestler' || card.card_type === 'Wrestler') {
                newWrestler = card;
                continue;
            }
            if (role === 'Manager' || card.card_type === 'Manager') {
                newManager = card;
                continue;
            }

            // Anything else under Starting: ignore
            continue;
        }

        if (section === 'main') {
            const card = state.cardTitleCache[title];
            if (!card) continue;
            if (card.card_type === 'Wrestler' || card.card_type === 'Manager') continue;
            addCopies(newStartingDeck, title, count);
            continue;
        }

        if (section === 'purchase') {
            const card = state.cardTitleCache[title];
            if (!card) continue;
            if (card.card_type === 'Wrestler' || card.card_type === 'Manager') continue;
            addCopies(newPurchaseDeck, title, count);
            continue;
        }
    }

    return { newWrestler, newManager, newStartingDeck, newPurchaseDeck };
}

/* ============================================================================
   XML .dek parser (Cockatrice-style)
   ============================================================================ */

function parseXmlDek(text) {
    let xml;
    try {
        xml = new DOMParser().parseFromString(String(text || ''), 'text/xml');
    } catch (e) {
        throw new Error('Could not parse .dek XML.');
    }

    // Helper to extract card names from a given superzone
    function getNames(superzoneName) {
        const zone = xml.querySelector(`superzone[name="${CSS.escape(superzoneName)}"]`);
        if (!zone) return [];
        const names = [];
        zone.querySelectorAll('card > name').forEach(n => {
            const v = (n.textContent || '').trim();
            if (v) names.push(v);
        });
        return names;
    }

    const deckNames = getNames('Deck'); // starting (non-persona)
    const purchaseNames = getNames('Purchase_Deck');
    const startingNames = getNames('Starting'); // persona + kit (usually)
    // Tokens zone intentionally ignored

    // Count duplicates
    function toCounts(names) {
        const counts = new Map();
        names.forEach(n => counts.set(n, (counts.get(n) || 0) + 1));
        return counts;
    }

    const newStartingDeck = [];
    const newPurchaseDeck = [];

    const deckCounts = toCounts(deckNames);
    for (const [title, count] of deckCounts.entries()) {
        const card = state.cardTitleCache[title];
        if (!card) continue;
        if (card.card_type === 'Wrestler' || card.card_type === 'Manager') continue;
        addCopies(newStartingDeck, title, count);
    }

    const purchaseCounts = toCounts(purchaseNames);
    for (const [title, count] of purchaseCounts.entries()) {
        const card = state.cardTitleCache[title];
        if (!card) continue;
        if (card.card_type === 'Wrestler' || card.card_type === 'Manager') continue;
        addCopies(newPurchaseDeck, title, count);
    }

    // Persona detection from Starting superzone:
    // Prefer card_type if known. If unknown, fall back to first as wrestler, second as manager.
    let newWrestler = null;
    let newManager = null;

    const startingUnique = Array.from(new Set(startingNames));
    const unknownPersona = [];

    for (const title of startingUnique) {
        const card = state.cardTitleCache[title];
        if (!card) {
            unknownPersona.push(title);
            continue;
        }

        if (typeof state.isKitCard === 'function' && state.isKitCard(card)) continue;

        if (card.card_type === 'Wrestler') newWrestler = card;
        else if (card.card_type === 'Manager') newManager = card;
        else unknownPersona.push(title);
    }

    // Fallback heuristic if wrestler isn't identified but we have items
    if (!newWrestler && unknownPersona.length) {
        const maybe = state.cardTitleCache[unknownPersona[0]];
        if (maybe) newWrestler = maybe; // best effort
    }
    if (!newManager && unknownPersona.length > 1) {
        const maybe = state.cardTitleCache[unknownPersona[1]];
        if (maybe) newManager = maybe;
    }

    return { newWrestler, newManager, newStartingDeck, newPurchaseDeck };
}

/* ============================================================================
   Public API
   ============================================================================ */

export function parseAndLoadDeck(text) {
    const importStatus = document.getElementById('importStatus');
    const importModal = document.getElementById('importModal');
    const wrestlerSelect = document.getElementById('wrestlerSelect');
    const managerSelect = document.getElementById('managerSelect');

    try {
        const raw = String(text || '');
        const lines = raw.trim().split(/\r?\n/);

        let parsed;
        if (isLikelyXmlDek(raw)) parsed = parseXmlDek(raw);
        else if (isLikelyLackeyText(lines)) parsed = parseLackeyTextDeck(lines);
        else parsed = parsePlainTextDeck(lines);

        state.setSelectedWrestler(parsed.newWrestler);
        state.setSelectedManager(parsed.newManager);

        wrestlerSelect.value = parsed.newWrestler ? parsed.newWrestler.title : "";
        managerSelect.value = parsed.newManager ? parsed.newManager.title : "";

        state.setStartingDeck(parsed.newStartingDeck);
        state.setPurchaseDeck(parsed.newPurchaseDeck);

        renderDecks();
        renderPersonaDisplay();
        document.dispatchEvent(new Event('filtersChanged'));

        importStatus.textContent = 'Deck imported successfully!';
        importStatus.style.color = 'green';
        setTimeout(() => { importModal.style.display = 'none'; }, 1500);
    } catch (error) {
        console.error('Error parsing decklist:', error);
        importStatus.textContent = `An unexpected error occurred: ${error.message}`;
        importStatus.style.color = 'red';
    }
}
