'use client';

import { useState, useTransition } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import CertificatePreview from './CertificatePreview';
import { saveDraftCertificate, issueCertificate } from '@/lib/certificates/actions';
import type { CertificateData, CertificateField, CertificateStatus, CertificateTemplate } from '@/lib/certificates/types';
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
  certificateId: string | null;
  status: CertificateStatus;
  number: string | null;
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
  const [certificateId, setCertificateId] = useState(initialCertificateId);
  const [status, setStatus] = useState<CertificateStatus>(initialStatus);
  const [number, setNumber] = useState(initialNumber);
  const [note, setNote] = useState('');
  const [error, setError] = useState('');

  const issued = status === 'issued';

  function updateField(id: string, value: string) {
    setData((prev) => ({ ...prev, [id]: value }));
  }
  function updateProfile(id: keyof ProfileState, value: string) {
    setProfileState((prev) => ({ ...prev, [id]: value }));
  }

  function handleSave() {
    setError('');
    startTransition(async () => {
      try {
        const cert = await saveDraftCertificate({
          certificateId,
          templateId: template.id,
          data,
          profile: profileState,
        });
        setCertificateId(cert.id);
        setStatus(cert.status);
        setNote(`Saved at ${new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}`);
        if (!initialCertificateId) {
          router.replace(`/desk/certificates/new/${template.key}?draft=${cert.id}`);
        }
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
        const saved = await saveDraftCertificate({
          certificateId,
          templateId: template.id,
          data,
          profile: profileState,
        });
        const issuedCert = await issueCertificate(saved.id);
        setCertificateId(issuedCert.id);
        setStatus(issuedCert.status);
        setNumber(issuedCert.number);
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

  return (
    <div className="builder">
      <div className="b-head">
        <Link href="/desk" className="button-ghost button-sm">
          Close
        </Link>
        <h2 style={{ fontSize: '1.35rem', margin: 0 }}>{template.name}</h2>
        <div className="b-tabs">
          {templates.map((t) => (
            <Link key={t.key} href={`/desk/certificates/new/${t.key}`} aria-current={t.key === template.key}>
              {t.name}
            </Link>
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
          <button
            type="button"
            className="button-primary button-sm"
            disabled={isPending || issued}
            onClick={handleIssue}
          >
            Issue and print
          </button>
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
        </form>

        <div className="b-preview">
          <div className="cert-print-area">
            <CertificatePreview
              titleEn={template.titleEn}
              titleTe={template.titleTe}
              body={template.body}
              data={data}
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
