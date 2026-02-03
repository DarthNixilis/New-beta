// master-export.js

// Note: This file only contains export functions, no initialization code
// This prevents it from breaking the app during startup

// Import dependencies only when needed (lazy loading)
async function getDependencies() {
    return {
        state: await import('./config.js')
    };
}

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
        
        // Lazy load dependencies
        const { state } = await getDependencies();
        const { generateCardVisualHTMLForExport, applyLackeyTextAutoSizing } = await import('./card-renderer-export.js');
        
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
            await exportAsZip(cardsToExport, imageWidth, imageHeight, scale, naming, imageSize, state, generateCardVisualHTMLForExport, applyLackeyTextAutoSizing);
        } else {
            await exportAsIndividual(cardsToExport, imageWidth, imageHeight, scale, naming, imageSize, state, generateCardVisualHTMLForExport, applyLackeyTextAutoSizing);
        }
        
        return true;
        
    } catch (error) {
        console.error("Export failed:", error);
        updateProgressUI(0, 0, `Error: ${error.message}`, true);
        throw error;
    }
}

// Export as ZIP file with set-based folder structure
async function exportAsZip(cards, width, height, scale, naming, imageSize, state, generateCardVisualHTMLForExport, applyLackeyTextAutoSizing) {
    if (typeof JSZip === 'undefined') {
        throw new Error('JSZip library not loaded. Please refresh the page.');
    }
    
    const zip = new JSZip();
    const rootFolder = zip.folder("setimages");
    
    // Group cards by set
    const cardsBySet = {};
    cards.forEach(card => {
        const set = card.set || 'Unknown';
        if (!cardsBySet[set]) {
            cardsBySet[set] = [];
        }
        cardsBySet[set].push(card);
    });
    
    let exportedCount = 0;
    const totalCards = cards.length;
    
    // Process each set separately
    const setNames = Object.keys(cardsBySet);
    console.log(`Organizing ${totalCards} cards into ${setNames.length} sets:`, setNames);
    
    for (const setName of setNames) {
        const setCards = cardsBySet[setName];
        const safeSetName = sanitizeFolderName(setName);
        
        // Create folder for this set
        const setFolder = rootFolder.folder(safeSetName);
        
        console.log(`Processing set "${setName}" (${setCards.length} cards) into folder "${safeSetName}"`);
        
        // Process cards in batches to avoid memory issues
        const batchSize = 5;
        
        for (let i = 0; i < setCards.length; i += batchSize) {
            const batch = setCards.slice(i, i + batchSize);
            
            const batchPromises = batch.map(async (card) => {
                try {
                    const blob = await generateCardImage(card, width, height, scale, imageSize, state, generateCardVisualHTMLForExport, applyLackeyTextAutoSizing);
                    
                    // Generate filename based on naming convention
                    const fileName = generateFileName(card.title, naming, state);
                    setFolder.file(fileName, blob);
                    
                    exportedCount++;
                    updateProgressUI(exportedCount, totalCards, `Exported: ${card.title} (${setName})`);
                    
                    return true;
                } catch (error) {
                    console.error(`Failed to export card: ${card.title}`, error);
                    updateProgressUI(exportedCount, totalCards, `Failed: ${card.title}`, false);
                    return false;
                }
            });
            
            await Promise.all(batchPromises);
        }
    }
    
    // Generate zip file
    updateProgressUI(totalCards, totalCards, 'Creating ZIP file...');
    const content = await zip.generateAsync({ 
        type: 'blob',
        compression: 'DEFLATE',
        compressionOptions: { level: 6 }
    });
    
    // Download
    const a = document.createElement('a');
    a.href = URL.createObjectURL(content);
    a.download = `AEW_Cards_by_Set_${new Date().toISOString().slice(0,10)}.zip`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(a.href);
    
    updateProgressUI(totalCards, totalCards, `Export complete! ${exportedCount} cards exported into ${setNames.length} set folders. Download started.`, true);
    
    // Auto-close modal after 3 seconds
    setTimeout(() => {
        const exportModal = document.getElementById('exportModal');
        if (exportModal) {
            exportModal.style.display = 'none';
        }
        // Reset progress bar
        const progressBar = document.getElementById('exportProgressBar');
        if (progressBar) {
            progressBar.style.width = '0%';
            progressBar.style.background = '#4CAF50';
        }
    }, 3000);
}

