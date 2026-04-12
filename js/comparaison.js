// js/comparaison.js
// Onglet comparaison N-1 / N — identité, aides, écorégime, effectifs animaux
import { extractAidesFromDoc } from './aides.js';
import { escHtml } from './utils.js';

let docN   = null; // fichier de l'année en cours (transmis depuis main.js)
let docN1  = null; // fichier N-1 chargé dans cet onglet

const VOIE_LABELS = {
  "VC": "Certification (VC)",
  "VP": "Pratiques (VP)",
  "VE": "Environnementale (VE)",
  "VH": "Haies (VH)"
};

const ANIMAUX = [
  ["OV", "Ovins"], ["CA", "Caprins"], ["EQ", "Équins"],
  ["AL", "Alpaga"], ["LA", "Lama"], ["CE", "Cerf et Biche"],
  ["DA", "Daim et Daine"], ["TR", "Truies"], ["AP", "Autres porcins"],
  ["PP", "Poules pondeuses"], ["AV", "Autres volailles"]
];

const AIDES_COUPLEE_LABELS = {
  "aides-decouplees":       "Aides découplées",
  "aide-jeunes-agriculteurs": "👨‍🌾 Jeunes Agriculteurs (JA)",
  "eco-regime":             "Éco-régime",
  "legumineuse-fourragere": "🌿 Légumineuses fourragères",
  "legumineuse-graine":     "🫘 Légumineuses à graines",
  "ble-dur":                "🌾 Blé dur",
  "prunes-transformation":  "🍑 Prunes (transformation)",
  "cerises-transformation": "🍒 Cerises (transformation)",
  "peches-transformation":  "🍑 Pêches (transformation)",
  "poires-transformation":  "🍐 Poires (transformation)",
  "tomates-industrie":      "🍅 Tomates industrie",
  "pommes-terre-feculieres":"🥔 PDT féculières",
  "chanvre":                "🌿 Chanvre",
  "houblon":                "🍺 Houblon",
  "semences-graminees":     "🌱 Semences graminées",
  "riz":                    "🍚 Riz",
  "maraichage":             "🥕 Maraîchage",
  "demande-ab":             "Agriculture Biologique (AB)",
  "demande-maec":           "MAEC",
  "demande-ichn":           "ICHN",
  "assurance-recolte":      "Assurance récolte"
};

// ===================================================
// API PUBLIQUE
// ===================================================
export function setDocN(xmlDoc) {
  docN = xmlDoc;
}

export function renderComparaison() {
  const area = document.getElementById('comp-result-area');
  if (!area) return;

  if (!docN) {
    area.innerHTML = emptyState('📂', 'Chargez d\'abord un fichier XML principal.');
    return;
  }

  area.innerHTML = buildLayout();
  bindUploadZone();

  if (docN1) renderComparaisonTable();
}

// ===================================================
// CONSTRUCTION DU LAYOUT
// ===================================================
function buildLayout() {
  const dataN = extractAidesFromDoc(docN);
  const campN = dataN.campagne || 'N';

  return `
    <div class="comp-header-bar">
      <div class="comp-col-label comp-col-n1">
        <div class="comp-year-badge comp-year-n1">📅 Campagne N-1</div>
        ${docN1
          ? `<div class="comp-loaded">✅ Fichier chargé — Campagne ${extractAidesFromDoc(docN1).campagne || '?'}</div>
             <button class="comp-btn-change" id="comp-change-btn">🔄 Changer le fichier N-1</button>`
          : `<div class="comp-drop-zone" id="comp-drop-zone">
               <div style="font-size:2rem;margin-bottom:8px">📂</div>
               <p>Glisser-déposer le fichier XML N-1 ici</p>
               <small>ou</small><br>
               <button type="button" class="comp-btn-upload" id="comp-upload-btn">📁 Choisir le fichier N-1</button>
             </div>`
        }
        <input type="file" id="comp-file-input" accept=".xml" hidden>
      </div>
      <div class="comp-col-label comp-col-n">
        <div class="comp-year-badge comp-year-n">📅 Campagne ${escHtml(campN)} (en cours)</div>
        <div class="comp-loaded">✅ Fichier principal chargé</div>
      </div>
    </div>
    <div id="comp-table-area"></div>
  `;
}

