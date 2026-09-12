import type {
  Board,
  Edge,
  HexCoord,
  PortType,
  Resource,
  TerrainType,
  Tile,
  Vertex,
} from "./types";
import { RESOURCES } from "./types";

/** Standard pointy-top axial neighbor directions (redblobgames convention). */
export const HEX_DIRECTIONS: HexCoord[] = [
  { q: 1, r: 0 },
  { q: 1, r: -1 },
  { q: 0, r: -1 },
  { q: -1, r: 0 },
  { q: -1, r: 1 },
  { q: 0, r: 1 },
];

export function hexKey(c: HexCoord): string {
  return `${c.q},${c.r}`;
}

/** Bounds for a (possibly asymmetric) hexagonal region in cube coordinates (s = -q - r). */
export interface HexBounds {
  qmin: number;
  qmax: number;
  rmin: number;
  rmax: number;
  smin: number;
  smax: number;
}

/** Regular radius-2 hexagon: 19 tiles, rows 3-4-5-4-3. Used for 3-4 player boards. */
export const BASE_BOARD_BOUNDS: HexBounds = {
  qmin: -2,
  qmax: 2,
  rmin: -2,
  rmax: 2,
  smin: -2,
  smax: 2,
};

/** Elongated hexagon: 30 tiles, rows 3-4-5-6-5-4-3. Used for 5-6 player boards. */
export const EXTENDED_BOARD_BOUNDS: HexBounds = {
  qmin: -2,
  qmax: 3,
  rmin: -3,
  rmax: 3,
  smin: -3,
  smax: 2,
};

export function generateHexCoords(bounds: HexBounds): HexCoord[] {
  const { qmin, qmax, rmin, rmax, smin, smax } = bounds;
  const coords: HexCoord[] = [];
  for (let r = rmin; r <= rmax; r++) {
    const qlo = Math.max(qmin, -r - smax);
    const qhi = Math.min(qmax, -r - smin);
    for (let q = qlo; q <= qhi; q++) {
      coords.push({ q, r });
    }
  }
  return coords;
}

const HEX_SIZE = 100;

export function axialToPixel(c: HexCoord): { x: number; y: number } {
  const x = HEX_SIZE * Math.sqrt(3) * (c.q + c.r / 2);
  const y = HEX_SIZE * 1.5 * c.r;
  return { x, y };
}

/** The 6 corners of a pointy-top hex centered at (cx, cy), in clockwise order starting at top-right. */
function hexCorners(cx: number, cy: number): { x: number; y: number }[] {
  const corners: { x: number; y: number }[] = [];
  for (let i = 0; i < 6; i++) {
    const angleDeg = 60 * i - 30;
    const angleRad = (Math.PI / 180) * angleDeg;
    corners.push({
      x: cx + HEX_SIZE * Math.cos(angleRad),
      y: cy + HEX_SIZE * Math.sin(angleRad),
    });
  }
  return corners;
}

/** Snaps values extremely close to zero to exact 0 so that e.g. 1e-14 and -1e-14
 * (which arise from floating point trig on different tiles for the same
 * geometric corner) don't format as "0.00" vs "-0.00" and get treated as
 * distinct vertices. */
function normalizeCoord(n: number): number {
  return Math.abs(n) < 1e-6 ? 0 : n;
}

function pointKey(x: number, y: number): string {
  return `${normalizeCoord(x).toFixed(2)}:${normalizeCoord(y).toFixed(2)}`;
}

function edgeKey(a: string, b: string): string {
  return a < b ? `${a}|${b}` : `${b}|${a}`;
}

export type RandomFn = () => number;

