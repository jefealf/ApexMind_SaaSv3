"use client";

import { SignInButton, useUser } from "@clerk/nextjs";
import { ChevronRight, Zap, Trophy, BarChart3, Clock, CheckCircle } from "lucide-react";
import Link from "next/link";
import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function LandingPage() {
    const { isSignedIn } = useUser();
    const router = useRouter();

    // Auto-redirect if already logged in (Optional, but good UX)
    useEffect(() => {
        if (isSignedIn) {
            router.push("/dashboard");
        }
    }, [isSignedIn, router]);

    return (
        <div className="min-h-screen bg-[#0b0f19] text-white flex flex-col relative overflow-hidden">

            {/* Background Gradients */}
            <div className="absolute top-0 left-0 w-full h-[600px] bg-gradient-to-br from-indigo-900/20 to-transparent pointer-events-none"></div>
            <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-cyan-500/10 blur-[100px] rounded-full pointer-events-none"></div>

            {/* Navbar Placeholder (Only Logo) */}
            <nav className="w-full px-8 py-6 flex items-center justify-between relative z-20">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center shrink-0 shadow-lg shadow-cyan-500/20">
                        <Zap className="text-white fill-white" size={20} />
                    </div>
                    <span className="text-xl font-bold text-white tracking-tight">ApexMind</span>
                </div>

                <div className="flex items-center gap-4">
                    <Link href="/dashboard" className="text-sm font-medium text-slate-400 hover:text-white transition">Login</Link>
                    <SignInButton mode="modal">
                        <button className="bg-white text-black hover:bg-slate-200 px-5 py-2 rounded-full text-sm font-bold transition">
                            Get Started
                        </button>
                    </SignInButton>
                </div>
            </nav>

            {/* Hero Section */}
            <main className="flex-1 flex flex-col items-center justify-center text-center px-6 relative z-10 pt-20 pb-32">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-900/20 border border-cyan-500/20 text-cyan-400 text-xs font-bold uppercase tracking-wider mb-6">
                    <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse"></span>
                    Public Beta Live
                </div>

                <h1 className="text-5xl md:text-7xl font-extrabold text-transparent bg-clip-text bg-gradient-to-b from-white to-slate-400 tracking-tight leading-[1.1] mb-6 max-w-4xl">
                    Master Your Racing Telemetry <br /> Like a Pro.
                </h1>

                <p className="text-lg md:text-xl text-slate-400 max-w-2xl mb-10 leading-relaxed">
                    ApexMind connects directly to your iRacing data to provide professional-grade analysis, automated coaching insights, and performance tracking—all in your browser.
                </p>

                <div className="flex flex-col sm:flex-row items-center gap-4">
                    <SignInButton mode="modal">
                        <button className="group relative px-8 py-4 bg-cyan-600 hover:bg-cyan-500 text-white font-bold rounded-xl transition-all shadow-lg shadow-cyan-500/25 flex items-center gap-3">
                            Start Free Trial
                            <ChevronRight className="group-hover:translate-x-1 transition-transform" />
                        </button>
                    </SignInButton>
                    <a href="#features" className="px-8 py-4 bg-slate-800/50 hover:bg-slate-800 text-white font-medium rounded-xl transition border border-white/5">
                        View Features
                    </a>
                </div>

                {/* Features Grid Mockup */}
                <div className="mt-24 grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl mx-auto text-left">
                    <div className="p-6 rounded-2xl bg-[#151b28] border border-slate-800 hover:border-cyan-500/30 transition group">
                        <BarChart3 className="text-cyan-400 mb-4 group-hover:scale-110 transition-transform" size={32} />
                        <h3 className="text-lg font-bold text-white mb-2">Real-time Telemetry</h3>
                        <p className="text-sm text-slate-400">Instant visualization of throttle, brake, and steering inputs compared to optimal laps.</p>
                    </div>
                    <div className="p-6 rounded-2xl bg-[#151b28] border border-slate-800 hover:border-purple-500/30 transition group">
                        <Trophy className="text-purple-400 mb-4 group-hover:scale-110 transition-transform" size={32} />
                        <h3 className="text-lg font-bold text-white mb-2">Ranked Progression</h3>
                        <p className="text-sm text-slate-400">Track your iRating and Safety Rating gains session by session with automated reports.</p>
                    </div>
                    <div className="p-6 rounded-2xl bg-[#151b28] border border-slate-800 hover:border-green-500/30 transition group">
                        <CheckCircle className="text-green-400 mb-4 group-hover:scale-110 transition-transform" size={32} />
                        <h3 className="text-lg font-bold text-white mb-2">Setup Analysis</h3>
                        <p className="text-sm text-slate-400">Compare community setups and find the perfect configuration for every track.</p>
                    </div>
                </div>

            </main>

            {/* Simple Footer */}
            <footer className="w-full py-8 text-center text-slate-600 text-sm border-t border-white/5">
                <p>&copy; 2026 ApexMind Inc. All rights reserved.</p>
            </footer>
        </div>
    );
}
