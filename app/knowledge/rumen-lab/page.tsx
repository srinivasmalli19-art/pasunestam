import type { Metadata } from 'next';
import Link from 'next/link';
import RumenLab from '@/components/knowledge/rumen-lab/RumenLab';
import '../knowledge.css';

export const metadata: Metadata = {
  title: '3D Ruminant Digestive System | Pasunestam',
  description: 'Rumen, reticulum, omasum and abomasum in 3D: where they lie, what is inside, how food moves, and bloat, hardware disease, LDA and RDA.',
};

export default function RumenLabPage() {
  return (
    <main className="knowledge-page ai-lab-page">
      <p className="kh-back">
        <Link href="/knowledge">← Knowledge hub</Link>
      </p>
      <div className="sec-head">
        <div>
          <h1>
            3D Ruminant Digestive System <span className="kh-preview-tag">Preview</span>
          </h1>
          <p>
            The cow’s four-compartment stomach and intestines in place inside the body. Open the compartments to see their linings, follow food from the mouth to the
            intestine, and see what goes wrong in bloat, hardware disease and displaced abomasum.
          </p>
        </div>
      </div>
      <RumenLab />
    </main>
  );
}
