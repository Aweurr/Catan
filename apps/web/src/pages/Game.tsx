import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { CatanClient } from "../gameClient";
import { loadCredentials, resolveRoomCode } from "../api";

export default function Game() {
  const { code } = useParams<{ code: string }>();
  const [matchID, setMatchID] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!code) return;
    let cancelled = false;
    resolveRoomCode(code)
      .then(({ matchID }) => !cancelled && setMatchID(matchID))
      .catch(() => !cancelled && setError("Salle introuvable."));
    return () => {
      cancelled = true;
    };
  }, [code]);

  if (error) return <div className="page">{error}</div>;
  if (!matchID) return <div className="page">Connexion à la partie…</div>;

  const creds = loadCredentials(matchID);
  if (!creds) {
    return (
      <div className="page">
        Tu n'as pas rejoint cette partie depuis cet appareil. Retourne à l'accueil et rejoins-la
        avec le code de la salle.
      </div>
    );
  }

  return (
    <div className="page page-game">
      <CatanClient matchID={matchID} playerID={creds.playerID} credentials={creds.credentials} />
    </div>
  );
}
