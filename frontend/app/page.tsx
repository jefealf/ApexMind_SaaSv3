"use client";

import { useEffect, useState } from "react";
import axios from "axios";
import {
    Trophy, MapPin, Car, Activity, Zap, Lock, Settings, Users,
    ChevronRight, Trash2, Clock, Cloud, Thermometer, Wrench, Download,
    Flag, TrendingUp, TrendingDown, Shield, User
} from "lucide-react";
import Link from "next/link";

interface Lap {
    id: number;
    session_id: string;
    lap_number: number;
    lap_time: number;
    car_name: string;
    track_name: string;
    created_at: string;
}

// MOCK DE DADOS DE CARREIRA (Estrutura pronta para a API Web)
// Como solicitado, valores padrão são "---" para simular desconexão
const CAREER_DATA = {
    formula: {
        license: "A",
        sr: "4.99",
        irating: "2150",
        ir_gain: "+42",
        sr_gain: "+0.15",
        color: "bg-blue-600" // Cor da Licença A
    },
    sports_car: {
        license: "B",
        sr: "3.45",
        irating: "1890",
        ir_gain: "-12",
        sr_gain: "+0.02",
        color: "bg-yellow-500" // Cor da Licença B
    },
    oval: { license: "-", sr: "---", irating: "---", ir_gain: null, sr_gain: null, color: "bg-slate-600" },
    dirt_oval: { license: "-", sr: "---", irating: "---", ir_gain: null, sr_gain: null, color: "bg-slate-600" },
    dirt_road: { license: "-", sr: "---", irating: "---", ir_gain: null, sr_gain: null, color: "bg-slate-600" }
};

type CategoryKey = keyof typeof CAREER_DATA;

