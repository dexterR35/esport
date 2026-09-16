import { SETTINGS } from '../settings.js';
import { buildModuleRegions } from './modules.js';

// Valorile se editează în src/settings.js.
export const MAP_CONFIG = {
  columns: SETTINGS.grid.columns,
  rows: SETTINGS.grid.rows,
  cellSize: SETTINGS.grid.cellSize,
  minScale: SETTINGS.zoom.min,
  maxScale: SETTINGS.zoom.max,
  initialScale: SETTINGS.zoom.initial,
  edgePadding: 0,
};

// Niciun box (în afară de cel central) nu depășește atâtea celule pe o latură.
const MAX_SPAN = SETTINGS.grid.maxSpan;

export const WORLD_SIZE = {
  width: MAP_CONFIG.columns * MAP_CONFIG.cellSize,
  height: MAP_CONFIG.rows * MAP_CONFIG.cellSize,
};

function hashString(value) {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function unitFromString(value) {
  return hashString(value) / 4294967295;
}

function getModel(columns, rows, featured) {
  if (featured) return 'hero';
  if (columns === rows) return 'square';
  return columns > rows ? 'wide' : 'portrait';
}

function getTier(columns, rows, featured) {
  if (featured) return 'hero';
  const area = columns * rows;
  if (area >= 10) return 'large';
  if (area >= 4) return 'medium';
  return 'small';
}

function normalizedRadius(column, row, columns, rows) {
  const centerColumn = column + columns / 2;
  const centerRow = row + rows / 2;
  const x = (centerColumn - MAP_CONFIG.columns / 2) / (MAP_CONFIG.columns / 2);
  const y = (centerRow - MAP_CONFIG.rows / 2) / (MAP_CONFIG.rows / 2);
  return Math.min(1.42, Math.hypot(x, y));
}

function toTile(item, region) {
  const { cellSize } = MAP_CONFIG;
  const { column, row, columns, rows } = region;

  return {
    ...item,
    x: column * cellSize,
    y: row * cellSize,
    width: columns * cellSize,
    height: rows * cellSize,
    spanColumns: columns,
    spanRows: rows,
    tier: getTier(columns, rows, item.featured),
    model: getModel(columns, rows, item.featured),
    revealOrder: normalizedRadius(column, row, columns, rows),
  };
}

function chooseSplitDirection(region, key) {
  const { columns, rows } = region;
  if (columns > MAX_SPAN && rows <= MAX_SPAN) return 'vertical';
  if (rows > MAX_SPAN && columns <= MAX_SPAN) return 'horizontal';
  if (columns / rows >= 1.45) return 'vertical';
  if (rows / columns >= 1.45) return 'horizontal';
  return unitFromString(`${key}-direction`) > 0.5 ? 'vertical' : 'horizontal';
}

function partitionRegion(region, key, result, depth = 0) {
  const { column, row, columns, rows } = region;
  const area = columns * rows;
  const sizeRoll = unitFromString(`${key}-${column}-${row}-${depth}-size`);
  const targetArea = sizeRoll < 0.17
    ? MAX_SPAN * MAX_SPAN
    : 3 + Math.floor(unitFromString(`${key}-${column}-${row}-${depth}-target`) * 10);
  const dimensionsFit = columns <= MAX_SPAN && rows <= MAX_SPAN;

  if ((dimensionsFit && area <= targetArea) || area === 1) {
    result.push(region);
    return;
  }

  let direction = chooseSplitDirection(region, `${key}-${depth}`);
  if (direction === 'vertical' && columns <= 1) direction = 'horizontal';
  if (direction === 'horizontal' && rows <= 1) direction = 'vertical';

  const dimension = direction === 'vertical' ? columns : rows;
  if (dimension <= 1) {
    result.push(region);
    return;
  }

  const splitRoll = unitFromString(`${key}-${column}-${row}-${depth}-split`);
  const split = Math.max(1, Math.min(dimension - 1, Math.round(dimension * (0.3 + splitRoll * 0.4))));

  if (direction === 'vertical') {
    partitionRegion({ column, row, columns: split, rows }, `${key}-a`, result, depth + 1);
    partitionRegion(
      { column: column + split, row, columns: columns - split, rows },
      `${key}-b`,
      result,
      depth + 1,
    );
  } else {
    partitionRegion({ column, row, columns, rows: split }, `${key}-a`, result, depth + 1);
    partitionRegion(
      { column, row: row + split, columns, rows: rows - split },
      `${key}-b`,
      result,
      depth + 1,
    );
  }
}

function regionsTouch(first, second) {
  const verticalEdge =
    first.column + first.columns === second.column ||
    second.column + second.columns === first.column;
  const verticalOverlap =
    Math.max(first.row, second.row) <
    Math.min(first.row + first.rows, second.row + second.rows);
  const horizontalEdge =
    first.row + first.rows === second.row ||
    second.row + second.rows === first.row;
  const horizontalOverlap =
    Math.max(first.column, second.column) <
    Math.min(first.column + first.columns, second.column + second.columns);

  return (verticalEdge && verticalOverlap) || (horizontalEdge && horizontalOverlap);
}

function countRepeatedNeighbors(regions) {
  let score = 0;
  for (let index = 0; index < regions.length; index += 1) {
    for (let otherIndex = index + 1; otherIndex < regions.length; otherIndex += 1) {
      const first = regions[index];
      const second = regions[otherIndex];
      if (
        first.columns === second.columns &&
        first.rows === second.rows &&
        regionsTouch(first, second)
      ) {
        score += 1;
      }
    }
  }
  return score;
}

function mergeAlignedRepeats(inputRegions) {
  const regions = inputRegions.map((region) => ({ ...region }));
  let merged = true;

  while (merged) {
    merged = false;

    for (let index = 0; index < regions.length && !merged; index += 1) {
      for (let otherIndex = index + 1; otherIndex < regions.length; otherIndex += 1) {
        const first = regions[index];
        const second = regions[otherIndex];
        if (first.columns !== second.columns || first.rows !== second.rows) continue;

        const sideBySide =
          first.row === second.row &&
          (first.column + first.columns === second.column ||
            second.column + second.columns === first.column) &&
          first.columns + second.columns <= MAX_SPAN;
        const stacked =
          first.column === second.column &&
          (first.row + first.rows === second.row ||
            second.row + second.rows === first.row) &&
          first.rows + second.rows <= MAX_SPAN;

        if (!sideBySide && !stacked) continue;

        const combined = sideBySide
          ? {
              column: Math.min(first.column, second.column),
              row: first.row,
              columns: first.columns + second.columns,
              rows: first.rows,
            }
          : {
              column: first.column,
              row: Math.min(first.row, second.row),
              columns: first.columns,
              rows: first.rows + second.rows,
            };

        regions.splice(otherIndex, 1);
        regions.splice(index, 1, combined);
        merged = true;
        break;
      }
    }
  }

  return regions;
}

function createSurroundingRegions(featuredRegion, variation) {
  const regions = [];
  const suffix = `variation-${variation}`;

  partitionRegion(
    { column: 0, row: 0, columns: MAP_CONFIG.columns, rows: featuredRegion.row },
    `top-${suffix}`,
    regions,
  );
  partitionRegion(
    {
      column: 0,
      row: featuredRegion.row + featuredRegion.rows,
      columns: MAP_CONFIG.columns,
      rows: MAP_CONFIG.rows - featuredRegion.row - featuredRegion.rows,
    },
    `bottom-${suffix}`,
    regions,
  );
  partitionRegion(
    {
      column: 0,
      row: featuredRegion.row,
      columns: featuredRegion.column,
      rows: featuredRegion.rows,
    },
    `middle-left-${suffix}`,
    regions,
  );
  partitionRegion(
    {
      column: featuredRegion.column + featuredRegion.columns,
      row: featuredRegion.row,
      columns: MAP_CONFIG.columns - featuredRegion.column - featuredRegion.columns,
      rows: featuredRegion.rows,
    },
    `middle-right-${suffix}`,
    regions,
  );

  return regions;
}

function getRepeatedPair(regions) {
  for (let index = 0; index < regions.length; index += 1) {
    for (let otherIndex = index + 1; otherIndex < regions.length; otherIndex += 1) {
      const first = regions[index];
      const second = regions[otherIndex];
      if (
        first.columns === second.columns &&
        first.rows === second.rows &&
        regionsTouch(first, second)
      ) {
        return [index, otherIndex];
      }
    }
  }
  return null;
}

function getUnevenSplits(region) {
  const options = [];

  for (let split = 1; split < region.columns; split += 1) {
    if (split === region.columns - split) continue;
    options.push([
      { ...region, columns: split },
      {
        ...region,
        column: region.column + split,
        columns: region.columns - split,
      },
    ]);
  }

  for (let split = 1; split < region.rows; split += 1) {
    if (split === region.rows - split) continue;
    options.push([
      { ...region, rows: split },
      {
        ...region,
        row: region.row + split,
        rows: region.rows - split,
      },
    ]);
  }

  return options;
}

function removeRepeatedNeighbors(inputRegions, fixedRegions) {
  let regions = inputRegions.map((region) => ({ ...region }));

  for (let attempt = 0; attempt < 16; attempt += 1) {
    const allRegions = [...fixedRegions, ...regions];
    const pair = getRepeatedPair(allRegions);
    if (!pair) break;

    const currentScore = countRepeatedNeighbors(allRegions);
    let best = null;

    pair.forEach((allIndex) => {
      const regionIndex = allIndex - fixedRegions.length;
      if (regionIndex < 0) return;

      getUnevenSplits(regions[regionIndex]).forEach((splitRegions) => {
        const candidate = [
          ...regions.slice(0, regionIndex),
          ...splitRegions,
          ...regions.slice(regionIndex + 1),
        ];
        const score = countRepeatedNeighbors([...fixedRegions, ...candidate]);
        if (!best || score < best.score) best = { regions: candidate, score };
      });
    });

    if (!best || best.score >= currentScore) break;
    regions = best.regions;
  }

  return regions;
}

/**
 * Boxurile lungi și înguste (ex. 1×4, 4×1, 1×3) se împart în două pe latura lungă,
 * până când raportul laturilor nu mai depășește `maxAspect`.
 * Prima jumătate păstrează indexul (deci numărul slotului), a doua se adaugă la final,
 * ca numerele celorlalte boxuri să nu se schimbe.
 */
function splitElongated(region, maxAspect) {
  const { columns, rows } = region;
  if (Math.max(columns, rows) / Math.min(columns, rows) <= maxAspect) return [region];
  const pieces = columns > rows
    ? [
        { ...region, columns: Math.ceil(columns / 2) },
        { ...region, column: region.column + Math.ceil(columns / 2), columns: Math.floor(columns / 2) },
      ]
    : [
        { ...region, rows: Math.ceil(rows / 2) },
        { ...region, row: region.row + Math.ceil(rows / 2), rows: Math.floor(rows / 2) },
      ];
  return pieces.flatMap((piece) => splitElongated(piece, maxAspect));
}

function splitElongatedRegions(inputRegions, maxAspect) {
  const regions = [...inputRegions];
  const extra = [];

  regions.forEach((region, index) => {
    const [first, ...rest] = splitElongated(region, maxAspect);
    regions[index] = first;
    extra.push(...rest);
  });

  return [...regions, ...extra];
}

const FEATURED_REGION = {
  columns: SETTINGS.grid.centerColumns,
  rows: SETTINGS.grid.centerRows,
  column: Math.floor((MAP_CONFIG.columns - SETTINGS.grid.centerColumns) / 2),
  row: Math.floor((MAP_CONFIG.rows - SETTINGS.grid.centerRows) / 2),
};

/**
 * Împărțiri manuale din settings.js → grid.splits:
 *  'columns' = două boxuri alăturate, 'rows' = două boxuri unul peste altul.
 * Boxurile rămân pe celule întregi: dacă latura are un număr impar de celule, jumătățile
 * diferă cu o celulă (ex. 3 rânduri → 2 + 1), iar o jumătate prea îngustă este împărțită
 * din nou după `maxAspect` (ex. 4×1 → 2×1 + 2×1).
 * Prima bucată păstrează numărul boxului, celelalte primesc următoarele numere libere.
 */
function applyManualSplits(regions, splits, maxAspect) {
  const result = [...regions];
  Object.keys(splits)
    .sort()
    .forEach((number) => {
      const index = Number(number) - 1;
      const region = result[index];
      const mode = splits[number];
      const size = mode === 'columns' ? region?.columns : region?.rows;
      if (!region || index === 0 || !['columns', 'rows'].includes(mode) || size < 2) {
        console.warn(`settings.js › grid.splits: "${number}: ${mode}" nu poate fi aplicat.`);
        return;
      }
      const first = Math.ceil(size / 2);
      const halves = mode === 'columns'
        ? [
            { ...region, columns: first },
            { ...region, column: region.column + first, columns: size - first },
          ]
        : [
            { ...region, rows: first },
            { ...region, row: region.row + first, rows: size - first },
          ];
      const [kept, ...added] = halves.flatMap((half) => splitElongated(half, maxAspect));
      result[index] = kept;
      result.push(...added);
    });
  return result;
}

// ── Variante de layout ──────────────────────────────────────────────────────
// Fiecare variantă este deterministă: aceleași setări = aceleași poziții și numere.
// Numerele boxurilor diferă între variante; doar 001 (bannerul central) rămâne același.

export const LAYOUTS = [
  { id: 'actual', label: 'Actual' },
  { id: 'module', label: 'Module' },
];

export const DEFAULT_LAYOUT = LAYOUTS.some(({ id }) => id === SETTINGS.grid.layout)
  ? SETTINGS.grid.layout
  : 'actual';

function buildSurroundingRegions() {
  return splitElongatedRegions(
    removeRepeatedNeighbors(
      mergeAlignedRepeats(createSurroundingRegions(FEATURED_REGION, SETTINGS.grid.seed)),
      [FEATURED_REGION],
    ),
    SETTINGS.grid.maxAspect,
  );
}

function buildRegions(layout) {
  if (layout === 'module') {
    const regions = buildModuleRegions(FEATURED_REGION, MAP_CONFIG.columns, MAP_CONFIG.rows);
    if (regions) return regions;
    console.warn('Layout „module” este desenat pentru un grid 50 × 32 cu banner 6 × 3. Se folosește „actual”.');
    return buildRegions('actual');
  }
  // grid.splits se aplică doar variantei „actual”, pentru care au fost alese numerele.
  return applyManualSplits(
    [FEATURED_REGION, ...buildSurroundingRegions()],
    SETTINGS.grid.splits ?? {},
    SETTINGS.grid.maxAspect,
  );
}

const regionsCache = new Map();

/** Regiunea fiecărui box, în ordinea numerelor: [0] = 001 (central), [1] = 002… */
export function getSlotRegions(layout = DEFAULT_LAYOUT) {
  if (!regionsCache.has(layout)) regionsCache.set(layout, buildRegions(layout));
  return regionsCache.get(layout);
}

/**
 * Transformă regiunile în boxuri poziționate. Fiecare item primește regiunea cu același
 * index (item 0 = boxul central). Rezultatul e sortat după distanța față de centru,
 * pentru animația de apariție.
 */
export function generateMosaicLayout(items, regions) {
  if (items.length < regions.length) {
    throw new Error(`Layout-ul are nevoie de ${regions.length} itemi.`);
  }

  return regions
    .map((region, index) => toTile(items[index], region))
    .sort((first, second) => first.revealOrder - second.revealOrder)
    .map(({ revealOrder, ...tile }) => tile);
}

export function clampAxis(translation, viewport, world, scale, padding) {
  const contentSize = world * scale;
  if (contentSize <= viewport - 2 * padding) return (viewport - contentSize) / 2;
  const minimum = viewport - padding - contentSize;
  return Math.min(padding, Math.max(minimum, translation));
}

export function clampCamera(
  camera,
  viewport,
  padding = MAP_CONFIG.edgePadding,
  minScale = MAP_CONFIG.minScale,
) {
  const scale = Math.min(MAP_CONFIG.maxScale, Math.max(minScale, camera.scale));
  const paddingX = typeof padding === 'number' ? padding : (padding?.x ?? MAP_CONFIG.edgePadding);
  const paddingY = typeof padding === 'number' ? padding : (padding?.y ?? MAP_CONFIG.edgePadding);

  return {
    scale,
    tx: clampAxis(camera.tx, viewport.width, WORLD_SIZE.width, scale, paddingX),
    ty: clampAxis(camera.ty, viewport.height, WORLD_SIZE.height, scale, paddingY),
  };
}
