import { INVALID_MOVE } from "boardgame.io/core";
import type { Move } from "boardgame.io";
import { RESOURCE_COST, type GameState } from "../types";
import { logPlayer, logText } from "../log";
import { updateLongestRoad } from "../rules/longestRoad";
import { checkWinCondition } from "../rules/winCheck";

function canAfford(state: GameState, playerID: string, cost: Record<string, number | undefined>): boolean {
  const hand = state.players[playerID].resources;
  return Object.entries(cost).every(
    ([resource, amount]) => (hand as any)[resource] >= (amount ?? 0),
  );
}

function pay(state: GameState, playerID: string, cost: Record<string, number | undefined>): void {
  const hand = state.players[playerID].resources;
  for (const [resource, amount] of Object.entries(cost)) {
    if (!amount) continue;
    (hand as any)[resource] -= amount;
    (state.bank as any)[resource] += amount;
  }
}

function vertexIsFree(state: GameState, vertexId: string): boolean {
  return !state.buildings[vertexId];
}

function distanceRuleSatisfied(state: GameState, vertexId: string): boolean {
  const vertex = state.board.vertices[vertexId];
  if (!vertex) return false;
  return vertex.adjacentVertexIds.every((v) => !state.buildings[v]);
}

function vertexConnectedToPlayerNetwork(
  state: GameState,
  playerID: string,
  vertexId: string,
): boolean {
  const vertex = state.board.vertices[vertexId];
  if (!vertex) return false;
  return vertex.edgeIds.some((edgeId) => state.roads[edgeId]?.playerID === playerID);
}

export const buildRoad: Move<GameState> = ({ G, playerID, events }, edgeId: string) => {
  const edge = G.board.edges[edgeId];
  if (!edge) return INVALID_MOVE;
  if (G.roads[edgeId]) return INVALID_MOVE;
  if (G.players[playerID].roadsLeft <= 0) return INVALID_MOVE;

  const touchesOwnNetwork = edge.vertexIds.some((vertexId) => {
    const building = G.buildings[vertexId];
    if (building?.playerID === playerID) return true;
    return vertexConnectedToPlayerNetwork(G, playerID, vertexId);
  });
  if (!touchesOwnNetwork) return INVALID_MOVE;

  const free = G.freeRoadsRemaining > 0;
  if (!free && !canAfford(G, playerID, RESOURCE_COST.road)) return INVALID_MOVE;

  if (free) {
    G.freeRoadsRemaining -= 1;
  } else {
    pay(G, playerID, RESOURCE_COST.road);
  }
  G.roads[edgeId] = { edgeId, playerID };
  G.players[playerID].roadsLeft -= 1;
  G.log.push([logPlayer(playerID), logText(" construit une route.")]);

  updateLongestRoad(G);
  checkWinCondition({ G, events });
};

export const buildSettlement: Move<GameState> = (
  { G, playerID, events },
  vertexId: string,
) => {
  if (!vertexIsFree(G, vertexId)) return INVALID_MOVE;
  if (!distanceRuleSatisfied(G, vertexId)) return INVALID_MOVE;
  if (G.players[playerID].settlementsLeft <= 0) return INVALID_MOVE;
  if (!vertexConnectedToPlayerNetwork(G, playerID, vertexId)) return INVALID_MOVE;
  if (!canAfford(G, playerID, RESOURCE_COST.settlement)) return INVALID_MOVE;

  pay(G, playerID, RESOURCE_COST.settlement);
  G.buildings[vertexId] = { vertexId, playerID, type: "settlement" };
  G.players[playerID].settlementsLeft -= 1;
  G.log.push([logPlayer(playerID), logText(" construit une colonie.")]);

  updateLongestRoad(G);
  checkWinCondition({ G, events });
};

export const buildCity: Move<GameState> = ({ G, playerID, events }, vertexId: string) => {
  const building = G.buildings[vertexId];
  if (!building || building.playerID !== playerID || building.type !== "settlement") {
    return INVALID_MOVE;
  }
  if (G.players[playerID].citiesLeft <= 0) return INVALID_MOVE;
  if (!canAfford(G, playerID, RESOURCE_COST.city)) return INVALID_MOVE;

  pay(G, playerID, RESOURCE_COST.city);
  building.type = "city";
  G.players[playerID].citiesLeft -= 1;
  G.players[playerID].settlementsLeft += 1;
  G.log.push([logPlayer(playerID), logText(" construit une ville.")]);

  checkWinCondition({ G, events });
};

export { distanceRuleSatisfied, vertexConnectedToPlayerNetwork, canAfford, pay };
