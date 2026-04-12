// js/comparaison.js
import { extractAidesFromDoc } from './aides.js';
import { escHtml } from './utils.js';

let docN  = null;
let docN1 = null;

// Flag pour éviter de binder les événements deux fois
let delegationBound = false;

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

// ===================================================
// API PUBLIQUE
// ===================================================
export function setDocN(xmlDoc) {
  docN = xmlDoc;
}

export function resetComparaison() {
  docN  = null;
  docN1 = null;
  delegationBound = false;
}

export function renderComparaison() {
  const area = document.getElementById('comp-result-area');
  if (!area) return;

  if (!docN) {
    area.innerHTML = emptyState('📂', 'Chargez d\'abord un fichier XML principal.');
    return;
  }

  // Injecter le HTML de layout
  area.innerHTML = buildLayout();

  // Binder la délégation d'événements UNE SEULE FOIS sur la zone stable
  if (!delegationBound) {
    bindDelegatedEvents(area);
    delegationBound = true;
  }

  // Si N-1 déjà chargé (re-render après changement de fichier), afficher le tableau
  if (docN1) renderTable(area);
}

// ===================================================
// LAYOUT
// ===================================================
function buildLayout() {
  const dN   = extractAidesFromDoc(docN);
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
// DÉLÉGATION D'ÉVÉNEMENTS — bindée une seule fois
// sur l'élément stable #comp-result-area
// ===================================================
function bindDelegatedEvents(root) {
  // Clic sur le bouton "Choisir le fichier N-1"
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
    // Clic sur la drop-zone elle-même (pas sur le bouton)
    const dz = e.target.closest('#comp-drop-zone');
    if (dz && !e.target.closest('#comp-upload-btn')) {
      openFilePicker(root);
      return;
    }
  });

  // Drag & drop
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

  // Changement sur l'input file (délégué via root, car l'input est recréé à chaque render)
  root.addEventListener('change', (e) => {
    if (e.target.id === 'comp-file-input') {
      const f = e.target.files[0];
      if (f) loadN1(f, root);
    }
  });
}

function openFilePicker(root) {
  // L'input file est dans le DOM de root, toujours présent
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
      const parser = new DOMParser();
      const doc = parser.parseFromString(e.target.result, 'application/xml');
      if (doc.querySelector('parsererror')) throw new Error('Fichier XML invalide');
      docN1 = doc;
      // Re-injecter le layout (pour mettre à jour le bandeau N-1)
      // puis re-binder si besoin et afficher le tableau
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
      row('Voie',
        voieLabel(dN1['voie-ecoregime']),
        voieLabel(dN['voie-ecoregime']),
        'text'),
      row('Certification',
        dN1['certification'] || '—',
        dN['certification']  || '—',
        'text'),
      row('Bonus Haie',
        dN1['bonus-haie'] ?? 'false',
        dN['bonus-haie']  ?? 'false',
        'bool'),
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

  tableArea.innerHTML = html;
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
    if (n1 === 'false' && n === 'true')  diffHtml = `<span class="comp-diff-up">▲ Activé</span>`;
    else if (n1 === 'true' && n === 'false') diffHtml = `<span class="comp-diff-down">▼ Désactivé</span>`;
    else diffHtml = `<span class="comp-diff-changed">↔ Modifié</span>`;
  } else if (type === 'number') {
    const delta = Number(n) - Number(n1);
    diffHtml = delta > 0
      ? `<span class="comp-diff-up">▲ +${delta}</span>`
      : `<span class="comp-diff-down">▼ ${delta}</span>`;
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
  return `<span class="comp-val-text">${escHtml(val)}</span>`;
}

function emptyState(icon, msg) {
  return `<div style="text-align:center;padding:60px;color:#888;background:white;
    border-radius:16px;border:1px solid #deecda">
    <div style="font-size:2.5rem;margin-bottom:12px">${icon}</div>
    <div>${msg}</div>
  </div>`;
}
