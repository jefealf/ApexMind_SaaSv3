"use client";

import { AlertCircle } from "lucide-react";

interface SteeringWheelProps {
  angle: number;
  baseAngle?: number; // Opcional: ângulo da volta de referência para comparar
}

export default function SteeringWheel({ angle, baseAngle }: SteeringWheelProps) {
  // Definimos um limiar arbitrário para "excesso de esterço" (scrubbing).
  // Em carros GT3, passar de 100-110 graus geralmente significa que você está apenas arrastando pneu.
  const EXCESSIVE_THRESHOLD = 110;
  const isExcessive = Math.abs(angle) > EXCESSIVE_THRESHOLD;

  // Lógica de cores
  const baseColorClass = "text-slate-400";
  const activeColorClass = isExcessive 
    ? "text-red-500 drop-shadow-[0_0_8px_rgba(239,68,68,0.8)] transition-all duration-200" 
    : "text-cyan-400 transition-all duration-200";

  return (
    <div className="relative w-full h-full flex items-center justify-center overflow-hidden">
      
      {/* Indicador de "Excesso" no topo */}
      <div className={`absolute top-0 flex items-center gap-1 text-[10px] font-bold uppercase transition-opacity duration-300 ${isExcessive ? 'opacity-100 text-red-400' : 'opacity-0'}`}>
         <AlertCircle size={12} /> Scrubbing Detectado
      </div>

      {/* O Volante Rotativo (SVG) */}
      <div 
        className={`relative z-10 will-change-transform transition-transform duration-100 ease-out ${activeColorClass}`}
        style={{ transform: `rotate(${angle}deg)` }}
      >
        {/* SVG desenhado para parecer um volante GT moderno */}
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 160" className="w-40 h-32 fill-current">
          {/* Aro Principal */}
          <path d="M 30 80 Q 30 20 100 20 Q 170 20 170 80 L 170 100 Q 170 140 140 140 L 60 140 Q 30 140 30 100 Z" fill="none" stroke="currentColor" strokeWidth="12" strokeLinecap="round" />
          {/* Centro/Raio */}
          <path d="M 100 20 L 100 80 M 35 80 L 165 80 M 60 140 L 100 80 L 140 140" fill="none" stroke="currentColor" strokeWidth="8" strokeLinecap="round" opacity="0.8" />
          {/* Grips Laterais (Detalhe) */}
          <path d="M 24 70 L 24 110 M 176 70 L 176 110" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round" opacity="0.5"/>
          {/* Marcador Central Superior (Faixa de Centro) */}
          <rect x="96" y="10" width="8" height="20" fill={isExcessive ? "#ef4444" : "#facc15"} />
        </svg>
      </div>

      {/* (Opcional) Sombra do Volante de Referência para comparação visual */}
      {baseAngle !== undefined && baseAngle !== 0 && (
         <div 
            className={`absolute z-0 will-change-transform transition-transform duration-100 ease-out text-slate-700 opacity-30`}
            style={{ transform: `rotate(${baseAngle}deg)` }}
          >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 160" className="w-40 h-32 fill-current">
                 <path d="M 30 80 Q 30 20 100 20 Q 170 20 170 80 L 170 100 Q 170 140 140 140 L 60 140 Q 30 140 30 100 Z" fill="none" stroke="currentColor" strokeWidth="12" strokeLinecap="round" />
            </svg>
         </div>
      )}

      {/* Readout Digital Central (Fixo, não gira) */}
      <div className="absolute inset-0 flex items-center justify-center z-20 pointer-events-none pt-2">
        <div className={`bg-[#0f172a]/90 px-2 py-1 rounded border ${isExcessive ? 'border-red-500/50 text-red-400' : 'border-slate-700 text-white'}`}>
            <span className="font-mono font-bold text-lg">{angle.toFixed(0)}°</span>
        </div>
      </div>
    </div>
  );
}