import { useRef, useState, useEffect } from 'react';
import { useSessionStore, Node as TimelineNode } from '../../store/useSessionStore';
import * as Tone from 'tone';
import { TrackVisualizer } from './TrackVisualizer';
import { ZoomIn, ZoomOut } from 'lucide-react';
import { EnvelopeGraph } from './EnvelopeGraph';

// Timeline Constants

const NodeBlock = ({ node, pixelsPerSecond, trackHeight = 80 }: { node: TimelineNode, pixelsPerSecond: number, trackHeight?: number }) => {
  const [isDragging, setIsDragging] = useState(false);
  const [isResizingRight, setIsResizingRight] = useState(false);
  const [isResizingLeft, setIsResizingLeft] = useState(false);

  const [dragOffset, setDragOffset] = useState(0);
  const [leftPos, setLeftPos] = useState(node.startTime * pixelsPerSecond);
  const [widthPos, setWidthPos] = useState(node.duration * pixelsPerSecond);
  const { updateNodeTiming } = useSessionStore();

  const handleMouseDown = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsDragging(true);
    setDragOffset(e.clientX - leftPos);
    useSessionStore.getState().selectNode(node.id);
  };

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (isDragging) {
        setLeftPos(prev => Math.max(0, prev + e.movementX));
      } else if (isResizingRight) {
        setWidthPos(prev => Math.max(10, prev + e.movementX));
      } else if (isResizingLeft) {
        const delta = e.movementX;
        setLeftPos(prev => {
          const next = Math.max(0, prev + delta);
          if (next > 0) {
            setWidthPos(w => Math.max(10, w - delta));
          }
          return next;
        });
      }
    };

    const handleMouseUp = () => {
      if (isDragging || isResizingRight || isResizingLeft) {
        setIsDragging(false);
        setIsResizingRight(false);
        setIsResizingLeft(false);

        // Dispatch to store
        updateNodeTiming(node.id, leftPos / pixelsPerSecond, widthPos / pixelsPerSecond);
      }
    };

    if (isDragging || isResizingRight || isResizingLeft) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
    }
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, isResizingRight, isResizingLeft, dragOffset, leftPos, widthPos, pixelsPerSecond, node.id, updateNodeTiming]);

  // Sync back if node prop changes from outside (e.g., undo/redo or zoom change)
  useEffect(() => {
    if (!isDragging && !isResizingLeft && !isResizingRight) {
      setLeftPos(node.startTime * pixelsPerSecond);
      setWidthPos(node.duration * pixelsPerSecond);
    }
  }, [node.startTime, node.duration, pixelsPerSecond, isDragging, isResizingLeft, isResizingRight]);

  const isSelected = useSessionStore(state => state.selectedNodeId) === node.id;

  let content = null;
  let bgClass = "bg-indigo-500/30 border-indigo-400";

  if (node.type === 'ambience') {
    bgClass = "bg-gradient-to-br from-amber-500/80 to-orange-600/80 border-amber-400/50 shadow-[inset_0_0_15px_rgba(255,255,255,0.2)]";
    content = (
      <div className="flex flex-col p-1.5 overflow-hidden h-full">
        <span className="text-[10px] font-bold text-white leading-tight drop-shadow-md">AMBIENCE GENERATOR</span>
        <span className="text-[10px] text-white/90 leading-tight capitalize">{node.properties.soundSet || 'Forest'}</span>
        <span className="text-[9px] text-white/80 leading-tight mt-0.5">Sound Elements: {Math.floor(Math.random() * 20 + 5)}</span>
        <span className="text-[8px] text-amber-100 leading-tight mt-auto font-bold uppercase tracking-wider opacity-70">Double Click to Edit</span>
      </div>
    );
  } else if (node.type === 'audiostrobe') {
    bgClass = "bg-gradient-to-r from-[#0f172a] via-[#1e1b4b] to-[#0f172a] border-indigo-500/50 shadow-[0_0_15px_rgba(99,102,241,0.2)]";
    content = (
      <div className="flex items-center justify-center h-full w-full">
        <svg viewBox="0 0 100 40" className="w-24 h-full stroke-cyan-400 fill-transparent stroke-[1.5] drop-shadow-[0_0_3px_rgba(34,211,238,0.8)]" preserveAspectRatio="none">
          <path d="M0 20 Q 12.5 0, 25 20 T 50 20 T 75 20 T 100 20" />
        </svg>
      </div>
    );
  } else {
    // Sound/Tone tracks
    bgClass = "bg-[#0b0f19]/80 border-cyan-500/50 backdrop-blur-md shadow-[inset_0_0_20px_rgba(6,182,212,0.1)]";
    content = (
      <div className="w-full h-full p-1">
        <div className="w-full h-full border border-dashed border-cyan-500/50 flex items-center justify-center overflow-hidden bg-slate-900/60 rounded-sm relative">
          <EnvelopeGraph
            node={node}
            width={node.duration * pixelsPerSecond - 8} // Adjust for padding
            height={trackHeight - 12} // Adjust for padding
          />
        </div>
      </div>
    );
  }

  return (
    <div
      onMouseDown={handleMouseDown}
      className={`absolute top-1.5 bottom-1.5 border rounded-md flex flex-col justify-center overflow-hidden transition-[box-shadow] duration-200 group/node cursor-move ${bgClass} ${isSelected ? 'ring-2 ring-cyan-400 outline outline-1 outline-cyan-500/50 z-10 shadow-[0_0_15px_rgba(34,211,238,0.4)]' : ''}`}
      style={{
        left: `${leftPos}px`,
        width: `${widthPos}px`
      }}
    >
      {/* Left Resize Handle */}
      <div
        className="absolute left-0 top-0 bottom-0 w-2 cursor-ew-resize hover:bg-white/20 z-20 flex items-center justify-center opacity-0 group-hover/node:opacity-100 transition-opacity"
        onMouseDown={(e) => { e.stopPropagation(); setIsResizingLeft(true); }}
      >
        <div className="w-[1px] h-4 bg-white/50"></div>
      </div>

      {content}

      {/* Right Resize Handle */}
      <div
        className="absolute right-0 top-0 bottom-0 w-2 cursor-ew-resize hover:bg-white/20 z-20 flex items-center justify-center opacity-0 group-hover/node:opacity-100 transition-opacity"
        onMouseDown={(e) => { e.stopPropagation(); setIsResizingRight(true); }}
      >
        <div className="w-[1px] h-4 bg-white/50"></div>
      </div>
    </div>
  );
};

