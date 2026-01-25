// master-export.js
// SIMPLE VERSION - Only fixes the export issue

// Import at module level (this should be safe)
import * as state from './config.js';
import { generateCardVisualHTMLForExport } from './card-renderer-export.js';

// Main export function - keeps the original working structure
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
        
        // Set image dimensions
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
        
        const scale = imageSize === 'lackey' ? 1 : 2;
        
        // Show progress
        showProgress(0, cardsToExport.length, 'Preparing export...');
        
        if (format === 'zip') {
            await exportAsZip(cardsToExport, imageWidth, imageHeight, scale, naming, imageSize);
        } else {
            await exportAsIndividual(cardsToExport, imageWidth, imageHeight, scale, naming, imageSize);
        }
        
        return true;
        
    } catch (error) {
        console.error("Export failed:", error);
        showProgress(0, 0, `Error: ${error.message}`, true);
        throw error;
    }
}

// ZIP export
async function exportAsZip(cards, width, height, scale, naming, imageSize) {
    if (typeof JSZip === 'undefined') {
        throw new Error('JSZip library not loaded.');
    }
    
    const zip = new JSZip();
    const folder = zip.folder("AEW_Cards");
    
    let exportedCount = 0;
    const totalCards = cards.length;
    
    // Process in smaller batches
    const batchSize = 3;
    
    for (let i = 0; i < totalCards; i += batchSize) {
        const batch = cards.slice(i, i + batchSize);
        
        for (const card of batch) {
            try {
                const blob = await createCardImage(card, width, height, scale, imageSize);
                const fileName = getFileName(card.title, naming);
                folder.file(fileName, blob);
                
                exportedCount++;
                showProgress(exportedCount, totalCards, `Processing: ${card.title}`);
                
            } catch (error) {
                console.error(`Failed to export card: ${card.title}`, error);
                showProgress(exportedCount, totalCards, `Failed: ${card.title}`, false);
            }
        }
    }
    
    // Create and download ZIP
    showProgress(totalCards, totalCards, 'Creating ZIP file...');
    const content = await zip.generateAsync({ type: 'blob' });
    
    const a = document.createElement('a');
    a.href = URL.createObjectURL(content);
    a.download = `AEW_Cards_${new Date().toISOString().slice(0,10)}.zip`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(a.href);
    
    showProgress(totalCards, totalCards, `Export complete! Downloaded ${exportedCount} cards.`, true);
    
    // Close modal after delay
    setTimeout(() => {
        const modal = document.getElementById('exportModal');
        if (modal) modal.style.display = 'none';
        resetProgress();
    }, 2000);
}

// Individual files export
async function exportAsIndividual(cards, width, height, scale, naming, imageSize) {
    let exportedCount = 0;
    const totalCards = cards.length;
    
    for (const card of cards) {
        try {
            showProgress(exportedCount, totalCards, `Exporting: ${card.title}`);
            
            const blob = await createCardImage(card, width, height, scale, imageSize);
            const fileName = getFileName(card.title, naming);
            
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = fileName;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
            
            exportedCount++;
            showProgress(exportedCount, totalCards, `Exported: ${card.title}`);
            
            // Small delay between downloads
            await new Promise(resolve => setTimeout(resolve, 50));
            
        } catch (error) {
            console.error(`Failed to export card: ${card.title}`, error);
            showProgress(exportedCount, totalCards, `Failed: ${card.title}`, false);
        }
    }
    
    showProgress(totalCards, totalCards, `Export complete! ${exportedCount} cards downloaded.`, true);
    
    setTimeout(() => {
        const modal = document.getElementById('exportModal');
        if (modal) modal.style.display = 'none';
        resetProgress();
    }, 2000);
}

// Create card image
async function createCardImage(card, width, height, scale, imageSize) {
    const cardContainer = document.createElement('div');
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
    
    cardContainer.innerHTML = generateCardVisualHTMLForExport(card, {
        width: width,
        height: height,
        size: imageSize
    });
    
    document.body.appendChild(cardContainer);
    
    // Wait a moment for rendering
    await new Promise(resolve => setTimeout(resolve, 50));
    
    const canvas = await html2canvas(cardContainer, {
        scale: 1,
        width: width * scale,
        height: height * scale,
        backgroundColor: null,
        logging: false,
        useCORS: true
    });
    
    const blob = await new Promise(resolve => {
        canvas.toBlob(resolve, 'image/png', 1.0);
    });
    
    document.body.removeChild(cardContainer);
    
    return blob;
}

