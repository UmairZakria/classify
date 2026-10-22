// ADDRESS: find where an address STARTS and where it ENDS, then copy that
// exact span of text. Nothing inside is rebuilt, abbreviated or dropped:
//
//   "617 Stellaway Dr, Desoto, Texas 75115"  ->  "617 Stellaway Dr, Desoto, Texas 75115"
//   "12 Oak St\nApt 4B\nDallas TX 75201-1234" ->  "12 Oak St, Apt 4B, Dallas TX 75201-1234"
//
// Start = a house number (or PO Box) followed by street words, or the value
// of an "Address:" label. End = the ZIP (+4); else the state; else the street
// suffix / unit / city run. Hard stops (phone, email, date, vehicle, another
// field's label or vocabulary) bound the search so the address can never
// swallow the rest of the note.
import {
  stateAt, isSuffix, isWeakSuffix, isDirectional, isUnitWord, carrierExact, makeExact, isCommonWord,
} from "../lexicon.js";
import { ROAD_TYPES } from "../data/streets.js";
import { cleanValue, hitsAny } from "../text.js";

const STOP_WORDS = new Set(
  `phone ph cell cellphone tel telephone dob born birthday bday email e-mail insurance insured ins insurer carrier
  policy coverage covered premium vehicle vehicles vehical vehicals car cars truck trucks suv suvs drivers driver
  license licence owns owned owner owners homeowner homeowners rent rents renter renting rental tenant lease years
  yrs yr months mos age spouse wife husband married single divorced kids children call called calling callback cb
  wants want needs need quote interested said says currently current previous previously thanks thank please
  tomorrow today accident accidents ticket tickets claim claims dui sr22 lives living resides has have had with was
  is are paying pays paid email name dl`.match(/[a-z0-9-]+/g)
);
// Words that may follow a ZIP and still be part of the address.
const COUNTRY = new Set(["usa", "us", "united", "states", "america", "u"]);
const SKIPPABLE = new Set(["zip", "zipcode", "code", "postal"]);
// Words that can never be the first word of a street name.
const FUNCTION_WORDS = new Set(
  `a an the and or of to in on at for with by from is was are be been it this that my his her their our your
  times x am pm yo kids people days weeks hours mins minutes dollars bucks percent more less than about years yrs
  months mos old`.match(/[a-z]+/g)
);

function tokensOfLine(ctx, line) {
  return ctx.tokens.filter((t) => t.line === line);
}

function isHouseNumber(t) {
  return /^\d{1,6}[A-Za-z]?$/.test(t.text) && !/^0+$/.test(t.text);
}

function isZipAt(R, k) {
  const t = R[k];
  if (!t || !/^\d{5}$/.test(t.text)) return false;
  const prev = R[k - 1];
  if (prev && stateAt(R, k - 1)) return true;
  if (prev && (isUnitWord(prev.text) || prev.text === "#" || ROAD_TYPES.has(prev.lower))) return false;
  return true;
}

function zipEnd(R, k) {
  // ZIP+4: "75115-1234"
  if (R[k + 1] && R[k + 1].text === "-" && R[k + 2] && /^\d{4}$/.test(R[k + 2].text) &&
      R[k + 1].start === R[k].end && R[k + 2].start === R[k + 1].end) return k + 2;
  return k;
}

// Extend past a terminal anchor over ", TX", " 75115", ", USA", "Apt 5".
function extendTail(R, k) {
  let end = k;
  let j = k + 1;
  while (j < R.length) {
    const t = R[j];
    if (t.text === ",") { j += 1; continue; }
    if (isZipAt(R, j)) { end = zipEnd(R, j); j = end + 1; continue; }
    const st = stateAt(R, j);
    if (st) { end = st.end; j = st.end + 1; continue; }
    if (COUNTRY.has(t.lower) && (t.lower !== "us" || t.text === "US")) {
      let e = j;
      while (R[e + 1] && (COUNTRY.has(R[e + 1].lower) || R[e + 1].text === ".")) e += 1;
      end = e;
      j = e + 1;
      continue;
    }
    if (SKIPPABLE.has(t.lower)) { j += 1; continue; }
    break;
  }
  return end;
}

