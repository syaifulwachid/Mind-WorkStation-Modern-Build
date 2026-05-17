import { useSessionStore, Track, Node } from '../../store/useSessionStore';
import { useMemo } from 'react';

interface TrackVisualizerProps {
  track: Track;
  height: number;
}

const generateWaveformPath = (node: Node, pixelsPerSecond: number, height: number, channelMode: 'mono' | 'stereo'): string => {
  const width = node.duration * pixelsPerSecond;
  const startX = node.startTime * pixelsPerSecond;

  // Frequency of the drawing (not real audio freq, just visual density)
  const visualFreq = 0.05;
  const points = Math.min(width, 1000); // Limit points for performance
  const stepX = width / points;

  // Center is exactly the middle of the track container
  const yCenter = height / 2;
  const isStereo = channelMode === 'stereo';

  // If stereo, left goes up from center, right goes down from center
  const amplitude = (node.properties?.volume || 50) / 100 * (height / 2) * 0.8;

  let path = `M ${startX} ${yCenter}`;

  for (let i = 0; i <= points; i++) {
    const x = startX + (i * stepX);
    const shape = node.properties?.waveform || 'sine';
    let yOffset = 0;

    if (shape === 'square' || node.type === 'isochronic') {
      yOffset = Math.sin(i * visualFreq) > 0 ? amplitude : -amplitude;
    } else {
      yOffset = Math.sin(i * visualFreq) * amplitude;
    }

    if (isStereo) {
      path += ` L ${x} ${yCenter - yOffset}`; // Left channel (mirrored up from center)
    } else {
      path += ` L ${x} ${yCenter + yOffset}`; // Mono (around center)
    }
  }

  if (isStereo) {
    path += ` M ${startX} ${yCenter}`;
    for (let i = 0; i <= points; i++) {
      const x = startX + (i * stepX);
      const shape = node.properties?.waveform || 'sine';
      let yOffset = 0;

      if (shape === 'square' || node.type === 'isochronic') {
        yOffset = Math.sin(i * visualFreq) > 0 ? amplitude : -amplitude; // Same phase for perfect mirror
      } else {
        yOffset = Math.sin(i * visualFreq) * amplitude;
      }

      path += ` L ${x} ${yCenter + yOffset}`; // Right channel (mirrored down from center)
    }
  }

  return path;
};

const generateSpectrumPath = (node: Node, pixelsPerSecond: number, height: number, channelMode: 'mono' | 'stereo'): string => {
  const width = node.duration * pixelsPerSecond;
  const startX = node.startTime * pixelsPerSecond;

  let path = '';
  const bars = Math.min(Math.floor(width / 4), 200); // 4px per bar, max 200 bars
  const stepX = width / bars;
  const isStereo = channelMode === 'stereo';
  const yCenter = height / 2;

  for (let i = 0; i < bars; i++) {
    const x = startX + (i * stepX);
    const volumeFactor = ((node.properties?.volume || 50) / 100);

    if (isStereo) {
      // Create a perfectly symmetrical spectrum reflection around the true center
      const barHeight = Math.random() * (height * 0.4) * volumeFactor;
      // Left channel (top half, goes up)
      path += ` M ${x} ${yCenter} L ${x} ${yCenter - barHeight}`;
      // Right channel (bottom half, goes down symmetrically)
      path += ` M ${x} ${yCenter} L ${x} ${yCenter + barHeight}`;
    } else {
      // Mono (bottom up from the bottom of the track)
      const barHeight = Math.random() * (height * 0.8) * volumeFactor;
      path += ` M ${x} ${height} L ${x} ${height - barHeight}`;
    }
  }
  return path;
};

export const TrackVisualizer = ({ track, height }: TrackVisualizerProps) => {
  const { isWaveformVisible, isSpectrumVisible, pixelsPerSecond } = useSessionStore();

  const waveformPaths = useMemo(() => {
    if (!isWaveformVisible) return [];
    return track.nodes.map(node => ({
      id: node.id,
      path: generateWaveformPath(node, pixelsPerSecond, height, track.channelMode || 'mono')
    }));
  }, [track.nodes, pixelsPerSecond, isWaveformVisible, track.channelMode, height]);

  const spectrumPaths = useMemo(() => {
    if (!isSpectrumVisible) return [];
    return track.nodes.map(node => ({
      id: node.id,
      path: generateSpectrumPath(node, pixelsPerSecond, height, track.channelMode || 'mono')
    }));
  }, [track.nodes, pixelsPerSecond, isSpectrumVisible, track.channelMode, height]);

  if (!isWaveformVisible && !isSpectrumVisible) return null;

  return (
    <svg className="absolute inset-0 w-full h-full pointer-events-none z-[50]" style={{ minHeight: height }}>
      {isSpectrumVisible && spectrumPaths.map(sp => (
        <path
          key={`spec-${sp.id}`}
          d={sp.path}
          stroke="rgba(167, 139, 250, 0.4)"
          strokeWidth="2"
          fill="none"
        />
      ))}
      {isWaveformVisible && waveformPaths.map(wp => {
        let strokeColor = "rgba(34, 211, 238, 0.9)"; // Original Cyan Theme (Default for Binaural/Ambience)
        if (track.type === 'isochronic') strokeColor = "rgba(249, 115, 22, 0.9)"; // Orange
        else if (track.type === 'audiostrobe') strokeColor = "rgba(59, 130, 246, 0.9)"; // True Blue

        return (
          <path
            key={`wave-${wp.id}`}
            d={wp.path}
            stroke={strokeColor}
            strokeWidth="1.5"
            fill="none"
          />
        );
      })}
    </svg>
  );
};
