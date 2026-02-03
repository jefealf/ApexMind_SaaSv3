"use client";
import { useEffect, useRef, memo } from "react";

interface CanvasGGProps {
    lat: number[];
    lon: number[];
    activeIndex: number | null;
}

const CanvasGG = memo(({ lat, lon, activeIndex }: CanvasGGProps) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas || !lat || !lon) return;

        const ctx = canvas.getContext("2d", { alpha: false });
        if (!ctx) return;

        // --- 1. Sizing ---
        if (containerRef.current) {
            const dpr = window.devicePixelRatio || 1;
            canvas.width = containerRef.current.clientWidth * dpr;
            canvas.height = containerRef.current.clientHeight * dpr;
        }
        const W = canvas.width;
        const H = canvas.height;

        // Scale: -3g to +3g typically
        const maxG = 3.0;
        const scale = Math.min(W, H) / (maxG * 2.2); // slight padding
        const centerX = W / 2;
        const centerY = H / 2;

        const toScreen = (gx: number, gy: number) => ({
            x: centerX + (gx * scale),
            y: centerY - (gy * scale)
        });

        // --- 2. Drawing ---
        // Background
        ctx.fillStyle = "#0f172a";
        ctx.fillRect(0, 0, W, H);

        // Grid
        ctx.strokeStyle = "#334155";
        ctx.lineWidth = 1;

        // Circles (1g, 2g, 3g)
        for (let g = 1; g <= 3; g++) {
            ctx.beginPath();
            ctx.arc(centerX, centerY, g * scale, 0, Math.PI * 2);
            ctx.stroke();
        }
        // Axes
        ctx.beginPath(); ctx.moveTo(centerX, 0); ctx.lineTo(centerX, H); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(0, centerY); ctx.lineTo(W, centerY); ctx.stroke();

        // Data Points
        ctx.fillStyle = "rgba(14, 165, 233, 0.4)"; // Cyan with opacity

        // Batch drawing could be faster but simple loop is fine for <10k points on modern canvas
        for (let i = 0; i < lat.length; i++) {
            const p = toScreen(lat[i], lon[i]);
            // Draw small rects instead of circles for speed if needed, but arcs are fine
            ctx.beginPath();
            ctx.rect(p.x - 1, p.y - 1, 2, 2);
            ctx.fill();
        }

        // Active Cursor
        if (activeIndex !== null && lat[activeIndex] !== undefined) {
            const p = toScreen(lat[activeIndex], lon[activeIndex]);

            ctx.fillStyle = "#facc15"; // Yellow
            ctx.strokeStyle = "#fff";
            ctx.lineWidth = 2;

            ctx.beginPath();
            ctx.arc(p.x, p.y, 6, 0, Math.PI * 2); // Larger dot
            ctx.fill();
            ctx.stroke();
        }

    }, [lat, lon, activeIndex]);

    return (
        <div ref={containerRef} className="w-full h-full bg-[#0f172a] rounded-xl relative overflow-hidden flex items-center justify-center">
            <canvas ref={canvasRef} className="w-full h-full block" />
        </div>
    );
});

CanvasGG.displayName = "CanvasGG";
export default CanvasGG;
