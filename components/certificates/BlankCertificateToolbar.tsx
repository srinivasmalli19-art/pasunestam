'use client';

import Link from 'next/link';

interface AnimalOption {
  count: number;
  href: string;
  current: boolean;
}

interface Props {
  name: string;
  fillOnlineHref: string;
  /** Only for certificates with an animal table: switch the number of animal columns (1-5). */
  animalOptions?: AnimalOption[];
}

/** The on-screen bar above a blank certificate (hidden when printing): download as PDF, change the animal count, or fill online instead. */
export default function BlankCertificateToolbar({ name, fillOnlineHref, animalOptions }: Props) {
  return (
    <div className="blank-toolbar">
      <div>
        <h1>Blank {name.toLowerCase()}</h1>
        <p>
          Click <b>Download PDF</b>, then choose <b>Save as PDF</b> as the printer (or pick your printer to print it
          straight away). Fill it in by hand, sign and stamp.
        </p>
        {animalOptions && (
          <div className="animal-switch" role="group" aria-label="Animals per sheet">
            <span>Animals per sheet:</span>
            {animalOptions.map((o) => (
              <Link key={o.count} href={o.href} aria-current={o.current ? 'true' : undefined} replace scroll={false}>
                {o.count}
              </Link>
            ))}
          </div>
        )}
      </div>
      <div className="blank-toolbar-actions">
        <Link href={fillOnlineHref} className="button-ghost button-sm">
          Fill online instead
        </Link>
        <button type="button" className="button-primary button-sm" onClick={() => window.print()}>
          Download PDF
        </button>
      </div>
    </div>
  );
}
