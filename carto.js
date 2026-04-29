// js/carto.js - Version corrigée pour la gestion des trous (polygones complexes)
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
// PROJECTION (Lambert-93 vers WGS84)
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
// PARSING DES COORDONNÉES
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

/**
 * Normalise la géométrie pour Leaflet
 * Retourne un tableau de polygones, où chaque polygone est un tableau d'anneaux [[ext], [trou1], ...]
 */
function parseGeometry(geom, minPoints = 3) {
  if (!geom || !Array.isArray(geom)) return null;
  
  const result = [];
  const firstElement = geom[0];

  // Cas 1: Polygone simple [ [x,y], [x,y], ... ]
  if (typeof firstElement[0] === 'number') {
    const points = geom.map(parseCoord).filter(Boolean);
    if (points.length >= minPoints) {
      result.push([points]); 
    }
  }
  // Cas 2: Structure complexe (Polygone avec trous ou MultiPolygone)
  else {
    geom.forEach(item => {
      // Sous-cas A: C'est un anneau [ [x,y], ... ] -> On l'ajoute comme un polygone sans trou
      if (typeof item[0][0] === 'number') {
        const ring = item.map(parseCoord).filter(Boolean);
        if (ring.length >= 3) result.push([ring]);
      } 
      // Sous-cas B: C'est un MultiPolygone [ [[ext], [trou]], [[ext]] ]
      else if (Array.isArray(item[0][0])) {
        item.forEach(poly => {
          const rings = poly.map(ring => ring.map(parseCoord).filter(Boolean)).filter(r => r.length >= 3);
          if (rings.length > 0) result.push(rings);
        });
      }
    });
  }
  
  return result.length > 0 ? result : null;
}

// ===================================================
// STYLES ET LABELS
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
// INITIALISATION DE LA CARTE
// ===================================================
export function initMap(ilotsGeo, parcelsGeo, maecGeo, snaList = []) {
  resetMap();
  snaData = snaList;

  currentMap = L.map('map').setView([48.25, -0.93], 12);

  const cartoDB = L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
    attribution: '&copy; OSM & CartoDB', subdomains: 'abcd', maxZoom: 19
  });
  const googleHybrid = L.tileLayer('https://{s}.google.com/vt/lyrs=s,h&x={x}&y={y}&z={z}', {
    maxZoom: 20, subdomains: ['mt0','mt1','mt2','mt3'], attribution: '© Google'
  });

  L.control.layers({ "🗺️ Carte": cartoDB, "🛰️ Hybride": googleHybrid }).addTo(currentMap);
  cartoDB.addTo(currentMap);

  currentIlotGroup   = L.layerGroup().addTo(currentMap);
  currentParcelGroup = L.layerGroup().addTo(currentMap);
  currentMaecSGroup  = L.layerGroup().addTo(currentMap);
  currentMaecSLGroup = L.layerGroup().addTo(currentMap);
  currentMaecPGroup  = L.layerGroup().addTo(currentMap);

  let allLatLngs = [];
  let parcelCount = 0;
  let maecCount = 0;

  // 1. ÎLOTS
  ilotsGeo.forEach(ilot => {
    const polygons = parseGeometry(ilot.geom);
    if (polygons) {
      polygons.forEach(rings => {
        const poly = L.polygon(rings, {
          color: '#9e9e9e', weight: 2, opacity: 0.7, fillOpacity: 0.1, fillColor: '#bdbdbd'
        }).addTo(currentIlotGroup);
        poly.bindPopup(`<b>🏷️ Îlot ${ilot.numero}</b>`);
        rings[0].forEach(ll => allLatLngs.push(ll));
      });
    }
  });

  // 2. PARCELLES (Gestion des trous optimisée)
  parcelsGeo.forEach(parcel => {
    const polygons = parseGeometry(parcel.geom);
    if (polygons) {
      parcelCount++;
      const colors = getCultureColor(parcel.culture);
      polygons.forEach(rings => {
        const poly = L.polygon(rings, {
          color: colors.color, weight: 2, opacity: 0.8,
          fillOpacity: 0.5, fillColor: colors.fill,
          fillRule: 'evenodd' // CRITIQUE pour les trous
        }).addTo(currentParcelGroup);
        
        const surfHa = parcel.surface ? (parseFloat(parcel.surface) / 100).toFixed(2) : '?';
        poly.bindPopup(`<b>🌾 ${parcel.culture}</b><br>Surface : ${surfHa.replace('.', ',')} ha`);
        rings[0].forEach(ll => allLatLngs.push(ll));
      });
    }
  });

  // 3. MAEC (Simplifié)
  const allMaec = [...(maecGeo.surfaciques || []), ...(maecGeo.lineaires || []), ...(maecGeo.ponctuelles || [])];
  allMaec.forEach(maec => {
    const type = (maec.sousType || '').toUpperCase();
    if (type === 'S') {
      const polys = parseGeometry(maec.geom);
      if (polys) {
        maecCount++;
        polys.forEach(rings => {
          L.polygon(rings, { color: '#1e88e5', weight: 2, fillOpacity: 0.3, fillRule: 'evenodd' })
           .addTo(currentMaecSGroup).bindPopup(maecPopup('🌿 MAEC Surfacique', maec));
          rings[0].forEach(ll => allLatLngs.push(ll));
        });
      }
    } else if (type === 'L') {
      const pts = maec.geom?.map(parseCoord).filter(Boolean);
      if (pts?.length >= 2) {
        maecCount++;
        L.polyline(pts, { color: '#ff8c00', weight: 3 }).addTo(currentMaecSLGroup);
        pts.forEach(ll => allLatLngs.push(ll));
      }
    }
  });

  // 4. SNA
  buildSnaLayers(snaList);

  fitBounds(allLatLngs);
  updateStats(ilotsGeo, parcelCount, maecCount, snaList);
  setupLayerControls();
  buildSnaFilterUI(snaList);
  updateLegend(parcelsGeo, ilotsGeo, maecCount, snaList);
}

