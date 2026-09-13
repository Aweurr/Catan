import type { GameState, Resource, ResourceHand } from "@catan/game";
import ResourceIcon from "./ResourceIcon";

interface Props {
  G: GameState;
  playerID: string;
  displayNames: Record<string, string>;
  onAccept: (tradeId: string) => void;
  onReject: (tradeId: string) => void;
  onFinalize: (tradeId: string, withPlayerID: string) => void;
  onCancel: (tradeId: string) => void;
}

function nonZero(hand: Partial<ResourceHand>): [Resource, number][] {
  return (Object.entries(hand) as [Resource, number][]).filter(([, v]) => (v ?? 0) > 0);
}

function TradeSummary({ give, want }: { give: Partial<ResourceHand>; want: Partial<ResourceHand> }) {
  return (
    <span className="trade-summary">
      {nonZero(give).map(([r, v]) => (
        <ResourceIcon key={`g-${r}`} resource={r} amount={v} showLabel={false} />
      ))}
      <span className="trade-arrow">→</span>
      {nonZero(want).map(([r, v]) => (
        <ResourceIcon key={`w-${r}`} resource={r} amount={v} showLabel={false} />
      ))}
    </span>
  );
}

export default function TradeOffers({
  G,
  playerID,
  displayNames,
  onAccept,
  onReject,
  onFinalize,
  onCancel,
}: Props) {
  const visible = G.trades.filter((trade) => {
    const isMine = trade.fromPlayerID === playerID;
    const targeted = trade.toPlayerIDs.length === 0 || trade.toPlayerIDs.includes(playerID);
    return isMine || targeted;
  });

  if (visible.length === 0) return null;

  const name = (id: string) => displayNames[id] ?? G.players[id]?.name ?? id;

  return (
    <div className="trade-offers">
      <h3>Offres d'échange</h3>
      {visible.map((trade) => {
        const isMine = trade.fromPlayerID === playerID;
        const iAmInterested = trade.interestedPlayerIDs.includes(playerID);
        const iDeclined = trade.declinedPlayerIDs.includes(playerID);

        return (
          <div key={trade.id} className="trade-offer-card">
            <div>
              <strong>{name(trade.fromPlayerID)}</strong>{" "}
              <TradeSummary give={trade.give} want={trade.want} />
            </div>

            {isMine ? (
              <>
                {trade.interestedPlayerIDs.length === 0 ? (
                  <p className="hint">En attente de réponses…</p>
                ) : (
                  <div className="trade-partners">
                    {trade.interestedPlayerIDs.map((id) => (
                      <button key={id} onClick={() => onFinalize(trade.id, id)}>
                        Échanger avec {name(id)}
                      </button>
                    ))}
                  </div>
                )}
                <button onClick={() => onCancel(trade.id)}>Annuler l'offre</button>
              </>
            ) : iAmInterested ? (
              <p className="hint">En attente de la décision de {name(trade.fromPlayerID)}…</p>
            ) : iDeclined ? (
              <p className="hint">Refusé.</p>
            ) : (
              <div className="trade-actions">
                <button onClick={() => onAccept(trade.id)}>Accepter</button>
                <button onClick={() => onReject(trade.id)}>Refuser</button>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
