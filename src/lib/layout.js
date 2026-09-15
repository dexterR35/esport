export const MAP_CONFIG = {
  columns: 50,
  rows: 32,
  cellSize: 190,
  minScale: 0.42,
  maxScale: 1.12,
  initialScale: 0.76,
  edgePadding: 0,
};

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
  if (columns > 6 && rows <= 6) return 'vertical';
  if (rows > 6 && columns <= 6) return 'horizontal';
  if (columns / rows >= 1.45) return 'vertical';
  if (rows / columns >= 1.45) return 'horizontal';
  return unitFromString(`${key}-direction`) > 0.5 ? 'vertical' : 'horizontal';
}

function partitionRegion(region, key, result, depth = 0) {
  const { column, row, columns, rows } = region;
  const area = columns * rows;
  const sizeRoll = unitFromString(`${key}-${column}-${row}-${depth}-size`);
  const targetArea = sizeRoll < 0.17
    ? 16
    : 3 + Math.floor(unitFromString(`${key}-${column}-${row}-${depth}-target`) * 10);
  const dimensionsFit = columns <= 6 && rows <= 6;

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
          first.columns + second.columns <= 8;
        const stacked =
          first.column === second.column &&
          (first.row + first.rows === second.row ||
            second.row + second.rows === first.row) &&
          first.rows + second.rows <= 8;

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
 * Împarte recursiv fiecare zonă din jurul canvasului central. Regiunile rezultate
 * formează un mozaic complet: nu există găuri, gap sau margini neacoperite.
 */
export function generateMosaicLayout(items) {
  const featuredIndexes = items.reduce((indexes, item, index) => {
    if (item.featured) indexes.push(index);
    return indexes;
  }, []);
  if (featuredIndexes.length !== 1) {
    throw new Error('Mosaic layout requires exactly one featured item.');
  }

  const [featuredIndex] = featuredIndexes;
  const featured = items[featuredIndex];
  const featuredRegion = {
    columns: 6,
    rows: 3,
    column: Math.floor((MAP_CONFIG.columns - 6) / 2),
    row: Math.floor((MAP_CONFIG.rows - 3) / 2),
  };
  const regions = removeRepeatedNeighbors(
    mergeAlignedRepeats(createSurroundingRegions(featuredRegion, 472)),
    [featuredRegion],
  );

  const surroundingItems = items.filter((_, index) => index !== featuredIndex);
  if (surroundingItems.length < regions.length) {
    throw new Error(`Mosaic layout requires at least ${regions.length + 1} items.`);
  }

  const result = [toTile(featured, featuredRegion)];

  regions.forEach((region, index) => {
    result.push(toTile(surroundingItems[index], region));
  });

  return result
    .sort((first, second) => first.revealOrder - second.revealOrder)
    .map(({ revealOrder, ...tile }) => tile);
}

export function clampAxis(translation, viewport, world, scale, padding) {
  const contentSize = world * scale;
  if (contentSize <= viewport - 2 * padding) return (viewport - contentSize) / 2;
  const minimum = viewport - padding - contentSize;
  return Math.min(padding, Math.max(minimum, translation));
}

export function clampCamera(camera, viewport, padding = MAP_CONFIG.edgePadding) {
  const scale = Math.min(MAP_CONFIG.maxScale, Math.max(MAP_CONFIG.minScale, camera.scale));
  const paddingX = typeof padding === 'number' ? padding : (padding?.x ?? MAP_CONFIG.edgePadding);
  const paddingY = typeof padding === 'number' ? padding : (padding?.y ?? MAP_CONFIG.edgePadding);

  return {
    scale,
    tx: clampAxis(camera.tx, viewport.width, WORLD_SIZE.width, scale, paddingX),
    ty: clampAxis(camera.ty, viewport.height, WORLD_SIZE.height, scale, paddingY),
  };
}
