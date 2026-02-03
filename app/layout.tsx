import type { Metadata } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
// Refresh Build - Force Next 14 Downgrade
import "./globals.css";
import Sidebar from "@/components/Sidebar";
import Header from "@/components/Header";

import { ClerkProvider } from "@clerk/nextjs";

// Fontes Profissionais
const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });
const mono = JetBrains_Mono({ subsets: ["latin"], variable: "--font-mono" });

export const metadata: Metadata = {
  title: "ApexMind Cloud",
  description: "Advanced Sim Racing Telemetry SaaS",
};


import { usePathname } from "next/navigation";

// ... (in RootLayout)

const pathname = usePathname();
const isLandingPage = pathname === "/";

return (
  <ClerkProvider>
    <html lang="en" className="dark">
      <body className={`${inter.variable} ${mono.variable} bg-[#0b0f19] text-white antialiased overflow-x-hidden`}>

        {/* COMPONENTES GLOBAIS DE NAVEGAÇÃO (Ocultar na Landing Page) */}
        {!isLandingPage && <Sidebar />}
        {!isLandingPage && <Header />}

        {/* ÁREA DE CONTEÚDO PRINCIPAL */}
        <main className={`${!isLandingPage ? "pl-20 pt-20" : ""} min-h-screen relative z-0 transition-all duration-300`}>
          {children}
        </main>

      </body>
    </html>
  </ClerkProvider>
);
}