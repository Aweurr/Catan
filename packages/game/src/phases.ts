import { TurnOrder } from "boardgame.io/core";
import type { PhaseMap } from "boardgame.io";
import type { GameState } from "./types";
import { placeInitialRoad, placeInitialSettlement } from "./moves/placement";
import { buildCity, buildRoad, buildSettlement } from "./moves/building";
import { rollDice, endTurn } from "./moves/turn";
import { discardResources, moveRobber } from "./moves/robber";
import {
  buyDevCard,
  playKnight,
  playMonopoly,
  playRoadBuilding,
  playYearOfPlenty,
} from "./moves/devCards";
import {
  acceptTrade,
  cancelTrade,
  finalizeTrade,
  maritimeTrade,
  offerTrade,
  rejectTrade,
} from "./moves/trade";

export const phases: PhaseMap<GameState> = {
  setup: {
    start: true,
    next: "play",
    turn: {
      // `next` runs outside a move's Immer draft (G is read-only here), so
      // the step counter is advanced by placeInitialRoad itself and just
      // read back here.
      order: {
        first: () => 0,
        next: ({ G }) =>
          G.setupStep < G.setupOrder.length
            ? G.setupOrder[G.setupStep]
            : undefined,
      },
      activePlayers: { currentPlayer: "settlement" },
      stages: {
        settlement: { moves: { placeInitialSettlement } },
        road: { moves: { placeInitialRoad } },
      },
    },
  },

  play: {
    turn: {
      order: TurnOrder.RESET,
      activePlayers: { currentPlayer: "roll" },
      onBegin: ({ G, ctx }) => {
        const player = G.players[ctx.currentPlayer];
        player.devCards.push(...player.devCardsBoughtThisTurn);
        player.devCardsBoughtThisTurn = [];
      },
      stages: {
        roll: {
          moves: { rollDice },
        },
        discard: {
          moves: { discardResources },
        },
        moveRobber: {
          moves: { moveRobber },
        },
        actions: {
          moves: {
            buildRoad,
            buildSettlement,
            buildCity,
            buyDevCard,
            playKnight,
            playRoadBuilding,
            playYearOfPlenty,
            playMonopoly,
            offerTrade,
            cancelTrade,
            finalizeTrade,
            maritimeTrade,
            endTurn,
          },
        },
        respondToTrade: {
          moves: { acceptTrade, rejectTrade },
        },
      },
    },
  },
};
