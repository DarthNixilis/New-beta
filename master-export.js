// master-export.js
import * as state from './config.js';
import { generateCardVisualHTML } from './card-renderer.js';
import { generateCardVisualHTMLForExport } from './card-renderer-export.js'; // NEW IMPORT

// Main export function with options
export async function exportCardsWithOptions(options = {}) {
    const {
        cardType = 'all',
        imageSize = 'standard',
        format = 'zip',
        naming = 'pascal',
        width = 400,
        height = 600
    } = options;
    
    try {
        console.log("Starting export with options:", options);
        
        // Filter cards based on type
        let cardsToExport = state.cardDatabase;
        
        if (cardType !== 'all') {
            const typeMap = {
                'wrestlers': 'Wrestler',
                'managers': 'Manager',
                'actions': 'Action',
                'maneuvers': ['Strike', 'Grapple', 'Submission'],
                'responses': 'Response',
                'callnames': 'Call Name',
                'factions': 'Faction'
            };
            
            const targetType = typeMap[cardType];
            if (Array.isArray(targetType)) {
                cardsToExport = cardsToExport.filter(card => 
                    targetType.includes(card.card_type)
                );
            } else {
                cardsToExport = cardsToExport.filter(card => 
                    card.card_type === targetType
                );
            }
        }
        
        if (cardsToExport.length === 0) {
            throw new Error(`No ${cardType} cards found to export.`);
        }
        
        // Set image dimensions based on size option
        let imageWidth, imageHeight;
        switch(imageSize) {
            case 'standard':
                imageWidth = 744;
                imageHeight = 1039;
                break;
            case 'lackey':
                imageWidth = 214;
                imageHeight = 308;
                break;
            case 'custom':
                imageWidth = width;
                imageHeight = height;
                break;
            default:
                imageWidth = 400;
                imageHeight = 600;
        }
        
        // Set scale based on image size
        const scale = imageSize === 'lackey' ? 1 : 2;
        
        // Update progress UI
        updateProgressUI(0, cardsToExport.length, 'Preparing export...');
        
        if (format === 'zip') {
            await exportAsZip(cardsToExport, imageWidth, imageHeight, scale, naming, imageSize);
        } else {
            await exportAsIndividual(cardsToExport, imageWidth, imageHeight, scale, naming, imageSize);
        }
        
        return true;
        
    } catch (error) {
        console.error("Export failed:", error);
        updateProgressUI(0, 0, `Error: ${error.message}`, true);
        throw error;
    }
}

// Export as ZIP file
async function exportAsZip(cards, width, height, scale, naming, imageSize) {
    if (typeof JSZip === 'undefined') {
        throw new Error('JSZip library not loaded. Please refresh the page.');
    }
    
    const zip = new JSZip();
    const folder = zip.folder("AEW_Cards");
    
    let exportedCount = 0;
    const totalCards = cards.length;
    
    // Process cards in batches to avoid memory issues
    const batchSize = 5;
    
    for (let i = 0; i < totalCards; i += batchSize) {
        const batch = cards.slice(i, i + batchSize);
        
        const batchPromises = batch.map(async (card) => {
            try {
                const blob = await generateCardImage(card, width, height, scale, imageSize);
                
                // Generate filename based on naming convention
                const fileName = generateFileName(card.title, naming);
                folder.file(fileName, blob);
                
                exportedCount++;
                updateProgressUI(exportedCount, totalCards, `Exported: ${card.title}`);
                
                return true;
            } catch (error) {
                console.error(`Failed to export card: ${card.title}`, error);
                updateProgressUI(exportedCount, totalCards, `Failed: ${card.title}`, false);
                return false;
            }
        });
        
        await Promise.all(batchPromises);
    }
    
    // Generate zip file
    updateProgressUI(totalCards, totalCards, 'Creating ZIP file...');
    const content = await zip.generateAsync({ type: 'blob' });
    
    // Download
    const a = document.createElement('a');
    a.href = URL.createObjectURL(content);
    a.download = `AEW_${cards.length}_Cards_${new Date().toISOString().slice(0,10)}.zip`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(a.href);
    
    updateProgressUI(totalCards, totalCards, `Export complete! ${exportedCount} cards exported.`, true);
}

// Export as individual files
async function exportAsIndividual(cards, width, height, scale, naming, imageSize) {
    let exportedCount = 0;
    const totalCards = cards.length;
    
    for (const card of cards) {
        try {
            updateProgressUI(exportedCount, totalCards, `Exporting: ${card.title}`);
            
            const blob = await generateCardImage(card, width, height, scale, imageSize);
            
            // Generate filename
            const fileName = generateFileName(card.title, naming);
            
            // Create download link
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = fileName;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
            
            exportedCount++;
            updateProgressUI(exportedCount, totalCards, `Exported: ${card.title}`);
            
            // Small delay to prevent browser issues
            await new Promise(resolve => setTimeout(resolve, 100));
            
        } catch (error) {
            console.error(`Failed to export card: ${card.title}`, error);
            updateProgressUI(exportedCount, totalCards, `Failed: ${card.title}`, false);
        }
    }
    
    updateProgressUI(totalCards, totalCards, `Export complete! ${exportedCount}/${totalCards} cards exported.`, true);
}

