import type { Move } from "boardgame.io";
import type { GameState } from "../types";
import { computeProduction, applyProduction } from "../rules/production";

function totalHandSize(state: GameState, playerID: string): number {
  return Object.values(state.players[playerID].resources).reduce(
    (a, b) => a + b,
    0,
  );
}

export const rollDice: Move<GameState> = ({ G, random, events }) => {
  const d1 = random.Die(6);
  const d2 = random.Die(6);
  const total = d1 + d2;
  G.lastDiceRoll = [d1, d2];
  G.log.push(`Dés : ${d1} + ${d2} = ${total}.`);

  if (total === 7) {
    const overLimit = Object.keys(G.players).filter(
      (playerID) => totalHandSize(G, playerID) > 7,
    );
    G.pendingDiscards = {};
    for (const playerID of overLimit) {
      G.pendingDiscards[playerID] = Math.floor(totalHandSize(G, playerID) / 2);
    }

    if (overLimit.length > 0) {
      events.setActivePlayers({
        value: Object.fromEntries(
          overLimit.map((playerID) => [
            playerID,
            { stage: "discard", minMoves: 1, maxMoves: 1 },
          ]),
        ),
        next: { currentPlayer: "moveRobber" },
      });
    } else {
      events.setActivePlayers({ currentPlayer: "moveRobber" });
    }
    return;
  }

  const { gains, shortages } = computeProduction(G, total);
  applyProduction(G, gains);
  for (const resource of shortages) {
    G.log.push(
      `Pas assez de ${resource} dans la banque : personne ne reçoit cette ressource ce tour-ci.`,
    );
  }

  events.setActivePlayers({ currentPlayer: "actions", others: "respondToTrade" });
};

export const endTurn: Move<GameState> = ({ G, events }) => {
  G.freeRoadsRemaining = 0;
  G.trades = [];
  events.endTurn();
};
