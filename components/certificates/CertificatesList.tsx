'use client';

import { useState } from 'react';
import Link from 'next/link';
import type { CertificateStatus } from '@/lib/certificates/types';
import './certificates-list.css';

export interface CertificateRow {
  id: string;
  templateKey: string;
  templateName: string;
  status: CertificateStatus;
  number: string | null;
  owner: string;
  updatedAt: string;
}

interface Props {
  certificates: CertificateRow[];
}

const STATUS_LABEL: Record<CertificateStatus, string> = {
  draft: 'Draft',
  issued: 'Issued',
  cancelled: 'Cancelled',
};

export default function CertificatesList({ certificates }: Props) {
  const [query, setQuery] = useState('');
  const [toast, setToast] = useState('');

  const filtered = certificates.filter((c) => {
    const q = query.trim().toLowerCase();
    if (!q) return true;
    return (c.owner + ' ' + (c.number ?? '') + ' ' + c.templateName).toLowerCase().includes(q);
  });

  async function share(c: CertificateRow) {
    const text = `${c.templateName}${c.number ? ' ' + c.number : ''}${c.owner ? ' for ' + c.owner : ''}`;
    if (navigator.share) {
      try {
        await navigator.share({ title: c.templateName, text });
      } catch {
        // user cancelled the share sheet — nothing to do
      }
      return;
    }
    try {
      await navigator.clipboard.writeText(text);
      setToast('Copied to clipboard — paste it into WhatsApp, email, or anywhere else.');
    } catch {
      setToast('Could not share on this browser.');
    }
    setTimeout(() => setToast(''), 3200);
  }

  return (
    <main className="container certs-list-page">
      <div className="certs-list-head">
        <h1 style={{ fontSize: '1.8rem' }}>Saved certificates</h1>
        <Link href="/" className="button-ghost button-sm" style={{ width: 'auto' }}>
          Back to desk
        </Link>
      </div>
      <input
        className="certs-search"
        type="search"
        placeholder="Search by owner, number or type"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
      />

      {toast && <p className="notice-text">{toast}</p>}

      {filtered.length === 0 ? (
        <p className="muted">
          {certificates.length === 0
            ? 'Nothing saved yet. Issue or save a draft from the desk to see it here.'
            : 'No certificate matches your search.'}
        </p>
      ) : (
        <ul className="certs-rows">
          {filtered.map((c) => (
            <li key={c.id} className="certs-row">
              <div className="certs-row-main">
                <span className={`certs-status certs-status-${c.status}`}>{STATUS_LABEL[c.status]}</span>
                <div>
                  <b>{c.templateName}</b>
                  <div className="muted small">
                    {c.owner || 'No owner name yet'}
                    {c.number ? ` · ${c.number}` : ''}
                  </div>
                </div>
              </div>
              <div className="certs-row-actions">
                <Link
                  href={`/certificates/new/${c.templateKey}?draft=${c.id}`}
                  className="button-ghost button-sm"
                >
                  {c.status === 'draft' ? 'Continue editing' : 'View'}
                </Link>
                {c.status === 'issued' && (
                  <button type="button" className="button-ghost button-sm" onClick={() => share(c)}>
                    Share
                  </button>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
