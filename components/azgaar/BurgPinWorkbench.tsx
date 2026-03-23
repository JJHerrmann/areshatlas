"use client";

import { useDeferredValue, useEffect, useMemo, useRef, useState } from "react";

type BurgRecord = {
  id: number;
  name: string;
  slug: string;
  stateId: number;
  stateName: string;
  provinceId: number | null;
  provinceName: string | null;
  cultureId: number | null;
  featureId: number | null;
  cell: number | null;
  x: number;
  y: number;
  capital: boolean;
  port: boolean;
  population: number | null;
  type: string | null;
  group: string | null;
  walls: boolean;
  citadel: boolean;
  temple: boolean;
  beringiaX: number | null;
  beringiaY: number | null;
  inBeringia: boolean;
};

type ViewBox = {
  minX: number;
  minY: number;
  width: number;
  height: number;
};

type BasemapKey = "azgaar" | "beringia" | "areshArctic";

const WORLD_WIDTH = 3023;
const WORLD_HEIGHT = 1562;
const BERINGIA_WIDTH = 2400;
const BERINGIA_HEIGHT = 1350;
const ARESH_ARCTIC_WIDTH = 4800;
const ARESH_ARCTIC_HEIGHT = 2700;

const WORLD_SVG_URL = "/azgaar/areshnaat-world-raw.svg";
const BERINGIA_DEM_URL =
  "/region-assets/beringia_pipeline_locked_16x9/beringia_locked_16x9_west_up_sl62_color_reference.png";
const ARESH_ARCTIC_REFERENCE_URL =
  "/region-assets/aresh_arctic_azgaar_crop/aresh_arctic_16x9_topobathy_current_coast_reference_cities.png";
const BERINGIA_IS_ROTATED_FOR_AUDIT = true;

const DEFAULT_STATE_NAMES = [
  "Raamkoda",
  "Xilhuan Altepetl",
  "Emirate of Riagan",
  "Sultanate of Kanchasuyu",
  "Beylik of Lugrancanta",
  "City-state of Saheranahvaria",
  "Marches of Petrello",
  "Nekosdamkoda",
];

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

