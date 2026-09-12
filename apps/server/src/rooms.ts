import type { Server } from "boardgame.io/server";
import { koaBody } from "koa-body";
import { customAlphabet } from "nanoid";
import { LobbyClient } from "boardgame.io/client";
import { RoomCodeStore } from "./roomCodeStore.js";

type AppRouter = ReturnType<typeof Server>["router"];

// Excludes visually ambiguous characters (0/O, 1/I/L) since codes are shared
// out loud or typed by hand.
const generateCode = customAlphabet("ABCDEFGHJKMNPQRSTUVWXYZ23456789", 6);

export function registerRoomRoutes(
  router: AppRouter,
  opts: { selfUrl: string; storageDir: string },
): void {
  const store = new RoomCodeStore(opts.storageDir);
  const lobby = new LobbyClient({ server: opts.selfUrl });

  router.post("/api/rooms", koaBody(), async (ctx) => {
    const numPlayers = Number(ctx.request.body?.numPlayers);
    if (!Number.isInteger(numPlayers) || numPlayers < 3 || numPlayers > 6) {
      ctx.throw(400, "numPlayers must be an integer between 3 and 6");
      return;
    }

    const { matchID } = await lobby.createMatch("catan", { numPlayers });

    let code = generateCode();
    while (await store.get(code)) code = generateCode();
    await store.set(code, matchID);

    ctx.body = { code, matchID };
  });

  router.get("/api/rooms/:code", async (ctx) => {
    const matchID = await store.get(ctx.params.code.toUpperCase());
    if (!matchID) {
      ctx.throw(404, "Room not found");
      return;
    }
    ctx.body = { matchID };
  });
}
