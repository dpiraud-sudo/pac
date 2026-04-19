// js/eligibilite.js
// Analyse l'éligibilité aux aides couplées végétales à partir du xmlDoc déjà parsé.

// ===================================================
// RÈGLES D'ÉLIGIBILITÉ (identiques à la page standalone)
// ===================================================
const ELIGIBILITY_RULES = [
  { codes: ["RIZ"],                                                                                    precision: "001",         aide: "Aide à la production de riz" },
  { codes: ["BDH","BDP"],                                                                              precision: "001",         aide: "Aide à la production de blé dur" },
  { codes: ["HBL"],                                                                                    precision: null,          aide: "Aide à la production de houblon" },
  { codes: ["TOM"],                                                                                    precision: "001",         aide: "Aide à la production de tomates destinées à la transformation" },
  { codes: ["GRA"],                                                                                    precision: null,          aide: "Aide à la production de semences de graminées prairiales", opt: "semCert" },
  { codes: ["PTC"],                                                                                    precision: "002",         aide: "Aide à la production de pommes de terre féculières" },
  { codes: ["PRU"],                                                                                    precision: ["001","002"],  aide: "Aide à la production de prunes d'Ente destinées à la transformation" },
  { codes: ["PWT"],                                                                                    precision: ["001","002"],  aide: "Aide à la production de poires Williams destinées à la transformation" },
  { codes: ["PVT"],                                                                                    precision: ["001","002"],  aide: "Aide à la production de pêches Pavie destinées à la transformation" },
  { codes: ["CBT"],                                                                                    precision: ["001","002"],  aide: "Aide à la production de cerises Bigarreau destinées à la transformation" },
  { codes: ["CHV"],                                                                                    precision: null,          aide: "Aide à la production de chanvre" },
  // Légumineuses fourragères
  { codes: ["FVL","FVP","LEC","FNU","LOT","LDH","LDP","LUZ","PHI","PPR","SAI","TRE","VES","GES","PAG","MLF"], precision: "002", aide: "Aide aux légumineuses fourragères" },
  { codes: ["MLC","MLG"],                                                                              precision: "001",         aide: "Aide aux légumineuses fourragères" },
  { codes: ["BTA","BTH"],                                                                              precision: "003",         aide: "Aide aux légumineuses fourragères" },
  // Légumineuses à graines
  { codes: ["ARA","FEV","FNU","FVL","FVP","GES","LDH","LDP","LEC","MLF","MPC","PAG","PCH","PHI","PHS","PPR","SAI","SOJ","TRE","VES"], precision: "001", aide: "Aide aux légumineuses à graines" },
  // Maraîchage
  { codes: ["AIL","ART","FRA"],                                                                        precision: null,          aide: "Aide au maraîchage" },
  { codes: ["CAR","MDI"],                                                                              precision: "001",         aide: "Aide au maraîchage" },
  { codes: ["TOM"],                                                                                    precision: "002",         aide: "Aide au maraîchage" }
];

// ===================================================
// EXTRACTION À PARTIR DU xmlDoc (DOM — plus fiable que regex)
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

      if (codeCulture) {
        parcelles.push({ ilot: numIlot, parcelle: numParcelle, codeCulture, precision, surface, productionSemences });
      }
    }
  }
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
  if (legG?.getAttribute('legumineuse-graine') === 'true') aides.push("Aide aux légumineuses à graines");

  const assR = p1.getElementsByTagNameNS(NS, 'demande-assurance-recolte')[0];
  if (assR?.getAttribute('assurance-recolte') === 'true') aides.push("Aide à l'assurance récolte");

  const dec = p1.getElementsByTagNameNS(NS, 'demande-aides-decouplees')[0];
  if (dec?.getAttribute('aides-decouplees') === 'true') aides.push("Aides découplées (DPB)");

  const eco = p1.getElementsByTagNameNS(NS, 'demande-aide-ecoregime')[0];
  if (eco?.getAttribute('aide-ecoregime') === 'true') aides.push("Écorégime");

  // Aides couplées sur attributs directs de p1
  const COUPLED_ATTRS = [
    ['ble-dur',             "Aide à la production de blé dur"],
    ['riz',                 "Aide à la production de riz"],
    ['houblon',             "Aide à la production de houblon"],
    ['tomates-industrie',   "Aide à la production de tomates destinées à la transformation"],
    ['semences-graminees',  "Aide à la production de semences de graminées prairiales"],
    ['pommes-terre-feculieres', "Aide à la production de pommes de terre féculières"],
    ['prunes-transformation',   "Aide à la production de prunes d'Ente destinées à la transformation"],
    ['poires-transformation',   "Aide à la production de poires Williams destinées à la transformation"],
    ['peches-transformation',   "Aide à la production de pêches Pavie destinées à la transformation"],
    ['cerises-transformation',  "Aide à la production de cerises Bigarreau destinées à la transformation"],
    ['chanvre',             "Aide à la production de chanvre"],
    ['maraichage',          "Aide au maraîchage"],
  ];
  for (const [attr, label] of COUPLED_ATTRS) {
    if (p1.getAttribute(attr) === 'true' && !aides.includes(label)) aides.push(label);
  }

  return aides;
}

