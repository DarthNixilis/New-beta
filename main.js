// main.js
import { loadGameData } from './data-loader.js';
import { initializeApp } from './app-init.js';

console.log('JSZip available:', typeof window.JSZip !== 'undefined');
console.log('html2canvas available:', typeof window.html2canvas !== 'undefined');

async function startApp() {
  try {
    const ok = await loadGameData();

    if (!ok) {
      console.warn('Game data failed to load, app initialization skipped.');
      return;
    }

    initializeApp();

    // Optional: keep your test export hook
    window.testExport = async () => {
      console.log('Test export button clicked');
      const { exportAllCardsAsImages } = await import('./master-export.js');
      await exportAllCardsAsImages();
    };

  } catch (err) {
    console.error('Fatal startup error:', err);
  }
}

window.addEventListener('DOMContentLoaded', startApp);
