import type { Metadata } from 'next';
import Link from 'next/link';
import PregnancyLab from '@/components/knowledge/pregnancy-lab/PregnancyLab';
import '../knowledge.css';

export const metadata: Metadata = {
  title: '3D Pregnancy Month by Month — Buffalo & Cattle | Pasunestam',
  description: 'Where the uterus and fetus lie in each month of pregnancy in buffaloes and cattle, how big the fetus is, and what can be felt per rectum.',
};

export default function PregnancyLabPage() {
  return (
    <main className="knowledge-page ai-lab-page">
      <p className="kh-back">
        <Link href="/knowledge">← Knowledge hub</Link>
      </p>
      <div className="sec-head">
        <div>
          <h1>
            3D Pregnancy Month by Month <span className="kh-preview-tag">Preview</span>
          </h1>
          <p>
            Choose buffalo or cattle and a month. See where the uterus and fetus lie — from the pelvic cavity near the vulva, over the pelvic brim, deep into the abdomen and
            back to the pelvic inlet before birth — and whether a hand per rectum can reach the fetus.
          </p>
        </div>
      </div>
      <PregnancyLab />
    </main>
  );
}