function unitAfter(R, k) {
  // Returns the index of the last unit token starting at k, or -1.
  const t = R[k];
  if (!t) return -1;
  if (stateAt(R, k)) return -1;
  if (isUnitWord(t.text) || t.text === "#") {
    let j = k + 1;
    if (R[j] && (R[j].text === "." || R[j].text === "#")) j += 1;
    if (R[j] && R[j].text === "-") j += 1;
    if (R[j] && /^[A-Za-z]?\d+[A-Za-z]?$|^[A-Za-z]$/.test(R[j].text)) {
      let e = j;
      if (R[e + 1] && R[e + 1].text === "-" && R[e + 2] && /^[A-Za-z0-9]{1,4}$/.test(R[e + 2].text)) e += 2;
      return e;
    }
    return -1;
  }
  return -1;
}

function isStopAt(ctx, R, k, extraStops) {
  const t = R[k];
  if (hitsAny(t, extraStops)) return true;
  if (ctx.labels.some((l) => l.field !== "address" && l.field !== "zip" && l.start === t.start)) return true;
  if (STOP_WORDS.has(t.lower)) {
    // "123 Old Phone Rd" is absurd; but "Van", "Mobile", "Old" etc. are not in
    // this list on purpose. "has"/"with"/"is" may appear in sentences only.
    if (isSuffix(R[k + 1]?.text || "") && !isSuffix(t.text)) return false;
    return true;
  }
  if (t.lower === "and" || t.lower === "for" || t.lower === "but") {
    const ahead = R.slice(k + 1, k + 4);
    return !ahead.some((a) => isSuffix(a.text) && !isWeakSuffix(a.text));
  }
  return false;
}

// Is a whole line a plausible continuation of an address block?
function isContinuationLine(ctx, toks, nextToks, extraStops) {
  const words = toks.filter((t) => t.word);
  if (!words.length || words.length > 9) return false;
  if (toks.some((t) => hitsAny(t, extraStops))) return false;
  if (ctx.labels.some((l) => l.line === toks[0].line && l.field !== "address" && l.field !== "zip")) return false;
  if (words.some((t) => STOP_WORDS.has(t.lower))) return false;
  if (unitAfter(toks, 0) >= 0 && words.length <= 4) return true;
  if (toks.some((_, k) => isZipAt(toks, k))) return true;
  for (let k = 0; k < toks.length; k += 1) {
    const st = stateAt(toks, k);
    if (st && words.length <= 6 && st.end >= toks.length - 2) {
      return toks.slice(0, k).every((t) => t.alpha || t.text === "," || t.text === ".");
    }
  }
  if (words.length <= 3 && words.every((t) => t.alpha && !isCommonWord(t.text) && !carrierExact(t.text) && !makeExact(t.text)) &&
      nextToks && nextToks.length && isContinuationLine(ctx, nextToks, null, extraStops)) {
    return true;
  }
  if (words.length <= 3 && words.every((t) => COUNTRY.has(t.lower))) return true;
  return false;
}

// Build the region of tokens an address starting at `startTok` may occupy:
// the rest of its line plus any continuation lines.
function regionFrom(ctx, startTok, extraStops, maxEndOffset = Infinity) {
  let R = tokensOfLine(ctx, startTok.line).filter((t) => t.start >= startTok.start && t.end <= maxEndOffset);
  let line = startTok.line;
  const hasZip = () => R.some((_, k) => k > 0 && isZipAt(R, k));
  const hitStop = () => R.some((t, k) => k > 0 && isStopAt(ctx, R, k, extraStops));
  while (line + 1 < ctx.lines.length && !hasZip() && !hitStop()) {
    const next = tokensOfLine(ctx, line + 1);
    const after = tokensOfLine(ctx, line + 2);
    if (!isContinuationLine(ctx, next, after, extraStops)) break;
    R = R.concat(next);
    line += 1;
  }
  return R;
}

