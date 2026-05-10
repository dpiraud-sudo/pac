// js/iae.js — Onglet IAE (Infrastructures Agro-Écologiques)
// Contient : bonus haie (V4 sur SAU et sur TA) + total IAE toutes SNA
// Version complète avec bordures, jachères, bandes tampons
// Seuils éco-régime IAE : niveau 1 (7-10%), niveau 2 (>10%)
import { escHtml } from './utils.js';
import { getSAUadmissible, getSAUta } from './ecoregime.js';
import { getAllRows } from './tables.js';
import { getSNAdata } from './sna.js';

// ── Barèmes IAE (m² d'équivalent surface par unité) ──────────────────────────
const IAE_BAREME = {
  // SNA standards
  V1: 30,   // arbre isolé → 30 m²/arbre
  V2: 10,   // arbres alignés → 10 m²/ml
  V4: 20,   // haie → 20 m²/ml
  A1: 1.5,  // mare → 1,5 m²/m² de surface
  V3: 1.5,  // bosquet → 1,5 m²/m² de surface
  A4: 10,   // fossé non maçonné → 10 m²/ml
  A7: 1,    // mur traditionnel → 1 m²/ml
  
  // IAE sur parcelles culturales (avec declare-iae = true)
  BORDURE: 9,      // BOR, BTA, BFS → 9 m²/ml
  JACHERE_MIELLIFERE: 1.5,  // JAC 002 (mellifère) → 1,5 m²/m²
  JACHERE_STANDARD: 1,      // JAC 001, 003, 004, 005 → 1 m²/m²
};

// Codes de jachères avec leur barème spécifique
const JACHERE_BAREME = {
  "001": 1,   // Couvert herbacé
  "002": 1.5, // Jachère mellifère (liste nationale)
  "003": 1,   // Autre jachère fleurie/mellifère
  "004": 1,   // Jachère faunistique
  "005": 1,   // Repousses de cultures couvrantes
};

const normKey = (a, b) => `${parseInt(a, 10) || a}|${parseInt(b, 10) || b}`;

const TYPE_LABELS = {
  V1: 'Arbre isolé',
  V2: 'Arbres alignés',
  V3: 'Bosquet',
  V4: 'Haie',
  A1: 'Mare',
  A4: 'Fossé non maçonné',
  A7: 'Mur traditionnel en pierre',
  BOR: 'Bordure de champ',
  BTA: 'Bande tampon',
  BFS: 'Bordure le long forêts',
  JAC: 'Jachère',
};

function calcIAE(sna) {
  if (sna.typeSna === 'V1') return 30;
  if (['V2', 'V4', 'A4', 'A7'].includes(sna.typeSna)) {
    const totalMl = (sna.intersectionsSnaParcelles || []).reduce((s, p) => s + (p.longueurIae || 0), 0);
    if (totalMl === 0) return null;
    return totalMl * IAE_BAREME[sna.typeSna];
  }
  if (['A1', 'V3'].includes(sna.typeSna)) {
    if (!sna.surfaceGraphique) return null;
    return (sna.surfaceGraphique * 100) * IAE_BAREME[sna.typeSna];
  }
  return null;
}

