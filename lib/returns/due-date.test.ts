import { describe, expect, it } from 'vitest';
import { getMonthlyReturnDue } from './due-date';

describe('getMonthlyReturnDue', () => {
  it('is due the 5th of next month', () => {
    const due = getMonthlyReturnDue(new Date(2026, 8, 11)); // 11 Sept 2026
    expect(due.dueDayMonth).toBe('5 Oct');
    expect(due.monthName).toBe('September');
    expect(due.daysLeft).toBe(24);
  });

  it('rolls over the year at December -> January', () => {
    const due = getMonthlyReturnDue(new Date(2026, 11, 20)); // 20 Dec 2026
    expect(due.dueDayMonth).toBe('5 Jan');
  });

  it('always targets next month’s 5th, even right after this month’s due date', () => {
    const due = getMonthlyReturnDue(new Date(2026, 9, 5)); // 5 Oct 2026 (October's own due date)
    expect(due.dueDayMonth).toBe('5 Nov');
    expect(due.daysLeft).toBe(31); // October has 31 days
  });
});
