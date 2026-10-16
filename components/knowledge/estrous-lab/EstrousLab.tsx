'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import type { EstrousScene, EstrousView } from './scene';
import HormoneChart from './HormoneChart';
import { embryoSvg, embryoStageName } from './embryo-svg';
import {
  CYCLE_DAYS,
  OVULATION_DAY,
  PHASE_INFO,
  PREGNANT_DAYS,
  SPECIES_TIMING,
  corpusLuteum,
  dominantFollicle,
  embryo,
  phaseOn,
  story,
  type EmbryoState,
  type Outcome,
} from '@/lib/estrous/cycle';
import {
  MOVIES,
  TOKEN_NAMES,
  frameAt,
  locate,
  movieDuration,
  phasesOf,
  sceneDuration,
  sceneStart,
  type MoviePhase,
} from '@/lib/estrous/movie';
import { HORMONE_COLORS } from '@/lib/estrous/colors';
import '../ai-lab/ai-lab.css';
import '../torsion-lab/torsion-lab.css';
import './estrous-lab.css';

const VIEWS: Array<{ id: EstrousView; label: string }> = [
  { id: 'overview', label: 'Whole picture' },
  { id: 'ovary', label: 'Ovary close-up' },
  { id: 'oviduct', label: 'Oviduct' },
  { id: 'uterus', label: 'Uterus' },
];

const JUMPS: Record<Outcome, Array<{ label: string; day: number; view: EstrousView }>> = {
  notPregnant: [
    { label: 'Heat', day: 0.3, view: 'overview' },
    { label: 'Ovulation', day: 1.2, view: 'ovary' },
    { label: 'CL mature', day: 9, view: 'ovary' },
    { label: 'PGF2α / luteolysis', day: 17.2, view: 'uterus' },
    { label: 'Next heat', day: 20.8, view: 'overview' },
  ],
  pregnant: [
    { label: 'Fertilisation', day: 1.7, view: 'oviduct' },
    { label: 'Enters uterus', day: 5, view: 'oviduct' },
    { label: 'Blastocyst', day: 7.5, view: 'uterus' },
    { label: 'Maternal recognition', day: 16, view: 'uterus' },
    { label: 'Attachment', day: 21, view: 'uterus' },
    { label: 'Placentomes', day: 35, view: 'uterus' },
  ],
};

const PHASE_LABEL: Record<MoviePhase, string> = { release: 'Released', travel: 'Travels', arrive: 'Acts', result: 'Result' };
const SPEEDS = [0.5, 0.75, 1, 1.5] as const;
/** The first scenes (heat → ovulation) are the same in both movies. */
const SHARED_SCENES = 6;
const tokenColor = (k: string) => (k === 'sperm' ? '#5b6472' : HORMONE_COLORS[k as keyof typeof HORMONE_COLORS]);
const DARK_TOKENS = new Set(['fsh', 'lh', 'pgf2a', 'progesterone']);

const fmtDay = (d: number) => {
  const whole = Math.floor(d + 1e-6);
  const hours = Math.round((d - whole) * 24);
  return hours === 0 ? `Day ${whole}` : `Day ${whole}, +${hours} h`;
};

const SITE_NAME: Record<string, string> = {
  hypothalamus: 'Hypothalamus (brain)',
  pituitary: 'Anterior pituitary (brain)',
  follicle: 'Mature follicle (ovary)',
  ovary: 'Ovary',
  cl: 'Corpus luteum (ovary)',
  uterus: 'Uterus (endometrium)',
  cervix: 'Cervix, vagina and uterus',
  oviduct: 'Oviduct (ampulla)',
  embryo: 'Embryo',
};

