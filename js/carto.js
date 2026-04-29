// js/carto.js - Version complète et corrigée
import { getCultureColor } from './data.js';

let currentMap = null;
let currentIlotGroup    = null;
let currentParcelGroup  = null;
let currentMaecSGroup   = null;
let currentMaecSLGroup  = null;
let currentMaecPGroup   = null;

// ── Couches SNA par type ──────────────────────────────
let snaLayerGroups = {};
let snaData        = [];

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
}

// ===================================================
// PROJECTION Lambert-93 (EPSG:2154) → WGS84
// Nécessite proj4.js chargé dans la page HTML
// ===================================================
(function _initProj4() {
  if (typeof proj4 !== 'undefined') {
    proj4.defs(
      'EPSG:2154',
      '+proj=lcc +lat_1=49 +lat_2=44 +lat_0=46.5 +lon_0=3 ' +
      '+x_0=700000 +y_0=6600000 +ellps=GRS80 ' +
      '+towgs84=0,0,0,0,0,0,0 +units=m +no_defs'
    );
  }
})();

/**
 * Détecte si une valeur est en Lambert-93 (coordonnées métriques françaises).
 * En Lambert-93 : X ∈ [100 000, 1 300 000], Y ∈ [6 000 000, 7 200 000]
 */
function _isLambert93(a, b) {
  return (a > 100000 && a < 1300000 && b > 6000000 && b < 7200000);
}

/**
 * Convertit une paire de valeurs en [lat, lng] pour Leaflet.
 * Gère automatiquement :
 *  - Lambert-93 [X, Y] → WGS84 via proj4
 *  - GeoJSON    [lng, lat] → inversé pour Leaflet
 *  - Leaflet    [lat, lng] → retourné tel quel
 */
function _toLatLng(a, b) {
  if (typeof proj4 !== 'undefined' && _isLambert93(a, b)) {
    const [lon, lat] = proj4('EPSG:2154', 'EPSG:4326', [a, b]);
    return [lat, lon];
  }
  // GeoJSON order [lng, lat] : lng ∈ [-180,20] pour la France, lat ∈ [40,55]
  if (Math.abs(a) <= 20 && b >= 40 && b <= 55) return [b, a];
  // Déjà en [lat, lng]
  return [a, b];
}

// ===================================================
// PARSING DES COORDONNÉES (unique)
// ===================================================

/**
 * Convertit n'importe quelle représentation d'un point en [lat, lng].
 * Accepte :
 *  - {lat, lng}
 *  - [a, b]  (Lambert-93, GeoJSON ou Leaflet — détecté automatiquement)
 *  - "a,b"   (idem)
 */
function _parseCoord(coordStr) {
  if (!coordStr) return null;

  // Objet {lat, lng} → déjà en WGS84 format Leaflet
  if (typeof coordStr === 'object' && !Array.isArray(coordStr) && coordStr.lat !== undefined) {
    return [coordStr.lat, coordStr.lng];
  }

  // Tableau numérique [a, b]
  if (Array.isArray(coordStr) && coordStr.length === 2) {
    const [a, b] = coordStr;
    if (typeof a === 'number' && typeof b === 'number') return _toLatLng(a, b);
  }

  // Chaîne "a,b" ou "a, b"
  if (typeof coordStr === 'string') {
    const parts = coordStr.split(',').map(p => parseFloat(p.trim()));
    if (parts.length === 2 && !isNaN(parts[0]) && !isNaN(parts[1])) {
      return _toLatLng(parts[0], parts[1]);
    }
  }

  return null;
}

function _parseGeometry(coordsArray) {
  if (!coordsArray || !Array.isArray(coordsArray)) return null;
  const points = [];
  for (const coord of coordsArray) {
    const ll = _parseCoord(coord);
    if (ll) points.push(ll);
  }
  return points.length >= 2 ? points : null;
}