// Core: given region tokens R (R[0] is the house number / first value
// token), return the index of the last address token, or -1.
function findEnd(ctx, R, { labeled, poBoxEnd = -1, carrierStops, extraStops }) {
  let stop = R.length;
  for (let k = 1; k < R.length; k += 1) {
    if (isStopAt(ctx, R, k, extraStops)) { stop = k; break; }
  }
  const S = R.slice(0, stop);
  const bodyFrom = poBoxEnd >= 0 ? poBoxEnd + 1 : 1;
  const hasAlphaBefore = (k) => S.slice(0, k).some((t) => t.alpha);

  // 1) ZIP terminates a US address.
  for (let k = bodyFrom; k < S.length; k += 1) {
    if (isZipAt(S, k) && (hasAlphaBefore(k) || poBoxEnd >= 0)) {
      return extendTail(S, zipEnd(S, k));
    }
  }

  // Without a ZIP, a carrier name ends the address unless a state follows it
  // ("123 Main St Farmers Branch TX" keeps the city).
  let limit = S.length;
  for (const c of carrierStops) {
    const k = S.findIndex((t) => t.start === c.start);
    if (k > bodyFrom) {
      const after = S.findIndex((t) => t.start >= c.end);
      const stateNear = after >= 0 && [after, after + 1, after + 2].some((a) => a < S.length && stateAt(S, a));
      if (!stateNear) { limit = Math.min(limit, k); }
    }
  }
  const L = S.slice(0, limit);

  // 2) State terminates it (first standalone state after the street words).
  for (let k = Math.max(bodyFrom + 1, 2); k < L.length; k += 1) {
    const st = stateAt(L, k);
    if (!st) continue;
    const next = L[st.end + 1];
    if (next && next.alpha && !STOP_WORDS.has(next.lower) && !COUNTRY.has(next.lower)) continue; // "Kansas City", "Indiana Ave"
    if (!hasAlphaBefore(k)) continue;
    return extendTail(L, st.end);
  }

  // 3) Structural end: suffix [directional] [unit] [city].
  let end = -1;
  let suffixAt = -1;
  for (let k = bodyFrom + 1; k < L.length; k += 1) {
    if (!L[k].alpha || !isSuffix(L[k].text)) continue;
    if (isWeakSuffix(L[k].text)) {
      const nxt = L[k + 1];
      const nextOk = !nxt || nxt.text === "," || nxt.text === "." || isDirectional(nxt.text) || unitAfter(L, k + 1) >= 0;
      if (!nextOk) continue;
    }
    if (isSuffix(L[k + 1]?.text || "") && !isWeakSuffix(L[k + 1].text)) continue; // "Park Ave": take the later one
    suffixAt = k;
    break;
  }
  if (suffixAt < 0) {
    // Numbered roads: "Hwy 287", "County Road 45", "FM 1960", "CR 3410".
    for (let k = bodyFrom; k < L.length - 1; k += 1) {
      if (ROAD_TYPES.has(L[k].lower) && /^\d{1,5}[A-Za-z]?$/.test(L[k + 1].text)) { suffixAt = k + 1; break; }
      if (ROAD_TYPES.has(L[k].lower) && isSuffix(L[k + 1].text) && L[k + 2] && /^\d{1,5}$/.test(L[k + 2].text)) { suffixAt = k + 2; break; }
    }
  }
  if (suffixAt >= 0) {
    end = suffixAt;
    let j = end + 1;
    if (L[j] && L[j].text === ".") { end = j; j += 1; }
    if (L[j] && isDirectional(L[j].text) && L[j].text.length <= 2) { end = j; j += 1; }
    if (L[j] && L[j].text === ",") j += 1;
    const u = unitAfter(L, j);
    if (u >= 0) { end = u; j = u + 1; }
    // City: 1-3 plain words, optionally comma-separated, that run to the end
    // of the region (otherwise they belong to something else).
    let c = j;
    if (L[c] && L[c].text === ",") c += 1;
    const cityStart = c;
    while (c < L.length && c - cityStart < 3 && L[c].alpha && !isCommonWord(L[c].text) && !makeExact(L[c].text)) c += 1;
    if (c > cityStart) {
      const rest = L.slice(c).filter((t) => t.word);
      const sameLineEnd = rest.length === 0 || (L[c] && L[c].line !== L[cityStart].line);
      if (sameLineEnd || stop < R.length || limit < S.length) end = c - 1;
    }
    return end;
  }
  if (poBoxEnd >= 0) return poBoxEnd;
  if (labeled) {
    // Labelled value without a recognisable structure: keep it all.
    let e = L.length - 1;
    while (e > 0 && !L[e].word) e -= 1;
    return e;
  }
  return -1;
}

function score(c) {
  return (c.labeled ? 10 : 0) + (c.hasZip ? 4 : 0) + (c.hasState ? 2 : 0) + (c.hasSuffix ? 1 : 0);
}