function shuffle<T>(items: T[], random: RandomFn): T[] {
  const arr = items.slice();
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

interface TerrainPlan {
  terrain: TerrainType[];
  numbers: number[];
  ports: PortType[];
}

function terrainPlanFor(numPlayers: number): TerrainPlan {
  if (numPlayers >= 5) {
    const terrain: TerrainType[] = [
      ...Array(6).fill("wood"),
      ...Array(6).fill("wheat"),
      ...Array(6).fill("sheep"),
      ...Array(5).fill("brick"),
      ...Array(5).fill("ore"),
      ...Array(2).fill("desert"),
    ];
    const numbers = [
      ...Array(2).fill(2),
      ...Array(3).fill(3),
      ...Array(3).fill(4),
      ...Array(3).fill(5),
      ...Array(3).fill(6),
      ...Array(3).fill(8),
      ...Array(3).fill(9),
      ...Array(3).fill(10),
      ...Array(3).fill(11),
      ...Array(2).fill(12),
    ];
    const ports: PortType[] = [
      "generic",
      "generic",
      "generic",
      "generic",
      "generic",
      "wood",
      "brick",
      "sheep",
      "sheep",
      "wheat",
      "ore",
    ];
    return { terrain, numbers, ports };
  }
  const terrain: TerrainType[] = [
    ...Array(4).fill("wood"),
    ...Array(4).fill("wheat"),
    ...Array(4).fill("sheep"),
    ...Array(3).fill("brick"),
    ...Array(3).fill("ore"),
    ...Array(1).fill("desert"),
  ];
  const numbers = [
    2,
    ...Array(2).fill(3),
    ...Array(2).fill(4),
    ...Array(2).fill(5),
    ...Array(2).fill(6),
    ...Array(2).fill(8),
    ...Array(2).fill(9),
    ...Array(2).fill(10),
    ...Array(2).fill(11),
    12,
  ];
  const ports: PortType[] = [
    "generic",
    "generic",
    "generic",
    "generic",
    "wood",
    "brick",
    "sheep",
    "wheat",
    "ore",
  ];
  return { terrain, numbers, ports };
}

function assignTerrainAndNumbers(
  tiles: Tile[],
  plan: TerrainPlan,
  random: RandomFn,
): void {
  const coordByKey = new Map<string, Tile>();
  for (const t of tiles) coordByKey.set(hexKey(t.coord), t);

  const terrainOrder = shuffle(plan.terrain, random);
  terrainOrder.forEach((terrain, i) => {
    tiles[i].terrain = terrain;
  });

  const nonDesert = tiles.filter((t) => t.terrain !== "desert");
  const desert = tiles.filter((t) => t.terrain === "desert");
  for (const d of desert) d.number = null;

  const MAX_ATTEMPTS = 500;
  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
    const numberOrder = shuffle(plan.numbers, random);
    nonDesert.forEach((tile, i) => {
      tile.number = numberOrder[i];
    });
    if (!hasAdjacentRedNumbers(nonDesert, coordByKey)) return;
  }
  // Extremely unlikely to be reached, but leave the last attempt's assignment
  // in place rather than throwing, so a pathological RNG can't crash setup.
}

function hasAdjacentRedNumbers(
  nonDesertTiles: Tile[],
  coordByKey: Map<string, Tile>,
): boolean {
  for (const tile of nonDesertTiles) {
    if (tile.number !== 6 && tile.number !== 8) continue;
    for (const dir of HEX_DIRECTIONS) {
      const neighbor = coordByKey.get(
        hexKey({ q: tile.coord.q + dir.q, r: tile.coord.r + dir.r }),
      );
      if (neighbor && (neighbor.number === 6 || neighbor.number === 8)) {
        return true;
      }
    }
  }
  return false;
}

function orderBoundaryLoop(
  boundaryEdgeIds: string[],
  edges: Record<string, Edge>,
): string[] {
  if (boundaryEdgeIds.length === 0) return [];
  const remaining = new Set(boundaryEdgeIds);
  const byVertex = new Map<string, string[]>();
  for (const id of boundaryEdgeIds) {
    const [a, b] = edges[id].vertexIds;
    for (const v of [a, b]) {
      if (!byVertex.has(v)) byVertex.set(v, []);
      byVertex.get(v)!.push(id);
    }
  }

  const ordered: string[] = [];
  let currentEdgeId = boundaryEdgeIds[0];
  let currentVertex = edges[currentEdgeId].vertexIds[1];
  ordered.push(currentEdgeId);
  remaining.delete(currentEdgeId);

  while (remaining.size > 0) {
    const candidates = byVertex.get(currentVertex) ?? [];
    const nextEdgeId = candidates.find((id) => remaining.has(id));
    if (!nextEdgeId) break;
    ordered.push(nextEdgeId);
    remaining.delete(nextEdgeId);
    const [a, b] = edges[nextEdgeId].vertexIds;
    currentVertex = a === currentVertex ? b : a;
  }
  return ordered;
}

