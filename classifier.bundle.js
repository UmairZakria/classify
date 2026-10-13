(function() {
"use strict";
const modules = {
"extension/classifier-entry.js": function(module, exports, __load) {
"use strict";

const { classify } = __load("classify.js");
const { googleSheetsRow } = __load("lib/report.js");
const { VEHICLE_MAKES, VEHICLE_MODELS } = __load("data/vehicles.js");

const NOTE_LINE = /^\s*(?:CB|call\s*back|callback|follow[\s-]*up|f\/u|left\s+(?:a\s+)?message|no\s+answer)\b.*$/i;
const TRAILING_NOTE =
  /\s+(?:\bCB\b|call\s*back|callback|follow[\s-]*up|f\/u|left\s+(?:a\s+)?message|no\s+answer)\b.*$/i;

const VEHICLE_SPELLING_FIXES = [
  [/\bforster\b/gi, "Forester"],
  [/\bforestr\b/gi, "Forester"],
  [/\bchevorlet\b/gi, "Chevrolet"],
  [/\btoyata\b/gi, "Toyota"],
  [/\bcaddilac\b/gi, "Cadillac"],
  [/\blincon\b/gi, "Lincoln"],
  [/\brouge\b/gi, "Rogue"],
  [/\brougue\b/gi, "Rogue"],
  [/\bf-?150\b/gi, "F-150"],
  [/\bcx-?5\b/gi, "CX-5"],
];
const MAKE_NAMES = VEHICLE_MAKES.flatMap((make) =>
  [make.canonical, ...make.aliases].map((alias) => [alias, make.canonical])
).sort((a, b) => b[0].length - a[0].length);
const MODEL_NAMES = [...new Set(Object.values(VEHICLE_MODELS).flat())].sort((a, b) => b.length - a.length);

function replaceVehicleName(text, name, replacement) {
  const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&").replace(/\s+/g, "\\s+");
  const pattern = new RegExp(`(^|[^A-Za-z0-9])(${escaped})(?=$|[^A-Za-z0-9])`, "gi");
  return text.replace(pattern, (_match, prefix) => `${prefix}${replacement}`);
}

function cleanLeadText(text) {
  return String(text)
    .split(/\r?\n/)
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

function correctVehicleSpelling(text) {
  return String(text)
    .split(/\r?\n/)
    .map((line) => {
      if (!/\b(?:19|20)\d{2}\b/.test(line)) return line;
      let corrected = line.replace(/^\s*car\s*\d+\s*[:.)-]?\s*/i, "");
      corrected = VEHICLE_SPELLING_FIXES.reduce(
        (value, [pattern, correction]) => value.replace(pattern, correction),
        corrected
      );
      for (const [alias, canonical] of MAKE_NAMES) corrected = replaceVehicleName(corrected, alias, canonical);
      for (const model of MODEL_NAMES) corrected = replaceVehicleName(corrected, model, model);
      return corrected;
    })
    .join("\n");
}

function toGoogleSheetsRow(rawText) {
  const original = String(rawText).trim();
  if (!/[\r\n]/.test(original) && original.split("\t").length === 10) return original;
  const cleaned = cleanLeadText(rawText);
  if (!cleaned) throw new Error("The comments text area is empty.");
  return googleSheetsRow(classify(correctVehicleSpelling(cleaned)));
}

module.exports = { cleanLeadText, correctVehicleSpelling, toGoogleSheetsRow };

},
"classify.js": function(module, exports, __load) {
"use strict";

// Public entry point.
//
// Pipeline: normalize -> structure/atoms -> rule candidates -> arbitration.
// A value a human can see is never silently dropped: primary values stay
// populated, rivals become `alternatives`, contradictory statements become
// `conflicts`, negated mentions become `excluded`, and anything left over
// becomes `unknown` with a reason.
const { buildContext } = __load("lib/context.js");
const { runRules } = __load("lib/rules/index.js");
const { arbitrate, FIELDS } = __load("lib/arbitrate.js");
const { detectPhones, detectZips } = __load("lib/rules/contact.js");
const { detectAddresses } = __load("lib/rules/address.js");
const { detectNames, detectDateOfBirth, detectAge } = __load("lib/rules/person.js");
const { detectVehicles, detectVehicleCount } = __load("lib/rules/vehicle.js");
const { detectInsuranceCompanies, detectInsuranceDurations } = __load("lib/rules/insurance.js");
const { detectHomeOwner, detectHomeType } = __load("lib/rules/home.js");

function classify(input) {
  const ctx = buildContext(input);
  if (!ctx.normalizedText) return emptyResult(ctx);

  const { candidates, ruleErrors } = runRules(ctx);
  const outcome = arbitrate(ctx, candidates);
  const { fields } = outcome;

  return {
    name: fields.name.value,
    phone: fields.phone.value,
    phones: fields.phones.value,
    address: fields.address.value,
    zip: fields.zip.value == null ? null : String(fields.zip.value),
    vehicles: fields.vehicles.value,
    vehicleCount: fields.vehicleCount.value,
    vehicleCategory: fields.vehicleCategory.value,
    insuranceCompany: fields.insuranceCompany.value,
    insuranceDuration: fields.insuranceDuration.value,
    homeOwner: fields.homeOwner.value,
    homeType: fields.homeType.value,
    dateOfBirth: fields.dateOfBirth.value,
    email: fields.email.value,
    spouseName: fields.spouseName.value,
    spouseDob: fields.spouseDob.value,
    age: fields.age.value,
    status: outcome.status,
    confidence: Object.fromEntries(FIELDS.map((field) => [field, fields[field].confidence || 0])),
    conflicts: outcome.conflicts,
    alternatives: outcome.alternatives,
    excluded: outcome.excluded,
    unknown: outcome.unknown,
    debug: buildDebug(ctx, outcome, candidates, ruleErrors),
  };
}

module.exports = {
  classify,
  detectPhone: detectPhones,
  detectZip: detectZips,
  detectAddress: detectAddresses,
  detectName: detectNames,
  detectDateOfBirth,
  detectAge,
  detectVehicle: detectVehicles,
  detectVehicleCount,
  detectInsuranceCompany: detectInsuranceCompanies,
  detectInsuranceDuration: detectInsuranceDurations,
  detectHomeOwner,
  detectHomeType,
  buildContext,
  FIELDS,
};


function buildDebug(ctx, outcome, candidates, ruleErrors) {
  const acceptedKeys = new Set(outcome.accepted.map((c) => `${c.field}::${c.start}::${c.end}::${String(c.value)}`));
  const scored = candidates
    .filter((c) => c.value != null)
    .sort((a, b) => {
      if (b.confidence !== a.confidence) return b.confidence - a.confidence;
      if (a.field < b.field) return -1;
      if (a.field > b.field) return 1;
      return (a.start ?? 0) - (b.start ?? 0);
    })
    .map((c) => ({
      field: c.field,
      value: c.value,
      confidence: c.confidence,
      sourceText: c.sourceText,
      start: c.start,
      end: c.end,
      evidence: c.evidence,
      meta: c.meta,
      rule: c.rule,
      accepted: acceptedKeys.has(`${c.field}::${c.start}::${c.end}::${String(c.value)}`),
    }));

  return {
    rawText: ctx.rawText,
    normalizedText: ctx.normalizedText,
    truncated: ctx.truncated,
    candidates: scored,
    rejected: outcome.rejected,
    conflicts: outcome.conflicts,
    alternatives: outcome.alternatives,
    excluded: outcome.excluded,
    ruleErrors,
    items: ctx.items.map((item) => ({
      text: item.text,
      start: item.start,
      end: item.end,
      targetIndex: item.targetIndex,
      labels: item.labels.map((l) => ({
        field: l.field,
        phrase: l.phrase,
        valueText: l.valueText,
        dangling: l.dangling,
      })),
      parts: item.parts.map((p) => p.text),
    })),
  };
}

function emptyResult(ctx) {
  const fields = Object.fromEntries(FIELDS.map((field) => [field, []]));
  return {
    name: null,
    phone: null,
    phones: [],
    address: null,
    zip: null,
    vehicles: [],
    vehicleCount: null,
    vehicleCategory: null,
    insuranceCompany: null,
    insuranceDuration: null,
    homeOwner: null,
    homeType: null,
    dateOfBirth: null,
    email: null,
    spouseName: null,
    spouseDob: null,
    age: null,
    status: "empty",
    confidence: Object.fromEntries(FIELDS.map((field) => [field, 0])),
    conflicts: [],
    alternatives: {},
    excluded: {},
    unknown: [],
    debug: {
      rawText: ctx.rawText,
      normalizedText: ctx.normalizedText,
      truncated: ctx.truncated,
      candidates: [],
      rejected: fields,
      conflicts: [],
      alternatives: {},
      excluded: {},
      ruleErrors: [],
      items: [],
    },
  };
}

},
"lib/context.js": function(module, exports, __load) {
"use strict";

// Shared call context: normalized text + structure + atoms, built once and
// handed to every rule. Rules are pure functions of this context, which is
// what makes them independently testable and cheap to add.
const { normalize } = __load("lib/normalize.js");
const { segment } = __load("lib/structure.js");
const { scanAtoms } = __load("lib/atoms.js");

function buildContext(input) {
  const { rawText, normalizedText, truncated } = normalize(input);
  const structure = segment(normalizedText);
  const atoms = scanAtoms(normalizedText);
  return { rawText, normalizedText, truncated, atoms, ...structure };
}

module.exports = { buildContext };

},
"lib/normalize.js": function(module, exports, __load) {
"use strict";

const MAX_INPUT_LENGTH = 100_000;

function safeString(input) {
  if (input == null) return "";
  if (typeof input === "string") return input;
  if (typeof input === "number" || typeof input === "boolean") return String(input);
  if (typeof Buffer !== "undefined" && Buffer.isBuffer(input)) return input.toString("utf8");
  return String(input);
}

function normalize(input) {
  const rawText = safeString(input);
  const truncated = rawText.length > MAX_INPUT_LENGTH;
  const limited = truncated ? rawText.slice(0, MAX_INPUT_LENGTH) : rawText;

  let normalized = limited.normalize("NFKC");
  normalized = normalized
    .replace(/[\u00a0\u202f\u2007\u2009\u200a\u200b\ufeff]/g, " ")
    .replace(/[\u2018\u2019\u201a\u201b]/g, "'")
    .replace(/[\u201c\u201d\u201e\u201f]/g, '"')
    .replace(/[\u2010\u2011\u2012\u2013\u2014\u2015\u2212]/g, "-")
    .replace(/\r\n?/g, "\n")
    .replace(/\t/g, " ")
    .replace(/[^\S\n]+/g, " ")
    .replace(/ *\n */g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();

  return {
    rawText: limited,
    normalizedText: normalized,
    truncated,
  };
}

module.exports = {
  MAX_INPUT_LENGTH,
  safeString,
  normalize,
};

},
"lib/structure.js": function(module, exports, __load) {
"use strict";

// Structure: turn the text into line-scoped, span-carrying "items" and
// "parts", and bind labels to values that are on the SAME line.
//
// This is the fix for the class of bug where a "zip:" label on one line was
// allowed to vouch for an unrelated number on the next line: a label window
// never crosses a line break, and never crosses a part boundary.
const { LABEL_PHRASES } = __load("data/labels.js");
const { tokenize } = __load("lib/tokenize.js");

const PART_RE = /[^,;|]+/g;
const SEPARATOR_RE = /^[\s:=\-–—]*/;

function offsetOf(lineText, base, index) {
  return base + index;
}

function findLabels(lineText, base) {
  const used = [];
  const labels = [];
  const overlapsUsed = (start, end) => used.some((u) => start < u.end && u.start < end);

  for (const entry of LABEL_PHRASES) {
    const re = new RegExp(entry.re.source, "gi");
    let m;
    while ((m = re.exec(lineText)) !== null) {
      const start = m.index;
      const end = start + m[0].length;
      if (overlapsUsed(start, end)) continue;
      const rest = lineText.slice(end);
      const sep = rest.match(SEPARATOR_RE);
      const sepLength = sep ? sep[0].length : 0;
      const valueStart = end + sepLength;
      const valueText = lineText.slice(valueStart).trim();
      used.push({ start, end });
      labels.push({
        field: entry.field,
        phrase: m[0],
        start: offsetOf(lineText, base, start),
        end: offsetOf(lineText, base, end),
        valueStart: offsetOf(lineText, base, valueStart),
        valueText,
        before: lineText.slice(0, start).replace(/[\s,;:-]+$/, "").trim(),
        dangling: valueText.length === 0,
      });
    }
  }
  return labels.sort((a, b) => a.start - b.start);
}

function splitParts(lineText, base) {
  const parts = [];
  const re = new RegExp(PART_RE.source, "g");
  let m;
  while ((m = re.exec(lineText)) !== null) {
    const piece = m[0].trim();
    if (!piece) continue;
    const rel = m[0].indexOf(piece);
    parts.push({
      text: piece,
      start: base + m.index + rel,
      end: base + m.index + rel + piece.length,
    });
  }
  return parts;
}

function segment(normalizedText) {
  const tokens = tokenize(normalizedText);
  const items = [];

  for (const line of tokens.lines) {
    const text = line.text.trim();
    if (!text) continue;
    const leading = line.text.length - line.text.trimStart().length;
    const start = line.start + leading;
    items.push({
      index: items.length,
      lineIndex: line.index,
      start,
      end: start + text.length,
      text,
      labels: findLabels(text, start),
      parts: splitParts(text, start),
      targetIndex: items.length + 1,
    });
  }

  // A label that sits alone on its line ("Lives at") carries to the next
  // non-empty line. Anything else must resolve inside its own line.
  for (let i = 0; i < items.length; i += 1) {
    const item = items[i];
    const onlyLabel =
      item.labels.length > 0 &&
      item.labels.some((l) => l.dangling) &&
      item.labels.some((l) => l.start === item.start);
    if (onlyLabel) item.targetIndex = Math.min(items.length - 1, i + 1);
  }

  return { ...tokens, items };
}

function tokensIn(tokens, start, end) {
  return tokens.filter((t) => /[A-Za-z0-9]/.test(t.text) && t.start >= start && t.end <= end);
}

function itemTokens(item, tokens) {
  return tokensIn(tokens, item.start, item.end);
}

function partTokens(part, tokens) {
  return tokensIn(tokens, part.start, part.end);
}

function labelsOfField(item, field) {
  return item.labels.filter((l) => l.field === field);
}

function labelFieldsOf(item) {
  return new Set(item.labels.map((l) => l.field));
}

module.exports = {
  segment,
  findLabels,
  splitParts,
  itemTokens,
  partTokens,
  tokensIn,
  labelsOfField,
  labelFieldsOf,
};

},
"data/labels.js": function(module, exports, __load) {
"use strict";

// Field-name vocabulary - language, not domain data.
//
// These are the words humans write *as labels* next to a value: "Name:",
// "zip:", "DOB--", "lives at", "Age: 51". This set is closed and language
// level, so enumerating it is safe. It is what lets the engine tell a label
// apart from a value without knowing anything about the domain.
//
// Shape: [field, [phrases]]. Matched case-insensitively on word boundaries;
// longer phrases win over shorter ones ("insurance company" beats "insurance").
const LABEL_GROUPS = [
  [
    "name",
    [
      "full name",
      "customer name",
      "client name",
      "insured name",
      "contact name",
      "policy holder",
      "policyholder",
      "name",
      "customer",
      "client",
      "insured",
      "contact",
    ],
  ],
  [
    "phone",
    [
      "phone number",
      "mobile number",
      "cell number",
      "contact number",
      "best number",
      "phone",
      "mobile",
      "cell",
      "telephone",
      "tele",
      "tel",
    ],
  ],
  [
    "address",
    [
      "street address",
      "home address",
      "mailing address",
      "property address",
      "address",
      "addres",
      "adress",
      "addr",
      "addy",
      "location",
      "lives at",
      "lives in",
      "live at",
      "living at",
      "resides at",
      "residence",
      "resides",
      "moved to",
    ],
  ],
  [
    "email",
    ["email address", "e-mail address", "email", "e mail", "mail address", "mail"],
  ],
  [
    "spouseName",
    [
      "spouse name",
      "spouses name",
      "spouse's name",
      "spouse full name",
      "wife name",
      "husband name",
      "significant other",
      "spouse",
      "wife",
      "husband",
    ],
  ],
  [
    "spouseDob",
    [
      "spouse date of birth",
      "spouse birth date",
      "spouse birthday",
      "spouse's dob",
      "spouse dob",
      "wife date of birth",
      "wife dob",
      "husband date of birth",
      "husband dob",
    ],
  ],
  [
    "zip",
    ["zip code", "postal code", "zipcode", "postcode", "zip", "postal", "postcode5"],
  ],
  [
    "dateOfBirth",
    ["date of birth", "birth date", "birthdate", "birthday", "d.o.b", "dob", "born"],
  ],
  ["age", ["age"]],
  [
    "homeOwner",
    [
      "home ownership",
      "home owner",
      "house owner",
      "property owner",
      "homeowner",
      "ownership",
      "owner",
      "renter",
      "tenant",
    ],
  ],
  ["homeType", ["home type", "house type", "property type"]],
  [
    "insuranceCompany",
    ["insurance company", "insurance carrier", "insurance provider", "carrier", "insurer", "insurance"],
  ],
  ["insuranceDuration", ["length of time", "how long", "duration"]],
  ["notes", ["additional info", "additional information", "notes", "note", "comments", "comment", "remarks"]],
];

function escapeRe(text) {
  return text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

const LABEL_PHRASES = [];
for (const [field, phrases] of LABEL_GROUPS) {
  for (const phrase of phrases) {
    LABEL_PHRASES.push({
      field,
      phrase,
      words: phrase.split(/\s+/).length,
      re: new RegExp(`\\b${escapeRe(phrase).replace(/\s+/g, "\\s+")}\\b`, "gi"),
    });
  }
}
LABEL_PHRASES.sort((a, b) => b.words - a.words || b.phrase.length - a.phrase.length);

const FIELDS_WITH_LABELS = new Set(LABEL_GROUPS.map(([field]) => field));

module.exports = {
  LABEL_GROUPS,
  LABEL_PHRASES,
  FIELDS_WITH_LABELS,
};

},
"lib/tokenize.js": function(module, exports, __load) {
"use strict";

function tokenize(normalizedText) {
  const text = normalizedText || "";
  const lines = [];
  let offset = 0;
  const rawLines = text.length ? text.split("\n") : [];
  for (let i = 0; i < rawLines.length; i += 1) {
    const line = rawLines[i];
    lines.push({
      index: i,
      text: line,
      start: offset,
      end: offset + line.length,
    });
    offset += line.length + 1;
  }

  const sentences = [];
  const sentenceRe = /[^.!?\n]+[.!?]?/g;
  let sm;
  while ((sm = sentenceRe.exec(text)) !== null) {
    const piece = sm[0].trim();
    if (!piece) continue;
    const rel = sm[0].indexOf(piece);
    sentences.push({
      text: piece,
      start: sm.index + rel,
      end: sm.index + rel + piece.length,
    });
  }

  const tokens = [];
  const tokenRe = /[A-Za-z0-9]+(?:['’][A-Za-z]+)?|[^\sA-Za-z0-9]/g;
  let tm;
  let tokenIndex = 0;
  while ((tm = tokenRe.exec(text)) !== null) {
    if (/^\s+$/.test(tm[0])) continue;
    tokens.push({
      index: tokenIndex,
      text: tm[0],
      lower: tm[0].toLowerCase(),
      start: tm.index,
      end: tm.index + tm[0].length,
    });
    tokenIndex += 1;
  }

  const wordTokens = tokens.filter((t) => /[A-Za-z0-9]/.test(t.text));

  const chunks = [];
  const chunkRe = /[^\n,;|]+/g;
  let cm;
  while ((cm = chunkRe.exec(text)) !== null) {
    const piece = cm[0].trim();
    if (!piece) continue;
    const rel = cm[0].indexOf(piece);
    chunks.push({
      text: piece,
      start: cm.index + rel,
      end: cm.index + rel + piece.length,
    });
  }

  return {
    text,
    lines,
    sentences,
    chunks,
    tokens,
    wordTokens,
  };
}

module.exports = {
  tokenize,
};

},
"lib/atoms.js": function(module, exports, __load) {
"use strict";

// "What is what": classify raw character runs by SHAPE before any field rule
// runs. A number is not a phone/zip/year/date until its shape says so.
const { isValidNanp } = __load("data/phones.js");
const { isPlausibleZip } = __load("data/zips.js");

const CURRENT_YEAR = new Date().getFullYear();
const VEHICLE_YEAR_MIN = 1940;
const VEHICLE_YEAR_MAX = CURRENT_YEAR + 2;
const BIRTH_YEAR_MIN = 1900;

const MONTHS = {
  january: 1,
  february: 2,
  march: 3,
  april: 4,
  may: 5,
  june: 6,
  july: 7,
  august: 8,
  september: 9,
  october: 10,
  november: 11,
  december: 12,
};

const MONTH_RE =
  "jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|jun(?:e)?|jul(?:y)?|aug(?:ust)?|sep(?:t|tember)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?";

const PHONE_RE = /(?:\+?1[ \t.-]?)?\(?(\d{3})\)?[ \t.-]?(\d{3})[ \t.-]?(\d{4})(?!\d)/g;
const ZIP_PLUS4_RE = /\b(\d{5})-(\d{4})\b/g;
const NUMBER_RE = /\d+/g;

function pad2(n) {
  return String(n).padStart(2, "0");
}

function monthNumber(word) {
  const key = String(word).toLowerCase().replace(/\./g, "");
  if (MONTHS[key]) return MONTHS[key];
  if (key.length >= 3) {
    for (const [name, value] of Object.entries(MONTHS)) {
      if (name.startsWith(key)) return value;
    }
  }
  return null;
}

function normalizeYear(year) {
  const value = Number(year);
  if (String(year).length === 2) return value >= 30 ? 1900 + value : 2000 + value;
  return value;
}

function isoDate(year, month, day) {
  if (!year) return null;
  if (!month) return String(year);
  if (!day) return `${year}-${pad2(month)}`;
  return `${year}-${pad2(month)}-${pad2(day)}`;
}

function clampDay(day, month, year) {
  if (!day || !month || month < 1 || month > 12) return null;
  const daysInMonth = new Date(year, month, 0).getDate();
  if (day < 1 || day > daysInMonth) return null;
  return day;
}

function findPhones(text) {
  const out = [];
  const re = new RegExp(PHONE_RE.source, "g");
  let m;
  while ((m = re.exec(text)) !== null) {
    const digits = `${m[1]}${m[2]}${m[3]}`;
    const start = m.index;
    const end = start + m[0].length;
    if (start > 0 && /\d/.test(text[start - 1])) continue;
    if (!isValidNanp(digits)) continue;
    out.push({
      kind: "phone",
      raw: m[0],
      digits,
      start,
      end,
      formatted: m[0].trim().length !== 10 || /[()+\s.-]/.test(m[0].trim()),
    });
  }
  return out;
}

function insideAny(span, list) {
  return list.some((s) => span.start >= s.start && span.end <= s.end);
}

function findDates(text) {
  const found = [];
  const claimed = [];
  const overlapsClaimed = (start, end) => claimed.some((c) => start < c.end && c.start < end);

  const add = (entry) => {
    if (entry.start == null || overlapsClaimed(entry.start, entry.end)) return;
    claimed.push({ start: entry.start, end: entry.end });
    found.push(entry);
  };

  const push = (raw, start, end, year, month, day, hasDay) => {
    const valid = month >= 1 && month <= 12 && (!hasDay || day != null);
    add({
      kind: "date",
      valid,
      raw,
      start,
      end,
      year,
      month,
      day,
      iso: isoDate(year, month, day),
      hasDay,
    });
  };

  let m;
  const mdy = new RegExp(`\\b(${MONTH_RE})\\.?\\s+(\\d{1,2})(?:st|nd|rd|th)?\\s*,?\\s*(\\d{4})\\b`, "gi");
  while ((m = mdy.exec(text)) !== null) {
    const month = monthNumber(m[1]);
    const year = Number(m[3]);
    push(m[0], m.index, m.index + m[0].length, year, month, clampDay(Number(m[2]), month, year), true);
  }

  const slashMonthDayYear = new RegExp(`\\b(${MONTH_RE})\\.?\\s*/\\s*(\\d{1,2})(?:st|nd|rd|th)?\\s*/\\s*(\\d{4})\\b`, "gi");
  while ((m = slashMonthDayYear.exec(text)) !== null) {
    const month = monthNumber(m[1]);
    const year = Number(m[3]);
    push(m[0], m.index, m.index + m[0].length, year, month, clampDay(Number(m[2]), month, year), true);
  }

  const dmy = new RegExp(`\\b(\\d{1,2})(?:st|nd|rd|th)?\\s+(?:of\\s+)?(${MONTH_RE})\\.?\\s*,?\\s*(\\d{4})\\b`, "gi");
  while ((m = dmy.exec(text)) !== null) {
    const month = monthNumber(m[2]);
    const year = Number(m[3]);
    push(m[0], m.index, m.index + m[0].length, year, month, clampDay(Number(m[1]), month, year), true);
  }

  const ymdWords = new RegExp(`\\b(\\d{4})\\s+(${MONTH_RE})\\.?\\s+(\\d{1,2})(?:st|nd|rd|th)?\\b`, "gi");
  while ((m = ymdWords.exec(text)) !== null) {
    const year = Number(m[1]);
    const month = monthNumber(m[2]);
    push(m[0], m.index, m.index + m[0].length, year, month, clampDay(Number(m[3]), month, year), true);
  }

  const iso = /\b(\d{4})-(\d{1,2})-(\d{1,2})\b/g;
  while ((m = iso.exec(text)) !== null) {
    const year = Number(m[1]);
    const month = Number(m[2]);
    const day = Number(m[3]);
    push(m[0], m.index, m.index + m[0].length, year, month, clampDay(day, month, year), true);
  }

  const numeric = /\b(\d{1,2})[/](\d{1,2})[/](\d{2,4})\b/g;
  while ((m = numeric.exec(text)) !== null) {
    const first = Number(m[1]);
    const second = Number(m[2]);
    const year = normalizeYear(m[3]);
    const month = first > 12 && second <= 12 ? second : first;
    const day = first > 12 && second <= 12 ? first : second;
    push(m[0], m.index, m.index + m[0].length, year, month, clampDay(day, month, year), true);
  }

  const spacedNumeric = /\b(\d{1,2})\s+(\d{1,2})\s+(\d{4})\b/g;
  while ((m = spacedNumeric.exec(text)) !== null) {
    const first = Number(m[1]);
    const second = Number(m[2]);
    const year = Number(m[3]);
    const month = first > 12 && second <= 12 ? second : first;
    const day = first > 12 && second <= 12 ? first : second;
    push(m[0], m.index, m.index + m[0].length, year, month, clampDay(day, month, year), true);
  }

  const hyphenNumeric = /\b(\d{1,2})-(\d{1,2})-(\d{4})\b/g;
  while ((m = hyphenNumeric.exec(text)) !== null) {
    const first = Number(m[1]);
    const second = Number(m[2]);
    const year = Number(m[3]);
    const month = first > 12 && second <= 12 ? second : first;
    const day = first > 12 && second <= 12 ? first : second;
    push(m[0], m.index, m.index + m[0].length, year, month, clampDay(day, month, year), true);
  }

  const monthYear = new RegExp(`\\b(${MONTH_RE})\\.?\\s*,?\\s*(\\d{4})\\b`, "gi");
  while ((m = monthYear.exec(text)) !== null) {
    const month = monthNumber(m[1]);
    const year = Number(m[2]);
    push(m[0], m.index, m.index + m[0].length, year, month, null, false);
  }

  return found.sort((a, b) => a.start - b.start);
}

function findZipPlus4(text) {
  const out = [];
  let m;
  const re = new RegExp(ZIP_PLUS4_RE.source, "g");
  while ((m = re.exec(text)) !== null) {
    out.push({
      kind: "zip",
      raw: m[0],
      zip5: m[1],
      plus4: m[2],
      start: m.index,
      end: m.index + m[0].length,
    });
  }
  return out;
}

function scanAtoms(text) {
  const phones = findPhones(text);
  const dates = findDates(text);
  const zipPlus4 = findZipPlus4(text);
  const numbers = [];
  let m;
  const re = new RegExp(NUMBER_RE.source, "g");
  while ((m = re.exec(text)) !== null) {
    const start = m.index;
    const end = start + m[0].length;
    const value = Number(m[0]);
    const inPhone = insideAny({ start, end }, phones);
    const inDate = insideAny({ start, end }, dates);
    const inZipPlus4 = zipPlus4.some((z) => start >= z.start && end <= z.end);
    const kinds = [];
    if (inPhone) kinds.push("phoneFragment");
    if (inDate) kinds.push("dateFragment");
    if (inZipPlus4) kinds.push("zipFragment");
    if (!inPhone && !inDate && m[0].length === 5 && isPlausibleZip(m[0])) kinds.push("zip5");
    if (!inPhone && !inDate && m[0].length === 4 && value >= VEHICLE_YEAR_MIN && value <= VEHICLE_YEAR_MAX) {
      kinds.push("year");
    }
    if (!inPhone && !inDate && m[0].length === 4 && value >= BIRTH_YEAR_MIN && value <= CURRENT_YEAR) {
      kinds.push("birthYear");
    }
    if (!inPhone && !inDate && !inZipPlus4 && m[0].length <= 6 && !kinds.includes("zip5")) {
      kinds.push(/[A-Za-z]/.test(text[end] || "") ? "houseLike" : "plainNumber");
    }
    numbers.push({ kind: "number", raw: m[0], value, digits: m[0].length, start, end, kinds });
  }
  return { phones, dates, zipPlus4, numbers };
}

function atomAt(atoms, start, end) {
  return atoms.numbers.find((n) => n.start === start && n.end === end) || null;
}

function numberIn(atoms, start, end) {
  return atoms.numbers.find((n) => n.start >= start && n.end <= end) || null;
}

function dateAt(atoms, start, end) {
  return atoms.dates.find((d) => d.start >= start && d.end <= end) || null;
}

module.exports = {
  CURRENT_YEAR,
  VEHICLE_YEAR_MIN,
  VEHICLE_YEAR_MAX,
  BIRTH_YEAR_MIN,
  MONTH_RE,
  monthNumber,
  normalizeYear,
  isoDate,
  scanAtoms,
  atomAt,
  numberIn,
  dateAt,
  isYearValue: (value) => value >= VEHICLE_YEAR_MIN && value <= VEHICLE_YEAR_MAX,
};

},
"data/phones.js": function(module, exports, __load) {
"use strict";

const AREA_CODES = new Set([
  201, 202, 203, 205, 206, 207, 208, 209, 210, 212, 213, 214, 215, 216, 217, 218, 219,
  220, 223, 224, 225, 227, 228, 229, 231, 234, 239, 240, 248, 251, 252, 253, 254, 256,
  260, 262, 267, 269, 270, 272, 274, 276, 279, 281, 283, 301, 302, 303, 304, 305, 307,
  308, 309, 310, 312, 313, 314, 315, 316, 317, 318, 319, 320, 321, 323, 325, 326, 327,
  330, 331, 332, 334, 336, 337, 339, 341, 346, 347, 351, 352, 360, 361, 364, 380, 385,
  386, 401, 402, 404, 405, 406, 407, 408, 409, 410, 412, 413, 414, 415, 417, 419, 423,
  424, 425, 430, 432, 434, 435, 440, 442, 443, 445, 447, 448, 458, 463, 464, 469, 470,
  472, 475, 478, 479, 480, 484, 501, 502, 503, 504, 505, 507, 508, 509, 510, 512, 513,
  515, 516, 517, 518, 520, 530, 531, 534, 539, 540, 541, 551, 557, 559, 561, 562, 563,
  564, 567, 570, 571, 572, 573, 574, 575, 580, 582, 585, 586, 601, 602, 603, 605, 606,
  607, 608, 609, 610, 612, 614, 615, 616, 617, 618, 619, 620, 623, 626, 628, 629, 630,
  631, 636, 640, 641, 646, 650, 651, 657, 659, 660, 661, 662, 667, 669, 678, 680, 681,
  682, 689, 701, 702, 703, 704, 706, 707, 708, 712, 713, 714, 715, 716, 717, 718, 719,
  720, 724, 725, 726, 727, 731, 732, 734, 737, 740, 743, 747, 754, 757, 760, 762, 763,
  765, 769, 770, 772, 773, 774, 775, 779, 781, 785, 786, 801, 802, 803, 804, 805, 806,
  808, 810, 812, 813, 814, 815, 816, 817, 818, 820, 828, 830, 831, 832, 835, 838, 839,
  840, 843, 845, 847, 848, 850, 854, 856, 857, 858, 859, 860, 862, 863, 864, 865, 870,
  872, 878, 901, 903, 904, 906, 907, 908, 909, 910, 912, 913, 914, 915, 916, 917, 918,
  919, 920, 925, 928, 929, 930, 931, 934, 936, 937, 938, 940, 941, 943, 945, 947, 948,
  949, 951, 952, 954, 956, 959, 970, 971, 972, 973, 975, 978, 979, 980, 984, 985, 986,
  989,
]);

function isValidNanp(digits) {
  if (!/^\d{10}$/.test(digits)) return false;
  const area = Number(digits.slice(0, 3));
  const exchange = Number(digits.slice(3, 6));
  if (digits[0] === "0" || digits[0] === "1") return false;
  if (digits[3] === "0" || digits[3] === "1") return false;
  if (digits.slice(1, 3) === "11") return false;
  if (!AREA_CODES.has(area)) return false;
  if (exchange < 200) return false;
  return true;
}

module.exports = {
  AREA_CODES,
  isValidNanp,
};

},
"data/zips.js": function(module, exports, __load) {
"use strict";

const KNOWN_ZIPS = {
  76308: { city: "Wichita Falls", state: "TX" },
  32246: { city: "Jacksonville", state: "FL" },
  45426: { city: "Dayton", state: "OH" },
};

const ZIP_PREFIX_STATE = {
  0: ["CT", "MA", "ME", "NH", "NJ", "RI", "VT"],
  1: ["DE", "NY", "PA"],
  2: ["DC", "MD", "NC", "SC", "VA", "WV"],
  3: ["AL", "FL", "GA", "MS", "TN"],
  4: ["IN", "KY", "MI", "OH"],
  5: ["IA", "MN", "MT", "ND", "SD", "WI"],
  6: ["IL", "KS", "MO", "NE"],
  7: ["AR", "LA", "OK", "TX"],
  8: ["AZ", "CO", "ID", "NM", "NV", "UT", "WY"],
  9: ["AK", "CA", "HI", "OR", "WA"],
};

function isPlausibleZip(zip5) {
  if (!/^\d{5}$/.test(zip5)) return false;
  const n = Number(zip5);
  return n >= 501 && n <= 99950;
}

function zipMeta(zip5) {
  if (!isPlausibleZip(zip5)) return null;
  const known = KNOWN_ZIPS[zip5] || KNOWN_ZIPS[Number(zip5)];
  const prefixStates = ZIP_PREFIX_STATE[Number(zip5[0])] || [];
  return {
    zip: zip5,
    city: known?.city || null,
    state: known?.state || null,
    prefixStates,
  };
}

function zipAgreesWithState(zip5, stateAbbr) {
  const meta = zipMeta(zip5);
  if (!meta || !stateAbbr) return null;
  if (meta.state) return meta.state === stateAbbr;
  return meta.prefixStates.includes(stateAbbr);
}

function zipAgreesWithCity(zip5, city) {
  const meta = zipMeta(zip5);
  if (!meta?.city || !city) return null;
  return meta.city.toLowerCase() === String(city).toLowerCase();
}

module.exports = {
  KNOWN_ZIPS,
  ZIP_PREFIX_STATE,
  isPlausibleZip,
  zipMeta,
  zipAgreesWithState,
  zipAgreesWithCity,
};

},
"lib/rules/index.js": function(module, exports, __load) {
"use strict";

// Rule registry.
//
// Adding a field = add one rule module + one line here. Arbitration, conflict
// handling, `unknown`, `debug` and the public schema all derive from FIELDS,
// so no plumbing changes are needed to grow the brain.
const { detectPhones, detectZips, detectEmails } = __load("lib/rules/contact.js");
const { detectAddresses } = __load("lib/rules/address.js");
const { detectNames, detectDateOfBirth, detectAge, detectSpouseNames, detectSpouseDobs } = __load("lib/rules/person.js");
const { detectVehicles, detectVehicleCount } = __load("lib/rules/vehicle.js");
const { detectInsuranceCompanies, detectInsuranceDurations } = __load("lib/rules/insurance.js");
const { detectHomeOwner, detectHomeType, detectFuzzyHomeType } = __load("lib/rules/home.js");

const RULES = [
  { id: "contact.phone", fields: ["phone"], run: detectPhones },
  { id: "contact.zip", fields: ["zip"], run: detectZips },
  { id: "contact.address", fields: ["address"], run: detectAddresses },
  { id: "person.name", fields: ["name"], run: detectNames },
  { id: "person.dateOfBirth", fields: ["dateOfBirth"], run: detectDateOfBirth },
  { id: "contact.email", fields: ["email"], run: detectEmails },
  { id: "person.spouseName", fields: ["spouseName"], run: detectSpouseNames },
  { id: "person.spouseDob", fields: ["spouseDob"], run: detectSpouseDobs },
  { id: "person.age", fields: ["age"], run: detectAge },
  { id: "vehicle.mentions", fields: ["vehicles"], run: detectVehicles },
  { id: "vehicle.count", fields: ["vehicleCount", "vehicleCategory"], run: detectVehicleCount },
  { id: "insurance.company", fields: ["insuranceCompany"], run: detectInsuranceCompanies },
  { id: "insurance.duration", fields: ["insuranceDuration"], run: detectInsuranceDurations },
  { id: "home.owner", fields: ["homeOwner"], run: detectHomeOwner },
  { id: "home.type", fields: ["homeType"], run: detectHomeType },
  { id: "home.typeFuzzy", fields: ["homeType"], run: detectFuzzyHomeType },
];

// Self-reliability: one broken rule degrades one field, it never takes the
// whole run down, and the failure is visible in debug.ruleErrors.
function runRules(ctx) {
  const candidates = [];
  const ruleErrors = [];
  for (const rule of RULES) {
    try {
      const produced = rule.run(ctx);
      // A rule may return one candidate, an array, or nothing.
      const list = produced == null ? [] : Array.isArray(produced) ? produced : [produced];
      for (const cand of list) candidates.push({ ...cand, rule: rule.id });
    } catch (error) {
      ruleErrors.push({ rule: rule.id, message: String(error && error.message ? error.message : error) });
    }
  }
  return { candidates, ruleErrors };
}

module.exports = { RULES, runRules };

},
"lib/rules/contact.js": function(module, exports, __load) {
"use strict";

// CONTACT rules: phone, ZIP, address.
//
// Every decision here is structural: a ZIP is a 5-digit shape that is NOT a
// house number, NOT inside a phone, and that sits in a place a ZIP can sit.
// Labels must be on the same line (see lib/structure.js).
const { candidate } = __load("lib/candidates.js");
const { atomAt } = __load("lib/atoms.js");
const {
  isPhoneDigits,
  zipMeta,
  lookupState,
  isStateToken,
  isStreetSuffix,
  normalizeStreetSuffix,
  isDirectional,
  normalizeDirectional,
  UNIT_WORDS,
} = __load("lib/lexicons.js");
const { labelsOfField, itemTokens } = __load("lib/structure.js");

function alreadyCovered(spans, start, end) {
  return spans.some((s) => start < s.end && s.start < end);
}

function detectPhones(ctx) {
  const { atoms, items, tokens } = ctx;
  const out = [];
  const seen = new Set();

  for (const phone of atoms.phones) {
    if (seen.has(phone.digits)) continue;
    const item = items.find((i) => phone.start >= i.start && phone.end <= i.end);
    const evidence = ["10-digit sequence", "valid NANP area code and exchange"];
    let confidence = 0.9;
    if (phone.formatted) {
      evidence.push("formatted number");
      confidence += 0.03;
    }
    if (item && labelsOfField(item, "phone").some((l) => l.end <= phone.start)) {
      evidence.push("explicit phone label");
      confidence += 0.05;
    }
    seen.add(phone.digits);
    out.push(
      candidate({
        field: "phone",
        value: phone.digits,
        confidence,
        sourceText: phone.raw.trim(),
        start: phone.start,
        end: phone.end,
        evidence,
        meta: { digits: phone.digits },
      })
    );
  }

  return out;
}

function detectZips(ctx) {
  const { atoms, items, tokens } = ctx;
  const out = [];
  const consumedSpans = [];

  const push = (zip) => {
    if (alreadyCovered(consumedSpans, zip.start, zip.end)) return;
    const item = items.find((i) => zip.start >= i.start && zip.end <= i.end);
    if (!item) return;
    const tokensInItem = itemTokens(item, tokens);
    const index = tokensInItem.findIndex((t) => t.start === zip.start);
    const next = index >= 0 ? tokensInItem[index + 1] : null;
    const prev = index > 0 ? tokensInItem[index - 1] : null;

    // Never split a phone or a longer digit run into a ZIP.
    if (atoms.phones.some((p) => zip.start >= p.start && zip.end <= p.end)) return;

    // A 5-digit run that OPENS a street line ("14951 Trinity Meadow Dr") is a
    // HOUSE NUMBER, not a ZIP - even if a "zip:" label sits on a previous
    // line. Labels are line-scoped, so they can never vouch for it.
    const hasZipLabel = labelsOfField(item, "zip").some(
      (l) =>
        (l.end <= zip.start || l.start >= zip.end) &&
        /^[\s,;:\-–—]*$/.test(
          l.end <= zip.start
            ? item.text.slice(l.end - item.start, zip.start - item.start)
            : item.text.slice(zip.end - item.start, l.start - item.start)
        )
    );
    if (!hasZipLabel && zip.digits === 5 && next && /^[A-Za-z]/.test(next.text)) {
      const opensLineOrPart =
        !prev ||
        item.parts.some((p) => p.start === zip.start) ||
        /[,;&|]\s*$/.test(item.text.slice(0, zip.start - item.start));
      // Inside a street line the first 5-digit run is the house number, as
      // soon as the rest of the line offers a real locality anchor.
      const restToks = tokensInItem.slice(index + 1);
      const laterAnchor = restToks.some((t) => {
        if (isStreetSuffix(t.text) || isStateToken(t.text) || lookupState(t.text)) return true;
        const restAtom = atomAt(atoms, t.start, t.end);
        return Boolean(restAtom && restAtom.kinds.includes("zip5"));
      });
      if (opensLineOrPart && laterAnchor) return;
    }

    const evidence = [zip.plus4 ? "ZIP+4 format" : "5-digit postal pattern"];
    let confidence = zip.plus4 ? 0.82 : 0.72;
    if (hasZipLabel) {
      evidence.push("explicit ZIP label on the same line");
      confidence += 0.22;
    }
    const meta = zipMeta(zip.zip5);
    if (meta?.city) {
      evidence.push("known ZIP locality");
      confidence += 0.08;
    }
    if (prev && (isStateToken(prev.text) || lookupState(prev.text))) {
      evidence.push("follows a state token");
      confidence += 0.12;
    }
    consumedSpans.push({ start: zip.start, end: zip.end });
    out.push(
      candidate({
        field: "zip",
        value: zip.raw,
        confidence,
        sourceText: zip.raw,
        start: zip.start,
        end: zip.end,
        evidence,
        meta: { zip5: zip.zip5, plus4: zip.plus4, state: meta?.state || null, city: meta?.city || null },
      })
    );
  };

  // ZIP+4 first so "76308-1234" is not read as the 5-digit "76308".
  for (const zip of atoms.zipPlus4) push(zip);
  for (const number of atoms.numbers) {
    if (!number.kinds.includes("zip5")) continue;
    push({ raw: number.raw, zip5: number.raw, plus4: null, start: number.start, end: number.end, digits: 5 });
  }

  return out;
}

const EMAIL_RE = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9-]+(?:\.[A-Za-z0-9-]+)*\.[A-Za-z]{2,}\b/g;

function detectEmails(ctx) {
  const out = [];
  const seen = new Set();
  const re = new RegExp(EMAIL_RE.source, "g");
  let m;
  while ((m = re.exec(ctx.text)) !== null) {
    const address = m[0];
    const key = address.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    const item = ctx.items.find((i) => m.index >= i.start && m.index + address.length <= i.end);
    const evidence = ["email shape"];
    let confidence = 0.9;
    if (item && labelsOfField(item, "email").length) {
      evidence.push("explicit email label");
      confidence += 0.05;
    }
    out.push(
      candidate({
        field: "email",
        value: address,
        confidence,
        sourceText: address,
        start: m.index,
        end: m.index + address.length,
        evidence,
        meta: {},
      })
    );
  }
  return out;
}

module.exports = {
  detectPhones,
  detectZips,
  detectEmails,
};

},
"lib/candidates.js": function(module, exports, __load) {
"use strict";

// Candidate primitives: the shared vocabulary every rule speaks. A rule never
// decides anything - it emits candidates with a value, a span, evidence, and
// metadata, and arbitration decides.
function candidate({
  field,
  value,
  confidence,
  sourceText,
  start,
  end,
  evidence = [],
  meta = {},
}) {
  return {
    field,
    value,
    confidence: clampConfidence(confidence),
    sourceText,
    start: start ?? -1,
    end: end ?? -1,
    evidence: [...evidence].sort(),
    meta,
  };
}

function clampConfidence(n) {
  if (!Number.isFinite(n)) return 0;
  return Math.max(0, Math.min(0.999, Math.round(n * 1000) / 1000));
}

function stringifyValue(value) {
  if (value == null) return "";
  if (typeof value === "string") return value;
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  return JSON.stringify(value);
}

function valuesEqual(a, b) {
  return stringifyValue(a) === stringifyValue(b);
}

module.exports = {
  candidate,
  clampConfidence,
  stringifyValue,
  valuesEqual,
};

},
"lib/lexicons.js": function(module, exports, __load) {
"use strict";

// Dictionaries are HINTS, never requirements.
//
// Every field in this engine is detectable from shape + structure + context
// alone; the lists in data/ only (a) raise confidence, (b) canonicalise
// spelling, and (c) resolve ambiguity. That is why an unknown make, an
// unknown carrier or an unknown surname still gets captured verbatim.
const { isValidNanp } = __load("data/phones.js");
const { isPlausibleZip, zipMeta, zipAgreesWithState, zipAgreesWithCity } = __load("data/zips.js");
const { lookupState, STATE_ABBREVIATIONS } = __load("data/states.js");
const {
  isStreetSuffix,
  normalizeStreetSuffix,
  isDirectional,
  normalizeDirectional,
  UNIT_WORDS,
} = __load("data/streets.js");
const { FIRST_NAMES, SURNAMES, NON_NAME_PHRASES } = __load("data/names.js");
const { isKnownCity, CITIES } = __load("data/cities.js");
const { INSURANCE_ALIAS_INDEX, MAX_INSURANCE_ALIAS_WORDS } = __load("data/insurance.js");
const { MAKE_INDEX, VEHICLE_MODELS, VEHICLE_CATEGORIES } = __load("data/vehicles.js");
const { parseNumberWord } = __load("data/numbers.js");
const { HOME_TYPE_PHRASES } = __load("data/home.js");
const { similarity } = __load("lib/similarity.js");

const INSURANCE_COMPACT = new Map();
for (const entry of INSURANCE_ALIAS_INDEX) {
  if (!INSURANCE_COMPACT.has(entry.compact)) INSURANCE_COMPACT.set(entry.compact, entry);
}

const INSURANCE_COMPACT_KEYS = [...INSURANCE_COMPACT.keys()];

const MAKE_COMPACT = new Map();
for (const entry of MAKE_INDEX) {
  if (!MAKE_COMPACT.has(entry.compact)) MAKE_COMPACT.set(entry.compact, entry);
}

const MODEL_COMPACT = new Map();
for (const models of Object.values(VEHICLE_MODELS)) {
  for (const model of models) {
    MODEL_COMPACT.set(compact(model), model);
  }
}

function compact(text) {
  return String(text == null ? "" : text)
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");
}

function isStateToken(token) {
  if (!token || token.length !== 2) return false;
  // Two letter words like "in", "or", "me" are only states when upper case.
  return STATE_ABBREVIATIONS.has(String(token).toUpperCase()) && String(token) === String(token).toUpperCase();
}

function knownCity(text) {
  return isKnownCity(text);
}

function bestCityMatch(tokens, lowerBound, upperBound) {
  // Longest known-city match inside tokens[lowerBound, upperBound).
  let best = null;
  for (let size = Math.min(3, upperBound - lowerBound); size >= 1; size -= 1) {
    for (let start = lowerBound; start + size <= upperBound; start += 1) {
      const phrase = tokens
        .slice(start, start + size)
        .map((t) => t.text)
        .join(" ");
      if (CITIES.has(phrase.toLowerCase())) {
        return { start, end: start + size, city: phrase };
      }
    }
  }
  return best;
}

function insuranceExact(text) {
  const key = compact(text);
  return INSURANCE_COMPACT.get(key) || null;
}

function insuranceFuzzy(text) {
  const key = compact(text);
  if (key.length < 5) return null;
  let best = null;
  for (const candidate of INSURANCE_COMPACT_KEYS) {
    if (Math.abs(candidate.length - key.length) > 3) continue;
    const score = similarity(key, candidate);
    if (score >= 0.85 && (!best || score > best.score)) {
      best = { entry: INSURANCE_COMPACT.get(candidate), score };
    }
  }
  return best;
}

function makeHint(text) {
  const key = compact(text);
  if (key.length < 2) return null;
  return MAKE_COMPACT.get(key) || null;
}

function modelHint(text) {
  return MODEL_COMPACT.get(compact(text)) || null;
}

function homeTypeMatch(text) {
  const lower = String(text).toLowerCase();
  const squashed = lower.replace(/[\s-]+/g, "");
  for (const entry of HOME_TYPE_PHRASES) {
    if (entry.alias === lower) return entry;
    if (entry.compact === squashed) return entry;
  }
  return null;
}

function categoryFor(word) {
  return VEHICLE_CATEGORIES[String(word).toLowerCase()] || null;
}

function countFor(word) {
  return parseNumberWord(word);
}

const NAME_STOP = new Set([
  "home",
  "owner",
  "homeowner",
  "house",
  "insurance",
  "insurer",
  "carrier",
  "address",
  "phone",
  "zip",
  "vehicle",
  "vehicles",
  "car",
  "cars",
  "truck",
  "trucks",
  "farmer",
  "farmers",
  "yes",
  "no",
  "age",
  "dob",
  "lives",
  "resides",
  "renter",
  "tenant",
]);

module.exports = {
  compact,
  isStateToken,
  lookupState,
  knownCity,
  bestCityMatch,
  isStreetSuffix,
  normalizeStreetSuffix,
  isDirectional,
  normalizeDirectional,
  UNIT_WORDS,
  firstName: (token) => FIRST_NAMES.has(String(token || "").toLowerCase()),
  surname: (token) => SURNAMES.has(String(token || "").toLowerCase()),
  nonNamePhrase: (phrase) => NON_NAME_PHRASES.has(String(phrase || "").toLowerCase().replace(/\s+/g, " ")),
  nameStop: (token) => NAME_STOP.has(String(token || "").toLowerCase()),
  insuranceExact,
  insuranceFuzzy,
  MAX_INSURANCE_ALIAS_WORDS,
  makeHint,
  modelHint,
  homeTypeMatch,
  categoryFor,
  countFor,
  isPhoneDigits: isValidNanp,
  isPlausibleZip,
  zipMeta,
  zipAgreesWithState,
  zipAgreesWithCity,
};

},
"data/states.js": function(module, exports, __load) {
"use strict";

const STATE_ENTRIES = [
  ["AL", "Alabama"],
  ["AK", "Alaska"],
  ["AZ", "Arizona"],
  ["AR", "Arkansas"],
  ["CA", "California"],
  ["CO", "Colorado"],
  ["CT", "Connecticut"],
  ["DE", "Delaware"],
  ["FL", "Florida"],
  ["GA", "Georgia"],
  ["HI", "Hawaii"],
  ["ID", "Idaho"],
  ["IL", "Illinois"],
  ["IN", "Indiana"],
  ["IA", "Iowa"],
  ["KS", "Kansas"],
  ["KY", "Kentucky"],
  ["LA", "Louisiana"],
  ["ME", "Maine"],
  ["MD", "Maryland"],
  ["MA", "Massachusetts"],
  ["MI", "Michigan"],
  ["MN", "Minnesota"],
  ["MS", "Mississippi"],
  ["MO", "Missouri"],
  ["MT", "Montana"],
  ["NE", "Nebraska"],
  ["NV", "Nevada"],
  ["NH", "New Hampshire"],
  ["NJ", "New Jersey"],
  ["NM", "New Mexico"],
  ["NY", "New York"],
  ["NC", "North Carolina"],
  ["ND", "North Dakota"],
  ["OH", "Ohio"],
  ["OK", "Oklahoma"],
  ["OR", "Oregon"],
  ["PA", "Pennsylvania"],
  ["RI", "Rhode Island"],
  ["SC", "South Carolina"],
  ["SD", "South Dakota"],
  ["TN", "Tennessee"],
  ["TX", "Texas"],
  ["UT", "Utah"],
  ["VT", "Vermont"],
  ["VA", "Virginia"],
  ["WA", "Washington"],
  ["WV", "West Virginia"],
  ["WI", "Wisconsin"],
  ["WY", "Wyoming"],
  ["DC", "District of Columbia"],
  ["AS", "American Samoa"],
  ["GU", "Guam"],
  ["MP", "Northern Mariana Islands"],
  ["PR", "Puerto Rico"],
  ["VI", "U.S. Virgin Islands"],
];

const ABBR_TO_NAME = Object.fromEntries(STATE_ENTRIES);
const NAME_TO_ABBR = Object.fromEntries(
  STATE_ENTRIES.map(([abbr, name]) => [name.toLowerCase(), abbr])
);

const STATE_ABBREVIATIONS = new Set(STATE_ENTRIES.map(([abbr]) => abbr));
const STATE_NAMES = new Set(STATE_ENTRIES.map(([, name]) => name.toLowerCase()));

const AMBIGUOUS_ABBREVIATIONS = new Set(["IN", "OR", "ME", "OK", "HI", "DE", "CO", "ID", "LA", "MA", "MT", "AL", "AR", "PA", "VA", "WA", "NC", "SC", "ND", "SD", "RI", "CT", "MS", "MO", "MN", "MI", "MD", "IA", "KS", "KY", "NE", "NV", "NH", "NJ", "NM", "NY", "OH", "UT", "VT", "WI", "WY", "AK", "AZ", "CA", "FL", "GA", "IL", "TN", "TX", "DC", "AS", "GU", "MP", "PR", "VI"]);

function lookupState(token) {
  if (!token) return null;
  const trimmed = String(token).trim();
  const upper = trimmed.toUpperCase();
  if (upper.length === 2 && STATE_ABBREVIATIONS.has(upper)) {
    return { abbr: upper, name: ABBR_TO_NAME[upper] };
  }
  const lower = trimmed.toLowerCase();
  if (NAME_TO_ABBR[lower]) {
    return { abbr: NAME_TO_ABBR[lower], name: ABBR_TO_NAME[NAME_TO_ABBR[lower]] };
  }
  return null;
}

module.exports = {
  STATE_ENTRIES,
  ABBR_TO_NAME,
  NAME_TO_ABBR,
  STATE_ABBREVIATIONS,
  STATE_NAMES,
  AMBIGUOUS_ABBREVIATIONS,
  lookupState,
};

},
"data/streets.js": function(module, exports, __load) {
"use strict";

const STREET_SUFFIXES = {
  street: "St",
  streets: "St",
  st: "St",
  str: "St",
  road: "Rd",
  roads: "Rd",
  rd: "Rd",
  avenue: "Ave",
  avenues: "Ave",
  ave: "Ave",
  av: "Ave",
  drive: "Dr",
  drives: "Dr",
  dr: "Dr",
  lane: "Ln",
  lanes: "Ln",
  ln: "Ln",
  place: "Pl",
  places: "Pl",
  pl: "Pl",
  court: "Ct",
  courts: "Ct",
  ct: "Ct",
  boulevard: "Blvd",
  boulevards: "Blvd",
  blvd: "Blvd",
  highway: "Hwy",
  highways: "Hwy",
  hwy: "Hwy",
  way: "Way",
  ways: "Way",
  circle: "Cir",
  circles: "Cir",
  cir: "Cir",
  trail: "Trl",
  trails: "Trl",
  trl: "Trl",
  parkway: "Pkwy",
  parkways: "Pkwy",
  pkwy: "Pkwy",
  terrace: "Ter",
  terraces: "Ter",
  ter: "Ter",
  terr: "Ter",
  alley: "Aly",
  aly: "Aly",
  cove: "Cv",
  cv: "Cv",
  crossing: "Xing",
  xing: "Xing",
  expressway: "Expy",
  expy: "Expy",
  freeway: "Fwy",
  fwy: "Fwy",
  loop: "Loop",
  pike: "Pike",
  square: "Sq",
  sq: "Sq",
  run: "Run",
  path: "Path",
  pass: "Pass",
  ridge: "Rdg",
  rdg: "Rdg",
  row: "Row",
  walk: "Walk",
};

const DIRECTIONALS = {
  n: "N",
  s: "S",
  e: "E",
  w: "W",
  ne: "NE",
  nw: "NW",
  se: "SE",
  sw: "SW",
  north: "N",
  south: "S",
  east: "E",
  west: "W",
  northeast: "NE",
  northwest: "NW",
  southeast: "SE",
  southwest: "SW",
};

const UNIT_WORDS = new Set([
  "apt",
  "apartment",
  "unit",
  "suite",
  "ste",
  "bldg",
  "building",
  "fl",
  "floor",
  "rm",
  "room",
  "#",
]);

function isStreetSuffix(token) {
  if (!token) return false;
  return Object.prototype.hasOwnProperty.call(
    STREET_SUFFIXES,
    String(token).toLowerCase().replace(/\./g, "")
  );
}

function normalizeStreetSuffix(token) {
  const key = String(token).toLowerCase().replace(/\./g, "");
  return STREET_SUFFIXES[key] || null;
}

function isDirectional(token) {
  if (!token) return false;
  return Object.prototype.hasOwnProperty.call(
    DIRECTIONALS,
    String(token).toLowerCase().replace(/\./g, "")
  );
}

function normalizeDirectional(token) {
  const key = String(token).toLowerCase().replace(/\./g, "");
  return DIRECTIONALS[key] || null;
}

module.exports = {
  STREET_SUFFIXES,
  DIRECTIONALS,
  UNIT_WORDS,
  isStreetSuffix,
  normalizeStreetSuffix,
  isDirectional,
  normalizeDirectional,
};

},
"data/names.js": function(module, exports, __load) {
"use strict";

const FIRST_NAMES = new Set(
  `
aaron abigail adam adrian alex alexander alexandra alice allison alyssa amanda amber
amy andrea andrew angela ann anna anthony antonio ashley austin bailey ben benjamin
beth betty beverly billy bobby brandon brenda brian brittany bruce bryan calvin
carla carl carol caroline carolyn catherine charles charlie cheryl chris christian
christina christine christopher cindy claire cody colin concetta connor craig crystal
curtis cynthia dakota dale daniel danielle danny david dawn deanna deborah debra
dennis derek derrick diana diane donald donna dorothy douglas dylan edward elaine eleanor
elizabeth ellen emily emma eric erika erin eugene eva evan faith felicia florence
frances frank fred gabriel gail gary gene george gerald gina glenn grace greg
gregory gwendolyn hannah harold harry heather heidi helen henry holly hunter ian
irene isaac isabel ivan jack jackie jacob jacqueline jade jake james jamie jane
janet janice jason jay jean jeff jeffrey jennifer jenny jeremy jerry jesse jessica
jill jim joan joanna jodi joe joel john johnny jon jonathan jordan jose joseph
joshua joyce juan judith judy julia julie justin karen kate katherine kathleen
kathryn kathy katie kayla keith kelly kenneth kerry kevin kim kimberly kristen
kristin kristina kyle lacey lance larry laura lauren lawrence lee leon leonard
leslie li liam lillian linda lindsay lisa logan lori louis louise lucas lucy luis
lynn madison malcolm mallory marcia margaret maria marianne marie marilyn mario
marisa mark martha martin mary mason mathew matthew maureen max meghan melissa
melvin michael michelle miguel mike mildred molly monica morgan nancy natalie nathan
nathaniel neil nicholas nicole noah norman olivia oscar pamela patricia patrick paul
paula peter philip phillip rachel ralph randy rebecca regina ricardo richard rick
rita robert robin roger ronald rose rosemary roy russell ruth ryan samantha samuel
sandra sara sarah scott sean sharon shaun shawn sheila shelly sherry shirley stacey
stacy stanley stella stephanie stephen steve steven susan susanne suzanne sydney
tammy taylor teresa terry theodore theresa thomas tiffany tim timothy todd tom
tommy tony tracy travis troy tyler valerie vanessa vernon victoria vincent virginia
walter wayne wendy wesley will william willow walter yasmin yolanda yvonne zachary
zoe
amileo
`.match(/[a-z]+/g)
);

const SURNAMES = new Set(
  `
adams allen alvarez anderson bailey baker barnes bell bennett brooks brown bryant
butler campbell carter chavez clark cole coleman collins cook cooper cox cruz
davis diaz dunn edwards ellis evans flores foster garcia gomez gonzalez gordon
graham gray green griffin hall harris henderson hernandez hill howard hudson
hughes hunter jackson james jenkins johnson jones kelly kennedy kim king lee
lewis long lopez mallonee martin martinez mason miller mitchell moore morales
morgan morris murphy myers nelson nguyen ortiz owens parker perez perry peters
phillips powell price ramirez ramos reed reyes richardson rivera roberts robinson
rodriguez rogers ross ruiz russell sanders scott shaw simpson smith stewart sullivan
taylor thomas thompson torres turner walker wallace ward watson watts weaver
white williams wilson wood woods wright young washington
`.match(/[a-z]+/g)
);

const NON_NAME_PHRASES = new Set([
  "state farm",
  "single family",
  "single family home",
  "home owner",
  "homeowner",
  "farmers insurance",
  "liberty mutual",
  "american family",
  "mercedes benz",
  "land rover",
  "white horse",
  "dairy farm",
  "zip code",
  "postal code",
]);

module.exports = {
  FIRST_NAMES,
  SURNAMES,
  NON_NAME_PHRASES,
};

},
"data/cities.js": function(module, exports, __load) {
"use strict";

const CITIES = new Set(
  [
    "wichita falls",
    "jacksonville",
    "dayton",
    "new york",
    "los angeles",
    "chicago",
    "houston",
    "phoenix",
    "philadelphia",
    "san antonio",
    "san diego",
    "dallas",
    "san jose",
    "austin",
    "jacksonville",
    "fort worth",
    "columbus",
    "charlotte",
    "indianapolis",
    "san francisco",
    "seattle",
    "denver",
    "oklahoma city",
    "nashville",
    "el paso",
    "washington",
    "boston",
    "las vegas",
    "portland",
    "detroit",
    "memphis",
    "louisville",
    "baltimore",
    "milwaukee",
    "albuquerque",
    "tucson",
    "fresno",
    "sacramento",
    "kansas city",
    "mesa",
    "atlanta",
    "omaha",
    "colorado springs",
    "raleigh",
    "miami",
    "virginia beach",
    "oakland",
    "minneapolis",
    "tulsa",
    "tampa",
    "arlington",
    "new orleans",
    "wichita",
    "cleveland",
    "bakersfield",
    "aurora",
    "anaheim",
    "honolulu",
    "santa ana",
    "riverside",
    "corpus christi",
    "lexington",
    "stockton",
    "st louis",
    "saint louis",
    "pittsburgh",
    "cincinnati",
    "anchorage",
    "toledo",
    "plano",
    "lincoln",
    "orlando",
    "irvine",
    "newark",
    "durham",
    "chula vista",
    "fort wayne",
    "jersey city",
    "st petersburg",
    "laredo",
    "madison",
    "chandler",
    "buffalo",
    "lubbock",
    "scottsdale",
    "reno",
    "glendale",
    "gilbert",
    "winston salem",
    "north las vegas",
    "norfolk",
    "chesapeake",
    "garland",
    "irving",
    "hialeah",
    "fremont",
    "boise",
    "richmond",
    "baton rouge",
    "spokane",
    "des moines",
    "tacoma",
    "san bernardino",
    "modesto",
    "fontana",
    "santa clarita",
    "birmingham",
    "oxnard",
    "fayetteville",
    "moreno valley",
    "rochester",
    "huntington beach",
    "salt lake city",
    "grand rapids",
    "amarillo",
    "yonkers",
    "aurora",
    "montgomery",
    "akron",
    "little rock",
    "huntsville",
    "augusta",
    "grand prairie",
    "tallahassee",
    "overland park",
    "tempe",
    "mckinney",
    "mobile",
    "cape coral",
    "shreveport",
    "frisco",
    "knoxville",
    "worcester",
    "brownsville",
    "vancouver",
    "fort lauderdale",
    "sioux falls",
    "ontario",
    "chattanooga",
    "providence",
    "newport news",
    "rancho cucamonga",
    "santa rosa",
    "oceanside",
    "elk grove",
    "garden grove",
    "pembroke pines",
    "peoria",
    "eugene",
    "corona",
    "cary",
    "springfield",
    "fort collins",
    "jackson",
    "alexandria",
    "hayward",
    "lancaster",
    "salinas",
    "palmdale",
    "hollywood",
    "lakewood",
    "sunnyvale",
    "pasadena",
    "macon",
    "kansas city",
    "pomona",
    "escondido",
    "killeen",
    "naperville",
    "joliet",
    "bellevue",
    "rockford",
    "savannah",
    "paterson",
    "torrance",
    "bridgeport",
    "mcallen",
    "mesquite",
    "syracuse",
    "midland",
    "pasadena",
    "murfreesboro",
    "miramar",
    "dayton",
    "fullerton",
    "olathe",
    "orange",
    "thornton",
    "roseville",
    "denton",
    "waco",
    "surprise",
    "carrollton",
    "west valley city",
    "charlottesville",
    "visalia",
    "coral springs",
    "stamford",
    "concord",
    "thousand oaks",
    "elizabeth",
    "cedar rapids",
    "columbia",
    "round rock",
    "allentown",
    "palm bay",
    "elgin",
    "topeka",
    "simi valley",
    "abilene",
    "lansing",
    "hartford",
    "vallejo",
    "victorville",
    "evansville",
    "ann arbor",
    "athens",
    "fargo",
    "berkeley",
    "norman",
    "independence",
    "columbia",
    "springfield",
    "pearland",
    "abilene",
    "beaumont",
    "odessa",
    "downey",
    "costa mesa",
    "carlsbad",
    "westminster",
    "north charleston",
    "rochester",
    "clearwater",
    "west jordan",
    "fairfield",
    "lowell",
    "richmond",
    "provo",
    "el monte",
    "west covina",
    "gresham",
    "antioch",
    "temecula",
    "high point",
    "murrieta",
    "everett",
    "ventura",
    "billings",
    "pueblo",
    "lakeland",
    "inglewood",
    "broken arrow",
    "sandy springs",
    "lewisville",
    "tyler",
    "pearland",
    "san mateo",
    "clovis",
    "fayetteville",
  ].map((c) => c.toLowerCase())
);

function isKnownCity(text) {
  return CITIES.has(String(text).trim().toLowerCase());
}

module.exports = {
  CITIES,
  isKnownCity,
};

},
"data/insurance.js": function(module, exports, __load) {
"use strict";

const INSURANCE_COMPANIES = [
  { canonical: "State Farm", aliases: ["state farm", "statefarm", "state farm insurance", "statefarm insurance"] },
  { canonical: "Farmers", aliases: ["farmers", "farmers insurance", "farmers ins"] },
  { canonical: "Allstate", aliases: ["allstate", "all state", "allstate insurance"] },
  { canonical: "Progressive", aliases: ["progressive", "progressive insurance"] },
  { canonical: "GEICO", aliases: ["geico", "g e i c o", "geico insurance"] },
  { canonical: "Liberty Mutual", aliases: ["liberty mutual", "libertymutual", "liberty mutual insurance"] },
  { canonical: "Ohio Mutual", aliases: ["ohio mutual", "ohio mutual insurance"] },
  { canonical: "Nationwide", aliases: ["nationwide", "nationwide insurance"] },
  { canonical: "USAA", aliases: ["usaa", "u s a a"] },
  { canonical: "American Family", aliases: ["american family", "amfam", "american family insurance"] },
  { canonical: "Travelers", aliases: ["travelers", "travellers", "travelers insurance"] },
  { canonical: "Erie", aliases: ["erie", "erie insurance"] },
  { canonical: "Safeco", aliases: ["safeco", "safeco insurance"] },
  { canonical: "Auto-Owners", aliases: ["auto-owners", "auto owners", "autoowners"] },
  { canonical: "Mercury", aliases: ["mercury", "mercury insurance"] },
  { canonical: "The Hartford", aliases: ["the hartford", "hartford", "hartford insurance"] },
  { canonical: "AAA", aliases: ["aaa", "triple a", "aaa insurance"] },
  { canonical: "Amica", aliases: ["amica", "amica insurance"] },
  { canonical: "Chubb", aliases: ["chubb"] },
  { canonical: "Kemper", aliases: ["kemper"] },
  { canonical: "MetLife", aliases: ["metlife", "met life"] },
  { canonical: "Shelter", aliases: ["shelter", "shelter insurance"] },
  { canonical: "21st Century", aliases: ["21stcentury"] },
  { canonical: "AAA Texas County Mutual", aliases: ["aaatexascountymutual"] },
  { canonical: "Affirmative", aliases: ["affirmative"] },
  { canonical: "Agricultural Workers Mutual", aliases: ["agriculturalworkersmutual"] },
  { canonical: "AIG", aliases: ["aig"] },
  { canonical: "America First", aliases: ["americafirst"] },
  { canonical: "American Century", aliases: ["americancentury"] },
  { canonical: "American Insurance", aliases: ["americaninsurance"] },
  { canonical: "American National", aliases: ["americannational"] },
  { canonical: "Armed Forces", aliases: ["armedforces"] },
  { canonical: "Audubon", aliases: ["audubon"] },
  { canonical: "Auto Club", aliases: ["autoclub"] },
  { canonical: "Central Mutual", aliases: ["centralmutual"] },
  { canonical: "Charter Oak Fire", aliases: ["charteroakfire"] },
  { canonical: "Colonial County Mutual", aliases: ["colonialcountymutual"] },
  { canonical: "Consumers Count Mutual", aliases: ["consumerscountmutual"] },
  { canonical: "Dairyland", aliases: ["dairyland"] },
  { canonical: "Direct General", aliases: ["directgeneral"] },
  { canonical: "Encompass", aliases: ["encompass"] },
  { canonical: "Esurance", aliases: ["esurance"] },
  { canonical: "Farm Bureau County Mutual", aliases: ["farmbureaucountymutual"] },
  { canonical: "First Acceptance", aliases: ["firstacceptance"] },
  { canonical: "Foremost", aliases: ["foremost"] },
  { canonical: "General", aliases: ["general"] },
  { canonical: "Germania Select", aliases: ["germaniaselect"] },
  { canonical: "Hochheim Prairie Casualty", aliases: ["hochheimprairiecasualty"] },
  { canonical: "Home State County Mutual", aliases: ["homestatecountymutual"] },
  { canonical: "Horace Mann", aliases: ["horacemann"] },
  { canonical: "IDS Property Casualty", aliases: ["idspropertycasualty"] },
  { canonical: "Imperial Fire and Casualty", aliases: ["imperialfireandcasualty"] },
  { canonical: "Infinity", aliases: ["infinity"] },
  { canonical: "Interinsurance Exchange of Auto Club", aliases: ["interinsuranceexchangeofautoclub"] },
  { canonical: "Loya", aliases: ["loya"] },
  { canonical: "Mercury General", aliases: ["mercurygeneral"] },
  { canonical: "MGA", aliases: ["mga"] },
  { canonical: "Mid-Century", aliases: ["midcentury"] },
  { canonical: "National General", aliases: ["nationalgeneral", "nationl general"] },
  { canonical: "Oak Brook County Mutual", aliases: ["oakbrookcountymutual"] },
  { canonical: "Old American County Mutual", aliases: ["oldamericancountymutual"] },
  { canonical: "Permanent General", aliases: ["permanentgeneral"] },
  { canonical: "Phoenix", aliases: ["phoenix"] },
  { canonical: "Republic Companies", aliases: ["republiccompanies"] },
  { canonical: "Response", aliases: ["response"] },
  { canonical: "Security National", aliases: ["securitynational"] },
  { canonical: "Sentry", aliases: ["sentry"] },
  { canonical: "Southern County Mutual", aliases: ["southerncountymutual"] },
  { canonical: "Southern Farm Bureau", aliases: ["southernfarmbureau"] },
  { canonical: "Teachers", aliases: ["teachers"] },
  { canonical: "Trinity Universal", aliases: ["trinityuniversal"] },
  { canonical: "Twin City Fire", aliases: ["twincityfire"] },
  { canonical: "TX Farm Bureau", aliases: ["txfarmbureau", "texas farm bureau"] },
  { canonical: "Unitrin", aliases: ["unitrin"] },
  { canonical: "Unitrin County Mutual", aliases: ["unitrincountymutual"] },
];

function compact(text) {
  return String(text).toLowerCase().replace(/[^a-z0-9]/g, "");
}

const INSURANCE_ALIAS_INDEX = [];
for (const company of INSURANCE_COMPANIES) {
  const aliases = new Set([company.canonical, ...company.aliases]);
  for (const alias of aliases) {
    INSURANCE_ALIAS_INDEX.push({
      canonical: company.canonical,
      alias: alias.toLowerCase(),
      compact: compact(alias),
    });
  }
}

INSURANCE_ALIAS_INDEX.sort((a, b) => b.alias.length - a.alias.length);
const MAX_INSURANCE_ALIAS_WORDS = Math.max(
  ...INSURANCE_ALIAS_INDEX.map((entry) => entry.alias.trim().split(/\s+/).length)
);

module.exports = {
  INSURANCE_COMPANIES,
  INSURANCE_ALIAS_INDEX,
  MAX_INSURANCE_ALIAS_WORDS,
  compactInsurance: compact,
};

},
"data/vehicles.js": function(module, exports, __load) {
"use strict";

const VEHICLE_MAKES = [
  { canonical: "Acura", aliases: ["acura"] },
  { canonical: "Alfa Romeo", aliases: ["alfa romeo", "alfaromeo"] },
  { canonical: "Audi", aliases: ["audi"] },
  { canonical: "BMW", aliases: ["bmw"] },
  { canonical: "Buick", aliases: ["buick"] },
  { canonical: "Cadillac", aliases: ["cadillac"] },
  { canonical: "Chevrolet", aliases: ["chevrolet", "chevy"] },
  { canonical: "Chrysler", aliases: ["chrysler"] },
  { canonical: "Dodge", aliases: ["dodge"] },
  { canonical: "Fiat", aliases: ["fiat"] },
  { canonical: "Ford", aliases: ["ford"] },
  { canonical: "Genesis", aliases: ["genesis"] },
  { canonical: "GMC", aliases: ["gmc"] },
  { canonical: "Honda", aliases: ["honda"] },
  { canonical: "Hyundai", aliases: ["hyundai"] },
  { canonical: "Infiniti", aliases: ["infiniti", "infinity"] },
  { canonical: "Jaguar", aliases: ["jaguar", "jag"] },
  { canonical: "Jeep", aliases: ["jeep"] },
  { canonical: "Kia", aliases: ["kia"] },
  { canonical: "Land Rover", aliases: ["land rover", "landrover"] },
  { canonical: "Lexus", aliases: ["lexus"] },
  { canonical: "Lincoln", aliases: ["lincoln"] },
  { canonical: "Mazda", aliases: ["mazda"] },
  { canonical: "Mercedes-Benz", aliases: ["mercedes-benz", "mercedes benz", "mercedes", "benz", "merc"] },
  { canonical: "Mini", aliases: ["mini", "mini cooper"] },
  { canonical: "Mitsubishi", aliases: ["mitsubishi"] },
  { canonical: "Nissan", aliases: ["nissan"] },
  { canonical: "Porsche", aliases: ["porsche"] },
  { canonical: "Ram", aliases: ["ram"] },
  { canonical: "Rivian", aliases: ["rivian"] },
  { canonical: "Subaru", aliases: ["subaru", "subru"] },
  { canonical: "Tesla", aliases: ["tesla"] },
  { canonical: "Toyota", aliases: ["toyota"] },
  { canonical: "Volkswagen", aliases: ["volkswagen", "vw", "volkswagon"] },
  { canonical: "Volvo", aliases: ["volvo"] },
];

const VEHICLE_MODELS = {
  Acura: ["ILX", "MDX", "RDX", "TLX", "Integra"],
  Audi: ["A3", "A4", "A5", "A6", "Q3", "Q5", "Q7", "Q8"],
  BMW: ["328", "330", "320", "335", "340", "328i", "330i", "X1", "X3", "X5", "X7", "M3", "M5", "3 Series", "5 Series"],
  Buick: ["Enclave", "Encore", "Envision"],
  Cadillac: ["CT4", "CT5", "Escalade", "XT4", "XT5", "XT6"],
  Chevrolet: ["Silverado", "Equinox", "Malibu", "Tahoe", "Traverse", "Camaro", "Colorado", "Suburban", "Cruze", "Impala"],
  Chrysler: ["300", "Pacifica", "Voyager"],
  Dodge: ["Charger", "Challenger", "Durango", "Journey", "Ram", "Grand Caravan"],
  Ford: ["F-150", "F150", "Escape", "Explorer", "Mustang", "Ranger", "Edge", "Bronco", "Fusion", "Focus", "Expedition"],
  GMC: ["Sierra", "Terrain", "Yukon", "Acadia", "Canyon"],
  Honda: ["Civic", "Accord", "CR-V", "CRV", "Pilot", "Odyssey", "HR-V", "HRV", "Fit", "Ridgeline"],
  Hyundai: ["Elantra", "Sonata", "Tucson", "Santa Fe", "Kona", "Palisade"],
  Jeep: ["Wrangler", "Grand Cherokee", "Cherokee", "Compass", "Gladiator", "Renegade"],
  Kia: ["Forte", "Optima", "Sorento", "Sportage", "Telluride", "Soul", "Rio"],
  Lexus: ["RX", "ES", "NX", "GX", "IS", "UX"],
  Lincoln: ["MKZ", "Navigator", "Aviator", "Corsair", "Nautilus"],
  Mazda: ["Mazda3", "Mazda6", "CX-5", "CX5", "CX-9", "CX9", "CX-30", "MX-5"],
  "Mercedes-Benz": ["C-Class", "E-Class", "S-Class", "GLC", "GLE", "GLA", "GLS", "CLA", "C300", "E350", "C250"],
  Nissan: ["Altima", "Sentra", "Rogue", "Pathfinder", "Murano", "Frontier", "Maxima", "Versa"],
  Subaru: ["Forester", "Outback", "Impreza", "Crosstrek", "Legacy", "Ascent", "WRX"],
  Tesla: ["Model 3", "Model Y", "Model S", "Model X", "Cybertruck"],
  Toyota: ["Camry", "Corolla", "RAV4", "Highlander", "Tacoma", "Tundra", "Prius", "4Runner", "Sienna", "Avalon"],
  Volkswagen: ["Jetta", "Passat", "Tiguan", "Atlas", "Golf", "Taos"],
  Volvo: ["XC40", "XC60", "XC90", "S60", "S90"],
};

const VEHICLE_CATEGORIES = {
  car: "car",
  cars: "car",
  auto: "car",
  autos: "car",
  automobile: "car",
  automobiles: "car",
  vehicle: "vehicle",
  vehicles: "vehicle",
  truck: "truck",
  trucks: "truck",
  suv: "suv",
  suvs: "suv",
  van: "van",
  vans: "van",
  motorcycle: "motorcycle",
  motorcycles: "motorcycle",
  bike: "motorcycle",
  bikes: "motorcycle",
};

function compactMake(text) {
  return String(text).toLowerCase().replace(/[^a-z0-9]/g, "");
}

const MAKE_INDEX = [];
for (const make of VEHICLE_MAKES) {
  for (const alias of new Set([make.canonical, ...make.aliases])) {
    MAKE_INDEX.push({
      canonical: make.canonical,
      alias: alias.toLowerCase(),
      compact: compactMake(alias),
      tokenCount: alias.trim().split(/\s+/).length,
    });
  }
}
MAKE_INDEX.sort((a, b) => b.alias.length - a.alias.length);

const MODEL_LOOKUP = new Map();
for (const [make, models] of Object.entries(VEHICLE_MODELS)) {
  for (const model of models) {
    MODEL_LOOKUP.set(`${make}::${model.toLowerCase()}`, model);
    MODEL_LOOKUP.set(model.toLowerCase(), { make, model });
  }
}

module.exports = {
  VEHICLE_MAKES,
  VEHICLE_MODELS,
  VEHICLE_CATEGORIES,
  MAKE_INDEX,
  MODEL_LOOKUP,
  compactMake,
};

},
"data/numbers.js": function(module, exports, __load) {
"use strict";

const NUMBER_WORDS = {
  zero: 0,
  one: 1,
  two: 2,
  three: 3,
  four: 4,
  five: 5,
  six: 6,
  seven: 7,
  eight: 8,
  nine: 9,
  ten: 10,
  eleven: 11,
  twelve: 12,
  thirteen: 13,
  fourteen: 14,
  fifteen: 15,
  sixteen: 16,
  seventeen: 17,
  eighteen: 18,
  nineteen: 19,
  twenty: 20,
  thirty: 30,
};

function parseNumberWord(token) {
  if (token == null) return null;
  const raw = String(token).trim().toLowerCase();
  if (Object.prototype.hasOwnProperty.call(NUMBER_WORDS, raw)) {
    return NUMBER_WORDS[raw];
  }
  if (/^\d{1,3}$/.test(raw)) {
    return Number(raw);
  }
  return null;
}

module.exports = {
  NUMBER_WORDS,
  parseNumberWord,
};

},
"data/home.js": function(module, exports, __load) {
"use strict";

const HOME_TYPES = [
  {
    canonical: "single_family",
    aliases: [
      "single family home",
      "single family house",
      "single-family home",
      "single-family house",
      "single family",
      "single-family",
      "sfh",
      "single famly home",
      "single famly house",
      "sgl family",
    ],
  },
  {
    canonical: "house",
    aliases: ["house", "a house"],
  },
  {
    canonical: "condo",
    aliases: ["condo", "condominium", "a condo"],
  },
  {
    canonical: "townhouse",
    aliases: ["townhouse", "townhome", "town house", "town home"],
  },
  {
    canonical: "apartment",
    aliases: ["apartment", "apt", "an apartment"],
  },
  {
    canonical: "mobile_home",
    aliases: ["mobile home", "manufactured home", "trailer home"],
  },
  {
    canonical: "duplex",
    aliases: ["duplex"],
  },
  {
    canonical: "triplex",
    aliases: ["triplex"],
  },
  {
    canonical: "fourplex",
    aliases: ["fourplex", "quadplex", "4-plex", "4plex"],
  },
];

const HOME_TYPE_PHRASES = HOME_TYPES.flatMap((entry) =>
  entry.aliases.map((alias) => ({
    canonical: entry.canonical,
    alias,
    compact: alias.replace(/[\s-]+/g, ""),
  }))
).sort((a, b) => b.alias.length - a.alias.length);

module.exports = {
  HOME_TYPES,
  HOME_TYPE_PHRASES,
};

},
"lib/similarity.js": function(module, exports, __load) {
"use strict";

function levenshtein(a, b, maxDistance = Infinity) {
  const s = String(a);
  const t = String(b);
  if (s === t) return 0;
  if (!s.length) return t.length;
  if (!t.length) return s.length;
  if (Math.abs(s.length - t.length) > maxDistance) return maxDistance + 1;

  const prev = new Array(t.length + 1);
  const curr = new Array(t.length + 1);
  for (let j = 0; j <= t.length; j += 1) prev[j] = j;

  for (let i = 1; i <= s.length; i += 1) {
    curr[0] = i;
    let rowMin = curr[0];
    for (let j = 1; j <= t.length; j += 1) {
      const cost = s[i - 1] === t[j - 1] ? 0 : 1;
      curr[j] = Math.min(prev[j] + 1, curr[j - 1] + 1, prev[j - 1] + cost);
      if (curr[j] < rowMin) rowMin = curr[j];
    }
    if (rowMin > maxDistance) return maxDistance + 1;
    for (let j = 0; j <= t.length; j += 1) prev[j] = curr[j];
  }
  return prev[t.length];
}

function similarity(a, b) {
  const s = String(a);
  const t = String(b);
  if (!s && !t) return 1;
  const dist = levenshtein(s, t);
  return 1 - dist / Math.max(s.length, t.length, 1);
}

function tokenSimilarity(a, b) {
  return similarity(String(a).toLowerCase(), String(b).toLowerCase());
}

module.exports = {
  levenshtein,
  similarity,
  tokenSimilarity,
};

},
"lib/rules/address.js": function(module, exports, __load) {
"use strict";

// ADDRESS rule: house number + street, plus whatever locality the line offers.
//
// No city/street dictionary is required. City names are recognised when known
// (better casing + confidence) and otherwise inferred from position: a short
// alphabetic run or comma part sitting between the street and the state/ZIP.
const { candidate } = __load("lib/candidates.js");
const { atomAt } = __load("lib/atoms.js");
const {
  isStateToken,
  lookupState,
  bestCityMatch,
  knownCity,
  isStreetSuffix,
  normalizeStreetSuffix,
  isDirectional,
  normalizeDirectional,
  UNIT_WORDS,
} = __load("lib/lexicons.js");
const { labelsOfField, labelFieldsOf, itemTokens } = __load("lib/structure.js");

const ALPHA_TOKEN = /^[A-Za-z][A-Za-z.'-]*$/;
const STREET_TOKEN = /^(?:[A-Za-z][A-Za-z.'-]*|\d{1,3}(?:st|nd|rd|th))$/i;

function titleToken(token) {
  if (!token) return token;
  if (/^\d/.test(token)) return token;
  if (/^[A-Z]{2,}$/.test(token)) return token.charAt(0) + token.slice(1).toLowerCase();
  return token.charAt(0).toUpperCase() + token.slice(1).toLowerCase();
}

function titlePhrase(phrase) {
  return String(phrase)
    .split(/\s+/)
    .map(titleToken)
    .join(" ");
}

function borrowedLabel(items, index, field) {
  return items.some((i) => i.targetIndex === index && i.index < index && labelsOfField(i, field).length > 0);
}

function findHouseIndex(item, toks, atoms) {
  const addressLabels = labelsOfField(item, "address");
  for (let i = 0; i < toks.length; i += 1) {
    const token = toks[i];
    if (!/^\d{1,6}[A-Za-z]?$/.test(token.text)) continue;
    const atom = atomAt(atoms, token.start, token.end);
    if (!atom) continue;
    if (atom.kinds.includes("phoneFragment")) continue;
    if (atom.kinds.includes("dateFragment")) continue;
    if (atom.kinds.includes("year")) continue;
    const opensStreet = i + 1 < toks.length && STREET_TOKEN.test(toks[i + 1].text);
    if (atom.kinds.includes("zip5") && !opensStreet) continue;
    if (i === 0) return i;
    if (item.parts.some((p) => p.start === token.start)) return i;
    if (addressLabels.some((l) => l.end <= token.start)) return i;
  }
  return -1;
}

function collectStreet(toks, startIndex) {
  const street = [];
  let cursor = startIndex;
  while (cursor < toks.length && street.length < 3) {
    const token = toks[cursor];
    if (!STREET_TOKEN.test(token.text)) break;
    if (isStreetSuffix(token.text)) {
      if (cursor + 1 < toks.length && isStreetSuffix(toks[cursor + 1].text)) {
        street.push(token);
        cursor += 1;
        continue;
      }
      break;
    }
    if (isDirectional(token.text) && street.length > 0) break;
    if (UNIT_WORDS.has(token.text.toLowerCase())) break;
    if (isStateToken(token.text) || lookupState(token.text)) break;
    const cityAhead = bestCityMatch(toks, cursor, Math.min(toks.length, cursor + 3));
    if (cityAhead && cityAhead.start === cursor && street.length >= 1) break;
    street.push(token);
    cursor += 1;
  }
  return { street, cursor };
}

function partOf(item, token) {
  return item.parts.find((p) => token.start >= p.start && token.end <= p.end) || null;
}

function scanLocality(item, toks, atoms, street, cursor) {
  let city = null;
  let cityTokens = null;
  const states = [];
  let zipToken = null;
  let rawZip = null;

  for (let k = cursor; k < toks.length; k += 1) {
    const token = toks[k];
    const atom = atomAt(atoms, token.start, token.end);
    if (atom && (atom.kinds.includes("phoneFragment") || atom.kinds.includes("dateFragment"))) continue;
    if (atom && atom.kinds.includes("zip5")) {
      if (!zipToken) {
        const plus4 = atoms.zipPlus4.find((z) => z.start <= token.start && z.end >= token.end);
        zipToken = token;
        rawZip = plus4 ? plus4.raw : token.text;
      }
      continue;
    }
    if (isStateToken(token.text) || lookupState(token.text)) {
      const info = lookupState(token.text);
      states.push({ token, abbr: info.abbr, name: info.name });
      continue;
    }
    if (!ALPHA_TOKEN.test(token.text) || city) continue;
    const known = bestCityMatch(toks, k, Math.min(toks.length, k + 3));
    if (known && known.start === k) {
      cityTokens = toks.slice(known.start, known.end);
      city = cityTokens.map((t) => t.text).join(" ");
      k = known.end - 1;
      continue;
    }
    const part = partOf(item, token);
    const partToks = part ? toks.filter((t) => t.start >= part.start && t.end <= part.end) : [];
    const partIsAlphaOnly = partToks.length > 0 && partToks.every((t) => ALPHA_TOKEN.test(t.text));
    const partAfterStreet = part && part.start > street[street.length - 1].end;
    const partIsStreet = partToks.length > 0 && partToks[0].start === street[0].start;
    if (part && partIsAlphaOnly && partAfterStreet && !partIsStreet && partToks.length <= 3) {
      cityTokens = partToks;
      city = part.text;
      k = toks.indexOf(partToks[partToks.length - 1]);
    }
  }

  // A state name that is part of a longer name ("Missouri City") is not the
  // state; among the real candidates, the one closest to the ZIP wins.
  const standalone = states.filter((s) => {
    const idx = toks.findIndex((t) => t.start === s.token.start);
    const next = idx >= 0 ? toks[idx + 1] : null;
    return !(next && ALPHA_TOKEN.test(next.text));
  });
  const pool = standalone.length ? standalone : states;
  const state = pool
    .slice()
    .sort((a, b) => {
      if (!zipToken) return a.token.start - b.token.start;
      return Math.abs(a.token.start - zipToken.start) - Math.abs(b.token.start - zipToken.start);
    })[0] || null;

  return { city, cityTokens, state, zipToken, rawZip };
}

function detectAddresses(ctx) {
  const { atoms, items, tokens } = ctx;
  const out = [];

  for (const item of items) {
    const fields = labelFieldsOf(item);
    if (fields.has("dateOfBirth") && !fields.has("address")) continue;

    const toks = itemTokens(item, tokens);
    const houseIndex = findHouseIndex(item, toks, atoms);
    if (houseIndex === -1) continue;
    const house = toks[houseIndex];

    const { street, cursor: afterStreet } = collectStreet(toks, houseIndex + 1);
    if (!street.length) continue;

    let cursor = afterStreet;
    let suffix = null;
    let directional = null;
    let unit = null;
    let unitValue = null;

    if (cursor < toks.length && isStreetSuffix(toks[cursor].text)) {
      suffix = toks[cursor];
      cursor += 1;
    }
    if (cursor < toks.length && isDirectional(toks[cursor].text) && toks[cursor].text.length <= 2) {
      directional = toks[cursor];
      cursor += 1;
    }
    if (cursor < toks.length) {
      const token = toks[cursor];
      if (UNIT_WORDS.has(token.text.toLowerCase())) {
        unit = token;
        cursor += 1;
      } else if (/^\d+[A-Za-z]?$/.test(token.text)) {
        const previous = toks[cursor - 1];
        const gapStart = previous ? previous.end - item.start : 0;
        const gapEnd = token.start - item.start;
        const hashOffset = item.text.lastIndexOf("#", gapEnd);
        if (
          hashOffset >= gapStart &&
          /^#\s*$/.test(item.text.slice(hashOffset, gapEnd))
        ) {
          unit = { text: "#", start: item.start + hashOffset, end: item.start + hashOffset + 1 };
        }
      }
      if (unit && cursor < toks.length) {
        if (/^[0-9]+[A-Za-z]?$/.test(toks[cursor].text)) {
          unitValue = toks[cursor];
          cursor += 1;
        }
      }
    }

    const locality = scanLocality(item, toks, atoms, street, cursor);
    let city = locality.city;
    let cityTokens = locality.cityTokens;
    const state = locality.state;
    const zipToken = locality.zipToken;
    const rawZip = locality.rawZip;

    if (!city && street.length >= 2) {
      // Structural fallback: a trailing run of street tokens directly in front
      // of the ZIP/state is the city, as long as one street token remains.
      const boundary = zipToken || (state ? state.token : null);
      if (boundary) {
        const gap = item.text.slice(street[street.length - 1].end - item.start, boundary.start - item.start);
        if (/^[\s,]*$/.test(gap)) {
          const take = street.length >= 3 ? 2 : 1;
          cityTokens = street.slice(street.length - take);
          city = cityTokens.map((t) => t.text).join(" ");
          street.splice(street.length - take, take);
        }
      }
    }

    // An address needs a street AND at least one locality/anchor signal.
    if (!suffix && !unit && !zipToken && !state && !city) continue;
    if (!street.length) continue;

    const streetName = street.map((t) => t.text).join(" ");
    const suffixText = suffix ? normalizeStreetSuffix(suffix.text) : null;
    const directionalText = directional ? normalizeDirectional(directional.text) : null;
    const unitText = unit ? titleToken(unit.text) : null;

    const streetPart = [house.text, streetName, suffixText, directionalText, unitText, unitValue ? unitValue.text : null]
      .filter(Boolean)
      .join(" ");
    const localityPart = [city ? titlePhrase(city) : null, [state ? state.abbr : null, rawZip].filter(Boolean).join(" ")]
      .filter(Boolean)
      .join(", ");
    const value = localityPart ? `${streetPart}, ${localityPart}` : streetPart;

    const evidence = ["house number + street name"];
    let confidence = 0.8;
    if (suffixText) {
      evidence.push("recognised street suffix");
      confidence += 0.06;
    }
    if (knownCity(city)) {
      evidence.push("known city");
      confidence += 0.06;
    } else if (city) {
      evidence.push("city inferred from position");
      confidence += 0.02;
    }
    if (state) {
      evidence.push("state component");
      confidence += 0.06;
    }
    if (rawZip) {
      evidence.push("ZIP in address");
      confidence += 0.08;
    }
    if (unit) {
      evidence.push("unit designator");
      confidence += 0.02;
    }
    if (labelsOfField(item, "address").length > 0 || borrowedLabel(items, item.index, "address")) {
      evidence.push("address label");
      confidence += 0.05;
    }

    let spanEnd = house.end;
    for (const t of [house, ...street, suffix, directional, unit, unitValue]) {
      if (t && t.end > spanEnd) spanEnd = t.end;
    }

    const extraSpans = [cityTokens, state ? [state.token] : null, zipToken ? [zipToken] : null, unit ? [unit] : null]
      .filter(Boolean)
      .reduce((acc, list) => acc.concat(list), [])
      .map((t) => ({ start: t.start, end: t.end }));

    const address = candidate({
      field: "address",
      value,
      confidence,
      sourceText: item.text,
      start: house.start,
      end: spanEnd,
      evidence,
      meta: {
        house: house.text,
        street: streetName,
        suffix: suffixText,
        directional: directionalText,
        unit: unit ? [unitText, unitValue ? unitValue.text : null].filter(Boolean).join(" ") : null,
        city: city ? titlePhrase(city) : null,
        state: state ? state.abbr : null,
        zip: rawZip ? rawZip.slice(0, 5) : null,
        zipFull: rawZip,
        raw: item.text,
      },
    });
    address.extraSpans = extraSpans;
    out.push(address);
  }

  return out;
}

module.exports = { detectAddresses, titleToken, titlePhrase, borrowedLabel, findHouseIndex, collectStreet };

},
"lib/rules/person.js": function(module, exports, __load) {
"use strict";

// PERSON rules: name, dateOfBirth, age.
//
// Names are decided by STRUCTURE (label, capitalisation, token count,
// middle initial, neighbour fields); the dictionaries only tip the scale.
// That is why an unheard-of name such as "Della G Calderwood" still lands.
const { candidate } = __load("lib/candidates.js");
const { CURRENT_YEAR, BIRTH_YEAR_MIN } = __load("lib/atoms.js");
const {
  firstName,
  surname,
  nonNamePhrase,
  nameStop,
  insuranceExact,
  homeTypeMatch,
  makeHint,
  knownCity,
  isStateToken,
  lookupState,
  categoryFor,
} = __load("lib/lexicons.js");
const { labelsOfField, tokensIn } = __load("lib/structure.js");
const { detectAddresses } = __load("lib/rules/address.js");
const { detectVehicles } = __load("lib/rules/vehicle.js");
const { detectEmails } = __load("lib/rules/contact.js");

const NAME_HINTS = new WeakMap();
const SPOUSE_CACHE = new WeakMap();

// Text a sibling rule has already claimed as an address, a vehicle, an email or
// a spouse detail is not the customer's name. This is a declared one-way
// dependency (those rules never look at names).
function hintSpans(ctx) {
  if (!NAME_HINTS.has(ctx)) {
    const spans = [];
    for (const cand of detectAddresses(ctx)) {
      spans.push({ start: cand.start, end: cand.end });
      for (const extra of cand.extraSpans || []) spans.push(extra);
    }
    for (const cand of detectVehicles(ctx)) spans.push({ start: cand.start, end: cand.end });
    for (const cand of detectEmails(ctx)) spans.push({ start: cand.start, end: cand.end });
    const spouse = spouseAnalysis(ctx);
    for (const cand of [...spouse.names, ...spouse.dobs]) spans.push({ start: cand.start, end: cand.end });
    NAME_HINTS.set(ctx, spans);
  }
  return NAME_HINTS.get(ctx);
}

function insideHints(segment, ctx) {
  return hintSpans(ctx).some((s) => segment.start >= s.start && segment.end <= s.end);
}

const DURATION_WORDS =
  /\b(years?|yrs?|months?|mos?|days?|weeks?|about|around|approx(?:imately)?|more\s+th[ae]n|over|several|long|time|since)\b/i;
const PARTICLES = new Set(["de", "van", "von", "da", "del", "der", "bin", "la", "le", "jr", "sr", "ii", "iii"]);
const CAPS_WORD = /^[A-Z][a-z']*$/;
const CAPS_TOKEN = /^[A-Z][A-Z']*$/;
const INITIAL = /^[A-Z]\.?$/;

function splitSegments(item, ctx) {
  const boundaries = new Set([item.start, item.end]);
  for (const label of item.labels) {
    boundaries.add(label.start);
    boundaries.add(Math.min(label.valueStart, item.end));
  }
  const cuts = [...boundaries].sort((a, b) => a - b);
  const segments = [];
  for (let i = 0; i < cuts.length - 1; i += 1) {
    const start = cuts[i];
    const end = cuts[i + 1];
    const raw = ctx.text.slice(start, end);
    const trimmed = raw.trim();
    if (!trimmed) continue;
    const offset = raw.indexOf(trimmed);
    segments.push({ text: trimmed, start: start + offset, end: start + offset + trimmed.length });
  }
  for (const part of item.parts) {
    segments.push({ text: part.text, start: part.start, end: part.end });
  }

  // Alpha runs: within one line, a maximal sequence of adjacent alphabetic
  // tokens is a candidate ("Ben Mallonee 9406362071 76308 Farmers 2 cars").
  const lineTokens = tokensIn(ctx.tokens, item.start, item.end).filter((t) => /^[A-Za-z]/.test(t.text));
  let run = [];
  const flush = () => {
    if (run.length >= 2) {
      const start = run[0].start;
      const end = run[run.length - 1].end;
      segments.push({ text: ctx.text.slice(start, end), start, end });
    }
    run = [];
  };
  for (const token of lineTokens) {
    const prev = run[run.length - 1];
    if (prev && token.start - prev.end > 2) flush();
    run.push(token);
  }
  flush();

  const seen = new Set();
  return segments.filter((s) => {
    const key = `${s.start}:${s.end}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function nameTokens(segment, ctx) {
  return tokensIn(ctx.tokens, segment.start, segment.end);
}

function rejectedNameSegment(segment, toks, ctx, labeled, item) {
  if (!toks.length) return "no alphabetic tokens";
  if (toks.length > 5) return "too many tokens for a name";
  if (/\d/.test(segment.text)) return "contains digits";
  if (DURATION_WORDS.test(segment.text)) return "duration phrasing";
  if (SPOUSE_WORD.test(segment.text)) return "spouse phrasing";
  if (nonNamePhrase(segment.text)) return "reserved phrase";
  if (knownCity(segment.text)) return "known city";
  if (homeTypeMatch(segment.text)) return "home type vocabulary";
  if (insuranceExact(segment.text) || toks.some((t) => insuranceExact(t.text))) return "insurance vocabulary";
  if (toks.some((t) => nameStop(t.text))) return "field vocabulary";
  if (toks.some((t) => makeHint(t.text) || categoryFor(t.text))) return "vehicle vocabulary";
  if (toks.length === 1 && (isStateToken(toks[0].text) || lookupState(toks[0].text))) return "state name";
  // A candidate that swallows a label ("Name Patricia Newton Bell") is not a name.
  if (item && item.labels.some((l) => segment.start < l.end && l.start < segment.end)) return "overlaps a field label";
  // Text inside another field's labelled value belongs to that field.
  const owner = item
    ? item.labels.find(
        (l) => l.field !== "name" && l.valueText.length > 0 && segment.start >= l.valueStart && segment.end <= item.end
      )
    : null;
  if (owner) return `inside a labelled ${owner.field} value`;
  // Text already explained as an address or a vehicle is not a person.
  if (insideHints(segment, ctx)) return "inside an address or vehicle span";
  if (!labeled) {
    const words = toks.filter((t) => !PARTICLES.has(t.text.toLowerCase()) && !INITIAL.test(t.text));
    const contextualMixedCase = firstName(toks[0].text) && toks.length >= 2 &&
      toks.every((t) => /^[A-Za-z][A-Za-z'.-]*$/.test(t.text)) &&
      ctx.atoms.phones.some((p) => Math.abs(p.start - segment.start) < 180);
    if (!contextualMixedCase && words.some((t) => !CAPS_WORD.test(t.text) && !CAPS_TOKEN.test(t.text))) return "not capitalised";
  }
  return null;
}

function scoreName(segment, toks, ctx, item, labeled) {
  const evidence = [];
  let score = 0.45;
  if (labeled) {
    evidence.push("explicit name label");
    score += 0.35;
  }
  const allCaps = toks.every((t) => CAPS_WORD.test(t.text) || CAPS_TOKEN.test(t.text) || INITIAL.test(t.text));
  if (allCaps) {
    evidence.push("capitalisation pattern");
    score += 0.1;
  }
  if (toks.length >= 3) {
    evidence.push("three or more name tokens");
    score += 0.08;
  }
  const first = toks[0];
  const last = toks[toks.length - 1];
  if (firstName(first.text)) {
    evidence.push("known first name");
    score += 0.22;
  }
  if (surname(last.text)) {
    evidence.push("known surname");
    score += 0.16;
  }
  const middle = toks.slice(1, -1);
  if (middle.length === 1 && INITIAL.test(middle[0].text)) {
    evidence.push("middle initial");
    score += 0.1;
  }
  const nearbyPhone = ctx.atoms.phones.some((phone) => Math.abs(phone.start - segment.start) < 180);
  if (nearbyPhone) {
    evidence.push("near a phone number");
    score += 0.06;
  }
  const addressCandidates = detectAddresses(ctx);
  const onAddressLine = ctx.items.some(
    (candidateItem) =>
      addressCandidates.some((address) => address.sourceText === candidateItem.text) &&
      segment.start >= candidateItem.start &&
      segment.end <= candidateItem.end
  );
  const nearbyAddress = !onAddressLine && addressCandidates.some((address) => {
    const overlapsAddress = segment.start < address.end && address.start < segment.end;
    return !overlapsAddress && isNearDate(segment, address, 240);
  });
  if (nearbyAddress && !/\d/.test(segment.text)) {
    evidence.push("near an address");
    score += 0.06;
  }
  const neighbourLabels = new Set(item.labels.map((l) => l.field));
  neighbourLabels.delete("name");
  if (neighbourLabels.size > 0) {
    evidence.push("same line as other labelled fields");
    score += 0.06;
  }
  const supported =
    labeled ||
    firstName(first.text) ||
    surname(last.text) ||
    toks.length >= 3 ||
    neighbourLabels.size > 0 ||
    (nearbyPhone && nearbyAddress);
  return { score, evidence, supported };
}

function displayName(toks) {
  return toks
    .map((t) => {
      if (INITIAL.test(t.text)) return t.text.replace(".", "").toUpperCase();
      if (CAPS_TOKEN.test(t.text) && t.text.length > 1) {
        return t.text.charAt(0) + t.text.slice(1).toLowerCase();
      }
      return t.text.replace(/^[a-z]/, (letter) => letter.toUpperCase());
    })
    .join(" ");
}

function detectNames(ctx) {
  const out = [];
  for (const item of ctx.items) {
    const nameLabel = labelsOfField(item, "name").find((l) => l.valueText.length > 0);
    for (const segment of splitSegments(item, ctx)) {
      const labeled = Boolean(nameLabel && segment.start === nameLabel.valueStart);
      const toks = nameTokens(segment, ctx);
      if (rejectedNameSegment(segment, toks, ctx, labeled, item)) continue;
      const { score, evidence, supported } = scoreName(segment, toks, ctx, item, labeled);
      if (!supported || (!labeled && score < 0.6)) continue;
      out.push(
        candidate({
          field: "name",
          value: displayName(toks),
          confidence: score,
          sourceText: segment.text,
          start: segment.start,
          end: segment.end,
          evidence,
          meta: { tokens: toks.length },
        })
      );
    }
  }
  return out;
}


const HOUSEHOLD_SIGNAL = /\b(?:home|house|property)\s?owner\b|\bhomeownership\b|\brenter\b|\btenant\b|\bdrivers?\b|\blicen[cs]e\b|\bdo\s+i\s+own\b/i;

function householdSignalNear(ctx, date) {
  const window = ctx.text.slice(Math.max(0, date.start - 120), Math.min(ctx.text.length, date.end + 40));
  return HOUSEHOLD_SIGNAL.test(window);
}

function isNearDate(date, entity, maxDistance = 240) {
  const distance =
    date.end < entity.start ? entity.start - date.end : entity.end < date.start ? date.start - entity.end : 0;
  return distance <= maxDistance;
}

function hasCustomerContextNear(ctx, date) {
  const names = detectNames(ctx);
  if (!names.some((name) => isNearDate(date, name))) return false;
  const addresses = detectAddresses(ctx);
  return addresses.some((address) => isNearDate(date, address));
}

// A birth date is normally labelled ("Dob:", "born"). When it is not, it is
// only accepted if the blob is collecting household data anyway (ownership or
// renter language nearby), or is near both a customer name and address. The
// latter supports common CRM notes that place an unlabelled DOB between the
// customer's name and address without ownership language.
function detectUnlabelledBirthDate(ctx) {
  const out = [];
  const NON_BIRTH_DATE_CONTEXT = /\b(?:accident|crash|collision|incident|claim|appointment|surgery|purchase|renewal)\b/i;
  for (const date of ctx.atoms.dates) {
    if (!date.valid) continue;
    if (!date.year || date.year > CURRENT_YEAR || date.year < BIRTH_YEAR_MIN) continue;
    const item = ctx.items.find((i) => date.start >= i.start && date.end <= i.end);
    if (!item) continue;
    if (item.labels.some((l) => l.field === "dateOfBirth" || l.field === "spouseDob")) continue;
    if (item.labels.some((l) => l.field === "address" || l.field === "email")) continue;
    if (NON_BIRTH_DATE_CONTEXT.test(item.text)) continue;
    if (!householdSignalNear(ctx, date) && !hasCustomerContextNear(ctx, date)) continue;
    out.push(
      candidate({
        field: "dateOfBirth",
        value: date.iso,
        confidence: 0.72,
        sourceText: date.raw,
        start: date.start,
        end: date.end,
        evidence: ["unlabelled date", "household data present nearby"],
        meta: { raw: date.raw, unlabelled: true },
      })
    );
  }
  return out;
}

function detectDateOfBirth(ctx) {
  return [...detectLabelledDateOfBirth(ctx), ...detectUnlabelledBirthDate(ctx)];
}

function detectLabelledDateOfBirth(ctx) {
  const out = [];
  for (const item of ctx.items) {
    if (!labelsOfField(item, "dateOfBirth").length) continue;
    const dates = ctx.atoms.dates.filter((d) => d.start >= item.start && d.end <= item.end);
    for (const date of dates) {
      if (!date.valid) continue;
      if (!date.year || date.year > CURRENT_YEAR || date.year < BIRTH_YEAR_MIN) continue;
      const evidence = ["date of birth label"];
      let confidence = 0.86;
      if (date.hasDay) {
        evidence.push("full date");
        confidence += 0.06;
      }
      if (date.year <= CURRENT_YEAR - 5) {
        evidence.push("plausible birth year");
        confidence += 0.02;
      }
      out.push(
        candidate({
          field: "dateOfBirth",
          value: date.iso,
          confidence,
          sourceText: date.raw,
          start: date.start,
          end: date.end,
          evidence,
          meta: { raw: date.raw, year: date.year, month: date.month, day: date.day },
        })
      );
    }
  }
  return out;
}

function detectAge(ctx) {
  const out = [];
  for (const item of ctx.items) {
    const found = [];
    for (const label of labelsOfField(item, "age")) {
      if (!label.valueText) continue;
      const digits = label.valueText.match(/\d{1,3}/);
      if (!digits) continue;
      const start = label.valueStart + label.valueText.indexOf(digits[0]);
      found.push({ value: Number(digits[0]), start, end: start + digits[0].length, text: digits[0] });
    }
    const patterns = [
      /\b(?:aged?|age\s*[:=-])\s*(\d{1,3})\b/gi,
      /\b(\d{1,3})\s*(?:years?|yrs?)\s*old\b/gi,
      /\b(\d{1,3})\s*(?:y\/o|yo)\b/gi,
    ];
    for (const re of patterns) {
      let m;
      while ((m = re.exec(item.text)) !== null) {
        const start = item.start + m.index + m[0].indexOf(m[1]);
        found.push({ value: Number(m[1]), start, end: start + m[1].length, text: m[1] });
      }
    }

    const seen = new Set();
    for (const hit of found) {
      if (!Number.isFinite(hit.value) || hit.value <= 0 || hit.value > 120 || seen.has(hit.start)) continue;
      seen.add(hit.start);
      out.push(
        candidate({
          field: "age",
          value: hit.value,
          confidence: 0.9,
          sourceText: hit.text,
          start: hit.start,
          end: hit.end,
          evidence: ["age phrasing"],
          meta: {},
        })
      );
    }
  }
  return out;
}

const SPOUSE_WORD = /\b(wife|husband|spouse)\b/i;

// Spouse details are only ever taken from an explicit spouse label or an
// explicit phrase ("and wife Maria Lopez") - never guessed from a second name.
function computeSpouse(ctx) {
  const names = [];
  const dobs = [];

  for (const item of ctx.items) {
    const spouseLabels = item.labels.filter((l) => l.field === "spouseName" || l.field === "spouseDob");
    if (!spouseLabels.length) continue;
    const label = spouseLabels[0];
    let span = { start: label.valueStart, end: item.end };
    if (!label.valueText) {
      const target = ctx.items[item.targetIndex];
      if (target && target.index !== item.index) span = { start: target.start, end: target.end };
    }
    if (span.end <= span.start) continue;
    const valueText = ctx.text.slice(span.start, span.end);
    if (!valueText.trim()) continue;

    for (const date of ctx.atoms.dates) {
      if (date.start < span.start || date.end > span.end) continue;
      if (!date.valid) continue;
      if (!date.year || date.year > CURRENT_YEAR || date.year < BIRTH_YEAR_MIN) continue;
      dobs.push(
        candidate({
          field: "spouseDob",
          value: date.iso,
          confidence: 0.88,
          sourceText: date.raw,
          start: date.start,
          end: date.end,
          evidence: ["spouse label", "date pattern"],
          meta: { raw: date.raw },
        })
      );
    }

    const tokens = tokensIn(ctx.tokens, span.start, span.end).filter(
      (t) => /^[A-Za-z]/.test(t.text) && !item.labels.some((l) => t.start >= l.start && t.end <= l.end)
    );
    const runs = [];
    let run = [];
    for (const token of tokens) {
      const prev = run[run.length - 1];
      if (prev && token.start - prev.end > 2) {
        if (run.length) runs.push(run);
        run = [];
      }
      run.push(token);
    }
    if (run.length) runs.push(run);

    for (const group of runs) {
      if (group.length < 2 || group.length > 4) continue;
      if (group.every((t) => /^[a-z]/.test(t.text))) continue;
      if (group.some((t) => SPOUSE_WORD.test(t.text))) continue;
      const text = ctx.text.slice(group[0].start, group[group.length - 1].end);
      if (nonNamePhrase(text) || knownCity(text)) continue;
      names.push(
        candidate({
          field: "spouseName",
          value: displayName(group),
          confidence: 0.86,
          sourceText: text,
          start: group[0].start,
          end: group[group.length - 1].end,
          evidence: ["spouse label", "name-like token run"],
          meta: { tokens: group.length },
        })
      );
      break;
    }
  }

  const phrasing = /\b(?:and\s+my\s+|and\s+|with\s+my\s+|with\s+|married\s+to\s+)(?:wife|husband|spouse)\s+([A-Z][A-Za-z'.-]+(?:\s+[A-Z][A-Za-z'.-]+){0,2})/g;
  let m;
  while ((m = phrasing.exec(ctx.text)) !== null) {
    const value = m[1].trim();
    if (nonNamePhrase(value) || knownCity(value)) continue;
    const start = m.index + m[0].indexOf(m[1]);
    names.push(
      candidate({
        field: "spouseName",
        value,
        confidence: 0.8,
        sourceText: value,
        start,
        end: start + value.length,
        evidence: ["spouse phrasing"],
        meta: {},
      })
    );
  }

  return { names, dobs };
}

function spouseAnalysis(ctx) {
  if (!SPOUSE_CACHE.has(ctx)) SPOUSE_CACHE.set(ctx, computeSpouse(ctx));
  return SPOUSE_CACHE.get(ctx);
}

function detectSpouseNames(ctx) {
  return spouseAnalysis(ctx).names;
}

function detectSpouseDobs(ctx) {
  return spouseAnalysis(ctx).dobs;
}

module.exports = {
  detectNames,
  detectDateOfBirth,
  detectAge,
  detectSpouseNames,
  detectSpouseDobs,
  splitSegments,
};

},
"lib/rules/vehicle.js": function(module, exports, __load) {
"use strict";

// VEHICLE rule: a vehicle mention is kept VERBATIM.
//
// "honda 2012" stays "honda 2012". The engine deliberately does NOT split a
// mention into year/make/model, so an unknown make, an unknown model or a typo
// ("2016 subru forster") is still captured exactly as the user typed it.
// A mention is accepted on SHAPE: a plausible model year or a make hint, plus
// at least one content word - never on being present in a make/model list.
const { candidate } = __load("lib/candidates.js");
const { atomAt } = __load("lib/atoms.js");
const {
  makeHint,
  categoryFor,
  countFor,
  homeTypeMatch,
  insuranceExact,
  knownCity,
  isStateToken,
  lookupState,
  isStreetSuffix,
  UNIT_WORDS,
  nonNamePhrase,
  compact,
} = __load("lib/lexicons.js");
const { VEHICLE_CATEGORIES } = __load("data/vehicles.js");
const { labelsOfField, tokensIn } = __load("lib/structure.js");

const DURATION_WORDS =
  /\b(years?|yrs?|months?|mos?|about|around|more\s+th[ae]n|over|since|been|long|time)\b/i;
const OWNERSHIP_WORDS = /\b(own(?:s|er|ers|ership)?|renter|tenant|rents?|leases?)\b/i;
const SENTENCE_WORDS = /\b(lives?|living|resides?|call|please|thanks|thank|tomorrow|back|moved)\b/i;
const NOISE = new Set([
  "a",
  "an",
  "the",
  "and",
  "or",
  "of",
  "for",
  "with",
  "is",
  "was",
  "my",
  "our",
  "his",
  "her",
  "at",
  "in",
  "on",
  "to",
  "it",
  "this",
  "that",
  "model",
  "make",
  "year",
  "approx",
]);

function partHasLabel(item, part) {
  return item.labels.some((l) => l.start >= part.start && l.end <= part.end);
}

function analysePart(item, part, ctx) {
  const toks = tokensIn(ctx.tokens, part.start, part.end);
  if (!toks.length) return null;
  if (partHasLabel(item, part)) return null;
  if (ctx.atoms.dates.some((d) => d.start >= part.start && d.end <= part.end)) return null;
  if (ctx.atoms.phones.some((p) => p.start >= part.start && p.end <= part.end)) return null;
  if (DURATION_WORDS.test(part.text) || OWNERSHIP_WORDS.test(part.text)) return null;
  if (SENTENCE_WORDS.test(part.text)) return null;
  if (homeTypeMatch(part.text) || nonNamePhrase(part.text)) return null;
  if (toks.length > 6) return null;

  let hasYear = false;
  let hasMake = false;
  let hasZip = false;
  let hasState = false;
  let houseStreet = false;
  let insurer = false;
  let alphaContent = 0;

  for (let i = 0; i < toks.length; i += 1) {
    const token = toks[i];
    const atom = atomAt(ctx.atoms, token.start, token.end);
    if (atom && atom.kinds.includes("year")) hasYear = true;
    if (atom && atom.kinds.includes("zip5")) hasZip = true;
    if (isStateToken(token.text) || lookupState(token.text)) hasState = true;
    if (isStreetSuffix(token.text) || UNIT_WORDS.has(token.text.toLowerCase())) houseStreet = true;
    if (makeHint(token.text)) hasMake = true;
    if (i + 1 < toks.length && insuranceExact(`${token.text} ${toks[i + 1].text}`)) insurer = true;
    if (insuranceExact(token.text)) insurer = true;
    if (categoryFor(token.text)) continue;
    if (NOISE.has(token.text.toLowerCase())) continue;
    if (/^[A-Za-z]/.test(token.text)) alphaContent += 1;
  }

  if (hasZip || hasState) return null;
  if (houseStreet && /^\d/.test(toks[0].text)) return null;
  if (!hasYear && !hasMake) return null;
  if (!hasYear && insurer) return null;
  // A bare year ("2006") or a bare count ("2 cars") is not a vehicle record.
  if (!alphaContent) return null;

  return { hasYear, hasMake, toks, alphaContent };
}


function detectVehicles(ctx) {
  const out = [];
  const seen = new Set();

  for (const item of ctx.items) {
    for (const itemPart of item.parts) {
      const vehicleParts = [];
      const separator = /\/\/|\s+\/\s+/g;
      let previousEnd = 0;
      let match;
      while ((match = separator.exec(itemPart.text)) !== null) {
        const before = itemPart.text.slice(previousEnd, match.index).trim();
        if (before) {
          const offset = itemPart.text.indexOf(before, previousEnd);
          vehicleParts.push({ text: before, start: itemPart.start + offset, end: itemPart.start + offset + before.length });
        }
        previousEnd = match.index + match[0].length;
      }
      const after = itemPart.text.slice(previousEnd).trim();
      if (after) {
        const offset = itemPart.text.indexOf(after, previousEnd);
        vehicleParts.push({ text: after, start: itemPart.start + offset, end: itemPart.start + offset + after.length });
      }
      if (!vehicleParts.length) vehicleParts.push(itemPart);

      for (const part of vehicleParts) {
        const analysis = analysePart(item, part, ctx);
        if (!analysis) continue;
        const value = part.text.replace(/\s+/g, " ").replace(/[,\s]+$/, "").trim();
        const key = value.toLowerCase();
        if (!value || seen.has(key)) continue;
        seen.add(key);

        const evidence = ["vehicle mention"];
        let confidence = 0.78;
        if (analysis.hasYear) {
          evidence.push("plausible model year");
          confidence += 0.08;
        }
        if (analysis.hasMake) {
          evidence.push("known make hint");
          confidence += 0.06;
        }
        if (analysis.alphaContent >= 2) {
          evidence.push("make/model-like token sequence");
          confidence += 0.04;
        }
        out.push(
          candidate({
            field: "vehicles",
            value,
            confidence,
            sourceText: value,
            start: part.start,
            end: part.end,
            evidence,
            meta: { verbatim: true, hasYear: analysis.hasYear, hasMake: analysis.hasMake },
          })
        );
      }
    }
  }

  return out;
}

function detectVehicleCount(ctx) {
  const out = [];
  const categories = Object.keys(VEHICLE_CATEGORIES).join("|");
  const numbers = "zero|one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve";
  const patterns = [
    new RegExp(`\\b(${numbers}|\\d{1,2})\\s+(${categories})\\b`, "gi"),
    new RegExp(`\\b(${categories})\\s*[,:]?\\s*(${numbers}|\\d{1,2})\\b`, "gi"),
  ];

  for (const re of patterns) {
    let m;
    while ((m = re.exec(ctx.text)) !== null) {
      let count = countFor(m[1]);
      let categoryWord = m[2];
      if (count == null || categoryFor(m[1])) {
        count = countFor(m[2]);
        categoryWord = m[1];
      }
      if (count == null || count < 0 || count > 20) continue;
      if (/^\d{4}$/.test(m[0].trim())) continue;
      const category = categoryFor(categoryWord);
      const start = m.index;
      const end = start + m[0].length;
      out.push(
        candidate({
          field: "vehicleCount",
          value: count,
          confidence: 0.94,
          sourceText: m[0],
          start,
          end,
          evidence: ["count + vehicle category phrase"],
          meta: { category, explicit: true },
        })
      );
      if (category) {
        out.push(
          candidate({
            field: "vehicleCategory",
            value: category,
            confidence: 0.94,
            sourceText: m[0],
            start,
            end,
            evidence: ["explicit vehicle category word"],
            meta: {},
          })
        );
      }
    }
  }

  return out;
}

module.exports = { detectVehicles, detectVehicleCount, analysePart };

},
"lib/rules/insurance.js": function(module, exports, __load) {
"use strict";

// INSURANCE rules: carrier + duration.
//
// Carriers are matched from the seed dictionary when possible, but an unknown
// carrier is still captured by PATTERN ("<X> for <duration>", "insured with
// <X>", "<X> insurance"), which is what makes the engine work outside the
// handful of companies a developer thought to hard-code.
const { candidate } = __load("lib/candidates.js");
const {
  insuranceExact,
  insuranceFuzzy,
  MAX_INSURANCE_ALIAS_WORDS,
  knownCity,
  isStateToken,
  lookupState,
  makeHint,
  homeTypeMatch,
  nonNamePhrase,
  countFor,
} = __load("lib/lexicons.js");
const { tokensIn } = __load("lib/structure.js");
const { analysePart } = __load("lib/rules/vehicle.js");

const NEGATION_RE = /\b(not|no|never|without|n't|excluding|except)\b/i;
const STOP_WORDS = /\b(year|years|months?|more|then|than|about|around|over|been|since|for|with|and|the|a|an|my|our)\b/i;

function negationBefore(text, offset) {
  const floor = Math.max(0, offset - 24);
  const window = text.slice(floor, offset);
  const m = window.match(NEGATION_RE);
  if (!m) return null;
  const tail = window.slice(m.index);
  const close = offset - (floor + m.index) <= 8 || /\b(not|no|never)\s*$/.test(tail);
  if (!close) return null;
  return { start: floor + m.index, end: floor + m.index + m[0].length };
}

function detectInsuranceCompanies(ctx) {
  const out = [];
  const seen = new Set();

  for (const item of ctx.items) {
    for (const part of item.parts) {
      const toks = tokensIn(ctx.tokens, part.start, part.end);
      if (!toks.length) continue;
      const vehicleLike = Boolean(analysePart(item, part, ctx));

      for (let i = 0; i < toks.length; i += 1) {
        for (let size = Math.min(MAX_INSURANCE_ALIAS_WORDS, toks.length - i); size >= 1; size -= 1) {
          const run = toks.slice(i, i + size);
          const phrase = run.map((t) => t.text).join(" ");
          const entry = insuranceExact(phrase);
          if (!entry) continue;
          const key = `${entry.canonical}:${run[0].start}`;
          if (seen.has(key)) continue;
          seen.add(key);
          const cue = negationBefore(part.text, run[0].start - part.start);
          const negated = Boolean(cue);
          const carrier = candidate({
            field: "insuranceCompany",
            value: entry.canonical,
            confidence: negated ? 0.9 : 0.92,
            sourceText: ctx.text.slice(run[0].start, run[size - 1].end),
            start: run[0].start,
            end: run[size - 1].end,
            evidence: ["known insurance company alias", negated ? "negated mention" : "affirmative mention"],
            meta: { negated, matchedAlias: phrase, inferred: false },
          });
          if (cue) carrier.extraSpans = [{ start: part.start + cue.start, end: part.start + cue.end }];
          out.push(carrier);
          i += size - 1;
          break;
        }
      }

      // Fuzzy rescue for typos ("Progresive") - only on long tokens, and never
      // inside a vehicle mention, where make names dominate.
      if (!vehicleLike) {
        for (const token of toks) {
          if (token.text.length < 5) continue;
          if (insuranceExact(token.text)) continue;
          if (makeHint(token.text)) continue;
          const fuzzy = insuranceFuzzy(token.text);
          if (!fuzzy) continue;
          const key = `${fuzzy.entry.canonical}:${token.start}`;
          if (seen.has(key)) continue;
          seen.add(key);
          const cue = negationBefore(part.text, token.start - part.start);
          const negated = Boolean(cue);
          const fuzzyCarrier = candidate({
            field: "insuranceCompany",
            value: fuzzy.entry.canonical,
            confidence: negated ? 0.8 : 0.84,
            sourceText: token.text,
            start: token.start,
            end: token.end,
            evidence: [`fuzzy match to ${fuzzy.entry.canonical}`],
            meta: { negated, typo: token.text, inferred: false },
          });
          if (cue) fuzzyCarrier.extraSpans = [{ start: part.start + cue.start, end: part.start + cue.end }];
          out.push(fuzzyCarrier);
        }
      }

      const inferred = inferCarrier(part, toks, ctx, vehicleLike);
      if (inferred) {
        const key = `inferred:${inferred.value}:${inferred.start}`;
        if (!seen.has(key)) {
          seen.add(key);
          out.push(inferred);
        }
      }
    }
  }

  return out;
}

function inferCarrier(part, toks, ctx, vehicleLike) {
  if (vehicleLike) return null;
  const text = part.text;
  const patterns = [
    { re: /^([A-Za-z][A-Za-z&.'\- ]{2,40}?)\s+for\b/i, group: 1, tail: /\bfor\b/i },
    { re: /\b(?:with|by|through|from)\s+([A-Za-z][A-Za-z&.'\- ]{2,30}?)(?=\s+(?:for|since)\b)/i, group: 1 },
    { re: /\b(?:insured|covered|coverage|policy|carrier)\s+(?:with|by|through|at)\s+([A-Za-z][A-Za-z&.'\- ]{2,30})/i, group: 1 },
    { re: /^([A-Za-z][A-Za-z&.'\- ]{2,30}?)\s+insurance\b/i, group: 1 },
  ];

  for (const pattern of patterns) {
    const m = text.match(pattern.re);
    if (!m) continue;
    const value = m[pattern.group].replace(/[,\s]+$/, "").trim();
    if (!value || value.split(/\s+/).length > 4) continue;
    if (STOP_WORDS.test(value) || /\d/.test(value)) continue;
    if (knownCity(value) || homeTypeMatch(value) || nonNamePhrase(value)) continue;
    if (/^(?:a|an|the|my|our|i|we)\b/i.test(value)) continue;
    const valueToks = tokensIn(ctx.tokens, part.start, part.end).filter(
      (t) => t.start >= part.start + text.indexOf(value) && t.end <= part.start + text.indexOf(value) + value.length
    );
    if (!valueToks.length) continue;
    const capitalized = valueToks.some((t) => /^[A-Z]/.test(t.text));
    const contextual = /^(?:with|by|through|from)/i.test(m[0]);
    if (!capitalized && !contextual) continue;
    if (valueToks.some((t) => lookupState(t.text) || isStateToken(t.text))) continue;
    const cue = negationBefore(text, valueToks[0].start - part.start);
    const negated = Boolean(cue);
    const inferredCarrier = candidate({
      field: "insuranceCompany",
      value,
      confidence: negated ? 0.6 : 0.66,
      sourceText: value,
      start: valueToks[0].start,
      end: valueToks[valueToks.length - 1].end,
      evidence: ["carrier inferred from phrasing", "not in the seed dictionary"],
      meta: { negated, inferred: true },
    });
    if (cue) inferredCarrier.extraSpans = [{ start: part.start + cue.start, end: part.start + cue.end }];
    return inferredCarrier;
  }

  return null;
}


const DURATION_PATTERNS = [
  {
    re: /\b(?:for\s+)?(?:more\s+th[ae]n|over|greater\s+than)\s+(\d{1,3}|a|an|one|two|three|four|five|six|seven|eight|nine|ten|several)\s*(years?|yrs?|months?|mos?)\b/gi,
    operator: "greater_than",
  },
  { re: /\b(\d{1,3})\s*\+\s*(years?|yrs?|months?|mos?)\b/gi, operator: "greater_than_or_equal" },
  { re: /\b(\d{1,3})\s+plus\s+(years?|yrs?|months?|mos?)\b/gi, operator: "greater_than_or_equal" },
  {
    re: /\b(?:at\s+least|minimum(?:\s+of)?)\s+(\d{1,3})\s*(years?|yrs?|months?|mos?)\b/gi,
    operator: "greater_than_or_equal",
  },
  { re: /\b(?:less\s+than|under)\s+(\d{1,3}|a|an|one)\s*(years?|yrs?|months?|mos?)\b/gi, operator: "less_than" },
  {
    re: /\b(?:about|around|approximately|approx\.?|like|roughly)\s+(\d{1,3}|a|an|one)\s*(years?|yrs?|months?|mos?)\b/gi,
    operator: "approximately",
  },
  { re: /\ba\s+year\s+long\b/gi, operator: "exact", value: 1, unit: "years" },
  { re: /\b(?:for\s+)?several\s+(years?|yrs?|months?)\b/gi, operator: "approximate", qualitative: "several" },
  { re: /\b(?:for\s+)?a\s+long\s+time\b/gi, operator: "approximate", qualitative: "long_time" },
  {
    re: /\b(?:for\s+)?(\d{1,3}|a|an|one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve)\s*(years?|yrs?|months?|mos?)\b/gi,
    operator: "exact",
  },
];

const OPERATOR_RANK = {
  greater_than: 4,
  greater_than_or_equal: 4,
  less_than: 4,
  approximate: 3,
  approximately: 3,
  exact: 1,
};

function normalizeUnit(word) {
  return /^y/i.test(word) ? "years" : "months";
}

function countFromToken(token) {
  if (token == null) return null;
  const raw = String(token).trim().toLowerCase();
  if (raw === "a" || raw === "an") return 1;
  return countFor(raw);
}

function detectInsuranceDurations(ctx) {
  const raw = [];
  for (const pattern of DURATION_PATTERNS) {
    const re = new RegExp(pattern.re.source, "gi");
    let m;
    while ((m = re.exec(ctx.text)) !== null) {
      const unit = pattern.unit || (m[2] ? normalizeUnit(m[2]) : "years");
      let value = pattern.value ?? null;
      if (value == null && m[1] != null) value = countFromToken(m[1]);
      const duration = { value: value ?? null, unit, operator: pattern.operator };
      if (pattern.qualitative) duration.qualitative = pattern.qualitative;
      const trimmed = m[0].trim();
      raw.push(
        candidate({
          field: "insuranceDuration",
          value: duration,
          confidence: pattern.operator === "exact" || pattern.operator === "approximate" ? 0.88 : 0.9,
          sourceText: trimmed,
          start: m.index + m[0].indexOf(trimmed),
          end: m.index + m[0].trimEnd().length,
          evidence: ["duration phrasing", `operator: ${pattern.operator}`],
          meta: { operator: pattern.operator, qualitative: pattern.qualitative || null },
        })
      );
    }
  }

  // Collapse nested matches ("for more then 2 months" also matches "2 months"):
  // the more specific phrasing wins, the contained one is dropped.
  const ranked = raw.slice().sort((a, b) => {
    const rank = (OPERATOR_RANK[b.value.operator] || 0) - (OPERATOR_RANK[a.value.operator] || 0);
    if (rank !== 0) return rank;
    return b.end - b.start - (a.end - a.start);
  });
  const kept = [];
  for (const cand of ranked) {
    if (kept.some((k) => cand.start >= k.start && cand.end <= k.end)) continue;
    kept.push(cand);
  }
  return kept.sort((a, b) => a.start - b.start);
}

module.exports = { detectInsuranceCompanies, detectInsuranceDurations, DURATION_PATTERNS };

},
"lib/rules/home.js": function(module, exports, __load) {
"use strict";

// HOME rules: ownership and home type.
//
// Ownership is polarity-sensitive: "not allstate" must never become "not an
// owner", so a negative only counts when the negation is attached to an
// ownership word. Home type never fires on an address unit ("Apt 161").
const { candidate } = __load("lib/candidates.js");
const { HOME_TYPE_PHRASES } = __load("data/home.js");
const { similarity } = __load("lib/similarity.js");
const { labelsOfField } = __load("lib/structure.js");

const NEGATIVE = [
  /\b(?:renter|tenant)\b/i,
  /\b(?:not|never|isn'?t|aren'?t|n'?t)\s+(?:a\s+|an\s+)?(?:home|house|property)\s?owner\b/i,
  /\b(?:not|never)\s+(?:an\s+)?owner\b/i,
  /\brent(?:s|ing)?\s+(?:the\s+|a\s+|my\s+|our\s+)?(?:home|house|apartment|place|property)\b/i,
  /\bleas(?:e|es|ing)\s+(?:the\s+|a\s+|my\s+|our\s+)?(?:home|house|apartment|place|property)\b/i,
  /\b(?:do(?:es)?\s?n'?t|do(?:es)?\s+not)\s+own\b/i,
  /\b(?:not|don'?t|do\s+not)\s+own\b/i,
];

const POSITIVE = [
  /\b(?:home|house|property)\s?owner\b/i,
  /\bhome\s?ownership\b/i,
  /\bowner\s+occupied\b/i,
  /\bowns?\s+(?:the\s+|a\s+|my\s+|our\s+|their\s+)?(?:home|house|property)\b/i,
  /\bown\s+home\b/i,
  /\bi\s+own\s+(?:the\s+|a\s+|my\s+)?(?:home|house|property)\b/i,
];

function matchSpan(text, base, re) {
  const m = text.match(re);
  if (!m) return null;
  return { start: base + m.index, end: base + m.index + m[0].length, raw: m[0] };
}

function detectHomeOwner(ctx) {
  const out = [];
  for (const item of ctx.items) {
    for (const label of labelsOfField(item, "homeOwner")) {
      const phrase = label.phrase.toLowerCase();
      const affirmative = !/renter|tenant/.test(phrase);
      out.push(
        candidate({
          field: "homeOwner",
          value: affirmative,
          confidence: 0.9,
          sourceText: label.phrase,
          start: label.start,
          end: label.end,
          evidence: ["explicit ownership label"],
          meta: { source: "label", affirmOnly: label.valueText === "" },
        })
      );
    }
    for (const re of NEGATIVE) {
      const span = matchSpan(item.text, item.start, re);
      if (!span) continue;
      out.push(
        candidate({
          field: "homeOwner",
          value: false,
          confidence: 0.92,
          sourceText: span.raw,
          start: span.start,
          end: span.end,
          evidence: ["explicit negative ownership language"],
          meta: { source: "phrase" },
        })
      );
    }
    for (const re of POSITIVE) {
      const span = matchSpan(item.text, item.start, re);
      if (!span) continue;
      const negated = NEGATIVE.some((n) => {
        const hit = matchSpan(item.text, item.start, n);
        return hit && span.start < hit.end && hit.start < span.end;
      });
      if (negated) continue;
      out.push(
        candidate({
          field: "homeOwner",
          value: true,
          confidence: 0.92,
          sourceText: span.raw,
          start: span.start,
          end: span.end,
          evidence: ["explicit ownership language"],
          meta: { source: "phrase" },
        })
      );
    }
  }
  return out;
}

function detectHomeType(ctx) {
  const out = [];
  for (const item of ctx.items) {
    for (const part of item.parts) {
      for (const entry of HOME_TYPE_PHRASES) {
        const escaped = entry.alias.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
        const re = new RegExp(`(?:^|[^A-Za-z])(${escaped.replace(/\s+/g, "\\s+")})(?![A-Za-z])`, "i");
        const m = part.text.match(re);
        if (!m) continue;
        const start = part.start + m.index + (m[0].length - m[1].length);
        const end = start + m[1].length;
        const after = ctx.text.slice(end, end + 10);
        if (/^\s*#?\s*\d/.test(after)) continue;
        const nextWord = ctx.text.slice(end).match(/^\s*([A-Za-z]+)/);
        if (nextWord && /^(owners?|ownership|occupied|renters?|tenants?)$/i.test(nextWord[1])) continue;
        out.push(
          candidate({
            field: "homeType",
            value: entry.canonical,
            confidence: entry.alias.length > 6 ? 0.92 : 0.9,
            sourceText: m[1],
            start,
            end,
            evidence: ["home type vocabulary"],
            meta: { alias: entry.alias },
          })
        );
        break;
      }
    }
  }
  return out;
}

// "Simgle family home" is a realistic typo. The home-type taxonomy is closed,
// so a high-similarity match is safe here (unlike open sets, which stay verbatim).
// Runs as its own rule so the exact pass always wins when both fire.
function detectFuzzyHomeType(ctx) {
  for (const item of ctx.items) {
    for (const part of item.parts) {
      const words = part.text.split(/\s+/).filter(Boolean);
      if (words.length < 2 || words.length > 3) continue;
      if (words.some((w) => /\d/.test(w))) continue;
      const squashed = part.text.toLowerCase().replace(/[^a-z]/g, "");
      if (squashed.length < 8) continue;
      let best = null;
      for (const entry of HOME_TYPE_PHRASES) {
        if (entry.compact.length < 8) continue;
        const score = similarity(squashed, entry.compact);
        if (score >= 0.85 && (!best || score > best.score)) best = { entry, score };
      }
      if (!best) continue;
      return [
        candidate({
          field: "homeType",
          value: best.entry.canonical,
          confidence: 0.86,
          sourceText: part.text,
          start: part.start,
          end: part.end,
          evidence: [`fuzzy match to ${best.entry.canonical}`, "home type vocabulary"],
          meta: { alias: best.entry.alias, fuzzy: true },
        }),
      ];
    }
  }
  return [];
}

module.exports = { detectHomeOwner, detectHomeType, detectFuzzyHomeType };

},
"lib/arbitrate.js": function(module, exports, __load) {
"use strict";

// ARBITRATION: turn independent candidates into one record.
//
// Design rule: a visible, well-evidenced value is never thrown away because a
// rival exists. Rivals become `alternatives` + a `conflicts` note, and only a
// true contradiction (true vs false, or a value with nothing behind it) can
// leave a field null. Nothing is dropped silently: leftover text lands in
// `unknown` with a reason.
const { stringifyValue, valuesEqual } = __load("lib/candidates.js");
const { zipAgreesWithState, zipAgreesWithCity } = __load("lib/lexicons.js");

const FIELDS = [
  "name",
  "phone",
  "phones",
  "address",
  "zip",
  "vehicles",
  "vehicleCount",
  "vehicleCategory",
  "insuranceCompany",
  "insuranceDuration",
  "homeOwner",
  "homeType",
  "dateOfBirth",
  "email",
  "spouseName",
  "spouseDob",
  "age",
];

const SCALAR_FIELDS = ["name", "phone", "address", "zip", "vehicleCount", "vehicleCategory"];

const COMPLEMENTARY = [new Set(["vehicleCount", "vehicleCategory"])];

function overlaps(a, b) {
  if (a.start < 0 || b.start < 0) return false;
  return a.start < b.end && b.start < a.end;
}

function compatibleOverlap(a, b) {
  if (a.field === b.field) return valuesEqual(a.value, b.value);
  if (COMPLEMENTARY.some((pair) => pair.has(a.field) && pair.has(b.field))) return true;
  if (a.field === "address" || b.field === "address") {
    const address = a.field === "address" ? a : b;
    const other = a.field === "address" ? b : a;
    // An address legitimately contains its own ZIP.
    if (other.field === "zip" && address.meta && address.meta.zip) {
      return String(other.value).slice(0, 5) === address.meta.zip;
    }
  }
  return false;
}

function partition(candidates) {
  const sorted = [...candidates]
    .filter((c) => c.value != null)
    .sort((a, b) => {
      if (b.confidence !== a.confidence) return b.confidence - a.confidence;
      const aLen = (a.end ?? -1) - (a.start ?? -1);
      const bLen = (b.end ?? -1) - (b.start ?? -1);
      if (aLen !== bLen) return bLen - aLen;
      return (a.start ?? 0) - (b.start ?? 0);
    });

  const claimed = [];
  const accepted = [];
  const rejected = [];
  for (const cand of sorted) {
    const clash = claimed.find((c) => overlaps(cand, c) && !compatibleOverlap(cand, c));
    if (clash) {
      rejected.push({
        field: cand.field,
        value: cand.value,
        confidence: cand.confidence,
        reason: `text span already assigned to ${clash.field}`,
        start: cand.start,
        end: cand.end,
      });
      continue;
    }
    claimed.push(cand);
    accepted.push(cand);
  }
  return { accepted, rejected };
}

function groupByField(accepted) {
  const map = new Map();
  for (const field of FIELDS) map.set(field, []);
  for (const cand of accepted) {
    if (!map.has(cand.field)) map.set(cand.field, []);
    map.get(cand.field).push(cand);
  }
  // Equal evidence: the value the customer wrote FIRST wins. Deterministic,
  // and it matches how a human reads the file top-to-bottom.
  for (const list of map.values()) {
    list.sort((a, b) => {
      if (b.confidence !== a.confidence) return b.confidence - a.confidence;
      return (a.start ?? 0) - (b.start ?? 0);
    });
  }
  return map;
}

module.exports = { FIELDS, SCALAR_FIELDS, partition, groupByField, overlaps, compatibleOverlap };


function resolveScalar(field, list, conflicts, alternatives) {
  if (!list.length) return { value: null, confidence: 0, evidence: [], meta: null, candidates: [] };

  if (field === "homeOwner") {
    const values = new Set(list.map((c) => stringifyValue(c.value)));
    if (values.size > 1) {
      conflicts.push({
        field,
        kept: null,
        candidates: [...values],
        reason: "ownership stated both as true and as false",
      });
      alternatives[field] = list.map((c) => ({
        value: c.value,
        confidence: c.confidence,
        reason: "contradicting statement",
      }));
      return { value: null, confidence: 0, evidence: [], meta: null, candidates: list };
    }
  }

  const primary = list[0];
  const extras = [];
  for (const cand of list.slice(1)) {
    if (valuesEqual(cand.value, primary.value)) continue;
    if (extras.some((e) => valuesEqual(e.value, cand.value))) continue;
    extras.push(cand);
  }

  if (extras.length) {
    const reasons = {
      phone: "more than one phone number",
      zip: "more than one ZIP code",
      vehicleCount: "conflicting vehicle counts",
      insuranceCompany: "more than one insurance company",
      name: "more than one name",
    };
    conflicts.push({
      field,
      kept: primary.value,
      candidates: [primary.value, ...extras.map((e) => e.value)],
      reason: reasons[field] || "more than one candidate value",
    });
    alternatives[field] = extras.map((e) => ({
      value: e.value,
      confidence: e.confidence,
      reason: "rival value with lower evidence",
    }));
  }

  return {
    value: primary.value,
    confidence: primary.confidence,
    evidence: primary.evidence,
    meta: primary.meta || null,
    candidates: list,
    sourceText: primary.sourceText,
    start: primary.start,
    end: primary.end,
  };
}

function resolveVehicles(list, conflicts) {
  if (!list.length) return { value: [], confidence: 0, evidence: [], candidates: [] };
  const ordered = [...list].sort((a, b) => (a.start ?? 0) - (b.start ?? 0));
  const value = [];
  for (const cand of ordered) {
    const text = String(cand.value);
    if (value.some((v) => v.toLowerCase() === text.toLowerCase())) continue;
    value.push(text);
  }
  const confidence = Math.max(...ordered.map((c) => c.confidence));
  const evidence = [...new Set(ordered.flatMap((c) => c.evidence))].sort();
  if (value.length > 1) {
    conflicts.push({
      field: "vehicles",
      kept: value,
      candidates: value,
      reason: "multiple vehicle mentions",
      info: true,
    });
  }
  return { value, confidence, evidence, candidates: ordered };
}

function resolveAllFields(grouped) {
  const conflicts = [];
  const alternatives = {};
  const fields = {};

  for (const field of FIELDS) {
    const list = grouped.get(field) || [];
    if (field === "vehicles") {
      fields[field] = resolveVehicles(list, conflicts);
      continue;
    }
    if (field === "phones") continue;
    fields[field] = resolveScalar(field, list, conflicts, alternatives);
  }

  const phoneList = (grouped.get("phone") || []).slice().sort((a, b) => (a.start ?? 0) - (b.start ?? 0));
  const phones = [];
  for (const cand of phoneList) {
    if (!phones.includes(cand.value)) phones.push(cand.value);
  }
  fields.phones = {
    value: phones,
    confidence: fields.phone.confidence,
    evidence: [...new Set(phoneList.flatMap((c) => c.evidence))].sort(),
    candidates: phoneList,
  };

  return { fields, conflicts, alternatives };
}


function zip5Of(value) {
  return value == null ? null : String(value).slice(0, 5);
}

function bump(field, amount, evidenceText) {
  if (!field || field.value == null) return;
  field.confidence = Math.min(0.999, Math.round((field.confidence + amount) * 1000) / 1000);
  if (evidenceText) field.evidence = [...new Set([...(field.evidence || []), evidenceText])].sort();
}

function crossField(fields, conflicts, alternatives, excluded) {
  const address = fields.address;

  // The address line is the most reliable ZIP carrier: use it to corroborate,
  // to arbitrate rivals, and as a fallback so a visible ZIP is never lost.
  if (address.value && address.meta && address.meta.zip) {
    const addrZip = address.meta.zip;
    const addrZipFull = address.meta.zipFull || addrZip;
    if (!fields.zip.value) {
      fields.zip = {
        value: addrZipFull,
        confidence: Math.max(0.6, Math.round((address.confidence - 0.05) * 1000) / 1000),
        evidence: ["ZIP taken from the address line"],
        meta: { zip5: addrZip, fromAddress: true },
        candidates: fields.zip.candidates || [],
      };
    } else if (zip5Of(fields.zip.value) !== addrZip && address.confidence >= fields.zip.confidence - 0.05) {
      alternatives.zip = [
        ...(alternatives.zip || []),
        { value: fields.zip.value, confidence: fields.zip.confidence, reason: "does not appear in the address" },
      ];
      conflicts.push({
        field: "zip",
        kept: addrZipFull,
        candidates: [fields.zip.value, addrZipFull],
        reason: "ZIP disagreed with the ZIP inside the address line",
      });
      fields.zip = {
        value: addrZipFull,
        confidence: Math.max(fields.zip.confidence, address.confidence),
        evidence: [...new Set([...(fields.zip.evidence || []), "ZIP matches the address line"])].sort(),
        meta: { zip5: addrZip, fromAddress: true },
        candidates: fields.zip.candidates || [],
      };
    } else if (zip5Of(fields.zip.value) === addrZip) {
      bump(fields.zip, 0.04, "ZIP confirmed by the address line");
      bump(fields.address, 0.02, "address confirmed by the ZIP field");
    }
  }

  if (fields.zip.value && address.value && address.meta) {
    const zip5 = zip5Of(fields.zip.value);
    if (address.meta.state && zipAgreesWithState(zip5, address.meta.state) === true) {
      bump(fields.zip, 0.03, `ZIP agrees with ${address.meta.state}`);
    }
    if (address.meta.city && zipAgreesWithCity(zip5, address.meta.city) === true) {
      bump(fields.zip, 0.03, "ZIP agrees with the known city");
    }
  }

  const vehicles = fields.vehicles.value || [];
  if (fields.vehicleCount.value == null && vehicles.length) {
    fields.vehicleCount = {
      value: vehicles.length,
      confidence: 0.8,
      evidence: ["inferred from the vehicle mentions on the file"],
      meta: { inferred: true },
      candidates: [],
    };
  } else if (fields.vehicleCount.value != null && vehicles.length) {
    if (fields.vehicleCount.value === vehicles.length) {
      bump(fields.vehicleCount, 0.03, "matches the vehicle mentions on the file");
      bump(fields.vehicles, 0.02, "matches the stated vehicle count");
    } else {
      conflicts.push({
        field: "vehicleCount",
        kept: fields.vehicleCount.value,
        candidates: [fields.vehicleCount.value, vehicles.length],
        reason: "stated vehicle count does not match detected vehicle records",
      });
    }
  }

  // Negated carrier mentions are information, not a value: "not allstate".
  const carrierCandidates = (fields.insuranceCompany.candidates || []);
  const affirmative = carrierCandidates.filter((c) => !(c.meta && c.meta.negated));
  const negated = carrierCandidates.filter((c) => c.meta && c.meta.negated);
  if (negated.length) {
    excluded.insuranceCompany = [...new Set(negated.map((c) => String(c.value)))];
    if (!affirmative.length) {
      conflicts.push({
        field: "insuranceCompany",
        kept: null,
        candidates: excluded.insuranceCompany,
        reason: "the only carrier mention is negated by the customer",
      });
      fields.insuranceCompany = {
        value: null,
        confidence: 0,
        evidence: [],
        meta: null,
        candidates: carrierCandidates,
      };
    }
  }

  return { fields, conflicts, alternatives, excluded };
}


const { LABEL_PHRASES } = __load("data/labels.js");

const BOILERPLATE = new Set(
  [
    ...LABEL_PHRASES.map((p) => p.phrase),
    "yes",
    "no",
    "and",
    "or",
    "the",
    "of",
    "for",
    "with",
    "at",
    "in",
    "on",
    "to",
    "from",
    "since",
    "been",
    "is",
    "was",
    "my",
    "our",
    "their",
    "it",
    "this",
    "that",
    "more",
    "then",
    "than",
    "about",
    "around",
    "over",
    "roughly",
    "approximately",
    "approx",
    "year",
    "years",
    "month",
    "months",
    "week",
    "weeks",
    "day",
    "days",
    "home",
    "owner",
    "vehicle",
    "car",
    "cars",
    "truck",
    "trucks",
    "name",
    "phone",
    "zip",
    "address",
    "insurance",
    "state",
    "city",
    "unit",
    "apt",
    "ste",
    "suite",
    "#",
  ].map((w) => w.toLowerCase())
);

function isBoilerplate(piece) {
  const normalized = piece
    .toLowerCase()
    .replace(/[^\w\s#]/g, "")
    .replace(/\s+/g, " ")
    .trim();
  if (!normalized) return true;
  if (BOILERPLATE.has(normalized)) return true;
  if (normalized.split(" ").every((word) => BOILERPLATE.has(word))) return true;
  if (!/[A-Za-z]/.test(piece) && piece.replace(/\D/g, "").length < 4) return true;
  return false;
}

function collectUnknown(ctx, fields, rejected) {
  const spans = [];
  for (const field of FIELDS) {
    const entry = fields[field];
    if (!entry || !entry.candidates) continue;
    for (const cand of entry.candidates) {
      if (cand.start != null && cand.start >= 0) spans.push({ start: cand.start, end: cand.end });
      if (cand.extraSpans) for (const extra of cand.extraSpans) spans.push(extra);
    }
  }
  for (const item of ctx.items) {
    for (const label of item.labels) spans.push({ start: label.start, end: label.end });
  }

  const merged = [];
  for (const span of spans.filter((s) => s.start >= 0 && s.end > s.start).sort((a, b) => a.start - b.start)) {
    const last = merged[merged.length - 1];
    if (last && span.start <= last.end + 1) last.end = Math.max(last.end, span.end);
    else merged.push({ ...span });
  }

  // A recognised date that no field claimed is one entry, not three fragments.
  const unknown = [];
  const seen = new Set();
  const strayDates = ctx.atoms.dates.filter((d) => !merged.some((s) => d.start >= s.start && d.end <= s.end));
  for (const date of strayDates) {
    merged.push({ start: date.start, end: date.end });
    const text = ctx.normalizedText.slice(date.start, date.end);
    seen.add(text.toLowerCase());
    unknown.push({ text, reason: "date found but not labelled as a date of birth" });
  }
  merged.sort((a, b) => a.start - b.start);

  const remnants = [];
  let cursor = 0;
  for (const span of merged) {
    if (cursor < span.start) remnants.push(ctx.normalizedText.slice(cursor, span.start));
    cursor = Math.max(cursor, span.end);
  }
  if (cursor < ctx.normalizedText.length) remnants.push(ctx.normalizedText.slice(cursor));


  for (const remnant of remnants) {
    const pieces = remnant
      .split(/[\n,;|]+/)
      .map((p) => p.replace(/^[:\-–—\s]+|[:=\-–—\s]+$/g, "").trim())
      .filter((p) => p.length >= 2);
    for (const piece of pieces) {
      if (isBoilerplate(piece)) continue;
      const key = piece.toLowerCase();
      if (seen.has(key)) continue;
      seen.add(key);
      unknown.push({ text: piece, reason: "no reliable field classification" });
    }
  }

  for (const entry of rejected) {
    if (entry.confidence >= 0.68 || entry.value == null) continue;
    const text = typeof entry.value === "string" ? entry.value : null;
    if (!text || seen.has(text.toLowerCase())) continue;
    if (merged.some((s) => entry.start >= s.start && entry.end <= s.end)) continue;
    seen.add(text.toLowerCase());
    unknown.push({ text, reason: `low-confidence ${entry.field} candidate was not assigned` });
  }

  unknown.sort((a, b) => a.text.localeCompare(b.text));
  return unknown;
}

function deriveStatus(ctx, fields, conflicts) {
  if (!ctx.normalizedText) return "empty";
  const blocking = conflicts.filter((c) => !c.info);
  if (blocking.some((c) => c.kept === null)) return "conflict";
  if (blocking.length) return "ambiguous";
  if (fields.name.value && fields.phone.value && fields.address.value) return "complete";
  return "partial";
}

function arbitrate(ctx, rawCandidates) {
  const { accepted, rejected } = partition(rawCandidates);
  const grouped = groupByField(accepted);
  const { fields, conflicts, alternatives } = resolveAllFields(grouped);
  const excluded = {};
  crossField(fields, conflicts, alternatives, excluded);
  const unknown = collectUnknown(ctx, fields, rejected);
  const status = deriveStatus(ctx, fields, conflicts);
  const rejectedByField = {};
  for (const field of FIELDS) rejectedByField[field] = rejected.filter((r) => r.field === field);
  return { fields, conflicts, alternatives, excluded, unknown, status, accepted, rejected: rejectedByField };
}

module.exports = {
  FIELDS,
  SCALAR_FIELDS,
  partition,
  groupByField,
  overlaps,
  compatibleOverlap,
  resolveAllFields,
  crossField,
  collectUnknown,
  deriveStatus,
  arbitrate,
};

},
"lib/report.js": function(module, exports, __load) {
"use strict";

// Presentation layer: turn a classified record into the flat, human layout the
// CRM expects. Nothing here feeds back into classification - the CSV defaults
// ("N/A", "Not AllState") are display conventions, not extracted facts.

// The layout, in the order the columns must appear.
const COLUMNS = [
  "Number",
  "Name",
  "DOB",
  "Spouse Name",
  "Spouse DOB",
  "Email",
  "No. of Cars",
  "Year Make / Model",
  "Address",
  "Current Carrier",
];

const MISSING = "N/A";
const CARRIER_FALLBACK = "Not AllState";

function display(value, fallback = MISSING) {
  if (value == null) return fallback;
  const text = String(value).trim();
  return text === "" ? fallback : text;
}

// "1959-07-16" -> "07/16/1959"; a partial date keeps its shape ("1975-04" ->
// "04/1975") because inventing a day would be worse than an imperfect format.
function formatDob(value) {
  if (!value) return MISSING;
  const full = String(value).match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (full) return `${full[2]}/${full[3]}/${full[1]}`;
  const partial = String(value).match(/^(\d{4})-(\d{2})$/);
  if (partial) return `${partial[2]}/${partial[1]}`;
  return String(value);
}

function durationLabel(duration) {
  if (!duration) return "";
  const parts = [duration.operator];
  if (duration.qualitative) parts.push(String(duration.qualitative).replace(/_/g, " "));
  if (duration.value != null) {
    parts.push(String(duration.value));
    const unit = duration.unit || "";
    parts.push(duration.value === 1 ? unit.replace(/s$/, "") : unit);
  }
  return parts.filter(Boolean).join(" ");
}

function vehiclesLabel(record) {
  return (record.vehicles || []).join("; ");
}

// One row of the CRM layout. `Number` is the phone number on purpose.
function reportRow(record, options = {}) {
  return {
    Number: display(record.phone),
    Name: display(record.name),
    DOB: formatDob(record.dateOfBirth),
    "Spouse Name": display(record.spouseName),
    "Spouse DOB": formatDob(record.spouseDob),
    Email: display(record.email),
    "No. of Cars": display(record.vehicleCount),
    "Year Make / Model": display(vehiclesLabel(record)),
    Address: display(record.address),
    "Current Carrier": display(record.insuranceCompany, options.carrierFallback || CARRIER_FALLBACK),
  };
}

function googleSheetsRow(record) {
  const duration = record.insuranceDuration;
  const excludedCarriers = record.excluded && record.excluded.insuranceCompany;
  const carrierFallback =
    record.insuranceCompany == null && Array.isArray(excludedCarriers) && excludedCarriers.includes("Allstate")
      ? "State Farm"
      : MISSING;
  let carrier = display(record.insuranceCompany, carrierFallback);
  if (carrier !== MISSING && duration) {
    const operators = {
      greater_than: "more than",
      greater_than_or_equal: "at least",
      less_than: "less than",
      approximate: "about",
      approximately: "about",
      exact: "",
    };
    const operator = operators[duration.operator] || "";
    const amount = duration.qualitative
      ? String(duration.qualitative).replace(/_/g, " ")
      : duration.value == null
        ? ""
        : String(duration.value);
    const singularUnit = duration.unit ? duration.unit.replace(/s$/, "").replace(/^./, (c) => c.toUpperCase()) : "";
    const unit =
      amount === "a long time"
        ? ""
        : singularUnit
          ? `${singularUnit}${amount === "1" ? "" : "s"}`
          : "";
    const phrase = [operator, amount, unit].filter(Boolean).join(" ");
    if (phrase) carrier = `${carrier} (for ${phrase})`;
  }

  const cells = [
    display(record.phone),
    display(record.name),
    formatDob(record.dateOfBirth),
    MISSING,
    MISSING,
    display(record.email),
    display(record.vehicleCount),
    display((record.vehicles || []).join(" / ")),
    display(record.address),
    carrier,
  ];
  return cells.map((value) => String(value).replace(/[\t\r\n]+/g, " ").trim()).join("\t");
}

// Pipe table for the console.
function reportTable(rows) {
  const cell = (value) => String(value).replace(/[\r\n]+/g, " ").replace(/\|/g, "\\|");
  const widths = COLUMNS.map((column) => Math.max(column.length, ...rows.map((row) => cell(row[column]).length)));
  const line = (cells) => cells.map((value, index) => cell(value).padEnd(widths[index])).join(" | ");
  return [line(COLUMNS), widths.map((width) => "-".repeat(width)).join("-|-"), ...rows.map((row) => line(COLUMNS.map((key) => row[key])))].join("\n");
}

// A second, wider audit layout: every parsed field, spelled out.
const SCOPE_MAIN = [
  ["Parsed Phone", (r) => display(r.phone)],
  ["Parsed Name", (r) => display(r.name)],
  ["Parsed DOB", (r) => formatDob(r.dateOfBirth)],
  ["Parsed Spouse Name", (r) => display(r.spouseName)],
  ["Parsed Spouse DOB", (r) => formatDob(r.spouseDob)],
  ["Parsed Email", (r) => display(r.email)],
  ["Parsed No. of Cars", (r) => display(r.vehicleCount)],
  ["Parsed Year Make / Model", (r) => display(vehiclesLabel(r))],
  ["Parsed Address", (r) => display(r.address)],
  ["Parsed Current Carrier", (r) => display(r.insuranceCompany)],
];

const SCOPE_ALL = [
  ...SCOPE_MAIN,
  ["Parsed ZIP", (r) => display(r.zip)],
  ["Parsed All Phones", (r) => display((r.phones || []).join("; "))],
  ["Parsed Vehicle Category", (r) => display(r.vehicleCategory)],
  ["Parsed Insurance Duration", (r) => display(durationLabel(r.insuranceDuration))],
  ["Parsed Homeowner", (r) => display(r.homeOwner)],
  ["Parsed Home Type", (r) => display(r.homeType)],
  ["Parsed Age", (r) => display(r.age)],
  ["Parsed Status", (r) => display(r.status)],
  ["Parsed Unknown Text", (r) => display((r.unknown || []).map((u) => u.text).join("; "))],
  ["Parsed Conflicts", (r) => display((r.conflicts || []).map((c) => `${c.field}: ${c.reason}`).join("; "))],
  ["Parsed Excluded", (r) =>
    display(
      Object.entries(r.excluded || {})
        .map(([field, values]) => `${field}: ${values.join("/")}`)
        .join("; ")
    )],
];

function fieldsFor(scope) {
  return scope === "main" ? SCOPE_MAIN : SCOPE_ALL;
}

function fieldsRow(record, scope, meta = {}) {
  const row = {};
  if (meta.row != null) row.Row = meta.row;
  if (meta.source) row["Source File"] = meta.source;
  for (const [label, get] of fieldsFor(scope)) row[label] = get(record);
  return row;
}

function toCsv(columns, rows) {
  const cell = (value) => {
    const text = value == null ? "" : String(value);
    return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
  };
  return [columns.join(","), ...rows.map((row) => columns.map((column) => cell(row[column])).join(","))].join("\n");
}

module.exports = {
  COLUMNS,
  MISSING,
  CARRIER_FALLBACK,
  display,
  formatDob,
  durationLabel,
  vehiclesLabel,
  reportRow,
  googleSheetsRow,
  reportTable,
  fieldsFor,
  fieldsRow,
  toCsv,
};

}
};
const cache = {};
function __load(id) {
  if (cache[id]) return cache[id].exports;
  if (!modules[id]) throw new Error("Missing bundled module: " + id);
  const module = { exports: {} };
  cache[id] = module;
  modules[id](module, module.exports, __load);
  return module.exports;
}
globalThis.LeadRowClassifier = __load("extension/classifier-entry.js");
})();