// ===================================================
// COULEURS / STYLES SNA
// ===================================================
const SNA_CATEGORIE_STYLE = {
  EA: { color: '#0277bd', fill: '#b3e5fc', label: '🏗️ Espace artificialisé' },
  AT: { color: '#bf360c', fill: '#ffccbc', label: '🌲 Autre terre'          },
  VG: { color: '#2e7d32', fill: '#c8e6c9', label: '🌳 Végétation'           }
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

function _getCatFromType(typeCode) {
  if (!typeCode) return 'AT';
  const c = typeCode[0];
  if (c === 'B') return 'EA';
  if (c === 'V') return 'VG';
  return 'AT';
}

function _getSnaStyle(sna) {
  const cat = sna.categorieSna || _getCatFromType(sna.typeSna);
  return SNA_CATEGORIE_STYLE[cat] || SNA_CATEGORIE_STYLE.AT;
}

// ===================================================
// INIT MAP (exportée)
// ===================================================
export function initMap(ilotsGeo, parcelsGeo, maecGeo, snaList = []) {
  resetMap();
  snaData = snaList;

  // Centrage sur la France métropolitaine
  currentMap = L.map('map').setView([46.5, 2.5], 7);

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
    const parsedGeom = _parseGeometry(ilot.geom);
    if (!parsedGeom || parsedGeom.length < 3) return;
    const poly = L.polygon(parsedGeom, {
      color: '#9e9e9e', weight: 2, opacity: 0.7,
      fillOpacity: 0.1, fillColor: '#bdbdbd'
    });
    poly.addTo(currentIlotGroup);
    poly.bindPopup(`<b>🏷️ Îlot ${ilot.numero}</b><br>Référence : ${ilot.reference || '—'}`);
    parsedGeom.forEach(ll => allLatLngs.push(ll));
  });

  // ─── 2. PARCELLES ────────────────────────────────
  parcelsGeo.forEach(parcel => {
    const parsedGeom = _parseGeometry(parcel.geom);
    if (!parsedGeom || parsedGeom.length < 3) return;
    parcelCount++;
    const colors = getCultureColor(parcel.culture);
    const poly = L.polygon(parsedGeom, {
      color: colors.color, weight: 2, opacity: 0.8,
      fillOpacity: 0.4, fillColor: colors.fill
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
      const parsedGeom = _parseGeometry(maec.geom);
      if (!parsedGeom || parsedGeom.length < 3) return;
      maecCount++;
      const poly = L.polygon(parsedGeom, {
        color: '#2e7d32', weight: 2, opacity: 0.9,
        fillOpacity: 0.30, fillColor: '#66bb6a', dashArray: '6, 4'
      });
      poly.addTo(currentMaecSGroup);
      poly.bindPopup(_maecPopup('🟢 MAEC Surfacique', maec));
      parsedGeom.forEach(ll => allLatLngs.push(ll));

    } else if (type === 'SL') {
      const parsedGeom = _parseGeometry(maec.geom);
      if (!parsedGeom || parsedGeom.length < 2) return;
      maecCount++;
      const poly = L.polygon(parsedGeom, {
        color: '#e65100', weight: 3, opacity: 0.95,
        fillOpacity: 0.50, fillColor: '#ff8c00'
      });
      poly.addTo(currentMaecSLGroup);
      poly.bindPopup(_maecPopup('🟠 MAEC Linéaire (SL)', maec));
      parsedGeom.forEach(ll => allLatLngs.push(ll));

    } else if (type === 'L') {
      const parsedGeom = _parseGeometry(maec.geom);
      if (!parsedGeom || parsedGeom.length < 2) return;
      maecCount++;
      const line = L.polyline(parsedGeom, {
        color: '#e65100', weight: 4, opacity: 0.95, dashArray: '10, 4'
      });
      line.addTo(currentMaecSLGroup);
      line.bindPopup(_maecPopup('🟠 MAEC Linéaire', maec));
      parsedGeom.forEach(ll => allLatLngs.push(ll));

    } else if (type === 'P') {
      const ll = _parseCoord(maec.geom);
      if (!ll) return;
      maecCount++;
      const marker = L.circleMarker(ll, {
        radius: 9, color: '#b71c1c', weight: 2, opacity: 0.95,
        fillOpacity: 0.80, fillColor: '#ef5350'
      });
      marker.addTo(currentMaecPGroup);
      marker.bindPopup(_maecPopup('🔴 MAEC Ponctuelle', maec));
      allLatLngs.push(ll);

    } else {
      const parsedGeom = _parseGeometry(maec.geom);
      if (parsedGeom && parsedGeom.length >= 3) {
        maecCount++;
        const poly = L.polygon(parsedGeom, {
          color: '#1e88e5', weight: 2, opacity: 0.8,
          fillOpacity: 0.25, fillColor: '#42a5f5', dashArray: '5, 5'
        });
        poly.addTo(currentMaecSGroup);
        poly.bindPopup(_maecPopup('🌿 MAEC', maec));
        parsedGeom.forEach(ll => allLatLngs.push(ll));
      }
    }
  });

  // ─── 4. SNA ──────────────────────────────────────
  _buildSnaLayers(snaList);

  _fitBounds(allLatLngs, parcelsGeo);
  _updateLegend(parcelsGeo, ilotsGeo, maecGeo, maecCount, snaList);

  const statsSpan = document.getElementById('map-stats');
  if (statsSpan) {
    statsSpan.innerHTML =
      `📍 ${ilotsGeo.length} îlot(s) | 🌾 ${parcelCount} parcelle(s) | 🌿 ${maecCount} MAEC | 🏗️ ${snaList.length} SNA`;
  }

  _setupLayerControls();
  _buildSnaFilterUI(snaList);
}

