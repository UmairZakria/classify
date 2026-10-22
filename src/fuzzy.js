// Fuzzy string matching for typo-tolerant dictionary lookups.
//
// Optimal String Alignment (Damerau-Levenshtein with adjacent transpositions)
// handles the four typo families seen in hand-typed notes: a missing letter
// ("progresive"), an extra letter ("geicoo"), a wrong letter ("stste farm")
// and swapped letters ("gieco", "state fram").

export function compact(text) {
  return String(text == null ? "" : text)
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");
}

export function editDistance(a, b, max = Infinity) {
  const la = a.length;
  const lb = b.length;
  if (Math.abs(la - lb) > max) return max + 1;
  if (!la) return lb;
  if (!lb) return la;
  let prevPrev = null;
  let prev = new Array(lb + 1);
  for (let j = 0; j <= lb; j += 1) prev[j] = j;
  for (let i = 1; i <= la; i += 1) {
    const cur = new Array(lb + 1);
    cur[0] = i;
    let rowMin = i;
    for (let j = 1; j <= lb; j += 1) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      let v = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + cost);
      if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) {
        v = Math.min(v, prevPrev[j - 2] + 1);
      }
      cur[j] = v;
      if (v < rowMin) rowMin = v;
    }
    if (rowMin > max) return max + 1;
    prevPrev = prev;
    prev = cur;
  }
  return prev[lb];
}

// How many typos a word of this length may carry and still be recognised.
// Short words get none: "kia" vs "kin" must never be confused.
export function typoBudget(length) {
  if (length <= 4) return 0;
  if (length <= 7) return 1;
  if (length <= 11) return 2;
  return 3;
}

// Best fuzzy match of `key` (already compacted) against an index of
// { compact, ...payload } entries. The first letter must agree - people very
// rarely mistype the first letter, and requiring it removes most false hits.
export function bestFuzzy(key, entries, { minLength = 5, budget } = {}) {
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
    if (!best || d < best.distance || (d === best.distance && target.length > best.entry.compact.length)) {
      best = { entry, distance: d };
    }
  }
  return best;
}
