'use client';

import { useEffect, useRef, useState } from 'react';
import type { TorsionScene, TorsionView } from './scene';
import {
  DEFAULT_CASE,
  DEGREES,
  findings,
  schafferVerdict,
  severityName,
  torsionName,
  type CaseDetails,
  type Direction,
  type TorsionConfig,
  type TorsionType,
  type Verdict,
} from '@/lib/torsion/rules';
import '../ai-lab/ai-lab.css';
import './torsion-lab.css';

const VIEWS: Array<{ id: TorsionView; label: string; note: string }> = [
  { id: 'outside', label: 'Outside', note: 'The whole tract from the side. Watch where the twist sits — in front of the cervix (pre) or in the vagina (post).' },
  { id: 'above', label: 'From above (rectal)', note: 'Looking down, as your hand finds it per rectum: which broad ligament crosses over the top of the uterus.' },
  { id: 'behind', label: 'From behind (cut)', note: 'A slice through the uterus seen from behind the cow — the classic textbook view of the ligaments and the calf turned over.' },
  { id: 'vagina', label: 'Inside the vagina', note: 'What your hand meets per vaginam: spiral folds (post-cervical) or a normal vagina (pre-cervical).' },
];

const TYPES: Array<{ id: TorsionType; label: string }> = [
  { id: 'none', label: 'Normal' },
  { id: 'pre', label: 'Pre-cervical' },
  { id: 'post', label: 'Post-cervical' },
];

const DIRECTIONS: Array<{ id: Direction; label: string }> = [
  { id: 'clockwise', label: '↻ Clockwise (right)' },
  { id: 'anticlockwise', label: '↺ Anticlockwise (left)' },
];

// ---- one 3D viewer (used once in Explore, twice in Compare) ----------------

function TorsionViewer({
  config,
  view,
  seeThrough,
  labels,
  className,
}: {
  config: TorsionConfig;
  view: TorsionView;
  seeThrough: boolean;
  labels: boolean;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<TorsionScene | null>(null);
  const [ready, setReady] = useState(false);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    let cancelled = false;
    let created: TorsionScene | null = null;
    import('./scene')
      .then(({ createTorsionScene }) => {
        if (cancelled) return;
        try {
          created = createTorsionScene(el);
        } catch {
          setFailed(true);
          return;
        }
        sceneRef.current = created;
        setReady(true);
      })
      .catch(() => setFailed(true));
    return () => {
      cancelled = true;
      created?.dispose();
      sceneRef.current = null;
    };
  }, []);

  useEffect(() => {
    sceneRef.current?.setConfig(config);
  }, [config, ready]);
  useEffect(() => {
    sceneRef.current?.setView(view);
  }, [view, ready]);
  useEffect(() => {
    sceneRef.current?.setSeeThrough(seeThrough);
  }, [seeThrough, ready]);
  useEffect(() => {
    sceneRef.current?.setLabelsVisible(labels);
  }, [labels, ready]);

  return (
    <div className={`lab-stage ${className ?? ''}`} ref={ref}>
      {!ready && !failed && <p className="lab-loading">Loading 3D model…</p>}
      {failed && <p className="lab-loading">3D isn’t available on this device or browser. Try Chrome on a recent phone or computer.</p>}
    </div>
  );
}

// ---- small shared pieces ---------------------------------------------------

function Chips<T extends string | number>({
  label,
  options,
  value,
  onChange,
  disabled,
}: {
  label: string;
  options: Array<{ id: T; label: string }>;
  value: T;
  onChange: (v: T) => void;
  disabled?: boolean;
}) {
  return (
    <div className="tl-field">
      <span className="tl-field-label">{label}</span>
      <div className="lab-chips" role="group" aria-label={label}>
        {options.map((o) => (
          <button key={String(o.id)} type="button" aria-pressed={value === o.id} disabled={disabled} onClick={() => onChange(o.id)}>
            {o.label}
          </button>
        ))}
      </div>
    </div>
  );
}

