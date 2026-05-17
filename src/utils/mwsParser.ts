import { Track, EnvelopePointData } from '../store/useSessionStore';

export const parseMWSFile = async (file: File): Promise<Track[]> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const xmlString = e.target?.result as string;
        const parser = new DOMParser();
        const xmlDoc = parser.parseFromString(xmlString, "text/xml");
        
        const tracks = parseXMLToTracks(xmlDoc);
        resolve(tracks);
      } catch (err) {
        reject(err);
      }
    };
    reader.onerror = () => reject(new Error("Failed to read file"));
    reader.readAsText(file);
  });
};

const parseXMLToTracks = (xmlDoc: Document): Track[] => {
  const resultTracks: Track[] = [];
  const trackNodes = xmlDoc.querySelectorAll('track');

  // We need to find the Brainwave Pitch/Frequency track first (type 501 or similar)
  // to apply its envelope to the binaural/isochronic generators.
  let globalBeatFreqEnvelope: EnvelopePointData[] = [];
  
  // Pass 1: Find the global entrainment track
  trackNodes.forEach(trackXml => {
    const typeNode = trackXml.querySelector('properties > type');
    if (typeNode && typeNode.textContent === '501') {
      // Extract nodes for envelope
      const block = trackXml.querySelector('blocks > block');
      if (block) {
        const durationStr = block.querySelector('properties > duration')?.textContent || "00:30:00";
        const durationSecs = parseTimeStringToSeconds(durationStr);
        
        const nodes = block.querySelectorAll('nodes > node');
        nodes.forEach(node => {
          const timeStr = node.getAttribute('time') || "00:00:00";
          const timeSecs = parseTimeStringToSeconds(timeStr);
          const value = parseFloat(node.getAttribute('value') || "10");
          
          globalBeatFreqEnvelope.push({
            id: crypto.randomUUID(),
            timePct: durationSecs > 0 ? timeSecs / durationSecs : 0,
            valuePct: value / 40 // assuming 40Hz is max
          });
        });
      }
    }
  });

  if (globalBeatFreqEnvelope.length === 0) {
    // Default envelope if not found
    globalBeatFreqEnvelope = [
      { id: crypto.randomUUID(), timePct: 0, valuePct: 10/40 },
      { id: crypto.randomUUID(), timePct: 1, valuePct: 10/40 }
    ];
  }

  // Pass 2: Parse audio/tone tracks
  trackNodes.forEach(trackXml => {
    const properties = trackXml.querySelector('properties');
    const typeStr = properties?.querySelector('type')?.textContent;
    const name = properties?.querySelector('id')?.textContent || 'Imported Track';
    const muted = properties?.querySelector('muted')?.textContent === 'True';

    let trackType = null as Track['type'] | null;
    
    // Type 2 is usually Isochronic or Binaural (Tones)
    // Type 0 is usually Sound/Ambience
    if (typeStr === '2') trackType = 'isochronic'; // Defaulting to Isochronic for type 2
    else if (typeStr === '0') trackType = 'ambience';
    else if (typeStr === '3') trackType = 'audiostrobe';

    if (!trackType) return; // Skip unknown tracks like 501 (already parsed)

    const newTrack: Track = {
      id: crypto.randomUUID(),
      name,
      type: trackType,
      volume: 80,
      muted,
      nodes: []
    };

    const blockNodes = trackXml.querySelectorAll('blocks > block');
    blockNodes.forEach(blockXml => {
      const blockProps = blockXml.querySelector('properties');
      const startStr = blockProps?.querySelector('start')?.textContent || "00:00:00";
      const durationStr = blockProps?.querySelector('duration')?.textContent || "00:30:00";
      
      const startTime = parseTimeStringToSeconds(startStr);
      const duration = parseTimeStringToSeconds(durationStr);

      const nodeProps: any = {
        volume: 80
      };

      if (trackType === 'isochronic') {
        nodeProps.carrierFreq = 200; // MWS usually stores carrier in effects, simplifying for now
        nodeProps.beatFreq = [...globalBeatFreqEnvelope];
        if (trackType === 'isochronic') nodeProps.waveform = 'square';
      } else if (trackType === 'ambience') {
        // Try to guess soundset from track name
        nodeProps.soundSet = name.toLowerCase().includes('rain') ? 'rain' 
                          : name.toLowerCase().includes('stream') ? 'stream' 
                          : 'forest';
        nodeProps.density = 50;
      }

      newTrack.nodes.push({
        id: crypto.randomUUID(),
        startTime,
        duration,
        type: trackType,
        properties: nodeProps
      });
    });

    resultTracks.push(newTrack);
  });

  return resultTracks;
};

// Helper: "00:05:30" -> 330 seconds
function parseTimeStringToSeconds(timeStr: string): number {
  const parts = timeStr.split(':');
  if (parts.length === 3) {
    return (parseInt(parts[0]) * 3600) + (parseInt(parts[1]) * 60) + parseInt(parts[2]);
  }
  return 0;
}
