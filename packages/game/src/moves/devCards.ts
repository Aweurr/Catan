import { INVALID_MOVE } from "boardgame.io/core";
import type { Move } from "boardgame.io";
import { RESOURCE_COST, type DevCardType, type GameState, type Resource } from "../types";
import { logPlayer, logResource, logText } from "../log";
import { updateLargestArmy } from "../rules/largestArmy";
import { checkWinCondition } from "../rules/winCheck";
import { applyMoveRobberAndSteal } from "./robber";
import { canAfford, pay } from "./building";

export const buyDevCard: Move<GameState> = ({ G, playerID, events }) => {
  if (G.devCardDeck.length === 0) return INVALID_MOVE;
  if (!canAfford(G, playerID, RESOURCE_COST.devCard)) return INVALID_MOVE;

  pay(G, playerID, RESOURCE_COST.devCard);
  const card = G.devCardDeck.pop() as DevCardType;
  const player = G.players[playerID];
  if (card === "victoryPoint") {
    player.devCards.push(card);
  } else {
    player.devCardsBoughtThisTurn.push(card);
  }
  G.log.push([logPlayer(playerID), logText(" achète une carte développement.")]);

  checkWinCondition({ G, events });
};

function takePlayableCard(
  G: GameState,
  playerID: string,
  cardType: DevCardType,
): boolean {
  const player = G.players[playerID];
  const idx = player.devCards.indexOf(cardType);
  if (idx === -1) return false;
  player.devCards.splice(idx, 1);
  return true;
}

export const playKnight: Move<GameState> = (
  { G, playerID, events, random },
  tileId: string,
  victimPlayerID: string | null,
) => {
  if (!takePlayableCard(G, playerID, "knight")) return INVALID_MOVE;

  const result = applyMoveRobberAndSteal(
    G,
    playerID,
    tileId,
    victimPlayerID,
    () => random.Number(),
  );
  if (result === INVALID_MOVE) return INVALID_MOVE;

  G.players[playerID].knightsPlayed += 1;
  G.log.push([logPlayer(playerID), logText(" joue un chevalier.")]);
  updateLargestArmy(G);
  checkWinCondition({ G, events });
};

export const playRoadBuilding: Move<GameState> = ({ G, playerID }) => {
  if (!takePlayableCard(G, playerID, "roadBuilding")) return INVALID_MOVE;
  G.freeRoadsRemaining += Math.min(2, G.players[playerID].roadsLeft);
  G.log.push([logPlayer(playerID), logText(" joue Construction de route.")]);
};

export const playYearOfPlenty: Move<GameState> = (
  { G, playerID },
  resourceA: Resource,
  resourceB: Resource,
) => {
  if (!takePlayableCard(G, playerID, "yearOfPlenty")) return INVALID_MOVE;
  for (const resource of [resourceA, resourceB]) {
    if (G.bank[resource] <= 0) continue;
    G.bank[resource] -= 1;
    G.players[playerID].resources[resource] += 1;
  }
  G.log.push([
    logPlayer(playerID),
    logText(" joue Année d'abondance et pioche "),
    logResource(resourceA),
    logText(", "),
    logResource(resourceB),
    logText("."),
  ]);
};

export const playMonopoly: Move<GameState> = (
  { G, playerID },
  resource: Resource,
) => {
  if (!takePlayableCard(G, playerID, "monopoly")) return INVALID_MOVE;
  let total = 0;
  for (const otherID of Object.keys(G.players)) {
    if (otherID === playerID) continue;
    const amount = G.players[otherID].resources[resource];
    G.players[otherID].resources[resource] = 0;
    total += amount;
  }
  G.players[playerID].resources[resource] += total;
  G.log.push([
    logPlayer(playerID),
    logText(" joue Monopole sur "),
    logResource(resource),
    logText(` et récupère ${total} carte(s).`),
  ]);
};
