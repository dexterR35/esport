// AVIF 1×1 folosit doar pentru a verifica suportul browserului.
const AVIF_PROBE =
  'data:image/avif;base64,AAAAHGZ0eXBhdmlmAAAAAG1pZjFhdmlmbWlhZgAAANZtZXRhAAAAAAAAACFoZGxyAAAAAAAAAABwaWN0AAAAAAAAAAAAAAAAAAAAACJpbG9jAAAAAERAAAEAAQAAAAAA+gABAAAAAAAAAB0AAAAjaWluZgAAAAAAAQAAABVpbmZlAgAAAAABAABhdjAxAAAAAA5waXRtAAAAAAABAAAAVmlwcnAAAAA4aXBjbwAAAAxhdjFDgSACAAAAABRpc3BlAAAAAAAAAAEAAAABAAAAEHBpeGkAAAAAAwgICAAAABZpcG1hAAAAAAAAAAEAAQOBAgMAAAAlbWRhdBIACgc4AAaQENBpMhAZQmMEwAA0AACQQM6Xt10S';

let imageFormat = 'webp';

/** `sizes` pentru imaginea din modal; folosit și la preload, ca să fie aleasă aceeași variantă. */
export const MODAL_IMAGE_SIZES = '(max-width: 760px) 100vw, 520px';

/**
 * Alege o singură dată formatul (AVIF sau WebP) înainte de primul render.
 * Astfel `<img srcset>` simplu, preload-ul și cache-ul folosesc aceleași URL-uri.
 */
export function detectImageFormat() {
  return new Promise((resolve) => {
    const probe = new Image();
    let settled = false;
    const finish = (supported) => {
      if (settled) return;
      settled = true;
      imageFormat = supported ? 'avif' : 'webp';
      resolve(imageFormat);
    };
    probe.onload = () => finish(probe.width > 0);
    probe.onerror = () => finish(false);
    probe.src = AVIF_PROBE;
    window.setTimeout(() => finish(false), 300);
  });
}

export function getImageSources(image) {
  if (!image) return null;
  const base = `${import.meta.env.BASE_URL}slots/${image.key}`;
  const fallbackWidth = image.widths.find((width) => width >= 800) ?? image.widths.at(-1);

  return {
    src: `${base}-${fallbackWidth}.${imageFormat}`,
    srcSet: image.widths.map((width) => `${base}-${width}.${imageFormat} ${width}w`).join(', '),
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