function ConfigControls({ config, onChange }: { config: TorsionConfig; onChange: (c: TorsionConfig) => void }) {
  const none = config.type === 'none';
  return (
    <>
      <Chips label="Type" options={TYPES} value={config.type} onChange={(type) => onChange({ ...config, type })} />
      <Chips
        label="Direction (seen from behind the cow)"
        options={DIRECTIONS}
        value={config.direction}
        disabled={none}
        onChange={(direction) => onChange({ ...config, direction })}
      />
      <Chips
        label="Degree"
        options={DEGREES.map((d) => ({ id: d, label: `${d}°` }))}
        value={config.degree as (typeof DEGREES)[number]}
        disabled={none}
        onChange={(degree) => onChange({ ...config, degree })}
      />
    </>
  );
}

function VerdictBox({ verdict, compact }: { verdict: Verdict; compact?: boolean }) {
  const icon = { notNeeded: 'ℹ️', possible: '✅', caution: '⚠️', surgery: '❌' }[verdict.level];
  return (
    <div className={`tl-verdict is-${verdict.level}`}>
      <p className="tl-verdict-kicker">Schaffer’s (flank) method</p>
      <p className="tl-verdict-head">
        <span aria-hidden="true">{icon}</span> {verdict.headline}
      </p>
      {!compact && verdict.reasons.length > 0 && (
        <ul>
          {verdict.reasons.map((r) => (
            <li key={r}>{r}</li>
          ))}
        </ul>
      )}
      {!compact && verdict.notes.length > 0 && (
        <ul className="tl-notes">
          {verdict.notes.map((n) => (
            <li key={n}>{n}</li>
          ))}
        </ul>
      )}
    </div>
  );
}

function CaseDetailsForm({ value, onChange }: { value: CaseDetails; onChange: (d: CaseDetails) => void }) {
  const set = <K extends keyof CaseDetails>(k: K, v: CaseDetails[K]) => onChange({ ...value, [k]: v });
  return (
    <details className="lab-help tl-case">
      <summary>Case details (change the verdict)</summary>
      <label className="tl-select">
        <span>Time since straining began</span>
        <select value={value.hours} onChange={(e) => set('hours', e.target.value as CaseDetails['hours'])}>
          <option value="under24">Less than 24 hours</option>
          <option value="24to48">24–48 hours</option>
          <option value="over48">More than 48 hours</option>
        </select>
      </label>
      <label className="tl-select">
        <span>Calf</span>
        <select value={value.calf} onChange={(e) => set('calf', e.target.value as CaseDetails['calf'])}>
          <option value="alive">Alive</option>
          <option value="dead">Dead</option>
          <option value="emphysematous">Dead and swollen (emphysematous)</option>
        </select>
      </label>
      <label className="tl-select">
        <span>Animal’s condition</span>
        <select value={value.animal} onChange={(e) => set('animal', e.target.value as CaseDetails['animal'])}>
          <option value="stable">Standing, alert, stable</option>
          <option value="weak">Weak, toxic, in shock or down</option>
        </select>
      </label>
      <label className="tl-select">
        <span>Signs of uterine rupture / peritonitis</span>
        <select value={value.ruptureSigns ? 'yes' : 'no'} onChange={(e) => set('ruptureSigns', e.target.value === 'yes')}>
          <option value="no">No</option>
          <option value="yes">Yes</option>
        </select>
      </label>
      <label className="tl-select">
        <span>Rolling attempts so far</span>
        <select value={value.attempts} onChange={(e) => set('attempts', e.target.value as CaseDetails['attempts'])}>
          <option value="none">None</option>
          <option value="oneOrTwo">1–2</option>
          <option value="threePlus">3 or more</option>
        </select>
      </label>
    </details>
  );
}

function ViewBar({
  view,
  onView,
  seeThrough,
  onSeeThrough,
  labels,
  onLabels,
}: {
  view: TorsionView;
  onView: (v: TorsionView) => void;
  seeThrough: boolean;
  onSeeThrough: () => void;
  labels: boolean;
  onLabels: () => void;
}) {
  return (
    <div className="tl-viewbar">
      <div className="tl-views" role="group" aria-label="View">
        {VIEWS.map((v) => (
          <button key={v.id} type="button" aria-pressed={view === v.id} onClick={() => onView(v.id)}>
            {v.label}
          </button>
        ))}
      </div>
      <div className="tl-views" role="group" aria-label="Display">
        <button type="button" aria-pressed={seeThrough} onClick={onSeeThrough}>
          See calf
        </button>
        <button type="button" aria-pressed={labels} onClick={onLabels}>
          Labels
        </button>
      </div>
    </div>
  );
}

