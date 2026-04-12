import { sbadge, formatHa, escHtml } from './utils.js';

let allRows = [];

export function setEcoData(rows) {
  allRows = rows;
}

export function renderEcoregime() {
  const groups = new Map();
  for (const r of allRows) {
    const ecoCat = r.eco || "Non classé";
    if (!groups.has(ecoCat)) groups.set(ecoCat, []);
    groups.get(ecoCat).push(r);
  }
  
  const totalHa = allRows.reduce((s, r) => s + (r.area_ha || 0), 0);
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
  const surfTypeTotalTA = surfTypeTotals.TA;
  
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
    </div>`;
  
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
      const haAdm = parcelles.reduce((s, p) => s + (p.surface_admissible_ha || 0), 0);
      const nbCodes = new Set(parcelles.map(p => p.code)).size;
      const isPP = cat === 'PP';
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