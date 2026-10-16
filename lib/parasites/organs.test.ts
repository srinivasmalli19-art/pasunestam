import { describe, expect, it } from 'vitest';
import { ENTRIES, GROUP_ORDER, GROUP_TABLE, ORGANS, ORGAN_ORDER, entriesFor } from './organs';

describe('parasites by organ', () => {
  it('every entry points at real organs and hosts', () => {
    for (const e of ENTRIES) {
      expect(e.organs.length, e.name).toBeGreaterThan(0);
      for (const o of e.organs) expect(ORGANS[o], `${e.name}:${o}`).toBeDefined();
      expect(e.hosts.length).toBeGreaterThan(0);
    }
  });

  it('every organ has at least one parasite in cattle or sheep', () => {
    for (const o of ORGAN_ORDER) expect(entriesFor(o, 'cattle').length + entriesFor(o, 'sheep').length, o).toBeGreaterThan(0);
  });

  it('every group is represented and in the comparison table', () => {
    for (const g of GROUP_ORDER) {
      expect(ENTRIES.some((e) => e.group === g), g).toBe(true);
      for (const row of GROUP_TABLE) expect(row.values[g], `${row.label}:${g}`).toBeTruthy();
    }
  });

  it('puts the key parasites in the right place', () => {
    const where = (n: string) => ENTRIES.find((e) => e.name.startsWith(n))!;
    expect(where('Haemonchus contortus').organs).toEqual(['abomasum']);
    expect(where('Fasciola').organs).toEqual(['liver']);
    expect(where('Amphistomes (rumen').organs).toEqual(['rumen']);
    expect(where('Dictyocaulus viviparus').organs).toEqual(['lungs']);
    expect(where('Coenurus').organs).toEqual(['brain']);
    expect(where('Hydatid').organs).toEqual(expect.arrayContaining(['liver', 'lungs']));
    expect(where('Moniezia').group).toBe('cestode');
    expect(where('Theileria').group).toBe('protozoa');
  });

  it('larval cysts name the host of the adult tapeworm', () => {
    for (const e of ENTRIES.filter((x) => x.stage.toLowerCase().includes('larval cyst'))) expect(e.cystOf, e.name).toBeTruthy();
  });

  it('filters by group', () => {
    expect(entriesFor('smallInt', 'cattle', 'cestode').every((e) => e.group === 'cestode')).toBe(true);
    expect(entriesFor('smallInt', 'cattle', 'cestode').length).toBeGreaterThan(0);
  });
});
