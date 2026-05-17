import { create } from 'zustand';

// Types
export type TrackType = 'binaural' | 'isochronic' | 'audiostrobe' | 'ambience' | 'audio' | 'entrainment';
export type EngineType = 'random' | 'table' | 'eeg';

export interface EnvelopePointData {
  id: string;
  timePct: number;
  valuePct: number;
}

export interface EngineAction {
  id: string;
  targetTrackId: string;
  targetProperty: string;
}

export interface Engine {
  id: string;
  type: EngineType;
  name: string;
  updatePeriod: number;
  options: Record<string, any>;
  actions: EngineAction[];
}

export interface Node {
  id: string;
  startTime: number;
  duration: number;
  type: string;
  properties: Record<string, any>;
}

export interface Track {
  id: string;
  type: TrackType;
  name: string;
  nodes: Node[];
  volume: number;
  muted: boolean;
  channelMode?: 'mono' | 'stereo';
  height?: number;
  effects?: { reverb: boolean; delay: boolean };
  entrainmentTrackId?: string | null;
}

export interface SessionState {
  engines: Engine[];
  tracks: Track[];
  selectedNodeId: string | null;
  selectedEngineId: string | null;
  soloTrackId: string | null;
  programSettings: {
    sampleRate: number;
    previewOptimization: 'speed' | 'precision';
    resumeAt: 'cursor' | 'start';
  };
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  history: Track[][];
  historyIndex: number;
  pixelsPerSecond: number;
  isWaveformVisible: boolean;
  isSpectrumVisible: boolean;
}

interface SessionActions {
  addEngine: (type: EngineType, name: string) => void;
  removeEngine: (id: string) => void;
  selectEngine: (id: string | null) => void;
  updateEngineProperty: (id: string, property: string, value: any) => void;
  updateEngineOptions: (id: string, options: Record<string, any>) => void;
  addEngineAction: (engineId: string, targetTrackId: string, targetProperty: string) => void;
  removeEngineAction: (engineId: string, actionId: string) => void;
  updateEngineAction: (engineId: string, actionId: string, updates: Partial<EngineAction>) => void;
  addTrack: (type: TrackType, name: string, templateType?: 'alpha' | 'beta' | 'theta' | 'delta' | 'custom') => void;
  removeTrack: (id: string) => void;
  selectNode: (id: string | null) => void;
  setTracks: (tracks: Track[]) => void;
  setZoom: (pps: number) => void;
  togglePlay: () => void;
  undo: () => void;
  redo: () => void;
  updateProgramSettings: (settings: Partial<SessionState['programSettings']>) => void;
  scaleSession: (newDuration: number, options: { scaleEntrainment: boolean, scaleContent: boolean, scaleSoundBounds: boolean }) => void;
  saveHistory: () => void;
  updateNodeProperty: (nodeId: string, property: string, value: any) => void;
  updateTrackVolume: (trackId: string, volume: number) => void;
  toggleTrackMute: (trackId: string) => void;
  toggleSoloTrack: (trackId: string | null) => void;
  updateTrackProperty: (trackId: string, property: string, value: any) => void;
  updateTrackEffects: (trackId: string, effects: { reverb: boolean; delay: boolean }) => void;
  toggleTrackChannelMode: (trackId: string) => void;
  updateEnvelopePoint: (nodeId: string, pointId: string, timePct: number, valuePct: number) => void;
  clearNodes: (trackId: string) => void;
  generateDefaultNodes: (trackId: string) => void;
  randomizeNodeEnvelope: (nodeId: string) => void;
  updateNodeTiming: (nodeId: string, startTime: number, duration: number) => void;
  toggleWaveform: () => void;
  toggleSpectrum: () => void;
}

