import type { Metadata } from 'next';
import Link from 'next/link';
import ParasiteLab from '@/components/knowledge/parasite-lab/ParasiteLab';
import '../knowledge.css';

export const metadata: Metadata = {
  title: '3D Parasite Life Cycles | Pasunestam',
  description: 'Liver fluke (Fasciola gigantica), Theileria annulata and Haemonchus contortus: each life cycle in 3D, stage by stage, with diagnosis, treatment and where to break the cycle.',
};

export default function ParasiteLabPage() {
  return (
    <main className="knowledge-page ai-lab-page">
      <p className="kh-back">
        <Link href="/knowledge">← Knowledge hub</Link>
      </p>
      <div className="sec-head">
        <div>
          <h1>
            3D Parasite Life Cycles <span className="kh-preview-tag">Preview</span>
          </h1>
          <p>
            Three parasites every field vet meets: the tropical liver fluke, Theileria and the barber’s pole worm. Watch each cycle go round the animal slowly, stage by stage — then
            explore any stage, see where control measures break the cycle, and test yourself.
          </p>
        </div>
      </div>
      <ParasiteLab />
    </main>
  );
}
