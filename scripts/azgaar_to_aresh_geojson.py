# azgaar_to_aresh_geojson.py
import json
import sys
import numpy as np
from scipy.spatial import Voronoi
from shapely.geometry import Polygon, MultiPolygon
from shapely.ops import unary_union
import geojson

MAP_PATH = r'FMG_Data/Areshnaat 2026-04-01-18-48.map'
OUT_PATH = r'output/aresh_states.geojson'

# ── 1. LOAD + PARSE ───────────────────────────────────────────────────────────

with open(MAP_PATH, 'r', encoding='utf-8', errors='replace') as f:
    raw = f.read()
lines = raw.splitlines()

def parse_json_line(n):
    return json.loads(lines[n].strip())

header   = lines[0].strip().split('|')
MAP_W    = float(header[4])
MAP_H    = float(header[5])
bounds   = parse_json_line(2)   # {latN, latS, lonW, lonE}
grid     = parse_json_line(143) # {points: [[x,y],...], ...}
points   = np.array(grid['points'], dtype=float)  # (10008, 2) canvas coords

# State per cell: find the CSV line with len=10008, non-negative ints, max=state count
states_arr = parse_json_line(151)
max_state_id = max(s['i'] for s in states_arr if isinstance(s, dict))
states = {s['i']: s for s in states_arr if isinstance(s, dict) and s['i'] != 0}
print(f'Canvas: {MAP_W}x{MAP_H}')
print(f'Bounds: latN={bounds["latN"]} latS={bounds["latS"]} lonW={bounds["lonW"]} lonE={bounds["lonE"]}')
print(f'Cell points: {len(points)}, States: {len(states)}, max_state_id={max_state_id}')

# Line 148 = state per cell (10008 values); negatives = ocean/border cells
state_by_cell = [int(float(x)) for x in lines[148].split(',') if x.strip()]
if len(state_by_cell) != len(points):
    sys.exit(f'ERROR: state_by_cell len {len(state_by_cell)} != points len {len(points)}')
print(f'state_by_cell: {len(state_by_cell)} cells, unique={sorted(set(state_by_cell))}')

# ── 2. CANVAS → ARESH LAT/LON ─────────────────────────────────────────────────

def canvas_to_aresh(xy):
    """Nx2 canvas [x,y] → Nx2 GeoJSON [lon, lat] in Aresh space."""
    xy = np.asarray(xy, dtype=float)
    lon = bounds['lonW'] + (xy[:, 0] / MAP_W) * (bounds['lonE'] - bounds['lonW'])
    lat = bounds['latN'] - (xy[:, 1] / MAP_H) * (bounds['latN'] - bounds['latS'])
    return np.column_stack([lon, lat])

# ── 3. COMPUTE VORONOI TESSELLATION ──────────────────────────────────────────
# Add mirror points along the map boundary to keep edge cells finite.

margin = 50
mirror_pts = np.array([
    [-margin, -margin], [MAP_W / 2, -margin], [MAP_W + margin, -margin],
    [-margin, MAP_H / 2], [MAP_W + margin, MAP_H / 2],
    [-margin, MAP_H + margin], [MAP_W / 2, MAP_H + margin], [MAP_W + margin, MAP_H + margin],
])
all_pts = np.vstack([points, mirror_pts])

print('Computing Voronoi tessellation...')
vor = Voronoi(all_pts)

# vor.point_region[i] = index into vor.regions for point i
# vor.regions[r] = list of vertex indices (-1 = infinity)
# vor.vertices[v] = [x, y]

# ── 4. BUILD POLYGONS PER STATE ───────────────────────────────────────────────

clip_box = Polygon([
    (0, 0), (MAP_W, 0), (MAP_W, MAP_H), (0, MAP_H)
])

state_polys = {}

for cell_idx, state_id in enumerate(state_by_cell):
    if state_id <= 0:
        continue

    region_idx = vor.point_region[cell_idx]
    region = vor.regions[region_idx]

    if -1 in region or not region:
        continue  # infinite / degenerate region

    ring = vor.vertices[region]

    try:
        poly = Polygon(ring)
        if not poly.is_valid:
            poly = poly.buffer(0)
        poly = poly.intersection(clip_box)
        if poly.is_empty:
            continue
    except Exception as e:
        print(f'Polygon error cell {cell_idx}: {e}')
        continue

    # Collect sub-polygons (intersection may return MultiPolygon)
    if isinstance(poly, Polygon):
        polys_to_add = [poly]
    elif isinstance(poly, MultiPolygon):
        polys_to_add = list(poly.geoms)
    else:
        continue

    state_polys.setdefault(state_id, []).extend(polys_to_add)

print(f'States with geometry: {len(state_polys)}')

# ── 5. DISSOLVE, WARP, WRITE GEOJSON ─────────────────────────────────────────

features_out = []

for state_id, polys in state_polys.items():
    state_info = states.get(state_id, {})
    if not state_info:
        continue  # skip unmapped IDs (e.g. state 23, deleted states)
    merged = unary_union(polys)

    def get_rings(geom):
        if isinstance(geom, Polygon):
            return [list(geom.exterior.coords)]
        elif isinstance(geom, MultiPolygon):
            return [list(p.exterior.coords) for p in geom.geoms]
        return []

    rings = get_rings(merged)
    if not rings:
        continue

    all_coords = [c for ring in rings for c in ring]
    warped = canvas_to_aresh(all_coords)

    idx = 0
    warped_rings = []
    for ring in rings:
        n = len(ring)
        warped_ring = warped[idx:idx+n].tolist()
        idx += n
        if warped_ring[0] != warped_ring[-1]:
            warped_ring.append(warped_ring[0])
        warped_rings.append(warped_ring)

    if len(warped_rings) == 1:
        geometry = geojson.Polygon(warped_rings)
    else:
        geometry = geojson.MultiPolygon([[r] for r in warped_rings])

    features_out.append(geojson.Feature(
        geometry=geometry,
        properties={
            'state_id':  state_id,
            'name':      state_info.get('name', f'State_{state_id}'),
            'full_name': state_info.get('fullName', ''),
            'form':      state_info.get('form', ''),
            'color':     state_info.get('color', ''),
            'cells':     state_info.get('cells', 0),
        }
    ))

fc = geojson.FeatureCollection(features_out)
with open(OUT_PATH, 'w', encoding='utf-8') as f:
    geojson.dump(fc, f, indent=2)

print(f'Done — {len(features_out)} states written to {OUT_PATH}')
