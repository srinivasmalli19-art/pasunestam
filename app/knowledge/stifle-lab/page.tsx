import type { Metadata } from 'next';
import Link from 'next/link';
import StifleLab from '@/components/knowledge/stifle-lab/StifleLab';
import '../knowledge.css';

export const metadata: Metadata = {
  title: '3D Stifle — Medial Patellar Desmotomy | Pasunestam',
  description: 'Upward fixation of the patella in cattle and buffaloes, and medial patellar desmotomy step by step in 3D: which ligament is cut and why.',
};

export default function StifleLabPage() {
  return (
    <main className="knowledge-page ai-lab-page">
      <p className="kh-back">
        <Link href="/knowledge">← Knowledge hub</Link> · <Link href="/knowledge/anatomy-lab">Cow anatomy — bones</Link>
      </p>
      <div className="sec-head">
        <div>
          <h1>
            3D Stifle — Medial Patellar Desmotomy <span className="kh-preview-tag">Preview</span>
          </h1>
          <p>
            See the three patellar ligaments of the ox, how the patella locks over the medial trochlear ridge in upward fixation, and the desmotomy step by step — including
            which ligament is cut.
          </p>
        </div>
      </div>
      <StifleLab />
    </main>
  );
}
