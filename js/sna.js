// js/sna.js - Version complète avec initSNATableHeader()
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

// Barèmes IAE
const IAE_BAREME = {
    V1: 30, V2: 10, V4: 20, A1: 1.5, V3: 1.5, A4: 10, A7: 1
};

function calcIAE(sna) {
    if (sna.typeSna === 'V1') return 30;
    if (sna.typeSna === 'V2' || sna.typeSna === 'V4' || sna.typeSna === 'A4' || sna.typeSna === 'A7') {
        const totalMl = (sna.intersectionsSnaParcelles || []).reduce((sum, p) => sum + (p.longueurIae || 0), 0);
        if (totalMl === 0) return null;
        return totalMl * IAE_BAREME[sna.typeSna];
    }
    if (sna.typeSna === 'A1' || sna.typeSna === 'V3') {
        if (!sna.surfaceGraphique) return null;
        return sna.surfaceGraphique * IAE_BAREME[sna.typeSna];
    }
    return null;
}

const getCategoryStyle = (categorie) => {
    if (categorie === 'VG') return { bg: '#c8e6c9', text: '#2e7d32' };
    if (categorie === 'EA') return { bg: '#b3e5fc', text: '#0277bd' };
    if (categorie === 'AT') return { bg: '#fff3e0', text: '#ef6c00' };
    return { bg: '#f0f0f0', text: '#666' };
};

