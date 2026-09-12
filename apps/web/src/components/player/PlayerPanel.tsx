import type { GameState } from "@catan/game";
import { publicVictoryPoints, totalVictoryPoints } from "@catan/game";
import { PLAYER_COLOR_HEX } from "../../theme";

interface Props {
  G: GameState;
  currentPlayer: string;
  viewerPlayerID: string | null;
  displayNames: Record<string, string>;
}

function handSize(G: GameState, playerID: string): number {
  const resources = G.players[playerID].resources as unknown;
  if (resources && typeof resources === "object" && "total" in (resources as any)) {
    return (resources as { total: number }).total;
  }
  return Object.values(G.players[playerID].resources).reduce((a, b) => a + b, 0);
}

function devCardCount(G: GameState, playerID: string): number {
  const cards = G.players[playerID].devCards as unknown;
  if (Array.isArray(cards)) return cards.length;
  return (cards as { length: number }).length;
}

export default function PlayerPanel({ G, currentPlayer, viewerPlayerID, displayNames }: Props) {
  return (
    <div className="player-panel">
      {Object.values(G.players).map((player) => {
        const vp =
          viewerPlayerID === player.playerID
            ? totalVictoryPoints(G, player.playerID)
            : publicVictoryPoints(G, player.playerID);
        return (
          <div
            key={player.playerID}
            className={
              "player-card" + (player.playerID === currentPlayer ? " active" : "")
            }
            style={{ borderColor: PLAYER_COLOR_HEX[player.color] }}
          >
            <div className="player-card-header">
              <span className="swatch" style={{ background: PLAYER_COLOR_HEX[player.color] }} />
              <strong>{displayNames[player.playerID] ?? player.name}</strong>
              {player.playerID === currentPlayer && <span className="turn-badge">🎲 Son tour</span>}
            </div>
            <div className="player-card-stats">
              <span>PV: {vp}</span>
              <span>Cartes: {handSize(G, player.playerID)}</span>
              <span>Dev: {devCardCount(G, player.playerID)}</span>
              <span>Chevaliers: {player.knightsPlayed}</span>
            </div>
            <div className="player-card-badges">
              {G.longestRoadPlayerID === player.playerID && <span className="badge">🛣️ Route la plus longue</span>}
              {G.largestArmyPlayerID === player.playerID && <span className="badge">⚔️ Plus grande armée</span>}
            </div>
          </div>
        );
      })}
    </div>
  );
}
