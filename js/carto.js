// js/carto.js - Version améliorée inspirée du visualisateur PAC 2026
import { getCultureColor } from './data.js';

let currentMap = null;
let currentIlotGroup    = null;
let currentParcelGroup  = null;
let currentMaecSGroup   = null;
let currentMaecSLGroup  = null;
let currentMaecPGroup   = null;

// Couches SNA par type
let snaLayerGroups = {};
let snaData        = [];

// Cache des couleurs par code culture (pour cohérence avec le HTML)
const cultureColorCache = new Map();
let nextColorIndex = 0;

const colorPalette = [
    { color: '#2e7d32', fill: '#6fbf4c', name: 'PPH' },
    { color: '#ed6c02', fill: '#f4a460', name: 'MSW' },
    { color: '#1565c0', fill: '#64b5f6', name: 'BLÉ' },
    { color: '#6a1b9a', fill: '#ce93d8', name: 'ORG' },
    { color: '#c62828', fill: '#ef9a9a', name: 'COL' },
    { color: '#00838f', fill: '#80deea', name: 'TOU' },
    { color: '#ef6c00', fill: '#ffb74d', name: 'PRO' },
    { color: '#43a047', fill: '#a5d6a7', name: 'PRA' },
    { color: '#5d4037', fill: '#bcaaa4', name: 'JAC' }
];

// Surcharge de getCultureColor pour utiliser le même système que le HTML
export function getCultureColorImproved(cultureCode) {
    if (cultureColorCache.has(cultureCode)) return cultureColorCache.get(cultureCode);
    const predefined = colorPalette.find(p => p.name === cultureCode);
    if (predefined) {
        cultureColorCache.set(cultureCode, { color: predefined.color, fill: predefined.fill });
        return cultureColorCache.get(cultureCode);
    }
    const hue = (nextColorIndex * 137) % 360;
    const dynamicColor = `hsl(${hue}, 65%, 40%)`;
    const dynamicFill = `hsl(${hue}, 65%, 70%)`;
    cultureColorCache.set(cultureCode, { color: dynamicColor, fill: dynamicFill });
    nextColorIndex++;
    return cultureColorCache.get(cultureCode);
}

// ===================================================
// RESET (exportée)
// ===================================================
export function resetMap() {
    if (currentMap) {
        currentMap.remove();
        currentMap = null;
    }
    currentIlotGroup   = null;
    currentParcelGroup = null;
    currentMaecSGroup  = null;
    currentMaecSLGroup = null;
    currentMaecPGroup  = null;
    snaLayerGroups     = {};
    snaData            = [];
    cultureColorCache.clear();
    nextColorIndex = 0;
}

// ===================================================
// PROJECTION Lambert-93 (EPSG:2154) → WGS84
// ===================================================
if (typeof proj4 !== 'undefined') {
    proj4.defs(
        'EPSG:2154',
        '+proj=lcc +lat_1=49 +lat_2=44 +lat_0=46.5 +lon_0=3 ' +
        '+x_0=700000 +y_0=6600000 +ellps=GRS80 ' +
        '+towgs84=0,0,0,0,0,0,0 +units=m +no_defs'
    );
}

/**
 * Convertit une paire Lambert-93 (X, Y) en [lat, lng] WGS84 via proj4.
 */
function lambert93ToLatLng(x, y) {
    if (typeof proj4 === 'undefined') {
        console.warn('proj4.js non disponible — coordonnées non converties');
        return [parseFloat(y), parseFloat(x)];
    }
    const [lon, lat] = proj4('EPSG:2154', 'EPSG:4326', [parseFloat(x), parseFloat(y)]);
    return [lat, lon];
}

/**
 * Détecte si une valeur numérique est en Lambert-93 métrique.
 */
function isLambert93(a, b) {
    const x = parseFloat(a);
    const y = parseFloat(b);
    return (x > 100000 && x < 1300000 && y > 6000000 && y < 7200000);
}

// ===================================================
// PARSING GML (identique au fichier de référence)
// ===================================================

/**
 * Parse un bloc <gml:Polygon> complet (avec trous éventuels)
 */
