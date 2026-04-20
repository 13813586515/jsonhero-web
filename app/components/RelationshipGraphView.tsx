import React, { useEffect, useMemo, useRef, useState } from "react";
import { useJson } from "~/hooks/useJson";
import {
  buildGraphData,
  calculateLayout,
  GraphData,
  GraphEdge,
  GraphNode,
} from "~/utilities/graphBuilder";
import { Body } from "./Primitives/Body";
import { SmallTitle } from "./Primitives/SmallTitle";
import { SearchIcon, RefreshIcon } from "@heroicons/react/outline";

const NODE_RADIUS = 40;
const MIN_ZOOM = 0.2;
const MAX_ZOOM = 3;

interface GraphViewProps {
  graphData: GraphData;
}

function GraphView({ graphData }: GraphViewProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const [selectedNode, setSelectedNode] = useState<string | null>(null);
  const [hoveredNode, setHoveredNode] = useState<string | null>(null);
  const [viewBox, setViewBox] = useState({ x: 0, y: 0, width: 800, height: 600 });
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState({ x: 0, y: 0 });

  const containerRef = useRef<HTMLDivElement>(null);
  const [dimensions, setDimensions] = useState({ width: 800, height: 600 });

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

  const layoutedGraph = useMemo(() => {
    const paddedWidth = dimensions.width * 0.9;
    const paddedHeight = dimensions.height * 0.9;
    return calculateLayout(graphData, paddedWidth, paddedHeight);
  }, [graphData, dimensions]);

  const selectedNodeData = useMemo(() => {
    return layoutedGraph.nodes.find((n) => n.id === selectedNode);
  }, [layoutedGraph.nodes, selectedNode]);

  const connectedEdges = useMemo(() => {
    if (!selectedNode) return [];
    return layoutedGraph.edges.filter(
      (e) => e.source === selectedNode || e.target === selectedNode
    );
  }, [layoutedGraph.edges, selectedNode]);

  const handleZoom = (delta: number) => {
    setZoom((prev) => Math.min(Math.max(prev + delta, MIN_ZOOM), MAX_ZOOM));
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

  const nodeColors = {
    object: { fill: "#6366f1", stroke: "#4f46e5", text: "#ffffff" },
    array: { fill: "#10b981", stroke: "#059669", text: "#ffffff" },
    primitive: { fill: "#f59e0b", stroke: "#d97706", text: "#1f2937" },
  };

  const edgeColors = {
    "id-reference": { stroke: "#ef4444", dash: "none" },
    contains: { stroke: "#9ca3af", dash: "none" },
    "array-item": { stroke: "#6b7280", dash: "4,4" },
  };

  const getEdgeColor = (edge: GraphEdge) => {
    const isHighlighted =
      selectedNode === edge.source ||
      selectedNode === edge.target ||
      hoveredNode === edge.source ||
      hoveredNode === edge.target;
    return isHighlighted ? edgeColors[edge.type].stroke : "#d1d5db";
  };

  const getEdgeWidth = (edge: GraphEdge) => {
    const isHighlighted =
      selectedNode === edge.source ||
      selectedNode === edge.target ||
      hoveredNode === edge.source ||
      hoveredNode === edge.target;
    return isHighlighted ? 3 : 1.5;
  };

  const resetView = () => {
    setZoom(1);
    setPan({ x: 0, y: 0 });
    setSelectedNode(null);
  };

  const getNodePosition = (node: GraphNode) => {
    return {
      x: (node.x || 400) * zoom + pan.x + dimensions.width / 2 - (400 * zoom),
      y: (node.y || 300) * zoom + pan.y + dimensions.height / 2 - (300 * zoom),
    };
  };

  const renderEdge = (edge: GraphEdge, index: number) => {
    const sourceNode = layoutedGraph.nodes.find((n) => n.id === edge.source);
    const targetNode = layoutedGraph.nodes.find((n) => n.id === edge.target);

    if (!sourceNode || !targetNode) return null;

    const sourcePos = getNodePosition(sourceNode);
    const targetPos = getNodePosition(targetNode);

    const dx = targetPos.x - sourcePos.x;
    const dy = targetPos.y - sourcePos.y;
    const distance = Math.sqrt(dx * dx + dy * dy);

    if (distance === 0) return null;

    const arrowLength = 10 * zoom;
    const startX = sourcePos.x + (dx / distance) * NODE_RADIUS * zoom;
    const startY = sourcePos.y + (dy / distance) * NODE_RADIUS * zoom;
    const endX = targetPos.x - (dx / distance) * (NODE_RADIUS * zoom + arrowLength);
    const endY = targetPos.y - (dy / distance) * (NODE_RADIUS * zoom + arrowLength);

    const angle = Math.atan2(dy, dx);
    const arrowX1 = endX + arrowLength * Math.cos(angle - Math.PI / 6);
    const arrowY1 = endY + arrowLength * Math.sin(angle - Math.PI / 6);
    const arrowX2 = endX + arrowLength * Math.cos(angle + Math.PI / 6);
    const arrowY2 = endY + arrowLength * Math.sin(angle + Math.PI / 6);

    const color = getEdgeColor(edge);
    const width = getEdgeWidth(edge);
    const opacity = selectedNode && !getEdgeWidth(edge) ? 0.2 : 1;

    return (
      <g key={`edge-${index}`}>
        <line
          x1={startX}
          y1={startY}
          x2={endX}
          y2={endY}
          stroke={color}
          strokeWidth={width}
          opacity={opacity}
          markerEnd={`url(#arrowhead-${edge.type})`}
        />
        <polygon
          points={`${endX},${endY} ${arrowX1},${arrowY1} ${arrowX2},${arrowY2}`}
          fill={color}
          opacity={opacity}
        />
      </g>
    );
  };

  const renderNode = (node: GraphNode, index: number) => {
    const pos = getNodePosition(node);
    const colors = nodeColors[node.type];
    const isSelected = selectedNode === node.id;
    const isHovered = hoveredNode === node.id;
    const isConnected =
      selectedNode &&
      connectedEdges.some((e) => e.source === node.id || e.target === node.id);

    const radius = NODE_RADIUS * zoom;
    const strokeWidth = (isSelected ? 4 : 2) * zoom;
    const opacity = selectedNode && !isSelected && !isConnected ? 0.3 : 1;

    const displayLabel = node.label.length > 20 ? node.label.slice(0, 20) + "..." : node.label;

    return (
      <g
        key={`node-${index}`}
        onClick={() => setSelectedNode(isSelected ? null : node.id)}
        onMouseEnter={() => setHoveredNode(node.id)}
        onMouseLeave={() => setHoveredNode(null)}
        style={{ cursor: "pointer" }}
        opacity={opacity}
      >
        <circle
          cx={pos.x}
          cy={pos.y}
          r={radius}
          fill={colors.fill}
          stroke={isSelected || isHovered ? "#1e40af" : colors.stroke}
          strokeWidth={strokeWidth}
        />
        <text
          x={pos.x}
          y={pos.y}
          textAnchor="middle"
          dominantBaseline="middle"
          fill={colors.text}
          fontSize={12 * zoom}
          fontWeight="bold"
          pointerEvents="none"
        >
          {displayLabel}
        </text>
      </g>
    );
  };

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between p-2 bg-slate-100 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700">
        <div className="flex items-center gap-2">
          <SmallTitle>
            Nodes: {layoutedGraph.nodes.length} | Edges: {layoutedGraph.edges.length}
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
          <svg
            ref={svgRef}
            width="100%"
            height="100%"
            className="select-none"
          >
            <defs>
              <marker
                id="arrowhead-id-reference"
                markerWidth="10"
                markerHeight="10"
                refX="9"
                refY="3"
                orient="auto"
              >
                <polygon points="0 0, 10 3, 0 6" fill="#ef4444" />
              </marker>
              <marker
                id="arrowhead-contains"
                markerWidth="10"
                markerHeight="10"
                refX="9"
                refY="3"
                orient="auto"
              >
                <polygon points="0 0, 10 3, 0 6" fill="#9ca3af" />
              </marker>
              <marker
                id="arrowhead-array-item"
                markerWidth="10"
                markerHeight="10"
                refX="9"
                refY="3"
                orient="auto"
              >
                <polygon points="0 0, 10 3, 0 6" fill="#6b7280" />
              </marker>
            </defs>

            {layoutedGraph.edges.map(renderEdge)}
            {layoutedGraph.nodes.map(renderNode)}
          </svg>

          {layoutedGraph.nodes.length === 0 && (
            <div className="absolute inset-0 flex items-center justify-center">
              <Body className="text-slate-400">
                No graph data available. Try JSON with ID references.
              </Body>
            </div>
          )}
        </div>

        {selectedNodeData && (
          <div className="w-72 bg-white dark:bg-slate-800 border-l border-slate-200 dark:border-slate-700 overflow-y-auto">
            <div className="p-4 border-b border-slate-200 dark:border-slate-700">
              <SmallTitle>Node Details</SmallTitle>
            </div>
            <div className="p-4 space-y-3">
              <div>
                <Body className="text-sm text-slate-500 dark:text-slate-400">Label</Body>
                <Body className="font-mono text-sm">{selectedNodeData.label}</Body>
              </div>
              <div>
                <Body className="text-sm text-slate-500 dark:text-slate-400">Path</Body>
                <Body className="font-mono text-sm break-all">{selectedNodeData.path}</Body>
              </div>
              <div>
                <Body className="text-sm text-slate-500 dark:text-slate-400">Type</Body>
                <Body className="font-mono text-sm capitalize">{selectedNodeData.type}</Body>
              </div>
              <div>
                <Body className="text-sm text-slate-500 dark:text-slate-400">
                  Connected Edges
                </Body>
                <div className="mt-2 space-y-2">
                  {connectedEdges.map((edge, i) => (
                    <div
                      key={i}
                      className="text-xs font-mono bg-slate-50 dark:bg-slate-700 p-2 rounded"
                    >
                      <span
                        className={
                          edge.type === "id-reference"
                            ? "text-red-500"
                            : "text-slate-500"
                        }
                      >
                        [{edge.type}]
                      </span>{" "}
                      {edge.label}: {edge.source === selectedNode ? "→" : "←"}{" "}
                      {edge.source === selectedNode ? edge.target : edge.source}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="p-2 bg-slate-100 dark:bg-slate-800 border-t border-slate-200 dark:border-slate-700">
        <div className="flex items-center gap-4 text-xs">
          <div className="flex items-center gap-1">
            <span className="inline-block w-3 h-3 rounded-full bg-indigo-500"></span>
            <span className="text-slate-600 dark:text-slate-400">Object</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="inline-block w-3 h-3 rounded-full bg-emerald-500"></span>
            <span className="text-slate-600 dark:text-slate-400">Array</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="inline-block w-8 h-0.5 bg-red-500"></span>
            <span className="text-slate-600 dark:text-slate-400">ID Reference</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="inline-block w-8 h-0.5 bg-slate-400"></span>
            <span className="text-slate-600 dark:text-slate-400">Contains</span>
          </div>
        </div>
      </div>
    </div>
  );
}

export function RelationshipGraphView() {
  const [json] = useJson();

  const graphData = useMemo(() => {
    return buildGraphData(json);
  }, [json]);

  return (
    <div className="h-full flex flex-col">
      <GraphView graphData={graphData} />
    </div>
  );
}
