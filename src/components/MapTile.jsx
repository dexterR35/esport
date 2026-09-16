import { memo } from 'react';
import { getImageSources } from '../lib/images';
import { MAP_CONFIG } from '../lib/layout';
import { SETTINGS } from '../settings';

// Cât de mare e poza descărcată față de mărimea boxului la zoom-ul de start.
const IMAGE_RESOLUTION = { low: 1, standard: 1.5, high: 2 }[SETTINGS.images.resolution] ?? 1.5;

// Parallax-ul pozei rulează doar cu mouse și fără „reduce motion”.
const canTilt = typeof window !== 'undefined'
  && window.matchMedia('(hover: hover) and (pointer: fine)').matches
  && !window.matchMedia('(prefers-reduced-motion: reduce)').matches;

// Poziția mouse-ului în box, de la -0.5 la 0.5, scrisă direct ca variabile CSS
// (fără re-render React), cel mult o dată pe frame.
function trackTilt(event) {
  if (!canTilt || event.pointerType !== 'mouse') return;
  const button = event.currentTarget;
  const { clientX, clientY } = event;
  if (button.tiltFrame) return;
  button.tiltFrame = requestAnimationFrame(() => {
    button.tiltFrame = 0;
    const rect = button.getBoundingClientRect();
    button.style.setProperty('--tilt-x', ((clientX - rect.left) / rect.width - 0.5).toFixed(3));
    button.style.setProperty('--tilt-y', ((clientY - rect.top) / rect.height - 0.5).toFixed(3));
  });
}

function resetTilt(event) {
  const button = event.currentTarget;
  cancelAnimationFrame(button.tiltFrame);
  button.tiltFrame = 0;
  button.style.removeProperty('--tilt-x');
  button.style.removeProperty('--tilt-y');
}

function MapTile({ tile, onKeyboardActivate, onFocus, onPreload }) {
  const image = getImageSources(tile.image);
  const className = [
    'sport-tile',
    `sport-tile--${tile.model}`,
    `sport-tile--${tile.tier}`,
    tile.variant && `sport-tile--${tile.variant}`,
    tile.image && 'sport-tile--has-image',
    tile.logo && 'sport-tile--has-logo',
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <div
      className={className}
      data-slot={tile.number}
      data-featured={tile.featured ? 'true' : undefined}
      style={{
        '--tile-x': `${tile.x}px`,
        '--tile-y': `${tile.y}px`,
        '--tile-width': `${tile.width}px`,
        '--tile-height': `${tile.height}px`,
        '--tile-color': tile.color,
      }}
    >
      <div className="sport-tile__reveal">
        <button
          type="button"
          className="sport-tile__button"
          data-tile-id={tile.id}
          aria-label={`Deschide ${tile.title}`}
          onPointerEnter={() => onPreload(tile)}
          onPointerMove={trackTilt}
          onPointerLeave={resetTilt}
          onPointerDown={() => onPreload(tile)}
          onFocus={(event) => {
            onPreload(tile);
            // Focusul produs de pointer nu trebuie să pornească o animație
            // înaintea activării cardului; aducerea în cadru este doar pentru tastatură.
            if (event.currentTarget.matches(':focus-visible')) onFocus(tile);
          }}
          onClick={(event) => {
            if (event.detail === 0) onKeyboardActivate(tile.id);
          }}
        >
          {!image && (
            <span className="brand-slot__placeholder" aria-hidden="true">
              <span className="brand-slot__mark" />
            </span>
          )}

          {image && (
            <img
              className="sport-tile__media"
              data-src={image.src}
              data-srcset={image.srcSet}
              // Mărimea afișată la zoom-ul de start × images.resolution; browserul adaugă DPR-ul.
              data-sizes={`${Math.ceil(tile.width * MAP_CONFIG.initialScale * IMAGE_RESOLUTION)}px`}
              data-preload={tile.featured ? 'high' : undefined}
              width={image.width}
              height={image.height}
              alt=""
              draggable="false"
              loading="eager"
              decoding="async"
              fetchPriority={tile.featured ? 'high' : 'low'}
            />
          )}
          {/* Indicator de încărcare: vizibil (și animat) doar cât poza se descarcă. */}
          {image && <span className="sport-tile__loader" aria-hidden="true" />}

          {tile.logo && (
            <span className="brand-slot__logo">
              <img
                src={tile.logo.src}
                alt={tile.logo.alt}
                width={tile.logo.width}
                height={tile.logo.height}
                draggable="false"
                decoding="async"
                fetchPriority={tile.featured ? 'high' : undefined}
              />
            </span>
          )}

          <span className="brand-slot__title">
            <strong>{tile.title}</strong>
            <small>{tile.number}</small>
          </span>
        </button>
      </div>
    </div>
  );
}

export default memo(MapTile);
