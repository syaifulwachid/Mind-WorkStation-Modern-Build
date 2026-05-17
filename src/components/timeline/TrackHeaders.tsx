import { useSessionStore, Track } from '../../store/useSessionStore';
import { Trash2 } from 'lucide-react';
import { useState, useEffect } from 'react';
import { TrackEditModal } from '../modals/TrackEditModal';
import { FXModal } from '../modals/FXModal';

const TrackHeader = ({ track }: { track: Track }) => {
  const removeTrack = useSessionStore(state => state.removeTrack);
  const soloTrackId = useSessionStore(state => state.soloTrackId);
  const updateTrackProperty = useSessionStore(state => state.updateTrackProperty);

  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isFxOpen, setIsFxOpen] = useState(false);
  const [isResizing, setIsResizing] = useState(false);

  const trackHeight = track.height || 80;

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isResizing) return;
      // We assume each drag pixel translates to height. We need the delta.
      // Easiest way is to measure from mouse to top of the track header, but we just use movementY.
      updateTrackProperty(track.id, 'height', Math.max(40, trackHeight + e.movementY));
    };
    const handleMouseUp = () => setIsResizing(false);

    if (isResizing) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
    }
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isResizing, track.id, trackHeight, updateTrackProperty]);

  // In MWS, track labels change based on track type
  let trackLabel = 'Sound';
  let maxVal = '100';
  let minVal = '0';

  if (track.type === 'isochronic' || track.type === 'binaural') {
    trackLabel = track.type === 'isochronic' ? 'Pitch' : 'Frequency';
    maxVal = '40';
    minVal = '0';
  } else if (track.type === 'audiostrobe') {
    trackLabel = 'Brightness\n(AudioStrobe)';
  } else if (track.type === 'ambience') {
    trackLabel = 'Sound';
  }

  return (
    <div className="w-full flex justify-between border-b border-white/10 bg-slate-800/40 relative backdrop-blur-sm group shrink-0" style={{ height: trackHeight }}>
      {/* Left Area: Controls */}
      <div className="flex-1 flex flex-col justify-start">
        {/* Top Header: Dark Box */}
        <div className="h-6 bg-slate-900/60 border-b border-white/10 flex justify-between items-center px-2">
          <span className="text-[10px] font-bold text-slate-200 truncate tracking-wide">{track.name}</span>
          <div className="flex space-x-1 items-center">
            <span className="text-[8px] cursor-pointer text-slate-500 hover:text-cyan-400 transition-colors">▼</span>
          </div>
        </div>

        {/* Middle: S, M, FX, Edit buttons */}
        <div className="flex flex-col mt-1.5 px-2">
          <div className="flex space-x-1">
            <button
              className={`h-5 w-5 rounded border text-[9px] font-bold shadow-sm flex items-center justify-center p-0 transition-all ${soloTrackId === track.id ? 'bg-amber-500/20 border-amber-500/50 text-amber-400 shadow-[inset_0_0_5px_rgba(245,158,11,0.3)]' : 'bg-slate-700/50 border-white/10 hover:bg-slate-600 hover:border-cyan-500/50 text-slate-300'}`}
              onClick={() => useSessionStore.getState().toggleSoloTrack(track.id)}
              title={soloTrackId === track.id ? "Unsolo" : "Solo"}
            >
              S
            </button>
            <button
              className={`h-5 w-5 rounded border text-[9px] font-bold shadow-sm flex items-center justify-center p-0 transition-all ${track.muted ? 'bg-rose-500/20 border-rose-500/50 text-rose-400 shadow-[inset_0_0_5px_rgba(244,63,94,0.3)]' : 'bg-slate-700/50 border-white/10 hover:bg-slate-600 hover:border-cyan-500/50 text-slate-300'}`}
              onClick={() => useSessionStore.getState().toggleTrackMute(track.id)}
              title={track.muted ? "Unmute" : "Mute"}
            >
              M
            </button>
            <button
              className={`h-5 w-6 rounded border text-[8px] font-bold shadow-sm flex items-center justify-center p-0 transition-all ${track.channelMode === 'stereo' ? 'bg-cyan-500/20 border-cyan-500/50 text-cyan-400 shadow-[inset_0_0_5px_rgba(6,182,212,0.3)]' : 'bg-slate-700/50 border-white/10 hover:bg-slate-600 hover:border-cyan-500/50 text-slate-300'}`}
              onClick={() => useSessionStore.getState().toggleTrackChannelMode(track.id)}
              title={track.channelMode === 'stereo' ? "Switch to Mono" : "Switch to Stereo"}
            >
              {track.channelMode === 'stereo' ? 'ST' : 'MO'}
            </button>
            <button
              className="h-5 w-6 bg-slate-700/50 border border-white/10 rounded text-[9px] font-bold shadow-sm flex items-center justify-center p-0 hover:bg-slate-600 hover:border-cyan-500/50 text-slate-300 transition-all"
              onClick={() => setIsFxOpen(true)}
            >
              FX
            </button>
            <button
              className="h-5 px-2 bg-slate-700/50 border border-white/10 rounded text-[9px] shadow-sm flex items-center justify-center p-0 hover:bg-slate-600 hover:border-cyan-500/50 text-slate-300 transition-all"
              onClick={() => setIsEditOpen(true)}
            >
              Edit
            </button>
            <button
              className="h-5 w-6 bg-rose-500/10 border border-white/10 rounded shadow-sm flex items-center justify-center p-0 hover:bg-rose-500/20 hover:text-rose-400 text-slate-500 transition-all ml-1"
              onClick={() => removeTrack(track.id)}
              title="Delete Track"
            >
              <Trash2 size={10} />
            </button>
          </div>
        </div>

        <TrackEditModal isOpen={isEditOpen} onClose={() => setIsEditOpen(false)} track={track} />
        <FXModal isOpen={isFxOpen} onClose={() => setIsFxOpen(false)} track={track} />



        {/* Track Label Bottom Right */}
        <div className="absolute bottom-1 right-8 text-right opacity-60">
          <span className="text-[10px] text-cyan-400 whitespace-pre-wrap leading-tight block font-semibold uppercase tracking-wider">{trackLabel}</span>
        </div>
      </div>

      {/* Right Area: Y-Axis Ruler */}
      <div className="w-6 shrink-0 bg-slate-900 border-l border-white/5 flex flex-col justify-between items-center py-1 opacity-70 shadow-inner">
        <span className="text-[9px] text-slate-400 font-mono">{maxVal}</span>
        <span className="text-[9px] text-slate-500 font-mono">{track.channelMode === 'stereo' ? '0' : '-'}</span>
        <span className="text-[9px] text-slate-400 font-mono">{track.channelMode === 'stereo' ? maxVal : minVal}</span>
      </div>

      {/* Resize Handle */}
      <div 
        className="absolute bottom-0 left-0 w-full h-1.5 cursor-ns-resize hover:bg-cyan-500/50 z-20 transition-colors"
        onMouseDown={(e) => { e.stopPropagation(); setIsResizing(true); }}
      />
    </div>
  );
};

export const TrackHeaders = ({ category = 'all' }: { category?: 'entrainment' | 'content' | 'all' }) => {
  const tracks = useSessionStore(state => state.tracks);
  const filteredTracks = category === 'all' 
    ? tracks 
    : tracks.filter(t => category === 'entrainment' ? t.type === 'entrainment' : t.type !== 'entrainment');

  return (
    <div className="w-56 border-r border-white/10 bg-[#0f172a] flex flex-col shrink-0 z-10 relative shadow-[4px_0_10px_rgba(0,0,0,0.3)]">
      <div className="flex-1 overflow-y-auto overflow-x-hidden relative scrollbar-hide">
        <div className="flex flex-col">
          {filteredTracks.map(track => (
            <TrackHeader key={track.id} track={track} />
          ))}
        </div>
      </div>
    </div>
  );
};
