interface Props {
  counts: Record<number, number>;
  onClose: () => void;
}

const DICE_TOTALS = [2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];

export default function DiceStatsModal({ counts, onClose }: Props) {
  const max = Math.max(1, ...DICE_TOTALS.map((n) => counts[n] ?? 0));

  return (
    <div className="modal-backdrop">
      <div className="modal">
        <div className="modal-header">
          <h2>Statistiques des dés</h2>
          <button onClick={onClose}>Fermer</button>
        </div>
        <div className="dice-stats-chart">
          {DICE_TOTALS.map((n) => {
            const count = counts[n] ?? 0;
            return (
              <div key={n} className="dice-stats-bar">
                <span className="dice-stats-count">{count}</span>
                <div className="dice-stats-fill" style={{ height: `${(count / max) * 100}%` }} />
                <span className="dice-stats-label">{n}</span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
