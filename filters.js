// filters.js
import * as state from './config.js';

/* ============================================================================
   FILTER FUNCTIONS
   ============================================================================ */

const filterFunctions = {
    'Card Type': (card, value) => {
        if (!value) return true;
        if (value === 'Maneuver') {
            return ['Strike', 'Grapple', 'Submission'].includes(card.card_type);
        }
        return card.card_type === value;
    },

    'Keyword': (card, value) => {
        if (!value) return true;
        const kws = (card.text_box && card.text_box.keywords) ? card.text_box.keywords : [];
        for (const k of kws) {
            if (!k || !k.name) continue;
            if (k.name.trim() === value) return true;
        }
        return false;
    },

    'Trait': (card, value) => {
        if (!value) return true;
        const traits = (card.text_box && card.text_box.traits) ? card.text_box.traits : [];
        for (const t of traits) {
            if (!t || !t.name) continue;
            if (t.name.trim() === value) return true;
        }
        return false;
    },

    // Target is stored as a trait { name: "Target", value: "H" }
    'Target': (card, value) => {
        if (!value) return true;
        const traits = (card.text_box && card.text_box.traits) ? card.text_box.traits : [];
        for (const t of traits) {
            if (!t || !t.name) continue;
            if (t.name.trim() !== 'Target') continue;
            if (String(t.value || '').trim() === value) return true;
        }
        return false;
    }
};

/* ============================================================================
   OPTIONS DISCOVERY
   ============================================================================ */

function getAvailableFilterOptions(cards) {
    const typeSet = new Set();
    const keywordSet = new Set();
    const traitSet = new Set();
    const targetSet = new Set();

    for (const card of cards) {
        if (!card) continue;

        if (card.card_type) {
            typeSet.add(card.card_type);
        }

        const kws = (card.text_box && card.text_box.keywords) ? card.text_box.keywords : [];
        for (const k of kws) {
            if (!k || !k.name) continue;
            keywordSet.add(k.name.trim());
        }

        const traits = (card.text_box && card.text_box.traits) ? card.text_box.traits : [];
        for (const t of traits) {
            if (!t || !t.name) continue;

            const tn = t.name.trim();
            if (tn === 'Target') {
                const tv = String(t.value || '').trim();
                if (tv) targetSet.add(tv);
            } else {
                traitSet.add(tn);
            }
        }
    }

    const cardTypes = Array.from(typeSet).sort((a, b) => a.localeCompare(b));

    // Add synthetic group "Maneuver" if maneuver subtypes exist
    const hasManeuverTypes = cardTypes.some(t => ['Strike', 'Grapple', 'Submission'].includes(t));
    if (hasManeuverTypes) {
        cardTypes.unshift('Maneuver');
    }

    return {
        'Card Type': Array.from(new Set(cardTypes)),
        'Keyword': Array.from(keywordSet).filter(Boolean).sort((a, b) => a.localeCompare(b)),
        'Trait': Array.from(traitSet).filter(Boolean).sort((a, b) => a.localeCompare(b)),
        'Target': Array.from(targetSet).filter(Boolean).sort((a, b) => a.localeCompare(b)),
    };
}

/* ============================================================================
   CASCADING FILTER UI
   ============================================================================ */

