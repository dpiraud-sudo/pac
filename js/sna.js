// js/sna.js - Version avec vos mappings d'origine
// 
// Structure attendue pour chaque objet SNA :
//   sna.intersectionsSnaParcelles : tableau d'objets { numeroIlot, numeroParcelle, longueurIae }
//     → utilisé pour V4 (haie) et V2 (arbres alignés) : longueur IAE par parcelle
//     → V1 (arbre isolé) : 1 arbre = 1 SNA, pas de longueur, comptage automatique
//
// Correspond aux balises XML : <intersectionsSnaParcelles>/<intersectionSnaParcelle>
//   avec <numeroIlot>, <numeroParcelle>, <longueur-iae>
import { formatHa, escHtml } from './utils.js';

let snaRows = [];
let filteredSNA = [];

// Mapping des catégories SNA (vos mappings d'origine)
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

// Couleurs par catégorie (vos mappings d'origine)
const getCategoryStyle = (categorie) => {
    if (categorie === 'VG') return { bg: '#c8e6c9', text: '#2e7d32' };
    if (categorie === 'EA') return { bg: '#b3e5fc', text: '#0277bd' };
    if (categorie === 'AT') return { bg: '#fff3e0', text: '#ef6c00' };
    return { bg: '#f0f0f0', text: '#666' };
};

export function setSNAdata(snaList) {
    snaRows = (snaList || []).map(sna => {
        // Normalisation : s'assurer que intersectionsSnaParcelles est bien un tableau
        // et que longueurIae est un nombre (le parseur peut nommer le champ 'longueur-iae')
        if (sna.intersectionsSnaParcelles && Array.isArray(sna.intersectionsSnaParcelles)) {
            sna.intersectionsSnaParcelles = sna.intersectionsSnaParcelles.map(p => ({
                ...p,
                longueurIae: p.longueurIae != null ? parseFloat(p.longueurIae)
                           : p['longueur-iae'] != null ? parseFloat(p['longueur-iae'])
                           : null
            }));
        } else {
            sna.intersectionsSnaParcelles = [];
        }
        return sna;
    });
    filteredSNA = [...snaRows];
    console.log(`SNA chargés : ${snaRows.length}`, snaRows);
}

export function getSNAdata() {
    return snaRows;
}

export function renderSNA() {
    console.log('renderSNA appelé, filteredSNA.length =', filteredSNA.length);
    
    const statsSpan = document.getElementById('stats-sna');
    if (statsSpan) statsSpan.textContent = `${filteredSNA.length} SNA (sur ${snaRows.length} total)`;
    
    const tbody = document.getElementById('tbody-sna');
    if (!tbody) {
        console.error('tbody-sna non trouvé');
        return;
    }
    
    if (filteredSNA.length === 0) {
        tbody.innerHTML = '<tr><td colspan="8" style="text-align:center;color:#aaa;padding:40px">Aucune Surface Non Agricole (SNA) trouvée</td></tr>';
        return;
    }
    
    tbody.innerHTML = filteredSNA.map(sna => {
        const catLabel = CATEGORIE_LABELS[sna.categorieSna] || sna.categorieSna || '—';
        const typeLabel = TYPE_LABELS[sna.typeSna] || sna.typeSna || '—';
        const style = getCategoryStyle(sna.categorieSna);
        
        let geomType = '—';
        if (sna.geom && sna.geom.length >= 3) geomType = '📐 Polygone';
        else if (sna.geomLine && sna.geomLine.length >= 2) geomType = '📏 Ligne';
        else if (sna.geomPoint) geomType = '📍 Point';
        
        const ilotsAffiches = sna.ilots && sna.ilots.length ? sna.ilots.join(', ') : '—';
        const surfaceHa = sna.surfaceGraphique ? sna.surfaceGraphique.toFixed(2).replace('.', ',') : '0,00';

        // Colonne longueur/arbres selon le type SNA
        let mesureCell = '—';
        if (sna.typeSna === 'V4' || sna.typeSna === 'V2') {
            // Haie ou arbres alignés : afficher longueur IAE par parcelle
            const parcelles = sna.intersectionsSnaParcelles || [];
            if (parcelles.length > 0) {
                const lignes = parcelles.map(p => {
                    const lon = p.longueurIae != null ? `<strong>${String(p.longueurIae).replace('.', ',')} m</strong>` : '—';
                    const label = `Î${p.numeroIlot}-P${p.numeroParcelle}`;
                    return `<span style="display:inline-block; margin:1px 4px 1px 0; background:#e8f5e9; color:#2e7d32; border-radius:12px; padding:2px 8px; font-size:0.72rem">${label} : ${lon}</span>`;
                }).join('');
                mesureCell = `<span title="Longueur IAE par parcelle">📏 ${lignes}</span>`;
            }
        } else if (sna.typeSna === 'V1') {
            // Arbre isolé : 1 arbre par SNA (point), afficher juste l'indicateur
            mesureCell = `<span style="background:#fff3e0; color:#e65100; border-radius:12px; padding:2px 8px; font-size:0.72rem; font-weight:600">🌳 1 arbre</span>`;
        }
        
        return `
            <tr>
                <td><strong>${escHtml(sna.numeroSna)}</strong></td>
                <td style="text-align:center">
                    <span style="background:${style.bg}; color:${style.text}; padding:4px 10px; border-radius:20px; font-size:0.75rem; font-weight:600">
                        ${catLabel}
                    </span>
                </td>
                <td>${typeLabel} <span style="color:#888; font-size:0.7rem">(${escHtml(sna.typeSna)})</span></td>
                <td style="text-align:right; font-weight:700; color:#1f5e2c">${surfaceHa} ha</td>
                <td>${ilotsAffiches}</td>
                <td>${escHtml(sna.parcelleAssociee || '—')}</td>
                <td>${mesureCell}</td>
                <td style="text-align:center">${geomType}</td>
            </tr>
        `;
    }).join('');
    
    updateSNASummary();
}