// Generate card image
async function generateCardImage(card, width, height, scale, imageSize) {
    // Create card container
    const cardContainer = document.createElement('div');
    cardContainer.className = 'card-modal-view';
    cardContainer.style.cssText = `
        width: ${width}px;
        height: ${height}px;
        position: absolute;
        left: -10000px;
        top: -10000px;
        background: white;
        transform: scale(${scale});
        transform-origin: top left;
    `;
    
    // Use special renderer for export with larger text
    cardContainer.innerHTML = generateCardVisualHTMLForExport(card, {
        width: width,
        height: height,
        size: imageSize
    });
    
    document.body.appendChild(cardContainer);
    
    // Wait for images to load
    await waitForImages(cardContainer);
    
    // Generate image
    const canvas = await html2canvas(cardContainer, {
        scale: 1,
        width: width * scale,
        height: height * scale,
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
    
    return blob;
}

// Helper function to generate filename
function generateFileName(cardTitle, naming) {
    switch(naming) {
        case 'pascal':
            return `${state.toPascalCase(cardTitle)}.png`;
        case 'lackey':
            // Remove special characters and spaces for LackeyCCG format
            return `${cardTitle.replace(/[^\w\s]/g, '').replace(/\s+/g, '')}.png`;
        case 'original':
        default:
            return `${cardTitle}.png`;
    }
}

// Helper function to wait for images to load
function waitForImages(container) {
    return new Promise(resolve => {
        const images = container.getElementsByTagName('img');
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
}

// Update progress UI
function updateProgressUI(current, total, status, isComplete = false) {
    const progressBar = document.getElementById('exportProgressBar');
    const progressText = document.getElementById('exportProgressText');
    const progressPercent = document.getElementById('exportProgressPercent');
    const exportStatus = document.getElementById('exportStatus');
    
    if (progressBar && progressText && progressPercent && exportStatus) {
        const percent = total > 0 ? Math.round((current / total) * 100) : 0;
        
        progressBar.style.width = `${percent}%`;
        progressText.textContent = status;
        progressPercent.textContent = `${percent}%`;
        exportStatus.textContent = `${current}/${total} cards`;
        
        if (isComplete) {
            progressBar.style.background = '#2ecc71';
        }
    }
}

// Simple fallback export (for backward compatibility)
export async function exportAllCardsAsImages() {
    return exportCardsWithOptions({
        cardType: 'all',
        imageSize: 'standard',
        format: 'zip',
        naming: 'pascal'
    });
}

export async function exportAllCardsAsImagesFallback() {
    return exportCardsWithOptions({
        cardType: 'all',
        imageSize: 'standard',
        format: 'individual',
        naming: 'pascal'
    });
}

// TSV Database Export for LackeyCCG format
export async function exportAllCardsAsTSV() {
    try {
        console.log("Starting TSV export for LackeyCCG...");
        
        // Create TSV content with exact LackeyCCG headers
        const headers = ['Name', 'Sets', 'ImageFile', 'Cost', 'Damage', 'Momentum', 'Type', 'Target', 'Traits', 'Wrestler Logo', 'Game Text'];
        let tsvContent = headers.join('\t') + '\n';
        
        // Helper to clean text for TSV
        const cleanForTSV = (text) => {
            if (!text) return '';
            // Replace tabs with spaces, newlines with spaces, and remove any extra whitespace
            return text.replace(/\t/g, ' ').replace(/\n/g, ' ').replace(/\r/g, ' ').trim();
        };
        
        // Add all cards
        state.cardDatabase.forEach(card => {
            // Generate PascalCase image filename
            const imageFile = state.toPascalCase(card.title) + '.png';
            
            // Handle special cost values for personas
            let costValue = card.cost;
            let damageValue = card.damage;
            let momentumValue = card.momentum;
            
            // For persona cards (Wrestler, Manager, Call Name, Faction), use N/a for cost/damage
            if (['Wrestler', 'Manager', 'Call Name', 'Faction'].includes(card.card_type)) {
                costValue = 'N/a';
                damageValue = 'N/a';
                // For Call Names, check if momentum is null/undefined
                if (card.card_type === 'Call Name' && (momentumValue === null || momentumValue === undefined)) {
                    momentumValue = '';
                }
            }
            
            // Get wrestler logo from Starting column (kit cards)
            let wrestlerLogo = '';
            if (card['Starting'] && card['Starting'].trim() !== '') {
                wrestlerLogo = card['Starting'].trim();
            }
            
            // Get traits from text_box.traits or Traits column
            let traits = '';
            if (card.text_box?.traits && card.text_box.traits.length > 0) {
                traits = card.text_box.traits.map(t => 
                    t.value ? `${t.name}:${t.value}` : t.name
                ).join(',');
            } else if (card['Traits']) {
                traits = card['Traits'];
            }
            
            // Clean game text
            const gameText = cleanForTSV(card.text_box?.raw_text || '');
            
            // Build the row exactly like your example
            const row = [
                card.title || '',                          // Name
                'AEW',                                     // Sets (always AEW)
                imageFile,                                 // ImageFile (PascalCase.png)
                costValue !== null ? costValue : '',       // Cost
                damageValue !== null ? damageValue : '',   // Damage
                momentumValue !== null ? momentumValue : '', // Momentum
                card.card_type || '',                      // Type
                card.Target || '',                         // Target
                traits,                                    // Traits
                wrestlerLogo,                              // Wrestler Logo
                gameText                                   // Game Text
            ];
            
            tsvContent += row.join('\t') + '\n';
        });
        
        // Create and download file
        const blob = new Blob([tsvContent], { type: 'text/tab-separated-values' });
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = `AEW_Card_Database_Lackey_${new Date().toISOString().slice(0,10)}.tsv`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(a.href);
        
        console.log("TSV export completed successfully");
        alert('TSV database exported successfully! Ready for LackeyCCG import.');
        return true;
        
    } catch (error) {
        console.error("TSV export failed:", error);
        alert(`TSV export failed: ${error.message}`);
        throw error;
    }
}
