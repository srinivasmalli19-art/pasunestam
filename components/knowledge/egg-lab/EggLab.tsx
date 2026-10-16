'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import type { EggLabOptions, EggLabScene, EggView } from './scene';
import { LAYER_INFO, SEGMENTS, SEGMENT_INFO, TIMELINE, eggAt, fmtHours, type EggState } from '@/lib/poultry/egg';
import {
  EGG_MOVIE,
  EGG_TOKENS,
  eggFrameAt,
  eggLocate,
  eggMovieDuration,
  eggPhasesOf,
  eggSceneDuration,
  eggSceneStart,
  type EggMoviePhase,
  type EggSiteId,
} from '@/lib/poultry/movie';
import '../ai-lab/ai-lab.css';
import '../torsion-lab/torsion-lab.css';
import '../estrous-lab/estrous-lab.css';
import './egg-lab.css';

const PHASE_LABEL: Record<EggMoviePhase, string> = { release: 'Released', travel: 'Travels', arrive: 'Acts', result: 'Result' };
const SPEEDS = [0.5, 0.75, 1, 1.5] as const;
const H_MIN = -8;
const H_MAX = TIMELINE.laid + 0.5;

const SITE_NAME: Record<EggSiteId, string> = {
  hypothalamus: 'Hypothalamus (brain)',
  pituitary: 'Anterior pituitary (brain)',
  postPituitary: 'Posterior pituitary (brain)',
  ovary: 'Ovary',
  f1: 'Largest follicle (F1)',
  liver: 'Liver',
  kidney: 'Kidney',
  gut: 'Intestine',
  bone: 'Medullary bone',
  infundibulum: 'Infundibulum',
  magnum: 'Magnum',
  isthmus: 'Isthmus',
  uterus: 'Uterus (shell gland)',
  vagina: 'Vagina',
  egg: 'Egg',
};

const JUMPS: Array<{ label: string; h: number; view: EggView }> = [
  { label: 'LH surge', h: -5, view: 'ovary' },
  { label: 'Ovulation', h: 0.02, view: 'ovary' },
  { label: 'Infundibulum', h: 0.15, view: 'egg' },
  { label: 'Magnum', h: 1.8, view: 'egg' },
  { label: 'Isthmus', h: 3.9, view: 'egg' },
  { label: 'Uterus: plumping', h: 7, view: 'egg' },
  { label: 'Uterus: shell', h: 15, view: 'egg' },
  { label: 'Pigment & cuticle', h: 23.6, view: 'egg' },
  { label: 'Laid', h: TIMELINE.laid + 0.2, view: 'overview' },
];
const VIEWS: Array<{ id: EggView; label: string }> = [
  { id: 'overview', label: 'Whole tract' },
  { id: 'ovary', label: 'Ovary' },
  { id: 'oviduct', label: 'Oviduct' },
  { id: 'egg', label: 'Egg close-up' },
];

const where = (e: EggState) => (e.segment === 'ovary' ? 'On the ovary (yolk growing)' : e.segment === 'laid' ? 'Laid' : SEGMENT_INFO[e.segment].name);