export function renderCascadingFilters() {
    const container = document.getElementById('cascadingFiltersContainer');
    if (!container) return;

    const categories = ['Card Type', 'Keyword', 'Trait', 'Target'];

    // Ensure we have enough filter slots in state
    const existing = Array.isArray(state.activeFilters) ? state.activeFilters : [];
    const next = [];
    for (let i = 0; i < categories.length; i++) {
        next[i] = existing[i] ? existing[i] : {};
    }
    state.setActiveFilters(next);

    const optionsByCategory = getAvailableFilterOptions(state.cardDatabase || []);

    container.innerHTML = '';

    for (let i = 0; i < categories.length; i++) {
        const category = categories[i];

        const select = document.createElement('select');

        const placeholder = document.createElement('option');
        placeholder.value = '';
        placeholder.textContent = '-- Select ' + category + ' --';
        select.appendChild(placeholder);

        const options = optionsByCategory[category] || [];
        for (const opt of options) {
            const o = document.createElement('option');
            o.value = opt;
            o.textContent = opt;
            select.appendChild(o);
        }

        // Restore selection
        const saved = state.activeFilters[i];
        if (saved && saved.category === category && saved.value) {
            select.value = saved.value;
        } else {
            select.value = '';
        }

        select.addEventListener('change', (e) => {
            const value = e.target.value;

            const filters = [...state.activeFilters];
            filters[i] = { category, value };

            // Clear downstream filters
            for (let j = i + 1; j < categories.length; j++) {
                filters[j] = {};
            }

            state.setActiveFilters(filters);
            renderCascadingFilters();
            document.dispatchEvent(new Event('filtersChanged'));
        });

        container.appendChild(select);
    }
}

/* ============================================================================
   APPLY FILTERS + SORT
   ============================================================================ */

function applyAllFilters(cards) {
    let result = [...cards];

    for (const f of (state.activeFilters || [])) {
        if (!f || !f.category || !f.value) continue;
        const fn = filterFunctions[f.category];
        if (!fn) continue;
        result = result.filter(card => fn(card, f.value));
    }

    return result;
}

function applySort(cards) {
    const sort = state.currentSort || 'alpha-asc';
    const parts = sort.split('-');
    const sortBy = parts[0] || 'alpha';
    const direction = parts[1] || 'asc';

    const copy = [...cards];

    const num = (x) => {
        if (x === null || x === undefined || x === 'N/a') return -999999;
        const n = Number(x);
        return Number.isFinite(n) ? n : -999999;
    };

    copy.sort((a, b) => {
        let valA;
        let valB;

        switch (sortBy) {
            case 'cost':
                valA = num(a.cost);
                valB = num(b.cost);
                break;
            case 'damage':
                valA = num(a.damage);
                valB = num(b.damage);
                break;
            case 'momentum':
                valA = num(a.momentum);
                valB = num(b.momentum);
                break;
            case 'alpha':
            default:
                valA = (a.title || '').toLowerCase();
                valB = (b.title || '').toLowerCase();
                break;
        }

        if (valA === valB) return (a.title || '').localeCompare(b.title || '');

        if (direction === 'asc') return valA > valB ? 1 : -1;
        return valA < valB ? 1 : -1;
    });

    return copy;
}

function isKitCard(card) {
    return (
        card &&
        typeof card['Wrestler Kit'] === 'string' &&
        card['Wrestler Kit'].toUpperCase() === 'TRUE'
    );
}

export function getFilteredAndSortedCardPool() {
    const searchInput = document.getElementById('searchInput');
    const query = (searchInput && searchInput.value) ? searchInput.value.toLowerCase() : '';

    // Base pool filtering (permissive)
    let cards = (state.cardDatabase || []).filter(card => {
        if (!card || !card.title) return false;

        // Exclude personas and kits from pool
        if (card.card_type === 'Wrestler') return false;
        if (card.card_type === 'Manager') return false;
        if (card.card_type === 'Call Name') return false;
        if (card.card_type === 'Faction') return false;
        if (isKitCard(card)) return false;

        // Cost toggles
        if (!state.showZeroCost && card.cost === 0) return false;
        if (!state.showNonZeroCost && typeof card.cost === 'number' && card.cost > 0) return false;

        // Search
        if (!query) return true;
        const rawText = (card.text_box && card.text_box.raw_text) ? String(card.text_box.raw_text).toLowerCase() : '';
        return card.title.toLowerCase().includes(query) || rawText.includes(query);
    });

    cards = applyAllFilters(cards);
    cards = applySort(cards);
    return cards;
}
