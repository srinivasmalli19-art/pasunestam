'use client';

import Link from 'next/link';
import { useEffect, useMemo, useRef, useState } from 'react';
import type { SkeletonScene } from './skeleton-scene';
import type { DetailScene } from './detail-scene';
import { BONES, REGION_NAME, VERTEBRAL_FORMULA, type Region } from '@/lib/anatomy/cow-bones';
import { buildSkeleton, type Piece } from '@/lib/anatomy/cow-skeleton';
import '../ai-lab/ai-lab.css';
import './anatomy-lab.css';

const REGIONS: Region[] = ['skull', 'spine', 'thorax', 'forelimb', 'hindlimb'];

export default function AnatomyLab() {
  const stageRef = useRef<HTMLDivElement>(null);
  const detailRef = useRef<HTMLDivElement>(null);
  const skelRef = useRef<SkeletonScene | null>(null);
  const detRef = useRef<DetailScene | null>(null);
  const [progress, setProgress] = useState<[number, number]>([0, 1]);
  const [failed, setFailed] = useState(false);
  const [piece, setPiece] = useState<Piece | null>(null);
  const [active, setActive] = useState<number | null>(null);
  const [region, setRegion] = useState<Region | null>(null);
  const [both, setBoth] = useState(true);
  const [building, setBuilding] = useState(false);
  const pieces = useMemo(() => buildSkeleton(), []);

  // skeleton scene
  useEffect(() => {
    const el = stageRef.current;
    if (!el) return;
    let cancelled = false;
    let created: SkeletonScene | null = null;
    import('./skeleton-scene')
      .then(({ createSkeletonScene }) => {
        if (cancelled) return;
        try {
          created = createSkeletonScene(el, {
            onSelect: (p) => {
              setPiece(p);
              setActive(null);
            },
            onProgress: (d, t) => setProgress([d, t]),
          });
          skelRef.current = created;
        } catch {
          setFailed(true);
        }
      })
      .catch(() => setFailed(true));
    return () => {
      cancelled = true;
      created?.dispose();
      skelRef.current = null;
    };
  }, []);

  // detail scene (created on first selection)
  useEffect(() => {
    if (!piece) return;
    const el = detailRef.current;
    if (!el) return;
    let cancelled = false;
    setBuilding(true);
    const go = async () => {
      if (!detRef.current) {
        const { createDetailScene } = await import('./detail-scene');
        if (cancelled) return;
        detRef.current = createDetailScene(el, { onPin: (i) => setActive(i), onReady: () => setBuilding(false) });
      }
      // let the "building…" message paint first
      setTimeout(() => !cancelled && detRef.current?.show(piece), 30);
    };
    go().catch(() => setFailed(true));
    return () => {
      cancelled = true;
    };
  }, [piece]);
  useEffect(
    () => () => {
      detRef.current?.dispose();
      detRef.current = null;
    },
    [],
  );

  useEffect(() => {
    detRef.current?.setActive(active);
  }, [active]);
  // on phones the panel is below the skeleton: bring it into view when a bone is chosen
  useEffect(() => {
    if (piece && window.innerWidth < 980) document.querySelector('.an-panel')?.scrollIntoView({ block: 'start', behavior: 'smooth' });
  }, [piece]);
  useEffect(() => {
    skelRef.current?.setRegion(region);
  }, [region]);
  useEffect(() => {
    skelRef.current?.setSides(both);
  }, [both]);

  const choose = (p: Piece | null) => {
    setPiece(p);
    setActive(null);
    skelRef.current?.setSelected(p?.id ?? null);
  };
  const info = piece ? BONES[piece.bone] : null;
  const loading = progress[0] < progress[1];

  // one entry per bone for the dropdown (right side)
  const boneOptions = useMemo(() => {
    const seen = new Set<string>();
    const out: Array<{ bone: string; piece: Piece }> = [];
    for (const p of pieces) {
      if (p.mirror || seen.has(p.bone) || p.id.startsWith('cart')) continue;
      seen.add(p.bone);
      out.push({ bone: p.bone, piece: p });
    }
    return out;
  }, [pieces]);

  return (
    <div className="ai-lab anatomy-lab">
      <div className="an-top">
        <div className="an-chips" role="group" aria-label="Animal">
          <span className="an-chip-label">Animal</span>
          <button type="button" aria-pressed>
            Cow
          </button>
          {['Buffalo', 'Sheep', 'Goat'].map((a) => (
            <button key={a} type="button" disabled title="Coming later">
              {a}
            </button>
          ))}
        </div>
        <div className="an-chips" role="group" aria-label="System">
          <span className="an-chip-label">System</span>
          <button type="button" aria-pressed>
            Bones
          </button>
          {['Muscles', 'Arteries', 'Veins', 'Nerves'].map((a) => (
            <button key={a} type="button" disabled title="Coming later">
              {a}
            </button>
          ))}
        </div>
      </div>

      <div className="an-tools">
        <div className="an-chips" role="group" aria-label="Region">
          <button type="button" aria-pressed={region === null} onClick={() => setRegion(null)}>
            Whole skeleton
          </button>
          {REGIONS.map((r) => (
            <button key={r} type="button" aria-pressed={region === r} onClick={() => setRegion(r)}>
              {REGION_NAME[r]}
            </button>
          ))}
        </div>
        <div className="an-chips">
          <label className="an-select">
            <span>Find a bone</span>
            <select
              value={piece && !piece.mirror ? piece.bone : ''}
              onChange={(e) => {
                const o = boneOptions.find((b) => b.bone === e.target.value);
                choose(o ? o.piece : null);
              }}
            >
              <option value="">Choose…</option>
              {REGIONS.map((r) => (
                <optgroup key={r} label={REGION_NAME[r]}>
                  {boneOptions
                    .filter((b) => BONES[b.bone].region === r)
                    .map((b) => (
                      <option key={b.bone} value={b.bone}>
                        {BONES[b.bone].name}
                      </option>
                    ))}
                </optgroup>
              ))}
            </select>
          </label>
          <button type="button" aria-pressed={!both} onClick={() => setBoth((b) => !b)}>
            {both ? 'Both sides' : 'Right side only'}
          </button>
          <button type="button" onClick={() => skelRef.current?.resetView()}>
            Reset view
          </button>
        </div>
      </div>

      <div className="an-main">
        <div className="an-stage-wrap">
          <div className="lab-stage an-stage" ref={stageRef}>
            {loading && !failed && (
              <p className="lab-loading">
                Building the skeleton… {Math.round((progress[0] / progress[1]) * 100)}%
              </p>
            )}
            {failed && <p className="lab-loading">3D isn’t available on this device or browser. Try Chrome on a recent phone or computer.</p>}
          </div>
          <p className="lab-hint">Drag to turn, pinch or scroll to zoom. Tap a bone to see it big with its landmarks. Bones are modelled in code — shapes are simplified.</p>
        </div>

        <aside className="lab-panel an-panel">
          {!info ? (
            <div className="an-empty">
              <h2>Tap any bone</h2>
              <p>It will appear here, big, with its grooves, processes and other landmarks numbered.</p>
              <dl className="an-facts">
                <div>
                  <dt>Vertebral formula</dt>
                  <dd>{VERTEBRAL_FORMULA}</dd>
                </div>
                <div>
                  <dt>Ribs</dt>
                  <dd>13 pairs — 8 sternal, 5 asternal</dd>
                </div>
                <div>
                  <dt>Digits</dt>
                  <dd>III and IV bear weight; II and V are dewclaws</dd>
                </div>
              </dl>
            </div>
          ) : (
            <>
              <p className="lab-kicker">
                {REGION_NAME[info.region]} · {info.count}
              </p>
              <h2>{piece!.label.replace(/ \((right|left)\)$/, '')}</h2>
              {piece!.label !== info.name && !piece!.label.startsWith(info.name) && <p className="an-sub">{info.name}</p>}
              <div className="an-detail" ref={detailRef}>
                {building && <p className="lab-loading">Building the bone…</p>}
              </div>
              <p className="an-detail-hint">
                {piece!.mirror ? 'Right bone shown (the left is a mirror image). ' : ''}Turn the bone; tap a number or a name below.
              </p>
              <p className="an-summary">{info.summary}</p>
              <ol className="an-landmarks">
                {info.landmarks.map((l, i) => (
                  <li key={l.name}>
                    <button type="button" aria-current={active === i} onClick={() => setActive(active === i ? null : i)}>
                      <span className={`an-num${l.clinical ? ' an-num-clinical' : ''}`}>{i + 1}</span>
                      <span>
                        <b>{l.name}</b>
                        {active === i && <em>{l.desc}</em>}
                      </span>
                    </button>
                  </li>
                ))}
              </ol>
              {info.notes && (
                <div className="an-notes">
                  <b>Clinical notes</b>
                  <ul>
                    {info.notes.map((n) => (
                      <li key={n}>{n}</li>
                    ))}
                  </ul>
                </div>
              )}
              <button type="button" className="an-clear" onClick={() => choose(null)}>
                ← Back to the skeleton facts
              </button>
            </>
          )}
        </aside>
      </div>

      <section className="an-next" aria-label="Coming next">
        <div>
          <b>
            <Link href="/knowledge/stifle-lab">Medial patellar desmotomy (stifle) →</Link>
          </b>
          <p>A 3D stifle with the three patellar ligaments: see upward fixation of the patella over the medial trochlear ridge and which ligament is cut.</p>
        </div>
        <div>
          <b>Later: muscles, vessels and nerves · buffalo, sheep and goat</b>
          <p>The same viewer, adding the other systems and species.</p>
        </div>
      </section>
    </div>
  );
}
