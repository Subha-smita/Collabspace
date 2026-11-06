// Client-safe cover helpers (no database imports).
export const COVER_PRESETS: Record<string, string> = {
  sand: 'linear-gradient(135deg,#f6e9c8,#f1d3ae)',
  sky: 'linear-gradient(135deg,#d3e6f5,#a8c8e3)',
  sage: 'linear-gradient(135deg,#d9ebd9,#b3d1b3)',
  rose: 'linear-gradient(135deg,#f7dde6,#e9b8c9)',
  lilac: 'linear-gradient(135deg,#e6dff5,#c7b9e6)',
  slate: 'linear-gradient(135deg,#dcdfe4,#b9c0ca)',
  dusk: 'linear-gradient(135deg,#f3d1b8,#b9a6d6)',
  mint: 'linear-gradient(135deg,#d2f0e6,#9ed5c4)',
};
// "preset:<name>", an https image URL, or a stored reference (/api/uploads/<id>, /api/template-cover/<key>, /api/templates/<id>/cover).
export const COVER_RE = /^(preset:[a-z]{2,12}|https:\/\/[^\s"'()<>\\]{1,480}|\/api\/(uploads\/[A-Za-z0-9]{8,40}|template-cover\/[a-z0-9-]{1,60}|templates\/[A-Za-z0-9]{8,40}\/cover))$/;
/** True when the cover is a gradient preset (no image to load). */
export const isPreset = (c: string) => c.startsWith('preset:');

export function coverStyle(cover: string): React.CSSProperties {
  if (cover.startsWith('preset:')) return { background: COVER_PRESETS[cover.slice(7)] ?? COVER_PRESETS.sand };
  return { backgroundImage: `url("${cover}")`, backgroundSize: 'cover', backgroundPosition: 'center', backgroundColor: '#ebeae6' };
}