const Playhead = ({ pixelsPerSecond, duration }: { pixelsPerSecond: number, duration: number }) => {
  const [left, setLeft] = useState(0);
  const requestRef = useRef<number>(0);
  const [isScrubbing, setIsScrubbing] = useState(false);

  useEffect(() => {
    const updatePlayhead = () => {
      if (!isScrubbing) {
        if (Tone.Transport.state === 'started' || Tone.Transport.state === 'paused') {
          setLeft(Tone.Transport.seconds * pixelsPerSecond);
        } else if (Tone.Transport.state === 'stopped') {
          setLeft(0);
        }
      }
      requestRef.current = requestAnimationFrame(updatePlayhead);
    };

    requestRef.current = requestAnimationFrame(updatePlayhead);
    return () => cancelAnimationFrame(requestRef.current!);
  }, [pixelsPerSecond, isScrubbing]);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isScrubbing) return;
      setLeft(prev => {
        const newLeft = Math.max(0, Math.min(prev + e.movementX, duration * pixelsPerSecond));
        Tone.Transport.seconds = newLeft / pixelsPerSecond;
        return newLeft;
      });
    };
    const handleMouseUp = () => {
      if (isScrubbing) setIsScrubbing(false);
    };

    if (isScrubbing) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
    }
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isScrubbing, duration, pixelsPerSecond]);

  return (
    <div
      className="absolute top-0 bottom-0 w-px bg-cyan-400 z-50 pointer-events-none shadow-[0_0_5px_rgba(34,211,238,1)]"
      style={{ left: `${left}px` }}
    >
      <div
        className="absolute bottom-0 -translate-x-1/2 translate-y-full w-0 h-0 border-l-[8px] border-l-transparent border-r-[8px] border-r-transparent border-b-[10px] border-b-cyan-500 drop-shadow-[0_0_3px_rgba(34,211,238,0.8)] cursor-ew-resize"
        onMouseDown={(e) => { e.stopPropagation(); setIsScrubbing(true); }}
        style={{ pointerEvents: 'auto' }}
      ></div>
      <div
        className="absolute top-0 bottom-0 w-4 -translate-x-1/2 cursor-ew-resize bg-transparent"
        onMouseDown={(e) => { e.stopPropagation(); setIsScrubbing(true); }}
        style={{ pointerEvents: 'auto' }}
      ></div>
    </div>
  );
};

