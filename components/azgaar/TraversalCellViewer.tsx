"use client";

import { useDeferredValue, useEffect, useMemo, useRef, useState } from "react";

export type TraversalCell = {
  cellId: number;
  mapX: number;
  mapY: number;
  centroidLat: number;
  centroidLon: number;
  traversalScore: number;
  traversalProfile: string;
  meanElevationM: number;
  meanSlopeDeg: number;
  ruggednessM: number;
  coastDistanceKm: number;
};

export type SettlementMarker = {
  settlementId: number;
  cellId: number;
  x: number;
  y: number;
  urbanPopulation: number;
  rankClass: string;
  isPort: boolean;
  isCapital: boolean;
  seedType: string;
};

type ViewBox = {
  minX: number;
  minY: number;
  width: number;
  height: number;
};

type Metadata = {
  world_shape?: {
    width: number;
    height: number;
  };
  render_size?: {
    width: number;
    height: number;
  };
  cell_count: number;
  profile_counts: Record<string, number>;
};

const PROFILE_COLORS: Record<string, string> = {
  open: "#f6e8a6",
  easy: "#d7f0a6",
  moderate: "#89d17b",
  rough: "#e8b866",
  severe: "#cf7d43",
  cliffed_coast: "#b45d44",
  extreme: "#822f2a",
};

function clampViewBox(viewBox: ViewBox, boundsWidth: number, boundsHeight: number): ViewBox {
  const width = Math.min(Math.max(150, viewBox.width), boundsWidth);
  const height = Math.min(Math.max(120, viewBox.height), boundsHeight);
  const maxX = boundsWidth - width;
  const maxY = boundsHeight - height;
  return {
    minX: Math.min(Math.max(0, viewBox.minX), maxX),
    minY: Math.min(Math.max(0, viewBox.minY), maxY),
    width,
    height,
  };
}

