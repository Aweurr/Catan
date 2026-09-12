import { Client } from "boardgame.io/react";
import { SocketIO } from "boardgame.io/multiplayer";
import { CatanGame, type GameState } from "@catan/game";
import GameBoard from "./components/GameBoard";
import { SERVER_URL } from "./api";

export const CatanClient = Client<GameState>({
  game: CatanGame,
  board: GameBoard,
  multiplayer: SocketIO({ server: SERVER_URL || window.location.origin }),
  debug: false,
});
