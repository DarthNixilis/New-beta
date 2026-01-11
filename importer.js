// importer.js
import * as state from './config.js';
import { renderDecks, renderPersonaDisplay } from './ui.js';

/* ============================================================================
   Format detection
   ============================================================================ */

function isLikelyLackeyDeck(lines) {
    // Your Lackey export includes section headers like Purchase_Deck:, Starting:, Tokens:
    // and uses tab-separated quantity lines "3\tCard Name"
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
    // Your new Lackey export uses:
    // "Kenny Omega Wrestler"
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
   Plain text parser (your existing format, unchanged behavior)
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

        for (let i = 0; i < count; i++) {
            if (currentSection === 'starting') newStartingDeck.push(cardName);
            else if (currentSection === 'purchase') newPurchaseDeck.push(cardName);
        }
    });

    return { newWrestler, newManager, newStartingDeck, newPurchaseDeck };
}

/* ============================================================================
   Lackey .dek parser (new)
   ============================================================================ */

function parseLackeyDeck(lines) {
    // Your Lackey exporter layout:
    // 1) Main list BEFORE "Purchase_Deck:"  -> starting deck (non-persona)
    // 2) After "Purchase_Deck:"            -> purchase deck
    // 3) After "Starting:"                 -> persona + kit cards (kit ignored), and then "Tokens:"
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

        // Only parse count/title lines
        const parsed = parseCountAndTitle(line);
        if (!parsed) continue;

        const count = parsed.count;
        let title = parsed.title;

        if (section === 'tokens') {
            // Informational only
            continue;
        }

        if (section === 'starting') {
            // Persona/Kits live here in your export
            const { baseTitle, role } = stripPersonaSuffix(title);
            title = baseTitle;

            const card = state.cardTitleCache[title];
            if (!card) continue;

            // Ignore kit cards on import (your app derives them from persona)
            if (typeof state.isKitCard === 'function' && state.isKitCard(card)) continue;

            // Prefer explicit suffix, otherwise fall back to card_type
            if (role === 'Wrestler' || card.card_type === 'Wrestler') {
                newWrestler = card;
                continue;
            }
            if (role === 'Manager' || card.card_type === 'Manager') {
                newManager = card;
                continue;
            }

            // Anything else under Starting: is ignored (by design)
            continue;
        }

        // Main list == starting deck (non-persona)
        if (section === 'main') {
            const card = state.cardTitleCache[title];
            if (!card) continue;

            // Avoid accidentally importing persona cards into the starting deck
            if (card.card_type === 'Wrestler' || card.card_type === 'Manager') continue;

            addCopies(newStartingDeck, title, count);
            continue;
        }

        if (section === 'purchase') {
            const card = state.cardTitleCache[title];
            if (!card) continue;

            // Avoid accidentally importing persona cards into purchase deck
            if (card.card_type === 'Wrestler' || card.card_type === 'Manager') continue;

            addCopies(newPurchaseDeck, title, count);
            continue;
        }
    }

    return { newWrestler, newManager, newStartingDeck, newPurchaseDeck };
}

/* ============================================================================
   Public API (used by paste + import button)
   ============================================================================ */

export function parseAndLoadDeck(text) {
    const importStatus = document.getElementById('importStatus');
    const importModal = document.getElementById('importModal');
    const wrestlerSelect = document.getElementById('wrestlerSelect');
    const managerSelect = document.getElementById('managerSelect');

    try {
        const lines = String(text || '').trim().split(/\r?\n/);

        const parsed = isLikelyLackeyDeck(lines)
            ? parseLackeyDeck(lines)
            : parsePlainTextDeck(lines);

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