// ===================================================
// TABLEAU DE COMPARAISON
// ===================================================
function renderComparaisonTable() {
  const area = document.getElementById('comp-table-area');
  if (!area || !docN || !docN1) return;

  const dN  = extractAidesFromDoc(docN);
  const dN1 = extractAidesFromDoc(docN1);

  let html = '';

  // ── Identité ───────────────────────────────────────
  html += section('📋 Identité du demandeur', [
    row('PACAGE',           dN1.pacage,   dN.pacage,   'text'),
    row('Campagne',         dN1.campagne, dN.campagne, 'text'),
    row('Nom / Raison soc.',nomComplet(dN1), nomComplet(dN), 'text'),
    row('SIRET',            dN1.siret,    dN.siret,    'text'),
    row('Email',            dN1.email,    dN.email,    'text'),
  ]);

  // ── Pilier 1 ───────────────────────────────────────
  const p1Keys = [
    'aides-decouplees', 'aide-jeunes-agriculteurs', 'eco-regime',
    'legumineuse-fourragere', 'legumineuse-graine', 'ble-dur',
    'prunes-transformation', 'cerises-transformation', 'peches-transformation',
    'poires-transformation', 'tomates-industrie', 'pommes-terre-feculieres',
    'chanvre', 'houblon', 'semences-graminees', 'riz', 'maraichage'
  ];
  const p1Rows = p1Keys
    .filter(k => dN[k] !== undefined || dN1[k] !== undefined)
    .map(k => row(AIDES_COUPLEE_LABELS[k] || k, dN1[k], dN[k], 'bool'));

  if (p1Rows.length)
    html += section('🟢 PILIER 1 – Aides découplées & couplées', p1Rows);

  // ── Écorégime détail ───────────────────────────────
  if (dN['eco-regime'] === 'true' || dN1['eco-regime'] === 'true') {
    html += section('🌱 Détail Écorégime', [
      row('Voie',
        dN1['voie-ecoregime'] ? (VOIE_LABELS[dN1['voie-ecoregime']] || dN1['voie-ecoregime']) : '—',
        dN['voie-ecoregime']  ? (VOIE_LABELS[dN['voie-ecoregime']]  || dN['voie-ecoregime'])  : '—',
        'text'),
      row('Certification',
        dN1['certification'] || '—',
        dN['certification']  || '—',
        'text'),
      row('Bonus Haie',
        dN1['bonus-haie'] ?? '—',
        dN['bonus-haie']  ?? '—',
        'bool'),
    ]);
  }

  // ── Pilier 2 ───────────────────────────────────────
  const p2Keys = ['demande-ab', 'demande-maec', 'demande-ichn', 'assurance-recolte'];
  const p2Rows = p2Keys
    .filter(k => dN[k] !== undefined || dN1[k] !== undefined)
    .map(k => row(AIDES_COUPLEE_LABELS[k] || k, dN1[k], dN[k], 'bool'));

  if (p2Rows.length)
    html += section('🚜 PILIER 2 – Développement rural', p2Rows);

  // ── Effectifs animaux ─────────────────────────────
  const animRows = ANIMAUX.map(([code, label]) => {
    const vN1 = dN1.effectifsDeclares?.[code] ?? 0;
    const vN  = dN.effectifsDeclares?.[code]  ?? 0;
    return row(`🐄 ${label}`, vN1, vN, 'number');
  });
  html += section('🐄 Effectifs animaux', animRows);

  area.innerHTML = html;
}

