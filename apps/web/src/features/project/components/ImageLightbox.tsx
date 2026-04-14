import { useEffect, useRef, useState, useCallback } from 'react';
import { X, ZoomIn, ZoomOut, RotateCcw, ChevronLeft, ChevronRight } from 'lucide-react';

interface LightboxImage {
  src: string;
  alt: string;
}

interface ImageLightboxProps {
  images: LightboxImage[];
  initialIndex: number;
  onClose: () => void;
}

const MIN_SCALE = 0.5;
const MAX_SCALE = 5;
const ZOOM_STEP = 0.4;

export function ImageLightbox({ images, initialIndex, onClose }: ImageLightboxProps) {
  const [index, setIndex] = useState(initialIndex);
  const [scale, setScale] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const dragging = useRef(false);
  const dragStart = useRef({ x: 0, y: 0 });
  const offsetStart = useRef({ x: 0, y: 0 });

  const reset = useCallback(() => {
    setScale(1);
    setOffset({ x: 0, y: 0 });
  }, []);

  const goTo = useCallback((next: number) => {
    setIndex(next);
    reset();
  }, [reset]);

  const prev = useCallback(() => goTo((index - 1 + images.length) % images.length), [goTo, index, images.length]);
  const next = useCallback(() => goTo((index + 1) % images.length), [goTo, index, images.length]);

  const zoomIn = () => setScale((s) => Math.min(s + ZOOM_STEP, MAX_SCALE));
  const zoomOut = () => setScale((s) => Math.max(s - ZOOM_STEP, MIN_SCALE));

  // Keyboard navigation
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowLeft' && images.length > 1) prev();
      if (e.key === 'ArrowRight' && images.length > 1) next();
      if (e.key === '+' || e.key === '=') zoomIn();
      if (e.key === '-') zoomOut();
      if (e.key === '0') reset();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose, prev, next, reset]);

  // Wheel zoom
  const onWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const delta = e.deltaY < 0 ? ZOOM_STEP : -ZOOM_STEP;
    setScale((s) => Math.min(Math.max(s + delta, MIN_SCALE), MAX_SCALE));
  };

  // Drag to pan
  const onMouseDown = (e: React.MouseEvent) => {
    if (scale === 1) return;
    dragging.current = true;
    dragStart.current = { x: e.clientX, y: e.clientY };
    offsetStart.current = offset;
  };
  const onMouseMove = (e: React.MouseEvent) => {
    if (!dragging.current) return;
    setOffset({
      x: offsetStart.current.x + (e.clientX - dragStart.current.x),
      y: offsetStart.current.y + (e.clientY - dragStart.current.y),
    });
  };
  const onMouseUp = () => { dragging.current = false; };

  const current = images[index];

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col bg-black/90"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      {/* Top bar */}
      <div className="flex items-center justify-between px-4 py-2 shrink-0">
        <span className="text-white/60 text-sm select-none">
          {images.length > 1 ? `${index + 1} / ${images.length}` : current.alt}
        </span>
        <div className="flex items-center gap-1">
          <button onClick={zoomOut} className="p-2 rounded hover:bg-white/10 text-white/80 hover:text-white transition-colors" title="Zoom out (-)">
            <ZoomOut size={18} />
          </button>
          <span className="text-white/60 text-xs w-12 text-center select-none">{Math.round(scale * 100)}%</span>
          <button onClick={zoomIn} className="p-2 rounded hover:bg-white/10 text-white/80 hover:text-white transition-colors" title="Zoom in (+)">
            <ZoomIn size={18} />
          </button>
          <button onClick={reset} className="p-2 rounded hover:bg-white/10 text-white/80 hover:text-white transition-colors" title="Reset (0)">
            <RotateCcw size={16} />
          </button>
          <div className="w-px h-5 bg-white/20 mx-1" />
          <button onClick={onClose} className="p-2 rounded hover:bg-white/10 text-white/80 hover:text-white transition-colors" title="Close (Esc)">
            <X size={18} />
          </button>
        </div>
      </div>

      {/* Image area */}
      <div
        className="flex-1 flex items-center justify-center overflow-hidden relative"
        onWheel={onWheel}
        onMouseDown={onMouseDown}
        onMouseMove={onMouseMove}
        onMouseUp={onMouseUp}
        onMouseLeave={onMouseUp}
        style={{ cursor: scale > 1 ? (dragging.current ? 'grabbing' : 'grab') : 'default' }}
      >
        <img
          key={current.src}
          src={current.src}
          alt={current.alt}
          draggable={false}
          style={{
            transform: `translate(${offset.x}px, ${offset.y}px) scale(${scale})`,
            transition: dragging.current ? 'none' : 'transform 0.15s ease',
            maxWidth: '90vw',
            maxHeight: '80vh',
            userSelect: 'none',
          }}
          onDoubleClick={() => scale === 1 ? setScale(2) : reset()}
        />
      </div>

      {/* Prev / Next */}
      {images.length > 1 && (
        <>
          <button
            onClick={prev}
            className="absolute left-3 top-1/2 -translate-y-1/2 p-2 rounded-full bg-black/50 hover:bg-black/70 text-white transition-colors"
          >
            <ChevronLeft size={24} />
          </button>
          <button
            onClick={next}
            className="absolute right-3 top-1/2 -translate-y-1/2 p-2 rounded-full bg-black/50 hover:bg-black/70 text-white transition-colors"
          >
            <ChevronRight size={24} />
          </button>
        </>
      )}

      {/* Thumbnail strip */}
      {images.length > 1 && (
        <div className="flex justify-center gap-2 py-3 shrink-0">
          {images.map((img, i) => (
            <button
              key={img.src}
              onClick={() => goTo(i)}
              className={`h-10 w-10 rounded border-2 overflow-hidden transition-colors ${
                i === index ? 'border-white' : 'border-transparent opacity-50 hover:opacity-80'
              }`}
            >
              <img src={img.src} alt={img.alt} className="h-full w-full object-cover" />
            </button>
          ))}
        </div>
      )}

      <p className="text-center text-white/30 text-xs pb-2 select-none">
        Scroll to zoom · Double-click to zoom in/out · Drag to pan
      </p>
    </div>
  );
}
