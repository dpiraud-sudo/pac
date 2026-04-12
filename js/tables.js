import { sbadge, formatHa, boolCell, textCell, escHtml } from './utils.js';
import { lookup } from './data.js';

let allRows = [], filteredRows = [], sortCol = null, sortDir = 1;

export function setData(rows) {
  allRows = rows;
  filteredRows = [...rows];
}

export function getFilteredRows() { return filteredRows; }
export function getAllRows() { return allRows; }
export function getSortState() { return { sortCol, sortDir }; }
export function setSortState(col, dir) { sortCol = col; sortDir = dir; }

export function applySort() {
  filteredRows.sort((a, b) => {
    let av = a[sortCol] ?? '', bv = b[sortCol] ?? '';
    if (sortCol === 'surface_admissible_ha') {
      av = typeof av === 'number' ? av : 0;
      bv = typeof bv === 'number' ? bv : 0;
      return sortDir * (av - bv);
    }
    if (typeof av === 'number' && typeof bv === 'number') return sortDir * (av - bv);
    const an = parseFloat(av), bn = parseFloat(bv);
    if (!isNaN(an) && !isNaN(bn)) return sortDir * (an - bn);
    return sortDir * String(av).localeCompare(String(bv), 'fr');
  });
  renderParcelles();
}

export function filterParcelles() {
  const search = document.getElementById('search-parc')?.value.toLowerCase() || '';
  const fc = document.getElementById('filter-code')?.value || '';
  const fs = document.getElementById('filter-surf')?.value || '';
  
  filteredRows = allRows.filter(r => {
    if (fc && r.code !== fc) return false;
    if (fs && r.surface_cat !== fs) return false;
    if (search && ![r.ilot_num, r.num_parcelle, r.code, r.precision, r.nom_culture, r.precision_label, r.commune, r.eco, r.culture_sec].join(' ').toLowerCase().includes(search)) return false;
    return true;
  });
  
  if (sortCol) applySort();
  else renderParcelles();
}

export function renderParcelles() {
  const statsSpan = document.getElementById('stats-parc');
  if (statsSpan) statsSpan.textContent = `${filteredRows.length} parcelle${filteredRows.length > 1 ? 's' : ''}`;
  
  const tbody = document.getElementById('tbody-parcelles');
  if (!tbody) return;
  
  tbody.innerHTML = filteredRows.map(r => `<tr${r._unk ? ' class="unknown-row"' : ''}>
    <td><b>${escHtml(r.ilot_num)}</b></td>
    <td><b>${escHtml(r.num_parcelle)}</b></td>
    <td>${escHtml(r.commune)}</td>
    <td><span class="code-badge">${escHtml(r.code)}</span></td>
    <td>${r.precision ? `<span class="prec-badge">${escHtml(r.precision)}</span>` : '—'}</td>
    <td>${escHtml(r.nom_culture)}</td>
    <td>${escHtml(r.precision_label) || '—'}</td>
    <td>${sbadge(r.surface_cat)}</td>
    <td style="font-size:.8rem">${escHtml(r.eco)}</td>
    <td style="text-align:right;font-weight:600">${r.area_ha !== null ? r.area_ha.toFixed(4).replace('.', ',') : '—'}</td>
    <td style="text-align:right;font-weight:700;color:#1f5e2c">${formatHa(r.surface_admissible_ha)}</td>
    <td>${escHtml(r.culture_sec) || '—'}</td>
    <td style="display:none">${r.declare_iae === 'true' ? '<span class="bool-yes">✓</span>' : '<span class="bool-no">—</span>'}</td>
    <td style="display:none">${r.prod_semences === 'true' ? '<span class="bool-yes">✓</span>' : '<span class="bool-no">—</span>'}</td>
    <td style="text-align:right;display:none">${r.longueur_bordure || '—'}</td>
    <td style="display:none">${r.portee || '—'}</td>
    <td style="display:none"><span class="section-badge">${r.section}</span></td>
    <td style="display:none">${r.ilot_ref}</td>
  </tr>`).join('');
  
  if (filteredRows.length === 0) {
    tbody.innerHTML = '<tr><td colspan="17" style="text-align:center;color:#aaa;padding:24px">Aucune parcelle trouvée</td></tr>';
  }
}

