import type { Metadata } from 'next';
import Link from 'next/link';
import AnatomyLab from '@/components/knowledge/anatomy-lab/AnatomyLab';
import '../knowledge.css';

export const metadata: Metadata = {
  title: '3D Cow Anatomy — Bones | Pasunestam',
  description: 'The cow skeleton in 3D: tap any bone to see it big with its grooves, processes, foramina and clinical landmarks.',
};

export default function AnatomyLabPage() {
  return (
    <main className="knowledge-page ai-lab-page">
      <p className="kh-back">
        <Link href="/knowledge">← Knowledge hub</Link>
      </p>
      <div className="sec-head">
        <div>
          <h1>
            3D Cow Anatomy — Bones <span className="kh-preview-tag">Preview</span>
          </h1>
          <p>
            Turn the whole skeleton, tap any bone and study it big beside the skeleton — with its processes, grooves, fossae, foramina and the landmarks
            used in clinical work numbered and explained.
          </p>
        </div>
      </div>
      <AnatomyLab />
    </main>
  );
}
