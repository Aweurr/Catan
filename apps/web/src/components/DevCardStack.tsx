interface Props {
  count: number;
}

export default function DevCardStack({ count }: Props) {
  return (
    <div className="dev-card-stack" title={`${count} carte(s) développement restantes`}>
      <div className="dev-card-back dev-card-back-3" />
      <div className="dev-card-back dev-card-back-2" />
      <div className="dev-card-back dev-card-back-1">
        <span className="dev-card-count">{count}</span>
      </div>
    </div>
  );
}