// ── Rendu principal ───────────────────────────────────────────────────────────
export function renderIAE() {
  const snaRows = getSNAdata();
  const sauHa   = getSAUadmissible();
  const sauTAHa = getSAUta();
  const allParcelles = getAllRows();
  
  // Index des parcelles par clé pour accès rapide
  const parcelleMap = new Map();
  for (const p of allParcelles) {
    const key = normKey(p.ilot_num, p.num_parcelle);
    parcelleMap.set(key, p);
  }
  
  // ── 1. Calculs globaux SNA ────────────────────────────────────────────────────
  const totalSnaIAEm2 = snaRows.reduce((s, r) => s + (calcIAE(r) || 0), 0);
  
  // Haies (V4) sur SAU totale
  const totalMlV4 = snaRows.filter(s => s.typeSna === 'V4').reduce((sum, s) =>
    sum + (s.intersectionsSnaParcelles || []).reduce((ps, p) => ps + (p.longueurIae || 0), 0), 0);
  const iaeHaiesSAU_m2 = totalMlV4 * 20;
  
  // Haies (V4) sur TA uniquement
  let mlHaiesTA = 0;
  let iaeHaiesTA_m2 = 0;
  snaRows.filter(s => s.typeSna === 'V4').forEach(sna => {
    (sna.intersectionsSnaParcelles || []).forEach(p => {
      const parcelle = parcelleMap.get(normKey(p.numeroIlot, p.numeroParcelle));
      if (parcelle && parcelle.surface_cat === 'TA') {
        mlHaiesTA     += p.longueurIae || 0;
        iaeHaiesTA_m2 += (p.longueurIae || 0) * 20;
      }
    });
  });
  
  // Arbres alignés (V2)
  const totalMlV2 = snaRows.filter(s => s.typeSna === 'V2').reduce((sum, s) =>
    sum + (s.intersectionsSnaParcelles || []).reduce((ps, p) => ps + (p.longueurIae || 0), 0), 0);
  
  // Arbres isolés (V1)
  const nbV1 = snaRows.filter(s => s.typeSna === 'V1').length;
  
  // Mares (A1)
  const surfA1_m2 = snaRows.filter(s => s.typeSna === 'A1')
    .reduce((s, r) => s + (r.surfaceGraphique || 0) * 100, 0);
  
  // Bosquets (V3)
  const surfV3_m2 = snaRows.filter(s => s.typeSna === 'V3')
    .reduce((s, r) => s + (r.surfaceGraphique || 0) * 100, 0);
  
  // Fossés (A4)
  const totalMlA4 = snaRows.filter(s => s.typeSna === 'A4').reduce((sum, s) =>
    sum + (s.intersectionsSnaParcelles || []).reduce((ps, p) => ps + (p.longueurIae || 0), 0), 0);
  
  // Murs (A7)
  const totalMlA7 = snaRows.filter(s => s.typeSna === 'A7').reduce((sum, s) =>
    sum + (s.intersectionsSnaParcelles || []).reduce((ps, p) => ps + (p.longueurIae || 0), 0), 0);
  
  // ── 2. Calculs IAE sur parcelles culturales (BOR, BTA, BFS, JAC) ───────────────
  let totalCulturalIAEm2 = 0;
  let culturalIAEByType = new Map();
  
  // Initialiser les compteurs
  const culturalTypes = ['BOR', 'BTA', 'BFS', 'JAC'];
  for (const type of culturalTypes) {
    culturalIAEByType.set(type, { ml: 0, m2: 0, count: 0, details: [] });
  }
  
  // Parcourir toutes les parcelles pour trouver les IAE culturales
  for (const parcelle of allParcelles) {
    const code = parcelle.code;
    const declareIAE = parcelle.declare_iae === 'true';
    
    // Condition : declare-iae doit être true
    if (!declareIAE) continue;
    
    // Bordure de champ (BOR)
    if (code === 'BOR') {
      const longueur = parseFloat(parcelle.longueur_bordure) || 0;
      if (longueur > 0) {
        const iaeM2 = longueur * IAE_BAREME.BORDURE;
        const entry = culturalIAEByType.get('BOR');
        entry.ml += longueur;
        entry.m2 += iaeM2;
        entry.count++;
        entry.details.push({
          ilot: parcelle.ilot_num,
          parcelle: parcelle.num_parcelle,
          mesure: `${longueur.toFixed(0)} m`,
          iaeM2: iaeM2
        });
        totalCulturalIAEm2 += iaeM2;
      }
    }
    
    // Bande tampon (BTA)
    if (code === 'BTA') {
      const longueur = parseFloat(parcelle.longueur_bordure) || 0;
      if (longueur > 0) {
        const iaeM2 = longueur * IAE_BAREME.BORDURE;
        const entry = culturalIAEByType.get('BTA');
        entry.ml += longueur;
        entry.m2 += iaeM2;
        entry.count++;
        entry.details.push({
          ilot: parcelle.ilot_num,
          parcelle: parcelle.num_parcelle,
          mesure: `${longueur.toFixed(0)} m`,
          iaeM2: iaeM2
        });
        totalCulturalIAEm2 += iaeM2;
      }
    }
    
    // Bordure le long forêts (BFS)
    if (code === 'BFS') {
      const longueur = parseFloat(parcelle.longueur_bordure) || 0;
      if (longueur > 0) {
        const iaeM2 = longueur * IAE_BAREME.BORDURE;
        const entry = culturalIAEByType.get('BFS');
        entry.ml += longueur;
        entry.m2 += iaeM2;
        entry.count++;
        entry.details.push({
          ilot: parcelle.ilot_num,
          parcelle: parcelle.num_parcelle,
          mesure: `${longueur.toFixed(0)} m`,
          iaeM2: iaeM2
        });
        totalCulturalIAEm2 += iaeM2;
      }
    }
    
    // Jachère (JAC) - avec barème selon précision
    if (code === 'JAC') {
      const surfaceAdm = parcelle.surface_admissible_ha || 0;
      const precision = parcelle.precision || '001';
      const surfaceM2 = surfaceAdm * 10000;
      
      if (surfaceM2 > 0) {
        const coeff = JACHERE_BAREME[precision] || JACHERE_BAREME['001'];
        const iaeM2 = surfaceM2 * coeff;
        const entry = culturalIAEByType.get('JAC');
        entry.m2 += iaeM2;
        entry.count++;
        entry.details.push({
          ilot: parcelle.ilot_num,
          parcelle: parcelle.num_parcelle,
          precision: precision,
          surfaceHa: surfaceAdm,
          coeff: coeff,
          iaeM2: iaeM2
        });
        totalCulturalIAEm2 += iaeM2;
      }
    }
  }
  
  // ── 3. Total IAE global et seuils éco-régime ─────────────────────────────────
  const totalIAEm2 = totalSnaIAEm2 + totalCulturalIAEm2;
  const pctIAE     = sauHa > 0 ? (totalIAEm2 / (sauHa * 10000)) * 100 : null;
  
  // Seuils éco-régime IAE :
  // - Niveau 1 : 7% à 10% (inclus)
  // - Niveau 2 : > 10%
  let niveauIAE = null;
  let niveauColor = '#b71c1c';
  let niveauMessage = '⚠️ Seuil non atteint';
  let niveauIcon = '❌';
  
  if (pctIAE !== null) {
    if (pctIAE > 10) {
      niveauIAE = 2;
      niveauColor = '#1a5e1a';
      niveauMessage = '✅ Niveau 2 atteint (>10%)';
      niveauIcon = '🏆';
    } else if (pctIAE >= 7) {
      niveauIAE = 1;
      niveauColor = '#e6a017';
      niveauMessage = '⚠️ Niveau 1 atteint (7-10%) → visez >10% pour le niveau 2';
      niveauIcon = '📈';
    } else {
      niveauIAE = 0;
      niveauColor = '#b71c1c';
      niveauMessage = `❌ Seuil non atteint (${pctIAE.toFixed(2)}% < 7%)`;
      niveauIcon = '⚠️';
    }
  }
  
  // ── 4. Barre KPI globale ──────────────────────────────────────────────────
  const summaryDiv = document.getElementById('iae-summary');
  if (summaryDiv) {
    const culturalBlock = totalCulturalIAEm2 > 0 
      ? `<div class="eco-kpi"><div class="val">${Math.round(totalCulturalIAEm2).toLocaleString('fr')} m²</div><div class="lbl">IAE culturales (BOR/BTA/BFS/JAC)</div></div>`
      : '';
    
    summaryDiv.innerHTML = `
      <div class="eco-kpi">
        <div class="val" style="color:${niveauColor}">
          ${Math.round(totalIAEm2).toLocaleString('fr')} m²
        </div>
        <div class="lbl">Surface IAE totale</div>
      </div>
      ${pctIAE !== null ? `
      <div class="eco-kpi" style="border-left:3px solid ${niveauColor}">
        <div class="val" style="color:${niveauColor}">${pctIAE.toFixed(2).replace('.', ',')} %</div>
        <div class="lbl">${niveauIcon} ${niveauMessage}</div>
      </div>` : ''}
      <div class="eco-kpi"><div class="val">${Math.round(totalSnaIAEm2).toLocaleString('fr')} m²</div><div class="lbl">IAE SNA</div></div>
      ${culturalBlock}
      ${totalMlV4 > 0 ? `<div class="eco-kpi"><div class="val">${Math.round(totalMlV4).toLocaleString('fr')} m</div><div class="lbl">🌿 Haies (V4)</div></div>` : ''}
      ${totalMlV2 > 0 ? `<div class="eco-kpi"><div class="val">${Math.round(totalMlV2).toLocaleString('fr')} m</div><div class="lbl">🌳 Arbres alignés (V2)</div></div>` : ''}
      ${nbV1 > 0 ? `<div class="eco-kpi"><div class="val">${nbV1}</div><div class="lbl">🌳 Arbres isolés (V1)</div></div>` : ''}
    `;
  }
  
  const container = document.getElementById('iae-container');
  if (!container) return;
  
  // ── 5. Section Bonus Haie ─────────────────────────────────────────────────
  const pctHaiesSAU = sauHa > 0 && iaeHaiesSAU_m2 > 0 ? (iaeHaiesSAU_m2 / (sauHa * 10000)) * 100 : null;
  const pctHaiesTA  = sauTAHa > 0 && iaeHaiesTA_m2 > 0 ? (iaeHaiesTA_m2 / (sauTAHa * 10000)) * 100 : null;
  
  const bonusHaieSectionHtml = `
    <div class="eco-group" style="margin-bottom:20px">
      <div class="eco-header" onclick="window.toggleEcoGroup?.(this)">
        <span class="expand-icon">▼</span>
        <div class="eco-title">🌿 Bonus Haie</div>
        <div class="eco-stats">
          <span>📏 ${Math.round(totalMlV4).toLocaleString('fr')} ml de haies (V4)</span>
          ${pctHaiesSAU !== null ? `<span style="background:${pctHaiesSAU >= 6 ? '#d4f0d4' : '#ffd0d0'};color:${pctHaiesSAU >= 6 ? '#2a6b2f' : '#a00'}">${pctHaiesSAU >= 6 ? '✅' : '⚠️'} ${pctHaiesSAU.toFixed(2).replace('.', ',')} % SAU</span>` : ''}
          ${pctHaiesTA !== null ? `<span style="background:${pctHaiesTA >= 6 ? '#d4f0d4' : '#ffd0d0'};color:${pctHaiesTA >= 6 ? '#2a6b2f' : '#a00'}">${pctHaiesTA >= 6 ? '✅' : '⚠️'} ${pctHaiesTA.toFixed(2).replace('.', ',')} % TA</span>` : ''}
        </div>
      </div>
      <div class="eco-detail-wrap">
        <div style="padding:20px;display:flex;flex-wrap:wrap;gap:20px">
          ${pctHaiesSAU !== null ? _bonusCard(
            '🌿 IAE haies sur SAU totale',
            totalMlV4, iaeHaiesSAU_m2, pctHaiesSAU,
            sauHa * 10000,
            'Seuil bonus haie : 6 % de la SAU admissible',
            6
          ) : '<div style="color:#999;font-style:italic">SAU admissible non disponible (chargez un fichier N d\'abord)</div>'}
          ${pctHaiesTA !== null ? _bonusCard(
            '🌾 IAE haies sur Terres Arables',
            mlHaiesTA, iaeHaiesTA_m2, pctHaiesTA,
            sauTAHa * 10000,
            'Seuil bonus haie : 6 % de la SAU TA',
            6
          ) : ''}
        </div>
        ${totalMlV4 > 0 ? _haiesDetailTable(snaRows, parcelleMap) : ''}
      </div>
    </div>`;
  
  // ── 6. Section IAE culturales (BOR, BTA, BFS, JAC) ─────────────────────────
  let culturalIAESectionHtml = '';
  const culturalEntries = [];
  
  for (const [type, data] of culturalIAEByType.entries()) {
    if (data.m2 > 0) {
      culturalEntries.push({
        code: type,
        label: TYPE_LABELS[type] || type,
        ml: data.ml,
        m2: data.m2,
        count: data.count,
        details: data.details,
        bareme: type === 'JAC' ? '1 ou 1,5 m²/m² selon type' : `${IAE_BAREME.BORDURE} m²/ml`
      });
    }
  }
  
  if (culturalEntries.length > 0) {
    const totalCulturalM2 = culturalEntries.reduce((s, e) => s + e.m2, 0);
    const culturalRowsHtml = culturalEntries.map(entry => {
      const mesureDisplay = entry.ml > 0 ? `${Math.round(entry.ml).toLocaleString('fr')} m` : `${Math.round(entry.m2).toLocaleString('fr')} m²`;
      
      return `
        <div class="eco-group" style="margin-bottom:16px">
          <div class="eco-header" onclick="window.toggleEcoGroup?.(this)">
            <span class="expand-icon">▼</span>
            <div class="eco-title">${TYPE_LABELS[entry.code] || entry.code}</div>
            <div class="eco-stats">
              <span>📏 ${mesureDisplay}</span>
              <span>📐 ${Math.round(entry.m2).toLocaleString('fr')} m² IAE</span>
              <span>📋 ${entry.count} élément(s)</span>
            </div>
          </div>
          <div class="eco-detail-wrap">
            <table class="eco-detail-table">
              <thead>
                <tr>
                  <th>Îlot</th>
                  <th>Parcelle</th>
                  <th>Détail</th>
                  <th>Surface IAE (m²)</th>
                </tr>
              </thead>
              <tbody>
                ${entry.details.map(d => `
                  <tr>
                    <td style="text-align:center;font-weight:700">${escHtml(d.ilot)}</td>
                    <td style="text-align:center">${escHtml(d.parcelle)}</td>
                    <td>${d.mesure || (d.surfaceHa.toFixed(2).replace('.', ',') + ' ha × ' + d.coeff)}</td>
                    <td style="text-align:right;font-weight:700;color:#5a1ea0">${Math.round(d.iaeM2).toLocaleString('fr')} m²</td>
                  </tr>
                `).join('')}
              </tbody>
              <tfoot>
                <tr style="background:#eef5ea;font-weight:700">
                  <td colspan="3" style="padding:8px 10px;text-align:right">Total ${TYPE_LABELS[entry.code] || entry.code}</td>
                  <td style="padding:8px 10px;text-align:right">${Math.round(entry.m2).toLocaleString('fr')} m²</td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      `;
    }).join('');
    
    culturalIAESectionHtml = `
      <div class="eco-group" style="margin-bottom:20px">
        <div class="eco-header" onclick="window.toggleEcoGroup?.(this)">
          <span class="expand-icon">▼</span>
          <div class="eco-title">🌾 IAE sur parcelles culturales (déclaré-IAE = oui)</div>
          <div class="eco-stats">
            <span>🔢 ${culturalEntries.length} type(s)</span>
            <span>📐 ${Math.round(totalCulturalM2).toLocaleString('fr')} m² IAE</span>
          </div>
        </div>
        <div class="eco-detail-wrap">
          ${culturalRowsHtml}
        </div>
      </div>`;
  }
  
  // ── 7. Section Total IAE par type SNA ─────────────────────────────────────────
  const iaeByType = [
    { code: 'V4', label: '🌿 Haies', iae: totalMlV4 * 20,   unite: `${Math.round(totalMlV4).toLocaleString('fr')} ml`,  bareme: '20 m²/ml' },
    { code: 'V2', label: '🌳 Arbres alignés', iae: totalMlV2 * 10, unite: `${Math.round(totalMlV2).toLocaleString('fr')} ml`, bareme: '10 m²/ml' },
    { code: 'V1', label: '🌳 Arbres isolés',  iae: nbV1 * 30,      unite: `${nbV1} arbre${nbV1 > 1 ? 's' : ''}`, bareme: '30 m²/arbre' },
    { code: 'A1', label: '💧 Mares',          iae: surfA1_m2 * 1.5, unite: `${surfA1_m2.toFixed(0)} m²`, bareme: '1,5 m²/m²' },
    { code: 'V3', label: '🌲 Bosquets',       iae: surfV3_m2 * 1.5, unite: `${surfV3_m2.toFixed(0)} m²`, bareme: '1,5 m²/m²' },
    { code: 'A4', label: '〰️ Fossés',         iae: totalMlA4 * 10,  unite: `${Math.round(totalMlA4).toLocaleString('fr')} ml`, bareme: '10 m²/ml' },
    { code: 'A7', label: '🪨 Murs traditionnels', iae: totalMlA7 * 1, unite: `${Math.round(totalMlA7).toLocaleString('fr')} ml`, bareme: '1 m²/ml' },
  ].filter(r => r.iae > 0);
  
  const totalSnaSectionHtml = iaeByType.length > 0 ? `
    <div class="eco-group" style="margin-bottom:20px">
      <div class="eco-header" onclick="window.toggleEcoGroup?.(this)">
        <span class="expand-icon">▼</span>
        <div class="eco-title">📐 IAE par type d'élément SNA</div>
        <div class="eco-stats">
          <span>🔢 ${iaeByType.length} type(s)</span>
          <span style="background:#e8e0ff;color:#5a1ea0">Σ ${Math.round(totalSnaIAEm2).toLocaleString('fr')} m² IAE</span>
        </div>
      </div>
      <div class="eco-detail-wrap">
        <table class="eco-detail-table">
          <thead>
            <tr>
              <th>Type d'élément IAE</th>
              <th>Code</th>
              <th style="text-align:right">Quantité mesurée</th>
              <th style="text-align:right">Barème</th>
              <th style="text-align:right">Surface IAE équiv. (m²)</th>
              <th style="text-align:right">% du total IAE SNA</th>
            </tr>
          </thead>
          <tbody>
            ${iaeByType.map(r => {
              const pctTotal = totalSnaIAEm2 > 0 ? (r.iae / totalSnaIAEm2 * 100) : 0;
              return `
                <tr>
                  <td style="font-weight:600">${r.label}</td>
                  <td><span class="code-badge">${escHtml(r.code)}</span></td>
                  <td style="text-align:right;font-weight:600">${r.unite}</td>
                  <td style="text-align:right;color:#557055;font-size:0.8rem">${r.bareme}</td>
                  <td style="text-align:right;font-weight:700;color:#5a1ea0">${Math.round(r.iae).toLocaleString('fr')} m²</td>
                  <td style="text-align:right">
                    <span style="font-weight:700">${pctTotal.toFixed(1).replace('.', ',')} %</span>
                    <div style="background:#e0ecd8;border-radius:20px;height:6px;margin-top:4px;overflow:hidden">
                      <div style="background:#5a1ea0;height:100%;border-radius:20px;width:${Math.min(pctTotal, 100).toFixed(1)}%"></div>
                    </div>
                  </td>
                </tr>`;
            }).join('')}
          </tbody>
          <tfoot>
            <tr style="background:#1a4a1c;color:white;font-weight:700">
              <td colspan="4" style="padding:9px 14px">TOTAL IAE SNA</td>
              <td style="padding:9px 14px;text-align:right">${Math.round(totalSnaIAEm2).toLocaleString('fr')} m²</td>
              <td style="padding:9px 14px;text-align:right">100,0 %</td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>` : '';
  
  // ── 8. Section Jachères spécifiques (détail des barèmes) ────────────────────
  const jachereEntry = culturalIAEByType.get('JAC');
  let jachereDetailHtml = '';
  if (jachereEntry && jachereEntry.details.length > 0) {
    const byPrecision = {};
    for (const d of jachereEntry.details) {
      const prec = d.precision || '001';
      if (!byPrecision[prec]) byPrecision[prec] = { count: 0, surfaceHa: 0, iaeM2: 0 };
      byPrecision[prec].count++;
      byPrecision[prec].surfaceHa += d.surfaceHa;
      byPrecision[prec].iaeM2 += d.iaeM2;
    }
    
    const precisionLabels = {
      '001': 'Couvert herbacé (×1)',
      '002': 'Jachère mellifère (×1,5)',
      '003': 'Autre jachère fleurie (×1)',
      '004': 'Jachère faunistique (×1)',
      '005': 'Repousses couvrantes (×1)',
    };
    
    jachereDetailHtml = `
      <div style="margin-top:16px;padding:12px;background:#f8faf6;border-radius:12px">
        <div style="font-weight:700;margin-bottom:8px">📊 Détail par type de jachère :</div>
        <div style="display:flex;flex-wrap:wrap;gap:12px">
          ${Object.entries(byPrecision).map(([prec, data]) => `
            <div style="background:white;border-radius:12px;padding:8px 12px;border:1px solid #deecda">
              <div><strong>${precisionLabels[prec] || prec}</strong></div>
              <div>${data.count} parcelle(s) · ${data.surfaceHa.toFixed(2).replace('.', ',')} ha</div>
              <div>IAE : ${Math.round(data.iaeM2).toLocaleString('fr')} m²</div>
            </div>
          `).join('')}
        </div>
      </div>`;
  }
  
  // Assemblage final
  container.innerHTML = bonusHaieSectionHtml + culturalIAESectionHtml + totalSnaSectionHtml + jachereDetailHtml;
}

