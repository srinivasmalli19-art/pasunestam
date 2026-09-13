'use client';

import { useMemo, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { addScheme, submitSchemeApplication } from '@/lib/schemes/actions';
import { SCHEME_TAGS, type Scheme } from '@/lib/schemes/types';
import './schemes.css';

interface Props {
  schemes: Scheme[];
  isSignedIn: boolean;
}

type ModalState = { kind: 'apply'; scheme: Scheme } | { kind: 'add' } | null;

export default function SchemesBrowser({ schemes, isSignedIn }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [filter, setFilter] = useState('All');
  const [modal, setModal] = useState<ModalState>(null);
  const [error, setError] = useState('');
  const [done, setDone] = useState('');

  const tags = useMemo(() => ['All', ...new Set(schemes.map((s) => s.tag))], [schemes]);
  const filtered = filter === 'All' ? schemes : schemes.filter((s) => s.tag === filter);

  function requireSignIn(open: () => void) {
    if (!isSignedIn) {
      router.push('/login?next=%2Fschemes');
      return;
    }
    setError('');
    setDone('');
    open();
  }

  function handleApply(formData: FormData) {
    if (modal?.kind !== 'apply') return;
    setError('');
    startTransition(async () => {
      try {
        await submitSchemeApplication({
          schemeId: modal.scheme.id,
          applicantName: String(formData.get('applicantName') ?? ''),
          mobile: String(formData.get('mobile') ?? ''),
          village: String(formData.get('village') ?? ''),
          animalCount: String(formData.get('animalCount') ?? ''),
        });
        setDone(`Application saved for ${formData.get('applicantName')}.`);
        setModal(null);
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Could not save. Try again.');
      }
    });
  }

  function handleAddForm(formData: FormData) {
    setError('');
    startTransition(async () => {
      try {
        await addScheme(formData);
        setDone('Form added.');
        setModal(null);
        router.refresh();
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Could not add the form. Try again.');
      }
    });
  }

  return (
    <main className="schemes-page">
      <div className="sec-head">
        <div>
          <h1 style={{ fontSize: 'clamp(1.9rem, 3.4vw, 2.7rem)' }}>Schemes and application forms</h1>
          <p>
            Help farmers apply without a trip to the office. Fill online, or download the printed form. Add your own
            raw copies so every dispensary works from the same version.
          </p>
        </div>
        <button type="button" className="button-ghost button-sm" onClick={() => requireSignIn(() => setModal({ kind: 'add' }))}>
          Add a form
        </button>
      </div>

      {done && <p className="notice-text">{done}</p>}

      <div className="chips">
        {tags.map((t) => (
          <button key={t} type="button" aria-pressed={t === filter} onClick={() => setFilter(t)}>
            {t}
          </button>
        ))}
      </div>

      <div className="rows">
        {filtered.length === 0 && <p className="muted">No forms in this category yet.</p>}
        {filtered.map((s) => (
          <div className="row" key={s.id}>
            <div>
              <h3>{s.name}</h3>
              <p>{s.description}</p>
            </div>
            <span className={`tag ${s.tag}`}>{s.tag}</span>
            <div className="r-actions">
              <button
                type="button"
                className="button-primary button-sm"
                onClick={() => requireSignIn(() => setModal({ kind: 'apply', scheme: s }))}
              >
                Fill online
              </button>
              {s.fileUrl ? (
                <a className="button-ghost button-sm" href={s.fileUrl} target="_blank" rel="noopener noreferrer">
                  Download form
                </a>
              ) : (
                <span className="muted small">No file uploaded yet</span>
              )}
            </div>
          </div>
        ))}
      </div>

      {modal?.kind === 'apply' && (
        <div className="modal-bg" role="dialog" aria-modal="true" onClick={() => setModal(null)}>
          <form
            className="modal"
            onClick={(e) => e.stopPropagation()}
            action={handleApply}
          >
            <h3>{modal.scheme.name}</h3>
            <p>{modal.scheme.description}</p>
            {error && <p className="error-text">{error}</p>}
            <label className="fld">
              <span>Applicant&apos;s name</span>
              <input name="applicantName" required />
            </label>
            <label className="fld">
              <span>Mobile number</span>
              <input name="mobile" inputMode="tel" />
            </label>
            <label className="fld">
              <span>Village</span>
              <input name="village" />
            </label>
            <label className="fld">
              <span>Number of animals</span>
              <input name="animalCount" type="number" min="0" />
            </label>
            <div className="modal-actions">
              <button type="button" className="button-ghost button-sm" onClick={() => setModal(null)}>
                Cancel
              </button>
              <button type="submit" className="button-primary button-sm" disabled={isPending}>
                Save application
              </button>
            </div>
          </form>
        </div>
      )}

      {modal?.kind === 'add' && (
        <div className="modal-bg" role="dialog" aria-modal="true" onClick={() => setModal(null)}>
          <form className="modal" onClick={(e) => e.stopPropagation()} action={handleAddForm}>
            <h3>Add a form</h3>
            <p>Upload a raw copy of a scheme application or register. It appears in the list so any vet can download it.</p>
            {error && <p className="error-text">{error}</p>}
            <label className="fld">
              <span>Form name</span>
              <input name="name" required placeholder="e.g. Sheep and goat unit subsidy application" />
            </label>
            <label className="fld">
              <span>Category</span>
              <select name="tag" defaultValue={SCHEME_TAGS[0]}>
                {SCHEME_TAGS.map((t) => (
                  <option key={t}>{t}</option>
                ))}
              </select>
            </label>
            <label className="fld">
              <span>Who it is for</span>
              <input name="description" placeholder="One line on who should use this form" />
            </label>
            <label className="fld">
              <span>File (PDF, Word or image, up to 10 MB)</span>
              <input name="file" type="file" accept=".pdf,.doc,.docx,image/*" />
            </label>
            <div className="modal-actions">
              <button type="button" className="button-ghost button-sm" onClick={() => setModal(null)}>
                Cancel
              </button>
              <button type="submit" className="button-primary button-sm" disabled={isPending}>
                Add form
              </button>
            </div>
          </form>
        </div>
      )}
    </main>
  );
}
