import type { GameState, Resource } from "../types";

export interface ProductionGain {
  playerID: string;
  resource: Resource;
  amount: number;
}

/**
 * Computes resource production for a dice roll. Tiles under the robber
 * produce nothing. If the bank doesn't hold enough of a resource to satisfy
 * every player due that resource in full, nobody receives that resource this
 * roll (official rule) — the affected players are returned in
 * `shortagePlayers` so the UI/log can explain why.
 */
export function computeProduction(
  state: GameState,
  diceTotal: number,
): { gains: ProductionGain[]; shortages: Resource[] } {
  const gains: ProductionGain[] = [];
  const totalsByResource: Partial<Record<Resource, number>> = {};

  for (const tile of state.board.tiles) {
    if (tile.number !== diceTotal) continue;
    if (tile.id === state.board.robberTileId) continue;
    if (tile.terrain === "desert") continue;
    const resource = tile.terrain as Resource;

    for (const vertexId of tile.vertexIds) {
      const building = state.buildings[vertexId];
      if (!building) continue;
      const amount = building.type === "city" ? 2 : 1;
      gains.push({ playerID: building.playerID, resource, amount });
      totalsByResource[resource] = (totalsByResource[resource] ?? 0) + amount;
    }
  }

  const shortages: Resource[] = [];
  for (const [resource, total] of Object.entries(totalsByResource) as [
    Resource,
    number,
  ][]) {
    if (total > state.bank[resource]) shortages.push(resource);
  }

  return {
    gains: gains.filter((g) => !shortages.includes(g.resource)),
    shortages,
  };
}

export function applyProduction(
  state: GameState,
  gains: ProductionGain[],
): void {
  for (const gain of gains) {
    const player = state.players[gain.playerID];
    player.resources[gain.resource] += gain.amount;
    state.bank[gain.resource] -= gain.amount;
  }
}
