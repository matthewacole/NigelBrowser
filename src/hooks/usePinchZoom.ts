import { useRef, useCallback, useState } from 'react';

const MIN_ZOOM = 1;
const MAX_ZOOM = 2.5;

export function usePinchZoom() {
  const [zoom, setZoom] = useState(1);
  const [panX, setPanX] = useState(0);
  const [panY, setPanY] = useState(0);

  const pinchRef = useRef({
    initialDist: 0,
    initZoom: 1,
    initPanX: 0,
    initPanY: 0,
    midX: 0,
    midY: 0,
    lastTap: 0,
    singleX: 0,
    singleY: 0,
    isPinching: false,
    isPanning: false,
  });

  const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));

  const dist = (t1: React.Touch, t2: React.Touch) =>
    Math.hypot(t1.clientX - t2.clientX, t1.clientY - t2.clientY);

  const onTouchStart = useCallback((e: React.TouchEvent) => {
    const r = pinchRef.current;
    const now = Date.now();

    if (e.touches.length === 2) {
      e.preventDefault();
      e.stopPropagation();
      r.isPinching = true;
      r.initialDist = dist(e.touches[0], e.touches[1]);
      r.initZoom = zoom;
      r.initPanX = panX;
      r.initPanY = panY;
      r.midX = (e.touches[0].clientX + e.touches[1].clientX) / 2;
      r.midY = (e.touches[0].clientY + e.touches[1].clientY) / 2;
      r.isPanning = false;
    } else if (e.touches.length === 1 && zoom > 1) {
      r.isPanning = true;
      r.singleX = e.touches[0].clientX;
      r.singleY = e.touches[0].clientY;
      r.isPinching = false;
    }

    if (now - r.lastTap < 300) {
      setZoom(1);
      setPanX(0);
      setPanY(0);
      r.lastTap = 0;
      r.isPinching = false;
      r.isPanning = false;
      return;
    }
    r.lastTap = now;
  }, [zoom, panX]);

  const onTouchMove = useCallback((e: React.TouchEvent) => {
    const r = pinchRef.current;

    if (e.touches.length === 2 && r.isPinching) {
      e.preventDefault();
      e.stopPropagation();
      const d = dist(e.touches[0], e.touches[1]);
      const ratio = d / r.initialDist;
      const newZoom = clamp(r.initZoom * ratio, MIN_ZOOM, MAX_ZOOM);
      setZoom(newZoom);

      const midX = (e.touches[0].clientX + e.touches[1].clientX) / 2;
      const midY = (e.touches[0].clientY + e.touches[1].clientY) / 2;
      const dx = midX - r.midX;
      const dy = midY - r.midY;
      const newPanX = r.initPanX + dx;
      const newPanY = r.initPanY + dy;
      setPanX(newPanX);
      setPanY(newPanY);
    } else if (e.touches.length === 1 && r.isPanning && zoom > 1) {
      e.preventDefault();
      e.stopPropagation();
      const dx = e.touches[0].clientX - r.singleX;
      const dy = e.touches[0].clientY - r.singleY;
      setPanX(prev => prev + dx);
      setPanY(prev => prev + dy);
      r.singleX = e.touches[0].clientX;
      r.singleY = e.touches[0].clientY;
    }
  }, [zoom]);

  const onTouchEnd = useCallback((e: React.TouchEvent) => {
    const r = pinchRef.current;
    if (e.touches.length < 2) {
      r.isPinching = false;
    }
    if (e.touches.length < 1) {
      r.isPanning = false;
    }
  }, []);

  const boardTransform = zoom !== 1 || panX !== 0 || panY !== 0
    ? `translate(${panX}px, ${panY}px) scale(${zoom})`
    : '';

  return {
    zoom,
    panX,
    panY,
    boardTransform,
    touchHandlers: { onTouchStart, onTouchMove, onTouchEnd },
  };
}
