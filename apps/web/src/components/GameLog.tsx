interface Props {
  log: string[];
}

export default function GameLog({ log }: Props) {
  const recent = log.slice(-30).reverse();
  return (
    <div className="game-log">
      <h3>Journal</h3>
      <ul>
        {recent.map((entry, i) => (
          <li key={i}>{entry}</li>
        ))}
      </ul>
    </div>
  );
}
