import { MIN_LONGEST_ROAD_LENGTH } from "../types";
import type { GameState } from "../types";

/**
 * Longest simple path (by edge count) through a player's own road network.
 * A path may pass through a vertex more than once (loops/branches are
 * allowed by the official rules), but it is cut short the moment it reaches
 * a vertex occupied by an *opponent's* settlement or city — the path can end
 * there, but cannot continue past it.
 */
export function longestRoadLength(state: GameState, playerID: string): number {
  const ownEdges = Object.values(state.roads).filter(
    (r) => r.playerID === playerID,
  );
  if (ownEdges.length === 0) return 0;

  const vertexToEdges = new Map<string, string[]>();
  for (const road of ownEdges) {
    const edge = state.board.edges[road.edgeId];
    for (const v of edge.vertexIds) {
      if (!vertexToEdges.has(v)) vertexToEdges.set(v, []);
      vertexToEdges.get(v)!.push(edge.id);
    }
  }

  function isBlocked(vertexId: string): boolean {
    const building = state.buildings[vertexId];
    return !!building && building.playerID !== playerID;
  }

  function dfs(vertexId: string, visited: Set<string>): number {
    let best = 0;
    for (const edgeId of vertexToEdges.get(vertexId) ?? []) {
      if (visited.has(edgeId)) continue;
      const edge = state.board.edges[edgeId];
      const other =
        edge.vertexIds[0] === vertexId ? edge.vertexIds[1] : edge.vertexIds[0];
      const nextVisited = new Set(visited);
      nextVisited.add(edgeId);
      const extra = isBlocked(other) ? 0 : dfs(other, nextVisited);
      best = Math.max(best, 1 + extra);
    }
    return best;
  }

  let longest = 0;
  for (const vertexId of vertexToEdges.keys()) {
    longest = Math.max(longest, dfs(vertexId, new Set()));
  }
  return longest;
}

/**
 * Recomputes every player's longest road and reassigns the "longest road"
 * bonus. The current holder keeps it on a tie (official rule); a challenger
 * must strictly exceed both 5 roads and the current holder's length.
 */
export function updateLongestRoad(state: GameState): void {
  const lengths: Record<string, number> = {};
  for (const playerID of Object.keys(state.players)) {
    lengths[playerID] = longestRoadLength(state, playerID);
  }

  const currentHolder = state.longestRoadPlayerID;
  const currentLength = currentHolder ? lengths[currentHolder] : 0;

  if (currentHolder && currentLength < MIN_LONGEST_ROAD_LENGTH) {
    state.longestRoadPlayerID = null;
  }

  let bestPlayerID = state.longestRoadPlayerID;
  let bestLength = bestPlayerID ? lengths[bestPlayerID] : 0;

  for (const [playerID, length] of Object.entries(lengths)) {
    if (length < MIN_LONGEST_ROAD_LENGTH) continue;
    if (length > bestLength) {
      bestLength = length;
      bestPlayerID = playerID;
    }
  }

  state.longestRoadPlayerID = bestPlayerID;
}
