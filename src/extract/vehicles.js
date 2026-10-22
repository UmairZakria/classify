// Vehicles: "2016 subru forster" -> "2016 Subaru Forester".
//
// A mention is anchored on a model year or a make, then grows over make /
// model / trim tokens. Spelling correction happens ONLY on the tokens of the
// mention itself - the rest of the note (addresses!) is never touched.
import { CURRENT_YEAR } from "./dates.js";
import {
  makeExact, makeFuzzy, modelExact, modelFuzzy, MAX_MAKE_WORDS, MAX_MODEL_WORDS,
  isFieldWord, isCommonWord, isSuffix, carrierExact, stateAt,
} from "../lexicon.js";
import { TRIM_WORDS, VEHICLE_WORDS } from "../data/vehicles.js";
import { titleCase, hitsAny } from "../text.js";

const NUMBER_WORDS = { one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9, ten: 10, a: 1, an: 1, single: 1 };
const YEAR_BLOCKERS = new Set(["since", "in", "from", "born", "dob", "year", "until", "til", "till", "by", "after", "before", "of", "circa", "around", "bday", "birthday", "married", "moved", "expires", "exp", "dl", "license", "licensed"]);
const BREAK_WORDS = new Set(["and", "also", "plus", "with", "w", "or", "for", "since", "is", "was", "has", "have", "had", "paid", "financed", "owned", "leased", "insured", "full", "liability", "coverage", "at", "in", "on"]);
const SEPARATORS = new Set([",", ";", "|", "&", "+", "(", ")", "[", "]", "/", "\\", ":", "."]);

function yearAt(toks, i) {
  const t = toks[i];
  if (!t) return null;
  const next = toks[i + 1];
  if (t.num && t.text.length === 4) {
    const v = Number(t.text);
    if (v >= 1940 && v <= CURRENT_YEAR + 2) return { year: v, size: 1 };
  }
  // '15 Honda
  if (t.text === "'" && next && next.num && next.text.length === 2 && next.start === t.end) {
    return { year: twoDigit(next.text), size: 2 };
  }
  // 15 Honda Civic (2-digit year directly followed by a make)
  if (t.num && t.text.length === 2 && next && next.alpha) {
    const make = makeExact(next.text);
    if (make && !make.ambiguous) return { year: twoDigit(t.text), size: 1 };
  }
  return null;
}

function twoDigit(text) {
  const n = Number(text);
  return n <= (CURRENT_YEAR + 1) % 100 ? 2000 + n : 1900 + n;
}

function wordsFrom(toks, i, size) {
  const run = toks.slice(i, i + size);
  if (run.length !== size) return null;
  // Allow hyphen joins inside model names: "CR-V", "F-150", "CX-5".
  for (let k = 1; k < run.length; k += 1) {
    const gap = run[k].start - run[k - 1].end;
    if (gap > 1) return null;
    if (!run[k].word && run[k].text !== "-") return null;
  }
  if (!run[0].word || !run[run.length - 1].word) return null;
  return run;
}

function makeAt(toks, i) {
  for (let size = Math.min(MAX_MAKE_WORDS * 2 - 1, toks.length - i); size >= 1; size -= 1) {
    const run = wordsFrom(toks, i, size);
    if (!run) continue;
    const phrase = run.map((t) => t.text).join(" ");
    const hit = makeExact(phrase);
    if (hit) return { ...hit, size };
  }
  const t = toks[i];
  if (t && t.alpha) {
    const fuzzy = makeFuzzy(t.text);
    if (fuzzy) return { ...fuzzy, size: 1, fuzzy: true };
  }
  return null;
}

