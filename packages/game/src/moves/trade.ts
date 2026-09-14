import { INVALID_MOVE } from "boardgame.io/core";
import type { Move } from "boardgame.io";
import type { GameState, Resource, ResourceHand, TradeOffer } from "../types";
import { logPlayer, logResource, logText, type LogPart } from "../log";
import { canMaritimeTrade, applyMaritimeTrade } from "../rules/bank";

function nextTradeId(G: GameState): string {
  return `trade-${G.trades.length}-${Date.now()}`;
}

function hasEnough(hand: ResourceHand, want: Partial<ResourceHand>): boolean {
  return Object.entries(want).every(([resource, amount]) => {
    const available = hand[resource as Resource];
    // On the client, boardgame.io runs moves optimistically against the
    // player-view-filtered state, where another player's `resources` is
    // replaced by `{ total }` (to hide their exact hand) — none of the
    // individual resource keys are present. Trust it in that case; the
    // authoritative server-side run always has the real hand and is the one
    // that actually decides whether the trade goes through.
    if (available === undefined) return true;
    return available >= (amount ?? 0);
  });
}

export const offerTrade: Move<GameState> = (
  { G, playerID },
  give: Partial<ResourceHand>,
  want: Partial<ResourceHand>,
  toPlayerIDs: string[] = [],
) => {
  if (!hasEnough(G.players[playerID].resources, give)) return INVALID_MOVE;

  const offer: TradeOffer = {
    id: nextTradeId(G),
    fromPlayerID: playerID,
    toPlayerIDs,
    give,
    want,
    status: "pending",
    interestedPlayerIDs: [],
    declinedPlayerIDs: [],
  };
  G.trades.push(offer);
  G.log.push([logPlayer(playerID), logText(" propose un échange.")]);
};

/** A candidate recipient signals they're willing to accept these terms. The
 * offering player picks who to actually trade with via `finalizeTrade`. */
export const acceptTrade: Move<GameState> = ({ G, playerID }, tradeId: string) => {
  const trade = G.trades.find((t) => t.id === tradeId);
  if (!trade || trade.status !== "pending") return INVALID_MOVE;
  if (trade.fromPlayerID === playerID) return INVALID_MOVE;
  if (trade.toPlayerIDs.length > 0 && !trade.toPlayerIDs.includes(playerID)) {
    return INVALID_MOVE;
  }
  if (!hasEnough(G.players[playerID].resources, trade.want)) return INVALID_MOVE;
  if (trade.interestedPlayerIDs.includes(playerID)) return INVALID_MOVE;

  trade.declinedPlayerIDs = trade.declinedPlayerIDs.filter((id) => id !== playerID);
  trade.interestedPlayerIDs.push(playerID);
  G.log.push([
    logPlayer(playerID),
    logText(" est intéressé(e) par l'échange de "),
    logPlayer(trade.fromPlayerID),
    logText("."),
  ]);
};

export const rejectTrade: Move<GameState> = ({ G, playerID }, tradeId: string) => {
  const trade = G.trades.find((t) => t.id === tradeId);
  if (!trade || trade.status !== "pending") return INVALID_MOVE;
  if (trade.fromPlayerID === playerID) return INVALID_MOVE;

  trade.interestedPlayerIDs = trade.interestedPlayerIDs.filter((id) => id !== playerID);
  if (!trade.declinedPlayerIDs.includes(playerID)) trade.declinedPlayerIDs.push(playerID);
};

/** Only the offering player can call this, to pick which interested player to
 * actually exchange resources with. */
export const finalizeTrade: Move<GameState> = (
  { G, playerID },
  tradeId: string,
  withPlayerID: string,
) => {
  const trade = G.trades.find((t) => t.id === tradeId);
  if (!trade || trade.status !== "pending") return INVALID_MOVE;
  if (trade.fromPlayerID !== playerID) return INVALID_MOVE;
  if (!trade.interestedPlayerIDs.includes(withPlayerID)) return INVALID_MOVE;
  if (!hasEnough(G.players[playerID].resources, trade.give)) return INVALID_MOVE;
  if (!hasEnough(G.players[withPlayerID].resources, trade.want)) return INVALID_MOVE;

  const from = G.players[playerID];
  const to = G.players[withPlayerID];
  for (const [resource, amount] of Object.entries(trade.give) as [
    Resource,
    number,
  ][]) {
    from.resources[resource] -= amount;
    to.resources[resource] += amount;
  }
  for (const [resource, amount] of Object.entries(trade.want) as [
    Resource,
    number,
  ][]) {
    to.resources[resource] -= amount;
    from.resources[resource] += amount;
  }

  G.trades = G.trades.filter((t) => t.id !== tradeId);
  G.log.push([logPlayer(playerID), logText(" échange avec "), logPlayer(withPlayerID), logText(".")]);
};

export const cancelTrade: Move<GameState> = ({ G, playerID }, tradeId: string) => {
  const trade = G.trades.find((t) => t.id === tradeId);
  if (!trade || trade.fromPlayerID !== playerID) return INVALID_MOVE;
  G.trades = G.trades.filter((t) => t.id !== tradeId);
};

export const maritimeTrade: Move<GameState> = (
  { G, playerID },
  give: Resource,
  giveAmount: number,
  receive: Resource,
) => {
  if (!canMaritimeTrade(G, playerID, give, giveAmount, receive, 1)) {
    return INVALID_MOVE;
  }
  applyMaritimeTrade(G, playerID, give, giveAmount, receive, 1);
  const parts: LogPart[] = [
    logPlayer(playerID),
    logText(" échange "),
    logResource(give, giveAmount),
    logText(" contre "),
    logResource(receive, 1),
    logText(" (banque/port)."),
  ];
  G.log.push(parts);
};
