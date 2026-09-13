import type { Resource } from "./types";

/** One piece of a log line: plain text, a player name (resolved client-side to
 * their display name), or a resource (rendered client-side with its icon and
 * color). Keeping entries structured (instead of pre-formatted strings) lets
 * the UI show real display names and colored resources instead of baking in
 * the placeholder names the engine sees. */
export type LogPart =
  | { kind: "text"; text: string }
  | { kind: "player"; playerID: string }
  | { kind: "resource"; resource: Resource; amount?: number };

export type LogEntry = LogPart[];

export function logText(text: string): LogPart {
  return { kind: "text", text };
}

export function logPlayer(playerID: string): LogPart {
  return { kind: "player", playerID };
}

export function logResource(resource: Resource, amount?: number): LogPart {
  return { kind: "resource", resource, amount };
}
