import { useCallback, useEffect, useRef, useState } from 'react';
import { gsap } from 'gsap';
import { CustomEase } from 'gsap/CustomEase';
import { MAP_CONFIG, clampCamera } from '../lib/layout';

const DRAG_THRESHOLD = 6;
const KEYBOARD_PAN_STEP = 130;

gsap.registerPlugin(CustomEase);

const MAP_CAMERA_EASE = CustomEase.create(
  'mapCameraEase',
  'M0,0 C0.35,0.18 0.22,1 1,1',
);

function getDistance(first, second) {
  return Math.hypot(second.x - first.x, second.y - first.y);
}

function getMidpoint(first, second) {
  return {
    x: (first.x + second.x) / 2,
    y: (first.y + second.y) / 2,
  };
}

export function useMapCamera({
  viewportRef,
  worldRef,
  featuredTile,
  disabled,
  resolveTile,
  onActivate,
  onZoomChange,
}) {
  const cameraRef = useRef({ tx: 0, ty: 0, scale: MAP_CONFIG.initialScale });
  const viewportSizeRef = useRef({ width: 0, height: 0 });
  const frameRef = useRef(0);
  const cameraTweenRef = useRef(null);
  const zoomTargetRef = useRef(null);
  const initializedRef = useRef(false);
  const reduceMotionRef = useRef(false);
  const wasDisabledRef = useRef(disabled);
  const [isDragging, setIsDragging] = useState(false);
  const gestureRef = useRef({
    mode: 'idle',
    pointers: new Map(),
    startPoint: null,
    startCamera: null,
    lastPoint: null,
    lastTime: 0,
    velocityX: 0,
    velocityY: 0,
    tileId: null,
    moved: false,
    pinched: false,
    pinchDistance: 0,
    pinchWorldPoint: null,
    viewportRect: null,
  });

  const writeCamera = useCallback(() => {
    const world = worldRef.current;
    if (!world) return;
    const { tx, ty, scale } = cameraRef.current;
    // O singură proprietate este schimbată per frame. Variabilele CSS pe părinte
    // s-ar propaga la toate cardurile și ar forța recalculări inutile de stil.
    world.style.transform = `translate3d(${tx}px, ${ty}px, 0) scale(${scale})`;
    onZoomChange?.(Math.round((scale / MAP_CONFIG.initialScale) * 100));
  }, [onZoomChange, worldRef]);

  const paintCamera = useCallback(() => {
    frameRef.current = 0;
    writeCamera();
  }, [writeCamera]);

  const schedulePaint = useCallback(() => {
    if (!frameRef.current) frameRef.current = requestAnimationFrame(paintCamera);
  }, [paintCamera]);

  const applyCamera = useCallback(
    (camera, options = {}) => {
      const { immediate = false, padding = MAP_CONFIG.edgePadding } = options;
      cameraRef.current = clampCamera(camera, viewportSizeRef.current, padding);

      if (immediate) {
        if (frameRef.current) cancelAnimationFrame(frameRef.current);
        frameRef.current = 0;
        writeCamera();
      } else {
        schedulePaint();
      }

      return cameraRef.current;
    },
    [schedulePaint, writeCamera],
  );

  const stopMotion = useCallback(() => {
    cameraTweenRef.current?.kill();
    cameraTweenRef.current = null;
    zoomTargetRef.current = null;
  }, []);

  const animateCamera = useCallback(
    (nextCamera, duration = 0.72, options = {}) => {
      const {
        ease = 'power3.out',
        onComplete,
        padding = MAP_CONFIG.edgePadding,
      } = options;
      stopMotion();
      const destination = clampCamera(nextCamera, viewportSizeRef.current, padding);

      if (reduceMotionRef.current || duration <= 0) {
        applyCamera(destination, { immediate: true, padding });
        onComplete?.();
        return;
      }

      const proxy = { ...cameraRef.current };
      cameraTweenRef.current = gsap.to(proxy, {
        ...destination,
        duration,
        ease,
        overwrite: true,
        onUpdate: () => applyCamera(proxy, { immediate: true, padding }),
        onComplete: () => {
          cameraTweenRef.current = null;
          zoomTargetRef.current = null;
          onComplete?.();
        },
      });
    },
    [applyCamera, stopMotion],
  );

  const focusOnTile = useCallback(
    (tile, onComplete) => {
      if (!tile) return;

      const viewport = viewportSizeRef.current;
      const current = cameraRef.current;
      const horizontalFit = (viewport.width * 0.72) / tile.width;
      const verticalFit = (viewport.height * 0.68) / tile.height;
      const focusPadding = {
        x: viewport.width / 2,
        y: viewport.height / 2,
      };
      const scale = Math.min(
        MAP_CONFIG.maxScale,
        Math.max(MAP_CONFIG.initialScale, Math.min(horizontalFit, verticalFit)),
      );
      const destination = clampCamera(
        {
          scale,
          tx: viewport.width / 2 - (tile.x + tile.width / 2) * scale,
          ty: viewport.height / 2 - (tile.y + tile.height / 2) * scale,
        },
        viewport,
        focusPadding,
      );
      const travel = Math.hypot(destination.tx - current.tx, destination.ty - current.ty);
      const viewportDiagonal = Math.max(1, Math.hypot(viewport.width, viewport.height));
      const duration = Math.min(1.85, Math.max(1.1, 1.02 + (travel / viewportDiagonal) * 0.16));

      animateCamera(destination, duration, {
        ease: MAP_CAMERA_EASE,
        onComplete,
        padding: focusPadding,
      });
    },
    [animateCamera],
  );

  const activateTile = useCallback(
    (tileId) => {
      const tile = resolveTile?.(tileId);
      if (!tile || disabled) return;
      focusOnTile(tile, () => onActivate?.(tile));
    },
    [disabled, focusOnTile, onActivate, resolveTile],
  );

  const centerOnTile = useCallback(
    (tile, preferredScale = cameraRef.current.scale, animated = true) => {
      if (!tile) return;
      const viewport = viewportSizeRef.current;
      const scale = Math.min(MAP_CONFIG.maxScale, Math.max(MAP_CONFIG.minScale, preferredScale));
      const destination = {
        scale,
        tx: viewport.width / 2 - (tile.x + tile.width / 2) * scale,
        ty: viewport.height / 2 - (tile.y + tile.height / 2) * scale,
      };

      if (animated) animateCamera(destination, 0.9);
      else applyCamera(destination);
    },
    [animateCamera, applyCamera],
  );

  const reset = useCallback(() => {
    centerOnTile(featuredTile, MAP_CONFIG.initialScale, true);
    viewportRef.current?.focus({ preventScroll: true });
  }, [centerOnTile, featuredTile, viewportRef]);

  const smoothZoomBy = useCallback(
    (multiplier, anchorX, anchorY) => {
      const base = zoomTargetRef.current ?? cameraRef.current;
      const scale = Math.min(
        MAP_CONFIG.maxScale,
        Math.max(MAP_CONFIG.minScale, base.scale * multiplier),
      );
      const worldX = (anchorX - base.tx) / base.scale;
      const worldY = (anchorY - base.ty) / base.scale;
      const destination = clampCamera({
        scale,
        tx: anchorX - worldX * scale,
        ty: anchorY - worldY * scale,
      }, viewportSizeRef.current);

      cameraTweenRef.current?.kill();
      zoomTargetRef.current = destination;

      if (reduceMotionRef.current) {
        applyCamera(destination);
        zoomTargetRef.current = null;
        return;
      }

      const proxy = { ...cameraRef.current };
      cameraTweenRef.current = gsap.to(proxy, {
        ...destination,
        duration: 0.46,
        ease: MAP_CAMERA_EASE,
        overwrite: true,
        onUpdate: () => applyCamera(proxy, { immediate: true }),
        onComplete: () => {
          cameraTweenRef.current = null;
          zoomTargetRef.current = null;
        },
      });
    },
    [applyCamera],
  );

  const bringTileIntoView = useCallback(
    (tile) => {
      if (!tile) return;
      const camera = cameraRef.current;
      const viewport = viewportSizeRef.current;
      const margin = Math.min(150, viewport.width * 0.13);
      const left = camera.tx + tile.x * camera.scale;
      const right = camera.tx + (tile.x + tile.width) * camera.scale;
      const top = camera.ty + tile.y * camera.scale;
      const bottom = camera.ty + (tile.y + tile.height) * camera.scale;
      let tx = camera.tx;
      let ty = camera.ty;

      if (left < margin) tx += margin - left;
      if (right > viewport.width - margin) tx -= right - (viewport.width - margin);
      if (top < margin) ty += margin - top;
      if (bottom > viewport.height - margin) ty -= bottom - (viewport.height - margin);
      if (tx !== camera.tx || ty !== camera.ty) animateCamera({ ...camera, tx, ty }, 0.58);
    },
    [animateCamera],
  );

  const startMomentum = useCallback(
    (velocityX, velocityY) => {
      if (reduceMotionRef.current || disabled) return;
      const cappedX = Math.max(-2600, Math.min(2600, velocityX));
      const cappedY = Math.max(-2600, Math.min(2600, velocityY));
      const speed = Math.hypot(cappedX, cappedY);
      if (speed < 90) return;

      const duration = Math.min(1.45, Math.max(0.52, speed / 1850));
      const current = cameraRef.current;
      animateCamera(
        {
          ...current,
          tx: current.tx + cappedX * duration * 0.34,
          ty: current.ty + cappedY * duration * 0.34,
        },
        duration,
      );
    },
    [animateCamera, disabled],
  );

  useEffect(() => {
    const media = window.matchMedia('(prefers-reduced-motion: reduce)');
    const updatePreference = () => {
      reduceMotionRef.current = media.matches;
      if (media.matches) stopMotion();
    };
    updatePreference();
    media.addEventListener('change', updatePreference);
    return () => media.removeEventListener('change', updatePreference);
  }, [stopMotion]);

  useEffect(() => {
    const viewport = viewportRef.current;
    if (!viewport) return undefined;

    const observer = new ResizeObserver(([entry]) => {
      const nextSize = {
        width: entry.contentRect.width,
        height: entry.contentRect.height,
      };
      const previousSize = viewportSizeRef.current;
      const camera = cameraRef.current;
      viewportSizeRef.current = nextSize;

      if (!initializedRef.current && nextSize.width && nextSize.height) {
        initializedRef.current = true;
        centerOnTile(featuredTile, MAP_CONFIG.initialScale, false);
        return;
      }

      if (previousSize.width && previousSize.height) {
        const centerWorldX = (previousSize.width / 2 - camera.tx) / camera.scale;
        const centerWorldY = (previousSize.height / 2 - camera.ty) / camera.scale;
        applyCamera({
          ...camera,
          tx: nextSize.width / 2 - centerWorldX * camera.scale,
          ty: nextSize.height / 2 - centerWorldY * camera.scale,
        });
      }
    });

    observer.observe(viewport);
    return () => observer.disconnect();
  }, [applyCamera, centerOnTile, featuredTile, viewportRef]);

  useEffect(() => {
    const wasDisabled = wasDisabledRef.current;
    wasDisabledRef.current = disabled;

    if (disabled) {
      stopMotion();
      return;
    }

    // Cardurile de pe margini primesc temporar suficient overscan pentru a fi
    // centrate. După închiderea modalului revenim fluid la limitele normale.
    if (wasDisabled) {
      const current = cameraRef.current;
      const destination = clampCamera(current, viewportSizeRef.current);
      const needsNormalization =
        Math.abs(destination.tx - current.tx) > 0.5 ||
        Math.abs(destination.ty - current.ty) > 0.5;
      if (needsNormalization) {
        animateCamera(destination, 0.62, { ease: MAP_CAMERA_EASE });
      }
    }
  }, [animateCamera, disabled, stopMotion]);

  useEffect(
    () => () => {
      stopMotion();
      if (frameRef.current) cancelAnimationFrame(frameRef.current);
    },
    [stopMotion],
  );

  const onWheel = useCallback(
    (event) => {
      if (disabled || event.ctrlKey || event.metaKey) return;
      event.preventDefault();
      const delta = event.deltaY * (
        event.deltaMode === WheelEvent.DOM_DELTA_LINE
          ? 16
          : event.deltaMode === WheelEvent.DOM_DELTA_PAGE
            ? viewportSizeRef.current.height
            : 1
      );
      smoothZoomBy(Math.exp(-delta * 0.00105), event.clientX, event.clientY);
    },
    [disabled, smoothZoomBy],
  );

  useEffect(() => {
    const viewport = viewportRef.current;
    if (!viewport) return undefined;
    viewport.addEventListener('wheel', onWheel, { passive: false });
    return () => viewport.removeEventListener('wheel', onWheel);
  }, [onWheel, viewportRef]);

  const onPointerDown = useCallback(
    (event) => {
      if (disabled || (event.pointerType === 'mouse' && event.button !== 0)) return;
      stopMotion();
      const viewport = viewportRef.current;
      const gesture = gestureRef.current;
      const rect = viewport.getBoundingClientRect();
      const point = { x: event.clientX - rect.left, y: event.clientY - rect.top };
      const tileId = event.target.closest('[data-tile-id]')?.dataset.tileId ?? null;

      viewport.setPointerCapture(event.pointerId);
      gesture.pointers.set(event.pointerId, point);

      if (gesture.pointers.size === 1) {
        gesture.mode = 'pan';
        gesture.startPoint = point;
        gesture.startCamera = { ...cameraRef.current };
        gesture.lastPoint = point;
        gesture.lastTime = event.timeStamp;
        gesture.velocityX = 0;
        gesture.velocityY = 0;
        gesture.tileId = tileId;
        gesture.moved = false;
        gesture.pinched = false;
        gesture.viewportRect = rect;
        if (!tileId) viewport.focus({ preventScroll: true });
      } else if (gesture.pointers.size === 2) {
        const [first, second] = [...gesture.pointers.values()];
        const midpoint = getMidpoint(first, second);
        const camera = cameraRef.current;
        gesture.mode = 'pinch';
        gesture.pinched = true;
        gesture.moved = true;
        gesture.tileId = null;
        gesture.pinchDistance = Math.max(1, getDistance(first, second));
        gesture.startCamera = { ...camera };
        gesture.pinchWorldPoint = {
          x: (midpoint.x - camera.tx) / camera.scale,
          y: (midpoint.y - camera.ty) / camera.scale,
        };
        setIsDragging(true);
      }
    },
    [disabled, stopMotion, viewportRef],
  );

  const onPointerMove = useCallback(
    (event) => {
      const gesture = gestureRef.current;
      if (!gesture.pointers.has(event.pointerId) || disabled) return;
      const rect = gesture.viewportRect ?? { left: 0, top: 0 };
      const point = { x: event.clientX - rect.left, y: event.clientY - rect.top };
      gesture.pointers.set(event.pointerId, point);

      if (gesture.mode === 'pinch' && gesture.pointers.size >= 2) {
        const [first, second] = [...gesture.pointers.values()];
        const midpoint = getMidpoint(first, second);
        const distance = Math.max(1, getDistance(first, second));
        const scale = Math.min(
          MAP_CONFIG.maxScale,
          Math.max(MAP_CONFIG.minScale, gesture.startCamera.scale * (distance / gesture.pinchDistance)),
        );
        applyCamera({
          scale,
          tx: midpoint.x - gesture.pinchWorldPoint.x * scale,
          ty: midpoint.y - gesture.pinchWorldPoint.y * scale,
        });
        return;
      }

      if (gesture.mode === 'pan' && gesture.startPoint) {
        const dx = point.x - gesture.startPoint.x;
        const dy = point.y - gesture.startPoint.y;
        if (!gesture.moved && Math.hypot(dx, dy) >= DRAG_THRESHOLD) {
          gesture.moved = true;
          setIsDragging(true);
        }

        if (gesture.moved) {
          applyCamera({
            ...gesture.startCamera,
            tx: gesture.startCamera.tx + dx,
            ty: gesture.startCamera.ty + dy,
          });

          const elapsed = Math.max(8, event.timeStamp - gesture.lastTime);
          const instantX = ((point.x - gesture.lastPoint.x) / elapsed) * 1000;
          const instantY = ((point.y - gesture.lastPoint.y) / elapsed) * 1000;
          gesture.velocityX = gesture.velocityX * 0.66 + instantX * 0.34;
          gesture.velocityY = gesture.velocityY * 0.66 + instantY * 0.34;
          gesture.lastPoint = point;
          gesture.lastTime = event.timeStamp;
        }
      }
    },
    [applyCamera, disabled, viewportRef],
  );

  const finishPointer = useCallback(
    (event, cancelled = false) => {
      const gesture = gestureRef.current;
      if (!gesture.pointers.has(event.pointerId)) return;
      const wasOnlyPointer = gesture.pointers.size === 1;
      const tileId = gesture.tileId;
      const moved = gesture.moved;
      const velocityX = gesture.velocityX;
      const velocityY = gesture.velocityY;
      const shouldActivate =
        !cancelled && wasOnlyPointer && gesture.mode === 'pan' && !moved && !gesture.pinched && tileId;

      gesture.pointers.delete(event.pointerId);
      if (gesture.pointers.size === 1) {
        const remainingPoint = [...gesture.pointers.values()][0];
        gesture.mode = 'pan';
        gesture.startPoint = remainingPoint;
        gesture.startCamera = { ...cameraRef.current };
        gesture.lastPoint = remainingPoint;
        gesture.lastTime = event.timeStamp;
        gesture.velocityX = 0;
        gesture.velocityY = 0;
        gesture.tileId = null;
        gesture.moved = true;
        gesture.pinched = true;
      } else if (gesture.pointers.size === 0) {
        gesture.mode = 'idle';
        gesture.startPoint = null;
        gesture.tileId = null;
        gesture.viewportRect = null;
        setIsDragging(false);
        if (!cancelled && moved && !gesture.pinched) startMomentum(velocityX, velocityY);
      }

      if (shouldActivate) activateTile(tileId);
    },
    [activateTile, startMomentum],
  );

  const onKeyDown = useCallback(
    (event) => {
      if (disabled || event.ctrlKey || event.metaKey || event.altKey) return;
      const camera = cameraRef.current;
      const viewport = viewportSizeRef.current;
      let handled = true;

      if (event.key === 'ArrowLeft') animateCamera({ ...camera, tx: camera.tx + KEYBOARD_PAN_STEP }, 0.36);
      else if (event.key === 'ArrowRight') animateCamera({ ...camera, tx: camera.tx - KEYBOARD_PAN_STEP }, 0.36);
      else if (event.key === 'ArrowUp') animateCamera({ ...camera, ty: camera.ty + KEYBOARD_PAN_STEP }, 0.36);
      else if (event.key === 'ArrowDown') animateCamera({ ...camera, ty: camera.ty - KEYBOARD_PAN_STEP }, 0.36);
      else if (event.key === '+' || event.key === '=') {
        smoothZoomBy(1.1, viewport.width / 2, viewport.height / 2);
      } else if (event.key === '-' || event.key === '_') {
        smoothZoomBy(1 / 1.1, viewport.width / 2, viewport.height / 2);
      } else if (event.key === '0') reset();
      else handled = false;

      if (handled) event.preventDefault();
    },
    [animateCamera, disabled, reset, smoothZoomBy],
  );

  return {
    isDragging,
    reset,
    centerOnTile,
    activateTile,
    bringTileIntoView,
    viewportHandlers: {
      onPointerDown,
      onPointerMove,
      onPointerUp: (event) => finishPointer(event, false),
      onPointerCancel: (event) => finishPointer(event, true),
      onLostPointerCapture: (event) => finishPointer(event, true),
      onKeyDown,
    },
  };
}
