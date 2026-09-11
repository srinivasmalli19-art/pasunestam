import { renderBody } from '@/lib/certificates/render';
import type { CertificateBodyBlock, CertificateData, VetProfile } from '@/lib/certificates/types';

const SEAL = `<svg viewBox="0 0 64 64" aria-hidden="true"><circle cx="32" cy="32" r="30" fill="none" stroke="#24336B" stroke-width="2"/><circle cx="32" cy="32" r="25" fill="none" stroke="#24336B" stroke-width="1"/><g fill="#24336B" transform="translate(16 16)"><ellipse cx="9" cy="12" rx="2.3" ry="3.1"/><ellipse cx="13.6" cy="8.6" rx="2.3" ry="3.1"/><ellipse cx="18.4" cy="8.6" rx="2.3" ry="3.1"/><ellipse cx="23" cy="12" rx="2.3" ry="3.1"/><path d="M16 14.5c-4 0-7 4-7 7 0 2 2 3 4 2.5 1.2-.3 2-.5 3-.5s1.8.2 3 .5c2 .5 4-.5 4-2.5 0-3-3-7-7-7z"/></g></svg>`;

interface Props {
  titleEn: string;
  titleTe: string;
  body: CertificateBodyBlock[];
  data: CertificateData;
  profile: VetProfile;
  number: string | null;
  issued: boolean;
}

export default function CertificatePreview({ titleEn, titleTe, body, data, profile, number, issued }: Props) {
  const bodyHtml = renderBody(body, data);
  const today = new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
  const addressLine = [profile.mandal && `${profile.mandal} Mandal`, profile.district].filter(Boolean).join(', ');

  return (
    <div className="cert">
      <div className="c-head">
        <span dangerouslySetInnerHTML={{ __html: SEAL }} />
        <div>
          <div className="c-org">Department of Animal Husbandry</div>
          <div className="c-inst">{profile.institution || <span className="blank" />}</div>
          <div className="c-addr">{addressLine}</div>
        </div>
      </div>
      <div className="c-title">{titleEn}</div>
      <div className="c-te">{titleTe}</div>
      <div className="c-meta">
        <span>
          No. <b>{number || 'given when issued'}</b>
        </span>
        <span>
          Date: <b>{today}</b>
        </span>
      </div>
      <div dangerouslySetInnerHTML={{ __html: bodyHtml }} />
      <div className="sign">
        <b>{profile.vetName || <span className="blank" />}</b>
        <br />
        {profile.designation || 'Veterinary Assistant Surgeon'}
        <br />
        Reg. no. {profile.registrationNo || <span className="blank" />}
      </div>
      <div className={`stamp ${issued ? 'issued' : ''}`}>
        <div>
          <b>{issued ? 'ISSUED' : 'DRAFT'}</b>
          {issued ? today : 'not yet issued'}
        </div>
      </div>
    </div>
  );
}