function modelAt(toks, i, make) {
  for (let size = Math.min(MAX_MODEL_WORDS * 2 - 1, toks.length - i); size >= 1; size -= 1) {
    const run = wordsFrom(toks, i, size);
    if (!run) continue;
    const phrase = run.map((t) => t.text).join(" ");
    const hit = modelExact(phrase, make);
    if (hit) return { ...hit, size };
  }
  for (let size = Math.min(MAX_MODEL_WORDS * 2 - 1, toks.length - i); size >= 1; size -= 1) {
    const run = wordsFrom(toks, i, size);
    if (!run) continue;
    const phrase = run.map((t) => t.text).join(" ");
    if (phrase.replace(/[^a-zA-Z]/g, "").length >= 5) {
      const fuzzy = modelFuzzy(phrase, make);
      if (fuzzy) return { ...fuzzy, size, fuzzy: true };
    }
  }
  return null;
}

function isCode(text) {
  // Trim/model codes: "EX-L", "328i", "SR5", "4x4", "LT1".
  return /^[A-Za-z]{0,3}\d{1,4}[A-Za-z]{0,3}$/.test(text) && !/^\d{5,}$/.test(text) && text.length <= 6;
}

function isPlainUnknown(t) {
  return t.alpha && t.text.length >= 2 && !isFieldWord(t.text) && !isCommonWord(t.text) && !isSuffix(t.text) &&
    !carrierExact(t.text) && !VEHICLE_WORDS[t.lower] && !BREAK_WORDS.has(t.lower);
}

export function findVehicles(ctx, blocked) {
  const out = [];
  for (const line of ctx.lines) {
    const toks = ctx.tokens.filter((t) => t.line === line.index && !hitsAny(t, blocked));
    let i = 0;
    while (i < toks.length) {
      const found = parseVehicle(toks, i);
      if (found) {
        out.push(found.vehicle);
        i = found.next;
      } else {
        i += 1;
      }
    }
  }
  return out;
}

function parseVehicle(toks, i) {
  const t = toks[i];
  if (!t.word && t.text !== "'") return null;
  const prev = toks[i - 1];
  const y = yearAt(toks, i);
  const mk = y ? null : makeAt(toks, i);
  if (!y && !mk) {
    // Model first with the year right after: "Camry 2015".
    const md = t.alpha ? modelAt(toks, i, null) : null;
    if (!md || md.fuzzy || !yearAt(toks, i + md.size)) return null;
  }
  if (y && prev && YEAR_BLOCKERS.has(prev.lower)) {
    const after = toks[i + y.size];
    if (!after || !makeExact(after.text)) return null;
  }

  const v = { year: null, make: null, model: null, extras: [], start: t.start, end: t.end, weak: false };
  let j = i;
  let unknownTaken = 0;
  while (j < toks.length) {
    const tok = toks[j];
    if (SEPARATORS.has(tok.text) && !(tok.text === "-" )) {
      // "Honda/Civic" style slash between make and model is rare; stop.
      break;
    }
    if (tok.text === "-" ) { j += 1; continue; }
    if (BREAK_WORDS.has(tok.lower) && j > i) break;

    const yy = yearAt(toks, j);
    if (yy) {
      if (v.year) break;
      if (j > i && !(v.make || v.model)) break;
      v.year = yy.year;
      j += yy.size;
      v.end = toks[j - 1].end;
      continue;
    }
    if (!v.make) {
      const m = makeAt(toks, j);
      if (m) {
        v.make = m.name;
        v.makeAmbiguous = m.ambiguous;
        j += m.size;
        v.end = toks[j - 1].end;
        continue;
      }
    }
    if (!v.model) {
      const md = modelAt(toks, j, v.make);
      if (md && (v.make || v.year || !md.fuzzy)) {
        v.model = md.model;
        if (!v.make && md.make) v.make = md.make;
        j += md.size;
        v.end = toks[j - 1].end;
        continue;
      }
    }
    if (VEHICLE_WORDS[tok.lower] && (v.make || v.model)) { j += 1; continue; }
    if ((v.make || v.model) && v.extras.length < 3) {
      if (TRIM_WORDS.has(tok.lower) || (isCode(tok.text) && !(tok.num && tok.text.length >= 4))) {
        v.extras.push(/^[a-z0-9-]+$/.test(tok.text) && tok.text.length <= 3 ? tok.text.toUpperCase() : tok.text);
        j += 1;
        v.end = toks[j - 1].end;
        continue;
      }
    }
    // Unknown model typed after a known make: "2015 Kia Seltoss", "Ford Ranchero".
    if (v.make && !v.model && unknownTaken === 0 && isPlainUnknown(tok) && !stateAt(toks, j)) {
      v.model = titleCase(tok.text);
      unknownTaken += 1;
      j += 1;
      v.end = toks[j - 1].end;
      continue;
    }
    // Year + unknown make ("2019 Polaris RZR") - accepted, but marked weak.
    if (v.year && !v.make && !v.model && unknownTaken === 0 && isPlainUnknown(tok) && /^[A-Z]/.test(tok.text)) {
      const after = toks[j + 1];
      if (after && (isSuffix(after.text) || after.num)) break;
      v.make = tok.text;
      v.weak = true;
      unknownTaken += 1;
      j += 1;
      v.end = toks[j - 1].end;
      continue;
    }
    break;
  }

  const valid =
    (v.year && (v.make || v.model)) ||
    (v.make && v.model && !v.makeAmbiguous) ||
    (v.make && v.model && v.year);
  if (!valid) return null;
  if (v.makeAmbiguous && !v.year && !v.model) return null;

  const value = [v.year, v.make, v.model, ...v.extras].filter(Boolean).join(" ");
  return { vehicle: { value, start: v.start, end: v.end, weak: v.weak, year: v.year, make: v.make, model: v.model }, next: Math.max(j, i + 1) };
}

