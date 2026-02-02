"use client";

import { useUser, SignOutButton } from "@clerk/nextjs";
import { useEffect, useState } from "react";
import axios from "axios";
import { User, Shield, Key, Save, Copy, Loader2 } from "lucide-react";

export default function ProfilePage() {
    const { user, isLoaded } = useUser();
    const [iracingId, setIracingId] = useState("");
    const [apiToken, setApiToken] = useState("");
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [msg, setMsg] = useState("");

    useEffect(() => {
        if (!user) return;
        async function fetchProfile() {
            try {
                // Fetch or create profile on backend
                const res = await axios.get(`http://127.0.0.1:8000/driver/${user.id}`);
                setIracingId(res.data.iracing_id || "");
                setApiToken(res.data.api_token || "");
            } catch (err) {
                console.error(err);
            } finally {
                setLoading(false);
            }
        }
        fetchProfile();
    }, [user]);

    async function handleSave() {
        if (!user) return;
        setSaving(true);
        try {
            const res = await axios.post("http://127.0.0.1:8000/driver/link", {
                user_id: user.id,
                iracing_id: iracingId
            });
            setApiToken(res.data.api_token);
            setMsg("Profile updated successfully!");
            setTimeout(() => setMsg(""), 3000);
        } catch (err) {
            setMsg("Error saving profile.");
        } finally {
            setSaving(false);
        }
    }

    if (!isLoaded || loading) return <div className="min-h-screen bg-[#0b0f19] flex items-center justify-center text-cyan-500"><Loader2 className="animate-spin" /></div>;
    if (!user) return <div className="text-white p-10">Please sign in.</div>;

    return (
        <div className="min-h-screen bg-[#0b0f19] text-white p-8 max-w-4xl mx-auto">
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
                            <label className="text-xs uppercase text-slate-500 font-bold block mb-1">iRacing Customer ID</label>
                            <div className="flex gap-2">
                                <input
                                    type="text"
                                    value={iracingId}
                                    onChange={(e) => setIracingId(e.target.value)}
                                    placeholder="Example: 123456"
                                    className="flex-1 bg-slate-900 border border-slate-600 rounded px-3 py-2 text-white focus:outline-none focus:border-cyan-500 transition-colors"
                                />
                                <button
                                    onClick={handleSave}
                                    disabled={saving}
                                    className="bg-cyan-600 hover:bg-cyan-500 text-white px-4 py-2 rounded flex items-center gap-2 font-bold transition-all disabled:opacity-50"
                                >
                                    {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                                    {saving ? "Saving" : "Save"}
                                </button>
                            </div>
                            <p className="text-[10px] text-slate-500 mt-2">Required to fetch your iRating, Safety Rating, and Licenses.</p>
                        </div>

                        {msg && <div className={`text-xs font-bold ${msg.includes("Error") ? "text-red-400" : "text-green-400"}`}>{msg}</div>}
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
                            <span className="text-yellow-400">{apiToken || "Generating..."}</span>
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
                            <div className="bg-slate-800 p-2 rounded">
                                <div className="text-[10px] uppercase text-slate-500">iRating</div>
                                <div className="font-mono font-bold text-white">-</div>
                            </div>
                            <div className="bg-slate-800 p-2 rounded">
                                <div className="text-[10px] uppercase text-slate-500">License</div>
                                <div className="font-mono font-bold text-white">-</div>
                            </div>
                            <div className="bg-slate-800 p-2 rounded">
                                <div className="text-[10px] uppercase text-slate-500">Safety</div>
                                <div className="font-mono font-bold text-white">-</div>
                            </div>
                        </div>
                        <p className="text-[10px] text-slate-600 mt-2 text-center">Stats will update after linking account.</p>
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
