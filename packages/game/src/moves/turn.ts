import type { Move } from "boardgame.io";
import type { GameState, Resource, ResourceHand } from "../types";
import { logPlayer, logResource, logText, type LogPart } from "../log";
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
  G.diceRollCounts[total] = (G.diceRollCounts[total] ?? 0) + 1;
  G.log.push([logText(`Dés : ${d1} + ${d2} = ${total}.`)]);

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

  const gainsByPlayer = new Map<string, Partial<ResourceHand>>();
  for (const gain of gains) {
    const bucket = gainsByPlayer.get(gain.playerID) ?? {};
    bucket[gain.resource] = (bucket[gain.resource] ?? 0) + gain.amount;
    gainsByPlayer.set(gain.playerID, bucket);
  }
  for (const [playerID, resources] of gainsByPlayer) {
    const entries = Object.entries(resources) as [Resource, number][];
    const parts: LogPart[] = [logPlayer(playerID), logText(" reçoit ")];
    entries.forEach(([resource, amount], i) => {
      parts.push(logResource(resource, amount));
      parts.push(logText(i < entries.length - 1 ? ", " : "."));
    });
    G.log.push(parts);
  }

  for (const resource of shortages) {
    G.log.push([
      logText("Pas assez de "),
      logResource(resource),
      logText(" dans la banque : personne ne reçoit cette ressource ce tour-ci."),
    ]);
  }

  events.setActivePlayers({ currentPlayer: "actions", others: "respondToTrade" });
};

export const endTurn: Move<GameState> = ({ G, events }) => {
  G.freeRoadsRemaining = 0;
  G.trades = [];
  events.endTurn();
};
