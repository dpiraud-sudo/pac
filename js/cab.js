// js/cab.js
import { formatHa, escHtml } from './utils.js';

let cabRows = [];

export function setCabData(rows) {
  cabRows = rows;
}

// ── Libellés ──────────────────────────────────────────────────────────────────

function labelTypeBio(code) {
  switch (code) {
    case 'C1': return 'Conversion 1ʳᵉ année';
    case 'C2': return 'Conversion 2ᵉ année';
    case 'C3': return 'Conversion 3ᵉ année';
    case 'AB': return 'Agriculture biologique';
    default:   return code || '—';
  }
}

// ── Rendu principal ───────────────────────────────────────────────────────────

export function renderCab() {
  const rows = cabRows;

  // ── KPIs ──────────────────────────────────────────────────────────────────
  const totalElems = rows.length;
  const totalSurf  = rows.reduce((s, r) => s + (r.area_ha || 0), 0);
  const codes      = [...new Set(rows.map(r => r.code_mesure))];
  const ilots      = [...new Set(rows.map(r => r.ilot_num))];

  const summaryDiv = document.getElementById('cab-summary');
  if (summaryDiv) {
    summaryDiv.innerHTML = `
      <div class="eco-kpi"><div class="val">${totalElems}</div><div class="lbl">Élément${totalElems > 1 ? 's' : ''} bio engagé${totalElems > 1 ? 's' : ''}</div></div>
      <div class="eco-kpi"><div class="val">${totalSurf.toFixed(2).replace('.', ',')} ha</div><div class="lbl">Surface bio totale</div></div>
      <div class="eco-kpi"><div class="val">${ilots.length}</div><div class="lbl">Îlot${ilots.length > 1 ? 's' : ''} concerné${ilots.length > 1 ? 's' : ''}</div></div>
      <div class="eco-kpi"><div class="val">${codes.length}</div><div class="lbl">Mesure${codes.length > 1 ? 's' : ''} CAB</div></div>
    `;
  }

  const container = document.getElementById('cab-container');
  if (!container) return;

  if (!rows.length) {
    container.innerHTML = `
      <div style="text-align:center;padding:40px;color:#888;background:white;border-radius:16px;border:1px solid #deecda">
        <div style="font-size:2rem;margin-bottom:8px">🌿</div>
        <div>Aucun engagement CAB / bio trouvé dans ce fichier.</div>
      </div>`;
    return;
  }

  // ── Regroupement par code mesure ───────────────────────────────────────────
  const byMesure = new Map();
  for (const r of rows) {
    if (!byMesure.has(r.code_mesure)) byMesure.set(r.code_mesure, []);
    byMesure.get(r.code_mesure).push(r);
  }

  container.innerHTML = Array.from(byMesure.entries()).map(([mesure, elems]) => {
    const haTot    = elems.reduce((s, e) => s + (e.area_ha || 0), 0);
    const premCamp = elems[0]?.premiere_campagne || '?';
    const dernCamp = elems[0]?.derniere_campagne || null;
    const anneesRestantes = dernCamp ? Math.max(0, parseInt(dernCamp) - 2026) : '?';

    const rowsHtml = elems.map(e => {
      const typeBioLabel = labelTypeBio(e.type_bio);
      const typeBioBg    = e.type_bio === 'AB' ? '#d0f0d0' : '#fff3cd';
      const typeBioColor = e.type_bio === 'AB' ? '#1a6020' : '#7a5c00';

      return `
        <tr>
          <td style="text-align:center;font-weight:700">${escHtml(e.ilot_num)}</td>
          <td style="text-align:center;font-weight:700">${escHtml(String(e.numero_element))}</td>
          <td>${escHtml(e.commune || '—')}</td>
          <td style="text-align:right;font-weight:600">${e.area_ha ? e.area_ha.toFixed(2).replace('.', ',') + ' ha' : '—'}</td>
          <td style="text-align:center">
            <span style="background:${e.cultures_annuelles === 'true' ? '#d0eaff' : '#d4f0d4'};color:${e.cultures_annuelles === 'true' ? '#1a5080' : '#2a6b2f'};padding:2px 8px;border-radius:12px;font-weight:600;font-size:0.8rem">
              ${e.cultures_annuelles === 'true' ? '🌾 Annuelles' : '🌿 Prairies / PP'}
            </span>
          </td>
          <td style="text-align:center">
            <span style="background:${typeBioBg};color:${typeBioColor};padding:2px 10px;border-radius:12px;font-weight:600;font-size:0.8rem">
              ${escHtml(typeBioLabel)}
            </span>
          </td>
          <td style="text-align:center">
            <span style="background:#d0eaff;color:#1a5080;padding:2px 8px;border-radius:12px;font-weight:600;font-size:0.8rem">
              ${e.premiere_campagne || '?'}
            </span>
          </td>
          <td style="text-align:center">
            <span style="background:#fde9cf;color:#aa6f20;padding:2px 8px;border-radius:12px;font-weight:600;font-size:0.8rem">
              ${dernCamp || 'En cours'}
            </span>
          </td>
        </tr>
      `;
    }).join('');

    const statusBg    = anneesRestantes === 0 ? '#ffd0d0' : anneesRestantes === '?' ? '#e8f4e8' : '#d4f0d4';
    const statusColor = anneesRestantes === 0 ? '#a00'    : anneesRestantes === '?' ? '#2a6b2f' : '#2a6b2f';
    const statusLabel = anneesRestantes === 0
      ? '⚠️ Terminé'
      : anneesRestantes === '?'
        ? '✅ Engagement en cours'
        : `${anneesRestantes} an${anneesRestantes > 1 ? 's' : ''} restant${anneesRestantes > 1 ? 's' : ''}`;

    return `
      <div class="eco-group" style="margin-bottom:20px">
        <div class="eco-header" onclick="window.toggleEcoGroup?.(this)">
          <span class="expand-icon">▼</span>
          <div class="eco-title">🌿 ${escHtml(mesure)}</div>
          <div class="eco-stats">
            <span>📋 ${elems.length} élément${elems.length > 1 ? 's' : ''}</span>
            <span>📐 ${haTot.toFixed(2).replace('.', ',')} ha</span>
            <span>🗓️ Depuis ${premCamp}</span>
            <span style="background:${statusBg};color:${statusColor}">${statusLabel}</span>
          </div>
        </div>
        <div class="eco-detail-wrap">
          <table class="eco-detail-table">
            <thead>
              <tr>
                <th style="text-align:center">Îlot</th>
                <th style="text-align:center">N° Élément</th>
                <th>Commune</th>
                <th style="text-align:right">Surface engagée</th>
                <th style="text-align:center">Type cultures</th>
                <th style="text-align:center">Stade bio</th>
                <th style="text-align:center">1ère campagne</th>
                <th style="text-align:center">Fin engagement</th>
              </tr>
            </thead>
            <tbody>${rowsHtml}</tbody>
            <tfoot>
              <tr style="background:#eef5ea;font-weight:700">
                <td colspan="3" style="padding:8px 10px;text-align:right">Total</td>
                <td style="padding:8px 10px;text-align:right">${haTot.toFixed(2).replace('.', ',')} ha</td>
                <td colspan="4"></td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>
    `;
  }).join('');
}
