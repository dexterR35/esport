import { memo } from 'react';
import { getImageSources } from '../lib/images';
import { MAP_CONFIG } from '../lib/layout';

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
          {image ? (
            <span
              className="sport-tile__blur"
              aria-hidden="true"
              style={{ backgroundImage: `url("${tile.image.blur}")` }}
            />
          ) : (
            <span className="brand-slot__placeholder" aria-hidden="true">
              <span className="brand-slot__mark" />
            </span>
          )}

          {image && (
            <img
              className="sport-tile__media"
              data-src={image.src}
              data-srcset={image.srcSet}
              // Harta poate fi mărită până la maxScale; browserul adaugă singur DPR-ul.
              data-sizes={`${Math.ceil(tile.width * MAP_CONFIG.maxScale)}px`}
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
