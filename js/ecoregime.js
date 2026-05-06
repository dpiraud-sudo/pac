import { sbadge, formatHa, escHtml } from './utils.js';

let allRows = [];
let sauAdmissibleHa = 0;
let sauTAha = 0;

export function getSAUadmissible() { return sauAdmissibleHa; }
export function getSAUta() { return sauTAha; }

export function setEcoData(rows) {
  allRows = rows;
}

// ===================================================
// CALCUL SCORE ÉCORÉGIME VOIE DES PRATIQUES
// ===================================================
function calcScoreEcoregime(allRows, surfTA, surfPP, sauTotale) {
  const details = [];
  let scoreTotal = 0;

  // Surfaces par catégorie eco (sur TA uniquement sauf PP)
  const surfByEco = {};
  for (const r of allRows) {
    const sa = r.surface_admissible_ha || 0;
    if (!sa) continue;
    const eco = r.eco || '';
    const cat = r.surface_cat || '';
    // On exclut les CP pures (sauf CP-en-TA) du calcul TA
    if (cat === 'PP') continue;
    surfByEco[eco] = (surfByEco[eco] || 0) + sa;
  }

  const pct = (surf) => surfTA > 0 ? (surf / surfTA * 100) : 0;
  const pctSAU = (surf) => sauTotale > 0 ? (surf / sauTotale * 100) : 0;

  // ── Bloc 1 : Prairie temporaire & jachères ──────────────────────────────
  const surfPT = surfByEco["Prairies temporaires et jachères"] || 0;
  const pctPT = pct(surfPT);
  let ptsPT = 0;
  if (pctPT >= 50)      ptsPT = 4;
  else if (pctPT >= 30) ptsPT = 3;
  else if (pctPT >= 5)  ptsPT = 2;
  details.push({
    label: '🌿 Prairie temporaire & jachères',
    surf: surfPT, pct: pctPT, base: surfTA, baseLabel: '% TA',
    seuils: [{ s: 5, p: 2 }, { s: 30, p: 3 }, { s: 50, p: 4 }],
    pts: ptsPT, max: 4
  });
  scoreTotal += ptsPT;

  // ── Bloc 2 : Légumineuses ────────────────────────────────────────────────
  const surfLeg = surfByEco["Protéagineux et légumineuses fourragères"] || 0;
  const pctLeg = pct(surfLeg);
  let ptsLeg = 0;
  if (pctLeg >= 10)                  ptsLeg = 3;
  else if (pctLeg >= 5 || surfLeg > 5) ptsLeg = 2;
  details.push({
    label: '🫘 Légumineuses à graines & fourragères',
    surf: surfLeg, pct: pctLeg, base: surfTA, baseLabel: '% TA',
    seuils: [{ s: 5, p: 2, note: 'ou > 5 ha' }, { s: 10, p: 3 }],
    pts: ptsLeg, max: 3
  });
  scoreTotal += ptsLeg;

  // ── Bloc 3 : Céréales / Sarclées / Oléagineux (cumulable, max 4 pts) ───
  const surfCH  = surfByEco["Céréales d'hiver"] || 0;
  const surfCP  = surfByEco["Céréales de printemps"] || 0;
  const surfSAR = surfByEco["Plantes sarclées"] || 0;
  const surfOH  = surfByEco["Oléagineux d'hiver"] || 0;
  const surfOP  = surfByEco["Oléagineux de printemps"] || 0;

  const ptsCH  = pct(surfCH)  >= 10 ? 1 : 0;
  const ptsCP  = pct(surfCP)  >= 10 ? 1 : 0;
  const ptsSAR = pct(surfSAR) >= 10 ? 1 : 0;
  const ptsOH  = pct(surfOH)  >= 7  ? 1 : 0;
  const ptsOP  = pct(surfOP)  >= 5  ? 1 : 0;

  const subBloc3 = [
    { label: "Céréales d'hiver",      surf: surfCH,  pct: pct(surfCH),  seuil: 10, pts: ptsCH },
    { label: "Céréales de printemps", surf: surfCP,  pct: pct(surfCP),  seuil: 10, pts: ptsCP },
    { label: "Plantes sarclées",      surf: surfSAR, pct: pct(surfSAR), seuil: 10, pts: ptsSAR },
    { label: "Oléagineux d'hiver",    surf: surfOH,  pct: pct(surfOH),  seuil: 7,  pts: ptsOH },
    { label: "Oléagineux de printemps", surf: surfOP, pct: pct(surfOP), seuil: 5,  pts: ptsOP },
  ];

  const ptsBloc3Brut = ptsCH + ptsCP + ptsSAR + ptsOH + ptsOP;
  const aucuneBloc3 = ptsBloc3Brut === 0;

  // Fallback : si aucune condition remplie, ensemble des 5 ≥ 10 % TA
  let ptsFallback = 0;
  if (aucuneBloc3) {
    const surfBloc3Total = surfCH + surfCP + surfSAR + surfOH + surfOP;
    ptsFallback = pct(surfBloc3Total) >= 10 ? 1 : 0;
  }

  const ptsBloc3 = aucuneBloc3 ? ptsFallback : Math.min(ptsBloc3Brut, 4);

  details.push({
    label: '🌾 Céréales, sarclées & oléagineux',
    subBloc: subBloc3,
    aucuneBloc3, ptsFallback,
    pts: ptsBloc3, max: 4,
    isCumul: true
  });
  scoreTotal += ptsBloc3;

  // ── Bloc 4 : Autres cultures ─────────────────────────────────────────────
  const surfAut = (surfByEco["Autres cultures"] || 0) + (surfByEco["CP gérée comme une TA - Autres cultures"] || 0);
  const pctAut = pct(surfAut);
  let ptsAut = 0;
  if (pctAut >= 75)      ptsAut = 5;
  else if (pctAut >= 50) ptsAut = 4;
  else if (pctAut >= 25) ptsAut = 3;
  else if (pctAut >= 10) ptsAut = 2;
  else if (pctAut >= 5)  ptsAut = 1;
  details.push({
    label: '🌱 Autres cultures & cultures à potentiel de diversification',
    surf: surfAut, pct: pctAut, base: surfTA, baseLabel: '% TA',
    seuils: [{ s: 5, p: 1 }, { s: 10, p: 2 }, { s: 25, p: 3 }, { s: 50, p: 4 }, { s: 75, p: 5 }],
    pts: ptsAut, max: 5
  });
  scoreTotal += ptsAut;

  // ── Bloc 5 : Prairie permanente ──────────────────────────────────────────
  const pctPP = pctSAU(surfPP);
  let ptsPP = 0;
  if (pctPP >= 75)      ptsPP = 3;
  else if (pctPP >= 40) ptsPP = 2;
  else if (pctPP >= 10) ptsPP = 1;
  details.push({
    label: '🐄 Prairie permanente',
    surf: surfPP, pct: pctPP, base: sauTotale, baseLabel: '% SAU',
    seuils: [{ s: 10, p: 1 }, { s: 40, p: 2 }, { s: 75, p: 3 }],
    pts: ptsPP, max: 3
  });
  scoreTotal += ptsPP;

  // ── Bloc 6 : Surface TA < 10 ha ──────────────────────────────────────────
  const ptsPetite = surfTA < 10 ? 2 : 0;
  details.push({
    label: '📐 Surface totale TA < 10 ha',
    surf: surfTA, pct: null, base: null, baseLabel: null,
    seuils: [{ note: '< 10 ha → 2 pts automatiques' }],
    pts: ptsPetite, max: 2
  });
  scoreTotal += ptsPetite;

  return { scoreTotal, details };
}

