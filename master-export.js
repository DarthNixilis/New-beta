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
        height = 600,
        filterSets = null, // NEW: filter by sets
        filterTypes = null  // NEW: filter by card types
    } = options;
    
    try {
        console.log("Starting export with options:", options);
        
        // Lazy load dependencies
        const { state } = await getDependencies();
        const { generateCardVisualHTMLForExport, applyLackeyTextAutoSizing } = await import('./card-renderer-export.js');
        
        // Filter cards based on type
        let cardsToExport = state.cardDatabase;
        
        // Apply card type filter
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
        
        // Apply additional filters if provided
        if (filterSets && filterSets.length > 0) {
            cardsToExport = cardsToExport.filter(card => 
                filterSets.includes(card.set)
            );
        }
        
        if (filterTypes && filterTypes.length > 0) {
            cardsToExport = cardsToExport.filter(card => 
                filterTypes.includes(card.card_type)
            );
        }
        
        if (cardsToExport.length === 0) {
            throw new Error(`No cards found to export.`);
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
async function exportSetAsTSV(setName, state, setCards = null) {
    console.log(`Exporting TSV for set: ${setName}`);
    
    // Use provided cards or filter from database
    const cards = setCards || state.cardDatabase.filter(card => card.set === setName);
    
    if (cards.length === 0) {
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
    cards.forEach(card => {
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
    
    // Use the set name for the filename with Set.txt extension (e.g., "CoreSet.txt", "AdvancedSet.txt")
    const safeSetName = sanitizeFolderName(setName);
    a.download = `${safeSetName}Set.txt`;  // CHANGED: Set.txt pattern
    
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(a.href);
    
    console.log(`Exported ${cards.length} cards for set: ${setName} as ${safeSetName}Set.txt`);
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
        
        // Add each set as a separate TSV file to the ZIP (with Set.txt extension)
        for (const set of allSets) {
            const setCards = state.cardDatabase.filter(card => card.set === set);
            
            if (setCards.length === 0) continue;
            
            // Create TSV content for this set
            const tsvContent = generateTSVContentForSet(setCards, state);
            
            // Use the set name for the filename with Set.txt extension (e.g., "CoreSet.txt", "AdvancedSet.txt")
            const safeSetName = sanitizeFolderName(set);
            zip.file(`${safeSetName}Set.txt`, tsvContent);  // CHANGED: Set.txt pattern
            
            console.log(`Added ${setCards.length} cards for set: ${set} to ZIP as ${safeSetName}Set.txt`);
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

// NEW: Modal export function with checkboxes
export async function showExportModal() {
    // Lazy load state
    const { state } = await getDependencies();
    
    // Create modal if it doesn't exist
    if (!document.getElementById('exportModal')) {
        createExportModal(state);
    }
    
    // Get all unique card types
    const cardTypes = [...new Set(state.cardDatabase.map(card => card.card_type))].sort();
    
    // Get available sets from state
    const availableSets = state.availableSets || ['Core', 'Advanced']; // Fallback
    
    // Populate checkboxes
    populateTypeCheckboxes(cardTypes);
    populateSetCheckboxes(availableSets);
    
    // Show modal
    document.getElementById('exportModal').style.display = 'flex';
}

function createExportModal(state) {
    // Check if modal already exists
    if (document.getElementById('exportModal')) return;
    
    const modalHTML = `
    <div id="exportModal" class="modal-backdrop" style="display: none;">
        <div class="modal-content" style="max-width: 800px; max-height: 90vh; overflow-y: auto;">
            <span class="modal-close-button">&times;</span>
            <h3>Export Database</h3>
            
            <div class="export-options-container">
                <!-- Card Type Selection -->
                <div class="export-section">
                    <h4>Card Types to Export</h4>
                    <div class="type-selection-header">
                        <label style="display: flex; align-items: center; gap: 8px;">
                            <input type="checkbox" id="selectAllTypes" checked> Select All Types
                        </label>
                    </div>
                    <div class="export-type-grid" id="cardTypeCheckboxes" style="
                        display: grid;
                        grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
                        gap: 10px;
                        margin-top: 15px;
                    ">
                        <!-- Will be populated dynamically -->
                    </div>
                </div>
                
                <!-- Set Selection -->
                <div class="export-section">
                    <h4>Sets to Export</h4>
                    <div class="set-selection-header">
                        <label style="display: flex; align-items: center; gap: 8px;">
                            <input type="checkbox" id="selectAllSets" checked> Select All Sets
                        </label>
                    </div>
                    <div class="export-set-grid" id="setCheckboxes" style="
                        display: grid;
                        grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
                        gap: 10px;
                        margin-top: 15px;
                    ">
                        <!-- Will be populated dynamically -->
                    </div>
                </div>
                
                <!-- Export Format -->
                <div class="export-section">
                    <h4>Export Format</h4>
                    <div class="export-format-options" style="
                        display: flex;
                        flex-direction: column;
                        gap: 10px;
                    ">
                        <label style="display: flex; align-items: center; gap: 8px;">
                            <input type="radio" name="exportFormat" value="tsv" checked> TSV Database File (.txt)
                        </label>
                        <label style="display: flex; align-items: center; gap: 8px;">
                            <input type="radio" name="exportFormat" value="tsv-zip"> ZIP with TSV Files
                        </label>
                        <label style="display: flex; align-items: center; gap: 8px;">
                            <input type="radio" name="exportFormat" value="images-zip"> ZIP with Card Images
                        </label>
                        <label style="display: flex; align-items: center; gap: 8px;">
                            <input type="radio" name="exportFormat" value="images-individual"> Individual Card Images
                        </label>
                    </div>
                </div>
                
                <!-- Image Options (only shown for image exports) -->
                <div id="imageOptions" class="export-section" style="display: none;">
                    <h4>Image Options</h4>
                    <div class="export-size-options" style="display: flex; flex-direction: column; gap: 10px;">
                        <label style="display: flex; align-items: center; gap: 8px;">
                            <input type="radio" name="exportSize" value="standard" checked> Standard MTG Size (744x1039px)
                        </label>
                        <label style="display: flex; align-items: center; gap: 8px;">
                            <input type="radio" name="exportSize" value="lackey"> LackeyCCG Size (214x308px)
                        </label>
                        <label style="display: flex; align-items: center; gap: 8px;">
                            <input type="radio" name="exportSize" value="custom"> Custom Size:
                            <input type="number" id="customWidth" placeholder="Width" value="400" min="100" max="2000" style="width: 80px; margin-left: 10px;">
                            x
                            <input type="number" id="customHeight" placeholder="Height" value="600" min="100" max="2000" style="width: 80px;">
                            px
                        </label>
                    </div>
                    <div class="export-name-options" style="margin-top: 15px;">
                        <label style="display: flex; align-items: center; gap: 8px;">
                            File Naming:
                            <select id="imageNaming" style="margin-left: 10px; padding: 5px;">
                                <option value="pascal">PascalCase (OneWingedAngel.jpg)</option>
                                <option value="original">Original Name (One Winged Angel.jpg)</option>
                                <option value="lackey">LackeyCCG Format (OneWingedAngel.jpg)</option>
                            </select>
                        </label>
                    </div>
                </div>
                
                <!-- Progress Bar -->
                <div id="exportProgress" style="display: none; margin-top: 20px; padding: 10px; background: #f5f5f5; border-radius: 4px;">
                    <div style="display: flex; justify-content: space-between; margin-bottom: 5px;">
                        <span id="exportProgressText">Preparing export...</span>
                        <span id="exportProgressPercent">0%</span>
                    </div>
                    <div style="width: 100%; height: 20px; background: #ddd; border-radius: 10px; overflow: hidden;">
                        <div id="exportProgressBar" style="width: 0%; height: 100%; background: #4CAF50; transition: width 0.3s;"></div>
                    </div>
                    <div id="exportStatus" style="margin-top: 10px; font-size: 12px; color: #666;"></div>
                </div>
                
                <!-- Actions -->
                <div class="export-actions" style="display: flex; justify-content: flex-end; gap: 10px; margin-top: 20px;">
                    <button id="cancelExport" class="btn-secondary" style="
                        background: #95a5a6;
                        color: white;
                        border: none;
                        padding: 10px 20px;
                        border-radius: 4px;
                        cursor: pointer;
                    ">Cancel</button>
                    <button id="startExport" class="btn-primary" style="
                        background: #3498db;
                        color: white;
                        border: none;
                        padding: 10px 20px;
                        border-radius: 4px;
                        cursor: pointer;
                        font-weight: bold;
                    ">Start Export</button>
                </div>
            </div>
        </div>
    </div>`;
    
    document.body.insertAdjacentHTML('beforeend', modalHTML);
    
    // Add event listeners
    setTimeout(() => {
        const modal = document.getElementById('exportModal');
        const closeBtn = modal.querySelector('.modal-close-button');
        const cancelBtn = document.getElementById('cancelExport');
        const startBtn = document.getElementById('startExport');
        const formatRadios = document.querySelectorAll('input[name="exportFormat"]');
        const selectAllTypes = document.getElementById('selectAllTypes');
        const selectAllSets = document.getElementById('selectAllSets');
        
        // Close modal
        closeBtn.onclick = () => modal.style.display = 'none';
        cancelBtn.onclick = () => modal.style.display = 'none';
        modal.onclick = (e) => { if (e.target === modal) modal.style.display = 'none'; };
        
        // Show/hide image options
        formatRadios.forEach(radio => {
            radio.onchange = (e) => {
                const imageOptions = document.getElementById('imageOptions');
                const isImageExport = e.target.value.includes('image');
                imageOptions.style.display = isImageExport ? 'block' : 'none';
            };
        });
        
        // Select all types
        selectAllTypes.onchange = (e) => {
            const checkboxes = document.querySelectorAll('#cardTypeCheckboxes input[type="checkbox"]');
            checkboxes.forEach(cb => cb.checked = e.target.checked);
        };
        
        // Select all sets
        selectAllSets.onchange = (e) => {
            const checkboxes = document.querySelectorAll('#setCheckboxes input[type="checkbox"]');
            checkboxes.forEach(cb => cb.checked = e.target.checked);
        };
        
        // Start export
        startBtn.onclick = startExport;
    }, 100);
}

function populateTypeCheckboxes(cardTypes) {
    const container = document.getElementById('cardTypeCheckboxes');
    if (!container) return;
    
    container.innerHTML = '';
    
    cardTypes.forEach(type => {
        if (!type) return;
        
        const label = document.createElement('label');
        label.className = 'type-checkbox-label';
        label.style.cssText = `
            display: flex;
            align-items: center;
            padding: 10px;
            background: white;
            border-radius: 4px;
            cursor: pointer;
            transition: background 0.2s;
            border: 1px solid #e0e0e0;
        `;
        
        label.innerHTML = `
            <input type="checkbox" value="${type}" checked style="margin-right: 8px;"> ${type}
        `;
        
        container.appendChild(label);
    });
}

function populateSetCheckboxes(sets) {
    const container = document.getElementById('setCheckboxes');
    if (!container) return;
    
    container.innerHTML = '';
    
    sets.forEach(set => {
        const label = document.createElement('label');
        label.className = 'set-checkbox-label';
        label.style.cssText = `
            display: flex;
            align-items: center;
            padding: 10px;
            background: white;
            border-radius: 4px;
            cursor: pointer;
            transition: background 0.2s;
            border: 1px solid #e0e0e0;
        `;
        
        label.innerHTML = `
            <input type="checkbox" value="${set}" checked style="margin-right: 8px;"> ${set}
        `;
        
        container.appendChild(label);
    });
}

async function startExport() {
    // Get selected card types
    const typeCheckboxes = document.querySelectorAll('#cardTypeCheckboxes input[type="checkbox"]:checked');
    const selectedTypes = Array.from(typeCheckboxes).map(cb => cb.value);
    
    // Get selected sets
    const setCheckboxes = document.querySelectorAll('#setCheckboxes input[type="checkbox"]:checked');
    const selectedSets = Array.from(setCheckboxes).map(cb => cb.value);
    
    // Get export format
    const format = document.querySelector('input[name="exportFormat"]:checked').value;
    
    // Show progress
    const progress = document.getElementById('exportProgress');
    progress.style.display = 'block';
    const startBtn = document.getElementById('startExport');
    const cancelBtn = document.getElementById('cancelExport');
    startBtn.disabled = true;
    cancelBtn.disabled = true;
    
    try {
        // Import state
        const { state } = await getDependencies();
        
        // Filter cards by selected types and sets
        const filteredCards = state.cardDatabase.filter(card => {
            const typeMatch = selectedTypes.includes(card.card_type);
            const setMatch = selectedSets.includes(card.set);
            return typeMatch && setMatch;
        });
        
        if (filteredCards.length === 0) {
            throw new Error('No cards match the selected criteria.');
        }
        
        // Update progress
        updateProgressUI(0, filteredCards.length, `Found ${filteredCards.length} cards to export...`);
        
        switch(format) {
            case 'tsv':
                // Export selected sets as TSV
                for (const setName of selectedSets) {
                    await exportSingleSetAsTSV(setName);
                }
                break;
            case 'tsv-zip':
                // Export all sets as ZIP
                await exportAllCardsAsTSVZip();
                break;
            case 'images-zip':
                const imageSize = document.querySelector('input[name="exportSize"]:checked').value;
                const naming = document.getElementById('imageNaming').value;
                
                await exportCardsWithOptions({
                    cardType: 'all', // Already filtered
                    imageSize: imageSize,
                    format: 'zip',
                    naming: naming,
                    filterSets: selectedSets,
                    filterTypes: selectedTypes
                });
                break;
            case 'images-individual':
                const imageSize2 = document.querySelector('input[name="exportSize"]:checked').value;
                const naming2 = document.getElementById('imageNaming').value;
                
                await exportCardsWithOptions({
                    cardType: 'all', // Already filtered
                    imageSize: imageSize2,
                    format: 'individual',
                    naming: naming2,
                    filterSets: selectedSets,
                    filterTypes: selectedTypes
                });
                break;
        }
        
        updateProgressUI(filteredCards.length, filteredCards.length, 'Export complete!', true);
        
        // Auto-close after 3 seconds
        setTimeout(() => {
            document.getElementById('exportModal').style.display = 'none';
            progress.style.display = 'none';
            startBtn.disabled = false;
            cancelBtn.disabled = false;
        }, 3000);
        
    } catch (error) {
        console.error("Export failed:", error);
        updateProgressUI(0, 0, `Error: ${error.message}`, true);
        startBtn.disabled = false;
        cancelBtn.disabled = false;
    }
}

// Helper function to export a single set as TSV
async function exportSingleSetAsTSV(setName) {
    const { state } = await getDependencies();
    
    // Filter cards for this set
    const setCards = state.cardDatabase.filter(card => card.set === setName);
    
    if (setCards.length === 0) {
        console.warn(`No cards found for set: ${setName}`);
        return;
    }
    
    await exportSetAsTSV(setName, state, setCards);
}
