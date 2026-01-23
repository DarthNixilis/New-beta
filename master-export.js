// master-export.js
import * as state from './config.js';
import { toPascalCase } from './config.js';

// Helper function to create clean filename
function getCleanFileName(cardTitle, cardType, usePascalCase = false) {
    let cleanTitle;
    
    if (usePascalCase) {
        cleanTitle = toPascalCase(cardTitle);
    } else {
        cleanTitle = cardTitle.replace(/[^a-zA-Z0-9\s]/g, '');
        cleanTitle = cleanTitle
            .toLowerCase()
            .split(' ')
            .map(word => word.charAt(0).toUpperCase() + word.slice(1))
            .join(' ');
    }
    
    if (cardType === 'Wrestler' || cardType === 'Manager') {
        return usePascalCase ? cleanTitle + cardType : cleanTitle + ' ' + cardType;
    }
    
    return cleanTitle;
}

// Helper to check if a value is actually valid
function isValidStat(value) {
    return value !== null && value !== undefined && value !== '' && value !== 'N/A' && value !== 'N/a';
}

// NEW: Function to convert card to LackeyCCG database format
function convertToLackeyDatabaseFormat(card, options) {
    const { usePascalCase, usePNG } = options;
    
    // Get PascalCase filename for image
    const imageFileName = getCleanFileName(card.title, card.card_type, true) + (usePNG ? '.png' : '.jpg');
    
    // Handle special cases for Persona cards
    let type = card.card_type;
    let finalCardName = card.title;
    
    // For persona cards, append card type to name for uniqueness
    if (type === 'Wrestler' || type === 'Manager') {
        finalCardName = card.title + (type === 'Wrestler' ? 'Wrestler' : 'Manager');
    }
    
    // Get signature for field
    const signatureFor = card['Signature For'] || '';
    
    // Get traits (combine all traits into a string)
    let traits = '';
    if (card.text_box && card.text_box.traits) {
        traits = card.text_box.traits
            .map(trait => {
                if (trait.value) {
                    return `${trait.name}:${trait.value}`;
                }
                return trait.name;
            })
            .join(',');
    }
    
    // Get game text (strip any formatting)
    let gameText = card.text_box?.raw_text || '';
    // Clean up text for TSV (replace tabs with spaces)
    gameText = gameText.replace(/\t/g, ' ');
    
    // Handle cost for persona cards (Wrestler/Manager should be empty string)
    let cost = '';
    let damage = '';
    let momentum = '';
    
    if (type !== 'Wrestler' && type !== 'Manager' && type !== 'Call Name' && type !== 'Faction') {
        cost = card.cost !== null && card.cost !== undefined ? card.cost.toString() : '';
        damage = card.damage !== null && card.damage !== undefined ? card.damage.toString() : '';
        momentum = card.momentum !== null && card.momentum !== undefined ? card.momentum.toString() : '';
    }
    
    // Handle special cases for Boon/Injury
    if (type === 'Boon' || type === 'Injury') {
        cost = card.cost !== null && card.cost !== undefined ? card.cost.toString() : '';
        damage = '0';
        momentum = card.momentum !== null && card.momentum !== undefined ? card.momentum.toString() : '';
    }
    
    // Format as TSV row
    const fields = [
        finalCardName,            // Name (PascalCase for persona cards)
        'AEW',                    // Sets
        imageFileName,            // ImageFile
        cost,                     // Cost
        damage,                   // Damage
        momentum,                 // Momentum
        type,                     // Type
        card.Target || '',        // Target
        traits,                   // Traits
        signatureFor,             // Wrestler Logo
        gameText                  // Game Text
    ];
    
    return fields.join('\t');
}

