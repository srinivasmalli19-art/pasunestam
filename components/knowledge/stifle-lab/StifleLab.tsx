'use client';

import { useEffect, useRef, useState } from 'react';
import type { StifleScene } from './scene';
import { STIFLE_STEPS, type LigamentId, type StifleView } from '@/lib/anatomy/stifle';
import '../ai-lab/ai-lab.css';
import './stifle-lab.css';

const VIEWS: Array<{ id: StifleView; label: string }> = [
  { id: 'medial', label: 'Medial' },
  { id: 'craniomedial', label: 'Cranio-medial' },
  { id: 'cranial', label: 'Cranial' },
  { id: 'lateral', label: 'Lateral' },
];
const LIG_NAME: Record<LigamentId, string> = { medial: 'medial', middle: 'middle', lateral: 'lateral' };

export default function StifleLab() {
  const stageRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<StifleScene | null>(null);
  const [ready, setReady] = useState(false);
  const [failed, setFailed] = useState(false);
  const [i, setI] = useState(0);
  const [labels, setLabels] = useState(true);
  const [answer, setAnswer] = useState<LigamentId | null>(null);
  const [quizPassed, setQuizPassed] = useState(false);
  const step = STIFLE_STEPS[i];
  const solved = answer === 'medial';
  const quizIndex = STIFLE_STEPS.findIndex((s) => s.quiz);

  useEffect(() => {
    const el = stageRef.current;
    if (!el) return;
    let cancelled = false;
    let created: StifleScene | null = null;
    import('./scene')
      .then(({ createStifleScene }) => {
        if (cancelled) return;
        try {
          created = createStifleScene(el, {
            onPick: (id) => {
              setAnswer(id);
              if (id === 'medial') setQuizPassed(true);
            },
          });
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

  useEffect(() => {
    sceneRef.current?.setStep(step);
  }, [step, ready]);
  const goTo = (k: number) => {
    setI(k);
    setAnswer(null);
  };
  useEffect(() => {
    sceneRef.current?.markPick(answer, answer === 'medial');
  }, [answer]);
  useEffect(() => {
    sceneRef.current?.setLabels(labels);
  }, [labels, ready]);

  const canNext = i < STIFLE_STEPS.length - 1 && (!step.quiz || quizPassed);

  return (
    <div className="ai-lab stifle-lab">
      <ol className="st-steps" aria-label="Steps">
        {STIFLE_STEPS.map((s, k) => (
          <li key={s.id}>
            <button
              type="button"
              aria-current={k === i ? 'step' : undefined}
              className={k < i ? 'st-done' : ''}
              onClick={() => goTo(k)}
              disabled={k > quizIndex && !quizPassed}
            >
              <span>{k + 1}</span>
              {s.title}
            </button>
          </li>
        ))}
      </ol>

      <div className="lab-main">
        <div className="lab-stage-wrap">
          <div className="lab-stage st-stage" ref={stageRef}>
            {!ready && !failed && <p className="lab-loading">Building the stifle…</p>}
            {failed && <p className="lab-loading">3D isn’t available on this device or browser. Try Chrome on a recent phone or computer.</p>}
            {step.quiz && ready && (
              <div className={`st-quiz${answer ? (solved ? ' st-quiz-ok' : ' st-quiz-no') : ''}`} aria-live="polite">
                {!answer && 'Tap a ligament in the 3D view'}
                {answer && solved && '✓ Correct — the MEDIAL patellar ligament.'}
                {answer && !solved && `✗ That is the ${LIG_NAME[answer]} ligament. Cutting it would not free the patella — try again.`}
              </div>
            )}
          </div>
          <div className="lab-view-bar" aria-label="View">
            {VIEWS.map((vw) => (
              <button key={vw.id} type="button" onClick={() => sceneRef.current?.setView(vw.id)}>
                {vw.label}
              </button>
            ))}
            <button type="button" aria-pressed={labels} onClick={() => setLabels((l) => !l)}>
              Labels
            </button>
          </div>
          <p className="lab-hint">Right stifle. Drag to turn, pinch or scroll to zoom. Bones are modelled in code (simplified); ligaments are drawn thicker so they can be seen.</p>
        </div>

        <aside className="lab-panel">
          <p className="lab-kicker">
            Step {i + 1} of {STIFLE_STEPS.length}
          </p>
          <h2>{step.title}</h2>
          <p>{step.text}</p>
          {step.points && (
            <ul className="st-points">
              {step.points.map((p) => (
                <li key={p}>{p}</li>
              ))}
            </ul>
          )}
          {step.diagram && <LimbDiagram />}
          {step.quiz && solved && (
            <p className="st-explain">
              The medial ligament with the parapatellar fibrocartilage is what hooks over the medial trochlear ridge. Cutting it removes the hook. The middle and lateral ligaments
              stay intact and keep holding the patella, so the stifle still works.
            </p>
          )}
          <div className="st-nav">
            <button type="button" className="button-sm st-back" onClick={() => goTo(Math.max(0, i - 1))} disabled={i === 0}>
              ← Back
            </button>
            <button type="button" className="button-primary button-sm" onClick={() => goTo(i + 1)} disabled={!canNext}>
              {step.quiz && !quizPassed ? 'Answer to continue' : 'Next →'}
            </button>
          </div>
          {i === STIFLE_STEPS.length - 1 && (
            <button type="button" className="st-again" onClick={() => goTo(0)}>
              ↻ Start again
            </button>
          )}
        </aside>
      </div>
    </div>
  );
}

/** Side view of a cow's hind leg: normal standing vs upward fixation of the patella. */
function LimbDiagram() {
  const leg = (pts: Array<[number, number]>) => pts.map((p) => p.join(',')).join(' ');
  const normal: Array<[number, number]> = [[70, 30], [96, 92], [66, 150], [72, 208], [80, 230]];
  const locked: Array<[number, number]> = [[70, 30], [84, 96], [44, 146], [22, 196], [30, 226]];
  const draw = (pts: Array<[number, number]>, toeDrag: boolean) => (
    <>
      <path d="M10 22 Q 60 4 130 20 L 130 40 Q 70 46 18 52 Z" className="st-body" />
      <polyline points={leg(pts)} className="st-bone" />
      {pts.slice(0, 4).map(([x, y], k) => (
        <circle key={k} cx={x} cy={y} r={k === 1 ? 6 : 4.5} className={k === 1 ? 'st-joint st-joint-key' : 'st-joint'} />
      ))}
      {toeDrag ? <path d={`M${pts[3][0]} ${pts[3][1]} l 4 30 l 18 2 z`} className="st-hoof" /> : <path d={`M${pts[4][0] - 10} ${pts[4][1] + 4} l 20 0 l -4 -14 l -12 0 z`} className="st-hoof" />}
      <line x1="0" y1="234" x2="140" y2="234" className="st-ground" />
    </>
  );
  return (
    <figure className="st-diagram">
      <div>
        <svg viewBox="0 0 140 240" role="img" aria-label="Normal hind leg">
          {draw(normal, false)}
        </svg>
        <figcaption>Normal: stifle (orange) bends; foot under the body</figcaption>
      </div>
      <div>
        <svg viewBox="0 0 140 240" role="img" aria-label="Hind leg locked by upward fixation of the patella">
          {draw(locked, true)}
        </svg>
        <figcaption>Upward fixation: leg locked straight, stretched back, toe dragging, fetlock flexed</figcaption>
      </div>
    </figure>
  );
}
