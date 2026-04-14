// js/carto.js
import { getCultureColor } from './data.js';

let currentMap = null;
let currentIlotGroup = null;
let currentParcelGroup = null;
let currentMaecGroup = null;
let currentSnaGroup = null;

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
  currentSnaGroup = null;
}

// ===================================================
// STYLES SNAs par type
// ===================================================
const SNA_STYLES = {
  // Haies et alignements d'arbres
  V4: { color: '#2e7d32', fill: '#66bb6a', label: 'Haie',               icon: '🌿' },
  V2: { color: '#1b5e20', fill: '#a5d6a7', label: 'Alignement d\'arbres', icon: '🌳' },
  V1: { color: '#33691e', fill: '#c5e1a5', label: 'Arbre isolé',          icon: '🌲' },
  V3: { color: '#558b2f', fill: '#dce775', label: 'Bosquet',              icon: '🌾' },
  // Zones humides / eau
  B3: { color: '#0277bd', fill: '#81d4fa', label: 'Mare / Zone humide',   icon: '💧' },
  B2: { color: '#01579b', fill: '#b3e5fc', label: 'Cours d\'eau',         icon: '🏞️' },
  B1: { color: '#006064', fill: '#80deea', label: 'Fossé',                icon: '〰️' },
  // Surfaces enherbées
  AT: { color: '#f57f17', fill: '#fff176', label: 'Bande enherbée',       icon: '🌱' },
  A2: { color: '#e65100', fill: '#ffcc80', label: 'Prairie',              icon: '🟩' },
  // Générique
  default: { color: '#6d4c41', fill: '#bcaaa4', label: 'SNA',            icon: '📌' }
};

function _getSnaStyle(typeSna) {
  return SNA_STYLES[typeSna] || SNA_STYLES.default;
}

// Labels lisibles pour les catégories
const SNA_CATEGORIES = {
  VG: 'Végétation',
  EA: 'Eau',
  AT: 'Bande tampon',
  default: ''
};

