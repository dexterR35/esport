import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useLayoutEffect,
  useMemo,
  useRef,
} from 'react';
import { gsap } from 'gsap';
import { useMapCamera } from '../hooks/useMapCamera';
import { useProgressiveImages } from '../hooks/useProgressiveImages';
import { WORLD_SIZE } from '../lib/layout';
import MapTile from './MapTile';

const MapViewport = forwardRef(function MapViewport(
  { tiles, disabled, onSelect, onZoomChange, onCenterVisibilityChange },
  forwardedRef,
) {
  const viewportRef = useRef(null);
  const worldRef = useRef(null);
  const featuredTile = tiles.find((tile) => tile.featured);
  const tileById = useMemo(() => new Map(tiles.map((tile) => [tile.id, tile])), [tiles]);
  const resolveTile = useCallback((tileId) => tileById.get(tileId), [tileById]);
  const camera = useMapCamera({
    viewportRef,
    worldRef,
    featuredTile,
    disabled,
    resolveTile,
    onZoomChange,
    onActivate: onSelect,
  });
  useProgressiveImages({ viewportRef, worldRef, dependency: tiles });

  useLayoutEffect(() => {
    const world = worldRef.current;
    if (!world) return undefined;

    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const context = gsap.context(() => {
      const revealNodes = gsap.utils.toArray('.sport-tile__reveal');

      if (reduceMotion) {
        gsap.set(revealNodes, { autoAlpha: 1 });
        return;
      }

      gsap.fromTo(
        revealNodes,
        { autoAlpha: 0, scale: 0.94, y: 28 },
        {
          autoAlpha: 1,
          scale: 1,
          y: 0,
          duration: 0.82,
          stagger: { each: 0.003, from: 0 },
          ease: 'power3.out',
          clearProps: 'transform',
        },
      );

    }, world);

    return () => context.revert();
  }, [tiles]);

  useEffect(() => {
    const viewport = viewportRef.current;
    const featuredNode = worldRef.current?.querySelector('[data-featured="true"]');
    if (!viewport || !featuredNode) return undefined;

    const observer = new IntersectionObserver(
      ([entry]) => {
        onCenterVisibilityChange?.(entry.isIntersecting && entry.intersectionRatio >= 0.12);
      },
      {
        root: viewport,
        threshold: [0, 0.12],
      },
    );

    observer.observe(featuredNode);
    return () => observer.disconnect();
  }, [onCenterVisibilityChange, tiles]);

  useImperativeHandle(
    forwardedRef,
    () => ({
      reset: camera.reset,
      center: () => {
        camera.centerOnTile(featuredTile);
        viewportRef.current?.focus({ preventScroll: true });
      },
    }),
    [camera],
  );

  return (
    <div
      ref={viewportRef}
      className={`map-viewport${camera.isDragging ? ' map-viewport--dragging' : ''}`}
      tabIndex={0}
      role="region"
      aria-label="Hartă interactivă cu sloturi media"
      aria-describedby="map-instructions"
      {...camera.viewportHandlers}
    >
      <div
        ref={worldRef}
        className="map-world"
        style={{ width: WORLD_SIZE.width, height: WORLD_SIZE.height }}
      >
        <div className="map-plane">
          {tiles.map((tile) => (
            <MapTile
              key={tile.id}
              tile={tile}
              onKeyboardActivate={camera.activateTile}
              onFocus={camera.bringTileIntoView}
            />
          ))}
        </div>
      </div>
    </div>
  );
});

export default MapViewport;