export default function EstrousLab() {
  const stageRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<EstrousScene | null>(null);
  const [ready, setReady] = useState(false);
  const [failed, setFailed] = useState(false);

  const [mode, setMode] = useState<'movie' | 'explore'>('movie');
  const [outcome, setOutcome] = useState<Outcome>('notPregnant');
  const [day, setDay] = useState(0.3);
  const [playing, setPlaying] = useState(false);
  const [view, setView] = useState<EstrousView>('overview');
  const [labels, setLabels] = useState(true);
  const maxDay = outcome === 'pregnant' ? PREGNANT_DAYS : CYCLE_DAYS;

  // movie clock (seconds); kept in a ref so the 3D updates every frame without re-rendering React
  const tRef = useRef(0);
  const [movieT, setMovieT] = useState(0);
  const [moviePlaying, setMoviePlaying] = useState(false);
  const [speed, setSpeed] = useState<(typeof SPEEDS)[number]>(1);
  const total = movieDuration(outcome);

  useEffect(() => {
    const el = stageRef.current;
    if (!el) return;
    let cancelled = false;
    let created: EstrousScene | null = null;
    import('./scene')
      .then(({ createEstrousScene }) => {
        if (cancelled) return;
        try {
          created = createEstrousScene(el);
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

  // ---- movie --------------------------------------------------------------
  const drawMovieAt = useCallback(
    (t: number) => {
      const sc = sceneRef.current;
      if (!sc) return;
      const { index, local } = locate(outcome, t);
      const f = frameAt(MOVIES[outcome][index], local);
      sc.setState(f.day, outcome);
      sc.setMovieFrame(f, `${outcome}-${index}`);
    },
    [outcome],
  );

  useEffect(() => {
    if (mode !== 'movie') {
      sceneRef.current?.setMovieFrame(null);
      return;
    }
    drawMovieAt(tRef.current);
  }, [mode, ready, drawMovieAt]);

  useEffect(() => {
    if (mode !== 'movie' || !moviePlaying) return;
    let raf = 0;
    let last = performance.now();
    let lastUi = 0;
    const tick = (now: number) => {
      const dt = Math.min(0.1, (now - last) / 1000);
      last = now;
      tRef.current = Math.min(total, tRef.current + dt * speed);
      drawMovieAt(tRef.current);
      if (now - lastUi > 120 || tRef.current >= total) {
        lastUi = now;
        setMovieT(tRef.current);
      }
      if (tRef.current >= total) {
        setMoviePlaying(false);
        return;
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [mode, moviePlaying, speed, total, drawMovieAt]);

  const seek = (t: number) => {
    tRef.current = Math.max(0, Math.min(total, t));
    setMovieT(tRef.current);
    drawMovieAt(tRef.current);
  };
  const at = locate(outcome, movieT);
  const movieScene = MOVIES[outcome][at.index];
  const frame = frameAt(movieScene, at.local);
  const goScene = (i: number) => seek(sceneStart(outcome, Math.max(0, Math.min(MOVIES[outcome].length - 1, i))) + 0.01);

  // ---- explore --------------------------------------------------------------
  useEffect(() => {
    if (mode === 'explore') sceneRef.current?.setState(day, outcome);
  }, [day, outcome, ready, mode]);
  useEffect(() => {
    if (mode === 'explore') sceneRef.current?.setView(view);
  }, [view, ready, mode]);
  useEffect(() => {
    sceneRef.current?.setLabelsVisible(labels);
  }, [labels, ready]);

  // Explore play: about one day per second.
  useEffect(() => {
    if (!playing) return;
    let raf = 0;
    let last = performance.now();
    const tick = (now: number) => {
      const dt = (now - last) / 1000;
      last = now;
      setDay((d) => {
        const next = d + dt;
        if (next >= maxDay) {
          setPlaying(false);
          return maxDay;
        }
        return next;
      });
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [playing, maxDay]);

  function chooseOutcome(o: Outcome) {
    if (o === outcome) return;
    setOutcome(o);
    setDay((d) => Math.min(d, o === 'pregnant' ? PREGNANT_DAYS : CYCLE_DAYS));
    // keep the place in the shared opening; otherwise start where the two stories split
    const keep = at.index < SHARED_SCENES ? movieT : sceneStart(o, SHARED_SCENES) + 0.01;
    tRef.current = keep;
    setMovieT(keep);
  }
  function chooseMode(m: 'movie' | 'explore') {
    if (m === mode) return;
    if (m === 'explore') {
      setMoviePlaying(false);
      setDay(frame.day);
    } else setPlaying(false);
    setMode(m);
  }

  const shownDay = mode === 'movie' ? frame.day : day;
  const s = story(shownDay, outcome);
  const fol = dominantFollicle(shownDay, outcome);
  const cl = corpusLuteum(shownDay, outcome);
  const emb = outcome === 'pregnant' ? embryo(shownDay) : null;
  const cycleD = outcome === 'notPregnant' ? shownDay % CYCLE_DAYS : shownDay;
  const justOvulated = cycleD >= OVULATION_DAY - 0.1 && cycleD < OVULATION_DAY + 0.2;
  const phases = phasesOf(movieScene);
  const phaseIdx = phases.findIndex((p) => p.phase === frame.phase);
  const sceneFrac = at.local / sceneDuration(movieScene);
  const ended = movieT >= total - 0.01;

  const readout = (
    <>
      <dl className="lab-readout el-readout">
        <div>
          <dt>Largest follicle</dt>
          <dd>{justOvulated ? 'ruptured — egg released' : `${Math.round(fol.sizeMm)} mm${fol.ovulatory ? ' · ovulatory' : ''}`}</dd>
        </div>
        <div>
          <dt>Corpus luteum</dt>
          <dd>{cl.state === 'none' ? '—' : cl.state === 'luteum' ? `${Math.round(cl.sizeMm)} mm` : cl.state === 'haemorrhagicum' ? 'forming' : cl.state}</dd>
        </div>
        {emb && (
          <div>
            <dt>Embryo</dt>
            <dd>{emb.stage === 'none' ? '—' : emb.stage}</dd>
          </div>
        )}
      </dl>
      {emb && emb.stage !== 'none' && <EmbryoCard e={emb} />}
    </>
  );

  return (
    <div className="ai-lab estrous-lab">
      <div className="el-controls">
        <div className="lab-tabs el-mode" role="tablist" aria-label="Mode">
          <button type="button" role="tab" aria-selected={mode === 'movie'} onClick={() => chooseMode('movie')}>
            ▶ Watch<span className="em-btn-text"> the cycle (guided)</span>
          </button>
          <button type="button" role="tab" aria-selected={mode === 'explore'} onClick={() => chooseMode('explore')}>
            Explore<span className="em-btn-text"> day by day</span>
          </button>
        </div>
        <div className="tl-views" role="group" aria-label="Outcome">
          <span className="el-ctl-label">After insemination:</span>
          <button type="button" aria-pressed={outcome === 'notPregnant'} onClick={() => chooseOutcome('notPregnant')}>
            Not pregnant
          </button>
          <button type="button" aria-pressed={outcome === 'pregnant'} onClick={() => chooseOutcome('pregnant')}>
            Pregnant
          </button>
        </div>
      </div>

      {mode === 'movie' ? (
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
                setMoviePlaying((p) => !p);
              }}
            >
              {moviePlaying ? '❚❚ Pause' : ended ? '↻ Watch again' : movieT > 0 ? '▶ Continue' : '▶ Play'}
            </button>
            <button type="button" className="button-sm em-step" onClick={() => goScene(at.index + 1)} disabled={at.index >= MOVIES[outcome].length - 1} aria-label="Next step">
              <span className="em-btn-text">Next </span>⏭
            </button>
            <label className="em-speed">
              Speed
              <select value={speed} onChange={(e) => setSpeed(Number(e.target.value) as (typeof SPEEDS)[number])}>
                {SPEEDS.map((v) => (
                  <option key={v} value={v}>
                    {v === 1 ? 'Normal' : `${v}×`}
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
            onPointerDown={(e) => {
              const r = e.currentTarget.getBoundingClientRect();
              seek(((e.clientX - r.left) / r.width) * total);
            }}
            onKeyDown={(e) => {
              if (e.key === 'ArrowRight') goScene(at.index + 1);
              if (e.key === 'ArrowLeft') goScene(at.index - 1);
            }}
          >
            {MOVIES[outcome].map((sc, i) => (
              <span
                key={sc.id + i}
                className={`em-seg${i < at.index ? ' em-seg-done' : ''}${i === at.index ? ' em-seg-now' : ''}`}
                style={{ flexGrow: sceneDuration(sc) }}
              >
                {i === at.index && <i style={{ width: `${sceneFrac * 100}%` }} />}
              </span>
            ))}
          </div>
          <span className="el-day">
            Step {at.index + 1}/{MOVIES[outcome].length} · {fmtDay(frame.day)}
          </span>
        </div>
      ) : (
        <>
          <div className="tl-views el-jumps" role="group" aria-label="Jump to">
            {JUMPS[outcome].map((j) => (
              <button
                key={j.label}
                type="button"
                onClick={() => {
                  setPlaying(false);
                  setDay(j.day);
                  setView(j.view);
                }}
              >
                {j.label}
              </button>
            ))}
          </div>
          <div className="el-timeline">
            <button
              type="button"
              className="button-primary button-sm el-play"
              onClick={() => {
                if (!playing && day >= maxDay - 0.01) setDay(0);
                setPlaying((p) => !p);
              }}
            >
              {playing ? '❚❚ Pause' : '▶ Play days'}
            </button>
            <input
              type="range"
              min={0}
              max={maxDay}
              step={0.05}
              value={day}
              aria-label="Day of cycle"
              onChange={(e) => {
                setPlaying(false);
                setDay(Number(e.target.value));
              }}
            />
            <span className="el-day">{fmtDay(day)}</span>
          </div>
        </>
      )}

      <div className="lab-main">
        <div className="lab-stage-wrap">
          <div className="lab-stage" ref={stageRef}>
            {!ready && !failed && <p className="lab-loading">Loading 3D model…</p>}
            {failed && <p className="lab-loading">3D isn’t available on this device or browser. Try Chrome on a recent phone or computer.</p>}
            {mode === 'movie' && ready && (
              <div className="em-subtitle em-subtitle-over" aria-live="polite">
                <span className={`em-chip em-chip-${frame.phase}`}>{movieScene.hormone ? PHASE_LABEL[frame.phase] : frame.phase === 'release' ? 'Watch' : 'Result'}</span>
                {frame.caption}
              </div>
            )}
            {mode === 'movie' && ready && movieT === 0 && !moviePlaying && (
              <button
                type="button"
                className="em-bigplay"
                onClick={() => {
                  setMoviePlaying(true);
                  // on phones, bring the controls and the 3D into view together
                  if (window.innerWidth < 760) document.querySelector('.el-movie-bar')?.scrollIntoView({ block: 'start', behavior: 'smooth' });
                }}
              >
                ▶ Play the {outcome === 'pregnant' ? 'pregnancy' : 'cycle'} movie
                <small>
                  {MOVIES[outcome].length} steps · about {Math.round(total / 60)} min · pause any time
                </small>
              </button>
            )}
          </div>
          {mode === 'movie' && ready && (
            <div className="em-subtitle em-subtitle-below">
              <span className={`em-chip em-chip-${frame.phase}`}>{movieScene.hormone ? PHASE_LABEL[frame.phase] : frame.phase === 'release' ? 'Watch' : 'Result'}</span>
              {frame.caption}
            </div>
          )}
          <div className="lab-view-bar" aria-label="View">
            {mode === 'explore' &&
              VIEWS.map((v) => (
                <button key={v.id} type="button" aria-pressed={view === v.id} onClick={() => setView(v.id)}>
                  {v.label}
                </button>
              ))}
            <button type="button" aria-pressed={labels} onClick={() => setLabels((l) => !l)}>
              Labels
            </button>
          </div>
          <p className="lab-hint">
            {mode === 'movie'
              ? 'Each coloured circle is a hormone, named inside. The camera follows it from where it is made to where it acts. Pause to turn the model yourself. Brain shown schematically above the tract.'
              : 'Coloured dots are hormones travelling in the blood: the more dots, the higher the level. Brain shown schematically above the tract.'}
          </p>
        </div>

        {mode === 'movie' ? (
          <aside className="lab-panel em-panel">
            <p className="lab-kicker">
              Step {at.index + 1} of {MOVIES[outcome].length} · {fmtDay(frame.day)} · {PHASE_INFO[phaseOn(frame.day, outcome)].name}
            </p>
            <h2>{movieScene.title}</h2>
            {movieScene.hormone && (
              <div className="em-hormone">
                <span
                  className={`em-token em-token-static${DARK_TOKENS.has(movieScene.hormone) ? ' em-token-dark' : ''}`}
                  style={{ ['--c' as string]: tokenColor(movieScene.hormone) }}
                >
                  <b>{TOKEN_NAMES[movieScene.hormone].short}</b>
                  <small>{TOKEN_NAMES[movieScene.hormone].name}</small>
                </span>
                <p>
                  <b>From:</b> {SITE_NAME[movieScene.from]}
                  <br />
                  <b>To:</b> {movieScene.to ? SITE_NAME[movieScene.to] : '—'}
                </p>
              </div>
            )}
            <ol className="em-steps">
              {phases.map((p, i) => {
                const text =
                  p.phase === 'release' ? movieScene.release : p.phase === 'travel' ? movieScene.travel : p.phase === 'arrive' ? movieScene.arrive : movieScene.result;
                return (
                  <li key={p.phase} className={i < phaseIdx ? 'em-done' : i === phaseIdx ? 'em-now' : ''}>
                    <span className={`em-chip em-chip-${p.phase}`}>{movieScene.hormone ? PHASE_LABEL[p.phase] : p.phase === 'release' ? 'Watch' : 'Result'}</span>
                    <p>{text}</p>
                  </li>
                );
              })}
            </ol>
            {movieScene.note && (
              <p className="em-note">
                <b>In the field:</b> {movieScene.note}
              </p>
            )}
            {readout}
            <details className="em-chapters">
              <summary>All steps ({MOVIES[outcome].length})</summary>
              <ol>
                {MOVIES[outcome].map((sc, i) => (
                  <li key={sc.id + i}>
                    <button type="button" aria-current={i === at.index ? 'step' : undefined} onClick={() => goScene(i)}>
                      <span>{i + 1}.</span> {sc.title}
                      <em>{fmtDay(sc.dayFrom)}</em>
                    </button>
                  </li>
                ))}
              </ol>
            </details>
          </aside>
        ) : (
          <aside className="lab-panel">
            <p className="lab-kicker">
              {fmtDay(day)} · {PHASE_INFO[s.phase].name}
            </p>
            <h2>{s.headline}</h2>
            <ul className="el-events">
              {s.events.map((e) => (
                <li key={e}>{e}</li>
              ))}
            </ul>

            {s.heat && (
              <div className="el-heat">
                <h3>Heat signs</h3>
                <ul>
                  <li>
                    <b>Stands to be mounted</b> — the surest sign
                  </li>
                  <li>Mounts other cows, restless, bellowing</li>
                  <li>Clear, stringy mucus from the vulva; vulva swollen and red</li>
                  <li>Less feed, sometimes less milk</li>
                </ul>
                <h3>When to inseminate (AM–PM rule)</h3>
                <p>
                  Seen in heat in the morning → inseminate the same evening. Seen in the evening → inseminate next morning. Ovulation comes about 10–14
                  hours after heat ends.
                </p>
              </div>
            )}
            {readout}
          </aside>
        )}
      </div>

      <HormoneChart
        outcome={outcome}
        maxDay={maxDay}
        day={shownDay}
        onDay={(d) => {
          setPlaying(false);
          setMoviePlaying(false);
          setMode('explore');
          setDay(d);
        }}
      />

      <section className="el-species" aria-labelledby="species-title">
        <h2 id="species-title">Timing differences between species</h2>
        <p className="muted">The model above shows the cow. Timings in other species:</p>
        <p className="hc-scroll-hint">Swipe sideways to see all columns</p>
        <div className="el-table-scroll">
          <table>
            <thead>
              <tr>
                <th></th>
                <th>Cycle length</th>
                <th>Heat lasts</th>
                <th>Ovulation</th>
                <th>Breeding season</th>
                <th>Gestation</th>
              </tr>
            </thead>
            <tbody>
              {SPECIES_TIMING.map((t) => (
                <tr key={t.species}>
                  <th scope="row">{t.species}</th>
                  <td>{t.cycle}</td>
                  <td>{t.heat}</td>
                  <td>{t.ovulation}</td>
                  <td>{t.season}</td>
                  <td>{t.gestation}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

/** A small drawing of the embryo's current stage. */
function EmbryoCard({ e }: { e: EmbryoState }) {
  return (
    <div className="el-embryo">
      <span className="el-embryo-art" dangerouslySetInnerHTML={{ __html: embryoSvg(e) }} />
      <p>
        <b>{embryoStageName(e)}</b> — in the {e.site === 'oviduct' ? 'oviduct' : 'uterine horn'}
      </p>
    </div>
  );
}
