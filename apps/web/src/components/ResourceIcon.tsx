import type { Resource } from "@catan/game";
import { RESOURCE_ICON, RESOURCE_LABEL, TERRAIN_COLOR } from "../theme";

interface Props {
  resource: Resource;
  amount?: number;
  showLabel?: boolean;
}

export default function ResourceIcon({ resource, amount, showLabel = true }: Props) {
  return (
    <span className="resource-chip" style={{ color: TERRAIN_COLOR[resource] }}>
      <span className="resource-chip-icon">{RESOURCE_ICON[resource]}</span>
      {amount !== undefined && <span className="resource-chip-amount">{amount}</span>}
      {showLabel && <span className="resource-chip-label">{RESOURCE_LABEL[resource]}</span>}
    </span>
  );
}
