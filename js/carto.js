// ========== 2. PARCELLES - Même gestion que les îlots ==========
parcelsGeo.forEach(parcel => {
  let polygonsToAdd = [];
  
  if (parcel.geom && Array.isArray(parcel.geom)) {
    const firstElement = parcel.geom[0];
    
    // Cas 1: Polygone simple
    if (Array.isArray(firstElement) && firstElement.length === 2 && typeof firstElement[0] === 'number') {
      const points = [];
      for (const coord of parcel.geom) {
        const ll = parseCoord(coord);
        if (ll) points.push(ll);
      }
      if (points.length >= 3) {
        polygonsToAdd.push([points]);
      }
    }
    // Cas 2: Polygone avec trou(s)
    else if (Array.isArray(firstElement) && Array.isArray(firstElement[0]) && typeof firstElement[0][0] === 'number') {
      const rings = [];
      for (const ring of parcel.geom) {
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
        polygonsToAdd.push(rings);
      }
    }
    // Cas 3: Multi-polygone
    else if (Array.isArray(firstElement) && Array.isArray(firstElement[0]) && Array.isArray(firstElement[0][0])) {
      for (const poly of parcel.geom) {
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
          polygonsToAdd.push(rings);
        }
      }
    }
  }
  
  if (polygonsToAdd.length > 0) {
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
      
      // Ajouter tous les points pour le centrage
      for (const ring of rings) {
        ring.forEach(ll => allLatLngs.push(ll));
      }
    }
    console.log(`Parcelle ${parcel.ilot}-${parcel.parcelle} ajoutée avec ${polygonsToAdd.length} polygone(s)`);
  } else {
    console.warn(`Parcelle ${parcel.ilot}-${parcel.parcelle} ignorée - géométrie invalide:`, parcel.geom);
  }
});