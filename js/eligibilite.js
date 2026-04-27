// js/eligibilite.js - Version conforme à la notice PAC 2026
// Règles basées sur les tableaux pages 14 à 20 de la notice
import { formatHa, escHtml } from './utils.js';

// ===================================================
// RÈGLES D'ÉLIGIBILITÉ (conformes notice PAC 2026)
// ===================================================
//
// opt peut contenir une ou plusieurs conditions :
//   semCert   → productionSemences doit être true
//   noSemCert → productionSemences doit être false
//   noSemFerm → productionFermiers doit être false
//   deshyd    → deshydratation doit être true
//   noDeshyd  → deshydratation doit être false
//
// Attention : Une même parcelle ne peut être éligible qu'à une seule aide couplée.
// L'ordre des règles est important : l'aide graines est prioritaire sur l'aide fourragère
//
const ELIGIBILITY_RULES = [
  // ===================================================
  // Aides spécifiques (sans overlap avec légumineuses)
  // ===================================================
  { codes: ["RIZ"],                     precision: "001", aide: "Aide à la production de riz" },
  { codes: ["BDH","BDP"],               precision: "001", aide: "Aide à la production de blé dur" },
  { codes: ["HBL"],                     precision: null,  aide: "Aide à la production de houblon" },
  { codes: ["TOM"],                     precision: "001", aide: "Aide à la production de tomates destinées à la transformation" },
  { codes: ["GRA"],                     precision: null,  aide: "Aide à la production de semences de graminées prairiales", opt: "semCert" },
  { codes: ["PTC"],                     precision: "002", aide: "Aide à la production de pommes de terre féculières" },
  { codes: ["PRU"],                     precision: ["001","002"], aide: "Aide à la production de prunes d'Ente destinées à la transformation" },
  { codes: ["PWT"],                     precision: ["001","002"], aide: "Aide à la production de poires Williams destinées à la transformation" },
  { codes: ["PVT"],                     precision: ["001","002"], aide: "Aide à la production de pêches Pavie destinées à la transformation" },
  { codes: ["CBT"],                     precision: ["001","002"], aide: "Aide à la production de cerises Bigarreau destinées à la transformation" },
  { codes: ["CHV"],                     precision: null,          aide: "Aide à la production de chanvre" },

  // ===================================================
  // AIDE LÉGUMINEUSES À GRAINES / FOURRAGÈRES DÉSHYDRATÉES / SEMENCES
  // (une seule aide pour ces trois cas, page 4 de la notice)
  // ===================================================

  // --- Cas 1 : Graines (protéagineux, soja, légumes secs) sans semences certifiées ---
  {
    codes: ["ARA","FEV","FNU","FVL","FVP","GES","LDH","LDP","LEC","LOT","MLF","MPC","PHI","PHS","PPR","SAI","SOJ","TRE","VES"],
    precision: "001",
    aide: "Aide aux légumineuses à graines, fourragères déshydratées ou semences",
    opt: "noSemCert|noSemFerm|noDeshyd"
  },
  // --- Cas 1bis : Graines avec semences certifiées ---
  {
    codes: ["ARA","FEV","FNU","FVL","FVP","GES","LDH","LDP","LEC","LOT","MLF","MPC","PHI","PHS","PPR","SAI","SOJ","TRE","VES"],
    precision: "001",
    aide: "Aide aux légumineuses à graines, fourragères déshydratées ou semences",
    opt: "semCert|noSemFerm|noDeshyd"
  },
  // --- Cas 1ter : Graines avec semences fermières ---
  {
    codes: ["ARA","FEV","FNU","FVL","FVP","GES","LDH","LDP","LEC","LOT","MLF","MPC","PHI","PHS","PPR","SAI","SOJ","TRE","VES"],
    precision: "001",
    aide: "Aide aux légumineuses à graines, fourragères déshydratées ou semences",
    opt: "noSemCert|semFerm|noDeshyd"
  },

  // --- Cas 2 : Fourragères déshydratées (sans semences certifiées) ---
  // Attention : le code LUZ et d'autres sont en precision 002 pour ce cas
  {
    codes: ["FNU","FVL","FVP","GES","LDH","LDP","LEC","LOT","LUZ","MLF","PHI","PPR","SAI","TRE","VES"],
    precision: "002",
    aide: "Aide aux légumineuses à graines, fourragères déshydratées ou semences",
    opt: "noSemCert|noSemFerm|deshyd"
  },
  // --- Cas 2bis : Fourragères déshydratées avec semences certifiées ---
  {
    codes: ["FNU","FVL","FVP","GES","LDH","LDP","LEC","LOT","LUZ","MLF","PHI","PPR","SAI","TRE","VES"],
    precision: "002",
    aide: "Aide aux légumineuses à graines, fourragères déshydratées ou semences",
    opt: "semCert|noSemFerm|deshyd"
  },

  // --- Cas 3 : Semences de légumineuses fourragères (Luzerne, Trèfle, Sainfoin, Vesce, Lotier, Lentille) ---
  // Selon page 4 : "les surfaces cultivées pour la multiplication de semences certifiées de légumineuses fourragères"
  // Dans les tableaux pages 16-20, on voit des lignes avec semences certifiées=true et precision=001 ou 002
  {
    codes: ["LUZ","TRE","SAI","VES","LOT","LEC"],
    precision: "001",
    aide: "Aide aux légumineuses à graines, fourragères déshydratées ou semences",
    opt: "semCert|noSemFerm|noDeshyd"
  },
  {
    codes: ["LUZ","TRE","SAI","VES","LOT","LEC"],
    precision: "002",
    aide: "Aide aux légumineuses à graines, fourragères déshydratées ou semences",
    opt: "semCert|noSemFerm|deshyd"
  },

  // ===================================================
  // AIDE LÉGUMINEUSES FOURRAGÈRES (uniquement si non éligible à l'aide précédente)
  // Notice page 2 : "Une même surface ne peut être éligible qu'à une seule aide couplée"
  // Donc cette aide n'est attribuée que si la parcelle n'a pas déjà l'aide graines/déshydratation
  // ===================================================
  {
    codes: ["FVL","FVP","LEC","FNU","LOT","LDH","LDP","LUZ","PHI","PPR","SAI","TRE","VES","GES","PAG","MLF"],
    precision: "002",
    aide: "Aide aux légumineuses fourragères",
    opt: "noSemCert|noSemFerm|noDeshyd"
  },
  {
    codes: ["MLC","MLG"],
    precision: "001",
    aide: "Aide aux légumineuses fourragères",
    opt: "noSemCert|noSemFerm|noDeshyd"
  },

  // ===================================================
  // Aide maraîchage
  // ===================================================
  { codes: ["AIL","ART","FRA","CAR","MDI","CEL","CHU","CCN","EPI","FLA","FLP","LBF","MLO","NVT","OIG","RDI","PHF","POR","PVP","POT","PFR"], precision: null, aide: "Aide au maraîchage" }
];

