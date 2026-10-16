import type { Hormone } from './cycle';

/**
 * One colour per hormone, shared by the 3D particles and the hormone chart so
 * they always match. The validated categorical palette, assigned in its fixed
 * order (blue, orange, aqua, yellow, magenta, green); GnRH (3D only) takes slot 7.
 */
export const HORMONE_COLORS: Record<Hormone | 'gnrh', string> = {
  estradiol: '#2a78d6',
  progesterone: '#eb6834',
  lh: '#1baf7a',
  fsh: '#eda100',
  pgf2a: '#e87ba4',
  ifnTau: '#008300',
  gnrh: '#6250d6',
};
