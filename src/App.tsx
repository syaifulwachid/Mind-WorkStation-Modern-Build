import { Play, Square, File, FolderOpen, Save, MonitorUp, Undo, Redo, SkipBack, MousePointer2, ZoomIn, ZoomOut, Mic, MicOff, Pause, Circle, Layers, Heart } from 'lucide-react';
import { useSessionStore } from './store/useSessionStore';
import { AudioEngine } from './audio/AudioEngine';
import { AmbienceGenerator } from './audio/AmbienceGenerator';
import { Timeline } from './components/timeline/Timeline';
import { TrackHeaders } from './components/timeline/TrackHeaders';
import { InspectorPanel } from './components/inspector/InspectorPanel';
import { parseMWSFile } from './utils/mwsParser';
import { exportMixdown, downloadBlob } from './utils/audioExport';
import { useEffect, useRef, useState } from 'react';
import * as Tone from 'tone';
import { ExporterModal } from './components/modals/ExporterModal';
import { NewSessionModal } from './components/modals/NewSessionModal';
import { ScaleSessionModal } from './components/modals/ScaleSessionModal';
import { ProgramSettingsModal } from './components/modals/ProgramSettingsModal';
import { AudioStrobeConfigModal } from './components/modals/AudioStrobeConfigModal';
import { DonateModal } from './components/modals/DonateModal';