export default function TraversalCellViewer({
  cells,
  metadata,
  basemapSrc,
  overlaySrc,
  overlayLabel,
  description,
  settlements,
}: {
  cells: TraversalCell[];
  metadata: Metadata;
  basemapSrc: string;
  overlaySrc?: string;
  overlayLabel?: string;
  description: string;
  settlements?: SettlementMarker[];
}) {
  const width = metadata.world_shape?.width ?? metadata.render_size?.width ?? 3600;
  const height = metadata.world_shape?.height ?? metadata.render_size?.height ?? 1800;
  const svgRef = useRef<SVGSVGElement | null>(null);
  const isPanningRef = useRef(false);
  const panStartRef = useRef<{ clientX: number; clientY: number; viewBox: ViewBox } | null>(null);

  const [search, setSearch] = useState("");
  const deferredSearch = useDeferredValue(search.trim().toLowerCase());
  const [selectedProfile, setSelectedProfile] = useState<string>("all");
  const [showDots, setShowDots] = useState(true);
  const [showOverlay, setShowOverlay] = useState(Boolean(overlaySrc));
  const [showSettlements, setShowSettlements] = useState(Boolean(settlements?.length));
  const [overlayOpacity, setOverlayOpacity] = useState(0.82);
  const [selectedCellId, setSelectedCellId] = useState<number | null>(null);
  const [selectedSettlementId, setSelectedSettlementId] = useState<number | null>(null);
  const [mapViewBox, setMapViewBox] = useState<ViewBox>({ minX: 0, minY: 0, width, height });

  useEffect(() => {
    setMapViewBox({ minX: 0, minY: 0, width, height });
  }, [width, height]);

  const filteredCells = useMemo(() => {
    return cells.filter((cell) => {
      if (selectedProfile !== "all" && cell.traversalProfile !== selectedProfile) return false;
      if (!deferredSearch) return true;
      return [
        String(cell.cellId),
        cell.traversalProfile,
        cell.centroidLat.toFixed(3),
        cell.centroidLon.toFixed(3),
      ]
        .join(" ")
        .toLowerCase()
        .includes(deferredSearch);
    });
  }, [cells, deferredSearch, selectedProfile]);

  const visibleCells = filteredCells;

  const selectedCell = useMemo(
    () => visibleCells.find((cell) => cell.cellId === selectedCellId) ?? null,
    [selectedCellId, visibleCells],
  );

  const visibleSettlements = settlements ?? [];
  const selectedSettlement = useMemo(
    () => visibleSettlements.find((item) => item.settlementId === selectedSettlementId) ?? null,
    [selectedSettlementId, visibleSettlements],
  );

  useEffect(() => {
    if (!visibleCells.length) {
      setSelectedCellId(null);
      return;
    }
    if (selectedCellId == null || !visibleCells.some((cell) => cell.cellId === selectedCellId)) {
      setSelectedCellId(visibleCells[0]?.cellId ?? null);
    }
  }, [selectedCellId, visibleCells]);

  useEffect(() => {
    if (!visibleSettlements.length) {
      setSelectedSettlementId(null);
      return;
    }
    if (selectedSettlementId == null || !visibleSettlements.some((item) => item.settlementId === selectedSettlementId)) {
      setSelectedSettlementId(visibleSettlements[0]?.settlementId ?? null);
    }
  }, [selectedSettlementId, visibleSettlements]);

  const handleWheel = (event: React.WheelEvent<SVGSVGElement>) => {
    event.preventDefault();
    const svg = svgRef.current;
    if (!svg) return;

    const rect = svg.getBoundingClientRect();
    const scale = event.deltaY > 0 ? 1.12 : 0.88;
    const pointerX = (event.clientX - rect.left) / rect.width;
    const pointerY = (event.clientY - rect.top) / rect.height;

    setMapViewBox((current) => {
      const nextWidth = current.width * scale;
      const nextHeight = current.height * scale;
      const worldX = current.minX + current.width * pointerX;
      const worldY = current.minY + current.height * pointerY;
      return clampViewBox(
        {
          minX: worldX - nextWidth * pointerX,
          minY: worldY - nextHeight * pointerY,
          width: nextWidth,
          height: nextHeight,
        },
        width,
        height,
      );
    });
  };

  const handlePointerDown = (event: React.PointerEvent<SVGSVGElement>) => {
    isPanningRef.current = true;
    panStartRef.current = {
      clientX: event.clientX,
      clientY: event.clientY,
      viewBox: mapViewBox,
    };
    event.currentTarget.setPointerCapture(event.pointerId);
  };

  const handlePointerMove = (event: React.PointerEvent<SVGSVGElement>) => {
    if (!isPanningRef.current || !panStartRef.current) return;
    const svg = svgRef.current;
    if (!svg) return;
    const rect = svg.getBoundingClientRect();
    const deltaX = ((event.clientX - panStartRef.current.clientX) / rect.width) * panStartRef.current.viewBox.width;
    const deltaY = ((event.clientY - panStartRef.current.clientY) / rect.height) * panStartRef.current.viewBox.height;
    setMapViewBox(
      clampViewBox(
        {
          ...panStartRef.current.viewBox,
          minX: panStartRef.current.viewBox.minX - deltaX,
          minY: panStartRef.current.viewBox.minY - deltaY,
        },
        width,
        height,
      ),
    );
  };

  const handlePointerUp = (event: React.PointerEvent<SVGSVGElement>) => {
    isPanningRef.current = false;
    panStartRef.current = null;
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
  };

  const focusVisible = () => {
    if (!visibleCells.length) return;
    const padding = 60;
    const minX = Math.max(0, Math.min(...visibleCells.map((cell) => cell.mapX)) - padding);
    const maxX = Math.min(width, Math.max(...visibleCells.map((cell) => cell.mapX)) + padding);
    const minY = Math.max(0, Math.min(...visibleCells.map((cell) => cell.mapY)) - padding);
    const maxY = Math.min(height, Math.max(...visibleCells.map((cell) => cell.mapY)) + padding);
    setMapViewBox(
      clampViewBox(
        {
          minX,
          minY,
          width: Math.max(240, maxX - minX),
          height: Math.max(180, maxY - minY),
        },
        width,
        height,
      ),
    );
  };

  const resetView = () => setMapViewBox({ minX: 0, minY: 0, width, height });

  const profileOptions = useMemo(
    () => ["all", ...Object.keys(metadata.profile_counts).sort((a, b) => a.localeCompare(b))],
    [metadata.profile_counts],
  );

  const maxSettlementPopulation = Math.max(1, ...visibleSettlements.map((settlement) => settlement.urbanPopulation || 1));

  const settlementFill = (settlement: SettlementMarker) => {
    const norm = Math.log10(Math.max(settlement.urbanPopulation, 1)) / Math.log10(maxSettlementPopulation + 1);
    const saturation = Math.round(18 + 82 * Math.min(1, Math.max(0, norm)));
    const hue = settlement.isCapital ? 41 : settlement.isPort ? 205 : 24;
    const lightness = settlement.isCapital ? 52 : settlement.isPort ? 58 : 60;
    return `hsl(${hue} ${saturation}% ${lightness}%)`;
  };

  return (
    <section className="grid gap-6 xl:grid-cols-[360px_minmax(0,1fr)]">
      <div className="space-y-4">
        <div className="wiki-box p-4">
          <div className="text-xs uppercase tracking-[0.24em] text-amber-700">Traversal Substrate</div>
          <div className="mt-2 text-sm text-[var(--codex-muted)]">{description}</div>
          <div className="mt-3 grid gap-2 text-sm">
            <div className="rounded border border-[var(--codex-line)] px-3 py-2">
              <div className="text-xs uppercase tracking-[0.18em] text-amber-700">Cells</div>
              <div className="mt-1 font-medium text-[var(--codex-heading)]">{metadata.cell_count}</div>
            </div>
            <div className="rounded border border-[var(--codex-line)] px-3 py-2">
              <div className="text-xs uppercase tracking-[0.18em] text-amber-700">Visible</div>
              <div className="mt-1 font-medium text-[var(--codex-heading)]">{visibleCells.length}</div>
            </div>
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={focusVisible}
              className="rounded border border-amber-700 bg-amber-100 px-3 py-2 text-xs uppercase tracking-[0.18em] text-amber-950"
            >
              Focus Visible
            </button>
            <button
              type="button"
              onClick={resetView}
              className="rounded border border-[var(--codex-line)] px-3 py-2 text-xs uppercase tracking-[0.18em] text-[var(--codex-muted)]"
            >
              Reset View
            </button>
          </div>
        </div>

        <div className="wiki-box p-4">
          <label className="text-xs uppercase tracking-[0.24em] text-amber-700" htmlFor="cell-search">
            Search Cells
          </label>
          <input
            id="cell-search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Cell id, profile, lat, lon"
            className="mt-3 w-full rounded border border-[var(--codex-line)] bg-transparent px-3 py-2 text-sm"
          />
        </div>

        <div className="wiki-box p-4">
          <div className="text-xs uppercase tracking-[0.24em] text-amber-700">Profile Filter</div>
          <div className="mt-3 flex flex-wrap gap-2">
            {profileOptions.map((profile) => (
              <button
                key={profile}
                type="button"
                onClick={() => setSelectedProfile(profile)}
                className={`rounded border px-3 py-2 text-xs uppercase tracking-[0.18em] ${
                  selectedProfile === profile
                    ? "border-amber-700 bg-amber-100 text-amber-950"
                    : "border-[var(--codex-line)] text-[var(--codex-muted)]"
                }`}
              >
                {profile === "all" ? "All" : `${profile} (${metadata.profile_counts[profile] ?? 0})`}
              </button>
            ))}
          </div>
          <label className="mt-4 flex items-center gap-3 text-sm">
            <input type="checkbox" checked={showDots} onChange={(event) => setShowDots(event.target.checked)} />
            <span>Show centroid markers</span>
          </label>
          {overlaySrc ? (
            <label className="mt-4 flex items-center gap-3 text-sm">
              <input type="checkbox" checked={showOverlay} onChange={(event) => setShowOverlay(event.target.checked)} />
              <span>{overlayLabel ?? "Show overlay"}</span>
            </label>
          ) : null}
          {overlaySrc ? (
            <label className="mt-4 grid gap-2 text-sm">
              <span className="text-xs uppercase tracking-[0.18em] text-amber-700">Overlay Opacity</span>
              <input
                type="range"
                min="0.1"
                max="1"
                step="0.01"
                value={overlayOpacity}
                onChange={(event) => setOverlayOpacity(Number(event.target.value))}
              />
              <strong>{overlayOpacity.toFixed(2)}</strong>
            </label>
          ) : null}
          {visibleSettlements.length ? (
            <label className="mt-4 flex items-center gap-3 text-sm">
              <input type="checkbox" checked={showSettlements} onChange={(event) => setShowSettlements(event.target.checked)} />
              <span>Show settlement icons</span>
            </label>
          ) : null}
        </div>

        {selectedCell ? (
          <div className="wiki-box p-4">
            <div className="text-xs uppercase tracking-[0.24em] text-amber-700">Selected Cell</div>
            <div className="mt-3 grid gap-3 md:grid-cols-2">
              <div className="rounded border border-[var(--codex-line)] px-3 py-2">
                <div className="text-xs uppercase tracking-[0.18em] text-amber-700">Cell</div>
                <div className="mt-1 text-sm font-medium text-[var(--codex-heading)]">#{selectedCell.cellId}</div>
              </div>
              <div className="rounded border border-[var(--codex-line)] px-3 py-2">
                <div className="text-xs uppercase tracking-[0.18em] text-amber-700">Profile</div>
                <div className="mt-1 text-sm">{selectedCell.traversalProfile}</div>
              </div>
              <div className="rounded border border-[var(--codex-line)] px-3 py-2">
                <div className="text-xs uppercase tracking-[0.18em] text-amber-700">Score</div>
                <div className="mt-1 text-sm">{selectedCell.traversalScore.toFixed(2)}</div>
              </div>
              <div className="rounded border border-[var(--codex-line)] px-3 py-2">
                <div className="text-xs uppercase tracking-[0.18em] text-amber-700">Lat / Lon</div>
                <div className="mt-1 text-sm">
                  {selectedCell.centroidLat.toFixed(3)}, {selectedCell.centroidLon.toFixed(3)}
                </div>
              </div>
              <div className="rounded border border-[var(--codex-line)] px-3 py-2">
                <div className="text-xs uppercase tracking-[0.18em] text-amber-700">Elevation</div>
                <div className="mt-1 text-sm">{selectedCell.meanElevationM.toFixed(1)} m</div>
              </div>
              <div className="rounded border border-[var(--codex-line)] px-3 py-2">
                <div className="text-xs uppercase tracking-[0.18em] text-amber-700">Slope</div>
                <div className="mt-1 text-sm">{selectedCell.meanSlopeDeg.toFixed(2)} deg</div>
              </div>
              <div className="rounded border border-[var(--codex-line)] px-3 py-2">
                <div className="text-xs uppercase tracking-[0.18em] text-amber-700">Ruggedness</div>
                <div className="mt-1 text-sm">{selectedCell.ruggednessM.toFixed(1)} m</div>
              </div>
              <div className="rounded border border-[var(--codex-line)] px-3 py-2">
                <div className="text-xs uppercase tracking-[0.18em] text-amber-700">Coast Dist</div>
                <div className="mt-1 text-sm">{selectedCell.coastDistanceKm.toFixed(1)} km</div>
              </div>
            </div>
          </div>
        ) : null}

        {selectedSettlement ? (
          <div className="wiki-box p-4">
            <div className="text-xs uppercase tracking-[0.24em] text-amber-700">Selected Settlement</div>
            <div className="mt-3 grid gap-3 md:grid-cols-2">
              <div className="rounded border border-[var(--codex-line)] px-3 py-2">
                <div className="text-xs uppercase tracking-[0.18em] text-amber-700">Settlement</div>
                <div className="mt-1 text-sm font-medium text-[var(--codex-heading)]">#{selectedSettlement.settlementId + 1}</div>
              </div>
              <div className="rounded border border-[var(--codex-line)] px-3 py-2">
                <div className="text-xs uppercase tracking-[0.18em] text-amber-700">Class</div>
                <div className="mt-1 text-sm">{selectedSettlement.rankClass}</div>
              </div>
              <div className="rounded border border-[var(--codex-line)] px-3 py-2">
                <div className="text-xs uppercase tracking-[0.18em] text-amber-700">Urban Pop</div>
                <div className="mt-1 text-sm">{selectedSettlement.urbanPopulation.toFixed(0)}</div>
              </div>
              <div className="rounded border border-[var(--codex-line)] px-3 py-2">
                <div className="text-xs uppercase tracking-[0.18em] text-amber-700">Role</div>
                <div className="mt-1 text-sm">
                  {selectedSettlement.isCapital ? "Capital" : selectedSettlement.isPort ? "Port" : "Settlement"}
                </div>
              </div>
            </div>
          </div>
        ) : null}
      </div>

      <div className="wiki-box p-4">
        <div className="mb-4 text-sm text-[var(--codex-muted)]">
          Wheel to zoom, drag to pan, and click a centroid to inspect a cell.
        </div>
        <div className="overflow-hidden rounded border border-[var(--codex-line)] bg-[#d7e0e8]">
          <svg
            ref={svgRef}
            viewBox={`${mapViewBox.minX} ${mapViewBox.minY} ${mapViewBox.width} ${mapViewBox.height}`}
            className="block h-[78vh] min-h-[720px] w-full cursor-grab active:cursor-grabbing"
            onWheel={handleWheel}
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onPointerLeave={handlePointerUp}
            role="img"
            aria-label="Traversal cell map"
          >
            <rect x={0} y={0} width={width} height={height} fill="#dde6ef" />
            <image href={basemapSrc} x={0} y={0} width={width} height={height} preserveAspectRatio="none" />
            {overlaySrc && showOverlay ? (
              <image
                href={overlaySrc}
                x={0}
                y={0}
                width={width}
                height={height}
                preserveAspectRatio="none"
                opacity={overlayOpacity}
              />
            ) : null}
            {visibleSettlements.length && showSettlements
              ? visibleSettlements.map((settlement) => {
                  const selected = selectedSettlementId === settlement.settlementId;
                  const norm = Math.log10(Math.max(settlement.urbanPopulation, 1)) / Math.log10(maxSettlementPopulation + 1);
                  const radius = settlement.isCapital
                    ? 8 + norm * 5.5
                    : settlement.isPort
                      ? 7 + norm * 4.2
                      : 5 + norm * 3.2;
                  const fill = settlementFill(settlement);
                  const x = settlement.x;
                  const y = settlement.y;
                  if (settlement.isPort) {
                    return (
                      <g
                        key={settlement.settlementId}
                        onClick={() => setSelectedSettlementId(settlement.settlementId)}
                        style={{ cursor: "pointer" }}
                      >
                        <path
                          d={`M ${x} ${y - radius} L ${x + radius} ${y} L ${x} ${y + radius} L ${x - radius} ${y} Z`}
                          fill={fill}
                          stroke={selected ? "#1f1f1f" : "rgba(35,31,24,0.78)"}
                          strokeWidth={selected ? 2.4 : 1.1}
                        />
                        {settlement.isCapital ? (
                          <circle cx={x} cy={y} r={radius + 4} fill="none" stroke="#cda65a" strokeWidth={1.5} />
                        ) : null}
                        <text x={x + radius + 4} y={y - radius - 2} fontSize="14" fontWeight={selected ? 700 : 500} fill="#2b2015">
                          {settlement.settlementId + 1}
                        </text>
                      </g>
                    );
                  }
                  return (
                    <g
                      key={settlement.settlementId}
                      onClick={() => setSelectedSettlementId(settlement.settlementId)}
                      style={{ cursor: "pointer" }}
                    >
                      <circle
                        cx={x}
                        cy={y}
                        r={radius}
                        fill={fill}
                        stroke={selected ? "#1f1f1f" : "rgba(35,31,24,0.78)"}
                        strokeWidth={selected ? 2.4 : 1.1}
                      />
                      {settlement.isCapital ? (
                        <circle cx={x} cy={y} r={radius + 4} fill="none" stroke="#cda65a" strokeWidth={1.5} />
                      ) : null}
                      <text x={x + radius + 4} y={y - radius - 2} fontSize="14" fontWeight={selected ? 700 : 500} fill="#2b2015">
                        {settlement.settlementId + 1}
                      </text>
                    </g>
                  );
                })
              : null}
            {showDots
              ? visibleCells.map((cell) => {
                  const isSelected = selectedCellId === cell.cellId;
                  const fill = PROFILE_COLORS[cell.traversalProfile] ?? "#f2e4ba";
                  return (
                    <circle
                      key={cell.cellId}
                      cx={cell.mapX}
                      cy={cell.mapY}
                      r={isSelected ? 7 : 3.8}
                      fill={fill}
                      stroke={isSelected ? "#1f1f1f" : "rgba(35,31,24,0.48)"}
                      strokeWidth={isSelected ? 2.2 : 0.8}
                      onClick={() => setSelectedCellId(cell.cellId)}
                      style={{ cursor: "pointer" }}
                    />
                  );
                })
              : null}
          </svg>
        </div>
      </div>
    </section>
  );
}
