import * as Tone from 'tone';

export interface EnvelopeData {
  timePct: number;
  valuePct: number;
}

/**
 * Interface for Binaural Beat Generator
 */
export interface BinauralOptions {
  startTime: number;
  duration: number;
  carrierFreq: number; // e.g., 200Hz
  beatFreq: EnvelopeData[];    // Envelope array
  volume: number;      // 0 to 100
}

/**
 * Interface for Isochronic Tone Generator
 */
export interface IsochronicOptions {
  startTime: number;
  duration: number;
  carrierFreq: number; // e.g., 200Hz
  beatFreq: EnvelopeData[];    // Envelope array
  volume: number;      // 0 to 100
  waveform: Tone.ToneOscillatorType; // 'square', 'sine', etc.
}

class AudioEngineClass {
  private isInitialized = false;
  
  // Master volume node
  private masterVolume: Tone.Volume;

  // Active generators
  private binauralGenerators: Map<string, { left: Tone.Oscillator, right: Tone.Oscillator, panL: Tone.Panner, panR: Tone.Panner, vol: Tone.Volume, waveform: Tone.Analyser, fft: Tone.Analyser }> = new Map();
  private isochronicGenerators: Map<string, { osc: Tone.Oscillator, lfo: Tone.LFO, vol: Tone.Volume, multiplier: Tone.Multiply, waveform: Tone.Analyser, fft: Tone.Analyser }> = new Map();
  
  // Track Channels
  private trackChannels: Map<string, { channel: Tone.Channel, reverb: Tone.Reverb, delay: Tone.FeedbackDelay }> = new Map();

  constructor() {
    this.masterVolume = new Tone.Volume(0).toDestination();
  }

  /**
   * Must be called after a user interaction (like clicking Play)
   */
  async initialize() {
    if (!this.isInitialized) {
      await Tone.start();
      this.isInitialized = true;
      console.log('Audio Engine (Tone.js) Initialized.');
    }
  }

  /**
   * Set global master volume
   */
  setMasterVolume(percent: number) {
    // Convert 0-100 to decibels (-60 to 0)
    const db = percent === 0 ? -Infinity : 20 * Math.log10(percent / 100);
    this.masterVolume.volume.rampTo(db, 0.1);
  }

  // --- Track Channels ---

  getTrackChannel(trackId: string): Tone.Channel {
    if (!this.trackChannels.has(trackId)) {
      const channel = new Tone.Channel().toDestination();
      
      const reverb = new Tone.Reverb({ decay: 4, wet: 0 });
      const delay = new Tone.FeedbackDelay("8n", 0.5);
      delay.wet.value = 0;

      // Routing: Channel -> Delay -> Reverb -> Master
      channel.disconnect();
      channel.chain(delay, reverb, this.masterVolume);

      this.trackChannels.set(trackId, { channel, reverb, delay });
    }
    return this.trackChannels.get(trackId)!.channel;
  }

  updateTrackChannel(trackId: string, volume: number, effects?: { reverb: boolean; delay: boolean }) {
    const data = this.trackChannels.get(trackId);
    if (!data) {
      this.getTrackChannel(trackId);
      this.updateTrackChannel(trackId, volume, effects);
      return;
    }

    // Set FX wetness based on toggle
    if (effects) {
      data.reverb.wet.rampTo(effects.reverb ? 0.6 : 0, 0.1);
      data.delay.wet.rampTo(effects.delay ? 0.4 : 0, 0.1);
    }
  }

  // --- Binaural Beats ---

  /**
   * Stop and clear all active generators
   */
  clearAll() {
    this.binauralGenerators.forEach(({ left, right, panL, panR, vol, waveform, fft }) => {
      left.dispose(); right.dispose(); panL.dispose(); panR.dispose(); vol.dispose(); waveform.dispose(); fft.dispose();
    });
    this.binauralGenerators.clear();

    this.isochronicGenerators.forEach(({ osc, lfo, vol, multiplier, waveform, fft }) => {
      osc.dispose(); lfo.dispose(); vol.dispose(); multiplier.dispose(); waveform.dispose(); fft.dispose();
    });
    this.isochronicGenerators.clear();
  }