const COUNT_RE = new RegExp(
  `\\b(\\d{1,2}|${Object.keys(NUMBER_WORDS).join("|")})\\s*(?:x\\s*)?(${Object.keys(VEHICLE_WORDS).join("|")})\\b(?!\\s*#?\\s*\\d\\s*[:.)-])`,
  "gi"
);
const COUNT_AFTER_RE = new RegExp(`\\b(?:#\\s*of\\s+|number\\s+of\\s+)?(${Object.keys(VEHICLE_WORDS).join("|")})\\s*[:=-]\\s*(\\d{1,2})(?!\\d)(?!\\s*[:.)])`, "gi");

export function findVehicleCount(ctx, blocked) {
  const generic = [];
  const specific = [];
  const take = (count, word, start, end) => {
    if (hitsAny({ start, end }, blocked)) return;
    if (!Number.isFinite(count) || count <= 0 || count > 20) return;
    const kind = VEHICLE_WORDS[word.toLowerCase()];
    (kind === "vehicle" ? generic : specific).push({ count, kind, start, end });
  };
  COUNT_RE.lastIndex = 0;
  let m;
  while ((m = COUNT_RE.exec(ctx.text)) !== null) {
    const raw = m[1].toLowerCase();
    // "a car" / "an suv" are not counts unless nothing else exists.
    const count = /^\d+$/.test(raw) ? Number(raw) : NUMBER_WORDS[raw];
    if ((raw === "a" || raw === "an") && /\bcar\s*\d/i.test(ctx.text)) continue;
    take(count, m[2], m.index, m.index + m[0].length);
  }
  COUNT_AFTER_RE.lastIndex = 0;
  while ((m = COUNT_AFTER_RE.exec(ctx.text)) !== null) {
    take(Number(m[2]), m[1], m.index, m.index + m[0].length);
  }
  if (generic.length) return generic[0].count;
  if (!specific.length) return null;
  // "2 cars and 1 truck" = 3; repeated "2 cars ... 2 cars" counted once per kind.
  const byKind = new Map();
  for (const s of specific) if (!byKind.has(s.kind)) byKind.set(s.kind, s.count);
  return [...byKind.values()].reduce((a, b) => a + b, 0);
}
