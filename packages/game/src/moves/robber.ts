import { INVALID_MOVE } from "boardgame.io/core";
import type { Move } from "boardgame.io";
import type { GameState, Resource } from "../types";
import { RESOURCES } from "../types";

function totalHandSize(state: GameState, playerID: string): number {
  return Object.values(state.players[playerID].resources).reduce(
    (a, b) => a + b,
    0,
  );
}

export const discardResources: Move<GameState> = (
  { G, playerID },
  discarded: Partial<Record<Resource, number>>,
) => {
  const required = G.pendingDiscards[playerID];
  if (required === undefined) return INVALID_MOVE;

  const total = Object.values(discarded).reduce((a, b) => a + (b ?? 0), 0);
  if (total !== required) return INVALID_MOVE;

  const hand = G.players[playerID].resources;
  for (const [resource, amount] of Object.entries(discarded) as [
    Resource,
    number,
  ][]) {
    if (amount > hand[resource]) return INVALID_MOVE;
  }

  for (const [resource, amount] of Object.entries(discarded) as [
    Resource,
    number,
  ][]) {
    hand[resource] -= amount;
    G.bank[resource] += amount;
  }
  delete G.pendingDiscards[playerID];
  G.log.push(`${G.players[playerID].name} défausse ${required} carte(s).`);
};

function tileNeighborsPlayerBuilding(
  G: GameState,
  tileId: string,
  victimPlayerID: string,
): boolean {
  const tile = G.board.tiles.find((t) => t.id === tileId);
  if (!tile) return false;
  return tile.vertexIds.some(
    (v) => G.buildings[v]?.playerID === victimPlayerID,
  );
}

export function applyMoveRobberAndSteal(
  G: GameState,
  playerID: string,
  tileId: string,
  victimPlayerID: string | null,
  randomNumber: () => number,
): typeof INVALID_MOVE | void {
  const tile = G.board.tiles.find((t) => t.id === tileId);
  if (!tile) return INVALID_MOVE;
  if (tileId === G.board.robberTileId) return INVALID_MOVE;

  G.board.robberTileId = tileId;
  G.log.push(`${G.players[playerID].name} déplace le voleur.`);

  if (victimPlayerID) {
    if (victimPlayerID === playerID) return INVALID_MOVE;
    if (!tileNeighborsPlayerBuilding(G, tileId, victimPlayerID)) {
      return INVALID_MOVE;
    }
    const victimHand = G.players[victimPlayerID].resources;
    const pool: Resource[] = [];
    for (const resource of RESOURCES) {
      for (let i = 0; i < victimHand[resource]; i++) pool.push(resource);
    }
    if (pool.length > 0) {
      const stolen = pool[Math.floor(randomNumber() * pool.length)];
      victimHand[stolen] -= 1;
      G.players[playerID].resources[stolen] += 1;
      G.log.push(
        `${G.players[playerID].name} vole une carte à ${G.players[victimPlayerID].name}.`,
      );
    }
  }
}

export const moveRobber: Move<GameState> = (
  { G, playerID, events, random },
  tileId: string,
  victimPlayerID: string | null,
) => {
  const result = applyMoveRobberAndSteal(
    G,
    playerID,
    tileId,
    victimPlayerID,
    () => random.Number(),
  );
  if (result === INVALID_MOVE) return INVALID_MOVE;
  events.setActivePlayers({ currentPlayer: "actions", others: "respondToTrade" });
};

export { totalHandSize };