export const Timeline = ({ category = 'all' }: { category?: 'entrainment' | 'content' | 'all' }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const { tracks, duration, pixelsPerSecond, setZoom } = useSessionStore();

  const filteredTracks = category === 'all' 
    ? tracks 
    : tracks.filter(t => category === 'entrainment' ? t.type === 'entrainment' : t.type !== 'entrainment');

  const ZOOM_LEVELS = [1, 2, 5, 10, 20, 30, 40, 50, 75, 100, 150, 200];

  const handleZoomIn = () => {
    const currentIndex = ZOOM_LEVELS.findIndex(z => z >= pixelsPerSecond);
    if (currentIndex < ZOOM_LEVELS.length - 1) setZoom(ZOOM_LEVELS[currentIndex + 1]);
  };

  const handleZoomOut = () => {
    const currentIndex = ZOOM_LEVELS.findIndex(z => z >= pixelsPerSecond);
    if (currentIndex > 0) setZoom(ZOOM_LEVELS[currentIndex - 1]);
  };

  const getNiceInterval = (pxPerSec: number) => {
    const targetPx = 80;
    const targetSec = targetPx / pxPerSec;
    const intervals = [0.1, 0.5, 1, 2, 5, 10, 15, 30, 60, 300];
    return intervals.reduce((prev, curr) =>
      Math.abs(curr - targetSec) < Math.abs(prev - targetSec) ? curr : prev
    );
  };

  const markers: { left: number, label: string, isMajor: boolean }[] = [];
  const interval = getNiceInterval(pixelsPerSecond);

  for (let i = 0; i <= duration; i += interval) {
    const m = Math.floor(i / 60);
    const s = Math.floor(i % 60);
    const ms = Math.round((i % 1) * 10);
    let label = `${m}:${s.toString().padStart(2, '0')}`;
    if (ms > 0) label += `.${ms}`;

    markers.push({
      left: i * pixelsPerSecond,
      label,
      isMajor: true
    });
  }

  return (
    <div className="flex-1 bg-[#0b0f19] flex flex-col overflow-hidden relative">
      <div className="absolute right-4 top-4 z-50 flex space-x-1.5 bg-slate-800/80 backdrop-blur-md p-1.5 rounded-lg border border-white/10 shadow-lg">
        <button onClick={handleZoomOut} className="mws-btn"><ZoomOut size={14} className="text-slate-300 hover:text-cyan-400" /></button>
        <button onClick={handleZoomIn} className="mws-btn"><ZoomIn size={14} className="text-slate-300 hover:text-cyan-400" /></button>
      </div>

      <div ref={containerRef} className="flex-1 flex flex-col overflow-x-auto overflow-y-hidden relative">
        <div className="flex-1 overflow-y-auto overflow-x-hidden relative" style={{ minWidth: duration * pixelsPerSecond }}>
          <div className="relative" style={{ width: duration * pixelsPerSecond, minHeight: '100%' }}>
            <Playhead pixelsPerSecond={pixelsPerSecond} duration={duration} />
            {filteredTracks.length === 0 ? (
              <div className="flex items-center justify-center h-full text-slate-500 text-xs italic mt-10">
                No tracks in this category.
              </div>
            ) : (
              (function() {
                let accumulatedTop = 0;
                return filteredTracks.map((track) => {
                  const trackHeight = track.height || 80;
                  const currentTop = accumulatedTop;
                  accumulatedTop += trackHeight;
                  
                  return (
                    <div
                      key={track.id}
                      className="absolute w-full border-b border-white/5 hover:bg-white/[0.02] transition-colors"
                      style={{
                        top: currentTop,
                        height: trackHeight
                      }}
                    >
                      {/* Vertical Grid Lines */}
                      {markers.map((m, i) => (
                        <div key={i} className="absolute top-0 bottom-0 w-px bg-white/5 pointer-events-none" style={{ left: m.left }}></div>
                      ))}

                      {track.nodes.map(node => (
                        <NodeBlock key={node.id} node={node} pixelsPerSecond={pixelsPerSecond} trackHeight={trackHeight} />
                      ))}

                      <TrackVisualizer track={track} height={trackHeight} />
                    </div>
                  );
                });
              })()
            )}
          </div>
        </div>

        {/* Timeline Ruler at the bottom, above horizontal scrollbar */}
        <div
          className="h-7 border-t border-slate-700/50 flex-shrink-0 relative overflow-visible bg-[#050810] shadow-[0_-2px_10px_rgba(0,0,0,0.5)] cursor-pointer z-40"
          style={{ minWidth: duration * pixelsPerSecond }}
          onMouseDown={(e) => {
            const rect = e.currentTarget.getBoundingClientRect();
            const clickX = e.clientX - rect.left;
            const newTime = Math.max(0, Math.min(clickX / pixelsPerSecond, duration));
            Tone.Transport.seconds = newTime;
          }}
        >
          <div className="absolute inset-0 overflow-visible pointer-events-none">
            <div className="relative h-full" style={{ width: duration * pixelsPerSecond }}>
              {markers.map((m, i) => (
                <div key={i} className="absolute top-0 bottom-0 border-l border-slate-700/80 flex flex-col justify-end pb-0.5 pl-1" style={{ left: m.left }}>
                  <span className="text-[10px] text-cyan-500/70 font-mono tracking-wider pointer-events-none leading-none">
                    {m.label.split(':')[1] === '00' ? m.label.split(':')[0] : m.label}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
