"use client";

import { useUser, useClerk } from "@clerk/nextjs";
import { useEffect, useState, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { CheckCircle, Loader2, XCircle, Laptop } from "lucide-react";
import axios from "axios";

function LinkDeviceContent() {
    const { user, isLoaded, isSignedIn } = useUser();
    const { redirectToSignIn } = useClerk();
    const searchParams = useSearchParams();
    const router = useRouter();

    const [status, setStatus] = useState<"loading" | "success" | "error">("loading");
    const [message, setMessage] = useState("Verificando dispositivo...");

    useEffect(() => {
        if (!isLoaded) return;

        if (!isSignedIn) {
            // Se não estiver logado, redireciona para login e volta aqui depois
            redirectToSignIn({ redirectUrl: window.location.href });
            return;
        }

        const deviceId = searchParams.get("deviceId") || searchParams.get("device_id");
        if (!deviceId) {
            setStatus("error");
            setMessage("ID do dispositivo não encontrado na URL.");
            return;
        }

        const linkDevice = async () => {
            try {
                setMessage("Vinculando dispositivo à sua conta...");
                const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000";

                await axios.post(`${apiUrl}/devices/link`, {
                    user_id: user.id,
                    device_id: deviceId,
                    display_name: user.fullName || user.firstName || "Racer"
                });

                setStatus("success");
                setMessage("Dispositivo conectado com sucesso!");

                // Redireciona para o dashboard após 3 segundos
                setTimeout(() => router.push("/dashboard"), 3000);
            } catch (error) {
                console.error(error);
                setStatus("error");
                setMessage("Falha ao vincular dispositivo. Tente novamente.");
            }
        };

        linkDevice();
    }, [isLoaded, isSignedIn, searchParams, user, router, redirectToSignIn]);

    return (
        <div className="min-h-screen bg-[#0b0f19] flex items-center justify-center p-4">
            <div className="bg-[#151b28] border border-slate-800 rounded-2xl p-8 max-w-md w-full text-center shadow-2xl relative overflow-hidden">

                {/* Background Glow */}
                <div className={`absolute top-0 left-0 w-full h-1 bg-gradient-to-r 
                    ${status === 'loading' ? 'from-cyan-500 to-blue-600 animate-pulse' : ''}
                    ${status === 'success' ? 'from-green-500 to-emerald-600' : ''}
                    ${status === 'error' ? 'from-red-500 to-orange-600' : ''}
                `}></div>

                <div className="flex justify-center mb-6">
                    <div className={`w-20 h-20 rounded-full flex items-center justify-center border-4 
                        ${status === 'loading' ? 'border-slate-700 bg-slate-800' : ''}
                        ${status === 'success' ? 'border-green-500/20 bg-green-500/10 text-green-500' : ''}
                        ${status === 'error' ? 'border-red-500/20 bg-red-500/10 text-red-500' : ''}
                    `}>
                        {status === 'loading' && <Loader2 size={32} className="text-cyan-400 animate-spin" />}
                        {status === 'success' && <CheckCircle size={32} />}
                        {status === 'error' && <XCircle size={32} />}
                    </div>
                </div>

                <h1 className="text-2xl font-bold text-white mb-2">Conectar Dispositivo</h1>
                <p className="text-slate-400 mb-8">{message}</p>

                {status === 'success' && (
                    <div className="bg-green-500/10 border border-green-500/20 rounded-lg p-4 flex items-center justify-center gap-3 animate-in fade-in slide-in-from-bottom-4">
                        <Laptop size={20} className="text-green-400" />
                        <span className="text-sm font-medium text-green-300">Este PC agora está autorizado.</span>
                    </div>
                )}

                {status === 'error' && (
                    <button onClick={() => window.location.reload()} className="px-6 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg text-sm font-medium transition">
                        Tentar Novamente
                    </button>
                )}
            </div>
        </div>
    );
}

export default function LinkDevicePage() {
    return (
        // Suspense boundary required for useSearchParams in Next.js App Router
        <Suspense fallback={<div className="min-h-screen bg-[#0b0f19] flex items-center justify-center"><Loader2 className="text-cyan-400 animate-spin" /></div>}>
            <LinkDeviceContent />
        </Suspense>
    );
}
