import { useState } from 'react';
import { createPortal } from 'react-dom';
import { useSessionStore, Track } from '../../store/useSessionStore';

interface TrackEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  track: Track;
}

export const TrackEditModal = ({ isOpen, onClose, track }: TrackEditModalProps) => {
  const [name, setName] = useState(track.name);
  const updateTrackProperty = useSessionStore(state => state.updateTrackProperty);

  if (!isOpen) return null;

  const handleSave = () => {
    updateTrackProperty(track.id, 'name', name);
    onClose();
  };

  return createPortal(
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="w-96 mws-panel flex flex-col overflow-hidden shadow-2xl border border-white/20">
        <div className="h-8 bg-gradient-to-r from-slate-800 to-slate-900 border-b border-white/10 flex justify-between items-center px-3 cursor-move">
          <span className="text-xs font-bold text-slate-200">Track Properties</span>
          <button onClick={onClose} className="text-slate-400 hover:text-white transition-colors">✕</button>
        </div>
        
        <div className="p-4 bg-[#0f172a]/90 space-y-4 text-xs">
          <div>
            <label className="block text-slate-400 mb-1">Track Name:</label>
            <input 
              type="text" 
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full mws-inset px-2 py-1.5 bg-slate-900 text-slate-200 outline-none focus:ring-1 focus:ring-cyan-500"
            />
          </div>
          
          <div>
            <label className="block text-slate-400 mb-1">Default Volume (%):</label>
            <input 
              type="range" 
              min="0" max="100" 
              defaultValue={track.volume}
              onChange={(e) => updateTrackProperty(track.id, 'volume', Number(e.target.value))}
              className="w-full accent-cyan-500"
            />
          </div>
        </div>

        <div className="h-12 bg-slate-900/80 border-t border-white/10 flex justify-end items-center px-4 space-x-2">
          <button onClick={handleSave} className="px-4 py-1.5 bg-gradient-to-b from-slate-600 to-slate-700 hover:from-slate-500 hover:to-slate-600 border border-white/20 rounded shadow-md text-white text-xs transition-colors">
            OK
          </button>
          <button onClick={onClose} className="px-4 py-1.5 bg-gradient-to-b from-slate-700 to-slate-800 hover:from-slate-600 hover:to-slate-700 border border-white/10 rounded shadow-md text-slate-300 text-xs transition-colors">
            Cancel
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
};
