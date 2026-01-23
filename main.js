// main.js - UPDATED VERSION
import { loadGameData } from './data-loader.js';
import { initializeApp } from './app-init.js';
import { initializeAllEventListeners } from './listeners.js';

// Check if dependencies are loaded
console.log("JSZip available:", typeof window.JSZip !== 'undefined');
console.log("html2canvas available:", typeof html2canvas !== 'undefined');

async function startApp() {
    const dataLoaded = await loadGameData();
    if (dataLoaded) {
        // First, initialize the app UI
        initializeApp();
        
        // Then, initialize all event listeners
        initializeAllEventListeners(() => {
            // This is the refreshCardPool callback
            import('./app-init.js').then(module => {
                if (module.refreshCardPool) {
                    module.refreshCardPool();
                }
            });
        });
        
        // Test that exports are available
        window.testExport = async () => {
            console.log("Test export button clicked");
            const { exportAllCardsAsImages } = await import('./master-export.js');
            await exportAllCardsAsImages();
        };
    }
}

// Start the app immediately
startApp();
