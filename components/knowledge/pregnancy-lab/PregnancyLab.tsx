'use client';

import { useEffect, useRef, useState } from 'react';
import type { PregOptions, PregScene, PregView } from './scene';
import { COMPARE, MONTHS, SPECIES, monthMidDay, monthOfDay, pregnancyAt, type Species } from '@/lib/pregnancy/months';
import '../ai-lab/ai-lab.css';
import '../estrous-lab/estrous-lab.css';
import './pregnancy-lab.css';

const REACH_TEXT = {
  yes: { label: 'Fetus within reach', cls: 'pg-ok' },
  difficult: { label: 'Fetus hard to reach', cls: 'pg-mid' },
  no: { label: 'Fetus OUT of reach', cls: 'pg-no' },
  tooSmall: { label: 'Fetus too small to feel', cls: 'pg-mid' },
} as const;

export default function PregnancyLab() {
  const stageRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<PregScene | null>(null);
  const [ready, setReady] = useState(false);
  const [failed, setFailed] = useState(false);
  const [progress, setProgress] = useState(0);
  const [species, setSpecies] = useState<Species>('buffalo');
  const [day, setDay] = useState(monthMidDay('buffalo', 1));
  const [birth, setBirth] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [opts, setOpts] = useState<PregOptions>({ skeleton: true, hand: true, labels: true });
  const sp = SPECIES[species];

  useEffect(() => {
    const el = stageRef.current;
    if (!el) return;
    let cancelled = false;
    let created: PregScene | null = null;
    import('./scene')
      .then(({ createPregnancyScene }) => {
        if (cancelled) return;
        try {
          created = createPregnancyScene(el, { onProgress: (k) => setProgress(k) });
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

  const state = pregnancyAt(species, day, birth);
  useEffect(() => {
    sceneRef.current?.setState(pregnancyAt(species, day, birth));
  }, [species, day, birth, ready]);
  useEffect(() => {
    sceneRef.current?.setOptions(opts);
  }, [opts, ready]);

  // play: one month every 4 seconds
  useEffect(() => {
    if (!playing) return;
    const per = sp.gestationDays / sp.months;
    const id = setInterval(() => {
      setDay((d) => {
        const next = d + per / 8;
        if (next >= sp.gestationDays) {
          setPlaying(false);
          return sp.gestationDays;
        }
        return next;
      });
    }, 500);
    return () => clearInterval(id);
  }, [playing, sp]);

  const month = monthOfDay(species, day);
  const info = MONTHS[species][month - 1];
  const reach = REACH_TEXT[state.reach];

  const chooseSpecies = (s: Species) => {
    if (s === species) return;
    const m = Math.min(SPECIES[s].months, month);
    setSpecies(s);
    setDay(monthMidDay(s, m));
    setBirth(false);
  };
  const chooseMonth = (m: number) => {
    setPlaying(false);
    setBirth(false);
    setDay(monthMidDay(species, m));
  };

  return (
    <div className="ai-lab pregnancy-lab">
      <div className="pg-top">
        <div className="pg-chips" role="group" aria-label="Species">
          <button type="button" aria-pressed={species === 'buffalo'} onClick={() => chooseSpecies('buffalo')}>
            Buffalo · 10 months
          </button>
          <button type="button" aria-pressed={species === 'cow'} onClick={() => chooseSpecies('cow')}>
            Cattle · 9 months
          </button>
        </div>
        <div className="pg-chips" role="group" aria-label="Show">
          <button type="button" aria-pressed={opts.hand} onClick={() => setOpts((o) => ({ ...o, hand: !o.hand }))}>
            Rectal hand
          </button>
          <button type="button" aria-pressed={opts.skeleton} onClick={() => setOpts((o) => ({ ...o, skeleton: !o.skeleton }))}>
            Skeleton
          </button>
          <button type="button" aria-pressed={opts.labels} onClick={() => setOpts((o) => ({ ...o, labels: !o.labels }))}>
            Labels
          </button>
        </div>
      </div>

      <div className="pg-months" role="group" aria-label="Month">
        {Array.from({ length: sp.months }, (_, i) => i + 1).map((m) => (
          <button key={m} type="button" aria-pressed={!birth && month === m} onClick={() => chooseMonth(m)}>
            <b>{m}</b>
            <span>month</span>
          </button>
        ))}
        <button
          type="button"
          className="pg-birth"
          aria-pressed={birth}
          onClick={() => {
            setPlaying(false);
            setDay(sp.gestationDays);
            setBirth(true);
          }}
        >
          <b>Birth</b>
          <span>posture</span>
        </button>
      </div>

      <div className="el-timeline">
        <button
          type="button"
          className="button-primary button-sm el-play"
          onClick={() => {
            if (!playing && (birth || day >= sp.gestationDays - 1)) {
              setBirth(false);
              setDay(0);
            }
            setPlaying((p) => !p);
          }}
        >
          {playing ? '❚❚ Pause' : '▶ Play months'}
        </button>
        <input
          type="range"
          min={0}
          max={sp.gestationDays}
          step={1}
          value={Math.round(day)}
          aria-label="Day of pregnancy"
          onChange={(e) => {
            setPlaying(false);
            setBirth(false);
            setDay(Number(e.target.value));
          }}
        />
        <span className="el-day">Day {Math.round(day)}</span>
      </div>

      <div className="lab-main">
        <div className="lab-stage-wrap">
          <div className="lab-stage pg-stage" ref={stageRef}>
            {!ready && !failed && <p className="lab-loading">Loading 3D model…</p>}
            {ready && progress < 1 && <p className="pg-building">Adding the skeleton… {Math.round(progress * 100)}%</p>}
            {failed && <p className="lab-loading">3D isn’t available on this device or browser. Try Chrome on a recent phone or computer.</p>}
            <span className={`pg-badge ${reach.cls}`}>{reach.label}</span>
          </div>
          <div className="lab-view-bar" aria-label="View">
            {(
              [
                ['side', 'Right side'],
                ['above', 'From above'],
                ['whole', 'Whole animal'],
              ] as Array<[PregView, string]>
            ).map(([id, label]) => (
              <button key={id} type="button" onClick={() => sceneRef.current?.setView(id)}>
                {label}
              </button>
            ))}
          </div>
          <p className="lab-hint">
            Seen from the right side, head to the right. The rumen (green) fills the left abdomen, so the pregnant uterus lies to its right. Blue dashed circle: how far a hand can
            reach from the anus (about 70 cm). Skeleton is cow-type; layout is similar in the buffalo. Sizes and timings are typical — they vary.
          </p>
        </div>

        <aside className="lab-panel">
          <p className="lab-kicker">
            {sp.name} · {birth ? 'At calving' : `Month ${month} (days ${info.days})`}
          </p>
          <h2>{birth ? 'Normal birth posture' : info.position}</h2>
          {birth ? (
            <p>
              Anterior presentation, dorsosacral position: the calf comes head first with its back towards the mother’s spine, both forelimbs extended into the birth canal and the head
              resting on them. Any other presentation, position or posture can cause dystocia.
            </p>
          ) : (
            <>
              <dl className="lab-readout pg-readout">
                <div>
                  <dt>Fetus size</dt>
                  <dd>{info.size}</dd>
                </div>
                <div>
                  <dt>Placentomes</dt>
                  <dd>{state.placentome < 0.5 ? 'not yet' : `~${state.placentome.toFixed(1)} cm`}</dd>
                </div>
                <div>
                  <dt>Fremitus</dt>
                  <dd>{state.fremitus === 0 ? 'no' : state.fremitus < 0.6 ? 'starting' : 'yes'}</dd>
                </div>
              </dl>
              <h3 className="pg-h3">What you feel per rectum</h3>
              <ul className="pg-list">
                {info.palpation.map((p) => (
                  <li key={p}>{p}</li>
                ))}
              </ul>
              {info.note && (
                <p className="em-note pg-note">
                  <b>Note:</b> {info.note}
                </p>
              )}
            </>
          )}
        </aside>
      </div>

      <section className="el-species" aria-labelledby="pg-months-title">
        <h2 id="pg-months-title">{sp.name}: all months at a glance</h2>
        <div className="el-table-scroll">
          <table>
            <thead>
              <tr>
                <th>Month</th>
                <th>Days</th>
                <th>Where the uterus and fetus lie</th>
                <th>Fetus</th>
                <th>Fetus reachable?</th>
              </tr>
            </thead>
            <tbody>
              {MONTHS[species].map((m) => {
                const r = REACH_TEXT[pregnancyAt(species, monthMidDay(species, m.month)).reach];
                return (
                  <tr key={m.month} className={!birth && m.month === month ? 'pg-row-now' : ''} onClick={() => chooseMonth(m.month)}>
                    <th scope="row">{m.month}</th>
                    <td>{m.days}</td>
                    <td>{m.position}</td>
                    <td>{m.size}</td>
                    <td>
                      <span className={`pg-dot ${r.cls}`} /> {r.label.replace('Fetus ', '')}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      <section className="el-species" aria-labelledby="pg-compare-title">
        <h2 id="pg-compare-title">Buffalo and cattle compared</h2>
        <div className="el-table-scroll">
          <table>
            <thead>
              <tr>
                <th></th>
                <th>Buffalo</th>
                <th>Cattle</th>
              </tr>
            </thead>
            <tbody>
              {COMPARE.map((c) => (
                <tr key={c.label}>
                  <th scope="row">{c.label}</th>
                  <td>{c.buffalo}</td>
                  <td>{c.cow}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
