'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import './desk-hero.css';

export interface RecentCertificate {
  id: string;
  templateKey: string;
  templateName: string;
  number: string | null;
  owner: string;
}

export interface DeskTemplate {
  id: string;
  key: string;
  name: string;
}

interface Props {
  greeting: string;
  templates: DeskTemplate[];
  recent: RecentCertificate[];
  due: { daysLeft: number; dueDayMonth: string; monthName: string };
}

interface SearchHit {
  label: string;
  kind: string;
  href: string;
}

const TILE_CLASS: Record<string, string> = {
  health: 't-health',
  valuation: 't-val',
  postmortem: 't-pm',
};

export default function DeskHero({ greeting, templates, recent, due }: Props) {
  const [query, setQuery] = useState('');

  const searchIndex = useMemo<SearchHit[]>(() => {
    const fromTemplates = templates.map((t) => ({
      label: t.name,
      kind: 'Certificate',
      href: `/desk/certificates/new/${t.key}`,
    }));
    const fromRecent = recent.map((c) => ({
      label: `${c.templateName}${c.owner ? ` — ${c.owner}` : ''}`,
      kind: c.number ?? 'Issued',
      href: `/desk/certificates/new/${c.templateKey}?draft=${c.id}`,
    }));
    return [...fromTemplates, ...fromRecent];
  }, [templates, recent]);

  const hits = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return [];
    return searchIndex.filter((h) => (h.label + ' ' + h.kind).toLowerCase().includes(q)).slice(0, 7);
  }, [query, searchIndex]);

  const byKey = Object.fromEntries(templates.map((t) => [t.key, t]));

  return (
    <section className="hero">
      <div>
        <p className="hello">{greeting}</p>
        <h1>Every certificate, scheme and case on one desk.</h1>
        <p className="lede">
          Fill a form once, watch the certificate take shape as you type, and print it ready to sign. Schemes,
          admissions, vet news and the best price for your supplies sit right beside it.
        </p>
        <div className="search" role="search">
          <input
            type="search"
            placeholder="Search a certificate, scheme, product or article"
            aria-label="Search the site"
            autoComplete="off"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          {query.trim() && (
            <div className="results">
              {hits.length ? (
                hits.map((h) => (
                  <Link key={h.href} href={h.href}>
                    <span>{h.label}</span>
                    <small>{h.kind}</small>
                  </Link>
                ))
              ) : (
                <p>Nothing found for &quot;{query}&quot;. Try &quot;health&quot; or &quot;valuation&quot;.</p>
              )}
            </div>
          )}
        </div>
        <div className="popular">
          <span>Often used:</span>
          {byKey.health && <Link href={`/desk/certificates/new/health`}>Transport health certificate</Link>}
          {byKey.valuation && <Link href={`/desk/certificates/new/valuation`}>Insurance valuation</Link>}
          {byKey.postmortem && <Link href={`/desk/certificates/new/postmortem`}>Post-mortem report</Link>}
        </div>
      </div>

      <div className="desk" aria-label="Issue a certificate">
        {templates.map((t) => (
          <Link key={t.key} href={`/desk/certificates/new/${t.key}`} className={`tile ${TILE_CLASS[t.key] ?? ''}`}>
            {t.key === 'health' && (
              <span className="mini-doc" aria-hidden="true">
                <i></i>
                <i></i>
                <i></i>
                <i></i>
                <i></i>
                <s></s>
              </span>
            )}
            <span className="for">{TILE_SUBTITLE[t.key] ?? 'Certificate'}</span>
            <h3>{t.name}</h3>
          </Link>
        ))}
        <div className="tile t-mr">
          <span>
            <h3>Monthly return</h3>
            <span className="coming-soon">Coming soon</span>
          </span>
          <span className="due">
            <b>{due.daysLeft} days left</b>
            {due.monthName} return due {due.dueDayMonth}
          </span>
        </div>
        <div className="recent">
          <div className="recent-head">
            <h4>Recently issued</h4>
            <Link href="/desk/certificates">See all saved certificates</Link>
          </div>
          {recent.length ? (
            <ul>
              {recent.map((c) => (
                <li key={c.id}>
                  <span>
                    <b>{c.templateName}</b> for {c.owner || 'unnamed owner'}
                  </span>
                  <span>{c.number}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="empty">Nothing issued yet. Pick a certificate above to start.</p>
          )}
        </div>
      </div>
    </section>
  );
}

const TILE_SUBTITLE: Record<string, string> = {
  health: 'For transport, sale, shows and insurance',
  valuation: 'For bank loans and insurance',
  postmortem: 'For claims and police cases',
};
