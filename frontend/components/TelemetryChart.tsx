"use client";
import { createChart, ColorType, IChartApi, ISeriesApi, AreaSeries, LineSeries, HistogramSeries, LineWidth, UTCTimestamp } from 'lightweight-charts';
import { useEffect, useRef, forwardRef, useImperativeHandle } from 'react';

// Wrapper to expose chart instance for syncing
export interface TelemetryChartRef {
    api: () => IChartApi | null;
}

interface SeriesDef {
    type: 'Line' | 'Area' | 'Histogram';
    data: { time: number; value: number }[];
    color: string;
    width?: number;
    priceScaleId?: string;
    title?: string;
}

interface TelemetryChartProps {
    series: SeriesDef[];
    height?: number;
    colors?: {
        bg?: string;
        grid?: string;
        text?: string;
    };
    syncId?: string; // Used for external syncing logic
    onCrosshairMove?: (time: number | null, point?: any) => void;
}

const TelemetryChart = forwardRef<TelemetryChartRef, TelemetryChartProps>(({ series, height = 200, colors, onCrosshairMove }, ref) => {
    const chartContainerRef = useRef<HTMLDivElement>(null);
    const chartApiRef = useRef<IChartApi | null>(null);

    useImperativeHandle(ref, () => ({
        api: () => chartApiRef.current
    }));

    useEffect(() => {
        if (!chartContainerRef.current) return;

        const chart = createChart(chartContainerRef.current, {
            layout: {
                background: { type: ColorType.Solid, color: colors?.bg || 'transparent' },
                textColor: colors?.text || '#94a3b8',
            },
            grid: {
                vertLines: { color: colors?.grid || '#1e293b' },
                horzLines: { color: colors?.grid || '#1e293b' },
            },
            width: chartContainerRef.current.clientWidth,
            height: height,
            timeScale: {
                timeVisible: true,
                secondsVisible: true,
                borderColor: '#334155',
            },
            rightPriceScale: {
                visible: false, // Hide duplicate scales if using overlay mainly
            },
            crosshair: {
                vertLine: {
                    color: '#facc15',
                    width: 1,
                    style: 3,
                    labelBackgroundColor: '#facc15',
                },
                horzLine: {
                    visible: false,
                    labelVisible: false
                }
            },
            handleScale: {
                axisPressedMouseMove: { time: true, price: false }, // Only zoom time X axis
                mouseWheel: true,
            },
            handleScroll: {
                mouseWheel: true,
                pressedMouseMove: true,
            }
        });

        chartApiRef.current = chart;

        // Add Series
        series.forEach(s => {
            let seriesApi;
            const lineWidth = (s.width || 2) as LineWidth;

            if (s.type === 'Area') {
                seriesApi = chart.addSeries(AreaSeries, {
                    lineColor: s.color,
                    topColor: s.color,
                    bottomColor: 'rgba(0,0,0,0)',
                    lineWidth: lineWidth,
                    priceScaleId: s.priceScaleId
                });
            } else if (s.type === 'Histogram') {
                seriesApi = chart.addSeries(HistogramSeries, { color: s.color, priceScaleId: s.priceScaleId });
            } else {
                seriesApi = chart.addSeries(LineSeries, {
                    color: s.color,
                    lineWidth: lineWidth,
                    crosshairMarkerVisible: true,
                    priceScaleId: s.priceScaleId
                });
            }
            // Cast data to any to bypass strict Time type check (we use number as UTCTimestamp)
            seriesApi.setData(s.data as any);

            // Set scale options if provided
            if (s.priceScaleId) {
                chart.priceScale(s.priceScaleId).applyOptions({
                    visible: false, // Hide Y axis usually, or distinct
                    autoScale: true
                });
            }
        });

        chart.timeScale().fitContent();

        // Crosshair Handler
        chart.subscribeCrosshairMove((param) => {
            if (onCrosshairMove) {
                const time = param.time;
                onCrosshairMove(time as number, param.point);
            }
        });

        // Resize Handler
        const handleResize = () => {
            if (chartContainerRef.current) {
                chart.applyOptions({ width: chartContainerRef.current.clientWidth });
            }
        };
        window.addEventListener('resize', handleResize);

        return () => {
            window.removeEventListener('resize', handleResize);
            chart.remove();
        };
    }, []);

    // Update data when series props change? 
    // For now, assume full remount on data change is safer or implement data update logic
    // Implementing simple data update without destroying chart is complex with multiple series potentially changing order
    // So we rely on the key prop in the parent to force remount if data fundamentally changes.

    return <div ref={chartContainerRef} className="w-full relative" />;
});

TelemetryChart.displayName = "TelemetryChart";
export default TelemetryChart;
