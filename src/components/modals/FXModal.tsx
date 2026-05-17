import { createPortal } from 'react-dom';
import { Track, useSessionStore } from '../../store/useSessionStore';

interface FXModalProps {
  isOpen: boolean;
  onClose: () => void;
  track: Track;
}

export const FXModal = ({ isOpen, onClose, track }: FXModalProps) => {
  const updateTrackEffects = useSessionStore(state => state.updateTrackEffects);
  
  if (!isOpen) return null;

  const effects = track.effects || { reverb: false, delay: false };

  const handleToggle = (effect: 'reverb' | 'delay') => {
    updateTrackEffects(track.id, { ...effects, [effect]: !effects[effect] });
  };

  return createPortal(
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="w-[450px] mws-panel flex flex-col overflow-hidden shadow-2xl border border-white/20">
        <div className="h-8 bg-gradient-to-r from-slate-800 to-slate-900 border-b border-white/10 flex justify-between items-center px-3 cursor-move">
          <span className="text-xs font-bold text-slate-200">Track Effects (FX) - {track.name}</span>
          <button onClick={onClose} className="text-slate-400 hover:text-white transition-colors">✕</button>
        </div>
        
        <div className="p-4 bg-[#0f172a]/90 space-y-4 text-xs">
          <div className="p-3 border border-white/10 bg-slate-800/30 rounded flex items-center justify-between">
            <div>
              <div className="font-bold text-slate-200">Reverb</div>
              <div className="text-[10px] text-slate-500">Adds spatial echo to the track</div>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input type="checkbox" className="sr-only peer" checked={effects.reverb} onChange={() => handleToggle('reverb')} />
              <div className="w-9 h-5 bg-slate-600 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-cyan-500"></div>
            </label>
          </div>

          <div className="p-3 border border-white/10 bg-slate-800/30 rounded flex items-center justify-between">
            <div>
              <div className="font-bold text-slate-200">Delay / Echo</div>
              <div className="text-[10px] text-slate-500">Adds repeating echoes</div>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input type="checkbox" className="sr-only peer" checked={effects.delay} onChange={() => handleToggle('delay')} />
              <div className="w-9 h-5 bg-slate-600 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-cyan-500"></div>
            </label>
          </div>
          
          <div className="p-3 border border-white/10 bg-slate-800/30 rounded flex items-center justify-between opacity-50 cursor-not-allowed">
            <div>
              <div className="font-bold text-slate-200">3-Band EQ</div>
              <div className="text-[10px] text-slate-500">Adjust High, Mid, Low frequencies</div>
            </div>
            <label className="relative inline-flex items-center cursor-not-allowed">
              <input type="checkbox" className="sr-only peer" disabled />
              <div className="w-9 h-5 bg-slate-600 rounded-full"></div>
            </label>
          </div>
        </div>

        <div className="h-12 bg-slate-900/80 border-t border-white/10 flex justify-end items-center px-4">
          <button onClick={onClose} className="px-4 py-1.5 bg-gradient-to-b from-slate-600 to-slate-700 hover:from-slate-500 hover:to-slate-600 border border-white/20 rounded shadow-md text-white text-xs transition-colors">
            Close
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
};
