import { useState } from "react";
import type { GameState, Resource } from "@catan/game";
import { RESOURCES, RESOURCE_COST } from "@catan/game";
import { RESOURCE_LABEL } from "../theme";

export type BuildMode = "settlement" | "city" | "road" | null;

interface Props {
  G: GameState;
  stage: string | undefined;
  isCurrentPlayer: boolean;
  buildMode: BuildMode;
  onSetBuildMode: (mode: BuildMode) => void;
  onRollDice: () => void;
  onBuyDevCard: () => void;
  onPlayRoadBuilding: () => void;
  onPlayYearOfPlenty: (a: Resource, b: Resource) => void;
  onPlayMonopoly: (resource: Resource) => void;
  onStartPlayKnight: () => void;
  onOpenTrade: () => void;
  onEndTurn: () => void;
  playerID: string;
}

function affordable(G: GameState, playerID: string, cost: Record<string, number | undefined>): boolean {
  const hand = G.players[playerID].resources;
  return Object.entries(cost).every(([r, amount]) => hand[r as Resource] >= (amount ?? 0));
}

export default function ActionBar({
  G,
  stage,
  isCurrentPlayer,
  buildMode,
  onSetBuildMode,
  onRollDice,
  onBuyDevCard,
  onPlayRoadBuilding,
  onPlayYearOfPlenty,
  onPlayMonopoly,
  onStartPlayKnight,
  onOpenTrade,
  onEndTurn,
  playerID,
}: Props) {
  const [yopA, setYopA] = useState<Resource>("wood");
  const [yopB, setYopB] = useState<Resource>("wood");
  const [monopolyResource, setMonopolyResource] = useState<Resource>("wood");

  if (!isCurrentPlayer) {
    return <div className="action-bar action-bar-inactive">En attente du tour des autres joueurs…</div>;
  }

  if (stage === "roll") {
    return (
      <div className="action-bar">
        <button className="primary" onClick={onRollDice}>
          🎲 Lancer les dés
        </button>
      </div>
    );
  }

  if (stage !== "actions") {
    return null;
  }

  const devCards = G.players[playerID].devCards;
  const hasKnight = devCards.includes("knight");
  const hasRoadBuilding = devCards.includes("roadBuilding");
  const hasYearOfPlenty = devCards.includes("yearOfPlenty");
  const hasMonopoly = devCards.includes("monopoly");

  return (
    <div className="action-bar">
      <div className="action-group">
        <button
          className={buildMode === "road" ? "active" : ""}
          disabled={!affordable(G, playerID, RESOURCE_COST.road) && G.freeRoadsRemaining === 0}
          onClick={() => onSetBuildMode(buildMode === "road" ? null : "road")}
        >
          Route
        </button>
        <button
          className={buildMode === "settlement" ? "active" : ""}
          disabled={!affordable(G, playerID, RESOURCE_COST.settlement)}
          onClick={() => onSetBuildMode(buildMode === "settlement" ? null : "settlement")}
        >
          Colonie
        </button>
        <button
          className={buildMode === "city" ? "active" : ""}
          disabled={!affordable(G, playerID, RESOURCE_COST.city)}
          onClick={() => onSetBuildMode(buildMode === "city" ? null : "city")}
        >
          Ville
        </button>
        <button disabled={!affordable(G, playerID, RESOURCE_COST.devCard) || G.devCardDeck.length === 0} onClick={onBuyDevCard}>
          Carte développement
        </button>
      </div>

      {(hasKnight || hasRoadBuilding || hasYearOfPlenty || hasMonopoly) && (
        <div className="action-group">
          {hasKnight && <button onClick={onStartPlayKnight}>Jouer Chevalier</button>}
          {hasRoadBuilding && <button onClick={onPlayRoadBuilding}>Jouer Construction de route</button>}
          {hasYearOfPlenty && (
            <span className="inline-picker">
              <select value={yopA} onChange={(e) => setYopA(e.target.value as Resource)}>
                {RESOURCES.map((r) => (
                  <option key={r} value={r}>
                    {RESOURCE_LABEL[r]}
                  </option>
                ))}
              </select>
              <select value={yopB} onChange={(e) => setYopB(e.target.value as Resource)}>
                {RESOURCES.map((r) => (
                  <option key={r} value={r}>
                    {RESOURCE_LABEL[r]}
                  </option>
                ))}
              </select>
              <button onClick={() => onPlayYearOfPlenty(yopA, yopB)}>Jouer Année d'abondance</button>
            </span>
          )}
          {hasMonopoly && (
            <span className="inline-picker">
              <select value={monopolyResource} onChange={(e) => setMonopolyResource(e.target.value as Resource)}>
                {RESOURCES.map((r) => (
                  <option key={r} value={r}>
                    {RESOURCE_LABEL[r]}
                  </option>
                ))}
              </select>
              <button onClick={() => onPlayMonopoly(monopolyResource)}>Jouer Monopole</button>
            </span>
          )}
        </div>
      )}

      <div className="action-group">
        <button onClick={onOpenTrade}>Échanger</button>
        <button className="primary" onClick={onEndTurn}>
          Finir le tour
        </button>
      </div>
    </div>
  );
}
