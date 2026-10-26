(() => {
  var __defProp = Object.defineProperty;
  var __export = (target, all4) => {
    for (var name in all4)
      __defProp(target, name, { get: all4[name], enumerable: true });
  };

  // src/text.js
  var NOTE_LINE = /^\s*(?:CB|call\s*back|callback|follow[\s-]*up|f\/u|left\s+(?:a\s+)?(?:message|vm|voicemail)|no\s+answer|lvm)\b.*$/i;
  var TRAILING_NOTE = /\s+(?:\bCB\b|call\s*back|callback|follow[\s-]*up|f\/u|left\s+(?:a\s+)?(?:message|vm|voicemail)|no\s+answer|\blvm\b)(?:\s|$).*$/i;
  var MAX_INPUT_LENGTH = 1e5;
  function normalize(input) {
    let text = input == null ? "" : String(input);
    if (text.length > MAX_INPUT_LENGTH) text = text.slice(0, MAX_INPUT_LENGTH);
    return text.normalize("NFKC").replace(/[\u00a0\u202f\u2007\u2009\u200a\u200b\ufeff]/g, " ").replace(/[\u2018\u2019\u201a\u201b\u2032]/g, "'").replace(/[\u201c\u201d\u201e\u201f]/g, '"').replace(/[\u2010\u2011\u2012\u2013\u2014\u2015\u2212]/g, "-").replace(/\r\n?/g, "\n").replace(/\t/g, " ").replace(/[^\S\n]+/g, " ").replace(/ *\n */g, "\n").replace(/\n{2,}/g, "\n").trim();
  }
  function cleanLeadText(input) {
    return normalize(input).split("\n").filter((line) => !NOTE_LINE.test(line)).map(
      (line) => line.replace(TRAILING_NOTE, "").replace(/^\s*name\s+(?:might|may|could)\s+be\s*[:=-]?\s*/i, "Name: ").trim()
    ).filter(Boolean).join("\n");
  }
  var TOKEN_RE = /[A-Za-z0-9]+(?:'[A-Za-z]+)?|[^\sA-Za-z0-9]/g;
  function tokenize(text) {
    const tokens = [];
    let line = 0;
    let lastEnd = 0;
    TOKEN_RE.lastIndex = 0;
    let m3;
    while ((m3 = TOKEN_RE.exec(text)) !== null) {
      for (let i3 = lastEnd; i3 < m3.index; i3 += 1) if (text[i3] === "\n") line += 1;
      lastEnd = m3.index + m3[0].length;
      const raw = m3[0];
      tokens.push({
        i: tokens.length,
        text: raw,
        lower: raw.toLowerCase(),
        start: m3.index,
        end: m3.index + raw.length,
        line,
        word: /^[A-Za-z0-9]/.test(raw),
        alpha: /^[A-Za-z]/.test(raw),
        num: /^\d+$/.test(raw)
      });
    }
    return tokens;
  }
  function lines(text) {
    const out3 = [];
    let offset2 = 0;
    for (const raw of text.split("\n")) {
      out3.push({ index: out3.length, text: raw, start: offset2, end: offset2 + raw.length });
      offset2 += raw.length + 1;
    }
    return out3;
  }
  function overlaps(a, b2) {
    return a.start < b2.end && b2.start < a.end;
  }
  function hitsAny(span, list4) {
    return list4.some((s2) => overlaps(span, s2));
  }
  function titleCase(text) {
    return String(text).split(/(\s+|-)/).map((piece) => {
      if (!/[A-Za-z]/.test(piece)) return piece;
      const letters = piece.replace(/[^A-Za-z]/g, "");
      const allUpper = letters === letters.toUpperCase();
      const allLower = letters === letters.toLowerCase();
      if (!allUpper && !allLower) return piece;
      const lower = piece.toLowerCase();
      return lower.replace(/(^|')([a-z])/g, (_m, p4, c) => p4 + c.toUpperCase());
    }).join("");
  }
  function cleanValue(text) {
    return String(text).replace(/\s*\n\s*/g, ", ").replace(/\s+/g, " ").replace(/\s+,/g, ",").replace(/,{2,}/g, ",").replace(/^[\s,;:\-|]+/, "").replace(/[\s,;:\-|(]+$/, "").trim();
  }

  // src/data/vocab.js
  var FIELD_WORDS = new Set(
    `phone ph cell cellphone mobile tel telephone number num dob born birthday birthdate bday email e-mail mail
  insurance insured ins insurer carrier carriers policy coverage covered premium vehicle vehicles vehical vehicals
  car cars auto autos truck trucks suv suvs drivers driver license licence owns own owned owner owners homeowner
  homeowners rent rents renter renting rental tenant lease leased years yrs yr year months month mos mo weeks days
  old age spouse wife husband married single divorced widowed kids children child son daughter call called calling
  callback cb wants want needs need quote quotes interested said says asked currently current previous previously
  thanks thank please tomorrow today yesterday morning afternoon evening tonight am pm accident accidents ticket
  tickets claim claims sr22 dui name zip zipcode notes note comments comment paid paying pays monthly bill
  married lives living live resides moved moving`.match(/[a-z0-9-]+/g)
  );
  var COMMON_WORDS = new Set(
    `a an the and or but nor so for of in on at to from by with without about above after again against all also
  am any are as be because been before being below between both can could did do does doing done down during each
  few further get got had has have having he her here hers him his how i if into is it its just me more most my no
  not now off once only other our out over own same she should some such than that their them then there these they
  this those through too under until up very was we were what when where which while who whom why will would you
  your yes yeah ok okay none na n/a unknown idk maybe sure good bad new used looking look shopping shop better
  cheaper cheap price rate rates lower high low wants send sent text texted email emailed spoke talk talked
  told tell left message voicemail busy hung hangup hang answer answered available info information details
  home house apartment condo mobile townhouse duplex property address street city state zip county country usa
  customer client lead prospect agent office work job employer employed retired disabled student military
  male female mr mrs ms miss dr sir madam`.match(/[a-z0-9/]+/g)
  );
  var LABELS = [
    ["address", ["street address", "home address", "mailing address", "property address", "physical address", "garaging address", "address", "addres", "adress", "adres", "addr", "add", "addy", "lives at", "living at", "live at", "resides at", "residing at", "located at", "location", "residence", "street"]],
    ["name", ["full name", "customer name", "client name", "insured name", "contact name", "lead name", "first and last name", "policy holder", "policyholder", "name", "customer", "client", "insured", "contact"]],
    ["phone", ["phone number", "mobile number", "cell number", "contact number", "best number", "callback number", "phone", "mobile", "cell", "telephone", "tel", "ph", "number", "#"]],
    ["email", ["email address", "e-mail address", "email", "e-mail", "e mail", "mail"]],
    ["dob", ["date of birth", "birth date", "birthdate", "birthday", "d.o.b", "d o b", "dob", "born on", "born", "bday"]],
    ["spouse", ["spouse name", "spouses name", "spouse's name", "wife name", "husband name", "wife's name", "husband's name", "spouse dob", "wife dob", "husband dob", "spouse", "wife", "husband", "partner"]],
    ["carrier", ["current insurance company", "current insurance carrier", "insurance company", "insurance carrier", "insurance provider", "current insurance", "current carrier", "current provider", "current company", "prior carrier", "previous carrier", "insurer", "carrier", "insurance", "ins co", "ins", "provider", "currently with", "currently insured with", "insured with", "insured by", "insured through", "covered by", "covered with", "coverage with", "policy with"]],
    ["vehicles", ["vehicles", "vehicle", "vehical", "cars", "car", "autos", "auto", "year make model", "ymm", "trucks", "truck"]],
    ["zip", ["zip code", "zipcode", "postal code", "zip"]]
  ];

  // src/labels.js
  var PHRASE_OK = /\s/;
  var STRONG = /* @__PURE__ */ new Set([
    "address",
    "addres",
    "adress",
    "adres",
    "addr",
    "name",
    "phone",
    "email",
    "e-mail",
    "dob",
    "insurance",
    "carrier",
    "insurer",
    "zip",
    "zipcode",
    "spouse",
    "wife",
    "husband",
    "vehicles",
    "vehicle",
    "vehical",
    "cars",
    "birthday",
    "birthdate",
    "telephone",
    "mobile",
    "cell",
    "location",
    "residence",
    "customer",
    "client"
  ]);
  var INLINE = /* @__PURE__ */ new Set([
    "lives at",
    "living at",
    "live at",
    "resides at",
    "residing at",
    "located at",
    "insured with",
    "insured by",
    "insured through",
    "currently with",
    "currently insured with",
    "covered by",
    "covered with",
    "coverage with",
    "policy with",
    "born on"
  ]);
  var ENTRIES = LABELS.flatMap(
    ([field, phrases]) => phrases.map((phrase) => ({
      field,
      phrase,
      re: new RegExp(
        `(^|[^A-Za-z0-9])(${phrase.replace(/[.*+?^${}()|[\]\\]/g, "\\$&").replace(/\s+/g, "\\s*")})(?=$|[^A-Za-z0-9'])`,
        "gi"
      )
    }))
  ).sort((a, b2) => b2.phrase.length - a.phrase.length);
  function findLabels(lines2) {
    const labels = [];
    for (const line of lines2) {
      const used = [];
      const found = [];
      for (const entry of ENTRIES) {
        entry.re.lastIndex = 0;
        let m3;
        while ((m3 = entry.re.exec(line.text)) !== null) {
          const start2 = m3.index + m3[1].length;
          const end2 = start2 + m3[2].length;
          if (used.some((u) => start2 < u.end && u.start < end2)) continue;
          const after2 = line.text.slice(end2);
          const sep = after2.match(/^\s*(?:[:=]+|-+(?!\d)|#(?=\s))?\s*/)[0];
          const punctuated = /[:=-]/.test(sep);
          const atLineStart = line.text.slice(0, start2).trim() === "";
          const phrase = entry.phrase.toLowerCase();
          let ok = punctuated;
          if (!ok && INLINE.has(phrase)) ok = true;
          if (!ok && atLineStart && (STRONG.has(phrase) || PHRASE_OK.test(phrase))) ok = true;
          if (!ok) continue;
          if ((phrase === "#" || phrase === "number" || phrase === "add") && !punctuated) continue;
          used.push({ start: start2, end: end2 });
          found.push({
            field: entry.field,
            phrase: m3[2],
            start: line.start + start2,
            end: line.start + end2,
            valueStart: line.start + end2 + sep.length,
            line: line.index,
            punctuated
          });
        }
      }
      found.sort((a, b2) => a.start - b2.start);
      for (let i3 = 0; i3 < found.length; i3 += 1) {
        const next = found[i3 + 1];
        found[i3].valueEnd = next ? next.start : line.end;
        if (found[i3].valueEnd < found[i3].valueStart) found[i3].valueEnd = found[i3].valueStart;
        found[i3].dangling = found[i3].valueEnd - found[i3].valueStart <= 0 || !/[A-Za-z0-9]/.test(lineSlice(line, found[i3].valueStart, found[i3].valueEnd));
      }
      labels.push(...found);
    }
    return labels;
  }
  function lineSlice(line, start2, end2) {
    return line.text.slice(start2 - line.start, end2 - line.start);
  }

  // src/extract/contact.js
  var PHONE_RE = /(?<![\d])(?:\+?1[\s.-]?)?\(?([2-9]\d{2})\)?[\s.-]?([2-9]\d{2})[\s.-]?(\d{4})(?![\d])/g;
  function findPhones(ctx) {
    const out3 = [];
    PHONE_RE.lastIndex = 0;
    let m3;
    while ((m3 = PHONE_RE.exec(ctx.text)) !== null) {
      const [raw, area, exchange, line] = m3;
      if (area[1] === "1" && area[2] === "1") continue;
      if (exchange[1] === "1" && exchange[2] === "1") continue;
      const before3 = ctx.text.slice(Math.max(0, m3.index - 1), m3.index);
      if (/\d/.test(before3)) continue;
      const start2 = m3.index;
      const end2 = m3.index + raw.length;
      const labeled = ctx.labels.some((l) => l.field === "phone" && l.line === lineOf(ctx, start2) && l.end <= start2);
      out3.push({ value: `${area}${exchange}${line}`, start: start2, end: end2, labeled });
    }
    return out3;
  }
  var EMAIL_RE = /[A-Za-z0-9._%+-]+@[A-Za-z0-9-]+(?:\.[A-Za-z0-9-]+)*\.[A-Za-z]{2,}/g;
  function findEmails(ctx) {
    const out3 = [];
    EMAIL_RE.lastIndex = 0;
    let m3;
    while ((m3 = EMAIL_RE.exec(ctx.text)) !== null) {
      out3.push({ value: m3[0].replace(/\.+$/, ""), start: m3.index, end: m3.index + m3[0].length });
    }
    return out3;
  }
  function lineOf(ctx, offset2) {
    let lo = 0;
    let hi = ctx.lines.length - 1;
    while (lo < hi) {
      const mid = lo + hi + 1 >> 1;
      if (ctx.lines[mid].start <= offset2) lo = mid;
      else hi = mid - 1;
    }
    return lo;
  }

  // src/extract/dates.js
  var MONTHS = {
    jan: 1,
    feb: 2,
    mar: 3,
    apr: 4,
    may: 5,
    jun: 6,
    jul: 7,
    aug: 8,
    sep: 9,
    sept: 9,
    oct: 10,
    nov: 11,
    dec: 12
  };
  var MONTH_RE = "jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|june?|july?|aug(?:ust)?|sep(?:t(?:ember)?)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?";
  var CURRENT_YEAR = (/* @__PURE__ */ new Date()).getFullYear();
  function monthOf(word) {
    return MONTHS[String(word).toLowerCase().slice(0, 4)] || MONTHS[String(word).toLowerCase().slice(0, 3)] || null;
  }
  function year4(y) {
    const s2 = String(y);
    if (s2.length === 4) return Number(s2);
    const n2 = Number(s2);
    return n2 > CURRENT_YEAR % 100 ? 1900 + n2 : 2e3 + n2;
  }
  function valid(y, m3, d) {
    if (!m3 || m3 < 1 || m3 > 12) return false;
    if (d == null) return true;
    return d >= 1 && d <= new Date(y, m3, 0).getDate();
  }
  var PATTERNS = [
    // March 4, 1965 / Mar 4th 1965
    { re: new RegExp(`\\b(${MONTH_RE})\\.?\\s+(\\d{1,2})(?:st|nd|rd|th)?,?\\s+(\\d{4}|'?\\d{2})\\b`, "gi"), f: (m3) => [m3[3].replace("'", ""), monthOf(m3[1]), m3[2]] },
    // 4 March 1965 / 4th of March 1965
    { re: new RegExp(`\\b(\\d{1,2})(?:st|nd|rd|th)?\\s+(?:of\\s+)?(${MONTH_RE})\\.?,?\\s+(\\d{4})\\b`, "gi"), f: (m3) => [m3[3], monthOf(m3[2]), m3[1]] },
    // 1965-03-04 / 1965/03/04
    { re: /\b(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})\b/g, f: (m3) => [m3[1], m3[2], m3[3]] },
    // 03/04/1965, 3-4-65, 3.4.1965
    { re: /\b(\d{1,2})([/.-])(\d{1,2})\2(\d{4}|\d{2})\b/g, f: (m3) => Number(m3[1]) > 12 ? [m3[4], m3[3], m3[1]] : [m3[4], m3[1], m3[3]] },
    // 03 04 1965
    { re: /\b(\d{1,2})\s(\d{1,2})\s((?:19|20)\d{2})\b/g, f: (m3) => [m3[3], m3[1], m3[2]] },
    // 03041965 (8 digits, only accepted when labelled - checked by caller)
    { re: /\b(0[1-9]|1[0-2])(0[1-9]|[12]\d|3[01])((?:19|20)\d{2})\b/g, f: (m3) => [m3[3], m3[1], m3[2]], compactOnly: true },
    // March 1965
    { re: new RegExp(`\\b(${MONTH_RE})\\.?,?\\s+(\\d{4})\\b`, "gi"), f: (m3) => [m3[2], monthOf(m3[1]), null] }
  ];
  function findDates(ctx, blocked = []) {
    const out3 = [];
    const taken = [...blocked];
    for (const pattern of PATTERNS) {
      pattern.re.lastIndex = 0;
      let m3;
      while ((m3 = pattern.re.exec(ctx.text)) !== null) {
        const start2 = m3.index;
        const end2 = start2 + m3[0].length;
        if (taken.some((s2) => start2 < s2.end && s2.start < end2)) continue;
        const [ys, ms, ds] = pattern.f(m3);
        const y = year4(ys);
        const mo = Number(ms);
        const d = ds == null ? null : Number(ds);
        if (!valid(y, mo, d)) continue;
        taken.push({ start: start2, end: end2 });
        out3.push({
          start: start2,
          end: end2,
          line: lineOf(ctx, start2),
          year: y,
          month: mo,
          day: d,
          raw: m3[0],
          twoDigitYear: String(ys).length === 2,
          compactOnly: Boolean(pattern.compactOnly)
        });
      }
    }
    return out3.sort((a, b2) => a.start - b2.start);
  }
  function formatDate(date) {
    const mm = String(date.month).padStart(2, "0");
    if (date.day == null) return `${mm}/${date.year}`;
    return `${mm}/${String(date.day).padStart(2, "0")}/${date.year}`;
  }

  // src/fuzzy.js
  function compact(text) {
    return String(text == null ? "" : text).toLowerCase().replace(/[^a-z0-9]/g, "");
  }
  function editDistance(a, b2, max3 = Infinity) {
    const la = a.length;
    const lb = b2.length;
    if (Math.abs(la - lb) > max3) return max3 + 1;
    if (!la) return lb;
    if (!lb) return la;
    let prevPrev = null;
    let prev = new Array(lb + 1);
    for (let j = 0; j <= lb; j += 1) prev[j] = j;
    for (let i3 = 1; i3 <= la; i3 += 1) {
      const cur = new Array(lb + 1);
      cur[0] = i3;
      let rowMin = i3;
      for (let j = 1; j <= lb; j += 1) {
        const cost = a[i3 - 1] === b2[j - 1] ? 0 : 1;
        let v2 = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + cost);
        if (i3 > 1 && j > 1 && a[i3 - 1] === b2[j - 2] && a[i3 - 2] === b2[j - 1]) {
          v2 = Math.min(v2, prevPrev[j - 2] + 1);
        }
        cur[j] = v2;
        if (v2 < rowMin) rowMin = v2;
      }
      if (rowMin > max3) return max3 + 1;
      prevPrev = prev;
      prev = cur;
    }
    return prev[lb];
  }
  function typoBudget(length2) {
    if (length2 <= 4) return 0;
    if (length2 <= 7) return 1;
    if (length2 <= 11) return 2;
    return 3;
  }
  function bestFuzzy(key, entries, { minLength = 5, budget } = {}) {
    if (!key || key.length < minLength) return null;
    const limit = budget ?? typoBudget(key.length);
    if (limit <= 0) return null;
    let best = null;
    for (const entry of entries) {
      const target = entry.compact;
      if (!target || target[0] !== key[0]) continue;
      if (Math.abs(target.length - key.length) > limit) continue;
      const allowed = Math.min(limit, typoBudget(target.length));
      if (allowed <= 0) continue;
      const d = editDistance(key, target, allowed);
      if (d > allowed) continue;
      if (!best || d < best.distance || d === best.distance && target.length > best.entry.compact.length) {
        best = { entry, distance: d };
      }
    }
    return best;
  }

  // src/data/states.js
  var STATES = [
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
    ["PR", "Puerto Rico"],
    ["GU", "Guam"],
    ["VI", "Virgin Islands"]
  ];
  var STATE_ABBRS = new Set(STATES.map(([abbr]) => abbr));
  var EXTRA_NAMES = {
    "tex": "TX",
    "texs": "TX",
    "calif": "CA",
    "cali": "CA",
    "fla": "FL",
    "flordia": "FL",
    "penn": "PA",
    "penna": "PA",
    "mass": "MA",
    "wash": "WA",
    "mich": "MI",
    "minn": "MN",
    "wisc": "WI",
    "ariz": "AZ",
    "colo": "CO",
    "conn": "CT",
    "okla": "OK",
    "tenn": "TN",
    "ill": "IL",
    "ind": "IN",
    "kans": "KS",
    "geogia": "GA",
    "louisana": "LA",
    "missisippi": "MS",
    "tennesee": "TN",
    "conneticut": "CT",
    "washington dc": "DC",
    "washington d c": "DC"
  };
  var STATE_NAMES = new Map(
    [
      ...STATES.map(([abbr, name]) => [name.toLowerCase(), abbr]),
      ...Object.entries(EXTRA_NAMES)
    ].sort((a, b2) => b2[0].split(" ").length - a[0].split(" ").length)
  );
  var MAX_STATE_WORDS = Math.max(...[...STATE_NAMES.keys()].map((k2) => k2.split(" ").length));

  // src/data/streets.js
  var STREET_SUFFIXES = new Set(
    `
allee alley ally aly anex annex anx arc arcade av ave aven avenu avenue avn avnue
bayou bch beach bend bg bgs blf blfs bluf bluff bluffs blvd boul boulevard boulv bnd bot bottm bottom br brdge brg
branch brk brks brnch brook brooks btm burg burgs byp bypa bypas bypass byps byu
camp canyn canyon cape cnyn causeway causwa cen cent center centers centr centre cir circ circl circle circles cirs ck
cl clb clf clfs cliff cliffs club cmn cmns cmp cnter cntr common commons cor corner corners cors course court courts
cove coves cp cpe cr crcl crcle creek cres crescent crest crk crossing crossroad crossroads crse crsent crsnt crssng
crst cswy ct ctr ctrs cts curv curve cv cvs cyn dale dam div divide dl dm dr driv drive drives drs drv dv dvd est
estate estates ests exp expr express expressway expw expy ext extension extensions extn extnsn exts fall falls ferry
field fields flat flats fld flds fls flt flts ford fords forest forg forge forges fork forks fort frd frds freeway
freewy frg frgs frk frks frry frst frt frway frwy fry ft fwy garden gardens gardn gateway gatewy gatway gdn gdns glen
glens gln glns grden grdn grdns green greens grn grns grov grove groves grv grvs gtway gtwy harb harbor harbors harbr
haven hbr hbrs heights highway highwy hill hills hiway hiwy hl hllw hls hollow hollows holw holws hrbor ht hts hvn
hway hwy inlet inlt is island islands isle isles islnd islnds iss jct jction jctn jctns jcts junction junctions
junctn juncton key keys knl knls knol knoll knolls ky kys lake lakes land landing lane lck lcks ldg ldge lf lgt lgts
light lights lk lks ln lndg lndng loaf lock locks lodg lodge loop loops mall manor manors mdw mdws meadow meadows
medows mews mill mills missn mission ml mls mnr mnrs mnt mntain mntn mntns motorway mount mountain mountains mountin
msn mssn mt mtin mtn mtns mtwy nck neck opas orch orchard orchrd oval ovl overpass park parks parkway parkways parkwy
pass passage path paths pike pikes pine pines pkway pkwy pkwys pky pl place plain plains plaza pln plns plz plza
pne pnes point points port ports pr prairie prk prr prt prts psge pt pts rad radial radiel radl ramp ranch ranches
rapid rapids rd rdg rdge rdgs rds rest ridge ridges riv river rivr rnch rnchs road roads route row rpd rpds rst rte
rue run rvr shl shls shoal shoals shoar shoars shore shores shr shrs skwy skyway smt spg spgs spng spngs spring springs
sprng sprngs spur spurs sq sqr sqre sqrs sqs squ square squares st sta station statn stn str stra strav straven
stravenue stravn stream streme street streets strm strt strvn strvnue sts sumit sumitt summit ter terr terrace
throughway tpke trace traces track tracks trafficway trail trailer trails trak trce trfy trk trks trl trlr trlrs trls
trnpk trwy tunel tunl tunls tunnel tunnels tunnl turnpike turnpk un underpass union unions uns upas valley valleys
vally vdct via viadct viaduct view views vill villag village villages ville villg villiage vis vist vista vl vlg vlgs
vlly vly vlys vst vsta vw vws walk walks wall way ways well wells wl wls wy xing xrd xrds
`.match(/[a-z]+/g)
  );
  var WEAK_SUFFIXES = /* @__PURE__ */ new Set([
    "branch",
    "camp",
    "cape",
    "center",
    "club",
    "common",
    "course",
    "dale",
    "fall",
    "field",
    "ford",
    "forest",
    "fort",
    "garden",
    "green",
    "haven",
    "hill",
    "island",
    "key",
    "lake",
    "land",
    "light",
    "mall",
    "mill",
    "mount",
    "park",
    "pass",
    "pine",
    "point",
    "port",
    "rest",
    "river",
    "run",
    "spring",
    "station",
    "union",
    "view",
    "village",
    "well",
    "wall",
    "ranch",
    "estate",
    "estates",
    "mission",
    "plaza",
    "row",
    "track",
    "trace",
    "way",
    "walk",
    "brook",
    "brooks"
  ]);
  var DIRECTIONALS = /* @__PURE__ */ new Set([
    "n",
    "s",
    "e",
    "w",
    "ne",
    "nw",
    "se",
    "sw",
    "north",
    "south",
    "east",
    "west",
    "northeast",
    "northwest",
    "southeast",
    "southwest"
  ]);
  var UNIT_WORDS = /* @__PURE__ */ new Set([
    "apt",
    "apartment",
    "appt",
    "unit",
    "ste",
    "suite",
    "lot",
    "bldg",
    "building",
    "fl",
    "floor",
    "rm",
    "room",
    "spc",
    "space",
    "trlr",
    "trailer",
    "dept",
    "ph",
    "penthouse",
    "no",
    "box",
    "slip",
    "pier",
    "hngr",
    "hangar"
  ]);
  var ROAD_TYPES = /* @__PURE__ */ new Set([
    "highway",
    "hwy",
    "hiway",
    "county",
    "cr",
    "fm",
    "rm",
    "route",
    "rte",
    "rt",
    "sh",
    "us",
    "interstate",
    "ih",
    "i",
    "spur",
    "loop",
    "pr",
    "state",
    "farm",
    "ranch",
    "rural",
    "rr",
    "hc",
    "box",
    "private",
    "road",
    "rd"
  ]);

  // src/data/carriers.js
  var CARRIERS = [
    ["State Farm", ["state farm", "statefarm", "state farm insurance", "state farms", "st farm", "state fram", "sate farm", "stat farm", "state frm", "stae farm", "statefarm ins", "state farm ins", "sf insurance"]],
    ["Allstate", ["allstate", "all state", "alstate", "allstates", "all states", "allsate", "allstae", "allstate insurance", "all state insurance"]],
    ["Progressive", ["progressive", "progresive", "progressiv", "progessive", "progrssive", "progressive insurance", "prog insurance", "progressive ins"]],
    ["GEICO", ["geico", "gieco", "geiko", "gecio", "geico insurance", "g e i c o", "gico", "geicco"]],
    ["USAA", ["usaa", "u s a a", "usa a", "usaa insurance"]],
    ["Liberty Mutual", ["liberty mutual", "libertymutual", "liberty mutal", "libery mutual", "liberty mutual insurance", "liberty ins"]],
    ["Farmers", ["farmers", "farmers insurance", "farmers ins", "farmer insurance", "farmers group", "farmer's insurance"]],
    ["Nationwide", ["nationwide", "nation wide", "nationwide insurance", "natiowide", "nationwid"]],
    ["Travelers", ["travelers", "travellers", "travelers insurance", "the travelers", "travelers ins"]],
    ["American Family", ["american family", "amfam", "am fam", "american family insurance", "american familly"]],
    ["Erie", ["erie insurance", "erie ins", "erie insurance group"]],
    ["Erie", ["erie"], { ambiguous: true }],
    ["Auto-Owners", ["auto owners", "autoowners", "auto-owners", "auto owners insurance"]],
    ["Safeco", ["safeco", "safe co", "safeco insurance"]],
    ["Mercury", ["mercury insurance", "mercury ins"]],
    ["Mercury", ["mercury"], { ambiguous: true }],
    ["The Hartford", ["the hartford", "hartford insurance", "hartford ins"]],
    ["The Hartford", ["hartford"], { ambiguous: true }],
    ["AAA", ["aaa", "triple a", "aaa insurance", "csaa", "aaa auto club", "acsc"]],
    ["Auto Club", ["auto club", "autoclub", "auto club insurance", "interinsurance exchange of the automobile club"]],
    ["Amica", ["amica", "amica mutual", "amica insurance"]],
    ["Chubb", ["chubb"]],
    ["Kemper", ["kemper", "kemper auto", "kemper insurance"]],
    ["MetLife", ["metlife", "met life", "metlife auto"]],
    ["Shelter", ["shelter insurance", "shelter ins"]],
    ["Shelter", ["shelter"], { ambiguous: true }],
    ["Esurance", ["esurance", "e surance"]],
    ["The General", ["the general", "general insurance", "the general insurance"]],
    ["The General", ["general"], { ambiguous: true }],
    ["Root", ["root insurance", "root ins"]],
    ["Root", ["root"], { ambiguous: true }],
    ["Lemonade", ["lemonade insurance"]],
    ["Lemonade", ["lemonade"], { ambiguous: true }],
    ["Clearcover", ["clearcover", "clear cover"]],
    ["Dairyland", ["dairyland", "dairy land", "dairyland insurance"]],
    ["Infinity", ["infinity insurance", "infinity auto", "infinity ins"]],
    ["Infinity", ["infinity"], { ambiguous: true }],
    ["Bristol West", ["bristol west", "bristolwest"]],
    ["National General", ["national general", "nationalgeneral", "nationl general", "national genral", "nat general", "natgen", "nat gen", "national general insurance"]],
    ["Direct Auto", ["direct auto", "direct general", "directgeneral", "direct auto insurance"]],
    ["Elephant", ["elephant insurance", "elephant auto"]],
    ["Elephant", ["elephant"], { ambiguous: true }],
    ["GAINSCO", ["gainsco"]],
    ["Hallmark", ["hallmark insurance", "hallmark county mutual"]],
    ["Hallmark", ["hallmark"], { ambiguous: true }],
    ["Sentry", ["sentry insurance"]],
    ["Sentry", ["sentry"], { ambiguous: true }],
    ["Plymouth Rock", ["plymouth rock", "plymouthrock"]],
    ["NJM", ["njm", "new jersey manufacturers"]],
    ["Grange", ["grange insurance", "grange mutual"]],
    ["Westfield", ["westfield insurance"]],
    ["Cincinnati Insurance", ["cincinnati insurance", "cincinnati financial"]],
    ["COUNTRY Financial", ["country financial", "country insurance", "country companies"]],
    ["Farm Bureau", ["farm bureau", "farmbureau", "farm bureau insurance", "farm bureau financial"]],
    ["Texas Farm Bureau", ["texas farm bureau", "tx farm bureau", "txfarmbureau", "tfb"]],
    ["Southern Farm Bureau", ["southern farm bureau", "southernfarmbureau"]],
    ["Farm Bureau County Mutual", ["farm bureau county mutual", "farmbureaucountymutual"]],
    ["Alfa", ["alfa insurance", "alfa mutual"]],
    ["Wawanesa", ["wawanesa"]],
    ["Arbella", ["arbella"]],
    ["The Hanover", ["the hanover", "hanover insurance"]],
    ["MAPFRE", ["mapfre"]],
    ["Commerce Insurance", ["commerce insurance"]],
    ["Safety Insurance", ["safety insurance"]],
    ["Main Street America", ["main street america", "msa insurance"]],
    ["Pekin", ["pekin insurance"]],
    ["Hastings Mutual", ["hastings mutual"]],
    ["Frankenmuth", ["frankenmuth"]],
    ["Donegal", ["donegal", "donegal insurance"]],
    ["Penn National", ["penn national"]],
    ["Encompass", ["encompass", "encompass insurance"]],
    ["Foremost", ["foremost", "foremost insurance"]],
    ["21st Century", ["21st century", "21stcentury", "twenty first century"]],
    ["Freeway Insurance", ["freeway insurance"]],
    ["AssuranceAmerica", ["assurance america", "assuranceamerica"]],
    ["Acceptance", ["acceptance insurance", "acceptance auto"]],
    ["First Acceptance", ["first acceptance", "firstacceptance"]],
    ["Fred Loya", ["fred loya", "loya", "loya insurance", "fredloya"]],
    ["Affirmative", ["affirmative", "affirmative insurance"]],
    ["Titan", ["titan insurance", "titan auto"]],
    ["Victoria", ["victoria insurance"]],
    ["Windhaven", ["windhaven"]],
    ["Good2Go", ["good2go", "good 2 go", "good to go insurance"]],
    ["Aspire", ["aspire insurance", "aspire general"]],
    ["Bluefire", ["bluefire", "blue fire insurance"]],
    ["Falcon", ["falcon insurance"]],
    ["Sun Coast", ["sun coast insurance", "suncoast insurance"]],
    ["Ocean Harbor", ["ocean harbor"]],
    ["Security National", ["security national", "securitynational"]],
    ["Unitrin", ["unitrin", "unitrin county mutual"]],
    ["Horace Mann", ["horace mann", "horacemann"]],
    ["Germania", ["germania", "germania select", "germaniaselect", "germania insurance"]],
    ["Hochheim Prairie", ["hochheim prairie", "hochheim", "hochheimprairiecasualty"]],
    ["Branch", ["branch insurance"]],
    ["Toggle", ["toggle insurance"]],
    ["Electric Insurance", ["electric insurance"]],
    ["Mid-Century", ["mid century", "midcentury", "mid-century insurance"]],
    ["Integon", ["integon"]],
    ["Hagerty", ["hagerty"]],
    ["Grundy", ["grundy insurance"]],
    ["Openly", ["openly"]],
    ["Universal Property", ["universal property"]],
    ["Citizens", ["citizens insurance", "citizens property"]],
    ["Tower Hill", ["tower hill"]],
    ["Heritage", ["heritage insurance"]],
    ["Homesite", ["homesite"]],
    ["Assurant", ["assurant"]],
    ["American Modern", ["american modern"]],
    ["Stillwater", ["stillwater insurance"]],
    ["CURE", ["cure insurance", "cure auto"]],
    ["Nodak", ["nodak", "nodak insurance"]],
    ["PURE", ["pure insurance"]],
    ["Bamboo", ["bamboo insurance"]],
    ["Allied", ["allied insurance"]],
    ["Old Republic", ["old republic"]],
    ["Midvale", ["midvale", "midvale home"]],
    ["Answer Financial", ["answer financial"]],
    ["Hippo", ["hippo insurance"]],
    ["Kin", ["kin insurance"]],
    ["Metromile", ["metromile", "metro mile"]],
    ["Mile Auto", ["mile auto"]],
    ["Noblr", ["noblr"]],
    ["Clearcover", ["clear cover insurance"]],
    ["Gainsco", ["gainsco auto"]],
    ["AIG", ["aig"]],
    ["Ameriprise", ["ameriprise", "ameriprise auto", "ids property casualty", "idspropertycasualty"]],
    ["American National", ["american national", "americannational", "anpac"]],
    ["America First", ["america first", "americafirst"]],
    ["American Century", ["american century", "americancentury"]],
    ["Armed Forces", ["armed forces insurance", "armedforces"]],
    ["Audubon", ["audubon insurance"]],
    ["Central Mutual", ["central mutual", "centralmutual"]],
    ["Charter Oak", ["charter oak", "charteroakfire"]],
    ["Colonial County Mutual", ["colonial county mutual", "colonialcountymutual"]],
    ["Consumers County Mutual", ["consumers county mutual", "consumerscountmutual"]],
    ["Home State County Mutual", ["home state county mutual", "homestatecountymutual"]],
    ["Imperial Fire and Casualty", ["imperial fire", "imperialfireandcasualty"]],
    ["MGA", ["mga insurance"]],
    ["Oak Brook County Mutual", ["oak brook county mutual", "oakbrookcountymutual"]],
    ["Old American County Mutual", ["old american county mutual", "oldamericancountymutual"]],
    ["Permanent General", ["permanent general", "permanentgeneral"]],
    ["Republic", ["republic companies", "republiccompanies", "republic insurance"]],
    ["Southern County Mutual", ["southern county mutual", "southerncountymutual"]],
    ["Trinity Universal", ["trinity universal", "trinityuniversal"]],
    ["Twin City Fire", ["twin city fire", "twincityfire"]],
    ["Ohio Mutual", ["ohio mutual", "ohio mutual insurance"]],
    ["Agricultural Workers Mutual", ["agricultural workers mutual", "agriculturalworkersmutual"]],
    ["AAA Texas County Mutual", ["aaa texas county mutual", "aaatexascountymutual"]],
    ["Phoenix", ["phoenix insurance"]],
    ["Response", ["response insurance"]],
    ["Teachers", ["teachers insurance"]],
    ["Teachers", ["teachers"], { ambiguous: true }],
    ["Germania", ["germania mutual"]]
  ];
  var CARRIER_FUZZY_STOP = /* @__PURE__ */ new Set([
    "states",
    "estate",
    "estates",
    "stated",
    "statement",
    "farmer",
    "farm",
    "farms",
    "general",
    "generally",
    "progress",
    "nation",
    "nations",
    "national",
    "travel",
    "traveled",
    "traveling",
    "allot",
    "mercy",
    "liberty",
    "shelters",
    "sentence",
    "century",
    "america",
    "american",
    "family",
    "families",
    "mutual",
    "insured",
    "insurance",
    "insure",
    "erica",
    "eric",
    "gecko",
    "germany",
    "routes",
    "rooted",
    "falcons",
    "hallmarks",
    "victory",
    "titans",
    "united",
    "unity",
    "infinite",
    "direct",
    "directly",
    "auto",
    "autos",
    "owners",
    "owner",
    "kemp",
    "amanda",
    "monica",
    "chubby",
    "safety",
    "secure",
    "security",
    "allstar",
    "allen",
    "stateroom",
    "statefair",
    "lemon",
    "lemons",
    "farmhouse",
    "country",
    "county",
    "counties"
  ]);

  // src/data/vehicles.js
  var MAKES = [
    ["Acura", ["acura", "accura"]],
    ["Alfa Romeo", ["alfa romeo", "alfaromeo", "alfa"]],
    ["Aston Martin", ["aston martin"]],
    ["Audi", ["audi"]],
    ["Bentley", ["bentley"]],
    ["BMW", ["bmw", "beemer", "bimmer"]],
    ["Buick", ["buick", "buik"]],
    ["Cadillac", ["cadillac", "caddy", "caddilac", "cadilac"]],
    ["Chevrolet", ["chevrolet", "chevy", "chev", "chevorlet", "cheverolet", "chevrollet", "chevvy", "chevrolette"]],
    ["Chrysler", ["chrysler", "crysler", "chrystler"]],
    ["Dodge", ["dodge"]],
    ["Ferrari", ["ferrari"]],
    ["Fiat", ["fiat"]],
    ["Ford", ["ford"]],
    ["Genesis", ["genesis"], { ambiguous: true }],
    ["GMC", ["gmc"]],
    ["Harley-Davidson", ["harley davidson", "harley"]],
    ["Honda", ["honda", "hondaa"]],
    ["Hummer", ["hummer"]],
    ["Hyundai", ["hyundai", "hyundia", "hundai", "hyundae", "huyndai"]],
    ["Infiniti", ["infiniti"]],
    ["Infiniti", ["infinity"], { ambiguous: true }],
    ["International", ["international"], { ambiguous: true }],
    ["Isuzu", ["isuzu"]],
    ["Jaguar", ["jaguar", "jag"]],
    ["Jeep", ["jeep"]],
    ["Kawasaki", ["kawasaki"]],
    ["Kenworth", ["kenworth"]],
    ["Kia", ["kia"]],
    ["Lamborghini", ["lamborghini"]],
    ["Land Rover", ["land rover", "landrover", "range rover"]],
    ["Lexus", ["lexus", "lexis"]],
    ["Lincoln", ["lincoln", "lincon"], { ambiguous: true }],
    ["Lucid", ["lucid"], { ambiguous: true }],
    ["Mack", ["mack"], { ambiguous: true }],
    ["Maserati", ["maserati"]],
    ["Mazda", ["mazda", "mazdaa"]],
    ["Mercedes-Benz", ["mercedes benz", "mercedes", "benz", "merc", "mercedez", "mercades"]],
    ["Mercury", ["mercury"], { ambiguous: true }],
    ["Mini", ["mini cooper", "mini"], { ambiguous: true }],
    ["Mitsubishi", ["mitsubishi", "mitsubishi", "mitsubushi"]],
    ["Nissan", ["nissan", "nisan", "nissian"]],
    ["Oldsmobile", ["oldsmobile", "olds"]],
    ["Peterbilt", ["peterbilt"]],
    ["Plymouth", ["plymouth"], { ambiguous: true }],
    ["Polestar", ["polestar"]],
    ["Pontiac", ["pontiac"]],
    ["Porsche", ["porsche", "porche"]],
    ["Ram", ["ram"], { ambiguous: true }],
    ["Rivian", ["rivian"]],
    ["Saab", ["saab"]],
    ["Saturn", ["saturn"], { ambiguous: true }],
    ["Scion", ["scion"]],
    ["Smart", ["smart"], { ambiguous: true }],
    ["Subaru", ["subaru", "subru", "subura"]],
    ["Suzuki", ["suzuki"]],
    ["Tesla", ["tesla"]],
    ["Toyota", ["toyota", "toyta", "toyata", "toyoda", "totota"]],
    ["Volkswagen", ["volkswagen", "volkswagon", "vw", "volks"]],
    ["Volvo", ["volvo"]],
    ["Yamaha", ["yamaha"]]
  ];
  var MODELS = {
    Acura: ["ILX", "MDX", "RDX", "TLX", "TL", "TSX", "RSX", "Integra", "ZDX", "NSX", "RL"],
    "Alfa Romeo": ["Giulia", "Stelvio", "Tonale"],
    Audi: ["A3", "A4", "A5", "A6", "A7", "A8", "Q3", "Q5", "Q7", "Q8", "e-tron", "TT", "S4", "S5", "RS5"],
    BMW: ["320i", "328i", "330i", "335i", "340i", "528i", "530i", "535i", "540i", "X1", "X2", "X3", "X4", "X5", "X6", "X7", "M3", "M4", "M5", "i3", "i4", "iX", "Z4", "3 Series", "5 Series", "7 Series"],
    Buick: ["Enclave", "Encore", "Envision", "LaCrosse", "Regal", "Verano", "Lucerne", "LeSabre", "Century", "Rendezvous"],
    Cadillac: ["CT4", "CT5", "CT6", "CTS", "ATS", "Escalade", "XT4", "XT5", "XT6", "SRX", "DTS", "Deville", "Lyriq", "XTS"],
    Chevrolet: ["Silverado", "Equinox", "Malibu", "Tahoe", "Traverse", "Camaro", "Colorado", "Suburban", "Cruze", "Impala", "Blazer", "Trax", "Trailblazer", "Spark", "Sonic", "Volt", "Bolt", "Corvette", "Express", "Avalanche", "Cobalt", "HHR", "Monte Carlo", "Uplander", "S10", "Aveo"],
    Chrysler: ["300", "Pacifica", "Voyager", "Town and Country", "Town & Country", "200", "Sebring", "PT Cruiser"],
    Dodge: ["Charger", "Challenger", "Durango", "Journey", "Grand Caravan", "Caravan", "Dart", "Avenger", "Nitro", "Dakota", "Neon", "Caliber", "Hornet", "Magnum", "Stratus", "Intrepid"],
    Fiat: ["500", "500X", "500L"],
    Ford: ["F-150", "F-250", "F-350", "Escape", "Explorer", "Mustang", "Ranger", "Edge", "Bronco", "Bronco Sport", "Fusion", "Focus", "Expedition", "Taurus", "Fiesta", "Flex", "EcoSport", "Maverick", "Transit", "Econoline", "E-350", "Five Hundred", "Freestyle", "Crown Victoria", "Excursion", "Mach-E"],
    Genesis: ["G70", "G80", "G90", "GV70", "GV80"],
    GMC: ["Sierra", "Terrain", "Yukon", "Acadia", "Canyon", "Envoy", "Savana", "Jimmy", "Hummer EV"],
    Honda: ["Civic", "Accord", "CR-V", "Pilot", "Odyssey", "HR-V", "Fit", "Ridgeline", "Passport", "Element", "Insight", "Crosstour", "Prologue", "CR-Z"],
    Hummer: ["H1", "H2", "H3"],
    Hyundai: ["Elantra", "Sonata", "Tucson", "Santa Fe", "Kona", "Palisade", "Accent", "Venue", "Veloster", "Ioniq", "Azera", "Genesis", "Santa Cruz", "Entourage"],
    Infiniti: ["Q50", "Q60", "QX50", "QX60", "QX80", "G35", "G37", "FX35", "M35", "QX56", "QX4", "I35", "JX35"],
    Isuzu: ["Rodeo", "Trooper", "Ascender", "NPR"],
    Jaguar: ["XF", "XE", "XJ", "F-Pace", "E-Pace", "F-Type", "X-Type", "S-Type"],
    Jeep: ["Wrangler", "Grand Cherokee", "Cherokee", "Compass", "Gladiator", "Renegade", "Liberty", "Patriot", "Commander", "Wagoneer", "Grand Wagoneer"],
    Kia: ["Forte", "Optima", "Sorento", "Sportage", "Telluride", "Soul", "Rio", "K5", "Seltos", "Carnival", "Sedona", "Niro", "Stinger", "EV6", "Cadenza"],
    "Land Rover": ["Range Rover", "Range Rover Sport", "Range Rover Evoque", "Discovery", "Defender", "LR4", "LR3"],
    Lexus: ["RX", "ES", "NX", "GX", "IS", "UX", "LX", "GS", "RX350", "ES350", "IS250", "IS350", "GX460", "NX300", "RX330", "ES330"],
    Lincoln: ["MKZ", "MKX", "MKC", "MKS", "MKT", "Navigator", "Aviator", "Corsair", "Nautilus", "Town Car", "Continental", "Zephyr"],
    Mazda: ["Mazda3", "Mazda6", "Mazda5", "CX-3", "CX-5", "CX-7", "CX-9", "CX-30", "CX-50", "CX-90", "MX-5", "Miata", "Tribute", "Protege", "RX-8"],
    "Mercedes-Benz": ["C-Class", "E-Class", "S-Class", "GLC", "GLE", "GLA", "GLS", "GLK", "GL", "ML", "CLA", "CLS", "C300", "C250", "E350", "E320", "ML350", "GL450", "Sprinter", "G-Class"],
    Mercury: ["Milan", "Grand Marquis", "Mariner", "Mountaineer", "Sable", "Montego", "Cougar"],
    Mini: ["Cooper", "Countryman", "Clubman"],
    Mitsubishi: ["Outlander", "Outlander Sport", "Lancer", "Eclipse", "Eclipse Cross", "Mirage", "Galant", "Endeavor", "Montero"],
    Nissan: ["Altima", "Sentra", "Rogue", "Pathfinder", "Murano", "Frontier", "Maxima", "Versa", "Titan", "Armada", "Kicks", "Juke", "Leaf", "Xterra", "Quest", "Cube", "350Z", "370Z", "NV200", "Rogue Sport"],
    Oldsmobile: ["Alero", "Cutlass", "Intrigue", "Aurora", "Bravada"],
    Pontiac: ["G6", "Grand Prix", "Grand Am", "Vibe", "Torrent", "Aztek", "Firebird", "Sunfire", "Bonneville", "Montana", "Solstice"],
    Porsche: ["Cayenne", "Macan", "911", "Panamera", "Boxster", "Cayman", "Taycan"],
    Ram: ["1500", "2500", "3500", "ProMaster"],
    Saturn: ["Vue", "Ion", "Aura", "Outlook", "Sky", "L300"],
    Scion: ["tC", "xB", "xD", "FR-S", "iM", "iA"],
    Subaru: ["Forester", "Outback", "Impreza", "Crosstrek", "Legacy", "Ascent", "WRX", "BRZ", "Tribeca", "Baja", "Solterra"],
    Suzuki: ["Grand Vitara", "SX4", "Forenza", "XL7", "Hayabusa"],
    Tesla: ["Model 3", "Model Y", "Model S", "Model X", "Cybertruck"],
    Toyota: ["Camry", "Corolla", "RAV4", "Highlander", "Tacoma", "Tundra", "Prius", "4Runner", "Sienna", "Avalon", "Sequoia", "Yaris", "C-HR", "Venza", "Matrix", "FJ Cruiser", "Land Cruiser", "Solara", "Celica", "Echo", "Corolla Cross", "GR86", "Supra", "bZ4X", "Crown"],
    Volkswagen: ["Jetta", "Passat", "Tiguan", "Atlas", "Golf", "Taos", "Beetle", "GTI", "Touareg", "CC", "Routan", "ID.4", "Arteon", "Rabbit"],
    Volvo: ["XC40", "XC60", "XC70", "XC90", "S40", "S60", "S80", "S90", "V60", "V70", "C30"],
    Kawasaki: ["Ninja", "Vulcan"],
    "Harley-Davidson": ["Sportster", "Street Glide", "Road King", "Softail", "Fat Boy"],
    Yamaha: ["R1", "R6", "V Star"]
  };
  var MODEL_ALIASES = {
    f150: "F-150",
    f250: "F-250",
    f350: "F-350",
    crv: "CR-V",
    hrv: "HR-V",
    rav: "RAV4",
    rav4: "RAV4",
    cx5: "CX-5",
    cx3: "CX-3",
    cx7: "CX-7",
    cx9: "CX-9",
    cx30: "CX-30",
    cx50: "CX-50",
    mx5: "MX-5",
    forster: "Forester",
    forestr: "Forester",
    camery: "Camry",
    camary: "Camry",
    corola: "Corolla",
    fussion: "Fusion",
    tuscon: "Tucson",
    civik: "Civic",
    cheroke: "Cherokee",
    rouge: "Rogue",
    rougue: "Rogue",
    "4runner": "4Runner",
    fourrunner: "4Runner",
    silverado1500: "Silverado 1500",
    silverodo: "Silverado",
    siverado: "Silverado",
    tahoo: "Tahoe",
    equinoxe: "Equinox",
    explorar: "Explorer",
    escap: "Escape",
    edg: "Edge",
    altma: "Altima",
    elantr: "Elantra",
    sonota: "Sonata",
    accrd: "Accord",
    acord: "Accord",
    odessy: "Odyssey",
    oddysey: "Odyssey",
    odyssy: "Odyssey",
    highlandr: "Highlander",
    tacome: "Tacoma",
    wrangeler: "Wrangler",
    wrangle: "Wrangler",
    grandcherokee: "Grand Cherokee",
    townandcountry: "Town & Country",
    townandcountryvan: "Town & Country",
    chr: "C-HR",
    ram1500: "1500",
    ram2500: "2500",
    model3: "Model 3",
    modely: "Model Y",
    models: "Model S",
    modelx: "Model X",
    malibue: "Malibu",
    impla: "Impala",
    santafe: "Santa Fe",
    grandcaravan: "Grand Caravan",
    crownvic: "Crown Victoria",
    mkz: "MKZ"
  };
  var VEHICLE_WORDS = {
    car: "car",
    cars: "car",
    auto: "vehicle",
    autos: "vehicle",
    automobile: "vehicle",
    automobiles: "vehicle",
    vehicle: "vehicle",
    vehicles: "vehicle",
    vehical: "vehicle",
    vehicals: "vehicle",
    veh: "vehicle",
    truck: "truck",
    trucks: "truck",
    suv: "suv",
    suvs: "suv",
    van: "van",
    vans: "van",
    minivan: "van",
    motorcycle: "motorcycle",
    motorcycles: "motorcycle",
    bike: "motorcycle",
    bikes: "motorcycle"
  };
  var TRIM_WORDS = new Set(
    `lx ex exl ex-l se le xle xse sr sr5 trd limited sport touring platinum premium base lt ls ltz rs ss z71
  xlt lariat king ranch raptor sel titanium st gt hybrid electric ev plug-in awd 4wd fwd rwd 4x4 4x2 crew cab
  quad double extended regular pickup sedan coupe hatchback wagon convertible van minivan suv truck 2dr 4dr
  denali slt sle at4 laredo overland rubicon sahara trailhawk altitude summit unlimited s sv sl sr nismo pro-4x
  gl gls glx gli wolfsburg sxt rt r/t gt srt scat hellcat express tradesman bighorn longhorn laramie rebel
  1500 2500 3500 hd heavy duty classic l xl xlr heritage elite`.match(/[a-z0-9/-]+/g)
  );

  // src/lexicon.js
  function stateAt(tokens, i3) {
    const first = tokens[i3];
    if (!first || !first.alpha) return null;
    for (let size = Math.min(MAX_STATE_WORDS, tokens.length - i3); size >= 1; size -= 1) {
      const run = tokens.slice(i3, i3 + size);
      if (run.some((t2) => !t2.alpha && t2.text !== ".") || run.some((t2) => t2.line !== first.line)) continue;
      const phrase = run.filter((t2) => t2.alpha).map((t2) => t2.lower).join(" ");
      if (STATE_NAMES.has(phrase)) return { end: i3 + size - 1, abbr: STATE_NAMES.get(phrase), name: true };
    }
    if (first.text.length === 2 && STATE_ABBRS.has(first.text.toUpperCase())) {
      const upper = first.text === first.text.toUpperCase();
      const next = tokens[i3 + 1];
      const zipNext = next && next.num && next.text.length === 5 && next.line === first.line;
      const prev = tokens[i3 - 1];
      const commaBefore = prev && prev.text === "," && prev.line === first.line;
      const lineEnds = !next || next.line !== first.line || next.text === ",";
      if (upper || zipNext || commaBefore && lineEnds) {
        return { end: i3, abbr: first.text.toUpperCase(), name: false };
      }
    }
    return null;
  }
  var isSuffix = (word) => STREET_SUFFIXES.has(String(word).toLowerCase().replace(/\.$/, ""));
  var isWeakSuffix = (word) => WEAK_SUFFIXES.has(String(word).toLowerCase());
  var isDirectional = (word) => DIRECTIONALS.has(String(word).toLowerCase().replace(/\./g, ""));
  var isUnitWord = (word) => UNIT_WORDS.has(String(word).toLowerCase().replace(/\./g, ""));
  var isFieldWord = (word) => FIELD_WORDS.has(String(word).toLowerCase());
  var isCommonWord = (word) => COMMON_WORDS.has(String(word).toLowerCase());
  var CARRIER_EXACT = /* @__PURE__ */ new Map();
  for (const [name, aliases4, flags = {}] of CARRIERS) {
    for (const alias of aliases4) {
      const key = compact(alias);
      if (!key) continue;
      const existing = CARRIER_EXACT.get(key);
      if (!existing || existing.ambiguous && !flags.ambiguous) {
        CARRIER_EXACT.set(key, { name, ambiguous: Boolean(flags.ambiguous) });
      }
    }
  }
  var CARRIER_FUZZY = [...CARRIER_EXACT.entries()].filter(([key, v2]) => !v2.ambiguous && key.length >= 5).map(([key, v2]) => ({ compact: key, ...v2 }));
  var MAX_CARRIER_WORDS = 5;
  function carrierExact(phrase) {
    return CARRIER_EXACT.get(compact(phrase)) || null;
  }
  function carrierFuzzy(phrase) {
    const key = compact(phrase);
    if (key.length < 5 || CARRIER_FUZZY_STOP.has(key)) return null;
    if (isFieldWord(key) || isCommonWord(key) || makeExact(key) || STATE_NAMES.has(key)) return null;
    const hit = bestFuzzy(key, CARRIER_FUZZY);
    return hit ? { name: hit.entry.name, ambiguous: false, distance: hit.distance } : null;
  }
  var MAKE_EXACT = /* @__PURE__ */ new Map();
  for (const [name, aliases4, flags = {}] of MAKES) {
    for (const alias of aliases4) {
      const key = compact(alias);
      const existing = MAKE_EXACT.get(key);
      if (!existing || existing.ambiguous && !flags.ambiguous) {
        MAKE_EXACT.set(key, { name, ambiguous: Boolean(flags.ambiguous) });
      }
    }
  }
  var MAKE_FUZZY = [...MAKE_EXACT.entries()].filter(([key, v2]) => !v2.ambiguous && key.length >= 5).map(([key, v2]) => ({ compact: key, ...v2 }));
  var MAX_MAKE_WORDS = 2;
  function makeExact(phrase) {
    return MAKE_EXACT.get(compact(phrase)) || null;
  }
  function makeFuzzy(phrase) {
    const key = compact(phrase);
    if (key.length < 5 || isFieldWord(key) || isCommonWord(key) || CARRIER_EXACT.has(key)) return null;
    const hit = bestFuzzy(key, MAKE_FUZZY);
    return hit ? { name: hit.entry.name, ambiguous: false } : null;
  }
  var MODEL_EXACT = /* @__PURE__ */ new Map();
  var addModel = (key, model5, make) => {
    if (!key) return;
    if (!MODEL_EXACT.has(key)) MODEL_EXACT.set(key, { model: model5, makes: /* @__PURE__ */ new Set() });
    if (make) MODEL_EXACT.get(key).makes.add(make);
  };
  for (const [make, models] of Object.entries(MODELS)) {
    for (const model5 of models) addModel(compact(model5), model5, make);
  }
  for (const [key, model5] of Object.entries(MODEL_ALIASES)) {
    const target = MODEL_EXACT.get(compact(model5));
    if (target) for (const make of target.makes) addModel(key, model5, make);
    else addModel(key, model5, null);
  }
  var MODEL_FUZZY = [...MODEL_EXACT.entries()].filter(([key]) => key.length >= 5 && /[a-z]/.test(key)).map(([key, v2]) => ({ compact: key, ...v2 }));
  var MAX_MODEL_WORDS = 3;
  function modelExact(phrase, make) {
    const key = compact(phrase);
    const hit = MODEL_EXACT.get(key);
    if (!hit) return null;
    if (make && hit.makes.size && !hit.makes.has(make)) return null;
    if (!make && /^\d+$/.test(key)) return null;
    if (!make && key.length <= 2) return null;
    return { model: hit.model, make: hit.makes.size === 1 ? [...hit.makes][0] : make || null };
  }
  function modelFuzzy(phrase, make) {
    const key = compact(phrase);
    if (key.length < 5 || isFieldWord(key) || isCommonWord(key)) return null;
    const pool = make ? MODEL_FUZZY.filter((e) => e.makes.has(make)) : MODEL_FUZZY;
    const hit = bestFuzzy(key, pool);
    if (!hit) return null;
    return { model: hit.entry.model, make: hit.entry.makes.size === 1 ? [...hit.entry.makes][0] : make || null };
  }

  // src/extract/vehicles.js
  var NUMBER_WORDS = { one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9, ten: 10, a: 1, an: 1, single: 1 };
  var YEAR_BLOCKERS = /* @__PURE__ */ new Set(["since", "in", "from", "born", "dob", "year", "until", "til", "till", "by", "after", "before", "of", "circa", "around", "bday", "birthday", "married", "moved", "expires", "exp", "dl", "license", "licensed"]);
  var BREAK_WORDS = /* @__PURE__ */ new Set(["and", "also", "plus", "with", "w", "or", "for", "since", "is", "was", "has", "have", "had", "paid", "financed", "owned", "leased", "insured", "full", "liability", "coverage", "at", "in", "on"]);
  var SEPARATORS = /* @__PURE__ */ new Set([",", ";", "|", "&", "+", "(", ")", "[", "]", "/", "\\", ":", "."]);
  function yearAt(toks, i3) {
    const t2 = toks[i3];
    if (!t2) return null;
    const next = toks[i3 + 1];
    if (t2.num && t2.text.length === 4) {
      const v2 = Number(t2.text);
      if (v2 >= 1940 && v2 <= CURRENT_YEAR + 2) return { year: v2, size: 1 };
    }
    if (t2.text === "'" && next && next.num && next.text.length === 2 && next.start === t2.end) {
      return { year: twoDigit(next.text), size: 2 };
    }
    if (t2.num && t2.text.length === 2 && next && next.alpha) {
      const make = makeExact(next.text);
      if (make && !make.ambiguous) return { year: twoDigit(t2.text), size: 1 };
    }
    return null;
  }
  function twoDigit(text) {
    const n2 = Number(text);
    return n2 <= (CURRENT_YEAR + 1) % 100 ? 2e3 + n2 : 1900 + n2;
  }
  function wordsFrom(toks, i3, size) {
    const run = toks.slice(i3, i3 + size);
    if (run.length !== size) return null;
    for (let k2 = 1; k2 < run.length; k2 += 1) {
      const gap = run[k2].start - run[k2 - 1].end;
      if (gap > 1) return null;
      if (!run[k2].word && run[k2].text !== "-") return null;
    }
    if (!run[0].word || !run[run.length - 1].word) return null;
    return run;
  }
  function makeAt(toks, i3) {
    for (let size = Math.min(MAX_MAKE_WORDS * 2 - 1, toks.length - i3); size >= 1; size -= 1) {
      const run = wordsFrom(toks, i3, size);
      if (!run) continue;
      const phrase = run.map((t3) => t3.text).join(" ");
      const hit = makeExact(phrase);
      if (hit) return { ...hit, size };
    }
    const t2 = toks[i3];
    if (t2 && t2.alpha) {
      const fuzzy = makeFuzzy(t2.text);
      if (fuzzy) return { ...fuzzy, size: 1, fuzzy: true };
    }
    return null;
  }
  function modelAt(toks, i3, make) {
    for (let size = Math.min(MAX_MODEL_WORDS * 2 - 1, toks.length - i3); size >= 1; size -= 1) {
      const run = wordsFrom(toks, i3, size);
      if (!run) continue;
      const phrase = run.map((t2) => t2.text).join(" ");
      const hit = modelExact(phrase, make);
      if (hit) return { ...hit, size };
    }
    for (let size = Math.min(MAX_MODEL_WORDS * 2 - 1, toks.length - i3); size >= 1; size -= 1) {
      const run = wordsFrom(toks, i3, size);
      if (!run) continue;
      const phrase = run.map((t2) => t2.text).join(" ");
      if (phrase.replace(/[^a-zA-Z]/g, "").length >= 5) {
        const fuzzy = modelFuzzy(phrase, make);
        if (fuzzy) return { ...fuzzy, size, fuzzy: true };
      }
    }
    return null;
  }
  function isCode(text) {
    return /^[A-Za-z]{0,3}\d{1,4}[A-Za-z]{0,3}$/.test(text) && !/^\d{5,}$/.test(text) && text.length <= 6;
  }
  function isPlainUnknown(t2) {
    return t2.alpha && t2.text.length >= 2 && !isFieldWord(t2.text) && !isCommonWord(t2.text) && !isSuffix(t2.text) && !carrierExact(t2.text) && !VEHICLE_WORDS[t2.lower] && !BREAK_WORDS.has(t2.lower);
  }
  function findVehicles(ctx, blocked) {
    const out3 = [];
    for (const line of ctx.lines) {
      const toks = ctx.tokens.filter((t2) => t2.line === line.index && !hitsAny(t2, blocked));
      let i3 = 0;
      while (i3 < toks.length) {
        const found = parseVehicle(toks, i3);
        if (found) {
          out3.push(found.vehicle);
          i3 = found.next;
        } else {
          i3 += 1;
        }
      }
    }
    return out3;
  }
  function parseVehicle(toks, i3) {
    const t2 = toks[i3];
    if (!t2.word && t2.text !== "'") return null;
    const prev = toks[i3 - 1];
    const y = yearAt(toks, i3);
    const mk = y ? null : makeAt(toks, i3);
    if (!y && !mk) {
      const md = t2.alpha ? modelAt(toks, i3, null) : null;
      if (!md || md.fuzzy || !yearAt(toks, i3 + md.size)) return null;
    }
    if (y && prev && YEAR_BLOCKERS.has(prev.lower)) {
      const after2 = toks[i3 + y.size];
      if (!after2 || !makeExact(after2.text)) return null;
    }
    const v2 = { year: null, make: null, model: null, extras: [], start: t2.start, end: t2.end, weak: false };
    let j = i3;
    let unknownTaken = 0;
    while (j < toks.length) {
      const tok = toks[j];
      if (SEPARATORS.has(tok.text) && !(tok.text === "-")) {
        break;
      }
      if (tok.text === "-") {
        j += 1;
        continue;
      }
      if (BREAK_WORDS.has(tok.lower) && j > i3) break;
      const yy = yearAt(toks, j);
      if (yy) {
        if (v2.year) break;
        if (j > i3 && !(v2.make || v2.model)) break;
        v2.year = yy.year;
        j += yy.size;
        v2.end = toks[j - 1].end;
        continue;
      }
      if (!v2.make) {
        const m3 = makeAt(toks, j);
        if (m3) {
          v2.make = m3.name;
          v2.makeAmbiguous = m3.ambiguous;
          j += m3.size;
          v2.end = toks[j - 1].end;
          continue;
        }
      }
      if (!v2.model) {
        const md = modelAt(toks, j, v2.make);
        if (md && (v2.make || v2.year || !md.fuzzy)) {
          v2.model = md.model;
          if (!v2.make && md.make) v2.make = md.make;
          j += md.size;
          v2.end = toks[j - 1].end;
          continue;
        }
      }
      if (VEHICLE_WORDS[tok.lower] && (v2.make || v2.model)) {
        j += 1;
        continue;
      }
      if ((v2.make || v2.model) && v2.extras.length < 3) {
        if (TRIM_WORDS.has(tok.lower) || isCode(tok.text) && !(tok.num && tok.text.length >= 4)) {
          v2.extras.push(/^[a-z0-9-]+$/.test(tok.text) && tok.text.length <= 3 ? tok.text.toUpperCase() : tok.text);
          j += 1;
          v2.end = toks[j - 1].end;
          continue;
        }
      }
      if (v2.make && !v2.model && unknownTaken === 0 && isPlainUnknown(tok) && !stateAt(toks, j)) {
        v2.model = titleCase(tok.text);
        unknownTaken += 1;
        j += 1;
        v2.end = toks[j - 1].end;
        continue;
      }
      if (v2.year && !v2.make && !v2.model && unknownTaken === 0 && isPlainUnknown(tok) && /^[A-Z]/.test(tok.text)) {
        const after2 = toks[j + 1];
        if (after2 && (isSuffix(after2.text) || after2.num)) break;
        v2.make = tok.text;
        v2.weak = true;
        unknownTaken += 1;
        j += 1;
        v2.end = toks[j - 1].end;
        continue;
      }
      break;
    }
    const valid2 = v2.year && (v2.make || v2.model) || v2.make && v2.model && !v2.makeAmbiguous || v2.make && v2.model && v2.year;
    if (!valid2) return null;
    if (v2.makeAmbiguous && !v2.year && !v2.model) return null;
    const value = [v2.year, v2.make, v2.model, ...v2.extras].filter(Boolean).join(" ");
    return { vehicle: { value, start: v2.start, end: v2.end, weak: v2.weak, year: v2.year, make: v2.make, model: v2.model }, next: Math.max(j, i3 + 1) };
  }
  var COUNT_RE = new RegExp(
    `\\b(\\d{1,2}|${Object.keys(NUMBER_WORDS).join("|")})\\s*(?:x\\s*)?(${Object.keys(VEHICLE_WORDS).join("|")})\\b(?!\\s*#?\\s*\\d\\s*[:.)-])`,
    "gi"
  );
  var COUNT_AFTER_RE = new RegExp(`\\b(?:#\\s*of\\s+|number\\s+of\\s+)?(${Object.keys(VEHICLE_WORDS).join("|")})\\s*[:=-]\\s*(\\d{1,2})(?!\\d)(?!\\s*[:.)])`, "gi");
  function findVehicleCount(ctx, blocked) {
    const generic = [];
    const specific = [];
    const take = (count, word, start2, end2) => {
      if (hitsAny({ start: start2, end: end2 }, blocked)) return;
      if (!Number.isFinite(count) || count <= 0 || count > 20) return;
      const kind = VEHICLE_WORDS[word.toLowerCase()];
      (kind === "vehicle" ? generic : specific).push({ count, kind, start: start2, end: end2 });
    };
    COUNT_RE.lastIndex = 0;
    let m3;
    while ((m3 = COUNT_RE.exec(ctx.text)) !== null) {
      const raw = m3[1].toLowerCase();
      const count = /^\d+$/.test(raw) ? Number(raw) : NUMBER_WORDS[raw];
      if ((raw === "a" || raw === "an") && /\bcar\s*\d/i.test(ctx.text)) continue;
      take(count, m3[2], m3.index, m3.index + m3[0].length);
    }
    COUNT_AFTER_RE.lastIndex = 0;
    while ((m3 = COUNT_AFTER_RE.exec(ctx.text)) !== null) {
      take(Number(m3[2]), m3[1], m3.index, m3.index + m3[0].length);
    }
    if (generic.length) return generic[0].count;
    if (!specific.length) return null;
    const byKind = /* @__PURE__ */ new Map();
    for (const s2 of specific) if (!byKind.has(s2.kind)) byKind.set(s2.kind, s2.count);
    return [...byKind.values()].reduce((a, b2) => a + b2, 0);
  }

  // src/extract/insurance.js
  var DURATION_PATTERNS = [
    {
      re: /\b(?:for\s+)?(?:more\s+th[ae]n|over|greater\s+than)\s+(\d{1,3}|a|an|one|two|three|four|five|six|seven|eight|nine|ten|several)\s*(years?|yrs?|months?|mos?)\b/i,
      operator: "more than"
    },
    { re: /\b(\d{1,3})\s*\+\s*(years?|yrs?|months?|mos?)\b/i, operator: "at least" },
    { re: /\b(\d{1,3})\s+plus\s+(years?|yrs?|months?|mos?)\b/i, operator: "at least" },
    {
      re: /\b(?:at\s+least|minimum(?:\s+of)?)\s+(\d{1,3})\s*(years?|yrs?|months?|mos?)\b/i,
      operator: "at least"
    },
    { re: /\b(?:less\s+than|under)\s+(\d{1,3}|a|an|one)\s*(years?|yrs?|months?|mos?)\b/i, operator: "less than" },
    {
      re: /\b(?:about|around|approximately|approx\.?|like|roughly)\s+(\d{1,3}|a|an|one)\s*(years?|yrs?|months?|mos?)\b/i,
      operator: "about"
    },
    { re: /\ba\s+year\s+long\b/i, operator: "", value: "1 year" },
    { re: /\b(?:for\s+)?several\s+(years?|yrs?|months?)\b/i, operator: "about", value: "several years" },
    { re: /\b(?:for\s+)?a\s+long\s+time\b/i, operator: "about", value: "a long time" },
    {
      re: /\b(?:for\s+)?(\d{1,3}|a|an|one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve)\s*(years?|yrs?|months?|mos?)\b/i,
      operator: ""
    },
    {
      re: /\bsince\s+((?:19|20)\d{2})\b/i,
      operator: "since"
    }
  ];
  var NUMBER_WORDS2 = {
    a: 1,
    an: 1,
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
    twelve: 12
  };
  function normalizeDurationMatch(m3, pattern) {
    if (pattern.value) {
      return pattern.operator ? `${pattern.operator} ${pattern.value}`.trim() : pattern.value;
    }
    if (pattern.operator === "since") {
      return `since ${m3[1]}`;
    }
    let numStr = m3[1];
    let unit2 = m3[2] ? m3[2].toLowerCase() : "years";
    let num = /^\d+$/.test(numStr) ? Number(numStr) : NUMBER_WORDS2[numStr.toLowerCase()] || numStr;
    let normUnit = /^y/i.test(unit2) ? num === 1 ? "year" : "years" : num === 1 ? "month" : "months";
    let phr = `${num} ${normUnit}`;
    return pattern.operator ? `${pattern.operator} ${phr}` : phr;
  }
  function hasNegationBefore(ctx, offset2) {
    const windowStart = Math.max(0, offset2 - 25);
    const snippet = ctx.text.slice(windowStart, offset2).toLowerCase();
    return /\b(not|no|never|without|isn't|isnt|hasn't|hasnt|neither|excluding|except)\s*$/i.test(snippet) || /\b(not|no|never|without|isn't|isnt)\s+[a-z]{0,10}\s*$/i.test(snippet);
  }
  function findInsuranceCarriers(ctx, blocked = []) {
    const candidates = [];
    const tokens = ctx.tokens;
    for (const label of ctx.labels.filter((l) => l.field === "carrier")) {
      let startIdx = tokens.findIndex((t2) => t2.start >= label.valueStart && t2.line === label.line);
      if (startIdx < 0 && label.dangling && label.line + 1 < ctx.lines.length) {
        startIdx = tokens.findIndex((t2) => t2.line === label.line + 1 && t2.word);
      }
      if (startIdx >= 0) {
        const lineToks = tokens.filter((t2) => t2.line === tokens[startIdx].line && t2.start >= tokens[startIdx].start);
        for (let size = Math.min(MAX_CARRIER_WORDS, lineToks.length); size >= 1; size -= 1) {
          const run = lineToks.slice(0, size);
          const phrase = run.map((t2) => t2.text).join(" ");
          const hit = carrierExact(phrase) || carrierFuzzy(phrase);
          if (hit) {
            const start2 = run[0].start;
            const end2 = run[run.length - 1].end;
            candidates.push({
              name: hit.name,
              start: start2,
              end: end2,
              labeled: true,
              negated: hasNegationBefore(ctx, start2),
              ambiguous: false
            });
            break;
          }
        }
      }
    }
    for (let i3 = 0; i3 < tokens.length; i3 += 1) {
      if (hitsAny(tokens[i3], blocked)) continue;
      for (let size = Math.min(MAX_CARRIER_WORDS, tokens.length - i3); size >= 1; size -= 1) {
        const run = tokens.slice(i3, i3 + size);
        if (run.some((t2) => hitsAny(t2, blocked))) continue;
        if (run[0].line !== run[run.length - 1].line) continue;
        const phrase = run.map((t2) => t2.text).join(" ");
        const hit = carrierExact(phrase);
        if (hit) {
          const start2 = run[0].start;
          const end2 = run[run.length - 1].end;
          candidates.push({
            name: hit.name,
            start: start2,
            end: end2,
            labeled: ctx.labels.some((l) => l.field === "carrier" && l.line === run[0].line && l.end <= start2),
            negated: hasNegationBefore(ctx, start2),
            ambiguous: hit.ambiguous
          });
          i3 += size - 1;
          break;
        }
      }
    }
    for (let i3 = 0; i3 < tokens.length; i3 += 1) {
      if (hitsAny(tokens[i3], blocked)) continue;
      if (candidates.some((c) => tokens[i3].start >= c.start && tokens[i3].end <= c.end)) continue;
      for (let size = Math.min(3, tokens.length - i3); size >= 1; size -= 1) {
        const run = tokens.slice(i3, i3 + size);
        if (run[0].line !== run[run.length - 1].line) continue;
        if (run.some((t2) => hitsAny(t2, blocked))) continue;
        const phrase = run.map((t2) => t2.text).join(" ");
        if (phrase.replace(/[^a-zA-Z]/g, "").length < 5) continue;
        const hit = carrierFuzzy(phrase);
        if (hit) {
          const start2 = run[0].start;
          const end2 = run[run.length - 1].end;
          candidates.push({
            name: hit.name,
            start: start2,
            end: end2,
            labeled: ctx.labels.some((l) => l.field === "carrier" && l.line === run[0].line && l.end <= start2),
            negated: hasNegationBefore(ctx, start2),
            ambiguous: false,
            fuzzy: true
          });
          i3 += size - 1;
          break;
        }
      }
    }
    const INFER_PATTERNS = [
      /\b(?:insured|coverage|covered|policy|insurance)\s+(?:with|by|through|at)\s+([A-Z][A-Za-z0-9&.'\- ]{2,30}?)(?=[,;\n]|\s+(?:for|since)\b|$)/gi,
      /\bcurrently\s+with\s+([A-Z][A-Za-z0-9&.'\- ]{2,30}?)(?=[,;\n]|\s+(?:for|since)\b|$)/gi
    ];
    for (const pat of INFER_PATTERNS) {
      pat.lastIndex = 0;
      let m3;
      while ((m3 = pat.exec(ctx.text)) !== null) {
        const val = m3[1].trim();
        const start2 = m3.index + m3[0].indexOf(m3[1]);
        const end2 = start2 + val.length;
        if (hitsAny({ start: start2, end: end2 }, blocked)) continue;
        if (!candidates.some((c) => Math.max(start2, c.start) < Math.min(end2, c.end))) {
          if (!isFieldWord(val) && !isCommonWord(val) && !makeExact(val)) {
            candidates.push({
              name: val,
              start: start2,
              end: end2,
              labeled: true,
              negated: hasNegationBefore(ctx, start2),
              ambiguous: false,
              inferred: true
            });
          }
        }
      }
    }
    const nonNegated = candidates.filter((c) => !c.negated);
    const negated = candidates.filter((c) => c.negated);
    let best = null;
    for (const c of nonNegated) {
      if (c.ambiguous) {
        const windowStr = ctx.text.slice(Math.max(0, c.start - 40), Math.min(ctx.text.length, c.end + 40)).toLowerCase();
        const hasContext = c.labeled || /\b(insurance|ins|carrier|policy|covered|with|for\s+\d|since)\b/i.test(windowStr);
        if (!hasContext) continue;
      }
      if (!best || c.labeled && !best.labeled || !c.fuzzy && best.fuzzy) {
        best = c;
      }
    }
    let duration = null;
    for (const pat of DURATION_PATTERNS) {
      const re = new RegExp(pat.re.source, "gi");
      let m3;
      while ((m3 = re.exec(ctx.text)) !== null) {
        const start2 = m3.index;
        const end2 = start2 + m3[0].length;
        if (hitsAny({ start: start2, end: end2 }, blocked)) continue;
        duration = normalizeDurationMatch(m3, pat);
        break;
      }
      if (duration) break;
    }
    return {
      carrier: best ? best.name : null,
      carrierCandidate: best,
      duration,
      negated: negated.map((n2) => n2.name),
      allCandidates: candidates
    };
  }

  // src/extract/address.js
  var STOP_WORDS = new Set(
    `phone ph cell cellphone tel telephone dob born birthday bday email e-mail insurance insured ins insurer carrier
  policy coverage covered premium vehicle vehicles vehical vehicals car cars truck trucks suv suvs drivers driver
  license licence owns owned owner owners homeowner homeowners rent rents renter renting rental tenant lease years
  yrs yr months mos age spouse wife husband married single divorced kids children call called calling callback cb
  wants want needs need quote interested said says currently current previous previously thanks thank please
  tomorrow today accident accidents ticket tickets claim claims dui sr22 lives living resides has have had with was
  is are paying pays paid email name dl`.match(/[a-z0-9-]+/g)
  );
  var COUNTRY = /* @__PURE__ */ new Set(["usa", "us", "united", "states", "america", "u"]);
  var SKIPPABLE = /* @__PURE__ */ new Set(["zip", "zipcode", "code", "postal"]);
  var FUNCTION_WORDS = new Set(
    `a an the and or of to in on at for with by from is was are be been it this that my his her their our your
  times x am pm yo kids people days weeks hours mins minutes dollars bucks percent more less than about years yrs
  months mos old`.match(/[a-z]+/g)
  );
  function tokensOfLine(ctx, line) {
    return ctx.tokens.filter((t2) => t2.line === line);
  }
  function isHouseNumber(t2) {
    return /^\d{1,6}[A-Za-z]?$/.test(t2.text) && !/^0+$/.test(t2.text);
  }
  function isZipAt(R, k2) {
    const t2 = R[k2];
    if (!t2 || !/^\d{5}$/.test(t2.text)) return false;
    const prev = R[k2 - 1];
    if (prev && stateAt(R, k2 - 1)) return true;
    if (prev && (isUnitWord(prev.text) || prev.text === "#" || ROAD_TYPES.has(prev.lower))) return false;
    return true;
  }
  function zipEnd(R, k2) {
    if (R[k2 + 1] && R[k2 + 1].text === "-" && R[k2 + 2] && /^\d{4}$/.test(R[k2 + 2].text) && R[k2 + 1].start === R[k2].end && R[k2 + 2].start === R[k2 + 1].end) return k2 + 2;
    return k2;
  }
  function extendTail(R, k2) {
    let end2 = k2;
    let j = k2 + 1;
    while (j < R.length) {
      const t2 = R[j];
      if (t2.text === ",") {
        j += 1;
        continue;
      }
      if (isZipAt(R, j)) {
        end2 = zipEnd(R, j);
        j = end2 + 1;
        continue;
      }
      const st = stateAt(R, j);
      if (st) {
        end2 = st.end;
        j = st.end + 1;
        continue;
      }
      if (COUNTRY.has(t2.lower) && (t2.lower !== "us" || t2.text === "US")) {
        let e = j;
        while (R[e + 1] && (COUNTRY.has(R[e + 1].lower) || R[e + 1].text === ".")) e += 1;
        end2 = e;
        j = e + 1;
        continue;
      }
      if (SKIPPABLE.has(t2.lower)) {
        j += 1;
        continue;
      }
      break;
    }
    return end2;
  }
  function unitAfter(R, k2) {
    const t2 = R[k2];
    if (!t2) return -1;
    if (stateAt(R, k2)) return -1;
    if (isUnitWord(t2.text) || t2.text === "#") {
      let j = k2 + 1;
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
  function isStopAt(ctx, R, k2, extraStops) {
    const t2 = R[k2];
    if (hitsAny(t2, extraStops)) return true;
    if (ctx.labels.some((l) => l.field !== "address" && l.field !== "zip" && l.start === t2.start)) return true;
    if (STOP_WORDS.has(t2.lower)) {
      if (isSuffix(R[k2 + 1]?.text || "") && !isSuffix(t2.text)) return false;
      return true;
    }
    if (t2.lower === "and" || t2.lower === "for" || t2.lower === "but") {
      const ahead = R.slice(k2 + 1, k2 + 4);
      return !ahead.some((a) => isSuffix(a.text) && !isWeakSuffix(a.text));
    }
    return false;
  }
  function isContinuationLine(ctx, toks, nextToks, extraStops) {
    const words = toks.filter((t2) => t2.word);
    if (!words.length || words.length > 9) return false;
    if (toks.some((t2) => hitsAny(t2, extraStops))) return false;
    if (ctx.labels.some((l) => l.line === toks[0].line && l.field !== "address" && l.field !== "zip")) return false;
    if (words.some((t2) => STOP_WORDS.has(t2.lower))) return false;
    if (unitAfter(toks, 0) >= 0 && words.length <= 4) return true;
    if (toks.some((_, k2) => isZipAt(toks, k2))) return true;
    for (let k2 = 0; k2 < toks.length; k2 += 1) {
      const st = stateAt(toks, k2);
      if (st && words.length <= 6 && st.end >= toks.length - 2) {
        return toks.slice(0, k2).every((t2) => t2.alpha || t2.text === "," || t2.text === ".");
      }
    }
    if (words.length <= 3 && words.every((t2) => t2.alpha && !isCommonWord(t2.text) && !carrierExact(t2.text) && !makeExact(t2.text)) && nextToks && nextToks.length && isContinuationLine(ctx, nextToks, null, extraStops)) {
      return true;
    }
    if (words.length <= 3 && words.every((t2) => COUNTRY.has(t2.lower))) return true;
    return false;
  }
  function regionFrom(ctx, startTok, extraStops, maxEndOffset = Infinity) {
    let R = tokensOfLine(ctx, startTok.line).filter((t2) => t2.start >= startTok.start && t2.end <= maxEndOffset);
    let line = startTok.line;
    const hasZip = () => R.some((_, k2) => k2 > 0 && isZipAt(R, k2));
    const hitStop = () => R.some((t2, k2) => k2 > 0 && isStopAt(ctx, R, k2, extraStops));
    while (line + 1 < ctx.lines.length && !hasZip() && !hitStop()) {
      const next = tokensOfLine(ctx, line + 1);
      const after2 = tokensOfLine(ctx, line + 2);
      if (!isContinuationLine(ctx, next, after2, extraStops)) break;
      R = R.concat(next);
      line += 1;
    }
    return R;
  }
  function findEnd(ctx, R, { labeled, poBoxEnd = -1, carrierStops, extraStops }) {
    let stop = R.length;
    for (let k2 = 1; k2 < R.length; k2 += 1) {
      if (isStopAt(ctx, R, k2, extraStops)) {
        stop = k2;
        break;
      }
    }
    const S = R.slice(0, stop);
    const bodyFrom = poBoxEnd >= 0 ? poBoxEnd + 1 : 1;
    const hasAlphaBefore = (k2) => S.slice(0, k2).some((t2) => t2.alpha);
    for (let k2 = bodyFrom; k2 < S.length; k2 += 1) {
      if (isZipAt(S, k2) && (hasAlphaBefore(k2) || poBoxEnd >= 0)) {
        return extendTail(S, zipEnd(S, k2));
      }
    }
    let limit = S.length;
    for (const c of carrierStops) {
      const k2 = S.findIndex((t2) => t2.start === c.start);
      if (k2 > bodyFrom) {
        const after2 = S.findIndex((t2) => t2.start >= c.end);
        const stateNear = after2 >= 0 && [after2, after2 + 1, after2 + 2].some((a) => a < S.length && stateAt(S, a));
        if (!stateNear) {
          limit = Math.min(limit, k2);
        }
      }
    }
    const L = S.slice(0, limit);
    for (let k2 = Math.max(bodyFrom + 1, 2); k2 < L.length; k2 += 1) {
      const st = stateAt(L, k2);
      if (!st) continue;
      const next = L[st.end + 1];
      if (next && next.alpha && !STOP_WORDS.has(next.lower) && !COUNTRY.has(next.lower)) continue;
      if (!hasAlphaBefore(k2)) continue;
      return extendTail(L, st.end);
    }
    let end2 = -1;
    let suffixAt = -1;
    for (let k2 = bodyFrom + 1; k2 < L.length; k2 += 1) {
      if (!L[k2].alpha || !isSuffix(L[k2].text)) continue;
      if (isWeakSuffix(L[k2].text)) {
        const nxt = L[k2 + 1];
        const nextOk = !nxt || nxt.text === "," || nxt.text === "." || isDirectional(nxt.text) || unitAfter(L, k2 + 1) >= 0;
        if (!nextOk) continue;
      }
      if (isSuffix(L[k2 + 1]?.text || "") && !isWeakSuffix(L[k2 + 1].text)) continue;
      suffixAt = k2;
      break;
    }
    if (suffixAt < 0) {
      for (let k2 = bodyFrom; k2 < L.length - 1; k2 += 1) {
        if (ROAD_TYPES.has(L[k2].lower) && /^\d{1,5}[A-Za-z]?$/.test(L[k2 + 1].text)) {
          suffixAt = k2 + 1;
          break;
        }
        if (ROAD_TYPES.has(L[k2].lower) && isSuffix(L[k2 + 1].text) && L[k2 + 2] && /^\d{1,5}$/.test(L[k2 + 2].text)) {
          suffixAt = k2 + 2;
          break;
        }
      }
    }
    if (suffixAt >= 0) {
      end2 = suffixAt;
      let j = end2 + 1;
      if (L[j] && L[j].text === ".") {
        end2 = j;
        j += 1;
      }
      if (L[j] && isDirectional(L[j].text) && L[j].text.length <= 2) {
        end2 = j;
        j += 1;
      }
      if (L[j] && L[j].text === ",") j += 1;
      const u = unitAfter(L, j);
      if (u >= 0) {
        end2 = u;
        j = u + 1;
      }
      let c = j;
      if (L[c] && L[c].text === ",") c += 1;
      const cityStart = c;
      while (c < L.length && c - cityStart < 3 && L[c].alpha && !isCommonWord(L[c].text) && !makeExact(L[c].text)) c += 1;
      if (c > cityStart) {
        const rest = L.slice(c).filter((t2) => t2.word);
        const sameLineEnd = rest.length === 0 || L[c] && L[c].line !== L[cityStart].line;
        if (sameLineEnd || stop < R.length || limit < S.length) end2 = c - 1;
      }
      return end2;
    }
    if (poBoxEnd >= 0) return poBoxEnd;
    if (labeled) {
      let e = L.length - 1;
      while (e > 0 && !L[e].word) e -= 1;
      return e;
    }
    return -1;
  }
  function score(c) {
    return (c.labeled ? 10 : 0) + (c.hasZip ? 4 : 0) + (c.hasState ? 2 : 0) + (c.hasSuffix ? 1 : 0);
  }
  function findAddress(ctx, { stops: stops2, carriers }) {
    const candidates = [];
    const carrierStops = carriers.filter((c) => !c.ambiguous);
    const build = (R, endIdx, labeled) => {
      if (endIdx < 0) return null;
      const span = { start: R[0].start, end: R[endIdx].end };
      const value = cleanValue(ctx.text.slice(span.start, span.end));
      const toks = R.slice(0, endIdx + 1);
      if (!toks.some((t2) => t2.alpha)) return null;
      return {
        value,
        ...span,
        labeled,
        hasZip: toks.some((_, k2) => k2 > 0 && isZipAt(toks, k2)),
        hasState: toks.some((_, k2) => k2 > 0 && stateAt(toks, k2)),
        hasSuffix: toks.some((t2, k2) => k2 > 0 && t2.alpha && isSuffix(t2.text))
      };
    };
    for (const label of ctx.labels.filter((l) => l.field === "address")) {
      let first;
      let maxEnd = label.valueEnd;
      if (label.dangling) {
        const next = tokensOfLine(ctx, label.line + 1);
        first = next.find((t2) => t2.word);
        maxEnd = Infinity;
      } else {
        first = ctx.tokens.find((t2) => t2.start >= label.valueStart && t2.word && t2.line === label.line);
      }
      if (!first) continue;
      const R = regionFrom(ctx, first, stops2, label.dangling ? Infinity : maxEnd === ctx.lines[label.line].end ? Infinity : maxEnd);
      const po = poBoxEndIndex(R, 0);
      const endIdx = findEnd(ctx, R, { labeled: true, poBoxEnd: po, carrierStops, extraStops: stops2 });
      const c = build(R, endIdx, true);
      if (c) candidates.push(c);
    }
    const claimed = candidates.map((c) => ({ start: c.start, end: c.end }));
    for (let i3 = 0; i3 < ctx.tokens.length; i3 += 1) {
      const t2 = ctx.tokens[i3];
      if (hitsAny(t2, claimed) || hitsAny(t2, stops2)) continue;
      const po = poBoxEndIndex(ctx.tokens, i3);
      if (po < 0) {
        if (!isHouseNumber(t2)) continue;
        const prev = ctx.tokens[i3 - 1];
        if (prev && prev.line === t2.line && (isUnitWord(prev.text) || prev.text === "#" || prev.text === "$" || ROAD_TYPES.has(prev.lower) || /^\d+$/.test(prev.text))) continue;
        if (prev && prev.text === "-" && ctx.tokens[i3 - 2]?.num) continue;
        const next = nextWord(ctx.tokens, i3);
        if (!next || next.line !== t2.line) continue;
        if (!(next.alpha || /^\d+(?:st|nd|rd|th)$/i.test(next.text))) continue;
        if (STOP_WORDS.has(next.lower) || FUNCTION_WORDS.has(next.lower)) continue;
      }
      const R = regionFrom(ctx, t2, stops2);
      const poLocal = po < 0 ? -1 : po - i3;
      const endIdx = findEnd(ctx, R, { labeled: false, poBoxEnd: poLocal, carrierStops, extraStops: stops2 });
      const c = build(R, endIdx, false);
      if (!c) continue;
      candidates.push(c);
      claimed.push({ start: c.start, end: c.end });
    }
    if (!candidates.length) return null;
    candidates.sort((a, b2) => score(b2) - score(a) || a.start - b2.start);
    return candidates[0];
  }
  function nextWord(tokens, i3) {
    for (let j = i3 + 1; j < tokens.length; j += 1) {
      if (tokens[j].word) return tokens[j];
      if (tokens[j].text !== "-" && tokens[j].text !== "/") return null;
    }
    return null;
  }
  function poBoxEndIndex(tokens, i3) {
    const t2 = tokens[i3];
    if (!t2) return -1;
    const seq2 = [];
    for (let j = i3; j < Math.min(tokens.length, i3 + 8); j += 1) {
      if (tokens[j].line !== t2.line) break;
      seq2.push(tokens[j]);
    }
    const text = seq2.map((x) => x.lower).join(" ").replace(/\s*\.\s*/g, " ").replace(/\s+/g, " ");
    const m3 = text.match(/^(?:p o box|po box|pobox|post office box|p o b|pob)\s+#?\s*(\d+)/);
    if (!m3) return -1;
    const k2 = seq2.findIndex((x) => x.text === m3[1]);
    return k2 < 0 ? -1 : i3 + k2;
  }

  // node_modules/compromise/src/API/world.js
  var methods = {
    one: {},
    two: {},
    three: {},
    four: {}
  };
  var model = {
    one: {},
    two: {},
    three: {}
  };
  var compute = {};
  var hooks = [];
  var world_default = { methods, model, compute, hooks };

  // node_modules/compromise/src/API/methods/compute.js
  var fns = {
    /** add metadata to term objects */
    compute: function(input, options) {
      const { world: world2 } = this;
      const compute4 = world2.compute;
      if (typeof input === "string" && Object.hasOwn(compute4, input)) {
        compute4[input](this, options);
      } else if (Array.isArray(input)) {
        input.forEach((name) => {
          if (Object.hasOwn(world2.compute, name)) {
            compute4[name](this, options);
          } else {
            console.warn("no compute:", input);
          }
        });
      } else if (typeof input === "function") {
        input(this, options);
      } else {
        console.warn("no compute:", input);
      }
      return this;
    }
  };
  var compute_default = fns;

  // node_modules/compromise/src/API/methods/loops.js
  var forEach = function(cb) {
    const ptrs = this.fullPointer;
    ptrs.forEach((ptr, i3) => {
      const view = this.update([ptr]);
      cb(view, i3);
    });
    return this;
  };
  var map = function(cb, empty2) {
    const ptrs = this.fullPointer;
    const res = ptrs.map((ptr, i3) => {
      const view = this.update([ptr]);
      const out3 = cb(view, i3);
      if (out3 === void 0) {
        return this.none();
      }
      return out3;
    });
    if (res.length === 0) {
      return empty2 || this.update([]);
    }
    if (res[0] !== void 0) {
      if (typeof res[0] === "string") {
        return res;
      }
      if (typeof res[0] === "object" && (res[0] === null || !res[0].isView)) {
        return res;
      }
    }
    let all4 = [];
    res.forEach((ptr) => {
      all4 = all4.concat(ptr.fullPointer);
    });
    return this.toView(all4);
  };
  var filter = function(cb) {
    let ptrs = this.fullPointer;
    ptrs = ptrs.filter((ptr, i3) => {
      const view = this.update([ptr]);
      return cb(view, i3);
    });
    const res = this.update(ptrs);
    return res;
  };
  var find = function(cb) {
    const ptrs = this.fullPointer;
    const found = ptrs.find((ptr, i3) => {
      const view = this.update([ptr]);
      return cb(view, i3);
    });
    return this.update([found]);
  };
  var some = function(cb) {
    const ptrs = this.fullPointer;
    return ptrs.some((ptr, i3) => {
      const view = this.update([ptr]);
      return cb(view, i3);
    });
  };
  var random = function(n2 = 1) {
    let ptrs = this.fullPointer;
    let r = Math.floor(Math.random() * ptrs.length);
    if (r + n2 > this.length) {
      r = this.length - n2;
      r = r < 0 ? 0 : r;
    }
    ptrs = ptrs.slice(r, r + n2);
    return this.update(ptrs);
  };
  var loops_default = { forEach, map, filter, find, some, random };

  // node_modules/compromise/src/API/methods/utils.js
  var utils = {
    /** */
    termList: function() {
      return this.methods.one.termList(this.docs);
    },
    /** return individual terms*/
    terms: function(n2) {
      const m3 = this.match(".");
      return typeof n2 === "number" ? m3.eq(n2) : m3;
    },
    /** */
    groups: function(group) {
      if (group || group === 0) {
        return this.update(this._groups[group] || []);
      }
      const res = {};
      Object.keys(this._groups).forEach((k2) => {
        res[k2] = this.update(this._groups[k2]);
      });
      return res;
    },
    /** */
    eq: function(n2) {
      let ptr = this.pointer;
      if (!ptr) {
        ptr = this.docs.map((_doc, i3) => [i3]);
      }
      if (ptr[n2]) {
        return this.update([ptr[n2]]);
      }
      return this.none();
    },
    /** */
    first: function() {
      return this.eq(0);
    },
    /** */
    last: function() {
      const n2 = this.fullPointer.length - 1;
      return this.eq(n2);
    },
    /** grab term[0] for every match */
    firstTerms: function() {
      return this.match("^.");
    },
    /** grab the last term for every match  */
    lastTerms: function() {
      return this.match(".$");
    },
    /** */
    slice: function(min2, max3) {
      let pntrs = this.pointer || this.docs.map((_o, n2) => [n2]);
      pntrs = pntrs.slice(min2, max3);
      return this.update(pntrs);
    },
    /** return a view of the entire document */
    all: function() {
      return this.update().toView();
    },
    /**  */
    fullSentences: function() {
      const ptrs = this.fullPointer.map((a) => [a[0]]);
      return this.update(ptrs).toView();
    },
    /** return a view of no parts of the document */
    none: function() {
      return this.update([]);
    },
    /** are these two views looking at the same words? */
    isDoc: function(b2) {
      if (!b2 || !b2.isView) {
        return false;
      }
      const aPtr = this.fullPointer;
      const bPtr = b2.fullPointer;
      if (!aPtr.length === bPtr.length) {
        return false;
      }
      return aPtr.every((ptr, i3) => {
        if (!bPtr[i3]) {
          return false;
        }
        return ptr[0] === bPtr[i3][0] && ptr[1] === bPtr[i3][1] && ptr[2] === bPtr[i3][2];
      });
    },
    /** how many seperate terms does the document have? */
    wordCount: function() {
      return this.docs.reduce((count, terms) => {
        count += terms.filter((t2) => t2.text !== "").length;
        return count;
      }, 0);
    },
    // is the pointer the full sentence?
    isFull: function() {
      const ptrs = this.pointer;
      if (!ptrs) {
        return true;
      }
      if (ptrs.length === 0 || ptrs[0][0] !== 0) {
        return false;
      }
      let wantTerms = 0;
      let haveTerms = 0;
      this.document.forEach((terms) => wantTerms += terms.length);
      this.docs.forEach((terms) => haveTerms += terms.length);
      return wantTerms === haveTerms;
    },
    // return the nth elem of a doc
    getNth: function(n2) {
      if (typeof n2 === "number") {
        return this.eq(n2);
      } else if (typeof n2 === "string") {
        return this.if(n2);
      }
      return this;
    }
  };
  utils.group = utils.groups;
  utils.fullSentence = utils.fullSentences;
  utils.sentence = utils.fullSentences;
  utils.lastTerm = utils.lastTerms;
  utils.firstTerm = utils.firstTerms;
  var utils_default = utils;

  // node_modules/compromise/src/API/methods/index.js
  var methods2 = { ...utils_default, ...compute_default, ...loops_default };
  methods2.get = methods2.eq;
  var methods_default = methods2;

  // node_modules/compromise/src/API/View.js
  var View = class _View {
    constructor(document, pointer, groups2 = {}) {
      const props = [
        ["document", document],
        ["world", world_default],
        ["_groups", groups2],
        ["_cache", null],
        ["viewType", "View"]
      ];
      props.forEach((a) => {
        Object.defineProperty(this, a[0], {
          value: a[1],
          writable: true
        });
      });
      this.ptrs = pointer;
    }
    /* getters:  */
    get docs() {
      let docs = this.document;
      if (this.ptrs) {
        docs = world_default.methods.one.getDoc(this.ptrs, this.document);
      }
      return docs;
    }
    get pointer() {
      return this.ptrs;
    }
    get methods() {
      return this.world.methods;
    }
    get model() {
      return this.world.model;
    }
    get hooks() {
      return this.world.hooks;
    }
    get isView() {
      return true;
    }
    // is the view not-empty?
    get found() {
      return this.docs.length > 0;
    }
    // how many matches we have
    get length() {
      return this.docs.length;
    }
    // return a more-hackable pointer
    get fullPointer() {
      const { docs, ptrs, document } = this;
      const pointers = ptrs || docs.map((_d, n2) => [n2]);
      return pointers.map((a) => {
        let [n2, start2, end2, id, endId] = a;
        start2 ||= 0;
        end2 ||= (document[n2] || []).length;
        if (document[n2]?.[start2]) {
          id ||= document[n2][start2].id;
          if (document[n2][end2 - 1]) {
            endId ||= document[n2][end2 - 1].id;
          }
        }
        return [n2, start2, end2, id, endId];
      });
    }
    // create a new View, from this one
    update(pointer) {
      const m3 = new _View(this.document, pointer);
      if (this._cache && pointer?.length > 0) {
        const cache2 = [];
        pointer.forEach((ptr, i3) => {
          const [n2, start2, end2] = ptr;
          if (ptr.length === 1) {
            cache2[i3] = this._cache[n2];
          } else if (start2 === 0 && this.document[n2].length === end2) {
            cache2[i3] = this._cache[n2];
          }
        });
        if (cache2.length > 0) {
          m3._cache = cache2;
        }
      }
      m3.world = this.world;
      return m3;
    }
    // create a new View, from this one
    toView(pointer) {
      return new _View(this.document, pointer || this.pointer);
    }
    fromText(input) {
      const { methods: methods19 } = this;
      const document = methods19.one.tokenize.fromString(input, this.world);
      const doc = new _View(document);
      doc.world = this.world;
      doc.compute(["normal", "freeze", "lexicon"]);
      if (this.world.compute.preTagger) {
        doc.compute("preTagger");
      }
      doc.compute("unfreeze");
      return doc;
    }
    clone() {
      let document = this.document.slice(0);
      document = document.map((terms) => {
        return terms.map((term) => {
          term = { ...term };
          term.tags = new Set(term.tags);
          return term;
        });
      });
      const m3 = this.update(this.pointer);
      m3.document = document;
      m3._cache = this._cache;
      return m3;
    }
  };
  Object.assign(View.prototype, methods_default);
  var View_default = View;

  // node_modules/compromise/src/_version.js
  var version_default = "14.19.0";

  // node_modules/compromise/src/API/extend.js
  var isObject = function(item) {
    return item && typeof item === "object" && !Array.isArray(item);
  };
  var isUnsafeKey = (key) => key === "__proto__" || key === "constructor" || key === "prototype";
  function mergeDeep(model5, plugin7) {
    if (isObject(plugin7)) {
      for (const key in plugin7) {
        if (isUnsafeKey(key)) {
          continue;
        }
        if (isObject(plugin7[key])) {
          if (!model5[key]) Object.assign(model5, { [key]: {} });
          mergeDeep(model5[key], plugin7[key]);
        } else {
          Object.assign(model5, { [key]: plugin7[key] });
        }
      }
    }
    return model5;
  }
  function mergeQuick(model5, plugin7) {
    for (const key in plugin7) {
      if (isUnsafeKey(key)) continue;
      model5[key] ||= {};
      Object.assign(model5[key], plugin7[key]);
    }
    return model5;
  }
  var addIrregulars = function(model5, conj) {
    const m3 = model5.two.models || {};
    Object.keys(conj).forEach((k2) => {
      if (conj[k2].pastTense) {
        if (m3.toPast) {
          m3.toPast.ex[k2] = conj[k2].pastTense;
        }
        if (m3.fromPast) {
          m3.fromPast.ex[conj[k2].pastTense] = k2;
        }
      }
      if (conj[k2].presentTense) {
        if (m3.toPresent) {
          m3.toPresent.ex[k2] = conj[k2].presentTense;
        }
        if (m3.fromPresent) {
          m3.fromPresent.ex[conj[k2].presentTense] = k2;
        }
      }
      if (conj[k2].gerund) {
        if (m3.toGerund) {
          m3.toGerund.ex[k2] = conj[k2].gerund;
        }
        if (m3.fromGerund) {
          m3.fromGerund.ex[conj[k2].gerund] = k2;
        }
      }
      if (conj[k2].comparative) {
        if (m3.toComparative) {
          m3.toComparative.ex[k2] = conj[k2].comparative;
        }
        if (m3.fromComparative) {
          m3.fromComparative.ex[conj[k2].comparative] = k2;
        }
      }
      if (conj[k2].superlative) {
        if (m3.toSuperlative) {
          m3.toSuperlative.ex[k2] = conj[k2].superlative;
        }
        if (m3.fromSuperlative) {
          m3.fromSuperlative.ex[conj[k2].superlative] = k2;
        }
      }
    });
  };
  var extend = function(plugin7, world2, View2, nlp3) {
    if (Array.isArray(plugin7)) {
      plugin7.forEach((p4) => extend(p4, world2, View2, nlp3));
      return;
    }
    const { methods: methods19, model: model5, compute: compute4, hooks: hooks2 } = world2;
    if (plugin7.methods) {
      mergeQuick(methods19, plugin7.methods);
    }
    if (plugin7.model) {
      mergeDeep(model5, plugin7.model);
    }
    if (plugin7.irregulars) {
      addIrregulars(model5, plugin7.irregulars);
    }
    if (plugin7.compute) {
      Object.assign(compute4, plugin7.compute);
    }
    if (hooks2) {
      world2.hooks = hooks2.concat(plugin7.hooks || []);
    }
    if (plugin7.api) {
      plugin7.api(View2);
    }
    if (plugin7.lib) {
      Object.keys(plugin7.lib).forEach((k2) => nlp3[k2] = plugin7.lib[k2]);
    }
    if (plugin7.tags) {
      nlp3.addTags(plugin7.tags);
    }
    if (plugin7.words) {
      nlp3.addWords(plugin7.words);
    }
    if (plugin7.frozen) {
      nlp3.addWords(plugin7.frozen, true);
    }
    if (plugin7.mutate) {
      plugin7.mutate(world2, nlp3);
    }
  };
  var extend_default = extend;

  // node_modules/compromise/src/API/_color.js
  var color_exports = {};
  __export(color_exports, {
    b: () => b,
    black: () => black,
    blue: () => blue,
    cyan: () => cyan,
    dim: () => dim,
    green: () => green,
    grey: () => grey,
    i: () => i,
    magenta: () => magenta,
    red: () => red,
    ul: () => ul,
    white: () => white,
    yellow: () => yellow
  });
  var color = (code) => (s2) => "\x1B[" + code + "m" + s2 + "\x1B[0m";
  var green = color(32);
  var red = color(31);
  var blue = color(34);
  var magenta = color(35);
  var cyan = color(36);
  var yellow = color(33);
  var black = color(30);
  var white = color(37);
  var dim = color(2);
  var i = color(3);
  var b = color(1);
  var ul = color(4);
  var grey = color(90);

  // node_modules/compromise/src/API/debug/debug.js
  var env = globalThis.process?.env ?? globalThis.env ?? {};
  var debug = { tags: Boolean(env.DEBUG_TAGS) };
  var before = (term) => {
    if (debug.tags && (!debug.word || debug.word === (term.normal || term.text || term.implicit || "").toLowerCase())) {
      return [...term.tags];
    }
    return null;
  };
  var log = (term, previous, reason2 = "") => {
    if (!previous) {
      return;
    }
    const added = [...term.tags].filter((tag) => !previous.includes(tag));
    const removed = previous.filter((tag) => !term.tags.has(tag));
    if (!added.length && !removed.length) {
      return;
    }
    const text = term.text || term.implicit || "";
    const index3 = term.index?.join(":") || "?";
    const prefix5 = debug.prefix || "   ";
    if (debug.rule !== reason2) {
      const headingPrefix = debug.prefix ? prefix5.replace("\u2502  ", "\u2502 ") : "  ";
      console.log(`${headingPrefix}${dim(white((reason2 || "tag change") + ":"))}`);
      debug.rule = reason2;
    }
    const print = (tags, sign, color2) => {
      if (!tags.length) {
        return;
      }
      const word = color2(`'${text}'`);
      const changes = tags.map((tag) => color2(`#${tag}`)).join(" ");
      console.log(`${prefix5}${color2(sign)} ${word} ${dim(index3.padEnd(9))} ${changes}`);
    };
    print(removed, "\u2212", red);
    print(added, "+", green);
  };
  debug.before = before;
  debug.log = log;
  var debug_default = debug;

  // node_modules/compromise/src/API/debug/match-debug.js
  var matchDebug = (world2, options) => {
    const one = world2.methods.one;
    const match2 = one.match;
    const parse9 = one.parseMatch;
    const sources = /* @__PURE__ */ new WeakMap();
    const word = options.word?.toLowerCase();
    const includesWord = (terms) => !word || terms.some((term) => (term.normal || term.text || term.implicit || "").toLowerCase() === word);
    const parseLogged = function(...args) {
      const regs = parse9.apply(this, args);
      sources.set(regs, String(args[0]));
      return regs;
    };
    const matchLogged = function(docs, todo, cache2) {
      const result = match2.call(this, docs, todo, cache2);
      const pattern = todo.match || sources.get(todo.regs) || "[parsed pattern]";
      if (options.pattern !== void 0 && pattern !== options.pattern) {
        return result;
      }
      if (word && !docs.some(includesWord)) {
        return result;
      }
      const matches3 = result.ptrs.map(([n2, start2, end2]) => docs[n2].slice(start2, end2)).filter(includesWord);
      if (word && result.ptrs.length && !matches3.length) {
        return result;
      }
      debug_default.rule = void 0;
      const status = result.ptrs.length ? green("\u2713") : red("\u2717");
      const spans = matches3.map((terms) => {
        const text = terms.map((term) => term.text || term.implicit).join(" ");
        return `${green("'" + text + "'")} ${dim(terms[0]?.index?.join(":") || "?")}`;
      }).join(", ");
      const rule = pattern.length > 80 ? pattern.slice(0, 79) + "\u2026" : pattern;
      const words = spans ? spans + "  " : " ---         ";
      console.log(`${debug_default.prefix || "   "}${status} ${words}${dim(i(rule))}`);
      return result;
    };
    one.parseMatch = parseLogged;
    one.match = matchLogged;
    return () => {
      if (one.parseMatch === parseLogged) {
        one.parseMatch = parse9;
      }
      if (one.match === matchLogged) {
        one.match = match2;
      }
    };
  };
  var match_debug_default = matchDebug;

  // node_modules/compromise/src/API/debug/hooks-debug.js
  var colorSpec = (doc) => {
    return doc.docs.map((terms, index3) => {
      const plain = terms.map((t2) => t2.pre + t2.text + t2.post).join("").trim();
      const text = dim("'" + plain + "'");
      const spec = doc.update([[index3]]).out("spec");
      return text + grey(i(spec.slice(plain.length)));
    }).join("\n");
  };
  var hooksDebug = (headings) => (doc, hooks2) => {
    const width = Math.max("tokenize".length, ...hooks2.map((hook) => hook.length));
    const snapshot = (hook, nested = false) => {
      const output = colorSpec(doc);
      output.split("\n").forEach((line, index3, lines2) => {
        if (nested) {
          const branch = index3 === lines2.length - 1 ? " \u2570\u2500" : "\u2502 ";
          console.log(`  ${dim(branch)} ${line}`);
          return;
        }
        const label = (index3 === 0 ? hook : "").padEnd(width);
        console.log(`  ${dim(label)}  ${line}`);
      });
    };
    snapshot("tokenize");
    hooks2.forEach((hook) => {
      const nested = headings;
      const prefix5 = debug_default.prefix;
      const rule = debug_default.rule;
      debug_default.rule = void 0;
      if (nested) {
        console.log(`  ${blue(b(ul(hook + ":")))}`);
        debug_default.prefix = dim("   \u2502  ");
      }
      try {
        doc.compute(hook);
        snapshot(hook, nested);
      } finally {
        debug_default.prefix = prefix5;
        debug_default.rule = rule;
      }
    });
  };
  var hooks_debug_default = hooksDebug;

  // node_modules/compromise/src/API/_lib.js
  var restoreMatch;
  var verbose = function(set = true, options = {}) {
    restoreMatch?.();
    restoreMatch = void 0;
    if (set === "match" || set === true) {
      restoreMatch = match_debug_default(this._world, options);
    }
    const env2 = globalThis.process?.env ?? globalThis.env ?? {};
    debug_default.hooks = set === "hooks" || set === true ? hooks_debug_default(set === true) : void 0;
    debug_default.word = options.word?.toLowerCase();
    debug_default.contractions = set === "contractions" || set === true;
    debug_default.rule = void 0;
    debug_default.tags = set === "tagger" || set === true;
    env2.DEBUG_TAGS = debug_default.tags ? true : "";
    env2.DEBUG_MATCH = set === "match" || set === true ? true : "";
    return this;
  };

  // node_modules/compromise/src/API/inputs.js
  var isObject2 = (val) => {
    return Object.prototype.toString.call(val) === "[object Object]";
  };
  var fromJson = function(json) {
    return json.map((o) => {
      return o.terms.map((term) => {
        if (Array.isArray(term.tags)) {
          term.tags = new Set(term.tags);
        }
        return term;
      });
    });
  };
  var preTokenized = function(arr) {
    return arr.map((a) => {
      return a.map((str) => {
        return {
          text: str,
          normal: str,
          //cleanup
          pre: "",
          post: " ",
          tags: /* @__PURE__ */ new Set()
        };
      });
    });
  };
  var inputs = function(input, View2, world2) {
    const { methods: methods19 } = world2;
    const doc = new View2([]);
    doc.world = world2;
    if (typeof input === "number") {
      input = String(input);
    }
    if (!input) {
      return doc;
    }
    if (typeof input === "string") {
      const document = methods19.one.tokenize.fromString(input, world2);
      return new View2(document);
    }
    if (isObject2(input) && input.isView) {
      return new View2(input.document, input.ptrs);
    }
    if (Array.isArray(input)) {
      if (Array.isArray(input[0])) {
        const document2 = preTokenized(input);
        return new View2(document2);
      }
      const document = fromJson(input);
      return new View2(document);
    }
    return doc;
  };
  var inputs_default = inputs;

  // node_modules/compromise/src/nlp.js
  var world = { ...world_default };
  var nlp = function nlp2(input, lex) {
    if (lex) {
      nlp2.addWords(lex);
    }
    const doc = inputs_default(input, View_default, world);
    if (input) {
      if (debug_default.hooks) {
        debug_default.hooks(doc, world.hooks);
      } else {
        doc.compute(world.hooks);
      }
    }
    return doc;
  };
  Object.defineProperty(nlp, "_world", {
    value: world,
    writable: true
  });
  nlp.tokenize = function(input, lex) {
    const { compute: compute4 } = this._world;
    if (lex) {
      nlp.addWords(lex);
    }
    const doc = inputs_default(input, View_default, world);
    if (debug_default.hooks) {
      debug_default.hooks(doc, compute4.contractions ? ["alias", "normal", "machine", "contractions"] : []);
    } else if (compute4.contractions) {
      doc.compute(["alias", "normal", "machine", "contractions"]);
    }
    return doc;
  };
  nlp.plugin = function(plugin7) {
    extend_default(plugin7, this._world, View_default, this);
    return this;
  };
  nlp.extend = nlp.plugin;
  nlp.world = function() {
    return this._world;
  };
  nlp.model = function() {
    return this._world.model;
  };
  nlp.methods = function() {
    return this._world.methods;
  };
  nlp.hooks = function() {
    return this._world.hooks;
  };
  nlp.verbose = verbose;
  nlp.version = version_default;
  var nlp_default = nlp;

  // node_modules/compromise/src/1-one/cache/methods/cacheDoc.js
  var createCache = function(document) {
    const cache2 = document.map((terms) => {
      const items = /* @__PURE__ */ new Set();
      terms.forEach((term) => {
        if (term.normal !== "") {
          items.add(term.normal);
        }
        if (term.switch) {
          items.add(`%${term.switch}%`);
        }
        if (term.implicit) {
          items.add(term.implicit);
        }
        if (term.machine) {
          items.add(term.machine);
        }
        if (term.root) {
          items.add(term.root);
        }
        if (term.alias) {
          term.alias.forEach((str) => items.add(str));
        }
        term.tags.forEach((tag) => {
          items.add("#" + tag);
        });
      });
      return items;
    });
    return cache2;
  };
  var cacheDoc_default = createCache;

  // node_modules/compromise/src/1-one/cache/methods/index.js
  var methods_default2 = {
    one: {
      cacheDoc: cacheDoc_default
    }
  };

  // node_modules/compromise/src/1-one/cache/api.js
  var methods3 = {
    /** */
    cache: function() {
      this._cache = this.methods.one.cacheDoc(this.document);
      return this;
    },
    /** */
    uncache: function() {
      this._cache = null;
      return this;
    }
  };
  var addAPI = function(View2) {
    Object.assign(View2.prototype, methods3);
  };
  var api_default = addAPI;

  // node_modules/compromise/src/1-one/cache/compute.js
  var compute_default2 = {
    cache: function(view) {
      view._cache = view.methods.one.cacheDoc(view.document);
    }
  };

  // node_modules/compromise/src/1-one/cache/plugin.js
  var plugin_default = {
    api: api_default,
    compute: compute_default2,
    methods: methods_default2
  };

  // node_modules/compromise/src/1-one/change/api/case.js
  var case_default = {
    /** */
    toLowerCase: function() {
      this.termList().forEach((t2) => {
        t2.text = t2.text.toLowerCase();
      });
      return this;
    },
    /** */
    toUpperCase: function() {
      this.termList().forEach((t2) => {
        t2.text = t2.text.toUpperCase();
      });
      return this;
    },
    /** */
    toTitleCase: function() {
      this.termList().forEach((t2) => {
        t2.text = t2.text.replace(/^ *[a-z\u00C0-\u00FF]/, (x) => x.toUpperCase());
      });
      return this;
    },
    /** */
    toCamelCase: function() {
      this.docs.forEach((terms) => {
        terms.forEach((t2, i3) => {
          if (i3 !== 0) {
            t2.text = t2.text.replace(/^ *[a-z\u00C0-\u00FF]/, (x) => x.toUpperCase());
          }
          if (i3 !== terms.length - 1) {
            t2.post = "";
          }
        });
      });
      return this;
    }
  };

  // node_modules/compromise/src/1-one/change/api/lib/insert.js
  var isTitleCase = (str) => new RegExp("^\\p{Lu}[\\p{Ll}'\u2019]", "u").test(str) || new RegExp("^\\p{Lu}$", "u").test(str);
  var toTitleCase = (str) => str.replace(new RegExp("^\\p{Ll}", "u"), (x) => x.toUpperCase());
  var toLowerCase = (str) => str.replace(new RegExp("^\\p{Lu}", "u"), (x) => x.toLowerCase());
  var spliceArr = (parent, index3, child) => {
    child.forEach((term) => term.dirty = true);
    if (parent) {
      parent.splice(index3, 0, ...child);
    }
    return parent;
  };
  var endSpace = function(terms) {
    const hasSpace2 = / $/;
    const hasDash3 = /[-–—]/;
    const lastTerm = terms.at(-1);
    if (lastTerm && !hasSpace2.test(lastTerm.post) && !hasDash3.test(lastTerm.post)) {
      lastTerm.post += " ";
    }
  };
  var movePunct = (source, end2, needle) => {
    const juicy = /[-.?!,;:)–—'"]/g;
    const wasLast = source[end2 - 1];
    if (!wasLast) {
      return;
    }
    const post = wasLast.post;
    if (juicy.test(post)) {
      const punct = post.match(juicy).join("");
      const last = needle.at(-1);
      last.post = punct + last.post;
      wasLast.post = wasLast.post.replace(juicy, "");
    }
  };
  var moveTitleCase = function(home, start2, needle) {
    const from = home[start2];
    if (start2 !== 0 || !isTitleCase(from.text)) {
      return;
    }
    needle[0].text = toTitleCase(needle[0].text);
    const old = home[start2];
    if (old.tags.has("ProperNoun") || old.tags.has("Acronym")) {
      return;
    }
    if (isTitleCase(old.text) && old.text.length > 1) {
      old.text = toLowerCase(old.text);
    }
  };
  var cleanPrepend = function(home, ptr, needle, document) {
    const [n2, start2, end2] = ptr;
    if (start2 === 0) {
      endSpace(needle);
    } else if (end2 === document[n2].length) {
      endSpace(needle);
    } else {
      endSpace(needle);
      endSpace([home[ptr[1]]]);
    }
    moveTitleCase(home, start2, needle);
    spliceArr(home, start2, needle);
  };
  var cleanAppend = function(home, ptr, needle, document) {
    const [n2, , end2] = ptr;
    const total = (document[n2] || []).length;
    if (end2 < total) {
      movePunct(home, end2, needle);
      endSpace(needle);
    } else if (total === end2) {
      endSpace(home);
      movePunct(home, end2, needle);
      if (document[n2 + 1]) {
        needle.at(-1).post += " ";
      }
    }
    spliceArr(home, ptr[2], needle);
    ptr[4] = needle.at(-1).id;
  };

  // node_modules/compromise/src/1-one/change/compute/uuid.js
  var index = 0;
  var pad3 = (str) => {
    str = str.length < 3 ? "0" + str : str;
    return str.length < 3 ? "0" + str : str;
  };
  var toId = function(term) {
    let [n2, i3] = term.index || [0, 0];
    index += 1;
    index = index > 46655 ? 0 : index;
    n2 = n2 > 46655 ? 0 : n2;
    i3 = i3 > 1294 ? 0 : i3;
    let id = pad3(index.toString(36));
    id += pad3(n2.toString(36));
    let tx = i3.toString(36);
    tx = tx.length < 2 ? "0" + tx : tx;
    id += tx;
    const r = parseInt(Math.random() * 36, 10);
    id += r.toString(36);
    return term.normal + "|" + id.toUpperCase();
  };
  var uuid_default = toId;

  // node_modules/compromise/src/1-one/change/api/insert.js
  var expand = function(m3) {
    if (m3.has("@hasContraction") && typeof m3.contractions === "function") {
      const more = m3.grow("@hasContraction");
      more.contractions().expand();
    }
  };
  var addIds = function(terms) {
    terms = terms.map((term) => {
      term.id = uuid_default(term);
      return term;
    });
    return terms;
  };
  var getTerms = function(input, world2) {
    const { methods: methods19 } = world2;
    if (typeof input === "string") {
      return methods19.one.tokenize.fromString(input, world2)[0];
    }
    if (typeof input === "object" && input.isView) {
      return input.clone().docs[0] || [];
    }
    if (Array.isArray(input)) {
      return Array.isArray(input[0]) ? input[0] : input;
    }
    return [];
  };
  var insert = function(input, view, prepend) {
    const { document, world: world2 } = view;
    view.uncache();
    const ptrs = view.fullPointer;
    const selfPtrs = view.fullPointer;
    view.forEach((m3, i3) => {
      const ptr = m3.fullPointer[0];
      const [n2] = ptr;
      const home = document[n2];
      let terms = getTerms(input, world2);
      if (terms.length === 0) {
        return;
      }
      terms = addIds(terms);
      if (prepend) {
        expand(view.update([ptr]).firstTerm());
        cleanPrepend(home, ptr, terms, document);
      } else {
        expand(view.update([ptr]).lastTerm());
        cleanAppend(home, ptr, terms, document);
      }
      if (document[n2]?.[ptr[1]]) {
        ptr[3] = document[n2][ptr[1]].id;
      }
      selfPtrs[i3] = ptr;
      ptr[2] += terms.length;
      ptrs[i3] = ptr;
    });
    const doc = view.toView(ptrs);
    view.ptrs = selfPtrs;
    doc.compute(["id", "index", "freeze", "lexicon"]);
    if (doc.world.compute.preTagger) {
      doc.compute("preTagger");
    }
    doc.compute("unfreeze");
    return doc;
  };
  var fns2 = {
    insertAfter: function(input) {
      return insert(input, this, false);
    },
    insertBefore: function(input) {
      return insert(input, this, true);
    }
  };
  fns2.append = fns2.insertAfter;
  fns2.prepend = fns2.insertBefore;
  fns2.insert = fns2.insertAfter;
  var insert_default = fns2;

  // node_modules/compromise/src/1-one/change/api/replace.js
  var dollarStub = /\$[0-9a-z]+/g;
  var fns3 = {};
  var isTitleCase2 = (str) => new RegExp("^\\p{Lu}[\\p{Ll}'\u2019]", "u").test(str) || new RegExp("^\\p{Lu}$", "u").test(str);
  var toTitleCase2 = (str) => str.replace(new RegExp("^\\p{Ll}", "u"), (x) => x.toUpperCase());
  var toLowerCase2 = (str) => str.replace(new RegExp("^\\p{Lu}", "u"), (x) => x.toLowerCase());
  var replaceByFn = function(main, fn, keep10) {
    main.forEach((m3) => {
      const out3 = fn(m3);
      m3.replaceWith(out3, keep10);
    });
    return main;
  };
  var subDollarSign = function(input, main) {
    if (typeof input !== "string") {
      return input;
    }
    const groups2 = main.groups();
    input = input.replace(dollarStub, (a) => {
      const num = a.replace(/\$/, "");
      if (Object.hasOwn(groups2, num)) {
        return groups2[num].text();
      }
      return a;
    });
    return input;
  };
  fns3.replaceWith = function(input, keep10 = {}) {
    let ptrs = this.fullPointer;
    if (keep10 === true) {
      keep10 = {
        tags: true,
        case: true,
        possessives: true
      };
    }
    const main = this;
    this.uncache();
    if (typeof input === "function") {
      return replaceByFn(main, input, keep10);
    }
    const terms = main.docs[0];
    if (!terms) return main;
    const isOriginalPossessive = keep10.possessives && terms.at(-1).tags.has("Possessive");
    const isOriginalTitleCase = keep10.case && isTitleCase2(terms[0].text);
    input = subDollarSign(input, main);
    const original = this.update(ptrs);
    ptrs = ptrs.map((ptr) => ptr.slice(0, 3));
    let oldTags = (original.docs[0] || []).map((term) => Array.from(term.tags));
    const originalPre = original.docs[0][0].pre;
    const originalPost = original.docs[0].at(-1).post;
    if (typeof input === "string") {
      input = this.fromText(input).compute("id");
    }
    main.insertAfter(input);
    if (original.has("@hasContraction") && main.contractions) {
      const more = main.grow("@hasContraction+");
      more.contractions().expand();
    }
    main.delete(original);
    if (isOriginalPossessive) {
      const tmp = main.docs[0];
      const term = tmp.at(-1);
      if (!term.tags.has("Possessive")) {
        term.text += "'s";
        term.normal += "'s";
        term.tags.add("Possessive");
      }
    }
    if (originalPre && main.docs[0]) {
      main.docs[0][0].pre = originalPre;
    }
    if (originalPost && main.docs[0]) {
      const lastOne = main.docs[0].at(-1);
      if (!lastOne.post.trim()) {
        lastOne.post = originalPost;
      }
    }
    const m3 = main.toView(ptrs).compute(["index", "freeze", "lexicon"]);
    if (m3.world.compute.preTagger) {
      m3.compute("preTagger");
    }
    m3.compute("unfreeze");
    if (keep10.tags) {
      oldTags = oldTags.slice(0, input.wordCount());
      m3.terms().forEach((term, i3) => {
        term.tagSafe(oldTags[i3]);
      });
    }
    if (!m3.docs[0] || !m3.docs[0][0]) return m3;
    if (keep10.case) {
      const transformCase = isOriginalTitleCase ? toTitleCase2 : toLowerCase2;
      m3.docs[0][0].text = transformCase(m3.docs[0][0].text);
    }
    return m3;
  };
  fns3.replace = function(match2, input, keep10) {
    if (match2 && !input) {
      return this.replaceWith(match2, keep10);
    }
    const m3 = this.match(match2);
    if (!m3.found) {
      return this;
    }
    this.soften();
    return m3.replaceWith(input, keep10);
  };
  var replace_default = fns3;

  // node_modules/compromise/src/1-one/change/api/lib/remove.js
  var removeRunBefore = (str, run, following) => {
    let i3 = 0;
    while (i3 < str.length) {
      if (!run.includes(str[i3])) {
        i3++;
        continue;
      }
      const start2 = i3;
      while (i3 < str.length && run.includes(str[i3])) i3++;
      if (i3 < str.length && following.includes(str[i3])) {
        return str.slice(0, start2) + str.slice(i3);
      }
    }
    return str;
  };
  var repairPunct = function(terms, len) {
    const last = terms.length - 1;
    const from = terms[last];
    const to = terms[last - len];
    if (to && from) {
      to.post += from.post;
      to.post = removeRunBefore(to.post, " ", ".?!,;:");
      to.post = removeRunBefore(to.post, ",;:", ".?!");
    }
  };
  var pluckOut = function(document, nots) {
    nots.forEach((ptr) => {
      const [n2, start2, end2] = ptr;
      const len = end2 - start2;
      if (!document[n2]) {
        return;
      }
      if (end2 === document[n2].length && end2 > 1) {
        repairPunct(document[n2], len);
      }
      document[n2].splice(start2, len);
    });
    for (let i3 = document.length - 1; i3 >= 0; i3 -= 1) {
      if (document[i3].length === 0) {
        document.splice(i3, 1);
        if (i3 === document.length && document[i3 - 1]) {
          const terms = document[i3 - 1];
          const lastTerm = terms.at(-1);
          if (lastTerm) {
            lastTerm.post = lastTerm.post.trimEnd();
          }
        }
      }
    }
    return document;
  };
  var remove_default = pluckOut;

  // node_modules/compromise/src/1-one/change/api/remove.js
  var fixPointers = function(ptrs, gonePtrs) {
    ptrs = ptrs.map((ptr) => {
      const [n2] = ptr;
      if (!gonePtrs[n2]) {
        return ptr;
      }
      gonePtrs[n2].forEach((no) => {
        const len = no[2] - no[1];
        if (ptr[1] <= no[1] && ptr[2] >= no[2]) {
          ptr[2] -= len;
        }
      });
      return ptr;
    });
    ptrs.forEach((ptr, i3) => {
      if (ptr[1] === 0 && ptr[2] == 0) {
        for (let n2 = i3 + 1; n2 < ptrs.length; n2 += 1) {
          ptrs[n2][0] -= 1;
          if (ptrs[n2][0] < 0) {
            ptrs[n2][0] = 0;
          }
        }
      }
    });
    ptrs = ptrs.filter((ptr) => ptr[2] - ptr[1] > 0);
    ptrs = ptrs.map((ptr) => {
      ptr[3] = null;
      ptr[4] = null;
      return ptr;
    });
    return ptrs;
  };
  var methods4 = {
    /** */
    remove: function(reg) {
      const { indexN: indexN2 } = this.methods.one.pointer;
      this.uncache();
      let self = this.all();
      let not = this;
      if (reg) {
        self = this;
        not = this.match(reg);
      }
      const isFull = !self.ptrs;
      if (not.has("@hasContraction") && not.contractions) {
        const more = not.grow("@hasContraction");
        more.contractions().expand();
      }
      let ptrs = self.fullPointer;
      const nots = not.fullPointer.reverse();
      const document = remove_default(this.document, nots);
      const gonePtrs = indexN2(nots);
      ptrs = fixPointers(ptrs, gonePtrs);
      self.ptrs = ptrs;
      self.document = document;
      self.compute("index");
      if (isFull) {
        self.ptrs = void 0;
      }
      if (!reg) {
        this.ptrs = [];
        return self.none();
      }
      const res = self.toView(ptrs);
      return res;
    }
  };
  methods4.delete = methods4.remove;
  var remove_default2 = methods4;

  // node_modules/compromise/src/1-one/change/api/whitespace.js
  var methods5 = {
    /** add this punctuation or whitespace before each match: */
    pre: function(str, concat) {
      if (str === void 0 && this.found) {
        return this.docs[0][0].pre;
      }
      this.docs.forEach((terms) => {
        const term = terms[0];
        if (concat === true) {
          term.pre += str;
        } else {
          term.pre = str;
        }
      });
      return this;
    },
    /** add this punctuation or whitespace after each match: */
    post: function(str, concat) {
      if (str === void 0) {
        const last = this.docs.at(-1);
        return last.at(-1).post;
      }
      this.docs.forEach((terms) => {
        const term = terms.at(-1);
        if (concat === true) {
          term.post += str;
        } else {
          term.post = str;
        }
      });
      return this;
    },
    /** remove whitespace from start/end */
    trim: function() {
      if (!this.found) {
        return this;
      }
      const docs = this.docs;
      const start2 = docs[0][0];
      start2.pre = start2.pre.trimStart();
      const last = docs.at(-1);
      const end2 = last.at(-1);
      end2.post = end2.post.trimEnd();
      return this;
    },
    /** connect words with hyphen, and remove whitespace */
    hyphenate: function() {
      this.docs.forEach((terms) => {
        terms.forEach((t2, i3) => {
          if (i3 !== 0) {
            t2.pre = "";
          }
          if (terms[i3 + 1]) {
            t2.post = "-";
          }
        });
      });
      return this;
    },
    /** remove hyphens between words, and set whitespace */
    dehyphenate: function() {
      const hasHyphen3 = /[-–—]/;
      this.docs.forEach((terms) => {
        terms.forEach((t2) => {
          if (hasHyphen3.test(t2.post)) {
            t2.post = " ";
          }
        });
      });
      return this;
    },
    /** add quotations around these matches */
    toQuotations: function(start2, end2) {
      start2 ||= `"`;
      end2 ||= `"`;
      this.docs.forEach((terms) => {
        terms[0].pre = start2 + terms[0].pre;
        const last = terms.at(-1);
        last.post = end2 + last.post;
      });
      return this;
    },
    /** add brackets around these matches */
    toParentheses: function(start2, end2) {
      start2 ||= `(`;
      end2 ||= `)`;
      this.docs.forEach((terms) => {
        terms[0].pre = start2 + terms[0].pre;
        const last = terms.at(-1);
        last.post = end2 + last.post;
      });
      return this;
    }
  };
  methods5.deHyphenate = methods5.dehyphenate;
  methods5.toQuotation = methods5.toQuotations;
  var whitespace_default = methods5;

  // node_modules/compromise/src/1-one/change/api/lib/_sort.js
  var alpha = (a, b2) => {
    if (a.normal < b2.normal) {
      return -1;
    }
    if (a.normal > b2.normal) {
      return 1;
    }
    return 0;
  };
  var length = (a, b2) => {
    const left = a.normal.trim().length;
    const right = b2.normal.trim().length;
    if (left < right) {
      return 1;
    }
    if (left > right) {
      return -1;
    }
    return 0;
  };
  var wordCount = (a, b2) => {
    if (a.words < b2.words) {
      return 1;
    }
    if (a.words > b2.words) {
      return -1;
    }
    return 0;
  };
  var sequential = (a, b2) => {
    if (a[0] < b2[0]) {
      return 1;
    }
    if (a[0] > b2[0]) {
      return -1;
    }
    return a[1] > b2[1] ? 1 : -1;
  };
  var byFreq = function(arr) {
    const counts = /* @__PURE__ */ Object.create(null);
    arr.forEach((o) => {
      counts[o.normal] ??= 0;
      counts[o.normal] += 1;
    });
    arr.sort((a, b2) => {
      const left = counts[a.normal];
      const right = counts[b2.normal];
      if (left < right) {
        return 1;
      }
      if (left > right) {
        return -1;
      }
      return 0;
    });
    return arr;
  };
  var sort_default = { alpha, length, wordCount, sequential, byFreq };

  // node_modules/compromise/src/1-one/change/api/sort.js
  var seqNames = /* @__PURE__ */ new Set(["index", "sequence", "seq", "sequential", "chron", "chronological"]);
  var freqNames = /* @__PURE__ */ new Set(["freq", "frequency", "topk", "repeats"]);
  var alphaNames = /* @__PURE__ */ new Set(["alpha", "alphabetical"]);
  var customSort = function(view, fn) {
    let ptrs = view.fullPointer;
    ptrs = ptrs.sort((a, b2) => {
      a = view.update([a]);
      b2 = view.update([b2]);
      return fn(a, b2);
    });
    view.ptrs = ptrs;
    return view;
  };
  var sort = function(input) {
    const { docs, pointer } = this;
    this.uncache();
    if (typeof input === "function") {
      return customSort(this, input);
    }
    input ||= "alpha";
    const ptrs = pointer || docs.map((_d, n2) => [n2]);
    let arr = docs.map((terms, n2) => {
      return {
        index: n2,
        words: terms.length,
        normal: terms.map((t2) => t2.machine || t2.normal || "").join(" "),
        pointer: ptrs[n2]
      };
    });
    if (seqNames.has(input)) {
      input = "sequential";
    }
    if (alphaNames.has(input)) {
      input = "alpha";
    }
    if (freqNames.has(input)) {
      arr = sort_default.byFreq(arr);
      return this.update(arr.map((o) => o.pointer));
    }
    if (typeof sort_default[input] === "function") {
      arr = arr.sort(sort_default[input]);
      return this.update(arr.map((o) => o.pointer));
    }
    return this;
  };
  var reverse = function() {
    let ptrs = this.pointer || this.docs.map((_d, n2) => [n2]);
    ptrs = [].concat(ptrs);
    ptrs = ptrs.reverse();
    if (this._cache) {
      this._cache = this._cache.reverse();
    }
    return this.update(ptrs);
  };
  var unique = function() {
    const already = /* @__PURE__ */ new Set();
    const res = this.filter((m3) => {
      const txt = m3.text("machine");
      if (already.has(txt)) {
        return false;
      }
      already.add(txt);
      return true;
    });
    return res;
  };
  var sort_default2 = { unique, reverse, sort };

  // node_modules/compromise/src/1-one/change/api/concat.js
  var combineDocs = function(homeDocs, inputDocs) {
    if (homeDocs.length > 0) {
      const end2 = homeDocs.at(-1);
      const last = end2.at(-1);
      if (/ /.test(last.post) === false) {
        last.post += " ";
      }
    }
    homeDocs = homeDocs.concat(inputDocs);
    return homeDocs;
  };
  var combineViews = function(home, input) {
    if (home.document === input.document) {
      const ptrs2 = home.fullPointer.concat(input.fullPointer);
      return home.toView(ptrs2).compute("index");
    }
    const ptrs = input.fullPointer;
    ptrs.forEach((a) => {
      a[0] += home.document.length;
    });
    home.document = combineDocs(home.document, input.docs);
    return home.all();
  };
  var concat_default = {
    // add string as new match/sentence
    concat: function(input) {
      if (typeof input === "string") {
        const more = this.fromText(input);
        if (!this.found || !this.ptrs) {
          this.document = this.document.concat(more.document);
        } else {
          const ptrs = this.fullPointer;
          const at = ptrs.at(-1)[0];
          this.document.splice(at, 0, ...more.document);
        }
        return this.all().compute("index");
      }
      if (typeof input === "object" && input.isView) {
        return combineViews(this, input);
      }
      if (Array.isArray(input)) {
        const docs = combineDocs(this.document, input);
        this.document = docs;
        return this.all();
      }
      return this;
    }
  };

  // node_modules/compromise/src/1-one/change/api/harden.js
  var harden = function() {
    this.ptrs = this.fullPointer;
    return this;
  };
  var soften = function() {
    let ptr = this.ptrs;
    if (!ptr || ptr.length === 0) {
      return this;
    }
    ptr = ptr.map((a) => a.slice(0, 3));
    this.ptrs = ptr;
    return this;
  };
  var harden_default = { harden, soften };

  // node_modules/compromise/src/1-one/change/api/index.js
  var methods6 = { ...case_default, ...insert_default, ...replace_default, ...remove_default2, ...whitespace_default, ...sort_default2, ...concat_default, ...harden_default };
  var addAPI2 = function(View2) {
    Object.assign(View2.prototype, methods6);
  };
  var api_default2 = addAPI2;

  // node_modules/compromise/src/1-one/change/compute/index.js
  var compute2 = {
    id: function(view) {
      const docs = view.docs;
      for (let n2 = 0; n2 < docs.length; n2 += 1) {
        for (let i3 = 0; i3 < docs[n2].length; i3 += 1) {
          const term = docs[n2][i3];
          term.id ||= uuid_default(term);
        }
      }
    }
  };
  var compute_default3 = compute2;

  // node_modules/compromise/src/1-one/change/plugin.js
  var plugin_default2 = {
    api: api_default2,
    compute: compute_default3
  };

  // node_modules/compromise/src/1-one/contraction-one/model/contractions.js
  var contractions_default = [
    // simple mappings
    { word: "@", out: ["at"] },
    { word: "arent", out: ["are", "not"] },
    { word: "alot", out: ["a", "lot"] },
    { word: "brb", out: ["be", "right", "back"] },
    { word: "cannot", out: ["can", "not"] },
    { word: "dun", out: ["do", "not"] },
    { word: "can't", out: ["can", "not"] },
    { word: "shan't", out: ["should", "not"] },
    { word: "won't", out: ["will", "not"] },
    { word: "that's", out: ["that", "is"] },
    { word: "what's", out: ["what", "is"] },
    { word: "let's", out: ["let", "us"] },
    // { word: "there's", out: ['there', 'is'] },
    { word: "dunno", out: ["do", "not", "know"] },
    { word: "gonna", out: ["going", "to"] },
    { word: "gotta", out: ["have", "got", "to"] },
    //hmm
    { word: "gimme", out: ["give", "me"] },
    { word: "outta", out: ["out", "of"] },
    { word: "tryna", out: ["trying", "to"] },
    { word: "gtg", out: ["got", "to", "go"] },
    { word: "im", out: ["i", "am"] },
    { word: "imma", out: ["I", "will"] },
    { word: "imo", out: ["in", "my", "opinion"] },
    { word: "irl", out: ["in", "real", "life"] },
    { word: "ive", out: ["i", "have"] },
    { word: "rn", out: ["right", "now"] },
    { word: "tbh", out: ["to", "be", "honest"] },
    { word: "wanna", out: ["want", "to"] },
    { word: `c'mere`, out: ["come", "here"] },
    { word: `c'mon`, out: ["come", "on"] },
    // shoulda, coulda
    { word: "shoulda", out: ["should", "have"] },
    { word: "coulda", out: ["coulda", "have"] },
    { word: "woulda", out: ["woulda", "have"] },
    { word: "musta", out: ["must", "have"] },
    { word: "tis", out: ["it", "is"] },
    { word: "twas", out: ["it", "was"] },
    { word: `y'know`, out: ["you", "know"] },
    { word: "ne'er", out: ["never"] },
    { word: "o'er", out: ["over"] },
    // contraction-part mappings
    { after: "ll", out: ["will"] },
    { after: "ve", out: ["have"] },
    { after: "re", out: ["are"] },
    { after: "m", out: ["am"] },
    // french contractions
    { before: "c", out: ["ce"] },
    { before: "m", out: ["me"] },
    { before: "n", out: ["ne"] },
    { before: "qu", out: ["que"] },
    { before: "s", out: ["se"] },
    { before: "t", out: ["tu"] },
    // t'aime
    // missing apostrophes
    { word: "shouldnt", out: ["should", "not"] },
    { word: "couldnt", out: ["could", "not"] },
    { word: "wouldnt", out: ["would", "not"] },
    { word: "hasnt", out: ["has", "not"] },
    { word: "wasnt", out: ["was", "not"] },
    { word: "isnt", out: ["is", "not"] },
    { word: "cant", out: ["can", "not"] },
    { word: "dont", out: ["do", "not"] },
    { word: "wont", out: ["will", "not"] },
    // apostrophe d
    { word: "howd", out: ["how", "did"] },
    { word: "whatd", out: ["what", "did"] },
    { word: "whend", out: ["when", "did"] },
    { word: "whered", out: ["where", "did"] }
  ];

  // node_modules/compromise/src/1-one/contraction-one/model/number-suffix.js
  var t = true;
  var number_suffix_default = {
    "st": t,
    "nd": t,
    "rd": t,
    "th": t,
    "am": t,
    "pm": t,
    "max": t,
    "\xB0": t,
    "s": t,
    // 1990s
    "e": t,
    // 18e - french/spanish ordinal
    "er": t,
    //french 1er
    "\xE8re": t,
    //''
    "\xE8me": t
    //french 2ème
  };

  // node_modules/compromise/src/1-one/contraction-one/model/index.js
  var model_default = {
    one: {
      contractions: contractions_default,
      numberSuffixes: number_suffix_default
    }
  };

  // node_modules/compromise/src/API/debug/contractions-debug.js
  var contractionDebug = (term, expansion) => {
    if (!debug_default.contractions || debug_default.word && debug_default.word !== (term.normal || term.text).toLowerCase()) {
      return;
    }
    debug_default.rule = void 0;
    const result = expansion ? "[" + expansion.map((word) => yellow(`'${word}'`)).join(", ") + "]" : "possessive (kept)";
    console.log(`${debug_default.prefix || "   "}${yellow(JSON.stringify(term.text))} \u2192  ${result}`);
  };
  var contractions_debug_default = contractionDebug;

  // node_modules/compromise/src/1-one/contraction-one/compute/contractions/_splice.js
  var insertContraction = function(document, point, words) {
    const [n2, w] = point;
    if (!words || words.length === 0) {
      return;
    }
    words = words.map((word, i3) => {
      word.implicit = word.text;
      word.machine = word.text;
      word.pre = "";
      word.post = "";
      word.text = "";
      word.normal = "";
      word.index = [n2, w + i3];
      return word;
    });
    if (words[0]) {
      words[0].pre = document[n2][w].pre;
      words[words.length - 1].post = document[n2][w].post;
      words[0].text = document[n2][w].text;
      words[0].normal = document[n2][w].normal;
    }
    document[n2].splice(w, 1, ...words);
  };
  var splice_default = insertContraction;

  // node_modules/compromise/src/1-one/contraction-one/compute/contractions/apostrophe-d.js
  var hasContraction = /'/;
  var alwaysDid = /* @__PURE__ */ new Set([
    "what",
    "how",
    "when",
    "where",
    "why"
  ]);
  var useWould = /* @__PURE__ */ new Set([
    "be",
    "go",
    "start",
    "think",
    "need"
  ]);
  var useHad = /* @__PURE__ */ new Set([
    "been",
    "gone"
  ]);
  var _apostropheD = function(terms, i3) {
    const before3 = terms[i3].normal.split(hasContraction)[0];
    if (alwaysDid.has(before3)) {
      return [before3, "did"];
    }
    if (terms[i3 + 1]) {
      if (useHad.has(terms[i3 + 1].normal)) {
        return [before3, "had"];
      }
      if (useWould.has(terms[i3 + 1].normal)) {
        return [before3, "would"];
      }
    }
    return null;
  };
  var apostrophe_d_default = _apostropheD;

  // node_modules/compromise/src/1-one/contraction-one/compute/contractions/apostrophe-t.js
  var apostropheT = function(terms, i3) {
    if (terms[i3].normal === "ain't" || terms[i3].normal === "aint") {
      return null;
    }
    const before3 = terms[i3].normal.replace(/n't/, "");
    return [before3, "not"];
  };
  var apostrophe_t_default = apostropheT;

  // node_modules/compromise/src/1-one/contraction-one/compute/contractions/french.js
  var hasContraction2 = /'/;
  var isFeminine = /(e|é|aison|sion|tion)$/;
  var isMasculine = /(age|isme|acle|ege|oire)$/;
  var preL = (terms, i3) => {
    const after2 = terms[i3].normal.split(hasContraction2)[1];
    if (after2 && after2.endsWith("e")) {
      return ["la", after2];
    }
    return ["le", after2];
  };
  var preD = (terms, i3) => {
    const after2 = terms[i3].normal.split(hasContraction2)[1];
    if (after2 && isFeminine.test(after2) && !isMasculine.test(after2)) {
      return ["du", after2];
    } else if (after2 && after2.endsWith("s")) {
      return ["des", after2];
    }
    return ["de", after2];
  };
  var preJ = (terms, i3) => {
    const after2 = terms[i3].normal.split(hasContraction2)[1];
    return ["je", after2];
  };
  var french_default = {
    preJ,
    preL,
    preD
  };

  // node_modules/compromise/src/1-one/contraction-one/compute/contractions/number-range.js
  var isRange = /^([0-9.]{1,4}[a-z]{0,2}) ?[-–—] ?([0-9]{1,4}[a-z]{0,2})$/i;
  var timeRange = /^([0-9]{1,2}(:[0-9][0-9])?(am|pm)?) ?[-–—] ?([0-9]{1,2}(:[0-9][0-9])?(am|pm)?)$/i;
  var phoneNum = /^[0-9]{3}-[0-9]{4}$/;
  var numberRange = function(terms, i3) {
    const term = terms[i3];
    let parts2 = term.text.match(isRange);
    if (parts2 !== null) {
      if (term.tags.has("PhoneNumber") === true || phoneNum.test(term.text)) {
        return null;
      }
      return [parts2[1], "to", parts2[2]];
    } else {
      parts2 = term.text.match(timeRange);
      if (parts2 !== null) {
        return [parts2[1], "to", parts2[4]];
      }
    }
    return null;
  };
  var number_range_default = numberRange;

  // node_modules/compromise/src/1-one/contraction-one/compute/contractions/number-unit.js
  var numUnit = /^([+-]?[0-9][.,0-9]*)([a-z°²³µ/]+)$/;
  var numberUnit = function(terms, i3, world2) {
    const notUnit = world2.model.one.numberSuffixes || {};
    const term = terms[i3];
    const parts2 = term.text.match(numUnit);
    if (parts2 !== null) {
      const unit2 = parts2[2].toLowerCase().trim();
      if (Object.hasOwn(notUnit, unit2)) {
        return null;
      }
      return [parts2[1], unit2];
    }
    return null;
  };
  var number_unit_default = numberUnit;

  // node_modules/compromise/src/1-one/contraction-one/compute/contractions/index.js
  var byApostrophe = /'/;
  var numDash = /^[0-9][^-–—]*[-–—].*?[0-9]/;
  var reTag = function(terms, view, start2, len) {
    const tmp = view.update();
    tmp.document = [terms];
    let end2 = start2 + len;
    if (start2 > 0) {
      start2 -= 1;
    }
    if (terms[end2]) {
      end2 += 1;
    }
    tmp.ptrs = [[0, start2, end2]];
  };
  var byEnd = {
    // ain't
    t: (terms, i3) => apostrophe_t_default(terms, i3),
    // how'd
    d: (terms, i3) => apostrophe_d_default(terms, i3)
  };
  var byStart = {
    // j'aime
    j: (terms, i3) => french_default.preJ(terms, i3),
    // l'amour
    l: (terms, i3) => french_default.preL(terms, i3),
    // d'amerique
    d: (terms, i3) => french_default.preD(terms, i3)
  };
  var knownOnes = function(list4, term, before3, after2) {
    for (let i3 = 0; i3 < list4.length; i3 += 1) {
      const o = list4[i3];
      if (o.word === term.normal) {
        return o.out;
      } else if (after2 !== null && after2 === o.after) {
        return [before3].concat(o.out);
      } else if (before3 !== null && before3 === o.before && after2 && after2.length > 2) {
        return o.out.concat(after2);
      }
    }
    return null;
  };
  var toDocs = function(words, view, term) {
    contractions_debug_default(term, words);
    const doc = view.fromText(words.join(" "));
    doc.compute(["id", "alias"]);
    return doc.docs[0];
  };
  var thereHas = function(terms, i3) {
    for (let k2 = i3 + 1; k2 < 5; k2 += 1) {
      if (!terms[k2]) {
        break;
      }
      if (terms[k2].normal === "been") {
        return ["there", "has"];
      }
    }
    return ["there", "is"];
  };
  var contractions = (view) => {
    const { world: world2, document } = view;
    const { model: model5, methods: methods19 } = world2;
    const list4 = model5.one.contractions || [];
    document.forEach((terms, n2) => {
      for (let i3 = terms.length - 1; i3 >= 0; i3 -= 1) {
        let before3 = null;
        let after2 = null;
        if (byApostrophe.test(terms[i3].normal) === true) {
          const res = terms[i3].normal.split(byApostrophe);
          before3 = res[0];
          after2 = res[1];
        }
        let words = knownOnes(list4, terms[i3], before3, after2);
        if (!words && Object.hasOwn(byEnd, after2)) {
          words = byEnd[after2](terms, i3, world2);
        }
        if (!words && Object.hasOwn(byStart, before3)) {
          words = byStart[before3](terms, i3);
        }
        if (before3 === "there" && after2 === "s") {
          words = thereHas(terms, i3);
        }
        if (words) {
          words = toDocs(words, view, terms[i3]);
          splice_default(document, [n2, i3], words);
          reTag(document[n2], view, i3, words.length);
          continue;
        }
        if (numDash.test(terms[i3].normal)) {
          words = number_range_default(terms, i3);
          if (words) {
            words = toDocs(words, view, terms[i3]);
            splice_default(document, [n2, i3], words);
            methods19.one.setTag(words, "NumberRange", world2);
            if (words[2] && words[2].tags.has("Time")) {
              methods19.one.setTag([words[0]], "Time", world2, null, "time-range");
            }
            reTag(document[n2], view, i3, words.length);
          }
          continue;
        }
        words = number_unit_default(terms, i3, world2);
        if (words) {
          words = toDocs(words, view, terms[i3]);
          splice_default(document, [n2, i3], words);
          methods19.one.setTag([words[1]], "Unit", world2, null, "contraction-unit");
        }
      }
    });
  };
  var contractions_default2 = contractions;

  // node_modules/compromise/src/1-one/contraction-one/compute/index.js
  var compute_default4 = { contractions: contractions_default2 };

  // node_modules/compromise/src/1-one/contraction-one/plugin.js
  var plugin = {
    model: model_default,
    compute: compute_default4,
    hooks: ["contractions"]
  };
  var plugin_default3 = plugin;

  // node_modules/compromise/src/1-one/freeze/compute.js
  var freeze = function(view) {
    const world2 = view.world;
    const { model: model5, methods: methods19 } = view.world;
    const setTag2 = methods19.one.setTag;
    const { frozenLex } = model5.one;
    const multi = model5.one._multiCache || {};
    view.docs.forEach((terms) => {
      for (let i3 = 0; i3 < terms.length; i3 += 1) {
        const t2 = terms[i3];
        const word = t2.machine || t2.normal;
        if (multi[word] !== void 0 && terms[i3 + 1]) {
          const end2 = i3 + multi[word] - 1;
          for (let k2 = end2; k2 > i3; k2 -= 1) {
            const words = terms.slice(i3, k2 + 1);
            const str = words.map((term) => term.machine || term.normal).join(" ");
            if (Object.hasOwn(frozenLex, str) === true) {
              setTag2(words, frozenLex[str], world2, false, "1-frozen-multi-lexicon");
              words.forEach((term) => term.frozen = true);
              continue;
            }
          }
        }
        if (frozenLex[word] !== void 0 && Object.hasOwn(frozenLex, word)) {
          setTag2([t2], frozenLex[word], world2, false, "1-freeze-lexicon");
          t2.frozen = true;
          continue;
        }
      }
    });
  };
  var unfreeze = function(view) {
    view.docs.forEach((ts) => {
      ts.forEach((term) => {
        delete term.frozen;
      });
    });
    return view;
  };
  var compute_default5 = { frozen: freeze, freeze, unfreeze };

  // node_modules/compromise/src/1-one/freeze/debug.js
  var debug2 = function(view) {
    view.docs.forEach((terms) => {
      console.log(blue("\n  \u256D\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500"));
      terms.forEach((t2) => {
        let str = `  ${i(dim("\u2502"))}  `;
        const txt = t2.implicit || t2.text || "-";
        if (t2.frozen === true) {
          str += `${blue(txt)} \u2744\uFE0F`;
        } else {
          str += i(dim(txt));
        }
        console.log(str);
      });
    });
  };
  var debug_default2 = debug2;

  // node_modules/compromise/src/1-one/freeze/plugin.js
  var plugin_default4 = {
    // add .compute('freeze')
    compute: compute_default5,
    mutate: (world2) => {
      const methods19 = world2.methods.one;
      methods19.termMethods.isFrozen = (term) => term.frozen === true;
      methods19.debug.freeze = debug_default2;
      methods19.debug.frozen = debug_default2;
    },
    api: function(View2) {
      View2.prototype.freeze = function() {
        this.docs.forEach((ts) => {
          ts.forEach((term) => {
            term.frozen = true;
          });
        });
        return this;
      };
      View2.prototype.unfreeze = function() {
        this.compute("unfreeze");
      };
      View2.prototype.isFrozen = function() {
        return this.match("@isFrozen+");
      };
    },
    // run it in init
    hooks: ["freeze"]
  };

  // node_modules/compromise/src/1-one/lexicon/compute/multi-word.js
  var multiWord = function(terms, start_i, world2) {
    const { model: model5, methods: methods19 } = world2;
    const setTag2 = methods19.one.setTag;
    const multi = model5.one._multiCache || {};
    const { lexicon: lexicon4 } = model5.one || {};
    const t2 = terms[start_i];
    const word = t2.machine || t2.normal;
    if (multi[word] !== void 0 && terms[start_i + 1]) {
      const end2 = start_i + multi[word] - 1;
      for (let i3 = end2; i3 > start_i; i3 -= 1) {
        const words = terms.slice(start_i, i3 + 1);
        if (words.length <= 1) {
          return false;
        }
        const str = words.map((term) => term.machine || term.normal).join(" ");
        if (Object.hasOwn(lexicon4, str) === true) {
          const tag = lexicon4[str];
          if (tag && tag.includes("PhrasalVerb") && words[words.length - 1].post === "-") {
            continue;
          }
          setTag2(words, tag, world2, false, "1-multi-lexicon");
          if (tag && tag.length === 2 && (tag[0] === "PhrasalVerb" || tag[1] === "PhrasalVerb")) {
            setTag2([words[1]], "Particle", world2, false, "1-phrasal-particle");
          }
          return true;
        }
      }
      return false;
    }
    return null;
  };
  var multi_word_default = multiWord;

  // node_modules/compromise/src/1-one/lexicon/compute/single-word.js
  var prefix = /^(under|over|mis|re|un|dis|semi|pre|post)-?/;
  var allowPrefix = /* @__PURE__ */ new Set(["Verb", "Infinitive", "PastTense", "Gerund", "PresentTense", "Adjective", "Participle"]);
  var checkLexicon = function(terms, i3, world2) {
    const { model: model5, methods: methods19 } = world2;
    const setTag2 = methods19.one.setTag;
    const { lexicon: lexicon4 } = model5.one;
    const t2 = terms[i3];
    const word = t2.machine || t2.normal;
    if (lexicon4[word] !== void 0 && Object.hasOwn(lexicon4, word)) {
      setTag2([t2], lexicon4[word], world2, false, "1-lexicon");
      return true;
    }
    if (t2.machine && Object.hasOwn(lexicon4, t2.normal)) {
      setTag2([t2], lexicon4[t2.normal], world2, false, "1-lexicon-normal");
      return true;
    }
    if (t2.alias) {
      const found = t2.alias.find((str) => Object.hasOwn(lexicon4, str));
      if (found) {
        setTag2([t2], lexicon4[found], world2, false, "1-lexicon-alias");
        return true;
      }
    }
    if (prefix.test(word) === true) {
      const stem = word.replace(prefix, "");
      if (Object.hasOwn(lexicon4, stem) && stem.length > 3) {
        if (allowPrefix.has(lexicon4[stem])) {
          setTag2([t2], lexicon4[stem], world2, false, "1-lexicon-prefix");
          return true;
        }
      }
    }
    return null;
  };
  var single_word_default = checkLexicon;

  // node_modules/compromise/src/1-one/lexicon/compute/index.js
  var lexicon = function(view) {
    const world2 = view.world;
    view.docs.forEach((terms) => {
      for (let i3 = 0; i3 < terms.length; i3 += 1) {
        if (terms[i3].tags.size === 0) {
          let found = null;
          found ||= multi_word_default(terms, i3, world2);
          found ||= single_word_default(terms, i3, world2);
        }
      }
    });
  };
  var compute_default6 = {
    lexicon
  };

  // node_modules/compromise/src/1-one/lexicon/methods/expand.js
  var expand2 = function(words) {
    const lex = {};
    const _multi = {};
    Object.keys(words).forEach((word) => {
      const tag = words[word];
      word = word.toLowerCase().trim();
      word = word.replace(/'s\b/, "");
      const split3 = word.split(/ /);
      if (split3.length > 1) {
        if (_multi[split3[0]] === void 0 || split3.length > _multi[split3[0]]) {
          _multi[split3[0]] = split3.length;
        }
      }
      lex[word] ||= tag;
    });
    delete lex[""];
    delete lex[null];
    delete lex[" "];
    return { lex, _multi };
  };
  var expand_default = expand2;

  // node_modules/compromise/src/1-one/lexicon/methods/index.js
  var methods_default3 = {
    one: {
      expandLexicon: expand_default
    }
  };

  // node_modules/compromise/src/1-one/lexicon/lib.js
  var addWords = function(words, isFrozen = false) {
    const world2 = this.world();
    const { methods: methods19, model: model5 } = world2;
    if (!words) {
      return;
    }
    Object.keys(words).forEach((k2) => {
      if (typeof words[k2] === "string" && words[k2].startsWith("#")) {
        words[k2] = words[k2].replace(/^#/, "");
      }
    });
    if (isFrozen === true) {
      const { lex: lex2, _multi: _multi2 } = methods19.one.expandLexicon(words, world2);
      Object.assign(model5.one._multiCache, _multi2);
      Object.assign(model5.one.frozenLex, lex2);
      return;
    }
    if (methods19.two.expandLexicon) {
      const { lex: lex2, _multi: _multi2 } = methods19.two.expandLexicon(words, world2);
      Object.assign(model5.one.lexicon, lex2);
      Object.assign(model5.one._multiCache, _multi2);
    }
    const { lex, _multi } = methods19.one.expandLexicon(words, world2);
    Object.assign(model5.one.lexicon, lex);
    Object.assign(model5.one._multiCache, _multi);
  };
  var lib_default = { addWords };

  // node_modules/compromise/src/1-one/lexicon/plugin.js
  var model2 = {
    one: {
      lexicon: {},
      //setup blank lexicon
      _multiCache: {},
      frozenLex: {}
      //2nd lexicon
    }
  };
  var plugin_default5 = {
    model: model2,
    methods: methods_default3,
    compute: compute_default6,
    lib: lib_default,
    hooks: ["lexicon"]
  };

  // node_modules/compromise/src/1-one/lookup/api/buildTrie/index.js
  var tokenize2 = function(phrase, world2) {
    const { methods: methods19, model: model5 } = world2;
    const terms = methods19.one.tokenize.splitTerms(phrase, model5).map((t2) => methods19.one.tokenize.splitWhitespace(t2, model5));
    return terms.map((term) => term.text.toLowerCase());
  };
  var buildTrie = function(phrases, world2) {
    const goNext = [{}];
    const endAs = [null];
    const failTo = [0];
    const xs = [];
    let n2 = 0;
    phrases.forEach(function(phrase) {
      let curr = 0;
      const words = tokenize2(phrase, world2);
      for (let i3 = 0; i3 < words.length; i3++) {
        const word = words[i3];
        if (goNext[curr] && Object.hasOwn(goNext[curr], word)) {
          curr = goNext[curr][word];
        } else {
          n2++;
          goNext[curr][word] = n2;
          goNext[n2] = {};
          curr = n2;
          endAs[n2] = null;
        }
      }
      endAs[curr] = [words.length];
    });
    for (const word in goNext[0]) {
      n2 = goNext[0][word];
      failTo[n2] = 0;
      xs.push(n2);
    }
    while (xs.length > 0) {
      const r = xs.shift();
      const keys2 = Object.keys(goNext[r]);
      for (let i3 = 0; i3 < keys2.length; i3 += 1) {
        const word = keys2[i3];
        const s2 = goNext[r][word];
        xs.push(s2);
        n2 = failTo[r];
        while (n2 > 0 && !Object.hasOwn(goNext[n2], word)) {
          n2 = failTo[n2];
        }
        if (Object.hasOwn(goNext, n2)) {
          const fs = goNext[n2][word];
          failTo[s2] = fs;
          if (endAs[fs]) {
            endAs[s2] ||= [];
            endAs[s2] = endAs[s2].concat(endAs[fs]);
          }
        } else {
          failTo[s2] = 0;
        }
      }
    }
    return { goNext, endAs, failTo };
  };
  var buildTrie_default = buildTrie;

  // node_modules/compromise/src/1-one/lookup/api/scan.js
  var scanWords = function(terms, trie, opts2) {
    let n2 = 0;
    const results = [];
    for (let i3 = 0; i3 < terms.length; i3++) {
      const word = terms[i3][opts2.form] || terms[i3].normal;
      while (n2 > 0 && (trie.goNext[n2] === void 0 || !Object.hasOwn(trie.goNext[n2], word))) {
        n2 = trie.failTo[n2] || 0;
      }
      if (!Object.hasOwn(trie.goNext[n2], word)) {
        continue;
      }
      n2 = trie.goNext[n2][word];
      if (trie.endAs[n2]) {
        const arr = trie.endAs[n2];
        for (let o = 0; o < arr.length; o++) {
          const len = arr[o];
          const term = terms[i3 - len + 1];
          const [no, start2] = term.index;
          results.push([no, start2, start2 + len, term.id]);
        }
      }
    }
    return results;
  };
  var cacheMiss = function(words, cache2) {
    for (let i3 = 0; i3 < words.length; i3 += 1) {
      if (cache2.has(words[i3]) === true) {
        return false;
      }
    }
    return true;
  };
  var scan = function(view, trie, opts2) {
    let results = [];
    opts2.form ||= "normal";
    const docs = view.docs;
    if (!trie.goNext || !trie.goNext[0]) {
      console.error("Compromise invalid lookup trie");
      return view.none();
    }
    const firstWords = Object.keys(trie.goNext[0]);
    for (let i3 = 0; i3 < docs.length; i3++) {
      if (view._cache && view._cache[i3] && cacheMiss(firstWords, view._cache[i3]) === true) {
        continue;
      }
      const terms = docs[i3];
      const found = scanWords(terms, trie, opts2);
      if (found.length > 0) {
        results = results.concat(found);
      }
    }
    return view.update(results);
  };
  var scan_default = scan;

  // node_modules/compromise/src/1-one/lookup/api/index.js
  var isObject3 = (val) => {
    return Object.prototype.toString.call(val) === "[object Object]";
  };
  function api_default3(View2) {
    View2.prototype.lookup = function(input, opts2 = {}) {
      if (!input) {
        return this.none();
      }
      if (typeof input === "string") {
        input = [input];
      }
      const trie = isObject3(input) ? input : buildTrie_default(input, this.world);
      let res = scan_default(this, trie, opts2);
      res = res.settle();
      return res;
    };
  }

  // node_modules/compromise/src/1-one/lookup/api/buildTrie/compress.js
  var truncate = (list4, val) => {
    for (let i3 = list4.length - 1; i3 >= 0; i3 -= 1) {
      if (list4[i3] !== val) {
        list4 = list4.slice(0, i3 + 1);
        return list4;
      }
    }
    return list4;
  };
  var compress = function(trie) {
    trie.goNext = trie.goNext.map((o) => {
      if (Object.keys(o).length === 0) {
        return void 0;
      }
      return o;
    });
    trie.goNext = truncate(trie.goNext, void 0);
    trie.failTo = truncate(trie.failTo, 0);
    trie.endAs = truncate(trie.endAs, null);
    return trie;
  };
  var compress_default = compress;

  // node_modules/compromise/src/1-one/lookup/plugin.js
  var lib = {
    /** turn an array or object into a compressed trie*/
    buildTrie: function(input) {
      const trie = buildTrie_default(input, this.world());
      return compress_default(trie);
    }
  };
  lib.compile = lib.buildTrie;
  var plugin_default6 = {
    api: api_default3,
    lib
  };

  // node_modules/compromise/src/1-one/match/api/_lib.js
  var relPointer = function(ptrs, parent) {
    if (!parent) {
      return ptrs;
    }
    ptrs.forEach((ptr) => {
      const n2 = ptr[0];
      if (parent[n2]) {
        ptr[0] = parent[n2][0];
        ptr[1] += parent[n2][1];
        ptr[2] += parent[n2][1];
      }
    });
    return ptrs;
  };
  var fixPointers2 = function(res, parent) {
    let { ptrs } = res;
    const { byGroup } = res;
    ptrs = relPointer(ptrs, parent);
    Object.keys(byGroup).forEach((k2) => {
      byGroup[k2] = relPointer(byGroup[k2], parent);
    });
    return { ptrs, byGroup };
  };
  var parseRegs = function(regs, opts2, world2) {
    const one = world2.methods.one;
    if (typeof regs === "number") {
      regs = String(regs);
    }
    if (typeof regs === "string") {
      regs = one.killUnicode(regs, world2);
      regs = one.parseMatch(regs, opts2, world2);
    }
    return regs;
  };
  var isObject4 = (val) => {
    return Object.prototype.toString.call(val) === "[object Object]";
  };
  var isView = (val) => val && isObject4(val) && val.isView === true;
  var isNet = (val) => val && isObject4(val) && val.isNet === true;

  // node_modules/compromise/src/1-one/match/api/match.js
  var match = function(regs, group, opts2) {
    const one = this.methods.one;
    if (isView(regs)) {
      return this.intersection(regs);
    }
    if (isNet(regs)) {
      return this.sweep(regs, { tagger: false }).view.settle();
    }
    regs = parseRegs(regs, opts2, this.world);
    const todo = { regs, group };
    const res = one.match(this.docs, todo, this._cache);
    const { ptrs, byGroup } = fixPointers2(res, this.fullPointer);
    const view = this.toView(ptrs);
    view._groups = byGroup;
    return view;
  };
  var matchOne = function(regs, group, opts2) {
    const one = this.methods.one;
    if (isView(regs)) {
      return this.intersection(regs).eq(0);
    }
    if (isNet(regs)) {
      return this.sweep(regs, { tagger: false, matchOne: true }).view;
    }
    regs = parseRegs(regs, opts2, this.world);
    const todo = { regs, group, justOne: true };
    const res = one.match(this.docs, todo, this._cache);
    const { ptrs, byGroup } = fixPointers2(res, this.fullPointer);
    const view = this.toView(ptrs);
    view._groups = byGroup;
    return view;
  };
  var has = function(regs, group, opts2) {
    const one = this.methods.one;
    if (isView(regs)) {
      const ptrs2 = this.intersection(regs).fullPointer;
      return ptrs2.length > 0;
    }
    if (isNet(regs)) {
      return this.sweep(regs, { tagger: false }).view.found;
    }
    regs = parseRegs(regs, opts2, this.world);
    const todo = { regs, group, justOne: true };
    const ptrs = one.match(this.docs, todo, this._cache).ptrs;
    return ptrs.length > 0;
  };
  var ifFn = function(regs, group, opts2) {
    const one = this.methods.one;
    if (isView(regs)) {
      return this.filter((m3) => m3.intersection(regs).found);
    }
    if (isNet(regs)) {
      const m3 = this.sweep(regs, { tagger: false }).view.settle();
      return this.if(m3);
    }
    regs = parseRegs(regs, opts2, this.world);
    const todo = { regs, group, justOne: true };
    let ptrs = this.fullPointer;
    const cache2 = this._cache || [];
    ptrs = ptrs.filter((ptr, i3) => {
      const m3 = this.update([ptr]);
      const res = one.match(m3.docs, todo, cache2[i3]).ptrs;
      return res.length > 0;
    });
    const view = this.update(ptrs);
    if (this._cache) {
      view._cache = ptrs.map((ptr) => cache2[ptr[0]]);
    }
    return view;
  };
  var ifNo = function(regs, group, opts2) {
    const { methods: methods19 } = this;
    const one = methods19.one;
    if (isView(regs)) {
      return this.filter((m3) => !m3.intersection(regs).found);
    }
    if (isNet(regs)) {
      const m3 = this.sweep(regs, { tagger: false }).view.settle();
      return this.ifNo(m3);
    }
    regs = parseRegs(regs, opts2, this.world);
    const cache2 = this._cache || [];
    const view = this.filter((m3, i3) => {
      const todo = { regs, group, justOne: true };
      const ptrs = one.match(m3.docs, todo, cache2[i3]).ptrs;
      return ptrs.length === 0;
    });
    if (this._cache) {
      view._cache = view.ptrs.map((ptr) => cache2[ptr[0]]);
    }
    return view;
  };
  var match_default = { matchOne, match, has, if: ifFn, ifNo };

  // node_modules/compromise/src/1-one/match/api/lookaround.js
  var before2 = function(regs, group, opts2) {
    const { indexN: indexN2 } = this.methods.one.pointer;
    const pre = [];
    const byN = indexN2(this.fullPointer);
    Object.keys(byN).forEach((k2) => {
      const first = byN[k2].sort((a, b2) => a[1] > b2[1] ? 1 : -1)[0];
      if (first[1] > 0) {
        pre.push([first[0], 0, first[1]]);
      }
    });
    const preWords = this.toView(pre);
    if (!regs) {
      return preWords;
    }
    return preWords.match(regs, group, opts2);
  };
  var after = function(regs, group, opts2) {
    const { indexN: indexN2 } = this.methods.one.pointer;
    const post = [];
    const byN = indexN2(this.fullPointer);
    const document = this.document;
    Object.keys(byN).forEach((k2) => {
      const last = byN[k2].sort((a, b2) => a[1] > b2[1] ? -1 : 1)[0];
      const [n2, , end2] = last;
      if (end2 < document[n2].length) {
        post.push([n2, end2, document[n2].length]);
      }
    });
    const postWords = this.toView(post);
    if (!regs) {
      return postWords;
    }
    return postWords.match(regs, group, opts2);
  };
  var growLeft = function(regs, group, opts2) {
    if (typeof regs === "string") {
      regs = this.world.methods.one.parseMatch(regs, opts2, this.world);
    }
    regs[regs.length - 1].end = true;
    const ptrs = this.fullPointer;
    this.forEach((m3, n2) => {
      const more = m3.before(regs, group);
      if (more.found) {
        const terms = more.terms();
        ptrs[n2][1] -= terms.length;
        ptrs[n2][3] = terms.docs[0][0].id;
      }
    });
    return this.update(ptrs);
  };
  var growRight = function(regs, group, opts2) {
    if (typeof regs === "string") {
      regs = this.world.methods.one.parseMatch(regs, opts2, this.world);
    }
    regs[0].start = true;
    const ptrs = this.fullPointer;
    this.forEach((m3, n2) => {
      const more = m3.after(regs, group);
      if (more.found) {
        const terms = more.terms();
        ptrs[n2][2] += terms.length;
        ptrs[n2][4] = null;
      }
    });
    return this.update(ptrs);
  };
  var grow = function(regs, group, opts2) {
    return this.growRight(regs, group, opts2).growLeft(regs, group, opts2);
  };
  var lookaround_default = { before: before2, after, growLeft, growRight, grow };

  // node_modules/compromise/src/1-one/match/api/split.js
  var combine = function(left, right) {
    return [left[0], left[1], right[2]];
  };
  var getDoc = (reg, view, group) => {
    if (typeof reg === "string" || Array.isArray(reg)) {
      return view.match(reg, group);
    }
    if (!reg) {
      return view.none();
    }
    return reg;
  };
  var addIds2 = function(ptr, view) {
    const [n2, start2, end2] = ptr;
    if (view.document[n2]?.[start2]) {
      ptr[3] ||= view.document[n2][start2].id;
      if (view.document[n2][end2 - 1]) {
        ptr[4] ||= view.document[n2][end2 - 1].id;
      }
    }
    return ptr;
  };
  var methods7 = {};
  methods7.splitOn = function(m3, group) {
    const { splitAll: splitAll2 } = this.methods.one.pointer;
    const splits = getDoc(m3, this, group).fullPointer;
    const all4 = splitAll2(this.fullPointer, splits);
    let res = [];
    all4.forEach((o) => {
      res.push(o.passthrough);
      res.push(o.before);
      res.push(o.match);
      res.push(o.after);
    });
    res = res.filter((p4) => p4);
    res = res.map((p4) => addIds2(p4, this));
    return this.update(res);
  };
  methods7.splitBefore = function(m3, group) {
    const { splitAll: splitAll2 } = this.methods.one.pointer;
    const splits = getDoc(m3, this, group).fullPointer;
    const all4 = splitAll2(this.fullPointer, splits);
    for (let i3 = 0; i3 < all4.length; i3 += 1) {
      if (!all4[i3].after && all4[i3 + 1]?.before) {
        if (all4[i3].match && all4[i3].match[0] === all4[i3 + 1].before[0]) {
          all4[i3].after = all4[i3 + 1].before;
          delete all4[i3 + 1].before;
        }
      }
    }
    let res = [];
    all4.forEach((o) => {
      res.push(o.passthrough);
      res.push(o.before);
      if (o.match && o.after) {
        res.push(combine(o.match, o.after));
      } else {
        res.push(o.match);
      }
    });
    res = res.filter((p4) => p4);
    res = res.map((p4) => addIds2(p4, this));
    return this.update(res);
  };
  methods7.splitAfter = function(m3, group) {
    const { splitAll: splitAll2 } = this.methods.one.pointer;
    const splits = getDoc(m3, this, group).fullPointer;
    const all4 = splitAll2(this.fullPointer, splits);
    let res = [];
    all4.forEach((o) => {
      res.push(o.passthrough);
      if (o.before && o.match) {
        res.push(combine(o.before, o.match));
      } else {
        res.push(o.before);
        res.push(o.match);
      }
      res.push(o.after);
    });
    res = res.filter((p4) => p4);
    res = res.map((p4) => addIds2(p4, this));
    return this.update(res);
  };
  methods7.split = methods7.splitAfter;
  var split_default = methods7;

  // node_modules/compromise/src/1-one/match/api/join.js
  var isNeighbour = function(ptrL, ptrR) {
    if (!ptrL || !ptrR) {
      return false;
    }
    if (ptrL[0] !== ptrR[0]) {
      return false;
    }
    return ptrL[2] === ptrR[1];
  };
  var mergeIf = function(doc, lMatch, rMatch) {
    const world2 = doc.world;
    const parseMatch = world2.methods.one.parseMatch;
    lMatch ||= ".$";
    rMatch ||= "^.";
    const leftMatch = parseMatch(lMatch, {}, world2);
    const rightMatch = parseMatch(rMatch, {}, world2);
    leftMatch[leftMatch.length - 1].end = true;
    rightMatch[0].start = true;
    const ptrs = doc.fullPointer;
    const res = [ptrs[0]];
    for (let i3 = 1; i3 < ptrs.length; i3 += 1) {
      const ptrL = res[res.length - 1];
      const ptrR = ptrs[i3];
      const left = doc.update([ptrL]);
      const right = doc.update([ptrR]);
      if (isNeighbour(ptrL, ptrR) && left.has(leftMatch) && right.has(rightMatch)) {
        res[res.length - 1] = [ptrL[0], ptrL[1], ptrR[2], ptrL[3], ptrR[4]];
      } else {
        res.push(ptrR);
      }
    }
    return doc.update(res);
  };
  var methods8 = {
    //  merge only if conditions are met
    joinIf: function(lMatch, rMatch) {
      return mergeIf(this, lMatch, rMatch);
    },
    // merge all neighbouring matches
    join: function() {
      return mergeIf(this);
    }
  };
  var join_default = methods8;

  // node_modules/compromise/src/1-one/match/api/index.js
  var methods9 = { ...match_default, ...lookaround_default, ...split_default, ...join_default };
  methods9.lookBehind = methods9.before;
  methods9.lookBefore = methods9.before;
  methods9.lookAhead = methods9.after;
  methods9.lookAfter = methods9.after;
  methods9.notIf = methods9.ifNo;
  var matchAPI = function(View2) {
    Object.assign(View2.prototype, methods9);
  };
  var api_default4 = matchAPI;

  // node_modules/compromise/src/1-one/match/methods/parseMatch/splitGroups.js
  var prefix2 = new Set("!~[^");
  var suffix = new Set("?]+*$~");
  var whitespace = /\s/;
  var splitGroups = (str) => {
    if (!str.includes("(") || !str.includes(")")) return [str];
    const length2 = str.length;
    const afterSuffix = new Uint32Array(length2 + 1);
    const bodyEnd = new Uint32Array(length2);
    const captureEnd = new Uint32Array(length2);
    afterSuffix[length2] = length2;
    let close = -1;
    let capture = 0;
    for (let i4 = length2 - 1; i4 >= 0; i4--) {
      afterSuffix[i4] = suffix.has(str[i4]) ? afterSuffix[i4 + 1] : i4;
      if (str[i4] === ")") close = i4;
      if (str[i4] === "(" && close >= i4 + 3 && str[close - 1] !== "\\") {
        const end2 = afterSuffix[close + 1];
        if (end2 === length2 || whitespace.test(str[end2])) bodyEnd[i4] = end2;
      }
      if (str[i4] === "<") {
        captureEnd[i4] = capture;
        capture = 0;
      } else if (str[i4] === ">" && !capture && bodyEnd[i4 + 1]) {
        capture = bodyEnd[i4 + 1];
      }
    }
    const parts2 = [];
    let previous = 0;
    let i3 = 0;
    while (i3 < length2) {
      const start2 = i3;
      while (i3 < length2 && prefix2.has(str[i3])) i3++;
      const end2 = str[i3] === "<" ? captureEnd[i3] : bodyEnd[i3];
      if (end2) {
        parts2.push(str.slice(previous, start2), str.slice(start2, end2));
        i3 = end2 < length2 ? end2 + 1 : end2;
        previous = i3;
      } else if (i3 === start2) {
        i3++;
      }
    }
    parts2.push(str.slice(previous));
    return parts2;
  };
  var splitGroups_default = splitGroups;

  // node_modules/compromise/src/1-one/match/methods/parseMatch/01-parseBlocks.js
  var bySlashes = /(?:^|\s)([![^]*(?:<[^<]*>)?\/.*?[^\\/]\/[?\]+*$~]*)(?:\s|$)/;
  var byWord = / /g;
  var isBlock = (str) => {
    return /^[![^]*(<[^<]*>)?\(/.test(str) && /\)[?\]+*$~]*$/.test(str);
  };
  var isReg = (str) => {
    return /^[![^]*(<[^<]*>)?\//.test(str) && /\/[?\]+*$~]*$/.test(str);
  };
  var cleanUp = function(arr) {
    arr = arr.map((str) => str.trim());
    arr = arr.filter((str) => str);
    return arr;
  };
  var parseBlocks = function(txt) {
    const arr = txt.split(bySlashes);
    let res = [];
    arr.forEach((str) => {
      if (isReg(str)) {
        res.push(str);
        return;
      }
      res = res.concat(splitGroups_default(str));
    });
    res = cleanUp(res);
    let final = [];
    res.forEach((str) => {
      if (isBlock(str)) {
        final.push(str);
      } else if (isReg(str)) {
        final.push(str);
      } else {
        final = final.concat(str.split(byWord));
      }
    });
    final = cleanUp(final);
    return final;
  };
  var parseBlocks_default = parseBlocks;

  // node_modules/compromise/src/1-one/match/methods/parseMatch/02-parseToken.js
  var hasMinMax = /\{([0-9]+)?(, *[0-9]*)?\}/;
  var andSign = /&&/;
  var captureName = /^<\s*([^\s>]+)\s*>/;
  var titleCase2 = (str) => str.charAt(0).toUpperCase() + str.substring(1);
  var end = (str) => str.charAt(str.length - 1);
  var start = (str) => str.charAt(0);
  var stripStart = (str) => str.substring(1);
  var stripEnd = (str) => str.substring(0, str.length - 1);
  var stripBoth = function(str) {
    str = stripStart(str);
    str = stripEnd(str);
    return str;
  };
  var parseToken = function(w, opts2, aliases4) {
    const obj = {};
    for (let i3 = 0; i3 < 2; i3 += 1) {
      if (end(w) === "$") {
        obj.end = true;
        w = stripEnd(w);
      }
      if (start(w) === "^") {
        obj.start = true;
        w = stripStart(w);
      }
      if (end(w) === "?") {
        obj.optional = true;
        w = stripEnd(w);
      }
      if (start(w) === "[" || end(w) === "]") {
        obj.group = null;
        if (start(w) === "[") {
          obj.groupStart = true;
        }
        if (end(w) === "]") {
          obj.groupEnd = true;
        }
        w = w.replace(/^\[/, "");
        w = w.replace(/\]$/, "");
        if (start(w) === "<") {
          const res = captureName.exec(w);
          if (!res) {
            throw new SyntaxError("Invalid named capture: expected [<name> ...]");
          }
          if (res.length >= 2) {
            obj.group = res[1];
            w = w.replace(res[0], "");
          }
        }
      }
      if (end(w) === "+") {
        obj.greedy = true;
        w = stripEnd(w);
      }
      if (w !== "*" && end(w) === "*" && w !== "\\*") {
        obj.greedy = true;
        w = stripEnd(w);
      }
      if (start(w) === "!") {
        obj.negative = true;
        w = stripStart(w);
      }
      if (start(w) === "~" && end(w) === "~" && w.length > 2) {
        w = stripBoth(w);
        obj.fuzzy = true;
        obj.min = opts2.fuzzy ?? 0.85;
        if (/\(/.test(w) === false) {
          obj.word = w;
          return obj;
        }
      }
      if (start(w) === "/" && end(w) === "/") {
        w = stripBoth(w);
        if (opts2.caseSensitive) {
          obj.use = "text";
        }
        obj.regex = new RegExp(w);
        return obj;
      }
      if (hasMinMax.test(w) === true) {
        w = w.replace(hasMinMax, (_a, b2, c) => {
          if (c === void 0) {
            obj.min = Number(b2);
            obj.max = Number(b2);
          } else {
            c = c.replace(/, */, "");
            if (b2 === void 0) {
              obj.min = 0;
              obj.max = Number(c);
            } else {
              obj.min = Number(b2);
              obj.max = Number(c || 999);
            }
          }
          obj.greedy = true;
          if (!obj.min) {
            obj.optional = true;
          }
          return "";
        });
      }
      if (start(w) === "(" && end(w) === ")") {
        if (andSign.test(w)) {
          obj.choices = w.split(andSign);
          obj.operator = "and";
        } else {
          obj.choices = w.split("|");
          obj.operator = "or";
        }
        obj.choices[0] = stripStart(obj.choices[0]);
        const last = obj.choices.length - 1;
        obj.choices[last] = stripEnd(obj.choices[last]);
        obj.choices = obj.choices.map((s2) => s2.trim());
        obj.choices = obj.choices.filter((s2) => s2);
        obj.choices = obj.choices.map((str) => {
          return str.split(/ /g).map((s2) => parseToken(s2, opts2, aliases4));
        });
        w = "";
      }
      if (start(w) === "{" && end(w) === "}") {
        w = stripBoth(w);
        obj.root = w;
        if (/\//.test(w)) {
          const split3 = obj.root.split(/\//);
          obj.root = split3[0];
          obj.pos = split3[1];
          if (obj.pos === "adj") {
            obj.pos = "Adjective";
          }
          obj.pos = obj.pos.charAt(0).toUpperCase() + obj.pos.substr(1).toLowerCase();
          if (split3[2] !== void 0) {
            obj.sense = split3[2];
          }
        }
        return obj;
      }
      if (start(w) === "<" && end(w) === ">") {
        w = stripBoth(w);
        obj.chunk = titleCase2(w);
        obj.greedy = true;
        return obj;
      }
      if (start(w) === "%" && end(w) === "%") {
        w = stripBoth(w);
        obj.switch = w;
        return obj;
      }
    }
    if (start(w) === "#") {
      const name = stripStart(w);
      obj.tag = aliases4?.[name];
      if (!obj.tag) {
        obj.tag = titleCase2(name);
        obj.tag = aliases4?.[obj.tag] || obj.tag;
      }
      return obj;
    }
    if (start(w) === "@") {
      obj.method = stripStart(w);
      return obj;
    }
    if (w === ".") {
      obj.anything = true;
      return obj;
    }
    if (w === "*") {
      obj.anything = true;
      obj.greedy = true;
      obj.optional = true;
      return obj;
    }
    if (w) {
      w = w.replace("\\*", "*");
      w = w.replace("\\.", ".");
      if (opts2.caseSensitive) {
        obj.use = "text";
      } else {
        w = w.toLowerCase();
      }
      obj.word = w;
    }
    return obj;
  };
  var parseToken_default = parseToken;

  // node_modules/compromise/src/1-one/tokenize/methods/web.js
  var email = /^[\w.!#$%&'*+/=?^`{|}~-]+@(?:[\w-]+\.)+[a-z]{2,}$/i;
  var explicitUrl = /^(?:https?:(?:\/\/)?|www\.)(?:[a-z0-9-]+\.)+[a-z]{2,}(?::[0-9]+)?(?:[/?#]\S*)?$/i;
  var bareUrl = /^(?:[a-z0-9-]+\.)+(?:com|net|gov|org|ly|edu|info|biz|dev|ru|jp|de|in|uk|br|io|ai)(?::[0-9]+)?(?:[/?#]\S*)?$/i;
  var isWebToken = function(str) {
    if (!str.includes(".")) {
      return false;
    }
    let start2 = 0;
    let end2 = str.length;
    while (start2 < end2 && /[\s("'“‘<]/.test(str[start2])) start2++;
    while (end2 > start2 && /[\s).,!?:;"'”’>]/.test(str[end2 - 1])) end2--;
    const text = str.slice(start2, end2);
    return email.test(text) || explicitUrl.test(text) || bareUrl.test(text);
  };

  // node_modules/compromise/src/1-one/tokenize/methods/02-terms/01-hyphens.js
  var hasHyphen = function(str, model5) {
    const parts2 = str.split(/[-–—]/);
    if (parts2.length <= 1) {
      return false;
    }
    if (isWebToken(str)) {
      return false;
    }
    const { prefixes: prefixes2, suffixes: suffixes5 } = model5.one;
    if (parts2[0].length === 1 && /[a-z]/i.test(parts2[0])) {
      return false;
    }
    if (Object.hasOwn(prefixes2, parts2[0])) {
      return false;
    }
    parts2[1] = parts2[1].trim().replace(/[.?!]$/, "");
    if (Object.hasOwn(suffixes5, parts2[1])) {
      return false;
    }
    const reg = /^([a-z\u00C0-\u00FF`"'/]+)[-–—]([a-z0-9\u00C0-\u00FF].*)/i;
    if (reg.test(str) === true) {
      return true;
    }
    const reg2 = /^[('"]?([0-9]{1,4})[-–—]([a-z\u00C0-\u00FF`"'/-]+[)'"]?$)/i;
    if (reg2.test(str) === true) {
      return true;
    }
    return false;
  };
  var splitHyphens = function(word) {
    const arr = [];
    const hyphens = word.split(/[-–—]/);
    let whichDash = "-";
    const found = word.match(/[-–—]/);
    if (found && found[0]) {
      whichDash = found;
    }
    for (let o = 0; o < hyphens.length; o++) {
      if (o === hyphens.length - 1) {
        arr.push(hyphens[o]);
      } else {
        arr.push(hyphens[o] + whichDash);
      }
    }
    return arr;
  };

  // node_modules/compromise/src/1-one/match/methods/parseMatch/03-splitHyphens.js
  var splitHyphens2 = function(regs, world2) {
    for (let i3 = regs.length - 1; i3 >= 0; i3 -= 1) {
      const reg = regs[i3];
      if (reg.word && hasHyphen(reg.word, world2.model)) {
        let words = reg.word.split(/[-–—]/g);
        words = words.filter((w) => w).reverse();
        regs.splice(i3, 1);
        words.forEach((w) => {
          const obj = { ...reg };
          obj.word = w;
          regs.splice(i3, 0, obj);
        });
      }
    }
    return regs;
  };
  var splitHyphens_default = splitHyphens2;

  // node_modules/compromise/src/1-one/match/methods/parseMatch/04-inflect-root.js
  var addVerbs = function(token, world2) {
    const { all: all4 } = world2.methods.two.transform.verb || {};
    const str = token.root;
    if (!all4) {
      return [];
    }
    return all4(str, world2.model);
  };
  var addNoun = function(token, world2) {
    const { all: all4 } = world2.methods.two.transform.noun || {};
    if (!all4) {
      return [token.root];
    }
    return all4(token.root, world2.model);
  };
  var addAdjective = function(token, world2) {
    const { all: all4 } = world2.methods.two.transform.adjective || {};
    if (!all4) {
      return [token.root];
    }
    return all4(token.root, world2.model);
  };
  var inflectRoot = function(regs, world2) {
    regs = regs.map((token) => {
      if (token.root) {
        if (world2.methods.two && world2.methods.two.transform) {
          let choices = [];
          if (token.pos) {
            if (token.pos === "Verb") {
              choices = choices.concat(addVerbs(token, world2));
            } else if (token.pos === "Noun") {
              choices = choices.concat(addNoun(token, world2));
            } else if (token.pos === "Adjective") {
              choices = choices.concat(addAdjective(token, world2));
            }
          } else {
            choices = choices.concat(addVerbs(token, world2));
            choices = choices.concat(addNoun(token, world2));
            choices = choices.concat(addAdjective(token, world2));
          }
          choices = choices.filter((str) => str);
          if (choices.length > 0) {
            token.operator = "or";
            token.fastOr = new Set(choices);
          }
        } else {
          token.machine = token.root;
          delete token.id;
          delete token.root;
        }
      }
      return token;
    });
    return regs;
  };
  var inflect_root_default = inflectRoot;

  // node_modules/compromise/src/1-one/match/methods/parseMatch/05-postProcess.js
  var nameGroups = function(regs) {
    let index3 = 0;
    let inGroup = null;
    for (let i3 = 0; i3 < regs.length; i3++) {
      const token = regs[i3];
      if (token.groupStart === true) {
        inGroup = token.group;
        if (inGroup === null) {
          inGroup = String(index3);
          index3 += 1;
        }
      }
      if (inGroup !== null) {
        token.group = inGroup;
      }
      if (token.groupEnd === true) {
        inGroup = null;
      }
    }
    return regs;
  };
  var doFastOrMode = function(tokens) {
    return tokens.map((token) => {
      if (token.choices !== void 0) {
        if (token.operator !== "or") {
          return token;
        }
        if (token.fuzzy === true) {
          return token;
        }
        const shouldPack = token.choices.every((block) => {
          if (block.length !== 1) {
            return false;
          }
          const reg = block[0];
          if (reg.fuzzy === true) {
            return false;
          }
          if (reg.start || reg.end) {
            return false;
          }
          if (reg.word !== void 0 && reg.negative !== true && reg.optional !== true && reg.method !== true) {
            return true;
          }
          return false;
        });
        if (shouldPack === true) {
          token.fastOr = /* @__PURE__ */ new Set();
          token.choices.forEach((block) => {
            token.fastOr.add(block[0].word);
          });
          delete token.choices;
        }
      }
      return token;
    });
  };
  var fuzzyOr = function(regs) {
    return regs.map((reg) => {
      if (reg.fuzzy && reg.choices) {
        reg.choices.forEach((r) => {
          if (r.length === 1 && r[0].word) {
            r[0].fuzzy = true;
            r[0].min = reg.min;
          }
        });
      }
      return reg;
    });
  };
  var postProcess = function(regs) {
    regs = nameGroups(regs);
    regs = doFastOrMode(regs);
    regs = fuzzyOr(regs);
    return regs;
  };
  var postProcess_default = postProcess;

  // node_modules/compromise/src/1-one/match/methods/parseMatch/index.js
  var syntax = function(input, opts2, world2) {
    if (input === null || input === void 0 || input === "") {
      return [];
    }
    opts2 ||= {};
    if (typeof input === "number") {
      input = String(input);
    }
    let tokens = parseBlocks_default(input);
    tokens = tokens.map((str) => parseToken_default(str, opts2, world2.model.one.tagAliases));
    tokens = splitHyphens_default(tokens, world2);
    tokens = inflect_root_default(tokens, world2);
    tokens = postProcess_default(tokens, opts2);
    return tokens;
  };
  var parseMatch_default = syntax;

  // node_modules/compromise/src/1-one/match/methods/match/01-failFast.js
  var anyIntersection = function(setA, setB) {
    for (const elem of setB) {
      if (setA.has(elem)) {
        return true;
      }
    }
    return false;
  };
  var failFast = function(regs, cache2) {
    for (let i3 = 0; i3 < regs.length; i3 += 1) {
      const reg = regs[i3];
      if (reg.optional === true || reg.negative === true || reg.fuzzy === true) {
        continue;
      }
      if (reg.word !== void 0 && cache2.has(reg.word) === false) {
        return true;
      }
      if (reg.tag !== void 0 && cache2.has("#" + reg.tag) === false) {
        return true;
      }
      if (reg.fastOr !== void 0 && anyIntersection(reg.fastOr, cache2) === false) {
        return true;
      }
    }
    return false;
  };
  var failFast_default = failFast;

  // node_modules/compromise/src/1-one/match/methods/match/term/_fuzzy.js
  var editDistance2 = function(strA, strB) {
    const aLength = strA.length, bLength = strB.length;
    if (aLength === 0) {
      return bLength;
    }
    if (bLength === 0) {
      return aLength;
    }
    const limit = (bLength > aLength ? bLength : aLength) + 1;
    if (Math.abs(aLength - bLength) > (limit || 100)) {
      return limit || 100;
    }
    const matrix = [];
    for (let i3 = 0; i3 < limit; i3++) {
      matrix[i3] = [i3];
      matrix[i3].length = limit;
    }
    for (let i3 = 0; i3 < limit; i3++) {
      matrix[0][i3] = i3;
    }
    let j, a_index, b_index, cost, min2, t2;
    for (let i3 = 1; i3 <= aLength; ++i3) {
      a_index = strA[i3 - 1];
      for (j = 1; j <= bLength; ++j) {
        if (i3 === j && matrix[i3][j] > 4) {
          return aLength;
        }
        b_index = strB[j - 1];
        cost = a_index === b_index ? 0 : 1;
        min2 = matrix[i3 - 1][j] + 1;
        if ((t2 = matrix[i3][j - 1] + 1) < min2) min2 = t2;
        if ((t2 = matrix[i3 - 1][j - 1] + cost) < min2) min2 = t2;
        const shouldUpdate = i3 > 1 && j > 1 && a_index === strB[j - 2] && strA[i3 - 2] === b_index && (t2 = matrix[i3 - 2][j - 2] + cost) < min2;
        if (shouldUpdate) {
          matrix[i3][j] = t2;
        } else {
          matrix[i3][j] = min2;
        }
      }
    }
    return matrix[aLength][bLength];
  };
  var fuzzyMatch = function(strA, strB, minLength = 3) {
    if (strA === strB) {
      return 1;
    }
    if (strA.length < minLength || strB.length < minLength) {
      return 0;
    }
    const steps = editDistance2(strA, strB);
    const length2 = Math.max(strA.length, strB.length);
    const relative2 = length2 === 0 ? 0 : steps / length2;
    const similarity = 1 - relative2;
    return similarity;
  };
  var fuzzy_default = fuzzyMatch;

  // node_modules/compromise/src/1-one/match/methods/termMethods.js
  var startQuote = /([\u0022\uFF02\u0027\u201C\u2018\u201F\u201B\u201E\u2E42\u201A\u00AB\u2039\u2035\u2036\u2037\u301D\u0060\u301F])/;
  var endQuote = /([\u0022\uFF02\u0027\u201D\u2019\u00BB\u203A\u2032\u2033\u2034\u301E\u00B4])/;
  var hasHyphen2 = /^[-–—]$/;
  var hasDash = / [-–—]{1,3} /;
  var hasPost = (term, punct) => term.post.indexOf(punct) !== -1;
  var methods10 = {
    /** does it have a quotation symbol?  */
    hasQuote: (term) => startQuote.test(term.pre) || endQuote.test(term.post),
    /** does it have a comma?  */
    hasComma: (term) => hasPost(term, ","),
    /** does it end in a period? */
    hasPeriod: (term) => hasPost(term, ".") === true && hasPost(term, "...") === false,
    /** does it end in an exclamation */
    hasExclamation: (term) => hasPost(term, "!"),
    /** does it end with a question mark? */
    hasQuestionMark: (term) => hasPost(term, "?") || hasPost(term, "\xBF"),
    /** is there a ... at the end? */
    hasEllipses: (term) => hasPost(term, "..") || hasPost(term, "\u2026"),
    /** is there a semicolon after term word? */
    hasSemicolon: (term) => hasPost(term, ";"),
    /** is there a colon after term word? */
    hasColon: (term) => hasPost(term, ":"),
    /** is there a slash '/' in term word? */
    hasSlash: (term) => /\//.test(term.text),
    /** a hyphen connects two words like-term */
    hasHyphen: (term) => hasHyphen2.test(term.post) || hasHyphen2.test(term.pre),
    /** a dash separates words - like that */
    hasDash: (term) => hasDash.test(term.post) || hasDash.test(term.pre),
    /** is it multiple words combinded */
    hasContraction: (term) => Boolean(term.implicit),
    /** is it an acronym */
    isAcronym: (term) => term.tags.has("Acronym"),
    /** does it have any tags */
    isKnown: (term) => term.tags.size > 0,
    /** uppercase first letter, then a lowercase */
    isTitleCase: (term) => new RegExp("^\\p{Lu}[a-z'\\u00C0-\\u00FF]", "u").test(term.text),
    /** uppercase all letters */
    isUpperCase: (term) => new RegExp("^\\p{Lu}+$", "u").test(term.text)
  };
  methods10.hasQuotation = methods10.hasQuote;
  var termMethods_default = methods10;

  // node_modules/compromise/src/1-one/match/methods/match/term/doesMatch.js
  var wrapMatch = function() {
  };
  var doesMatch = function(term, reg, index3, length2) {
    if (reg.anything === true) {
      return true;
    }
    if (reg.start === true && index3 !== 0) {
      return false;
    }
    if (reg.end === true && index3 !== length2 - 1) {
      return false;
    }
    if (reg.id !== void 0 && reg.id === term.id) {
      return true;
    }
    if (reg.word !== void 0) {
      if (reg.use) {
        return reg.word === term[reg.use];
      }
      if (term.machine !== null && term.machine === reg.word) {
        return true;
      }
      if (reg.fuzzy === true) {
        if (reg.word === term.root) {
          return true;
        }
        const score2 = fuzzy_default(reg.word, term.normal);
        if (score2 >= reg.min) {
          return true;
        }
      }
      if (term.alias && term.alias.some((str) => str === reg.word)) {
        return true;
      }
      return reg.word === term.text || reg.word === term.normal;
    }
    if (reg.tag !== void 0) {
      return term.tags.has(reg.tag) === true;
    }
    if (reg.method !== void 0) {
      if (typeof termMethods_default[reg.method] === "function" && termMethods_default[reg.method](term) === true) {
        return true;
      }
      return false;
    }
    if (reg.pre !== void 0) {
      return term.pre && term.pre.includes(reg.pre);
    }
    if (reg.post !== void 0) {
      return term.post && term.post.includes(reg.post);
    }
    if (reg.regex !== void 0) {
      let str = term.normal;
      if (reg.use) {
        str = term[reg.use];
      }
      if (reg.regex.global || reg.regex.sticky) {
        const lastIndex = reg.regex.lastIndex;
        try {
          reg.regex.lastIndex = 0;
          return reg.regex.test(str);
        } finally {
          reg.regex.lastIndex = lastIndex;
        }
      }
      return reg.regex.test(str);
    }
    if (reg.chunk !== void 0) {
      return term.chunk === reg.chunk;
    }
    if (reg.switch !== void 0) {
      return term.switch === reg.switch;
    }
    if (reg.machine !== void 0) {
      return term.normal === reg.machine || term.machine === reg.machine || term.root === reg.machine;
    }
    if (reg.sense !== void 0) {
      return term.sense === reg.sense;
    }
    if (reg.fastOr !== void 0) {
      if (reg.pos && !term.tags.has(reg.pos)) {
        return null;
      }
      const str = term.root || term.implicit || term.machine || term.normal;
      return reg.fastOr.has(str) || reg.fastOr.has(term.text);
    }
    if (reg.choices !== void 0) {
      if (reg.operator === "and") {
        return reg.choices.every((r) => wrapMatch(term, r, index3, length2));
      }
      return reg.choices.some((r) => wrapMatch(term, r, index3, length2));
    }
    return false;
  };
  wrapMatch = function(t2, reg, index3, length2) {
    const result = doesMatch(t2, reg, index3, length2);
    if (reg.negative === true) {
      return !result;
    }
    return result;
  };
  var doesMatch_default = wrapMatch;

  // node_modules/compromise/src/1-one/match/methods/match/steps/logic/greedy.js
  var getGreedy = function(state, endReg) {
    const reg = { ...state.regs[state.r], start: false, end: false };
    const start2 = state.t;
    for (; state.t < state.terms.length; state.t += 1) {
      const count = state.t - start2 + 1;
      if (endReg && doesMatch_default(state.terms[state.t], endReg, state.start_i + state.t, state.phrase_length)) {
        if (reg.min === void 0 || count >= reg.min) {
          return state.t;
        }
      }
      if (reg.max !== void 0 && count === reg.max) {
        return state.t;
      }
      if (doesMatch_default(state.terms[state.t], reg, state.start_i + state.t, state.phrase_length) === false) {
        if (reg.min !== void 0 && count < reg.min) {
          return null;
        }
        return state.t;
      }
    }
    if (reg.min !== void 0 && state.t - start2 + 1 < reg.min) {
      return null;
    }
    return state.t;
  };
  var greedyTo = function(state, nextReg) {
    let t2 = state.t;
    if (!nextReg) {
      return state.terms.length;
    }
    for (; t2 < state.terms.length; t2 += 1) {
      if (doesMatch_default(state.terms[t2], nextReg, state.start_i + t2, state.phrase_length) === true) {
        return t2;
      }
    }
    return null;
  };
  var isEndGreedy = function(reg, state) {
    if (reg.end === true && reg.greedy === true) {
      if (state.start_i + state.t < state.phrase_length - 1) {
        const tmpReg = { ...reg, end: false };
        if (doesMatch_default(state.terms[state.t], tmpReg, state.start_i + state.t, state.phrase_length) === true) {
          return true;
        }
      }
    }
    return false;
  };

  // node_modules/compromise/src/1-one/match/methods/match/_lib.js
  var getGroup = function(state, term_index) {
    if (!state.groups) {
      state.groups = {};
    }
    if (state.groups[state.inGroup]) {
      return state.groups[state.inGroup];
    }
    state.groups[state.inGroup] = {
      start: term_index,
      length: 0
    };
    return state.groups[state.inGroup];
  };

  // node_modules/compromise/src/1-one/match/methods/match/steps/astrix.js
  var doAstrix = function(state) {
    const { regs } = state;
    const reg = regs[state.r];
    const skipto = greedyTo(state, regs[state.r + 1]);
    if (skipto === null || skipto === state.offset) {
      return null;
    }
    if (reg.min !== void 0 && skipto - state.t < reg.min) {
      return null;
    }
    if (reg.max !== void 0 && skipto - state.t > reg.max) {
      state.t = state.t + reg.max;
      return true;
    }
    if (state.hasGroup === true) {
      const g3 = getGroup(state, state.t);
      g3.length += skipto - state.t;
    }
    state.t = skipto;
    return true;
  };
  var astrix_default = doAstrix;

  // node_modules/compromise/src/1-one/match/methods/match/steps/logic/and-or.js
  var tryChoice = function(state, regs, skipN) {
    let len = 0;
    for (let w = 0; w < regs.length; w += 1) {
      const cr = regs[w];
      const t2 = state.t + skipN + len;
      if (state.terms[t2] === void 0) {
        return 0;
      }
      if (doesMatch_default(state.terms[t2], cr, state.start_i + t2, state.phrase_length) !== true) {
        return 0;
      }
      len += 1;
      if (cr.greedy === true) {
        const gr = { ...cr, start: false, end: false };
        for (let i3 = t2 + 1; i3 < state.terms.length; i3 += 1) {
          if (doesMatch_default(state.terms[i3], gr, state.start_i + i3, state.phrase_length) !== true) {
            break;
          }
          len += 1;
        }
      }
    }
    return len;
  };
  var tryChoices = function(state, skipN) {
    const block = state.regs[state.r];
    for (let c = 0; c < block.choices.length; c += 1) {
      const regs = block.choices[c];
      if (!Array.isArray(regs)) {
        return 0;
      }
      const len = tryChoice(state, regs, skipN);
      if (len > 0) {
        return len;
      }
    }
    return 0;
  };
  var doOrBlock = function(state) {
    const block = state.regs[state.r];
    let skipN = tryChoices(state, 0);
    if (skipN === 0) {
      return 0;
    }
    if (block.greedy === true) {
      let more = tryChoices(state, skipN);
      while (more > 0) {
        skipN += more;
        more = tryChoices(state, skipN);
      }
    }
    return skipN;
  };
  var doAndBlock = function(state) {
    let longest = 0;
    const reg = state.regs[state.r];
    const allDidMatch = reg.choices.every((block) => {
      const allWords = block.every((cr, w_index) => {
        const tryTerm = state.t + w_index;
        if (state.terms[tryTerm] === void 0) {
          return false;
        }
        return doesMatch_default(state.terms[tryTerm], cr, state.start_i + tryTerm, state.phrase_length);
      });
      if (allWords === true && block.length > longest) {
        longest = block.length;
      }
      return allWords;
    });
    if (allDidMatch === true) {
      return longest;
    }
    return false;
  };

  // node_modules/compromise/src/1-one/match/methods/match/steps/or-block.js
  var orBlock = function(state) {
    const { regs } = state;
    const reg = regs[state.r];
    const skipNum = doOrBlock(state);
    if (skipNum) {
      if (reg.negative === true) {
        return null;
      }
      if (state.hasGroup === true) {
        const g3 = getGroup(state, state.t);
        g3.length += skipNum;
      }
      if (reg.end === true) {
        const end2 = state.phrase_length;
        if (state.t + state.start_i + skipNum !== end2) {
          return null;
        }
      }
      state.t += skipNum;
      return true;
    }
    if (reg.negative === true) {
      if (!reg.optional) {
        state.t += 1;
      }
      return true;
    }
    if (!reg.optional) {
      return null;
    }
    return true;
  };
  var or_block_default = orBlock;

  // node_modules/compromise/src/1-one/match/methods/match/steps/and-block.js
  var andBlock = function(state) {
    const { regs } = state;
    const reg = regs[state.r];
    const skipNum = doAndBlock(state);
    if (skipNum) {
      if (reg.negative === true) {
        return null;
      }
      if (state.hasGroup === true) {
        const g3 = getGroup(state, state.t);
        g3.length += skipNum;
      }
      if (reg.end === true) {
        const end2 = state.phrase_length;
        if (state.t + state.start_i + skipNum !== end2) {
          return null;
        }
      }
      state.t += skipNum;
      return true;
    }
    if (reg.negative === true) {
      if (!reg.optional) {
        state.t += 1;
      }
      return true;
    }
    if (!reg.optional) {
      return null;
    }
    return true;
  };
  var and_block_default = andBlock;

  // node_modules/compromise/src/1-one/match/methods/match/steps/logic/negative-greedy.js
  var negGreedy = function(state, reg, nextReg) {
    let skip = 0;
    for (let t2 = state.t; t2 < state.terms.length; t2 += 1) {
      let found = doesMatch_default(state.terms[t2], reg, state.start_i + t2, state.phrase_length);
      if (found) {
        break;
      }
      if (nextReg) {
        found = doesMatch_default(state.terms[t2], nextReg, state.start_i + t2, state.phrase_length);
        if (found) {
          break;
        }
      }
      skip += 1;
      if (reg.max !== void 0 && skip === reg.max) {
        break;
      }
    }
    if (skip === 0) {
      return false;
    }
    if (reg.min && reg.min > skip) {
      return false;
    }
    state.t += skip;
    return true;
  };
  var negative_greedy_default = negGreedy;

  // node_modules/compromise/src/1-one/match/methods/match/steps/negative.js
  var doNegative = function(state) {
    const { regs } = state;
    const reg = regs[state.r];
    const tmpReg = { ...reg };
    tmpReg.negative = false;
    const found = doesMatch_default(state.terms[state.t], tmpReg, state.start_i + state.t, state.phrase_length);
    if (found) {
      return false;
    }
    if (reg.optional) {
      const nextReg = regs[state.r + 1];
      if (nextReg) {
        const fNext = doesMatch_default(state.terms[state.t], nextReg, state.start_i + state.t, state.phrase_length);
        if (fNext) {
          state.r += 1;
        } else if (nextReg.optional && regs[state.r + 2]) {
          const fNext2 = doesMatch_default(state.terms[state.t], regs[state.r + 2], state.start_i + state.t, state.phrase_length);
          if (fNext2) {
            state.r += 2;
          }
        }
      }
    }
    if (reg.greedy) {
      return negative_greedy_default(state, tmpReg, regs[state.r + 1]);
    }
    state.t += 1;
    return true;
  };
  var negative_default = doNegative;

  // node_modules/compromise/src/1-one/match/methods/match/steps/optional-match.js
  var foundOptional = function(state) {
    const { regs } = state;
    const reg = regs[state.r];
    const term = state.terms[state.t];
    const nextRegMatched = doesMatch_default(term, regs[state.r + 1], state.start_i + state.t, state.phrase_length);
    if (reg.negative || nextRegMatched) {
      const nextTerm = state.terms[state.t + 1];
      if (!nextTerm || !doesMatch_default(nextTerm, regs[state.r + 1], state.start_i + state.t + 1, state.phrase_length)) {
        state.r += 1;
      }
    }
  };
  var optional_match_default = foundOptional;

  // node_modules/compromise/src/1-one/match/methods/match/steps/greedy-match.js
  var greedyMatch = function(state) {
    const { regs, phrase_length } = state;
    const reg = regs[state.r];
    state.t = getGreedy(state, regs[state.r + 1]);
    if (state.t === null) {
      return null;
    }
    if (reg.end === true && state.start_i + state.t !== phrase_length) {
      return null;
    }
    return true;
  };
  var greedy_match_default = greedyMatch;

  // node_modules/compromise/src/1-one/match/methods/match/steps/contraction-skip.js
  var contractionSkip = function(state) {
    const term = state.terms[state.t];
    const reg = state.regs[state.r];
    if (term.implicit && state.terms[state.t + 1]) {
      const nextTerm = state.terms[state.t + 1];
      if (!nextTerm.implicit) {
        return;
      }
      if (reg.word === term.normal) {
        state.t += 1;
      }
      if (reg.method === "hasContraction") {
        state.t += 1;
      }
    }
  };
  var contraction_skip_default = contractionSkip;

  // node_modules/compromise/src/1-one/match/methods/match/steps/simple-match.js
  var setGroup = function(state, startAt) {
    const reg = state.regs[state.r];
    const g3 = getGroup(state, startAt);
    if (state.t - state.offset > 1 && reg.greedy) {
      g3.length += state.t - startAt;
    } else {
      g3.length++;
    }
  };
  var simpleMatch = function(state) {
    const { regs } = state;
    const reg = regs[state.r];
    const term = state.terms[state.t];
    const startAt = state.t;
    if (reg.optional && regs[state.r + 1] && reg.negative) {
      return true;
    }
    if (reg.optional && regs[state.r + 1]) {
      optional_match_default(state);
    }
    if (term.implicit && state.terms[state.t + 1]) {
      contraction_skip_default(state);
    }
    state.t += 1;
    if (reg.end === true && state.t !== state.terms.length && reg.greedy !== true) {
      return null;
    }
    if (reg.greedy === true) {
      const alive = greedy_match_default(state);
      if (!alive) {
        return null;
      }
    }
    if (state.hasGroup === true) {
      setGroup(state, startAt);
    }
    return true;
  };
  var simple_match_default = simpleMatch;

  // node_modules/compromise/src/1-one/match/methods/match/02-from-here.js
  var tryHere = function(terms, regs, start_i, phrase_length, offset2 = 0) {
    if (offset2 >= terms.length || regs.length === 0) {
      return null;
    }
    const origin = start_i - offset2;
    const state = {
      t: offset2,
      offset: offset2,
      terms,
      r: 0,
      regs,
      groups: null,
      start_i: origin,
      phrase_length,
      inGroup: null
    };
    for (; state.r < regs.length; state.r += 1) {
      const reg = regs[state.r];
      state.hasGroup = Boolean(reg.group);
      if (state.hasGroup === true) {
        state.inGroup = reg.group;
      } else {
        state.inGroup = null;
      }
      if (!state.terms[state.t]) {
        const alive = regs.slice(state.r).some((remain) => !remain.optional);
        if (alive === false) {
          break;
        }
        return null;
      }
      if (reg.anything === true && reg.greedy === true) {
        const alive = astrix_default(state);
        if (!alive) {
          return null;
        }
        continue;
      }
      if (reg.choices !== void 0 && reg.operator === "or") {
        const alive = or_block_default(state);
        if (!alive) {
          return null;
        }
        continue;
      }
      if (reg.choices !== void 0 && reg.operator === "and") {
        const alive = and_block_default(state);
        if (!alive) {
          return null;
        }
        continue;
      }
      if (reg.anything === true) {
        if (reg.negative && reg.anything) {
          return null;
        }
        const alive = simple_match_default(state);
        if (!alive) {
          return null;
        }
        continue;
      }
      if (isEndGreedy(reg, state) === true) {
        const alive = simple_match_default(state);
        if (!alive) {
          return null;
        }
        continue;
      }
      if (reg.negative) {
        const alive = negative_default(state);
        if (!alive) {
          return null;
        }
        continue;
      }
      const hasMatch = doesMatch_default(state.terms[state.t], reg, state.start_i + state.t, state.phrase_length);
      if (hasMatch === true) {
        const alive = simple_match_default(state);
        if (!alive) {
          return null;
        }
        continue;
      }
      if (reg.optional === true) {
        continue;
      }
      return null;
    }
    const pntr = [null, start_i, state.t + origin];
    if (pntr[1] === pntr[2]) {
      return null;
    }
    const groups2 = {};
    if (state.groups) {
      Object.keys(state.groups).forEach((k2) => {
        const o = state.groups[k2];
        const start2 = origin + o.start;
        groups2[k2] = [null, start2, start2 + o.length];
      });
    }
    return { pointer: pntr, groups: groups2 };
  };
  var from_here_default = tryHere;

  // node_modules/compromise/src/1-one/match/methods/match/03-getGroup.js
  var getGroup2 = function(res, group) {
    const ptrs = [];
    const byGroup = {};
    if (res.length === 0) {
      return { ptrs, byGroup };
    }
    if (typeof group === "number") {
      group = String(group);
    }
    if (group) {
      res.forEach((r) => {
        if (r.groups[group]) {
          ptrs.push(r.groups[group]);
        }
      });
    } else {
      res.forEach((r) => {
        ptrs.push(r.pointer);
        Object.keys(r.groups).forEach((k2) => {
          byGroup[k2] ||= [];
          byGroup[k2].push(r.groups[k2]);
        });
      });
    }
    return { ptrs, byGroup };
  };
  var getGroup_default = getGroup2;

  // node_modules/compromise/src/1-one/match/methods/match/03-notIf.js
  var notIf = function(results, not, docs) {
    results = results.filter((res) => {
      const [n2, start2, end2] = res.pointer;
      const terms = docs[n2].slice(start2, end2);
      for (let i3 = 0; i3 < terms.length; i3 += 1) {
        const found = from_here_default(terms, not, i3, terms.length, i3);
        if (found !== null) {
          return false;
        }
      }
      return true;
    });
    return results;
  };
  var notIf_default = notIf;

  // node_modules/compromise/src/1-one/match/methods/match/_fixed.js
  var isFixed = (regs) => regs.every((reg) => !reg.optional && !reg.greedy && !reg.negative && !reg.choices && !reg.anything && (reg.word !== void 0 || reg.tag !== void 0 || reg.switch !== void 0 || reg.fastOr !== void 0));
  var fromFixed = (terms, regs, start2, length2, offset2 = 0) => {
    if (offset2 + regs.length > terms.length) {
      return null;
    }
    for (let r = 0; r < regs.length; r += 1) {
      const term = terms[offset2 + r];
      if (term.implicit) {
        return from_here_default(terms, regs, start2, length2, offset2);
      }
      if (doesMatch_default(term, regs[r], start2 + r, length2) !== true) {
        return null;
      }
    }
    const groups2 = {};
    for (let r = 0; r < regs.length; r += 1) {
      const name = regs[r].group;
      if (name) {
        if (!groups2[name]) {
          groups2[name] = [null, start2 + r, start2 + r];
        }
        groups2[name][2] += 1;
      }
    }
    return { pointer: [null, start2, start2 + regs.length], groups: groups2 };
  };

  // node_modules/compromise/src/1-one/match/methods/match/index.js
  var addSentence = function(res, n2) {
    res.pointer[0] = n2;
    Object.keys(res.groups).forEach((k2) => {
      res.groups[k2][0] = n2;
    });
    return res;
  };
  var handleStart = function(terms, regs, n2, attempt) {
    let res = attempt(terms, regs, 0, terms.length);
    if (res) {
      res = addSentence(res, n2);
      return res;
    }
    return null;
  };
  var runMatch = function(docs, todo, cache2) {
    cache2 ||= [];
    const { regs, group, justOne, checkFirst } = todo;
    let results = [];
    if (!regs || regs.length === 0) {
      return { ptrs: [], byGroup: {} };
    }
    const attempt = todo.fixed ?? isFixed(regs) ? fromFixed : from_here_default;
    let minLength = todo.minLength;
    if (minLength === void 0) {
      minLength = 0;
      for (let i3 = 0; i3 < regs.length; i3 += 1) {
        const reg = regs[i3];
        if (reg.optional !== true && reg.negative !== true) {
          minLength += 1;
        }
      }
    }
    docs: for (let n2 = 0; n2 < docs.length; n2 += 1) {
      const terms = docs[n2];
      if (cache2[n2] && failFast_default(regs, cache2[n2])) {
        continue;
      }
      if (regs[0].start === true) {
        const foundStart = handleStart(terms, regs, n2, attempt);
        if (foundStart) {
          results.push(foundStart);
        }
        continue;
      }
      for (let i3 = 0; i3 < terms.length; i3 += 1) {
        if (terms.length - i3 < minLength) {
          break;
        }
        if (checkFirst && !doesMatch_default(terms[i3], regs[0], i3, terms.length)) {
          continue;
        }
        let res = attempt(terms, regs, i3, terms.length, i3);
        if (res) {
          res = addSentence(res, n2);
          results.push(res);
          if (justOne === true) {
            break docs;
          }
          const end2 = res.pointer[2];
          if (Math.abs(end2 - 1) > i3) {
            i3 = Math.abs(end2 - 1);
          }
        }
      }
    }
    if (regs[regs.length - 1].end === true) {
      results = results.filter((res) => {
        const n2 = res.pointer[0];
        return docs[n2].length === res.pointer[2];
      });
    }
    if (todo.notIf) {
      results = notIf_default(results, todo.notIf, docs);
    }
    results = getGroup_default(results, group);
    results.ptrs.forEach((ptr) => {
      const [n2, start2, end2] = ptr;
      ptr[3] = docs[n2][start2].id;
      ptr[4] = docs[n2][end2 - 1].id;
    });
    return results;
  };
  var match_default2 = runMatch;

  // node_modules/compromise/src/1-one/match/methods/index.js
  var methods11 = {
    one: {
      termMethods: termMethods_default,
      parseMatch: parseMatch_default,
      match: match_default2
    }
  };
  var methods_default4 = methods11;

  // node_modules/compromise/src/1-one/match/lib.js
  var lib_default2 = {
    /** pre-parse any match statements */
    parseMatch: function(str, opts2) {
      const world2 = this.world();
      const killUnicode2 = world2.methods.one.killUnicode;
      if (killUnicode2) {
        str = killUnicode2(str, world2);
      }
      return world2.methods.one.parseMatch(str, opts2, world2);
    }
  };

  // node_modules/compromise/src/1-one/match/plugin.js
  var plugin_default7 = {
    api: api_default4,
    methods: methods_default4,
    lib: lib_default2
  };

  // node_modules/compromise/src/1-one/output/api/html.js
  var isClass = /^\../;
  var isId = /^#./;
  var escapeXml = (str) => {
    str = str.replaceAll("&", "&amp;");
    str = str.replaceAll("<", "&lt;");
    str = str.replaceAll(">", "&gt;");
    str = str.replaceAll('"', "&quot;");
    str = str.replaceAll("'", "&apos;");
    return str;
  };
  var toTag = function(k2) {
    let start2 = "";
    let end2 = "</span>";
    k2 = escapeXml(k2);
    if (isClass.test(k2)) {
      start2 = `<span class="${k2.replace(/^\./, "")}"`;
    } else if (isId.test(k2)) {
      start2 = `<span id="${k2.replace(/^#/, "")}"`;
    } else {
      start2 = `<${k2}`;
      end2 = `</${k2}>`;
    }
    start2 += ">";
    return { start: start2, end: end2 };
  };
  var getIndex = function(doc, obj) {
    const starts = {};
    const ends = {};
    Object.keys(obj).forEach((k2) => {
      let res = obj[k2];
      const tag = toTag(k2);
      if (typeof res === "string") {
        res = doc.match(res);
      }
      res.docs.forEach((terms) => {
        if (terms.every((t2) => t2.implicit)) {
          return;
        }
        const a = terms[0].id;
        starts[a] ||= [];
        starts[a].push(tag.start);
        const b2 = terms.at(-1).id;
        ends[b2] ||= [];
        ends[b2].push(tag.end);
      });
    });
    return { starts, ends };
  };
  var html = function(obj) {
    const { starts, ends } = getIndex(this, obj);
    let out3 = "";
    this.docs.forEach((terms) => {
      for (let i3 = 0; i3 < terms.length; i3 += 1) {
        const t2 = terms[i3];
        if (Object.hasOwn(starts, t2.id)) {
          out3 += starts[t2.id].join("");
        }
        out3 += t2.pre || "";
        out3 += t2.text || "";
        if (Object.hasOwn(ends, t2.id)) {
          out3 += ends[t2.id].join("");
        }
        out3 += t2.post || "";
      }
    });
    return out3;
  };
  var html_default = { html };

  // node_modules/compromise/src/1-one/output/api/_text.js
  var endPunctuation = /[,:;)\]*.?~!\u0022\uFF02\u201D\u2019\u00BB\u203A\u2032\u2033\u2034\u301E\u00B4—-]/;
  var trimEnd = (str) => {
    let end2 = str.length;
    while (end2 > 0 && endPunctuation.test(str[end2 - 1])) end2--;
    return str.slice(0, end2);
  };
  var trimStart = /^[(['"*~\uFF02\u201C\u2018\u201F\u201B\u201E\u2E42\u201A\u00AB\u2039\u2035\u2036\u2037\u301D\u0060\u301F]+/;
  var punctToKill = /[,:;)('"\uFF02\u201D\u2019\u00BB\u203A\u2032\u2033\u2034\u301E\u00B4\]]/;
  var isHyphen = /^[-–—]$/;
  var hasSpace = / /;
  var textFromTerms = function(terms, opts2, keepSpace = true) {
    let txt = "";
    terms.forEach((t2) => {
      let pre = t2.pre || "";
      let post = t2.post || "";
      if (opts2.punctuation === "some") {
        pre = pre.replace(/[,،]/g, "");
        pre = pre.replace(trimStart, "");
        if (isHyphen.test(post)) {
          post = " ";
        }
        post = post.replace(punctToKill, "");
        post = post.replace(/\?!+/, "?");
        post = post.replace(/!+/, "!");
        post = post.replace(/\?+/, "?");
        post = post.replace(/[,،…]|\.{2,}/g, "");
        if (t2.tags.has("Abbreviation")) {
          post = post.replace(/\./, "");
        }
      }
      if (opts2.whitespace === "some") {
        pre = pre.replace(/\s/, "");
        post = post.replace(/\s+/, " ");
      }
      if (!opts2.keepPunct) {
        pre = pre.replace(trimStart, "");
        if (post === "-") {
          post = " ";
        } else {
          post = trimEnd(post);
        }
      }
      let word = t2[opts2.form || "text"] || t2.normal || "";
      if (opts2.form === "implicit") {
        word = t2.implicit || t2.text;
      }
      if (opts2.form === "root" && t2.implicit) {
        word = t2.root || t2.implicit || t2.normal;
      }
      if ((opts2.form === "machine" || opts2.form === "implicit" || opts2.form === "root") && t2.implicit) {
        if (!post || !hasSpace.test(post)) {
          post += " ";
        }
      }
      txt += pre + word + post;
    });
    if (keepSpace === false) {
      txt = txt.trim();
    }
    if (opts2.lowerCase === true) {
      txt = txt.toLowerCase();
    }
    return txt;
  };
  var textFromDoc = function(docs, opts2) {
    let text = "";
    if (!docs || !docs[0] || !docs[0][0]) {
      return text;
    }
    for (let i3 = 0; i3 < docs.length; i3 += 1) {
      text += textFromTerms(docs[i3], opts2, true);
    }
    if (!opts2.keepSpace) {
      text = text.trim();
    }
    if (opts2.keepEndPunct === false) {
      if (!docs[0][0].tags.has("Emoticon")) {
        text = text.replace(trimStart, "");
      }
      const last = docs.at(-1);
      if (!last.at(-1).tags.has("Emoticon")) {
        text = trimEnd(text);
        if (!opts2.keepSpace) {
          text = text.trimEnd();
        }
      }
      if (text.endsWith(`'`) && !text.endsWith(`s'`)) {
        text = text.replace(/'/, "");
      }
    }
    if (opts2.cleanWhitespace === true) {
      text = text.trim();
    }
    return text;
  };

  // node_modules/compromise/src/1-one/output/api/_fmts.js
  var fmts = {
    text: {
      form: "text"
    },
    normal: {
      whitespace: "some",
      punctuation: "some",
      case: "some",
      unicode: "some",
      form: "normal"
    },
    machine: {
      keepSpace: false,
      whitespace: "some",
      punctuation: "some",
      case: "none",
      unicode: "some",
      form: "machine"
    },
    root: {
      keepSpace: false,
      whitespace: "some",
      punctuation: "some",
      case: "some",
      unicode: "some",
      form: "root"
    },
    implicit: {
      form: "implicit"
    }
  };
  fmts.clean = fmts.normal;
  fmts.reduced = fmts.root;
  var fmts_default = fmts;

  // node_modules/compromise/src/1-one/output/methods/hash.js
  var k = [];
  var i2 = 0;
  for (; i2 < 64; i2++) {
    k[i2] = 0 | Math.sin((i2 + 1) % Math.PI) * 4294967296;
  }
  var md5 = function(s2) {
    let b2, c, d, j = decodeURI(encodeURI(s2)) + "\x80", a = j.length;
    const h = [b2 = 1732584193, c = 4023233417, ~b2, ~c], words = [];
    s2 = --a / 4 + 2 | 15;
    words[--s2] = a * 8;
    for (; ~a; ) {
      words[a >> 2] |= j.charCodeAt(a) << 8 * a--;
    }
    for (i2 = j = 0; i2 < s2; i2 += 16) {
      a = h;
      for (; j < 64; a = [
        d = a[3],
        b2 + ((d = a[0] + [b2 & c | ~b2 & d, d & b2 | ~d & c, b2 ^ c ^ d, c ^ (b2 | ~d)][a = j >> 4] + k[j] + ~~words[i2 | [j, 5 * j + 1, 3 * j + 5, 7 * j][a] & 15]) << (a = [7, 12, 17, 22, 5, 9, 14, 20, 4, 11, 16, 23, 6, 10, 15, 21][4 * a + j++ % 4]) | d >>> -a),
        b2,
        c
      ]) {
        b2 = a[1] | 0;
        c = a[2];
      }
      for (j = 4; j; ) h[--j] += a[j];
    }
    for (s2 = ""; j < 32; ) {
      s2 += (h[j >> 3] >> (1 ^ j++) * 4 & 15).toString(16);
    }
    return s2;
  };
  var hash_default = md5;

  // node_modules/compromise/src/1-one/output/api/json.js
  var defaults = {
    text: true,
    terms: true
  };
  var opts = { case: "none", unicode: "some", form: "machine", punctuation: "some" };
  var merge = function(a, b2) {
    return { ...a, ...b2 };
  };
  var fns4 = {
    text: (terms) => textFromTerms(terms, { keepPunct: true }, false),
    normal: (terms) => textFromTerms(terms, merge(fmts_default.normal, { keepPunct: true }), false),
    implicit: (terms) => textFromTerms(terms, merge(fmts_default.implicit, { keepPunct: true }), false),
    machine: (terms) => textFromTerms(terms, opts, false),
    root: (terms) => textFromTerms(terms, merge(opts, { form: "root" }), false),
    hash: (terms) => hash_default(textFromTerms(terms, { keepPunct: true }, false)),
    offset: (terms) => {
      const len = fns4.text(terms).length;
      return {
        index: terms[0].offset.index,
        start: terms[0].offset.start,
        length: len
      };
    },
    terms: (terms) => {
      return terms.map((t2) => ({ ...t2, tags: [...t2.tags] }));
    },
    confidence: (_terms, view, i3) => view.eq(i3).confidence(),
    syllables: (_terms, view, i3) => view.eq(i3).syllables(),
    sentence: (_terms, view, i3) => view.eq(i3).fullSentence().text(),
    dirty: (terms) => terms.some((t2) => t2.dirty === true)
  };
  fns4.sentences = fns4.sentence;
  fns4.clean = fns4.normal;
  fns4.reduced = fns4.root;
  var toJSON = function(view, option) {
    option ||= {};
    if (typeof option === "string") {
      option = {};
    }
    option = { ...defaults, ...option };
    if (option.offset) {
      view.compute("offset");
    }
    return view.docs.map((terms, i3) => {
      const res = {};
      Object.keys(option).forEach((k2) => {
        if (option[k2] && fns4[k2]) {
          res[k2] = fns4[k2](terms, view, i3);
        }
      });
      return res;
    });
  };
  var methods12 = {
    /** return data */
    json: function(n2) {
      const res = toJSON(this, n2);
      if (typeof n2 === "number") {
        return res[n2];
      }
      return res;
    }
  };
  methods12.data = methods12.json;
  var json_default = methods12;

  // node_modules/compromise/src/1-one/output/api/debug.js
  var isClientSide = () => typeof window !== "undefined" && window.document;
  var debug3 = function(fmt2) {
    const debugMethods = this.methods.one.debug || {};
    if (!fmt2 || !Object.hasOwn(debugMethods, fmt2)) {
      fmt2 = isClientSide() ? "clientSide" : "tags";
    }
    debugMethods[fmt2](this);
    return this;
  };
  var debug_default3 = debug3;

  // node_modules/compromise/src/1-one/output/api/wrap.js
  var toText = function(term) {
    const pre = term.pre || "";
    const post = term.post || "";
    return pre + term.text + post;
  };
  var findStarts = function(doc, obj) {
    const starts = {};
    Object.keys(obj).forEach((reg) => {
      const m3 = doc.match(reg);
      m3.fullPointer.forEach((a) => {
        starts[a[3]] = { fn: obj[reg], end: a[2] };
      });
    });
    return starts;
  };
  var wrap = function(doc, obj) {
    const starts = findStarts(doc, obj);
    let text = "";
    doc.docs.forEach((terms, n2) => {
      for (let i3 = 0; i3 < terms.length; i3 += 1) {
        const t2 = terms[i3];
        if (Object.hasOwn(starts, t2.id)) {
          const { fn, end: end2 } = starts[t2.id];
          const m3 = doc.update([[n2, i3, end2]]);
          text += terms[i3].pre || "";
          text += fn(m3);
          i3 = end2 - 1;
          text += terms[i3].post || "";
        } else {
          text += toText(t2);
        }
      }
    });
    return text;
  };
  var wrap_default = wrap;

  // node_modules/compromise/src/1-one/output/api/_spec.js
  var attributeTags = /* @__PURE__ */ new Set(["Hyphenated", "Prefix", "SlashedTerm"]);
  var rootOf = function(tag, tagSet) {
    const entry = tagSet[tag];
    if (!entry || !entry.parents || entry.parents.length === 0) {
      return tag;
    }
    for (let i3 = 0; i3 < entry.parents.length; i3 += 1) {
      const p4 = entry.parents[i3];
      if (tagSet[p4] && (!tagSet[p4].parents || tagSet[p4].parents.length === 0)) {
        return p4;
      }
    }
    return entry.parents.at(-1);
  };
  var slotForTerm = function(term, tagSet) {
    const tags = Array.from(term.tags || []);
    if (tags.length === 0) {
      return "-";
    }
    const primary = tags.find((t2) => !attributeTags.has(rootOf(t2, tagSet))) || tags[0];
    return rootOf(primary, tagSet);
  };
  var makeAliases = function(tagSet, registered) {
    const aliases4 = /* @__PURE__ */ Object.create(null);
    for (const tag in tagSet) {
      const entry = tagSet[tag];
      const preferred = entry.aliases === void 0 ? entry.alias : entry.aliases[0];
      if (preferred && registered[preferred] === tag) {
        aliases4[tag] = preferred;
      }
    }
    return aliases4;
  };
  var toSpec = function(doc, world2) {
    const tagSet = world2.model.one.tagSet;
    const aliases4 = makeAliases(tagSet, world2.model.one.tagAliases);
    return doc.docs.map((terms) => {
      const text = terms.reduce((str, t2) => str + t2.pre + t2.text + t2.post, "").trim();
      const tags = terms.map((t2) => {
        const tag = slotForTerm(t2, tagSet);
        return aliases4[tag] || tag;
      }).join(",");
      return `${text} {${tags}}`;
    }).join("\n");
  };
  var spec_default = toSpec;

  // node_modules/compromise/src/1-one/output/api/out.js
  var isObject5 = (val) => {
    return Object.prototype.toString.call(val) === "[object Object]";
  };
  var topk = function(arr) {
    const counts = /* @__PURE__ */ new Map();
    arr.forEach((word) => {
      counts.set(word, (counts.get(word) ?? 0) + 1);
    });
    const res = Array.from(counts, ([normal, count]) => ({ normal, count }));
    return res.sort((a, b2) => b2.count - a.count);
  };
  var out = function(method) {
    if (isObject5(method)) {
      return wrap_default(this, method);
    }
    if (method === "text") {
      return this.text();
    }
    if (method === "normal") {
      return this.text("normal");
    }
    if (method === "root") {
      return this.text("root");
    }
    if (method === "machine" || method === "reduced") {
      return this.text("machine");
    }
    if (method === "hash" || method === "md5") {
      return hash_default(this.text());
    }
    if (method === "spec") {
      return spec_default(this, this.world);
    }
    if (method === "json") {
      return this.json();
    }
    if (method === "offset" || method === "offsets") {
      this.compute("offset");
      return this.json({ offset: true });
    }
    if (method === "array") {
      const arr = this.docs.map((terms) => {
        return terms.reduce((str, t2) => {
          return str + t2.pre + t2.text + t2.post;
        }, "").trim();
      });
      return arr.filter((str) => str);
    }
    if (method === "freq" || method === "frequency" || method === "topk") {
      return topk(this.json({ normal: true }).map((o) => o.normal));
    }
    if (method === "terms") {
      return this.docs.flatMap((terms) => terms.map((t2) => t2.text).filter(Boolean));
    }
    if (method === "tags") {
      return this.docs.map((terms) => {
        return terms.reduce((h, t2) => {
          h[t2.implicit || t2.normal] = Array.from(t2.tags);
          return h;
        }, {});
      });
    }
    if (method === "best-tag") {
      this.compute("tagRank");
      return this.docs.map((ts) => {
        return ts.map((t2) => t2.tagRank?.[0] ? `#${t2.tagRank[0]}` : "").join(" ");
      }).join("\n");
    }
    if (method === "debug") {
      return this.debug();
    }
    return this.text();
  };
  var methods13 = {
    /** */
    debug: debug_default3,
    /** */
    out,
    /** */
    wrap: function(obj) {
      return wrap_default(this, obj);
    }
  };
  var out_default = methods13;

  // node_modules/compromise/src/1-one/output/api/text.js
  var isObject6 = (val) => {
    return Object.prototype.toString.call(val) === "[object Object]";
  };
  var spacedDash = /^\s+[-—]\s+$/;
  var text_default = {
    /** */
    text: function(fmt2) {
      let opts2 = {};
      if (fmt2 && typeof fmt2 === "string" && Object.hasOwn(fmts_default, fmt2)) {
        opts2 = { ...fmts_default[fmt2] };
      } else if (fmt2 && isObject6(fmt2)) {
        opts2 = { ...fmt2 };
      }
      if (opts2.keepSpace === void 0 && !this.isFull()) {
        opts2.keepSpace = false;
      }
      if (opts2.keepEndPunct === void 0 && this.pointer) {
        const ptr = this.pointer[0];
        const lastTerm = this.docs.at(-1)?.at(-1);
        if (ptr?.[1] || spacedDash.test(lastTerm?.post)) {
          opts2.keepEndPunct = false;
        } else {
          opts2.keepEndPunct = true;
        }
      }
      if (opts2.keepPunct === void 0) {
        opts2.keepPunct = true;
      }
      if (opts2.keepSpace === void 0) {
        opts2.keepSpace = true;
      }
      return textFromDoc(this.docs, opts2);
    }
  };

  // node_modules/compromise/src/1-one/output/api/index.js
  var methods14 = { ...out_default, ...text_default, ...json_default, ...html_default };
  var addAPI3 = function(View2) {
    Object.assign(View2.prototype, methods14);
  };
  var api_default5 = addAPI3;

  // node_modules/compromise/src/1-one/output/methods/debug/client-side.js
  var logClientSide = function(view) {
    console.log("%c -=-=- ", "background-color:#6699cc;");
    view.forEach((m3) => {
      console.groupCollapsed(m3.text());
      const terms = m3.docs[0];
      const out3 = terms.map((t2) => {
        let text = t2.text || "-";
        if (t2.implicit) {
          text = "[" + t2.implicit + "]";
        }
        const tags = "[" + Array.from(t2.tags).join(", ") + "]";
        return { text, tags };
      });
      console.table(out3, ["text", "tags"]);
      console.groupEnd();
    });
  };
  var client_side_default = logClientSide;

  // node_modules/compromise/src/1-one/output/methods/debug/tags.js
  var tagString = function(tags, model5) {
    if (model5.one.tagSet) {
      tags = tags.map((tag) => {
        if (!Object.hasOwn(model5.one.tagSet, tag)) {
          return tag;
        }
        const c = model5.one.tagSet[tag].color || "blue";
        return color_exports[c](tag);
      });
    }
    return tags.join(", ");
  };
  var showTags = function(view) {
    const { docs, model: model5 } = view;
    if (docs.length === 0) {
      console.log(blue("\n     \u2500\u2500\u2500\u2500\u2500\u2500"));
    }
    docs.forEach((terms) => {
      console.log(blue("\n  \u256D\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500"));
      terms.forEach((t2) => {
        const tags = [...t2.tags || []];
        let text = t2.text || "-";
        if (t2.sense) {
          text = `{${t2.normal}/${t2.sense}}`;
        }
        if (t2.implicit) {
          text = "[" + t2.implicit + "]";
        }
        text = yellow(text);
        let word = "'" + text + "'";
        if (t2.reference) {
          const str2 = view.update([t2.reference]).text("normal");
          word += ` - ${dim(i("[" + str2 + "]"))}`;
        }
        word = word.padEnd(18);
        const str = blue("  \u2502 ") + i(word) + "  - " + tagString(tags, model5);
        console.log(str);
      });
    });
    console.log("\n");
  };
  var tags_default = showTags;

  // node_modules/compromise/src/1-one/output/methods/debug/chunks.js
  var colors = { Noun: blue, Verb: green, Adjective: yellow, Pivot: red };
  var showChunks = (view) => {
    console.log("");
    view.docs.forEach((terms) => {
      const out3 = terms.map((term) => {
        const text = term.implicit || term.normal;
        if (Object.hasOwn(colors, term.chunk)) {
          return colors[term.chunk](text);
        }
        return text;
      });
      console.log(out3.join(" "), "\n");
    });
    console.log("\n");
  };
  var chunks_default = showChunks;

  // node_modules/compromise/src/1-one/output/methods/debug/highlight.js
  var spliceIn = (txt, offset2, index3) => {
    const start2 = offset2.start + index3 * 9;
    const end2 = start2 + offset2.length;
    return txt.substring(0, start2) + blue(txt.substring(start2, end2)) + txt.substring(end2);
  };
  var showHighlight = function(doc) {
    if (!doc.found) {
      return;
    }
    const bySentence = {};
    doc.fullPointer.forEach((ptr) => {
      bySentence[ptr[0]] ||= [];
      bySentence[ptr[0]].push(ptr);
    });
    Object.keys(bySentence).forEach((k2) => {
      const full = doc.update([[Number(k2)]]);
      let txt = full.text();
      const matches3 = doc.update(bySentence[k2]);
      const json = matches3.json({ offset: true });
      json.forEach((obj, i3) => {
        txt = spliceIn(txt, obj.offset, i3);
      });
      console.log(txt);
    });
    console.log("\n");
  };
  var highlight_default = showHighlight;

  // node_modules/compromise/src/1-one/output/methods/debug/index.js
  var debug4 = {
    tags: tags_default,
    clientSide: client_side_default,
    chunks: chunks_default,
    highlight: highlight_default
  };
  var debug_default4 = debug4;

  // node_modules/compromise/src/1-one/output/_spec-failures.js
  var specFailures = (doc, slots, patterns, aliases4) => {
    const terms = doc.docs.flat();
    const failures = [];
    if (terms.length !== slots.length) {
      failures.push({
        code: "length",
        expected: slots.length,
        actual: terms.length,
        message: `expected ${slots.length} terms, got ${terms.length}`
      });
    }
    doc.compute("tagRank");
    slots.forEach((slot, i3) => {
      const term = terms[i3];
      const actual = term ? Array.from(term.tags) : [];
      const detail = { term: i3 + 1, word: term?.implicit || term?.text || "", expected: slot, actual };
      if (patterns[i3] === null) {
        failures.push({ ...detail, code: "syntax", message: `term ${i3 + 1}: invalid slot ${slot.join("|")}` });
        return;
      }
      if (!term) {
        return;
      }
      const problems = [];
      slot.forEach((value) => {
        if (value === ".") {
          return;
        }
        const negative = value.startsWith("!");
        const tag = value.replace(/^!?#?/, "");
        const present2 = term.tags.has(aliases4[tag] || tag);
        if (negative && present2) {
          problems.push(`unexpected #${tag}`);
        } else if (!negative && !present2) {
          problems.push(`missing #${tag}`);
        }
      });
      if (problems.length > 0) {
        const best = term.tagRank?.[0] || actual.at(-1) || "Untagged";
        failures.push({
          ...detail,
          code: "tags",
          message: `term ${i3 + 1} '${detail.word}': #${best}, ${problems.join(", ")}`
        });
      }
    });
    if (failures.length === 0) {
      failures.push({ code: "match", message: "tags align, but the sentence pattern did not match" });
    }
    return failures;
  };
  var spec_failures_default = specFailures;

  // node_modules/compromise/src/1-one/output/_spec-log.js
  var logSpec = (doc, slots, failures, aliases4) => {
    const terms = doc.docs.flat();
    const wrong = new Set(failures.filter((failure) => failure.term).map((failure) => failure.term - 1));
    const invalid2 = new Set(failures.filter((failure) => failure.code === "syntax").map((failure) => failure.term - 1));
    const unmatched = failures.some((failure) => failure.code === "match");
    let visible = 0;
    terms.forEach((term, i3) => {
      if (term.text) {
        visible = i3;
      }
      if (wrong.has(i3) || i3 >= slots.length || unmatched) {
        wrong.add(visible);
      }
    });
    const text = terms.map((term, i3) => {
      const word = wrong.has(i3) && term.text ? red(term.text) : term.text;
      return term.pre + word + term.post;
    }).join("").trim();
    const tags = slots.map((slot, i3) => {
      const term = terms[i3];
      if (!term || invalid2.has(i3) || unmatched) {
        return red(slot.join("|"));
      }
      return slot.map((value) => {
        if (value === ".") {
          return value;
        }
        const negative = value.startsWith("!");
        const tag = value.replace(/^!?#?/, "");
        const present2 = term.tags.has(aliases4[tag] || tag);
        return present2 === negative ? red(value) : value;
      }).join("|");
    }).join(",");
    const block = slots.length === 0 ? red("{}") : `{${tags}}`;
    return `${text} ${block}`;
  };
  var spec_log_default = logSpec;

  // node_modules/compromise/src/1-one/output/_spec-lib.js
  var lastBrace = /\{(?=[^{]*$)/;
  var comment = /\}[ \t]*#.*$/;
  var parseLine = function(line = "") {
    let [text, tags] = line.split(lastBrace);
    if (tags === void 0) {
      return { text: text.replace(/\s#.*$/, "").trimEnd(), tags: null };
    }
    tags = tags.replace(comment, "}");
    tags = tags.split(",").map((tag) => tag.trim());
    const lastTag = tags[tags.length - 1];
    tags[tags.length - 1] = lastTag.replace(/\}$/, "");
    tags = tags.map((tag) => tag.split("|").map((t2) => t2.trim()));
    if (tags.length === 1 && tags[0].length === 1 && tags[0][0] === "") {
      tags = [];
    }
    return { text, tags };
  };
  var toMatchString = function(tags, aliases4) {
    if (tags.some((slot) => slot.some((tag) => tag !== "." && !/^!?#?[a-z][a-z0-9]*$/i.test(tag)))) {
      return null;
    }
    return tags.map((arr) => {
      arr = arr.map((str) => {
        if (str === ".") {
          return ".";
        }
        const negative = str.startsWith("!");
        const tag = str.replace(/^!?#?/, "");
        const prefix5 = negative ? "!#" : "#";
        return prefix5 + (aliases4[tag] || tag);
      });
      if (arr.length > 1) {
        return `(${arr.join(" && ")})`;
      }
      return arr[0];
    }).join(" ");
  };
  var applyTags = (doc, slots, aliases4) => {
    const terms = doc.terms();
    doc.docs.flat().forEach((term) => term.tags.clear());
    slots?.forEach((slot, i3) => {
      const tags = slot.filter((tag) => tag !== "." && !tag.startsWith("!")).map((tag) => {
        tag = tag.replace(/^#/, "");
        return aliases4[tag] || tag;
      });
      terms.eq(i3).tag(tags, "fromSpec");
    });
  };

  // node_modules/compromise/src/1-one/output/fromSpec.js
  var fromSpec = function(spec, { tags: tagMode = "ignore", failures: failureMode = "ignore", verbose: verbose2 = false } = {}) {
    if (!["ignore", "use"].includes(tagMode) || !["ignore", "throw", "retain", "log"].includes(failureMode)) {
      throw new Error("Invalid fromSpec options");
    }
    const aliases4 = this.world().model.one.tagAliases;
    const result = this("");
    result.failures = [];
    spec.split("\n").forEach((line, index3) => {
      if (!line.trim() || /^\s*#/.test(line)) {
        return;
      }
      const { text, tags } = parseLine(line);
      const doc = tagMode === "use" ? this.tokenize(text) : this(text);
      let failures = [];
      if (tags !== null && (tagMode === "use" || failureMode !== "ignore")) {
        const count = doc.docs.reduce((sum, terms) => sum + terms.length, 0);
        const patterns = tags.map((slot) => toMatchString([slot], aliases4));
        const pattern = toMatchString(tags, aliases4);
        const canApply = count === tags.length && pattern !== null;
        if (tagMode === "use" && !canApply && failureMode !== "log") {
          const invalid2 = spec_failures_default(doc, tags, patterns, aliases4);
          throw new Error(`${text.trim()} - ${invalid2.map((failure) => failure.message).join("; ")}`);
        }
        if (tagMode === "use") {
          applyTags(doc, canApply ? tags : null, aliases4);
        }
        if (failureMode !== "ignore" && (count !== tags.length || pattern === null || !doc.has(pattern))) {
          failures = spec_failures_default(doc, tags, patterns, aliases4).map((failure) => ({ line: index3 + 1, text: text.trim(), ...failure }));
          result.failures.push(...failures);
        }
      } else if (tagMode === "use") {
        applyTags(doc, null, aliases4);
      }
      const detail = failures.map((failure) => failure.message).join("; ");
      if (failureMode === "log" && failures.length > 0) {
        console.error(spec_log_default(doc, tags, failures, aliases4));
      } else if (verbose2) {
        const block = tags === null ? "" : ` {${tags.map((slot) => slot.join("|")).join(",")}}`;
        if (failures.length > 0) {
          console.log(`${red("\u2717")} ${text}${dim(block)} - ${red(detail)}`);
        } else {
          console.log(`${green("\u2713")} ${green(dim(text))}${dim(block)}`);
        }
      }
      if (failures.length > 0 && failureMode === "throw") {
        throw new Error(`${text.trim()} - ${detail}`);
      }
      if (failureMode === "retain" && tags !== null && failures.length === 0) {
        return;
      }
      if (doc.found) {
        const previous = result.document.at(-1)?.at(-1);
        if (previous) {
          previous.post += "\n";
        }
        result.document.push(...doc.docs);
      }
    });
    return result;
  };
  var testSpec = function(spec, verbose2 = true, throwError = false) {
    const result = this.fromSpec(spec, { tags: "ignore", failures: "retain", verbose: verbose2 });
    if (throwError && result.failures.length > 0) {
      const failure = result.failures[0];
      throw new Error(`${failure.text} - ${failure.message}`);
    }
    return result;
  };

  // node_modules/compromise/src/1-one/output/plugin.js
  var plugin_default8 = {
    lib: {
      fromSpec,
      testSpec
    },
    api: api_default5,
    methods: {
      one: {
        hash: hash_default,
        debug: debug_default4
      }
    }
  };

  // node_modules/compromise/src/1-one/pointers/api/lib/_lib.js
  var doesOverlap = function(a, b2) {
    if (a[0] !== b2[0]) {
      return false;
    }
    const [, startA, endA] = a;
    const [, startB, endB] = b2;
    if (startA <= startB && endA > startB) {
      return true;
    }
    if (startB <= startA && endB > startA) {
      return true;
    }
    return false;
  };
  var getExtent = function(ptrs) {
    let min2 = ptrs[0][1];
    let max3 = ptrs[0][2];
    ptrs.forEach((ptr) => {
      if (ptr[1] < min2) {
        min2 = ptr[1];
      }
      if (ptr[2] > max3) {
        max3 = ptr[2];
      }
    });
    return [ptrs[0][0], min2, max3];
  };
  var indexN = function(ptrs) {
    const byN = {};
    ptrs.forEach((ref) => {
      byN[ref[0]] ||= [];
      byN[ref[0]].push(ref);
    });
    return byN;
  };
  var uniquePtrs = function(arr) {
    const obj = {};
    for (let i3 = 0; i3 < arr.length; i3 += 1) {
      obj[arr[i3].join(",")] = arr[i3];
    }
    return Object.values(obj);
  };

  // node_modules/compromise/src/1-one/pointers/api/lib/split.js
  var pivotBy = function(full, m3) {
    const [n2, start2] = full;
    const mStart = m3[1];
    const mEnd = m3[2];
    const res = {};
    if (start2 < mStart) {
      const end2 = mStart < full[2] ? mStart : full[2];
      res.before = [n2, start2, end2];
    }
    res.match = m3;
    if (full[2] > mEnd) {
      res.after = [n2, mEnd, full[2]];
    }
    return res;
  };
  var doesMatch2 = function(full, m3) {
    return full[1] <= m3[1] && m3[2] <= full[2];
  };
  var splitAll = function(full, m3) {
    const byN = indexN(m3);
    const res = [];
    full.forEach((ptr) => {
      const [n2] = ptr;
      let matches3 = byN[n2] || [];
      matches3 = matches3.filter((p4) => doesMatch2(ptr, p4));
      if (matches3.length === 0) {
        res.push({ passthrough: ptr });
        return;
      }
      matches3 = matches3.sort((a, b2) => a[1] - b2[1]);
      let carry = ptr;
      matches3.forEach((p4, i3) => {
        const found = pivotBy(carry, p4);
        if (!matches3[i3 + 1]) {
          res.push(found);
        } else {
          res.push({ before: found.before, match: found.match });
          if (found.after) {
            carry = found.after;
          }
        }
      });
    });
    return res;
  };
  var split_default2 = splitAll;

  // node_modules/compromise/src/1-one/pointers/methods/getDoc.js
  var max = 20;
  var blindSweep = function(id, doc, n2) {
    for (let i3 = 0; i3 < max; i3 += 1) {
      if (doc[n2 - i3]) {
        const index3 = doc[n2 - i3].findIndex((term) => term.id === id);
        if (index3 !== -1) {
          return [n2 - i3, index3];
        }
      }
      if (doc[n2 + i3]) {
        const index3 = doc[n2 + i3].findIndex((term) => term.id === id);
        if (index3 !== -1) {
          return [n2 + i3, index3];
        }
      }
    }
    return null;
  };
  var repairEnding = function(ptr, document) {
    const [n2, start2, , , endId] = ptr;
    const terms = document[n2];
    const newEnd = terms.findIndex((t2) => t2.id === endId);
    if (newEnd === -1) {
      ptr[2] = document[n2].length;
      ptr[4] = terms.length > 0 ? terms[terms.length - 1].id : null;
    } else {
      ptr[2] = newEnd;
    }
    return document[n2].slice(start2, ptr[2] + 1);
  };
  var getDoc2 = function(ptrs, document) {
    let doc = [];
    ptrs.forEach((ptr, i3) => {
      if (!ptr) {
        return;
      }
      let [n2, start2, end2, id, endId] = ptr;
      let terms = document[n2] || [];
      if (start2 === void 0) {
        start2 = 0;
      }
      if (end2 === void 0) {
        end2 = terms.length;
      }
      if (id && (!terms[start2] || terms[start2].id !== id)) {
        const wild = blindSweep(id, document, n2);
        if (wild !== null) {
          const len = end2 - start2;
          terms = document[wild[0]].slice(wild[1], wild[1] + len);
          const startId = terms[0] ? terms[0].id : null;
          ptrs[i3] = [wild[0], wild[1], wild[1] + len, startId];
        }
      } else {
        terms = terms.slice(start2, end2);
      }
      if (terms.length === 0) {
        return;
      }
      if (start2 === end2) {
        return;
      }
      if (endId && terms[terms.length - 1].id !== endId) {
        terms = repairEnding(ptr, document);
      }
      doc.push(terms);
    });
    doc = doc.filter((a) => a.length > 0);
    return doc;
  };
  var getDoc_default = getDoc2;

  // node_modules/compromise/src/1-one/pointers/methods/index.js
  var termList = function(docs) {
    const arr = [];
    for (let i3 = 0; i3 < docs.length; i3 += 1) {
      for (let t2 = 0; t2 < docs[i3].length; t2 += 1) {
        arr.push(docs[i3][t2]);
      }
    }
    return arr;
  };
  var methods_default5 = {
    one: {
      termList,
      getDoc: getDoc_default,
      pointer: {
        indexN,
        splitAll: split_default2
      }
    }
  };

  // node_modules/compromise/src/1-one/pointers/api/lib/union.js
  var getUnion = function(a, b2) {
    const both = a.concat(b2);
    const byN = indexN(both);
    let res = [];
    both.forEach((ptr) => {
      const [n2] = ptr;
      if (byN[n2].length === 1) {
        res.push(ptr);
        return;
      }
      const hmm = byN[n2].filter((m3) => doesOverlap(ptr, m3));
      hmm.push(ptr);
      const range = getExtent(hmm);
      res.push(range);
    });
    res = uniquePtrs(res);
    return res;
  };
  var union_default = getUnion;

  // node_modules/compromise/src/1-one/pointers/api/lib/difference.js
  var subtract = function(refs, not) {
    const res = [];
    const found = split_default2(refs, not);
    found.forEach((o) => {
      if (o.passthrough) {
        res.push(o.passthrough);
      }
      if (o.before) {
        res.push(o.before);
      }
      if (o.after) {
        res.push(o.after);
      }
    });
    return res;
  };
  var difference_default = subtract;

  // node_modules/compromise/src/1-one/pointers/api/lib/intersection.js
  var intersection = function(a, b2) {
    const start2 = a[1] < b2[1] ? b2[1] : a[1];
    const end2 = a[2] > b2[2] ? b2[2] : a[2];
    if (start2 < end2) {
      return [a[0], start2, end2];
    }
    return null;
  };
  var getIntersection = function(a, b2) {
    const byN = indexN(b2);
    const res = [];
    a.forEach((ptr) => {
      let hmm = byN[ptr[0]] || [];
      hmm = hmm.filter((p4) => doesOverlap(ptr, p4));
      if (hmm.length === 0) {
        return;
      }
      hmm.forEach((h) => {
        const overlap = intersection(ptr, h);
        if (overlap) {
          res.push(overlap);
        }
      });
    });
    return res;
  };
  var intersection_default = getIntersection;

  // node_modules/compromise/src/1-one/pointers/api/index.js
  var getDoc3 = (m3, view) => {
    if (typeof m3 === "string" || Array.isArray(m3)) {
      return view.match(m3);
    }
    if (!m3) {
      return view.none();
    }
    return m3;
  };
  var addIds3 = function(ptrs, docs) {
    return ptrs.map((ptr) => {
      const [n2, start2] = ptr;
      if (docs[n2] && docs[n2][start2]) {
        ptr[3] = docs[n2][start2].id;
      }
      return ptr;
    });
  };
  var methods15 = {};
  methods15.union = function(m3) {
    m3 = getDoc3(m3, this);
    let ptrs = union_default(this.fullPointer, m3.fullPointer);
    ptrs = addIds3(ptrs, this.document);
    return this.toView(ptrs);
  };
  methods15.and = methods15.union;
  methods15.intersection = function(m3) {
    m3 = getDoc3(m3, this);
    let ptrs = intersection_default(this.fullPointer, m3.fullPointer);
    ptrs = addIds3(ptrs, this.document);
    return this.toView(ptrs);
  };
  methods15.not = function(m3) {
    m3 = getDoc3(m3, this);
    let ptrs = difference_default(this.fullPointer, m3.fullPointer);
    ptrs = addIds3(ptrs, this.document);
    return this.toView(ptrs);
  };
  methods15.difference = methods15.not;
  methods15.complement = function() {
    const doc = this.all();
    let ptrs = difference_default(doc.fullPointer, this.fullPointer);
    ptrs = addIds3(ptrs, this.document);
    return this.toView(ptrs);
  };
  methods15.settle = function() {
    let ptrs = this.fullPointer;
    ptrs.forEach((ptr) => {
      ptrs = union_default(ptrs, [ptr]);
    });
    ptrs = addIds3(ptrs, this.document);
    return this.update(ptrs);
  };
  var addAPI4 = function(View2) {
    Object.assign(View2.prototype, methods15);
  };
  var api_default6 = addAPI4;

  // node_modules/compromise/src/1-one/pointers/plugin.js
  var plugin_default9 = {
    methods: methods_default5,
    api: api_default6
  };

  // node_modules/compromise/src/1-one/sweep/lib.js
  var lib_default3 = {
    // compile a list of matches into a match-net
    buildNet: function(matches3) {
      const methods19 = this.methods();
      const net3 = methods19.one.buildNet(matches3, this.world());
      net3.isNet = true;
      return net3;
    }
  };

  // node_modules/compromise/src/1-one/sweep/api.js
  var api = function(View2) {
    View2.prototype.sweep = function(net3, opts2 = {}) {
      const { world: world2, docs } = this;
      const { methods: methods19 } = world2;
      let found = methods19.one.bulkMatch(docs, net3, this.methods, opts2);
      if (opts2.tagger !== false) {
        methods19.one.bulkTagger(found, docs, this.world);
      }
      found = found.map((o) => {
        const ptr = o.pointer;
        const term = docs[ptr[0]][ptr[1]];
        const len = ptr[2] - ptr[1];
        if (term.index) {
          o.pointer = [
            term.index[0],
            term.index[1],
            ptr[1] + len
          ];
        }
        return o;
      });
      const ptrs = found.map((o) => o.pointer);
      found = found.map((obj) => {
        obj.view = this.update([obj.pointer]);
        delete obj.regs;
        delete obj.needs;
        delete obj.pointer;
        delete obj._expanded;
        return obj;
      });
      return {
        view: this.update(ptrs),
        found
      };
    };
  };
  var api_default7 = api;

  // node_modules/compromise/src/1-one/sweep/methods/buildNet/aliases.js
  var resolveAliases = (rule, aliases4) => {
    const tag = (value) => {
      if (Array.isArray(value)) {
        return value.map(tag);
      }
      if (typeof value !== "string") {
        return value;
      }
      return value.trim().split(/ +/).map((name) => {
        name = name.replace(/^#/, "");
        return aliases4[name] || name;
      }).join(" ");
    };
    const hook = (value) => {
      if (typeof value === "string" && value.startsWith("#")) {
        return "#" + tag(value);
      }
      return value;
    };
    if (rule.tag !== void 0) {
      rule.tag = tag(rule.tag);
    }
    if (rule.unTag !== void 0) {
      rule.unTag = tag(rule.unTag);
    }
    if (rule.hook !== void 0) {
      rule.hook = hook(rule.hook);
    }
    if (rule.ifNo !== void 0) {
      rule.ifNo = [rule.ifNo].flat().map(hook);
    }
  };
  var aliases_default = resolveAliases;

  // node_modules/compromise/src/1-one/sweep/methods/buildNet/_lib.js
  var canCheck = (reg) => Boolean(reg && !reg.optional && !reg.negative && !reg.greedy && !reg.choices && !reg.anything && !reg.regex && !reg.method);
  var getBoundary = (reg, boundary2) => {
    if (!canCheck(reg) || !reg[boundary2]) {
      return null;
    }
    return reg;
  };

  // node_modules/compromise/src/1-one/sweep/methods/buildNet/01-parse.js
  var getTokenNeeds = function(reg) {
    if (reg.optional === true || reg.negative === true) {
      return null;
    }
    if (reg.tag) {
      return "#" + reg.tag;
    }
    if (reg.word) {
      return reg.word;
    }
    if (reg.switch) {
      return `%${reg.switch}%`;
    }
    return null;
  };
  var hasRequiredHook = function(regs, hook) {
    return regs.some((reg) => {
      if (reg.optional || reg.negative) {
        return false;
      }
      if (getTokenNeeds(reg) === hook) {
        return true;
      }
      return reg.operator === "and" && reg.choices && reg.choices.some((side) => hasRequiredHook(side, hook));
    });
  };
  var getNeeds = function(regs) {
    const needs = [];
    regs.forEach((reg) => {
      needs.push(getTokenNeeds(reg));
      if (reg.operator === "and" && reg.choices) {
        reg.choices.forEach((oneSide) => {
          oneSide.forEach((r) => {
            needs.push(getTokenNeeds(r));
          });
        });
      }
    });
    return needs.filter((str) => str);
  };
  var getWants = function(regs) {
    const wants = [];
    let count = 0;
    regs.forEach((reg) => {
      if (reg.operator === "or" && !reg.optional && !reg.negative) {
        if (reg.fastOr) {
          Array.from(reg.fastOr).forEach((w) => {
            wants.push(w);
          });
        }
        if (reg.choices) {
          reg.choices.forEach((rs) => {
            rs.forEach((r) => {
              const n2 = getTokenNeeds(r);
              if (n2) {
                wants.push(n2);
              }
            });
          });
        }
        count += 1;
      }
    });
    return { wants, count };
  };
  var parse = function(matches3, world2) {
    const parseMatch = world2.methods.one.parseMatch;
    matches3.forEach((obj) => {
      aliases_default(obj, world2.model.one.tagAliases);
      obj.regs = parseMatch(obj.match, {}, world2);
      obj.fixed = isFixed(obj.regs);
      obj.checkFirst = canCheck(obj.regs[0]);
      obj.startTerm = getBoundary(obj.regs[0], "start");
      obj.endTerm = getBoundary(obj.regs[obj.regs.length - 1], "end");
      if (obj.notIf) {
        obj.notIf = parseMatch(obj.notIf, {}, world2);
      }
      obj.needs = getNeeds(obj.regs);
      if (obj.hook !== void 0) {
        if (typeof obj.hook !== "string" || !obj.needs.includes(obj.hook) || !hasRequiredHook(obj.regs, obj.hook)) {
          throw new Error(`Invalid hook "${obj.hook}" for match "${obj.match}": use a required word, #Tag, or %Switch%.`);
        }
      }
      const { wants, count } = getWants(obj.regs);
      obj.wants = wants;
      obj.minWant = count;
      obj.minWords = obj.regs.filter((o) => !o.optional).length;
      obj.minLength = obj.regs.filter((o) => o.optional !== true && o.negative !== true).length;
    });
    return matches3;
  };
  var parse_default = parse;

  // node_modules/compromise/src/1-one/sweep/methods/buildNet/02-index.js
  var buildIndex = function(matches3, hooks2, hookOrder) {
    const index3 = /* @__PURE__ */ Object.create(null);
    const seen = /* @__PURE__ */ new Set();
    const lastRank = Object.keys(hooks2).length;
    matches3.forEach((rule, order) => {
      if (seen.has(rule)) {
        return;
      }
      seen.add(rule);
      let anchor = null;
      let rank = lastRank;
      for (let i3 = 0; i3 < rule.needs.length; i3 += 1) {
        const key = rule.needs[i3];
        if (anchor === null || hooks2[key].length < hooks2[anchor].length) {
          anchor = key;
        }
        rank = Math.min(rank, hookOrder[key]);
      }
      if (rule.hook !== void 0) {
        anchor = rule.hook;
      }
      const earlier = [...new Set(rule.wants)].filter((key) => hookOrder[key] < rank).sort((a, b2) => hookOrder[a] - hookOrder[b2]);
      const keys2 = anchor === null ? [...new Set(rule.wants)] : [anchor];
      const needs = [...new Set(rule.needs)].filter((key) => key !== anchor);
      const entry = { rule, order, rank, earlier, needs, single: keys2.length === 1 };
      for (let i3 = 0; i3 < keys2.length; i3 += 1) {
        const key = keys2[i3];
        index3[key] ||= [];
        index3[key].push(entry);
      }
    });
    return index3;
  };
  var index_default = buildIndex;

  // node_modules/compromise/src/1-one/sweep/methods/buildNet/index.js
  var buildNet = function(matches3, world2) {
    matches3 = parse_default(matches3, world2);
    const hooks2 = {};
    matches3.forEach((obj) => {
      obj.needs.forEach((str) => {
        hooks2[str] = Array.isArray(hooks2[str]) ? hooks2[str] : [];
        hooks2[str].push(obj);
      });
      obj.wants.forEach((str) => {
        hooks2[str] = Array.isArray(hooks2[str]) ? hooks2[str] : [];
        hooks2[str].push(obj);
      });
    });
    const hookOrder = /* @__PURE__ */ Object.create(null);
    Object.keys(hooks2).forEach((k2, i3) => {
      hookOrder[k2] = i3;
      const already = /* @__PURE__ */ new Set();
      hooks2[k2] = hooks2[k2].filter((obj) => {
        if (already.has(obj)) {
          return false;
        }
        already.add(obj);
        return true;
      });
    });
    const always = matches3.filter((o) => o.needs.length === 0 && o.wants.length === 0);
    return {
      hooks: hooks2,
      hookOrder,
      index: index_default(matches3, hooks2, hookOrder),
      always
    };
  };
  var buildNet_default = buildNet;

  // node_modules/compromise/src/1-one/sweep/methods/sweep/_lib.js
  var canMatch = (obj, haves, terms, needs = obj.needs) => {
    const termCount = terms.length;
    if (!(termCount >= obj.minWords)) {
      return false;
    }
    for (let j = 0; j < needs.length; j += 1) {
      if (!haves.has(needs[j])) {
        return false;
      }
    }
    if (obj.ifNo !== void 0) {
      for (let j = 0; j < obj.ifNo.length; j += 1) {
        if (haves.has(obj.ifNo[j])) {
          return false;
        }
      }
    }
    if (obj.wants.length > 0) {
      let count = 0;
      for (let j = 0; j < obj.wants.length; j += 1) {
        if (haves.has(obj.wants[j])) {
          count += 1;
          if (count >= obj.minWant) {
            break;
          }
        }
      }
      if (!(count >= obj.minWant)) {
        return false;
      }
    }
    if (termCount && obj.startTerm && !doesMatch_default(terms[0], obj.startTerm, 0, termCount)) {
      return false;
    }
    if (termCount && obj.endTerm && !doesMatch_default(terms[termCount - 1], obj.endTerm, termCount - 1, termCount)) {
      return false;
    }
    return true;
  };
  var lib_default4 = canMatch;

  // node_modules/compromise/src/1-one/sweep/methods/sweep/01-getHooks.js
  var getIndexed = function(set, index3, hookOrder, terms) {
    const found = [];
    const seen = /* @__PURE__ */ new Set();
    set.forEach((key) => {
      const bucket = index3[key];
      if (!Array.isArray(bucket)) {
        return;
      }
      for (let i3 = 0; i3 < bucket.length; i3 += 1) {
        const entry = bucket[i3];
        if (entry.single !== true) {
          if (seen.has(entry)) {
            continue;
          }
          seen.add(entry);
        }
        if (!lib_default4(entry.rule, set, terms, entry.needs)) {
          continue;
        }
        let rank = entry.rank;
        for (let j = 0; j < entry.earlier.length; j += 1) {
          const earlier = entry.earlier[j];
          if (set.has(earlier)) {
            rank = hookOrder[earlier];
            break;
          }
        }
        if (rank === entry.rank) {
          found.push(entry);
        } else {
          found.push({ rule: entry.rule, rank, order: entry.order });
        }
      }
    });
    found.sort((a, b2) => a.rank - b2.rank || a.order - b2.order);
    return found.map((entry) => entry.rule);
  };
  var getHooks = function(docCaches, net3, document) {
    const { hooks: hooks2, index: index3, always } = net3;
    let { hookOrder } = net3;
    if (!hookOrder) {
      hookOrder = /* @__PURE__ */ Object.create(null);
      Object.keys(hooks2).forEach((k2, i3) => {
        hookOrder[k2] = i3;
      });
    }
    const lists = docCaches.map((set, n2) => {
      if (index3) {
        return getIndexed(set, index3, hookOrder, document[n2]);
      }
      const keys2 = [];
      set.forEach((k2) => {
        if (typeof hookOrder[k2] === "number") {
          keys2.push(k2);
        }
      });
      keys2.sort((a, b2) => hookOrder[a] - hookOrder[b2]);
      const maybe = [];
      const already = /* @__PURE__ */ new Set();
      for (let i3 = 0; i3 < keys2.length; i3 += 1) {
        const bucket = hooks2[keys2[i3]];
        for (let j = 0; j < bucket.length; j += 1) {
          const m3 = bucket[j];
          if (!already.has(m3)) {
            already.add(m3);
            if (lib_default4(m3, set, document[n2])) {
              maybe.push(m3);
            }
          }
        }
      }
      return maybe;
    });
    lists.forEach((list4, n2) => {
      for (let i3 = 0; i3 < always.length; i3 += 1) {
        if (lib_default4(always[i3], docCaches[n2], document[n2])) {
          list4.push(always[i3]);
        }
      }
    });
    return lists;
  };
  var getHooks_default = getHooks;

  // node_modules/compromise/src/1-one/sweep/methods/sweep/04-runMatch.js
  var runMatch2 = function(maybeList, document, docCache, methods19, opts2) {
    const results = [];
    for (let n2 = 0; n2 < maybeList.length; n2 += 1) {
      const sentence = [document[n2]];
      for (let i3 = 0; i3 < maybeList[n2].length; i3 += 1) {
        const m3 = maybeList[n2][i3];
        const res = methods19.one.match(sentence, m3);
        if (res.ptrs.length > 0) {
          res.ptrs.forEach((ptr) => {
            ptr[0] = n2;
            const todo = { ...m3, pointer: ptr };
            if (m3.unTag !== void 0) {
              todo.unTag = m3.unTag;
            }
            results.push(todo);
          });
          if (opts2.matchOne === true) {
            return [results[0]];
          }
        }
      }
    }
    return results;
  };
  var runMatch_default = runMatch2;

  // node_modules/compromise/src/1-one/sweep/methods/sweep/index.js
  var sweep = function(document, net3, methods19, opts2 = {}) {
    const docCache = methods19.one.cacheDoc(document);
    const maybeList = getHooks_default(docCache, net3, document);
    const results = runMatch_default(maybeList, document, docCache, methods19, opts2);
    return results;
  };
  var sweep_default = sweep;

  // node_modules/compromise/src/1-one/tag/methods/_lib.js
  var sets = /* @__PURE__ */ new WeakMap();
  var empty = /* @__PURE__ */ new Set();
  var getTagSet = (tags) => {
    if (!tags || tags.length === 0) {
      return empty;
    }
    let set = sets.get(tags);
    if (!set) {
      set = new Set(tags);
      sets.set(tags, set);
    }
    return set;
  };
  var lib_default5 = getTagSet;

  // node_modules/compromise/src/1-one/sweep/methods/tagger/canBe.js
  var canBe = function(terms, tag, model5) {
    const tagSet = model5.one.tagSet;
    if (!Object.hasOwn(tagSet, tag)) {
      return true;
    }
    const conflicts = lib_default5(tagSet[tag].not);
    if (conflicts.size === 0) {
      return true;
    }
    for (let i3 = 0; i3 < terms.length; i3 += 1) {
      const term = terms[i3];
      for (const existing of term.tags) {
        if (conflicts.has(existing)) {
          return false;
        }
      }
    }
    return true;
  };
  var canBe_default = canBe;

  // node_modules/compromise/src/1-one/sweep/methods/tagger/index.js
  var tagger = function(list4, document, world2) {
    const { model: model5, methods: methods19 } = world2;
    const { getDoc: getDoc4, setTag: setTag2, unTag: unTag2 } = methods19.one;
    const looksPlural2 = methods19.two.looksPlural;
    if (list4.length === 0) {
      return list4;
    }
    return list4.map((todo) => {
      if (!todo.tag && !todo.chunk && !todo.unTag) {
        return;
      }
      const reason2 = todo.reason || todo.match;
      const terms = getDoc4([todo.pointer], document)[0];
      let validated;
      if (todo.safe === true) {
        if (canBe_default(terms, todo.tag, model5) === false) {
          return;
        }
        if (terms[terms.length - 1].post === "-") {
          return;
        }
        if (typeof todo.tag === "string" && Object.hasOwn(model5.one.tagSet, todo.tag)) {
          validated = model5.one.tagSet[todo.tag];
        }
      }
      if (todo.tag !== void 0) {
        setTag2(terms, todo.tag, world2, todo.safe, `[post] '${reason2}'`, validated);
        if (todo.tag === "Noun" && looksPlural2) {
          const term = terms[terms.length - 1];
          if (looksPlural2(term.text)) {
            setTag2([term], "Plural", world2, todo.safe, "quick-plural");
          } else {
            setTag2([term], "Singular", world2, todo.safe, "quick-singular");
          }
        }
        if (todo.freeze === true) {
          terms.forEach((term) => term.frozen = true);
        }
      }
      if (todo.unTag !== void 0) {
        unTag2(terms, todo.unTag, model5.one.tagSet, reason2);
      }
      if (todo.chunk) {
        terms.forEach((t2) => t2.chunk = todo.chunk);
      }
    });
  };
  var tagger_default = tagger;

  // node_modules/compromise/src/1-one/sweep/methods/index.js
  var methods_default6 = {
    buildNet: buildNet_default,
    bulkMatch: sweep_default,
    bulkTagger: tagger_default
  };

  // node_modules/compromise/src/1-one/sweep/plugin.js
  var plugin_default10 = {
    lib: lib_default3,
    api: api_default7,
    methods: {
      one: methods_default6
    }
  };

  // node_modules/compromise/src/1-one/tag/methods/setTag.js
  var isMulti = / /;
  var addChunk = function(term, tag) {
    if (tag === "Noun") {
      term.chunk = tag;
    }
    if (tag === "Verb") {
      term.chunk = tag;
    }
  };
  var tagTerm = function(term, tag, tagSet, isSafe, validated, reason2) {
    if (term.tags.has(tag) === true) {
      return null;
    }
    if (tag === ".") {
      return null;
    }
    if (term.frozen === true) {
      isSafe = true;
    }
    const previous = debug_default.tags ? debug_default.before(term) : null;
    const known = tagSet[tag];
    if (known) {
      if (known !== validated && known.not && known.not.length > 0) {
        const conflicts = lib_default5(known.not);
        for (const existing of term.tags) {
          if (conflicts.has(existing)) {
            if (isSafe === true) {
              return null;
            }
            term.tags.delete(existing);
          }
        }
      }
      if (known.parents && known.parents.length > 0) {
        for (let o = 0; o < known.parents.length; o += 1) {
          term.tags.add(known.parents[o]);
          addChunk(term, known.parents[o]);
        }
      }
    }
    term.tags.add(tag);
    term.dirty = true;
    addChunk(term, tag);
    if (previous) {
      debug_default.log(term, previous, reason2);
    }
    return true;
  };
  var multiTag = function(terms, tagString2, tagSet, aliases4, isSafe, reason2) {
    const tags = tagString2.split(isMulti);
    terms.forEach((term, i3) => {
      let tag = tags[i3];
      if (tag) {
        tag = tag.replace(/^#/, "");
        tag = aliases4?.[tag] || tag;
        tagTerm(term, tag, tagSet, isSafe, void 0, reason2);
      }
    });
  };
  var setTag = function(terms, tag, world2 = {}, isSafe, reason2, validated) {
    const tagSet = world2.model.one.tagSet || {};
    if (!tag) {
      return;
    }
    if (Array.isArray(tag) === true) {
      tag.forEach((tg) => setTag(terms, tg, world2, isSafe, reason2));
      return;
    }
    if (typeof tag !== "string") {
      console.warn(`compromise: Invalid tag '${tag}'`);
      return;
    }
    tag = tag.trim();
    if (isMulti.test(tag)) {
      multiTag(terms, tag, tagSet, world2.model.one.tagAliases, isSafe, reason2);
      return;
    }
    tag = tag.replace(/^#/, "");
    tag = world2.model.one.tagAliases?.[tag] || tag;
    for (let i3 = 0; i3 < terms.length; i3 += 1) {
      tagTerm(terms[i3], tag, tagSet, isSafe, validated, reason2);
    }
  };
  var setTag_default = setTag;

  // node_modules/compromise/src/1-one/tag/methods/unTag.js
  var unTag = function(terms, tag, tagSet, reason2 = "untag") {
    tag = tag.trim().replace(/^#/, "");
    const children = lib_default5(tagSet[tag]?.children);
    for (let i3 = 0; i3 < terms.length; i3 += 1) {
      const term = terms[i3];
      if (term.frozen === true) {
        continue;
      }
      const previous = debug_default.tags ? debug_default.before(term) : null;
      if (tag === "*") {
        term.tags.clear();
        if (previous) {
          debug_default.log(term, previous, reason2);
        }
        continue;
      }
      if (children.size > 0) {
        for (const existing of term.tags) {
          if (children.has(existing)) {
            term.tags.delete(existing);
          }
        }
      }
      term.tags.delete(tag);
      if (previous) {
        debug_default.log(term, previous, reason2);
      }
    }
  };
  var unTag_default = unTag;

  // node_modules/compromise/src/1-one/tag/methods/canBe.js
  var canBe2 = function(term, tag, tagSet) {
    if (!Object.hasOwn(tagSet, tag)) {
      return true;
    }
    const conflicts = lib_default5(tagSet[tag].not);
    if (conflicts.size === 0) {
      return true;
    }
    for (const existing of term.tags) {
      if (conflicts.has(existing)) {
        return false;
      }
    }
    return true;
  };
  var canBe_default2 = canBe2;

  // node_modules/compromise/src/1-one/tag/methods/graph/input/_validate.js
  var validate = function(node) {
    node.children = node.children || [];
    node._cache = node._cache || {};
    node.props = node.props || {};
    node._cache.parents = node._cache.parents || [];
    return node;
  };
  var validate_default = validate;

  // node_modules/compromise/src/1-one/tag/methods/graph/input/check-cycles.js
  var checkCycles = (roots) => {
    const states = /* @__PURE__ */ new Map();
    const stack = roots.map((node) => [node, false]);
    for (; stack.length > 0; ) {
      const [node, done] = stack.pop();
      if (done) {
        states.set(node, 2);
      } else if (states.get(node) === 1) {
        throw new Error("[Grad] - cyclic input");
      } else if (!states.has(node)) {
        states.set(node, 1);
        stack.push([node, true]);
        for (const child of node.children || []) {
          stack.push([child, false]);
        }
      }
    }
    return states.keys();
  };
  var check_cycles_default = checkCycles;

  // node_modules/compromise/src/1-one/tag/methods/graph/input/from-array.js
  var fromArray = function(rows) {
    const index3 = /* @__PURE__ */ new Map();
    rows.forEach((node) => {
      validate_default(node);
      index3.set(node.id, node);
    });
    const root = validate_default({});
    rows.forEach((node) => {
      if (node.parent) {
        if (index3.has(node.parent)) {
          const parent = index3.get(node.parent);
          delete node.parent;
          parent.children.push(node);
        } else {
          console.warn(`[Grad] - missing node '${node.parent}'`);
        }
        return;
      }
      root.children.push(node);
    });
    check_cycles_default(rows);
    return root;
  };
  var from_array_default = fromArray;

  // node_modules/compromise/src/1-one/tag/methods/graph/crawl/crawl.js
  var byDepth = (root, fn, collect2 = true) => {
    const list4 = collect2 ? [] : null;
    const queue = [root];
    for (; queue.length > 0; ) {
      const node = queue.pop();
      if (collect2) {
        list4.push(node);
      }
      if (node.children) {
        for (let i3 = node.children.length - 1; i3 >= 0; i3 -= 1) {
          const child = node.children[i3];
          if (fn) {
            fn(node, child);
          }
          queue.push(child);
        }
      }
    }
    return list4;
  };
  var crawl_default = byDepth;

  // node_modules/compromise/src/1-one/tag/methods/graph/crawl/cache.js
  var cacheParents = (root) => {
    crawl_default(root, (parent, child) => {
      if (parent.id) {
        child._cache.parents = parent._cache.parents.concat([parent.id]);
      }
    }, false);
  };
  var cache_default = cacheParents;

  // node_modules/compromise/src/1-one/tag/methods/graph/crawl/fillDown.js
  var inherit = (props, parent) => {
    if (parent.not) {
      props.not = /* @__PURE__ */ new Set([...props.not, ...parent.not]);
    }
    if (Array.isArray(parent.also) && (props.also === void 0 || Array.isArray(props.also))) {
      props.also = parent.also.concat(props.also || []);
    } else if (props.also === void 0) {
      props.also = parent.also;
    }
    if (props.is === void 0) {
      props.is = parent.is;
    }
    if (props.novel === void 0) {
      props.novel = parent.novel;
    }
    return props;
  };
  var fillDown = (root) => {
    crawl_default(root, (parent, child) => {
      child.props = inherit(child.props, parent.props);
    }, false);
  };
  var fillDown_default = fillDown;

  // node_modules/compromise/src/1-one/tag/methods/graph/lib/color.js
  var reset = "\x1B[0m";
  var cli = {
    // green: str => '\x1b[32m' + str + reset,
    red: (str) => "\x1B[31m" + str + reset,
    // blue: str => '\x1b[34m' + str + reset,
    // magenta: str => '\x1b[35m' + str + reset,
    // cyan: str => '\x1b[36m' + str + reset,
    // yellow: str => '\x1b[33m' + str + reset,
    // black: str => '\x1b[30m' + str + reset,
    dim: (str) => "\x1B[2m" + str + reset
  };
  var color_default = cli;

  // node_modules/compromise/src/1-one/tag/methods/graph/out/toText.js
  var indent = "    ";
  var toText2 = function(json, color2) {
    let arrow = "-> ";
    if (color2) {
      arrow = color_default.dim("\u2192 ");
    }
    let txt = "";
    const rows = crawl_default(json);
    rows.forEach((node, i3) => {
      let label = node.id || "";
      if (color2) {
        label = color_default.red(label);
      }
      if (i3 === 0 && !node.id) {
        return;
      }
      const depth = node._cache.parents.length;
      txt += indent.repeat(depth) + arrow + label + "\n";
    });
    return txt;
  };
  var toText_default = toText2;

  // node_modules/compromise/src/1-one/tag/methods/graph/out/toArray.js
  var toArray = function(json) {
    const nodes = crawl_default(json);
    const root = nodes[0];
    if (root && !root.id && Object.keys(root.props).length === 0) {
      nodes.shift();
    }
    return nodes;
  };
  var toArray_default = toArray;

  // node_modules/compromise/src/1-one/tag/methods/graph/out/index.js
  var fmts2 = {
    text: toText_default,
    txt: toText_default,
    array: toArray_default,
    flat: toArray_default
  };
  var out2 = function(root, label) {
    if (label === "nested" || label === "json") {
      return root;
    }
    if (label === "debug") {
      console.log(toText_default(root, true));
      return null;
    }
    if (fmts2.hasOwnProperty(label)) {
      return fmts2[label](root);
    }
    return root;
  };
  var out_default2 = out2;

  // node_modules/compromise/src/1-one/tag/methods/graph/index.js
  var Graph = class {
    constructor(json) {
      Object.defineProperty(this, "json", {
        enumerable: false,
        value: json,
        writable: true
      });
    }
    cache() {
      cache_default(this.json);
      return this;
    }
    fillDown() {
      fillDown_default(this.json);
      return this;
    }
    out(fmt2) {
      return out_default2(this.json, fmt2);
    }
  };
  var graph = (rows) => new Graph(from_array_default(rows));
  var graph_default = graph;

  // node_modules/compromise/src/1-one/tag/methods/addTags/_colors.js
  var colors2 = {
    Noun: "blue",
    Verb: "green",
    Negative: "green",
    Date: "red",
    Value: "red",
    Adjective: "magenta",
    Connector: "cyan",
    Determiner: "cyan",
    Hyphenated: "cyan",
    Adverb: "cyan"
  };
  var colors_default = colors2;

  // node_modules/compromise/src/1-one/tag/methods/addTags/02-fmt.js
  var getColor = function(node) {
    if (Object.hasOwn(colors_default, node.id)) {
      return colors_default[node.id];
    }
    if (Object.hasOwn(colors_default, node.is)) {
      return colors_default[node.is];
    }
    const found = node._cache.parents.find((c) => colors_default[c]);
    return colors_default[found];
  };
  var fmt = function(nodes) {
    const res = {};
    nodes.forEach((node) => {
      const { not, also, is, novel } = node.props;
      let parents = node._cache.parents;
      if (also) {
        parents = parents.concat(also);
      }
      res[node.id] = {
        is,
        not,
        novel,
        also,
        parents,
        children: [],
        color: getColor(node),
        // Retain the preferred output name for legacy model consumers.
        alias: node.aliases === void 0 ? node.alias : node.aliases[0],
        aliases: node.aliases
      };
    });
    const resolved = /* @__PURE__ */ new Set();
    const resolving = /* @__PURE__ */ new Set();
    const resolveParents = function(tag) {
      if (resolved.has(tag)) {
        return res[tag].parents;
      }
      if (resolving.has(tag)) {
        throw new Error(`compromise: cyclic tag inheritance at '${tag}'`);
      }
      resolving.add(tag);
      const parents = /* @__PURE__ */ new Set();
      res[tag].parents.forEach((parent) => {
        if (res[parent]) {
          resolveParents(parent).forEach((ancestor) => parents.add(ancestor));
        }
        parents.add(parent);
      });
      res[tag].parents = Array.from(parents);
      resolving.delete(tag);
      resolved.add(tag);
      return res[tag].parents;
    };
    Object.keys(res).forEach((tag) => resolveParents(tag));
    Object.keys(res).forEach((tag) => {
      res[tag].parents.forEach((parent) => {
        if (res[parent]) {
          res[parent].children.push(tag);
        }
      });
    });
    const exclusions = {};
    Object.keys(res).forEach((tag) => {
      exclusions[tag] = res[tag].not;
    });
    Object.keys(res).forEach((k2) => {
      const nots = new Set(exclusions[k2]);
      res[k2].parents.forEach((parent) => {
        for (const not of exclusions[parent] || []) {
          nots.add(not);
        }
      });
      Array.from(nots).forEach((not) => {
        if (res[not]) {
          res[not].children.forEach((tag) => nots.add(tag));
        }
      });
      res[k2].not = Array.from(nots);
      lib_default5(res[k2].not);
      lib_default5(res[k2].children);
      const conflicts = [k2, ...res[k2].parents].filter((tag) => nots.has(tag));
      if (conflicts.length > 0) {
        const names = conflicts.map((tag) => `#${tag}`).join(", ");
        console.warn(`compromise: contradictory tag '#${k2}' requires and excludes: ${names}`);
      }
    });
    return res;
  };
  var fmt_default = fmt;

  // node_modules/compromise/src/1-one/tag/_aliases.js
  var compileAliases = (tags, normalize3) => {
    const aliases4 = /* @__PURE__ */ Object.create(null);
    Object.keys(tags).forEach((tag) => {
      aliases4[tag] = tag;
    });
    Object.keys(tags).forEach((tag) => {
      const entry = tags[tag];
      const names = entry.aliases === void 0 ? [entry.alias] : [entry.aliases].flat();
      names.forEach((name) => {
        if (name === null || name === void 0) {
          return;
        }
        if (typeof name !== "string" || !/^[\p{L}_][\p{L}\p{M}\p{N}_-]*$/u.test(name)) {
          throw new Error(`compromise: invalid alias for '#${tag}'`);
        }
        const spellings = normalize3 ? [name, normalize3(name)] : [name];
        spellings.forEach((spelling) => {
          if (Object.hasOwn(tags, spelling)) {
            if (spelling !== name && spelling !== tag) {
              throw new Error(`compromise: tag alias '${name}' normalizes to '#${spelling}'`);
            }
            return;
          }
          if (aliases4[spelling] && aliases4[spelling] !== tag) {
            throw new Error(`compromise: duplicate tag alias '${spelling}'`);
          }
          aliases4[spelling] = tag;
        });
      });
    });
    return aliases4;
  };
  var aliases_default2 = compileAliases;

  // node_modules/compromise/src/1-one/tag/methods/addTags/01-validate.js
  var toArr = function(input) {
    if (!input) {
      return [];
    }
    if (typeof input === "string") {
      return [input];
    }
    return input.slice();
  };
  var addImplied = function(tags) {
    const aliases4 = aliases_default2(tags);
    const resolve = (tag) => aliases4[tag] || tag;
    Object.keys(tags).forEach((k2) => {
      if (tags[k2].isA) {
        tags[k2].is = tags[k2].isA;
      }
      if (tags[k2].notA) {
        tags[k2].not = tags[k2].notA;
      }
      if (typeof tags[k2].is === "string") {
        tags[k2].is = resolve(tags[k2].is);
      }
      if (tags[k2].also) {
        tags[k2].also = toArr(tags[k2].also).map(resolve);
      }
      if (tags[k2].not) {
        tags[k2].not = toArr(tags[k2].not).map(resolve);
      }
      if (tags[k2].is && typeof tags[k2].is === "string") {
        if (!Object.hasOwn(tags, tags[k2].is)) {
          tags[tags[k2].is] = {};
        }
      }
      toArr(tags[k2].also).forEach((parent) => {
        if (!Object.hasOwn(tags, parent)) {
          tags[parent] = {};
        }
      });
      toArr(tags[k2].not).forEach((excluded) => {
        if (!Object.hasOwn(tags, excluded)) {
          tags[excluded] = {};
        }
      });
    });
    return tags;
  };
  var validate2 = function(tags, already) {
    tags = Object.fromEntries(Object.keys({ ...already, ...tags }).map((tag) => [tag, { ...already[tag], ...tags[tag] }]));
    tags = addImplied(tags);
    Object.keys(tags).forEach((k2) => {
      if (tags[k2].aliases !== void 0) {
        tags[k2].aliases = toArr(tags[k2].aliases);
      }
      tags[k2].children = toArr(tags[k2].children);
      tags[k2].not = toArr(tags[k2].not);
      if (tags[k2].also) {
        tags[k2].also = toArr(tags[k2].also);
      }
    });
    Object.keys(tags).forEach((k2) => {
      const nots = tags[k2].not || [];
      nots.forEach((no) => {
        if (tags[no] && tags[no].not && !tags[no].not.includes(k2)) {
          tags[no].not.push(k2);
        }
      });
    });
    return tags;
  };
  var validate_default2 = validate2;

  // node_modules/compromise/src/1-one/tag/methods/addTags/index.js
  var compute3 = function(allTags2) {
    const flatList = Object.keys(allTags2).map((k2) => {
      const o = allTags2[k2];
      const props = { not: new Set(o.not), also: o.also, is: o.is, novel: o.novel };
      return { id: k2, parent: o.is, props, children: [], alias: o.alias, aliases: o.aliases?.slice() };
    });
    const graph2 = graph_default(flatList).cache().fillDown();
    return graph2.out("array");
  };
  var fromUser = function(tags) {
    Object.keys(tags).forEach((k2) => {
      tags[k2] = { ...tags[k2] };
      tags[k2].novel = true;
    });
    return tags;
  };
  var addTags = function(tags, already) {
    tags = Object.fromEntries(Object.entries(tags).map(([tag, definition]) => [tag, { ...definition }]));
    if (Object.keys(already).length > 0) {
      tags = fromUser(tags);
    }
    tags = validate_default2(tags, already);
    const nodes = compute3(tags);
    const res = fmt_default(nodes);
    return res;
  };
  var addTags_default = addTags;

  // node_modules/compromise/src/1-one/tag/methods/index.js
  var methods_default7 = {
    one: {
      setTag: setTag_default,
      unTag: unTag_default,
      addTags: addTags_default,
      canBe: canBe_default2
    }
  };

  // node_modules/compromise/src/1-one/tag/api/tag.js
  var fns5 = {
    /** add a given tag, to all these terms */
    tag: function(input, reason2 = "", isSafe) {
      if (!this.found || !input) {
        return this;
      }
      const terms = this.termList();
      if (terms.length === 0) {
        return this;
      }
      const { methods: methods19, verbose: verbose2, world: world2 } = this;
      if (verbose2 === true) {
        console.log(" +  ", input, reason2 || "");
      }
      if (Array.isArray(input)) {
        input.forEach((tag) => methods19.one.setTag(terms, tag, world2, isSafe, reason2));
      } else {
        methods19.one.setTag(terms, input, world2, isSafe, reason2);
      }
      this.uncache();
      return this;
    },
    /** add a given tag, only if it is consistent */
    tagSafe: function(input, reason2 = "") {
      return this.tag(input, reason2, true);
    },
    /** remove a given tag from all these terms */
    unTag: function(input, reason2) {
      if (!this.found || !input) {
        return this;
      }
      const terms = this.termList();
      if (terms.length === 0) {
        return this;
      }
      const { methods: methods19, verbose: verbose2, model: model5 } = this;
      if (verbose2 === true) {
        console.log(" -  ", input, reason2 || "");
      }
      const tagSet = model5.one.tagSet;
      const resolve = (tag) => {
        tag = tag.trim().replace(/^#/, "");
        return model5.one.tagAliases[tag] || tag;
      };
      if (Array.isArray(input)) {
        input.forEach((tag) => methods19.one.unTag(terms, resolve(tag), tagSet, reason2));
      } else {
        methods19.one.unTag(terms, resolve(input), tagSet, reason2);
      }
      this.uncache();
      return this;
    },
    /** return only the terms that can be this tag  */
    canBe: function(tag) {
      tag = tag.replace(/^#/, "");
      tag = this.model.one.tagAliases[tag] || tag;
      const tagSet = this.model.one.tagSet;
      const canBe3 = this.methods.one.canBe;
      const nope2 = [];
      this.document.forEach((terms, n2) => {
        terms.forEach((term, i3) => {
          if (!canBe3(term, tag, tagSet)) {
            nope2.push([n2, i3, i3 + 1]);
          }
        });
      });
      const noDoc = this.update(nope2);
      return this.difference(noDoc);
    }
  };
  var tag_default = fns5;

  // node_modules/compromise/src/1-one/tag/api/index.js
  var tagAPI = function(View2) {
    Object.assign(View2.prototype, tag_default);
  };
  var api_default8 = tagAPI;

  // node_modules/compromise/src/1-one/tag/lib.js
  var addTags2 = function(tags) {
    const world2 = this.world();
    const { model: model5, methods: methods19 } = world2;
    const tagSet = model5.one.tagSet;
    const fn = methods19.one.addTags;
    const res = fn(tags, tagSet);
    const aliases4 = aliases_default2(res, (name) => methods19.one.killUnicode(name, world2));
    model5.one.tagSet = res;
    model5.one.tagAliases = aliases4;
    return this;
  };
  var lib_default6 = { addTags: addTags2 };

  // node_modules/compromise/src/1-one/tag/compute/tagRank.js
  var boringTags = /* @__PURE__ */ new Set(["Auxiliary", "Possessive"]);
  var sortByKids = function(tags, tagSet) {
    tags = tags.sort((a, b2) => {
      if (boringTags.has(a) || !Object.hasOwn(tagSet, b2)) {
        return 1;
      }
      if (boringTags.has(b2) || !Object.hasOwn(tagSet, a)) {
        return -1;
      }
      let kids = tagSet[a].children || [];
      const aKids = kids.length;
      kids = tagSet[b2].children || [];
      const bKids = kids.length;
      return aKids - bKids;
    });
    return tags;
  };
  var tagRank = function(view) {
    const { document, world: world2 } = view;
    const tagSet = world2.model.one.tagSet;
    document.forEach((terms) => {
      terms.forEach((term) => {
        const tags = Array.from(term.tags);
        term.tagRank = sortByKids(tags, tagSet);
      });
    });
  };
  var tagRank_default = tagRank;

  // node_modules/compromise/src/1-one/tag/plugin.js
  var plugin_default11 = {
    model: {
      one: { tagSet: {}, tagAliases: /* @__PURE__ */ Object.create(null) }
    },
    compute: {
      tagRank: tagRank_default
    },
    methods: methods_default7,
    api: api_default8,
    lib: lib_default6
  };

  // node_modules/compromise/src/1-one/tokenize/methods/01-sentences/01-simple-split.js
  var stops = new Set(".!?\u203D\u2E18\u203C\u2047\u2048\u2049\u0964\u0965\u061F\u06D4\u0589\u1362\u1367\u104B\u17D4\u3002");
  var cjkStops = new Set("\u3002\uFF01\uFF1F\uFF61");
  var openers = new Set("\u300C\u300E\uFF08\u3010\u3014\u300A\u3008\u201C");
  var closers = new Set("\u300D\u300F\uFF09\u3011\u3015\u300B\u3009\u201D");
  var whitespace2 = /\s/;
  var splitsOnly = /^[.!?‽⸘‼\u2047-\u2049।॥؟۔։።፧။។。]+\s$/;
  var splitsOnlyCjk = /^(?:[.!?‽⸘‼\u2047-\u2049।॥؟۔։።፧။។。！？｡]+\s|[。！？｡]+[」』）】〕》〉”]*)$/;
  var newLine = /((?:\r?\n|\r)+)/;
  var basicSplit = function(text) {
    const all4 = [];
    const isCjk = /[。！？｡]/.test(text);
    const activeStops = isCjk ? /* @__PURE__ */ new Set([...stops, ...cjkStops]) : stops;
    for (const line of text.split(newLine)) {
      let start2 = 0;
      const arr = [];
      const emit = (from, end2) => {
        arr.push(line.slice(start2, from), line.slice(from, end2));
        start2 = end2;
      };
      let i3 = 0;
      while (i3 < line.length) {
        if (!activeStops.has(line[i3])) {
          i3++;
          continue;
        }
        const runStart = i3;
        while (i3 < line.length && activeStops.has(line[i3])) i3++;
        if (i3 < line.length && whitespace2.test(line[i3])) {
          emit(runStart, i3 + 1);
          i3++;
          continue;
        }
        if (!isCjk) continue;
        let j = runStart;
        while (j < i3) {
          if (!cjkStops.has(line[j])) {
            j++;
            continue;
          }
          const from = j;
          while (j < i3 && cjkStops.has(line[j])) j++;
          let end2 = j;
          while (end2 < line.length && closers.has(line[end2])) end2++;
          if (end2 === j || end2 === line.length || whitespace2.test(line[end2]) || openers.has(line[end2])) {
            emit(from, end2);
            if (end2 > i3) i3 = end2;
          }
        }
      }
      arr.push(line.slice(start2));
      for (let k2 = 0; k2 < arr.length; k2++) {
        const next = arr[k2 + 1];
        if (next && (isCjk ? splitsOnlyCjk : splitsOnly).test(next)) {
          arr[k2] += next;
          arr[k2 + 1] = "";
        }
        if (arr[k2]) all4.push(arr[k2]);
      }
    }
    return all4;
  };
  var simple_split_default = basicSplit;

  // node_modules/compromise/src/1-one/tokenize/methods/01-sentences/02-simple-merge.js
  var hasLetter = /[\p{L}\p{N}\p{So}]/u;
  var hasSomething = /\S/;
  var notEmpty = function(splits) {
    const chunks2 = [];
    for (let i3 = 0; i3 < splits.length; i3++) {
      const s2 = splits[i3];
      if (s2 === void 0 || s2 === "") {
        continue;
      }
      if (hasSomething.test(s2) === false || hasLetter.test(s2) === false) {
        if (chunks2[chunks2.length - 1]) {
          chunks2[chunks2.length - 1] += s2;
          continue;
        } else if (splits[i3 + 1]) {
          splits[i3 + 1] = s2 + splits[i3 + 1];
          continue;
        }
      }
      chunks2.push(s2);
    }
    return chunks2;
  };
  var simple_merge_default = notEmpty;

  // node_modules/compromise/src/1-one/tokenize/methods/01-sentences/03-smart-merge.js
  var hasNewline = function(c) {
    return Boolean(/\n$/.test(c));
  };
  var smartMerge = function(chunks2, world2) {
    const isSentence2 = world2.methods.one.tokenize.isSentence;
    const abbrevs = world2.model.one.abbreviations || /* @__PURE__ */ new Set();
    const sentences = [];
    for (let i3 = 0; i3 < chunks2.length; i3++) {
      const c = chunks2[i3];
      if (chunks2[i3 + 1] && !isSentence2(c, abbrevs) && !hasNewline(c)) {
        chunks2[i3 + 1] = c + (chunks2[i3 + 1] || "");
      } else if (c && c.length > 0) {
        sentences.push(c);
        chunks2[i3] = "";
      }
    }
    return sentences;
  };
  var smart_merge_default = smartMerge;

  // node_modules/compromise/src/1-one/tokenize/methods/01-sentences/04-quote-merge.js
  var MAX_QUOTE = 280;
  var pairs = {
    '"': '"',
    // 'StraightDoubleQuotes'
    "\uFF02": "\uFF02",
    // 'StraightDoubleQuotesWide'
    // '\u0027': '\u0027', // 'StraightSingleQuotes'
    "\u201C": "\u201D",
    // 'CommaDoubleQuotes'
    // '\u2018': '\u2019', // 'CommaSingleQuotes'
    "\u201F": "\u201D",
    // 'CurlyDoubleQuotesReversed'
    // '\u201B': '\u2019', // 'CurlySingleQuotesReversed'
    "\u201E": "\u201D",
    // 'LowCurlyDoubleQuotes'
    "\u2E42": "\u201D",
    // 'LowCurlyDoubleQuotesReversed'
    "\u201A": "\u2019",
    // 'LowCurlySingleQuotes'
    "\xAB": "\xBB",
    // 'AngleDoubleQuotes'
    "\u2039": "\u203A",
    // 'AngleSingleQuotes'
    "\u2035": "\u2032",
    // 'PrimeSingleQuotes'
    "\u2036": "\u2033",
    // 'PrimeDoubleQuotes'
    "\u2037": "\u2034",
    // 'PrimeTripleQuotes'
    "\u301D": "\u301E",
    // 'PrimeDoubleQuotes'
    // '\u0060': '\u00B4', // 'PrimeSingleQuotes'
    "\u301F": "\u301E",
    // 'LowPrimeDoubleQuotesReversed'
    "\u300C": "\u300D",
    // 'CornerBrackets' 「」
    "\u300E": "\u300F"
    // 'WhiteCornerBrackets' 『』
  };
  var openQuote = RegExp("[" + Object.keys(pairs).join("") + "]", "g");
  var closeQuote = RegExp("[" + Object.values(pairs).join("") + "]", "g");
  var closesQuote = function(str) {
    if (!str) {
      return false;
    }
    const m3 = str.match(closeQuote);
    if (m3 !== null && m3.length === 1) {
      return true;
    }
    return false;
  };
  var quoteMerge = function(splits) {
    const arr = [];
    for (let i3 = 0; i3 < splits.length; i3 += 1) {
      const split3 = splits[i3];
      const m3 = split3.match(openQuote);
      if (m3 !== null && m3.length === 1) {
        const closed = split3.match(closeQuote);
        if (closed !== null && closed[0] !== m3[0]) {
          arr.push(split3);
          continue;
        }
        if (closesQuote(splits[i3 + 1]) && splits[i3 + 1].length < MAX_QUOTE) {
          splits[i3] += splits[i3 + 1];
          arr.push(splits[i3]);
          splits[i3 + 1] = "";
          i3 += 1;
          continue;
        }
        if (closesQuote(splits[i3 + 2])) {
          const toAdd = splits[i3 + 1] + splits[i3 + 2];
          if (toAdd.length < MAX_QUOTE) {
            splits[i3] += toAdd;
            arr.push(splits[i3]);
            splits[i3 + 1] = "";
            splits[i3 + 2] = "";
            i3 += 2;
            continue;
          }
        }
      }
      arr.push(splits[i3]);
    }
    return arr;
  };
  var quote_merge_default = quoteMerge;

  // node_modules/compromise/src/1-one/tokenize/methods/01-sentences/05-parens-merge.js
  var MAX_LEN = 250;
  var hasOpen = /[(\uFF08]/g;
  var hasClosed = /[)\uFF09]/g;
  var mergeParens = function(splits) {
    const arr = [];
    for (let i3 = 0; i3 < splits.length; i3 += 1) {
      const split3 = splits[i3];
      const m3 = split3.match(hasOpen);
      if (m3 !== null && m3.length === 1) {
        if (splits[i3 + 1] && splits[i3 + 1].length < MAX_LEN) {
          const m22 = splits[i3 + 1].match(hasClosed);
          if (m22 !== null && m3.length === 1 && !hasOpen.test(splits[i3 + 1])) {
            splits[i3] += splits[i3 + 1];
            arr.push(splits[i3]);
            splits[i3 + 1] = "";
            i3 += 1;
            continue;
          }
        }
      }
      arr.push(splits[i3]);
    }
    return arr;
  };
  var parens_merge_default = mergeParens;

  // node_modules/compromise/src/1-one/tokenize/methods/01-sentences/index.js
  var hasSomething2 = /\S/;
  var startWhitespace = /^\s+/;
  var splitSentences = function(text, world2) {
    text ||= "";
    text = String(text);
    if (!text || typeof text !== "string" || hasSomething2.test(text) === false) {
      return [];
    }
    const splits = simple_split_default(text);
    let sentences = simple_merge_default(splits);
    sentences = smart_merge_default(sentences, world2);
    sentences = quote_merge_default(sentences);
    sentences = parens_merge_default(sentences);
    if (sentences.length === 0) {
      return [text];
    }
    for (let i3 = 1; i3 < sentences.length; i3 += 1) {
      const ws = sentences[i3].match(startWhitespace);
      if (ws !== null) {
        sentences[i3 - 1] += ws[0];
        sentences[i3] = sentences[i3].replace(startWhitespace, "");
      }
    }
    return sentences;
  };
  var sentences_default = splitSentences;

  // node_modules/compromise/src/1-one/tokenize/methods/02-terms/03-ranges.js
  var combineRanges = function(arr) {
    const startRange = /^[0-9]{1,4}(:[0-9][0-9])?([a-z]{1,2})? ?[-–—] ?$/;
    const endRange = /^[0-9]{1,4}([a-z]{1,2})? ?$/;
    for (let i3 = 0; i3 < arr.length - 1; i3 += 1) {
      if (arr[i3 + 1] && startRange.test(arr[i3]) && endRange.test(arr[i3 + 1])) {
        arr[i3] = arr[i3] + arr[i3 + 1];
        arr[i3 + 1] = null;
      }
    }
    return arr;
  };
  var ranges_default = combineRanges;

  // node_modules/compromise/src/1-one/tokenize/methods/02-terms/02-slashes.js
  var isSlash = new RegExp("\\p{L} ?\\/ ?\\p{L}+$", "u");
  var combineSlashes = function(arr) {
    for (let i3 = 1; i3 < arr.length - 1; i3++) {
      if (isSlash.test(arr[i3])) {
        arr[i3 - 1] += arr[i3] + arr[i3 + 1];
        arr[i3] = null;
        arr[i3 + 1] = null;
      }
    }
    return arr;
  };
  var slashes_default = combineSlashes;

  // node_modules/compromise/src/1-one/tokenize/methods/02-terms/index.js
  var wordlike = /\S/;
  var isBoundary = /^[!?.]+$/;
  var naiiveSplit = /(\S+)/;
  var notWord = [
    ".",
    "?",
    "!",
    ":",
    ";",
    "-",
    "\u2013",
    "\u2014",
    "--",
    "...",
    "(",
    ")",
    "[",
    "]",
    '"',
    "'",
    "`",
    "\xAB",
    "\xBB",
    "*",
    "\u2022"
  ];
  notWord = notWord.reduce((h, c) => {
    h[c] = true;
    return h;
  }, {});
  var splitWords = function(str, model5) {
    let result = [];
    let arr = [];
    str ||= "";
    if (typeof str === "number") {
      str = String(str);
    }
    if (Array.isArray(str)) {
      return str;
    }
    const words = str.split(naiiveSplit);
    for (let i3 = 0; i3 < words.length; i3++) {
      if (hasHyphen(words[i3], model5) === true) {
        arr = arr.concat(splitHyphens(words[i3]));
        continue;
      }
      arr.push(words[i3]);
    }
    let carry = "";
    for (let i3 = 0; i3 < arr.length; i3++) {
      const word = arr[i3];
      if (wordlike.test(word) === true && Object.hasOwn(notWord, word) === false && isBoundary.test(word) === false) {
        if (result.length > 0) {
          result[result.length - 1] += carry;
          result.push(word);
        } else {
          result.push(carry + word);
        }
        carry = "";
      } else {
        carry += word;
      }
    }
    if (carry) {
      if (result.length === 0) {
        result[0] = "";
      }
      result[result.length - 1] += carry;
    }
    result = slashes_default(result);
    result = ranges_default(result);
    result = result.filter((s2) => s2);
    return result;
  };
  var terms_default = splitWords;

  // node_modules/compromise/src/1-one/tokenize/methods/03-whitespace/tokenize.js
  var isLetter = new RegExp("\\p{Letter}", "u");
  var isNumber = /[\p{Number}\p{Currency_Symbol}]/u;
  var hasAcronym = /^[a-z]\.([a-z]\.)+/i;
  var chillin = /[sn]['’]$/;
  var isFullNumber = /^[(+\-]?\d+(th|st|nd|rd)?[)+\-]?$/;
  var openers2 = { ")": "(", "]": "[", "}": "{" };
  var closesInside = function(chars, start2, end2) {
    const close = chars[end2 - 1];
    let depth = 0;
    for (let i3 = start2; i3 < end2 - 1; i3 += 1) {
      if (chars[i3] === openers2[close]) {
        depth += 1;
      } else if (chars[i3] === close) {
        depth -= 1;
      }
    }
    return depth > 0;
  };
  var normalizePunctuation = function(str, model5) {
    const { prePunctuation: prePunctuation2, postPunctuation: postPunctuation2, emoticons: emoticons2 } = model5.one;
    const original = str;
    let pre = "";
    let post = "";
    const chars = Array.from(str);
    let start2 = 0;
    let end2 = chars.length;
    if (Object.hasOwn(emoticons2, str.trim())) {
      return { str: str.trim(), pre, post: " " };
    }
    while (start2 < end2) {
      const c = chars[start2];
      if (prePunctuation2[c] === true) {
        break;
      }
      if ((c === "+" || c === "-" || c === "(") && isFullNumber.test(str.trim())) {
        break;
      }
      if (c === "'" && c.length === 3 && isNumber.test(chars[start2 + 1])) {
        break;
      }
      if (isLetter.test(c) || isNumber.test(c)) {
        break;
      }
      start2++;
    }
    while (end2 > start2) {
      const c = chars[end2 - 1];
      if (postPunctuation2[c] === true) {
        break;
      }
      if (isLetter.test(c) || isNumber.test(c)) {
        break;
      }
      if (c === "." && hasAcronym.test(original) === true) {
        break;
      }
      if (c === "'" && chillin.test(original) === true) {
        break;
      }
      if ((c === "+" || c === ")") && isFullNumber.test(str.trim())) {
        break;
      }
      if (Object.hasOwn(openers2, c) && closesInside(chars, start2, end2)) {
        break;
      }
      end2--;
    }
    pre = chars.slice(0, start2).join("");
    post = chars.slice(end2).join("");
    str = chars.slice(start2, end2).join("");
    if (str === "") {
      let last = original.length;
      while (last > 0 && original[last - 1] === " ") last--;
      post = original.slice(last);
      str = original.slice(0, last);
      pre = "";
    }
    return { str, pre, post };
  };
  var tokenize_default = normalizePunctuation;

  // node_modules/compromise/src/1-one/tokenize/methods/03-whitespace/index.js
  var parseTerm = (txt, model5) => {
    const { str, pre, post } = tokenize_default(txt, model5);
    const parsed = {
      text: str,
      pre,
      post,
      tags: /* @__PURE__ */ new Set()
    };
    return parsed;
  };
  var whitespace_default2 = parseTerm;

  // node_modules/compromise/src/1-one/tokenize/methods/unicode.js
  var killUnicode = function(str, world2) {
    const unicode2 = world2.model.one.unicode || {};
    str ||= "";
    const chars = str.split("");
    chars.forEach((s2, i3) => {
      if (unicode2[s2]) {
        chars[i3] = unicode2[s2];
      }
    });
    return chars.join("");
  };
  var unicode_default = killUnicode;

  // node_modules/compromise/src/1-one/tokenize/compute/normal/01-cleanup.js
  var trimPunctuation = (str, punctuation) => {
    let end2 = str.length;
    while (end2 > 0 && punctuation.test(str[end2 - 1])) end2--;
    return str.slice(0, end2);
  };
  var clean = function(str) {
    str ||= "";
    str = str.toLowerCase();
    str = str.trim();
    const original = str;
    str = trimPunctuation(str, /[,;.!?]/);
    str = str.replaceAll("\u2026", "...");
    str = str.replaceAll("\u2013", "-");
    if (/^[:;]/.test(str) === false) {
      str = trimPunctuation(str, /[",.!:;?)]/);
      str = str.replace(/^['"(]+/g, "");
    }
    str = str.replace(/[\u200B-\u200D\uFEFF]/g, "");
    str = str.trim();
    if (str === "") {
      str = original;
    }
    str = str.replace(/([0-9]),([0-9])/g, "$1$2");
    return str;
  };
  var cleanup_default = clean;

  // node_modules/compromise/src/1-one/tokenize/compute/normal/02-acronyms.js
  var periodAcronym = /^([A-Z]\.)+[A-Z]?,?$/;
  var oneLetterAcronym = /^[A-Z]\.,?$/;
  var noPeriodAcronym = /^[A-Z]{2,}('s|,)?$/;
  var lowerCaseAcronym = /^([a-z]\.)+[a-z]\.?$/;
  var isAcronym = function(str) {
    if (periodAcronym.test(str) === true) {
      return true;
    }
    if (lowerCaseAcronym.test(str) === true) {
      return true;
    }
    if (oneLetterAcronym.test(str) === true) {
      return true;
    }
    if (noPeriodAcronym.test(str) === true) {
      return true;
    }
    return false;
  };
  var doAcronym = function(str) {
    if (isAcronym(str)) {
      str = str.replace(/\./g, "");
    }
    return str;
  };
  var acronyms_default = doAcronym;

  // node_modules/compromise/src/1-one/tokenize/compute/normal/index.js
  var normalize2 = function(term, world2) {
    const killUnicode2 = world2.methods.one.killUnicode;
    let str = term.text || "";
    str = cleanup_default(str);
    str = killUnicode2(str, world2);
    str = acronyms_default(str);
    term.normal = str;
  };
  var normal_default = normalize2;

  // node_modules/compromise/src/1-one/tokenize/methods/parse.js
  var parse2 = function(input, world2) {
    const { methods: methods19, model: model5 } = world2;
    const { splitSentences: splitSentences2, splitTerms, splitWhitespace } = methods19.one.tokenize;
    input ||= "";
    const sentences = splitSentences2(input, world2);
    input = sentences.map((txt) => {
      let terms = splitTerms(txt, model5);
      terms = terms.map((t2) => splitWhitespace(t2, model5));
      terms.forEach((t2) => {
        normal_default(t2, world2);
      });
      return terms;
    });
    return input;
  };
  var parse_default2 = parse2;

  // node_modules/compromise/src/1-one/tokenize/methods/01-sentences/is-sentence.js
  var isAcronym2 = /[ .][A-Z]\.? *$/i;
  var hasEllipse = /(?:\u2026|\.{2}) *$/;
  var hasLetter2 = new RegExp("\\p{L}", "u");
  var hasPeriod = /\. *$/;
  var leadInit = /^[A-Z]\. $/;
  var isSentence = function(str, abbrevs) {
    if (hasLetter2.test(str) === false) {
      return false;
    }
    if (isAcronym2.test(str) === true) {
      return false;
    }
    if (str.length === 3 && leadInit.test(str)) {
      return false;
    }
    if (hasEllipse.test(str) === true) {
      return false;
    }
    const txt = str.replace(/[.!?\u203D\u2E18\u203C\u2047-\u2049] *$/, "");
    const words = txt.split(" ");
    const lastWord = words[words.length - 1].toLowerCase();
    if (Object.hasOwn(abbrevs, lastWord) === true && hasPeriod.test(str) === true) {
      return false;
    }
    return true;
  };
  var is_sentence_default = isSentence;

  // node_modules/compromise/src/1-one/tokenize/methods/index.js
  var methods_default8 = {
    one: {
      killUnicode: unicode_default,
      tokenize: {
        splitSentences: sentences_default,
        isSentence: is_sentence_default,
        splitTerms: terms_default,
        splitWhitespace: whitespace_default2,
        fromString: parse_default2
      }
    }
  };

  // node_modules/compromise/src/1-one/tokenize/model/aliases.js
  var aliases = {
    "&": "and",
    "@": "at",
    "%": "percent",
    "plz": "please",
    "bein": "being"
  };
  var aliases_default3 = aliases;

  // node_modules/compromise/src/1-one/tokenize/model/abbreviations/misc.js
  var misc_default = [
    "approx",
    "apt",
    "bc",
    "cyn",
    "eg",
    "esp",
    "est",
    "etc",
    "ex",
    "exp",
    "prob",
    //probably
    "pron",
    // Pronunciation
    "gal",
    //gallon
    "min",
    "pseud",
    "fig",
    //figure
    "jd",
    "lat",
    //latitude
    "lng",
    //longitude
    "vol",
    //volume
    "fm",
    //not am
    "def",
    //definition
    "misc",
    "plz",
    //please
    "ea",
    //each
    "ps",
    "sec",
    //second
    "pt",
    "pref",
    //preface
    "pl",
    //plural
    "pp",
    //pages
    "qt",
    //quarter
    "fr",
    //french
    "sq",
    "nee",
    //given name at birth
    "ss",
    //ship, or sections
    "tel",
    "temp",
    "vet",
    "ver",
    //version
    "fem",
    //feminine
    "masc",
    //masculine
    "eng",
    //engineering/english
    "adj",
    //adjective
    "vb",
    //verb
    "rb",
    //adverb
    "inf",
    //infinitive
    "situ",
    // in situ
    "vivo",
    "vitro",
    "wr"
    //world record
  ];

  // node_modules/compromise/src/1-one/tokenize/model/abbreviations/honorifics.js
  var honorifics_default = [
    "adj",
    "adm",
    "adv",
    "asst",
    "atty",
    "bldg",
    "brig",
    "capt",
    "cmdr",
    "comdr",
    "cpl",
    "det",
    "dr",
    "esq",
    "gen",
    "gov",
    "hon",
    "jr",
    "llb",
    "lt",
    "maj",
    "messrs",
    "mlle",
    "mme",
    "mr",
    "mrs",
    "ms",
    "mstr",
    "phd",
    "prof",
    "pvt",
    "rep",
    "reps",
    "res",
    "rev",
    "sen",
    "sens",
    "sfc",
    "sgt",
    "sir",
    "sr",
    "supt",
    "surg"
    //miss
    //misses
  ];

  // node_modules/compromise/src/1-one/tokenize/model/abbreviations/months.js
  var months_default = ["jan", "feb", "mar", "apr", "jun", "jul", "aug", "sep", "sept", "oct", "nov", "dec"];

  // node_modules/compromise/src/1-one/tokenize/model/abbreviations/nouns.js
  var nouns_default = [
    "ad",
    "al",
    "arc",
    "ba",
    "bl",
    "ca",
    "cca",
    "col",
    "corp",
    "ft",
    "fy",
    "ie",
    "lit",
    "ma",
    "md",
    "pd",
    "tce"
  ];

  // node_modules/compromise/src/1-one/tokenize/model/abbreviations/organizations.js
  var organizations_default = ["dept", "univ", "assn", "bros", "inc", "ltd", "co"];

  // node_modules/compromise/src/1-one/tokenize/model/abbreviations/places.js
  var places_default = [
    "rd",
    "st",
    "dist",
    "mt",
    "ave",
    "blvd",
    "cl",
    // 'ct',
    "cres",
    "hwy",
    //states
    "ariz",
    "cal",
    "calif",
    "colo",
    "conn",
    "fla",
    "fl",
    "ga",
    "ida",
    "ia",
    "kan",
    "kans",
    "minn",
    "neb",
    "nebr",
    "okla",
    "penna",
    "penn",
    "pa",
    "dak",
    "tenn",
    "tex",
    "ut",
    "vt",
    "va",
    "wis",
    "wisc",
    "wy",
    "wyo",
    "usafa",
    "alta",
    "ont",
    "que",
    "sask"
  ];

  // node_modules/compromise/src/1-one/tokenize/model/abbreviations/units.js
  var units_default = [
    "dl",
    "ml",
    "gal",
    // 'ft', //ambiguous
    "qt",
    "pt",
    "tbl",
    "tsp",
    "tbsp",
    "km",
    "dm",
    //decimeter
    "cm",
    "mm",
    "mi",
    "td",
    "hr",
    //hour
    "hrs",
    //hour
    "kg",
    "hg",
    "dg",
    //decigram
    "cg",
    //centigram
    "mg",
    //milligram
    "\xB5g",
    //microgram
    "lb",
    //pound
    "oz",
    //ounce
    "sq ft",
    "hz",
    //hertz
    "mps",
    //meters per second
    "mph",
    "kmph",
    //kilometers per hour
    "kb",
    //kilobyte
    "mb",
    //megabyte
    // 'gb', //ambig
    "tb",
    //terabyte
    "lx",
    //lux
    "lm",
    //lumen
    // 'pa', //ambig
    "fl oz",
    //
    "yb"
  ];

  // node_modules/compromise/src/1-one/tokenize/model/lexicon.js
  var list = [
    [misc_default],
    [units_default, "Unit"],
    [nouns_default, "Noun"],
    [honorifics_default, "Honorific"],
    [months_default, "Month"],
    [organizations_default, "Organization"],
    [places_default, "Place"]
  ];
  var abbreviations = {};
  var lexicon2 = {};
  list.forEach((a) => {
    a[0].forEach((w) => {
      abbreviations[w] = true;
      lexicon2[w] = "Abbreviation";
      if (a[1] !== void 0) {
        lexicon2[w] = [lexicon2[w], a[1]];
      }
    });
  });

  // node_modules/compromise/src/1-one/tokenize/model/prefixes.js
  var prefixes_default = [
    "anti",
    "bi",
    "co",
    "contra",
    "de",
    "extra",
    "infra",
    "inter",
    "intra",
    "macro",
    "micro",
    "mis",
    "mono",
    "multi",
    "peri",
    "pre",
    "pro",
    "proto",
    "pseudo",
    "re",
    "sub",
    "supra",
    "trans",
    "tri",
    "un",
    "out",
    //out-lived
    "ex"
    //ex-wife
    // 'counter',
    // 'mid',
    // 'out',
    // 'non',
    // 'over',
    // 'post',
    // 'semi',
    // 'super', //'super-cool'
    // 'ultra', //'ulta-cool'
    // 'under',
    // 'whole',
  ].reduce((h, str) => {
    h[str] = true;
    return h;
  }, {});

  // node_modules/compromise/src/1-one/tokenize/model/suffixes.js
  var suffixes_default = {
    "like": true,
    "ish": true,
    "less": true,
    "able": true,
    "elect": true,
    "type": true,
    "designate": true
    // 'fold':true,
  };

  // node_modules/compromise/src/1-one/tokenize/model/unicode.js
  var compact2 = {
    "!": "\xA1",
    "?": "\xBF\u0241",
    '"': '\u201C\u201D"\u275D\u275E',
    "'": "\u2018\u201B\u275B\u275C\u2019",
    "-": "\u2014\u2013",
    a: "\xAA\xC0\xC1\xC2\xC3\xC4\xC5\xE0\xE1\xE2\xE3\xE4\xE5\u0100\u0101\u0102\u0103\u0104\u0105\u01CD\u01CE\u01DE\u01DF\u01E0\u01E1\u01FA\u01FB\u0200\u0201\u0202\u0203\u0226\u0227\u023A\u0386\u0391\u0394\u039B\u03AC\u03B1\u03BB\u0410\u0430\u0466\u0467\u04D0\u04D1\u04D2\u04D3\u019B\xE6",
    b: "\xDF\xFE\u0180\u0181\u0182\u0183\u0184\u0185\u0243\u0392\u03B2\u03D0\u03E6\u0411\u0412\u042A\u042C\u0432\u044A\u044C\u0462\u0463\u048C\u048D",
    c: "\xA2\xA9\xC7\xE7\u0106\u0107\u0108\u0109\u010A\u010B\u010C\u010D\u0186\u0187\u0188\u023B\u023C\u037B\u037C\u03F2\u03F9\u03FD\u03FE\u0421\u0441\u0454\u0480\u0481\u04AA\u04AB",
    d: "\xD0\u010E\u010F\u0110\u0111\u0189\u018A\u0221\u018B\u018C",
    e: "\xC8\xC9\xCA\xCB\xE8\xE9\xEA\xEB\u0112\u0113\u0114\u0115\u0116\u0117\u0118\u0119\u011A\u011B\u0190\u0204\u0205\u0206\u0207\u0228\u0229\u0246\u0247\u0388\u0395\u039E\u03A3\u03AD\u03B5\u03BE\u03F5\u0400\u0401\u0415\u0435\u0450\u0451\u04BC\u04BD\u04BE\u04BF\u04D6\u04D7\u1EC5",
    f: "\u0191\u0192\u03DC\u03DD\u04FA\u04FB\u0492\u0493\u017F",
    g: "\u011C\u011D\u011E\u011F\u0120\u0121\u0122\u0123\u0193\u01E4\u01E5\u01E6\u01E7\u01F4\u01F5",
    h: "\u0124\u0125\u0126\u0127\u0195\u01F6\u021E\u021F\u0389\u0397\u0402\u040A\u040B\u041D\u043D\u0452\u045B\u04A2\u04A3\u04A4\u04A5\u04BA\u04BB\u04C9\u04CA",
    I: "\xCC\xCD\xCE\xCF",
    i: "\xEC\xED\xEE\xEF\u0128\u0129\u012A\u012B\u012C\u012D\u012E\u012F\u0130\u0131\u0196\u0197\u0208\u0209\u020A\u020B\u038A\u0390\u03AA\u03AF\u03B9\u03CA\u0406\u0407\u0456\u0457i\u0307",
    j: "\u0134\u0135\u01F0\u0237\u0248\u0249\u03F3\u0408\u0458",
    k: "\u0136\u0137\u0138\u0198\u0199\u01E8\u01E9\u039A\u03BA\u040C\u0416\u041A\u0436\u043A\u045C\u049A\u049B\u049C\u049D\u049E\u049F\u04A0\u04A1",
    l: "\u0139\u013A\u013B\u013C\u013D\u013E\u013F\u0140\u0141\u0142\u019A\u01AA\u01C0\u01CF\u01D0\u0234\u023D\u0399\u04C0\u04CF",
    m: "\u039C\u03FA\u03FB\u041C\u043C\u04CD\u04CE",
    n: "\xD1\xF1\u0143\u0144\u0145\u0146\u0147\u0148\u0149\u014A\u014B\u019D\u019E\u01F8\u01F9\u0220\u0235\u039D\u03A0\u03AE\u03B7\u03DE\u040D\u0418\u0419\u041B\u041F\u0438\u0439\u043B\u043F\u045D\u048A\u048B\u04C5\u04C6\u04E2\u04E3\u04E4\u04E5\u03C0",
    o: "\xD2\xD3\xD4\xD5\xD6\xD8\xF0\xF2\xF3\xF4\xF5\xF6\xF8\u014C\u014D\u014E\u014F\u0150\u0151\u019F\u01A0\u01A1\u01D1\u01D2\u01EA\u01EB\u01EC\u01ED\u01FE\u01FF\u020C\u020D\u020E\u020F\u022A\u022B\u022C\u022D\u022E\u022F\u0230\u0231\u038C\u0398\u039F\u03B8\u03BF\u03C3\u03CC\u03D5\u03D8\u03D9\u03EC\u03F4\u041E\u0424\u043E\u0472\u0473\u04E6\u04E7\u04E8\u04E9\u04EA\u04EB",
    p: "\u01A4\u03A1\u03C1\u03F7\u03F8\u03FC\u0420\u0440\u048E\u048F\xDE",
    q: "\u024A\u024B",
    r: "\u0154\u0155\u0156\u0157\u0158\u0159\u01A6\u0210\u0211\u0212\u0213\u024C\u024D\u0403\u0413\u042F\u0433\u044F\u0453\u0490\u0491",
    s: "\u015A\u015B\u015C\u015D\u015E\u015F\u0160\u0161\u01A7\u01A8\u0218\u0219\u023F\u0405\u0455",
    t: "\u0162\u0163\u0164\u0165\u0166\u0167\u01AB\u01AC\u01AD\u01AE\u021A\u021B\u0236\u023E\u0393\u03A4\u03C4\u03EE\u0422\u0442",
    u: "\xD9\xDA\xDB\xDC\xF9\xFA\xFB\xFC\u0168\u0169\u016A\u016B\u016C\u016D\u016E\u016F\u0170\u0171\u0172\u0173\u01AF\u01B0\u01B1\u01B2\u01D3\u01D4\u01D5\u01D6\u01D7\u01D8\u01D9\u01DA\u01DB\u01DC\u0214\u0215\u0216\u0217\u0244\u03B0\u03C5\u03CB\u03CD",
    v: "\u03BD\u0474\u0475\u0476\u0477",
    w: "\u0174\u0175\u019C\u03C9\u03CE\u03D6\u03E2\u03E3\u0428\u0429\u0448\u0449\u0461\u047F",
    x: "\xD7\u03A7\u03C7\u03D7\u03F0\u0425\u0445\u04B2\u04B3\u04FC\u04FD\u04FE\u04FF",
    y: "\xDD\xFD\xFF\u0176\u0177\u0178\u01B3\u01B4\u0232\u0233\u024E\u024F\u038E\u03A5\u03AB\u03B3\u03C8\u03D2\u03D3\u03D4\u040E\u0423\u0443\u0447\u045E\u0470\u0471\u04AE\u04AF\u04B0\u04B1\u04EE\u04EF\u04F0\u04F1\u04F2\u04F3",
    z: "\u0179\u017A\u017B\u017C\u017D\u017E\u01B5\u01B6\u0224\u0225\u0240\u0396"
  };
  var unicode = {};
  Object.keys(compact2).forEach(function(k2) {
    compact2[k2].split("").forEach(function(s2) {
      unicode[s2] = k2;
    });
  });
  for (let i3 = 33; i3 <= 126; i3 += 1) {
    unicode[String.fromCharCode(i3 + 65248)] = String.fromCharCode(i3);
  }
  var unicode_default2 = unicode;

  // node_modules/compromise/src/1-one/tokenize/model/punctuation.js
  var prePunctuation = {
    "#": true,
    //#hastag
    "@": true,
    //@atmention
    "_": true,
    //underscore
    "\xB0": true,
    // '+': true,//+4
    // '\\-',//-4  (escape)
    // '.',//.4
    // zero-width chars
    "\u200B": true,
    "\u200C": true,
    "\u200D": true,
    "\uFEFF": true
  };
  var postPunctuation = {
    "%": true,
    //88%
    "_": true,
    //underscore
    "\xB0": true,
    //degrees, italian ordinal
    // '\'',// sometimes
    // zero-width chars
    "\u200B": true,
    "\u200C": true,
    "\u200D": true,
    "\uFEFF": true
  };
  var emoticons = {
    "<3": true,
    "</3": true,
    "<\\3": true,
    ":^P": true,
    ":^p": true,
    ":^O": true,
    ":^3": true
  };

  // node_modules/compromise/src/1-one/tokenize/model/index.js
  var model_default2 = {
    one: {
      aliases: aliases_default3,
      abbreviations,
      prefixes: prefixes_default,
      suffixes: suffixes_default,
      prePunctuation,
      postPunctuation,
      lexicon: lexicon2,
      //give this one forward
      unicode: unicode_default2,
      emoticons
    }
  };

  // node_modules/compromise/src/1-one/tokenize/compute/alias.js
  var hasSlash = /\//;
  var hasDomain = /[a-z]\.[a-z]/i;
  var isMath = /[0-9]/;
  var addAliases = function(term, world2) {
    const str = term.normal || term.text || term.machine;
    const aliases4 = world2.model.one.aliases;
    if (Object.hasOwn(aliases4, str)) {
      term.alias ||= [];
      term.alias.push(aliases4[str]);
    }
    if (hasSlash.test(str) && !hasDomain.test(str) && !isMath.test(str)) {
      const arr = str.split(hasSlash);
      if (arr.length <= 3) {
        arr.forEach((word) => {
          word = word.trim();
          if (word !== "") {
            term.alias ||= [];
            term.alias.push(word);
          }
        });
      }
    }
    return term;
  };
  var alias_default = addAliases;

  // node_modules/compromise/src/1-one/tokenize/compute/machine.js
  var hasDash2 = new RegExp("^\\p{Letter}+-\\p{Letter}+$", "u");
  var doMachine = function(term) {
    let str = term.implicit || term.normal || term.text;
    str = str.replace(/['’]s$/, "");
    str = str.replace(/s['’]$/, "s");
    str = str.replace(/([aeiou][ktrp])in'$/, "$1ing");
    if (hasDash2.test(str)) {
      str = str.replace(/-/g, "");
    }
    str = str.replace(/^[#@]/, "");
    if (str !== term.normal) {
      term.machine = str;
    }
  };
  var machine_default = doMachine;

  // node_modules/compromise/src/1-one/tokenize/compute/freq.js
  var freq = function(view) {
    const docs = view.docs;
    const counts = /* @__PURE__ */ Object.create(null);
    for (let i3 = 0; i3 < docs.length; i3 += 1) {
      for (let t2 = 0; t2 < docs[i3].length; t2 += 1) {
        const term = docs[i3][t2];
        const word = term.machine || term.normal;
        counts[word] ??= 0;
        counts[word] += 1;
      }
    }
    for (let i3 = 0; i3 < docs.length; i3 += 1) {
      for (let t2 = 0; t2 < docs[i3].length; t2 += 1) {
        const term = docs[i3][t2];
        const word = term.machine || term.normal;
        term.freq = counts[word];
      }
    }
  };
  var freq_default = freq;

  // node_modules/compromise/src/1-one/tokenize/compute/offset.js
  var offset = function(view) {
    let elapsed = 0;
    let index3 = 0;
    const docs = view.document;
    for (let i3 = 0; i3 < docs.length; i3 += 1) {
      for (let t2 = 0; t2 < docs[i3].length; t2 += 1) {
        const term = docs[i3][t2];
        term.offset = {
          index: index3,
          start: elapsed + term.pre.length,
          length: term.text.length
        };
        elapsed += term.pre.length + term.text.length + term.post.length;
        index3 += 1;
      }
    }
  };
  var offset_default = offset;

  // node_modules/compromise/src/1-one/tokenize/compute/reindex.js
  var index2 = function(view) {
    const document = view.document;
    for (let n2 = 0; n2 < document.length; n2 += 1) {
      for (let i3 = 0; i3 < document[n2].length; i3 += 1) {
        document[n2][i3].index = [n2, i3];
      }
    }
  };
  var reindex_default = index2;

  // node_modules/compromise/src/1-one/tokenize/compute/wordCount.js
  var wordCount2 = function(view) {
    let n2 = 0;
    const docs = view.docs;
    for (let i3 = 0; i3 < docs.length; i3 += 1) {
      for (let t2 = 0; t2 < docs[i3].length; t2 += 1) {
        if (docs[i3][t2].normal === "") {
          continue;
        }
        n2 += 1;
        docs[i3][t2].wordCount = n2;
      }
    }
  };
  var wordCount_default = wordCount2;

  // node_modules/compromise/src/1-one/tokenize/compute/index.js
  var termLoop = function(view, fn) {
    const docs = view.docs;
    for (let i3 = 0; i3 < docs.length; i3 += 1) {
      for (let t2 = 0; t2 < docs[i3].length; t2 += 1) {
        fn(docs[i3][t2], view.world);
      }
    }
  };
  var methods16 = {
    alias: (view) => termLoop(view, alias_default),
    machine: (view) => termLoop(view, machine_default),
    normal: (view) => termLoop(view, normal_default),
    freq: freq_default,
    offset: offset_default,
    index: reindex_default,
    wordCount: wordCount_default
  };
  var compute_default7 = methods16;

  // node_modules/compromise/src/1-one/tokenize/plugin.js
  var plugin_default12 = {
    compute: compute_default7,
    methods: methods_default8,
    model: model_default2,
    hooks: ["alias", "machine", "index", "id"]
  };

  // node_modules/compromise/src/1-one/typeahead/compute.js
  var typeahead = function(view) {
    const prefixes2 = view.model.one.typeahead;
    const docs = view.docs;
    if (docs.length === 0 || Object.keys(prefixes2).length === 0) {
      return;
    }
    const lastTerm = docs.at(-1)?.at(-1);
    if (!lastTerm || lastTerm.post) {
      return;
    }
    if (Object.hasOwn(prefixes2, lastTerm.normal)) {
      const found = prefixes2[lastTerm.normal];
      lastTerm.implicit = found;
      lastTerm.machine = found;
      lastTerm.typeahead = true;
      if (view.compute.preTagger) {
        view.last().unTag("*").compute(["lexicon", "preTagger"]);
      }
    }
  };
  var compute_default8 = { typeahead };

  // node_modules/compromise/src/1-one/typeahead/api.js
  var autoFill = function() {
    const docs = this.docs;
    if (docs.length === 0) {
      return this;
    }
    const term = docs.at(-1)?.at(-1);
    if (term?.typeahead === true && term.machine) {
      term.text = term.machine;
      term.normal = term.machine;
    }
    return this;
  };
  var api2 = function(View2) {
    View2.prototype.autoFill = autoFill;
  };
  var api_default9 = api2;

  // node_modules/compromise/src/1-one/typeahead/lib/allPrefixes.js
  var getPrefixes = function(arr, opts2, world2) {
    let index3 = {};
    const collisions = [];
    const existing = world2.prefixes || {};
    arr.forEach((str) => {
      str = str.toLowerCase().trim();
      let max3 = str.length;
      if (opts2.max && max3 > opts2.max) {
        max3 = opts2.max;
      }
      for (let size = opts2.min; size < max3; size += 1) {
        const prefix5 = str.substring(0, size);
        if (opts2.safe && Object.hasOwn(world2.model.one.lexicon, prefix5)) {
          continue;
        }
        if (Object.hasOwn(existing, prefix5) === true) {
          collisions.push(prefix5);
          continue;
        }
        if (Object.hasOwn(index3, prefix5) === true) {
          collisions.push(prefix5);
          continue;
        }
        index3[prefix5] = str;
      }
    });
    index3 = { ...existing, ...index3 };
    collisions.forEach((str) => {
      delete index3[str];
    });
    return index3;
  };
  var allPrefixes_default = getPrefixes;

  // node_modules/compromise/src/1-one/typeahead/lib/index.js
  var isObject7 = (val) => {
    return Object.prototype.toString.call(val) === "[object Object]";
  };
  var defaults2 = {
    safe: true,
    min: 3
  };
  var prepare = function(words = [], opts2 = {}) {
    const model5 = this.model();
    opts2 = { ...defaults2, ...opts2 };
    if (isObject7(words)) {
      Object.assign(model5.one.lexicon, words);
      words = Object.keys(words);
    }
    const prefixes2 = allPrefixes_default(words, opts2, this.world());
    Object.keys(prefixes2).forEach((str) => {
      if (Object.hasOwn(model5.one.typeahead, str)) {
        delete model5.one.typeahead[str];
        return;
      }
      model5.one.typeahead[str] = prefixes2[str];
    });
    return this;
  };
  var lib_default7 = {
    typeahead: prepare
  };

  // node_modules/compromise/src/1-one/typeahead/plugin.js
  var model3 = {
    one: {
      typeahead: {}
      //set a blank key-val
    }
  };
  var plugin_default13 = {
    model: model3,
    api: api_default9,
    lib: lib_default7,
    compute: compute_default8,
    hooks: ["typeahead"]
  };

  // node_modules/compromise/src/one.js
  nlp_default.extend(plugin_default2);
  nlp_default.extend(plugin_default8);
  nlp_default.extend(plugin_default7);
  nlp_default.extend(plugin_default9);
  nlp_default.extend(plugin_default11);
  nlp_default.plugin(plugin_default3);
  nlp_default.extend(plugin_default12);
  nlp_default.extend(plugin_default4);
  nlp_default.plugin(plugin_default);
  nlp_default.extend(plugin_default6);
  nlp_default.extend(plugin_default13);
  nlp_default.extend(plugin_default5);
  nlp_default.extend(plugin_default10);
  var one_default = nlp_default;

  // node_modules/compromise/src/2-two/preTagger/model/irregulars/plurals.js
  var plurals_default = {
    // -a
    addendum: "addenda",
    corpus: "corpora",
    criterion: "criteria",
    curriculum: "curricula",
    genus: "genera",
    memorandum: "memoranda",
    opus: "opera",
    ovum: "ova",
    phenomenon: "phenomena",
    referendum: "referenda",
    // -ae
    alga: "algae",
    alumna: "alumnae",
    antenna: "antennae",
    formula: "formulae",
    larva: "larvae",
    nebula: "nebulae",
    vertebra: "vertebrae",
    // -is
    analysis: "analyses",
    axis: "axes",
    diagnosis: "diagnoses",
    parenthesis: "parentheses",
    prognosis: "prognoses",
    synopsis: "synopses",
    thesis: "theses",
    neurosis: "neuroses",
    // -x
    appendix: "appendices",
    index: "indices",
    matrix: "matrices",
    ox: "oxen",
    sex: "sexes",
    // -i
    alumnus: "alumni",
    bacillus: "bacilli",
    cactus: "cacti",
    fungus: "fungi",
    hippopotamus: "hippopotami",
    libretto: "libretti",
    modulus: "moduli",
    nucleus: "nuclei",
    octopus: "octopi",
    radius: "radii",
    stimulus: "stimuli",
    syllabus: "syllabi",
    // -ie
    cookie: "cookies",
    calorie: "calories",
    auntie: "aunties",
    movie: "movies",
    pie: "pies",
    rookie: "rookies",
    tie: "ties",
    zombie: "zombies",
    // -f
    leaf: "leaves",
    loaf: "loaves",
    thief: "thieves",
    // ee-
    foot: "feet",
    goose: "geese",
    tooth: "teeth",
    // -eaux
    beau: "beaux",
    chateau: "chateaux",
    tableau: "tableaux",
    // -ses
    bus: "buses",
    gas: "gases",
    circus: "circuses",
    crisis: "crises",
    virus: "viruses",
    database: "databases",
    excuse: "excuses",
    abuse: "abuses",
    avocado: "avocados",
    barracks: "barracks",
    child: "children",
    clothes: "clothes",
    echo: "echoes",
    embargo: "embargoes",
    epoch: "epochs",
    deer: "deer",
    halo: "halos",
    man: "men",
    woman: "women",
    mosquito: "mosquitoes",
    mouse: "mice",
    person: "people",
    quiz: "quizzes",
    rodeo: "rodeos",
    shoe: "shoes",
    sombrero: "sombreros",
    stomach: "stomachs",
    tornado: "tornados",
    tuxedo: "tuxedos",
    volcano: "volcanoes"
  };

  // node_modules/compromise/src/2-two/_built/lexicon.js
  var lexicon_default = {
    "Comparative": "true\xA6bett1cold1f0;arth0ew0in0;er",
    "Superlative": "true\xA6coldest,earlier",
    "PresentTense": "true\xA6bests,sounds",
    "Condition": "true\xA6lest,unless",
    "PastTense": "true\xA6:d1emac,nageb,tn0;aem,ew;ah,e1i0;as,d;gsm,il,leenk,pael",
    "Participle": "true\xA6:e02gnu00knuZmuws,n2t0;hguos,li0maerd;ps,ub;e8ials,ro7ugeb,w0;ard5e4o0;hs,l2r0s;g0htN;!tZ;b,f;rFs;!htiw;t,ws;ddiLeIkDlBs9t3v0;i1o0;rp,w;g2rd;ae4sah,t0;i1og0;!rG;b,rw0;!er;!b;ir0ohc;!a,pu;laf,o0;ts;a1o0;ps,w1;hs,sr6t1w0;!a;!reD;b,s0;!r0;eAof;br0h,r;of;rhs,s;lc,r0s;!w;no0vod;d1g0hs;!rednu;nu,re1t0;uo;vo",
    "Gerund": "true\xA6accord0be0doin,go0result0stain0;ing",
    "Expression": "true\xA6a0Zb0Vc0Td0Oe0Mfarew0Lg0FhZjeez,lWmVnToOpLsJtIuFvEw7y0;a5e3i1u0;ck,p;kes,p0;ee,pee;a0p,s;!h;!a,h,y;a5h2o1t0;af,f;rd up,w;atsoever,e1o0;a,ops;e,w;hoo,t;ery w06oila;gh,h0;! 0h,m;huh,oh;here nPsk,ut tut;h0ic;eesh,hh,it,oo;ff,h1l0ow,sst;ease,s,z;ew,ooey;h1i,mg,o0uch,w,y;h,o,ps;! 0h;hTmy go0wT;d,sh;a7evertheless,o0;!pe;eh,mm;ah,eh,m1ol0;!s;ao,fao;aCeBi9o2u0;h,mph,rra0zzC;h,y;l1o0;r6y9;la,y 0;c2fuck,hFmoDs0;hLmok0;es;ow;!p hip hoor0;ay;ck,e,llo,y;ha1i,lleluj0;ah;!ha;ah,ee4o1r0;eat scott,r;l1od0sh; grief,bye;ly;! whiz;ell;e0h,t cetera,ureka,ww,xcuse me;k,p;'oh,a0rat,uh;m0ng;m1n0;!it;it;mon,o0;ngratulations,wabunga;a2oo1r0tw,ye;avo,r;!ya;h,m; 1h0ka,las,men,rgh,ye;!a,em,h,oy;la",
    "Negative": "true\xA6n0;ever,o0;n,t",
    "QuestionWord": "true\xA6how3wh0;at,e1ich,o0y;!m,se;n,re; come,'s",
    "Reflexive": "true\xA6h4it5my5o1the0your2;ir1m1;ne3ur0;sel0;f,ves;er0im0;self",
    "Plural": "true\xA6dick1gre1on0records,stori0;es;ens",
    "Unit|Noun": "true\xA6cEfDgChBinchAk9lb,m6newt5oz,p4qt,t1y0;ardEd;able1b0ea1sp;!l,sp;spo1;a,t,x;on9;!b,g,i1l,m,p0;h,s;!les;!b,elvin,g,m;!es;g,z;al,b;eet,oot,t;m,up0;!s",
    "Value": "true\xA6a few",
    "Imperative": "true\xA6beware",
    "Plural|Verb": "true\xA6:s0;drehpehs,eCkoElBmooDnAr2t0;iurcer,ne0ol8soh,uocs;r4tnC;e2o0;htua,t0;cod,nem,ut;e1hsu,ntr0;ap;n0tnulov;igne,o0;ip;iatpac,oipmahc;lib,oof;diug,gduj,hca1illub,rauqs,ssentiw,tauda0vael;rg;oc",
    "Demonym": "true\xA6:!1:#$%&()*:na,ra,ni,ro,il,ne,or;cid#leci,d$i#ps,e0Nh0Ki0Ek0Dn2o1ssiws,t0ysagF;aCiU;al,%p(if;a1e0;ireg2mkrC;buc,c04d#03e01hgfa,i5l4m2omas,rudnoh,uga$c1xet,y0;auga$p,bM)k;in;hsi0rQ;lg),ri;ametaug,euze)v,og#;a#hg,bSdPgMlJnBpoihte,r6s3t1v0;(Btal,urep;a0iah,pyge;*c;a,enod%,in1sur,u$lKy0;al9;ut;ag3e1o0t0Hys;dauce,vi;b8g0;in,la;lub,nuh;a4em$,i3o1&f(Fs0;ob;dec0*emDtse;am;arku,tselQ;bla,d&j,m1ri,uht0;(;anN*;a1iza0ognH;rb;mos,rt02ti;ew&n,l1&0;eg;eb;a0%,obm1;di%rt,hc,n0;ac;iman,m0rR;a0olP;g,z;liJp*ue,&0wbabmiz;k,pag%s;gu,wr;c*2i0;amH%mod,r0xem; otreup,ema,fa;om;avols,eerg;aht,d3hsedalg#b,learsi,#1qari,$taq,t0;arime,iawuk;mo,tsik0;ap;%h,u0;as;c1kazak,s0;ittocs,lew;ezc,)rf,tud;deCisBn8se0;l4manteiv,n0ugut&p;a1i0;hc;bel,dus,p0wiat;aj;agen1ogn0;oc;es;ad,i0;pp(ihp,t)g0;$;sua;ws",
    "Organization": "true\xA6!1:#$%&()*+-.<=>?@[]^_`~:on,er,an,re,le,ar,in,en,da,st,al,te,il,e ,na,ca, b,to,es,li,or;0:50;a43b3Lc2Ud2Ne2If2Cg24h1Xi1Tj1Rk1Pl1Km16n0So0Pp0Fqu0Er05sTtHuCv9w3xiaomi,y1;amaha,m[,ou1w[;gov,tube;a4e2iki1~ld trad?~g%izati#;(aSpedia;lls f)go,.1;field,*ghouse;l1rn$]ros;g&+s,l .&et journ<,m1I;% h<Q$iz#,isa,o1;-f#e,l1;kswagOvo;b4kip,n2ps,s1;a ^-y,ps;_co,i1;(v$,=d @ti#s;$,s; mobi(,aco]eUd]Re9gi fri-ys,h3im h~t#s,mz,o1witt$;shiba,y1;ota,s r us;?1* `zzy;b3c)p+3T->y ma>,gu_s w2hol`0s1w2;mash*g pumpk*s,up&m0;ho;ea1lack eyed peas,yrds;ch]oys,tl0;l2n40s1xas *.rum+ts;co,la m1K;ef#i[,us;aBcAe7iem+s,mirnoff,np,o5p4qua&0Et1ub)u;a1e$01;rbuc1^>;ks;eci2Iic?gir4;ny,undg)d1;+;a2x pi.o1;ls;g22rs;hool1Yi+^logy;feway,*sburys,(sf~ce,msung;adiohead,b8e4o1y%air;m% empi&,y< 1;b1dutch she4;%k;a3d 1max,vl#;bu1c2Hhot ch>i pepp$s,lob.$;ll;d$s dige.,l madrid;c,s;%tas,iznos;a8bs,e5fiz$,h>ip4i3r1;emi$ 1ud+ti<;(agUo>;nk floyd,zza hut; m~rBs;psi2tro1ugeot;bras,ch*a,@s;!co;l%tir,n1yp<; 2as#ic,-2W;ld @vy,pec,r%g?ju`2xf1;am;us;aBbAe7fl,h6i5o1sa,vid4wa;k3m*at2t& -me,v)t1;is;*g1L;ia;ke,nt+do,ss%,vZ;l,s;c,.(,tf`x,w1; 1sweek;kids # th?block,y~k0E;a,c;ndos,s2t1;i#< a[2Vo,we.;a,c),-q;aDcd#<Ce9i6lb,o3tv,y1;spa1;ce;b>,ns%^,ody]lu0t1;(y cr1~0X;ue;c2t1;as,subisO;hel*,rosoft;di[2rced_]+z,t<`1;[;id,&;ds;cs m>k,t=l,z-;a3e1g,itt( [_)s; o&<,novo,x1;is,m)k,us; 1bour p)ty;p&sse,z]oy;atv,fc,kk,lm,m1o-k;)t;iffy lube,oy divisi#,pm~g%1sa;! chase;bm,hop,k3n1tv;g,=1;l,rpol;ea;a6e5i3o1sbc,yun-i;m?dep1n-;ot;tac1zbollah;hi;<thZw(tt pack1W;l`burt#,sbro;+$< 6hq,ithub,l5mb,o2&+ -y,u1;cci,ns n ros0;ldm% sachs,o1;dye1g(;);axo smith kl*e,+coZ;e(ctric,m1;o^rs;a5bi,c])celo4-,edex,i2(etwood mac,o1ri^ lay;rd,xc#;at,fa,n%ci<1&.#e; tim0;@;cebook,nni?mae;bay,sa,u4x1;ecutiveXx#1; m1m1;ob>;!rosceptics;aiml$,e5isney,o4u1;nk* d#u2p#t,r% dur1;%;ts;j,w j#0;a,f (pp16ll,pech?mode,r spiegel,.*y's chi1;ld;aNbc,+trLhHiFloudflaEnn,o3r1;aigs`7eed+c?c()wat$ &viv1ossra>;<;c9*ba8l6m2n1~s,.co;f$+ceIg&ssi#H;[3m$ce2p1;aq;]o0X;.;dplUg1;a=;se;a c1o ch%S;ola;&;a,sco1tigroup;! sy.ems;ev2i1;ck f> a,@ ->y;r1y;#;<1; commit=e;d2pit< o1rls jr;ne;bury,>l1;ac;aEbc,eBf9l5mw,ni,o1p,&xi=eU;ei3mb)diI.# 1;glo1pizza;be;ng;o2u?c1;roV;ckbu.$ video,om*g-1;(; g1g1;oodriL;cht2?ge0rkshi& hathaw1;ay;el;c)di,idu,n%a &publ3s1xt5y5;f,k* robbi1;ns;ic;bYcTdidS$osmith,iRlKmEnheus$]usDol,pp(Ar6s4u3v2y1;$;is,#;di,^d_k;hl%d o1socia=d E;>;b3g2m1;co;os;ys; compu1be0;=1;rs;ch;c,d,$ic%3t1;!r1;ak; ex1;p&1;ss; 5[=l2ta1;ir;! lu1;ce1;nt;jaze$a,qae1;-;g,rbnb;as;/dc,a3$,tivisi#1;!]`zz1;)d;demy of sci+c0;_;ba",
    "Possessive": "true\xA6its,my,our0thy;!s",
    "Noun|Verb": "true\xA6:!1:#$%&()*+-./<=>?@[]^_`~:ts,er,ps,rt,hc,ed,hs,ra,oc,ne,ni,na,rc,xe,ca,ar,lf,ro,us,op,el,rp;0:AT;1:AH;2:8V;3:B0;bBBci<p,dA8e62f5Zg5Qh52iks,k4El3Tm3Jn2Xo2Wp2Cr1Is17tQwMxJy6z4;iuq,tilb,z4;aj,u7Z;aEbbol,dDeBl8p7r6spoib,t5v4;`,.;ip,+p;c,f,ot.v/,]w;-,s;f,la5p4;$,p^;r,t;k4~,vr^;!nom;em1u#;l4p,r%,#;),p8L;a5)/,i4ob;f,m;t,w;alc,e5o4;*,l6Xns,rht,v;iv4=s;!$,ret/;a0Hbuod,c0Ae08f05hgi03iXlWnLoJpmetta,rEs5t-yob,u4>t;b),c;aAe8i7o6u4;ah>,b,l,r4;!ht,t;c,ob,p,rf;l,ssa,wt;gid,r4t7Juq1v+h;!et/;c4o3Tr2Z;!daorb,$of;a7e6o4u0;fm0p4s1;$,p^,>;s6Tvn0;d,(,p,#9P;ir,o4%,&,vip;b,l,r;aCe8i7u4;ah,h,o4;c4m;!?;ap,h,_,~;c?,i],m4r,sn0tap;`p4g@f,ir8Gm0ucod;m4p^;i,-;lp,r4;!+w;eb,^1;aw,b8d$c,f7h,l6m5p,rem,s4^;iv,_);il,m0ov,rep;%,s;!e.b;!ih>,];f,l4;),hgih;@5i4;g,*,l,rd;c,d;b,g4k+m,n,p,rg1s;dub,+t;a9e5i[n0u4;dn0r#n0;f6j4lgen,%1;b4$,o3;o,^;),fe;!pmi,&>,tn0;bm0e5m]f,o4r;c,[;b,f),h2Tp1&,s,ws;aDs5u4;b,cof,ovz)n1;apAe6i5o4uf;lg,=,t;k,m;c6m,n+h,r4ug;d4go3p,#;!da;?,o3;!revo,yb;g,ib;aVeCiaBo8u4;lb,o4%;b5l0m+,n8t,va4;f,[;al,+h;bal,(9l0n5rrim,sno%,t4va[;?f1inom;oh;!(,p84;bmun,dJeIfGgFhtaew,mmah,n<m,pDt9v7w4;o5s4;<;[,p;i4-;*,uq;aw,l6n5s4tam;am,ig1;ec,u-.;a,e*,if;m4s58;et;gi&,<;f4s<&;o,ub;(,p,#;now,r4;o4um;!b,$;b,cs,e4#,w;b,f,g,t,w2;aLeJiDlCm9o4s@g;h6m,o5p,r4t2;c,d,p;p,#;!s4;!k]w;a5u4;b,d,j,l7Tp;c,#;eh,ug;d,h7l6r5s4t,z;!sog;!d,g,t;c,f,s;c,s4w;!]w;e4#;ls,=;c,`,l,m,ns,r4;!t,w;d1(e;aOeMgisLiGo8r6u5w4;ay,orf;g,r;e2Ou4;b,t6T;it5ri,s4;a1i_;aKc7i5.m,om,se4uac;uq;s4tep;<&,_;n4ua;as,uf;a5-,p2ur,w4;!t;g5(,r4#;!d,t2;!+b;!);dr4$cs,p;ub;b,cs,lp,ol,p2;aBe#,i9lif,ooz,r6u4;s,u4;?v;a5o4;f67#;!f,h0Bla;a4&;!lc;$4h,j,%,r3B;d,#;aLeFiCl6o4ruc;_,r4;tn0;a8e7i5o4;p,r2St;k,%,r4;d,g;ms,%,t,y;beye,c5Tf,#;a5c.p,o4;!f;b,f,m,s,t);b8c>,dom,e7nn6snu0u5v4;a&,`;d,f;a(,ut;f,hw,k,p,r;al;e4ngis,ri%,tot,vir;d,p4s,v1;$,pa;aeQcH$t,lFnCooBr7s4;a5i4;hw,r;!m;a6ims,ow4;!t4;en;b,m1p2;b,h,l;a5i4;!l04rd,s,#;b,r;a4im;t2w;a9e8i6o4uf;d,*,l4m,nk,r;!b,f;k,l4p,&,t2w;!c;(,rw;b,h2l,p,r5s,t4;s,ta;!c,t;l,p,rb;cGguFp@gotohp,s8t4;r6u5wo4;rg;om;ow;a8e[,i6u4;p,r4;!b,c;d,f,l4/f,w;$,_;b,c,h,l4m2=,w;f,%;al,-;aBe`,n9+8t5uo4ysp;ls,t;a5$#,i4;b,d,#,ws;c,h,l,m,p2K=s,w;!es;@b,u4;al,p;e4o~pa;l,r4;!b;aBn7o5u4;h,lp;b,f,l4;!atac;a6i4;r4w2;!%,#;b,g;g,[,rd,t;e5f4oor;a#,u#;eb;b37c2Id2De2Bg1X(a,i1Vk1Pl13m0Wn0Qo<c,p0Jr05sQtFuDv6y5z4;ag,eens,is,oo;d,e;a9i7los1o6r4;es4uc;!$45;l,m;d,(4rd;+;c,*,w;c,l4ssi;av,g;a8i7o6sa5u4;bi&,mm0or,%id;p,t,w;n,v;b,%;bZc8d7g,h,icos6mi#e,/d]0r4#;!emolgn0t.4;cn0;sa;!nLpu;ilpud,ovda;aFiA.9_,pall0r8u4;a6ba,c>,f1oh4;!$4;aw;c,p;ev1oh,un;cil,s;a7cre>,(<Hmo~2Xr5u4;gsid,rb;!pr4;^;p,r3C;b,e5h4;crup,p;l2R=U;aFiDoCt.c,u5vueon4;am;c,gif,s8t4;aef,c5.v,pKr4;ot;a4`;rf;a4se3;em;c2*,p,#;f,h,s4t,w;);c2d,*,l4#;f,g;a6i5o4yt;h,r;p,w2;c5*,r4;!cs;se;ac;i6o5u4;~,t;b,hp,rd,t,z;bm0l4m,p;!c4tuo;),/;a8it,m@7-l6u4yhr;fr4s1;ep;ew;go3;g,l4n,rf;b,f;aObJcric,dnIffuHgFiCk9oh,p8t5u4yS;dehMr;s5t4;ab,ob;ihw;aNmas,u0;c5/r4;%,w;iCub;f5ms,p4t;!kcoI;!o3;gurGn4;at;*;ah;b6mu5uo4;&;rg,#;ir4ub;cs;cs,h/;a7i5o4;j,ms,r5;b,h,lsYr4;#;c,[,m1ns,r,#4;!im;l,t;?;aFdCn8r4;a5em,u2;!s;b,(4;!sO;a5`la4ulp;(;(4r;!>;e5i4od;rb;!h;!k?p,mad,r,t4;<vdasFs;p,t4;!<+ug;a5i4-;r0Zs,t,vB;*,r4;g4t;!pu;aOiJn8]6u4;do3r4;%;f,v4;id;aAe4;f,i6l5ref1tnEu4;[KqD;is;.vn-Ir4;ep4;>;d,l6n5v4;da;if;ab;fi=Nl7ov6~,t5uj,vr4;es;?3on;!/;_,s;!f4l0Ar;!r4;et4^;/;i4o3uc;rb,v;aZeWiVlSnIoGr6uo5wo4;=;lc;a5-4;?,$;c,g1ob8ug6w4;a,$,r4;of;!ef4;as;!eta4;ks;$;n,o4;[;aAe9i8ob,u4;f6o4;p4rg,s,w;!m0;!$;b,m,rg,w;!b,lb,&;b,h,l,m4rb,#;),m0;-;ei5o4;f,h,m;f,*,y;a,b,k,ov;e4*;co3f,n,%,rb,s,w;~;e6ol4;!nw4pu;od;h,l5r4;ht,%;!p;ap;ad,m6os,r5u4;d,lc,r,s;uc;ob",
    "Actor": "true\xA6!1:#$%&()*+-./<=>?@[]^_`~:st,er,en,on,re,ar,ess,it,ri,te,nt,ss,ti,an,in,le,ce,de,is,or,ch,at;0:79;1:69;2:7E;3:7D;4:7M;5:7I;a6Mb61c4Td4Ae40f3Rg3Ah2Zi2Tj2Pk?2Ol2Jm25n1Yo1Rp0Vqu0Tr0JsQtJuHvEw8yo6;gi,ut6;h,ub0;aAe9i8o7r6;e#l0+0;m1rk0;fe,nn0t`,z)d;~h$m1ld0;ge e)n0+0nd$0r-2;et$7i6oyF;l5Goli54p,s3Y;>,?a2T;n6s0;c@,d$03;ao^ea`,e9h$api5iktok0o8r6yco&;a6%dseLo42;d0mp,nsc-0Bvel0;ddl0u1F;a0Q`n7%6na4#0;ag0;i3No0D;aiXcUeRhPiMki0mu25oJpGquaFtBu7wee6;p0the)t;lt1p$7r6;f0ge&,viv2;h6i/%0I#),v^2;$o,um1;a8ep7r6;>g0eam0;bro2Mc2Nfa2Mmo2Msi1Z;ff0.sm1;tt0;ec7ir+,o6;kesp58use;ia5It3;l7me68n,rc$e6ul;r,<;di0oi5;n7s6;sy,t0;g0n0;am1ow6;girl,m1r2P;c(tIni_ c+3Er6;gea4v6;a4+2;hol),i7(%6ulpt2;wr2B;e01&;l2/;aEe9o8u6;l0nn6;$ up,?gE;gue,@ mo]l,of0;a4Yc8fugee,po31se)Qv6;$%d,olu=&6;)y;e6luXru21;p=o3S;bbi,dical,pp0;)t$6e%;back;aXeVhRilg-m,lOoKr8sy`o7u6;nk,pil;logi5;aGeDiBo6;d9f*2g7phet,s6;pe2Jt+u.;%6ramm0;+2y;igy,uc0;e#4Mme m?i0Tn[6s3D;!<;a7si6;]4;`0;ct+i38nk0O;dca0Net,li6pula4Yrn#);c2H=c6;al scie6i1;/i5;a6umb0;nn0y6;$,ma.,w-ght;a8iloso7otogra7ra6ysi1V;se;ph0;/om,rmaci5;r6<i1T;f_m0s&;i3Fl,nel3Yr8#2tr6wn;i6&;)Wot;%tal,iah;ccupa4ffBp8r7ut6;ca5law;ac@,g>iz0ig2Fph1;$3t6;i1Jomet6;-5;ic0sp-ng;aBe9ie[,o7u6;n,rs$3J;b6mad,vi[;@2Wody;i6mes^,phew;[,ghb2;nny,rr3t1X;aEeDiAo7u6y#ic;m8si16;d$3gul,m7n6th0;)Dk;!my;ni7s6;f+,sus,t0;&,#0;`>ic,r`a4;gi9k0n8rtyr,t6y2;e,-)6;`;ag0iac;ci1#ra.;a7e2Aieut%a4o6;rd,s0v0;b_0d7ndlo6<,u(a.,wy0ym1;rd;!y;!s29;e8o7u6;ggl0;gg0urna2U;#0;c&,dol,llu3Tmmigra4n6; l9[l,fa4habi41nov3s7ve6;/2#ig3;pe0Nt6;a1Fig3ru0M;aw;airFeBi#oAo8u6ygie1K;m>6sb>d;!+a8;bo,#6usekN;age,*;-1;ir,r6;m7o6;!?e;+;d(<0#y2C;aLeIho#Girl26ladi3oCr>d7u6;e5ru;c9daug0Jfa8m7pa6s&;!(4;a,o6;th0;hild;al7d6lf0;!d*;ie,k6.26;eep0;!wr6;+0;^ha,n6;i6tl04;us;mbl0rd%0;aDella,iAo7r6;eela2Mi%d;e,(6#$ pa(4;be),m1r6#0;unn0;>[,gZlmm18n>ci0r6tt0;e6# lady; m)shal,figXm1;rm0th0;c&oEdD@ct-Cm8n7x6;am?0[ll%cy,i@;emy,t(pr%eur,vir&m%ta1J;c8p6;$2loye6;e,r;ee;ci1;+2;mi5;aKeBi8_k,-7u6we02;],t`*;ft0v0;ct3e=7plom~,(6va;ct2;ci1=1;aDc_3f%cC+y,nAput9s7.ctLvel6;op0;[1Fe6ign0;rt0;ee,y;iz6;%;em1;c&,l0;d8nc0(]v7ug6;ht0;il;!dy;a07e05fo,hX+iz%WlToBr9u6;r3#om$6;! (p(s%t~6;ive;e3+6;ic;lJmGnA_d9rp_al,u7w6;boy,_k0;n6-0;ciUt*;?3;fida/Ag(<Ts9t6;e0Kr6;ibut2o6;ll0;tab@,ul1N;!e;edi1m6pos0ra];a0EeRi<i6;&0;@ag8&7um6;ni5;el;ue;e6own;>0r6;ic,k;!s;a9e7i6um;ld;$@6f;ad0;ir8n[7p6ract0;la?;ll2;m1wH;@b-6o;ty;dAr6shi0;e7pe6;/0;r,t6;ak0;et;aMeLiJlogg0oErBu6;dd0Eild0rgl9s?*6;m1p7w6;om1;$s&;);i7o6;!k0th0;cklay0],gadi0;hemi1oge8y6;!f-e6;nd;ym1;>;cyc6sQ;li5;~box0?gs;by,nk0r6;b0&7.6;nd0;!*;c03dVge4nPpKrGsEt9u7y~ull6;ah;/6tG;!ie;h8t6;e6_ney;nda4;ie5@6;.;s^00tr&6;aut,om0;`b^8i#7=s6;>,t;ocrU;hop;o#9p6;)i6r%=S;=6;&;@;a9[#2im3nou8y6;bo6;dy;nc0;ly5rc6;hi5;mi8v6;%tur0^2;$;ni7r6;al;#r3;~2;_;counBquai/>Arob9t6;ivi5_,(6;<;#;~;[;ta4;/",
    "Adj|Noun": "true\xA6:!1:#$%&()*+-:re,er,al,ra,ni,oi,ts,oc,ne;%linav,ba&,ci18d12e0Ef0Cg(0Ahs09k08lUmQnLoKrGsDt2woll6xelMy0;bbE&0;n)siv,ropmetn+;a9$cFhgil,lu8n4#pxe,s0;ap,eb,i0;car,laicIn0rorY;im0)ss$pmi,#dom,u01;ef;a2e0;bmucOc0dis$,itap,tOuti*n+,vlE;onNselo1;i&v,*M;da;f,uqs;ioegruFria*pu,se0tun;cxe,lem0;oh;a$,e2iaf,)0;n0#pus;es;dle,imeItt%,vlis;obat,rp;a3e2gie#v1)na0;pm+;os;et,kot;cilbupUidem,t;i#t6ott2u0;i0rdmuh;dem,me9;ob;a1e0lews;bOvon;cid)#p,edi,i7n4pic(5r2t1udivid0vo;(;nLrX;e0om;bil,-g;im1)ssefo0;rp;#t;c1r0t-top;es,t;iE#0;mmQ;c%s,n%b,r2;ar,ibbur,ul;ggan,lr0nnuc;ad;ei0lah;hc,rb;ci*Mdurc,gas,lF(ErutDt7v0;arg,i0;s-4t0;a1iguf,pac,uce0;xe;l0n#tla,#poEt-s$p0virU;$;ffo;a3$cnBi0urb;le,r0soppo;ov0uov0;af;(drob0udaD;us;ai(m,uf;&m,tuor;am5b2i0os;b0-v5;om;a1it#vn0;+;irF*;!ef;uj;ehs#taw,iu3lo2n0&dna*;obagBuo0;rg#dnu;c,g;lf,q0;il;hparg4m3pe,rt2ss%c,t0;anul,c&0s%p;!tna;em;edaca,+;!om0;ed;av",
    "Adj|Past": "true\xA6:!1:#$%&()*+-./<=>?@[]^_`~:ts,oc,er,re,cs,ar,es,ro,uo,la,ne,mi,ed,ht,ra,xe,ni,el,ol,as,us,ps;0:4Q;1:3B;2:3V;3:4S;4:44;5:4K;d9ekow,n7t6;*pu,f],nrub,s^,uhs;e6+w,wonk;korb,zorf;e6n-b,oo#&dnu;br4Rc4Hd46etu_,ffu4g3Th3Ii2Xk2Nl28m21n1Np1Ir0Xs0JtIvEwDxiCyaBz6;a9i6;disb`,.6mo#uc,nag+,+>ua;ice~,rt/c6;!=;d,ma;c2l2;f,m;en0^ley;iec0lov1o7&s6;bo,%;l,m0rp6;!<;aRb=1cLeg?t,fiJhgil2iIlem,nEoDpC+Bs8t6um;if,o6;nk,~,r;ap,e7i6ujda;l,wt;gg`,r2Suq0;p<,#3;ecca,oda;n,uq,v2;ahc/,emg8i7-6;(3m;ap,op,rp;)f,ua;c@,<l,nu,v1;g,l6;pu;e6ir#0;f9j0l8p6r3to5;s6@;%,`;*,gen;fa,[,&p;cIdHeGiElB<A[9picitAr8#,vit6;l6om;uc;b]ec,egga@,g28$2t/cn$,ut_;(af,mulli;na;e7f1osi,u6;c.c,g0<s;!r;c6ruf1;aG%ppa,o0T;h,p0s;!ilo05pu;i6ude;d2lpm$,xot1;aGiuF/cEoCs7u6;!cof,fn$;)?b9e6ip;co5lb,r6;p6#3;!=,po;me;lc,p6;o5@;il;rb;b,e6ib;l6rc1t;%,p;aPb1eGiFoErCu6;cAj1o9s7tca6;funam,rf;a6/,sa;em;l$,vaH;!*;efe6i4;d,rp;b,l$,#0vaD;~1t,uq0;dC>Xmmah,t7v$6;!%,nu;.,s8t6;a6ulc;b,(;ig0u6;lf;i6liweb;sn$;(,ef,hs,pe5;a(e,ir4m8^ev2p6?w,yto%e4;)t,i6;r4uqe;)c,u6;p,#;eFiAn8o7ru6;b,t;dnaba,sa*;a6u4;lp,t;a7bmQfe6lpi1Em&t2oj;d,r;r7#6;!`;!d,t;%(,>gn%4k8pmad,t6;a%>,hgi6;rf;aew;aBlehwV<Pr7u6;ssa;a7of6;=,[;!h6.;!c;e4rf,t;aJbHcyc0eFffab,iDk[rw,l9t7zz6;ad,up;nurgs3t6;*,ob;i7ortn6;$;hc,r6;g,>;a6ob;f,t2;ll)ap,v6;];_3muh,-6;rt;*;aEcAiZo7?6;m,p;ms,o6#;c,h,l6;&vo;a7ip,o6;hs,l;p,r6;c,t;b,os;fAl8pucco7r6t;av,d,f,+w;!e5;l),p6;<,pa;i6sit_;ceJdIlGnFrEsAt6;)8r7s6;uj,ym;ec;!g;n7sa6;lc;et1;[;ev,+h;g3u;auq,pm6;is;e,om;~;cDs6;aw,i6uT;l9n6r-n;i7r6;at;f,m3;bat6op;se;+7ta6-t;>,r6w;(;aCdA].,g8n6?hc;)2^o5;=;a6ulp;j,n;]wonk6uj;ca;!c,gUm8n7r-6;(3;am;ad;#;_;aFeEiug,n9$,r7wo6;rc;a6$0;ug,wa;apGe7ilb,u6;ow;mm$0~7t6;[,@;`;en;f,hs,^;alp0n7&ip,ud6;%,o5;a8ei&p7-no5;rp;@;h8l7v6;da;ab;/;%;os7u#3;id;ba",
    "Singular": "true\xA6:!1:#$%&()*+-./<=>?@[]^_`~:re,oc,ra,ni,er,na,ts,ta,am,ht,ir,ro,or,ot,oh,it,ip,ed,ci,ne,od,ac;0:5U;1:53;2:5J;3:3J;4:5D;^5Jd4Ye2Sf2Rg2Kh2Ak27l1Im1En0Zoy oy,pu 0Xr0Ks0Jt03u01vt,wZx( t,y5;aWdVgQlKmJnnIppHrAs6t5;ei%v,ic;p7s5;abme,u5;h,p;>ua,yg;a6o+5;ngis,<bal,v#3I;l8)7t5;i5_muc`,on,u1P;lim,ng1;c,rg;as,grDub~ov;op,up;arg,ub;mut,on$e;-o),f8i7l5oponom,po)p;a,e5of,ug;b,j;maf,`;dag,(if,nogaH#tt5y-;ub;e+r*,g8iffe,&.,#5;l6n5;e,ys;c,la;[,`;egart,ob;r5w; x,%;eiv3Io5;hs vt,r;_m,r. evi5;rd;cFeEhg/ )muh,_7%* 37s5u)ep;af1Hi5;aw,eh;csAd8i7lat,r6t5ve;n$s1xe;ef0#t4;^ffe$,lc,pic0touq;ic5=,u*;ca,&;!a;k%m e(f,v;e6i5;d#v,r*1;l6ps5s2C;a,=p;a1let&;e^d&,#.o,ucu3;aDe5o`;faw,i6m<f0n5yH;n1wo;calg,da_Yh3l])2p8r6ss`,t5;!em,n=f;d,%5;b,c;!$5ucco;!>Z;c,ewr2Gl5&mes,w livic;l5pmexe;ec,[#t3o5;c,d su;gel,y5;al;aHeAi9o6rut( xat,ur5w=b hsah; em?,(;@5tn3;^d(p,isop5;(p,s1;su$,+leg;g?+p,iAk9t7v5;a5o;eh,h,r;eleks,ti5;k,m;^2opstuo;la,pas;e5ol tn]u*;b,co;a6e5o=,ume.)syr2;lb=p,&m? da,*ys;et,ls d)5;rg;aAebal dr$0l8o6ufd)h,wob5;! #pus;?cs5%c s-*/2;! h1I;~ en5iX;?p;binn3cMdeLeKiImGnErAt6u5;rcca,t/;eJi6>bus,<p,s]ep,t5;iuqca,ub0;c0p5;~,s?;de.3en7r5um;efe5$;d,r;im,uf;~,es%,/u,ruoj,u5;b/t;i5m-;c4);n4pus%m,r5;e+m,>ut,ub;d<,m+o,#c;m,p;],i+bbM;c6%m noi*e5;uq;iDurt pmud;cDgu=Asi6t5;a4olc;m6n%5%p,tef;g,v;elb,ri5;ks;.5ob,t;kae5;rb;iwdn9nZ;ge,[,&5;ddup,.9k)b,l6n5;eve,&,<m;b6iec,p5;as;is;!on;eihcsEfo &ps;b/t,dis17gat11[,k$,l0Qm0Kn0Es06tFuqEv6z5;ah;i5#s tfos;ssAt5;a8ce6_c&5om;!s1;j5ps#p;bo,da;go#rp,@iAr1S;im;aHe2inumm$,<t,som;aHiCo8u5;lf,t5;a*,i*5;&;d6nyek,y5;ep,$;ce5@5;);csibe8dd7n5ps0r,s,teppa,us;!ab5>;ru;ul;lp;b0^f@rHgG[o,lDmi*(Tng-,p,r8t5;e6s5;e,oN;ca; tluaf4bet#v8dyhobr3>c6t5;in,sbH;ele,`;~;!&;$o2p6u5;sn$;!met;/f,=rA;ec;ael( sseBi6opr5;up;dar8me9r5;h6n5p#t_;us;gih;ap;rp;~,o5;em8hp7m<h,t5;r5s;]nu;daeh;os;ag o]iv,i8o5;h,s5;e(5ruof;.;l,t5;#vo;ahw,b6pma5;xe;a7i5;cuOdn5;-;ll9t5;e6nr5;ut;g5m@;ev;ys;l9n6<hs,t5;$;av6ecr5;ep;da;ov;nw5pu;`;rt;eFiEluHn8r5;a5ow;c tide5ug yt/ucM;rc;e5uo% yI;div1g7if,kc6piNtno5;rf;ab;el;id;leye,maryp,pil,rg;b7p6+&d<$5;nu;om;aAh+4#6t5;?;t6v5;/;aw;];es;dK.e,lHmGnEpoDrBt5;!c9$8si5+;#tca%2+5;*;hc;%n;at;b5>ehr;af;ib,t;c[,i5ut;lc;!][e;bup0$,r5;ag;(;em",
    "Person|Noun": "true\xA6:a0Cbreh,d0Ae02ffilc,gZhtiaf,jd,kXlSmRnKoJrFsDtBxAy0;a8bur,d6ks,l4nn3oj,s2t0ug;i0tik;nirt,raM;iHtap;af,ep,os;il,lo0;d,h;d0naQolem;ap,e;j,r;am,er;a0cidenOeloiv,ra;m,n;dle8kn4rebmaBt0unev;am,tW;e0ime;k1mmus,t0;nuh,top;ab;b,derfTel,lf;a3i2n1ref,w0;ad;if;bGhc;e1itsir0v;hc;d,j;ac,ron;atsyrc,e3iag,l1op,rae0;!p;ah,i0;g,h;wej,zah;c9oo0;rb;n1r0;eb;aw,ik;d6g5i3n2s1v0;e,ilo;or;al,eg,ims3;loj,x0;id;ap;aj;eer,or,r0ub;aw;jed,l1m0yam;la;o0ue;iv",
    "Actor|Verb": "true\xA6:dreLeIfoog,hcaHkGloof,mooKnEpmDr3ss2t0yll9;c0iurcer,ne6olBpircsnGsoh,uocs;etihcra,idda;entAob;e2o0ueffuB;htua,t0;cod,nem,ut;e3h1nt0;rap;ct0su;ub;n0tnulov;igne,o0;ip;iw;am,iatpac,oipm0;ahc;eeg,o0;oc;diug,gduj,mim,ta0;geled,iliffa,uda0;rg;hpehs,n",
    "MaleName": "true\xA6!1:#$%&()*+-./<=>?@[]^_`~:an,ri,en,on,el,er,ar,ha,in,al,ie,is,nd,st,as,or,us,es,ne,lo,to,il;0:H6;1:FZ;2:DS;3:GQ;4:CZ;5:FV;6:GM;7:FP;8:GW;9:ET;A:C2;B:GD;aF8bE1cCQdBMeASfA1g8Yh88i7Uj6Sk6Bl5Mm48n3So3Ip33qu31r26s1Et0Ru0Ov0CwTxSyHzC;aC@0;cChid,ka$a,nAT;!hDkC;!*y;!*7C)y;aJevg%BSoEuC;%,rFVsCuma,v.;if,uf;nDsef,[C;ouf,sef;aCg;s,tC;#,h0;hli,nCrosE1ss09;<,nC;!ick;avi2ho5;aPeNiDoCyatt;jc/ch,lfg#g,odrFutR;lFnC;f8TsC;lCt1;ow;bGey,frEh(m,lC;*d,iCy;am,e,s;ed8iC;d,ed;eAur;i,=(l,rn2sC;!l9t1;lDyC;l1^;lDtC;!);ace,y;aK)nDAiFladDoC;jtech,_dymyr;!iC;mir,sDB;cF+0kt@,nceDrg~,vC;a0ek;!nC;t,zo;!e4St@;lCnce,s~y;!%tC;-9J;ghur,lCm70nax,$,sm0;$Cyss];ch,k;aWeRhNiLoGrEuDyC;!l2r&e,s1;n6rki;av<,eC<t0oy,um0;ntCRv@,y;bFdAWmCny;!?DmCoh*u;?o,/,y;!z;i?,y;mCt4;!my,othy;adEeoDiago,omC;!?;!d@91;!de4;dFrC;%ce,rC;#ce,eCy;ll,nce;!dy;dgh,+,iCnn2req,tsuki;chi,ka;aYcotWeThPiM_bod0oKp%c2tEurDv%AEyCzym1;ed,lve>2;aj,]h;#FeDuC;!aA;f#17phEQvCwaA;e77/;!<laCl9;v,w;_m1rBuC;leym#e,ta;dDgmu=,lCm1yab&ga;?,vio;!dh*t+,n9;aEeC_mo;lCrm0;d1t1;hid,^,qu1Jun,wn,y^;aDba>iEDkou,lim,pp,rgCth,ymour;e1Dio;m4n;!tC;!/,y;eed,lFmEnCqib,`shi,ul;dCjay,t-o;eep,ro;!iATk(o,mC4u5;!ik,vat@e;aZeUhett,iRoGuDyC;#,ou;b99dDf4peAssC;!(EG;ol00y;#,bLcco,dJ(,geIh0lHmGnEry,sDyC;!ce;a$o,coe,s;!aCnBU;ld,n;#,eo;a7Ef;lio,r;e3Eg2n9olfo,$C;go;bBNeDH;cCl9;*do,c86h54kCo;!ey,/,y;cFece,gDid,ubByCza;#sh,n06;g/,iC;n.d,s;ep;chid,fa5hH-2j]h,lGmF=EoHp+5sDul,wi$,yC;#,m&d;+d,m4;.DSolph;iro,&;f,ph;ul;e9C-C;cy,t1;aOeLh~JiFrCyoG;aDeC;m,>1;k?h,vit;eDoC;tr;rre,tC;),ro;!ipClip;!p6U;dro,rcy,tC;*,e9JrC;!o7;b_,draig,o_,sc.,t$62ulCv8I;!/,o7;ctavio,i2lImH=rej,rGsDtCum6wB;<,`;aDc6k6m0vCw.d;.do;ma;i,vR;*,);aDeks#dr,ivC;),i2;f,v;aNeLguyBiFoCuka;aD(,j4l0ma0rC;beAm0;h,m;cF(s,g5i_,kDlC;],s;!au,h~,l?,olaC;!i,y;hCkCol?;ol?;.,d,~,ls1vC;~le;hom,tC;e,hC;#Cy;!a5i5;aYeViLoGuDyC;l],r1;+mDrad,>aC;fa,p+;ed,mG;dibo,e,+mE<],ntD$tz,sC[sa;],he;e,y;ad,ed,mC;ad,ed;cGgu5+i,kFlEnDtchC;!(l;a`,ik;ho[e,o7t1;a)e,eC3+~,olaj;ah,hDkC;!ey,y;aDeC;.,l;(,l;hDlv3rC;le,$ll,v4T;di,met;ay0c00gn4hWjd,ksim,lTmadZnSrKsXtDu$c7VxC;im~BKw(l;eHhEi?,tC[,y?;!eo,hCia7;ew,i?;eDiC;?,eu,s;[,w;j,o;cHiGkFlEqu<,s+ll,tCv3;iCy;!m,n;-,&;(,o7[;#o,o7[;!(C-,o7[;!l8o;fred,<h,ny,u5;achDcoCik;lm;ai,y;amDdi,]h,mC;oud;adCmad;ou;aulC/j;ay;aWeOiM_yd,oJuDyC;le,=1;cFdEiDkCth2uk;a7e;gi,s,z;ovic,vig,wig;!?,iC;#o,%;g0nn/,r%DuCvro,w(l;!iS;!zo;am,n4oC;n5r;a9Yevi,l#d,nHoF>2t+EvC;eCi;nte;bo;nCpold;!a82(,id;!nC;aAy;mE=1rDsz_,ur%Cwr6K;ce,t;ry,s;*,beA&t;aOeI+lHiFla4&rad,rDu5SylC;e,s;<tCzysz`f;i0oph2;)0ngsl9p,rC;~A9k,ol_s;ed,id;%0iGnDrmCv4Z;it;!dDnCt1;eth,y;$ck;r,th;cp2j4mEnata,rDsp6them,uC;$;im,l;.,~;a03eXiVoFuC;#,lC>3;%,iC;#,%,o,[;aQeOhKkub?,nIrGsDzC;ef;eDhCiah,ue;!ua;!f,ph;dCge;i,&;!aCny;h,s,th6J;#DnC;!ath6H/,n72;!nC;!];!l,sCy;ph;o,qu3;#,mC;!i,m6V;d,ffFns,rCs4;.d,emDma-e,oCry;me,nimo;iah,y;!)y,rC;ey,y;cKdBkImHrEsDvi2yC;dBs1;&,p2;ed,oDrCv<;ett,od;d,s61;.,]5W<1;a,e,oCub;b,v;ob,qu];aTbNchiMgLke53lija,nuK&ut,rIsEtCv0;ai,suC;ki;aD+0iah,maCsac;(,~;ac,iaC;h,s;a,v-Cw3;!g;k,nnguaq;nacio,@;ka;ai,rahC;im;aReLoIuCyd6;beAgGmFsC;eyDsC;a3e3;-,n;b)`;h,o;m2raDsse3wC;*d,/;c49tio;ath,ct@,iGnDrC;beAm#08;d$k,rC;iCy2N;!k,que;n0Tt@;bKlJmza,nIo,rEsDyC;a`,dB;#,s0;lEold,r2IuCv9;hi`,ki,tC;a,o;#,ey;k,s;!im;ib;a08e00iUl%ToQrMuCy@gy;iHnFsC;!taC;f,vC;!e,o;n6tC;),h2;do,lC;h)DlC;auC)Q;me;aEegCov2;!g,@C;!io,y;dy,+m;dfr9nz.o,rDttfC;$ed;#,d47;!n;acoGlEno,oC[eppe;rgiCv#ni;!o,s;be6I],lC;];mo;oFrC;aDh*d,rCt;it,y;ld,rd8;ffErgC;!e7iCy;!os;!r9;bElBrCv3;eCl#d,r4Hth,y;th;e,rC;e.,i(C;!i4;aXeSiQlO@re>,rCyod@;aHedFiC;edDtC;s,z;$ch;!d42e$11$C;ck,k;nCs2;cEkC;/,lC;-,yn;]L<C;!co,zek;etch2oC;$0yd;d5lC&n;ip;de$FliEng,rC;d-aCg4n#do;=8;pe,x;co;bCdi,hd;iE$C;ce,zC;io;#,%,o;b%ez2dZfrYit0lTmMnJo3rF>eb0th0ug%EvCymBzra;#,eCg%y;ns,rett;!e;gi,iDnCrol,v3w3;e>8/,>;cCk;!h,k;och,$Czo;co,qC;ue;aH)GiDmC;aGett;lCrh0;!iC;#o,o,s;s1y;nu5;beAd1iEliDm2t1viCwood;n,s;ot28s;!?,jah,ot,sC;+;a3%;!dGg6mFoDua2QwC;a2P-;*C;do;oZuZ;/;a04eTiOmitrNoFrag0uEwDylC;#,l0;ay^,ight;#e,dl9nc0>3;m-FnD$0ugCvydGyle;!lF;!.d,nCov0;(l,/,y;go,iDykC;?;cCk;!k;i,y;*muFetDll1mit$7^C&,rk;sh;),m6$C;ch;id;#dLepak,j0lbeAmet$4nI&,rGsEvDwCxt2;ay^,ey;%,-;+wn,moC;=;ek,$C;ck;<,nC;<,y;rt;re;#,le,mKnIrEvC;e,iC;!d;%,iEn(l,rCyl;eC-,yl;l45n;n,o,[;!iCny;(,_;iC&;#,%,&;a0Fe0Ch03i*0lRoJrFuDyrC;~,[;rtC;!<;aE<tC;iaCob.;no;ig;dy,lInErC;ey,n(iCy;s,[;nE@,rD>aC;nt3;ad;@;by,e,-,l3t1;aHeEiCyde;fCnt,ve;f@d,t1;m%Dt4;[;s,t;rFuDyC;!t1;dCs;e,io;%C;ce;aHeG$sC;!`C;phCs;!eC;!r;>2t;d,rCs;b5leC;s,y;cDdrCs6;ic;~;lHmFrC;ey,lDroCy;ll;!o7t1;)1iC;_;!eb,v3;a09eZiVj@n,laUoSrEuCyr1;ddy,rtK>2;);aKeFiEuDyC;#,ce,&;ce,no;#,ce;nDtC;!t;dDtC;!&;#,&;dFnC;dD<C;lav;%,&;!foOl9y;bby,gd0rCyd;<;-e,ke;bElDshC;.;.,lL;ek;nIrCshoi;at,nEtC;!raC;m,=;aD+C/;rd;rd8;!iDjam3nCs1;/,y;`;kaMlazs,nHrC;n9rDtC;!ho_mew;eCy;tt;ey;dCeD;*,iC;le;*1Nb1Dd16f&so,gu>3hm12i0Zj#i,l0Bm07nTputsiSrGsaFugu>EveDyCziz;a0kh0;ry;o,[;hi;aMchiKiJjun,mHnE&,tCy0;em,hC/,ur8;ur;aDoC;!ld;ud,v;aC-;#,=8;!(,ki;baCe;ld;ta;aq;aMdHg(8tCw6;hoFoC;iDnC;!i8y;^;ny;)7rCy;eDzC;ej;!?,i,j,s,w;!s;s,`lC;iCy;!y;*,iEmaCos;nu5r;(;^,r,t;aVbSdBeJfHiGl01&Fph&sEt1vC;aP-;&;e,o;so,zo;!sR;!&ZrC;ed;c,jaHksFssaHxC;!#dC;),rC;e,os,u;#dCei;*,),r;=C;ro;%;eDrecC;ht;rt8;dd3-,n,sC;taC;ir;ni;dDm6;*;#,%;ad,eC;d,t;-;so;aGi,olErDvC;ik;i#8;f8ph;!o;mCn;!a;dGeFraDuC;!bakr,lfazl;hCm;am;!l;.lF(,oulaye,ulC;!lDrahm0;#;ah,o;ah;av,&",
    "Uncountable": "true\xA6!1:#$%&()*+-./<=>?@[]^_`~:er,te,ic,ar,en,th,is,ne,se,ur,ce,or,in,re,ta,ti,na,le,us,ss,an,li;0:2F;1:34;a2Ub2Lc29d22e1Rf1Ng1Eh16i11j0Yk0Wl0Rm0Hn0Do0Cp03rZsJt7.`^,v5w2you guys;&m9h*ky,i3oo2;d,l;ld~fe,+;ap<,#[cul&,i2;+g&,ol1P?e;eChAi9o7r3un2yr`ny;a,gs$n;aff%,ea1Lo3ue n<2;);ops,u2;b]shoot2Ps#s,t;nAo)pas$,wn2;foFsfoF;me off,n;#2und#;e,mod2T;a,nn*;aEcDeChBiAki9o8p7t5u2weeps?k0;g&,n2shi;l2shi+;ight;a@07e2;am,el;a/2Jeci0;ap,cc#,me)2B;n,ttl0;lk;eep,=gl0<ts;lf,[$,ri0;(#y,*s<s;d0Vfe1l3nd,t2;*h,.n;mon,t;abi0e3%2;e,kets;c2=s,laxa10-&ch;ogni0Z>a0Z;a8e7hys6luto,o4>2ut1;amb],m*0s2t2;(-;l2rk;i27l(,yG; ed,%s;a/,trol;nt2@0L;i0s;bs$tr%s,v#crowd1Pxyg(;a4e3owada2u$lla;ys;ptu+,ws;il po~Y@o[l -c.i1;a9e7o4u2;m2s%;ps;n2o-;ey,o2;gamy;a2cha0Dl`choly,rch`d*e,?ll.gy;sl0t;chi+2g%,j1Grs,)ema1P; ]&n1Bry;aught#,e5i4ogi3u2;ck,g11;c,s1L;/,ghtn17ngu*1Kt#atVv#;a)#,*U_;&a$,=d#g&tOn2;%k#s,ow]dge;e2upit#;a2llyfiFwelry;ns;/,gn<5mp4n2;f<maZt#2;+t,s?$;a@R<t2rov;`/;a6e5*t<y,o2ung#;ckey,mew<k,+3o2rs#adi7spi?~1u- &>st;ky;s1y;adqu&$W>;ir,~but,ppiGs2;hi2$;sh;(e7l5o4r2um,ym[s10;a2eY;niT_;lf,>;ut2y/0E;(; 2t%s;edit0Gpo2;ol;aM%Elo.,o3.nit2;.e;od,rgive2.iZwl;+_;&Bcono0KducaA]ctr8n6quip7)%s,v#y5x2;*t3p#2;t*e;(/;body,o+,)06;joy2t#?=2;m(t;%i1o2;n%s;@R;n=gs,);em*e,i5o3raugh2y[s1;ts;pe,ugh,wns?i2;rs;abet0/,s2;honY>pu2;$;aCelciBh9iv%s,l7o2.r(cy;al,ld w5mm(?4n2ral,ttH^coA;f^iGt 2;ed;ry;&;a_%s,o)0;es;aos,e2;eLwJ;^;d,rN;a7i5lood,owlG>ad4u2;ntFtt2;#;!);l~&Is2;on;g2_;ga2;ge;cJdviI#oFirEmAn5ppeal co.t,r3spi2)]K;r=;i)met2s(2;%;i5y2;o3)2;=g;+;-;(4n2;es1;ty;ds;craft;bi7d2[u6;y[2;mi5;/;id,o^2;@2;cs",
    "Infinitive": "true\xA6:!1:#$%&()*+-./<=>?@[]^_`~:er,ni,ed,rep,ts,oc,uq,xe,mi,rt,la,ne,lp,ar,ra,me,il,ps,or,ae,na,ir;0:AI;1:AP;2:9K;3:9V;4:9N;5:A0;6:AR;7:9B;8:AG;9:9D;A:8E;B:AS;C:AJ;D:AB;E:AQ;bB0ciAYdA8e53f4Zg4Vh47k3Ul3Gm36n2Co2Ap23r1Gs17tYwSxRyF;aNdob@,eMfKlInHoGpucco6RrF;av,c3ub;j4=3n`;ap64%;#,pF;itlum,m96pa;eFsitas;d,*[;bo,vn2;lG.Fs,ws;eb,rop;],s;e=&,i9Y;>dhtiw,eJoF;dHl/Gm,nk,rFs,(C;g9Orob;!ws;ahs8L<;hcse,n0rBs;a63c0Ee0Cfi0Bi06l05nXoWpUrNsGuF;cr9Z^;eJiG)9uF;bm2jE.4;l4oh,sG+F;!);b6e96n8M&;f7gFlom,tta,v2V;g6$;aJeHoFuh;ba,hApF(1;%,-,rup,s2E;ssa,vF+;a,b6#,id,$;pFwht; ekat,%,-;aEec9lucs,@t,oEurFyrc17;e,rWs1;l/,ob0r;aLeHiopG^67uF;ad,omr6;$p,pa;l0mHs#GvF;e5mucric,$;!p0;gua,ref;usrup,w;aAu51;awa,bHc[os,de,efDfo.0mGo=A],sF*,+;iv0ybab;b6da,[3o;ahFih7T;$,);=u,s;ba,#g,gDmmu=,rprF;et7;aKeIiHuF;dFr1Z;ba,%;de5p3r5L;lFpA;e,f0l2;d0#,<,rFs1J;et7f0tF;ta;sGuF;cof0$m;aKeFucs1;fIrpHsF;bo,sF;a,op;-,p6;n2o5;pr6?h;_ppa,eGoliat,ucF;co,n2;bmXdSfQgOhMpKtH*n2vFwop@;es,[3)F;#,nu,s1;ac,/f,<,sGtaF;hs,lf;e*es,i$mElob;maFso5;h,p,t;pic3tF;ag,iw,ob;gaBnF;ad4[;e5fF;id,us;iIliwCnF;aGeFih,ual;g4r;*s,w;^b@,sn2;em0uF;c4n7G;aKeewJi*e,mav0oHrihc,uF;#,oF;c0rg0;hc,levF;%,<;!s;#,lr69ndik;d8gF;eDr7N;_07eWgiViP@4NoNrGuhs,wF;a],^d;aIeHoEuF;oFtr63;jEm;cs1t7vog;eGwF;!eD;!l;d`ba,isFkc0mm6s~p-;iv4simm4M;aFgCoj;=Am0.HtF;bo,nFta;iam,);<,sF;#,n2;/,s4X;dN#ac,fMhKkrJpIsHtFv[;a#ht,eews,hgieh,rohs,sF;af;row,sel;e3~,mFpah,?hs;ad;guot,tg<F;l,rB;a3fiB;a^b,dFiw;as;lg,m3;aNees,iKlIo(uc9rF;as1i3HofF;%,n5I&,sF;`.;ab@,ehwreF;d8vo;aFws;lcFm;#,o5s1+;ls,^;_QeNiJlHoFunR;rFtA;<,tap;aFi6X^4;(7;aHev8fluf,oG&-,(F;id,$;],rb@;r3ssa,truc,ve5;enk,pGuf0vF;>8#,~N;#,m2+;cn2nF(;`;_QcNeMluLnIrF;aFi,ul;bFm?e;%,@;aG~Fub3;hs;ht;ac;es;ajih,iGoF;l8(0;ffa.,-m;ns,rw;cVsGtF;_*C?e8;aS#f0iF;bruf0lOnLrJuFv>;gnGqF;$l0s;al,itF;s1+;eFuon;hc,p,vop-;av,e=0im1otGrFup;at,uf;sa;bGoFp12;ba,m3;a(e,up;el8*;aH~4<GtF;aRe;.4*;eHoGtF;%,ta;p,rc4;rp,t;eb,id,$GuF;b3=8;lFrw,(;c,f;e~b3fGlug4ooF;];iFub0;ns;c3Yd3He3Dg2Xht2Ui2Tk2Pl21m1Zn1Vr1Hs0Pt04uZvIwo,zF;aGiF;/0ng29sahp@;ma,rg;aTeiRiNloJoHrF;aBesF;bo,n2;m0rpF;!-,pa,s1;sHvF;eF$;!d,r;!ba,s1;aw,ecHgDl0rGvF;#,r6;%,ht,?,(;e3Rn2&;h9leF.0;b,r;ew,hCp,rF;c,g4;b-,gH/vr4A$Mrc9sF;<,rF;up;n>F?;ah;aMepm2iKoIuF;b~GllFtitW;op;tn2;mo5nF*;%,n2;cFdepA;!$;ciQdKeJiti7l0mFpicitS&o,u/ve,vit9;ag/ma,iGotF;ua;c3lF`;b6c9;m&,rc;iGnu7omF;m)9;cuTlG-t7*F;[;av,oF;sn2;d7xot7;a02iYnWoPpaOrKuHy/F;`,rF;ap;c9fn29ma,oFr21;pF?;se;aHeGod4ubF;-0s1;m-,]1;eh0;le;lcKnga1oJpF;atxuj,mHo5pFs1+;o,usF;!e5;i,)3;hc;eD<,s1;_lc,eF;dn2]1;>G/0?F;!mm6;dnFpJ;uf;eGrF;e,hp0;c,=s1pFt;pa;alc3eveRiLoJuF;co5d4giHjn1JsGtcurF;(0;nKsa;fn2;=Fngi;%,+;fkcab,pHt0*F;ca,#,nF;e,i;sF+;a,nF;aTi,);r,s&;evn2iGoF;dn2;d,fe1Ohs,mFpo;aAret%e5;)CuF;hAsn2;a01bWcVd$wd,fTgPiNkcMpHtF;`ms1?Bs#w,tF;>,[C;maIpGuF;)3;aF~c,ot;rg;.;at;cnFpm2ugC;)0;gGnF;>Bim;ig,uF;j,ms;fFiB;ab;ric4yc0;a06mF;eGuF;rc,t;.,sF;#,sa;hApU;aH[,ovFup;eF$,o5;!r;rb,sD;t8v;aGoF;os;b,#b;aRdPelOluNnJrF;al4eFof;mGvF;id,n2;b6e;>?,evaHipGupA;+;-;cs;d7v1;/;eFols1;lwonk9rd;g4nGru)Fsiv4;<,s1;am;lf,rHsF;eDrF;evo;c3ga;aRiMoLuF;lG.F+;$,o5;cGe,lF;a,);e5nF+;i,);c3rr2;bIcHfn2lGsFvo5;b6#;l2s;%,$2;!a;usGvF;$,rG;rFs1;ep;aTiRnLrJseHudF;#,o.7;$;i*9/2;ca;e2ofnF;e,i0;aJemm2iHuonF;eF`,o5;d,r;m,vn2;);h4$f0;ff6oj0t4;<;fJ=HpGrbF;@;tuo;#,siF;d,m;%,rus0;a01eWiUlRnLo5rGu>f3;%;aGoF;ffa;bmFcs1;ob;rp;aIeHoFuoG;csF]0;ba;~fCl,];bs1(rF;%8;eGohF;eb,pu;iw;bDova,r;rof;dnuof8eFw;cGf(_F;rb;c6+;nu;ehCol0;#;eb;l^f,mF;im;aBmucc6rF;osEuF;(1;id;da;us;(",
    "Person": "true\xA6:!1:#$%&()*+-./<=>?@[]^_`~:ni,na,ar,re,el,ir,ra,or, n,ad,li,w ,no,la,lo,en,er,al,hs,am, a,ht;a27c25d1Oe10f0Xg0Whg0Ui0Sk0Pl0Mm0Ln00oSpp)t,rMsFtCuBvok*m,y1z0; yPe#,$rf;_`se&~,b8dd. ffup,e3l1r&0sk$b;b (>h,p;l0uj .$r5;@,i[,ut;l/[,n2r1s0;?<>#drQs)rom;f#<h%po,h6;m+ tt0sid t>w;im;om,s+c gn8;hlu~c,l,oleg$`y_,rh@ >l*hawE;d$rbm[,e=m,ibizx,?b #asu,$yrb ebok,*0se<ey$k,tahb;ehfeeb #atpJgob y[h0wets d+;pmuh;a5doo<&git,e1in$ig,k$b %yt,m.a y.s@dew,$Ttaek,u0;]c`1JicufnYm.%tson;demihc*,m2ta0vy;g ll0rcos;ib;aj-+b(,?h kcol&^;gIi/,n,t=hacop;a/p,e1o0*ts og#r,uka^ caput;~,lyat;cuahc,dav ~*d,hctuk-ot^a,ltih,m>p2p0;ip,p) e~ kc0;aj;!-osr5;d>6h5i?Mk~+,l/m4n2t0y @;a0tuhb rizaneb;lp,vol im9;_+ y%,icap0Go0; Fb;ac;#d>n+,<rotcod;n+,v);aDeAi6o0;(opan,ops&~i<ese[,s3t0;g#^a<lezn1l0#lc,sag;.,ih s)ap;ed;_,i0Lr0s$hoj tt(*cs,ug&f;ac,effej;as2lr5pohc0wdoT;! ci&de0;rf;suh m.das,uh;aiss1ik?t rrj,= 0rrB;okoy;em;goh kl5m1n0vy;oc; 1&0w@;d1pus;eh,n+i,&d0;ips;uh;%flXe#Kutat;e1itrZl[&f l/w,ohr0uapur;aw;ikeze,seid-A;c1e0fj;potaz (iF*bum;eb,oC;duc dik,ff%,^akat,juy,m0n$y,*h`tFss+ o#tn(2;aws,ur;og-0uabmil ^ur;av;(o,god po8iwdT#lw+ kj;fo#$mhc%,?0uoeb]`iC;o<ai#gr0<kcid;iv;cKdH(,iFk%d,lCnAop,r6ssag] /&5t1yt0;og;ih<w2n0;.,o0;rb;ons;me;aepseka2eil1iat?v,om(kc0;_;om;^;%c s(in,giv] l)va,opac0; >;a1ep,totsi0;*;b $its)Wg#thgin ecn[olf;ffe,ss]es (iMtt0;@;l1o0;ow;ih;a1=y0;eb;&bil,tsue;abnFe)fgeFiD?9n4ooh #b3rof 0;=si1yrn0;eh;rrB;+;a0omm9;l0r-ya;abm1&~us &fe0;ik;it;gi1h#0;[;tn0;as;^6m0;ah;is;iveso/m $dobols,md-0;ur;fi>hk zCgag yd],^Bma8n3ro,s0yne,zr;(a<hc1i0;%;(;ayt3$h2od%_ oge1y0;hc;id;);at;bo kc%1l i]0;.;ab;ek;iw",
    "Adjective": "true\xA6:!1:#$%&()*+-./<=>?@[]^_`~:ni,re,ra,er,ne,et,no,os,ts,se,ps,el,or,la,ae,il,ro,on,ar,dn,na,lo;0:AQ;1:A1;2:9F;3:BM;4:9W;5:BJ;6:BH;7:89;8:7L;9:B3;A:AO;aBSbBQcB6d8Ee5Ef59g4Sh4Li4Kk4Il3Mm3Ln33o2Zp2Ur2Hs2Dt0Dutis 1w0Cxuaf,yB;a0Ab%en,d08lYnXoc,peeWrFsDtCweOzB;oow,t#N;f^c,ippu,liug,#op,s);a&g,_ah,)uc,kl8tBwoR;`,%;aKeHiah,oC/,rB;em,+;sEtB;a_5cCiBlus4uta7;bih1dua;afsitas,id^tn2;ivBElupm2(s;eCif,p8BtBwolf;aw,tij;hc;_GeFit$t,mEoh,rBs.cen;)@,oCtB;ib%,n2;*h,pm);i3o-N;rd;eg<,oces;ls,rc;am,r32;d#k,)al,ht*m,iad,kJlirf,mees,nHoh,rCthgiBur0;n,s0;aEeCobhgien,uB;oh,s;dBt%uq;le,[;ey,~hcs;amow,oegdumrB;uc;eew,%/;dum,ee/,lB`h;eiw0om;dy$ve,ko,wrA;en _^b,oleb;?b19c14e13fih.k5hg0Zi0Wluciff9nPoom,pNrKsFuBxen;oBpak; B-,v4;dBgnur7;ekcahw,l+;aDeC@upop,#aga,omBub=;!$ttu;dom,*h,wht1X;eBfd?7;!ht1Vrba;aw>7eB;#,p,voB;!c;a,eBirc.d*n,urba;da,#;aZeDiojC=f B;#,pu;n2s9;b,cT_RgOiLnI/0%pHsba,uCvB;l+1$f;lfEqBrgn2;eBole;rf63sB;b6n2;!fa;pa,sn^t;am$p,iB;mBt$p;e,mi,o3;ciffCdeB;bo,pxe;e,us fles;lud1#r7oc,rB;eBu;me,v9;epedBo/4;!#,$t1;&,.B;iuqca,[uB;lf;cR_uQgOhc(NiMlLmKnJpm^,rGtDvBzing2;<&B$sbo;!ri;cul&,luxe,r3LsB;iBn2;d,s&;biv,eCgaB]gi,$ba,tic>c&;lf,rf,v;buxe,~t;imod,+&;ada,[d;ahc*n,igiv;debo,f4;rt;av^txe,eB=%;le;ba,d&;av,ifingis54;c@Bf=p*n;li,pB;mi,xe;iBu=wr8D;ewCnr8Cr>,tB;pu,ria;$5Xt6M;&31iv+,l%cs,m0;aEeC@&4#B;cc6-9;f$pmi,jba,/mucric,rB;e,id1r34;r3Jt1xe;ffo,pu;?sr82d%wkcab,iDpeek r8uB;gob,o$gnB;ad;$(g i6t^g;aMeFiaf0oB;iCj5#m,odB;#,tuo;nuj,rB;ef1p;bm+,d0ehs,g?GhtFmr8n1pDs.l,tCvoB;!crA;awrAsi4Buo;=p0Wpu,uB;d 8As;egot,o;!m;<c l3M@imaf,pb6;eeEotDu B;dBt(p;ef,%h; pit,s*n;d #ks,lR;hCrtiv 1tcaf B;ed,+pi; gnBc5;ug;aPeJgiIiGoFrCwoB;d edispu,nk0rg1;eBobbu7;dom,htB-ew;[n,u+; to/,t`w;aBtu>fhgih,w #w;m,t$c;&8(b;dFesEhDko/0rrCtt=,vB;^c,e0;ab;sa;&of0nu;~g,oow;bruCi>0Fpda4sit%pBt@op=tem;!ib;!b6;a&-#5$t0Wuti#f# da;aRivQlOoohcs61ufB;eHitu?b,#aGpleh,tB;buod,eEhgBsiw;iCuB;oht;l4r;gr8rf;g,p;caFg(v,maE%c,su,tB;aCsaB;t,w;h,rg;hs;ep,rg;aBi7;!r6E;ic;bolg,e$hte,gNht<,iG#f,$t@,sFuDvCyB;=;an,ihcK;qe,su,tB;ca;$vi0sE;cEnDtB;i1(ulf1%pB;!mi;ol2;^,ifBurc;e(b,itB;%;<18uB;jn2rf;ciBo,sirb;$v5s32;bajnup,#m,[irp a;ct] pot,guo(,siEtB;?nCoB[n,u+;mm5;eb,rA;bb]s,fles,lBm?uqs,tuol;lBo8y7;eh;#Bums;cP_MhLk[w1FlJmHogG$bmul,tFwBylrAziteppa; tCoB;lbd#m,nk;fBhgir;<;aisuan,ce/4G(l48od,sixee3;&8*,ys?;ocBussa0;eb0h0F;?ppa0lB;appa,es-eb;ca& %f,tacs;a-CeB;c.Nnu,pmi;g*l;a(m,#v*c0;fo DooB;>,rpB;_u+,$htaC;llB%f;ew;cafd~b,d22ew,ga20h1Zid1k1Wl1Am15n0Wr0Qs0EtJuGvCzB;alba,*rb;a3IiBoba;cB>,ss&gga,tc^tta;$2uB;_2;dCqiB;nu,t`;!nu,r4T;aMeJiEuB;ca,l+C= (,tB;i-4sa;ba,&;d*c&,lE#fDrtCsiuqBtep,us (;xe;!n2;!ed18#;opmi;lCrB;cs9;+bo,pmG;bRc@4d ot pu,iQmiNnGrBuqeda13vi3;a/9eCi,opr2uB;cca11s(mm2;disnC(g4pBt@M;m),s4;oc1;iF#,oiC$t>,uB;tr8;ssapCtB;ceffa,[po3;!m2;d[Bm$ted1;bus1#;tBxo3;ig<Blu;!li;demLrp=ppa0N;<B=p&;ec;ebo,iJ>f,(Hotam2rEuB;fo3rB;-B;ba;a/,evB;da,id,rB;ep;mBt1;mi;cCwkcolcB;!$tnu2;e3n2;awa,bac5coidem,eFit(,oD%zib,uB;m4tamB;e3mi;cBm ];d%h;c00m,-ua;aIeGiDoCuB;mmiotua,yacip; * e*,d,>;lB#mP-i3;ak>,ffo,lB*,ucs5;a-yrc;csbo,rB;es;fo3muh,#,s1;as,&p6iB=hco*m;lb6tB; t0XgBir5;ib,nB;ol;aTbMgLiCoUpB;i1Lma;cIgaHhwF$7tBv;aCrBsoh;ef;~v,srB;ev;htrB-$;ow;!rf;od;#s;aBul+C;!bo3eeDtCu>vB;!#;];rCs&8;of;ga;csC.~B;hw;pu;aU@B;a,hsuB;rb;cuag,t@b;(BrA;);am FiB%g t`va,un;fDsB;eb,#,tB;uo; anDanD;emB;oh;ob;?1Ye01iR~QnLoJ%B;_a-b6eh0obGug fOwB;kE[fB; tBtB;hgi^7;-;wa; Ba,*,r1U;*;hsBog;p@s;ahCiBoyYut=o;hXlb;fC$B;d0vo;fo;c eci,s0t0;aHbFcalp,dEoCprBug`l;ot;`Btamuehr,v4;%p;(l/,r+;^,rB;om;lp,pCrB;fa;e3nu;c14d10g0Xh0Uirr0Wk0Sl0Lma0Kn0Hppat0r0Cs04tJudb6vHwEyolpme0zB;aCiB;ngocZ[htua0srA;rc;ollCylwB;en;ah;l+UolB$sU;eb;aOce0AecafiMiJnGpurrF%C.BupY;rEt0;ehtBhc0;hgB;@;)Z;aCeB;dec&p0>t,mucod0;r%w0w0;eBri/,uqJvV;cn2;oc;tlB;um;ba0ci-ihp+,g@GlDrutasnuylCuqitB;`;op;eCugB;&0;b,r0;bo;?GiEoCpBu0;al;lcBppo0;sid0;cmucric0v$pB;us0;c4s9;ed;^f1cDomaCusB;#0;(;as;#;ialCoihsafBw]V; d~;pxe0;f,n0;bV<>%p0lCttes0zziB;rg;aCiB;ks;c CpB;pa;+;anBceG;! kcub;cBsi#f0;tBuot0;am0;a <ddC<ivirprA(l>B;hc0;im;aj,icA(tta0%B;tBug0;&;ed0;ap -Cit]0`un;nu;af;hCrp.dB;iw;a,rB;evo;aidrTiCoh B;da;fiNlJ`G$(g,tB;cad9nB;aCehtB;ua;gig,rf;id;gC/B;ih;[;bDoB;bmys,hocB;>;up;ceDrrCt(iB;cs;),oh;/;ac;$p6;us;gFmi3rtDs$v ecCt(g5;am;iv;lu,xe;rp;em",
    "Pronoun": "true\xA6elle,h3i2me,she,th0us,we,you;e0ou;e,m,y;!l,t;e,im",
    "Preposition": "true\xA6:aZdWeTfSgnOhLlKmoJnFoDpCrAs7t1urNyb0zehc;!ereM;a4ceffe3pecxe,rap3s1uo0;!bVhI;di0gno0;ma; ni;!ht os;a0drPedisAiv a siv,nas,oporpa,sorca,usrev;! 0erehw;gnolKhcus;e0of;p,tfa;ota,u;/w,tn0;i,o;a7eewt2i1o0wod;!pu;!ht4;eb;hw ht2rf;itAlit;guor1t0;iw;ht;i1o0;la,ma;dnatshtiwton,r0;rab,ud;fo,o;cnis,kil1lohw a0tipsed; sa;nu;im1nuora,r0;awot;!a;cric,iv,uq",
    "SportsTeam": "true\xA6:!1:#$%&()*+-./<=>?@[]^_`~:na,al,no,ts,ra,et,er,ar,la,ro,ti,ni, s, e,c ,it,el, o,ap,lo,or,ne;$liv %&a,c1Xd)inu 1Qe1M%i1Iomanyd 1Hr1Fs6t5xos 3y0zzaj hatu;/?0x$ag $;eko&,ffidHre&e0sas#k g<t.ps;ci[,h1O;d* 19)ihw0;!]1J;aehVc^mi -*t%m;$-d cf,buc1Gc@14d10e0Kfeihc0Jg<k0Ik09l00m+=07nPoMpac)ihw revuoc#v,r7t2y0;a0obwoc0E;j>ulb7rF;e2_c=i_pGn0oirt^19;aig 0iasV;k0Uocsic#rf0O;ggunIjXkc` 14m0Sn0; nylko`b,.h )tol(hc;aDe2o0ups]i%t#0L;ir(w )a& ~d_g,tp+0;]t%.t;bmi9c^ 8d7e#ccub6g2ht#p a<_1i-vacNk0lee&0D<(m00ppil?5v` nrubkc$b,w*02z$b li+9;$3c^ yab ~*g;(c;dod1@D#r 0(h?0C;k(p=~euq,saxH;! 0;s[eg#=ol; yab ^mat;i+0OnuosS;a#id<;t d#lt.p;eb0Uugaj>lliv%skcaj;c%rb1r&a0;! 0M; revn3;a5ev+02i3o0us xi~ohp,w`b8;c-f Wil0&ip0; /`t0;ed;hp_d0ksd*07l(m0wtS; imaim;cilep3id1/t>essenn0x) 0E;);<0(ug0; d#lev[c;=#[. 0L;a3l0;ib]-ffub,ub 0;d*0o0E; kV;g~bYn0y`E;id(?0o@anV;aAs0;iuol 0;&;c2wah0; Caes0;>lttaes;abd%maid3i1u0;b>ekuawlim;nkJrevam0;=$-d;! a0;%zi(;]t~m+cBiv3; y/c=as#k;ek#yDiAkauqht(e>soj8l6rd^4t+ip3v0;+b 1_wrebm@0; ato00;atn01; hgrubst/p;! 0;ogeid2;gae Loi.0; *om@-b; n0;as;kco6l0;lihp0zzirg=ihpmem;! F;! k0;.y L;*2ipa1(ziw0; %tg<hsaw;r]d+oO; @an<c<c;[hta2lec0;! 0;%&ob; d#lkao;ednuht y/?amoh$ko,upstoh mahn)t0;ot;%&uoh;nu 1tu_v*0; d#lg~ 8;aihpled$i0;hp;k$ t-s -*,rif0;]0;gaci0;hc;at2cd,dleiffehs,[&ac1re&eh0;c#m;wen;n2o0;senn0;im;$ta;igam]d#l.,s w*c=ubmu0;_c",
    "Unit": "true\xA6a07b04cXdWexVfTgRhePinYjoule0BkMlJmDnan08oCp9quart0Bsq ft,t7volts,w6y2ze3\xB01\xB50;g,s;c,f,n;dVear1o0;ttR; 0s 0;old;att,b;erNon0;!ne02;ascals,e1i0;cXnt00;rcent,tJ;hms,unceY;/s,e4i0m\xB2,\xB2,\xB3;/h,cro2l0;e0liK;!\xB2;grLsR;gCtJ;it1u0;menQx;erPreP;b5elvins,ilo1m0notO;/h,ph,\xB2;!byGgrEmCs;ct0rtzL;aJogrC;allonJb0ig3rB;ps;a0emtEl oz,t4;hrenheit,radG;aby9;eci3m1;aratDe1m0oulombD;\xB2,\xB3;lsius,nti0;gr2lit1m0;et0;er8;am7;b1y0;te5;l,ps;c2tt0;os0;econd1;re0;!s",
    "Noun|Gerund": "true\xA6:!1:#$%&()*+-./<=>?@[:er,oc,ts,ae,us,il,ni,or,re,ra,rt,lc,ro,rd,cs,dn,ps;g*0;b3Rc3Md35f32g2Vh2Mk2Cl1Tm1On15+ez,p0Vr0Hs0AtBug.,v8w5xal#,y1zi0;la(iv,n0E;a2du%,evr(,fi%uj,l1r0t.p;c,=w;!lub;lp,rp,s;a>,eiv-tXo0;ns,r0;!.h;eirg,i1r0;ac,es;d,>,vr(;aQbuod,cJeHfGhgif,iFluLnBov,plu?,rAs5t0uohs;a3e2i0;nk,s0;!ybab;b,s;hc,m4;a1e0),+f;finam,t,v.h;c0t;!da+b,e0;=f;)f,op#;ahc2evFi1u0;h,$ca;ap,rp;!ne;aw,b,m),rw;arc,);e0gdub,k.m;m,rg;a3e2u0;@$,/0;sn$;ll$,[4rR;!r0;et2t0;b(,ta;bYc6d,e5g4itogen,ks,luvo,*?af,o3r1tidem,von0;*;!belec,e0$W%ulli;neg,po;b,c,lb;elTivan;!h,s;inumm$,ude;&5i3nec),o06r2s0;e0+c;c+p,lb,>;&h#,un;c-6n0t-vda;ag=;l,t;&Ce5i4o1utc0;afunXur%#;?,l0tinom;$,p0;xe;h,w;@5e4ff3htY[ihw,tac,v0;)C$0;!s0;id;o,(;hc,*gne,tnulov;#,ow;<,ws;ee7m6o4p0rub,yt;a1i0oO;hs,t;<,r0;!w;c,lev0;ed;ac,ud;k0ls;ec&p,koob;&HeCgis,i8n6o2.0way;e0w;l,y;@aba,it1<,ri,s0z;a#,i1;is0seuq;op;a0igeb,ur;lp,t;a0gami,m;l1/,t*0;am;pm$;dr3#Gpo,t0;=1s0;);hs;ag;<,m;a#3it,miws,o1r0(sa;af;c-0oz;vo;?,d;angHbbiGcycF@EeBgguAi9l6ooh5ruc,t3u2w0;a0oh;rc;deh2r;s#w,t0;ab;?;e1i0;f,k;[,ty=%,v3wd,y;as,f;j,rZ;d1ef,v0;a/;om;ah;!#;>;is;a8c6ih,lat,*5o3r0;ap,ow0;!t0;en;ms,o0;b,c;ht,>;a0ik,oK;b,/;b,tU;c4gual,s2t0;&0o<;rb;aw,i0;f,lbup;a1t0;aw,#Bib;et,o0;c,rppa;a3d2goj,n0;is,ol0;eb;ol,uj;!kc1ss0%;em;ap;fu1o+,r0;(;%;aEdew,iDlBn5o2r0;aob0$5;etaks,wons;c,lp1o0;lf;mi;a3e1if,o[0uf;#;![,te0;rp;l,rb,%0;-@u;i0oh;ub;lg,r,ug;e0/;nk,r;i,n0;a1ef,ivn0;$;d,n0;if;bu1m0;i0ob;<",
    "PhrasalVerb": "true\xA6!1:#$%&()*+-./<=>?@[]^_`~:up,in,do,e ,t ,k ,ba,aw,p ,ck,ar,l ,d ,n ,for,h ,r ,ut,sh,y ,ow ,nd;0:95;1:99;2:8K;3:8Y;4:8E;5:87;6:89;7:9B;8:93;9:8J;A:90;B:8U;C:91;D:8X;E:8V;F:85;G:74;H:9A;I:7L;a9Hb7Xc6Ud6Me6Kf5Ig4Zh4Airon0j45k3Yl3Cm2Zn2Wo2Up2Aquie(Fr1Vs0JtYuWvacuu6TwMyammerBzJ;ero Ei-KonJ;e0k0;by,ov9#;aPeLhKiJor45rit&81;mp0n3Dpe0r5s5;a.Aee<Ei0Q;aKiJn31;g@3Urd0;>E[J;%1$,o7L;i(7Ck5l)Krm 6As@Jt86v61;+3%1o7#;+3$,oD;rgeBsJ;&2herG;aZeXhUiQoPrLuJypO;.Gr>J;%1$,o7D#;aKiJot0_2Y;.l82-H;c)FdJ;&5Z;n7Z-3Cs5L;c)LdK&Jghte>6me0-o0Pre0;+3*4%1$,#;&I_2;by,oC;$)Kr`J;+3*4$,#;*4ov9#;aJ&7All65;m 2[5N;.Bk&Kl)J;ov9^it,u47;aJ*4%1$,leave,o4D#;*4ft9p/t,w3;a0Tc0Re0Kh0Gi0Dl07m06n05o04pZqu/5HtOuNwJ;e/LiJ;ngKtc@J;+3*4o8M; by;c33i6Em 2ss0;aQePiOoMrJud35;aigh2Cet79iJ;k&7Vng J;al72#;-Jrm2E;by,$,oC;c3Ln3L[2tc4P;-H;c3Jmp0n=KrJveA_2N;&F(2K;*4%1#;/3GeMiLlKrJurB;ead0$gBuc5;a4Ai(6L;c5l<o3C>2;a)He1Wll0;a3Bbe[2rt0un=like;a-5Z`Euggl5;as@6Roke0;ee-MiJ`6;cK-J;o6H#;&6Ck4D;$,oJ;ff,v9;de18g>4PnJ(6Kz5;gJkG; al6Ele0;aLoJu60;o(Jr5]0w 7P;+3*4?,oD;c2WdeGk6IveA;&Oll1Mn=Nrv5tJ; Jtl5N;%1foK$,o7#J;!on;ot,rth;+3*4%1$,o34#;oDto;al6Ao]0rJ;ap69ew 6M;ilAv5;aWeTiRoNuJ;b 62le0>Jstl5;aK*4%1$Jo2Ith4Ru5T;!to;c2Yr8w3;l<Lo(KpeAuJ;g3J~16;a2X?,o7;/8$,o7#;ng 6B-oJs5;ff,pen;aJelA$Gnt0;c6K=J;o4H#;c27t0;aYeXhase0iVlSoPrNsyc36uJ;l<Ln5O(J;aJ*4%1$,o51to4B#;p/t,w3;a3L%1$,o21to49#;attleBess JiMo-2;ah2Gon;iK-Jr53u1Gwe[6Q;%1$,o6Q#;nt0;aKuJ;gGm-6;c&u21_6G;c)Jg0l&4E>6p5F;o4P#;e<5QncilG;c57i[3Bn0ss LtK_J;*4oC; Fc2S;+3*4$,o4K;pJw52;e51(E;aKerd0oJ;dAt57;i<Frr`F;aSePiOoKuJ;ddl5l<I;c1FnkeyL-6]hAv&J;aJ%1$,o4P#;l4Rw3; with;ss0x 2;asur5e3WlKss J;a22#;(6;k&K>6rJs2Bx0;)6ryA;%,fun,oDsure,#;a01eUiPoKuJ;.0s(I;aMc4Jg LoJse0;)Jse4H;aft9*4%1?w3B$to,o0Zu4A;$,o3W;=6;&MghtLnKsJv&Z;te>H;&2)2; 2e4A;/8%1$;aL(KvelJ; oD;%1go,$,o7#;nGv&J;$,oJ;pJ];en;c5-2s@KtchBughA_J;%1o5C;$to,o7;eLic)Knoc)J;%1oD#;oD#;eK_J;$,#;<I-J;+3*4%1f04$,o39to,#;aLoKuJ;ic5mpG;ke3W(F;cJzz 2;)2N;a00eViSoOuJ;nKrrJs@6;_2;keK(J;/8%1;[F;lJneGrse3N;=J&2low0;*4dJfast,o0C#;e/,o1;d&K(J;*4on,#;+3o7;aJlp0;=L<I[J(2;fJof;rom;?,$,o03uW;cOm 2nK^0v&Jz2S;at,it,to;=Kg JkerO;%1$,o2W#;%1$,oJ;],v9;)2;aZeTiv&Rloss IoLrKunJ; ?;ab hold,$45`2X; Kof J;/8oC#;aLb1Oit,oKr8th1KuJ;~9;ff,n,v9;bo7ft9hPw3;+3bJ%1$,o25rise,#,w3;a4irth;/ 6ek0(J;aKb1H%1$,oJr8#;ff,n,],v9;cKhJl2Hr8t,w3;ead;ross;=aJng 2s 2;bo7;a0Ee07iXlToPrLuJ;c)Je2P;/8#;eKighte>JownB_2;+3oC;eJ^e29; 2z5;g 2lLo<Jr)I;aJwith;bo7r8;=6l`2;aKeJip0;^0;g 6ke0mJrJtte>F;&H;gQlOnMrKsJzzle0;@H;&Jm 2;+3*4#;d0isJ;@2;&J<1V;+3fP$,o7;htJure0; *4;eOnKsJ;s 2;cL=J;fJoC;or;&E;d05<2;cMl<Jrm0t1H;aKbJ%1$,o0A^ort,th09victim;a4eh$d;p/t;&J;%1oC#;a(Jdge0n=13y5;$,o7#;aPiOoNrJ;aLess 6oJuO;neB-J;+3b03$,oD;gBwB; Ile0ubl1B;&F^0;m 2;a09h04l01oNrKu(J;+3*4%1oD#;a.Bee-KoJy0;ss Ewd0;by,%1$,o0T#;m&MoKuntJ; o28;)6<J;%1oC;aQbP?N$,oMtJu0N;hKoJrue;geth9;rough;ff,],v9;th,wJ;/d;a4y;paJr8w3;rt;eaKos&J;$,oD#;>6[H;aMeKiJ;ll0pG;c)Ee[Jw H;on,#;(2;lQncel0rNsLtc@KveG; $;o1L#;@E(J;%ubt,oC;r_KvJ;&07;+3oL;<Jm F;aK*4%1oJ#;ff,n,];r8w3;a0Te0KiteAl0Eo03rPuJ;bblM.l04il0Cl)6~l04rKsJtL_HzzA;(Z;>0FsJ;(E;&I;ov9;anVeaTiKus@J;oC#;ghPng J;aM*4%1?L$,oKuJ;~9p;n,];th;bo7lJr8w3;ong;teJ;>2;)J;%1$,o7#;ch0;/Sg 6iQn5oOrMssLttlKunc&Jx E;+3*4;&6; /8;&F;%1;)E(2;&2;<6;%1#;=2;aNeed0oJurt0;c)Lw J;+3*4%1o7#;.;$,oD;.0nk0stA; oPaMef 2lt0n=J;%1ov9#;er;#;[K(J;%1$,oD#;%1o7;ff,nJ;to;c)Oil0nLrgKsJ;@E;a$B&E;g EkB; on;$,o7;+3%1$,oD#;ff,];ay;c(HdPir0s)LuctionA; oC;ff;/8o7;ouJ;~; o7;=J;%1oJ#;ff,n;wn;o7#;]",
    "ProperNoun": "true\xA6:anilatHdGeEgniDitsirClAn5o4s3weivriaf,xaja,y0;brik,el0ssim;bmew,ekr0seAtn0;eb;edecrem,in;cn3mle,rue;ediam nori,o0;sduh,t0;e1lra4nih,pm0;arf;eb,lr7;eir,l0;ewhtor,igcm;hc;dlaps,lr3;cnerolf,i0nwodsdnal;brab,suohlad;iba,oowrehs,rofsog;ac",
    "Person|Place": "true\xA6:a5ebok,n2o0rodavl6tnek,yendys;dnalro,g0;aitn4eid;adroj,i1ot0;limah,suoh;tsua,wrad;i1ram0;as;nigr1r0;dnaxela,otc0;iv",
    "LastName": "true\xA6!1:#$%&()*+-./<=>?@[]^_`~:er,an,ar,en,on,ch,in,is,ng,ri,ov,ll,as,el,na,ro,la,va,ta,al,ra,ne;0:BR;1:BF;2:B5;3:BH;4:AX;5:9Y;6:B6;7:BK;8:B0;9:AV;A:AL;B:8Q;C:8G;D:7K;E:BM;F:AH;aBDb9Zc8Wd88e81f7Kg6Wh64i60j5Lk4Vl4Dm39n2Wo2Op25qu+pe,r1Ls0Pt0Ev03wTxSyKzG;aIhGimm#m6A;aGou,u;-,o;kh%5ytsE;aKeun9BiHoGun;koyama,shida;!lG;diGmaz;.m,z;maG-;da,g52moto,sGzaC;aChi^;iao,u;aLeJiHoG.ght,u;jcik,lff,-;lGmm0nkl0sniewsC;kiB1liams33s3;bG+s,lt0;b,#,st0;age,gn0lHtG;$abe,s3;k0sh,tG;#s,(;aLeKiHoGukD;gt,lk5@by5;dH<_Gnogr3Kr1Css0]ldi;ba,obos;_,/4;l=Hs>8W;lJn dIrg=,sHzG;qu7;ilyEqu7siljE;& b6Aijk,yk;&zu>a,v#de;aPeix1VhKi2j8ka43oJrIsui,uG;om5UrG;c2n0un1;$,emb[y,yn+C;dorAMlstoy,m4rrAth;at)0i<,oG;mHrG;%e84[cius;ps3sG;&,(;hirDkah9M?ka,te,v%A;a06)01eYhUiRmOoMtIuHvGzabo;&9Jobod3N;%7bot4<iv2zuC;aIeHoG;ica,j4Ay$AB;>e,*2FpheBv&s25;l8rm0;kol5l/y5re7Tsa,to,uG;-,sa;iGyth;rn5tG;!h;l],mHnGrbu;at9c[ir,gh;moBo7M;aIeGimizu;hu,v)G;&ko,uk;[,rma;gu9*f>d,mGoh,pulveda,rr$o;jGyG;(5;evi6iltz,miH~id0@ed0uGw%z;b#t,lz;dHtG;!t,z;!t;%4Th8ito,ka4OlJnGr4saCto,und#s,v4;)7dHtGz;$a,e,os;b53#s;=,ihDm4Po0Y;aVeSiPoJuHyG;a6oo,u;bio,iz,sG;so,u;bK)a,d.gue67g#s,j=,mJosev>t,sItHux,wG;e,li6;%i,h;&b4Usi;$o,#o;#ts15i93;bei@,cHes,vGzzo;=,e9;ci,h%ds12;ag2es,iHut0yG;es,nolds;s,t0;dImHnGsmu97v6C;t$1;ir7os;ic,u;aUeOhMiJoHrGut8;=ad,ifti,o)azk27;l+hc2GpGrti72u10we<;e3A/51;cH#o,nG;=,to;=so,hl0;aGi<ips;k,m,n6I;a3Hde3Wet#s,?,rJtG;#sHr/Gt#s54;!a,ic;!&,(;eGic,kiBss3;i9`,tz,z;h86k,padopoulIrk0tHvG;ic,l4N;>,te39;os;bMc(nor,g2TlJ~i<,rHsbor~,weBzG;demir,turk;e<$a,tGwe<;ega,iz;iGof7Hs8I;vGynyk;ei9;aS.1;aPeNiJoGu~50ym2;rHvGwak;ak4Qik5otn66;odahl,r+;)olsZeHkolGls4Jx3;ic,/84;ls1miG;!n1;ils3mG;c/a,ec;gy,kaG`y2sh,v%@;jiGmu9shiG;ma;a07c04eZiWoMuHyeG;rs;lJnIrGssol*i;atGphy,`y;i,/4;oz,te58;d0l0;h2lOnNore,rHsGz%t;#,s;aKeJiIoz5r+HtG;e56(;!(;!n7K;au,i9no,tti;!lA;@e,tgom#y;*a,l0;c`cFhhail5kkeHlG;l0os64;ls1;hmeJiIjia,lHn3Krci0ssiGy#2N;!#;nyk,o;#,j0;dDti;c%tHlG;aughl8e2;hy;dQeda,gnu68i0j#us,kPmNnMrItHyG;#,r;ei,ic,su21thews;iHkDquA@qu8t*G;ez,s;$i,c,nG;!o;c*i,n;$i,mG;ad5;%5>a,*1;.g_,s1;aVeOiLoJuHyG;!n);k4nGo;d,gu;mb%Gpe3Fvr4we;di;!nGu,y$age;coln,dG;b21holm,st@m;bedEfeKhIitn0kaHn8rGw+;oy;!j;m11tG;*1(1;bvGvG;re;iGmmy,-,rs2Qu,voie,ws3;~,t1F;aZeYh2iWlU~z50oNrJuHv%2woG;k,n;c#Gm%68z~ts5;a,/a;aHem0+Gyeziu;h?,t3O;m0sniqi,us3KvG;)4O;bay57),rh0Usk16]Iw_Gzl5;czGsC;yk;cIlG;!cG&ko;huk;!ev4ic,s;e8uiveG;rt;eff0kGl4mu9nnun1;ucF;<0n~dy;hn,<Km*sC~,pIrHst`ti,to,ur,yGzl5;a,s0;j0Rls22;l2oG;or;oe;aP&Oha6im14oHuG;-,r4;e32hInHrge32u6vG;$D;es,ss3;$HnsG;&,(,t3;~sGs1R;&,s1;kiBn*gs,s1;cJkob4EnGrv0E;kDsG;&,sG;&0I(;ks3obs2A;b`himDglesi=,keda,l0Qnoue,(eIshikHto,v$oG;u,v54;awa;scu;aVeOiNj_^l8oIr+t50uG;!aGb0ghAynh;m2-;a6dz4fIjga%d,k,lHpUrGwe,xha;ak1G]t;mAt;#,fm3WmG;$n;ggiBt)cock;iJm*gway,nHrGss;n$d7re9;deG.ks1;rs3;kkiHnG;(1;[,n1;dz4g1lvoQmOns0ZqNrMsJuIwHyG;=Fes;kiB;g1-;$HhiG;moto;i,/0J;di6p0r+,t;ue;a[G;*1;rs1;aVeorgUheorghe,iSj(RoLrJuGw3;#rGnn%3Co,s^f3Cti#r7zm2;a,eG;@;ayli6e&e,g4iffithGub0;!s;lIme0UnHodGrba)E;e,m2;c_vAz_e0S;dGubE;bGs0E;#g;aj,i;bs3l,mGordaO;&7;iev3U;gnMlJmaIndFo,rGsFuthi0;cGdn0za;ia;ge;eaHlG;agh0i,o;no;e,(;aV#QiLj>dsted,lKoIrHuG;)s,&tAji^,<0;eem2iedm2;n^Grt8urni0wl0;?;emi6orA;lipIsHtzg#aG;ld;)0h0;/G;!ic;hatDn$IrG;%Gei9;a,i;deY;/4;b0rre<;dK*sJ.ksIsG]B;cob%,pGt`da;*oza,osiQ;&,s3;te8;#,+3w%G;ds;aXePiNjurhuMoKr+co<,uHvo`kG;!oT;%te,boHmitru,nn,rGt^;$d,ic;+;g2he0Om*gu7nErd1ItG;to;us;aGcki2Hmitr2Oss$ayake,x3;s,z; Jb?IlHmirGrv+Fvi,w2;!/4;gado,ic;th;bo0g@ot,jo6lHsilGv.A;];a cruz,e3uG;ca;hl,mcevsCnIt^,viG;dGes,s;/,s3;i>sGku[;!&;ki;a0Be06hRiobQl%kPoIrGunn*gham;awford,ivGuz;e<i;h1lKntJoIrGs^,x;byn,reG;a,ia;ke,p0;i,r#=;em2liB;ns;!e;$u;aOeMiu,oIr+tGu6we;eGiaG;ns1;i,-,p9uHwGy;!dH;dG-;huJ;!n,(Gu6;!g;kJnIpm2ttHudhGv7;ry;#jee,o14;!d,g;ma,`boG;rty;bJlik,-4rG;eghetHnG;a,y;ti;$,ot%i;c#Ald#3mpbeLrIstG]d*i;iG@;<o;doHl0Er,t0uG]lho;so;so,zo;<;a0Fe01hYiXlUoNrKuIyG;rLtyG;qi;)$2rG;ke,ns;$k5iem,oGy$t;oks,wG;~;gd$5nIruya,su,u)aHyKziG;c,n5;rd;d%Gik;&G;ko;/;aG(d_;nco,zG;ev4;$cFshw=;a08oGuiy2;umGwmG;ik;ckReth/1gu,ktPnNrG;gJ+InG;=coGds1;ni;ha;#,mG;$G;!n;gtGit7nP;ss3;=F;hi;#,hG;am;b4),ez,hRiley,kk0ldw8nMrIshHtAu0;es;ir;bInHtlGua;ett;es,i0;ieYosa;dGik;a9yoG;padhyG;ay;`;k,-;ic;bb=,cos^,d07g04kht%,lZnPrLsl2tJyG;aHd8;*;[;)+3kiG;ns3;aImst@6sl2;$;-;ujo,ya;dJg>HsaG;.;/G;!a;#sJ/,reG;aGjEws;ss1;&;&,(,s3;(;eksejEiyEmeiIvG;%7es;ez;da;ev;%wHuilG;%;_;ams,l0;#;^;=",
    "Ordinal": "true\xA6eBf7nin5s3t0zeroE;enDhir1we0;lfCn7;d,t3;e0ixt8;cond,vent7;et0th;e6ie7;i2o0;r0urt3;tie4;ft1rst;ight0lev1;e0h,ie1;en0;th",
    "Cardinal": "true\xA6bEeBf5mEnine7one,s4t0zero;en,h2rDw0;e0o;lve,n5;irt6ousands,ree;even2ix2;i3o0;r1ur0;!t2;ty;ft0ve;e2y;ight0lev1;!e0y;en;illions",
    "Multiple": "true\xA6:d5noilli0;b,m,r2t0;ni2p0x0;es;da0t;uq;erdnuh,nasuoht",
    "City": "true\xA6!1:#$%&()*+-./<=>?@[]^_`~:an,ra,la,en,al,ng,er,in,ha,ch,es,is,ar,ba,to,sa,sh,or,ta,ad,pe,hi;0:74;1:61;2:6G;3:6J;4:5S;a68b53c4Id48e44f3Wg3Hh39i31j2Wk2Fl23m1Mn1Co19p0Wq0Ur0Os05tRuQvLwDxiBy9z5;a7h5ibo,uri.;a5e5o)[0;)3H;greb,nzib=;#g2e5oko-ma,unfu;kat*+3Hrev0;a5n0Q;m&,n;=sBeAi6roclBu5;h0xi,zhou;c7n5;d5ni`g,t*th4;hoek,s];~^,klow;l63xf]d;aw;a8e6i5%divos?k,olgog$d;&3lnius;nice,r5;o3@ill/;l&cia,ncouv*,r3ughn;l# >?r,rumqi,tre.t;aFbil<i,eEheDiBo9r7u5;l@,n<,r5;+,ku;i5ondh62;/te,poli;kyo,msk,ron?,ulo5;n,uS;#5jua3l2Tm<oa$,$3;j+,[ui; -gue,ss(oniki;gucig(pa,hr0l aviv;briz,i6ll+n,mp*e,)5rtu,[k2R;i*,[0;#,.u1n0`i,yu0;aEeDh8kopje,owe?,t7u5;$5zhou;>ya,t;at& <55ockholm,$sbourg,uttg=t;#8e6i5;jiazhua1llo1m%,y0;f50n5;ya1zh&;g-i,?u;attle,oul,v44;c$m&?,+t ClBn5o paulo,pp]o,$jevo; 7aa,t5;a 5o domi)o;a3fe,m1M;#?nio,diego,fr#c<co,j5`dro,s(v_];o5u0;se;em,t %ke city,z25;lou<,`t*s24;a9e8i6o5;me,t59;ga,o5y_h;! de j#eiro;cife,ims,nn/,ykjavik;>t,ip4leigh,n.i,w(p+di;i)dao,u5;ez2i?;aFeEhDiCo9r7u6yo)5;ya1;eb%,ya1;a5e?ria;gue,?;rt5zn0; 5l#d,o;au pr+ce,elizabeth,@id;ls&,$eus,tts26;i%delp~a,nom p&h,o&ix;ki1^h tikva;dua,l*Ynaji,r<,t5;na,$s;ak44d/@,msk,r6s5t^wa;aka,lo;#,dos;a7ew5i)bo,ovosibirsk,yc; 5castle;del~,]le#s,^i`i;g8irobi,n5pl/,[v33v0;.6ji1t5;/,o1;a1o1;a6o5p4;ya;no,@ki;aEeCi9o6u5;m>i,ni.,scat;g_<hu,nt6s5;cow,ul;evideo,`lli*,re(;ami,l6nsk,s5;kolc,s<@uga;#,waukee;cca,d5lbourne,mph<,ndoza,ssi3;#,ell+,i3;cau,drAkass=,l9n8r5[-d;aca6ib5$k/h,se2L;];ibo,y;aus,.Fda%y,i%;mo;id;aDeAi8o6u5vSy2;#Mcknow,d~a3;n5s #gel/;d2g bea.;brev2Bege,ma5nz,sb2v*pool;!ssol; m#s,i5;c5pzig;/t*; p6g5h]e,n0Cus#ne;os;az,%^;aH-rFiC%i`Bo9$kow,u7y5;iv,o5;?;a% lump4n5;mi1[0;~ma,lka^,pavog4si5wlo2;ce;da;ev,n5rkuk;gst2s-5;@;k5?um;iv;bHdu3l%kuri.i,mpa%,n6ohsiu1$5unas,wagu.i;.i,j;d5o,p4;a-r,y;a7e6i5oh#n/V;l+,n0;ddah,rus(em;ip4k5;=^;>d0mph(,nArkutUs7^Xz5;mir,^pa%5;pa;fah0l6t#b5;ul;am2Zi2H;.e2d5;i#ap2M]e;aAe7o5yd*2W; .i mi5ms,nolulu;nh;f6ls+5$kli2;ki;ei;ifa,lifax,mCn5rb+,va3;g8nov*,oi;aFd#E&DhCiP%sgBo9$z,u5;a5j$t;d(6)5yaquil;zhou;aja$,u`;ld coast,th&5;burg;ow;&t;eva,oa;sk;lw7n5za;d~5g?k;nag=;ay;a<(29/,o8r6ukuya5;ma;#kfu5/no;rt;rt5[0; w]6(e5;za;th;d5+dhov&,l paso;+5mont2;bur5;gh;aBe8-ka,<p4o7r/d&,u5;b5/seld]f,nkirk,rb0[#be;ai,l+;-,)gu0rtmund;h$dSl6nv5troit;*;~;do)hIe6k=,l5mascus,r / @%am,ugavpiY;i0lU;gu,je2;aJebu,hAleve0Vo5$iova,uriti>;lo7n6p&-g&,r5;do>,k;akKst0V;gUm5;bo;aB&8i6o)qi1r<t.ur5;.;#g m7ca5t^go1;go;g6n5;ai;du,zho1;)5t?g$m;.8s-,zhou;gli=i,i9lga8may&Jn6` ?wn,r5t#O;acCdiff;b*$,c5;un;ry;ro;aWeNhKirmi)-m,oJr9u5;c-reTda`T&os air7r5s0tu0;g5@;as;/;a9<6usse5;ls;>6t5;ol;ne;sil8t<%7zzav5;il5;le;va;ia;goZst2;op6ub#/hw5;=;(;iCl9)8r5;g6l5n;+;&;(uru,-zi;fa6g$de,o h]izon5;te;st;ji1rut;ghd_,kFn9ot8r7s6y# n4;ur;el,$h;celo3i,r#quil%;ou;du1g6ja lu5;ka;(o6k5;ok;re;);*s5u;field;a05b02cc$,dd< a>>,g=^ZhmedXizawl,lSmPnHqa>,rEsBt7uck5;%5;nd;he7l5;#5;^;ns;h5unci2;dod,gab5;at;li5;)t2;on;a8c5kaOtw*p;ho$6o3;na;ge;h7p5;ol5;<;eim;a$vati,m0s5;t*d5;am; 7buqu*q6eppo,gi*s,ma5;ty;ue;>s$h ( q_im5mawsil ( j_id5;ah;ab5;_;%;>;$;idj0u d-5;bi;#;lbo6rh5;us;rg",
    "Region": "true\xA6:!1:#$%&()*+-./<=>?@[]^_`~:na,ra,at,ah,hc,ro,ar,al,ni,re,la,sa,ac,an,ss,oc,im,si,tn,is,en,rb;0:2U;a1Abajnup,c16d#0Ye0Ign0Eh08i04k00lZmXnPoKrHsBt6u5xe?4y1zurca8;&ca$k,d#m)n,e2kcu^ek,lic_,n1r^ev@;=sut,oxas;rrZs.j0H;e,us;d> l[%,ohziug,s#g;a$jug,e3i$y>,nom2u1;citc`n@,v>K;.v;hlys,sr1;emos,od;a3d2e^ei/c<uga,i1ole)m,ttesu(a?0;*eg <-m,o-lli;eel,#ld[;cet=az,p2s#k1xet;!$;ai(,iluam%;&ib,o2up1;gnOin0;d*b+ d# d#ld0Jg#les;&#r0c3da)l@,g2hadi,i1-d$bak,or a#t-uq,$te.uq,taujaV;ho,$^o;/dP#rud;ixemXs1ubm>.p;ab%,i/j;a3eme~,_n@]w,o1;el ove1ge),k5t0I;un;cao4gi4ht<jEijuf,nuh,t1u(_,we(tak<s;=2#lek,s1;egad,ot)kh<b,$t%;uy;([;a1ikk_;)z[,s<;agneb1Ie ir0;a3ciwsnu~Klof1rJ;f1)n;us;.p,wa$s;a3ep,h&sj2iaw&,mok,ppi?i1ruo1sotop ]ul #s,xg#ij;?[;*;hg-q,t/;a5$g]tt&(,sed*p 1;a3l&ca1rW;m1nu$;ih;rhd#,yhd0;dek,tu;a3[oyw,odg1;#1;ug;hap,nep;e?`net,(epF-0r3t%s kr1uq<b;oy1; w`;aw+Bihs1;=#l,d)f9egdi~Bk6m&g-5n4pm&3.tsec1ybrA;i1uolg;el;! w`;l@-l,otpma4;kcub,tton;ciwrH)y1;! 1;ht)n;f%s,t.h,xo;ed;m=;hk6l1;ag4d3s1yr0;i 1nee7;d$wde ec-rp,edohr;nuofw`;>;*1$hj;%tu;d not2ebe1;uq;g-hs1;aw;botin0c0Id0Ge0Fh]do,iSkQlNmLn9o8r6t3uhauhi(,v2woi,y1;+&gem,n(e(;ut;o1.bJ;kad9s`n1;[;a1on9th<$h0upirt;ec,p;g,/nU;a7i2luRozi1;$;lo$c2$t= %n1;as; ht1;rHu1;os;g#l4i3r2^Dyr1;&;ap;dE]uol;et;aba1ilYoh+ko;/;a1iuhaW;cx+t,r1;ek;%>rL<1;/,~Q;bmul@ h]tiMg)eg,hKkymlJlerJnCr9?7t2vodr1;om;ayr4e2@s av1rumdu,ukay;on;hsug1?o;-;ub;aka1ek.E;hk;a2bmuc,eb1;_;kl3v3;a4igriv3)fi/c1;! aj1;ab; tsew;ms2vlysnn1;ep;%;ak;ab,<vu1;(;~;gyda,mirc;av1i)lf;`;axao,c+0_r1;@;am",
    "Place": "true\xA6:!1:#$%&()*+-./<=>?@[]^_`~:ni,ra,ir,na,al,ah,rb,ne,or,ts,er,oc,ro,la,re,el,hc,en,il,ih,eb, e;0:46;1:4U;a4Ubxd,c4Td3Me2Uffulb stt<s,g2Qh2Gi2Ek24l1Um1In0Eo0Apeew+voh,r01sQtCuBwAx8y2zyy;auq=t,b6@4>ti @tt^,r2tnu<~g&=;rHub2;dus,hg_;d#l,gn2>vTma*,sn$b,xo;(,ib;gid,sm%g,t2H;a2hp,no*K;i,l;fd,gl,-$h;b^0[cip u[0;c%.id EeCf-chsa,lc,noAo9r5s2; C/c3i,ruh2;dnyl,+varg;e#p,ll_;op3u<2;#ga,sl$e;nov2w];ed;hs?d>,ogizut;mkao,rf2;ek(,r3P;/. 2k$mw];#0;g#ppohs,>ic&#f;aBd&l9e6g#.),kae*5ll3ma,notpm)2s]?v#;~ht;af3_ 2;tesnus,yl?v`; r24;d(g?ve,g&g,%fmud,k(0Em)t,r2w@;ca2oza; n1T;hg_,si #griv,wo2;daem,l;c%ema,l;ataab&(u,e2hl,ia l`,oomt$d,yda&;+[tik,t4v2;%~c+rw( t#as,od2;!&;aw$@c,exe,s2;acn3e[2;l<,#w,-,rB;a2od;!l;c3fs,hos,les~oks$st,r2tnot;=ma1urt;f,m,o#2;=;aZcYeWiRo8r7wot2ylk1N; dlo,a5dMe4n2pu;apaj,w2;od;g14ttol$1;/ok,#1;evl0iactip,ubk0I;dI+ht$p,t2y&c snwo*;aes,cGgnChg%b,kco*,lBnAp6r3s2tud;^>,ue;e2ub^);b>,v2;e,it;m2u;a2<;h2*;!t2L;^ge,uat;am,ob;(,i2;l2n+p,s+k;l2$d;im;a,ip;eew,g#2y-c;ba,tnuh;a4e.&w[su],l2;)k2m/k &zak;as;lp oz%$c,t%b2; ta/g;d2v)riaf;!yrd;b,i;cauhitoet,dag0eco 2tt)n0;ci2&id#;ficap,t2;c$2&lta;!t2;&;a4@$h,u2;essol<,l2;ut;h2ntup;g7k6lep,+2rud,s?vac,ta1w];d4t2;le1t2;ot;!ys;cIr0;%b,#2;kcub,ll`,tton,w;a9hp,l2oopk8ta,uk;a5ew4_2;d/,g#rps,n=2x`;ht;d>c,kco.;hxuav,w2;k2nr<;c(b;ham jE%omem nl<n2;^;c6ep,gc,kb,>wd$ob,o4r3s2uu1;$yonsark,tukR;aw],oy;o*woll2.ov;iw;iw3o2;r y]mi1.doow;r3s2;ek;aw,`;iepmop,ktapuw,$vadog,t_2;at;c7gi@yar,pleug,t2;`m(,r2;ep,o2;faJ+g3wtn2;ew;diV;iw3ru[t2;_w;loTn2=n,spi;e/g;dc,kh,n2;i3ok2;em;kOppe,?kcIs&l;arsSbQc&znPdJff^cd/,gEhpmo%t~d c$,koCl9n5p-ue,=mit>b,v-g 3ztgn2;ay;@p0r2;ad7;i4o.2;di0k2;ooG;es;ba.n3in,liv?tn2s^rW;ec;ud;o*?2*mE;hs;(liv y5d%2; ]3b2;do8eca7mPxu;ip;ag;is2&rg o%; 00a5do4k2rY;oo2$p;*;ow;@;ep;m<yw,un2;ad;ok;ae.pm),lZnNoowF=3u-Ev2;oh;!f2;d`,/DfaBgnAl8r7s6t3x2;e,o;a3r2;ad,eh;r7w;@ya,mle1tobba;),etXo;i,l`pm2;ac;(;.;@7g#4k3y2;eh;ao,$p;ll3r2;ps;<;gTp0;am;(9e2h,om[4; 4br2;ev2;%;ht3.2;ae,ew;r2u8;on;g+ w4hg3?dn2si~kCwol;us;_;];eif3owhtu2;os;ek6+4sn2;am,<a2;`;!e2;rg;aw;);ida%da,um;c%fa,e7i6#[od5r3uhac%i1zti +[i1;[;bm)2f;>;#;sa;kaukomua&hap5s2; d3?tt2;ab;/;ap",
    "Country": "true\xA6!1:#$%&()*+-./<=>?@[]^_`~:an,ar,in,er,ra,na,ma,al,ri,en,st,ba,el,ti,ca,te,or,ia,ne,ng,is,d ;0:38;1:2L;2:3B;a2Xb2Ec22d1Ye1Sf1Mg1Ch1Ai14j12k0Zl0Um0Gn05om2pZqat$,rXsKtCu7v5w+4yemTz3;a25im<bwe;es,l` #~futu);a3.ezu=a,iet)m;nuatu,>c# city;gTk6ni@~4ruXs3zbeE; 2Ca,sr;$ab emi(@s,k%gdom,/a@s3;! of am2Y;!(iV;a8haCim[ le/e,o7r%ida~5u3;n`0rk3v+u;ey,me2Zs #~?ic1V;#~t3t3;o<go;go,k=au,_a;iw2ji3nz2T;ki2V;aDcotl1eCi9lov8o6pa%,- l#ka,u5w3yr0;az3edAitz&l1;il1;d2r%ame;lomon1X*l0uth 3;afr2KkMsud2;ak0.0;&( leoFn3;gap[e,t *$t3;.;^gLrb0ych=lZ;%t 3moa,n m$%o,udi $ab0;h=e),luc0m$t%;epublic of ir0Eom2Euss0w3;#da;a4eIhilipp%Uit?irn1Mo3u&to -N;l1rtugF;ki2Dl4)*,pua ^w0V(3;gu7;au,e/i3;^;aBe9i7[3;folk1Ith4w3;ay; k3&n m$i#a1D;[ea;c$agua,g&3ue;!];p3th&1Aw ze+1;+;mib0u3;ru;a7exi6icro0Bo3y#m$;ldova,n3roc5zambA;a4gol0t3;.egro,s&(t;co;cAdagasc$,l7r5u-t4yot3;@;#0ius;sh+l0Xt%3;ique;a4div3i,ta;es;wi,ys0;ao,ed02;a6e5i3uxembourg;b3echt./e%,thu1G;&0ya;b#on,sotho;os,tv0;azakh1Fe4i-<>,o3uwait,yrgyz1F;rXsovo;=%g0Knya;a3&G;*16p2;c7nd6r4s3t+y,v[y coa/;le of m2(=;a3=1;n,q;],oJ;=1;aiTon3u_$y;du(s,g ko_;aB&m#y,h#a,ib(ltAre8u3;a6&n5%ea3y#a;! b`s3;au;sey;d=oupe,m,@*la;e3)da;ce,nl1;$;bUmb0;a7i6r3;#ce,.ch 3;gui#a,poly3;^s0;ji,nl1;lkl#dUroeU;a/ >m7cu6gypt,l s+v6_l1quato-+4-tr5/3thiop0;on0; gu%3;ea;ad3;[;.m$k,jibou5om%i?4r con3;go;!n C;>;aB.t(l af-c# Ah8o5roat0u4yprRzech3; 9];<,(?o;c4lo3m[Q_o b(zzaville,okG/a r04@ de ivoiL;mb0;osE;i3-/*sG;le,);republic;m3)Upe v&de,ym#A;bod0&o3;on;aGeDhut2o9r5u3;lg$0r3;k%a faso,*,undi;azil,i>sh 3u^i;virg%3; `3;l#ds;liv0)i5sn] #~h&zegoviHtswaHuvet3; `l1;#d;re;l3n8rmuG;$3gium,ize;us;h4_ladesh,r<d3;os;am4(3;%;as;fghaGlDmBn6r4u/r3z&<ij2;+0];g.>3m.0u<;);d[(,g5t3;$ct7igua #~b$bu3;da;o3uil3;la;&3;i?;b3g&0;#0;];ni3;/2;#",
    "FirstName": "true\xA6:aRdys,eJfiel,holiIiHlGnBo9rialb,s6timus,y0;aHb4crad,dissac,e0rrSttU;r2s0;a0lQ;c,k;bua,dS;ag,leC;dOi0ok3;o0rk,xeI;cnarf,la;c0k0lrL;in;a1eirda,niuq,o0wahsal;irIv1;g1rik,v0;ed;er,rom;em,ladnC;ak,dFexe8ttDva;hs;duj,i3l2mi1n0;er,neye4;aj,x9;eirbag,hukolem;f2j,lra1m0ssej;aj,maj;hc;la;cul,e4ian3nim,r2t0yli;anih,tayn0;ek;d2ika;am;hs,rd0;na",
    "WeekDay": "true\xA6fri2mon2s1t0wednesd3;hurs1ues1;aturd1und1;!d0;ay0;!s",
    "Month": "true\xA6dec0february,july,nov0octo1sept0;em0;ber",
    "Date": "true\xA6ago,on4som4t1week0yesterd5; end,ends;mr1o0;d2morrow;!w;ed0;ay",
    "Duration": "true\xA6centurAd8fortnight9h7m5q4se3w1y0;ear8r8;eek0k7;!end,s;ason,c5;tr,uarter;i0onth3;llisecond2nute2;our1r1;ay0ecade0;!s;ies,y",
    "FemaleName": "true\xA6!1:#$%&()*+-./<=>?@[]^_`~:an,el,na,in,en,ri,ie,is,le,da,et,ma,ya,ra,on,la,sa,ia,er,ne,yn,ey;0:J7;1:JB;2:IJ;3:IK;4:J1;5:IO;6:JS;7:JO;8:HB;9:JK;A:H4;B:I2;C:IT;D:JH;E:IX;F:BA;G:I4;aGTbFLcDRdD0eBMfB4gADh9Ti9Gj8Dk7Cl5Wm48n3Lo3Hp33qu32r29s15t0Eu0Cv02wVxiTyOzH;aLeI&eb,oHsof3;e3Sf3@,>;h2iKlI%,`H;ab,ep;.,<;.,h2iH>;%b;aKeJ&g,olB7uIvH;/8?DP;i0%;-0s(3;$,gmur,n,r&,s8W;aoHme0nyi;mei,y#;aM(dDZhiDGiH;d$e9lJnH;if48niHo0;e,f47;a,h$mi0lH<;a,ow;ka0nB;aNeKiHu[5;ck84kIl8o-AviH;#F(J4;ky,to)BK;.,l<,rHs0;a,nH?ica;a,ice;-H_sH9;nILrH;i1y;g9rHs6xue;su5te;aYeUhRiNoLrIuHy2;i,@;acJ3iHudy;c3%,sH;hFta;nHr0F;iF=;aJff#y,nHs6;a,gtiH;ng;!nFS>;aIeHo<si0;a,l<,o8Ares1;l3ndolw/hu;g#,o88rIssH;!a,*;eHi,)7;[,za;bOlMmKnIrHs6t]0wa0;a60`;iH=;a,ka,s6;arFe2iHm77>;!ka;a,iH;a,t6;at6it6;a0Ecar-tt,e0AhWiSkye,_za0oQ),tNuIyH;bil,lvi1;ha,<=h,niAsIzH;#3N/8*,y;#Hi7;!a,e,nH;aCe;aIeH;f#4l5Dph#6E;cI5r5;b3fiAAm0LnHphi1;d2],ja,=;^2lJm?1nIobh#,tH;a,i;dy;l&,v3;aMeIirHo0)sti,y5;a,lDM;ba,e0i5lJrH;iHr6Jyl;!d#,fa;],lDZ;hd,iMki2nJrIu0w0yH;@,<,%;i,-9?,r?,`;aI.,],nH?;a,?;!=;k6mH;!aa;lJrItayesh,vH;.,&j;e0ife;(1i0<;#vi,bLd5Ohar,iBkKlJmInd2rHs6v#%C;aCi0;#t6i2;lDO<,ome;ee0&eh,u2;&1)0;a05eZhXiUoHuthDM;bScRghQl8LnPsJwIxH;#B3*,y;#,e0;aIeH*,lD;#n7ll1<rDGtA;!lHnn1;iH`;e,nH;a,dF;.,i,%;ayyeh;h$67io;b&,^A`;a,cIkH<s,nFta,=;ki,o;h8Xki;ea,i#n?,oH;.,n1P;#0bJemFgi0iInHta,y0;a8Bee;h#eh,%;a,eH;cHkaC;a,ca;bi0chIe,i0mo0nHqu$,y0;di,];a$,$HiB;!e,-;e(4]0;aPeOhMiLoJrHute);iHud(ce;scil3L=mvaB;lHrt3;i0ly;a,paluk;ilome0oebe,ylH;+,l+;ggy,n$ope,r5t2;ige,m0VnKo5rvati,tIulH;a,/8&1;)cHt4T;a,e,];do2i07;ctav3dIfD3+6k[0lHphD3umou,yunbi-g;a,ga,iv3;eHval;l3t8;aWeUiMoIurHy5;!ay,ul;a,eJor,rIuH;f,r;aCeE<;ll1mi;aNcLha)ka,kK@J%,sHta,vi;#Hha;ur;!y;a,iDZki;hoGk9YolH;a,e4P;!mh;hir,lH%,)s[,sreE;!a,+a,lBV;asuMdLh3i<,l5nKomi7rges,tH;aHhal4;lHs6;i1=;cy,/8;e9iF0=;nnguaq;a0Ack(z4e02iMoJ)g%y#i,u)$,yH;a,rH;a,iOlN%,tG;bi0i2llBJnH;a,iH;ca,ka,que;a,cUdo),kaTlOmi,nMrItzi,yH;ar;aJiIlH;#de;am;!l,nB;dy,eHh,n4;nhGrva;aKdJe0ica,lH;iHy;c(t,e;red;!gros;!e5;ae5hH;ae5$3Z;ag#,gNi,lKrH;edith,iIjem,?,yH;em,l;em,s[;#4iHl+a;nHsCJ;a,.;!#,h#;b09cASd07e,g05ha,i04ja,l02n00rLsoumeh,tKuIv+,xBKyHz4;b$l,>,soun;d7rH;a,eE;h8Gild1t4;a,cUgQiKjor4l7Un4s6tJwa,yH;!aHb/h,ja9lou;m,nBL;a,ha,&1;!aJb$,eIja,lD%,sHtza;!a,ol,[;!l1D;!h,mInH;!a,e,n1;!awit,i;arJeI*,oHr48ue)8;!t;!ry;/46i3B;$4Xi7Cy;dH?,ue5;akr#Ay;ak,(,iHlory;a,ka,nB;a,re,s4te;.Hg4;!l3E;alDd4$Hge,+?,?0;ei9&1`;$,-;a0Ne0CiXoQuLyH;d3@,nH;!a,dIe2OnHs~;!a,e2N;a,s~;#n,cJ$0P+1lI%,pHz;e,iA;a,u,wa;iHy;a0Se,ja,l2NnB;+,l1UrItt1LuHv$4;$5+1;aKeIi7%,rH;aADi7;lHn1tA;ei;!&1;aTbb9HdSepa,lNnKsJvIzH;!a,b/h,/8z4;!];a,/8;!a,dH;a,sHy;ay,~,i,y;a,iJja,lH;iHy;aA8e;!aH;!nF;],=;!nH;!a,_;aP.,e0iNjY@,nMoKsJtHx93y5;iHt4;c3t3;edi,lCO;@,nH>;a,*,o2;a,or1;a,gh,@H;!ni;!h,nH;a,d2e,n5V;cOd?9DiNkes6mija,%,rMtJurIvHxmi,y5;^n1&3;a,e5A*,`;as6iIoH;n=,=;fa,s6;a,+A9;a,@;~,*,y;a04eZhXiO-a,oNrJyH;lH>;a,ee,*;+tHy6I;a,(,iIyH;!%;!e,n5F;nul,),urt_y;aO^N-y,mJrHzzy;a,stH;(,&;!b^lIm^nH;aq;eHi,y;e,y;a,stE;!%,>;aHei2?gordzol;dij1w5;$7UiKjsi,lJnIrH;a,i,);d2%,za;~,i,lBLs4y;>,s6;biAc~,d]tou,ede,iSlQmPn=ku<),rNss6NtKviAyH;!e,lH;a,eH;e,igh;!a6HeIhHi4TlD)0y;ar8H^8H*,-ErBAy;!l`8O)0;a,(,iHl5Xoli0`;!<,nFs[;a5il1;eigh,i,lH;e,*;a,tl6O;a0AeZiWoOuH;#MdLlHst88;es,iH;a8NeHs[;!n9tH;!a,te;e5Mith,y;a,iA;!#Nc$DdM$Gh#7V-Lni,sIva0yH;a,ce;eH*;fHlDph7Y;a,&1;(,n1;i7y;!a,e,n45;lHng;!i#,lH;!i#;#N-0nKrJsH;ica,sH;!e,ica;i,);!a,$Gif^,nH;a,/8iHy;!e,f^;a,eJiInH;a,eIiH;e,n1;!t8;cM.,mi,nIque4Ysm&Fv*2y9zH;m&7;a7eIiH;ce,e,n1s;!lHs[,t0F;e,-;&Ik6HlDqu$H;&1`;.,ta;.,lRmPnOo0rNsIvaHwo0zaro;!a0lu,%;aJiI@Hob$;!nde;do2;b$Hdo2;!a,e,l3B;ati,(1i0<;di2es,g)d,ji;a9$BogH;(1;a,e9iHo0se;a0%;aSeOiJoHus[,=c&th;.,ll4rt(se,snH;a,i=;lI<H;);aIdH@I;a,egard;ry;ath^,iJlIn)/Armi9sH;[,t^;(2Uga,mi;di;biba,i-y,lNnMrJsItHwa,y-y;ice,t4;%a,ti;iHm?y,)53;/H;!te;aC%C;a,~,l4;a02eWiRlPoNrKunJwH;(H`/h;!dolD;ay,$;ac*I/H+$B;a,chE;!@;ld1CogooH;sh;adys,(Hor3`+;a,.,%;aKgi,lI%,ov8Es$Hta;a,e,-;.,liH;#;!n0;mLnJorgIrH;ald5Si,m3Etrud7;/8i4X;a,eH%;s+,v*ve;<;bI-,mHrn/,yG;a@t,i5;iI)$H;a,l1;!ja;aTeQiPlorOoz3rH;#JeIiH;.,eB;.,ja;!cH;esIiHo+e;n1sca;!ca;a,(c3;(,o0;lIn0rnH;#B;ec3ic3;jr,nArKtHy7;emIiH<,ou<A;ha,<,n;eh;ah,iB>h,za0;cr&,d0Revi,i0Pk0Ol07mXnid,rUsOtNuMvHwa;aK$IiH;!e,ta;&F`;!a;!ng$4V;g(i1nice;h$,i(9ta;mLp^#KtH;eIhHr$5;^;l31r7;za;a,e>lB;iH<,_4L`;cHka,n;a,ka;aPeNiKmH;aHe21*,y;!li9nuH;$G;lHn1;e7iHy;a,e,ja;lH>ld;.,y;!nue5;aWeUiNlM<,no2oKsJvH;a,iH;%,>;a,*;iHuiH;se;a,(,*,y;a0c3.,e,f,nMsJzaH;!b/HveA;e,h;aHe,ka;!beH;th;!a,or;#or,nH;!a,i;!&1%;ate1Rta;-Es6;vi;eIiH%,wi0;e,th;l,n;aYeMh3iLj(eKoH;lores,m&ique,n3FrHtt4;a,eE+,@,othHthy;ea,y;ba;#09%C?9=;#QbPde,eOiMlJm/r3nHsiree;a,iH;ce,se;a,iI@,orHphi9;es,+;a,@h;dHrdH;re;!dee,%;!b2Fo>C>C;a,d2nH;!a,e;hl3i0@l,mNnLphn1rIvi1WyH;-,%;a,by,cI],lH;a,(1;~,*;a,/8iH;!ca,$1Aka,z;arH];+;a0Re0Nh04i02lUoJ)stI`H;di,th3;al,i0;lPnMrIurH;tn1D;aJd2OiHn2O)9;!nH;a,e,n1;!l4;cepci?,n4sH;t#Hu$o;ce,za;eH-E;(,t8;aJeoIotH;ilde;!pat2;ir7rJudH;/8iH;a,_;a,e,iH;ce,sZ;a2^2ndH;i,y;aReNloe,rH;+JyH;stH;al;sy,tH;a1S(,iHy;#1e,n1;deJlseIrH;!i7yl;a,y;li9;nMrH;+KlImH;ai9;a,eHot8;n1t8;![;d2$GtH;al,$G;cIlH;es8i47;$3ilH;e,],y;itlYlXmilWndVrMsKtHy5;aIeIhH)0;^1I-ErDy;)0;a38sH;a37*;a,iOlLmeJolIrH;*,ol;!e,&1`;lHn;!a,@;a,eI*,otHy;a,ta;_,y;%,s[;ace,ice;a,e,l1;+Al4;&,`;a0Ke02iZlXoUrH;#di7eRiJoIyH;#0nn;nwDoke;#3HdgMgiLtH;_y,tH;!aInH;~,i,y;ny;d,t8;/H;!t7;#0e,nH;.,%;bbi7g@rIlo07nH;iAn4;ka;#cHythe;a,he;#ca,lja0nHs<h;iAtH;ou;aWcVl&UniArPssOtJu@CvH;!^lH;~,y;hJsy,tH;e,iHy7;e,%;!#H;*,y;!*;nItHyl;ha,*;adIiH;ce;/8i9;ay,.;ca,ky;!t)H;ce,z;rbJ=H;rmH;aa;a2o2>;a2Ub2Od25g21i1Sj5l18m0Zn0Boi,r06sWtVuPvOwa,yIzH;>,u0;aKes6gJlIn,seH;!l;&;un;!nH;a,%;a,i2K;drLguJrIsteH;ja;$3;stH;&1;a,~,i,y;aahua,he0;hIi=,ja,miAsil,trH;id;aMlI>qHt?;at;eIi7yH;!n;e,iHy;gh;!nH;ti;iJ-Io6piA;ta;(,n1t8;aH$G;!n1J;a01dje5eZgViTjRnKohito,toH=;&/8nH;$5];te;!aKeIiHmJ;e,ka;!mHtt7;ar4;!b$IliHmU;[;!l1;a,$iH;ca;ka,sHta;a,[;$H*;a,iH;a,ca,n1qH;ue;!tH;a,te;!bImHstasiM=;ar3;$;aLb^K$iJiHy;e,l3%H;!ta;a,ja;!ly;hGiIl3nB;.;a,>;-;aWba,ePiMlKthJyH;a,c3sH;a,?,[;ea;iHys?;e,s?;a,cIn1sHza;a,e,ha,?,[;e,],ja;c3+6jaKk[K%,sJxH;aH];!nd2;],[H;nd2;>;];i0nIyH;ah,%;a,+,%Coud;@;c6.,-EmNnLsH;haClH;&HyY;g,n;!h;a,o,slH;~;ee;(;at6g4nIusH;ti0;es;*;aWdiT$MrH;eJiH;#M(H;a,e,_;#0;%;!aLeKiIyH;nn;a,n1;a,e;!_;!iH;de;e,lDsH;?;`;!lH;i9`;_;aKbIiHrL;!e,gaK;~,i7y;!e;gaH;il;dKliyJ>dhIs6;ha;=;ah;a,=",
    "Honorific": "true\xA6!1:#:lieutenant;director4fi2#4rear1se0third3vice1;cond2rgeant major; admir3;eld marsh2rst0; #; gener0;al",
    "Adj|Gerund": "true\xA6:!1:#$%&()*+-./<=>?@:er,ts,ra,uo,ir,ar,it,xe,la,ps,ed,re,lf,us,im,ob;0:38;1:2Z;2:3C;3:3G;gni4;b3Fc3Bd2Mg2Eh28k22l1Pm1Jn1Bogt&,p19r0Vs0LtRuQvKwoJxHy8z4;ama,e#f,i4;g<2-4noga,<msem;rom0t4;iv#,nat;aBf6l5nap0Donna,r4zz3;av,t;l),t&;i4s*as;r5t4;)g,sym;r4tcele;et,oh;c0p;at,e4;lp<p,v;!=,rg;a8i7lov#,o6r4;a$,e4;nnu,s0;l,m;ec0l,rht;r,sefil;g(tXniCs2;aKcIeHfiGhgil0iFlEnDpmet,roCs6t4ub(B;es4if,uc;ffo,pu;a7#6i5u4;ah+,gs3rt;wt,+;!etQ%;l,r4;tn1;fm1pp>;ess3ioppas3uad;em,>L;c+,vK;lpu,rd;kcoryks,pm1v(;a4i=n1;r2D+;cixotFdCg*?,iBlumi$,nAoZr7t5v*4;om,pac;i4sav0;lib0rri;alih+,e5g,o4$urf;givAprocA;le8.a+;evuj#,?ulli;l?uh,ruf7;?*6om4;mo4;cca;ni;a#cCiAo8s5u4;fn1ma;)%bme,#4?;p4$3;!/;lc,p4;mi,po;-tiv#,morp4rpr>,urb;!m1;/,ni;aFe9i6@,ri$,u4;d2l-,ssaKt4;am,run;.4t;a,n4;i,oc;d7gga$,tta6wo4;=,p4;me,r14;=;liweb,na4;em;c,d,/2lg,o4;r,s;eews,ols,p4;alr0X(g;aeAe6gi#,i4nuV<cn1;am#,f/4hs,lc0;!#;dda6t4vil2;a#Ihgi4%ehs3;rf;m,s;l,m0;a7l6o5%4;hc,-,s3wt%eh;cV@;ac,ehwr0L;e4=;lg,$;aeFbCeuLfBgg@,iAk%.,l5pp(c,t4w).,zzZ;%Gsub,tesnu;)ht2e7i5or4;!tn1;fluf,hc,r4w;ht;pm1t,uFws;av#p,ms,@;fab,i6;a2m4&5;),e4um;rt;h,ppa,vP;a6c5(4ovorp;$;al,ohs;#bdn&5os,thtae4;rb;rg;c6s4toos;ad,#fHin4ur;otKup;a,e#cs,(2%rWt4&t;ef,iw4;eb;a8gal,n6r4;e4>;me;a4el-4ulp;hc;g2m5r4;!&c2;ad;aQdPeM(rLlJn6o5%w4;#;b#of,lpE;aBe9i7o.#r1&4;f,rr5t4;sa;>;b4lb;!lleF;f4m,p;fo;m6p5$t4;&;+;/,m1;oc;eiy,of4;nu;evo;ce5e4;.;rp;ub;el,f,rg0;/;*2n4<ip;etnes,u4;@;ne;m7r4;osba,u4;$3;id;un",
    "Comparable": "true\xA6:!1:#$%&()*+-./<=>?@[]:rg,ae,ir,ar,ol,ra,os,ee,il,er,ts,us,oo,ah,as,iw,lb,uo;0:3O;b3Ucitnamor,d3Ae24f22g1Zh1Uk1Pl1Am18n12p0Zr0Usso#,t0Hw0Dy1;a0Bc09d02e01f=g,hs,kcul,lKmInEpp>,rBs8t3v2xes,z1;oc,t%,zid;$h,=#,v?;aMf4iurf,l3nacs,r1sriht;$h,i1;d,lf;?,uaf;eh,(;$,e0Sion,o2u1;b,(;n,r;a2dwat,+l,gn1@,ruf,w;a,uh;cs,ew,w;az,i2n1ohp,up;iks,uf;&,h1t;s,w;aof,-s,=1;lg,r;bbin,dGeDgu,htr$,iCkciBl8nev$h,r6s4t1w(;hg%ps,ni?,s1;>g,o1;c,hg;!a1i#;em;$,u1;b,c;ems,i1oj;h1s;!c;rp,s;o,w;k-,m2n(,ta0v1;-,(;it,oh;$d,duc,ne%f,)woc;c%p,gac,#;a5dig,+#,it,n4=3r2u1wab;ag,oS;>,en,u0;[,m;.t,@;e1hs;h,/;i1n]b;!ps,uj;g,#;&,en,(1;!l1;aYe1;m,y;aBc%0e8f7hgi6n2oh,)Xs1;av,iom;a1egell0Sia7;drev,i2ng.p,s$lp,tis1;eh;g,ll%b;&0ls,rb,t;i3*;e2i1;uq;ws;e1lf;n,#;a4e1=p;dne2ppad,ttib,ve1;lc;ls;e1Xf,gluv;a2+1m-,)EsiI;d,/;ehc;e4ia3mel*,o2re/1uf;!$;mmoc,*;lp,v;dd<,e1;k,#;i1odn&;ls,#;a8eu7i5l1;a3i1uf;!r1;hs;ms,t;aHl,uqna1ve;rt;rc;.6i2mro1yW;f,n;c2tn1;a/b<,esse;e1ifrep<,nanif,*;ps;!r<;$w,c3+2n1)0;ip,urd;ls,m;a[,i1;ht,s,uq;g3s1;&b,e1rX;rf;ih,]1;r,t;ib,n1;o1]y;l,r0;aDf1;i0ub;c02d01f?,gY%+,lQmKnHpGrCs8t2u1vian;gav,[,rt;a4i2om.,u1;c,m;hw,l1;op;idemr1l,mit8;et7;@,n3o2)1;oc;(;ed;&,ev3id,*,u1;ces1p;ni;es;%;adnum,i1;unBv1;id;a5.txe,*1;dn3e1;u1wa;#;>;l,t;a0b6p5t1;b3n2t1;-;eg;<;mis,rup;+f,m1on;in,uh;n&1)l,uh;o,/;?;@,ur;in,r1;a2e1;if;cs;aIdo,eGiCl9n5r3]2w1;el;l,rp;>,i1<ba;ew;a3ik,o2]fo1;rp;f,[;[,#;ab,i2o1;!b;m,w;l3muh,p1;&,u0;/;*;gg1kc@,r;&;b,ed,lg,m,o1s;rb;-g,mu1;d,n",
    "Adverb": "true\xA6:!1:#$%&()*+:ni, t,na,ro,lle,la,ra,ht;a0Nd0IeYfo Vg#Thcus,i&iretsopSk%lb$#op,(w,mRnOoMport ed,rGsEt8wo7y0;aw5daer),l0rev;dloc,et3l1mod%r,no0tcerid,wen;!$R;a0uf;er,tot;amitlu,i#fY;a,yZ;h7nD;ah3hgirtuo,ib y#t,olJ*pa,s1u0;b3oba$suj;ae00eb$a,om0&w$a,uj;$a,);t0w2; l);emit0%em on6pahM&od#,u+,yawZ;emG;af4e0;gnol C+2v0;e0oe&m;!&f;ar,egotTrM; yb;ot,s0t A;!);e1iaga0oos sa;! I;+,t9;aesuan da,odles; a;d%ts+iw$0kcD;on;sd*w1tr0;os;pu;byam,cGdisEg*ClAr3s0tiuq; 1iwekil,ruoc 0sam ne;fo;rep;om2u0;j 0sF;ed;! 2re+r1y0;%;uf;ecno;ihw0pmaxe9;a,%em;l 0;ta;a,gno0;);iwt,n0;e0o;h,(cxe *p;a2eed3oog0*wkcab; r0;of;ets0orba;#;d#k,(h",
    "Conjunction": "true\xA6:dna,eSfiOgnisoppus,hLlit,neHoEr9s5t3wo2y1z0;oc,uc;bePlnoI;h,n;aht 0ey,on ro,sliSub;dedivorp,rBwS;a 0oc,ulp;hcum sa1noos0raf0tsuj; sa;! L;e1o0;!n;ht1ttam Lve0;neJoJreJwoh;eIie;ht,t0;! r0;edro D;h0ve;t1w 0;fi,wD; fi;cumsa8guoht0;! 0la;n2sa;! 0;e1n0sa;eve;re4;cnis w4li3mit eht yb,rofe2s0;ac 0iwrehto,uaceb;ni;b,reht;hw;on",
    "Currency": "true\xA6$,aud,bQcOdJeurIfHgbp,hkd,iGjpy,kElDp8r7s3usd,x2y1z0\xA2,\xA3,\xA5,\u0434\u0435\u043D,\u043B\u0432,\u0440\u0443\u0431,\u0E3F,\u20A1,\u20A8,\u20AC,\u20AD,\uFDFC;lotyQ\u0142;en,uanP;af,of;h0t5;e0il5;k0q0;elK;oubleJp,upeeJ;e2ound st0;er0;lingG;n0soF;ceEnies;empi7i7;n,r0wanzaCyatC;!onaBw;ls,nr;ori7ranc9;!os;en3i2kk,o0;b0ll2;ra5;me4n0rham4;ar3;e0ny;nt1;aht,itcoin0;!s",
    "Determiner": "true\xA6aBboth,d9e6few,le5mu8neiDplenty,s4th2various,wh0;at0ich0;evC;a0e4is,ose;!t;everal,ome;!ast,s;a1l0very;!se;ch;e0u;!s;!n0;!o0y;th0;er",
    "Adj|Present": "true\xA6:dnuor,eSgnRhtooms,kcQlPmNnKpmad,rIsserpHt4wo2y0;a0cnaf,daer,rd,tpme;l,rts;l0rran;loh,s;ceAew,hg8i7n5p2r1sa0;f,l;ela,ohs;m1ur0;knab,rR;e7orp;e0iaf,ulb;seZtnO;ciKefretnuN;i0uD;la,r;frep,lLpsus,r0;id,rJ;xe;aeMe0uos;dnMttu,wol;ae0epo,iht,wo;l0m;!c;id,lac,r0;aw,if;ellarap,lud,oAuof;auq,ils;orw;eMgLkKlJmiInif,rEsAt1v0;arb,il;a0elpm5;cilp6d5gujn4lucitra,m3r0;ap4e1oba0;le;biled,dom;ixorppa,musn0;oc;es;er;n2o1uf0;ed,fid;lc;et;a2u0;c0s,tam;es,sbo;b,ps,uqs;rp;ap,buod,di;af;areva,ni0;rf",
    "Person|Adj": "true\xA6b3du2earnest,frank,mi2r0san1woo1;an0ich,u1;dy;sty;ella,rown",
    "Modal": "true\xA6:a5dluo4ll2nac,ot 5stel,t0;hg0na2sum;im,uo;a0iw;hs;c,hs,w;thguo",
    "Verb": "true\xA6born,cannot,gonna,has,keep tabs,msg",
    "Person|Verb": "true\xA6b8ch7dr6foster,gra5ja9lan4ma2ni9ollie,p1rob,s0wade;kip,pike,t5ue;at,eg,ier2;ck,r0;k,shal;ce;ce,nt;ew;ase,u1;i2l1ob,u0;ck;aze,ossom;ff,ll",
    "Person|Date": "true\xA6a2j0sep;an0une;!uary;p0ugust,v0;ril",
    "Timezone": "true\xA6atlant2central 0eastern 0mountain 3pacif2western e1;d4e0s3t6;uropean4;ic 0;d1s0t3;tandard1ummer1;aylight0; t0;ime"
  };

  // node_modules/efrt/src/encoding.js
  var BASE = 36;
  var seq = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ";
  var cache = seq.split("").reduce(function(h, c, i3) {
    h[c] = i3;
    return h;
  }, {});
  var toAlphaCode = function(n2) {
    if (seq[n2] !== void 0) {
      return seq[n2];
    }
    let places3 = 1;
    let range = BASE;
    let s2 = "";
    for (; n2 >= range; n2 -= range, places3++, range *= BASE) {
    }
    for (; places3 > 0; places3--) {
      const d = n2 % BASE;
      s2 = String.fromCharCode((d < 10 ? 48 : 55) + d) + s2;
      n2 = (n2 - d) / BASE;
    }
    return s2;
  };
  var fromAlphaCode = function(s2) {
    if (cache[s2] !== void 0) {
      return cache[s2];
    }
    let n2 = 0;
    let places3 = 1;
    let range = BASE;
    let pow = 1;
    for (; places3 < s2.length; n2 += range, places3++, range *= BASE) {
    }
    for (let i3 = s2.length - 1; i3 >= 0; i3--, pow *= BASE) {
      let d = s2.charCodeAt(i3) - 48;
      if (d > 10) {
        d -= 7;
      }
      n2 += d * pow;
    }
    return n2;
  };
  var encoding_default = {
    toAlphaCode,
    fromAlphaCode
  };

  // node_modules/efrt/src/unpack/symbols.js
  var symbols = function(t2) {
    const reSymbol = /^([0-9A-Z]+):([0-9A-Z]+)$/;
    for (let i3 = 0; i3 < t2.nodes.length; i3++) {
      if (!t2.nodes[i3].includes(":")) {
        break;
      }
      const m3 = reSymbol.exec(t2.nodes[i3]);
      if (!m3 || m3[0].length !== t2.nodes[i3].length || encoding_default.fromAlphaCode(m3[1]) !== i3) {
        throw new SyntaxError("Invalid efrt packed data: symbol definition");
      }
      t2.syms.push(encoding_default.fromAlphaCode(m3[2]));
    }
    t2.symCount = t2.syms.length;
    t2.nodes = t2.nodes.slice(t2.symCount);
    if (t2.nodes.length === 0 || t2.syms.some((index3) => !Number.isSafeInteger(index3) || index3 >= t2.nodes.length)) {
      throw new SyntaxError("Invalid efrt packed data: symbol target");
    }
  };
  var symbols_default = symbols;

  // node_modules/efrt/src/unpack/escape.js
  var unescapeLabel = function(text) {
    return text.replace(/\\([\s\S]|$)/g, (match2, char) => {
      if (char === "\\") {
        return "\\";
      }
      if (char >= "a" && char <= "j") {
        return String(char.charCodeAt(0) - 97);
      }
      throw new SyntaxError("Invalid efrt packed data: label escape");
    });
  };
  var escape_default = unescapeLabel;

  // node_modules/efrt/src/unpack/dictionary.js
  var dictionary = function(trie) {
    if (!trie.nodes[0].startsWith("!1:")) {
      return;
    }
    const header = trie.nodes.shift().split(":");
    const tokens = Array.from(header[1]);
    const fragments = (header[2] || "").split(",");
    if (header.length !== 3 || tokens.length === 0 || tokens.length !== fragments.length || new Set(tokens).size !== tokens.length || trie.nodes.length === 0 || tokens.some((token) => token.length !== 1 || token.charCodeAt(0) < 33 || token.charCodeAt(0) > 126 || /[A-Za-z0-9,;!:|]/.test(token) || trie.versioned && token === "\\") || fragments.some((text) => !text || /[A-Z0-9,;!:|¦]/.test(text))) {
      throw new SyntaxError("Invalid efrt packed data: fragment dictionary");
    }
    trie.dictionary = /* @__PURE__ */ Object.create(null);
    for (let i3 = 0; i3 < tokens.length; i3++) {
      trie.dictionary[tokens[i3]] = trie.versioned ? escape_default(fragments[i3]) : fragments[i3];
    }
  };
  var dictionary_default = dictionary;

  // node_modules/efrt/src/unpack/traverse.js
  var indexFromRef = function(trie, ref, index3) {
    const dnode = encoding_default.fromAlphaCode(ref);
    const target = dnode < trie.symCount ? trie.syms[dnode] : index3 + dnode + 1 - trie.symCount;
    if (!Number.isSafeInteger(target) || target <= index3 || target >= trie.nodes.length) {
      throw new SyntaxError("Invalid efrt packed data: node reference");
    }
    return target;
  };
  var parseNodes = function(trie) {
    return trie.nodes.map((node, index3) => {
      if (node === "" && trie.nodes.length !== 1) {
        throw new SyntaxError("Invalid efrt packed data: empty node");
      }
      const terminal = node[0] === "!";
      const body = terminal ? node.slice(1) : node;
      const edges = [];
      const token = /([^A-Z0-9,;!:|¦]+)([A-Z0-9]+|,|$)/y;
      for (let offset2 = 0; offset2 < body.length; offset2 = token.lastIndex) {
        const match2 = token.exec(body);
        if (!match2 || match2.index !== offset2 || match2[2] === "," && token.lastIndex === body.length) {
          throw new SyntaxError("Invalid efrt packed data: node syntax");
        }
        const ref = match2[2];
        const label = trie.versioned ? escape_default(match2[1]) : match2[1];
        const text = trie.dictionary ? Array.from(
          label,
          (char) => trie.dictionary[char] || char
        ).join("") : label;
        edges.push({
          text,
          target: ref === "" || ref === "," ? -1 : indexFromRef(trie, ref, index3)
        });
      }
      return { terminal, edges };
    });
  };
  var toArray2 = function(trie) {
    const nodes = parseNodes(trie);
    const all4 = [];
    const stack = [{ index: 0, pref: "", edge: -1 }];
    for (; stack.length > 0; ) {
      const frame = stack[stack.length - 1];
      const node = nodes[frame.index];
      if (frame.edge === -1) {
        if (node.terminal) {
          all4.push(frame.pref);
        }
        frame.edge = 0;
      }
      if (frame.edge === node.edges.length) {
        stack.pop();
        continue;
      }
      const edge = node.edges[frame.edge++];
      const word = frame.pref + edge.text;
      if (edge.target === -1) {
        all4.push(word);
      } else {
        stack.push({ index: edge.target, pref: word, edge: -1 });
      }
    }
    return all4;
  };
  var unpack = function(str, versioned = false) {
    const trie = {
      nodes: str.split(";"),
      syms: [],
      symCount: 0,
      versioned
    };
    dictionary_default(trie);
    if (str.match(":")) {
      symbols_default(trie);
    }
    return toArray2(trie);
  };
  var traverse_default = unpack;

  // node_modules/efrt/src/unpack/index.js
  var unpack2 = function(str) {
    if (str === "" || str === null || str === void 0) {
      return {};
    }
    if (typeof str !== "string") {
      throw new TypeError("efrt unpack expects a string");
    }
    const obj = str.split("|").reduce((h, s2) => {
      const arr = s2.split("\xA6");
      if (arr.length !== 2 || Object.prototype.hasOwnProperty.call(h, arr[0])) {
        throw new SyntaxError("Invalid efrt packed data: category separator or duplicate category");
      }
      h[arr[0]] = arr[1];
      return h;
    }, /* @__PURE__ */ Object.create(null));
    const all4 = {};
    Object.keys(obj).forEach(function(cat) {
      let data = obj[cat];
      const versioned = data.startsWith("!2;");
      if (versioned) {
        data = data.slice(3);
        if (!data || data === ":") {
          throw new SyntaxError("Invalid efrt packed data: missing versioned trie");
        }
      }
      const reversed = data[0] === ":";
      const arr = traverse_default(reversed ? data.slice(1) : data, versioned);
      if (cat === "true") {
        cat = true;
      }
      for (let i3 = 0; i3 < arr.length; i3++) {
        const k2 = reversed ? Array.from(arr[i3]).reverse().join("") : arr[i3];
        if (Object.prototype.hasOwnProperty.call(all4, k2)) {
          if (Array.isArray(all4[k2]) === false) {
            if (all4[k2] !== cat) {
              all4[k2] = [all4[k2], cat];
            }
          } else if (!all4[k2].includes(cat)) {
            all4[k2].push(cat);
          }
        } else {
          Object.defineProperty(all4, k2, {
            value: cat,
            writable: true,
            enumerable: true,
            configurable: true
          });
        }
      }
    });
    return all4;
  };
  var unpack_default = unpack2;

  // node_modules/compromise/src/2-two/preTagger/tagSet/_lib.js
  var NN = "Noun";
  var Sing = "Singular";
  var Plur = "Plural";
  var Prop = "ProperNoun";
  var Pron = "Pronoun";
  var Poss = "Possessive";
  var Adj = "Adjective";
  var Comp = "Comparative";
  var Sup = "Superlative";
  var Adv = "Adverb";
  var Det = "Determiner";
  var Vb = "Verb";
  var Inf = "Infinitive";
  var Past = "PastTense";
  var Ger = "Gerund";
  var Participle = "Participle";
  var Pres = "PresentTense";
  var Fut = "FutureTense";
  var Cop = "Copula";
  var Mod = "Modal";
  var Phrasal = "PhrasalVerb";
  var Conj = "Conjunction";
  var Prep = "Preposition";
  var Expr = "Expression";
  var QW = "QuestionWord";
  var Pers = "Person";
  var Place = "Place";
  var Org = "Organization";
  var First = "FirstName";
  var Last = "LastName";
  var MaleName = "MaleName";
  var FemaleName = "FemaleName";
  var Actor = "Actor";
  var Uncountable = "Uncountable";
  var SportsTeam = "SportsTeam";
  var Country = "Country";
  var City = "City";
  var Region = "Region";
  var Unit = "Unit";
  var Val = "Value";
  var Card = "Cardinal";
  var Ord = "Ordinal";
  var TxtNum = "TextValue";
  var Numeric = "NumericValue";
  var RomanNumeral = "RomanNumeral";
  var Frac = "Fraction";
  var Date2 = "Date";
  var WeekDay = "WeekDay";
  var Year = "Year";
  var FinancialQuarter = "FinancialQuarter";
  var Season = "Season";
  var Time = "Time";
  var Timezone = "Timezone";
  var Connector = "Connector";
  var Abbr = "Abbreviation";
  var Acronym = "Acronym";
  var HashTag = "HashTag";
  var AtMention = "AtMention";
  var Emoji = "Emoji";
  var Emoticon = "Emoticon";
  var SlashedTerm = "SlashedTerm";
  var Email = "Email";
  var PhoneNumber = "PhoneNumber";
  var Url = "Url";

  // node_modules/compromise/src/2-two/preTagger/model/lexicon/misc.js
  var prp = [Poss, Pron];
  var misc = {
    // numbers
    "20th century fox": Org,
    "7 eleven": Org,
    "motel 6": Org,
    "23andme": Org,
    "4chan": Org,
    "yahoo!": Org,
    u2: Org,
    g8: Org,
    vh1: Org,
    "76ers": SportsTeam,
    "49ers": SportsTeam,
    q1: Date2,
    q2: Date2,
    q3: Date2,
    q4: Date2,
    km2: Unit,
    m2: Unit,
    dm2: Unit,
    cm2: Unit,
    mm2: Unit,
    mile2: Unit,
    in2: Unit,
    yd2: Unit,
    ft2: Unit,
    m3: Unit,
    dm3: Unit,
    cm3: Unit,
    in3: Unit,
    ft3: Unit,
    yd3: Unit,
    // ampersands
    "at&t": Org,
    "black & decker": Org,
    "h & m": Org,
    "johnson & johnson": Org,
    "procter & gamble": Org,
    "ben & jerry's": Org,
    "&": Conj,
    // copulas
    was: [Cop, Past],
    is: [Cop, Pres],
    are: [Cop, Pres],
    am: [Cop, Pres],
    were: [Cop, Past],
    // possessive pronouns
    her: prp,
    his: prp,
    hers: prp,
    their: prp,
    theirs: prp,
    your: prp,
    // misc
    vs: [Conj, Abbr],
    closer: Comp,
    closest: Sup,
    may: Mod,
    // irregular conjugations with two forms
    babysat: Past,
    blew: Past,
    drank: Past,
    drove: Past,
    forgave: Past,
    skiied: Past,
    stung: Past,
    swam: Past,
    swung: Past,
    guaranteed: Past,
    // support 'near', 'nears', 'nearing'
    nears: Pres,
    nearing: Ger,
    neared: Past
  };
  var misc_default2 = misc;

  // node_modules/compromise/src/2-two/preTagger/model/lexicon/frozenLex.js
  var shared = {
    "first lieutenant": "Honorific",
    "second lieutenant": "Honorific",
    "third lieutenant": "Honorific",
    // Club names keep 'united' out of adjective/past-tense disambiguation.
    "atlanta united": SportsTeam,
    "dc united": SportsTeam,
    "minnesota united": SportsTeam,
    "manchester united": SportsTeam,
    "newcastle united": SportsTeam,
    "sheffield united": SportsTeam,
    "excuse me": Expr,
    "financial times": Org,
    "guns n roses": Org,
    "la z boy": Org,
    "labour party": Org,
    "new kids on the block": Org,
    "new york times": Org,
    "the guess who": Org,
    "thin lizzy": Org,
    "prime minister": Actor,
    "free market": Sing,
    "lay up": Sing,
    "spin off": Sing,
    "appeal court": Uncountable,
    "cold war": Uncountable,
    "gene pool": Uncountable,
    "machine learning": Uncountable,
    "nail polish": Uncountable,
    "time off": Uncountable,
    "take part": Inf,
    "bill gates": Pers,
    "doctor who": Pers,
    "he man": Pers,
    "iron man": Pers,
    "kid cudi": Pers,
    "run dmc": Pers,
    "rush limbaugh": Pers,
    "snow white": Pers,
    "tiger woods": Pers,
    "brand new": Adj,
    "en route": Adj,
    "left wing": Adj,
    "off guard": Adj,
    "on board": Adj,
    "part time": Adj,
    "right wing": Adj,
    "so called": Adj,
    "spot on": Adj,
    "straight forward": Adj,
    "super duper": Adj,
    "tip top": Adj,
    "top notch": Adj,
    "up to date": Adj,
    "win win": Adj,
    "brooklyn nets": SportsTeam,
    "chicago bears": SportsTeam,
    "houston astros": SportsTeam,
    "houston dynamo": SportsTeam,
    "houston rockets": SportsTeam,
    "houston texans": SportsTeam,
    "minnesota twins": SportsTeam,
    "orlando magic": SportsTeam,
    "san antonio spurs": SportsTeam,
    "san diego chargers": SportsTeam,
    "san diego padres": SportsTeam,
    "iron maiden": Prop,
    "isle of man": Country,
    "united states": Country,
    "united states of america": Country,
    "prince edward island": Region,
    "cedar breaks": Place,
    "cedar falls": Place,
    "point blank": Adv,
    "tiny bit": Adv,
    "by the time": Conj,
    "no matter": Conj
  };
  var frozenLex_default = {
    ...shared,
    "20th century fox": Org,
    "7 eleven": Org,
    "motel 6": Org,
    "living room": Sing,
    "living rooms": Plur,
    "dr who": Pers,
    "civil wars": Plur,
    "credit cards": Plur,
    "default rates": Plur,
    "free markets": Plur,
    "head starts": Plur,
    "home runs": Plur,
    "lay ups": Plur,
    "phone calls": Plur,
    "press releases": Plur,
    "record labels": Plur,
    "soft serves": Plur,
    "student loans": Plur,
    "tax returns": Plur,
    "tv shows": Plur,
    "video games": Plur,
    "took part": Past,
    "takes part": Pres,
    "taking part": Ger,
    "taken part": Participle,
    "light bulb": NN,
    "rush hour": NN,
    "fluid ounce": Unit,
    "the rolling stones": Org
  };

  // node_modules/compromise/src/2-two/preTagger/model/lexicon/emoticons.js
  var emoticons_default = [
    ":(",
    ":)",
    ":P",
    ":p",
    ":O",
    ";(",
    ";)",
    ";P",
    ";p",
    ";O",
    ":3",
    ":|",
    ":/",
    ":\\",
    ":$",
    ":*",
    ":@",
    ":-(",
    ":-)",
    ":-P",
    ":-p",
    ":-O",
    ":-3",
    ":-|",
    ":-/",
    ":-\\",
    ":-$",
    ":-*",
    ":-@",
    ":^(",
    ":^)",
    ":^P",
    ":^p",
    ":^O",
    ":^3",
    ":^|",
    ":^/",
    ":^\\",
    ":^$",
    ":^*",
    ":^@",
    "):",
    "(:",
    "$:",
    "*:",
    ")-:",
    "(-:",
    "$-:",
    "*-:",
    ")^:",
    "(^:",
    "$^:",
    "*^:",
    "<3",
    "</3",
    "<\\3",
    "=("
  ];

  // node_modules/compromise/src/2-two/preTagger/methods/transform/nouns/toPlural/_rules.js
  var suffixes = {
    a: [
      [/(antenn|formul|nebul|vertebr|vit)a$/i, "$1ae"],
      [/ia$/i, "ia"]
    ],
    e: [
      [/(kn|l|w)ife$/i, "$1ives"],
      [/(hive)$/i, "$1s"],
      [/([ml])ouse$/i, "$1ice"],
      [/^([ml])ice$/i, "$1ice"]
    ],
    f: [
      [/^(dwar|handkerchie|hoo|scar|whar)f$/i, "$1ves"],
      [/^((?:ca|e|ha|(?:our|them|your)?se|she|wo)l|lea|loa|shea|thie)f$/i, "$1ves"]
    ],
    i: [[/(octop|vir)i$/i, "$1i"]],
    m: [[/([ti])um$/i, "$1a"]],
    n: [[/^(oxen)$/i, "$1"]],
    o: [[/(al|ad|at|er|et|ed)o$/i, "$1oes"]],
    s: [
      [/(ax|test)is$/i, "$1es"],
      [/(alias|status)$/i, "$1es"],
      [/sis$/i, "ses"],
      [/(bu)s$/i, "$1ses"],
      [/(sis)$/i, "ses"],
      [/^(?!talis|.*hu)(.*)man$/i, "$1men"],
      [/(octop|vir|radi|nucle|fung|cact|stimul)us$/i, "$1i"]
    ],
    x: [
      [/(matr|vert|ind|cort)(ix|ex)$/i, "$1ices"],
      [/^(ox)$/i, "$1en"]
    ],
    y: [[/([^aeiouy]|qu)y$/i, "$1ies"]],
    z: [[/(quiz)$/i, "$1zes"]]
  };
  var rules_default = suffixes;

  // node_modules/compromise/src/2-two/preTagger/methods/transform/nouns/toPlural/index.js
  var addE = /([xsz]|ch|sh)$/;
  var trySuffix = function(str) {
    const c = str[str.length - 1];
    if (Object.hasOwn(rules_default, c) === true) {
      for (let i3 = 0; i3 < rules_default[c].length; i3 += 1) {
        const reg = rules_default[c][i3][0];
        if (reg.test(str) === true) {
          return str.replace(reg, rules_default[c][i3][1]);
        }
      }
    }
    return null;
  };
  var pluralize = function(str = "", model5) {
    const { irregularPlurals, uncountable: uncountable2 } = model5.two;
    if (Object.hasOwn(uncountable2, str)) {
      return str;
    }
    if (Object.hasOwn(irregularPlurals, str)) {
      return irregularPlurals[str];
    }
    const plural2 = trySuffix(str);
    if (plural2 !== null) {
      return plural2;
    }
    if (addE.test(str)) {
      return str + "es";
    }
    return str + "s";
  };
  var toPlural_default = pluralize;

  // node_modules/compromise/src/2-two/preTagger/model/lexicon/index.js
  var hasSwitch = /\|/;
  var countryAcronyms = ["uk", "usa", "ussr"];
  var lexicon3 = { ...misc_default2 };
  var switches = {};
  var tmpModel = { two: { irregularPlurals: plurals_default, uncountable: {} } };
  Object.keys(lexicon_default).forEach((tag) => {
    const wordsObj = unpack_default(lexicon_default[tag]);
    if (!hasSwitch.test(tag)) {
      Object.keys(wordsObj).forEach((w) => {
        lexicon3[w] = tag;
      });
      return;
    }
    Object.keys(wordsObj).forEach((w) => {
      switches[w] = tag;
      if (tag === "Noun|Verb") {
        const plural2 = toPlural_default(w, tmpModel);
        if (plural2 !== w || plurals_default[w] === w) {
          switches[plural2] = "Plural|Verb";
        }
      }
    });
  });
  lexicon3.if = ["Conjunction", "Condition"];
  countryAcronyms.forEach((word) => {
    lexicon3[word] = ["Country", "Acronym"];
  });
  emoticons_default.forEach((str) => lexicon3[str] = "Emoticon");
  delete lexicon3[""];
  delete lexicon3[null];
  delete lexicon3[" "];

  // node_modules/compromise/src/2-two/preTagger/model/_lib.js
  var tagWords = (words, tag) => {
    const result = {};
    words.split(" ").forEach((word) => {
      result[word] = tag;
    });
    return result;
  };
  var lib_default8 = tagWords;

  // node_modules/compromise/src/2-two/preTagger/tagSet/nouns.js
  var entity = [Pers, Place, Org];
  var nouns_default2 = {
    Noun: {
      aliases: [null, "NN"],
      not: [Vb, Adj, Adv, Val, Det]
    },
    Singular: {
      aliases: [null, "Sing", "SG", "NN1"],
      is: NN,
      not: [Plur, Uncountable]
    },
    // 'Canada'
    ProperNoun: {
      aliases: ["Prop", "NNP", "PROPN", "NP0"],
      is: NN
    },
    Person: {
      aliases: [null, "Pers"],
      is: Sing,
      also: [Prop],
      not: [Place, Org, Date2]
    },
    FirstName: {
      aliases: [null, "First"],
      is: Pers
    },
    MaleName: {
      is: First,
      not: [FemaleName, Last]
    },
    FemaleName: {
      is: First,
      not: [MaleName, Last]
    },
    LastName: {
      aliases: [null, "Last"],
      is: Pers,
      not: [First]
    },
    // 'dr.'
    Honorific: {
      aliases: ["Hon"],
      is: Pers,
      not: [First, Last, Val]
    },
    Place: {
      is: Sing,
      not: [Pers, Org]
    },
    Country: {
      is: Place,
      also: [Prop],
      not: [City]
    },
    City: {
      is: Place,
      also: [Prop],
      not: [Country]
    },
    // 'california'
    Region: {
      is: Place,
      also: [Prop]
    },
    Address: {
      aliases: ["Addr"]
      // is: 'Place',
    },
    Organization: {
      aliases: ["Org"],
      is: Prop,
      not: [Pers, Place]
    },
    SportsTeam: {
      aliases: [null, "Team"],
      is: Org
    },
    School: {
      is: Org
    },
    Company: {
      is: Org
    },
    Plural: {
      aliases: [null, "Plur", "NNS", "PL", "NN2"],
      is: NN,
      not: [Sing, Uncountable]
    },
    // 'gravity'
    Uncountable: {
      is: NN
    },
    // 'it'
    Pronoun: {
      aliases: [null, "Pron", "PRP", "PRON"],
      is: NN,
      not: entity
    },
    // 'swimmer'
    Actor: {
      is: NN,
      not: [Place, Org]
    },
    // walking
    Activity: {
      is: NN,
      not: [Pers, Place]
    },
    // kilometres
    Unit: {
      is: NN,
      not: entity
    },
    // canadian
    Demonym: {
      aliases: [null, "Dem"],
      is: NN,
      also: [Prop],
      not: entity
    },
    // [spencer's] hat
    Possessive: {
      aliases: ["Poss"],
      is: NN
    },
    // 'yourself'
    Reflexive: {
      aliases: [null, "Refl"],
      is: Pron
    }
  };

  // node_modules/compromise/src/2-two/preTagger/tagSet/verbs.js
  var verbs_default = {
    Verb: {
      aliases: ["Vb", "V", "VB"],
      not: [NN, Adj, Adv, Val, Expr]
    },
    // 'he [walks]'
    PresentTense: {
      aliases: ["Pres", "PRS"],
      is: Vb,
      not: [Past, Fut]
    },
    // 'will [walk]'
    Infinitive: {
      aliases: ["Inf", "VVI"],
      is: Pres,
      not: [Ger]
    },
    // '[walk] now!'
    Imperative: {
      aliases: ["Imp"],
      is: Vb,
      not: [Past, Ger, Cop]
    },
    // walking
    Gerund: {
      aliases: ["Ger", "VBG"],
      is: Pres,
      not: [Cop]
    },
    // walked
    PastTense: {
      aliases: ["Past", "VBD", "PST"],
      is: Vb,
      not: [Pres, Ger, Fut]
    },
    // will walk
    FutureTense: {
      aliases: ["Fut"],
      is: Vb,
      not: [Pres, Past]
    },
    // is/was
    Copula: {
      aliases: [null, "Cop"],
      is: Vb
    },
    // '[could] walk'
    Modal: {
      aliases: [null, "Mod", "MD"],
      is: Vb,
      not: [Inf]
    },
    // 'awaken'
    Participle: {
      aliases: [null, "VBN"],
      is: Past
    },
    // '[will have had] walked'
    Auxiliary: {
      aliases: ["Aux"],
      is: Vb,
      not: [Past, Pres, Ger, Conj]
    },
    // 'walk out'
    PhrasalVerb: {
      aliases: ["Phrasal", "PhrV"],
      is: Vb
    },
    // 'walk [out]'
    Particle: {
      aliases: [null, "RP"],
      is: Phrasal,
      not: [Past, Pres, Cop, Ger]
    },
    // 'walked by'
    Passive: {
      aliases: [null, "Pass"],
      is: Vb
    }
  };

  // node_modules/compromise/src/2-two/preTagger/tagSet/values.js
  var values_default = {
    Value: {
      aliases: ["Val", "Num"],
      not: [Vb, Adj, Adv]
    },
    Ordinal: {
      aliases: [null, "Ord"],
      is: Val,
      not: [Card]
    },
    Cardinal: {
      aliases: [null, "Card", "CD"],
      is: Val,
      not: [Ord]
    },
    Fraction: {
      aliases: [null, "Frac"],
      is: Val,
      not: [NN]
    },
    Multiple: {
      aliases: [null, "Mult"],
      is: TxtNum
    },
    RomanNumeral: {
      aliases: [null, "RomNum"],
      is: Card
    },
    TextValue: {
      aliases: [null, "TxtNum"],
      is: Val,
      not: [Numeric, RomanNumeral]
    },
    NumericValue: {
      aliases: ["Numeric"],
      is: Val,
      not: [RomanNumeral]
    },
    Money: {
      is: Card
    },
    Percent: {
      aliases: [null, "Perc", "Pct"],
      is: Val
    }
  };

  // node_modules/compromise/src/2-two/preTagger/tagSet/dates.js
  var dates_default = {
    Date: {
      not: [Vb, Adv, Adj]
    },
    Month: {
      is: Date2,
      also: [NN],
      not: [WeekDay, Year, FinancialQuarter, Season, Time, Timezone]
    },
    WeekDay: {
      is: Date2,
      also: [NN],
      not: [Year, FinancialQuarter, Season, Time, Timezone]
    },
    Year: {
      is: Date2,
      not: [RomanNumeral, FinancialQuarter, Season, Time, Timezone]
    },
    FinancialQuarter: {
      is: Date2,
      aliases: [null, "Quarter"],
      not: [Frac, Season, Time, Timezone]
    },
    // 'easter'
    Holiday: {
      is: Date2,
      also: [NN]
    },
    // 'summer'
    Season: {
      is: Date2,
      not: [Time, Timezone]
    },
    Timezone: {
      is: Date2,
      aliases: [null, "Tz"],
      also: [NN],
      not: [Prop]
    },
    Time: {
      is: Date2,
      not: [AtMention, Timezone]
    },
    // 'months'
    Duration: {
      aliases: [null, "Dur"],
      is: Date2,
      also: [NN]
    }
  };

  // node_modules/compromise/src/2-two/preTagger/tagSet/misc.js
  var anything = [NN, Vb, Adj, Adv, Val, QW];
  var misc_default3 = {
    Adjective: {
      aliases: ["Adj", "JJ", "ADJ", "AJ0"],
      not: [NN, Vb, Adv, Val]
    },
    Comparable: {
      is: Adj
    },
    Comparative: {
      aliases: [null, "Comp", "JJR", "AJC"],
      is: Adj
    },
    Superlative: {
      aliases: [null, "Sup", "JJS", "AJS"],
      is: Adj,
      not: [Comp]
    },
    NumberRange: {
      aliases: [null, "NumRange"]
    },
    Adverb: {
      aliases: ["Adv", "RB", "ADV"],
      not: [NN, Vb, Adj, Val]
    },
    Determiner: {
      aliases: ["Det", "DT", "DET"],
      not: [NN, Vb, Adj, Adv, QW, Conj]
      //allow 'a' to be a Determiner/Value
    },
    Connector: {
      not: [NN, Vb, Adj, Adv, QW, Det]
    },
    Conjunction: {
      aliases: ["Conj", "CC"],
      is: Connector,
      not: anything.concat([Prep])
    },
    Preposition: {
      aliases: ["Prep", "IN", "ADP"],
      is: Connector,
      not: [NN, Vb, Adj, Adv, QW, Det, Conj]
    },
    QuestionWord: {
      aliases: [null, "QW"],
      not: [Det]
    },
    Currency: {
      is: NN
    },
    Expression: {
      aliases: ["Expr"],
      not: [NN, Adj, Vb, Adv]
    },
    Abbreviation: {
      aliases: ["Abbr"]
    },
    Url: {
      aliases: [null, "URL"],
      not: [HashTag, Vb, Adj, Val, SlashedTerm, Email, PhoneNumber, AtMention, Emoji, Emoticon]
    },
    PhoneNumber: {
      not: [HashTag, Vb, Adj, Val, AtMention, Emoji, Emoticon]
    },
    HashTag: {},
    AtMention: {
      is: NN,
      not: [HashTag, Emoji, Emoticon]
    },
    Emoji: {
      not: [HashTag, Vb, Adj, Val, Emoticon]
    },
    Emoticon: {
      not: [HashTag, Vb, Adj, Val, SlashedTerm]
    },
    SlashedTerm: {
      not: [Emoticon, Url, Val]
    },
    Email: {
      not: [HashTag, Vb, Adj, Val, PhoneNumber, AtMention, Emoji, Emoticon]
    },
    Acronym: {
      not: [RomanNumeral, Pron, Date2]
    },
    Negative: {
      aliases: [null, "Neg"],
      not: [NN, Adj, Val, Expr]
    },
    Condition: {
      is: Connector,
      aliases: [null, "Cond"],
      not: [Vb, Adj, NN, Val]
    },
    // existential 'there'
    There: {
      aliases: [null, "EX"],
      not: [Vb, Adj, NN, Val, Conj, Prep]
    },
    // 'co-wrote'
    Prefix: {
      not: [Abbr, Acronym, Prop]
    },
    // hard-nosed, bone-headed
    Hyphenated: {}
  };

  // node_modules/compromise/src/2-two/preTagger/tagSet/index.js
  var allTags = { ...nouns_default2, ...verbs_default, ...values_default, ...dates_default, ...misc_default3 };
  var tagSet_default = allTags;

  // node_modules/compromise/src/2-two/preTagger/tagSet/aliases.js
  var aliases2 = aliases_default2(tagSet_default);
  var aliases_default4 = aliases2;

  // node_modules/compromise/src/2-two/preTagger/model/clues/_noun.js
  var { Sing: n } = aliases_default4;
  var noun_default = {
    beforeTags: {
      Determiner: n,
      //the date
      Possessive: n,
      //his date
      Acronym: n,
      //u.s. state
      // ProperNoun:n,
      Noun: n,
      //nasa funding
      Adjective: n,
      //whole bottles
      // Verb:true, //save storm victims
      PresentTense: n,
      //loves hiking
      Gerund: n,
      //uplifting victims
      PastTense: n,
      //saved storm victims
      Infinitive: n,
      //profess love
      Date: n,
      //9pm show
      Ordinal: n,
      //first date
      Demonym: n
      //dutch map
    },
    afterTags: {
      Value: n,
      //date nine  -?
      Modal: n,
      //date would
      Copula: n,
      //fear is
      PresentTense: n,
      //babysitting sucks
      PastTense: n,
      //babysitting sucked
      // Noun:n, //talking therapy, planning process
      Demonym: n,
      //american touch
      Actor: n
      //dance therapist
    },
    // ownTags: { ProperNoun: n },
    beforeWords: {
      the: n,
      //the brands
      with: n,
      //with cakes
      without: n,
      //
      // was:n, //was time  -- was working
      // is:n, //
      // of power; for rats; any rats; all tips; on time
      ...lib_default8("of for any all on", n),
      // thing-ish verbs
      // cut spending; cut spending; increase funding
      ...lib_default8("cut cuts increase decrease raise drop", n),
      // give: n,//give parents
      // minus laughing; more than age; about claims
      ...lib_default8("save saved saves make makes made minus plus than another versus neither about", n),
      // strong adjectives
      // no worries; more details; one flood; let fear; her boots
      ...lib_default8(
        "favorite best daily weekly linear binary mobile lexical technical computer scientific security government popular formal no more one let her his their our",
        n
      ),
      // us: n, //served us drinks
      sheer: n,
      ...lib_default8(
        "monthly yearly current previous upcoming last next main initial final beginning end top bottom future past major minor side central peripheral public private",
        n
      )
    },
    afterWords: lib_default8(
      // date of birth (preposition); parents can; service-wise
      // they: n,//snakes they
      "of system aid method utility tool reform therapy philosophy room authority says said wants wanted is did do can wise",
      n
    )
  };

  // node_modules/compromise/src/2-two/preTagger/model/clues/_verb.js
  var { Inf: v } = aliases_default4;
  var verb_default = {
    beforeTags: {
      Modal: v,
      //would date
      Adverb: v,
      //quickly date
      Negative: v,
      //not date
      Plural: v
      //characters drink
      // ProperNoun: vb,//google thought
    },
    afterTags: {
      Determiner: v,
      //flash the
      Adverb: v,
      //date quickly
      Possessive: v,
      //date his
      Reflexive: v,
      //resolve yourself
      // Noun:true, //date spencer
      Preposition: v,
      //date around, dump onto, grumble about
      // Conjunction: v, // dip to, dip through
      Cardinal: v,
      //cut 3 squares
      Comparative: v,
      //feel greater
      Superlative: v
      //feel greatest
    },
    beforeWords: {
      // i date; we date; you date; they date; to date; please check; will check; help combat
      ...lib_default8(
        "i we you they to please will have had would could come should do did does can must us me let even when help",
        v
      ),
      // them: v,
      ...lib_default8("he she it being", v),
      // prefixes
      ...lib_default8("bi co contra de inter intra mis pre out counter nobody somebody anybody everybody", v),
      // un: v,
      // over: v,
      // under: v,
      // now dance; go dance; he said run; simon says run; they say run; who runs faster; what runs faster
      ...lib_default8("now go said says say who what", v)
      // most: v, //most run faster
      // some: v, //some run faster
    },
    afterWords: {
      // echo the; date me; date you; loves him; cost us; hope it
      ...lib_default8(
        "the me you him us her his them they it himself herself itself myself ourselves themselves something anything",
        v
      ),
      a: v,
      //covers a
      an: v,
      //covers an
      // from: v, //ranges from
      up: v,
      //serves up
      down: v,
      //serves up
      by: v,
      // in: v, //bob in
      out: v,
      // on: v,
      off: v,
      under: v,
      what: v,
      //look what
      // when: v,//starts when
      // for:true, //settled for
      all: v,
      //shiver all night
      // conjunctions
      to: v,
      //dip to
      because: v,
      //
      although: v,
      //
      // after: v,
      // before: v,//
      // fit together; kill more; look here; float away; dance now
      ...lib_default8("how otherwise together though into yet more here there away now", v)
    }
  };

  // node_modules/compromise/src/2-two/preTagger/model/clues/actor-verb.js
  var clue = {
    beforeTags: {
      ...verb_default.beforeTags,
      ...noun_default.beforeTags
    },
    afterTags: { ...verb_default.afterTags, ...noun_default.afterTags },
    beforeWords: { ...verb_default.beforeWords, ...noun_default.beforeWords },
    afterWords: { ...verb_default.afterWords, ...noun_default.afterWords }
  };
  var actor_verb_default = clue;

  // node_modules/compromise/src/2-two/preTagger/model/clues/_adj.js
  var { JJ: jj } = aliases_default4;
  var adj_default = {
    beforeTags: {
      Determiner: jj,
      //the detailed
      // Copula: jj, //is detailed
      Possessive: jj,
      //spencer's detailed
      Hyphenated: jj
      //rapidly-changing
    },
    afterTags: {
      // Noun: jj, //detailed plan, overwhelming evidence
      Adjective: jj
      //intoxicated little
    },
    beforeWords: {
      // seem prepared; feel prepared; over cooked; too insulting; find it insulting; nothing but frustrating
      // still scared
      ...lib_default8(
        "seem seemed seems feel feels felt stay appear appears appeared also over under too it but still",
        jj
      ),
      // adverbs that are adjective-ish
      // really damaged; how slow
      ...lib_default8("really quite well very truly how deeply hella", jj),
      // always: jj,
      // never: jj,
      // nothing secret,; something wrong; not swell; called me swell
      ...lib_default8(
        "profoundly extremely so badly mostly totally awfully rather nothing something anything not me is",
        jj
      ),
      face: jj,
      //faces shocking revelations
      faces: jj,
      faced: jj,
      look: jj,
      looks: jj,
      looked: jj,
      reveal: jj,
      reveals: jj,
      revealed: jj,
      // would prove shocking
      ...lib_default8("sound sounded sounds remains remained prove proves proved", jj),
      // gets shocking snowfall
      ...lib_default8(
        "becomes stays tastes taste smells smell gets grows as rings radiates conveys convey conveyed of",
        jj
      )
      // 'smacks of': jj,
      // 'reeks of': jj,
    },
    afterWords: lib_default8(
      // insulting too; insulting too; insulting or; cool enough; as shocking as
      //about: jj, //cool about
      "too also or enough as",
      jj
    )
  };

  // node_modules/compromise/src/2-two/preTagger/model/clues/_gerund.js
  var { VBG: g } = aliases_default4;
  var gerund_default = {
    beforeTags: {
      // Verb: g, // loves shocking
      Adverb: g,
      //quickly shocking
      Connector: g
      //by insulting, if swimming
    },
    afterTags: {
      Adverb: g,
      //shocking quickly
      Possessive: g,
      //shocking spencer's
      Person: g,
      //telling spencer
      Pronoun: g,
      //shocking him
      Determiner: g,
      //shocking the
      Copula: g,
      //shocking is
      Connector: g,
      //swimming in, swimming and running
      Comparative: g
      //growing shorter
    },
    beforeWords: {
      // keep going; am watching; be timing; got me thinking
      ...lib_default8("been keep continue stop am be me", g),
      // action-words
      // love painting
      ...lib_default8(
        "began start starts started stops stopped help helps avoid avoids love loves loved hate hates hated",
        g
      )
      // was:g,//was working
      // is:g,
      // be:g,
    },
    afterWords: lib_default8(
      // telling you; fighting their; dumping it; running this; swimming there; landing on; talking about
      // paying for; speeding up
      "you me her him his them their it this there on about for up down",
      g
    )
  };

  // node_modules/compromise/src/2-two/preTagger/model/clues/adj-gerund.js
  var { VBG: g2, JJ: jj2 } = aliases_default4;
  var clue2 = {
    beforeTags: {
      ...adj_default.beforeTags,
      ...gerund_default.beforeTags,
      // Copula: jj,
      Imperative: g2,
      //recommend living in
      Infinitive: jj2,
      //say charming things
      // PresentTense: g,
      Plural: g2
      //kids cutting
    },
    afterTags: {
      ...adj_default.afterTags,
      ...gerund_default.afterTags,
      Noun: jj2
      //shocking ignorance
      // Plural: jj, //shocking lies
    },
    beforeWords: {
      ...adj_default.beforeWords,
      ...gerund_default.beforeWords,
      is: jj2,
      are: g2,
      //is overflowing: JJ, are overflowing : VB ??
      was: jj2,
      of: jj2,
      //of varying
      suggest: g2,
      suggests: g2,
      suggested: g2,
      recommend: g2,
      recommends: g2,
      recommended: g2,
      imagine: g2,
      imagines: g2,
      imagined: g2,
      consider: g2,
      considered: g2,
      considering: g2,
      resist: g2,
      resists: g2,
      resisted: g2,
      avoid: g2,
      avoided: g2,
      avoiding: g2,
      except: jj2,
      accept: jj2,
      ...lib_default8("assess explore fear fears appreciate question help embrace", g2),
      with: jj2
      //filled with daring
    },
    afterWords: {
      ...adj_default.afterWords,
      ...gerund_default.afterWords,
      to: g2,
      not: g2,
      //trying not to car
      the: g2
      //sweeping the country
    }
  };
  var adj_gerund_default = clue2;

  // node_modules/compromise/src/2-two/preTagger/model/clues/adj-noun.js
  var misc2 = {
    beforeTags: {
      Determiner: void 0,
      //the premier university
      Cardinal: NN,
      //1950 convertable
      PhrasalVerb: Adj
      //starts out fine
    },
    afterTags: {
      // Pronoun: 'Noun'//as an adult i
    }
  };
  var clue3 = {
    beforeTags: { ...adj_default.beforeTags, ...noun_default.beforeTags, ...misc2.beforeTags },
    afterTags: { ...adj_default.afterTags, ...noun_default.afterTags, ...misc2.afterTags },
    beforeWords: {
      ...adj_default.beforeWords,
      ...noun_default.beforeWords,
      // are representative
      ...lib_default8("are is was be", Adj),
      // phrasals
      off: Adj,
      //start off fine
      out: Adj
      //comes out fine
    },
    afterWords: { ...adj_default.afterWords, ...noun_default.afterWords }
  };
  var adj_noun_default = clue3;

  // node_modules/compromise/src/2-two/preTagger/model/clues/adj-past.js
  var { VBD: past, JJ: jj3 } = aliases_default4;
  var adjPast = {
    beforeTags: {
      Adverb: past,
      //quickly detailed
      Pronoun: past,
      //he detailed
      ProperNoun: past,
      //toronto closed
      Auxiliary: past,
      Noun: past
      //eye closed  -- i guess.
    },
    afterTags: {
      Possessive: past,
      //hooked him
      Pronoun: past,
      //hooked me
      Determiner: past,
      //hooked the
      Adverb: past,
      //cooked perfectly
      Comparative: past,
      //closed higher
      Date: past,
      // alleged thursday
      Gerund: past
      //left dancing
    },
    beforeWords: {
      be: past,
      //be hooked vs be embarrassed
      who: past,
      //who lost
      get: jj3,
      //get charged
      // being watched; it intoxicated him; as requested
      ...lib_default8("had has have been being it as", past),
      for: jj3,
      //for discounted items
      more: jj3,
      //more broken promises
      always: jj3
    },
    afterWords: {
      // damaged by; charged back; charged out; crowded in; heated up; hammered down; settled for; settled the
      // obsessed with; known as; focused on; recorded at; settled between; dedicated to; pumped into
      // charged us; charged us; shared his
      ...lib_default8(
        "by back out in up down before after for the with as on at between to into us them his her their our me",
        past
      ),
      about: jj3
    }
  };
  var adj_past_default = {
    beforeTags: { ...adj_default.beforeTags, ...adjPast.beforeTags },
    afterTags: { ...adj_default.afterTags, ...adjPast.afterTags },
    beforeWords: { ...adj_default.beforeWords, ...adjPast.beforeWords },
    afterWords: { ...adj_default.afterWords, ...adjPast.afterWords }
  };

  // node_modules/compromise/src/2-two/preTagger/model/clues/adj-present.js
  var misc3 = {
    afterTags: {
      Noun: Adj,
      //ruling party
      Conjunction: void 0
      //clean and excellent
    }
  };
  var clue4 = {
    beforeTags: {
      ...adj_default.beforeTags,
      ...verb_default.beforeTags,
      // always clean
      Adverb: void 0,
      Negative: void 0
    },
    afterTags: { ...adj_default.afterTags, ...verb_default.afterTags, ...misc3.afterTags },
    beforeWords: {
      ...adj_default.beforeWords,
      ...verb_default.beforeWords,
      // have seperate contracts
      have: void 0,
      had: void 0,
      not: void 0,
      //went wrong, got wrong
      went: Adj,
      goes: Adj,
      got: Adj,
      // be sure
      be: Adj
    },
    afterWords: {
      ...adj_default.afterWords,
      ...verb_default.afterWords,
      to: void 0,
      //slick to the touch
      as: Adj
      //pale as
    }
  };
  var adj_present_default = clue4;

  // node_modules/compromise/src/2-two/preTagger/model/clues/noun-gerund.js
  var misc4 = {
    beforeTags: {
      Copula: Ger,
      PastTense: Ger,
      PresentTense: Ger,
      Infinitive: Ger
    },
    afterTags: {
      Value: Ger
      //maintaining 500
    },
    beforeWords: {
      ...lib_default8("are were be no without", Ger),
      //are you playing
      ...lib_default8("you we they he she", Ger),
      //stop us playing
      us: Ger,
      them: Ger
    },
    afterWords: {
      // offering the
      the: Ger,
      this: Ger,
      that: Ger,
      //got me thinking
      me: Ger,
      us: Ger,
      them: Ger
    }
  };
  var clue5 = {
    beforeTags: { ...gerund_default.beforeTags, ...noun_default.beforeTags, ...misc4.beforeTags },
    afterTags: { ...gerund_default.afterTags, ...noun_default.afterTags, ...misc4.afterTags },
    beforeWords: { ...gerund_default.beforeWords, ...noun_default.beforeWords, ...misc4.beforeWords },
    afterWords: { ...gerund_default.afterWords, ...noun_default.afterWords, ...misc4.afterWords }
  };
  var noun_gerund_default = clue5;

  // node_modules/compromise/src/2-two/preTagger/model/clues/noun-verb.js
  var { Sing: nn, Inf: vb } = aliases_default4;
  var clue6 = {
    beforeTags: {
      ...verb_default.beforeTags,
      ...noun_default.beforeTags,
      // Noun: undefined
      Adjective: nn,
      //great name
      Particle: nn
      //brought under control
    },
    afterTags: {
      ...verb_default.afterTags,
      ...noun_default.afterTags,
      ProperNoun: vb,
      Gerund: vb,
      Adjective: vb,
      Copula: nn
    },
    beforeWords: {
      ...verb_default.beforeWords,
      ...noun_default.beforeWords,
      // is time
      is: nn,
      was: nn,
      //balance of power
      of: nn,
      have: null
      //have cash
    },
    afterWords: {
      ...verb_default.afterWords,
      ...noun_default.afterWords,
      // for: vb,//work for
      instead: vb,
      // that: nn,//subject that was
      // for: vb,//work for
      about: vb,
      //talk about
      his: vb,
      //shot his
      her: vb,
      //
      to: null,
      by: null,
      in: null
    }
  };
  var noun_verb_default = clue6;

  // node_modules/compromise/src/2-two/preTagger/model/clues/_person.js
  var { Person: p } = aliases_default4;
  var person_default = {
    beforeTags: {
      Honorific: p,
      Person: p
      // Preposition: p, //with sue
    },
    afterTags: {
      Person: p,
      ProperNoun: p,
      Verb: p
      //bob could
      // Modal:true, //bob could
      // Copula:true, //bob is
      // PresentTense:true, //bob seems
    },
    ownTags: {
      ProperNoun: p
      //capital letter
    },
    beforeWords: lib_default8("hi hey yo dear hello", p),
    afterWords: lib_default8(
      // person-usually verbs
      // and:true, //sue and jeff
      "said says told tells feels felt seems thinks thought spends spendt plays played sing sang learn learned wants wanted",
      p
    )
  };

  // node_modules/compromise/src/2-two/preTagger/model/clues/person-date.js
  var { Month: m, Person: p2 } = aliases_default4;
  var month = {
    beforeTags: {
      Date: m,
      Value: m
    },
    afterTags: {
      Date: m,
      Value: m
    },
    beforeWords: {
      // 5th of april; this april
      ...lib_default8(
        "by in on during after before between until til sometime of this next last previous following",
        m
      ),
      with: p2
      // for: p,
    },
    afterWords: lib_default8(
      // june the 4th
      "sometime in of until the",
      m
    )
  };
  var person_date_default = {
    beforeTags: { ...person_default.beforeTags, ...month.beforeTags },
    afterTags: { ...person_default.afterTags, ...month.afterTags },
    beforeWords: { ...person_default.beforeWords, ...month.beforeWords },
    afterWords: { ...person_default.afterWords, ...month.afterWords }
  };

  // node_modules/compromise/src/2-two/preTagger/model/clues/person-noun.js
  var clue7 = {
    beforeTags: { ...noun_default.beforeTags, ...person_default.beforeTags },
    afterTags: { ...noun_default.afterTags, ...person_default.afterTags },
    beforeWords: { ...noun_default.beforeWords, ...person_default.beforeWords, i: "Infinitive", we: "Infinitive" },
    afterWords: { ...noun_default.afterWords, ...person_default.afterWords }
  };
  var person_noun_default = clue7;

  // node_modules/compromise/src/2-two/preTagger/model/clues/person-verb.js
  var clues = {
    beforeTags: { ...noun_default.beforeTags, ...person_default.beforeTags, ...verb_default.beforeTags },
    afterTags: { ...noun_default.afterTags, ...person_default.afterTags, ...verb_default.afterTags },
    beforeWords: { ...noun_default.beforeWords, ...person_default.beforeWords, ...verb_default.beforeWords },
    afterWords: { ...noun_default.afterWords, ...person_default.afterWords, ...verb_default.afterWords }
  };
  var person_verb_default = clues;

  // node_modules/compromise/src/2-two/preTagger/model/clues/person-place.js
  var { Place: p3 } = aliases_default4;
  var place = {
    beforeTags: {
      Place: p3
    },
    afterTags: {
      Place: p3,
      Abbreviation: p3
    },
    beforeWords: lib_default8("in by near from to", p3),
    afterWords: lib_default8("in by near from to government council region city", p3)
  };
  var clue8 = {
    beforeTags: { ...place.beforeTags, ...person_default.beforeTags },
    afterTags: { ...place.afterTags, ...person_default.afterTags },
    beforeWords: { ...place.beforeWords, ...person_default.beforeWords },
    afterWords: { ...place.afterWords, ...person_default.afterWords }
  };
  var person_place_default = clue8;

  // node_modules/compromise/src/2-two/preTagger/model/clues/person-adj.js
  var clues2 = {
    beforeTags: { ...person_default.beforeTags, ...adj_default.beforeTags },
    afterTags: { ...person_default.afterTags, ...adj_default.afterTags },
    beforeWords: { ...person_default.beforeWords, ...adj_default.beforeWords },
    afterWords: { ...person_default.afterWords, ...adj_default.afterWords }
  };
  var person_adj_default = clues2;

  // node_modules/compromise/src/2-two/preTagger/model/clues/unit-noun.js
  var { Unit: un } = aliases_default4;
  var clues3 = {
    beforeTags: { Value: un },
    afterTags: {},
    beforeWords: lib_default8(
      // square km; metric ton
      "per every each square cubic sq metric",
      un
    ),
    afterWords: lib_default8(
      // foot long
      "per squared cubed long",
      un
    )
  };
  var unit_noun_default = clues3;

  // node_modules/compromise/src/2-two/preTagger/model/clues/index.js
  var clues4 = {
    "Actor|Verb": actor_verb_default,
    "Adj|Gerund": adj_gerund_default,
    "Adj|Noun": adj_noun_default,
    "Adj|Past": adj_past_default,
    "Adj|Present": adj_present_default,
    "Noun|Verb": noun_verb_default,
    "Noun|Gerund": noun_gerund_default,
    "Person|Noun": person_noun_default,
    "Person|Date": person_date_default,
    "Person|Verb": person_verb_default,
    "Person|Place": person_place_default,
    "Person|Adj": person_adj_default,
    "Unit|Noun": unit_noun_default
  };
  var copy = (obj, more) => {
    const res = Object.keys(obj).reduce((h, k2) => {
      h[k2] = obj[k2] === Inf ? Pres : Plur;
      return h;
    }, {});
    return Object.assign(res, more);
  };
  clues4["Plural|Verb"] = {
    beforeWords: copy(clues4["Noun|Verb"].beforeWords, {
      had: Plur,
      //had tears
      have: Plur
    }),
    afterWords: copy(clues4["Noun|Verb"].afterWords, {
      his: Pres,
      her: Pres,
      its: Pres,
      in: null,
      to: null,
      is: Pres,
      //the way it works is
      by: Pres
      //it works by
    }),
    beforeTags: copy(clues4["Noun|Verb"].beforeTags, {
      Conjunction: Pres,
      //and changes
      Noun: void 0,
      //the century demands
      ProperNoun: Pres
      //john plays
    }),
    afterTags: copy(clues4["Noun|Verb"].afterTags, {
      Gerund: Plur,
      //ice caps disappearing
      Noun: Pres,
      //changes gears
      Value: Pres
      //changes seven gears
    })
  };
  var clues_default = clues4;

  // node_modules/compromise/src/2-two/preTagger/model/patterns/suffixes.js
  var {
    JJ: Adj2,
    Inf: Inf2,
    Pres: Pres2,
    Sing: Sing2,
    VBD: Past2,
    RB: Avb,
    NNS: Plrl,
    Actor: Actor2,
    V: Vb2,
    NN: Noun,
    NNP: Prop2,
    Last: Last2,
    Modal,
    Place: Place2,
    VBN: Participle2
  } = aliases_default4;
  var suffixes_default2 = [
    null,
    null,
    {
      //2-letter
      ea: Sing2,
      ia: Noun,
      ic: Adj2,
      ly: Avb,
      "'n": Vb2,
      "'t": Vb2
    },
    {
      //3-letter
      oed: Past2,
      ued: Past2,
      xed: Past2,
      " so": Avb,
      "'ll": Modal,
      "'re": "Copula",
      azy: Adj2,
      eer: Noun,
      end: Vb2,
      ped: Past2,
      ffy: Adj2,
      ify: Inf2,
      ing: "Gerund",
      ize: Inf2,
      ibe: Inf2,
      lar: Adj2,
      mum: Adj2,
      nes: Pres2,
      nny: Adj2,
      // oid: Adj,
      ous: Adj2,
      que: Adj2,
      ger: Noun,
      ber: Noun,
      ...lib_default8("rol sis ogy oid ian", Sing2),
      zes: Pres2,
      eld: Past2,
      ken: Participle2,
      //awoken
      ven: Participle2,
      //woven
      ten: Participle2,
      //brighten
      ect: Inf2,
      ict: Inf2,
      // ide: Inf,
      ign: Inf2,
      oze: Inf2,
      ful: Adj2,
      bal: Adj2,
      ton: Noun,
      pur: Place2
    },
    {
      //4-letter
      ...lib_default8("amed aped ched lked rked reed nded", Past2),
      mned: Adj2,
      cted: Past2,
      dged: Past2,
      ield: Sing2,
      akis: Last2,
      cede: Inf2,
      chuk: Last2,
      czyk: Last2,
      ects: Pres2,
      iend: Sing2,
      ends: Vb2,
      enko: Last2,
      ette: Sing2,
      iary: Sing2,
      wner: Sing2,
      //owner
      fies: Pres2,
      fore: Avb,
      gate: Inf2,
      gone: Adj2,
      ices: Plrl,
      ints: Plrl,
      ruct: Inf2,
      ...lib_default8("ines ions ners pers lers", Plrl),
      less: Adj2,
      llen: Adj2,
      made: Adj2,
      nsen: Last2,
      oses: Pres2,
      ould: Modal,
      some: Adj2,
      sson: Last2,
      ians: Plrl,
      // tage: Inf,
      tion: Sing2,
      tage: Noun,
      ique: Sing2,
      tive: Adj2,
      tors: Noun,
      vice: Sing2,
      lier: Sing2,
      fier: Sing2,
      wned: Past2,
      gent: Sing2,
      ...lib_default8("tist pist rist mist yist vist ists", Actor2),
      ...lib_default8("lite site rite mite bite mate date ndal vent", Sing2),
      uist: Actor2,
      gist: Actor2,
      note: Sing2,
      cide: Sing2,
      //homicide
      ence: Sing2,
      //absence
      wide: Adj2,
      //nationwide
      // side: Adj,//alongside
      // provide
      ...lib_default8("vide ract duce pose eive lyze lyse", Inf2),
      ...lib_default8("iant nary ghty uent", Adj2),
      erer: Actor2,
      //caterer
      bury: Place2,
      dorf: Noun,
      esty: Noun,
      ...lib_default8("wych dale folk vale abad sham wick view", Place2)
    },
    {
      //5-letter
      elist: Actor2,
      holic: Sing2,
      phite: Sing2,
      tized: Past2,
      urned: Past2,
      eased: Past2,
      ances: Plrl,
      bound: Adj2,
      ettes: Plrl,
      fully: Avb,
      ishes: Pres2,
      ities: Plrl,
      marek: Last2,
      nssen: Last2,
      ology: Noun,
      osome: Sing2,
      tment: Sing2,
      ports: Plrl,
      rough: Adj2,
      tches: Pres2,
      tieth: "Ordinal",
      tures: Plrl,
      wards: Avb,
      where: Avb,
      ...lib_default8("archy pathy opoly embly phate", Noun),
      ndent: Sing2,
      scent: Sing2,
      ...lib_default8("onist anist alist olist icist", Actor2),
      ounce: Inf2,
      ...lib_default8("iable borne gnant inant igent atory", Adj2),
      // ctory: Adj,
      rient: Sing2,
      dient: Sing2,
      maker: Actor2,
      ...lib_default8("burgh mouth ceter ville hurst stead endon brook shire", Place2),
      worth: Noun,
      field: Prop2,
      ridge: Place2
    },
    {
      //6-letter
      auskas: Last2,
      ...lib_default8("parent cedent ionary cklist", Sing2),
      brooke: Place2,
      keeper: Actor2,
      logist: Actor2,
      teenth: "Value",
      worker: Actor2,
      master: Actor2,
      writer: Actor2,
      ...lib_default8("brough cester ington cliffe ingham", Place2)
    },
    {
      //7-letter
      chester: Place2,
      logists: Actor2,
      opoulos: Last2,
      borough: Place2,
      sdottir: Last2
      //swedish female
    }
  ];

  // node_modules/compromise/src/2-two/preTagger/model/patterns/prefixes.js
  var { JJ: Adj3, NN: Noun2, V: Verb } = aliases_default4;
  var prefixes_default2 = [
    null,
    null,
    {
      // 2-letter
    },
    {
      // 3-letter
      neo: Noun2,
      bio: Noun2,
      // pre: Noun,
      "de-": Verb,
      "re-": Verb,
      "un-": Verb,
      "ex-": Noun2
    },
    {
      // 4-letter
      anti: Noun2,
      auto: Noun2,
      faux: Adj3,
      hexa: Noun2,
      kilo: Noun2,
      mono: Noun2,
      nano: Noun2,
      octa: Noun2,
      poly: Noun2,
      semi: Adj3,
      tele: Noun2,
      "pro-": Adj3,
      "mis-": Verb,
      "dis-": Verb,
      "pre-": Adj3
      //hmm
    },
    {
      // 5-letter
      anglo: Noun2,
      centi: Noun2,
      ethno: Noun2,
      ferro: Noun2,
      grand: Noun2,
      hepta: Noun2,
      hydro: Noun2,
      intro: Noun2,
      macro: Noun2,
      micro: Noun2,
      milli: Noun2,
      nitro: Noun2,
      penta: Noun2,
      quasi: Adj3,
      radio: Noun2,
      tetra: Noun2,
      "omni-": Adj3,
      "post-": Adj3
    },
    {
      // 6-letter
      pseudo: Adj3,
      "extra-": Adj3,
      "hyper-": Adj3,
      "inter-": Adj3,
      "intra-": Adj3,
      "deca-": Adj3
      // 'trans-': Noun,
    },
    {
      // 7-letter
      electro: Noun2
    }
  ];

  // node_modules/compromise/src/2-two/preTagger/model/patterns/endsWith.js
  var {
    JJ: Adj4,
    Inf: Inf3,
    Pres: Pres3,
    Sing: Sing3,
    VBD: Past3,
    RB: Adverb,
    Expression: Exp,
    Actor: Actor3,
    V: Verb2,
    NN: Noun3,
    Last: Last3
  } = aliases_default4;
  var endsWith_default = {
    a: [
      [/.[aeiou]na$/, Noun3, "tuna"],
      [/.[oau][wvl]ska$/, Last3],
      [/.[^aeiou]ica$/, Sing3, "harmonica"],
      [/^([hyj]a+)+$/, Exp, "haha"]
      //hahah
    ],
    c: [[/.[^aeiou]ic$/, Adj4]],
    d: [
      //==-ed==
      //double-consonant
      [/[aeiou](pp|ll|ss|ff|gg|tt|rr|bb|nn|mm)ed$/, Past3, "popped"],
      //double-vowel
      [/.[aeo]{2}[bdgmnprvz]ed$/, Past3, "rammed"],
      //-hed
      [/.[aeiou][sg]hed$/, Past3, "gushed"],
      //-rd
      [/.[aeiou]red$/, Past3, "hired"],
      [/.[aeiou]r?ried$/, Past3, "hurried"],
      // ard
      [/[^aeiou]ard$/, Sing3, "steward"],
      // id
      [/[aeiou][^aeiou]id$/, Adj4, ""],
      [/.[vrl]id$/, Adj4, "livid"],
      // ===== -ed ======
      //-led
      [/..led$/, Past3, "hurled"],
      //-sed
      [/.[iao]sed$/, Past3, ""],
      [/[aeiou]n?[cs]ed$/, Past3, ""],
      //-med
      [/[aeiou][rl]?[mnf]ed$/, Past3, ""],
      //-ked
      [/[aeiou][ns]?c?ked$/, Past3, "bunked"],
      //-gned
      [/[aeiou]gned$/, Past3],
      //-ged
      [/[aeiou][nl]?ged$/, Past3],
      //-ted
      [/.[tdbwxyz]ed$/, Past3],
      [/[^aeiou][aeiou][tvx]ed$/, Past3],
      //-ied
      [/.[cdflmnprstv]ied$/, Past3, "emptied"]
    ],
    e: [
      [/.[lnr]ize$/, Inf3, "antagonize"],
      [/.[^aeiou]ise$/, Inf3, "antagonise"],
      [/.[aeiou]te$/, Inf3, "bite"],
      [/.[^aeiou][ai]ble$/, Adj4, "fixable"],
      [/.[^aeiou]eable$/, Adj4, "maleable"],
      [/.[ts]ive$/, Adj4, "festive"],
      [/[a-z]-like$/, Adj4, "woman-like"]
    ],
    h: [
      [/.[^aeiouf]ish$/, Adj4, "cornish"],
      [/.v[iy]ch$/, Last3, "..ovich"],
      [/^ug?h+$/, Exp, "ughh"],
      [/^uh[ -]?oh$/, Exp, "uhoh"],
      [/[a-z]-ish$/, Adj4, "cartoon-ish"]
    ],
    i: [[/.[oau][wvl]ski$/, Last3, "polish-male"]],
    k: [
      [/^(k){2}$/, Exp, "kkkk"]
      //kkkk
    ],
    l: [
      [/.[gl]ial$/, Adj4, "familial"],
      [/.[^aeiou]ful$/, Adj4, "fitful"],
      [/.[nrtumcd]al$/, Adj4, "natal"],
      [/.[^aeiou][ei]al$/, Adj4, "familial"]
    ],
    m: [
      [/.[^aeiou]ium$/, Sing3, "magnesium"],
      [/[^aeiou]ism$/, Sing3, "schism"],
      [/^[hu]m+$/, Exp, "hmm"],
      [/^\d+ ?[ap]m$/, "Date", "3am"]
    ],
    n: [
      [/.[lsrnpb]ian$/, Adj4, "republican"],
      [/[^aeiou]ician$/, Actor3, "musician"],
      [/[aeiou][ktrp]in'$/, "Gerund", "cookin'"]
      // 'cookin', 'hootin'
    ],
    o: [
      [/^no+$/, Exp, "noooo"],
      [/^(yo)+$/, Exp, "yoo"],
      [/^wo{2,}[pt]?$/, Exp, "woop"]
      //woo
    ],
    r: [
      [/.[bdfklmst]ler$/, "Noun"],
      [/[aeiou][pns]er$/, Sing3],
      [/[^i]fer$/, Inf3],
      [/.[^aeiou][ao]pher$/, Actor3],
      [/.[lk]er$/, "Noun"],
      [/.ier$/, "Comparative"]
    ],
    t: [
      [/.[di]est$/, "Superlative"],
      [/.[icldtgrv]ent$/, Adj4],
      [/[aeiou][^aeiou\r\n\u2028\u2029]*ist$/, Adj4],
      [/^[a-z]et$/, Verb2]
    ],
    s: [
      [/.[^aeiou]ises$/, Pres3],
      [/.[rln]ates$/, Pres3],
      [/.[^z]ens$/, Verb2],
      [/.[lstrn]us$/, Sing3],
      [/.[aeiou]sks$/, Pres3],
      [/.[aeiou]kes$/, Pres3],
      [/[aeiou][^aeiou]is$/, Sing3],
      [/[a-z]'s$/, Noun3],
      [/^yes+$/, Exp]
      //yessss
    ],
    v: [
      [/.[^aeiou][ai][kln]ov$/, Last3]
      //east-europe
    ],
    y: [
      [/.[cts]hy$/, Adj4],
      [/.[st]ty$/, Adj4],
      [/.[tnl]ary$/, Adj4],
      [/.[oe]ry$/, Sing3],
      [/[rdntkbhs]ly$/, Adverb],
      [/.(gg|bb|zz)ly$/, Adj4],
      [/...lly$/, Adverb],
      [/.[gk]y$/, Adj4],
      [/[bszmp]{2}y$/, Adj4],
      [/.[ai]my$/, Adj4],
      [/[ea]{2}zy$/, Adj4],
      [/.[^aeiou]ity$/, Sing3]
    ]
  };

  // node_modules/compromise/src/2-two/preTagger/model/patterns/neighbours.js
  var { V: vb2, NN: nn2 } = aliases_default4;
  var neighbours_default = {
    // looking at the previous word's tags:
    leftTags: [
      ["Adjective", nn2],
      ["Possessive", nn2],
      ["Determiner", nn2],
      ["Adverb", vb2],
      ["Pronoun", vb2],
      ["Value", nn2],
      ["Ordinal", nn2],
      ["Modal", vb2],
      ["Superlative", nn2],
      ["Demonym", nn2],
      ["Honorific", "Person"]
      //dr. Smith
    ],
    // looking at the previous word:
    leftWords: [
      ["i", vb2],
      ["first", nn2],
      ["it", vb2],
      ["there", vb2],
      ["not", vb2],
      ["because", nn2],
      ["if", nn2],
      ["but", nn2],
      ["who", vb2],
      ["this", nn2],
      ["his", nn2],
      ["when", nn2],
      ["you", vb2],
      ["very", "Adjective"],
      ["old", nn2],
      ["never", vb2],
      ["before", nn2],
      ["a", nn2],
      ["the", nn2],
      ["been", vb2]
    ],
    // looking at the next word's tags:
    rightTags: [
      ["Copula", nn2],
      ["PastTense", nn2],
      ["Conjunction", nn2],
      ["Modal", nn2]
    ],
    // looking at the next word:
    rightWords: [
      ["there", vb2],
      ["me", vb2],
      ["man", "Adjective"],
      // ['only', vb],
      ["him", vb2],
      ["it", vb2],
      //relaunch it
      ["were", nn2],
      ["took", nn2],
      ["himself", vb2],
      ["went", nn2],
      ["who", nn2],
      ["jr", "Person"]
    ]
  };

  // node_modules/compromise/src/2-two/_built/conjugations.js
  var conjugations_default = {
    "Comparative": "0er:shy,ray,oad,ead|0r:e|0:er~0er:,eat,ver|1ier:y|0der:ad|0ger:ig|2urther:far|0ter:at,wet,ot|4better:good|0mer:im|0ner:hin|0ber:ib|3worse:bad~1:er{eri,wid,rud,g,fak,u,uch,v,t{u,a,o,i},saf,som,am,ip,in,r,s,l{b,pa,ta,t,p},c,e}|0:emier,esser|2:er{ng,ain,ear,air,oor,ss}~",
    "Gerund": "3:ing{iphon,iven,s{ocu,ucu,ia,s},k{ea,oa,ya,oo},nap,sip,lot,icit,ing,ong,og,isc,l{l{,e{s,t,w,f,m,y},fa,ca,sta},ia,ai,ei,oi,e,o,au,ou,r,w},au,gram,zz,tz}|4:ing{nn,kk,pp,tt,nsell}|3e:ing{t{a,crea,nea,le,ompe,cre,as{t,w,p},o,u,erou,i{wr,v,ped,c,n}},r{rfe,rseve,dhe,o{st,pl,c,gn,sh,d}},th{rea,nba,wa,i,e}}|4ie:rlying~3:ing{,elop,oop,eap,d{r,ea,oa,ee,l,n,oi,ai,w,oo,ou,au},t{lle,ou,ea,mba,oa,oo,ivo},in{a,rg,o,e,u},al{e,n,u,v},aim,eam,oam,r{e,o,ou,eu,ea,oa,ga,ai},mb,rb}|3e:ing{n{o{dr,l,p,b,h,z},i,u,ve,la,wa},d,s,ak,ik,ok,v,r,g{,in{fr,p,h}},c,u,m{co,u,a,i},z,l,b,p{a,o,y,i}}|5is:being|4:ing{gass,dd,ll{a,e,isti,ci,ntro,atro,xto},mm,rr,gg,bb,ick{m,f},izz}~1ing:te,we,he|0ing:inge,ssip,dnap,dd,t{e{e,arg,dg,k,pr,m,c,i,mp},imi,nefi,ofi,ilo},an{e,h,g,o},l{dia,e{nrav,d,e,rc,l,k}},m{r,ee,l,o},fer{f,m},ng,alog,gg|2ying:ie|0king:rek|0ping:p{o,te,i,a}|0ting:t{e,i{ys,m,qu,f,h,l,n,p},u,a,o}|0ning:in,an,un|0ring:fer,deter~3e:ing{ow,bor,bit,ach}|3:ing{add,hang,egg,spell,cue,program}|4:ing{itt{s,b},donn,penn}|4ie:ying{d,t,l,v}",
    "Participle": "0:|3e:den|2:ne|1:d~1:n,mt|3ose:osen|4ake:woken|2:en{be,t,l},ned|3e:tten|4eave:woven|4eeze:ozen|3ine:hone|5et:otten|2in:un|0:run|4eak:oken|3ink:unk|5eek:ought|1d:t|3:bidden|3ing:ung|2im:um|1l:pilt|4eal:olen|2y:in|3y:flown|3ear:orn~0:me|0d:dive|1den:de|0ne:o~",
    "PastTense": "0:,eat|1e:lost|2it:at|1d:nt,lt|1:ant,alt,apt,d{e{n{o{b,l,h,p,t,z},i,u,ve,ca,wa},t{a{,cre,ne,me},as{b,t,w},u,ompe,le,cre,o},ath,d{a,e,i,lu,ru,o},g,v,b,s,nti,m{co,i,u,a,ram,y},r{,dhe,eve,rfe,o{sh,b,pl,c,st,gn,p}},c,e,dy,z,l{,a{b,p,h,c}},u,k{a,i,o,u},p{o,a,i,y}},r}|4tch:ught|2et:ot|2ave:ft|1ve:had|2:ed{iven,t{cot,ici,ebu,lo},wing,ocus,ss,ias,ki,tz,zz,l{l,strol,a,ai,oi,ei,o,r,e,ou,au,w},eak,oak,ook}|3:ed{nn,tt,dd,all,pp}|0e:id|2y:aid|3old:eld|3and:ood|2ose:se|3eat:ate|3eak:oke,uck|3ear:ore|4are:were|3ive:ove,ave|2ke:de|3id:bade|3ide:ode|3ine:one|3eal:ole|2in:an,un,on|2ow:ew|2ay:slew|2ee:aw|3ing:ang|2ig:ug|3ink:ank,unk|3ake:ook|2im:am|2ie:ay~2:ed{,t{lle,ou,oo,io,ea,oa},d{ea,oa,ai,oi,ee,oo},in{a,o,e,u},rb,mb,aim,eam,oam,r{e,ai,o,ea,oa,eu,ou,mu},ll{a{c,r,st,w},e{w,qu,h,sm,y}},bang,ong,sg,p{ea,velo,oo,si}}|1et:met|1ot:hot|5ight:fought|1ad:sled|0:bid|4ind:ound|1ed:bred|2un:ran|3ite:ote|0e:bit|1:ited{c,ped,n,v,p}|3eave:wove|3ise:rose|3eeze:oze|3ome:ame|3ake:woke|3ike:ruck|5each:taught|3:ed{bb,gass,mm,rr,ll{nu,lfi,e,tro,xto},gg,ick{m,n,f}}|3is:was|3y:ied|2y:flew|5uy:ought|2aw:drew|3all:ell|3ell:old|2el:elt|3ick:tuck|5ink:hought|5eek:sought|3ang:hung|3ing:ung|5ing:rought|2ep:pt|2o:did|4go:went~0:t{se,be,le,s{ca,hru,co,r},u,hi,li,hur,bea},read,hed|2ot:get|0ed:t{arge,pre,debu,imi,ilo},d{rea{b,h},min,cin},ean,oan,oy,ay,ey,m{o,r,ee,l},ffer,rr,rrow,l{pel,e{an,pe,re,ab,ev,l}},gg,seep|0ted:t{re,ne,bu,i{qu,m,ref,n},o,a}|2at:ysit,pit|0ded:d{a,i,e,o}|2ade:orbid|1t:bend,send,ild|3ood:tand|2d:eed{l,f,p}|3eld:hold|0ned:in,an,un|2an:gin|2un:spin|0t:mean,deal,leap|0d:e{,prid,ris{p,o},ueez,lcom}|1:ide{sl,h}|3ode:ride|3ove:ive{dr,tr,d}|3ave:give|3ft:eave|3se:oose|1d:lee|2aw:see|3one:shine|3ook:ake{s,t,h}|2de:make|2ay:rlie|3ught:catch|1id:pay|2am:wim|0red:deter,fer|3ore:ear{b,w,t}|2ew:ow{bl,r,n}|3ole:teal|0led:al{iti,h,v}|3ank:ink{r,s}|3unk:tink|3oke:eak{br,sp}|3uck:neak|3ang:ing{pr,s}|3ung:wring|2ug:dig|0ped:p{a,o,te,i}~1:d{e{ach,i{d,l,p,t,v},ey,ow,rout,stak,wak},hear},pent|2:ed{add,egg,wing,err,sever,model,spell}|3eat:ate|1ed:ed{bl,f,sp}|3:ed{donn,pitt,vett,upp}|0:fit,quit,shed|1e:fled,lost|1ve:had|2y:aid{l,s}|1ad:led|1d:ent{l,r,sp}|1ght:lit|3ing:rang|2it:sat|4are:were|2in:won",
    "PresentTense": "1ve:as|1:es{beli,rli,th}|2:hes~1:s|3is:are|2:es{ocus,ss,ias,o,x,zz}|3:gasses|3y:ies~0s:io,oo,y{a,o,u,e}|0es:sh,ch~1ve:has|1:ies{l,d,t,v}",
    "Superlative": "4best:good|0:est|0st:e|1t:orse|0est:shy,gay,ey|2iest:cey~0est:,reat|0gest:ig|2urthest:far|0test:t{o,we,i,a}|1iest:y|0lest:ful|0nest:hin|0:east|3worst:bad|0most:ner,uter~2:est{g,ang,t{a,u,o,i},r{ra,ua,so,di,u,seve,ce},eri,wid,rud,s,l{p,b,t,pa},fin,fak,ip,af,som,am,c,u,v}|3:est{ng,ss}|0:hwest|4ey:riciest~4best:good|0est:full",
    "AdjToNoun": "0ness:,ant{s,p},ied,red,e{tiv{rac,ta,isi},nabl},adic,msical,oy,ay|0ion:ect|1ce:nt|1cy:nt{a{vagr,br,li,n,h},icie,ete}|2tion:vant,reet|5tiquity:cient|3or:ent{rd,v}|0y:est|1s:ost|1m:fist|2eat:ot|0itude:pt|2n:ious{bit,ut,ic}|3ty:acious{d,n,v}|2sity:ous{curi,ner,umin}|4y:rious{fu,xu,te,t},etic,tiful|4ur:lamorous|3:ous{umor,gor,e,al,d,y},nate,ortive,ing{st,w,k},atic,ful{orce,ace,se,wer,ight,ct,oy,l,s}|4:ltuous,able{rt,ect,e}|3sy:teous|3ity:ous{ne,ol,il,m}|3inousness:umous|1ment:ed|2ment:hed|2ion:ted{a,o}|2:nted,cused,ical{g,us},tty|2ation:ized,mined|1:ed{is,lin,c}|0ity:id,tund,tic,al,ar|0edness:and|2cy:ate|1ion:erate,lute|2nce:mperate|3e:unate,pensive,ing{ar,ov}|2on:ive{t{c,a,i,rcep},gress,sess,as}|1ity:e{tiv{ac,ea,si},il,r,n,im}|4ce:fensive|0ty:aive,yal,ain|0ry:ave|2ility:ble|3lity:pitable|3tion:irable|4e:uable|3ility:mble|1icity:imple|0ties:btle|1dom:wise|0dom:ee|6fulness:begone|3ement:ing{s,g,t}|3edom:ring|3ance:uring|3ation:iring|4sion:nding|0:anding|3eness:ving|1ess:ning|3ength:ong|2th:ung|2y:ic,estic|3m:stic|5:tistic|3y:tastic|2ry:antic|3ce:mantic|1on:omatic|1sm:ic{gmat,m,o}|0ism:otic,conic,ional|2ism:stical|1iness:y|0th:rm|0liness:an|2pth:ep|3arity:ear|2verty:or~~~"
  };

  // node_modules/suffix-thumb/src/compress/_lib.js
  var sections = ["fwd", "both", "rev", "ex"];
  var reserved = /[~|:,{}0-9]/;
  var decodeVal = function(key, str) {
    const m3 = str.match(/^[0-9]+/);
    const n2 = m3 ? Number(m3[0]) : 0;
    const tail2 = m3 ? str.slice(m3[0].length) : str;
    return key.slice(0, key.length - n2) + tail2;
  };

  // node_modules/suffix-thumb/src/convert/index.js
  var convert = function(str = "", model5 = {}) {
    const { ex = {}, fwd = {}, both = {} } = model5;
    if (Object.hasOwn(ex, str)) {
      return ex[str];
    }
    for (let len = str.length; len >= 0; len -= 1) {
      const suff = str.slice(str.length - len);
      const stem = str.slice(0, str.length - len);
      if (Object.hasOwn(fwd, suff)) {
        return stem + fwd[suff];
      }
      if (Object.hasOwn(both, suff)) {
        return stem + both[suff];
      }
    }
    return str;
  };
  var convert_default = convert;

  // node_modules/suffix-thumb/src/reverse/index.js
  var flipObj = function(obj = {}) {
    return Object.fromEntries(Object.entries(obj).map(([key, val]) => [val, key]));
  };
  var reverse2 = function(model5 = {}) {
    return {
      reversed: true,
      // these two work both ways
      both: flipObj(model5.both),
      ex: flipObj(model5.ex),
      // and the one-way rules trade places
      fwd: model5.rev || {},
      rev: model5.fwd || {}
    };
  };
  var reverse_default = reverse2;

  // node_modules/suffix-thumb/src/compress/unpack.js
  var invalid = function() {
    throw new Error("suffix-thumb: invalid packed model");
  };
  var unpackKeys = function(str, suff = "", out3 = []) {
    let i3 = 0;
    do {
      let chain = "";
      while (i3 < str.length && str[i3] !== "," && str[i3] !== "{") {
        chain += str[i3];
        i3 += 1;
      }
      if (reserved.test(chain)) {
        invalid();
      }
      if (str[i3] === "{") {
        let depth = 1;
        let j = i3 + 1;
        while (depth > 0 && j < str.length) {
          if (str[j] === "{") {
            depth += 1;
          } else if (str[j] === "}") {
            depth -= 1;
          }
          j += 1;
        }
        if (depth !== 0 || j < str.length && str[j] !== ",") {
          invalid();
        }
        unpackKeys(str.slice(i3 + 1, j - 1), chain + suff, out3);
        i3 = j;
      } else {
        out3.push(chain + suff);
      }
      i3 += 1;
    } while (i3 <= str.length);
    return out3;
  };
  var unpackSection = function(str = "") {
    const obj = /* @__PURE__ */ Object.create(null);
    if (!str) {
      return { ...obj };
    }
    str.split("|").forEach((group) => {
      const i3 = group.indexOf(":");
      const val = group.slice(0, i3);
      const count = val.match(/^[0-9]+/);
      if (i3 < 0 || !count || reserved.test(val.slice(count[0].length))) {
        invalid();
      }
      unpackKeys(group.slice(i3 + 1)).forEach((k2) => {
        if (Number(count[0]) > k2.length) {
          invalid();
        }
        obj[k2] = decodeVal(k2, val);
      });
    });
    return { ...obj };
  };
  var uncompress = function(str = "") {
    if (typeof str !== "string" || str[0] === "{") {
      throw new Error("suffix-thumb: uncompress expects a packed string. Models made before v6 must be learned again.");
    }
    const parts2 = str.split("~");
    if (str !== "" && parts2.length !== sections.length) {
      invalid();
    }
    const model5 = {};
    sections.forEach((s2, i3) => {
      model5[s2] = unpackSection(parts2[i3]);
    });
    return model5;
  };
  var unpack_default2 = uncompress;

  // node_modules/compromise/src/2-two/preTagger/model/models/index.js
  var fromPast = unpack_default2(conjugations_default.PastTense);
  var fromPresent = unpack_default2(conjugations_default.PresentTense);
  var fromGerund = unpack_default2(conjugations_default.Gerund);
  var fromParticiple = unpack_default2(conjugations_default.Participle);
  var toPast = reverse_default(fromPast);
  var toPresent = reverse_default(fromPresent);
  var toGerund = reverse_default(fromGerund);
  var toParticiple = reverse_default(fromParticiple);
  var toComparative = unpack_default2(conjugations_default.Comparative);
  var toSuperlative = unpack_default2(conjugations_default.Superlative);
  var fromComparative = reverse_default(toComparative);
  var fromSuperlative = reverse_default(toSuperlative);
  var adjToNoun = unpack_default2(conjugations_default.AdjToNoun);
  var models_default = {
    fromPast,
    fromPresent,
    fromGerund,
    fromParticiple,
    toPast,
    toPresent,
    toGerund,
    toParticiple,
    // adjectives
    toComparative,
    toSuperlative,
    fromComparative,
    fromSuperlative,
    adjToNoun
  };

  // node_modules/compromise/src/2-two/preTagger/model/regex/regex-normal.js
  var regex_normal_default = [
    [email, "Email"],
    [explicitUrl, "Url", "http.."],
    [bareUrl, "Url", ".com"],
    // timezones
    [/^[PMCE]ST$/i, "Timezone", "EST"],
    //names
    [/^ma?c'[a-z]{3}/, "LastName", "mc'neil"],
    [/^o'[a-z]{3}/, "LastName", "o'connor"],
    [/^ma?cd[aeiou][a-z]{3}/, "LastName", "mcdonald"],
    //slang things
    [/^(lol)+[sz]$/, "Expression", "lol"],
    [/^wo{2,}a*h?$/, "Expression", "wooah"],
    [/^(hee?){2,}h?$/, "Expression", "hehe"],
    [/^(un|de|re)-[a-z\u00C0-\u00FF]{2}/, "Verb", "un-vite"],
    // m/h
    [/^(m|k|cm|km)\/(s|h|hr)$/, "Unit", "5 k/m"],
    // μg/g
    [/^(ug|ng|mg)\/(l|m3|ft3)$/, "Unit", "ug/L"],
    // love/hate
    [new RegExp("[^:/]\\/\\p{Letter}", "u"), "SlashedTerm", "love/hate"]
  ];

  // node_modules/compromise/src/2-two/preTagger/model/regex/regex-text.js
  var regex_text_default = [
    // #coolguy
    [new RegExp("^#[\\p{Number}_]*\\p{Letter}", "u"), "HashTag"],
    // can't be all numbers
    // @spencermountain
    [/^@\w{2,}$/, "AtMention"],
    // period-ones acronyms - f.b.i.
    [/^([A-Z]\.){2}[A-Z]?/i, ["Acronym", "Noun"], "F.B.I"],
    //ascii-only
    // ending-apostrophes
    [/.{3}[lkmnp]in['‘’‛‵′`´]$/, "Gerund", "chillin'"],
    [/.{4}s['‘’‛‵′`´]$/, "Possessive", "flanders'"],
    //from https://www.regextester.com/106421
    // [/^([\u00a9\u00ae\u2319-\u3300]|\ud83c[\ud000-\udfff]|\ud83d[\ud000-\udfff]|\ud83e[\ud000-\udfff])/, 'Emoji', 'emoji-range']
    // unicode character range
    [/^[\p{Emoji_Presentation}\p{Extended_Pictographic}]/u, "Emoji", "emoji-class"]
  ];

  // node_modules/compromise/src/2-two/preTagger/model/regex/regex-numbers.js
  var regex_numbers_default = [
    [/^@1?[0-9](am|pm)$/i, Time, "3pm"],
    [/^@1?[0-9]:[0-9]{2}(am|pm)?$/i, Time, "3:30pm"],
    [/^'[0-9]{2}$/, Year],
    // times
    [/^[012]?[0-9](:[0-5][0-9])(:[0-5][0-9])$/, Time, "3:12:31"],
    [/^[012]?[0-9](:[0-5][0-9])?(:[0-5][0-9])? ?(am|pm)$/i, Time, "1:12pm"],
    [/^[012]?[0-9](:[0-5][0-9])(:[0-5][0-9])? ?(am|pm)?$/i, Time, "1:12:31pm"],
    //can remove?
    // iso-dates
    [/^[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}/i, Date2, "iso-date"],
    [/^[0-9]{1,4}-[0-9]{1,2}-[0-9]{1,4}$/, Date2, "iso-dash"],
    [/^[0-9]{1,4}\/[0-9]{1,2}\/([0-9]{4}|[0-9]{2})$/, Date2, "iso-slash"],
    [/^[0-9]{1,4}\.[0-9]{1,2}\.[0-9]{1,4}$/, Date2, "iso-dot"],
    [/^[0-9]{1,4}-[a-z]{2,9}-[0-9]{1,4}$/i, Date2, "12-dec-2019"],
    // timezones
    [/^utc ?[+-]?[0-9]+$/, Timezone, "utc-9"],
    [/^(gmt|utc)[+-][0-9]{1,2}$/i, Timezone, "gmt-3"],
    //phone numbers
    [/^[0-9]{3}-[0-9]{4}$/, PhoneNumber, "421-0029"],
    [/^(\+?[0-9][ -])?[0-9]{3}[ -]?[0-9]{3}-[0-9]{4}$/, PhoneNumber, "1-800-"],
    //money
    //like $5.30
    [new RegExp("^[-+]?\\p{Currency_Symbol}[-+]?[0-9]+(,[0-9]{3})*(\\.[0-9]+)?([kmb]|bn)?\\+?$", "u"), ["Money", Val], "$5.30"],
    //like 5.30$
    [new RegExp("^[-+]?[0-9]+(,[0-9]{3})*(\\.[0-9]+)?\\p{Currency_Symbol}\\+?$", "u"), ["Money", Val], "5.30\xA3"],
    //like
    [/^[-+]?[$£]?[0-9]([0-9,.])+(usd|eur|jpy|gbp|cad|aud|chf|cny|hkd|nzd|kr|rub)$/i, ["Money", Val], "$400usd"],
    //numbers
    // 50 | -50 | 3.23  | 5,999.0  | 10+
    [/^[-+]?[0-9]+(,[0-9]{3})*(\.[0-9]+)?\+?$/, [Card, Numeric], "5,999"],
    [/^[-+]?[0-9]+(,[0-9]{3})*(\.[0-9]+)?(st|nd|rd|r?th)$/, [Ord, Numeric], "53rd"],
    // .73th
    [/^\.[0-9]+\+?$/, [Card, Numeric], ".73th"],
    //percent
    [/^[-+]?[0-9]+(,[0-9]{3})*(\.[0-9]+)?%\+?$/, ["Percent", Card, Numeric], "-4%"],
    [/^\.[0-9]+%$/, ["Percent", Card, Numeric], ".3%"],
    //fraction
    [/^[0-9]+(\.[0-9]+)?\/[0-9]+(st|nd|rd|th)?s?$/, [Frac, Numeric], "2/3rds"],
    //range
    [/^[0-9.]{1,3}[a-z]{0,2}[-–—][0-9]{1,3}[a-z]{0,2}$/, [Val, "NumberRange"], "3-4"],
    //time-range
    [/^[0-9]{1,2}(:[0-9][0-9])?(am|pm)? ?[-–—] ?[0-9]{1,2}(:[0-9][0-9])?(am|pm)$/, [Time, "NumberRange"], "3-4pm"],
    //number with unit
    [/^[0-9.]+([a-z°]{1,4})$/, Numeric, "9km"]
  ];

  // node_modules/compromise/src/2-two/preTagger/model/orgWords.js
  var orgWords_default = [
    "academy",
    "administration",
    "agence",
    "agences",
    "agencies",
    "agency",
    "airlines",
    "airways",
    "army",
    "assoc",
    "associates",
    "association",
    "assurance",
    "authority",
    "autorite",
    "aviation",
    "bank",
    "banque",
    "board",
    "boys",
    "brands",
    "brewery",
    "brotherhood",
    "brothers",
    "bureau",
    "cafe",
    "co",
    "caisse",
    "capital",
    "care",
    "cathedral",
    "center",
    "centre",
    "chemicals",
    "choir",
    "chronicle",
    "church",
    "circus",
    "clinic",
    "clinique",
    "club",
    "co",
    "coalition",
    "coffee",
    "collective",
    "college",
    "commission",
    "committee",
    "communications",
    "community",
    "company",
    "comprehensive",
    "computers",
    "confederation",
    "conference",
    "conseil",
    "consulting",
    "containers",
    "corporation",
    "corps",
    "corp",
    "council",
    "crew",
    "data",
    "departement",
    "department",
    "departments",
    "design",
    "development",
    "directorate",
    "division",
    "drilling",
    "education",
    "eglise",
    "electric",
    "electricity",
    "energy",
    "ensemble",
    "enterprise",
    "enterprises",
    "entertainment",
    "estate",
    "etat",
    "faculty",
    "faction",
    "federation",
    "financial",
    "fm",
    "foundation",
    "fund",
    "gas",
    "gazette",
    "girls",
    "government",
    "group",
    "guild",
    "herald",
    "holdings",
    "hospital",
    "hotel",
    "hotels",
    "inc",
    "industries",
    "institut",
    "institute",
    "institutes",
    "insurance",
    "international",
    "interstate",
    "investment",
    "investments",
    "investors",
    "journal",
    "laboratory",
    "labs",
    "llc",
    "ltd",
    "limited",
    "machines",
    "magazine",
    "management",
    "marine",
    "marketing",
    "markets",
    "media",
    "memorial",
    "ministere",
    "ministry",
    "military",
    "mobile",
    "motor",
    "motors",
    "musee",
    "museum",
    "news",
    "observatory",
    "office",
    "oil",
    "optical",
    "orchestra",
    "organization",
    "partners",
    "partnership",
    "petrol",
    "petroleum",
    "pharmacare",
    "pharmaceutical",
    "pharmaceuticals",
    "pizza",
    "plc",
    "police",
    "politburo",
    "polytechnic",
    "post",
    "power",
    "press",
    "productions",
    "quartet",
    "radio",
    "reserve",
    "resources",
    "restaurant",
    "restaurants",
    "savings",
    "school",
    "securities",
    "service",
    "services",
    "societe",
    "subsidiary",
    "society",
    "sons",
    // 'standard',
    "subcommittee",
    "syndicat",
    "systems",
    "telecommunications",
    "telegraph",
    "television",
    "times",
    "tribunal",
    "tv",
    "union",
    "university",
    "utilities",
    "workers"
  ].reduce((h, str) => {
    h[str] = true;
    return h;
  }, {});

  // node_modules/compromise/src/2-two/preTagger/model/placeWords.js
  var placeWords_default = [
    // geology
    "atoll",
    "basin",
    "bay",
    "beach",
    "bluff",
    "bog",
    "camp",
    "canyon",
    "canyons",
    "cape",
    "cave",
    "caves",
    // 'cliff',
    "cliffs",
    "coast",
    "cove",
    "coves",
    "crater",
    "crossing",
    "creek",
    "desert",
    "dune",
    "dunes",
    "downs",
    "estates",
    "escarpment",
    "estuary",
    "falls",
    "fjord",
    "fjords",
    "forest",
    "forests",
    "glacier",
    "gorge",
    "gorges",
    "grove",
    "gulf",
    "gully",
    "highland",
    "heights",
    "hollow",
    "hill",
    "hills",
    "inlet",
    "island",
    "islands",
    "isthmus",
    "junction",
    "knoll",
    "lagoon",
    "lake",
    "lakeshore",
    "marsh",
    "marshes",
    "mount",
    "mountain",
    "mountains",
    "narrows",
    "peninsula",
    "plains",
    "plateau",
    "pond",
    "rapids",
    "ravine",
    "reef",
    "reefs",
    "ridge",
    // 'river delta',
    "river",
    "rivers",
    "sandhill",
    "shoal",
    "shore",
    "shoreline",
    "shores",
    "strait",
    "straits",
    "springs",
    "stream",
    "swamp",
    "tombolo",
    "trail",
    "trails",
    "trench",
    "valley",
    "vallies",
    "village",
    "volcano",
    "waterfall",
    "watershed",
    "wetland",
    "woods",
    "acres",
    // districts
    "burough",
    "county",
    "district",
    "municipality",
    "prefecture",
    "province",
    "region",
    "reservation",
    "state",
    "territory",
    "borough",
    "metropolis",
    "downtown",
    "uptown",
    "midtown",
    "city",
    "town",
    "township",
    "hamlet",
    "country",
    "kingdom",
    "enclave",
    "neighbourhood",
    "neighborhood",
    "kingdom",
    "ward",
    "zone",
    // 'range',
    //building/ complex
    "airport",
    "amphitheater",
    "arch",
    "arena",
    "auditorium",
    "bar",
    "barn",
    "basilica",
    "battlefield",
    "bridge",
    "building",
    "castle",
    "centre",
    "coliseum",
    "cineplex",
    "complex",
    "dam",
    "farm",
    "field",
    "fort",
    "garden",
    "gardens",
    // 'grounds',
    "gymnasium",
    "hall",
    "house",
    "levee",
    "library",
    "manor",
    "memorial",
    "monument",
    "museum",
    "gallery",
    "palace",
    "pillar",
    "pits",
    // 'pit',
    // 'place',
    // 'point',
    // 'room',
    "plantation",
    "playhouse",
    "quarry",
    // 'ruins',
    "sportsfield",
    "sportsplex",
    "stadium",
    // 'statue',
    "terrace",
    "terraces",
    "theater",
    "tower",
    "park",
    "parks",
    "site",
    "ranch",
    "raceway",
    "sportsplex",
    // 'sports centre',
    // 'sports field',
    // 'soccer complex',
    // 'soccer centre',
    // 'sports complex',
    // 'civic centre',
    // roads
    "ave",
    "st",
    "street",
    "rd",
    "road",
    "lane",
    "landing",
    "crescent",
    "cr",
    "way",
    "tr",
    "terrace",
    "avenue"
  ].reduce((h, str) => {
    h[str] = true;
    return h;
  }, {});

  // node_modules/compromise/src/2-two/preTagger/methods/transform/nouns/toSingular/_rules.js
  var rules_default2 = [
    [/([^v])ies$/i, "$1y"],
    [/(ise)s$/i, "$1"],
    //promises
    [/(kn|[^o]l|w)ives$/i, "$1ife"],
    [/^((?:ca|e|ha|(?:our|them|your)?se|she|wo)l|lea|loa|shea|thie)ves$/i, "$1f"],
    [/^(dwar|handkerchie|hoo|scar|whar)ves$/i, "$1f"],
    [/(antenn|formul|nebul|vertebr|vit)ae$/i, "$1a"],
    [/(octop|vir|radi|nucle|fung|cact|stimul)(i)$/i, "$1us"],
    [/(buffal|tomat|tornad)(oes)$/i, "$1o"],
    [/(ause)s$/i, "$1"],
    //causes
    [/(ease)s$/i, "$1"],
    //diseases
    [/(ious)es$/i, "$1"],
    //geniouses
    [/(ouse)s$/i, "$1"],
    //houses
    [/(ose)s$/i, "$1"],
    //roses
    [/(..ase)s$/i, "$1"],
    [/(..[aeiu]s)es$/i, "$1"],
    [/(vert|ind|cort)(ices)$/i, "$1ex"],
    [/(matr|append)(ices)$/i, "$1ix"],
    [/([xo]|ch|ss|sh)es$/i, "$1"],
    [/men$/i, "man"],
    [/(n)ews$/i, "$1ews"],
    [/([ti])a$/i, "$1um"],
    [/([^aeiouy]|qu)ies$/i, "$1y"],
    [/(s)eries$/i, "$1eries"],
    [/(m)ovies$/i, "$1ovie"],
    [/(cris|ax|test)es$/i, "$1is"],
    [/(alias|status)es$/i, "$1"],
    [/(ss)$/i, "$1"],
    [/(ic)s$/i, "$1"],
    [/s$/i, ""]
  ];

  // node_modules/compromise/src/2-two/preTagger/methods/transform/nouns/toSingular/index.js
  var invertObj = function(obj) {
    return Object.keys(obj).reduce((h, k2) => {
      h[obj[k2]] = k2;
      return h;
    }, {});
  };
  var toSingular = function(str, model5) {
    const { irregularPlurals } = model5.two;
    const invert = invertObj(irregularPlurals);
    if (Object.hasOwn(invert, str)) {
      return invert[str];
    }
    for (let i3 = 0; i3 < rules_default2.length; i3++) {
      if (rules_default2[i3][0].test(str) === true) {
        str = str.replace(rules_default2[i3][0], rules_default2[i3][1]);
        return str;
      }
    }
    return str;
  };
  var toSingular_default = toSingular;

  // node_modules/compromise/src/2-two/preTagger/methods/transform/nouns/index.js
  var all = function(str, model5) {
    const arr = [str];
    const p4 = toPlural_default(str, model5);
    if (p4 !== str) {
      arr.push(p4);
    }
    const s2 = toSingular_default(str, model5);
    if (s2 !== str) {
      arr.push(s2);
    }
    return arr;
  };
  var nouns_default3 = { toPlural: toPlural_default, toSingular: toSingular_default, all };

  // node_modules/compromise/src/2-two/preTagger/methods/transform/verbs/getTense/_guess.js
  var guessVerb = {
    Gerund: ["ing"],
    Actor: ["erer"],
    Infinitive: [
      "ate",
      "ize",
      "tion",
      "rify",
      "then",
      "ress",
      "ify",
      "age",
      "nce",
      "ect",
      "ise",
      "ine",
      "ish",
      "ace",
      "ash",
      "ure",
      "tch",
      "end",
      "ack",
      "and",
      "ute",
      "ade",
      "ock",
      "ite",
      "ase",
      "ose",
      "use",
      "ive",
      "int",
      "nge",
      "lay",
      "est",
      "ain",
      "ant",
      "ent",
      "eed",
      "er",
      "le",
      "unk",
      "ung",
      "upt",
      "en"
    ],
    PastTense: ["ept", "ed", "lt", "nt", "ew", "ld"],
    PresentTense: [
      "rks",
      "cks",
      "nks",
      "ngs",
      "mps",
      "tes",
      "zes",
      "ers",
      "les",
      "acks",
      "ends",
      "ands",
      "ocks",
      "lays",
      "eads",
      "lls",
      "els",
      "ils",
      "ows",
      "nds",
      "ays",
      "ams",
      "ars",
      "ops",
      "ffs",
      "als",
      "urs",
      "lds",
      "ews",
      "ips",
      "es",
      "ts",
      "ns"
    ],
    Participle: ["ken", "wn"]
  };
  guessVerb = Object.keys(guessVerb).reduce((h, k2) => {
    guessVerb[k2].forEach((a) => h[a] = k2);
    return h;
  }, {});
  var guess_default = guessVerb;

  // node_modules/compromise/src/2-two/preTagger/methods/transform/verbs/getTense/index.js
  var getTense = function(str) {
    const three = str.substring(str.length - 3);
    if (Object.hasOwn(guess_default, three) === true) {
      return guess_default[three];
    }
    const two = str.substring(str.length - 2);
    if (Object.hasOwn(guess_default, two) === true) {
      return guess_default[two];
    }
    const one = str.substring(str.length - 1);
    if (one === "s") {
      return "PresentTense";
    }
    return null;
  };
  var getTense_default = getTense;

  // node_modules/compromise/src/2-two/preTagger/methods/transform/verbs/toInfinitive/index.js
  var toParts = function(str, model5) {
    let prefix5 = "";
    let prefixes2 = {};
    if (model5.one && model5.one.prefixes) {
      prefixes2 = model5.one.prefixes;
    }
    let [verb, particle] = str.split(/ /);
    if (particle && prefixes2[verb] === true) {
      prefix5 = verb;
      verb = particle;
      particle = "";
    }
    return {
      prefix: prefix5,
      verb,
      particle
    };
  };
  var copulaMap = {
    are: "be",
    were: "be",
    been: "be",
    is: "be",
    am: "be",
    was: "be",
    be: "be",
    being: "be"
  };
  var toInfinitive = function(str, model5, tense) {
    const { fromPast: fromPast2, fromPresent: fromPresent2, fromGerund: fromGerund2, fromParticiple: fromParticiple2 } = model5.two.models;
    const { prefix: prefix5, verb, particle } = toParts(str, model5);
    let inf = "";
    if (!tense) {
      tense = getTense_default(str);
    }
    if (Object.hasOwn(copulaMap, str)) {
      inf = copulaMap[str];
    } else if (tense === "Participle") {
      inf = convert_default(verb, fromParticiple2);
    } else if (tense === "PastTense") {
      inf = convert_default(verb, fromPast2);
    } else if (tense === "PresentTense") {
      inf = convert_default(verb, fromPresent2);
    } else if (tense === "Gerund") {
      inf = convert_default(verb, fromGerund2);
    } else {
      return str;
    }
    if (particle) {
      inf += " " + particle;
    }
    if (prefix5) {
      inf = prefix5 + " " + inf;
    }
    return inf;
  };
  var toInfinitive_default = toInfinitive;

  // node_modules/compromise/src/2-two/preTagger/methods/transform/verbs/conjugate/index.js
  var parse3 = (inf) => {
    if (/ /.test(inf)) {
      return inf.split(/ /);
    }
    return [inf, ""];
  };
  var conjugate = function(inf, model5) {
    const { toPast: toPast4, toPresent: toPresent4, toGerund: toGerund4, toParticiple: toParticiple3 } = model5.two.models;
    if (inf === "be") {
      return {
        Infinitive: inf,
        Gerund: "being",
        PastTense: "was",
        Participle: "been",
        PresentTense: "is"
      };
    }
    const [str, particle] = parse3(inf);
    const found = {
      Infinitive: str,
      PastTense: convert_default(str, toPast4),
      PresentTense: convert_default(str, toPresent4),
      Gerund: convert_default(str, toGerund4),
      FutureTense: "will " + str
    };
    let pastPrt = convert_default(str, toParticiple3);
    if (pastPrt !== inf && pastPrt !== found.PastTense) {
      const lex = model5.one.lexicon || {};
      if (lex[pastPrt] === "Participle" || lex[pastPrt] === "Adjective") {
        if (inf === "play") {
          pastPrt = "played";
        }
        found.Participle = pastPrt;
      }
    }
    if (particle) {
      Object.keys(found).forEach((k2) => {
        found[k2] += " " + particle;
      });
    }
    return found;
  };
  var conjugate_default = conjugate;

  // node_modules/compromise/src/2-two/preTagger/methods/transform/verbs/index.js
  var all2 = function(str, model5) {
    const res = conjugate_default(str, model5);
    delete res.FutureTense;
    return Object.values(res).filter((s2) => s2);
  };
  var verbs_default2 = {
    toInfinitive: toInfinitive_default,
    conjugate: conjugate_default,
    all: all2
  };

  // node_modules/compromise/src/2-two/preTagger/methods/transform/adjectives/inflect.js
  var toSuperlative2 = function(adj, model5) {
    const mod = model5.two.models.toSuperlative;
    return convert_default(adj, mod);
  };
  var toComparative2 = function(adj, model5) {
    const mod = model5.two.models.toComparative;
    return convert_default(adj, mod);
  };
  var fromComparative2 = function(adj, model5) {
    const mod = model5.two.models.fromComparative;
    return convert_default(adj, mod);
  };
  var fromSuperlative2 = function(adj, model5) {
    const mod = model5.two.models.fromSuperlative;
    return convert_default(adj, mod);
  };
  var toNoun = function(adj, model5) {
    const mod = model5.two.models.adjToNoun;
    return convert_default(adj, mod);
  };

  // node_modules/compromise/src/2-two/preTagger/methods/transform/adjectives/conjugate/lib.js
  var suffixLoop = function(str = "", suffixes5 = []) {
    const len = str.length;
    const max3 = len <= 6 ? len - 1 : 6;
    for (let i3 = max3; i3 >= 1; i3 -= 1) {
      const suffix2 = str.substring(len - i3, str.length);
      if (Object.hasOwn(suffixes5[suffix2.length], suffix2) === true) {
        const pre = str.slice(0, len - i3);
        const post = suffixes5[suffix2.length][suffix2];
        return pre + post;
      }
    }
    return null;
  };
  var lib_default9 = suffixLoop;

  // node_modules/compromise/src/2-two/preTagger/methods/transform/adjectives/conjugate/fromAdverb.js
  var s = "ically";
  var ical = /* @__PURE__ */ new Set([
    "analyt" + s,
    //analytical
    "chem" + s,
    // chemical
    "class" + s,
    //classical
    "clin" + s,
    // clinical
    "crit" + s,
    // critical
    "ecolog" + s,
    // ecological
    "electr" + s,
    // electrical
    "empir" + s,
    // empirical
    "frant" + s,
    // frantical
    "grammat" + s,
    // grammatical
    "ident" + s,
    // identical
    "ideolog" + s,
    // ideological
    "log" + s,
    // logical
    "mag" + s,
    //magical
    "mathemat" + s,
    // mathematical
    "mechan" + s,
    // mechanical
    "med" + s,
    // medical
    "method" + s,
    // methodical
    "method" + s,
    // methodical
    "mus" + s,
    // musical
    "phys" + s,
    // physical
    "phys" + s,
    // physical
    "polit" + s,
    // political
    "pract" + s,
    // practical
    "rad" + s,
    //radical
    "satir" + s,
    // satirical
    "statist" + s,
    // statistical
    "techn" + s,
    // technical
    "technolog" + s,
    // technological
    "theoret" + s,
    // theoretical
    "typ" + s,
    // typical
    "vert" + s,
    // vertical
    "whims" + s
    // whimsical
  ]);
  var suffixes2 = [
    null,
    {},
    { "ly": "" },
    {
      "ily": "y",
      "bly": "ble",
      "ply": "ple"
    },
    {
      "ally": "al",
      "rply": "rp"
    },
    {
      "ually": "ual",
      "ially": "ial",
      "cally": "cal",
      "eally": "eal",
      "rally": "ral",
      "nally": "nal",
      "mally": "mal",
      "eeply": "eep",
      "eaply": "eap"
    },
    {
      ically: "ic"
    }
  ];
  var noAdj = /* @__PURE__ */ new Set([
    "early",
    "only",
    "hourly",
    "daily",
    "weekly",
    "monthly",
    "yearly",
    "mostly",
    "duly",
    "unduly",
    "especially",
    "undoubtedly",
    "conversely",
    "namely",
    "exceedingly",
    "presumably",
    "accordingly",
    "overly",
    "best",
    "latter",
    "little",
    "long",
    "low"
  ]);
  var exceptions = {
    wholly: "whole",
    fully: "full",
    truly: "true",
    gently: "gentle",
    singly: "single",
    customarily: "customary",
    idly: "idle",
    publically: "public",
    quickly: "quick",
    superbly: "superb",
    cynically: "cynical",
    well: "good"
    // -?
  };
  var toAdjective = function(str) {
    if (!str.endsWith("ly")) {
      return null;
    }
    if (ical.has(str)) {
      return str.replace(/ically/, "ical");
    }
    if (noAdj.has(str)) {
      return null;
    }
    if (Object.hasOwn(exceptions, str)) {
      return exceptions[str];
    }
    return lib_default9(str, suffixes2) || str;
  };
  var fromAdverb_default = toAdjective;

  // node_modules/compromise/src/2-two/preTagger/methods/transform/adjectives/conjugate/toAdverb.js
  var suffixes3 = [
    null,
    {
      y: "ily"
    },
    {
      ly: "ly",
      //unchanged
      ic: "ically"
    },
    {
      ial: "ially",
      ual: "ually",
      tle: "tly",
      ble: "bly",
      ple: "ply",
      ary: "arily"
    },
    {},
    {},
    {}
  ];
  var exceptions2 = {
    cool: "cooly",
    whole: "wholly",
    full: "fully",
    good: "well",
    idle: "idly",
    public: "publicly",
    single: "singly",
    special: "especially"
  };
  var toAdverb = function(str) {
    if (Object.hasOwn(exceptions2, str)) {
      return exceptions2[str];
    }
    let adv = lib_default9(str, suffixes3);
    if (!adv) {
      adv = str + "ly";
    }
    return adv;
  };
  var toAdverb_default = toAdverb;

  // node_modules/compromise/src/2-two/preTagger/methods/transform/adjectives/index.js
  var all3 = function(str, model5) {
    let arr = [str];
    arr.push(toSuperlative2(str, model5));
    arr.push(toComparative2(str, model5));
    arr.push(toAdverb_default(str));
    arr = arr.filter((s2) => s2);
    arr = new Set(arr);
    return Array.from(arr);
  };
  var adjectives_default = {
    toSuperlative: toSuperlative2,
    toComparative: toComparative2,
    toAdverb: toAdverb_default,
    toNoun,
    fromAdverb: fromAdverb_default,
    fromSuperlative: fromSuperlative2,
    fromComparative: fromComparative2,
    all: all3
  };

  // node_modules/compromise/src/2-two/preTagger/methods/transform/index.js
  var transform_default = {
    noun: nouns_default3,
    verb: verbs_default2,
    adjective: adjectives_default
  };

  // node_modules/compromise/src/2-two/preTagger/methods/expand/byTag.js
  var byTag_default = {
    // add plural forms of singular nouns
    Singular: (word, lex, methods19, model5) => {
      const already = model5.one.lexicon;
      const plural2 = methods19.two.transform.noun.toPlural(word, model5);
      if (!already[plural2]) {
        lex[plural2] ||= "Plural";
      }
    },
    // 'lawyer', 'manager' plural forms
    Actor: (word, lex, methods19, model5) => {
      const already = model5.one.lexicon;
      const plural2 = methods19.two.transform.noun.toPlural(word, model5);
      if (!already[plural2]) {
        lex[plural2] ||= ["Plural", "Actor"];
      }
    },
    // superlative/ comparative forms for adjectives
    Comparable: (word, lex, methods19, model5) => {
      const already = model5.one.lexicon;
      const { toSuperlative: toSuperlative3, toComparative: toComparative3 } = methods19.two.transform.adjective;
      const sup = toSuperlative3(word, model5);
      if (!already[sup]) {
        lex[sup] ||= "Superlative";
      }
      const comp = toComparative3(word, model5);
      if (!already[comp]) {
        lex[comp] ||= "Comparative";
      }
      lex[word] = "Adjective";
    },
    // 'german' -> 'germans'
    Demonym: (word, lex, methods19, model5) => {
      const plural2 = methods19.two.transform.noun.toPlural(word, model5);
      lex[plural2] ||= ["Demonym", "Plural"];
    },
    // conjugate all forms of these verbs
    Infinitive: (word, lex, methods19, model5) => {
      const already = model5.one.lexicon;
      const all4 = methods19.two.transform.verb.conjugate(word, model5);
      Object.entries(all4).forEach((a) => {
        if (!already[a[1]] && !lex[a[1]] && a[0] !== "FutureTense") {
          lex[a[1]] = a[0];
        }
      });
    },
    // 'walk up' should conjugate, too
    PhrasalVerb: (word, lex, methods19, model5) => {
      const already = model5.one.lexicon;
      lex[word] = ["PhrasalVerb", "Infinitive"];
      const _multi = model5.one._multiCache;
      const [inf, rest] = word.split(" ");
      if (!already[inf]) {
        lex[inf] ||= "Infinitive";
      }
      const all4 = methods19.two.transform.verb.conjugate(inf, model5);
      delete all4.FutureTense;
      Object.entries(all4).forEach((a) => {
        if (a[0] === "Actor" || a[1] === "") {
          return;
        }
        if (!lex[a[1]] && !already[a[1]]) {
          lex[a[1]] = a[0];
        }
        _multi[a[1]] = 2;
        const str = a[1] + " " + rest;
        lex[str] ||= [a[0], "PhrasalVerb"];
      });
    },
    // expand 'million'
    Multiple: (word, lex) => {
      lex[word] = ["Multiple", "Cardinal"];
      lex[word + "th"] = ["Multiple", "Ordinal"];
      lex[word + "ths"] = ["Multiple", "Fraction"];
    },
    // expand number-words
    Cardinal: (word, lex) => {
      lex[word] = ["TextValue", "Cardinal"];
    },
    // 'millionth'
    Ordinal: (word, lex) => {
      lex[word] = ["TextValue", "Ordinal"];
      lex[word + "s"] = ["TextValue", "Fraction"];
    },
    // 'thames'
    Place: (word, lex) => {
      lex[word] = ["Place", "ProperNoun"];
    },
    // 'ontario'
    Region: (word, lex) => {
      lex[word] = ["Region", "ProperNoun"];
    }
  };

  // node_modules/compromise/src/2-two/preTagger/methods/expand/index.js
  var expand3 = function(words, world2) {
    const { methods: methods19, model: model5 } = world2;
    const lex = {};
    const _multi = {};
    Object.keys(words).forEach((word) => {
      const tag = words[word];
      word = word.toLowerCase().trim();
      word = word.replace(/'s\b/, "");
      const split3 = word.split(/ /);
      if (split3.length > 1) {
        if (_multi[split3[0]] === void 0 || split3.length > _multi[split3[0]]) {
          _multi[split3[0]] = split3.length;
        }
      }
      if (Object.hasOwn(byTag_default, tag) === true) {
        byTag_default[tag](word, lex, methods19, model5);
      }
      lex[word] ||= tag;
    });
    delete lex[""];
    delete lex[null];
    delete lex[" "];
    return { lex, _multi };
  };
  var expand_default2 = expand3;

  // node_modules/compromise/src/2-two/preTagger/methods/quickSplit.js
  var splitOn = function(terms, i3) {
    const isNum = /^[0-9]+$/;
    const term = terms[i3];
    if (!term) {
      return false;
    }
    const maybeDate = /* @__PURE__ */ new Set(["may", "april", "august", "jan"]);
    if (term.normal === "like" || maybeDate.has(term.normal)) {
      return false;
    }
    if (term.tags.has("Place") || term.tags.has("Date")) {
      return false;
    }
    if (terms[i3 - 1]) {
      const lastTerm = terms[i3 - 1];
      if (lastTerm.tags.has("Date") || maybeDate.has(lastTerm.normal)) {
        return false;
      }
      if (lastTerm.tags.has("Adjective") || term.tags.has("Adjective")) {
        return false;
      }
    }
    const str = term.normal;
    if (str.length === 1 || str.length === 2 || str.length === 4) {
      if (isNum.test(str)) {
        return false;
      }
    }
    return true;
  };
  var quickSplit = function(document) {
    const splitHere = /[,:;]/;
    const arr = [];
    document.forEach((terms) => {
      let start2 = 0;
      terms.forEach((term, i3) => {
        if (splitHere.test(term.post) && splitOn(terms, i3 + 1)) {
          arr.push(terms.slice(start2, i3 + 1));
          start2 = i3 + 1;
        }
      });
      if (start2 < terms.length) {
        arr.push(terms.slice(start2, terms.length));
      }
    });
    return arr;
  };
  var quickSplit_default = quickSplit;

  // node_modules/compromise/src/2-two/preTagger/methods/looksPlural.js
  var isPlural = {
    e: ["mice", "louse", "antennae", "formulae", "nebulae", "vertebrae", "vitae"],
    i: ["tia", "octopi", "viri", "radii", "nuclei", "fungi", "cacti", "stimuli"],
    n: ["men"],
    t: ["feet"]
  };
  var exceptions3 = /* @__PURE__ */ new Set([
    // 'formulas',
    // 'umbrellas',
    // 'gorillas',
    // 'koalas',
    "israelis",
    "menus",
    "logos"
  ]);
  var notPlural = [
    "bus",
    "mas",
    //christmas
    "was",
    // 'las',
    "ias",
    //alias
    "xas",
    "vas",
    "cis",
    //probocis
    "lis",
    "nis",
    //tennis
    "ois",
    "ris",
    "sis",
    //thesis
    "tis",
    //mantis, testis
    "xis",
    "aus",
    "cus",
    "eus",
    //nucleus
    "fus",
    //doofus
    "gus",
    //fungus
    "ius",
    //radius
    "lus",
    //stimulus
    "nus",
    "das",
    "ous",
    "pus",
    //octopus
    "rus",
    //virus
    "sus",
    //census
    "tus",
    //status,cactus
    "xus",
    "aos",
    //chaos
    "igos",
    "ados",
    //barbados
    "ogos",
    "'s",
    "ss"
  ];
  var looksPlural = function(str) {
    if (!str || str.length <= 3) {
      return false;
    }
    if (exceptions3.has(str)) {
      return true;
    }
    const end2 = str[str.length - 1];
    if (Object.hasOwn(isPlural, end2)) {
      return isPlural[end2].find((suff) => str.endsWith(suff));
    }
    if (end2 !== "s") {
      return false;
    }
    if (notPlural.find((suff) => str.endsWith(suff))) {
      return false;
    }
    return true;
  };
  var looksPlural_default = looksPlural;

  // node_modules/compromise/src/2-two/preTagger/methods/index.js
  var methods_default9 = {
    two: {
      quickSplit: quickSplit_default,
      expandLexicon: expand_default2,
      transform: transform_default,
      looksPlural: looksPlural_default
    }
  };

  // node_modules/compromise/src/2-two/preTagger/model/_expand/irregulars.js
  var expandIrregulars = function(model5) {
    const { irregularPlurals } = model5.two;
    const { lexicon: lexicon4 } = model5.one;
    Object.entries(irregularPlurals).forEach((a) => {
      lexicon4[a[0]] ||= "Singular";
      lexicon4[a[1]] ||= "Plural";
    });
    return model5;
  };
  var irregulars_default = expandIrregulars;

  // node_modules/compromise/src/2-two/preTagger/model/_expand/index.js
  var tmpModel2 = {
    one: { lexicon: {} },
    two: { models: models_default }
  };
  var switchDefaults = {
    // 'pilot'
    "Actor|Verb": "Actor",
    //
    // 'amusing'
    "Adj|Gerund": "Adjective",
    //+conjugations
    // 'standard'
    "Adj|Noun": "Adjective",
    // 'boiled'
    "Adj|Past": "Adjective",
    //+conjugations
    // 'smooth'
    "Adj|Present": "Adjective",
    //+conjugations
    // 'box'
    "Noun|Verb": "Singular",
    //+conjugations (no-present)
    //'singing'
    "Noun|Gerund": "Gerund",
    //+conjugations
    // 'hope'
    "Person|Noun": "Noun",
    // 'April'
    "Person|Date": "Month",
    // 'rob'
    "Person|Verb": "FirstName",
    //+conjugations
    // 'victoria'
    "Person|Place": "Person",
    // 'rusty'
    "Person|Adj": "Comparable",
    // 'boxes'
    "Plural|Verb": "Plural",
    //(these are already derivative)
    // 'miles'
    "Unit|Noun": "Noun"
  };
  var expandLexicon = function(words, model5) {
    const world2 = { model: model5, methods: methods_default9 };
    const { lex, _multi } = methods_default9.two.expandLexicon(words, world2);
    Object.assign(model5.one.lexicon, lex);
    Object.assign(model5.one._multiCache, _multi);
    return model5;
  };
  var addUncountables = function(words, model5) {
    Object.keys(words).forEach((k2) => {
      if (words[k2] === "Uncountable") {
        model5.two.uncountable[k2] = true;
        words[k2] = "Uncountable";
      }
    });
    return model5;
  };
  var expandVerb = function(str, words, doPresent) {
    const obj = conjugate_default(str, tmpModel2);
    words[obj.PastTense] ||= "PastTense";
    words[obj.Gerund] ||= "Gerund";
    if (doPresent === true) {
      words[obj.PresentTense] ||= "PresentTense";
    }
  };
  var expandAdjective = function(str, words, model5) {
    const sup = toSuperlative2(str, model5);
    words[sup] ||= "Superlative";
    const comp = toComparative2(str, model5);
    words[comp] ||= "Comparative";
  };
  var expandNoun = function(str, words, model5) {
    const plur = toPlural_default(str, model5);
    words[plur] ||= "Plural";
  };
  var expandVariable = function(switchWords, model5) {
    const words = {};
    const actorPlurals = {};
    const lex = model5.one.lexicon;
    Object.keys(switchWords).forEach((w) => {
      const name = switchWords[w];
      words[w] = switchDefaults[name];
      if (name === "Actor|Verb") {
        const plural2 = toPlural_default(w, model5);
        if (switchWords[plural2] === "Plural|Verb") {
          actorPlurals[plural2] = ["Plural", "Actor"];
        }
      }
      if (name === "Noun|Verb" || name === "Person|Verb" || name === "Actor|Verb") {
        expandVerb(w, lex, false);
      }
      if (name === "Adj|Present") {
        expandVerb(w, lex, true);
        expandAdjective(w, lex, model5);
      }
      if (name === "Person|Adj") {
        expandAdjective(w, lex, model5);
      }
      if (name === "Adj|Gerund" || name === "Noun|Gerund") {
        const inf = toInfinitive_default(w, tmpModel2, "Gerund");
        if (!lex[inf]) {
          words[inf] = "Infinitive";
        }
      }
      if (name === "Noun|Gerund" || name === "Adj|Noun" || name === "Person|Noun") {
        expandNoun(w, lex, model5);
      }
      if (name === "Adj|Past") {
        const inf = toInfinitive_default(w, tmpModel2, "PastTense");
        if (inf !== w && !lex[inf]) {
          words[inf] = "Infinitive";
        }
      }
    });
    Object.assign(words, actorPlurals);
    model5 = expandLexicon(words, model5);
    return model5;
  };
  var expand4 = function(model5) {
    model5 = expandLexicon(model5.one.lexicon, model5);
    model5 = addUncountables(model5.one.lexicon, model5);
    model5 = expandVariable(model5.two.switches, model5);
    model5 = irregulars_default(model5);
    return model5;
  };
  var expand_default3 = expand4;

  // node_modules/compromise/src/2-two/preTagger/model/index.js
  var model4 = {
    one: {
      _multiCache: {},
      lexicon: lexicon3,
      frozenLex: frozenLex_default
    },
    two: {
      irregularPlurals: plurals_default,
      models: models_default,
      suffixPatterns: suffixes_default2,
      prefixPatterns: prefixes_default2,
      endsWith: endsWith_default,
      neighbours: neighbours_default,
      regexNormal: regex_normal_default,
      regexText: regex_text_default,
      regexNumbers: regex_numbers_default,
      switches,
      clues: clues_default,
      uncountable: {},
      orgWords: orgWords_default,
      placeWords: placeWords_default
    }
  };
  model4 = expand_default3(model4);
  var model_default3 = model4;

  // node_modules/compromise/src/2-two/preTagger/compute/tagger/1st-pass/01-colons.js
  var byPunctuation = function(terms, i3, model5, world2) {
    const setTag2 = world2.methods.one.setTag;
    if (i3 === 0 && terms.length >= 3) {
      const hasColon = /:/;
      const post = terms[0].post;
      if (hasColon.test(post)) {
        const nextTerm = terms[1];
        if (nextTerm.tags.has("Value") || nextTerm.tags.has("Email") || nextTerm.tags.has("PhoneNumber")) {
          return;
        }
        setTag2([terms[0]], "Expression", world2, null, `2-punct-colon''`);
      }
    }
  };
  var colons_default = byPunctuation;

  // node_modules/compromise/src/2-two/preTagger/compute/tagger/1st-pass/02-hyphens.js
  var byHyphen = (terms, i3, model5, world2) => {
    const { setTag: setTag2 } = world2.methods.one;
    const term = terms[i3];
    if (term.post === "-" && terms[i3 + 1]) {
      setTag2([term, terms[i3 + 1]], "Hyphenated", world2, null, "1-punct-hyphen");
    }
    const prev = terms[i3 - 1];
    if (!prev || prev.post !== "-") {
      return;
    }
    const before3 = terms[i3 - 2];
    if (/^(under|over|out|re|mis)$/.test(prev.normal) && term.switch === "Noun|Verb" && (before3?.tags.has("Pronoun") || before3?.tags.has("Modal"))) {
      setTag2([prev], "Prefix", world2, null, "3-hyphen-prefix");
      setTag2([prev], "Verb", world2, null, "3-hyphen-prefix");
      setTag2([term], "Infinitive", world2, null, "3-hyphen-prefix");
      return;
    }
    const offWhite = prev.normal === "off" && term.normal === "white";
    const numberFold = prev.tags.has("Value") && term.normal === "fold";
    const verbCompound = prev.tags.has("Infinitive") && !prev.tags.has("PhrasalVerb") && !term.tags.has("PhrasalVerb") && !term.tags.has("Pronoun");
    const nounParticiple = prev.switch === "Noun|Verb" && term.tags.has("PastTense") && (before3?.tags.has("Copula") || before3?.tags.has("Determiner"));
    if (offWhite || numberFold || verbCompound || nounParticiple) {
      setTag2([prev, term], "Adjective", world2, null, "3-hyphen-adjective");
    }
  };
  var hyphens_default = byHyphen;

  // node_modules/compromise/src/2-two/preTagger/compute/tagger/2nd-pass/00-tagSwitch.js
  var prefix3 = /^(under|over|mis|re|un|dis|semi)-?/;
  var tagSwitch = function(terms, i3, model5) {
    const switches2 = model5.two.switches;
    const term = terms[i3];
    if (Object.hasOwn(switches2, term.normal)) {
      term.switch = switches2[term.normal];
      return;
    }
    if (prefix3.test(term.normal)) {
      const stem = term.normal.replace(prefix3, "");
      if (stem.length > 3 && Object.hasOwn(switches2, stem)) {
        term.switch = switches2[stem];
      }
    }
  };
  var tagSwitch_default = tagSwitch;

  // node_modules/compromise/src/2-two/preTagger/compute/tagger/_fastTag.js
  var fastTag = function(term, tag, reason2) {
    if (!tag || tag.length === 0) {
      return;
    }
    if (term.frozen === true) {
      return;
    }
    term.tags ||= /* @__PURE__ */ new Set();
    const previous = debug_default.tags ? debug_default.before(term) : null;
    if (typeof tag === "string") {
      term.tags.add(tag);
    } else {
      tag.forEach((tg) => term.tags.add(tg));
    }
    if (previous) {
      debug_default.log(term, previous, reason2);
    }
  };
  var fastTag_default = fastTag;

  // node_modules/compromise/src/2-two/preTagger/compute/tagger/3rd-pass/_fillTags.js
  var uncountable = [
    "Acronym",
    "Abbreviation",
    "ProperNoun",
    "Uncountable",
    "Possessive",
    "Pronoun",
    "Activity",
    "Honorific",
    "Month"
  ];
  var setPluralSingular = function(term) {
    if (!term.tags.has("Noun") || term.tags.has("Plural") || term.tags.has("Singular")) {
      return;
    }
    if (uncountable.find((tag) => term.tags.has(tag))) {
      return;
    }
    if (looksPlural_default(term.normal)) {
      fastTag_default(term, "Plural", "3-plural-guess");
    } else {
      fastTag_default(term, "Singular", "3-singular-guess");
    }
  };
  var setTense = function(term) {
    const tags = term.tags;
    if (tags.has("Verb") && tags.size === 1) {
      const guess = getTense_default(term.normal);
      if (guess) {
        fastTag_default(term, guess, "3-verb-tense-guess");
        if (guess === "Infinitive" || guess === "Gerund") {
          fastTag_default(term, "PresentTense", "3-verb-tense-guess");
        }
      }
    }
  };
  var fillTags = function(terms, i3, model5) {
    const term = terms[i3];
    if (term.frozen === true) {
      return;
    }
    let remaining = term.tags.size;
    for (const tag of term.tags) {
      if (remaining === 0) {
        break;
      }
      remaining -= 1;
      const parents = model5.one.tagSet[tag]?.parents;
      if (parents) {
        if (debug_default.tags) {
          fastTag_default(term, parents, ` -inferred by #${tag}`);
        } else {
          for (let k2 = 0; k2 < parents.length; k2 += 1) {
            if (!term.tags.has(parents[k2])) {
              term.tags.add(parents[k2]);
            }
          }
        }
      }
    }
    setPluralSingular(term);
    setTense(term, model5);
  };
  var fillTags_default = fillTags;

  // node_modules/compromise/src/2-two/preTagger/compute/tagger/2nd-pass/01-case.js
  var titleCase3 = new RegExp("^\\p{Lu}[\\p{Ll}'\u2019]", "u");
  var hasNumber = /[0-9]/;
  var notProper = ["Date", "Month", "WeekDay", "Unit", "Expression"];
  var hasIVX = /[IVX]/;
  var romanNumeral = /^[IVXLCDM]{2,}$/;
  var romanNumValid = /^M{0,4}(CM|CD|D?C{0,3})(XC|XL|L?X{0,3})(IX|IV|V?I{0,3})$/;
  var nope = {
    li: true,
    dc: true,
    md: true,
    dm: true,
    ml: true
  };
  var checkCase = function(terms, i3, model5) {
    const term = terms[i3];
    term.index ||= [0, 0];
    const index3 = term.index[1];
    const str = term.text || "";
    if (index3 !== 0 && titleCase3.test(str) === true && hasNumber.test(str) === false) {
      if (notProper.find((tag) => term.tags.has(tag))) {
        return null;
      }
      if (term.tags.has("Comparative") && terms[i3 + 1]?.normal === "than") {
        return null;
      }
      if (i3 === 0 && term.tags.has("Gerund") && terms[i3 + 1]?.tags.has("Determiner")) {
        return null;
      }
      if (/["']$/.test(term.pre)) {
        return null;
      }
      if (term.normal === "the") {
        return null;
      }
      fillTags_default(terms, i3, model5);
      if (!term.tags.has("Noun") && !term.frozen) {
        unTag_default([term], "*", model5.one.tagSet, "2-titlecase");
      }
      fastTag_default(term, "ProperNoun", "2-titlecase");
      return true;
    }
    if (str.length >= 2 && romanNumeral.test(str) && hasIVX.test(str) && romanNumValid.test(str) && !nope[term.normal]) {
      fastTag_default(term, "RomanNumeral", "2-xvii");
      return true;
    }
    return null;
  };
  var case_default2 = checkCase;

  // node_modules/compromise/src/2-two/preTagger/compute/tagger/2nd-pass/02-suffix.js
  var suffixLoop2 = function(str = "", suffixes5 = []) {
    const len = str.length;
    let max3 = 7;
    if (len <= max3) {
      max3 = len - 1;
    }
    for (let i3 = max3; i3 > 1; i3 -= 1) {
      const suffix2 = str.substring(len - i3, len);
      if (Object.hasOwn(suffixes5[suffix2.length], suffix2) === true) {
        const tag = suffixes5[suffix2.length][suffix2];
        return tag;
      }
    }
    return null;
  };
  var tagBySuffix = function(terms, i3, model5) {
    const term = terms[i3];
    if (term.tags.size === 0) {
      let tag = suffixLoop2(term.normal, model5.two.suffixPatterns);
      if (tag !== null) {
        fastTag_default(term, tag, "2-suffix");
        term.confidence = 0.7;
        return true;
      }
      if (term.implicit) {
        tag = suffixLoop2(term.implicit, model5.two.suffixPatterns);
        if (tag !== null) {
          fastTag_default(term, tag, "2-implicit-suffix");
          term.confidence = 0.7;
          return true;
        }
      }
    }
    return null;
  };
  var suffix_default = tagBySuffix;

  // node_modules/compromise/src/2-two/preTagger/compute/tagger/2nd-pass/03-regex.js
  var hasApostrophe = /['‘’‛‵′`´]/;
  var doRegs = function(str, regs) {
    for (let i3 = 0; i3 < regs.length; i3 += 1) {
      if (regs[i3][0].test(str) === true) {
        return regs[i3];
      }
    }
    return null;
  };
  var doEndsWith = function(str = "", byEnd3) {
    const char = str[str.length - 1];
    if (Object.hasOwn(byEnd3, char) === true) {
      const regs = byEnd3[char] || [];
      for (let r = 0; r < regs.length; r += 1) {
        if (regs[r][0].test(str) === true) {
          return regs[r];
        }
      }
    }
    return null;
  };
  var checkRegex = function(terms, i3, model5, world2) {
    const setTag2 = world2.methods.one.setTag;
    const { regexText, regexNormal, regexNumbers, endsWith } = model5.two;
    const term = terms[i3];
    const normal = term.machine || term.normal;
    let text = term.implicit || term.text;
    if (hasApostrophe.test(term.post) && !hasApostrophe.test(term.pre)) {
      text += term.post.trim();
    }
    let arr = doRegs(text, regexText) || doRegs(normal, regexNormal);
    if (!arr && term.tags.size === 0 && normal !== term.normal) {
      arr = doRegs(term.normal, regexNormal);
    }
    if (!arr && /[0-9]/.test(normal)) {
      arr = doRegs(normal, regexNumbers);
    }
    if (!arr && term.tags.size === 0) {
      arr = doEndsWith(normal, endsWith);
    }
    if (arr) {
      setTag2([term], arr[1], world2, null, `2-regex-'${arr[2] || arr[0]}'`);
      term.confidence = 0.6;
      return true;
    }
    return null;
  };
  var regex_default = checkRegex;

  // node_modules/compromise/src/2-two/preTagger/compute/tagger/2nd-pass/04-prefix.js
  var prefixLoop = function(str = "", prefixes2 = []) {
    const len = str.length;
    let max3 = 7;
    if (max3 > len - 3) {
      max3 = len - 3;
    }
    for (let i3 = max3; i3 > 2; i3 -= 1) {
      const prefix5 = str.substring(0, i3);
      if (Object.hasOwn(prefixes2[prefix5.length], prefix5) === true) {
        const tag = prefixes2[prefix5.length][prefix5];
        return tag;
      }
    }
    return null;
  };
  var checkPrefix = function(terms, i3, model5) {
    const term = terms[i3];
    if (term.tags.size === 0) {
      const tag = prefixLoop(term.normal, model5.two.prefixPatterns);
      if (tag !== null) {
        fastTag_default(term, tag, "2-prefix");
        term.confidence = 0.5;
        return true;
      }
    }
    return null;
  };
  var prefix_default = checkPrefix;

  // node_modules/compromise/src/2-two/preTagger/compute/tagger/2nd-pass/05-year.js
  var min = 1400;
  var max2 = 2100;
  var dateWords = /* @__PURE__ */ new Set([
    "in",
    "on",
    "by",
    "until",
    "for",
    "to",
    "during",
    "throughout",
    "through",
    "within",
    "before",
    "after",
    "of",
    "this",
    "next",
    "last",
    "circa",
    "around",
    "post",
    "pre",
    "budget",
    "classic",
    "plan",
    "may"
  ]);
  var seemsGood = function(term) {
    if (!term) {
      return false;
    }
    const str = term.normal || term.implicit;
    if (dateWords.has(str)) {
      return true;
    }
    if (term.tags.has("Date") || term.tags.has("Month") || term.tags.has("WeekDay") || term.tags.has("Year")) {
      return true;
    }
    if (term.tags.has("ProperNoun")) {
      return true;
    }
    return false;
  };
  var seemsOkay = function(term) {
    if (!term) {
      return false;
    }
    if (term.tags.has("Ordinal")) {
      return true;
    }
    if (term.tags.has("Cardinal") && term.normal.length < 3) {
      return true;
    }
    if (term.normal === "is" || term.normal === "was") {
      return true;
    }
    return false;
  };
  var seemsFine = function(term) {
    return term && (term.tags.has("Date") || term.tags.has("Month") || term.tags.has("WeekDay") || term.tags.has("Year"));
  };
  var tagYear = function(terms, i3) {
    const term = terms[i3];
    if (term.tags.has("NumericValue") && term.tags.has("Cardinal") && term.normal.length === 4) {
      const num = Number(term.normal);
      if (num && !isNaN(num)) {
        if (num > min && num < max2) {
          const lastTerm = terms[i3 - 1];
          const nextTerm = terms[i3 + 1];
          if (seemsGood(lastTerm) || seemsGood(nextTerm)) {
            return fastTag_default(term, "Year", "2-tagYear");
          }
          if (num >= 1920 && num < 2025) {
            if (seemsOkay(lastTerm) || seemsOkay(nextTerm)) {
              return fastTag_default(term, "Year", "2-tagYear-close");
            }
            if (seemsFine(terms[i3 - 2]) || seemsFine(terms[i3 + 2])) {
              return fastTag_default(term, "Year", "2-tagYear-far");
            }
            if (lastTerm && (lastTerm.tags.has("Determiner") || lastTerm.tags.has("Possessive"))) {
              if (nextTerm && nextTerm.tags.has("Noun") && !nextTerm.tags.has("Plural")) {
                return fastTag_default(term, "Year", "2-tagYear-noun");
              }
            }
          }
        }
      }
    }
    return null;
  };
  var year_default = tagYear;

  // node_modules/compromise/src/2-two/preTagger/compute/tagger/3rd-pass/07-verb-type.js
  var verbType = function(terms, i3, model5, world2) {
    const setTag2 = world2.methods.one.setTag;
    const term = terms[i3];
    const types = ["PastTense", "PresentTense", "Auxiliary", "Modal", "Particle"];
    if (term.tags.has("Verb")) {
      const type = types.find((typ) => term.tags.has(typ));
      if (!type) {
        setTag2([term], "Infinitive", world2, null, `2-verb-type''`);
      }
    }
  };
  var verb_type_default = verbType;

  // node_modules/compromise/src/2-two/preTagger/compute/tagger/3rd-pass/01-acronym.js
  var oneLetterAcronym2 = /^[A-Z]('s|,)?$/;
  var isUpperCase = /^[A-Z-]+$/;
  var upperThenS = /^[A-Z]+s$/;
  var periodAcronym2 = /^([A-Z]\.)+[A-Z]?,?$/;
  var noPeriodAcronym2 = /^[A-Z]{2,}('s|,)?$/;
  var lowerCaseAcronym2 = /^([a-z]\.)+[a-z]\.?$/;
  var oneLetterWord = {
    I: true,
    A: true
  };
  var places = {
    la: true,
    ny: true,
    us: true,
    dc: true,
    gb: true,
    uk: true
  };
  var isNoPeriodAcronym = function(term, model5) {
    let str = term.text;
    if (isUpperCase.test(str) === false) {
      if (str.length > 3 && upperThenS.test(str) === true) {
        str = str.replace(/s$/, "");
      } else {
        return false;
      }
    } else if (Object.hasOwn(places, term.normal) === true) {
      return true;
    }
    if (str.length > 5) {
      return false;
    }
    if (Object.hasOwn(oneLetterWord, str)) {
      return false;
    }
    if (Object.hasOwn(model5.one.lexicon, term.normal)) {
      return false;
    }
    if (periodAcronym2.test(str) === true) {
      return true;
    }
    if (lowerCaseAcronym2.test(str) === true) {
      return true;
    }
    if (oneLetterAcronym2.test(str) === true) {
      return true;
    }
    if (noPeriodAcronym2.test(str) === true) {
      return true;
    }
    return false;
  };
  var isAcronym3 = function(terms, i3, model5) {
    const term = terms[i3];
    if (term.tags.has("RomanNumeral") || term.tags.has("Acronym") || term.frozen) {
      return null;
    }
    if (isNoPeriodAcronym(term, model5)) {
      unTag_default([term], "*", model5.one.tagSet, "3-acronym");
      fastTag_default(term, ["Acronym", "Noun"], "3-no-period-acronym");
      if (places[term.normal] === true) {
        fastTag_default(term, "Place", "3-place-acronym");
      }
      if (upperThenS.test(term.text) === true) {
        fastTag_default(term, "Plural", "3-plural-acronym");
      }
      return true;
    }
    if (!Object.hasOwn(oneLetterWord, term.text) && oneLetterAcronym2.test(term.text)) {
      unTag_default([term], "*", model5.one.tagSet, "3-acronym");
      fastTag_default(term, ["Acronym", "Noun"], "3-one-letter-acronym");
      return true;
    }
    if (term.tags.has("Organization") && term.text.length <= 3) {
      fastTag_default(term, "Acronym", "3-org-acronym");
      return true;
    }
    if (term.tags.has("Organization") && isUpperCase.test(term.text) && term.text.length <= 6) {
      fastTag_default(term, "Acronym", "3-titlecase-acronym");
      return true;
    }
    return null;
  };
  var acronym_default = isAcronym3;

  // node_modules/compromise/src/2-two/preTagger/compute/tagger/3rd-pass/02-neighbours.js
  var lookAtWord = function(term, words) {
    if (!term) {
      return null;
    }
    const found = words.find((a) => term.normal === a[0]);
    if (found) {
      return found[1];
    }
    return null;
  };
  var lookAtTag = function(term, tags) {
    if (!term) {
      return null;
    }
    const found = tags.find((a) => term.tags.has(a[0]));
    if (found) {
      return found[1];
    }
    return null;
  };
  var neighbours = function(terms, i3, model5) {
    const { leftTags, leftWords, rightWords, rightTags } = model5.two.neighbours;
    const term = terms[i3];
    if (term.tags.size === 0) {
      let tag = null;
      tag ||= lookAtWord(terms[i3 - 1], leftWords);
      tag ||= lookAtWord(terms[i3 + 1], rightWords);
      tag ||= lookAtTag(terms[i3 - 1], leftTags);
      tag ||= lookAtTag(terms[i3 + 1], rightTags);
      if (tag) {
        fastTag_default(term, tag, "3-[neighbour]");
        fillTags_default(terms, i3, model5);
        terms[i3].confidence = 0.2;
        return true;
      }
    }
    return null;
  };
  var neighbours_default2 = neighbours;

  // node_modules/compromise/src/2-two/preTagger/compute/tagger/3rd-pass/03-orgWords.js
  var isTitleCase3 = (str) => new RegExp("^\\p{Lu}[\\p{Ll}'\u2019]", "u").test(str);
  var isOrg = function(term, i3, yelling) {
    if (!term) {
      return false;
    }
    if (term.tags.has("FirstName") || term.tags.has("Place")) {
      return false;
    }
    if (term.tags.has("ProperNoun") || term.tags.has("Organization") || term.tags.has("Acronym")) {
      return true;
    }
    if (!yelling && isTitleCase3(term.text)) {
      if (i3 === 0) {
        return term.tags.has("Singular");
      }
      return true;
    }
    return false;
  };
  var tagOrgs = function(terms, i3, world2, yelling) {
    const orgWords = world2.model.two.orgWords;
    const setTag2 = world2.methods.one.setTag;
    const term = terms[i3];
    const str = term.machine || term.normal;
    if (orgWords[str] === true && isOrg(terms[i3 - 1], i3 - 1, yelling)) {
      setTag2([terms[i3]], "Organization", world2, null, "3-[org-word]");
      for (let t2 = i3; t2 >= 0; t2 -= 1) {
        if (isOrg(terms[t2], t2, yelling)) {
          setTag2([terms[t2]], "Organization", world2, null, "3-[org-word]");
        } else {
          break;
        }
      }
    }
    return null;
  };
  var orgWords_default2 = tagOrgs;

  // node_modules/compromise/src/2-two/preTagger/compute/tagger/3rd-pass/04-placeWords.js
  var isTitleCase4 = (str) => new RegExp("^\\p{Lu}[\\p{Ll}'\u2019]", "u").test(str);
  var isPossessive = /'s$/;
  var placeCont = /* @__PURE__ */ new Set([
    "athletic",
    "city",
    "community",
    "eastern",
    "federal",
    "financial",
    "great",
    "historic",
    "historical",
    "local",
    "memorial",
    "municipal",
    "national",
    "northern",
    "provincial",
    "southern",
    "state",
    "western",
    "spring",
    "pine",
    "sunset",
    "view",
    "oak",
    "maple",
    "spruce",
    "cedar",
    "willow"
  ]);
  var noBefore = /* @__PURE__ */ new Set(["center", "centre", "way", "range", "bar", "bridge", "field", "pit"]);
  var isPlace = function(term, i3, yelling) {
    if (!term) {
      return false;
    }
    const tags = term.tags;
    if (tags.has("Organization") || tags.has("Possessive") || isPossessive.test(term.normal)) {
      return false;
    }
    if (tags.has("ProperNoun") || tags.has("Place")) {
      return true;
    }
    if (!yelling && isTitleCase4(term.text)) {
      if (i3 === 0) {
        return tags.has("Singular");
      }
      return true;
    }
    return false;
  };
  var tagOrgs2 = function(terms, i3, world2, yelling) {
    const placeWords = world2.model.two.placeWords;
    const setTag2 = world2.methods.one.setTag;
    const term = terms[i3];
    const str = term.machine || term.normal;
    if (placeWords[str] === true) {
      for (let n2 = i3 - 1; n2 >= 0; n2 -= 1) {
        if (placeCont.has(terms[n2].normal)) {
          continue;
        }
        if (isPlace(terms[n2], n2, yelling)) {
          setTag2(terms.slice(n2, i3 + 1), "Place", world2, null, "3-[place-of-foo]");
          continue;
        }
        break;
      }
      if (noBefore.has(str)) {
        return false;
      }
      for (let n2 = i3 + 1; n2 < terms.length; n2 += 1) {
        if (isPlace(terms[n2], n2, yelling)) {
          setTag2(terms.slice(i3, n2 + 1), "Place", world2, null, "3-[foo-place]");
          return true;
        }
        if (terms[n2].normal === "of" || placeCont.has(terms[n2].normal)) {
          continue;
        }
        break;
      }
    }
    return null;
  };
  var placeWords_default2 = tagOrgs2;

  // node_modules/compromise/src/2-two/preTagger/compute/tagger/3rd-pass/05-fallback.js
  var nounFallback = function(terms, i3, model5) {
    let isEmpty = false;
    const tags = terms[i3].tags;
    if (tags.size === 0) {
      isEmpty = true;
    } else if (tags.size === 1) {
      if (tags.has("Hyphenated") || tags.has("HashTag") || tags.has("Prefix") || tags.has("SlashedTerm")) {
        isEmpty = true;
      }
    }
    if (isEmpty) {
      fastTag_default(terms[i3], "Noun", "3-[fallback]");
      fillTags_default(terms, i3, model5);
      terms[i3].confidence = 0.1;
    }
  };
  var fallback_default = nounFallback;

  // node_modules/compromise/src/2-two/preTagger/compute/tagger/3rd-pass/_adhoc.js
  var isTitleCase5 = /^[A-Z][a-z]/;
  var isCapital = (terms, i3) => {
    if (terms[i3].tags.has("ProperNoun") && isTitleCase5.test(terms[i3].text)) {
      return "Noun";
    }
    return null;
  };
  var isAlone = (terms, i3, tag) => {
    if (i3 === 0 && !terms[1]) {
      return tag;
    }
    return null;
  };
  var isEndNoun = function(terms, i3) {
    if (!terms[i3 + 1] && terms[i3 - 1] && terms[i3 - 1].tags.has("Determiner")) {
      return "Noun";
    }
    return null;
  };
  var isStart = function(terms, i3, tag) {
    if (i3 === 0 && terms.length > 3) {
      return tag;
    }
    return null;
  };
  var questionWords = /* @__PURE__ */ new Set(["why", "when", "where", "how"]);
  var doForms = /* @__PURE__ */ new Set(["do", "does", "did"]);
  var isQuestionVerb = (terms, i3) => {
    let n2 = questionWords.has(terms[0].normal) ? 1 : 0;
    if (n2 === 0 && !terms[terms.length - 1].post.includes("?")) {
      return null;
    }
    const auxiliary2 = terms[n2];
    if (!auxiliary2 || !doForms.has(auxiliary2.normal) && !auxiliary2.tags.has("Modal")) {
      return null;
    }
    n2 += 1;
    if (terms[n2]?.tags.has("Determiner") || terms[n2]?.tags.has("Possessive")) {
      n2 += 1;
      for (; n2 < i3 && (terms[n2].tags.has("Adjective") || terms[n2].tags.has("Adverb")); n2 += 1) {
      }
    }
    if (n2 >= i3 || !terms[n2]?.tags.has("Noun")) {
      return null;
    }
    n2 += 1;
    for (; n2 < i3 && (terms[n2].tags.has("Adverb") || terms[n2].tags.has("Negative")); n2 += 1) {
    }
    if (n2 !== i3 || terms.slice(i3 + 1).some((t2) => !t2.tags.has("Adverb") && !t2.tags.has("Date"))) {
      return null;
    }
    return "Infinitive";
  };
  var adhoc = {
    "Adj|Gerund": (terms, i3) => {
      return isCapital(terms, i3);
    },
    "Adj|Noun": (terms, i3) => {
      return isCapital(terms, i3) || isEndNoun(terms, i3);
    },
    "Actor|Verb": (terms, i3) => {
      return isCapital(terms, i3);
    },
    "Adj|Past": (terms, i3) => {
      let before3 = i3 - 1;
      for (; before3 >= 0; before3 -= 1) {
        const term = terms[before3];
        if (!term.tags.has("Adverb") && !term.tags.has("Negative") && term.normal !== "since") {
          break;
        }
      }
      if (/^(have|has|had)$/.test(terms[before3]?.normal)) {
        return "PastTense";
      }
      return isCapital(terms, i3);
    },
    "Adj|Present": (terms, i3) => {
      let before3 = i3 - 1;
      if (terms[before3]?.tags.has("Negative")) {
        before3 -= 1;
      }
      if (terms[before3]?.tags.has("Copula")) {
        return "Adjective";
      }
      return isCapital(terms, i3);
    },
    "Noun|Gerund": (terms, i3) => {
      return isCapital(terms, i3);
    },
    "Noun|Verb": (terms, i3) => {
      if (terms[i3 - 1]?.normal === "even" && terms[i3 - 2]?.tags.has("Determiner")) {
        return "Singular";
      }
      return isQuestionVerb(terms, i3) || i3 > 0 && isCapital(terms, i3) || isAlone(terms, i3, "Infinitive");
    },
    "Plural|Verb": (terms, i3) => {
      const subject3 = terms[i3 - 2]?.normal;
      if (terms[i3 - 1]?.normal === "still" && (subject3 === "this" || subject3 === "that")) {
        return "PresentTense";
      }
      return isCapital(terms, i3) || isAlone(terms, i3, "PresentTense") || isStart(terms, i3, "Plural");
    },
    "Person|Noun": (terms, i3) => {
      const before3 = terms[i3 - 1];
      if (before3?.tags.has("Determiner") || before3?.tags.has("Possessive")) {
        return "Singular";
      }
      if (isTitleCase5.test(terms[i3].text)) {
        if (i3 > 0 || terms[i3 + 1]?.tags.has("Verb") && !terms[i3 + 1].tags.has("Copula") && terms[i3 + 2]?.tags.has("Pronoun")) {
          return "Person";
        }
      }
      return null;
    },
    "Person|Verb": (terms, i3) => {
      if (i3 !== 0) {
        return isCapital(terms, i3);
      }
      return null;
    },
    "Person|Adj": (terms, i3) => {
      if (i3 === 0 && terms.length > 1) {
        return "Person";
      }
      return isCapital(terms, i3) ? "Person" : null;
    }
  };
  var adhoc_default = adhoc;

  // node_modules/compromise/src/2-two/preTagger/compute/tagger/3rd-pass/06-switches.js
  var prefix4 = /^(under|over|mis|re|un|dis|semi)-?/;
  var checkWord = (term, obj) => {
    if (!term || !obj) {
      return null;
    }
    const str = term.normal || term.implicit;
    let found = null;
    if (Object.hasOwn(obj, str)) {
      found = obj[str];
    }
    return found;
  };
  var checkTag = (term, obj = {}, tagSet) => {
    if (!term || !obj) {
      return null;
    }
    let found;
    let best = -1;
    for (const tag of term.tags) {
      if (obj[tag]) {
        const rank = tagSet[tag] ? tagSet[tag].parents.length : 0;
        if (rank > best) {
          found = tag;
          best = rank;
        }
      }
    }
    found = obj[found];
    return found;
  };
  var pickTag = function(terms, i3, clues5, model5) {
    if (!clues5) {
      return null;
    }
    let beforeIndex = i3 - 1;
    const previousTerm = terms[beforeIndex];
    if (previousTerm && previousTerm.text === "also") {
      beforeIndex = Math.max(0, i3 - 2);
    }
    if (previousTerm?.normal === "each" && /^(we|they)$/.test(terms[i3 - 2]?.normal)) {
      beforeIndex = i3 - 2;
    }
    const tagSet = model5.one.tagSet;
    let tag = checkWord(terms[i3 + 1], clues5.afterWords);
    tag ||= checkWord(terms[beforeIndex], clues5.beforeWords);
    tag ||= checkTag(terms[beforeIndex], clues5.beforeTags, tagSet);
    tag ||= checkTag(terms[i3 + 1], clues5.afterTags, tagSet);
    return tag;
  };
  var doSwitches = function(terms, i3, world2) {
    const term = terms[i3];
    if (!term.switch) {
      return;
    }
    const model5 = world2.model;
    const setTag2 = world2.methods.one.setTag;
    const { switches: switches2, clues: clues5 } = model5.two;
    let str = term.normal || term.implicit || "";
    if (prefix4.test(str) && !switches2[str]) {
      str = str.replace(prefix4, "");
    }
    const form = term.switch;
    if (term.tags.has("Acronym") || term.tags.has("PhrasalVerb") || term.tags.has("SportsTeam")) {
      return;
    }
    let tag = pickTag(terms, i3, clues5[form], model5);
    if (adhoc_default[form]) {
      tag = adhoc_default[form](terms, i3) || tag;
    }
    if (form === "Actor|Verb" && tag === "Singular") {
      tag = "Actor";
    }
    if (form === "Person|Noun" && tag === "Singular" && looksPlural_default(str)) {
      tag = "Plural";
    }
    if (str === "drew" && (tag === "Verb" || tag === "Infinitive" || tag === "PresentTense")) {
      tag = "PastTense";
    }
    if (tag) {
      setTag2([term], tag, world2, null, `3-[switch] (${form})`);
      fillTags_default(terms, i3, model5);
    }
  };
  var switches_default = doSwitches;

  // node_modules/compromise/src/2-two/preTagger/compute/tagger/3rd-pass/08-imperative.js
  var beside = {
    there: true,
    //go there
    this: true,
    //try this
    it: true,
    //do it
    him: true,
    her: true,
    us: true
    //tell us
  };
  var imperative = function(terms, world2) {
    const setTag2 = world2.methods.one.setTag;
    const t2 = terms[0];
    const next = terms[1];
    const goTo = t2.normal === "go" && next?.normal === "to" && terms.length >= 3;
    const keepIt = t2.normal === "keep" && next?.normal === "it" && terms[2]?.tags.has("Adjective");
    if (goTo || keepIt) {
      setTag2([t2], "Imperative", world2, null, "3-[imperative]");
      return;
    }
    const multiWords = world2.model.one._multiCache || {};
    const isRight = t2.switch === "Noun|Verb" || t2.tags.has("Infinitive");
    if (isRight && terms.length >= 2) {
      if (terms.length < 4 && !beside[terms[1].normal]) {
        return;
      }
      if (!t2.tags.has("PhrasalVerb") && Object.hasOwn(multiWords, t2.normal)) {
        return;
      }
      const nextNoun = terms[1].tags.has("Noun") || terms[1].tags.has("Determiner");
      if (nextNoun) {
        const soonVerb = terms.slice(1, 3).some((term) => term.tags.has("Verb"));
        if (!soonVerb || t2.tags.has("#PhrasalVerb")) {
          setTag2([t2], "Imperative", world2, null, "3-[imperative]");
        }
      }
    }
  };
  var imperative_default = imperative;

  // node_modules/compromise/src/2-two/preTagger/compute/tagger/3rd-pass/09-first-word.js
  var reason = "3-[first-word]";
  var expressions = {
    beforeAdj: /* @__PURE__ */ new Set(["well", "so", "okay", "now"]),
    withComma: /* @__PURE__ */ new Set(["shoot", "say", "like"])
  };
  var firstWord = function(terms, world2) {
    const setTag2 = world2.methods.one.setTag;
    const str = terms[0].normal;
    if (expressions.beforeAdj.has(str)) {
      if (terms[1] && !terms[1].tags.has("Adjective")) {
        setTag2([terms[0]], "Expression", world2, null, reason);
      }
      if (terms.length === 1) {
        setTag2([terms[0]], "Expression", world2, null, reason);
      }
    }
    if (expressions.withComma.has(str)) {
      if (/,/.test(terms[0].post)) {
        setTag2([terms[0]], "Expression", world2, null, reason);
      }
    }
  };
  var first_word_default = firstWord;

  // node_modules/compromise/src/2-two/preTagger/compute/tagger/index.js
  var ignoreCase = function(terms) {
    if (terms.filter((t2) => !t2.tags.has("ProperNoun")).length <= 3) {
      return false;
    }
    const lowerCase = /^[a-z]/;
    return terms.every((t2) => !lowerCase.test(t2.text));
  };
  var firstPass = function(docs, model5, world2) {
    docs.forEach((terms) => {
      colons_default(terms, 0, model5, world2);
    });
  };
  var secondPass = function(terms, model5, world2, isYelling) {
    for (let i3 = 0; i3 < terms.length; i3 += 1) {
      if (terms[i3].frozen === true) {
        continue;
      }
      tagSwitch_default(terms, i3, model5);
      if (isYelling === false) {
        case_default2(terms, i3, model5);
      }
      suffix_default(terms, i3, model5);
      regex_default(terms, i3, model5, world2);
      prefix_default(terms, i3, model5);
      year_default(terms, i3, model5);
    }
  };
  var thirdPass = function(terms, model5, world2, isYelling) {
    for (let i3 = 0; i3 < terms.length; i3 += 1) {
      let found = acronym_default(terms, i3, model5);
      fillTags_default(terms, i3, model5);
      found ||= neighbours_default2(terms, i3, model5);
      found ||= fallback_default(terms, i3, model5);
    }
    for (let i3 = 0; i3 < terms.length; i3 += 1) {
      if (terms[i3].frozen === true) {
        continue;
      }
      orgWords_default2(terms, i3, world2, isYelling);
      placeWords_default2(terms, i3, world2, isYelling);
      switches_default(terms, i3, world2);
      verb_type_default(terms, i3, model5, world2);
      hyphens_default(terms, i3, model5, world2);
    }
    imperative_default(terms, world2);
    first_word_default(terms, world2);
  };
  var preTagger = function(view) {
    const { methods: methods19, model: model5, world: world2 } = view;
    const docs = view.docs;
    firstPass(docs, model5, world2);
    const document = methods19.two.quickSplit(docs);
    for (let n2 = 0; n2 < document.length; n2 += 1) {
      const terms = document[n2];
      const isYelling = ignoreCase(terms);
      secondPass(terms, model5, world2, isYelling);
      thirdPass(terms, model5, world2, isYelling);
    }
    return document;
  };
  var tagger_default2 = preTagger;

  // node_modules/compromise/src/2-two/preTagger/compute/root.js
  var toRoot = {
    // 'spencer's' -> 'spencer'
    "Possessive": (term) => {
      let str = term.machine || term.normal || term.text;
      str = str.replace(/'s$/, "");
      return str;
    },
    // 'drinks' -> 'drink'
    "Plural": (term, world2) => {
      const str = term.machine || term.normal || term.text;
      return world2.methods.two.transform.noun.toSingular(str, world2.model);
    },
    // ''
    "Copula": () => {
      return "is";
    },
    // 'walked' -> 'walk'
    "PastTense": (term, world2) => {
      const str = term.machine || term.normal || term.text;
      return world2.methods.two.transform.verb.toInfinitive(str, world2.model, "PastTense");
    },
    // 'walking' -> 'walk'
    "Gerund": (term, world2) => {
      const str = term.machine || term.normal || term.text;
      return world2.methods.two.transform.verb.toInfinitive(str, world2.model, "Gerund");
    },
    // 'walks' -> 'walk'
    "PresentTense": (term, world2) => {
      const str = term.machine || term.normal || term.text;
      if (term.tags.has("Infinitive")) {
        return str;
      }
      return world2.methods.two.transform.verb.toInfinitive(str, world2.model, "PresentTense");
    },
    // 'quieter' -> 'quiet'
    "Comparative": (term, world2) => {
      const str = term.machine || term.normal || term.text;
      return world2.methods.two.transform.adjective.fromComparative(str, world2.model);
    },
    // 'quietest' -> 'quiet'
    "Superlative": (term, world2) => {
      const str = term.machine || term.normal || term.text;
      return world2.methods.two.transform.adjective.fromSuperlative(str, world2.model);
    },
    // 'suddenly' -> 'sudden'
    "Adverb": (term, world2) => {
      const { fromAdverb } = world2.methods.two.transform.adjective;
      const str = term.machine || term.normal || term.text;
      return fromAdverb(str);
    }
  };
  var getRoot = function(view) {
    const world2 = view.world;
    const keys2 = Object.keys(toRoot);
    view.docs.forEach((terms) => {
      for (let i3 = 0; i3 < terms.length; i3 += 1) {
        const term = terms[i3];
        for (let k2 = 0; k2 < keys2.length; k2 += 1) {
          if (term.tags.has(keys2[k2])) {
            const fn = toRoot[keys2[k2]];
            const root = fn(term, world2);
            if (term.normal !== root) {
              term.root = root;
            }
            break;
          }
        }
      }
    });
  };
  var root_default = getRoot;

  // node_modules/compromise/src/2-two/preTagger/compute/penn.js
  var mapping = {
    // adverbs
    // 'Comparative': 'RBR',
    // 'Superlative': 'RBS',
    Adverb: "RB",
    // adjectives
    Comparative: "JJR",
    Superlative: "JJS",
    Adjective: "JJ",
    TO: "Conjunction",
    // verbs
    Modal: "MD",
    Auxiliary: "MD",
    Gerund: "VBG",
    //throwing
    PastTense: "VBD",
    //threw
    Participle: "VBN",
    //thrown
    PresentTense: "VBZ",
    //throws
    Infinitive: "VB",
    //throw
    Particle: "RP",
    //phrasal particle
    Verb: "VB",
    // throw
    // pronouns
    Pronoun: "PRP",
    // misc
    Cardinal: "CD",
    Conjunction: "CC",
    Determiner: "DT",
    Preposition: "IN",
    // 'Determiner': 'WDT',
    // 'Expression': 'FW',
    QuestionWord: "WP",
    Expression: "UH",
    //nouns
    Possessive: "POS",
    ProperNoun: "NNP",
    Person: "NNP",
    Place: "NNP",
    Organization: "NNP",
    Singular: "NN",
    Plural: "NNS",
    Noun: "NN",
    There: "EX"
    //'there'
    // 'Adverb':'WRB',
    // 'Noun':'PDT', //predeterminer
    // 'Noun':'NFP', //
    //  WDT 	Wh-determiner
    // 	WP 	Wh-pronoun
    // 	WP$ 	Possessive wh-pronoun
    // 	WRB 	Wh-adverb
  };
  var toPenn = function(term) {
    if (/^[*/+=<>|~^×÷±≠≤≥]+$/.test(term.text)) {
      return "SYM";
    }
    if (term.text === "$") {
      return "$";
    }
    if (term.text === "\xA3" || term.text === "#") {
      return "#";
    }
    if (term.tags.has("ProperNoun") && term.tags.has("Plural")) {
      return "NNPS";
    }
    if (term.tags.has("Possessive") && term.tags.has("Pronoun")) {
      return "PRP$";
    }
    if (term.normal === "there") {
      return "EX";
    }
    if (term.normal === "to") {
      return "TO";
    }
    const arr = term.tagRank || [];
    for (let i3 = 0; i3 < arr.length; i3 += 1) {
      if (Object.hasOwn(mapping, arr[i3])) {
        return mapping[arr[i3]];
      }
    }
    return null;
  };
  var pennTag = function(view) {
    view.compute("tagRank");
    view.docs.forEach((terms) => {
      terms.forEach((term) => {
        term.penn = toPenn(term);
      });
    });
  };
  var penn_default = pennTag;

  // node_modules/compromise/src/2-two/preTagger/compute/index.js
  var compute_default9 = { preTagger: tagger_default2, root: root_default, penn: penn_default };

  // node_modules/compromise/src/2-two/preTagger/plugin.js
  var plugin_default14 = {
    compute: compute_default9,
    methods: methods_default9,
    model: model_default3,
    tags: tagSet_default,
    hooks: ["preTagger"]
  };

  // node_modules/compromise/src/2-two/contraction-two/api/contract.js
  var postPunct = /[,)"';:\-–—.…]/;
  var contractTerms = function(terms, suffix2) {
    for (let i3 = 0; i3 < terms.length - 1; i3++) {
      const t2 = terms[i3];
      if (postPunct.test(t2.post)) {
        return;
      }
    }
    terms[0].implicit = terms[0].normal;
    terms[0].text += suffix2;
    terms[0].normal += suffix2;
    terms.slice(1).forEach((t2) => {
      t2.implicit = t2.normal;
      t2.text = "";
      t2.normal = "";
    });
    for (let i3 = 0; i3 < terms.length - 1; i3++) {
      terms[i3].post = terms[i3].post.replace(/ /, "");
    }
  };
  var setContraction = function(m3, suffix2) {
    m3.docs.forEach((terms) => contractTerms(terms, suffix2));
  };
  var contract = function() {
    const doc = this.not("@hasContraction");
    let m3 = doc.match("(we|they|you) are");
    setContraction(m3, `'re`);
    m3 = doc.match("(he|she|they|it|we|you) will");
    setContraction(m3, `'ll`);
    m3 = doc.match("(he|she|they|it|we) is");
    setContraction(m3, `'s`);
    m3 = doc.match("#Person is");
    setContraction(m3, `'s`);
    m3 = doc.match("#Person would");
    setContraction(m3, `'d`);
    m3 = doc.match("(is|was|were|had|would|should|could|do|does|did|have|has) not").ifNo("@hasContraction");
    setContraction(m3, `n't`);
    m3 = doc.match("can not");
    setContraction(m3, `'t`);
    m3 = doc.match("(i|we|they) have");
    setContraction(m3, `'ve`);
    m3 = doc.match("(would|should|could) have");
    setContraction(m3, `'ve`);
    m3 = doc.match("i am");
    setContraction(m3, `'m`);
    m3 = doc.match("going to");
    return this;
  };
  var contract_default = contract;

  // node_modules/compromise/src/2-two/contraction-two/api/index.js
  var titleCase4 = new RegExp("^\\p{Lu}[\\p{Ll}'\u2019]", "u");
  var toTitleCase3 = function(str = "") {
    str = str.replace(/^ *[a-z\u00C0-\u00FF]/, (x) => x.toUpperCase());
    return str;
  };
  var api3 = function(View2) {
    class Contractions extends View2 {
      constructor(document, pointer, groups2) {
        super(document, pointer, groups2);
        this.viewType = "Contraction";
      }
      /** i've -> 'i have' */
      expand() {
        this.docs.forEach((terms) => {
          const isTitleCase6 = titleCase4.test(terms[0].text);
          terms.forEach((t2, i3) => {
            t2.text = t2.implicit || "";
            delete t2.implicit;
            if (i3 < terms.length - 1 && t2.post === "") {
              t2.post += " ";
            }
            t2.dirty = true;
          });
          if (isTitleCase6) {
            terms[0].text = toTitleCase3(terms[0].text);
          }
        });
        this.compute("normal");
        return this;
      }
    }
    View2.prototype.contractions = function() {
      const m3 = this.match("@hasContraction+");
      return new Contractions(this.document, m3.pointer);
    };
    View2.prototype.contract = contract_default;
  };
  var api_default10 = api3;

  // node_modules/compromise/src/2-two/contraction-two/compute/_splice.js
  var insertContraction2 = function(document, point, words) {
    const [n2, w] = point;
    if (!words || words.length === 0) {
      return;
    }
    words = words.map((word, i3) => {
      word.implicit = word.text;
      word.machine = word.text;
      word.pre = "";
      word.post = "";
      word.text = "";
      word.normal = "";
      word.index = [n2, w + i3];
      return word;
    });
    if (words[0]) {
      words[0].pre = document[n2][w].pre;
      words[words.length - 1].post = document[n2][w].post;
      words[0].text = document[n2][w].text;
      words[0].normal = document[n2][w].normal;
    }
    document[n2].splice(w, 1, ...words);
  };
  var splice_default2 = insertContraction2;

  // node_modules/compromise/src/2-two/contraction-two/compute/apostrophe-s.js
  var hasContraction3 = /'/;
  var hasWords = /* @__PURE__ */ new Set([
    "been",
    //the meeting's been ..
    "become"
    //my son's become
  ]);
  var isWords = /* @__PURE__ */ new Set([
    "what",
    //it's what
    "how",
    //it's how
    "when",
    "if",
    //it's if
    "too"
  ]);
  var adjLike = /* @__PURE__ */ new Set(["too", "also", "enough"]);
  var isOrHas = (terms, i3) => {
    for (let o = i3 + 1; o < terms.length; o += 1) {
      const t2 = terms[o];
      if (hasWords.has(t2.normal)) {
        return "has";
      }
      if (isWords.has(t2.normal)) {
        return "is";
      }
      if (t2.tags.has("Gerund")) {
        return "is";
      }
      if (t2.tags.has("Determiner")) {
        return "is";
      }
      if (t2.tags.has("Adjective")) {
        return "is";
      }
      if (t2.switch === "Adj|Past") {
        if (terms[o + 1]) {
          if (adjLike.has(terms[o + 1].normal)) {
            return "is";
          }
          if (terms[o + 1].tags.has("Preposition")) {
            return "is";
          }
        }
      }
      if (t2.tags.has("PastTense")) {
        if (terms[o + 1] && terms[o + 1].normal === "for") {
          return "is";
        }
        return "has";
      }
    }
    return "is";
  };
  var apostropheS = function(terms, i3) {
    const before3 = terms[i3].normal.split(hasContraction3)[0];
    if (before3 === "let") {
      return [before3, "us"];
    }
    if (before3 === "there") {
      const t2 = terms[i3 + 1];
      if (t2 && t2.tags.has("Plural")) {
        return [before3, "are"];
      }
    }
    if (isOrHas(terms, i3) === "has") {
      return [before3, "has"];
    }
    return [before3, "is"];
  };
  var apostrophe_s_default = apostropheS;

  // node_modules/compromise/src/2-two/contraction-two/compute/apostrophe-d.js
  var hasContraction4 = /'/;
  var hadWords = /* @__PURE__ */ new Set([
    "better",
    //had better
    "done",
    //had done
    "before",
    // he'd _ before
    "it",
    // he'd _ it
    "had"
    //she'd had -> she would have..
  ]);
  var wouldWords = /* @__PURE__ */ new Set([
    "have",
    // 'i'd have' -> i would have..
    "be"
    //' she'd be'
  ]);
  var hadOrWould = (terms, i3) => {
    for (let o = i3 + 1; o < terms.length; o += 1) {
      const t2 = terms[o];
      if (hadWords.has(t2.normal)) {
        return "had";
      }
      if (wouldWords.has(t2.normal)) {
        return "would";
      }
      if (t2.tags.has("PastTense") || t2.switch === "Adj|Past") {
        return "had";
      }
      if (t2.tags.has("PresentTense") || t2.tags.has("Infinitive")) {
        return "would";
      }
      if (t2.tags.has("#Determiner")) {
        return "had";
      }
      if (t2.tags.has("Adjective")) {
        return "would";
      }
    }
    return false;
  };
  var _apostropheD2 = function(terms, i3) {
    const before3 = terms[i3].normal.split(hasContraction4)[0];
    if (before3 === "how" || before3 === "what") {
      return [before3, "did"];
    }
    if (hadOrWould(terms, i3) === "had") {
      return [before3, "had"];
    }
    return [before3, "would"];
  };
  var apostrophe_d_default2 = _apostropheD2;

  // node_modules/compromise/src/2-two/contraction-two/compute/apostrophe-t.js
  var lastNoun = function(terms, i3) {
    for (let n2 = i3 - 1; n2 >= 0; n2 -= 1) {
      if (terms[n2].tags.has("Noun") || terms[n2].tags.has("Pronoun") || terms[n2].tags.has("Plural") || terms[n2].tags.has("Singular")) {
        return terms[n2];
      }
    }
    return null;
  };
  var apostropheT2 = function(terms, i3) {
    if (terms[i3].normal === "ain't" || terms[i3].normal === "aint") {
      if (terms[i3 + 1] && terms[i3 + 1].normal === "never") {
        return ["have"];
      }
      const noun3 = lastNoun(terms, i3);
      if (noun3) {
        if (noun3.normal === "we" || noun3.normal === "they") {
          return ["are", "not"];
        }
        if (noun3.normal === "i") {
          return ["am", "not"];
        }
        if (noun3.tags && noun3.tags.has("Plural")) {
          return ["are", "not"];
        }
      }
      return ["is", "not"];
    }
    const before3 = terms[i3].normal.replace(/n't/, "");
    return [before3, "not"];
  };
  var apostrophe_t_default2 = apostropheT2;

  // node_modules/compromise/src/2-two/contraction-two/compute/isPossessive.js
  var banList = {
    that: true,
    there: true,
    let: true,
    here: true,
    everywhere: true
  };
  var beforePossessive = {
    in: true,
    //in sunday's
    by: true,
    //by sunday's
    for: true
    //for sunday's
  };
  var adjLike2 = /* @__PURE__ */ new Set(["too", "also", "enough", "about"]);
  var nounLike = /* @__PURE__ */ new Set(["is", "are", "did", "were", "could", "should", "must", "had", "have"]);
  var copulas = /* @__PURE__ */ new Set(["is", "are", "was", "were", "am"]);
  var isPossessive2 = (terms, i3) => {
    const term = terms[i3];
    if (Object.hasOwn(banList, term.machine || term.normal)) {
      return false;
    }
    if (term.tags.has("Possessive")) {
      return true;
    }
    if (term.tags.has("QuestionWord")) {
      return false;
    }
    if (term.normal === `he's` || term.normal === `she's`) {
      return false;
    }
    const nextTerm = terms[i3 + 1];
    if (!nextTerm) {
      return true;
    }
    if (term.normal === `it's`) {
      if (nextTerm.tags.has("#Noun")) {
        return true;
      }
      return false;
    }
    if (nextTerm.switch == "Noun|Gerund") {
      const next2 = terms[i3 + 2];
      if (!next2) {
        if (term.tags.has("Actor") || term.tags.has("ProperNoun")) {
          return true;
        }
        return false;
      }
      if (next2.tags.has("Copula")) {
        return true;
      }
      if (next2.normal === "on" || next2.normal === "in") {
        return false;
      }
      return false;
    }
    if (nextTerm.tags.has("Verb")) {
      if (copulas.has(nextTerm.normal)) {
        return true;
      }
      if (nextTerm.tags.has("Infinitive")) {
        return true;
      }
      if (nextTerm.tags.has("Gerund")) {
        return false;
      }
      if (nextTerm.tags.has("PresentTense")) {
        return true;
      }
      return false;
    }
    if (nextTerm.switch === "Adj|Noun") {
      const twoTerm = terms[i3 + 2];
      if (!twoTerm) {
        return false;
      }
      if (nounLike.has(twoTerm.normal)) {
        return true;
      }
      if (adjLike2.has(twoTerm.normal)) {
        return false;
      }
    }
    if (nextTerm.tags.has("Noun")) {
      const nextStr = nextTerm.machine || nextTerm.normal;
      if (nextStr === "here" || nextStr === "there" || nextStr === "everywhere") {
        return false;
      }
      if (nextTerm.tags.has("Possessive")) {
        return false;
      }
      if (nextTerm.tags.has("ProperNoun") && !term.tags.has("ProperNoun")) {
        return false;
      }
      return true;
    }
    if (terms[i3 - 1] && beforePossessive[terms[i3 - 1].normal] === true) {
      return true;
    }
    if (nextTerm.tags.has("Adjective")) {
      const twoTerm = terms[i3 + 2];
      if (!twoTerm) {
        return false;
      }
      if (twoTerm.tags.has("Noun") && !twoTerm.tags.has("Pronoun")) {
        const str = nextTerm.normal;
        if (str === "above" || str === "below" || str === "behind") {
          return false;
        }
        return true;
      }
      if (twoTerm.switch === "Noun|Verb") {
        return true;
      }
      return false;
    }
    if (nextTerm.tags.has("Value")) {
      return true;
    }
    return false;
  };
  var isPossessive_default = isPossessive2;

  // node_modules/compromise/src/2-two/contraction-two/compute/wanna.js
  var hasObject = (term) => term && ["Determiner", "Pronoun", "Possessive"].some((tag) => term.tags.has(tag));
  var wannaNoun = function(terms, i3) {
    if (terms[i3].normal !== "wanna") {
      return false;
    }
    const to = terms[i3 + 1];
    const next = terms[i3 + 2];
    if (!to || to.implicit !== "to" || !next) {
      return false;
    }
    if (next.tags.has("Verb") || next.tags.has("Adverb")) {
      return false;
    }
    if (hasObject(terms[i3 + 3])) {
      return false;
    }
    terms[i3].post = to.post;
    terms.splice(i3 + 1, 1);
    return true;
  };
  var wanna_default = wannaNoun;

  // node_modules/compromise/src/2-two/contraction-two/compute/index.js
  var byApostrophe2 = /'/;
  var reIndex = function(terms) {
    terms.forEach((t2, i3) => {
      if (t2.index) {
        t2.index[1] = i3;
      }
    });
  };
  var reTag2 = function(terms, view, start2, len) {
    const tmp = view.update();
    tmp.document = [terms];
    let end2 = start2 + len;
    if (start2 > 0) {
      start2 -= 1;
    }
    if (terms[end2]) {
      end2 += 1;
    }
    tmp.ptrs = [[0, start2, end2]];
    tmp.compute(["freeze", "lexicon", "preTagger", "unfreeze"]);
    reIndex(terms);
  };
  var byEnd2 = {
    // how'd
    d: (terms, i3) => apostrophe_d_default2(terms, i3),
    // we ain't
    t: (terms, i3) => apostrophe_t_default2(terms, i3),
    // bob's
    s: (terms, i3, world2) => {
      if (isPossessive_default(terms, i3)) {
        contractions_debug_default(terms[i3]);
        return world2.methods.one.setTag([terms[i3]], "Possessive", world2, null, "2-contraction");
      }
      return apostrophe_s_default(terms, i3);
    }
  };
  var toDocs2 = function(words, view, term) {
    contractions_debug_default(term, words);
    const doc = view.fromText(words.join(" "));
    doc.compute("id");
    return doc.docs[0];
  };
  var contractionTwo = (view) => {
    const { world: world2, document } = view;
    document.forEach((terms, n2) => {
      for (let i3 = terms.length - 1; i3 >= 0; i3 -= 1) {
        if (wanna_default(terms, i3)) {
          contractions_debug_default(terms[i3], ["want"]);
          reIndex(terms);
          continue;
        }
        if (terms[i3].implicit) {
          continue;
        }
        let after2 = null;
        if (byApostrophe2.test(terms[i3].normal) === true) {
          after2 = terms[i3].normal.split(byApostrophe2)[1];
        }
        let words = null;
        if (Object.hasOwn(byEnd2, after2)) {
          words = byEnd2[after2](terms, i3, world2);
        }
        if (words) {
          words = toDocs2(words, view, terms[i3]);
          splice_default2(document, [n2, i3], words);
          reTag2(document[n2], view, i3, words.length);
          continue;
        }
      }
    });
  };
  var compute_default10 = { contractionTwo };

  // node_modules/compromise/src/2-two/contraction-two/plugin.js
  var plugin_default15 = {
    compute: compute_default10,
    api: api_default10,
    hooks: ["contractionTwo"]
  };

  // node_modules/compromise/src/2-two/postTagger/model/_lib.js
  var expandTags = (value, bare = false) => {
    if (Array.isArray(value)) {
      return value.map((tag) => expandTags(tag, bare));
    }
    if (typeof value !== "string") {
      return value;
    }
    const pattern = bare ? /#?[a-z][a-z0-9]*/gi : /#[a-z][a-z0-9]*/gi;
    return value.replace(pattern, (token) => {
      const prefix5 = token.startsWith("#") ? "#" : "";
      const name = token.slice(prefix5.length);
      return prefix5 + (Object.hasOwn(aliases_default4, name) ? aliases_default4[name] : name);
    });
  };
  var lib_default10 = expandTags;

  // node_modules/compromise/src/2-two/postTagger/model/expand-rules.js
  var keys = { n: "notIf", u: "unTag" };
  var expandRules = (rules8) => rules8.map(([match2, tag, group, options = {}]) => {
    const rule = { match: lib_default10(match2) };
    if (tag != null) {
      rule.tag = lib_default10(tag, true);
    }
    if (group != null) {
      rule.group = group;
    }
    Object.keys(options).forEach((key) => {
      rule[keys[key] || key] = lib_default10(options[key], key === "u");
    });
    rule.reason = rule.match;
    return rule;
  });
  var expand_rules_default = expandRules;

  // node_modules/compromise/src/2-two/postTagger/model/index.js
  var noLy = "(hard|fast|late|early|high|right|deep|close|direct)";
  var infNouns = "(feel|sense|process|rush|side|bomb|bully|challenge|cover|crush|dump|exchange|flow|function|issue|lecture|limit|march|process)";
  var notIf2 = "(i|we|they)";
  var companySuffix = "(inc|ltd|llc|co|corp|corporation|company|limited)";
  var noun = "(#NN && !#Poss && !@hasComma)";
  var modifiers = "(#Det|#Poss)? #Adv+? #Adj+?";
  var subject = `${modifiers} ${noun}+`;
  var predicate = "#Adv+? not? (#V && !#Ger && !#Particle)";
  var rules = [
    // let the dough [rest] overnight → Infinitive
    ["let (#Det|#Poss)? #Adj+? #NN [(%Noun|Verb% && !#Plur)] (overnight|outside|inside|here)$", Inf, 0],
    // === verbs/passive.js ===
    // got walked → Passive
    ["got (#Past|#VBN)", "Pass"],
    // was walked; were walked → Passive (keep word-specific hooks)
    ...["were", "was", "is", "are", "am"].map((word) => [`${word} (#Past|#VBN)`, "Pass"]),
    // was being walked → Passive
    ["(was|were|is|are|am) being (#Past|#VBN)", "Pass"],
    // had been walked → Passive
    ["(had|have|has) been (#Past|#VBN)", "Pass"],
    // will be cleaned → Passive
    ["will be being? (#Past|#VBN)", "Pass"],
    // dog was [walked] by the man → Passive
    ["#NN (am|is|are|was|were) #Adv? [(#Past|#VBN)] by (the|a) #NN", "Pass", 0],
    // === adjective/adjective.js ===
    // Restore the copula when the colour is written without a hyphen.
    // [is] off white → Copula; remove PhrasalVerb
    ["[(is|are|am|was|were)] off white$", Cop, 0, { u: "PhrV" }],
    // is [off white] → Adjective
    ["(is|are|am|was|were) [off white]$", Adj, 0],
    // [all] the dogs → Noun
    ["[(all|both)] #Det #NN", NN, 0],
    // the door is [closed] → Adjective
    ["#Sing is #Adv? [%Adj|Past%]$", Adj, 0],
    // [forgotten] art is rediscovered → Adjective
    ["[#Past] #Sing is", Adj, 0],
    // [forgotten] stories are lost → Adjective
    ["[#Past] #Plur are", Adj, 0],
    // is [fucked up] → Adjective
    ["#Cop [fucked up?]", Adj, 0],
    // the door seems [opened] → Adjective
    ["#Sing (seems|appears) #Adv? [#Past$]", Adj, 0],
    // jury is out - preposition ➔ adjective
    // jury is [out] → Adjective
    ["#Cop #Adj? [(out|in|through)]$", Adj, 0],
    // [quiet] the room → Infinitive
    ["^[(#Adj && !near && !inside && !outside && !opposite)] (the|your) #NN", Inf, 0, { n: "(all|even)" }],
    // blue-[tinted] → Adjective
    ["(#Adj && #Hyphenated) [(#Hyphenated && #Past)]$", Adj, 0],
    // [blue-tinted] glasses → Adjective
    ["[#Hyphenated (#Hyphenated && #Past)] (#NN|#Conj)", Adj, 0, { n: "#Adv" }],
    // [non-breaking] spaces → Adjective
    ["[#Hyphenated (#Hyphenated && #Ger)] (#NN|#Conj)", Adj, 0, { n: "#Adv" }],
    // [dammed-up] river → Adjective
    ["[#Past (#Hyphenated && #PhrV)] (#NN|#Conj)", Adj, 0],
    // === adjective/adj-adverb.js ===
    // is [far too] cold → Adverb
    [`#Cop [far too] #Adj`, Adv, 0],
    // shops [direct] → Adverb
    [
      `#V [${noLy}] !#NN?`,
      Adv,
      0,
      { n: "(#Cop|be|been|being|get|got|getting|become|became|becoming|feel|feels|feeling|#Det|#Prep)" }
    ],
    // Bare 'be' may still be Infinitive rather than Copula in commands.
    // be [late] → Adjective
    ["(be|been|being) (#Adv|not)+? [late]", Adj, 0],
    // be [early] → Adjective
    ["(be|been|being) (#Adv|not)+? [early]", Adj, 0],
    // [moons] a lot → PresentTense
    [`[#Plur] a lot !like?`, Pres, 0],
    // === adjective/adj-gerund.js ===
    // Gerund-Adjectives - 'amusing, annoying'
    // found it [interesting] → Adjective
    ["found it #Adv? [%Adj|Gerund%]", Adj, 0],
    // found it [isolating], but found it isolating cells → Adjective
    ["found it #Adv? [isolating]$", Adj, 0],
    // a little [fuming] → Adjective
    ["a (little|bit|wee) bit? [#Ger]", Adj, 0],
    // repairing [crumbling] roads → Adjective
    [
      "#Ger [#Ger] #NN",
      Adj,
      0,
      { n: "(impersonating|practicing|considering|assuming|enjoying|avoiding|stopping|starting|finishing)" }
    ],
    // looked [amazing] → Adjective
    ["(looked|look|looks) #Adv? [%Adj|Gerund%]", Adj, 0, { n: "(impersonating|practicing|considering|assuming)" }],
    // meaning alluring → Gerund Adjective
    ["%Noun|Gerund% %Adj|Gerund%", "Ger #Adj"],
    // === adjective/adj-noun.js ===
    // his [fine] → Noun
    ["(his|its) [%Adj|Noun%] !#NN?", NN, 0, { n: "#Hyphenated" }],
    // is [all] → Noun
    ["#Cop #Adv? [all]", NN, 0],
    // have [fun] with it → Noun
    [`(have|had) [#Adj] #Prep .`, NN, 0],
    // brewing giant → Noun
    [`#Ger (giant|capital|center|zone|application)`, NN],
    // in a [perfect] → Noun
    [`#Prep (a|an) [#Adj]$`, NN, 0],
    // [brand] new → Adverb
    [`[brand #Ger?] new`, Adv, 0],
    // must-win → Adjective
    [`(must && #Hyphenated) .`, Adj],
    // the [present] → Noun
    [`#Det [#Adj]$`, NN, 0, { n: "(this|that|#Comp|#Sup)" }],
    //are that crazy.
    // company-wide → Adjective
    [`(#NN && #Hyphenated) (#Adj && #Hyphenated)`, Adj, null, { n: "(this|that|#Comp|#Sup)" }],
    // the [poor] were
    // {
    //   m: `#Det [#Adj] (#Cop|#Det)`,
    //   n: '(#Comp|#Sup)',
    //   g: 0,
    //   t: 'NN',
    // },
    // [professional] bodybuilder → Adjective
    [`[(%Adj|Noun% && !#Timezone && !#Value)] #NN`, Adj, 0, { n: "(#Pron|#Prop)" }],
    // === adverb.js ===
    // [way] too hot → Adverb
    ["[way] #Adv #Adj", Adv, 0],
    // sing [like] an angel → Adverb
    ["#V  [like]", Adv, 0, { n: "(#Mod|#PhrV)" }],
    // even left → Adverb Verb
    ["even left", "#Adv #V"],
    // cheering [hard] → Adverb
    [
      "#Pres [(hard|quick|bright|slow|fast|backwards|forwards)]",
      Adv,
      0,
      {
        n: "(#Cop|feel|feels|look|looks|seem|seems|appear|appears|sound|sounds|smell|smells|taste|tastes|become|becomes|grow|grows|get|gets|stay|stays|remain|remains)"
      }
    ],
    // a [bit] cold → Adverb
    ["a [(little|bit|wee) bit?] #Adj", Adv, 0],
    // become overly [weakened] → Adjective
    ["(become|fall|grow) #Adv? [#Past]", Adj, 0],
    // a completely [beaten] man → Adjective
    ["(a|an) #Adv [#VBN] #NN", Adj, 0],
    // a [close] friend
    // { m: '#Det #Adv? [close] #NN', g: 0, t: 'Adj' },
    // does [better] → Adverb
    ["(do|does|did) #Adv? [(better|worse)]", Adv, 0],
    // walking [close] → Adverb
    ["#Ger #Adv? [close]", Adv, 0, { n: "(getting|becoming|feeling)" }],
    // charged [back] → Adverb
    ["(#Pres|#Past) [back]", Adv, 0, { n: "(#PhrV|#Cop)" }],
    // the [well] → Noun
    ["#Det [well] !#Past?", NN, 0, { n: "well made" }],
    // sees [well] → Adverb
    ["(#Pres && !#Cop) [well]", Adv, 0],
    // === dates/date.js ===
    // ==== WeekDay ====
    // [sun] the 5th → WeekDay
    ["[sun] the #Ord", WeekDay, 0],
    // 1pm next [sun] → WeekDay
    ["#Date (on|this|next|last|during)? [sun]", WeekDay, 0],
    // ==== Month ====
    // this march → Date Month
    ["(this|next|last) march !#Inf?", "#Date #Month"],
    // this may → Date Month
    ["(this|next|last) may !#Inf?", "#Date #Month"],
    // march 5th → Month Date Date
    [`(march|may) the? #Value`, "#Month #Date #Date"],
    // 5th of march → Date Date Month
    [`#Value of? (march|may)`, "#Date #Date #Month"],
    // [march] and feb → Month
    [`[(march|may)] .? #Date`, "Month", 0],
    // feb to [march] → Month
    [`#Date .? [(march|may)]`, "Month", 0],
    // quickly [march] → Verb
    [`#Adv [(march|may)]`, Vb, 0, { n: "(early|late)" }],
    // === dates/date-phrase.js ===
    // 5th of June → Date
    ["#Value of #Month", Date2],
    // 5 June
    // { m: '#Card #Month', t: 'Date' },
    // June 5 to 7 → Date
    ["#Month #Value to #Value", Date2],
    // June the 12th → Date
    ["#Month the #Value", Date2],
    // june 7 → Date
    ["(#WeekDay|#Month) #Value", Date2],
    // 7 june → Date
    ["#Value (#WeekDay|#Month)", Date2],
    // aug 5th 2021 → Date
    [`#Month #Ord #Card`, Date2],
    // === timezones ===
    // china standard time → Timezone
    [`(#Place|#Dem) (standard|daylight|central|mountain)? time`, Timezone],
    // === nouns/nouns.js ===
    //'more' is not always an adverb
    // due to [weather] → Noun
    ["due to [#V]", NN, 0],
    // my first [thought] → Noun
    ["#Poss #Ord [#Past]", NN, 0],
    // the nice [walk] → Noun
    ["(the|this|those|these) #Adj [%Noun|Verb%]", NN, 0, { n: "#Cop" }],
    // the truly nice [swim] → Noun
    ["(the|this|those|these) #Adv #Adj [#V]", NN, 0],
    // the [message] from Danny → Noun
    ["the [#V] #Prep .", NN, 0],
    // a type of [shout] → Noun
    ["#Det #NN of [#V]", NN, 0, { n: "#Ger" }],
    // waited until [release] → Noun
    ["#Past #Prep [#Pres]", NN, 0, { n: "#Ger" }],
    // water-flows → Noun
    ["(#Sing && @hasHyphen && !must) #Pres", NN],
    // is no [going] back → Noun
    ["is no [#V]", NN, 0],
    // and check this out! a [walk-in] microwave. → Noun
    [
      "(the|those|these|a|an) #Adj? [(#Pres && !#Ger && !#Cop && !seem && !appear && !include) #Particle?]",
      NN,
      0,
      { n: "the (poor|rich|young|old|elderly|unemployed|homeless|disabled)" }
    ],
    // ==== Actor ====
    // Aircraft designer → Actor
    ["#NN #Actor", Actor, null, { n: "(#Pers|#Pron)" }],
    // lighting designer → Actor
    ["#Ger #Actor", Actor],
    // captain sanders
    // { match: '[#Actor+] #ProperNoun', group: 0, tag: 'Honorific' },
    // co founder → Actor
    [`co #Sing`, Actor],
    // [aircraft] designer → Actor
    [`[#NN+] #Actor`, Actor, 0, { n: "(#Hon|#Pron|#Poss)" }],
    // fine-artist → Actor
    [
      `(urban|cardiac|cardiovascular|respiratory|medical|clinical|visual|graphic|creative|dental|exotic|fine|certified|registered|technical|virtual|professional|amateur|junior|senior|special|pharmaceutical|theoretical)+ #NN? #Actor`,
      Actor
    ],
    // dance coach → Actor
    [`(#NN && !#Pron)+ (coach|chef|king|engineer|fellow|personality|boy|girl|man|woman|master)`, Actor],
    // chief design officer → Actor
    [`chief . officer`, Actor],
    // chief of police → Actor
    [`chief of #NN+`, Actor],
    // president of marketing → Actor
    [`senior? vice? president of #NN+`, Actor],
    // ==== Singular ====
    // did a [900], paid a [20] → Singular
    ["#V (a|an) [#Value]$", Sing, 0],
    // ==== Possessive ====
    // John Smith's → Possessive
    ["#First #Acronym? (#Poss && #Last)", Poss],
    // Microsoft Research's office → Possessive
    ["#Org+ #Poss", Poss],
    // Los Angeles's fundraiser → Possessive
    ["#Place+ #Poss", Poss],
    // my butt smells → Noun
    ["#Poss #Pres #Particle?", NN, null, { n: "(#Ger|#Copula|her)" }],
    // anna's eating vs anna's eating lunch
    // my [teachers] dog → Possessive
    ["(my|our|their|her|his|its) [(#Plur && #Actor)] #NN", Poss, 0],
    // 10th of a [second] → Singular; remove Value
    ["#Value of a [second]", Sing, 0, { u: Val }],
    // the euro [sense] → Noun
    [`#Det #NN [${infNouns}] !(#Prep|to|#Adv)?`, NN, 0],
    // [thanks] for the gift are overdue → Plural
    ["[#Pres] (of|by|for) (a|an|the) #NN #Cop", Plur, 0],
    // You eat and [sleep] → Infinitive
    ["#Inf and [%Noun|Verb%]", Inf, 0],
    // dogs and [running] and cats → Noun
    ["#NN and [#V] and #NN", NN, 0],
    // the 1992 [classic] → Noun
    ["the #Card [%Adj|Noun%]", NN, 0],
    // This is the [premier] university in Virginia → Adjective
    ["#Cop the [%Adj|Noun%] #NN", Adj, 0],
    // i ate [me] sandwich (scottish slang)
    // { m: 'i #V [me] #NN', g: 0, t: 'Poss' },
    // He bowed his [head] in prayer → Noun
    ["#Past #Poss [#V]", NN, 0, { n: "(saw|made)" }],
    // 35 [signs] → Plural
    ["#Value [%Plural|Verb%]", Plur, 0, { n: "(one|1|a|an)" }],
    // had [time] → Noun
    ["had [%Noun|Verb%]", NN, 0, { n: "(#Ger|come|become)" }],
    // instant access → Adjective Noun
    ["(%Adj|Noun% && !#Timezone) %Noun|Verb%", "#Adj #NN", null, { n: "#Prop #NN" }],
    // near death experiences, ambitious sales [targets] → Plural
    ["#Adj #NN [%Plural|Verb%]$", Plur, 0, { n: "#Pron" }],
    // your guild [colors] → Plural
    ["#Poss #NN [(colors|colours)]$", Plur, 0],
    // === verbs/noun-gerund.js ===
    // the [upcoming thank]-you → Singular
    ["(this|that|the|a|an) [#Ger #Inf]", Sing, 0],
    // the [upcoming thank]-you → Plural
    ["(that|the) [#Ger #Pres]", Plur, 0, { ifNo: "#Cop" }],
    // lexical [tagging] → Noun
    ["#Adj [#Ger]", NN, 0, { n: "(still|even|just)" }],
    // [walking] is cool → Activity
    ["[#Ger] #Adv? not? #Cop", "Activity", 0],
    // are [doing] is → Gerund
    ["#Cop [(#Ger|#Activity)] #Cop", Ger, 0],
    // responsibility for [setting] → Gerund
    ["#Sing for [%Noun|Gerund%]", Ger, 0],
    // better for [training] → Gerund
    ["#Comp (for|at) [%Noun|Gerund%]", Ger, 0],
    // apologized for [shouting] → Gerund
    ["(#Past|#Pres) for [%Noun|Gerund%]", Ger, 0],
    // he reads the [upcoming] → Noun
    ["#Pres the [#Ger]", NN, 0],
    // === verbs/verb-noun.js ===
    // A final button label is an object, not a second verb. → PresentTense Noun
    ...["click", "clicks", "selects", "pick", "picks"].map((word) => [
      `(#Pron|#Sing|#Plur) [${word} (submit|save|cancel)]$`,
      "Pres NN",
      0
    ]),
    // Common intransitive predicates after a singular subject. Keep arbitrary
    // plural/verb switches conservative: 'the dog treats' is a noun phrase.
    // the dog [runs] → PresentTense
    ...["runs", "walks", "barks", "swims", "sleeps"].map((word) => [
      `^(#Det|#Poss) #Adj+? #Sing #Adv+? [${word}] #Adv+?$`,
      Pres,
      0
    ]),
    // with heads and [arms] rolling around
    // { m: '#Prep #Plur and [%Plural|Verb%] #Ger', g: 0, t: 'Plur' },
    // he can solve the [puzzle] → Noun
    ["#Inf (this|that|the) [#Inf]", NN, 0],
    // keeping the [matter] a secret → Noun
    ["#Ger #Det [#Inf]", NN, 0],
    // the-only-[reason] → Noun
    ["#Det (only|further|just|more|backward) [#Inf]", NN, 0],
    // the [slide] makes noise → Noun
    ["(the|this|a|an) [#Inf] #Adv? #V", NN, 0],
    // Use a pointed [stick] (a pencil) or a similar tool → Noun
    ["#Det #Adj #Adj? [#Inf]", NN, 0, { n: "the (poor|rich|young|old|elderly|unemployed|homeless|disabled)" }],
    // the American [thank]-you letter → Noun
    ["#Det #Dem [#Pres]", NN, 0],
    // the next career [read] is brief → Noun
    ["#Adj #NN+ [#Inf] #Cop", NN, 0],
    // at some [thank]-you party → Noun
    ["at some [#Inf]", NN, 0],
    // goes [to sleep] → Preposition Noun
    ["(go|goes|went) [to (sleep|work)]", "Prep NN", 0],
    // a dog [retrieve] in the field → Noun
    ...["a", "an"].map((word) => [`${word} #Adj? #NN [#Inf] (#Prep|#NN)`, NN, 0, { n: "from" }]),
    // a software [reinstall] → Noun
    ["(a|an) #NN [#Inf]$", NN, 0],
    // working for [thank]-you letters → Noun
    ["#Ger #Adj? for [#Inf]", NN, 0],
    // artists on [thank]-you cards → Noun
    ["#Plur on [#Inf]", NN, 0],
    // number of [thank]-yous → Noun
    ["number of [#Pres]", NN, 0],
    // make [sense] → Noun
    ["(try|use|attempt|build|make) [%Noun|Verb% #Particle?]", NN, 0, { n: "(#Cop|#NN|sure|fun|up)" }],
    //make sure of
    // [append] is cloned → Noun
    ["^[#Inf] (is|was)", NN, 0],
    // get much [thank]-you mail
    // { m: '#Inf much [#Inf]', g: 0, t: 'NN' },
    // [cause] i gotta → Conjunction
    ["[cause] #Pron #V", Conj, 0],
    // the US [air] force
    // {
    //   m: 'the #Sing [#Inf] (#NN && !#Poss)',
    //   g: 0,
    //   t: 'NN',
    //   n: '#Pron',
    // },
    // this [rocks] → PresentTense
    ["this [#Plur]", Pres, 0, { n: "(#Prep|#Date)" }],
    // the thing [that runs] → Conjunction PresentTense
    ["#NN [that %Plural|Verb%]", "Conj Pres", 0, { n: "(#Prep|#Pron|way)" }],
    // that [leads] to
    // { m: 'that [#Plur] to', g: 0, t: 'Pres', n: '#Prep' },
    // let him [father] a child → Infinitive
    ...["let", "make", "made"].map((word) => [`${word} (him|her|it|#Pers|#Place|#Org)+ [#Sing] (a|an|the|it)`, Inf, 0]),
    // assign all [tasks] → Noun
    ["#V (all|every|each|most|some|no) [#Pres]", NN, 0, { n: "#Mod" }],
    // PresentTense/Noun ambiguities
    // Possession and copulas; other past verbs use wide-support below. → Noun
    ["(had|have|was|were) #Adj [#Pres]", NN, 0, { n: "better" }],
    // one big [thank]-you → Noun
    ["#Value #Adj [#Pres]", NN, 0, { n: "#Cop" }],
    // found all [upcoming] words → Noun
    ["#Past #Adj+ [#Pres]", NN, 0, { n: "(#Cop|better)" }],
    // many [thanks] → Noun
    ["(many|few|several|couple) [#Pres]", NN, 0, { n: "#Cop" }],
    // a very big [dream] → Noun
    ["#Det #Adv #Adj [%Noun|Verb%]", NN, 0, { n: "#Cop" }],
    // from start to [finish] → Noun
    ["from #NN to [%Noun|Verb%]", NN, 0],
    // for comparison or [contrast] → Noun
    ["(for|with|of) #NN (and|or|not) [%Noun|Verb%]", NN, 0, { n: "#Pron" }],
    // cute little [thank]-you bags → Noun
    ["#Adj #Adj [#Pres]", NN, 0, { n: "#Cop" }],
    // writing bigger [thank]-you notes → Noun
    ["#Ger #Adv? #Comp [#Pres]", NN, 0, { n: "#Cop" }],
    // to write people [thanks] for helping → Noun
    [`to #Pres #NN [#Pres] #Prep`, NN, 0],
    // waited until [release]
    // {
    //   m: `#Past (until|as|through|without) [(#Pres && !#Ger && !#Cop)]`,
    //   g: 0,
    //   t: 'NN',
    // },
    // selling like hot [thank]-you cards → Plural
    [`#Ger like #Adj? [#Pres]`, Plur, 0],
    // some nice [thank]-you notes → Noun
    [`some #Adj [#Pres]`, NN, 0],
    // for some [thank]-you letters → Noun
    [`for some [#Pres]`, NN, 0],
    // same kind of [shouts] → Noun
    [`(same|some|the|that|a) kind of [#Pres]`, NN, 0],
    // a type of [shout] → Noun
    [`(same|some|the|that|a) type of [#Pres]`, NN, 0],
    // looking good in [thank]-you photos → Noun
    [`#Ger #Adj #Prep [#Pres]`, NN, 0],
    // get better [thank]-you notes → Noun
    [`(get|got|have) #Comp [#Pres]`, NN, 0],
    // give up on [thank]-you letters → Noun
    [`#PhrV #Particle #Prep [#Pres]`, NN, 0],
    // there are [thank]-you notes → Plural
    ["there (are|were) #Adj? [#Pres]", Plur, 0],
    // a thousand [thanks] of gratitude → Plural
    ["#Value [#Pres] of", Plur, 0, { n: "(one|1|#Cop|#Inf)" }],
    // [thanks] are appreciated → Plural
    ["[#Pres] (are|were) #Adj", Plur, 0],
    // [hope] i helped → Infinitive
    ["^[(hope|guess|thought|think)] #Pron #V", Inf, 0],
    // its proper [functioning] → Noun
    ["#Poss #Adj [#V]", NN, 0, { n: "#Cop" }],
    // [tastes] good → PresentTense
    ["[(tastes|smells)] #Adv? #Adj", Pres, 0],
    // Being introduces a predicate rather than a direct object.
    // she is writing [thank]-you letters → Noun
    ["#Cop (#Ger && !being) [(#Pres && !#Ger && !#Cop)] !by?", NN, 0, { n: "going" }],
    // the [shed] → Noun
    ["#Det #Adj? [(shed|thought|rose|bid|saw|spelt)]", NN, 0],
    // how to [watch] → Infinitive
    ["how to [%Noun|Verb%]", Inf, 0],
    // ready to [stream] → Infinitive
    ["(ready|available|difficult|hard|easy|made|attempt|try) to [%Noun|Verb%]", Inf, 0],
    // bring [to market] → Preposition Noun
    ["(bring|went|go|drive|run|bike) [to (market|work|court|school|bed|church|prison)]", "Prep NN", 0],
    // can i [sleep], would you [look] → Infinitive
    ["#Mod #NN [%Noun|Verb%]", Inf, 0],
    // is just [spam] → Noun
    ["#Cop just [#Inf]", NN, 0],
    // request copies → Imperative Plural
    ["^%Noun|Verb% %Plural|Verb%", "Imp #Plur"],
    // homemade pickles and [drinks] → Plural
    ["#Adj #Plur and [%Plural|Verb%]", "#Plur", 0],
    // the 1968 [stand]-off → Noun
    ["#Det #Year [#V]", NN, 0],
    // the [break up] → Noun
    ["#Det [(#PhrV && !#Past) #Particle]", NN, 0],
    // the [individual] goals → Adjective
    ["#Det [(%Adj|Noun% && !#Value)] #NN", Adj, 0, { n: "(#Pron|#Poss|#Prop)" }],
    // [work] or prepare → Infinitive
    ["^[%Noun|Verb%] or #Inf", Inf, 0],
    // to give [thanks] → Noun
    ["to #Inf [#Pres]", NN, 0, { n: "(#Ger|#Cop|help)" }],
    // [Google] me → Verb
    ["[(#NN && !#Pron)] me", Vb, 0],
    // removes wrinkles → PresentTense Plural
    ["%Plural|Verb% %Plural|Verb%", "#Pres #Plur"],
    // i [Google] the answer → Infinitive
    ["i [#NN] the #NN", Inf, 0],
    // did the engine [stop] → Infinitive
    ["(did|does|will) the #NN [%Noun|Verb%]", Inf, 0],
    // 40 gallons of [water] → Noun
    ["#Value #NN of [%Noun|Verb%]", NN, 0],
    // When the rain [stops], we will leave. Whenever the bell [rings], the dog barks.
    // when the dog [looks] → PresentTense
    ...["stops", "looks", "rings"].map((word) => [
      `(when|whenever|before|after|until|since|as|while|than) (#Det|#Poss) #Adj+? #NN [(%Plural|Verb% && ${word})]$`,
      Pres,
      0
    ]),
    // The sun [rose]. The river [rose] quickly. → PastTense
    ["(sun|moon|river|water|tide|temperature|prices|he|she|we|they|i) [rose] #Adv+?$", Past, 0],
    // === numbers/money.js ===
    // $5 and $6 → Money
    ["#Money and #Money #Currency?", "Money"],
    // 6 dollars [and] 5 cents → Money
    ["#Value #Currency [and] #Value (cents|ore|centavos|sens)", "Money", 0],
    // 5 rand → Money Currency
    ["#Value (mark|rand|won|rub|ore)", "#Money #Currency"],
    // a pound → Money Unit
    ["a pound", "#Money #Unit"],
    // 3 pounds → Money Unit
    ["#Value (pound|pounds)", "#Money #Unit"],
    // === numbers/fractions.js ===
    // [half] a penny → Fraction
    ["[(a|one)? half] of? (a|an|the)", Frac, 0],
    // [quarter] of a dollar → Fraction
    ["[(a|one)? quarter] of? (a|an|the)", Frac, 0],
    // two and a half → Fraction
    ["#Card and a half", Frac],
    // two-halves → Fraction
    ["#Value (halves|halfs|quarters)", Frac],
    // [seven] fifths → Fraction
    ["[#Card+] (#Frac && /s$/)", Frac, 0],
    // [one third] of it → Fraction
    ["[#Card+ #Ord] of .", Frac, 0],
    // [100th] of it → Fraction
    ["[(#Numeric && #Ord)] of .", Frac, 0],
    // [a twenty fifth] of it → Fraction
    ["[(a|one) #Card?+ #Ord] of", Frac, 0],
    // a sixteenth, one twenty fifth (without a following noun) → Fraction
    ["[(a|one) #Card+? (#Ord && !first && !second)]$", Frac, 0],
    ["(a|one) (half|quarter)$", Frac],
    // 3 out of 5 → Fraction
    ["#Card+ out? of every? #Card", Frac],
    // === numbers/numbers.js ===
    // ==== Ambiguous numbers ====
    // with [a] hundred jobs → Value
    ["!once? [(a|an)] hundred", Val, 0],
    // with [a] thousand jobs → Value
    ["!once? [(a|an)] thousand", Val, 0],
    // with [a] million jobs → Value
    ["!once? [(a|an)] million", Val, 0],
    // with [a] billion jobs → Value
    ["!once? [(a|an)] billion", Val, 0],
    // with [a] trillion jobs → Value
    ["!once? [(a|an)] trillion", Val, 0],
    // with [a] dozen eggs → Value
    ["!once? [a] dozen", Val, 0, { hook: "dozen" }],
    // ==== PhoneNumber ====
    // 1 800 555-1234 → PhoneNumber
    ["(1|+1) #Value #PhoneNumber", PhoneNumber],
    // (454) 232-9873 → PhoneNumber
    ["#Numeric #PhoneNumber", PhoneNumber],
    // ==== Currency ====
    // chinese yuan → Currency
    ["#Dem #Currency", "Currency"],
    // ==== Money ====
    // [5] dollars → Money
    ["[#Value+] #Currency", "Money", 0],
    // ==== Ordinal ====
    // ==== Units ====
    // Currency can be assigned by left/right rules, so keep this correction late.
    // 5 [dollars] → Unit
    ["#Value+ [#Currency]", Unit, 0],
    // kilometers an hour → Unit
    ["#Unit an hour", Unit],
    // ==== Magnitudes ====
    // thousand and two → Value
    [`#Multiple+ and #Value`, Val],
    // 5 miles [per hour] → Unit
    ["#Value #Unit [(per|an) (hr|hour|sec|second|min|minute)]", Unit, 0],
    // twelve percent → Percent Unit
    ["#Card percent", "#Percent #Unit"],
    // === person/person-phrase.js ===
    // ==== FirstNames ====
    // is [foo] Smith → FirstName
    ["#Cop [(#NN|#Pres)] #Last", First, 0, { n: "#Ger" }],
    // pope francis → Person
    ["(sister|pope|brother|father|aunt|uncle|grandpa|grandfather|grandma) #Prop", Pers, null, { safe: true }],
    // ==== Nickname ====
    // Dwayne '[the rock]' Johnson → Person
    ["#First [#Det #NN] #Last", Pers, 0],
    // John b Smith → Person
    ["#Prop (b|c|d|e|f|g|h|j|k|l|m|n|o|p|q|r|s|t|u|v|w|x|y|z) #Prop", Pers, null, { safe: true }],
    // J. Smith → Person
    ["#Acronym #Last", Pers, null, { safe: true }],
    // John jr → Person
    ["#Pers (jr|sr|md)", Pers],
    // Dr. J. → Person
    ["#Hon #Acronym", Pers],
    // John [b] → [Acronym, 'Pers']
    ["#First [/^[bdefghjlmnopqstvwxyz]$/]", [Acronym, "Pers"], 0],
    // Ludwig van Beethoven → Person
    ["#NN van der? #NN", Pers, null, { safe: true }],
    // king of spain → Person
    ["(king|queen|prince|saint|lady) of #NN", Pers, null, { safe: true }],
    // prince Paris → Person
    ["(prince|lady) #Place", Pers],
    // saint Foo → Person
    ["(king|queen|prince|saint) #Prop", Pers, null, { n: "#Place" }],
    // al Smith → Person
    ["al (#Pers|#Prop)", Pers, null, { safe: true }],
    // ferdinand de almar → Person
    ["#First de #NN", Pers],
    // Osama bin Laden → Person
    ["#First (bin|al) #NN", Pers],
    // John L. Foo → Person
    ["#First #Acronym #Prop", Pers],
    // Mr Foo → Person
    ["#Hon #First? #Prop", Pers],
    // peter the great → Person
    ["#First the #Adj", Pers],
    // John van Smith → Person
    ["#Prop (van|al|bin) #Prop", Pers, null, { safe: true }],
    // jose de Sucre → Person
    ["#Prop (de|du) la? #Prop", Pers, null, { n: "#Place" }],
    // Jani K. Smith → FirstName Person .
    ["#Sing #Acronym #Last", "#First #Pers .", null, { safe: true }],
    // [Toronto] John → Person
    ["[#Prop] #Pers", Pers, 0, { safe: true }],
    // john [keith jones] → Person
    ["#Pers [#Prop #Prop]", Pers, 0, { n: "#Poss", safe: true }],
    // John [Foo] → LastName
    ["#First #Acronym? [#Prop]", Last, 0, { n: "#Poss" }],
    // Joe K. Sombrero → Person
    ["#First #Acronym #NN", Pers, null, { safe: true }],
    // Anthony [de] Marco → LastName
    ["#First [(de|di|du|van|von)] #Pers", Last, 0],
    // baker jenna smith
    // { match: '[#Actor+] #Person', group: 0, tag: 'Person' },
    // [sergeant] major Harold → Honorific
    [
      "[(lieutenant|corporal|sergeant|captain|qeen|king|admiral|major|colonel|marshal|president|queen|king)+] #Prop",
      "Hon",
      0
    ],
    // ==== Honorics ====
    // [general] John → ['Hon', 'Pers']
    ["[(private|general|major|rear|prime|field|count)] #Hon? #Pers", ["Hon", "Pers"], 0],
    // [Miss] John → ['Hon', 'Pers']
    ["[(miss && @isTitleCase)] #Pers", ["Hon", "Pers"], 0],
    // dr john [foobar] → LastName
    ["#Hon #First [#Sing]", Last, 0, { n: "#Poss", safe: true }],
    // [his excellency] John → Honorific
    ["[(his|her) (majesty|honour|worship|excellency|honorable)] #Pers", "Hon", 0],
    // Dr teacher → Honorific
    ["#Hon #Actor", "Hon"],
    // [first lady] michelle obama → Honorific
    ["[first lady] #Pers", "Hon", 0],
    // Louis IV → Person
    ["#Pers the? #RomanNumeral", Pers],
    // === person/ambig-name.js ===
    // const personAdj = '(misty|rusty|dusty|rich|randy|sandy|young|earnest|frank|brown)'
    // ebenezer scrooge → . LastName
    ["#First #NN$", ". #Last", null, { n: "(#Poss|#Org|#Place|#Pron|@hasTitleCase)" }],
    // June Smith → Person
    ["%Person|Date% #Acronym? #Prop", Pers],
    // ===person-noun===
    // Cliff Clavin → Person
    ["%Person|Noun% #Acronym? #Prop", Pers, null, { safe: true }],
    // Rose Microsoft → Organization
    ["%Person|Noun% #Org", Org],
    // ===person-verb===
    // Ollie Faroo → Person
    ["(%Person|Verb% && #Pers) #Acronym? #Prop", Pers, null, { ifNo: "#Actor" }],
    // ===person-verb===
    // really [wade] → Verb
    [`#Adv [(%Person|Verb% && !@isTitleCase)]`, Vb, 0],
    // [drew] closer → Verb
    [`[%Person|Verb%] (#Adv|#Comp)`, Vb, 0],
    // wade smith → Person
    [`(%Person|Verb% && #Pers) #Pers`, Pers],
    // Wade G. Slapgoop → Person
    [`%Person|Verb% #Acronym #Prop`, Pers],
    // Will Smith → Person
    ["(will && @isTitleCase) #Prop", Pers],
    // jack [layton] won → LastName
    ["(#First && !#Poss) [#Sing] #V", Last, 0, { safe: true }],
    // [captain] John walks → Person
    ["^[#Sing] #Pers #V", Pers, 0, { safe: true }],
    // === verbs/verbs.js ===
    // is [pretty] good → Adverb
    ["#Cop [(pretty|dead|full|well|sure)] #Adj", Adv, 0],
    // adj -> gerund
    // i [like] → PresentTense
    ["(#Mod|i|they|we|do) not? [like]", Pres, 0],
    // ==== Tense ====
    // he [left] → PastTense
    ["(#NN && !#Poss) #Adv? [left]", Past, 0],
    // she [bit] her tongue → PastTense
    ["#NN #Adv? [(bit && #Inf)]", Past, 0],
    // will [be] running → Copula
    ["will #Adv? not? #Adv? [be] #Ger", Cop, 0],
    // will [be] nice → Copula
    ["will #Adv? not? #Adv? [be] #Adj", Cop, 0],
    // [march] up → Infinitive
    ["[march] (up|down|back|toward)", Inf, 0, { n: "#Date" }],
    // birds [home] to their nest → Infinitive
    ["(#Pron|#Plur|#Mod) #Adv+? [home] to", Inf, 0],
    // is [home] to birds → Noun
    ["(#Cop|be|been|being) #Adv+? [home] to", NN, 0],
    // is [subject] to change → Adjective
    ["(#Cop|be|been|being|remain|remains|remained) #Adv+? [subject] to", Adj, 0],
    // is subject [to] → Preposition; remove Conjunction
    ["(#Cop|be|been|being|remain|remains|remained) #Adv+? subject [to]", Prep, 0, { u: "Conj" }],
    // is subject to [change] → Noun
    ["(#Cop|be|been|being|remain|remains|remained) #Adv+? subject to [%Noun|Verb%]", NN, 0],
    // is home [to] dogs → Preposition; remove Conjunction
    ["(#Cop|be|been|being) #Adv+? home [to] #Adj+? #NN", Prep, 0, { u: "Conj" }],
    // === misc==
    // were being [run] → PastTense
    [`(were|was) being [#Pres]`, Past, 0],
    // had [been broken] → Auxiliary Participle
    [`(had|has|have) [been (#Past && /en$/)]`, "Aux VBN", 0],
    // had [been] eaten → Auxiliary
    [`(had|has) #Adv? [been] #Adv? #Past`, "Aux", 0],
    // had to [Google] the answer → Infinitive
    ...["had", "has"].map((word) => [`${word} to [#NN] (#Det|#Poss)`, Inf, 0]),
    // does that [work] → Infinitive
    [`(do|does|did|#Mod) (this|that|these|those) [work]`, Inf, 0],
    // have read → Auxiliary Participle
    [`(has|have|had) read`, "Aux VBN"],
    // jobs that fit → . Preposition Infinitive
    ["#Plur that %Noun|Verb%", ". #Prep #Inf"],
    // [works] for me → PresentTense
    ["[works] for me", Pres, 0],
    // as we [please] → Infinitive
    ["as #Pron [please]", Inf, 0],
    // verb-prefixes - '[co] write'
    // [co] write → ['V', 'Prefix']
    [
      "[(co|mis|de|inter|intra|pre|re|un|counter)] (#V && !#Cop && !#PhrV)",
      ["V", "Prefix"],
      0,
      { n: "(#Acronym && @isUpperCase)" }
    ],
    // Keep verb prefixes late: early tagging hides prepositions in left-out-type.
    // [out] run → ['V', 'Prefix']
    ["[(out|under|over)] #Inf", ["V", "Prefix"], 0],
    // dressed and [left] → PastTense
    ["#Past and [%Adj|Past%]", Past, 0],
    // [melted] and fallen → PastTense
    ["[(%Adj|Past% && !#Adj)] and #Past", Past, 0],
    // is he [stoked] → Adjective
    ["#Cop #Pron [%Adj|Past%]", Adj, 0],
    // === adjective/adj-verb.js ===
    // Resume fragments: developed [scalable React] architecture. → PastTense
    [
      "^[developed] (#Adj|#Prop)+? (backend|frontend|software|architecture|applications|apps|systems)",
      Past,
      0,
      { n: "(#Pres|#Cop|#Mod)" }
    ],
    // does [mean] → Infinitive
    ["does (#Adv|not)? [%Adj|Present%]", Inf, 0],
    // [okay] by me → Adjective
    ["[(fine|okay|cool|ok)] by me", Adj, 0],
    // i [mean] → PresentTense
    ["i (#Adv|do)? not? [mean]", Pres, 0],
    // the ship will near the coast → Auxiliary Infinitive
    ["will #Adj", "Aux Inf"],
    // I [frequent] this restaurant → Verb
    ["#Pron [#Adj] #Det #Adj? #NN", Vb, 0],
    // rude and [insulting] → Adjective
    ["#Adj and [(%Adj|Gerund% && #Ger)] !#Prep?", Adj, 0],
    // got [tired] of → Adjective
    ["got #Adv? [%Adj|Past%] of", Adj, 0],
    // felt [cheated] → Adjective
    ["(seem|seems|seemed|appear|appeared|appears|feel|feels|felt|sound|sounds|sounded) (#Adv|#Adj)? [#Past]", Adj, 0],
    // felt [cheated]
    // { m: '(seem|feel|seemed|felt) [#Past #Particle?]', g: 0, t: 'Adj' },
    // a bit [confused] → Adjective
    ["a (bit|little|tad) [#Past #Particle?]", Adj, 0],
    // do not be [embarrassed] → Adjective
    ["not be [%Adj|Past% #Particle?]", Adj, 0],
    // is just [tired] → Adjective
    ["#Cop just [%Adj|Past% #Particle?]", Adj, 0],
    // [failed] and oppressive → Adjective
    ["[%Adj|Past%] and #Adj", Adj, 0],
    // the fear or [heightened] emotion → Adjective
    ["(#Det|#Prep) #Adj? #NN or [#Past] #NN", Adj, 0, { n: "(#Cop|#Pron)" }],
    // tired and overworked describes a state after a copula → Adjective
    [
      "#Cop #Adv? #Adj and [(overworked|overwhelmed|overpaid|underpaid|overqualified|underqualified|understaffed)]$",
      Adj,
      0
    ],
    // their [declared] intentions → Adjective
    ["#Poss [#Past] #NN", Adj, 0, { n: "#Cop" }],
    // is he [cool] → Adjective
    ["#Cop #Pron [%Adj|Present%]", Adj, 0],
    // is [crowded] with → Adjective
    [
      "#Cop [%Adj|Past%] with",
      Adj,
      0,
      { n: "(associated|worn|baked|aged|armed|bound|fried|loaded|mixed|packed|pumped|filled|sealed)" }
    ],
    // is [empty] → Adjective
    ["#Cop #Adv? [%Adj|Present%]$", Adj, 0],
    // she is being [cool] → Adjective
    ["being #Adv? [%Adj|Present%]", Adj, 0],
    // does the store [open] → Infinitive
    ["(does|will) #Det #NN [%Adj|Present%]$", Inf, 0],
    // === verbs/auxiliary.js ===
    // these are some of our heaviest-used matches
    // ought not [to] walk → Auxiliary
    ["ought (#Adv|not)+? [to] (#Adv|not)+? #V", "Aux", 0],
    // ought to [be] walking → Auxiliary
    ["ought (#Adv|not)+? to (#Adv|not)+? [be] (#Adv|not)+? #V", "Aux", 0],
    // will [have] walked → Auxiliary
    [`will (#Adv|not)+? [have] (#Adv|not)+? #V`, "Aux", 0],
    // [was] walking → Auxiliary
    [`[#Cop] (#Adv|not)+? (#Ger|#Past)`, "Aux", 0],
    // [would] walk → Auxiliary
    [`[(#Mod|did)+] (#Adv|not)+? #V`, "Aux", 0],
    // would [have] [had] to go → Auxiliary
    [`#Mod (#Adv|not)+? [have] (#Adv|not)+? [had] (#Adv|not)+? #V`, "Aux", 1],
    // [will] walk → Auxiliary
    ["[(do|does|did|will|have|had|has|got)] (not|#Adv)+? #V", "Aux", 0, { n: "#Prop" }],
    // [about to] go → ['Aux', 'V']
    ["[about to] #Adv? #V", ["Aux", "V"], 0],
    // would [be] walking → Auxiliary
    [`#Mod (#Adv|not)+? [be] (#Adv|not)+? #V`, "Aux", 0],
    // was [being] driven → Auxiliary
    ["[(be|being|been)] #VBN", "Aux", 0],
    // was [being] walked → Auxiliary
    ["#Cop (#Adv|not)+? [(be|being|been)] #Adv+? #Past", "Aux", 0],
    // [been] walking → Auxiliary
    ["[(be|been)] (#Adv|not)+? #Ger", "Aux", 0],
    // [used to] walk → Auxiliary
    ["[used to] #Pres", "Aux", 0],
    // was [going to] walk → Auxiliary
    ["#Cop (#Adv|not)+? [going to] #Adv+? #Pres", "Aux", 0],
    // going to [be] watched → Auxiliary
    ["going to (#Adv|not)+? [be] (#Adv|not)+? #Past", "Aux", 0],
    // there is [no] x → Negative
    ["(is|was) #Adv? [no]", "Neg", 0],
    // [been] told → Auxiliary
    ["[(been|had|became|came)] #Past", "Aux", 0, { n: "#PhrV" }],
    // [being] born → Auxiliary
    ["[(being|having|getting)] #V", "Aux", 0],
    // [better] go → Modal
    ["[better] #Pres", Mod, 0, { n: "(#Cop|#Ger)" }],
    // === verbs/phrasal.js ===
    // walk-up → PhrasalVerb
    ["(#V && @hasHyphen && !#Past) up", Phrasal],
    // walk-off → PhrasalVerb
    ["(#V && @hasHyphen) off", Phrasal],
    // walk-over → PhrasalVerb
    ["(#V && @hasHyphen) over", Phrasal],
    // walk-out → PhrasalVerb
    ["(#V && @hasHyphen) out", Phrasal],
    // [walk in] on → PhrasalVerb Particle
    ["[#V (in|out|up|down|off|back)] (on|in)", "PhrV Particle", 0, { n: "#Cop" }],
    // went [on] for → PhrasalVerb
    ["(lived|went|crept|go) [on] for", Phrasal, 0],
    // the curtains come down → PhrasalVerb Particle
    ["#V (up|down|in|on|for)$", "PhrV #Particle", null, { n: "#PhrV" }],
    // work in the office → Verb Preposition Determiner; remove PhrasalVerb
    ["#PhrV (in && #Particle) #Det", "#V #Prep #Det", null, { u: "PhrV" }],
    // back it [up] → Adverb
    ...["up", "down"].map((word) => [`#V (him|her|it|us|himself|herself|itself|everything|something) [${word}]`, Adv, 0]),
    // runs [around] the lake → Preposition
    ["#PhrV [around] the #NN", Prep, 0],
    // === verbs/imperative.js ===
    // this is really hard to do
    //we do not go
    // do not [go] → Imperative
    ["^do not? [#Inf #Particle?]", "Imp", 0, { n: notIf2 }],
    // please [go] → Imperative
    ["^please do? not? [#Inf #Particle?]", "Imp", 0],
    // just [go] → Imperative
    ["^just do? not? [#Inf #Particle?]", "Imp", 0],
    // [go] quickly. → Imperative
    ["^[(#Inf && !#Hyphenated)] (#Adj|#Adv|hard|high|fast|slow)$", "Imp", 0, { n: "(so|such|rather|enough)" }],
    // [turn] down the noise → Imperative
    ["^[#Inf] (up|down|over) #Det", "Imp", 0],
    // [eat] my shorts → Imperative
    ["^[#Inf] (your|my|the|a|an|any|each|every|some|more|with|on)", "Imp", 0, { n: "like" }],
    // Wait for word-specific corrections such as 'wit me' before tagging commands.
    // [tell] him the story → Imperative
    ["^[#Inf] (him|her|it|us|me|there)", "Imp", 0],
    // [avoid] loud noises → Imperative
    ["^[#Inf] #Adj #NN$", "Imp", 0],
    // [come] and have a drink → Imperative
    ["^[#Inf] (#Adj|#Adv)? (and|or) #Inf", "Imp", 0],
    // Keep isolated commands here: pre-tagging also runs on replacement words. → Imperative
    ["^[go] please?$", "Imp", 0],
    ["^[stop] please?$", "Imp", 0],
    ["^[wait] please?$", "Imp", 0],
    ["^[hurry] please?$", "Imp", 0],
    // let's [leave] → Imperative
    ["^let (us|me) [#Inf]", "Imp", 0],
    // [shut] the door → Imperative
    ["^[(shut|close|open|start|stop|end|keep)] #Det #NN", "Imp", 0],
    // [turn off] the light → Imperative
    ["^[#PhrV #Particle] #Det #NN", "Imp", 0],
    // A modal question alone may ask about ability or knowledge. Require an
    // explicit request marker before treating it as an imperative.
    // can you please [walk] → Imperative
    ["^(can|could|will|would) you (#Adv|not)+? please (#Adv|not)+? [#Inf]", "Imp", 0],
    // please can you [walk] → Imperative
    ["^please (can|could|will|would) you (#Adv|not)+? [#Inf]", "Imp", 0],
    // can you [walk] please → Imperative
    ["^(can|could|will|would) you (#Adv|not)+? [#Inf] .+? please$", "Imp", 0],
    // come have a drink → Imperative
    ["^come #Inf", "Imp", null, { n: "on" }],
    // come and have a drink → Imperative . Imperative
    ["^come and #Inf", "Imp . Imp"],
    // [allow] yourself → Imperative
    ["^(and|but)? (then|please)? [#Inf] (yourself|yourselves)", "Imp", 0],
    // [look] what happened → Imperative
    ["^[#Inf] what .", "Imp", 0],
    // [go] to it → Imperative
    ["^[#Inf] (to|for|into|toward|here|there)", "Imp", 0],
    // [maintain] eye contact → Imperative
    ["^[#Inf] #Adj? #Sing #Sing", "Imp", 0],
    // don't forget to [clean] → Imperative
    ["^do not (forget|omit|neglect) to [#Inf]", "Imp", 0],
    // [add] 2 eggs → Imperative
    ["^[#Inf] #Value #NN", "Imp", 0],
    // === verbs/adj-gerund.js ===
    // The station was [closing]. The shop is [closing] soon. → Gerund
    ["#Cop #Adv+? [closing] (#Adv|soon)+?$", Ger, 0],
    // that were [growing] → Gerund
    ["(that|which) were [%Adj|Gerund%]", Ger, 0],
    // === _misc.js ===
    // order matters
    // the captain [who] → Determiner
    ["#NN [(who|whom)]", Det, 0],
    // who is [that]? → Pronoun
    ["^#QW #Adv+? #Cop #Adv+? [(this|that|these|those)] #Adv+?$", Pron, 0],
    // I like [this] → Pronoun
    ["#V [(this|that|these|those)] #Adv+? (yesterday|today|tonight|tomorrow)?$", Pron, 0],
    // some sort of → Determiner Noun Preposition
    ["some sort of", "Det NN Prep"],
    // of some sort → Preposition Determiner Noun
    ["of some sort", "Prep Det NN"],
    // [some] eat apples → Pronoun
    ["^[some] #Inf #NN", Pron, 0],
    // put it [there] → Adverb
    ["(put|puts|putting|place|placed|leave|left) #Pron [there]", Adv, 0],
    // [such] skill → Determiner
    ["[such] (a|an|is)? #NN", Det, 0],
    // [there] she is → There
    ["[there] (#Adv|#Pron)? #Cop", "There", 0],
    // is [there] food → There
    ["#Cop [there] .", "There", 0],
    // should [there] → There
    ["#Mod #Adv? [there]", "There", 0],
    // the person [who] runs → Preposition
    ["#Det #NN+ [who] #V", Prep, 0],
    // the person [which] eats → Preposition
    ["#Det #NN+ [which] #V", Prep, 0],
    // guess who → Infinitive QuestionWord
    ["guess who", "#Inf #QW"],
    // [fucking] ridiculous → Gerund
    ["[fucking] !#V", "#Ger", 0],
    // === nouns/organizations.js ===
    // import orgWords from './_orgWords.js'
    // let orgMap = `(${orgWords.join('|')})`
    /*
    const multi = [
      'building society',
      'central bank',
      'department store',
      'institute of technology',
      'liberation army',
      'people party',
      'social club',
      'state police',
      'state university',
    ]
    */
    // university of Toronto → Organization
    ["university of #Place", Org],
    // Name pairs can be business names without a known organization suffix. → ProperNoun
    ["#Prop & #Prop", Prop],
    // John & Mary Ltd → Organization
    [`#Pers & #Pers ${companySuffix}`, Org],
    // Smith & Rogers → Organization
    ["#Last & #Last", Org],
    // Microsoft of Canada
    // { m: '#Org of the? #Prop', t: 'Org', safe: true },
    // walmart USA → Organization
    ["#Org #Country", Org],
    // Toronto Microsoft → Organization
    ["#Prop #Org", Org, null, { n: "#First" }],
    // FitBit Inc → Organization
    ["#Prop (ltd|co|inc|dept|assn|bros)", Org],
    // the [XYZ corporation] → Organization
    [`the [#Acronym ${companySuffix}]`, Org, 0, { safe: true }],
    // [government of india] → Organization
    ["[government of the? #Place+]", Org, 0],
    // global Microsoft → Organization
    ["(world|global|international|national|#Dem) #Org", Org],
    // Toronto public school → School
    ["#NN+ (public|private) school", "School"],
    // Toronto Yankees → SportsTeam
    ["#Place+ #SportsTeam", SportsTeam],
    // 'toronto fc' → SportsTeam
    ["#Place+ fc", SportsTeam],
    // the new orleans basketball team → Organization
    ["#Place+ #NN{0,2} (club|society|group|team|committee|commission|association|guild|crew)", Org],
    // === nouns/places.js ===
    // ==== Region ====
    // west Toronto → Region
    ["(west|north|south|east|western|northern|southern|eastern)+ #Place", Region],
    //some us-state acronyms (exlude: al, in, la, mo, hi, me, md, ok..)
    // Toronto [ca] → Region
    ["#City [(al|ak|az|ar|ca|ct|dc|fl|ga|id|il|nv|nh|nj|ny|oh|pa|sc|tn|tx|ut|vt|pr)]", Region, 0],
    // Portland [OR] → Region
    ["portland [(or && @isUpperCase)]", Region, 0],
    // with [turkey] → Uncountable; remove Place
    ["with [(turkey && !@isTitleCase)]", Uncountable, 0, { u: Place }],
    // Toronto point → Place
    ["#Prop+ (cliff|place|range|pit|place|point|room|grounds|ruins)", Place],
    // 123 main street → Address
    [
      "#Value #NN+ (st|street|rd|road|crescent|cr|way|tr|terrace|avenue|ave|lane|boulevard|blvd|drive|dr|parkway|way)",
      "Address"
    ],
    // port dover → Place
    ["(port|mount|mt) #Prop", Place],
    // === conjunctions.js ===
    // [how] he is driving → Conjunction
    ...["who", "what", "where", "why", "how", "when"].map((word) => [`[${word}] #NN #Cop #Adv? (#V|#Adj)`, Conj, 0]),
    // things [that] seem cool → Conjunction
    ["#NN [that] #V #Adj", Conj, 0],
    // he was [that] wide → Adverb
    ["#NN #Cop not? [that] #Adj", Adv, 0],
    // [to] lunch → Preposition; remove Conjunction
    ["[to] (#NN && !#V)", Prep, 0, { u: "Conj" }],
    // I heard rumors [that] drivers save gas → Preposition
    ["#V #Adv? #NN [(that|which)]", Prep, 0],
    // Tuesday, [which] he liked → Preposition
    ["@hasComma [which] (#Pron|#V)", Prep, 0],
    // treated them [like] sons → Preposition
    ["(me|him|her|us|them|it) [like] #NN", Prep, 0],
    // a day [like] this → Preposition
    ["a #NN [like] (#NN|#Det)", Prep, 0],
    // really [like] → Verb
    ["(#Adv && !lot) [like]", Vb, 0],
    // is not [like] me → Preposition
    ["(#Cop|be|been|being) (not|never) [like]", Prep, 0],
    // a lot [like] ours → Preposition
    ["a lot [like] #NN", Prep, 0],
    // treat them [like] → Preposition
    ["#Inf #Pron [like]", Prep, 0],
    // ==== Questions ====
    // where
    // why
    // when
    // who
    // whom
    // whose
    // what
    // which
    //the word 'how many'
    // { match: '^(how|which)', tag: 'QuestionWord' },
    // [how] he → Preposition
    ["[(#QW && !do && !does)] (#Pron|#Det) !#Cop", Prep, 0, { n: "what the (hell|heck)" }],
    // children [who] dance → Preposition
    ["#Plur [(who|which|when)] .", Prep, 0],
    // === expressions.js ===
    // come on → Expression
    ["^come on", Expr],
    // // [well]..
    // { m: '^[well] !#Adj?', g: 0, t: 'Expr' },
    // // [so]
    // { m: '^[so] !#Adj?', g: 0, t: 'Expr' },
    // // [okay]
    // { m: '^[okay] !#Adj?', g: 0, t: 'Expr' },
    // // [now]
    // { m: '^[now] !#Adj?', g: 0, t: 'Expr' },
    // // shoot,
    // { m: '^(shoot && @hasComma)', t: 'Expr' },
    // // say,
    // { m: '^(say && @hasComma)', t: 'Expr' },
    // // like, hello
    // { m: '^(like && @hasComma)', t: 'Expr' },
    // Rules promoted from the second pass.
    // const locative = '#Plural [(near|on|under|beside|behind)] #Determiner #Adjective+? #Noun [%Noun|Verb%]$'
    // Which chair did she [sit] [on]?
    // veggies, [like] kale → Preposition
    ["(#NN && @hasComma) [like] #NN", Prep, 0],
    // Everyone [but] me agreed. → Preposition
    ...["everyone", "everybody", "everything", "anyone", "anybody", "anything", "nobody", "nothing", "all"].map((word) => [
      `${word} [but] (me|him|her|us|them|#Det|#Poss|#Prop)`,
      Prep,
      0
    ]),
    // images on a screen [like] humans do → Preposition
    ["#NN [like] #NN+ (do|does|did)$", Prep, 0],
    // cities [like] New York, Boston → Preposition
    ...["", "#Place ", "#Place #Place "].map((prefix5) => [`#Plur [like] ${prefix5}(#Place && @hasComma) #Place`, Prep, 0]),
    // [Like] his brother, he enjoys chess → Preposition
    ["^[like] (#Det|#Poss)? #Adj+? (#NN && @hasComma)", Prep, 0],
    // I like tea, [like] my sister does. → Conjunction
    [`@hasComma [like] ${subject} ${predicate}`, Conj, 0],
    // We talked about the fact [that] she resigned. → Conjunction
    [`#NN [that] ${subject} ${predicate}`, Conj, 0],
    // I have heard that story [before] → Adverb
    ["#V (#Det|#Poss)? #NN+? [(before|since)]$", Adv, 0, { n: "@hasQuestionMark" }],
    // Who did she arrive [before]? → Preposition
    ["^(who|whom) #V #Pron #V [before]$", Prep, 0],
    // We will leave [when] the rain stops. → Conjunction
    ["#Mod #Inf [when] #Det", Conj, 0],
    // [has] running water → remove Auxiliary; possession is not progressive
    ["[(have|has|had)] running water", null, 0, { u: "Aux" }],
    // [is] enduring art → remove Auxiliary; enduring modifies the noun
    ["[#Cop] (enduring && #Adj) #NN", null, 0, { u: "Aux" }],
    // Although he [was] [tired], he smiled. He [was] [tired].
    ...["[(#Cop|been)] #Adv+? [tired]$", "[(#Cop|been)] #Adv+? [(tired && @hasComma)]"].flatMap((match2) => [
      // Although he [was] [tired], he smiled. He [was] [tired]. → Copula; remove Passive
      [match2, Cop, 0, { u: "Pass" }],
      // Although he [was] [tired], he smiled. He [was] [tired]. → remove Auxiliary
      [match2, null, 0, { u: "Aux" }],
      // Although he was [tired], he smiled. He was [tired]. → Adjective (second capture)
      [match2, Adj, 1]
    ]),
    // had been tired → remove Passive
    ["(has|have|had) (#Adv|not)+? been #Adv+? tired$", null, null, { u: "Pass" }],
    // 23 Main Street in Toronto → Place
    ["#Address in #Place", Place],
    // the [sleeping] dog → Adjective
    ["#Det [sleeping] (#Actor|#Pers|puppy|kitten|dog|cat|baby|babies|child|children)", Adj, 0],
    // [water] broke the pipe → Noun
    ["^[%Noun|Verb%] #Past (#Det|#Poss) #Adj+? #NN", NN, 0],
    // the [present] immediately → Noun
    ["#Det [present] #Adv+$", NN, 0],
    // [falls in] June → Verb Preposition
    ["[(fall|falls|fell) in] #Month", "#V #Prep", 0],
    // [had] he walked → Condition
    ["^[had] #NN+ (#Adv|not)+? #Past", "Condition", 0, { n: "@hasQuestionMark" }],
    // [were] he to walk → Condition
    ["^[were] #NN+ to #Inf *$", "Condition", 0, { n: "@hasQuestionMark" }],
    // [had] he walked? → Auxiliary
    ["^[had] #NN+ (#Adv|not)+? (#Past && @hasQuestionMark)$", "Aux", 0, { n: "@hasComma" }],
    // [had] he walked the dog? → Auxiliary
    ["^[had] #NN+ (#Adv|not)+? #Past * @hasQuestionMark$", "Aux", 0, { n: "@hasComma" }],
    // [This] will be one sentence. [This] might help. → Pronoun
    ["[this] #Adv+? #Mod #Adv+? #Inf", Pron, 0],
    // has [read], had [put] → Participle
    ...["read", "put"].map((word) => [`(has|have|had) (#Adv|not)+? [${word}]`, Participle, 0]),
    // John and Mary [walk] → Infinitive
    ["#Pers and #Pers [(%Noun|Verb% && !@isTitleCase && !@isUpperCase)]$", Inf, 0],
    // dogs [near] the house [bark]
    // near|on|under|beside|behind
    ...["near", "on", "under", "beside", "behind"].flatMap((word) => [
      // dogs [near] the house bark → Preposition
      [`#Plur [${word}] #Det #Adj+? #NN [%Noun|Verb%]$`, Prep, 0],
      // dogs near the house [bark] → Infinitive (second capture)
      [`#Plur [${word}] #Det #Adj+? #NN [%Noun|Verb%]$`, Inf, 1]
    ]),
    // has eaten and [drunk] → Participle
    ["(has|have|had) (#Adv|not)+? #Past (and|or) #Adv+? [drunk]", Participle, 0],
    // officers and [kids] would leave → Plural
    ["#Plur and [%Plural|Verb%] #Mod", Plur, 0]
  ];
  var matches = expand_rules_default(rules);
  var model_default4 = {
    two: {
      matches
    }
  };

  // node_modules/compromise/src/2-two/postTagger/model/hanging-adverbs.js
  var object = "(#Det|#Poss)? #Adj+? #NN+";
  var time = "(daily|weekly|monthly|overnight|together|early|late)";
  var place2 = "(here|upstairs|downstairs|outdoors|inside|outside|nearby)";
  var tail = "(#Date|#Adv)+?$";
  var rules2 = [
    // waters the roses [daily]; worked [together] yesterday → Adverb
    ...["", object].map((between) => [`(#V && !#Cop && !be && !been && !being) ${between} [${time}] ${tail}`, Adv, 0]),
    // carried the laundry [upstairs]; fresh towels [upstairs] → Adverb
    ...["", object].map((between) => [`${between ? "#V" : "(#V && !#Cop)"} ${between} [${place2}] ${tail}`, Adv, 0]),
    // walked [home]; works [downtown] (but visited downtown) → Adverb
    [
      "(go|goes|went|walk|walked|walks|work|works|worked|come|came|comes|going|walking|working|coming) [(home|downtown)] (together|#Date|#Adv)+?$",
      Adv,
      0
    ],
    // chauffeur the guests [home]; leave home purchases as nouns → Adverb
    ...[
      "#Pron",
      object
    ].map((between) => [
      `(chauffeur|chauffeurs|chauffeured|chauffeuring|drive|drives|drove|driven|driving|escort|escorts|escorted|escorting) ${between} [home] ${tail}`,
      Adv,
      0
    ]),
    // boss everyone [around], with a separated object → Adverb
    [`(boss|bosses|bossed|bossing) ${object} [around] ${tail}`, Adv, 0],
    // come here [now] → Adverb
    ["here [now]$", Adv, 0]
  ];
  var hanging_adverbs_default = rules2;

  // node_modules/compromise/src/2-two/postTagger/model/second-pass.js
  var noun2 = "(#NN && !#Poss && !@hasComma)";
  var modifiers2 = "(#Det|#Poss)? #Adv+? #Adj+?";
  var subject2 = `${modifiers2} ${noun2}+`;
  var predicate2 = "#Adv+? not? (#V && !#Ger && !#Particle)";
  var seatedQuestion = "^(which|what) #Adj+? #NN (did|does|do|#Mod) #Pron [sit] [on]$";
  var rules3 = [
    ...hanging_adverbs_default,
    // === second-pass.js ===
    // Corrections matched against the main sweep's output, before any are applied.
    // Keep comma context, but don't turn unambiguous verbs into list items.
    // food, drinks and [thanks] → Noun
    ...[
      ["%Noun|Verb%", "#Inf"],
      ["%Plural|Verb%", "#Pres"],
      ["thanks", "#Pres"]
    ].map(([target, verb]) => [`(#NN && @hasComma) #NN (and|or) [(${target} && ${verb})]`, NN, 0, { n: "#Cop" }]),
    // === connectors.js (second pass) ===
    // Before the meal ended, we left.
    // Before the meal, we left.
    // After the news that she resigned, we called.
    ...["before", "after", "since", "until", "till", "as", "than", "when", "whereas"].flatMap((word) => [
      // [before] she left
      // [after] she left
      // [since] she left... → Conjunction
      [`[${word}] ${subject2} ${predicate2}`, Conj, 0, { n: `${word} (#NN && !#Pron && !#Prop && !#Actor) #Prop` }],
      // [Before] the guests from the village arrived, we ate.
      // [After] the guests from the village arrived, we ate.
      // [Since] the guests from the village arrived, we ate. ... → Conjunction
      [`[${word}] ${subject2} (from|of|with|in|on|at|beside|near) ${subject2} ${predicate2}`, Conj, 0]
    ]),
    // [Before] the dog and the cat woke, she left.
    // [before] the dog and the cat woke
    // [after] the dog and the cat woke... → Conjunction
    ...["before", "after", "until", "when", "while"].map((word) => [`^[${word}] ${subject2} and ${subject2} ${predicate2}`, Conj, 0]),
    // She bought flowers, [for] I was ill. → Conjunction
    [`@hasComma [for] ${subject2} ${predicate2}`, Conj, 0],
    // She sings [like] her mother → Preposition
    ["(#V && !#Aux && !#Mod && !do && !does && !did && !have && !has && !had) [like] (#NN|#Det|#Poss)", Prep, 0],
    // She sings [like] her mother does → Conjunction
    [`(#V && !#Aux && !#Mod && !do && !does && !did && !have && !has && !had) [like] ${subject2} ${predicate2}`, Conj, 0],
    // Which chair did she [sit] on? → remove PhrasalVerb from sit
    [seatedQuestion, null, 0, { u: "PhrV" }],
    // Which chair did she sit [on]? → Preposition (second capture)
    [seatedQuestion, Prep, 1],
    // he ate, and [left] → PastTense
    ["(#Past && @hasComma) and [%Adj|Past%] #Adv+?$", Past, 0],
    // { match: locative, group: 0, tag: 'Preposition' },
    // { match: locative, group: 1, tag: 'Infinitive' },
    // being [injured] and treated → PastTense
    ["being #Adv+? [%Adj|Past%] (and|or) #Adv+? (#Past|#VBN)", Past, 0],
    // dogs, [including] the poodle → Preposition
    ["(#NN && @hasComma) [including] all? #Det? #Card+? #Adv+? #Adj+? #NN", Prep, 0],
    // can you [walk], please? → Imperative
    ["^(can|could|will|would) you (#Adv|not)+? [(#Inf && @hasComma)] please$", "Imp", 0],
    // can you [walk] the dog, please? → Imperative
    ["^(can|could|will|would) you (#Adv|not)+? [#Inf] * @hasComma please$", "Imp", 0],
    // jack the ripper → Person
    ["%Person|Verb% (the && #Pers) #Pers", Pers],
    // keep the lid [closed] → Adjective
    ["#Imp #Det #NN+ [%Adj|Past%]", Adj, 0]
    // console.log('  ', rules.length, 'matches second-pass\n\n')
  ];
  var second_pass_default = expand_rules_default(rules3);

  // node_modules/compromise/src/2-two/postTagger/compute/local-corrections.js
  var spatial = /* @__PURE__ */ new Set([
    "above",
    "below",
    "under",
    "over",
    "beside",
    "behind",
    "against",
    "outside",
    "inside",
    "near",
    "beneath",
    "underneath",
    "aboard"
  ]);
  var demonstratives = /* @__PURE__ */ new Set(["this", "that", "these", "those"]);
  var doForms2 = /* @__PURE__ */ new Set(["do", "does", "did"]);
  var degrees = /* @__PURE__ */ new Set(["very", "remarkably", "extremely", "quite", "unusually"]);
  var localCorrections = (sentences) => {
    const pending = [];
    sentences.forEach((terms) => {
      const last = terms.length - 1;
      if (terms[last]?.switch === "Plural|Verb" && /^(barks|snores)$/.test(terms[last - 1]?.normal) && /^(that|which|who)$/.test(terms[last - 2]?.normal) && terms[last - 3]?.tags.has(Sing)) {
        pending.push([[terms[last - 1], terms[last]], Pres, "relative-main-verb"]);
      }
      for (let i3 = 0; i3 < terms.length; i3 += 1) {
        const term = terms[i3];
        const next = terms[i3 + 1];
        const prev = terms[i3 - 1];
        if (term.normal === "read" && /^(he|she|it)$/.test(prev?.normal) && terms[i3 - 2]?.tags.has(NN) && !terms[i3 - 2].tags.has(Vb)) {
          pending.push([[term], Past, "embedded-read"]);
        }
        if (term.switch === "Adj|Past" && prev?.tags.has(Plur) && prev.tags.has("Hyphenated") && !next) {
          pending.push([[term], Past, "hyphen-subject-past"]);
        }
        if (term.normal === "type" && prev?.post === "-" && terms[i3 - 2]?.post === "-" && terms[i3 - 3]?.tags.has(Det) && next?.tags.has(NN) && terms[i3 - 2].tags.has(Phrasal)) {
          pending.push([[terms[i3 - 2], prev], Adj, "phrasal-type-adjective"]);
        }
        if (term.switch === "Plural|Verb" && prev?.tags.has(Sing) && !prev.tags.has(Prop)) {
          let before3 = i3 - 2;
          for (; before3 >= 0; before3 -= 1) {
            if (!terms[before3].tags.has(Adj) && !terms[before3].tags.has(Adv)) {
              break;
            }
          }
          if (/^(this|that)$/.test(terms[before3]?.normal)) {
            pending.push([[term], Pres, "demonstrative-predicate"]);
          }
          for (; before3 >= 0; before3 -= 1) {
            const tags = terms[before3].tags;
            if (terms[before3].post.includes(",") || !tags.has(Sing) && !tags.has(Adj) && !tags.has(Adv)) {
              break;
            }
          }
          if (terms[before3]?.normal === "each" && (!next || !next.tags.has(NN) || next.tags.has(Pron))) {
            pending.push([[term], Pres, "each-predicate"]);
          }
        }
        if (term.switch === "Noun|Gerund" && prev?.tags.has(NN) && prev.post.includes(",") && next?.normal === "and" && terms[i3 + 2]?.switch === "Plural|Verb") {
          pending.push([[term], NN, "noun-list-gerund"]);
          pending.push([[terms[i3 + 2]], Plur, "noun-list-plural"]);
        }
        if (term.switch === "Plural|Verb" && prev?.tags.has(Pres) && prev.post.includes(",") && next?.normal === "and" && terms[i3 + 2]?.tags.has(Pres)) {
          pending.push([[term], Pres, "coordinated-present"]);
        }
        if (!next) {
          continue;
        }
        if (spatial.has(term.normal) && !term.tags.has(Vb)) {
          const tags = next.tags;
          if (tags.has(Det) || tags.has(Poss) || tags.has(Pron) || tags.has(Prop)) {
            pending.push([[term], Prep, "space-obj"]);
          }
        }
        if (demonstratives.has(term.normal)) {
          let end2 = i3 + 1;
          for (; end2 < terms.length && terms[end2].tags.has(Adv); end2 += 1) {
          }
          const tags = terms[end2]?.tags;
          if (tags?.has(Inf) && (doForms2.has(prev?.normal) || prev?.tags.has(Mod))) {
            pending.push([[term], Pron, "dem-q"]);
          }
          const subject3 = term.normal === "this" || term.normal === "that" && (!prev || prev.tags.has(Conj) || prev.tags.has(Vb));
          if (subject3 && tags?.has(Pres) && !tags.has(Inf) && !tags.has(Ger)) {
            pending.push([[term], Pron, "this-finite-subj"]);
          }
        }
        if (term.normal === "will" && new RegExp("^\\p{Lu}[a-z'\\u00C0-\\u00FF]", "u").test(term.text) && next.tags.has(Past)) {
          pending.push([[term], First, "will-past-subj"]);
        }
        if (term.normal === "will" && new RegExp("^\\p{Lu}[a-z'\\u00C0-\\u00FF]", "u").test(term.text) && (next.machine || next.normal) === "is") {
          pending.push([[term], First, "will-is-subj"]);
        }
        if (term.switch === "Adj|Noun" && next.tags.has(Actor) && degrees.has(terms[i3 - 1]?.normal) && terms[i3 - 2]?.tags.has(Det)) {
          pending.push([[term], Adj, "degree-actor"]);
        }
        if (term.tags.has(TxtNum) && term.tags.has(Date2) && next.tags.has(TxtNum)) {
          pending.push([[term, next], Date2, "textvalue-date"]);
        }
      }
    });
    return pending;
  };
  var local_corrections_default = localCorrections;

  // node_modules/compromise/src/2-two/postTagger/compute/index.js
  var net = null;
  var secondNet = null;
  var secondPass2 = function(sentences, world2) {
    const { methods: methods19 } = world2;
    secondNet ||= methods19.one.buildNet(second_pass_default, world2);
    const local = local_corrections_default(sentences);
    const found = methods19.one.bulkMatch(sentences, secondNet, methods19);
    methods19.one.bulkTagger(found, sentences, world2);
    local.forEach(([terms, tag, reason2]) => methods19.one.setTag(terms, tag, world2, null, `[post-local] ${reason2}`));
  };
  var postTagger = function(view) {
    const { world: world2 } = view;
    const { model: model5, methods: methods19 } = world2;
    net ||= methods19.one.buildNet(model5.two.matches, world2);
    const sentences = view.docs;
    const clauses2 = methods19.two.quickSplit(sentences);
    methods19.two.leftRight(clauses2, model5.two.leftRight, world2);
    const found = methods19.one.bulkMatch(clauses2, net, methods19);
    methods19.one.bulkTagger(found, clauses2, world2);
    secondPass2(sentences, world2);
    view.uncache();
    view.unfreeze();
    return view;
  };
  var tagger2 = (view) => view.compute(["freeze", "lexicon", "preTagger", "postTagger", "unfreeze"]);
  var compute_default11 = { postTagger, tagger: tagger2 };

  // node_modules/compromise/src/2-two/postTagger/api.js
  var round = (n2) => Math.round(n2 * 100) / 100;
  function api_default11(View2) {
    View2.prototype.confidence = function() {
      let sum = 0;
      let count = 0;
      this.docs.forEach((terms) => {
        terms.forEach((term) => {
          count += 1;
          sum += term.confidence || 1;
        });
      });
      if (count === 0) {
        return 1;
      }
      return round(sum / count);
    };
    View2.prototype.tagger = function() {
      return this.compute(["tagger"]);
    };
  }

  // node_modules/compromise/src/2-two/postTagger/plugin.js
  var plugin2 = {
    api: api_default11,
    compute: compute_default11,
    model: model_default4,
    hooks: ["postTagger"]
  };
  var plugin_default16 = plugin2;

  // node_modules/compromise/src/2-two/lazy/maybeMatch.js
  var getWords = function(net3) {
    return Object.keys(net3.hooks).filter((w) => !w.startsWith("#") && !w.startsWith("%"));
  };
  var maybeMatch = function(doc, net3) {
    const words = getWords(net3);
    if (words.length === 0) {
      return doc;
    }
    if (!doc._cache) {
      doc.cache();
    }
    const cache2 = doc._cache;
    return doc.filter((_m, i3) => {
      return words.some((str) => cache2[i3].has(str));
    });
  };
  var maybeMatch_default = maybeMatch;

  // node_modules/compromise/src/2-two/lazy/lazyParse.js
  var lazyParse = function(input, reg) {
    let net3 = reg;
    if (typeof reg === "string") {
      net3 = this.buildNet([{ match: reg }]);
    }
    const doc = this.tokenize(input);
    const m3 = maybeMatch_default(doc, net3);
    if (m3.found) {
      m3.compute(["index", "tagger"]);
      return m3.match(reg);
    }
    return doc.none();
  };
  var lazyParse_default = lazyParse;

  // node_modules/compromise/src/2-two/lazy/plugin.js
  var plugin_default17 = {
    lib: {
      lazy: lazyParse_default
    }
  };

  // node_modules/compromise/src/2-two/swap/api/swap-verb.js
  var matchVerb = function(m3, lemma) {
    const conjugate2 = m3.methods.two.transform.verb.conjugate;
    const all4 = conjugate2(lemma, m3.model);
    if (m3.has("#Gerund")) {
      return all4.Gerund;
    }
    if (m3.has("#PastTense")) {
      return all4.PastTense;
    }
    if (m3.has("#PresentTense")) {
      return all4.PresentTense;
    }
    if (m3.has("#Gerund")) {
      return all4.Gerund;
    }
    return lemma;
  };
  var swapVerb = function(vb3, lemma) {
    let str = lemma;
    vb3.forEach((m3) => {
      if (!m3.has("#Infinitive")) {
        str = matchVerb(m3, lemma);
      }
      m3.replaceWith(str);
    });
    return vb3;
  };
  var swap_verb_default = swapVerb;

  // node_modules/compromise/src/2-two/swap/api/swap.js
  var swapNoun = function(m3, lemma) {
    let str = lemma;
    if (m3.has("#Plural")) {
      const toPlural = m3.methods.two.transform.noun.toPlural;
      str = toPlural(lemma, m3.model);
    }
    m3.replaceWith(str, { possessives: true });
  };
  var swapAdverb = function(m3, lemma) {
    const { toAdverb: toAdverb2 } = m3.methods.two.transform.adjective;
    const str = lemma;
    const adv = toAdverb2(str);
    if (adv) {
      m3.replaceWith(adv);
    }
  };
  var swapAdjective = function(m3, lemma) {
    const { toComparative: toComparative3, toSuperlative: toSuperlative3 } = m3.methods.two.transform.adjective;
    let str = lemma;
    if (m3.has("#Comparative")) {
      str = toComparative3(str, m3.model);
    } else if (m3.has("#Superlative")) {
      str = toSuperlative3(str, m3.model);
    }
    if (str) {
      m3.replaceWith(str);
    }
  };
  var swap = function(from, to, tag) {
    let reg = from.split(/ /g).map((str) => str.toLowerCase().trim());
    reg = reg.filter((str) => str);
    reg = reg.map((str) => `{${str}}`).join(" ");
    let m3 = this.match(reg);
    if (tag) {
      m3 = m3.if(tag);
    }
    if (m3.has("#Verb")) {
      return swap_verb_default(m3, to);
    }
    if (m3.has("#Noun")) {
      return swapNoun(m3, to);
    }
    if (m3.has("#Adverb")) {
      return swapAdverb(m3, to);
    }
    if (m3.has("#Adjective")) {
      return swapAdjective(m3, to);
    }
    return this;
  };
  var swap_default = swap;

  // node_modules/compromise/src/2-two/swap/plugin.js
  var api4 = function(View2) {
    View2.prototype.swap = swap_default;
  };
  var plugin_default18 = {
    api: api4
  };

  // node_modules/compromise/src/2-two/left-right/model/_lib.js
  var context = /^(?:#[A-Za-z][A-Za-z0-9]*|[\p{L}\p{N}][\p{L}\p{N}'’-]*)$/u;
  var tagName = /^!?#[a-z][a-z0-9]*$/i;
  var parseContext = (source, fail) => {
    const alternatives = source.startsWith("(") && source.endsWith(")");
    const values = alternatives ? source.slice(1, -1).split("|") : [source];
    if (alternatives && values.length < 2 || values.some((value) => !context.test(value))) {
      fail();
    }
    const words = /* @__PURE__ */ new Set();
    const tags = [];
    values.forEach((value) => {
      if (value.startsWith("#")) {
        tags.push(value.slice(1));
      } else {
        words.add(value);
      }
    });
    return { words, tags };
  };
  var parse4 = (word, source) => {
    const fail = () => {
      throw new Error(`Invalid left-right rule for "${word}": ${source}. Expected "[pre] _ [post] -> #Tag | !#Tag".`);
    };
    if (typeof source !== "string") {
      fail();
    }
    const parts2 = source.split("->").map((s2) => s2.trim());
    if (parts2.length !== 2) {
      fail();
    }
    const actions = parts2[1].split("|").map((s2) => s2.trim()).map((action) => {
      if (!tagName.test(action)) {
        fail();
      }
      if (action.startsWith("!")) {
        return { unTag: action.slice(2) };
      }
      return { tag: action.slice(1) };
    });
    const terms = parts2[0].split(/\s+/);
    const index3 = terms.indexOf("_");
    if (index3 < 0 || index3 > 1 || terms.length - index3 > 2) {
      fail();
    }
    const rule = { actions, reason: `${source}` };
    if (index3 === 1) {
      let pre = terms[0];
      if (pre.startsWith("^")) {
        pre = pre.slice(1);
        rule.start = pre ? 1 : 0;
      }
      if (pre) {
        rule.pre = parseContext(pre, fail);
      }
    }
    if (index3 < terms.length - 1) {
      let post = terms[index3 + 1];
      if (post.endsWith("$")) {
        post = post.slice(0, -1);
        rule.end = post ? 1 : 0;
      }
      if (post) {
        rule.post = parseContext(post, fail);
      }
    }
    return rule;
  };
  var compile = (rules8) => Object.fromEntries(Object.entries(rules8).map(([word, entries]) => {
    if (!Array.isArray(entries)) {
      throw new Error(`Left-right rules for "${word}" must be an array.`);
    }
    let key = word;
    if (word.startsWith("#")) {
      key = word.slice(1);
    } else if (word.startsWith("%") && word.endsWith("%")) {
      key = word.slice(1, -1);
    }
    return [key, entries.map((source) => parse4(word, lib_default10(source)))];
  }));
  var lib_default11 = compile;

  // node_modules/compromise/src/2-two/left-right/model/by-word.js
  var adverbBeforeAdjective = "_ #Adj -> #Adv";
  var imperativeBeforeAdjective = "^ _ #Adj -> #Imp";
  var imperativeBeforeNoun = "^ _ #NN -> #Imp";
  var infinitiveBeforeGerund = "_ #Ger -> #Inf";
  var rules4 = {
    cold: [
      // a bit [cold]; ice [cold]
      "(bit|ice) _ -> #Adj"
    ],
    lunatic: [
      "_ fringe -> #Adj"
    ],
    fringe: [
      "lunatic _ -> #Noun"
    ],
    here: [
      // come [here], leave the bowls [here], is [here]
      "(#Verb|#Noun) _ $ -> #Adv",
      "#Verb _ (#Date|now) -> #Adv"
    ],
    too: [
      "_ much -> #Adv"
    ],
    much: [
      adverbBeforeAdjective,
      "(too|bit) _ -> #Adj"
    ],
    bit: [
      "a _ -> #Sing",
      // a [bit] much
      "a _ much -> #Adv"
    ],
    live: [
      "long _ -> #Inf"
    ],
    rights: [
      "_ of -> #NN",
      "equal _ -> #Plural"
    ],
    over: [
      // geek out [over] computers
      "#Particle _ #NN -> #Prep"
    ],
    under: [
      // looked [under] the bed
      "#V _ (#Det|#Poss|#Pron) -> #Prep",
      // labor [under] difficult conditions; panic [under] pressure
      "(labor|labour|panic|labors|labours|panics|labored|laboured|panicked|laboring|labouring|panicking) _ (#Adj|#Noun) -> #Prep",
      // wimp out [under] pressure
      "#Particle _ #NN -> #Prep"
    ],
    am: [
      // five [am]
      "#Value _ -> #Time"
    ],
    pm: [
      "#Value _ -> #Time"
    ],
    well: [
      // a [well] made table
      "_ #Past -> #Adv"
    ],
    cool: [
      // keep it [cool]
      "it _ $ -> #Adj"
    ],
    long: [
      "_ after$ -> #Adv",
      "_ live -> #Adv"
    ],
    minus: [
      // [minus] seven
      "_ #Value -> #Value"
    ],
    negative: [
      "_ #Value -> #Value"
    ],
    point: [
      // seven [point] five
      "#Value _ #Value -> #Value"
    ],
    decimal: [
      "#Value _ #Value -> #Value"
    ],
    fine: [
      // pay his [fine]; it works out [fine]
      "#Poss _ $ -> #Singular",
      "#PhrasalVerb _ $ -> #Adjective"
    ],
    lieutenant: [
      // 1st [lieutenant]
      "(1st|2nd|3rd) _ -> #Hon"
    ],
    dozen: [
      // two [dozen] eggs
      "(a|#Cardinal) _ -> #Multiple | #Cardinal"
    ],
    how: [
      // [how] is she?
      "_ (#Det|#Cop|#Mod|#Past) -> #QW"
    ],
    rival: [
      // a [rival] company
      "(#Det|#Poss) _ #Noun -> #Adjective"
    ],
    bill: [
      // the [bill] is a common noun, despite its name default
      "(#Det|#Poss) _ -> #Singular | !#Person | !#ProperNoun"
    ],
    air: [
      // the [air] force
      "_ force -> #NN"
    ],
    said: [
      // the [said] dog
      "the _ #NN -> #Adj"
    ],
    still: [
      // was [still] in
      "#Cop _ (in|#Ger|#Adj) -> #Adv",
      // [still] good
      // [still] make
      "_ (#Adj|#V) -> #Adv"
    ],
    so: [
      // [so] hot
      adverbBeforeAdjective,
      // do [so]
      "do _ -> #Adv",
      // [so] he
      "_ #NN -> #Conj"
    ],
    way: [
      // [way] hotter
      // [way] over
      "_ (#Comp|#Adj) -> #Adv"
    ],
    all: [
      // they [all] swim
      "_ #V -> #Adv",
      // assign [all] tasks
      "assign _ (#Pres|#Plur) -> #Det",
      // we [all]
      "(we|us) _ -> #NN"
    ],
    even: [
      "#Det _ #NN -> #Adj",
      // barely [even] noticed
      "(barely|hardly) _ -> #Adv",
      // [even] held
      // [even] worse
      // [even] the greatest
      "_ (#V|#Comp|#Det|#Poss) -> #Adv"
    ],
    later: [
      // [later] say
      "_ #Pres -> #Adv"
    ],
    enough: [
      // high [enough]
      "#Adj _ -> #Adv"
    ],
    least: [
      // [least] expensive
      adverbBeforeAdjective,
      // the [least]
      "#Det _ -> #Adv"
    ],
    sun: [
      // [sun] feb 2
      "_ #Date -> #WeekDay",
      // the [sun]
      "#Det _ -> #Sing"
    ],
    more: [
      // [more] players
      "_ #NN -> #Adj",
      // any [more]
      "(the|any) _ -> #Sing"
    ],
    u: [
      // and [u]
      "#Conj _ -> #Pron",
      // [u] made me smile
      "_ #V -> #Pron",
      "_ r -> #Pron"
    ],
    r: [
      // u [r] cool
      "u _ -> #Cop"
    ],
    half: [
      "^ _ $ -> #Frac",
      "#Det _ #Unit -> #Value",
      // nearly [half]
      "#Adv _ -> #Frac",
      // [half] the
      "_ the -> #Frac",
      // a [half] second
      "#Det _ #Ord -> #Value"
    ],
    second: [
      "(half|quarter) _ -> #Unit | #Singular",
      // one [second]
      "#Card _ -> #Unit",
      // [second] dog
      "_ #NN -> #Ord"
    ],
    will: [
      // [will] go
      "_ #Inf -> #Mod",
      // [will] walked to the park
      "^ _ #Past -> #First"
    ],
    march: [
      // must [march]
      "#Mod _ -> #Inf",
      // in [march]
      "(in|by|before|during|on|until|after|of|within|all) _ -> #Month",
      // early [May]
      "(early|late|mid) _ -> #Month",
      // [march] quickly
      "_ #Adv -> #V"
    ],
    may: [
      // [may] be
      "_ be -> #V",
      // early [May]
      "(early|late|mid) _ -> #Month",
      // [march] quickly
      "_ #Adv -> #V"
    ],
    open: [
      // [open] the door
      "_ #Det -> #Inf"
    ],
    be: [
      // will [be] walked
      "will _ #Past -> #Aux",
      // [stay] cool
      imperativeBeforeAdjective
    ],
    about: [
      // at [about]
      "#Prep _ -> #Adv"
    ],
    plenty: [
      // [plenty] of
      "_ of -> #Uncountable"
    ],
    no: [
      // see [no]
      "#V _ -> #Neg"
    ],
    turkey: [
      // i ate [turkey]
      "(eat|ate|eating|roast|roasted|thanksgiving) _ -> #Uncountable | !#Place",
      // [turkey] dinner
      "_ (roast|dinner|sandwich|burger) -> #Uncountable | !#Place",
      // ankara [turkey]
      // in [turkey]
      "(#Place|in|near|nearby|to|from) _ -> #Country"
    ],
    that: [
      // [that] is all
      "^ _ #Cop -> #Pron",
      // says [that] he
      "#V _ #Pron -> #Conj",
      // things [that] are required
      "#NN _ #Cop -> #Conj"
    ],
    like: [
      // nothing [like]
      "nothing _ -> #Prep",
      // [like] the time
      "^ _ #Det -> #Prep"
    ],
    enduring: [
      // enduring symbols, running water
      "_ (symbols|legacy|legacies|appeal|influence|value|values) -> #Adj"
    ],
    running: [
      // enduring symbols, running water
      "(have|has|had|#Det|#Poss) _ water -> #Adj"
    ],
    wit: [
      // [wit] it
      "_ (me|it) -> #Prep"
    ],
    leads: [
      // it [leads] to
      "_ (to|from) -> #Pres",
      // that [leads]
      "(that|this) _ -> #Pres"
    ],
    look: [
      // [look] good
      "_ #Adj -> #Pres",
      // [pay] attention
      imperativeBeforeNoun
    ],
    finish: [
      // [start] listening
      infinitiveBeforeGerund
    ],
    help: [
      // [start] listening
      infinitiveBeforeGerund,
      // [pay] attention
      imperativeBeforeNoun
    ],
    right: [
      // [right] after
      "_ (before|after|in|into|to|toward|above|below|under|over) -> #Adv",
      "_ of -> #NN"
    ],
    there: [
      // always [there]
      "(always|nearly|barely|practically) _ -> #Adj"
    ],
    mine: [
      // than [mine]
      "(then|than) _ -> #Poss"
    ],
    sorry: [
      // said [sorry]
      "(say|says|said) _ -> #Expr"
    ],
    wed: [
      // on [wed]
      "(in|by|before|during|on|until|after|of|within|all) _ -> #WeekDay | #Singular"
    ],
    quarter: [
      "#Det _ #Unit -> #Value",
      // a [half] second
      "#Det _ #Ord -> #Value"
    ],
    kind: [
      // some [kind] of teacher
      "(#Det|#Comp|new|different) _ of -> #NN",
      // same [kind] of shouts
      "same _ of -> #NN",
      // a new [kind]
      "(#Det|#Comp|new|different) _ $ -> #NN"
    ],
    close: [
      // a close friend
      "#Det _ #NN -> #Adj",
      // came to a [close]
      "#Det _ $ -> #NN"
    ],
    sat: [
      // on [sat]
      "(in|by|before|during|on|until|after|of|within|all) _ -> #WeekDay | #Singular",
      // [sat] november
      "^ _ #Date -> #WeekDay | #Singular"
    ],
    read: [
      // he [read]
      "^(he|she|it|#Pers) _ -> #Past"
    ],
    stay: [
      // [stay] away
      "^ _ (out|away|back) -> #Imp",
      // [stay] cool
      imperativeBeforeAdjective
    ],
    keep: [
      // [stay] cool
      imperativeBeforeAdjective
    ],
    shoot: [
      // shoot
      "^ _ $ -> #Expr"
    ],
    seconds: [
      // 10 [seconds]
      "#Value _ -> #Plur | !#Value"
    ],
    premier: [
      // This is the [premier] university in Virginia
      "the _ #NN -> #Adj"
      // { m: '#Cop the [%Adj|Noun%] #NN', g: 0, t: 'Adj', r: 'premier-uni' },
    ],
    frequent: [
      // i [frequent] this restaurant
      "#Pron _ #Det -> #Inf"
    ],
    google: [
      // [google] me
      "^ _ #Pron -> #Inf"
    ],
    left: [
      // she even [left]
      "even _ $ -> #Past"
    ],
    since: [
      // she has [since] moved
      "(has|have|had) _ #Past -> #Adv"
    ],
    time: [
      // she had [time]
      "had _ $ -> #NN"
    ],
    closing: [
      // the station was [closing]
      "#Cop _ -> #Ger"
    ],
    growing: [
      // plants that were [growing]
      "#Cop _ -> #Ger"
    ],
    soon: [
      "_ after$ -> #Adv",
      // the shop is closing [soon]
      "closing _ $ -> #Adv"
    ],
    penny: [
      // half a [penny]
      "a _ $ -> #Currency"
    ],
    next: [
      // 1pm [next] sun
      "#Time _ (sun|#WeekDay) -> #Date"
    ],
    to: [
      // from start [to] finish
      "start _ finish -> #Prep",
      // [to] the store
      "_ (#Det|#Poss|#Pron|#Email|#Url) -> #Prep | !#Conj"
    ],
    in: [
      // bowed his head [in] prayer
      "_ prayer -> #Prep"
    ],
    pope: [
      // [pope] francis
      "_ #Pers -> #Hon"
    ],
    prince: [
      // [prince] paris
      "_ #Prop -> #Hon"
    ],
    born: [
      // being [born]
      "being _ -> #Past"
    ],
    ya: [
      // are [ya]
      "(are|#Mod|see|do|for) _ -> #Pron"
    ],
    after: [
      // we met shortly [after]
      "(shortly|soon|long) _ $ -> #Adv"
    ],
    yet: [
      // she has not arrived [yet]
      "#Past _ $ -> #Adv"
    ],
    before: [
      // [before] dinner
      "_ (#Det|#Poss|#NN|#Ger|#Date) -> #Prep"
    ],
    below: [
      // dropped [below] zero
      "_ #Value -> #Prep"
    ],
    alongside: [
      // runs [alongside] the river
      "_ (#Det|#Poss|#Pron|#Prop) -> #Prep"
    ],
    behind: [
      // fell [behind] the sofa, but fell behind
      "#Past _ (#Det|#Poss|#Pron) -> #Prep"
    ],
    do: [
      // [do] you swim?
      "^ _ (you|we|they) -> #QW"
    ],
    does: [
      // [does] he swim?
      "^ _ (he|she|it|#Prop) -> #QW"
    ],
    me: [
      // i ate [me] sandwich (scottish slang)
      "#Past _ #NN -> #Poss"
    ]
  };
  var compounds = {
    // travel by [train]; benefit from [exercise]
    train: "by _ -> #Noun",
    exercise: "(after|from) _ -> #Noun",
    // zoom [past] the house; rage [against] injustice
    past: "#V _ #Det -> #Prep",
    against: "#V _ #Noun -> #Prep",
    // deserving such [praise]
    praise: "such _ -> #Noun",
    // spoke [concerning] the budget
    concerning: "(spoke|talked|wrote) _ #Det -> #Prep",
    // is [lasting] [longer]
    lasting: "#Cop _ longer -> #Ger",
    longer: "lasting _ $ -> #Adv",
    // is [empowering] local women
    empowering: "#Cop _ #Adj -> #Ger",
    // attempts at [escape]; waited [pending] approval
    escape: "at _ -> #Noun",
    pending: "#Past _ #Noun -> #Prep",
    // is [lagging] behind
    lagging: "#Cop _ behind -> #Ger",
    // anyone [owing] money; was sadly [lacking]
    owing: "_ #Noun -> #Ger",
    lacking: "(sadly|sorely) _ $ -> #Adj",
    // is [absorbing] water
    "absorbing|baffling|contributing|exacting|foreboding": "#Cop _ #Noun -> #Ger",
    // is [booming] again; is flowering [early]
    "booming|skyrocketing": "#Cop _ again -> #Ger",
    "budding|flowering": "#Cop _ early -> #Ger",
    screeching: "#Cop _ outside -> #Ger",
    early: "(budding|flowering) _ $ -> #Adv",
    // is [drifting] toward the shore
    "accelerating|dashing|drifting|rushing|sloping|staggering": "#Cop _ toward -> #Ger",
    // is [meandering] through the village
    "meandering|rambling|speeding|surging": "#Cop _ through -> #Ger",
    // is [decaying] in the rain; is [smiling] at the baby
    "decaying|fading|flaming|gleaming|maturing|sparkling|swelling|thriving": "#Cop _ in -> #Ger",
    "glaring|remaining|roaring|smiling": "#Cop _ at -> #Ger",
    // is [appealing] against the verdict; is [trembling] with fear
    "appealing|conspiring|intriguing|leaning|raging": "#Cop _ against -> #Ger",
    "conflicting|corresponding|trembling|trifling": "#Cop _ with -> #Ger",
    "agonizing|reigning": "#Cop _ over -> #Ger",
    "aching|ensuing": "#Cop _ after -> #Ger",
    bustling: "#Cop _ around -> #Ger",
    dissenting: "#Cop _ from -> #Ger",
    living: "#Cop _ near -> #Ger",
    prevailing: "#Cop _ despite -> #Ger",
    plunging: "#Cop _ into -> #Ger",
    emerging: "#Cop _ from -> #Ger",
    flowing: "#Cop _ under -> #Ger",
    soaring: "#Cop _ above -> #Ger",
    sprawling: "#Cop _ across -> #Ger",
    revolving: "#Cop _ around -> #Ger",
    // [1st] lieutenant
    "1st|2nd|3rd": "_ lieutenant -> #Hon",
    // is [when] he left
    "who|what|where|why|how|when": "#Cop _ #NN -> #Conj",
    // [dark] green
    "dark|bright|flat|light|soft|pale|dead|dim|faux|little|wee|sheer|most|near|good|extra|all": adverbBeforeAdjective,
    // in [march]
    "march|may": "#Prep _ -> #Month",
    // what the [hell]
    "shit|damn|hell": "#Det _ -> #NN",
    // go to [hell]
    "shit|hell": "to _ -> #NN",
    // the [can]
    "can|will|may": "the _ -> #Sing",
    // five [feet]
    "foot|feet": "#Value _ -> #Unit",
    // [damn] them
    "shit|damn": "^ _ them -> #Inf",
    // [super] strong
    "super|pretty": adverbBeforeAdjective,
    // a [must]
    // a [while]
    "must|while": "a _ -> #Sing",
    // 5 [k]
    // 5 [gb]
    "k|gb|pa|ft|m": "#Value _ -> #Unit",
    // [sounds] fun
    // [look] good
    "sound|sounds|looks": "_ #Adj -> #Pres",
    // [stops] thinking
    "start|stop|starts|stops|begin|begins": "_ #Ger -> #V",
    // help [stop]
    "start|stop|end|make": "help _ -> #Inf",
    // [start] listening
    "start|stop": infinitiveBeforeGerund,
    // [pay] attention
    "start|stop|ask|wear|pay|show|watch|act|fix|kill|turn|try|win": imperativeBeforeNoun,
    // 5pm [central]
    "eastern|mountain|pacific|central|est|pst|gmt": "#Time _ -> #Timezone | #Singular",
    // [dance] music
    "dance|rock|rap|swing": "_ (music|class|lesson|night|party|festival|league|ceremony) -> #NN",
    // ten [bucks]
    "buck|bucks|grand": "#Value _ -> #Currency",
    // 5 [square] miles
    "square|cubic": "#Value _ #Unit -> #Unit",
    // is [alone]
    "just|alone": "#Cop _ $ -> #Adj",
    // [go] home
    "go|come": "^ _ home -> #Imp",
    // ok,
    // alright
    // hell
    // anyways
    "ok|alright|hell|anyways": "^ _ -> #Expr",
    // [dude] we should
    "dude|man|girl": "^ _ #Pron -> #Expr",
    // [un] skilled
    "un|contra|extra|inter|intra|macro|micro|mid|mis|mono|multi|pre|sub|tri|ex": "_ #Adj -> #Adj | #Prefix",
    "over|under": "(is|was|were) _ #Past -> #Adv",
    // ...['under', 'over'].map(word => ({
    // m: `(is|was|were) [${word} #Past]`,
    "shit|damn|fuck": "_ (#Det|#Poss|them) -> #Verb",
    // the poor
    "poor|weary|public": "the _ #Verb-> #Noun"
  };
  Object.entries(compounds).forEach(([words, rule]) => {
    words.split("|").forEach((word) => {
      rules4[word] ||= [];
      rules4[word].push(rule);
    });
  });
  var by_word_default = rules4;

  // node_modules/compromise/src/2-two/left-right/model/by-tag.js
  var rules5 = {
    "#Value": [
      // [five] pm
      "_ (am|pm) -> #Time"
    ],
    "#QuestionWord": [
      // [when] stolen
      "_ #VBN -> #Prep"
    ],
    "#Adverb": [
      // is [well]
      "#Cop _ $ -> #Adj"
    ],
    "#Person": [
      // bought a [warhol]
      "(a|an) _ $ -> !#Pers"
    ],
    "#ProperNoun": [
      // in [#ProperNoun] -> #Place
      // in [Foo] California
      "in _ -> #Place"
    ],
    "#PastTense": [
      // well [made]
      "well _ -> #Adj",
      "(over|under) _ -> #Adj"
    ],
    "#Gerund": [
      // as [entertaining] as
      "as _ as -> #Adj",
      // more [amusing] than
      "more _ than -> #Adj",
      // very [entertaining]
      "(so|very|extremely) _ -> #Adj",
      // the [failing] line
      "#Det _ #NN -> #Adj",
      // [walking] should be fun
      "_ #Mod -> #Activity",
      // i think tipping sucks
      "#Inf _ #Pres -> #Noun"
    ],
    "#Adjective": [
      // the [above] is clear
      // real [evil] is
      "(#Det|#Adj) _ #Cop -> #NN",
      // no [golden] would
      "no _ #Mod -> #NN",
      // a [minor] in
      "a _ #Prep -> #NN",
      // is [done] well
      "#Cop _ (well|badly|quickly|slowly) -> #V",
      // for the poor this
      "the _ #Det -> #NN"
    ],
    "#Participle": [
      // a [blown] motor
      "(the|those|these|a|an) _ #NN -> #Adj"
    ],
    "#Verb": [
      // the [manufacture] of perfume
      "(a|an|the) _ of -> #NN",
      // became [embroiled]
      "(become|became|becoming|becomes) _ -> #Adj"
    ],
    "#Singular": [
      // the [staff] were
      "(the|these) _ (were|are) -> #Plur",
      // the [repairer] said
      "#Det _ said -> #Actor"
    ],
    "#Infinitive": [
      // in [love]
      // about [thank]-you letters
      "(in|about) _ -> #Sing",
      // any [thank]-you letter
      // no [thank] you
      "(any|no) _ -> #NN",
      // as [fit] as
      "as _ as -> #Adj",
      // somebody [call]
      "^(somebody|everybody) _ -> #Imp",
      // never [say]
      "^never _ -> #Imp",
      // [continue] playing
      "^ _ #Ger -> #Imp",
      // much [thank]-you mail
      "much _ -> #NN"
    ],
    "#PresentTense": [
      // taught [thank]-you etiquette
      "(taught|teaches|learns|learned) _ -> #NN",
      // some [thanks] for helping
      "(many|any|some|several) _ for -> #NN",
      // whose [thanks] are appreciated
      "whose _ #Cop -> #NN"
    ],
    "#Abbreviation": [
      // 500 fifth [ave]
      "#Value _ -> #Unit"
    ],
    "#FirstName": [
      // john [stewart]
      "#First _ -> #Last"
    ],
    "#Cardinal": [
      //  5 June
      "_ #Month -> #Date"
    ]
  };
  var by_tag_default = rules5;

  // node_modules/compromise/src/2-two/left-right/model/by-switch.js
  var rules6 = {
    "%Adj|Gerund%": [
      // is [boring] the audience
      "#Cop _ #Det -> #Ger",
      // is [assuring] us; was [boggling] my mind
      "#Cop _ (#Pron|#Poss|#Reflexive) -> #Ger",
      // world's [leading] manufacturer
      "#Poss _ #NN -> #Adj"
    ],
    "%Adj|Noun%": [
      // her [favourite] sport
      "#Poss _ #NN -> #Adj",
      // a [representative] to
      "#Det _ #Conj -> #NN"
    ],
    "%Noun|Verb%": [
      // to [dream] of
      "to _ #Prep -> #Inf",
      // which [boost] it
      "which _ #NN -> #Inf",
      // Pronouns are nouns too; prefer the embedded object reading.
      // what [work] he did
      "(which|what|whose) _ #Pron -> #NN",
      // [visit] https://example.com
      "^ _ #Url -> #Imp",
      // [commit] to
      "^ _ to -> #Imp"
      //John and Mary [walk]
      // '#Pers _ $ -> #Inf',
    ],
    "%Plural|Verb%": [
      // what [walks] he took
      "(which|what|whose) _ #Pron -> #Plur",
      // asking [questions]
      "#Ger _ -> #Plur",
      // and arms roiling around
      "and _ #Ger -> #Plur"
    ],
    "%Person|Verb%": [
      // [chuck] will ...
      "_ (will|had|has|said|says|told|did|learned|wants|wanted) -> #Pers"
    ],
    "%Person|Place%": [
      // [sydney] harbour
      "_ (harbor|harbour|pier|town|city|place|dump|landfill) -> #Place",
      // east [sydney]
      "(west|east|north|south) _ -> #Place"
    ],
    "%Adj|Present%": [
      // quickly [warm]
      "(slowly|quickly) _ -> #V"
    ]
  };
  var by_switch_default = rules6;

  // node_modules/compromise/src/2-two/left-right/model/index.js
  var model_default5 = {
    two: {
      leftRight: {
        byWord: lib_default11(by_word_default),
        byTag: lib_default11(by_tag_default),
        bySwitch: lib_default11(by_switch_default)
      }
    }
  };

  // node_modules/compromise/src/2-two/left-right/methods/_lib.js
  var matches2 = (term, context2) => {
    if (context2 === void 0 || context2 === "") {
      return true;
    }
    if (!term) {
      return false;
    }
    if (typeof context2 === "string") {
      if (context2.startsWith("#")) {
        return term.tags.has(context2.slice(1));
      }
      return term.normal === context2;
    }
    if (context2.words.has(term.normal)) {
      return true;
    }
    for (let i3 = 0; i3 < context2.tags.length; i3 += 1) {
      if (term.tags.has(context2.tags[i3])) {
        return true;
      }
    }
    return false;
  };
  var lib_default12 = matches2;

  // node_modules/compromise/src/2-two/left-right/methods/_actions.js
  var apply = (term, rule, world2) => {
    const { setTag: setTag2, unTag: unTag2 } = world2.methods.one;
    const terms = [term];
    const reason2 = "2-left-right: " + (rule.reason || "");
    const actions = rule.actions || [rule];
    for (let i3 = 0; i3 < actions.length; i3 += 1) {
      const action = actions[i3];
      if (action.unTag) {
        unTag2(terms, action.unTag, world2.model.one.tagSet, reason2);
        continue;
      }
      setTag2(terms, action.tag, world2, rule.safe, reason2);
      if (action.tag === "Noun") {
        const tag = world2.methods.two.looksPlural(term.text) ? "Plural" : "Singular";
        setTag2(terms, tag, world2, rule.safe, reason2);
      }
    }
  };
  var actions_default = apply;

  // node_modules/compromise/src/2-two/left-right/methods/index.js
  var collect = (entry, terms, i3, pending) => {
    if (!entry) {
      return;
    }
    const bucket = Array.isArray(entry) ? entry : [entry];
    for (let r = 0; r < bucket.length; r += 1) {
      const rule = bucket[r];
      if (rule.start !== void 0 && i3 !== rule.start) {
        continue;
      }
      if (rule.end !== void 0 && i3 !== terms.length - 1 - rule.end) {
        continue;
      }
      if (lib_default12(terms[i3 - 1], rule.pre) && lib_default12(terms[i3 + 1], rule.post)) {
        pending.push([terms[i3], rule]);
      }
    }
  };
  var leftRight = (document, { byWord: byWord3, byTag, bySwitch = {} }, world2) => {
    const pending = [];
    document.forEach((terms) => {
      for (let i3 = 0; i3 < terms.length; i3 += 1) {
        const term = terms[i3];
        if (Object.hasOwn(byWord3, term.normal)) {
          collect(byWord3[term.normal], terms, i3, pending);
        }
        term.tags.forEach((tag) => {
          if (Object.hasOwn(byTag, tag)) {
            collect(byTag[tag], terms, i3, pending);
          }
        });
        if (term.switch && Object.hasOwn(bySwitch, term.switch)) {
          collect(bySwitch[term.switch], terms, i3, pending);
        }
      }
    });
    pending.forEach(([term, rule]) => actions_default(term, rule, world2));
  };
  var methods17 = { two: { leftRight } };
  var methods_default10 = methods17;

  // node_modules/compromise/src/2-two/left-right/plugin.js
  var plugin3 = {
    model: model_default5,
    methods: methods_default10
  };
  var plugin_default19 = plugin3;

  // node_modules/compromise/src/two.js
  one_default.plugin(plugin_default14);
  one_default.plugin(plugin_default15);
  one_default.plugin(plugin_default16);
  one_default.plugin(plugin_default17);
  one_default.plugin(plugin_default19);
  one_default.plugin(plugin_default18);
  var two_default = one_default;

  // node_modules/compromise/src/3-three/_select.js
  var select = (View2, find9, originalDocument = false) => function(n2) {
    const matches3 = typeof find9 === "string" ? this.match(find9) : find9(this);
    const selected = matches3.getNth(n2);
    return new View2(originalDocument ? this.document : selected.document, selected.pointer);
  };
  var select_default = select;

  // node_modules/compromise/src/3-three/adjectives/plugin.js
  var transforms = ["toComparative", "toSuperlative", "toAdverb", "toNoun"];
  var toRoot2 = function(adj) {
    const { fromComparative: fromComparative3, fromSuperlative: fromSuperlative3 } = adj.methods.two.transform.adjective;
    const str = adj.text("normal");
    if (adj.has("#Comparative")) {
      return fromComparative3(str, adj.model);
    }
    if (adj.has("#Superlative")) {
      return fromSuperlative3(str, adj.model);
    }
    return str;
  };
  var api5 = function(View2) {
    class Adjectives extends View2 {
      constructor(document, pointer, groups2) {
        super(document, pointer, groups2);
        this.viewType = "Adjectives";
      }
      json(opts2 = {}) {
        const { toAdverb: toAdverb2, toNoun: toNoun2, toSuperlative: toSuperlative3, toComparative: toComparative3 } = this.methods.two.transform.adjective;
        opts2.normal = true;
        return this.map((m3) => {
          const json = m3.toView().json(opts2)[0] || {};
          const str = toRoot2(m3);
          json.adjective = {
            adverb: toAdverb2(str, this.model),
            noun: toNoun2(str, this.model),
            superlative: toSuperlative3(str, this.model),
            comparative: toComparative3(str, this.model)
          };
          return json;
        }, []);
      }
      adverbs() {
        return this.before("#Adverb+$").concat(this.after("^#Adverb+"));
      }
      conjugate(n2) {
        const { toComparative: toComparative3, toSuperlative: toSuperlative3, toNoun: toNoun2, toAdverb: toAdverb2 } = this.methods.two.transform.adjective;
        return this.getNth(n2).map((adj) => {
          const root = toRoot2(adj);
          return {
            Adjective: root,
            Comparative: toComparative3(root, this.model),
            Superlative: toSuperlative3(root, this.model),
            Noun: toNoun2(root, this.model),
            Adverb: toAdverb2(root, this.model)
          };
        }, []);
      }
      toRoot(n2) {
        return this.getNth(n2).map((adj) => {
          return adj.replaceWith(toRoot2(adj));
        });
      }
    }
    transforms.forEach((name) => {
      Object.defineProperty(Adjectives.prototype, name, {
        configurable: true,
        writable: true,
        value: function(n2) {
          const transform = this.methods.two.transform.adjective[name];
          return this.getNth(n2).map((adj) => {
            return adj.replaceWith(transform(toRoot2(adj), this.model));
          });
        }
      });
    });
    View2.prototype.adjectives = select_default(Adjectives, "#Adjective");
    View2.prototype.superlatives = select_default(Adjectives, "#Superlative");
    View2.prototype.comparatives = select_default(Adjectives, "#Comparative");
  };
  var plugin_default20 = { api: api5 };

  // node_modules/compromise/src/3-three/adverbs/plugin.js
  var toRoot3 = function(adj) {
    const str = adj.compute("root").text("root");
    return str;
  };
  var api6 = function(View2) {
    class Adverbs extends View2 {
      constructor(document, pointer, groups2) {
        super(document, pointer, groups2);
        this.viewType = "Adverbs";
      }
      conjugate(n2) {
        return this.getNth(n2).map((adv) => {
          const adj = toRoot3(adv);
          return {
            Adverb: adv.text("normal"),
            Adjective: adj
          };
        }, []);
      }
      json(opts2 = {}) {
        const fromAdverb = this.methods.two.transform.adjective.fromAdverb;
        opts2.normal = true;
        return this.map((m3) => {
          const json = m3.toView().json(opts2)[0] || {};
          json.adverb = {
            adjective: fromAdverb(json.normal)
          };
          return json;
        }, []);
      }
    }
    View2.prototype.adverbs = select_default(Adverbs, "#Adverb");
  };
  var plugin_default21 = { api: api6 };

  // node_modules/compromise/src/3-three/chunker/api/clauses.js
  var byComma = function(doc) {
    let commas = doc.match("@hasComma");
    commas = commas.filter((m3) => {
      if (m3.growLeft(".").wordCount() === 1) {
        return false;
      }
      if (m3.growRight(". .").wordCount() === 1) {
        return false;
      }
      let more = m3.grow(".");
      more = more.ifNo("@hasComma @hasComma");
      more = more.ifNo("@hasComma (and|or) .");
      more = more.ifNo("(#City && @hasComma) #Country");
      more = more.ifNo("(#WeekDay && @hasComma) #Date");
      more = more.ifNo("(#Date+ && @hasComma) #Value");
      more = more.ifNo("(#Adjective && @hasComma) #Adjective");
      return more.found;
    });
    return doc.splitAfter(commas);
  };
  var splitParentheses = function(doc) {
    let matches3 = doc.parentheses();
    matches3 = matches3.filter((m3) => {
      return m3.wordCount() >= 3 && m3.has("#Verb") && m3.has("#Noun");
    });
    return doc.splitOn(matches3);
  };
  var splitQuotes = function(doc) {
    let matches3 = doc.quotations();
    matches3 = matches3.filter((m3) => {
      return m3.wordCount() >= 3 && m3.has("#Verb") && m3.has("#Noun");
    });
    return doc.splitOn(matches3);
  };
  var clauses = function(n2) {
    let found = this;
    found = splitParentheses(found);
    found = splitQuotes(found);
    found = byComma(found);
    found = found.splitAfter("(@hasEllipses|@hasSemicolon|@hasDash|@hasColon)");
    found = found.splitAfter("^#Pronoun (said|says)");
    found = found.splitBefore("(said|says) #ProperNoun$");
    found = found.splitBefore(". . if .{4}");
    found = found.splitBefore("and while");
    found = found.splitBefore("now that");
    found = found.splitBefore("ever since");
    found = found.splitBefore("(supposing|although)");
    found = found.splitBefore("even (while|if|though)");
    found = found.splitBefore("(whereas|whose)");
    found = found.splitBefore("as (though|if)");
    found = found.splitBefore("(til|until)");
    const m3 = found.match("#Verb .* [but] .* #Verb", 0);
    if (m3.found) {
      found = found.splitBefore(m3);
    }
    const condition = found.if("if .{2,9} then .").match("then");
    found = found.splitBefore(condition);
    if (typeof n2 === "number") {
      found = found.get(n2);
    }
    return found;
  };
  var clauses_default = clauses;

  // node_modules/compromise/src/3-three/chunker/api/chunks.js
  var chunks = function(doc) {
    const all4 = [];
    let lastOne = null;
    const m3 = doc.clauses();
    m3.docs.forEach((terms) => {
      terms.forEach((term) => {
        if (!term.chunk || term.chunk !== lastOne) {
          lastOne = term.chunk;
          all4.push([term.index[0], term.index[1], term.index[1] + 1]);
        } else {
          all4[all4.length - 1][2] = term.index[1] + 1;
        }
      });
      lastOne = null;
    });
    const parts2 = doc.update(all4);
    return parts2;
  };
  var chunks_default2 = chunks;

  // node_modules/compromise/src/3-three/chunker/api/api.js
  var api7 = function(View2) {
    class Chunks extends View2 {
      constructor(document, pointer, groups2) {
        super(document, pointer, groups2);
        this.viewType = "Chunks";
      }
      isVerb() {
        return this.filter((c) => c.has("<Verb>"));
      }
      isNoun() {
        return this.filter((c) => c.has("<Noun>"));
      }
      isAdjective() {
        return this.filter((c) => c.has("<Adjective>"));
      }
      isPivot() {
        return this.filter((c) => c.has("<Pivot>"));
      }
      // chunk-friendly debug
      debug() {
        this.toView().debug("chunks");
        return this;
      }
      // overloaded - keep Sentences class
      update(pointer) {
        const m3 = new Chunks(this.document, pointer);
        m3._cache = this._cache;
        return m3;
      }
    }
    View2.prototype.chunks = select_default(Chunks, chunks_default2, true);
    View2.prototype.clauses = clauses_default;
  };
  var api_default12 = api7;

  // node_modules/compromise/src/3-three/chunker/compute/01-easy.js
  var byWord2 = {
    this: "Noun",
    then: "Pivot"
  };
  var easyMode = function(document) {
    for (let n2 = 0; n2 < document.length; n2 += 1) {
      for (let t2 = 0; t2 < document[n2].length; t2 += 1) {
        const term = document[n2][t2];
        if (Object.hasOwn(byWord2, term.normal) === true) {
          term.chunk = byWord2[term.normal];
          continue;
        }
        if (term.tags.has("Verb")) {
          term.chunk = "Verb";
          continue;
        }
        if (term.tags.has("Noun") || term.tags.has("Determiner")) {
          term.chunk = "Noun";
          continue;
        }
        if (term.tags.has("Value")) {
          term.chunk = "Noun";
          continue;
        }
        if (term.tags.has("QuestionWord")) {
          term.chunk = "Pivot";
          continue;
        }
      }
    }
  };
  var easy_default = easyMode;

  // node_modules/compromise/src/3-three/chunker/compute/02-neighbours.js
  var byNeighbour = function(document) {
    for (let n2 = 0; n2 < document.length; n2 += 1) {
      for (let t2 = 0; t2 < document[n2].length; t2 += 1) {
        const term = document[n2][t2];
        if (term.chunk) {
          continue;
        }
        const onRight = document[n2][t2 + 1];
        const onLeft = document[n2][t2 - 1];
        if (term.tags.has(Adj)) {
          if (onLeft && onLeft.tags.has(Cop)) {
            term.chunk = Adj;
            continue;
          }
          if (onLeft && onLeft.tags.has(Det)) {
            term.chunk = NN;
            continue;
          }
          if (onRight && onRight.tags.has(NN)) {
            term.chunk = NN;
            continue;
          }
          continue;
        }
        if (term.tags.has(Adv) || term.tags.has("Negative")) {
          if (onLeft && onLeft.tags.has(Adj)) {
            term.chunk = Adj;
            continue;
          }
          if (onLeft && onLeft.tags.has(Vb)) {
            term.chunk = Vb;
            continue;
          }
          if (onRight && onRight.tags.has(Adj)) {
            term.chunk = Adj;
            continue;
          }
          if (onRight && onRight.tags.has(Vb)) {
            term.chunk = Vb;
            continue;
          }
        }
      }
    }
  };
  var neighbours_default3 = byNeighbour;

  // node_modules/compromise/src/3-three/chunker/compute/03-matcher.js
  var rules7 = [
    // === Conjunction ===
    // that the houses
    { match: "[that] #Det #NN", group: 0, chunk: "Pivot" },
    // estimated that
    { match: "#Past [that]", group: 0, chunk: "Pivot" },
    // so the
    { match: "[so] #Det", group: 0, chunk: "Pivot" },
    // === Adjective ===
    // was really nice
    { match: "#Cop #Adv+? [#Adj]", group: 0, chunk: "Adjective" },
    // was nice
    // { match: '#Copula [#Adjective]', group: 0, chunk: 'Adjective' },
    // nice and cool
    { match: "#Adj and #Adj #NN?", notIf: "#NN", chunk: "Adjective" },
    // really nice
    // { match: '#Adverb+ #Adjective', chunk: 'Adjective' },
    // === Verb ===
    // quickly and suddenly run
    { match: "#Adv+ and #Adv #V", chunk: "Verb" },
    // sitting near
    { match: "#Ger #Adj$", chunk: "Verb" },
    // going to walk
    { match: "#Ger to #V", chunk: "Verb" },
    // come and have a drink
    { match: "#Pres and #Pres", chunk: "Verb" },
    // really not
    { match: "#Adv #Neg", chunk: "Verb" },
    // want to see
    { match: "(want|wants|wanted) to #Inf", chunk: "Verb" },
    // walk ourselves
    { match: "#V #Refl", chunk: "Verb" },
    // tell him the story
    // { match: '#PresentTense [#Pronoun] #Determiner', group: 0, chunk: 'Verb' },
    // tries to walk
    { match: "#V [to] #Adv? #Inf", group: 0, chunk: "Verb" },
    // upon seeing
    { match: "[#Prep] #Ger", group: 0, chunk: "Verb" },
    // ensure that
    { match: "#Inf [that] <Noun>", group: 0, chunk: "Verb" },
    // === Noun ===
    // the brown fox
    // { match: '#Determiner #Adjective+ #Noun', chunk: 'Noun' },
    // the fox
    // { match: '(the|this) <Noun>', chunk: 'Noun' },
    // brown fox
    // { match: '#Adjective+ <Noun>', chunk: 'Noun' },
    // --- of ---
    // son of a gun
    { match: "#NN of #Det? #NN", chunk: "Noun" },
    // 3 beautiful women
    { match: "#Value+ #Adv? #Adj", chunk: "Noun" },
    // the last russian tsar
    { match: "the [#Adj] #NN", chunk: "Noun" },
    // the happy and playful dog
    { match: "#Det? #Adj+ (and|or) #Adj+ #NN", chunk: "Noun" },
    // breakfast in bed
    { match: "#Sing in #Det? #Sing", chunk: "Noun" },
    // Some citizens in this Canadian capital
    { match: "#Plur [in] #Det? #NN", group: 0, chunk: "Pivot" },
    // indoor and outdoor seating
    { match: "#NN and #Det? #NN", notIf: "(#Poss|#Pron)", chunk: "Noun" }
    //  boys and girls
    // { match: '#Plural and #Determiner? #Plural', chunk: 'Noun' },
    // tomatoes and cheese
    // { match: '#Noun and #Determiner? #Noun', notIf: '#Pronoun', chunk: 'Noun' },
    // that is why
    // { match: '[that] (is|was)', group: 0, chunk: 'Noun' },
  ];
  rules7.forEach((rule) => {
    rule.match = lib_default10(rule.match);
    if (rule.notIf) {
      rule.notIf = lib_default10(rule.notIf);
    }
  });
  var net2 = null;
  var matcher = function(view, _, world2) {
    const { methods: methods19 } = world2;
    net2 ||= methods19.one.buildNet(rules7, world2);
    view.sweep(net2);
  };
  var matcher_default = matcher;

  // node_modules/compromise/src/3-three/chunker/compute/04-fallback.js
  var fallback = function(document) {
    for (let n2 = 0; n2 < document.length; n2 += 1) {
      for (let t2 = 0; t2 < document[n2].length; t2 += 1) {
        const term = document[n2][t2];
        if (term.chunk === void 0) {
          if (term.tags.has("Conjunction")) {
            term.chunk = "Pivot";
          } else if (term.tags.has("Preposition")) {
            term.chunk = "Pivot";
          } else if (term.tags.has("Adverb")) {
            term.chunk = "Verb";
          } else {
            term.chunk = "Noun";
          }
        }
      }
    }
  };
  var fallback_default2 = fallback;

  // node_modules/compromise/src/3-three/chunker/compute/05-fixUp.js
  var fixUp = function(docs) {
    const byChunk = [];
    let current = null;
    docs.forEach((terms) => {
      for (let i3 = 0; i3 < terms.length; i3 += 1) {
        const term = terms[i3];
        if (current && term.chunk === current) {
          byChunk[byChunk.length - 1].terms.push(term);
        } else {
          byChunk.push({ chunk: term.chunk, terms: [term] });
          current = term.chunk;
        }
      }
    });
    byChunk.forEach((c) => {
      if (c.chunk === "Verb") {
        const hasVerb = c.terms.find((t2) => t2.tags.has("Verb"));
        if (!hasVerb) {
          c.terms.forEach((t2) => t2.chunk = null);
        }
      }
    });
  };
  var fixUp_default = fixUp;

  // node_modules/compromise/src/3-three/chunker/compute/index.js
  var findChunks = function(view) {
    const { docs, world: world2 } = view;
    easy_default(docs);
    neighbours_default3(docs);
    matcher_default(view, docs, world2);
    fallback_default2(docs, world2);
    fixUp_default(docs, world2);
  };
  var compute_default12 = { chunks: findChunks };

  // node_modules/compromise/src/3-three/chunker/plugin.js
  var plugin_default22 = {
    compute: compute_default12,
    api: api_default12,
    hooks: ["chunks"]
  };

  // node_modules/compromise/src/3-three/misc/acronyms/index.js
  var hasPeriod2 = /\./g;
  var api8 = function(View2) {
    class Acronyms extends View2 {
      constructor(document, pointer, groups2) {
        super(document, pointer, groups2);
        this.viewType = "Acronyms";
      }
      strip() {
        this.docs.forEach((terms) => {
          terms.forEach((term) => {
            term.text = term.text.replace(hasPeriod2, "");
            term.normal = term.normal.replace(hasPeriod2, "");
          });
        });
        return this;
      }
      addPeriods() {
        this.docs.forEach((terms) => {
          terms.forEach((term) => {
            term.text = term.text.replace(hasPeriod2, "");
            term.normal = term.normal.replace(hasPeriod2, "");
            const ending = term.post.startsWith(".") ? "" : ".";
            term.text = term.text.split("").join(".") + ending;
            term.normal = term.normal.split("").join(".") + ending;
          });
        });
        return this;
      }
    }
    View2.prototype.acronyms = select_default(Acronyms, "#Acronym");
  };
  var acronyms_default2 = api8;

  // node_modules/compromise/src/3-three/misc/parentheses/fns.js
  var hasOpen2 = /\(/;
  var hasClosed2 = /\)/;
  var findEnd2 = function(terms, i3) {
    for (; i3 < terms.length; i3 += 1) {
      if (terms[i3].post && hasClosed2.test(terms[i3].post)) {
        let [, index3] = terms[i3].index;
        index3 ||= 0;
        return index3;
      }
    }
    return null;
  };
  var find2 = function(doc) {
    const ptrs = [];
    doc.docs.forEach((terms) => {
      const isOpen = false;
      for (let i3 = 0; i3 < terms.length; i3 += 1) {
        const term = terms[i3];
        if (!isOpen && term.pre && hasOpen2.test(term.pre)) {
          const end2 = findEnd2(terms, i3);
          if (end2 !== null) {
            const [n2, start2] = terms[i3].index;
            ptrs.push([n2, start2, end2 + 1, terms[i3].id]);
            i3 = end2;
          }
        }
      }
    });
    return doc.update(ptrs);
  };
  var strip = function(m3) {
    m3.docs.forEach((terms) => {
      terms[0].pre = terms[0].pre.replace(hasOpen2, "");
      const last = terms[terms.length - 1];
      last.post = last.post.replace(hasClosed2, "");
    });
    return m3;
  };

  // node_modules/compromise/src/3-three/misc/parentheses/index.js
  var api9 = function(View2) {
    class Parentheses extends View2 {
      constructor(document, pointer, groups2) {
        super(document, pointer, groups2);
        this.viewType = "Possessives";
      }
      strip() {
        return strip(this);
      }
    }
    View2.prototype.parentheses = select_default(Parentheses, find2);
  };
  var parentheses_default = api9;

  // node_modules/compromise/src/3-three/misc/possessives/index.js
  var apostropheS2 = /'s$/;
  var find3 = function(doc) {
    let m3 = doc.match("#Possessive+");
    if (m3.has("#Person")) {
      m3 = m3.growLeft("#Person+");
    }
    if (m3.has("#Place")) {
      m3 = m3.growLeft("#Place+");
    }
    if (m3.has("#Organization")) {
      m3 = m3.growLeft("#Organization+");
    }
    return m3;
  };
  var api10 = function(View2) {
    class Possessives extends View2 {
      constructor(document, pointer, groups2) {
        super(document, pointer, groups2);
        this.viewType = "Possessives";
      }
      strip() {
        this.docs.forEach((terms) => {
          terms.forEach((term) => {
            term.text = term.text.replace(apostropheS2, "");
            term.normal = term.normal.replace(apostropheS2, "");
          });
        });
        return this;
      }
    }
    View2.prototype.possessives = select_default(Possessives, find3);
  };
  var possessives_default = api10;

  // node_modules/compromise/src/3-three/misc/quotations/fns.js
  var pairs2 = {
    '"': '"',
    // 'StraightDoubleQuotes'
    "\uFF02": "\uFF02",
    // 'StraightDoubleQuotesWide'
    "'": "'",
    // 'StraightSingleQuotes'
    "\u201C": "\u201D",
    // 'CommaDoubleQuotes'
    "\u2018": "\u2019",
    // 'CommaSingleQuotes'
    "\u201F": "\u201D",
    // 'CurlyDoubleQuotesReversed'
    "\u201B": "\u2019",
    // 'CurlySingleQuotesReversed'
    "\u201E": "\u201D",
    // 'LowCurlyDoubleQuotes'
    "\u2E42": "\u201D",
    // 'LowCurlyDoubleQuotesReversed'
    "\u201A": "\u2019",
    // 'LowCurlySingleQuotes'
    "\xAB": "\xBB",
    // 'AngleDoubleQuotes' «, »
    "\u2039": "\u203A",
    // 'AngleSingleQuotes'
    // Prime 'non quotation'
    "\u2035": "\u2032",
    // 'PrimeSingleQuotes'
    "\u2036": "\u2033",
    // 'PrimeDoubleQuotes'
    "\u2037": "\u2034",
    // 'PrimeTripleQuotes'
    // Prime 'quotation' variation
    "\u301D": "\u301E",
    // 'PrimeDoubleQuotes'
    "`": "\xB4",
    // 'PrimeSingleQuotes'
    "\u301F": "\u301E"
    // 'LowPrimeDoubleQuotesReversed'
  };
  var hasOpen3 = RegExp("[" + Object.keys(pairs2).join("") + "]");
  var hasClosed3 = RegExp("[" + Object.values(pairs2).join("") + "]");
  var findEnd3 = function(terms, i3) {
    const have = terms[i3].pre.match(hasOpen3)[0] || "";
    if (!have || !pairs2[have]) {
      return null;
    }
    const want = pairs2[have];
    for (; i3 < terms.length; i3 += 1) {
      if (terms[i3].post && terms[i3].post.match(want)) {
        return i3;
      }
    }
    return null;
  };
  var find4 = function(doc) {
    const ptrs = [];
    doc.docs.forEach((terms) => {
      const isOpen = false;
      for (let i3 = 0; i3 < terms.length; i3 += 1) {
        const term = terms[i3];
        if (!isOpen && term.pre && hasOpen3.test(term.pre)) {
          const end2 = findEnd3(terms, i3);
          if (end2 !== null) {
            const [n2, start2] = terms[i3].index;
            ptrs.push([n2, start2, end2 + 1, terms[i3].id]);
            i3 = end2;
          }
        }
      }
    });
    return doc.update(ptrs);
  };
  var strip2 = function(m3) {
    m3.docs.forEach((terms) => {
      terms[0].pre = terms[0].pre.replace(hasOpen3, "");
      const lastTerm = terms[terms.length - 1];
      lastTerm.post = lastTerm.post.replace(hasClosed3, "");
    });
  };

  // node_modules/compromise/src/3-three/misc/quotations/index.js
  var api11 = function(View2) {
    class Quotations extends View2 {
      constructor(document, pointer, groups2) {
        super(document, pointer, groups2);
        this.viewType = "Possessives";
      }
      strip() {
        return strip2(this);
      }
    }
    View2.prototype.quotations = select_default(Quotations, find4);
  };
  var quotations_default = api11;

  // node_modules/compromise/src/3-three/misc/selections/index.js
  var phoneNumbers = function(n2) {
    let m3 = this.splitAfter("@hasComma");
    m3 = m3.match("#PhoneNumber+");
    m3 = m3.getNth(n2);
    return m3;
  };
  var addresses = function(n2) {
    let m3 = this.match("#Address+");
    m3 = m3.getNth(n2);
    return m3;
  };
  var selections = [
    ["hyphenated", "@hasHyphen ."],
    ["hashTags", "#HashTag"],
    ["emails", "#Email"],
    ["emoji", "#Emoji"],
    ["emoticons", "#Emoticon"],
    ["atMentions", "#AtMention"],
    ["urls", "#Url"],
    // ['pronouns', '#Pronoun'],
    ["conjunctions", "#Conjunction"],
    ["prepositions", "#Preposition"],
    ["abbreviations", "#Abbreviation"],
    ["honorifics", "#Honorific"]
  ];
  var aliases3 = [
    ["emojis", "emoji"],
    ["atmentions", "atMentions"]
  ];
  var addMethods = function(View2) {
    selections.forEach((a) => {
      View2.prototype[a[0]] = function(n2) {
        const m3 = this.match(a[1]);
        return typeof n2 === "number" ? m3.get(n2) : m3;
      };
    });
    View2.prototype.phoneNumbers = phoneNumbers;
    View2.prototype.addresses = addresses;
    aliases3.forEach((a) => {
      View2.prototype[a[0]] = View2.prototype[a[1]];
    });
  };
  var selections_default = addMethods;

  // node_modules/compromise/src/3-three/misc/slashes/index.js
  var hasSlash2 = /\//;
  var api12 = function(View2) {
    class Slashes extends View2 {
      constructor(document, pointer, groups2) {
        super(document, pointer, groups2);
        this.viewType = "Slashes";
      }
      split() {
        return this.map((m3) => {
          const str = m3.text();
          const arr = str.split(hasSlash2);
          m3 = m3.replaceWith(arr.join(" "));
          return m3.growRight("(" + arr.join("|") + ")+");
        });
      }
    }
    View2.prototype.slashes = select_default(Slashes, "#SlashedTerm");
  };
  var slashes_default2 = api12;

  // node_modules/compromise/src/3-three/misc/plugin.js
  var plugin_default23 = {
    api: function(View2) {
      acronyms_default2(View2);
      parentheses_default(View2);
      possessives_default(View2);
      quotations_default(View2);
      selections_default(View2);
      slashes_default2(View2);
    }
  };

  // node_modules/compromise/src/3-three/normalize/methods.js
  var termLoop2 = function(view, cb) {
    view.docs.forEach((terms) => {
      terms.forEach(cb);
    });
  };
  var methods_default11 = {
    // remove titlecasing, uppercase
    "case": (doc) => {
      termLoop2(doc, (term) => {
        term.text = term.text.toLowerCase();
      });
    },
    // visually romanize/anglicize 'Björk' into 'Bjork'.
    "unicode": (doc) => {
      const world2 = doc.world;
      const killUnicode2 = world2.methods.one.killUnicode;
      termLoop2(doc, (term) => term.text = killUnicode2(term.text, world2));
    },
    // remove hyphens, newlines, and force one space between words
    "whitespace": (doc) => {
      termLoop2(doc, (term) => {
        term.post = term.post.replace(/\s+/g, " ");
        term.post = term.post.replace(/\s([.,?!:;])/g, "$1");
        term.pre = term.pre.replace(/\s+/g, "");
      });
    },
    // remove commas, semicolons - but keep sentence-ending punctuation
    "punctuation": (doc) => {
      termLoop2(doc, (term) => {
        term.pre = term.pre.replace(/[,،]/g, "");
        term.post = term.post.replace(/[–—-]/g, " ");
        term.post = term.post.replace(/[,،:;]/g, "");
        term.post = term.post.replace(/…|\.{2,}/g, "");
        term.post = term.post.replace(/\?{2,}/g, "?");
        term.post = term.post.replace(/!{2,}/g, "!");
        term.post = term.post.replace(/\?!+/g, "?");
      });
      const docs = doc.docs;
      const terms = docs[docs.length - 1];
      if (terms && terms.length > 0) {
        const lastTerm = terms[terms.length - 1];
        lastTerm.post = lastTerm.post.replace(/ /g, "");
      }
    },
    // ====== subsets ===
    // turn "isn't" to "is not"
    "contractions": (doc) => {
      doc.contractions().expand();
    },
    //remove periods from acronyms, like 'F.B.I.'
    "acronyms": (doc) => {
      doc.acronyms().strip();
    },
    //remove words inside brackets (like these)
    "parentheses": (doc) => {
      doc.parentheses().strip();
    },
    // turn "Google's tax return" to "Google tax return"
    "possessives": (doc) => {
      doc.possessives().strip();
    },
    // turn "tax return" to tax return
    "quotations": (doc) => {
      doc.quotations().strip();
    },
    // remove them
    "emoji": (doc) => {
      doc.emojis().remove();
    },
    //turn 'Vice Admiral John Smith' to 'John Smith'
    "honorifics": (doc) => {
      doc.match("#Honorific+ #Person").honorifics().remove();
    },
    // remove needless adverbs
    "adverbs": (doc) => {
      doc.adverbs().remove();
    },
    // turn "batmobiles" into "batmobile"
    "nouns": (doc) => {
      doc.nouns().toSingular();
    },
    // turn all verbs into Infinitive form - "I walked" → "I walk"
    "verbs": (doc) => {
      doc.verbs().toInfinitive();
    },
    // turn "fifty" into "50"
    "numbers": (doc) => {
      doc.numbers().toNumber();
    },
    /** remove bullets from beginning of phrase */
    "debullet": (doc) => {
      const hasBullet = /^\s*([-–—*•])\s*$/;
      doc.docs.forEach((terms) => {
        if (hasBullet.test(terms[0].pre)) {
          terms[0].pre = terms[0].pre.replace(hasBullet, "");
        }
      });
      return doc;
    }
  };

  // node_modules/compromise/src/3-three/normalize/api.js
  var split = (str) => {
    return str.split("|").reduce((h, k2) => {
      h[k2] = true;
      return h;
    }, {});
  };
  var light = "unicode|punctuation|whitespace|acronyms";
  var medium = "|case|contractions|parentheses|quotations|emoji|honorifics|debullet";
  var heavy = "|possessives|adverbs|nouns|verbs";
  var presets = {
    light: split(light),
    medium: split(light + medium),
    heavy: split(light + medium + heavy)
  };
  function api_default13(View2) {
    View2.prototype.normalize = function(opts2 = "light") {
      if (typeof opts2 === "string") {
        opts2 = presets[opts2];
      }
      Object.keys(opts2).forEach((fn) => {
        if (Object.hasOwn(methods_default11, fn)) {
          methods_default11[fn](this, opts2[fn]);
        }
      });
      return this;
    };
  }

  // node_modules/compromise/src/3-three/normalize/plugin.js
  var plugin_default24 = {
    api: api_default13
  };

  // node_modules/compromise/src/3-three/nouns/_lib.js
  var split2 = (doc, method, pattern, group) => {
    const matches3 = doc.match(pattern, group);
    if (!matches3.found) {
      return doc;
    }
    return doc[method](matches3);
  };
  var lib_default13 = split2;

  // node_modules/compromise/src/3-three/nouns/find.js
  var findNouns = function(doc) {
    let m3 = doc.clauses().match("<Noun>");
    let commas = m3.match("@hasComma");
    commas = commas.not("#Place");
    if (commas.found) {
      m3 = m3.splitAfter(commas);
    }
    m3 = lib_default13(m3, "splitOn", "#Expression");
    m3 = lib_default13(m3, "splitOn", "(he|she|we|you|they|i)");
    m3 = lib_default13(m3, "splitOn", "(#Noun|#Adjective) [(he|him|she|it)]", 0);
    m3 = lib_default13(m3, "splitOn", "[(he|him|she|it)] (#Determiner|#Value)", 0);
    m3 = lib_default13(m3, "splitBefore", "#Noun [(the|a|an)] #Adjective? #Noun", 0);
    m3 = lib_default13(m3, "splitOn", "[(here|there)] #Noun", 0);
    m3 = lib_default13(m3, "splitOn", "[#Noun] (here|there)", 0);
    m3 = lib_default13(m3, "splitBefore", "(our|my|their|your)");
    m3 = lib_default13(m3, "splitOn", "#Noun [#Determiner]", 0);
    m3 = m3.if("#Noun");
    return m3;
  };
  var find_default = findNouns;

  // node_modules/compromise/src/3-three/nouns/api/isSubordinate.js
  var list2 = [
    "after",
    "although",
    "as if",
    "as long as",
    "as",
    "because",
    "before",
    "even if",
    "even though",
    "ever since",
    "if",
    "in order that",
    "provided that",
    "since",
    "so that",
    "than",
    "that",
    "though",
    "unless",
    "until",
    "what",
    "whatever",
    "when",
    "whenever",
    "where",
    "whereas",
    "wherever",
    "whether",
    "which",
    "whichever",
    "who",
    "whoever",
    "whom",
    "whomever",
    "whose"
  ];
  var isSubordinate = function(m3) {
    if (m3.before("#Preposition$").found) {
      return true;
    }
    const leadIn = m3.before();
    if (!leadIn.found) {
      return false;
    }
    for (let i3 = 0; i3 < list2.length; i3 += 1) {
      if (m3.has(list2[i3])) {
        return true;
      }
    }
    return false;
  };
  var isSubordinate_default = isSubordinate;

  // node_modules/compromise/src/3-three/nouns/api/isPlural.js
  var notPlural2 = "(#Pronoun|#Place|#Value|#Person|#Uncountable|#Month|#WeekDay|#Holiday|#Possessive)";
  var isPlural2 = function(m3, root) {
    if (m3.has("#Plural")) {
      return true;
    }
    if (m3.has("#Noun and #Noun")) {
      return true;
    }
    if (m3.has("(we|they)")) {
      return true;
    }
    if (root.has(notPlural2) === true) {
      return false;
    }
    if (m3.has("#Singular")) {
      return false;
    }
    const str = root.text("normal");
    return str.length > 3 && str.endsWith("s") && !str.endsWith("ss");
  };
  var isPlural_default = isPlural2;

  // node_modules/compromise/src/3-three/nouns/api/parse.js
  var getRoot2 = function(m3) {
    let tmp = m3.clone();
    tmp = tmp.match("#Noun+");
    tmp = tmp.remove("(#Adjective|#Preposition|#Determiner|#Value)");
    tmp = tmp.not("#Possessive");
    tmp = tmp.first();
    if (!tmp.found) {
      return m3;
    }
    return tmp;
  };
  var parseNoun = function(m3) {
    const root = getRoot2(m3);
    return {
      determiner: m3.match("#Determiner").eq(0),
      adjectives: m3.match("#Adjective"),
      number: m3.values(),
      isPlural: isPlural_default(m3, root),
      isSubordinate: isSubordinate_default(m3),
      root
    };
  };
  var parse_default3 = parseNoun;

  // node_modules/compromise/src/3-three/nouns/api/toJSON.js
  var toText3 = (m3) => m3.text();
  var toArray3 = (m3) => m3.json({ terms: false, normal: true }).map((s2) => s2.normal);
  var getNum = function(m3) {
    const num = null;
    if (!m3.found) {
      return num;
    }
    const val = m3.values(0);
    if (val.found) {
      const obj = val.parse()[0] || {};
      return obj.num;
    }
    return num;
  };
  var toJSON2 = function(m3) {
    const res = parse_default3(m3);
    return {
      root: toText3(res.root),
      number: getNum(res.number),
      determiner: toText3(res.determiner),
      adjectives: toArray3(res.adjectives),
      isPlural: res.isPlural,
      isSubordinate: res.isSubordinate
    };
  };
  var toJSON_default = toJSON2;

  // node_modules/compromise/src/3-three/nouns/api/hasPlural.js
  var hasPlural = function(root) {
    if (root.has("^(#Uncountable|#ProperNoun|#Place|#Pronoun|#Acronym)+$")) {
      return false;
    }
    return true;
  };
  var hasPlural_default = hasPlural;

  // node_modules/compromise/src/3-three/nouns/api/toPlural.js
  var keep = { tags: true };
  var nounToPlural = function(m3, parsed) {
    if (parsed.isPlural === true) {
      return m3;
    }
    if (parsed.root.has("#Possessive")) {
      parsed.root = parsed.root.possessives().strip();
    }
    if (!hasPlural_default(parsed.root)) {
      return m3;
    }
    const { methods: methods19, model: model5 } = m3.world;
    const { toPlural } = methods19.two.transform.noun;
    const str = parsed.root.text({ keepPunct: false });
    const plural2 = toPlural(str, model5);
    m3.match(parsed.root).replaceWith(plural2, keep).tag("Plural", "toPlural");
    if (parsed.determiner.has("(a|an)")) {
      m3.remove(parsed.determiner);
    }
    const copula = parsed.root.after("not? #Adverb+? [#Copula]", 0);
    if (copula.found) {
      if (copula.has("is")) {
        m3.replace(copula, "are");
      } else if (copula.has("was")) {
        m3.replace(copula, "were");
      }
    }
    return m3;
  };
  var toPlural_default2 = nounToPlural;

  // node_modules/compromise/src/3-three/nouns/api/toSingular.js
  var keep2 = { tags: true };
  var matchCase = function(original, str) {
    if (original.length > 1 && original === original.toUpperCase() && original !== original.toLowerCase()) {
      return str.toUpperCase();
    }
    if (new RegExp("^\\p{Lu}", "u").test(original)) {
      return str.charAt(0).toUpperCase() + str.slice(1);
    }
    return str;
  };
  var nounToSingular = function(m3, parsed) {
    if (parsed.isPlural === false) {
      return m3;
    }
    const { methods: methods19, model: model5 } = m3.world;
    const { toSingular: toSingular2 } = methods19.two.transform.noun;
    const str = parsed.root.text("normal");
    const single = toSingular2(str, model5);
    const before3 = (parsed.root.docs[0] || []).map((term) => term.text);
    const after2 = m3.replace(parsed.root, single, keep2).tag("Singular", "toPlural");
    const terms = after2.docs[0] || [];
    if (terms.length === before3.length) {
      terms.forEach((term, i3) => {
        term.text = matchCase(before3[i3], term.text);
      });
    }
    return m3;
  };
  var toSingular_default2 = nounToSingular;

  // node_modules/compromise/src/3-three/nouns/api/api.js
  var api13 = function(View2) {
    class Nouns extends View2 {
      constructor(document, pointer, groups2) {
        super(document, pointer, groups2);
        this.viewType = "Nouns";
      }
      parse(n2) {
        return this.getNth(n2).map(parse_default3);
      }
      json(n2) {
        const opts2 = typeof n2 === "object" ? n2 : {};
        return this.getNth(n2).map((m3) => {
          const json = m3.toView().json(opts2)[0] || {};
          if (opts2 && opts2.noun !== false) {
            json.noun = toJSON_default(m3);
          }
          return json;
        }, []);
      }
      conjugate(n2) {
        const methods19 = this.world.methods.two.transform.noun;
        return this.getNth(n2).map((m3) => {
          const parsed = parse_default3(m3);
          const root = parsed.root.compute("root").text("root");
          const res = {
            Singular: root
          };
          if (hasPlural_default(parsed.root)) {
            res.Plural = methods19.toPlural(root, this.model);
          }
          if (res.Singular === res.Plural) {
            delete res.Plural;
          }
          return res;
        }, []);
      }
      isPlural(n2) {
        const res = this.filter((m3) => parse_default3(m3).isPlural);
        return res.getNth(n2);
      }
      isSingular(n2) {
        const res = this.filter((m3) => !parse_default3(m3).isPlural);
        return res.getNth(n2);
      }
      adjectives(n2) {
        let res = this.update([]);
        this.forEach((m3) => {
          const adj = parse_default3(m3).adjectives;
          if (adj.found) {
            res = res.concat(adj);
          }
        });
        return res.getNth(n2);
      }
      toPlural(n2) {
        return this.getNth(n2).map((m3) => {
          return toPlural_default2(m3, parse_default3(m3));
        });
      }
      toSingular(n2) {
        return this.getNth(n2).map((m3) => {
          const res = parse_default3(m3);
          return toSingular_default2(m3, res);
        });
      }
      // create a new View, from this one
      update(pointer) {
        const m3 = new Nouns(this.document, pointer);
        m3._cache = this._cache;
        return m3;
      }
    }
    View2.prototype.nouns = select_default(Nouns, find_default, true);
  };
  var api_default14 = api13;

  // node_modules/compromise/src/3-three/nouns/plugin.js
  var plugin_default25 = {
    api: api_default14
  };

  // node_modules/compromise/src/3-three/numbers/fractions/find.js
  var findFractions = function(doc, n2) {
    let m3 = doc.match("#Fraction+");
    m3 = m3.splitOn("/\\//");
    m3 = m3.filter((r) => {
      return !r.lookBehind("#Value and$").notIf("(#Fraction|#Percent)").found;
    });
    m3 = m3.notIf("#Value seconds");
    if (typeof n2 === "number") {
      m3 = m3.eq(n2);
    }
    return m3;
  };
  var find_default2 = findFractions;

  // node_modules/compromise/src/3-three/numbers/numbers/parse/toNumber/findModifiers.js
  var findModifiers = (str) => {
    const mults = [
      {
        reg: /^(minus|negative)[\s-]/i,
        mult: -1
      },
      {
        reg: /^(a\s)?half[\s-](of\s)?/i,
        mult: 0.5
      }
      //  {
      //   reg: /^(a\s)?quarter[\s\-]/i,
      //   mult: 0.25
      // }
    ];
    for (let i3 = 0; i3 < mults.length; i3++) {
      if (mults[i3].reg.test(str) === true) {
        return {
          amount: mults[i3].mult,
          str: str.replace(mults[i3].reg, "")
        };
      }
    }
    return {
      amount: 1,
      str
    };
  };
  var findModifiers_default = findModifiers;

  // node_modules/compromise/src/3-three/numbers/numbers/parse/toNumber/data.js
  var data_default = {
    ones: {
      zeroth: 0,
      first: 1,
      second: 2,
      third: 3,
      fourth: 4,
      fifth: 5,
      sixth: 6,
      seventh: 7,
      eighth: 8,
      ninth: 9,
      zero: 0,
      one: 1,
      two: 2,
      three: 3,
      four: 4,
      five: 5,
      six: 6,
      seven: 7,
      eight: 8,
      nine: 9
    },
    teens: {
      tenth: 10,
      eleventh: 11,
      twelfth: 12,
      thirteenth: 13,
      fourteenth: 14,
      fifteenth: 15,
      sixteenth: 16,
      seventeenth: 17,
      eighteenth: 18,
      nineteenth: 19,
      ten: 10,
      eleven: 11,
      twelve: 12,
      thirteen: 13,
      fourteen: 14,
      fifteen: 15,
      sixteen: 16,
      seventeen: 17,
      eighteen: 18,
      nineteen: 19
    },
    tens: {
      twentieth: 20,
      thirtieth: 30,
      fortieth: 40,
      fourtieth: 40,
      fiftieth: 50,
      sixtieth: 60,
      seventieth: 70,
      eightieth: 80,
      ninetieth: 90,
      twenty: 20,
      thirty: 30,
      forty: 40,
      fourty: 40,
      fifty: 50,
      sixty: 60,
      seventy: 70,
      eighty: 80,
      ninety: 90
    },
    multiples: {
      hundredth: 100,
      thousandth: 1e3,
      millionth: 1e6,
      billionth: 1e9,
      trillionth: 1e12,
      quadrillionth: 1e15,
      quintillionth: 1e18,
      sextillionth: 1e21,
      septillionth: 1e24,
      hundred: 100,
      thousand: 1e3,
      million: 1e6,
      billion: 1e9,
      trillion: 1e12,
      quadrillion: 1e15,
      quintillion: 1e18,
      sextillion: 1e21,
      septillion: 1e24,
      grand: 1e3,
      dozen: 12
    }
  };

  // node_modules/compromise/src/3-three/numbers/numbers/parse/toNumber/validate.js
  var isValid = (w, has2) => {
    if (Object.hasOwn(data_default.ones, w)) {
      if (has2.ones || has2.teens) {
        return false;
      }
    } else if (Object.hasOwn(data_default.teens, w)) {
      if (has2.ones || has2.teens || has2.tens) {
        return false;
      }
    } else if (Object.hasOwn(data_default.tens, w)) {
      if (has2.ones || has2.teens || has2.tens) {
        return false;
      }
    }
    return true;
  };
  var validate_default3 = isValid;

  // node_modules/compromise/src/3-three/numbers/numbers/parse/toNumber/parseDecimals.js
  var parseDecimals = function(arr) {
    let str = "0.";
    for (let i3 = 0; i3 < arr.length; i3++) {
      const w = arr[i3];
      if (Object.hasOwn(data_default.ones, w) === true) {
        str += data_default.ones[w];
      } else if (Object.hasOwn(data_default.teens, w) === true) {
        str += data_default.teens[w];
      } else if (Object.hasOwn(data_default.tens, w) === true) {
        str += data_default.tens[w];
      } else if (/^[0-9]$/.test(w) === true) {
        str += w;
      } else {
        return 0;
      }
    }
    return parseFloat(str);
  };
  var parseDecimals_default = parseDecimals;

  // node_modules/compromise/src/3-three/numbers/numbers/parse/toNumber/parseNumeric.js
  var parseNumeric = (str) => {
    str = str.replace(/1st$/, "1");
    str = str.replace(/2nd$/, "2");
    str = str.replace(/3rd$/, "3");
    str = str.replace(/([4567890])r?th$/, "$1");
    str = str.replace(/^[$€¥£¢]/, "");
    str = str.replace(/[%$€¥£¢]$/, "");
    str = str.replace(/,/g, "");
    str = str.replace(/([0-9])([a-z\u00C0-\u00FF]{1,2})$/, "$1");
    return str;
  };
  var parseNumeric_default = parseNumeric;

  // node_modules/compromise/src/3-three/numbers/numbers/parse/toNumber/index.js
  var improperFraction = /^([0-9,. ]+)\/([0-9,. ]+)$/;
  var casualForms = {
    "a few": 3,
    "a couple": 2,
    "a dozen": 12,
    "two dozen": 24,
    zero: 0
  };
  var section_sum = (obj) => {
    return Object.keys(obj).reduce((sum, k2) => {
      sum += obj[k2];
      return sum;
    }, 0);
  };
  var parse5 = function(str) {
    if (Object.hasOwn(casualForms, str) === true) {
      return casualForms[str];
    }
    if (str === "a" || str === "an") {
      return 1;
    }
    const modifier = findModifiers_default(str);
    str = modifier.str;
    let last_mult = null;
    let has2 = {};
    let sum = 0;
    let isNegative2 = false;
    const terms = str.split(/[ -]/);
    for (let i3 = 0; i3 < terms.length; i3++) {
      let w = terms[i3];
      w = parseNumeric_default(w);
      if (!w || w === "and") {
        continue;
      }
      if (w === "-" || w === "negative") {
        isNegative2 = true;
        continue;
      }
      if (w.charAt(0) === "-") {
        isNegative2 = true;
        w = w.substring(1);
      }
      if (w === "point") {
        sum += section_sum(has2);
        sum += parseDecimals_default(terms.slice(i3 + 1, terms.length));
        sum *= modifier.amount;
        return sum;
      }
      const fm = w.match(improperFraction);
      if (fm) {
        const num = parseFloat(fm[1].replace(/[, ]/g, ""));
        const denom = parseFloat(fm[2].replace(/[, ]/g, ""));
        if (denom) {
          sum += num / denom || 0;
        }
        continue;
      }
      if (Object.hasOwn(data_default.tens, w)) {
        if (has2.ones && Object.keys(has2).length === 1) {
          sum = has2.ones * 100;
          has2 = {};
        }
      }
      if (validate_default3(w, has2) === false) {
        return null;
      }
      if (/^[0-9.]+$/.test(w)) {
        has2.ones = parseFloat(w);
      } else if (Object.hasOwn(data_default.ones, w) === true) {
        has2.ones = data_default.ones[w];
      } else if (Object.hasOwn(data_default.teens, w) === true) {
        has2.teens = data_default.teens[w];
      } else if (Object.hasOwn(data_default.tens, w) === true) {
        has2.tens = data_default.tens[w];
      } else if (Object.hasOwn(data_default.multiples, w) === true) {
        let mult = data_default.multiples[w];
        if (mult === last_mult) {
          return null;
        }
        if (mult === 100 && terms[i3 + 1] !== void 0) {
          const w2 = terms[i3 + 1];
          if (data_default.multiples[w2]) {
            mult *= data_default.multiples[w2];
            i3 += 1;
          }
        }
        if (last_mult === null || mult < last_mult) {
          sum += (section_sum(has2) || 1) * mult;
          last_mult = mult;
          has2 = {};
        } else {
          sum += section_sum(has2);
          last_mult = mult;
          sum = (sum || 1) * mult;
          has2 = {};
        }
      }
    }
    sum += section_sum(has2);
    sum *= modifier.amount;
    sum *= isNegative2 ? -1 : 1;
    if (sum === 0 && Object.keys(has2).length === 0) {
      return null;
    }
    return sum;
  };
  var toNumber_default = parse5;

  // node_modules/compromise/src/3-three/numbers/fractions/parse.js
  var endS = /s$/;
  var parseNumber = function(m3) {
    const str = m3.text("reduced");
    return toNumber_default(str);
  };
  var mapping2 = {
    half: 2,
    halve: 2,
    quarter: 4
  };
  var slashForm = function(m3) {
    const str = m3.text("reduced");
    const found = str.match(/^([-+]?[0-9]+(?:\.[0-9]+)?)\/([-+]?[0-9]+)(st|nd|rd|th)?s?$/);
    if (found && found[1] && found[0]) {
      return {
        numerator: Number(found[1]),
        denominator: Number(found[2])
      };
    }
    return null;
  };
  var nOutOfN = function(m3) {
    const found = m3.match("[<num>#Value+] out of every? [<den>#Value+]");
    if (found.found !== true) {
      return null;
    }
    let { num, den } = found.groups();
    if (!num || !den) {
      return null;
    }
    num = parseNumber(num);
    den = parseNumber(den);
    if (!num || !den) {
      return null;
    }
    if (typeof num === "number" && typeof den === "number") {
      return {
        numerator: num,
        denominator: den
      };
    }
    return null;
  };
  var compoundOrdinal = (m3) => {
    if (!m3.has("^(a|one) #Cardinal+ #Ordinal$")) {
      return null;
    }
    const denominator = parseNumber(m3.terms().slice(1));
    if (typeof denominator === "number" && denominator > 0) {
      return { numerator: 1, denominator };
    }
    return null;
  };
  var nOrinalth = function(m3) {
    const found = m3.match("[<num>(#Cardinal|a)+] [<den>#Fraction+]");
    if (found.found !== true) {
      return null;
    }
    let { num, den } = found.groups();
    if (num.has("a")) {
      num = 1;
    } else {
      num = parseNumber(num);
    }
    let str = den.text("reduced");
    if (endS.test(str)) {
      str = str.replace(endS, "");
      den = den.replaceWith(str);
    }
    if (Object.hasOwn(mapping2, str)) {
      den = mapping2[str];
    } else {
      den = parseNumber(den);
    }
    if (typeof num === "number" && typeof den === "number") {
      return {
        numerator: num,
        denominator: den
      };
    }
    return null;
  };
  var oneNth = function(m3) {
    const found = m3.match("^#Ordinal$");
    if (found.found !== true) {
      return null;
    }
    if (m3.lookAhead("^of .")) {
      const num = parseNumber(found);
      return {
        numerator: 1,
        denominator: num
      };
    }
    return null;
  };
  var named = function(m3) {
    const str = m3.text("reduced");
    if (Object.hasOwn(mapping2, str)) {
      return { numerator: 1, denominator: mapping2[str] };
    }
    return null;
  };
  var round2 = (n2) => {
    const rounded = Math.round(n2 * 1e3) / 1e3;
    if (rounded === 0 && n2 !== 0) {
      return n2;
    }
    return rounded;
  };
  var parseFraction = function(m3) {
    m3 = m3.clone();
    const res = named(m3) || slashForm(m3) || nOutOfN(m3) || compoundOrdinal(m3) || nOrinalth(m3) || oneNth(m3) || null;
    if (res !== null) {
      if (res.denominator !== 0) {
        res.decimal = res.numerator / res.denominator;
        res.decimal = round2(res.decimal);
      }
    }
    return res;
  };
  var parse_default4 = parseFraction;

  // node_modules/compromise/src/3-three/numbers/numbers/_conversion.js
  var shiftDecimal = (num, places3) => {
    const [coefficient, exponent = "0"] = String(num).split("e");
    return Number(`${coefficient}e${Number(exponent) + places3}`);
  };
  var decimalText = (num) => {
    const str = String(num);
    if (!str.includes("e")) {
      return str;
    }
    const [coefficient, exponent] = str.split("e");
    const sign = num < 0 ? "-" : "";
    const unsigned = coefficient.replace("-", "");
    const digits = unsigned.replace(".", "");
    const point = unsigned.split(".")[0].length + Number(exponent);
    if (point <= 0) {
      return `${sign}0.${"0".repeat(-point)}${digits}`;
    }
    if (point >= digits.length) {
      return sign + digits + "0".repeat(point - digits.length);
    }
    return `${sign}${digits.slice(0, point)}.${digits.slice(point)}`;
  };
  var decimalFraction = (num) => {
    const [coefficient, exponent = "0"] = String(num).split("e");
    const places3 = (coefficient.split(".")[1] || "").length - Number(exponent);
    let numerator = BigInt(coefficient.replace(".", ""));
    let denominator = 1n;
    if (places3 > 0) {
      denominator = 10n ** BigInt(places3);
    } else {
      numerator *= 10n ** BigInt(-places3);
    }
    let divisor = numerator < 0n ? -numerator : numerator;
    for (let remainder = denominator; remainder !== 0n; ) {
      const next = divisor % remainder;
      divisor = remainder;
      remainder = next;
    }
    return [numerator / divisor, denominator / divisor];
  };
  var isPercent = (value) => value.has("#Percent") || value.after("^per cent").found;
  var replaceNumber = (value, str) => {
    const first = value.docs[0][0];
    if (/\.$/.test(first.pre) && /^\d/.test(first.text)) {
      first.pre = first.pre.slice(0, -1);
    }
    return value.replaceWith(str).firstTerm();
  };

  // node_modules/compromise/src/3-three/numbers/numbers/_toString.js
  var numToString = function(n2) {
    if (n2 < 1e6) {
      return String(n2);
    }
    let str;
    if (typeof n2 === "number") {
      str = n2.toFixed(0);
    } else {
      str = n2;
    }
    if (str.indexOf("e+") === -1) {
      return str;
    }
    return decimalText(str);
  };
  var toString_default = numToString;

  // node_modules/compromise/src/3-three/numbers/numbers/format/toText/data.js
  var tens_mapping = [
    ["ninety", 90],
    ["eighty", 80],
    ["seventy", 70],
    ["sixty", 60],
    ["fifty", 50],
    ["forty", 40],
    ["thirty", 30],
    ["twenty", 20]
  ];
  var ones_mapping = [
    "",
    "one",
    "two",
    "three",
    "four",
    "five",
    "six",
    "seven",
    "eight",
    "nine",
    "ten",
    "eleven",
    "twelve",
    "thirteen",
    "fourteen",
    "fifteen",
    "sixteen",
    "seventeen",
    "eighteen",
    "nineteen"
  ];
  var sequence = [
    [1e24, "septillion"],
    [1e20, "hundred sextillion"],
    [1e21, "sextillion"],
    [1e20, "hundred quintillion"],
    [1e18, "quintillion"],
    [1e17, "hundred quadrillion"],
    [1e15, "quadrillion"],
    [1e14, "hundred trillion"],
    [1e12, "trillion"],
    [1e11, "hundred billion"],
    [1e9, "billion"],
    [1e8, "hundred million"],
    [1e6, "million"],
    [1e5, "hundred thousand"],
    [1e3, "thousand"],
    [100, "hundred"],
    [1, "one"]
  ];

  // node_modules/compromise/src/3-three/numbers/numbers/format/toText/index.js
  var breakdown_magnitudes = function(num) {
    let working = num;
    const have = [];
    sequence.forEach((a) => {
      if (num >= a[0]) {
        const howmany = Math.floor(working / a[0]);
        working -= howmany * a[0];
        if (howmany) {
          have.push({
            unit: a[1],
            count: howmany
          });
        }
      }
    });
    return have;
  };
  var breakdown_hundred = function(num) {
    const arr = [];
    if (num > 100) {
      return arr;
    }
    for (let i3 = 0; i3 < tens_mapping.length; i3++) {
      if (num >= tens_mapping[i3][1]) {
        num -= tens_mapping[i3][1];
        arr.push(tens_mapping[i3][0]);
      }
    }
    if (ones_mapping[num]) {
      arr.push(ones_mapping[num]);
    }
    return arr;
  };
  var handle_decimal = (num) => {
    const names = ["zero", "one", "two", "three", "four", "five", "six", "seven", "eight", "nine"];
    const arr = [];
    const str = toString_default(num);
    const decimal = str.match(/\.([0-9]+)/);
    if (!decimal || !decimal[0]) {
      return arr;
    }
    arr.push("point");
    const decimals = decimal[0].split("");
    for (let i3 = 0; i3 < decimals.length; i3++) {
      arr.push(names[decimals[i3]]);
    }
    return arr;
  };
  var toText4 = function(obj) {
    let num = obj.num;
    if (num === 0 || num === "0") {
      return "zero";
    }
    if (num > 1e21) {
      num = toString_default(num);
    }
    let arr = [];
    if (num < 0) {
      arr.push("minus");
      num = Math.abs(num);
    }
    const units = breakdown_magnitudes(num);
    for (let i3 = 0; i3 < units.length; i3++) {
      let unit_name = units[i3].unit;
      if (unit_name === "one") {
        unit_name = "";
        if (arr.length > 1) {
          arr.push("and");
        }
      }
      arr = arr.concat(breakdown_hundred(units[i3].count));
      arr.push(unit_name);
    }
    arr = arr.concat(handle_decimal(num));
    arr = arr.filter((s2) => s2);
    if (arr.length === 0) {
      arr[0] = "";
    }
    return arr.join(" ");
  };
  var toText_default2 = toText4;

  // node_modules/compromise/src/3-three/numbers/fractions/_lib.js
  var isValid2 = (obj) => obj && Number.isFinite(obj.numerator) && Number.isFinite(obj.denominator) && obj.denominator !== 0;
  var replaceFraction = (view, str) => {
    const [sentence, start2] = view.fullPointer[0];
    if (str.startsWith("minus ")) {
      const first = view.docs[0][0];
      first.pre = first.pre.replace(/-$/, "");
    }
    const replacement = view.fromText(str).tag("Fraction");
    const end2 = start2 + replacement.wordCount();
    view.replaceWith(replacement);
    return view.toView([[sentence, start2, end2]]);
  };

  // node_modules/compromise/src/3-three/numbers/fractions/convert/toCardinal.js
  var toCardinal = function(obj) {
    if (!isValid2(obj)) {
      return "";
    }
    const a = toText_default2({ num: obj.numerator });
    const b2 = toText_default2({ num: obj.denominator });
    return `${a} out of ${b2}`;
  };
  var toCardinal_default = toCardinal;

  // node_modules/compromise/src/3-three/numbers/numbers/format/toOrdinal/textOrdinal.js
  var irregulars = {
    one: "first",
    two: "second",
    three: "third",
    five: "fifth",
    eight: "eighth",
    nine: "ninth",
    twelve: "twelfth",
    twenty: "twentieth",
    thirty: "thirtieth",
    forty: "fortieth",
    fourty: "fourtieth",
    fifty: "fiftieth",
    sixty: "sixtieth",
    seventy: "seventieth",
    eighty: "eightieth",
    ninety: "ninetieth"
  };
  var textOrdinal = (obj) => {
    const words = toText_default2(obj).split(" ");
    const last = words[words.length - 1];
    if (Object.hasOwn(irregulars, last)) {
      words[words.length - 1] = irregulars[last];
    } else {
      words[words.length - 1] = last.replace(/y$/, "i") + "th";
    }
    return words.join(" ");
  };
  var textOrdinal_default = textOrdinal;

  // node_modules/compromise/src/3-three/numbers/fractions/convert/toOrdinal.js
  var toOrdinal = function(obj) {
    if (!isValid2(obj)) {
      return "";
    }
    const start2 = toText_default2({ num: obj.numerator });
    let end2 = textOrdinal_default({ num: obj.denominator });
    if (obj.denominator === 2) {
      end2 = "half";
    }
    if (start2 && end2) {
      if (Math.abs(obj.numerator) !== 1) {
        end2 = end2 === "half" ? "halves" : end2 + "s";
      }
      return `${start2} ${end2}`;
    }
    return "";
  };
  var toOrdinal_default = toOrdinal;

  // node_modules/compromise/src/3-three/numbers/fractions/api.js
  var plugin4 = function(View2) {
    class Fractions extends View2 {
      constructor(document, pointer, groups2) {
        super(document, pointer, groups2);
        this.viewType = "Fractions";
      }
      parse(n2) {
        return this.getNth(n2).map(parse_default4);
      }
      get(n2) {
        return this.getNth(n2).map(parse_default4);
      }
      json(n2) {
        return this.getNth(n2).map((p4) => {
          const json = p4.toView().json(n2)[0];
          const parsed = parse_default4(p4);
          json.fraction = parsed;
          return json;
        }, []);
      }
      // become 0.5
      toDecimal(n2) {
        const result = this.getNth(n2).map((m3) => {
          const obj = parse_default4(m3);
          if (!isValid2(obj)) {
            return m3;
          }
          const decimal = obj.numerator / obj.denominator;
          return replaceNumber(m3, decimalText(decimal)).tag("NumericValue").unTag("Fraction");
        });
        return result.numbers();
      }
      toFraction(n2) {
        const result = this.getNth(n2).map((m3) => {
          const obj = parse_default4(m3);
          if (isValid2(obj)) {
            const str = `${decimalText(obj.numerator)}/${decimalText(obj.denominator)}`;
            return replaceFraction(m3, str);
          }
          return m3;
        });
        return result.fractions();
      }
      toOrdinal(n2) {
        return this.getNth(n2).map((m3) => {
          const obj = parse_default4(m3);
          let str = toOrdinal_default(obj);
          if (!str) {
            return m3;
          }
          if (m3.after("^#Noun").found) {
            str += " of";
          }
          return replaceFraction(m3, str);
        });
      }
      toCardinal(n2) {
        return this.getNth(n2).map((m3) => {
          const obj = parse_default4(m3);
          const str = toCardinal_default(obj);
          if (!str) {
            return m3;
          }
          return replaceFraction(m3, str);
        });
      }
      // spell it out - '1/2' -> 'one half'
      toText(n2) {
        return this.getNth(n2).map((m3) => {
          const obj = parse_default4(m3);
          const str = toOrdinal_default(obj);
          if (str) {
            return replaceFraction(m3, str);
          }
          return m3;
        });
      }
      toPercentage(n2) {
        return this.getNth(n2).map((m3) => {
          const obj = parse_default4(m3);
          if (!isValid2(obj)) {
            return m3;
          }
          const { numerator, denominator } = obj;
          let percent = numerator;
          if (denominator !== 100) {
            percent = numerator / denominator * 100;
            percent = Math.round(percent * 100) / 100;
          }
          return replaceNumber(m3, `${decimalText(percent)}%`);
        });
      }
      update(pointer) {
        const m3 = new Fractions(this.document, pointer);
        m3._cache = this._cache;
        return m3;
      }
    }
    View2.prototype.fractions = select_default(Fractions, find_default2, true);
  };
  var api_default15 = plugin4;

  // node_modules/compromise/src/3-three/numbers/numbers/find.js
  var ones = "one|two|three|four|five|six|seven|eight|nine";
  var tens = "twenty|thirty|forty|fifty|sixty|seventy|eighty|ninety|fourty";
  var teens = "eleven|twelve|thirteen|fourteen|fifteen|sixteen|seventeen|eighteen|nineteen";
  var findNumbers = function(doc) {
    let m3 = doc.match("#Value+");
    if (m3.has("#NumericValue #NumericValue")) {
      if (m3.has("#Value @hasComma #Value")) {
        m3.splitAfter("@hasComma");
      } else if (m3.has("#NumericValue #Fraction")) {
        m3.splitAfter("#NumericValue #Fraction");
      } else {
        m3 = m3.splitAfter("#NumericValue");
      }
    }
    if (m3.has("#Value #Value #Value") && !m3.has("#Multiple")) {
      if (m3.has("(" + tens + ") #Cardinal #Cardinal")) {
        m3 = m3.splitAfter("(" + tens + ") #Cardinal");
      }
    }
    if (m3.has("#Value #Value")) {
      if (m3.has("#NumericValue #NumericValue")) {
        m3 = m3.splitOn("#Year");
      }
      if (m3.has("(" + tens + ") (" + teens + ")")) {
        m3 = m3.splitAfter("(" + tens + ")");
      }
      const double = m3.match("#Cardinal #Cardinal");
      if (double.found && !m3.has("(point|decimal|#Fraction)")) {
        if (!double.has("#Cardinal (#Multiple|point|decimal)")) {
          const noMultiple = m3.has(`(${ones}) (${tens})`);
          const tensVal = double.has("(" + tens + ") #Cardinal");
          const multVal = double.has("#Multiple #Value");
          if (!noMultiple && !tensVal && !multVal) {
            double.terms().forEach((d) => {
              m3 = m3.splitOn(d);
            });
          }
        }
      }
      if (m3.match("#Ordinal #Ordinal").match("#TextValue").found && !m3.has("#Multiple")) {
        if (!m3.has("(" + tens + ") #Ordinal")) {
          m3 = m3.splitAfter("#Ordinal");
        }
      }
      if (m3.has("#Time")) {
        m3 = m3.splitOn("#Time");
      }
      m3 = m3.splitBefore("#Ordinal [#Cardinal]", 0);
      if (m3.has("#TextValue #NumericValue") && !m3.has("(" + tens + "|#Multiple)")) {
        m3 = m3.splitBefore("#TextValue #NumericValue");
      }
    }
    m3 = m3.splitAfter("#NumberRange");
    m3 = m3.splitBefore("#Year");
    return m3;
  };
  var find_default3 = findNumbers;

  // node_modules/compromise/src/3-three/numbers/numbers/parse/index.js
  var parseNumeric2 = function(str, m3) {
    str = str.replace(/,/g, "");
    const arr = str.split(/([0-9.,]*)/);
    let [prefix5, num] = arr;
    let suffix2 = arr.slice(2).join("");
    if (num !== "" && m3.length < 2) {
      num = Number(num || str);
      if (typeof num !== "number") {
        num = null;
      }
      suffix2 ||= "";
      if (suffix2 === "st" || suffix2 === "nd" || suffix2 === "rd" || suffix2 === "th") {
        suffix2 = "";
      }
      return {
        prefix: prefix5 || "",
        num,
        suffix: suffix2
      };
    }
    return null;
  };
  var parseNumber2 = function(m3) {
    if (typeof m3 === "string") {
      return { num: toNumber_default(m3) };
    }
    let str = m3.text("reduced");
    if (m3.text().includes("\xA2")) {
      str = str.replace(/^c|c$/g, "\xA2");
    }
    const unit2 = m3.growRight("#Unit").match("#Unit$").text("machine");
    const hasComma = /[0-9],[0-9]/.test(m3.text("text"));
    if (m3.terms().length === 1 && !m3.has("#Multiple")) {
      const res = parseNumeric2(str, m3);
      if (res !== null) {
        res.hasComma = hasComma;
        res.unit = unit2;
        return res;
      }
    }
    let frPart = m3.match("#Fraction{2,}$");
    frPart = frPart.found === false ? m3.match("^#Fraction$") : frPart;
    let fraction = null;
    if (frPart.found) {
      if (frPart.has("#Value and #Value #Fraction")) {
        frPart = frPart.match("and #Value #Fraction");
      }
      fraction = parse_default4(frPart);
      m3 = m3.not(frPart);
      m3 = m3.not("and$");
      str = m3.text("reduced");
    }
    let num = 0;
    if (str) {
      let end2 = str.length;
      for (; end2 > 0 && /[.!?]/.test(str[end2 - 1]); end2 -= 1) {
      }
      num = toNumber_default(str.slice(0, end2)) || 0;
    }
    if (fraction && fraction.decimal) {
      num += fraction.decimal;
    }
    return {
      hasComma,
      prefix: "",
      num,
      suffix: "",
      isOrdinal: m3.has("#Ordinal"),
      isText: m3.has("#TextValue"),
      isFraction: m3.has("#Fraction"),
      isMoney: m3.has("#Money"),
      unit: unit2
    };
  };
  var parse_default5 = parseNumber2;

  // node_modules/compromise/src/3-three/numbers/numbers/format/toOrdinal/numOrdinal.js
  var numOrdinal = function(obj) {
    const num = obj.num;
    if (!num && num !== 0) {
      return null;
    }
    const tens2 = num % 100;
    if (tens2 > 10 && tens2 < 20) {
      return String(num) + "th";
    }
    const mapping3 = {
      0: "th",
      1: "st",
      2: "nd",
      3: "rd"
    };
    let str = toString_default(num);
    const last = str.slice(str.length - 1, str.length);
    if (mapping3[last]) {
      str += mapping3[last];
    } else {
      str += "th";
    }
    return str;
  };
  var numOrdinal_default = numOrdinal;

  // node_modules/compromise/src/3-three/numbers/numbers/format/suffix.js
  var prefixes = {
    "\xA2": "cents",
    $: "dollars",
    "\xA3": "pounds",
    "\xA5": "yen",
    "\u20AC": "euros",
    "\u20A1": "col\xF3n",
    "\u0E3F": "baht",
    "\u20AD": "kip",
    "\u20A9": "won",
    "\u20B9": "rupees",
    "\u20BD": "ruble",
    "\u20BA": "liras"
  };
  var suffixes4 = {
    "%": "percent",
    "\xA2": "cents",
    // s: 'seconds',
    // cm: 'centimetres',
    // km: 'kilometres',
    // ft: 'feet',
    "\xB0": "degrees"
  };
  var addSuffix = function(obj) {
    const res = {
      suffix: "",
      prefix: obj.prefix
    };
    if (Object.hasOwn(prefixes, obj.prefix)) {
      res.suffix += " " + prefixes[obj.prefix];
      res.prefix = "";
    }
    if (Object.hasOwn(suffixes4, obj.suffix)) {
      res.suffix += " " + suffixes4[obj.suffix];
    }
    if (res.suffix && obj.num === 1) {
      res.suffix = res.suffix.replace(/s$/, "");
    }
    if (res.suffix && /^(cad|usd)$/i.test(obj.suffix)) {
      res.suffix += " " + obj.suffix.toUpperCase();
    }
    if (!res.suffix && obj.suffix) {
      res.suffix += " " + obj.suffix;
    }
    return res;
  };
  var suffix_default2 = addSuffix;

  // node_modules/compromise/src/3-three/numbers/numbers/format/index.js
  var format = function(obj, fmt2) {
    if (fmt2 === "TextOrdinal") {
      const { prefix: prefix5, suffix: suffix2 } = suffix_default2(obj);
      return prefix5 + textOrdinal_default(obj) + suffix2;
    }
    if (fmt2 === "Ordinal") {
      return obj.prefix + numOrdinal_default(obj) + obj.suffix;
    }
    if (fmt2 === "TextCardinal") {
      const { prefix: prefix5, suffix: suffix2 } = suffix_default2(obj);
      return prefix5 + toText_default2(obj) + suffix2;
    }
    let num = obj.num;
    if (obj.hasComma) {
      num = num.toLocaleString();
    }
    return obj.prefix + String(num) + obj.suffix;
  };
  var format_default = format;

  // node_modules/compromise/src/3-three/numbers/numbers/isUnit.js
  var coerceToObject = function(input) {
    if (typeof input === "string" || typeof input === "number") {
      const tmp = {};
      tmp[input] = true;
      return tmp;
    }
    if (Array.isArray(input)) {
      return input.reduce((h, s2) => {
        h[s2] = true;
        return h;
      }, {});
    }
    return input || {};
  };
  var isUnit = function(doc, input = {}) {
    input = coerceToObject(input);
    return doc.filter((p4) => {
      const { unit: unit2 } = parse_default5(p4);
      if (unit2 && input[unit2] === true) {
        return true;
      }
      return false;
    });
  };
  var isUnit_default = isUnit;

  // node_modules/compromise/src/3-three/numbers/numbers/agree.js
  var boundary = /[,;:.!?]/;
  var agree = (value, singular2) => {
    if (boundary.test(value.docs[0].at(-1).post)) {
      return;
    }
    const phrase = value.after("^(#Adverb|#Adjective)+? #Noun");
    if (!phrase.found || phrase.docs[0].slice(0, -1).some((term) => boundary.test(term.post))) {
      return;
    }
    const noun3 = phrase.lastTerm();
    if (noun3.has("(#Pronoun|#Possessive|#ProperNoun|#Uncountable)")) {
      return;
    }
    const tag = singular2 ? "Singular" : "Plural";
    if (noun3.has("#" + tag)) {
      return;
    }
    const { methods: methods19, model: model5 } = value.world;
    const transform = methods19.two.transform.noun;
    const word = noun3.text("normal");
    const countModel = { two: { irregularPlurals: model5.two.irregularPlurals, uncountable: {} } };
    let str = singular2 ? transform.toSingular(word, model5) : transform.toPlural(word, countModel);
    const original = noun3.docs[0][0].text;
    if (original === original.toUpperCase()) {
      str = str.toUpperCase();
    } else if (new RegExp("^\\p{Lu}", "u").test(original)) {
      str = str.charAt(0).toUpperCase() + str.slice(1);
    }
    noun3.replaceWith(str, { tags: true }).tag(tag);
  };
  var agree_default = agree;

  // node_modules/compromise/src/3-three/numbers/numbers/_lib.js
  var convert2 = (view, tag, skip, getFormat) => {
    const res = view._mapNumbers((val) => {
      if (skip(val)) {
        return val;
      }
      const obj = parse_default5(val);
      if (obj.num === null) {
        return val;
      }
      const str = format_default(obj, getFormat(val));
      val.replaceWith(str, { tags: true });
      val.not("#Currency").tag(tag);
      if (tag === "Ordinal" || tag === "Cardinal") {
        agree_default(val, tag === "Ordinal" || obj.num === 1);
      }
      return val;
    });
    return view.update(res.pointer);
  };
  var lib_default14 = convert2;

  // node_modules/compromise/src/3-three/numbers/numbers/toFraction.js
  var toFraction = (numbers) => {
    const result = numbers.map((value) => {
      if (value.has("#Fraction")) {
        return value;
      }
      const { num } = parse_default5(value);
      if (!Number.isFinite(num) || value.has("#Money")) {
        return value.none();
      }
      let str;
      if (isPercent(value)) {
        str = `${decimalText(num)}/100`;
        value = value.growRight("(percent|percentage|per cent)");
      } else {
        str = decimalFraction(num).join("/");
      }
      const phrase = replaceNumber(value, str);
      phrase.unTag("Percent").tag(["Fraction", "NumericValue"]);
      return phrase;
    });
    return result.fractions();
  };
  var toFraction_default = toFraction;

  // node_modules/compromise/src/3-three/numbers/numbers/toPercentage.js
  var toPercentage = (numbers) => {
    const result = numbers.map((value) => {
      if (isPercent(value)) {
        return value;
      }
      const num = shiftDecimal(parse_default5(value).num, 2);
      if (!Number.isFinite(num) || value.has("#Money")) {
        return value.none();
      }
      return replaceNumber(value, `${decimalText(num)}%`).tag(["Percent", "NumericValue"]);
    });
    return result.percentages();
  };
  var toPercentage_default = toPercentage;

  // node_modules/compromise/src/3-three/numbers/numbers/toDecimal.js
  var toDecimal = (numbers) => {
    const result = numbers.map((value) => {
      if (!isPercent(value)) {
        return value;
      }
      const num = shiftDecimal(parse_default5(value).num, -2);
      if (!Number.isFinite(num)) {
        return value.none();
      }
      const phrase = value.growRight("(percent|percentage|per cent)");
      return replaceNumber(phrase, decimalText(num)).unTag("Percent").tag(["Cardinal", "NumericValue"]);
    });
    return result.numbers();
  };
  var toDecimal_default = toDecimal;

  // node_modules/compromise/src/3-three/numbers/numbers/api.js
  var ordinalMatch = "#Ordinal";
  var textValueMatch = "#TextValue";
  var textOrdinal2 = "TextOrdinal";
  var textCardinal = "TextCardinal";
  var addMethod = function(View2) {
    class Numbers extends View2 {
      constructor(document, pointer, groups2) {
        super(document, pointer, groups2);
        this.viewType = "Numbers";
      }
      parse(n2) {
        return this.getNth(n2).map(parse_default5);
      }
      get(n2) {
        return this.getNth(n2).map(parse_default5).map((o) => o.num);
      }
      json(n2) {
        const opts2 = typeof n2 === "object" ? n2 : {};
        return this.getNth(n2).map((p4) => {
          const json = p4.toView().json(opts2)[0];
          const parsed = parse_default5(p4);
          json.number = {
            prefix: parsed.prefix,
            num: parsed.num,
            suffix: parsed.suffix,
            hasComma: parsed.hasComma,
            unit: parsed.unit
          };
          return json;
        }, []);
      }
      /** any known measurement unit, for the number */
      units() {
        return this.growRight("#Unit").match("#Unit$");
      }
      /** return values that match a given unit */
      isUnit(allowed) {
        return isUnit_default(this, allowed);
      }
      /** return only ordinal numbers */
      isOrdinal() {
        return this.if(ordinalMatch);
      }
      /** return only cardinal numbers*/
      isCardinal() {
        return this.if("#Cardinal");
      }
      /** convert to numeric form like '8' or '8th' */
      toNumber() {
        return lib_default14(
          this,
          Numeric,
          () => !this.has(textValueMatch),
          (val) => val.has(ordinalMatch) ? Ord : Card
        );
      }
      /** add commas, or nicer formatting for numbers */
      toLocaleString() {
        const m3 = this;
        const res = m3._mapNumbers((val) => {
          const obj = parse_default5(val);
          if (obj.num === null) {
            return val;
          }
          let num = obj.num.toLocaleString();
          if (val.has(ordinalMatch)) {
            num += format_default(obj, Ord).slice(obj.prefix.length).match(/[a-z]+/)[0];
          }
          val.replaceWith(obj.prefix + num + obj.suffix, { tags: true });
          return val;
        });
        return this.update(res.pointer);
      }
      /** convert to numeric form like 'eight' or 'eighth' */
      toText() {
        return lib_default14(
          this,
          TxtNum,
          (val) => val.has(textValueMatch),
          (val) => val.has(ordinalMatch) ? textOrdinal2 : textCardinal
        );
      }
      /** convert ordinal to cardinal form, like 'eight', or '8' */
      toCardinal() {
        return lib_default14(
          this,
          Card,
          (val) => !val.has(ordinalMatch),
          (val) => val.has(textValueMatch) ? textCardinal : Card
        );
      }
      /** convert cardinal to ordinal form, like 'eighth', or '8th' */
      toOrdinal() {
        return lib_default14(
          this,
          Ord,
          (val) => val.has(ordinalMatch),
          (val) => val.has(textValueMatch) ? textOrdinal2 : Ord
        );
      }
      toFraction() {
        return toFraction_default(this);
      }
      toPercentage() {
        return toPercentage_default(this);
      }
      toDecimal() {
        return toDecimal_default(this);
      }
      /** return only numbers that are == n */
      isEqual(n2) {
        return this.filter((val) => {
          const num = val.get(0)[0];
          return num === n2;
        });
      }
      /** return only numbers that are > n*/
      greaterThan(n2) {
        return this.filter((val) => {
          const num = val.get(0)[0];
          return num > n2;
        });
      }
      /** return only numbers that are < n*/
      lessThan(n2) {
        return this.filter((val) => {
          const num = val.get(0)[0];
          return num < n2;
        });
      }
      /** return only numbers > min and < max */
      between(min2, max3) {
        return this.filter((val) => {
          const num = val.get(0)[0];
          return num > min2 && num < max3;
        });
      }
      /** set these number to n */
      set(n2) {
        if (n2 === void 0) {
          return this;
        }
        if (typeof n2 === "string") {
          n2 = parse_default5(n2).num;
        }
        const m3 = this;
        const res = m3._mapNumbers((val) => {
          const obj = parse_default5(val);
          obj.num = n2;
          if (obj.num === null) {
            return val;
          }
          let fmt2 = val.has(ordinalMatch) ? Ord : Card;
          if (val.has(textValueMatch)) {
            fmt2 = val.has(ordinalMatch) ? textOrdinal2 : textCardinal;
          }
          const str = format_default(obj, fmt2);
          val = val.not("#Currency");
          val.replaceWith(str, { tags: true });
          return val;
        }, () => n2);
        return this.update(res.pointer);
      }
      add(n2) {
        if (!n2) {
          return this;
        }
        if (typeof n2 === "string") {
          n2 = parse_default5(n2).num;
        }
        const m3 = this;
        const res = m3._mapNumbers((val) => {
          const obj = parse_default5(val);
          if (obj.num === null) {
            return val;
          }
          obj.num = this._add(obj.num, n2);
          let fmt2 = val.has(ordinalMatch) ? Ord : Card;
          if (obj.isText) {
            fmt2 = val.has(ordinalMatch) ? textOrdinal2 : textCardinal;
          }
          const str = format_default(obj, fmt2);
          val.replaceWith(str, { tags: true });
          return val;
        }, (num) => this._add(num, n2));
        return this.update(res.pointer);
      }
      /** decrease each number by n*/
      subtract(n2, agree2) {
        return this.add(n2 * -1, agree2);
      }
      /** increase each number by 1 */
      increment(agree2) {
        return this.add(1, agree2);
      }
      /** decrease each number by 1 */
      decrement(agree2) {
        return this.add(-1, agree2);
      }
      // Subclasses may supply decimal arithmetic.
      _add(a, b2) {
        return a + b2;
      }
      // Let subclasses select the numeric portion of each phrase.
      _mapNumbers(fn) {
        return this.map(fn);
      }
      // overloaded - keep the current class
      update(pointer) {
        const m3 = new this.constructor(this.document, pointer);
        m3._cache = this._cache;
        m3.world = this.world;
        return m3;
      }
    }
    Numbers.prototype.toNice = Numbers.prototype.toLocaleString;
    Numbers.prototype.isBetween = Numbers.prototype.between;
    Numbers.prototype.minus = Numbers.prototype.subtract;
    Numbers.prototype.plus = Numbers.prototype.add;
    Numbers.prototype.equals = Numbers.prototype.isEqual;
    View2.prototype.numbers = select_default(Numbers, find_default3, true);
    View2.prototype.percentages = function(n2) {
      let m3 = find_default3(this);
      m3 = m3.filter((v2) => v2.has("#Percent") || v2.after("^per cent").found);
      m3 = m3.getNth(n2);
      return new Numbers(this.document, m3.pointer);
    };
    View2.prototype.values = View2.prototype.numbers;
    return Numbers;
  };
  var api_default16 = addMethod;

  // node_modules/compromise/src/3-three/numbers/money/currencies.js
  var currencies_default = [
    ["\xA2", "cent"],
    ["$", "dollar"],
    ["\u20AC", "EUR"],
    ["\xA3", "GBP"],
    ["\xA5", "JPY/YEN"],
    ["\u20B9", "INR"],
    ["\u20A9", "KRW"],
    ["\u20BD", "RUB"],
    ["\u20BA", "TRY"],
    ["\u0E3F", "THB"],
    ["\u20AA", "ILS"],
    ["\u20AB", "VND"],
    ["\u20B4", "UAH"],
    ["\u20A6", "NGN"],
    ["\u20B1", "PHP"],
    ["\u20B2", "PYG"],
    ["\u20A1", "CRC"],
    ["\uFDFC", "SAR"],
    ["\u20AE", "MNT"],
    ["\u20AD", "LAK"],
    ["\u20B8", "KZT"]
  ];

  // node_modules/compromise/src/3-three/numbers/money/_currency.js
  var minorUnits = {
    dollar: "cent",
    usd: "cent",
    cad: "cent",
    aud: "cent",
    nzd: "cent",
    hkd: "cent",
    sgd: "cent",
    euro: "cent",
    eur: "cent",
    pound: "penny",
    gbp: "penny"
  };
  var decimalName = (word, world2) => {
    const rates = world2.model.three.decimalCurrencies;
    const singular2 = { pennies: "penny", paise: "paisa" }[word] || word.replace(/s$/, "");
    if (Object.hasOwn(rates, word)) {
      return word;
    }
    return Object.hasOwn(rates, singular2) ? singular2 : "";
  };
  var qualifier = (value) => value.text().match(/(?:^|[^a-z])(cad|usd)(?=$|[^a-z])/i)?.[1].toUpperCase() || "";
  var unit = (value) => {
    const m3 = value.clone();
    let name = m3.match("#Currency").not("(cad|usd)").first().nouns().toSingular().text("normal");
    if (!name) {
      name = m3.match("(pound|pounds)").nouns().toSingular().text("normal");
    }
    if (!name) {
      name = decimalName(m3.not("(cad|usd)").docs[0]?.at(-1)?.normal || "", m3.world);
    }
    if (!name) {
      const str = m3.text();
      const found = currencies_default.find(([sym]) => str.includes(sym));
      if (found) {
        name = found[1];
      }
    }
    return name || qualifier(value);
  };
  var isMinor = (major, minor) => {
    const expected = minorUnits[unit(major).toLowerCase()];
    let minorUnit = unit(minor).toLowerCase();
    if (minorUnit === "pence") {
      minorUnit = "penny";
    }
    return Boolean(expected && expected === minorUnit);
  };
  var multiplier = (value) => {
    const name = unit(value).toLowerCase();
    const rate = value.world.model.three.decimalCurrencies[name];
    return Number.isFinite(rate) && rate > 0 ? rate : 1;
  };
  var currency = (value) => qualifier(value) || unit(value);

  // node_modules/compromise/src/3-three/numbers/money/_candidates.js
  var isQualifier = (word) => word === "cad" || word === "usd";
  var tagCents = (doc) => {
    if (doc.docs.some((terms) => terms.some((term) => term.text.includes("\xA2") || term.pre.includes("\xA2")))) {
      doc.terms().filter((term) => /^¢[0-9]/.test(term.text())).tag(["Money", "Value"]);
    }
  };
  var isCandidate = (value) => {
    const [sentence, start2, end2] = value.fullPointer[0];
    const terms = value.document[sentence];
    for (let i3 = Math.max(0, start2 - 2); i3 < Math.min(terms.length, end2 + 1); i3 += 1) {
      const term = terms[i3];
      if (term.tags.has("Money") || term.tags.has("Currency") || isQualifier(term.normal) || isQualifier(term.machine) || isQualifier(term.text) || term.alias?.some(isQualifier) || (term.pre + term.text + term.post).includes("\xA2") || decimalName(term.normal, value.world)) {
        return true;
      }
    }
    return false;
  };

  // node_modules/compromise/src/3-three/numbers/money/find.js
  var parts = (doc) => {
    tagCents(doc);
    return doc.numbers().map((value) => {
      if (!isCandidate(value)) {
        return value.none();
      }
      let number = value.not("^and").not("and$");
      if (number.text("reduced") === "minus") {
        return number.none();
      }
      number = number.growLeft("minus");
      if (!number.found) {
        return number;
      }
      let amount = number.growRight("(#Currency|cad|usd)+").growLeft("(cad|usd)");
      const [sentence, start2, end2] = number.fullPointer[0];
      const next = number.document[sentence][end2];
      const configured = next && decimalName(next.normal, number.world);
      if (configured) {
        amount = number.toView([[sentence, start2, end2 + 1]]).growRight("(#Currency|cad|usd)+").growLeft("(cad|usd)");
      }
      if (!configured && !number.has("#Money") && !amount.has("(#Currency|cad|usd)") && !number.text().includes("\xA2")) {
        return number.none();
      }
      return amount.growRight("(pound|pounds)").growRight("(cad|usd)");
    });
  };
  var find5 = (doc) => {
    const pointers = [];
    let previous = null;
    parts(doc).forEach((amount) => {
      const pointer = amount.fullPointer[0];
      const [sentence, start2, end2] = pointer;
      if (previous) {
        const [prevSentence2, , prevEnd] = previous.fullPointer[0];
        const gap = doc.document[sentence].slice(prevEnd, start2).map((t2) => t2.normal).join(" ");
        if (sentence === prevSentence2 && start2 >= prevEnd && (gap === "" || gap === "and") && isMinor(previous, amount)) {
          const prev = pointers.pop();
          pointers.push([sentence, prev[1], end2]);
          previous = null;
          return;
        }
      }
      pointers.push(pointer);
      previous = amount;
    });
    return doc.toView(pointers);
  };
  var numberOf = (amount) => {
    let number = amount.not("(#Currency|cad|usd)").not("(pound|pounds)$");
    const last = number.lastTerm();
    if (decimalName(last.text("normal"), amount.world)) {
      number = number.not(last);
    }
    return number;
  };
  var find_default4 = find5;

  // node_modules/compromise/src/3-three/numbers/money/_decimal.js
  var places2 = (value) => (String(value).split(".")[1] || "").length;
  var add = (a, b2) => {
    if (!Number.isFinite(a) || !Number.isFinite(b2)) {
      return a + b2;
    }
    const strings = [decimalText(a), decimalText(b2)];
    const precision = Math.max(...strings.map(places2));
    const integers = strings.map((str) => {
      const [whole, fraction = ""] = str.split(".");
      return BigInt(whole + fraction.padEnd(precision, "0"));
    });
    return Number(`${integers[0] + integers[1]}e-${precision}`);
  };
  var fixed = (num, precision) => {
    const [whole, fraction = ""] = decimalText(Math.abs(num)).split(".");
    const digits = fraction.padEnd(precision, "0");
    if (digits) {
      return whole + "." + digits;
    }
    return whole;
  };
  var scale = (num, rate, inverse = false) => {
    const exponent = Math.log10(rate);
    if (Number.isInteger(exponent)) {
      return shiftDecimal(num, inverse ? -exponent : exponent);
    }
    const [a, b2] = decimalFraction(num);
    const [c, d] = decimalFraction(rate);
    if (inverse) {
      return Number(a * d) / Number(b2 * c);
    }
    return Number(a * c) / Number(b2 * d);
  };

  // node_modules/compromise/src/3-three/numbers/money/parse.js
  var isNegative = (value) => /^(?:minus\b|[+\p{Currency_Symbol}\s]*-)/u.test(value.text("reduced"));
  var parse6 = (value) => {
    const amounts = parts(value);
    const first = amounts.eq(0);
    let num = parse_default5(numberOf(first)).num;
    const negative = isNegative(first);
    num = scale(Math.abs(num), multiplier(first));
    if (amounts.length === 2 && isMinor(first, amounts.eq(1))) {
      num = add(num, scale(parse_default5(numberOf(amounts.eq(1))).num, multiplier(amounts.eq(1))));
    }
    if (negative && num !== 0) {
      num *= -1;
    }
    return { currency: currency(value), num };
  };
  var parse_default6 = parse6;

  // node_modules/compromise/src/3-three/numbers/money/arithmetic.js
  var replace = (part, amount, negative = amount < 0) => {
    const number = numberOf(part);
    const obj = parse_default5(number);
    const [sentence, start2, end2] = part.fullPointer[0];
    const before3 = part.document[sentence].length;
    obj.num = Math.abs(amount);
    obj.prefix = obj.prefix.replace(/[-+]/g, "");
    let str;
    if (number.has("#TextValue")) {
      str = format_default(obj, "TextCardinal");
      if (negative) {
        str = "minus " + str;
      }
    } else {
      let text = number.text("reduced");
      if (number.text().includes("\xA2")) {
        text = text.replace(/c$/, "\xA2");
      }
      const original = text.match(/\d[\d,]*(?:\.\d+)?/);
      const precision = original ? places2(original[0]) : 0;
      if (original) {
        obj.prefix = text.slice(0, original.index).replace(/[-+]/g, "");
        obj.suffix = text.slice(original.index + original[0].length);
      }
      let digits = fixed(amount, precision);
      if (obj.hasComma) {
        const [whole, fraction] = digits.split(".");
        const groups2 = [];
        for (let offset2 = whole.length; offset2 > 0; offset2 -= 3) {
          groups2.unshift(whole.slice(Math.max(0, offset2 - 3), offset2));
        }
        digits = groups2.join(",");
        if (fraction !== void 0) {
          digits += "." + fraction;
        }
      }
      const code = number.text().match(/(cad|usd)\b/i)?.[0];
      if (code) {
        obj.suffix = obj.suffix.replace(/cad|usd/i, code);
      }
      str = obj.prefix + digits + obj.suffix;
      if (negative) {
        str = "-" + str;
      }
    }
    const first = number.docs[0][0];
    first.pre = first.pre.replace(/[-+]$/, "");
    number.replaceWith(str, { tags: true });
    const delta = part.document[sentence].length - before3;
    const updated = part.update([[sentence, start2, end2 + delta]]);
    const unit2 = updated.match("(dollar|dollars|euro|euros|pound|pounds|cent|cents|penny|pennies|pence)").nouns();
    if (unit2.has("pence")) {
      if (Math.abs(amount) === 1) {
        unit2.replaceWith("penny");
      }
    } else if (Math.abs(amount) === 1) {
      unit2.toSingular();
    } else {
      unit2.toPlural();
    }
  };
  var arithmetic = (value, operation) => {
    const amounts = parts(value);
    const num = operation(parse_default6(value).num);
    if (!Number.isFinite(num)) {
      return;
    }
    if (amounts.length === 1) {
      replace(amounts.eq(0), scale(num, multiplier(amounts.eq(0)), true));
    } else if (amounts.length === 2) {
      const major = Math.trunc(Math.abs(num));
      const minor = scale(add(Math.abs(num), -major), multiplier(amounts.eq(1)), true);
      replace(amounts.eq(1), minor);
      replace(amounts.eq(0), major, num < 0);
    }
  };
  var arithmetic_default = arithmetic;

  // node_modules/compromise/src/3-three/numbers/money/_lib.js
  var mapNumbers = (money, fn, operation) => money.map((value) => {
    const number = value.numbers();
    if (!operation && number.length !== 1) {
      return value;
    }
    const [sentence, start2, end2] = value.fullPointer[0];
    const before3 = value.document[sentence].length;
    if (operation) {
      arithmetic_default(value, operation);
    } else {
      fn(number);
    }
    const delta = value.document[sentence].length - before3;
    return value.update([[sentence, start2, end2 + delta]]);
  });
  var lib_default15 = mapNumbers;

  // node_modules/compromise/src/3-three/numbers/money/api.js
  var plugin5 = function(View2, Numbers) {
    class Money extends Numbers {
      constructor(document, pointer, groups2) {
        super(document, pointer, groups2);
        this.viewType = "Money";
      }
      _add(a, b2) {
        return add(a, b2);
      }
      _mapNumbers(fn, operation) {
        return lib_default15(this, fn, operation);
      }
      parse(n2) {
        return this.getNth(n2).map(parse_default6, []);
      }
      get(n2) {
        return this.parse(n2).map((p4) => p4.num);
      }
      json(n2) {
        const opts2 = typeof n2 === "object" ? n2 : {};
        return this.getNth(n2).map((p4) => {
          const json = p4.toView().json(opts2)[0];
          const parsed = parse_default6(p4);
          json.money = parsed;
          return json;
        }, []);
      }
      currency(n2) {
        return this.parse(n2).map((p4) => p4.currency);
      }
    }
    Object.assign(Money.prototype, {
      toOrdinal: void 0,
      toCardinal: void 0,
      toFraction: void 0,
      toPercentage: void 0,
      toDecimal: void 0
    });
    View2.prototype.money = select_default(Money, find_default4, true);
  };
  var api_default17 = plugin5;

  // node_modules/compromise/src/3-three/numbers/money/decimalCurrencies.js
  var decimalCurrencies = {
    cent: 0.01,
    penny: 0.01,
    pence: 0.01,
    centavo: 0.01,
    centime: 0.01,
    paisa: 0.01,
    ore: 0.01,
    \u00F6re: 0.01
  };
  var decimalCurrencies_default = decimalCurrencies;

  // node_modules/compromise/src/3-three/numbers/plugin.js
  var api14 = function(View2) {
    api_default15(View2);
    const Numbers = api_default16(View2);
    api_default17(View2, Numbers);
  };
  var plugin_default26 = {
    model: { three: { decimalCurrencies: decimalCurrencies_default } },
    api: api14
  };

  // node_modules/compromise/src/3-three/redact/redact.js
  var defaults3 = {
    people: true,
    places: true,
    organizations: true,
    acronyms: true,
    money: true,
    percentages: true,
    fractions: true,
    emails: true,
    phoneNumbers: true,
    atMentions: true,
    urls: true,
    // off by default
    properNouns: false,
    dates: false,
    numbers: false,
    pronouns: false
  };
  var hideTags = {
    people: ["MaleName", "FemaleName", "FirstName", "LastName"],
    places: ["City", "State", "Country", "Region"],
    organizations: ["SportsTeam", "Company", "School"]
  };
  hideTags.pronouns = [...hideTags.people, ...hideTags.places, ...hideTags.organizations];
  var redactMatch = function(m3, blockStr, keep10 = true) {
    m3 = m3.notIf("#Redacted");
    m3.replaceWith(blockStr, keep10);
    m3.tag("Redacted");
    return m3;
  };
  var redact = function(opts2 = {}, blockStr = "\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588", keep10 = true) {
    opts2 = { ...defaults3, ...opts2 };
    if (opts2.people !== false) {
      redactMatch(this.people(), blockStr, keep10).unTag(hideTags.people);
    }
    if (opts2.places !== false) {
      redactMatch(this.places(), blockStr, keep10).unTag(hideTags.places);
    }
    if (opts2.organizations !== false) {
      redactMatch(this.organizations(), blockStr, keep10).unTag(hideTags.organizations);
    }
    if (opts2.emails !== false) {
      redactMatch(this.emails(), blockStr, keep10);
    }
    if (opts2.money !== false) {
      redactMatch(this.money(), blockStr, keep10);
    }
    if (opts2.percentages !== false) {
      redactMatch(this.percentages(), blockStr, keep10);
    }
    if (opts2.fractions !== false) {
      redactMatch(this.fractions(), blockStr, keep10);
    }
    if (opts2.phoneNumbers !== false) {
      redactMatch(this.phoneNumbers(), blockStr, keep10);
    }
    if (opts2.atMentions !== false) {
      redactMatch(this.atMentions(), blockStr, keep10);
    }
    if (opts2.acronyms !== false) {
      redactMatch(this.acronyms(), blockStr, keep10);
    }
    if (opts2.urls !== false) {
      redactMatch(this.urls(), blockStr, keep10);
    }
    if (opts2.properNouns !== false) {
      redactMatch(this.properNouns(), blockStr, keep10);
    }
    if (opts2.dates !== false) {
      redactMatch(this.dates(), blockStr, keep10);
    }
    if (opts2.numbers !== false) {
      redactMatch(this.numbers(), blockStr, keep10);
    }
    if (opts2.pronouns !== false) {
      redactMatch(this.pronouns(), blockStr, keep10).unTag(hideTags.pronouns);
    }
    return this;
  };
  var redact_default = redact;

  // node_modules/compromise/src/3-three/redact/plugin.js
  var plugin6 = {
    model: {
      one: {
        tagSet: {
          Redacted: true
        }
      }
    },
    api: function(View2) {
      View2.prototype.redact = redact_default;
    }
  };
  var plugin_default27 = plugin6;

  // node_modules/compromise/src/3-three/sentences/questions.js
  var isQuestion = function(doc, terms) {
    if (/\.\.$/.test(doc.out("text"))) {
      return false;
    }
    const startsQuestion = terms[0].tags.has("QuestionWord");
    if (startsQuestion && terms.some((term) => term.post.includes(","))) {
      return false;
    }
    if (doc.has("or not$")) {
      return true;
    }
    if (startsQuestion) {
      return true;
    }
    if (doc.has("^(do|does|did|is|was|can|could|will|would|may) #Noun")) {
      return true;
    }
    if (doc.has("^(have|must) you")) {
      return true;
    }
    if (doc.has("(do|does|is|was)") && doc.clauses().has("(do|does|is|was) #Noun+ #Adverb? (#Adjective|#Infinitive)$")) {
      return true;
    }
    return false;
  };
  var findQuestions = function(view) {
    const hasQ = /[?\uFF1F]/;
    const { document } = view;
    return view.filter((m3) => {
      const terms = m3.docs[0] || [];
      const lastTerm = terms[terms.length - 1];
      if (!lastTerm || document[lastTerm.index[0]].length !== terms.length) {
        return false;
      }
      if (hasQ.test(lastTerm.post)) {
        return true;
      }
      return isQuestion(m3, terms);
    });
  };
  var questions_default = findQuestions;

  // node_modules/compromise/src/3-three/sentences/parse/mainClause.js
  var subordinate = `(after|although|as|because|before|if|since|than|that|though|when|whenever|where|whereas|wherever|whether|while|why|unless|until|once) !(#Value|upon|then|now)`;
  var relative = `(that|which|whichever|who|whoever|whom|whose|whomever)`;
  var dropIntroducedBy = function(m3, pattern) {
    const reg = m3.world.methods.one.parseMatch(pattern, {}, m3.world);
    return m3.filter((c) => {
      const found = c.matchOne(reg);
      if (!found.found) {
        return true;
      }
      const verb = c.matchOne("#Verb");
      return verb.found && verb.fullPointer[0][1] <= found.fullPointer[0][1];
    });
  };
  var mainClause = function(s2) {
    let m3 = s2;
    if (m3.length === 1) {
      return m3;
    }
    m3 = m3.if("#Verb");
    if (m3.length === 1) {
      return m3;
    }
    m3 = dropIntroducedBy(m3, subordinate);
    m3 = m3.ifNo("^even (if|though)");
    m3 = m3.ifNo("^so that");
    m3 = m3.ifNo("^rather than");
    m3 = m3.ifNo("^provided that");
    m3 = m3.ifNo("^in case");
    if (m3.length === 1) {
      return m3;
    }
    m3 = dropIntroducedBy(m3, relative);
    if (m3.length === 1) {
      return m3;
    }
    m3 = m3.ifNo("(^despite|^during|^before|^through|^throughout)");
    if (m3.length === 1) {
      return m3;
    }
    m3 = m3.ifNo("^#Gerund");
    if (m3.length === 1) {
      return m3;
    }
    m3 = m3.ifNo("^to #Infinitive");
    m3 = m3.ifNo("^#Condition");
    if (m3.length === 1) {
      return m3;
    }
    if (m3.length === 0) {
      m3 = s2;
    }
    return m3.eq(0);
  };
  var mainClause_default = mainClause;

  // node_modules/compromise/src/3-three/sentences/parse/index.js
  var grammar = function(vb3) {
    let tense = null;
    if (vb3.has("#PastTense")) {
      tense = "PastTense";
    } else if (vb3.has("#FutureTense")) {
      tense = "FutureTense";
    } else if (vb3.has("#PresentTense")) {
      tense = "PresentTense";
    }
    return {
      tense
    };
  };
  var parse7 = function(s2) {
    const clauses2 = s2.clauses();
    const main = mainClause_default(clauses2);
    let chunks2 = main.chunks();
    let subj = s2.none();
    let verb = s2.none();
    let pred = s2.none();
    const relativeSubject = chunks2.length > 2 && !chunks2.eq(0).has("<Verb>") && chunks2.eq(1).has("^(who|whom|whose|which|that)$");
    if (relativeSubject) {
      chunks2 = chunks2.splitAfter("[(#PresentTense && !#Auxiliary && !#Copula && !#Infinitive)] #Verb", 0);
    }
    const relative2 = relativeSubject && chunks2.filter((ch) => ch.has("<Verb>")).length > 1;
    let isSkipped = false;
    chunks2.forEach((ch, i3) => {
      if (i3 === 0 && !ch.has("<Verb>")) {
        subj = ch;
        return;
      }
      if (!verb.found && ch.has("<Verb>")) {
        if (relative2 && !isSkipped) {
          isSkipped = true;
          return;
        }
        verb = ch;
        return;
      }
      if (verb.found) {
        pred = pred.concat(ch);
      }
    });
    if (verb.found && !subj.found) {
      subj = verb.before("<Noun>+").first();
    }
    return {
      subj,
      verb,
      pred,
      grammar: grammar(verb)
    };
  };
  var parse_default7 = parse7;

  // node_modules/compromise/src/3-three/verbs/api/parse/root.js
  var getMain = function(vb3) {
    let root = vb3;
    if (vb3.wordCount() > 1) {
      root = vb3.not("(#Negative|#Auxiliary|#Modal|#Adverb|#Prefix)");
    }
    if (root.length > 1 && !root.has("#Phrasal #Particle")) {
      root = root.last();
    }
    root = root.not("(want|wants|wanted) to");
    if (!root.found) {
      root = vb3.not("#Negative");
      return root;
    }
    return root;
  };
  var root_default2 = getMain;

  // node_modules/compromise/src/3-three/verbs/api/parse/adverbs.js
  var getAdverbs = function(vb3, root) {
    const res = {
      pre: vb3.none(),
      post: vb3.none()
    };
    if (!vb3.has("#Adverb")) {
      return res;
    }
    const parts2 = vb3.splitOn(root);
    if (parts2.length === 3) {
      return {
        pre: parts2.eq(0).adverbs(),
        post: parts2.eq(2).adverbs()
      };
    }
    if (parts2.eq(0).isDoc(root)) {
      res.post = parts2.eq(1).adverbs();
      return res;
    }
    res.pre = parts2.eq(0).adverbs();
    return res;
  };
  var adverbs_default = getAdverbs;

  // node_modules/compromise/src/3-three/verbs/api/parse/index.js
  var getAuxiliary = function(vb3, root) {
    const parts2 = vb3.splitBefore(root);
    if (parts2.length <= 1) {
      return vb3.none();
    }
    let aux = parts2.eq(0);
    aux = aux.not("(#Adverb|#Negative|#Prefix)");
    return aux;
  };
  var getNegative = function(vb3) {
    return vb3.match("#Negative");
  };
  var getPhrasal = function(root) {
    if (!root.has("(#Particle|#PhrasalVerb)")) {
      return {
        verb: root.none(),
        particle: root.none()
      };
    }
    const particle = root.match("#Particle$");
    return {
      verb: root.not(particle),
      particle
    };
  };
  var parseVerb = function(view) {
    const vb3 = view.clone();
    vb3.contractions().expand();
    const root = root_default2(vb3);
    const res = {
      root,
      prefix: vb3.match("#Prefix"),
      adverbs: adverbs_default(vb3, root),
      auxiliary: getAuxiliary(vb3, root),
      negative: getNegative(vb3),
      phrasal: getPhrasal(root)
    };
    return res;
  };
  var parse_default8 = parseVerb;

  // node_modules/compromise/src/3-three/verbs/api/parse/grammar/forms.js
  var present = { tense: "PresentTense" };
  var conditional = { conditional: true };
  var future = { tense: "FutureTense" };
  var prog = { progressive: true };
  var past2 = { tense: "PastTense" };
  var complete = { complete: true, progressive: false };
  var passive = { passive: true };
  var plural = { plural: true };
  var singular = { plural: false };
  var getData = function(tags) {
    const data = {};
    tags.forEach((o) => {
      Object.assign(data, o);
    });
    return data;
  };
  var verbForms = {
    // === Simple ===
    "imperative": [
      // walk!
      ["#Imp", []]
    ],
    "want-infinitive": [
      ["^(want|wants|wanted) to #Inf$", [present]],
      ["^wanted to #Inf$", [past2]],
      ["^will want to #Inf$", [future]]
    ],
    "gerund-phrase": [
      // started looking
      ["^#Past #Ger$", [past2]],
      // starts looking
      ["^#Pres #Ger$", [present]],
      // start looking
      ["^#Inf #Ger$", [present]],
      // will start looking
      ["^will #Inf #Ger$", [future]],
      // have started looking
      ["^have #Past #Ger$", [past2]],
      // will have started looking
      ["^will have #Past #Ger$", [past2]]
    ],
    "simple-present": [
      // he walks',
      ["^#Pres$", [present]],
      // we walk
      ["^#Inf$", [present]]
    ],
    "simple-past": [
      // he walked',
      ["^#Past$", [past2]]
    ],
    "simple-future": [
      // he will walk
      ["^will #Adv? #Inf", [future]]
    ],
    // === Progressive ===
    "present-progressive": [
      // he is walking
      ["^(is|are|am) #Ger$", [present, prog]]
    ],
    "past-progressive": [
      // he was walking
      ["^(was|were) #Ger$", [past2, prog]]
    ],
    "future-progressive": [
      // he will be
      ["^will be #Ger$", [future, prog]]
    ],
    // === Perfect ===
    "present-perfect": [
      // he has walked
      ["^(has|have) #Past$", [past2, complete]]
      //past?
    ],
    "past-perfect": [
      // he had walked
      ["^had #Past$", [past2, complete]],
      // had been to see
      ["^had #Past to #Inf", [past2, complete]]
    ],
    "future-perfect": [
      // he will have
      ["^will have #Past$", [future, complete]]
    ],
    // === Progressive-perfect ===
    "present-perfect-progressive": [
      ["^(has|have) been going to be #Ger$", [past2, prog]],
      // he has been walking
      ["^(has|have) been #Ger$", [past2, prog]]
      //present?
    ],
    "past-perfect-progressive": [
      // he had been
      ["^had been #Ger$", [past2, prog]]
    ],
    "future-perfect-progressive": [
      // will have been
      ["^will have been #Ger$", [future, prog]]
    ],
    // ==== Passive ===
    "passive-past": [
      ["^(was|were) being? (#Past|#VBN)$", [past2, passive]],
      ["^had been being? (#Past|#VBN)$", [past2, passive]],
      // got walked, was walked, were walked
      ["(got|were|was) #Pass", [past2, passive]],
      // was being walked
      ["^(was|were) being #Pass", [past2, passive]],
      // had been walked
      ["^had been #Pass", [past2, passive]]
    ],
    "passive-present": [
      ["^(is|are|am) being? (#Past|#VBN)$", [present, passive]],
      ["^(has|have) been being? (#Past|#VBN)$", [present, passive]],
      // is walked, are stolen
      ["^(is|are|am) #Pass", [present, passive]],
      // is being walked
      ["^(is|are|am) being #Pass", [present, passive]],
      // has/have been cleaned
      ["^(has|have) been #Pass", [present, passive]]
    ],
    "passive-future": [
      ["^will have been being? (#Past|#VBN)$", [future, passive, conditional]],
      ["^will be being? (#Past|#VBN)$", [future, passive, conditional]],
      // will have been walked
      ["will have been #Pass", [future, passive, conditional]],
      // will be cleaned
      ["will be being? #Pass", [future, passive, conditional]]
    ],
    // === Conditional ===
    "present-conditional": [
      // would be walked
      ["^#Mod be #Past$", [present, conditional, passive]]
    ],
    "past-conditional": [
      // would have been walked
      ["^#Mod have been #Past$", [past2, conditional, passive]]
    ],
    // ==== Auxiliary ===
    "auxiliary-future": [
      ["^(is|are|am|was|were) going to be #Ger$", [future, prog]],
      // going to drink
      ["(is|are|am|was|were) going to (#Inf|#Pres)", [future]]
    ],
    "auxiliary-past": [
      // he did walk
      ["^did #Inf$", [past2, singular]],
      // used to walk
      ["^used to #Inf$", [past2, complete]]
    ],
    "auxiliary-present": [
      // we do walk
      ["^(does|do) #Inf$", [present, complete, plural]]
    ],
    // === modals ===
    "modal-perfect-progressive": [
      ["^#Mod have been #Ger$", [past2, prog]]
    ],
    "modal-past": [
      // he could have walked
      ["^#Mod have #Past$", [past2]]
    ],
    "modal-infinitive": [
      // he can walk
      ["^#Mod #Inf$", []]
    ],
    "infinitive": [
      // walk
      ["^#Inf$", []]
    ]
  };
  var list3 = [];
  Object.keys(verbForms).map((k2) => {
    verbForms[k2].forEach((a) => {
      list3.push({
        name: k2,
        match: lib_default10(a[0]),
        data: getData(a[1])
      });
    });
  });
  var forms_default = list3;

  // node_modules/compromise/src/3-three/verbs/api/parse/grammar/index.js
  var cleanUp2 = function(vb3, res) {
    vb3 = vb3.clone();
    if (res.adverbs.post && res.adverbs.post.found) {
      vb3.remove(res.adverbs.post);
    }
    if (res.adverbs.pre && res.adverbs.pre.found) {
      vb3.remove(res.adverbs.pre);
    }
    if (vb3.has("#Negative")) {
      vb3 = vb3.remove("#Negative");
    }
    if (vb3.has("#Prefix")) {
      vb3 = vb3.remove("#Prefix");
    }
    if (res.root.has("#PhrasalVerb #Particle")) {
      vb3.remove("#Particle$");
    }
    vb3 = vb3.not("#Adverb");
    return vb3;
  };
  var isInfinitive = function(vb3) {
    return vb3.growLeft("to (#Adverb|#Negative)+?").has("^to (#Adverb|#Negative)+? #Verb");
  };
  var getGrammar = function(vb3, res) {
    const grammar2 = {};
    const infinitive2 = isInfinitive(vb3);
    vb3 = cleanUp2(vb3, res);
    for (let i3 = 0; i3 < forms_default.length; i3 += 1) {
      const todo = forms_default[i3];
      if (vb3.has(todo.match) === true) {
        grammar2.form = todo.name;
        Object.assign(grammar2, todo.data);
        break;
      }
    }
    if (!grammar2.form) {
      if (vb3.has("^#Verb$")) {
        grammar2.form = "infinitive";
      }
    }
    if (!grammar2.tense) {
      grammar2.tense = res.root.has("#PastTense") ? "PastTense" : "PresentTense";
    }
    grammar2.copula = res.root.has("#Copula");
    grammar2.isInfinitive = infinitive2;
    return grammar2;
  };
  var grammar_default = getGrammar;

  // node_modules/compromise/src/3-three/verbs/api/parse/auxiliary.js
  var readAuxiliary = function(parsed, form) {
    const words = parsed.auxiliary.terms().map((term) => term.text("normal"), []);
    const text = words.join(" ");
    const modal = /^(can|could|may|might|must|shall|should|would)( (be|have|been|being))*$/.test(text) || /^ought to( (be|have|been|being))*$/.test(text);
    const prospective = /^(is|are|am|was|were) going to (be|have)( (been|being))*$/.test(text);
    if (modal || prospective) {
      let prefixLength = words[0] === "ought" ? 2 : 1;
      if (prospective) prefixLength = 3;
      const tail2 = words.slice(prefixLength);
      return {
        words,
        finite: words[0],
        modal,
        prospective,
        prefixLength,
        perfect: tail2.includes("have"),
        progressive: parsed.root.has("#Gerund") || tail2.includes("being"),
        passive: tail2.length > 0 && !parsed.root.has("#Gerund") && tail2.some((w) => /^(be|been|being)$/.test(w)),
        form
      };
    }
    const passive2 = /^passive-/.test(form);
    const perfectForm = /^(present|past|future)-perfect/.test(form);
    const progressiveForm = /^(present|past|future)-progressive$/.test(form);
    if (!passive2 && !perfectForm && !progressiveForm) {
      return null;
    }
    if (words.length === 0) {
      return null;
    }
    return {
      words,
      finite: words[0],
      passive: passive2,
      perfect: words.some((word) => /^(has|have|had)$/.test(word)),
      progressive: passive2 ? words.includes("being") : /progressive$/.test(form),
      form
    };
  };
  var auxiliary_default = readAuxiliary;

  // node_modules/compromise/src/3-three/verbs/api/conjugate/groups.js
  var groups = function(verbs, finite = false) {
    const entries = verbs.map((vb3) => {
      const parsed = parse_default8(vb3);
      return { vb: vb3, parsed, root: vb3.match(parsed.root).harden() };
    }, []);
    entries.forEach((entry, i3) => {
      const previous = entries[i3 - 1];
      if (!previous || entry.parsed.auxiliary.found) return;
      const head = previous.head || previous;
      if (!finite && !head.parsed.auxiliary.found) {
        return;
      }
      const info = grammar_default(head.vb, head.parsed);
      const bare = finite && !head.parsed.auxiliary.found && !info.copula && /^(simple-present|simple-past)$/.test(info.form);
      const doSupport = finite && head.parsed.auxiliary.has("^(do|does|did)$");
      if (!head.parsed.auxiliary.found && !bare) return;
      if (info.isInfinitive) return;
      const chain = auxiliary_default(head.parsed, info.form);
      if (!chain && info.form !== "simple-future" && !bare && !doSupport || chain && chain.prospective) return;
      head.chain = chain;
      head.form = info.form;
      const root = entry.parsed.root;
      const headRoot = head.parsed.root;
      let compatible = headRoot.has("#Infinitive") && root.has("#Infinitive");
      if (bare && headRoot.has("#PresentTense")) {
        compatible = root.has("#PresentTense");
      }
      if (headRoot.has("(#PastTense|#Participle)")) compatible = root.has("(#PastTense|#Participle)");
      if (headRoot.has("#Gerund")) compatible = root.has("#Gerund");
      if (!compatible || previous.vb.has("@hasComma$")) return;
      const next = previous.vb.growRight("(and|or) #Adverb+? #Verb+ #Particle?");
      if (next.match(entry.vb).wordCount() !== entry.vb.wordCount()) return;
      entry.head = head;
    });
    return entries;
  };
  var firstGroup = function(verbs) {
    if (verbs.length < 2) return verbs;
    const entries = groups(verbs);
    let count = 1;
    while (entries[count] && entries[count].head === entries[0]) count += 1;
    return verbs.slice(0, count);
  };
  var groups_default = groups;

  // node_modules/compromise/src/3-three/verbs/api/parse/getSubject.js
  var shouldSkip = function(last) {
    if (last.length <= 1) {
      return false;
    }
    const obj = last.parse()[0] || {};
    return obj.isSubordinate;
  };
  var noSubClause = function(before3) {
    let parts2 = before3.clauses();
    parts2 = parts2.filter((m3, i3) => {
      if (m3.has("^(if|unless|while|but|for|per|at|by|that|which|who|from)")) {
        return false;
      }
      if (i3 > 0 && m3.has("^#Verb . #Noun+$")) {
        return false;
      }
      if (i3 > 0 && m3.has("^#Adverb")) {
        return false;
      }
      return true;
    });
    if (parts2.length === 0) {
      return before3;
    }
    return parts2;
  };
  var lastNoun2 = function(vb3) {
    let before3 = vb3.before();
    before3 = noSubClause(before3);
    if (!before3.has("(#Verb|@hasComma)") && before3.has("#Noun (on|near|under|beside|behind)")) {
      const head = before3.splitBefore("(on|near|under|beside|behind)").first().nouns();
      if (head.found) return head;
    }
    const nouns = before3.nouns();
    let last = nouns.last();
    const pronoun = last.match("(i|he|she|we|you|they)");
    if (pronoun.found) {
      return pronoun.nouns();
    }
    let det = nouns.if("^(that|this|those)");
    if (det.found) {
      return det;
    }
    if (nouns.found === false) {
      det = before3.match("^(that|this|those)");
      if (det.found) {
        return det;
      }
    }
    last = nouns.last();
    if (shouldSkip(last)) {
      nouns.remove(last);
      last = nouns.last();
    }
    if (shouldSkip(last)) {
      nouns.remove(last);
      last = nouns.last();
    }
    return last;
  };
  var isPlural3 = function(subj, vb3) {
    if (vb3.has("(are|were)")) {
      return true;
    }
    if (subj.has("(those|they|we)")) {
      return true;
    }
    if (subj.has("(#Singular|#Plural) of")) {
      const head = subj.splitBefore("of").first().nouns();
      if (head.found) return head.isPlural().found;
    }
    if (subj.found && subj.isPlural) {
      return subj.isPlural().found;
    }
    return false;
  };
  var getSubject = function(vb3) {
    const subj = lastNoun2(vb3);
    return {
      subject: subj,
      plural: isPlural3(subj, vb3)
    };
  };
  var getSubject_default = getSubject;

  // node_modules/compromise/src/3-three/verbs/api/lib.js
  var noop = (vb3) => vb3;
  var isPlural4 = (vb3, parsed) => {
    const subj = getSubject_default(vb3, parsed);
    const m3 = subj.subject;
    if (m3.has("(i|we|you)")) {
      return true;
    }
    return subj.plural;
  };
  var wasWere = (vb3, parsed) => {
    const { subject: subject3, plural: plural2 } = getSubject_default(vb3, parsed);
    if (plural2 || subject3.has("(we|you)")) {
      return "were";
    }
    return "was";
  };
  var isAreAm = function(vb3, parsed) {
    if (vb3.has("were")) {
      return "are";
    }
    const { subject: subject3, plural: plural2 } = getSubject_default(vb3, parsed);
    if (subject3.has("i")) {
      return "am";
    }
    if (subject3.has("(we|you)") || plural2) {
      return "are";
    }
    return "is";
  };
  var doDoes = function(vb3, parsed) {
    const subj = getSubject_default(vb3, parsed);
    const m3 = subj.subject;
    if (m3.has("(i|we|you)")) {
      return "do";
    }
    if (subj.plural) {
      return "do";
    }
    return "does";
  };
  var haveHas = function(vb3, parsed) {
    const subj = getSubject_default(vb3, parsed);
    const m3 = subj.subject;
    if (m3.has("(i|we|you)")) {
      return "have";
    }
    if (subj.plural === false) {
      return "has";
    }
    if (m3.has("he") || m3.has("she") || m3.has("#Person")) {
      return "has";
    }
    return "have";
  };
  var getTense2 = function(m3) {
    if (m3.has("#Infinitive")) {
      return "Infinitive";
    }
    if (m3.has("#Participle")) {
      return "Participle";
    }
    if (m3.has("#PastTense")) {
      return "PastTense";
    }
    if (m3.has("#Gerund")) {
      return "Gerund";
    }
    if (m3.has("#PresentTense")) {
      return "PresentTense";
    }
    return void 0;
  };
  var toInf = function(vb3, parsed) {
    const { toInfinitive: toInfinitive3 } = vb3.methods.two.transform.verb;
    let str = parsed.root.text({ keepPunct: false });
    str = toInfinitive3(str, vb3.model, getTense2(vb3));
    if (str) {
      vb3.replace(parsed.root, str);
    }
    return vb3;
  };
  var noWill = (vb3) => {
    if (vb3.has("will not")) {
      return vb3.replace("will not", "have not");
    }
    return vb3.remove("will");
  };

  // node_modules/compromise/src/3-three/verbs/api/conjugate/question.js
  var methods18 = {
    past: "toPastTense",
    present: "toPresentTense",
    future: "toFutureTense",
    participle: "toPastParticiple",
    gerund: "toGerund",
    infinitive: "toInfinitive"
  };
  var auxiliary = /^(do|does|did|have|has|had|is|are|am|was|were|will|would|can|could|shall|should|may|might|must)$/;
  var parseQuestion = function(sentence) {
    const wh = /^(?:(?:in|on|at|to|for|from|with|about|by)\s+)?(?:why|when|where|how|what|who|whom|which|whose)\b/i.test(sentence.text());
    if (!wh && !/^(?:do|does|did|have|has|had|is|are|am|was|were|will|would|can|could|shall|should|may|might|must|won|shan)(?:n['’]t)?\b/i.test(sentence.text())) return null;
    const expanded = sentence.clone();
    expanded.contractions().expand();
    const terms = expanded.terms();
    const words = terms.map((t2) => t2.text("normal"), []);
    const finite = wh ? words.findIndex((word, i3) => i3 > 0 && auxiliary.test(word)) : 0;
    if (finite < 0) return null;
    if (!auxiliary.test(words[finite]) || words[finite] === "will" && terms.eq(finite).has("#Person")) return null;
    const copula = /^(is|are|am|was|were)$/.test(words[finite]);
    let start2 = finite + 1;
    const frontNegative = words[start2] === "not";
    if (frontNegative) start2 += 1;
    let end2 = start2;
    if (terms.eq(end2).has("#Pronoun")) {
      end2 += 1;
    } else {
      if (terms.eq(end2).has("#Preposition")) return null;
      let noun3 = false;
      for (; end2 < words.length; end2 += 1) {
        if (!terms.eq(end2).has("(#Determiner|#Adjective|#Noun|#Preposition|#Conjunction)") || terms.eq(end2).has("#Verb")) break;
        if (noun3 && copula && (terms.eq(end2).has("#Adjective") || /ing$/.test(words[end2]))) break;
        noun3 ||= terms.eq(end2).has("#Noun");
      }
      if (!noun3) return null;
    }
    if (end2 === start2 || end2 >= words.length && !copula) return null;
    if (!terms.eq(end2).has("(#Verb|#Adverb|#Negative)") && !copula) return null;
    return { terms, words, finite, start: start2, end: end2, frontNegative };
  };
  var isInverted = (sentence) => Boolean(parseQuestion(sentence));
  var questionSelection = function(sentence) {
    const q = parseQuestion(sentence);
    if (!q) return null;
    const offset2 = sentence.fullPointer[0][1];
    const at = offset2 + q.end;
    let predicate3 = sentence.verbs().filter((vb3) => vb3.fullPointer.some((ptr) => ptr[1] <= at && ptr[2] > at));
    for (let i3 = 0; i3 < q.words.length && predicate3.found; i3 += 1) {
      const chain = predicate3.growRight("(#Adverb|#Negative)+? #Verb+ #Particle?");
      const next = chain.growRight("(and|or) #Adverb+? #Verb+ #Particle?");
      if (next.wordCount() === predicate3.wordCount()) break;
      predicate3 = next;
    }
    return sentence.terms().slice(q.finite, q.start).concat(predicate3.not("#Conjunction")).settle();
  };
  var question = function(sentence, target) {
    const q = parseQuestion(sentence);
    if (!q) return null;
    const { terms, words, finite, start: start2, end: end2, frontNegative } = q;
    const subject3 = terms.slice(start2, end2).text();
    const prefix5 = finite > 0 ? terms.slice(0, finite).text() : "";
    const tail2 = terms.slice(end2).text();
    const negative = frontNegative ? " not" : "";
    const source = subject3 + " " + words[finite] + negative + " " + tail2;
    let work = sentence.fromText(source).compute(["tagger", "chunks"]);
    firstGroup(work.verbs())[methods18[target]]();
    if (work.text("normal") === sentence.fromText(source).text("normal")) return sentence;
    work = sentence.fromText(work.text()).compute(["tagger", "chunks"]);
    const subjectLength = end2 - start2;
    let rest = work.terms().slice(subjectLength);
    let head = rest.eq(0).text("normal");
    if (!auxiliary.test(head)) {
      head = target === "past" ? "did" : doDoes(work.verbs(0));
      firstGroup(work.verbs()).toInfinitive();
      rest = work.terms().slice(subjectLength);
    } else {
      rest = rest.slice(1);
    }
    const contracted = sentence.has("@hasContraction") && frontNegative;
    const not = rest.match("not").eq(0);
    if (contracted && not.found) {
      if (head !== "am") {
        const special = { will: "won't", can: "can't", shall: "shan't" };
        head = special[head] || head + "n't";
        if (sentence.text().includes("\u2019")) head = head.replace("'", "\u2019");
        rest = rest.not(not);
      }
    }
    if (!prefix5 && /^[A-Z]/.test(sentence.text())) head = head[0].toUpperCase() + head.slice(1);
    const result = [prefix5, head, subject3, rest.text()].filter(Boolean).join(" ");
    const changed = sentence.replaceWith(result).fullSentence().compute(["contractions", "tagger", "contractionTwo", "chunks"]);
    for (let i3 = 0; i3 < finite; i3 += 1) {
      const term = changed.terms().eq(i3);
      term.unTag([...term.termList()[0].tags]);
      term.tag([...terms.eq(i3).termList()[0].tags]);
    }
    changed.terms().eq(finite).tag("Auxiliary");
    return changed.compute("chunks");
  };
  var question_default = question;

  // node_modules/compromise/src/3-three/verbs/api/conjugate/inflect.js
  var infinitive = (root, format2 = "normal") => {
    return root.methods.two.transform.verb.toInfinitive(root.text(format2), root.model, getTense2(root));
  };
  var inflect = (root, tense, format2) => {
    const word = infinitive(root, format2);
    if (tense === "Infinitive") return word;
    const forms6 = root.methods.two.transform.verb.conjugate(word, root.model);
    return forms6[tense] || (tense === "Participle" ? forms6.PastTense : void 0);
  };

  // node_modules/compromise/src/3-three/verbs/api/conjugate/coordinate.js
  var resultTense = function(head, target) {
    const { chain, parsed, form } = head;
    if (target === "infinitive") return Inf;
    if (target === "gerund") return chain && chain.passive ? Participle : Ger;
    if (parsed.root.has("#Gerund")) return Ger;
    if (target === "participle") return Participle;
    if (chain && chain.passive) return Participle;
    if (chain && chain.perfect) {
      return target === "present" && form === "modal-past" ? Inf : Participle;
    }
    if (chain && chain.modal) {
      return target === "past" && form === "modal-infinitive" && chain.finite !== "can" ? Participle : Inf;
    }
    if (target === "future") return Inf;
    if (target === "past") return Past;
    return isAreAm(head.vb, parsed) === "is" ? Pres : Inf;
  };
  var coordinateNormal = function(verbs, target, convert3) {
    if (verbs.length < 2) return verbs.map(convert3);
    const entries = groups_default(verbs);
    entries.forEach((entry) => {
      if (entry.head) entry.tense = resultTense(entry.head, target);
    });
    return verbs.map((vb3, i3) => {
      const entry = entries[i3];
      if (!entry.head) {
        return convert3(vb3);
      }
      const root = entry.parsed.root;
      const word = inflect(root, entry.tense);
      if (word && word !== root.text("normal")) {
        entry.root.replaceWith(word);
        vb3.fullSentence().compute(["tagger", "chunks"]);
      }
      return vb3;
    });
  };
  var coordinate = function(verbs, target, convert3) {
    const sentences = verbs.fullSentence().settle();
    if (!sentences.some((s2) => isInverted(s2))) return coordinateNormal(verbs, target, convert3);
    return sentences.map((sentence) => {
      const index3 = sentence.fullPointer[0][0];
      const selected = verbs.filter((vb3) => vb3.fullPointer[0][0] === index3);
      const required = questionSelection(sentence);
      if (!required) return coordinateNormal(selected, target, convert3);
      const outside = selected.not(required);
      const inside = selected.not(outside).harden();
      const others = coordinateNormal(outside, target, convert3);
      if (!inside.found) return others;
      if (required.terms().not(inside.terms()).not("#Negative").found) return inside.concat(others).settle();
      const end2 = sentence.fullPointer[0][2];
      const trailing = others.fullPointer.map((ptr) => [ptr[0], end2 - ptr[1], end2 - ptr[2]]);
      const result = question_default(sentence, target);
      const newEnd = result.fullPointer[0][2];
      const remaining = result.update(trailing.map((ptr) => [ptr[0], newEnd - ptr[1], newEnd - ptr[2]]));
      return questionSelection(result).concat(remaining).settle();
    });
  };
  var coordinate_default = coordinate;

  // node_modules/compromise/src/3-three/sentences/conjugate/toPast.js
  var toPast2 = function(s2) {
    const inverted = question_default(s2, "past");
    if (inverted) return inverted;
    let verbs = s2.verbs();
    const first = firstGroup(verbs);
    if (first.has("#PastTense") && !first.has("#Auxiliary")) {
      return s2;
    }
    first.toPastTense();
    if (verbs.length > 1) {
      verbs = verbs.slice(first.length);
      verbs = verbs.filter((v2) => !v2.lookBehind("to$").found);
      verbs = verbs.if("#PresentTense");
      verbs = verbs.notIf("#Gerund");
      const list4 = s2.match("to #Verb+ #Conjunction #Verb").terms();
      verbs = verbs.not(list4);
      if (verbs.found) {
        verbs.verbs().toPastTense();
      }
    }
    return s2;
  };
  var toPast_default = toPast2;

  // node_modules/compromise/src/3-three/sentences/conjugate/toPresent.js
  var toPresent2 = function(s2) {
    const inverted = question_default(s2, "present");
    if (inverted) return inverted;
    let verbs = s2.verbs();
    const first = firstGroup(verbs);
    first.toPresentTense();
    if (verbs.length > 1) {
      verbs = verbs.slice(first.length);
      verbs = verbs.filter((v2) => !v2.lookBehind("to$").found);
      verbs = verbs.notIf("#Gerund");
      if (verbs.found) {
        verbs.verbs().toPresentTense();
      }
    }
    return s2;
  };
  var toPresent_default = toPresent2;

  // node_modules/compromise/src/3-three/sentences/conjugate/toFuture.js
  var toFuture = function(s2) {
    const inverted = question_default(s2, "future");
    if (inverted) return inverted;
    let verbs = s2.verbs();
    const first = firstGroup(verbs);
    first.toFutureTense();
    s2 = s2.fullSentence();
    verbs = s2.verbs();
    if (verbs.length > 1) {
      verbs = verbs.slice(first.length);
      const toChange = verbs.filter((vb3) => {
        if (vb3.lookBehind("to$").found) {
          return false;
        }
        if (vb3.has("#Copula #Gerund")) {
          return true;
        }
        if (vb3.has("#Gerund")) {
          return false;
        }
        if (vb3.has("#Copula")) {
          return true;
        }
        if (vb3.has("#PresentTense") && !vb3.has("#Infinitive") && vb3.lookBefore("(he|she|it|that|which)$").found) {
          return false;
        }
        return true;
      });
      if (toChange.found) {
        toChange.forEach((m3) => {
          if (m3.has("#Copula")) {
            m3.match("was").replaceWith("is");
            m3.match("is").replaceWith("will be");
            return;
          }
          m3.toInfinitive();
        });
      }
    }
    return s2;
  };
  var toFuture_default = toFuture;

  // node_modules/compromise/src/3-three/sentences/conjugate/toNegative.js
  var mainVerbs = (s2, parsed) => {
    if (!parsed.verb.found) {
      return s2.none().verbs();
    }
    return parsed.verb.growRight(".*").verbs();
  };
  var toNegative = function(s2, parsed) {
    const entries = groups_default(mainVerbs(s2, parsed), true);
    const head = entries[0];
    if (!head) {
      return s2;
    }
    if (!head.parsed.auxiliary.found && !head.parsed.negative.found) {
      entries.forEach((entry) => {
        if (entry.head === head) {
          entry.root.replaceWith(inflect(entry.parsed.root, "Infinitive")).tag("Infinitive");
        }
      });
    }
    head.vb.toNegative();
    s2.compute("chunks");
    return s2;
  };
  var toPositive = function(s2, parsed) {
    const entries = groups_default(mainVerbs(s2, parsed), true);
    const head = entries[0];
    if (!head) {
      return s2;
    }
    const { auxiliary: auxiliary2, negative } = head.parsed;
    if (negative.found && auxiliary2.has("^(does|did)$")) {
      const tense = auxiliary2.has("did") ? "PastTense" : "PresentTense";
      entries.forEach((entry) => {
        if (entry.head === head) {
          entry.root.replaceWith(inflect(entry.parsed.root, tense)).tag(tense);
        }
      });
    }
    head.vb.toPositive();
    s2.compute("chunks");
    return s2;
  };

  // node_modules/compromise/src/3-three/sentences/conjugate/toInfinitive.js
  var toInfinitive2 = function(s2) {
    s2.verbs().toInfinitive();
    return s2;
  };
  var toInfinitive_default2 = toInfinitive2;

  // node_modules/compromise/src/3-three/sentences/api.js
  var api15 = function(View2) {
    class Sentences extends View2 {
      constructor(document, pointer, groups2) {
        super(document, pointer, groups2);
        this.viewType = "Sentences";
      }
      json(opts2 = {}) {
        return this.map((m3) => {
          const json = m3.toView().json(opts2)[0] || {};
          const { subj, verb, pred, grammar: grammar2 } = parse_default7(m3);
          json.sentence = {
            subject: subj.text("normal"),
            verb: verb.text("normal"),
            predicate: pred.text("normal"),
            grammar: grammar2
          };
          return json;
        }, []);
      }
      toPastTense(n2) {
        return this.getNth(n2).map((s2) => {
          const parsed = parse_default7(s2);
          return toPast_default(s2, parsed);
        });
      }
      toPresentTense(n2) {
        return this.getNth(n2).map((s2) => {
          const parsed = parse_default7(s2);
          return toPresent_default(s2, parsed);
        });
      }
      toFutureTense(n2) {
        return this.getNth(n2).map((s2) => {
          const parsed = parse_default7(s2);
          s2 = toFuture_default(s2, parsed);
          return s2;
        });
      }
      toInfinitive(n2) {
        return this.getNth(n2).map((s2) => {
          const parsed = parse_default7(s2);
          return toInfinitive_default2(s2, parsed);
        });
      }
      toNegative(n2) {
        return this.getNth(n2).map((vb3) => {
          const parsed = parse_default7(vb3);
          return toNegative(vb3, parsed);
        });
      }
      toPositive(n2) {
        return this.getNth(n2).map((vb3) => {
          const parsed = parse_default7(vb3);
          return toPositive(vb3, parsed);
        });
      }
      isQuestion(n2) {
        return this.questions(n2);
      }
      isExclamation(n2) {
        const res = this.filter((s2) => s2.lastTerm().has("@hasExclamation"));
        return res.getNth(n2);
      }
      isStatement(n2) {
        const res = this.filter((s2) => !s2.isExclamation().found && !s2.isQuestion().found);
        return res.getNth(n2);
      }
      // overloaded - keep Sentences class
      update(pointer) {
        const m3 = new Sentences(this.document, pointer);
        m3._cache = this._cache;
        return m3;
      }
    }
    Sentences.prototype.toPresent = Sentences.prototype.toPresentTense;
    Sentences.prototype.toPast = Sentences.prototype.toPastTense;
    Sentences.prototype.toFuture = Sentences.prototype.toFutureTense;
    const methods19 = {
      sentences: function(n2) {
        let m3 = this.map((s2) => s2.fullSentence());
        m3 = m3.getNth(n2);
        return new Sentences(this.document, m3.pointer);
      },
      questions: function(n2) {
        const m3 = questions_default(this);
        return m3.getNth(n2);
      }
    };
    Object.assign(View2.prototype, methods19);
  };
  var api_default18 = api15;

  // node_modules/compromise/src/3-three/sentences/plugin.js
  var plugin_default28 = { api: api_default18 };

  // node_modules/compromise/src/3-three/topics/people/find.js
  var find6 = function(doc) {
    let m3 = doc.splitAfter("@hasComma");
    m3 = m3.match("#Honorific+? #Person+");
    const poss = m3.match("#Possessive").notIf("(his|her)");
    m3 = m3.splitAfter(poss);
    return m3;
  };
  var find_default5 = find6;

  // node_modules/compromise/src/3-three/topics/people/parse.js
  var parse8 = function(m3) {
    const res = {};
    res.firstName = m3.match("#FirstName+");
    res.lastName = m3.match("#LastName+");
    res.honorific = m3.match("#Honorific+");
    const last = res.lastName;
    const first = res.firstName;
    if (!first.found || !last.found) {
      if (!first.found && !last.found && m3.has("^#Honorific .$")) {
        res.lastName = m3.match(".$");
        return res;
      }
    }
    return res;
  };
  var parse_default9 = parse8;

  // node_modules/compromise/src/3-three/topics/people/gender.js
  var m2 = "male";
  var f = "female";
  var honorifics = {
    mr: m2,
    mrs: f,
    miss: f,
    madam: f,
    // british stuff
    king: m2,
    queen: f,
    duke: m2,
    duchess: f,
    baron: m2,
    baroness: f,
    count: m2,
    countess: f,
    prince: m2,
    princess: f,
    sire: m2,
    dame: f,
    lady: f,
    ayatullah: m2,
    //i think?
    congressman: m2,
    congresswoman: f,
    "first lady": f,
    // marked as non-binary
    mx: null
  };
  var predictGender = function(parsed, person) {
    const { firstName, honorific } = parsed;
    if (firstName.has("#FemaleName")) {
      return f;
    }
    if (firstName.has("#MaleName")) {
      return m2;
    }
    if (honorific.found) {
      let hon = honorific.text("normal");
      hon = hon.replace(/\./g, "");
      if (Object.hasOwn(honorifics, hon)) {
        return honorifics[hon];
      }
      if (/^her /.test(hon)) {
        return f;
      }
      if (/^his /.test(hon)) {
        return m2;
      }
    }
    const after2 = person.after();
    if (!after2.has("#Person") && after2.has("#Pronoun")) {
      const pro = after2.match("#Pronoun");
      if (pro.has("(they|their)")) {
        return null;
      }
      const hasMasc = pro.has("(he|his)");
      const hasFem = pro.has("(she|her|hers)");
      if (hasMasc && !hasFem) {
        return m2;
      }
      if (hasFem && !hasMasc) {
        return f;
      }
    }
    return null;
  };
  var gender_default = predictGender;

  // node_modules/compromise/src/3-three/topics/people/api.js
  var addMethod2 = function(View2) {
    class People extends View2 {
      constructor(document, pointer, groups2) {
        super(document, pointer, groups2);
        this.viewType = "People";
      }
      parse(n2) {
        return this.getNth(n2).map(parse_default9);
      }
      json(n2) {
        const opts2 = typeof n2 === "object" ? n2 : {};
        return this.getNth(n2).map((p4) => {
          const json = p4.toView().json(opts2)[0];
          const parsed = parse_default9(p4);
          json.person = {
            firstName: parsed.firstName.text("normal"),
            lastName: parsed.lastName.text("normal"),
            honorific: parsed.honorific.text("normal"),
            presumed_gender: gender_default(parsed, p4)
          };
          return json;
        }, []);
      }
      // used for co-reference resolution only
      presumedMale() {
        return this.filter((m3) => {
          return m3.has("(#MaleName|mr|mister|sr|jr|king|pope|prince|sir)");
        });
      }
      presumedFemale() {
        return this.filter((m3) => {
          return m3.has("(#FemaleName|mrs|miss|queen|princess|madam)");
        });
      }
      // overloaded - keep People class
      update(pointer) {
        const m3 = new People(this.document, pointer);
        m3._cache = this._cache;
        return m3;
      }
    }
    View2.prototype.people = select_default(People, find_default5, true);
  };
  var api_default19 = addMethod2;

  // node_modules/compromise/src/3-three/topics/places/find.js
  var find7 = function(doc) {
    let m3 = doc.match("(#Place|#Address)+");
    let splits = m3.match("@hasComma");
    splits = splits.filter((c) => {
      if (c.has("(asia|africa|europe|america)$")) {
        return true;
      }
      if (c.has("(#City|#Region|#ProperNoun)$") && c.after("^(#Country|#Region)").found) {
        return false;
      }
      return true;
    });
    m3 = m3.splitAfter(splits);
    return m3;
  };
  var find_default6 = find7;

  // node_modules/compromise/src/3-three/topics/places/api.js
  var addMethod3 = function(View2) {
    View2.prototype.places = select_default(View2, find_default6, true);
  };
  var api_default20 = addMethod3;

  // node_modules/compromise/src/3-three/topics/orgs/api.js
  var api16 = function(View2) {
    View2.prototype.organizations = function(n2) {
      const m3 = this.match("#Organization+");
      return m3.getNth(n2);
    };
  };
  var api_default21 = api16;

  // node_modules/compromise/src/3-three/topics/topics.js
  var find8 = function(n2) {
    const r = this.clauses();
    let m3 = r.people();
    m3 = m3.concat(r.places());
    m3 = m3.concat(r.organizations());
    m3 = m3.concat(r.match("#Acronym").ifNo(m3));
    m3 = m3.not("(someone|man|woman|mother|brother|sister|father)");
    m3 = m3.sort("seq");
    m3 = m3.getNth(n2);
    return m3;
  };
  var api17 = function(View2) {
    View2.prototype.topics = find8;
  };
  var topics_default = api17;

  // node_modules/compromise/src/3-three/topics/plugin.js
  var api18 = function(View2) {
    api_default19(View2);
    api_default20(View2);
    api_default21(View2);
    topics_default(View2);
  };
  var plugin_default29 = { api: api18 };

  // node_modules/compromise/src/3-three/verbs/find.js
  var findVerbs = function(doc) {
    let m3 = doc.match("<Verb>");
    m3 = m3.not("#Conjunction");
    m3 = m3.not("#Preposition");
    let gerunds = doc.match("#Preposition (#Adverb|#Negative)+? [#Gerund]", 0);
    const passive2 = "(being|having) (#Adverb|#Negative|#Auxiliary)+? (#PastTense|#Participle|#Gerund)";
    let chains = doc.match("#Preposition (#Adverb|#Negative)+? [" + passive2 + "]", 0);
    gerunds = gerunds.concat(chains);
    while (gerunds.found) {
      chains = gerunds.growRight("(and|or) (#Adverb|#Negative)+? " + passive2);
      const next = chains.growRight("(and|or) (#Adverb|#Negative)+? #Gerund");
      if (next.wordCount() === gerunds.wordCount()) {
        break;
      }
      gerunds = next;
    }
    m3 = m3.not(gerunds.terms());
    m3 = m3.splitAfter("@hasComma");
    m3 = m3.splitAfter("[(do|did|am|was|is|will)] (is|was)", 0);
    m3 = m3.splitBefore("(#Verb && !#Copula && !#Auxiliary) [being] #Verb", 0);
    m3 = m3.splitBefore("(#Verb && !#Auxiliary) [to be] #Verb", 0);
    m3 = m3.splitAfter("[help] #PresentTense", 0);
    m3 = m3.splitBefore("(#PresentTense|#PastTense) [#Copula]$", 0);
    m3 = m3.splitBefore("(#PresentTense|#PastTense) [will be]$", 0);
    m3 = m3.splitBefore("(#PresentTense|#PastTense) [(had|has)]", 0);
    m3 = m3.not("#Reflexive$");
    m3 = m3.not("#Adjective");
    m3 = m3.splitAfter("[#PastTense] #PastTense", 0);
    m3 = m3.splitAfter("[#PastTense] #Auxiliary+ #PastTense", 0);
    m3 = m3.splitAfter("#Copula [#Gerund] #PastTense", 0);
    m3 = m3.if("#Verb");
    if (m3.has("(#Verb && !#Auxiliary) #Adverb+? #Copula")) {
      m3 = m3.splitBefore("#Copula");
    }
    return m3;
  };
  var find_default7 = findVerbs;

  // node_modules/compromise/src/3-three/verbs/api/toJSON.js
  var toArray4 = function(m3) {
    if (!m3 || !m3.isView) {
      return [];
    }
    const opts2 = { normal: true, terms: false, text: false };
    return m3.json(opts2).map((s2) => s2.normal);
  };
  var toText5 = function(m3) {
    if (!m3 || !m3.isView) {
      return "";
    }
    return m3.text("normal");
  };
  var toInf2 = function(root) {
    const { toInfinitive: toInfinitive3 } = root.methods.two.transform.verb;
    const str = root.text("normal");
    return toInfinitive3(str, root.model, getTense2(root));
  };
  var toJSON3 = function(vb3) {
    const parsed = parse_default8(vb3);
    vb3 = vb3.clone().toView();
    const info = grammar_default(vb3, parsed);
    return {
      root: parsed.root.text(),
      preAdverbs: toArray4(parsed.adverbs.pre),
      postAdverbs: toArray4(parsed.adverbs.post),
      auxiliary: toText5(parsed.auxiliary),
      negative: parsed.negative.found,
      prefix: toText5(parsed.prefix),
      infinitive: toInf2(parsed.root),
      grammar: info
    };
  };
  var toJSON_default2 = toJSON3;

  // node_modules/compromise/src/3-three/verbs/api/conjugate/toInfinitive.js
  var keep3 = { tags: true };
  var toInf3 = function(vb3, parsed) {
    vb3.growLeft("@hasContraction+").contractions().expand();
    parsed = parse_default8(vb3);
    const { root, auxiliary: auxiliary2 } = parsed;
    const aux = auxiliary2.terms().harden();
    const str = infinitive(root);
    if (str === "be" && parsed.negative.found) {
      const copula = isAreAm(vb3, parsed);
      if (aux.found) {
        vb3.remove(root);
        vb3.match(aux).firstTerm().replaceWith(copula);
        vb3.remove(aux.slice(1));
      } else {
        vb3.replace(root, copula);
      }
      vb3.fullSentence().compute(["tagger", "chunks"]);
      return vb3;
    }
    if (str) {
      vb3.replace(root, str, keep3).tag("Verb").firstTerm().tag("Infinitive");
    }
    if (aux.found) {
      vb3.remove(aux);
    }
    if (parsed.negative.found && !vb3.has("never")) {
      if (!vb3.has("not")) {
        vb3.prepend("not");
      }
      const does = doDoes(vb3, parsed);
      vb3.prepend(does);
    }
    vb3.fullSentence().compute(["freeze", "lexicon", "preTagger", "postTagger", "unfreeze", "chunks"]);
    return vb3;
  };
  var toInfinitive_default3 = toInf3;

  // node_modules/compromise/src/3-three/verbs/api/conjugate/auxiliary.js
  var plan = function(chain, target, vb3, parsed) {
    const { finite, passive: passive2, progressive, words } = chain;
    let perfect = chain.perfect;
    if (target === "gerund") {
      if (progressive) return words;
      return [isAreAm(vb3, parsed), "being"];
    }
    if (chain.modal || chain.prospective) {
      if (target === "participle") {
        if (perfect) return words;
        const prefix5 = words.slice(0, chain.prefixLength);
        const tail3 = words.slice(chain.prefixLength);
        if (tail3[0] === "be") tail3[0] = "been";
        return [...prefix5, "have", ...tail3];
      }
      const head2 = target === "past" ? wasWere(vb3, parsed) : isAreAm(vb3, parsed);
      return [head2, ...words.slice(1)];
    }
    if (target === "present" && /^(has|have|is|are|am)$/.test(finite)) return words;
    if (target === "past" && /^(had|was|were|got)$/.test(finite)) return words;
    if (target === "future" && finite === "will") return words;
    if (target === "participle") {
      if (perfect && finite !== "will") return words;
      if (!passive2 && chain.form === "future-perfect-progressive") return words;
      perfect = true;
      target = "present";
    }
    if (passive2 && finite === "will" && target === "past" && !progressive) {
      perfect = true;
    }
    if (finite === "got" && target === "past") return words;
    if (finite === "got" && target === "future") return ["will", "get"];
    const tail2 = words.slice(finite === "will" ? 2 : 1);
    if (!passive2 && progressive && perfect && !chain.perfect) tail2.unshift("been");
    if (passive2) {
      tail2.length = 0;
      if (perfect) tail2.push("been");
      if (progressive) tail2.push("being");
    }
    const base = perfect ? "have" : "be";
    if (target === "future") return ["will", base, ...tail2];
    let head;
    if (target === "past") {
      head = perfect ? "had" : wasWere(vb3, parsed);
    } else {
      head = perfect ? haveHas(vb3, parsed) : isAreAm(vb3, parsed);
    }
    return [head, ...tail2];
  };
  var write = function(vb3, parsed, words, target, passive2) {
    const slots = vb3.match(parsed.auxiliary).terms().map((term) => ({ view: term.harden() }), []).map((slot) => slot.view);
    const root = vb3.match(parsed.root).harden();
    const sourceTail = slots.slice(1);
    const targetTail = target.slice(1);
    const overlap = Math.min(sourceTail.length, targetTail.length);
    const extra = targetTail.slice(0, targetTail.length - overlap);
    if (extra.length > 0) {
      const text = extra.join(" ");
      if (!passive2 && target[0] === "will" && target[1] === "have") {
        slots[0].toView().insertAfter(text).terms().slice(1).tag("Auxiliary");
      } else {
        const anchor = sourceTail.length > 0 ? sourceTail[0] : root;
        anchor.toView().insertBefore(text).terms().slice(0, extra.length).tag("Auxiliary");
      }
    }
    for (let i3 = 0; i3 < overlap; i3 += 1) {
      const sourceIndex = slots.length - 1 - i3;
      const replacement = target[target.length - 1 - i3];
      if (words[sourceIndex] !== replacement) {
        slots[sourceIndex].replaceWith(replacement).tag("Auxiliary");
      }
    }
    for (let i3 = sourceTail.length - overlap - 1; i3 >= 0; i3 -= 1) {
      sourceTail[i3].remove();
    }
    if (words[0] !== target[0]) slots[0].replaceWith(target[0]).tag("Auxiliary");
    return vb3;
  };
  var convertAuxiliary = function(vb3, parsed, form, target) {
    const chain = auxiliary_default(parsed, form);
    if (!chain) return null;
    if (target === "gerund" && !chain.passive) return null;
    if (chain.modal && target !== "participle" && target !== "gerund") return null;
    if (chain.prospective && !chain.perfect && !chain.passive && form === "auxiliary-future") return null;
    const words = plan(chain, target, vb3, parsed);
    if (words.join(" ") === chain.words.join(" ")) return vb3;
    vb3.growLeft("@hasContraction+").contractions().expand();
    const live = parse_default8(vb3);
    const root = vb3.match(live.root).harden();
    write(vb3, live, chain.words, words, chain.passive);
    if (target === "participle" && chain.modal && !chain.perfect && !chain.passive && !chain.progressive) {
      root.replaceWith(inflect(live.root, Participle));
    }
    vb3.fullSentence().compute(["tagger", "chunks"]);
    return vb3;
  };
  var auxiliary_default2 = convertAuxiliary;

  // node_modules/compromise/src/3-three/verbs/api/conjugate/toPast.js
  var keep4 = { tags: true };
  var fns6 = {
    noAux: (vb3, parsed) => {
      if (parsed.auxiliary.found) {
        vb3 = vb3.remove(parsed.auxiliary);
      }
      return vb3;
    },
    // walk->walked
    simple: (vb3, parsed) => {
      const root = parsed.root;
      if (root.has("#Modal")) {
        return vb3;
      }
      let str = inflect(root, "PastTense", { keepPunct: false });
      str = str === "been" ? "was" : str;
      if (str === "was") {
        str = wasWere(vb3, parsed);
      }
      if (str) {
        vb3.replace(root, str, keep4);
      }
      return vb3;
    },
    both: function(vb3, parsed) {
      if (parsed.root.has("be")) {
        vb3.replace("will", wasWere(vb3, parsed));
        return vb3.remove("be");
      }
      if (parsed.negative.found) {
        vb3.replace("will", "did");
        return vb3;
      }
      vb3 = fns6.simple(vb3, parsed);
      vb3 = fns6.noAux(vb3, parsed);
      return vb3;
    }
  };
  var forms = {
    // walk -> walked
    "infinitive": fns6.simple,
    // he walks -> he walked
    "simple-present": fns6.simple,
    // he walked
    "simple-past": noop,
    // he will walk -> he walked
    "simple-future": fns6.both,
    // would be walked -> 'would have been walked'
    "present-conditional": (vb3) => {
      vb3.replace("be", "have been");
      return vb3;
    },
    // would have been walked
    "past-conditional": noop,
    // is going to drink -> was going to drink
    "auxiliary-future": (vb3, parsed) => {
      vb3.replace("(is|are|am)", wasWere(vb3, parsed), keep4);
      return vb3;
    },
    // used to walk
    "auxiliary-past": noop,
    // we do walk -> we did walk
    "auxiliary-present": (vb3) => {
      vb3.replace("(do|does)", "did", keep4);
      return vb3;
    },
    // must walk -> 'must have walked'
    "modal-infinitive": (vb3, parsed) => {
      if (vb3.has("can")) {
        vb3.replace("can", "could", keep4);
      } else {
        vb3.match(parsed.root).replaceWith("have " + inflect(parsed.root, "Participle"));
        vb3.match("have").tag("Auxiliary");
      }
      return vb3;
    },
    // must have walked
    "modal-past": noop,
    // wanted to walk
    "want-infinitive": (vb3) => {
      vb3.replace("(want|wants)", "wanted", keep4);
      vb3.remove("will");
      return vb3;
    },
    // started looking
    "gerund-phrase": (vb3, parsed) => {
      parsed.root = parsed.root.not("#Gerund$");
      fns6.simple(vb3, parsed);
      noWill(vb3);
      return vb3;
    }
  };
  var toPast3 = function(vb3, parsed, form) {
    const converted = auxiliary_default2(vb3, parsed, form, "past");
    if (converted) return converted;
    if (Object.hasOwn(forms, form)) {
      vb3 = forms[form](vb3, parsed);
      vb3.fullSentence().compute(["tagger", "chunks"]);
      return vb3;
    }
    return vb3;
  };
  var toPast_default2 = toPast3;

  // node_modules/compromise/src/3-three/verbs/api/conjugate/toParticiple.js
  var simple = (vb3, parsed) => {
    const { root, auxiliary: auxiliary2 } = parsed;
    if (root.has("#Modal")) {
      return vb3;
    }
    let str = infinitive(root, { keepPunct: false });
    if (str === "be" && parsed.negative.has("not")) {
      const have = haveHas(vb3, parsed);
      vb3.replace(root, have);
      vb3.match(parsed.negative).insertAfter("been");
      vb3.match(have).tag("Auxiliary");
      return vb3;
    }
    str = inflect(root, Participle, { keepPunct: false });
    if (auxiliary2.has("(do|does|did)")) {
      const have = haveHas(vb3, parsed);
      vb3.replace(root, str);
      vb3.replace("(do|does|did)", have).match(have).tag("Auxiliary");
      return vb3;
    }
    if (str) {
      vb3 = vb3.replace(root, str);
      const have = haveHas(vb3, parsed);
      vb3.prepend(have).match(have).tag("Auxiliary");
      vb3.remove(auxiliary2);
    }
    return vb3;
  };
  var forms2 = {
    // walk -> walked
    "infinitive": simple,
    // he walks -> he walked
    "simple-present": simple,
    // he will walk -> he walked
    "simple-future": (vb3, parsed) => {
      vb3.replace(parsed.root, inflect(parsed.root, Participle));
      return vb3.replace("will", haveHas(vb3, parsed));
    },
    // would be walked -> 'would have been walked'
    "present-conditional": (vb3) => vb3.replace("be", "have been"),
    // would have been walked
    "past-conditional": noop,
    // is going to drink -> was going to drink
    "auxiliary-future": (vb3, parsed) => {
      const have = haveHas(vb3, parsed);
      vb3.replace("(is|are|am|was|were)", have);
      vb3.match("going").insertBefore("been");
      vb3.match("(have|has|been|be)").tag("Auxiliary");
      vb3.match("going").unTag("Auxiliary").tag(Ger);
      vb3.match("to").unTag("Auxiliary").tag(Conj);
      return vb3;
    },
    // must walk -> 'must have walked'
    "modal-infinitive": (vb3, parsed) => {
      vb3.match(parsed.root).replaceWith("have " + inflect(parsed.root, Participle));
      vb3.match("have").tag("Auxiliary");
      return vb3;
    },
    // must have walked
    "modal-past": noop,
    "modal-perfect-progressive": noop
    // wanted to walk
    // 'want-infinitive': noop,
    // started looking
    // 'gerund-phrase': noop,
  };
  var toParticiple2 = function(vb3, parsed, form) {
    const converted = auxiliary_default2(vb3, parsed, form, "participle");
    if (converted) return converted;
    if (Object.hasOwn(forms2, form)) {
      vb3 = forms2[form](vb3, parsed);
      vb3.fullSentence().compute(["tagger", "chunks"]);
      return vb3;
    }
    vb3 = simple(vb3, parsed, form);
    vb3.fullSentence().compute(["tagger", "chunks"]);
    return vb3;
  };
  var toParticiple_default = toParticiple2;

  // node_modules/compromise/src/3-three/verbs/api/conjugate/toPresent.js
  var keep5 = { tags: true };
  var simple2 = (vb3, parsed) => {
    const root = parsed.root;
    let str = infinitive(root);
    const plural2 = isPlural4(vb3, parsed);
    if (plural2 === false) {
      str = inflect(root, Pres);
    }
    if (root.has("#Copula")) {
      str = isAreAm(vb3, parsed);
    }
    if (str) {
      vb3 = vb3.replace(root, str, keep5);
      if (!plural2) vb3.not("#Particle").unTag(Inf);
      vb3.not("#Particle").tag(Pres);
    }
    return vb3;
  };
  var toGerund2 = (vb3, parsed) => {
    const root = parsed.root;
    const str = inflect(root, Ger);
    if (str) {
      vb3 = vb3.replace(root, str, keep5);
      vb3.not("#Particle").tag(Ger);
    }
    return vb3;
  };
  var vbToInf = (vb3, parsed) => {
    const root = parsed.root;
    const str = infinitive(root);
    if (str) {
      vb3 = vb3.replace(parsed.root, str, keep5);
    }
    return vb3;
  };
  var forms3 = {
    // walk
    "infinitive": simple2,
    // he walks -> he walked
    "simple-present": (vb3, parsed) => {
      const { conjugate: conjugate2 } = vb3.methods.two.transform.verb;
      const { root } = parsed;
      if (root.has("#Infinitive")) {
        const subj = getSubject_default(vb3, parsed);
        const m3 = subj.subject;
        if (isPlural4(vb3, parsed) || m3.has("i")) {
          return vb3;
        }
        const str = root.text("normal");
        const pres = conjugate2(str, vb3.model).PresentTense;
        if (str !== pres) {
          vb3.replace(root, pres, keep5).not("#Particle").unTag(Inf).tag(Pres);
        }
      } else {
        return simple2(vb3, parsed);
      }
      return vb3;
    },
    // he walked
    "simple-past": simple2,
    // he will walk -> he walked
    "simple-future": (vb3, parsed) => {
      const { root, auxiliary: auxiliary2 } = parsed;
      if (auxiliary2.has("will") && root.has("be")) {
        const str = isAreAm(vb3, parsed);
        vb3.replace(root, str);
        vb3 = vb3.remove("will");
        vb3.replace("not " + str, str + " not");
      } else if (parsed.negative.found) {
        vb3.replace("will", doDoes(vb3, parsed)).match("(do|does)").tag("Auxiliary");
      } else {
        simple2(vb3, parsed);
        vb3 = vb3.remove("will");
      }
      return vb3;
    },
    // would be walked ->
    "present-conditional": noop,
    // would have been walked ->
    "past-conditional": (vb3) => {
      vb3.replace("been", "be");
      return vb3.remove("have");
    },
    // is going to drink -> is drinking
    "auxiliary-future": (vb3, parsed) => {
      const copula = isAreAm(vb3, parsed);
      vb3.replace("(was|were)", copula);
      if (parsed.root.has("#Gerund") && vb3.has("going to be")) {
        vb3.remove("going to be");
        return vb3;
      }
      toGerund2(vb3, parsed);
      vb3.remove("(going|to)");
      return vb3;
    },
    // did walk -> is walking
    "auxiliary-past": (vb3, parsed) => {
      if (parsed.auxiliary.has("did")) {
        const str = doDoes(vb3, parsed);
        vb3.replace(parsed.auxiliary, str);
        return vb3;
      }
      toGerund2(vb3, parsed);
      vb3.replace(parsed.auxiliary, "is");
      return vb3;
    },
    // we do walk ->
    "auxiliary-present": noop,
    // must walk -> 'must have walked'
    "modal-infinitive": noop,
    // must have walked
    "modal-past": (vb3, parsed) => {
      vbToInf(vb3, parsed);
      return vb3.remove("have");
    },
    // started looking
    "gerund-phrase": (vb3, parsed) => {
      parsed.root = parsed.root.not("#Gerund$");
      simple2(vb3, parsed);
      return vb3.remove("(will|have)");
    },
    // wanted to walk
    "want-infinitive": (vb3, parsed) => {
      let str = "wants";
      if (isPlural4(vb3, parsed)) {
        str = "want";
      }
      vb3.replace("(want|wanted|wants)", str, keep5);
      vb3.remove("will");
      return vb3;
    }
  };
  var toPresent3 = function(vb3, parsed, form) {
    const converted = auxiliary_default2(vb3, parsed, form, "present");
    if (converted) return converted;
    if (Object.hasOwn(forms3, form)) {
      vb3 = forms3[form](vb3, parsed);
      vb3.fullSentence().compute(["tagger", "chunks"]);
      return vb3;
    }
    return vb3;
  };
  var toPresent_default2 = toPresent3;

  // node_modules/compromise/src/3-three/verbs/api/conjugate/toFuture.js
  var keep6 = { tags: true };
  var simple3 = (vb3, parsed) => {
    const { root, auxiliary: auxiliary2 } = parsed;
    if (root.has("#Modal")) {
      return vb3;
    }
    const str = infinitive(root);
    if (str === "be" && parsed.negative.has("not")) {
      vb3.replace(root, "will");
      vb3.match(parsed.negative).insertAfter("be");
      return vb3;
    }
    if (str) {
      vb3 = vb3.replace(root, str, keep6);
      vb3.not("#Particle").tag("Verb");
    }
    vb3.prepend("will").match("will").tag("Auxiliary");
    vb3.remove(auxiliary2);
    return vb3;
  };
  var forms4 = {
    // walk ->
    "infinitive": simple3,
    // he walks ->
    "simple-present": simple3,
    // he walked
    "simple-past": simple3,
    // he will walk ->
    "simple-future": noop,
    // would be walked ->
    "present-conditional": (vb3) => vb3.replace("would", "will"),
    // would have been walked ->
    "past-conditional": (vb3) => vb3.replace("would", "will"),
    // is going to drink ->
    "auxiliary-future": (vb3, parsed) => vb3.replace("(was|were)", isAreAm(vb3, parsed)),
    // used to walk -> is walking
    // did walk -> is walking
    "auxiliary-past": (vb3) => {
      if (vb3.has("used") && vb3.has("to")) {
        vb3.replace("used", "will");
        return vb3.remove("to");
      }
      vb3.replace("did", "will");
      return vb3;
    },
    // we do walk ->
    // he does walk ->
    "auxiliary-present": (vb3) => {
      return vb3.replace("(do|does)", "will");
    },
    // must walk ->
    "modal-infinitive": noop,
    // must have walked
    "modal-past": noop,
    // started looking
    "gerund-phrase": (vb3, parsed) => {
      parsed.root = parsed.root.not("#Gerund$");
      simple3(vb3, parsed);
      return vb3.remove("(had|have)");
    },
    // wanted to walk
    "want-infinitive": (vb3) => {
      vb3.replace("(want|wants|wanted)", "will want");
      return vb3;
    }
  };
  var toFuture2 = function(vb3, parsed, form) {
    const converted = auxiliary_default2(vb3, parsed, form, "future");
    if (converted) return converted;
    if (vb3.has("will")) {
      return vb3;
    }
    if (Object.hasOwn(forms4, form)) {
      vb3 = forms4[form](vb3, parsed);
      vb3.fullSentence().compute(["tagger", "chunks"]);
      return vb3;
    }
    return vb3;
  };
  var toFuture_default2 = toFuture2;

  // node_modules/compromise/src/3-three/verbs/api/conjugate/toGerund.js
  var keep7 = { tags: true };
  var toGerund3 = function(vb3, parsed, form) {
    const converted = auxiliary_default2(vb3, parsed, form, "gerund");
    if (converted) return converted;
    if (vb3.has("#Gerund")) {
      return vb3;
    }
    vb3.growLeft("@hasContraction+").contractions().expand();
    parsed = parse_default8(vb3);
    const { root, auxiliary: auxiliary2 } = parsed;
    const str = infinitive(root);
    const gerund = inflect(root, "Gerund");
    if (gerund) {
      const aux = isAreAm(vb3, parsed);
      if (str === "be" && !auxiliary2.found && parsed.negative.found) {
        vb3.replace(root, aux);
        vb3.match(parsed.negative).insertAfter(gerund);
      } else {
        vb3.replace(root, gerund, keep7);
        vb3.remove(auxiliary2);
        vb3.prepend(aux);
      }
    }
    vb3.replace("not is", "is not");
    vb3.replace("not are", "are not");
    vb3.fullSentence().compute(["tagger", "chunks"]);
    return vb3;
  };
  var toGerund_default = toGerund3;

  // node_modules/compromise/src/3-three/verbs/api/conjugate/toNegative.js
  var keep8 = { tags: true };
  var doesNot = function(vb3, parsed) {
    const does = doDoes(vb3, parsed);
    vb3.prepend(does + " not");
    return vb3;
  };
  var isWas = function(vb3) {
    let m3 = vb3.match("be");
    if (m3.found) {
      m3.prepend("not");
      return vb3;
    }
    m3 = vb3.match("(is|was|am|are|will|were)");
    if (m3.found) {
      m3.append("not");
      return vb3;
    }
    return vb3;
  };
  var hasCopula = (vb3) => vb3.has("(is|was|am|are|will|were|be)");
  var forms5 = {
    // he walks' -> 'he does not walk'
    "simple-present": (vb3, parsed) => {
      if (hasCopula(vb3) === true) {
        return isWas(vb3, parsed);
      }
      vb3 = toInf(vb3, parsed);
      vb3 = doesNot(vb3, parsed);
      return vb3;
    },
    // 'he walked' -> 'he did not walk'
    "simple-past": (vb3, parsed) => {
      if (hasCopula(vb3) === true) {
        return isWas(vb3, parsed);
      }
      vb3 = toInf(vb3, parsed);
      vb3.prepend("did not");
      return vb3;
    },
    // walk! -> 'do not walk'
    "imperative": (vb3) => {
      vb3.prepend("do not");
      return vb3;
    },
    // walk -> does not walk
    "infinitive": (vb3, parsed) => {
      if (hasCopula(vb3) === true) {
        return isWas(vb3, parsed);
      }
      return doesNot(vb3, parsed);
    },
    "passive-past": (vb3) => {
      if (vb3.has("got")) {
        vb3.replace("got", "get", keep8);
        vb3.prepend("did not");
        return vb3;
      }
      const m3 = vb3.match("(was|were|had|have)");
      if (m3.found) {
        m3.append("not");
      }
      return vb3;
    },
    "auxiliary-past": (vb3) => {
      if (vb3.has("used")) {
        vb3.prepend("did not");
        return vb3;
      }
      const m3 = vb3.match("(did|does|do)");
      if (m3.found) {
        m3.append("not");
      }
      return vb3;
    },
    // wants to walk
    "want-infinitive": (vb3, parsed) => {
      vb3 = doesNot(vb3, parsed);
      vb3 = vb3.replace("wants", "want", keep8);
      return vb3;
    }
  };
  var toNegative2 = function(vb3, parsed, form) {
    if (vb3.has("#Negative")) {
      return vb3;
    }
    if (Object.hasOwn(forms5, form)) {
      vb3 = forms5[form](vb3, parsed);
      return vb3;
    }
    let m3 = vb3.matchOne("be");
    if (m3.found) {
      m3.prepend("not");
      return vb3;
    }
    if (hasCopula(vb3) === true) {
      return isWas(vb3, parsed);
    }
    m3 = vb3.matchOne("(will|had|have|has|did|does|do|#Modal)");
    if (m3.found) {
      m3.append("not");
      return vb3;
    }
    return vb3;
  };
  var toNegative_default = toNegative2;

  // node_modules/compromise/src/3-three/verbs/api/api.js
  var keep9 = { tags: true };
  var api19 = function(View2) {
    class Verbs extends View2 {
      constructor(document, pointer, groups2) {
        super(document, pointer, groups2);
        this.viewType = "Verbs";
      }
      parse(n2) {
        return this.getNth(n2).map(parse_default8);
      }
      json(opts2, n2) {
        const m3 = this.getNth(n2);
        const arr = m3.map((vb3) => {
          const json = vb3.toView().json(opts2)[0] || {};
          json.verb = toJSON_default2(vb3);
          return json;
        }, []);
        return arr;
      }
      subjects(n2) {
        return this.getNth(n2).map((vb3) => {
          const parsed = parse_default8(vb3);
          return getSubject_default(vb3, parsed).subject;
        });
      }
      adverbs(n2) {
        return this.getNth(n2).map((vb3) => vb3.match("#Adverb"));
      }
      isSingular(n2) {
        return this.getNth(n2).filter((vb3) => {
          return getSubject_default(vb3).plural !== true;
        });
      }
      isPlural(n2) {
        return this.getNth(n2).filter((vb3) => {
          return getSubject_default(vb3).plural === true;
        });
      }
      isImperative(n2) {
        return this.getNth(n2).filter((vb3) => vb3.has("#Imperative"));
      }
      toInfinitive(n2) {
        return coordinate_default(this.getNth(n2), "infinitive", (vb3) => {
          const parsed = parse_default8(vb3);
          const info = grammar_default(vb3, parsed);
          if (info.isInfinitive) {
            return vb3;
          }
          return toInfinitive_default3(vb3, parsed, info.form);
        });
      }
      toPresentTense(n2) {
        return coordinate_default(this.getNth(n2), "present", (vb3) => {
          const parsed = parse_default8(vb3);
          const info = grammar_default(vb3, parsed);
          if (info.isInfinitive) {
            return vb3;
          }
          return toPresent_default2(vb3, parsed, info.form);
        });
      }
      toPastTense(n2) {
        return coordinate_default(this.getNth(n2), "past", (vb3) => {
          const parsed = parse_default8(vb3);
          const info = grammar_default(vb3, parsed);
          if (info.isInfinitive) {
            return vb3;
          }
          return toPast_default2(vb3, parsed, info.form);
        });
      }
      toFutureTense(n2) {
        return coordinate_default(this.getNth(n2), "future", (vb3) => {
          const parsed = parse_default8(vb3);
          const info = grammar_default(vb3, parsed);
          if (info.isInfinitive) {
            return vb3;
          }
          return toFuture_default2(vb3, parsed, info.form);
        });
      }
      toGerund(n2) {
        return coordinate_default(this.getNth(n2), "gerund", (vb3) => {
          const parsed = parse_default8(vb3);
          const info = grammar_default(vb3, parsed);
          if (info.isInfinitive) {
            return vb3;
          }
          return toGerund_default(vb3, parsed, info.form);
        });
      }
      toPastParticiple(n2) {
        return coordinate_default(this.getNth(n2), "participle", (vb3) => {
          const parsed = parse_default8(vb3);
          const info = grammar_default(vb3, parsed);
          if (info.isInfinitive) {
            return vb3;
          }
          return toParticiple_default(vb3, parsed, info.form);
        });
      }
      conjugate(n2) {
        const { conjugate: conjugate2, toInfinitive: toInfinitive3 } = this.world.methods.two.transform.verb;
        return this.getNth(n2).map((vb3) => {
          const parsed = parse_default8(vb3);
          const info = grammar_default(vb3, parsed);
          if (info.form === "imperative") {
            info.form = "simple-present";
          }
          let inf = parsed.root.text("normal");
          if (!parsed.root.has("#Infinitive")) {
            const tense = getTense2(parsed.root);
            inf = toInfinitive3(inf, vb3.model, tense) || inf;
          }
          return conjugate2(inf, vb3.model);
        }, []);
      }
      /** return only verbs with 'not'*/
      isNegative() {
        return this.if("#Negative");
      }
      /**  return only verbs without 'not'*/
      isPositive() {
        return this.ifNo("#Negative");
      }
      /** remove 'not' from these verbs */
      toPositive() {
        const m3 = this.match("do not #Verb");
        if (m3.found) {
          m3.remove("do not");
        }
        this.forEach((vb3) => {
          const { root, auxiliary: auxiliary2, negative } = parse_default8(vb3);
          if (negative.found && auxiliary2.has("^(does|did)$")) {
            const tense = auxiliary2.has("did") ? "PastTense" : "PresentTense";
            vb3.replace(root, inflect(root, tense), keep9).unTag("Infinitive").tag(tense);
            vb3.remove(auxiliary2);
          }
        });
        return this.remove("#Negative");
      }
      toNegative(n2) {
        return this.getNth(n2).map((vb3) => {
          const parsed = parse_default8(vb3);
          const info = grammar_default(vb3, parsed);
          return toNegative_default(vb3, parsed, info.form);
        });
      }
      // overloaded - keep Verb class
      update(pointer) {
        const m3 = new Verbs(this.document, pointer);
        m3._cache = this._cache;
        return m3;
      }
    }
    Verbs.prototype.toPast = Verbs.prototype.toPastTense;
    Verbs.prototype.toPresent = Verbs.prototype.toPresentTense;
    Verbs.prototype.toFuture = Verbs.prototype.toFutureTense;
    View2.prototype.verbs = select_default(Verbs, find_default7, true);
  };
  var api_default22 = api19;

  // node_modules/compromise/src/3-three/verbs/plugin.js
  var plugin_default30 = {
    api: api_default22
  };

  // node_modules/compromise/src/3-three/coreference/compute/lib.js
  var findChained = function(want, s2) {
    const m3 = s2.match(want);
    if (m3.found) {
      const ref = m3.pronouns().refersTo();
      if (ref.found) {
        return ref;
      }
    }
    return s2.none();
  };
  var prevSentence = function(m3) {
    if (!m3.found) {
      return m3;
    }
    const [n2] = m3.fullPointer[0];
    if (n2 && n2 > 0) {
      return m3.update([[n2 - 1]]);
    }
    return m3.none();
  };

  // node_modules/compromise/src/3-three/coreference/compute/pluralPhrase.js
  var pluralPhrase = (phrase) => {
    return isPlural_default(phrase, phrase) || phrase.has("#Noun and #Determiner? #Adjective+? #Noun");
  };
  var pluralPhrase_default = pluralPhrase;

  // node_modules/compromise/src/3-three/coreference/compute/actorGender.js
  var male = new Set("man boy father dad son brother uncle husband boyfriend grandfather king prince sultan".split(" "));
  var female = new Set("woman girl mother mom mum daughter sister aunt wife girlfriend grandmother queen princess lady".split(" "));
  var compatibleActor = (person, gender) => {
    const head = person.splitBefore("#Preposition").first();
    if (pluralPhrase_default(head)) {
      return false;
    }
    const actor = head.match("#Actor").last().text("normal").replace(/['’]s$/, "");
    const opposite = gender === "m" ? female : male;
    return !opposite.has(actor);
  };
  var actorGender_default = compatibleActor;

  // node_modules/compromise/src/3-three/coreference/compute/personBoundary.js
  var personBoundary = (person) => {
    const terms = person.docs[0];
    const [sentence, start2, end2] = person.fullPointer[0];
    let limit = terms.length;
    const measurement = person.match("#Value+ #Unit").first();
    if (measurement.found) {
      const offset2 = measurement.fullPointer[0][1] - start2;
      if (terms.slice(0, offset2).some((term) => term.tags.has("Actor"))) {
        limit = offset2;
      }
    }
    const actors = terms.slice(0, limit).map((term, i3) => term.tags.has("Actor") ? i3 : -1).filter((i3) => i3 !== -1);
    const last = actors.at(-1);
    if (last !== void 0 && terms[last].tags.has("Possessive")) {
      limit = last + 1;
    }
    if (start2 + limit < end2) {
      return person.update([[sentence, start2, start2 + limit]]);
    }
    return person;
  };
  var personBoundary_default = personBoundary;

  // node_modules/compromise/src/3-three/coreference/compute/findPerson.js
  var byGender = function(ppl, gender) {
    if (gender === "m") {
      return ppl.filter((m3) => !m3.presumedFemale().found);
    } else if (gender === "f") {
      return ppl.filter((m3) => !m3.presumedMale().found);
    }
    return ppl;
  };
  var getPerson = function(s2, gender) {
    let people = s2.people();
    people = byGender(people, gender);
    if (people.found) {
      return people.last();
    }
    people = s2.nouns("#Actor").map(personBoundary_default).filter((person) => actorGender_default(person, gender));
    if (people.found) {
      return people.last();
    }
    if (gender === "f") {
      return findChained("(she|her|hers)", s2);
    }
    if (gender === "m") {
      return findChained("(he|him|his)", s2);
    }
    return s2.none();
  };
  var findPerson_default = getPerson;

  // node_modules/compromise/src/3-three/coreference/compute/findThey.js
  var getThey = function(s2) {
    const nouns = s2.nouns();
    let things = nouns.isPlural().notIf("#Pronoun");
    if (things.found) {
      return things.last();
    }
    things = nouns.filter(pluralPhrase_default).notIf("#Pronoun");
    if (things.found) {
      return things.last();
    }
    const chain = findChained("(they|them|their|theirs)", s2);
    if (chain.found) {
      return chain;
    }
    things = nouns.match("(somebody|nobody|everybody|anybody|someone|noone|everyone|anyone)");
    if (things.found) {
      return things.last();
    }
    return s2.none();
  };
  var findThey_default = getThey;

  // node_modules/compromise/src/3-three/coreference/compute/index.js
  var addReference = function(pron, m3) {
    if (m3 && m3.found) {
      const term = pron.docs[0][0];
      term.reference = m3.ptrs[0];
    }
  };
  var stepBack = function(m3, cb) {
    let s2 = m3.before();
    let res = cb(s2);
    if (res.found) {
      return res;
    }
    s2 = prevSentence(m3);
    res = cb(s2);
    if (res.found) {
      return res;
    }
    s2 = prevSentence(s2);
    res = cb(s2);
    if (res.found) {
      return res;
    }
    return m3.none();
  };
  var coreference = function(view) {
    const pronouns = view.pronouns().if("(he|him|his|she|her|hers|they|them|their|theirs|it|its)");
    pronouns.forEach((pron) => {
      let res = null;
      if (pron.has("(he|him|his)")) {
        res = stepBack(pron, (m3) => findPerson_default(m3, "m"));
      } else if (pron.has("(she|her|hers)")) {
        res = stepBack(pron, (m3) => findPerson_default(m3, "f"));
      } else if (pron.has("(they|them|their|theirs)")) {
        res = stepBack(pron, findThey_default);
      }
      if (res && res.found) {
        addReference(pron, res);
      }
    });
  };
  var compute_default13 = coreference;

  // node_modules/compromise/src/3-three/coreference/api/pronouns.js
  var api20 = function(View2) {
    class Pronouns extends View2 {
      constructor(document, pointer, groups2) {
        super(document, pointer, groups2);
        this.viewType = "Pronouns";
      }
      hasReference() {
        this.compute("coreference");
        return this.filter((m3) => {
          const term = m3.docs[0][0];
          return term.reference;
        });
      }
      // get the noun-phrase this pronoun refers to
      refersTo() {
        this.compute("coreference");
        return this.map((m3) => {
          if (!m3.found) {
            return m3.none();
          }
          const term = m3.docs[0][0];
          if (term.reference) {
            return m3.update([term.reference]);
          }
          return m3.none();
        });
      }
      // overloaded - keep Numbers class
      update(pointer) {
        const m3 = new Pronouns(this.document, pointer);
        m3._cache = this._cache;
        return m3;
      }
    }
    View2.prototype.pronouns = select_default(Pronouns, "#Pronoun");
  };
  var pronouns_default = api20;

  // node_modules/compromise/src/3-three/coreference/plugin.js
  var plugin_default31 = {
    compute: { coreference: compute_default13 },
    api: pronouns_default
  };

  // node_modules/compromise/src/three.js
  two_default.plugin(plugin_default20);
  two_default.plugin(plugin_default21);
  two_default.plugin(plugin_default22);
  two_default.plugin(plugin_default31);
  two_default.plugin(plugin_default23);
  two_default.plugin(plugin_default24);
  two_default.plugin(plugin_default25);
  two_default.plugin(plugin_default26);
  two_default.plugin(plugin_default27);
  two_default.plugin(plugin_default28);
  two_default.plugin(plugin_default29);
  two_default.plugin(plugin_default30);
  var three_default = two_default;

  // src/extract/person.js
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
    return cleanValue(name).replace(/\b(?:mr|mrs|ms|miss|dr)\.?\s+/gi, "").replace(/[^A-Za-z.' -]/g, "").trim();
  }
  function findNames(ctx, blocked = []) {
    let primaryName = null;
    let primarySpan = null;
    let spouseName = null;
    let spouseDob = null;
    for (const label of ctx.labels.filter((l) => l.field === "name")) {
      let targetLine = label.line;
      let targetStart = label.valueStart;
      let targetEnd = label.valueEnd;
      if (label.dangling && targetLine + 1 < ctx.lines.length) {
        targetLine += 1;
        targetStart = ctx.lines[targetLine].start;
        targetEnd = ctx.lines[targetLine].end;
      }
      const lineToks = ctx.tokens.filter(
        (t2) => t2.line === targetLine && t2.start >= targetStart && t2.end <= targetEnd && t2.word
      );
      if (lineToks.length) {
        const candidateTokens = [];
        for (let ti = 0; ti < lineToks.length; ti += 1) {
          const t2 = lineToks[ti];
          if (hitsAny(t2, blocked)) break;
          const isInitial = ti > 0 && ti < lineToks.length - 1;
          if (!isValidNameWord(t2.text, isInitial)) break;
          candidateTokens.push(t2);
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
    for (const label of ctx.labels.filter((l) => l.field === "spouse")) {
      const lineToks = ctx.tokens.filter(
        (t2) => t2.line === label.line && t2.start >= label.valueStart && t2.end <= label.valueEnd && t2.word
      );
      if (lineToks.length) {
        const candidateTokens = [];
        for (let ti = 0; ti < lineToks.length; ti += 1) {
          const t2 = lineToks[ti];
          if (hitsAny(t2, blocked)) break;
          const isInitial = ti > 0 && ti < lineToks.length - 1;
          if (!isValidNameWord(t2.text, isInitial)) break;
          candidateTokens.push(t2);
        }
        if (candidateTokens.length >= 1 && candidateTokens.length <= 4) {
          const raw = ctx.text.slice(candidateTokens[0].start, candidateTokens[candidateTokens.length - 1].end);
          const cleaned = cleanCandidateName(raw);
          if (cleaned.length >= 2) {
            spouseName = titleCase(cleaned);
          }
        }
      }
      const dates = findDates(ctx).filter((d) => d.line === label.line && d.start >= label.valueStart);
      if (dates.length) {
        spouseDob = formatDate(dates[0]);
      }
    }
    if (!spouseName) {
      const SPOUSE_PATTERNS = [
        /\b(?:and\s+)?(?:my\s+)?(?:wife|husband|spouse)\s+(?:is\s+|name\s+is\s+)?([A-Z][a-z]+(?:\s+[A-Z][a-z]+){0,2})/gi,
        /\bmarried\s+to\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+){0,2})/gi
      ];
      for (const pat of SPOUSE_PATTERNS) {
        pat.lastIndex = 0;
        let m3;
        while ((m3 = pat.exec(ctx.text)) !== null) {
          const val = cleanCandidateName(m3[1]);
          if (val.length >= 2 && !isFieldWord(val) && !isCommonWord(val)) {
            spouseName = titleCase(val);
            break;
          }
        }
        if (spouseName) break;
      }
    }
    if (!primaryName) {
      try {
        const doc = three_default(ctx.text);
        const people = doc.people().json();
        for (const p4 of people) {
          const raw = cleanCandidateName(p4.text);
          if (!raw || raw.length < 3 || !raw.includes(" ")) continue;
          const words = raw.split(/\s+/);
          const firstOk = isValidNameWord(words[0], false);
          const lastOk = isValidNameWord(words[words.length - 1], false);
          const midOk = words.slice(1, -1).every((w) => isValidNameWord(w, true));
          if (firstOk && lastOk && midOk) {
            const idx = ctx.text.indexOf(p4.text);
            if (idx >= 0 && !hitsAny({ start: idx, end: idx + p4.text.length }, blocked)) {
              primaryName = titleCase(raw);
              primarySpan = { start: idx, end: idx + p4.text.length };
              break;
            }
          }
        }
      } catch (_e) {
      }
    }
    if (!primaryName && ctx.lines.length) {
      const candidates = [];
      for (let li = 0; li < ctx.lines.length; li += 1) {
        const line = ctx.lines[li];
        if (ctx.labels.some((l) => l.line === line.index && l.field !== "name" && !l.dangling && l.start === line.start)) {
          continue;
        }
        const lineToks = ctx.tokens.filter((t2) => t2.line === line.index && t2.word);
        if (!lineToks.length) continue;
        let currentRun = [];
        const runs = [];
        for (const t2 of lineToks) {
          if (!hitsAny(t2, blocked)) {
            currentRun.push(t2);
          } else {
            if (currentRun.length) {
              runs.push(currentRun);
              currentRun = [];
            }
          }
        }
        if (currentRun.length) runs.push(currentRun);
        for (const run of runs) {
          for (let start2 = 0; start2 < run.length; start2 += 1) {
            for (let len = Math.min(4, run.length - start2); len >= 2; len -= 1) {
              const sub = run.slice(start2, start2 + len);
              const firstOk = isValidNameWord(sub[0].text, false);
              const lastOk = isValidNameWord(sub[sub.length - 1].text, false);
              const midOk = sub.slice(1, -1).every((t2) => isValidNameWord(t2.text, true));
              const allCap = sub.every((t2) => /^[A-Z]/.test(t2.text));
              if (firstOk && lastOk && midOk && allCap) {
                const raw = cleanCandidateName(ctx.text.slice(sub[0].start, sub[sub.length - 1].end));
                if (raw.length >= 3 && raw.includes(" ")) {
                  let score2 = 0;
                  const nextLine = ctx.lines[li + 1];
                  const prevLine = ctx.lines[li - 1];
                  if (nextLine && ctx.tokens.some((t2) => t2.line === nextLine.index && hitsAny(t2, blocked))) {
                    score2 += 10;
                  }
                  if (prevLine && ctx.tokens.some((t2) => t2.line === prevLine.index && hitsAny(t2, blocked))) {
                    score2 += 6;
                  }
                  if (run.length === len) score2 += 5;
                  if (len === 3) score2 += 2;
                  candidates.push({
                    name: titleCase(raw),
                    start: sub[0].start,
                    end: sub[sub.length - 1].end,
                    lineIndex: li,
                    score: score2
                  });
                  break;
                }
              }
            }
          }
        }
      }
      if (candidates.length) {
        candidates.sort((a, b2) => b2.score - a.score || a.lineIndex - b2.lineIndex);
        primaryName = candidates[0].name;
        primarySpan = { start: candidates[0].start, end: candidates[0].end };
      }
    }
    return {
      name: primaryName,
      nameSpan: primarySpan,
      spouseName,
      spouseDob
    };
  }

  // src/classify.js
  function classify(rawText) {
    const cleanedText = cleanLeadText(rawText);
    if (!cleanedText) {
      return {
        phone: null,
        name: null,
        dateOfBirth: null,
        spouseName: null,
        spouseDob: null,
        email: null,
        vehicleCount: null,
        vehicles: [],
        address: null,
        insuranceCompany: null,
        insuranceDuration: null
      };
    }
    const textLines = lines(cleanedText);
    const tokens = tokenize(cleanedText);
    const labels = findLabels(textLines);
    const ctx = {
      text: cleanedText,
      lines: textLines,
      tokens,
      labels
    };
    const phones = findPhones(ctx);
    const emails = findEmails(ctx);
    const primaryPhone = phones.length ? phones[0].value : null;
    const primaryEmail = emails.length ? emails[0].value : null;
    const blockedSpans = [
      ...phones.map((p4) => ({ start: p4.start, end: p4.end })),
      ...emails.map((e) => ({ start: e.start, end: e.end }))
    ];
    const insurance = findInsuranceCarriers(ctx, blockedSpans);
    const carrierCandidate = insurance.carrierCandidate;
    if (carrierCandidate) {
      blockedSpans.push({ start: carrierCandidate.start, end: carrierCandidate.end });
    }
    const vehicles = findVehicles(ctx, blockedSpans);
    for (const v2 of vehicles) {
      blockedSpans.push({ start: v2.start, end: v2.end });
    }
    const vehicleCount = findVehicleCount(ctx, blockedSpans) || (vehicles.length ? vehicles.length : null);
    const addressResult = findAddress(ctx, {
      stops: blockedSpans,
      carriers: insurance.allCandidates || []
    });
    const address = addressResult ? addressResult.value : null;
    if (addressResult) {
      blockedSpans.push({ start: addressResult.start, end: addressResult.end });
    }
    const dates = findDates(ctx, blockedSpans);
    let dateOfBirth = null;
    const dobLabeled = dates.find(
      (d) => ctx.labels.some((l) => l.field === "dob" && l.line === d.line && l.end <= d.start)
    );
    if (dobLabeled) {
      dateOfBirth = formatDate(dobLabeled);
      blockedSpans.push({ start: dobLabeled.start, end: dobLabeled.end });
    } else if (dates.length) {
      const plausibleDob = dates.find((d) => d.year >= 1930 && d.year <= 2010);
      if (plausibleDob) {
        dateOfBirth = formatDate(plausibleDob);
        blockedSpans.push({ start: plausibleDob.start, end: plausibleDob.end });
      }
    }
    const names = findNames(ctx, blockedSpans);
    return {
      phone: primaryPhone,
      name: names.name,
      dateOfBirth,
      spouseName: names.spouseName,
      spouseDob: names.spouseDob || null,
      email: primaryEmail,
      vehicleCount: vehicleCount ? String(vehicleCount) : null,
      vehicles: vehicles.map((v2) => v2.value),
      address,
      insuranceCompany: insurance.carrier,
      insuranceDuration: insurance.duration
    };
  }
  function toGoogleSheetsRow(rawText) {
    const original = String(rawText || "").trim();
    if (!/[\r\n]/.test(original) && original.split("	").length === 10) return original;
    const res = classify(rawText);
    const display = (val, fallback2 = "N/A") => {
      if (val == null) return fallback2;
      const s2 = String(val).trim();
      return s2 === "" ? fallback2 : s2;
    };
    let carrier = display(res.insuranceCompany);
    if (carrier !== "N/A" && res.insuranceDuration) {
      carrier = `${carrier} (for ${res.insuranceDuration})`;
    }
    const cells = [
      display(res.phone),
      display(res.name),
      display(res.dateOfBirth),
      display(res.spouseName),
      display(res.spouseDob),
      display(res.email),
      display(res.vehicleCount),
      display(res.vehicles.join(" / ")),
      display(res.address),
      carrier
    ];
    return cells.map((val) => String(val).replace(/[\t\r\n]+/g, " ").trim()).join("	");
  }

  // src/extension-entry.js
  globalThis.LeadRowClassifier = {
    classify,
    toGoogleSheetsRow,
    cleanLeadText
  };
})();
