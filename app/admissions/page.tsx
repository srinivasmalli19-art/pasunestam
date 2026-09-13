import { getAdmissions } from '@/lib/admissions/queries';
import './admissions.css';

const STATUS_LABEL = { Open: 'Open now', Closing: 'Closing soon', Upcoming: 'Upcoming' } as const;

export default async function AdmissionsPage() {
  const admissions = await getAdmissions();

  return (
    <main className="admissions-page">
      <h1>Admissions board</h1>
      <p>B.V.Sc, M.V.Sc, Ph.D, diplomas and CPD courses, with every deadline in one place.</p>
      <div className="board">
        <div className="board-head">
          <h3>Admissions board</h3>
          <p>B.V.Sc, M.V.Sc, Ph.D, diplomas and CPD courses</p>
        </div>
        {admissions.map((a) => (
          <div className="ad" key={a.id}>
            <div className="date">
              {a.day}
              <small>{a.month}</small>
            </div>
            <div>
              <h4>{a.title}</h4>
              <p>{a.org}</p>
              <span className={`pill ${a.status}`}>{STATUS_LABEL[a.status]}</span>
            </div>
          </div>
        ))}
      </div>
    </main>
  );
}
