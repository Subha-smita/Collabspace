// Deterministic, unique banner (SVG) per template key. Self-contained: no external assets.
const PALETTES: [string, string, string][] = [
  ['#dfeaf6', '#bcd3ee', '#7aa7da'], ['#fdf0cf', '#f6dc9b', '#e8b64a'], ['#dcefe0', '#b9dcc2', '#6fb585'], ['#fde7ef', '#f8c8d8', '#e58aa9'],
  ['#e9e2f6', '#d2c5ec', '#9b84d1'], ['#fbe5da', '#f4c9b3', '#e39a72'], ['#e3f1ee', '#bfe0d9', '#6bb5a6'], ['#e8ecf3', '#c9d2e3', '#8393b5'],
];
const hash = (s: string) => { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; };
const esc = (s: string) => s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);

export function coverSvg(key: string, icon: string): string {
  const h = hash(key), [a, b, c] = PALETTES[h % PALETTES.length], v = (h >> 4) % 4;
  const r = (n: number, m: number) => ((h >> n) % m);
  let art = '';
  if (v === 0) art = [0, 1, 2, 3].map((i) => `<circle cx="${120 + i * 230 + r(i, 60)}" cy="${60 + r(i + 3, 120)}" r="${50 + r(i + 6, 70)}" fill="${c}" opacity=".22"/>`).join('');
  else if (v === 1) art = `<path d="M0 ${150 + r(2, 40)} C 200 ${90 + r(5, 40)}, 400 ${230 - r(8, 40)}, 600 ${150 + r(11, 30)} S 900 ${100 + r(14, 40)}, 1000 ${170}" stroke="${c}" stroke-width="26" fill="none" opacity=".35"/><path d="M0 ${220 + r(3, 30)} C 250 ${170 + r(6, 40)}, 450 ${280 - r(9, 30)}, 700 ${210 + r(12, 20)} S 900 ${190}, 1000 ${230}" stroke="${c}" stroke-width="16" fill="none" opacity=".25"/>`;
  else if (v === 2) art = Array.from({ length: 14 }, (_, i) => `<rect x="${i * 80 + 10}" y="${r(i, 80) + 20}" width="56" height="${60 + r(i + 5, 160)}" rx="10" fill="${c}" opacity="${0.14 + (i % 3) * 0.06}"/>`).join('');
  else art = Array.from({ length: 5 }, (_, i) => Array.from({ length: 14 }, (_, j) => `<circle cx="${40 + j * 75}" cy="${34 + i * 56}" r="${3 + ((i * j + r(i + j, 5)) % 4)}" fill="${c}" opacity=".4"/>`).join('')).join('');
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1000 300" preserveAspectRatio="xMidYMid slice"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${a}"/><stop offset="1" stop-color="${b}"/></linearGradient></defs><rect width="1000" height="300" fill="url(#g)"/>${art}<text x="${780 + r(7, 120)}" y="${190 + r(9, 40)}" font-size="120" opacity=".9" font-family="'Apple Color Emoji','Segoe UI Emoji','Noto Color Emoji',sans-serif">${esc(icon)}</text></svg>`;
}
export const templateCoverUrl = (key: string) => `/api/template-cover/${key}`;
