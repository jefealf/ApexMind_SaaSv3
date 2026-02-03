"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { SignOutButton } from "@clerk/nextjs";
import {
  Home, Activity, Users, ShoppingBag, Settings,
  LogOut, ChevronRight, Zap, User
} from "lucide-react";

export default function Sidebar() {
  const pathname = usePathname();

  const menuItems = [
    { icon: Home, label: "Home", href: "/" },
    { icon: Activity, label: "Análise", href: "/analysis/latest" }, // Exemplo de link direto
    { icon: Users, label: "Equipe", href: "/team", locked: true },
    { icon: ShoppingBag, label: "Setups", href: "/shop", locked: true },
  ];

  return (
    <aside className="fixed left-0 top-0 h-full w-20 bg-[#0b0f19] border-r border-slate-800 flex flex-col items-center py-6 z-50 transition-all hover:w-64 group overflow-hidden">

      {/* LOGO (Expandable) */}
      <div className="mb-10 px-4 w-full flex items-center gap-4">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center shrink-0 shadow-lg shadow-cyan-500/20">
          <Zap className="text-white fill-white" size={20} />
        </div>
        <span className="text-xl font-bold text-white opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap duration-300">
          ApexMind
        </span>
      </div>

      {/* NAV LINKS */}
      <nav className="flex-1 w-full px-3 space-y-2">
        {menuItems.map((item) => {
          const isActive = pathname === item.href || (item.href !== "/" && pathname.startsWith(item.href));
          return (
            <Link
              key={item.label}
              href={item.locked ? "#" : item.href}
              className={`relative flex items-center gap-4 px-3 py-3 rounded-xl transition-all duration-200 group/item
                ${isActive ? "bg-cyan-500/10 text-cyan-400" : "text-slate-400 hover:bg-slate-800 hover:text-white"}
                ${item.locked ? "opacity-50 cursor-not-allowed" : ""}
              `}
            >
              <item.icon size={22} className="shrink-0" />

              <span className="text-sm font-medium opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap duration-300">
                {item.label}
              </span>

              {/* Indicador de Ativo (Bolinha ou Barra) */}
              {isActive && (
                <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-8 bg-cyan-400 rounded-r-full"></div>
              )}

              {/* Lock Icon se necessário */}
              {item.locked && (
                <span className="ml-auto opacity-0 group-hover:opacity-100 transition-opacity">
                  <div className="text-[10px] bg-slate-700 px-1.5 py-0.5 rounded text-slate-300">PRO</div>
                </span>
              )}
            </Link>
          );
        })}
      </nav>

      {/* FOOTER ACTIONS */}
      <div className="w-full px-3 mt-auto space-y-2">
        <Link
          href="/profile"
          className={`flex items-center gap-4 px-3 py-3 rounded-xl transition-all duration-200 group/item ${pathname === "/profile" ? "bg-cyan-500/10 text-cyan-400" : "text-slate-400 hover:bg-slate-800 hover:text-white"}`}
        >
          <User size={22} className="shrink-0" />
          <span className="text-sm font-medium opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap duration-300">
            Profile
          </span>
        </Link>

        <Link
          href="/settings"
          className="flex items-center gap-4 px-3 py-3 rounded-xl text-slate-400 hover:bg-slate-800 hover:text-white transition-all"
        >
          <Settings size={22} className="shrink-0" />
          <span className="text-sm font-medium opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap duration-300">
            Configurações
          </span>
        </Link>

        <SignOutButton>
          <button className="w-full flex items-center gap-4 px-3 py-3 rounded-xl text-red-400 hover:bg-red-900/10 transition-all">
            <LogOut size={22} className="shrink-0" />
            <span className="text-sm font-medium opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap duration-300">
              Sair
            </span>
          </button>
        </SignOutButton>
      </div>
    </aside>
  );
}