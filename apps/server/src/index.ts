import path from "node:path";
import { fileURLToPath } from "node:url";
import { existsSync } from "node:fs";
import { Server, FlatFile, Origins } from "boardgame.io/server";
import { CatanGame } from "@catan/game";
import { registerRoomRoutes } from "./rooms.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const PORT = Number(process.env.PORT ?? 8000);
const STORAGE_DIR = process.env.STORAGE_DIR ?? path.join(__dirname, "../storage");
const SELF_URL = process.env.SELF_URL ?? `http://localhost:${PORT}`;
const CORS_ORIGIN = process.env.CORS_ORIGIN;
// apps/web builds to ../../web/dist relative to this file's source location.
const WEB_DIST_DIR = process.env.WEB_DIST_DIR ?? path.join(__dirname, "../../web/dist");

// node-persist (used by FlatFile) treats every file in its `dir` as one of
// its own entries, so match state and the room-code map must live in
// separate subdirectories or it fails to parse rooms.json as a match.
const server = Server({
  games: [CatanGame],
  db: new FlatFile({ dir: path.join(STORAGE_DIR, "matches") }),
  origins: CORS_ORIGIN ? CORS_ORIGIN.split(",") : Origins.LOCALHOST,
});

registerRoomRoutes(server.router, {
  selfUrl: SELF_URL,
  storageDir: path.join(STORAGE_DIR, "rooms"),
});

if (existsSync(WEB_DIST_DIR)) {
  // Serve the built React app from the same origin/port in production so a
  // single container + single exposed port is enough to host the whole game.
  // These must still fall through to `next()` for anything they don't
  // handle themselves, so the boardgame.io Lobby/game routes underneath
  // keep working regardless of middleware registration order.
  const serveStatic = await import("koa-static");
  const send = await import("koa-send");
  server.app.use(serveStatic.default(WEB_DIST_DIR));
  server.app.use(async (ctx, next) => {
    if (ctx.method === "GET" && !ctx.path.startsWith("/games") && !ctx.path.startsWith("/api")) {
      await send.default(ctx, "index.html", { root: WEB_DIST_DIR });
    } else {
      await next();
    }
  });
}

server.run(PORT, () => {
  console.log(`Catan server listening on port ${PORT}`);
  console.log(`Storage dir: ${STORAGE_DIR}`);
  if (existsSync(WEB_DIST_DIR)) {
    console.log(`Serving web client from: ${WEB_DIST_DIR}`);
  }
});
