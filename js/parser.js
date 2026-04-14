// js/parser.js
import { lookup } from './data.js';

proj4.defs(
  "EPSG:2154",
  "+proj=lcc +lat_1=49 +lat_2=44 +lat_0=46.5 +lon_0=3 +x_0=700000 +y_0=6600000 +ellps=GRS80 +towgs84=0,0,0,0,0,0,0 +units=m +no_defs"
);

export function convertToLatLng(x, y) {
  const [lon, lat] = proj4("EPSG:2154", "EPSG:4326", [parseFloat(x), parseFloat(y)]);
  return [lat, lon];
}

export function parseGmlPolygon(gmlString) {
  if (!gmlString) return null;
  const matches = [...gmlString.matchAll(/<gml:coordinates>([\s\S]*?)<\/gml:coordinates>/g)];
  if (!matches.length) return null;
  const ring = [];
  for (const pair of matches[0][1].trim().split(/\s+/)) {
    if (!pair) continue;
    const [x, y] = pair.split(',').map(Number);
    if (!isNaN(x) && !isNaN(y)) ring.push(convertToLatLng(x, y));
  }
  return ring.length >= 3 ? ring : null;
}

export function parseGmlLineString(gmlString) {
  if (!gmlString) return null;
  const match = gmlString.match(/<gml:coordinates>([\s\S]*?)<\/gml:coordinates>/);
  if (!match) return null;
  const pts = [];
  for (const pair of match[1].trim().split(/\s+/)) {
    if (!pair) continue;
    const [x, y] = pair.split(',').map(Number);
    if (!isNaN(x) && !isNaN(y)) pts.push(convertToLatLng(x, y));
  }
  return pts.length >= 2 ? pts : null;
}

export function parseGmlPoint(gmlString) {
  if (!gmlString) return null;
  const match = gmlString.match(/<gml:coordinates>([\s\S]*?)<\/gml:coordinates>/);
  if (!match) return null;
  const [x, y] = match[1].trim().split(',').map(Number);
  if (isNaN(x) || isNaN(y)) return null;
  return convertToLatLng(x, y);
}

// ===================================================
// CALCUL DE SURFACE SHOELACE (en ha, depuis Lambert 93)
// ===================================================
function shoelaceHa(pts) {
  if (pts.length < 3) return null;
  let s = 0;
  for (let i = 0; i < pts.length; i++) {
    const j = (i + 1) % pts.length;
    s += pts[i][0] * pts[j][1] - pts[j][0] * pts[i][1];
  }
  return Math.abs(s) / 2 / 10000;
}

function extractLambertPts(gc) {
  if (!gc?.textContent) return [];
  return gc.textContent.trim().split(/\s+/).reduce((acc, tok) => {
    if (tok.includes(',')) {
      const [x, y] = tok.split(',').map(Number);
      if (!isNaN(x) && !isNaN(y)) acc.push([x, y]);
    }
    return acc;
  }, []);
}

