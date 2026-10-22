// Name and spouse extraction using compromise NLP and syntactic patterns.
// Extracts:
//   - Primary customer name (labels, NLP person tagging, first/last patterns)
//   - Spouse name and Spouse DOB (labels, "and wife/husband ...", etc.)

import nlp from "compromise";
import { titleCase, hitsAny, cleanValue } from "../text.js";
import { isFieldWord, isCommonWord, isSuffix, isWeakSuffix } from "../lexicon.js";
import { findDates, formatDate } from "./dates.js";

const SPOUSE_CUE = /\b(?:spouse|wife|husband|partner|married\s+to)\b/i;

function isValidNameWord(w, isInitialOk = false) {
  if (!w) return false;
  if (/^[A-Za-z]\.?$/.test(w)) return isInitialOk;
  if (w.length < 2) return false;
  const lower = w.toLowerCase().replace(/\.$/, "");
  if (isFieldWord(lower) || isCommonWord(lower)) return false;
  if (isSuffix(lower) && !isWeakSuffix(lower)) return false;
  if (/^\d+$/.test(w)) return false;
  return true;
}

function cleanCandidateName(name) {
  return cleanValue(name)
    .replace(/\b(?:mr|mrs|ms|miss|dr)\.?\s+/gi, "")
    .replace(/[^A-Za-z.' -]/g, "")
    .trim();
}

export function findNames(ctx, blocked = []) {
  let primaryName = null;
  let primarySpan = null;
  let spouseName = null;
  let spouseDob = null;

  // 1. Check for labeled Name:
  for (const label of ctx.labels.filter((l) => l.field === "name")) {
    const lineToks = ctx.tokens.filter(
      (t) => t.line === label.line && t.start >= label.valueStart && t.end <= label.valueEnd && t.word
    );
    if (lineToks.length) {
      const candidateTokens = [];
      for (let ti = 0; ti < lineToks.length; ti += 1) {
        const t = lineToks[ti];
        if (hitsAny(t, blocked)) break;
        const isInitial = ti > 0 && ti < lineToks.length - 1;
        if (!isValidNameWord(t.text, isInitial)) break;
        candidateTokens.push(t);
      }
      if (candidateTokens.length >= 1 && candidateTokens.length <= 4) {
        const raw = ctx.text.slice(candidateTokens[0].start, candidateTokens[candidateTokens.length - 1].end);
        const cleaned = cleanCandidateName(raw);
        if (cleaned.length >= 2) {
          primaryName = titleCase(cleaned);
          primarySpan = { start: candidateTokens[0].start, end: candidateTokens[candidateTokens.length - 1].end };
          break;
        }
      }
    }
  }

  // 2. Check for labeled Spouse:
  for (const label of ctx.labels.filter((l) => l.field === "spouse")) {
    const lineToks = ctx.tokens.filter(
      (t) => t.line === label.line && t.start >= label.valueStart && t.end <= label.valueEnd && t.word
    );
    if (lineToks.length) {
      const candidateTokens = [];
      for (let ti = 0; ti < lineToks.length; ti += 1) {
        const t = lineToks[ti];
        if (hitsAny(t, blocked)) break;
        const isInitial = ti > 0 && ti < lineToks.length - 1;
        if (!isValidNameWord(t.text, isInitial)) break;
        candidateTokens.push(t);
      }
      if (candidateTokens.length >= 1 && candidateTokens.length <= 4) {
        const raw = ctx.text.slice(candidateTokens[0].start, candidateTokens[candidateTokens.length - 1].end);
        const cleaned = cleanCandidateName(raw);
        if (cleaned.length >= 2) {
          spouseName = titleCase(cleaned);
        }
      }
    }
    // Also check for spouse DOB on that line or nearby
    const dates = findDates(ctx).filter((d) => d.line === label.line && d.start >= label.valueStart);
    if (dates.length) {
      spouseDob = formatDate(dates[0]);
    }
  }

  // 3. Phrasing for spouse: "and wife Jane", "spouse: Jane", "married to Jane Doe"
  if (!spouseName) {
    const SPOUSE_PATTERNS = [
      /\b(?:and\s+)?(?:my\s+)?(?:wife|husband|spouse)\s+(?:is\s+|name\s+is\s+)?([A-Z][a-z]+(?:\s+[A-Z][a-z]+){0,2})/gi,
      /\bmarried\s+to\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+){0,2})/gi
    ];
    for (const pat of SPOUSE_PATTERNS) {
      pat.lastIndex = 0;
      let m;
      while ((m = pat.exec(ctx.text)) !== null) {
        const val = cleanCandidateName(m[1]);
        if (val.length >= 2 && !isFieldWord(val) && !isCommonWord(val)) {
          spouseName = titleCase(val);
          break;
        }
      }
      if (spouseName) break;
    }
  }

  // 4. Try compromise NLP on unblocked text
  if (!primaryName) {
    try {
      const doc = nlp(ctx.text);
      const people = doc.people().json();
      for (const p of people) {
        const raw = cleanCandidateName(p.text);
        if (!raw || raw.length < 3 || !raw.includes(" ")) continue;
        const words = raw.split(/\s+/);
        const firstOk = isValidNameWord(words[0], false);
        const lastOk = isValidNameWord(words[words.length - 1], false);
        const midOk = words.slice(1, -1).every((w) => isValidNameWord(w, true));
        if (firstOk && lastOk && midOk) {
          const idx = ctx.text.indexOf(p.text);
          if (idx >= 0 && !hitsAny({ start: idx, end: idx + p.text.length }, blocked)) {
            primaryName = titleCase(raw);
            primarySpan = { start: idx, end: idx + p.text.length };
            break;
          }
        }
      }
    } catch (_e) {
      // Fallback if NLP throws
    }
  }

  // 5. Line-based scan: look across lines for standalone 2-4 word capitalized names
  if (!primaryName && ctx.lines.length) {
    const candidateLines = [];
    for (let li = 0; li < ctx.lines.length; li += 1) {
      const line = ctx.lines[li];
      const allLineToks = ctx.tokens.filter((t) => t.line === line.index);
      if (allLineToks.some((t) => hitsAny(t, blocked))) continue;
      if (ctx.labels.some((l) => l.line === line.index && l.field !== "name")) continue;

      const wordToks = allLineToks.filter((t) => t.word);
      if (wordToks.length >= 2 && wordToks.length <= 4) {
        const firstOk = isValidNameWord(wordToks[0].text, false);
        const lastOk = isValidNameWord(wordToks[wordToks.length - 1].text, false);
        const midOk = wordToks.slice(1, -1).every((t) => isValidNameWord(t.text, true));
        const allCapitalized = wordToks.every((t) => /^[A-Z]/.test(t.text));

        if (firstOk && lastOk && midOk && allCapitalized) {
          const raw = cleanCandidateName(ctx.text.slice(wordToks[0].start, wordToks[wordToks.length - 1].end));
          if (raw.length >= 3 && raw.includes(" ")) {
            candidateLines.push({
              name: titleCase(raw),
              start: wordToks[0].start,
              end: wordToks[wordToks.length - 1].end,
              lineIndex: li,
            });
          }
        }
      }
    }

    if (candidateLines.length) {
      primaryName = candidateLines[0].name;
      primarySpan = { start: candidateLines[0].start, end: candidateLines[0].end };
    }
  }

  return {
    name: primaryName,
    nameSpan: primarySpan,
    spouseName,
    spouseDob,
  };
}
