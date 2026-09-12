import { describe, expect, it } from "vitest";
import { bestRateFor, canMaritimeTrade } from "../rules/bank";
import type { GameState } from "../types";

function fakeState(vertexPorts: Record<string, string | null>, buildingOwner = "0"): GameState {
  const vertices: GameState["board"]["vertices"] = {};
  const buildings: GameState["buildings"] = {};
  for (const [vertexId, port] of Object.entries(vertexPorts)) {
    vertices[vertexId] = {
      id: vertexId,
      x: 0,
      y: 0,
      tileIds: [],
      adjacentVertexIds: [],
      edgeIds: [],
      port: port as any,
    };
    buildings[vertexId] = { vertexId, playerID: buildingOwner, type: "settlement" };
  }
  return {
    numPlayers: 2,
    board: { tiles: [], vertices, edges: {}, robberTileId: "" },
    players: {
      "0": {
        playerID: "0",
        color: "red",
        name: "A",
        resources: { wood: 10, brick: 10, sheep: 10, wheat: 10, ore: 10 },
        devCards: [],
        devCardsBoughtThisTurn: [],
        knightsPlayed: 0,
        roadsLeft: 15,
        settlementsLeft: 5,
        citiesLeft: 4,
      },
      "1": {
        playerID: "1",
        color: "blue",
        name: "B",
        resources: { wood: 10, brick: 10, sheep: 10, wheat: 10, ore: 10 },
        devCards: [],
        devCardsBoughtThisTurn: [],
        knightsPlayed: 0,
        roadsLeft: 15,
        settlementsLeft: 5,
        citiesLeft: 4,
      },
    },
    bank: { wood: 19, brick: 19, sheep: 19, wheat: 19, ore: 19 },
    devCardDeck: [],
    buildings,
    roads: {},
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

describe("bestRateFor", () => {
  it("defaults to 4:1 with no ports", () => {
    const state = fakeState({});
    expect(bestRateFor(state, "0", "wood")).toBe(4);
  });

  it("gives 3:1 with a generic port", () => {
    const state = fakeState({ v1: "generic" });
    expect(bestRateFor(state, "0", "wood")).toBe(3);
  });

  it("gives 2:1 only for the specific resource of a specialized port", () => {
    const state = fakeState({ v1: "wood" });
    expect(bestRateFor(state, "0", "wood")).toBe(2);
    expect(bestRateFor(state, "0", "brick")).toBe(4);
  });

  it("prefers the specific 2:1 rate over a generic port for the same resource", () => {
    const state = fakeState({ v1: "generic", v2: "wood" });
    expect(bestRateFor(state, "0", "wood")).toBe(2);
    expect(bestRateFor(state, "0", "brick")).toBe(3);
  });

  it("does not grant a port rate to a player who doesn't own a building there", () => {
    const state = fakeState({ v1: "wood" }, "1");
    expect(bestRateFor(state, "0", "wood")).toBe(4);
  });
});

describe("canMaritimeTrade", () => {
  it("accepts a trade at exactly the player's best rate", () => {
    const state = fakeState({ v1: "wood" });
    expect(canMaritimeTrade(state, "0", "wood", 2, "brick", 1)).toBe(true);
  });

  it("rejects a trade at the wrong rate", () => {
    const state = fakeState({ v1: "wood" });
    expect(canMaritimeTrade(state, "0", "wood", 3, "brick", 1)).toBe(false);
    expect(canMaritimeTrade(state, "0", "wood", 4, "brick", 1)).toBe(false);
  });

  it("rejects trading a resource for itself", () => {
    const state = fakeState({});
    expect(canMaritimeTrade(state, "0", "wood", 4, "wood", 1)).toBe(false);
  });
});
