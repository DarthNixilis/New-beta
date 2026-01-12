// filters.js
import * as state from './config.js';

// --- FILTER & SORT LOGIC ---

const filterFunctions = {
    'Card Type': (card, value) => {
        if (value === 'Maneuver') {
            return ['Strike', 'Grapple', 'Submission'].includes(card.card_type);
        }
        return card.card_type === value;
    },

    'Keyword': (card, value) =>
        card.text_box?.keywords?.some(k => k.name.trim() === value),

    'Trait': (card, value) =>
        card.text_box?.traits?.some(t => t.name.trim() === value),

    // ✅ NEW: Target filter (matches trait.value, not name)
    'Target': (card, value) =>
        card.text_box?.traits?.some(
            t => t.name === 'Target' && String(t.value).trim() === value
        )
};

function getAvailableFilterOptions(cards) {
    const options = {
        'Card Type': new Set(),
        'Keyword': new Set(),
        'Trait': new Set(),
        'Target': new Set()
    };

    cards.forEach(card => {
        if (!card) return;

        if (card.card_type) {
            options['Card Type'].add(card.card_type);
        }

        card.text_box?.keywords?.forEach(k => {
            if (k?.name) options['Keyword'].add(k.name.trim());
        });

        card.text_box?.traits?.forEach(t => {
            if (!t?.name) return;

            if (t.name === 'Target' && t.value) {
                options['Target'].add(String(t.value).trim());
            } else {
                options['Trait'].add(t.name.trim());
            }
        });
    });

    const sortedTypes = Array.from(options['Card Type']).sort();
    if (sortedTypes.some(t => ['Strike', 'Grapple', 'Submission'].includes(t))) {
        sortedTypes.unshift('Maneuver');
    }

    return {
        'Card Type': sortedTypes,
        'Keyword': Array.from(options['Keyword']).sort(),
        'Trait': Array.from(options['Trait']).sort(),
        'Target': Array.from(options['Target']).sort()
    };
}

export function renderCascadingFilters() {
    const container = document.getElementById('cascadingFiltersContainer');
    container.innerHTML = '';

    const availableOptions = getAvailableFilterOptions(state.cardDatabase);
    const categories = ['Card Type', 'Keyword', 'Trait', 'Target'];

    categories.forEach((category, index) => {
        const select = document.createElement('select');
        select.innerHTML = `<option value="">-- Select ${category} --</option>`;

        availableOptions[category].forEach(opt => {
            select.add(new Option(opt, opt));
        });

        select.value = state.activeFilters[index]?.value || '';

        select.onchange = e => {
            const newFilters = [...state.activeFilters];
            newFilters[index] = { category, value: e.target.value };

            // Clear downstream filters
            for (let j = index + 1; j < categories.length; j++) {
                newFilters[j] = {};
            }

            state.setActiveFilters(newFilters);
            renderCascadingFilters();
            document.dispatchEvent(new Event('filtersChanged'));
        };

        container.appendChild(select);
    });
}

function applyAllFilters(cards) {
    let filtered = [...cards];

    state.activeFilters.forEach(filter => {
        if (!filter || !filter.value) return;
        const fn = filterFunctions[filter.category];
        if (fn) filtered = filtered.filter(card => fn(card, filter.value));
    });

    return filtered;
}

function applySort(cards) {
    const [sortBy, direction] = state.currentSort.split('-');

    return cards.sort((a, b) => {
        let valA, valB;

        switch (sortBy) {
            case 'alpha':
                valA = a.title.toLowerCase();
                valB = b.title.toLowerCase();
                break;
            case 'cost':
                valA = a.cost ?? -1;
                valB = b.cost ?? -1;
                break;
            case 'damage':
                valA = a.damage ?? -1;
                valB = b.damage ?? -1;
                break;
            case 'momentum':
                valA = a.momentum ?? -1;
                valB = b.momentum ?? -1;
                break;
            default:
                return 0;
        }

        return direction === 'asc'
            ? valA > valB ? 1 : -1
            : valA < valB ? 1 : -1;
    });
}

export function getFilteredAndSortedCardPool() {
    const searchInput = document.getElementById('searchInput');
    const query = searchInput.value.toLowerCase();

    let cards = state.cardDatabase.filter(card => {
        if (!card || !card.title) return false;

        // Exclude personas & kits from pool
        if (
            card.card_type === 'Wrestler' ||
            card.card_type === 'Manager' ||
            isKitCard(card)
        ) return false;

        if (!state.showZeroCost && card.cost === 0) return false;
        if (!state.showNonZeroCost && card.cost > 0) return false;

        const rawText = card.text_box?.raw_text || '';
        return (
            query === '' ||
            card.title.toLowerCase().includes(query) ||
            rawText.toLowerCase().includes(query)
        );
    });

    cards = applyAllFilters(cards);
    return applySort(cards);
}

// Local helper
function isKitCard(card) {
    return (
        card &&
        typeof card['Wrestler Kit'] === 'string' &&
        card['Wrestler Kit'].toUpperCase() === 'TRUE'
    );
}
