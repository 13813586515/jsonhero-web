import React, { useEffect, useMemo, useRef, useState } from "react";
import { useJson } from "~/hooks/useJson";
import {
  buildTimelineData,
  calculateTimelineLayout,
  formatTime,
  TimelineEvent,
  TimelineData,
} from "~/utilities/timelineBuilder";
import { Body } from "./Primitives/Body";
import { SmallTitle } from "./Primitives/SmallTitle";
import { RefreshIcon, ChevronLeftIcon, ChevronRightIcon } from "@heroicons/react/outline";

interface TimelineViewProps {
  timelineData: TimelineData;
}

function TimelineView({ timelineData }: TimelineViewProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [dimensions, setDimensions] = useState({ width: 800, height: 600 });
  const [selectedEvent, setSelectedEvent] = useState<string | null>(null);
  const [hoveredEvent, setHoveredEvent] = useState<string | null>(null);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState({ x: 0, y: 0 });

  useEffect(() => {
    const updateDimensions = () => {
      if (containerRef.current) {
        setDimensions({
          width: containerRef.current.clientWidth,
          height: containerRef.current.clientHeight,
        });
      }
    };

    updateDimensions();
    window.addEventListener("resize", updateDimensions);
    return () => window.removeEventListener("resize", updateDimensions);
  }, []);

  const laidOutEvents = useMemo(() => {
    return calculateTimelineLayout(timelineData, dimensions.width, dimensions.height);
  }, [timelineData, dimensions]);

  const selectedEventData = useMemo(() => {
    return laidOutEvents.find((e) => e.id === selectedEvent);
  }, [laidOutEvents, selectedEvent]);

  const handleZoom = (delta: number) => {
    setZoom((prev) => Math.min(Math.max(prev + delta, 0.5), 5));
  };

  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? -0.1 : 0.1;
    handleZoom(delta);
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.button === 0) {
      setIsPanning(true);
      setPanStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isPanning) {
      setPan({
        x: e.clientX - panStart.x,
        y: e.clientY - panStart.y,
      });
    }
  };

  const handleMouseUp = () => {
    setIsPanning(false);
  };

  const resetView = () => {
    setZoom(1);
    setPan({ x: 0, y: 0 });
    setSelectedEvent(null);
  };

  const getEventColor = (event: TimelineEvent, index: number): string => {
    const colors = [
      "#6366f1",
      "#10b981",
      "#f59e0b",
      "#ef4444",
      "#8b5cf6",
      "#ec4899",
      "#06b6d4",
      "#84cc16",
    ];
    return colors[index % colors.length];
  };

  const renderAxis = () => {
    if (laidOutEvents.length === 0) return null;

    const padding = { left: 60, right: 60, top: 50, bottom: 50 };
    const chartWidth = dimensions.width - padding.left - padding.right;
    const axisY = padding.top + 30;

    const axisX = padding.left + pan.x;
    const axisLength = chartWidth * zoom;

    const tickCount = Math.min(Math.max(Math.floor(laidOutEvents.length / 2), 3), 10);
    const ticks: { x: number; time: number; label: string }[] = [];

    const minTime = timelineData.minTime;
    const maxTime = timelineData.maxTime;
    const timeRange = maxTime - minTime;

    for (let i = 0; i <= tickCount; i++) {
      const ratio = i / tickCount;
      const time = minTime + timeRange * ratio;
      const x = padding.left + (chartWidth * ratio) * zoom + pan.x;
      ticks.push({
        x,
        time,
        label: formatTime(time, "date"),
      });
    }

    return (
      <g>
        <line
          x1={axisX}
          y1={axisY}
          x2={axisX + axisLength}
          y2={axisY}
          stroke="#94a3b8"
          strokeWidth={2}
        />

        {ticks.map((tick, i) => (
          <g key={i}>
            <line
              x1={tick.x}
              y1={axisY - 5}
              x2={tick.x}
              y2={axisY + 5}
              stroke="#94a3b8"
              strokeWidth={2}
            />
            <text
              x={tick.x}
              y={axisY + 20}
              textAnchor="middle"
              fill="#64748b"
              fontSize={11}
            >
              {tick.label}
            </text>
          </g>
        ))}
      </g>
    );
  };

  const renderEvent = (event: TimelineEvent, index: number) => {
    if (event.x === undefined || event.y === undefined) return null;

    const color = getEventColor(event, index);
    const isSelected = selectedEvent === event.id;
    const isHovered = hoveredEvent === event.id;

    const x = (event.x - 60) * zoom + 60 + pan.x;
    const y = event.y + pan.y;
    const axisY = 80;
    const radius = isSelected || isHovered ? 12 : 8;

    const showLine = y !== axisY;

    return (
      <g
        key={event.id}
        onClick={() => setSelectedEvent(isSelected ? null : event.id)}
        onMouseEnter={() => setHoveredEvent(event.id)}
        onMouseLeave={() => setHoveredEvent(null)}
        style={{ cursor: "pointer" }}
      >
        {showLine && (
          <line
            x1={x}
            y1={axisY}
            x2={x}
            y2={y}
            stroke={color}
            strokeWidth={isSelected ? 2 : 1}
            strokeDasharray={isSelected ? "none" : "4,4"}
            opacity={isSelected ? 1 : 0.6}
          />
        )}

        <circle
          cx={x}
          cy={axisY}
          r={6}
          fill={color}
          opacity={0.8}
        />

        <circle
          cx={x}
          cy={y}
          r={radius}
          fill={color}
          stroke={isSelected ? "#1e40af" : "white"}
          strokeWidth={isSelected ? 3 : 2}
        />

        <text
          x={x}
          y={y - radius - 5}
          textAnchor="middle"
          fill="#374151"
          fontSize={10}
          fontWeight={isSelected ? "bold" : "normal"}
        >
          {formatTime(event.timestamp, "time")}
        </text>

        {(isSelected || isHovered) && event.label.length > 0 && (
          <>
            <rect
              x={x - 80}
              y={y + radius + 5}
              width={160}
              height={30}
              rx={4}
              fill="white"
              stroke="#e5e7eb"
              strokeWidth={1}
            />
            <text
              x={x}
              y={y + radius + 25}
              textAnchor="middle"
              fill="#374151"
              fontSize={11}
            >
              {event.label.length > 25 ? event.label.slice(0, 25) + "..." : event.label}
            </text>
          </>
        )}
      </g>
    );
  };

  const formatEventData = (data: unknown): string => {
    try {
      return JSON.stringify(data, null, 2);
    } catch {
      return String(data);
    }
  };

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between p-2 bg-slate-100 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700">
        <div className="flex items-center gap-2">
          <SmallTitle>
            Events: {laidOutEvents.length} | Range:{" "}
            {laidOutEvents.length > 0
              ? `${formatTime(timelineData.minTime, "date")} - ${formatTime(timelineData.maxTime, "date")}`
              : "N/A"}
          </SmallTitle>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => handleZoom(0.2)}
            className="p-1 hover:bg-slate-200 dark:hover:bg-slate-700 rounded"
            title="Zoom In"
          >
            <span className="text-lg font-bold">+</span>
          </button>
          <span className="text-sm text-slate-600 dark:text-slate-400 w-16 text-center">
            {Math.round(zoom * 100)}%
          </span>
          <button
            onClick={() => handleZoom(-0.2)}
            className="p-1 hover:bg-slate-200 dark:hover:bg-slate-700 rounded"
            title="Zoom Out"
          >
            <span className="text-lg font-bold">−</span>
          </button>
          <button
            onClick={resetView}
            className="p-1 hover:bg-slate-200 dark:hover:bg-slate-700 rounded"
            title="Reset View"
          >
            <RefreshIcon className="w-5 h-5" />
          </button>
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">
        <div
          ref={containerRef}
          className="flex-1 relative bg-slate-50 dark:bg-slate-900"
          onWheel={handleWheel}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
          style={{ cursor: isPanning ? "grabbing" : "grab" }}
        >
          <svg width="100%" height="100%" className="select-none">
            {renderAxis()}
            {laidOutEvents.map(renderEvent)}
          </svg>

          {laidOutEvents.length === 0 && (
            <div className="absolute inset-0 flex items-center justify-center">
              <Body className="text-slate-400">
                No timeline events found. Try JSON with timestamp fields like "timestamp", "createdAt", or "date".
              </Body>
            </div>
          )}
        </div>

        {selectedEventData && (
          <div className="w-80 bg-white dark:bg-slate-800 border-l border-slate-200 dark:border-slate-700 overflow-y-auto">
            <div className="p-4 border-b border-slate-200 dark:border-slate-700">
              <SmallTitle>Event Details</SmallTitle>
            </div>
            <div className="p-4 space-y-4">
              <div>
                <Body className="text-sm text-slate-500 dark:text-slate-400">Time</Body>
                <Body className="font-mono text-sm">
                  {formatTime(selectedEventData.timestamp, "full")}
                </Body>
              </div>
              <div>
                <Body className="text-sm text-slate-500 dark:text-slate-400">Label</Body>
                <Body className="text-sm">{selectedEventData.label}</Body>
              </div>
              <div>
                <Body className="text-sm text-slate-500 dark:text-slate-400">Path</Body>
                <Body className="font-mono text-sm break-all">{selectedEventData.path}</Body>
              </div>
              <div>
                <Body className="text-sm text-slate-500 dark:text-slate-400 mb-2">Data</Body>
                <pre className="bg-slate-50 dark:bg-slate-700 p-3 rounded text-xs font-mono overflow-auto max-h-64">
                  {formatEventData(selectedEventData.data)}
                </pre>
              </div>
            </div>
          </div>
        )}
      </div>

      {laidOutEvents.length > 0 && (
        <div className="p-2 bg-slate-100 dark:bg-slate-800 border-t border-slate-200 dark:border-slate-700">
          <div className="flex items-center gap-4 overflow-x-auto pb-1">
            <span className="text-xs text-slate-500 whitespace-nowrap">Events:</span>
            {laidOutEvents.slice(0, 10).map((event, i) => (
              <button
                key={event.id}
                onClick={() => setSelectedEvent(selectedEvent === event.id ? null : event.id)}
                className={`flex items-center gap-1 px-2 py-1 rounded text-xs whitespace-nowrap transition ${
                  selectedEvent === event.id
                    ? "bg-indigo-100 text-indigo-700 dark:bg-indigo-900 dark:text-indigo-300"
                    : "bg-white text-slate-600 hover:bg-slate-50 dark:bg-slate-700 dark:text-slate-300"
                }`}
              >
                <span
                  className="w-2 h-2 rounded-full"
                  style={{ backgroundColor: getEventColor(event, i) }}
                ></span>
                {event.label.length > 15 ? event.label.slice(0, 15) + "..." : event.label}
              </button>
            ))}
            {laidOutEvents.length > 10 && (
              <span className="text-xs text-slate-400">+{laidOutEvents.length - 10} more</span>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export function TimelineViewComponent() {
  const [json] = useJson();

  const timelineData = useMemo(() => {
    return buildTimelineData(json);
  }, [json]);

  return (
    <div className="h-full flex flex-col">
      <TimelineView timelineData={timelineData} />
    </div>
  );
}
