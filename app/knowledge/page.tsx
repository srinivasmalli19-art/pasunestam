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
  te?: string;
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
  tone: 'leaf' | 'ink' | 'turmeric' | 'charcoal' | 'lab' | 'lab2' | 'lab3' | 'lab4' | 'lab5' | 'lab6' | 'lab7' | 'lab8' | 'lab9' | 'lab10';
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
    title: '3D Estrous Cycle Lab',
    blurb: 'Watch the cow’s cycle day by day in 3D — hormones moving from brain to ovary to uterus, follicle growth, heat, ovulation, the corpus luteum — then follow a fertilised egg to implantation.',
    examples: ['Hormones synced to 3D', 'Heat signs & AM–PM timing', 'Fertilisation to day 40'],
    href: '/knowledge/estrous-lab',
    cta: 'Open the estrous lab',
    preview: true,
    tone: 'lab3',
  },
  {
    title: '3D Poultry Egg Lab',
    blurb: 'Follow one yolk from the hen’s ovary to the cloaca in 3D — each hormone, each part of the oviduct, and every layer of the egg forming, from albumen to shell and cuticle.',
    examples: ['Egg formation, step by step', 'Egg problems (coming next)', 'Fertile eggs & hatching (coming next)'],
    href: '/knowledge/egg-lab',
    cta: 'Open the egg lab',
    preview: true,
    tone: 'lab4',
  },
  {
    title: '3D Cow Anatomy — Bones',
    blurb: 'Turn the whole cow skeleton in 3D. Tap any bone to see it big, with its processes, grooves, fossae, foramina and clinical landmarks numbered and explained.',
    examples: ['Whole skeleton, tap any bone', 'Landmarks + clinical notes', 'Muscles, vessels and other species later'],
    href: '/knowledge/anatomy-lab',
    cta: 'Open the anatomy lab',
    preview: true,
    tone: 'lab5',
  },
  {
    title: '3D Stifle — Patellar Desmotomy',
    blurb: 'Upward fixation of the patella in cattle and buffaloes: see the patella lock over the medial trochlear ridge, then follow medial patellar desmotomy step by step.',
    examples: ['Three patellar ligaments', 'Locked vs normal movement', 'Surgery steps + quiz'],
    href: '/knowledge/stifle-lab',
    cta: 'Open the stifle lab',
    preview: true,
    tone: 'lab6',
  },
  {
    title: '3D Pregnancy Month by Month',
    blurb: 'Buffalo and cattle: see where the uterus and fetus lie in each month — from the pelvis, over the pelvic brim, deep into the abdomen and back — and what you can reach per rectum.',
    examples: ['Buffalo 10 months · cattle 9', 'Fetus size and position', 'Rectal palpation reach'],
    href: '/knowledge/pregnancy-lab',
    cta: 'Open the pregnancy lab',
    preview: true,
    tone: 'lab7',
  },
  {
    title: '3D Ovary Palpation',
    blurb: 'Follicle, corpus luteum, follicular cyst, luteal cyst or inactive ovary? Press each one in 3D, cut it open, compare sizes — and test yourself in the quiz. Cow and buffalo.',
    examples: ['Feel: soft vs firm', 'Cyst vs CL vs follicle', 'Quiz: diagnose it'],
    href: '/knowledge/ovary-lab',
    cta: 'Open the ovary lab',
    preview: true,
    tone: 'lab8',
  },
  {
    title: '3D Ruminant Digestive System',
    blurb: 'Rumen, reticulum, omasum and abomasum in place in the cow. Open them to see papillae, honeycomb, leaves and folds; follow food and the cud; see bloat, hardware disease and LDA/RDA.',
    examples: ['Organs in the body', 'Inside each compartment', 'Bloat · hardware · LDA/RDA'],
    href: '/knowledge/rumen-lab',
    cta: 'Open the digestive lab',
    preview: true,
    tone: 'lab9',
  },
  {
    title: '3D Parasite Life Cycles',
    blurb: 'Liver fluke, Theileria and the barber’s pole worm: follow each life cycle round the animal in 3D — every stage magnified, where it lives, how animals get infected, and where to break the cycle.',
    examples: ['Fasciola · snail · buffalo', 'Theileria · Hyalomma tick', 'Haemonchus · FAMACHA · quiz'],
    href: '/knowledge/parasite-lab',
    cta: 'Open the parasite lab',
    preview: true,
    tone: 'lab10',
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
                <span className="kh-te-small">{s.te ?? ''}</span>
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
