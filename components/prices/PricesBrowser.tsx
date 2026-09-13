'use client';

import { useMemo, useState } from 'react';
import type { Product } from '@/lib/prices/types';
import '../../app/prices/prices.css';

const rupee = (n: number) => '₹' + n.toLocaleString('en-IN');
const bestOf = (p: Product) => Math.min(...p.offers.map((o) => o.price + o.ship));

export default function PricesBrowser({ products }: { products: Product[] }) {
  const [query, setQuery] = useState('');
  const [selectedId, setSelectedId] = useState(products[0]?.id ?? '');
  const [note, setNote] = useState('');

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return products;
    return products.filter((p) => (p.name + ' ' + p.category).toLowerCase().includes(q));
  }, [query, products]);

  const selected = products.find((p) => p.id === selectedId) ?? filtered[0] ?? null;
  const offers = selected
    ? [...selected.offers].map((o) => ({ ...o, total: o.price + o.ship })).sort((a, b) => a.total - b.total)
    : [];
  const max = offers.length ? offers[offers.length - 1].total : 0;

  return (
    <main className="prices-page">
      <div className="sec-head">
        <div>
          <h1 style={{ fontSize: 'clamp(1.9rem, 3.4vw, 2.7rem)' }}>Best price for your supplies</h1>
          <p>Pick a product and see every seller side by side, delivery included, so you pay the lowest total.</p>
        </div>
      </div>
      <div className="price-wrap">
        <div>
          <input
            className="p-search"
            type="search"
            placeholder="Find a medicine, supplement or instrument"
            aria-label="Find a product"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          <div className="plist">
            {filtered.length ? (
              filtered.map((p) => (
                <button key={p.id} type="button" aria-pressed={p.id === selected?.id} onClick={() => setSelectedId(p.id)}>
                  <b>{p.name}</b>
                  <small>from {rupee(bestOf(p))}</small>
                </button>
              ))
            ) : (
              <p className="muted">No product matches &quot;{query}&quot;. Try a shorter word, like &quot;gel&quot; or &quot;gloves&quot;.</p>
            )}
          </div>
        </div>
        <div className="compare" aria-live="polite">
          {selected && offers.length > 0 && (
            <>
              <div className="cmp-head">
                <div>
                  <span className="muted small">
                    {selected.category}, {offers.length} sellers
                  </span>
                  <h3>{selected.name}</h3>
                </div>
                <div className="save">
                  <b>{rupee(max - offers[0].total)}</b>
                  <span>saved vs the costliest seller</span>
                </div>
              </div>
              {offers.map((o, k) => (
                <div className={`offer ${k === 0 ? 'best' : ''}`} key={o.store}>
                  <div>
                    <b>{o.store}</b>
                    <small>
                      {o.ship ? `+${rupee(o.ship)} delivery` : 'Free delivery'}, {o.days} days
                    </small>
                  </div>
                  <div className="bar" aria-hidden="true">
                    <i style={{ width: `${((o.total / max) * 100).toFixed(1)}%` }} />
                  </div>
                  <div className="amt">
                    <b>{rupee(o.total)}</b>
                    {k === 0 ? <small className="best-l">Lowest total</small> : <small>{rupee(o.price)} + delivery</small>}
                  </div>
                </div>
              ))}
              <div className="cmp-foot">
                <span className="muted small">{note || 'Sample prices — real seller links are a future step.'}</span>
                <button
                  type="button"
                  className="button-primary button-sm"
                  onClick={() => setNote(`Would open ${offers[0].store} in a new tab, once real store links are wired up.`)}
                >
                  Buy from {offers[0].store}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </main>
  );
}
