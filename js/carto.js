// js/carto.js
import { getCultureColor } from './data.js';

let currentMap = null;
let currentIlotGroup    = null;
let currentParcelGroup  = null;
let currentMaecSGroup   = null;   // Surfaciques (S)
let currentMaecSLGroup  = null;   // Linéaires surfaciques (SL)
let currentMaecPGroup   = null;   // Ponctuelles (P)

// ===================================================
// RESET — appelé par main.js au rechargement fichier
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
}

export function initMap(ilotsGeo, parcelsGeo, maecGeo) {
  resetMap();

  currentMap = L.map('map').setView([46.5, 2.5], 6);

  // ── Fonds de carte ──────────────────────────────
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

  var baseMaps = {
    "🗺️ Carte classique": cartoDB,
    "🛰️ Satellite":       googleSat,
    "🛰️ Hybride":         googleHybrid,
    "🛰️ ESRI":            esriSat
  };

  cartoDB.addTo(currentMap);
  L.control.layers(baseMaps).addTo(currentMap);

  // ── Groupes de couches ──────────────────────────
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

  // ─── 3. MAEC — répartition par sous-type ─────────
  const allMaec = [
    ...maecGeo.surfaciques,
    ...maecGeo.lineaires,
    ...maecGeo.ponctuelles
  ];

  allMaec.forEach(maec => {
    const type = (maec.sousType || '').toUpperCase();

    if (type === 'S') {
      // ── Surfacique S : polygone plein vert ──
      if (!maec.geom || maec.geom.length < 3) return;
      maecCount++;
      const poly = L.polygon(maec.geom, {
        color:       '#2e7d32',
        weight:      2,
        opacity:     0.9,
        fillOpacity: 0.30,
        fillColor:   '#66bb6a',
        dashArray:   '6, 4'
      });
      poly.addTo(currentMaecSGroup);
      poly.bindPopup(_maecPopup('🟢 MAEC Surfacique', maec));
      maec.geom.forEach(ll => allLatLngs.push(_toLatLng(ll)));

    } else if (type === 'SL') {
      // ── Linéaire SL : polygone fin = linéaire, rendu en orange épais ──
      if (!maec.geom || maec.geom.length < 2) return;
      maecCount++;
      // On dessine comme un polyline en utilisant le centroïde des points
      // mais si c'est un polygon on le trace normalement en style "ligne"
      const poly = L.polygon(maec.geom, {
        color:       '#e65100',
        weight:      3,
        opacity:     0.95,
        fillOpacity: 0.50,
        fillColor:   '#ff8c00',
        dashArray:   null
      });
      poly.addTo(currentMaecSLGroup);
      poly.bindPopup(_maecPopup('🟠 MAEC Linéaire (SL)', maec));
      maec.geom.forEach(ll => allLatLngs.push(_toLatLng(ll)));

    } else if (type === 'L') {
      // ── Linéaire L : polyline orange ──
      if (!maec.geom || maec.geom.length < 2) return;
      maecCount++;
      const line = L.polyline(maec.geom, {
        color:   '#e65100',
        weight:  4,
        opacity: 0.95,
        dashArray: '10, 4'
      });
      line.addTo(currentMaecSLGroup);
      line.bindPopup(_maecPopup('🟠 MAEC Linéaire', maec));
      maec.geom.forEach(ll => allLatLngs.push(_toLatLng(ll)));

    } else if (type === 'P') {
      // ── Ponctuelle P : marqueur rond rouge ──
      const ll = _toLatLng(maec.geom);
      if (!ll) return;
      maecCount++;
      const marker = L.circleMarker(ll, {
        radius:      9,
        color:       '#b71c1c',
        weight:      2,
        opacity:     0.95,
        fillOpacity: 0.80,
        fillColor:   '#ef5350'
      });
      marker.addTo(currentMaecPGroup);
      marker.bindPopup(_maecPopup('🔴 MAEC Ponctuelle', maec));
      allLatLngs.push(ll);

    } else {
      // Fallback générique
      if (maec.geom && maec.geom.length >= 3) {
        maecCount++;
        const poly = L.polygon(maec.geom, {
          color: '#1e88e5', weight: 2, opacity: 0.8,
          fillOpacity: 0.25, fillColor: '#42a5f5', dashArray: '5, 5'
        });
        poly.addTo(currentMaecSGroup);
        poly.bindPopup(_maecPopup('🌿 MAEC', maec));
        maec.geom.forEach(ll => allLatLngs.push(_toLatLng(ll)));
      }
    }
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

/**
 * Construit l'infobulle d'un élément MAEC.
 * Affiche numéro, code mesure, sous-type et campagnes.
 * Si les campagnes sont absentes → "élément modifié".
 */
function _maecPopup(titre, maec) {
  const num       = maec.numero    || '—';
  const code      = maec.code      || '—';
  const sousType  = maec.sousType  || '—';
  const debut     = maec.premiereC || null;
  const fin       = maec.derniereC || null;

  let campagnes;
  if (debut && fin) {
    campagnes = `${debut} → ${fin}`;
  } else if (debut) {
    campagnes = `Depuis ${debut}`;
  } else if (fin) {
    campagnes = `Jusqu'en ${fin}`;
  } else {
    campagnes = `<em style="color:#e65100">⚠️ Élément modifié</em>`;
  }

  return `
    <b>${titre}</b><br>
    Numéro élément : <b>${num}</b><br>
    Code mesure : ${code}<br>
    Sous-type : ${sousType}<br>
    Campagnes : ${campagnes}
  `;
}

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

  // Cultures
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
    if (uniqueCultures.length > 8)
      html += `<div style="font-size:0.65rem;color:#888;margin-bottom:8px">+ ${uniqueCultures.length - 8} autre(s)</div>`;
  }

  // Îlots
  if (ilotsGeo.length) {
    html += `<div style="margin-bottom:4px"><strong>🗺️ Limites</strong></div>
      <div style="display:flex;align-items:center;gap:3px;margin-bottom:10px">
        <div style="background:#9e9e9e;width:20px;height:2px"></div>
        <span style="font-size:0.7rem">Îlots PAC (${ilotsGeo.length})</span>
      </div>`;
  }

  // MAEC par sous-type
  if (maecCount > 0) {
    // Compter par sous-type
    const allMaec = [
      ...maecGeo.surfaciques,
      ...maecGeo.lineaires,
      ...maecGeo.ponctuelles
    ];
    const countS  = allMaec.filter(m => (m.sousType || '').toUpperCase() === 'S').length;
    const countSL = allMaec.filter(m => (m.sousType || '').toUpperCase() === 'SL').length;
    const countL  = allMaec.filter(m => (m.sousType || '').toUpperCase() === 'L').length;
    const countP  = allMaec.filter(m => (m.sousType || '').toUpperCase() === 'P').length;

    html += `<div style="margin-bottom:4px"><strong>🌿 MAEC</strong></div>
      <div style="display:flex;flex-direction:column;gap:5px">`;

    if (countS > 0)
      html += `<div style="display:flex;align-items:center;gap:5px">
        <div style="background:#66bb6a;width:16px;height:11px;border-radius:2px;border:2px dashed #2e7d32"></div>
        <span style="font-size:0.7rem">Surfacique S (${countS})</span></div>`;

    if (countSL > 0)
      html += `<div style="display:flex;align-items:center;gap:5px">
        <div style="background:#ff8c00;width:22px;height:5px;border-radius:1px"></div>
        <span style="font-size:0.7rem">Linéaire SL (${countSL})</span></div>`;

    if (countL > 0)
      html += `<div style="display:flex;align-items:center;gap:5px">
        <div style="background:#e65100;width:22px;height:4px;border-radius:1px;border-top:2px dashed #e65100"></div>
        <span style="font-size:0.7rem">Linéaire L (${countL})</span></div>`;

    if (countP > 0)
      html += `<div style="display:flex;align-items:center;gap:5px">
        <div style="background:#ef5350;width:10px;height:10px;border-radius:50%;border:2px solid #b71c1c"></div>
        <span style="font-size:0.7rem">Ponctuelle P (${countP})</span></div>`;

    html += `</div>`;
  }

  legendDiv.innerHTML = html || 'Aucune donnée';
}

function _setupLayerControls() {
  const toggleIlots      = document.getElementById('toggleIlots');
  const toggleParcelles  = document.getElementById('toggleParcelles');
  const toggleMaecS      = document.getElementById('toggleMaecS');
  const toggleMaecSL     = document.getElementById('toggleMaecSL');
  const toggleMaecP      = document.getElementById('toggleMaecP');
  // Rétrocompatibilité : si un seul checkbox "toggleMaec" existe
  const toggleMaec       = document.getElementById('toggleMaec');

  const wire = (checkbox, group) => {
    if (!checkbox || !group) return;
    checkbox.checked = true;
    checkbox.onclick = () => {
      if (checkbox.checked) group.addTo(currentMap);
      else group.remove();
    };
  };

  wire(toggleIlots,     currentIlotGroup);
  wire(toggleParcelles, currentParcelGroup);
  wire(toggleMaecS,     currentMaecSGroup);
  wire(toggleMaecSL,    currentMaecSLGroup);
  wire(toggleMaecP,     currentMaecPGroup);

  // Fallback : bouton unique qui pilote les 3 groupes MAEC
  if (toggleMaec && !toggleMaecS) {
    toggleMaec.checked = true;
    toggleMaec.onclick = () => {
      [currentMaecSGroup, currentMaecSLGroup, currentMaecPGroup].forEach(g => {
        if (!g) return;
        if (toggleMaec.checked) g.addTo(currentMap);
        else g.remove();
      });
    };
  }
}

export function invalidateMapSize() {
  if (currentMap) setTimeout(() => currentMap.invalidateSize(), 100);
}