export function parseGmlPolygon(gmlString) {
    const coordRegex = /<gml:coordinates>([\s\S]*?)<\/gml:coordinates>/g;
    const matches = [...gmlString.matchAll(coordRegex)];
    if (matches.length === 0) return null;

    function parseRing(rawText) {
        const ring = [];
        const pairs = rawText.trim().split(/\s+/);
        for (const pair of pairs) {
            if (!pair) continue;
            const [x, y] = pair.split(',').map(Number);
            if (!isNaN(x) && !isNaN(y)) ring.push(lambert93ToLatLng(x, y));
        }
        return ring;
    }

    const outerRing = parseRing(matches[0][1]);
    if (outerRing.length < 3) return null;

    const holes = [];
    for (let i = 1; i < matches.length; i++) {
        const hole = parseRing(matches[i][1]);
        if (hole.length >= 3) holes.push(hole);
    }

    return holes.length > 0 ? [outerRing, ...holes] : outerRing;
}

/**
 * Parse un bloc <gml:LineString>
 */
export function parseGmlLineString(gmlString) {
    const match = gmlString.match(/<gml:coordinates>([\s\S]*?)<\/gml:coordinates>/);
    if (!match) return null;
    const points = [];
    const pairs = match[1].trim().split(/\s+/);
    for (const pair of pairs) {
        if (!pair) continue;
        const [x, y] = pair.split(',').map(Number);
        if (!isNaN(x) && !isNaN(y)) points.push(lambert93ToLatLng(x, y));
    }
    return points.length >= 2 ? points : null;
}

/**
 * Parse un bloc <gml:Point>
 */
export function parseGmlPoint(gmlString) {
    const match = gmlString.match(/<gml:coordinates>([\s\S]*?)<\/gml:coordinates>/);
    if (!match) return null;
    const [x, y] = match[1].trim().split(',').map(Number);
    if (isNaN(x) || isNaN(y)) return null;
    return lambert93ToLatLng(x, y);
}

// ===================================================
// PARSING DES COORDONNÉES — format tableau
// ===================================================

function parseCoord(coordStr) {
    if (!coordStr) return null;

    // Objet {lat, lng}
    if (typeof coordStr === 'object' && !Array.isArray(coordStr) && coordStr.lat !== undefined) {
        return [coordStr.lat, coordStr.lng];
    }

    // Tableau numérique [a, b]
    if (Array.isArray(coordStr) && coordStr.length === 2) {
        const [a, b] = coordStr;
        if (typeof a === 'number' && typeof b === 'number') {
            if (isLambert93(a, b)) return lambert93ToLatLng(a, b);
            // GeoJSON [lng, lat]
            if (Math.abs(a) <= 20 && b >= 40 && b <= 55) return [b, a];
            return [a, b];
        }
    }

    // Chaîne "a,b"
    if (typeof coordStr === 'string') {
        const parts = coordStr.split(',').map(p => parseFloat(p.trim()));
        if (parts.length === 2 && !isNaN(parts[0]) && !isNaN(parts[1])) {
            const [a, b] = parts;
            if (isLambert93(a, b)) return lambert93ToLatLng(a, b);
            if (Math.abs(a) <= 20 && b >= 40 && b <= 55) return [b, a];
            return [a, b];
        }
    }

    return null;
}

function parseGeometry(coordsArray) {
    if (!coordsArray || !Array.isArray(coordsArray)) return null;
    const points = [];
    for (const coord of coordsArray) {
        const ll = parseCoord(coord);
        if (ll) points.push(ll);
    }
    return points.length >= 2 ? points : null;
}

// ===================================================
// COULEURS / STYLES SNA
// ===================================================
const SNA_CATEGORIE_STYLE = {
    EA: { color: '#0277bd', fill: '#b3e5fc', label: '🏗️ Espace artificialisé' },
    AT: { color: '#bf360c', fill: '#ffccbc', label: '🌲 Autre terre' },
    VG: { color: '#2e7d32', fill: '#c8e6c9', label: '🌳 Végétation' }
};

