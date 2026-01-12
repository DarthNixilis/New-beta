// app-init.js
import * as state from './config.js';
import * as ui from './ui.js';
import * as filters from './filters.js';
import { initializeAllEventListeners } from './listeners.js';

export function initializeApp() {
  populatePersonaSelectors();
  loadStateFromCache();

  filters.renderCascadingFilters();
  ui.renderDecks();
  ui.renderPersonaDisplay();

  const refreshCardPool = () => {
    const cards = filters.getFilteredAndSortedCardPool();
    ui.renderCardPool(cards);
  };

  initializeAllEventListeners(refreshCardPool);
  refreshCardPool();
}

function populatePersonaSelectors() {
  const wrestlerSelect = document.getElementById('wrestlerSelect');
  const managerSelect = document.getElementById('managerSelect');
  const callNameSelect = document.getElementById('callNameSelect');
  const factionSelect = document.getElementById('factionSelect');

  if (!wrestlerSelect || !managerSelect || !callNameSelect || !factionSelect) return;

  // Keep first option, clear rest
  wrestlerSelect.length = 1;
  managerSelect.length = 1;
  callNameSelect.length = 1;
  factionSelect.length = 1;

  const byType = (type) =>
    (state.cardDatabase || [])
      .filter(c => c && c.card_type === type)
      .sort((a, b) => a.title.localeCompare(b.title));

  for (const c of byType('Wrestler')) wrestlerSelect.add(new Option(c.title, c.title));
  for (const c of byType('Manager')) managerSelect.add(new Option(c.title, c.title));
  for (const c of byType('Call Name')) callNameSelect.add(new Option(c.title, c.title));
  for (const c of byType('Faction')) factionSelect.add(new Option(c.title, c.title));

  wrestlerSelect.addEventListener('change', (e) => {
    const title = e.target.value;
    state.setSelectedWrestler(title ? state.getCardByTitleAndType(title, 'Wrestler') : null);
    ui.renderPersonaDisplay();
    state.saveStateToCache();
    document.dispatchEvent(new Event('filtersChanged'));
  });

  managerSelect.addEventListener('change', (e) => {
    const title = e.target.value;
    state.setSelectedManager(title ? state.getCardByTitleAndType(title, 'Manager') : null);
    ui.renderPersonaDisplay();
    state.saveStateToCache();
  });

  callNameSelect.addEventListener('change', (e) => {
    const title = e.target.value;
    state.setSelectedCallName(title ? state.getCardByTitleAndType(title, 'Call Name') : null);
    ui.renderPersonaDisplay();
    state.saveStateToCache();
  });

  factionSelect.addEventListener('change', (e) => {
    const title = e.target.value;
    state.setSelectedFaction(title ? state.getCardByTitleAndType(title, 'Faction') : null);
    ui.renderPersonaDisplay();
    state.saveStateToCache();
  });
}

function loadStateFromCache() {
  const raw = localStorage.getItem(state.CACHE_KEY);
  if (!raw) return;

  try {
    const parsed = JSON.parse(raw);

    state.setStartingDeck(parsed.startingDeck || []);
    state.setPurchaseDeck(parsed.purchaseDeck || []);

    const w = parsed.wrestler || '';
    const m = parsed.manager || '';
    const c = parsed.callName || '';
    const f = parsed.faction || '';

    if (w) state.setSelectedWrestler(state.getCardByTitleAndType(w, 'Wrestler'));
    if (m) state.setSelectedManager(state.getCardByTitleAndType(m, 'Manager'));
    if (c) state.setSelectedCallName(state.getCardByTitleAndType(c, 'Call Name'));
    if (f) state.setSelectedFaction(state.getCardByTitleAndType(f, 'Faction'));

    // Try to restore selects if they exist
    const wrestlerSelect = document.getElementById('wrestlerSelect');
    const managerSelect = document.getElementById('managerSelect');
    const callNameSelect = document.getElementById('callNameSelect');
    const factionSelect = document.getElementById('factionSelect');

    if (wrestlerSelect) wrestlerSelect.value = w;
    if (managerSelect) managerSelect.value = m;
    if (callNameSelect) callNameSelect.value = c;
    if (factionSelect) factionSelect.value = f;
  } catch {
    localStorage.removeItem(state.CACHE_KEY);
  }
}
