import { formatHa, escHtml } from './utils.js';

let maecRows = [];

export function setMaecData(rows) {
  maecRows = rows;
}

export function renderMaec() {
  const rows = maecRows;
  const mesures = [...new Set(rows.map(r => r.code_mesure))];
  const totalSurf = rows.reduce((s, r) => s + (r.maec_area_ha || 0), 0);
  
  const summaryDiv = document.getElementById('maec-summary');
  if (summaryDiv) {
    summaryDiv.innerHTML = `
      <div class="eco-kpi"><div class="val">${rows.length}</div><div class="lbl">Parcelles engagées</div></div>
      <div class="eco-kpi"><div class="val">${totalSurf.toFixed(2).replace('.', ',')} ha</div><div class="lbl">Surface totale engagée</div></div>
      <div class="eco-kpi"><div class="val">${mesures.length}</div><div class="lbl">Mesure${mesures.length > 1 ? 's' : ''} MAEC</div></div>
    `;
  }
  
  const container = document.getElementById('maec-container');
  if (!container) return;
  
  if (!rows.length) {
    container.innerHTML = `
      <div style="text-align:center;padding:40px;color:#888;background:white;border-radius:16px;border:1px solid #deecda">
        <div style="font-size:2rem;margin-bottom:8px">📋</div>
        <div>Aucun engagement MAEC trouvé dans ce fichier.</div>
      </div>`;
    return;
  }
  
  const byMesure = new Map();
  for (const r of rows) {
    if (!byMesure.has(r.code_mesure)) byMesure.set(r.code_mesure, []);
    byMesure.get(r.code_mesure).push(r);
  }
  
  container.innerHTML = Array.from(byMesure.entries()).map(([mesure, parcelles]) => {
    const haTot = parcelles.reduce((s, p) => s + (p.maec_area_ha || 0), 0);
    const premCamp = parcelles[0]?.premiere_campagne || '?';
    const dernCamp = parcelles[0]?.derniere_campagne || '?';
    const anneesRestantes = dernCamp !== '?' ? Math.max(0, parseInt(dernCamp) - 2026) : '?';
    
    const rowsHtml = parcelles.map(p => `
      <tr>
        <td style="text-align:center;font-weight:700">${escHtml(p.ilot_num)}</td>
        <td style="text-align:center;font-weight:700">${escHtml(p.num_parcelle)}</td>
        <td>${escHtml(p.commune || '—')}</td>
        <td style="text-align:right;font-weight:600">${p.maec_area_ha ? p.maec_area_ha.toFixed(2).replace('.', ',') + ' ha' : '—'}</td>
        <td style="text-align:center"><span style="background:#d0eaff;color:#1a5080;padding:2px 8px;border-radius:12px;font-weight:600;font-size:0.8rem">${p.premiere_campagne || '?'}</span></td>
        <td style="text-align:center"><span style="background:#fde9cf;color:#aa6f20;padding:2px 8px;border-radius:12px;font-weight:600;font-size:0.8rem">${p.derniere_campagne || '?'}</span></td>
      </tr>
    `).join('');
    
    return `
      <div class="eco-group" style="margin-bottom:20px">
        <div class="eco-header" onclick="window.toggleEcoGroup?.(this)">
          <span class="expand-icon">▼</span>
          <div class="eco-title">📝 ${escHtml(mesure)}</div>
          <div class="eco-stats">
            <span>🌍 ${parcelles.length} parcelle${parcelles.length > 1 ? 's' : ''}</span>
            <span>📐 ${haTot.toFixed(2).replace('.', ',')} ha</span>
            <span>🗓️ ${premCamp} → ${dernCamp}</span>
            <span style="background:${anneesRestantes === 0 ? '#ffd0d0' : anneesRestantes <= 1 ? '#fde9cf' : '#d4f0d4'};color:${anneesRestantes === 0 ? '#a00' : anneesRestantes <= 1 ? '#aa6f20' : '#2a6b2f'}">
              ${anneesRestantes === 0 ? '⚠️ Terminé' : `${anneesRestantes} an${anneesRestantes > 1 ? 's' : ''} restant${anneesRestantes > 1 ? 's' : ''}`}
            </span>
          </div>
        </div>
        <div class="eco-detail-wrap">
          <table class="eco-detail-table">
            <thead>
              <tr>
                <th style="text-align:center">Îlot</th>
                <th style="text-align:center">N° Parcelle</th>
                <th>Commune</th>
                <th style="text-align:right">Surface engagée</th>
                <th style="text-align:center">1ère campagne</th>
                <th style="text-align:center">Dernière campagne</th>
              </tr>
            </thead>
            <tbody>${rowsHtml}</tbody>
            <tfoot>
              <tr style="background:#eef5ea;font-weight:700">
                <td colspan="3" style="padding:8px 10px;text-align:right">Total</td>
                <td style="padding:8px 10px;text-align:right">${haTot.toFixed(2).replace('.', ',')} ha</td>
                <td colspan="2"></td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>
    `;
  }).join('');
}