// ===================================================
// RENDU HTML DU SCORE
// ===================================================
function renderScoreHtml(scoreTotal, details, surfTA) {
  const scoreColor = scoreTotal >= 5 ? '#1a6020' : scoreTotal >= 4 ? '#7a5000' : '#8b1a1a';
  const scoreBg    = scoreTotal >= 5 ? '#d4f0d4' : scoreTotal >= 4 ? '#fff3cd' : '#ffd0d0';
  const scoreTxt   = scoreTotal >= 5 ? '✅ Éligible écorégime (niveau 2)' : scoreTotal >= 4 ? '🟡 Éligible écorégime (niveau 1)' : '❌ Non éligible écorégime';

  const rowsHtml = details.map(d => {
    const ptsColor = d.pts > 0 ? '#1a6020' : '#aaa';
    const ptsBg    = d.pts > 0 ? '#d4f0d4' : '#f5f5f5';

    let detailHtml = '';

    if (d.isCumul) {
      // Bloc 3 : affichage des sous-catégories
      detailHtml = d.subBloc.map(s => {
        const ok = s.pts > 0;
        return `<div style="font-size:0.75rem;color:${ok ? '#1a6020' : '#999'};padding:1px 0">
          ${ok ? '✓' : '·'} ${s.label} : ${s.pct.toFixed(1).replace('.', ',')} % TA
          ${ok ? `<span style="color:#1a6020;font-weight:700">(+1 pt)</span>` : `<span style="color:#bbb">(seuil ${s.seuil} %)</span>`}
        </div>`;
      }).join('');
      if (d.aucuneBloc3) {
        detailHtml += `<div style="font-size:0.75rem;color:${d.ptsFallback ? '#1a6020' : '#999'};padding:1px 0;font-style:italic">
          ${d.ptsFallback ? '✓' : '·'} Fallback ensemble des 5 ≥ 10 % TA ${d.ptsFallback ? '(+1 pt)' : '(non atteint)'}
        </div>`;
      }
      if (!d.aucuneBloc3 && d.pts === 4) {
        detailHtml += `<div style="font-size:0.72rem;color:#7a5000;font-style:italic">Plafonné à 4 pts</div>`;
      }
    } else if (d.pct !== null) {
      detailHtml = `<span style="font-size:0.78rem;color:#555">${d.surf.toFixed(2).replace('.', ',')} ha — ${d.pct.toFixed(1).replace('.', ',')} ${d.baseLabel}</span>`;
    } else {
      // Bloc 6 petit TA
      detailHtml = `<span style="font-size:0.78rem;color:#555">${d.surf.toFixed(2).replace('.', ',')} ha total TA</span>`;
    }

    return `
      <tr style="border-bottom:1px solid #eee">
        <td style="padding:9px 14px;font-weight:600;font-size:0.85rem">${d.label}</td>
        <td style="padding:9px 14px;font-size:0.82rem">${detailHtml}</td>
        <td style="padding:9px 14px;text-align:center">
          <span style="background:${ptsBg};color:${ptsColor};font-weight:800;font-size:1rem;padding:4px 14px;border-radius:20px">
            ${d.pts} / ${d.max}
          </span>
        </td>
      </tr>
    `;
  }).join('');

  return `
    <div style="background:white;border-radius:14px;border:2px solid ${scoreColor};margin-bottom:20px;overflow:hidden">
      <div style="background:${scoreBg};padding:12px 18px;border-bottom:2px solid ${scoreColor};display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:10px">
        <div style="font-weight:800;font-size:1rem;color:${scoreColor}">
          🏆 Score écorégime — Voie des pratiques
        </div>
        <div style="display:flex;align-items:center;gap:14px">
          <div style="font-size:2rem;font-weight:900;color:${scoreColor}">${scoreTotal} pts</div>
          <div style="background:${scoreColor};color:white;border-radius:10px;padding:6px 14px;font-size:0.85rem;font-weight:700">${scoreTxt}</div>
        </div>
      </div>
      <table style="width:100%;border-collapse:collapse;font-size:0.85rem">
        <thead>
          <tr style="background:#f4faf2">
            <th style="padding:8px 14px;text-align:left">Catégorie</th>
            <th style="padding:8px 14px;text-align:left">Détail</th>
            <th style="padding:8px 14px;text-align:center;min-width:90px">Points</th>
          </tr>
        </thead>
        <tbody>${rowsHtml}</tbody>
        <tfoot>
          <tr style="background:${scoreBg};font-weight:800">
            <td style="padding:10px 14px;color:${scoreColor}" colspan="2">TOTAL</td>
            <td style="padding:10px 14px;text-align:center">
              <span style="background:${scoreColor};color:white;font-size:1.1rem;font-weight:900;padding:5px 18px;border-radius:20px">${scoreTotal} pts</span>
            </td>
          </tr>
        </tfoot>
      </table>
      <div style="padding:10px 18px;font-size:0.75rem;color:#888;border-top:1px solid #eee">
        Seuil d'éligibilité : 4 pts (niveau 1) · 5 pts (niveau 2) · Barème PAC 2026
      </div>
    </div>`;
}

