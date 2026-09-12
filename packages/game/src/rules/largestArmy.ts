import { MIN_LARGEST_ARMY_SIZE } from "../types";
import type { GameState } from "../types";

/** Reassigns the "largest army" bonus. The current holder keeps it on a tie. */
export function updateLargestArmy(state: GameState): void {
  const currentHolder = state.largestArmyPlayerID;
  const currentSize = currentHolder
    ? state.players[currentHolder].knightsPlayed
    : 0;

  let bestPlayerID = currentHolder;
  let bestSize = currentSize;

  for (const player of Object.values(state.players)) {
    if (player.knightsPlayed < MIN_LARGEST_ARMY_SIZE) continue;
    if (player.knightsPlayed > bestSize) {
      bestSize = player.knightsPlayed;
      bestPlayerID = player.playerID;
    }
  }

  state.largestArmyPlayerID = bestPlayerID;
}
