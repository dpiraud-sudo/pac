// js/parser.js - Version optimisée pour les gros fichiers XML
import { lookup } from './data.js';

proj4.defs("EPSG:2154", "+proj=lcc +lat_1=49 +lat_2=44 +lat_0=46.5 +lon_0=3 +x_0=700000 +y_0=6600000 +ellps=GRS80 +towgs84=0,0,0,0,0,0,0 +units=m +no_defs");

export function convertToLatLng(x, y) {
  const [lon, lat] = proj4("EPSG:2154", "EPSG:4326", [parseFloat(x), parseFloat(y)]);
  return [lat, lon];
}

export function parseGmlPolygon(gmlString) {
  if (!gmlString) return null;
  const coordRegex = /<gml:coordinates>([\s\S]*?)<\/gml:coordinates>/g;
  const matches = [...gmlString.matchAll(coordRegex)];
  if (matches.length === 0) return null;
  const outerCoords = matches[0][1].trim().split(/\s+/);
  const outerRing = [];
  for (let pair of outerCoords) {
    if (pair === "") continue;
    const [x, y] = pair.split(',').map(Number);
    if (!isNaN(x) && !isNaN(y)) outerRing.push(convertToLatLng(x, y));
  }
  return outerRing.length >= 3 ? outerRing : null;
}

export function parseGmlLineString(gmlString) {
  if (!gmlString) return null;
  const coordRegex = /<gml:coordinates>([\s\S]*?)<\/gml:coordinates>/;
  const match = gmlString.match(coordRegex);
  if (!match) return null;
  const coords = match[1].trim().split(/\s+/);
  const points = [];
  for (let pair of coords) {
    if (pair === "") continue;
    const [x, y] = pair.split(',').map(Number);
    if (!isNaN(x) && !isNaN(y)) points.push(convertToLatLng(x, y));
  }
  return points.length >= 2 ? points : null;
}

export function parseGmlPoint(gmlString) {
  if (!gmlString) return null;
  const coordRegex = /<gml:coordinates>([\s\S]*?)<\/gml:coordinates>/;
  const match = gmlString.match(coordRegex);
  if (!match) return null;
  const [x, y] = match[1].trim().split(',').map(Number);
  if (isNaN(x) || isNaN(y)) return null;
  return convertToLatLng(x, y);
}

// Parsing des SNA
function parseSNA(xmlDoc) {
    const NS = 'urn:x-telepac:fr.gouv.agriculture.telepac:echange-producteur';
    const snaList = [];
    
    const snaNodes = xmlDoc.getElementsByTagNameNS(NS, 'sna-declaree');
    
    for (const sna of snaNodes) {
        const numero = sna.getElementsByTagNameNS(NS, 'numeroSna')[0]?.textContent || '';
        const surfaceGraphique = sna.getElementsByTagNameNS(NS, 'surfaceGraphique')[0]?.textContent || '0';
        const categorie = sna.getElementsByTagNameNS(NS, 'categorieSna')[0]?.textContent || '';
        const type = sna.getElementsByTagNameNS(NS, 'typeSna')[0]?.textContent || '';
        const largeur = sna.getElementsByTagNameNS(NS, 'largeur')[0]?.textContent || null;
        
        let geometryType = null;
        const geomNode = sna.getElementsByTagNameNS('http://www.opengis.net/gml', 'Polygon')[0] ||
                        sna.getElementsByTagNameNS('http://www.opengis.net/gml', 'Point')[0] ||
                        sna.getElementsByTagNameNS('http://www.opengis.net/gml', 'LineString')[0];
        
        if (geomNode) geometryType = geomNode.localName;
        
        let ilotAssocie = null;
        let parcelleAssociee = null;
        
        const intersectionsIlots = sna.getElementsByTagNameNS(NS, 'intersectionsSnaIlots')[0];
        if (intersectionsIlots) {
            const intersection = intersectionsIlots.getElementsByTagNameNS(NS, 'intersectionSnaIlot')[0];
            if (intersection) {
                ilotAssocie = intersection.getElementsByTagNameNS(NS, 'numeroIlot')[0]?.textContent || null;
            }
        }
        
        const intersectionsParcelles = sna.getElementsByTagNameNS(NS, 'intersectionsSnaParcelles')[0];
        if (intersectionsParcelles) {
            const intersection = intersectionsParcelles.getElementsByTagNameNS(NS, 'intersectionSnaParcelle')[0];
            if (intersection) {
                ilotAssocie = intersection.getElementsByTagNameNS(NS, 'numeroIlot')[0]?.textContent || ilotAssocie;
                parcelleAssociee = intersection.getElementsByTagNameNS(NS, 'numeroParcelle')[0]?.textContent || null;
            }
        }
        
        snaList.push({
            numero: numero,
            surface_ha: parseFloat(surfaceGraphique),
            categorie: categorie,
            type: type,
            largeur: largeur ? parseFloat(largeur) : null,
            geometry_type: geometryType,
            ilot_associe: ilotAssocie,
            parcelle_associee: parcelleAssociee
        });
    }
    
    return snaList;
}

