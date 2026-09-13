'use client';

import { useMemo, useState } from 'react';
import type { Article } from '@/lib/news/types';
import './news.css';

function formatDate(iso: string): string {
  const d = new Date(iso + 'T00:00:00');
  return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

export default function NewsBrowser({ articles }: { articles: Article[] }) {
  const [filter, setFilter] = useState('All');
  const [openArticle, setOpenArticle] = useState<Article | null>(null);

  const categories = useMemo(() => ['All', ...new Set(articles.map((a) => a.category))], [articles]);
  const filtered = filter === 'All' ? articles : articles.filter((a) => a.category === filter);
  const [feature, ...rest] = filtered;

  return (
    <main className="news-page">
      <div className="sec-head">
        <div>
          <h1 style={{ fontSize: 'clamp(1.9rem, 3.4vw, 2.7rem)' }}>Vet news</h1>
          <p>New technology, disease alerts and breeding updates from the field.</p>
        </div>
      </div>

      <div className="chips">
        {categories.map((c) => (
          <button key={c} type="button" aria-pressed={c === filter} onClick={() => setFilter(c)}>
            {c}
          </button>
        ))}
      </div>

      {feature && (
        <button className="feature" type="button" onClick={() => setOpenArticle(feature)}>
          <span className="cat">{feature.category}</span>
          <h3>{feature.title}</h3>
          <p>{feature.excerpt}</p>
        </button>
      )}

      <div className="n-list">
        {rest.map((a) => (
          <button className="n-item" type="button" key={a.id} onClick={() => setOpenArticle(a)}>
            <small>
              {a.category}
              <br />
              {formatDate(a.date)}
            </small>
            <span>
              <h4>{a.title}</h4>
              <p>{a.excerpt}</p>
            </span>
          </button>
        ))}
      </div>

      {openArticle && (
        <div className="modal-bg" role="dialog" aria-modal="true" onClick={() => setOpenArticle(null)}>
          <article className="modal" onClick={(e) => e.stopPropagation()}>
            <span className="cat">{openArticle.category}</span>
            <h3>{openArticle.title}</h3>
            <p className="muted small">
              {formatDate(openArticle.date)}, {openArticle.readMinutes} min read
            </p>
            <p>{openArticle.excerpt}</p>
            <p className="muted">
              This is sample text. The published article, with images, references and the author&apos;s name, will
              appear here.
            </p>
            <div className="modal-actions">
              <button type="button" className="button-primary button-sm" onClick={() => setOpenArticle(null)}>
                Close
              </button>
            </div>
          </article>
        </div>
      )}
    </main>
  );
}
