import { getCertificateByNumber } from '@/lib/certificates/queries';
import './verify.css';

// "P. Venkata Rao" -> "P.V.R." — a public lookup shouldn't hand out a full
// owner name to anyone who happens to know or guess a certificate number.
function initials(name: string): string {
  return name.replace(/(\p{L})[\p{L}.]*/gu, '$1.');
}

function formatDate(iso: string | null): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

export default async function VerifyPage(props: PageProps<'/verify'>) {
  const searchParams = await props.searchParams;
  const no = typeof searchParams.no === 'string' ? searchParams.no : '';
  const result = no.trim() ? await getCertificateByNumber(no) : null;

  return (
    <main className="verify-page">
      <section className="verify-band">
        <div>
          <h2>Check a certificate is genuine</h2>
          <p>
            Banks, insurers and market officials can confirm any Pasunestam certificate by its number. A QR code on
            each certificate will open this check directly.
          </p>
        </div>
        <form className="inline-form" action="/verify" method="GET">
          <input
            name="no"
            defaultValue={no}
            placeholder="e.g. HC/2026/SVC4521/0001"
            aria-label="Certificate number"
            required
          />
          <button className="button-primary button-sm" type="submit">
            Verify
          </button>
        </form>
      </section>

      {no.trim() &&
        (result ? (
          <div className="result good">
            <h3>Genuine certificate</h3>
            <dl>
              <dt>Number</dt>
              <dd>{result.number}</dd>
              <dt>Type</dt>
              <dd>{result.templateName}</dd>
              <dt>Issued on</dt>
              <dd>{formatDate(result.issuedAt)}</dd>
              <dt>Animal</dt>
              <dd>{[result.species, result.tag && `tag ${result.tag}`].filter(Boolean).join(', ') || '—'}</dd>
              <dt>Owner</dt>
              <dd>{result.owner ? initials(result.owner) : '—'}</dd>
              <dt>Issued by</dt>
              <dd>
                {result.vetName}
                {result.institution ? `, ${result.institution}` : ''}
              </dd>
            </dl>
          </div>
        ) : (
          <div className="result bad">
            <h3>No certificate with this number</h3>
            <p>Check the number is typed exactly as printed, including the slashes.</p>
          </div>
        ))}
    </main>
  );
}
