// main.js - FIXED VERSION (no dynamic import for refreshCardPool)

import { loadGameData } from './data-loader.js';
import { initializeApp, refreshCardPool } from './app-init.js';
import { initializeAllEventListeners } from './listeners.js';

// Check if dependencies are loaded
console.log("JSZip available:", typeof window.JSZip !== 'undefined');
console.log("html2canvas available:", typeof html2canvas !== 'undefined');

async function startApp() {
    const dataLoaded = await loadGameData();
    if (!dataLoaded) return;

    // Initialize UI first (builds selectors, loads cache, renders first pool)
    initializeApp();

    // Bind all listeners with a stable refresh function reference
    initializeAllEventListeners(refreshCardPool);

    // Optional: dev test hook
    window.testExport = async () => {
        console.log("Test export button clicked");
        const { exportAllCardsAsImages } = await import('./master-export.js');
        await exportAllCardsAsImages();
    };
}

// Start the app immediately
startApp();
