import { addC, addCoupledAide, AIDE_TO_CODE, AIDE_NOMS, lookup, getCultureColor, cultureColorCache } from './data.js';
import { parseXML } from './parser.js';
import { 
  setData, getFilteredRows, getAllRows, getSortState, setSortState,
  renderParcelles, renderSynthese, renderBalises, renderPP,
  filterParcelles, filterBalises, filterPP, sortTable
} from './tables.js';
import { setEcoData, renderEcoregime } from './ecoregime.js';
import { setMaecData, renderMaec } from './maec.js';
import { renderAides } from './aides.js';
import { initMap, invalidateMapSize } from './carto.js';
import { setIlotsData, renderIlots } from './ilots.js';
import { setSNAdata, renderSNA, filterSNA, sortSNA } from './sna.js';
import { sbadge, formatHa, escHtml, boolCell, textCell } from './utils.js';


// ===================================================
// CHARGEMENT DE LA BASE DE DONNÉES DES CULTURES
// ===================================================
// ... (toutes les addC du fichier original ici)
// Pour éviter la répétition, je mets un extrait représentatif
// Dans ton fichier final, mets TOUTES les addC de ton original

addC("Blé dur d'hiver", "BDH", [{ code: "001", label: "Récolte en grains" }, { code: "002", label: "Récolte plante entière" }], "TA", "Céréales d'hiver", "1.1");
addC("Blé dur de printemps", "BDP", [{ code: "001", label: "Récolte en grains" }, { code: "002", label: "Récolte plante entière" }], "TA", "Céréales de printemps", "1.1");
addC("Riz", "RIZ", [{ code: "001", label: "Riz grain" }, { code: "002", label: "Riz semences" }], "TA", "Autres cultures", "1.1");
addC("Houblon", "HBL", [], "CP", "CP gérée comme une TA - Autres cultures", "1.7");
addC("Tomate", "TOM", [{ code: "001", label: "Transformation" }, { code: "002", label: "Autre tomate" }], "TA", "Autres cultures", "1.8");
addC("Pomme de terre", "PTC", [{ code: "001", label: "Consommation" }, { code: "002", label: "Féculière" }], "TA", "Plantes sarclées", "1.7");
addC("Chanvre", "CHV", [{ code: "VAR", label: "Variété selon liste nationale" }], "TA", "Autres cultures", "1.7");
addC("Prune", "PRU", [{ code: "001", label: "Prune d'Ente transfo >5ans" }, { code: "002", label: "Prune d'Ente transfo ≤5ans" }], "CP", "CP", "1.9");
addC("Poire", "PWT", [{ code: "001", label: "Williams transfo >5ans" }, { code: "002", label: "Williams transfo ≤5ans" }], "CP", "CP", "1.9");
addC("Pêche", "PVT", [{ code: "001", label: "Pêche Pavie transfo >5ans" }, { code: "002", label: "Pêche Pavie transfo ≤5ans" }], "CP", "CP", "1.9");
addC("Cerise", "CBT", [{ code: "001", label: "Cerise bigarreau transfo >5ans" }, { code: "002", label: "Cerise bigarreau transfo ≤5ans" }], "CP", "CP", "1.9");

// Légumineuses fourragères
const fourragerCodes = ["FVL", "FVP", "LEC", "FNU", "LOT", "LDH", "LDP", "LUZ", "PHI", "PPR", "SAI", "TRE", "VES", "GES", "PAG", "MLF", "MLC", "MLG"];
fourragerCodes.forEach(code => {
  addC("Légumineuse fourragère", code, [{ code: "002", label: "Récolte plante entière" }], "TA", "Protéagineux et légumineuses fourragères", "1.3");
});

// Légumineuses à graines
const grainCodes = ["ARA", "FEV", "FVL", "FVP", "GES", "LDH", "LDP", "LEC", "LOT", "SOJ", "TRE", "VES", "PCH", "PHI", "PPR", "SAI", "MLF"];
grainCodes.forEach(code => {
  addC("Légumineuse à graines", code, [{ code: "001", label: "Récolte en grains" }], "TA", "Protéagineux et légumineuses fourragères", "1.3");
});

// Maraîchage
const maraichageCodes = ["AIL", "ART", "CAR", "CEL", "CHU", "CCN", "EPI", "FLA", "FLP", "FRA", "LBF", "MLO", "NVT", "OIG", "RDI", "PHF", "POR", "PVP", "POT", "MDI", "PFR"];
maraichageCodes.forEach(code => {
  addC("Maraîchage", code, [], "TA", "Autres cultures", "1.8");
});