// ===================================================
// EXTRACTION À PARTIR DU xmlDoc
// ===================================================
function extractParcellesFromDoc(xmlDoc) {
  const NS = 'urn:x-telepac:fr.gouv.agriculture.telepac:echange-producteur';
  const parcelles = [];

  for (const ilot of xmlDoc.getElementsByTagNameNS(NS, 'ilot')) {
    const numIlot = ilot.getAttribute('numero-ilot') || '?';

    for (const parc of ilot.getElementsByTagNameNS(NS, 'parcelle')) {
      const desc = parc.getElementsByTagNameNS(NS, 'descriptif-parcelle')[0];
      if (!desc) continue;
      const numParcelle = desc.getAttribute('numero-parcelle') || '?';

      const cp = desc.getElementsByTagNameNS(NS, 'culture-principale')[0];
      if (!cp) continue;

      const codeEl = cp.getElementsByTagNameNS(NS, 'code-culture')[0];
      const precEl = cp.getElementsByTagNameNS(NS, 'precision')[0];
      const saEl   = parc.getElementsByTagNameNS(NS, 'surface-admissible')[0];

      const codeCulture       = codeEl ? codeEl.textContent.trim() : '';
      const precision         = precEl ? precEl.textContent.trim() : '';
      const surface           = saEl   ? parseFloat(saEl.textContent.trim()) || 0 : 0;

      const productionSemences = cp.getAttribute('production-semences') === 'true';
      const productionFermiers = cp.getAttribute('production-fermiers') === 'true';
      const deshydratation     = cp.getAttribute('deshydratation')      === 'true';

      if (codeCulture) {
        parcelles.push({
          ilot: numIlot,
          parcelle: numParcelle,
          codeCulture,
          precision,
          surface,
          productionSemences,
          productionFermiers,
          deshydratation
        });
      }
    }
  }
  console.log(`Parcelles extraites pour éligibilité : ${parcelles.length}`);
  return parcelles;
}

