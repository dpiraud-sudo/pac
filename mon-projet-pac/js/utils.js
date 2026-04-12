// Fonctions utilitaires
export function sbadge(s) {
  const c = s === 'TA' ? 'surf-TA' : s === 'PP' ? 'surf-PP' : s === 'CP' ? 'surf-CP' : 'surf-other';
  return `<span class="${c}">${s}</span>`;
}

export function formatHa(value) {
  if (value === null || value === undefined || value === '') return '—';
  const num = typeof value === 'number' ? value : parseFloat(value);
  if (isNaN(num)) return '—';
  return num.toFixed(2).replace('.', ',') + ' ha';
}

export function escHtml(str) {
  if (!str) return '';
  return str.replace(/[&<>]/g, m => m === '&' ? '&amp;' : m === '<' ? '&lt;' : '&gt;');
}

export function boolCell(v) {
  if (v === 'true') return '<span class="bool-yes">✓ true</span>';
  if (v === 'false') return '<span class="bool-no">✗ false</span>';
  if (v) return `<span style="font-family:monospace;font-size:.8rem">${escHtml(v)}</span>`;
  return '<span class="bool-no">—</span>';
}

export function textCell(v) {
  return v ? `<span style="font-family:monospace;font-weight:700;font-size:.82rem">${escHtml(v)}</span>` : '<span class="bool-no">—</span>';
}