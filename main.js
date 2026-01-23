// main.js
import { loadGameData } from './data-loader.js';
import { initializeApp } from './app-init.js';

console.log('JSZip available:', typeof window.JSZip !== 'undefined');
console.log('html2canvas available:', typeof window.html2canvas !== 'undefined');

async function startApp() {
  try {
    console.log('Starting app...');
    
    const ok = await loadGameData();

    if (!ok) {
      console.error('Game data failed to load');
      const searchResults = document.getElementById('searchResults');
      if (searchResults) {
        searchResults.innerHTML = '<div style="color:red; padding:20px;">Failed to load card data. Check console for errors.</div>';
      }
      return;
    }

    console.log('Initializing app...');
    initializeApp();

    // Optional: keep your test export hook
    window.testExport = async () => {
      console.log('Test export button clicked');
      const { exportAllCardsAsImages } = await import('./master-export.js');
      await exportAllCardsAsImages();
    };

  } catch (err) {
    console.error('Fatal startup error:', err);
    const searchResults = document.getElementById('searchResults');
    if (searchResults) {
      searchResults.innerHTML = `<div style="color:red; padding:20px;">Fatal error: ${err.message}</div>`;
    }
  }
}

// Start the app when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', startApp);
} else {
  startApp();
}
