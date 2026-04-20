// js/comparaison.js
import { extractAidesFromDoc } from './aides.js';
import { parseXML } from './parser.js';
import { escHtml } from './utils.js';

let docN  = null;
let docN1 = null;

// Données d'îlots — alimentées depuis l'extérieur
let ilotsN  = [];   // rows campagne N  (chargées via setIlotsN depuis main.js)
let ilotsN1 = [];   // rows campagne N-1 (extraites à la lecture du fichier N-1)

// Flag pour éviter de binder les événements deux fois
let delegationBound = false;

const VOIE_LABELS = {
  "VC": "Certification (VC)",
  "VP": "Pratiques (VP)",
  "VB": "Environnementale IAE (VB)",
  "VH": "Haies (VH)"
};

const ANIMAUX = [
  ["OV", "Ovins"], ["CA", "Caprins"], ["EQ", "Équins"],
  ["AL", "Alpaga"], ["LA", "Lama"], ["CE", "Cerf et Biche"],
  ["DA", "Daim et Daine"], ["TR", "Truies"], ["AP", "Autres porcins"],
  ["PP", "Poules pondeuses"], ["AV", "Autres volailles"]
];

const AIDES_LABELS = {
  "aides-decouplees":        "Aides découplées",
  "aide-jeunes-agriculteurs":"👨‍🌾 Jeunes Agriculteurs (JA)",
  "eco-regime":              "Éco-régime",
  "legumineuse-fourragere":  "🌿 Légumineuses fourragères",
  "legumineuse-graine":      "🫘 Légumineuses à graines",
  "ble-dur":                 "🌾 Blé dur",
  "prunes-transformation":   "🍑 Prunes (transformation)",
  "cerises-transformation":  "🍒 Cerises (transformation)",
  "peches-transformation":   "🍑 Pêches (transformation)",
  "poires-transformation":   "🍐 Poires (transformation)",
  "tomates-industrie":       "🍅 Tomates industrie",
  "pommes-terre-feculieres": "🥔 PDT féculières",
  "chanvre":                 "🌿 Chanvre",
  "houblon":                 "🍺 Houblon",
  "semences-graminees":      "🌱 Semences graminées",
  "riz":                     "🍚 Riz",
  "maraichage":              "🥕 Maraîchage",
  "demande-ab":              "Agriculture Biologique (AB)",
  "demande-maec":            "MAEC",
  "demande-ichn":            "ICHN",
  "assurance-recolte":       "Assurance récolte"
};

const ISN_LABELS = {
  "interlocuteur-agree-ISN": "Interlocuteur agréé ISN",
  "autorisation-transmission-donnees-interlocuteur-ISN": "Autorisation transmission données interlocuteur ISN",
  "renonciation-ISN": "Renonciation ISN",
  "transmission-donnees-fins-commerciales": "Transmission données fins commerciales",
  "autorisation-transmission-donnees": "Autorisation transmission données"
};

// ===================================================
// API PUBLIQUE
// ===================================================
export function setDocN(xmlDoc) {
  docN = xmlDoc;
}

/** Appeler avec data.rows issu de parseXML() pour la campagne N, depuis main.js */
export function setIlotsN(rows) {
  ilotsN = Array.isArray(rows) ? rows : [];
}

export function resetComparaison() {
  docN  = null;
  docN1 = null;
  ilotsN  = [];
  ilotsN1 = [];
  delegationBound = false;
}

export function renderComparaison() {
  const area = document.getElementById('comp-result-area');
  if (!area) return;

  if (!docN) {
    area.innerHTML = emptyState('📂', 'Chargez d\'abord un fichier XML principal.');
    return;
  }

  area.innerHTML = buildLayout();

  if (!delegationBound) {
    bindDelegatedEvents(area);
    delegationBound = true;
  }

  if (docN1) renderTable(area);
}

