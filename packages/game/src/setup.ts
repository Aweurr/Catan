import { bankResourceCount, buildBoard, type RandomFn } from "./board";
import {
  MAX_CITIES,
  MAX_ROADS,
  MAX_SETTLEMENTS,
  PLAYER_COLORS,
  RESOURCES,
  type DevCardType,
  type GameState,
  type PlayerState,
  type ResourceHand,
} from "./types";

function emptyHand(): ResourceHand {
  return { wood: 0, brick: 0, sheep: 0, wheat: 0, ore: 0 };
}

function devCardDeckFor(numPlayers: number): DevCardType[] {
  if (numPlayers >= 5) {
    return [
      ...Array(20).fill("knight"),
      ...Array(5).fill("victoryPoint"),
      ...Array(3).fill("roadBuilding"),
      ...Array(3).fill("yearOfPlenty"),
      ...Array(3).fill("monopoly"),
    ];
  }
  return [
    ...Array(14).fill("knight"),
    ...Array(5).fill("victoryPoint"),
    ...Array(2).fill("roadBuilding"),
    ...Array(2).fill("yearOfPlenty"),
    ...Array(2).fill("monopoly"),
  ];
}

function shuffle<T>(items: T[], random: RandomFn): T[] {
  const arr = items.slice();
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

export function createInitialState(
  playerIDs: string[],
  playerNames: Record<string, string>,
  random: RandomFn = Math.random,
): GameState {
  const numPlayers = playerIDs.length;
  const board = buildBoard(numPlayers, random);

  const players: Record<string, PlayerState> = {};
  playerIDs.forEach((playerID, i) => {
    players[playerID] = {
      playerID,
      color: PLAYER_COLORS[i % PLAYER_COLORS.length],
      name: playerNames[playerID] ?? `Player ${i + 1}`,
      resources: emptyHand(),
      devCards: [],
      devCardsBoughtThisTurn: [],
      knightsPlayed: 0,
      roadsLeft: MAX_ROADS,
      settlementsLeft: MAX_SETTLEMENTS,
      citiesLeft: MAX_CITIES,
    };
  });

  const bankCount = bankResourceCount(numPlayers);
  const bank: ResourceHand = emptyHand();
  for (const r of RESOURCES) bank[r] = bankCount;

  const forward = playerIDs.map((_, i) => i);
  const setupOrder = [...forward, ...forward.slice().reverse()];

  return {
    numPlayers,
    board,
    players,
    bank,
    devCardDeck: shuffle(devCardDeckFor(numPlayers), random),
    buildings: {},
    roads: {},
    longestRoadPlayerID: null,
    largestArmyPlayerID: null,
    lastDiceRoll: null,
    trades: [],
    pendingDiscards: {},
    log: [],
    setupOrder,
    setupStep: 0,
    freeRoadsRemaining: 0,
    winnerID: null,
  };
}
