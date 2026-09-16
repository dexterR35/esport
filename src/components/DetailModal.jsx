import { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { getImageSources, MODAL_IMAGE_SIZES } from '../lib/images';
import { SETTINGS } from '../settings';

const EXIT_DURATION = SETTINGS.modal.closeDuration;

function CloseIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M6 6l12 12M18 6L6 18" />
    </svg>
  );
}

export default function DetailModal({ content, onAfterClose, onCtaAction }) {
  const [isClosing, setIsClosing] = useState(false);
  const [imageLoaded, setImageLoaded] = useState(false);
  const dialogRef = useRef(null);
  const closeButtonRef = useRef(null);
  const closingRef = useRef(false);
  const closeTimerRef = useRef(0);

  const close = useCallback(() => {
    if (closingRef.current) return;
    closingRef.current = true;
    setIsClosing(true);
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    closeTimerRef.current = window.setTimeout(onAfterClose, reduceMotion ? 0 : EXIT_DURATION);
  }, [onAfterClose]);

  useEffect(() => {
    closeButtonRef.current?.focus({ preventScroll: true });

    const onKeyDown = (event) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        close();
        return;
      }

      if (event.key !== 'Tab') return;
      const focusable = dialogRef.current?.querySelectorAll(
        'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
      );
      if (!focusable?.length) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('keydown', onKeyDown);
      window.clearTimeout(closeTimerRef.current);
    };
  }, [close]);

  const isSport = content.kind === 'sport';
  const item = isSport ? content.item : null;
  const detailImage = isSport ? getImageSources(item.modal.image) : null;

  return createPortal(
    <div
      className={`modal-backdrop${isClosing ? ' modal-backdrop--closing' : ''}`}
      onPointerDown={(event) => {
        if (event.target === event.currentTarget) close();
      }}
    >
      <section
        ref={dialogRef}
        className={`detail-modal${isSport ? '' : ' detail-modal--compact'}`}
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-title"
      >
        <button
          ref={closeButtonRef}
          type="button"
          className="modal-close"
          aria-label="Închide fereastra"
          onClick={close}
        >
          <CloseIcon />
        </button>

        {isSport ? (
          <>
            <div
              className={`modal-visual ${
                detailImage ? 'modal-visual--media' : 'modal-visual--placeholder'
              }`}
              style={{ '--modal-color': item.color }}
            >
              {detailImage ? (
                <img
                  // Poza apare după încărcare; `complete` acoperă cazul în care e deja în cache.
                  ref={(node) => { if (node?.complete && node.naturalWidth) setImageLoaded(true); }}
                  className={imageLoaded ? 'is-loaded' : undefined}
                  onLoad={() => setImageLoaded(true)}
                  src={detailImage.src}
                  srcSet={detailImage.srcSet}
                  sizes={MODAL_IMAGE_SIZES}
                  width={detailImage.width}
                  height={detailImage.height}
                  alt={item.imageAlt}
                  decoding="async"
                  fetchPriority="high"
                />
              ) : (
                <>
                  <span className="modal-slot__code">{item.category}</span>
                  <span className="modal-slot__number">{item.number}</span>
                  <div className="modal-slot__cross" aria-hidden="true" />
                  <p>IMAGINE ÎN CURÂND</p>
                </>
              )}
              {detailImage && !imageLoaded && (
                <span className="modal-visual__loader" aria-hidden="true" />
              )}
              {item.logo && (
                <span className="brand-slot__logo brand-slot__logo--modal">
                  <img
                    src={item.logo.src}
                    alt={item.logo.alt}
                    width={item.logo.width}
                    height={item.logo.height}
                  />
                </span>
              )}
            </div>
            <div className="modal-copy">
              <p className="modal-kicker">{item.category}</p>
              <h2 id="modal-title">{item.modal.title}</h2>
              <p>{item.modal.body}</p>
              <div className="modal-meta" aria-label="Detalii slot">
                <span>Box {item.number}</span>
                <span>Format {item.spanColumns} × {item.spanRows}</span>
              </div>
              {item.modal.cta?.href && (
                <a
                  className="modal-cta"
                  href={item.modal.cta.href}
                  target={item.modal.cta.external ? '_blank' : undefined}
                  rel={item.modal.cta.external ? 'noopener noreferrer' : undefined}
                >
                  {item.modal.cta.label}
                  <svg viewBox="0 0 24 24" aria-hidden="true">
                    <path d="M7 17L17 7M9 7h8v8" />
                  </svg>
                </a>
              )}
              {item.modal.cta?.action && (
                <button
                  type="button"
                  className="modal-cta"
                  onClick={() => onCtaAction?.(item.modal.cta.action)}
                >
                  {item.modal.cta.label}
                  <svg viewBox="0 0 24 24" aria-hidden="true">
                    <path d="M5 12h14M13 6l6 6-6 6" />
                  </svg>
                </button>
              )}
            </div>
          </>
        ) : (
          <div className="modal-copy modal-copy--subscription">
            <p className="modal-kicker">GRID UPDATES</p>
            <h2 id="modal-title">Rămâi aproape de proiect</h2>
            <p>
              Acesta este un ecran demonstrativ. Formularul și identitatea finală a proiectului
              pot fi conectate ulterior, fără să schimbăm experiența hărții.
            </p>
            <div className="subscription-preview" aria-hidden="true">
              <span>adresa@exemplu.ro</span>
              <span>În curând</span>
            </div>
          </div>
        )}
      </section>
    </div>,
    document.body,
  );
}
