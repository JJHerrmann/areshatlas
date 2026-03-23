import PrototypeMapAlignment from "@/components/azgaar/PrototypeMapAlignment";

const topoMapSrc = "/maps/areshnaat-topo-dem.webp";
const coastlineOverlaySrc = "/maps/areshnaat-coastline.svg";
const voronoiWorldSrc = "/maps/areshnaat-voronoi-l0-world.webp";
const voronoiRegionSrc = "/maps/areshnaat-voronoi-l1-region.webp";
const voronoiStateSrc = "/maps/areshnaat-voronoi-l2-state.webp";
const azgaarOverlaySrc = "/maps/areshnaat-azgaar-state-overlay.svg";

export default function PrototypeMapPage() {
  return (
    <main className="wiki-main-page prototype-map-page">
      <div className="wiki-content prototype-map-content">
        <article className="wiki-article prototype-map-article">
          <div className="wiki-article-header">
            <div className="wiki-kicker">Prototype Map</div>
            <h1 className="wiki-title">Areshnaat DEM Topographic Basemap</h1>
            <p className="wiki-subtitle">
              First-pass map workspace using the rotated Areshnaat DEM as the public-facing world basemap.
              This is the starting layer for a dedicated map editor pipeline separate from Azgaar.
            </p>
          </div>

          <PrototypeMapAlignment
            topoMapSrc={topoMapSrc}
            coastlineOverlaySrc={coastlineOverlaySrc}
            voronoiWorldSrc={voronoiWorldSrc}
            voronoiRegionSrc={voronoiRegionSrc}
            voronoiStateSrc={voronoiStateSrc}
            azgaarOverlaySrc={azgaarOverlaySrc}
          />
        </article>
      </div>
    </main>
  );
}
