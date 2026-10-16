'use client';

import { useEffect, useRef, useState } from 'react';
import type { RumenMode, RumenScene, RumenView } from './scene';
import { JOURNEY, ORGANS, PROBLEMS, type OrganId, type ProblemId } from '@/lib/rumen/organs';
import '../ai-lab/ai-lab.css';
import '../estrous-lab/estrous-lab.css';
import './rumen-lab.css';

const TABS: Array<{ id: RumenMode; label: string; sub: string }> = [
  { id: 'anatomy', label: 'Anatomy', sub: 'Tap any organ' },
  { id: 'inside', label: 'Inside', sub: 'Cut-open compartments' },
  { id: 'journey', label: 'Food journey', sub: 'Step by step' },
  { id: 'problems', label: 'Problems', sub: 'Bloat, hardware, LDA/RDA' },
];
const VIEW_BUTTONS: Array<[RumenView, string]> = [
  ['left', 'Left side'],
  ['right', 'Right side'],
  ['below', 'From below'],
  ['whole', 'Whole cow'],
];
const COMPARTMENTS: OrganId[] = ['rumen', 'reticulum', 'omasum', 'abomasum'];

export default function RumenLab() {
  const stageRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<RumenScene | null>(null);
  const [ready, setReady] = useState(false);
  const [failed, setFailed] = useState(false);
  const [progress, setProgress] = useState<[number, string]>([0, '']);
  const [mode, setMode] = useState<RumenMode>('anatomy');
  const [organ, setOrgan] = useState<OrganId | null>(null);
  const [step, setStep] = useState(0);
  const [problem, setProblem] = useState<ProblemId>('frothy');
  const [skeleton, setSkeleton] = useState(true);
  const [labels, setLabels] = useState(true);

  useEffect(() => {
    const el = stageRef.current;
    if (!el) return;
    let cancelled = false;
    let created: RumenScene | null = null;
    import('./scene')
      .then(({ createRumenScene }) => {
        if (cancelled) return;
        try {
          created = createRumenScene(el, { onPick: (id) => setOrgan(id), onProgress: (k, what) => setProgress([k, what]) });
          sceneRef.current = created;
          setReady(true);
        } catch {
          setFailed(true);
        }
      })
      .catch(() => setFailed(true));
    return () => {
      cancelled = true;
      created?.dispose();
      sceneRef.current = null;
    };
  }, []);

  // mode first, then what is shown in it
  useEffect(() => {
    const sc = sceneRef.current;
    if (!sc) return;
    sc.setMode(mode);
    if (mode === 'journey') {
      const s = JOURNEY[step];
      sc.setJourney(s.id, s.focus);
      sc.setView(s.view);
    } else if (mode === 'problems') {
      const p = PROBLEMS.find((x) => x.id === problem)!;
      sc.setProblem(problem);
      sc.setView(p.view);
    } else if (mode === 'anatomy') sc.setSelected(organ);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, step, problem, ready]);
  useEffect(() => {
    sceneRef.current?.setSkeleton(skeleton);
  }, [skeleton, ready]);
  useEffect(() => {
    sceneRef.current?.setLabels(labels);
  }, [labels, ready]);

  const showView = (id: RumenView) => sceneRef.current?.setView(id);
  const choose = (id: OrganId) => {
    setOrgan(id);
    sceneRef.current?.setSelected(id);
  };
  const building = progress[0] < 1;
  const info = organ ? ORGANS[organ] : null;
  const js = JOURNEY[step];
  const pb = PROBLEMS.find((x) => x.id === problem)!;

  return (
    <div className="ai-lab rumen-lab">
      <div className="lab-tabs rl-tabs" role="tablist" aria-label="Mode">
        {TABS.map((t) => (
          <button key={t.id} type="button" role="tab" aria-selected={mode === t.id} onClick={() => setMode(t.id)}>
            <b>{t.label}</b>
            <span>{t.sub}</span>
          </button>
        ))}
      </div>

      {mode === 'problems' && (
        <div className="rl-chips" role="group" aria-label="Problem">
          {PROBLEMS.map((p) => (
            <button key={p.id} type="button" aria-pressed={problem === p.id} onClick={() => setProblem(p.id)}>
              {p.name.replace(/ \(.*\)$/, '')}
            </button>
          ))}
        </div>
      )}
      {(mode === 'anatomy' || mode === 'inside') && (
        <div className="rl-chips" role="group" aria-label="Organ">
          {(mode === 'inside' ? COMPARTMENTS : (Object.keys(ORGANS) as OrganId[]).filter((k) => k !== 'diaphragm')).map((id) => (
            <button key={id} type="button" aria-pressed={organ === id} onClick={() => choose(id)}>
              {ORGANS[id].name.replace(/ \(.*\)$/, '')}
            </button>
          ))}
        </div>
      )}

      <div className="lab-main">
        <div className="lab-stage-wrap">
          <div className="lab-stage rl-stage" ref={stageRef}>
            {!ready && !failed && <p className="lab-loading">Loading 3D model…</p>}
            {ready && building && (
              <p className="rl-building">
                Building organs… {Math.round(progress[0] * 100)}% {progress[1] && `(${progress[1]})`}
              </p>
            )}
            {failed && <p className="lab-loading">3D isn’t available on this device or browser. Try Chrome on a recent phone or computer.</p>}
          </div>
          <div className="lab-view-bar" aria-label="View">
            {mode !== 'inside' &&
              VIEW_BUTTONS.map(([id, label]) => (
                <button key={id} type="button" onClick={() => showView(id)}>
                  {label}
                </button>
              ))}
            {mode !== 'inside' && (
              <button type="button" aria-pressed={skeleton} onClick={() => setSkeleton((x) => !x)}>
                Skeleton
              </button>
            )}
            <button type="button" aria-pressed={labels} onClick={() => setLabels((x) => !x)}>
              Labels
            </button>
          </div>
          <p className="lab-hint">
            {mode === 'inside'
              ? 'The four compartments taken out and cut open, seen from the left. Drag to turn them and look at each lining.'
              : 'Drag to turn, pinch or scroll to zoom. Head points left when seen from the left side. Organs are modelled in code — shapes and sizes are close to real but simplified.'}
          </p>
        </div>

        <aside className="lab-panel">
          {(mode === 'anatomy' || mode === 'inside') &&
            (info ? (
              <>
                <p className="lab-kicker">{mode === 'inside' ? 'Inside' : 'Anatomy'}</p>
                <h2>{info.name}</h2>
                <p className="rl-where">
                  <b>Where:</b> {info.where}
                </p>
                <ul className="rl-list">
                  {info.facts.map((f) => (
                    <li key={f}>{f}</li>
                  ))}
                </ul>
                {info.clinical && (
                  <div className="em-note">
                    <b>Clinical</b>
                    <ul className="rl-list">
                      {info.clinical.map((f) => (
                        <li key={f}>{f}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </>
            ) : (
              <>
                <h2>{mode === 'inside' ? 'Four compartments, opened' : 'Tap an organ'}</h2>
                <p className="rl-where">
                  {mode === 'inside'
                    ? 'Rumen (papillae, gas cap, fibre mat, liquid), reticulum (honeycomb), omasum (leaves) and abomasum (spiral folds). Tap one to read about it.'
                    : 'The rumen fills the left half of the abdomen; seen from the left you see mainly rumen and spleen. Turn to the right side for the omasum, abomasum, liver and intestines.'}
                </p>
                <table className="rl-cap">
                  <tbody>
                    <tr>
                      <th>Rumen</th>
                      <td>100–150 L · ~80%</td>
                    </tr>
                    <tr>
                      <th>Reticulum</th>
                      <td>5–10 L · ~5%</td>
                    </tr>
                    <tr>
                      <th>Omasum</th>
                      <td>10–15 L · ~7–8%</td>
                    </tr>
                    <tr>
                      <th>Abomasum</th>
                      <td>10–20 L · ~7–8%</td>
                    </tr>
                  </tbody>
                </table>
              </>
            ))}

          {mode === 'journey' && (
            <>
              <p className="lab-kicker">
                Step {step + 1} of {JOURNEY.length}
              </p>
              <h2>{js.title}</h2>
              <p className="rl-where">{js.text}</p>
              {js.points.length > 0 && (
                <ul className="rl-list">
                  {js.points.map((p) => (
                    <li key={p}>{p}</li>
                  ))}
                </ul>
              )}
              <div className="st-nav rl-nav">
                <button type="button" className="button-sm rl-back" onClick={() => setStep((k) => Math.max(0, k - 1))} disabled={step === 0}>
                  ← Back
                </button>
                <button type="button" className="button-primary button-sm" onClick={() => setStep((k) => Math.min(JOURNEY.length - 1, k + 1))} disabled={step === JOURNEY.length - 1}>
                  Next →
                </button>
              </div>
              <ol className="rl-steps">
                {JOURNEY.map((j, i) => (
                  <li key={j.id}>
                    <button type="button" aria-current={i === step ? 'step' : undefined} onClick={() => setStep(i)}>
                      {j.title}
                    </button>
                  </li>
                ))}
              </ol>
            </>
          )}

          {mode === 'problems' && (
            <>
              <p className="lab-kicker">Problem</p>
              <h2>{pb.name}</h2>
              <p className="rl-where">{pb.what}</p>
              <h3 className="rl-h3">Signs</h3>
              <ul className="rl-list">
                {pb.signs.map((x) => (
                  <li key={x}>{x}</li>
                ))}
              </ul>
              <h3 className="rl-h3">Diagnosis</h3>
              <ul className="rl-list">
                {pb.diagnosis.map((x) => (
                  <li key={x}>{x}</li>
                ))}
              </ul>
              <div className="em-note">
                <b>Treatment</b>
                <ul className="rl-list">
                  {pb.treatment.map((x) => (
                    <li key={x}>{x}</li>
                  ))}
                </ul>
              </div>
              <p className="rl-where">
                <b>Prevention:</b> {pb.prevention.join(' ')}
              </p>
            </>
          )}
        </aside>
      </div>
    </div>
  );
}
