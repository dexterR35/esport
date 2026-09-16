// Distribuie automat pozele din images-src/ pe boxuri.
//
// Reguli, în ordinea importanței:
//  1. fiecare poză este folosită înainte ca vreuna să se repete;
//  2. forma pozei se potrivește cu forma boxului (lată → box lat, verticală → box înalt);
//  3. două boxuri vecine nu primesc același sport (și niciodată aceeași poză).
// Rezultatul este determinist: aceleași poze + același grid = aceeași distribuție.

const WEIGHT_USES = 10;
const WEIGHT_FIT = 6;
const WEIGHT_SAME_SPORT = 2.5;
const WEIGHT_SAME_IMAGE = 1000;

function hashString(value) {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0) / 4294967295;
}

/** "fotbal-03" → "fotbal", "formula1_12" → "formula1". */
export function sportFromKey(key) {
  return key.replace(/[-_]\d+$/, '');
}

// Boxuri care se ating pe o latură sau într-un colț.
function areNeighbors(first, second) {
  return (
    first.column <= second.column + second.columns &&
    second.column <= first.column + first.columns &&
    first.row <= second.row + second.rows &&
    second.row <= first.row + first.rows
  );
}

/**
 * @param regions  regiunile sloturilor (index 0 = slotul 001)
 * @param images   [{ key, width, height }] — pozele disponibile pentru distribuire
 * @param fixed    Map<index, key> — sloturi cu poză aleasă manual în slots.json
 * @returns        Map<index, key>
 */
export function assignImages(regions, images, fixed = new Map()) {
  const result = new Map(fixed);
  if (!images.length) return result;

  const neighbors = regions.map((region, index) =>
    regions.flatMap((other, otherIndex) =>
      otherIndex !== index && areNeighbors(region, other) ? [otherIndex] : [],
    ),
  );
  const candidates = images.map((image) => ({
    key: image.key,
    sport: sportFromKey(image.key),
    aspect: image.width / image.height,
  }));
  const uses = new Map(candidates.map((candidate) => [candidate.key, 0]));
  fixed.forEach((key) => uses.has(key) && uses.set(key, uses.get(key) + 1));
  const sportOf = new Map(candidates.map((candidate) => [candidate.key, candidate.sport]));

  // Boxurile cu forma cea mai extremă aleg primele, cât încă există poze potrivite.
  const order = regions
    .map((region, index) => ({
      index,
      aspect: region.columns / region.rows,
      tieBreak: hashString(`slot-${index}`),
    }))
    .filter(({ index }) => !result.has(index))
    .sort(
      (first, second) =>
        Math.abs(Math.log(second.aspect)) - Math.abs(Math.log(first.aspect)) ||
        first.tieBreak - second.tieBreak,
    );

  order.forEach(({ index, aspect }) => {
    const neighborKeys = neighbors[index].map((other) => result.get(other)).filter(Boolean);
    let best = null;

    candidates.forEach((candidate) => {
      const fit = Math.min(candidate.aspect, aspect) / Math.max(candidate.aspect, aspect);
      let cost = uses.get(candidate.key) * WEIGHT_USES + (1 - fit) * WEIGHT_FIT;
      neighborKeys.forEach((key) => {
        if (key === candidate.key) cost += WEIGHT_SAME_IMAGE;
        else if (sportOf.get(key) === candidate.sport) cost += WEIGHT_SAME_SPORT;
      });
      cost += hashString(`${index}-${candidate.key}`) * 0.01;
      if (!best || cost < best.cost) best = { key: candidate.key, cost };
    });

    result.set(index, best.key);
    uses.set(best.key, uses.get(best.key) + 1);
  });

  return result;
}