// NEW: Export all cards as TSV database
export async function exportAllCardsAsTSV() {
    const allCards = [...state.cardDatabase];
    
    if (allCards.length === 0) {
        alert("No cards found.");
        return;
    }
    
    // Create modal for TSV export options
    const modal = createModal('Export TSV Database', `
        <div style="margin-bottom:20px;">
            <label style="display:block;margin-bottom:10px;font-weight:bold;">
                <input type="checkbox" id="tsvUsePascalCase" checked style="margin-right:8px;">
                PascalCase filenames
            </label>
        </div>
        
        <div style="margin-bottom:20px;">
            <label style="display:block;margin-bottom:10px;font-weight:bold;">
                <input type="checkbox" id="tsvUsePNG" style="margin-right:8px;">
                PNG format (higher quality)
            </label>
            <small style="color:#666;">Unchecked = JPG (recommended)</small>
        </div>
        
        <div style="display:flex;justify-content:space-between;margin-top:25px;">
            <button id="tsvCancelBtn" style="padding:10px 20px;background:#6c757d;color:white;border:none;border-radius:4px;cursor:pointer;">
                Cancel
            </button>
            <button id="tsvConfirmBtn" style="padding:10px 20px;background:#20c997;color:white;border:none;border-radius:4px;cursor:pointer;">
                Export TSV Database
            </button>
        </div>
    `);
    
    return new Promise((resolve) => {
        document.getElementById('tsvCancelBtn').onclick = () => {
            modal.remove();
            resolve();
        };
        
        document.getElementById('tsvConfirmBtn').onclick = async () => {
            const usePascalCase = document.getElementById('tsvUsePascalCase').checked;
            const usePNG = document.getElementById('tsvUsePNG').checked;
            
            modal.remove();
            
            const exportOptions = {
                usePascalCase,
                usePNG
            };
            
            try {
                await generateTSVDatabase(allCards, exportOptions);
            } catch (error) {
                alert(`TSV export failed: ${error.message}`);
            }
            
            resolve();
        };
    });
}

