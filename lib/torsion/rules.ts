// Uterine torsion in cattle: what the vet finds on examination for each
// type / direction / degree, and whether Schaffer's (plank-in-flank rolling)
// method is likely to correct it or the case needs surgery.
//
// Drafted from standard veterinary obstetrics teaching and the table agreed
// with the client vet. Every sentence here is clinical content and must be
// reviewed by a veterinarian before publishing; this is decision support, not
// a substitute for clinical judgement.

export type TorsionType = 'none' | 'pre' | 'post';
/** As seen from behind the cow. Clockwise = "right" torsion, anticlockwise = "left". */
export type Direction = 'clockwise' | 'anticlockwise';

export interface TorsionConfig {
  type: TorsionType;
  direction: Direction;
  /** Degrees of rotation: 45, 90, 180, 270, 360, 540 … */
  degree: number;
}

export const DEGREES = [45, 90, 180, 270, 360, 540] as const;

export const TYPE_NAME: Record<TorsionType, string> = {
  none: 'No torsion (normal)',
  pre: 'Pre-cervical torsion',
  post: 'Post-cervical torsion',
};

export const DIRECTION_NAME: Record<Direction, string> = {
  clockwise: 'Clockwise (right) — seen from behind',
  anticlockwise: 'Anticlockwise (left) — seen from behind',
};

export function torsionName(c: TorsionConfig): string {
  if (c.type === 'none') return TYPE_NAME.none;
  const dir = c.direction === 'clockwise' ? 'right (clockwise)' : 'left (anticlockwise)';
  return `${c.degree}° ${dir} ${c.type === 'pre' ? 'pre-cervical' : 'post-cervical'} torsion`;
}

export function severityName(degree: number): string {
  if (degree <= 90) return 'Mild';
  if (degree <= 180) return 'Moderate';
  if (degree <= 360) return 'Severe';
  return 'Very severe';
}

export interface Findings {
  vaginal: string;
  rectal: string;
  /** Short "how to tell it apart" line. */
  key: string;
}

/** What the vet would expect to find on vaginal and rectal examination. */
export function findings(c: TorsionConfig): Findings {
  if (c.type === 'none') {
    return {
      vaginal: 'Vagina normal, folds run straight forward. The cervix is reached easily.',
      rectal: 'Broad ligaments hang down symmetrically on each side of the uterus.',
      key: 'Straight vaginal folds and symmetrical broad ligaments.',
    };
  }

  const cw = c.direction === 'clockwise';
  const way = cw ? 'clockwise (to the right)' : 'anticlockwise (to the left)';
  const over = cw ? 'left' : 'right';
  const under = cw ? 'right' : 'left';

  let rectal: string;
  if (c.degree <= 90) {
    rectal = `Uterus slightly rotated: the ${over} broad ligament is pulled up and tighter than the ${under}.`;
  } else if (c.degree <= 360) {
    rectal = `The ${over} broad ligament is pulled tight over the top of the uterus towards the ${under}; the ${under} broad ligament runs down underneath it. Uterus tense.`;
  } else {
    rectal = `Both broad ligaments are wrapped around the uterus, which is very tense and hard to outline. The ${over} ligament runs over the top first.`;
  }

  if (c.type === 'pre') {
    return {
      vaginal:
        'Vagina NORMAL — no spiral folds. The cervix may be felt, tense and pulled forward, but the twist itself cannot be felt per vaginam.',
      rectal: `${rectal} The twist lies in front of the cervix.`,
      key: 'Normal vagina but crossed broad ligaments per rectum → pre-cervical. Easily missed if only a vaginal exam is done.',
    };
  }

  let vaginal: string;
  if (c.degree <= 90) {
    vaginal = `Slight oblique folds in the front part of the vagina, turning ${way}. The cervix can usually be reached.`;
  } else if (c.degree <= 180) {
    vaginal = `Clear spiral folds in the front part of the vagina, turning ${way}. The hand passes with difficulty; the cervix may just be felt.`;
  } else if (c.degree <= 270) {
    vaginal = `Tight spiral folds turning ${way}; the vagina narrows so only the fingers pass. The cervix usually cannot be reached.`;
  } else {
    vaginal = `The vagina closes in a tight spiral cone turning ${way}. The cervix cannot be reached.`;
  }
  return {
    vaginal,
    rectal: `${rectal} The twist includes the cervix and the front of the vagina.`,
    key: 'Spiral folds in the vagina → post-cervical. The way the folds turn shows the direction.',
  };
}

