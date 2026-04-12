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
    "B2": "Bâtiment agricole",
    "B3": "Bâtiment d'élevage",
    "A1": "Autre terre agricole",
    "A2": "Autre terre non agricole",
    "A4": "Autre terre",
    "V1": "Arbre isolé",
    "V2": "Haie / Linéaire boisé",
    "V3": "Boisement",
    "V4": "Bande boisée",
    "V5": "Zone boisée",
    "V6": "Arbre"
};

export function setSNAdata(snaList) {
    snaRows = snaList;
    filteredSNA = [...snaRows];
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
    
    tbody.innerHTML = filteredSNA.map(sna => `
        <tr>
            <td><strong>${escHtml(sna.numero)}</strong></td>
            <td style="text-align:center">
                <span style="background:${sna.categorie === 'EA' ? '#ffcdd2' : sna.categorie === 'AT' ? '#fff3e0' : '#c8e6c9'}; 
                             color:${sna.categorie === 'EA' ? '#c62828' : sna.categorie === 'AT' ? '#ef6c00' : '#2e7d32'};
                             padding:4px 10px; border-radius:20px; font-size:0.75rem; font-weight:600">
                    ${CATEGORIE_LABELS[sna.categorie] || sna.categorie}
                </span>
            </td>
            <td>${TYPE_LABELS[sna.type] || sna.type} (${sna.type})</td>
            <td style="text-align:right; font-weight:700; color:#1f5e2c">${formatHa(sna.surface_ha)}</td>
            <td>${sna.ilot_associe || '—'}</td>
            <td>${sna.parcelle_associee || '—'}</td>
            <td style="text-align:center">
                ${sna.geometry_type === 'Polygon' ? '📐 Polygone' : 
                  sna.geometry_type === 'Point' ? '📍 Point' : 
                  sna.geometry_type === 'LineString' ? '📏 Ligne' : '—'}
            </td>
        </tr>
    `).join('');
    
    // Mettre à jour le résumé
    updateSNASummary();
}

function updateSNASummary() {
    const summaryDiv = document.getElementById('sna-summary');
    if (!summaryDiv) return;
    
    const totalSurface = snaRows.reduce((sum, s) => sum + (s.surface_ha || 0), 0);
    const categories = [...new Set(snaRows.map(s => s.categorie))];
    const types = [...new Set(snaRows.map(s => s.type))];
    
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
            sna.numero?.toLowerCase().includes(search) ||
            sna.categorie?.toLowerCase().includes(search) ||
            sna.type?.toLowerCase().includes(search) ||
            sna.ilot_associe?.toLowerCase().includes(search) ||
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
            case 'numero': valA = a.numero || ''; valB = b.numero || ''; break;
            case 'categorie': valA = a.categorie || ''; valB = b.categorie || ''; break;
            case 'type': valA = a.type || ''; valB = b.type || ''; break;
            case 'surface_ha': valA = a.surface_ha || 0; valB = b.surface_ha || 0; break;
            case 'ilot': valA = a.ilot_associe || ''; valB = b.ilot_associe || ''; break;
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