// NEW: Generate TSV database file
async function generateTSVDatabase(cards, options) {
    if (!confirm(`Export ${cards.length} cards as TSV database for LackeyCCG?`)) {
        return;
    }
    
    // Progress indicator
    const progressDiv = document.createElement('div');
    progressDiv.style.cssText = 'position:fixed;top:50%;left:50%;transform:translate(-50%,-50%);background:white;padding:30px;border:3px solid #000;border-radius:10px;z-index:9999;box-shadow:0 0 30px rgba(0,0,0,0.5);min-width:300px;text-align:center;font-family:Arial,sans-serif;';
    document.body.appendChild(progressDiv);
    
    progressDiv.innerHTML = `
        <h3 style="margin-top:0;">Generating TSV Database</h3>
        <p>Processing ${cards.length} cards...</p>
        <div style="width:100%;height:20px;background:#f0f0f0;border-radius:10px;margin:15px 0;">
            <div style="width:0%;height:100%;background:#007bff;border-radius:10px;"></div>
        </div>
    `;
    
    // TSV header
    const header = [
        'Name',
        'Sets',
        'ImageFile',
        'Cost',
        'Damage',
        'Momentum',
        'Type',
        'Target',
        'Traits',
        'Wrestler Logo',
        'Game Text'
    ].join('\t');
    
    // Process cards
    const rows = [header];
    let processed = 0;
    
    // Sort cards for consistent output
    const sortedCards = [...cards].sort((a, b) => {
        // Sort by type, then by name
        const typeOrder = {
            'Wrestler': 0,
            'Manager': 1,
            'Strike': 2,
            'Grapple': 3,
            'Submission': 4,
            'Action': 5,
            'Response': 6,
            'Boon': 7,
            'Injury': 8,
            'Call Name': 9,
            'Faction': 10
        };
        
        const typeA = typeOrder[a.card_type] || 999;
        const typeB = typeOrder[b.card_type] || 999;
        
        if (typeA !== typeB) return typeA - typeB;
        return a.title.localeCompare(b.title);
    });
    
    for (const card of sortedCards) {
        try {
            const tsvRow = convertToLackeyDatabaseFormat(card, options);
            rows.push(tsvRow);
            processed++;
            
            // Update progress
            const progressBar = progressDiv.querySelector('div > div');
            progressBar.style.width = `${(processed / cards.length) * 100}%`;
            
        } catch (error) {
            console.error(`Failed to convert ${card.title}:`, error);
        }
    }
    
    // Create TSV content
    const tsvContent = rows.join('\n');
    
    // Create and download file
    const blob = new Blob([tsvContent], { type: 'text/tab-separated-values' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `AEW-LackeyCCG-Database.tsv`;
    
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    
    document.body.removeChild(progressDiv);
    
    setTimeout(() => URL.revokeObjectURL(url), 10000);
    
    alert(`Exported ${processed} cards as TSV database!`);
}

// Load JSZip
async function loadJSZip() {
    if (window.JSZip) return window.JSZip;
    
    try {
        const script = document.createElement('script');
        script.src = 'https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js';
        document.head.appendChild(script);
        
        return new Promise((resolve, reject) => {
            script.onload = () => window.JSZip ? resolve(window.JSZip) : reject(new Error('JSZip failed'));
            script.onerror = () => reject(new Error('Failed to load JSZip'));
        });
    } catch (error) {
        throw new Error('JSZip not available: ' + error.message);
    }
}

// Create a modal dialog
function createModal(title, contentHTML, width = '400px') {
    const modal = document.createElement('div');
    modal.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.7);z-index:9998;display:flex;justify-content:center;align-items:center;';
    
    const modalContent = document.createElement('div');
    modalContent.style.cssText = `background:white;padding:30px;border-radius:10px;box-shadow:0 0 20px rgba(0,0,0,0.3);width:${width};max-width:90%;font-family:Arial,sans-serif;`;
    
    modalContent.innerHTML = `
        <h3 style="margin-top:0;">${title}</h3>
        ${contentHTML}
    `;
    
    modal.appendChild(modalContent);
    document.body.appendChild(modal);
    
    return {
        modal,
        modalContent,
        remove: () => {
            if (modal.parentNode) {
                document.body.removeChild(modal);
            }
        }
    };
}

// Wrap text function for better text handling
function wrapText(ctx, text, maxWidth, lineHeight, startY) {
    const words = text.split(' ');
    const lines = [];
    let currentLine = words[0];
    
    for (let i = 1; i < words.length; i++) {
        const word = words[i];
        const testLine = currentLine + ' ' + word;
        const metrics = ctx.measureText(testLine);
        
        if (metrics.width > maxWidth && currentLine !== '') {
            lines.push(currentLine);
            currentLine = word;
        } else {
            currentLine = testLine;
        }
    }
    lines.push(currentLine);
    
    return lines;
}

// Clean and format card text
function cleanCardText(text) {
    if (!text) return '';
    
    // Replace double hyphens with em dash
    let cleaned = text.replace(/--/g, '—');
    
    // Fix common formatting issues
    cleaned = cleaned.replace(/\s+/g, ' ').trim();
    
    return cleaned;
}

// Updated main export function to include TSV option
export async function exportAllCardsAsImages() {
    const allCards = [...state.cardDatabase];
    
    if (allCards.length === 0) {
        alert("No cards found.");
        return;
    }
    
    // Main export options modal - UPDATED WITH TSV OPTION
    const modal = createModal('Export Options', `
        <div style="margin-bottom:20px;">
            <label style="display:block;margin-bottom:10px;font-weight:bold;">
                <input type="checkbox" id="exportUsePascalCase" checked style="margin-right:8px;">
                PascalCase filenames
            </label>
        </div>
        
        <div style="margin-bottom:20px;">
            <label style="display:block;margin-bottom:10px;font-weight:bold;">
                <input type="checkbox" id="exportUsePNG" style="margin-right:8px;">
                PNG format (higher quality)
            </label>
            <small style="color:#666;">Unchecked = JPG (recommended)</small>
        </div>
        
        <div style="margin-bottom:20px;">
            <strong style="display:block;margin-bottom:10px;">Export Type:</strong>
            <select id="exportTypeSelect" style="width:100%;padding:8px;font-size:16px;">
                <option value="all">All Cards as Images</option>
                <option value="bytype">Images by Card Type</option>
                <option value="singletype">Single Card Type Images</option>
                <option value="tsv">TSV Database (LackeyCCG)</option>
            </select>
        </div>
        
        <div style="margin-bottom:20px;" id="imageSizeSection">
            <strong style="display:block;margin-bottom:10px;">Card Size:</strong>
            <select id="exportSizeSelect" style="width:100%;padding:8px;font-size:16px;">
                <option value="lackey">LackeyCCG (750x1050)</option>
                <option value="digital">Digital (214x308)</option>
                <option value="highres">High Res (1500x2100)</option>
            </select>
        </div>
        
        <div style="display:flex;justify-content:space-between;margin-top:25px;">
            <button id="exportCancelBtn" style="padding:10px 20px;background:#6c757d;color:white;border:none;border-radius:4px;cursor:pointer;">
                Cancel
            </button>
            <button id="exportConfirmBtn" style="padding:10px 20px;background:#20c997;color:white;border:none;border-radius:4px;cursor:pointer;">
                Export
            </button>
        </div>
    `);
    
    // Add event listener to show/hide image size options
    const exportTypeSelect = document.getElementById('exportTypeSelect');
    const imageSizeSection = document.getElementById('imageSizeSection');
    
    exportTypeSelect.addEventListener('change', () => {
        if (exportTypeSelect.value === 'tsv') {
            imageSizeSection.style.display = 'none';
        } else {
            imageSizeSection.style.display = 'block';
        }
    });
    
    return new Promise((resolve) => {
        document.getElementById('exportCancelBtn').onclick = () => {
            modal.remove();
            resolve();
        };
        
        document.getElementById('exportConfirmBtn').onclick = async () => {
            const usePascalCase = document.getElementById('exportUsePascalCase').checked;
            const usePNG = document.getElementById('exportUsePNG').checked;
            const exportType = document.getElementById('exportTypeSelect').value;
            const exportSize = document.getElementById('exportSizeSelect')?.value || 'lackey';
            
            modal.remove();
            
            const exportOptions = {
                usePascalCase,
                usePNG,
                size: exportSize
            };
            
            try {
                if (exportType === 'tsv') {
                    await generateTSVDatabase(allCards, exportOptions);
                } else if (exportType === 'all') {
                    await exportSingleZip(allCards, 'AEW-Complete-Set.zip', exportOptions);
                } else if (exportType === 'bytype') {
                    await exportByCategorySeparate(allCards, exportOptions);
                } else if (exportType === 'singletype') {
                    await exportByCategorySingle(allCards, exportOptions);
                }
            } catch (error) {
                alert(`Export failed: ${error.message}`);
            }
            
            resolve();
        };
    });
}

// ... rest of the existing functions remain the same ...
// (renderCardToCanvas, getTypeColor, exportSingleZip, groupCardsByType, 
// exportByCategorySeparate, exportByCategorySingle functions remain unchanged)

// SIMPLIFIED RENDERER with clean layout
function renderCardToCanvas(card, width, height) {
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    
    // Clear with white background
    ctx.fillStyle = 'white';
    ctx.fillRect(0, 0, width, height);
    
    // Determine if this is the small digital size
    const isSmallSize = width === 214; // 214x308 for digital
    
    // Check if this is a stat-less card type
    const isStatlessCard = ['Wrestler', 'Manager', 'Call Name', 'Faction'].includes(card.card_type);
    
    if (isSmallSize) {
        // ... existing code for small cards ...
    } else {
        // ... existing code for larger cards ...
    }
    
    return canvas;
}

function getTypeColor(type) {
    const colors = {
        'Action': '#9c5a9c',
        'Response': '#c84c4c',
        'Submission': '#5aa05a',
        'Strike': '#4c82c8',
        'Grapple': '#e68a00',
        'Wrestler': '#333333',
        'Manager': '#666666',
        'Boon': '#17a2b8',
        'Injury': '#6c757d',
        'Call Name': '#fd7e14',
        'Faction': '#20c997'
    };
    return colors[type] || '#6c757d';
}

async function exportSingleZip(cards, zipName, options) {
    // ... existing exportSingleZip implementation ...
}

// Group cards by type
function groupCardsByType(cards) {
    // ... existing groupCardsByType implementation ...
}

// Export separate ZIPs for each card type
async function exportByCategorySeparate(allCards, options) {
    // ... existing exportByCategorySeparate implementation ...
}

// Export a single selected card type
async function exportByCategorySingle(allCards, options) {
    // ... existing exportByCategorySingle implementation ...
}

// Fallback export
export async function exportAllCardsAsImagesFallback() {
    alert('Please use the main export function.');
}
