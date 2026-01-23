// master-export.js
import * as state from './config.js';
import { generateCardVisualHTML } from './card-renderer.js';

export async function exportAllCardsAsImages() {
    try {
        console.log("Starting export of all cards...");
        
        // Check if JSZip is available
        if (typeof JSZip === 'undefined') {
            throw new Error('JSZip library not loaded. Please refresh the page.');
        }
        
        const zip = new JSZip();
        const folder = zip.folder("AEW_Cards");
        
        let exportedCount = 0;
        const totalCards = state.cardDatabase.length;
        
        // Create a progress indicator
        const exportStatus = document.createElement('div');
        exportStatus.style.cssText = `
            position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%);
            background: white; padding: 20px; border: 2px solid #333; border-radius: 10px;
            z-index: 10000; text-align: center; box-shadow: 0 0 20px rgba(0,0,0,0.5);
        `;
        exportStatus.innerHTML = `<h3>Exporting Cards...</h3><div id="exportProgress">0/${totalCards}</div>`;
        document.body.appendChild(exportStatus);
        
        // Process cards in batches to avoid memory issues
        const batchSize = 10;
        
        for (let i = 0; i < totalCards; i += batchSize) {
            const batch = state.cardDatabase.slice(i, i + batchSize);
            
            const batchPromises = batch.map(async (card) => {
                try {
                    // Create card container
                    const cardContainer = document.createElement('div');
                    cardContainer.className = 'card-modal-view';
                    cardContainer.style.cssText = `
                        width: 400px;
                        height: 600px;
                        position: absolute;
                        left: -10000px;
                        top: -10000px;
                        background: white;
                    `;
                    cardContainer.innerHTML = generateCardVisualHTML(card);
                    
                    document.body.appendChild(cardContainer);
                    
                    // Wait for images to load
                    await new Promise(resolve => {
                        const images = cardContainer.getElementsByTagName('img');
                        let loadedCount = 0;
                        const totalImages = images.length;
                        
                        if (totalImages === 0) {
                            resolve();
                            return;
                        }
                        
                        for (let img of images) {
                            if (img.complete) {
                                loadedCount++;
                                if (loadedCount === totalImages) resolve();
                            } else {
                                img.onload = () => {
                                    loadedCount++;
                                    if (loadedCount === totalImages) resolve();
                                };
                                img.onerror = () => {
                                    loadedCount++;
                                    if (loadedCount === totalImages) resolve();
                                };
                            }
                        }
                    });
                    
                    // Generate image
                    const canvas = await html2canvas(cardContainer, {
                        scale: 2,
                        backgroundColor: null,
                        logging: false,
                        useCORS: true
                    });
                    
                    // Convert to blob
                    const blob = await new Promise(resolve => {
                        canvas.toBlob(resolve, 'image/png', 1.0);
                    });
                    
                    // Clean up
                    document.body.removeChild(cardContainer);
                    
                    // Add to zip
                    const fileName = `${state.toPascalCase(card.title)}.png`;
                    folder.file(fileName, blob);
                    
                    exportedCount++;
                    document.getElementById('exportProgress').textContent = 
                        `${exportedCount}/${totalCards}`;
                    
                    return true;
                } catch (error) {
                    console.error(`Failed to export card: ${card.title}`, error);
                    return false;
                }
            });
            
            await Promise.all(batchPromises);
        }
        
        // Generate zip file
        const content = await zip.generateAsync({ type: 'blob' });
        
        // Clean up progress indicator
        document.body.removeChild(exportStatus);
        
        // Download
        const a = document.createElement('a');
        a.href = URL.createObjectURL(content);
        a.download = `AEW_Cards_${new Date().toISOString().slice(0,10)}.zip`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(a.href);
        
        console.log(`Exported ${exportedCount} cards successfully.`);
        
    } catch (error) {
        console.error("Export failed:", error);
        alert(`Export failed: ${error.message}. Check console for details.`);
        throw error;
    }
}

// Fallback export function
export async function exportAllCardsAsImagesFallback() {
    try {
        console.log("Starting fallback export...");
        
        let exportedCount = 0;
        const totalCards = state.cardDatabase.length;
        
        // Process cards one by one
        for (const card of state.cardDatabase) {
            try {
                // Create card container
                const cardContainer = document.createElement('div');
                cardContainer.className = 'card-modal-view';
                cardContainer.style.cssText = `
                    width: 400px;
                    height: 600px;
                    position: absolute;
                    left: -10000px;
                    top: -10000px;
                    background: white;
                `;
                cardContainer.innerHTML = generateCardVisualHTML(card);
                
                document.body.appendChild(cardContainer);
                
                // Wait for images to load
                await new Promise(resolve => {
                    const images = cardContainer.getElementsByTagName('img');
                    let loadedCount = 0;
                    const totalImages = images.length;
                    
                    if (totalImages === 0) {
                        resolve();
                        return;
                    }
                    
                    for (let img of images) {
                        if (img.complete) {
                            loadedCount++;
                            if (loadedCount === totalImages) resolve();
                        } else {
                            img.onload = () => {
                                loadedCount++;
                                if (loadedCount === totalImages) resolve();
                            };
                            img.onerror = () => {
                                loadedCount++;
                                if (loadedCount === totalImages) resolve();
                            };
                        }
                    }
                });
                
                // Generate image
                const canvas = await html2canvas(cardContainer, {
                    scale: 2,
                    backgroundColor: null,
                    logging: false,
                    useCORS: true
                });
                
                // Convert to data URL and download
                const dataUrl = canvas.toDataURL('image/png');
                const a = document.createElement('a');
                a.href = dataUrl;
                a.download = `${state.toPascalCase(card.title)}.png`;
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                
                // Clean up
                document.body.removeChild(cardContainer);
                
                exportedCount++;
                console.log(`Exported ${exportedCount}/${totalCards}: ${card.title}`);
                
                // Small delay to prevent browser issues
                await new Promise(resolve => setTimeout(resolve, 100));
                
            } catch (error) {
                console.error(`Failed to export card: ${card.title}`, error);
            }
        }
        
        console.log(`Fallback export completed: ${exportedCount}/${totalCards} cards`);
        alert(`Fallback export completed: ${exportedCount} cards downloaded individually.`);
        
    } catch (error) {
        console.error("Fallback export failed:", error);
        alert(`Fallback export failed: ${error.message}`);
    }
}