// Fonction principale de parsing optimisée
export function parseXML(xmlString) {
    console.log("Début du parsing XML...");
    const startTime = performance.now();
    
    const parser = new DOMParser();
    const xmlDoc = parser.parseFromString(xmlString, 'application/xml');
    
    // Vérifier les erreurs de parsing
    const parseError = xmlDoc.querySelector('parsererror');
    if (parseError) {
        throw new Error('Erreur de syntaxe XML : ' + parseError.textContent);
    }
    
    const NS = 'urn:x-telepac:fr.gouv.agriculture.telepac:echange-producteur';
    const GML = 'http://www.opengis.net/gml';
    
    const t = (el, tag) => {
        const e = el.getElementsByTagNameNS(NS, tag)[0];
        return e ? e.textContent.trim() : '';
    };
    
    const prod = xmlDoc.getElementsByTagNameNS(NS, 'producteur')[0];
    
    // Extraction exploitant
    let exploitantNom = '';
    const demandeur = xmlDoc.getElementsByTagNameNS(NS, 'demandeur')[0];
    if (demandeur) {
        const identSoc = demandeur.getElementsByTagNameNS(NS, 'identification-societe')[0];
        if (identSoc) {
            exploitantNom = t(identSoc, 'exploitation') || t(identSoc, 'raison-sociale') || '';
        }
        if (!exploitantNom) {
            const identIndiv = demandeur.getElementsByTagNameNS(NS, 'identification-individuelle')[0];
            if (identIndiv) {
                const identite = identIndiv.getElementsByTagNameNS(NS, 'identite')[0];
                if (identite) {
                    const nom = t(identite, 'nom') || '';
                    const prenom = t(identite, 'prenoms') || '';
                    exploitantNom = (prenom + ' ' + nom).trim();
                }
            }
        }
    }
    
    const meta = {
        pacage: prod?.getAttribute('numero-pacage') || '',
        campagne: prod?.getAttribute('campagne') || '',
        exploitation: exploitantNom,
        siret: t(xmlDoc, 'siret')
    };
    
    console.log("Exploitation:", exploitantNom);
    
    const rows = [];
    const ilotsMap = new Map();
    const parcelsList = [];
    const maecSurf = [], maecLine = [], maecPoint = [];
    
    const ilots = xmlDoc.getElementsByTagNameNS(NS, 'ilot');
    console.log(`Nombre d'îlots trouvés: ${ilots.length}`);
    
    for (const ilot of ilots) {
        const iNum = ilot.getAttribute('numero-ilot') || '';
        const iRef = ilot.getAttribute('numero-ilot-reference') || '';
        const com = t(ilot, 'commune');
        
        // Géométrie îlot (optionnelle, on peut la sauter si trop lourde)
        const geomIlot = ilot.getElementsByTagNameNS(NS, 'geometrie')[0]?.getElementsByTagNameNS(GML, 'Polygon')[0];
        if (geomIlot) {
            const poly = parseGmlPolygon(geomIlot.outerHTML);
            if (poly) ilotsMap.set(iNum, { numero: iNum, reference: iRef, geom: poly });
        }
        
        const parcelles = ilot.getElementsByTagNameNS(NS, 'parcelle');
        for (const parc of parcelles) {
            const desc = parc.getElementsByTagNameNS(NS, 'descriptif-parcelle')[0];
            if (!desc) continue;
            const cp = desc.getElementsByTagNameNS(NS, 'culture-principale')[0];
            if (!cp) continue;
            
            const code = t(cp, 'code-culture');
            const prec = t(cp, 'precision');
            const saEl = parc.getElementsByTagNameNS(NS, 'surface-admissible')[0];
            
            // Calcul de surface à partir des coordonnées (optionnel, peut être sauté)
            let area = null;
            const gc = parc.getElementsByTagNameNS(GML, 'coordinates')[0];
            if (gc && gc.textContent) {
                const pts = gc.textContent.trim().split(/\s+/).reduce((a, tok) => {
                    if (tok.includes(',')) {
                        const [x, y] = tok.split(',').map(Number);
                        if (!isNaN(x) && !isNaN(y)) a.push([x, y]);
                    }
                    return a;
                }, []);
                if (pts.length >= 3) {
                    let s = 0;
                    for (let i = 0; i < pts.length; i++) {
                        const j = (i + 1) % pts.length;
                        s += pts[i][0] * pts[j][1] - pts[j][0] * pts[i][1];
                    }
                    area = Math.abs(s) / 2 / 10000;
                }
            }
            
            const info = lookup(code, prec);
            const saAres = saEl ? saEl.textContent.trim() : '';
            const saHaVal = saAres ? Number(saAres) / 100 : null;
            
            const reconvPP = desc.getElementsByTagNameNS(NS, 'reconversion-pp')[0];
            const retourPP = desc.getElementsByTagNameNS(NS, 'retournement-pp')[0];
            const obligPP = desc.getElementsByTagNameNS(NS, 'obligation-reimplantation-pp')[0];
            const agriBio = desc.getElementsByTagNameNS(NS, 'agri-bio')[0];
            const engMaec = desc.getElementsByTagNameNS(NS, 'engagements-maec')[0];
            
            rows.push({
                ilot_num: iNum, ilot_ref: iRef, commune: com, num_parcelle: desc.getAttribute('numero-parcelle') || '',
                code, precision: prec, nom_culture: info.nom, precision_label: info.precision_label,
                surface_cat: info.surface_cat, eco: info.eco, section: info.section,
                culture_sec: cp.getAttribute('culture-secondaire') || '', declare_iae: cp.getAttribute('declare-IAE') || '',
                prod_semences: cp.getAttribute('production-semences') || '', longueur_bordure: t(cp, 'longueur-bordure'),
                prod_fermiers: cp.getAttribute('production-fermiers') || '', deshydratation: cp.getAttribute('deshydratation') || '',
                derogation_ukraine: cp.getAttribute('derogation-ukraine') || '', accident_culture: cp.getAttribute('accident-culture') || '',
                prise_connaissance_phyto: cp.getAttribute('prise-connaissance-interdiction-phyto') || '',
                reconversion_pp: reconvPP ? reconvPP.textContent.trim() : '',
                retournement_pp: retourPP ? retourPP.textContent.trim() : '',
                obligation_reimplantation_pp: obligPP ? obligPP.textContent.trim() : '',
                agri_bio_conduite: agriBio ? agriBio.getAttribute('conduite-bio') || '' : '',
                agri_bio_type: agriBio ? agriBio.getAttribute('type-conduite-bio') || '' : '',
                agri_bio_maraichage: agriBio ? agriBio.getAttribute('conduite-maraichage') || '' : '',
                engmaec_surface_cible: engMaec ? engMaec.getAttribute('surface-cible') || '' : '',
                engmaec_elevage_mono: engMaec ? engMaec.getAttribute('elevage-monogastrique') || '' : '',
                surface_admissible_ha: saHaVal,
                area_ha: area, _unk: info.surface_cat === '?'
            });
            
            // Géométrie parcelle (optionnelle)
            const geomParc = parc.getElementsByTagNameNS(NS, 'geometrie')[0]?.getElementsByTagNameNS(GML, 'Polygon')[0];
            if (geomParc) {
                const poly = parseGmlPolygon(geomParc.outerHTML);
                if (poly) {
                    parcelsList.push({ ilot: iNum, parcelle: desc.getAttribute('numero-parcelle') || '', culture: code, surface: saAres, geom: poly });
                }
            }
        }
    }
    
    console.log(`Parcelles extraites: ${rows.length}`);
    
    // Parsing MAEC
    const maecRows = [];
    for (const ilot of ilots) {
        const iNum = ilot.getAttribute('numero-ilot') || '';
        const iRef = ilot.getAttribute('numero-ilot-reference') || '';
        const com = t(ilot, 'commune');
        const maecS = ilot.getElementsByTagNameNS(NS, 'elements-maec-S')[0];
        if (maecS) {
            for (const elem of maecS.getElementsByTagNameNS(NS, 'element-surfacique')) {
                const numElem = t(elem, 'numero-element');
                const codeMesure = t(elem, 'code-mesure');
                const premCamp = t(elem, 'premiere-campagne');
                const dernCamp = t(elem, 'derniere-campagne');
                let maecArea = null;
                const gc = elem.getElementsByTagNameNS(GML, 'coordinates')[0];
                if (gc && gc.textContent) {
                    const pts = gc.textContent.trim().split(/\s+/).reduce((a, tok) => {
                        if (tok.includes(',')) {
                            const [x, y] = tok.split(',').map(Number);
                            if (!isNaN(x) && !isNaN(y)) a.push([x, y]);
                        }
                        return a;
                    }, []);
                    if (pts.length >= 3) {
                        let s = 0;
                        for (let i = 0; i < pts.length; i++) {
                            const j = (i + 1) % pts.length;
                            s += pts[i][0] * pts[j][1] - pts[j][0] * pts[i][1];
                        }
                        maecArea = Math.abs(s) / 2 / 10000;
                    }
                }
                const matchRow = rows.find(r => r.ilot_num === iNum && r.num_parcelle === numElem);
                maecRows.push({
                    ilot_num: iNum, ilot_ref: iRef, commune: com || (matchRow?.commune || ''),
                    num_parcelle: numElem, code_mesure: codeMesure,
                    premiere_campagne: premCamp, derniere_campagne: dernCamp,
                    maec_area_ha: maecArea,
                    surface_admissible_ha: matchRow?.surface_admissible_ha ?? null,
                    nom_culture: matchRow?.nom_culture || '—', code: matchRow?.code || '—'
                });
            }
        }
    }
    
    const ilotsGeo = Array.from(ilotsMap.values());
    const parcelsGeo = parcelsList;
    const maecGeo = { surfaciques: maecSurf, lineaires: maecLine, ponctuelles: maecPoint };
    const snaList = parseSNA(xmlDoc);
    
    console.log(`SNA extraites: ${snaList.length}`);
    console.log(`Temps de parsing: ${(performance.now() - startTime).toFixed(0)} ms`);
    
    return { meta, rows, maecRows, ilotsGeo, parcelsGeo, maecGeo, snaList, xmlDoc };
}