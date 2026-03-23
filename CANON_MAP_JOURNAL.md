# Canon Map Journal

This file records the current canonical map-working assets for Areshnaat and a running journal of map/tooling actions performed in this workspace.

## Canon Docs

### World Canon Working Assets
- Basemap: [public/maps/areshnaat-topo-dem.webp](/r:/Rookworks/Copilot/public/maps/areshnaat-topo-dem.webp)
- Coastline: [public/maps/areshnaat-coastline.svg](/r:/Rookworks/Copilot/public/maps/areshnaat-coastline.svg)
- Traversal overlay: [public/maps/areshnaat-land-traversal-cells-overlay.webp](/r:/Rookworks/Copilot/public/maps/areshnaat-land-traversal-cells-overlay.webp)
- Traversal cells CSV: [output/working/areshnaat_land_traversal_cells.csv](/r:/Rookworks/Copilot/output/working/areshnaat_land_traversal_cells.csv)
- Traversal metadata: [output/working/areshnaat_land_traversal_cells_metadata.json](/r:/Rookworks/Copilot/output/working/areshnaat_land_traversal_cells_metadata.json)
- Voronoi L0: [public/maps/areshnaat-voronoi-l0-world.webp](/r:/Rookworks/Copilot/public/maps/areshnaat-voronoi-l0-world.webp)
- Voronoi L1: [public/maps/areshnaat-voronoi-l1-region.webp](/r:/Rookworks/Copilot/public/maps/areshnaat-voronoi-l1-region.webp)
- Voronoi L2: [public/maps/areshnaat-voronoi-l2-state.webp](/r:/Rookworks/Copilot/public/maps/areshnaat-voronoi-l2-state.webp)
- Faux-satellite 8k PNG: [output/map_renders/areshnaat-faux-satellite-8k.png](/r:/Rookworks/Copilot/output/map_renders/areshnaat-faux-satellite-8k.png)
- Globe GIF: [output/map_renders/areshnaat-rotating-globe.gif](/r:/Rookworks/Copilot/output/map_renders/areshnaat-rotating-globe.gif)

### Drakharpan Canon Working Assets
- Normalized crop basemap: [public/maps/aresh_arctic_16x9_normalized_topobathy_current_coast_reference_cities.png](/r:/Rookworks/Copilot/public/maps/aresh_arctic_16x9_normalized_topobathy_current_coast_reference_cities.png)
- Normalized crop topo: [public/maps/aresh_arctic_16x9_normalized_topobathy.png](/r:/Rookworks/Copilot/public/maps/aresh_arctic_16x9_normalized_topobathy.png)
- Normalized crop metadata: [output/working/aresh_arctic_16x9_normalized_metadata.json](/r:/Rookworks/Copilot/output/working/aresh_arctic_16x9_normalized_metadata.json)
- Normalized crop DEM: [output/working/aresh_arctic_16x9_normalized_dem.tif](/r:/Rookworks/Copilot/output/working/aresh_arctic_16x9_normalized_dem.tif)
- Drakharpan traversal subset: [output/working/drakharpan_traversal_cells.csv](/r:/Rookworks/Copilot/output/working/drakharpan_traversal_cells.csv)
- Drakharpan traversal metadata: [output/working/drakharpan_traversal_cells_metadata.json](/r:/Rookworks/Copilot/output/working/drakharpan_traversal_cells_metadata.json)
- Drakharpan traversal preview: [output/working/drakharpan_traversal_cells_preview.png](/r:/Rookworks/Copilot/output/working/drakharpan_traversal_cells_preview.png)

### Canon Transform / Reference Docs
- Spherical rotation reference text: [output/map_renders/aresh_spherical_rotation_reference.txt](/r:/Rookworks/Copilot/output/map_renders/aresh_spherical_rotation_reference.txt)
- Spherical rotation reference JSON: [output/map_renders/aresh_spherical_rotation_reference.json](/r:/Rookworks/Copilot/output/map_renders/aresh_spherical_rotation_reference.json)
- Orientation climate note: [Areshnaat_orientation_climate_report.txt](/r:/Rookworks/Copilot/Areshnaat_orientation_climate_report.txt)
- Beringia analog bbox note: [Areshnaat_Beringia_analog_bbox.txt](/r:/Rookworks/Copilot/Areshnaat_Beringia_analog_bbox.txt)
- Drakharpan plate estimate note: [Drakharpan_plate_estimate.txt](/r:/Rookworks/Copilot/Drakharpan_plate_estimate.txt)

### Active Dev Routes
- World traversal viewer: `/prototype_traversal`
- Drakharpan traversal viewer: `/prototype_traversal_drakharpan`
- Burg pin viewer: `/prototype_burgs`
- Map alignment/workbench: `/prototype_map`

## Canon Orientation

Current agreed mental map:
- Eurasia-equivalent is the southern continent.
- North America-equivalent is the northern continent.
- World-facing assets should match that orientation.

The canonical land/sea divide currently uses:
- `-62 m` relative to Earth62 sea level as the working `0` shoreline baseline.

## Archived / Stale Bundles

- Previous `aresh_arctic` export archive:
  - [region_exports/archive/aresh_arctic_azgaar_crop_20260320_192219](/r:/Rookworks/Copilot/region_exports/archive/aresh_arctic_azgaar_crop_20260320_192219)