const SNA_TYPE_LABELS = {
    B1: 'Bâtiment',
    B2: 'Route, chemin ou voie ferrée',
    B3: 'Surface aménagée',
    A1: 'Mare',
    A2: 'Surface en eau non maçonnée (hors mare)',
    A3: 'Surface en eau maçonnée',
    A4: 'Fossé non maçonné',
    A5: 'Fossé maçonné',
    A6: 'Affleurement rocheux',
    A7: 'Mur traditionnel en pierre (IAE)',
    V1: 'Arbre isolé',
    V2: 'Arbres alignés',
    V3: 'Bosquet',
    V4: 'Haie',
    V5: 'Forêt',
    V6: 'Broussailles',
    V7: 'Autre surface végétale non agricole',
    V8: 'Végétation non agricole non caractérisée'
};

function getCatFromType(typeCode) {
    if (!typeCode) return 'AT';
    const c = typeCode[0];
    if (c === 'B') return 'EA';
    if (c === 'V') return 'VG';
    return 'AT';
}

function getSnaStyle(sna) {
    const cat = sna.categorieSna || getCatFromType(sna.typeSna);
    return SNA_CATEGORIE_STYLE[cat] || SNA_CATEGORIE_STYLE.AT;
}

// ===================================================
// INIT MAP (exportée)
// ===================================================
export function initMap(ilotsGeo, parcelsGeo, maecGeo, snaList = []) {
    resetMap();
    snaData = snaList;

    // Création de la carte avec un fond CartoDB
    currentMap = L.map('map').setView([48.25, -0.93], 12);

    // Fonds de carte (comme dans le HTML de référence)
    var cartoDB = L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a> & CartoDB',
        subdomains: 'abcd', maxZoom: 19, minZoom: 6
    });
    var googleSat = L.tileLayer('https://{s}.google.com/vt/lyrs=s&x={x}&y={y}&z={z}', {
        maxZoom: 20, subdomains: ['mt0','mt1','mt2','mt3'], attribution: '© Google'
    });
    var googleHybrid = L.tileLayer('https://{s}.google.com/vt/lyrs=s,h&x={x}&y={y}&z={z}', {
        maxZoom: 20, subdomains: ['mt0','mt1','mt2','mt3'], attribution: '© Google'
    });
    var esriSat = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
        attribution: '© ESRI', maxZoom: 24
    });

    L.control.layers({
        "🗺️ Carte classique": cartoDB,
        "🛰️ Satellite": googleSat,
        "🛰️ Hybride": googleHybrid,
        "🛰️ ESRI": esriSat
    }).addTo(currentMap);

    cartoDB.addTo(currentMap);

    currentIlotGroup   = L.layerGroup().addTo(currentMap);
    currentParcelGroup = L.layerGroup().addTo(currentMap);
    currentMaecSGroup  = L.layerGroup().addTo(currentMap);
    currentMaecSLGroup = L.layerGroup().addTo(currentMap);
    currentMaecPGroup  = L.layerGroup().addTo(currentMap);

    let allLatLngs = [];
    let parcelCount = 0;
    let maecCount   = 0;

    // ─── 1. ÎLOTS ────────────────────────────────────
    ilotsGeo.forEach(ilot => {
        const parsedGeom = parseGeometry(ilot.geom);
        if (!parsedGeom || parsedGeom.length < 3) return;
        const poly = L.polygon(parsedGeom, {
            color: '#9e9e9e', weight: 2, opacity: 0.7,
            fillOpacity: 0.1, fillColor: '#bdbdbd'
        });
        poly.addTo(currentIlotGroup);
        poly.bindPopup(`<b>🏷️ Îlot ${ilot.numero}</b><br>Référence : ${ilot.reference || '—'}`);
        parsedGeom.forEach(ll => allLatLngs.push(ll));
    });

    // ─── 2. PARCELLES (avec couleurs améliorées) ────────────────
    parcelsGeo.forEach(parcel => {
        const parsedGeom = parseGeometry(parcel.geom);
        if (!parsedGeom || parsedGeom.length < 3) return;
        parcelCount++;
        // Utilisation de la fonction de couleur améliorée
        const colors = getCultureColorImproved(parcel.culture);
        const poly = L.polygon(parsedGeom, {
            color: colors.color, weight: 2, opacity: 0.8,
            fillOpacity: 0.5, fillColor: colors.fill
        });
        poly.addTo(currentParcelGroup);
        const surfHa = parcel.surface ? (parseFloat(parcel.surface) / 100).toFixed(2) : '?';
        poly.bindPopup(`
            <b>🌾 ${parcel.culture}</b><br>
            Îlot : ${parcel.ilot} | Parcelle : ${parcel.parcelle}<br>
            Surface : ${surfHa.replace('.', ',')} ha
        `);
        parsedGeom.forEach(ll => allLatLngs.push(ll));
    });

    // ─── 3. MAEC ─────────────────────────────────────
    const allMaec = [
        ...(maecGeo.surfaciques || []),
        ...(maecGeo.lineaires || []),
        ...(maecGeo.ponctuelles || [])
    ];

    allMaec.forEach(maec => {
        const type = (maec.sousType || '').toUpperCase();

        if (type === 'S') {
            const parsedGeom = parseGeometry(maec.geom);
            if (!parsedGeom || parsedGeom.length < 3) return;
            maecCount++;
            const poly = L.polygon(parsedGeom, {
                color: '#1e88e5', weight: 2, opacity: 0.8,
                fillOpacity: 0.3, fillColor: '#42a5f5'
            });
            poly.addTo(currentMaecSGroup);
            poly.bindPopup(maecPopup('🌿 MAEC Surfacique', maec));
            parsedGeom.forEach(ll => allLatLngs.push(ll));

        } else if (type === 'L') {
            const parsedGeom = parseGeometry(maec.geom);
            if (!parsedGeom || parsedGeom.length < 2) return;
            maecCount++;
            const line = L.polyline(parsedGeom, {
                color: '#ff8c00', weight: 3, opacity: 0.9
            });
            line.addTo(currentMaecSLGroup);
            line.bindPopup(maecPopup('📏 MAEC Linéaire', maec));
            parsedGeom.forEach(ll => allLatLngs.push(ll));

        } else if (type === 'P') {
            const ll = parseCoord(maec.geom);
            if (!ll) return;
            maecCount++;
            const marker = L.circleMarker(ll, {
                radius: 6, color: '#d32f2f', weight: 2, opacity: 0.9,
                fillOpacity: 0.7, fillColor: '#ef5350'
            });
            marker.addTo(currentMaecPGroup);
            marker.bindPopup(maecPopup('🔴 MAEC Ponctuelle', maec));
            allLatLngs.push(ll);
        }
    });

    // ─── 4. SNA ──────────────────────────────────────
    buildSnaLayers(snaList);

    // Centrage amélioré
    fitBounds(allLatLngs, parcelsGeo);
    updateLegend(parcelsGeo, ilotsGeo, maecGeo, maecCount, snaList);

    const statsSpan = document.getElementById('map-stats');
    if (statsSpan) {
        statsSpan.innerHTML =
            `📍 ${ilotsGeo.length} îlot(s) | 🌾 ${parcelCount} parcelle(s) | 🌿 ${maecCount} MAEC | 🏗️ ${snaList.length} SNA`;
    }

    setupLayerControls();
    buildSnaFilterUI(snaList);
}

