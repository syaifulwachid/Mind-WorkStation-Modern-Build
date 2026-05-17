import React, { useState, useRef, useCallback } from 'react';

export interface EnvelopePoint {
  id: string;
  timePct: number;  // 0 to 1 (X axis)
  valuePct: number; // 0 to 1 (Y axis)
}

interface EnvelopeEditorProps {
  label: string;
  points: EnvelopePoint[];
  onChange: (points: EnvelopePoint[]) => void;
}

export const EnvelopeEditor = ({ label, points, onChange }: EnvelopeEditorProps) => {
  const svgRef = useRef<SVGSVGElement>(null);
  const [draggingPointId, setDraggingPointId] = useState<string | null>(null);

  // Convert points to SVG coordinates
  const getCoords = (p: EnvelopePoint, width: number, height: number) => {
    return {
      x: p.timePct * width,
      y: (1 - p.valuePct) * height // Invert Y because SVG 0,0 is top-left
    };
  };

  const handlePointerDown = (e: React.PointerEvent, id: string) => {
    e.stopPropagation();
    e.currentTarget.setPointerCapture(e.pointerId);
    setDraggingPointId(id);
  };

  const handlePointerMove = useCallback((e: React.PointerEvent) => {
    if (!draggingPointId || !svgRef.current) return;
    
    const rect = svgRef.current.getBoundingClientRect();
    let newTimePct = (e.clientX - rect.left) / rect.width;
    let newValuePct = 1 - ((e.clientY - rect.top) / rect.height);
    
    // Clamp values
    newTimePct = Math.max(0, Math.min(1, newTimePct));
    newValuePct = Math.max(0, Math.min(1, newValuePct));

    const newPoints = points.map(p => {
      if (p.id === draggingPointId) {
        // Prevent moving the very first point's X axis from 0, and last point's X from 1
        // (Simplified logic: just allow moving any point for now, but sort them later)
        return { ...p, timePct: newTimePct, valuePct: newValuePct };
      }
      return p;
    });

    // Sort by time
    newPoints.sort((a, b) => a.timePct - b.timePct);
    onChange(newPoints);
  }, [draggingPointId, points, onChange]);

  const handlePointerUp = (e: React.PointerEvent) => {
    e.currentTarget.releasePointerCapture(e.pointerId);
    setDraggingPointId(null);
  };

  const handleSvgDoubleClick = (e: React.MouseEvent) => {
    if (!svgRef.current) return;
    const rect = svgRef.current.getBoundingClientRect();
    const timePct = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    const valuePct = Math.max(0, Math.min(1, 1 - ((e.clientY - rect.top) / rect.height)));
    
    const newPoints = [...points, { id: crypto.randomUUID(), timePct, valuePct }];
    newPoints.sort((a, b) => a.timePct - b.timePct);
    onChange(newPoints);
  };

  const deletePoint = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (points.length <= 2) return; // Keep at least 2 points
    onChange(points.filter(p => p.id !== id));
  };

  // Dimensions for rendering
  const width = 240;
  const height = 120;

  // Generate path string
  const sortedPoints = [...points].sort((a, b) => a.timePct - b.timePct);
  let pathD = "";
  if (sortedPoints.length > 0) {
    const start = getCoords(sortedPoints[0], width, height);
    pathD = `M ${start.x} ${start.y}`;
    for (let i = 1; i < sortedPoints.length; i++) {
      const pt = getCoords(sortedPoints[i], width, height);
      pathD += ` L ${pt.x} ${pt.y}`;
    }
  }

  return (
    <div className="w-full mb-3">
      <div className="text-[10px] text-cyan-400 font-semibold mb-1 flex justify-between">
        <span>{label}</span>
        <span className="text-[9px] text-slate-500 italic font-normal">Dobel-klik u/ tambah titik</span>
      </div>
      <div className="bg-slate-900 border border-cyan-500/30 rounded-md relative overflow-hidden select-none shadow-inner">
        <svg 
          ref={svgRef}
          viewBox={`0 0 ${width} ${height}`} 
          className="w-full h-auto cursor-crosshair"
          style={{ display: 'block', touchAction: 'none' }}
          onDoubleClick={handleSvgDoubleClick}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerLeave={handlePointerUp}
        >
          {/* Grid lines */}
          <line x1="0" y1={height/2} x2={width} y2={height/2} stroke="#1e293b" strokeWidth="1" strokeDasharray="4,4" />
          <line x1={width/2} y1="0" x2={width/2} y2={height} stroke="#1e293b" strokeWidth="1" strokeDasharray="4,4" />

          {/* Envelope Line */}
          <path d={pathD} fill="none" stroke="#06b6d4" strokeWidth="2" filter="drop-shadow(0 0 3px rgba(6,182,212,0.5))" />
          
          {/* Fill area under curve */}
          {sortedPoints.length > 1 && (
            <path 
              d={`${pathD} L ${getCoords(sortedPoints[sortedPoints.length-1], width, height).x} ${height} L ${getCoords(sortedPoints[0], width, height).x} ${height} Z`} 
              fill="rgba(6, 182, 212, 0.15)" 
            />
          )}

          {/* Points */}
          {sortedPoints.map((p) => {
            const coords = getCoords(p, width, height);
            return (
              <g key={p.id}>
                <circle 
                  cx={coords.x} 
                  cy={coords.y} 
                  r={draggingPointId === p.id ? 6 : 4} 
                  fill={draggingPointId === p.id ? "#ffffff" : "#22d3ee"} 
                  className="cursor-pointer transition-all drop-shadow-[0_0_5px_rgba(34,211,238,0.8)]"
                  onPointerDown={(e) => handlePointerDown(e, p.id)}
                  onContextMenu={(e) => { e.preventDefault(); deletePoint(p.id, e); }}
                />
              </g>
            );
          })}
        </svg>
      </div>
    </div>
  );
};
