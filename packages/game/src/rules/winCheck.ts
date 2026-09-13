import type { GameState } from "../types";
import { logPlayer, logText } from "../log";
import { winnerOf } from "./victoryPoints";

interface EndGameEvent {
  endGame: (arg?: unknown) => void;
}

export function checkWinCondition({
  G,
  events,
}: {
  G: GameState;
  events: EndGameEvent;
}): void {
  const winnerID = winnerOf(G);
  if (winnerID && !G.winnerID) {
    G.winnerID = winnerID;
    G.log.push([logPlayer(winnerID), logText(" remporte la partie !")]);
    events.endGame({ winnerID });
  }
}
