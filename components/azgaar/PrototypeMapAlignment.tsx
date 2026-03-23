"use client";

import { useMemo, useRef, useState } from "react";

type Props = {
  topoMapSrc: string;
  coastlineOverlaySrc: string;
  voronoiWorldSrc: string;
  voronoiRegionSrc: string;
  voronoiStateSrc: string;
  azgaarOverlaySrc: string;
};

const INITIAL = {
  scaleX: 0.209,
  scaleY: 0.209,
  offsetX: 62.6,
  offsetY: 36.4,
  opacity: 0.78,
  viewZoom: 4,
};

function formatNumber(value: number, digits = 3) {
  return value.toFixed(digits);
}

export default function PrototypeMapAlignment({
  topoMapSrc,
  coastlineOverlaySrc,
  voronoiWorldSrc,
  voronoiRegionSrc,
  voronoiStateSrc,
  azgaarOverlaySrc,
}: Props) {
  const [scaleX, setScaleX] = useState(INITIAL.scaleX);
  const [scaleY, setScaleY] = useState(INITIAL.scaleY);
  const [offsetX, setOffsetX] = useState(INITIAL.offsetX);
  const [offsetY, setOffsetY] = useState(INITIAL.offsetY);
  const [opacity, setOpacity] = useState(INITIAL.opacity);
  const [viewZoom, setViewZoom] = useState(INITIAL.viewZoom);
  const [isDragging, setIsDragging] = useState(false);
  const dragStartRef = useRef<{
    clientX: number;
    clientY: number;
    offsetX: number;
    offsetY: number;
  } | null>(null);

  const overlayStyle = useMemo(
    () => ({
      opacity,
      transform: `translate(${offsetX}%, ${offsetY}%) scale(${scaleX}, ${scaleY})`,
      transformOrigin: "top left",
    }),
    [offsetX, offsetY, opacity, scaleX, scaleY],
  );

  const activeLevel = viewZoom >= 6 ? "L2 State" : viewZoom >= 3 ? "L1 Region" : "L0 World";
  const worldOpacity = viewZoom < 3 ? 0.72 : 0.18;
  const regionOpacity = viewZoom >= 3 && viewZoom < 6 ? 0.78 : 0.16;
  const stateOpacity = viewZoom >= 6 ? 0.9 : 0.08;

  const transformSummary = `translate(${formatNumber(offsetX, 2)}%, ${formatNumber(offsetY, 2)}%) scale(${formatNumber(scaleX)}, ${formatNumber(scaleY)})`;

  function beginDrag(clientX: number, clientY: number) {
    dragStartRef.current = { clientX, clientY, offsetX, offsetY };
    setIsDragging(true);
  }

  function updateDrag(clientX: number, clientY: number) {
    if (!dragStartRef.current) return;
    const deltaX = clientX - dragStartRef.current.clientX;
    const deltaY = clientY - dragStartRef.current.clientY;
    setOffsetX(dragStartRef.current.offsetX + deltaX / 10);
    setOffsetY(dragStartRef.current.offsetY + deltaY / 10);
  }

  function endDrag() {
    dragStartRef.current = null;
    setIsDragging(false);
  }

  return (
    <section className="prototype-map-layout">
      <div className="wiki-box prototype-map-panel">
        <h2 className="wiki-box-title">Overlay Calibration</h2>
        <p className="wiki-copy">
          This pass is for visual alignment only. Adjust the Azgaar political layer until the coastlines and
          landmass edges match the DEM-derived basemap in the region you care about, then we can bake the
          resulting transform into the generator.
        </p>
        <div className="prototype-map-controls">
          <label className="prototype-map-control">
            <span>Scale X</span>
            <input
              type="range"
              min="0.1"
              max="1.3"
              step="0.001"
              value={scaleX}
              onChange={(event) => setScaleX(Number(event.target.value))}
            />
            <strong>{formatNumber(scaleX)}</strong>
          </label>
          <label className="prototype-map-control">
            <span>Scale Y</span>
            <input
              type="range"
              min="0.1"
              max="1.3"
              step="0.001"
              value={scaleY}
              onChange={(event) => setScaleY(Number(event.target.value))}
            />
            <strong>{formatNumber(scaleY)}</strong>
          </label>
          <label className="prototype-map-control">
            <span>Offset X</span>
            <input
              type="range"
              min="-30"
              max="30"
              step="0.05"
              value={offsetX}
              onChange={(event) => setOffsetX(Number(event.target.value))}
            />
            <strong>{formatNumber(offsetX, 2)}%</strong>
          </label>
          <label className="prototype-map-control">
            <span>Offset Y</span>
            <input
              type="range"
              min="-30"
              max="30"
              step="0.05"
              value={offsetY}
              onChange={(event) => setOffsetY(Number(event.target.value))}
            />
            <strong>{formatNumber(offsetY, 2)}%</strong>
          </label>
          <label className="prototype-map-control">
            <span>View Zoom</span>
            <input
              type="range"
              min="1"
              max="8"
              step="0.1"
              value={viewZoom}
              onChange={(event) => setViewZoom(Number(event.target.value))}
            />
            <strong>{formatNumber(viewZoom, 1)}x</strong>
          </label>
          <label className="prototype-map-control">
            <span>Overlay Opacity</span>
            <input
              type="range"
              min="0.1"
              max="1"
              step="0.01"
              value={opacity}
              onChange={(event) => setOpacity(Number(event.target.value))}
            />
            <strong>{formatNumber(opacity, 2)}</strong>
          </label>
        </div>
        <div className="prototype-map-readout">
          <div className="prototype-map-readout-label">Bake This Transform</div>
          <code>{transformSummary}</code>
        </div>
        <button
          type="button"
          className="prototype-map-reset"
          onClick={() => {
            setScaleX(INITIAL.scaleX);
            setScaleY(INITIAL.scaleY);
            setOffsetX(INITIAL.offsetX);
            setOffsetY(INITIAL.offsetY);
            setOpacity(INITIAL.opacity);
            setViewZoom(INITIAL.viewZoom);
          }}
        >
          Reset
        </button>
        <div className="mt-4 flex flex-wrap gap-3 text-sm">
          <a className="wiki-map-link prototype-map-link" href={topoMapSrc} target="_blank" rel="noreferrer">
            Open Topo Image
          </a>
          <a className="wiki-map-link prototype-map-link" href={azgaarOverlaySrc} target="_blank" rel="noreferrer">
            Open State Overlay
          </a>
          <a className="wiki-map-link prototype-map-link" href={voronoiWorldSrc} target="_blank" rel="noreferrer">
            Open L0 Overlay
          </a>
          <a className="wiki-map-link prototype-map-link" href={voronoiRegionSrc} target="_blank" rel="noreferrer">
            Open L1 Overlay
          </a>
          <a className="wiki-map-link prototype-map-link" href={voronoiStateSrc} target="_blank" rel="noreferrer">
            Open L2 Overlay
          </a>
          <a className="wiki-map-link prototype-map-link" href="/prototype">
            Return To Table Workbench
          </a>
        </div>
        <div className="prototype-map-readout">
          <div className="prototype-map-readout-label">Active Voronoi Level</div>
          <code>{activeLevel}</code>
        </div>
      </div>

      <div className="wiki-box prototype-map-canvas">
        <div className="prototype-map-scroll">
          <div
            className={`prototype-map-stack ${isDragging ? "prototype-map-stack-dragging" : ""}`}
            style={{ width: `${viewZoom * 100}%` }}
            onMouseDown={(event) => beginDrag(event.clientX, event.clientY)}
            onMouseMove={(event) => updateDrag(event.clientX, event.clientY)}
            onMouseUp={endDrag}
            onMouseLeave={endDrag}
          >
            <img
              src={topoMapSrc}
              alt="DEM-derived topographic basemap of Areshnaat"
              className="prototype-map-image"
            />
            <img
              src={coastlineOverlaySrc}
              alt=""
              aria-hidden="true"
              className="prototype-map-overlay"
            />
            <img
              src={voronoiWorldSrc}
              alt=""
              aria-hidden="true"
              className="prototype-map-overlay prototype-map-overlay-voronoi"
              style={{ opacity: worldOpacity }}
            />
            <img
              src={voronoiRegionSrc}
              alt=""
              aria-hidden="true"
              className="prototype-map-overlay prototype-map-overlay-voronoi prototype-map-overlay-voronoi-region"
              style={{ opacity: regionOpacity }}
            />
            <img
              src={voronoiStateSrc}
              alt=""
              aria-hidden="true"
              className="prototype-map-overlay prototype-map-overlay-voronoi prototype-map-overlay-voronoi-state"
              style={{ opacity: stateOpacity }}
            />
            <img
              src={azgaarOverlaySrc}
              alt=""
              aria-hidden="true"
              className="prototype-map-overlay prototype-map-overlay-calibrated"
              style={overlayStyle}
            />
          </div>
        </div>
      </div>
    </section>
  );
}
