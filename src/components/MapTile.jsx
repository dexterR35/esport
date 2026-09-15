import { memo } from 'react';

function MapTile({ tile, onKeyboardActivate, onFocus }) {
  const frameNumber = String(tile.index).padStart(3, '0');
  const format = `${tile.spanColumns} × ${tile.spanRows}`;
  const previewImage = tile.thumbnail || tile.image;

  return (
    <div
      className={`sport-tile sport-tile--${tile.model} sport-tile--${tile.tier}`}
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
          onFocus={(event) => {
            // Focusul produs de pointer nu trebuie să pornească o animație
            // înaintea activării cardului; aducerea în cadru este doar pentru tastatură.
            if (event.currentTarget.matches(':focus-visible')) onFocus(tile);
          }}
          onClick={(event) => {
            if (event.detail === 0) onKeyboardActivate(tile.id);
          }}
        >
          <span className="brand-slot__placeholder" aria-hidden="true">
            <span className="brand-slot__mark">B</span>
          </span>

          {previewImage && (
            <img
              className="sport-tile__media"
              data-src={previewImage}
              data-srcset={tile.srcSet || undefined}
              data-sizes={tile.sizes || `${Math.ceil(tile.width)}px`}
              data-preload={tile.featured ? 'high' : undefined}
              width={tile.imageWidth || Math.ceil(tile.width)}
              height={tile.imageHeight || Math.ceil(tile.height)}
              alt=""
              draggable="false"
              loading="eager"
              decoding="async"
              fetchPriority={tile.featured ? 'high' : 'low'}
            />
          )}

          <span className="brand-slot__meta">
            <span>{tile.featured ? 'MAIN CANVAS' : 'BRAND SPACE'}</span>
            <span>{frameNumber}</span>
          </span>

          <span className="brand-slot__title">
            <strong>{tile.title}</strong>
            <small>{format}</small>
          </span>
        </button>
      </div>
    </div>
  );
}

export default memo(MapTile);
