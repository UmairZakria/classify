// Text primitives: normalisation, tokenisation, spans.
//
// Every extractor works on ONE normalised string and reports [start, end)
// offsets into it. Values are always sliced out of that string, so what the
// user typed is what comes out - nothing is rebuilt from parts.

const NOTE_LINE = /^\s*(?:CB|call\s*back|callback|follow[\s-]*up|f\/u|left\s+(?:a\s+)?(?:message|vm|voicemail)|no\s+answer|lvm)\b.*$/i;
const TRAILING_NOTE =
  /\s+(?:\bCB\b|call\s*back|callback|follow[\s-]*up|f\/u|left\s+(?:a\s+)?(?:message|vm|voicemail)|no\s+answer|\blvm\b)(?:\s|$).*$/i;

export const MAX_INPUT_LENGTH = 100_000;

export function normalize(input) {
  let text = input == null ? "" : String(input);
  if (text.length > MAX_INPUT_LENGTH) text = text.slice(0, MAX_INPUT_LENGTH);
  return text
    .normalize("NFKC")
    .replace(/[\u00a0\u202f\u2007\u2009\u200a\u200b\ufeff]/g, " ")
    .replace(/[\u2018\u2019\u201a\u201b\u2032]/g, "'")
    .replace(/[\u201c\u201d\u201e\u201f]/g, '"')
    .replace(/[\u2010\u2011\u2012\u2013\u2014\u2015\u2212]/g, "-")
    .replace(/\r\n?/g, "\n")
    .replace(/\t/g, " ")
    .replace(/[^\S\n]+/g, " ")
    .replace(/ *\n */g, "\n")
    .replace(/\n{2,}/g, "\n")
    .trim();
}

// Drops call-back / follow-up notes that are about the call, not the lead.
export function cleanLeadText(input) {
  return normalize(input)
    .split("\n")
    .filter((line) => !NOTE_LINE.test(line))
    .map((line) =>
      line
        .replace(TRAILING_NOTE, "")
        .replace(/^\s*name\s+(?:might|may|could)\s+be\s*[:=-]?\s*/i, "Name: ")
        .trim()
    )
    .filter(Boolean)
    .join("\n");
}

const TOKEN_RE = /[A-Za-z0-9]+(?:'[A-Za-z]+)?|[^\sA-Za-z0-9]/g;

// Tokens carry their line index so no extractor accidentally reads across a
// line break unless it explicitly decides to (address continuation lines).
export function tokenize(text) {
  const tokens = [];
  let line = 0;
  let lastEnd = 0;
  TOKEN_RE.lastIndex = 0;
  let m;
  while ((m = TOKEN_RE.exec(text)) !== null) {
    for (let i = lastEnd; i < m.index; i += 1) if (text[i] === "\n") line += 1;
    lastEnd = m.index + m[0].length;
    const raw = m[0];
    tokens.push({
      i: tokens.length,
      text: raw,
      lower: raw.toLowerCase(),
      start: m.index,
      end: m.index + raw.length,
      line,
      word: /^[A-Za-z0-9]/.test(raw),
      alpha: /^[A-Za-z]/.test(raw),
      num: /^\d+$/.test(raw),
    });
  }
  return tokens;
}

export function lines(text) {
  const out = [];
  let offset = 0;
  for (const raw of text.split("\n")) {
    out.push({ index: out.length, text: raw, start: offset, end: offset + raw.length });
    offset += raw.length + 1;
  }
  return out;
}

export function overlaps(a, b) {
  return a.start < b.end && b.start < a.end;
}

export function inside(span, list) {
  return list.some((s) => span.start >= s.start && span.end <= s.end);
}

export function hitsAny(span, list) {
  return list.some((s) => overlaps(span, s));
}

// "JOHN SMITH" / "john smith" -> "John Smith"; "McDonald" and "O'Neil" stay.
export function titleCase(text) {
  return String(text)
    .split(/(\s+|-)/)
    .map((piece) => {
      if (!/[A-Za-z]/.test(piece)) return piece;
      const letters = piece.replace(/[^A-Za-z]/g, "");
      const allUpper = letters === letters.toUpperCase();
      const allLower = letters === letters.toLowerCase();
      if (!allUpper && !allLower) return piece;
      const lower = piece.toLowerCase();
      return lower.replace(/(^|')([a-z])/g, (_m, p, c) => p + c.toUpperCase());
    })
    .join("");
}

export function cleanValue(text) {
  return String(text)
    .replace(/\s*\n\s*/g, ", ")
    .replace(/\s+/g, " ")
    .replace(/\s+,/g, ",")
    .replace(/,{2,}/g, ",")
    .replace(/^[\s,;:\-|]+/, "")
    .replace(/[\s,;:\-|(]+$/, "")
    .trim();
}
