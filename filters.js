// filters.js
import * as state from './config.js';

/* ============================================================================
   FILTER TYPES
   ============================================================================ */

const FILTER_TYPES = ['None', 'Card Type', 'Keyword', 'Trait', 'Target'];

const filterFunctions = {
    'Card Type': (card, value) => {
        if (!value || value === 'None') return true;
        if (value === 'Maneuver') return ['Strike', 'Grapple', 'Submission'].includes(card.card_type);
        return card.card_type === value;
    },
    'Keyword': (card, value) => {
        if (!value || value === 'None') return true;
        return card.text_box?.keywords?.some(k => (k?.name || '').trim() === value);
    },
    'Trait': (card, value) => {
        if (!value || value === 'None') return true;
        // Trait filter matches trait NAME (like "Punch", "Weapon", etc.)
        // Target is handled by its own filter type to avoid confusion.
        return card.text_box?.traits?.some(t => (t?.name || '').trim() === value);
    },
    'Target': (card, value) => {
        if (!value || value === 'None') return true;
        // Target is stored as a trait: { name: "Target", value: "H" }
        return card.text_box?.traits?.some(t =>
            (t?.name || '').trim() === 'Target' &&
            String(t?.value || '').trim() === value
        );
    }
};

/* ============================================================================
   HELPERS
   ============================================================================ */

function isKitCard(card) {
    return state.isKitCard ? state.isKitCard(card) :
        (card && typeof card['Wrestler Kit'] === 'string' && card['Wrestler Kit'].toUpperCase() === 'TRUE');
}

function getFilterState(index) {
    const f = state.activeFilters?.[index] || {};
    return {
        type: f.type || 'None',
        value: f.value || 'None'
    };
}

function setFilterState(index, next) {
    const cloned = (state.activeFilters || [{}, {}, {}]).map(x => ({ ...x }));
    cloned[index] = { type: next.type || 'None', value: next.value || 'None' };
    state.setActiveFilters(cloned);
}

function uniqueSorted(arr) {
    return Array.from(new Set(arr.filter(Boolean))).sort((a, b) => a.localeCompare(b));
}

/* ============================================================================
   OPTION DISCOVERY
   ============================================================================ */

function getAvailableFilterOptions(cards) {
    const types = new Set();
    const keywords = new Set();
    const traits = new Set();
    const targets = new Set();

    for (const card of cards) {
        if (!card) continue;

        // Card Types
        if (card.card_type) types.add(card.card_type);

        // Keywords (already normalized on card.text_box.keywords)
        for (const k of (card.text_box?.keywords || [])) {
            const name = (k?.name || '').trim();
            if (name) keywords.add(name);
        }

        // Traits
        for (const t of (card.text_box?.traits || [])) {
            const name = (t?.name || '').trim();
            if (!name) continue;

            if (name === 'Target') {
                const v = String(t?.value || '').trim();
                if (v) targets.add(v);
            } else {
                traits.add(name);
            }
        }
    }

    // Add a synthetic "Maneuver" option for Card Type
    const typeOptions = uniqueSorted(Array.from(types));
    if (typeOptions.length) {
        // Put Maneuver near the top (after None)
        typeOptions.unshift('Maneuver');
    }

    return {
        'Card Type': ['None', ...typeOptions],
        'Keyword': ['None', ...uniqueSorted(Array.from(keywords))],
        'Trait': ['None', ...uniqueSorted(Array.from(traits))],
        'Target': ['None', ...uniqueSorted(Array.from(targets))]
    };
}

/* ============================================================================
   APPLY FILTERS + SORT
   ============================================================================ */

function applyAllFilters(cards) {
    const filters = state.activeFilters || [{}, {}, {}];

    return cards.filter(card => {
        for (const f of filters) {
            const type = f?.type || 'None';
            const value = f?.value || 'None';
            if (type === 'None' || value === 'None') continue;

            const fn = filterFunctions[type];
            if (fn && !fn(card, value)) return false;
        }
        return true;
    });
}