  createBinauralBeat(id: string, trackId: string, options: BinauralOptions) {
    if (this.binauralGenerators.has(id)) {
      this.updateBinauralBeat(id, options);
      return;
    }

    const { carrierFreq, beatFreq, volume } = options;
    
    // Convert first point to frequency (Max beat freq = 40Hz for BWE)
    const initialBeatFreq = beatFreq.length > 0 ? beatFreq[0].valuePct * 40 : 10;
    
    // Left ear
    const leftFreq = carrierFreq - (initialBeatFreq / 2);
    const leftOsc = new Tone.Oscillator(leftFreq, 'sine');
    const panL = new Tone.Panner(-1);
    
    // Right ear
    const rightFreq = carrierFreq + (initialBeatFreq / 2);
    const rightOsc = new Tone.Oscillator(rightFreq, 'sine');
    const panR = new Tone.Panner(1);

    // Volume control
    const vol = new Tone.Volume(this.percentToDb(volume));

    leftOsc.connect(panL);
    rightOsc.connect(panR);
    
    panL.connect(vol);
    panR.connect(vol);
    
    const waveform = new Tone.Analyser('waveform', 256);
    const fft = new Tone.Analyser('fft', 256);
    
    vol.connect(waveform);
    vol.connect(fft);
    vol.connect(this.getTrackChannel(trackId));

    // Sync to transport and schedule start/stop
    leftOsc.sync().start(options.startTime).stop(options.startTime + options.duration);
    rightOsc.sync().start(options.startTime).stop(options.startTime + options.duration);

    this.binauralGenerators.set(id, { left: leftOsc, right: rightOsc, panL, panR, vol, waveform, fft });
    this.scheduleBinauralEnvelopes(id, options);
  }

  private scheduleBinauralEnvelopes(id: string, options: BinauralOptions) {
    const gen = this.binauralGenerators.get(id);
    if (!gen) return;

    const { startTime, duration, carrierFreq, beatFreq } = options;
    
    // Clear previously scheduled changes
    gen.left.frequency.cancelScheduledValues(0);
    gen.right.frequency.cancelScheduledValues(0);

    // Schedule new ramps
    beatFreq.forEach((point, index) => {
      const time = startTime + (point.timePct * duration);
      const freq = point.valuePct * 40; // Max 40Hz
      
      const leftTarget = carrierFreq - (freq / 2);
      const rightTarget = carrierFreq + (freq / 2);

      if (index === 0) {
        // Set initial value immediately at start
        gen.left.frequency.setValueAtTime(leftTarget, time);
        gen.right.frequency.setValueAtTime(rightTarget, time);
      } else {
        // Ramp smoothly to subsequent values
        gen.left.frequency.linearRampToValueAtTime(leftTarget, time);
        gen.right.frequency.linearRampToValueAtTime(rightTarget, time);
      }
    });
  }

  updateBinauralBeat(id: string, options: BinauralOptions) {
    const gen = this.binauralGenerators.get(id);
    if (!gen) return;

    const { volume } = options;
    gen.vol.volume.rampTo(this.percentToDb(volume), 0.1);
    this.scheduleBinauralEnvelopes(id, options);
  }

  removeBinauralBeat(id: string) {
    const gen = this.binauralGenerators.get(id);
    if (gen) {
      gen.left.stop().dispose();
      gen.right.stop().dispose();
      gen.panL.dispose();
      gen.panR.dispose();
      gen.vol.dispose();
      gen.waveform.dispose();
      gen.fft.dispose();
      this.binauralGenerators.delete(id);
    }
  }

  setLiveParameter(nodeId: string, trackType: string, property: string, value: number) {
    if (trackType === 'binaural') {
      const gen = this.binauralGenerators.get(nodeId);
      if (!gen) return;
      if (property === 'carrierFreq') {
        // Binaural needs to adjust both left and right around the beat frequency
        // For simplicity in live param injection, we'll assume a standard beat freq of 10 if not readily available
        const currentLeft = gen.left.frequency.value as number;
        const currentRight = gen.right.frequency.value as number;
        const currentBeat = Math.abs(currentRight - currentLeft);
        
        gen.left.frequency.rampTo(value - (currentBeat / 2), 0.1);
        gen.right.frequency.rampTo(value + (currentBeat / 2), 0.1);
      } else if (property === 'beatFreq') {
        const currentLeft = gen.left.frequency.value as number;
        const currentRight = gen.right.frequency.value as number;
        const currentCarrier = currentLeft + (Math.abs(currentRight - currentLeft) / 2);
        
        gen.left.frequency.rampTo(currentCarrier - (value / 2), 0.1);
        gen.right.frequency.rampTo(currentCarrier + (value / 2), 0.1);
      } else if (property === 'volume') {
        gen.vol.volume.rampTo(this.percentToDb(value), 0.1);
      }
    } else if (trackType === 'isochronic' || trackType === 'audiostrobe') {
      const gen = this.isochronicGenerators.get(nodeId);
      if (!gen) return;
      if (property === 'carrierFreq') {
        gen.osc.frequency.rampTo(value, 0.1);
      } else if (property === 'beatFreq') {
        gen.lfo.frequency.rampTo(value, 0.1);
      } else if (property === 'volume') {
        gen.vol.volume.rampTo(this.percentToDb(value), 0.1);
      }
    }
  }

