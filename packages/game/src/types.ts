export type Resource = "wood" | "brick" | "sheep" | "wheat" | "ore";

export const RESOURCES: Resource[] = ["wood", "brick", "sheep", "wheat", "ore"];

export const RESOURCE_LABELS_FR: Record<Resource, string> = {
  wood: "bois",
  brick: "argile",
  sheep: "laine",
  wheat: "blé",
  ore: "minerai",
};

export type TerrainType = Resource | "desert";

export type DevCardType =
  | "knight"
  | "roadBuilding"
  | "yearOfPlenty"
  | "monopoly"
  | "victoryPoint";

export type PortType = Resource | "generic";

export type BuildingType = "settlement" | "city";

export type PlayerColor =
  | "red"
  | "blue"
  | "white"
  | "orange"
  | "green"
  | "brown";

export const PLAYER_COLORS: PlayerColor[] = [
  "red",
  "blue",
  "white",
  "orange",
  "green",
  "brown",
];

/** Axial coordinates for a hex tile. */
export interface HexCoord {
  q: number;
  r: number;
}

export interface Tile {
  id: string;
  coord: HexCoord;
  terrain: TerrainType;
  /** Dice number (2-12), absent for the desert tile. */
  number: number | null;
  /** Vertex ids touching this tile, in clockwise corner order (0-5). */
  vertexIds: string[];
  /** Edge ids touching this tile. */
  edgeIds: string[];
}

export interface Vertex {
  id: string;
  x: number;
  y: number;
  tileIds: string[];
  /** Adjacent vertex ids reachable by a single edge. */
  adjacentVertexIds: string[];
  /** Edge ids incident to this vertex. */
  edgeIds: string[];
  port: PortType | null;
}

export interface Edge {
  id: string;
  vertexIds: [string, string];
  tileIds: string[];
}

export interface Building {
  vertexId: string;
  playerID: string;
  type: BuildingType;
}

export interface Road {
  edgeId: string;
  playerID: string;
}

export type ResourceHand = Record<Resource, number>;

export interface DevCardCounts {
  knight: number;
  roadBuilding: number;
  yearOfPlenty: number;
  monopoly: number;
  victoryPoint: number;
}

export interface PlayerState {
  playerID: string;
  color: PlayerColor;
  name: string;
  resources: ResourceHand;
  /** Development cards bought this turn cannot be played until next turn (except when drawn via move). */
  devCards: DevCardType[];
  devCardsBoughtThisTurn: DevCardType[];
  knightsPlayed: number;
  roadsLeft: number;
  settlementsLeft: number;
  citiesLeft: number;
}

export type TradeStatus = "pending" | "accepted" | "rejected" | "cancelled";

export interface TradeOffer {
  id: string;
  fromPlayerID: string;
  /** Empty array = open offer to all players. */
  toPlayerIDs: string[];
  give: Partial<ResourceHand>;
  want: Partial<ResourceHand>;
  status: TradeStatus;
}

export interface Board {
  tiles: Tile[];
  vertices: Record<string, Vertex>;
  edges: Record<string, Edge>;
  robberTileId: string;
}

export interface GameState {
  numPlayers: number;
  board: Board;
  players: Record<string, PlayerState>;
  bank: ResourceHand;
  devCardDeck: DevCardType[];
  buildings: Record<string, Building>;
  roads: Record<string, Road>;
  longestRoadPlayerID: string | null;
  largestArmyPlayerID: string | null;
  lastDiceRoll: [number, number] | null;
  /** How many times each dice total (2-12) has been rolled this game. */
  diceRollCounts: Record<number, number>;
  trades: TradeOffer[];
  /** Players who still need to discard after a 7 roll, mapped to how many cards they must discard. */
  pendingDiscards: Record<string, number>;
  /** Log of human-readable events for the game log UI. */
  log: string[];
  /** Snake order (playOrder positions) for the initial placement phase, e.g. [0,1,2,2,1,0]. */
  setupOrder: number[];
  /** Index into setupOrder for the turn currently being played. */
  setupStep: number;
  /** Free roads still to be placed by the current player from a just-played Road Building card. */
  freeRoadsRemaining: number;
  winnerID: string | null;
}

export const RESOURCE_COST: Record<
  "road" | "settlement" | "city" | "devCard",
  Partial<ResourceHand>
> = {
  road: { wood: 1, brick: 1 },
  settlement: { wood: 1, brick: 1, sheep: 1, wheat: 1 },
  city: { wheat: 2, ore: 3 },
  devCard: { sheep: 1, wheat: 1, ore: 1 },
};

export const MAX_ROADS = 15;
export const MAX_SETTLEMENTS = 5;
export const MAX_CITIES = 4;
export const VICTORY_POINTS_TO_WIN = 10;
export const MIN_LONGEST_ROAD_LENGTH = 5;
export const MIN_LARGEST_ARMY_SIZE = 3;
