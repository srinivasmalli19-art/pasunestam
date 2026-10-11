'use client';

import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import type { CameraPreset, LabScene } from './scene';
import { PARTS, type PartId } from '@/lib/ai-lab/anatomy';
import { PROCEDURE } from '@/lib/ai-lab/procedure';
import {
  START_POSE,
  deposit as scoreDeposit,
  displayPose,
  move,
  startPractice,
  type DepositResult,
  type PracticeState,
  type Zone,
} from '@/lib/ai-lab/practice';
import './ai-lab.css';

type Mode = 'anatomy' | 'guided' | 'practice';

const MODES: Array<{ id: Mode; label: string; sub: string }> = [
  { id: 'anatomy', label: '1. Anatomy', sub: 'Explore the tract' },
  { id: 'guided', label: '2. Guided procedure', sub: 'Watch each step' },
  { id: 'practice', label: '3. Practice', sub: 'Do it yourself' },
];

const PART_ORDER: PartId[] = [
  'vulva',
  'vestibule',
  'urethralOpening',
  'diverticulum',
  'vagina',
  'fornix',
  'cervix',
  'uterineBody',
  'horns',
  'ovaries',
  'rectum',
  'bladder',
];

const ZONE_NAME: Record<Zone, string> = {
  outside: 'Outside',
  vestibule: 'Vestibule',
  urethra: 'Urethral opening ✗',
  vagina: 'Vagina',
  cervix: 'Cervix',
  uterineBody: 'Uterine body ✓',
  horn: 'Uterine horn',
};

const STEP = { depth: 0.5, angle: 0.5 };

