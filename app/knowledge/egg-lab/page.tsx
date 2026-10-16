import type { Metadata } from 'next';
import Link from 'next/link';
import EggLab from '@/components/knowledge/egg-lab/EggLab';
import '../knowledge.css';

export const metadata: Metadata = {
  title: '3D Poultry Egg Lab | Pasunestam',
  description: 'Watch a hen’s egg form in 3D: the hormones, each part of the oviduct, and every layer from yolk to shell.',
};

export default function EggLabPage() {
  return (
    <main className="knowledge-page ai-lab-page">
      <p className="kh-back">
        <Link href="/knowledge">← Knowledge hub</Link>
      </p>
      <div className="sec-head">
        <div>
          <h1>
            3D Poultry Egg Lab <span className="kh-preview-tag">Preview</span>
          </h1>
          <p>
            Follow one yolk from the hen’s ovary to the cloaca. See which hormone does what, which part of the oviduct adds which layer, and watch the egg
            being built — cut in half so every layer is visible. Typical timings for a laying hen; individual hens vary.
          </p>
        </div>
      </div>
      <EggLab />
    </main>
  );
}
