import { useCallback, useMemo, useRef, useState } from 'react';
import DetailModal from './components/DetailModal';
import HeroTopActions from './components/HeroTopActions';
import MapViewport from './components/MapViewport';
import { galleryItems, heroActions } from './data/gallery';
import { generateMosaicLayout } from './lib/layout';

export default function App() {
  const tiles = useMemo(() => generateMosaicLayout(galleryItems), []);
  const mapRef = useRef(null);
  const returnFocusRef = useRef(null);
  const zoomReadoutRef = useRef(null);
  const zoomValueRef = useRef(null);
  const lastZoomRef = useRef(100);
  const [modalContent, setModalContent] = useState(null);
  const [isCenterVisible, setIsCenterVisible] = useState(true);

  const openModal = useCallback((content) => {
    returnFocusRef.current = document.activeElement;
    setModalContent(content);
  }, []);

  const closeModal = useCallback(() => {
    setModalContent(null);
    requestAnimationFrame(() => returnFocusRef.current?.focus?.({ preventScroll: true }));
  }, []);

  // Zoom-ul se schimbă în fiecare frame. Actualizăm numai textul, fără să
  // rerandăm App, MapViewport și toate cardurile prin React.
  const handleZoomChange = useCallback((percent) => {
    if (percent === lastZoomRef.current) return;
    lastZoomRef.current = percent;
    if (zoomValueRef.current) zoomValueRef.current.textContent = `${percent}%`;
    zoomReadoutRef.current?.setAttribute('aria-valuenow', String(percent));
  }, []);

  const handleSelect = useCallback((item) => {
    openModal({ kind: 'sport', item });
  }, [openModal]);

  const handleAction = (actionId) => {
    if (actionId === 'explore') {
      mapRef.current?.reset();
      return;
    }
    if (actionId === 'subscribe') openModal({ kind: 'subscribe' });
  };

  return (
    <>
      <main
        className="sport-hero"
        aria-hidden={modalContent ? 'true' : undefined}
        inert={modalContent ? true : undefined}
      >
        <MapViewport
          ref={mapRef}
          tiles={tiles}
          disabled={Boolean(modalContent)}
          onZoomChange={handleZoomChange}
          onCenterVisibilityChange={setIsCenterVisible}
          onSelect={handleSelect}
        />

        <div className="hero-vignette" aria-hidden="true" />
        <HeroTopActions actions={heroActions} onAction={handleAction} />

        {!isCenterVisible && !modalContent && (
          <button
            type="button"
            className="center-map-button"
            onClick={() => mapRef.current?.center()}
          >
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <circle cx="12" cy="12" r="4" />
              <path d="M12 2v4M12 18v4M2 12h4M18 12h4" />
            </svg>
            <span>Centrează</span>
          </button>
        )}

        <p id="map-instructions" className="map-hint">
          <span>Trage pentru a explora grid-ul</span>
          <i aria-hidden="true">•</i>
          <span>Scroll pentru zoom</span>
        </p>

        <div
          ref={zoomReadoutRef}
          className="zoom-readout"
          role="meter"
          aria-label="Nivel zoom"
          aria-valuemin="55"
          aria-valuemax="147"
          aria-valuenow="100"
        >
          <span className="zoom-glyph" aria-hidden="true">−</span>
          <strong ref={zoomValueRef}>100%</strong>
          <span className="zoom-glyph" aria-hidden="true">＋</span>
        </div>
      </main>

      {modalContent && (
        <DetailModal content={modalContent} onAfterClose={closeModal} />
      )}
    </>
  );
}