export function renderSynthese() {
  const grps = {};
  for (const r of allRows) {
    const k = r.code + '/' + (r.precision || '');
    if (!grps[k]) {
      grps[k] = {
        code: r.code, precision: r.precision, nom_culture: r.nom_culture, precision_label: r.precision_label,
        surface_cat: r.surface_cat, eco: r.eco, section: r.section, count: 0, ha: 0, sa_ha: 0
      };
    }
    grps[k].count++;
    if (r.area_ha) grps[k].ha += r.area_ha;
    if (r.surface_admissible_ha) grps[k].sa_ha += r.surface_admissible_ha;
  }
  
  const list = Object.values(grps).sort((a, b) => b.ha - a.ha);
  const tHa = allRows.reduce((s, r) => s + (r.area_ha || 0), 0);
  const tSA = allRows.reduce((s, r) => s + (r.surface_admissible_ha || 0), 0);
  
  const summaryDiv = document.getElementById('synth-summary');
  if (summaryDiv) {
    summaryDiv.innerHTML = [
      [allRows.length, 'Parcelles totales'],
      [tHa.toFixed(2).replace('.', ','), 'Surface calculée (ha)'],
      [tSA.toFixed(2).replace('.', ','), 'Surface admissible (ha)'],
      [[...new Set(allRows.map(r => r.code))].length, 'Codes cultures'],
      [list.length, 'Groupes code×précision']
    ].map(([v, l]) => `<div class="synth-kpi"><div class="val">${v}</div><div class="lbl">${l}</div></div>`).join('');
  }
  
  const tbody = document.getElementById('tbody-synth');
  if (tbody) {
    tbody.innerHTML = list.map(g => `
      <tr>
        <td><span class="code-badge">${escHtml(g.code)}</span></td>
        <td><b>${escHtml(g.nom_culture)}</b></td>
        <td>${g.precision ? `<span class="prec-badge">${escHtml(g.precision)}</span>` : '—'}</td>
        <td>${escHtml(g.precision_label) || '—'}</td>
        <td>${sbadge(g.surface_cat)}</td>
        <td style="font-size:.82rem">${escHtml(g.eco)}</td>
        <td><span class="section-badge">${g.section}</span></td>
        <td style="text-align:center;font-weight:600">${g.count}</td>
        <td style="text-align:right;font-weight:700">${g.ha.toFixed(2).replace('.', ',')}</td>
        <td style="text-align:right;font-weight:700;color:#1f5e2c">${formatHa(g.sa_ha)}</td>
      </tr>
    `).join('');
  }
  
  // Camembert
  renderPieChart(list);
}

function renderPieChart(list) {
  const pieData = {};
  for (const g of list) {
    if (!g.sa_ha || g.sa_ha <= 0) continue;
    const lbl = g.nom_culture || g.code;
    pieData[lbl] = (pieData[lbl] || 0) + g.sa_ha;
  }
  
  let pieEntries = Object.entries(pieData).sort((a, b) => b[1] - a[1]);
  const MAX_SLICES = 10;
  let chartSlices = pieEntries.slice(0, MAX_SLICES);
  if (pieEntries.length > MAX_SLICES) {
    chartSlices.push(['Autres', pieEntries.slice(MAX_SLICES).reduce((s, [, v]) => s + v, 0)]);
  }
  const chartTotal = chartSlices.reduce((s, [, v]) => s + v, 0);
  const palette = ['#2d6a2f', '#5aad5c', '#8fd18f', '#c3e8c3', '#4a90d9', '#7bb8f0', '#f0c060', '#e87040', '#a060c0', '#c0a0e0', '#999'];
  
  let angle = -Math.PI / 2;
  let sliceSvg = '';
  const legendItems = [];
  const W = 320, H = 320, CX = 160, CY = 155, R = 120;
  
  chartSlices.forEach(([lbl, val], i) => {
    const frac = val / chartTotal;
    const a1 = angle, a2 = angle + frac * 2 * Math.PI;
    const x1 = CX + R * Math.cos(a1), y1 = CY + R * Math.sin(a1);
    const x2 = CX + R * Math.cos(a2), y2 = CY + R * Math.sin(a2);
    const laf = frac > 0.5 ? 1 : 0;
    const color = palette[i % palette.length];
    
    let labelSvg = '';
    if (frac >= 0.06) {
      const am = (a1 + a2) / 2;
      const lx = CX + (R * 0.62) * Math.cos(am), ly = CY + (R * 0.62) * Math.sin(am);
      labelSvg = `<text x="${lx.toFixed(1)}" y="${ly.toFixed(1)}" text-anchor="middle" dominant-baseline="middle" font-size="11" fill="white" font-weight="700">${(frac * 100).toFixed(1).replace('.', ',')}%</text>`;
    }
    
    sliceSvg += `<path d="M${CX},${CY} L${x1.toFixed(2)},${y1.toFixed(2)} A${R},${R} 0 ${laf},1 ${x2.toFixed(2)},${y2.toFixed(2)} Z" fill="${color}" stroke="white" stroke-width="1.5" style="cursor:pointer">
      <title>${lbl} : ${val.toFixed(2).replace('.', ',')} ha (${(frac * 100).toFixed(1).replace('.', ',')}%)</title>
    </path>${labelSvg}`;
    legendItems.push({ lbl, val, frac, color });
    angle = a2;
  });
  
  const legendHtml = legendItems.map(({ lbl, val, frac, color }) => `
    <div style="display:flex;align-items:center;gap:7px;font-size:0.78rem;margin-bottom:4px">
      <span style="width:13px;height:13px;border-radius:3px;background:${color};flex-shrink:0"></span>
      <span style="flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap" title="${lbl}">${lbl}</span>
      <span style="font-weight:700;color:#1f5e2c;white-space:nowrap">${val.toFixed(2).replace('.', ',')} ha</span>
      <span style="color:#888">(${(frac * 100).toFixed(1).replace('.', ',')}%)</span>
    </div>
  `).join('');
  
  const chartsDiv = document.getElementById('synth-charts');
  if (chartsDiv) {
    chartsDiv.innerHTML = `
      <div style="background:white;border-radius:16px;border:1px solid #deecda;padding:16px 20px;flex:0 0 auto">
        <div style="font-weight:700;color:#1f5422;margin-bottom:10px">🥧 Répartition par culture (surf. adm.)</div>
        <svg viewBox="0 0 ${W} ${H}" width="${W}" height="${H}">
          ${sliceSvg}
          <text x="${CX}" y="${CY - 8}" text-anchor="middle" font-size="13" fill="#1f5422" font-weight="700">${chartTotal.toFixed(2).replace('.', ',')} ha</text>
          <text x="${CX}" y="${CY + 10}" text-anchor="middle" font-size="10" fill="#778">surface adm. totale</text>
        </svg>
      </div>
      <div style="background:white;border-radius:16px;border:1px solid #deecda;padding:16px 20px;flex:1;min-width:220px;max-height:330px;overflow-y:auto">
        <div style="font-weight:700;color:#1f5422;margin-bottom:10px">📋 Légende</div>
        ${legendHtml}
      </div>
    `;
  }
}

