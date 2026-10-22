// Dates (for DOB) in every shape people type them.
import { lineOf } from "./contact.js";

const MONTHS = {
  jan: 1, feb: 2, mar: 3, apr: 4, may: 5, jun: 6, jul: 7, aug: 8, sep: 9, sept: 9, oct: 10, nov: 11, dec: 12,
};
const MONTH_RE =
  "jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|june?|july?|aug(?:ust)?|sep(?:t(?:ember)?)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?";

const CURRENT_YEAR = new Date().getFullYear();

function monthOf(word) {
  return MONTHS[String(word).toLowerCase().slice(0, 4)] || MONTHS[String(word).toLowerCase().slice(0, 3)] || null;
}

function year4(y) {
  const s = String(y);
  if (s.length === 4) return Number(s);
  const n = Number(s);
  return n > (CURRENT_YEAR % 100) ? 1900 + n : 2000 + n;
}

function valid(y, m, d) {
  if (!m || m < 1 || m > 12) return false;
  if (d == null) return true;
  return d >= 1 && d <= new Date(y, m, 0).getDate();
}

const PATTERNS = [
  // March 4, 1965 / Mar 4th 1965
  { re: new RegExp(`\\b(${MONTH_RE})\\.?\\s+(\\d{1,2})(?:st|nd|rd|th)?,?\\s+(\\d{4}|'?\\d{2})\\b`, "gi"), f: (m) => [m[3].replace("'", ""), monthOf(m[1]), m[2]] },
  // 4 March 1965 / 4th of March 1965
  { re: new RegExp(`\\b(\\d{1,2})(?:st|nd|rd|th)?\\s+(?:of\\s+)?(${MONTH_RE})\\.?,?\\s+(\\d{4})\\b`, "gi"), f: (m) => [m[3], monthOf(m[2]), m[1]] },
  // 1965-03-04 / 1965/03/04
  { re: /\b(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})\b/g, f: (m) => [m[1], m[2], m[3]] },
  // 03/04/1965, 3-4-65, 3.4.1965
  { re: /\b(\d{1,2})([/.-])(\d{1,2})\2(\d{4}|\d{2})\b/g, f: (m) => (Number(m[1]) > 12 ? [m[4], m[3], m[1]] : [m[4], m[1], m[3]]) },
  // 03 04 1965
  { re: /\b(\d{1,2})\s(\d{1,2})\s((?:19|20)\d{2})\b/g, f: (m) => [m[3], m[1], m[2]] },
  // 03041965 (8 digits, only accepted when labelled - checked by caller)
  { re: /\b(0[1-9]|1[0-2])(0[1-9]|[12]\d|3[01])((?:19|20)\d{2})\b/g, f: (m) => [m[3], m[1], m[2]], compactOnly: true },
  // March 1965
  { re: new RegExp(`\\b(${MONTH_RE})\\.?,?\\s+(\\d{4})\\b`, "gi"), f: (m) => [m[2], monthOf(m[1]), null] },
];

export function findDates(ctx, blocked = []) {
  const out = [];
  const taken = [...blocked];
  for (const pattern of PATTERNS) {
    pattern.re.lastIndex = 0;
    let m;
    while ((m = pattern.re.exec(ctx.text)) !== null) {
      const start = m.index;
      const end = start + m[0].length;
      if (taken.some((s) => start < s.end && s.start < end)) continue;
      const [ys, ms, ds] = pattern.f(m);
      const y = year4(ys);
      const mo = Number(ms);
      const d = ds == null ? null : Number(ds);
      if (!valid(y, mo, d)) continue;
      taken.push({ start, end });
      out.push({
        start,
        end,
        line: lineOf(ctx, start),
        year: y,
        month: mo,
        day: d,
        raw: m[0],
        twoDigitYear: String(ys).length === 2,
        compactOnly: Boolean(pattern.compactOnly),
      });
    }
  }
  return out.sort((a, b) => a.start - b.start);
}

export function formatDate(date) {
  const mm = String(date.month).padStart(2, "0");
  if (date.day == null) return `${mm}/${date.year}`;
  return `${mm}/${String(date.day).padStart(2, "0")}/${date.year}`;
}

export { CURRENT_YEAR };
