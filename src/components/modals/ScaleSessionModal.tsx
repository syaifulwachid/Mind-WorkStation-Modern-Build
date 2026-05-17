import { useState, useEffect } from 'react';
import { useSessionStore } from '../../store/useSessionStore';

export const ScaleSessionModal = ({ isOpen, onClose }: { isOpen: boolean, onClose: () => void }) => {
  const { duration, scaleSession } = useSessionStore();
  const [newLength, setNewLength] = useState(duration / 60);
  const [scaleEntrainment, setScaleEntrainment] = useState(true);
  const [scaleContent, setScaleContent] = useState(true);
  const [scaleSoundBounds, setScaleSoundBounds] = useState(true);

  useEffect(() => {
    if (isOpen) {
      setNewLength(Math.round(duration / 60 * 10) / 10);
    }
  }, [isOpen, duration]);

  if (!isOpen) return null;

  const handleScale = () => {
    scaleSession(newLength * 60, {
      scaleEntrainment,
      scaleContent,
      scaleSoundBounds
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-[100] font-sans">
      <div className="bg-slate-900 border border-white/20 shadow-2xl shadow-cyan-500/10 w-[450px] overflow-hidden flex flex-col rounded">
        {/* Header */}
        <div className="bg-slate-800 px-3 py-2 border-b border-white/10 flex justify-between items-center select-none shadow-sm">
          <span className="text-[12px] text-slate-200 font-bold tracking-wide">Scale Session</span>
          <button onClick={onClose} className="text-slate-400 hover:text-rose-400 font-bold px-1 text-sm leading-none transition-colors">&times;</button>
        </div>

        <div className="p-4 bg-slate-900 space-y-4">
          
          {/* New Length Group */}
          <fieldset className="border border-white/10 rounded-lg p-4 bg-slate-800/30 relative mt-2">
            <legend className="text-[11px] text-cyan-400 font-medium bg-slate-900 border border-white/10 px-3 py-1 rounded-md shadow-sm absolute -top-3 left-1/2 -translate-x-1/2">New Length</legend>
            <div className="flex flex-col space-y-3 items-center text-[12px] text-slate-300 mt-2">
              <div className="flex items-center w-full justify-center">
                <span className="w-32 text-right mr-3 text-slate-400">Current Length:</span>
                <div className="bg-slate-950 border border-white/10 px-3 py-1 rounded flex-1 max-w-[120px] text-center text-slate-400">
                  {Math.round(duration / 60 * 10) / 10} minutes
                </div>
              </div>
              <div className="flex items-center w-full justify-center">
                <span className="w-32 text-right mr-3 text-slate-200">New Session Length:</span>
                <input 
                  type="number" 
                  step="0.1" min="1"
                  value={newLength}
                  onChange={e => setNewLength(Number(e.target.value))}
                  className="bg-slate-950 border border-cyan-500/50 px-2 py-1 rounded w-20 mr-2 text-cyan-400 outline-none focus:border-cyan-400 focus:ring-1 focus:ring-cyan-500/50 text-center"
                />
                <span className="text-slate-400">minutes</span>
              </div>
            </div>
          </fieldset>

          {/* Area To Scale Group (Simplified for MVP) */}
          <fieldset className="border border-white/10 rounded-lg p-4 bg-slate-800/30 relative mt-4">
            <legend className="text-[11px] text-cyan-400 font-medium bg-slate-900 border border-white/10 px-3 py-1 rounded-md shadow-sm absolute -top-3 left-1/2 -translate-x-1/2">Area To Scale</legend>
            <p className="text-[11px] text-slate-400 mb-4 leading-relaxed text-center mt-2 px-2">
              Use this tool to easily scale the entire session. Content will be stretched or compressed proportionally.
            </p>
            <div className="h-8 bg-rose-500/20 border border-rose-500/30 rounded mx-4 shadow-inner relative flex items-center justify-center overflow-hidden">
               <div className="absolute inset-0 bg-[linear-gradient(90deg,transparent_24px,rgba(244,63,94,0.15)_25px)] bg-[length:25px_100%]"></div>
               <div className="absolute inset-0 bg-rose-500/40 w-full"></div>
            </div>
            <div className="flex items-center justify-center mt-4 text-[11px] text-slate-300 space-x-8">
              <label className="flex items-center cursor-pointer">
                <input type="radio" checked readOnly className="mr-2 accent-cyan-500" /> Entire session
              </label>
              <label className="flex items-center opacity-40 cursor-not-allowed">
                <input type="radio" disabled className="mr-2" /> Only in selection
              </label>
            </div>
          </fieldset>

          {/* Options Group */}
          <fieldset className="border border-white/10 rounded-lg p-4 bg-slate-800/30 relative mt-4">
            <legend className="text-[11px] text-cyan-400 font-medium bg-slate-900 border border-white/10 px-3 py-1 rounded-md shadow-sm absolute -top-3 left-1/2 -translate-x-1/2">Options</legend>
            <div className="grid grid-cols-2 gap-4 text-[11px] text-slate-300 mt-2 pl-2">
              <label className="flex items-center cursor-pointer hover:text-white transition-colors">
                <input type="radio" name="scaleMode" checked={scaleEntrainment && scaleContent} onChange={() => {setScaleEntrainment(true); setScaleContent(true);}} className="mr-2 accent-cyan-500" /> 
                Scale entrainment and content
              </label>
              <label className="flex items-center cursor-pointer hover:text-white transition-colors">
                <input type="radio" name="scaleMode" checked={scaleEntrainment && !scaleContent} onChange={() => {setScaleEntrainment(true); setScaleContent(false);}} className="mr-2 accent-cyan-500" /> 
                Scale only entrainment
              </label>
            </div>
            <div className="mt-4 pl-2">
              <label className="flex items-center text-[11px] text-slate-300 cursor-pointer hover:text-white transition-colors">
                <input type="checkbox" checked={!scaleSoundBounds} onChange={e => setScaleSoundBounds(!e.target.checked)} className="mr-2 accent-cyan-500" /> 
                Do not scale the sound content (keep audio bounds intact)
              </label>
            </div>
          </fieldset>

        </div>

        {/* Footer */}
        <div className="bg-slate-800 p-3 flex justify-end space-x-3 border-t border-white/10">
          <button onClick={handleScale} className="px-6 py-1.5 bg-cyan-600 hover:bg-cyan-500 text-white rounded text-[12px] font-medium transition-colors shadow-lg shadow-cyan-500/20">
            Scale
          </button>
          <button onClick={onClose} className="px-6 py-1.5 bg-slate-700 hover:bg-slate-600 text-slate-200 border border-white/10 rounded text-[12px] font-medium transition-colors">
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
};
