import { useCallback, useMemo, useRef, useState } from 'react';
import DetailModal from './components/DetailModal';
import HeroTopActions from './components/HeroTopActions';
import MapViewport from './components/MapViewport';
import LayoutTabs from './components/LayoutTabs';
import { getGalleryItems, heroActions } from './data/gallery';
import { DEFAULT_LAYOUT, LAYOUTS, generateMosaicLayout, getSlotRegions } from './lib/layout';
import { SETTINGS } from './settings';

const zoomPercent = (scale) => Math.round((scale / SETTINGS.zoom.initial) * 100);

// Varianta de hartă poate veni din link (?layout=module), altfel din settings.js.
function readLayoutFromUrl() {
  const requested = new URLSearchParams(window.location.search).get('layout');
  return LAYOUTS.some(({ id }) => id === requested) ? requested : DEFAULT_LAYOUT;
}

const layoutCounts = Object.fromEntries(LAYOUTS.map(({ id }) => [id, getSlotRegions(id).length]));

export default function App() {
  const [layout, setLayout] = useState(readLayoutFromUrl);
  const tiles = useMemo(
    () => generateMosaicLayout(getGalleryItems(layout), getSlotRegions(layout)),
    [layout],
  );

  const changeLayout = useCallback((nextLayout) => {
    setLayout(nextLayout);
    // Link-ul din bara de adrese păstrează varianta aleasă, ca să poată fi trimis mai departe.
    const url = new URL(window.location.href);
    if (nextLayout === DEFAULT_LAYOUT) url.searchParams.delete('layout');
    else url.searchParams.set('layout', nextLayout);
    window.history.replaceState(null, '', url);
  }, []);
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
          layout={layout}
          tiles={tiles}
          disabled={Boolean(modalContent)}
          onZoomChange={handleZoomChange}
          onCenterVisibilityChange={setIsCenterVisible}
          onSelect={handleSelect}
        />

        <div className="hero-vignette" aria-hidden="true" />
        <HeroTopActions actions={heroActions} onAction={handleAction} />
        {SETTINGS.grid.showLayoutTabs && (
          <LayoutTabs
            layouts={LAYOUTS}
            value={layout}
            counts={layoutCounts}
            onChange={changeLayout}
          />
        )}

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
          aria-valuemin={zoomPercent(SETTINGS.zoom.min)}
          aria-valuemax={zoomPercent(SETTINGS.zoom.max)}
          aria-valuenow="100"
        >
          <span className="zoom-glyph" aria-hidden="true">−</span>
          <strong ref={zoomValueRef}>100%</strong>
          <span className="zoom-glyph" aria-hidden="true">＋</span>
        </div>
      </main>

      {modalContent && (
        <DetailModal
          key={modalContent.kind}
          content={modalContent}
          onAfterClose={closeModal}
          onCtaAction={(action) => {
            if (action === 'subscribe') setModalContent({ kind: 'subscribe' });
          }}
        />
      )}
    </>
  );
}
