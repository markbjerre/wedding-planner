/** `scale` = canvas pixels per metre (layout.scale). */

export function pxToMetres(scale: number, px: number): number {
  return px / scale;
}

export function metresToPx(scale: number, m: number): number {
  return m * scale;
}

export function pxToCm(scale: number, px: number): number {
  return pxToMetres(scale, px) * 100;
}

export function cmToPx(scale: number, cm: number): number {
  return metresToPx(scale, cm / 100);
}

const MIN_SHAPE_PX = 20;

/** Parse typed cm → px; returns null if incomplete or not a number. */
export function parseCmStringToPx(scale: number, raw: string): number | null {
  const t = raw.trim().replace(',', '.');
  if (t === '' || t === '.' || t === '-') return null;
  const cm = parseFloat(t);
  if (Number.isNaN(cm) || cm <= 0) return null;
  return cmToPx(scale, cm);
}

/** Non-empty draft that is not yet a valid size (red border). */
export function isInvalidCmDraft(scale: number, raw: string | null): boolean {
  if (raw === null || raw.trim() === '') return false;
  const px = parseCmStringToPx(scale, raw);
  if (px === null) return true;
  return px < MIN_SHAPE_PX;
}