// ===================================================
// SNA — CONSTRUCTION DES COUCHES
// ===================================================
function buildSnaLayers(snaList) {
    snaLayerGroups = {};

    for (const sna of snaList) {
        const typeCode = sna.typeSna || 'XX';
        if (!snaLayerGroups[typeCode]) {
            snaLayerGroups[typeCode] = L.layerGroup().addTo(currentMap);
        }

        const style = getSnaStyle(sna);
        const popup = snaPopup(sna);

        if (sna.geom && Array.isArray(sna.geom) && sna.geom.length >= 3) {
            const parsedGeom = parseGeometry(sna.geom);
            if (parsedGeom && parsedGeom.length >= 3) {
                const poly = L.polygon(parsedGeom, {
                    color: style.color, weight: 2, opacity: 0.9,
                    fillOpacity: 0.40, fillColor: style.fill, dashArray: '4, 3'
                });
                poly.bindPopup(popup);
                poly.addTo(snaLayerGroups[typeCode]);
            }
        }
        else if (sna.geomLine && Array.isArray(sna.geomLine) && sna.geomLine.length >= 2) {
            const parsedGeom = parseGeometry(sna.geomLine);
            if (parsedGeom && parsedGeom.length >= 2) {
                const line = L.polyline(parsedGeom, {
                    color: style.color, weight: 4, opacity: 0.9, dashArray: '8, 4'
                });
                line.bindPopup(popup);
                line.addTo(snaLayerGroups[typeCode]);
            }
        }
        else if (sna.geomPoint) {
            const ll = parseCoord(sna.geomPoint);
            if (ll) {
                const marker = L.circleMarker(ll, {
                    radius: 8, color: style.color, weight: 2, opacity: 0.95,
                    fillOpacity: 0.80, fillColor: style.fill
                });
                marker.bindPopup(popup);
                marker.addTo(snaLayerGroups[typeCode]);
            }
        }
    }
}

