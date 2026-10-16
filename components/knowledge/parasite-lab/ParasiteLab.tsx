'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import type { ParasiteLabScene, ParasiteMode } from './scene';
import { HABITAT, PARASITES, PARASITE_ORDER, type ParasiteId } from '@/lib/parasites/cycles';
import { GROUPS, GROUP_ORDER, GROUP_TABLE, ORGANS, ORGAN_ORDER, entriesFor, type GroupId, type OrganId, type Species } from '@/lib/parasites/organs';
import { cycleFrameAt, cycleLocate, cycleMovieDuration, cyclePhasesOf, cycleSceneDuration, cycleSceneStart, type CyclePhase } from '@/lib/parasites/movie';
import '../ai-lab/ai-lab.css';
import '../torsion-lab/torsion-lab.css';
import '../estrous-lab/estrous-lab.css';
import '../egg-lab/egg-lab.css';
import './parasite-lab.css';

const MODES: Array<{ id: ParasiteMode; label: string; short: string }> = [
  { id: 'movie', label: '▶ Watch the cycle', short: '▶ Watch' },
  { id: 'explore', label: 'Explore stages', short: 'Explore' },
  { id: 'break', label: 'Break the cycle', short: 'Break' },
  { id: 'quiz', label: 'Test yourself', short: 'Quiz' },
  { id: 'organs', label: 'Where they live', short: 'Organs' },
];
const SPEEDS = [0.5, 0.75, 1, 1.5] as const;
const PHASE_LABEL: Record<CyclePhase, string> = {
  look: 'Look',
  move: 'Moves on',
};
const FAMACHA = [
  { n: 1, c: '#b71c1c', t: 'Red — OK' },
  { n: 2, c: '#e05a5a', t: 'Red-pink — OK' },
  { n: 3, c: '#f0a3a3', t: 'Pink — check again' },
  { n: 4, c: '#f6cfcf', t: 'Pale — treat' },
  { n: 5, c: '#fbeeee', t: 'White — treat now' },
];

