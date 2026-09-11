// Pure calculation helpers for the monthly return, ported from the MR module
// in pasunestam.html so the logic is typed and testable in one place. The
// editor screen, the print view and any future server-side check should all
// import from here rather than re-deriving these rules.

export type NumericMap = Record<string, string>;

/** A month key in the form the return is keyed by, e.g. "2026-09". */
export type MonthKey = string;

export interface MonthWork {
  /** Typed-in target figures for the month. */
  target?: NumericMap;
  /** Typed-in "up to previous month" opening figures (only entered once, on the first return of a financial year). */
  opening?: NumericMap;
  /** Typed-in figures for this month. */
  during?: NumericMap;
}

/** Parses a form value the way the paper form expects: blank/invalid becomes 0. */
export function toNumber(raw: unknown): number {
  const n = typeof raw === 'number' ? raw : parseFloat(String(raw ?? ''));
  return Number.isFinite(n) ? n : 0;
}

/** Rounds to 2 decimal places, avoiding the usual floating point noise. */
export function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

/** How a total is displayed on screen: blank instead of "0" for an empty cell. */
export function formatNumber(n: number): string {
  return n ? String(round2(n)) : '';
}

/**
 * Cleans one raw keystroke-by-keystroke input value, matching the paper
 * form's fields: digits only, or digits with a single decimal point for
 * fields that allow fractions (e.g. fodder acres). Capped to 10 characters,
 * same as the editor's inputs.
 */
export function sanitizeValue(raw: string, allowDecimal = false): string {
  let cleaned = allowDecimal ? raw.replace(/[^0-9.]/g, '') : raw.replace(/\D/g, '');
  if (allowDecimal) cleaned = cleaned.replace(/(\..*)\./g, '$1');
  return cleaned.slice(0, 10);
}

/**
 * Cleans every value in a month's typed-in maps (target/opening/during).
 * `decimalKeys` names the fields that allow a fraction (e.g. "fodder.maize");
 * everything else is digits-only.
 */
export function sanitizeWork(work: MonthWork, decimalKeys: ReadonlySet<string> = new Set()): MonthWork {
  const sanitizeMap = (map?: NumericMap): NumericMap | undefined => {
    if (!map) return map;
    return Object.fromEntries(
      Object.entries(map).map(([key, value]) => [key, sanitizeValue(String(value ?? ''), decimalKeys.has(key))])
    );
  };
  return {
    target: sanitizeMap(work.target),
    opening: sanitizeMap(work.opening),
    during: sanitizeMap(work.during),
  };
}

/**
 * India's veterinary department financial year runs April-to-March. Given a
 * month key like "2026-09", returns the "YYYY-04" the financial year opened.
 */
export function financialYearStartMonth(month: MonthKey): MonthKey {
  const [year, monthNum] = month.split('-').map(Number);
  const fyYear = monthNum >= 4 ? year : year - 1;
  return `${fyYear}-04`;
}

/**
 * "Up to previous month" figures: the sum of every earlier month's opening
 * balance plus what was typed in during that month, across the whole
 * financial year so far.
 */
export function aggregatePrevious(works: Array<Pick<MonthWork, 'opening' | 'during'> | undefined>): Record<string, number> {
  const totals: Record<string, number> = {};
  for (const work of works) {
    if (!work) continue;
    for (const source of [work.opening, work.during]) {
      if (!source) continue;
      for (const [key, value] of Object.entries(source)) {
        totals[key] = round2((totals[key] ?? 0) + toNumber(value));
      }
    }
  }
  return totals;
}

/** Progressive total = previous months' total + this month's figure. */
export function progressiveTotal(previous: number, duringThisMonth: number): number {
  return round2(previous + duringThisMonth);
}

/** Sums a list of numbers, e.g. adding up every item under a section's "Total" row. */
export function sumValues(values: number[]): number {
  return round2(values.reduce((sum, value) => sum + value, 0));
}

/**
 * Section C on the paper form ("Total no. of cases treated") is always
 * Section A ("new cases") + Section B ("old cases") for the matching item.
 * `a` and `b` are keyed the same way (e.g. by species: "white", "black", ...).
 */
export function combineSections(a: Record<string, number>, b: Record<string, number>): Record<string, number> {
  const keys = new Set([...Object.keys(a), ...Object.keys(b)]);
  const combined: Record<string, number> = {};
  for (const key of keys) {
    combined[key] = round2((a[key] ?? 0) + (b[key] ?? 0));
  }
  return combined;
}
