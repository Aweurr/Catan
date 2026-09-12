import type { GameState, Resource } from "../types";

/** Best bank/port exchange rate a player can get for a given resource: 2, 3 or 4 units per 1. */
export function bestRateFor(
  state: GameState,
  playerID: string,
  resource: Resource,
): number {
  let hasGenericPort = false;
  let hasSpecificPort = false;
  for (const vertexId of Object.keys(state.buildings)) {
    const building = state.buildings[vertexId];
    if (building.playerID !== playerID) continue;
    const port = state.board.vertices[vertexId]?.port;
    if (!port) continue;
    if (port === "generic") hasGenericPort = true;
    if (port === resource) hasSpecificPort = true;
  }
  if (hasSpecificPort) return 2;
  if (hasGenericPort) return 3;
  return 4;
}

export function canMaritimeTrade(
  state: GameState,
  playerID: string,
  give: Resource,
  giveAmount: number,
  receive: Resource,
  receiveAmount: number,
): boolean {
  if (give === receive) return false;
  if (receiveAmount !== 1) return false;
  const rate = bestRateFor(state, playerID, give);
  if (giveAmount !== rate) return false;
  if (state.players[playerID].resources[give] < giveAmount) return false;
  if (state.bank[receive] < receiveAmount) return false;
  return true;
}

export function applyMaritimeTrade(
  state: GameState,
  playerID: string,
  give: Resource,
  giveAmount: number,
  receive: Resource,
  receiveAmount: number,
): void {
  const player = state.players[playerID];
  player.resources[give] -= giveAmount;
  state.bank[give] += giveAmount;
  player.resources[receive] += receiveAmount;
  state.bank[receive] -= receiveAmount;
}
