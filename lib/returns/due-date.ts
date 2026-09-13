// The monthly return is due on the 5th of the following month, matching the
// prototype's renderDue(). Computed server-side and passed down as a prop so
// the desk hero (a client component, for the search box) never risks a
// hydration mismatch from computing "now" independently on server vs client.

export interface MonthlyReturnDue {
  daysLeft: number;
  dueDayMonth: string; // e.g. "5 Oct"
  monthName: string; // the month the return covers, e.g. "September"
}

export function getMonthlyReturnDue(now: Date = new Date()): MonthlyReturnDue {
  const due = new Date(now.getFullYear(), now.getMonth() + 1, 5);
  const daysLeft = Math.ceil((due.getTime() - now.getTime()) / 86_400_000);
  return {
    daysLeft,
    dueDayMonth: due.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }),
    monthName: now.toLocaleDateString('en-IN', { month: 'long' }),
  };
}