// ===================================================
// CALCUL D'ÉLIGIBILITÉ
// ===================================================
function getEligibleAides(parcelle) {
  const aides = [];
  for (const rule of ELIGIBILITY_RULES) {
    if (!rule.codes.includes(parcelle.codeCulture)) continue;
    if (rule.precision !== null) {
      const prec = String(parcelle.precision || '');
      if (Array.isArray(rule.precision)) { if (!rule.precision.includes(prec)) continue; }
      else if (prec !== rule.precision) continue;
    }
    if (rule.opt === 'semCert' && !parcelle.productionSemences) continue;
    if (!aides.includes(rule.aide)) aides.push(rule.aide);
  }
  return aides;
}

// ===================================================
// RENDU
// ===================================================
export function renderEligibilite(xmlDoc) {
  const noFile  = document.getElementById('elig-no-file');
  const results = document.getElementById('elig-results');

  if (!xmlDoc) {
    if (noFile)  noFile.style.display  = 'block';
    if (results) results.style.display = 'none';
    return;
  }

  const parcelles      = extractParcellesFromDoc(xmlDoc);
  const requestedAides = extractRequestedAidesFromDoc(xmlDoc);

  const parcellesWithAides = parcelles
    .map(p => ({ ...p, aides: getEligibleAides(p) }))
    .filter(p => p.aides.length > 0);

  const eligibleAidesSet = new Set();
  for (const p of parcellesWithAides) p.aides.forEach(a => eligibleAidesSet.add(a));
  const eligibleAides = [...eligibleAidesSet];
  const missingAides  = eligibleAides.filter(a => !requestedAides.includes(a));

  // Afficher résultats
  if (noFile)  noFile.style.display  = 'none';
  if (results) results.style.display = 'block';

  // KPIs
  _setText('elig-stat-parcelles',  parcelles.length);
  _setText('elig-stat-eligibles',  parcellesWithAides.length);
  _setText('elig-stat-aides-dem',  requestedAides.length);
  _setText('elig-stat-aides-elig', eligibleAides.length);
  _setText('elig-stat-manquantes', missingAides.length);
  _setText('elig-count-dem',  requestedAides.length);
  _setText('elig-count-elig', eligibleAides.length);
  _setText('elig-count-manq', missingAides.length);

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

  // Listes comparaison
  const itemStyle = (cls, icon, txt) =>
    `<div style="background:${cls === 'req' ? '#dbeed4' : cls === 'elig' ? '#e0f0e6' : '#fff3e0'};
      border-left:4px solid ${cls === 'manq' ? '#e6a017' : '#2c6e3c'};
      padding:7px 12px;border-radius:10px;font-size:0.8rem;margin-bottom:6px">${icon} ${txt}</div>`;

  const listDem  = document.getElementById('elig-list-dem');
  const listElig = document.getElementById('elig-list-elig');
  const listManq = document.getElementById('elig-list-manq');

  if (listDem)  listDem.innerHTML  = requestedAides.length
    ? requestedAides.map(a => itemStyle('req',  '📌', a)).join('')
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
    tbody.innerHTML = '<tr><td colspan="7" style="text-align:center;padding:40px;color:#aaa">✅ Aucune parcelle éligible aux aides couplées végétales</td></tr>';
    return;
  }

  tbody.innerHTML = parcellesWithAides.map(p => {
    const aidesHtml = p.aides.map(a =>
      `<span style="background:#2a7f3a;color:white;padding:3px 10px;border-radius:40px;font-size:0.7rem;font-weight:600;display:inline-block;margin:2px">${a}</span>`
    ).join('');

    const hasRequested = p.aides.some(a => requestedAides.includes(a));
    const statusHtml   = hasRequested
      ? `<span style="background:#6c8b5e;color:white;padding:3px 10px;border-radius:40px;font-size:0.7rem;font-weight:600">✅ Demandée</span>`
      : `<span style="background:#e6a017;color:white;padding:3px 10px;border-radius:40px;font-size:0.7rem;font-weight:600">❌ Non demandée</span>`;

    return `<tr>
      <td style="text-align:center;font-weight:700">${p.ilot}</td>
      <td style="text-align:center">${p.parcelle}</td>
      <td><span class="code-badge">${p.codeCulture}</span></td>
      <td style="text-align:center">${p.precision || '—'}</td>
      <td style="text-align:right">${p.surface}</td>
      <td>${aidesHtml}</td>
      <td style="text-align:center">${statusHtml}</td>
    </tr>`;
  }).join('');
}

function _setText(id, val) {
  const el = document.getElementById(id);
  if (el) el.textContent = val;
}
