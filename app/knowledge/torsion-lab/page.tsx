import type { Metadata } from 'next';
import Link from 'next/link';
import TorsionLab from '@/components/knowledge/torsion-lab/TorsionLab';
import '../knowledge.css';

export const metadata: Metadata = {
  title: '3D Uterine Torsion Lab | Pasunestam',
  description: 'Tell pre-cervical from post-cervical uterine torsion in 3D, and see when Schaffer’s method can correct it.',
};

export default function TorsionLabPage() {
  return (
    <main className="knowledge-page ai-lab-page">
      <p className="kh-back">
        <Link href="/knowledge">← Knowledge hub</Link>
      </p>
      <div className="sec-head">
        <div>
          <h1>
            3D Uterine Torsion Lab <span className="kh-preview-tag">Preview</span>
          </h1>
          <p>
            Identify · Decide. See how pre-cervical and post-cervical torsions differ — inside the vagina, in the broad
            ligaments and in the uterus — and whether Schaffer’s (flank) method can relieve each one. Decision support
            only: always use your clinical judgement.
          </p>
        </div>
      </div>
      <TorsionLab />
    </main>
  );
}