  // --- Isochronic Tones ---

  createIsochronicTone(id: string, trackId: string, options: IsochronicOptions) {
    if (this.isochronicGenerators.has(id)) {
      this.updateIsochronicTone(id, options);
      return;
    }

    const { carrierFreq, beatFreq, volume, waveform } = options;

    const initialBeatFreq = beatFreq.length > 0 ? beatFreq[0].valuePct * 40 : 14;

    // The carrier tone
    const osc = new Tone.Oscillator(carrierFreq, 'sine');
    
    // The modulator (LFO) that controls amplitude to create the "beats"
    const lfo = new Tone.LFO({
      frequency: initialBeatFreq,
      type: waveform,
      min: 0,
      max: 1
    });

    const vol = new Tone.Volume(this.percentToDb(volume));
    
    // Multiply the carrier by the LFO to modulate amplitude
    const multiplier = new Tone.Multiply();

    osc.connect(multiplier);
    lfo.connect(multiplier.factor);
    multiplier.connect(vol);
    
    const analyzerWaveform = new Tone.Analyser('waveform', 256);
    const fft = new Tone.Analyser('fft', 256);
    
    vol.connect(analyzerWaveform);
    vol.connect(fft);
    vol.connect(this.getTrackChannel(trackId));

    // Sync to transport and schedule start/stop
    osc.sync().start(options.startTime).stop(options.startTime + options.duration);
    lfo.sync().start(options.startTime).stop(options.startTime + options.duration);

    this.isochronicGenerators.set(id, { osc, lfo, vol, multiplier, waveform: analyzerWaveform, fft });
    this.scheduleIsochronicEnvelopes(id, options);
  }

  private scheduleIsochronicEnvelopes(id: string, options: IsochronicOptions) {
    const gen = this.isochronicGenerators.get(id);
    if (!gen) return;

    const { startTime, duration, beatFreq } = options;
    
    gen.lfo.frequency.cancelScheduledValues(0);

    beatFreq.forEach((point, index) => {
      const time = startTime + (point.timePct * duration);
      const freq = point.valuePct * 40; // Max 40Hz
      
      if (index === 0) {
        gen.lfo.frequency.setValueAtTime(freq, time);
      } else {
        gen.lfo.frequency.linearRampToValueAtTime(freq, time);
      }
    });
  }

  updateIsochronicTone(id: string, options: IsochronicOptions) {
    const gen = this.isochronicGenerators.get(id);
    if (!gen) return;

    const { carrierFreq, volume, waveform } = options;
    
    gen.osc.frequency.rampTo(carrierFreq, 0.1);
    gen.lfo.type = waveform;
    gen.vol.volume.rampTo(this.percentToDb(volume), 0.1);
    
    this.scheduleIsochronicEnvelopes(id, options);
  }

  removeIsochronicTone(id: string) {
    const gen = this.isochronicGenerators.get(id);
    if (gen) {
      gen.osc.stop().dispose();
      gen.lfo.stop().dispose();
      gen.multiplier.dispose();
      gen.vol.dispose();
      gen.waveform.dispose();
      gen.fft.dispose();
      this.isochronicGenerators.delete(id);
    }
  }

  // --- Playback Controls ---

  playAll() {
    // Oscillators are synced to transport, so we just start the transport
    Tone.Transport.start();
  }

  stopAll() {
    Tone.Transport.pause();
    // Do not reset position so playhead resumes where it stopped
  }

  stopAndReset() {
    Tone.Transport.stop();
    Tone.Transport.seconds = 0;
  }

  // --- Visualizer Getters ---
  
  getTrackWaveform(id: string): Float32Array | null {
    const bin = this.binauralGenerators.get(id);
    if (bin) return bin.waveform.getValue() as Float32Array;
    
    const iso = this.isochronicGenerators.get(id);
    if (iso) return iso.waveform.getValue() as Float32Array;

    return null;
  }

  getTrackSpectrum(id: string): Float32Array | null {
    const bin = this.binauralGenerators.get(id);
    if (bin) return bin.fft.getValue() as Float32Array;
    
    const iso = this.isochronicGenerators.get(id);
    if (iso) return iso.fft.getValue() as Float32Array;

    return null;
  }

  // --- Helpers ---

  private percentToDb(percent: number): number {
    return percent === 0 ? -Infinity : 20 * Math.log10(percent / 100);
  }
}

export const AudioEngine = new AudioEngineClass();