// ===================================================
// LAYOUT
// ===================================================
function buildLayout() {
  const dN    = extractAidesFromDoc(docN);
  const campN = dN.campagne || 'N';

  const n1Block = docN1
    ? (() => {
        const dN1 = extractAidesFromDoc(docN1);
        return `
          <div class="comp-loaded">✅ Campagne ${escHtml(dN1.campagne || '?')} chargée</div>
          <button type="button" class="comp-btn-change" id="comp-change-btn">🔄 Changer le fichier N-1</button>
          <input type="file" id="comp-file-input" accept=".xml" style="display:none">
        `;
      })()
    : `
        <div class="comp-drop-zone" id="comp-drop-zone">
          <div style="font-size:2rem;margin-bottom:8px">📂</div>
          <p>Glisser-déposer le fichier XML N-1 ici</p>
          <small>ou</small><br>
          <button type="button" class="comp-btn-upload" id="comp-upload-btn">
            📁 Choisir le fichier N-1
          </button>
          <input type="file" id="comp-file-input" accept=".xml" style="display:none">
        </div>
      `;

  return `
    <div class="comp-header-bar">
      <div class="comp-col-label comp-col-n1">
        <div class="comp-year-badge comp-year-n1">📅 Campagne N-1</div>
        ${n1Block}
      </div>
      <div class="comp-col-label comp-col-n">
        <div class="comp-year-badge comp-year-n">📅 Campagne ${escHtml(campN)} (en cours)</div>
        <div class="comp-loaded">✅ Fichier principal chargé</div>
      </div>
    </div>
    <div id="comp-table-area">
      ${!docN1 ? `<div style="text-align:center;padding:40px;color:#888;background:white;
        border-radius:16px;border:1px solid #deecda;margin-top:8px">
        <div style="font-size:1.8rem;margin-bottom:8px">⬆️</div>
        <div>Chargez le fichier XML N-1 pour afficher la comparaison</div>
      </div>` : ''}
    </div>
  `;
}

// ===================================================
// DÉLÉGATION D'ÉVÉNEMENTS
// ===================================================
function bindDelegatedEvents(root) {
  root.addEventListener('click', (e) => {
    if (e.target.closest('#comp-upload-btn')) {
      e.stopPropagation();
      openFilePicker(root);
      return;
    }
    if (e.target.closest('#comp-change-btn')) {
      openFilePicker(root);
      return;
    }
    const dz = e.target.closest('#comp-drop-zone');
    if (dz && !e.target.closest('#comp-upload-btn')) {
      openFilePicker(root);
      return;
    }
  });

  root.addEventListener('dragover', (e) => {
    const dz = e.target.closest('#comp-drop-zone');
    if (dz) { e.preventDefault(); dz.classList.add('drag-over'); }
  });

  root.addEventListener('dragleave', (e) => {
    const dz = e.target.closest('#comp-drop-zone');
    if (dz) dz.classList.remove('drag-over');
  });

  root.addEventListener('drop', (e) => {
    const dz = e.target.closest('#comp-drop-zone');
    if (!dz) return;
    e.preventDefault();
    dz.classList.remove('drag-over');
    const f = e.dataTransfer.files[0];
    if (f) loadN1(f, root);
  });

  root.addEventListener('change', (e) => {
    if (e.target.id === 'comp-file-input') {
      const f = e.target.files[0];
      if (f) loadN1(f, root);
    }
  });
}

function openFilePicker(root) {
  const fi = root.querySelector('#comp-file-input');
  if (fi) { fi.value = ''; fi.click(); }
}

// ===================================================
// CHARGEMENT DU FICHIER N-1
// ===================================================
function loadN1(file, root) {
  if (!file.name.toLowerCase().endsWith('.xml')) {
    alert('Veuillez sélectionner un fichier XML valide.');
    return;
  }
  const reader = new FileReader();
  reader.onload = (e) => {
    try {
      // Parse du XML pour les aides (extractAidesFromDoc)
      const parser = new DOMParser();
      const doc = parser.parseFromString(e.target.result, 'application/xml');
      if (doc.querySelector('parsererror')) throw new Error('Fichier XML invalide');
      docN1 = doc;

      // Extraction des rows N-1 via parseXML (même parseur que main.js)
      // pour obtenir les champs ilot_num, ilot_ref, area_ha, surface_admissible_ha
      try {
        const dataN1 = parseXML(e.target.result);
        ilotsN1 = Array.isArray(dataN1.rows) ? dataN1.rows : [];
      } catch (parseErr) {
        console.warn('Impossible d\'extraire les îlots N-1 :', parseErr);
        ilotsN1 = [];
      }

      const area = document.getElementById('comp-result-area');
      if (!area) return;
      area.innerHTML = buildLayout();
      // La délégation reste active sur area (pas besoin de re-binder)
      renderTable(area);
    } catch (err) {
      alert('Erreur lors du chargement du fichier N-1 : ' + err.message);
    }
  };
  reader.readAsText(file, 'ISO-8859-1');
}