// ===================================================
// HELPERS DE RENDU
// ===================================================
function nomComplet(d) {
  return d.nom ? d.nom + (d.prenom ? ' ' + d.prenom : '') : '—';
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
  const n1 = valN1 ?? '—';
  const n  = valN  ?? '—';

  const changed = String(n1) !== String(n);

  let diffHtml = '';
  if (type === 'bool') {
    if (!changed) diffHtml = `<span class="comp-diff-same">= Inchangé</span>`;
    else if (n1 === 'false' && n === 'true')  diffHtml = `<span class="comp-diff-up">▲ Activé</span>`;
    else if (n1 === 'true'  && n === 'false') diffHtml = `<span class="comp-diff-down">▼ Désactivé</span>`;
    else diffHtml = `<span class="comp-diff-changed">↔ Modifié</span>`;
  } else if (type === 'number') {
    const delta = Number(n) - Number(n1);
    if (delta === 0)      diffHtml = `<span class="comp-diff-same">= Inchangé</span>`;
    else if (delta > 0)   diffHtml = `<span class="comp-diff-up">▲ +${delta}</span>`;
    else                  diffHtml = `<span class="comp-diff-down">▼ ${delta}</span>`;
  } else {
    diffHtml = changed
      ? `<span class="comp-diff-changed">↔ Modifié</span>`
      : `<span class="comp-diff-same">= Inchangé</span>`;
  }

  const rowClass = changed ? 'comp-row comp-row-changed' : 'comp-row';

  return `
    <div class="${rowClass}">
      <div class="comp-cell comp-label-col">${escHtml(String(label))}</div>
      <div class="comp-cell comp-n1-col">${renderVal(n1, type)}</div>
      <div class="comp-cell comp-n-col">${renderVal(n, type)}</div>
      <div class="comp-cell comp-diff-col">${diffHtml}</div>
    </div>`;
}

function renderVal(val, type) {
  if (val === undefined || val === null || val === '') return '<span class="comp-empty">—</span>';
  if (type === 'bool') {
    if (val === 'true')  return '<span class="comp-bool-true">✓ Oui</span>';
    if (val === 'false') return '<span class="comp-bool-false">✗ Non</span>';
    return `<span class="comp-val-text">${escHtml(String(val))}</span>`;
  }
  return `<span class="comp-val-text">${escHtml(String(val))}</span>`;
}

function emptyState(icon, msg) {
  return `<div style="text-align:center;padding:60px;color:#888;background:white;border-radius:16px;border:1px solid #deecda">
    <div style="font-size:2.5rem;margin-bottom:12px">${icon}</div>
    <div>${msg}</div>
  </div>`;
}

// ===================================================
// GESTION UPLOAD N-1
// ===================================================
function bindUploadZone() {
  const dropZone  = document.getElementById('comp-drop-zone');
  const uploadBtn = document.getElementById('comp-upload-btn');
  const changeBtn = document.getElementById('comp-change-btn');
  const fileInput = document.getElementById('comp-file-input');

  if (!fileInput) return;

  const openPicker = () => { fileInput.value = ''; fileInput.click(); };

  if (uploadBtn) uploadBtn.addEventListener('click', (e) => { e.stopPropagation(); openPicker(); });
  if (changeBtn) changeBtn.addEventListener('click', openPicker);

  if (dropZone) {
    dropZone.addEventListener('click', (e) => {
      if (uploadBtn?.contains(e.target)) return;
      openPicker();
    });
    dropZone.addEventListener('dragover', (e) => { e.preventDefault(); dropZone.classList.add('drag-over'); });
    dropZone.addEventListener('dragleave', () => dropZone.classList.remove('drag-over'));
    dropZone.addEventListener('drop', (e) => {
      e.preventDefault();
      dropZone.classList.remove('drag-over');
      const f = e.dataTransfer.files[0];
      if (f) loadN1File(f);
    });
  }

  fileInput.addEventListener('change', (e) => {
    const f = e.target.files[0];
    if (f) loadN1File(f);
  });
}

function loadN1File(file) {
  if (!file.name.toLowerCase().endsWith('.xml')) {
    alert('Veuillez sélectionner un fichier XML valide.');
    return;
  }
  const reader = new FileReader();
  reader.onload = (e) => {
    try {
      const parser = new DOMParser();
      const doc = parser.parseFromString(e.target.result, 'application/xml');
      if (doc.querySelector('parsererror')) throw new Error('Fichier XML invalide');
      docN1 = doc;
      renderComparaison(); // re-render complet avec le fichier N-1
    } catch (err) {
      alert('Erreur lors du chargement du fichier N-1 : ' + err.message);
    }
  };
  reader.readAsText(file, 'ISO-8859-1');
}

// Appelé par resetApp() dans main.js
export function resetComparaison() {
  docN  = null;
  docN1 = null;
}
