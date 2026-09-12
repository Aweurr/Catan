import { promises as fs } from "node:fs";
import path from "node:path";

/** Tiny JSON-file-backed map from a short human-friendly room code to a
 * boardgame.io matchID, so the store survives container restarts without
 * needing a separate database (it lives next to the FlatFile match storage,
 * both under the same mounted volume). */
export class RoomCodeStore {
  private filePath: string;
  private cache: Record<string, string> | null = null;

  constructor(storageDir: string) {
    this.filePath = path.join(storageDir, "rooms.json");
  }

  private async load(): Promise<Record<string, string>> {
    if (this.cache) return this.cache;
    try {
      const raw = await fs.readFile(this.filePath, "utf-8");
      this.cache = JSON.parse(raw) as Record<string, string>;
    } catch {
      this.cache = {};
    }
    return this.cache;
  }

  private async persist(): Promise<void> {
    await fs.mkdir(path.dirname(this.filePath), { recursive: true });
    await fs.writeFile(this.filePath, JSON.stringify(this.cache, null, 2));
  }

  async set(code: string, matchID: string): Promise<void> {
    const data = await this.load();
    data[code] = matchID;
    await this.persist();
  }

  async get(code: string): Promise<string | undefined> {
    const data = await this.load();
    return data[code];
  }
}
