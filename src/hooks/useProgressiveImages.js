import { useEffect } from 'react';
import { SETTINGS } from '../settings';

const PREVIEW_SELECTOR = '.sport-tile__media';
const FULL_SELECTOR = '.sport-tile__full[data-srcset]';
// Cât durează fade-out-ul pozei clare (vezi .sport-tile__full în CSS) înainte de eliberare.
const FADE_OUT_MS = 650;
// Cât timp trebuie să stea harta pe loc înainte ca pozele clare să apară prin fade.
const SETTLE_MS = 140;

/**
 * Încărcarea pozelor în două trepte, pe două straturi suprapuse:
 *  1. Previzualizare: fiecare box pornește cu o variantă mică (240px, câțiva KB).
 *     Toată harta are poze imediat, inclusiv în intro și la zoom out.
 *  2. Calitate completă: boxurile de lângă ecran încarcă poza clară într-un al doilea
 *     `<img>`, deasupra. Apare printr-un fade doar după ce e descărcată și decodată,
 *     deci trecerea de la previzualizare la poza clară e lină, fără pâlpâire.
 * Boxurile care se îndepărtează își estompează poza clară și o eliberează din memorie.
 *
 * Cât harta se mișcă (drag, zoom, intro), pozele clare se descarcă și se decodează, dar
 * fade-ul așteaptă până se oprește camera: zeci de fade-uri simultane în timpul mișcării
 * ar scădea FPS-ul.
 */
export function useProgressiveImages({
  viewportRef,
  worldRef,
  dependency,
  paused = false,
  lastMoveRef,
}) {
  // Treapta 1: previzualizările. Poza devine vizibilă după ce varianta mică s-a încărcat.
  useEffect(() => {
    const world = worldRef.current;
    if (!world) return undefined;
    const cleanups = [];

    world.querySelectorAll(PREVIEW_SELECTOR).forEach((image) => {
      const reveal = () => {
        if (!image.naturalWidth) return;
        image.classList.add('sport-tile__media--loaded');
        delete image.dataset.loadState;
      };
      if (image.complete) {
        reveal();
        return;
      }
      image.dataset.loadState = 'loading';
      image.addEventListener('load', reveal, { once: true });
      cleanups.push(() => image.removeEventListener('load', reveal));
    });

    return () => cleanups.forEach((cleanup) => cleanup());
  }, [dependency, worldRef]);

  // Treapta 2: calitatea completă pentru boxurile de lângă ecran.
  useEffect(() => {
    const viewport = viewportRef.current;
    const world = worldRef.current;
    if (!viewport || !world) return undefined;
    const images = [...world.querySelectorAll(FULL_SELECTOR)];
    const timers = new Map();
    const readyToShow = new Set();
    let flushFrame = 0;

    // Afișează pozele pregătite doar când camera stă pe loc de cel puțin SETTLE_MS.
    const flush = () => {
      flushFrame = 0;
      const idleFor = performance.now() - (lastMoveRef?.current ?? 0);
      if (idleFor < SETTLE_MS) {
        flushFrame = requestAnimationFrame(flush);
        return;
      }
      readyToShow.forEach((image) => {
        if (image.dataset.quality === 'full') image.classList.add('sport-tile__full--loaded');
      });
      readyToShow.clear();
    };

    const reveal = (image) => {
      if (image.dataset.quality !== 'full' || !image.naturalWidth) return;
      // decode() înainte de fade: poza nu apare pe jumătate desenată.
      image.decode().catch(() => {}).then(() => {
        if (image.dataset.quality !== 'full') return;
        readyToShow.add(image);
        if (!flushFrame) flushFrame = requestAnimationFrame(flush);
      });
    };

    const upgrade = (image) => {
      window.clearTimeout(timers.get(image));
      if (image.dataset.quality === 'full') {
        // Revenit înainte de eliberare: poza e încă încărcată, doar reapare.
        reveal(image);
        return;
      }
      image.dataset.quality = 'full';
      image.addEventListener('load', () => reveal(image), { once: true });
      // `sizes` înainte de `srcset`, ca browserul să aleagă varianta corectă din prima.
      image.sizes = image.dataset.sizes;
      image.srcset = image.dataset.srcset;
    };

    const downgrade = (image) => {
      if (image.dataset.quality !== 'full') return;
      readyToShow.delete(image);
      image.classList.remove('sport-tile__full--loaded');
      // După fade-out, sursa se elimină ca memoria să fie eliberată.
      window.clearTimeout(timers.get(image));
      timers.set(image, window.setTimeout(() => {
        if (image.classList.contains('sport-tile__full--loaded')) return;
        delete image.dataset.quality;
        image.removeAttribute('srcset');
        image.removeAttribute('sizes');
      }, FADE_OUT_MS));
    };

    // Boxul central începe să încarce calitatea completă imediat, chiar și în intro.
    images.filter((image) => image.dataset.preload === 'high').forEach(upgrade);
    // În intro toată harta e vizibilă: rămân previzualizările, ca animația să fie fluidă.
    // După intro efectul rulează din nou, iar boxul central (deja încărcat) apare prin fade.
    if (paused) return () => cancelAnimationFrame(flushFrame);

    if (!('IntersectionObserver' in window)) {
      images.forEach(upgrade);
      return undefined;
    }

    const upgradeObserver = new IntersectionObserver(
      (entries) => entries.forEach((entry) => entry.isIntersecting && upgrade(entry.target)),
      { root: viewport, rootMargin: SETTINGS.images.loadMargin, threshold: 0 },
    );
    const downgradeObserver = new IntersectionObserver(
      (entries) => entries.forEach((entry) => !entry.isIntersecting && downgrade(entry.target)),
      { root: viewport, rootMargin: SETTINGS.images.unloadMargin, threshold: 0 },
    );

    images.forEach((image) => {
      upgradeObserver.observe(image);
      downgradeObserver.observe(image);
    });

    return () => {
      upgradeObserver.disconnect();
      downgradeObserver.disconnect();
      cancelAnimationFrame(flushFrame);
      timers.forEach((timer) => window.clearTimeout(timer));
    };
  }, [dependency, lastMoveRef, paused, viewportRef, worldRef]);
}