export function initMap(ilotsGeo, parcelsGeo, maecGeo, snaGeo = []) {
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

  currentIlotGroup   = L.layerGroup().addTo(currentMap);
  currentParcelGroup = L.layerGroup().addTo(currentMap);
  currentMaecGroup   = L.layerGroup().addTo(currentMap);
  currentSnaGroup    = L.layerGroup().addTo(currentMap);

  let allLatLngs = [];
  let parcelCount = 0;
  let maecCount   = 0;
  let snaCount    = 0;

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

  // ─── 6. SNAs ─────────────────────────────────────
  snaGeo.forEach(sna => {
    const style = _getSnaStyle(sna.typeSna);
    const catLabel = SNA_CATEGORIES[sna.categorieSna] || sna.categorieSna || '—';

    // Popup riche avec toutes les caractéristiques
    const surfHa = sna.surfaceGraphique
      ? `${parseFloat(sna.surfaceGraphique).toFixed(4).replace('.', ',')} ha`
      : '—';
    const largeur = sna.largeurCalculee ? `${sna.largeurCalculee} m` : '—';
    const longueur = sna.longueurIae    ? `${sna.longueurIae} m`     : '—';
    const ilots = sna.ilots && sna.ilots.length
      ? sna.ilots.join(', ')
      : '—';
    const dateMaj = sna.dateMiseAjour
      ? sna.dateMiseAjour.slice(0, 10)
      : '—';

    const popup = `
      <div style="min-width:210px;font-family:sans-serif;font-size:0.82rem">
        <div style="font-size:1rem;font-weight:700;margin-bottom:6px">
          ${style.icon} ${style.label} <span style="color:#666;font-weight:400">(${sna.typeSna})</span>
        </div>
        <table style="border-collapse:collapse;width:100%">
          <tr><td style="color:#888;padding:2px 6px 2px 0">Numéro SNA</td>
              <td style="font-weight:600">${sna.numeroSna || '—'}</td></tr>
          <tr><td style="color:#888;padding:2px 6px 2px 0">Catégorie</td>
              <td>${catLabel} <span style="color:#aaa">(${sna.categorieSna || '—'})</span></td></tr>
          <tr><td style="color:#888;padding:2px 6px 2px 0">Type</td>
              <td>${sna.typeSna || '—'}</td></tr>
          <tr><td style="color:#888;padding:2px 6px 2px 0">Surface</td>
              <td>${surfHa}</td></tr>
          ${largeur !== '—' ? `<tr><td style="color:#888;padding:2px 6px 2px 0">Largeur</td>
              <td>${largeur}</td></tr>` : ''}
          ${longueur !== '—' ? `<tr><td style="color:#888;padding:2px 6px 2px 0">Longueur IAE</td>
              <td>${longueur}</td></tr>` : ''}
          <tr><td style="color:#888;padding:2px 6px 2px 0">Îlot(s)</td>
              <td>${ilots}</td></tr>
          <tr><td style="color:#888;padding:2px 6px 2px 0">Mise à jour</td>
              <td>${dateMaj}</td></tr>
        </table>
      </div>`;

    // Rendu : polygone ou polyligne selon la géométrie disponible
    if (sna.geom && sna.geom.length >= 3) {
      // Polygone (surface ou bande)
      const poly = L.polygon(sna.geom, {
        color:       style.color,
        weight:      2,
        opacity:     0.85,
        fillColor:   style.fill,
        fillOpacity: 0.5,
        dashArray:   sna.typeSna === 'V4' ? '6, 3' : null   // tirets pour les haies
      });
      poly.addTo(currentSnaGroup);
      poly.bindPopup(popup, { maxWidth: 280 });
      poly.on('mouseover', function () { this.setStyle({ fillOpacity: 0.75, weight: 3 }); });
      poly.on('mouseout',  function () { this.setStyle({ fillOpacity: 0.5,  weight: 2 }); });
      sna.geom.forEach(ll => allLatLngs.push(_toLatLng(ll)));

    } else if (sna.geomLine && sna.geomLine.length >= 2) {
      // Polyligne (linéaire)
      const line = L.polyline(sna.geomLine, {
        color:   style.color,
        weight:  4,
        opacity: 0.85
      });
      line.addTo(currentSnaGroup);
      line.bindPopup(popup, { maxWidth: 280 });
      line.on('mouseover', function () { this.setStyle({ weight: 6 }); });
      line.on('mouseout',  function () { this.setStyle({ weight: 4 }); });
      sna.geomLine.forEach(ll => allLatLngs.push(_toLatLng(ll)));

    } else if (sna.geomPoint) {
      // Marker ponctuel (arbre isolé, etc.)
      const ll = _toLatLng(sna.geomPoint);
      if (ll) {
        const marker = L.circleMarker(ll, {
          radius: 7, color: style.color, weight: 2,
          opacity: 0.9, fillOpacity: 0.75, fillColor: style.fill
        });
        marker.addTo(currentSnaGroup);
        marker.bindPopup(popup, { maxWidth: 280 });
        allLatLngs.push(ll);
      }
    }

    snaCount++;
  });

  // ─── ZOOM INTELLIGENT ────────────────────────────
  _fitBounds(allLatLngs, parcelsGeo);

  // ─── LÉGENDE & STATS ─────────────────────────────
  _updateLegend(parcelsGeo, ilotsGeo, maecGeo, maecCount, snaGeo, snaCount);

  const statsSpan = document.getElementById('map-stats');
  if (statsSpan) {
    statsSpan.innerHTML =
      `📍 ${ilotsGeo.length} îlot(s) | 🌾 ${parcelCount} parcelle(s) | 🌿 ${maecCount} MAEC | 🏷️ ${snaCount} SNA`;
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

function _updateLegend(parcelsGeo, ilotsGeo, maecGeo, maecCount, snaGeo = [], snaCount = 0) {
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
    html += `</div><br>`;
  }

  // ─── LÉGENDE SNAs ─────────────────────────────────
  if (snaCount > 0) {
    const uniqueTypes = [...new Set(snaGeo.map(s => s.typeSna))].sort();
    html += `<div style="margin-bottom:4px"><strong>🏷️ SNAs (${snaCount})</strong></div>
      <div style="display:flex;flex-wrap:wrap;gap:6px;margin-bottom:4px">`;
    uniqueTypes.forEach(t => {
      const st = _getSnaStyle(t);
      const count = snaGeo.filter(s => s.typeSna === t).length;
      html += `<div style="display:flex;align-items:center;gap:3px" title="${st.label}">
        <div style="background:${st.fill};width:12px;height:12px;border-radius:2px;
             border:2px solid ${st.color}"></div>
        <span style="font-size:0.7rem">${st.icon} ${t} <span style="color:#888">(${count})</span></span>
      </div>`;
    });
    html += `</div>`;
  }

  legendDiv.innerHTML = html || 'Aucune donnée';
}

function _setupLayerControls() {
  const toggleIlots     = document.getElementById('toggleIlots');
  const toggleParcelles = document.getElementById('toggleParcelles');
  const toggleMaec      = document.getElementById('toggleMaec');
  const toggleSna       = document.getElementById('toggleSna');

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
  wire(toggleMaec,      currentMaecGroup);
  wire(toggleSna,       currentSnaGroup);
}

export function invalidateMapSize() {
  if (currentMap) setTimeout(() => currentMap.invalidateSize(), 100);
}