export function renderBalises() {
  const rows = allRows;
  const statsSpan = document.getElementById('stats-balises');
  if (statsSpan) statsSpan.textContent = `${rows.length} parcelle${rows.length > 1 ? 's' : ''}`;
  
  const tbody = document.getElementById('tbody-balises');
  if (!tbody) return;
  
  tbody.innerHTML = rows.map(r => `
    <tr>
      <td><b>${escHtml(r.ilot_num)}</b></td>
      <td><b>${escHtml(r.num_parcelle)}</b></td>
      <td><span class="code-badge">${escHtml(r.code)}</span></td>
      <td>${r.precision ? `<span class="prec-badge">${escHtml(r.precision)}</span>` : '—'}</td>
      <td>${escHtml(r.nom_culture)}</td>
      <td style="text-align:center">${boolCell(r.prod_semences)}</td>
      <td style="text-align:center">${boolCell(r.prod_fermiers)}</td>
      <td style="text-align:center">${boolCell(r.deshydratation)}</td>
      <td style="text-align:center">${boolCell(r.derogation_ukraine)}</td>
      <td style="text-align:center;font-family:monospace;font-size:.85rem">${r.culture_sec || '<span class="bool-no">—</span>'}</td>
      <td style="text-align:center">${boolCell(r.accident_culture)}</td>
      <td style="text-align:center">${boolCell(r.declare_iae)}</td>
      <td style="text-align:center">${boolCell(r.prise_connaissance_phyto)}</td>
    </tr>
  `).join('');
  
  if (rows.length === 0) {
    tbody.innerHTML = '<tr><td colspan="13" style="text-align:center;color:#aaa;padding:24px">Aucune parcelle trouvée</td></tr>';
  }
}