function updateSNASummary() {
    const summaryDiv = document.getElementById('sna-summary');
    if (!summaryDiv) return;
    
    const totalSurface = snaRows.reduce((sum, s) => sum + (s.surfaceGraphique || 0), 0);
    const categories = [...new Set(snaRows.map(s => s.categorieSna).filter(Boolean))];

    // Longueur totale haies (V4) et arbres alignes (V2) via intersectionsSnaParcelles
    const totalLongueurHaies = snaRows
        .filter(s => s.typeSna === 'V4')
        .reduce((sum, s) => {
            const parcelles = s.intersectionsSnaParcelles || [];
            return sum + parcelles.reduce((ps, p) => ps + (p.longueurIae || 0), 0);
        }, 0);
    const totalLongueurV2 = snaRows
        .filter(s => s.typeSna === 'V2')
        .reduce((sum, s) => {
            const parcelles = s.intersectionsSnaParcelles || [];
            return sum + parcelles.reduce((ps, p) => ps + (p.longueurIae || 0), 0);
        }, 0);

    // Nombre d'arbres isoles (V1 = 1 arbre par SNA Point)
    const nbArbresIsoles = snaRows.filter(s => s.typeSna === 'V1').length;

    const haiesBlock = totalLongueurHaies > 0
        ? `<div class="eco-kpi"><div class="val">${Math.round(totalLongueurHaies).toLocaleString('fr')} m</div><div class="lbl">Longueur haies (V4)</div></div>`
        : '';
    const v2Block = totalLongueurV2 > 0
        ? `<div class="eco-kpi"><div class="val">${Math.round(totalLongueurV2).toLocaleString('fr')} m</div><div class="lbl">Longueur arbres alignes (V2)</div></div>`
        : '';
    const arbresBlock = nbArbresIsoles > 0
        ? `<div class="eco-kpi"><div class="val">${nbArbresIsoles}</div><div class="lbl">Arbres isoles (V1)</div></div>`
        : '';

    summaryDiv.innerHTML = `
        <div class="eco-kpi"><div class="val">${snaRows.length}</div><div class="lbl">SNA totales</div></div>
        <div class="eco-kpi"><div class="val">${totalSurface.toFixed(2).replace('.', ',')} ha</div><div class="lbl">Surface totale SNA</div></div>
        <div class="eco-kpi"><div class="val">${categories.length}</div><div class="lbl">Categories</div></div>
        ${haiesBlock}${v2Block}${arbresBlock}
    `;
}

export function filterSNA() {
    const search = document.getElementById('search-sna')?.value.toLowerCase() || '';
    
    if (!search) {
        filteredSNA = [...snaRows];
    } else {
        filteredSNA = snaRows.filter(sna => 
            (sna.numeroSna && sna.numeroSna.toLowerCase().includes(search)) ||
            (sna.categorieSna && sna.categorieSna.toLowerCase().includes(search)) ||
            (sna.typeSna && sna.typeSna.toLowerCase().includes(search)) ||
            (sna.ilots && sna.ilots.some(i => i.toLowerCase().includes(search))) ||
            (sna.parcelleAssociee && sna.parcelleAssociee.toLowerCase().includes(search)) ||
            (sna.intersectionsSnaParcelles && sna.intersectionsSnaParcelles.some(p =>
                String(p.numeroParcelle || '').toLowerCase().includes(search) ||
                String(p.longueurIae || '').toLowerCase().includes(search)
            ))
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
            case 'longueur': {
                // Tri sur la longueur IAE totale pour V4/V2, ou 0 sinon
                const getLon = s => (s.intersectionsSnaParcelles || []).reduce((sum, p) => sum + (p.longueurIae || 0), 0);
                valA = getLon(a); valB = getLon(b); break;
            }
            case 'ilot': valA = (a.ilots && a.ilots[0]) || ''; valB = (b.ilots && b.ilots[0]) || ''; break;
            case 'parcelle': valA = a.parcelleAssociee || ''; valB = b.parcelleAssociee || ''; break;
            default: return 0;
        }
        
        if (typeof valA === 'number' && typeof valB === 'number') {
            return sortDirSNA * (valA - valB);
        }
        return sortDirSNA * String(valA).localeCompare(String(valB), 'fr');
    });
    
    renderSNA();
}