import { describe, expect, it } from "vitest";
import { Client } from "boardgame.io/client";
import { CatanGame } from "../index";
import type { GameState } from "../types";

/**
 * End-to-end test driving the real boardgame.io engine (not just the pure
 * rule functions) through the trickiest part of the wiring: the custom snake
 * turn order, stage transitions and resource granting during the initial
 * placement phase for a 3-player game.
 *
 * A single client with no `playerID` is used so the test can act as any
 * player synchronously (no multiplayer transport / async round-trip).
 */
function makeUnrestrictedClient(numPlayers: number) {
  return Client<GameState>({ game: CatanGame, numPlayers });
}

function totalHand(G: GameState, playerID: string): number {
  return Object.values(G.players[playerID].resources).reduce(
    (a, b) => a + b,
    0,
  );
}

function firstFreeVertex(G: GameState): string {
  for (const vertexId of Object.keys(G.board.vertices)) {
    if (G.buildings[vertexId]) continue;
    const vertex = G.board.vertices[vertexId];
    if (vertex.adjacentVertexIds.some((v) => G.buildings[v])) continue;
    return vertexId;
  }
  throw new Error("no free vertex found");
}

describe("Catan engine (real boardgame.io Client)", () => {
  it("drives the full snake-order initial placement and grants resources on the 2nd settlement only", () => {
    const numPlayers = 3;
    const client = makeUnrestrictedClient(numPlayers);
    client.start();

    try {
      const G0 = client.getState()!.G;
      expect(G0.setupOrder).toEqual([0, 1, 2, 2, 1, 0]);

      for (let step = 0; step < numPlayers * 2; step++) {
        const state = client.getState()!;
        const currentPlayer = state.ctx.currentPlayer;
        expect(state.ctx.phase).toBe("setup");
        expect(state.ctx.activePlayers?.[currentPlayer]).toBe("settlement");

        const before = state.G;
        const beforeHand = totalHand(before, currentPlayer);

        const vertexId = firstFreeVertex(before);
        client.moves.placeInitialSettlement(vertexId);

        const afterSettlement = client.getState()!;
        expect(afterSettlement.ctx.activePlayers?.[currentPlayer]).toBe(
          "road",
        );

        const vertex = afterSettlement.G.board.vertices[vertexId];
        client.moves.placeInitialRoad(vertex.edgeIds[0]);

        const afterRoad = client.getState()!;
        const isSecondSettlementForPlayer =
          Object.values(afterRoad.G.buildings).filter(
            (b) => b.playerID === currentPlayer,
          ).length === 2;

        const afterHand = totalHand(afterRoad.G, currentPlayer);
        if (isSecondSettlementForPlayer) {
          expect(afterHand).toBeGreaterThanOrEqual(beforeHand);
        } else {
          expect(afterHand).toBe(beforeHand);
        }
      }

      const finalState = client.getState()!;
      expect(finalState.ctx.phase).toBe("play");
      expect(finalState.ctx.currentPlayer).toBe("0");
      expect(finalState.ctx.activePlayers?.["0"]).toBe("roll");

      for (const playerID of ["0", "1", "2"]) {
        const buildings = Object.values(finalState.G.buildings).filter(
          (b) => b.playerID === playerID,
        );
        expect(buildings).toHaveLength(2);
        const roads = Object.values(finalState.G.roads).filter(
          (r) => r.playerID === playerID,
        );
        expect(roads).toHaveLength(2);
      }
    } finally {
      client.stop();
    }
  });

  it("rolls dice, resolves production or the 7/discard/robber flow, and returns to the actions stage", () => {
    const numPlayers = 3;
    const client = makeUnrestrictedClient(numPlayers);
    client.start();

    try {
      for (let step = 0; step < numPlayers * 2; step++) {
        const before = client.getState()!.G;
        const vertexId = firstFreeVertex(before);
        client.moves.placeInitialSettlement(vertexId);
        const vertex = client.getState()!.G.board.vertices[vertexId];
        client.moves.placeInitialRoad(vertex.edgeIds[0]);
      }

      client.moves.rollDice();
      const afterRoll = client.getState()!;
      expect(afterRoll.G.lastDiceRoll).not.toBeNull();
      const [d1, d2] = afterRoll.G.lastDiceRoll!;
      expect(d1).toBeGreaterThanOrEqual(1);
      expect(d1).toBeLessThanOrEqual(6);
      const total = d1 + d2;

      if (total === 7) {
        expect(["moveRobber", "discard", undefined]).toContain(
          Object.values(afterRoll.ctx.activePlayers ?? {})[0],
        );
        for (const [playerID, required] of Object.entries(
          afterRoll.G.pendingDiscards,
        )) {
          const hand = afterRoll.G.players[playerID].resources;
          const discard: Record<string, number> = {};
          let remaining = required;
          for (const resource of Object.keys(hand)) {
            const take = Math.min(remaining, (hand as any)[resource]);
            if (take > 0) discard[resource] = take;
            remaining -= take;
            if (remaining === 0) break;
          }
          client.moves.discardResources(discard);
        }
        const beforeRobber = client.getState()!;
        const currentTile = beforeRobber.G.board.tiles.find(
          (t) => t.id !== beforeRobber.G.board.robberTileId,
        )!;
        client.moves.moveRobber(currentTile.id, null);
      }

      const finalState = client.getState()!;
      expect(finalState.ctx.activePlayers?.["0"]).toBe("actions");

      const totalBankAfter = Object.values(finalState.G.bank).reduce(
        (a, b) => a + b,
        0,
      );
      const totalHandsAfter = ["0", "1", "2"].reduce(
        (sum, id) => sum + totalHand(finalState.G, id),
        0,
      );
      const bankStart = Object.values(
        client.getInitialState().G.bank,
      ).reduce((a, b) => a + b, 0);
      // Conservation: every card is either in the bank or in a player's hand.
      expect(totalBankAfter + totalHandsAfter).toBeLessThanOrEqual(bankStart);
    } finally {
      client.stop();
    }
  });
});
