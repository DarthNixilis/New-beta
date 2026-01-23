// main.js - STABLE VERSION (waits for DOM + no dynamic import)

import { loadGameData } from './data-loader.js';
import { initializeApp, refreshCardPool } from './app-init.js';
import { initializeAllEventListeners } from './listeners.js';

// Check if dependencies are loaded
console.log("JSZip available:", typeof window.JSZip !== 'undefined');
console.log("html2canvas available:", typeof window.html2canvas !== 'undefined');

async function startApp() {
    const dataLoaded = await loadGameData();
    if (!dataLoaded) return;

    initializeApp();

    // Bind listeners using a stable function reference
    initializeAllEventListeners(refreshCardPool);

    // Optional debug hook
    window.testExport = async () => {
        console.log("Test export button clicked");
        const { exportAllCardsAsImages } = await import('./master-export.js');
        await exportAllCardsAsImages();
    };

    // One extra sanity refresh
    refreshCardPool();
}

// HARD guarantee the DOM is ready before we start
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => startApp());
} else {
    startApp();
}