export default function ParasiteLab() {
  const stageRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<ParasiteLabScene | null>(null);
  const [ready, setReady] = useState(false);
  const [failed, setFailed] = useState(false);
  const [building, setBuilding] = useState(0);
  const [pid, setPid] = useState<ParasiteId>('fluke');
  const [mode, setMode] = useState<ParasiteMode>('movie');
  const [stage, setStage] = useState<string | null>(null);
  const [ctrl, setCtrl] = useState<string | null>(null);
  const [labels, setLabels] = useState(true);
  const [xray, setXray] = useState(false);
  const [qi, setQi] = useState(0);
  const [picked, setPicked] = useState<number | null>(null);
  const [score, setScore] = useState(0);
  const [species, setSpecies] = useState<Species>('cattle');
  const [organ, setOrgan] = useState<OrganId | null>(null);
  const [group, setGroup] = useState<GroupId | null>(null);
  const organRef = useRef<(id: OrganId | null) => void>(() => {});

  const tRef = useRef(0);
  const [movieT, setMovieT] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [speed, setSpeed] = useState<(typeof SPEEDS)[number]>(0.75);

  const p = PARASITES[pid];
  const total = cycleMovieDuration(p);

  // the scene calls back on taps; keep what it needs in refs updated by handlers
  const pickRef = useRef<(id: string | null) => void>(() => {});

  useEffect(() => {
    const el = stageRef.current;
    if (!el) return;
    let cancelled = false;
    let created: ParasiteLabScene | null = null;
    import('./scene')
      .then(({ createParasiteScene }) => {
        if (cancelled) return;
        try {
          created = createParasiteScene(el, {
            onPick: (id) => pickRef.current(id),
            onProgress: (k) => setBuilding(k),
            onOrgan: (id) => organRef.current(id),
          });
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
    sceneRef.current?.setParasite(pid);
  }, [pid, ready]);
  useEffect(() => {
    sceneRef.current?.setMode(mode);
  }, [mode, ready]);
  useEffect(() => {
    sceneRef.current?.setLabels(labels);
  }, [labels, ready]);
  useEffect(() => {
    sceneRef.current?.setXray(xray);
  }, [xray, ready]);
  useEffect(() => {
    if (mode === 'explore') sceneRef.current?.select(stage);
  }, [stage, mode, pid, ready]);
  useEffect(() => {
    const c = p.controls.find((x) => x.id === ctrl);
    sceneRef.current?.setBlocked(mode === 'break' && c ? c.targets : [], c?.name ?? '');
  }, [ctrl, mode, p, ready]);

  // ---- movie ----
  const drawAt = useCallback(
    (t: number) => {
      const sc = sceneRef.current;
      if (!sc) return;
      const { index, local } = cycleLocate(p, t);
      sc.setFrame(cycleFrameAt(p.scenes[index], local));
    },
    [p],
  );
  useEffect(() => {
    if (mode !== 'movie') {
      sceneRef.current?.setFrame(null);
      return;
    }
    drawAt(tRef.current);
  }, [mode, ready, drawAt]);
  useEffect(() => {
    if (mode !== 'movie' || !playing) return;
    let raf = 0;
    let last = performance.now();
    let lastUi = 0;
    const tick = (now: number) => {
      const dt = Math.min(0.1, (now - last) / 1000);
      last = now;
      tRef.current = Math.min(total, tRef.current + dt * speed);
      drawAt(tRef.current);
      if (now - lastUi > 120 || tRef.current >= total) {
        lastUi = now;
        setMovieT(tRef.current);
      }
      if (tRef.current >= total) {
        setPlaying(false);
        return;
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [mode, playing, speed, total, drawAt]);
  const seek = (t: number) => {
    tRef.current = Math.max(0, Math.min(total, t));
    setMovieT(tRef.current);
    drawAt(tRef.current);
  };
  const at = cycleLocate(p, movieT);
  const sc = p.scenes[at.index];
  const frame = cycleFrameAt(sc, at.local);
  const goScene = (i: number) => seek(cycleSceneStart(p, Math.max(0, Math.min(p.scenes.length - 1, i))) + 0.01);
  const ended = movieT >= total - 0.01;
  const phases = cyclePhasesOf(sc);
  const phaseIdx = phases.findIndex((x) => x.phase === frame.phase);
  const focusStage = sc.stage ? p.stages.find((s) => s.id === sc.stage) : undefined;

  // ---- handlers ----
  function chooseParasite(id: ParasiteId) {
    if (id === pid) return;
    setPlaying(false);
    tRef.current = 0;
    setMovieT(0);
    setStage(null);
    setCtrl(null);
    setQi(0);
    setPicked(null);
    setScore(0);
    setPid(id);
  }
  function chooseMode(m: ParasiteMode) {
    if (m === mode) return;
    setPlaying(false);
    if (m === 'explore') setStage(mode === 'movie' && sc.stage ? sc.stage : null);
    if (m === 'break' && !ctrl) setCtrl(p.controls[0].id);
    setMode(m);
  }
  useEffect(() => {
    organRef.current = (id) => setOrgan(id);
  }, []);
  useEffect(() => {
    sceneRef.current?.setOrganMap({ species, organ, group });
  }, [species, organ, group, mode, ready]);
  useEffect(() => {
    pickRef.current = (id) => {
      if (mode === 'explore') setStage(id);
      if (mode === 'break' && id) {
        const c = p.controls.find((x) => x.targets.includes(id));
        if (c) setCtrl(c.id);
      }
    };
  }, [mode, p]);

  const selStage = stage ? p.stages.find((s) => s.id === stage) : undefined;
  const control = p.controls.find((c) => c.id === ctrl);
  const q = p.quiz[qi];
  const quizDone = qi >= p.quiz.length;

  const stageCard = (s: (typeof p.stages)[number]) => (
    <div className="pl-stagecard">
      <p className="pl-tags">
        <span className="pl-hab" style={{ ['--c' as string]: HABITAT[s.habitat].color }}>
          {HABITAT[s.habitat].label}
        </span>
        {s.infective && <span className="pl-inf">Infective stage</span>}
      </p>
      <dl className="pl-facts">
        <dt>Where</dt>
        <dd>{s.where}</dd>
        <dt>Size</dt>
        <dd>{s.size}</dd>
        <dt>Time</dt>
        <dd>{s.time}</dd>
      </dl>
      <p>{s.what}</p>
      {s.field && (
        <p className="em-note">
          <b>In the field:</b> {s.field}
        </p>
      )}
    </div>
  );

  return (
    <div className="ai-lab estrous-lab egg-lab parasite-lab">
      {mode === 'organs' ? (
        <div className="egl-parts pl-parasites pl-species" role="tablist" aria-label="Animal">
          {(
            [
              ['cattle', 'Cattle & buffalo', 'See-through crossbred cow'],
              ['sheep', 'Sheep & goats', 'See-through Nellore-type sheep'],
            ] as const
          ).map(([id, name, sub]) => (
            <button
              key={id}
              type="button"
              role="tab"
              aria-selected={species === id}
              onClick={() => {
                setSpecies(id);
                setOrgan(null);
              }}
            >
              <b>{name}</b>
              <span>{sub}</span>
            </button>
          ))}
        </div>
      ) : (
        <div className="egl-parts pl-parasites" role="tablist" aria-label="Parasite">
          {PARASITE_ORDER.map((id) => {
            const x = PARASITES[id];
            return (
              <button key={id} type="button" role="tab" aria-selected={pid === id} onClick={() => chooseParasite(id)}>
                <b>{x.name}</b>
                <span>
                  <i>{x.latin}</i> · {x.hostLabel.toLowerCase()}
                </span>
              </button>
            );
          })}
        </div>
      )}

      <div className="el-controls">
        <div className="lab-tabs el-mode pl-modes" role="tablist" aria-label="Mode">
          {MODES.map((m) => (
            <button key={m.id} type="button" role="tab" aria-selected={mode === m.id} onClick={() => chooseMode(m.id)}>
              <span className="pl-long">{m.label}</span>
              <span className="pl-short">{m.short}</span>
            </button>
          ))}
        </div>
      </div>

      {mode === 'movie' && (
        <div className="el-movie-bar">
          <div className="el-movie-buttons">
            <button type="button" className="button-sm em-step" onClick={() => goScene(at.local > 2 ? at.index : at.index - 1)} aria-label="Previous step">
              ⏮<span className="em-btn-text"> Back</span>
            </button>
            <button
              type="button"
              className="button-primary button-sm el-play"
              onClick={() => {
                if (ended) seek(0);
                setPlaying((x) => !x);
              }}
            >
              {playing ? '❚❚ Pause' : ended ? '↻ Watch again' : movieT > 0 ? '▶ Continue' : '▶ Play'}
            </button>
            <button type="button" className="button-sm em-step" onClick={() => goScene(at.index + 1)} disabled={at.index >= p.scenes.length - 1} aria-label="Next step">
              <span className="em-btn-text">Next </span>⏭
            </button>
            <label className="em-speed">
              Speed
              <select value={speed} onChange={(ev) => setSpeed(Number(ev.target.value) as (typeof SPEEDS)[number])}>
                {SPEEDS.map((s) => (
                  <option key={s} value={s}>
                    {s === 1 ? 'Normal' : `${s}×`}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <div
            className="em-progress"
            role="slider"
            tabIndex={0}
            aria-label="Movie position"
            aria-valuemin={0}
            aria-valuemax={Math.round(total)}
            aria-valuenow={Math.round(movieT)}
            onPointerDown={(ev) => {
              const r = ev.currentTarget.getBoundingClientRect();
              seek(((ev.clientX - r.left) / r.width) * total);
            }}
            onKeyDown={(ev) => {
              if (ev.key === 'ArrowRight') goScene(at.index + 1);
              if (ev.key === 'ArrowLeft') goScene(at.index - 1);
            }}
          >
            {p.scenes.map((s, i) => (
              <span key={s.id} className={`em-seg${i < at.index ? ' em-seg-done' : ''}${i === at.index ? ' em-seg-now' : ''}`} style={{ flexGrow: cycleSceneDuration(s) }}>
                {i === at.index && (
                  <i
                    style={{
                      width: `${(at.local / cycleSceneDuration(s)) * 100}%`,
                    }}
                  />
                )}
              </span>
            ))}
          </div>
          <span className="el-day">
            Step {at.index + 1}/{p.scenes.length}
          </span>
        </div>
      )}

      <div className="lab-main">
        <div className="lab-stage-wrap">
          <div className="lab-stage pl-canvas" ref={stageRef}>
            {!ready && !failed && <p className="lab-loading">Loading 3D model…</p>}
            {failed && <p className="lab-loading">3D isn’t available on this device or browser. Try Chrome on a recent phone or computer.</p>}
            {ready && building > 0 && building < 1 && <p className="pl-building">Building the 3D scene… {Math.round(building * 100)}%</p>}
            {mode === 'movie' && ready && (
              <div className="em-subtitle em-subtitle-over" aria-live="polite">
                <span className={`em-chip pl-chip-${frame.phase}`}>
                  {frame.phase === 'move' ? PHASE_LABEL.move : focusStage ? `${focusStage.n}. ${focusStage.short}` : 'Overview'}
                </span>
                {frame.caption}
              </div>
            )}
            {mode === 'movie' && ready && movieT === 0 && !playing && (
              <button
                type="button"
                className="em-bigplay"
                onClick={() => {
                  setPlaying(true);
                  if (window.innerWidth < 760) document.querySelector('.el-movie-bar')?.scrollIntoView({ block: 'start', behavior: 'smooth' });
                }}
              >
                ▶ Play: life cycle of {p.latin}
                <small>
                  {p.scenes.length} steps · about {Math.round(total / 0.75 / 60)} min at slow speed · pause any time
                </small>
              </button>
            )}
          </div>
          {mode === 'movie' && ready && (
            <div className="em-subtitle em-subtitle-below">
              <span className={`em-chip pl-chip-${frame.phase}`}>
                {frame.phase === 'move' ? PHASE_LABEL.move : focusStage ? `${focusStage.n}. ${focusStage.short}` : 'Overview'}
              </span>
              {frame.caption}
            </div>
          )}
          <div className="lab-view-bar" aria-label="View">
            {mode === 'organs' ? (
              <button type="button" onClick={() => setOrgan(null)}>
                Whole animal
              </button>
            ) : (
              <>
                <button type="button" onClick={() => (mode === 'explore' ? setStage(null) : sceneRef.current?.overview())}>
                  Whole cycle
                </button>
                <button type="button" aria-pressed={xray} onClick={() => setXray((x) => !x)}>
                  See inside the {p.hostLabel.split(' ').pop()!.toLowerCase()}
                </button>
              </>
            )}
            <button type="button" aria-pressed={labels} onClick={() => setLabels((x) => !x)}>
              Labels
            </button>
          </div>
          <p className="lab-hint">
            {mode === 'organs'
              ? 'Each dot is an organ; the number is how many parasites are listed there for this animal. Tap a dot or an organ name; pick a group to colour the organs it lives in.'
              : 'Each bubble is one stage, magnified (the number under the name is the magnification). Dashed lines point to where that stage is found. The arrows show the way round the cycle. Organisms and organs are modelled in code: close to real, simplified for teaching.'}
          </p>
        </div>

        <aside className="lab-panel em-panel pl-panel">
          {mode === 'movie' && (
            <>
              <p className="lab-kicker">
                {p.latin} · step {at.index + 1} of {p.scenes.length}
              </p>
              <h2>{sc.title}</h2>
              <ol className="em-steps">
                {phases.map((ph, i) => (
                  <li key={ph.phase} className={i < phaseIdx ? 'em-done' : i === phaseIdx ? 'em-now' : ''}>
                    <span className={`em-chip pl-chip-${ph.phase}`}>{PHASE_LABEL[ph.phase]}</span>
                    <p>{ph.phase === 'look' ? sc.text : sc.move?.text}</p>
                  </li>
                ))}
              </ol>
              {sc.note && (
                <p className="em-note">
                  <b>In the field:</b> {sc.note}
                </p>
              )}
              {focusStage && (
                <details className="pl-more">
                  <summary>About this stage</summary>
                  {stageCard(focusStage)}
                </details>
              )}
              <details className="em-chapters">
                <summary>All steps ({p.scenes.length})</summary>
                <ol>
                  {p.scenes.map((s, i) => (
                    <li key={s.id}>
                      <button type="button" aria-current={i === at.index ? 'step' : undefined} onClick={() => goScene(i)}>
                        <span>{i + 1}.</span> {s.title}
                      </button>
                    </li>
                  ))}
                </ol>
              </details>
            </>
          )}

          {mode === 'explore' && (
            <>
              <p className="lab-kicker">{selStage ? `Stage ${selStage.n} of ${p.stages.length}` : 'Tap a bubble or a stage'}</p>
              <h2>{selStage ? selStage.name : `${p.name} — ${p.latin}`}</h2>
              {selStage ? (
                stageCard(selStage)
              ) : (
                <>
                  <p>{p.hosts}</p>
                  <p className="em-note">{p.needs}</p>
                </>
              )}
              <div className="rl-chips pl-stagechips" role="group" aria-label="Stages">
                {p.stages.map((s) => (
                  <button key={s.id} type="button" aria-pressed={stage === s.id} onClick={() => setStage(s.id)}>
                    {s.n}. {s.short}
                  </button>
                ))}
              </div>
              {selStage && (
                <div className="pl-nav">
                  <button type="button" className="button-sm" onClick={() => setStage(p.stages[(selStage.n - 2 + p.stages.length) % p.stages.length].id)}>
                    ← Previous stage
                  </button>
                  <button type="button" className="button-sm button-primary" onClick={() => setStage(p.stages[selStage.n % p.stages.length].id)}>
                    Next stage →
                  </button>
                </div>
              )}
            </>
          )}

          {mode === 'break' && (
            <>
              <p className="lab-kicker">Break the cycle</p>
              <h2>{control ? control.name : 'Choose a measure'}</h2>
              <div className="pl-controls" role="group" aria-label="Control measures">
                {p.controls.map((c) => (
                  <button key={c.id} type="button" aria-pressed={ctrl === c.id} onClick={() => setCtrl(c.id)}>
                    {c.name}
                  </button>
                ))}
              </div>
              {control && (
                <>
                  <p className="pl-stops">
                    <b>Stops:</b>{' '}
                    {control.targets
                      .map((t) => p.stages.find((s) => s.id === t)!)
                      .map((s) => `${s.n}. ${s.short}`)
                      .join(' · ')}
                  </p>
                  <p>{control.how}</p>
                  {control.note && (
                    <p className="em-note">
                      <b>Note:</b> {control.note}
                    </p>
                  )}
                </>
              )}
              <p className="muted pl-small">
                The stopped stages turn red in 3D and the arrows after them go grey. No single measure is enough — combine them. Drug doses: follow the label and your department.
              </p>
            </>
          )}

          {mode === 'quiz' && (
            <>
              <p className="lab-kicker">
                Test yourself · {p.name} · {quizDone ? 'done' : `question ${qi + 1} of ${p.quiz.length}`}
              </p>
              {quizDone ? (
                <>
                  <h2>
                    You scored {score} / {p.quiz.length}
                  </h2>
                  <p>{score === p.quiz.length ? 'Excellent — you know this cycle well.' : 'Watch the cycle again and try once more.'}</p>
                  <button
                    type="button"
                    className="button-primary button-sm"
                    onClick={() => {
                      setQi(0);
                      setPicked(null);
                      setScore(0);
                    }}
                  >
                    ↻ Try again
                  </button>
                </>
              ) : (
                <>
                  <h2>{q.q}</h2>
                  <div className="pl-quiz" role="group" aria-label="Answers">
                    {q.options.map((o, i) => (
                      <button
                        key={o}
                        type="button"
                        disabled={picked !== null}
                        className={picked === null ? '' : i === q.answer ? 'pl-right' : i === picked ? 'pl-wrong' : ''}
                        onClick={() => {
                          setPicked(i);
                          if (i === q.answer) setScore((s) => s + 1);
                        }}
                      >
                        {o}
                      </button>
                    ))}
                  </div>
                  {picked !== null && (
                    <>
                      <p className={`pl-verdict ${picked === q.answer ? 'pl-ok' : 'pl-no'}`}>
                        {picked === q.answer ? 'Correct.' : 'Not quite.'} {q.why}
                      </p>
                      <button
                        type="button"
                        className="button-primary button-sm"
                        onClick={() => {
                          setQi((x) => x + 1);
                          setPicked(null);
                        }}
                      >
                        {qi + 1 < p.quiz.length ? 'Next question →' : 'See my score'}
                      </button>
                    </>
                  )}
                </>
              )}
            </>
          )}
          {mode === 'organs' && (
            <>
              <p className="lab-kicker">Where they live · {species === 'cattle' ? 'cattle & buffalo' : 'sheep & goats'}</p>
              <h2>{organ ? ORGANS[organ].name : 'Tap an organ'}</h2>
              <div className="pl-groups" role="group" aria-label="Show one group">
                <button type="button" aria-pressed={!group} onClick={() => setGroup(null)}>
                  All groups
                </button>
                {GROUP_ORDER.map((g) => (
                  <button key={g} type="button" aria-pressed={group === g} style={{ ['--g' as string]: GROUPS[g].color }} onClick={() => setGroup(group === g ? null : g)}>
                    <i aria-hidden="true" />
                    {GROUPS[g].name}
                  </button>
                ))}
              </div>
              {organ ? (
                (() => {
                  const list = entriesFor(organ, species, group);
                  if (!list.length)
                    return (
                      <p className="muted">
                        None listed here
                        {group ? ` for ${GROUPS[group].name.toLowerCase()}` : ''} in {species === 'cattle' ? 'cattle and buffalo' : 'sheep and goats'}.
                      </p>
                    );
                  return (
                    <ul className="pl-entries">
                      {list.map((e) => (
                        <li key={e.name} style={{ ['--g' as string]: GROUPS[e.group].color }}>
                          <p className="pl-entry-head">
                            <b>{e.name}</b>
                            <span className="pl-gchip">{GROUPS[e.group].name.replace(/s$/, '')}</span>
                            {e.zoonotic && <span className="pl-zoo">Zoonotic</span>}
                          </p>
                          <p className="pl-entry-stage">
                            {e.stage}
                            {e.cystOf && <> · adult tapeworm: {e.cystOf}</>}
                          </p>
                          <p>{e.note}</p>
                        </li>
                      ))}
                    </ul>
                  );
                })()
              ) : (
                <p>Pick a group to see which organs it lives in, or tap an organ to see every parasite found there.</p>
              )}
              <div className="rl-chips pl-stagechips" role="group" aria-label="Organs">
                {ORGAN_ORDER.map((o) => {
                  const n = entriesFor(o, species, group).length;
                  return (
                    <button key={o} type="button" aria-pressed={organ === o} disabled={!n && organ !== o} onClick={() => setOrgan(o)}>
                      {ORGANS[o].short} {n > 0 && <small>{n}</small>}
                    </button>
                  );
                })}
              </div>
            </>
          )}
        </aside>
      </div>

      {mode === 'organs' && (
        <section className="el-species pl-compare pl-groups-table" aria-labelledby="pl-groups-title">
          <h2 id="pl-groups-title">How the groups differ</h2>
          <div className="el-table-scroll">
            <table>
              <thead>
                <tr>
                  <th />
                  {GROUP_ORDER.map((g) => (
                    <th key={g} scope="col" style={{ ['--g' as string]: GROUPS[g].color }} className={group === g ? 'pl-col-now' : ''}>
                      <span className="pl-gdot" aria-hidden="true" />
                      {GROUPS[g].name}
                      <br />
                      <i>{GROUPS[g].common}</i>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {GROUP_TABLE.map((row) => (
                  <tr key={row.label}>
                    <th scope="row">{row.label}</th>
                    {GROUP_ORDER.map((g) => (
                      <td key={g} className={group === g ? 'pl-col-now' : ''}>
                        {row.values[g]}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <h3 className="pl-where-title">Which group lives where</h3>
          <div className="el-table-scroll">
            <table className="pl-where">
              <thead>
                <tr>
                  <th>Organ</th>
                  {GROUP_ORDER.map((g) => (
                    <th key={g} scope="col" style={{ ['--g' as string]: GROUPS[g].color }}>
                      <span className="pl-gdot" aria-hidden="true" />
                      {GROUPS[g].name}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {ORGAN_ORDER.map((o) => (
                  <tr key={o} className={organ === o ? 'pl-row-now' : ''}>
                    <th scope="row">
                      <button type="button" className="pl-linkbtn" onClick={() => setOrgan(o)}>
                        {ORGANS[o].short}
                      </button>
                    </th>
                    {GROUP_ORDER.map((g) => (
                      <td key={g}>
                        {entriesFor(o, species, g)
                          .map((e) => e.name.split(' (')[0])
                          .join(', ') || '—'}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="muted pl-small">
            For {species === 'cattle' ? 'cattle and buffalo' : 'sheep and goats'} (switch the animal at the top). Common parasites in India; not a complete list. Drug names without
            doses — follow the label.
          </p>
        </section>
      )}

      {mode !== 'organs' && (
        <section className="el-species pl-disease" aria-labelledby="pl-disease-title">
          <h2 id="pl-disease-title">
            {p.disease} <span className="muted">· {p.group}</span>
          </h2>
          <p>
            <b>Hosts:</b> {p.hosts} {p.needs}
          </p>
          <div className="pl-cols">
            <div>
              <h3>Signs</h3>
              <ul>
                {p.signs.map((s) => (
                  <li key={s}>{s}</li>
                ))}
              </ul>
            </div>
            <div>
              <h3>Diagnosis</h3>
              <ul>
                {p.diagnosis.map((s) => (
                  <li key={s}>{s}</li>
                ))}
              </ul>
            </div>
            <div>
              <h3>Treatment</h3>
              <ul>
                {p.treatment.map((s) => (
                  <li key={s}>{s}</li>
                ))}
              </ul>
              <h3>Season</h3>
              <p>{p.season}</p>
            </div>
          </div>
          {pid === 'haemonchus' && (
            <div className="pl-famacha" aria-label="FAMACHA eyelid colour guide">
              <h3>FAMACHA: lower eyelid colour</h3>
              <ol>
                {FAMACHA.map((f) => (
                  <li key={f.n}>
                    <i style={{ background: f.c }} aria-hidden="true" />
                    <b>{f.n}</b>
                    <span>{f.t}</span>
                  </li>
                ))}
              </ol>
              <p className="muted pl-small">Colours are a guide only — use the real FAMACHA card in good daylight.</p>
            </div>
          )}
        </section>
      )}

      {mode !== 'organs' && (
        <section className="el-species pl-compare" aria-labelledby="pl-compare-title">
          <h2 id="pl-compare-title">The three cycles side by side</h2>
          <div className="el-table-scroll">
            <table>
              <thead>
                <tr>
                  <th />
                  {PARASITE_ORDER.map((id) => (
                    <th key={id} scope="col" className={id === pid ? 'pl-col-now' : ''}>
                      {PARASITES[id].name}
                      <br />
                      <i>{PARASITES[id].latin}</i>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {(
                  [
                    ['Type', (id: ParasiteId) => PARASITES[id].group],
                    ['How animals get it', (id: ParasiteId) => PARASITES[id].facts.infected],
                    ['Other host / vector', (id: ParasiteId) => PARASITES[id].facts.middle],
                    ['Where it lives', (id: ParasiteId) => PARASITES[id].facts.site],
                    ['Prepatent / incubation', (id: ParasiteId) => PARASITES[id].facts.prepatent],
                    ['Key signs', (id: ParasiteId) => PARASITES[id].facts.key],
                    ['Diagnosis', (id: ParasiteId) => PARASITES[id].facts.diagnosis],
                    ['Main drugs', (id: ParasiteId) => PARASITES[id].facts.drugs],
                    ['Control', (id: ParasiteId) => PARASITES[id].facts.control],
                  ] as const
                ).map(([label, f]) => (
                  <tr key={label}>
                    <th scope="row">{label}</th>
                    {PARASITE_ORDER.map((id) => (
                      <td key={id} className={id === pid ? 'pl-col-now' : ''}>
                        {f(id)}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="muted pl-small">Drug names are given without doses on purpose: follow the product label, withdrawal periods and your department’s advice.</p>
        </section>
      )}
    </div>
  );
}
