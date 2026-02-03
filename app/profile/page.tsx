"use client";

import { useUser, SignOutButton } from "@clerk/nextjs";
import { useEffect, useState } from "react";
import axios from "axios";
import { User, Shield, Key, Copy, Loader2, CheckCircle, Trophy, LogOut, RefreshCw, AlertTriangle } from "lucide-react";
import IracingConnectModal from "@/components/IracingConnectModal";
import Image from "next/image";

export default function ProfilePage() {
    const { user, isLoaded } = useUser();
    const [stats, setStats] = useState({ irating: 0, sr: 0.0, license: "-" });
    const [iracingId, setIracingId] = useState("");
    const [apiToken, setApiToken] = useState("");
    const [isBackendConnected, setIsBackendConnected] = useState<boolean | null>(null); // null = checking
    const [showModal, setShowModal] = useState(false);
    const [msg, setMsg] = useState("");

    // Non-blocking data fetch
    useEffect(() => {
        if (!user) return;

        async function init() {
            if (!user) return;
            try {
                // Try to get driver data
                const res = await axios.get(`/api/py/driver/${user.id}`, { timeout: 5000 });
                if (res.data) {
                    setIracingId(res.data.iracing_id || "");
                    setApiToken(res.data.api_token || "");
                    if (res.data.stats) setStats(res.data.stats);
                    setIsBackendConnected(true);
                }
            } catch (err) {
                console.error("Backend fetch error (non-fatal):", err);
                setIsBackendConnected(false);
            }
        }
        init();
    }, [user]);

    const handleSyncSuccess = (data: any) => {
        setStats(data.stats);
        setIracingId(data.cust_id);
        setShowModal(false);
        setIsBackendConnected(true);
        setMsg("Account linked and synced successfully!");
        setTimeout(() => setMsg(""), 4000);
    };

    if (!isLoaded) return <div className="min-h-screen bg-[#0b0f19] flex items-center justify-center"><Loader2 className="animate-spin text-cyan-500" /></div>;
    if (!user) return <div className="text-white p-10">Please sign in to view your profile.</div>;

    return (
        <div className="min-h-screen bg-[#0b0f19] text-white p-8">
            <div className="max-w-4xl mx-auto space-y-8">

                {/* Header */}
                <div className="flex items-center justify-between border-b border-white/10 pb-6">
                    <div>
                        <h1 className="text-3xl font-bold bg-gradient-to-r from-cyan-400 to-blue-500 bg-clip-text text-transparent">
                            My Profile
                        </h1>
                        <p className="text-slate-400 mt-1">Manage your account and integrations</p>
                    </div>
                    {/* Backend Status Indicator */}
                    <div className="flex items-center gap-2 text-xs font-mono bg-white/5 px-3 py-1 rounded-full border border-white/10">
                        <div className={`w-2 h-2 rounded-full ${isBackendConnected === true ? 'bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.5)]' : isBackendConnected === false ? 'bg-red-500' : 'bg-yellow-500 animate-pulse'}`} />
                        <span className="text-slate-300">
                            {isBackendConnected === true ? "System Online" : isBackendConnected === false ? "Backend Offline" : "Connecting..."}
                        </span>
                    </div>
                </div>

                {/* 1. Account Info (Clerk) */}
                <div className="grid md:grid-cols-3 gap-8">
                    <div className="md:col-span-1 bg-[#1e293b] rounded-xl p-6 border border-white/10 h-fit">
                        <div className="flex flex-col items-center text-center">
                            <div className="w-24 h-24 rounded-full overflow-hidden mb-4 border-2 border-cyan-500/30">
                                <Image
                                    src={user.imageUrl}
                                    alt={user.fullName || "User"}
                                    width={96}
                                    height={96}
                                    className="w-full h-full object-cover"
                                />
                            </div>
                            <h2 className="text-xl font-bold">{user.fullName}</h2>
                            <p className="text-sm text-slate-400 break-all">{user.primaryEmailAddress?.emailAddress}</p>
                            <div className="mt-4 w-full">
                                <SignOutButton>
                                    <button className="w-full flex items-center justify-center gap-2 bg-red-500/10 hover:bg-red-500/20 text-red-400 py-2 rounded-lg transition text-sm font-medium border border-red-500/20">
                                        <LogOut size={16} /> Sign Out
                                    </button>
                                </SignOutButton>
                            </div>
                        </div>
                    </div>

                    {/* 2. iRacing Integration */}
                    <div className="md:col-span-2 space-y-6">
                        {/* Status Card */}
                        <div className="bg-[#1e293b] rounded-xl p-6 border border-white/10">
                            <div className="flex items-center justify-between mb-6">
                                <h3 className="text-lg font-semibold flex items-center gap-2">
                                    <Trophy className="text-yellow-500" size={20} />
                                    iRacing Career Stats
                                </h3>
                                {!iracingId && (
                                    <span className="text-xs bg-yellow-500/20 text-yellow-400 px-2 py-1 rounded border border-yellow-500/30">
                                        Not Linked
                                    </span>
                                )}
                            </div>

                            {iracingId ? (
                                <div className="grid grid-cols-3 gap-4">
                                    <div className="bg-[#0b0f19] p-4 rounded-lg border border-white/5 text-center">
                                        <p className="text-slate-400 text-xs uppercase tracking-wider mb-1">iRating</p>
                                        <p className="text-2xl font-bold text-white">{stats.irating}</p>
                                    </div>
                                    <div className="bg-[#0b0f19] p-4 rounded-lg border border-white/5 text-center">
                                        <p className="text-slate-400 text-xs uppercase tracking-wider mb-1">Safety Rating</p>
                                        <p className="text-2xl font-bold text-blue-400">{stats.sr}</p>
                                    </div>
                                    <div className="bg-[#0b0f19] p-4 rounded-lg border border-white/5 text-center">
                                        <p className="text-slate-400 text-xs uppercase tracking-wider mb-1">License</p>
                                        <p className="text-2xl font-bold text-green-400">{stats.license}</p>
                                    </div>
                                    <div className="col-span-3 mt-2 flex justify-end">
                                        <button
                                            onClick={() => setShowModal(true)}
                                            className="text-xs text-cyan-400 hover:text-cyan-300 flex items-center gap-1"
                                        >
                                            <RefreshCw size={12} /> Sync Data
                                        </button>
                                    </div>
                                </div>
                            ) : (
                                <div className="text-center py-8 bg-[#0b0f19]/50 rounded-lg border border-dashed border-white/10">
                                    <p className="text-slate-400 mb-4 text-sm">Link your iRacing account to track your progress automatically.</p>
                                    <button
                                        onClick={() => setShowModal(true)}
                                        className="bg-cyan-600 hover:bg-cyan-500 text-white px-6 py-2 rounded-lg font-medium transition flex items-center gap-2 mx-auto"
                                    >
                                        Link iRacing Account
                                    </button>
                                </div>
                            )}
                        </div>

                        {/* Connection Debugger (Helpful for User) */}
                        {isBackendConnected === false && (
                            <div className="bg-red-500/10 border border-red-500/20 p-4 rounded-lg flex items-start gap-3">
                                <AlertTriangle className="text-red-400 shrink-0" size={20} />
                                <div>
                                    <h4 className="text-sm font-bold text-red-400">Connection Issue</h4>
                                    <p className="text-xs text-red-300/80 mt-1">
                                        Could not reach the ApexMind server. We are trying to reconnect...
                                        <br />Check if the Backend Service on Render is active.
                                    </p>
                                </div>
                            </div>
                        )}

                        {/* API Token Section (Hidden togglable or strict) */}
                        {apiToken && (
                            <div className="bg-[#1e293b] p-6 rounded-xl border border-white/10 opacity-60 hover:opacity-100 transition">
                                <h3 className="text-sm font-bold text-slate-400 mb-2 flex items-center gap-2">
                                    <Key size={14} /> Collector API Token
                                </h3>
                                <div className="bg-black/30 p-2 rounded text-xs font-mono break-all text-slate-500 select-all flex justify-between items-center group">
                                    <span>{apiToken}</span>
                                    <button
                                        onClick={() => { navigator.clipboard.writeText(apiToken); setMsg("Token copied!") }}
                                        className="p-1 bg-slate-700 rounded hover:bg-slate-600 text-slate-300 opacity-0 group-hover:opacity-100 transition-opacity"
                                    >
                                        <Copy size={12} />
                                    </button>
                                </div>
                            </div>
                        )}

                        {msg && <div className={`text-xs font-bold text-center mt-2 ${msg.includes("Error") ? "text-red-400" : "text-green-400"}`}>{msg}</div>}

                    </div>
                </div>
            </div>

            <IracingConnectModal
                onClose={() => setShowModal(false)}
                onSuccess={handleSyncSuccess}
                userId={user.id}
            />
        </div>
    );
}