function snaPopup(sna) {
    const cat     = sna.categorieSna || getCatFromType(sna.typeSna) || '—';
    const style   = SNA_CATEGORIE_STYLE[cat] || SNA_CATEGORIE_STYLE.AT;
    const typeLib = SNA_TYPE_LABELS[sna.typeSna] || sna.typeSna || '—';
    const surfHa  = sna.surfaceGraphique ? sna.surfaceGraphique.toFixed(4).replace('.', ',') : '—';
    const ilots   = sna.ilots?.length ? sna.ilots.join(', ') : '—';
    const largeur  = sna.largeurCalculee ? sna.largeurCalculee.toFixed(1).replace('.', ',') + ' m' : null;
    const longueur = sna.longueurIae    ? sna.longueurIae.toFixed(0).replace('.', ',') + ' m'     : null;
    const date     = sna.dateMiseAjour  ? `<br><span style="color:#888;font-size:0.75rem">MAJ : ${sna.dateMiseAjour}</span>` : '';

    return `
        <div style="min-width:210px;font-size:0.85rem;line-height:1.7">
            <div style="margin-bottom:6px">
                <span style="background:${style.fill};color:${style.color};padding:2px 10px;border-radius:10px;
                    font-size:0.78rem;font-weight:700;border:1px solid ${style.color}">${style.label}</span>
            </div>
            <b>N° SNA :</b> ${sna.numeroSna || '—'}<br>
            <b>Type :</b> <code>${sna.typeSna}</code> — ${typeLib}<br>
            <b>Surface :</b> ${surfHa} ha<br>
            ${largeur  ? `<b>Largeur :</b> ${largeur}<br>` : ''}
            ${longueur ? `<b>Longueur IAE :</b> ${longueur}<br>` : ''}
            <b>Îlot(s) :</b> ${ilots}
            ${sna.parcelleAssociee ? `<br><b>Parcelle :</b> ${sna.parcelleAssociee}` : ''}
            ${date}
        </div>
    `;
}

