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

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <ClerkProvider>
      <html lang="en" className="dark">
        <body className={`${inter.variable} ${mono.variable} bg-[#0b0f19] text-white antialiased overflow-x-hidden`}>

          {/* COMPONENTES GLOBAIS DE NAVEGAÇÃO */}
          <Sidebar />
          <Header />

          {/* ÁREA DE CONTEÚDO PRINCIPAL */}
          {/* pl-20 dá o espaço exato do Sidebar retraído */}
          {/* pt-20 dá o espaço do Header flutuante */}
          <main className="pl-20 pt-20 min-h-screen relative z-0 transition-all duration-300">
            {children}
          </main>

        </body>
      </html>
    </ClerkProvider>
  );
}