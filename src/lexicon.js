// Dictionary lookups built once from the data files.
import { compact, bestFuzzy } from "./fuzzy.js";
import { STATE_ABBRS, STATE_NAMES, MAX_STATE_WORDS } from "./data/states.js";
import { STREET_SUFFIXES, WEAK_SUFFIXES, DIRECTIONALS, UNIT_WORDS } from "./data/streets.js";
import { CARRIERS, CARRIER_FUZZY_STOP } from "./data/carriers.js";
import { MAKES, MODELS, MODEL_ALIASES } from "./data/vehicles.js";
import { FIELD_WORDS, COMMON_WORDS } from "./data/vocab.js";

// ---------- states ----------

// Is there a state starting at tokens[i]? Returns { end: lastIndex, abbr }.
// Two-letter codes must be upper-case unless a ZIP follows or a comma precedes
// ("in", "or", "me", "ok" are words far more often than states).
export function stateAt(tokens, i) {
  const first = tokens[i];
  if (!first || !first.alpha) return null;
  for (let size = Math.min(MAX_STATE_WORDS, tokens.length - i); size >= 1; size -= 1) {
    const run = tokens.slice(i, i + size);
    if (run.some((t) => !t.alpha && t.text !== ".") || run.some((t) => t.line !== first.line)) continue;
    const phrase = run.filter((t) => t.alpha).map((t) => t.lower).join(" ");
    if (STATE_NAMES.has(phrase)) return { end: i + size - 1, abbr: STATE_NAMES.get(phrase), name: true };
  }
  if (first.text.length === 2 && STATE_ABBRS.has(first.text.toUpperCase())) {
    // "D.C." / "T.X." style is rare; plain codes only.
    const upper = first.text === first.text.toUpperCase();
    const next = tokens[i + 1];
    const zipNext = next && next.num && next.text.length === 5 && next.line === first.line;
    const prev = tokens[i - 1];
    const commaBefore = prev && prev.text === "," && prev.line === first.line;
    const lineEnds = !next || next.line !== first.line || next.text === ",";
    if (upper || zipNext || (commaBefore && lineEnds)) {
      return { end: i, abbr: first.text.toUpperCase(), name: false };
    }
  }
  return null;
}

// ---------- streets ----------

export const isSuffix = (word) => STREET_SUFFIXES.has(String(word).toLowerCase().replace(/\.$/, ""));
export const isWeakSuffix = (word) => WEAK_SUFFIXES.has(String(word).toLowerCase());
export const isDirectional = (word) => DIRECTIONALS.has(String(word).toLowerCase().replace(/\./g, ""));
export const isUnitWord = (word) => UNIT_WORDS.has(String(word).toLowerCase().replace(/\./g, ""));
export const isFieldWord = (word) => FIELD_WORDS.has(String(word).toLowerCase());
export const isCommonWord = (word) => COMMON_WORDS.has(String(word).toLowerCase());

// ---------- carriers ----------

const CARRIER_EXACT = new Map(); // compact alias -> { name, ambiguous }
for (const [name, aliases, flags = {}] of CARRIERS) {
  for (const alias of aliases) {
    const key = compact(alias);
    if (!key) continue;
    const existing = CARRIER_EXACT.get(key);
    // An unambiguous definition always wins over an ambiguous one.
    if (!existing || (existing.ambiguous && !flags.ambiguous)) {
      CARRIER_EXACT.set(key, { name, ambiguous: Boolean(flags.ambiguous) });
    }
  }
}
const CARRIER_FUZZY = [...CARRIER_EXACT.entries()]
  .filter(([key, v]) => !v.ambiguous && key.length >= 5)
  .map(([key, v]) => ({ compact: key, ...v }));

export const MAX_CARRIER_WORDS = 5;

export function carrierExact(phrase) {
  return CARRIER_EXACT.get(compact(phrase)) || null;
}

export function carrierFuzzy(phrase) {
  const key = compact(phrase);
  if (key.length < 5 || CARRIER_FUZZY_STOP.has(key)) return null;
  if (isFieldWord(key) || isCommonWord(key) || makeExact(key) || STATE_NAMES.has(key)) return null;
  const hit = bestFuzzy(key, CARRIER_FUZZY);
  return hit ? { name: hit.entry.name, ambiguous: false, distance: hit.distance } : null;
}

// ---------- vehicles ----------

const MAKE_EXACT = new Map();
for (const [name, aliases, flags = {}] of MAKES) {
  for (const alias of aliases) {
    const key = compact(alias);
    const existing = MAKE_EXACT.get(key);
    if (!existing || (existing.ambiguous && !flags.ambiguous)) {
      MAKE_EXACT.set(key, { name, ambiguous: Boolean(flags.ambiguous) });
    }
  }
}
const MAKE_FUZZY = [...MAKE_EXACT.entries()]
  .filter(([key, v]) => !v.ambiguous && key.length >= 5)
  .map(([key, v]) => ({ compact: key, ...v }));

export const MAX_MAKE_WORDS = 2;

export function makeExact(phrase) {
  return MAKE_EXACT.get(compact(phrase)) || null;
}

export function makeFuzzy(phrase) {
  const key = compact(phrase);
  if (key.length < 5 || isFieldWord(key) || isCommonWord(key) || CARRIER_EXACT.has(key)) return null;
  const hit = bestFuzzy(key, MAKE_FUZZY);
  return hit ? { name: hit.entry.name, ambiguous: false } : null;
}

const MODEL_EXACT = new Map(); // compact -> { model, makes:Set }
const addModel = (key, model, make) => {
  if (!key) return;
  if (!MODEL_EXACT.has(key)) MODEL_EXACT.set(key, { model, makes: new Set() });
  if (make) MODEL_EXACT.get(key).makes.add(make);
};
for (const [make, models] of Object.entries(MODELS)) {
  for (const model of models) addModel(compact(model), model, make);
}
for (const [key, model] of Object.entries(MODEL_ALIASES)) {
  const target = MODEL_EXACT.get(compact(model));
  if (target) for (const make of target.makes) addModel(key, model, make);
  else addModel(key, model, null);
}
const MODEL_FUZZY = [...MODEL_EXACT.entries()]
  .filter(([key]) => key.length >= 5 && /[a-z]/.test(key))
  .map(([key, v]) => ({ compact: key, ...v }));

export const MAX_MODEL_WORDS = 3;

// Bare numbers ("300", "500", "1500") are only models when a make is known.
export function modelExact(phrase, make) {
  const key = compact(phrase);
  const hit = MODEL_EXACT.get(key);
  if (!hit) return null;
  if (make && hit.makes.size && !hit.makes.has(make)) return null;
  if (!make && /^\d+$/.test(key)) return null;
  if (!make && key.length <= 2) return null;
  return { model: hit.model, make: hit.makes.size === 1 ? [...hit.makes][0] : make || null };
}

export function modelFuzzy(phrase, make) {
  const key = compact(phrase);
  if (key.length < 5 || isFieldWord(key) || isCommonWord(key)) return null;
  const pool = make ? MODEL_FUZZY.filter((e) => e.makes.has(make)) : MODEL_FUZZY;
  const hit = bestFuzzy(key, pool);
  if (!hit) return null;
  return { model: hit.entry.model, make: hit.entry.makes.size === 1 ? [...hit.entry.makes][0] : make || null };
}

export { compact };
