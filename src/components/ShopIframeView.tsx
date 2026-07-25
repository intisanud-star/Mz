import React, { useState, useEffect, useRef } from 'react';
import { ArrowLeft, ArrowUp, ArrowDown } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface ShopIframeViewProps {
  onClose: () => void;
  iframeUrl: string;
}

export const ShopIframeView: React.FC<ShopIframeViewProps> = ({ onClose, iframeUrl }) => {
  const [dragState, setDragState] = useState<'top' | 'bottom' | null>(null);
  const [pullDistance, setPullDistance] = useState(0);
  const startYRef = useRef<number>(0);
  const currentYRef = useRef<number>(0);
  const threshold = 75; // Pull distance threshold in pixels to trigger close

  useEffect(() => {
    const handleMove = (e: MouseEvent | TouchEvent) => {
      if (!dragState) return;

      const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
      currentYRef.current = clientY;
      const deltaY = clientY - startYRef.current;

      if (dragState === 'top') {
        // Dragging downwards
        if (deltaY > 0) {
          // Add resistance/damping to the pull
          const dampedDistance = Math.pow(deltaY, 0.85);
          setPullDistance(dampedDistance);
        } else {
          setPullDistance(0);
        }
      } else if (dragState === 'bottom') {
        // Dragging upwards
        if (deltaY < 0) {
          const dampedDistance = Math.pow(-deltaY, 0.85);
          setPullDistance(dampedDistance);
        } else {
          setPullDistance(0);
        }
      }
    };

    const handleEnd = () => {
      if (!dragState) return;

      if (pullDistance >= threshold) {
        onClose();
      }

      setDragState(null);
      setPullDistance(0);
    };

    if (dragState) {
      window.addEventListener('mousemove', handleMove, { passive: false });
      window.addEventListener('mouseup', handleEnd);
      window.addEventListener('touchmove', handleMove, { passive: false });
      window.addEventListener('touchend', handleEnd);
    }

    return () => {
      window.removeEventListener('mousemove', handleMove);
      window.removeEventListener('mouseup', handleEnd);
      window.removeEventListener('touchmove', handleMove);
      window.removeEventListener('touchend', handleEnd);
    };
  }, [dragState, pullDistance, onClose]);

  const initiateDrag = (type: 'top' | 'bottom', clientY: number) => {
    dragState && handleEndCleanup();
    setDragState(type);
    startYRef.current = clientY;
    currentYRef.current = clientY;
    setPullDistance(0);
  };

  const handleEndCleanup = () => {
    setDragState(null);
    setPullDistance(0);
  };

  const percentToThreshold = Math.min(100, (pullDistance / threshold) * 100);

  return (
    <div className="fixed inset-0 w-screen h-screen bg-white overflow-hidden z-[99999] select-none">
      
      {/* 
        Top Edge Pull Zone 
        An invisible/subtle touch-receptive layer at the very top of the screen to start pulling down.
      */}
      <div 
        onMouseDown={(e) => initiateDrag('top', e.clientY)}
        onTouchStart={(e) => initiateDrag('top', e.touches[0].clientY)}
        style={{ top: 0 }}
        className="absolute left-0 right-0 h-10 z-[100000] cursor-row-resize flex items-center justify-center bg-gradient-to-b from-black/[0.03] to-transparent"
      >
        <div className="w-16 h-1 bg-zinc-300 rounded-full opacity-60 pointer-events-none mt-1" />
      </div>

      {/* 
        Bottom Edge Pull Zone 
        An invisible/subtle touch-receptive layer at the very bottom of the screen to start pulling up.
      */}
      <div 
        onMouseDown={(e) => initiateDrag('bottom', e.clientY)}
        onTouchStart={(e) => initiateDrag('bottom', e.touches[0].clientY)}
        style={{ bottom: 0 }}
        className="absolute left-0 right-0 h-12 z-[100000] cursor-row-resize flex items-center justify-center bg-gradient-to-t from-black/[0.03] to-transparent"
      >
        <div className="w-16 h-1 bg-zinc-300 rounded-full opacity-60 pointer-events-none mb-2" />
      </div>

      {/* Pull down visual indicator overlay (rendered when pulling down from top) */}
      <AnimatePresence>
        {dragState === 'top' && pullDistance > 8 && (
          <motion.div 
            initial={{ opacity: 0, y: -20, scale: 0.95 }}
            animate={{ opacity: 1, y: Math.min(60, pullDistance * 0.6), scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.95 }}
            transition={{ type: 'spring', damping: 20, stiffness: 300 }}
            className="absolute left-1/2 -translate-x-1/2 z-[99999] flex flex-col items-center pointer-events-none"
          >
            <div className={`flex items-center gap-2 px-4 py-2 rounded-full shadow-lg border transition-all ${
              pullDistance >= threshold 
                ? 'bg-[#2481CC] border-[#2481CC] text-white scale-105' 
                : 'bg-white border-zinc-200 text-zinc-700'
            }`}>
              <motion.div
                animate={{ rotate: pullDistance >= threshold ? 180 : 0 }}
                transition={{ type: 'spring', damping: 15 }}
              >
                <ArrowDown size={15} className="stroke-[3]" />
              </motion.div>
              <span className="text-xs font-black uppercase tracking-wider">
                {pullDistance >= threshold ? 'Release to close' : 'Pull down to close'}
              </span>
            </div>
            {/* Minimal Progress Bar */}
            <div className="w-24 h-1 bg-zinc-100 rounded-full overflow-hidden mt-2 shadow-sm border border-zinc-200/40">
              <div 
                style={{ width: `${percentToThreshold}%` }} 
                className={`h-full transition-all duration-75 ${pullDistance >= threshold ? 'bg-[#2481CC]' : 'bg-zinc-400'}`} 
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Pull up visual indicator overlay (rendered when pulling up from bottom) */}
      <AnimatePresence>
        {dragState === 'bottom' && pullDistance > 8 && (
          <motion.div 
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: -Math.min(60, pullDistance * 0.6), scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            transition={{ type: 'spring', damping: 20, stiffness: 300 }}
            className="absolute bottom-4 left-1/2 -translate-x-1/2 z-[99999] flex flex-col items-center pointer-events-none"
          >
            <div className={`flex items-center gap-2 px-4 py-2 rounded-full shadow-lg border transition-all ${
              pullDistance >= threshold 
                ? 'bg-[#2481CC] border-[#2481CC] text-white scale-105' 
                : 'bg-white border-zinc-200 text-zinc-700'
            }`}>
              <motion.div
                animate={{ rotate: pullDistance >= threshold ? 180 : 0 }}
                transition={{ type: 'spring', damping: 15 }}
              >
                <ArrowUp size={15} className="stroke-[3]" />
              </motion.div>
              <span className="text-xs font-black uppercase tracking-wider">
                {pullDistance >= threshold ? 'Release to close' : 'Pull up to close'}
              </span>
            </div>
            {/* Minimal Progress Bar */}
            <div className="w-24 h-1 bg-zinc-100 rounded-full overflow-hidden mt-2 shadow-sm border border-zinc-200/40">
              <div 
                style={{ width: `${percentToThreshold}%` }} 
                className={`h-full transition-all duration-75 ${pullDistance >= threshold ? 'bg-[#2481CC]' : 'bg-zinc-400'}`} 
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Full screen Shop Iframe container */}
      <div className="w-full h-full relative overflow-hidden bg-white select-none">
        <iframe 
          src={iframeUrl} 
          style={{
            width: '1px',
            minWidth: '100%',
            height: '100%',
            border: 'none',
          }}
          className="absolute inset-0 w-full h-full bg-white"
          title="Shop View"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
        />
      </div>
    </div>
  );
};