// ===================================================
// CHARGEMENT DES AIDES COUPLÉES
// ===================================================
// RIZ
addCoupledAide("RIZ", "Riz", "001", "Aide à la production de riz", "non", "non", "non");

// BLÉ DUR
addCoupledAide("BDH", "Blé dur d'hiver", "001", "Aide à la production de blé dur", "non", "non", "non");
addCoupledAide("BDP", "Blé dur de printemps", "001", "Aide à la production de blé dur", "non", "non", "non");
addCoupledAide("BDH", "Blé dur d'hiver", "001", "Aide à la production de blé dur (semences certifiées)", "oui", "non", "non");
addCoupledAide("BDP", "Blé dur de printemps", "001", "Aide à la production de blé dur (semences certifiées)", "oui", "non", "non");

// HOUBLON
addCoupledAide("HBL", "Houblon", "", "Aide à la production de houblon", "non", "non", "non");

// TOMATES
addCoupledAide("TOM", "Tomate", "001", "Aide à la production de tomates destinées à la transformation", "non", "non", "non");

// SEMENCES GRAMINÉES
addCoupledAide("GRA", "Graminée pure", "", "Aide à la production de semences de graminées prairiales", "oui", "non", "non");

// POMMES DE TERRE FÉCULIÈRES
addCoupledAide("PTC", "Pomme de terre", "002", "Aide à la production de pommes de terre féculières", "non", "non", "non");

// PRUNES
addCoupledAide("PRU", "Prune", "001", "Aide à la production de prunes d'Ente (verger >5 ans)", "non", "non", "non");
addCoupledAide("PRU", "Prune", "002", "Aide à la production de prunes d'Ente (plantation ≤5 ans)", "non", "non", "non");

// POIRES
addCoupledAide("PWT", "Poire", "001", "Aide à la production de poires Williams (verger >5 ans)", "non", "non", "non");
addCoupledAide("PWT", "Poire", "002", "Aide à la production de poires Williams (plantation ≤5 ans)", "non", "non", "non");

// PÊCHES
addCoupledAide("PVT", "Pêche", "001", "Aide à la production de pêches Pavie (verger >5 ans)", "non", "non", "non");
addCoupledAide("PVT", "Pêche", "002", "Aide à la production de pêches Pavie (plantation ≤5 ans)", "non", "non", "non");

// CERISES
addCoupledAide("CBT", "Cerise", "001", "Aide à la production de cerises Bigarreau (verger >5 ans)", "non", "non", "non");
addCoupledAide("CBT", "Cerise", "002", "Aide à la production de cerises Bigarreau (plantation ≤5 ans)", "non", "non", "non");

// CHANVRE
addCoupledAide("CHV", "Chanvre", "", "Aide à la production de chanvre", "non", "non", "non");

// LÉGUMINEUSES FOURRAGÈRES
fourragerCodes.forEach(code => {
  addCoupledAide(code, "Légumineuse fourragère", "002", "Aide aux légumineuses fourragères", "non", "non", "non");
});

// LÉGUMINEUSES À GRAINES
grainCodes.forEach(code => {
  addCoupledAide(code, "Légumineuse à graines", "001", "Aide aux légumineuses à graines", "non", "non", "non");
  addCoupledAide(code, "Légumineuse à graines", "001", "Aide aux légumineuses à graines (semences certifiées)", "oui", "non", "non");
  addCoupledAide(code, "Légumineuse à graines", "001", "Aide aux légumineuses à graines (semences fermières)", "non", "oui", "non");
  addCoupledAide(code, "Légumineuse à graines", "002", "Aide aux légumineuses à graines (déshydratation)", "non", "non", "oui");
});

// MARAÎCHAGE
maraichageCodes.forEach(code => {
  addCoupledAide(code, "Maraîchage", "", "Aide au maraîchage", "non", "non", "non");
});

// ===================================================
// VARIABLES GLOBALES
// ===================================================
let allRows = [];
let filteredRows = [];
let sortCol = null;
let sortDir = 1;
let allMaecRows = [];
let lastXmlDoc = null;
let ilotsGeo = [];
let parcelsGeo = [];
let maecGeo = { surfaciques: [], lineaires: [], ponctuelles: [] };
let snaList = [];

