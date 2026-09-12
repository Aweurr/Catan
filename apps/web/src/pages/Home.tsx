import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { createRoom, resolveRoomCode, lobbyClient, GAME_NAME, saveCredentials } from "../api";

export default function Home() {
  const navigate = useNavigate();
  const [name, setName] = useState(() => localStorage.getItem("catan:name") ?? "");
  const [numPlayers, setNumPlayers] = useState(4);
  const [joinCode, setJoinCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  function rememberName() {
    localStorage.setItem("catan:name", name);
  }

  async function handleCreate() {
    if (!name.trim()) return setError("Entre ton nom d'abord.");
    setBusy(true);
    setError(null);
    try {
      rememberName();
      const { code, matchID } = await createRoom(numPlayers);
      const { playerID, playerCredentials } = await lobbyClient.joinMatch(GAME_NAME, matchID, {
        playerName: name,
      });
      saveCredentials(matchID, { playerID, credentials: playerCredentials, playerName: name });
      navigate(`/room/${code}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erreur inconnue");
    } finally {
      setBusy(false);
    }
  }

  async function handleJoin() {
    if (!name.trim()) return setError("Entre ton nom d'abord.");
    if (!joinCode.trim()) return setError("Entre un code de salle.");
    setBusy(true);
    setError(null);
    try {
      rememberName();
      const { matchID } = await resolveRoomCode(joinCode.trim());
      const { playerID, playerCredentials } = await lobbyClient.joinMatch(GAME_NAME, matchID, {
        playerName: name,
      });
      saveCredentials(matchID, { playerID, credentials: playerCredentials, playerName: name });
      navigate(`/room/${joinCode.trim().toUpperCase()}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Impossible de rejoindre cette salle");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="page page-home">
      <h1>Catan en ligne</h1>

      <label className="field">
        <span>Ton nom</span>
        <input value={name} onChange={(e) => setName(e.target.value)} maxLength={24} />
      </label>

      <section className="card">
        <h2>Créer une partie</h2>
        <label className="field">
          <span>Nombre de joueurs</span>
          <select value={numPlayers} onChange={(e) => setNumPlayers(Number(e.target.value))}>
            {[3, 4, 5, 6].map((n) => (
              <option key={n} value={n}>
                {n} joueurs
              </option>
            ))}
          </select>
        </label>
        <button disabled={busy} onClick={handleCreate}>
          Créer la salle
        </button>
      </section>

      <section className="card">
        <h2>Rejoindre une partie</h2>
        <label className="field">
          <span>Code de la salle</span>
          <input
            value={joinCode}
            onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
            maxLength={6}
            placeholder="ABC123"
          />
        </label>
        <button disabled={busy} onClick={handleJoin}>
          Rejoindre
        </button>
      </section>

      {error && <p className="error">{error}</p>}
    </div>
  );
}
