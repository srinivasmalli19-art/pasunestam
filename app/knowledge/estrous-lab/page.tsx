import type { Metadata } from 'next';
import Link from 'next/link';
import EstrousLab from '@/components/knowledge/estrous-lab/EstrousLab';
import '../knowledge.css';

export const metadata: Metadata = {
  title: '3D Estrous Cycle Lab | Pasunestam',
  description: 'See the cow’s estrous cycle in 3D: hormones, follicles, ovulation, the corpus luteum, fertilisation and early pregnancy.',
};

export default function EstrousLabPage() {
  return (
    <main className="knowledge-page ai-lab-page">
      <p className="kh-back">
        <Link href="/knowledge">← Knowledge hub</Link>
      </p>
      <div className="sec-head">
        <div>
          <h1>
            3D Estrous Cycle Lab <span className="kh-preview-tag">Preview</span>
          </h1>
          <p>
            Follow the cow’s cycle day by day — which hormone is released where, where it acts, and what happens next —
            then choose whether she conceives and follow the embryo to implantation. Typical timings; individual cows vary.
          </p>
        </div>
      </div>
      <EstrousLab />
    </main>
  );
}
