// js/carto.js
import { getCultureColor } from './data.js';

let currentMap = null;
let currentIlotGroup = null;
let currentParcelGroup = null;
let currentMaecGroup = null;

// ===================================================
// RESET — appelé par main.js au rechargement fichier
// ===================================================
export function resetMap() {
  if (currentMap) {
    currentMap.remove();
    currentMap = null;
  }
  currentIlotGroup = null;
  currentParcelGroup = null;
  currentMaecGroup = null;
}

export function initMap(ilotsGeo, parcelsGeo, maecGeo) {
  // Toujours détruire la carte précédente avant d'en créer une nouvelle
  resetMap();

  currentMap = L.map('map').setView([46.5, 2.5], 6);

  // Définition des fonds de carte
  var cartoDB = L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a> & CartoDB',
    subdomains: 'abcd',
    maxZoom: 19,
    minZoom: 6
  });

  var googleSat = L.tileLayer('https://{s}.google.com/vt/lyrs=s&x={x}&y={y}&z={z}', {
    maxZoom: 20,
    subdomains: ['mt0', 'mt1', 'mt2', 'mt3'],
    attribution: '© Google'
  });

  var googleHybrid = L.tileLayer('https://{s}.google.com/vt/lyrs=s,h&x={x}&y={y}&z={z}', {
    maxZoom: 20,
    subdomains: ['mt0', 'mt1', 'mt2', 'mt3'],
    attribution: '© Google'
  });

  var esriSat = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
    attribution: '© ESRI',
    maxZoom: 22
  });

  var baseMaps = {
    "🗺️ Carte classique": cartoDB,
    "🛰️ Satellite": googleSat,
    "🛰️ Hybride": googleHybrid,
    "🛰️ ESRI": esriSat
  };

  // Ajout du fond par défaut
  cartoDB.addTo(currentMap);
  
  // Ajout du contrôle de couches
  L.control.layers(baseMaps).addTo(currentMap);

  currentIlotGroup   = L.layerGroup().addTo(currentMap);
  currentParcelGroup = L.layerGroup().addTo(currentMap);
  currentMaecGroup   = L.layerGroup().addTo(currentMap);

  let allLatLngs = [];
  let parcelCount = 0;
  let maecCount   = 0;

  // ─── 1. ÎLOTS ────────────────────────────────────
  ilotsGeo.forEach(ilot => {
    if (!ilot.geom || ilot.geom.length < 3) return;
    const poly = L.polygon(ilot.geom, {
      color: '#9e9e9e', weight: 2, opacity: 0.7,
      fillOpacity: 0.1, fillColor: '#bdbdbd'
    });
    poly.addTo(currentIlotGroup);
    poly.bindPopup(`<b>🏷️ Îlot ${ilot.numero}</b><br>Référence : ${ilot.reference || '—'}`);
    ilot.geom.forEach(ll => allLatLngs.push(_toLatLng(ll)));
  });

  // ─── 2. PARCELLES CULTURALES ──────────────────────
  parcelsGeo.forEach(parcel => {
    if (!parcel.geom || parcel.geom.length < 3) return;
    parcelCount++;
    const colors = getCultureColor(parcel.culture);
    const poly = L.polygon(parcel.geom, {
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
    parcel.geom.forEach(ll => allLatLngs.push(_toLatLng(ll)));
  });

  // ─── 3. MAEC SURFACIQUES ─────────────────────────
  maecGeo.surfaciques.forEach(maec => {
    if (!maec.geom || maec.geom.length < 3) return;
    maecCount++;
    const poly = L.polygon(maec.geom, {
      color: '#1e88e5', weight: 2, opacity: 0.8,
      fillOpacity: 0.25, fillColor: '#42a5f5',
      dashArray: '5, 5'
    });
    poly.addTo(currentMaecGroup);
    poly.bindPopup(`<b>🌿 MAEC Surfacique</b><br>Code : ${maec.code}`);
    maec.geom.forEach(ll => allLatLngs.push(_toLatLng(ll)));
  });

  // ─── 4. MAEC LINÉAIRES ───────────────────────────
  maecGeo.lineaires.forEach(maec => {
    if (!maec.geom || maec.geom.length < 2) return;
    maecCount++;
    const line = L.polyline(maec.geom, {
      color: '#ff8c00', weight: 3, opacity: 0.9
    });
    line.addTo(currentMaecGroup);
    line.bindPopup(`<b>📏 MAEC Linéaire</b><br>Code : ${maec.code}`);
    maec.geom.forEach(ll => allLatLngs.push(_toLatLng(ll)));
  });

  // ─── 5. MAEC PONCTUELLES ─────────────────────────
  maecGeo.ponctuelles.forEach(maec => {
    const ll = _toLatLng(maec.geom);
    if (!ll) return;
    maecCount++;
    const marker = L.circleMarker(ll, {
      radius: 8, color: '#d32f2f', weight: 2,
      opacity: 0.9, fillOpacity: 0.7, fillColor: '#ef5350'
    });
    marker.addTo(currentMaecGroup);
    marker.bindPopup(`<b>🔴 MAEC Ponctuelle</b><br>Code : ${maec.code}`);
    allLatLngs.push(ll);
  });

  // ─── ZOOM INTELLIGENT ────────────────────────────
  _fitBounds(allLatLngs, parcelsGeo);

  // ─── LÉGENDE & STATS ─────────────────────────────
  _updateLegend(parcelsGeo, ilotsGeo, maecGeo, maecCount);

  const statsSpan = document.getElementById('map-stats');
  if (statsSpan) {
    statsSpan.innerHTML =
      `📍 ${ilotsGeo.length} îlot(s) | 🌾 ${parcelCount} parcelle(s) | 🌿 ${maecCount} MAEC`;
  }

  _setupLayerControls();
}

// ===================================================
// HELPERS PRIVÉS
// ===================================================
function _toLatLng(ll) {
  if (!ll) return null;
  if (typeof ll.lat === 'number') return ll;
  if (Array.isArray(ll) && ll.length === 2) return L.latLng(ll[0], ll[1]);
  return null;
}

function _fitBounds(allLatLngs, parcelsGeo) {
  const valid = allLatLngs.filter(Boolean);
  if (valid.length === 0) {
    const first = parcelsGeo[0]?.geom?.[0];
    if (first) {
      const c = _toLatLng(first);
      if (c) { currentMap.setView(c, 14); return; }
    }
    currentMap.setView([46.5, 2.5], 7);
    return;
  }

  try {
    const bounds = L.latLngBounds(valid);
    if (!bounds.isValid()) { currentMap.setView([46.5, 2.5], 8); return; }

    const latDiff = Math.abs(bounds.getNorth() - bounds.getSouth());
    const lngDiff = Math.abs(bounds.getEast()  - bounds.getWest());

    if (latDiff < 0.0005 && lngDiff < 0.0005) {
      currentMap.setView(bounds.getCenter(), 17);
    } else {
      currentMap.fitBounds(bounds, { padding: [40, 40], maxZoom: 16, animate: true });
    }

    console.log(`Carte : étendue ${(latDiff * 111).toFixed(1)} km × ${(lngDiff * 85).toFixed(1)} km`);
  } catch (e) {
    console.warn('Erreur bounds :', e);
    currentMap.setView([46.5, 2.5], 8);
  }
}

function _updateLegend(parcelsGeo, ilotsGeo, maecGeo, maecCount) {
  const legendDiv = document.getElementById('map-legend-items');
  if (!legendDiv) return;

  let html = '';

  const uniqueCultures = [...new Set(parcelsGeo.map(p => p.culture))];
  const displayed = uniqueCultures.slice(0, 8);

  if (displayed.length) {
    html += `<div style="margin-bottom:5px"><strong>🌾 Cultures</strong></div>`;
    html += `<div style="display:flex;flex-wrap:wrap;gap:6px;margin-bottom:10px">`;
    displayed.forEach(c => {
      const col = getCultureColor(c);
      html += `<div style="display:flex;align-items:center;gap:3px">
        <div style="background:${col.fill};width:12px;height:12px;border-radius:2px;border:1px solid ${col.color}"></div>
        <span style="font-size:0.7rem">${c}</span>
      </div>`;
    });
    html += `</div>`;
    if (uniqueCultures.length > 8) {
      html += `<div style="font-size:0.65rem;color:#888;margin-bottom:8px">+ ${uniqueCultures.length - 8} autre(s)</div>`;
    }
  }

  if (ilotsGeo.length) {
    html += `<div style="margin-bottom:4px"><strong>🗺️ Limites</strong></div>
      <div style="display:flex;align-items:center;gap:3px;margin-bottom:10px">
        <div style="background:#9e9e9e;width:20px;height:2px"></div>
        <span style="font-size:0.7rem">Îlots PAC (${ilotsGeo.length})</span>
      </div>`;
  }

  if (maecCount > 0) {
    html += `<div style="margin-bottom:4px"><strong>🌿 MAEC</strong></div>
      <div style="display:flex;flex-wrap:wrap;gap:10px">`;
    if (maecGeo.surfaciques.length)
      html += `<div style="display:flex;align-items:center;gap:3px">
        <div style="background:#1e88e5;width:16px;height:10px;border-radius:2px"></div>
        <span style="font-size:0.7rem">Surfacique (${maecGeo.surfaciques.length})</span></div>`;
    if (maecGeo.lineaires.length)
      html += `<div style="display:flex;align-items:center;gap:3px">
        <div style="background:#ff8c00;width:20px;height:3px"></div>
        <span style="font-size:0.7rem">Linéaire (${maecGeo.lineaires.length})</span></div>`;
    if (maecGeo.ponctuelles.length)
      html += `<div style="display:flex;align-items:center;gap:3px">
        <div style="background:#d32f2f;width:8px;height:8px;border-radius:50%"></div>
        <span style="font-size:0.7rem">Ponctuelle (${maecGeo.ponctuelles.length})</span></div>`;
    html += `</div>`;
  }

  legendDiv.innerHTML = html || 'Aucune donnée';
}

function _setupLayerControls() {
  const toggleIlots     = document.getElementById('toggleIlots');
  const toggleParcelles = document.getElementById('toggleParcelles');
  const toggleMaec      = document.getElementById('toggleMaec');

  const wire = (checkbox, group) => {
    if (!checkbox) return;
    checkbox.checked = true;
    checkbox.onclick = () => {
      if (checkbox.checked) group.addTo(currentMap);
      else group.remove();
    };
  };

  wire(toggleIlots,     currentIlotGroup);
  wire(toggleParcelles, currentParcelGroup);
  wire(toggleMaec,      currentMaecGroup);
}

export function invalidateMapSize() {
  if (currentMap) setTimeout(() => currentMap.invalidateSize(), 100);
}
