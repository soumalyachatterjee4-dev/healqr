/**
 * Monthly Download Window Logic
 * 
 * Rule: Data for month X is available for free download from Day 1-7 of month X+1.
 * After Day 7, the data is locked and requires admin approval (paid).
 * 
 * Example: March 2026 data → free download Apr 1-7 → locked after Apr 7
 */

export interface MonthWindow {
  monthLabel: string;       // e.g. "March 2026"
  dataMonth: number;        // 0-indexed month (0=Jan)
  dataYear: number;
  windowStart: Date;        // Day 1 of next month
  windowEnd: Date;          // Day 7, 23:59:59 of next month
  isOpen: boolean;          // Currently in free window
  isExpired: boolean;       // Past the free window
  daysLeft: number;         // Days remaining in window (0 if expired)
  dateFrom: string;         // YYYY-MM-DD first day of data month
  dateTo: string;           // YYYY-MM-DD last day of data month
}

/**
 * Get the current free download windows (checks last 3 months)
 */
export function getMonthlyWindows(): MonthWindow[] {
  const now = new Date();
  const windows: MonthWindow[] = [];

  for (let i = 1; i <= 3; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const dataMonth = d.getMonth();
    const dataYear = d.getFullYear();
    const monthLabel = d.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' });

    const lastDay = new Date(dataYear, dataMonth + 1, 0).getDate();
    const dateFrom = `${dataYear}-${String(dataMonth + 1).padStart(2, '0')}-01`;
    const dateTo = `${dataYear}-${String(dataMonth + 1).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;

    const windowStart = new Date(dataYear, dataMonth + 1, 1, 0, 0, 0);
    const windowEnd = new Date(dataYear, dataMonth + 1, 7, 23, 59, 59);
    const isOpen = now >= windowStart && now <= windowEnd;
    const isExpired = now > windowEnd;
    const daysLeft = isOpen ? Math.ceil((windowEnd.getTime() - now.getTime()) / (86400000)) : 0;

    windows.push({ monthLabel, dataMonth, dataYear, windowStart, windowEnd, isOpen, isExpired, daysLeft, dateFrom, dateTo });
  }

  return windows;
}

/**
 * Check if a date range falls within a free download window.
 * Returns 'free' if fully within an open window, 'locked' if expired, 'current-month' if data is from current month (not ready yet).
 */
export function checkDateRangeStatus(fromDate: string, toDate: string): 'free' | 'locked' | 'current-month' | 'approved' {
  const now = new Date();
  const currentMonthStart = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;

  // If date range includes current month data — not ready yet
  if (toDate >= currentMonthStart) {
    return 'current-month';
  }

  // Check each monthly window
  const windows = getMonthlyWindows();
  for (const w of windows) {
    // Check if the date range falls within this month's data period
    if (fromDate >= w.dateFrom && toDate <= w.dateTo) {
      return w.isOpen ? 'free' : 'locked';
    }
  }

  // Date range older than 3 months — always locked
  return 'locked';
}

/**
 * Get the currently open download windows (for dashboard banner)
 */
export function getOpenWindows(): MonthWindow[] {
  return getMonthlyWindows().filter(w => w.isOpen);
}

/**
 * Get the next upcoming window (for showing "next free download from" message)
 */
export function getNextWindow(): { monthLabel: string; opensOn: Date } | null {
  const now = new Date();
  // Current month's data will be available on 1st of next month
  const currentMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const monthLabel = currentMonth.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' });
  const opensOn = new Date(now.getFullYear(), now.getMonth() + 1, 1);
  return { monthLabel, opensOn };
}
