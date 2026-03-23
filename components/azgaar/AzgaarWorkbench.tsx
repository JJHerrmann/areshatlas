"use client";

import { useDeferredValue, useEffect, useMemo, useRef, useState } from "react";

type MapMetadata = {
  version: string | null;
  source: string | null;
  saveDate: string | null;
  width: number;
  height: number;
  worldName: string | null;
  distanceUnit: string | null;
  distanceScale: number | null;
};

type MapBox = {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
};

type ViewBox = {
  minX: number;
  minY: number;
  width: number;
  height: number;
};

type MapState = {
  id: number;
  name: string;
  fullName: string;
  form: string | null;
  type: string | null;
  color: string | null;
  capitalId: number | null;
  center: [number, number] | null;
  pole: [number, number] | null;
  cells: number;
  burgCount: number;
  cultureId: number | null;
  expansionism: number | null;
  neighbors: number[];
  bbox: MapBox | null;
};

type MapProvince = {
  id: number;
  name: string;
  fullName: string;
  stateId: number;
  burgId: number | null;
  center: [number, number] | null;
  pole: [number, number] | null;
  color: string | null;
  formName: string | null;
};

type MapBurg = {
  id: number;
  name: string;
  stateId: number;
  provinceId: number | null;
  provinceName: string | null;
  cultureId: number;
  featureId: number | null;
  cell: number;
  x: number;
  y: number;
  capital: boolean;
  port: boolean;
  population: number;
  type: string | null;
  group: string | null;
  walls: boolean;
  citadel: boolean;
  temple: boolean;
};

type MapRoute = {
  id: number;
  group: string;
  featureId: number | null;
  pointCount: number;
  points: [number, number][];
};

type AzgaarMapData = {
  metadata: MapMetadata;
  paths: {
    statesBody: string | null;
    provinceBorders: string | null;
    stateBorders: string | null;
  };
  states: MapState[];
  provinces: MapProvince[];
  burgs: MapBurg[];
  routes: MapRoute[];
};

const EMPTY_MAP_DATA: AzgaarMapData = {
  metadata: {
    version: null,
    source: null,
    saveDate: null,
    width: 3023,
    height: 1562,
    worldName: null,
    distanceUnit: null,
    distanceScale: null,
  },
  paths: {
    statesBody: null,
    provinceBorders: null,
    stateBorders: null,
  },
  states: [],
  provinces: [],
  burgs: [],
  routes: [],
};

type TableKey = "states" | "provinces" | "burgs" | "routes";

const TABLE_LABELS: Record<TableKey, string> = {
  states: "States",
  provinces: "Provinces",
  burgs: "Settlements",
  routes: "Routes",
};

function routeToPath(points: [number, number][]) {
  return points
    .map(([x, y], index) => `${index === 0 ? "M" : "L"}${x.toFixed(2)},${y.toFixed(2)}`)
    .join(" ");
}

function routeTouchesBox(route: MapRoute, box: MapBox, padding = 0) {
  return route.points.some(
    ([x, y]) =>
      x >= box.minX - padding &&
      x <= box.maxX + padding &&
      y >= box.minY - padding &&
      y <= box.maxY + padding,
  );
}

function expandBox(box: MapBox, width: number, height: number, padding: number): MapBox {
  return {
    minX: Math.max(0, Math.floor(box.minX - padding)),
    minY: Math.max(0, Math.floor(box.minY - padding)),
    maxX: Math.min(width, Math.ceil(box.maxX + padding)),
    maxY: Math.min(height, Math.ceil(box.maxY + padding)),
  };
}

function boxToViewBox(box: MapBox): ViewBox {
  return {
    minX: box.minX,
    minY: box.minY,
    width: Math.max(1, box.maxX - box.minX),
    height: Math.max(1, box.maxY - box.minY),
  };
}

function clampViewBox(viewBox: ViewBox, bounds: ViewBox): ViewBox {
  const width = Math.min(Math.max(1, viewBox.width), bounds.width);
  const height = Math.min(Math.max(1, viewBox.height), bounds.height);
  const maxX = bounds.minX + bounds.width - width;
  const maxY = bounds.minY + bounds.height - height;

  return {
    minX: Math.min(Math.max(bounds.minX, viewBox.minX), maxX),
    minY: Math.min(Math.max(bounds.minY, viewBox.minY), maxY),
    width,
    height,
  };
}

