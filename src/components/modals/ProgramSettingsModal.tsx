import { useState } from 'react';
import { useSessionStore } from '../../store/useSessionStore';

export const ProgramSettingsModal = ({ isOpen, onClose }: { isOpen: boolean, onClose: () => void }) => {
  const [activeTab, setActiveTab] = useState('audio');
  const { programSettings, updateProgramSettings } = useSessionStore();

  if (!isOpen) return null;

  const tabs = [
    { id: 'general', label: 'General Options' },
    { id: 'undo', label: 'Undo Options' },
    { id: 'audiostrobe', label: 'AudioStrobe' },
    { id: 'audio', label: 'Audio Options' },
    { id: 'export', label: 'Export Options' },
    { id: 'recording', label: 'Recording Options' },
    { id: 'visualization', label: 'Visualization / Screen Flashing' },
    { id: 'device', label: 'Device Options' },
    { id: 'engine', label: 'Engine Options' }
  ];

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-[100] font-sans">
      <div className="bg-slate-900 border border-white/20 shadow-2xl shadow-cyan-500/10 w-[800px] h-[550px] flex flex-col rounded overflow-hidden">
        
        {/* Title Bar */}
        <div className="bg-slate-800 px-3 py-2 border-b border-white/10 flex justify-between items-center select-none shadow-sm relative">
          <div className="flex items-center space-x-2">
            <span className="text-cyan-400">⚙️</span>
            <span className="text-[12px] text-slate-200 font-bold tracking-wide">Program Settings</span>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-rose-400 font-bold px-2 py-0.5 text-sm leading-none transition-colors">&times;</button>
        </div>

        <div className="flex flex-1 overflow-hidden">
          {/* Sidebar */}
          <div className="w-[220px] bg-slate-800/50 border-r border-white/10 flex flex-col py-2 overflow-y-auto">
            {tabs.map(tab => (
              <div 
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-4 py-2 text-[12px] cursor-pointer transition-colors ${activeTab === tab.id ? 'bg-cyan-500/20 text-cyan-400 border-l-2 border-cyan-400 font-medium' : 'text-slate-400 hover:bg-white/5 hover:text-slate-200'}`}
              >
                {tab.label}
              </div>
            ))}
          </div>

          {/* Main Content Area */}
          <div className="flex-1 bg-slate-900 p-6 flex flex-col relative text-slate-300">
            <div className="flex justify-between items-start mb-6">
              <p className="text-[12px] text-slate-400">
                Audio Settings. Use this screen to change how sessions will be played.
              </p>
              <button className="px-4 py-1.5 bg-slate-800 border border-white/10 rounded text-[11px] text-slate-300 hover:bg-slate-700 hover:border-cyan-500/50 transition-colors">
                Defaults
              </button>
            </div>

            <button className="flex items-center space-x-2 px-4 py-2 bg-slate-800 border border-white/10 rounded w-fit mb-6 shadow-sm hover:bg-slate-700 hover:border-cyan-500/50 transition-colors group">
              <span className="text-xl group-hover:scale-110 transition-transform">🔊</span>
              <span className="text-[12px] text-cyan-400">Edit Audio Devices...</span>
            </button>

            {/* Sampling Rate Group */}
            <fieldset className="border border-white/10 rounded-lg p-4 mb-6 bg-slate-800/30 relative">
              <legend className="text-[11px] text-cyan-400 font-medium bg-slate-900 border border-white/10 px-3 py-1 rounded-md shadow-sm">Sampling Rate</legend>
              <div className="flex items-center space-x-4 px-4 py-2">
                <label className="text-[12px] text-slate-300">Sampling Rate:</label>
                <select 
                  value={programSettings.sampleRate}
                  onChange={(e) => updateProgramSettings({ sampleRate: Number(e.target.value) })}
                  className="bg-slate-950 border border-white/20 rounded px-2 py-1 text-[12px] text-slate-200 outline-none focus:border-cyan-500 w-32"
                >
                  <option value="44100">44100</option>
                  <option value="48000">48000</option>
                  <option value="96000">96000</option>
                </select>
                <span className="text-[11px] text-slate-500">44100 is CD quality, and recommended.</span>
              </div>
            </fieldset>

            {/* Play Preview Options Group */}
            <fieldset className="border border-white/10 rounded-lg p-4 bg-slate-800/30 relative">
              <legend className="text-[11px] text-cyan-400 font-medium bg-slate-900 border border-white/10 px-3 py-1 rounded-md shadow-sm">Play Preview Options</legend>
              <div className="space-y-5 px-4 py-2">
                <div className="flex items-center">
                  <label className="text-[12px] text-slate-300 w-32 text-right mr-4">Resume playing at:</label>
                  <select 
                    value={programSettings.resumeAt}
                    onChange={(e) => updateProgramSettings({ resumeAt: e.target.value as any })}
                    className="bg-slate-950 border border-white/20 rounded px-2 py-1 text-[12px] text-slate-200 outline-none focus:border-cyan-500 w-48"
                  >
                    <option value="cursor">At cursor (yellow line)</option>
                    <option value="start">At beginning</option>
                  </select>
                </div>
                <div className="flex items-start">
                  <label className="text-[12px] text-slate-300 w-32 text-right mr-4 pt-1">Optimize play preview for:</label>
                  <div className="flex flex-col">
                    <select 
                      value={programSettings.previewOptimization}
                      onChange={(e) => updateProgramSettings({ previewOptimization: e.target.value as any })}
                      className="bg-slate-950 border border-white/20 rounded px-2 py-1 text-[12px] text-slate-200 outline-none focus:border-cyan-500 w-32 mb-3"
                    >
                      <option value="speed">Speed</option>
                      <option value="precision">Precision</option>
                    </select>
                    <p className="text-[10px] text-slate-500 leading-relaxed max-w-[350px] bg-slate-950/50 p-2 rounded border border-white/5">
                      NOTE: Preview optimization and precision only affects the output if session starts after time zero. Sessions rewound to the beginning will ALWAYS be optimized for precision.
                    </p>
                  </div>
                </div>
              </div>
            </fieldset>

            {/* Bottom shadow overlay for aesthetics */}
            <div className="absolute bottom-0 left-0 right-0 h-8 bg-gradient-to-t from-slate-900 to-transparent pointer-events-none"></div>
          </div>
        </div>
      </div>
    </div>
  );
};
