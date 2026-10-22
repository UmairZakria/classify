// Label detection: "Name: ...", "DOB - ...", "lives at ...", "Insurance = ...".
import { LABELS } from "./data/vocab.js";

// Multi-word phrases that read as a label without punctuation.
const PHRASE_OK = /\s/;
// Single words that are reliable labels at the start of a line even without ":".
const STRONG = new Set([
  "address", "addres", "adress", "adres", "addr", "name", "phone", "email", "e-mail", "dob", "insurance",
  "carrier", "insurer", "zip", "zipcode", "spouse", "wife", "husband", "vehicles", "vehicle", "vehical",
  "cars", "birthday", "birthdate", "telephone", "mobile", "cell", "location", "residence", "customer", "client",
]);
// Phrases that are verbal and can appear mid-sentence ("he lives at ...").
const INLINE = new Set([
  "lives at", "living at", "live at", "resides at", "residing at", "located at", "insured with", "insured by",
  "insured through", "currently with", "currently insured with", "covered by", "covered with", "coverage with",
  "policy with", "born on",
]);

const ENTRIES = LABELS.flatMap(([field, phrases]) =>
  phrases.map((phrase) => ({
    field,
    phrase,
    re: new RegExp(
      `(^|[^A-Za-z0-9])(${phrase.replace(/[.*+?^${}()|[\]\\]/g, "\\$&").replace(/\s+/g, "\\s*")})(?=$|[^A-Za-z0-9'])`,
      "gi"
    ),
  }))
).sort((a, b) => b.phrase.length - a.phrase.length);

export function findLabels(lines) {
  const labels = [];
  for (const line of lines) {
    const used = [];
    const found = [];
    for (const entry of ENTRIES) {
      entry.re.lastIndex = 0;
      let m;
      while ((m = entry.re.exec(line.text)) !== null) {
        const start = m.index + m[1].length;
        const end = start + m[2].length;
        if (used.some((u) => start < u.end && u.start < end)) continue;
        const after = line.text.slice(end);
        const sep = after.match(/^\s*(?:[:=]+|-+(?!\d)|#(?=\s))?\s*/)[0];
        const punctuated = /[:=-]/.test(sep);
        const atLineStart = line.text.slice(0, start).trim() === "";
        const phrase = entry.phrase.toLowerCase();
        let ok = punctuated;
        if (!ok && INLINE.has(phrase)) ok = true;
        if (!ok && atLineStart && (STRONG.has(phrase) || PHRASE_OK.test(phrase))) ok = true;
        if (!ok) continue;
        // "#" and "number" are only phone labels when punctuated.
        if ((phrase === "#" || phrase === "number" || phrase === "add") && !punctuated) continue;
        used.push({ start, end });
        found.push({
          field: entry.field,
          phrase: m[2],
          start: line.start + start,
          end: line.start + end,
          valueStart: line.start + end + sep.length,
          line: line.index,
          punctuated,
        });
      }
    }
    found.sort((a, b) => a.start - b.start);
    // A label's value runs to the next label on the same line (or line end).
    for (let i = 0; i < found.length; i += 1) {
      const next = found[i + 1];
      found[i].valueEnd = next ? next.start : line.end;
      if (found[i].valueEnd < found[i].valueStart) found[i].valueEnd = found[i].valueStart;
      found[i].dangling = found[i].valueEnd - found[i].valueStart <= 0 ||
        !/[A-Za-z0-9]/.test(lineSlice(line, found[i].valueStart, found[i].valueEnd));
    }
    labels.push(...found);
  }
  return labels;
}

function lineSlice(line, start, end) {
  return line.text.slice(start - line.start, end - line.start);
}
