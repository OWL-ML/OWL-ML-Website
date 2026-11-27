// Dates are stored as ISO strings (YYYY-MM-DD or YYYY-MM) and shown in English, e.g. "29 Jun 2026".
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const MONTHS_LONG = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];

const parts = (iso: string) => iso.split('-').map(Number) as [number, number, number?];

/** "2026-06-29" → "29 Jun 2026" */
export function formatDate(iso: string): string {
  const [y, m, d] = parts(iso);
  return `${d} ${MONTHS[m - 1]} ${y}`;
}

/** "2026-06-29" → "29 Jun" */
export function formatDayMonth(iso: string): string {
  const [, m, d] = parts(iso);
  return `${d} ${MONTHS[m - 1]}`;
}

/** "2026-02" or "2026-02-05" → "Feb 2026"; a bare year ("2024") and placeholders such as "[YYYY-MM]" stay as they are */
export function formatMonth(iso: string): string {
  if (iso.startsWith('[') || /^\d{4}$/.test(iso)) return iso;
  const [y, m] = parts(iso);
  return `${MONTHS[m - 1]} ${y}`;
}

/** "2026-02-05" → "February 2026" */
export function formatMonthLong(iso: string): string {
  const [y, m] = parts(iso);
  return `${MONTHS_LONG[m - 1]} ${y}`;
}

/** Build date as YYYY-MM-DD (opportunity deadlines are compared against it). */
export const today = () => new Date().toISOString().slice(0, 10);

/**
 * A person's name with their academic title (`honorific` in their file), e.g. "Prof. Dr. Martin
 * Mundt" (Martin, November 2026: visitors expect titles). Used wherever a person is presented
 * as a person; author lists of papers keep the names as published.
 */
export const titledName = (p: { name: string; honorific?: string }): string =>
  [p.honorific, p.name].filter(Boolean).join(' ');

export const isPlaceholder = (v: string | undefined | null): boolean => !!v && /\[[^\]]*\]/.test(v);
