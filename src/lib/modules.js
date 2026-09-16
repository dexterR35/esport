// Varianta „Module”: harta este construită din blocuri desenate, repetate cu oglindiri.
//
// Fiecare modul este un desen: aceeași literă = același box. Un box trebuie să fie un
// dreptunghi plin. Poți redesena modulele direct aici, păstrând dimensiunile blocului.
//
// Harta (50 × 32 celule) este împărțită în 5 coloane de blocuri de câte 10 celule și
// în rânduri de 4 / 8 / 8 / 8 / 4 celule. Blocul din mijloc conține bannerul central.

const BLOCK_WIDTH = 10;

/** Blocuri de 10 × 8, pentru rândurile din mijloc. */
const LARGE_MODULES = [
  `
    AAAABBHJJJ
    AAAABBIJJJ
    AAAABBIJJJ
    CDDDFFKKLL
    CDDDFFMMMM
    EEEEGGMMMM
    EEEEGGMMMM
    EEEEGGMMMM
  `,
  `
    AAABBCJJJJ
    AAADDDJJJJ
    AAADDDKKKK
    AAADDDKKKK
    EEFFIIKKKK
    EEGGIILNNN
    EEHHIIMNNN
    EEHHIIMNNN
  `,
  `
    AABBCKKKNN
    DDDGGKKKOO
    DDDGGKKKOO
    EFFGGLLLOO
    EFFGGLLLOO
    HHHHIMMMPP
    HHHHJMMMPP
    HHHHJMMMPP
  `,
];

/** Benzi de 10 × 4, pentru primul și ultimul rând al hărții. */
const BAND_MODULES = [
  `
    AABBDDEEEF
    AACCDDEEEF
    AACCGGGGHH
    AACCGGGGHH
  `,
  `
    AACCCDDDDE
    AACCCDDDDE
    AACCCFFGGG
    BBCCCFFGGG
  `,
];

/** Blocul central (10 × 8): bannerul 6 × 3 are câte un box 2 × 3 în stânga și în dreapta. */
const CENTER_TOP = `
  AABBBCDDDD
  AABBBCDDDD
`;
const CENTER_BOTTOM = `
  AABBBCCDDD
  AABBBCCDDD
  AABBBCCEFF
`;

const BLOCK_ROWS = [
  { row: 0, height: 4 },
  { row: 4, height: 8 },
  { row: 12, height: 8 },
  { row: 20, height: 8 },
  { row: 28, height: 4 },
];

/** Transformă un desen ASCII în boxuri { column, row, columns, rows }, în ordinea literelor. */
function parseModule(drawing, name) {
  const lines = drawing.trim().split('\n').map((line) => line.trim());
  const boxes = new Map();

  lines.forEach((line, row) => {
    [...line].forEach((letter, column) => {
      const box = boxes.get(letter);
      if (!box) {
        boxes.set(letter, { minColumn: column, maxColumn: column, minRow: row, maxRow: row, cells: 1 });
        return;
      }
      box.minColumn = Math.min(box.minColumn, column);
      box.maxColumn = Math.max(box.maxColumn, column);
      box.minRow = Math.min(box.minRow, row);
      box.maxRow = Math.max(box.maxRow, row);
      box.cells += 1;
    });
  });

  return [...boxes.entries()]
    .sort(([first], [second]) => first.localeCompare(second))
    .map(([letter, box]) => {
      const columns = box.maxColumn - box.minColumn + 1;
      const rows = box.maxRow - box.minRow + 1;
      if (columns * rows !== box.cells) {
        throw new Error(`Modulul ${name}: litera "${letter}" nu formează un dreptunghi plin.`);
      }
      return { column: box.minColumn, row: box.minRow, columns, rows };
    });
}

function flip(boxes, width, height, flipX, flipY) {
  return boxes.map((box) => ({
    ...box,
    column: flipX ? width - box.column - box.columns : box.column,
    row: flipY ? height - box.row - box.rows : box.row,
  }));
}

const offset = (boxes, column, row) =>
  boxes.map((box) => ({ ...box, column: box.column + column, row: box.row + row }));

/**
 * Construiește regiunile hărții din module.
 * @returns regiunile, cu [0] = bannerul central; sau null dacă gridul nu are forma
 *          pentru care au fost desenate modulele (50 × 32, banner 6 × 3 pe mijloc).
 */
export function buildModuleRegions(featuredRegion, mapColumns, mapRows) {
  const centerBlockColumn = 20;
  const centerBlockRow = 12;
  if (
    mapColumns !== 50 ||
    mapRows !== 32 ||
    featuredRegion.columns !== 6 ||
    featuredRegion.rows !== 3 ||
    featuredRegion.column !== centerBlockColumn + 2 ||
    featuredRegion.row !== centerBlockRow + 2
  ) {
    return null;
  }

  const large = LARGE_MODULES.map((drawing, index) => parseModule(drawing, `M${index + 1}`));
  const bands = BAND_MODULES.map((drawing, index) => parseModule(drawing, `B${index + 1}`));
  const regions = [featuredRegion];
  const placed = new Map();

  BLOCK_ROWS.forEach(({ row, height }, blockRow) => {
    for (let blockColumn = 0; blockColumn < 5; blockColumn += 1) {
      const column = blockColumn * BLOCK_WIDTH;

      if (column === centerBlockColumn && row === centerBlockRow) {
        regions.push(
          { column: column, row: row + 2, columns: 2, rows: 3 },
          { column: column + 8, row: row + 2, columns: 2, rows: 3 },
          ...offset(parseModule(CENTER_TOP, 'centru sus'), column, row),
          ...offset(parseModule(CENTER_BOTTOM, 'centru jos'), column, row + 5),
        );
        placed.set(`${blockColumn},${blockRow}`, 'center');
        continue;
      }

      // Alege modulul și oglindirea astfel încât două blocuri vecine să nu fie identice.
      const set = height === 8 ? large : bands;
      const left = placed.get(`${blockColumn - 1},${blockRow}`);
      const above = placed.get(`${blockColumn},${blockRow - 1}`);
      let choice;
      for (let attempt = 0; attempt < set.length * 4; attempt += 1) {
        const module = (blockColumn * 2 + blockRow * 3 + attempt) % set.length;
        const variant = (blockColumn + blockRow * 2 + attempt) % 4;
        choice = { key: `${height}-${module}-${variant}`, module, variant };
        if (choice.key !== left && choice.key !== above) break;
      }
      placed.set(`${blockColumn},${blockRow}`, choice.key);

      const boxes = flip(set[choice.module], BLOCK_WIDTH, height, choice.variant & 1, choice.variant & 2);
      regions.push(...offset(boxes, column, row));
    }
  });

  return regions;
}