// ===================================================
// SNA — FILTRES
// ===================================================
function buildSnaFilterUI(snaList) {
    const container = document.getElementById('sna-map-filters');
    if (!container) return;

    if (!snaList.length) {
        container.innerHTML = '<span style="color:#aaa;font-size:0.8rem">Aucune SNA</span>';
        return;
    }

    const byCategorie = {};
    for (const sna of snaList) {
        const cat = sna.categorieSna || getCatFromType(sna.typeSna) || 'AT';
        const type = sna.typeSna || 'XX';
        if (!byCategorie[cat]) byCategorie[cat] = {};
        byCategorie[cat][type] = (byCategorie[cat][type] || 0) + 1;
    }

    const catOrder = ['EA', 'AT', 'VG'];
    let catHtml = '';
    for (const cat of catOrder) {
        if (!byCategorie[cat]) continue;
        const catStyle = SNA_CATEGORIE_STYLE[cat] || SNA_CATEGORIE_STYLE.AT;
        const types = Object.entries(byCategorie[cat]);
        const total = types.reduce((s, [, n]) => s + n, 0);

        catHtml += `
            <div class="sna-filter-cat">
                <div style="display:flex;align-items:center;gap:6px;padding:4px 0;border-bottom:1px solid #e8f0e5">
                    <input type="checkbox" class="sna-cat-cb" data-cat="${cat}" checked style="width:14px;height:14px;accent-color:${catStyle.color}">
                    <span style="background:${catStyle.fill};color:${catStyle.color};padding:2px 8px;border-radius:10px;font-size:0.72rem;font-weight:700">${catStyle.label}</span>
                    <span style="color:#999;font-size:0.72rem">${total} SNA</span>
                </div>
                <div style="padding-left:6px">
                    ${types.map(([typeCode, count]) => `
                        <label style="display:flex;align-items:center;gap:5px;cursor:pointer;padding:2px 0;font-size:0.76rem">
                            <input type="checkbox" class="sna-type-cb" data-type="${typeCode}" data-cat="${cat}" checked style="width:12px;height:12px;accent-color:${catStyle.color}">
                            <code style="font-weight:700;color:${catStyle.color};font-size:0.75rem;min-width:22px">${typeCode}</code>
                            <span style="flex:1">${SNA_TYPE_LABELS[typeCode] || typeCode}</span>
                            <span style="color:#bbb">(${count})</span>
                        </label>
                    `).join('')}
                </div>
            </div>
        `;
    }

    container.innerHTML = `
        <div style="display:flex;gap:5px;margin-bottom:8px">
            <button id="sna-all-btn" style="flex:1;padding:3px;border-radius:20px;border:1px solid #b8d4b8;background:#eef5ea;font-size:0.72rem;cursor:pointer">✅ Tous</button>
            <button id="sna-none-btn" style="flex:1;padding:3px;border-radius:20px;border:1px solid #e0b8b8;background:#fef0f0;font-size:0.72rem;cursor:pointer">❌ Aucun</button>
        </div>
        <div style="font-size:0.72rem;color:#557055;text-align:right;margin-bottom:6px">
            <span id="sna-map-count">${snaList.length} / ${snaList.length}</span>
        </div>
        ${catHtml}
    `;

    container.querySelectorAll('.sna-type-cb').forEach(cb => cb.addEventListener('change', () => applySnaFilter(container)));
    container.querySelectorAll('.sna-cat-cb').forEach(cb => cb.addEventListener('change', () => {
        const cat = cb.dataset.cat;
        container.querySelectorAll(`.sna-type-cb[data-cat="${cat}"]`).forEach(t => t.checked = cb.checked);
        applySnaFilter(container);
    }));
    document.getElementById('sna-all-btn')?.addEventListener('click', () => {
        container.querySelectorAll('.sna-type-cb, .sna-cat-cb').forEach(cb => cb.checked = true);
        applySnaFilter(container);
    });
    document.getElementById('sna-none-btn')?.addEventListener('click', () => {
        container.querySelectorAll('.sna-type-cb, .sna-cat-cb').forEach(cb => cb.checked = false);
        applySnaFilter(container);
    });
}

function applySnaFilter(container) {
    const activeTypes = new Set();
    container.querySelectorAll('.sna-type-cb:checked').forEach(cb => activeTypes.add(cb.dataset.type));

    let visibleCount = 0;
    for (const [typeCode, group] of Object.entries(snaLayerGroups)) {
        if (!currentMap) continue;
        if (activeTypes.has(typeCode)) {
            if (!currentMap.hasLayer(group)) group.addTo(currentMap);
            visibleCount += group.getLayers ? group.getLayers().length : 0;
        } else {
            if (currentMap.hasLayer(group)) group.remove();
        }
    }

    const countEl = document.getElementById('sna-map-count');
    if (countEl) countEl.textContent = `${visibleCount} / ${snaData.length} affichées`;
}

// ===================================================
// HELPERS
// ===================================================
function maecPopup(titre, maec) {
    const num = maec.numero || '—';
    const code = maec.code || '—';
    const sousType = maec.sousType || '—';
    const debut = maec.premiereC || null;
    const fin = maec.derniereC || null;
    let campagnes;
    if (debut && fin) campagnes = `${debut} → ${fin}`;
    else if (debut) campagnes = `Depuis ${debut}`;
    else if (fin) campagnes = `Jusqu'en ${fin}`;
    else campagnes = '⚠️ Élément modifié';
    return `<b>${titre}</b><br>Numéro : <b>${num}</b><br>Code : ${code}<br>Sous-type : ${sousType}<br>Campagnes : ${campagnes}`;
}

