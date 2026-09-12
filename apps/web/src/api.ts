import { LobbyClient } from "boardgame.io/client";

const SERVER_URL = import.meta.env.VITE_SERVER_URL ?? "";

export const lobbyClient = new LobbyClient({ server: SERVER_URL });

export const GAME_NAME = "catan";

export interface CreateRoomResponse {
  code: string;
  matchID: string;
}

export async function createRoom(numPlayers: number): Promise<CreateRoomResponse> {
  const res = await fetch(`${SERVER_URL}/api/rooms`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ numPlayers }),
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export async function resolveRoomCode(code: string): Promise<{ matchID: string }> {
  const res = await fetch(`${SERVER_URL}/api/rooms/${code.toUpperCase()}`);
  if (!res.ok) throw new Error("Salle introuvable");
  return res.json();
}

export interface StoredCredentials {
  playerID: string;
  credentials: string;
  playerName: string;
}

function credsKey(matchID: string): string {
  return `catan:creds:${matchID}`;
}

export function saveCredentials(matchID: string, creds: StoredCredentials): void {
  localStorage.setItem(credsKey(matchID), JSON.stringify(creds));
}

export function loadCredentials(matchID: string): StoredCredentials | null {
  const raw = localStorage.getItem(credsKey(matchID));
  return raw ? (JSON.parse(raw) as StoredCredentials) : null;
}

export function clearCredentials(matchID: string): void {
  localStorage.removeItem(credsKey(matchID));
}

export { SERVER_URL };
