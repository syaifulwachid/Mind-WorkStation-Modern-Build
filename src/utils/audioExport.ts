import * as Tone from 'tone';
import { Track } from '../store/useSessionStore';

export const exportMixdown = async (tracks: Track[], durationSec: number): Promise<Blob> => {
  console.log(`Starting mixdown for ${durationSec} seconds...`);
  
  const buffer = await Tone.Offline(async ({ transport }) => {
    // We recreate the audio graph entirely within the offline context!
    // This is required because Web Audio API doesn't allow mixing nodes
    // created in the online context (AudioEngine singleton) with the offline context.

    const masterVolume = new Tone.Volume(0).toDestination();

    // Helper for DB conversion
    const percentToDb = (percent: number) => percent === 0 ? -Infinity : 20 * Math.log10(percent / 100);

    tracks.forEach(track => {
      if (track.muted) return; // Skip muted tracks
      
      // Recreate track channel with FX in offline context
      const channel = new Tone.Channel();
      const reverb = new Tone.Reverb({ decay: 4, wet: track.effects?.reverb ? 0.6 : 0 });
      const delay = new Tone.FeedbackDelay("8n", 0.5);
      delay.wet.value = track.effects?.delay ? 0.4 : 0;
      
      channel.chain(delay, reverb, masterVolume);

      const trackVol = track.volume / 100;

      track.nodes.forEach(node => {
        let beatFreq = node.properties.beatFreq || [];
        if (track.entrainmentTrackId) {
          const linkedEntrainment = tracks.find(t => t.id === track.entrainmentTrackId);
          if (linkedEntrainment && linkedEntrainment.nodes.length > 0) {
            beatFreq = linkedEntrainment.nodes[0].properties.beatFreq || [];
          }
        }

        const props = node.properties;
        const nodeVolPercent = props.volume || 100;
        const finalVolume = trackVol * (nodeVolPercent / 100) * 100;

        if (track.type === 'binaural') {
          const initialBeatFreq = beatFreq && beatFreq.length > 0 ? beatFreq[0].valuePct * 40 : 10;
          const carrierFreq = props.carrierFreq;
          
          const leftOsc = new Tone.Oscillator(carrierFreq - (initialBeatFreq / 2), 'sine');
          const panL = new Tone.Panner(-1);
          const rightOsc = new Tone.Oscillator(carrierFreq + (initialBeatFreq / 2), 'sine');
          const panR = new Tone.Panner(1);
          const vol = new Tone.Volume(percentToDb(finalVolume));

          leftOsc.connect(panL);
          rightOsc.connect(panR);
          panL.connect(vol);
          panR.connect(vol);
          vol.connect(channel);

          // Ramping
          if (beatFreq && beatFreq.length > 0) {
            beatFreq.forEach((point: any, index: number) => {
              const time = node.startTime + (point.timePct * node.duration);
              const freq = point.valuePct * 40;
              const leftTarget = carrierFreq - (freq / 2);
              const rightTarget = carrierFreq + (freq / 2);
              
              if (index === 0) {
                leftOsc.frequency.setValueAtTime(leftTarget, time);
                rightOsc.frequency.setValueAtTime(rightTarget, time);
              } else {
                leftOsc.frequency.linearRampToValueAtTime(leftTarget, time);
                rightOsc.frequency.linearRampToValueAtTime(rightTarget, time);
              }
            });
          }

          leftOsc.start(node.startTime).stop(node.startTime + node.duration);
          rightOsc.start(node.startTime).stop(node.startTime + node.duration);
        } 
        
        else if (track.type === 'isochronic' || track.type === 'audiostrobe') {
          const initialBeatFreq = beatFreq && beatFreq.length > 0 ? beatFreq[0].valuePct * 40 : 14;
          const osc = new Tone.Oscillator(props.carrierFreq, 'sine');
          const lfo = new Tone.LFO({
            frequency: initialBeatFreq,
            type: props.waveform || 'square',
            min: 0,
            max: 1
          });
          const vol = new Tone.Volume(percentToDb(finalVolume));
          const multiplier = new Tone.Multiply();

          osc.connect(multiplier);
          lfo.connect(multiplier.factor);
          multiplier.connect(vol);
          vol.connect(channel);

          if (props.beatFreq) {
            props.beatFreq.forEach((point: any, index: number) => {
              const time = node.startTime + (point.timePct * node.duration);
              const freq = point.valuePct * 40;
              if (index === 0) {
                lfo.frequency.setValueAtTime(freq, time);
              } else {
                lfo.frequency.linearRampToValueAtTime(freq, time);
              }
            });
          }

          lfo.start(node.startTime).stop(node.startTime + node.duration);
          osc.start(node.startTime).stop(node.startTime + node.duration);
        } 
        
        else if (track.type === 'ambience') {
          const baseIntervalSec = (10000 - (props.density * 95)) / 1000;
          const vol = new Tone.Volume(percentToDb(finalVolume)).connect(channel);
          
          transport.scheduleRepeat((time) => {
            // Only play if within node duration
            if (time >= node.startTime && time <= node.startTime + node.duration) {
              const noise = new Tone.NoiseSynth({
                noise: { type: 'pink' },
                envelope: { attack: 0.1, decay: 0.2, sustain: 0, release: 0.5 }
              });
              const panner = new Tone.Panner((Math.random() * 1.6) - 0.8).connect(vol);
              noise.connect(panner);
              noise.triggerAttackRelease("8n", time);
            }
          }, baseIntervalSec, node.startTime, node.duration);
        }
      });
    });

    transport.start(0);
  }, durationSec);

  console.log('Mixdown complete. Converting to WAV...');
  return audioBufferToWav(buffer);
};

export const downloadBlob = (blob: Blob, filename: string) => {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
};

// Simple encoder to convert an AudioBuffer to a valid WAV file blob.
function audioBufferToWav(buffer: Tone.ToneAudioBuffer): Blob {
  const numOfChan = buffer.numberOfChannels;
  const length = buffer.length * numOfChan * 2 + 44;
  const bufferWav = new ArrayBuffer(length);
  const view = new DataView(bufferWav);
  const channels = [];
  let sample;
  let offset = 0;
  let pos = 0;

  // write WAVE header
  setUint32(0x46464952); // "RIFF"
  setUint32(length - 8); // file length - 8
  setUint32(0x45564157); // "WAVE"

  setUint32(0x20746d66); // "fmt " chunk
  setUint32(16); // length = 16
  setUint16(1); // PCM (uncompressed)
  setUint16(numOfChan);
  setUint32(buffer.sampleRate);
  setUint32(buffer.sampleRate * 2 * numOfChan); // avg. bytes/sec
  setUint16(numOfChan * 2); // block-align
  setUint16(16); // 16-bit

  setUint32(0x61746164); // "data" - chunk
  setUint32(length - pos - 4); // chunk length

  for (let i = 0; i < buffer.numberOfChannels; i++) {
    channels.push(buffer.getChannelData(i));
  }

  while (pos < length) {
    for (let i = 0; i < numOfChan; i++) {
      sample = Math.max(-1, Math.min(1, channels[i][offset]));
      sample = (0.5 + sample < 0 ? sample * 32768 : sample * 32767) | 0;
      view.setInt16(pos, sample, true);
      pos += 2;
    }
    offset++;
  }

  return new Blob([bufferWav], { type: "audio/wav" });

  function setUint16(data: number) {
    view.setUint16(pos, data, true);
    pos += 2;
  }

  function setUint32(data: number) {
    view.setUint32(pos, data, true);
    pos += 4;
  }
}