// ===================================================
// SNA — CONSTRUCTION DES COUCHES
// ===================================================
function _buildSnaLayers(snaList) {
  snaLayerGroups = {};

  for (const sna of snaList) {
    const typeCode = sna.typeSna || 'XX';
    if (!snaLayerGroups[typeCode]) {
      snaLayerGroups[typeCode] = L.layerGroup().addTo(currentMap);
    }

    const style = _getSnaStyle(sna);
    const popup = _snaPopup(sna);

    if (sna.geom && Array.isArray(sna.geom) && sna.geom.length >= 3) {
      const parsedGeom = _parseGeometry(sna.geom);
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
      const parsedGeom = _parseGeometry(sna.geomLine);
      if (parsedGeom && parsedGeom.length >= 2) {
        const line = L.polyline(parsedGeom, {
          color: style.color, weight: 4, opacity: 0.9, dashArray: '8, 4'
        });
        line.bindPopup(popup);
        line.addTo(snaLayerGroups[typeCode]);
      }
    }
    else if (sna.geomPoint) {
      const ll = _parseCoord(sna.geomPoint);
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

function _snaPopup(sna) {
  const cat     = sna.categorieSna || _getCatFromType(sna.typeSna) || '—';
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
function _buildSnaFilterUI(snaList) {
  const container = document.getElementById('sna-map-filters');
  if (!container) return;

  if (!snaList.length) {
    container.innerHTML = '<span style="color:#aaa;font-size:0.8rem">Aucune SNA</span>';
    return;
  }

  const byCategorie = {};
  for (const sna of snaList) {
    const cat = sna.categorieSna || _getCatFromType(sna.typeSna) || 'AT';
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

  container.querySelectorAll('.sna-type-cb').forEach(cb => cb.addEventListener('change', () => _applySnaFilter(container)));
  container.querySelectorAll('.sna-cat-cb').forEach(cb => cb.addEventListener('change', () => {
    const cat = cb.dataset.cat;
    container.querySelectorAll(`.sna-type-cb[data-cat="${cat}"]`).forEach(t => t.checked = cb.checked);
    _applySnaFilter(container);
  }));
  document.getElementById('sna-all-btn')?.addEventListener('click', () => {
    container.querySelectorAll('.sna-type-cb, .sna-cat-cb').forEach(cb => cb.checked = true);
    _applySnaFilter(container);
  });
  document.getElementById('sna-none-btn')?.addEventListener('click', () => {
    container.querySelectorAll('.sna-type-cb, .sna-cat-cb').forEach(cb => cb.checked = false);
    _applySnaFilter(container);
  });
}

function _applySnaFilter(container) {
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
function _maecPopup(titre, maec) {
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

function _fitBounds(allLatLngs, parcelsGeo) {
  console.log('_fitBounds - nombre de points:', allLatLngs.length);
  if (allLatLngs.length > 0) {
    console.log('Premier point après conversion:', allLatLngs[0]);
  }
  
  const valid = allLatLngs.filter(Boolean);
  if (valid.length === 0) {
    const fallbackBounds = L.latLngBounds([41.3, -4.8], [51.1, 9.6]);
    currentMap.fitBounds(fallbackBounds, { padding: [40, 40] });
    return;
  }
  
  try {
    const bounds = L.latLngBounds(valid);
    if (!bounds.isValid()) {
      currentMap.setView([46.5, 2.5], 7);
      return;
    }
    currentMap.fitBounds(bounds, { padding: [40, 40], maxZoom: 16 });
    console.log('Carte centrée sur:', bounds.getCenter());
  } catch (e) {
    console.warn('Erreur bounds:', e);
    currentMap.setView([46.5, 2.5], 7);
  }
}

function _updateLegend(parcelsGeo, ilotsGeo, maecGeo, maecCount, snaList) {
  const legendDiv = document.getElementById('map-legend-items');
  if (!legendDiv) return;
  legendDiv.innerHTML = '📍 Légende mise à jour';
}

function _setupLayerControls() {
  const toggleIlots = document.getElementById('toggleIlots');
  const toggleParcelles = document.getElementById('toggleParcelles');
  
  if (toggleIlots) toggleIlots.onclick = () => toggleIlots.checked ? currentIlotGroup.addTo(currentMap) : currentIlotGroup.remove();
  if (toggleParcelles) toggleParcelles.onclick = () => toggleParcelles.checked ? currentParcelGroup.addTo(currentMap) : currentParcelGroup.remove();
  
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