function applySort(cards) {
    const sort = state.currentSort || 'alpha-asc';
    const copy = [...cards];

    const num = (x) => {
        if (x === null || x === undefined || x === 'N/a') return -Infinity;
        const n = Number(x);
        return Number.isFinite(n) ? n : -Infinity;
    };

    switch (sort) {
        case 'alpha-asc':
            copy.sort((a, b) => a.title.localeCompare(b.title));
            break;
        case 'alpha-desc':
            copy.sort((a, b) => b.title.localeCompare(a.title));
            break;
        case 'cost-asc':
            copy.sort((a, b) => num(a.cost) - num(b.cost) || a.title.localeCompare(b.title));
            break;
        case 'cost-desc':
            copy.sort((a, b) => num(b.cost) - num(a.cost) || a.title.localeCompare(b.title));
            break;
        case 'damage-asc':
            copy.sort((a, b) => num(a.damage) - num(b.damage) || a.title.localeCompare(b.title));
            break;
        case 'damage-desc':
            copy.sort((a, b) => num(b.damage) - num(a.damage) || a.title.localeCompare(b.title));
            break;
        case 'momentum-asc':
            copy.sort((a, b) => num(a.momentum) - num(b.momentum) || a.title.localeCompare(b.title));
            break;
        case 'momentum-desc':
            copy.sort((a, b) => num(b.momentum) - num(a.momentum) || a.title.localeCompare(b.title));
            break;
        default:
            copy.sort((a, b) => a.title.localeCompare(b.title));
            break;
    }

    return copy;
}

export function getFilteredAndSortedCardPool() {
    const searchInput = document.getElementById('searchInput');
    const query = (searchInput?.value || '').trim().toLowerCase();

    const base = (state.cardDatabase || []).filter(card => {
        if (!card) return false;

        // Hide persona + kits from pool
        if (card.card_type === 'Wrestler' || card.card_type === 'Manager' || isKitCard(card)) return false;

        // Cost toggles
        if (!state.showZeroCost && card.cost === 0) return false;
        if (!state.showNonZeroCost && typeof card.cost === 'number' && card.cost > 0) return false;

        // Search by title or rules text
        const rawText = (card.text_box?.raw_text || '').toLowerCase();
        return !query || card.title.toLowerCase().includes(query) || rawText.includes(query);
    });

    return applySort(applyAllFilters(base));
}

/* ============================================================================
   CASCADING FILTER UI
   ============================================================================ */

function buildFilterRow(index, availableOptions) {
    const row = document.createElement('div');
    row.className = 'cascading-filter-row';

    const typeSelect = document.createElement('select');
    typeSelect.className = 'filter-type-select';

    FILTER_TYPES.forEach(t => {
        const opt = document.createElement('option');
        opt.value = t;
        opt.textContent = t;
        typeSelect.appendChild(opt);
    });

    const valueSelect = document.createElement('select');
    valueSelect.className = 'filter-value-select';

    const current = getFilterState(index);
    typeSelect.value = current.type;

    const populateValueSelect = (type) => {
        valueSelect.innerHTML = '';
        const opts = availableOptions[type] || ['None'];
        for (const v of opts) {
            const o = document.createElement('option');
            o.value = v;
            o.textContent = v;
            valueSelect.appendChild(o);
        }
        valueSelect.value = current.value && opts.includes(current.value) ? current.value : 'None';
    };

    populateValueSelect(current.type);

    typeSelect.onchange = () => {
        const type = typeSelect.value;
        setFilterState(index, { type, value: 'None' });
        renderCascadingFilters(); // refresh downstream options
        document.dispatchEvent(new Event('filtersChanged'));
    };

    valueSelect.onchange = () => {
        const type = typeSelect.value;
        const value = valueSelect.value;
        setFilterState(index, { type, value });
        document.dispatchEvent(new Event('filtersChanged'));
    };

    row.appendChild(typeSelect);
    row.appendChild(valueSelect);
    return row;
}

export function renderCascadingFilters() {
    const container = document.getElementById('cascadingFiltersContainer');
    if (!container) return;

    // Use the same base pool that the main filter function uses for options
    const base = (state.cardDatabase || []).filter(card => {
        if (!card) return false;
        if (card.card_type === 'Wrestler' || card.card_type === 'Manager' || isKitCard(card)) return false;
        return true;
    });

    const availableOptions = getAvailableFilterOptions(base);

    container.innerHTML = '';
    for (let i = 0; i < 3; i++) {
        container.appendChild(buildFilterRow(i, availableOptions));
    }
}
