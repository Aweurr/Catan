import type { DevCardType, PlayerColor, Resource, TerrainType } from "@catan/game";

export const PLAYER_COLOR_HEX: Record<PlayerColor, string> = {
  red: "#d32f2f",
  blue: "#1565c0",
  white: "#f5f5f5",
  orange: "#ef6c00",
  green: "#2e7d32",
  brown: "#6d4c41",
};

export const TERRAIN_COLOR: Record<TerrainType, string> = {
  wood: "#356b34",
  brick: "#b5581f",
  sheep: "#9ccc65",
  wheat: "#f4d35e",
  ore: "#8892a0",
  desert: "#e2c88a",
};

/** Decorative icons drawn on each board tile so terrain reads as a resource, not just a color. */
export const TERRAIN_ICON: Record<TerrainType, string> = {
  wood: "🌲",
  brick: "🧱",
  sheep: "🐑",
  wheat: "🌾",
  ore: "⛰️",
  desert: "🏜️",
};

export const RESOURCE_LABEL: Record<Resource, string> = {
  wood: "Bois",
  brick: "Argile",
  sheep: "Laine",
  wheat: "Blé",
  ore: "Minerai",
};

export const RESOURCE_ICON: Record<Resource, string> = {
  wood: "🌲",
  brick: "🧱",
  sheep: "🐑",
  wheat: "🌾",
  ore: "⛏️",
};

export const DEV_CARD_LABEL: Record<DevCardType, string> = {
  knight: "Chevalier",
  roadBuilding: "Construction de route",
  yearOfPlenty: "Année d'abondance",
  monopoly: "Monopole",
  victoryPoint: "Point de victoire",
};

export const DEV_CARD_ICON: Record<DevCardType, string> = {
  knight: "⚔️",
  roadBuilding: "🛣️",
  yearOfPlenty: "🎁",
  monopoly: "💰",
  victoryPoint: "⭐",
};