// ===================================================
// PARSING DES SNA (version améliorée)
// ===================================================
function parseSNA(xmlDoc) {
  const NS = 'urn:x-telepac:fr.gouv.agriculture.telepac:echange-producteur';
  const GML = 'http://www.opengis.net/gml';
  const snaList = [];

  for (const sna of xmlDoc.getElementsByTagNameNS(NS, 'sna-declaree')) {
    const getText = (tag) => sna.getElementsByTagNameNS(NS, tag)[0]?.textContent?.trim() || '';
    
    // Récupération des champs de base
    const numeroSna = getText('numeroSna');
    const typeSna = getText('typeSna');
    const categorieSna = getText('categorieSna');
    const surfaceGraphique = parseFloat(getText('surfaceGraphique')) || 0;
    const largeurCalculee = parseFloat(getText('largeurCalculee')) || null;
    const longueurIae = parseFloat(getText('longueurIae')) || null;
    const dateMiseAjour = getText('dateMiseAjour') || null;
    
    // Récupération des îlots associés
    const ilots = [];
    const interIlots = sna.getElementsByTagNameNS(NS, 'intersectionsSnaIlots')[0];
    if (interIlots) {
      const intersections = interIlots.getElementsByTagNameNS(NS, 'intersectionSnaIlot');
      for (const inter of intersections) {
        const numIlot = inter.getElementsByTagNameNS(NS, 'numeroIlot')[0]?.textContent?.trim();
        if (numIlot) ilots.push(numIlot);
      }
    }
    
    // Si pas d'îlots trouvés via intersectionsSnaIlots, essayer via intersectionsSnaParcelles
    if (ilots.length === 0) {
      const interParc = sna.getElementsByTagNameNS(NS, 'intersectionsSnaParcelles')[0];
      if (interParc) {
        const intersections = interParc.getElementsByTagNameNS(NS, 'intersectionSnaParcelle');
        for (const inter of intersections) {
          const numIlot = inter.getElementsByTagNameNS(NS, 'numeroIlot')[0]?.textContent?.trim();
          if (numIlot && !ilots.includes(numIlot)) ilots.push(numIlot);
        }
      }
    }
    
    // Récupération de la géométrie
    let geom = null;      // Polygone (LatLng[])
    let geomLine = null;  // Ligne (LatLng[])
    let geomPoint = null; // Point (LatLng)
    
    // Essayer de trouver un polygone
    const polygonNode = sna.getElementsByTagNameNS(GML, 'Polygon')[0];
    if (polygonNode) {
      geom = parseGmlPolygon(polygonNode.outerHTML);
    }
    
    // Sinon essayer une ligne
    if (!geom) {
      const lineNode = sna.getElementsByTagNameNS(GML, 'LineString')[0];
      if (lineNode) {
        geomLine = parseGmlLineString(lineNode.outerHTML);
      }
    }
    
    // Sinon essayer un point
    if (!geom && !geomLine) {
      const pointNode = sna.getElementsByTagNameNS(GML, 'Point')[0];
      if (pointNode) {
        geomPoint = parseGmlPoint(pointNode.outerHTML);
      }
    }
    
    // Ne garder que les SNA avec une géométrie valide
    if (geom || geomLine || geomPoint) {
      snaList.push({
        numeroSna,
        typeSna,
        categorieSna,
        surfaceGraphique,
        largeurCalculee,
        longueurIae,
        ilots,
        dateMiseAjour,
        geom,        // Polygone en LatLng[]
        geomLine,    // Ligne en LatLng[]
        geomPoint    // Point en LatLng
      });
    }
  }
  
  console.log(`SNAs extraits : ${snaList.length}`);
  return snaList;
}

