// js/carto.js - Version avec zoom raisonnable sur l'exploitation
import { getCultureColor } from './data.js';

let currentMap = null;
let currentIlotGroup = null;
let currentParcelGroup = null;
let currentMaecGroup = null;

export function initMap(ilotsGeo, parcelsGeo, maecGeo) {
  // Supprimer l'ancienne carte si elle existe
  if (currentMap) {
    currentMap.remove();
    currentMap = null;
  }
  
  // Créer une nouvelle carte (centrée temporairement sur la France)
  currentMap = L.map('map').setView([46.5, 2.5], 6);
  
  // Fond de carte
  L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a> & CartoDB',
    subdomains: 'abcd',
    maxZoom: 19,
    minZoom: 6
  }).addTo(currentMap);
  
  // Nettoyer les groupes précédents
  currentIlotGroup = L.layerGroup().addTo(currentMap);
  currentParcelGroup = L.layerGroup().addTo(currentMap);
  currentMaecGroup = L.layerGroup().addTo(currentMap);
  
  // ===================================================
  // COLLECTER TOUS LES POINTS POUR LE ZOOM
  // ===================================================
  let allLatLngs = [];
  let parcelCount = 0;
  let maecCount = 0;
  
  // 1. AJOUT DES ÎLOTS
  ilotsGeo.forEach(ilot => {
    if (ilot.geom && ilot.geom.length >= 3) {
      const poly = L.polygon(ilot.geom, {
        color: '#9e9e9e',
        weight: 2,
        opacity: 0.7,
        fillOpacity: 0.1,
        fillColor: '#bdbdbd'
      });
      poly.addTo(currentIlotGroup);
      poly.bindPopup(`<b>🏷️ Îlot ${ilot.numero}</b><br>Référence: ${ilot.reference || '—'}`);
      
      // Collecter les points pour le zoom
      ilot.geom.forEach(latlng => {
        if (latlng && typeof latlng.lat === 'number') {
          allLatLngs.push(latlng);
        } else if (Array.isArray(latlng) && latlng.length === 2) {
          allLatLngs.push(L.latLng(latlng[0], latlng[1]));
        }
      });
    }
  });
  
  // 2. AJOUT DES PARCELLES
  parcelsGeo.forEach(parcel => {
    if (parcel.geom && parcel.geom.length >= 3) {
      parcelCount++;
      const colors = getCultureColor(parcel.culture);
      const poly = L.polygon(parcel.geom, {
        color: colors.color,
        weight: 2,
        opacity: 0.8,
        fillOpacity: 0.4,
        fillColor: colors.fill
      });
      poly.addTo(currentParcelGroup);
      
      const surfaceHa = parcel.surface ? (parseFloat(parcel.surface) / 100).toFixed(2) : '?';
      poly.bindPopup(`
        <b>🌾 ${parcel.culture}</b><br>
        Îlot: ${parcel.ilot} | Parcelle: ${parcel.parcelle}<br>
        Surface: ${surfaceHa.replace('.', ',')} ha
      `);
      
      // Collecter les points pour le zoom
      parcel.geom.forEach(latlng => {
        if (latlng && typeof latlng.lat === 'number') {
          allLatLngs.push(latlng);
        } else if (Array.isArray(latlng) && latlng.length === 2) {
          allLatLngs.push(L.latLng(latlng[0], latlng[1]));
        }
      });
    }
  });
  
  // 3. AJOUT DES MAEC
  maecGeo.surfaciques.forEach(maec => {
    if (maec.geom && maec.geom.length >= 3) {
      maecCount++;
      const poly = L.polygon(maec.geom, {
        color: '#1e88e5',
        weight: 2,
        opacity: 0.8,
        fillOpacity: 0.25,
        fillColor: '#42a5f5',
        dashArray: '5, 5'
      });
      poly.addTo(currentMaecGroup);
      poly.bindPopup(`<b>🌿 MAEC Surfacique</b><br>Code: ${maec.code}`);
      
      maec.geom.forEach(latlng => {
        if (latlng && typeof latlng.lat === 'number') {
          allLatLngs.push(latlng);
        } else if (Array.isArray(latlng) && latlng.length === 2) {
          allLatLngs.push(L.latLng(latlng[0], latlng[1]));
        }
      });
    }
  });
  
  maecGeo.lineaires.forEach(maec => {
    if (maec.geom && maec.geom.length >= 2) {
      maecCount++;
      const line = L.polyline(maec.geom, {
        color: '#ff8c00',
        weight: 3,
        opacity: 0.9
      });
      line.addTo(currentMaecGroup);
      line.bindPopup(`<b>📏 MAEC Linéaire</b><br>Code: ${maec.code}`);
      
      maec.geom.forEach(latlng => {
        if (latlng && typeof latlng.lat === 'number') {
          allLatLngs.push(latlng);
        } else if (Array.isArray(latlng) && latlng.length === 2) {
          allLatLngs.push(L.latLng(latlng[0], latlng[1]));
        }
      });
    }
  });
  
  maecGeo.ponctuelles.forEach(maec => {
    if (maec.geom && (typeof maec.geom.lat === 'number' || (Array.isArray(maec.geom) && maec.geom.length === 2))) {
      maecCount++;
      let latlng;
      if (typeof maec.geom.lat === 'number') {
        latlng = maec.geom;
      } else {
        latlng = L.latLng(maec.geom[0], maec.geom[1]);
      }
      const marker = L.circleMarker(latlng, {
        radius: 8,
        color: '#d32f2f',
        weight: 2,
        opacity: 0.9,
        fillOpacity: 0.7,
        fillColor: '#ef5350'
      });
      marker.addTo(currentMaecGroup);
      marker.bindPopup(`<b>🔴 MAEC Ponctuelle</b><br>Code: ${maec.code}`);
      allLatLngs.push(latlng);
    }
  });
  
  // ===================================================
  // ZOOM INTELLIGENT SUR L'EXPLOITATION
  // ===================================================
  if (allLatLngs.length > 0) {
    try {
      // Créer une bounds à partir de tous les points
      const bounds = L.latLngBounds(allLatLngs);
      
      // Vérifier que les bounds sont valides et ont une étendue raisonnable
      if (bounds.isValid()) {
        const southWest = bounds.getSouthWest();
        const northEast = bounds.getNorthEast();
        const latDiff = Math.abs(northEast.lat - southWest.lat);
        const lngDiff = Math.abs(northEast.lng - southWest.lng);
        
        // Si l'étendue est trop petite (moins de 50 mètres), on utilise un zoom max de 17
        // Sinon on laisse fitBounds calculer le zoom approprié
        if (latDiff < 0.0005 && lngDiff < 0.0005) {
          // Très petite surface : zoomer au centre avec niveau 17
          const center = bounds.getCenter();
          currentMap.setView(center, 17);
        } else {
          // Étendue normale : fitBounds avec une marge raisonnable
          currentMap.fitBounds(bounds, {
            padding: [40, 40],
            maxZoom: 16,  // Zoom max limité à 16 pour éviter d'être trop près
            animate: true
          });
        }
        
        // Afficher les infos dans la console pour déboguer
        console.log(`Carte: ${parcelCount} parcelles, étendue: ${(latDiff * 111).toFixed(1)}km x ${(lngDiff * 85).toFixed(1)}km`);
      } else {
        // Fallback
        currentMap.setView([46.5, 2.5], 8);
      }
    } catch (e) {
      console.warn("Erreur lors du calcul des bounds:", e);
      currentMap.setView([46.5, 2.5], 8);
    }
  } else if (parcelsGeo.length > 0 && parcelsGeo[0].geom && parcelsGeo[0].geom.length > 0) {
    // Si pas de bounds mais au moins une parcelle, on centre sur le premier point
    const firstPoint = parcelsGeo[0].geom[0];
    if (firstPoint) {
      let center;
      if (typeof firstPoint.lat === 'number') {
        center = firstPoint;
      } else {
        center = L.latLng(firstPoint[0], firstPoint[1]);
      }
      currentMap.setView(center, 14);
    }
  } else {
    // Fallback: centre sur la France
    currentMap.setView([46.5, 2.5], 7);
  }
  
  // ===================================================
  // MISE À JOUR DE LA LÉGENDE
  // ===================================================
  updateLegend(parcelsGeo, ilotsGeo, maecGeo, maecCount);
  
  // ===================================================
  // STATISTIQUES DANS LA BARRE D'OUTILS
  // ===================================================
  const statsSpan = document.getElementById('map-stats');
  if (statsSpan) {
    statsSpan.innerHTML = `📍 ${ilotsGeo.length} îlot(s) | 🌾 ${parcelCount} parcelle(s) | 🌿 ${maecCount} MAEC`;
  }
  
  // ===================================================
  // CONTRÔLES DES COUCHES
  // ===================================================
  setupLayerControls();
}

