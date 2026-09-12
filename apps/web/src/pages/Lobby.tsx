import { useCallback, useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import type { LobbyAPI } from "boardgame.io";
import { GAME_NAME, lobbyClient, loadCredentials, resolveRoomCode } from "../api";

interface SeatData {
  ready?: boolean;
  started?: boolean;
}

function seatData(p: LobbyAPI.Match["players"][number]): SeatData {
  return (p.data ?? {}) as SeatData;
}

export default function Lobby() {
  const { code } = useParams<{ code: string }>();
  const navigate = useNavigate();
  const [matchID, setMatchID] = useState<string | null>(null);
  const [match, setMatch] = useState<LobbyAPI.Match | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!code) return;
    let cancelled = false;
    resolveRoomCode(code)
      .then(({ matchID }) => {
        if (!cancelled) setMatchID(matchID);
      })
      .catch(() => !cancelled && setError("Salle introuvable."));
    return () => {
      cancelled = true;
    };
  }, [code]);

  const refreshMatch = useCallback(async () => {
    if (!matchID) return;
    try {
      const data = await lobbyClient.getMatch(GAME_NAME, matchID);
      setMatch(data);
    } catch {
      // transient network hiccup; keep polling
    }
  }, [matchID]);

  useEffect(() => {
    if (!matchID) return;
    refreshMatch();
    const interval = setInterval(refreshMatch, 2000);
    return () => clearInterval(interval);
  }, [matchID, refreshMatch]);

  const creds = matchID ? loadCredentials(matchID) : null;
  const seats = match?.players ?? [];
  const filledCount = seats.filter((p) => p.name).length;
  const allFilled = seats.length > 0 && filledCount === seats.length;
  const allReady = allFilled && seats.every((p) => seatData(p).ready === true);
  const creatorSeat = seats.find((p) => String(p.id) === "0");
  const started = creatorSeat ? seatData(creatorSeat).started === true : false;
  const isCreator = creds?.playerID === "0";
  const mySeat = seats.find((p) => creds && String(p.id) === creds.playerID);
  const myReady = mySeat ? seatData(mySeat).ready === true : false;

  useEffect(() => {
    if (started && code) navigate(`/room/${code}/play`);
  }, [started, code, navigate]);

  async function toggleReady() {
    if (!matchID || !creds || !mySeat) return;
    await lobbyClient.updatePlayer(GAME_NAME, matchID, {
      playerID: creds.playerID,
      credentials: creds.credentials,
      data: { ...seatData(mySeat), ready: !myReady },
    });
    refreshMatch();
  }

  async function launchGame() {
    if (!matchID || !creds || !mySeat || !code) return;
    await lobbyClient.updatePlayer(GAME_NAME, matchID, {
      playerID: creds.playerID,
      credentials: creds.credentials,
      data: { ...seatData(mySeat), ready: true, started: true },
    });
    navigate(`/room/${code}/play`);
  }

  if (error) return <div className="page">{error}</div>;
  if (!matchID || !match) return <div className="page">Chargement de la salle…</div>;

  return (
    <div className="page page-lobby">
      <h1>
        Salle <span className="room-code">{code}</span>
      </h1>
      <p>
        {filledCount} / {seats.length} joueurs
      </p>
      <ul className="seat-list">
        {seats.map((p) => {
          const ready = seatData(p).ready === true;
          return (
            <li key={p.id} className={p.name ? "seat-filled" : "seat-empty"}>
              <span>
                {p.name ?? "En attente…"}
                {creds && String(p.id) === creds.playerID ? " (toi)" : ""}
                {String(p.id) === "0" && p.name ? " 👑" : ""}
              </span>
              {p.name && (
                <span className={"ready-badge" + (ready ? " ready" : "")}>
                  {ready ? "✅ Prêt" : "⏳ Pas prêt"}
                </span>
              )}
            </li>
          );
        })}
      </ul>

      <div className="lobby-actions">
        {mySeat && (
          <button className={myReady ? "active" : ""} onClick={toggleReady}>
            {myReady ? "✅ Prêt (annuler)" : "Je suis prêt"}
          </button>
        )}

        {isCreator ? (
          <button className="primary" disabled={!allReady} onClick={launchGame}>
            {allReady ? "Lancer la partie" : "En attente que tout le monde soit prêt…"}
          </button>
        ) : (
          <p className="hint">
            {allReady
              ? "En attente que l'hôte lance la partie…"
              : "En attente que tous les joueurs soient prêts…"}
          </p>
        )}
      </div>

      <p className="hint">Partage le code «{code}» avec les autres joueurs pour qu'ils rejoignent.</p>
    </div>
  );
}