function summarizeRecord(table: TableKey, record: Record<string, unknown>) {
  if (table === "states") return `${record.fullName || record.name}`;
  if (table === "provinces") return `${record.fullName || record.name}`;
  if (table === "burgs") return `${record.name}`;
  return `${record.group || "route"} #${record.id}`;
}

function valueMatchesSearch(value: unknown, search: string): boolean {
  if (!search) return true;
  if (value == null) return false;
  return String(value).toLowerCase().includes(search);
}

function getRecordId(record: Record<string, unknown>) {
  const value = record.id;
  return typeof value === "number" ? value : Number(value);
}

const DATA_URL = "/azgaar/areshnaat-map-data.json";
const RAW_SVG_URL = "/azgaar/areshnaat-world-raw.svg";

export default function AzgaarWorkbench({ initialData }: { initialData?: AzgaarMapData }) {
  const svgRef = useRef<SVGSVGElement | null>(null);
  const isPanningRef = useRef(false);
  const panStartRef = useRef<{ clientX: number; clientY: number; viewBox: ViewBox } | null>(null);
  const [draftData, setDraftData] = useState<AzgaarMapData | null>(initialData ?? null);
  const [loading, setLoading] = useState(!initialData);
  const [loadError, setLoadError] = useState("");
  const [selectedTable, setSelectedTable] = useState<TableKey>("states");
  const [selectedStateId, setSelectedStateId] = useState<number | "all">("all");
  const [search, setSearch] = useState("");
  const [selectedRecordId, setSelectedRecordId] = useState<number | null>(initialData?.states[0]?.id ?? null);
  const [editorText, setEditorText] = useState("");
  const [editorError, setEditorError] = useState("");
  const [mapViewBox, setMapViewBox] = useState<ViewBox | null>(null);
  const deferredSearch = useDeferredValue(search.trim().toLowerCase());

  useEffect(() => {
    if (initialData || draftData) return;

    let cancelled = false;

    async function loadData() {
      setLoading(true);
      setLoadError("");
      try {
        const response = await fetch(DATA_URL, { cache: "no-store" });
        if (!response.ok) {
          throw new Error(`Map data request failed with ${response.status}. Run npm run map:extract first.`);
        }

        const data = (await response.json()) as AzgaarMapData;
        if (cancelled) return;
        setDraftData(data);
        setSelectedRecordId(data.states[0]?.id ?? null);
      } catch (error) {
        if (cancelled) return;
        setLoadError(
          error instanceof Error ? error.message : "Could not load the extracted Azgaar map data.",
        );
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void loadData();

    return () => {
      cancelled = true;
    };
  }, [draftData, initialData]);

  useEffect(() => {
    if (!draftData) {
      setEditorText("");
      return;
    }
    if (selectedRecordId == null) {
      setSelectedRecordId(draftData.states[0]?.id ?? null);
    }
  }, [draftData, selectedRecordId]);
  const data = draftData ?? EMPTY_MAP_DATA;

  const stateById = useMemo(
    () => new Map(data.states.map((item) => [item.id, item])),
    [data.states],
  );

  const visibleState = selectedStateId === "all" ? null : stateById.get(selectedStateId) ?? null;
  const activeViewBox = useMemo(() => {
    if (visibleState?.bbox) {
      return expandBox(visibleState.bbox, data.metadata.width, data.metadata.height, 120);
    }
    return {
      minX: 0,
      minY: 0,
      maxX: data.metadata.width,
      maxY: data.metadata.height,
    };
  }, [data.metadata.height, data.metadata.width, visibleState]);
  const viewBounds = useMemo(() => boxToViewBox(activeViewBox), [activeViewBox]);

  useEffect(() => {
    setMapViewBox(viewBounds);
  }, [viewBounds]);

  const currentMapViewBox = mapViewBox ?? viewBounds;

  const visibleRoutes = useMemo(() => {
    return data.routes.filter((route) =>
      visibleState?.bbox ? routeTouchesBox(route, visibleState.bbox, 90) : true,
    );
  }, [data.routes, visibleState]);

  const visibleProvinces = useMemo(() => {
    if (selectedStateId === "all") return data.provinces;
    return data.provinces.filter((province) => province.stateId === selectedStateId);
  }, [data.provinces, selectedStateId]);

  const provinceAnchors = useMemo(() => {
    return visibleProvinces
      .map((province) => ({
        ...province,
        anchor: province.pole ?? province.center,
      }))
      .filter((province): province is MapProvince & { anchor: [number, number] } => Array.isArray(province.anchor));
  }, [visibleProvinces]);

  const filteredRecords = useMemo(() => {
    const stateFilter =
      selectedStateId === "all"
        ? () => true
        : (record: Record<string, unknown>) =>
            record.stateId === selectedStateId || record.id === selectedStateId;

    const textFilter = (record: Record<string, unknown>) =>
      Object.values(record).some((value) => valueMatchesSearch(value, deferredSearch));

    const source = data[selectedTable] as Record<string, unknown>[];
    if (selectedTable === "routes") {
      return source.filter((record) => {
        const route = record as unknown as MapRoute;
        const inState = visibleState?.bbox ? routeTouchesBox(route, visibleState.bbox, 90) : true;
        return inState && textFilter(record);
      });
    }

    return source.filter((record) => stateFilter(record) && textFilter(record));
  }, [data, deferredSearch, selectedStateId, selectedTable, visibleState]);

  const selectedRecord = useMemo(() => {
    return filteredRecords.find((record) => getRecordId(record) === selectedRecordId) ?? filteredRecords[0] ?? null;
  }, [filteredRecords, selectedRecordId]);

  useEffect(() => {
    if (!selectedRecord) {
      setEditorText("");
      return;
    }
    setSelectedRecordId(getRecordId(selectedRecord));
    setEditorText(JSON.stringify(selectedRecord, null, 2));
    setEditorError("");
  }, [selectedRecord, selectedTable]);

  const selectedBurgIds = useMemo(() => {
    if (!selectedRecord) return new Set<number>();
    if (selectedTable === "burgs") return new Set([selectedRecord.id as number]);
    if (selectedTable === "states") {
      return new Set(
        data.burgs.filter((burg) => burg.stateId === (selectedRecord.id as number)).map((burg) => burg.id),
      );
    }
    if (selectedTable === "provinces") {
      return new Set(
        data.burgs.filter((burg) => burg.provinceId === (selectedRecord.id as number)).map((burg) => burg.id),
      );
    }
    return new Set<number>();
  }, [data.burgs, selectedRecord, selectedTable]);

  const selectedRouteId = selectedTable === "routes" && selectedRecord ? (selectedRecord.id as number) : null;
  const selectedProvinceId = selectedTable === "provinces" && selectedRecord ? (selectedRecord.id as number) : null;
  const visibleBurgs = useMemo(() => {
    return data.burgs.filter((burg) => {
      const inState = selectedStateId === "all" ? true : burg.stateId === selectedStateId;
      const inView =
        burg.x >= currentMapViewBox.minX &&
        burg.x <= currentMapViewBox.minX + currentMapViewBox.width &&
        burg.y >= currentMapViewBox.minY &&
        burg.y <= currentMapViewBox.minY + currentMapViewBox.height;
      return inState && inView;
    });
  }, [currentMapViewBox, data.burgs, selectedStateId]);

  const labelBurgs = visibleBurgs.length <= 40 ? visibleBurgs : visibleBurgs.filter((burg) => burg.capital);
  const dirty = selectedRecord ? editorText !== JSON.stringify(selectedRecord, null, 2) : false;

  function applyEditorChanges() {
    if (!selectedRecord) return;
    try {
      const parsed = JSON.parse(editorText) as Record<string, unknown>;
      const targetId = getRecordId(selectedRecord);
      if (getRecordId(parsed) !== targetId) {
        throw new Error("Edited record id must stay the same.");
      }

      setDraftData((current) => {
        if (!current) return current;
        return {
          ...current,
          [selectedTable]: (current[selectedTable] as Record<string, unknown>[]).map((record) =>
            getRecordId(record) === targetId ? parsed : record,
          ),
        };
      });
      setEditorError("");
    } catch (error) {
      setEditorError(error instanceof Error ? error.message : "Invalid JSON");
    }
  }

  function resetEditor() {
    if (!selectedRecord) return;
    setEditorText(JSON.stringify(selectedRecord, null, 2));
    setEditorError("");
  }

  const stats = [
    ["States", data.states.length],
    ["Provinces", data.provinces.length],
    ["Settlements", data.burgs.length],
    ["Routes", data.routes.length],
  ];

  function resetMapView() {
    setMapViewBox(viewBounds);
  }

  function handleMapWheel(event: React.WheelEvent<SVGSVGElement>) {
    event.preventDefault();
    const svg = svgRef.current;
    if (!svg) return;

    const rect = svg.getBoundingClientRect();
    const pointerX = (event.clientX - rect.left) / rect.width;
    const pointerY = (event.clientY - rect.top) / rect.height;
    const zoomFactor = event.deltaY < 0 ? 0.88 : 1.14;

    setMapViewBox((current) => {
      const base = current ?? viewBounds;
      const nextWidth = Math.min(Math.max(base.width * zoomFactor, viewBounds.width * 0.08), viewBounds.width);
      const nextHeight = Math.min(Math.max(base.height * zoomFactor, viewBounds.height * 0.08), viewBounds.height);
      const focusX = base.minX + base.width * pointerX;
      const focusY = base.minY + base.height * pointerY;
      return clampViewBox(
        {
          minX: focusX - nextWidth * pointerX,
          minY: focusY - nextHeight * pointerY,
          width: nextWidth,
          height: nextHeight,
        },
        viewBounds,
      );
    });
  }

  function handlePointerDown(event: React.PointerEvent<SVGSVGElement>) {
    if (event.button !== 0) return;
    const svg = svgRef.current;
    if (!svg) return;
    isPanningRef.current = true;
    panStartRef.current = {
      clientX: event.clientX,
      clientY: event.clientY,
      viewBox: currentMapViewBox,
    };
    svg.setPointerCapture(event.pointerId);
  }

  function handlePointerMove(event: React.PointerEvent<SVGSVGElement>) {
    const start = panStartRef.current;
    const svg = svgRef.current;
    if (!isPanningRef.current || !start || !svg) return;

    const rect = svg.getBoundingClientRect();
    const deltaX = ((event.clientX - start.clientX) / rect.width) * start.viewBox.width;
    const deltaY = ((event.clientY - start.clientY) / rect.height) * start.viewBox.height;

    setMapViewBox(
      clampViewBox(
        {
          minX: start.viewBox.minX - deltaX,
          minY: start.viewBox.minY - deltaY,
          width: start.viewBox.width,
          height: start.viewBox.height,
        },
        viewBounds,
      ),
    );
  }

  function handlePointerUp(event: React.PointerEvent<SVGSVGElement>) {
    const svg = svgRef.current;
    isPanningRef.current = false;
    panStartRef.current = null;
    if (svg?.hasPointerCapture(event.pointerId)) {
      svg.releasePointerCapture(event.pointerId);
    }
  }

  if (loading || !draftData) {
    return (
      <main className="wiki-main-page prototype-workbench-page">
        <div className="wiki-content prototype-workbench-content">
          <article className="wiki-article prototype-workbench-article">
            <div className="wiki-article-header">
              <div className="wiki-kicker">Prototype</div>
              <h1 className="wiki-title">Azgaar Raw Table Workbench</h1>
              <p className="wiki-subtitle">
                Loading the extracted Azgaar data and world SVG from the local repo assets.
              </p>
            </div>

            <div className="wiki-box p-4">
              <div className="text-sm text-[var(--codex-muted)]">Loading map data...</div>
            </div>
          </article>
        </div>
      </main>
    );
  }

  if (loadError) {
    return (
      <main className="wiki-main-page prototype-workbench-page">
        <div className="wiki-content prototype-workbench-content">
          <article className="wiki-article prototype-workbench-article">
            <div className="wiki-article-header">
              <div className="wiki-kicker">Prototype</div>
              <h1 className="wiki-title">Azgaar Raw Table Workbench</h1>
              <p className="wiki-subtitle">
                The extracted Azgaar data file is missing or unreadable. Generate the repo-local JSON and SVG first.
              </p>
            </div>

            <div className="wiki-box p-4">
              <div className="text-sm text-red-700 dark:text-red-300">{loadError}</div>
              <pre className="mt-3 overflow-auto text-sm text-[var(--codex-heading)]">npm run map:extract</pre>
            </div>
          </article>
        </div>
      </main>
    );
  }

  return (
    <main className="wiki-main-page prototype-workbench-page">
      <div className="wiki-content prototype-workbench-content">
        <article className="wiki-article prototype-workbench-article">
          <div className="wiki-article-header">
            <div className="wiki-kicker">Prototype</div>
            <h1 className="wiki-title">Azgaar Raw Table Workbench</h1>
            <p className="wiki-subtitle">
              Repo-local extracted data, raw record editing, and a live map view that renders from the JSON
              instead of depending on Azgaar to stay interactive at world scale.
            </p>
          </div>

          <div className="grid gap-4 md:grid-cols-4">
            {stats.map(([label, value]) => (
              <div key={label} className="wiki-box px-4 py-3">
                <div className="text-xs uppercase tracking-[0.24em] text-amber-700">{label}</div>
                <div className="mt-1 text-2xl font-semibold text-[var(--codex-heading)]">{value}</div>
              </div>
            ))}
          </div>

          <div className="wiki-box mt-4 p-4">
            <div className="flex flex-wrap items-center gap-3 text-sm">
              <a className="wiki-map-link" href="/azgaar/areshnaat-map-data.json" target="_blank" rel="noreferrer">
                Raw JSON
              </a>
              <a className="wiki-map-link" href="/azgaar/areshnaat-world-raw.svg" target="_blank" rel="noreferrer">
                Raw World SVG
              </a>
              <span className="text-[var(--codex-muted)]">
                {data.metadata.worldName || "Areshnaat"} · {data.metadata.width} × {data.metadata.height}
                {data.metadata.distanceUnit ? ` · ${data.metadata.distanceUnit}` : ""}
              </span>
            </div>
          </div>

          <section className="mt-6 grid gap-6 xl:grid-cols-[minmax(340px,1fr)_minmax(0,3fr)]">
            <div className="space-y-4">
              <div className="wiki-box p-4">
                <div className="grid gap-3 md:grid-cols-[1fr_220px] xl:grid-cols-1">
                  <div>
                    <div className="text-xs uppercase tracking-[0.24em] text-amber-700">Table</div>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {(Object.keys(TABLE_LABELS) as TableKey[]).map((table) => (
                        <button
                          key={table}
                          type="button"
                          className={`rounded border px-3 py-2 text-xs uppercase tracking-[0.18em] ${
                            selectedTable === table
                              ? "border-amber-700 bg-amber-100 text-amber-950"
                              : "border-[var(--codex-line)] text-[var(--codex-muted)]"
                          }`}
                          onClick={() => setSelectedTable(table)}
                        >
                          {TABLE_LABELS[table]}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="text-xs uppercase tracking-[0.24em] text-amber-700" htmlFor="stateFilter">
                      State Filter
                    </label>
                    <select
                      id="stateFilter"
                      className="mt-2 w-full rounded border border-[var(--codex-line)] bg-transparent px-3 py-2 text-sm"
                      value={selectedStateId}
                      onChange={(event) =>
                        setSelectedStateId(event.target.value === "all" ? "all" : Number(event.target.value))
                      }
                    >
                      <option value="all">All states</option>
                      {data.states.map((state) => (
                        <option key={state.id} value={state.id}>
                          {state.fullName}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="mt-3">
                  <label className="text-xs uppercase tracking-[0.24em] text-amber-700" htmlFor="recordSearch">
                    Search
                  </label>
                  <input
                    id="recordSearch"
                    type="text"
                    value={search}
                    onChange={(event) => setSearch(event.target.value)}
                    placeholder={`Filter ${TABLE_LABELS[selectedTable].toLowerCase()}...`}
                    className="mt-2 w-full rounded border border-[var(--codex-line)] bg-transparent px-3 py-2 text-sm"
                  />
                </div>
              </div>

              <div className="wiki-box overflow-hidden">
                <div className="border-b border-[var(--codex-line)] px-4 py-3 text-xs uppercase tracking-[0.24em] text-amber-700">
                  {TABLE_LABELS[selectedTable]} ({filteredRecords.length})
                </div>
                <div className="max-h-[420px] overflow-auto">
                  {filteredRecords.map((record) => {
                    const recordId = getRecordId(record);
                    const selected = recordId === getRecordId(selectedRecord || {});
                    return (
                      <button
                        key={`${selectedTable}-${recordId}`}
                        type="button"
                        onClick={() => setSelectedRecordId(recordId)}
                        className={`flex w-full items-start justify-between gap-3 border-b border-[var(--codex-line)] px-4 py-3 text-left ${
                          selected ? "bg-amber-100/60" : "hover:bg-amber-50/40"
                        }`}
                      >
                        <div>
                          <div className="font-medium text-[var(--codex-heading)]">
                            {summarizeRecord(selectedTable, record)}
                          </div>
                          <div className="mt-1 text-xs uppercase tracking-[0.18em] text-[var(--codex-muted)]">
                            #{recordId}
                          </div>
                        </div>
                        {selectedTable !== "routes" && "stateId" in record && record.stateId ? (
                          <div className="text-xs text-[var(--codex-muted)]">
                            {stateById.get(Number(record.stateId))?.name || `State ${record.stateId}`}
                          </div>
                        ) : null}
                      </button>
                    );
                  })}
                  {!filteredRecords.length ? (
                    <div className="px-4 py-6 text-sm text-[var(--codex-muted)]">No records match the current filter.</div>
                  ) : null}
                </div>
              </div>

              <div className="wiki-box p-4">
                <div className="flex items-center justify-between gap-3">
                  <div className="text-xs uppercase tracking-[0.24em] text-amber-700">Selected Record JSON</div>
                  <div className="text-xs uppercase tracking-[0.18em] text-[var(--codex-muted)]">
                    {dirty ? "Unsaved local changes" : "In sync"}
                  </div>
                </div>
                <textarea
                  value={editorText}
                  onChange={(event) => setEditorText(event.target.value)}
                  spellCheck={false}
                  className="mt-3 min-h-[340px] w-full rounded border border-[var(--codex-line)] bg-[#f7f0dd] p-3 font-mono text-xs leading-6 text-stone-900 dark:bg-[#111822] dark:text-stone-100"
                />
                {editorError ? <div className="mt-2 text-sm text-red-700">{editorError}</div> : null}
                <div className="mt-3 flex gap-3">
                  <button
                    type="button"
                    onClick={applyEditorChanges}
                    className="rounded border border-amber-700 bg-amber-100 px-3 py-2 text-xs uppercase tracking-[0.18em] text-amber-950"
                  >
                    Apply Local Edit
                  </button>
                  <button
                    type="button"
                    onClick={resetEditor}
                    className="rounded border border-[var(--codex-line)] px-3 py-2 text-xs uppercase tracking-[0.18em] text-[var(--codex-muted)]"
                  >
                    Reset
                  </button>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <div className="wiki-box p-4">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <div className="text-xs uppercase tracking-[0.24em] text-amber-700">Map View</div>
                    <div className="mt-1 text-sm text-[var(--codex-muted)]">
                      {visibleState
                        ? `${visibleState.fullName} window`
                        : `${data.metadata.worldName || "World"} overview`}
                    </div>
                  </div>
                  <div className="text-xs uppercase tracking-[0.18em] text-[var(--codex-muted)]">
                    Generated from extracted JSON
                  </div>
                </div>
                <div className="mt-3 flex flex-wrap items-center gap-3 text-xs uppercase tracking-[0.18em] text-[var(--codex-muted)]">
                  <button
                    type="button"
                    onClick={resetMapView}
                    className="rounded border border-[var(--codex-line)] px-3 py-2"
                  >
                    Reset View
                  </button>
                  <span>Wheel: zoom</span>
                  <span>Drag: pan</span>
                </div>

                <div className="mt-4 overflow-hidden rounded border border-[var(--codex-line)] bg-[#d7e0e8]">
                  <svg
                    ref={svgRef}
                    viewBox={`${currentMapViewBox.minX} ${currentMapViewBox.minY} ${currentMapViewBox.width} ${currentMapViewBox.height}`}
                    className="block h-[78vh] min-h-[720px] w-full cursor-grab active:cursor-grabbing"
                    role="img"
                    aria-label="Areshnaat extracted map view"
                    onWheel={handleMapWheel}
                    onPointerDown={handlePointerDown}
                    onPointerMove={handlePointerMove}
                    onPointerUp={handlePointerUp}
                    onPointerLeave={handlePointerUp}
                  >
                    <rect
                      x={0}
                      y={0}
                      width={data.metadata.width}
                      height={data.metadata.height}
                      fill="#dde6ef"
                    />
                    <image
                      href={RAW_SVG_URL}
                      x={0}
                      y={0}
                      width={data.metadata.width}
                      height={data.metadata.height}
                      preserveAspectRatio="none"
                    />
                    {data.paths.provinceBorders ? (
                      <path
                        d={data.paths.provinceBorders}
                        fill="none"
                        stroke="#6f5a37"
                        strokeWidth="0.75"
                        strokeOpacity="0.64"
                        strokeDasharray="0 3"
                        strokeLinecap="round"
                      />
                    ) : null}
                    {data.paths.stateBorders ? (
                      <path
                        d={data.paths.stateBorders}
                        fill="none"
                        stroke="#2f2218"
                        strokeWidth="1.45"
                        strokeOpacity="0.94"
                        strokeLinecap="round"
                      />
                    ) : null}

                    {visibleRoutes.map((route) => {
                      const isSelected = route.id === selectedRouteId;
                      const stroke =
                        route.group === "searoutes"
                          ? "#48729d"
                          : route.group === "trails"
                            ? "#7d6646"
                            : "#a35d2f";
                      const dasharray =
                        route.group === "searoutes"
                          ? "4 5"
                          : route.group === "trails"
                            ? "2 3"
                            : "3 1.5";
                      return (
                        <path
                          key={route.id}
                          d={routeToPath(route.points)}
                          fill="none"
                          stroke={stroke}
                          strokeWidth={isSelected ? 2.8 : route.group === "roads" ? 1.2 : 0.9}
                          strokeOpacity={isSelected ? 0.98 : 0.82}
                          strokeDasharray={dasharray}
                        />
                      );
                    })}

                    {visibleBurgs.map((burg) => {
                      const selected = selectedBurgIds.has(burg.id);
                      return (
                        <g key={burg.id}>
                          <circle
                            cx={burg.x}
                            cy={burg.y}
                            r={burg.capital ? 5.6 : 3.8}
                            fill={burg.capital ? "#d0a85b" : "#f3efe3"}
                            stroke={selected ? "#4f1d0f" : "#433226"}
                            strokeWidth={selected ? 2.4 : 1.2}
                          />
                        </g>
                      );
                    })}

                    {labelBurgs.map((burg) => (
                      <text
                        key={`label-${burg.id}`}
                        x={burg.x + 8}
                        y={burg.y - 8}
                        fontFamily="Times New Roman, Times, serif"
                        fontSize="12"
                        fontWeight={burg.capital ? 700 : 400}
                        fill="#312417"
                      >
                        {burg.name}
                      </text>
                    ))}

                    {provinceAnchors.map((province) => {
                      const [x, y] = province.anchor;
                      const selected = province.id === selectedProvinceId;
                      const stroke = province.color || "#8c7848";
                      return (
                        <g key={`province-anchor-${province.id}`}>
                          <circle
                            cx={x}
                            cy={y}
                            r={selected ? 9 : 6}
                            fill={stroke}
                            fillOpacity={selected ? 0.32 : 0.18}
                            stroke={stroke}
                            strokeWidth={selected ? 2.2 : 1.2}
                            strokeOpacity={0.9}
                            strokeDasharray={selected ? undefined : "2 2"}
                          />
                          <text
                            x={x + 10}
                            y={y - 10}
                            fontFamily="Raleway, Arial, sans-serif"
                            fontSize="11"
                            fontWeight={selected ? 700 : 500}
                            fill={selected ? "#2a1a10" : stroke}
                          >
                            {province.name}
                          </text>
                        </g>
                      );
                    })}
                  </svg>
                </div>
              </div>

              <div className="wiki-box p-4">
                <div className="text-xs uppercase tracking-[0.24em] text-amber-700">Current Selection</div>
                <div className="mt-2 text-sm text-[var(--codex-muted)]">
                  {selectedRecord
                    ? `${TABLE_LABELS[selectedTable].slice(0, -1)} #${getRecordId(selectedRecord)}`
                    : "No active record"}
                </div>
                <div className="mt-3 grid gap-2 md:grid-cols-2">
                  <div className="rounded border border-[var(--codex-line)] px-3 py-2">
                    <div className="text-xs uppercase tracking-[0.18em] text-amber-700">Source Save</div>
                    <div className="mt-1 text-sm">{data.metadata.source}</div>
                  </div>
                  <div className="rounded border border-[var(--codex-line)] px-3 py-2">
                    <div className="text-xs uppercase tracking-[0.18em] text-amber-700">Scale</div>
                    <div className="mt-1 text-sm">
                      {data.metadata.distanceScale || "?"} {data.metadata.distanceUnit || "units"}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </section>
        </article>
      </div>
    </main>
  );
}
