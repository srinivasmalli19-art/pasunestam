import { renderBody, type BlankFormOptions } from '@/lib/certificates/render';
import type { CertificateBodyBlock, CertificateData, VetProfile } from '@/lib/certificates/types';

interface Props {
  titleEn: string;
  body: CertificateBodyBlock[];
  data: CertificateData;
  animals?: CertificateData[];
  profile: VetProfile;
  number: string | null;
  /** Renders an empty print-and-fill-by-hand form: blank number, date and signature details. */
  blankForm?: BlankFormOptions;
}

export default function CertificatePreview({ titleEn, body, data, animals = [], profile, number, blankForm }: Props) {
  const bodyHtml = renderBody(body, data, animals, blankForm);
  const isBlank = Boolean(blankForm);
  const today = new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });

  return (
    <div className={`cert${isBlank ? ' cert-blank' : ''}`}>
      <div className="c-head">
        <div className="c-org">Department of Animal Husbandry</div>
      </div>
      <div className="c-title">{titleEn}</div>
      <div className="c-meta">
        <span>No. {isBlank ? <span className="blank" /> : <b>{number || 'given when issued'}</b>}</span>
        <span>Date: {isBlank ? <span className="blank" /> : <b>{today}</b>}</span>
      </div>
      <div dangerouslySetInnerHTML={{ __html: bodyHtml }} />
      <div className="sign">
        {isBlank ? (
          <>
            Signature of the Veterinarian
            <br />
            Name: <span className="blank" />
            <br />
            Designation: <span className="blank" />
            <br />
            Reg. no. <span className="blank" />
          </>
        ) : (
          <>
            <b>{profile.vetName || <span className="blank" />}</b>
            <br />
            {profile.designation || 'Veterinary Assistant Surgeon'}
            <br />
            Reg. no. {profile.registrationNo || <span className="blank" />}
          </>
        )}
      </div>
    </div>
  );
}
