import type { GameState, PlayerColor } from "@catan/game";
import { PLAYER_COLOR_HEX, TERRAIN_COLOR } from "../../theme";

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
            <circle
              cx={vertex.x}
              cy={vertex.y}
              r={building ? (building.type === "city" ? 12 : 9) : selectable ? 9 : 5}
              fill={building ? PLAYER_COLOR_HEX[playerColors[building.playerID]] : "#ffffff"}
              stroke="#1b1b1b"
              strokeWidth={building ? 2 : 1}
              opacity={building ? 1 : selectable ? 0.95 : 0.25}
              className={selectable ? "vertex selectable" : "vertex"}
              onClick={selectable ? () => onVertexClick?.(vertex.id) : undefined}
            />
          </g>
        );
      })}
    </svg>
  );
}
