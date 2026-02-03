"use client";
import { ScatterChart, Scatter, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine, Cell } from "recharts";
import { memo } from "react";

const StaticScatter = memo(({ data }: { data: any[] }) => (
  <Scatter name="G-Force" data={data} fill="#0ea5e9" opacity={0.2} line={false} shape="circle" isAnimationActive={false} />
));
StaticScatter.displayName = "StaticScatter";

export default function GGDiagram({ lat, lon, activeIndex }: any) {
  const data = lat.map((l: number, i: number) => ({ x: l, y: lon[i] }));
  const currentPoint = (activeIndex !== null) ? [data[activeIndex]] : [];

  return (
    <div className="w-full h-full bg-[#0f172a] rounded-xl border border-slate-700/50 relative flex items-center justify-center">
      <ResponsiveContainer width="100%" height="100%">
        <ScatterChart margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
          <XAxis type="number" dataKey="x" domain={[-3, 3]} stroke="#64748b" tick={false} axisLine={false} />
          <YAxis type="number" dataKey="y" domain={[-3, 3]} stroke="#64748b" tick={false} axisLine={false} />
          <ReferenceLine y={0} stroke="#94a3b8" />
          <ReferenceLine x={0} stroke="#94a3b8" />
          
          <StaticScatter data={data} />
          
          {/* Cursor Amarelo (Única coisa que move) */}
          <Scatter name="Current" data={currentPoint} fill="#facc15" shape="circle" isAnimationActive={false}>
             {currentPoint.map((_:any, i:number) => <Cell key={i} fill="#facc15" stroke="#fff" strokeWidth={2} />)}
          </Scatter>
        </ScatterChart>
      </ResponsiveContainer>
    </div>
  );
}