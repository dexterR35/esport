import { useEffect } from 'react';
import { SETTINGS } from '../settings';

const IMAGE_SELECTOR = '.sport-tile__media[data-src]';

export function useProgressiveImages({ viewportRef, worldRef, dependency, paused = false }) {
  useEffect(() => {
    const viewport = viewportRef.current;
    const world = worldRef.current;
    if (!viewport || !world) return undefined;

    // În timpul intro-ului toată harta e vizibilă; încărcarea tuturor imaginilor ar
    // concura cu animația. Până atunci se văd placeholderele blurate, iar imaginea
    // centrală (data-preload="high") se încarcă imediat.
    if (paused) {
      world.querySelectorAll(`${IMAGE_SELECTOR}[data-preload="high"]`).forEach((image) => {
        if (image.dataset.sizes) image.sizes = image.dataset.sizes;
        if (image.dataset.srcset) image.srcset = image.dataset.srcset;
        image.src = image.dataset.src;
        image.decode().then(
          () => image.classList.add('sport-tile__media--loaded'),
          () => {},
        );
      });
      return undefined;
    }

    const images = [...world.querySelectorAll(IMAGE_SELECTOR)];
    if (!images.length) return undefined;

    const records = new Map();
    const seenIntersecting = new WeakSet();
    let disposed = false;

    const removeListeners = (image, record) => {
      if (!record) return;
      image.removeEventListener('load', record.onLoad);
      image.removeEventListener('error', record.onError);
    };

    const revealImage = (image) => {
      const record = records.get(image);
      if (disposed || !record || !image.isConnected || image.naturalWidth === 0) return;
      record.status = 'loaded';
      removeListeners(image, record);
      image.dataset.loadState = 'loaded';
      image.classList.add('sport-tile__media--loaded');
    };

    const failImage = (image) => {
      const record = records.get(image);
      if (!record) return;
      record.status = 'error';
      removeListeners(image, record);
      image.dataset.loadState = 'error';
      image.classList.remove('sport-tile__media--loaded');
    };

    const decodeImage = (image) => {
      const record = records.get(image);
      if (!record || record.status !== 'loading' || record.decoding) return;
      record.decoding = true;

      if (typeof image.decode !== 'function') {
        revealImage(image);
        return;
      }

      image.decode().then(
        () => revealImage(image),
        () => {
          // decode() poate respinge în timpul unei schimbări de sursă chiar dacă
          // imaginea a terminat încărcarea; naturalWidth este fallback-ul sigur.
          if (image.complete && image.naturalWidth > 0) revealImage(image);
          else failImage(image);
        },
      );
    };

    const loadImage = (image) => {
      const existing = records.get(image);
      if (existing?.status === 'loading' || existing?.status === 'loaded') return;

      const record = {
        status: 'loading',
        decoding: false,
        onLoad: () => decodeImage(image),
        onError: () => failImage(image),
      };
      records.set(image, record);
      image.dataset.loadState = 'loading';
      image.addEventListener('load', record.onLoad);
      image.addEventListener('error', record.onError);

      if (image.dataset.sizes) image.sizes = image.dataset.sizes;
      if (image.dataset.srcset) image.srcset = image.dataset.srcset;
      if (image.getAttribute('src') !== image.dataset.src) image.src = image.dataset.src;

      if (image.complete) {
        queueMicrotask(() => {
          if (image.naturalWidth > 0) decodeImage(image);
          else failImage(image);
        });
      }
    };

    const unloadImage = (image) => {
      const record = records.get(image);
      removeListeners(image, record);
      records.delete(image);
      image.classList.remove('sport-tile__media--loaded');
      delete image.dataset.loadState;
      image.removeAttribute('srcset');
      image.removeAttribute('sizes');
      image.removeAttribute('src');
    };

    if (!('IntersectionObserver' in window)) {
      images.forEach(loadImage);
      return () => {
        disposed = true;
        records.forEach((record, image) => removeListeners(image, record));
      };
    }

    // Două zone: imaginile se încarcă din timp (loadMargin în jurul ecranului), dar se
    // eliberează abia mult mai departe (unloadMargin). Diferența evită reîncărcarea
    // și fade-ul repetat când harta este trasă înainte și înapoi.
    const loadObserver = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          seenIntersecting.add(entry.target);
          loadImage(entry.target);
        });
      },
      { root: viewport, rootMargin: SETTINGS.images.loadMargin, threshold: 0 },
    );

    const unloadObserver = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          const image = entry.target;
          // Rețeaua rămâne în cache, dar sursa este eliminată pentru ca
          // browserul să poată elibera bitmap-ul decodat al imaginilor îndepărtate.
          if (!entry.isIntersecting && seenIntersecting.has(image)) {
            seenIntersecting.delete(image);
            unloadImage(image);
          }
        });
      },
      { root: viewport, rootMargin: SETTINGS.images.unloadMargin, threshold: 0 },
    );

    images.forEach((image) => {
      loadObserver.observe(image);
      unloadObserver.observe(image);
      if (image.dataset.preload === 'high') loadImage(image);
    });

    return () => {
      disposed = true;
      loadObserver.disconnect();
      unloadObserver.disconnect();
      records.forEach((record, image) => removeListeners(image, record));
    };
  }, [dependency, paused, viewportRef, worldRef]);
}
