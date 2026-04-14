// js/sna.js - Gestion des Surfaces Non Agricoles (SNA)
import { formatHa, escHtml } from './utils.js';

let snaRows = [];
let filteredSNA = [];

// Mapping des catégories SNA
const CATEGORIE_LABELS = {
    "EA": "🌾 Espace artificialisé",
    "AT": "🌲 Autre terre",
    "VG": "🌳 Végétation"
};

const TYPE_LABELS = {
    "B1": "Bâtiment",
    "B2": "Route, chemin ou voie ferrée",
    "B3": "Surface aménagée",
    "A1": "Mare",
    "A2": "Surface en eau non maçonnée (hors mare)",
    "A3": "Surface en eau maçonnée",
    "A4": "Fossé non maçonné",
    "A5": "Fossé maçonné",
    "A6": "Affleurement rocheux",
    "A7": "Mur traditionnel en pierre répondant aux critères IAE",
    "V1": "Arbre",
    "V2": "Arbres alignés",
    "V3": "Bosquet",
    "V4": "Haie",
    "V5": "Forêt",
    "V6": "Broussailles",
    "V7": "Autre surface végétale non agricole",
    "V8": "Végétation non agricole non caractérisée"

};


export function setSNAdata(snaList) {
    snaRows = snaList || [];
    filteredSNA = [...snaRows];
    console.log(`SNA chargés : ${snaRows.length}`);
}

export function getSNAdata() {
    return snaRows;
}

export function renderSNA() {
    const statsSpan = document.getElementById('stats-sna');
    if (statsSpan) statsSpan.textContent = `${filteredSNA.length} SNA (sur ${snaRows.length} total)`;
    
    const tbody = document.getElementById('tbody-sna');
    if (!tbody) return;
    
    if (filteredSNA.length === 0) {
        tbody.innerHTML = '<tr><td colspan="7" style="text-align:center;color:#aaa;padding:40px">Aucune Surface Non Agricole (SNA) trouvée</td></tr>';
        return;
    }
    
    tbody.innerHTML = filteredSNA.map(sna => {
        // Récupérer le libellé de catégorie
        const catLabel = CATEGORIE_LABELS[sna.categorieSna] || sna.categorieSna || '—';
        const typeLabel = TYPE_LABELS[sna.typeSna] || sna.typeSna || '—';
        
        // Déterminer la couleur de fond selon la catégorie
        let bgColor, textColor;
        if (sna.categorieSna === 'VG') {
            bgColor = '#c8e6c9';
            textColor = '#2e7d32';
        } else if (sna.categorieSna === 'EA') {
            bgColor = '#b3e5fc';
            textColor = '#0277bd';
        } else if (sna.categorieSna === 'AT') {
            bgColor = '#fff3e0';
            textColor = '#ef6c00';
        } else {
            bgColor = '#f0f0f0';
            textColor = '#666';
        }
        
        // Déterminer le type de géométrie
        let geomType = '—';
        if (sna.geom && sna.geom.length >= 3) geomType = '📐 Polygone';
        else if (sna.geomLine && sna.geomLine.length >= 2) geomType = '📏 Ligne';
        else if (sna.geomPoint) geomType = '📍 Point';
        
        // Afficher les îlots associés
        const ilotsAffiches = sna.ilots && sna.ilots.length ? sna.ilots.join(', ') : '—';
        
        return `
            <tr>
                <td><strong>${escHtml(sna.numeroSna)}</strong></td>
                <td style="text-align:center">
                    <span style="background:${bgColor}; color:${textColor}; padding:4px 10px; border-radius:20px; font-size:0.75rem; font-weight:600">
                        ${catLabel}
                    </span>
                </td>
                <td>${typeLabel} <span style="color:#888; font-size:0.7rem">(${escHtml(sna.typeSna)})</span></td>
                <td style="text-align:right; font-weight:700; color:#1f5e2c">${formatHa(sna.surfaceGraphique)}</td>
                <td>${ilotsAffiches}</td>
                <td>${escHtml(sna.parcelle_associee || '—')}</td>
                <td style="text-align:center">${geomType}</td>
            </tr>
        `;
    }).join('');
    
    // Mettre à jour le résumé
    updateSNASummary();
}

function updateSNASummary() {
    const summaryDiv = document.getElementById('sna-summary');
    if (!summaryDiv) return;
    
    const totalSurface = snaRows.reduce((sum, s) => sum + (s.surfaceGraphique || 0), 0);
    const categories = [...new Set(snaRows.map(s => s.categorieSna).filter(Boolean))];
    const types = [...new Set(snaRows.map(s => s.typeSna).filter(Boolean))];
    
    summaryDiv.innerHTML = `
        <div class="eco-kpi"><div class="val">${snaRows.length}</div><div class="lbl">SNA totales</div></div>
        <div class="eco-kpi"><div class="val">${totalSurface.toFixed(2).replace('.', ',')} ha</div><div class="lbl">Surface totale SNA</div></div>
        <div class="eco-kpi"><div class="val">${categories.length}</div><div class="lbl">Catégories</div></div>
        <div class="eco-kpi"><div class="val">${types.length}</div><div class="lbl">Types</div></div>
    `;
}

export function filterSNA() {
    const search = document.getElementById('search-sna')?.value.toLowerCase() || '';
    
    if (!search) {
        filteredSNA = [...snaRows];
    } else {
        filteredSNA = snaRows.filter(sna => 
            sna.numeroSna?.toLowerCase().includes(search) ||
            sna.categorieSna?.toLowerCase().includes(search) ||
            sna.typeSna?.toLowerCase().includes(search) ||
            (sna.ilots && sna.ilots.some(i => i.toLowerCase().includes(search))) ||
            sna.parcelle_associee?.toLowerCase().includes(search)
        );
    }
    
    renderSNA();
}

let sortColSNA = null;
let sortDirSNA = 1;

export function sortSNA(col) {
    if (sortColSNA === col) {
        sortDirSNA *= -1;
    } else {
        sortColSNA = col;
        sortDirSNA = 1;
    }
    
    filteredSNA.sort((a, b) => {
        let valA, valB;
        switch(col) {
            case 'numero': valA = a.numeroSna || ''; valB = b.numeroSna || ''; break;
            case 'categorie': valA = a.categorieSna || ''; valB = b.categorieSna || ''; break;
            case 'type': valA = a.typeSna || ''; valB = b.typeSna || ''; break;
            case 'surface_ha': valA = a.surfaceGraphique || 0; valB = b.surfaceGraphique || 0; break;
            case 'ilot': valA = (a.ilots && a.ilots[0]) || ''; valB = (b.ilots && b.ilots[0]) || ''; break;
            case 'parcelle': valA = a.parcelle_associee || ''; valB = b.parcelle_associee || ''; break;
            default: return 0;
        }
        
        if (typeof valA === 'number' && typeof valB === 'number') {
            return sortDirSNA * (valA - valB);
        }
        return sortDirSNA * String(valA).localeCompare(String(valB), 'fr');
    });
    
    renderSNA();
}