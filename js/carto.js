// js/carto.js - Version avec gestion des polygones complexes pour îlots ET parcelles
import { getCultureColor } from './data.js';

let currentMap = null;
let currentIlotGroup    = null;
let currentParcelGroup  = null;
let currentMaecSGroup   = null;
let currentMaecSLGroup  = null;
let currentMaecPGroup   = null;

let snaLayerGroups = {};
let snaData        = [];

// ===================================================
// RESET
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
// PROJECTION
// ===================================================
if (typeof proj4 !== 'undefined') {
  proj4.defs(
    'EPSG:2154',
    '+proj=lcc +lat_1=49 +lat_2=44 +lat_0=46.5 +lon_0=3 ' +
    '+x_0=700000 +y_0=6600000 +ellps=GRS80 ' +
    '+towgs84=0,0,0,0,0,0,0 +units=m +no_defs'
  );
}

function convertToLatLng(x, y) {
  if (typeof proj4 === 'undefined') {
    return [parseFloat(y), parseFloat(x)];
  }
  const [lon, lat] = proj4('EPSG:2154', 'EPSG:4326', [parseFloat(x), parseFloat(y)]);
  return [lat, lon];
}

// ===================================================
// PARSING
// ===================================================
function parseCoord(coordStr) {
  if (!coordStr) return null;

  if (typeof coordStr === 'object' && !Array.isArray(coordStr) && coordStr.lat !== undefined) {
    return [coordStr.lat, coordStr.lng];
  }

  if (Array.isArray(coordStr) && coordStr.length === 2) {
    const [a, b] = coordStr;
    if (typeof a === 'number' && typeof b === 'number') {
      if (a > 100000 && a < 1300000 && b > 6000000 && b < 7200000) {
        return convertToLatLng(a, b);
      }
      if (Math.abs(a) <= 20 && b >= 40 && b <= 55) return [b, a];
      return [a, b];
    }
  }

  if (typeof coordStr === 'string') {
    const parts = coordStr.split(',').map(p => parseFloat(p.trim()));
    if (parts.length === 2 && !isNaN(parts[0]) && !isNaN(parts[1])) {
      const [a, b] = parts;
      if (a > 100000 && a < 1300000 && b > 6000000 && b < 7200000) {
        return convertToLatLng(a, b);
      }
      if (Math.abs(a) <= 20 && b >= 40 && b <= 55) return [b, a];
      return [a, b];
    }
  }

  return null;
}

// Fonction générique pour parser une géométrie quelconque
function parseGeometry(geom, minPoints = 3) {
  if (!geom || !Array.isArray(geom)) return null;
  
  const firstElement = geom[0];
  const result = [];
  
  // Cas 1: Polygone simple (tableau de points)
  if (Array.isArray(firstElement) && firstElement.length === 2 && typeof firstElement[0] === 'number') {
    const points = [];
    for (const coord of geom) {
      const ll = parseCoord(coord);
      if (ll) points.push(ll);
    }
    if (points.length >= minPoints) {
      result.push([points]);
    }
  }
  // Cas 2: Polygone avec trou(s) (tableau d'anneaux)
  else if (Array.isArray(firstElement) && Array.isArray(firstElement[0]) && typeof firstElement[0][0] === 'number') {
    const rings = [];
    for (const ring of geom) {
      const points = [];
      for (const coord of ring) {
        const ll = parseCoord(coord);
        if (ll) points.push(ll);
      }
      if (points.length >= 3) {
        rings.push(points);
      }
    }
    if (rings.length >= 1) {
      result.push(rings);
    }
  }
  // Cas 3: Multi-polygone
  else if (Array.isArray(firstElement) && Array.isArray(firstElement[0]) && Array.isArray(firstElement[0][0])) {
    for (const poly of geom) {
      const rings = [];
      for (const ring of poly) {
        const points = [];
        for (const coord of ring) {
          const ll = parseCoord(coord);
          if (ll) points.push(ll);
        }
        if (points.length >= 3) {
          rings.push(points);
        }
      }
      if (rings.length >= 1) {
        result.push(rings);
      }
    }
  }
  
  return result.length > 0 ? result : null;
}

// ===================================================
// STYLES SNA
// ===================================================
const SNA_CATEGORIE_STYLE = {
  EA: { color: '#0277bd', fill: '#b3e5fc', label: '🏗️ Espace artificialisé' },
  AT: { color: '#bf360c', fill: '#ffccbc', label: '🌲 Autre terre' },
  VG: { color: '#2e7d32', fill: '#c8e6c9', label: '🌳 Végétation' }
};

