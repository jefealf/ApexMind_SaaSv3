"use client";
import { useMemo, memo } from "react";

// --- CAMADA ESTÁTICA (PESADA - SÓ RENDERIZA 1 VEZ) ---
const StaticMapLayer = memo(({ pointsBase, segments, strokeWidthMultiplier, colorMode, getSegmentColor }: any) => {
  return (
    <>
      {/* Pista Base (Asfalto) */}
      {pointsBase && (
        <>
          <polyline points={pointsBase} fill="none" stroke="#1e293b" strokeWidth={25 * strokeWidthMultiplier} strokeLinecap="round" strokeLinejoin="round" className="drop-shadow-lg" />
          <polyline points={pointsBase} fill="none" stroke="#334155" strokeWidth={20 * strokeWidthMultiplier} strokeLinecap="round" strokeLinejoin="round" className="opacity-50" />
          <polyline points={pointsBase} fill="none" stroke="#94a3b8" strokeWidth={1 * strokeWidthMultiplier} strokeDasharray={`${4 * strokeWidthMultiplier},${4 * strokeWidthMultiplier}`} className="opacity-50" />
        </>
      )}
      {/* Heatmap da Volta Atual */}
      {segments.map((seg: any, i: number) => (
        <line 
          key={i} 
          x1={seg.x1} y1={seg.y1} x2={seg.x2} y2={seg.y2} 
          stroke={getSegmentColor(seg.value, seg.min, seg.max)} 
          strokeWidth={3 * strokeWidthMultiplier} 
          strokeLinecap="round" 
        />
      ))}
    </>
  );
});
StaticMapLayer.displayName = "StaticMapLayer";

// --- COMPONENTE PRINCIPAL ---
export default function TrackMap({ map_x_target, map_y_target, map_x_base, map_y_base, highlightIndex, dataChannel = [], colorMode = "speed", zoom = false }: any) {
  
  if (!map_x_target || !map_y_target || map_x_target.length === 0) return <div className="text-slate-500 text-xs text-center p-10">NO MAP DATA</div>;

  const { pointsBase, segments, getCoord, viewBoxStatic } = useMemo(() => {
    const refX = (map_x_base && map_x_base.length) ? map_x_base : map_x_target;
    const refY = (map_y_base && map_y_base.length) ? map_y_base : map_y_target;
    
    const minX = Math.min(...refX), maxX = Math.max(...refX);
    const minY = Math.min(...refY), maxY = Math.max(...refY);
    const padding = Math.max(maxX - minX, maxY - minY) * 0.05;
    
    const rangeX = (maxX - minX) + (padding * 2) || 1;
    const rangeY = (maxY - minY) + (padding * 2) || 1;
    const originX = minX - padding, originY = minY - padding;

    const normalize = (x: number, y: number) => ({ x: ((x - originX) / rangeX) * 1000, y: 1000 - ((y - originY) / rangeY) * 1000 });

    const segs = [];
    const minVal = dataChannel.length ? Math.min(...dataChannel) : 0;
    const maxVal = dataChannel.length ? Math.max(...dataChannel) : 100;

    for (let i = 0; i < map_x_target.length - 1; i++) {
        const p1 = normalize(map_x_target[i], map_y_target[i]);
        const p2 = normalize(map_x_target[i+1], map_y_target[i+1]);
        segs.push({ x1: p1.x, y1: p1.y, x2: p2.x, y2: p2.y, value: dataChannel[i] || 0, min: minVal, max: maxVal });
    }

    let ptsBase = "";
    if (map_x_base) ptsBase = map_x_base.map((_:any, i:number) => { const c = normalize(map_x_base[i], map_y_base[i]); return `${c.x},${c.y}`; }).join(" ");

    return { pointsBase: ptsBase, segments: segs, getCoord: normalize, viewBoxStatic: "0 0 1000 1000" };
  }, [map_x_target, map_y_target, map_x_base, map_y_base, dataChannel]);

  const getSegmentColor = (val: number, min: number, max: number) => {
    if (colorMode === "none") return "#facc15";
    let pct = (val - min) / (max - min || 1);
    if (colorMode === "brake") return val < 1 ? "#3b82f6" : `rgb(255, ${Math.floor(255*(1-pct))}, ${Math.floor(255*(1-pct))})`;
    if (colorMode === "speed") return `hsl(${240 - (pct * 240)}, 100%, 50%)`;
    return "#facc15";
  };

  // Lógica do Cursor (Leve)
  let finalViewBox = viewBoxStatic;
  let multiplier = 1;
  let cursor = null;

  if (highlightIndex !== null && highlightIndex < map_x_target.length) {
     cursor = getCoord(map_x_target[highlightIndex], map_y_target[highlightIndex]);
     if (zoom) {
         const z = 40; const w = 1000/z; const h = 1000/z;
         finalViewBox = `${cursor.x - w/2} ${cursor.y - h/2} ${w} ${h}`;
         multiplier = 0.1;
     }
  }

  return (
    <div className="w-full h-full bg-[#0f172a] relative overflow-hidden rounded-xl">
      <svg viewBox={finalViewBox} className="w-full h-full transition-all duration-300 ease-out" preserveAspectRatio="xMidYMid meet">
        <StaticMapLayer pointsBase={pointsBase} segments={segments} strokeWidthMultiplier={multiplier} colorMode={colorMode} getSegmentColor={getSegmentColor} />
        {cursor && (
          <g transform={`translate(${cursor.x}, ${cursor.y})`}>
            {zoom && <circle r={8 * multiplier} fill="none" stroke="#fff" strokeWidth={0.5} className="animate-pulse" />}
            <circle r={4 * multiplier} fill="#fff" className="shadow-lg" />
            <circle r={1.5 * multiplier} fill="#000" />
          </g>
        )}
      </svg>
    </div>
  );
}