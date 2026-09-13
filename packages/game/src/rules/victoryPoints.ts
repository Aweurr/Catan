import { VICTORY_POINTS_TO_WIN } from "../types";
import type { GameState } from "../types";

/** Public VP: visible to all players (excludes unrevealed VP dev cards). */
export function publicVictoryPoints(state: GameState, playerID: string): number {
  let vp = 0;
  for (const building of Object.values(state.buildings)) {
    if (building.playerID !== playerID) continue;
    vp += building.type === "city" ? 2 : 1;
  }
  if (state.longestRoadPlayerID === playerID) vp += 2;
  if (state.largestArmyPlayerID === playerID) vp += 2;
  return vp;
}

/** Total VP including hidden victory point development cards, used for the win check.
 *
 * On the client, boardgame.io runs moves optimistically against the
 * player-view-filtered state, where other players' `devCards` is replaced by
 * `{ length }` (to keep them secret) instead of the real array. Guard against
 * that shape here so the optimistic run doesn't throw — the authoritative
 * server-side run always has the real array and computes the correct result.
 */
export function totalVictoryPoints(state: GameState, playerID: string): number {
  const player = state.players[playerID];
  const hiddenVP = Array.isArray(player.devCards)
    ? player.devCards.filter((c) => c === "victoryPoint").length
    : 0;
  return publicVictoryPoints(state, playerID) + hiddenVP;
}

export function winnerOf(state: GameState): string | null {
  for (const playerID of Object.keys(state.players)) {
    if (totalVictoryPoints(state, playerID) >= VICTORY_POINTS_TO_WIN) {
      return playerID;
    }
  }
  return null;
}