// ===================================================
// RENDU PRINCIPAL
// ===================================================
export function renderEcoregime() {
  const groups = new Map();
  for (const r of allRows) {
    const ecoCat = r.eco || "Non classé";
    if (!groups.has(ecoCat)) groups.set(ecoCat, []);
    groups.get(ecoCat).push(r);
  }
  
  const totalHa    = allRows.reduce((s, r) => s + (r.area_ha || 0), 0);
  const totalAdmHa = allRows.reduce((s, r) => s + (r.surface_admissible_ha || 0), 0);
  
  const summaryDiv = document.getElementById('eco-summary');
  if (summaryDiv) {
    summaryDiv.innerHTML = `
      <div class="eco-kpi"><div class="val">${allRows.length}</div><div class="lbl">Parcelles totales</div></div>
      <div class="eco-kpi"><div class="val">${totalHa.toFixed(2).replace('.', ',')} ha</div><div class="lbl">Surface calculée</div></div>
      <div class="eco-kpi"><div class="val">${totalAdmHa.toFixed(2).replace('.', ',')} ha</div><div class="lbl">Surface admissible totale</div></div>
      <div class="eco-kpi"><div class="val">${groups.size}</div><div class="lbl">Catégories écorégime</div></div>
    `;
  }
  
  // Calcul des surfaces par type
  const surfTypeTotals = { TA: 0, PP: 0, CP: 0 };
  for (const r of allRows) {
    const sa = r.surface_admissible_ha || 0;
    if (!sa) continue;
    const eco = r.eco || '';
    const cat = r.surface_cat || '';
    if (eco === 'CP gérée comme une TA - Autres cultures') surfTypeTotals.TA += sa;
    else if (cat === 'PP') surfTypeTotals.PP += sa;
    else if (cat === 'CP') surfTypeTotals.CP += sa;
    else if (cat === 'TA') surfTypeTotals.TA += sa;
  }
  
  const surfTypeTotal = surfTypeTotals.TA + surfTypeTotals.PP + surfTypeTotals.CP;
  sauAdmissibleHa = surfTypeTotal;
  sauTAha = surfTypeTotals.TA;
  const surfTypeTotalTA = surfTypeTotals.TA;

  // ── PP labourées ───────────────────────────────────────────────────────────
  const ppRows = allRows.filter(r => r.surface_cat === 'PP' && (r.surface_admissible_ha || 0) > 0);
  const ppSurfTotale  = ppRows.reduce((s, r) => s + (r.surface_admissible_ha || 0), 0);
  const ppLabourees   = ppRows.filter(r => r.retournement_pp === 'true' || r.retournement_pp === true);
  const ppSurfLabouree = ppLabourees.reduce((s, r) => s + (r.surface_admissible_ha || 0), 0);
  const pctPPLabouree = ppSurfTotale > 0 ? (ppSurfLabouree / ppSurfTotale * 100) : 0;

  const ppColor      = pctPPLabouree >= 20 ? '#8b1a1a' : pctPPLabouree >= 10 ? '#7a5000' : '#1a6020';
  const ppBg         = pctPPLabouree >= 20 ? '#fff0f0' : pctPPLabouree >= 10 ? '#fff8e1' : '#eef5ea';
  const ppBorder     = pctPPLabouree >= 20 ? '#f5c6c6' : pctPPLabouree >= 10 ? '#ffe08a' : '#deecda';
  const ppBadgeBg    = pctPPLabouree >= 20 ? '#ffd0d0' : pctPPLabouree >= 10 ? '#fff3cd' : '#d4f0d4';
  const ppBadgeColor = pctPPLabouree >= 20 ? '#8b1a1a' : pctPPLabouree >= 10 ? '#7a5000' : '#1a6020';
  const ppBadgeTxt   = pctPPLabouree >= 20
    ? '🔴 Taux critique (> 20 %) — écorégime non accessible'
    : pctPPLabouree >= 10
      ? '🟡 Taux élevé (> 10 %) — écorégime à risque'
      : '✅ Taux conforme — écorégime accessible';

  const ppHtml = ppSurfTotale > 0 ? `
    <div style="background:white;border-radius:14px;border:1px solid ${ppBorder};margin-bottom:20px;overflow:hidden">
      <div style="background:${ppBg};padding:11px 18px;border-bottom:1px solid ${ppBorder};font-weight:700;color:${ppColor}">
        🔄 Prairie permanente (PPH) — Retournements déclarés
      </div>
      <div style="padding:14px 20px;display:flex;align-items:center;gap:20px;flex-wrap:wrap">
        <div style="font-size:1.6rem;font-weight:800;color:${ppColor}">${pctPPLabouree.toFixed(1).replace('.', ',')} %</div>
        <div style="font-size:0.82rem;color:#555">
          de la surface PPH retournée
          (${ppSurfLabouree.toFixed(2).replace('.', ',')} ha / ${ppSurfTotale.toFixed(2).replace('.', ',')} ha
          · ${ppLabourees.length} parcelle${ppLabourees.length > 1 ? 's' : ''})
        </div>
        <div style="background:${ppBadgeBg};color:${ppBadgeColor};border-radius:8px;padding:6px 14px;font-size:0.8rem;font-weight:700">
          ${ppBadgeTxt}
        </div>
      </div>
    </div>` : '';

  // ── Score écorégime ────────────────────────────────────────────────────────
  const { scoreTotal, details } = calcScoreEcoregime(
    allRows, surfTypeTotals.TA, surfTypeTotals.PP, surfTypeTotal
  );
  const scoreHtml = renderScoreHtml(scoreTotal, details, surfTypeTotals.TA);

  // ── Tableau répartition par type ───────────────────────────────────────────
  const surfTypeRows = [
    { lbl: '🌱 Terre arable (TA)', key: 'TA', color: '#1a5080', bg: '#d0eaff', bar: '#4a90d9' },
    { lbl: '🐄 Prairie permanente (PP)', key: 'PP', color: '#2a6b2f', bg: '#d4f0d4', bar: '#5aad5c' },
    { lbl: '🌳 Culture permanente (CP)', key: 'CP', color: '#aa6f20', bg: '#fde9cf', bar: '#e87040' }
  ];
  
  const surfTypeHtml = `
    <div style="background:white;border-radius:14px;border:1px solid #deecda;margin-bottom:20px;overflow:hidden">
      <div style="background:#eef5ea;padding:11px 18px;border-bottom:1px solid #ddecd8;font-weight:700;color:#1f5422">
        📐 Répartition surface admissible par type de sol
        <span style="font-size:0.78rem;font-weight:400;color:#557055">(« CP gérée comme une TA » comptabilisée en Terre arable)</span>
      </div>
      <table style="width:100%;border-collapse:collapse;font-size:0.85rem">
        <thead>
          <tr style="background:#f4faf2">
            <th style="padding:8px 14px;text-align:left">Type de surface</th>
            <th style="padding:8px 14px;text-align:right">Surface adm. (ha)</th>
            <th style="padding:8px 14px;text-align:right">% SAU totale adm.</th>
            <th style="padding:8px 14px;min-width:140px">Répartition</th>
          </tr>
        </thead>
        <tbody>
          ${surfTypeRows.map(({ lbl, key, bg, color, bar }) => {
            const val = surfTypeTotals[key];
            const pct = surfTypeTotal > 0 ? (val / surfTypeTotal * 100) : 0;
            return `
              <tr>
                <td style="padding:9px 14px;font-weight:600"><span style="background:${bg};color:${color};padding:2px 10px;border-radius:12px;font-size:0.8rem">${lbl}</span></td>
                <td style="padding:9px 14px;text-align:right;font-weight:700;color:#1f5422">${val.toFixed(2).replace('.', ',')} ha</td>
                <td style="padding:9px 14px;text-align:right;font-weight:700;color:#1f5422">${pct.toFixed(2).replace('.', ',')} %</td>
                <td style="padding:9px 14px">
                  <div style="background:#e0ecd8;border-radius:20px;height:10px;overflow:hidden">
                    <div style="background:${bar};height:100%;border-radius:20px;width:${Math.min(pct, 100).toFixed(2)}%"></div>
                  </div>
                </td>
              </tr>
            `;
          }).join('')}
        </tbody>
        <tfoot>
          <tr style="background:#1a4a1c;color:white;font-weight:700">
            <td style="padding:9px 14px">TOTAL SAU admissible</td>
            <td style="padding:9px 14px;text-align:right">${surfTypeTotal.toFixed(2).replace('.', ',')} ha</td>
            <td style="padding:9px 14px;text-align:right">100,00 %</td>
            <td style="padding:9px 14px"></td>
          </tr>
        </tfoot>
      </table>
    </div>
    ${ppHtml}
    ${scoreHtml}`;
  
  const prevSurfTable = document.getElementById('eco-surf-type-table');
  if (prevSurfTable) prevSurfTable.remove();
  const container = document.getElementById('ecoregime-container');
  if (container) {
    container.insertAdjacentHTML('beforebegin', `<div id="eco-surf-type-table">${surfTypeHtml}</div>`);
  }
  
  const sortedGroups = Array.from(groups.entries()).sort((a, b) =>
    b[1].reduce((s, p) => s + (p.surface_admissible_ha || 0), 0) -
    a[1].reduce((s, p) => s + (p.surface_admissible_ha || 0), 0)
  );
  
  if (container) {
    container.innerHTML = sortedGroups.map(([cat, parcelles]) => {
      const haTotal = parcelles.reduce((s, p) => s + (p.area_ha || 0), 0);
      const haAdm   = parcelles.reduce((s, p) => s + (p.surface_admissible_ha || 0), 0);
      const nbCodes = new Set(parcelles.map(p => p.code)).size;
      const isPP    = cat === 'PP';
      const catDenom = isPP ? totalAdmHa : surfTypeTotalTA;
      const pct = catDenom > 0 ? (haAdm / catDenom * 100) : 0;
      
      return `
        <div class="eco-group collapsed">
          <div class="eco-header" onclick="window.toggleEcoGroup?.(this)">
            <span class="expand-icon">▼</span>
            <div class="eco-title">🌾 ${escHtml(cat)}</div>
            <div class="eco-stats">
              <span>📦 ${parcelles.length} parcelles</span>
              <span>🌍 ${haTotal.toFixed(2).replace('.', ',')} ha</span>
              <span>✅ ${haAdm.toFixed(2).replace('.', ',')} ha adm.</span>
              <span style="background:#eef5ea;color:#1f5422;font-weight:700">📊 ${pct.toFixed(1).replace('.', ',')} % ${isPP ? 'SAU totale adm.' : 'surf. TA + CP-en-TA'}</span>
              <span>🏷️ ${nbCodes} codes</span>
            </div>
          </div>
          <div class="eco-detail-wrap">
            <div style="background:#f7fcf7;padding:8px 16px;border-bottom:1px solid #ddecd8;display:flex;align-items:center;gap:10px;flex-wrap:wrap">
              <span style="font-size:0.8rem;color:#2d572d;font-weight:600">Part de la ${isPP ? 'SAU totale adm.' : 'surf. TA + CP-en-TA'} :</span>
              <span style="font-size:0.95rem;font-weight:700;color:#1f5422">${pct.toFixed(2).replace('.', ',')} %</span>
              <span style="font-size:0.78rem;color:#778">(${haAdm.toFixed(2).replace('.', ',')} ha / ${catDenom.toFixed(2).replace('.', ',')} ha)</span>
              <div style="flex:1;background:#e0ecd8;border-radius:20px;height:8px;max-width:200px;overflow:hidden">
                <div style="background:#2d6a2f;height:100%;border-radius:20px;width:${Math.min(pct, 100).toFixed(2)}%"></div>
              </div>
            </div>
            <table class="eco-detail-table">
              <thead>
                <tr><th>Îlot</th><th>N° parcelle</th><th>Commune</th><th>Code</th><th>Culture</th><th>Surf. agri.</th><th>Surface (ha)</th><th>Surf. adm. (ha)</th><th>% ${isPP ? 'SAU' : 'TA+CP'}</th><th>Section</th></tr>
              </thead>
              <tbody>
                ${parcelles.map(p => {
                  const pPct = catDenom > 0 && p.surface_admissible_ha ? (p.surface_admissible_ha / catDenom * 100) : 0;
                  return `
                    <tr>
                      <td><b>${escHtml(p.ilot_num)}</b></td>
                      <td>${escHtml(p.num_parcelle)}</td>
                      <td>${escHtml(p.commune)}</td>
                      <td><span class="code-badge">${escHtml(p.code)}</span></td>
                      <td>${escHtml(p.nom_culture)}</td>
                      <td>${sbadge(p.surface_cat)}</td>
                      <td style="text-align:right">${p.area_ha ? p.area_ha.toFixed(2).replace('.', ',') : '—'}</td>
                      <td style="text-align:right">${formatHa(p.surface_admissible_ha)}</td>
                      <td style="text-align:right;font-size:0.78rem;color:#2d6a2f;font-weight:600">${p.surface_admissible_ha ? pPct.toFixed(2).replace('.', ',') + ' %' : '—'}</td>
                      <td><span class="section-badge">${p.section}</span></td>
                    </tr>
                  `;
                }).join('')}
              </tbody>
            </table>
          </div>
        </div>
      `;
    }).join('');
  }
}

window.toggleEcoGroup = function(header) {
  const group = header.closest('.eco-group');
  if (group) group.classList.toggle('collapsed');
};
