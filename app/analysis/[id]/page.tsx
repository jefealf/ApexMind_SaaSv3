"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import axios from "axios";
import {
  ArrowLeft, Zap, AlertCircle, Map as MapIcon,
  Gauge, Footprints, ZoomIn, Trophy,
  Cloud, Thermometer, Wrench, Fuel, Combine, Droplets
} from "lucide-react";
import Link from "next/link";
import CanvasTrackMap from "@/components/CanvasTrackMap"; // [NEW]
import CanvasGG from "@/components/CanvasGG";             // [NEW]
import SteeringWheel from "@/components/SteeringWheel";   // Keep as is, it's light
import TelemetryChart, { TelemetryChartRef } from "@/components/TelemetryChart"; // [NEW]

// --- HELPER PARA CORES ---
function getAreaColor(val: number) {
  // Helper para gerar cores baseadas em positivo/negativo se necessário
  return val > 0 ? 'rgba(239, 68, 68, 0.2)' : 'rgba(34, 197, 94, 0.2)';
}

export default function AnalysisPage() {
  const params = useParams();
  const router = useRouter();
  const currentLapId = Number(params.id);

  const [data, setData] = useState<any>(null);
  const [idealLap, setIdealLap] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [trackLaps, setTrackLaps] = useState<any[]>([]);
  const [referenceId, setReferenceId] = useState<number | null>(null);
  const [activeIndex, setActiveIndex] = useState<number | null>(null);

  const [heatmapMode, setHeatmapMode] = useState<"speed" | "brake" | "throttle" | "gear">("speed");
  const [isZoomed, setIsZoomed] = useState(false);

  // References to Chart APIs for syncing
  const deltaChartRef = useRef<TelemetryChartRef>(null);
  const inputsChartRef = useRef<TelemetryChartRef>(null);
  const speedChartRef = useRef<TelemetryChartRef>(null);

  // 1. Inicialização
  useEffect(() => {
    async function init() {
      try {
        const lapsRes = await axios.get("http://127.0.0.1:8000/laps?limit=200");
        const allLaps = lapsRes.data;
        const currentLapInfo = allLaps.find((l: any) => l.id === currentLapId);
        if (!currentLapInfo) throw new Error("Volta não encontrada.");

        const sessionLaps = allLaps.filter((l: any) =>
          l.track_name === currentLapInfo.track_name
        ).sort((a: any, b: any) => a.lap_number - b.lap_number);

        setTrackLaps(sessionLaps);

        const validLaps = sessionLaps.filter((l: any) => l.lap_time > 45 && l.lap_time < 300);
        const bestLap = validLaps.sort((a: any, b: any) => a.lap_time - b.lap_time)[0];

        try {
          const opt = await axios.get(`http://127.0.0.1:8000/analysis/optimal/${currentLapInfo.track_name}/${currentLapInfo.car_name}`);
          setIdealLap(opt.data);
        } catch (e) { }

        if (bestLap) setReferenceId(bestLap.id);
        else setReferenceId(currentLapId);

      } catch (err: any) {
        setError(err.message);
        setLoading(false);
      }
    }
    init();
  }, [currentLapId]);

  // 2. Carrega Comparação
  useEffect(() => {
    if (!referenceId) return;
    async function fetchComparison() {
      setLoading(true);
      try {
        const res = await axios.get(`http://127.0.0.1:8000/compare/${referenceId}/${currentLapId}`);
        const raw = res.data.chart_data;

        // Transform Data for Lightweight Charts
        // We use distance (or time index) as 'time' axis for charts. 
        // Using index 0...N is simplest for syncing if sample rate is constant.

        const len = raw.time_delta.length;
        const speedSeries = [];
        const speedRefSeries = [];
        const deltaSeries = [];
        const throttleSeries = [];
        const brakeSeries = [];
        const throttleRefSeries = [];
        const brakeRefSeries = [];

        // Pre-allocate or map
        for (let i = 0; i < len; i++) {
          const t = i; // using index as virtual time
          speedSeries.push({ time: t, value: raw.speed_target[i] });
          speedRefSeries.push({ time: t, value: raw.speed_base[i] });

          deltaSeries.push({ time: t, value: raw.time_delta[i] });

          throttleSeries.push({ time: t, value: raw.throttle_target[i] * 100 });
          throttleRefSeries.push({ time: t, value: (raw.throttle_target[i] * 100) }); // ? maybe ref has its own?
          // Noticed API returns target/base for speed/steer but raw.throttle_target?
          // Assuming ref throttle is not available in 'chart_data' based on previous code view?
          // Checking previous code: previous InputsChart only used 'target' values.

          brakeSeries.push({ time: t, value: raw.brake_target[i] * 100 });
        }

        setData({
          ...res.data,
          charts: {
            speed: speedSeries,
            speedRef: speedRefSeries,
            delta: deltaSeries,
            throttle: throttleSeries,
            brake: brakeSeries
          },
          rawArrays: {
            // Needed for Map/GG
            speed: raw.speed_target,
            brake: raw.brake_target ? raw.brake_target.map((v: number) => v * 100) : [],
            throttle: raw.throttle_target ? raw.throttle_target.map((v: number) => v * 100) : [],
            gear: raw.gear_target,
            lat: raw.lat_accel_target || [],
            lon: raw.lon_accel_target || [],
            steer: raw.steer_target || [],
            steerBase: raw.steer_base || []
          }
        });
        setError("");
      } catch (err) { setError("Erro ao comparar."); }
      finally { setLoading(false); }
    }
    fetchComparison();
  }, [referenceId, currentLapId]);

  // --- SYNC LOGIC ---
  const handleCrosshairMove = useCallback((time: number | null, point?: any) => {
    // Sync all charts to this time index
    if (time === null) {
      setActiveIndex(null);
      return;
    }

    const idx = time as number; // Since we mapped time=index
    setActiveIndex(idx);

    // Programmatically move crosshairs other charts
    [deltaChartRef, inputsChartRef, speedChartRef].forEach(ref => {
      const api = ref.current?.api();
      if (api) {
        // Lightweight charts doesn't strictly support "setting" crosshair position via public API easily 
        // without using setVisibleRange or proprietary tricks.
        // However, we can at least use activeIndex to drive the React components (Map/GG/Wheel).
        // For chart-to-chart sync, lightweight-charts usually requires a logical sync wrapper.
        // For now, we will just let them be independent or rely on hover.
        // BUT: If the user hovers one, we want the INDEX to update the Map.
      }
    });
  }, []);

  // Custom Sync Effect: if we want one chart to drive others, we need the chart instance. 
  // For simplicity significantly better performance than recharts is already achieved by just using Canvas.
  // We'll stick to updating 'activeIndex' state which drives the Map/Wheel.

  if (loading && !data) return <div className="min-h-screen bg-[#0f172a] text-cyan-500 flex items-center justify-center animate-pulse">Carregando...</div>;
  if (error) return <div className="text-white bg-red-900 p-10 flex items-center justify-center h-screen">{error}</div>;

  return (
    <div className="min-h-screen bg-[#0f172a] text-white p-6 font-sans">

      {/* HEADER */}
      <div className="mb-6 sticky top-0 bg-[#0f172a]/95 backdrop-blur z-30 border-b border-slate-800 pb-4">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-4">
            <Link href="/" className="p-2 bg-slate-800 rounded-lg hover:bg-slate-700 text-slate-400 hover:text-white transition-colors">
              <ArrowLeft size={20} />
            </Link>
            <div>
              <h1 className="text-xl font-bold tracking-tight text-white">{data?.metadata?.track_name}</h1>
              <div className="flex items-center gap-3 text-xs text-slate-400">
                <span className="flex items-center gap-1"><Cloud size={12} /> 24°C</span>
                <span className="flex items-center gap-1"><Thermometer size={12} /> 38°C Track</span>
              </div>
            </div>
          </div>
          <div className="flex gap-4">
            <div className="text-right">
              <p className="text-[10px] uppercase text-slate-500 font-bold">Gap para Ref</p>
              <p className={`text-2xl font-mono font-bold leading-none ${data.metadata.gap_total > 0 ? 'text-red-500' : 'text-green-400'}`}>
                {data.metadata.gap_total > 0 ? "+" : ""}{data.metadata.gap_total.toFixed(3)}s
              </p>
            </div>
          </div>
        </div>

        {/* TIMELINE (Keep existing HTML/CSS implementation as it's not the bottleneck, but optimize list rendering if needed) */}
        <div className="flex items-end gap-2 h-16 w-full overflow-x-auto custom-scrollbar pb-2">
          {trackLaps.map((lap) => {
            const refTime = data?.metadata?.base_time || lap.lap_time;
            let heightPct = 100;
            if (lap.lap_time > 45) {
              const diff = lap.lap_time - refTime;
              heightPct = Math.max(30, 100 - (diff * 5));
            } else { heightPct = 20; }

            return (
              <div
                key={lap.id}
                onClick={() => router.push(`/analysis/${lap.id}`)}
                className={`group relative flex-shrink-0 w-8 rounded-t-sm cursor-pointer transition-all ${lap.id === currentLapId ? "bg-yellow-400 opacity-100 ring-2 ring-white z-10" : lap.id === referenceId ? "bg-cyan-400 opacity-100" : "bg-slate-600 opacity-60 hover:opacity-100"}`}
                style={{ height: `${heightPct}%` }}
              >
                {/* Tooltip implementation simplified */}
              </div>
            )
          })}
        </div>

        <div className="flex items-center justify-between text-[10px] text-slate-500 mt-1 px-1">
          <div className="flex gap-3">
            <span className="flex items-center gap-1"><div className="w-2 h-2 bg-yellow-400 rounded-sm"></div> Atual</span>
            <span className="flex items-center gap-1"><div className="w-2 h-2 bg-cyan-400 rounded-sm"></div> Referência</span>
          </div>
          <div className="flex items-center gap-2">
            <span>Comparar com:</span>
            <select value={referenceId || ""} onChange={(e) => setReferenceId(Number(e.target.value))} className="bg-slate-900 border border-slate-700 rounded px-2 py-0.5 text-xs text-cyan-400 focus:outline-none">
              {trackLaps.map(l => (<option key={l.id} value={l.id}>{l.id === referenceId ? "★ " : ""}V{l.lap_number} - {l.lap_time.toFixed(3)}s</option>))}
            </select>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* COLUNA ESQUERDA */}
        <div className="lg:col-span-2 space-y-6">

          {/* VOLTA IDEAL */}
          {idealLap && (
            <div className="bg-gradient-to-r from-slate-800 to-slate-900 p-4 rounded-xl border border-slate-700/50 shadow-lg flex items-center justify-between relative overflow-hidden">
              <div className="flex items-center gap-4 z-10">
                <div className="p-3 bg-purple-500/20 rounded-xl text-purple-400 border border-purple-500/30"><Trophy size={24} /></div>
                <div>
                  <h3 className="text-[10px] font-bold uppercase text-slate-400 tracking-wider">Theoretical Best</h3>
                  <p className="text-2xl font-bold text-white font-mono tracking-tight">{idealLap.total.toFixed(3)}s</p>
                  <p className="text-[10px] text-purple-400">Potencial: -{(data.metadata.target_time - idealLap.total).toFixed(3)}s</p>
                </div>
              </div>
            </div>
          )}

          {/* --- GRÁFICOS OTIMIZADOS --- */}

          <div className="bg-[#1e293b]/50 p-4 rounded-xl border border-slate-700/50 relative">
            <h3 className="text-xs text-slate-400 uppercase mb-2">Delta (Time)</h3>
            <TelemetryChart
              ref={deltaChartRef}
              height={160}
              series={[{ type: 'Area', data: data.charts.delta, color: '#ef4444', priceScaleId: 'right' }]}
              onCrosshairMove={handleCrosshairMove}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="md:col-span-2 bg-[#1e293b]/50 p-4 rounded-xl border border-slate-700/50">
              <h3 className="text-xs text-slate-400 uppercase mb-2 flex justify-between">
                <span>Inputs (Throttle/Brake)</span>
              </h3>
              <TelemetryChart
                ref={inputsChartRef}
                height={120}
                series={[
                  { type: 'Line', data: data.charts.throttle, color: '#22c55e', width: 2 },
                  { type: 'Line', data: data.charts.brake, color: '#ef4444', width: 2 }
                ]}
                onCrosshairMove={handleCrosshairMove}
              />
            </div>

            {/* Consumo Card */}
            <div className="bg-[#1e293b]/50 p-4 rounded-xl border border-slate-700/50 flex flex-col justify-center items-center opacity-60 hover:opacity-100 transition-opacity">
              <div className="bg-slate-800 p-2 rounded-full mb-2"><Fuel size={16} className="text-orange-400" /></div>
              <p className="text-[10px] uppercase text-slate-500 font-bold">Consumo</p>
              <p className="text-lg font-mono font-bold text-white">2.4 <span className="text-xs text-slate-500">L/Volta</span></p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-[#1e293b]/50 p-4 rounded-xl border border-slate-700/50">
              <h3 className="text-xs text-slate-400 uppercase mb-2">Velocidade</h3>
              <TelemetryChart
                ref={speedChartRef}
                height={180}
                series={[
                  { type: 'Line', data: data.charts.speed, color: '#facc15', width: 2 },
                  { type: 'Line', data: data.charts.speedRef, color: '#06b6d4', width: 2 }
                ]}
                onCrosshairMove={handleCrosshairMove}
              />
            </div>

            {/* Volante Real-Time - Manteve o original mas agora sync com Canvas */}
            <div className="bg-[#1e293b]/50 p-4 rounded-xl border border-slate-700/50 h-48 flex flex-col relative overflow-hidden">
              <h3 className="text-xs text-slate-400 uppercase mb-2 flex items-center gap-2 z-10"><Combine size={14} className="text-purple-400" /> Volante Real-Time</h3>
              <div className="flex-1 flex items-center justify-center relative z-10">
                {activeIndex !== null && data.rawArrays && (
                  <SteeringWheel
                    angle={data.rawArrays.steer[activeIndex] ? (data.rawArrays.steer[activeIndex] * -1) : 0}
                    baseAngle={data.rawArrays.steerBase[activeIndex] ? (data.rawArrays.steerBase[activeIndex] * -1) : 0}
                  />
                )}
              </div>
            </div>
          </div>
        </div>

        {/* COLUNA DIREITA */}
        <div className="space-y-6">
          {/* CANVAS MAPA */}
          <div className="bg-[#1e293b]/50 h-64 rounded-xl border border-slate-700/50 p-2 relative">
            <div className="absolute top-2 left-2 flex gap-1 z-10">
              <button onClick={() => setIsZoomed(!isZoomed)} className={`p-1 rounded ${isZoomed ? "bg-cyan-600" : "bg-slate-800 text-slate-400"}`}><ZoomIn size={12} /></button>
              <button onClick={() => setHeatmapMode("speed")} className="p-1 rounded bg-slate-800 text-slate-400"><Gauge size={12} /></button>
              <button onClick={() => setHeatmapMode("brake")} className="p-1 rounded bg-slate-800 text-slate-400"><Footprints size={12} /></button>
            </div>
            {data?.chart_data && (
              <CanvasTrackMap
                map_x_target={data.chart_data.map_x_target}
                map_y_target={data.chart_data.map_y_target}
                map_x_base={data.chart_data.map_x_base}
                map_y_base={data.chart_data.map_y_base}
                highlightIndex={activeIndex}
                colorMode={heatmapMode}
                dataChannel={data.rawArrays[heatmapMode]}
                zoom={isZoomed}
              />
            )}
          </div>

          {/* CANVAS G-G DIAGRAM */}
          <div className="bg-[#1e293b]/50 h-56 rounded-xl border border-slate-700/50 p-2 relative">
            <div className="absolute top-2 right-2 flex items-center gap-1 text-[9px] text-slate-500 border border-slate-700 px-2 py-0.5 rounded opacity-50"><Droplets size={10} /> Pneus: Soft</div>
            <CanvasGG
              lat={data.rawArrays.lat}
              lon={data.rawArrays.lon}
              activeIndex={activeIndex}
            />
          </div>

          {/* TABELA DE CURVAS (Manteve igual) */}
          <div className="bg-[#1e293b]/50 rounded-xl border border-slate-700/50 p-4 max-h-[300px] overflow-y-auto custom-scrollbar">
            <h3 className="text-xs font-bold text-slate-400 uppercase mb-4 flex items-center gap-2"><Trophy size={14} className="text-yellow-400" /> Análise de Curvas</h3>
            {data.corners && data.corners.length > 0 ? (
              <div className="space-y-1">
                {data.corners.map((corner: any, idx: number) => (
                  <div key={idx} className="flex flex-col p-2 rounded bg-slate-800/40 hover:bg-slate-800 cursor-pointer border border-transparent hover:border-slate-600 group" onClick={() => setActiveIndex(Math.floor(corner.start * 1000 /* Aproximação se indice não disponivel */))}>
                    <div className="flex justify-between items-center mb-1">
                      <span className="text-xs font-bold text-slate-300 group-hover:text-cyan-400 transition-colors">{corner.name}</span>
                      <span className={`text-xs font-mono font-bold ${corner.status === 'loss' ? 'text-red-400' : 'text-green-400'}`}>{corner.gain_loss > 0 ? '+' : ''}{corner.gain_loss.toFixed(3)}s</span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (<p className="text-xs text-slate-500 text-center">Nenhuma curva detectada.</p>)}
          </div>
        </div>
      </div>
    </div>
  );
}