// ===================================================
// PARSING PRINCIPAL
// ===================================================
export function parseXML(xmlString) {
  console.log('Début du parsing XML…');
  const t0 = performance.now();

  const parser = new DOMParser();
  const xmlDoc = parser.parseFromString(xmlString, 'application/xml');

  const parseError = xmlDoc.querySelector('parsererror');
  if (parseError) throw new Error('Erreur de syntaxe XML : ' + parseError.textContent);

  const NS  = 'urn:x-telepac:fr.gouv.agriculture.telepac:echange-producteur';
  const GML = 'http://www.opengis.net/gml';

  const getText = (el, tag) => el.getElementsByTagNameNS(NS, tag)[0]?.textContent.trim() || '';

  // ── Méta-données ──────────────────────────────────
  const prod = xmlDoc.getElementsByTagNameNS(NS, 'producteur')[0];
  let exploitantNom = '';
  const demandeur = xmlDoc.getElementsByTagNameNS(NS, 'demandeur')[0];
  if (demandeur) {
    const soc = demandeur.getElementsByTagNameNS(NS, 'identification-societe')[0];
    if (soc) exploitantNom = getText(soc, 'exploitation') || getText(soc, 'raison-sociale');
    if (!exploitantNom) {
      const indiv = demandeur.getElementsByTagNameNS(NS, 'identification-individuelle')[0];
      if (indiv) {
        const id = indiv.getElementsByTagNameNS(NS, 'identite')[0];
        if (id) exploitantNom = ((getText(id, 'prenoms') + ' ' + getText(id, 'nom')).trim());
      }
    }
  }

  const meta = {
    pacage: prod?.getAttribute('numero-pacage') || '',
    campagne: prod?.getAttribute('campagne') || '',
    exploitation: exploitantNom,
    siret: getText(xmlDoc, 'siret')
  };

  // ── Structures de sortie ──────────────────────────
  const rows      = [];
  const ilotsMap  = new Map();
  const parcelsList = [];
  const maecSurf  = [];
  const maecLine  = [];
  const maecPoint = [];
  const maecRows  = [];

  const ilots = xmlDoc.getElementsByTagNameNS(NS, 'ilot');
  console.log(`Îlots trouvés : ${ilots.length}`);

  for (const ilot of ilots) {
    const iNum = ilot.getAttribute('numero-ilot') || '';
    const iRef = ilot.getAttribute('numero-ilot-reference') || '';
    const com  = getText(ilot, 'commune');

    // Géométrie îlot
    const geomIlot = ilot.getElementsByTagNameNS(NS, 'geometrie')[0]
      ?.getElementsByTagNameNS(GML, 'Polygon')[0];
    if (geomIlot) {
      const poly = parseGmlPolygon(geomIlot.outerHTML);
      if (poly) ilotsMap.set(iNum, { numero: iNum, reference: iRef, geom: poly });
    }

    // ── Parcelles culturales ─────────────────────────
    for (const parc of ilot.getElementsByTagNameNS(NS, 'parcelle')) {
      const desc = parc.getElementsByTagNameNS(NS, 'descriptif-parcelle')[0];
      if (!desc) continue;
      const cp = desc.getElementsByTagNameNS(NS, 'culture-principale')[0];
      if (!cp) continue;

      const code = getText(cp, 'code-culture');
      const prec = getText(cp, 'precision');
      const saEl = parc.getElementsByTagNameNS(NS, 'surface-admissible')[0];
      const saAres = saEl?.textContent.trim() || '';
      const saHaVal = saAres ? Number(saAres) / 100 : null;

      // Surface calculée (Shoelace)
      const gc = parc.getElementsByTagNameNS(GML, 'coordinates')[0];
      const pts = extractLambertPts(gc);
      const area = pts.length >= 3 ? shoelaceHa(pts) : null;

      const info = lookup(code, prec);

      const get = (tag) => desc.getElementsByTagNameNS(NS, tag)[0];

      rows.push({
        ilot_num: iNum, ilot_ref: iRef, commune: com,
        num_parcelle: desc.getAttribute('numero-parcelle') || '',
        code, precision: prec,
        nom_culture: info.nom, precision_label: info.precision_label,
        surface_cat: info.surface_cat, eco: info.eco, section: info.section,
        culture_sec: cp.getAttribute('culture-secondaire') || '',
        declare_iae: cp.getAttribute('declare-IAE') || '',
        prod_semences: cp.getAttribute('production-semences') || '',
        longueur_bordure: getText(cp, 'longueur-bordure'),
        prod_fermiers: cp.getAttribute('production-fermiers') || '',
        deshydratation: cp.getAttribute('deshydratation') || '',
        derogation_ukraine: cp.getAttribute('derogation-ukraine') || '',
        accident_culture: cp.getAttribute('accident-culture') || '',
        prise_connaissance_phyto: cp.getAttribute('prise-connaissance-interdiction-phyto') || '',
        reconversion_pp: get('reconversion-pp')?.textContent.trim() || '',
        retournement_pp: get('retournement-pp')?.textContent.trim() || '',
        obligation_reimplantation_pp: get('obligation-reimplantation-pp')?.textContent.trim() || '',
        agri_bio_conduite: get('agri-bio')?.getAttribute('conduite-bio') || '',
        agri_bio_type: get('agri-bio')?.getAttribute('type-conduite-bio') || '',
        agri_bio_maraichage: get('agri-bio')?.getAttribute('conduite-maraichage') || '',
        engmaec_surface_cible: get('engagements-maec')?.getAttribute('surface-cible') || '',
        engmaec_elevage_mono: get('engagements-maec')?.getAttribute('elevage-monogastrique') || '',
        surface_admissible_ha: saHaVal,
        area_ha: area,
        _unk: info.surface_cat === '?'
      });

      // Géométrie parcelle
      const geomParc = parc.getElementsByTagNameNS(NS, 'geometrie')[0]
        ?.getElementsByTagNameNS(GML, 'Polygon')[0];
      if (geomParc) {
        const poly = parseGmlPolygon(geomParc.outerHTML);
        if (poly) parcelsList.push({
          ilot: iNum, parcelle: desc.getAttribute('numero-parcelle') || '',
          culture: code, surface: saAres, geom: poly
        });
      }
    }

    // ── MAEC surfaciques ─────────────────────────────
    const maecS = ilot.getElementsByTagNameNS(NS, 'elements-maec-S')[0];
    if (maecS) {
      for (const elem of maecS.getElementsByTagNameNS(NS, 'element-surfacique')) {
        const numElem  = getText(elem, 'numero-element');
        const codeMes  = getText(elem, 'code-mesure');
        const premCamp = getText(elem, 'premiere-campagne');
        const dernCamp = getText(elem, 'derniere-campagne');

        // Surface calculée
        const gc = elem.getElementsByTagNameNS(GML, 'coordinates')[0];
        const pts = extractLambertPts(gc);
        const maecArea = pts.length >= 3 ? shoelaceHa(pts) : null;

        // Géométrie pour la carte
        const geomNode = elem.getElementsByTagNameNS(GML, 'Polygon')[0];
        if (geomNode) {
          const poly = parseGmlPolygon(geomNode.outerHTML);
          if (poly) maecSurf.push({ code: codeMes, geom: poly });
        }

        const matchRow = rows.find(r => r.ilot_num === iNum && r.num_parcelle === numElem);
        maecRows.push({
          ilot_num: iNum, ilot_ref: iRef,
          commune: com || matchRow?.commune || '',
          num_parcelle: numElem, code_mesure: codeMes,
          premiere_campagne: premCamp, derniere_campagne: dernCamp,
          maec_area_ha: maecArea,
          surface_admissible_ha: matchRow?.surface_admissible_ha ?? null,
          nom_culture: matchRow?.nom_culture || '—',
          code: matchRow?.code || '—'
        });
      }
    }

    // ── MAEC linéaires ───────────────────────────────
    const maecL = ilot.getElementsByTagNameNS(NS, 'elements-maec-L')[0];
    if (maecL) {
      for (const elem of maecL.getElementsByTagNameNS(NS, 'element-lineaire')) {
        const codeMes = getText(elem, 'code-mesure');
        const geomNode = elem.getElementsByTagNameNS(GML, 'LineString')[0];
        if (geomNode) {
          const line = parseGmlLineString(geomNode.outerHTML);
          if (line) maecLine.push({ code: codeMes, geom: line });
        }
      }
    }

    // ── MAEC ponctuelles ─────────────────────────────
    const maecP = ilot.getElementsByTagNameNS(NS, 'elements-maec-P')[0];
    if (maecP) {
      for (const elem of maecP.getElementsByTagNameNS(NS, 'element-ponctuel')) {
        const codeMes = getText(elem, 'code-mesure');
        const geomNode = elem.getElementsByTagNameNS(GML, 'Point')[0];
        if (geomNode) {
          const pt = parseGmlPoint(geomNode.outerHTML);
          if (pt) maecPoint.push({ code: codeMes, geom: pt });
        }
      }
    }
  }

  console.log(`Parcelles extraites : ${rows.length}`);
  console.log(`MAEC — surfaciques : ${maecSurf.length}, linéaires : ${maecLine.length}, ponctuelles : ${maecPoint.length}`);
  console.log(`Temps de parsing : ${(performance.now() - t0).toFixed(0)} ms`);

  return {
    meta,
    rows,
    maecRows,
    ilotsGeo: Array.from(ilotsMap.values()),
    parcelsGeo: parcelsList,
    maecGeo: { surfaciques: maecSurf, lineaires: maecLine, ponctuelles: maecPoint },
    snaGeo: parseSNA(xmlDoc),  // Renommé pour correspondre à l'attendu dans carto.js
    xmlDoc
  };
}