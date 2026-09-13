'use client';

import { useEffect, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import CertificatePreview from './CertificatePreview';
import { saveDraftCertificate, issueCertificate } from '@/lib/certificates/actions';
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
  initialData: CertificateData;
  initialAnimals: CertificateData[];
  certificateId: string | null;
  status: CertificateStatus;
  number: string | null;
}

const MAX_ANIMALS = 20;

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
  initialData,
  initialAnimals,
  certificateId: initialCertificateId,
  status: initialStatus,
  number: initialNumber,
}: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const [profileState, setProfileState] = useState<ProfileState>({
    fullName: profile?.fullName ?? '',
    designation: profile?.designation ?? 'Veterinary Assistant Surgeon',
    registrationNo: profile?.registrationNo ?? '',
    institution: profile?.institution ?? '',
    mandal: profile?.mandal ?? '',
    district: profile?.district ?? '',
  });
  const [data, setData] = useState<CertificateData>(() => {
    const withDefaults: CertificateData = { ...initialData };
    for (const field of template.fields) {
      if (withDefaults[field.id] === undefined) {
        withDefaults[field.id] = field.type === 'select' && field.options?.length ? field.options[0] : '';
      }
    }
    return withDefaults;
  });
  const [animals, setAnimals] = useState<CertificateData[]>(() => {
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

  async function persistDraft(): Promise<Certificate> {
    const cert = await saveDraftCertificate({ certificateId, templateId: template.id, data, animals, profile: profileState });
    setCertificateId(cert.id);
    setStatus(cert.status);
    setDirty(false);
    if (!initialCertificateId) {
      router.replace(`/desk/certificates/new/${template.key}?draft=${cert.id}`);
    }
    return cert;
  }

  function handleSave() {
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
        const saved = await persistDraft();
        const issuedCert = await issueCertificate(saved.id);
        setCertificateId(issuedCert.id);
        setStatus(issuedCert.status);
        setNumber(issuedCert.number);
        setDirty(false);
        setNote(`${template.name} ${issuedCert.number} issued.`);
        if (!initialCertificateId) {
          router.replace(`/desk/certificates/new/${template.key}?draft=${issuedCert.id}`);
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
        <button type="button" className="button-ghost button-sm" onClick={() => goTo('/desk')}>
          Close
        </button>
        <h2 style={{ fontSize: '1.35rem', margin: 0 }}>{template.name}</h2>
        <div className="b-tabs">
          {templates.map((t) => (
            <button
              key={t.key}
              type="button"
              aria-current={t.key === template.key}
              onClick={() => t.key !== template.key && goTo(`/desk/certificates/new/${t.key}`)}
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

          {template.animalFields && template.animalFields.length > 0 && (
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
                  {template.animalFields!.map((field) => (
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
              titleEn={template.titleEn}
              titleTe={template.titleTe}
              body={template.body}
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
                Save and continue
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