export const useSessionStore = create<SessionState & SessionActions>((set) => ({
  engines: [],
  tracks: [],
  selectedNodeId: null,
  selectedEngineId: null,
  soloTrackId: null,
  programSettings: {
    sampleRate: 44100,
    previewOptimization: 'speed',
    resumeAt: 'cursor'
  },
  isPlaying: false,
  currentTime: 0,
  duration: 600, // 10 minutes default

  history: [[]],
  historyIndex: 0,
  pixelsPerSecond: 50,
  isWaveformVisible: false,
  isSpectrumVisible: false,

  addEngine: (type, name) => set((state) => {
    const newEngine: Engine = {
      id: crypto.randomUUID(),
      type,
      name,
      updatePeriod: 2,
      options: type === 'random' ? { min: 8, max: 12 } : {},
      actions: []
    };
    return { engines: [...state.engines, newEngine] };
  }),

  removeEngine: (id) => set((state) => ({
    engines: state.engines.filter(e => e.id !== id)
  })),

  selectEngine: (id) => set({ selectedEngineId: id, selectedNodeId: null }),

  updateEngineProperty: (id, property, value) => set((state) => ({
    engines: state.engines.map(e => e.id === id ? { ...e, [property]: value } : e)
  })),

  updateEngineOptions: (id, options) => set((state) => ({
    engines: state.engines.map(e => e.id === id ? { ...e, options: { ...e.options, ...options } } : e)
  })),

  addEngineAction: (engineId, targetTrackId, targetProperty) => set((state) => ({
    engines: state.engines.map(e => e.id === engineId ? {
      ...e,
      actions: [...e.actions, { id: crypto.randomUUID(), targetTrackId, targetProperty }]
    } : e)
  })),

  removeEngineAction: (engineId, actionId) => set((state) => ({
    engines: state.engines.map(e => e.id === engineId ? {
      ...e,
      actions: e.actions.filter(a => a.id !== actionId)
    } : e)
  })),

  updateEngineAction: (engineId, actionId, updates) => set((state) => ({
    engines: state.engines.map(e => e.id === engineId ? {
      ...e,
      actions: e.actions.map(a => a.id === actionId ? { ...a, ...updates } : a)
    } : e)
  })),

  addTrack: (type, name, templateType) => set((state) => {
    const trackId = crypto.randomUUID();
    
    // Auto-select the first entrainment track if adding a content track
    const firstEntrainment = state.tracks.find(t => t.type === 'entrainment');
    const entrainmentTrackId = (type !== 'entrainment' && firstEntrainment) ? firstEntrainment.id : null;

    let defaultProperties: Record<string, any> = {};
    
    if (type === 'entrainment') {
      let beatFreq = [
        { id: crypto.randomUUID(), timePct: 0, valuePct: 0.25 },
        { id: crypto.randomUUID(), timePct: 1, valuePct: 0.25 }
      ];

      if (templateType === 'alpha') {
        beatFreq = [
          { id: crypto.randomUUID(), timePct: 0, valuePct: 0.35 },
          { id: crypto.randomUUID(), timePct: 0.2, valuePct: 0.25 },
          { id: crypto.randomUUID(), timePct: 0.8, valuePct: 0.25 },
          { id: crypto.randomUUID(), timePct: 1, valuePct: 0.30 }
        ];
      } else if (templateType === 'beta') {
        beatFreq = [
          { id: crypto.randomUUID(), timePct: 0, valuePct: 0.35 },
          { id: crypto.randomUUID(), timePct: 0.2, valuePct: 0.45 },
          { id: crypto.randomUUID(), timePct: 1, valuePct: 0.45 }
        ];
      } else if (templateType === 'theta') {
        beatFreq = [
          { id: crypto.randomUUID(), timePct: 0, valuePct: 0.35 },
          { id: crypto.randomUUID(), timePct: 0.1, valuePct: 0.25 },
          { id: crypto.randomUUID(), timePct: 0.3, valuePct: 0.15 },
          { id: crypto.randomUUID(), timePct: 0.9, valuePct: 0.15 },
          { id: crypto.randomUUID(), timePct: 1, valuePct: 0.30 }
        ];
      } else if (templateType === 'delta') {
        beatFreq = [
          { id: crypto.randomUUID(), timePct: 0, valuePct: 0.35 },
          { id: crypto.randomUUID(), timePct: 0.1, valuePct: 0.20 },
          { id: crypto.randomUUID(), timePct: 0.3, valuePct: 0.05 },
          { id: crypto.randomUUID(), timePct: 0.95, valuePct: 0.05 },
          { id: crypto.randomUUID(), timePct: 1, valuePct: 0.25 }
        ];
      }

      defaultProperties = { beatFreq };
    } else if (type === 'binaural') {
      defaultProperties = { carrierFreq: 200, volume: 80, fadeIn: 0, fadeOut: 0 };
    } else if (type === 'isochronic') {
      defaultProperties = { carrierFreq: 400, volume: 80, fadeIn: 0, fadeOut: 0, waveform: 'square' };
    } else if (type === 'audiostrobe') {
      defaultProperties = { carrierFreq: 19200, color: 'white', intensity: 100, volume: 100, waveform: 'square' };
    } else if (type === 'ambience') {
      defaultProperties = { soundSet: 'Forest', volume: 70, fadeIn: 0, fadeOut: 0 };
    } else if (type === 'audio') {
      defaultProperties = { volume: 80, fadeIn: 0, fadeOut: 0 };
    }

    const defaultNode: Node = {
      id: crypto.randomUUID(),
      startTime: 0,
      duration: 300,
      type: type,
      properties: defaultProperties
    };

    const newTrack: Track = {
      id: trackId,
      type,
      name,
      nodes: [defaultNode],
      volume: 100,
      muted: false,
      channelMode: 'stereo',
      effects: { reverb: false, delay: false },
      entrainmentTrackId: entrainmentTrackId
    };

    const newTracks = [...state.tracks, newTrack];
    return {
      tracks: newTracks,
      history: [...state.history.slice(0, state.historyIndex + 1), newTracks],
      historyIndex: state.historyIndex + 1
    };
  }),

  removeTrack: (id: string) => set((state) => {
    const newTracks = state.tracks.filter(t => t.id !== id);
    return {
      tracks: newTracks,
      history: [...state.history.slice(0, state.historyIndex + 1), newTracks],
      historyIndex: state.historyIndex + 1
    };
  }),

  selectNode: (id) => set({ selectedNodeId: id, selectedEngineId: null }),

  setZoom: (pps) => set({ pixelsPerSecond: pps }),

  togglePlay: () => set((state) => ({ isPlaying: !state.isPlaying })),

  saveHistory: () => set((state) => ({
    history: [...state.history.slice(0, state.historyIndex + 1), state.tracks],
    historyIndex: state.historyIndex + 1
  })),

  updateNodeProperty: (nodeId, property, value) => set((state) => {
    const newTracks = state.tracks.map(t => ({
      ...t,
      nodes: t.nodes.map(n => n.id === nodeId ? { ...n, properties: { ...n.properties, [property]: value } } : n)
    }));
    return { tracks: newTracks };
  }),

  updateNodeTiming: (nodeId, startTime, duration) => set((state) => {
    const newTracks = state.tracks.map(t => ({
      ...t,
      nodes: t.nodes.map(n => n.id === nodeId ? { ...n, startTime, duration } : n)
    }));
    return { tracks: newTracks };
  }),

  updateTrackVolume: (trackId, volume) => set((state) => {
    const newTracks = state.tracks.map(t => t.id === trackId ? { ...t, volume } : t);
    return { tracks: newTracks };
  }),

  toggleTrackMute: (trackId) => set((state) => {
    const newTracks = state.tracks.map(t => t.id === trackId ? { ...t, muted: !t.muted } : t);
    return { tracks: newTracks };
  }),

  toggleSoloTrack: (trackId) => set((state) => ({
    soloTrackId: state.soloTrackId === trackId ? null : trackId
  })),

  toggleTrackChannelMode: (trackId) => set((state) => ({
    tracks: state.tracks.map(t => 
      t.id === trackId 
        ? { ...t, channelMode: t.channelMode === 'stereo' ? 'mono' : 'stereo' }
        : t
    )
  })),

  updateTrackProperty: (trackId, property, value) => set((state) => {
    const newTracks = state.tracks.map(t => t.id === trackId ? { ...t, [property]: value } : t);
    return { tracks: newTracks };
  }),

  updateTrackEffects: (trackId, effects) => set((state) => {
    const newTracks = state.tracks.map(t => 
      t.id === trackId ? { ...t, effects: { ...(t.effects || { reverb: false, delay: false }), ...effects } } : t
    );
    return { tracks: newTracks };
  }),

  updateEnvelopePoint: (nodeId, pointId, timePct, valuePct) => set((state) => {
    const newTracks = state.tracks.map(t => ({
      ...t,
      nodes: t.nodes.map(n => {
        if (n.id === nodeId && n.properties.beatFreq) {
          // Sort points by timePct after updating
          let newPoints = n.properties.beatFreq.map((p: any) =>
            p.id === pointId ? { ...p, timePct, valuePct } : p
          );
          // Keep start point at 0 and end point at 1
          newPoints = newPoints.sort((a: any, b: any) => a.timePct - b.timePct);
          if (newPoints.length > 0) {
            newPoints[0].timePct = 0;
            newPoints[newPoints.length - 1].timePct = 1;
          }
          return { ...n, properties: { ...n.properties, beatFreq: newPoints } };
        }
        return n;
      })
    }));
    return { tracks: newTracks };
  }),

  clearNodes: (trackId) => set((state) => {
    const newTracks = state.tracks.map(t => t.id === trackId ? { ...t, nodes: [] } : t);
    return { tracks: newTracks };
  }),

  generateDefaultNodes: (trackId) => set((state) => {
    const newTracks = state.tracks.map(t => {
      if (t.id === trackId) {
        const newNode: Node = {
          id: crypto.randomUUID(),
          type: t.type,
          startTime: 0,
          duration: 300, // 5 minutes default
          properties: {
            volume: 80,
            carrierFreq: t.type === 'binaural' || t.type === 'isochronic' ? 200 : undefined,
            beatFreq: t.type !== 'ambience' ? [
              { id: crypto.randomUUID(), timePct: 0, valuePct: 0.8 },
              { id: crypto.randomUUID(), timePct: 0.5, valuePct: 0.2 },
              { id: crypto.randomUUID(), timePct: 1, valuePct: 0.1 }
            ] : undefined,
            soundSet: t.type === 'ambience' ? 'forest' : undefined
          }
        };
        return { ...t, nodes: [newNode] };
      }
      return t;
    });
    return { tracks: newTracks };
  }),

  randomizeNodeEnvelope: (nodeId) => set((state) => {
    const newTracks = state.tracks.map(t => ({
      ...t,
      nodes: t.nodes.map(n => {
        if (n.id === nodeId && n.properties.beatFreq) {
          const newPoints = n.properties.beatFreq.map((p: any, i: number, arr: any[]) => {
            // Don't randomize time for first and last points, only value
            if (i === 0 || i === arr.length - 1) {
              return { ...p, valuePct: Math.random() };
            }
            return {
              ...p,
              valuePct: Math.random(),
              timePct: Math.max(0.05, Math.min(0.95, p.timePct + (Math.random() * 0.2 - 0.1)))
            };
          }).sort((a: any, b: any) => a.timePct - b.timePct);

          if (newPoints.length > 0) {
            newPoints[0].timePct = 0;
            newPoints[newPoints.length - 1].timePct = 1;
          }
          return { ...n, properties: { ...n.properties, beatFreq: newPoints } };
        }
        return n;
      })
    }));
    return { tracks: newTracks };
  }),

  setTracks: (tracks) => set((state) => ({
    tracks,
    history: [...state.history.slice(0, state.historyIndex + 1), tracks],
    historyIndex: state.historyIndex + 1
  })),

  toggleWaveform: () => set(state => ({ isWaveformVisible: !state.isWaveformVisible })),
  
  toggleSpectrum: () => set(state => ({ isSpectrumVisible: !state.isSpectrumVisible })),

  undo: () => set((state) => {
    if (state.historyIndex > 0) {
      return {
        historyIndex: state.historyIndex - 1,
        tracks: state.history[state.historyIndex - 1]
      };
    }
    return state;
  }),

  redo: () => set((state) => {
    if (state.historyIndex < state.history.length - 1) {
      return {
        historyIndex: state.historyIndex + 1,
        tracks: state.history[state.historyIndex + 1]
      };
    }
    return state;
  }),

  updateProgramSettings: (settings: Partial<SessionState['programSettings']>) => set((state) => ({
    programSettings: { ...state.programSettings, ...settings }
  })),

  scaleSession: (newDuration: number, options: { scaleEntrainment: boolean, scaleContent: boolean, scaleSoundBounds: boolean }) => set((state) => {
    const ratio = newDuration / state.duration;
    
    const scaledTracks = state.tracks.map(track => {
      const isEntrainment = track.type === 'entrainment';
      const isContent = track.type !== 'entrainment';
      
      const shouldScale = (isEntrainment && options.scaleEntrainment) || (isContent && options.scaleContent);
      
      if (!shouldScale) return track;

      return {
        ...track,
        nodes: track.nodes.map(node => {
          let scaledDuration = node.duration;
          let scaledStartTime = node.startTime;

          if (options.scaleSoundBounds) {
            scaledDuration = node.duration * ratio;
            scaledStartTime = node.startTime * ratio;
          }

          return {
            ...node,
            startTime: scaledStartTime,
            duration: scaledDuration
          };
        })
      };
    });

    return {
      duration: newDuration,
      tracks: scaledTracks
    };
  })
}));
