import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import type { BoardProps } from "boardgame.io/react";
import type { GameState, PlayerColor, Resource } from "@catan/game";
import HexBoard from "./board/HexBoard";
import PlayerPanel from "./player/PlayerPanel";
import ActionBar, { type BuildMode } from "./ActionBar";
import TradeModal from "./TradeModal";
import TradeOffers from "./TradeOffers";
import DiscardModal from "./DiscardModal";
import GameLog from "./GameLog";
import DiceStatsModal from "./DiceStatsModal";
import ResourceIcon from "./ResourceIcon";
import DevCardStack from "./DevCardStack";
import MyDevCards from "./MyDevCards";

type RobberPurpose = "sevenRoll" | "knight";

export default function GameBoard({ G, ctx, moves, playerID, matchData }: BoardProps<GameState>) {
  const navigate = useNavigate();
  const [buildMode, setBuildMode] = useState<BuildMode>(null);
  const [tradeOpen, setTradeOpen] = useState(false);
  const [diceStatsOpen, setDiceStatsOpen] = useState(false);
  const [quitConfirmOpen, setQuitConfirmOpen] = useState(false);
  const [robberFlow, setRobberFlow] = useState<{
    purpose: RobberPurpose;
    chosenTileId: string | null;
  } | null>(null);

  const viewerID = playerID ?? "0";
  const isCurrentPlayer = ctx.currentPlayer === viewerID;
  const stage = ctx.activePlayers?.[viewerID];

  // The match is created (and G's placeholder player names) before anyone
  // has joined and picked a name, so real display names only ever live in
  // the lobby metadata (matchData), not in G.
  const displayNames = useMemo(() => {
    const map: Record<string, string> = {};
    for (const p of Object.values(G.players)) map[p.playerID] = p.name;
    for (const entry of matchData ?? []) {
      if (entry.name) map[String(entry.id)] = entry.name;
    }
    return map;
  }, [G.players, matchData]);

  const playerColors = useMemo(() => {
    const map: Record<string, PlayerColor> = {};
    for (const p of Object.values(G.players)) map[p.playerID] = p.color;
    return map;
  }, [G.players]);

  function distanceRuleSatisfied(vertexId: string): boolean {
    const vertex = G.board.vertices[vertexId];
    return vertex.adjacentVertexIds.every((v) => !G.buildings[v]);
  }

  function connectedToOwnNetwork(vertexId: string): boolean {
    const vertex = G.board.vertices[vertexId];
    return vertex.edgeIds.some((e) => G.roads[e]?.playerID === viewerID);
  }

  const selectableVertices = useMemo(() => {
    const set = new Set<string>();
    if (!isCurrentPlayer) return set;
    if (ctx.phase === "setup" && stage === "settlement") {
      for (const vertexId of Object.keys(G.board.vertices)) {
        if (!G.buildings[vertexId] && distanceRuleSatisfied(vertexId)) set.add(vertexId);
      }
    } else if (ctx.phase === "play" && stage === "actions") {
      if (buildMode === "settlement") {
        for (const vertexId of Object.keys(G.board.vertices)) {
          if (
            !G.buildings[vertexId] &&
            distanceRuleSatisfied(vertexId) &&
            connectedToOwnNetwork(vertexId)
          ) {
            set.add(vertexId);
          }
        }
      } else if (buildMode === "city") {
        for (const [vertexId, building] of Object.entries(G.buildings)) {
          if (building.playerID === viewerID && building.type === "settlement") set.add(vertexId);
        }
      }
    }
    return set;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [G, isCurrentPlayer, ctx.phase, stage, buildMode, viewerID]);

  const selectableEdges = useMemo(() => {
    const set = new Set<string>();
    if (!isCurrentPlayer) return set;

    // During setup, a road must touch one of the player's settlements — it
    // can't extend from an already-placed road the way it can in the "play"
    // phase, since the server's placeInitialRoad move only checks buildings.
    if (ctx.phase === "setup" && stage === "road") {
      for (const [edgeId, edge] of Object.entries(G.board.edges)) {
        if (G.roads[edgeId]) continue;
        const touchesOwnSettlement = edge.vertexIds.some(
          (v) => G.buildings[v]?.playerID === viewerID,
        );
        if (touchesOwnSettlement) set.add(edgeId);
      }
      return set;
    }

    if (!(ctx.phase === "play" && stage === "actions" && buildMode === "road")) return set;
    for (const [edgeId, edge] of Object.entries(G.board.edges)) {
      if (G.roads[edgeId]) continue;
      const touchesOwn = edge.vertexIds.some((v) => {
        const building = G.buildings[v];
        if (building?.playerID === viewerID) return true;
        return G.board.vertices[v].edgeIds.some((e) => G.roads[e]?.playerID === viewerID);
      });
      if (touchesOwn) set.add(edgeId);
    }
    return set;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [G, isCurrentPlayer, ctx.phase, stage, buildMode, viewerID]);

  const selectableTiles = useMemo(() => {
    const set = new Set<string>();
    if (robberFlow && robberFlow.chosenTileId === null) {
      for (const tile of G.board.tiles) {
        if (tile.id !== G.board.robberTileId) set.add(tile.id);
      }
    }
    return set;
  }, [robberFlow, G.board.tiles, G.board.robberTileId]);

  function handleVertexClick(vertexId: string) {
    if (ctx.phase === "setup" && stage === "settlement") {
      moves.placeInitialSettlement(vertexId);
    } else if (ctx.phase === "play" && stage === "actions") {
      if (buildMode === "settlement") {
        moves.buildSettlement(vertexId);
        setBuildMode(null);
      } else if (buildMode === "city") {
        moves.buildCity(vertexId);
        setBuildMode(null);
      }
    }
  }

  function handleEdgeClick(edgeId: string) {
    if (ctx.phase === "setup" && stage === "road") {
      moves.placeInitialRoad(edgeId);
    } else if (ctx.phase === "play" && stage === "actions" && buildMode === "road") {
      moves.buildRoad(edgeId);
      setBuildMode(null);
    }
  }

  function handleTileClick(tileId: string) {
    if (!robberFlow) return;
    setRobberFlow({ ...robberFlow, chosenTileId: tileId });
  }

  const pendingVictims = useMemo(() => {
    if (!robberFlow?.chosenTileId) return [];
    const tile = G.board.tiles.find((t) => t.id === robberFlow.chosenTileId);
    if (!tile) return [];
    const victims = new Set<string>();
    for (const vertexId of tile.vertexIds) {
      const building = G.buildings[vertexId];
      if (building && building.playerID !== viewerID) victims.add(building.playerID);
    }
    return [...victims];
  }, [robberFlow, G.board.tiles, G.buildings, viewerID]);

  function confirmRobber(victimID: string | null) {
    if (!robberFlow?.chosenTileId) return;
    if (robberFlow.purpose === "sevenRoll") {
      moves.moveRobber(robberFlow.chosenTileId, victimID);
    } else {
      moves.playKnight(robberFlow.chosenTileId, victimID);
    }
    setRobberFlow(null);
  }

  const myDiscardRequired = G.pendingDiscards[viewerID];

  return (
    <div className="game-page">
      <div className="game-main">
        <HexBoard
          G={G}
          playerColors={playerColors}
          selectableVertices={selectableVertices}
          selectableEdges={selectableEdges}
          selectableTiles={selectableTiles}
          onVertexClick={handleVertexClick}
          onEdgeClick={handleEdgeClick}
          onTileClick={handleTileClick}
        />
        {G.lastDiceRoll && (
          <div className="dice-readout">
            🎲 {G.lastDiceRoll[0]} + {G.lastDiceRoll[1]} = {G.lastDiceRoll[0] + G.lastDiceRoll[1]}
          </div>
        )}
        <button className="dice-stats-button" onClick={() => setDiceStatsOpen(true)}>
          📊 Statistiques des dés
        </button>
        <DevCardStack count={G.devCardDeck.length} />
        <MyDevCards
          devCards={G.players[viewerID].devCards}
          devCardsBoughtThisTurn={G.players[viewerID].devCardsBoughtThisTurn}
        />
      </div>

      <aside className="game-sidebar">
        <div className="game-sidebar-header">
          <h2>Catan</h2>
          <button
            className="quit-button"
            title="Quitter la partie"
            onClick={() => setQuitConfirmOpen(true)}
          >
            ✕
          </button>
        </div>

        <PlayerPanel
          G={G}
          currentPlayer={ctx.currentPlayer}
          viewerPlayerID={playerID}
          displayNames={displayNames}
        />

        <div className="my-hand">
          <h3>Ma main</h3>
          <ul>
            {Object.entries(G.players[viewerID].resources).map(([resource, amount]) => (
              <li key={resource}>
                <ResourceIcon resource={resource as Resource} amount={amount} />
              </li>
            ))}
          </ul>
        </div>

        <ActionBar
          G={G}
          stage={stage}
          isCurrentPlayer={isCurrentPlayer}
          buildMode={buildMode}
          onSetBuildMode={setBuildMode}
          onRollDice={() => moves.rollDice()}
          onBuyDevCard={() => moves.buyDevCard()}
          onPlayRoadBuilding={() => moves.playRoadBuilding()}
          onPlayYearOfPlenty={(a: Resource, b: Resource) => moves.playYearOfPlenty(a, b)}
          onPlayMonopoly={(r: Resource) => moves.playMonopoly(r)}
          onStartPlayKnight={() => setRobberFlow({ purpose: "knight", chosenTileId: null })}
          onOpenTrade={() => setTradeOpen(true)}
          onEndTurn={() => moves.endTurn()}
          playerID={viewerID}
        />

        <TradeOffers
          G={G}
          playerID={viewerID}
          displayNames={displayNames}
          onAccept={(id) => moves.acceptTrade(id)}
          onReject={(id) => moves.rejectTrade(id)}
          onFinalize={(id, withPlayerID) => moves.finalizeTrade(id, withPlayerID)}
          onCancel={(id) => moves.cancelTrade(id)}
        />

        <GameLog log={G.log} displayNames={displayNames} />
      </aside>

      {robberFlow && robberFlow.chosenTileId && (
        <div className="modal-backdrop">
          <div className="modal">
            <h2>Voler une ressource</h2>
            <p>Choisis une victime (ou personne s'il n'y a pas de bâtiment adverse sur cette tuile).</p>
            {pendingVictims.map((v) => (
              <button key={v} onClick={() => confirmRobber(v)}>
                {displayNames[v]}
              </button>
            ))}
            <button onClick={() => confirmRobber(null)}>Personne</button>
          </div>
        </div>
      )}

      {stage === "moveRobber" && isCurrentPlayer && !robberFlow && (
        <div className="modal-backdrop">
          <div className="modal">
            <h2>Déplacer le voleur</h2>
            <p>Clique sur une tuile du plateau pour y déplacer le voleur.</p>
            <button
              onClick={() => setRobberFlow({ purpose: "sevenRoll", chosenTileId: null })}
            >
              Choisir une tuile
            </button>
          </div>
        </div>
      )}

      {myDiscardRequired !== undefined && (
        <DiscardModal
          hand={G.players[viewerID].resources}
          required={myDiscardRequired}
          onSubmit={(discard) => moves.discardResources(discard)}
        />
      )}

      {tradeOpen && (
        <TradeModal
          G={G}
          playerID={viewerID}
          isCurrentPlayer={isCurrentPlayer}
          onOfferTrade={(give, want) => moves.offerTrade(give, want, [])}
          onMaritimeTrade={(give, amount, receive) => moves.maritimeTrade(give, amount, receive)}
          onClose={() => setTradeOpen(false)}
        />
      )}

      {diceStatsOpen && (
        <DiceStatsModal counts={G.diceRollCounts} onClose={() => setDiceStatsOpen(false)} />
      )}

      {quitConfirmOpen && (
        <div className="modal-backdrop">
          <div className="modal">
            <h2>Quitter la partie ?</h2>
            <p>Tu pourras revenir avec le même lien pour rejoindre à nouveau la partie.</p>
            <div className="action-group">
              <button onClick={() => setQuitConfirmOpen(false)}>Annuler</button>
              <button className="primary" onClick={() => navigate("/")}>
                Quitter
              </button>
            </div>
          </div>
        </div>
      )}

      {ctx.gameover && (
        <div className="modal-backdrop">
          <div className="modal">
            <h2>Partie terminée</h2>
            <p>{displayNames[(ctx.gameover as { winnerID: string }).winnerID]} remporte la partie !</p>
            <button className="primary" onClick={() => navigate("/")}>
              Retour au menu principal
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
