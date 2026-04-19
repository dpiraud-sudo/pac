// js/carto.js
import { getCultureColor } from './data.js';

let currentMap = null;
let currentIlotGroup    = null;
let currentParcelGroup  = null;
let currentMaecSGroup   = null;
let currentMaecSLGroup  = null;
let currentMaecPGroup   = null;

// ── Couches SNA par type ──────────────────────────────
let snaLayerGroups = {};   // { "V4": L.layerGroup, ... }
let snaData        = [];   // copie pour filtres

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

  currentMap = L.map('map').setView([46.5, 2.5], 6);

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
    if (!ilot.geom || ilot.geom.length < 3) return;
    const poly = L.polygon(ilot.geom, {
      color: '#9e9e9e', weight: 2, opacity: 0.7,
      fillOpacity: 0.1, fillColor: '#bdbdbd'
    });
    poly.addTo(currentIlotGroup);
    poly.bindPopup(`<b>🏷️ Îlot ${ilot.numero}</b><br>Référence : ${ilot.reference || '—'}`);
    ilot.geom.forEach(ll => allLatLngs.push(_toLatLng(ll)));
  });

  // ─── 2. PARCELLES ────────────────────────────────
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

  // ─── 3. MAEC ─────────────────────────────────────
  const allMaec = [
    ...maecGeo.surfaciques,
    ...maecGeo.lineaires,
    ...maecGeo.ponctuelles
  ];

  allMaec.forEach(maec => {
    const type = (maec.sousType || '').toUpperCase();

    if (type === 'S') {
      if (!maec.geom || maec.geom.length < 3) return;
      maecCount++;
      const poly = L.polygon(maec.geom, {
        color: '#2e7d32', weight: 2, opacity: 0.9,
        fillOpacity: 0.30, fillColor: '#66bb6a', dashArray: '6, 4'
      });
      poly.addTo(currentMaecSGroup);
      poly.bindPopup(_maecPopup('🟢 MAEC Surfacique', maec));
      maec.geom.forEach(ll => allLatLngs.push(_toLatLng(ll)));

    } else if (type === 'SL') {
      if (!maec.geom || maec.geom.length < 2) return;
      maecCount++;
      const poly = L.polygon(maec.geom, {
        color: '#e65100', weight: 3, opacity: 0.95,
        fillOpacity: 0.50, fillColor: '#ff8c00'
      });
      poly.addTo(currentMaecSLGroup);
      poly.bindPopup(_maecPopup('🟠 MAEC Linéaire (SL)', maec));
      maec.geom.forEach(ll => allLatLngs.push(_toLatLng(ll)));

    } else if (type === 'L') {
      if (!maec.geom || maec.geom.length < 2) return;
      maecCount++;
      const line = L.polyline(maec.geom, {
        color: '#e65100', weight: 4, opacity: 0.95, dashArray: '10, 4'
      });
      line.addTo(currentMaecSLGroup);
      line.bindPopup(_maecPopup('🟠 MAEC Linéaire', maec));
      maec.geom.forEach(ll => allLatLngs.push(_toLatLng(ll)));

    } else if (type === 'P') {
      const ll = _toLatLng(maec.geom);
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

    const style = getSnaStyle(sna);
    const popup = _snaPopup(sna);

    if (sna.geom && sna.geom.length >= 3) {
      const poly = L.polygon(sna.geom, {
        color: style.color, weight: 2, opacity: 0.9,
        fillOpacity: 0.40, fillColor: style.fill, dashArray: '4, 3'
      });
      poly.bindPopup(popup);
      poly.addTo(snaLayerGroups[typeCode]);

    } else if (sna.geomLine && sna.geomLine.length >= 2) {
      const line = L.polyline(sna.geomLine, {
        color: style.color, weight: 4, opacity: 0.9, dashArray: '8, 4'
      });
      line.bindPopup(popup);
      line.addTo(snaLayerGroups[typeCode]);

    } else if (sna.geomPoint) {
      const ll = _toLatLng(sna.geomPoint);
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

// ===================================================
// SNA — POPUP
// ===================================================
function _snaPopup(sna) {
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
// SNA — FILTRES DANS LA CARTE
// ===================================================
function _buildSnaFilterUI(snaList) {
  const container = document.getElementById('sna-map-filters');
  if (!container) return;

  if (!snaList.length) {
    container.innerHTML = '<span style="color:#aaa;font-size:0.8rem;padding:4px 0;display:block">Aucune SNA dans ce fichier</span>';
    return;
  }

  // Regrouper par catégorie > type
  const byCategorie = {};
  for (const sna of snaList) {
    const cat  = sna.categorieSna || getCatFromType(sna.typeSna) || 'AT';
    const type = sna.typeSna || 'XX';
    if (!byCategorie[cat]) byCategorie[cat] = {};
    byCategorie[cat][type] = (byCategorie[cat][type] || 0) + 1;
  }

  const catOrder = ['EA', 'AT', 'VG'];

  let catHtml = '';
  for (const cat of catOrder) {
    if (!byCategorie[cat]) continue;
    const catStyle = SNA_CATEGORIE_STYLE[cat] || SNA_CATEGORIE_STYLE.AT;
    const types    = Object.entries(byCategorie[cat]);
    const total    = types.reduce((s, [, n]) => s + n, 0);

    catHtml += `
      <div class="sna-filter-cat">
        <div class="sna-filter-cat-header" style="display:flex;align-items:center;gap:6px;padding:4px 0;border-bottom:1px solid #e8f0e5;margin-bottom:4px">
          <input type="checkbox" class="sna-cat-cb" data-cat="${cat}" checked
            style="width:14px;height:14px;cursor:pointer;accent-color:${catStyle.color}">
          <span style="background:${catStyle.fill};color:${catStyle.color};border:1px solid ${catStyle.color};
            padding:2px 8px;border-radius:10px;font-size:0.72rem;font-weight:700;flex:1;cursor:pointer"
            onclick="this.previousElementSibling.click()">${catStyle.label}</span>
          <span style="color:#999;font-size:0.72rem;white-space:nowrap">${total} SNA</span>
          <button class="sna-cat-toggle" data-cat="${cat}"
            style="background:none;border:none;cursor:pointer;color:#557055;font-size:0.75rem;padding:0 2px;line-height:1">▼</button>
        </div>
        <div class="sna-types-list" id="sna-types-${cat}" style="padding-left:6px">
          ${types.map(([typeCode, count]) => `
            <label style="display:flex;align-items:center;gap:5px;cursor:pointer;padding:2px 0;font-size:0.76rem;color:#2a3a2a">
              <input type="checkbox" class="sna-type-cb" data-type="${typeCode}" data-cat="${cat}" checked
                style="width:12px;height:12px;cursor:pointer;accent-color:${catStyle.color}">
              <code style="font-weight:700;color:${catStyle.color};font-size:0.75rem;min-width:22px">${typeCode}</code>
              <span style="flex:1;color:#445">${SNA_TYPE_LABELS[typeCode] || typeCode}</span>
              <span style="color:#bbb;font-size:0.7rem;white-space:nowrap">(${count})</span>
            </label>
          `).join('')}
        </div>
      </div>
    `;
  }

  container.innerHTML = `
    <div style="display:flex;gap:5px;margin-bottom:8px">
      <button id="sna-all-btn"
        style="flex:1;padding:3px 6px;border-radius:20px;border:1px solid #b8d4b8;background:#eef5ea;
               color:#1f5422;font-size:0.72rem;cursor:pointer;font-weight:600">✅ Tous</button>
      <button id="sna-none-btn"
        style="flex:1;padding:3px 6px;border-radius:20px;border:1px solid #e0b8b8;background:#fef0f0;
               color:#b91c1c;font-size:0.72rem;cursor:pointer;font-weight:600">❌ Aucun</button>
    </div>
    <div style="font-size:0.72rem;color:#557055;margin-bottom:6px;text-align:right">
      <span id="sna-map-count">${snaList.length} / ${snaList.length} affichées</span>
    </div>
    ${catHtml}
  `;

  // ── Événements ──
  container.querySelectorAll('.sna-type-cb').forEach(cb => {
    cb.addEventListener('change', () => _applySnaFilter(container));
  });

  container.querySelectorAll('.sna-cat-cb').forEach(cb => {
    cb.addEventListener('change', () => {
      const cat = cb.dataset.cat;
      container.querySelectorAll(`.sna-type-cb[data-cat="${cat}"]`).forEach(t => {
        t.checked = cb.checked;
      });
      _applySnaFilter(container);
    });
  });

  container.querySelectorAll('.sna-cat-toggle').forEach(btn => {
    btn.addEventListener('click', () => {
      const cat  = btn.dataset.cat;
      const list = document.getElementById(`sna-types-${cat}`);
      if (!list) return;
      const collapsed = list.style.display === 'none';
      list.style.display = collapsed ? '' : 'none';
      btn.textContent    = collapsed ? '▼' : '▶';
    });
  });

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

  // Mettre à jour état indeterminate des catégories
  container.querySelectorAll('.sna-cat-cb').forEach(catCb => {
    const cat     = catCb.dataset.cat;
    const typeCbs = [...container.querySelectorAll(`.sna-type-cb[data-cat="${cat}"]`)];
    const all     = typeCbs.every(t => t.checked);
    const some    = typeCbs.some(t => t.checked);
    catCb.checked       = all;
    catCb.indeterminate = !all && some;
  });

  const countEl = document.getElementById('sna-map-count');
  if (countEl) countEl.textContent = `${visibleCount} / ${snaData.length} affichées`;
}

// ===================================================
// HELPERS PRIVÉS
// ===================================================
function _maecPopup(titre, maec) {
  const num      = maec.numero    || '—';
  const code     = maec.code      || '—';
  const sousType = maec.sousType  || '—';
  const debut    = maec.premiereC || null;
  const fin      = maec.derniereC || null;
  let campagnes;
  if (debut && fin)   campagnes = `${debut} → ${fin}`;
  else if (debut)     campagnes = `Depuis ${debut}`;
  else if (fin)       campagnes = `Jusqu'en ${fin}`;
  else                campagnes = `<em style="color:#e65100">⚠️ Élément modifié</em>`;
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
    if (first) { const c = _toLatLng(first); if (c) { currentMap.setView(c, 14); return; } }
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
  } catch (e) {
    console.warn('Erreur bounds :', e);
    currentMap.setView([46.5, 2.5], 8);
  }
}

function _updateLegend(parcelsGeo, ilotsGeo, maecGeo, maecCount, snaList) {
  const legendDiv = document.getElementById('map-legend-items');
  if (!legendDiv) return;

  let html = '';

  // Cultures
  const uniqueCultures = [...new Set(parcelsGeo.map(p => p.culture))];
  const displayed = uniqueCultures.slice(0, 8);
  if (displayed.length) {
    html += `<div style="margin-bottom:5px"><strong>🌾 Cultures</strong></div>
      <div style="display:flex;flex-wrap:wrap;gap:6px;margin-bottom:10px">`;
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

  // MAEC
  if (maecCount > 0) {
    const allMaec = [...maecGeo.surfaciques, ...maecGeo.lineaires, ...maecGeo.ponctuelles];
    const countS  = allMaec.filter(m => (m.sousType || '').toUpperCase() === 'S').length;
    const countSL = allMaec.filter(m => (m.sousType || '').toUpperCase() === 'SL').length;
    const countL  = allMaec.filter(m => (m.sousType || '').toUpperCase() === 'L').length;
    const countP  = allMaec.filter(m => (m.sousType || '').toUpperCase() === 'P').length;
    html += `<div style="margin-bottom:4px"><strong>🌿 MAEC</strong></div>
      <div style="display:flex;flex-direction:column;gap:5px;margin-bottom:10px">`;
    if (countS)  html += `<div style="display:flex;align-items:center;gap:5px"><div style="background:#66bb6a;width:16px;height:11px;border-radius:2px;border:2px dashed #2e7d32"></div><span style="font-size:0.7rem">Surfacique S (${countS})</span></div>`;
    if (countSL) html += `<div style="display:flex;align-items:center;gap:5px"><div style="background:#ff8c00;width:22px;height:5px;border-radius:1px"></div><span style="font-size:0.7rem">Linéaire SL (${countSL})</span></div>`;
    if (countL)  html += `<div style="display:flex;align-items:center;gap:5px"><div style="background:#e65100;width:22px;height:4px"></div><span style="font-size:0.7rem">Linéaire L (${countL})</span></div>`;
    if (countP)  html += `<div style="display:flex;align-items:center;gap:5px"><div style="background:#ef5350;width:10px;height:10px;border-radius:50%;border:2px solid #b71c1c"></div><span style="font-size:0.7rem">Ponctuelle P (${countP})</span></div>`;
    html += `</div>`;
  }

  // SNA
  if (snaList.length) {
    const catCounts = {};
    snaList.forEach(s => {
      const cat = s.categorieSna || getCatFromType(s.typeSna) || 'AT';
      catCounts[cat] = (catCounts[cat] || 0) + 1;
    });
    html += `<div style="margin-bottom:4px"><strong>🏗️ SNA</strong></div>
      <div style="display:flex;flex-direction:column;gap:4px">`;
    for (const [cat, n] of Object.entries(catCounts)) {
      const s = SNA_CATEGORIE_STYLE[cat] || SNA_CATEGORIE_STYLE.AT;
      html += `<div style="display:flex;align-items:center;gap:5px">
        <div style="background:${s.fill};width:14px;height:10px;border-radius:2px;border:2px dashed ${s.color}"></div>
        <span style="font-size:0.7rem">${s.label} (${n})</span>
      </div>`;
    }
    html += `</div>`;
  }

  legendDiv.innerHTML = html || 'Aucune donnée';
}

function _setupLayerControls() {
  const toggleIlots     = document.getElementById('toggleIlots');
  const toggleParcelles = document.getElementById('toggleParcelles');
  const toggleMaecS     = document.getElementById('toggleMaecS');
  const toggleMaecSL    = document.getElementById('toggleMaecSL');
  const toggleMaecP     = document.getElementById('toggleMaecP');
  const toggleMaec      = document.getElementById('toggleMaec');

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

  // Toggle global SNA — délègue aux filtres fins
  const toggleSNA = document.getElementById('toggleSNA');
  if (toggleSNA) {
    toggleSNA.checked = true;
    toggleSNA.onclick = () => {
      const container = document.getElementById('sna-map-filters');
      if (toggleSNA.checked) {
        // Remettre l'état antérieur des filtres fins
        if (container) _applySnaFilter(container);
        else Object.values(snaLayerGroups).forEach(g => g.addTo(currentMap));
      } else {
        // Tout masquer sans toucher aux checkboxes fines
        Object.values(snaLayerGroups).forEach(g => {
          if (currentMap.hasLayer(g)) g.remove();
        });
      }
    };
  }
}

export function invalidateMapSize() {
  if (currentMap) setTimeout(() => currentMap.invalidateSize(), 100);
}
