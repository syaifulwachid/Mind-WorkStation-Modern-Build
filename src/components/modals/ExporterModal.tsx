import { CheckCircle } from 'lucide-react';

interface ExporterModalProps {
  isOpen: boolean;
  progress: number;
  onStop: () => void;
  onPause: () => void;
  onDone: () => void;
}

export const ExporterModal = ({ isOpen, progress, onStop, onPause, onDone }: ExporterModalProps) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="w-[360px] bg-slate-900/95 backdrop-blur-xl border border-white/10 rounded-lg shadow-[0_0_50px_rgba(0,0,0,0.5)] flex flex-col overflow-hidden">
        {/* Title Bar */}
        <div className="h-8 bg-gradient-to-r from-slate-800 to-slate-900 border-b border-white/10 flex items-center px-3 justify-between">
          <div className="flex items-center text-white text-xs font-bold tracking-wide">
            <div className="w-5 h-5 bg-emerald-500/20 border border-emerald-500/50 rounded-full flex items-center justify-center mr-2 shadow-[0_0_10px_rgba(16,185,129,0.3)]">
              <span className="text-emerald-400 text-[10px] leading-none drop-shadow-[0_0_2px_rgba(16,185,129,0.8)]">➜</span>
            </div>
            Audio Exporter
          </div>
        </div>

        {/* Modal Body */}
        <div className="p-4 flex flex-col space-y-4">
          <div className="bg-slate-800/50 rounded-md p-3 border border-white/5 shadow-inner">
            <div className="text-[11px] text-slate-300 mb-2 font-medium">
              {progress >= 100 ? <span className="text-emerald-400">Export complete.</span> : 'Now exporting mixdown...'}
            </div>
            
            {/* Progress Bar Container */}
            <div className="h-4 w-full bg-slate-950 rounded-full border border-white/10 shadow-inner relative overflow-hidden mb-1">
              <div 
                className="h-full bg-gradient-to-r from-emerald-500 to-cyan-400 transition-all duration-300 relative"
                style={{ width: `${progress}%` }}
              >
                <div className="absolute top-0 bottom-0 right-0 w-8 bg-gradient-to-r from-transparent to-white/50 animate-pulse"></div>
              </div>
            </div>
            <div className="text-right text-[9px] text-cyan-400 font-mono mb-3">{progress}%</div>

            {/* Stop / Pause buttons */}
            <div className="flex space-x-2">
              <button 
                onClick={onStop}
                className="flex-1 bg-rose-500/10 border border-rose-500/30 text-[11px] px-4 py-1.5 rounded text-rose-400 hover:bg-rose-500/20 hover:border-rose-500/50 hover:shadow-[0_0_10px_rgba(244,63,94,0.2)] transition-all disabled:opacity-30 disabled:cursor-not-allowed"
                disabled={progress >= 100}
              >
                Stop
              </button>
              <button 
                onClick={onPause}
                className="flex-1 bg-amber-500/10 border border-amber-500/30 text-[11px] px-4 py-1.5 rounded text-amber-400 hover:bg-amber-500/20 hover:border-amber-500/50 hover:shadow-[0_0_10px_rgba(245,158,11,0.2)] transition-all disabled:opacity-30 disabled:cursor-not-allowed"
                disabled={progress >= 100}
              >
                Pause
              </button>
            </div>
          </div>

          {/* Done Button */}
          <div className="flex justify-end">
            <button 
              onClick={onDone}
              className={`flex items-center justify-center w-full bg-emerald-500/20 border border-emerald-500/50 text-[12px] px-4 py-2 rounded-md hover:bg-emerald-500/30 hover:shadow-[0_0_15px_rgba(16,185,129,0.3)] transition-all text-emerald-400 font-bold ${progress < 100 ? 'opacity-30 cursor-not-allowed' : ''}`}
              disabled={progress < 100}
            >
              <CheckCircle size={14} className="mr-1.5" />
              Done
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
