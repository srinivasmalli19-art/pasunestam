import type { ModelId } from '@/lib/parasites/cycles';
import type { Kit, Model } from './kit';
import { cercaria, excyst, flukeAdult, flukeEgg, flukeJuvenile, metacercaria, miracidium, snail } from './models-fluke';
import { kinete, merozoite, piroplasm, rayBodies, salivary, schizont, sporozoite, tick, tickNymph } from './models-theileria';
import { exsheath, grassL3, larvaL1, larvaL2, larvaL3, larvaL4, strongyleEgg, wormAdult } from './models-worm';

export const MODELS: Record<ModelId, (kit: Kit) => Model> = {
  flukeAdult,
  flukeEgg,
  miracidium,
  snail,
  cercaria,
  metacercaria,
  excyst,
  flukeJuvenile,
  tick,
  sporozoite,
  schizont,
  merozoite,
  piroplasm,
  tickNymph,
  rayBodies,
  kinete,
  salivary,
  wormAdult,
  strongyleEgg,
  larvaL1,
  larvaL2,
  larvaL3,
  grassL3,
  exsheath,
  larvaL4,
};
