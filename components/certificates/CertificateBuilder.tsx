'use client';

import { useEffect, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import CertificatePreview from './CertificatePreview';
import { saveDraftCertificate, issueCertificate, issueCertificateDirect } from '@/lib/certificates/actions';
import type { Certificate, CertificateData, CertificateField, CertificateStatus, CertificateTemplate } from '@/lib/certificates/types';
import './certificate-builder.css';

interface ProfileRow {
  fullName: string | null;
  designation: string;
  registrationNo: string | null;
  institution: string | null;
  mandal: string | null;
  district: string | null;
}

interface Props {
  template: CertificateTemplate;
  templates: Array<{ id: string; key: string; name: string }>;
  profile: ProfileRow | null;
  /** Whether saving a draft can proceed immediately, or needs a sign-in detour first — see handleSave. */
  signedIn: boolean;
  initialData: CertificateData;
  initialAnimals: CertificateData[];
  /** Only meaningful when template.key === 'health' — whether to show the price row/field ("Health certificate") or not ("Health and valuation certificate"). */
  initialVariant?: 'full' | 'health-only';
  certificateId: string | null;
  status: CertificateStatus;
  number: string | null;
}

const MAX_ANIMALS = 20;
// The one field that distinguishes a pure Health Certificate from the
// combined Health and Valuation Certificate — see the type switcher in the
// builder header.
const VALUATION_ONLY_FIELD = 'price';

// "Save draft" needs an account; filling, previewing, printing and issuing
// don't. Rather than lose what a signed-out vet typed when they're sent off
// to sign in, it's stashed here first and restored (then auto-saved) once
// they're back — see the mount effect below and requestSignInToSave.
const SAVE_STASH_PREFIX = 'pasunestam:pending-save:';
function stashKey(templateKey: string): string {
  return `${SAVE_STASH_PREFIX}${templateKey}`;
}
interface SaveStash {
  data: CertificateData;
  animals: CertificateData[];
  profileState: ProfileState;
  healthVariant: 'full' | 'health-only';
  pendingHref: string | null;
}
/** A pure read (no removal) — safe to call from a useState initializer, including under Strict Mode's double-invoke. */
function peekStash(templateKey: string): SaveStash | null {
  try {
    const raw = sessionStorage.getItem(stashKey(templateKey));
    return raw ? (JSON.parse(raw) as SaveStash) : null;
  } catch {
    return null;
  }
}

function blankAnimal(fields: CertificateField[]): CertificateData {
  const animal: CertificateData = {};
  for (const field of fields) {
    animal[field.id] = field.type === 'select' && field.options?.length ? field.options[0] : '';
  }
  return animal;
}

type ProfileState = {
  fullName: string;
  designation: string;
  registrationNo: string;
  institution: string;
  mandal: string;
  district: string;
};

export default function CertificateBuilder({
  template,
  templates,
  profile,
  signedIn,
  initialData,
  initialAnimals,
  initialVariant,
  certificateId: initialCertificateId,
  status: initialStatus,
  number: initialNumber,
}: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  // A certificate stashed by requestSignInToSave right before a sign-in
  // detour, picked up again on the fresh mount that follows /login's
  // redirect back here — only meaningful when actually signed in now, so a
  // signed-out visit never silently resurrects an abandoned attempt. A pure
  // read (no removal yet), so it's safe under Strict Mode's double-invoke.
  const [stash] = useState<SaveStash | null>(() =>
    signedIn && !initialCertificateId ? peekStash(template.key) : null
  );

  const [healthVariant, setHealthVariant] = useState<'full' | 'health-only'>(
    stash?.healthVariant ?? initialVariant ?? 'full'
  );

  const [profileState, setProfileState] = useState<ProfileState>(
    stash?.profileState ?? {
      fullName: profile?.fullName ?? '',
      designation: profile?.designation ?? 'Veterinary Assistant Surgeon',
      registrationNo: profile?.registrationNo ?? '',
      institution: profile?.institution ?? '',
      mandal: profile?.mandal ?? '',
      district: profile?.district ?? '',
    }
  );
  const [data, setData] = useState<CertificateData>(() => {
    const withDefaults: CertificateData = { ...(stash?.data ?? initialData) };
    for (const field of template.fields) {
      if (withDefaults[field.id] === undefined) {
        withDefaults[field.id] = field.type === 'select' && field.options?.length ? field.options[0] : '';
      }
    }
    return withDefaults;
  });
  const [animals, setAnimals] = useState<CertificateData[]>(() => {
    if (stash?.animals.length) return stash.animals;
    if (initialAnimals.length) return initialAnimals;
    // Start with one blank animal so the "Animals" section isn't empty on a fresh certificate.
    return template.animalFields?.length ? [blankAnimal(template.animalFields)] : [];
  });
  const [certificateId, setCertificateId] = useState(initialCertificateId);
  const [status, setStatus] = useState<CertificateStatus>(initialStatus);
  const [number, setNumber] = useState(initialNumber);
  const [note, setNote] = useState('');
  const [error, setError] = useState('');
  const [dirty, setDirty] = useState(false);
  const [pendingHref, setPendingHref] = useState<string | null>(null);
  const [showAuthGate, setShowAuthGate] = useState(false);

  const issued = status === 'issued';

  // Warn on closing the tab/browser, too, not just in-app navigation.
  useEffect(() => {
    if (!dirty) return;
    const handler = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = '';
    };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [dirty]);

  // Finishes the save the vet originally asked for, now that `stash` (if
  // any) has already seeded the form state above. Only a sessionStorage
  // clear and an async save happen here — no direct setState in the
  // effect's own body, since those already ran as part of the state
  // initializers above.
  useEffect(() => {
    if (!stash) return;
    try {
      sessionStorage.removeItem(stashKey(template.key));
    } catch {
      /* ignore */
    }
    (async () => {
      try {
        const cert = await saveDraftCertificate({
          certificateId: null,
          templateId: template.id,
          data: stash.data,
          animals: stash.animals,
          profile: stash.profileState,
        });
        setCertificateId(cert.id);
        setStatus(cert.status);
        setDirty(false);
        setNote('Signed in and saved.');
        router.replace(`/certificates/new/${template.key}?draft=${cert.id}`);
        if (stash.pendingHref) router.push(stash.pendingHref);
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Signed in, but could not save automatically — try Save draft again.');
      }
    })();
    // Only ever meant to run once, right after mount.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function updateField(id: string, value: string) {
    setData((prev) => ({ ...prev, [id]: value }));
    setDirty(true);
  }
  function updateProfile(id: keyof ProfileState, value: string) {
    setProfileState((prev) => ({ ...prev, [id]: value }));
    setDirty(true);
  }
  function updateAnimalField(index: number, fieldId: string, value: string) {
    setAnimals((prev) => prev.map((animal, i) => (i === index ? { ...animal, [fieldId]: value } : animal)));
    setDirty(true);
  }
  function addAnimal() {
    if (!template.animalFields?.length || animals.length >= MAX_ANIMALS) return;
    setAnimals((prev) => [...prev, blankAnimal(template.animalFields!)]);
    setDirty(true);
  }
  function removeAnimal(index: number) {
    setAnimals((prev) => (prev.length > 1 ? prev.filter((_, i) => i !== index) : prev));
    setDirty(true);
  }

  const isHealthOnly = template.key === 'health' && healthVariant === 'health-only';
  const effectiveAnimalFields = isHealthOnly
    ? template.animalFields?.filter((f) => f.id !== VALUATION_ONLY_FIELD)
    : template.animalFields;
  const effectiveBody = isHealthOnly
    ? template.body.map((block) =>
        block.type === 'animal-table' ? { ...block, rows: block.rows.filter((r) => r.field !== VALUATION_ONLY_FIELD) } : block
      )
    : template.body;
  const effectiveTitleEn = isHealthOnly ? 'Health Certificate' : template.titleEn;
  const effectiveTitleTe = isHealthOnly ? 'ఆరోగ్య ధృవీకరణ పత్రం' : template.titleTe;

  function selectCertificateType(value: string) {
    if (value === 'health-only' || value === 'full') {
      if (template.key !== 'health') {
        goTo(`/certificates/new/health?variant=${value}`);
      } else {
        setHealthVariant(value);
        setDirty(true);
      }
      return;
    }
    if (value !== template.key) goTo(`/certificates/new/${value}`);
  }

  /** The URL for this certificate as currently being edited — never includes ?draft=, since nothing's saved yet by the time this is needed. */
  function currentPath(): string {
    const variant = template.key === 'health' ? `?variant=${healthVariant}` : '';
    return `/certificates/new/${template.key}${variant}`;
  }

  function requestSignInToSave(afterHref: string | null) {
    try {
      const stash: SaveStash = { data, animals, profileState, healthVariant, pendingHref: afterHref };
      sessionStorage.setItem(stashKey(template.key), JSON.stringify(stash));
    } catch {
      /* sessionStorage unavailable — sign-in still works, the typed details just won't survive the detour */
    }
    setShowAuthGate(true);
  }

  function cancelAuthGate() {
    try {
      sessionStorage.removeItem(stashKey(template.key));
    } catch {
      /* ignore */
    }
    setShowAuthGate(false);
  }

  async function persistDraft(): Promise<Certificate> {
    const cert = await saveDraftCertificate({ certificateId, templateId: template.id, data, animals, profile: profileState });
    setCertificateId(cert.id);
    setStatus(cert.status);
    setDirty(false);
    if (!initialCertificateId) {
      router.replace(`/certificates/new/${template.key}?draft=${cert.id}`);
    }
    return cert;
  }

  function handleSave() {
    if (!signedIn) {
      requestSignInToSave(null);
      return;
    }
    setError('');
    startTransition(async () => {
      try {
        await persistDraft();
        setNote(`Saved at ${new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}`);
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Could not save. Try again.');
      }
    });
  }

  function handleIssue() {
    setError('');
    if (!profileState.fullName.trim() || !profileState.institution.trim()) {
      setError("Add the veterinarian's name and institution before issuing.");
      return;
    }
    const hasOwnerField = template.fields.some((f) => f.id === 'owner');
    if (hasOwnerField && !data.owner?.trim()) {
      setError("Add the owner's name before issuing.");
      return;
    }
    startTransition(async () => {
      try {
        // Issuing doesn't need an account — a certificate with no saved
        // draft yet is created and issued in one step; one that was already
        // saved as a draft (only possible while signed in) is issued as before.
        const issuedCert = certificateId
          ? await issueCertificate((await persistDraft()).id)
          : await issueCertificateDirect({ templateId: template.id, data, animals, profile: profileState });
        setCertificateId(issuedCert.id);
        setStatus(issuedCert.status);
        setNumber(issuedCert.number);
        setDirty(false);
        setNote(`${template.name} ${issuedCert.number} issued.`);
        if (!initialCertificateId) {
          router.replace(`/certificates/new/${template.key}?draft=${issuedCert.id}`);
        }
        setTimeout(() => window.print(), 400);
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Could not issue. Try again.');
      }
    });
  }

  function goTo(href: string) {
    if (dirty) {
      setPendingHref(href);
    } else {
      router.push(href);
    }
  }

  function discardAndGo() {
    if (pendingHref) router.push(pendingHref);
    setPendingHref(null);
  }

  function saveAndGo() {
    if (!signedIn) {
      const afterHref = pendingHref;
      setPendingHref(null);
      requestSignInToSave(afterHref);
      return;
    }
    setError('');
    startTransition(async () => {
      try {
        await persistDraft();
        if (pendingHref) router.push(pendingHref);
        setPendingHref(null);
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Could not save. Try again.');
        setPendingHref(null);
      }
    });
  }

  return (
    <div className="builder">
      <div className="b-head">
        <button type="button" className="button-ghost button-sm" onClick={() => goTo('/')}>
          Close
        </button>
        <h2 style={{ fontSize: '1.35rem', margin: 0 }}>{template.name}</h2>
        <div className="b-tabs" role="group" aria-label="Certificate type">
          <button
            type="button"
            aria-current={template.key === 'health' && healthVariant === 'health-only'}
            onClick={() => selectCertificateType('health-only')}
          >
            Health certificate
          </button>
          <button
            type="button"
            aria-current={template.key === 'health' && healthVariant === 'full'}
            onClick={() => selectCertificateType('full')}
          >
            Health and valuation certificate
          </button>
          {templates
            .filter((t) => t.key !== 'health')
            .map((t) => (
              <button
                key={t.key}
                type="button"
                aria-current={t.key === template.key}
                onClick={() => selectCertificateType(t.key)}
              >
                {t.name}
              </button>
            ))}
        </div>
        <div className="b-actions">
          <button
            type="button"
            className="button-ghost button-sm"
            disabled={isPending || issued}
            onClick={handleSave}
          >
            Save draft
          </button>
          {issued ? (
            <button type="button" className="button-primary button-sm" onClick={() => window.print()}>
              Print / save as PDF
            </button>
          ) : (
            <button
              type="button"
              className="button-primary button-sm"
              disabled={isPending}
              onClick={handleIssue}
            >
              Issue and print
            </button>
          )}
        </div>
      </div>

      {error && (
        <p className="builder-error" style={{ margin: '12px 24px 0' }}>
          {error}
        </p>
      )}
      {!error && note && (
        <p className="builder-note ok" style={{ margin: '12px 24px 0' }}>
          {note}
        </p>
      )}
      {issued && !note && (
        <p className="builder-note ok" style={{ margin: '12px 24px 0' }}>
          This certificate is issued and read-only. Number {number}.
        </p>
      )}

      <div className="b-body">
        <form className="b-form" onSubmit={(e) => e.preventDefault()}>
          <fieldset disabled={issued}>
            <legend>Issuing veterinarian</legend>
            <label className="fld">
              <span>Veterinarian&apos;s name</span>
              <input value={profileState.fullName} onChange={(e) => updateProfile('fullName', e.target.value)} />
            </label>
            <label className="fld">
              <span>Designation</span>
              <input value={profileState.designation} onChange={(e) => updateProfile('designation', e.target.value)} />
            </label>
            <label className="fld">
              <span>Registration no.</span>
              <input
                value={profileState.registrationNo}
                onChange={(e) => updateProfile('registrationNo', e.target.value)}
              />
            </label>
            <label className="fld full">
              <span>Institution</span>
              <input
                value={profileState.institution}
                onChange={(e) => updateProfile('institution', e.target.value)}
                placeholder="Veterinary Dispensary, …"
              />
            </label>
            <label className="fld">
              <span>Mandal</span>
              <input value={profileState.mandal} onChange={(e) => updateProfile('mandal', e.target.value)} />
            </label>
            <label className="fld">
              <span>District</span>
              <input value={profileState.district} onChange={(e) => updateProfile('district', e.target.value)} />
            </label>
          </fieldset>

          <fieldset disabled={issued}>
            <legend>Animal and owner</legend>
            {template.fields.map((field) => (
              <FieldInput
                key={field.id}
                field={field}
                value={data[field.id] ?? ''}
                onChange={(v) => updateField(field.id, v)}
              />
            ))}
          </fieldset>

          {effectiveAnimalFields && effectiveAnimalFields.length > 0 && (
            <div className="animals-section">
              <legend>Animals ({animals.length})</legend>
              {animals.map((animal, index) => (
                <fieldset className="animal-fieldset" disabled={issued} key={index}>
                  <legend className="animal-legend">
                    Animal {index + 1}
                    {!issued && animals.length > 1 && (
                      <button type="button" className="linkbtn" onClick={() => removeAnimal(index)}>
                        Remove
                      </button>
                    )}
                  </legend>
                  {effectiveAnimalFields.map((field) => (
                    <FieldInput
                      key={field.id}
                      field={field}
                      value={animal[field.id] ?? ''}
                      onChange={(v) => updateAnimalField(index, field.id, v)}
                    />
                  ))}
                </fieldset>
              ))}
              {!issued && animals.length < MAX_ANIMALS && (
                <button type="button" className="button-ghost button-sm" onClick={addAnimal}>
                  + Add another animal
                </button>
              )}
            </div>
          )}
        </form>

        <div className="b-preview">
          <div className="cert-print-area">
            <CertificatePreview
              titleEn={effectiveTitleEn}
              titleTe={effectiveTitleTe}
              body={effectiveBody}
              data={data}
              animals={animals}
              profile={{
                vetName: profileState.fullName,
                designation: profileState.designation,
                registrationNo: profileState.registrationNo,
                institution: profileState.institution,
                mandal: profileState.mandal,
                district: profileState.district,
              }}
              number={number}
              issued={issued}
            />
          </div>
        </div>
      </div>

      {pendingHref && (
        <div className="modal-bg" role="dialog" aria-modal="true" aria-labelledby="unsaved-title">
          <div className="modal">
            <h3 id="unsaved-title">You have unsaved changes</h3>
            <p>Save this certificate as a draft before leaving, or discard what you&apos;ve typed?</p>
            <div className="modal-actions">
              <button type="button" className="button-ghost button-sm" onClick={() => setPendingHref(null)}>
                Cancel
              </button>
              <button type="button" className="button-ghost button-sm" onClick={discardAndGo}>
                Discard changes
              </button>
              <button type="button" className="button-primary button-sm" disabled={isPending} onClick={saveAndGo}>
                {signedIn ? 'Save and continue' : 'Sign in to save'}
              </button>
            </div>
          </div>
        </div>
      )}

      {showAuthGate && (
        <div className="modal-bg" role="dialog" aria-modal="true" aria-labelledby="authgate-title">
          <div className="modal">
            <h3 id="authgate-title">Sign in to save</h3>
            <p>
              Sign in or create a free account to save this certificate to your desk — your filled-in details will
              be kept. You can still fill, print or issue certificates without an account.
            </p>
            <div className="modal-actions">
              <button type="button" className="button-ghost button-sm" onClick={cancelAuthGate}>
                Cancel
              </button>
              <button
                type="button"
                className="button-ghost button-sm"
                onClick={() => router.push(`/signup?next=${encodeURIComponent(currentPath())}`)}
              >
                Create account
              </button>
              <button
                type="button"
                className="button-primary button-sm"
                onClick={() => router.push(`/login?next=${encodeURIComponent(currentPath())}`)}
              >
                Sign in
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function FieldInput({
  field,
  value,
  onChange,
}: {
  field: CertificateField;
  value: string;
  onChange: (value: string) => void;
}) {
  const className = `fld${field.full ? ' full' : ''}`;
  if (field.type === 'select') {
    return (
      <label className={className}>
        <span>{field.label}</span>
        <select value={value} onChange={(e) => onChange(e.target.value)}>
          {(field.options ?? []).map((o) => (
            <option key={o} value={o}>
              {o}
            </option>
          ))}
        </select>
      </label>
    );
  }
  if (field.type === 'textarea') {
    return (
      <label className={className}>
        <span>{field.label}</span>
        <textarea value={value} placeholder={field.placeholder} onChange={(e) => onChange(e.target.value)} />
      </label>
    );
  }
  return (
    <label className={className}>
      <span>{field.label}</span>
      <input
        type={field.type ?? 'text'}
        value={value}
        placeholder={field.placeholder}
        onChange={(e) => onChange(e.target.value)}
      />
    </label>
  );
}