// ---- the lab ---------------------------------------------------------------

export default function TorsionLab() {
  const [tab, setTab] = useState<'explore' | 'compare'>('explore');
  const [view, setView] = useState<TorsionView>('outside');
  const [seeThrough, setSeeThrough] = useState(true);
  const [labels, setLabels] = useState(true);

  const [config, setConfig] = useState<TorsionConfig>({ type: 'post', direction: 'clockwise', degree: 180 });
  const [details, setDetails] = useState<CaseDetails>(DEFAULT_CASE);
  const [left, setLeft] = useState<TorsionConfig>({ type: 'pre', direction: 'clockwise', degree: 180 });
  const [right, setRight] = useState<TorsionConfig>({ type: 'post', direction: 'clockwise', degree: 180 });

  const viewNote = VIEWS.find((v) => v.id === view)!.note;
  const f = findings(config);

  const viewBar = (
    <ViewBar
      view={view}
      onView={setView}
      seeThrough={seeThrough}
      onSeeThrough={() => setSeeThrough((s) => !s)}
      labels={labels}
      onLabels={() => setLabels((l) => !l)}
    />
  );

  return (
    <div className="ai-lab torsion-lab">
      <div className="lab-tabs tl-tabs" role="tablist" aria-label="Lab mode">
        <button type="button" role="tab" aria-selected={tab === 'explore'} onClick={() => setTab('explore')}>
          <b>1. Explore a torsion</b>
          <span>Twist it and see the findings</span>
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={tab === 'compare'}
          onClick={() => {
            // The vaginal view is where pre- and post-cervical torsions differ most at a glance.
            if (tab !== 'compare') setView('vagina');
            setTab('compare');
          }}
        >
          <b>2. Compare side by side</b>
          <span>Pre vs post, left vs right, mild vs severe</span>
        </button>
      </div>

      {viewBar}
      <p className="tl-viewnote">{viewNote}</p>

      {tab === 'explore' ? (
        <div className="lab-main">
          <div className="lab-stage-wrap">
            <TorsionViewer config={config} view={view} seeThrough={seeThrough} labels={labels} />
            <p className="lab-hint">Drag to rotate · scroll or pinch to zoom · right-drag or two fingers to move</p>
          </div>
          <aside className="lab-panel">
            <ConfigControls config={config} onChange={setConfig} />
            <div className="tl-name">
              <h2>{torsionName(config)}</h2>
              {config.type !== 'none' && <span className="tl-sev">{severityName(config.degree)}</span>}
            </div>
            <dl className="tl-findings">
              <dt>Per vaginam</dt>
              <dd>{f.vaginal}</dd>
              <dt>Per rectum</dt>
              <dd>{f.rectal}</dd>
            </dl>
            <p className="lab-tip">{f.key}</p>
            <VerdictBox verdict={schafferVerdict(config, details)} />
            {config.type !== 'none' && <CaseDetailsForm value={details} onChange={setDetails} />}
          </aside>
        </div>
      ) : (
        <div className="tl-compare">
          {[
            [left, setLeft, 'A'],
            [right, setRight, 'B'],
          ].map(([c, set, tag]) => {
            const cfg = c as TorsionConfig;
            const fc = findings(cfg);
            return (
              <section key={tag as string} className="tl-col">
                <TorsionViewer config={cfg} view={view} seeThrough={seeThrough} labels={labels} className="tl-stage-small" />
                <div className="lab-panel">
                  <ConfigControls config={cfg} onChange={set as (c: TorsionConfig) => void} />
                  <h2>{torsionName(cfg)}</h2>
                  <p className="tl-short">
                    <b>Per vaginam:</b> {fc.vaginal}
                  </p>
                  <p className="tl-short">
                    <b>Per rectum:</b> {fc.rectal}
                  </p>
                  <VerdictBox verdict={schafferVerdict(cfg)} compact />
                </div>
              </section>
            );
          })}
        </div>
      )}
    </div>
  );
}