// ===================================================
// RENDU GLOBAL
// ===================================================
function renderApp(data) {
  allRows = data.rows;
  filteredRows = [...allRows];
  allMaecRows = data.maecRows || [];
  ilotsGeo = data.ilotsGeo;
  parcelsGeo = data.parcelsGeo;
  maecGeo = data.maecGeo;
  lastXmlDoc = data.xmlDoc;
  snaList = data.snaList || []; 
  
  // Mettre à jour les données dans les modules
  setData(allRows);
  setEcoData(allRows);
  setMaecData(allMaecRows);
  setIlotsData(allRows);
  setSNAdata(snaList);  
  
  // Mettre à jour l'en-tête
  const pacageInfo = document.getElementById('pacage-info');
  if (pacageInfo) {
    pacageInfo.innerHTML = [
      data.meta.exploitation,
      `PACAGE : ${data.meta.pacage}`,
      `SIRET : ${data.meta.siret}`,
      `Campagne : ${data.meta.campagne}`
    ].filter(Boolean).join('  |  ');
  }
  
  // Remplir le filtre des codes
  const codes = [...new Set(allRows.map(r => r.code))].sort();
  const codeSelect = document.getElementById('filter-code');
  if (codeSelect) {
    codeSelect.innerHTML = '<option value="">Tous les codes</option>' + 
      codes.map(c => `<option value="${c}">${c} — ${lookup(c, '').nom}</option>`).join('');
  }
  
  // Rendre tous les onglets
  renderParcelles();
  renderSynthese();
  renderEcoregime();
  renderIlots();
  renderMaec();
  renderBalises();
  renderPP();
  renderAides(lastXmlDoc);
  renderSNA(); 
  initMap(ilotsGeo, parcelsGeo, maecGeo);
}

// ===================================================
// GESTION DU FICHIER
// ===================================================
// ===================================================
// GESTION DU FICHIER - VERSION CORRIGÉE
// ===================================================

// Variable pour éviter les doubles traitements
let isProcessing = false;

function handleFile(file) {
    // Éviter les traitements multiples
    if (isProcessing) {
        console.log("Déjà en cours de traitement, ignore");
        return;
    }
    
    if (!file || !file.name.toLowerCase().endsWith('.xml')) {
        alert('Veuillez sélectionner un fichier XML valide (export Telepac)');
        return;
    }
    
    console.log("Fichier sélectionné:", file.name);
    isProcessing = true;
    
    const loading = document.getElementById('loading');
    if (loading) {
        loading.classList.add('show');
        const loadingText = loading.querySelector('div:last-child');
        if (loadingText) loadingText.textContent = '📄 Lecture du fichier XML...';
    }
    
    const reader = new FileReader();
    
    reader.onload = (e) => {
        try {
            if (loading) {
                const loadingText = loading.querySelector('div:last-child');
                if (loadingText) loadingText.textContent = '🔍 Analyse des données...';
            }
            
            const data = parseXML(e.target.result);
            console.log("Parsing terminé, parcelles:", data.rows.length);
            
            if (!data.rows.length) {
                alert('Aucune parcelle trouvée dans ce fichier.');
                if (loading) loading.classList.remove('show');
                isProcessing = false;
                return;
            }
            
            // Passer à l'écran principal
            document.getElementById('upload-screen').style.display = 'none';
            document.getElementById('app-screen').style.display = 'block';
            
            renderApp(data);
            
        } catch (err) {
            console.error('Erreur:', err);
            alert('Erreur lors du parsing: ' + err.message);
        } finally {
            if (loading) loading.classList.remove('show');
            isProcessing = false;
        }
    };
    
    reader.onerror = () => {
        console.error('Erreur de lecture');
        alert('Erreur de lecture du fichier');
        if (loading) loading.classList.remove('show');
        isProcessing = false;
    };
    
    reader.readAsText(file, 'ISO-8859-1');
}

// Fonction pour réinitialiser l'input file
function resetFileInput() {
    const fileInput = document.getElementById('file-input');
    if (fileInput) {
        fileInput.value = '';  // Vide la valeur pour permettre de re-sélectionner le même fichier
    }
}

