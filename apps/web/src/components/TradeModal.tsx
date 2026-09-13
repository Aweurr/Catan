import { useState } from "react";
import type { GameState, Resource, ResourceHand } from "@catan/game";
import { RESOURCES, bestRateFor } from "@catan/game";
import ResourceIcon from "./ResourceIcon";

interface Props {
  G: GameState;
  playerID: string;
  isCurrentPlayer: boolean;
  onOfferTrade: (give: Partial<ResourceHand>, want: Partial<ResourceHand>) => void;
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

function ResourcePickerRow({
  value,
  onChange,
  exclude,
}: {
  value: Resource;
  onChange: (r: Resource) => void;
  exclude?: Resource;
}) {
  return (
    <span className="resource-picker-row">
      {RESOURCES.filter((r) => r !== exclude).map((r) => (
        <button
          key={r}
          type="button"
          className={"resource-picker-btn" + (r === value ? " selected" : "")}
          onClick={() => onChange(r)}
        >
          <ResourceIcon resource={r} showLabel={false} />
        </button>
      ))}
    </span>
  );
}

export default function TradeModal({
  G,
  playerID,
  isCurrentPlayer,
  onOfferTrade,
  onMaritimeTrade,
  onClose,
}: Props) {
  const hand = G.players[playerID].resources;
  const [give, setGive] = useState<Partial<ResourceHand>>({});
  const [want, setWant] = useState<Partial<ResourceHand>>({});
  const [maritimeGive, setMaritimeGive] = useState<Resource>("wood");
  const [maritimeReceive, setMaritimeReceive] = useState<Resource>("brick");

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
              <ResourcePickerRow value={maritimeGive} onChange={setMaritimeGive} />
              <span>× {rate} →</span>
              <ResourcePickerRow
                value={maritimeReceive}
                onChange={setMaritimeReceive}
                exclude={maritimeGive}
              />
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
                    <ResourceIcon resource={r} />
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
                    <ResourceIcon resource={r} />
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
      </div>
    </div>
  );
}