function extractRequestedAidesFromDoc(xmlDoc) {
  const NS = 'urn:x-telepac:fr.gouv.agriculture.telepac:echange-producteur';
  const aides = [];

  const p1 = xmlDoc.getElementsByTagNameNS(NS, 'demandes-aides-pilier1-et-AR')[0];
  if (!p1) return aides;

  const legF = p1.getElementsByTagNameNS(NS, 'demande-legumineuses-fourrageres')[0];
  if (legF?.getAttribute('legumineuse-fourragere') === 'true') aides.push("Aide aux légumineuses fourragères");

  const legG = p1.getElementsByTagNameNS(NS, 'demande-legumineuses-graines')[0];
  if (legG?.getAttribute('legumineuse-graine') === 'true') aides.push("Aide aux légumineuses à graines, fourragères déshydratées ou semences");

  const assR = p1.getElementsByTagNameNS(NS, 'demande-assurance-recolte')[0];
  if (assR?.getAttribute('assurance-recolte') === 'true') aides.push("Aide à l'assurance récolte");

  const dec = p1.getElementsByTagNameNS(NS, 'demande-aides-decouplees')[0];
  if (dec?.getAttribute('aides-decouplees') === 'true') aides.push("Aides découplées (DPB)");

  const eco = p1.getElementsByTagNameNS(NS, 'demande-aide-ecoregime')[0];
  if (eco?.getAttribute('aide-ecoregime') === 'true') aides.push("Écorégime");

  const COUPLED_ATTRS = [
    ['ble-dur',                "Aide à la production de blé dur"],
    ['riz',                    "Aide à la production de riz"],
    ['houblon',                "Aide à la production de houblon"],
    ['tomates-industrie',      "Aide à la production de tomates destinées à la transformation"],
    ['semences-graminees',     "Aide à la production de semences de graminées prairiales"],
    ['pommes-terre-feculieres',"Aide à la production de pommes de terre féculières"],
    ['prunes-transformation',  "Aide à la production de prunes d'Ente destinées à la transformation"],
    ['poires-transformation',  "Aide à la production de poires Williams destinées à la transformation"],
    ['peches-transformation',  "Aide à la production de pêches Pavie destinées à la transformation"],
    ['cerises-transformation', "Aide à la production de cerises Bigarreau destinées à la transformation"],
    ['chanvre',                "Aide à la production de chanvre"],
    ['maraichage',             "Aide au maraîchage"],
  ];
  for (const [attr, label] of COUPLED_ATTRS) {
    if (p1.getAttribute(attr) === 'true' && !aides.includes(label)) aides.push(label);
  }

  console.log('Aides demandées extraites :', aides);
  return aides;
}

