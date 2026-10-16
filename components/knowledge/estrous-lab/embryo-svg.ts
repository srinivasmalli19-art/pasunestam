// A magnified drawing of the embryo at its current stage (SVG markup string),
// shared by the side-panel card and the magnifier inset over the 3D.
import type { EmbryoState } from '@/lib/estrous/cycle';

export function embryoSvg(e: EmbryoState): string {
  const parts: string[] = [];
  const cells = Math.min(e.cells, 32);
  const cleaving = e.stage === '2-cell' || e.stage === '4-8 cell' || e.stage === 'morula';
  const zona = ['oocyte', 'zygote', '2-cell', '4-8 cell', 'morula', 'blastocyst'].includes(e.stage);
  if (zona) parts.push('<circle cx="60" cy="50" r="34" class="el-zona"/>');
  if (e.stage === 'oocyte' || e.stage === 'zygote') parts.push('<circle cx="60" cy="50" r="24" class="el-cell"/>');
  else if (cleaving && cells > 0) {
    // sunflower packing of the blastomeres inside the zona
    const R = 22;
    const r = Math.min(15, (R / Math.sqrt(cells)) * 1.05);
    for (let i = 0; i < cells; i++) {
      const rad = cells === 2 ? 9 : R * Math.sqrt((i + 0.5) / cells) * (cells <= 4 ? 0.75 : 1);
      const a = i * (cells === 2 ? Math.PI : 2.39996);
      parts.push(`<circle cx="${(60 + rad * Math.cos(a)).toFixed(1)}" cy="${(50 + rad * Math.sin(a)).toFixed(1)}" r="${r.toFixed(1)}" class="el-cell"/>`);
    }
  }
  if (e.stage === 'zygote') parts.push('<circle cx="53" cy="47" r="5" class="el-pronucleus"/><circle cx="67" cy="53" r="5" class="el-pronucleus"/>');
  if (e.stage === 'blastocyst' || e.stage === 'hatched blastocyst') {
    parts.push(`<circle cx="60" cy="50" r="${e.stage === 'blastocyst' ? 28 : 33}" class="el-troph"/>`);
    parts.push('<ellipse cx="60" cy="30" rx="14" ry="9" class="el-icm"/>');
  }
  if (e.stage === 'elongating' || e.stage === 'attaching' || e.stage === 'placentomes forming')
    parts.push('<path d="M8 60 C 30 30, 50 75, 70 45 S 105 40, 112 55" class="el-filament"/>');
  if (e.stage === 'placentomes forming')
    for (const cx of [24, 48, 72, 96]) parts.push(`<ellipse cx="${cx}" cy="82" rx="8" ry="5" class="el-placentome"/>`);
  return `<svg viewBox="0 0 120 100" aria-hidden="true">${parts.join('')}</svg>`;
}

/** Plain-English name for the stage, e.g. "8-cell embryo". */
export function embryoStageName(e: EmbryoState): string {
  if (e.stage === '4-8 cell') return `${e.cells}-cell embryo`;
  if (e.stage === '2-cell') return '2-cell embryo';
  if (e.stage === 'oocyte') return 'Egg (oocyte)';
  return e.stage[0].toUpperCase() + e.stage.slice(1);
}