export default function EggLab() {
  const stageRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<EggLabScene | null>(null);
  const [ready, setReady] = useState(false);
  const [failed, setFailed] = useState(false);
  const [mode, setMode] = useState<'movie' | 'explore'>('movie');
  const [opts, setOpts] = useState<EggLabOptions>({ cut: true, fertile: true, brown: true, labels: true });
  const [hour, setHour] = useState(-8);
  const [view, setView] = useState<EggView>('overview');

  const tRef = useRef(0);
  const [movieT, setMovieT] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [speed, setSpeed] = useState<(typeof SPEEDS)[number]>(1);
  const total = eggMovieDuration();

  useEffect(() => {
    const el = stageRef.current;
    if (!el) return;
    let cancelled = false;
    let created: EggLabScene | null = null;
    import('./scene')
      .then(({ createEggScene }) => {
        if (cancelled) return;
        try {
          created = createEggScene(el);
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
    sceneRef.current?.setOptions(opts);
  }, [opts, ready]);

  // ---- movie ----
  const drawAt = useCallback((t: number) => {
    const sc = sceneRef.current;
    if (!sc) return;
    const { index, local } = eggLocate(t);
    const f = eggFrameAt(EGG_MOVIE[index], local);
    sc.setHour(f.hour);
    sc.setMovieFrame(f, String(index));
  }, []);
  useEffect(() => {
    if (mode !== 'movie') {
      sceneRef.current?.setMovieFrame(null);
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
  const at = eggLocate(movieT);
  const sc = EGG_MOVIE[at.index];
  const frame = eggFrameAt(sc, at.local);
  const goScene = (i: number) => seek(eggSceneStart(Math.max(0, Math.min(EGG_MOVIE.length - 1, i))) + 0.01);
  const ended = movieT >= total - 0.01;

  // ---- explore ----
  useEffect(() => {
    if (mode === 'explore') sceneRef.current?.setHour(hour);
  }, [hour, mode, ready]);
  useEffect(() => {
    if (mode === 'explore') sceneRef.current?.setView(view);
  }, [view, mode, ready]);

  function chooseMode(m: 'movie' | 'explore') {
    if (m === mode) return;
    if (m === 'explore') {
      setPlaying(false);
      setHour(frame.hour);
      setView('egg');
    }
    setMode(m);
  }

  const shownHour = mode === 'movie' ? frame.hour : hour;
  const e = eggAt(shownHour);
  const phases = eggPhasesOf(sc);
  const phaseIdx = phases.findIndex((p) => p.phase === frame.phase);
  const chip = (p: EggMoviePhase) => (sc.hormone ? PHASE_LABEL[p] : p === 'release' ? 'Watch' : 'Result');
  const clock = shownHour < 0 ? `${fmtHours(-shownHour)} before ovulation` : e.segment === 'laid' ? `${fmtHours(shownHour)} — laid` : `${fmtHours(shownHour)} after ovulation`;

  const eggSoFar = (
    <div className="egl-sofar">
      <h3>The egg so far</h3>
      <p className="egl-where">
        <b>Where:</b> {where(e)}
        {e.segment !== 'ovary' && e.segment !== 'laid' && <> · {Math.round(e.progress * 100)}% through</>}
      </p>
      <ul>
        <li className="egl-done">
          <span>Yolk</span>
          <i style={{ ['--p' as string]: shownHour >= 0 ? 1 : 0.85 }} />
          <em>Ovary</em>
        </li>
        {LAYER_INFO.map((l) => {
          const val = Number(e[l.key]);
          if (l.key === 'pigment' && !opts.brown) return null;
          return (
            <li key={l.key} className={val >= 1 ? 'egl-done' : val > 0 ? 'egl-now' : ''}>
              <span>{l.name}</span>
              <i style={{ ['--p' as string]: val }} />
              <em>{l.where}</em>
            </li>
          );
        })}
      </ul>
    </div>
  );

  return (
    <div className="ai-lab estrous-lab egg-lab">
      <div className="egl-parts" role="tablist" aria-label="Lab part">
        <button type="button" role="tab" aria-selected>
          <b>1 · Egg formation</b>
          <span>Ovary to cloaca, hormones and layers</span>
        </button>
        <button type="button" role="tab" aria-selected={false} disabled>
          <b>2 · Egg problems</b>
          <span>Coming next</span>
        </button>
        <button type="button" role="tab" aria-selected={false} disabled>
          <b>3 · Fertile eggs &amp; hatching</b>
          <span>Coming next</span>
        </button>
      </div>

      <div className="el-controls">
        <div className="lab-tabs el-mode" role="tablist" aria-label="Mode">
          <button type="button" role="tab" aria-selected={mode === 'movie'} onClick={() => chooseMode('movie')}>
            ▶ Watch<span className="em-btn-text"> the egg form (guided)</span>
          </button>
          <button type="button" role="tab" aria-selected={mode === 'explore'} onClick={() => chooseMode('explore')}>
            Explore<span className="em-btn-text"> hour by hour</span>
          </button>
        </div>
        <div className="tl-views egl-opts" role="group" aria-label="Options">
          <button type="button" aria-pressed={opts.cut} onClick={() => setOpts((o) => ({ ...o, cut: !o.cut }))}>
            Cut egg in half
          </button>
          <button type="button" aria-pressed={opts.fertile} onClick={() => setOpts((o) => ({ ...o, fertile: !o.fertile }))}>
            {opts.fertile ? 'With rooster (fertile)' : 'No rooster (infertile)'}
          </button>
          <button type="button" aria-pressed={opts.brown} onClick={() => setOpts((o) => ({ ...o, brown: !o.brown }))}>
            {opts.brown ? 'Brown-egg hen' : 'White-egg hen'}
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
                setPlaying((p) => !p);
              }}
            >
              {playing ? '❚❚ Pause' : ended ? '↻ Watch again' : movieT > 0 ? '▶ Continue' : '▶ Play'}
            </button>
            <button type="button" className="button-sm em-step" onClick={() => goScene(at.index + 1)} disabled={at.index >= EGG_MOVIE.length - 1} aria-label="Next step">
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
            {EGG_MOVIE.map((s, i) => (
              <span key={s.id} className={`em-seg${i < at.index ? ' em-seg-done' : ''}${i === at.index ? ' em-seg-now' : ''}`} style={{ flexGrow: eggSceneDuration(s) }}>
                {i === at.index && <i style={{ width: `${(at.local / eggSceneDuration(s)) * 100}%` }} />}
              </span>
            ))}
          </div>
          <span className="el-day">
            Step {at.index + 1}/{EGG_MOVIE.length} · {fmtHours(Math.abs(frame.hour))} {frame.hour < 0 ? 'before' : 'after'} ovulation
          </span>
        </div>
      ) : (
        <>
          <div className="tl-views el-jumps" role="group" aria-label="Jump to">
            {JUMPS.map((j) => (
              <button
                key={j.label}
                type="button"
                onClick={() => {
                  setHour(j.h);
                  setView(j.view);
                }}
              >
                {j.label}
              </button>
            ))}
          </div>
          <div className="el-timeline">
            <span className="egl-slider-label">Hours</span>
            <input type="range" min={H_MIN} max={H_MAX} step={0.05} value={hour} aria-label="Hours after ovulation" onChange={(ev) => setHour(Number(ev.target.value))} />
            <span className="el-day">{clock}</span>
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
                <span className={`em-chip em-chip-${frame.phase}`}>{chip(frame.phase)}</span>
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
                ▶ Play: how an egg is made
                <small>
                  {EGG_MOVIE.length} steps · about {Math.round(total / 60)} min · pause any time
                </small>
              </button>
            )}
          </div>
          {mode === 'movie' && ready && (
            <div className="em-subtitle em-subtitle-below">
              <span className={`em-chip em-chip-${frame.phase}`}>{chip(frame.phase)}</span>
              {frame.caption}
            </div>
          )}
          <div className="lab-view-bar" aria-label="View">
            {mode === 'explore' &&
              VIEWS.map((vw) => (
                <button key={vw.id} type="button" aria-pressed={view === vw.id} onClick={() => setView(vw.id)}>
                  {vw.label}
                </button>
              ))}
            <button type="button" aria-pressed={opts.labels} onClick={() => setOpts((o) => ({ ...o, labels: !o.labels }))}>
              Labels
            </button>
          </div>
          <p className="lab-hint">
            Each part of the oviduct has its own colour. The egg is drawn cut in half (facing you) so you can see the layers; shell thickness is exaggerated so it can be seen. Brain, liver,
            kidney, intestine and bone are schematic. {mode === 'movie' ? 'Pause to turn the model yourself.' : ''}
          </p>
        </div>

        {mode === 'movie' ? (
          <aside className="lab-panel em-panel">
            <p className="lab-kicker">
              Step {at.index + 1} of {EGG_MOVIE.length} · {clock}
            </p>
            <h2>{sc.title}</h2>
            {sc.hormone && (
              <div className="em-hormone">
                <span className={`em-token em-token-static${EGG_TOKENS[sc.hormone].dark ? ' em-token-dark' : ''}`} style={{ ['--c' as string]: EGG_TOKENS[sc.hormone].color }}>
                  <b>{EGG_TOKENS[sc.hormone].short}</b>
                  <small>{EGG_TOKENS[sc.hormone].name}</small>
                </span>
                <p>
                  <b>From:</b> {SITE_NAME[sc.from]}
                  <br />
                  <b>To:</b> {sc.to ? SITE_NAME[sc.to] : '—'}
                </p>
              </div>
            )}
            <ol className="em-steps">
              {phases.map((p, i) => {
                const text = p.phase === 'release' ? sc.release : p.phase === 'travel' ? sc.travel : p.phase === 'arrive' ? sc.arrive : sc.result;
                return (
                  <li key={p.phase} className={i < phaseIdx ? 'em-done' : i === phaseIdx ? 'em-now' : ''}>
                    <span className={`em-chip em-chip-${p.phase}`}>{chip(p.phase)}</span>
                    <p>{text}</p>
                  </li>
                );
              })}
            </ol>
            {sc.note && (
              <p className="em-note">
                <b>In the field:</b> {sc.note}
              </p>
            )}
            {eggSoFar}
            <details className="em-chapters">
              <summary>All steps ({EGG_MOVIE.length})</summary>
              <ol>
                {EGG_MOVIE.map((s, i) => (
                  <li key={s.id}>
                    <button type="button" aria-current={i === at.index ? 'step' : undefined} onClick={() => goScene(i)}>
                      <span>{i + 1}.</span> {s.title}
                    </button>
                  </li>
                ))}
              </ol>
            </details>
          </aside>
        ) : (
          <aside className="lab-panel">
            <p className="lab-kicker">{clock}</p>
            <h2>{where(e)}</h2>
            {e.segment !== 'ovary' && e.segment !== 'laid' ? (
              <p>
                <b>Adds:</b> {SEGMENT_INFO[e.segment].adds}. <b>Time here:</b> {SEGMENT_INFO[e.segment].time}.
              </p>
            ) : e.segment === 'ovary' ? (
              <p>The yolk is still growing in its follicle on the ovary. Move the slider past ovulation (0 h) to start the journey.</p>
            ) : (
              <p>The finished egg is laid about 24–26 hours after ovulation. The next ovulation usually follows within an hour.</p>
            )}
            {eggSoFar}
          </aside>
        )}
      </div>

      <section className="el-species egl-table" aria-labelledby="egl-parts-title">
        <h2 id="egl-parts-title">Which part of the oviduct makes which part of the egg</h2>
        <div className="el-table-scroll">
          <table>
            <thead>
              <tr>
                <th>Part</th>
                <th>Length</th>
                <th>Time</th>
                <th>Adds to the egg</th>
              </tr>
            </thead>
            <tbody>
              {SEGMENTS.map((s) => (
                <tr key={s} className={e.segment === s ? 'egl-row-now' : ''}>
                  <th scope="row">
                    <i className="egl-swatch" style={{ background: SEGMENT_INFO[s].color }} aria-hidden="true" />
                    {SEGMENT_INFO[s].name}
                  </th>
                  <td>~{SEGMENT_INFO[s].lengthCm} cm</td>
                  <td>{SEGMENT_INFO[s].time}</td>
                  <td>{SEGMENT_INFO[s].adds}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="muted egl-foot">Typical values for a laying hen; the whole journey takes about 24–26 hours.</p>
      </section>

      <section className="egl-next" aria-label="Coming next">
        <div>
          <b>Part 2 · Egg problems (coming next)</b>
          <p>Switch a cause on and see the egg change: low calcium or vitamin D3 (thin, soft or shell-less eggs), pale yolks, heat stress, IB and EDS-76, blood spots, double yolks.</p>
        </div>
        <div>
          <b>Part 3 · Fertile eggs &amp; hatching (coming next)</b>
          <p>Fertile vs infertile eggs, candling on day 7 and 18, and the chick developing day by day to hatch on day 21.</p>
        </div>
      </section>
    </div>
  );
}
