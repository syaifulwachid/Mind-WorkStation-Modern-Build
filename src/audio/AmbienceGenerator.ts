import * as Tone from 'tone';

export interface AmbienceOptions {
  startTime: number;
  duration: number;
  soundSet: string; // e.g., 'forest', 'rain', 'stream'
  density: number; // 0 to 100 (how often sounds play)
  volume: number; // 0 to 100
}

/**
 * AmbienceGenerator manages the procedural generation of background soundscapes
 * using micro-samples (like individual bird chirps, wind gusts, etc).
 */
class AmbienceGeneratorClass {
  private isInitialized = false;
  private volumeNode: Tone.Volume;
  private activeIntervals: number[] = [];

  // Simulated sound sets (in a real app, these would be URLs to audio files)
  // private soundSets: Record<string, string[]> = {
  //   forest: ['bird1', 'bird2', 'wind_rustle', 'cricket'],
  //   rain: ['drip1', 'drip2', 'splash', 'thunder_distant'],
  //   stream: ['water_gurgle1', 'water_gurgle2', 'splash_light']
  // };

  constructor() {
    this.volumeNode = new Tone.Volume(-10).toDestination();
  }

  async initialize() {
    if (!this.isInitialized) {
      await Tone.start();
      this.isInitialized = true;
    }
  }

  startAmbience(options: AmbienceOptions) {
    this.stopAmbience(); // clear previous
    this.volumeNode.volume.value = this.percentToDb(options.volume);

    // Calculate interval in seconds based on density
    // Range: from 10s (sparse) to 0.5s (dense)
    const baseIntervalSec = (10000 - (options.density * 95)) / 1000;

    // Create a Tone loop that randomly triggers sounds
    const eventId = Tone.Transport.scheduleRepeat((time) => {
      this.playRandomMicroSample(time);
    }, baseIntervalSec, options.startTime, options.duration);

    this.activeIntervals.push(eventId);
  }

  private playRandomMicroSample(time: number) {
    // const availableSounds = this.soundSets[soundSetName] || this.soundSets.forest;
    // const randomSound = availableSounds[Math.floor(Math.random() * availableSounds.length)];
    // console.log(`Ambience: Playing ${randomSound} at ${time}`);
    
    // For now, simulate with a synthetic noise burst
    const noise = new Tone.NoiseSynth({
      noise: { type: 'pink' },
      envelope: {
        attack: 0.1,
        decay: 0.2,
        sustain: 0,
        release: 0.5
      }
    });
    
    // Random panning between -0.8 and 0.8
    const panner = new Tone.Panner((Math.random() * 1.6) - 0.8).connect(this.volumeNode);
    noise.connect(panner);

    // Trigger precisely at the scheduled time
    noise.triggerAttackRelease("8n", time);

    // Clean up using Tone Transport instead of setTimeout
    Tone.Transport.schedule(() => {
      noise.dispose();
      panner.dispose();
    }, time + 1);
  }

  stopAmbience() {
    this.activeIntervals.forEach(id => Tone.Transport.clear(id));
    this.activeIntervals = [];
  }

  private percentToDb(percent: number): number {
    return percent === 0 ? -Infinity : 20 * Math.log10(percent / 100);
  }
}

export const AmbienceGenerator = new AmbienceGeneratorClass();
