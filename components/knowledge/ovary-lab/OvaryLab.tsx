'use client';

import { useEffect, useRef, useState } from 'react';
import type { OvaryScene } from './scene';
import { CASES, DIFFERENTIALS, caseFor, quizOrder, type OvSpecies } from '@/lib/ovary/cases';
import '../ai-lab/ai-lab.css';
import '../estrous-lab/estrous-lab.css';
import './ovary-lab.css';

export default function OvaryLab() {
  const stageRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<OvaryScene | null>(null);
  const [ready, setReady] = useState(false);
  const [failed, setFailed] = useState(false);
  const [mode, setMode] = useState<'learn' | 'quiz'>('learn');
  const [species, setSpecies] = useState<OvSpecies>('cow');
  const [caseId, setCaseId] = useState(CASES[0].id);
  const [cut, setCut] = useState(false);
  const [labels, setLabels] = useState(true);
  // quiz
  const [order, setOrder] = useState<string[]>(() => quizOrder(7));
  const [qi, setQi] = useState(0);
  const [answer, setAnswer] = useState<string | null>(null);
  const [score, setScore] = useState(0);

  useEffect(() => {
    const el = stageRef.current;
    if (!el) return;
    let cancelled = false;
    let created: OvaryScene | null = null;
    import('./scene')
      .then(({ createOvaryScene }) => {
        if (cancelled) return;
        try {
          created = createOvaryScene(el);
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

  const shownId = mode === 'quiz' ? order[qi] : caseId;
  const base = CASES.find((c) => c.id === shownId)!;
  const c = caseFor(base, species);
  const hide = mode === 'quiz' && !answer;

  useEffect(() => {
    sceneRef.current?.show(caseFor(CASES.find((x) => x.id === shownId)!, species), hide);
  }, [shownId, species, hide, ready]);
  useEffect(() => {
    sceneRef.current?.setCut(cut);
  }, [cut, ready, shownId, species, hide]);
  useEffect(() => {
    sceneRef.current?.setLabels(labels);
  }, [labels, ready]);

  const pick = (id: string) => {
    if (answer) return;
    setAnswer(id);
    if (id === shownId) setScore((s) => s + 1);
  };
  const nextQ = () => {
    setAnswer(null);
    setCut(false);
    if (qi + 1 >= order.length) {
      setOrder(quizOrder(Math.floor(Math.random() * 1e6) + 1));
      setQi(0);
      setScore(0);
    } else setQi(qi + 1);
  };
  const giveText = c.give < 0.08 ? 'Firm / hard' : c.give < 0.2 ? 'Firm-rubbery' : c.give < 0.3 ? 'Soft, spongy' : 'Soft, fluctuating';

  return (
    <div className="ai-lab ovary-lab">
      <div className="ov-top">
        <div className="lab-tabs el-mode" role="tablist" aria-label="Mode">
          <button type="button" role="tab" aria-selected={mode === 'learn'} onClick={() => setMode('learn')}>
            Learn
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={mode === 'quiz'}
            onClick={() => {
              setMode('quiz');
              setAnswer(null);
              setCut(false);
            }}
          >
            Quiz: diagnose it
          </button>
        </div>
        <div className="ov-chips" role="group" aria-label="Species">
          <button type="button" aria-pressed={species === 'cow'} onClick={() => setSpecies('cow')}>
            Cow
          </button>
          <button type="button" aria-pressed={species === 'buffalo'} onClick={() => setSpecies('buffalo')}>
            Buffalo
          </button>
        </div>
      </div>

      {mode === 'learn' && (
        <div className="ov-cases" role="group" aria-label="Condition">
          {CASES.map((x) => (
            <button key={x.id} type="button" aria-pressed={caseId === x.id} className={x.normal ? '' : 'ov-abn'} onClick={() => setCaseId(x.id)}>
              {x.short}
            </button>
          ))}
        </div>
      )}

      <div className="lab-main">
        <div className="lab-stage-wrap">
          <div className="lab-stage ov-stage" ref={stageRef}>
            {!ready && !failed && <p className="lab-loading">Loading 3D model…</p>}
            {failed && <p className="lab-loading">3D isn’t available on this device or browser. Try Chrome on a recent phone or computer.</p>}
          </div>
          <div className="lab-view-bar ov-tools" aria-label="Tools">
            <button type="button" className="ov-press" onClick={() => sceneRef.current?.press()}>
              👆 Press with finger
            </button>
            <button type="button" aria-pressed={cut} onClick={() => setCut((x) => !x)}>
              ✂ Cut in half
            </button>
            <button type="button" aria-pressed={labels} onClick={() => setLabels((x) => !x)}>
              Labels
            </button>
          </div>
          <p className="lab-hint">
            Drag to turn the ovary. “Press” shows how much the structure gives under your finger; “Cut” shows the wall and what is inside. Ruler in mm. Typical sizes — individual
            animals vary; confirm with ultrasound or progesterone where you can.
          </p>
        </div>

        {mode === 'learn' ? (
          <aside className="lab-panel">
            <p className="lab-kicker">
              {species === 'cow' ? 'Cow' : 'Buffalo'} · {c.normal ? 'normal structure' : 'abnormal'}
            </p>
            <h2>{c.name}</h2>
            <div className="ov-feel">
              <span>Feels:</span>
              <div className="ov-meter" aria-label={giveText}>
                <i style={{ left: `${Math.min(96, (1 - c.give / 0.45) * 100)}%` }} />
              </div>
              <div className="ov-meter-ends">
                <small>Soft, fluctuating</small>
                <small>Firm</small>
              </div>
            </div>
            <h3 className="ov-h3">How it feels</h3>
            <ul className="ov-list">
              {c.feel.map((f) => (
                <li key={f}>{f}</li>
              ))}
              <li>
                <i>{c.like}</i>
              </li>
            </ul>
            <h3 className="ov-h3">What it means</h3>
            <p className="ov-p">{c.meaning}</p>
            <h3 className="ov-h3">Field tips</h3>
            <ul className="ov-list">
              {c.tips.map((t) => (
                <li key={t}>{t}</li>
              ))}
            </ul>
            <div className="em-note ov-tx">
              <b>Treatment</b>
              <ul>
                {c.treatment.map((t) => (
                  <li key={t}>{t}</li>
                ))}
              </ul>
            </div>
            {species === 'buffalo' && c.buffalo && (
              <p className="ov-buffalo">
                <b>Buffalo:</b> {c.buffalo}
              </p>
            )}
          </aside>
        ) : (
          <aside className="lab-panel">
            <p className="lab-kicker">
              Question {qi + 1} of {order.length} · Score {score}
            </p>
            <h2>What is on this ovary?</h2>
            {!answer && <p className="ov-p">Press it, cut it in half and look at the size. Then choose:</p>}
            <div className="ov-options">
              {CASES.map((x) => (
                <button
                  key={x.id}
                  type="button"
                  className={answer ? (x.id === shownId ? 'ov-right' : x.id === answer ? 'ov-wrong' : '') : ''}
                  onClick={() => pick(x.id)}
                  disabled={!!answer}
                >
                  {x.short}
                </button>
              ))}
            </div>
            {answer && (
              <div className={`ov-result ${answer === shownId ? 'ov-result-ok' : 'ov-result-no'}`}>
                <b>{answer === shownId ? '✓ Correct!' : `✗ It is a ${base.short.toLowerCase()}.`}</b>
                <p>{base.feel[0]}</p>
                <p>{base.meaning}</p>
              </div>
            )}
            {answer && (
              <button type="button" className="button-primary button-sm" onClick={nextQ}>
                {qi + 1 >= order.length ? `Finished — score ${score}/${order.length}. Start again` : 'Next ovary →'}
              </button>
            )}
          </aside>
        )}
      </div>

      <section className="el-species" aria-labelledby="ov-diff-title">
        <h2 id="ov-diff-title">How to tell them apart</h2>
        <div className="el-table-scroll">
          <table>
            <thead>
              <tr>
                <th>This</th>
                <th>or this?</th>
                <th>How to tell</th>
              </tr>
            </thead>
            <tbody>
              {DIFFERENTIALS.map((d) => (
                <tr key={d.a + d.b}>
                  <th scope="row">{d.a}</th>
                  <td>{d.b}</td>
                  <td>{d.how}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="el-species" aria-labelledby="ov-all-title">
        <h2 id="ov-all-title">All structures at a glance (cow)</h2>
        <div className="el-table-scroll">
          <table>
            <thead>
              <tr>
                <th>Structure</th>
                <th>Size</th>
                <th>Feel</th>
                <th>Means</th>
              </tr>
            </thead>
            <tbody>
              {CASES.map((x) => (
                <tr key={x.id}>
                  <th scope="row">{x.short}</th>
                  <td>{x.structures[0] ? `~${x.structures[0].sizeMm} mm` : `ovary ~${x.ovaryMm[0]} mm`}</td>
                  <td>{x.like}</td>
                  <td>{x.meaning.split('.')[0]}.</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
