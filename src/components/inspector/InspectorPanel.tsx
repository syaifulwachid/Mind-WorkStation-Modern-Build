import { useSessionStore } from '../../store/useSessionStore';
import { EnvelopeEditor } from './EnvelopeEditor';
import { Layers, Activity, Settings2, LineChart, FileAudio, RotateCcw, ChevronDown } from 'lucide-react';
import { useState } from 'react';

const CollapsibleSection = ({ title, icon, defaultOpen = true, children, className = "" }: any) => {
  const [isOpen, setIsOpen] = useState(defaultOpen);
  return (
    <div className={`bg-slate-800/40 border border-white/5 rounded-md shadow-sm mb-2 overflow-hidden ${className}`}>
      <div 
        className="flex items-center justify-between text-[11px] font-bold text-cyan-400 bg-slate-800/80 px-2 py-1.5 cursor-pointer hover:bg-slate-700/80 transition-colors select-none"
        onClick={() => setIsOpen(!isOpen)}
      >
        <div className="flex items-center">
          {icon && <span className="mr-1.5">{icon}</span>}
          {title}
        </div>
        <ChevronDown size={14} className={`text-slate-400 transform transition-transform ${isOpen ? '' : '-rotate-90'}`} />
      </div>
      {isOpen && (
        <div className="p-2 border-t border-white/5">
          {children}
        </div>
      )}
    </div>
  );
};