function assignPorts(
  vertices: Record<string, Vertex>,
  edges: Record<string, Edge>,
  ports: PortType[],
  random: RandomFn,
): void {
  const boundaryEdgeIds = Object.values(edges)
    .filter((e) => e.tileIds.length === 1)
    .map((e) => e.id);
  const loop = orderBoundaryLoop(boundaryEdgeIds, edges);
  if (loop.length === 0) return;

  const portTypes = shuffle(ports, random);
  const step = loop.length / portTypes.length;
  const chosenIndices = new Set<number>();
  for (let i = 0; i < portTypes.length; i++) {
    chosenIndices.add(Math.floor(i * step));
  }
  const chosen = [...chosenIndices];

  chosen.forEach((edgeIndex, i) => {
    const edge = edges[loop[edgeIndex]];
    const portType = portTypes[i];
    for (const vId of edge.vertexIds) {
      vertices[vId].port = portType;
    }
  });
}

export function buildBoard(numPlayers: number, random: RandomFn = Math.random): Board {
  const bounds =
    numPlayers >= 5 ? EXTENDED_BOARD_BOUNDS : BASE_BOARD_BOUNDS;
  const coords = generateHexCoords(bounds);

  const vertices: Record<string, Vertex> = {};
  const edges: Record<string, Edge> = {};

  const tiles: Tile[] = coords.map((coord) => ({
    id: hexKey(coord),
    coord,
    terrain: "desert",
    number: null,
    vertexIds: [],
    edgeIds: [],
  }));

  for (const tile of tiles) {
    const { x: cx, y: cy } = axialToPixel(tile.coord);
    const corners = hexCorners(cx, cy);
    const cornerIds = corners.map(({ x, y }) => {
      const key = pointKey(x, y);
      if (!vertices[key]) {
        vertices[key] = {
          id: key,
          x,
          y,
          tileIds: [],
          adjacentVertexIds: [],
          edgeIds: [],
          port: null,
        };
      }
      if (!vertices[key].tileIds.includes(tile.id)) {
        vertices[key].tileIds.push(tile.id);
      }
      return key;
    });
    tile.vertexIds = cornerIds;

    for (let i = 0; i < 6; i++) {
      const a = cornerIds[i];
      const b = cornerIds[(i + 1) % 6];
      const id = edgeKey(a, b);
      if (!edges[id]) {
        edges[id] = { id, vertexIds: [a, b], tileIds: [] };
      }
      if (!edges[id].tileIds.includes(tile.id)) {
        edges[id].tileIds.push(tile.id);
      }
      if (!tile.edgeIds.includes(id)) tile.edgeIds.push(id);
    }
  }

  for (const edge of Object.values(edges)) {
    const [a, b] = edge.vertexIds;
    if (!vertices[a].adjacentVertexIds.includes(b)) {
      vertices[a].adjacentVertexIds.push(b);
    }
    if (!vertices[b].adjacentVertexIds.includes(a)) {
      vertices[b].adjacentVertexIds.push(a);
    }
    if (!vertices[a].edgeIds.includes(edge.id)) vertices[a].edgeIds.push(edge.id);
    if (!vertices[b].edgeIds.includes(edge.id)) vertices[b].edgeIds.push(edge.id);
  }

  const plan = terrainPlanFor(numPlayers);
  assignTerrainAndNumbers(tiles, plan, random);
  assignPorts(vertices, edges, plan.ports, random);

  const desertTile = tiles.find((t) => t.terrain === "desert")!;

  return {
    tiles,
    vertices,
    edges,
    robberTileId: desertTile.id,
  };
}

export function bankResourceCount(numPlayers: number): number {
  return numPlayers >= 5 ? 24 : 19;
}

export { RESOURCES };
export type { Resource };
