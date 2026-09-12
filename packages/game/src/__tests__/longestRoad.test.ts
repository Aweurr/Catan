import { describe, expect, it } from "vitest";
import { longestRoadLength, updateLongestRoad } from "../rules/longestRoad";
import type { Edge, GameState } from "../types";

function makeEdge(id: string, a: string, b: string): Edge {
  return { id, vertexIds: [a, b], tileIds: [] };
}

/** Builds a minimal fake GameState with just enough structure for road-graph tests. */
function fakeState(
  edgeDefs: [string, string, string][],
  roadOwners: Record<string, string>,
  buildings: Record<string, string> = {},
  players: string[] = ["0", "1"],
): GameState {
  const edges: Record<string, Edge> = {};
  for (const [id, a, b] of edgeDefs) edges[id] = makeEdge(id, a, b);

  const roads: GameState["roads"] = {};
  for (const [edgeId, playerID] of Object.entries(roadOwners)) {
    roads[edgeId] = { edgeId, playerID };
  }

  const buildingsState: GameState["buildings"] = {};
  for (const [vertexId, playerID] of Object.entries(buildings)) {
    buildingsState[vertexId] = { vertexId, playerID, type: "settlement" };
  }

  return {
    numPlayers: players.length,
    board: { tiles: [], vertices: {}, edges, robberTileId: "" },
    players: Object.fromEntries(
      players.map((p) => [
        p,
        {
          playerID: p,
          color: "red",
          name: p,
          resources: { wood: 0, brick: 0, sheep: 0, wheat: 0, ore: 0 },
          devCards: [],
          devCardsBoughtThisTurn: [],
          knightsPlayed: 0,
          roadsLeft: 15,
          settlementsLeft: 5,
          citiesLeft: 4,
        },
      ]),
    ),
    bank: { wood: 19, brick: 19, sheep: 19, wheat: 19, ore: 19 },
    devCardDeck: [],
    buildings: buildingsState,
    roads,
    longestRoadPlayerID: null,
    largestArmyPlayerID: null,
    lastDiceRoll: null,
    trades: [],
    pendingDiscards: {},
    log: [],
    setupOrder: [],
    setupStep: 0,
    freeRoadsRemaining: 0,
    winnerID: null,
  };
}

describe("longestRoadLength", () => {
  it("counts a straight chain of roads", () => {
    const state = fakeState(
      [
        ["e1", "v1", "v2"],
        ["e2", "v2", "v3"],
        ["e3", "v3", "v4"],
        ["e4", "v4", "v5"],
      ],
      { e1: "0", e2: "0", e3: "0", e4: "0" },
    );
    expect(longestRoadLength(state, "0")).toBe(4);
  });

  it("is cut short by an opponent's settlement in the middle", () => {
    const state = fakeState(
      [
        ["e1", "v1", "v2"],
        ["e2", "v2", "v3"],
        ["e3", "v3", "v4"],
        ["e4", "v4", "v5"],
      ],
      { e1: "0", e2: "0", e3: "0", e4: "0" },
      { v3: "1" },
    );
    expect(longestRoadLength(state, "0")).toBe(2);
  });

  it("is not affected by the player's own settlement in the middle", () => {
    const state = fakeState(
      [
        ["e1", "v1", "v2"],
        ["e2", "v2", "v3"],
        ["e3", "v3", "v4"],
        ["e4", "v4", "v5"],
      ],
      { e1: "0", e2: "0", e3: "0", e4: "0" },
      { v3: "0" },
    );
    expect(longestRoadLength(state, "0")).toBe(4);
  });

  it("finds the best path through a branching (star) network", () => {
    const state = fakeState(
      [
        ["e1", "center", "v1"],
        ["e2", "center", "v2"],
        ["e3", "center", "v3"],
      ],
      { e1: "0", e2: "0", e3: "0" },
    );
    // Only 2 of the 3 spokes can be used in a single simple path through the center.
    expect(longestRoadLength(state, "0")).toBe(2);
  });

  it("only counts edges owned by the player", () => {
    const state = fakeState(
      [
        ["e1", "v1", "v2"],
        ["e2", "v2", "v3"],
      ],
      { e1: "0", e2: "1" },
    );
    expect(longestRoadLength(state, "0")).toBe(1);
  });
});

describe("updateLongestRoad", () => {
  it("awards the bonus once a player reaches 5 roads", () => {
    const state = fakeState(
      [
        ["e1", "v1", "v2"],
        ["e2", "v2", "v3"],
        ["e3", "v3", "v4"],
        ["e4", "v4", "v5"],
        ["e5", "v5", "v6"],
      ],
      { e1: "0", e2: "0", e3: "0", e4: "0", e5: "0" },
    );
    updateLongestRoad(state);
    expect(state.longestRoadPlayerID).toBe("0");
  });

  it("keeps the bonus with the current holder on a tie", () => {
    const state = fakeState(
      [
        ["e1", "v1", "v2"],
        ["e2", "v2", "v3"],
        ["e3", "v3", "v4"],
        ["e4", "v4", "v5"],
        ["e5", "v5", "v6"],
        ["f1", "w1", "w2"],
        ["f2", "w2", "w3"],
        ["f3", "w3", "w4"],
        ["f4", "w4", "w5"],
        ["f5", "w5", "w6"],
      ],
      {
        e1: "0",
        e2: "0",
        e3: "0",
        e4: "0",
        e5: "0",
        f1: "1",
        f2: "1",
        f3: "1",
        f4: "1",
        f5: "1",
      },
    );
    state.longestRoadPlayerID = "0";
    updateLongestRoad(state);
    expect(state.longestRoadPlayerID).toBe("0");
  });

  it("transfers the bonus once a challenger strictly exceeds the holder", () => {
    const state = fakeState(
      [
        ["e1", "v1", "v2"],
        ["e2", "v2", "v3"],
        ["e3", "v3", "v4"],
        ["e4", "v4", "v5"],
        ["e5", "v5", "v6"],
        ["f1", "w1", "w2"],
        ["f2", "w2", "w3"],
        ["f3", "w3", "w4"],
        ["f4", "w4", "w5"],
        ["f5", "w5", "w6"],
        ["f6", "w6", "w7"],
      ],
      {
        e1: "0",
        e2: "0",
        e3: "0",
        e4: "0",
        e5: "0",
        f1: "1",
        f2: "1",
        f3: "1",
        f4: "1",
        f5: "1",
        f6: "1",
      },
    );
    state.longestRoadPlayerID = "0";
    updateLongestRoad(state);
    expect(state.longestRoadPlayerID).toBe("1");
  });
});