function fitBounds(allLatLngs, parcelsGeo) {
    console.log('_fitBounds - nombre de points:', allLatLngs.length);
    
    const valid = allLatLngs.filter(Boolean);
    if (valid.length === 0) {
        currentMap.setView([48.25, -0.93], 12);
        return;
    }
    
    try {
        const bounds = L.latLngBounds(valid);
        if (!bounds.isValid()) {
            currentMap.setView([48.25, -0.93], 12);
            return;
        }
        currentMap.fitBounds(bounds, { padding: [40, 40], maxZoom: 16 });
        console.log('Carte centrée sur:', bounds.getCenter());
    } catch (e) {
        console.warn('Erreur bounds:', e);
        currentMap.setView([48.25, -0.93], 12);
    }
}

function updateLegend(parcelsGeo, ilotsGeo, maecGeo, maecCount, snaList) {
    const legendDiv = document.getElementById('map-legend-items');
    if (!legendDiv) return;
    
    let legendHtml = '';
    
    // Cultures uniques
    const uniqueCultures = [...new Set(parcelsGeo.map(p => p.culture))];
    uniqueCultures.forEach(culture => {
        const colors = getCultureColorImproved(culture);
        legendHtml += `<div class="legend-item"><div class="legend-color" style="background: ${colors.color};"></div><span>${culture}</span></div>`;
    });
    
    // Îlots
    if (ilotsGeo.length > 0) {
        legendHtml += `<div class="legend-item"><div class="legend-color" style="background: #9e9e9e;"></div><span>Îlots PAC</span></div>`;
    }
    
    // MAEC
    if (maecCount > 0) {
        legendHtml += `<div style="margin-top:5px; border-top:1px solid #ccc; padding-top:3px;"><strong>MAEC</strong></div>`;
        legendHtml += `<div class="legend-item"><div class="legend-color" style="background: #1e88e5;"></div><span>Surfacique</span></div>`;
        legendHtml += `<div class="legend-item"><div class="legend-line" style="background: #ff8c00;"></div><span>Linéaire</span></div>`;
        legendHtml += `<div class="legend-item"><div class="legend-point" style="background: #d32f2f;"></div><span>Ponctuelle</span></div>`;
    }
    
    // SNA
    if (snaList.length > 0) {
        legendHtml += `<div style="margin-top:5px; border-top:1px solid #ccc; padding-top:3px;"><strong>SNA</strong></div>`;
        legendHtml += `<div class="legend-item"><div class="legend-color" style="background: #0277bd;"></div><span>Artificialisé</span></div>`;
        legendHtml += `<div class="legend-item"><div class="legend-color" style="background: #bf360c;"></div><span>Autre terre</span></div>`;
        legendHtml += `<div class="legend-item"><div class="legend-color" style="background: #2e7d32;"></div><span>Végétation</span></div>`;
    }
    
    legendDiv.innerHTML = legendHtml || 'Aucune donnée';
}

function setupLayerControls() {
    const toggleIlots = document.getElementById('toggleIlots');
    const toggleParcelles = document.getElementById('toggleParcelles');
    
    if (toggleIlots) toggleIlots.onclick = () => toggleIlots.checked ? currentIlotGroup.addTo(currentMap) : currentIlotGroup.remove();
    if (toggleParcelles) toggleParcelles.onclick = () => toggleParcelles.checked ? currentParcelGroup.addTo(currentMap) : currentParcelGroup.remove();
    
    const toggleMaec = document.getElementById('toggleMaec');
    if (toggleMaec) {
        toggleMaec.checked = true;
        toggleMaec.onclick = () => {
            if (toggleMaec.checked) {
                currentMaecSGroup.addTo(currentMap);
                currentMaecSLGroup.addTo(currentMap);
                currentMaecPGroup.addTo(currentMap);
            } else {
                currentMaecSGroup.remove();
                currentMaecSLGroup.remove();
                currentMaecPGroup.remove();
            }
        };
    }
    
    const toggleSNA = document.getElementById('toggleSNA');
    if (toggleSNA) {
        toggleSNA.checked = true;
        toggleSNA.onclick = () => {
            if (toggleSNA.checked) Object.values(snaLayerGroups).forEach(g => g.addTo(currentMap));
            else Object.values(snaLayerGroups).forEach(g => g.remove());
        };
    }
}

export function invalidateMapSize() {
    if (currentMap) setTimeout(() => currentMap.invalidateSize(), 100);
}