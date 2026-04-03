# render_drakharpan_political.py
import re
import csv
import numpy as np
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
import matplotlib.patheffects as pe
from matplotlib.patches import PathPatch
from matplotlib.path import Path as MplPath
from shapely.geometry import Polygon, MultiPolygon
from shapely.ops import unary_union
import svgpathtools

SVG_PATH = r'FMG_Data/states_isolated.svg'
CSV_PATH = r'FMG_Data/Drakharpan States 2026-04-01-18-47.csv'
OUT_PATH = r'output/drakharpan_political.png'

DPI  = 200
W_IN = 2400 / DPI
H_IN = 1600 / DPI

# ── 1. LOAD CSV: id → {name, color} ──────────────────────────────────────────

state_info = {}
with open(CSV_PATH, encoding='utf-8-sig') as f:
    for row in csv.DictReader(f):
        sid = int(row['Id'])
        if sid == 0:
            continue
        state_info[sid] = {
            'name':  row['State'],
            'color': row['Color'] or '#999999',
        }
print(f'CSV states: {len(state_info)}')

# ── 2. LOAD SVG: class → fill color, state paths ─────────────────────────────

with open(SVG_PATH, encoding='utf-8') as f:
    svg_text = f.read()

# CSS fill classes
css_colors = dict(re.findall(r'\.(st\d+)\s*\{[^}]*fill:\s*([^;}\s]+)', svg_text))

# state{N} → css class + path d
path_entries = re.findall(
    r'id="state(\d+)"\s+class="(st\d+)"\s+d="([^"]+)"', svg_text)
print(f'SVG state paths: {len(path_entries)}')

# ── 3. PARSE SVG PATHS → shapely polygons ────────────────────────────────────

def sample_path(path_obj, n_per_segment=8):
    """Sample a svgpathtools Path into an array of (x, y) points."""
    pts = []
    for seg in path_obj:
        for t in np.linspace(0, 1, n_per_segment, endpoint=False):
            pt = seg.point(t)
            pts.append((pt.real, pt.imag))
    return pts

def build_polygon(pts):
    if len(pts) < 3:
        return None
    try:
        poly = Polygon(pts)
        if not poly.is_valid:
            poly = poly.buffer(0)
        return poly if not poly.is_empty else None
    except Exception:
        return None

# Group sub-paths (M...Z segments) per state
states_geom = {}  # state_id → shapely geometry

for sid_str, css_cls, d_raw in path_entries:
    sid = int(sid_str)

    # Split on each M/m to get individual closed sub-paths
    sub_ds = [s.strip() for s in re.split(r'(?=[Mm])', d_raw) if s.strip()]
    polys = []
    for sub_d in sub_ds:
        try:
            path_obj = svgpathtools.parse_path(sub_d)
            pts = sample_path(path_obj)
            poly = build_polygon(pts)
            if poly:
                polys.append(poly)
        except Exception:
            pass

    if not polys:
        continue

    merged = unary_union(polys)
    states_geom[sid] = {
        'geometry': merged,
        'svg_color': css_colors.get(css_cls, '#999999'),
    }

print(f'States with geometry: {len(states_geom)}')

# ── 4. MATPLOTLIB RENDER ──────────────────────────────────────────────────────

def polygon_to_patch(poly, **kwargs):
    def ring_codes(ring):
        coords = list(ring.coords)
        codes = ([MplPath.MOVETO]
                 + [MplPath.LINETO] * (len(coords) - 2)
                 + [MplPath.CLOSEPOLY])
        return coords, codes
    verts, codes = [], []
    ev, ec = ring_codes(poly.exterior)
    verts += ev; codes += ec
    for interior in poly.interiors:
        iv, ic = ring_codes(interior)
        verts += iv; codes += ic
    return PathPatch(MplPath(verts, codes), **kwargs)

def get_polys(geom):
    if isinstance(geom, Polygon):
        return [geom]
    elif isinstance(geom, MultiPolygon):
        return list(geom.geoms)
    return []

def label_point(geom):
    polys = get_polys(geom)
    if not polys:
        return None, None
    largest = max(polys, key=lambda p: p.area)
    pt = largest.representative_point()
    return pt.x, pt.y

fig, ax = plt.subplots(figsize=(W_IN, H_IN), dpi=DPI)
fig.patch.set_facecolor('#1a2e42')
ax.set_facecolor('#1a3550')
ax.set_aspect('equal')
ax.axis('off')

for sid, data in states_geom.items():
    # Prefer CSV color, fall back to SVG CSS color
    info = state_info.get(sid, {})
    color = info.get('color') or data['svg_color']
    geom  = data['geometry']

    # SVG y-axis is flipped vs matplotlib — negate y
    def flip(geom):
        from shapely.affinity import scale
        return scale(geom, xfact=1, yfact=-1, origin=(0, 0))

    geom = flip(geom)

    for poly in get_polys(geom):
        ax.add_patch(polygon_to_patch(
            poly,
            facecolor=color,
            edgecolor='#111111',
            linewidth=0.6,
            alpha=0.9,
            zorder=2,
        ))

# Labels
for sid, data in states_geom.items():
    info = state_info.get(sid, {})
    name = info.get('name', f'State {sid}')
    from shapely.affinity import scale
    geom = scale(data['geometry'], xfact=1, yfact=-1, origin=(0, 0))
    lx, ly = label_point(geom)
    if lx is None:
        continue
    ax.text(
        lx, ly, name,
        ha='center', va='center',
        fontsize=7, fontfamily='serif',
        color='#f0e8d0', fontweight='bold',
        zorder=5,
        path_effects=[pe.withStroke(linewidth=2.2, foreground='#111111')],
    )

ax.autoscale_view()
ax.set_title('Areshnaat — Political Survey',
             fontsize=14, color='#d8c89a', fontfamily='serif', pad=10)

plt.tight_layout(pad=0.3)
fig.savefig(OUT_PATH, dpi=DPI, bbox_inches='tight',
            facecolor=fig.get_facecolor())
plt.close(fig)
print(f'Saved: {OUT_PATH}')
