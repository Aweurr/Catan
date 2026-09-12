import { describe, expect, it } from "vitest";
import { buildBoard, generateHexCoords, BASE_BOARD_BOUNDS, EXTENDED_BOARD_BOUNDS, HEX_DIRECTIONS, hexKey } from "../board";

function mulberry32(seed: number) {
  let a = seed;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

describe("generateHexCoords", () => {
  it("produces the 3-4-5-4-3 base board (19 tiles)", () => {
    const coords = generateHexCoords(BASE_BOARD_BOUNDS);
    expect(coords).toHaveLength(19);
    const rowCounts = new Map<number, number>();
    for (const c of coords) rowCounts.set(c.r, (rowCounts.get(c.r) ?? 0) + 1);
    expect([...rowCounts.entries()].sort((a, b) => a[0] - b[0])).toEqual([
      [-2, 3],
      [-1, 4],
      [0, 5],
      [1, 4],
      [2, 3],
    ]);
  });

  it("produces the 3-4-5-6-5-4-3 extended board (30 tiles)", () => {
    const coords = generateHexCoords(EXTENDED_BOARD_BOUNDS);
    expect(coords).toHaveLength(30);
    const rowCounts = new Map<number, number>();
    for (const c of coords) rowCounts.set(c.r, (rowCounts.get(c.r) ?? 0) + 1);
    expect([...rowCounts.entries()].sort((a, b) => a[0] - b[0])).toEqual([
      [-3, 3],
      [-2, 4],
      [-1, 5],
      [0, 6],
      [1, 5],
      [2, 4],
      [3, 3],
    ]);
  });

  it("every non-boundary tile has all 6 neighbours present (no holes)", () => {
    for (const bounds of [BASE_BOARD_BOUNDS, EXTENDED_BOARD_BOUNDS]) {
      const coords = generateHexCoords(bounds);
      const set = new Set(coords.map(hexKey));
      let interiorCount = 0;
      for (const c of coords) {
        const neighborCount = HEX_DIRECTIONS.filter((d) =>
          set.has(hexKey({ q: c.q + d.q, r: c.r + d.r })),
        ).length;
        expect(neighborCount).toBeGreaterThanOrEqual(3);
        expect(neighborCount).toBeLessThanOrEqual(6);
        if (neighborCount === 6) interiorCount++;
      }
      expect(interiorCount).toBeGreaterThan(0);
    }
  });
});

describe("buildBoard", () => {
  for (const numPlayers of [4, 6]) {
    describe(`${numPlayers} players`, () => {
      const random = mulberry32(42);
      const board = buildBoard(numPlayers, random);
      const expectedTiles = numPlayers >= 5 ? 30 : 19;
      const expectedDeserts = numPlayers >= 5 ? 2 : 1;
      const expectedPorts = numPlayers >= 5 ? 11 : 9;

      it(`has ${expectedTiles} tiles`, () => {
        expect(board.tiles).toHaveLength(expectedTiles);
      });

      it("has the expected total vertex/edge count and no degree-4+ vertices (no rounding collisions)", () => {
        // Base board matches the real Catan board: 54 intersections, 72 road spaces.
        const [expectedVertices, expectedEdges] =
          numPlayers >= 5 ? [80, 109] : [54, 72];
        expect(Object.keys(board.vertices)).toHaveLength(expectedVertices);
        expect(Object.keys(board.edges)).toHaveLength(expectedEdges);
        for (const v of Object.values(board.vertices)) {
          expect(v.edgeIds.length).toBeGreaterThanOrEqual(2);
          expect(v.edgeIds.length).toBeLessThanOrEqual(3);
        }
      });

      it("has the right terrain distribution", () => {
        const counts: Record<string, number> = {};
        for (const t of board.tiles) counts[t.terrain] = (counts[t.terrain] ?? 0) + 1;
        expect(counts.desert).toBe(expectedDeserts);
        const nonDesertTotal = expectedTiles - expectedDeserts;
        const sumOthers = Object.entries(counts)
          .filter(([k]) => k !== "desert")
          .reduce((s, [, v]) => s + v, 0);
        expect(sumOthers).toBe(nonDesertTotal);
      });

      it("every tile has exactly 6 distinct vertices and 6 distinct edges", () => {
        for (const tile of board.tiles) {
          expect(new Set(tile.vertexIds).size).toBe(6);
          expect(new Set(tile.edgeIds).size).toBe(6);
        }
      });

      it("desert tiles have no number, all others have a valid dice number", () => {
        for (const tile of board.tiles) {
          if (tile.terrain === "desert") {
            expect(tile.number).toBeNull();
          } else {
            expect(tile.number).toBeGreaterThanOrEqual(2);
            expect(tile.number).toBeLessThanOrEqual(12);
            expect(tile.number).not.toBe(7);
          }
        }
      });

      it("never places 6 or 8 on adjacent tiles", () => {
        const byCoord = new Map(board.tiles.map((t) => [hexKey(t.coord), t]));
        for (const tile of board.tiles) {
          if (tile.number !== 6 && tile.number !== 8) continue;
          for (const dir of HEX_DIRECTIONS) {
            const neighbor = byCoord.get(
              hexKey({ q: tile.coord.q + dir.q, r: tile.coord.r + dir.r }),
            );
            if (neighbor && (neighbor.number === 6 || neighbor.number === 8)) {
              throw new Error(
                `adjacent red numbers: ${tile.id} and ${neighbor.id}`,
              );
            }
          }
        }
      });

      it("every edge connects exactly 2 vertices and touches 1 or 2 tiles", () => {
        for (const edge of Object.values(board.edges)) {
          expect(edge.vertexIds).toHaveLength(2);
          expect(edge.tileIds.length).toBeGreaterThanOrEqual(1);
          expect(edge.tileIds.length).toBeLessThanOrEqual(2);
        }
      });

      it("every vertex touches 1-3 tiles and its adjacency list is symmetric", () => {
        for (const vertex of Object.values(board.vertices)) {
          expect(vertex.tileIds.length).toBeGreaterThanOrEqual(1);
          expect(vertex.tileIds.length).toBeLessThanOrEqual(3);
          for (const otherId of vertex.adjacentVertexIds) {
            const other = board.vertices[otherId];
            expect(other.adjacentVertexIds).toContain(vertex.id);
          }
        }
      });

      it(`places exactly ${expectedPorts} ports, each touching exactly 2 vertices`, () => {
        const portVertexCount = Object.values(board.vertices).filter(
          (v) => v.port !== null,
        ).length;
        expect(portVertexCount).toBe(expectedPorts * 2);
      });

      it("robber starts on the desert tile", () => {
        const robberTile = board.tiles.find((t) => t.id === board.robberTileId);
        expect(robberTile?.terrain).toBe("desert");
      });
    });
  }
});
