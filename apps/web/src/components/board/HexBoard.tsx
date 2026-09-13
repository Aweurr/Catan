import type { GameState, PlayerColor, PortType, TerrainType } from "@catan/game";
import { PLAYER_COLOR_HEX, RESOURCE_ICON, TERRAIN_COLOR } from "../../theme";
import woodImg from "../../assets/tiles/wood.png";
import brickImg from "../../assets/tiles/brick.png";
import sheepImg from "../../assets/tiles/sheep.png";
import wheatImg from "../../assets/tiles/wheat.png";
import oreImg from "../../assets/tiles/ore.png";
import desertImg from "../../assets/tiles/desert.png";

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

/** Illustrated artwork for each terrain, used instead of a flat color fill. */
const TERRAIN_IMAGE: Record<TerrainType, string> = {
  wood: woodImg,
  brick: brickImg,
  sheep: sheepImg,
  wheat: wheatImg,
  ore: oreImg,
  desert: desertImg,
};

// Matches HEX_SIZE (the circumradius) in packages/game/src/board.ts, so this
// bounding box lines up exactly with a tile's own polygon.
const HEX_HALF_WIDTH = 100 * (Math.sqrt(3) / 2);

/** A single-peak house silhouette, used for settlements. */
const SETTLEMENT_PATH = "M -8,9 L -8,0 L 0,-8 L 8,0 L 8,9 Z";

/** A wider, taller twin-peak building silhouette, used for cities — visibly
 * bigger and more complex than a settlement so the two are easy to tell apart. */
const CITY_PATH = "M -13,9 L -13,-1 L -6,-9 L 0,-3 L 6,-9 L 13,-1 L 13,9 Z";

/** A triangular marker dropped on a coastal edge to flag a port: a small
 * pennant shape holding the traded resource (or an anchor for a generic 3:1
 * port) and its rate. */
const PORT_TRIANGLE_POINTS = "0,-16 -15,11 15,11";

function PortMarker({ x, y, port }: { x: number; y: number; port: PortType }) {
  const isGeneric = port === "generic";
  return (
    <g transform={`translate(${x},${y})`} style={{ pointerEvents: "none" }}>
      <polygon
        points={PORT_TRIANGLE_POINTS}
        fill="#eaf6ff"
        stroke="#0d3d66"
        strokeWidth={2}
        strokeLinejoin="round"
      />
      <text x={0} y={2} textAnchor="middle" fontSize={12}>
        {isGeneric ? "⚓" : RESOURCE_ICON[port]}
      </text>
      <text x={0} y={26} textAnchor="middle" fontSize={7} fontWeight={700} fill="#3e2f1c">
        {isGeneric ? "3:1" : "2:1"}
      </text>
    </g>
  );
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
      <defs>
        <clipPath id="hex-clip" clipPathUnits="userSpaceOnUse">
          <polygon points="86.6,-50 86.6,50 0,100 -86.6,50 -86.6,-50 0,-100" />
        </clipPath>
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
            <g transform={`translate(${center.x},${center.y})`} style={{ pointerEvents: "none" }}>
              {/* The clip stays screen-aligned (pointy-top) while only the
                  image content underneath is rotated to face the right way. */}
              <g clipPath="url(#hex-clip)">
                <g transform="rotate(-90)">
                  <image
                    href={TERRAIN_IMAGE[tile.terrain]}
                    x={-100}
                    y={-HEX_HALF_WIDTH}
                    width={200}
                    height={HEX_HALF_WIDTH * 2}
                    preserveAspectRatio="xMidYMid slice"
                  />
                </g>
              </g>
            </g>
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

      {Object.values(board.edges).map((edge) => {
        // A port belongs to a single coastal edge, but is stored on both of
        // that edge's vertices (see assignPorts in packages/game/src/board.ts)
        // — so a boundary edge whose two vertices agree on the same port is
        // exactly the edge the port sits on.
        if (edge.tileIds.length !== 1) return null;
        const [a, b] = edge.vertexIds.map((id) => board.vertices[id]);
        if (!a.port || a.port !== b.port) return null;
        return (
          <PortMarker key={edge.id} x={(a.x + b.x) / 2} y={(a.y + b.y) / 2} port={a.port} />
        );
      })}

      {vertexList.map((vertex) => {
        const building = G.buildings[vertex.id];
        const selectable = selectableVertices.has(vertex.id);
        return (
          <g key={vertex.id}>
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
