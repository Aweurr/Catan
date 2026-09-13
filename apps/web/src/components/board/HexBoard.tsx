import type { GameState, PlayerColor } from "@catan/game";
import { PLAYER_COLOR_HEX, TERRAIN_COLOR, TERRAIN_ICON } from "../../theme";

interface Props {
  G: GameState;
  playerColors: Record<string, PlayerColor>;
  selectableVertices: Set<string>;
  selectableEdges: Set<string>;
  selectableTiles: Set<string>;
  onVertexClick?: (vertexId: string) => void;
  onEdgeClick?: (edgeId: string) => void;
  onTileClick?: (tileId: string) => void;
}

function isRedNumber(n: number): boolean {
  return n === 6 || n === 8;
}

/** Positions (relative to a tile's center) for the decorative terrain icons,
 * arranged in a triangle so they never collide with the number token. */
const ICON_OFFSETS = [
  { x: 0, y: -52 },
  { x: -46, y: 30 },
  { x: 46, y: 30 },
];

/** A single-peak house silhouette, used for settlements. */
const SETTLEMENT_PATH = "M -8,9 L -8,0 L 0,-8 L 8,0 L 8,9 Z";

/** A wider, taller twin-peak building silhouette, used for cities — visibly
 * bigger and more complex than a settlement so the two are easy to tell apart. */
const CITY_PATH = "M -13,9 L -13,-1 L -6,-9 L 0,-3 L 6,-9 L 13,-1 L 13,9 Z";

export default function HexBoard({
  G,
  playerColors,
  selectableVertices,
  selectableEdges,
  selectableTiles,
  onVertexClick,
  onEdgeClick,
  onTileClick,
}: Props) {
  const { board } = G;
  const vertexList = Object.values(board.vertices);
  const xs = vertexList.map((v) => v.x);
  const ys = vertexList.map((v) => v.y);
  const pad = 70;
  const minX = Math.min(...xs) - pad;
  const minY = Math.min(...ys) - pad;
  const width = Math.max(...xs) - Math.min(...xs) + pad * 2;
  const height = Math.max(...ys) - Math.min(...ys) + pad * 2;

  return (
    <svg
      className="hex-board"
      viewBox={`${minX} ${minY} ${width} ${height}`}
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        <linearGradient id="tile-shine" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#ffffff" stopOpacity={0.28} />
          <stop offset="45%" stopColor="#ffffff" stopOpacity={0} />
          <stop offset="100%" stopColor="#000000" stopOpacity={0.18} />
        </linearGradient>
        <filter id="building-shadow" x="-50%" y="-50%" width="200%" height="200%">
          <feDropShadow dx="0" dy="1.5" stdDeviation="1.2" floodOpacity={0.5} />
        </filter>
      </defs>

      {board.tiles.map((tile) => {
        const points = tile.vertexIds
          .map((vId) => board.vertices[vId])
          .map((v) => `${v.x},${v.y}`)
          .join(" ");
        const center = tile.vertexIds
          .map((vId) => board.vertices[vId])
          .reduce(
            (acc, v) => ({ x: acc.x + v.x / 6, y: acc.y + v.y / 6 }),
            { x: 0, y: 0 },
          );
        const isRobber = tile.id === board.robberTileId;
        const selectable = selectableTiles.has(tile.id);
        return (
          <g key={tile.id}>
            <polygon
              points={points}
              fill={TERRAIN_COLOR[tile.terrain]}
              stroke="#1b1b1b"
              strokeWidth={1.5}
              className={selectable ? "tile selectable" : "tile"}
              onClick={selectable ? () => onTileClick?.(tile.id) : undefined}
            />
            <polygon points={points} fill="url(#tile-shine)" style={{ pointerEvents: "none" }} />
            {ICON_OFFSETS.map((offset, i) => (
              <text
                key={i}
                x={center.x + offset.x}
                y={center.y + offset.y}
                textAnchor="middle"
                fontSize={30}
                style={{ pointerEvents: "none" }}
                opacity={0.9}
              >
                {TERRAIN_ICON[tile.terrain]}
              </text>
            ))}
            {tile.number !== null && (
              <g>
                <circle cx={center.x} cy={center.y} r={22} fill="#f5ecd7" stroke="#1b1b1b" />
                <text
                  x={center.x}
                  y={center.y + 7}
                  textAnchor="middle"
                  fontSize={22}
                  fontWeight={700}
                  fill={isRedNumber(tile.number) ? "#c62828" : "#1b1b1b"}
                >
                  {tile.number}
                </text>
              </g>
            )}
            {isRobber && (
              <circle cx={center.x} cy={center.y} r={14} fill="#1b1b1b" stroke="#f5ecd7" strokeWidth={2} />
            )}
          </g>
        );
      })}

      {Object.values(board.edges).map((edge) => {
        const [a, b] = edge.vertexIds.map((id) => board.vertices[id]);
        const road = G.roads[edge.id];
        const selectable = selectableEdges.has(edge.id);
        return (
          <line
            key={edge.id}
            x1={a.x}
            y1={a.y}
            x2={b.x}
            y2={b.y}
            stroke={road ? PLAYER_COLOR_HEX[playerColors[road.playerID]] : "transparent"}
            strokeWidth={road ? 8 : 16}
            strokeLinecap="round"
            className={selectable ? "edge selectable" : "edge"}
            onClick={selectable ? () => onEdgeClick?.(edge.id) : undefined}
          />
        );
      })}

      {vertexList.map((vertex) => {
        const building = G.buildings[vertex.id];
        const selectable = selectableVertices.has(vertex.id);
        return (
          <g key={vertex.id}>
            {vertex.port && !building && (
              <text
                x={vertex.x}
                y={vertex.y - 14}
                textAnchor="middle"
                fontSize={10}
                fill="#1565c0"
              >
                {vertex.port === "generic" ? "3:1" : `2:1 ${vertex.port}`}
              </text>
            )}
            {building ? (
              <g
                transform={`translate(${vertex.x},${vertex.y})`}
                filter="url(#building-shadow)"
                className={selectable ? "building selectable" : "building"}
                onClick={selectable ? () => onVertexClick?.(vertex.id) : undefined}
              >
                <path
                  d={building.type === "city" ? CITY_PATH : SETTLEMENT_PATH}
                  fill={PLAYER_COLOR_HEX[playerColors[building.playerID]]}
                  stroke={selectable ? "#f9a825" : "#1b1b1b"}
                  strokeWidth={selectable ? 3 : 2}
                  strokeLinejoin="round"
                />
              </g>
            ) : (
              <circle
                cx={vertex.x}
                cy={vertex.y}
                r={selectable ? 9 : 5}
                fill="#ffffff"
                stroke="#1b1b1b"
                strokeWidth={1}
                opacity={selectable ? 0.95 : 0.25}
                className={selectable ? "vertex selectable" : "vertex"}
                onClick={selectable ? () => onVertexClick?.(vertex.id) : undefined}
              />
            )}
          </g>
        );
      })}
    </svg>
  );
}
