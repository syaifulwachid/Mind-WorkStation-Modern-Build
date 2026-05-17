import { FilePlus, FileAudio, FileHeart, Activity, ActivitySquare, BrainCircuit } from 'lucide-react';

interface NewSessionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectTemplate: (templateName: string) => void;
}

export const NewSessionModal = ({ isOpen, onClose, onSelectTemplate }: NewSessionModalProps) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="w-[540px] bg-slate-900/95 backdrop-blur-xl border border-white/10 rounded-lg shadow-[0_0_50px_rgba(0,0,0,0.5)] flex flex-col overflow-hidden">
        {/* Title Bar */}
        <div className="h-8 bg-gradient-to-r from-slate-800 to-slate-900 border-b border-white/10 flex items-center px-3 justify-between">
          <div className="flex items-center text-white text-xs font-bold tracking-wide">
            <div className="w-5 h-5 bg-cyan-500/20 border border-cyan-500/50 rounded-md flex items-center justify-center mr-2 shadow-[0_0_10px_rgba(6,182,212,0.3)]">
              <span className="text-cyan-400 text-[10px] leading-none drop-shadow-[0_0_2px_rgba(6,182,212,0.8)]">N</span>
            </div>
            New Session
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-rose-400 font-bold text-lg transition-colors leading-none pb-1">×</button>
        </div>

        {/* Modal Body */}
        <div className="p-3 flex flex-col space-y-3 h-[400px]">
          <div className="text-[11px] text-slate-300 px-2 font-medium">
            Please select from a template below:
          </div>
          
          {/* Tabs */}
          <div className="flex flex-col">
            <div className="flex border-b border-white/10 space-x-1 px-2 mt-1">
              <div className="bg-slate-800/60 border border-white/10 border-b-transparent text-[10px] px-3 py-1.5 rounded-t-md flex items-center cursor-pointer hover:bg-slate-700 hover:text-white text-slate-400 transition-colors"><FilePlus size={12} className="mr-1.5 text-emerald-400" /> General</div>
              <div className="bg-slate-800/60 border border-white/10 border-b-transparent text-[10px] px-3 py-1.5 rounded-t-md flex items-center cursor-pointer hover:bg-slate-700 hover:text-white text-slate-400 transition-colors"><FileAudio size={12} className="mr-1.5 text-cyan-400" /> Relaxing</div>
              <div className="bg-slate-800/60 border border-white/10 border-b-transparent text-[10px] px-3 py-1.5 rounded-t-md flex items-center cursor-pointer hover:bg-slate-700 hover:text-white text-slate-400 transition-colors"><FileHeart size={12} className="mr-1.5 text-rose-400" /> Hypnosis</div>
              <div className="bg-slate-800/60 border border-white/10 border-b-transparent text-[10px] px-3 py-1.5 rounded-t-md flex items-center cursor-pointer hover:bg-slate-700 hover:text-white text-slate-400 transition-colors"><Activity size={12} className="mr-1.5 text-blue-400" /> Graphing</div>
              <div className="bg-slate-800/60 border border-white/10 border-b-transparent text-[10px] px-3 py-1.5 rounded-t-md flex items-center cursor-pointer hover:bg-slate-700 hover:text-white text-slate-400 transition-colors"><ActivitySquare size={12} className="mr-1.5 text-amber-500" /> Biofeedback</div>
            </div>
            <div className="flex border-b border-white/10 space-x-1 px-2 -mt-[1px] relative z-10">
              <div className="bg-[#0b0f19] border border-white/10 border-b-[#0b0f19] text-[10px] px-3 py-1.5 rounded-t-md flex items-center cursor-pointer font-bold text-cyan-400 shadow-[0_-4px_10px_rgba(0,0,0,0.2)]"><Activity size={12} className="mr-1.5 text-cyan-400 drop-shadow-[0_0_2px_currentColor]" /> Brainwave (BWE)</div>
              <div className="bg-slate-800/60 border border-white/10 border-b-transparent text-[10px] px-3 py-1.5 rounded-t-md flex items-center cursor-pointer hover:bg-slate-700 hover:text-white text-slate-400 transition-colors"><BrainCircuit size={12} className="mr-1.5 text-emerald-500" /> Mind Machines</div>
            </div>
          </div>

          {/* Tab Content (Grid of templates) */}
          <div className="flex-1 bg-[#0b0f19] border border-white/10 border-t-0 p-3 overflow-y-auto rounded-b-md shadow-inner">
            <div className="grid grid-cols-4 gap-3">
              {[
                { name: "Alternating AudioStrobe" },
                { name: "Alternating Stimulation" },
                { name: "Ambience, Embedded" },
                { name: "AudioStrobe" },
                { name: "Binaural Beats" },
                { name: "Dissociation" },
                { name: "Frequency Band Selection" },
                { name: "Harmonic Box X" },
                { name: "Isochronic Tones" },
                { name: "Left, Right Hemisphere Stimulation", active: true },
                { name: "Monaural Beats" },
                { name: "Playlist, Embedded" }
              ].map((template, idx) => (
                <div 
                  key={idx} 
                  className={`flex flex-col items-center p-2 cursor-pointer border rounded-md transition-all duration-200 ${template.active ? 'bg-cyan-500/20 border-cyan-500/50 shadow-[0_0_15px_rgba(6,182,212,0.15)]' : 'border-transparent hover:bg-white/5 hover:border-white/10'}`}
                  onClick={() => onSelectTemplate(template.name)}
                  onDoubleClick={() => { onSelectTemplate(template.name); onClose(); }}
                >
                  <div className={`w-10 h-12 rounded-md shadow-sm flex items-center justify-center mb-2 transition-colors ${template.active ? 'bg-cyan-500 shadow-[0_0_10px_rgba(6,182,212,0.5)]' : 'bg-slate-800 border border-white/10'}`}>
                    <Activity size={20} className={template.active ? 'text-slate-900' : 'text-emerald-400'} />
                  </div>
                  <span className={`text-[10px] text-center leading-tight font-medium ${template.active ? 'text-cyan-400 drop-shadow-[0_0_2px_currentColor]' : 'text-slate-300'}`}>{template.name}</span>
                </div>
              ))}
            </div>
          </div>

          {/* OK / Cancel Buttons */}
          <div className="flex justify-end space-x-3 mt-2 px-1">
            <button 
              onClick={onClose}
              className="bg-cyan-500/20 border border-cyan-500/50 text-[11px] px-6 py-1.5 rounded-md text-cyan-400 hover:bg-cyan-500/30 hover:shadow-[0_0_10px_rgba(6,182,212,0.3)] transition-all font-bold"
            >
              OK
            </button>
            <button 
              onClick={onClose}
              className="bg-slate-800 border border-white/10 text-[11px] px-6 py-1.5 rounded-md text-slate-300 hover:bg-slate-700 hover:text-white transition-all"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
