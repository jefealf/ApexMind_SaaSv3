"use client";
import { useEffect, useRef, memo } from "react";

interface CanvasTrackMapProps {
  map_x_target: number[];
  map_y_target: number[];
  map_x_base?: number[];
  map_y_base?: number[];
  highlightIndex: number | null;
  dataChannel?: number[];
  colorMode?: "speed" | "brake" | "throttle" | "gear" | "none";
  zoom?: boolean;
}

const CanvasTrackMap = memo(({ 
  map_x_target, 
  map_y_target, 
  map_x_base, 
  map_y_base, 
  highlightIndex, 
  dataChannel = [], 
  colorMode = "speed", 
  zoom = false 
}: CanvasTrackMapProps) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !map_x_target || !map_y_target || map_x_target.length === 0) return;
    
    const ctx = canvas.getContext("2d", { alpha: false });
    if (!ctx) return;

    // --- 1. Coordinate Normalization Logic ---
    // (Similar to previous TrackMap but optimized for Canvas coords)
    const refX = (map_x_base && map_x_base.length) ? map_x_base : map_x_target;
    const refY = (map_y_base && map_y_base.length) ? map_y_base : map_y_target;
    
    const minX = Math.min(...refX);
    const maxX = Math.max(...refX);
    const minY = Math.min(...refY);
    const maxY = Math.max(...refY);
    
    // Add 5% padding
    const paddingX = (maxX - minX) * 0.05;
    const paddingY = (maxY - minY) * 0.05;
    
    const rangeX = (maxX - minX) + (paddingX * 2) || 1;
    const rangeY = (maxY - minY) + (paddingY * 2) || 1;
    const originX = minX - paddingX;
    const originY = minY - paddingY;

    // --- 2. Resize Canvas to Match Container ---
    if (containerRef.current) {
        canvas.width = containerRef.current.clientWidth * window.devicePixelRatio;
        canvas.height = containerRef.current.clientHeight * window.devicePixelRatio;
        // ctx.scale(window.devicePixelRatio, window.devicePixelRatio); // Not scaling context, scaling math instead for perf
    }
    const W = canvas.width;
    const H = canvas.height;

    // Determine scale to fit track in canvas maintaining aspect ratio
    const scaleX = W / rangeX;
    const scaleY = H / rangeY;
    const scale = Math.min(scaleX, scaleY); // Uniform scale
    
    // Center the track
    const offsetX = (W - (rangeX * scale)) / 2;
    const offsetY = (H - (rangeY * scale)) / 2;

    const toScreen = (x: number, y: number) => ({
        x: offsetX + (x - originX) * scale,
        y: H - (offsetY + (y - originY) * scale) // Flip Y for typical cartesian
    });

    // --- ZOOM LOGIC ---
    let zoomScale = 1;
    let zoomTranslateX = 0;
    let zoomTranslateY = 0;

    if (zoom && highlightIndex !== null && map_x_target[highlightIndex]) {
        zoomScale = 5; // Zoom factor
        const focus = toScreen(map_x_target[highlightIndex], map_y_target[highlightIndex]);
        zoomTranslateX = (W / 2) - (focus.x * zoomScale);
        zoomTranslateY = (H / 2) - (focus.y * zoomScale);
    }

    // --- 3. DRAWING ---
    // Fill Background
    ctx.fillStyle = "#0f172a";
    ctx.fillRect(0, 0, W, H);
    
    ctx.save();
    
    if (zoom) {
        ctx.translate(zoomTranslateX, zoomTranslateY);
        ctx.scale(zoomScale, zoomScale);
    }

    // A. Draw Base Track (Grey)
    if (map_x_base && map_x_base.length > 0) {
        ctx.strokeStyle = "#334155";
        ctx.lineWidth = 4;
        ctx.lineJoin = "round";
        ctx.lineCap = "round";
        ctx.beginPath();
        const start = toScreen(map_x_base[0], map_y_base![0]);
        ctx.moveTo(start.x, start.y);
        for (let i = 1; i < map_x_base.length; i++) {
             const p = toScreen(map_x_base[i], map_y_base![i]);
             ctx.lineTo(p.x, p.y);
        }
        ctx.stroke();
    }

    // B. Draw Heatmap Segments
    // Optimization: Draw one path per color range if possible, or simple segments
    // For smoothness, drawing segments is fine in Canvas 2D
    const minVal = dataChannel.length ? Math.min(...dataChannel) : 0;
    const maxVal = dataChannel.length ? Math.max(...dataChannel) : 100;
    
    const getSegmentColor = (val: number) => {
        if (colorMode === "none") return "#facc15";
        let pct = (val - minVal) / (maxVal - minVal || 1);
        if (pct < 0) pct = 0; if (pct > 1) pct = 1;

        if (colorMode === "brake") {
            // Blue for off (0), White>Red for on
            if (val < 1) return "#3b82f6";
            // Simple gradient white to red
            const r = 255;
            const g = Math.floor(255 * (1 - pct));
            const b = Math.floor(255 * (1 - pct));
            return `rgb(${r},${g},${b})`;
        }
        
        if (colorMode === "speed") {
            // Hue from 240 (Blue) to 0 (Red)
            return `hsl(${240 - (pct * 240)}, 100%, 50%)`;
        }
        
        return "#facc15"; // fallback
    };

    ctx.lineWidth = 3;
    
    for (let i = 0; i < map_x_target.length - 1; i++) {
        const p1 = toScreen(map_x_target[i], map_y_target[i]);
        const p2 = toScreen(map_x_target[i+1], map_y_target[i+1]);
        
        ctx.strokeStyle = getSegmentColor(dataChannel[i] || 0);
        ctx.beginPath();
        ctx.moveTo(p1.x, p1.y);
        ctx.lineTo(p2.x, p2.y);
        ctx.stroke();
    }

    // C. Highlight Cursor
    if (highlightIndex !== null && highlightIndex < map_x_target.length) {
        const cursor = toScreen(map_x_target[highlightIndex], map_y_target[highlightIndex]);
        
        // Outer Glow
        ctx.shadowColor = "white";
        ctx.shadowBlur = 10;
        
        // White Circle
        ctx.fillStyle = "#fff";
        ctx.beginPath();
        ctx.arc(cursor.x, cursor.y, 5, 0, Math.PI * 2);
        ctx.fill();
        
        // Inner Dot
        ctx.fillStyle = "#000";
        ctx.shadowBlur = 0; // reset
        ctx.beginPath();
        ctx.arc(cursor.x, cursor.y, 2, 0, Math.PI * 2);
        ctx.fill();
    }

    ctx.restore();

  }, [map_x_target, map_y_target, map_x_base, map_y_base, highlightIndex, dataChannel, colorMode, zoom]);

  return (
    <div ref={containerRef} className="w-full h-full bg-[#0f172a] rounded-xl overflow-hidden relative">
      <canvas ref={canvasRef} className="w-full h-full block" />
    </div>
  );
});

CanvasTrackMap.displayName = "CanvasTrackMap";
export default CanvasTrackMap;
