import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import CertificatePreview from '@/components/certificates/CertificatePreview';
import BlankCertificateToolbar from '@/components/certificates/BlankCertificateToolbar';
import { getTemplateByKey } from '@/lib/certificates/queries';
import {
  MAX_BLANK_ANIMALS,
  applyVariant,
  blankFormOptionsFor,
  parseBlankAnimalCount,
  parseVariant,
} from '@/lib/certificates/variant';
import '@/components/certificates/certificate-builder.css';
import '@/components/certificates/blank-certificate.css';

// Public — no sign-in. An empty copy of a certificate to print (or save as
// PDF from the print dialog) and fill in by hand, for vets who prefer paper
// or are working without a connection. A certificate with an animal table
// (e.g. Health) first asks how many animals the sheet should have (1-5).

export async function generateMetadata(props: PageProps<'/certificates/blank/[key]'>): Promise<Metadata> {
  const { key } = await props.params;
  const searchParams = await props.searchParams;
  const template = await getTemplateByKey(key);
  if (!template) return { title: 'Certificate not found | Pasunestam' };
  const { name } = applyVariant(template, parseVariant(searchParams.variant));
  // The browser's "Save as PDF" uses the page title as the suggested file name.
  return { title: `Blank ${name} - Pasunestam` };
}

export default async function BlankCertificatePage(props: PageProps<'/certificates/blank/[key]'>) {
  const { key } = await props.params;
  const searchParams = await props.searchParams;
  const variant = parseVariant(searchParams.variant);

  const template = await getTemplateByKey(key);
  if (!template) notFound();

  const effective = applyVariant(template, variant);
  const variantQuery = template.key === 'health' ? `variant=${variant}&` : '';
  const fillOnlineHref = `/certificates/new/${template.key}${template.key === 'health' ? `?variant=${variant}` : ''}`;

  const hasAnimalTable = Boolean(effective.animalFields?.length);
  const animalCount = parseBlankAnimalCount(searchParams.animals);
  const animalOptions = hasAnimalTable
    ? Array.from({ length: MAX_BLANK_ANIMALS }, (_, i) => ({
        count: i + 1,
        href: `/certificates/blank/${template.key}?${variantQuery}animals=${i + 1}`,
        current: animalCount === i + 1,
      }))
    : undefined;

  // Ask before showing a multi-animal certificate, rather than guessing a number.
  if (animalOptions && animalCount === null) {
    return (
      <main className="blank-cert-page">
        <section className="animal-chooser" aria-labelledby="chooser-title">
          <p className="chooser-kicker">Blank {effective.name.toLowerCase()}</p>
          <h1 id="chooser-title">How many animals on this certificate?</h1>
          <p>Each animal gets its own column on the sheet. Choose 1 to {MAX_BLANK_ANIMALS}.</p>
          <div className="chooser-options">
            {animalOptions.map((o) => (
              <Link key={o.count} href={o.href} className="chooser-option">
                <b>{o.count}</b>
                <span>{o.count === 1 ? 'animal' : 'animals'}</span>
              </Link>
            ))}
          </div>
          <Link href={fillOnlineHref} className="chooser-back">
            Fill online instead
          </Link>
        </section>
      </main>
    );
  }

  const animals = hasAnimalTable ? Array.from({ length: animalCount ?? 1 }, () => ({})) : [];

  return (
    <main className="blank-cert-page">
      <BlankCertificateToolbar name={effective.name} fillOnlineHref={fillOnlineHref} animalOptions={animalOptions} />
      <div className="b-preview">
        <div className="cert-print-area">
          <CertificatePreview
            titleEn={effective.titleEn}
            body={effective.body}
            data={{}}
            animals={animals}
            profile={{}}
            number={null}
            blankForm={blankFormOptionsFor(template)}
          />
        </div>
      </div>
    </main>
  );
}
