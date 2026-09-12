import { useState } from "react";
import type { GameState, Resource, ResourceHand } from "@catan/game";
import { RESOURCES, bestRateFor } from "@catan/game";
import { RESOURCE_LABEL } from "../theme";

interface Props {
  G: GameState;
  displayNames: Record<string, string>;
  playerID: string;
  isCurrentPlayer: boolean;
  onOfferTrade: (give: Partial<ResourceHand>, want: Partial<ResourceHand>) => void;
  onAcceptTrade: (tradeId: string) => void;
  onRejectTrade: (tradeId: string) => void;
  onCancelTrade: (tradeId: string) => void;
  onMaritimeTrade: (give: Resource, giveAmount: number, receive: Resource) => void;
  onClose: () => void;
}

function ResourceStepper({
  value,
  max,
  onChange,
}: {
  value: number;
  max: number;
  onChange: (v: number) => void;
}) {
  return (
    <div className="stepper">
      <button onClick={() => onChange(Math.max(0, value - 1))}>-</button>
      <span>{value}</span>
      <button onClick={() => onChange(Math.min(max, value + 1))}>+</button>
    </div>
  );
}

export default function TradeModal({
  G,
  displayNames,
  playerID,
  isCurrentPlayer,
  onOfferTrade,
  onAcceptTrade,
  onRejectTrade,
  onCancelTrade,
  onMaritimeTrade,
  onClose,
}: Props) {
  const hand = G.players[playerID].resources;
  const [give, setGive] = useState<Partial<ResourceHand>>({});
  const [want, setWant] = useState<Partial<ResourceHand>>({});
  const [maritimeGive, setMaritimeGive] = useState<Resource>("wood");
  const [maritimeReceive, setMaritimeReceive] = useState<Resource>("brick");

  const myTrades = G.trades.filter((t) => t.fromPlayerID === playerID);
  const incomingTrades = G.trades.filter(
    (t) =>
      t.fromPlayerID !== playerID &&
      (t.toPlayerIDs.length === 0 || t.toPlayerIDs.includes(playerID)),
  );

  const rate = bestRateFor(G, playerID, maritimeGive);

  return (
    <div className="modal-backdrop">
      <div className="modal modal-wide">
        <div className="modal-header">
          <h2>Échanges</h2>
          <button onClick={onClose}>✕</button>
        </div>

        {isCurrentPlayer && (
          <section>
            <h3>Échange avec la banque / un port</h3>
            <div className="maritime-trade">
              <select value={maritimeGive} onChange={(e) => setMaritimeGive(e.target.value as Resource)}>
                {RESOURCES.map((r) => (
                  <option key={r} value={r}>
                    {RESOURCE_LABEL[r]}
                  </option>
                ))}
              </select>
              <span>× {rate} →</span>
              <select value={maritimeReceive} onChange={(e) => setMaritimeReceive(e.target.value as Resource)}>
                {RESOURCES.filter((r) => r !== maritimeGive).map((r) => (
                  <option key={r} value={r}>
                    {RESOURCE_LABEL[r]}
                  </option>
                ))}
              </select>
              <button
                disabled={hand[maritimeGive] < rate}
                onClick={() => onMaritimeTrade(maritimeGive, rate, maritimeReceive)}
              >
                Échanger
              </button>
            </div>
          </section>
        )}

        {isCurrentPlayer && (
          <section>
            <h3>Proposer un échange aux autres joueurs</h3>
            <div className="trade-columns">
              <div>
                <h4>Je donne</h4>
                {RESOURCES.map((r) => (
                  <div key={r} className="resource-row">
                    <span>{RESOURCE_LABEL[r]}</span>
                    <ResourceStepper
                      value={give[r] ?? 0}
                      max={hand[r]}
                      onChange={(v) => setGive((prev) => ({ ...prev, [r]: v }))}
                    />
                  </div>
                ))}
              </div>
              <div>
                <h4>Je veux</h4>
                {RESOURCES.map((r) => (
                  <div key={r} className="resource-row">
                    <span>{RESOURCE_LABEL[r]}</span>
                    <ResourceStepper
                      value={want[r] ?? 0}
                      max={19}
                      onChange={(v) => setWant((prev) => ({ ...prev, [r]: v }))}
                    />
                  </div>
                ))}
              </div>
            </div>
            <button
              onClick={() => {
                onOfferTrade(give, want);
                setGive({});
                setWant({});
              }}
            >
              Proposer l'échange
            </button>
          </section>
        )}

        {myTrades.length > 0 && (
          <section>
            <h3>Mes offres en cours</h3>
            {myTrades.map((t) => (
              <div key={t.id} className="trade-offer">
                <span>{describeTrade(t.give, t.want)}</span>
                <button onClick={() => onCancelTrade(t.id)}>Annuler</button>
              </div>
            ))}
          </section>
        )}

        {incomingTrades.length > 0 && (
          <section>
            <h3>Offres reçues</h3>
            {incomingTrades.map((t) => (
              <div key={t.id} className="trade-offer">
                <span>
                  {displayNames[t.fromPlayerID]} : {describeTrade(t.give, t.want)}
                </span>
                <button onClick={() => onAcceptTrade(t.id)}>Accepter</button>
                <button onClick={() => onRejectTrade(t.id)}>Refuser</button>
              </div>
            ))}
          </section>
        )}
      </div>
    </div>
  );
}

function describeTrade(give: Partial<ResourceHand>, want: Partial<ResourceHand>): string {
  const fmt = (r: Partial<ResourceHand>) =>
    Object.entries(r)
      .filter(([, v]) => (v ?? 0) > 0)
      .map(([k, v]) => `${v} ${RESOURCE_LABEL[k as Resource]}`)
      .join(", ") || "rien";
  return `donne ${fmt(give)} contre ${fmt(want)}`;
}
