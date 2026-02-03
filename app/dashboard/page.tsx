"use client";

import { useUser } from "@clerk/nextjs";
import { useEffect, useState } from "react";
import axios from "axios";
import {
    Trophy, MapPin, Car, Activity, Zap, Lock, Settings, Users,
    ChevronRight, Trash2, Clock, Cloud, Thermometer, Wrench, Download,
    Flag, TrendingUp, TrendingDown, Shield, User, CheckCircle
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";

interface Lap {
    id: number;
    session_id: string;
    lap_number: number;
    lap_time: number;
    car_name: string;
    track_name: string;
    created_at: string;
}

interface CareerStats {
    license: string;
    sr: string;
    irating: string;
    ir_gain: string | null;
    sr_gain: string | null;
    color: string;
}

// Valores padrão para quando não houver dados (DESCONECTADO)
const DEFAULT_CAREER: CareerStats = {
    license: "-", sr: "---", irating: "---", ir_gain: null, sr_gain: null, color: "bg-slate-800"
};

type CategoryKey = "sports_car" | "formula" | "oval" | "dirt_oval";

export default function Home() {
    const { user, isLoaded, isSignedIn } = useUser();
    const router = useRouter();

    // Estados de Dados
    const [laps, setLaps] = useState<Lap[]>([]);
    const [loading, setLoading] = useState(true);
    const [stats, setStats] = useState({ totalLaps: 0, bestTrack: "-", bestCar: "-" });

    // Status do Motorista (Inicia desconectado)
    const [isConnected, setIsConnected] = useState(false);
    const [careerData, setCareerData] = useState<Record<string, CareerStats>>({
        sports_car: { ...DEFAULT_CAREER },
        formula: { ...DEFAULT_CAREER },
        oval: { ...DEFAULT_CAREER },
        dirt_oval: { ...DEFAULT_CAREER }
    });

    // Estado da UI
    const [selectedCategory, setSelectedCategory] = useState<CategoryKey>("sports_car");
    const currentCareer = careerData[selectedCategory] || DEFAULT_CAREER;

    useEffect(() => {
        if (isLoaded && !isSignedIn) {
            router.push("/");
        }
    }, [isLoaded, isSignedIn, router]);

    // 1. Buscar Dados do Driver (Status de Conexão + Stats)
    const fetchDriverData = async () => {
        if (!user) return;
        try {
            const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000";
            const res = await axios.get(`${apiUrl}/driver/${user.id}`);

            // Só considera conectado se tiver Token E ID do iRacing vinculado
            if (res.data.api_token && res.data.iracing_id) {
                setIsConnected(true);
            }

            // Atualiza Stats se existirem
            if (res.data.stats) {
                const s = res.data.stats;
                // Atualiza APENAS a categoria sports_car por enquanto (exemplo)
                if (s.irating && s.irating !== 0) {
                    setCareerData(prev => ({
                        ...prev,
                        sports_car: {
                            license: s.license || "-",
                            sr: s.sr ? s.sr.toFixed(2) : "---",
                            irating: s.irating.toString(),
                            ir_gain: null,
                            sr_gain: null,
                            color: getLicenseColor(s.license)
                        }
                    }));
                }
            }
        } catch (error) {
            console.log("Perfil ainda não existe ou erro de conexão.");
        }
    };

    const getLicenseColor = (license: string) => {
        if (!license) return "bg-slate-800";
        if (license.includes("A")) return "bg-blue-600";
        if (license.includes("B")) return "bg-yellow-500";
        if (license.includes("C")) return "bg-green-600";
        if (license.includes("D")) return "bg-orange-500";
        return "bg-slate-800";
    }

    // 2. Buscar Voltas
    const fetchLaps = () => {
        // setLoading(true); // Opcional, para não piscar a tela toda
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

    // Carregar dados ao entrar
    useEffect(() => {
        if (user) {
            fetchDriverData();
            fetchLaps();
        }
    }, [user]); // eslint-disable-line react-hooks/exhaustive-deps

    const formatTime = (seconds: number) => {
        const min = Math.floor(seconds / 60);
        const sec = (seconds % 60).toFixed(3);
        return `${min}:${sec.padStart(6, '0')}`;
    };

    if (!isLoaded || !isSignedIn) {
        return <div className="min-h-screen bg-[#0b0f19] flex items-center justify-center text-white">Carregando...</div>;
    }

    return (
        <div className="flex min-h-screen bg-[#0b0f19] font-sans text-slate-200 selection:bg-cyan-500/30">
            {/* SIDEBAR - Fixa e Moderna */}
            <aside className="fixed left-0 top-0 h-screen w-20 hover:w-64 bg-[#0e121e]/80 backdrop-blur-xl border-r border-slate-800/50 flex flex-col items-center py-8 z-50 transition-all duration-300 group overflow-hidden">
                <div className="mb-12">
                    <div className="w-10 h-10 bg-gradient-to-br from-cyan-500 to-blue-600 rounded-xl flex items-center justify-center shadow-lg shadow-cyan-500/20">
                        <Zap size={24} className="text-white fill-white" />
                    </div>
                </div>

                <nav className="flex-1 w-full px-4 space-y-2">
                    <NavItem icon={<Activity size={20} />} label="Dashboard" active />
                    <NavItem icon={<Trophy size={20} />} label="Campeonatos" />
                    <NavItem icon={<MapPin size={20} />} label="Pistas" />
                    <NavItem icon={<Car size={20} />} label="Garagem" />
                    <div className="h-px bg-slate-800/50 my-4 mx-2" />
                    <NavItem icon={<Settings size={20} />} label="Configurações" />
                    <NavItem icon={<Users size={20} />} label="Comunidade" />
                </nav>

                <div className="mt-auto px-4 w-full opacity-0 group-hover:opacity-100 transition-opacity duration-300 delay-100">
                    {/* STATUS DO AGENTE (CONDICIONAL) */}
                    {!isConnected ? (
                        <div className="bg-gradient-to-br from-cyan-900/40 to-blue-900/40 border border-cyan-500/20 p-4 rounded-xl relative overflow-hidden group/card cursor-pointer hover:border-cyan-500/40 transition-all">
                            <div className="absolute inset-0 bg-cyan-500/5 opacity-0 group-hover/card:opacity-100 transition-opacity" />
                            <h4 className="font-bold text-white text-sm mb-1">Conectar iRacing</h4>
                            <p className="text-xs text-slate-400 mb-3 leading-relaxed">Baixe o agente para sincronizar telemetria.</p>
                            <a href="/download/ApexMindConnector.exe" download className="flex items-center justify-center gap-2 w-full bg-cyan-600 hover:bg-cyan-500 text-white py-2 rounded-lg text-xs font-bold transition-transform active:scale-95 shadow-lg shadow-cyan-900/20">
                                <Download size={14} /> Baixar Agente
                            </a>
                        </div>
                    ) : (
                        <div className="bg-green-500/10 border border-green-500/20 p-4 rounded-xl flex items-center gap-3">
                            <div className="p-2 bg-green-500/20 rounded-lg text-green-400">
                                <CheckCircle size={20} />
                            </div>
                            <div>
                                <p className="text-sm font-bold text-white leading-none mb-1">Agente Ativo</p>
                                <p className="text-xs text-green-400">Sincronização em tempo real</p>
                            </div>
                        </div>
                    )}

                    <div className="bg-[#151b28] border border-slate-800 rounded-xl p-4 mt-4">
                        <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">Status do Sistema</h4>
                        <div className="space-y-2">
                            <StatusItem label="Collector App" status={isConnected ? "online" : "offline"} />
                            <StatusItem label="Database" status="online" />
                            <StatusItem label="Cloud API" status="online" />
                        </div>
                    </div>
                </div>
            </aside>

            {/* MAIN CONTENT */}
            <main className="flex-1 pl-20 ml-0 transition-all duration-300 p-8 lg:p-12 overflow-y-auto">
                <header className="flex justify-between items-start mb-12">
                    <div>
                        <div className="flex items-center gap-4 mb-2">
                            <h1 className="text-4xl font-black text-white tracking-tight">
                                Bem-vindo, {user?.firstName || "Piloto"}.
                            </h1>
                            <span className="px-3 py-1 rounded-full bg-green-500/10 border border-green-500/20 text-green-400 text-xs font-bold flex items-center gap-1.5">
                                <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" /> ONLINE
                            </span>
                        </div>
                        <p className="text-slate-400 font-medium">Membro desde {user?.createdAt ? new Date(user.createdAt).getFullYear() : "2025"}</p>
                    </div>

                    <div className="flex items-center gap-6">
                        <div className="relative">
                            <input type="text" placeholder="Buscar piloto, pista ou setup..." className="pl-10 pr-4 py-2.5 bg-[#151b28] border border-slate-800 rounded-xl text-sm focus:outline-none focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/50 w-64 transition-all" />
                            <Users className="absolute left-3 top-2.5 text-slate-500" size={16} />
                        </div>
                        <button className="p-2.5 bg-[#151b28] border border-slate-800 rounded-xl text-slate-400 hover:text-white transition-colors relative">
                            <div className="absolute top-2 right-2 w-2 h-2 bg-red-500 rounded-full border-2 border-[#151b28]" />
                            <Cloud size={20} />
                        </button>
                        <div className="flex items-center gap-3 pl-6 border-l border-slate-800">
                            <div className="text-right hidden md:block">
                                <p className="text-sm font-bold text-white">{user?.fullName}</p>
                                <p className="text-xs text-cyan-400 font-medium tracking-wide">DRIVER</p>
                            </div>
                            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-slate-700 to-slate-600 border border-slate-500/30 overflow-hidden">
                                <img src={user?.imageUrl} alt="Profile" className="w-full h-full object-cover" />
                            </div>
                        </div>
                    </div>
                </header>

                {/* KPI GRID */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
                    {/* KPI 1: iRATING CARD (Mostra dados da categoria selecionada) */}
                    <div className="col-span-1 md:col-span-2 bg-[#151b28] border border-slate-800 rounded-2xl p-6 relative overflow-hidden group hover:border-slate-700 transition-all">
                        <div className="absolute top-0 right-0 p-6 opacity-10 group-hover:opacity-20 transition-opacity">
                            <Trophy size={120} />
                        </div>
                        <div className="relative z-10 flex justify-between items-start h-full flex-col">
                            <div className="w-full">
                                <div className="flex justify-between items-center mb-6">
                                    <div>
                                        <p className="text-slate-500 text-xs font-bold uppercase tracking-wider mb-1">iRATING</p>
                                        <div className="flex items-baseline gap-2">
                                            <h2 className="text-4xl font-black text-white">{currentCareer.irating}</h2>
                                            {currentCareer.ir_gain && (
                                                <span className={`text-sm font-bold ${currentCareer.ir_gain.startsWith('+') ? 'text-green-500' : 'text-red-500'}`}>
                                                    {currentCareer.ir_gain}
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                    <div className={`w-12 h-12 ${currentCareer.color} rounded-lg flex items-center justify-center text-white font-black text-xl shadow-lg`}>
                                        {currentCareer.license}
                                    </div>
                                </div>

                                <div className="space-y-4">
                                    <div>
                                        <div className="flex justify-between text-xs font-bold mb-2">
                                            <span className="text-slate-400">SAFETY RATING</span>
                                            <span className="text-white">{currentCareer.sr}</span>
                                        </div>
                                        <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
                                            <div
                                                className={`h-full ${currentCareer.sr !== "---" ? (parseFloat(currentCareer.sr) > 3 ? "bg-green-500" : "bg-yellow-500") : "bg-slate-700"}`}
                                                style={{ width: currentCareer.sr !== "---" ? `${(parseFloat(currentCareer.sr) / 4.99) * 100}%` : "0%" }}
                                            />
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="w-full mt-6 pt-6 border-t border-slate-800 flex items-center justify-between">
                                <div className="flex items-center gap-2 text-xs text-slate-500">
                                    <Clock size={14} /> ULTIMA CORRIDA
                                </div>
                                <span className="text-xs font-bold text-white">2 horas atrás</span>
                            </div>
                        </div>
                    </div>

                    {/* KPI 2: Voltas Analisadas */}
                    <div className="bg-[#151b28] border border-slate-800 rounded-2xl p-6 flex flex-col justify-between">
                        <div>
                            <p className="text-slate-500 text-xs font-bold uppercase tracking-wider mb-2">VOLTAS ANALISADAS</p>
                            <h3 className="text-3xl font-black text-white mb-2">{stats.totalLaps}</h3>
                            <div className="h-1 w-16 bg-cyan-500 rounded-full" />
                        </div>
                        <div className="flex justify-end opacity-20">
                            <Activity size={48} />
                        </div>
                    </div>

                    {/* KPI 3: Pista Favorita */}
                    <div className="bg-[#151b28] border border-slate-800 rounded-2xl p-6 flex flex-col justify-between">
                        <div>
                            <p className="text-slate-500 text-xs font-bold uppercase tracking-wider mb-2">PISTA FAVORITA</p>
                            <h3 className="text-xl font-bold text-white mb-1 line-clamp-2">{stats.bestTrack}</h3>
                            <p className="text-xs text-green-400 font-medium">Alta consistência detectada</p>
                        </div>
                        <div className="flex justify-end opacity-20">
                            <MapPin size={48} />
                        </div>
                    </div>

                    {/* Feature Card (Locked) from original design kept for layout balance or removed? Replaced by Setup Shop */}
                    <div className="bg-[#151b28]/50 border border-slate-800/50 rounded-2xl p-6 flex flex-col justify-between relative overflow-hidden">
                        <div className="absolute inset-0 bg-stripe-pattern opacity-5" />
                        <div className="absolute top-4 right-4 text-slate-700">
                            <Lock size={16} />
                        </div>
                        <div>
                            <p className="text-slate-500 text-xs font-bold uppercase tracking-wider mb-2">EQUIPE</p>
                            <h3 className="text-xl font-bold text-slate-300 mb-1">Apex Racing</h3>
                            <p className="text-xs text-slate-600">Feature "Team Share" em breve</p>
                        </div>
                    </div>

                    <div className="bg-[#151b28]/50 border border-slate-800/50 rounded-2xl p-6 flex flex-col justify-between relative overflow-hidden">
                        <div className="absolute top-4 right-4 text-slate-700">
                            <Lock size={16} />
                        </div>
                        <div>
                            <p className="text-slate-500 text-xs font-bold uppercase tracking-wider mb-2">SETUP SHOP</p>
                            <h3 className="text-xl font-bold text-slate-300 mb-1">Locked</h3>
                            <p className="text-xs text-slate-600">Acesso a setups Pro</p>
                        </div>
                    </div>
                </div>

                {/* Category Toggles */}
                <div className="flex gap-2 mb-8">
                    <CategoryButton label="Sports Car" active={selectedCategory === "sports_car"} onClick={() => setSelectedCategory("sports_car")} icon={<Car size={16} />} />
                    <CategoryButton label="Formula" active={selectedCategory === "formula"} onClick={() => setSelectedCategory("formula")} icon={<Zap size={16} />} />
                    <CategoryButton label="Oval" active={selectedCategory === "oval"} onClick={() => setSelectedCategory("oval")} icon={<Activity size={16} />} />
                    <CategoryButton label="Dirt" active={selectedCategory === "dirt_oval"} onClick={() => setSelectedCategory("dirt_oval")} icon={<Flag size={16} />} />
                </div>

                {/* SESSÕES RECENTES (TABELA) */}
                <div className="mt-8">
                    <div className="flex items-center justify-between mb-6">
                        <h3 className="text-xl font-bold text-white flex items-center gap-2">
                            <Clock size={20} className="text-cyan-500" /> Sessões Recentes
                        </h3>
                        <button onClick={fetchLaps} className="text-xs text-slate-500 hover:text-white transition flex items-center gap-1">
                            <Activity size={12} /> Atualizar
                        </button>
                    </div>

                    <div className="bg-[#151b28] border border-slate-800 rounded-2xl overflow-hidden">
                        {loading ? (
                            <div className="p-8 text-center text-slate-500">Carregando telemetria...</div>
                        ) : laps.length === 0 ? (
                            <div className="p-12 text-center">
                                <p className="text-slate-400 mb-2">Nenhuma volta gravada.</p>
                                <p className="text-sm text-slate-600">Abra o iRacing e dê algumas voltas com o agente rodando!</p>
                            </div>
                        ) : (
                            <table className="w-full text-left border-collapse">
                                <thead>
                                    <tr className="border-b border-slate-800 text-xs font-bold text-slate-500 uppercase tracking-wider">
                                        <th className="p-4 pl-6">Pista / Carro</th>
                                        <th className="p-4">Volta</th>
                                        <th className="p-4">Tempo</th>
                                        <th className="p-4">Data</th>
                                        <th className="p-4 text-right">Ações</th>
                                    </tr>
                                </thead>
                                <tbody className="text-sm text-slate-300 divide-y divide-slate-800/50">
                                    {laps.map((lap) => (
                                        <tr key={lap.id} className="hover:bg-slate-800/30 transition-colors group">
                                            <td className="p-4 pl-6">
                                                <div className="font-bold text-white">{lap.track_name}</div>
                                                <div className="text-xs text-slate-500">{lap.car_name}</div>
                                            </td>
                                            <td className="p-4 font-mono text-cyan-400 font-bold">{lap.lap_number}</td>
                                            <td className="p-4 font-mono">{formatTime(lap.lap_time)}</td>
                                            <td className="p-4 text-slate-500 text-xs">
                                                {new Date(lap.created_at).toLocaleDateString()}
                                            </td>
                                            <td className="p-4 text-right">
                                                <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                    <Link href={`/dashboard/analysis/${lap.id}`} className="p-2 hover:bg-cyan-500/20 text-cyan-400 rounded-lg transition-colors" title="Analisar">
                                                        <Activity size={16} />
                                                    </Link>
                                                    <button onClick={(e) => handleDelete(e, lap.id)} className="p-2 hover:bg-red-500/20 text-red-400 rounded-lg transition-colors" title="Excluir">
                                                        <Trash2 size={16} />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        )}
                    </div>
                </div>
            </main>
        </div>
    );
}

// Subcomponents for cleaner code
function NavItem({ icon, label, active = false }: { icon: React.ReactNode, label: string, active?: boolean }) {
    return (
        <button className={`w-full p-3 rounded-xl flex items-center justify-center xl:justify-start gap-4 transition-all duration-200 group/nav ${active ? 'bg-cyan-500/10 text-cyan-400' : 'text-slate-500 hover:bg-slate-800 hover:text-white'}`}>
            <div className={`${active ? 'scale-110' : 'group-hover/nav:scale-110 transition-transform'}`}>{icon}</div>
            <span className="hidden xl:block opacity-0 group-hover:opacity-100 transition-all font-medium text-sm whitespace-nowrap lg:hidden">{label}</span>
            {/* Tooltip for collapsed mode */}
            <div className="absolute left-20 bg-slate-900 text-white text-xs px-2 py-1 rounded opacity-0 group-hover/nav:opacity-100 pointer-events-none transition-opacity xl:hidden whitespace-nowrap z-50 border border-slate-700 shadow-xl">
                {label}
            </div>
        </button>
    );
}

function StatusItem({ label, status }: { label: string, status: "online" | "offline" | "connecting" }) {
    const color = status === "online" ? "text-green-400" : status === "connecting" ? "text-yellow-400" : "text-slate-600";
    const dot = status === "online" ? "bg-green-500" : status === "connecting" ? "bg-yellow-500" : "bg-slate-600";

    return (
        <div className="flex items-center justify-between text-xs">
            <span className="text-slate-400">{label}</span>
            <span className={`font-bold ${color} flex items-center gap-1.5`}>
                {status === "online" ? "Online" : status === "connecting" ? "Connecting..." : "Offline"}
            </span>
        </div>
    );
}

function CategoryButton({ label, active, onClick, icon }: { label: string, active: boolean, onClick: () => void, icon?: React.ReactNode }) {
    return (
        <button
            onClick={onClick}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-2 ${active ? 'bg-cyan-500 text-white shadow-lg shadow-cyan-500/25 scale-105' : 'bg-[#151b28] text-slate-500 hover:bg-slate-800 border border-slate-800 hover:border-slate-700'}`}
        >
            {icon} {label}
        </button>
    );
}