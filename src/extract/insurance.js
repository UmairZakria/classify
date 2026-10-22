// Insurance company and duration extraction.
// Finds carrier names (exact + typo/fuzzy), checks for negations ("not state farm"),
// checks for duration ("for 5 years", "since 2018", etc.), and handles unknown carriers
// via linguistic patterns ("insured with X", "policy through X").

import {
  carrierExact,
  carrierFuzzy,
  MAX_CARRIER_WORDS,
  isFieldWord,
  isCommonWord,
  makeExact,
} from "../lexicon.js";
import { hitsAny } from "../text.js";

const DURATION_PATTERNS = [
  {
    re: /\b(?:for\s+)?(?:more\s+th[ae]n|over|greater\s+than)\s+(\d{1,3}|a|an|one|two|three|four|five|six|seven|eight|nine|ten|several)\s*(years?|yrs?|months?|mos?)\b/i,
    operator: "more than",
  },
  { re: /\b(\d{1,3})\s*\+\s*(years?|yrs?|months?|mos?)\b/i, operator: "at least" },
  { re: /\b(\d{1,3})\s+plus\s+(years?|yrs?|months?|mos?)\b/i, operator: "at least" },
  {
    re: /\b(?:at\s+least|minimum(?:\s+of)?)\s+(\d{1,3})\s*(years?|yrs?|months?|mos?)\b/i,
    operator: "at least",
  },
  { re: /\b(?:less\s+than|under)\s+(\d{1,3}|a|an|one)\s*(years?|yrs?|months?|mos?)\b/i, operator: "less than" },
  {
    re: /\b(?:about|around|approximately|approx\.?|like|roughly)\s+(\d{1,3}|a|an|one)\s*(years?|yrs?|months?|mos?)\b/i,
    operator: "about",
  },
  { re: /\ba\s+year\s+long\b/i, operator: "", value: "1 year" },
  { re: /\b(?:for\s+)?several\s+(years?|yrs?|months?)\b/i, operator: "about", value: "several years" },
  { re: /\b(?:for\s+)?a\s+long\s+time\b/i, operator: "about", value: "a long time" },
  {
    re: /\b(?:for\s+)?(\d{1,3}|a|an|one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve)\s*(years?|yrs?|months?|mos?)\b/i,
    operator: "",
  },
  {
    re: /\bsince\s+((?:19|20)\d{2})\b/i,
    operator: "since",
  }
];

const NUMBER_WORDS = {
  a: 1, an: 1, one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9, ten: 10, eleven: 11, twelve: 12
};

function normalizeDurationMatch(m, pattern) {
  if (pattern.value) {
    return pattern.operator ? `${pattern.operator} ${pattern.value}`.trim() : pattern.value;
  }
  if (pattern.operator === "since") {
    return `since ${m[1]}`;
  }
  let numStr = m[1];
  let unit = m[2] ? m[2].toLowerCase() : "years";
  let num = /^\d+$/.test(numStr) ? Number(numStr) : (NUMBER_WORDS[numStr.toLowerCase()] || numStr);
  let normUnit = /^y/i.test(unit) ? (num === 1 ? "year" : "years") : (num === 1 ? "month" : "months");
  let phr = `${num} ${normUnit}`;
  return pattern.operator ? `${pattern.operator} ${phr}` : phr;
}