export function filterBalises() {
  const search = document.getElementById('search-balises')?.value.toLowerCase() || '';
  const rows = search ? allRows.filter(r => [r.ilot_num, r.num_parcelle, r.code, r.precision, r.nom_culture].join(' ').toLowerCase().includes(search)) : allRows;
  
  const statsSpan = document.getElementById('stats-balises');
  if (statsSpan) statsSpan.textContent = `${rows.length} parcelle${rows.length > 1 ? 's' : ''}`;
  
  const tbody = document.getElementById('tbody-balises');
  if (!tbody) return;
  
  tbody.innerHTML = rows.map(r => `
    <tr>
      <td><b>${escHtml(r.ilot_num)}</b></td>
      <td><b>${escHtml(r.num_parcelle)}</b></td>
      <td><span class="code-badge">${escHtml(r.code)}</span></td>
      <td>${r.precision ? `<span class="prec-badge">${escHtml(r.precision)}</span>` : '—'}</td>
      <td>${escHtml(r.nom_culture)}</td>
      <td style="text-align:center">${boolCell(r.prod_semences)}</td>
      <td style="text-align:center">${boolCell(r.prod_fermiers)}</td>
      <td style="text-align:center">${boolCell(r.deshydratation)}</td>
      <td style="text-align:center">${boolCell(r.derogation_ukraine)}</td>
      <td style="text-align:center;font-family:monospace;font-size:.85rem">${r.culture_sec || '<span class="bool-no">—</span>'}</td>
      <td style="text-align:center">${boolCell(r.accident_culture)}</td>
      <td style="text-align:center">${boolCell(r.declare_iae)}</td>
      <td style="text-align:center">${boolCell(r.prise_connaissance_phyto)}</td>
    </tr>
  `).join('');
}

export function renderPP() {
  const rows = allRows;
  const statsSpan = document.getElementById('stats-pp');
  if (statsSpan) statsSpan.textContent = `${rows.length} parcelle${rows.length > 1 ? 's' : ''}`;
  
  const tbody = document.getElementById('tbody-pp');
  if (!tbody) return;
  
  tbody.innerHTML = rows.map(r => `
    <tr>
      <td><b>${escHtml(r.ilot_num)}</b></td>
      <td><b>${escHtml(r.num_parcelle)}</b></td>
      <td><span class="code-badge">${escHtml(r.code)}</span></td>
      <td>${r.precision ? `<span class="prec-badge">${escHtml(r.precision)}</span>` : '—'}</td>
      <td>${escHtml(r.nom_culture)}</td>
      <td style="text-align:center">${boolCell(r.reconversion_pp)}</td>
      <td style="text-align:center">${boolCell(r.retournement_pp)}</td>
      <td style="text-align:center">${boolCell(r.obligation_reimplantation_pp)}</td>
      <td style="text-align:center">${boolCell(r.agri_bio_conduite)}</td>
      <td style="text-align:center">${textCell(r.agri_bio_type)}</td>
      <td style="text-align:center">${boolCell(r.agri_bio_maraichage)}</td>
      <td style="text-align:center">${boolCell(r.engmaec_surface_cible)}</td>
      <td style="text-align:center">${boolCell(r.engmaec_elevage_mono)}</td>
    </tr>
  `).join('');
}

export function filterPP() {
  const search = document.getElementById('search-pp')?.value.toLowerCase() || '';
  const rows = search ? allRows.filter(r => [r.ilot_num, r.num_parcelle, r.code, r.precision, r.nom_culture].join(' ').toLowerCase().includes(search)) : allRows;
  
  const statsSpan = document.getElementById('stats-pp');
  if (statsSpan) statsSpan.textContent = `${rows.length} parcelle${rows.length > 1 ? 's' : ''}`;
  
  const tbody = document.getElementById('tbody-pp');
  if (!tbody) return;
  
  tbody.innerHTML = rows.map(r => `
    <tr>
      <td><b>${escHtml(r.ilot_num)}</b></td>
      <td><b>${escHtml(r.num_parcelle)}</b></td>
      <td><span class="code-badge">${escHtml(r.code)}</span></td>
      <td>${r.precision ? `<span class="prec-badge">${escHtml(r.precision)}</span>` : '—'}</td>
      <td>${escHtml(r.nom_culture)}</td>
      <td style="text-align:center">${boolCell(r.reconversion_pp)}</td>
      <td style="text-align:center">${boolCell(r.retournement_pp)}</td>
      <td style="text-align:center">${boolCell(r.obligation_reimplantation_pp)}</td>
      <td style="text-align:center">${boolCell(r.agri_bio_conduite)}</td>
      <td style="text-align:center">${textCell(r.agri_bio_type)}</td>
      <td style="text-align:center">${boolCell(r.agri_bio_maraichage)}</td>
      <td style="text-align:center">${boolCell(r.engmaec_surface_cible)}</td>
      <td style="text-align:center">${boolCell(r.engmaec_elevage_mono)}</td>
    </tr>
  `).join('');
}

export function sortTable(col) {
  if (sortCol === col) sortDir *= -1;
  else { sortCol = col; sortDir = 1; }
  
  document.querySelectorAll('#table-parcelles thead th').forEach(th => {
    th.classList.toggle('sorted', th.getAttribute('data-col') === col);
  });
  
  applySort();
}