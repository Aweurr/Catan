import type { LogEntry } from "@catan/game";
import ResourceIcon from "./ResourceIcon";

interface Props {
  log: LogEntry[];
  displayNames: Record<string, string>;
}

export default function GameLog({ log, displayNames }: Props) {
  const recent = log.slice(-30).reverse();
  return (
    <div className="game-log">
      <h3>Journal</h3>
      <ul>
        {recent.map((entry, i) => (
          <li key={i}>
            {entry.map((part, j) => {
              if (part.kind === "text") return <span key={j}>{part.text}</span>;
              if (part.kind === "player") {
                return <strong key={j}>{displayNames[part.playerID] ?? part.playerID}</strong>;
              }
              return <ResourceIcon key={j} resource={part.resource} amount={part.amount} />;
            })}
          </li>
        ))}
      </ul>
    </div>
  );
}
