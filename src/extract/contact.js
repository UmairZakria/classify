// Phones and emails.

// NANP: area code and exchange cannot start with 0/1, neither may be N11.
const PHONE_RE = /(?<![\d])(?:\+?1[\s.-]?)?\(?([2-9]\d{2})\)?[\s.-]?([2-9]\d{2})[\s.-]?(\d{4})(?![\d])/g;

export function findPhones(ctx) {
  const out = [];
  PHONE_RE.lastIndex = 0;
  let m;
  while ((m = PHONE_RE.exec(ctx.text)) !== null) {
    const [raw, area, exchange, line] = m;
    if (area[1] === "1" && area[2] === "1") continue;
    if (exchange[1] === "1" && exchange[2] === "1") continue;
    // "75115 2145551234": never let a phone start inside a longer digit run.
    const before = ctx.text.slice(Math.max(0, m.index - 1), m.index);
    if (/\d/.test(before)) continue;
    // Separators must be consistent with a phone, not "75115-2145" style mixes.
    const start = m.index;
    const end = m.index + raw.length;
    const labeled = ctx.labels.some((l) => l.field === "phone" && l.line === lineOf(ctx, start) && l.end <= start);
    out.push({ value: `${area}${exchange}${line}`, start, end, labeled });
  }
  return out;
}

const EMAIL_RE = /[A-Za-z0-9._%+-]+@[A-Za-z0-9-]+(?:\.[A-Za-z0-9-]+)*\.[A-Za-z]{2,}/g;

export function findEmails(ctx) {
  const out = [];
  EMAIL_RE.lastIndex = 0;
  let m;
  while ((m = EMAIL_RE.exec(ctx.text)) !== null) {
    out.push({ value: m[0].replace(/\.+$/, ""), start: m.index, end: m.index + m[0].length });
  }
  return out;
}

export function lineOf(ctx, offset) {
  let lo = 0;
  let hi = ctx.lines.length - 1;
  while (lo < hi) {
    const mid = (lo + hi + 1) >> 1;
    if (ctx.lines[mid].start <= offset) lo = mid;
    else hi = mid - 1;
  }
  return lo;
}