// ---- Schaffer's method or surgery? ----------------------------------------

export type Hours = 'under24' | '24to48' | 'over48';
export type CalfState = 'alive' | 'dead' | 'emphysematous';
export type AnimalState = 'stable' | 'weak';
export type Attempts = 'none' | 'oneOrTwo' | 'threePlus';

export interface CaseDetails {
  hours: Hours;
  calf: CalfState;
  animal: AnimalState;
  ruptureSigns: boolean;
  attempts: Attempts;
}

export const DEFAULT_CASE: CaseDetails = {
  hours: 'under24',
  calf: 'alive',
  animal: 'stable',
  ruptureSigns: false,
  attempts: 'none',
};

export type VerdictLevel = 'notNeeded' | 'possible' | 'caution' | 'surgery';

export interface Verdict {
  level: VerdictLevel;
  headline: string;
  reasons: string[];
  /** Always-relevant follow-up advice. */
  notes: string[];
}

/** Whether Schaffer's (flank / plank-in-flank rolling) method is likely to relieve this torsion, or surgery is needed. */
export function schafferVerdict(c: TorsionConfig, d: CaseDetails = DEFAULT_CASE): Verdict {
  const notes: string[] = [];
  if (c.type === 'none') {
    return { level: 'notNeeded', headline: 'No torsion — no correction needed.', reasons: [], notes };
  }
  if (c.type === 'pre') notes.push('Pre-cervical: correction by rotating the calf per vaginam is not possible — the calf cannot be reached.');

  // Hard stops first: any one of these means surgery, whatever the type.
  const surgery: string[] = [];
  if (d.ruptureSigns) surgery.push('Signs of uterine rupture or peritonitis — rolling is dangerous.');
  if (d.animal === 'weak') surgery.push('Animal weak, toxic or in shock — casting and rolling can kill it. Stabilise, then operate.');
  if (c.degree > 360) surgery.push(`${c.degree}° is more than one full turn — rolling rarely succeeds and risks tearing the uterus.`);
  if (d.hours === 'over48') surgery.push('Torsion of more than about 48 hours — the uterine wall is swollen and fragile and may be stuck to nearby organs.');
  if (d.calf === 'emphysematous') surgery.push('Calf dead and swollen (emphysematous) — the uterus is likely damaged.');
  if (d.attempts === 'threePlus') surgery.push('Already rolled 3 or more times without success — stop; more rolling exhausts the animal and damages the uterus.');
  if (surgery.length) {
    return { level: 'surgery', headline: 'Not by flank method — go for surgery (laparotomy / caesarean).', reasons: surgery, notes };
  }
  // Only relevant when the twist is corrected without surgery.
  notes.unshift('After correction, check that the cervix opens. If it does not dilate, deliver by caesarean.');

  if (c.degree <= 90) {
    return {
      level: 'notNeeded',
      headline: 'Usually no rolling needed.',
      reasons: [
        'Mild torsion (up to 90°) often corrects itself during calving.',
        c.type === 'post'
          ? 'If the cervix is open, rotate the calf by hand per vaginam.'
          : 'Monitor; correct by rolling if labour does not progress.',
      ],
      notes,
    };
  }

  const caution: string[] = [];
  if (d.hours === '24to48') caution.push('24–48 hours since straining began — the uterus may already be swollen.');
  if (d.calf === 'dead') caution.push('Calf dead — the uterine wall may be weakened.');
  if (d.attempts === 'oneOrTwo') caution.push('Rolling already tried — one more careful attempt at most, then surgery.');
  if (c.degree === 360) caution.push('A full 360° turn — may need several rolls; stop if it does not correct.');

  const ok = [
    c.type === 'post' && c.degree <= 180
      ? 'If the calf can be reached through the cervix, rotating it by hand may be enough; otherwise Schaffer’s method.'
      : `Schaffer’s method is the usual correction for a ${severityName(c.degree).toLowerCase()} ${c.type === 'pre' ? 'pre' : 'post'}-cervical torsion when the animal is presented early and is stable.`,
    `Roll in the same direction as the torsion (${c.direction === 'clockwise' ? 'clockwise / to the right' : 'anticlockwise / to the left'}), checking per vaginam after each roll.`,
  ];

  if (caution.length) {
    return {
      level: 'caution',
      headline: 'Flank method may be tried with care — be ready for surgery.',
      reasons: [...caution, ...ok],
      notes,
    };
  }
  return { level: 'possible', headline: 'Can usually be relieved by the flank (Schaffer’s) method.', reasons: ok, notes };
}