export function findAddress(ctx, { stops, carriers }) {
  const candidates = [];
  const carrierStops = carriers.filter((c) => !c.ambiguous);

  const build = (R, endIdx, labeled) => {
    if (endIdx < 0) return null;
    const span = { start: R[0].start, end: R[endIdx].end };
    const value = cleanValue(ctx.text.slice(span.start, span.end));
    const toks = R.slice(0, endIdx + 1);
    if (!toks.some((t) => t.alpha)) return null;
    return {
      value,
      ...span,
      labeled,
      hasZip: toks.some((_, k) => k > 0 && isZipAt(toks, k)),
      hasState: toks.some((_, k) => k > 0 && stateAt(toks, k)),
      hasSuffix: toks.some((t, k) => k > 0 && t.alpha && isSuffix(t.text)),
    };
  };

  // --- Labelled: "Address: ...", "lives at ...".
  for (const label of ctx.labels.filter((l) => l.field === "address")) {
    let first;
    let maxEnd = label.valueEnd;
    if (label.dangling) {
      const next = tokensOfLine(ctx, label.line + 1);
      first = next.find((t) => t.word);
      maxEnd = Infinity;
    } else {
      first = ctx.tokens.find((t) => t.start >= label.valueStart && t.word && t.line === label.line);
    }
    if (!first) continue;
    // Region bounded by the next label on the same line (if any).
    const R = regionFrom(ctx, first, stops, label.dangling ? Infinity : maxEnd === ctx.lines[label.line].end ? Infinity : maxEnd);
    const po = poBoxEndIndex(R, 0);
    const endIdx = findEnd(ctx, R, { labeled: true, poBoxEnd: po, carrierStops, extraStops: stops });
    const c = build(R, endIdx, true);
    if (c) candidates.push(c);
  }

  // --- Unlabelled: house number + street words / PO Box.
  const claimed = candidates.map((c) => ({ start: c.start, end: c.end }));
  for (let i = 0; i < ctx.tokens.length; i += 1) {
    const t = ctx.tokens[i];
    if (hitsAny(t, claimed) || hitsAny(t, stops)) continue;
    const po = poBoxEndIndex(ctx.tokens, i);
    if (po < 0) {
      if (!isHouseNumber(t)) continue;
      const prev = ctx.tokens[i - 1];
      if (prev && prev.line === t.line && (isUnitWord(prev.text) || prev.text === "#" || prev.text === "$" ||
          ROAD_TYPES.has(prev.lower) || /^\d+$/.test(prev.text))) continue;
      if (prev && prev.text === "-" && ctx.tokens[i - 2]?.num) continue;
      const next = nextWord(ctx.tokens, i);
      if (!next || next.line !== t.line) continue;
      if (!(next.alpha || /^\d+(?:st|nd|rd|th)$/i.test(next.text))) continue;
      if (STOP_WORDS.has(next.lower) || FUNCTION_WORDS.has(next.lower)) continue;
    }
    const R = regionFrom(ctx, t, stops);
    const poLocal = po < 0 ? -1 : po - i;
    const endIdx = findEnd(ctx, R, { labeled: false, poBoxEnd: poLocal, carrierStops, extraStops: stops });
    const c = build(R, endIdx, false);
    if (!c) continue;
    // A real street needs at least one street word that is not a state/ZIP.
    candidates.push(c);
    claimed.push({ start: c.start, end: c.end });
  }

  if (!candidates.length) return null;
  candidates.sort((a, b) => score(b) - score(a) || a.start - b.start);
  return candidates[0];
}

function nextWord(tokens, i) {
  for (let j = i + 1; j < tokens.length; j += 1) {
    if (tokens[j].word) return tokens[j];
    if (tokens[j].text !== "-" && tokens[j].text !== "/") return null;
  }
  return null;
}

// "PO Box 12", "P.O. Box 12", "Post Office Box 12" starting at index i.
function poBoxEndIndex(tokens, i) {
  const t = tokens[i];
  if (!t) return -1;
  const seq = [];
  for (let j = i; j < Math.min(tokens.length, i + 8); j += 1) {
    if (tokens[j].line !== t.line) break;
    seq.push(tokens[j]);
  }
  const text = seq.map((x) => x.lower).join(" ").replace(/\s*\.\s*/g, " ").replace(/\s+/g, " ");
  const m = text.match(/^(?:p o box|po box|pobox|post office box|p o b|pob)\s+#?\s*(\d+)/);
  if (!m) return -1;
  const k = seq.findIndex((x) => x.text === m[1]);
  return k < 0 ? -1 : i + k;
}
