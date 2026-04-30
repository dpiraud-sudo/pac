// js/main.js
import { lookup, resetColorCache } from './data.js';
import { parseXML } from './parser.js';
import {
  setData,
  renderParcelles, renderSynthese, renderBalises, renderPP,
  filterParcelles, filterBalises, filterPP, sortTable
} from './tables.js';
import { setEcoData, renderEcoregime } from './ecoregime.js';
import { setMaecData, renderMaec } from './maec.js';
import { renderAides } from './aides.js';
import { initMap, invalidateMapSize, resetMap } from './carto.js';
import { setIlotsData, renderIlots } from './ilots.js';
import { setSNAdata, renderSNA, filterSNA, sortSNA, initSNATableHeader } from './sna.js';
import { setDocN, renderComparaison, resetComparaison, setIlotsN } from './comparaison.js';
import { renderEligibilite } from './eligibilite.js';
import { setBCAE7Data, renderBCAE7 } from './bcae7.js';
import { setCabData, renderCab } from './cab.js';


// ===================================================
// VARIABLES GLOBALES
// ===================================================
let allRows    = [];
let allMaecRows = [];
let lastXmlDoc = null;
let ilotsGeo   = [];
let parcelsGeo  = [];
let maecGeo     = { surfaciques: [], lineaires: [], ponctuelles: [] };
let snaList     = [];
let isProcessing = false;

// ===================================================
// RENDU GLOBAL
// ===================================================
function renderApp(data) {
  allRows     = data.rows;
  allMaecRows = data.maecRows || [];
  ilotsGeo    = data.ilotsGeo;
  parcelsGeo  = data.parcelsGeo;
  maecGeo     = data.maecGeo;
  lastXmlDoc  = data.xmlDoc;
  snaList = data.snaGeo || [];
  console.log('SNA reçus dans main.js :', snaList);
  setSNAdata(snaList);

  setData(allRows);
  initSNATableHeader();
  setEcoData(allRows);
  setMaecData(allMaecRows);
  setCabData(data.cabRows || []);
  setIlotsData(allRows);
  setIlotsN(allRows);     
  setBCAE7Data(allRows);
  renderBCAE7();   // ← transmet les rows N à comparaison.js
  setSNAdata(snaList);
  setDocN(lastXmlDoc);

  const pacageInfo = document.getElementById('pacage-info');
  if (pacageInfo) {
    pacageInfo.innerHTML = [
      data.meta.exploitation,
      `PACAGE : ${data.meta.pacage}`,
      `SIRET : ${data.meta.siret}`,
      `Campagne : ${data.meta.campagne}`
    ].filter(Boolean).join('  |  ');
  }

  const codes = [...new Set(allRows.map(r => r.code))].sort();
  const codeSelect = document.getElementById('filter-code');
  if (codeSelect) {
    codeSelect.innerHTML = '<option value="">Tous les codes</option>' +
      codes.map(c => `<option value="${c}">${c} — ${lookup(c, '').nom}</option>`).join('');
  }

  renderParcelles();
  renderSynthese();
  renderEcoregime();
  renderIlots();
  renderMaec();
  renderCab();
  renderBalises();
  renderPP();
  renderAides(lastXmlDoc);
  renderComparaison();
  renderEligibilite(lastXmlDoc);
  renderSNA();
  initMap(ilotsGeo, parcelsGeo, maecGeo, snaList);
}

