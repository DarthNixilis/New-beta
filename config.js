// config.js - UPDATED getKitPersona() function
// Get kit persona name (without "Wrestler", "Manager", etc.) - SAFE VERSION
export function getKitPersona(card) {
    try {
        if (!card) return null;
        
        // First try Starting column
        if (card['Starting'] && card['Starting'].trim() !== '') {
            const personaName = card['Starting'].trim();
            // Remove "Wrestler" suffix if present
            let cleanName = personaName.replace(/\s*Wrestler$/, '');
            // Also remove "Manager", "Call Name", "Faction" suffixes
            cleanName = cleanName.replace(/\s*Manager$/, '');
            cleanName = cleanName.replace(/\s*Call Name$/, '');
            cleanName = cleanName.replace(/\s*Faction$/, '');
            return cleanName;
        }
        
        // Fallback to Signature For if Starting doesn't exist
        if (card['Signature For'] && card['Signature For'].trim() !== '') {
            const personaName = card['Signature For'].trim();
            // Remove "Wrestler" suffix if present
            let cleanName = personaName.replace(/\s*Wrestler$/, '');
            // Also remove "Manager", "Call Name", "Faction" suffixes
            cleanName = cleanName.replace(/\s*Manager$/, '');
            cleanName = cleanName.replace(/\s*Call Name$/, '');
            cleanName = cleanName.replace(/\s*Faction$/, '');
            return cleanName;
        }
        
        // If it's a persona card itself, return its name without the type
        if (card.card_type === 'Wrestler' || card.card_type === 'Manager' || 
            card.card_type === 'Call Name' || card.card_type === 'Faction') {
            let cleanName = card.title || '';
            cleanName = cleanName.replace(/\s*Wrestler$/, '');
            cleanName = cleanName.replace(/\s*Manager$/, '');
            cleanName = cleanName.replace(/\s*Call Name$/, '');
            cleanName = cleanName.replace(/\s*Faction$/, '');
            return cleanName;
        }
        
        return null;
    } catch (e) {
        console.error("Error getting kit persona:", e, card);
        return null;
    }
}
