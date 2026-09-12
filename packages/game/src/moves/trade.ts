import { INVALID_MOVE } from "boardgame.io/core";
import type { Move } from "boardgame.io";
import type { GameState, Resource, ResourceHand, TradeOffer } from "../types";
import { canMaritimeTrade, applyMaritimeTrade } from "../rules/bank";

function nextTradeId(G: GameState): string {
  return `trade-${G.trades.length}-${Date.now()}`;
}

function hasEnough(hand: ResourceHand, want: Partial<ResourceHand>): boolean {
  return Object.entries(want).every(
    ([resource, amount]) => hand[resource as Resource] >= (amount ?? 0),
  );
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
  };
  G.trades.push(offer);
  G.log.push(`${G.players[playerID].name} propose un échange.`);
};

export const acceptTrade: Move<GameState> = (
  { G, playerID },
  tradeId: string,
) => {
  const trade = G.trades.find((t) => t.id === tradeId);
  if (!trade || trade.status !== "pending") return INVALID_MOVE;
  if (trade.toPlayerIDs.length > 0 && !trade.toPlayerIDs.includes(playerID)) {
    return INVALID_MOVE;
  }
  if (!hasEnough(G.players[playerID].resources, trade.want)) return INVALID_MOVE;
  if (!hasEnough(G.players[trade.fromPlayerID].resources, trade.give)) {
    return INVALID_MOVE;
  }

  const from = G.players[trade.fromPlayerID];
  const to = G.players[playerID];
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

  trade.status = "accepted";
  G.trades = G.trades.filter((t) => t.id !== tradeId);
  G.log.push(`${to.name} accepte l'échange de ${from.name}.`);
};

export const rejectTrade: Move<GameState> = ({ G, playerID }, tradeId: string) => {
  const trade = G.trades.find((t) => t.id === tradeId);
  if (!trade) return INVALID_MOVE;
  if (trade.toPlayerIDs.length > 0 && !trade.toPlayerIDs.includes(playerID)) {
    return INVALID_MOVE;
  }
  G.trades = G.trades.filter((t) => t.id !== tradeId);
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
  G.log.push(
    `${G.players[playerID].name} échange ${giveAmount} ${give} contre 1 ${receive} (banque/port).`,
  );
};
