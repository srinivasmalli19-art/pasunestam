import type { Metadata } from 'next';
import Link from 'next/link';
import './knowledge.css';

export const metadata: Metadata = {
  title: 'Knowledge hub | Pasunestam',
  description: 'Clinical cases, videos, training and field guides for veterinarians.',
};

// The Knowledge hub's sections. To launch one, give it an `href` (and drop
// `soon`) once its page exists — the card becomes a link automatically.
interface Section {
  title: string;
  te: string;
  blurb: string;
  examples: string[];
  href?: string;
  soon?: boolean;
  /** Shown as a "Preview" badge: open, but still being built. */
  preview?: boolean;
  /** Spans the full width, above the others. */
  featured?: boolean;
  /** Link text; defaults to "Open <title>". */
  cta?: string;
  tone: 'leaf' | 'ink' | 'turmeric' | 'charcoal' | 'lab' | 'lab2';
}

const SECTIONS: Section[] = [
  {
    title: '3D AI practice lab',
    te: '3D కృత్రిమ గర్భధారణ సాధన',
    blurb: 'Explore the cow’s reproductive tract in 3D, watch artificial insemination step by step, then practise passing the gun yourself — with a score.',
    examples: ['3D anatomy viewer', 'Guided AI procedure', 'Interactive practice'],
    href: '/knowledge/ai-lab',
    cta: 'Open the 3D lab',
    preview: true,
    tone: 'lab',
  },
  {
    title: '3D Uterine Torsion Lab',
    te: '3D గర్భాశయ మెలిక ల్యాబ్',
    blurb: 'Tell pre-cervical from post-cervical torsion in 3D — the vaginal folds, the broad ligaments, the calf — and see whether Schaffer’s (flank) method can relieve it or surgery is needed.',
    examples: ['Pre vs post-cervical', 'Left vs right, 45°–540°', 'Flank method or surgery?'],
    href: '/knowledge/torsion-lab',
    cta: 'Open the torsion lab',
    preview: true,
    tone: 'lab2',
  },
  {
    title: 'Clinical cases',
    te: 'క్లినికల్ కేసులు',
    blurb: 'Real cases from field vets: history, findings, treatment and outcome, reviewed every month.',
    examples: ['Milk fever after calving', 'Bloat in buffaloes', 'Dystocia in goats'],
    href: '/cases',
    tone: 'leaf',
  },
  {
    title: 'Case videos',
    te: 'కేసు వీడియోలు',
    blurb: 'Short clips of procedures and clinical signs, recorded in the field and explained step by step.',
    examples: ['Rumenotomy', 'Calving assistance', 'Reading a skin lesion'],
    soon: true,
    tone: 'ink',
  },
  {
    title: 'Training videos',
    te: 'శిక్షణ వీడియోలు',
    blurb: 'Training and CPD sessions for veterinarians and para-vets, from basics to specialist skills.',
    examples: ['AI technique refresher', 'Ultrasound for pregnancy', 'Vaccination cold chain'],
    soon: true,
    tone: 'turmeric',
  },
  {
    title: 'Field guides',
    te: 'క్షేత్ర మార్గదర్శకాలు',
    blurb: 'Quick references for the dispensary: dosages, vaccination schedules, disease notes and protocols.',
    examples: ['Vaccination calendar', 'Drug withdrawal periods', 'Notifiable diseases'],
    soon: true,
    tone: 'charcoal',
  },
];

export default function KnowledgeHubPage() {
  return (
    <main className="knowledge-page">
      <div className="sec-head">
        <div>
          <h1>Knowledge hub</h1>
          <p className="kh-te">జ్ఞాన కేంద్రం</p>
          <p>Cases, videos, training and field guides for veterinarians, in one place. New sections are added as they are ready.</p>
        </div>
      </div>

      <div className="kh-grid">
        {SECTIONS.map((s) => {
          const content = (
            <>
              <div className="kh-top">
                <span className="kh-te-small">{s.te}</span>
                {s.soon ? (
                  <span className="kh-badge">Coming soon</span>
                ) : s.preview ? (
                  <span className="kh-badge kh-live">Preview</span>
                ) : (
                  <span className="kh-badge kh-live">Open</span>
                )}
              </div>
              <h2>{s.title}</h2>
              <p>{s.blurb}</p>
              <ul>
                {s.examples.map((e) => (
                  <li key={e}>{e}</li>
                ))}
              </ul>
            </>
          );
          return s.href && !s.soon ? (
            <Link key={s.title} href={s.href} className={`kh-card kh-${s.tone}${s.featured ? ' kh-featured' : ''}`}>
              {content}
              <span className="kh-go">{s.cta ?? `Open ${s.title.toLowerCase()}`} →</span>
            </Link>
          ) : (
            <div key={s.title} className={`kh-card kh-${s.tone} kh-soon`} aria-disabled="true">
              {content}
            </div>
          );
        })}
      </div>
    </main>
  );
}