function buildSnaLayers(snaList) {
  snaLayerGroups = {};
  snaList.forEach(sna => {
    const typeCode = sna.typeSna || 'XX';
    if (!snaLayerGroups[typeCode]) snaLayerGroups[typeCode] = L.layerGroup().addTo(currentMap);
    const style = getSnaStyle(sna);

    if (sna.geom) {
      const polys = parseGeometry(sna.geom);
      polys?.forEach(rings => {
        L.polygon(rings, { color: style.color, weight: 2, fillOpacity: 0.4, dashArray: '4, 3', fillRule: 'evenodd' })
         .addTo(snaLayerGroups[typeCode]).bindPopup(snaPopup(sna));
      });
    }
  });
}

// --- Fonctions utilitaires ---

function fitBounds(allLatLngs) {
  if (allLatLngs.length === 0) return;
  const bounds = L.latLngBounds(allLatLngs);
  if (bounds.isValid()) currentMap.fitBounds(bounds, { padding: [40, 40] });
}

function maecPopup(titre, maec) {
  return `<b>${titre}</b><br>Code : ${maec.code || '—'}`;
}

function snaPopup(sna) {
  const typeLib = SNA_TYPE_LABELS[sna.typeSna] || sna.typeSna;
  return `<b>SNA : ${sna.numeroSna}</b><br>Type : ${typeLib}`;
}

function updateStats(ilots, parcels, maec, sna) {
  const el = document.getElementById('map-stats');
  if (el) el.innerHTML = `📍 ${ilots.length} îlots | 🌾 ${parcels} parcelles | 🏗️ ${sna.length} SNA`;
}

function updateLegend(parcels, ilots, maecCount, snaList) {
  const legendDiv = document.getElementById('map-legend-items');
  if (!legendDiv) return;
  let html = '';
  const uniqueCultures = [...new Set(parcels.map(p => p.culture))];
  uniqueCultures.forEach(c => {
    const colors = getCultureColor(c);
    html += `<div class="legend-item"><div class="legend-color" style="background:${colors.color}"></div><span>${c}</span></div>`;
  });
  legendDiv.innerHTML = html;
}

function setupLayerControls() {
  const controls = [
    { id: 'toggleIlots', group: currentIlotGroup },
    { id: 'toggleParcelles', group: currentParcelGroup },
    { id: 'toggleSNA', groups: snaLayerGroups }
  ];
  controls.forEach(ctrl => {
    const el = document.getElementById(ctrl.id);
    if (el) {
      el.onclick = () => {
        const show = el.checked;
        if (ctrl.group) show ? ctrl.group.addTo(currentMap) : ctrl.group.remove();
        if (ctrl.groups) Object.values(ctrl.groups).forEach(g => show ? g.addTo(currentMap) : g.remove());
      };
    }
  });
}

function buildSnaFilterUI(snaList) {
    // Garder votre logique existante de filtre ici...
}

export function invalidateMapSize() {
  if (currentMap) setTimeout(() => currentMap.invalidateSize(), 100);
}