export default function BurgPinWorkbench({ burgs }: { burgs: BurgRecord[] }) {
  const svgRef = useRef<SVGSVGElement | null>(null);
  const isPanningRef = useRef(false);
  const panStartRef = useRef<{ clientX: number; clientY: number; viewBox: ViewBox } | null>(null);

  const [basemap, setBasemap] = useState<BasemapKey>("beringia");
  const [search, setSearch] = useState("");
  const deferredSearch = useDeferredValue(search.trim().toLowerCase());
  const [selectedBurgId, setSelectedBurgId] = useState<number | null>(null);

  const stateOptions = useMemo(() => {
    const seen = new Map<number, string>();
    for (const burg of burgs) {
      if (!seen.has(burg.stateId)) {
        seen.set(burg.stateId, burg.stateName);
      }
    }
    return Array.from(seen.entries())
      .map(([id, name]) => ({ id, name }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [burgs]);

  const defaultSelectedStates = useMemo(() => {
    const preferred = new Set(
      stateOptions.filter((item) => DEFAULT_STATE_NAMES.includes(item.name)).map((item) => item.id),
    );
    return preferred.size ? preferred : new Set(stateOptions.map((item) => item.id));
  }, [stateOptions]);

  const [selectedStates, setSelectedStates] = useState<Set<number>>(defaultSelectedStates);

  useEffect(() => {
    setSelectedStates(defaultSelectedStates);
  }, [defaultSelectedStates]);

  const currentDimensions =
    basemap === "beringia"
      ? { width: BERINGIA_WIDTH, height: BERINGIA_HEIGHT }
      : basemap === "areshArctic"
        ? { width: ARESH_ARCTIC_WIDTH, height: ARESH_ARCTIC_HEIGHT }
      : { width: WORLD_WIDTH, height: WORLD_HEIGHT };

  const [mapViewBox, setMapViewBox] = useState<ViewBox>({
    minX: 0,
    minY: 0,
    width: BERINGIA_WIDTH,
    height: BERINGIA_HEIGHT,
  });

  useEffect(() => {
    setMapViewBox({
      minX: 0,
      minY: 0,
      width: currentDimensions.width,
      height: currentDimensions.height,
    });
  }, [basemap, currentDimensions.height, currentDimensions.width]);

  const filteredBurgs = useMemo(() => {
    return burgs.filter((burg) => {
      if (!selectedStates.has(burg.stateId)) return false;
      if ((basemap === "beringia" || basemap === "areshArctic") && !burg.inBeringia) return false;
      if (!deferredSearch) return true;
      return [
        burg.name,
        burg.stateName,
        burg.provinceName ?? "",
        burg.type ?? "",
        burg.group ?? "",
        String(burg.id),
      ]
        .join(" ")
        .toLowerCase()
        .includes(deferredSearch);
    });
  }, [basemap, burgs, deferredSearch, selectedStates]);

  const visibleBurgs = useMemo(
    () =>
      filteredBurgs.map((burg, index) => ({
        ...burg,
        pinNumber: index + 1,
        mapX:
          basemap === "beringia"
            ? BERINGIA_IS_ROTATED_FOR_AUDIT
              ? BERINGIA_WIDTH - (burg.beringiaX ?? burg.x)
              : (burg.beringiaX ?? burg.x)
            : basemap === "areshArctic"
              ? (burg.beringiaX ?? burg.x) * (ARESH_ARCTIC_WIDTH / BERINGIA_WIDTH)
            : burg.x,
        mapY:
          basemap === "beringia"
            ? BERINGIA_IS_ROTATED_FOR_AUDIT
              ? BERINGIA_HEIGHT - (burg.beringiaY ?? burg.y)
              : (burg.beringiaY ?? burg.y)
            : basemap === "areshArctic"
              ? (burg.beringiaY ?? burg.y) * (ARESH_ARCTIC_HEIGHT / BERINGIA_HEIGHT)
            : burg.y,
      })),
    [basemap, filteredBurgs],
  );

  const selectedBurg = useMemo(
    () => visibleBurgs.find((burg) => burg.id === selectedBurgId) ?? null,
    [selectedBurgId, visibleBurgs],
  );

  useEffect(() => {
    if (!visibleBurgs.length) {
      setSelectedBurgId(null);
      return;
    }
    if (selectedBurgId == null || !visibleBurgs.some((burg) => burg.id === selectedBurgId)) {
      setSelectedBurgId(visibleBurgs[0]?.id ?? null);
    }
  }, [selectedBurgId, visibleBurgs]);

  useEffect(() => {
    if (!selectedBurg) return;
    setMapViewBox((current) =>
      clampViewBox(
        {
          ...current,
          minX: selectedBurg.mapX - current.width / 2,
          minY: selectedBurg.mapY - current.height / 2,
        },
        currentDimensions.width,
        currentDimensions.height,
      ),
    );
  }, [currentDimensions.height, currentDimensions.width, selectedBurg?.id]);

  const toggleState = (stateId: number) => {
    setSelectedStates((current) => {
      const next = new Set(current);
      if (next.has(stateId)) next.delete(stateId);
      else next.add(stateId);
      return next.size ? next : new Set(current);
    });
  };

  const resetView = () => {
    setMapViewBox({
      minX: 0,
      minY: 0,
      width: currentDimensions.width,
      height: currentDimensions.height,
    });
  };

  const focusVisible = () => {
    if (!visibleBurgs.length) return;
    const padding = 80;
    const minX = Math.max(0, Math.min(...visibleBurgs.map((burg) => burg.mapX)) - padding);
    const maxX = Math.min(currentDimensions.width, Math.max(...visibleBurgs.map((burg) => burg.mapX)) + padding);
    const minY = Math.max(0, Math.min(...visibleBurgs.map((burg) => burg.mapY)) - padding);
    const maxY = Math.min(currentDimensions.height, Math.max(...visibleBurgs.map((burg) => burg.mapY)) + padding);
    setMapViewBox(
      clampViewBox(
        {
          minX,
          minY,
          width: Math.max(240, maxX - minX),
          height: Math.max(180, maxY - minY),
        },
        currentDimensions.width,
        currentDimensions.height,
      ),
    );
  };

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
        currentDimensions.width,
        currentDimensions.height,
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
        currentDimensions.width,
        currentDimensions.height,
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

  return (
    <section className="grid gap-6 xl:grid-cols-[360px_minmax(0,1fr)]">
      <div className="space-y-4">
        <div className="wiki-box p-4">
          <div className="text-xs uppercase tracking-[0.24em] text-amber-700">Burg Audit</div>
          <div className="mt-2 text-sm text-[var(--codex-muted)]">
            Numbered burg pins from the authority CSV, switchable between the raw Azgaar world surface and
            the regional reference crops.
          </div>
          <div className="mt-3 grid gap-2 text-sm">
            <div className="rounded border border-[var(--codex-line)] px-3 py-2">
              <div className="text-xs uppercase tracking-[0.18em] text-amber-700">Visible Pins</div>
              <div className="mt-1 font-medium text-[var(--codex-heading)]">{visibleBurgs.length}</div>
            </div>
            <div className="rounded border border-[var(--codex-line)] px-3 py-2">
              <div className="text-xs uppercase tracking-[0.18em] text-amber-700">Coordinate Space</div>
              <div className="mt-1 font-medium text-[var(--codex-heading)]">
                {currentDimensions.width} x {currentDimensions.height}
              </div>
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
          <label className="text-xs uppercase tracking-[0.24em] text-amber-700" htmlFor="burg-search">
            Search Burgs
          </label>
          <input
            id="burg-search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Name, state, province, type"
            className="mt-3 w-full rounded border border-[var(--codex-line)] bg-transparent px-3 py-2 text-sm"
          />
        </div>

        <div className="wiki-box p-4">
          <div className="text-xs uppercase tracking-[0.24em] text-amber-700">State Filter</div>
          <div className="mt-3 max-h-[240px] overflow-auto pr-1">
            <div className="space-y-2">
              {stateOptions.map((state) => (
                <label key={state.id} className="flex items-start gap-3 text-sm">
                  <input
                    type="checkbox"
                    checked={selectedStates.has(state.id)}
                    onChange={() => toggleState(state.id)}
                    className="mt-1"
                  />
                  <span>{state.name}</span>
                </label>
              ))}
            </div>
          </div>
        </div>

        <div className="wiki-box p-4">
          <div className="text-xs uppercase tracking-[0.24em] text-amber-700">Basemap</div>
          <div className="mt-3 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setBasemap("azgaar")}
              className={`rounded border px-3 py-2 text-xs uppercase tracking-[0.18em] ${
                basemap === "azgaar"
                  ? "border-amber-700 bg-amber-100 text-amber-950"
                  : "border-[var(--codex-line)] text-[var(--codex-muted)]"
              }`}
            >
              Raw Azgaar
            </button>
            <button
              type="button"
              onClick={() => setBasemap("beringia")}
              className={`rounded border px-3 py-2 text-xs uppercase tracking-[0.18em] ${
                basemap === "beringia"
                  ? "border-amber-700 bg-amber-100 text-amber-950"
                  : "border-[var(--codex-line)] text-[var(--codex-muted)]"
              }`}
            >
              Beringia DEM
            </button>
            <button
              type="button"
              onClick={() => setBasemap("areshArctic")}
              className={`rounded border px-3 py-2 text-xs uppercase tracking-[0.18em] ${
                basemap === "areshArctic"
                  ? "border-amber-700 bg-amber-100 text-amber-950"
                  : "border-[var(--codex-line)] text-[var(--codex-muted)]"
              }`}
            >
              Aresh Arctic Ref
            </button>
          </div>
        </div>

        <div className="wiki-box p-4">
          <div className="text-xs uppercase tracking-[0.24em] text-amber-700">Visible Burgs</div>
          <div className="mt-3 max-h-[48vh] overflow-auto border border-[var(--codex-line)]">
            {visibleBurgs.map((burg) => {
              const selected = selectedBurgId === burg.id;
              return (
                <button
                  key={burg.id}
                  type="button"
                  onClick={() => setSelectedBurgId(burg.id)}
                  className={`flex w-full items-start gap-3 border-b border-[var(--codex-line)] px-3 py-3 text-left ${
                    selected ? "bg-amber-100/60" : "hover:bg-amber-50/40"
                  }`}
                >
                  <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-[var(--codex-line)] bg-[#f7f0dd] text-xs font-semibold text-[var(--codex-heading)] dark:bg-[#111822]">
                    {burg.pinNumber}
                  </div>
                  <div className="min-w-0">
                    <div className="font-medium text-[var(--codex-heading)]">{burg.name}</div>
                    <div className="mt-1 text-xs uppercase tracking-[0.14em] text-[var(--codex-muted)]">
                      {burg.stateName}
                    </div>
                    <div className="mt-1 text-xs text-[var(--codex-muted)]">
                      ({burg.x.toFixed(2)}, {burg.y.toFixed(2)}) {burg.type ? `• ${burg.type}` : ""}
                    </div>
                  </div>
                </button>
              );
            })}
            {!visibleBurgs.length ? (
              <div className="px-4 py-6 text-sm text-[var(--codex-muted)]">No burgs match the current filter.</div>
            ) : null}
          </div>
        </div>
      </div>

      <div className="space-y-4">
        <div className="wiki-box p-4">
          <div className="flex items-center justify-between gap-4">
            <div>
              <div className="text-xs uppercase tracking-[0.24em] text-amber-700">Map Window</div>
              <div className="mt-1 text-sm text-[var(--codex-muted)]">
                {basemap === "azgaar"
                  ? "Raw Azgaar world map with numbered CSV pins."
                  : basemap === "beringia"
                    ? "Beringia regional DEM in a 180-degree audit rotation, with pins transformed from Aresh world coordinates through the spherical Earth bridge."
                    : "Archived Aresh Arctic reference plate at native 4800x2700, using the same regional pin projection stretched into that frame for visual comparison only."}{" "}
                Wheel to zoom, drag to pan.
              </div>
            </div>
            <div className="text-xs uppercase tracking-[0.18em] text-[var(--codex-muted)]">
              Selected: {selectedBurg ? `#${selectedBurg.pinNumber} ${selectedBurg.name}` : "None"}
            </div>
          </div>

          <div className="mt-4 overflow-hidden rounded border border-[var(--codex-line)] bg-[#d7e0e8]">
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
              aria-label="Burg audit map"
            >
              <rect x={0} y={0} width={currentDimensions.width} height={currentDimensions.height} fill="#dde6ef" />
              <image
                href={
                  basemap === "azgaar"
                    ? WORLD_SVG_URL
                    : basemap === "beringia"
                      ? BERINGIA_DEM_URL
                      : ARESH_ARCTIC_REFERENCE_URL
                }
                x={0}
                y={0}
                width={currentDimensions.width}
                height={currentDimensions.height}
                preserveAspectRatio="none"
                transform={
                  basemap === "beringia" && BERINGIA_IS_ROTATED_FOR_AUDIT
                    ? `rotate(180 ${currentDimensions.width / 2} ${currentDimensions.height / 2})`
                    : undefined
                }
              />
              {visibleBurgs.map((burg) => {
                const selected = selectedBurgId === burg.id;
                return (
                  <g key={burg.id}>
                    <circle
                      cx={burg.mapX}
                      cy={burg.mapY}
                      r={selected ? 16 : 13}
                      fill={selected ? "#fbe6a2" : "#fff8d7"}
                      stroke={selected ? "#7c2d12" : "#4b5563"}
                      strokeWidth={selected ? 3 : 2}
                    />
                    <text
                      x={burg.mapX}
                      y={burg.mapY + 4}
                      textAnchor="middle"
                      fontFamily="Raleway, Arial, sans-serif"
                      fontSize={selected ? 11 : 10}
                      fontWeight="700"
                      fill="#1f2937"
                    >
                      {burg.pinNumber}
                    </text>
                  </g>
                );
              })}
            </svg>
          </div>
        </div>

        {selectedBurg ? (
          <div className="wiki-box p-4">
            <div className="text-xs uppercase tracking-[0.24em] text-amber-700">Selected Burg</div>
            <div className="mt-3 grid gap-3 md:grid-cols-2">
              <div className="rounded border border-[var(--codex-line)] px-3 py-2">
                <div className="text-xs uppercase tracking-[0.18em] text-amber-700">Name</div>
                <div className="mt-1 text-sm font-medium text-[var(--codex-heading)]">
                  #{selectedBurg.pinNumber} {selectedBurg.name}
                </div>
              </div>
              <div className="rounded border border-[var(--codex-line)] px-3 py-2">
                <div className="text-xs uppercase tracking-[0.18em] text-amber-700">State</div>
                <div className="mt-1 text-sm">{selectedBurg.stateName}</div>
              </div>
              <div className="rounded border border-[var(--codex-line)] px-3 py-2">
                <div className="text-xs uppercase tracking-[0.18em] text-amber-700">Province</div>
                <div className="mt-1 text-sm">{selectedBurg.provinceName || "None"}</div>
              </div>
              <div className="rounded border border-[var(--codex-line)] px-3 py-2">
                <div className="text-xs uppercase tracking-[0.18em] text-amber-700">Coords</div>
                <div className="mt-1 text-sm">
                  world=({selectedBurg.x.toFixed(2)}, {selectedBurg.y.toFixed(2)})
                  {selectedBurg.inBeringia && selectedBurg.beringiaX != null && selectedBurg.beringiaY != null
                    ? ` • beringia=(${selectedBurg.beringiaX.toFixed(2)}, ${selectedBurg.beringiaY.toFixed(2)})`
                    : ""}
                </div>
              </div>
              <div className="rounded border border-[var(--codex-line)] px-3 py-2">
                <div className="text-xs uppercase tracking-[0.18em] text-amber-700">Type</div>
                <div className="mt-1 text-sm">
                  {selectedBurg.type || "Unknown"} {selectedBurg.port ? "• Port" : ""}
                  {selectedBurg.capital ? " • Capital" : ""}
                </div>
              </div>
              <div className="rounded border border-[var(--codex-line)] px-3 py-2">
                <div className="text-xs uppercase tracking-[0.18em] text-amber-700">Population</div>
                <div className="mt-1 text-sm">{selectedBurg.population ?? "?"}</div>
              </div>
            </div>
          </div>
        ) : null}
      </div>
    </section>
  );
}