export function setSNAdata(snaList) {
    snaRows = (snaList || []).map(sna => {
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
        tbody.innerHTML = '<tr><td colspan="9" style="text-align:center;color:#aaa;padding:40px">Aucune Surface Non Agricole (SNA) trouvée</td></tr>';
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
        const surfaceM2 = sna.surfaceGraphique != null ? sna.surfaceGraphique.toFixed(2).replace('.', ',') : '0,00';

        const iaeM2 = calcIAE(sna);
        let iaeCell = '—';
        if (iaeM2 != null) {
            const iaeColor = sna.typeSna === 'V1' ? { bg: '#fff3e0', text: '#e65100' }
                           : sna.typeSna === 'V2' ? { bg: '#e3f2fd', text: '#0277bd' }
                           : sna.typeSna === 'A1' ? { bg: '#e1f5fe', text: '#01579b' }
                           : sna.typeSna === 'V3' ? { bg: '#c8e6c9', text: '#1b5e20' }
                           : sna.typeSna === 'A4' ? { bg: '#e0f2f1', text: '#004d40' }
                           : sna.typeSna === 'A7' ? { bg: '#fce4ec', text: '#880e4f' }
                           : { bg: '#f3e5f5', text: '#6a1b9a' };
            const label = `${iaeM2 % 1 === 0 ? iaeM2 : iaeM2.toFixed(1)} m²`;
            iaeCell = `<span style="background:${iaeColor.bg}; color:${iaeColor.text}; border-radius:12px; padding:3px 10px; font-size:0.78rem; font-weight:700">${label}</span>`;
        }

        let mesureCell = '—';
        if (sna.typeSna === 'V4' || sna.typeSna === 'V2' || sna.typeSna === 'A4' || sna.typeSna === 'A7') {
            const parcelles = sna.intersectionsSnaParcelles || [];
            if (parcelles.length > 0) {
                const styleLin = sna.typeSna === 'A4' ? { bg: '#e0f2f1', text: '#00695c' }
                               : sna.typeSna === 'A7' ? { bg: '#fce4ec', text: '#880e4f' }
                               : { bg: '#e8f5e9', text: '#2e7d32' };
                const lignes = parcelles.map(p => {
                    const lon = p.longueurIae != null ? `<strong>${String(p.longueurIae).replace('.', ',')} m</strong>` : '—';
                    const label = `Î${p.numeroIlot}-P${p.numeroParcelle}`;
                    return `<span style="display:inline-block; margin:1px 4px 1px 0; background:${styleLin.bg}; color:${styleLin.text}; border-radius:12px; padding:2px 8px; font-size:0.72rem">${label} : ${lon}</span>`;
                }).join('');
                mesureCell = `<span title="Longueur par parcelle">📏 ${lignes}</span>`;
            }
        } else if (sna.typeSna === 'V1') {
            mesureCell = `<span style="background:#fff3e0; color:#e65100; border-radius:12px; padding:2px 8px; font-size:0.72rem; font-weight:600">🌳 1 arbre</span>`;
        } else if (sna.typeSna === 'A1' || sna.typeSna === 'V3') {
            const surfAffiche = sna.surfaceGraphique != null ? `${String(sna.surfaceGraphique).replace('.', ',')} m²` : '—';
            const styleSurf = sna.typeSna === 'A1' ? { bg: '#e3f2fd', text: '#0277bd', icon: '💧' } : { bg: '#c8e6c9', text: '#2e7d32', icon: '🌳' };
            mesureCell = `<span style="background:${styleSurf.bg}; color:${styleSurf.text}; border-radius:12px; padding:2px 8px; font-size:0.72rem; font-weight:600">${styleSurf.icon} ${surfAffiche}</span>`;
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
                <td style="text-align:right; font-weight:700; color:#1f5e2c">${surfaceM2} m²</td>
                <td>${ilotsAffiches}</td>
                <td>${escHtml(sna.parcelleAssociee || '—')}</td>
                <td>${mesureCell}</td>
                <td style="text-align:right">${iaeCell}</td>
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

    const totalLongueurHaies = snaRows.filter(s => s.typeSna === 'V4').reduce((sum, s) => {
        const parcelles = s.intersectionsSnaParcelles || [];
        return sum + parcelles.reduce((ps, p) => ps + (p.longueurIae || 0), 0);
    }, 0);
    const totalLongueurV2 = snaRows.filter(s => s.typeSna === 'V2').reduce((sum, s) => {
        const parcelles = s.intersectionsSnaParcelles || [];
        return sum + parcelles.reduce((ps, p) => ps + (p.longueurIae || 0), 0);
    }, 0);
    const nbArbresIsoles = snaRows.filter(s => s.typeSna === 'V1').length;

    const haiesBlock = totalLongueurHaies > 0 ? `<div class="eco-kpi"><div class="val">${Math.round(totalLongueurHaies).toLocaleString('fr')} m</div><div class="lbl">Longueur haies (V4)</div></div>` : '';
    const v2Block = totalLongueurV2 > 0 ? `<div class="eco-kpi"><div class="val">${Math.round(totalLongueurV2).toLocaleString('fr')} m</div><div class="lbl">Longueur arbres alignes (V2)</div></div>` : '';
    const arbresBlock = nbArbresIsoles > 0 ? `<div class="eco-kpi"><div class="val">${nbArbresIsoles}</div><div class="lbl">Arbres isoles (V1)</div></div>` : '';

    const totalSurfA1 = snaRows.filter(s => s.typeSna === 'A1').reduce((sum, s) => sum + (s.surfaceGraphique || 0), 0);
    const totalSurfV3 = snaRows.filter(s => s.typeSna === 'V3').reduce((sum, s) => sum + (s.surfaceGraphique || 0), 0);
    const totalMlA4 = snaRows.filter(s => s.typeSna === 'A4').reduce((sum, s) => sum + (s.intersectionsSnaParcelles || []).reduce((ps, p) => ps + (p.longueurIae || 0), 0), 0);
    const totalMlA7 = snaRows.filter(s => s.typeSna === 'A7').reduce((sum, s) => sum + (s.intersectionsSnaParcelles || []).reduce((ps, p) => ps + (p.longueurIae || 0), 0), 0);

    const a1Block = totalSurfA1 > 0 ? `<div class="eco-kpi"><div class="val">${totalSurfA1.toFixed(2).replace('.', ',')} m²</div><div class="lbl">💧 Surface mares (A1)</div></div>` : '';
    const v3Block = totalSurfV3 > 0 ? `<div class="eco-kpi"><div class="val">${totalSurfV3.toFixed(2).replace('.', ',')} m²</div><div class="lbl">🌳 Surface bosquets (V3)</div></div>` : '';
    const a4Block = totalMlA4 > 0 ? `<div class="eco-kpi"><div class="val">${Math.round(totalMlA4).toLocaleString('fr')} m</div><div class="lbl">〰️ Fossés non maç. (A4)</div></div>` : '';
    const a7Block = totalMlA7 > 0 ? `<div class="eco-kpi"><div class="val">${Math.round(totalMlA7).toLocaleString('fr')} m</div><div class="lbl">🪨 Murs trad. (A7)</div></div>` : '';

    const totalIAEm2 = snaRows.reduce((sum, s) => sum + (calcIAE(s) || 0), 0);

    summaryDiv.innerHTML = `
        <div class="eco-kpi"><div class="val">${snaRows.length}</div><div class="lbl">SNA totales</div></div>
        <div class="eco-kpi"><div class="val">${totalSurface.toFixed(2).replace('.', ',')} m²</div><div class="lbl">Surface totale SNA</div></div>
        <div class="eco-kpi"><div class="val">${categories.length}</div><div class="lbl">Categories</div></div>
        ${haiesBlock}${v2Block}${arbresBlock}${a1Block}${v3Block}${a4Block}${a7Block}
        <div class="eco-kpi" style="border-left:3px solid #6a1b9a"><div class="val" style="color:#6a1b9a">${Math.round(totalIAEm2).toLocaleString('fr')} m²</div><div class="lbl">Surface IAE totale</div></div>
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
                const getLon = s => (s.intersectionsSnaParcelles || []).reduce((sum, p) => sum + (p.longueurIae || 0), 0);
                valA = getLon(a); valB = getLon(b); break;
            }
            case 'iae': valA = calcIAE(a) || 0; valB = calcIAE(b) || 0; break;
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

// ===================================================
// INITIALISATION DE L'EN-TÊTE DU TABLEAU SNA
// ===================================================
export function initSNATableHeader() {
    const thead = document.getElementById('thead-sna');
    if (!thead) return;
    
    thead.innerHTML = `
        <tr>
            <th class="sortable" data-col="numero">N° SNA <span class="sort-indicator"></span></th>
            <th class="sortable" data-col="categorie">Catégorie <span class="sort-indicator"></span></th>
            <th class="sortable" data-col="type">Type SNA <span class="sort-indicator"></span></th>
            <th class="sortable" style="text-align:right" data-col="surface_ha">Surface (m²) <span class="sort-indicator"></span></th>
            <th class="sortable" data-col="ilot">Îlots <span class="sort-indicator"></span></th>
            <th class="sortable" data-col="parcelle">Parcelle associée <span class="sort-indicator"></span></th>
            <th class="sortable" data-col="longueur">Mesure (surf. / long.) <span class="sort-indicator"></span></th>
            <th class="sortable" style="text-align:right" data-col="iae">Valeur IAE <span class="sort-indicator"></span></th>
            <th style="text-align:center">Géométrie</th>
        </tr>
    `;
    
    // Réattacher les événements de tri
    document.querySelectorAll('#thead-sna .sortable').forEach(th => {
        th.addEventListener('click', () => {
            const col = th.dataset.col;
            if (col) sortSNA(col);
        });
    });
}