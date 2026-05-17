import { useRef, useState, useEffect } from 'react';
import { useSessionStore, Node } from '../../store/useSessionStore';

interface EnvelopeGraphProps {
  node: Node;
  width: number;
  height: number;
}

export const EnvelopeGraph = ({ node, width, height }: EnvelopeGraphProps) => {
  const updateEnvelopePoint = useSessionStore(state => state.updateEnvelopePoint);
  const svgRef = useRef<SVGSVGElement>(null);
  
  const [draggingPoint, setDraggingPoint] = useState<string | null>(null);

  // Points from node properties
  const points = node.properties.beatFreq || [];

  const handleMouseMove = (e: MouseEvent) => {
    if (!draggingPoint || !svgRef.current) return;
    
    const rect = svgRef.current.getBoundingClientRect();
    const x = Math.max(0, Math.min(e.clientX - rect.left, rect.width));
    const y = Math.max(0, Math.min(e.clientY - rect.top, rect.height));

    let timePct = x / rect.width;
    let valuePct = 1 - (y / rect.height); // SVG y=0 is top, so we invert

    // Snap edges
    if (timePct < 0.02) timePct = 0;
    if (timePct > 0.98) timePct = 1;
    if (valuePct < 0.02) valuePct = 0;
    if (valuePct > 0.98) valuePct = 1;

    updateEnvelopePoint(node.id, draggingPoint, timePct, valuePct);
  };

  const handleMouseUp = () => {
    setDraggingPoint(null);
  };

  useEffect(() => {
    if (draggingPoint) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
    }
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [draggingPoint, handleMouseMove]); // eslint-disable-line

  if (points.length === 0) return null;

  const sortedPoints = [...points].sort((a: any, b: any) => a.timePct - b.timePct);
  
  // Construct path 'M x y L x y L x y'
  const pathD = sortedPoints.map((p, i) => {
    const x = p.timePct * width;
    const y = (1 - p.valuePct) * height;
    return `${i === 0 ? 'M' : 'L'} ${x} ${y}`;
  }).join(' ');

  // Fill path for bottom area
  const fillPathD = `${pathD} L ${width} ${height} L 0 ${height} Z`;

  return (
    <svg 
      ref={svgRef} 
      width="100%" 
      height="100%" 
      className="absolute inset-0 pointer-events-auto"
      style={{ overflow: 'visible' }}
    >
      {/* Fill Area */}
      <path 
        d={fillPathD} 
        fill="url(#graph-gradient)" 
        opacity={0.3} 
      />
      
      {/* Stroke Line */}
      <path 
        d={pathD} 
        stroke="#22d3ee" 
        strokeWidth="1.5" 
        fill="none" 
        className="drop-shadow-[0_0_3px_rgba(34,211,238,0.8)]"
      />

      {/* Control Nodes */}
      {sortedPoints.map((p) => {
        const x = p.timePct * width;
        const y = (1 - p.valuePct) * height;
        return (
          <g key={p.id} className="cursor-pointer">
            <circle 
              cx={x} 
              cy={y} 
              r={10} 
              fill="transparent"
              onMouseDown={(e) => {
                e.stopPropagation();
                setDraggingPoint(p.id);
              }}
            />
            <circle 
              cx={x} 
              cy={y} 
              r={3.5} 
              fill="#0f172a"
              stroke="#22d3ee"
              strokeWidth="1.5"
              className={`transition-all ${draggingPoint === p.id ? 'stroke-white fill-cyan-500 drop-shadow-[0_0_5px_rgba(255,255,255,0.8)]' : ''}`}
              style={{ pointerEvents: 'none' }}
            />
          </g>
        );
      })}

      <defs>
        <linearGradient id="graph-gradient" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#22d3ee" stopOpacity="0.8" />
          <stop offset="100%" stopColor="#22d3ee" stopOpacity="0" />
        </linearGradient>
      </defs>
    </svg>
  );
};