// Export as individual files
async function exportAsIndividual(cards, width, height, scale, naming, imageSize, state, generateCardVisualHTMLForExport, applyLackeyTextAutoSizing) {
    let exportedCount = 0;
    const totalCards = cards.length;
    
    for (const card of cards) {
        try {
            updateProgressUI(exportedCount, totalCards, `Exporting: ${card.title}`);
            
            const blob = await generateCardImage(card, width, height, scale, imageSize, state, generateCardVisualHTMLForExport, applyLackeyTextAutoSizing);
            
            // Generate filename
            const fileName = generateFileName(card.title, naming, state);
            
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
    
    // Auto-close modal after 3 seconds
    setTimeout(() => {
        const exportModal = document.getElementById('exportModal');
        if (exportModal) {
            exportModal.style.display = 'none';
        }
        // Reset progress bar
        const progressBar = document.getElementById('exportProgressBar');
        if (progressBar) {
            progressBar.style.width = '0%';
            progressBar.style.background = '#4CAF50';
        }
    }, 3000);
}

// Generate card image
async function generateCardImage(card, width, height, scale, imageSize, state, generateCardVisualHTMLForExport, applyLackeyTextAutoSizing) {
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
    
    // Use special renderer for export
    cardContainer.innerHTML = generateCardVisualHTMLForExport(card, {
        width: width,
        height: height,
        size: imageSize
    });
    
    document.body.appendChild(cardContainer);
    
    // Wait for DOM to render
    await new Promise(resolve => setTimeout(resolve, 50));
    
    // Apply auto-sizing for Lackey cards
    if (imageSize === 'lackey') {
        applyLackeyTextAutoSizing(cardContainer);
        // Wait a bit more for reflow
        await new Promise(resolve => setTimeout(resolve, 50));
    }
    
    // Generate image
    const canvas = await html2canvas(cardContainer, {
        scale: 1,
        width: width * scale,
        height: height * scale,
        backgroundColor: null,
        logging: false,
        useCORS: true,
        allowTaint: true
    });
    
    // Convert to blob
    const blob = await new Promise((resolve, reject) => {
        canvas.toBlob((blob) => {
            if (blob) {
                resolve(blob);
            } else {
                reject(new Error('Failed to create blob from canvas'));
            }
        }, 'image/png', 1.0);
    });
    
    // Clean up
    document.body.removeChild(cardContainer);
    
    return blob;
}

// Helper function to generate filename
function generateFileName(cardTitle, naming, state) {
    switch(naming) {
        case 'pascal':
            return `${state.toPascalCase(cardTitle)}.png`;
        case 'lackey':
            // Remove special characters and spaces for LackeyCCG format
            return `${cardTitle.replace(/[^\w\s]/g, '').replace(/\s+/g, '')}.png`;
        case 'original':
        default:
            // Remove invalid characters for filenames
            const cleanName = cardTitle.replace(/[<>:"/\\|?*]/g, '');
            return `${cleanName}.png`;
    }
}

// Helper function to sanitize folder names
function sanitizeFolderName(name) {
    if (!name) return 'Unknown';
    // Remove invalid characters for folder names
    return name.replace(/[<>:"/\\|?*]/g, '_').trim();
}

// Helper function to wait for images to load
function waitForImages(container) {
    return new Promise((resolve) => {
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
        
        // Fallback timeout
        setTimeout(resolve, 2000);
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
            // Re-enable buttons
            const startExportBtn = document.getElementById('startExport');
            const cancelExportBtn = document.getElementById('cancelExport');
            if (startExportBtn) startExportBtn.disabled = false;
            if (cancelExportBtn) cancelExportBtn.disabled = false;
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

// TSV Database Export for LackeyCCG format - EXPORT SEPARATE FILES FOR EACH SET
export async function exportAllCardsAsTSV() {
    try {
        console.log("Starting TSV export for LackeyCCG...");
        
        // Lazy load dependencies
        const { state } = await getDependencies();
        
        // Get all unique sets from the card database
        const allSets = new Set();
        state.cardDatabase.forEach(card => {
            if (card.set) {
                allSets.add(card.set);
            }
        });
        
        console.log("Found sets:", Array.from(allSets));
        
        // Export each set as a separate TSV file (with .txt extension)
        for (const set of allSets) {
            await exportSetAsTSV(set, state);
        }
        
        console.log("TSV export completed successfully for all sets");
        alert(`TSV database exported successfully! ${allSets.size} set file(s) downloaded.`);
        return true;
        
    } catch (error) {
        console.error("TSV export failed:", error);
        alert(`TSV export failed: ${error.message}`);
        throw error;
    }
}

// Helper function to export a single set as TSV (with .txt extension)
async function exportSetAsTSV(setName, state) {
    console.log(`Exporting TSV for set: ${setName}`);
    
    // Filter cards for this set
    const setCards = state.cardDatabase.filter(card => card.set === setName);
    
    if (setCards.length === 0) {
        console.warn(`No cards found for set: ${setName}`);
        return;
    }
    
    // Create TSV content with exact LackeyCCG headers
    const headers = ['Name', 'Sets', 'ImageFile', 'Cost', 'Damage', 'Momentum', 'Type', 'Target', 'Traits', 'Wrestler Logo', 'Game Text'];
    let tsvContent = headers.join('\t') + '\n';
    
    // Helper to clean text for TSV
    const cleanForTSV = (text) => {
        if (!text) return '';
        // Replace tabs with spaces, newlines with spaces, and remove any extra whitespace
        return text.replace(/\t/g, ' ').replace(/\n/g, ' ').replace(/\r/g, ' ').trim();
    };
    
    // Add all cards in this set
    setCards.forEach(card => {
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
        
        // Get target - FIXED: Check both text_box.traits AND the Target field from TSV
        let target = '';
        
        // First check text_box.traits
        if (card.text_box?.traits) {
            const targetTrait = card.text_box.traits.find(t => t.name && t.name.trim() === 'Target');
            if (targetTrait && targetTrait.value) {
                target = targetTrait.value;
            }
        }
        
        // If not found in traits, check the card's Target field (from TSV column)
        if (!target && card['Target'] && card['Target'].trim() !== '') {
            target = card['Target'].trim();
        }
        
        // Clean game text
        const gameText = cleanForTSV(card.text_box?.raw_text || '');
        
        // Build the row exactly like your example
        // IMPORTANT: The "Sets" column should contain the actual set name (Core/Advanced) not just "AEW"
        const row = [
            card.title || '',                          // Name
            card.set || 'AEW',                         // Sets - FIXED: Use actual set name
            imageFile,                                 // ImageFile (PascalCase.png)
            costValue !== null ? costValue : '',       // Cost
            damageValue !== null ? damageValue : '',   // Damage
            momentumValue !== null ? momentumValue : '', // Momentum
            card.card_type || '',                      // Type
            target,                                    // Target - FIXED
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
    
    // Use the set name for the filename with .txt extension (e.g., "Core.txt", "Advanced.txt")
    const safeSetName = sanitizeFolderName(setName);
    a.download = `${safeSetName}.txt`;  // CHANGED: .txt instead of .tsv
    
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(a.href);
    
    console.log(`Exported ${setCards.length} cards for set: ${setName} as ${safeSetName}.txt`);
}

// Alternative: Export all sets as a ZIP file containing separate TSV files (as .txt)
export async function exportAllCardsAsTSVZip() {
    try {
        console.log("Starting TSV ZIP export for LackeyCCG...");
        
        // Lazy load dependencies
        const { state } = await getDependencies();
        
        if (typeof JSZip === 'undefined') {
            throw new Error('JSZip library not loaded. Please refresh the page.');
        }
        
        // Get all unique sets from the card database
        const allSets = new Set();
        state.cardDatabase.forEach(card => {
            if (card.set) {
                allSets.add(card.set);
            }
        });
        
        console.log("Found sets:", Array.from(allSets));
        
        const zip = new JSZip();
        
        // Add each set as a separate TSV file to the ZIP (with .txt extension)
        for (const set of allSets) {
            const setCards = state.cardDatabase.filter(card => card.set === set);
            
            if (setCards.length === 0) continue;
            
            // Create TSV content for this set
            const tsvContent = generateTSVContentForSet(setCards, state);
            
            // Use the set name for the filename with .txt extension (e.g., "Core.txt", "Advanced.txt")
            const safeSetName = sanitizeFolderName(set);
            zip.file(`${safeSetName}.txt`, tsvContent);  // CHANGED: .txt instead of .tsv
            
            console.log(`Added ${setCards.length} cards for set: ${set} to ZIP as ${safeSetName}.txt`);
        }
        
        // Generate zip file
        const content = await zip.generateAsync({ 
            type: 'blob',
            compression: 'DEFLATE',
            compressionOptions: { level: 6 }
        });
        
        // Download
        const a = document.createElement('a');
        a.href = URL.createObjectURL(content);
        a.download = `AEW_Card_Database_Sets_${new Date().toISOString().slice(0,10)}.zip`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(a.href);
        
        console.log("TSV ZIP export completed successfully");
        alert(`TSV database exported successfully! ZIP file with ${allSets.size} set file(s) downloaded.`);
        return true;
        
    } catch (error) {
        console.error("TSV ZIP export failed:", error);
        alert(`TSV ZIP export failed: ${error.message}`);
        throw error;
    }
}

// Helper function to generate TSV content for a specific set
function generateTSVContentForSet(setCards, state) {
    // Create TSV content with exact LackeyCCG headers
    const headers = ['Name', 'Sets', 'ImageFile', 'Cost', 'Damage', 'Momentum', 'Type', 'Target', 'Traits', 'Wrestler Logo', 'Game Text'];
    let tsvContent = headers.join('\t') + '\n';
    
    // Helper to clean text for TSV
    const cleanForTSV = (text) => {
        if (!text) return '';
        // Replace tabs with spaces, newlines with spaces, and remove any extra whitespace
        return text.replace(/\t/g, ' ').replace(/\n/g, ' ').replace(/\r/g, ' ').trim();
    };
    
    // Add all cards in this set
    setCards.forEach(card => {
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
        
        // Get target - FIXED: Check both text_box.traits AND the Target field from TSV
        let target = '';
        
        // First check text_box.traits
        if (card.text_box?.traits) {
            const targetTrait = card.text_box.traits.find(t => t.name && t.name.trim() === 'Target');
            if (targetTrait && targetTrait.value) {
                target = targetTrait.value;
            }
        }
        
        // If not found in traits, check the card's Target field (from TSV column)
        if (!target && card['Target'] && card['Target'].trim() !== '') {
            target = card['Target'].trim();
        }
        
        // Clean game text
        const gameText = cleanForTSV(card.text_box?.raw_text || '');
        
        // Build the row exactly like your example
        // IMPORTANT: The "Sets" column should contain the actual set name (Core/Advanced) not just "AEW"
        const row = [
            card.title || '',                          // Name
            card.set || 'AEW',                         // Sets - FIXED: Use actual set name
            imageFile,                                 // ImageFile (PascalCase.png)
            costValue !== null ? costValue : '',       // Cost
            damageValue !== null ? damageValue : '',   // Damage
            momentumValue !== null ? momentumValue : '', // Momentum
            card.card_type || '',                      // Type
            target,                                    // Target - FIXED
            traits,                                    // Traits
            wrestlerLogo,                              // Wrestler Logo
            gameText                                   // Game Text
        ];
        
        tsvContent += row.join('\t') + '\n';
    });
    
    return tsvContent;
}