// ===================================================
// CALCUL DES AIDES ÉLIGIBLES PAR PARCELLE
// ===================================================
function getEligibleAides(parcelle) {
  const aides = [];

  for (const rule of ELIGIBILITY_RULES) {
    // 1. Le code culture doit figurer dans la règle
    if (!rule.codes.includes(parcelle.codeCulture)) continue;

    // 2. La précision doit correspondre (null = pas de contrainte)
    if (rule.precision !== null) {
      const prec = String(parcelle.precision || '');
      if (Array.isArray(rule.precision)) {
        if (!rule.precision.includes(prec)) continue;
      } else if (prec !== rule.precision) continue;
    }

    // 3. Évaluation des conditions optionnelles
    if (rule.opt) {
      const opts = rule.opt.split('|');
      let exclu = false;

      for (const o of opts) {
        if (o === 'semCert'   && !parcelle.productionSemences) { exclu = true; break; }
        if (o === 'noSemCert' &&  parcelle.productionSemences) { exclu = true; break; }
        if (o === 'semFerm'   && !parcelle.productionFermiers) { exclu = true; break; }
        if (o === 'noSemFerm' &&  parcelle.productionFermiers) { exclu = true; break; }
        if (o === 'deshyd'    && !parcelle.deshydratation)     { exclu = true; break; }
        if (o === 'noDeshyd'  &&  parcelle.deshydratation)     { exclu = true; break; }
      }

      if (exclu) continue;
    }

    // Éviter les doublons d'aide pour une même parcelle
    if (!aides.includes(rule.aide)) aides.push(rule.aide);
    
    // Si on a trouvé une aide pour cette parcelle, on s'arrête ?
    // NON ! Selon la notice, une parcelle ne peut être éligible qu'à une seule aide couplée.
    // Mais plusieurs règles peuvent correspondre (ex: graines + fourragères).
    // Pour respecter la notice, on ne garde que la première aide trouvée (priorité à l'aide graines/déshydratation)
    if (aides.length === 1) {
      // On a trouvé une aide, on ne cherche pas d'autre aide pour cette parcelle
      // car une parcelle ne peut être éligible qu'à une seule aide couplée
      return aides;
    }
  }

  return aides;
}

