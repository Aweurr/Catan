import type { PlayerColor, Resource, TerrainType } from "@catan/game";

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
