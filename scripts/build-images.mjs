// Generează variantele optimizate pentru pozele din images-src/.
//
//   images-src/fotbal-01.jpg  -> public/slots/fotbal-01-{400,800,1600,…}.avif
//
// Pozele numite `sport-NN` sunt distribuite automat pe boxuri (vezi src/lib/assignImages.js).
// Numele rezervate pentru poze fixate manual în slots.json: numere ("001") și "-detail".
// Rulează: npm run images  (sau npm run images -- --force pentru reconstruire completă)
// Lățimile și calitatea se setează în src/settings.js → images.

import { mkdir, readdir, readFile, rm, stat, writeFile } from 'node:fs/promises';
import { availableParallelism } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';
import { SETTINGS } from '../src/settings.js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SOURCE_DIR = path.join(ROOT, 'images-src');
const OUTPUT_DIR = path.join(ROOT, 'public/slots');
const MANIFEST_PATH = path.join(ROOT, 'src/data/slot-images.json');
// Semnătura fiecărei surse (mărime + dată) decide dacă variantele trebuie refăcute.
const CACHE_PATH = path.join(ROOT, '.cache/slot-images.json');

const WIDTHS = [...SETTINGS.images.widths].sort((a, b) => a - b);
const FORMATS = {
  avif: (pipeline) => pipeline.avif({ quality: SETTINGS.images.avifQuality, effort: 3 }),
};
const SOURCE_EXTENSIONS = new Set(['.jpg', '.jpeg', '.png', '.webp', '.avif', '.tif', '.tiff']);
const KEY_PATTERN = /^[a-z0-9][a-z0-9_-]*$/i;
const force = process.argv.includes('--force');

async function exists(file) {
  try {
    await stat(file);
    return true;
  } catch {
    return false;
  }
}

async function readCache() {
  try {
    return JSON.parse(await readFile(CACHE_PATH, 'utf8'));
  } catch {
    return {};
  }
}

function outputWidths(sourceWidth) {
  // O variantă prea apropiată de original (ex. 1600 din 1672) nu aduce nimic.
  const widths = WIDTHS.filter((width) => width < sourceWidth * 0.85);
  // Nu mărim niciodată imaginea: dimensiunea originală devine varianta maximă.
  widths.push(Math.min(sourceWidth, WIDTHS.at(-1)));
  return [...new Set(widths)];
}

async function processImage(key, sourcePath, cachedSignature, signature) {
  const image = sharp(sourcePath, { failOn: 'error' }).rotate();
  const { width, height } = await image.metadata().then((meta) =>
    // Orientarea EXIF poate inversa lățimea cu înălțimea.
    meta.orientation >= 5
      ? { width: meta.height, height: meta.width }
      : { width: meta.width, height: meta.height },
  );
  const widths = outputWidths(width);
  const unchanged = !force && cachedSignature === signature;

  const jobs = widths.flatMap((targetWidth) =>
    Object.entries(FORMATS).map(async ([format, encode]) => {
      const outputPath = path.join(OUTPUT_DIR, `${key}-${targetWidth}.${format}`);
      if (unchanged && (await exists(outputPath))) return;
      await encode(image.clone().resize({ width: targetWidth })).toFile(outputPath);
    }),
  );
  await Promise.all(jobs);

  const { dominant } = await image.clone().stats();

  return {
    width,
    height,
    widths,
    color: `#${[dominant.r, dominant.g, dominant.b]
      .map((channel) => channel.toString(16).padStart(2, '0'))
      .join('')}`,
  };
}

async function main() {
  await mkdir(SOURCE_DIR, { recursive: true });
  await mkdir(OUTPUT_DIR, { recursive: true });

  const sources = (await readdir(SOURCE_DIR))
    .filter((file) => SOURCE_EXTENSIONS.has(path.extname(file).toLowerCase()))
    .sort();

  const cache = await readCache();
  const nextCache = {};
  const jobs = [];
  const seen = new Set();
  for (const file of sources) {
    const key = path.basename(file, path.extname(file));
    if (!KEY_PATTERN.test(key)) {
      console.warn(`! ${file}: numele poate conține doar litere, cifre, "-" și "_". Ignorat.`);
      continue;
    }
    if (seen.has(key)) {
      console.warn(`! ${file}: există deja o imagine cu cheia "${key}". Ignorat.`);
      continue;
    }
    seen.add(key);
    jobs.push({ key, file });
  }

  // Mai multe poze în paralel; fiecare folosește oricum mai multe fire în sharp.
  const concurrency = Math.max(1, Math.floor(availableParallelism() / 2));
  const manifest = {};
  let done = 0;
  let next = 0;
  const worker = async () => {
    while (next < jobs.length) {
      const { key, file } = jobs[next];
      next += 1;
      const sourcePath = path.join(SOURCE_DIR, file);
      const { size, mtimeMs } = await stat(sourcePath);
      // Include lățimile și calitatea: dacă se schimbă, pozele se refac. Alte setări nu contează.
      const encoding = { widths: SETTINGS.images.widths, avifQuality: SETTINGS.images.avifQuality };
      const signature = `${file}:${size}:${Math.round(mtimeMs)}:${JSON.stringify(encoding)}`;
      try {
        manifest[key] = await processImage(key, sourcePath, cache[key], signature);
        nextCache[key] = signature;
        done += 1;
        if (cache[key] !== signature) {
          console.log(`✓ [${done}/${jobs.length}] ${key} (${manifest[key].widths.join(', ')}px)`);
        }
      } catch (error) {
        console.warn(`! ${file}: nu a putut fi procesată (${error.message}). Ignorată.`);
      }
    }
  };
  await Promise.all(Array.from({ length: concurrency }, worker));

  // Șterge variantele rămase de la imagini eliminate sau redimensionate.
  const expected = new Set(
    Object.entries(manifest).flatMap(([key, { widths }]) =>
      widths.flatMap((width) => Object.keys(FORMATS).map((format) => `${key}-${width}.${format}`)),
    ),
  );
  for (const file of await readdir(OUTPUT_DIR)) {
    if (!expected.has(file)) await rm(path.join(OUTPUT_DIR, file));
  }

  await mkdir(path.dirname(CACHE_PATH), { recursive: true });
  await writeFile(CACHE_PATH, `${JSON.stringify(nextCache, null, 2)}\n`);
  // Ordine alfabetică stabilă, indiferent de ordinea în care s-au terminat pozele.
  const sortedManifest = Object.fromEntries(
    Object.keys(manifest).sort().map((key) => [key, manifest[key]]),
  );
  await writeFile(MANIFEST_PATH, `${JSON.stringify(sortedManifest, null, 2)}\n`);
  console.log(`${Object.keys(manifest).length} imagini în ${path.relative(ROOT, MANIFEST_PATH)}`);
}

await main();