export const InspectorPanel = () => {
  const { tracks, engines, selectedNodeId, selectedEngineId, updateNodeProperty, clearNodes, generateDefaultNodes, randomizeNodeEnvelope, updateEngineProperty, updateEngineOptions, addEngineAction, removeEngineAction, updateEngineAction } = useSessionStore();

  if (selectedEngineId) {
    const engine = engines.find(e => e.id === selectedEngineId);
    if (!engine) return null;

    return (
      <div className="p-2 space-y-2">
        <CollapsibleSection title="Engine Properties" icon={<Settings2 size={14} />} defaultOpen={true}>
          <div className="space-y-3 px-1">
            <div>
              <label className="block text-[10px] text-slate-400 mb-1">Engine Name:</label>
              <input 
                type="text" 
                value={engine.name} 
                onChange={(e) => updateEngineProperty(engine.id, 'name', e.target.value)}
                className="w-full bg-slate-900 border border-white/10 rounded px-2 py-1 text-[11px] text-slate-300 outline-none focus:border-cyan-500"
              />
            </div>
            <div>
              <label className="block text-[10px] text-slate-400 mb-1">Update Period (Seconds):</label>
              <input 
                type="number" 
                min="0.1" step="0.1"
                value={engine.updatePeriod} 
                onChange={(e) => updateEngineProperty(engine.id, 'updatePeriod', Number(e.target.value))}
                className="w-full bg-slate-900 border border-white/10 rounded px-2 py-1 text-[11px] text-emerald-400 font-mono outline-none focus:border-cyan-500"
              />
            </div>
          </div>
        </CollapsibleSection>

        <CollapsibleSection title="Generator Options" icon={<Activity size={14} />} defaultOpen={true}>
          <div className="space-y-2 px-1">
            {engine.type === 'random' && (
              <>
                <div className="flex justify-between items-center space-x-2">
                  <div className="flex-1">
                    <label className="block text-[10px] text-slate-400 mb-1">Min Value:</label>
                    <input 
                      type="number" 
                      value={engine.options.min || 0}
                      onChange={(e) => updateEngineOptions(engine.id, { min: Number(e.target.value) })}
                      className="w-full bg-slate-900 border border-white/10 rounded px-2 py-1 text-[11px] text-slate-300 outline-none focus:border-cyan-500"
                    />
                  </div>
                  <div className="flex-1">
                    <label className="block text-[10px] text-slate-400 mb-1">Max Value:</label>
                    <input 
                      type="number" 
                      value={engine.options.max || 100}
                      onChange={(e) => updateEngineOptions(engine.id, { max: Number(e.target.value) })}
                      className="w-full bg-slate-900 border border-white/10 rounded px-2 py-1 text-[11px] text-slate-300 outline-none focus:border-cyan-500"
                    />
                  </div>
                </div>
              </>
            )}
            {engine.type !== 'random' && (
              <div className="text-[10px] text-slate-500 italic">No specific options for this engine type.</div>
            )}
          </div>
        </CollapsibleSection>

        <CollapsibleSection title="Actions" icon={<Layers size={14} />} defaultOpen={true}>
          <div className="space-y-2 px-1">
            {engine.actions.map((action, index) => (
              <div key={action.id} className="bg-slate-900/50 border border-white/5 rounded p-2 mb-2 relative group">
                <button 
                  onClick={() => removeEngineAction(engine.id, action.id)}
                  className="absolute top-1 right-1 text-slate-500 hover:text-rose-400 hidden group-hover:block"
                >✕</button>
                <div className="text-[10px] font-bold text-slate-300 mb-1 border-b border-white/10 pb-1">Action {index + 1}</div>
                <div className="space-y-1 mt-1.5">
                  <label className="block text-[9px] text-slate-400">Target Track:</label>
                  <select 
                    value={action.targetTrackId || ''}
                    onChange={(e) => updateEngineAction(engine.id, action.id, { targetTrackId: e.target.value })}
                    className="w-full bg-slate-800 border border-white/10 rounded px-1.5 py-0.5 text-[10px] text-cyan-400 outline-none focus:border-cyan-500"
                  >
                    <option value="">-- Select Track --</option>
                    {tracks.map(t => <option key={t.id} value={t.id}>{t.name} ({t.type})</option>)}
                  </select>
                </div>
                <div className="space-y-1 mt-1.5">
                  <label className="block text-[9px] text-slate-400">Target Property:</label>
                  <select 
                    value={action.targetProperty || ''}
                    onChange={(e) => updateEngineAction(engine.id, action.id, { targetProperty: e.target.value })}
                    className="w-full bg-slate-800 border border-white/10 rounded px-1.5 py-0.5 text-[10px] text-emerald-400 outline-none focus:border-cyan-500"
                  >
                    <option value="">-- Select Property --</option>
                    <option value="beatFreq">Entrainment/Beat Frequency</option>
                    <option value="carrierFreq">Carrier Frequency</option>
                    <option value="volume">Volume Amplitude</option>
                  </select>
                </div>
              </div>
            ))}
            <button 
              onClick={() => addEngineAction(engine.id, '', '')}
              className="w-full py-1.5 mt-1 border border-dashed border-white/20 rounded text-[10px] text-slate-400 hover:text-cyan-400 hover:border-cyan-500/50 hover:bg-cyan-500/10 transition-colors"
            >
              + Add Action
            </button>
          </div>
        </CollapsibleSection>
      </div>
    );
  }

  let selectedNode = null;
  
  for (const track of tracks) {
    const node = track.nodes.find(n => n.id === selectedNodeId);
    if (node) {
      selectedNode = node;
      break;
    }
  }

  const selectedTrack = tracks.find(t => t.nodes.some(n => n.id === selectedNodeId));
  const entrainmentTracks = tracks.filter(t => t.type === 'entrainment');

  if (!selectedNode || !selectedTrack) {
    return (
      <div className="flex-1 flex items-center justify-center p-6 text-center">
        <div className="text-xs text-slate-500 italic bg-white/5 px-4 py-3 rounded-lg border border-white/10 shadow-inner">
          Select a node to view properties.
        </div>
      </div>
    );
  }

  const isBinaural = selectedTrack.type === 'binaural';
  const isIsochronic = selectedTrack.type === 'isochronic';
  const isAmbience = selectedTrack.type === 'ambience';
  const isAudioStrobe = selectedTrack.type === 'audiostrobe';
  const isEntrainment = selectedTrack.type === 'entrainment';
  const props = selectedNode.properties;

  return (
    <div className="p-2 space-y-2">
      
      {/* Sound File Properties */}
      <CollapsibleSection title="Sound File Properties" icon={<FileAudio size={14} />} defaultOpen={true}>
        <div className="space-y-2 px-1">
          <div>
            <label className="block text-[10px] text-slate-400 mb-1">File Path:</label>
            <div className="flex space-x-1.5">
              <input type="text" value={isAmbience ? props.soundSet || 'Forest' : 'Synthesized'} readOnly className="flex-1 bg-slate-900/80 border border-white/10 rounded px-2 py-1 text-[10px] text-slate-300 outline-none" />
              <button className="mws-btn p-1"><RotateCcw size={12} className="text-slate-300" /></button>
            </div>
          </div>
          <div className="text-[10px] text-slate-300 font-medium">
            File Length: <span className="text-emerald-400">{selectedNode.duration}s</span>
          </div>
          <div className="flex items-center mt-2">
            <input type="checkbox" id="loop" defaultChecked className="mr-2 accent-cyan-500 rounded" />
            <label htmlFor="loop" className="text-[10px] text-slate-300 cursor-pointer select-none">Loop continuously</label>
          </div>
          <div className="flex justify-end mt-1">
            <button className="bg-gradient-to-r from-amber-500/20 to-orange-500/20 border border-amber-500/30 text-[10px] px-3 py-1 rounded-full font-bold text-amber-400 hover:bg-amber-500/30 hover:shadow-[0_0_10px_rgba(245,158,11,0.2)] transition-all">Advanced</button>
          </div>
        </div>
      </CollapsibleSection>

      {/* Advanced Sound Options (Engine) */}
      <CollapsibleSection title="Advanced Sound Options (Engine)" icon={<Settings2 size={14} />} defaultOpen={true}>
        <div className="space-y-3 px-1 py-1">
          <div>
            <div className="flex justify-between text-[10px] text-slate-300 mb-1">
              <span>Amplitude (Volume): <span className="text-cyan-400 font-bold">{props.volume}%</span></span>
            </div>
            <input 
              type="range" min="0" max="100" 
              value={props.volume || 100} 
              onChange={(e) => updateNodeProperty(selectedNode!.id, 'volume', Number(e.target.value))}
              className="w-full h-1.5 bg-slate-700 rounded-full appearance-none accent-cyan-500" 
            />
          </div>
          
          <div className="grid grid-cols-2 gap-2 text-[10px]">
            <div className="flex flex-col space-y-1">
              <span className="text-slate-400">Fade In:</span>
              <div className="flex items-center">
                <input 
                  type="number" 
                  value={props.fadeIn || 0} 
                  onChange={(e) => updateNodeProperty(selectedNode!.id, 'fadeIn', Number(e.target.value))}
                  className="w-10 bg-slate-900 border border-white/10 rounded px-1.5 py-0.5 text-slate-200 outline-none focus:border-cyan-500" 
                /> <span className="ml-1 text-[9px] text-slate-500">secs</span>
              </div>
            </div>
            <div className="flex flex-col space-y-1">
              <span className="text-slate-400">Fade Out:</span>
              <div className="flex items-center">
                <input 
                  type="number" 
                  value={props.fadeOut || 0} 
                  onChange={(e) => updateNodeProperty(selectedNode!.id, 'fadeOut', Number(e.target.value))}
                  className="w-10 bg-slate-900 border border-white/10 rounded px-1.5 py-0.5 text-slate-200 outline-none focus:border-cyan-500" 
                /> <span className="ml-1 text-[9px] text-slate-500">secs</span>
              </div>
            </div>
            <div className="flex flex-col space-y-1">
              <span className="text-slate-400">Loop Delay:</span>
              <div className="flex items-center"><input type="number" defaultValue="-1" className="w-10 bg-slate-900 border border-white/10 rounded px-1.5 py-0.5 text-slate-200 outline-none focus:border-cyan-500" /> <span className="ml-1 text-[9px] text-slate-500">secs</span></div>
            </div>
            <div className="flex flex-col space-y-1">
              <span className="text-slate-400">Crossfade:</span>
              <div className="flex items-center"><input type="number" defaultValue="2" className="w-10 bg-slate-900 border border-white/10 rounded px-1.5 py-0.5 text-slate-200 outline-none focus:border-cyan-500" /> <span className="ml-1 text-[9px] text-slate-500">secs</span></div>
            </div>
          </div>

          <div className="mt-3">
            <label className="block text-[10px] text-slate-400 mb-1">Stereo Filter:</label>
            <select className="w-full bg-slate-900 border border-white/10 rounded px-2 py-1 text-[10px] text-slate-300 outline-none focus:border-cyan-500">
              <option>No Change</option>
              <option>Widen</option>
              <option>Narrow</option>
            </select>
          </div>
        </div>
      </CollapsibleSection>

      {/* Node Actions */}
      <CollapsibleSection title="Node Actions" defaultOpen={false}>
        <div className="space-y-1 px-1">
          <button onClick={() => generateDefaultNodes(selectedTrack!.id)} className="flex items-center text-[10px] text-slate-300 hover:bg-white/5 w-full text-left py-1.5 px-2 rounded transition-colors group">
            <Layers size={12} className="mr-2 text-amber-400 group-hover:text-amber-300" /> Generate Nodes
          </button>
          <button onClick={() => clearNodes(selectedTrack!.id)} className="flex items-center text-[10px] text-slate-300 hover:bg-white/5 w-full text-left py-1.5 px-2 rounded transition-colors group">
            <div className="w-3 h-3 rounded-full border border-rose-500/50 flex items-center justify-center mr-2 bg-rose-500/10 group-hover:bg-rose-500/20">
              <div className="w-1 h-1 bg-rose-400 rounded-full"></div>
            </div> Clear All Nodes
          </button>
        </div>
      </CollapsibleSection>

      {/* Control Options */}
      <CollapsibleSection title="Control Options" defaultOpen={false}>
        <div className="space-y-1 px-1">
          <button onClick={() => alert("BioOptimize requires external hardware.")} className="flex items-center text-[10px] text-slate-300 hover:bg-white/5 w-full text-left py-1.5 px-2 rounded transition-colors group">
            <Activity size={12} className="mr-2 text-cyan-400 group-hover:text-cyan-300" /> BioOptimize this track
          </button>
          <button onClick={() => alert("Biofeedback not connected.")} className="flex items-center text-[10px] text-slate-300 hover:bg-white/5 w-full text-left py-1.5 px-2 rounded transition-colors group">
            <Settings2 size={12} className="mr-2 text-slate-400 group-hover:text-slate-300" /> Control this track with biofeedback
          </button>
          <button onClick={() => randomizeNodeEnvelope(selectedNode!.id)} className="flex items-center text-[10px] text-slate-300 hover:bg-white/5 w-full text-left py-1.5 px-2 rounded transition-colors group">
            <RotateCcw size={12} className="mr-2 text-emerald-400 group-hover:text-emerald-300" /> Randomize this track
          </button>
        </div>
      </CollapsibleSection>

      {/* Graphing Options */}
      <CollapsibleSection title="Graphing Options" defaultOpen={false}>
        <div className="space-y-1 px-1">
          <button className="flex items-center text-[10px] text-slate-300 hover:bg-white/5 w-full text-left py-1.5 px-2 rounded transition-colors group">
            <LineChart size={12} className="mr-2 text-rose-400 group-hover:text-rose-300" /> Graph this track
          </button>
        </div>
      </CollapsibleSection>

      {/* Entrainment Dropdown (For Content Tracks) */}
      {(isBinaural || isIsochronic || isAudioStrobe) && (
        <CollapsibleSection 
          title="Entrainment Link" 
          className="border-cyan-500/30 shadow-[0_0_15px_rgba(6,182,212,0.05)]" 
          defaultOpen={true}
        >
          <div className="px-1 mb-2">
            <label className="block text-[10px] text-slate-400 mb-1">Follow Entrainment Track:</label>
            <select 
              value={selectedTrack.entrainmentTrackId || ''}
              onChange={(e) => useSessionStore.getState().updateTrackProperty(selectedTrack.id, 'entrainmentTrackId', e.target.value)}
              className="w-full bg-slate-900 border border-white/10 rounded px-2 py-1 text-[11px] text-cyan-400 outline-none focus:border-cyan-500"
            >
              <option value="">None (Static Frequency)</option>
              {entrainmentTracks.map(et => (
                <option key={et.id} value={et.id}>{et.name}</option>
              ))}
            </select>
          </div>
          {!isAudioStrobe && (
            <div className="px-1">
              <label className="block text-[10px] text-slate-400 mb-1">Carrier Frequency (Hz)</label>
              <input 
                type="number" 
                value={props.carrierFreq || 200}
                onChange={(e) => updateNodeProperty(selectedNode!.id, 'carrierFreq', Number(e.target.value))}
                className="w-full bg-slate-900 border border-white/10 rounded px-2 py-1 text-[11px] text-emerald-400 font-mono outline-none focus:border-cyan-500 shadow-inner"
              />
            </div>
          )}
        </CollapsibleSection>
      )}

      {/* Actual Properties depending on the node type (Envelope editing etc) */}
      {isEntrainment && (
        <CollapsibleSection 
          title="Node Frequencies (Entrainment)" 
          className="border-emerald-500/30 shadow-[0_0_15px_rgba(16,185,129,0.05)]" 
          defaultOpen={true}
        >
          <div className="px-1">
            <EnvelopeEditor 
              label="Entrainment Frequency (Hz)" 
              points={props.beatFreq || []} 
              onChange={(pts) => updateNodeProperty(selectedNode!.id, 'beatFreq', pts)}
            />
          </div>
        </CollapsibleSection>
      )}

    </div>
  );
};