// ── Helpers privés ────────────────────────────────────────────────────────────

function _bonusCard(titre, ml, iaeM2, pct, sauRef_m2, note, seuil) {
  const ok    = pct >= seuil;
  const color = ok ? '#2e7d32' : '#b71c1c';
  const bg    = ok ? '#f0faf0' : '#fff5f5';
  const border = ok ? '#b8e0b8' : '#fecaca';
  return `
    <div style="background:${bg};border:2px solid ${border};border-radius:16px;padding:20px;min-width:260px;flex:1">
      <div style="font-weight:700;font-size:1rem;margin-bottom:12px">${titre}</div>
      <div style="font-size:1.8rem;font-weight:700;color:${color};margin-bottom:4px">
        ${pct.toFixed(2).replace('.', ',')} % ${ok ? '✅' : '⚠️'}
      </div>
      <div style="font-size:0.8rem;color:#666;margin-bottom:12px">${note}</div>
      <div style="display:flex;flex-direction:column;gap:6px;font-size:0.85rem">
        <div>📏 <strong>${Math.round(ml).toLocaleString('fr')} ml</strong> de haies</div>
        <div>📐 <strong>${Math.round(iaeM2).toLocaleString('fr')} m²</strong> IAE équivalents</div>
        <div>📊 Base de calcul : <strong>${(sauRef_m2 / 10000).toFixed(2).replace('.', ',')} ha</strong></div>
      </div>
      <div style="margin-top:12px;background:#e0ecd8;border-radius:20px;height:10px;overflow:hidden">
        <div style="background:${color};height:100%;border-radius:20px;width:${Math.min(pct / seuil * 100, 100).toFixed(1)}%;transition:width 0.3s"></div>
      </div>
      <div style="font-size:0.72rem;color:#888;margin-top:4px;text-align:right">${pct.toFixed(2).replace('.', ',')} % / ${seuil} %</div>
    </div>`;
}

