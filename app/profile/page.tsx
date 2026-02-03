"use client";

import { useUser, SignOutButton } from "@clerk/nextjs";
import { Loader2, LogOut } from "lucide-react";
import Image from "next/image";

export default function ProfilePage() {
    console.log("Rendering Profile Page...");
    const { user, isLoaded } = useUser();
    console.log("User User Hook:", { user: !!user, isLoaded });

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
                        <p className="text-slate-400 mt-1">Manage your account</p>
                    </div>
                </div>

                {/* Account Info (Clerk) */}
                <div className="max-w-md mx-auto bg-[#1e293b] rounded-xl p-8 border border-white/10 shadow-2xl">
                    <div className="flex flex-col items-center text-center">
                        <div className="w-32 h-32 rounded-full overflow-hidden mb-6 border-4 border-cyan-500/30 shadow-lg shadow-cyan-500/20">
                            <Image
                                src={user.imageUrl}
                                alt={user.fullName || "User"}
                                width={128}
                                height={128}
                                className="w-full h-full object-cover"
                            />
                        </div>
                        <h2 className="text-2xl font-bold text-white mb-2">{user.fullName}</h2>
                        <p className="text-slate-400 bg-slate-900/50 px-4 py-1 rounded-full text-sm mb-8 border border-white/5">
                            {user.primaryEmailAddress?.emailAddress}
                        </p>

                        <div className="w-full pt-6 border-t border-white/5">
                            <SignOutButton>
                                <button className="w-full flex items-center justify-center gap-2 bg-red-500/10 hover:bg-red-500/20 text-red-400 py-3 rounded-xl transition font-medium border border-red-500/20 hover:border-red-500/40">
                                    <LogOut size={18} /> Sign Out
                                </button>
                            </SignOutButton>
                        </div>
                    </div>
                </div>

            </div>
        </div>
    );
}
