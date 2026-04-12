// js/ilots.js
import { formatHa, escHtml } from './utils.js';

let allRows = [];

export function setIlotsData(rows) {
  allRows = rows;
}

export function renderIlots() {
  const groups = new Map();
  
  for (const r of allRows) {
    const ilotNum = r.ilot_num || "Sans îlot";
    if (!groups.has(ilotNum)) groups.set(ilotNum, []);
    groups.get(ilotNum).push(r);
  }
  
  const totalHa = allRows.reduce((s, r) => s + (r.area_ha || 0), 0);
  const totalAdm = allRows.reduce((s, r) => s + (r.surface_admissible_ha || 0), 0);
  const totalParcelles = allRows.length;
  
  const summaryDiv = document.getElementById('ilot-summary');
  if (summaryDiv) {
    summaryDiv.innerHTML = `
      <div class="eco-kpi"><div class="val">${totalParcelles}</div><div class="lbl">Parcelles totales</div></div>
      <div class="eco-kpi"><div class="val">${totalHa.toFixed(2).replace('.', ',')} ha</div><div class="lbl">Surface graphique totale</div></div>
      <div class="eco-kpi"><div class="val">${totalAdm.toFixed(2).replace('.', ',')} ha</div><div class="lbl">Surface admissible totale</div></div>
      <div class="eco-kpi"><div class="val">${groups.size}</div><div class="lbl">Nombre d'îlots</div></div>
    `;
  }
  
  const container = document.getElementById('ilots-container');
  if (!container) return;
  
  const sortedGroups = Array.from(groups.entries()).sort((a, b) => {
    const numA = parseInt(a[0], 10) || 0;
    const numB = parseInt(b[0], 10) || 0;
    return numA - numB;
  });
  
  let rowsHtml = sortedGroups.map(([ilotNum, parcelles]) => {
    const haTotal = parcelles.reduce((s, p) => s + (p.area_ha || 0), 0);
    const haAdm = parcelles.reduce((s, p) => s + (p.surface_admissible_ha || 0), 0);
    const surfacePercent = totalHa > 0 ? (haTotal / totalHa * 100) : 0;
    const ilotRef = parcelles[0]?.ilot_ref || '—';
    
    return `
      <tr>
        <td style="text-align:center;font-weight:700">${escHtml(ilotNum)}</td>
        <td style="font-size:.8rem;color:#555">${escHtml(ilotRef)}</td>
        <td style="text-align:right;font-weight:600">${haTotal.toFixed(2).replace('.', ',')} ha</td>
        <td style="text-align:right;font-weight:600;color:#1f5e2c">${haAdm > 0 ? haAdm.toFixed(2).replace('.', ',') + ' ha' : '—'}</td>
        <td style="text-align:right">
          <span style="display:inline-flex;align-items:center;gap:8px">
            ${surfacePercent.toFixed(1).replace('.', ',')} %
            <span class="surface-progress"><span class="surface-progress-bar" style="width:${Math.min(surfacePercent, 100)}%"></span></span>
          </span>
        </td>
      </tr>
    `;
  }).join('');
  
  container.innerHTML = `
    <div class="table-wrap">
      <table style="width:100%;border-collapse:collapse">
        <thead>
          <tr style="background:#2d6a2f;color:white">
            <th style="padding:12px;text-align:center">N° Îlot</th>
            <th style="padding:12px;text-align:left">Réf. îlot</th>
            <th style="padding:12px;text-align:right">Surface graphique (ha)</th>
            <th style="padding:12px;text-align:right">Surface admissible (ha)</th>
            <th style="padding:12px;text-align:right">% du total</th>
           </tr>
        </thead>
        <tbody>
          ${rowsHtml}
        </tbody>
        <tfoot>
          <tr style="background:#1a4a1c;color:white;font-weight:700">
            <td style="padding:12px;text-align:center">TOTAL</td>
            <td style="padding:12px;"></td>
            <td style="padding:12px;text-align:right">${totalHa.toFixed(2).replace('.', ',')} ha</td>
            <td style="padding:12px;text-align:right">${totalAdm > 0 ? totalAdm.toFixed(2).replace('.', ',') + ' ha' : '—'}</td>
            <td style="padding:12px;text-align:right">100,0 %</td>
           </tr>
        </tfoot>
       </table>
    </div>
  `;
}