// ===================================================
// TABLEAU DE COMPARAISON
// ===================================================
function renderTable(root) {
  const tableArea = root.querySelector('#comp-table-area');
  if (!tableArea || !docN || !docN1) return;

  const dN  = extractAidesFromDoc(docN);
  const dN1 = extractAidesFromDoc(docN1);

  let html = '';

  // ── Identité ──────────────────────────────────────
  html += section('📋 Identité du demandeur', [
    row('PACAGE',            dN1.pacage,          dN.pacage,          'text'),
    row('Campagne',          dN1.campagne,         dN.campagne,         'text'),
    row('Nom / Raison soc.', nomComplet(dN1),      nomComplet(dN),      'text'),
    row('SIRET',             dN1.siret,            dN.siret,            'text'),
    row('Email',             dN1.email,            dN.email,            'text'),
  ]);

  // ── Assureur ──────────────────────────────────────
  if (dN.assureur || dN1.assureur) {
    html += section('🏢 Assurance récolte', [
      row('Nom de l\'assureur', dN1.assureur || '—', dN.assureur || '—', 'text'),
    ]);
  }

  // ── Questions ISN ──────────────────────────────────
  const isnFields = [
    { key: 'interlocuteur-agree-ISN',                              label: 'Interlocuteur agréé ISN' },
    { key: 'autorisation-transmission-donnees-interlocuteur-ISN',  label: 'Autorisation transmission données interlocuteur ISN' },
    { key: 'renonciation-ISN',                                     label: 'Renonciation ISN' },
    { key: 'transmission-donnees-fins-commerciales',               label: 'Transmission données fins commerciales' },
    { key: 'autorisation-transmission-donnees',                    label: 'Autorisation transmission données' }
  ];
  const isnRows = [];
  for (const field of isnFields) {
    const valN1 = dN1[field.key];
    const valN  = dN[field.key];
    if (valN !== undefined || valN1 !== undefined) {
      isnRows.push(row(field.label, valN1, valN, 'bool'));
    }
  }
  if (isnRows.length > 0) html += section('👨‍🌾 ISN (Interlocuteur agréé ISN)', isnRows);

  // ── Pilier 1 ──────────────────────────────────────
  const p1Keys = [
    'aides-decouplees', 'aide-jeunes-agriculteurs', 'eco-regime',
    'legumineuse-fourragere', 'legumineuse-graine', 'ble-dur',
    'prunes-transformation', 'cerises-transformation', 'peches-transformation',
    'poires-transformation', 'tomates-industrie', 'pommes-terre-feculieres',
    'chanvre', 'houblon', 'semences-graminees', 'riz', 'maraichage'
  ];
  const p1Rows = p1Keys
    .filter(k => dN[k] !== undefined || dN1[k] !== undefined)
    .map(k => row(AIDES_LABELS[k] || k, dN1[k], dN[k], 'bool'));
  if (p1Rows.length)
    html += section('🟢 PILIER 1 – Aides découplées & couplées', p1Rows);

  // ── Écorégime détail ──────────────────────────────
  if (dN['eco-regime'] === 'true' || dN1['eco-regime'] === 'true') {
    html += section('🌱 Détail Écorégime', [
      row('Voie',          voieLabel(dN1['voie-ecoregime']), voieLabel(dN['voie-ecoregime']), 'text'),
      row('Certification', dN1['certification'] || '—',      dN['certification']  || '—',     'text'),
      row('Bonus Haie',    dN1['bonus-haie'] ?? 'false',     dN['bonus-haie']  ?? 'false',    'bool'),
    ]);
  }

  // ── Pilier 2 ──────────────────────────────────────
  const p2Keys = ['demande-ab', 'demande-maec', 'demande-ichn', 'assurance-recolte'];
  const p2Rows = p2Keys
    .filter(k => dN[k] !== undefined || dN1[k] !== undefined)
    .map(k => row(AIDES_LABELS[k] || k, dN1[k], dN[k], 'bool'));
  if (p2Rows.length)
    html += section('🚜 PILIER 2 – Développement rural', p2Rows);

  // ── Effectifs animaux ─────────────────────────────
  const animRows = ANIMAUX.map(([code, label]) =>
    row(`🐄 ${label}`,
      dN1.effectifsDeclares?.[code] ?? 0,
      dN.effectifsDeclares?.[code]  ?? 0,
      'number')
  );
  html += section('🐄 Effectifs animaux', animRows);

  // ── Surfaces globales du dossier ──────────────────
  const totN1sg = ilotsN1.reduce((s, r) => s + (r.area_ha               || 0), 0);
  const totN1sa = ilotsN1.reduce((s, r) => s + (r.surface_admissible_ha || 0), 0);
  const totNsg  = ilotsN.reduce( (s, r) => s + (r.area_ha               || 0), 0);
  const totNsa  = ilotsN.reduce( (s, r) => s + (r.surface_admissible_ha || 0), 0);

  html += section('🗺️ Surfaces globales du dossier', [
    row('Surface graphique totale (ha)',
      ilotsN1.length > 0 ? totN1sg : '—',
      ilotsN.length  > 0 ? totNsg  : '—',
      'surface'),
    row('Surface admissible globale (ha)',
      ilotsN1.length > 0 ? totN1sa : '—',
      ilotsN.length  > 0 ? totNsa  : '—',
      'surface'),
  ]);

  // ── Comparaison par îlot ──────────────────────────
  html += buildIlotsComparaison();

  tableArea.innerHTML = html;
}

