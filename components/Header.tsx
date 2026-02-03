"use client";

import { Search, Bell, User, Command, Loader2 } from "lucide-react";
import { UserButton, useUser, SignInButton } from "@clerk/nextjs";

export default function Header() {
  const { user, isLoaded } = useUser();

  return (
    <header className="h-20 w-full flex items-center justify-between px-8 fixed top-0 left-0 pl-24 z-40 bg-[#0b0f19]/80 backdrop-blur-md border-b border-white/5 transition-all duration-300">

      {/* Esquerda: Busca Global (Estilo Spotlight) */}
      <div className="flex items-center gap-3 bg-[#151b28] px-4 py-2.5 rounded-xl border border-slate-800 focus-within:border-cyan-500/50 focus-within:ring-2 focus-within:ring-cyan-500/10 transition-all w-96 group">
        <Search size={16} className="text-slate-500 group-focus-within:text-cyan-400 transition-colors" />
        <input
          type="text"
          placeholder="Buscar piloto, pista ou setup..."
          className="bg-transparent border-none outline-none text-sm text-white placeholder-slate-500 w-full"
        />
        <div className="hidden md:flex items-center gap-1">
          <span className="text-[10px] bg-slate-800 text-slate-400 px-1.5 py-0.5 rounded border border-slate-700 font-mono">⌘</span>
          <span className="text-[10px] bg-slate-800 text-slate-400 px-1.5 py-0.5 rounded border border-slate-700 font-mono">K</span>
        </div>
      </div>

      {/* Direita: Ações e Perfil */}
      <div className="flex items-center gap-5">

        {/* Notificações com Badge Pulse */}
        <button className="relative group">
          <div className="p-2 rounded-lg text-slate-400 group-hover:text-white group-hover:bg-slate-800 transition-all">
            <Bell size={20} />
          </div>
          <span className="absolute top-2 right-2.5 w-2 h-2 bg-red-500 rounded-full border-2 border-[#0b0f19]">
            <span className="absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75 animate-ping"></span>
          </span>
        </button>

        {/* Separador Vertical Sutil */}
        <div className="h-8 w-px bg-slate-800"></div>

        {/* Perfil REAL (Clerk) */}
        {!isLoaded ? (
          <Loader2 className="animate-spin text-cyan-500" size={20} />
        ) : user ? (
          <div className="flex items-center gap-3 cursor-pointer hover:bg-slate-800/50 p-1.5 pr-3 rounded-lg transition-colors border border-transparent hover:border-slate-800">
            <UserButton afterSignOutUrl="/" />
            <div className="text-left hidden md:block">
              <p className="text-xs font-bold text-white leading-none mb-0.5">{user.fullName || user.username || "User"}</p>
              <p className="text-[9px] text-cyan-400 font-mono bg-cyan-900/20 px-1 rounded uppercase tracking-wider">Driver</p>
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <SignInButton mode="modal">
              <button className="text-xs font-bold text-white bg-cyan-600 hover:bg-cyan-500 px-4 py-2 rounded transition">
                Sign In
              </button>
            </SignInButton>
          </div>
        )}
      </div>
    </header>
  );
}