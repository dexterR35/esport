// Toate pozele sunt servite doar ca AVIF (suportat de toate browserele moderne).
const IMAGE_FORMAT = 'avif';

/** `sizes` pentru imaginea din modal; folosit și la preload, ca să fie aleasă aceeași variantă. */
export const MODAL_IMAGE_SIZES = '(max-width: 760px) 100vw, 520px';

export function getImageSources(image) {
  if (!image) return null;
  const base = `${import.meta.env.BASE_URL}slots/${image.key}`;
  const fallbackWidth = image.widths.find((width) => width >= 800) ?? image.widths.at(-1);

  return {
    src: `${base}-${fallbackWidth}.${IMAGE_FORMAT}`,
    srcSet: image.widths.map((width) => `${base}-${width}.${IMAGE_FORMAT} ${width}w`).join(', '),
    width: image.width,
    height: image.height,
  };
}

const preloaded = new Set();

/** Încarcă în cache imaginea mare a modalului înainte ca acesta să fie deschis. */
export function preloadImage(image, sizes) {
  const sources = getImageSources(image);
  if (!sources || preloaded.has(sources.srcSet)) return;
  preloaded.add(sources.srcSet);

  const preload = new Image();
  preload.decoding = 'async';
  preload.sizes = sizes;
  preload.srcset = sources.srcSet;
  preload.src = sources.src;
}
