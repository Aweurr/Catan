import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import type { LobbyAPI } from "boardgame.io";
import { GAME_NAME, lobbyClient, loadCredentials, resolveRoomCode } from "../api";

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

  useEffect(() => {
    if (!matchID) return;
    let cancelled = false;
    const tick = async () => {
      try {
        const data = await lobbyClient.getMatch(GAME_NAME, matchID);
        if (!cancelled) setMatch(data);
      } catch {
        // transient network hiccup; keep polling
      }
    };
    tick();
    const interval = setInterval(tick, 2000);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [matchID]);

  if (error) return <div className="page">{error}</div>;
  if (!matchID || !match) return <div className="page">Chargement de la salle…</div>;

  const creds = loadCredentials(matchID);
  const seats = match.players;
  const filledCount = seats.filter((p) => p.name).length;
  const allFilled = filledCount === seats.length;

  return (
    <div className="page page-lobby">
      <h1>
        Salle <span className="room-code">{code}</span>
      </h1>
      <p>
        {filledCount} / {seats.length} joueurs
      </p>
      <ul className="seat-list">
        {seats.map((p) => (
          <li key={p.id} className={p.name ? "seat-filled" : "seat-empty"}>
            {p.name ?? "En attente…"}
            {creds && String(p.id) === creds.playerID ? " (toi)" : ""}
          </li>
        ))}
      </ul>

      <button disabled={!allFilled} onClick={() => navigate(`/room/${code}/play`)}>
        {allFilled ? "Entrer dans la partie" : "En attente des autres joueurs…"}
      </button>

      <p className="hint">Partage le code «{code}» avec les autres joueurs pour qu'ils rejoignent.</p>
    </div>
  );
}