// ===================================================
// COMPARAISON PAR ÎLOT
// ===================================================

/**
 * Agrège les parcelles par îlot (ilot_num + ilot_ref).
 * Retourne une Map clé → { ilotNum, ilotRef, surfaceGraphique, surfaceAdmissible }
 */
function aggregateIlots(rows) {
  const map = new Map();
  for (const r of rows) {
    const num = String(r.ilot_num ?? '?');
    const ref = String(r.ilot_ref ?? '—');
    const key = `${num}|${ref}`;
    if (!map.has(key)) {
      map.set(key, { ilotNum: num, ilotRef: ref, surfaceGraphique: 0, surfaceAdmissible: 0 });
    }
    const entry = map.get(key);
    entry.surfaceGraphique  += r.area_ha               || 0;
    entry.surfaceAdmissible += r.surface_admissible_ha || 0;
  }
  return map;
}

function buildIlotsComparaison() {
  const mapN  = aggregateIlots(ilotsN);
  const mapN1 = aggregateIlots(ilotsN1);

  if (mapN.size === 0 && mapN1.size === 0) return '';

  // Union des clés, triée par numéro d'îlot (numérique)
  const allKeys = [...new Set([...mapN1.keys(), ...mapN.keys()])].sort((a, b) => {
    const numA = parseInt(a.split('|')[0], 10) || 0;
    const numB = parseInt(b.split('|')[0], 10) || 0;
    return numA - numB;
  });

  let html = `<div class="comp-section"><div class="comp-section-title">🌾 Comparaison par îlot</div>`;

  for (const key of allKeys) {
    const iN  = mapN.get(key)  || {};
    const iN1 = mapN1.get(key) || {};
    const [numIlot, numRef] = key.split('|');

    const isNew     = !mapN1.has(key) && mapN.has(key);
    const isRemoved =  mapN1.has(key) && !mapN.has(key);
    const statusBadge = isNew
      ? `<span class="comp-ilot-badge comp-ilot-new">✚ Nouvel îlot</span>`
      : isRemoved
        ? `<span class="comp-ilot-badge comp-ilot-removed">✖ Îlot supprimé</span>`
        : '';

    // Si l'îlot est absent d'un côté, on passe '—' (pas 0)
    const sgN1 = mapN1.has(key) ? iN1.surfaceGraphique  : '—';
    const sgN  = mapN.has(key)  ? iN.surfaceGraphique   : '—';
    const saN1 = mapN1.has(key) ? iN1.surfaceAdmissible : '—';
    const saN  = mapN.has(key)  ? iN.surfaceAdmissible  : '—';

    html += `
      <div class="comp-ilot-block">
        <div class="comp-ilot-header">
          <span class="comp-ilot-title">Îlot n° ${escHtml(numIlot)}</span>
          <span class="comp-ilot-ref">Réf. ${escHtml(numRef)}</span>
          ${statusBadge}
        </div>
        <div class="comp-section-body">
          <div class="comp-row comp-row-head">
            <div class="comp-cell comp-label-col">Élément</div>
            <div class="comp-cell comp-n1-col">N-1</div>
            <div class="comp-cell comp-n-col">N (en cours)</div>
            <div class="comp-cell comp-diff-col">Évolution</div>
          </div>
          ${row('Surface graphique (ha)',  sgN1, sgN,  'surface')}
          ${row('Surface admissible (ha)', saN1, saN,  'surface')}
        </div>
      </div>`;
  }

  html += `</div>`;
  return html;
}