// ===================================================
// INITIALISATION - PARTIE INPUT FILE CORRIGÉE
// ===================================================
document.addEventListener('DOMContentLoaded', () => {
    console.log("DOM chargé, initialisation...");
    
    const dropZone = document.getElementById('drop-zone');
    const fileInput = document.getElementById('file-input');
    const uploadBtn = document.getElementById('upload-btn');
    const resetBtn = document.getElementById('reset-btn');
    
    // Bouton d'upload - Version simplifiée
    if (uploadBtn) {
        uploadBtn.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            console.log("Clic sur le bouton d'upload");
            resetFileInput();  // Réinitialiser avant d'ouvrir
            fileInput.click();
        });
    }
    
    // Zone de drop
    if (dropZone) {
        dropZone.addEventListener('click', (e) => {
            // Ne pas déclencher si on a cliqué sur le bouton
            if (e.target === uploadBtn || uploadBtn?.contains(e.target)) return;
            console.log("Clic sur la zone de drop");
            resetFileInput();
            fileInput.click();
        });
        
        dropZone.addEventListener('dragover', (e) => {
            e.preventDefault();
            dropZone.classList.add('drag-over');
        });
        
        dropZone.addEventListener('dragleave', () => {
            dropZone.classList.remove('drag-over');
        });
        
        dropZone.addEventListener('drop', (e) => {
            e.preventDefault();
            dropZone.classList.remove('drag-over');
            const file = e.dataTransfer.files[0];
            if (file) {
                resetFileInput();  // Réinitialiser avant traitement
                handleFile(file);
            }
        });
    }
    
    // Input file - Écouteur simplifié
    if (fileInput) {
        fileInput.addEventListener('change', (e) => {
            console.log("Changement détecté sur file input");
            const file = e.target.files[0];
            if (file) {
                // Petit délai pour éviter les doublons
                setTimeout(() => {
                    handleFile(file);
                }, 10);
            }
        });
    }
    
    // Bouton reset
    if (resetBtn) {
        resetBtn.addEventListener('click', () => {
            resetApp();
            resetFileInput();
        });
    }
    
    // Onglets
    document.querySelectorAll('.tab-btn').forEach(btn => {
        const tabId = btn.getAttribute('data-tab');
        if (tabId) {
            btn.addEventListener('click', () => switchTab(tabId));
        }
    });
    
    // Exposer les fonctions globales
    window.filterParcelles = filterParcelles;
    window.filterBalises = filterBalises;
    window.filterPP = filterPP;
    window.sortTable = sortTable;
    window.filterSNA = filterSNA;
    window.sortSNA = sortSNA;
    window.resetApp = resetApp;
    
    console.log("Initialisation terminée");
});



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
  if (tabId === 'carte') {
    setTimeout(() => invalidateMapSize(), 100);
  }
}


function resetApp() {
    console.log("Réinitialisation de l'application");
    
    // Réinitialiser le flag de traitement
    isProcessing = false;
    
    // Cacher l'application et montrer l'écran d'upload
    document.getElementById('app-screen').style.display = 'none';
    document.getElementById('upload-screen').style.display = 'flex';
    
    // Réinitialiser l'input file
    resetFileInput();
    
    // Réinitialiser les variables globales
    allRows = [];
    filteredRows = [];
    sortCol = null;
    sortDir = 1;
    allMaecRows = [];
    ilotsGeo = [];
    parcelsGeo = [];
    maecGeo = { surfaciques: [], lineaires: [], ponctuelles: [] };
    snaList = [];
    lastXmlDoc = null;
    
    // Nettoyer la carte si elle existe
    if (currentMap) {
        currentMap.remove();
        currentMap = null;
    }
}


// ===================================================
// EXPOSITION DES FONCTIONS GLOBALES
// ===================================================
window.filterParcelles = filterParcelles;
window.filterBalises = filterBalises;
window.filterPP = filterPP;
window.sortTable = sortTable;
window.switchTab = switchTab;
window.resetApp = resetApp;
window.toggleEcoGroup = window.toggleEcoGroup;
window.renderApp = renderApp;
window.filterSNA = filterSNA;
window.sortSNA = sortSNA;

// ===================================================
// INITIALISATION
// ===================================================
document.addEventListener('DOMContentLoaded', () => {
  const dropZone = document.getElementById('drop-zone');
  const fileInput = document.getElementById('file-input');
  const uploadBtn = document.getElementById('upload-btn');
  
  // Drag & drop
  dropZone.addEventListener('dragover', (e) => {
    e.preventDefault();
    dropZone.classList.add('drag-over');
  });
  
  dropZone.addEventListener('dragleave', () => {
    dropZone.classList.remove('drag-over');
  });
  
  dropZone.addEventListener('drop', (e) => {
    e.preventDefault();
    dropZone.classList.remove('drag-over');
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  });
  
  // Clic sur la zone
  dropZone.addEventListener('click', (e) => {
    if (e.target !== uploadBtn) fileInput.click();
  });
  
  uploadBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    fileInput.click();
  });
  
  fileInput.addEventListener('change', (e) => {
    if (e.target.files[0]) handleFile(e.target.files[0]);
  });
  
  // Bouton reset
  const resetBtn = document.getElementById('reset-btn');
  if (resetBtn) resetBtn.addEventListener('click', resetApp);
  
  // Onglets
  document.querySelectorAll('.tab-btn').forEach(btn => {
    if (btn.id === 'reset-btn') return;
    const tabId = btn.getAttribute('data-tab');
    if (tabId) {
      btn.addEventListener('click', () => switchTab(tabId));
    }
  });
});