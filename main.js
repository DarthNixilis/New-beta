// main.js
import { loadGameData } from './data-loader.js';
import { initializeApp } from './app-init.js';

function logDeps() {
  console.log("JSZip available:", typeof window.JSZip !== 'undefined');
  console.log("html2canvas available:", typeof window.html2canvas !== 'undefined');
}

async function startApp() {
  logDeps();

  const ok = await loadGameData();
  if (!ok) return;

  initializeApp();

  // Keep your test button working
  window.testExport = async () => {
    console.log("Test export button clicked");
    const { exportAllCardsAsImages } = await import('./master-export.js');
    await exportAllCardsAsImages();
  };
}

document.addEventListener('DOMContentLoaded', () => {
  startApp();
});
