// js/iae.js — Onglet IAE (Infrastructures Agro-Écologiques)
// Contient : bonus haie (V4 sur SAU et sur TA) + total IAE toutes SNA
import { escHtml } from './utils.js';
import { getSAUadmissible, getSAUta } from './ecoregime.js';
import { getAllRows } from './tables.js';
import { getSNAdata } from './sna.js';

// ── Barèmes IAE (m² d'équivalent surface par unité) ──────────────────────────
const IAE_BAREME = {
  V1: 30,   // arbre isolé → 30 m²/arbre
  V2: 10,   // arbres alignés → 10 m²/ml
  V4: 20,   // haie → 20 m²/ml
  A1: 1.5,  // mare → 1,5 m²/m² de surface
  V3: 1.5,  // bosquet → 1,5 m²/m² de surface
  A4: 10,   // fossé non maçonné → 10 m²/ml
  A7: 1,    // mur traditionnel → 1 m²/ml
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

  // ── 1. Calculs globaux ────────────────────────────────────────────────────
  const totalIAEm2 = snaRows.reduce((s, r) => s + (calcIAE(r) || 0), 0);

  // Haies (V4) sur SAU totale
  const totalMlV4 = snaRows.filter(s => s.typeSna === 'V4').reduce((sum, s) =>
    sum + (s.intersectionsSnaParcelles || []).reduce((ps, p) => ps + (p.longueurIae || 0), 0), 0);
  const iaeHaiesSAU_m2 = totalMlV4 * 20;

  // Haies (V4) sur TA uniquement
  const parcellesRows = getAllRows();
  const parcCatIndex  = new Map(parcellesRows.map(r => [normKey(r.ilot_num, r.num_parcelle), r.surface_cat || '']));
  let mlHaiesTA = 0;
  let iaeHaiesTA_m2 = 0;
  snaRows.filter(s => s.typeSna === 'V4').forEach(sna => {
    (sna.intersectionsSnaParcelles || []).forEach(p => {
      if ((parcCatIndex.get(normKey(p.numeroIlot, p.numeroParcelle)) || '') === 'TA') {
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

  // ── 2. Barre KPI globale ──────────────────────────────────────────────────
  const pctIAE     = sauHa > 0 ? (totalIAEm2 / (sauHa * 10000)) * 100 : null;
  const pctIAEOk   = pctIAE !== null && pctIAE >= 4;
  const pctIAEColor = pctIAEOk ? '#2e7d32' : '#b71c1c';

  const summaryDiv = document.getElementById('iae-summary');
  if (summaryDiv) {
    summaryDiv.innerHTML = `
      <div class="eco-kpi">
        <div class="val" style="color:${pctIAEColor}">
          ${Math.round(totalIAEm2).toLocaleString('fr')} m²
        </div>
        <div class="lbl">Surface IAE totale</div>
      </div>
      ${pctIAE !== null ? `
      <div class="eco-kpi" style="border-left:3px solid ${pctIAEColor}">
        <div class="val" style="color:${pctIAEColor}">${pctIAE.toFixed(2).replace('.', ',')} % ${pctIAEOk ? '✅' : '⚠️'}</div>
        <div class="lbl">% de la SAU admissible (seuil : 4 %)</div>
      </div>` : ''}
      ${totalMlV4 > 0 ? `<div class="eco-kpi"><div class="val">${Math.round(totalMlV4).toLocaleString('fr')} m</div><div class="lbl">🌿 Haies (V4)</div></div>` : ''}
      ${totalMlV2 > 0 ? `<div class="eco-kpi"><div class="val">${Math.round(totalMlV2).toLocaleString('fr')} m</div><div class="lbl">🌳 Arbres alignés (V2)</div></div>` : ''}
      ${nbV1 > 0 ? `<div class="eco-kpi"><div class="val">${nbV1}</div><div class="lbl">🌳 Arbres isolés (V1)</div></div>` : ''}
      ${surfA1_m2 > 0 ? `<div class="eco-kpi"><div class="val">${surfA1_m2.toFixed(0)} m²</div><div class="lbl">💧 Mares (A1)</div></div>` : ''}
      ${surfV3_m2 > 0 ? `<div class="eco-kpi"><div class="val">${surfV3_m2.toFixed(0)} m²</div><div class="lbl">🌲 Bosquets (V3)</div></div>` : ''}
      ${totalMlA4 > 0 ? `<div class="eco-kpi"><div class="val">${Math.round(totalMlA4).toLocaleString('fr')} m</div><div class="lbl">〰️ Fossés (A4)</div></div>` : ''}
      ${totalMlA7 > 0 ? `<div class="eco-kpi"><div class="val">${Math.round(totalMlA7).toLocaleString('fr')} m</div><div class="lbl">🪨 Murs (A7)</div></div>` : ''}
    `;
  }

  const container = document.getElementById('iae-container');
  if (!container) return;

  // ── 3. Section Bonus Haie ─────────────────────────────────────────────────
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

        ${totalMlV4 > 0 ? _haiesDetailTable(snaRows, parcCatIndex) : ''}
      </div>
    </div>`;

  // ── 4. Section Total IAE par type ─────────────────────────────────────────
  const iaeByType = [
    { code: 'V4', label: '🌿 Haies', iae: totalMlV4 * 20,   unite: `${Math.round(totalMlV4).toLocaleString('fr')} ml`,  bareme: '20 m²/ml' },
    { code: 'V2', label: '🌳 Arbres alignés', iae: totalMlV2 * 10, unite: `${Math.round(totalMlV2).toLocaleString('fr')} ml`, bareme: '10 m²/ml' },
    { code: 'V1', label: '🌳 Arbres isolés',  iae: nbV1 * 30,      unite: `${nbV1} arbre${nbV1 > 1 ? 's' : ''}`, bareme: '30 m²/arbre' },
    { code: 'A1', label: '💧 Mares',          iae: surfA1_m2 * 1.5, unite: `${surfA1_m2.toFixed(0)} m²`, bareme: '1,5 m²/m²' },
    { code: 'V3', label: '🌲 Bosquets',       iae: surfV3_m2 * 1.5, unite: `${surfV3_m2.toFixed(0)} m²`, bareme: '1,5 m²/m²' },
    { code: 'A4', label: '〰️ Fossés',         iae: totalMlA4 * 10,  unite: `${Math.round(totalMlA4).toLocaleString('fr')} ml`, bareme: '10 m²/ml' },
    { code: 'A7', label: '🪨 Murs traditionnels', iae: totalMlA7 * 1, unite: `${Math.round(totalMlA7).toLocaleString('fr')} ml`, bareme: '1 m²/ml' },
  ].filter(r => r.iae > 0);

  const totalIAESectionHtml = `
    <div class="eco-group" style="margin-bottom:20px">
      <div class="eco-header" onclick="window.toggleEcoGroup?.(this)">
        <span class="expand-icon">▼</span>
        <div class="eco-title">📐 Total IAE par type d'élément</div>
        <div class="eco-stats">
          <span>🔢 ${iaeByType.length} type${iaeByType.length > 1 ? 's' : ''} d'éléments</span>
          <span style="background:#e8e0ff;color:#5a1ea0">Σ ${Math.round(totalIAEm2).toLocaleString('fr')} m² IAE</span>
          ${pctIAE !== null ? `<span style="background:${pctIAEOk ? '#d4f0d4' : '#ffd0d0'};color:${pctIAEOk ? '#2a6b2f' : '#a00'}">${pctIAEOk ? '✅' : '⚠️'} ${pctIAE.toFixed(2).replace('.', ',')} % SAU</span>` : ''}
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
              <th style="text-align:right">% du total IAE</th>
              ${sauHa > 0 ? '<th style="text-align:right">% SAU adm.</th>' : ''}
            </tr>
          </thead>
          <tbody>
            ${iaeByType.map(r => {
              const pctTotal = totalIAEm2 > 0 ? (r.iae / totalIAEm2 * 100) : 0;
              const pctSAU   = sauHa > 0 ? (r.iae / (sauHa * 10000) * 100) : null;
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
                  ${pctSAU !== null ? `<td style="text-align:right;font-weight:600;color:${pctSAU >= 1 ? '#2e7d32' : '#888'}">${pctSAU.toFixed(2).replace('.', ',')} %</td>` : ''}
                </tr>`;
            }).join('')}
          </tbody>
          <tfoot>
            <tr style="background:#1a4a1c;color:white;font-weight:700">
              <td colspan="4" style="padding:9px 14px">TOTAL IAE</td>
              <td style="padding:9px 14px;text-align:right">${Math.round(totalIAEm2).toLocaleString('fr')} m²</td>
              <td style="padding:9px 14px;text-align:right">100,0 %</td>
              ${sauHa > 0 ? `<td style="padding:9px 14px;text-align:right">${pctIAE.toFixed(2).replace('.', ',')} %</td>` : ''}
            </tr>
          </tfoot>
        </table>
      </div>
    </div>`;

  // ── 5. Placeholder section Jachères / bordures / bandes tampons ───────────
  const jachereSectionHtml = `
    <div class="eco-group" style="margin-bottom:20px;opacity:0.65">
      <div class="eco-header" style="cursor:default">
        <span class="expand-icon" style="transform:rotate(-90deg)">▼</span>
        <div class="eco-title">🌼 IAE Jachères, Bordures de champ, Bandes tampons…</div>
        <div class="eco-stats">
          <span style="background:#fff3cd;color:#856404">🚧 À venir</span>
        </div>
      </div>
    </div>`;

  container.innerHTML = bonusHaieSectionHtml + totalIAESectionHtml + jachereSectionHtml;
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

function _haiesDetailTable(snaRows, parcCatIndex) {
  const haies = snaRows.filter(s => s.typeSna === 'V4');
  if (!haies.length) return '';

  const rows = haies.map(sna => {
    const parcelles = sna.intersectionsSnaParcelles || [];
    const totalMl   = parcelles.reduce((s, p) => s + (p.longueurIae || 0), 0);
    const iaeM2     = totalMl * 20;
    const ilotsStr  = sna.ilots ? sna.ilots.join(', ') : '—';

    const detailSpans = parcelles.map(p => {
      const cat = parcCatIndex.get(normKey(p.numeroIlot, p.numeroParcelle)) || '?';
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
