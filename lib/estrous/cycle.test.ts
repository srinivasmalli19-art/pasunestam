import { describe, expect, it } from 'vitest';
import {
  OVULATION_DAY,
  SPECIES_TIMING,
  corpusLuteum,
  dominantFollicle,
  embryo,
  hormoneLevel,
  phaseOn,
  story,
} from './cycle';

const peakDay = (h: Parameters<typeof hormoneLevel>[0], from: number, to: number, outcome: 'notPregnant' | 'pregnant' = 'notPregnant') => {
  let best = from;
  for (let d = from; d <= to; d += 0.01) if (hormoneLevel(h, d, outcome) > hormoneLevel(h, best, outcome)) best = d;
  return best;
};

describe('hormone pattern', () => {
  it('oestradiol peaks, then the LH surge, then ovulation', () => {
    const e2 = peakDay('estradiol', -1, 1);
    const lh = peakDay('lh', -1, 1);
    expect(e2).toBeLessThan(lh);
    expect(lh).toBeLessThan(OVULATION_DAY);
  });

  it('progesterone is low at heat and high in mid-diestrus', () => {
    expect(hormoneLevel('progesterone', 0, 'notPregnant')).toBeLessThan(0.15);
    expect(hormoneLevel('progesterone', 12, 'notPregnant')).toBeGreaterThan(0.9);
  });

  it('without pregnancy: PGF2α pulses on days 16–18.5, then progesterone falls', () => {
    expect(peakDay('pgf2a', 0, 20.9)).toBeGreaterThan(16);
    expect(peakDay('pgf2a', 0, 20.9)).toBeLessThan(18.7);
    expect(hormoneLevel('progesterone', 19.5, 'notPregnant')).toBeLessThan(0.2);
  });

  it('with pregnancy: no PGF2α pulses, interferon-tau around days 14–19, progesterone stays high', () => {
    expect(hormoneLevel('pgf2a', 17.5, 'pregnant')).toBeLessThan(0.1);
    const ifn = peakDay('ifnTau', 10, 25, 'pregnant');
    expect(ifn).toBeGreaterThan(14);
    expect(ifn).toBeLessThan(19);
    expect(hormoneLevel('progesterone', 30, 'pregnant')).toBeGreaterThan(0.9);
    expect(hormoneLevel('ifnTau', 16, 'notPregnant')).toBe(0);
  });

  it('a non-pregnant cycle repeats every 21 days', () => {
    expect(hormoneLevel('progesterone', 33, 'notPregnant')).toBeCloseTo(hormoneLevel('progesterone', 12, 'notPregnant'));
  });

  it('all levels stay between 0 and 1', () => {
    for (const outcome of ['notPregnant', 'pregnant'] as const)
      for (let d = 0; d <= 40; d += 0.25)
        for (const h of ['estradiol', 'progesterone', 'lh', 'fsh', 'pgf2a', 'ifnTau'] as const) {
          const v = hormoneLevel(h, d, outcome);
          expect(v).toBeGreaterThanOrEqual(0);
          expect(v).toBeLessThanOrEqual(1);
        }
  });
});

describe('phases', () => {
  it('follow estrus → metestrus → diestrus → proestrus', () => {
    expect(phaseOn(0.3, 'notPregnant')).toBe('estrus');
    expect(phaseOn(2, 'notPregnant')).toBe('metestrus');
    expect(phaseOn(10, 'notPregnant')).toBe('diestrus');
    expect(phaseOn(19, 'notPregnant')).toBe('proestrus');
    expect(phaseOn(25, 'pregnant')).toBe('pregnancy');
  });
});

describe('ovary', () => {
  it('the CL forms after ovulation, regresses without pregnancy, persists with it', () => {
    expect(corpusLuteum(0.5, 'notPregnant').state).toBe('none');
    expect(corpusLuteum(2, 'notPregnant').state).toBe('haemorrhagicum');
    expect(corpusLuteum(10, 'notPregnant').sizeMm).toBeGreaterThan(20);
    expect(corpusLuteum(18.5, 'notPregnant').state).toBe('regressing');
    expect(corpusLuteum(18.5, 'pregnant').state).toBe('luteum');
  });

  it('a large ovulatory follicle is present before the next heat', () => {
    const f = dominantFollicle(20.5, 'notPregnant');
    expect(f.ovulatory).toBe(true);
    expect(f.sizeMm).toBeGreaterThanOrEqual(15);
    expect(dominantFollicle(13, 'notPregnant').ovulatory).toBe(false);
  });
});

describe('embryo', () => {
  it('is fertilised in the oviduct and reaches the uterus around day 4–5', () => {
    expect(embryo(1.7).stage).toBe('zygote');
    expect(embryo(1.7).site).toBe('oviduct');
    expect(embryo(5.5).site).toBe('uterus');
    expect(embryo(7.5).stage).toBe('blastocyst');
    expect(embryo(15).stage).toBe('elongating');
    expect(embryo(35).stage).toBe('placentomes forming');
  });
});

describe('story', () => {
  it('shows the heat panel during standing heat only', () => {
    expect(story(0.3, 'notPregnant').heat).toBe(true);
    expect(story(10, 'notPregnant').heat).toBe(false);
  });

  it('explains luteolysis without pregnancy and maternal recognition with it', () => {
    expect(story(17, 'notPregnant').events.join(' ')).toMatch(/destroys the corpus luteum/);
    expect(story(16, 'pregnant').events.join(' ')).toMatch(/interferon-tau/);
  });
});

describe('species timing notes', () => {
  it('covers cow, buffalo, sheep and goat', () => {
    expect(SPECIES_TIMING.map((s) => s.species)).toEqual(['Cow', 'Buffalo', 'Sheep', 'Goat']);
  });
});

describe('pregnant story leads with the embryo', () => {
  it('headlines fertilisation, the uterus and placentomes, keeping the ovary story as an event', () => {
    const fert = story(1.7, 'pregnant');
    expect(fert.headline).toMatch(/Fertilisation/);
    expect(fert.events[0]).toMatch(/^Ovary: /);
    expect(story(5.5, 'pregnant').headline).toMatch(/uterine horn/);
    expect(story(35, 'pregnant').headline).toMatch(/Placentomes/);
    expect(story(17.2, 'notPregnant').headline).toMatch(/PGF2α/);
  });
});
