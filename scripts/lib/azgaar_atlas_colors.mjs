export const ATLAS_PALETTE = [
  "#d9c27a",
  "#b9d38b",
  "#8fc2d9",
  "#d9a07a",
  "#b69ad9",
  "#d98fa8",
];

function normalizeNeighborIds(value) {
  if (Array.isArray(value)) {
    return value.filter((item) => Number.isInteger(item) && item > 0);
  }
  if (typeof value === "string") {
    return value
      .split(",")
      .map((item) => Number(item.trim()))
      .filter((item) => Number.isInteger(item) && item > 0);
  }
  return [];
}

export function assignAtlasColors(states, palette = ATLAS_PALETTE) {
  const usableStates = states
    .filter((state) => state && Number.isInteger(state.i) && state.i > 0)
    .map((state) => ({
      id: state.i,
      name: state.name || state.fullName || `state-${state.i}`,
      neighbors: normalizeNeighborIds(state.neighbors),
      cells: Number(state.cells || 0),
      burgs: Number(state.burgs || 0),
    }));

  const stateById = new Map(usableStates.map((state) => [state.id, state]));
  const adjacency = new Map(usableStates.map((state) => [state.id, new Set()]));

  for (const state of usableStates) {
    for (const neighborId of state.neighbors) {
      if (!stateById.has(neighborId) || neighborId === state.id) continue;
      adjacency.get(state.id).add(neighborId);
      adjacency.get(neighborId).add(state.id);
    }
  }

  const ordered = [...usableStates].sort((a, b) => {
    const degreeDiff = adjacency.get(b.id).size - adjacency.get(a.id).size;
    if (degreeDiff !== 0) return degreeDiff;
    const cellDiff = b.cells - a.cells;
    if (cellDiff !== 0) return cellDiff;
    const burgDiff = b.burgs - a.burgs;
    if (burgDiff !== 0) return burgDiff;
    return a.name.localeCompare(b.name);
  });

  const assigned = new Map();

  for (const state of ordered) {
    const used = new Set(
      [...adjacency.get(state.id)]
        .map((neighborId) => assigned.get(neighborId))
        .filter(Boolean),
    );

    const chosen =
      palette.find((color) => !used.has(color)) ||
      palette[assigned.size % palette.length];

    assigned.set(state.id, chosen);
  }

  return assigned;
}
