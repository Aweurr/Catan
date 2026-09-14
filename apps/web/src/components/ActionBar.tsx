import { useState } from "react";
import type { GameState, Resource } from "@catan/game";
import { RESOURCES, RESOURCE_COST } from "@catan/game";
import { RESOURCE_LABEL, DEV_CARD_ICON, DEV_CARD_LABEL } from "../theme";
import ResourceIcon from "./ResourceIcon";

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

type PendingCard =
  | { type: "knight" }
  | { type: "roadBuilding" }
  | { type: "yearOfPlenty"; a: Resource; b: Resource }
  | { type: "monopoly"; resource: Resource };

function affordable(G: GameState, playerID: string, cost: Record<string, number | undefined>): boolean {
  const hand = G.players[playerID].resources;
  return Object.entries(cost).every(([r, amount]) => hand[r as Resource] >= (amount ?? 0));
}

function CostBadges({ cost }: { cost: Partial<Record<Resource, number>> }) {
  return (
    <span className="build-cost">
      {(Object.entries(cost) as [Resource, number][]).map(([r, amount]) => (
        <ResourceIcon key={r} resource={r} amount={amount} showLabel={false} />
      ))}
    </span>
  );
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
  const [pending, setPending] = useState<PendingCard | null>(null);

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
  const hasAnyPlayable = hasKnight || hasRoadBuilding || hasYearOfPlenty || hasMonopoly;

  function runPending() {
    if (!pending) return;
    if (pending.type === "knight") onStartPlayKnight();
    else if (pending.type === "roadBuilding") onPlayRoadBuilding();
    else if (pending.type === "yearOfPlenty") onPlayYearOfPlenty(pending.a, pending.b);
    else if (pending.type === "monopoly") onPlayMonopoly(pending.resource);
    setPending(null);
  }

  function pendingDescription(p: PendingCard): string {
    if (p.type === "knight") {
      return "Jouer le Chevalier ? Tu devras déplacer le voleur et pourras voler une carte.";
    }
    if (p.type === "roadBuilding") {
      return "Jouer Construction de route ? Tu pourras placer 2 routes gratuitement.";
    }
    if (p.type === "yearOfPlenty") {
      return `Jouer Année d'abondance ? Tu piocheras 1 ${RESOURCE_LABEL[p.a]} et 1 ${RESOURCE_LABEL[p.b]}.`;
    }
    return `Jouer Monopole sur ${RESOURCE_LABEL[p.resource]} ? Tu récupéreras toutes les cartes de ce type chez les autres joueurs.`;
  }

  return (
    <div className="action-bar">
      <section className="action-section">
        <h4>Construire</h4>
        <div className="build-buttons">
          <button
            className={"build-button" + (buildMode === "road" ? " active" : "")}
            disabled={!affordable(G, playerID, RESOURCE_COST.road) && G.freeRoadsRemaining === 0}
            onClick={() => onSetBuildMode(buildMode === "road" ? null : "road")}
          >
            <span className="build-icon">🛤️</span>
            <span className="build-label">Route</span>
            <CostBadges cost={RESOURCE_COST.road} />
          </button>
          <button
            className={"build-button" + (buildMode === "settlement" ? " active" : "")}
            disabled={!affordable(G, playerID, RESOURCE_COST.settlement)}
            onClick={() => onSetBuildMode(buildMode === "settlement" ? null : "settlement")}
          >
            <span className="build-icon">🏠</span>
            <span className="build-label">Colonie</span>
            <CostBadges cost={RESOURCE_COST.settlement} />
          </button>
          <button
            className={"build-button" + (buildMode === "city" ? " active" : "")}
            disabled={!affordable(G, playerID, RESOURCE_COST.city)}
            onClick={() => onSetBuildMode(buildMode === "city" ? null : "city")}
          >
            <span className="build-icon">🏛️</span>
            <span className="build-label">Ville</span>
            <CostBadges cost={RESOURCE_COST.city} />
          </button>
          <button
            className="build-button"
            disabled={!affordable(G, playerID, RESOURCE_COST.devCard) || G.devCardDeck.length === 0}
            onClick={onBuyDevCard}
          >
            <span className="build-icon">🎴</span>
            <span className="build-label">Carte dev.</span>
            <CostBadges cost={RESOURCE_COST.devCard} />
          </button>
        </div>
      </section>

      {hasAnyPlayable && (
        <section className="action-section">
          <h4>Jouer une carte développement</h4>
          <div className="play-card-buttons">
            {hasKnight && (
              <button className="play-card-button" onClick={() => setPending({ type: "knight" })}>
                <span className="play-card-icon">{DEV_CARD_ICON.knight}</span>
                {DEV_CARD_LABEL.knight}
              </button>
            )}
            {hasRoadBuilding && (
              <button className="play-card-button" onClick={() => setPending({ type: "roadBuilding" })}>
                <span className="play-card-icon">{DEV_CARD_ICON.roadBuilding}</span>
                {DEV_CARD_LABEL.roadBuilding}
              </button>
            )}
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
                <button
                  className="play-card-button"
                  onClick={() => setPending({ type: "yearOfPlenty", a: yopA, b: yopB })}
                >
                  <span className="play-card-icon">{DEV_CARD_ICON.yearOfPlenty}</span>
                  {DEV_CARD_LABEL.yearOfPlenty}
                </button>
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
                <button
                  className="play-card-button"
                  onClick={() => setPending({ type: "monopoly", resource: monopolyResource })}
                >
                  <span className="play-card-icon">{DEV_CARD_ICON.monopoly}</span>
                  {DEV_CARD_LABEL.monopoly}
                </button>
              </span>
            )}
          </div>
        </section>
      )}

      <section className="action-section action-footer">
        <button onClick={onOpenTrade}>🔄 Échanger</button>
        <button className="primary" onClick={onEndTurn}>
          ✅ Finir le tour
        </button>
      </section>

      {pending && (
        <div className="modal-backdrop">
          <div className="modal">
            <h2>Confirmer</h2>
            <p>{pendingDescription(pending)}</p>
            <div className="action-group">
              <button onClick={() => setPending(null)}>Annuler</button>
              <button className="primary" onClick={runPending}>
                Confirmer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
