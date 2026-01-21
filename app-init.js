// app-init.js
import { initializeAllEventListeners } from './listeners.js';
import { renderCardPool } from './card-renderer.js';
import { restoreStateFromCache } from './deck.js';

export function initializeApp() {
  initializeAllEventListeners();
  restoreStateFromCache();
  renderCardPool();
}