// Helper functions
function getFileName(cardTitle, naming) {
    switch(naming) {
        case 'pascal':
            return `${state.toPascalCase(cardTitle)}.png`;
        case 'lackey':
            return `${cardTitle.replace(/[^\w\s]/g, '').replace(/\s+/g, '')}.png`;
        default:
            return `${cardTitle.replace(/[<>:"/\\|?*]/g, '')}.png`;
    }
}

function showProgress(current, total, message, isComplete = false) {
    const progressBar = document.getElementById('exportProgressBar');
    const progressText = document.getElementById('exportProgressText');
    const progressPercent = document.getElementById('exportProgressPercent');
    const exportStatus = document.getElementById('exportStatus');
    
    if (!progressBar || !progressText) return;
    
    const percent = total > 0 ? Math.round((current / total) * 100) : 0;
    
    progressBar.style.width = `${percent}%`;
    progressText.textContent = message;
    
    if (progressPercent) progressPercent.textContent = `${percent}%`;
    if (exportStatus) exportStatus.textContent = `${current}/${total} cards`;
    
    if (isComplete) {
        progressBar.style.background = '#2ecc71';
        // Re-enable buttons
        const startBtn = document.getElementById('startExport');
        const cancelBtn = document.getElementById('cancelExport');
        if (startBtn) startBtn.disabled = false;
        if (cancelBtn) cancelBtn.disabled = false;
    }
}

function resetProgress() {
    const progressBar = document.getElementById('exportProgressBar');
    if (progressBar) {
        progressBar.style.width = '0%';
        progressBar.style.background = '#4CAF50';
    }
}

// Backward compatibility
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

// TSV export (simplified)
export async function exportAllCardsAsTSV() {
    try {
        const headers = ['Name', 'Sets', 'ImageFile', 'Cost', 'Damage', 'Momentum', 'Type', 'Target', 'Traits', 'Wrestler Logo', 'Game Text'];
        let tsvContent = headers.join('\t') + '\n';
        
        state.cardDatabase.forEach(card => {
            const imageFile = state.toPascalCase(card.title) + '.png';
            let costValue = card.cost;
            let damageValue = card.damage;
            
            if (['Wrestler', 'Manager', 'Call Name', 'Faction'].includes(card.card_type)) {
                costValue = 'N/a';
                damageValue = 'N/a';
            }
            
            let wrestlerLogo = '';
            if (card['Starting'] && card['Starting'].trim() !== '') {
                wrestlerLogo = card['Starting'].trim();
            }
            
            // Get target
            let target = '';
            if (card.text_box?.traits) {
                const targetTrait = card.text_box.traits.find(t => t.name && t.name.trim() === 'Target');
                if (targetTrait && targetTrait.value) {
                    target = targetTrait.value;
                }
            }
            
            // Get traits
            let traits = '';
            if (card.text_box?.traits) {
                traits = card.text_box.traits.map(t => 
                    t.value ? `${t.name}:${t.value}` : t.name
                ).join(',');
            }
            
            const gameText = (card.text_box?.raw_text || '').replace(/\t/g, ' ').replace(/\n/g, ' ').trim();
            
            const row = [
                card.title || '',
                'AEW',
                imageFile,
                costValue !== null ? costValue : '',
                damageValue !== null ? damageValue : '',
                card.momentum !== null ? card.momentum : '',
                card.card_type || '',
                target,
                traits,
                wrestlerLogo,
                gameText
            ];
            
            tsvContent += row.join('\t') + '\n';
        });
        
        const blob = new Blob([tsvContent], { type: 'text/tab-separated-values' });
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = `AEW_Card_Database.tsv`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(a.href);
        
        alert('TSV database exported successfully!');
        return true;
        
    } catch (error) {
        console.error("TSV export failed:", error);
        alert(`TSV export failed: ${error.message}`);
        throw error;
    }
}
