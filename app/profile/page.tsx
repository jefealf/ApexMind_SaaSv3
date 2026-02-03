"use client";

import { useUser, SignOutButton } from "@clerk/nextjs";
import { useEffect, useState } from "react";
import axios from "axios";
import { User, Shield, Key, Save, Copy, Loader2, CheckCircle } from "lucide-react";
import IracingConnectModal from "@/components/IracingConnectModal";

export default function ProfilePage() {
    const { user, isLoaded } = useUser();
    const [iracingId, setIracingId] = useState("");
    const [apiToken, setApiToken] = useState("");
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [msg, setMsg] = useState("");
    const [stats, setStats] = useState({ irating: 0, sr: 0.0, license: "-" });
    const [showModal, setShowModal] = useState(false);

    const [backendStatus, setBackendStatus] = useState<"ok" | "error" | "checking">("checking");

    useEffect(() => {
        if (!user) return;

        async function fetchProfile() {
            setLoading(true);
            try {
                // 1. Health Check (Fast fail)
                try {
                    await axios.get("/api/py/", { timeout: 3000 });
                    setBackendStatus("ok");
                } catch (e) {
                    console.warn("Backend Health Check Failed", e);
                    setBackendStatus("error");
                    throw new Error("Backend Unreachable");
                }

                // 2. Fetch Profile
                const res = await axios.get(`/api/py/driver/${user.id}`, { timeout: 5000 });
                setIracingId(res.data.iracing_id || "");
                setApiToken(res.data.api_token || "");
                if (res.data.stats) setStats(res.data.stats);
            } catch (err) {
                console.error("Profile Fetch Error:", err);
                setMsg("Error connecting to backend server.");
            } finally {
                setLoading(false);
            }
        }

        if (isLoaded && user) fetchProfile();
    }, [user, isLoaded]);

    // Used by Modal success
    const handleSyncSuccess = (data: any) => {
        setIracingId(data.iracing_id);
        setStats(data.stats);
        setShowModal(false);
        setMsg("Account linked and synced successfully!");
        setTimeout(() => setMsg(""), 4000);
    };

    if (!isLoaded || loading) return <div className="min-h-screen bg-[#0b0f19] flex items-center justify-center text-cyan-500"><Loader2 className="animate-spin" /></div>;

    // BACKEND ERROR STATE
    if (backendStatus === "error") return (
        <div className="min-h-screen bg-[#0b0f19] flex flex-col items-center justify-center text-white p-6 text-center">
            <h1 className="text-3xl font-bold text-red-500 mb-4">Backend Connection Failed</h1>
            <p className="max-w-md text-slate-400 mb-6">The application frontend is working, but it cannot reach the Python Backend server.</p>
            <div className="bg-[#1e293b] p-4 rounded text-left text-xs font-mono border border-red-900/50">
                <p className="text-yellow-400 mb-2">Troubleshooting Steps:</p>
                <ol className="list-decimal pl-4 space-y-2 text-slate-300">
                    <li>Check if the Render Web Service is <strong>Active</strong>.</li>
                    <li>Ensure Render "Root Directory" is set to <code>backend</code>.</li>
                    <li>Verify the Start Command is <code>uvicorn server:app --host 0.0.0.0 --port $PORT</code>.</li>
                </ol>
            </div>
            <button onClick={() => window.location.reload()} className="mt-8 bg-cyan-600 px-6 py-2 rounded font-bold hover:bg-cyan-500">Retry Connection</button>
        </div>
    );

    if (!user) return <div className="text-white p-10">Please sign in.</div>;

    return (
        <div className="min-h-screen bg-[#0b0f19] text-white p-8 max-w-4xl mx-auto">
            {showModal && <IracingConnectModal userId={user.id} onSuccess={handleSyncSuccess} onClose={() => setShowModal(false)} />}

            <h1 className="text-3xl font-bold mb-8 flex items-center gap-3">
                <User className="text-cyan-500" /> Driver Profile
            </h1>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {/* LEFT: INFO */}
                <div className="bg-[#1e293b] p-6 rounded-xl border border-slate-700 shadow-lg">
                    <div className="flex items-center gap-4 mb-6">
                        <img src={user.imageUrl} alt="Profile" className="w-16 h-16 rounded-full border-2 border-cyan-500" />
                        <div>
                            <h2 className="text-xl font-bold">{user.fullName}</h2>
                            <p className="text-slate-400 text-sm">{user.primaryEmailAddress?.emailAddress}</p>
                        </div>
                    </div>

                    <div className="space-y-4">
                        <div className="p-4 bg-slate-800/50 rounded-lg">
                            <label className="text-xs uppercase text-slate-500 font-bold block mb-1">iRacing Account</label>

                            {iracingId ? (
                                <div className="flex items-center justify-between text-green-400 bg-green-900/20 px-3 py-2 rounded border border-green-800/50">
                                    <span className="flex items-center gap-2 text-sm font-bold">
                                        <CheckCircle size={14} /> ID: {iracingId}
                                    </span>
                                    <button onClick={() => setShowModal(true)} className="text-[10px] uppercase text-slate-400 hover:text-white underline">Resync</button>
                                </div>
                            ) : (
                                <div className="text-center py-2">
                                    <button
                                        onClick={() => setShowModal(true)}
                                        className="w-full bg-cyan-600 hover:bg-cyan-500 text-white text-sm font-bold py-2 rounded flex items-center justify-center gap-2 transition-all"
                                    >
                                        <Shield size={16} /> Link iRacing Account
                                    </button>
                                    <p className="text-[10px] text-slate-500 mt-2">Sign in with iRacing credentials to generate your API Token.</p>
                                </div>
                            )}
                        </div>

                        {msg && <div className={`text-xs font-bold text-center ${msg.includes("Error") ? "text-red-400" : "text-green-400"}`}>{msg}</div>}
                    </div>
                </div>

                {/* RIGHT: API KEYS & STATS */}
                <div className="bg-[#1e293b] p-6 rounded-xl border border-slate-700 shadow-lg flex flex-col justify-between">
                    <div>
                        <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
                            <Key className="text-yellow-500" size={20} /> Collector Configuration
                        </h3>
                        <p className="text-sm text-slate-400 mb-4">
                            Use this token in your Python Collector (`collector.py`) to authenticate your uploads.
                        </p>

                        <div className="bg-black/40 p-3 rounded-lg border border-slate-700 font-mono text-xs break-all relative group">
                            <span className="text-yellow-400">{apiToken || "Link account to generate..."}</span>
                            <button
                                onClick={() => { navigator.clipboard.writeText(apiToken); setMsg("Token copied!") }}
                                className="absolute top-2 right-2 p-1 bg-slate-700 rounded hover:bg-slate-600 text-slate-300 opacity-0 group-hover:opacity-100 transition-opacity"
                            >
                                <Copy size={12} />
                            </button>
                        </div>
                    </div>

                    <div className="mt-8 pt-6 border-t border-slate-700">
                        <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
                            <Shield className="text-green-500" size={20} /> iRacing Stats
                        </h3>
                        <div className="grid grid-cols-3 gap-2 text-center">
                            <div className="bg-slate-800 p-2 rounded border border-slate-700">
                                <div className="text-[10px] uppercase text-slate-500 font-bold">iRating</div>
                                <div className="font-mono text-xl font-bold text-white">{stats.irating > 0 ? stats.irating : "-"}</div>
                            </div>
                            <div className="bg-slate-800 p-2 rounded border border-slate-700">
                                <div className="text-[10px] uppercase text-slate-500 font-bold">License</div>
                                <div className={`font-mono text-xl font-bold ${stats.license.startsWith("A") ? "text-green-500" : (stats.license.startsWith("B") ? "text-yellow-500" : "text-white")}`}>
                                    {stats.license}
                                </div>
                            </div>
                            <div className="bg-slate-800 p-2 rounded border border-slate-700">
                                <div className="text-[10px] uppercase text-slate-500 font-bold">Safety</div>
                                <div className="font-mono text-xl font-bold text-white">{stats.sr > 0 ? stats.sr.toFixed(2) : "-"}</div>
                            </div>
                        </div>
                        <p className="text-[10px] text-slate-600 mt-2 text-center">
                            {iracingId ? "Synced with iRacing Live Data" : "Link account to view stats"}
                        </p>
                    </div>

                    <div className="mt-6 text-right">
                        <SignOutButton>
                            <button className="text-xs text-red-400 hover:text-red-300 font-bold uppercase tracking-wider">Sign Out</button>
                        </SignOutButton>
                    </div>
                </div>
            </div>
        </div>
    );
}
