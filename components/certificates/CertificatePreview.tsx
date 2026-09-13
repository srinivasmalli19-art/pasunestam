import { renderBody } from '@/lib/certificates/render';
import type { CertificateBodyBlock, CertificateData, VetProfile } from '@/lib/certificates/types';

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
      {issued && (
        <div className="stamp issued">
          <div>
            <b>ISSUED</b>
            {today}
          </div>
        </div>
      )}
    </div>
  );
}