function updateLegend(parcelsGeo, ilotsGeo, maecGeo, maecCount) {
  const legendDiv = document.getElementById('map-legend-items');
  if (!legendDiv) return;
  
  let legendHtml = '';
  
  // Légende des cultures (uniquement les 8 premières)
  const uniqueCultures = [...new Set(parcelsGeo.map(p => p.culture))];
  const displayCultures = uniqueCultures.slice(0, 8);
  
  if (displayCultures.length > 0) {
    legendHtml += `<div style="margin-bottom:5px"><strong>🌾 Cultures</strong></div>`;
    legendHtml += `<div style="display:flex;flex-wrap:wrap;gap:6px;margin-bottom:10px">`;
    displayCultures.forEach(culture => {
      const colors = getCultureColor(culture);
      legendHtml += `<div style="display:flex;align-items:center;gap:3px">
        <div style="background: ${colors.fill}; width:12px;height:12px;border-radius:2px;border:1px solid ${colors.color}"></div>
        <span style="font-size:0.7rem">${culture}</span>
      </div>`;
    });
    legendHtml += `</div>`;
    if (uniqueCultures.length > 8) {
      legendHtml += `<div style="font-size:0.65rem;color:#888;margin-top:-5px;margin-bottom:8px">+ ${uniqueCultures.length - 8} autre(s)</div>`;
    }
  }
  
  // Îlots
  if (ilotsGeo.length > 0) {
    legendHtml += `<div style="margin-bottom:4px"><strong>🗺️ Limites</strong></div>`;
    legendHtml += `<div style="display:flex;align-items:center;gap:3px;margin-bottom:10px">
      <div style="background: #9e9e9e; width:20px;height:2px;"></div>
      <span style="font-size:0.7rem">Îlots PAC (${ilotsGeo.length})</span>
    </div>`;
  }
  
  // MAEC
  if (maecCount > 0) {
    legendHtml += `<div style="margin-bottom:4px"><strong>🌿 MAEC</strong></div>`;
    legendHtml += `<div style="display:flex;flex-wrap:wrap;gap:10px">`;
    if (maecGeo.surfaciques.length) {
      legendHtml += `<div style="display:flex;align-items:center;gap:3px">
        <div style="background: #1e88e5; width:16px;height:10px;border-radius:2px;"></div>
        <span style="font-size:0.7rem">Surfacique (${maecGeo.surfaciques.length})</span>
      </div>`;
    }
    if (maecGeo.lineaires.length) {
      legendHtml += `<div style="display:flex;align-items:center;gap:3px">
        <div style="background: #ff8c00; width:20px;height:3px;"></div>
        <span style="font-size:0.7rem">Linéaire (${maecGeo.lineaires.length})</span>
      </div>`;
    }
    if (maecGeo.ponctuelles.length) {
      legendHtml += `<div style="display:flex;align-items:center;gap:3px">
        <div style="background: #d32f2f; width:8px;height:8px;border-radius:50%;"></div>
        <span style="font-size:0.7rem">Ponctuelle (${maecGeo.ponctuelles.length})</span>
      </div>`;
    }
    legendHtml += `</div>`;
  }
  
  legendDiv.innerHTML = legendHtml || 'Aucune donnée';
}

function setupLayerControls() {
  const toggleIlots = document.getElementById('toggleIlots');
  const toggleParcelles = document.getElementById('toggleParcelles');
  const toggleMaec = document.getElementById('toggleMaec');
  
  if (toggleIlots) {
    toggleIlots.checked = true;
    toggleIlots.onclick = () => {
      if (toggleIlots.checked) currentIlotGroup.addTo(currentMap);
      else currentIlotGroup.remove();
    };
  }
  
  if (toggleParcelles) {
    toggleParcelles.checked = true;
    toggleParcelles.onclick = () => {
      if (toggleParcelles.checked) currentParcelGroup.addTo(currentMap);
      else currentParcelGroup.remove();
    };
  }
  
  if (toggleMaec) {
    toggleMaec.checked = true;
    toggleMaec.onclick = () => {
      if (toggleMaec.checked) currentMaecGroup.addTo(currentMap);
      else currentMaecGroup.remove();
    };
  }
}

export function invalidateMapSize() {
  if (currentMap) {
    setTimeout(() => {
      currentMap.invalidateSize();
    }, 100);
  }
}