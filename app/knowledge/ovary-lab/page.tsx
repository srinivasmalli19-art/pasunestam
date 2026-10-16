import type { Metadata } from 'next';
import Link from 'next/link';
import OvaryLab from '@/components/knowledge/ovary-lab/OvaryLab';
import '../knowledge.css';

export const metadata: Metadata = {
  title: '3D Ovary Palpation — CL, Follicle, Cysts | Pasunestam',
  description: 'Learn to tell a follicle, corpus luteum, follicular cyst, luteal cyst and inactive ovary apart by rectal palpation, in 3D, for cows and buffaloes.',
};

export default function OvaryLabPage() {
  return (
    <main className="knowledge-page ai-lab-page">
      <p className="kh-back">
        <Link href="/knowledge">← Knowledge hub</Link>
      </p>
      <div className="sec-head">
        <div>
          <h1>
            3D Ovary Palpation <span className="kh-preview-tag">Preview</span>
          </h1>
          <p>
            What does a follicle, a corpus luteum, a follicular cyst, a luteal cyst or an inactive ovary feel like per rectum? Press each one, cut it open, compare sizes — then test
            yourself in the quiz.
          </p>
        </div>
      </div>
      <OvaryLab />
    </main>
  );
}