Notes:
- The older live folder at [region_exports/aresh_arctic_azgaar_crop](/r:/Rookworks/Copilot/region_exports/aresh_arctic_azgaar_crop) should be treated as partially stale.
- A Windows file lock prevented a fully clean archive/replace pass on one of the old PNGs.
- The normalized crop files listed above are the current canon working set instead.

## Journal

### 2026-03-20

#### Canon substrate established
- Generated a land-only world Voronoi / traversal substrate from the rotated world DEM.
- Saved the stable world traversal CSV and metadata for repeated reuse:
  - [output/working/areshnaat_land_traversal_cells.csv](/r:/Rookworks/Copilot/output/working/areshnaat_land_traversal_cells.csv)
  - [output/working/areshnaat_land_traversal_cells_metadata.json](/r:/Rookworks/Copilot/output/working/areshnaat_land_traversal_cells_metadata.json)
- Built a world traversal viewer route and a Drakharpan-specific traversal route.

#### Orientation corrected
- Confirmed the intended canon orientation is “Eurasia south.”
- Removed stale vertical flips from the world-generation scripts so the produced world assets match the agreed mental map.
- Regenerated the world topo, coastline, traversal overlay, and Voronoi products against the corrected orientation.

#### Drakharpan crop normalized
- Determined the older `aresh_arctic` crop bundle was partly stale and partly locked by Windows.
- Preserved the prior bundle in the archive folder.
- Generated a new normalized Drakharpan crop to fresh filenames instead of continuing to depend on the locked historical plate assets.

#### FMG namebase inventory workbook
- Extracted the default FMG namesbase inventory from the local `names-generator.ts` source.
- Generated a workbook for reference and editing at:
  - [output/working/fmg_namesbases_reference.xlsx](/r:/Rookworks/Copilot/output/working/fmg_namesbases_reference.xlsx)
- Included separate sheets for the base inventory, the Elven entries, and the FMG import format.

#### FMG world heightmap policy
- Applied the shared lowland-biased FMG heightmap policy to the full Areshnaat world DEM as well as Drakharpan.
- Generated a new FMG preset and asset for the world-scale trial:
  - [Fantasy-Map-Generator-master/Fantasy-Map-Generator-master/public/heightmaps/areshnaat-world.png](/r:/Rookworks/Copilot/Fantasy-Map-Generator-master/Fantasy-Map-Generator-master/public/heightmaps/areshnaat-world.png)
- Added the corresponding preset entry in:
  - [Fantasy-Map-Generator-master/Fantasy-Map-Generator-master/public/config/precreated-heightmaps.js](/r:/Rookworks/Copilot/Fantasy-Map-Generator-master/Fantasy-Map-Generator-master/public/config/precreated-heightmaps.js)
- Rebuilt the Drakharpan traversal subset and preview against that normalized crop.

#### Transform work
- Verified the old Earth->Aresh affine approach was not coastline-faithful enough for analog city placement.
- Added and saved a reusable spherical rotation reference as the correct long-term transform basis:
  - [output/map_renders/aresh_spherical_rotation_reference.json](/r:/Rookworks/Copilot/output/map_renders/aresh_spherical_rotation_reference.json)
  - [output/map_renders/aresh_spherical_rotation_reference.txt](/r:/Rookworks/Copilot/output/map_renders/aresh_spherical_rotation_reference.txt)

#### State / Azgaar support work already on disk
- Built batch state SVG exports under [output/azgaar/states](/r:/Rookworks/Copilot/output/azgaar/states).
- Built tabular authority exports for states, provinces, burgs, routes, and cells under [output/azgaar/tabular](/r:/Rookworks/Copilot/output/azgaar/tabular).
- Built atlas-safe state-color assignment with adjacency-aware colors.
- Built prototype viewers for:
  - world map alignment
  - burg inspection
  - traversal cells

#### FMG local trial
- Located the local Fantasy Map Generator source tree under [Fantasy-Map-Generator-master/Fantasy-Map-Generator-master](/r:/Rookworks/Copilot/Fantasy-Map-Generator-master/Fantasy-Map-Generator-master).
- Confirmed the app has a precreated-heightmap loading path that reads from `public/heightmaps/${id}.png`.
- Added a dedicated `drakharpan` precreated heightmap preset in [public/config/precreated-heightmaps.js](/r:/Rookworks/Copilot/Fantasy-Map-Generator-master/Fantasy-Map-Generator-master/public/config/precreated-heightmaps.js).
- Generated an FMG-ready grayscale Drakharpan heightmap from the normalized DEM and wrote it to:
  - [output/working/drakharpan_fmg_heightmap.png](/r:/Rookworks/Copilot/output/working/drakharpan_fmg_heightmap.png)
  - [Fantasy-Map-Generator-master/Fantasy-Map-Generator-master/public/heightmaps/drakharpan.png](/r:/Rookworks/Copilot/Fantasy-Map-Generator-master/Fantasy-Map-Generator-master/public/heightmaps/drakharpan.png)
- This is a separate FMG trial path and does not modify the Copilot traversal prototypes.

## Maintenance Rule

When a new asset supersedes an older map/crop/export:
- add the new canonical file paths above
- move or note the old bundle under `Archived / Stale Bundles`
- append a dated note under `Journal`