// ===================================================
// GESTION DU FICHIER
// ===================================================
function handleFile(file) {
  if (isProcessing) return;

  if (!file || !file.name.toLowerCase().endsWith('.xml')) {
    alert('Veuillez sélectionner un fichier XML valide (export Telepac)');
    return;
  }

  isProcessing = true;
  const loading = document.getElementById('loading');
  const setLoadingText = (txt) => {
    const el = loading?.querySelector('div:last-child');
    if (el) el.textContent = txt;
  };

  if (loading) { loading.classList.add('show'); setLoadingText('📄 Lecture du fichier XML…'); }

  const reader = new FileReader();

  reader.onload = (e) => {
    try {
      setLoadingText('🔍 Analyse des données…');
      const data = parseXML(e.target.result);

      if (!data.rows.length) {
        alert('Aucune parcelle trouvée dans ce fichier.');
        return;
      }

      document.getElementById('upload-screen').style.display = 'none';
      document.getElementById('app-screen').style.display = 'block';
      renderApp(data);
    } catch (err) {
      console.error('Erreur de parsing :', err);
      alert('Erreur lors du parsing : ' + err.message);
    } finally {
      if (loading) loading.classList.remove('show');
      isProcessing = false;
    }
  };

  reader.onerror = () => {
    alert('Erreur de lecture du fichier');
    if (loading) loading.classList.remove('show');
    isProcessing = false;
  };

  reader.readAsText(file, 'ISO-8859-1');
}

function resetFileInput() {
  const fi = document.getElementById('file-input');
  if (fi) fi.value = '';
}

// ===================================================
// RESET COMPLET
// ===================================================
function resetApp() {
  isProcessing = false;

  document.getElementById('app-screen').style.display = 'none';
  document.getElementById('upload-screen').style.display = 'flex';

  resetFileInput();

  allRows     = [];
  allMaecRows = [];
  ilotsGeo    = [];
  parcelsGeo  = [];
  maecGeo     = { surfaciques: [], lineaires: [], ponctuelles: [] };
  snaList     = [];
  lastXmlDoc  = null;

  resetColorCache();
  resetMap();
  resetComparaison();

  switchTab('aides');
}

// ===================================================
// GESTION DES ONGLETS
// ===================================================
function switchTab(tabId) {
  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.classList.toggle('active', btn.getAttribute('data-tab') === tabId);
  });
  document.querySelectorAll('.tab-content').forEach(content => {
    content.classList.toggle('active', content.id === `tab-${tabId}`);
  });
  if (tabId === 'carte') setTimeout(() => invalidateMapSize(), 100);
}

// ===================================================
// EXPOSITION GLOBALE
// ===================================================
window.filterParcelles = filterParcelles;
window.filterBalises   = filterBalises;
window.filterPP        = filterPP;
window.sortTable       = sortTable;
window.switchTab       = switchTab;
window.resetApp        = resetApp;
window.filterSNA       = filterSNA;
window.sortSNA         = sortSNA;
window.toggleEcoGroup  = window.toggleEcoGroup;

// ===================================================
// INITIALISATION — UN SEUL DOMContentLoaded
// ===================================================
document.addEventListener('DOMContentLoaded', () => {
  const dropZone  = document.getElementById('drop-zone');
  const fileInput = document.getElementById('file-input');
  const uploadBtn = document.getElementById('upload-btn');
  const resetBtn  = document.getElementById('reset-btn');

  if (uploadBtn) {
    uploadBtn.addEventListener('click', (e) => {
      e.preventDefault(); e.stopPropagation();
      resetFileInput(); fileInput.click();
    });
  }

  if (dropZone) {
    dropZone.addEventListener('click', (e) => {
      if (uploadBtn?.contains(e.target)) return;
      resetFileInput(); fileInput.click();
    });
    dropZone.addEventListener('dragover', (e) => { e.preventDefault(); dropZone.classList.add('drag-over'); });
    dropZone.addEventListener('dragleave', () => dropZone.classList.remove('drag-over'));
    dropZone.addEventListener('drop', (e) => {
      e.preventDefault(); dropZone.classList.remove('drag-over');
      const f = e.dataTransfer.files[0];
      if (f) { resetFileInput(); handleFile(f); }
    });
  }

  if (fileInput) {
    fileInput.addEventListener('change', (e) => {
      const f = e.target.files[0];
      if (f) setTimeout(() => handleFile(f), 10);
    });
  }

  if (resetBtn) resetBtn.addEventListener('click', () => { resetApp(); resetFileInput(); });

  document.querySelectorAll('.tab-btn').forEach(btn => {
    const tabId = btn.getAttribute('data-tab');
    if (tabId) btn.addEventListener('click', () => switchTab(tabId));
  });


}

});