function _haiesDetailTable(snaRows, parcelleMap) {
  const haies = snaRows.filter(s => s.typeSna === 'V4');
  if (!haies.length) return '';
  
  const rows = haies.map(sna => {
    const parcelles = sna.intersectionsSnaParcelles || [];
    const totalMl   = parcelles.reduce((s, p) => s + (p.longueurIae || 0), 0);
    const iaeM2     = totalMl * 20;
    const ilotsStr  = sna.ilots ? sna.ilots.join(', ') : '—';
    
    const detailSpans = parcelles.map(p => {
      const parcelle = parcelleMap.get(normKey(p.numeroIlot, p.numeroParcelle));
      const cat = parcelle ? parcelle.surface_cat : '?';
      const bgCat = cat === 'TA' ? '#d0eaff' : cat === 'PP' ? '#d4f0d4' : '#f0e8ff';
      const txCat = cat === 'TA' ? '#1a5080' : cat === 'PP' ? '#2a6b2f' : '#5a2d8a';
      return `<span style="display:inline-block;margin:1px 3px 1px 0;background:#e8f5e9;color:#2e7d32;border-radius:10px;padding:1px 7px;font-size:0.7rem">
        Î${escHtml(String(p.numeroIlot))}-P${escHtml(String(p.numeroParcelle))} : ${(p.longueurIae || 0).toFixed(0)} m
        <span style="background:${bgCat};color:${txCat};border-radius:8px;padding:0 5px;margin-left:2px">${cat}</span>
      </span>`;
    }).join('');
    
    return `
      <tr>
        <td style="font-weight:700">${escHtml(sna.numeroSna)}</td>
        <td>${ilotsStr}</td>
        <td style="text-align:right;font-weight:700">${Math.round(totalMl).toLocaleString('fr')} m</td>
        <td style="text-align:right;font-weight:700;color:#5a1ea0">${Math.round(iaeM2).toLocaleString('fr')} m²</td>
        <td style="font-size:0.75rem">${detailSpans}</td>
      </tr>`;
  }).join('');
  
  const totalMlAll = haies.reduce((s, h) => s + (h.intersectionsSnaParcelles || []).reduce((ps, p) => ps + (p.longueurIae || 0), 0), 0);
  
  return `
    <table class="eco-detail-table" style="margin-top:0">
      <thead>
        <tr>
          <th>N° SNA</th>
          <th>Îlots</th>
          <th style="text-align:right">Longueur IAE (ml)</th>
          <th style="text-align:right">Surface IAE (m²)</th>
          <th>Détail par parcelle (type sol)</th>
        </tr>
      </thead>
      <tbody>${rows}</tbody>
      <tfoot>
        <tr style="background:#eef5ea;font-weight:700">
          <td colspan="2" style="padding:8px 10px">Total haies (V4)</td>
          <td style="padding:8px 10px;text-align:right">${Math.round(totalMlAll).toLocaleString('fr')} m</td>
          <td style="padding:8px 10px;text-align:right">${Math.round(totalMlAll * 20).toLocaleString('fr')} m²</td>
          <td></td>
        </tr>
      </tfoot>
    </table>`;
}