export default function Home() {
    const [laps, setLaps] = useState<Lap[]>([]);
    const [loading, setLoading] = useState(true);
    const [stats, setStats] = useState({ totalLaps: 0, bestTrack: "-", bestCar: "-" });

    // ESTADO DO SELETOR DE CATEGORIA
    const [selectedCategory, setSelectedCategory] = useState<CategoryKey>("sports_car");

    // Dados da categoria atual
    const currentCareer = CAREER_DATA[selectedCategory];

    const fetchLaps = () => {
        setLoading(true);
        const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000";
        axios.get(`${apiUrl}/laps?limit=100`)
            .then((response) => {
                const data = response.data;
                setLaps(data);
                calculateStats(data);
                setLoading(false);
            })
            .catch((error) => {
                console.error("Erro ao buscar voltas:", error);
                setLoading(false);
            });
    };

    const calculateStats = (data: Lap[]) => {
        if (data.length === 0) return;
        const tracks = data.map(l => l.track_name);
        const bestTrack = tracks.sort((a, b) => tracks.filter(v => v === a).length - tracks.filter(v => v === b).length).pop();
        setStats({
            totalLaps: data.length,
            bestTrack: bestTrack || "-",
            bestCar: data[0]?.car_name || "-"
        });
    };

    const handleDelete = async (e: React.MouseEvent, id: number) => {
        e.preventDefault();
        if (!confirm("Tem certeza que deseja apagar esta volta?")) return;
        try {
            const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000";
            await axios.delete(`${apiUrl}/laps/${id}`);
            setLaps(prev => prev.filter(l => l.id !== id));
        } catch (error) { alert("Erro ao deletar."); }
    };

    useEffect(() => { fetchLaps(); }, []);

    const formatTime = (seconds: number) => {
        const min = Math.floor(seconds / 60);
        const sec = (seconds % 60).toFixed(3);
        return `${min}:${sec.padStart(6, "0")}`;
    };

    return (
        <div className="min-h-screen bg-[#0b0f19] text-white font-sans selection:bg-cyan-500/30">

            {/* BACKGROUND EFFECTS */}
            <div className="fixed top-0 left-0 w-full h-[500px] bg-gradient-to-b from-cyan-900/10 to-transparent pointer-events-none"></div>

            <main className="max-w-7xl mx-auto px-6 py-8 relative z-10">

                {/* HERO SECTION: DRIVER PROFILE & LICENSE CARD */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-12">

                    {/* ESQUERDA: IDENTIDADE DO PILOTO */}
                    <div className="lg:col-span-2 flex flex-col justify-center">
                        <div className="flex items-center gap-5 mb-6">
                            <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-slate-800 to-slate-900 border border-slate-700 flex items-center justify-center shadow-2xl shadow-black/50">
                                <User size={32} className="text-slate-400" />
                            </div>
                            <div>
                                <h1 className="text-4xl font-bold text-white tracking-tight">Bem-vindo, Jefe.</h1>
                                <div className="flex items-center gap-3 text-sm text-slate-400 mt-1">
                                    <span className="flex items-center gap-1.5 px-2 py-0.5 rounded bg-green-500/10 text-green-400 border border-green-500/20 font-mono text-xs font-bold">
                                        <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse"></div> ONLINE
                                    </span>
                                    <span>•</span>
                                    <span className="text-slate-500">Membro desde 2025</span>
                                </div>
                            </div>
                        </div>

                        {/* SELETOR DE CATEGORIA (TABS) */}
                        <div className="flex gap-2 bg-[#151b28] p-1 rounded-xl border border-slate-800 w-fit">
                            {[
                                { id: "sports_car", label: "Sports Car", icon: Car },
                                { id: "formula", label: "Formula", icon: Trophy },
                                { id: "oval", label: "Oval", icon: Activity }, // Placeholder icon
                                { id: "dirt_oval", label: "Dirt", icon: Flag }
                            ].map((cat) => (
                                <button
                                    key={cat.id}
                                    onClick={() => setSelectedCategory(cat.id as CategoryKey)}
                                    className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${selectedCategory === cat.id
                                            ? "bg-cyan-600 text-white shadow-lg shadow-cyan-500/20"
                                            : "text-slate-400 hover:text-white hover:bg-slate-800"
                                        }`}
                                >
                                    <cat.icon size={14} />
                                    {cat.label}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* DIREITA: CARTÃO DE LICENÇA (DADOS DINÂMICOS) */}
                    <div className="relative">
                        {/* Efeito de Glow baseado na cor da licença */}
                        <div className={`absolute inset-0 ${currentCareer.color} blur-[60px] opacity-20 pointer-events-none rounded-full`}></div>

                        <div className="bg-[#151b28]/80 backdrop-blur-xl border border-slate-700 p-6 rounded-2xl shadow-2xl relative overflow-hidden">
                            <div className="flex justify-between items-start mb-6">
                                <div>
                                    <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-1">iRATING</p>
                                    <div className="flex items-baseline gap-2">
                                        <span className="text-4xl font-mono font-bold text-white">{currentCareer.irating}</span>
                                        {currentCareer.ir_gain && (
                                            <span className={`text-sm font-bold flex items-center ${currentCareer.ir_gain.includes('+') ? 'text-green-400' : 'text-red-400'}`}>
                                                {currentCareer.ir_gain.includes('+') ? <TrendingUp size={14} className="mr-1" /> : <TrendingDown size={14} className="mr-1" />}
                                                {currentCareer.ir_gain}
                                            </span>
                                        )}
                                    </div>
                                </div>

                                {/* BADGE DA LICENÇA */}
                                <div className={`${currentCareer.color} w-12 h-12 rounded-lg flex items-center justify-center text-xl font-black text-white shadow-lg border border-white/10`}>
                                    {currentCareer.license}
                                </div>
                            </div>

                            <div className="space-y-4">
                                {/* Safety Rating Bar */}
                                <div>
                                    <div className="flex justify-between text-xs mb-1">
                                        <span className="text-slate-400 font-bold uppercase">Safety Rating</span>
                                        <span className="text-white font-mono font-bold">{currentCareer.sr}</span>
                                    </div>
                                    <div className="h-2 w-full bg-slate-800 rounded-full overflow-hidden">
                                        <div
                                            className={`h-full ${currentCareer.color} transition-all duration-1000`}
                                            style={{ width: currentCareer.sr === "---" ? "0%" : `${(parseFloat(currentCareer.sr) / 5) * 100}%` }}
                                        ></div>
                                    </div>
                                </div>
                            </div>

                            {/* Footer do Card */}
                            <div className="mt-6 pt-4 border-t border-slate-700/50 flex justify-between items-center">
                                <span className="text-[10px] text-slate-500 uppercase font-bold">Ultima Corrida</span>
                                <span className="text-xs text-slate-300 flex items-center gap-1">
                                    {currentCareer.irating === "---" ? "Sem dados recentes" : "2 horas atrás"}
                                </span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* METRICS GRID (KPIs GERAIS) */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-10">
                    <div className="bg-[#151b28] border border-slate-800 p-5 rounded-2xl relative overflow-hidden group hover:border-cyan-500/30 transition-colors">
                        <div className="absolute right-0 top-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity"><Activity size={60} /></div>
                        <p className="text-slate-400 text-xs font-bold uppercase tracking-wider mb-1">Voltas Analisadas</p>
                        <p className="text-3xl font-bold text-white font-mono">{stats.totalLaps}</p>
                        <div className="mt-4 h-1 w-full bg-slate-800 rounded-full overflow-hidden"><div className="h-full bg-cyan-500 w-[40%]"></div></div>
                    </div>

                    <div className="bg-[#151b28] border border-slate-800 p-5 rounded-2xl relative overflow-hidden group hover:border-purple-500/30 transition-colors">
                        <div className="absolute right-0 top-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity"><MapPin size={60} /></div>
                        <p className="text-slate-400 text-xs font-bold uppercase tracking-wider mb-1">Pista Favorita</p>
                        <p className="text-xl font-bold text-white truncate">{stats.bestTrack}</p>
                        <p className="text-xs text-slate-500 mt-1">Alta consistência detectada</p>
                    </div>

                    {/* Placeholders Visuais */}
                    <div className="bg-[#151b28] border border-slate-800 p-5 rounded-2xl relative overflow-hidden opacity-60">
                        <div className="absolute top-3 right-3"><Lock size={12} className="text-slate-600" /></div>
                        <p className="text-slate-500 text-xs font-bold uppercase tracking-wider mb-1">Equipe</p>
                        <p className="text-xl font-bold text-slate-400">Apex Racing</p>
                        <p className="text-xs text-slate-600 mt-1">Feature "Team Share" em breve</p>
                    </div>

                    <div className="bg-[#151b28] border border-slate-800 p-5 rounded-2xl relative overflow-hidden opacity-60">
                        <div className="absolute top-3 right-3"><Lock size={12} className="text-slate-600" /></div>
                        <p className="text-slate-500 text-xs font-bold uppercase tracking-wider mb-1">Setup Shop</p>
                        <p className="text-xl font-bold text-slate-400">Locked</p>
                        <p className="text-xs text-slate-600 mt-1">Acesso a setups Pro</p>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">

                    {/* LISTA DE SESSÕES */}
                    <div className="lg:col-span-3">
                        <div className="flex items-center justify-between mb-6">
                            <h2 className="text-lg font-bold flex items-center gap-2">
                                <Clock className="text-cyan-400" size={20} /> Sessões Recentes
                            </h2>
                            <button onClick={fetchLaps} className="text-xs text-slate-400 hover:text-white transition-colors flex items-center gap-1">
                                <Zap size={12} /> Atualizar
                            </button>
                        </div>

                        {loading ? (
                            <div className="space-y-3">{[1, 2, 3].map(i => <div key={i} className="h-24 bg-[#151b28] rounded-xl animate-pulse border border-slate-800"></div>)}</div>
                        ) : (
                            <div className="space-y-3">
                                {laps.length === 0 ? (
                                    <div className="text-center py-20 border border-dashed border-slate-800 rounded-2xl">
                                        <p className="text-slate-500">Nenhuma volta gravada. Abra o iRacing!</p>
                                    </div>
                                ) : laps.map((lap) => (
                                    <Link key={lap.id} href={`/analysis/${lap.id}`}>
                                        <div className="group bg-[#151b28] border border-slate-800 hover:border-cyan-500/50 p-0 rounded-xl transition-all cursor-pointer relative overflow-hidden flex">
                                            <div className={`w-1 ${lap.lap_time < 45 ? "bg-red-500" : "bg-cyan-500"}`}></div>
                                            <div className="p-5 flex-1 flex items-center justify-between">
                                                <div className="flex items-center gap-5">
                                                    <div className="w-12 h-12 bg-slate-800 rounded-lg flex items-center justify-center text-slate-500 group-hover:text-white group-hover:bg-slate-700 transition-colors">
                                                        <MapPin size={20} />
                                                    </div>
                                                    <div>
                                                        <div className="flex items-center gap-2 mb-1">
                                                            <span className="text-xl font-bold font-mono text-white group-hover:text-cyan-400 transition-colors">
                                                                {formatTime(lap.lap_time)}
                                                            </span>
                                                            {lap.lap_time < 45 && <span className="text-[9px] bg-red-900/30 text-red-400 px-1.5 py-0.5 rounded border border-red-500/20 font-bold">INVALID</span>}
                                                        </div>
                                                        <div className="flex items-center gap-3 text-xs text-slate-500">
                                                            <span className="flex items-center gap-1"><Car size={12} /> {lap.car_name}</span>
                                                            <span className="w-1 h-1 bg-slate-700 rounded-full"></span>
                                                            <span className="flex items-center gap-1">{lap.track_name}</span>
                                                        </div>
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-6">
                                                    <div className="hidden md:flex flex-col gap-1 opacity-30 group-hover:opacity-100 transition-opacity">
                                                        <div className="flex items-end gap-0.5 h-6">
                                                            {[40, 60, 45, 80, 55, 70, 40].map((h, i) => (
                                                                <div key={i} className="w-1 bg-slate-500 rounded-t-sm" style={{ height: `${h}%` }}></div>
                                                            ))}
                                                        </div>
                                                        <span className="text-[9px] text-slate-500 text-right uppercase">Telemetry</span>
                                                    </div>
                                                    <div className="flex items-center gap-3 pl-6 border-l border-slate-800">
                                                        <button onClick={(e) => handleDelete(e, lap.id)} className="p-2 text-slate-600 hover:text-red-400 hover:bg-red-900/10 rounded-lg transition-colors z-20">
                                                            <Trash2 size={16} />
                                                        </button>
                                                        <div className="bg-slate-800 p-2 rounded-lg text-slate-400 group-hover:bg-cyan-500 group-hover:text-white transition-all"><ChevronRight size={18} /></div>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </Link>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* SIDEBAR: UPSELL & STATUS */}
                    <div className="space-y-6">
                        <div className="bg-gradient-to-br from-purple-900/40 to-slate-900 p-6 rounded-2xl border border-purple-500/20 text-center relative overflow-hidden">
                            <div className="absolute top-0 right-0 p-3 opacity-20"><Zap size={80} /></div>
                            <h3 className="text-lg font-bold text-white mb-2 relative z-10">ApexMind <span className="text-purple-400">Pro</span></h3>
                            <p className="text-xs text-slate-400 mb-4 relative z-10">Conecte sua conta iRacing para sincronizar iRating e stats em tempo real.</p>
                            <button className="w-full py-2 bg-purple-600 hover:bg-purple-500 text-white text-sm font-bold rounded-lg transition-colors relative z-10 flex items-center justify-center gap-2">
                                <Lock size={12} /> Conectar Conta
                            </button>
                        </div>

                        <div className="p-4 rounded-2xl bg-[#151b28] border border-slate-800">
                            <h3 className="text-xs font-bold uppercase text-slate-500 mb-3">Status do Sistema</h3>
                            <div className="space-y-2">
                                <div className="flex justify-between text-xs text-slate-400">
                                    <span>Collector App</span>
                                    <span className="text-green-400 font-bold">Online</span>
                                </div>
                                <div className="flex justify-between text-xs text-slate-400">
                                    <span>Database</span>
                                    <span className="text-green-400 font-bold">Connected</span>
                                </div>
                                <div className="flex justify-between text-xs text-slate-400">
                                    <span>Cloud API</span>
                                    <span className="text-yellow-500 font-bold">Connecting...</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </main>
        </div>
    );
}