function hasNegationBefore(ctx, offset) {
  const windowStart = Math.max(0, offset - 25);
  const snippet = ctx.text.slice(windowStart, offset).toLowerCase();
  return /\b(not|no|never|without|isn't|isnt|hasn't|hasnt|neither|excluding|except)\s*$/i.test(snippet) ||
         /\b(not|no|never|without|isn't|isnt)\s+[a-z]{0,10}\s*$/i.test(snippet);
}

export function findInsuranceCarriers(ctx, blocked = []) {
  const candidates = [];
  const tokens = ctx.tokens;

  // 1. Label-driven extraction
  for (const label of ctx.labels.filter((l) => l.field === "carrier")) {
    let startIdx = tokens.findIndex((t) => t.start >= label.valueStart && t.line === label.line);
    if (startIdx < 0 && label.dangling && label.line + 1 < ctx.lines.length) {
      startIdx = tokens.findIndex((t) => t.line === label.line + 1 && t.word);
    }
    if (startIdx >= 0) {
      const lineToks = tokens.filter((t) => t.line === tokens[startIdx].line && t.start >= tokens[startIdx].start);
      // Try to find a match in the labeled value line
      for (let size = Math.min(MAX_CARRIER_WORDS, lineToks.length); size >= 1; size -= 1) {
        const run = lineToks.slice(0, size);
        const phrase = run.map((t) => t.text).join(" ");
        const hit = carrierExact(phrase) || carrierFuzzy(phrase);
        if (hit) {
          const start = run[0].start;
          const end = run[run.length - 1].end;
          candidates.push({
            name: hit.name,
            start,
            end,
            labeled: true,
            negated: hasNegationBefore(ctx, start),
            ambiguous: false,
          });
          break;
        }
      }
    }
  }

  // 2. Scan entire token stream for known carriers (exact & fuzzy)
  for (let i = 0; i < tokens.length; i += 1) {
    if (hitsAny(tokens[i], blocked)) continue;
    for (let size = Math.min(MAX_CARRIER_WORDS, tokens.length - i); size >= 1; size -= 1) {
      const run = tokens.slice(i, i + size);
      if (run.some((t) => hitsAny(t, blocked))) continue;
      if (run[0].line !== run[run.length - 1].line) continue;
      const phrase = run.map((t) => t.text).join(" ");
      const hit = carrierExact(phrase);
      if (hit) {
        const start = run[0].start;
        const end = run[run.length - 1].end;
        candidates.push({
          name: hit.name,
          start,
          end,
          labeled: ctx.labels.some((l) => l.field === "carrier" && l.line === run[0].line && l.end <= start),
          negated: hasNegationBefore(ctx, start),
          ambiguous: hit.ambiguous,
        });
        i += size - 1;
        break;
      }
    }
  }

  // 3. Fuzzy search for multi-word and single-word misspellings if not already matched
  for (let i = 0; i < tokens.length; i += 1) {
    if (hitsAny(tokens[i], blocked)) continue;
    if (candidates.some((c) => tokens[i].start >= c.start && tokens[i].end <= c.end)) continue;

    for (let size = Math.min(3, tokens.length - i); size >= 1; size -= 1) {
      const run = tokens.slice(i, i + size);
      if (run[0].line !== run[run.length - 1].line) continue;
      if (run.some((t) => hitsAny(t, blocked))) continue;
      const phrase = run.map((t) => t.text).join(" ");
      if (phrase.replace(/[^a-zA-Z]/g, "").length < 5) continue;

      const hit = carrierFuzzy(phrase);
      if (hit) {
        const start = run[0].start;
        const end = run[run.length - 1].end;
        candidates.push({
          name: hit.name,
          start,
          end,
          labeled: ctx.labels.some((l) => l.field === "carrier" && l.line === run[0].line && l.end <= start),
          negated: hasNegationBefore(ctx, start),
          ambiguous: false,
          fuzzy: true,
        });
        i += size - 1;
        break;
      }
    }
  }

  // 4. Pattern-based inference for unknown carriers ("insured with X", "policy through X")
  const INFER_PATTERNS = [
    /\b(?:insured|coverage|covered|policy|insurance)\s+(?:with|by|through|at)\s+([A-Z][A-Za-z0-9&.'\- ]{2,30}?)(?=[,;\n]|\s+(?:for|since)\b|$)/gi,
    /\bcurrently\s+with\s+([A-Z][A-Za-z0-9&.'\- ]{2,30}?)(?=[,;\n]|\s+(?:for|since)\b|$)/gi
  ];
  for (const pat of INFER_PATTERNS) {
    pat.lastIndex = 0;
    let m;
    while ((m = pat.exec(ctx.text)) !== null) {
      const val = m[1].trim();
      const start = m.index + m[0].indexOf(m[1]);
      const end = start + val.length;
      if (hitsAny({ start, end }, blocked)) continue;
      if (!candidates.some((c) => Math.max(start, c.start) < Math.min(end, c.end))) {
        if (!isFieldWord(val) && !isCommonWord(val) && !makeExact(val)) {
          candidates.push({
            name: val,
            start,
            end,
            labeled: true,
            negated: hasNegationBefore(ctx, start),
            ambiguous: false,
            inferred: true
          });
        }
      }
    }
  }

  // Deduplicate and resolve
  const nonNegated = candidates.filter((c) => !c.negated);
  const negated = candidates.filter((c) => c.negated);

  let best = null;
  for (const c of nonNegated) {
    if (c.ambiguous) {
      // Ambiguous words like "Liberty", "Mercury", "Root", "Shelter", "Farmers"
      // need carrier context (labeled, or near words like "insurance", "with", "years")
      const windowStr = ctx.text.slice(Math.max(0, c.start - 40), Math.min(ctx.text.length, c.end + 40)).toLowerCase();
      const hasContext = c.labeled || /\b(insurance|ins|carrier|policy|covered|with|for\s+\d|since)\b/i.test(windowStr);
      if (!hasContext) continue;
    }
    if (!best || (c.labeled && !best.labeled) || (!c.fuzzy && best.fuzzy)) {
      best = c;
    }
  }

  // Also check duration anywhere in the text
  let duration = null;
  for (const pat of DURATION_PATTERNS) {
    const re = new RegExp(pat.re.source, "gi");
    let m;
    while ((m = re.exec(ctx.text)) !== null) {
      const start = m.index;
      const end = start + m[0].length;
      if (hitsAny({ start, end }, blocked)) continue;
      duration = normalizeDurationMatch(m, pat);
      break;
    }
    if (duration) break;
  }

  return {
    carrier: best ? best.name : null,
    carrierCandidate: best,
    duration,
    negated: negated.map((n) => n.name),
    allCandidates: candidates,
  };
}
