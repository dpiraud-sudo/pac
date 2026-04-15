// js/carto.js
import { getCultureColor } from './data.js';

let currentMap = null;
let currentIlotGroup = null;
let currentParcelGroup = null;
let currentMaecGroup = null;
let currentSnaGroup = null; // Nouveau groupe pour les SNA

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
  currentSnaGroup = null; // Réinitialiser le groupe SNA
}

export function initMap(ilotsGeo, parcelsGeo, maecGeo, snaGeo) {
  // Toujours détruire la carte précédente avant d'en créer une nouvelle
  resetMap();

  currentMap = L.map('map').setView([46.5, 2.5], 6);

  // Définition des fonds de carte (inchangé)
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
    maxZoom: 24
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

  // Création des groupes de couches
  currentIlotGroup   = L.layerGroup().addTo(currentMap);
  currentParcelGroup = L.layerGroup().addTo(currentMap);
  currentMaecGroup   = L.layerGroup().addTo(currentMap);
  currentSnaGroup    = L.layerGroup().addTo(currentMap); // Ajout du groupe SNA à la carte

  let allLatLngs = [];
  let parcelCount = 0;
  let maecCount   = 0;
  let snaCount    = 0; // Compteur de SNA

  // ─── 1. ÎLOTS (inchangé) ────────────────────────────────────
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

  // ─── 2. PARCELLES CULTURALES (inchangé) ──────────────────────
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

  // ─── 3. MAEC SURFACIQUES (inchangé) ─────────────────────────
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

  // ─── 4. MAEC LINÉAIRES (inchangé) ───────────────────────────
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

  // ─── 5. MAEC PONCTUELLES (inchangé) ─────────────────────────
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

  // === NOUVEAU : 6. SURFACES NON AGRICOLES (SNA) ===
  // Définition des styles par catégorie
  const getSnaStyle = (categorie, type) => {
    switch(categorie) {
      case 'EA': // Espace artificialisé
        return { color: '#ff7043', weight: 2, fillColor: '#ffab91', fillOpacity: 0.5 };
      case 'AT': // Autre terre
        return { color: '#8d6e63', weight: 2, fillColor: '#bcaaa4', fillOpacity: 0.5 };
      case 'VG': // Végétation
        return { color: '#66bb6a', weight: 2, fillColor: '#a5d6a7', fillOpacity: 0.5 };
      default:
        return { color: '#9e9e9e', weight: 2, fillColor: '#e0e0e0', fillOpacity: 0.5 };
    }
  };

  const getPointStyle = (categorie) => {
    switch(categorie) {
      case 'EA': return { color: '#ff7043', fillColor: '#ffab91', radius: 6 };
      case 'AT': return { color: '#8d6e63', fillColor: '#bcaaa4', radius: 6 };
      case 'VG': return { color: '#66bb6a', fillColor: '#a5d6a7', radius: 6 };
      default: return { color: '#9e9e9e', fillColor: '#e0e0e0', radius: 6 };
    }
  };

  if (snaGeo && snaGeo.length) {
    snaGeo.forEach(sna => {
      snaCount++;
      // Récupérer la géométrie principale
      let geomPoints = null;
      let geomType = null;
      
      if (sna.geom && sna.geom.length >= 3) {
        geomPoints = sna.geom;
        geomType = 'polygon';
      } else if (sna.geomLine && sna.geomLine.length >= 2) {
        geomPoints = sna.geomLine;
        geomType = 'line';
      } else if (sna.geomPoint) {
        geomPoints = sna.geomPoint;
        geomType = 'point';
      }
      
      if (!geomPoints) return;

      const style = getSnaStyle(sna.categorieSna, sna.typeSna);
      const categorieLib = { EA: '🏙️ Artificialisé', AT: '🌾 Autre terre', VG: '🌳 Végétation' }[sna.categorieSna] || '📌 SNA';
      const surfaceHa = sna.surfaceGraphique ? sna.surfaceGraphique.toFixed(2).replace('.', ',') : '0,00';
      
      let layer = null;
      let popupContent = `
        <b>📌 SNA ${sna.numeroSna}</b><br>
        ${categorieLib} (${sna.typeSna || '—'})<br>
        Surface : ${surfaceHa} ha<br>
        Ilots : ${sna.ilots ? sna.ilots.join(', ') : '—'}<br>
        Parcelle : ${sna.parcelleAssociee || '—'}
      `;
      
      if (geomType === 'polygon') {
        layer = L.polygon(geomPoints, style);
      } else if (geomType === 'line') {
        layer = L.polyline(geomPoints, { color: style.color, weight: 3, opacity: 0.8 });
        popupContent = `<b>📏 SNA Linéaire ${sna.numeroSna}</b><br>${categorieLib} (${sna.typeSna || '—'})<br>Longueur estimée<br>Ilots : ${sna.ilots ? sna.ilots.join(', ') : '—'}`;
      } else if (geomType === 'point') {
        const pointStyle = getPointStyle(sna.categorieSna);
        layer = L.circleMarker(geomPoints, {
          radius: pointStyle.radius,
          color: pointStyle.color,
          weight: 2,
          fillColor: pointStyle.fillColor,
          fillOpacity: 0.8
        });
        popupContent = `<b>📍 SNA Ponctuelle ${sna.numeroSna}</b><br>${categorieLib} (${sna.typeSna || '—'})<br>Ilots : ${sna.ilots ? sna.ilots.join(', ') : '—'}`;
      }
      
      if (layer) {
        layer.addTo(currentSnaGroup);
        layer.bindPopup(popupContent);
        // Ajouter les points à la liste pour le zoom
        if (geomType === 'polygon' || geomType === 'line') {
          geomPoints.forEach(ll => allLatLngs.push(_toLatLng(ll)));
        } else if (geomType === 'point') {
          allLatLngs.push(_toLatLng(geomPoints));
        }
      }
    });
  }

  // ─── ZOOM INTELLIGENT (inchangé) ────────────────────────────
  _fitBounds(allLatLngs, parcelsGeo);

  // ─── LÉGENDE & STATS (mise à jour avec les SNA) ─────────────
  _updateLegend(parcelsGeo, ilotsGeo, maecGeo, maecCount, snaGeo, snaCount);

  const statsSpan = document.getElementById('map-stats');
  if (statsSpan) {
    statsSpan.innerHTML =
      `📍 ${ilotsGeo.length} îlot(s) | 🌾 ${parcelCount} parcelle(s) | 🌿 ${maecCount} MAEC | 📌 ${snaCount} SNA`;
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

function _updateLegend(parcelsGeo, ilotsGeo, maecGeo, maecCount, snaGeo, snaCount) {
  const legendDiv = document.getElementById('map-legend-items');
  if (!legendDiv) return;

  let html = '';

  // Cultures (inchangé)
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

  // Limites des îlots (inchangé)
  if (ilotsGeo.length) {
    html += `<div style="margin-bottom:4px"><strong>🗺️ Limites</strong></div>
      <div style="display:flex;align-items:center;gap:3px;margin-bottom:10px">
        <div style="background:#9e9e9e;width:20px;height:2px"></div>
        <span style="font-size:0.7rem">Îlots PAC (${ilotsGeo.length})</span>
      </div>`;
  }

  // MAEC (inchangé)
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

  // === NOUVEAU : Légende des SNA ===
  if (snaGeo && snaGeo.length) {
    html += `<div style="margin-top:10px; margin-bottom:4px"><strong>📌 SNA</strong></div>
      <div style="display:flex;flex-wrap:wrap;gap:10px;margin-bottom:5px">
        <div style="display:flex;align-items:center;gap:3px">
          <div style="background:#ffab91;width:16px;height:10px;border:1px solid #ff7043"></div>
          <span style="font-size:0.7rem">Artificialisé (EA)</span>
        </div>
        <div style="display:flex;align-items:center;gap:3px">
          <div style="background:#bcaaa4;width:16px;height:10px;border:1px solid #8d6e63"></div>
          <span style="font-size:0.7rem">Autre terre (AT)</span>
        </div>
        <div style="display:flex;align-items:center;gap:3px">
          <div style="background:#a5d6a7;width:16px;height:10px;border:1px solid #66bb6a"></div>
          <span style="font-size:0.7rem">Végétation (VG)</span>
        </div>
        <div style="display:flex;align-items:center;gap:3px">
          <div style="background:#e0e0e0;width:16px;height:10px;border:1px solid #9e9e9e"></div>
          <span style="font-size:0.7rem">Linéaire/Point</span>
        </div>
      </div>`;
  }

  legendDiv.innerHTML = html || 'Aucune donnée';
}

function _setupLayerControls() {
  const toggleIlots     = document.getElementById('toggleIlots');
  const toggleParcelles = document.getElementById('toggleParcelles');
  const toggleMaec      = document.getElementById('toggleMaec');
  const toggleSna       = document.getElementById('toggleSna'); // Nouveau contrôleur

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
  wire(toggleSna,       currentSnaGroup); // Activer le contrôle pour les SNA
}

export function invalidateMapSize() {
  if (currentMap) setTimeout(() => currentMap.invalidateSize(), 100);
}