const SNA_TYPE_LABELS = {
  B1: 'Bâtiment', B2: 'Route, chemin ou voie ferrée', B3: 'Surface aménagée',
  A1: 'Mare', A2: 'Surface en eau non maçonnée', A3: 'Surface en eau maçonnée',
  A4: 'Fossé non maçonné', A5: 'Fossé maçonné', A6: 'Affleurement rocheux',
  A7: 'Mur traditionnel en pierre',
  V1: 'Arbre isolé', V2: 'Arbres alignés', V3: 'Bosquet', V4: 'Haie',
  V5: 'Forêt', V6: 'Broussailles', V7: 'Autre surface végétale', V8: 'Végétation non caractérisée'
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
// INIT MAP
// ===================================================
export function initMap(ilotsGeo, parcelsGeo, maecGeo, snaList = []) {
  resetMap();
  snaData = snaList;

  currentMap = L.map('map').setView([48.25, -0.93], 12);

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
  let maecCount = 0;

  // ========== 1. ÎLOTS ==========
  console.log('Nombre d\'îlots reçus:', ilotsGeo.length);

  ilotsGeo.forEach(ilot => {
    const polygonsToAdd = parseGeometry(ilot.geom, 3);
    
    if (polygonsToAdd && polygonsToAdd.length > 0) {
      for (const rings of polygonsToAdd) {
        const poly = L.polygon(rings, {
          color: '#9e9e9e', weight: 2, opacity: 0.7,
          fillOpacity: 0.1, fillColor: '#bdbdbd'
        });
        poly.addTo(currentIlotGroup);
        poly.bindPopup(`<b>🏷️ Îlot ${ilot.numero}</b><br>Référence : ${ilot.reference || '—'}`);
        for (const ring of rings) {
          ring.forEach(ll => allLatLngs.push(ll));
        }
      }
      console.log(`Îlot ${ilot.numero} ajouté avec ${polygonsToAdd.length} polygone(s)`);
    } else {
      console.warn(`Îlot ${ilot.numero} ignoré - géométrie invalide`);
    }
  });

  // ========== 2. PARCELLES ==========
  console.log('Nombre de parcelles reçues:', parcelsGeo.length);

  parcelsGeo.forEach(parcel => {
    const polygonsToAdd = parseGeometry(parcel.geom, 3);
    
    if (polygonsToAdd && polygonsToAdd.length > 0) {
      parcelCount++;
      const colors = getCultureColor(parcel.culture);
      
      for (const rings of polygonsToAdd) {
        const poly = L.polygon(rings, {
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
        
        for (const ring of rings) {
          ring.forEach(ll => allLatLngs.push(ll));
        }
      }
      console.log(`Parcelle ${parcel.ilot}-${parcel.parcelle} ajoutée avec ${polygonsToAdd.length} polygone(s)`);
    } else {
      console.warn(`Parcelle ${parcel.ilot}-${parcel.parcelle} ignorée - géométrie invalide:`, parcel.geom);
    }
  });

  // ========== 3. MAEC ==========
  const allMaec = [
    ...(maecGeo.surfaciques || []),
    ...(maecGeo.lineaires || []),
    ...(maecGeo.ponctuelles || [])
  ];

  allMaec.forEach(maec => {
    const type = (maec.sousType || '').toUpperCase();
    
    if (type === 'S') {
      const polygonsToAdd = parseGeometry(maec.geom, 3);
      if (polygonsToAdd && polygonsToAdd.length > 0) {
        maecCount++;
        for (const rings of polygonsToAdd) {
          const poly = L.polygon(rings, {
            color: '#1e88e5', weight: 2, opacity: 0.8,
            fillOpacity: 0.3, fillColor: '#42a5f5'
          });
          poly.addTo(currentMaecSGroup);
          poly.bindPopup(maecPopup('🌿 MAEC Surfacique', maec));
          for (const ring of rings) {
            ring.forEach(ll => allLatLngs.push(ll));
          }
        }
      }
    } 
    else if (type === 'L') {
      // Pour les linéaires, on prend juste les points
      let points = [];
      if (maec.geom && Array.isArray(maec.geom)) {
        for (const coord of maec.geom) {
          const ll = parseCoord(coord);
          if (ll) points.push(ll);
        }
      }
      if (points.length >= 2) {
        maecCount++;
        const line = L.polyline(points, {
          color: '#ff8c00', weight: 3, opacity: 0.9
        });
        line.addTo(currentMaecSLGroup);
        line.bindPopup(maecPopup('📏 MAEC Linéaire', maec));
        points.forEach(ll => allLatLngs.push(ll));
      }
    } 
    else if (type === 'P') {
      const ll = parseCoord(maec.geom);
      if (ll) {
        maecCount++;
        const marker = L.circleMarker(ll, {
          radius: 6, color: '#d32f2f', weight: 2, opacity: 0.9,
          fillOpacity: 0.7, fillColor: '#ef5350'
        });
        marker.addTo(currentMaecPGroup);
        marker.bindPopup(maecPopup('🔴 MAEC Ponctuelle', maec));
        allLatLngs.push(ll);
      }
    }
  });

  // ========== 4. SNA ==========
  buildSnaLayers(snaList);

  fitBounds(allLatLngs);
  updateStats(ilotsGeo, parcelCount, maecCount, snaList);
  setupLayerControls();
  buildSnaFilterUI(snaList);
  updateLegend(parcelsGeo, ilotsGeo, maecCount, snaList);
}

function buildSnaLayers(snaList) {
  snaLayerGroups = {};

  for (const sna of snaList) {
    const typeCode = sna.typeSna || 'XX';
    if (!snaLayerGroups[typeCode]) {
      snaLayerGroups[typeCode] = L.layerGroup().addTo(currentMap);
    }

    const style = getSnaStyle(sna);
    const popup = snaPopup(sna);

    // Polygone
    if (sna.geom && Array.isArray(sna.geom)) {
      const polygonsToAdd = parseGeometry(sna.geom, 3);
      if (polygonsToAdd && polygonsToAdd.length > 0) {
        for (const rings of polygonsToAdd) {
          const poly = L.polygon(rings, {
            color: style.color, weight: 2, opacity: 0.9,
            fillOpacity: 0.40, fillColor: style.fill, dashArray: '4, 3'
          });
          poly.bindPopup(popup);
          poly.addTo(snaLayerGroups[typeCode]);
        }
      }
    }
    // Ligne
    else if (sna.geomLine && Array.isArray(sna.geomLine)) {
      const points = [];
      for (const coord of sna.geomLine) {
        const ll = parseCoord(coord);
        if (ll) points.push(ll);
      }
      if (points.length >= 2) {
        const line = L.polyline(points, {
          color: style.color, weight: 4, opacity: 0.9, dashArray: '8, 4'
        });
        line.bindPopup(popup);
        line.addTo(snaLayerGroups[typeCode]);
      }
    }
    // Point
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
  const cat = sna.categorieSna || getCatFromType(sna.typeSna) || '—';
  const style = SNA_CATEGORIE_STYLE[cat] || SNA_CATEGORIE_STYLE.AT;
  const typeLib = SNA_TYPE_LABELS[sna.typeSna] || sna.typeSna || '—';
  const surfHa = sna.surfaceGraphique ? sna.surfaceGraphique.toFixed(4).replace('.', ',') : '—';
  const ilots = sna.ilots?.length ? sna.ilots.join(', ') : '—';
  const largeur = sna.largeurCalculee ? sna.largeurCalculee.toFixed(1).replace('.', ',') + ' m' : null;
  const longueur = sna.longueurIae ? sna.longueurIae.toFixed(0).replace('.', ',') + ' m' : null;
  const date = sna.dateMiseAjour ? `<br><span style="color:#888;font-size:0.75rem">MAJ : ${sna.dateMiseAjour}</span>` : '';

  return `
    <div style="min-width:210px;font-size:0.85rem;line-height:1.7">
      <div style="margin-bottom:6px">
        <span style="background:${style.fill};color:${style.color};padding:2px 10px;border-radius:10px;
          font-size:0.78rem;font-weight:700;border:1px solid ${style.color}">${style.label}</span>
      </div>
      <b>N° SNA :</b> ${sna.numeroSna || '—'}<br>
      <b>Type :</b> <code>${sna.typeSna}</code> — ${typeLib}<br>
      <b>Surface :</b> ${surfHa} ha<br>
      ${largeur ? `<b>Largeur :</b> ${largeur}<br>` : ''}
      ${longueur ? `<b>Longueur IAE :</b> ${longueur}<br>` : ''}
      <b>Îlot(s) :</b> ${ilots}
      ${sna.parcelleAssociee ? `<br><b>Parcelle :</b> ${sna.parcelleAssociee}` : ''}
      ${date}
    </div>
  `;
}

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

function fitBounds(allLatLngs) {
  const valid = allLatLngs.filter(Boolean);
  if (valid.length === 0) {
    currentMap.setView([48.25, -0.93], 12);
    return;
  }
  
  try {
    const bounds = L.latLngBounds(valid);
    if (bounds.isValid()) {
      currentMap.fitBounds(bounds, { padding: [40, 40], maxZoom: 16 });
    } else {
      currentMap.setView([48.25, -0.93], 12);
    }
  } catch (e) {
    console.warn('Erreur bounds:', e);
    currentMap.setView([48.25, -0.93], 12);
  }
}

function updateStats(ilotsGeo, parcelCount, maecCount, snaList) {
  const statsSpan = document.getElementById('map-stats');
  if (statsSpan) {
    statsSpan.innerHTML =
      `📍 ${ilotsGeo.length} îlot(s) | 🌾 ${parcelCount} parcelle(s) | 🌿 ${maecCount} MAEC | 🏗️ ${snaList.length} SNA`;
  }
}

function updateLegend(parcelsGeo, ilotsGeo, maecCount, snaList) {
  const legendDiv = document.getElementById('map-legend-items');
  if (!legendDiv) return;
  
  let html = '';
  const uniqueCultures = [...new Set(parcelsGeo.map(p => p.culture))];
  uniqueCultures.forEach(culture => {
    const colors = getCultureColor(culture);
    html += `<div class="legend-item"><div class="legend-color" style="background: ${colors.color};"></div><span>${culture}</span></div>`;
  });
  
  if (ilotsGeo.length > 0) {
    html += `<div class="legend-item"><div class="legend-color" style="background: #9e9e9e;"></div><span>Îlots PAC</span></div>`;
  }
  
  if (maecCount > 0) {
    html += `<div style="margin-top:5px; border-top:1px solid #ccc; padding-top:3px;"><strong>MAEC</strong></div>`;
    html += `<div class="legend-item"><div class="legend-color" style="background: #1e88e5;"></div><span>Surfacique</span></div>`;
    html += `<div class="legend-item"><div class="legend-line" style="background: #ff8c00;"></div><span>Linéaire</span></div>`;
    html += `<div class="legend-item"><div class="legend-point" style="background: #d32f2f;"></div><span>Ponctuelle</span></div>`;
  }
  
  if (snaList.length > 0) {
    html += `<div style="margin-top:5px; border-top:1px solid #ccc; padding-top:3px;"><strong>SNA</strong></div>`;
    html += `<div class="legend-item"><div class="legend-color" style="background: #0277bd;"></div><span>Artificialisé</span></div>`;
    html += `<div class="legend-item"><div class="legend-color" style="background: #bf360c;"></div><span>Autre terre</span></div>`;
    html += `<div class="legend-item"><div class="legend-color" style="background: #2e7d32;"></div><span>Végétation</span></div>`;
  }
  
  legendDiv.innerHTML = html || 'Aucune donnée';
}

function setupLayerControls() {
  const toggleIlots = document.getElementById('toggleIlots');
  const toggleParcelles = document.getElementById('toggleParcelles');
  const toggleMaec = document.getElementById('toggleMaec');
  const toggleSNA = document.getElementById('toggleSNA');
  
  if (toggleIlots) {
    toggleIlots.checked = true;
    toggleIlots.onclick = () => toggleIlots.checked ? currentIlotGroup.addTo(currentMap) : currentIlotGroup.remove();
  }
  if (toggleParcelles) {
    toggleParcelles.checked = true;
    toggleParcelles.onclick = () => toggleParcelles.checked ? currentParcelGroup.addTo(currentMap) : currentParcelGroup.remove();
  }
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
  if (toggleSNA) {
    toggleSNA.checked = true;
    toggleSNA.onclick = () => {
      if (toggleSNA.checked) {
        Object.values(snaLayerGroups).forEach(g => g.addTo(currentMap));
      } else {
        Object.values(snaLayerGroups).forEach(g => g.remove());
      }
    };
  }
}

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

export function invalidateMapSize() {
  if (currentMap) setTimeout(() => currentMap.invalidateSize(), 100);
}