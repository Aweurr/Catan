import { INVALID_MOVE } from "boardgame.io/core";
import type { Move } from "boardgame.io";
import type { GameState, Resource } from "../types";

function countBuildingsFor(G: GameState, playerID: string): number {
  return Object.values(G.buildings).filter((b) => b.playerID === playerID).length;
}

export const placeInitialSettlement: Move<GameState> = (
  { G, playerID, events },
  vertexId: string,
) => {
  const vertex = G.board.vertices[vertexId];
  if (!vertex) return INVALID_MOVE;
  if (G.buildings[vertexId]) return INVALID_MOVE;
  if (vertex.adjacentVertexIds.some((v) => G.buildings[v])) return INVALID_MOVE;

  G.buildings[vertexId] = { vertexId, playerID, type: "settlement" };
  G.players[playerID].settlementsLeft -= 1;
  G.log.push(`${G.players[playerID].name} place sa colonie de départ.`);

  const isSecondSettlement = countBuildingsFor(G, playerID) === 2;
  if (isSecondSettlement) {
    for (const tileId of vertex.tileIds) {
      const tile = G.board.tiles.find((t) => t.id === tileId);
      if (!tile || tile.terrain === "desert") continue;
      const resource = tile.terrain as Resource;
      if (G.bank[resource] > 0) {
        G.players[playerID].resources[resource] += 1;
        G.bank[resource] -= 1;
      }
    }
  }

  events.setStage("road");
};

export const placeInitialRoad: Move<GameState> = (
  { G, playerID, events },
  edgeId: string,
) => {
  const edge = G.board.edges[edgeId];
  if (!edge) return INVALID_MOVE;
  if (G.roads[edgeId]) return INVALID_MOVE;

  const touchesOwnSettlement = edge.vertexIds.some(
    (v) => G.buildings[v]?.playerID === playerID,
  );
  if (!touchesOwnSettlement) return INVALID_MOVE;

  G.roads[edgeId] = { edgeId, playerID };
  G.players[playerID].roadsLeft -= 1;
  G.log.push(`${G.players[playerID].name} place sa route de départ.`);

  G.setupStep += 1;
  events.endTurn();
};
