import { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

const EXIT_DURATION = 240;

function CloseIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M6 6l12 12M18 6L6 18" />
    </svg>
  );
}

export default function DetailModal({ content, onAfterClose }) {
  const [isClosing, setIsClosing] = useState(false);
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
  const title = isSport ? content.item.title : 'Rămâi aproape de proiect';
  const detailImage = isSport
    ? (content.item.detailImage || content.item.image || content.item.thumbnail)
    : null;

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
              style={{ '--modal-color': content.item.color }}
            >
              {detailImage ? (
                <img
                  src={detailImage}
                  srcSet={content.item.detailSrcSet || undefined}
                  sizes={content.item.detailSizes || '(max-width: 760px) 100vw, 52vw'}
                  width={content.item.detailImageWidth || content.item.imageWidth || undefined}
                  height={content.item.detailImageHeight || content.item.imageHeight || undefined}
                  alt={content.item.imageAlt || content.item.title}
                  decoding="async"
                  fetchPriority="high"
                />
              ) : (
                <>
                  <span className="modal-slot__code">{content.item.code}</span>
                  <span className="modal-slot__number">
                    {String(content.item.index).padStart(2, '0')}
                  </span>
                  <div className="modal-slot__cross" aria-hidden="true" />
                  <p>IMAGE PLACEHOLDER</p>
                </>
              )}
            </div>
            <div className="modal-copy">
              <p className="modal-kicker">{content.item.category}</p>
              <h2 id="modal-title">{content.item.title}</h2>
              <p>{content.item.description}</p>
              <div className="modal-meta" aria-label="Detalii slot">
                <span>Modul din grid / spațiu de brand</span>
                <span>Pregătit pentru imagine sau identitate vizuală</span>
              </div>
            </div>
          </>
        ) : (
          <div className="modal-copy modal-copy--subscription">
            <p className="modal-kicker">GRID UPDATES</p>
            <h2 id="modal-title">{title}</h2>
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
