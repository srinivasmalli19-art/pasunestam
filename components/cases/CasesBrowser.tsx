'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { submitCase } from '@/lib/cases/actions';
import { CASE_SPECIES, type Case } from '@/lib/cases/types';
import './cases.css';

interface Props {
  cases: Case[];
  isSignedIn: boolean;
  issueMonth: string;
}

export default function CasesBrowser({ cases, isSignedIn, issueMonth }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [species, setSpecies] = useState(CASE_SPECIES[0]);
  const [body, setBody] = useState('');
  const [error, setError] = useState('');
  const [submitted, setSubmitted] = useState(false);

  function openSubmit() {
    if (!isSignedIn) {
      router.push('/login?next=%2Fcases');
      return;
    }
    setOpen(true);
    setSubmitted(false);
    setError('');
  }

  function handleSubmit() {
    setError('');
    startTransition(async () => {
      try {
        await submitCase({ title, species, body });
        setSubmitted(true);
        setTitle('');
        setBody('');
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Could not submit. Try again.');
      }
    });
  }

  return (
    <main className="cases-page">
      <div className="digest">
        <div className="digest-l">
          <h1>Monthly case digest</h1>
          <div className="issue">{issueMonth}</div>
          <p>
            Real cases from field vets, reviewed and published every month. Share what you saw, what you tried and
            what worked, so the next vet gets there faster.
          </p>
          <div className="btns">
            <button type="button" className="button-primary button-sm" onClick={openSubmit}>
              Submit a case
            </button>
          </div>
        </div>
        <div>
          {cases.length ? (
            cases.map((c, i) => (
              <div className="case" key={c.id}>
                <span className="no">{i + 1}</span>
                <div>
                  <h4>{c.title}</h4>
                  <p>
                    <span className="sp">{c.species}</span>
                    {c.submitterName}
                  </p>
                </div>
              </div>
            ))
          ) : (
            <p className="muted">Nothing published yet this month.</p>
          )}
        </div>
      </div>

      {open && (
        <div className="modal-bg" role="dialog" aria-modal="true" onClick={() => setOpen(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            {submitted ? (
              <>
                <h3>Case submitted</h3>
                <p>Thanks — reviewed cases are published in an upcoming issue.</p>
                <div className="modal-actions">
                  <button type="button" className="button-primary button-sm" onClick={() => setOpen(false)}>
                    Close
                  </button>
                </div>
              </>
            ) : (
              <>
                <h3>Submit a case</h3>
                <p>Reviewed cases are published in an upcoming issue. Remove owner names and phone numbers from photos.</p>
                {error && <p className="error-text">{error}</p>}
                <label className="fld">
                  <span>Case title</span>
                  <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Milk fever in a Jersey cow after calving" />
                </label>
                <label className="fld">
                  <span>Species</span>
                  <select value={species} onChange={(e) => setSpecies(e.target.value)}>
                    {CASE_SPECIES.map((s) => (
                      <option key={s}>{s}</option>
                    ))}
                  </select>
                </label>
                <label className="fld">
                  <span>History, findings, treatment and outcome</span>
                  <textarea value={body} onChange={(e) => setBody(e.target.value)} style={{ minHeight: '120px' }} />
                </label>
                <div className="modal-actions">
                  <button type="button" className="button-ghost button-sm" onClick={() => setOpen(false)}>
                    Cancel
                  </button>
                  <button type="button" className="button-primary button-sm" disabled={isPending} onClick={handleSubmit}>
                    Submit case
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </main>
  );
}
