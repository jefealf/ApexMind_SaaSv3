"use client";

import { useEffect } from "react";

export default function Error({
    error,
    reset,
}: {
    error: Error & { digest?: string };
    reset: () => void;
}) {
    useEffect(() => {
        console.error("Profile Page Crash:", error);
    }, [error]);

    return (
        <div className="min-h-screen bg-[#0b0f19] flex flex-col items-center justify-center text-white p-6">
            <h2 className="text-2xl font-bold text-red-500 mb-4">Something went wrong!</h2>
            <p className="text-slate-400 mb-6 bg-slate-900 p-4 rounded border border-red-900/50 font-mono text-xs max-w-lg break-all">
                {error.message || "Unknown Error"}
            </p>
            <button
                onClick={() => reset()}
                className="bg-cyan-600 px-6 py-2 rounded font-bold hover:bg-cyan-500"
            >
                Try again
            </button>
        </div>
    );
}