export default function AiLab() {
  const stageRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<LabScene | null>(null);
  const [ready, setReady] = useState(false);
  const [failed, setFailed] = useState(false);

  const [mode, setMode] = useState<Mode>('anatomy');
  const [cutaway, setCutaway] = useState(false);
  const [seeThrough, setSeeThrough] = useState(false);
  const [labels, setLabels] = useState(true);

  const [selected, setSelected] = useState<PartId | null>(null);
  const [step, setStep] = useState(0);
  const [replay, setReplay] = useState(0);

  const [practice, setPractice] = useState<PracticeState>(() => startPractice());
  const [result, setResult] = useState<DepositResult | null>(null);
  const [showTarget, setShowTarget] = useState(true);

  // ---- create / destroy the 3D scene (three.js loads only on this page) ----
  useEffect(() => {
    const el = stageRef.current;
    if (!el) return;
    let cancelled = false;
    let created: LabScene | null = null;
    import('./scene')
      .then(({ createLabScene }) => {
        if (cancelled) return;
        try {
          created = createLabScene(el);
        } catch {
          setFailed(true);
          return;
        }
        sceneRef.current = created;
        created.onPick((part) => {
          setSelected(part);
        });
        setReady(true);
      })
      .catch(() => setFailed(true));
    return () => {
      cancelled = true;
      created?.dispose();
      sceneRef.current = null;
    };
  }, []);

  // ---- view toggles --------------------------------------------------------
  useEffect(() => {
    sceneRef.current?.setCutaway(cutaway);
  }, [cutaway, ready]);
  useEffect(() => {
    sceneRef.current?.setSeeThrough(seeThrough);
  }, [seeThrough, ready]);
  useEffect(() => {
    sceneRef.current?.setLabelsVisible(labels);
  }, [labels, ready]);

  // ---- anatomy mode --------------------------------------------------------
  useEffect(() => {
    const s = sceneRef.current;
    if (!s || mode !== 'anatomy') return;
    s.setGunVisible(false);
    s.setHandVisible(false);
    s.setTargetVisible(false);
    s.setDepositVisible(false);
    s.setHighlight(selected ? [selected] : []);
  }, [mode, selected, ready]);

  // ---- guided mode: animate the gun for the current step ----------------
  useEffect(() => {
    const s = sceneRef.current;
    if (!s || mode !== 'guided') return;
    const st = PROCEDURE[step];
    s.setHighlight(st.highlight);
    s.focus(st.camera);
    s.setHandVisible(st.hand);
    s.setTargetVisible(Boolean(st.target));
    s.setDepositVisible(false);
    s.setTipStatus(st.target ? 'success' : 'neutral');
    s.setGunVisible(st.gun.visible);
    s.setGunPose(st.gun.from);

    let raf = 0;
    const start = performance.now() + 450;
    const DURATION = 1800;
    const tick = (now: number) => {
      const t = Math.min(1, Math.max(0, (now - start) / DURATION));
      const e = t * t * (3 - 2 * t);
      const lerp = (a: number, b: number) => a + (b - a) * e;
      s.setGunPose({
        depth: lerp(st.gun.from.depth, st.gun.to.depth),
        pitchDeg: lerp(st.gun.from.pitchDeg, st.gun.to.pitchDeg),
        yawDeg: lerp(st.gun.from.yawDeg, st.gun.to.yawDeg),
      });
      if (st.deposit && now - start > 500) s.setDepositVisible(true);
      if (t < 1 || (st.deposit && now - start < 600)) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [mode, step, replay, ready]);

  // ---- practice mode: mirror the attempt onto the 3D gun -----------------
  useEffect(() => {
    const s = sceneRef.current;
    if (!s || mode !== 'practice') return;
    s.setGunVisible(true);
    s.setHandVisible(false);
    s.setGunPose(displayPose(practice));
    s.setTipStatus(practice.feedback.status);
    s.setDepositVisible(Boolean(result));
    const zone = practice.assessment.zone;
    s.setHighlight(zone === 'urethra' ? ['urethralOpening', 'diverticulum'] : []);
  }, [mode, practice, result, ready]);
  useEffect(() => {
    if (mode === 'practice') sceneRef.current?.setTargetVisible(showTarget);
  }, [mode, showTarget, ready]);

  // ---- switching modes ----------------------------------------------------
  function chooseMode(next: Mode) {
    if (next === mode) return;
    setMode(next);
    setResult(null);
    if (next === 'anatomy') {
      setSeeThrough(false);
      setCutaway(false);
      setLabels(true);
      sceneRef.current?.focus('overview');
    } else if (next === 'guided') {
      setStep(0);
      setSeeThrough(true);
      setCutaway(false);
      setLabels(false);
    } else {
      setPractice(startPractice());
      setSeeThrough(true);
      setCutaway(false);
      setLabels(false);
      sceneRef.current?.focus('overview');
    }
  }

  // ---- practice controls -------------------------------------------------
  const nudge = useCallback(
    (dDepth: number, dPitch: number, dYaw: number) => {
      if (result) return;
      setPractice((p) =>
        move(p, { depth: p.pose.depth + dDepth, pitchDeg: p.pose.pitchDeg + dPitch, yawDeg: p.pose.yawDeg + dYaw })
      );
    },
    [result]
  );

  function doDeposit() {
    if (practice.pose.depth <= 0.5 || result) return;
    setResult(scoreDeposit(practice));
  }

  function resetPractice() {
    setResult(null);
    setPractice(startPractice(START_POSE));
    sceneRef.current?.focus('overview');
  }

  useEffect(() => {
    if (mode !== 'practice') return;
    const onKey = (e: KeyboardEvent) => {
      const map: Record<string, [number, number, number]> = {
        ArrowUp: [0, STEP.angle, 0],
        ArrowDown: [0, -STEP.angle, 0],
        ArrowLeft: [0, 0, -STEP.angle],
        ArrowRight: [0, 0, STEP.angle],
        w: [STEP.depth, 0, 0],
        W: [STEP.depth, 0, 0],
        s: [-STEP.depth, 0, 0],
        S: [-STEP.depth, 0, 0],
      };
      const m = map[e.key];
      if (!m) return;
      const tag = (e.target as HTMLElement | null)?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;
      e.preventDefault();
      nudge(...m);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [mode, nudge]);

  const focus = (p: CameraPreset) => sceneRef.current?.focus(p);

  return (
    <div className="ai-lab">
      <div className="lab-tabs" role="tablist" aria-label="Lab mode">
        {MODES.map((m) => (
          <button key={m.id} type="button" role="tab" aria-selected={mode === m.id} onClick={() => chooseMode(m.id)}>
            <b>{m.label}</b>
            <span>{m.sub}</span>
          </button>
        ))}
      </div>

      <div className="lab-main">
        <div className="lab-stage-wrap">
          <div className="lab-stage" ref={stageRef}>
            {!ready && !failed && <p className="lab-loading">Loading 3D model…</p>}
            {failed && (
              <p className="lab-loading">
                3D isn’t available on this device or browser. Try Chrome on a recent phone or computer.
              </p>
            )}
          </div>
          <div className="lab-view-bar" aria-label="View">
            <button type="button" onClick={() => focus('overview')}>
              Reset view
            </button>
            <button type="button" aria-pressed={cutaway} onClick={() => setCutaway((v) => !v)}>
              Cut-away
            </button>
            <button type="button" aria-pressed={seeThrough} onClick={() => setSeeThrough((v) => !v)}>
              See-through
            </button>
            <button type="button" aria-pressed={labels} onClick={() => setLabels((v) => !v)}>
              Labels
            </button>
          </div>
          <p className="lab-hint">Drag to rotate · scroll or pinch to zoom · right-drag or two fingers to move</p>
        </div>

        <aside className="lab-panel">
          {mode === 'anatomy' && (
            <AnatomyPanel selected={selected} onSelect={setSelected} onFocus={focus} />
          )}
          {mode === 'guided' && (
            <GuidedPanel step={step} onStep={setStep} onReplay={() => setReplay((r) => r + 1)} />
          )}
          {mode === 'practice' && (
            <PracticePanel
              practice={practice}
              result={result}
              nudge={nudge}
              onDeposit={doDeposit}
              onReset={resetPractice}
              showTarget={showTarget}
              onToggleTarget={() => setShowTarget((v) => !v)}
              onFocus={focus}
            />
          )}
        </aside>
      </div>
    </div>
  );
}

// ---- panels ---------------------------------------------------------------

function AnatomyPanel({
  selected,
  onSelect,
  onFocus,
}: {
  selected: PartId | null;
  onSelect: (p: PartId) => void;
  onFocus: (p: CameraPreset) => void;
}) {
  const info = selected ? PARTS[selected] : null;
  return (
    <>
      <h2>Reproductive tract of the cow</h2>
      <div className="lab-info" aria-live="polite">
        {info ? (
          <>
            <h3>{info.name}</h3>
            <p>{info.note}</p>
          </>
        ) : (
          <p className="muted">Tap any part of the model, or a name below, to see what it is and why it matters for AI.</p>
        )}
      </div>
      <div className="lab-chips">
        {PART_ORDER.map((p) => (
          <button key={p} type="button" aria-pressed={selected === p} onClick={() => onSelect(p)}>
            {PARTS[p].name.replace(' — deposition site', '')}
          </button>
        ))}
      </div>
      <p className="lab-sub">Zoom to</p>
      <div className="lab-row">
        <button type="button" className="button-ghost button-sm" onClick={() => onFocus('vulva')}>
          Vulva &amp; vestibule
        </button>
        <button type="button" className="button-ghost button-sm" onClick={() => onFocus('cervix')}>
          Cervix
        </button>
        <button type="button" className="button-ghost button-sm" onClick={() => onFocus('uterus')}>
          Uterus
        </button>
      </div>
      <p className="lab-note">Tip: turn on <b>Cut-away</b> to see inside the cervix — the narrow canal and its rings.</p>
    </>
  );
}

function GuidedPanel({ step, onStep, onReplay }: { step: number; onStep: (n: number) => void; onReplay: () => void }) {
  const st = PROCEDURE[step];
  const last = PROCEDURE.length - 1;
  return (
    <>
      <p className="lab-kicker">
        Step {step + 1} of {PROCEDURE.length}
      </p>
      <h2>{st.title}</h2>
      <p>{st.text}</p>
      {st.tip && <p className="lab-tip">{st.tip}</p>}
      <div className="lab-row">
        <button type="button" className="button-ghost button-sm" disabled={step === 0} onClick={() => onStep(step - 1)}>
          ← Back
        </button>
        <button type="button" className="button-ghost button-sm" onClick={onReplay}>
          ↻ Replay
        </button>
        <button type="button" className="button-primary button-sm" disabled={step === last} onClick={() => onStep(step + 1)}>
          Next →
        </button>
      </div>
      <ol className="lab-steps">
        {PROCEDURE.map((s, i) => (
          <li key={s.title}>
            <button type="button" aria-current={i === step ? 'step' : undefined} onClick={() => onStep(i)}>
              {s.title}
            </button>
          </li>
        ))}
      </ol>
    </>
  );
}

function PracticePanel({
  practice,
  result,
  nudge,
  onDeposit,
  onReset,
  showTarget,
  onToggleTarget,
  onFocus,
}: {
  practice: PracticeState;
  result: DepositResult | null;
  nudge: (dDepth: number, dPitch: number, dYaw: number) => void;
  onDeposit: () => void;
  onReset: () => void;
  showTarget: boolean;
  onToggleTarget: () => void;
  onFocus: (p: CameraPreset) => void;
}) {
  const { pose, assessment, feedback } = practice;
  const inside = pose.depth > 0.5;

  if (result) {
    return (
      <div className={`lab-result is-${result.verdict}`}>
        <p className="lab-kicker">Your attempt</p>
        <p className="lab-score">
          <b>{result.score}</b>
          <span>/ 100</span>
        </p>
        <h2>{result.verdict === 'excellent' ? 'Excellent' : result.verdict === 'acceptable' ? 'Acceptable' : 'Needs practice'}</h2>
        <p>
          <b>Deposited:</b> {result.site}
        </p>
        <ul>
          {result.comments.map((c) => (
            <li key={c}>{c}</li>
          ))}
        </ul>
        <button type="button" className="button-primary button-sm" onClick={onReset}>
          Try again
        </button>
      </div>
    );
  }

  return (
    <>
      <h2>Practice: pass the gun to the uterine body</h2>
      <p className={`lab-feedback is-${feedback.status}`} aria-live="polite">
        {feedback.message}
      </p>
      <dl className="lab-readout">
        <div>
          <dt>Depth</dt>
          <dd>{Math.max(0, pose.depth).toFixed(1)} cm</dd>
        </div>
        <div>
          <dt>Angle</dt>
          <dd>
            {pose.pitchDeg >= 0 ? '↑' : '↓'} {Math.abs(pose.pitchDeg).toFixed(1)}°
          </dd>
        </div>
        <div>
          <dt>Side</dt>
          <dd>{pose.yawDeg === 0 ? 'centre' : `${Math.abs(pose.yawDeg).toFixed(1)}° ${pose.yawDeg > 0 ? 'R' : 'L'}`}</dd>
        </div>
        <div>
          <dt>Tip in</dt>
          <dd>{ZONE_NAME[assessment.zone]}</dd>
        </div>
        <div>
          <dt>Cervix rings</dt>
          <dd>{assessment.ringsPassed} / 4</dd>
        </div>
      </dl>

      <div className="lab-pad">
        <div className="lab-angle" aria-label="Gun angle">
          <span />
          <HoldButton label="Angle up" onFire={() => nudge(0, STEP.angle, 0)}>
            ▲
          </HoldButton>
          <span />
          <HoldButton label="Tip left (cow's left)" onFire={() => nudge(0, 0, -STEP.angle)}>
            ◀
          </HoldButton>
          <span className="lab-angle-mid">angle</span>
          <HoldButton label="Tip right (cow's right)" onFire={() => nudge(0, 0, STEP.angle)}>
            ▶
          </HoldButton>
          <span />
          <HoldButton label="Angle down" onFire={() => nudge(0, -STEP.angle, 0)}>
            ▼
          </HoldButton>
          <span />
        </div>
        <div className="lab-push" aria-label="Push or pull the gun">
          <HoldButton label="Push in" className="is-push" onFire={() => nudge(STEP.depth, 0, 0)}>
            Push in
          </HoldButton>
          <HoldButton label="Pull back" onFire={() => nudge(-STEP.depth, 0, 0)}>
            Pull back
          </HoldButton>
        </div>
      </div>

      <div className="lab-row">
        <button type="button" className="button-primary button-sm" disabled={!inside} onClick={onDeposit}>
          Deposit semen here
        </button>
        <button type="button" className="button-ghost button-sm" onClick={onReset}>
          Start again
        </button>
      </div>
      <div className="lab-row">
        <button type="button" className="button-ghost button-sm" aria-pressed={showTarget} onClick={onToggleTarget}>
          {showTarget ? 'Hide' : 'Show'} target zone
        </button>
        <button type="button" className="button-ghost button-sm" onClick={() => onFocus('vulva')}>
          Zoom: vulva
        </button>
        <button type="button" className="button-ghost button-sm" onClick={() => onFocus('cervix')}>
          Zoom: cervix
        </button>
      </div>
      <details className="lab-help">
        <summary>How to do it</summary>
        <ol>
          <li>Raise the angle to about 20–25° before pushing in, so the tip rides over the urethral opening.</li>
          <li>Once past the urethral opening (about 12–15 cm in), bring the angle down to about 4–5° and keep the side at centre.</li>
          <li>Line up with the cervix and push gently through all 4 rings.</li>
          <li>Stop 1–2 cm past the cervix (the green zone) and deposit.</li>
        </ol>
        <p className="muted small">Keyboard: ↑ ↓ angle, ← → side, W / S push and pull. Hold a button to keep moving.</p>
      </details>
    </>
  );
}

/** A button that fires once on press, then repeats while held (mouse or finger). */
function HoldButton({
  onFire,
  label,
  className,
  children,
}: {
  onFire: () => void;
  label: string;
  className?: string;
  children: ReactNode;
}) {
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const fireRef = useRef(onFire);
  useEffect(() => {
    fireRef.current = onFire;
  }, [onFire]);
  const stop = () => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = null;
  };
  useEffect(() => stop, []);
  const start = (e: React.PointerEvent) => {
    e.preventDefault();
    stop();
    fireRef.current();
    const repeat = (delay: number) => {
      timer.current = setTimeout(() => {
        fireRef.current();
        repeat(60);
      }, delay);
    };
    repeat(320);
  };
  return (
    <button
      type="button"
      aria-label={label}
      className={`lab-hold ${className ?? ''}`}
      onPointerDown={start}
      onPointerUp={stop}
      onPointerLeave={stop}
      onPointerCancel={stop}
      onContextMenu={(e) => e.preventDefault()}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          fireRef.current();
        }
      }}
    >
      {children}
    </button>
  );
}

