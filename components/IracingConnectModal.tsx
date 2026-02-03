"use client";
import { useState } from "react";
import axios from "axios";
import { Loader2, AlertCircle, CheckCircle, Shield } from "lucide-react";

interface IracingConnectModalProps {
    userId: string;
    onSuccess: (data: any) => void;
    onClose: () => void;
}

export default function IracingConnectModal({ userId, onSuccess, onClose }: IracingConnectModalProps) {
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");

    async function handleConnect() {
        if (!email || !password) {
            setError("Please fill in all fields.");
            return;
        }
        setLoading(true);
        setError("");

        try {
            const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000";
            const res = await axios.post(`${apiUrl}/driver/sync_iracing`, {
                user_id: userId,
                username: email,
                password: password
            });

            onSuccess(res.data);
            onClose();
        } catch (err: any) {
            console.error(err);
            setError(err.response?.data?.detail || "Failed to connect to iRacing. Check credentials.");
        } finally {
            setLoading(false);
        }
    }

    return (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
            <div className="bg-[#1e293b] border border-cyan-500/30 p-6 rounded-2xl w-full max-w-md shadow-2xl relative animate-in fade-in zoom-in duration-300">
                <button onClick={onClose} className="absolute top-4 right-4 text-slate-500 hover:text-white">✕</button>

                <div className="flex items-center gap-3 mb-6">
                    <Shield className="text-cyan-500 w-8 h-8" />
                    <h2 className="text-xl font-bold text-white">Connect iRacing</h2>
                </div>

                <p className="text-sm text-slate-400 mb-6">
                    Enter your iRacing credentials to verify ownership and sync your iRating, License, and Safety Rating automatically.
                    <br /><span className="text-xs text-slate-600 mt-1 block">We do not store your password. It is used once for initial verification.</span>
                </p>

                <div className="space-y-4">
                    <div>
                        <label className="text-xs uppercase text-slate-500 font-bold block mb-1">iRacing Email</label>
                        <input
                            type="email"
                            value={email}
                            onChange={e => setEmail(e.target.value)}
                            className="w-full bg-slate-900 border border-slate-700 rounded px-3 py-2 text-white outline-none focus:border-cyan-500 transition-colors"
                        />
                    </div>
                    <div>
                        <label className="text-xs uppercase text-slate-500 font-bold block mb-1">Password</label>
                        <input
                            type="password"
                            value={password}
                            onChange={e => setPassword(e.target.value)}
                            className="w-full bg-slate-900 border border-slate-700 rounded px-3 py-2 text-white outline-none focus:border-cyan-500 transition-colors"
                        />
                    </div>

                    {error && (
                        <div className="flex items-center gap-2 text-xs text-red-400 bg-red-900/20 p-2 rounded">
                            <AlertCircle size={14} /> {error}
                        </div>
                    )}

                    <button
                        onClick={handleConnect}
                        disabled={loading}
                        className="w-full bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-bold py-3 rounded-lg flex items-center justify-center gap-2 transition-all disabled:opacity-50 mt-2"
                    >
                        {loading ? <Loader2 className="animate-spin" /> : "Verify & Sync"}
                    </button>
                </div>
            </div>
        </div>
    );
}