// ===================================================
// HELPERS
// ===================================================
function nomComplet(d) {
  return d.nom ? d.nom + (d.prenom ? ' ' + d.prenom : '') : '—';
}

function voieLabel(code) {
  return code ? (VOIE_LABELS[code] || code) : '—';
}

function section(title, rowsHtml) {
  return `
    <div class="comp-section">
      <div class="comp-section-title">${title}</div>
      <div class="comp-section-body">
        <div class="comp-row comp-row-head">
          <div class="comp-cell comp-label-col">Élément</div>
          <div class="comp-cell comp-n1-col">N-1</div>
          <div class="comp-cell comp-n-col">N (en cours)</div>
          <div class="comp-cell comp-diff-col">Évolution</div>
        </div>
        ${rowsHtml.join('')}
      </div>
    </div>`;
}

function row(label, valN1, valN, type) {
  const n1 = (valN1 !== undefined && valN1 !== null && valN1 !== '') ? String(valN1) : '—';
  const n  = (valN  !== undefined && valN  !== null && valN  !== '') ? String(valN)  : '—';
  const changed = n1 !== n;

  let diffHtml;
  if (!changed) {
    diffHtml = `<span class="comp-diff-same">= Inchangé</span>`;
  } else if (type === 'bool') {
    if (n1 === 'false' && n === 'true')      diffHtml = `<span class="comp-diff-up">▲ Activé</span>`;
    else if (n1 === 'true' && n === 'false') diffHtml = `<span class="comp-diff-down">▼ Désactivé</span>`;
    else                                     diffHtml = `<span class="comp-diff-changed">↔ Modifié</span>`;
  } else if (type === 'number' || type === 'surface') {
    const numN1 = parseFloat(String(n1).replace(',', '.'));
    const numN  = parseFloat(String(n).replace(',', '.'));
    if (!isNaN(numN1) && !isNaN(numN)) {
      const delta  = +(numN - numN1).toFixed(4);
      const sign   = delta > 0 ? '+' : '';
      const dStr   = type === 'surface' ? `${sign}${delta.toFixed(4)} ha` : `${sign}${delta}`;
      diffHtml = delta > 0
        ? `<span class="comp-diff-up">▲ ${dStr}</span>`
        : delta < 0
          ? `<span class="comp-diff-down">▼ ${dStr}</span>`
          : `<span class="comp-diff-same">= Inchangé</span>`;
    } else {
      diffHtml = `<span class="comp-diff-changed">↔ Modifié</span>`;
    }
  } else {
    diffHtml = `<span class="comp-diff-changed">↔ Modifié</span>`;
  }

  return `
    <div class="${changed ? 'comp-row comp-row-changed' : 'comp-row'}">
      <div class="comp-cell comp-label-col">${escHtml(String(label))}</div>
      <div class="comp-cell comp-n1-col">${renderVal(n1, type)}</div>
      <div class="comp-cell comp-n-col">${renderVal(n, type)}</div>
      <div class="comp-cell comp-diff-col">${diffHtml}</div>
    </div>`;
}

function renderVal(val, type) {
  if (val === '—') return `<span class="comp-empty">—</span>`;
  if (type === 'bool') {
    if (val === 'true')  return `<span class="comp-bool-true">✓ Oui</span>`;
    if (val === 'false') return `<span class="comp-bool-false">✗ Non</span>`;
  }
  if (type === 'surface') {
    const num = parseFloat(String(val).replace(',', '.'));
    return isNaN(num)
      ? `<span class="comp-val-text">${escHtml(val)}</span>`
      : `<span class="comp-val-text">${num.toFixed(4).replace('.', ',')} ha</span>`;
  }
  return `<span class="comp-val-text">${escHtml(val)}</span>`;
}

function emptyState(icon, msg) {
  return `<div style="text-align:center;padding:60px;color:#888;background:white;
    border-radius:16px;border:1px solid #deecda">
    <div style="font-size:2.5rem;margin-bottom:12px">${icon}</div>
    <div>${msg}</div>
  </div>`;
}
