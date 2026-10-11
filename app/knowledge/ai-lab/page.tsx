import type { Metadata } from 'next';
import Link from 'next/link';
import AiLab from '@/components/knowledge/ai-lab/AiLab';
import '../knowledge.css';

export const metadata: Metadata = {
  title: '3D AI practice lab | Pasunestam',
  description: 'Learn the anatomy and practise artificial insemination in cattle on a 3D model.',
};

export default function AiLabPage() {
  return (
    <main className="knowledge-page ai-lab-page">
      <p className="kh-back">
        <Link href="/knowledge">← Knowledge hub</Link>
      </p>
      <div className="sec-head">
        <div>
          <h1>
            3D AI practice lab <span className="kh-preview-tag">Preview</span>
          </h1>
          <p>
            Learn the cow’s reproductive tract, watch artificial insemination step by step, then practise passing the gun
            yourself. A teaching model with approximate sizes — it builds understanding, not the feel of the cervix in
            your hand.
          </p>
        </div>
      </div>
      <AiLab />
    </main>
  );
}