function App() {
  const { tracks, engines, addEngine, duration, addTrack, isPlaying, togglePlay, setTracks, undo, redo, setZoom, pixelsPerSecond, isWaveformVisible, isSpectrumVisible, toggleWaveform, toggleSpectrum } = useSessionStore();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const [exportProgress, setExportProgress] = useState(0);
  const [isNewSessionModalOpen, setIsNewSessionModalOpen] = useState(false);
  const [isScaleSessionModalOpen, setIsScaleSessionModalOpen] = useState(false);
  const [isProgramSettingsModalOpen, setIsProgramSettingsModalOpen] = useState(false);
  const [isAudioStrobeConfigModalOpen, setIsAudioStrobeConfigModalOpen] = useState(false);
  const [isDonateModalOpen, setIsDonateModalOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'editing' | 'recording'>('editing');
  const timerRef = useRef<HTMLDivElement>(null);

  // Recording State
  const [isRecording, setIsRecording] = useState(false);
  const [micVolume, setMicVolume] = useState(0);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<BlobPart[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const meterRef = useRef<Tone.Meter | null>(null);

  // Sync Timer Display
  useEffect(() => {
    let frameId: number;
    const updateTimer = () => {
      if (timerRef.current) {
        const time = isPlaying ? Tone.Transport.seconds : 0;
        const hrs = Math.floor(time / 3600).toString().padStart(2, '0');
        const mins = Math.floor((time % 3600) / 60).toString().padStart(2, '0');
        const secs = Math.floor(time % 60).toString().padStart(2, '0');
        const ms = Math.floor((time % 1) * 100).toString().padStart(2, '0');
        timerRef.current.innerText = `${hrs}:${mins}:${secs}.${ms}`;
      }
      if (isPlaying) {
        frameId = requestAnimationFrame(updateTimer);
      }
    };
    if (isPlaying) {
      frameId = requestAnimationFrame(updateTimer);
    } else {
      updateTimer(); // Reset display when stopped
    }
    return () => cancelAnimationFrame(frameId);
  }, [isPlaying]);

  // Live Recording Logic
  useEffect(() => {
    let frameId: number;

    if (activeTab === 'recording') {
      const initMic = async () => {
        try {
          const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
          streamRef.current = stream;

          await Tone.start();
          const meter = new Tone.Meter();
          const source = Tone.getContext().createMediaStreamSource(stream);
          Tone.connect(source, meter);
          meterRef.current = meter;

          const mediaRecorder = new MediaRecorder(stream);
          mediaRecorder.ondataavailable = (e) => {
            if (e.data.size > 0) audioChunksRef.current.push(e.data);
          };
          mediaRecorder.onstop = () => {
            const blob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
            const url = URL.createObjectURL(blob);
            audioChunksRef.current = [];
            
            // Auto-download the recording (MWS Mixdown placeholder)
            const a = document.createElement('a');
            a.href = url;
            a.download = `MWS_Recording_${new Date().getTime()}.webm`;
            a.click();
            
            // Auto-add track to timeline
            addTrack('ambience', 'Recorded Audio (WebM)');
          };
          mediaRecorderRef.current = mediaRecorder;

          const updateMeter = () => {
            if (meterRef.current) {
              const val = meterRef.current.getValue();
              const decibels = typeof val === 'number' ? val : val[0];
              // Convert dB (-100 to 0) to percentage (0 to 100)
              const pct = Math.max(0, Math.min(100, (decibels + 60) * 1.66));
              setMicVolume(pct);
            }
            frameId = requestAnimationFrame(updateMeter);
          };
          frameId = requestAnimationFrame(updateMeter);

        } catch (e) {
          console.error("Microphone access denied", e);
          alert("Akses mikrofon ditolak atau tidak ditemukan.");
        }
      };
      initMic();
    } else {
      // Cleanup when leaving tab
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(t => t.stop());
        streamRef.current = null;
      }
      if (meterRef.current) {
        meterRef.current.dispose();
        meterRef.current = null;
      }
      setMicVolume(0);
      setIsRecording(false);
    }

    return () => cancelAnimationFrame(frameId);
  }, [activeTab, addTrack]);

  // Sync tracks with AudioEngine
  useEffect(() => {
    // Clear existing generators not in the current state
    // Implementation Note: AudioEngine currently doesn't expose all keys easily,
    // so for a robust implementation, the AudioEngine should have a 'syncState' method.
    // For now, we will just iterate and add/update generators based on nodes.
    
    const { tracks, isPlaying, soloTrackId } = useSessionStore.getState();

    tracks.forEach(track => {
      // Calculate effective volume based on Mute and Solo states
      let effectiveVolume = track.muted ? 0 : track.volume;
      if (soloTrackId && soloTrackId !== track.id) {
        effectiveVolume = 0; // Muted by solo
      }

      AudioEngine.updateTrackChannel(track.id, effectiveVolume, track.effects);

      track.nodes.forEach(node => {
        let beatFreq = node.properties.beatFreq || [];
        
        if (track.entrainmentTrackId) {
          const linkedEntrainment = tracks.find(t => t.id === track.entrainmentTrackId);
          if (linkedEntrainment && linkedEntrainment.nodes.length > 0) {
            // Grab the beat frequency graph from the linked entrainment track
            beatFreq = linkedEntrainment.nodes[0].properties.beatFreq || [];
          }
        }

        if (track.type === 'binaural') {
          AudioEngine.createBinauralBeat(node.id, track.id, {
            startTime: node.startTime,
            duration: node.duration,
            carrierFreq: node.properties.carrierFreq,
            beatFreq: beatFreq,
            volume: effectiveVolume * (node.properties.volume / 100)
          });
        } else if (track.type === 'isochronic' || track.type === 'audiostrobe') {
          AudioEngine.createIsochronicTone(node.id, track.id, {
            startTime: node.startTime,
            duration: node.duration,
            carrierFreq: node.properties.carrierFreq,
            beatFreq: beatFreq,
            volume: effectiveVolume * (node.properties.volume / 100),
            waveform: node.properties.waveform || 'square'
          });
        } else if (track.type === 'ambience') {
          // Sync ambience bounds to Transport
          AmbienceGenerator.startAmbience({
            startTime: node.startTime,
            duration: node.duration,
            soundSet: node.properties.soundSet,
            density: node.properties.density,
            volume: effectiveVolume * (node.properties.volume / 100)
          });
        }
      });
    });

    if (!isPlaying) {
      AmbienceGenerator.stopAmbience();
    }
  }, [tracks, isPlaying, useSessionStore.getState().soloTrackId]);

  // Engine Automation Runtime
  useEffect(() => {
    if (!isPlaying) return;

    const { engines, tracks } = useSessionStore.getState();
    const intervals: NodeJS.Timeout[] = [];

    engines.forEach(engine => {
      const updateMs = Math.max(100, engine.updatePeriod * 1000);
      
      const intervalId = setInterval(() => {
        // 1. Generate value based on engine type
        let generatedValue = 0;
        if (engine.type === 'random') {
          const min = engine.options.min || 0;
          const max = engine.options.max || 100;
          generatedValue = min + Math.random() * (max - min);
        } else if (engine.type === 'table') {
          generatedValue = 50; 
        } else if (engine.type === 'eeg') {
          generatedValue = 12; // Placeholder for biofeedback
        }

        // 2. Apply to targeted actions
        engine.actions.forEach(action => {
          if (!action.targetTrackId || !action.targetProperty) return;

          const targetTrack = tracks.find(t => t.id === action.targetTrackId);
          if (!targetTrack) return;

          // For each node currently active in the track
          targetTrack.nodes.forEach(node => {
            AudioEngine.setLiveParameter(node.id, targetTrack.type, action.targetProperty, generatedValue);
          });
          
          // Cascading logic: if targeting an Entrainment Track's beatFreq,
          // it implicitly affects linked Content Tracks as well.
          if (targetTrack.type === 'entrainment' && action.targetProperty === 'beatFreq') {
            const linkedTracks = tracks.filter(t => t.entrainmentTrackId === targetTrack.id);
            linkedTracks.forEach(linkedTrack => {
              linkedTrack.nodes.forEach(node => {
                AudioEngine.setLiveParameter(node.id, linkedTrack.type, 'beatFreq', generatedValue);
              });
            });
          }
        });
      }, updateMs);

      intervals.push(intervalId);
    });

    return () => intervals.forEach(clearInterval);
  }, [isPlaying, useSessionStore.getState().engines, useSessionStore.getState().tracks]);

  const handlePlayPause = async () => {
    await AudioEngine.initialize();
    await AmbienceGenerator.initialize();
    
    if (!isPlaying) {
      // Auto-stop at session duration
      Tone.Transport.scheduleOnce(() => {
        if (useSessionStore.getState().isPlaying) {
          useSessionStore.getState().togglePlay(); // This triggers stop
        }
      }, "+" + duration);
      
      AudioEngine.playAll();
    } else {
      AudioEngine.stopAll(); // This is now pause() internally
      Tone.Transport.cancel(0); // clear scheduled auto-stop
    }
    togglePlay();
  };

  const handleStop = () => {
    if (isPlaying) {
      togglePlay();
    }
    AudioEngine.stopAndReset();
    Tone.Transport.cancel(0);
  };

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const parsedTracks = await parseMWSFile(file);
      setTracks(parsedTracks);
    } catch (err) {
      console.error("Failed to parse MWS file:", err);
      alert("Gagal mengimpor file MWS.");
    }
    // reset input
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleSaveSession = () => {
    const sessionData = { version: '1.0', duration, tracks };
    const blob = new Blob([JSON.stringify(sessionData, null, 2)], { type: 'application/json' });
    downloadBlob(blob, 'session.mws');
  };

  const handleSkipBack = () => {
    Tone.Transport.seconds = 0;
  };

  const ZOOM_LEVELS = [1, 2, 5, 10, 20, 30, 40, 50, 75, 100, 150, 200];
  
  const handleZoomIn = () => {
    const currentIndex = ZOOM_LEVELS.findIndex(z => z >= pixelsPerSecond);
    if (currentIndex < ZOOM_LEVELS.length - 1) setZoom(ZOOM_LEVELS[currentIndex + 1]);
  };
  
  const handleZoomOut = () => {
    const currentIndex = ZOOM_LEVELS.findIndex(z => z >= pixelsPerSecond);
    if (currentIndex > 0) setZoom(ZOOM_LEVELS[currentIndex - 1]);
    // if it exactly matches or is smaller, findIndex returns first match or -1. 
    // Wait, if it's not found, findIndex returns -1.
    else if (currentIndex === -1) setZoom(ZOOM_LEVELS[ZOOM_LEVELS.length - 1]);
  };

  const handleRecord = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'inactive') {
      audioChunksRef.current = [];
      mediaRecorderRef.current.start();
      setIsRecording(true);
    }
  };

  const handleStopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  const handleExport = async () => {
    if (isPlaying) {
      handleStop(); // Stop playing before export
    }
    
    setIsExportModalOpen(true);
    setExportProgress(0);

    const interval = setInterval(() => {
      setExportProgress(prev => {
        if (prev >= 100) {
          clearInterval(interval);
          return 100;
        }
        return prev + 10;
      });
    }, 200);

    try {
      const blob = await exportMixdown(tracks, duration);
      downloadBlob(blob, 'MWS_Mixdown.wav');
    } catch (error) {
      console.error("Export failed:", error);
    } finally {
      // Keep modal open to show "Done"
    }
  };

  return (
    <div className="h-screen w-screen flex flex-col overflow-hidden relative font-sans">
      <ExporterModal 
        isOpen={isExportModalOpen} 
        progress={exportProgress} 
        onStop={() => {setIsExportModalOpen(false); setExportProgress(0);}}
        onPause={() => {}}
        onDone={() => {setIsExportModalOpen(false); setExportProgress(0);}}
      />
      <NewSessionModal 
        isOpen={isNewSessionModalOpen}
        onClose={() => setIsNewSessionModalOpen(false)}
        onSelectTemplate={() => {}}
      />
      <ScaleSessionModal 
        isOpen={isScaleSessionModalOpen}
        onClose={() => setIsScaleSessionModalOpen(false)}
      />
      <ProgramSettingsModal 
        isOpen={isProgramSettingsModalOpen}
        onClose={() => setIsProgramSettingsModalOpen(false)}
      />
      <AudioStrobeConfigModal 
        isOpen={isAudioStrobeConfigModalOpen}
        onClose={() => setIsAudioStrobeConfigModalOpen(false)}
      />
      <DonateModal 
        isOpen={isDonateModalOpen}
        onClose={() => setIsDonateModalOpen(false)}
      />

      {/* Top Menu Bar */}
      <div className="mws-menu-bar h-7 shrink-0 relative flex justify-between pr-2">
        <div className="flex items-center">
          {/* File Menu */}
          <div className="relative group">
            <div className="mws-menu-item">File</div>
            <div className="mws-dropdown">
              <div className="mws-dropdown-item" onClick={() => setIsNewSessionModalOpen(true)}><span>New Session</span><span className="text-slate-400">Ctrl+N</span></div>
              <div className="mws-dropdown-item" onClick={() => fileInputRef.current?.click()}><span>Open Session...</span><span className="text-slate-400">Ctrl+O</span></div>
              <div className="mws-dropdown-item" onClick={handleSaveSession}><span>Save Session</span><span className="text-slate-400">Ctrl+S</span></div>
              <div className="mws-dropdown-item" onClick={handleSaveSession}><span>Save Session As...</span></div>
              <div className="mws-dropdown-separator"></div>
              <div className="mws-dropdown-item" onClick={isExportModalOpen ? undefined : handleExport}>
                <span>Export to Audio File (WAV)...</span>
              </div>
              <div className="mws-dropdown-separator"></div>
              <div className="mws-dropdown-item"><span>Exit</span></div>
            </div>
          </div>
          {/* Edit Menu */}
          <div className="relative group">
            <div className="mws-menu-item">Edit</div>
            <div className="mws-dropdown">
              <div className="mws-dropdown-item" onClick={undo}><span>Undo</span><span className="text-slate-400">Ctrl+Z</span></div>
              <div className="mws-dropdown-item" onClick={redo}><span>Redo</span><span className="text-slate-400">Ctrl+Y</span></div>
              <div className="mws-dropdown-separator"></div>
              <div className="mws-dropdown-item text-slate-500"><span>Cut</span><span className="text-slate-500">Ctrl+X</span></div>
              <div className="mws-dropdown-item text-slate-500"><span>Copy</span><span className="text-slate-500">Ctrl+C</span></div>
              <div className="mws-dropdown-item text-slate-500"><span>Paste</span><span className="text-slate-500">Ctrl+V</span></div>
              <div className="mws-dropdown-item text-slate-500"><span>Delete</span><span className="text-slate-500">Del</span></div>
              <div className="mws-dropdown-separator"></div>
              <div className="mws-dropdown-item" onClick={() => setIsScaleSessionModalOpen(true)}><span>Scale Session...</span></div>
              <div className="mws-dropdown-separator"></div>
              <div className="mws-dropdown-item"><span>Select All</span><span className="text-slate-400">Ctrl+A</span></div>
              <div className="mws-dropdown-item"><span>Find / Replace</span></div>
            </div>
          </div>

          {/* Insert Menu */}
          <div className="relative group">
            <div className="mws-menu-item">Insert</div>
            <div className="mws-dropdown">
              <div className="mws-dropdown-item"><span>Add Engine Track</span></div>
              <div className="mws-dropdown-item group/sub relative">
                <span className="flex-1">Add Entrainment Track</span><span className="text-slate-400">▶</span>
                <div className="hidden group-hover/sub:block absolute left-full top-0 w-64 bg-[#1e293b]/95 backdrop-blur-xl border border-white/10 rounded-lg shadow-2xl py-2 z-50 text-[#e2e8f0] -ml-1">
                  <div className="mws-dropdown-item" onClick={() => addTrack('entrainment', 'Alpha Relaxation', 'alpha')}><span>Alpha (Relaxation)</span></div>
                  <div className="mws-dropdown-item" onClick={() => addTrack('entrainment', 'Theta Meditation', 'theta')}><span>Theta (Deep Meditation)</span></div>
                  <div className="mws-dropdown-item" onClick={() => addTrack('entrainment', 'Delta Sleep', 'delta')}><span>Delta (Deep Sleep)</span></div>
                  <div className="mws-dropdown-item" onClick={() => addTrack('entrainment', 'Beta Focus', 'beta')}><span>Beta (Focus & Energy)</span></div>
                  <div className="mws-dropdown-separator"></div>
                  <div className="mws-dropdown-item" onClick={() => addTrack('entrainment', 'Custom Entrainment', 'custom')}><span>Custom / Empty Track</span></div>
                </div>
              </div>
              <div className="mws-dropdown-item" onClick={() => addTrack('binaural', 'Binaural Beats ' + (tracks.length + 1))}><span>Add Content Track (Binaural)</span></div>
              <div className="mws-dropdown-item" onClick={() => addTrack('isochronic', 'Isochronic Tones ' + (tracks.length + 1))}><span>Add Content Track (Isochronic)</span></div>
              <div className="mws-dropdown-item" onClick={() => addTrack('audiostrobe', 'AudioStrobe')}><span>Add Content Track (AudioStrobe)</span></div>
              <div className="mws-dropdown-item" onClick={() => addTrack('ambience', 'Ambience ' + (tracks.length + 1))}><span>Add Content Track (Ambience)</span></div>
              <div className="mws-dropdown-separator"></div>
              <div className="mws-dropdown-item"><span>Insert Segment</span><span className="text-slate-400">F3</span></div>
              <div className="mws-dropdown-item"><span>Insert Marker</span></div>
              <div className="mws-dropdown-item"><span>Insert Text Note</span></div>
            </div>
          </div>

          {/* Node Menu */}
          <div className="relative group">
            <div className="mws-menu-item">Node</div>
            <div className="mws-dropdown">
              <div className="mws-dropdown-item"><span>Add Node</span><span className="text-slate-400">Ins</span></div>
              <div className="mws-dropdown-item"><span>Delete Node</span><span className="text-slate-400">Del</span></div>
              <div className="mws-dropdown-separator"></div>
              <div className="mws-dropdown-item"><span>Lock / Unlock Node</span></div>
              <div className="mws-dropdown-item"><span>Node Properties</span><span className="text-slate-400">Enter</span></div>
            </div>
          </div>

          {/* Audio Menu */}
          <div className="relative group">
            <div className="mws-menu-item">Audio</div>
            <div className="mws-dropdown">
              <div className="mws-dropdown-item"><span>Audio Options...</span></div>
              <div className="mws-dropdown-item"><span>Change Recording Device...</span></div>
              <div className="mws-dropdown-separator"></div>
              <div className="mws-dropdown-item"><span>Mixdown Options...</span></div>
            </div>
          </div>

          {/* Tools Menu */}
          <div className="relative group">
            <div className="mws-menu-item">Tools</div>
            <div className="mws-dropdown">
              <div className="mws-dropdown-item"><span>Session Analysis / Spectrum Analyzer</span></div>
              <div className="mws-dropdown-item"><span>Visual/Audio Generators</span></div>
              <div className="mws-dropdown-item" onClick={() => setIsAudioStrobeConfigModalOpen(true)}><span>AudioStrobe Configuration Tool</span></div>
              <div className="mws-dropdown-separator"></div>
              <div className="mws-dropdown-item"><span>Batch Export...</span></div>
            </div>
          </div>

          {/* Biofeedback Menu */}
          <div className="relative group">
            <div className="mws-menu-item">Biofeedback</div>
            <div className="mws-dropdown">
              <div className="mws-dropdown-item"><span>BioOptimization Wizard</span></div>
              <div className="mws-dropdown-item"><span>Biofeedback Graphing Wizard</span></div>
              <div className="mws-dropdown-item"><span>Biofeedback Control Wizard</span></div>
              <div className="mws-dropdown-item"><span className="text-blue-400">ℹ</span> <span>Important Biofeedback Information</span><span className="text-slate-400">▶</span></div>
              <div className="mws-dropdown-item"><span>Add Biofeedback Engines (Advanced)</span><span className="text-slate-400">▶</span></div>
              <div className="mws-dropdown-separator"></div>
              <div className="mws-dropdown-item"><span>LightStone (Wild Divine) Setup</span></div>
              <div className="mws-dropdown-item"><span>BioScan Setup</span></div>
              <div className="mws-dropdown-item"><span>GSR2 Setup</span></div>
              <div className="mws-dropdown-item"><span>ThoughtStream USB Setup</span></div>
              <div className="mws-dropdown-item bg-amber-500/20"><span>ThoughtStream (old version) Setup</span></div>
              <div className="mws-dropdown-item"><span>emWave (Freeze Framer) Setup</span></div>
              <div className="mws-dropdown-item"><span>Mind-Reflection Setup</span></div>
            </div>
          </div>

          <div className="relative group">
            <div className="mws-menu-item">Playback</div>
            <div className="mws-dropdown">
              <div className="mws-dropdown-item" onClick={handlePlayPause}><span>Play / Pause</span><span className="text-slate-400">Space</span></div>
              <div className="mws-dropdown-item" onClick={handleStop}><span>Stop</span><span className="text-slate-400">Esc</span></div>
            </div>
          </div>

          {/* Settings Menu */}
          <div className="relative group">
            <div className="mws-menu-item">Settings</div>
            <div className="mws-dropdown">
              <div className="mws-dropdown-item" onClick={() => setIsProgramSettingsModalOpen(true)}><span>Program Settings...</span></div>
              <div className="mws-dropdown-item"><span>Interface Options...</span></div>
              <div className="mws-dropdown-separator"></div>
              <div className="mws-dropdown-item"><span>Program Preferences...</span></div>
              <div className="mws-dropdown-item"><span>Hardware Manager...</span></div>
              <div className="mws-dropdown-item"><span>User Profiles / Accounts</span></div>
              <div className="mws-dropdown-item"><span>Keyboard Shortcuts...</span></div>
            </div>
          </div>

          {/* View Menu */}
          <div className="relative group">
            <div className="mws-menu-item">View</div>
            <div className="mws-dropdown">
              <div className="mws-dropdown-item relative group/sub">
                <span className="flex items-center justify-between w-full">Panels / Windows <span className="text-[8px]">▶</span></span>
                <div className="absolute left-full top-0 hidden group-hover/sub:block bg-[#1e293b]/95 backdrop-blur-xl border border-white/10 min-w-[200px] shadow-2xl py-2 rounded-lg">
                  <div className="mws-dropdown-item text-cyan-400"><span>✓ Engines Pane</span></div>
                  <div className="mws-dropdown-item text-cyan-400"><span>✓ Entrainment Pane</span></div>
                  <div className="mws-dropdown-item text-cyan-400"><span>✓ Content Pane</span></div>
                  <div className="mws-dropdown-item text-cyan-400"><span>✓ Inspector</span></div>
                  <div className="mws-dropdown-item text-cyan-400"><span>✓ Timeline</span></div>
                  <div className="mws-dropdown-separator"></div>
                  <div className={`mws-dropdown-item ${isWaveformVisible ? 'text-cyan-400' : ''}`} onClick={toggleWaveform}>
                    <span>{isWaveformVisible ? '✓ ' : ''}Waveform Display</span>
                  </div>
                  <div className={`mws-dropdown-item ${isSpectrumVisible ? 'text-cyan-400' : ''}`} onClick={toggleSpectrum}>
                    <span>{isSpectrumVisible ? '✓ ' : ''}Spectrum Analyzer</span>
                  </div>
                </div>
              </div>
              <div className="mws-dropdown-item text-cyan-400"><span>✓ Show/Hide Toolbar</span></div>
              <div className="mws-dropdown-item text-cyan-400"><span>✓ Timeline Ruler</span></div>
              <div className="mws-dropdown-separator"></div>
              <div className="mws-dropdown-item"><span>Reset Workspace Layout</span></div>
              <div className="mws-dropdown-item"><span>Full Screen</span><span className="text-slate-400">F11</span></div>
            </div>
          </div>

          {/* Help Menu */}
          <div className="relative group">
            <div className="mws-menu-item">Help</div>
            <div className="mws-dropdown">
              <div className="mws-dropdown-item"><span>Help Topics / Documentation</span><span className="text-slate-400">F1</span></div>
              <div className="mws-dropdown-item"><span>User Manual (PDF)</span></div>
              <div className="mws-dropdown-item"><span>Online Support / Community</span></div>
              <div className="mws-dropdown-separator"></div>
              <div className="mws-dropdown-item"><span>Check for Updates</span></div>
              <div className="mws-dropdown-item"><span>About Mind WorkStation</span></div>
            </div>
          </div>
        </div>

        {/* Right side of menu bar (Tabs) */}
        <div className="flex items-end h-full pt-1 space-x-1">
          <div 
            className="flex items-center text-rose-400 mr-4 text-xs cursor-pointer hover:text-rose-300 font-medium transition-colors"
            onClick={() => setIsDonateModalOpen(true)}
          >
            <Heart size={12} className="mr-1.5" fill="currentColor" /> Donate
          </div>
          <div 
            className={`${activeTab === 'editing' ? 'mws-tab-active' : 'mws-tab-inactive'} px-4 h-full flex items-center pt-1`}
            onClick={() => setActiveTab('editing')}
          >
            Editing / Playing
          </div>
          <div 
            className={`${activeTab === 'recording' ? 'mws-tab-active' : 'mws-tab-inactive'} px-4 h-full flex items-center pt-1`}
            onClick={() => setActiveTab('recording')}
          >
            Recording
          </div>
        </div>
      </div>

      {/* Toolbar Area */}
      <div className="mws-toolbar flex flex-col shrink-0 p-1.5 space-y-1.5 z-40 relative min-h-[46px]">
        {activeTab === 'editing' ? (
          <div className="flex items-center space-x-2">
            {/* Session Group */}
            <div className="flex space-x-1.5 border-r border-white/10 pr-2 h-8 items-center">
              <button className="mws-btn" title="New Session" onClick={() => setIsNewSessionModalOpen(true)}><File size={16} className="text-cyan-400" /></button>
              <button className="mws-btn" title="Open Session" onClick={() => fileInputRef.current?.click()}><FolderOpen size={16} className="text-amber-400" /></button>
              <button className="mws-btn" title="Save Session" onClick={handleSaveSession}><Save size={16} className="text-blue-400" /></button>
              <button className="mws-btn" title="Export" onClick={isExportModalOpen ? undefined : handleExport}>
                <MonitorUp size={16} className="text-green-400" />
              </button>
              <div className="mx-1 w-px h-5 bg-white/10"></div>
              <button className="mws-btn" title="Undo" onClick={undo}><Undo size={16} className="text-rose-400" /></button>
              <button className="mws-btn" title="Redo" onClick={redo}><Redo size={16} className="text-rose-400" /></button>
            </div>

            {/* Transport Group */}
            <div className="flex space-x-1.5 border-r border-white/10 pr-2 h-8 items-center">
              <div className="flex items-center mr-2">
                <span className="text-xs text-slate-400 mr-1.5">Length:</span>
                <select className="mws-inset px-2 py-0.5 text-xs bg-slate-800 text-slate-200 outline-none focus:ring-1 focus:ring-cyan-500">
                  <option>30 mins</option>
                </select>
              </div>
              <button className="mws-btn" title="Back to Start" onClick={handleSkipBack}><SkipBack size={16} className="text-slate-200" /></button>
              <button 
                onClick={handlePlayPause}
                className={`mws-btn ${isPlaying ? 'text-green-400 hover:shadow-[0_0_10px_rgba(74,222,128,0.3)]' : 'text-green-400 hover:shadow-[0_0_10px_rgba(74,222,128,0.3)]'}`} 
              >{isPlaying ? <Pause size={16} fill="currentColor" /> : <Play size={16} fill="currentColor" />}</button>
              <button 
                onClick={handleStop}
                className="mws-btn text-rose-500 hover:shadow-[0_0_10px_rgba(244,63,94,0.3)]"
              ><Square size={16} fill="currentColor" /></button>
            </div>

            {/* Timer Display */}
            <div ref={timerRef} className="mws-inset px-3 flex items-center bg-black text-cyan-400 font-mono text-lg font-bold min-w-[130px] justify-center tracking-wider border-r border-white/10 mr-2 h-8 shadow-[inset_0_0_10px_rgba(0,0,0,0.5)]">
              00:00:00.00
            </div>

            {/* Tool Group */}
            <div className="flex space-x-1.5 items-center border-r border-white/10 pr-2 h-8">
              <button className="mws-btn bg-cyan-500/20 border-cyan-500/50" title="Selection Arrow"><MousePointer2 size={16} className="text-cyan-400" /></button>
              <button className="mws-btn" title="Zoom In" onClick={handleZoomIn}><ZoomIn size={16} className="text-slate-300" /></button>
              <button className="mws-btn" title="Zoom Out" onClick={handleZoomOut}><ZoomOut size={16} className="text-slate-300" /></button>
              <select className="mws-inset px-1 h-6 text-xs w-16 bg-slate-800 outline-none" value={`${pixelsPerSecond}%`} disabled><option>{pixelsPerSecond}%</option></select>
            </div>

            {/* Fade Controls */}
            <div className="flex items-center space-x-4 text-xs text-slate-400 h-8">
              <div className="flex items-center">
                <span className="mr-1.5">Fade In:</span>
                <input type="number" defaultValue="0" className="mws-inset w-10 h-6 px-1.5 bg-slate-800 text-slate-200 outline-none focus:ring-1 focus:ring-cyan-500" />
                <span className="ml-1.5">secs</span>
              </div>
              <div className="flex items-center">
                <span className="mr-1.5">Fade Out:</span>
                <input type="number" defaultValue="0" className="mws-inset w-10 h-6 px-1.5 bg-slate-800 text-slate-200 outline-none focus:ring-1 focus:ring-cyan-500" />
                <span className="ml-1.5">secs</span>
              </div>
            </div>
          </div>
        ) : (
          <div className="flex items-center space-x-2">
            {/* Recording Toolbar */}
            {/* Record, Pause, Stop buttons */}
            <div className="flex space-x-1.5 border-r border-white/10 pr-2 h-8 items-center">
              <button className={`mws-btn group ${isRecording ? 'bg-rose-500/20 border-rose-500/50' : ''}`} title="Record" onClick={handleRecord}>
                <Circle size={16} className={`${isRecording ? 'text-rose-500 animate-pulse drop-shadow-[0_0_8px_rgba(244,63,94,0.8)]' : 'text-rose-500 group-hover:drop-shadow-[0_0_8px_rgba(244,63,94,0.8)]'} transition-all`} fill="currentColor" />
              </button>
              <button className="mws-btn" title="Pause Recording">
                <Pause size={16} className="text-amber-400" fill="currentColor" />
              </button>
              <button className="mws-btn" title="Stop Recording" onClick={handleStopRecording}>
                <Square size={16} className={`${isRecording ? 'text-slate-200 hover:text-rose-400' : 'text-slate-500'} transition-colors`} fill="currentColor" />
              </button>
              <button className="mws-btn" title="Mute Recording">
                <MicOff size={16} className="text-slate-400 hover:text-rose-400 transition-colors" />
              </button>
            </div>

            {/* Volume Meter */}
            <div className="flex items-center space-x-2 border-r border-white/10 pr-2 h-8">
              <Mic size={14} className={isRecording ? "text-rose-400 animate-pulse" : "text-cyan-400"} />
              <div className="w-48 h-3 bg-slate-900 border border-white/10 shadow-inner overflow-hidden flex rounded-sm relative">
                {/* Dynamic Volume Bar */}
                <div 
                  className="absolute left-0 top-0 bottom-0 bg-gradient-to-r from-emerald-500 via-amber-400 to-rose-500 transition-all duration-75"
                  style={{ width: `${micVolume}%` }}
                ></div>
                {/* Static overlay lines to simulate LEDs */}
                <div className="absolute inset-0 bg-[repeating-linear-gradient(90deg,transparent,transparent_2px,rgba(15,23,42,0.8)_2px,rgba(15,23,42,0.8)_3px)]"></div>
              </div>
            </div>

            {/* Waveform Monitor */}
            <div className="flex items-center space-x-2 border-r border-white/10 pr-2 h-8">
              <span className="text-[10px] text-slate-400">Waveform:</span>
              <div className="w-32 h-6 bg-slate-900 border border-white/10 shadow-inner relative overflow-hidden flex items-center justify-center">
                <div className={`absolute inset-0 flex items-center justify-between px-1 opacity-50 ${isRecording ? 'animate-pulse' : ''}`}>
                  <div className="w-[1px] h-[20%] bg-cyan-400"></div>
                  <div className="w-[1px] h-[60%] bg-cyan-400"></div>
                  <div className="w-[1px] h-[30%] bg-cyan-400"></div>
                  <div className="w-[1px] h-[80%] bg-cyan-400 shadow-[0_0_5px_rgba(34,211,238,0.8)]"></div>
                  <div className="w-[1px] h-[40%] bg-cyan-400"></div>
                  <div className="w-[1px] h-[90%] bg-cyan-400 shadow-[0_0_5px_rgba(34,211,238,0.8)]"></div>
                  <div className="w-[1px] h-[50%] bg-cyan-400"></div>
                  <div className="w-[1px] h-[20%] bg-cyan-400"></div>
                  <div className="w-[1px] h-[70%] bg-cyan-400 shadow-[0_0_5px_rgba(34,211,238,0.8)]"></div>
                  <div className="w-[1px] h-[30%] bg-cyan-400"></div>
                  <div className="w-[1px] h-[10%] bg-cyan-400"></div>
                </div>
                <div className="absolute top-1/2 left-0 right-0 h-[1px] bg-cyan-500/30"></div>
              </div>
            </div>

            {/* Device Settings */}
            <div className="flex items-center space-x-2 h-8 pl-2">
              <span className="text-[10px] text-slate-400">Device:</span>
              <select className="mws-inset h-6 px-1.5 text-xs bg-slate-800 text-cyan-400 outline-none w-36">
                <option>Default Microphone</option>
                <option>USB Audio Interface</option>
              </select>
              <label className="flex items-center text-[10px] text-slate-400 cursor-pointer ml-3">
                <input type="checkbox" className="mr-1.5 accent-cyan-500" defaultChecked />
                Noise Reduction
              </label>
            </div>
          </div>
        )}
      </div>

      {/* Main Workspace Area (Always Visible) */}
      <div className="flex-1 flex overflow-hidden p-1 space-x-1 bg-[#0b0f19]">

        {/* Left Sidebar (Vertical Tabs) */}
        <aside className="w-8 mws-panel border-white/5 flex flex-col items-center py-2 shrink-0 z-10 space-y-2">
          <div className="w-full py-4 flex flex-col items-center cursor-pointer text-slate-500 hover:text-slate-300 transition-colors" style={{ writingMode: 'vertical-rl', transform: 'rotate(180deg)' }}>
            <span className="text-xs tracking-wider">Track Properties</span>
          </div>
          <div className="w-full py-4 flex flex-col items-center cursor-pointer text-cyan-400 font-bold" style={{ writingMode: 'vertical-rl', transform: 'rotate(180deg)' }}>
            <span className="text-xs tracking-wider">Content Block</span>
          </div>
        </aside>

        {/* Content Block Panel */}
        <aside className="w-56 mws-panel flex flex-col shrink-0 z-10 overflow-hidden">
          <div className="mws-header">Add Content</div>
          <div className="flex-1 overflow-y-auto p-2 space-y-1.5">
            <button onClick={() => addTrack('binaural', 'Binaural Beats')} className="w-full text-left p-1.5 text-xs hover:bg-white/5 rounded transition-colors text-slate-300">+ Binaural Beats</button>
            <button onClick={() => addTrack('isochronic', 'Isochronic Tones')} className="w-full text-left p-1.5 text-xs hover:bg-white/5 rounded transition-colors text-slate-300">+ Isochronic Tones</button>
            <button onClick={() => addTrack('ambience', 'Ambience')} className="w-full text-left p-1.5 text-xs hover:bg-white/5 rounded transition-colors text-slate-300">+ Ambience</button>
            <button onClick={() => addTrack('audiostrobe', 'AudioStrobe')} className="w-full text-left p-1.5 text-xs hover:bg-white/5 rounded transition-colors text-slate-300">+ AudioStrobe</button>
            <div className="my-2 border-t border-white/10" />
            <input type="file" accept=".mws" ref={fileInputRef} style={{ display: 'none' }} onChange={handleImport} />
            <button onClick={() => fileInputRef.current?.click()} className="w-full text-left p-1.5 text-xs text-cyan-400 font-bold hover:bg-cyan-500/10 rounded transition-colors">Import Session (.mws)</button>
          </div>
        </aside>

        {/* Central Workspace: 3-Tier Stack */}
        <div className="flex-1 flex flex-col space-y-1 overflow-hidden">
          
          {/* Tier 1: Engines */}
          <div className="h-[15%] mws-panel flex flex-col shrink-0 overflow-hidden">
            <div className="mws-header justify-between">
              <span className="flex items-center"><span className="mr-1.5 text-[8px] opacity-70">▼</span> Engines</span>
              <div className="relative group">
                <button className="text-xs text-slate-400 hover:text-white transition-colors">Add Engine ▼</button>
                <div className="absolute right-0 top-full mt-1 hidden group-hover:block bg-[#1e293b]/95 backdrop-blur-xl border border-white/10 min-w-[150px] shadow-2xl py-1 rounded z-50">
                  <div className="mws-dropdown-item" onClick={() => addEngine('random', 'Randomizer')}><span>Randomizer</span></div>
                  <div className="mws-dropdown-item" onClick={() => addEngine('table', 'Data Table')}><span>Data Table</span></div>
                  <div className="mws-dropdown-item" onClick={() => addEngine('eeg', 'EEG Monitor')}><span>EEG Monitor</span></div>
                </div>
              </div>
            </div>
            <div className="flex-1 m-1.5 mws-inset overflow-x-auto flex items-center px-2 space-x-2">
              {engines.map(engine => {
                const isSelected = useSessionStore(state => state.selectedEngineId) === engine.id;
                return (
                  <div 
                    key={engine.id} 
                    onClick={() => useSessionStore.getState().selectEngine(engine.id)}
                    className={`flex flex-col items-center justify-center w-24 h-16 bg-slate-800/80 border rounded-lg cursor-pointer transition-colors shadow-lg
                      ${isSelected ? 'border-cyan-400 bg-slate-700/80 shadow-[0_0_10px_rgba(34,211,238,0.3)]' : 'border-white/10 hover:border-cyan-500/50 hover:bg-slate-700/80'}`}
                  >
                    <span className="text-cyan-400 mb-1">⚙️</span>
                    <span className="text-[10px] text-slate-300 text-center leading-tight truncate w-full px-1">{engine.name}</span>
                  </div>
                );
              })}
              {engines.length === 0 && (
                <div className="text-xs text-slate-500 italic">No engines running.</div>
              )}
            </div>
          </div>

          {/* Tier 2: Entrainment Controllers */}
          <div className="h-1/4 mws-panel flex flex-col shrink-0 overflow-hidden">
            <div className="mws-header justify-between">
              <span className="flex items-center"><span className="mr-1.5 text-[8px] opacity-70">▼</span> Entrainment Tracks</span>
              <button onClick={() => addTrack('entrainment', 'Entrainment Control')} className="text-xs text-slate-400 hover:text-white transition-colors">Add Entrainment ▼</button>
            </div>
            <div className="flex-1 flex overflow-hidden m-1.5 mws-inset relative">
              <TrackHeaders category="entrainment" />
              <Timeline category="entrainment" />
            </div>
          </div>

          {/* Tier 3: Content Tracks */}
          <div className="flex-1 mws-panel flex flex-col overflow-hidden">
            <div className="mws-header justify-between">
              <span className="flex items-center"><span className="mr-1.5 text-[8px] opacity-70">▼</span> Content Tracks</span>
              <button className="text-xs text-slate-400 hover:text-white transition-colors invisible">Add Content ▼</button>
            </div>
            <div className="flex-1 flex overflow-hidden m-1.5 mws-inset relative">
              <TrackHeaders category="content" />
              <Timeline category="content" />
            </div>
          </div>

        </div>

        {/* Right Sidebar (Inspector) */}
        <aside className="w-64 mws-panel flex flex-col shrink-0 overflow-hidden">
          <div className="mws-header justify-between">
            <span>Content Edit</span>
            <span title="Pin" className="cursor-pointer text-slate-400 hover:text-cyan-400 transition-colors">📌</span>
          </div>
          <div className="flex-1 overflow-y-auto">
            <InspectorPanel />
          </div>
        </aside>

      </div>

      {/* Log Window */}
      {activeTab === 'editing' && (
        <div className="h-32 mx-1 mb-1 mws-panel flex flex-col shrink-0 z-20 overflow-hidden">
          <div className="bg-[#0f172a]/80 px-3 py-1.5 flex items-center space-x-3 border-b border-white/10">
            <button className="mws-btn"><Save size={12} className="mr-1.5 text-cyan-400"/> Save Log</button>
            <div className="flex items-center text-xs text-slate-300">
              <input type="checkbox" id="showLog" defaultChecked className="mr-1.5 accent-cyan-500" />
              <label htmlFor="showLog" className="cursor-pointer">Show log window on session play</label>
            </div>
            <div className="flex-1 flex justify-end">
              <button className="mws-btn">Clear Log</button>
            </div>
          </div>
          <div className="flex-1 bg-[#05080f] shadow-inner overflow-y-auto text-xs font-mono p-2 leading-relaxed select-text border-b border-white/10">
            <div className="text-slate-500">[08/28/2014 12:40:45] <span className="text-slate-300">Preparing session for play...</span></div>
            <div className="text-slate-500">[08/28/2014 12:40:45] <span className="text-amber-400">Ensuring accurate playback...</span></div>
            <div className="text-slate-500">[08/28/2014 12:40:46] <span className="text-slate-400">Randomizing and arranging ambience elements for 'Ambience Generator 1' (Forest)...</span></div>
            <div className="text-slate-500">[08/28/2014 12:40:47] <span className="text-rose-400">Setting session volume to: 100%</span></div>
            <div className="text-slate-500">[08/28/2014 12:40:47] <span className="text-emerald-400 font-semibold">Session 'Beta - Left Brain, SMR - Right Brain.mws' started (playing)...</span></div>
          </div>
          <div className="h-6 bg-[#1e293b]/90 flex items-center px-3 cursor-pointer">
            <Layers size={12} className="text-cyan-400 mr-1.5" />
            <span className="text-xs font-bold text-slate-200">Log Terminal</span>
          </div>
        </div>
      )}

      {/* Status Bar */}
      <footer className="h-7 mws-menu-bar border-t border-white/10 flex items-center px-3 text-xs shrink-0 justify-between">
        <div className="flex-1 flex items-center h-full px-2 text-slate-300">
          <span className={`w-2 h-2 rounded-full mr-2 shadow-[0_0_5px_currentColor] transition-colors duration-300 ${isPlaying ? 'bg-emerald-400 text-emerald-400' : 'bg-rose-400 text-rose-400'}`}></span>
          {isPlaying ? 'Status: Playing session' : 'Status: Paused session'}
        </div>
        <div className="w-56 flex items-center h-full px-4 justify-center">
          <span className="mr-3 text-slate-400">Volume:</span>
          <input type="range" className="w-full h-1 bg-slate-700 rounded-full appearance-none accent-cyan-500" />
        </div>
        <div className="w-72 flex items-center h-full px-4 border-l border-white/10 text-slate-400 font-mono text-[10px]">
          Selection Start: 00:00:00  |  End: 00:00:00
        </div>
      </footer>
    </div>
  );
}

export default App;
