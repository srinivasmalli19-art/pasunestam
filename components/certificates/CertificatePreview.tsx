import { renderBody } from '@/lib/certificates/render';
import type { CertificateBodyBlock, CertificateData, VetProfile } from '@/lib/certificates/types';

interface Props {
  titleEn: string;
  titleTe: string;
  body: CertificateBodyBlock[];
  data: CertificateData;
  animals?: CertificateData[];
  profile: VetProfile;
  number: string | null;
}

export default function CertificatePreview({ titleEn, titleTe, body, data, animals = [], profile, number }: Props) {
  const bodyHtml = renderBody(body, data, animals);
  const today = new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });

  return (
    <div className="cert">
      <div className="c-head">
        <div className="c-org">Department of Animal Husbandry</div>
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
    </div>
  );
}
