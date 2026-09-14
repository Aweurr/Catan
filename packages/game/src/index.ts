import type { Game } from "boardgame.io";
import { createInitialState } from "./setup";
import { phases } from "./phases";
import type { GameState } from "./types";

export interface CatanSetupData {
  playerNames?: Record<string, string>;
}

export const CatanGame: Game<GameState, Record<string, unknown>, CatanSetupData> = {
  name: "catan",
  minPlayers: 3,
  maxPlayers: 6,

  setup: ({ ctx, random }, setupData) => {
    const playerIDs = Array.from({ length: ctx.numPlayers }, (_, i) => String(i));
    const playerNames = setupData?.playerNames ?? {};
    return createInitialState(playerIDs, playerNames, () => random.Number());
  },

  phases,

  playerView: ({ G, playerID }) => {
    if (!playerID) return G;
    // Opponents' exact resource and development cards are hidden — only the
    // counts are public information in real Catan. The deck's remaining
    // draw order is hidden too (only its length, i.e. cards left, matters).
    return {
      ...G,
      devCardDeck: { length: G.devCardDeck.length },
      players: Object.fromEntries(
        Object.entries(G.players).map(([id, player]) => {
          if (id === playerID) return [id, player];
          const resourceCount = Object.values(player.resources).reduce(
            (a, b) => a + b,
            0,
          );
          return [
            id,
            {
              ...player,
              resources: { total: resourceCount },
              devCards: { length: player.devCards.length },
              devCardsBoughtThisTurn: {
                length: player.devCardsBoughtThisTurn.length,
              },
            },
          ];
        }),
      ),
    };
  },
};

export type { GameState };
export * from "./types";
export * from "./log";
export { buildBoard } from "./board";
export { publicVictoryPoints, totalVictoryPoints } from "./rules/victoryPoints";
export { bestRateFor } from "./rules/bank";