// ===================================================
// RENDU HTML (identique à la version précédente)
// ===================================================
export function renderEligibilite(xmlDoc) {
  console.log('renderEligibilite appelé, xmlDoc =', xmlDoc ? 'présent' : 'null');

  const noFile  = document.getElementById('elig-no-file');
  const results = document.getElementById('elig-results');

  if (!xmlDoc) {
    if (noFile)  noFile.style.display  = 'block';
    if (results) results.style.display = 'none';
    console.log('Aucun xmlDoc, affichage du message');
    return;
  }

  console.log('Extraction des parcelles...');
  const parcelles = extractParcellesFromDoc(xmlDoc);
  console.log(`${parcelles.length} parcelles extraites`);

  const requestedAides = extractRequestedAidesFromDoc(xmlDoc);
  console.log('Aides demandées:', requestedAides);

  const parcellesWithAides = parcelles
    .map(p => ({ ...p, aides: getEligibleAides(p) }))
    .filter(p => p.aides.length > 0);

  console.log(`${parcellesWithAides.length} parcelles éligibles`);

  const eligibleAidesSet = new Set();
  for (const p of parcellesWithAides) p.aides.forEach(a => eligibleAidesSet.add(a));
  const eligibleAides = [...eligibleAidesSet];
  const missingAides  = eligibleAides.filter(a => !requestedAides.includes(a));

  if (noFile)  noFile.style.display  = 'none';
  if (results) results.style.display = 'block';

  // Mise à jour des KPIs
  _setText('elig-stat-parcelles',   parcelles.length);
  _setText('elig-stat-eligibles',   parcellesWithAides.length);
  _setText('elig-stat-aides-dem',   requestedAides.length);
  _setText('elig-stat-aides-elig',  eligibleAides.length);
  _setText('elig-stat-manquantes',  missingAides.length);
  _setText('elig-count-dem',        requestedAides.length);
  _setText('elig-count-elig',       eligibleAides.length);
  _setText('elig-count-manq',       missingAides.length);

  // Alerte
  const alertDiv = document.getElementById('elig-alert');
  if (alertDiv) {
    if (missingAides.length > 0) {
      alertDiv.style.display = 'block';
      alertDiv.innerHTML = `<strong>⚠️ Attention !</strong> Vous êtes éligible à ${missingAides.length} aide(s) non demandée(s) :<br><br>
        ${missingAides.map(a => `• ${a}`).join('<br>')}<br><br>📝 Pensez à les ajouter avant la clôture.`;
    } else {
      alertDiv.style.display = 'none';
    }
  }

  // Listes
  const itemStyle = (cls, icon, txt) =>
    `<div style="background:${cls === 'req' ? '#dbeed4' : cls === 'elig' ? '#e0f0e6' : '#fff3e0'};
      border-left:4px solid ${cls === 'manq' ? '#e6a017' : '#2c6e3c'};
      padding:7px 12px;border-radius:10px;font-size:0.8rem;margin-bottom:6px">${icon} ${txt}</div>`;

  const listDem  = document.getElementById('elig-list-dem');
  const listElig = document.getElementById('elig-list-elig');
  const listManq = document.getElementById('elig-list-manq');

  if (listDem) listDem.innerHTML = requestedAides.length
    ? requestedAides.map(a => itemStyle('req', '📌', a)).join('')
    : '<p style="color:#aa6f5e;font-size:0.82rem">Aucune aide spécifique demandée</p>';

  if (listElig) listElig.innerHTML = eligibleAides.length
    ? eligibleAides.map(a => itemStyle('elig', '✅', a)).join('')
    : '<p style="color:#aa6f5e;font-size:0.82rem">Aucune aide couplée éligible</p>';

  if (listManq) listManq.innerHTML = missingAides.length
    ? missingAides.map(a => itemStyle('manq', '⚠️', a)).join('')
    : '<p style="color:#2a7f3a;font-weight:600;font-size:0.82rem">🎉 Toutes les aides éligibles ont été demandées !</p>';

  // Tableau
  const tbody = document.getElementById('elig-tbody');
  if (!tbody) return;

  if (parcellesWithAides.length === 0) {
    tbody.innerHTML = '<tr><td colspan="7" style="text-align:center;padding:40px;color:#aaa">✅ Aucune parcelle éligible aux aides couplées végétales</td>' + '</tr>';
    return;
  }

  tbody.innerHTML = parcellesWithAides.map(p => {
    const aidesHtml = p.aides.map(a =>
      `<span style="background:#2a7f3a;color:white;padding:3px 10px;border-radius:40px;font-size:0.7rem;font-weight:600;display:inline-block;margin:2px">${a}</span>`
    ).join('');

    const flags = [
      p.productionSemences ? '🌱 Sem. certifiées' : null,
      p.productionFermiers ? '🌾 Sem. fermières'  : null,
      p.deshydratation     ? '♨️ Déshydratation'  : null,
    ].filter(Boolean);
    const flagsHtml = flags.length
      ? `<br><span style="font-size:0.65rem;color:#888">${flags.join(' · ')}</span>`
      : '';

    const hasRequested = p.aides.some(a => requestedAides.includes(a));
    const statusHtml = hasRequested
      ? `<span style="background:#6c8b5e;color:white;padding:3px 10px;border-radius:40px;font-size:0.7rem;font-weight:600">✅ Demandée</span>`
      : `<span style="background:#e6a017;color:white;padding:3px 10px;border-radius:40px;font-size:0.7rem;font-weight:600">❌ Non demandée</span>`;

    return `<tr>
      <td style="text-align:center;font-weight:700">${p.ilot}</td>
      <td style="text-align:center">${p.parcelle}</td>
      <td><span class="code-badge">${p.codeCulture}</span></td>
      <td style="text-align:center">${p.precision || '—'}</td>
      <td style="text-align:right">${p.surface}${flagsHtml}</td>
      <td>${aidesHtml}</td>
      <td style="text-align:center">${statusHtml}</td>
    </tr>`;
  }).join('');

  console.log('Rendu éligibilité terminé');
}

function _setText(id, val) {
  const el = document.getElementById(id);
  if (el) el.textContent = val;
}